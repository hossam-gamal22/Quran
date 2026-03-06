import * as Font from 'expo-font';
import * as FileSystem from 'expo-file-system/legacy';

const CDN_BASE = 'https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v2/ttf';
const CDN_VERSION = '3.1';
const CACHE_DIR = FileSystem.documentDirectory + 'qpc_v2/';

const loadedPages = new Set<number>();
const loadingPromises = new Map<number, Promise<void>>();
let cacheDirReady = false;

/** Font family name for a given page number (1-based) */
export function getPageFontFamily(page: number): string {
  return `qpc_v2_p${page}`;
}

/** Check if a page font is ready */
export function isPageFontLoaded(page: number): boolean {
  return loadedPages.has(page);
}

/** Ensure cache directory exists */
async function ensureCacheDir(): Promise<void> {
  if (cacheDirReady) return;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
  cacheDirReady = true;
}

/** Total pages in the Quran Mushaf */
export const TOTAL_QURAN_PAGES = 604;

/** Validate page number is within valid Quran range */
export function isValidPage(page: number): boolean {
  return Number.isInteger(page) && page >= 1 && page <= TOTAL_QURAN_PAGES;
}

/** Load the font for a single page (downloads from CDN if not cached) */
export async function loadPageFont(page: number): Promise<void> {
  // Validate page number
  if (!isValidPage(page)) {
    console.warn(`[QCF] Invalid page number: ${page}. Must be 1-${TOTAL_QURAN_PAGES}.`);
    return;
  }

  if (loadedPages.has(page)) return;

  if (loadingPromises.has(page)) {
    return loadingPromises.get(page);
  }

  const promise = (async () => {
    await ensureCacheDir();

    const localPath = `${CACHE_DIR}p${page}.ttf`;
    const fontName = getPageFontFamily(page);
    const cdnUrl = `${CDN_BASE}/p${page}.ttf?v=${CDN_VERSION}`;

    // Check local cache first
    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists) {
      try {
        await FileSystem.downloadAsync(cdnUrl, localPath);
      } catch (downloadError) {
        console.error(`[QCF] Failed to download font for page ${page}:`, downloadError);
        throw downloadError;
      }
    }

    try {
      await Font.loadAsync({ [fontName]: { uri: localPath } });
      loadedPages.add(page);
    } catch (fontError) {
      console.error(`[QCF] Failed to load font for page ${page}:`, fontError);
      // Try to remove corrupted cache file
      try {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      } catch {}
      throw fontError;
    }
  })().finally(() => {
    loadingPromises.delete(page);
  });

  loadingPromises.set(page, promise);
  return promise;
}

/**
 * Ensure fonts are loaded for present page + radius.
 * Loads center page first, then spreads outward.
 */
export async function ensurePagesLoaded(
  centerPage: number,
  radius: number = 3
): Promise<void> {
  // Build load order: center first, then spiral outward
  const pages: number[] = [];
  pages.push(centerPage);
  for (let d = 1; d <= radius; d++) {
    if (centerPage + d <= TOTAL_QURAN_PAGES) pages.push(centerPage + d);
    if (centerPage - d >= 1) pages.push(centerPage - d);
  }

  // Load center page immediately (await), rest in parallel
  if (pages.length > 0) {
    await loadPageFont(pages[0]);
  }
  if (pages.length > 1) {
    await Promise.all(pages.slice(1).map(loadPageFont));
  }
}

/** Preload fonts in background, spiraling outward from a start page */
export function preloadFontsInBackground(startPage: number): void {
  const pagesToLoad: number[] = [];
  for (let d = 0; d <= 604; d++) {
    if (startPage + d <= 604 && !loadedPages.has(startPage + d)) {
      pagesToLoad.push(startPage + d);
    }
    if (d > 0 && startPage - d >= 1 && !loadedPages.has(startPage - d)) {
      pagesToLoad.push(startPage - d);
    }
  }

  // Load in small batches to avoid blocking
  let i = 0;
  const batchSize = 5;
  const loadBatch = () => {
    if (i >= pagesToLoad.length) return;
    const batch = pagesToLoad.slice(i, i + batchSize);
    i += batchSize;
    Promise.all(batch.map(loadPageFont)).then(() => {
      setTimeout(loadBatch, 50);
    });
  };
  loadBatch();
}
