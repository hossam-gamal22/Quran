import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
    getAllKeys: vi.fn(() => Promise.resolve([])),
    multiRemove: vi.fn(() => Promise.resolve()),
  },
}));

import {
  getPrayerNameAr,
  getPrayerNameEn,
  getPrayerTranslationKey,
  isFridayDate,
} from '../lib/prayer-times';

describe('Friday prayer display names', () => {
  const friday = new Date('2026-05-22T12:00:00');
  const thursday = new Date('2026-05-21T12:00:00');

  it('treats Friday Dhuhr as Jumuah for display only', () => {
    expect(isFridayDate(friday)).toBe(true);
    expect(getPrayerTranslationKey('dhuhr', friday)).toBe('prayer.jumuah');
    expect(getPrayerNameAr('dhuhr', friday)).toBe('صلاة الجمعة');
    expect(getPrayerNameEn('dhuhr', friday)).toBe('Jumuah');
  });

  it('keeps Dhuhr name on non-Friday dates', () => {
    expect(isFridayDate(thursday)).toBe(false);
    expect(getPrayerTranslationKey('dhuhr', thursday)).toBe('prayer.dhuhr');
    expect(getPrayerNameAr('dhuhr', thursday)).toBe('الظهر');
    expect(getPrayerNameEn('dhuhr', thursday)).toBe('Dhuhr');
  });
});
