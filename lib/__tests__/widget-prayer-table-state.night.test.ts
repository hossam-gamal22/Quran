import { describe, it, expect } from 'vitest';
import { resolvePrayerTableState } from '../widget-prayer-table-state';

// Regression for the first-placement night bug: when every one of today's
// prayers has passed and the cached data still flags a PAST prayer (Maghrib) as
// `isNext` with a past `nextPrayerAtEpochMs`, the resolver must use the next
// FUTURE epoch from `allPrayerEpochs` (tomorrow's Fajr) instead of the stale
// fields — otherwise the widget shows "المغرب … بعد 0 ث".
describe('resolvePrayerTableState — all-of-today-passed (night) stale data', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;
  // Pick a fixed "today" midnight and build epochs around it.
  const todayMidnight = Date.UTC(2026, 5, 3, 0, 0, 0); // arbitrary fixed day
  const at = (dayOffset: number, h: number, m: number) => todayMidnight + dayOffset * DAY + h * HOUR + m * 60 * 1000;

  const todayTimes = {
    fajr: at(0, 4, 11),
    sunrise: at(0, 5, 38),
    dhuhr: at(0, 12, 19),
    asr: at(0, 15, 36),
    maghrib: at(0, 19, 0),
    isha: at(0, 20, 30),
  };
  const tomorrowFajr = at(1, 4, 11);
  const now = at(0, 22, 0); // 10pm — after Isha, everything today is past

  const stale = {
    // Cached data still says Maghrib is next (from the early evening).
    nextPrayer: 'maghrib',
    nextPrayerNameAr: 'المغرب',
    nextPrayerAtEpochMs: todayTimes.maghrib, // PAST relative to `now`
    allPrayers: [
      { name: 'Fajr', nameAr: 'الفجر', time: '4:11', epochMs: todayTimes.fajr, isPassed: true, isNext: false },
      { name: 'Sunrise', nameAr: 'الشروق', time: '5:38', epochMs: todayTimes.sunrise, isPassed: true, isNext: false },
      { name: 'Dhuhr', nameAr: 'الظهر', time: '12:19', epochMs: todayTimes.dhuhr, isPassed: true, isNext: false },
      { name: 'Asr', nameAr: 'العصر', time: '3:36', epochMs: todayTimes.asr, isPassed: true, isNext: false },
      { name: 'Maghrib', nameAr: 'المغرب', time: '7:00', epochMs: todayTimes.maghrib, isPassed: false, isNext: true },
      { name: 'Isha', nameAr: 'العشاء', time: '8:30', epochMs: todayTimes.isha, isPassed: true, isNext: false },
    ],
    allPrayerEpochs: [...Object.values(todayTimes), tomorrowFajr],
  } as any;

  it('resolves next to tomorrow Fajr (future epoch), not stale past Maghrib', () => {
    const state = resolvePrayerTableState(stale, now);
    expect(state.nextKey).toBe('fajr');
    expect(state.nextEpochMs).toBe(tomorrowFajr);
    // The countdown must target a FUTURE epoch (never "بعد 0 ث").
    expect((state.nextEpochMs ?? 0) > now).toBe(true);
    // E (gallery): resolvePreviewPrayerItem returns this nextRow, so its NAME
    // must be Fajr — not the stale Maghrib that the old epoch-lookup produced.
    expect(state.nextRow?.nameAr).toBe('الفجر');
    expect(state.previousRow?.nameAr).toBe('العشاء');
  });
});
