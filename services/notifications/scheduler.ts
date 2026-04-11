/**
 * Notification Scheduler — جدولة الإشعارات
 *
 * Schedules DATE-based notifications that fire even when the app is killed.
 * The OS alarm system handles delivery — no foreground service needed.
 *
 * Sound rules:
 * - content.sound = filename only (no path)
 * - Android: raw resource name WITHOUT .mp3 extension
 * - iOS: filename WITH .mp3 extension
 * - Android channel controls the actual sound; content.sound is secondary
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ADHAN_SOUND_FILES, NOTIFICATION_SOUND_FILES, getAdhanChannelId, getReminderChannelId } from './channels';

/**
 * Resolve a sound key to the correct platform value for notification content.
 * Returns false for silent, 'default' for system default.
 */
function resolveSoundValue(
  soundKey: string | undefined,
  soundMap: Record<string, string>,
): string | false {
  // Treat 'default' as 'makkah' so the Makkah adhan always plays
  const effectiveKey = (!soundKey || soundKey === 'default') ? 'makkah' : soundKey;
  if (effectiveKey === 'silent') return false;

  const filename = soundMap[effectiveKey];
  if (!filename) return 'default';

  // Android: no extension (raw resource name), iOS: with extension
  return Platform.OS === 'android'
    ? filename.replace(/\.mp3$/, '')
    : filename;
}

/**
 * Schedule a prayer time notification.
 * Uses DATE trigger — the OS fires it at the exact time, even if the app is killed.
 */
export async function schedulePrayerNotification({
  prayerName,
  prayerTime,
  selectedSound = 'makkah',
  isFajr = false,
}: {
  prayerName: string;
  prayerTime: Date;
  selectedSound?: string;
  isFajr?: boolean;
}): Promise<string> {
  // Don't schedule past times
  if (prayerTime <= new Date()) return '';

  const soundValue = resolveSoundValue(selectedSound, ADHAN_SOUND_FILES);
  const channelId = getAdhanChannelId(selectedSound);

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `\u{1F54C} ${prayerName}`,
        body: '\u0627\u0636\u063A\u0637 \u0644\u0644\u0641\u062A\u062D',
        sound: soundValue,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { prayerName, type: 'prayer', isFajr },
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: prayerTime,
        ...(Platform.OS === 'android' && { channelId }),
      },
    });

    return id;
  } catch (e) {
    console.warn('[Scheduler] Failed to schedule prayer notification:', prayerName, e);
    return '';
  }
}

/**
 * Schedule a reminder notification (azkar, wird, daily ayah, etc.).
 */
export async function scheduleReminderNotification({
  title,
  body,
  triggerDate,
  selectedSound = 'general_reminder',
  data = {},
}: {
  title: string;
  body: string;
  triggerDate: Date;
  selectedSound?: string;
  data?: Record<string, string>;
}): Promise<string> {
  // Don't schedule past times
  if (triggerDate <= new Date()) return '';

  const soundValue = resolveSoundValue(selectedSound, NOTIFICATION_SOUND_FILES);

  try {
    const channelId = getReminderChannelId(selectedSound);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: soundValue,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'reminder', ...data },
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android' && { channelId }),
      },
    });

    return id;
  } catch (e) {
    console.warn('[Scheduler] Failed to schedule reminder notification:', title, e);
    return '';
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel a single notification by its identifier.
 */
export async function cancelNotificationById(id: string): Promise<void> {
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Get all currently scheduled notifications for debugging.
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}
