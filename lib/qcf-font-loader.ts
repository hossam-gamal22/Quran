/**
 * QCF4 V4 Font Loader
 *
 * Downloads per-page QCF4 tajweed fonts (.ttf.gz) from jsDelivr CDN,
 * decompresses with pako, caches to local filesystem, and loads via expo-font.
 *
 * Font source: quran_library package (alheekmahlib/quran_library)
 * Font naming: QCF4_tajweed_001.ttf.gz … QCF4_tajweed_604.ttf.gz
 */

import * as Font from 'expo-font';
import * as FileSystem from 'expo-file-system/legacy';
import pako from 'pako';
import { patchCpalTableAllPalettes, DARK_UNIFIED_COLOR, LIGHT_UNIFIED_COLOR } from './ttf-cpal-patcher';

const CDN_BASE =
  'https://cdn.jsdelivr.net/gh/alheekmahlib/quran_library@main/assets/fonts/quran_fonts_qfc4';
const CACHE_DIR = (FileSystem.documentDirectory ?? '') + 'qcf4_cache/';

const loadedPages = new Map<number, boolean>();  // page -> darkMode used
const loadingPromises = new Map<string, Promise<void>>();
let cacheDirReady = false;

/** Total pages in the Quran Mushaf */
export const TOTAL_QURAN_PAGES = 604;

/** Font family for a given page (1-based) */
export function getPageFontFamily(page: number): string {
  return `QCF4_page${page}`;
}

/** Whether the font for this page is already loaded in memory */
export function isPageFontLoaded(page: number): boolean {
  return loadedPages.has(page);
}

/** Validate page number */
export function isValidPage(page: number): boolean {
  return Number.isInteger(page) && page >= 1 && page <= TOTAL_QURAN_PAGES;
}

// ── Internals ──

/** Ensure cache directory exists */
async function ensureCacheDir(): Promise<void> {
  if (cacheDirReady) return;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
  cacheDirReady = true;
}

/** Zero-pad page number to 3 digits */
function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

// Accept darkMode param (default false)
export async function loadPageFont(
  page: number,
  darkMode: boolean = false,
): Promise<void> {
  // If already loaded with same mode, skip
  if (loadedPages.has(page) && loadedPages.get(page) === darkMode) return;
  const promiseKey = `${page}_${darkMode}`;
  if (loadingPromises.has(promiseKey)) return loadingPromises.get(promiseKey);

  const promise = (async () => {
    try {
      await ensureCacheDir();
      const familyName = getPageFontFamily(page);
      const patchColor = darkMode ? DARK_UNIFIED_COLOR : LIGHT_UNIFIED_COLOR;
      const cacheKey = darkMode ? '_dark' : '_light';
      const cachedPath = CACHE_DIR + `page${page}${cacheKey}.ttf`;

        // Check if CPAL-patched version is already cached on disk
        const cacheInfo = await FileSystem.getInfoAsync(cachedPath);
        if (cacheInfo.exists) {
          await Font.loadAsync({ [familyName]: cachedPath });
          loadedPages.set(page, darkMode);
          return;
        }

        // Download color font (.ttf.gz with COLR/CPAL) from CDN
        const url = `${CDN_BASE}/QCF4_tajweed_${pad3(page)}.ttf.gz`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Font download failed: ${response.status} for page ${page}`);
        }

        // Decompress gzip → raw TTF bytes
        const gzBuffer = await response.arrayBuffer();
        let ttfBytes = pako.ungzip(new Uint8Array(gzBuffer));

        // Patch CPAL to uniform color (black for light, cream for dark)
        ttfBytes = patchCpalTableAllPalettes(ttfBytes, patchColor);

        // Convert to base64 and write to cache
        const base64 = uint8ArrayToBase64(ttfBytes);
        await FileSystem.writeAsStringAsync(cachedPath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Load font into memory
        await Font.loadAsync({ [familyName]: cachedPath });
        loadedPages.set(page, darkMode);
    } catch (err) {
      console.warn(`[QCF4] Failed to load font for page ${page}:`, err);
      throw err;
    } finally {
      loadingPromises.delete(promiseKey);
    }
  })();

  loadingPromises.set(promiseKey, promise);
  return promise;
}

/**
 * Ensure fonts for center page ± radius are loaded.
 * Center page loads first, then expands outward.
 */
export async function ensurePagesLoaded(
  centerPage: number,
  radius: number = 2,
  darkMode: boolean = false,
): Promise<void> {
  // Load center page first (blocking)
  if (isValidPage(centerPage)) {
    await loadPageFont(centerPage, darkMode);
  }

  // Load surrounding pages (non-blocking, parallel)
  const surrounding: number[] = [];
  for (let d = 1; d <= radius; d++) {
    if (isValidPage(centerPage - d)) surrounding.push(centerPage - d);
    if (isValidPage(centerPage + d)) surrounding.push(centerPage + d);
  }
  // Fire-and-forget so we don't block rendering
  Promise.all(surrounding.map((p) => loadPageFont(p, darkMode).catch(() => {}))).catch(
    () => {},
  );
}

/** Preload fonts spiraling outward from a start page */
export function preloadFontsInBackground(startPage: number): void {
  let i = 0;
  const step = async () => {
    i++;
    const pages = [startPage + i, startPage - i].filter(isValidPage);
    for (const p of pages) {
      if (!loadedPages.has(p)) {
        try {
          await loadPageFont(p);
        } catch {}
      }
    }
    if (i < 10 && pages.length > 0) {
      setTimeout(step, 200);
    }
  };
  setTimeout(step, 500);
}

// ── Helpers ──

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let offset = 0; offset < len; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, len);
    const chunk = bytes.subarray(offset, end);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}
