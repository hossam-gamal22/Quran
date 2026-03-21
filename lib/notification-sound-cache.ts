// lib/notification-sound-cache.ts
// Cache manager for notification ayah sounds
// Downloads and caches ayah audio for offline notification playback

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getAyahAudioUrl } from './quran-cache';

const CACHE_KEY = '@notification_ayah_cache';
const CACHE_DIR = (FileSystem.documentDirectory || '') + 'notification-sounds/';

// Fixed filename for the ayah notification sound installed in Library/Sounds/ (iOS)
export const AYAH_NOTIFICATION_SOUND_FILE = 'ayah_notification.mp3';

/**
 * Get the iOS Library/Sounds/ directory path.
 * iOS looks here for custom notification sounds at runtime.
 */
function getLibrarySoundsDir(): string | null {
  if (Platform.OS !== 'ios') return null;
  if (!FileSystem.cacheDirectory) return null;
  // cacheDirectory = file:///path/to/Library/Caches/
  // Replace Caches/ with Sounds/ to get Library/Sounds/
  return FileSystem.cacheDirectory.replace('Caches/', 'Sounds/');
}

export interface CachedAyahSound {
  surah: number;
  ayah: number;
  reciter: string;
  globalAyah: number;
  fileUri: string;
  downloadedAt: number;
}

// ─── Ayah Count Data ─────────────────────────────────────────────────────────
// Same as in notifications.tsx
const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

// ─── Helper Functions ────────────────────────────────────────────────────────

function getGlobalAyahNumber(surah: number, ayah: number): number {
  let total = 0;
  for (let i = 0; i < surah - 1; i++) {
    total += AYAH_COUNTS[i];
  }
  return total + ayah;
}

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function loadCacheInfo(): Promise<CachedAyahSound | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveCacheInfo(info: CachedAyahSound): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(info));
}

async function clearCacheInfo(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the cached ayah sound info. Returns null if not cached.
 */
export async function getCachedAyahSound(): Promise<CachedAyahSound | null> {
  const cache = await loadCacheInfo();
  if (!cache) return null;
  
  // Verify file still exists
  const info = await FileSystem.getInfoAsync(cache.fileUri);
  if (!info.exists) {
    await clearCacheInfo();
    return null;
  }
  
  return cache;
}

/**
 * Check if the specified ayah is already cached
 */
export async function isAyahCached(surah: number, ayah: number, reciter: string): Promise<boolean> {
  const cache = await getCachedAyahSound();
  if (!cache) return false;
  return cache.surah === surah && cache.ayah === ayah && cache.reciter === reciter;
}

/**
 * Download and cache an ayah sound for notifications.
 * Removes any previously cached ayah first.
 * 
 * @param surah - Surah number (1-114)
 * @param ayah - Ayah number within the surah
 * @param reciter - Reciter identifier (e.g., 'ar.alafasy')
 * @param onProgress - Optional progress callback (0-1)
 * @returns The cached sound info with local file URI
 */
export async function downloadAyahForNotification(
  surah: number,
  ayah: number,
  reciter: string,
  onProgress?: (progress: number) => void
): Promise<CachedAyahSound> {
  // Check if already cached
  if (await isAyahCached(surah, ayah, reciter)) {
    const existing = await getCachedAyahSound();
    if (existing) return existing;
  }
  
  // Remove previous cached sound
  await clearCachedAyahSound();
  
  // Ensure cache directory exists
  await ensureCacheDir();
  
  // Calculate global ayah number and get URL
  const globalAyah = getGlobalAyahNumber(surah, ayah);
  const sourceUrl = getAyahAudioUrl(reciter, globalAyah);
  const fileName = `ayah_${surah}_${ayah}_${reciter.replace(/\./g, '_')}.mp3`;
  const filePath = CACHE_DIR + fileName;
  
  console.log(`📥 Downloading ayah ${surah}:${ayah} from ${sourceUrl} to ${filePath}`);
  
  // Download the file
  const downloadResumable = FileSystem.createDownloadResumable(
    sourceUrl,
    filePath,
    {},
    (downloadProgress) => {
      const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      onProgress?.(progress);
    }
  );
  
  const result = await downloadResumable.downloadAsync();
  
  if (!result || !result.uri) {
    throw new Error('فشل تحميل الملف الصوتي');
  }
  
  // Save cache info
  const cacheInfo: CachedAyahSound = {
    surah,
    ayah,
    reciter,
    globalAyah,
    fileUri: result.uri,
    downloadedAt: Date.now(),
  };
  
  await saveCacheInfo(cacheInfo);
  console.log(`✅ Cached ayah ${surah}:${ayah} at ${result.uri}`);
  
  // Install as native notification sound on iOS
  await installAyahAsNotificationSound(result.uri);
  
  return cacheInfo;
}

/**
 * Clear the cached ayah sound and remove the installed notification sound
 */
export async function clearCachedAyahSound(): Promise<void> {
  const cache = await loadCacheInfo();
  if (cache?.fileUri) {
    try {
      const info = await FileSystem.getInfoAsync(cache.fileUri);
      if (info.exists) {
        await FileSystem.deleteAsync(cache.fileUri, { idempotent: true });
        console.log(`🗑️ Deleted cached ayah: ${cache.fileUri}`);
      }
    } catch (e) {
      console.warn('Error deleting cached ayah file:', e);
    }
  }
  // Also remove from iOS Library/Sounds/
  await removeAyahNotificationSound();
  await clearCacheInfo();
}

// ─── iOS Native Notification Sound ───────────────────────────────────────────

/**
 * Install the cached ayah audio as an iOS native notification sound.
 * Copies the file to Library/Sounds/ayah_notification.mp3 so iOS can
 * play it for scheduled notifications even when the app is killed.
 *
 * @param sourceUri - The file URI of the downloaded ayah audio
 * @returns true if successfully installed
 */
export async function installAyahAsNotificationSound(sourceUri?: string): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  const soundsDir = getLibrarySoundsDir();
  if (!soundsDir) return false;

  // If no sourceUri provided, try to get from cache
  let uri = sourceUri;
  if (!uri) {
    const cache = await loadCacheInfo();
    if (!cache?.fileUri) return false;
    const info = await FileSystem.getInfoAsync(cache.fileUri);
    if (!info.exists) return false;
    uri = cache.fileUri;
  }

  try {
    // Ensure Library/Sounds/ directory exists
    const dirInfo = await FileSystem.getInfoAsync(soundsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(soundsDir, { intermediates: true });
    }

    const dest = soundsDir + AYAH_NOTIFICATION_SOUND_FILE;

    // Remove old file if exists
    try {
      const existing = await FileSystem.getInfoAsync(dest);
      if (existing.exists) {
        await FileSystem.deleteAsync(dest, { idempotent: true });
      }
    } catch {}

    // Copy the ayah audio to Library/Sounds/
    await FileSystem.copyAsync({ from: uri, to: dest });
    console.log(`🔔 Installed ayah as iOS notification sound: ${dest}`);
    return true;
  } catch (e) {
    console.warn('Failed to install ayah as notification sound:', e);
    return false;
  }
}

