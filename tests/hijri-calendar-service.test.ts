import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { firestoreState, sourceModeState } = vi.hoisted(() => ({
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
  // Controls the `hijri_overrides_config/sourceModes` doc read by getCountrySourceMode.
  sourceModeState: { data: null as any },
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

// getCountrySourceMode reads Firestore directly — drive the per-country source
// mode deterministically without touching the network. Keep every other
// firebase/firestore export real (config/firebase.ts needs getFirestore at
// import time); only override doc/getDoc/onSnapshot.
vi.mock('@/lib/firebase-config', () => ({ db: {} }));
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    doc: () => ({}),
    getDoc: async () => ({ exists: () => sourceModeState.data != null, data: () => sourceModeState.data }),
    onSnapshot: () => () => {},
  };
});

import { getHijriDate, syncHijriSystemOffset, __resetHijriSourceModeCache } from '@/services/hijriCalendarService';
import { gregorianToHijri, getHijriSystemOffset, setHijriSystemOffset, getEffectiveHijriOffset } from '@/lib/hijri-date';

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
    sourceModeState.data = null;
    __resetHijriSourceModeCache();
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

describe('syncHijriSystemOffset — tabular→authoritative bridge', () => {
  beforeEach(async () => {
    firestoreState.override = null;
    sourceModeState.data = null;
    __resetHijriSourceModeCache();
    await AsyncStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    setHijriSystemOffset(0);
  });

  it('derives the integer day-shift that maps the tabular calc onto the authoritative date', async () => {
    // Date-independent: make the authoritative resolver return the raw tabular
    // calc for (today + 1). The bridge must therefore resolve a system offset
    // of exactly +1 on whatever the real date is. Driving this through the
    // AlAdhan layer keeps it timezone-safe (both sides use gregorianToHijri).
    const now = new Date();
    const tomorrowTab = gregorianToHijri(new Date(now.getTime() + 86400000));
    mockAlAdhanHijri(tomorrowTab.day, tomorrowTab.month, tomorrowTab.year);

    const n = await syncHijriSystemOffset('SA');

    expect(n).toBe(1);
    expect(getHijriSystemOffset()).toBe(1);
    // Invariant: tabular(today + offset) now equals the authoritative date.
    const probe = new Date(now);
    probe.setDate(probe.getDate() + (n as number));
    expect(gregorianToHijri(probe)).toMatchObject({
      year: tomorrowTab.year,
      month: tomorrowTab.month,
      day: tomorrowTab.day,
    });
  });

  it('never resets a known offset to zero when offline (no override + network failure)', async () => {
    setHijriSystemOffset(2);
    vi.mocked(global.fetch).mockRejectedValue(new Error('offline'));

    const n = await syncHijriSystemOffset('SA');

    expect(n).toBeNull();
    expect(getHijriSystemOffset()).toBe(2); // preserved, not clobbered
  });

  it('exposes the effective offset as user + system', () => {
    setHijriSystemOffset(1);
    // user offset defaults to 0 here (AsyncStorage cleared); effective == system
    expect(getEffectiveHijriOffset()).toBe(getHijriSystemOffset());
  });

  it('offline tabular fallback applies the last-synced system offset (widget stays correct offline)', async () => {
    // Persist + cache the offset both ways so it survives regardless of whether
    // hydrate re-reads storage or keeps the in-memory value in this run.
    await AsyncStorage.setItem('@hijri_system_offset', '1');
    setHijriSystemOffset(1);
    // No override, network down → Engine B must fall to Layer 4 (calculation).
    vi.mocked(global.fetch).mockRejectedValue(new Error('offline'));

    const date = new Date('2026-06-17T12:00:00.000Z');
    const resolved = await getHijriDate(date, 'SA');

    expect(resolved.source).toBe('calculation');
    // Must equal the RAW tabular calc shifted by the +1 system offset — i.e.
    // the authoritative rollover, not the day-behind raw value.
    const expected = gregorianToHijri(new Date(date.getTime() + 86400000));
    expect({ day: resolved.day, month: resolved.month, year: resolved.year }).toEqual({
      day: expected.day,
      month: expected.month,
      year: expected.year,
    });
  });
});

describe('per-country source mode (admin override vs API)', () => {
  const today = new Date('2026-05-18T12:00:00.000Z');

  beforeEach(async () => {
    firestoreState.override = null;
    sourceModeState.data = null;
    __resetHijriSourceModeCache();
    await AsyncStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    setHijriSystemOffset(0);
  });

  it("source mode 'api' ignores a verified admin override and follows AlAdhan", async () => {
    sourceModeState.data = { countries: { SA: 'api' } };
    firestoreState.override = {
      countryCode: 'SA',
      countryName: 'Saudi Arabia',
      hijriYear: 1447,
      hijriMonth: 12,
      monthLength: 30,
      hijriStartGregorian: '2026-05-15', // would resolve to day 4
      source: 'Admin override',
      isVerified: true,
    };
    mockAlAdhanHijri(5); // API says day 5

    const resolved = await getHijriDate(today, 'SA');

    expect(resolved.source).toBe('aladhan_api');
    expect(resolved.day).toBe(5); // override (4) ignored, API (5) used
  });

  it("source mode 'admin' (default) still uses the verified override", async () => {
    sourceModeState.data = { countries: { EG: 'api' } }; // a DIFFERENT country
    firestoreState.override = {
      countryCode: 'SA',
      countryName: 'Saudi Arabia',
      hijriYear: 1447,
      hijriMonth: 12,
      monthLength: 30,
      hijriStartGregorian: '2026-05-15',
      source: 'Admin override',
      isVerified: true,
    };
    mockAlAdhanHijri(5);

    const resolved = await getHijriDate(today, 'SA');

    expect(resolved.source).toBe('admin_override');
    expect(resolved.day).toBe(4); // SA stays on the override
  });
});

describe('resolved-date cache is system-offset-aware', () => {
  beforeEach(async () => {
    firestoreState.override = null;
    sourceModeState.data = null;
    __resetHijriSourceModeCache();
    await AsyncStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    setHijriSystemOffset(0);
  });

  it('does not serve a stale offset-0 entry once the system offset becomes +1', async () => {
    // Offline, no override → Layer 4 calculation, cached per (date, offset).
    vi.mocked(global.fetch).mockRejectedValue(new Error('offline'));
    const date = new Date('2026-05-18T12:00:00.000Z');

    setHijriSystemOffset(0);
    const first = await getHijriDate(date, 'SA'); // cached under …_sys_0
    expect(first.source).toBe('calculation');

    // The authoritative correction is learned → offset becomes +1.
    await AsyncStorage.setItem('@hijri_system_offset', '1');
    setHijriSystemOffset(1);
    const second = await getHijriDate(date, 'SA'); // must NOT reuse the sys_0 entry

    const raw = gregorianToHijri(date);
    const shifted = gregorianToHijri(new Date(date.getTime() + 86400000));
    expect({ d: first.day, m: first.month }).toEqual({ d: raw.day, m: raw.month });
    expect({ d: second.day, m: second.month }).toEqual({ d: shifted.day, m: shifted.month });
    expect(second.day).not.toBe(first.day); // proves the stale entry wasn't served
  });
});
