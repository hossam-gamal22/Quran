/**
 * QCF Color Font Cache — Tajweed mode (COLRv1)
 *
 * Downloads all 604 colored Mushaf page fonts from quran.com CDN
 * and caches them in FileSystem.documentDirectory for offline use.
 *
 * - First-time activation: bulk download with progress callback
 * - Subsequent runs: instant load from cached file URIs
 * - Bundled fallback: 5 sample pages stay in QCF_COLOR_FONT_MAP
 *
 * For every page we also store a "dark" variant (`p{N}-dark.ttf`) where
 * CPAL palette[0] is patched from black to white so the base glyph layer
 * remains readable on dark backgrounds. Tajweed accent colors are untouched.
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { patchCpalToDark } from './qcf-color-font-patch';

const CACHE_DIR = `${FileSystem.documentDirectory}qcf-color/`;
const FONT_URL = (page: number) =>
  `https://raw.githubusercontent.com/quran/quran.com-frontend-next/production/public/fonts/quran/hafs/v4/colrv1/ttf/p${page}.ttf`;

export const TOTAL_TAJWEED_PAGES = 604;
// v2 = also caches a dark CPAL-patched variant per page. Bumping the key
// forces re-download for users who completed v1, so the dark files get built.
const DOWNLOADED_FLAG_KEY = '@tajweed_fonts_downloaded_v2';
// v4 of the dark patch = transparent rosette fill + gold ornament & digit
// for unobtrusive ayah-number markers. Bumping the key wipes any stale dark
// variants and regenerates them from the cached light TTFs.
const DARK_PATCH_VERSION_KEY = '@tajweed_dark_patch_v8';
const CONCURRENCY = 8;

/** In-memory index of pages whose color font is cached on disk. */
const cachedLightUris: Map<number, string> = new Map();
const cachedDarkUris: Map<number, string> = new Map();

export interface DownloadProgress {
  current: number;
  total: number;
  failed: number;
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

export interface DownloadSignal {
  cancelled: boolean;
}

/** File URI for a given page's cached color font (light or dark variant). */
export function getCachedColorFontUri(page: number, dark = false): string {
  return `${CACHE_DIR}p${page}${dark ? '-dark' : ''}.ttf`;
}

/** True if the bulk download flag is set in AsyncStorage. */
export async function isAllTajweedDownloaded(): Promise<boolean> {
  try {
    const flag = await AsyncStorage.getItem(DOWNLOADED_FLAG_KEY);
    return flag === '1';
  } catch {
    return false;
  }
}

/** True if a particular page's color font file exists on disk. */
export function isCachedInMemory(page: number, dark = false): boolean {
  return (dark ? cachedDarkUris : cachedLightUris).has(page);
}

/** Returns the cached URI for a page, or null. */
export function getCachedSourceFromMemory(page: number, dark = false): string | null {
  // Prefer the requested variant; fall back to the other so the page still
  // renders (with degraded contrast) if only one variant is on disk.
  const primary = dark ? cachedDarkUris : cachedLightUris;
  const secondary = dark ? cachedLightUris : cachedDarkUris;
  return primary.get(page) ?? secondary.get(page) ?? null;
}

/** Ensure the cache directory exists. */
async function ensureCacheDir(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch (e) {
    console.warn('[QCF Color Cache] makeDirectoryAsync failed:', e);
  }
}

/**
 * Scans the cache dir and populates the in-memory URI index for both variants.
 * Call once on app startup.
 *
 * Also performs a one-time migration: if the dark-patch version flag isn't
 * set, all existing `pN-dark.ttf` files are wiped so they get regenerated
 * from the cached light TTFs with the up-to-date CPAL patch (no re-download).
 */
export async function loadCachedColorFontIndex(): Promise<number> {
  cachedLightUris.clear();
  cachedDarkUris.clear();

  // One-time migration: wipe stale dark variants if patch version changed.
  let needsDarkWipe = false;
  try {
    const v = await AsyncStorage.getItem(DARK_PATCH_VERSION_KEY);
    needsDarkWipe = v !== '1';
  } catch {
    /* ignore */
  }

  try {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) return 0;
    const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
    for (const f of files) {
      const md = f.match(/^p(\d+)-dark\.ttf$/);
      if (md) {
        if (needsDarkWipe) {
          try {
            await FileSystem.deleteAsync(`${CACHE_DIR}${f}`, { idempotent: true });
          } catch {
            /* ignore */
          }
          continue;
        }
        const page = Number(md[1]);
        if (page >= 1 && page <= TOTAL_TAJWEED_PAGES) {
          cachedDarkUris.set(page, `${CACHE_DIR}${f}`);
        }
        continue;
      }
      const ml = f.match(/^p(\d+)\.ttf$/);
      if (ml) {
        const page = Number(ml[1]);
        if (page >= 1 && page <= TOTAL_TAJWEED_PAGES) {
          cachedLightUris.set(page, `${CACHE_DIR}${f}`);
        }
      }
    }

    // After wiping, auto-regenerate dark variants from the already-cached
    // light TTFs in the background — no network needed, just CPU.
    if (needsDarkWipe && cachedLightUris.size > 0) {
      void regenerateAllDarkVariants().then(async () => {
        try {
          await AsyncStorage.setItem(DARK_PATCH_VERSION_KEY, '1');
        } catch {
          /* ignore */
        }
      });
    } else if (!needsDarkWipe) {
      // Already migrated; nothing to do.
    } else {
      // No light files cached yet — flag will be set after first download.
    }
  } catch (e) {
    console.warn('[QCF Color Cache] Index scan failed:', e);
  }
  return cachedLightUris.size;
}

