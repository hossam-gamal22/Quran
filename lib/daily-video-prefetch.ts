/**
 * Background prefetch/cache service for the Video of the Day screen.
 *
 * - `prefetchDailyVideos()` → called once on app init (in _layout.tsx).
 *   Downloads the JSON manifest + default reciter video to FileSystem cache.
 *
 * - `getCachedDayData()` → returns DayData from AsyncStorage (instant, no network).
 *
 * - `getCachedVideoUri(url)` → checks if the video file exists locally; returns
 *   the file:// path or null.
 *
 * - `cacheVideoFile(url)` → downloads a video file to the cache dir; returns
 *   the local URI.
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_VIDEO_JSON_URL =
  'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/data/daily-video.json';

// Use documentDirectory (persistent) instead of cacheDirectory (iOS purges it)
const CACHE_DIR = `${FileSystem.documentDirectory}daily-videos/`;
const OLD_CACHE_DIR = `${FileSystem.cacheDirectory}daily-videos/`;
const META_KEY = '@daily_video_metadata';
const DATE_KEY = '@daily_video_cache_date';
const MIGRATION_KEY = '@daily_video_migrated_v1';

/**
 * Minimum valid video file size (100 KB).
 * Real MP4 videos are several MB. Partial downloads, HTTP error pages,
 * and Git LFS pointer files are all well below this threshold.
 */
const MIN_VALID_VIDEO_SIZE = 100_000;

/** In-memory lock: filenames currently being downloaded (prevents concurrent writes). */
const _downloading = new Set<string>();

/** Max simultaneous downloads to avoid overwhelming the network */
const MAX_CONCURRENT_DOWNLOADS = 3;

// ──────────────────────────────────────────────
// Types (mirrored from story-of-day.tsx)
// ──────────────────────────────────────────────

interface VideoEntry {
  reciterId: string;
  reciterLabel: string;
  reciterLabelEn: string;
  url: string;
  premiumUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  duration: number;
}

interface DayData {
  ayahText: string;
  surahName: string;
  surahEnglish: string;
  surahNumber: number;
  ayahNumber: number;
  globalAyahNumber: number;
  generatedAt: string;
  videos: VideoEntry[];
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function todayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Ensures the path has a file:// prefix for iOS AVPlayer compatibility.
 * Only saves the filename in storage — resolves full path at runtime.
 */
export function ensureFileUri(path: string): string {
  if (!path) return path;
  if (path.startsWith('file://')) return path;
  return `file://${path}`;
}

/** Extract a stable filename from a URL (last path segment). */
function videoCacheFilename(url: string): string {
  const clean = url.split('?')[0];
  const segments = clean.split('/');
  return segments[segments.length - 1] || `video-${Date.now()}.mp4`;
}

/**
 * Convert raw.githubusercontent.com URL → jsDelivr CDN URL.
 * jsDelivr serves correct Content-Type headers and is more reliable for downloads.
 */
function toJsDelivrUrl(rawUrl: string): string {
  const match = rawUrl.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/
  );
  if (!match) return rawUrl;
  const [, owner, repo, branch, path] = match;
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
}

/** Resolve DayData from the rolling JSON format. */
function resolveDayData(json: Record<string, any>): DayData | null {
  const dateKeys = Object.keys(json).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));

  if (dateKeys.length > 0) {
    const sorted = dateKeys.sort().reverse();
    for (const dk of sorted) {
      const entry = json[dk];
      if (entry?.videos?.length) return entry as DayData;
    }
  }

  // Legacy single-entry format
  if (json.url && json.ayahText) {
    return {
      ayahText: json.ayahText,
      surahName: json.surahName,
      surahEnglish: json.surahEnglish,
      surahNumber: json.surahNumber,
      ayahNumber: json.ayahNumber,
      globalAyahNumber: json.globalAyahNumber,
      generatedAt: json.generatedAt || json.date,
      videos: [
        {
          reciterId: 'ar.alafasy',
          reciterLabel: 'مشاري العفاسي',
          reciterLabelEn: 'Mishary Alafasy',
          url: json.url,
          duration: json.duration || 0,
        },
      ],
    };
  }

  return null;
}

