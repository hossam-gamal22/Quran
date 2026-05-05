/**
 * Nature Image Prefetch — يُستخدم في صفحة "آية اليوم"
 *
 * - يُحمِّل صور Unsplash (الطبيعة) إلى مجلد دائم على الجهاز.
 * - يُشغَّل تلقائياً مرة في اليوم لما التطبيق يفتح وفي نت متاح.
 * - بعد كده الصور تشتغل أوفلاين (file://) من غير الحاجة لفتح الصفحة.
 *
 * API:
 *   prefetchNatureImages(urls)        — يُستدعى من _layout.tsx (silent, throttled per day)
 *   getCachedNatureUri(url)           — يُرجع file:// لو موجود، وإلا null (sync via cache)
 *   resolveNatureImageSource(url)     — يُرجع { uri } بالنسخة المحلية إن وجدت، وإلا الـ URL الأصلي
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = `${FileSystem.documentDirectory}nature-bg/`;
const LAST_PREFETCH_KEY = '@nature_bg_last_prefetch_date';
const URI_MAP_KEY = '@nature_bg_uri_map';

/** Min valid image size: 5KB (Unsplash photos are 30KB+). Smaller → corrupted/HTML error. */
const MIN_VALID_SIZE = 5_000;

/** In-memory map from remote URL → local file:// (loaded once at startup). */
let _uriMap: Record<string, string> = {};
let _loaded = false;

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function urlToFilename(url: string): string {
  // hash-like: keep only safe chars, append .jpg
  const safe = url.replace(/[^a-zA-Z0-9]/g, '_').slice(-80);
  return `${safe}.jpg`;
}

async function ensureDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch {}
}

async function loadMap(): Promise<void> {
  if (_loaded) return;
  try {
    const raw = await AsyncStorage.getItem(URI_MAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') _uriMap = parsed;
    }
  } catch {}
  _loaded = true;
}

async function saveMap(): Promise<void> {
  try {
    await AsyncStorage.setItem(URI_MAP_KEY, JSON.stringify(_uriMap));
  } catch {}
}

/**
 * Returns local file:// URI if the image was previously cached on disk and still exists.
 * Synchronous-friendly: relies on in-memory map (loaded by prefetchNatureImages on startup).
 */
export function getCachedNatureUri(url: string): string | null {
  const local = _uriMap[url];
  return local || null;
}

/**
 * Resolves a remote nature URL to the best available source:
 *  - cached file:// if present (offline-friendly)
 *  - else the original URL (will trigger network load + cache on first view)
 */
export function resolveNatureImageSource(url: string): { uri: string } {
  const local = getCachedNatureUri(url);
  return { uri: local || url };
}

/**
 * Downloads all given nature URLs to the persistent cache, once per day.
 * Safe to call on every app launch — throttled internally.
 * Fire-and-forget; never throws.
 */
export async function prefetchNatureImages(urls: string[]): Promise<void> {
  if (!urls || urls.length === 0) return;
  await loadMap();

  // Throttle: only run full prefetch once per day
  let lastDate: string | null = null;
  try {
    lastDate = await AsyncStorage.getItem(LAST_PREFETCH_KEY);
  } catch {}
  const today = todayString();

  // Verify existing cached files still exist on disk; drop stale entries.
  const existing = Object.keys(_uriMap);
  for (const u of existing) {
    try {
      const info = await FileSystem.getInfoAsync(_uriMap[u]);
      if (!info.exists) delete _uriMap[u];
    } catch {
      delete _uriMap[u];
    }
  }

  // Determine which URLs are missing from cache
  const missing = urls.filter(u => !_uriMap[u]);

  // Skip network work if everything is cached AND we already ran today
  if (missing.length === 0 && lastDate === today) return;

  await ensureDir();

  // Download missing images sequentially (gentle on bandwidth)
  for (const url of missing) {
    try {
      const dest = `${CACHE_DIR}${urlToFilename(url)}`;
      const result = await FileSystem.downloadAsync(url, dest);
      if (result.status === 200) {
        const info = await FileSystem.getInfoAsync(dest);
        if (info.exists && (info as any).size >= MIN_VALID_SIZE) {
          _uriMap[url] = dest;
        } else {
          // Corrupt / too small → remove
          try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch {}
        }
      }
    } catch {
      // Network or storage error → silent; will retry tomorrow
    }
  }

  await saveMap();
  try { await AsyncStorage.setItem(LAST_PREFETCH_KEY, today); } catch {}
}
