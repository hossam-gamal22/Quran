import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { firestoreState } = vi.hoisted(() => ({
  firestoreState: {
    override: null as null | {
      countryCode: string;
      countryName: string;
      hijriYear: number;
      hijriMonth: number;
      monthLength: 29 | 30;
      hijriStartGregorian: string;
      source: string;
      isVerified: boolean;
    },
  },
}));

vi.mock('expo-localization', () => ({
  getLocales: () => [{ regionCode: 'SA' }],
}));

vi.mock('@/lib/hijri-overrides', () => ({
  getFirestoreOverride: vi.fn(async () => firestoreState.override),
}));

vi.mock('@/services/moonSightingNews', () => ({
  fetchMoonSightingNews: vi.fn(async () => null),
}));

import { getHijriDate } from '@/services/hijriCalendarService';

function mockAlAdhanHijri(day: number, month = 12, year = 1447) {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    json: async () => ({
      code: 200,
      status: 'OK',
      data: {
        hijri: {
          date: `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`,
          day: String(day),
          weekday: { en: 'Monday', ar: 'الاثنين' },
          month: { number: month, en: 'Dhul Hijjah', ar: 'ذو الحجة' },
          year: String(year),
          holidays: [],
        },
      },
    }),
  } as Response);
}

describe('Hijri calendar service source reconciliation', () => {
  const today = new Date('2026-05-18T12:00:00.000Z');

  beforeEach(async () => {
    firestoreState.override = null;
    await AsyncStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('keeps admin override absolute when AlAdhan later returns the same Hijri day', async () => {
    firestoreState.override = {
      countryCode: 'SA',
      countryName: 'Saudi Arabia',
      hijriYear: 1447,
      hijriMonth: 12,
      monthLength: 30,
      hijriStartGregorian: '2026-05-15',
      source: 'Admin moon-sighting correction',
      isVerified: true,
    };
    mockAlAdhanHijri(4);

    const resolved = await getHijriDate(today, 'SA');

    expect(resolved).toMatchObject({
      day: 4,
      month: 12,
      year: 1447,
      source: 'admin_override',
      confidence: 'high',
    });
  });

  it('does not jump when the admin override is removed after the API catches up', async () => {
    mockAlAdhanHijri(4);

    const resolved = await getHijriDate(today, 'SA');

    expect(resolved).toMatchObject({
      day: 4,
      month: 12,
      year: 1447,
      source: 'aladhan_api',
    });
  });
});
