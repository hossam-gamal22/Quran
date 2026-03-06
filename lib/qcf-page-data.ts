/**
 * QCF Page Data Utilities
 * Provides access to page-level layout data (lines, words, glyphs)
 * following the quran_library architecture.
 */

import pageLinesRaw from '../data/json/qcf-page-lines.json';
import wordsRaw from '../data/json/qcf-words.json';
import quranV4 from '../data/json/quran-v4.json';

// ── Types ──

export type LineType = 'surah_name' | 'basmallah' | 'ayah';

export interface PageLine {
  /** Line number on the page (1-based) */
  ln: number;
  /** Line type */
  lt: LineType;
  /** Is centered (1 = true, 0 = false) */
  c: number;
  /** First word ID (0 if not applicable) */
  fw: number;
  /** Last word ID (0 if not applicable) */
  lw: number;
  /** Surah number (0 if not applicable) */
  sn: number;
}

export interface QcfWord {
  /** Surah number */
  s: number;
  /** Ayah number within surah */
  a: number;
  /** Word index within ayah (1-based) */
  w: number;
  /** QCF glyph text (PUA characters) */
  t: string;
}

export interface WordSegment {
  wordId: number;
  surah: number;
  ayah: number;
  wordNumber: number;
  glyph: string;
  isAyahEnd: boolean;
}

export interface AyahLineBlock {
  type: 'ayah';
  centered: boolean;
  segments: WordSegment[];
}

export interface SurahHeaderBlock {
  type: 'surah_name';
  surahNumber: number;
}

export interface BasmallahBlock {
  type: 'basmallah';
  surahNumber: number;
}

export type RenderBlock = AyahLineBlock | SurahHeaderBlock | BasmallahBlock;

export interface QuranV4Ayah {
  /** Global ayah number */
  n: number;
  /** Number in surah */
  ns: number;
  /** Uthmani text (with tashkeel) */
  t: string;
  /** Plain text for search (emlaey) */
  e: string;
  /** Page number */
  p: number;
  /** Juz number */
  j: number;
  /** Hizb quarter */
  h: number;
  /** Sajda indicator */
  s: boolean;
}

export interface QuranV4Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  ayahs: QuranV4Ayah[];
}

// ── Data Access ──

const pageLines = pageLinesRaw as Record<string, PageLine[]>;
const words = wordsRaw as Record<string, QcfWord>;
const surahs = quranV4 as QuranV4Surah[];

/** Get all 114 surahs with metadata */
export function getAllSurahs(): QuranV4Surah[] {
  return surahs;
}

/** Get surah data by number (1-based) */
export function getSurahData(surahNumber: number): QuranV4Surah | undefined {
  return surahs.find(s => s.number === surahNumber);
}

/** Get lines data for a specific page (1-604) */
export function getPageLines(page: number): PageLine[] {
  return pageLines[String(page)] || [];
}

/** Get a specific word by ID */
export function getWord(id: number): QcfWord | undefined {
  return words[String(id)];
}

/** Get words in a range (inclusive) */
export function getWordsInRange(firstId: number, lastId: number): QcfWord[] {
  const result: QcfWord[] = [];
  for (let i = firstId; i <= lastId; i++) {
    const w = words[String(i)];
    if (w) result.push(w);
  }
  return result;
}

// ── Build ayah-end maps for a page ──

function buildAyahEndMap(lines: PageLine[]): Set<number> {
  // Find the last word ID for each ayah on this page
  const ayahLastWordId = new Map<string, number>();

  for (const line of lines) {
    if (line.lt !== 'ayah' || !line.fw || !line.lw) continue;
    for (let id = line.fw; id <= line.lw; id++) {
      const w = words[String(id)];
      if (!w) continue;
      const key = `${w.s}:${w.a}`;
      const existing = ayahLastWordId.get(key);
      if (!existing || id > existing) {
        ayahLastWordId.set(key, id);
      }
    }
  }

  return new Set(ayahLastWordId.values());
}

// ── Build Render Blocks for a Page ──

/**
 * Builds render blocks for a Quran page, matching quran_library's
 * QpcV4PageRenderer.buildPage() logic.
 */
