/**
 * App-Icon Background Task — يعيد ضبط أيقونة التطبيق دوريًا
 *
 * Many Islamic occasions have very short windows (Eid: 3 days, Mawlid: 1 day).
 * If the user doesn't open the app during that window, the foreground sync in
 * `app/_layout.tsx` and `SeasonalContext` never runs and the icon stays on the
 * previous variant.
 *
 * This background task wakes the app once per OS-granted slot (typically every
 * 12-24h depending on usage) and re-resolves the desired icon from the current
 * Hijri date + language. On Android it kills the process after the alias toggle
 * so OEM launchers (MIUI, EMUI, One UI) re-query the icon on next launch — the
 * only reliable way to defeat their icon cache.
 */

import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TASK_NAME = 'REFRESH_APP_ICON';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    // Dynamic imports keep the cold-start cost of the background slot small
    // and avoid pulling Firebase into the foreground bundle on Web.
    const [{ syncAppIconForBackgroundTask }, { getCurrentSeason }, { getLanguage }] =
      await Promise.all([
        import('./app-icon-manager'),
        import('./seasonal-content'),
        import('./i18n'),
      ]);

    // Best-effort: i18n may not be hydrated in a fresh background JS context.
    // Fall back to the persisted language preference written by SettingsContext.
    let lang = getLanguage();
    if (!lang) {
      try {
        const raw = await AsyncStorage.getItem('app_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          lang = parsed?.language ?? 'ar';
        }
      } catch {
        lang = 'ar';
      }
    }

    const season = getCurrentSeason()?.type ?? null;
    await syncAppIconForBackgroundTask(lang as any, season);

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.warn('[app-icon-background-task] Run failed:', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Register the app-icon refresh task. Idempotent.
 *
 * minimumInterval is a hint (OS controls actual cadence). 6 hours is a good
 * balance: short enough that the icon flips within hours of entering Eid,
 * long enough that we don't burn battery — and an OEM-killed process gets a
 * fresh chance multiple times per day.
 */
export async function registerAppIconBackgroundTask(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(TASK_NAME);
    }

    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: 6 * 60 * 60, // 6 hours (OS may delay further)
    });

    if (__DEV__) console.log('[app-icon-background-task] Registered');
  } catch (e) {
    console.warn('[app-icon-background-task] Registration failed:', e);
  }
}

export async function unregisterAppIconBackgroundTask(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) await BackgroundTask.unregisterTaskAsync(TASK_NAME);
  } catch (e) {
    console.warn('[app-icon-background-task] Unregistration failed:', e);
  }
}
