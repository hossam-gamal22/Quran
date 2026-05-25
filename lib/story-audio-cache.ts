// lib/story-audio-cache.ts
// Story audio caching layer.
//
// Goals (in order):
//   1. First play of a story should start NOW — never block on caching.
//   2. Skip the archive.org `/metadata` round-trip on repeat plays by
//      persisting the resolved direct-mp3 URL per story.
//   3. After the first play, the file lives on disk so subsequent plays
//      start instantly and work offline.

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = (FileSystem.documentDirectory || '') + 'story_audio/';
const RESOLVED_URL_KEY = '@story_audio_resolved_urls';
const ARCHIVE_AUDIO_RESOLVE_TIMEOUT_MS = 12000;
const AUDIO_FILE_EXTENSIONS = ['.mp3', '.m4a', '.ogg', '.wav', '.aac'];
const AUDIO_FORMAT_PRIORITY = ['vbr mp3', 'mp3', 'm4a', 'ogg', 'wav', 'aac'];

interface ArchiveAudioFile {
  name: string;
  format?: string;
}

interface ArchiveMetadata {
  files?: ArchiveAudioFile[];
  d1?: string;
  d2?: string;
  dir?: string;
  alternate_locations?: {
    servers?: Array<{ server?: string; dir?: string }>;
    workable?: Array<{ server?: string; dir?: string }>;
  };
}

/** Result of preparing a story's audio for playback. */
export interface PreparedStoryAudio {
  /** URI to feed to the audio player. Either a `file://` (cached) or `https://` (streaming). */
  uri: string;
  /** True when `uri` is a local file. */
  isLocal: boolean;
}

// ─── In-memory caches ──────────────────────────────────────────────────────────

let _resolvedUrlMap: Record<string, string> | null = null;
const _localPathCache = new Map<string, string>(); // storyId + URL -> file:// path
const _activeDownloads = new Map<string, Promise<void>>(); // storyId + URL -> download promise

function cacheKeyFor(storyId: string, originalUrl: string): string {
  return `${storyId}::${originalUrl.trim()}`;
}

function hashCacheKey(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

// ─── URL classification helpers ────────────────────────────────────────────────

function isDirectAudioUrl(input: string): boolean {
  const lower = input.trim().toLowerCase().split('?')[0];
  return AUDIO_FILE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function getArchiveIdentifier(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith('archive.org')) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if ((parts[0] === 'details' || parts[0] === 'download' || parts[0] === 'metadata') && parts[1]) {
      return decodeURIComponent(parts[1]);
    }
    if (/^\d+$/.test(parts[0] || '') && parts[1] === 'items' && parts[2]) {
      return decodeURIComponent(parts[2]);
    }
  } catch {
    return null;
  }
  return null;
}

function archiveDownloadUrl(identifier: string, fileName: string): string {
  const encodedPath = fileName.split('/').map(part => encodeURIComponent(part)).join('/');
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedPath}`;
}

function archiveDirectFileUrl(identifier: string, metadata: ArchiveMetadata, fileName: string): string {
  const encodedPath = fileName.split('/').map(part => encodeURIComponent(part)).join('/');
  if (metadata.d1 && metadata.dir) {
    return `https://${metadata.d1}${metadata.dir.replace(/\/$/, '')}/${encodedPath}`;
  }
  if (metadata.d2 && metadata.dir) {
    return `https://${metadata.d2}${metadata.dir.replace(/\/$/, '')}/${encodedPath}`;
  }
  const directLocation = metadata.alternate_locations?.workable?.[0] || metadata.alternate_locations?.servers?.[0];
  if (directLocation?.server && directLocation?.dir) {
    return `https://${directLocation.server}${directLocation.dir.replace(/\/$/, '')}/${encodedPath}`;
  }
  return archiveDownloadUrl(identifier, fileName);
}

