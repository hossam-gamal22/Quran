// lib/ayah-audio-cache.ts
// Lightweight per-ayah audio cache for the Mushaf reader.
//
// Per-ayah Mushaf playback hits a remote mp3 for every ayah. On a flaky or
// distant CDN, that means a buffering pause between every verse. This module
// keeps recently-played and prefetched ayah audio on disk so:
//   • A cached ayah starts INSTANTLY from `file://`.
//   • While ayah N is playing, ayah N+1 is downloaded in the background.
//
// Files live in `cacheDirectory/quran_ayah/` (NOT documentDirectory) — the OS
// is free to evict them under disk pressure, which is what we want for what is
// essentially a streaming optimization, not a downloads feature.

import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR = (FileSystem.cacheDirectory ?? '') + 'quran_ayah/';

// In-memory hot cache: URL → local file path (only set after file is confirmed on disk)
const _localPathByUrl = new Map<string, string>();
// Active downloads coalesced by URL so two near-simultaneous calls don't race.
const _activeDownloads = new Map<string, Promise<string | null>>();

let _ensureDirPromise: Promise<void> | null = null;
function ensureCacheDir(): Promise<void> {
  if (_ensureDirPromise) return _ensureDirPromise;
  _ensureDirPromise = (async () => {
    try {
      const info = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
    } catch {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }).catch(() => {});
    }
  })();
  return _ensureDirPromise;
}

// DJB2 hash — stable across runs without bringing in a crypto dep.
function stableHash(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function getLocalPath(url: string): string {
  return CACHE_DIR + stableHash(url) + '.mp3';
}

/**
 * Returns a local file URI for `url` if it's already on disk, else null.
 * Cheap — does not download.
 */
export async function getCachedAyahUri(url: string): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const hit = _localPathByUrl.get(url);
  if (hit) return hit;
  const localPath = getLocalPath(url);
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && (info.size ?? 0) > 0) {
      _localPathByUrl.set(url, localPath);
      return localPath;
    }
  } catch {}
  return null;
}

/**
 * Download `url` into the cache. Coalesces concurrent calls for the same URL.
 * Resolves with the local path on success, or null on failure (silent).
 */
export function prefetchAyahAudio(url: string): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return Promise.resolve(null);

  // Already cached?
  const hit = _localPathByUrl.get(url);
  if (hit) return Promise.resolve(hit);

  // Already downloading?
  const existing = _activeDownloads.get(url);
  if (existing) return existing;

  const promise = (async (): Promise<string | null> => {
    try {
      await ensureCacheDir();
      const localPath = getLocalPath(url);

      // FS check in case another caller cached it since we entered.
      try {
        const info = await FileSystem.getInfoAsync(localPath);
        if (info.exists && (info.size ?? 0) > 0) {
          _localPathByUrl.set(url, localPath);
          return localPath;
        }
      } catch {}

      const tmpPath = `${localPath}.part`;
      const result = await FileSystem.downloadAsync(url, tmpPath);
      if (result.status >= 200 && result.status < 300) {
        try {
          await FileSystem.moveAsync({ from: tmpPath, to: localPath });
          _localPathByUrl.set(url, localPath);
          return localPath;
        } catch {
          await FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => {});
          return null;
        }
      }
      await FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => {});
      return null;
    } catch {
      return null;
    } finally {
      _activeDownloads.delete(url);
    }
  })();

  _activeDownloads.set(url, promise);
  return promise;
}

/** Wipe the per-ayah cache directory. */
export async function clearAyahAudioCache(): Promise<void> {
  _localPathByUrl.clear();
  _activeDownloads.clear();
  _ensureDirPromise = null;
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch {}
}
