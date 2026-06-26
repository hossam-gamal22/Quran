// lib/verse-pool.ts
//
// Rolling 365-ayah verse pool for the home-screen verse widget.
//
// Why: the widget shows one Quranic verse per day. Bundling all 6236 ayat
// in the widget extension would bloat the binary, and a 7-entry rotation
// (BundledDailyAyahs) repeats too often. The app generates a 365-day pool
// at launch, persists it to the App Group, and the widget cycles by
// day-of-year from the pool's seed date. Whenever the app opens again, the
// consumed entries are dropped and the same number of fresh ayat is appended.
// Net effect:
//   • verses change every single day (no app interaction needed in between)
//   • after a year-long absence the widget still has a deterministic entry
//   • each app open rolls the queue forward so it always remains 365 days long
//
// Source: text/metadata from `data/json/quran-uthmani.json`, with QCF page
// glyphs from `qcf-page-data` so the widget PNG can render true QCF.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerseQcfData } from '@/lib/qcf-page-data';

export interface VersePoolEntry {
  arabic: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  /** English translation (Saheeh International) — rendered as the body when
   *  the widget language is set to English. Strips any trailing "﴾N﴿" ayah
   *  marker the source data leaves at the end. */
  translation?: string;
  /** Romanized surah name (e.g. "Az-Zukhruf"). Rendered in place of the
   *  cleaned Arabic name when the widget language is English. */
  englishSurahName?: string;
  /** QCF page number + private glyphs used by the PNG snapshot renderer. */
  qcfPage?: number;
  qcfGlyphs?: string[];
}

export interface VersePool {
  entries: VersePoolEntry[];
  seedDayOfYear: number;
  seedYear: number;
  generatedAt: string;
}

export const VERSE_POOL_KEY = '@widget_verse_pool';
export const VERSE_POOL_SIZE = 365;
const MAX_WIDGET_QCF_WORDS = 8;
const MAX_WIDGET_ARABIC_CHARS = 80;
const MAX_WIDGET_TRANSLATION_CHARS = 110;

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((now - start) / 86400000);
}

/**
 * Days elapsed since the pool's seed date, in calendar days. Handles
 * year boundaries by treating each year as 365 days (close enough — the
 * pool is regenerated long before any drift matters).
 */
export function daysSinceSeed(pool: VersePool, now: Date = new Date()): number {
  const todayDOY = dayOfYear(now);
  const yearDelta = now.getFullYear() - pool.seedYear;
  return yearDelta * 365 + (todayDOY - pool.seedDayOfYear);
}

/**
 * Flat list of short (surahNumber, ayahNumberInSurah) pairs suitable for
 * the medium home-screen widget. Very long ayat make the QCF line auto-fit
 * down and risk clipping, so Verse of Day deliberately samples concise ayat.
 */
let flatAyatCache: { surah: number; ayah: number }[] | null = null;
function loadFlatAyat(): { surah: number; ayah: number }[] {
  if (flatAyatCache) return flatAyatCache;
  // require() so the JSON is bundled at build time (no fetch at runtime).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const quran = require('@/data/json/quran-uthmani.json') as Array<{
    number: number;
    ayahs: Array<{ numberInSurah: number; text: string }>;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const english = require('@/data/json/quran-english.json') as Record<
    string,
    Array<{ id: number; text: string }>
  >;
  const flat: { surah: number; ayah: number }[] = [];
  for (const s of quran) {
    for (const a of s.ayahs) {
      const qcf = getVerseQcfData(s.number, a.numberInSurah);
      const qcfWords = qcf?.glyphs.length ?? 999;
      const arabicLength = String(a.text ?? '').replace(/^﻿/, '').trim().length;
      const translation = (english[String(s.number)] ?? [])
        .find((item) => item.id === a.numberInSurah)?.text
        ?.replace(/\s*﴾[\s\d٠-٩]+﴿\s*$/u, '')
        .trim() ?? '';
      if (
        qcfWords >= 3 &&
        qcfWords <= MAX_WIDGET_QCF_WORDS &&
        arabicLength <= MAX_WIDGET_ARABIC_CHARS &&
        translation.length <= MAX_WIDGET_TRANSLATION_CHARS
      ) {
        flat.push({ surah: s.number, ayah: a.numberInSurah });
      }
    }
  }
  flatAyatCache = flat;
  return flat;
}

/**
 * Strip tashkeel + Quranic annotation marks + the literal "سورة" prefix from
 * a raw surah name so the widget can render a clean readable label.
 *
 * Source data (`quran-uthmani.json`) stores names like "سُورَةُ الزُّخۡرُفِ"
 * with full diacritics, a leading "سورة" word, and embedded Quranic
 * annotation marks. Rendering that next to a "·" separator visually
 * collapses into "سُورَةُ الزَّخْرُفِ ٠ ١٥" — the middle dot reads like
 * an Arabic zero. Cleaning yields just "الزخرف" so callers can format as
 * "سورة الزخرف ١٥".
 */
