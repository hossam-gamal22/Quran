import { DAILY_AYAHS, type DailyAyah } from '@/data/daily-ayahs';
import { getHijriDate } from '@/lib/hijri-date';
import { getCurrentSeason, type SeasonType } from '@/lib/seasonal-content';
import { cleanSurahName } from '@/lib/verse-pool';

type AyahRef = { surah: number; ayah: number };

const SEASONAL_AYAH_REFS: Partial<Record<SeasonType, AyahRef[]>> = {
  ramadan: [
    { surah: 2, ayah: 183 },
    { surah: 2, ayah: 185 },
    { surah: 2, ayah: 186 },
    { surah: 2, ayah: 187 },
    { surah: 97, ayah: 1 },
    { surah: 97, ayah: 3 },
    { surah: 97, ayah: 5 },
    { surah: 44, ayah: 3 },
  ],
  dhul_hijjah: [
    { surah: 89, ayah: 2 },
    { surah: 22, ayah: 27 },
    { surah: 22, ayah: 28 },
    { surah: 22, ayah: 32 },
    { surah: 22, ayah: 34 },
    { surah: 22, ayah: 36 },
    { surah: 2, ayah: 197 },
    { surah: 3, ayah: 97 },
    { surah: 108, ayah: 2 },
    { surah: 22, ayah: 37 },
  ],
  hajj: [
    { surah: 22, ayah: 27 },
    { surah: 22, ayah: 28 },
    { surah: 2, ayah: 198 },
    { surah: 2, ayah: 199 },
    { surah: 22, ayah: 32 },
    { surah: 22, ayah: 36 },
  ],
  eid_adha: [
    { surah: 108, ayah: 2 },
    { surah: 22, ayah: 36 },
    { surah: 22, ayah: 37 },
  ],
  eid_fitr: [
    { surah: 2, ayah: 185 },
    { surah: 87, ayah: 14 },
    { surah: 87, ayah: 15 },
  ],
  ashura: [
    { surah: 26, ayah: 63 },
    { surah: 10, ayah: 90 },
    { surah: 10, ayah: 92 },
    { surah: 20, ayah: 77 },
    { surah: 7, ayah: 137 },
  ],
  muharram: [
    { surah: 9, ayah: 36 },
    { surah: 2, ayah: 153 },
    { surah: 2, ayah: 155 },
    { surah: 10, ayah: 92 },
  ],
  mawlid: [
    { surah: 21, ayah: 107 },
    { surah: 33, ayah: 21 },
    { surah: 33, ayah: 56 },
    { surah: 68, ayah: 4 },
    { surah: 3, ayah: 31 },
    { surah: 48, ayah: 29 },
  ],
  rajab: [
    { surah: 9, ayah: 36 },
    { surah: 22, ayah: 32 },
    { surah: 2, ayah: 197 },
  ],
  shaban: [
    { surah: 2, ayah: 183 },
    { surah: 2, ayah: 186 },
    { surah: 59, ayah: 18 },
  ],
};

function getAyahFromBundledQuran(ref: AyahRef): DailyAyah | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const quran = require('@/data/json/quran-uthmani.json') as Array<{
      number: number;
      name: string;
      ayahs: Array<{ numberInSurah: number; text: string }>;
    }>;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const english = require('@/data/json/quran-english.json') as Record<
      string,
      Array<{ id: number; text: string }>
    >;

    const surah = quran.find((item) => item.number === ref.surah);
    const ayah = surah?.ayahs.find((item) => item.numberInSurah === ref.ayah);
    if (!surah || !ayah) return null;

    const translation = (english[String(ref.surah)] ?? [])
      .find((item) => item.id === ref.ayah)?.text
      ?.replace(/\s*﴾[\s\d٠-٩]+﴿\s*$/u, '')
      .trim() || '';

    const arabic = String(ayah.text ?? '')
      .replace(/^﻿/, '')
      .replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s+/u, '')
      .trim();

    return {
      arabic,
      ref: `${cleanSurahName(surah.name)} ${ref.ayah}`,
      trans: translation,
      surah: ref.surah,
      ayah: ref.ayah,
    };
  } catch {
    return null;
  }
}

export function getSeasonalAyahForDate(date: Date = new Date()): DailyAyah | null {
  const hijri = getHijriDate(date);
  const season = getCurrentSeason(hijri);
  if (!season) return null;

  const refs = SEASONAL_AYAH_REFS[season.type];
  if (!refs?.length) return null;

  const dayIndex = Math.max(0, season.currentDay - 1);
  const ref = refs[dayIndex % refs.length];
  return getAyahFromBundledQuran(ref) || null;
}

export function getFallbackDailyAyahForDate(date: Date = new Date()): DailyAyah {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfYear = Math.floor((current - start) / 86400000);
  return DAILY_AYAHS[((dayOfYear % DAILY_AYAHS.length) + DAILY_AYAHS.length) % DAILY_AYAHS.length];
}

/**
 * Ensure the verse carries the COMPLETE Uthmani text. Several sources
 * (`DAILY_AYAHS`, admin overrides) only store a short fragment of the verse,
 * which renders incompletely whenever the per-page QCF font fails to load
 * (notably on Android). Whenever surah/ayah are known we replace the fragment
 * with the full verse pulled from the bundled `quran-uthmani.json`.
 */