// ──────────────────────────────────────────────
// Validation helpers
// ──────────────────────────────────────────────

/**
 * Returns true if the cached file looks like a real video (exists + size > threshold).
 * Catches partial downloads, HTML error pages, and other non-video content.
 */
async function isValidCachedVideo(localPath: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists || (info.size ?? 0) < MIN_VALID_VIDEO_SIZE) return false;

    // Quick sanity check: read first small chunk to verify it's not an HTML error page.
    // A real MP4 file starts with 'ftyp' at byte offset 4. We read the beginning as
    // base64, decode it, and look for that signature.
    try {
      const base64 = await FileSystem.readAsStringAsync(localPath, {
        encoding: FileSystem.EncodingType.Base64,
        length: 12,
        position: 0,
      });
      const bytes = atob(base64);
      if (bytes.length >= 8 && bytes.substring(4, 8) !== 'ftyp') {
        return false;
      }
    } catch {
      // readAsStringAsync with position/length may not be supported in all Expo versions.
      // Fall back to size-only check (already passed above).
    }

    return true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────
// Ensure cache directory exists
// ──────────────────────────────────────────────

/**
 * Downloads a URL to localPath atomically: writes to .downloading temp file
 * first, validates MP4, then renames. Prevents partial files from being visible.
 */
async function atomicDownload(url: string, localPath: string): Promise<boolean> {
  const tmpPath = localPath + '.downloading';
  try {
    const tmpInfo = await FileSystem.getInfoAsync(tmpPath);
    if (tmpInfo.exists) {
      await FileSystem.deleteAsync(tmpPath, { idempotent: true });
    }

    await FileSystem.downloadAsync(url, tmpPath);

    if (await isValidCachedVideo(tmpPath)) {
      // Atomic rename: file only appears at final path when fully valid
      await FileSystem.moveAsync({ from: tmpPath, to: localPath });
      return true;
    }

    await FileSystem.deleteAsync(tmpPath, { idempotent: true });
    return false;
  } catch {
    try { await FileSystem.deleteAsync(tmpPath, { idempotent: true }); } catch { /* noop */ }
    return false;
  }
}

// ──────────────────────────────────────────────
// Ensure cache directory exists
// ──────────────────────────────────────────────

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Download a single video URL with CDN-first fallback.
 * Returns true if successfully cached.
 */
async function downloadSingleVideo(rawUrl: string, label: string): Promise<boolean> {
  const filename = videoCacheFilename(rawUrl);
  const localPath = CACHE_DIR + filename;

  try {
    // Skip if already cached and valid
    if (await isValidCachedVideo(localPath)) {
      if (__DEV__) console.log(`🎬 Already cached: ${filename}`);
      return true;
    }

    // Mark as downloading (prevents screen from reading partial file)
    _downloading.add(filename);

    // Remove corrupt file if present
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }

    const downloadUrl = toJsDelivrUrl(rawUrl);
    if (__DEV__) console.log(`🎬 Downloading: ${filename}`);

    let ok = await atomicDownload(downloadUrl, localPath);
    if (!ok) {
      if (__DEV__) console.warn(`🎬 CDN failed, trying raw URL: ${filename}`);
      ok = await atomicDownload(rawUrl, localPath);
    }

    if (!ok) {
      if (__DEV__) console.warn(`🎬 Both sources failed for: ${filename}`);
    }

    return ok;
  } catch (e) {
    if (__DEV__) console.warn(`🎬 Failed to cache ${label}:`, (e as any)?.message);
    return false;
  } finally {
    _downloading.delete(filename);
  }
}

/**
 * Run async tasks with a concurrency limit.
 * Executes up to `limit` tasks in parallel, starting next when one finishes.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Called once on app startup.
 * Downloads JSON manifest + ALL reciter videos to local cache in parallel.
 * Skips if already cached for today.
 */