/**
 * Check if the ayah notification sound is installed in Library/Sounds/
 */
export async function isAyahNotificationSoundInstalled(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const soundsDir = getLibrarySoundsDir();
  if (!soundsDir) return false;
  try {
    const info = await FileSystem.getInfoAsync(soundsDir + AYAH_NOTIFICATION_SOUND_FILE);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Remove the ayah notification sound from Library/Sounds/
 */
export async function removeAyahNotificationSound(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const soundsDir = getLibrarySoundsDir();
  if (!soundsDir) return;
  try {
    await FileSystem.deleteAsync(soundsDir + AYAH_NOTIFICATION_SOUND_FILE, { idempotent: true });
    console.log('🗑️ Removed ayah notification sound from Library/Sounds/');
  } catch {}
}

/**
 * Get the local file URI for the cached ayah, or the remote URL as fallback
 */
export async function getAyahSoundUri(
  surah: number,
  ayah: number,
  reciter: string
): Promise<{ uri: string; isLocal: boolean }> {
  const cache = await getCachedAyahSound();
  
  if (cache && cache.surah === surah && cache.ayah === ayah && cache.reciter === reciter) {
    // Verify file exists
    const info = await FileSystem.getInfoAsync(cache.fileUri);
    if (info.exists) {
      return { uri: cache.fileUri, isLocal: true };
    }
  }
  
  // Return remote URL as fallback
  const globalAyah = getGlobalAyahNumber(surah, ayah);
  return { uri: getAyahAudioUrl(reciter, globalAyah), isLocal: false };
}

/**
 * Get cache storage size in bytes
 */
export async function getCacheSize(): Promise<number> {
  try {
    const cache = await getCachedAyahSound();
    if (!cache?.fileUri) return 0;
    
    const info = await FileSystem.getInfoAsync(cache.fileUri);
    return info.exists && 'size' in info ? info.size : 0;
  } catch {
    return 0;
  }
}
