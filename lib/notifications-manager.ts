/**
 * Notifications Manager — مدير الإشعارات الشامل
 * يدير: أذان الصلاة، الورد اليومي، سورة الكهف الجمعة، الآية اليومية
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { schedulePrayerNotifications } from './prayer-notifications';
import { fetchTafsir } from './quran-api';
import { getAyahAudioUrl } from './quran-cache';
import { fetchPrayerTimesByCoords } from './prayer-api';
import { getPrayerLocation, getSettings } from './storage';
import type { NotificationSettings as PrayerNotifSettings } from './notification-types';
import { getOrCreateSoundChannel } from './push-notifications';
import { t } from './i18n';
import { dirText } from './notification-text-direction';
import { getNotificationSoundValueSync } from './notification-sound-installer';

// ─── Custom Sound File Map ───────────────────────────────────────────────────
// Maps soundType keys to the filenames registered in app.json expo-notifications sounds
const CUSTOM_SOUND_FILES: Record<string, string> = {
  general_reminder: 'general_reminder.mp3',
  salawat: 'salawat.mp3',
  istighfar: 'istighfar.mp3',
  tasbih: 'tasbih.mp3',
  subhanallah: 'subhanallah.mp3',
  alhamdulillah: 'alhamdulillah.mp3',
  morning_adhkar: 'morning_adhkar.mp3',
  evening_adhkar: 'evening_adhkar.mp3',
  // Adhan sounds (registered in app.json expo-notifications plugin)
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
};

/**
 * Resolve a soundType (from notification data) to the native sound value.
 * 
 * CRITICAL for background/closed notifications:
 * - iOS: 'default' = system sound, 'filename.mp3' = custom sound, false = silent
 * - Android: Sound is controlled by notification channel, content.sound is secondary
 * - Return false for truly silent notifications
 * 
 * Resolution order:
 * 1. Check installed custom sounds (downloaded from Firebase)
 * 2. Fall back to bundled sounds (from CUSTOM_SOUND_FILES)
 * 3. Fall back to 'default' system sound
 */
function resolveNotificationSound(soundType?: string, soundEnabled?: boolean): string | false {
  // Silent notification - return false for no sound
  if (soundEnabled === false || soundType === 'silent') {
    return false;
  }
  
  // Default system sound - expo-notifications handles 'default' correctly
  if (!soundType || soundType === 'default') return 'default';
  
  // First check for installed custom sounds (downloaded from Firebase)
  // getNotificationSoundValueSync returns the platform-appropriate filename if installed
  const customSoundValue = getNotificationSoundValueSync(soundType);
  if (customSoundValue) {
    console.log(`[notifications-manager] Using custom installed sound for ${soundType}: ${customSoundValue}`);
    return customSoundValue;
  }
  
  // Look up bundled sound file from registered sounds
  const file = CUSTOM_SOUND_FILES[soundType];
  if (!file) return 'default'; // Fallback if custom sound not found
  
  // Android raw resources are referenced WITHOUT .mp3 extension
  if (Platform.OS === 'android') return file.replace(/\.mp3$/, '');
  
  // iOS: return filename with extension (must match app.json sounds exactly)
  return file;
}

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

// ─── Admin Notification Defaults ─────────────────────────────────────────────
/**
 * Fetches admin-configured notification schedule defaults from Firestore.
 * Used when initializing notification settings for new users.
 * Returns null if no admin config exists or on error.
 */