export function buildPageBlocks(page: number): RenderBlock[] {
  const lines = getPageLines(page);
  if (!lines.length) return [];

  const ayahEndWordIds = buildAyahEndMap(lines);
  const blocks: RenderBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.lt === 'surah_name') {
      blocks.push({ type: 'surah_name', surahNumber: line.sn });
      continue;
    }

    if (line.lt === 'basmallah') {
      // Infer surah from next ayah line or from the surah_name line above
      let surahNum = 0;
      // Look backward for surah_name
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].lt === 'surah_name' && lines[j].sn) {
          surahNum = lines[j].sn;
          break;
        }
      }
      // Fallback: look forward for first ayah
      if (!surahNum) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].lt === 'ayah' && lines[j].fw) {
            const w = words[String(lines[j].fw)];
            if (w) surahNum = w.s;
            break;
          }
        }
      }
      blocks.push({ type: 'basmallah', surahNumber: surahNum });
      continue;
    }

    // Ayah line
    if (!line.fw || !line.lw) continue;

    const segments: WordSegment[] = [];
    let missingWordCount = 0;
    for (let id = line.fw; id <= line.lw; id++) {
      const w = words[String(id)];
      if (!w) {
        missingWordCount++;
        continue;
      }
      segments.push({
        wordId: id,
        surah: w.s,
        ayah: w.a,
        wordNumber: w.w,
        glyph: w.t,
        isAyahEnd: ayahEndWordIds.has(id),
      });
    }
    
    // Log warning if words are missing (helps debug rendering issues)
    if (missingWordCount > 0 && __DEV__) {
      console.warn(`[QCF] Page ${page}: Missing ${missingWordCount} word(s) in range ${line.fw}-${line.lw}`);
    }

    blocks.push({
      type: 'ayah',
      centered: line.c === 1,
      segments,
    });
  }

  return blocks;
}

// ── Page-level Utilities ──

/** Total number of Quran pages */
export const TOTAL_PAGES = 604;

/** Get juz number for a page */
const JUZ_PAGE_STARTS = [1,22,42,62,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];

export function getJuzForPage(page: number): number {
  for (let j = JUZ_PAGE_STARTS.length - 1; j >= 0; j--) {
    if (page >= JUZ_PAGE_STARTS[j]) return j + 1;
  }
  return 1;
}

/** Get hizb for a page (approximate) */
export function getHizbForPage(page: number): number {
  return Math.ceil(getJuzForPage(page) * 2);
}

/** Get the first surah number on a page */
export function getFirstSurahOnPage(page: number): number {
  const lines = getPageLines(page);
  for (const line of lines) {
    if (line.lt === 'surah_name' && line.sn) return line.sn;
    if (line.lt === 'ayah' && line.fw) {
      const w = words[String(line.fw)];
      if (w) return w.s;
    }
  }
  return 1;
}

/** Get the page number where a surah starts */
export function getSurahStartPage(surahNumber: number): number {
  const surah = surahs.find(s => s.number === surahNumber);
  if (!surah || !surah.ayahs.length) return 1;
  return surah.ayahs[0].p;
}

/**
 * Get QCF word glyphs for a specific verse.
 * Returns the page number and array of glyph strings, or null if not found.
 */
export function getVerseQcfData(
  surahNumber: number,
  ayahNumber: number
): { page: number; glyphs: string[] } | null {
  const surah = getSurahData(surahNumber);
  if (!surah) return null;

  const ayah = surah.ayahs.find(a => a.ns === ayahNumber);
  if (!ayah) return null;

  const page = ayah.p;
  const glyphs: string[] = [];

  // Collect glyphs from the verse's page
  const lines = getPageLines(page);
  for (const line of lines) {
    if (line.lt !== 'ayah' || !line.fw || !line.lw) continue;
    for (let id = line.fw; id <= line.lw; id++) {
      const w = words[String(id)];
      if (w && w.s === surahNumber && w.a === ayahNumber) {
        glyphs.push(w.t);
      }
    }
  }

  // If verse spans page boundary, check adjacent pages
  if (glyphs.length === 0) {
    for (const p of [page - 1, page + 1]) {
      if (p < 1 || p > 604) continue;
      const pLines = getPageLines(p);
      for (const line of pLines) {
        if (line.lt !== 'ayah' || !line.fw || !line.lw) continue;
        for (let id = line.fw; id <= line.lw; id++) {
          const w = words[String(id)];
          if (w && w.s === surahNumber && w.a === ayahNumber) {
            glyphs.push(w.t);
          }
        }
      }
      if (glyphs.length > 0) return { page: p, glyphs };
    }
  }

  return glyphs.length > 0 ? { page, glyphs } : null;
}

/** Font size helper — QPC V2 fonts from Tarteel CDN */
export function getQcfFontSize(page: number, screenWidth: number, adjustment: number = 0): number {
  const baseFontSize = 23.55;
  const scaleFactor = screenWidth / 392.73;
  let size = baseFontSize * scaleFactor + adjustment;

  // Pages 1-2 (Fatiha/Baqara start) slightly smaller
  if (page <= 2) {
    size *= 0.94;
  }

  return Math.max(16, Math.min(36, size));
}
