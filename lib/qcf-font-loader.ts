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
import { QCF_COLOR_FONT_MAP, hasColorFontForPage } from './qcf-color-font-map';

// Re-export for backward compatibility
export { TOTAL_QURAN_PAGES, isValidPage, hasColorFontForPage };

// Track which pages are loaded in memory
const loadedPages = new Map<number, boolean>(); // page -> darkMode used
const loadedColorPages = new Set<number>();
const loadingPromises = new Map<string, Promise<void>>();

async function resolveFontSource(fontSource: any): Promise<any> {
  try {
    const asset = Asset.fromModule(fontSource);
    if (!asset.downloaded) {
      await asset.downloadAsync();
    }
    return asset.localUri ?? asset.uri ?? fontSource;
  } catch (err) {
    console.warn('[QCF4] Asset resolve failed, falling back to bundled source:', err);
    return fontSource;
  }
}

/** Font family for a given page (1-based). Use darkMode param for mode-specific names. */
export function getPageFontFamily(page: number, darkMode?: boolean, colored?: boolean): string {
  if (colored) return `QCF4p${page}c`;
  if (darkMode === true) return `QCF4p${page}d`;
  if (darkMode === false) return `QCF4p${page}l`;
  return `QCF4_page${page}`;
}

/** Whether the colored (tajweed) font for this page is loaded in memory. */
export function isColorPageFontLoaded(page: number): boolean {
  try {
    const familyName = getPageFontFamily(page, undefined, true);
    if (Font.isLoaded(familyName)) {
      loadedColorPages.add(page);
      return true;
    }
  } catch {
    // expo-font not ready
  }
  return loadedColorPages.has(page);
}

/**
 * Load the colored (COLRv1) tajweed font for a specific page.
 * Returns false silently if no colored font is bundled for this page
 * — callers should fall back to the monochrome family.
 */
export async function loadColorPageFont(page: number): Promise<boolean> {
  if (!isValidPage(page)) return false;
  if (!hasColorFontForPage(page)) return false;
  if (loadedColorPages.has(page)) return true;

  const promiseKey = `c_${page}`;
  const existing = loadingPromises.get(promiseKey);
  if (existing) {
    await existing;
    return loadedColorPages.has(page);
  }

  const promise = (async () => {
    try {
      const familyName = getPageFontFamily(page, undefined, true);
      const fontSource = QCF_COLOR_FONT_MAP[page];
      if (!fontSource) {
        console.warn(`[QCF4-color] No color font bundled for page ${page}`);
        return;
      }
      console.log(`[QCF4-color] Loading colored font ${familyName} for page ${page}…`);
      const resolvedFontSource = await resolveFontSource(fontSource);
      await Font.loadAsync({ [familyName]: resolvedFontSource });
      loadedColorPages.add(page);
      console.log(`[QCF4-color] ✅ Loaded ${familyName}`);
    } catch (err) {
      console.warn(`[QCF4-color] ❌ Failed to load color font for page ${page}:`, err);
    } finally {
      loadingPromises.delete(promiseKey);
    }
  })();

  loadingPromises.set(promiseKey, promise);
  await promise;
  return loadedColorPages.has(page);
}

/** Whether the font for this page is already loaded in memory (optionally for a specific mode) */
export function isPageFontLoaded(page: number, darkMode?: boolean): boolean {
  // Check expo-font's own registry first — covers fonts loaded via useFonts() at app startup
  // (those bypass our loadedPages map but are still usable by name).
  try {
    const familyName = getPageFontFamily(page, darkMode);
    if (Font.isLoaded(familyName)) {
      // Mirror into local map so subsequent calls without darkMode hint also pass
      if (darkMode !== undefined) loadedPages.set(page, darkMode);
      return true;
    }
  } catch {
    // expo-font not ready, fall through
  }
  if (!loadedPages.has(page)) return false;
  if (darkMode === undefined) return true;
  return loadedPages.get(page) === darkMode;
}

