/**
 * Prayer Notifications Service
 * يدير جدولة إشعارات مواقيت الصلاة الخمس
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { fetchPrayerTimesByCoords } from './prayer-api';
import { getPrayerLocation, getSettings } from './storage';
import { t } from '@/lib/i18n';
import { 
  NotificationSettings, 
  DEFAULT_NOTIFICATION_SETTINGS,
  PrayerKey 
} from './notification-types';

// Re-export للتوافق
export { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from './notification-types';

// ─── Note: setNotificationHandler is configured in app/_layout.tsx ────────────

// ─── أسماء الصلوات ──────────────────────────────────────────────────────────
const PRAYER_KEYS: readonly PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

const PRAYER_EMOJIS: Record<PrayerKey, string> = {
  fajr: '🌙',
  sunrise: '🌅',
  dhuhr: '☀️',
  asr: '🌤',
  maghrib: '🌇',
  isha: '✨',
};

function getPrayerMessage(key: PrayerKey): string {
  const messages: Record<PrayerKey, string> = {
    fajr: t('notifications.fajrBody'),
    sunrise: t('notifications.sunriseBody'),
    dhuhr: t('notifications.dhuhrBody'),
    asr: t('notifications.asrBody'),
    maghrib: t('notifications.maghribBody'),
    isha: t('notifications.ishaBody'),
  };
  return messages[key];
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

  if (!Device.isDevice) {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('prayer-times', {
      name: t('notifications.prayerChannel'),
      description: t('notifications.prayerChannelDesc'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B6B3A',
      sound: 'general_reminder.mp3',
    });
  }

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
function prayerTimeToDate(timeStr: string, advanceMinutes: number = 0): Date {
  // Strip any timezone marker like (PST), (EST), (AST), (EET), etc.
  const cleaned = timeStr.replace(/\s*\([^)]*\)\s*/, '').trim();
  const [hours, minutes] = cleaned.split(':').map(Number);
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes - advanceMinutes,
    0,
    0
  );
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

// ─── جدولة إشعارات اليوم ─────────────────────────────────────────────────────
export async function schedulePrayerNotifications(
  notifSettings: NotificationSettings
): Promise<void> {
  // Cancel only prayer notifications (not azkar/wird/kahf/daily)
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.identifier.startsWith('prayer_')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  if (!notifSettings.enabled) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  const location = await getPrayerLocation();
  if (!location) return;

  const appSettings = await getSettings();

  try {
    const prayerData = await fetchPrayerTimesByCoords(
      location.latitude,
      location.longitude,
      appSettings.calculationMethod
    );

    const scheduledIds: string[] = [];

    for (const prayerKey of PRAYER_KEYS) {
      if (!notifSettings.prayers[prayerKey]) continue;

      const apiKey = PRAYER_KEY_TO_API[prayerKey];
      const timeStr = prayerData.timings[apiKey as keyof typeof prayerData.timings];
      if (!timeStr) continue;

      const triggerDate = prayerTimeToDate(timeStr, notifSettings.advanceMinutes);
      const prayerName = t(`prayer.${prayerKey}`);
      const emoji = PRAYER_EMOJIS[prayerKey];
      const message = notifSettings.advanceMinutes > 0
        ? `${t('notificationSounds.minutesBefore').replace('{count}', String(notifSettings.advanceMinutes))} ${prayerName} (${timeStr})`
        : getPrayerMessage(prayerKey);

      try {
        const id = await Notifications.scheduleNotificationAsync({
          identifier: `prayer_${prayerKey}`,
          content: {
            title: `${emoji} ${prayerName}`,
            body: message,
            data: { prayer: prayerKey, time: timeStr },
            sound: 'general_reminder.mp3',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            ...(Platform.OS === 'android' && { channelId: 'prayer-times' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
        scheduledIds.push(id);
      } catch (e) {
        console.warn(`Failed to schedule ${prayerKey}:`, e);
      }
    }

    console.log(`✅ Scheduled ${scheduledIds.length} prayer notifications`);
  } catch (e) {
    console.error('Failed to fetch prayer times for notifications:', e);
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
