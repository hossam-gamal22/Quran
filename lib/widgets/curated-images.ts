// Selection logic for the bundled, Arabic-only curated widget images
// (verseOfDay / azkarMorning / azkarEvening / dailyDhikr).
//
// The actual image data (static require()s + per-type counts) lives in the
// generated curated-images-index.ts. This file only decides WHICH image to
// show for a given date/time. The exact formulas here are mirrored 1:1 in
// widgets/ios/CuratedWidgetImages.swift so both platforms always agree.

import {
  CURATED_IMAGE_SETS,
  CURATED_IMAGE_COUNTS,
  type CuratedImageType,
} from './curated-images-index';
import { getHijriDate } from '../hijri-date';

// Hajj-themed verse overrides keyed by Hijri (month, day). The first two days of
// Dhul-Hijjah (month 12) always show the two Hajj-related verses regardless of
// the normal day-of-year rotation. Index is 0-based into CURATED_VERSE_IMAGES
// (verse-080 → 79, verse-081 → 80).
const VERSE_HIJRI_OVERRIDES: Record<string, number> = {
  '12-1': 79, // أول يوم ذي الحجة → verse-080
  '12-2': 80, // ثاني يوم ذي الحجة → verse-081
};

export type CuratedWidgetId = 'verseOfDay' | 'azkarMorning' | 'azkarEvening' | 'dailyDhikr';

const ID_TO_TYPE: Record<CuratedWidgetId, CuratedImageType> = {
  verseOfDay: 'verse',
  azkarMorning: 'morning',
  azkarEvening: 'evening',
  dailyDhikr: 'daily',
};

export function isCuratedWidget(id: string): id is CuratedWidgetId {
  return id === 'verseOfDay' || id === 'azkarMorning' || id === 'azkarEvening' || id === 'dailyDhikr';
}

/** 1-based day of the year (local time). Mirrors verse-pool.ts dayOfYear. */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

/** 5-minute slot of the day (0, 1, 2, …). Azkar walk the set in order, one new
 *  dhikr every 5 minutes. */
function fiveMinuteSlot(date: Date): number {
  return Math.floor((date.getHours() * 60 + date.getMinutes()) / 5);
}

/** Pick the image index for a curated widget at a given moment. */
export function curatedImageIndex(id: CuratedWidgetId, date: Date = new Date()): number {
  const type = ID_TO_TYPE[id];
  const count = CURATED_IMAGE_COUNTS[type];
  if (count <= 0) return 0;
  const doy = dayOfYear(date);
  switch (type) {
    case 'verse': {
      // Hajj-day override (1st/2nd of Dhul-Hijjah) takes precedence.
      try {
        const h = getHijriDate(date);
        const override = VERSE_HIJRI_OVERRIDES[`${h.month}-${h.day}`];
        if (override !== undefined && override < count) return override;
      } catch {
        // Hijri conversion failed — fall through to the normal rotation.
      }
      return (doy - 1 + count) % count;
    }
    case 'daily':
      // +137 offset so the daily dhikr never lines up with the verse index.
      return (doy - 1 + 137 + count) % count;
    case 'morning':
    case 'evening':
      // Sequential: a new dhikr every 5 minutes, looping through the set.
      return (fiveMinuteSlot(date) % count + count) % count;
  }
}

/** Return the require()'d image source for a curated widget at a given moment. */
export function curatedImageSource(id: CuratedWidgetId, date: Date = new Date()): number {
  const type = ID_TO_TYPE[id];
  return CURATED_IMAGE_SETS[type][curatedImageIndex(id, date)];
}
