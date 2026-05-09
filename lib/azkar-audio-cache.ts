// lib/azkar-audio-cache.ts
// Manages downloading and caching azkar audio files from GitHub/Firebase URLs.
// Files are cached permanently in documentDirectory so they survive app updates.

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AZKAR_FILENAMES } from './azkar-audio-map';

const CACHE_DIR = (FileSystem.documentDirectory || '') + 'azkar_audio/';
export const GITHUB_BASE =
  'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/assets/sounds/azkar_authentic/';
const DOWNLOAD_COMPLETE_KEY = '@azkar_audio_download_complete';
const DOWNLOAD_PROGRESS_KEY = '@azkar_audio_download_progress';
const CACHE_VERSION_KEY = '@azkar_audio_cache_version';
const CURRENT_CACHE_VERSION = '2'; // Bump when audio files change on CDN

// In-memory set of files known to be cached (avoids repeated filesystem reads)
let _cachedSet: Set<string> | null = null;

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function isCacheableAzkarAudio(value?: string | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^(quran:|file:|asset:|content:|data:)/i.test(trimmed)) return false;
  return true;
}

function stableHash(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function getAudioExtension(value: string): string {
  const rawPath = (() => {
    if (isHttpUrl(value)) {
      try {
        return decodeURIComponent(new URL(value).pathname);
      } catch {
        return value.split('?')[0] || value;
      }
    }
    return value.split('?')[0] || value;
  })();
  const ext = rawPath.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1]?.toLowerCase();
  return ext ? `.${ext}` : '.m4a';
}

function getCacheFilename(input: string): string {
  if (isHttpUrl(input)) {
    return `remote_${stableHash(input)}${getAudioExtension(input)}`;
  }
  return input;
}

/**
 * Clears cached audio if the CDN files have been updated (version mismatch).
 * Call once at app startup before any audio playback.
 */
export async function invalidateAzkarCacheIfNeeded(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(CACHE_VERSION_KEY);
    if (stored !== CURRENT_CACHE_VERSION) {
      console.log('[azkar-cache] Cache version mismatch — clearing old audio cache');
      await clearAzkarCache();
      await AsyncStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    }
  } catch (e) {
    console.warn('[azkar-cache] Cache version check failed:', e);
  }
}

function getRemoteUrl(input: string): string {
  if (isHttpUrl(input)) return input;
  return `${GITHUB_BASE}${encodeURIComponent(input)}`;
}

function getLocalPath(input: string): string {
  return CACHE_DIR + getCacheFilename(input);
}

async function ensureCacheDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => {});
  }
}

/**
 * Returns a playable URI for the given azkar audio filename.
 * - If cached locally → file:// URI (instant, offline)
 * - If not cached → tries a fast download (≤3s) then returns file://
 * - On timeout/failure → returns GitHub raw URL (streaming fallback)
 *   while still keeping the download running in background for next time.
 */
export async function getAzkarAudioUri(filename: string): Promise<string> {
  if (!filename) return '';
  if (!isCacheableAzkarAudio(filename)) return filename;

  const localPath = getLocalPath(filename);

  // Fast path: check in-memory cache
  if (_cachedSet?.has(filename)) {
    return localPath;
  }

  // Filesystem check
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && (info.size ?? 0) > 0) {
      if (!_cachedSet) _cachedSet = new Set();
      _cachedSet.add(filename);
      return localPath;
    }
  } catch {
    // Fall through to remote URL
  }

  // Not cached — race a fast download against a 3s timeout.
  // If the file lands quickly, we play locally (most common on decent networks).
  // Otherwise we fall back to streaming so the user isn't stuck on silence.
  const downloadPromise = downloadSingleFile(filename)
    .then(() => true)
    .catch(() => false);

  const winner = await Promise.race([
    downloadPromise,
    new Promise<boolean>(resolve => setTimeout(() => resolve(false), 3000)),
  ]);

  if (winner === true) {
    return localPath;
  }

  // Streaming fallback. The background download (if still running) will
  // resolve later and populate the cache for the next play.
  return getRemoteUrl(filename);
}

/**
 * Check if a specific file is cached locally.
 */
