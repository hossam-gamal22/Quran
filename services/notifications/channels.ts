/**
 * Notification Channels — إدارة قنوات الإشعارات
 *
 * Android caches notification channels — once created, the sound is immutable.
 * To change a channel's sound you MUST delete it and recreate it.
 *
 * Sound name rules:
 * - Filename only, lowercase, no path prefix
 * - Android raw resources: WITHOUT .mp3 extension
 * - iOS: WITH .mp3 extension
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '@/lib/i18n';

// Bump this whenever channel config changes (sounds, importance, etc.)
// Forces a delete+recreate of all channels on next app launch.
const CHANNELS_VERSION_KEY = 'notificationChannelsVersion';
const CURRENT_CHANNELS_VERSION = '3';

// ─── Adhan sound filename map (all files in assets/sounds/adhan/) ────────────
export const ADHAN_SOUND_FILES: Record<string, string> = {
  abdulbasit:       'abdulbasit.mp3',
  ajman:            'ajman.mp3',
  alaqsa:           'alaqsa.mp3',
  ali_mulla:        'ali_mulla.mp3',
  dosari:           'dosari.mp3',
  egypt:            'egypt.mp3',
  haramain:         'haramain.mp3',
  madinah:          'madinah.mp3',
  makkah:           'makkah.mp3',
  mansoor_zahrani:  'mansoor_zahrani.mp3',
  mishary:          'mishary.mp3',
  naqshbandi:       'naqshbandi.mp3',
  sharif:           'sharif.mp3',
  silent:           'silent.mp3',
  sudais:           'sudais.mp3',
};

// ─── Notification/reminder sound filename map (all files in assets/sounds/notifications/) ─
export const NOTIFICATION_SOUND_FILES: Record<string, string> = {
  alhamdulillah:    'alhamdulillah.mp3',
  evening_adhkar:   'evening_adhkar.mp3',
  general_reminder: 'general_reminder.mp3',
  istighfar:        'istighfar.mp3',
  morning_adhkar:   'morning_adhkar.mp3',
  salawat:          'salawat.mp3',
  subhanallah:      'subhanallah.mp3',
  tasbih:           'tasbih.mp3',
};

/**
 * Resolve a sound key to the platform-correct filename.
 * Android raw resources are referenced WITHOUT extension.
 * iOS uses the full filename WITH extension.
 */
function resolveSoundFile(filename: string): string {
  if (Platform.OS === 'android') {
    return filename.replace(/\.mp3$/, '');
  }
  return filename;
}

/**
 * Delete ALL existing Android notification channels.
 * Must be called before recreating channels with new sounds,
 * otherwise Android will silently ignore the sound change.
 */
export async function deleteAllChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const channels = await Notifications.getNotificationChannelsAsync();
  for (const channel of channels) {
    await Notifications.deleteNotificationChannelAsync(channel.id);
  }

  // Brief delay to let Android finish channel deletion
  await new Promise(resolve => setTimeout(resolve, 300));
}

/**
 * Set up all notification channels with the user's preferred sounds.
 *
 * @param selectedAdhanSound    - key from ADHAN_SOUND_FILES (e.g. 'makkah')
 * @param selectedFajrSound     - key from ADHAN_SOUND_FILES (e.g. 'mishary')
 * @param selectedReminderSound - key from NOTIFICATION_SOUND_FILES (e.g. 'general_reminder')
 */
export async function setupNotificationChannels(
  selectedAdhanSound: string = 'makkah',
  selectedFajrSound: string = 'makkah',
  selectedReminderSound: string = 'general_reminder',
): Promise<void> {
  if (Platform.OS !== 'android') return;

  const adhanFile    = resolveSoundFile(ADHAN_SOUND_FILES[selectedAdhanSound] ?? 'makkah.mp3');
  const fajrFile     = resolveSoundFile(ADHAN_SOUND_FILES[selectedFajrSound] ?? 'makkah.mp3');
  const reminderFile = resolveSoundFile(NOTIFICATION_SOUND_FILES[selectedReminderSound] ?? 'general_reminder.mp3');

  // Channel 1: Regular Prayer Times (Dhuhr, Asr, Maghrib, Isha)
  await Notifications.setNotificationChannelAsync('prayer-times', {
    name: t('notifications.prayerTimesChannel') || 'أوقات الصلاة',
    importance: Notifications.AndroidImportance.MAX,
    sound: adhanFile,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    enableVibrate: true,
  });

  // Channel 2: Fajr Prayer (separate channel for special adhan)
  await Notifications.setNotificationChannelAsync('prayer-fajr', {
    name: t('notifications.fajrChannel') || 'أذان الفجر',
    importance: Notifications.AndroidImportance.MAX,
    sound: fajrFile,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#1B5E20',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    enableVibrate: true,
  });

  // Channel 3: Azkar & General Reminders
  await Notifications.setNotificationChannelAsync('reminders', {
    name: t('notifications.azkarChannel') || 'التذكيرات والأذكار',
    importance: Notifications.AndroidImportance.HIGH,
    sound: reminderFile,
    vibrationPattern: [0, 250],
    lightColor: '#1B5E20',
    enableVibrate: true,
  });

  // Channel 4: Daily Ayah
  await Notifications.setNotificationChannelAsync('daily-ayah', {
    name: t('notifications.dailyVerseChannel') || 'آية اليوم',
    importance: Notifications.AndroidImportance.HIGH,
    sound: reminderFile,
    vibrationPattern: [0, 250],
    enableVibrate: true,
  });

  // Channel 5: General / Seasonal
  await Notifications.setNotificationChannelAsync('general', {
    name: t('notifications.generalChannel') || 'إشعارات عامة',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: reminderFile,
  });
}

/**
 * Reset all channels with new sounds.
 * Call this when the user changes their sound preference in settings.
 * Deletes all existing channels first so Android picks up the new sound.
 */
export async function resetChannelsWithNewSound(
  selectedAdhanSound: string,
  selectedFajrSound: string,
  selectedReminderSound: string,
): Promise<void> {
  await deleteAllChannels();
  await setupNotificationChannels(
    selectedAdhanSound,
    selectedFajrSound,
    selectedReminderSound,
  );
}

/**
 * Delete all cached channels if they were created by an older version.
 * Android caches channels permanently — even across app updates.
 * This ensures existing users get their channels recreated with the
 * correct sounds after we ship a fix.
 *
 * Call this BEFORE setupNotificationChannels on every cold start.
 */
export async function resetChannelsIfOutdated(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const savedVersion = await AsyncStorage.getItem(CHANNELS_VERSION_KEY);

  if (savedVersion !== CURRENT_CHANNELS_VERSION) {
    console.log('[Channels] Outdated channels detected, resetting...');

    const existingChannels = await Notifications.getNotificationChannelsAsync();
    for (const channel of existingChannels) {
      await Notifications.deleteNotificationChannelAsync(channel.id);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    await AsyncStorage.setItem(CHANNELS_VERSION_KEY, CURRENT_CHANNELS_VERSION);

    console.log('[Channels] All old channels deleted successfully');
  }
}
