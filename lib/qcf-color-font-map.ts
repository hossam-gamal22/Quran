/**
 * QCF Color Font Map — Tajweed mode (COLRv1)
 *
 * Sparse map of page numbers → bundled colored TTF font sources.
 * Combined with the FileSystem cache (qcf-color-font-cache.ts) for
 * dynamically-downloaded fonts.
 */

import { FontSource } from 'expo-font';
import {
  getCachedSourceFromMemory,
  isCachedInMemory,
  TOTAL_TAJWEED_PAGES,
} from './qcf-color-font-cache';

/** Bundled COLR fonts (sample / hot-cache). */
export const QCF_COLOR_FONT_MAP: Record<number, FontSource> = {
  1: require('../assets/fonts/qcf-color/QCF4_color_001.ttf'),
  2: require('../assets/fonts/qcf-color/QCF4_color_002.ttf'),
  255: require('../assets/fonts/qcf-color/QCF4_color_255.ttf'),
  583: require('../assets/fonts/qcf-color/QCF4_color_583.ttf'),
  604: require('../assets/fonts/qcf-color/QCF4_color_604.ttf'),
};

/**
 * Whether a colored font is available for the given page —
 * either bundled or downloaded into the on-device cache.
 */
export function hasColorFontForPage(page: number): boolean {
  if (page < 1 || page > TOTAL_TAJWEED_PAGES) return false;
  if (Object.prototype.hasOwnProperty.call(QCF_COLOR_FONT_MAP, page)) return true;
  return isCachedInMemory(page);
}

/**
 * Resolves the actual font source for a page —
 * a require() module (bundled) or a file:// URI string (cached).
 * Returns null if no font is available.
 *
 * `dark` selects the CPAL-patched dark variant (palette[0] = white) when
 * available; falls back to the bundled / light cached file otherwise.
 */
export function getColorFontSource(page: number, dark = false): any | null {
  // Prefer the cached dark variant when requested — bundled assets only ship
  // the light palette, so going to cache first ensures dark mode looks right.
  if (dark) {
    const cached = getCachedSourceFromMemory(page, true);
    if (cached) return cached;
  }
  if (Object.prototype.hasOwnProperty.call(QCF_COLOR_FONT_MAP, page)) {
    return QCF_COLOR_FONT_MAP[page];
  }
  return getCachedSourceFromMemory(page, dark);
}