export function cleanSurahName(raw: string): string {
  return String(raw)
    // Arabic combining tashkeel + Quranic annotation marks + small alif.
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    // Alif wasla → plain alif so "ٱلْفَاتِحَةِ" doesn't drag a special form.
    .replace(/[ٱ]/g, 'ا')
    // Strip the leading "سورة" word (already de-tashkeeled above).
    .replace(/^سورة\s+/, '')
    .trim();
}

function getAyahText(surahNumber: number, ayahNumber: number): {
  arabic: string;
  surahName: string;
  translation: string;
  englishSurahName: string;
} | null {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const quran = require('@/data/json/quran-uthmani.json') as Array<{
    number: number;
    name: string;
    englishName?: string;
    ayahs: Array<{ numberInSurah: number; text: string }>;
  }>;
  // English text source (Saheeh International). Shape:
  //   { "<surahNumber>": [{ id: <numberInSurah>, text: <english> }, ...] }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const english = require('@/data/json/quran-english.json') as Record<
    string,
    Array<{ id: number; text: string }>
  >;
  const surah = quran.find((s) => s.number === surahNumber);
  if (!surah) return null;
  const ayah = surah.ayahs.find((a) => a.numberInSurah === ayahNumber);
  if (!ayah) return null;
  const enList = english[String(surahNumber)] ?? [];
  const enAyah = enList.find((a) => a.id === ayahNumber);
  // Source data leaves a trailing "﴾15﴿" ayah marker at the end of every
  // English text — strip it so the widget body reads as clean prose.
  const translation = (enAyah?.text ?? '')
    .replace(/\s*﴾[\s\d٠-٩]+﴿\s*$/u, '')
    .trim();
  return {
    arabic: ayah.text.replace(/^﻿/, '').trim(), // strip BOM
    // Persist the cleaned name so iOS + Android both consume the same
    // canonical short form ("الزخرف" not "سُورَةُ الزُّخۡرُفِ").
    surahName: cleanSurahName(surah.name),
    translation,
    englishSurahName: (surah.englishName ?? '').trim(),
  };
}

/**
 * Fisher-Yates shuffle pick: returns `count` distinct ayat from the concise
 * ayat set. The shuffle is SEEDED with a fixed constant (mulberry32) — NOT
 * `Math.random` — so every device (iOS + Android) generates the IDENTICAL pool
 * and therefore shows the SAME daily ayah. (Was Math.random ⇒ each platform got
 * a different verse.)
 */
const VERSE_POOL_SEED = 0x6a09e667; // fixed ⇒ deterministic pool order across devices
// Fixed index anchor: the daily ayah = (absolute-days-since-anchor) % poolSize,
// identical on every device. Bump VERSE_POOL_SEED to reshuffle the whole pool.
const VERSE_POOL_SEED_YEAR = 2025;
const VERSE_POOL_SEED_DOY = 1;
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickRandomAyat(count: number): VersePoolEntry[] {
  const flat = loadFlatAyat();
  const n = flat.length;
  const rand = seededRandom(VERSE_POOL_SEED);
  const indices = new Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rand() * (n - i));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  const out: VersePoolEntry[] = [];
  for (let i = 0; i < count; i++) {
    const ref = flat[indices[i]];
    const text = getAyahText(ref.surah, ref.ayah);
    if (text) {
      const qcf = getVerseQcfData(ref.surah, ref.ayah);
      out.push({
        arabic: text.arabic,
        surahName: text.surahName,
        surahNumber: ref.surah,
        ayahNumber: ref.ayah,
        // Always write as strings (even if empty) so the schema-version
        // check in ensureVersePool() can detect format drift reliably.
        translation: text.translation || '',
        englishSurahName: text.englishSurahName || '',
        qcfPage: qcf?.page,
        qcfGlyphs: qcf?.glyphs ?? [],
      });
    }
  }
  return out;
}

/**
 * Idempotent daily queue maintenance. On first launch we create 365 entries.
 * On later launches, if N calendar days elapsed since `seed*`, we remove the
 * N consumed entries and append N fresh ones, then reseed at today. That keeps
 * today's visible verse stable while restoring a full year of future entries.
 *
 * Returns the (possibly newly-generated) pool so callers can include it
 * in the App Group payload they're about to write.
 */
