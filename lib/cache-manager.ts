import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const VERSION_KEY = '@app_version';
const BG_CACHE_CLEARED_KEY = '@bg_cache_cleared_v2';

// Keys to preserve across cache clears
const PRESERVED_KEYS = [
  '@app_version',
  '@app_theme',
  '@language',
  '@user_settings',
  '@user_token',
  '@onboarding_completed',
  'onboarding_complete',
  '@notification_settings',
  '@prayer_notification_settings',
  '@prayer_location',
  '@calculation_method',
  '@hijri_date_offset',
  '@custom_tasbihat',
  '@custom_dhikr',
  '@quran_bookmarks',
  '@quran_last_read',
  '@favorites',
  '@khatma_data',
  '@worship_data',
  '@quran_tracked_pages_khatma',
  // User identity & score — must never be cleared on update
  '@rooh_user_id',
  '@pending_monthly_scores',
  '@rewards_config_cache',
];

const PRESERVED_PREFIXES = [
  '@worship_',
  '@khatma_',
  '@bookmark_',
  '@favorite_',
  '@reward_applied_',
  '@winners_processed_',
];

// Prefixes for background-related caches that MUST be cleared
const BACKGROUND_CACHE_PREFIXES = [
  '@pexels_photos_cache_',
  '@admin_photos_cache_',
  '@admin_photo_categories',
  '@saved_photo_backgrounds',
  '@azkar_listen_photos_',
];

function isPreservedKey(key: string): boolean {
  if (PRESERVED_KEYS.includes(key)) return true;
  return PRESERVED_PREFIXES.some(prefix => key.startsWith(prefix));
}

function isBackgroundCacheKey(key: string): boolean {
  return BACKGROUND_CACHE_PREFIXES.some(prefix => key.startsWith(prefix));
}

async function clearCaches(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(key => !isPreservedKey(key));
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (error) {
    console.log('Clear caches error:', error);
  }
}

/**
 * Force-clear all background-related caches (admin photos, Pexels API results, azkar listen photos).
 * Runs once per app install to purge stale/inappropriate cached images.
 */
async function clearBackgroundCaches(): Promise<void> {
  try {
    const alreadyCleared = await AsyncStorage.getItem(BG_CACHE_CLEARED_KEY);
    if (alreadyCleared) return;

    const allKeys = await AsyncStorage.getAllKeys();
    const bgKeys = allKeys.filter(isBackgroundCacheKey);
    if (bgKeys.length > 0) {
      await AsyncStorage.multiRemove(bgKeys);
      console.log(`🧹 Cleared ${bgKeys.length} stale background caches`);
    }

    // Clear expo-image disk cache to flush stale background thumbnails
    try {
      const { Image } = require('expo-image');
      await Image.clearDiskCache();
      console.log('🧹 Cleared expo-image disk cache');
    } catch { /* expo-image not available */ }

    await AsyncStorage.setItem(BG_CACHE_CLEARED_KEY, 'true');
  } catch (error) {
    console.log('Background cache clear error (non-blocking):', error);
  }
}

export async function checkAndClearCacheOnUpdate(): Promise<boolean> {
  try {
    // Always clear stale background caches (one-time migration)
    await clearBackgroundCaches();

    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    const storedVersion = await AsyncStorage.getItem(VERSION_KEY);

    if (storedVersion !== currentVersion) {
      await clearCaches();
      // Also reset background cache flag so it re-clears on next version too
      await AsyncStorage.removeItem(BG_CACHE_CLEARED_KEY);
      await AsyncStorage.setItem(VERSION_KEY, currentVersion);
      console.log(`Cache cleared for version update: ${storedVersion} → ${currentVersion}`);
      return true;
    }
    return false;
  } catch (error) {
    console.log('Cache check error (non-blocking):', error);
    return false;
  }
}