/**
 * Background regeneration of all missing dark variants. Walks the cached
 * light TTFs in small concurrent batches so the UI thread stays responsive.
 */
async function regenerateAllDarkVariants(): Promise<void> {
  const pages = Array.from(cachedLightUris.keys()).sort((a, b) => a - b);
  const queue = pages.slice();
  const worker = async () => {
    while (queue.length > 0) {
      const page = queue.shift();
      if (page === undefined) return;
      if (cachedDarkUris.has(page)) continue;
      await generateDarkVariant(page);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
}

// ── Base64 ↔ Uint8Array (Hermes/RN safe; no Buffer dependency) ──

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(128);
for (let i = 0; i < B64_CHARS.length; i++) B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const len = (clean.length / 4) * 3 - padding;
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64_LOOKUP[clean.charCodeAt(i)];
    const b = B64_LOOKUP[clean.charCodeAt(i + 1)];
    const c = B64_LOOKUP[clean.charCodeAt(i + 2)];
    const d = B64_LOOKUP[clean.charCodeAt(i + 3)];
    if (p < len) out[p++] = (a << 2) | (b >> 4);
    if (p < len) out[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < len) out[p++] = ((c & 3) << 6) | d;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.byteLength;
  let i = 0;
  for (; i + 2 < len; i += 3) {
    const t = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    result +=
      B64_CHARS[(t >> 18) & 63] +
      B64_CHARS[(t >> 12) & 63] +
      B64_CHARS[(t >> 6) & 63] +
      B64_CHARS[t & 63];
  }
  if (i < len) {
    const r = len - i;
    if (r === 1) {
      const t = bytes[i] << 16;
      result += B64_CHARS[(t >> 18) & 63] + B64_CHARS[(t >> 12) & 63] + '==';
    } else {
      const t = (bytes[i] << 16) | (bytes[i + 1] << 8);
      result +=
        B64_CHARS[(t >> 18) & 63] +
        B64_CHARS[(t >> 12) & 63] +
        B64_CHARS[(t >> 6) & 63] +
        '=';
    }
  }
  return result;
}

/** Reads the light TTF, patches CPAL palette[0] to white, writes the dark variant. */
async function generateDarkVariant(page: number): Promise<void> {
  const lightUri = getCachedColorFontUri(page, false);
  const darkUri = getCachedColorFontUri(page, true);
  try {
    const b64 = await FileSystem.readAsStringAsync(lightUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = base64ToBytes(b64);
    patchCpalToDark(bytes);
    const outB64 = bytesToBase64(bytes);
    await FileSystem.writeAsStringAsync(darkUri, outB64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    cachedDarkUris.set(page, darkUri);
  } catch (e) {
    console.warn(`[QCF Color Cache] Dark variant gen failed for page ${page}:`, e);
  }
}

/**
 * Downloads all 604 color fonts in parallel batches.
 * Skips pages already cached on disk. Reports progress per file.
 * For every page also produces a CPAL-patched dark variant.
 */
export async function downloadAllTajweedFonts(
  onProgress: DownloadProgressCallback,
  signal?: DownloadSignal
): Promise<{ success: boolean; failed: number }> {
  await ensureCacheDir();

  let completed = 0;
  let failed = 0;
  const queue: number[] = [];

  for (let p = 1; p <= TOTAL_TAJWEED_PAGES; p++) queue.push(p);

  const report = () => {
    onProgress({ current: completed, total: TOTAL_TAJWEED_PAGES, failed });
  };

  const worker = async () => {
    while (queue.length > 0) {
      if (signal?.cancelled) return;
      const page = queue.shift();
      if (page === undefined) return;

      const lightDest = getCachedColorFontUri(page, false);
      const darkDest = getCachedColorFontUri(page, true);
      try {
        const lightInfo = await FileSystem.getInfoAsync(lightDest);
        if (!lightInfo.exists || (lightInfo as any).size === 0) {
          await FileSystem.downloadAsync(FONT_URL(page), lightDest);
        }
        cachedLightUris.set(page, lightDest);

        const darkInfo = await FileSystem.getInfoAsync(darkDest);
        if (!darkInfo.exists || (darkInfo as any).size === 0) {
          await generateDarkVariant(page);
        } else {
          cachedDarkUris.set(page, darkDest);
        }
      } catch (e) {
        failed++;
        console.warn(`[QCF Color Cache] Failed page ${page}:`, e);
      }
      completed++;
      report();
    }
  };

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  if (signal?.cancelled) return { success: false, failed };

  if (failed === 0) {
    try {
      await AsyncStorage.setItem(DOWNLOADED_FLAG_KEY, '1');
      await AsyncStorage.setItem(DARK_PATCH_VERSION_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  return { success: failed === 0, failed };
}

/** Wipe the cache (for debugging / settings reset). */
export async function clearTajweedFontCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  } catch {
    /* ignore */
  }
  cachedLightUris.clear();
  cachedDarkUris.clear();
  try {
    await AsyncStorage.removeItem(DOWNLOADED_FLAG_KEY);
  } catch {
    /* ignore */
  }
}
