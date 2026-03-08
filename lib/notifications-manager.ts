/**
 * Notifications Manager — مدير الإشعارات الشامل
 * يدير: أذان الصلاة، الورد اليومي، سورة الكهف الجمعة، الآية اليومية
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { schedulePrayerNotifications } from './prayer-notifications';
import type { NotificationSettings as PrayerNotifSettings } from './notification-types';

// ─── Keys ────────────────────────────────────────────────────────────────────
const KEYS = {
  ALL_NOTIF: '@notif_settings_v2',
};

// ─── Types ───────────────────────────────────────────────────────────────────
export type AdhanType = 'full' | 'simple';

export interface AllNotificationSettings {
  // أذان الصلاة
  adhanEnabled: boolean;
  adhanType: AdhanType; // 'full' = أذان كامل, 'simple' = أذان بسيط
  prayers: {
    Fajr: boolean;
    Dhuhr: boolean;
    Asr: boolean;
    Maghrib: boolean;
    Isha: boolean;
  };
  adhanAdvanceMinutes: number; // 0=عند الوقت, 5=قبل 5 دقائق

  // الورد اليومي
  wirdEnabled: boolean;
  wirdMorningTime: string;   // "07:00"
  wirdEveningTime: string;   // "17:00"

  // سورة الكهف — الجمعة
  kahfEnabled: boolean;
  kahfTime: string;           // "08:00"

  // آية يومية
  dailyAyahEnabled: boolean;
  dailyAyahTime: string;      // "06:00"
}

// ─── Adhan Audio URLs ────────────────────────────────────────────────────────
// Full adhan: Mishary Rashid Al-Afasy (~3 minutes)
export const ADHAN_AUDIO = {
  full: 'https://cdn.aladhan.com/audio/adhans/1.mp3',
  simple: 'https://cdn.aladhan.com/audio/adhans/7.mp3',
} as const;

export const DEFAULT_ALL_NOTIF: AllNotificationSettings = {
  adhanEnabled: false,
  adhanType: 'full',
  prayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true },
  adhanAdvanceMinutes: 0,
  wirdEnabled: false,
  wirdMorningTime: '07:00',
  wirdEveningTime: '17:00',
  kahfEnabled: false,
  kahfTime: '08:00',
  dailyAyahEnabled: false,
  dailyAyahTime: '06:30',
};

// ─── Storage helpers ──────────────────────────────────────────────────────────
export async function getAllNotifSettings(): Promise<AllNotificationSettings> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ALL_NOTIF);
    return data ? { ...DEFAULT_ALL_NOTIF, ...JSON.parse(data) } : DEFAULT_ALL_NOTIF;
  } catch {
    return DEFAULT_ALL_NOTIF;
  }
}

export async function saveAllNotifSettings(
  settings: Partial<AllNotificationSettings>
): Promise<void> {
  const current = await getAllNotifSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(KEYS.ALL_NOTIF, JSON.stringify(updated));
}

// ─── Permission ───────────────────────────────────────────────────────────────
export async function requestNotifPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Parse time string to hours/minutes ──────────────────────────────────────
function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

// ─── Schedule Wird Daily ─────────────────────────────────────────────────────
export async function scheduleWirdNotifications(
  settings: AllNotificationSettings
): Promise<void> {
  // Cancel existing wird notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const id = n.identifier;
    if (id.startsWith('wird_')) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }

  if (!settings.wirdEnabled) return;
  const hasPermission = await requestNotifPermission();
  if (!hasPermission) return;

  const morning = parseTime(settings.wirdMorningTime);
  const evening = parseTime(settings.wirdEveningTime);

  // Morning wird
  await Notifications.scheduleNotificationAsync({
    identifier: 'wird_morning',
    content: {
      title: '🌅 الورد الصباحي',
      body: 'حان وقت أذكار الصباح — ابدأ يومك بذكر الله',
      sound: 'default',
      data: { type: 'wird', period: 'morning' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: morning.hour,
      minute: morning.minute,
    },
  });

  // Evening wird
  await Notifications.scheduleNotificationAsync({
    identifier: 'wird_evening',
    content: {
      title: '🌇 الورد المسائي',
      body: 'حان وقت أذكار المساء — اختم يومك بحمد الله',
      sound: 'default',
      data: { type: 'wird', period: 'evening' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: evening.hour,
      minute: evening.minute,
    },
  });
}

// ─── Schedule Kahf Friday ─────────────────────────────────────────────────────
export async function scheduleKahfNotification(
  settings: AllNotificationSettings
): Promise<void> {
  // Cancel existing kahf notification
  try {
    await Notifications.cancelScheduledNotificationAsync('kahf_friday');
  } catch {}

  if (!settings.kahfEnabled) return;
  const hasPermission = await requestNotifPermission();
  if (!hasPermission) return;

  const { hour, minute } = parseTime(settings.kahfTime);

  // weekday: 6 = Friday in expo-notifications (1=Sunday...7=Saturday)
  await Notifications.scheduleNotificationAsync({
    identifier: 'kahf_friday',
    content: {
      title: '📖 سورة الكهف',
      body: 'يوم الجمعة المبارك — اقرأ سورة الكهف وأكثر من الصلاة على النبي ﷺ',
      sound: 'default',
      data: { type: 'kahf' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 6, // Friday
      hour,
      minute,
    },
  });
}

// ─── Schedule Daily Ayah ──────────────────────────────────────────────────────
const DAILY_AYAHS = [
  'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ﴿الشرح: ٥﴾',
  'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ﴿الطلاق: ٣﴾',
  'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ ﴿البقرة: ١٥٣﴾',
  'وَبَشِّرِ الصَّابِرِينَ ﴿البقرة: ١٥٥﴾',
  'فَاذْكُرُونِي أَذْكُرْكُمْ ﴿البقرة: ١٥٢﴾',
  'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ ﴿الحديد: ٤﴾',
  'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ ﴿التوبة: ١٢٠﴾',
];

export async function scheduleDailyAyahNotification(
  settings: AllNotificationSettings
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync('daily_ayah');
  } catch {}

  if (!settings.dailyAyahEnabled) return;
  const hasPermission = await requestNotifPermission();
  if (!hasPermission) return;

  const { hour, minute } = parseTime(settings.dailyAyahTime);
  const dayIndex = new Date().getDay();
  const ayah = DAILY_AYAHS[dayIndex % DAILY_AYAHS.length];

  await Notifications.scheduleNotificationAsync({
    identifier: 'daily_ayah',
    content: {
      title: '✨ آية اليوم',
      body: ayah,
      sound: 'default',
      data: { type: 'daily_ayah' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// ─── Schedule All ─────────────────────────────────────────────────────────────
export async function scheduleAllNotifications(
  settings: AllNotificationSettings
): Promise<void> {
  await Promise.all([
    scheduleWirdNotifications(settings),
    scheduleKahfNotification(settings),
    scheduleDailyAyahNotification(settings),
  ]);
}

// ─── Cancel All Non-Prayer ────────────────────────────────────────────────────
export async function cancelAllCustomNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const id = n.identifier;
    if (!id.startsWith('prayer_')) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }
}

// ─── Bridge: Schedule from SettingsContext notification settings ───────────────
/**
 * Maps the SettingsContext's NotificationSettings shape to the scheduling
 * functions used by prayer-notifications.ts and this module.
 * Called when notification settings change and on app init.
 */
