/**
 * Background Image Caching System
 * Downloads and caches background images for offline use
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_DIR: string = ((FileSystem as any).cacheDirectory || '') as string;
const CACHE_DIR = BASE_DIR + 'backgrounds/';
const CACHE_INDEX_KEY = '@cached_backgrounds_index';

interface CachedBackground {
  pexelsId: number;
  localUri: string;
  cachedAt: number;
  size: 'large2x' | 'portrait';
}

interface CacheIndex {
  [key: string]: CachedBackground;
}

/**
 * Ensure the cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Get the cache index from storage
 */
async function getCacheIndex(): Promise<CacheIndex> {
  try {
    const data = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Save the cache index to storage
 */
async function saveCacheIndex(index: CacheIndex): Promise<void> {
  await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
}

/**
 * Generate a unique key for a cached background
 */
function getCacheKey(pexelsId: number, size: 'large2x' | 'portrait'): string {
  return `${pexelsId}_${size}`;
}

/**
 * Get the local file path for a cached background
 */
function getLocalPath(pexelsId: number, size: 'large2x' | 'portrait'): string {
  return `${CACHE_DIR}${pexelsId}_${size}.jpg`;
}

/**
 * Check if a background is cached locally
 */
export async function isBackgroundCached(pexelsId: number, size: 'large2x' | 'portrait' = 'large2x'): Promise<boolean> {
  const index = await getCacheIndex();
  const key = getCacheKey(pexelsId, size);
  
  if (!index[key]) return false;
  
  // Verify the file still exists
  const fileInfo = await FileSystem.getInfoAsync(index[key].localUri);
  return fileInfo.exists;
}

/**
 * Get the local URI for a cached background, or null if not cached
 */
export async function getCachedBackgroundUri(pexelsId: number, size: 'large2x' | 'portrait' = 'large2x'): Promise<string | null> {
  const index = await getCacheIndex();
  const key = getCacheKey(pexelsId, size);
  
  if (!index[key]) return null;
  
  // Verify the file still exists
  const fileInfo = await FileSystem.getInfoAsync(index[key].localUri);
  if (!fileInfo.exists) {
    // Clean up stale index entry
    delete index[key];
    await saveCacheIndex(index);
    return null;
  }
  
  return index[key].localUri;
}

/**
 * Download and cache a background image
 */
export async function cacheBackground(
  pexelsId: number,
  remoteUrl: string,
  size: 'large2x' | 'portrait' = 'large2x'
): Promise<string> {
  await ensureCacheDir();
  
  const localPath = getLocalPath(pexelsId, size);
  const key = getCacheKey(pexelsId, size);
  
  // Download the image
  const downloadResult = await FileSystem.downloadAsync(remoteUrl, localPath);
  
  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download background: ${downloadResult.status}`);
  }
  
  // Update the cache index
  const index = await getCacheIndex();
  index[key] = {
    pexelsId,
    localUri: downloadResult.uri,
    cachedAt: Date.now(),
    size,
  };
  await saveCacheIndex(index);
  
  return downloadResult.uri;
}

/**
 * Get a background URI (cached or remote)
 * If cached, returns local URI. If not cached, returns remote URL
 */
export async function getBackgroundUri(
  pexelsId: number,
  remoteUrl: string,
  size: 'large2x' | 'portrait' = 'large2x'
): Promise<{ uri: string; isCached: boolean }> {
  const cachedUri = await getCachedBackgroundUri(pexelsId, size);
  
  if (cachedUri) {
    return { uri: cachedUri, isCached: true };
  }
  
  return { uri: remoteUrl, isCached: false };
}

/**
 * Remove a cached background
 */
export async function removeCachedBackground(pexelsId: number, size: 'large2x' | 'portrait' = 'large2x'): Promise<void> {
  const index = await getCacheIndex();
  const key = getCacheKey(pexelsId, size);
  
  if (index[key]) {
    try {
      await FileSystem.deleteAsync(index[key].localUri, { idempotent: true });
    } catch {
      // Ignore deletion errors
    }
    delete index[key];
    await saveCacheIndex(index);
  }
}

/**
 * Clear all cached backgrounds
 */
export async function clearBackgroundCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    await AsyncStorage.removeItem(CACHE_INDEX_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  count: number;
  totalSize: number;
  backgrounds: { id: number; size: string; cachedAt: number }[];
}> {
  const index = await getCacheIndex();
  const backgrounds: { id: number; size: string; cachedAt: number }[] = [];
  let totalSize = 0;
  
  for (const entry of Object.values(index)) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(entry.localUri);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size || 0;
        backgrounds.push({
          id: entry.pexelsId,
          size: entry.size,
          cachedAt: entry.cachedAt,
        });
      }
    } catch {
      // Skip errored entries
    }
  }
  
  return {
    count: backgrounds.length,
    totalSize,
    backgrounds,
  };
}

/**
 * Cache a background when user selects it (if not already cached)
 */
export async function cacheBackgroundOnSelect(
  pexelsId: number,
  remoteUrl: string
): Promise<void> {
  try {
    const isCached = await isBackgroundCached(pexelsId, 'large2x');
    if (!isCached) {
      await cacheBackground(pexelsId, remoteUrl, 'large2x');
      console.log(`✅ Background ${pexelsId} cached successfully`);
    }
  } catch (error) {
    console.error(`Failed to cache background ${pexelsId}:`, error);
    // Don't throw - caching is best-effort
  }
}
