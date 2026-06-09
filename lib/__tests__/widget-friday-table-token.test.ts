import { describe, expect, it, vi } from 'vitest';

// The resolver imports expo-file-system/legacy only for PRAYER_STATIC_DIR /
// existence probes; prayerStaticAssetName itself is a pure string builder.
vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  getInfoAsync: vi.fn(() => Promise.resolve({ exists: false })),
}));

import { prayerStaticAssetName, type PrayerStateKey } from '../widget-android-asset-resolver';

describe('Friday prayer-table Jumuah token selection', () => {
  const base = { size: 'large' as const, theme: 'light' as const, language: 'ar' as const };

  it('maps every non-Dhuhr active state to ${active}_jumuah on Friday (table)', () => {
    const states: PrayerStateKey[] = ['fajr', 'sunrise', 'asr', 'maghrib', 'isha'];
    for (const active of states) {
      expect(prayerStaticAssetName({ widgetId: 'prayerTable', active, friday: true, ...base }))
        .toBe(`prayerTable_large_light_ar_${active}_jumuah`);
    }
  });

  it('uses the plain `jumuah` token when Dhuhr is the active prayer on Friday (table)', () => {
    // resolveFridayPrayerStates already maps dhuhr -> jumuah before this point.
    expect(prayerStaticAssetName({ widgetId: 'prayerTable', active: 'jumuah', friday: true, ...base }))
      .toBe('prayerTable_large_light_ar_jumuah');
  });

  it('does not add the Friday suffix on non-Fridays (table)', () => {
    expect(prayerStaticAssetName({ widgetId: 'prayerTable', active: 'fajr', friday: false, ...base }))
      .toBe('prayerTable_large_light_ar_fajr');
    expect(prayerStaticAssetName({ widgetId: 'prayerTable', active: 'dhuhr', ...base }))
      .toBe('prayerTable_large_light_ar_dhuhr');
  });

  it('leaves prayerSingle (hero-only) and prayerNextPrevious (slot tokens) unchanged on Friday', () => {
    expect(prayerStaticAssetName({ widgetId: 'prayerSingle', active: 'fajr', friday: true, ...base }))
      .toBe('prayerSingle_large_light_ar_fajr');
    expect(prayerStaticAssetName({ widgetId: 'prayerNextPrevious', active: 'asr', previous: 'jumuah', friday: true, ...base }))
      .toBe('prayerNextPrevious_large_light_ar_jumuah_asr');
  });
});
