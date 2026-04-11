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
import { NotifIds } from './notificationIds';
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
// Minimum lead time (ms) a trigger must be in the future to be scheduled.
// Prevents "barely future" dates that become past by the time Android's
// AlarmManager registers them (causing immediate fire) or iOS drops them.
const MIN_SCHEDULE_BUFFER_MS = 60_000; // 60 seconds

function prayerTimeToDateForDay(timeStr: string, day: Date, advanceMinutes: number = 0): Date {
  const cleaned = timeStr.replace(/\s*\([^)]*\)\s*/, '').trim();
  const parts = cleaned.split(':').map(Number);
  const hours = Number.isFinite(parts[0]) && parts[0] >= 0 && parts[0] <= 23 ? parts[0] : 0;
  const minutes = Number.isFinite(parts[1]) && parts[1] >= 0 && parts[1] <= 59 ? parts[1] : 0;
  // Clamp advanceMinutes to 0–120 to prevent corrupted settings from
  // rolling dates into the past (JS Date handles negative minutes by
  // subtracting days, which would silently create past-dated triggers).
  const safeAdvance = (Number.isFinite(advanceMinutes) && advanceMinutes >= 0 && advanceMinutes <= 120)
    ? advanceMinutes
    : 0;
  const result = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes - safeAdvance, 0, 0);
  // Guard against invalid Date (NaN) — return epoch-0 so the future-time check skips it.
  if (isNaN(result.getTime())) return new Date(0);
  return result;
}

// عدد الأيام المجدولة مسبقاً:
// iOS:     7 days  (respects 64-notification budget: 7 × 5 = 35 slots)
// Android: 30 days (survives extended offline periods without background refresh)
// The app reschedules on every foreground resume, so both windows are sufficient.
const PRAYER_SCHEDULE_DAYS = Platform.OS === 'ios' ? 7 : 30;

