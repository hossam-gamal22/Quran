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

import * as BackgroundTask from 'expo-background-task';
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
    if (!raw) return BackgroundTask.BackgroundTaskResult.Success;

    const settings = JSON.parse(raw);
    if (!settings.notifications?.enabled) {
      return BackgroundTask.BackgroundTaskResult.Success;
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
      fullAdhanSoundType: n.fullAdhanSoundType || 'makkah',
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

    // ── Smart Fajr/Suhoor alarm reschedule ────────────────────────────────────
    // Re-arms the multi-day alarm cascade so it keeps firing even if the user
    // never reopens the app. Reads its own config + cached prayer times.
    try {
      const { rescheduleSmartAlarmsFromStorage } = await import('./smart-alarm/scheduler');
      await rescheduleSmartAlarmsFromStorage();
    } catch (e) {
      console.warn('[background-task] Smart alarm reschedule failed:', e);
    }

    // ── Global maintenance reminder ───────────────────────────────────────────
    // MUST run last — it inspects every scheduled notification to find the
    // farthest one, then schedules a single "reopen the app" nudge before the
    // whole schedule (prayers + adhkar + alarm) runs out.
    try {
      const { scheduleGlobalMaintenanceReminder } = await import('./maintenance-reminder');
      await scheduleGlobalMaintenanceReminder();
    } catch (e) {
      console.warn('[background-task] Maintenance reminder failed:', e);
    }

    // ── Widget data + snapshot refresh ────────────────────────────────────────
    // Refresh shared widget data AND attempt to regenerate PNG snapshots in
    // the background. The countdown overlay on iOS is already live (SwiftUI
    // Text.timer), so even if snapshot regeneration is skipped here, countdowns
    // stay accurate. Snapshot regen updates the baked-in "next prayer" highlight
    // and any prayer-time changes (new day, new location).
    //
    // pumpFromCurrentState requires <SnapshotHost> to be mounted in the React
    // tree. In iOS background mode it usually still is (process not killed);
    // in cold-start headless mode iOS mounts the tree before invoking the task
    // so it should still succeed. If it returns 'skipped' the foreground pump
    // will catch up on the next app open.
    try {
      const { refreshWidgetsNow } = await import('./widget-data-bridge');
      const result = await refreshWidgetsNow();
      console.log(
        `[background-task] Widget refresh ok (snapshots=${result.snapshotCount} version=${result.snapshotVersion ?? 'n/a'} at=${result.snapshotUpdatedAt ?? 'n/a'})`,
      );

      // Belt-and-braces: also call the pump directly in case refreshWidgetsNow
      // hit the "snapshot generation skipped" branch silently. Force=true
      // ensures the hash check doesn't short-circuit us.
      try {
        const { pumpFromCurrentState } = await import('./widgets/pump');
        const pumpResult = await pumpFromCurrentState({ force: true, debounceMs: 0 });
        if (pumpResult) {
          console.log(
            `[background-task] Pump direct: ran=${pumpResult.ran} reason=${pumpResult.reason} entries=${pumpResult.entries?.length ?? 0} errors=${pumpResult.errors?.length ?? 0}`,
          );
        }
      } catch (pe) {
        console.warn('[background-task] Direct pump failed (non-fatal):', pe);
      }
    } catch (we) {
      console.warn('[background-task] Widget refresh failed (non-fatal):', we);
    }

    // Record last successful background run for diagnostics
    await AsyncStorage.setItem(
      '@bg_notif_last_run',
      JSON.stringify({ time: new Date().toISOString(), durationMs: Date.now() - startTime })
    );

    console.log(`[background-task] Rescheduled in ${Date.now() - startTime}ms`);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.warn('[background-task] Failed:', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
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
      await BackgroundTask.unregisterTaskAsync(TASK_NAME);
    }

    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes (minimum allowed by OS)
    });

    // Check the background task status for diagnostics
    const status = await BackgroundTask.getStatusAsync();
    const statusName =
      status === BackgroundTask.BackgroundTaskStatus.Available ? 'available' :
      status === BackgroundTask.BackgroundTaskStatus.Restricted ? 'RESTRICTED' :
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
      await BackgroundTask.unregisterTaskAsync(TASK_NAME);
      console.log('[background-task] Unregistered');
    }
  } catch (e) {
    console.warn('[background-task] Unregistration failed:', e);
  }
}
