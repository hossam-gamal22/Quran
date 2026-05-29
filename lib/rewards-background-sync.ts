/**
 * Rewards Background Sync — يرفع نقاط المستخدم الشهرية للسيرفر دوريًا
 * بدون الحاجة لفتح التطبيق، عشان لوحة الشرف تعكس نشاط المستخدمين
 * بشكل قريب من الفوري بدلًا من الاعتماد على فتح التطبيق فقط.
 */

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const TASK_NAME = 'REWARDS_MONTHLY_SYNC';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const [{ getUserId }, { syncMonthlyEngagementFromLocalWorship, syncPreviousMonthIfPending }] =
      await Promise.all([
        import('./firebase-user'),
        import('./rewards-manager'),
      ]);

    const userId = await getUserId();
    if (!userId) return BackgroundTask.BackgroundTaskResult.Success;

    await syncPreviousMonthIfPending(userId).catch(() => {});
    await syncMonthlyEngagementFromLocalWorship(userId).catch(() => {});

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    if (__DEV__) console.warn('[rewards-background-sync] Run failed:', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerRewardsBackgroundSync(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(TASK_NAME);
    }

    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60,
    });

    if (__DEV__) console.log('[rewards-background-sync] Registered');
  } catch (e) {
    if (__DEV__) console.warn('[rewards-background-sync] Registration failed:', e);
  }
}

export async function unregisterRewardsBackgroundSync(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) await BackgroundTask.unregisterTaskAsync(TASK_NAME);
  } catch {}
}
