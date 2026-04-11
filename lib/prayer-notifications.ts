/**
 * Prayer Notifications Service
 * يدير جدولة إشعارات مواقيت الصلاة الخمس
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { fetchMonthlyPrayerTimes, type PrayerTimesResponse } from './prayer-api';
import { getPrayerLocation, getSettings } from './storage';
import { t, getLanguage } from './i18n';
import { getNotifText, fetchNotificationTexts } from './notifications-manager';
import { getAdhanChannelId } from '../services/notifications/channels';
import { dirText } from './notification-text-direction';
import { resolveNotificationSound } from './resolve-notification-sound';
import { getNotificationIconAttachment } from './notification-icons';
import { 
  NotificationSettings, 
  DEFAULT_NOTIFICATION_SETTINGS,
  PrayerKey 
} from './notification-types';
import { checkExactAlarmPermission } from '@/services/notifications/permissions';

// Re-export للتوافق
export { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from './notification-types';

// ─── Note: setNotificationHandler is configured in app/_layout.tsx ────────────

// ─── أسماء الصلوات ──────────────────────────────────────────────────────────
const PRAYER_KEYS: readonly PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function getPrayerMessage(key: PrayerKey, lang: string = 'ar', isFriday: boolean = false): string {
  const messages: Record<PrayerKey, string> = {
    fajr: t('notifications.fajrBody'),
    sunrise: t('notifications.sunriseBody'),
    dhuhr: t('notifications.dhuhrBody'),
    asr: t('notifications.asrBody'),
    maghrib: t('notifications.maghribBody'),
    isha: t('notifications.ishaBody'),
  };
  // On Friday, Dhuhr becomes Jumuah
  if (key === 'dhuhr' && isFriday) {
    const jumuahBody = t('notifications.jumuahBody');
    const override = getNotifText('prayer_jumuah', '', jumuahBody, lang);
    return override.body || jumuahBody;
  }
  const typeId = `prayer_${key}`;
  const override = getNotifText(typeId, '', messages[key], lang);
  return override.body || messages[key];
}

function getPrayerNotifTitle(key: PrayerKey, lang: string = 'ar', isFriday: boolean = false): string {
  const titles: Record<PrayerKey, string> = {
    fajr: t('notifications.fajrNotifTitle'),
    sunrise: t('notifications.sunriseNotifTitle'),
    dhuhr: t('notifications.dhuhrNotifTitle'),
    asr: t('notifications.asrNotifTitle'),
    maghrib: t('notifications.maghribNotifTitle'),
    isha: t('notifications.ishaNotifTitle'),
  };
  // On Friday, Dhuhr becomes Jumuah
  if (key === 'dhuhr' && isFriday) {
    const jumuahTitle = t('notifications.jumuahNotifTitle');
    const override = getNotifText('prayer_jumuah', jumuahTitle, '', lang);
    return override.title || jumuahTitle;
  }
  const typeId = `prayer_${key}`;
  const override = getNotifText(typeId, titles[key], '', lang);
  return override.title || titles[key];
}

// ─── تحويل بين أسماء الصلوات والـ API ───────────────────────────────────────
const PRAYER_KEY_TO_API: Record<PrayerKey, string> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};


// مدة التنبيه المسبق بالدقائق
export const ADHAN_ADVANCE_MINUTES = 0;

// ─── طلب الأذونات ─────────────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  // تجاهل على الويب
  if (Platform.OS === 'web') {
    console.log('Push notifications not supported on web');
    return false;
  }

  // NOTE: Android channels are managed exclusively by services/notifications/channels.ts
  // Do NOT create channels here — initializeAllNotificationChannels() handles them with
  // the user's selected sound. Creating a channel here would override it with
  // the wrong sound (general_reminder) since Android channels are immutable once created.

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function checkNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// ─── تحويل وقت الصلاة لـ Date object ─────────────────────────────────────────
function prayerTimeToDateForDay(timeStr: string, day: Date, advanceMinutes: number = 0): Date {
  const cleaned = timeStr.replace(/\s*\([^)]*\)\s*/, '').trim();
  const parts = cleaned.split(':').map(Number);
  const hours = Number.isFinite(parts[0]) && parts[0] >= 0 && parts[0] <= 23 ? parts[0] : 0;
  const minutes = Number.isFinite(parts[1]) && parts[1] >= 0 && parts[1] <= 59 ? parts[1] : 0;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes - advanceMinutes, 0, 0);
}

