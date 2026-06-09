import { describe, it, expect } from 'vitest';
import { resolvePrayerTableState, nextPrayerStaticState } from '../widget-prayer-table-state';

// Regression for the reported Android widget bug: the prayer NAME / highlighted
// row froze on "الفجر" (the day's first prayer) while the live time + countdown
// correctly advanced to Sunrise, then Dhuhr. Cause: the baked PNG name came from
// the stale `nextPrayer`/`nextPrayerNameAr` string, but the time overlay came
// from the epoch list. The fix relies on BOTH the time AND the
// name/template-selection deriving from `resolvePrayerTableState` (epoch-based),
// so these tests lock the rule "next/previous follow the epochs, not the stale
// string".
describe('resolvePrayerTableState — stale next-prayer name, clock has advanced', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;
  const todayMidnight = Date.UTC(2026, 5, 4, 0, 0, 0); // Thursday — not Friday
  const at = (dayOffset: number, h: number, m: number) =>
    todayMidnight + dayOffset * DAY + h * HOUR + m * 60 * 1000;

  const todayTimes = {
    fajr: at(0, 4, 11),
    sunrise: at(0, 5, 38),
    dhuhr: at(0, 12, 19),
    asr: at(0, 15, 36),
    maghrib: at(0, 19, 0),
    isha: at(0, 20, 30),
  };

  // Data was prepared in the early morning (before Fajr), so the stale strings
  // still say the next prayer is Fajr — but the absolute epochs are correct.
  const staleFajr = {
    nextPrayer: 'fajr',
    nextPrayerNameAr: 'الفجر',
    nextPrayerName: 'Fajr',
    nextPrayerAtEpochMs: todayTimes.fajr,
    previousPrayerNameAr: 'العشاء',
    previousPrayerName: 'Isha',
    allPrayers: [
      { name: 'Fajr', nameAr: 'الفجر', time: '4:11', epochMs: todayTimes.fajr, isPassed: false, isNext: true },
      { name: 'Sunrise', nameAr: 'الشروق', time: '5:38', epochMs: todayTimes.sunrise, isPassed: false, isNext: false },
      { name: 'Dhuhr', nameAr: 'الظهر', time: '12:19', epochMs: todayTimes.dhuhr, isPassed: false, isNext: false },
      { name: 'Asr', nameAr: 'العصر', time: '3:36', epochMs: todayTimes.asr, isPassed: false, isNext: false },
      { name: 'Maghrib', nameAr: 'المغرب', time: '7:00', epochMs: todayTimes.maghrib, isPassed: false, isNext: false },
      { name: 'Isha', nameAr: 'العشاء', time: '8:30', epochMs: todayTimes.isha, isPassed: false, isNext: false },
    ],
    allPrayerEpochs: Object.values(todayTimes),
  } as any;

  it('between Fajr and Sunrise → next is Sunrise, previous is Fajr (not the stale Fajr/Isha)', () => {
    const now = at(0, 5, 19); // after Fajr 4:11, before Sunrise 5:38
    const state = resolvePrayerTableState(staleFajr, now);
    expect(state.nextKey).toBe('sunrise');
    expect(state.nextRow?.nameAr).toBe('الشروق');
    expect(state.nextEpochMs).toBe(todayTimes.sunrise);
    expect(state.previousRow?.nameAr).toBe('الفجر');
    // The per-state template picker must select 'sunrise' too.
    expect(nextPrayerStaticState(staleFajr, now)).toBe('sunrise');
  });

  it('mid-morning after Sunrise → next is Dhuhr, previous is Sunrise (the Dhuhr screenshot case)', () => {
    const now = at(0, 11, 1); // after Sunrise 5:38, before Dhuhr 12:19 — name was still "الفجر"
    const state = resolvePrayerTableState(staleFajr, now);
    expect(state.nextKey).toBe('dhuhr');
    expect(state.nextRow?.nameAr).toBe('الظهر');
    expect(state.nextEpochMs).toBe(todayTimes.dhuhr);
    expect(state.previousRow?.nameAr).toBe('الشروق');
    expect(nextPrayerStaticState(staleFajr, now)).toBe('dhuhr');
  });

  it('the highlighted row tracks the resolved next prayer, not the stale isNext flag', () => {
    const now = at(0, 11, 1);
    const state = resolvePrayerTableState(staleFajr, now);
    const highlighted = state.rows.filter((r) => r.isNext);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]?.key).toBe('dhuhr');
  });
});
