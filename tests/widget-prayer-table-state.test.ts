import { describe, expect, test } from 'vitest';

import {
  normalizePrayerKey,
  resolvePrayerTableState,
} from '@/lib/widget-prayer-table-state';
import type { WidgetPrayerData } from '@/lib/widget-data';

const basePrayer: WidgetPrayerData = {
  nextPrayer: 'dhuhr',
  nextPrayerName: 'Dhuhr',
  nextPrayerNameAr: 'الظهر',
  nextPrayerTime: '1:06 م',
  nextPrayerAtEpochMs: Date.parse('2026-06-01T10:06:00.000Z'),
  previousPrayerName: 'Isha',
  previousPrayerNameAr: 'العشاء',
  previousPrayerAtEpochMs: Date.parse('2026-06-01T04:00:00.000Z'),
  timeRemaining: '',
  timeRemainingMinutes: 0,
  timeRemainingLabel: '',
  allPrayers: [
    { name: 'Fajr', nameAr: 'الفجر', time: '4:20 ص', epochMs: Date.parse('2026-06-01T08:20:00.000Z'), isPassed: false, isNext: false },
    { name: 'Sunrise', nameAr: 'الشروق', time: '5:49 ص', epochMs: Date.parse('2026-06-01T09:49:00.000Z'), isPassed: false, isNext: false },
    { name: 'Dhuhr', nameAr: 'الظهر', time: '1:06 م', epochMs: Date.parse('2026-06-01T10:06:00.000Z'), isPassed: false, isNext: true },
    { name: 'Asr', nameAr: 'العصر', time: '4:59 م', epochMs: Date.parse('2026-06-01T13:59:00.000Z'), isPassed: false, isNext: false },
    { name: 'Maghrib', nameAr: 'المغرب', time: '8:24 م', epochMs: Date.parse('2026-06-01T17:24:00.000Z'), isPassed: false, isNext: false },
    { name: 'Isha', nameAr: 'العشاء', time: '9:54 م', epochMs: Date.parse('2026-06-01T18:54:00.000Z'), isPassed: false, isNext: false },
  ],
  allPrayerEpochs: [],
  hijriDate: '',
  hijriDay: 15,
  hijriMonth: 'ذو الحجة',
  hijriMonthEn: 'Dhu al-Hijjah',
  hijriYear: 1447,
  gregorianDate: '2026-06-01',
  location: 'Mountain View',
  lastUpdated: '2026-06-01T08:00:00.000Z',
};

describe('widget prayer table state', () => {
  test('epoch truth wins over stale isNext and stale nextPrayer fields', () => {
    const state = resolvePrayerTableState(basePrayer, Date.parse('2026-06-01T08:15:00.000Z'));

    expect(state.nextKey).toBe('fajr');
    expect(state.nextRow?.time).toBe('4:20 ص');
    expect(state.rows.filter((row) => row.isNext).map((row) => row.key)).toEqual(['fajr']);
    expect(state.rows.find((row) => row.key === 'dhuhr')?.isNext).toBe(false);
  });

  test('explicit next row is used when old data has no reliable epochs', () => {
    const prayerWithoutEpochs: WidgetPrayerData = {
      ...basePrayer,
      nextPrayer: 'dhuhr',
      nextPrayerName: 'Dhuhr',
      nextPrayerNameAr: 'الظهر',
      allPrayers: basePrayer.allPrayers.map((row) => ({
        ...row,
        epochMs: undefined,
        isNext: row.name === 'Fajr',
      })),
    };

    const state = resolvePrayerTableState(prayerWithoutEpochs, Date.parse('2026-06-01T08:15:00.000Z'));

    expect(state.nextKey).toBe('fajr');
    expect(state.rows.filter((row) => row.isNext).map((row) => row.key)).toEqual(['fajr']);
  });

  test('next-day fajr keeps the fajr row selected and uses nextPrayerTime when today row is stale or blank', () => {
    const nowMs = Date.parse('2026-06-01T22:00:00.000Z');
    const tomorrowFajrMs = Date.parse('2026-06-02T08:20:00.000Z');
    const prayerAfterIsha: WidgetPrayerData = {
      ...basePrayer,
      nextPrayer: 'fajr',
      nextPrayerName: 'Fajr',
      nextPrayerNameAr: 'الفجر',
      nextPrayerTime: '4:20 ص',
      nextPrayerAtEpochMs: tomorrowFajrMs,
      allPrayers: basePrayer.allPrayers.map((row) => ({
        ...row,
        time: row.name === 'Fajr' ? '' : row.time,
        epochMs: (row.epochMs ?? 0) - 24 * 60 * 60 * 1000,
        isPassed: true,
        isNext: row.name === 'Fajr',
      })),
    };

    const state = resolvePrayerTableState(prayerAfterIsha, nowMs);

    expect(state.nextKey).toBe('fajr');
    expect(state.nextEpochMs).toBe(tomorrowFajrMs);
    expect(state.nextRow?.time).toBe('4:20 ص');
    expect(state.rows.find((row) => row.key === 'fajr')?.isNext).toBe(true);
  });

  test('before fajr uses yesterday isha epoch for the previous countdown', () => {
    const nowMs = Date.parse('2026-06-02T01:25:00.000Z');
    const yesterdayIshaMs = Date.parse('2026-06-01T21:53:00.000Z');
    const todayFajrMs = Date.parse('2026-06-02T04:20:00.000Z');
    const prayerBeforeFajr: WidgetPrayerData = {
      ...basePrayer,
      nextPrayer: 'fajr',
      nextPrayerName: 'Fajr',
      nextPrayerNameAr: 'الفجر',
      nextPrayerTime: '4:20 ص',
      nextPrayerAtEpochMs: todayFajrMs,
      previousPrayerName: 'Isha',
      previousPrayerNameAr: 'العشاء',
      previousPrayerAtEpochMs: yesterdayIshaMs,
      allPrayers: basePrayer.allPrayers.map((row) => ({
        ...row,
        epochMs: row.name === 'Fajr'
          ? todayFajrMs
          : Date.parse(`2026-06-02T${{
              Sunrise: '05:49',
              Dhuhr: '13:06',
              Asr: '16:59',
              Maghrib: '20:24',
              Isha: '21:53',
            }[row.name] ?? '04:20'}:00.000Z`),
        isPassed: false,
        isNext: row.name === 'Fajr',
      })),
      allPrayerEpochs: [
        yesterdayIshaMs,
        todayFajrMs,
      ],
    };

    const state = resolvePrayerTableState(prayerBeforeFajr, nowMs);

    expect(state.previousKey).toBe('isha');
    expect(state.previousEpochMs).toBe(yesterdayIshaMs);
  });

  test('normalizes Arabic and English prayer names to the same keys', () => {
    expect(normalizePrayerKey('الفجر')).toBe('fajr');
    expect(normalizePrayerKey('الشروق')).toBe('sunrise');
    expect(normalizePrayerKey('Jumuah')).toBe('dhuhr');
    expect(normalizePrayerKey('العشاء')).toBe('isha');
  });
});
