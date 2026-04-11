/**
 * App Update Checker — فحص تحديثات التطبيق
 *
 * On each app open, compares the current app version against `latestVersion`
 * from Firestore (appConfig). If a newer version is available:
 * 1. Schedules a local notification (once per new version)
 * 2. When user taps the notification, opens the App Store / Play Store
 *
 * The admin sets `latestVersion` + store URLs in the admin panel.
 */

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from './i18n';
import { dirText } from './notification-text-direction';

const LAST_NOTIFIED_VERSION_KEY = '@update_notified_version';
const UPDATE_NOTIFICATION_ID = 'app_update_available';

/**
 * Compare two semver strings. Returns true if `latest` is newer than `current`.
 */
function isNewerVersion(current: string, latest: string): boolean {
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const cv = c[i] || 0;
    const lv = l[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

/**
 * Get the store URL for the current platform.
 */
export function getStoreUrl(storeUrlIos?: string, storeUrlAndroid?: string, downloadLinks?: { ios?: string; android?: string }): string | null {
  if (Platform.OS === 'ios') {
    return storeUrlIos || downloadLinks?.ios || null;
  }
  return storeUrlAndroid || downloadLinks?.android || null;
}

/**
 * Open the appropriate store URL for updating the app.
 */
export async function openStoreForUpdate(storeUrlIos?: string, storeUrlAndroid?: string, downloadLinks?: { ios?: string; android?: string }): Promise<void> {
  const url = getStoreUrl(storeUrlIos, storeUrlAndroid, downloadLinks);
  if (url) {
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn('[app-update-checker] Failed to open store URL:', e);
    }
  }
}

/**
 * Check if a new version is available and send a one-time local notification.
 *
 * Call this on app cold start (after config is loaded from Firestore).
 *
 * @param latestVersion - The latest version from Firestore config
 * @param storeUrlIos   - iOS App Store URL
 * @param storeUrlAndroid - Android Play Store URL
 * @param downloadLinks - Fallback download links
 */
export async function checkAndNotifyUpdate(
  latestVersion?: string,
  storeUrlIos?: string,
  storeUrlAndroid?: string,
  downloadLinks?: { ios?: string; android?: string },
): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!latestVersion) return;

  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  // No update available
  if (!isNewerVersion(currentVersion, latestVersion)) return;

  // Already notified for this version
  const lastNotified = await AsyncStorage.getItem(LAST_NOTIFIED_VERSION_KEY);
  if (lastNotified === latestVersion) return;

  // Check notification permissions
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const storeUrl = getStoreUrl(storeUrlIos, storeUrlAndroid, downloadLinks);

  // Cancel any previous update notification
  try {
    await Notifications.cancelScheduledNotificationAsync(UPDATE_NOTIFICATION_ID);
  } catch {}

  // Schedule notification to fire in 3 seconds (gives time for app to finish loading)
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: UPDATE_NOTIFICATION_ID,
      content: {
        title: dirText(t('notifications.updateAvailableTitle') || '🎉 تحديث جديد متاح'),
        body: dirText(t('notifications.updateAvailableBody') || 'يتوفر إصدار جديد من روح المسلم. حدّث الآن للحصول على أفضل تجربة.'),
        sound: 'default',
        data: {
          type: 'app_update',
          storeUrl: storeUrl || '',
          version: latestVersion,
        },
        ...(Platform.OS === 'android' && { priority: Notifications.AndroidNotificationPriority.HIGH }),
        ...(Platform.OS === 'android' && { channelId: 'general' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + 3000), // 3 seconds from now
        ...(Platform.OS === 'android' && { channelId: 'general' }),
      },
    });

    // Mark this version as notified
    await AsyncStorage.setItem(LAST_NOTIFIED_VERSION_KEY, latestVersion);
    console.log(`🔔 Update notification scheduled for v${latestVersion} (current: v${currentVersion})`);
  } catch (e) {
    console.warn('[app-update-checker] Failed to schedule update notification:', e);
  }
}