export async function prefetchDailyVideos(): Promise<void> {
  try {
    // One-time migration: move files from old cacheDirectory to persistent documentDirectory
    await migrateFromCacheDir();

    const today = todayDateString();

    // Skip if already prefetched today AND files still exist on disk
    const cachedDate = await AsyncStorage.getItem(DATE_KEY);
    if (cachedDate === today) {
      // Quick sanity check: make sure at least one video file actually exists
      try {
        const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
        if (dirInfo.exists) {
          const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
          const mp4Files = files.filter((f) => f.endsWith('.mp4') && !f.endsWith('.downloading'));
          if (mp4Files.length > 0) {
            // Files exist — but ensure metadata is up to date (could be stale from yesterday)
            try {
              const res = await fetch(DAILY_VIDEO_JSON_URL + `?_=${Date.now()}`);
              if (res.ok) {
                const json = await res.json();
                const freshData = resolveDayData(json);
                if (freshData) {
                  await AsyncStorage.setItem(META_KEY, JSON.stringify(freshData));
                }
              }
            } catch {
              // Non-blocking: metadata refresh failed, existing cache is still usable
            }
            if (__DEV__) console.log('🎬 Daily video already prefetched for', today, `(${mp4Files.length} files)`);
            return;
          }
        }
      } catch { /* continue to re-download */ }
      // DATE_KEY was set but files are missing — clear and re-download
      if (__DEV__) console.log('🎬 DATE_KEY set but no cached files found, re-downloading');
      await AsyncStorage.removeItem(DATE_KEY);
    }

    // Fetch manifest (cache-bust to avoid stale CDN content)
    const cacheBust = `?_=${Date.now()}`;
    const res = await fetch(DAILY_VIDEO_JSON_URL + cacheBust);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const dayData = resolveDayData(json);
    if (!dayData) throw new Error('No valid day data in manifest');

    // Store metadata for instant cache-first loading (date stored AFTER downloads)
    await AsyncStorage.setItem(META_KEY, JSON.stringify(dayData));
    if (__DEV__) console.log('🎬 Cached day metadata for', today);

    // Collect all URLs to download
    await ensureCacheDir();
    const downloadTasks: (() => Promise<boolean>)[] = [];

    for (const video of dayData.videos) {
      const urls = [video.url, video.premiumUrl].filter(Boolean) as string[];
      for (const rawUrl of urls) {
        downloadTasks.push(() => downloadSingleVideo(rawUrl, video.reciterLabel));
      }
    }

    if (__DEV__) console.log(`🎬 Starting ${downloadTasks.length} downloads (${MAX_CONCURRENT_DOWNLOADS} concurrent)`);

    // Download in parallel with concurrency limit
    const results = await runWithConcurrency(downloadTasks, MAX_CONCURRENT_DOWNLOADS);

    const succeeded = results.filter(Boolean).length;
    const failed = results.length - succeeded;

    // Mark today as prefetched if at least half succeeded (don't re-download everything next time)
    if (failed === 0) {
      await AsyncStorage.setItem(DATE_KEY, today);
    } else if (succeeded >= results.length / 2) {
      // Partial success: mark as done to avoid re-downloading already cached files
      // The daily-video screen will CDN-stream any missing files
      await AsyncStorage.setItem(DATE_KEY, today);
    }

    if (__DEV__) console.log(`🎬 Prefetch complete: ${succeeded}/${results.length} succeeded${failed > 0 ? ` (${failed} failed, will stream from CDN)` : ' ✓'}`);
  } catch (e) {
    if (__DEV__) console.log('🎬 Prefetch failed (non-blocking):', (e as any)?.message);
    // Non-blocking — screen will fall back to streaming
  }
}

/**
 * Returns cached DayData from AsyncStorage (instant, no network).
 * Returns null if nothing cached.
 */
export async function getCachedDayData(): Promise<DayData | null> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DayData;
  } catch {
    return null;
  }
}

/**
 * Checks if a video file is already cached locally.
 * Returns the local file:// URI or null.
 */
