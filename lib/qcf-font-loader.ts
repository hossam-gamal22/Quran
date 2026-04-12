/**
 * QCF4 V4 Font Loader — Offline Edition
 *
 * Loads per-page QCF4 tajweed fonts from bundled assets.
 * All 604 fonts are pre-bundled with the app for offline access.
 * No internet connection required to browse the Mushaf.
 *
 * Font naming: QCF4_tajweed_001.ttf … QCF4_tajweed_604.ttf
 */

import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { QCF_FONT_MAP, TOTAL_QURAN_PAGES, isValidPage } from './qcf-font-map';

// Re-export for backward compatibility
export { TOTAL_QURAN_PAGES, isValidPage };

// Track which pages are loaded in memory
const loadedPages = new Map<number, boolean>(); // page -> darkMode used
const loadingPromises = new Map<string, Promise<void>>();

async function resolveAndroidFontSource(fontSource: any): Promise<any> {
  if (Platform.OS !== 'android') return fontSource;
  try {
    const asset = Asset.fromModule(fontSource);
    if (!asset.downloaded) {
      await asset.downloadAsync();
    }
    return asset.localUri ?? asset.uri ?? fontSource;
  } catch (err) {
    console.warn('[QCF4] Android asset resolve failed, falling back to bundled source:', err);
    return fontSource;
  }
}

/** Font family for a given page (1-based). Use darkMode param for mode-specific names. */
export function getPageFontFamily(page: number, darkMode?: boolean): string {
  if (darkMode === true) return `QCF4p${page}d`;
  if (darkMode === false) return `QCF4p${page}l`;
  return `QCF4_page${page}`;
}

/** Whether the font for this page is already loaded in memory (optionally for a specific mode) */
export function isPageFontLoaded(page: number, darkMode?: boolean): boolean {
  if (!loadedPages.has(page)) return false;
  if (darkMode === undefined) return true;
  return loadedPages.get(page) === darkMode;
}

/**
 * Load a QCF font for a specific Mushaf page from bundled assets.
 * Fonts are pre-bundled — no internet required.
 * 
 * @param page Page number (1-604)
 * @param darkMode Dark mode flag (for font naming only, not color processing)
 */
export async function loadPageFont(
  page: number,
  darkMode: boolean = false,
): Promise<void> {
  // Validate page
  if (!isValidPage(page)) {
    console.warn(`[QCF4] Invalid page number: ${page}`);
    return;
  }

  // If already loaded with same mode, skip
  if (loadedPages.has(page) && loadedPages.get(page) === darkMode) return;
  
  const promiseKey = `${page}_${darkMode}`;
  if (loadingPromises.has(promiseKey)) return loadingPromises.get(promiseKey);

  const promise = (async () => {
    try {
      const familyName = getPageFontFamily(page, darkMode);
      const fontSource = QCF_FONT_MAP[page];

      if (!fontSource) {
        throw new Error(`Font not found in bundle for page ${page}`);
      }

      const resolvedFontSource = await resolveAndroidFontSource(fontSource);

      // Android can fail on first attempt (Metro asset fetch, memory pressure)
      // Retry up to 3 times with increasing delay
      const maxRetries = Platform.OS === 'android' ? 3 : 1;
      let lastErr: any;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise(r => setTimeout(r, 300 * attempt));
          }
          await Font.loadAsync({ [familyName]: resolvedFontSource });
          loadedPages.set(page, darkMode);
          return;
        } catch (e) {
          lastErr = e;
          console.warn(`[QCF4] Attempt ${attempt + 1}/${maxRetries} failed for page ${page}:`, e);
        }
      }
      throw lastErr;
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
export function preloadFontsInBackground(startPage: number, darkMode: boolean = false): void {
  let i = 0;
  const step = async () => {
    i++;
    const pages = [startPage + i, startPage - i].filter(isValidPage);
    for (const p of pages) {
      if (!loadedPages.has(p)) {
        try {
          await loadPageFont(p, darkMode);
        } catch {
          // Silent fail for background preload
        }
      }
    }
    if (i < 10 && pages.length > 0) {
      setTimeout(step, 200);
    }
  };
  setTimeout(step, 500);
}

/**
 * Clear loaded fonts from memory tracking.
 * Does not unload fonts from memory (expo-font doesn't support that).
 * Useful for testing or memory pressure situations.
 */
export function clearLoadedFontsTracking(): void {
  loadedPages.clear();
  loadingPromises.clear();
}
