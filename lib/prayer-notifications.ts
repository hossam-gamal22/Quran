/**
 * Prayer Notifications Service
 * يدير جدولة إشعارات مواقيت الصلاة الخمس
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { fetchPrayerTimesByCoords } from './prayer-api';
import { getPrayerLocation, getSettings } from './storage';
import { t } from './i18n';
import { getOrCreateSoundChannel } from './push-notifications';
import { dirText } from './notification-text-direction';
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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('prayer-times', {
      name: t('notifications.prayerChannel'),
      description: t('notifications.prayerChannelDesc'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B6B3A',
      sound: 'general_reminder', // Android raw resource WITHOUT .mp3 extension
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

    // Resolve the Android channel for the user's selected sound
    const adhanSoundType = notifSettings.adhanSoundType;
    const soundType = notifSettings.soundType;
    // Prefer adhan-specific sound, then global soundType, then default
    const effectiveSoundType = adhanSoundType && adhanSoundType !== 'default' ? adhanSoundType : soundType;
    const resolvedChannelId = await getOrCreateSoundChannel('prayer-times', effectiveSoundType);

    // Map of sound types to actual filenames (must match app.json expo-notifications sounds)
    const SOUND_FILES: Record<string, string> = {
      makkah: 'makkah.mp3',
      madinah: 'madinah.mp3',
      alaqsa: 'alaqsa.mp3',
      mishary: 'mishary.mp3',
      abdulbasit: 'abdulbasit.mp3',
      sudais: 'sudais.mp3',
      egypt: 'egypt.mp3',
      dosari: 'dosari.mp3',
      ajman: 'ajman.mp3',
      ali_mulla: 'ali_mulla.mp3',
      naqshbandi: 'naqshbandi.mp3',
      sharif: 'sharif.mp3',
      mansoor_zahrani: 'mansoor_zahrani.mp3',
      haramain: 'haramain.mp3',
      general_reminder: 'general_reminder.mp3',
      salawat: 'salawat.mp3',
      istighfar: 'istighfar.mp3',
      tasbih: 'tasbih.mp3',
    };

    // Determine the sound value for notification content
    // iOS: 'default' = system sound, 'filename.mp3' = custom, false = silent
    // Android: channel controls sound, but we set content.sound too
    let soundValue: string | false = 'default';
    
    if (!notifSettings.adhanSound || effectiveSoundType === 'silent') {
      // Silent - no sound
      soundValue = false;
    } else if (effectiveSoundType && effectiveSoundType !== 'default') {
      // Custom sound - look up in map
      const soundFile = SOUND_FILES[effectiveSoundType];
      if (soundFile) {
        // Android: no extension, iOS: with extension
        soundValue = Platform.OS === 'android' 
          ? soundFile.replace(/\.mp3$/, '') 
          : soundFile;
      }
    }

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
            title: dirText(`${emoji} ${prayerName}`),
            body: dirText(message),
            data: { prayer: prayerKey, time: timeStr },
            sound: soundValue,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
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
