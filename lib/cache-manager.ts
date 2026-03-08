import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const VERSION_KEY = '@app_version';

// Keys to preserve across cache clears
const PRESERVED_KEYS = [
  '@app_version',
  '@app_theme',
  '@language',
  '@user_settings',
  '@user_token',
  '@onboarding_completed',
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
];

const PRESERVED_PREFIXES = [
  '@worship_',
  '@khatma_',
  '@bookmark_',
  '@favorite_',
];

function isPreservedKey(key: string): boolean {
  if (PRESERVED_KEYS.includes(key)) return true;
  return PRESERVED_PREFIXES.some(prefix => key.startsWith(prefix));
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

export async function checkAndClearCacheOnUpdate(): Promise<boolean> {
  try {
    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    const storedVersion = await AsyncStorage.getItem(VERSION_KEY);

    if (storedVersion !== currentVersion) {
      await clearCaches();
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