export async function scheduleNotificationsFromSettings(notifSettings: {
  enabled: boolean;
  prayerTimes: boolean;
  prayerReminder: boolean;
  reminderMinutes: number;
  morningAzkar: boolean;
  morningAzkarTime: string;
  eveningAzkar: boolean;
  eveningAzkarTime: string;
  sleepAzkar: boolean;
  sleepAzkarTime: string;
  wakeupAzkar: boolean;
  wakeupAzkarTime: string;
  afterPrayerAzkar: boolean;
  dailyVerse: boolean;
  dailyVerseTime: string;
  sound: boolean;
}): Promise<void> {
  try {
    if (!notifSettings.enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    const hasPermission = await requestNotifPermission();
    if (!hasPermission) return;

    // 1) Schedule prayer time notifications
    const prayerSettings: PrayerNotifSettings = {
      enabled: notifSettings.prayerTimes,
      prayers: {
        fajr: true,
        sunrise: false,
        dhuhr: true,
        asr: true,
        maghrib: true,
        isha: true,
      },
      advanceMinutes: notifSettings.prayerReminder ? notifSettings.reminderMinutes : 0,
      adhanSound: notifSettings.sound,
    };
    await schedulePrayerNotifications(prayerSettings);

    // 2) Schedule morning azkar
    const wirdSettings: AllNotificationSettings = {
      ...DEFAULT_ALL_NOTIF,
      wirdEnabled: notifSettings.morningAzkar || notifSettings.eveningAzkar,
      wirdMorningTime: notifSettings.morningAzkarTime || '06:00',
      wirdEveningTime: notifSettings.eveningAzkarTime || '18:00',
      dailyAyahEnabled: notifSettings.dailyVerse,
      dailyAyahTime: notifSettings.dailyVerseTime || '08:00',
    };

    // Cancel existing wird notifications before re-scheduling selectively
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith('wird_')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    // Schedule morning wird if enabled
    if (notifSettings.morningAzkar) {
      const morning = parseTime(wirdSettings.wirdMorningTime);
      await Notifications.scheduleNotificationAsync({
        identifier: 'wird_morning',
        content: {
          title: '🌅 الورد الصباحي',
          body: 'حان وقت أذكار الصباح — ابدأ يومك بذكر الله',
          sound: notifSettings.sound ? 'default' : undefined,
          data: { type: 'wird', period: 'morning' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: morning.hour,
          minute: morning.minute,
        },
      });
    }

    // Schedule evening wird if enabled
    if (notifSettings.eveningAzkar) {
      const evening = parseTime(wirdSettings.wirdEveningTime);
      await Notifications.scheduleNotificationAsync({
        identifier: 'wird_evening',
        content: {
          title: '🌇 الورد المسائي',
          body: 'حان وقت أذكار المساء — اختم يومك بحمد الله',
          sound: notifSettings.sound ? 'default' : undefined,
          data: { type: 'wird', period: 'evening' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: evening.hour,
          minute: evening.minute,
        },
      });
    }

    // Schedule sleep azkar if enabled
    if (notifSettings.sleepAzkar) {
      const sleep = parseTime(notifSettings.sleepAzkarTime || '22:00');
      await Notifications.scheduleNotificationAsync({
        identifier: 'wird_sleep',
        content: {
          title: '🌙 أذكار النوم',
          body: 'حان وقت أذكار النوم — نم على ذكر الله',
          sound: notifSettings.sound ? 'default' : undefined,
          data: { type: 'wird', period: 'sleep' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: sleep.hour,
          minute: sleep.minute,
        },
      });
    }

    // Schedule wakeup azkar if enabled
    if (notifSettings.wakeupAzkar) {
      const wakeup = parseTime(notifSettings.wakeupAzkarTime || '05:30');
      await Notifications.scheduleNotificationAsync({
        identifier: 'wird_wakeup',
        content: {
          title: '🌤️ أذكار الاستيقاظ',
          body: 'الحمد لله الذي أحيانا بعد ما أماتنا وإليه النشور',
          sound: notifSettings.sound ? 'default' : undefined,
          data: { type: 'wird', period: 'wakeup' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: wakeup.hour,
          minute: wakeup.minute,
        },
      });
    }

    // Note: afterPrayerAzkar notifications are tied to prayer times
    // They are handled by the azkar_reminders system in AsyncStorage

    // 3) Schedule daily ayah
    await scheduleDailyAyahNotification(wirdSettings);

    console.log('✅ All notifications scheduled from settings');
  } catch (error) {
    console.error('Error scheduling notifications from settings:', error);
  }
}