export function withFullArabic(base: DailyAyah): DailyAyah {
  if (base.surah > 0 && base.ayah > 0) {
    const full = getAyahFromBundledQuran({ surah: base.surah, ayah: base.ayah });
    if (full?.arabic) {
      return {
        ...base,
        arabic: full.arabic,
        trans: base.trans || full.trans,
        ref: base.ref || full.ref,
      };
    }
  }
  return base;
}

export interface ResolvedDailyVerse {
  ayah: DailyAyah;
  isOverride: boolean;
}

// ─── In-memory authoritative cache ───────────────────────────────────────────
// `resolveDailyVerse()` is the single source of truth, but it is async (Firestore
// override + AsyncStorage verse-pool). Once it has resolved for today we keep the
// result here so the synchronous first-paint seed (`resolveDailyVerseSync`) can
// return the IDENTICAL verse — eliminating the first-render verse swap. The cache
// is warmed early in the session by `prewarmDailyAyah()` and `updateWidgetData()`,
// both of which already call `resolveDailyVerse()`.
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
let resolvedCache: { key: string; result: ResolvedDailyVerse } | null = null;

/** Today's already-resolved verse if the async resolver has run this session. */
export function getCachedResolvedDailyVerse(date: Date = new Date()): ResolvedDailyVerse | null {
  return resolvedCache && resolvedCache.key === dateKey(date) ? resolvedCache.result : null;
}

/** Verse-pool entry for `date`, resolved synchronously (mirrors resolveDailyVerse step 3). */
function resolveVersePoolSync(date: Date): DailyAyah | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getVersePoolEntrySync } = require('@/lib/verse-pool');
    const entry = getVersePoolEntrySync(date);
    if (entry) {
      const base: DailyAyah = {
        arabic: entry.arabic,
        ref: `${entry.surahName} ${entry.ayahNumber}`,
        trans: entry.translation || '',
        surah: entry.surahNumber,
        ayah: entry.ayahNumber,
      };
      return withFullArabic(base);
    }
  } catch {}
  return null;
}

/**
 * Synchronous best-guess for the verse of the day — used for the first paint so
 * the screen never flashes a fragment, an empty card, or (the real bug) a verse
 * that the async resolver then swaps out. Selection order mirrors
 * {@link resolveDailyVerse} as closely as a sync call allows:
 *   0. Authoritative cache (today's async result — includes admin override)
 *   1. Seasonal verse
 *   2. Rotating verse pool (deterministic, fixed-seed — matches async step 3)
 *   3. Rolling `DAILY_AYAHS` fallback
 */
export function resolveDailyVerseSync(date: Date = new Date()): DailyAyah {
  const cached = getCachedResolvedDailyVerse(date);
  if (cached) return cached.ayah;
  try {
    const seasonal = getSeasonalAyahForDate(date);
    if (seasonal) return withFullArabic(seasonal);
  } catch {}
  const pooled = resolveVersePoolSync(date);
  if (pooled) return pooled;
  return withFullArabic(getFallbackDailyAyahForDate(date));
}

/**
 * Single source of truth for "Verse of the Day" across the in-app screen,
 * widgets and notifications. Selection order (must stay identical everywhere):
 *   1. Admin override (Firestore `dailyContent/ayah`)
 *   2. Seasonal verse (Ramadan, Dhul Hijjah, Hajj, Eid, …)
 *   3. Rotating verse pool
 *   4. Rolling `DAILY_AYAHS` fallback
 * The result always carries the complete Uthmani text.
 */
export async function resolveDailyVerse(date: Date = new Date()): Promise<ResolvedDailyVerse> {
  const result = await resolveDailyVerseUncached(date);
  // Warm the synchronous cache so the in-app screen's first paint matches this
  // authoritative result instead of guessing (and then visibly swapping).
  resolvedCache = { key: dateKey(date), result };
  return result;
}

async function resolveDailyVerseUncached(date: Date): Promise<ResolvedDailyVerse> {
  // 1. Admin override (required lazily to avoid a load-time Firebase cycle)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getDailyAyahOverride } = require('@/lib/daily-content-override');
    const ov = await getDailyAyahOverride();
    if (ov?.data && typeof ov.data.text === 'string') {
      const base: DailyAyah = {
        arabic: ov.data.text,
        ref: ov.data.surahName || '',
        trans: '',
        surah: Number(ov.data.surah) || 0,
        ayah: Number(ov.data.ayah) || 0,
      };
      return { ayah: withFullArabic(base), isOverride: true };
    }
  } catch {}

  // 2. Seasonal verse
  try {
    const seasonal = getSeasonalAyahForDate(date);
    if (seasonal) return { ayah: withFullArabic(seasonal), isOverride: false };
  } catch {}

  // 3. Rotating verse pool
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ensureVersePool, daysSinceSeed } = require('@/lib/verse-pool');
    const pool = await ensureVersePool();
    if (pool?.entries?.length) {
      const elapsed = Math.max(0, daysSinceSeed(pool));
      const idx = ((elapsed % pool.entries.length) + pool.entries.length) % pool.entries.length;
      const entry = pool.entries[idx];
      if (entry) {
        const base: DailyAyah = {
          arabic: entry.arabic,
          ref: `${entry.surahName} ${entry.ayahNumber}`,
          trans: entry.translation || '',
          surah: entry.surahNumber,
          ayah: entry.ayahNumber,
        };
        return { ayah: withFullArabic(base), isOverride: false };
      }
    }
  } catch {}

  // 4. Rolling fallback
  return { ayah: withFullArabic(getFallbackDailyAyahForDate(date)), isOverride: false };
}
