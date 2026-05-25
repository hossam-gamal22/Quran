// Resolves "quran:SURAH:AYAH-RANGE" audio markers from azkar.json into per-ayah
// AudioTrack entries that play through the existing global Azkar queue.
//
// Marker format: "quran:S:A" (single ayah) or "quran:S:A-B" (range).
// Example: "quran:2:285-286" → last two ayahs of Al-Baqarah.
//
// Audio URLs are built via getAyahAudioUrl() from lib/quran-cache so we
// inherit user reciter, CDN selection (alquran.cloud / everyayah), and
// bitrate without re-implementing reciter logic here.

import type { AudioTrack } from '@/contexts/GlobalAudioContext';
import { getAyahAudioUrl } from '@/lib/quran-cache';

// Cumulative count of ayahs in surahs 1..N-1 (so SURAH_OFFSETS[N-1] gives the
// global ayah number just before surah N starts). Index 0 = before Al-Fatiha = 0.
// Source: standard Mushaf ayah counts (https://api.alquran.cloud/v1/meta).
const SURAH_AYAH_COUNTS: readonly number[] = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

const SURAH_OFFSETS: readonly number[] = (() => {
  const arr: number[] = [0];
  let acc = 0;
  for (const c of SURAH_AYAH_COUNTS) {
    acc += c;
    arr.push(acc);
  }
  return arr;
})();

export function isQuranAudioMarker(audio: string | undefined | null): boolean {
  return !!audio && audio.startsWith('quran:');
}

/**
 * Parse "quran:SURAH:A" or "quran:SURAH:A-B" into a list of (surah, ayah, global) tuples.
 * Returns [] if the marker is malformed.
 */
function parseMarker(
  marker: string,
): Array<{ surah: number; ayah: number; globalAyah: number }> {
  const parts = marker.split(':');
  if (parts.length !== 3 || parts[0] !== 'quran') return [];
  const surah = Number(parts[1]);
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return [];
  const range = parts[2];
  let start: number, end: number;
  if (range.includes('-')) {
    const [a, b] = range.split('-').map((s) => Number(s));
    if (!Number.isInteger(a) || !Number.isInteger(b)) return [];
    start = Math.min(a, b);
    end = Math.max(a, b);
  } else {
    start = end = Number(range);
    if (!Number.isInteger(start)) return [];
  }
  const maxAyah = SURAH_AYAH_COUNTS[surah - 1] ?? 0;
  if (start < 1 || end > maxAyah) return [];
  const offset = SURAH_OFFSETS[surah - 1];
  const out: Array<{ surah: number; ayah: number; globalAyah: number }> = [];
  for (let a = start; a <= end; a++) {
    out.push({ surah, ayah: a, globalAyah: offset + a });
  }
  return out;
}

/**
 * Expand a single zikr's quran: marker into one AudioTrack per ayah.
 * Each track plays via the standard Azkar queue (sticky player, auto-advance).
 */
export function expandQuranAudioMarker(
  zikrId: string | number,
  marker: string,
  reciterIdentifier: string,
  surahNameAr: string,
  subtitle: string,
  categoryId: string,
): AudioTrack[] {
  const verses = parseMarker(marker);
  if (verses.length === 0) return [];
  const tracks: AudioTrack[] = [];
  for (const v of verses) {
    let url = '';
    try {
      url = getAyahAudioUrl(reciterIdentifier, v.globalAyah, v.surah, v.ayah);
    } catch {
      continue;
    }
    tracks.push({
      id: `${zikrId}-q-${v.surah}-${v.ayah}`,
      title: `${surahNameAr} — آية ${v.ayah}`,
      subtitle,
      url,
      categoryId,
    });
  }
  return tracks;
}

// Common surah Arabic names used by adhkar (extend as needed).
export const SURAH_NAMES_AR: Readonly<Record<number, string>> = {
  1: 'الفاتحة',
  2: 'البقرة',
  3: 'آل عمران',
  18: 'الكهف',
  36: 'يس',
  55: 'الرحمن',
  56: 'الواقعة',
  67: 'الملك',
  112: 'الإخلاص',
  113: 'الفلق',
  114: 'الناس',
};

export function getSurahArabicName(surah: number): string {
  return SURAH_NAMES_AR[surah] || `سورة ${surah}`;
}

export function getGlobalAyahNumber(surah: number, ayah: number): number | null {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return null;
  const maxAyah = SURAH_AYAH_COUNTS[surah - 1] ?? 0;
  if (!Number.isInteger(ayah) || ayah < 1 || ayah > maxAyah) return null;
  return SURAH_OFFSETS[surah - 1] + ayah;
}
