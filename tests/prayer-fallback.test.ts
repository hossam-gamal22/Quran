import { beforeEach, describe, expect, it, vi } from 'vitest';

const { storage } = vi.hoisted(() => ({
  storage: new Map<string, string>(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    getAllKeys: vi.fn(() => Promise.resolve(Array.from(storage.keys()))),
    multiRemove: vi.fn((keys: string[]) => {
      keys.forEach((key) => storage.delete(key));
      return Promise.resolve();
    }),
  },
}));

import {
  getCountryFallbackPrayerTimes,
  getCountryFallbackTimesRange,
  MAKKAH_FALLBACK_COUNTRY_CODE,
  MAKKAH_FALLBACK_DEFAULTS,
} from '../lib/country-prayer-defaults';
import { getEffectivePrayerCalcSettings } from '../lib/prayer-settings-source';

describe('Makkah prayer fallback', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('uses Makkah for approximate country fallback times', () => {
    const result = getCountryFallbackPrayerTimes(new Date('2026-05-04T12:00:00Z'));

    expect(result.countryCode).toBe(MAKKAH_FALLBACK_COUNTRY_CODE);
    expect(result.cityNameEn).toBe('Makkah');
    expect(result.cityNameAr).toBe('مكة المكرمة');
    expect(MAKKAH_FALLBACK_DEFAULTS.method).toBe(4);
    expect(MAKKAH_FALLBACK_DEFAULTS.asrSchool).toBe(0);
  });

  it('uses Makkah for fallback date ranges', () => {
    const range = getCountryFallbackTimesRange(new Date('2026-05-04T12:00:00Z'), 2);

    expect(range).toHaveLength(2);
    expect(range[0]?.date).toBe('2026-05-04');
    expect(range[0]?.times.fajr).toMatch(/^\d{2}:\d{2}$/);
  });

  it('defaults effective calculation settings to Makkah when no settings are saved', async () => {
    const settings = await getEffectivePrayerCalcSettings();

    expect(settings).toMatchObject({
      calculationMethod: 4,
      asrJuristic: 0,
      source: 'fallback',
    });
  });
});
