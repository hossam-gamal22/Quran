import { describe, it, expect } from 'vitest';
import { SURAH_NAMES_AR, RECITERS, TRANSLATION_EDITIONS, getAyahAudioUrl, getSurahAudioUrl } from '../lib/quran-api';
import { PRAYER_NAMES_AR, getNextPrayer, getTimeUntilPrayer, CALCULATION_METHODS } from '../lib/prayer-api';

describe('Quran API Utils', () => {
  it('should have 114 surah names', () => {
    expect(SURAH_NAMES_AR.length).toBe(114);
  });

  it('should have Al-Fatiha as first surah', () => {
    expect(SURAH_NAMES_AR[0]).toBe('الفاتحة');
  });

  it('should have An-Nas as last surah', () => {
    expect(SURAH_NAMES_AR[113]).toBe('الناس');
  });

  it('should have at least 5 reciters', () => {
    expect(RECITERS.length).toBeGreaterThanOrEqual(5);
  });

  it('should have at least 4 translation editions', () => {
    expect(TRANSLATION_EDITIONS.length).toBeGreaterThanOrEqual(4);
  });

  it('should generate correct ayah audio URL', () => {
    const url = getAyahAudioUrl(1, 'ar.alafasy');
    expect(url).toBe('https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3');
  });

  it('should generate correct surah audio URL', () => {
    const url = getSurahAudioUrl(1, 'ar.alafasy');
    expect(url).toBe('https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/1.mp3');
  });
});

describe('Prayer API Utils', () => {
  it('should have Arabic names for all 5 prayers', () => {
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    prayers.forEach(p => {
      expect(PRAYER_NAMES_AR[p]).toBeDefined();
    });
  });

  it('should have at least 10 calculation methods', () => {
    expect(CALCULATION_METHODS.length).toBeGreaterThanOrEqual(10);
  });

  it('should return next prayer from timings', () => {
    const mockTimings = {
      Fajr: '04:30',
      Sunrise: '06:00',
      Dhuhr: '12:00',
      Asr: '15:30',
      Sunset: '18:00',
      Maghrib: '18:15',
      Isha: '20:00',
      Imsak: '04:20',
      Midnight: '00:00',
      Firstthird: '22:00',
      Lastthird: '02:00',
    };
    const result = getNextPrayer(mockTimings);
    expect(result).not.toBeNull();
    expect(result?.name).toBeDefined();
    expect(result?.arabicName).toBeDefined();
    expect(result?.time).toBeDefined();
  });

  it('should format time until prayer correctly', () => {
    const futureTime = '23:59';
    const result = getTimeUntilPrayer(futureTime);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
