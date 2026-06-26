/**
 * Quran verse references for azkar entries
 * 
 * Maps azkar IDs to their Quran surah/ayah refs so we can render
 * them with QCF fonts in the Mushaf style.
 * 
 * Each entry can have multiple verse ranges (e.g. three surahs combined).
 */

export interface QuranRef {
  surah: number;
  startAyah: number;
  endAyah: number;
}

/**
 * Map of azkar ID → array of Quran references.
 * Only azkar that contain actual Quran text are listed here.
 */
export const AZKAR_QURAN_REFS: Record<number, QuranRef[]> = {
  // Ayat al-Kursi (morning) — Al-Baqarah 255
  1: [{ surah: 2, startAyah: 255, endAyah: 255 }],
  // Ayat al-Kursi (evening) — Al-Baqarah 255
  2: [{ surah: 2, startAyah: 255, endAyah: 255 }],

  // Ikhlas + Falaq + Nas (morning)
  3: [
    { surah: 112, startAyah: 1, endAyah: 4 },
    { surah: 113, startAyah: 1, endAyah: 5 },
    { surah: 114, startAyah: 1, endAyah: 6 },
  ],
  // Ikhlas + Falaq + Nas (evening)
  4: [
    { surah: 112, startAyah: 1, endAyah: 4 },
    { surah: 113, startAyah: 1, endAyah: 5 },
    { surah: 114, startAyah: 1, endAyah: 6 },
  ],

  // Sleep: 3 surahs blown in palms
  45: [
    { surah: 112, startAyah: 1, endAyah: 4 },
    { surah: 113, startAyah: 1, endAyah: 5 },
    { surah: 114, startAyah: 1, endAyah: 6 },
  ],

  // Sleep: Ayat al-Kursi
  46: [{ surah: 2, startAyah: 255, endAyah: 255 }],

  // Sleep: Al-Baqarah 285-286
  47: [{ surah: 2, startAyah: 285, endAyah: 286 }],

  // Evening: Al-Baqarah 285-286 (آخر آيتين من سورة البقرة)
  // id 291 (renumbered from 200 to resolve a duplicate-id collision with the
  // after-eating dua in category 70 — keep this in sync with azkar.json).
  291: [{ surah: 2, startAyah: 285, endAyah: 286 }],

  // Sleep: Al-Imran reference only (Sajdah + Mulk)
  56: [
    { surah: 32, startAyah: 1, endAyah: 3 },
    { surah: 67, startAyah: 1, endAyah: 3 },
  ],

  // Wakeup: Al-Imran 190-200
  61: [{ surah: 3, startAyah: 190, endAyah: 194 }],

  // Sujud al-tilawah: فتبارك الله أحسن الخالقين
  107: [{ surah: 23, startAyah: 14, endAyah: 14 }],

  // After prayer: 3 surahs
  127: [
    { surah: 112, startAyah: 1, endAyah: 4 },
    { surah: 113, startAyah: 1, endAyah: 5 },
    { surah: 114, startAyah: 1, endAyah: 6 },
  ],

  // After prayer: Ayat al-Kursi
  128: [{ surah: 2, startAyah: 255, endAyah: 255 }],

  // Istikhara dua (contains Quran)
  // 131 — has mixed text, not pure Quran so excluded from QCF

  // Al-Hadid 3 — هو الأول والآخر
  155: [{ surah: 57, startAyah: 3, endAyah: 3 }],

  // Travel: Zukhruf 13-14
  226: [{ surah: 43, startAyah: 13, endAyah: 14 }],
  227: [{ surah: 43, startAyah: 13, endAyah: 14 }],

  // Tawaf dua: Baqarah 201
  255: [{ surah: 2, startAyah: 201, endAyah: 201 }],

  // Sa'i: Baqarah 158
  256: [{ surah: 2, startAyah: 158, endAyah: 158 }],
};

/**
 * Check if an azkar entry has Quran verse references for QCF rendering.
 */
export function hasQuranRefs(azkarId: number): boolean {
  return azkarId in AZKAR_QURAN_REFS;
}

/**
 * Get Quran references for an azkar entry.
 */
export function getQuranRefs(azkarId: number): QuranRef[] | null {
  return AZKAR_QURAN_REFS[azkarId] ?? null;
}