/**
 * Preload a batch of critical pages in parallel with per-page timeout.
 * Used at app startup and on Quran tab entry to guarantee instant rendering
 * for the most-likely-accessed pages (Fatiha, start of Baqarah, Ayat Al-Kursi, etc.).
 *
 * Non-blocking by design: each font load has its own timeout; failures are logged
 * but do not reject the overall promise.
 */
export async function preloadCriticalPages(
  pages: number[],
  darkMode: boolean = false,
  perPageTimeoutMs: number = 1500,
): Promise<void> {
  const validPages = pages.filter(isValidPage);
  if (validPages.length === 0) return;

  const withTimeout = (page: number) =>
    Promise.race([
      loadPageFont(page, darkMode),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout page ${page}`)), perPageTimeoutMs),
      ),
    ]).catch((err) => {
      console.warn(`[QCF4] Preload skipped page ${page}:`, err?.message || err);
    });

  await Promise.all(validPages.map(withTimeout));
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

      const resolvedFontSource = await resolveFontSource(fontSource);

      // Both platforms can fail on first attempt (Metro dev server hiccup, LAN latency,
      // memory pressure). Retry on both with increasing delay.
      const maxRetries = 3;
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

/**
 * Preload ALL 604 QCF page fonts in the background after app startup.
 * Loads in chunks so we never block the JS thread; failures are logged but never thrown.
 * Called once from `app/_layout.tsx` after the initial useFonts() resolves so that
 * any subsequent navigation to a Quran page (deep-link, favorite, ayat-kursi, etc.)
 * finds its per-page font already in memory.
 */
let allPagesPreloadStarted: { light: boolean; dark: boolean } = { light: false, dark: false };
export function preloadAllPagesInBackground(darkMode: boolean = false): void {
  const key = darkMode ? 'dark' : 'light';
  if (allPagesPreloadStarted[key]) return;
  allPagesPreloadStarted[key] = true;

  const CHUNK_SIZE = 25;
  const CHUNK_DELAY_MS = 60;

  const loadChunk = async (start: number) => {
    const end = Math.min(start + CHUNK_SIZE, TOTAL_QURAN_PAGES + 1);
    const tasks: Promise<unknown>[] = [];
    for (let p = start; p < end; p++) {
      if (!isValidPage(p)) continue;
      if (loadedPages.has(p) && loadedPages.get(p) === darkMode) continue;
      tasks.push(loadPageFont(p, darkMode).catch(() => null));
    }
    await Promise.all(tasks);
    if (end <= TOTAL_QURAN_PAGES) {
      setTimeout(() => loadChunk(end), CHUNK_DELAY_MS);
    }
  };
  // Defer first chunk so we yield to the JS thread after splash hide.
  setTimeout(() => loadChunk(1), 1000);
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
 * Guarantee a page's QCF font is registered with the OS before sharing.
 *
 * Used by the share-page / share-ayah flows so the off-screen capture and
 * the IslamicShareCard always render real Mushaf glyphs (never the
 * Amiri-Regular fallback). Returns true on success, false on timeout/error
 * — callers should still proceed (the on-screen fallback chain handles it).
 */
export async function ensureSharePageFontReady(
  page: number,
  darkMode: boolean = false,
  timeoutMs: number = 5000,
): Promise<boolean> {
  if (!isValidPage(page)) return false;
  const family = getPageFontFamily(page, darkMode);
  if (Font.isLoaded(family)) return true;
  try {
    await Promise.race([
      loadPageFont(page, darkMode),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`ensureSharePageFontReady timeout page ${page}`)), timeoutMs),
      ),
    ]);
  } catch (err) {
    console.warn('[QCF4] ensureSharePageFontReady failed:', err);
    return false;
  }
  // Poll briefly in case Font.loadAsync resolved before native registration completed.
  const deadline = Date.now() + 1500;
  while (Date.now() < deadline) {
    if (Font.isLoaded(family)) return true;
    await new Promise(r => setTimeout(r, 80));
  }
  return Font.isLoaded(family);
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
