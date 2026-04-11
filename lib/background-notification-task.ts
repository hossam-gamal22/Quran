/**
 * Background Notification Task — مهمة خلفية لإعادة جدولة الإشعارات
 *
 * Uses expo-task-manager + expo-background-fetch to periodically reschedule
 * DATE-based notifications (prayer times, after-prayer azkar) even when the
 * app is closed or killed.
 *
 * The OS decides how often to invoke the task (typically every 15 min – 12 hours
 * depending on usage patterns). Each invocation reschedules all notifications
 * from the saved settings in AsyncStorage.
 *
 * Production notes:
 * - iOS: UIBackgroundModes "fetch" is set in app.json infoPlist
 * - iOS: Background fetch gives ~30s max execution time
 * - Android: Uses WorkManager (survives app kill + device reboot)
 * - Android OEMs (Xiaomi, Huawei, etc.): User must disable battery optimization
 *   for reliable execution — prompted in notification settings screen
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TASK_NAME = 'RESCHEDULE_NOTIFICATIONS';

/**
 * Define the background task at module scope (required by expo-task-manager).
 * This runs even when the app is killed.
 */
TaskManager.defineTask(TASK_NAME, async () => {
  const startTime = Date.now();
  try {
    // Quick check: are notifications enabled at all?
    const raw = await AsyncStorage.getItem('app_settings');
    if (!raw) return BackgroundFetch.BackgroundFetchResult.NoData;

    const settings = JSON.parse(raw);
    if (!settings.notifications?.enabled) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Dynamic import to avoid circular dependencies and reduce cold-start cost.
    // Also import scheduleNotificationsFromSettings directly to bypass the
    // throttle in rescheduleAllFromStorage (background tasks are infrequent
    // and MUST succeed when the OS grants execution time).
    const { scheduleNotificationsFromSettings } = await import('./notifications-manager');

    // Load custom (Firebase-downloaded) sound cache so resolveNotificationSound()
    // can find installed sounds when building notification content.
    // Without this, the background task's fresh JS context has an empty cache
    // and all custom sounds silently fall back to 'default'.
    try {
      const { loadInstalledSoundsCache } = await import('./notification-sound-installer');
      await loadInstalledSoundsCache();
    } catch (e) {
      console.warn('[background-task] Failed to load sound cache:', e);
    }

    // Ensure Android channels exist before scheduling.
    // The background task runs in a fresh JS context so channels may be absent.
    // initializeAllNotificationChannels() is idempotent — safe to call repeatedly.
    if (Platform.OS === 'android') {
      const { initializeAllNotificationChannels, resetChannelsIfOutdated } = await import('../services/notifications/channels');
      await resetChannelsIfOutdated(); // delete stale channels if version changed
      await initializeAllNotificationChannels();
    }

    const n = settings.notifications;

    await scheduleNotificationsFromSettings({
      enabled: n.enabled,
      prayerTimes: n.prayerTimes,
      prayerReminder: n.prayerReminder ?? false,
      reminderMinutes: n.reminderMinutes ?? 0,
      morningAzkar: n.morningAzkar,
      morningAzkarTime: n.morningAzkarTime,
      eveningAzkar: n.eveningAzkar,
      eveningAzkarTime: n.eveningAzkarTime,
      sleepAzkar: n.sleepAzkar ?? false,
      sleepAzkarTime: n.sleepAzkarTime ?? '22:00',
      wakeupAzkar: n.wakeupAzkar ?? false,
      wakeupAzkarTime: n.wakeupAzkarTime ?? '10:00',
      afterPrayerAzkar: n.afterPrayerAzkar ?? false,
      dailyVerse: n.dailyVerse,
      dailyVerseTime: n.dailyVerseTime,
      sound: n.sound ?? true,
      vibration: n.vibration !== false,
      soundType: n.soundType,
      adhanSoundType: n.adhanSoundType || 'makkah',
      azkarSoundType: n.azkarSoundType,
      dailyVerseSoundType: n.dailyVerseSoundType,
      salawatReminder: n.salawatReminder,
      salawatReminderTime: n.salawatReminderTime,
      salawatSoundType: n.salawatSoundType,
      tasbihReminder: n.tasbihReminder,
      tasbihReminderTime: n.tasbihReminderTime,
      tasbihSoundType: n.tasbihSoundType,
      istighfarReminder: n.istighfarReminder,
      istighfarReminderTime: n.istighfarReminderTime,
      istighfarSoundType: n.istighfarSoundType,
      customReminder: n.customReminder,
      customReminderTime: n.customReminderTime,
      customReminderTitle: n.customReminderTitle,
      customReminderSoundType: n.customReminderSoundType,
      customReminderContentType: n.customReminderContentType,
      customReminderSurah: n.customReminderSurah,
      customReminderAyah: n.customReminderAyah,
      customReminderReciter: n.customReminderReciter,
      salawatDays: n.salawatDays,
      tasbihDays: n.tasbihDays,
      istighfarDays: n.istighfarDays,
      azkarDays: n.azkarDays,
      dailyVerseDays: n.dailyVerseDays,
      customReminderDays: n.customReminderDays,
      quranReadingReminder: n.quranReadingReminder,
      quranReadingReminderTime: n.quranReadingReminderTime,
      quranReminderDays: n.quranReminderDays,
      quranReminderSoundType: n.quranReminderSoundType,
      worshipPrayerLogging: n.worshipPrayerLogging,
      worshipDailySummary: n.worshipDailySummary,
      worshipDailySummaryTime: n.worshipDailySummaryTime,
      worshipStreakAlerts: n.worshipStreakAlerts,
      worshipWeeklyReport: n.worshipWeeklyReport,
      kahfReminder: n.kahfReminder,
    });

    // Record last successful background run for diagnostics
    await AsyncStorage.setItem(
      '@bg_notif_last_run',
      JSON.stringify({ time: new Date().toISOString(), durationMs: Date.now() - startTime })
    );

    console.log(`[background-task] Rescheduled in ${Date.now() - startTime}ms`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    console.warn('[background-task] Failed:', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task.
 * Call once on app startup (idempotent — safe to call multiple times).
 *
 * iOS: Requires Background Modes > Background fetch in Xcode capabilities.
 *      Set in app.json: infoPlist.UIBackgroundModes includes "fetch".
 * Android: Uses WorkManager under the hood. stopOnTerminate: false and
 *          startOnBoot: true ensure the task survives app kill and reboot.
 */
export async function registerBackgroundNotificationTask(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      // Re-register to ensure the latest minimumInterval is applied
      // (e.g., after an app update that changed the interval)
      await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    }

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes (minimum allowed by OS)
      stopOnTerminate: false,        // Android: keep running after app kill
      startOnBoot: true,             // Android: restart after device reboot
    });

    // Check the background fetch status for diagnostics
    const status = await BackgroundFetch.getStatusAsync();
    const statusName =
      status === BackgroundFetch.BackgroundFetchStatus.Available ? 'available' :
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ? 'RESTRICTED' :
      status === BackgroundFetch.BackgroundFetchStatus.Denied ? 'DENIED' :
      `unknown(${status})`;

    console.log(`[background-task] Registered (status: ${statusName})`);
  } catch (e) {
    console.warn('[background-task] Registration failed:', e);
  }
}

/**
 * Unregister the background task (e.g., when user disables all notifications).
 */
export async function unregisterBackgroundNotificationTask(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
      console.log('[background-task] Unregistered');
    }
  } catch (e) {
    console.warn('[background-task] Unregistration failed:', e);
  }
}
