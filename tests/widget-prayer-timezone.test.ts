import { describe, expect, test } from 'vitest';

import {
  buildCanonicalPrayerSnapshot,
} from '@/lib/canonical-prayer-snapshot';
import {
  getNextPrayer,
  getTimeRemaining,
  isPrayerPassed,
  type PrayerSettings,
  type PrayerTimes,
} from '@/lib/prayer-times';
import { preparePrayerWidgetData } from '@/lib/widget-data';
import {
  formatEpochTimeInTimeZone,
} from '@/lib/widget-timezone';
import {
  computeFlatSnapshot,
  type PrayerWidgetInputs,
} from '@/lib/widget-prayer-calculator';
import { calculateLocalPrayerTimes } from '@/lib/country-prayer-defaults';

const mountainViewTimes: PrayerTimes = {
  fajr: '03:55',
  sunrise: '05:49',
  dhuhr: '13:06',
  asr: '16:59',
  maghrib: '20:24',
  isha: '21:54',
  midnight: '00:40',
  lastThird: '02:25',
};

const settings: Pick<PrayerSettings, 'calculationMethod' | 'asrJuristic' | 'adjustments'> = {
  calculationMethod: 2,
  asrJuristic: 0,
  adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
};

describe('widget prayer timezone contract', () => {
  test('canonical snapshot resolves next prayer in the location timezone', () => {
    const snapshot = buildCanonicalPrayerSnapshot({
      times: mountainViewTimes,
      location: { latitude: 37.3861, longitude: -122.0839, city: 'Mountain View', country: 'United States' },
      locationName: 'Mountain View, United States',
      settings,
      source: 'live',
      timezone: 'America/Los_Angeles',
      date: new Date('2026-06-01T10:47:00.000Z'),
    });

    expect(snapshot.timezone).toBe('America/Los_Angeles');
    expect(snapshot.nextPrayerName).toBe('fajr');
    expect(new Date(snapshot.nextPrayerAtEpochMs).toISOString()).toBe('2026-06-01T10:55:00.000Z');
    expect(new Date(snapshot.asrAtEpochMs).toISOString()).toBe('2026-06-01T23:59:00.000Z');
  });

  test('widget time formatter displays location wall-clock time, not device timezone time', () => {
    const fajrEpoch = Date.parse('2026-06-01T10:55:00.000Z');
    const asrEpoch = Date.parse('2026-06-01T23:59:00.000Z');

    expect(formatEpochTimeInTimeZone(fajrEpoch, 'America/Los_Angeles', 'ar')).toBe('3:55 ص');
    expect(formatEpochTimeInTimeZone(asrEpoch, 'America/Los_Angeles', 'ar')).toBe('4:59 م');
    expect(formatEpochTimeInTimeZone(fajrEpoch, 'America/Los_Angeles', 'en')).toBe('3:55 AM');
  });

  test('shared widget data uses canonical next prayer instead of recalculating in the device timezone', async () => {
    const snapshot = buildCanonicalPrayerSnapshot({
      times: mountainViewTimes,
      location: { latitude: 37.3861, longitude: -122.0839, city: 'Mountain View', country: 'United States' },
      locationName: 'Mountain View, United States',
      settings,
      source: 'live',
      timezone: 'America/Los_Angeles',
      date: new Date('2026-06-01T10:47:00.000Z'),
    });

    const data = await preparePrayerWidgetData(
      mountainViewTimes,
      'Mountain View, United States',
      'ar',
      snapshot,
    );

    expect(data.nextPrayer).toBe('fajr');
    expect(data.nextPrayerNameAr).toBe('الفجر');
    expect(data.nextPrayerTime).toBe('3:55 ص');
    expect(data.timeRemainingMinutes).toBeGreaterThanOrEqual(0);
    expect(data.allPrayers.find((p) => p.name === 'Fajr')?.isNext).toBe(true);
  });

  test('offline adhan epochs keep the next prayer aligned when device and prayer-location timezones differ', () => {
    const inputs: PrayerWidgetInputs = {
      version: 1,
      latitude: 37.3861,
      longitude: -122.0839,
      timezone: 'America/Los_Angeles',
      calculationMethod: 2,
      madhab: 'shafi',
      timeFormat: '12h',
      numerals: 'western',
      writtenAt: '2026-06-01T00:19:00.000Z',
    };

    // 04:19 in Asia/Dubai, but 17:19 on the previous calendar day at the
    // selected Mountain View prayer location. The next prayer there is Maghrib.
    const now = new Date('2026-06-01T00:19:00.000Z');
    const snapshot = computeFlatSnapshot(inputs, now, 7);
    const firstFutureEpoch = snapshot.allPrayerEpochs.find((epochMs) => epochMs > now.getTime());

    expect(snapshot.date).toBe('2026-05-31');
    expect(snapshot.next).toBe('maghrib');
    expect(firstFutureEpoch).toBe(snapshot.nextAtEpochMs);
    expect(formatEpochTimeInTimeZone(snapshot.nextAtEpochMs, inputs.timezone, 'ar')).toBe('8:23 م');
  });

  test('offline adhan moves from isha to next-day fajr after isha has passed', () => {
    const inputs: PrayerWidgetInputs = {
      version: 1,
      latitude: 37.3861,
      longitude: -122.0839,
      timezone: 'America/Los_Angeles',
      calculationMethod: 2,
      madhab: 'shafi',
      timeFormat: '12h',
      numerals: 'western',
      writtenAt: '2026-06-01T05:30:00.000Z',
    };

    const now = new Date('2026-06-01T05:30:00.000Z'); // 22:30 on May 31 in Mountain View
    const snapshot = computeFlatSnapshot(inputs, now, 7);

    expect(snapshot.next).toBe('fajr');
    expect(snapshot.nextAtEpochMs).toBeGreaterThan(now.getTime());
    expect(formatEpochTimeInTimeZone(snapshot.nextAtEpochMs, inputs.timezone, 'ar')).toMatch(/ص$/);
  });

  test('provider calibration keeps the offline widget aligned with the API-backed minute', () => {
    const inputs: PrayerWidgetInputs = {
      version: 1,
      latitude: 37.3861,
      longitude: -122.0839,
      timezone: 'America/Los_Angeles',
      calculationMethod: 2,
      madhab: 'shafi',
      timeFormat: '12h',
      numerals: 'western',
      providerCalibration: { maghrib: 1 },
      writtenAt: '2026-06-01T00:19:00.000Z',
    };

    const snapshot = computeFlatSnapshot(inputs, new Date('2026-06-01T00:19:00.000Z'), 7);

    expect(snapshot.next).toBe('maghrib');
    expect(formatEpochTimeInTimeZone(snapshot.nextAtEpochMs, inputs.timezone, 'ar')).toBe('8:24 م');
  });

  test('app prayer helpers switch from fajr to sunrise using the prayer-location timezone', () => {
    const exampleTimes = { ...mountainViewTimes, fajr: '04:20' };
    const fiveMinutesBeforeFajr = new Date('2026-06-01T11:15:00.000Z'); // 04:15 in America/Los_Angeles
    const oneMinuteAfterFajr = new Date('2026-06-01T11:21:00.000Z'); // 04:21 in America/Los_Angeles
    const beforeFajr = new Date('2026-06-01T10:50:00.000Z'); // 03:50 in America/Los_Angeles
    const afterFajr = new Date('2026-06-01T10:56:00.000Z'); // 03:56 in America/Los_Angeles

    expect(getNextPrayer(exampleTimes, {
      timezone: 'America/Los_Angeles',
      now: fiveMinutesBeforeFajr,
    })?.name).toBe('fajr');
    expect(getTimeRemaining(exampleTimes, {
      timezone: 'America/Los_Angeles',
      now: fiveMinutesBeforeFajr,
    })?.totalSeconds).toBe(5 * 60);
    expect(getNextPrayer(exampleTimes, {
      timezone: 'America/Los_Angeles',
      now: oneMinuteAfterFajr,
    })?.name).toBe('sunrise');

    const beforeNext = getNextPrayer(mountainViewTimes, {
      timezone: 'America/Los_Angeles',
      now: beforeFajr,
    });
    const beforeRemaining = getTimeRemaining(mountainViewTimes, {
      timezone: 'America/Los_Angeles',
      now: beforeFajr,
    });

    expect(beforeNext?.name).toBe('fajr');
    expect(beforeRemaining?.totalSeconds).toBe(5 * 60);
    expect(isPrayerPassed(mountainViewTimes.fajr, {
      timezone: 'America/Los_Angeles',
      now: beforeFajr,
    })).toBe(false);

    const afterNext = getNextPrayer(mountainViewTimes, {
      timezone: 'America/Los_Angeles',
      now: afterFajr,
    });

    expect(afterNext?.name).toBe('sunrise');
    expect(isPrayerPassed(mountainViewTimes.fajr, {
      timezone: 'America/Los_Angeles',
      now: afterFajr,
    })).toBe(true);
  });

  test('after isha, next prayer uses tomorrow fajr instead of reusing today fajr', () => {
    const afterIsha = new Date('2026-06-02T05:00:00.000Z'); // 22:00 in America/Los_Angeles
    const timesWithTomorrow = { ...mountainViewTimes, tomorrowFajr: '03:50' };

    const next = getNextPrayer(timesWithTomorrow, {
      timezone: 'America/Los_Angeles',
      now: afterIsha,
    });

    expect(next?.name).toBe('fajr');
    expect(next?.time).toBe('03:50');
    expect(new Date(next!.epochMs!).toISOString()).toBe('2026-06-02T10:50:00.000Z');

    const snapshot = buildCanonicalPrayerSnapshot({
      times: timesWithTomorrow,
      location: { latitude: 37.3861, longitude: -122.0839, city: 'Mountain View', country: 'United States' },
      locationName: 'Mountain View, United States',
      settings,
      source: 'live',
      timezone: 'America/Los_Angeles',
      date: afterIsha,
    });

    expect(snapshot.nextPrayerName).toBe('fajr');
    expect(new Date(snapshot.nextPrayerAtEpochMs).toISOString()).toBe('2026-06-02T10:50:00.000Z');
  });

  test('visible device wall clock drives the displayed next prayer and countdown', async () => {
    const displayTimezone = 'Asia/Dubai';
    const exampleTimes = { ...mountainViewTimes, fajr: '04:20', tomorrowFajr: '04:19' };
    const fiveMinutesBeforeFajr = new Date('2026-06-01T00:15:00.000Z'); // 04:15 on the phone
    const oneMinuteAfterFajr = new Date('2026-06-01T00:21:00.000Z'); // 04:21 on the phone
    const nineAm = new Date('2026-06-01T05:00:00.000Z'); // 09:00 on the phone

    expect(getNextPrayer(exampleTimes, { timezone: displayTimezone, now: fiveMinutesBeforeFajr })?.name).toBe('fajr');
    expect(getTimeRemaining(exampleTimes, { timezone: displayTimezone, now: fiveMinutesBeforeFajr })?.totalSeconds).toBe(5 * 60);
    expect(getNextPrayer(exampleTimes, { timezone: displayTimezone, now: oneMinuteAfterFajr })?.name).toBe('sunrise');
    expect(getNextPrayer(exampleTimes, { timezone: displayTimezone, now: nineAm })?.name).toBe('dhuhr');

    const canonical = buildCanonicalPrayerSnapshot({
      times: exampleTimes,
      location: { latitude: 37.3861, longitude: -122.0839, city: 'Mountain View', country: 'United States' },
      locationName: 'Mountain View, United States',
      settings,
      source: 'live',
      timezone: displayTimezone,
      date: fiveMinutesBeforeFajr,
    });
    const widgetData = await preparePrayerWidgetData(exampleTimes, 'Mountain View, United States', 'ar', canonical);

    expect(widgetData.nextPrayer).toBe('fajr');
    expect(widgetData.nextPrayerTime).toBe('4:20 ص');
  });

  test('offline adhan composes the calculation-location clock onto the visible phone day', () => {
    const inputs: PrayerWidgetInputs = {
      version: 1,
      latitude: 37.785834,
      longitude: -122.406417,
      timezone: 'Asia/Dubai',
      calculationTimezone: 'America/Los_Angeles',
      calculationMethod: 2,
      madhab: 'shafi',
      timeFormat: '12h',
      numerals: 'western',
      writtenAt: '2026-06-01T07:22:00.000Z',
    };
    const phoneAtElevenTwentyTwo = new Date('2026-06-01T07:22:00.000Z');
    const snapshot = computeFlatSnapshot(inputs, phoneAtElevenTwentyTwo, 7);

    expect(snapshot.next).toBe('dhuhr');
    expect(formatEpochTimeInTimeZone(snapshot.nextAtEpochMs, inputs.timezone, 'ar')).toBe('1:09 م');
    expect(Object.values(snapshot.todayTimes).map((epochMs) =>
      formatEpochTimeInTimeZone(epochMs, inputs.timezone, 'ar')
    )).toEqual(['4:20 ص', '5:49 ص', '1:09 م', '5:01 م', '8:26 م', '9:56 م']);

    expect(calculateLocalPrayerTimes(
      inputs.latitude,
      inputs.longitude,
      phoneAtElevenTwentyTwo,
      inputs.calculationMethod,
      0,
      inputs.calculationTimezone,
    ).dhuhr).toBe('13:09');
  });

  test('offline adhan keeps producing a valid seven-day widget schedule after a year without opening the app', () => {
    const inputs: PrayerWidgetInputs = {
      version: 1,
      latitude: 37.3861,
      longitude: -122.0839,
      timezone: 'Asia/Dubai',
      calculationTimezone: 'America/Los_Angeles',
      calculationMethod: 2,
      madhab: 'shafi',
      timeFormat: '12h',
      numerals: 'western',
      writtenAt: '2026-06-01T06:00:00.000Z',
    };
    const oneYearLater = new Date('2027-06-01T06:00:00.000Z'); // 10:00 on the phone

    const snapshot = computeFlatSnapshot(inputs, oneYearLater, 7);

    expect(snapshot.date).toBe('2027-06-01');
    expect(snapshot.allPrayerEpochs).toHaveLength(7 * 6);
    expect(snapshot.nextAtEpochMs).toBeGreaterThan(oneYearLater.getTime());
    expect(snapshot.allPrayerEpochs.some((epochMs) => epochMs === snapshot.nextAtEpochMs)).toBe(true);
    expect(snapshot.next).toBe('dhuhr');
  });
});
