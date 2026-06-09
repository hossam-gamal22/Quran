import { describe, expect, test, vi } from 'vitest';

// Stub expo-localization so importing the helper doesn't pull in expo-modules-core
// (which references the RN-only __DEV__ global). The pure formatters under test
// don't touch the device API; deviceUses24Hour's native path is covered on-device.
vi.mock('expo-localization', () => ({ getCalendars: () => [{ uses24hourClock: true }] }));

import { formatClockHHMM } from '@/lib/widget-clock-format';
import { formatEpochTimeInTimeZone } from '@/lib/widget-timezone';

describe('widget device clock format', () => {
  test('formatClockHHMM honours 24-hour (zero-padded, no AM/PM)', () => {
    expect(formatClockHHMM(new Date(2026, 0, 1, 13, 0), true)).toBe('13:00');
    expect(formatClockHHMM(new Date(2026, 0, 1, 1, 5), true)).toBe('01:05');
    expect(formatClockHHMM(new Date(2026, 0, 1, 0, 0), true)).toBe('00:00');
  });

  test('formatClockHHMM honours 12-hour (no leading zero, no AM/PM)', () => {
    expect(formatClockHHMM(new Date(2026, 0, 1, 13, 0), false)).toBe('1:00');
    expect(formatClockHHMM(new Date(2026, 0, 1, 0, 0), false)).toBe('12:00');
    expect(formatClockHHMM(new Date(2026, 0, 1, 9, 7), false)).toBe('9:07');
  });

  test('formatEpochTimeInTimeZone: 24h drops the AM/PM suffix', () => {
    // 13:30 UTC in UTC zone.
    const epoch = Date.UTC(2026, 0, 1, 13, 30);
    expect(formatEpochTimeInTimeZone(epoch, 'UTC', 'en', true)).toBe('13:30');
    expect(formatEpochTimeInTimeZone(epoch, 'UTC', 'ar', true)).toBe('13:30');
  });

  test('formatEpochTimeInTimeZone: 12h keeps AM/PM (EN) and ص/م (AR)', () => {
    const pm = Date.UTC(2026, 0, 1, 13, 30);
    const am = Date.UTC(2026, 0, 1, 6, 5);
    expect(formatEpochTimeInTimeZone(pm, 'UTC', 'en', false)).toBe('1:30 PM');
    expect(formatEpochTimeInTimeZone(pm, 'UTC', 'ar', false)).toBe('1:30 م');
    expect(formatEpochTimeInTimeZone(am, 'UTC', 'en', false)).toBe('6:05 AM');
    expect(formatEpochTimeInTimeZone(am, 'UTC', 'ar', false)).toBe('6:05 ص');
  });

  test('formatEpochTimeInTimeZone defaults to 12h when use24Hour omitted (back-compat)', () => {
    const pm = Date.UTC(2026, 0, 1, 13, 30);
    expect(formatEpochTimeInTimeZone(pm, 'UTC', 'en')).toBe('1:30 PM');
  });
});