export async function getCachedVideoUri(url: string): Promise<string | null> {
  try {
    const filename = videoCacheFilename(url);

    // Don't return a file that's being actively downloaded by prefetch
    if (_downloading.has(filename)) {
      if (__DEV__) console.log('🎬 File still downloading, skipping cache:', filename);
      return null;
    }

    const localPath = CACHE_DIR + filename;
    if (await isValidCachedVideo(localPath)) {
      return ensureFileUri(localPath);
    }
    // File missing or invalid — clean up corrupt file if it exists
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) {
      if (__DEV__) console.warn('🎬 Removing invalid cached video:', filename);
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Downloads a video file to the cache directory.
 * Tries jsDelivr CDN first, falls back to raw GitHub URL.
 * Returns the local URI or null on failure.
 */
export async function cacheVideoFile(url: string): Promise<string | null> {
  try {
    await ensureCacheDir();
    const filename = videoCacheFilename(url);
    const localPath = CACHE_DIR + filename;

    // Wait if prefetch is downloading this file
    if (_downloading.has(filename)) {
      if (__DEV__) console.log('🎬 Waiting for prefetch to finish:', filename);
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (!_downloading.has(filename)) break;
      }
      if (await isValidCachedVideo(localPath)) {
        return ensureFileUri(localPath);
      }
    }

    // Return existing valid cache
    if (await isValidCachedVideo(localPath)) return ensureFileUri(localPath);

    // Remove corrupt/partial file
    const existing = await FileSystem.getInfoAsync(localPath);
    if (existing.exists) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }

    _downloading.add(filename);
    try {
      // Try jsDelivr CDN first (atomic download)
      const cdnUrl = toJsDelivrUrl(url);
      let ok = await atomicDownload(cdnUrl, localPath);
      if (!ok) {
        ok = await atomicDownload(url, localPath);
      }

      if (ok) return ensureFileUri(localPath);

      if (__DEV__) console.warn('🎬 cacheVideoFile: both CDN and raw failed for', filename);
      return null;
    } finally {
      _downloading.delete(filename);
    }
  } catch {
    return null;
  }
}

/**
 * Removes a cached video file for the given URL.
 * Called when AVFoundation reports a playback error on a cached file.
 */
export async function invalidateCachedVideo(url: string): Promise<void> {
  try {
    const filename = videoCacheFilename(url);
    const localPath = CACHE_DIR + filename;
    await FileSystem.deleteAsync(localPath, { idempotent: true });
    if (__DEV__) console.log('🎬 Invalidated cached video:', filename);
  } catch {
    // best-effort
  }
}

// ──────────────────────────────────────────────
// Migration: cacheDirectory → documentDirectory
// ──────────────────────────────────────────────

/**
 * One-time migration: moves valid video files from the old cacheDirectory
 * location (purgeable by iOS) to the persistent documentDirectory.
 */
async function migrateFromCacheDir(): Promise<void> {
  try {
    const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (migrated === '1') return;

    const oldDirInfo = await FileSystem.getInfoAsync(OLD_CACHE_DIR);
    if (!oldDirInfo.exists) {
      await AsyncStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    await ensureCacheDir();
    const files = await FileSystem.readDirectoryAsync(OLD_CACHE_DIR);

    for (const file of files) {
      try {
        const oldPath = OLD_CACHE_DIR + file;
        const newPath = CACHE_DIR + file;
        if (await isValidCachedVideo(oldPath)) {
          const newInfo = await FileSystem.getInfoAsync(newPath);
          if (!newInfo.exists) {
            await FileSystem.moveAsync({ from: oldPath, to: newPath });
            if (__DEV__) console.log('🎬 Migrated:', file);
          }
        }
      } catch {
        // Skip individual file errors
      }
    }

    // Clean up old directory
    await FileSystem.deleteAsync(OLD_CACHE_DIR, { idempotent: true });
    await AsyncStorage.setItem(MIGRATION_KEY, '1');
    if (__DEV__) console.log('🎬 Migration from cacheDirectory complete');
  } catch (e) {
    if (__DEV__) console.warn('🎬 Migration failed (non-blocking):', (e as any)?.message);
  }
}