export async function fetchAdminNotificationDefaults(): Promise<Record<string, { enabled: boolean; time: string; days: number[]; soundId: string }> | null> {
  try {
    const { getDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../config/firebase');
    const snap = await getDoc(doc(db, 'appConfig/notificationSchedule'));
    if (!snap.exists()) return null;
    const data = snap.data();
    const CACHE_KEY = '@admin_notif_schedule';
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    return data as Record<string, { enabled: boolean; time: string; days: number[]; soundId: string }>;
  } catch {
    try {
      const cached = await AsyncStorage.getItem('@admin_notif_schedule');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  }
}

// ─── Permission ───────────────────────────────────────────────────────────────
export async function requestNotifPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
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
  settings: AllNotificationSettings,
  soundType: string = 'general_reminder'
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

  // Get dynamic channel for the user's selected sound
  const resolvedChannelId = await getOrCreateSoundChannel('reminders', soundType);

  // Morning wird
  await Notifications.scheduleNotificationAsync({
    identifier: 'wird_morning',
    content: {
      title: dirText(t('settings.morningWirdTitle')),
      body: dirText(t('settings.morningWirdBody')),
      sound: resolveNotificationSound(soundType, true),
      data: { type: 'wird', period: 'morning', soundType },
      ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
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
      title: dirText(t('settings.eveningWirdTitle')),
      body: dirText(t('settings.eveningWirdBody')),
      sound: resolveNotificationSound(soundType, true),
      data: { type: 'wird', period: 'evening', soundType },
      ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: evening.hour,
      minute: evening.minute,
    },
  });
}

// ─── Schedule Daily Ayah ──────────────────────────────────────────────────────
const DAILY_AYAHS = [
  { text: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ﴿الشرح: ٥﴾', surah: 94, ayah: 5 },
  { text: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ﴿الطلاق: ٣﴾', surah: 65, ayah: 3 },
  { text: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ ﴿البقرة: ١٥٣﴾', surah: 2, ayah: 153 },
  { text: 'وَبَشِّرِ الصَّابِرِينَ ﴿البقرة: ١٥٥﴾', surah: 2, ayah: 155 },
  { text: 'فَاذْكُرُونِي أَذْكُرْكُمْ ﴿البقرة: ١٥٢﴾', surah: 2, ayah: 152 },
  { text: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ ﴿الحديد: ٤﴾', surah: 57, ayah: 4 },
  { text: 'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ ﴿التوبة: ١٢٠﴾', surah: 9, ayah: 120 },
];

export async function scheduleDailyAyahNotification(
  settings: AllNotificationSettings,
  soundType: string = 'general_reminder'
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync('daily_ayah');
  } catch {}

  if (!settings.dailyAyahEnabled) return;
  const hasPermission = await requestNotifPermission();
  if (!hasPermission) return;

  const { hour, minute } = parseTime(settings.dailyAyahTime);
  const dayIndex = new Date().getDay();
  const ayahData = DAILY_AYAHS[dayIndex % DAILY_AYAHS.length];

  // Get dynamic channel for the user's selected sound
  const resolvedChannelId = await getOrCreateSoundChannel('daily-ayah', soundType);

  await Notifications.scheduleNotificationAsync({
    identifier: 'daily_ayah',
    content: {
      title: dirText(t('settings.dailyAyahTitle')),
      body: dirText(ayahData.text),
      sound: resolveNotificationSound(soundType, true),
      data: { type: 'daily_ayah', soundType },
      ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
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
  settings: AllNotificationSettings,
  soundType: string = 'general_reminder'
): Promise<void> {
  await Promise.all([
    scheduleWirdNotifications(settings, soundType),
    scheduleDailyAyahNotification(settings, soundType),
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
  vibration: boolean;
  // Sound type selections
  soundType?: string;
  adhanSoundType?: string;
  // Per-category sound types for foreground playback
  azkarSoundType?: string;
  dailyVerseSoundType?: string;
  salawatReminder?: boolean;
  salawatReminderTime?: string;
  salawatSoundType?: string;
  tasbihReminder?: boolean;
  tasbihReminderTime?: string;
  tasbihSoundType?: string;
  istighfarReminder?: boolean;
  istighfarReminderTime?: string;
  istighfarSoundType?: string;
  customReminder?: boolean;
  customReminderTime?: string;
  customReminderTitle?: string;
  customReminderSoundType?: string;
  customReminderContentType?: 'text' | 'ayah' | 'surah' | 'azkar' | 'dua';
  customReminderSurah?: number;
  customReminderAyah?: number;
  customReminderReciter?: string;
  // Per-category day-of-week (1=Sun...7=Sat, empty/undefined = every day)
  salawatDays?: number[];
  tasbihDays?: number[];
  istighfarDays?: number[];
  azkarDays?: number[];
  dailyVerseDays?: number[];
  customReminderDays?: number[];
  // Quran reading reminder
  quranReadingReminder?: boolean;
  quranReadingReminderTime?: string;
  quranReminderDays?: number[];
  quranReminderSoundType?: string;
  // Worship tracking notifications
  worshipPrayerLogging?: boolean;
  worshipDailySummary?: boolean;
  worshipDailySummaryTime?: string;
  worshipStreakAlerts?: boolean;
  worshipWeeklyReport?: boolean;
  // Friday Surah Al-Kahf reminder
  kahfReminder?: boolean;
}): Promise<void> {
  try {
    if (!notifSettings.enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    const hasPermission = await requestNotifPermission();
    if (!hasPermission) return;

    // Helper: schedule DAILY or per-day WEEKLY based on selected days
    const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]; // Sun-Sat
    const scheduleWithDays = async (
      baseId: string,
      content: Notifications.NotificationContentInput,
      hour: number,
      minute: number,
      days?: number[],
      channelId: string = 'general',
      soundType?: string,
    ) => {
      // Cancel existing (base + per-day variants)
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`${baseId}_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync(baseId); } catch {}

      // Create dynamic Android channel for user-selected sound
      const resolvedChannelId = await getOrCreateSoundChannel(channelId, soundType);

      // Apply directional mark for correct RTL/LTR rendering
      const dirContent = {
        ...content,
        ...(content.title && { title: dirText(String(content.title)) }),
        ...(content.body && { body: dirText(String(content.body)) }),
      };

      // channelId must be in content (not trigger) for Android
      const contentWithChannel: Notifications.NotificationContentInput = {
        ...dirContent,
        ...(Platform.OS === 'android' && { channelId: resolvedChannelId }),
        ...(Platform.OS === 'android' && { priority: Notifications.AndroidNotificationPriority.HIGH }),
        ...(Platform.OS === 'android' && !notifSettings.vibration && { vibrate: [0] }),
      };

      const selectedDays = days && days.length > 0 && days.length < 7 ? days : null;

      try {
        if (!selectedDays) {
          // Every day — use single DAILY trigger
          await Notifications.scheduleNotificationAsync({
            identifier: baseId,
            content: contentWithChannel,
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute,
            },
          });
        } else {
          // Specific days — use WEEKLY triggers
          for (const weekday of selectedDays) {
            await Notifications.scheduleNotificationAsync({
              identifier: `${baseId}_d${weekday}`,
              content: contentWithChannel,
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday,
                hour,
                minute,
              },
            });
          }
        }
        console.log(`🔔 Scheduled ${baseId} at ${hour}:${String(minute).padStart(2,'0')} (channel: ${resolvedChannelId})`);
      } catch (err) {
        console.error(`❌ Failed to schedule ${baseId}:`, err);
      }
    };

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
      adhanSoundType: notifSettings.adhanSoundType,
      soundType: notifSettings.soundType,
    };
    await schedulePrayerNotifications(prayerSettings);

    // 2) Schedule morning azkar
    // Cancel existing wird notifications before re-scheduling selectively
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith('wird_')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    // Schedule morning wird if enabled
    if (notifSettings.morningAzkar) {
      const morning = parseTime(notifSettings.morningAzkarTime || '06:00');
      await scheduleWithDays(
        'wird_morning',
        {
          title: t('settings.morningWirdTitle'),
          body: t('settings.morningWirdBody'),
          sound: resolveNotificationSound(notifSettings.azkarSoundType || 'general_reminder', notifSettings.sound),
          data: { type: 'wird', period: 'morning', soundType: notifSettings.azkarSoundType || 'general_reminder' },
        },
        morning.hour,
        morning.minute,
        notifSettings.azkarDays,
        'azkar',
        notifSettings.azkarSoundType || 'general_reminder',
      );
    }

    // Schedule evening wird if enabled
    if (notifSettings.eveningAzkar) {
      const evening = parseTime(notifSettings.eveningAzkarTime || '18:00');
      await scheduleWithDays(
        'wird_evening',
        {
          title: t('settings.eveningWirdTitle'),
          body: t('settings.eveningWirdBody'),
          sound: resolveNotificationSound(notifSettings.azkarSoundType || 'general_reminder', notifSettings.sound),
          data: { type: 'wird', period: 'evening', soundType: notifSettings.azkarSoundType || 'general_reminder' },
        },
        evening.hour,
        evening.minute,
        notifSettings.azkarDays,
        'azkar',
        notifSettings.azkarSoundType || 'general_reminder',
      );
    }

    // Schedule sleep azkar if enabled
    if (notifSettings.sleepAzkar) {
      const sleep = parseTime(notifSettings.sleepAzkarTime || '22:00');
      await scheduleWithDays(
        'wird_sleep',
        {
          title: t('settings.sleepAzkarTitle'),
          body: t('settings.sleepAzkarBody'),
          sound: resolveNotificationSound(notifSettings.azkarSoundType || 'general_reminder', notifSettings.sound),
          data: { type: 'wird', period: 'sleep', soundType: notifSettings.azkarSoundType || 'general_reminder' },
        },
        sleep.hour,
        sleep.minute,
        notifSettings.azkarDays,
        'azkar',
        notifSettings.azkarSoundType || 'general_reminder',
      );
    }

    // Schedule wakeup azkar if enabled
    if (notifSettings.wakeupAzkar) {
      const wakeup = parseTime(notifSettings.wakeupAzkarTime || '05:30');
      await scheduleWithDays(
        'wird_wakeup',
        {
          title: t('settings.wakeupAzkarTitle'),
          body: t('settings.wakeupAzkarBody'),
          sound: resolveNotificationSound(notifSettings.azkarSoundType || 'general_reminder', notifSettings.sound),
          data: { type: 'wird', period: 'wakeup', soundType: notifSettings.azkarSoundType || 'general_reminder' },
        },
        wakeup.hour,
        wakeup.minute,
        notifSettings.azkarDays,
        'azkar',
        notifSettings.azkarSoundType || 'general_reminder',
      );
    }

    // Note: afterPrayerAzkar notifications are tied to prayer times
    // They are handled by the azkar_reminders system in AsyncStorage

    // 3) Schedule daily ayah
    if (notifSettings.dailyVerse) {
      const dailyTime = parseTime(notifSettings.dailyVerseTime || '08:00');
      const dayIndex = new Date().getDay();
      const ayahData = DAILY_AYAHS[dayIndex % DAILY_AYAHS.length];
      
      // Try to fetch tafsir for richer notification
      let notifBody = ayahData.text;
      try {
        const tafsirResult = await fetchTafsir(ayahData.surah, ayahData.ayah, 'ar.muyassar');
        if (tafsirResult.tafsirText && tafsirResult.tafsirText !== t('tafsirSearch.loadError')) {
          const shortTafsir = tafsirResult.tafsirText.length > 120
            ? tafsirResult.tafsirText.slice(0, 120) + '...'
            : tafsirResult.tafsirText;
          notifBody = `${ayahData.text}\n\n📖 ${shortTafsir}`;
        }
      } catch {}

      await scheduleWithDays(
        'daily_ayah',
        {
          title: t('settings.dailyAyahTitle'),
          body: notifBody,
          sound: resolveNotificationSound(notifSettings.dailyVerseSoundType || 'general_reminder', notifSettings.sound),
          data: { type: 'daily_ayah', soundType: notifSettings.dailyVerseSoundType || 'general_reminder' },
        },
        dailyTime.hour,
        dailyTime.minute,
        notifSettings.dailyVerseDays,
        'daily-ayah',
        notifSettings.dailyVerseSoundType || 'general_reminder',
      );
    } else {
      // Cancel all daily_ayah variants
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`daily_ayah_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('daily_ayah'); } catch {}
    }

    // 4) Schedule salawat reminder
    if (notifSettings.salawatReminder) {
      const salawatTime = parseTime(notifSettings.salawatReminderTime || '09:00');
      await scheduleWithDays(
        'salawat_reminder',
        {
          title: t('settings.salawatTitle'),
          body: t('settings.salawatBody'),
          sound: resolveNotificationSound(notifSettings.salawatSoundType || 'salawat', notifSettings.sound),
          data: { type: 'salawat', soundType: notifSettings.salawatSoundType || 'salawat' },
        },
        salawatTime.hour,
        salawatTime.minute,
        notifSettings.salawatDays,
        'general',
        notifSettings.salawatSoundType || 'salawat',
      );
    } else {
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`salawat_reminder_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('salawat_reminder'); } catch {}
    }

    // 5) Schedule tasbih reminder
    if (notifSettings.tasbihReminder) {
      const tasbihTime = parseTime(notifSettings.tasbihReminderTime || '15:00');
      await scheduleWithDays(
        'tasbih_reminder',
        {
          title: t('settings.tasbihReminderTitle'),
          body: t('settings.tasbihReminderBody'),
          sound: resolveNotificationSound(notifSettings.tasbihSoundType || 'tasbih', notifSettings.sound),
          data: { type: 'tasbih', soundType: notifSettings.tasbihSoundType || 'tasbih' },
        },
        tasbihTime.hour,
        tasbihTime.minute,
        notifSettings.tasbihDays,
        'general',
        notifSettings.tasbihSoundType || 'tasbih',
      );
    } else {
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`tasbih_reminder_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('tasbih_reminder'); } catch {}
    }

    // 6) Schedule istighfar reminder
    if (notifSettings.istighfarReminder) {
      const istighfarTime = parseTime(notifSettings.istighfarReminderTime || '12:00');
      await scheduleWithDays(
        'istighfar_reminder',
        {
          title: t('settings.istighfarTitle'),
          body: t('settings.istighfarBody'),
          sound: resolveNotificationSound(notifSettings.istighfarSoundType || 'istighfar', notifSettings.sound),
          data: { type: 'istighfar', soundType: notifSettings.istighfarSoundType || 'istighfar' },
        },
        istighfarTime.hour,
        istighfarTime.minute,
        notifSettings.istighfarDays,
        'general',
        notifSettings.istighfarSoundType || 'istighfar',
      );
    } else {
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`istighfar_reminder_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('istighfar_reminder'); } catch {}
    }

    // 7) Schedule custom reminder
    if (notifSettings.customReminder) {
      const customTime = parseTime(notifSettings.customReminderTime || '08:00');
      
      let title = t('settings.alertTitle');
      let body = notifSettings.customReminderTitle || t('settings.customReminderDefault');
      let soundType = notifSettings.customReminderSoundType || 'default';
      
      // Build content based on type
      if (notifSettings.customReminderContentType === 'surah' && notifSettings.customReminderSurah) {
        title = t('settings.surahReminder');
        if (!notifSettings.customReminderTitle) {
          body = `${t('settings.surahReadingTime')} ${notifSettings.customReminderSurah}`;
        }
      }

      await scheduleWithDays(
        'custom_reminder',
        {
          title,
          body,
          sound: resolveNotificationSound(soundType, notifSettings.sound),
          data: { 
            type: 'custom', 
            soundType,
            ...(notifSettings.customReminderSurah && { surah: notifSettings.customReminderSurah }),
            contentType: notifSettings.customReminderContentType || 'text',
          },
        },
        customTime.hour,
        customTime.minute,
        notifSettings.customReminderDays,
        'general',
        notifSettings.customReminderSoundType || 'general_reminder',
      );
    } else {
      for (const d of ALL_DAYS) {
        try { await Notifications.cancelScheduledNotificationAsync(`custom_reminder_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('custom_reminder'); } catch {}
    }

    // 8) Schedule Quran reading reminder
    if (notifSettings.quranReadingReminder) {
      const quranTime = parseTime(notifSettings.quranReadingReminderTime || '20:00');
      // quranReminderDays uses 0=Sat..6=Fri, convert to 1=Sun..7=Sat
      const qDays = notifSettings.quranReminderDays;
      const convertedDays = qDays && qDays.length > 0 && qDays.length < 7
        ? qDays.map(d => {
            // 0=Sat→7, 1=Sun→1, 2=Mon→2, 3=Tue→3, 4=Wed→4, 5=Thu→5, 6=Fri→6
            return d === 0 ? 7 : d;
          })
        : undefined;
      await scheduleWithDays(
        'quran_reading_reminder',
        {
          title: t('settings.quranReadingNotifTitle'),
          body: t('settings.quranReadingNotifBody'),
          sound: resolveNotificationSound(notifSettings.quranReminderSoundType || 'general_reminder', notifSettings.sound),
          data: { type: 'quran_reading', soundType: notifSettings.quranReminderSoundType || 'general_reminder' },
        },
        quranTime.hour,
        quranTime.minute,
        convertedDays,
        'general',
        notifSettings.quranReminderSoundType || 'general_reminder',
      );
    } else {
      for (const d of [1, 2, 3, 4, 5, 6, 7]) {
        try { await Notifications.cancelScheduledNotificationAsync(`quran_reading_reminder_d${d}`); } catch {}
      }
      try { await Notifications.cancelScheduledNotificationAsync('quran_reading_reminder'); } catch {}
    }

    // 9) Schedule worship tracking notifications
    // Daily summary
    if (notifSettings.worshipDailySummary) {
      const summaryTime = parseTime(notifSettings.worshipDailySummaryTime || '22:00');
      await scheduleWithDays(
        'worship_daily_summary',
        {
          title: t('settings.worshipDailySummaryTitle'),
          body: t('settings.worshipDailySummaryBody'),
          sound: resolveNotificationSound('general_reminder', notifSettings.sound),
          data: { type: 'worship_summary' },
        },
        summaryTime.hour,
        summaryTime.minute,
        undefined,
        'general',
      );
    } else {
      try { await Notifications.cancelScheduledNotificationAsync('worship_daily_summary'); } catch {}
    }

    // Weekly report (every Friday at the daily summary time)
    if (notifSettings.worshipWeeklyReport) {
      const weeklyTime = parseTime(notifSettings.worshipDailySummaryTime || '22:00');
      try { await Notifications.cancelScheduledNotificationAsync('worship_weekly_report'); } catch {}
      await Notifications.scheduleNotificationAsync({
        identifier: 'worship_weekly_report',
        content: {
          title: dirText(t('settings.worshipWeeklyReportTitle')),
          body: dirText(t('settings.worshipWeeklyReportBody')),
          sound: resolveNotificationSound('general_reminder', notifSettings.sound),
          data: { type: 'worship_weekly' },
          ...(Platform.OS === 'android' && { channelId: 'general' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 6, // Friday
          hour: weeklyTime.hour,
          minute: weeklyTime.minute,
        },
      });
    } else {
      try { await Notifications.cancelScheduledNotificationAsync('worship_weekly_report'); } catch {}
    }

    // 10) Schedule Friday Surah Al-Kahf reminder (2 hours after Jummah Dhuhr)
    try { await Notifications.cancelScheduledNotificationAsync('kahf_friday'); } catch {}
    if (notifSettings.kahfReminder) {
      let kahfHour = 14; // fallback: 2:00 PM
      let kahfMinute = 0;
      try {
        const location = await getPrayerLocation();
        if (location) {
          const appSettings = await getSettings();
          const prayerData = await fetchPrayerTimesByCoords(
            location.latitude,
            location.longitude,
            appSettings.calculationMethod,
          );
          const dhuhrStr = prayerData.timings.Dhuhr;
          if (dhuhrStr) {
            const cleaned = dhuhrStr.replace(/\s*\([^)]*\)\s*/, '').trim();
            const [dH, dM] = cleaned.split(':').map(Number);
            // Add 2 hours to Dhuhr time
            kahfHour = dH + 2;
            kahfMinute = dM;
            if (kahfHour >= 24) kahfHour -= 24;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch Dhuhr for Kahf reminder, using fallback 14:00:', e);
      }

      // First ayah of Surah Al-Kahf (18:1) - Arabic text for notification body
      const KAHF_FIRST_AYAH_TEXT = 'الْحَمْدُ لِلَّهِ الَّذِي أَنزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ وَلَمْ يَجْعَل لَّهُ عِوَجًا ۜ';
      const KAHF_FIRST_AYAH_GLOBAL = 2141;
      const kahfAyahAudioUrl = getAyahAudioUrl('ar.alafasy', KAHF_FIRST_AYAH_GLOBAL);

      await Notifications.scheduleNotificationAsync({
        identifier: 'kahf_friday',
        content: {
          title: dirText(t('settings.kahfTitle')),
          body: dirText(`${t('settings.kahfBody')}\n\n﴿ ${KAHF_FIRST_AYAH_TEXT} ﴾`),
          sound: resolveNotificationSound('general_reminder', notifSettings.sound),
          data: {
            type: 'kahf',
            soundType: 'general_reminder',
            ayahAudioUrl: kahfAyahAudioUrl,
            ayahText: KAHF_FIRST_AYAH_TEXT,
            surah: 18,
            ayah: 1,
          },
          ...(Platform.OS === 'android' && { channelId: 'general' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 6, // Friday
          hour: kahfHour,
          minute: kahfMinute,
        },
      });
      console.log(`🔔 Scheduled Kahf Friday reminder at ${kahfHour}:${String(kahfMinute).padStart(2, '0')} (Dhuhr+2h)`);
    }

    console.log('✅ All notifications scheduled from settings');
  } catch (error) {
    console.error('Error scheduling notifications from settings:', error);
  }
}
