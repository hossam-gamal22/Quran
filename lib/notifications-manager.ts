/**
 * Notifications Manager — مدير الإشعارات الشامل
 * يدير: أذان الصلاة، الورد اليومي، سورة الكهف الجمعة، الآية اليومية
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Keys ────────────────────────────────────────────────────────────────────
const KEYS = {
  ALL_NOTIF: '@notif_settings_v2',
};

// ─── Types ───────────────────────────────────────────────────────────────────
export interface AllNotificationSettings {
  // أذان الصلاة
  adhanEnabled: boolean;
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

export const DEFAULT_ALL_NOTIF: AllNotificationSettings = {
  adhanEnabled: false,
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
