// lib/backup-utils.ts
// أدوات النسخ الاحتياطي المشتركة — روح المسلم

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/** SecureStore key for user profile — backed up to preserve identity across devices */
const USER_INFO_KEY = 'manus-runtime-user-info';

// ========================================
// الثوابت
// ========================================

export const BACKUP_VERSION = '2.0';
export const BACKUP_FILENAME = 'rooh_muslim_backup';

/** Keys to exclude from backup/restore (device-specific or sensitive) */
export const EXCLUDED_KEYS = [
  '@fcm_token',
  '@rooh_fcm_token',
  '@device_registered',
  '@rooh_user_id',
  '@rooh_first_open',
  '@app_version',
  'auth_token',
  'last_backup_date',
  // Cache keys that regenerate automatically
  '@quran_cache_timestamp',
  '@sound_settings_cache',
  'ads_config_cache',
  'remote_app_config',
  'dynamic_backgrounds',
  'sdui_screen_configs',
  'home_page_config',
  'performance_data',
  'cache_index',
  'image_cache_index',
  'current_session',
  'seasonal_content_cache',
  'seasonal_last_update',
  'cached_api_data',
];

// ========================================
// الأنواع
// ========================================

export interface BackupData {
  version: string;
  createdAt: string;
  device: string;
  keyCount?: number;
  data: Record<string, any>;
  /** User profile from SecureStore (preserved across devices) */
  secureData?: Record<string, string>;
}

export interface RestoreResult {
  restored: number;
  failed: number;
  failedKeys: string[];
}

// ========================================
// الدوال
// ========================================

/**
 * Gather all AsyncStorage data suitable for backup.
 * Excludes device-specific and cache keys.
 */
export async function gatherBackupData(): Promise<BackupData> {
  const keys = await AsyncStorage.getAllKeys();
  const data: Record<string, any> = {};

  for (const key of keys) {
    if (EXCLUDED_KEYS.includes(key)) continue;
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    } catch {
      // Skip unreadable keys
    }
  }

  // Also capture user profile from SecureStore (not visible to AsyncStorage)
  let secureData: Record<string, string> | undefined;
  try {
    const userInfo = await SecureStore.getItemAsync(USER_INFO_KEY);
    if (userInfo) {
      secureData = { [USER_INFO_KEY]: userInfo };
    }
  } catch {
    // SecureStore not available (web) — skip
  }

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    device: Platform.OS,
    keyCount: Object.keys(data).length,
    data,
    ...(secureData ? { secureData } : {}),
  };
}

/**
 * Estimate the size of a backup payload in bytes.
 */
export function estimateBackupSize(backupData: BackupData): number {
  return new Blob([JSON.stringify(backupData)]).size;
}

/**
 * Format byte size into a human-readable string.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Restore backup data into AsyncStorage.
 * Supports V2 (raw key dump) and V1 (legacy categorized) formats.
 */
export async function restoreBackupData(backupData: BackupData): Promise<RestoreResult> {
  let restored = 0;
  let failed = 0;
  const failedKeys: string[] = [];

  if (backupData.version === '2.0') {
    // V2: Raw dump of all keys
    const entries = Object.entries(backupData.data);
    for (const [key, value] of entries) {
      if (EXCLUDED_KEYS.includes(key)) continue;
      try {
        const strValue = typeof value === 'string' ? value : JSON.stringify(value);
        await AsyncStorage.setItem(key, strValue);
        restored++;
      } catch (e) {
        failed++;
        failedKeys.push(key);
        console.warn(`⚠️ Failed to restore key: ${key}`, e);
      }
    }
  } else {
    // V1 backward compatibility: old categorized format
    const v1Map: Record<string, string> = {
      settings: 'app_settings',
      worship: 'worship_prayer_records',
      khatma: '@rooh_muslim_khatmas',
      bookmarks: '@quran_bookmarks',
    };
    for (const [dataKey, storageKey] of Object.entries(v1Map)) {
      if (backupData.data[dataKey]) {
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(backupData.data[dataKey]));
          restored++;
        } catch (e) {
          failed++;
          failedKeys.push(storageKey);
          console.warn(`⚠️ Failed to restore V1 key: ${storageKey}`, e);
        }
      }
    }
    if (backupData.data.progress?.quran) {
      try {
        await AsyncStorage.setItem('@quran_last_read', JSON.stringify(backupData.data.progress.quran));
        restored++;
      } catch (e) {
        failed++;
        failedKeys.push('@quran_last_read');
        console.warn('⚠️ Failed to restore V1 quran progress', e);
      }
    }
  }

  // Restore SecureStore data (user profile)
  if (backupData.secureData) {
    for (const [key, value] of Object.entries(backupData.secureData)) {
      if (key === USER_INFO_KEY) {
        try {
          await SecureStore.setItemAsync(key, value);
          restored++;
        } catch (e) {
          failed++;
          failedKeys.push(`secure:${key}`);
          console.warn(`⚠️ Failed to restore SecureStore key: ${key}`, e);
        }
      }
    }
  }

  return { restored, failed, failedKeys };
}

/**
 * Check if local data appears empty (fresh install / cleared device).
 * Checks sentinel keys that would exist on an active device.
 */
export async function isLocalDataEmpty(): Promise<boolean> {
  const sentinels = ['app_settings', 'worship_prayer_records', '@rooh_muslim_khatmas', '@quran_bookmarks'];
  for (const key of sentinels) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) return false;
    } catch {
      // ignore
    }
  }
  return true;
}
