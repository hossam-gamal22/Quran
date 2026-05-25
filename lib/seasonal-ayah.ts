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