function pickArchiveAudioFile(files: ArchiveAudioFile[]): ArchiveAudioFile | null {
  const audioFiles = files.filter(file => {
    const name = (file.name || '').toLowerCase();
    return AUDIO_FILE_EXTENSIONS.some(ext => name.endsWith(ext));
  });
  if (audioFiles.length === 0) return null;
  return [...audioFiles].sort((a, b) => {
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    const aFormat = (a.format || '').toLowerCase();
    const bFormat = (b.format || '').toLowerCase();
    const aScore = AUDIO_FORMAT_PRIORITY.findIndex(t => aFormat.includes(t) || aName.endsWith(`.${t.replace('vbr ', '')}`));
    const bScore = AUDIO_FORMAT_PRIORITY.findIndex(t => bFormat.includes(t) || bName.endsWith(`.${t.replace('vbr ', '')}`));
    return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
  })[0];
}

function withResolveTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('archive-audio-resolve-timeout')), timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// ─── Persistent resolved-URL map ───────────────────────────────────────────────

async function loadResolvedMap(): Promise<Record<string, string>> {
  if (_resolvedUrlMap) return _resolvedUrlMap;
  try {
    const raw = await AsyncStorage.getItem(RESOLVED_URL_KEY);
    _resolvedUrlMap = raw ? JSON.parse(raw) : {};
  } catch {
    _resolvedUrlMap = {};
  }
  return _resolvedUrlMap!;
}

async function saveResolvedUrl(storyId: string, originalUrl: string, resolvedUrl: string): Promise<void> {
  const map = await loadResolvedMap();
  // Key by `${storyId}::${originalUrl}` so an admin-side URL change invalidates the cache.
  map[`${storyId}::${originalUrl}`] = resolvedUrl;
  try {
    await AsyncStorage.setItem(RESOLVED_URL_KEY, JSON.stringify(map));
  } catch {}
}

async function getStoredResolvedUrl(storyId: string, originalUrl: string): Promise<string | null> {
  const map = await loadResolvedMap();
  return map[`${storyId}::${originalUrl}`] || null;
}

// ─── File-system helpers ───────────────────────────────────────────────────────

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

// Stored on disk as `.mp3` regardless of the upstream extension. expo-av
// detects the container from bytes, so this is safe for m4a/ogg/wav too, and
// it keeps the lookup deterministic without needing the resolved URL.
function getLocalPath(storyId: string, originalUrl: string): string {
  const safe = storyId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return CACHE_DIR + safe + '-' + hashCacheKey(originalUrl.trim()) + '.mp3';
}

async function getCachedLocalPath(storyId: string, originalUrl: string): Promise<string | null> {
  const key = cacheKeyFor(storyId, originalUrl);
  const cached = _localPathCache.get(key);
  if (cached) return cached;
  const localPath = getLocalPath(storyId, originalUrl);
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && (info.size ?? 0) > 0) {
      _localPathCache.set(key, localPath);
      return localPath;
    }
  } catch {}
  return null;
}

// ─── URL resolution ────────────────────────────────────────────────────────────

