import { describe, it, expect } from 'vitest';
import {
  formatPrayerDurationCompact,
  formatPrayerDurationWithPrefix,
  truncateEpochToMinute,
  SIN_MINUTE_GAP,
} from '../widget-format-duration';

// Prayer epochs carry seconds (Fajr 4:11:40) but the widget shows HH:MM ("4:11").
// Countdowns must therefore equal the wall-clock HH:MM difference, achieved by
// truncating the prayer epoch to the minute before the delta. now stays as-is;
// "until" still ceils its partial minute, "since" floors.
describe('widget-format-duration — epoch-minute truncation', () => {
  const at = (h: number, m: number, s: number) => Date.UTC(2026, 5, 4, h, m, s);

  it('«منذ» matches the HH:MM diff in the EARLY part of the minute (was off-by-one)', () => {
    const fajr = at(4, 11, 40); // displayed "4:11"
    const now = at(4, 33, 5); // clock reads "4:33" → 33 − 11 = 22
    // Raw floor would give 21 (21m25s); truncating Fajr to 4:11:00 gives 22.
    expect(formatPrayerDurationWithPrefix(fajr, now, 'ar', 'since')).toBe('منذ 22 د');
  });

  it('«بعد» matches the HH:MM diff (truncation prevents the ceil over-count)', () => {
    const next = at(8, 30, 40); // displayed "8:30"
    const now = at(8, 6, 5); // clock reads "8:06" → 30 − 06 = 24
    // Raw ceil would give 25 (24m35s); truncating 8:30 to the minute gives 24.
    expect(formatPrayerDurationWithPrefix(next, now, 'ar', 'until')).toBe('بعد 24 د');
  });

  it('truncateEpochToMinute drops the seconds component', () => {
    expect(truncateEpochToMinute(at(4, 11, 40))).toBe(at(4, 11, 0));
    expect(truncateEpochToMinute(at(4, 11, 0))).toBe(at(4, 11, 0));
  });
});

// The ≥1h Arabic format must place the wider EN SPACE (U+2002) gap after «س».
describe('widget-format-duration — «س»↔minute spacing', () => {
  it('uses U+2002 between «س» and the minutes for ≥1h Arabic', () => {
    expect(SIN_MINUTE_GAP).toBe(' ');
    expect(formatPrayerDurationCompact(64 * 60, 'ar')).toBe(`1 س${SIN_MINUTE_GAP}4 د`);
    expect(formatPrayerDurationCompact(64 * 60, 'ar')).toContain(' ');
  });

  it('does not add the wide gap to sub-hour or English formats', () => {
    expect(formatPrayerDurationCompact(40 * 60, 'ar')).toBe('40 د');
    expect(formatPrayerDurationCompact(64 * 60, 'en')).toBe('1H 4M');
  });
});
