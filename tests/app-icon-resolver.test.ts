import { describe, expect, it } from 'vitest';
import {
  computeIconState,
  getActiveSeason,
  type AppIconsConfig,
  type IconSchedule,
} from '@/lib/app-icon-resolver';

// A minimal config that turns every season into its mapped icon (auto mode).
function baseConfig(partial: Partial<AppIconsConfig> = {}): AppIconsConfig {
  return {
    version: 1,
    alertEnabled: true,
    alertTitle: '',
    alertMessage: '',
    alertTitleEn: '',
    alertMessageEn: '',
    mode: 'auto',
    manualIcon: null,
    enabledSeasons: ['ramadan', 'hajj', 'mawlid', 'eid_fitr', 'eid_adha', 'dhul_hijjah', 'hijri_new_year'],
    schedules: [],
    ...partial,
  };
}

const now = new Date('2026-06-26T12:00:00Z');
const ctx = { now, platform: 'android' as const, appVersion: '2.5.0', language: 'ar' };

function schedule(partial: Partial<IconSchedule>): IconSchedule {
  return {
    id: partial.id ?? 'sch-1',
    iconKey: partial.iconKey ?? 'ramadan',
    startAt: partial.startAt ?? null,
    endAt: partial.endAt ?? null,
    enabled: partial.enabled ?? true,
    createdAt: partial.createdAt ?? '2026-06-01T00:00:00Z',
    platforms: partial.platforms,
    minAppVersion: partial.minAppVersion ?? null,
    maxAppVersion: partial.maxAppVersion ?? null,
    note: partial.note,
  };
}

describe('computeIconState priority', () => {
  it('falls back to language default when nothing is active', () => {
    const s = computeIconState(baseConfig(), { ...ctx, currentSeason: null });
    expect(s.iconKey).toBe('default_ar');
    expect(s.source).toBe('default');

    const en = computeIconState(baseConfig(), { ...ctx, language: 'en', currentSeason: null });
    expect(en.iconKey).toBe('default_en');
  });

  it('uses the seasonal icon when a season is active', () => {
    const s = computeIconState(baseConfig(), { ...ctx, currentSeason: 'ramadan' });
    expect(s.iconKey).toBe('ramadan');
    expect(s.source).toBe('seasonal');
  });

  it('manual mode overrides the season', () => {
    const s = computeIconState(baseConfig({ mode: 'manual', manualIcon: 'hajj' }), {
      ...ctx,
      currentSeason: 'ramadan',
    });
    expect(s.iconKey).toBe('hajj');
    expect(s.source).toBe('manual');
  });

  it('an active schedule beats both season and manual mode', () => {
    const cfg = baseConfig({
      mode: 'manual',
      manualIcon: 'hajj',
      schedules: [schedule({ iconKey: 'eid_fitr' })], // indefinite, active now
    });
    const s = computeIconState(cfg, { ...ctx, currentSeason: 'ramadan' });
    expect(s.iconKey).toBe('eid_fitr');
    expect(s.source).toBe('schedule');
    expect(s.expiresAt).toBeNull(); // until further notice
  });

  it('a schedule wins even under language_only mode', () => {
    const cfg = baseConfig({ mode: 'language_only', schedules: [schedule({ iconKey: 'mawlid' })] });
    const s = computeIconState(cfg, { ...ctx, currentSeason: 'ramadan' });
    expect(s.iconKey).toBe('mawlid');
    expect(s.source).toBe('schedule');
  });

  it('skips a schedule that targets a different platform', () => {
    const cfg = baseConfig({ schedules: [schedule({ iconKey: 'eid_fitr', platforms: ['ios'] })] });
    const s = computeIconState(cfg, { ...ctx, platform: 'android', currentSeason: 'ramadan' });
    expect(s.iconKey).toBe('ramadan'); // schedule excluded → season wins
  });

  it('skips a schedule outside its app-version range', () => {
    const cfg = baseConfig({
      schedules: [schedule({ iconKey: 'eid_fitr', minAppVersion: '3.0.0' })],
    });
    const s = computeIconState(cfg, { ...ctx, appVersion: '2.5.0', currentSeason: null });
    expect(s.iconKey).toBe('default_ar');
  });

  it('skips a schedule whose window has not started / has ended', () => {
    const future = schedule({ id: 'f', iconKey: 'eid_fitr', startAt: '2026-12-01T00:00:00Z' });
    const past = schedule({ id: 'p', iconKey: 'hajj', endAt: '2026-01-01T00:00:00Z' });
    const cfg = baseConfig({ schedules: [future, past] });
    const s = computeIconState(cfg, { ...ctx, currentSeason: null });
    expect(s.source).toBe('default');
    // The future one is surfaced as the next scheduled change.
    expect(s.nextSchedule?.iconKey).toBe('eid_fitr');
  });

  it('a disabled icon in the library is skipped and resolution falls through', () => {
    const cfg = baseConfig({
      iconLibrary: { ramadan: { enabled: false, platforms: ['ios', 'android'], kind: 'seasonal' } },
    });
    const s = computeIconState(cfg, { ...ctx, currentSeason: 'ramadan' });
    expect(s.iconKey).toBe('default_ar'); // ramadan disabled → default
  });

  it('most-recently-created schedule wins among overlaps', () => {
    const older = schedule({ id: 'a', iconKey: 'hajj', createdAt: '2026-06-01T00:00:00Z' });
    const newer = schedule({ id: 'b', iconKey: 'mawlid', createdAt: '2026-06-20T00:00:00Z' });
    const cfg = baseConfig({ schedules: [older, newer] });
    const s = computeIconState(cfg, { ...ctx, currentSeason: null });
    expect(s.iconKey).toBe('mawlid');
    expect(s.activeScheduleId).toBe('b');
  });
});

describe('getActiveSeason', () => {
  it('honors custom ranges fed from seasons_metadata', () => {
    // Force "today" into a custom ramadan-like window via override ranges.
    const hijri = getActiveSeason(now, {
      ranges: { ramadan: { start: { month: 1, day: 1 }, end: { month: 12, day: 30 } } },
      enabledSeasons: ['ramadan'],
    });
    expect(hijri?.season).toBe('ramadan');
  });
});