// ─── جدولة إشعارات الصلاة ─────────────────────────────────────────
export async function schedulePrayerNotifications(
  notifSettings: NotificationSettings
): Promise<number> {
  if (!notifSettings.enabled) return 0;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return 0;

  // Android 12+ (API 31+): verify SCHEDULE_EXACT_ALARM for DATE triggers
  const exactAlarmOk = await checkExactAlarmPermission();
  if (!exactAlarmOk) {
    console.warn('[prayer-notifications] SCHEDULE_EXACT_ALARM not granted — DATE triggers may fail silently');
  }

  const location = await getPrayerLocation();
  if (!location) return 0;

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

    // Build a map of all unique months we need for the scheduling window.
    // iOS (7 days): 1-2 months. Android (30 days): up to 3 months.
    const monthsNeeded = new Map<string, { month: number; year: number }>();
    for (let d = 0; d < PRAYER_SCHEDULE_DAYS; d++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() + d);
      const m = dt.getMonth() + 1;
      const y = dt.getFullYear();
      const key = `${y}-${m}`;
      if (!monthsNeeded.has(key)) monthsNeeded.set(key, { month: m, year: y });
    }

    // Fetch all needed months (each with independent cache fallback)
    const monthlyDataMap = new Map<string, PrayerTimesResponse[]>();
    for (const [key, { month, year }] of monthsNeeded) {
      const data = await fetchMonthlyPrayerTimes(
        location.latitude, location.longitude, month, year, appSettings.calculationMethod
      );
      monthlyDataMap.set(key, data);
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
    // Treat undefined/missing adhanSound as enabled (default ON for prayer notifications).
    // Only explicit `false` silences the azan — prevents iOS from getting a silent payload.
    // Pass isAdhan=true so the resolver uses the short WAV on iOS (Apple's 30s limit).
    const soundValue = notifSettings.adhanSound === false
      ? false
      : resolveNotificationSound(effectiveSoundType, true, true);

    // Final guard: if soundValue resolved to something unexpected (empty string, null, undefined),
    // fall back to the platform-appropriate makkah adhan file so iOS never gets an invalid payload.
    // iOS silently drops the ENTIRE notification if content.sound is a string that doesn't
    // match a real bundled file, so we validate the extension and fall back to the short WAV.
    let safeSoundValue: string | boolean = (soundValue === false)
      ? false
      : (typeof soundValue === 'string' && soundValue.length > 0)
        ? soundValue
        : (Platform.OS === 'ios' ? 'makkah_short.wav' : 'makkah');

    // iOS-specific: ensure the resolved filename ends with a known audio extension.
    // Short adhan files use .wav; original bundled sounds use .mp3.
    // If neither extension is present (e.g. Android raw resource name leaked through),
    // fall back to the short WAV so iOS doesn't silently drop the notification.
    if (Platform.OS === 'ios' && typeof safeSoundValue === 'string'
        && !safeSoundValue.endsWith('.mp3') && !safeSoundValue.endsWith('.wav')) {
      console.warn(`[prayer-notif] iOS sound value missing audio extension ("${safeSoundValue}"), falling back to makkah_short.wav`);
      safeSoundValue = 'makkah_short.wav';
    }
    console.log(`[prayer-notif] Sound resolved: adhanSound=${notifSettings.adhanSound}, effectiveType=${effectiveSoundType}, raw=${String(soundValue)}, safe=${String(safeSoundValue)}`);

    const scheduledIds: string[] = [];
    // NOTE: We intentionally do NOT capture a `const now = new Date()` here.
    // Each iteration uses a fresh `Date.now()` call to avoid stale-timestamp
    // races where a prayer becomes past during the async scheduling loop.
    const mosqueAttachments = await getNotificationIconAttachment('mosque');

    for (let dayOffset = 0; dayOffset < PRAYER_SCHEDULE_DAYS; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);

      // Pick prayer data from the correct month
      const mKey = `${targetDate.getFullYear()}-${targetDate.getMonth() + 1}`;
      const source = monthlyDataMap.get(mKey);
      if (!source) continue;
      const dayData = source[targetDate.getDate() - 1]; // Array is 0-indexed, days are 1-indexed
      if (!dayData) continue;

      for (const prayerKey of PRAYER_KEYS) {
        if (!notifSettings.prayers[prayerKey]) continue;

        const apiKey = PRAYER_KEY_TO_API[prayerKey];
        const timeStr = dayData.timings[apiKey as keyof typeof dayData.timings];
        if (!timeStr) continue;

        const triggerDate = prayerTimeToDateForDay(timeStr, targetDate, notifSettings.advanceMinutes);
        // Fresh timestamp on EVERY iteration — never use a stale `now` variable.
        // This prevents races where prayers become past during the async loop.
        const nowMs = Date.now();
        if (triggerDate.getTime() <= nowMs + MIN_SCHEDULE_BUFFER_MS) {
          const delta = triggerDate.getTime() - nowMs;
          const reason = delta <= 0 ? 'past' : `within ${MIN_SCHEDULE_BUFFER_MS}ms buffer (delta=${delta}ms)`;
          console.log(`[prayer-notif] SKIP ${prayerKey} d+${dayOffset} — ${reason} | trigger=${triggerDate.getTime()} now=${nowMs}`);
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
          // Last-resort guard: re-check right before the schedule call.
          // Content assembly above takes non-trivial time; the trigger may
          // have slipped into the past during that window.
          if (triggerDate.getTime() <= Date.now()) {
            console.log(`[prayer-notif] SKIP ${prayerKey} d+${dayOffset} — slipped past during content assembly | trigger=${triggerDate.getTime()} now=${Date.now()}`);
            continue;
          }
          console.log(`[prayer-notif] SCHEDULING ${prayerKey}${isFriday && prayerKey === 'dhuhr' ? ' (JUMUAH)' : ''} d+${dayOffset} → ${triggerDate.toISOString()} (in ${Math.round((triggerDate.getTime() - Date.now()) / 1000)}s) | id=${identifier} | ch=${channelId}`);
          const id = await Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              title: dirText(notifTitle),
              body: dirText(message),
              data: { type: 'prayer', prayer: prayerKey, time: cleanTime, soundType: effectiveSoundType, iconType: 'mosque' },
              sound: safeSoundValue,
              priority: Notifications.AndroidNotificationPriority.MAX,
              // iOS: bypass Focus mode and notification summaries for prayer notifications
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

          // ── Schedule 15-min fallback completion notification (today only) ──
          // For dayOffset > 0 the daily reschedule will create fresh fallbacks.
          // Skip sunrise — it's informational, not a prayer to complete.
          if (dayOffset === 0 && prayerKey !== 'sunrise') {
            try {
              const FALLBACK_DELAY_MS = 17 * 60 * 1000; // 15 min wait + 2 min grace
              const fallbackDate = new Date(triggerDate.getTime() + FALLBACK_DELAY_MS);
              // Only schedule if the fallback time is still in the future
              if (fallbackDate.getTime() > Date.now() + MIN_SCHEDULE_BUFFER_MS) {
                const fallbackIdentifier = `prayer_completion_${prayerKey}`;
                const fallbackId = await Notifications.scheduleNotificationAsync({
                  identifier: fallbackIdentifier,
                  content: {
                    title: dirText(t('notifications.didYouPray') || `هل صليت ${prayerName}؟`),
                    body: dirText(t('notifications.didYouPrayBody') || 'لا تنسَ صلاتك، بارك الله فيك'),
                    sound: 'default',
                    data: { type: 'prayer_completion', prayer: prayerKey },
                    ...(Platform.OS === 'ios' && { interruptionLevel: 'timeSensitive' as const }),
                    ...(Platform.OS === 'android' && { channelId: 'completion_default' }),
                  },
                  trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: fallbackDate,
                    ...(Platform.OS === 'android' && { channelId: 'completion_default' }),
                  },
                });
                // Persist IDs so Smart Tracker can cancel the fallback
                scheduledIds.push(fallbackId);
                await NotifIds.saveAdhanId(prayerKey, id);
                await NotifIds.saveFallbackId(prayerKey, fallbackId);
                await NotifIds.saveAdhanFiredAt(prayerKey, triggerDate.getTime());
                console.log(`[prayer-notif] 🔔 Fallback scheduled: ${fallbackIdentifier} → ${fallbackDate.toISOString()} (id=${fallbackId})`);
              }
            } catch (fe) {
              console.warn(`[prayer-notif] ⚠️ Failed to schedule fallback for ${prayerKey}:`, fe);
            }
          }
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
    return scheduledIds.length;
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
    // Cancel adhan (prayer_*), fallback (prayer_completion_*), and tracker-fired (prayer_done_*) notifications
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