// عدد الأيام المجدولة مسبقاً — 7 days.
// Prayer is the highest priority and gets a full 7-day window on BOTH platforms.
// iOS 64-notification budget is managed by reducing OTHER categories' windows.
// App reschedules on every foreground resume via ensurePrayerNotificationsExist().
const PRAYER_SCHEDULE_DAYS = 7;

// ─── جدولة إشعارات الصلاة لـ 7 أيام ─────────────────────────────────────────
export async function schedulePrayerNotifications(
  notifSettings: NotificationSettings
): Promise<void> {
  if (!notifSettings.enabled) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Android 12+ (API 31+): verify SCHEDULE_EXACT_ALARM for DATE triggers
  const exactAlarmOk = await checkExactAlarmPermission();
  if (!exactAlarmOk) {
    console.warn('[prayer-notifications] SCHEDULE_EXACT_ALARM not granted — DATE triggers may fail silently');
  }

  const location = await getPrayerLocation();
  if (!location) return;

  const appSettings = await getSettings();
  
  // Fetch admin text overrides (cached)
  await fetchNotificationTexts();
  const lang = getLanguage();

  try {
    // Fetch prayer times for the scheduling window using monthly calendar API (1-2 calls max)
    const today = new Date();
    console.log(`[prayer-notif] Starting scheduling for ${PRAYER_SCHEDULE_DAYS} days from ${today.toISOString()}`);
    const lastDay = new Date(today);
    lastDay.setDate(lastDay.getDate() + PRAYER_SCHEDULE_DAYS - 1);

    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const monthlyData = await fetchMonthlyPrayerTimes(
      location.latitude, location.longitude, currentMonth, currentYear, appSettings.calculationMethod
    );

    // If the scheduling window spans into next month, fetch that too
    let nextMonthData: PrayerTimesResponse[] | null = null;
    if (lastDay.getMonth() + 1 !== currentMonth || lastDay.getFullYear() !== currentYear) {
      nextMonthData = await fetchMonthlyPrayerTimes(
        location.latitude, location.longitude, lastDay.getMonth() + 1, lastDay.getFullYear(), appSettings.calculationMethod
      );
    }

    // ─── API fetch succeeded — NOW cancel old prayer notifications ──────────
    // We defer cancellation until AFTER fetching succeeds so that a network
    // failure never wipes existing scheduled notifications (the "one-shot" bug).
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith('prayer_')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    // Resolve the Android channel for the user's selected sound.
    // 'default' / undefined / falsy is treated as 'makkah' so both platforms play an actual adhan.
    const adhanSoundType = notifSettings.adhanSoundType;
    const soundType = notifSettings.soundType;
    const rawSoundType = adhanSoundType ? adhanSoundType : (soundType || 'makkah');
    const effectiveSoundType = (!rawSoundType || rawSoundType === 'default') ? 'makkah' : rawSoundType;
    const regularChannelId = getAdhanChannelId(effectiveSoundType);
    const fajrChannelId = getAdhanChannelId(effectiveSoundType);

    // Resolve sound using the unified function (single source of truth in channels.ts)
    const soundValue = !notifSettings.adhanSound
      ? false
      : resolveNotificationSound(effectiveSoundType, true);

    const scheduledIds: string[] = [];
    // Refresh `now` AFTER the API fetch + cancellation completes.
    // Using a stale `now` from before the fetch would skip today's
    // prayer slots that became "past" only during the fetch delay.
    const now = new Date();
    const mosqueAttachments = await getNotificationIconAttachment('mosque');

    for (let dayOffset = 0; dayOffset < PRAYER_SCHEDULE_DAYS; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);

      // Pick prayer data from the correct month
      const isNextMonth = targetDate.getMonth() + 1 !== currentMonth || targetDate.getFullYear() !== currentYear;
      const source = isNextMonth && nextMonthData ? nextMonthData : monthlyData;
      const dayData = source[targetDate.getDate() - 1]; // Array is 0-indexed, days are 1-indexed
      if (!dayData) continue;

      for (const prayerKey of PRAYER_KEYS) {
        if (!notifSettings.prayers[prayerKey]) continue;

        const apiKey = PRAYER_KEY_TO_API[prayerKey];
        const timeStr = dayData.timings[apiKey as keyof typeof dayData.timings];
        if (!timeStr) continue;

        const triggerDate = prayerTimeToDateForDay(timeStr, targetDate, notifSettings.advanceMinutes);
        if (triggerDate <= now) {
          console.log(`[prayer-notif] SKIP ${prayerKey} d+${dayOffset} — past (${triggerDate.toISOString()} <= ${now.toISOString()})`);
          continue;
        }

        const isFriday = targetDate.getDay() === 5; // 5 = Friday in JS Date
        const prayerName = (prayerKey === 'dhuhr' && isFriday) ? t('prayer.jumuah') : t(`prayer.${prayerKey}`);
        const notifTitle = getPrayerNotifTitle(prayerKey, lang, isFriday);
        const cleanTime = timeStr.replace(/\s*\([^)]*\)\s*/, '').trim();
        const message = notifSettings.advanceMinutes > 0
          ? `${t('notificationSounds.minutesBefore').replace('{count}', String(notifSettings.advanceMinutes))} ${prayerName} (${cleanTime})`
          : getPrayerMessage(prayerKey, lang, isFriday);

        try {
          const channelId = prayerKey === 'fajr' ? fajrChannelId : regularChannelId;
          const identifier = dayOffset === 0 ? `prayer_${prayerKey}` : `prayer_${prayerKey}_d${dayOffset}`;
          console.log(`[prayer-notif] SCHEDULING ${prayerKey}${isFriday && prayerKey === 'dhuhr' ? ' (JUMUAH)' : ''} d+${dayOffset} → ${triggerDate.toISOString()} | id=${identifier} | ch=${channelId}`);
          const id = await Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              title: dirText(notifTitle),
              body: dirText(message),
              data: { type: 'prayer', prayer: prayerKey, time: cleanTime, soundType: effectiveSoundType, iconType: 'mosque' },
              sound: soundValue,
              priority: Notifications.AndroidNotificationPriority.MAX,
              // iOS: bypass Focus mode for prayer notifications
              // NOTE: 'timeSensitive' does NOT require Apple's critical-alerts entitlement.
              // 'critical' silently drops the notification without the entitlement.
              ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
              ...(Platform.OS === 'ios' && mosqueAttachments && { attachments: mosqueAttachments }),
              ...(Platform.OS === 'android' && { channelId }),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
              ...(Platform.OS === 'android' && { channelId }),
            },
          });
          scheduledIds.push(id);
          console.log(`[prayer-notif] ✅ ${prayerKey} d+${dayOffset} scheduled OK (id=${id})`);
        } catch (e) {
          console.error(`[prayer-notif] ❌ FAILED to schedule ${prayerKey} d+${dayOffset}:`, e);
        }
      }
    }

    console.log(`✅ Scheduled ${scheduledIds.length} prayer notifications (${PRAYER_SCHEDULE_DAYS} days)`);
    // Dump all scheduled prayer IDs for ADB debugging
    console.log(`[prayer-notif] IDs: ${scheduledIds.join(', ')}`);

    // Phase C: If zero prayers were scheduled despite being enabled, treat as failure
    // so the caller (notifications-manager) can detect and log it.
    if (scheduledIds.length === 0) {
      console.warn('[prayer-notif] ⚠️ Zero prayers scheduled — all may have been in the past or data was empty');
    }
  } catch (e) {
    console.error('[prayer-notif] ❌ Failed to fetch/schedule prayer times:', e);
    // Re-throw so notifications-manager knows prayer scheduling failed
    // and can log it to the persistent diagnostic store.
    throw e;
  }
}

// ─── إلغاء جميع الإشعارات ────────────────────────────────────────────────────
export async function cancelAllPrayerNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('prayer_')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

// ─── الحصول على الإشعارات المجدولة ───────────────────────────────────────────
export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// ─── إعادة الجدولة اليومية ───────────────────────────────────────────────────
export async function rescheduleIfNeeded(notifSettings: NotificationSettings): Promise<void> {
  if (!notifSettings.enabled) return;
  const scheduled = await getScheduledNotifications();
  if (scheduled.length < 3) {
    await schedulePrayerNotifications(notifSettings);
  }
}