async function resolveDirectUrl(originalUrl: string): Promise<string> {
  const trimmed = originalUrl.trim();
  if (!trimmed) throw new Error('missing-audio-url');

  // Fast path: any URL that already points at an audio file is playable as-is.
  // The admin panel resolves archive.org items at upload time and stores the
  // direct mp3 URL, so the vast majority of stories hit this branch and skip
  // the metadata round-trip entirely.
  if (isDirectAudioUrl(trimmed)) return trimmed;

  const identifier = getArchiveIdentifier(trimmed);
  if (!identifier) throw new Error('unsupported-audio-url');

  const res = await withResolveTimeout(
    fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`),
    ARCHIVE_AUDIO_RESOLVE_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error('archive-metadata-error');

  const metadata = await res.json() as ArchiveMetadata;
  const audioFile = pickArchiveAudioFile(metadata.files || []);
  if (!audioFile) throw new Error('archive-audio-not-found');

  return archiveDirectFileUrl(identifier, metadata, audioFile.name);
}

// ─── Background download ──────────────────────────────────────────────────────

function startBackgroundDownload(storyId: string, originalUrl: string, directUrl: string): Promise<void> {
  // Coalesce concurrent calls for the same story.
  const key = cacheKeyFor(storyId, originalUrl);
  const existing = _activeDownloads.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      await ensureCacheDir();
      const localPath = getLocalPath(storyId, originalUrl);
      // Download into a temp path so a partial file can never be served as cached.
      const tmpPath = `${localPath}.part`;
      const result = await FileSystem.downloadAsync(directUrl, tmpPath);
      if (result.status >= 200 && result.status < 300) {
        try {
          await FileSystem.moveAsync({ from: tmpPath, to: localPath });
          _localPathCache.set(key, localPath);
          console.log('[story-audio-cache] cached', storyId, '→', localPath);
        } catch (moveErr) {
          await FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => {});
          console.warn('[story-audio-cache] move failed for', storyId, moveErr);
        }
      } else {
        await FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => {});
        console.warn('[story-audio-cache] download failed for', storyId, 'status=', result.status);
      }
    } catch (e) {
      console.warn('[story-audio-cache] download error for', storyId, e);
    } finally {
      _activeDownloads.delete(key);
    }
  })();

  _activeDownloads.set(key, promise);
  return promise;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Prepare a story's audio for playback.
 *
 * Order of preference:
 *   1. If a cached local file exists → return `file://` URI (instant).
 *   2. Else, try to skip the archive.org `/metadata` step by reusing a
 *      previously resolved direct mp3 URL from AsyncStorage. Return it for
 *      streaming AND kick off a background download so the next play is local.
 *   3. Else, resolve via archive.org `/metadata`, persist the resolved URL,
 *      return it for streaming AND kick off a background download.
 *
 * Never blocks on the download — playback always starts immediately with
 * whichever URI is available first.
 */
export async function prepareStoryAudio(storyId: string, originalUrl: string): Promise<PreparedStoryAudio> {
  if (!storyId || !originalUrl) throw new Error('missing-audio-url');

  // 1. Local file already cached → return immediately.
  const local = await getCachedLocalPath(storyId, originalUrl);
  if (local) {
    return { uri: local, isLocal: true };
  }

  // 2. Reuse a previously resolved direct URL if we have one.
  const storedDirect = await getStoredResolvedUrl(storyId, originalUrl);
  if (storedDirect) {
    // Kick off background download (fire-and-forget) so next play is local.
    startBackgroundDownload(storyId, originalUrl, storedDirect).catch(() => {});
    return { uri: storedDirect, isLocal: false };
  }

  // 3. Resolve from archive.org for the first time. This is the only path
  //    that has to wait on the metadata round-trip.
  const directUrl = await resolveDirectUrl(originalUrl);
  // Persist for next time (fire-and-forget).
  saveResolvedUrl(storyId, originalUrl, directUrl).catch(() => {});
  startBackgroundDownload(storyId, originalUrl, directUrl).catch(() => {});
  return { uri: directUrl, isLocal: false };
}

/**
 * True when a usable local copy of this story's audio already exists on disk.
 * Used to short-circuit the offline-required notice in the UI.
 */
export async function isStoryAudioCached(storyId: string, originalUrl?: string): Promise<boolean> {
  if (!storyId || !originalUrl) return false;
  return !!(await getCachedLocalPath(storyId, originalUrl));
}

/** Wipe all cached story audio (used by cache-manager on app updates). */
export async function clearStoryAudioCache(): Promise<void> {
  _resolvedUrlMap = null;
  _localPathCache.clear();
  _activeDownloads.clear();
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch {}
  await AsyncStorage.removeItem(RESOLVED_URL_KEY).catch(() => {});
}