export async function isAzkarCached(filename: string): Promise<boolean> {
  if (!isCacheableAzkarAudio(filename)) return false;
  if (_cachedSet?.has(filename)) return true;
  try {
    const info = await FileSystem.getInfoAsync(getLocalPath(filename));
    return info.exists && (info.size ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Pre-download a specific set of azkar audio files (e.g. one category).
 * Skips files already cached. Downloads up to `concurrency` at a time.
 * Resilient: individual failures don't stop the batch.
 */
export async function prefetchAzkarFiles(
  filenames: string[],
  concurrency: number = 3,
): Promise<void> {
  if (!filenames || filenames.length === 0) return;
  await ensureCacheDir();

  const pending: string[] = [];
  for (const f of filenames) {
    if (!isCacheableAzkarAudio(f)) continue;
    if (!(await isAzkarCached(f))) pending.push(f);
  }
  if (pending.length === 0) return;

  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.allSettled(batch.map(name => downloadSingleFile(name)));
  }
}

/**
 * Download a single file to the cache directory.
 */
async function downloadSingleFile(filename: string): Promise<void> {
  if (!isCacheableAzkarAudio(filename)) return;
  await ensureCacheDir();
  const localPath = getLocalPath(filename);
  const url = getRemoteUrl(filename);

  const result = await FileSystem.downloadAsync(url, localPath);
  if (result.status >= 200 && result.status < 300) {
    if (!_cachedSet) _cachedSet = new Set();
    _cachedSet.add(filename);
  } else {
    // Clean up partial download
    await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
    throw new Error(`Download failed: ${filename} (status ${result.status})`);
  }
}

/**
 * Pre-download all azkar audio files in the background.
 * Skips files already cached. Downloads 3 at a time.
 * Resilient: individual failures don't stop the batch.
 */
export async function preDownloadAll(
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  // Skip if already completed
  try {
    const complete = await AsyncStorage.getItem(DOWNLOAD_COMPLETE_KEY);
    if (complete === 'true') {
      onProgress?.(AZKAR_FILENAMES.length, AZKAR_FILENAMES.length);
      return;
    }
  } catch {}

  await ensureCacheDir();

  // Figure out which files still need downloading
  const pending: string[] = [];
  for (const filename of AZKAR_FILENAMES) {
    const cached = await isAzkarCached(filename);
    if (!cached) pending.push(filename);
  }

  const total = AZKAR_FILENAMES.length;
  let done = total - pending.length;

  onProgress?.(done, total);

  if (pending.length === 0) {
    await AsyncStorage.setItem(DOWNLOAD_COMPLETE_KEY, 'true').catch(() => {});
    return;
  }

  console.log(`[azkar-cache] Pre-downloading ${pending.length}/${total} files...`);

  // Download in batches of 3
  const BATCH_SIZE = 3;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(filename => downloadSingleFile(filename)),
    );

    for (const r of results) {
      if (r.status === 'fulfilled') done++;
    }
    onProgress?.(done, total);

    // Save progress periodically (every 30 files)
    if (done % 30 === 0) {
      await AsyncStorage.setItem(DOWNLOAD_PROGRESS_KEY, String(done)).catch(() => {});
    }
  }

  // Mark complete if all succeeded
  if (done >= total) {
    await AsyncStorage.setItem(DOWNLOAD_COMPLETE_KEY, 'true').catch(() => {});
    await AsyncStorage.removeItem(DOWNLOAD_PROGRESS_KEY).catch(() => {});
    console.log('[azkar-cache] ✅ All azkar audio files cached.');
  } else {
    console.log(`[azkar-cache] ⚠️ Cached ${done}/${total} files. ${total - done} failed.`);
  }
}

/**
 * Returns how many files are cached vs total.
 */
export async function getCacheStats(): Promise<{ cached: number; total: number }> {
  const total = AZKAR_FILENAMES.length;
  let cached = 0;

  for (const filename of AZKAR_FILENAMES) {
    if (await isAzkarCached(filename)) cached++;
  }

  return { cached, total };
}

/**
 * Delete all cached azkar audio files and reset download state.
 */
export async function clearAzkarCache(): Promise<void> {
  _cachedSet = null;
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch (e) {
    console.warn('[azkar-cache] Failed to clear cache:', e);
  }
  await AsyncStorage.removeItem(DOWNLOAD_COMPLETE_KEY).catch(() => {});
  await AsyncStorage.removeItem(DOWNLOAD_PROGRESS_KEY).catch(() => {});
}

/**
 * Check if all azkar audio has been pre-downloaded.
 */
export async function isPreDownloadComplete(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(DOWNLOAD_COMPLETE_KEY)) === 'true';
  } catch {
    return false;
  }
}