export async function ensureVersePool(now: Date = new Date()): Promise<VersePool> {
  let existing: VersePool | null = null;
  try {
    const raw = await AsyncStorage.getItem(VERSE_POOL_KEY);
    if (raw) existing = JSON.parse(raw) as VersePool;
  } catch {
    // fall through to regenerate
  }

  // Schema version check: older pools (pre-English-translation) lack the
  // `translation` and `englishSurahName` fields, which makes the widget
  // silently fall back to Arabic in English mode. Force a regen when any
  // entry is missing these fields so the user sees the new format on the
  // very next bridge call instead of waiting for natural pool depletion.
  const missingTranslationSchema = !!existing && Array.isArray(existing.entries)
    && existing.entries.length > 0
    && existing.entries.some((e) => (
      typeof (e as any).translation !== 'string' ||
      typeof (e as any).englishSurahName !== 'string' ||
      typeof (e as any).qcfPage !== 'number' ||
      !Array.isArray((e as any).qcfGlyphs) ||
      ((e as any).qcfGlyphs?.length ?? 999) > MAX_WIDGET_QCF_WORDS ||
      String((e as any).arabic ?? '').length > MAX_WIDGET_ARABIC_CHARS ||
      String((e as any).translation ?? '').length > MAX_WIDGET_TRANSLATION_CHARS
    ));

  // FIXED seed so the day-index is an absolute function of the calendar date,
  // identical on every device (iOS + Android) ⇒ same daily ayah everywhere.
  // (Previously the seed was the device's generation date + the pool order was
  // Math.random, so each platform showed a different verse.) The pool is a
  // fixed-order ring buffer indexed by date — NO per-device rolling/consumption.
  const needsRegenerate =
    !existing ||
    !Array.isArray(existing.entries) ||
    existing.entries.length !== VERSE_POOL_SIZE ||
    existing.seedYear !== VERSE_POOL_SEED_YEAR ||
    existing.seedDayOfYear !== VERSE_POOL_SEED_DOY ||
    missingTranslationSchema;

  if (!needsRegenerate && existing) return existing;

  const entries = pickRandomAyat(VERSE_POOL_SIZE);
  const pool: VersePool = {
    entries,
    seedDayOfYear: VERSE_POOL_SEED_DOY,
    seedYear: VERSE_POOL_SEED_YEAR,
    generatedAt: now.toISOString(),
  };
  try {
    await AsyncStorage.setItem(VERSE_POOL_KEY, JSON.stringify(pool));
  } catch (e) {
    if (__DEV__) console.warn('[verse-pool] AsyncStorage write failed:', e);
  }
  if (__DEV__) {
    console.log(`[verse-pool] regenerated ${entries.length} ayat (seed dayOfYear=${pool.seedDayOfYear})`);
  }
  return pool;
}

/**
 * Synchronous, allocation-cheap equivalent of reading `pool.entries[idx]` from
 * the persisted pool — WITHOUT touching AsyncStorage. Because the pool order is
 * a pure function of the fixed `VERSE_POOL_SEED` (deterministic Fisher-Yates),
 * the entry at any index can be reproduced on demand. A partial shuffle (only
 * the first `idx + 1` positions) is enough: in Fisher-Yates a position is final
 * once its own iteration runs, so this returns the IDENTICAL entry the async
 * `ensureVersePool()` persists at the same index. Memoised per index.
 */
const entryAtCache = new Map<number, VersePoolEntry | null>();
function getVersePoolEntryAt(idx: number): VersePoolEntry | null {
  if (entryAtCache.has(idx)) return entryAtCache.get(idx)!;
  const flat = loadFlatAyat();
  const n = flat.length;
  if (n === 0 || idx < 0 || idx >= n) { entryAtCache.set(idx, null); return null; }
  const rand = seededRandom(VERSE_POOL_SEED);
  const indices = new Array<number>(n);
  for (let i = 0; i < n; i++) indices[i] = i;
  for (let i = 0; i <= idx; i++) {
    const j = i + Math.floor(rand() * (n - i));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  const ref = flat[indices[idx]];
  const text = getAyahText(ref.surah, ref.ayah);
  if (!text) { entryAtCache.set(idx, null); return null; }
  const qcf = getVerseQcfData(ref.surah, ref.ayah);
  const entry: VersePoolEntry = {
    arabic: text.arabic,
    surahName: text.surahName,
    surahNumber: ref.surah,
    ayahNumber: ref.ayah,
    translation: text.translation || '',
    englishSurahName: text.englishSurahName || '',
    qcfPage: qcf?.page,
    qcfGlyphs: qcf?.glyphs ?? [],
  };
  entryAtCache.set(idx, entry);
  return entry;
}

/**
 * Today's verse-pool entry, resolved synchronously. Mirrors EXACTLY the index
 * math the async path uses (`daysSinceSeed % VERSE_POOL_SIZE` against the fixed
 * seed anchor), so the in-app screen's first-paint seed equals the verse the
 * widgets and the async resolver land on — no first-render verse swap.
 */
export function getVersePoolEntrySync(now: Date = new Date()): VersePoolEntry | null {
  const elapsed =
    (now.getFullYear() - VERSE_POOL_SEED_YEAR) * 365 + (dayOfYear(now) - VERSE_POOL_SEED_DOY);
  const safeElapsed = Math.max(0, elapsed);
  const idx = ((safeElapsed % VERSE_POOL_SIZE) + VERSE_POOL_SIZE) % VERSE_POOL_SIZE;
  return getVersePoolEntryAt(idx);
}
