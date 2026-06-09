import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const VERSION_KEY = '@app_version';
const BG_CACHE_CLEARED_KEY = '@bg_cache_cleared_v2';

// Keys to preserve across cache clears
const PRESERVED_KEYS = [
  // App / system
  '@app_version',
  '@app_theme',
  '@app_icon_variant',
  '@app_icon_version',
  '@language',
  '@app_language',
  '@user_settings',
  '@user_token',
  'app_settings',

  // Onboarding
  '@onboarding_completed',
  'onboarding_complete',

  // Notifications & prayer
  '@notification_settings',
  '@prayer_notification_settings',
  '@prayer_settings',
  '@prayer_location',
  '@calculation_method',
  '@hijri_date_offset',
  '@hide_next_prayer_alert',

  // Custom user content
  '@custom_tasbihat',
  '@custom_dhikr',
  'custom_adhkar',

  // Quran
  '@quran_bookmarks',
  '@quran_last_read',
  'quran_last_page',
  '@quran_tracked_pages_khatma',

  // Favorites (المحفوظات) — all stores
  '@favorites',
  '@favorites_all',
  '@unified_favorites',
  '@azkar_favorites',
  '@recitation_favs',
  'allah_names_favorites',
  'allah_names_favorites_migrated_v2',

  // Khatma & worship
  '@khatma_data',
  '@worship_data',
  '@rooh_muslim_khatmas',

  // Tasbih
  'tasbih_data',
  'tasbih_type_stats',
  '@tasbih_daily_history',

  // Home customization
  '@quick_access_items',
  '@quick_access_customized',
  '@quick_access_custom_items',

  // Adhkar UI prefs
  'azkar_show_translation',
  'azkar_show_transliteration',
  'azkar_view_mode',
  'azkar_recent_searches',

  // Share / export prefs
  '@shareable_card_preferences',
  '@share_preferences',
  '@pdf_template',

  // Backup
  'last_backup_date',

  // User identity, stats & rewards — must never be cleared on update
  '@rooh_user_id',
  '@rooh_display_name',
  '@rooh_user_id_override',
  '@rooh_local_stats',
  '@pending_monthly_scores',
  '@rewards_config_cache',

  // Subscription / premium — must never be cleared on update
  '@subscription_state',
];

const PRESERVED_PREFIXES = [
  '@worship_',
  '@khatma_',
  '@bookmark_',
  '@favorite_',
  '@favorites_',
  '@reward_applied_',
  '@winners_processed_',
  '@tasbih_',
  '@quran_',
  '@azkar_',
  '@adhkar_',
  '@user_',
  '@rooh_',
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

    const currentVersion = Constants.expoConfig?.version || '1.2.1';
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
