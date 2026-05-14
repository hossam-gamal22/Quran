import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    multiRemove: vi.fn((keys: string[]) => {
      keys.forEach((key) => storage.delete(key));
      return Promise.resolve();
    }),
  },
}));

import {
  calculateAzkarStats,
  calculateFastingStats,
  calculatePrayerStats,
  calculateQuranStats,
  addQuranPages,
  getMonthlyActivityStats,
} from '../lib/worship-storage';

const setJson = (key: string, value: unknown) => {
  storage.set(key, JSON.stringify(value));
};

afterEach(() => {
  vi.useRealTimers();
});

describe('worship-storage monthly activity stats', () => {
  beforeEach(() => {
    storage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-07T12:00:00Z'));
  });

  it('counts only point-bearing monthly worship activity', async () => {
    setJson('worship_prayer_records', {
      '2026-05-01': {
        date: '2026-05-01',
        fajr: 'prayed',
        dhuhr: 'late',
        asr: 'missed',
        maghrib: 'none',
        isha: 'prayed',
      },
      '2026-04-30': {
        date: '2026-04-30',
        fajr: 'prayed',
        dhuhr: 'prayed',
        asr: 'prayed',
        maghrib: 'prayed',
        isha: 'prayed',
      },
    });
    setJson('worship_fasting_records', {
      '2026-05-02': { date: '2026-05-02', fasted: true, type: 'voluntary' },
      '2026-05-03': { date: '2026-05-03', fasted: false },
    });
    setJson('worship_quran_records', {
      '2026-05-01': { date: '2026-05-01', pagesRead: 3 },
      '2026-04-30': { date: '2026-04-30', pagesRead: 9 },
    });
    setJson('worship_azkar_records', {
      '2026-05-01': {
        date: '2026-05-01',
        morning: true,
        evening: true,
        sleep: true,
        wakeup: false,
        afterPrayer: false,
        zikrCount: 2,
      },
    });
    setJson('tasbih_type_stats', {
      '2026-05-01': { subhanallah: 10 },
    });
    setJson('@tasbih_daily_history', {
      '2026-05-02': { alhamdulillah: 5 },
    });

    await expect(getMonthlyActivityStats(2026, 5)).resolves.toEqual({
      prayers: 3,
      fasting: 1,
      quranPages: 3,
      azkar: 2,
      tasbih: 15,
    });
  });

  it('counts manual azkar checklist marks when no per-zikr counter exists', async () => {
    setJson('worship_azkar_records', {
      '2026-05-01': {
        date: '2026-05-01',
        morning: true,
        evening: true,
        sleep: false,
        wakeup: true,
        afterPrayer: false,
      },
    });

    await expect(getMonthlyActivityStats(2026, 5)).resolves.toMatchObject({
      azkar: 3,
    });
  });

  it('clamps quran page updates to a valid daily range', async () => {
    await addQuranPages('2026-05-07', 700);
    await addQuranPages('2026-05-07', -800);

    await expect(getMonthlyActivityStats(2026, 5)).resolves.toMatchObject({
      quranPages: 0,
    });
  });
});

describe('worship-storage streaks', () => {
  beforeEach(() => {
    storage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-07T12:00:00Z'));
  });

  it('breaks prayer streaks across date gaps', async () => {
    const complete = (date: string) => ({
      date,
      fajr: 'prayed',
      dhuhr: 'late',
      asr: 'prayed',
      maghrib: 'prayed',
      isha: 'prayed',
    });
    setJson('worship_prayer_records', {
      '2026-05-07': complete('2026-05-07'),
      '2026-05-06': complete('2026-05-06'),
      '2026-05-04': complete('2026-05-04'),
      '2026-05-03': complete('2026-05-03'),
    });

    const stats = await calculatePrayerStats();
    expect(stats.streak).toBe(2);
    expect(stats.bestStreak).toBe(2);
  });

  it('breaks fasting, quran, and azkar streaks across date gaps', async () => {
    setJson('worship_fasting_records', {
      '2026-05-06': { date: '2026-05-06', fasted: true },
      '2026-05-05': { date: '2026-05-05', fasted: true },
      '2026-05-03': { date: '2026-05-03', fasted: true },
    });
    setJson('worship_quran_records', {
      '2026-05-07': { date: '2026-05-07', pagesRead: 1 },
      '2026-05-06': { date: '2026-05-06', pagesRead: 2 },
      '2026-05-04': { date: '2026-05-04', pagesRead: 3 },
    });
    setJson('worship_azkar_records', {
      '2026-05-07': { date: '2026-05-07', morning: true, evening: true, sleep: false, wakeup: false, afterPrayer: false },
      '2026-05-06': { date: '2026-05-06', morning: true, evening: true, sleep: false, wakeup: false, afterPrayer: false },
      '2026-05-04': { date: '2026-05-04', morning: true, evening: true, sleep: false, wakeup: false, afterPrayer: false },
    });

    await expect(calculateFastingStats()).resolves.toMatchObject({ currentStreak: 2, bestStreak: 2 });
    await expect(calculateQuranStats()).resolves.toMatchObject({ currentStreak: 2, bestStreak: 2 });
    await expect(calculateAzkarStats()).resolves.toMatchObject({ currentStreak: 2, bestStreak: 2 });
  });
});
