import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Locks in the change-driven Firestore cost optimization: every launch-mounted
// content fetcher must be gated by the shared content manifest (one tiny
// shared doc read per session) instead of holding a permanent onSnapshot
// listener. A regression to onSnapshot on these collections/docs would silently
// re-introduce the per-open read-cost spike.

type FetcherCheck = {
  label: string;
  file: string;
  // string that must remain present (the manifest gate)
  mustContain: string;
  // patterns that must NOT match (live listeners on the gated source)
  mustNotMatch?: RegExp[];
};

const fetchers: FetcherCheck[] = [
  {
    label: 'azkar collection',
    file: 'lib/azkar-api.ts',
    mustContain: 'shouldRefetchContent(AZKAR_MANIFEST_KEY)',
    mustNotMatch: [/onSnapshot\(\s*collection\(db,\s*['"]azkar['"]\)/],
  },
  {
    label: 'azkar_categories collection',
    file: 'lib/azkar-api.ts',
    mustContain: "shouldRefetchContent(CATEGORIES_MANIFEST_KEY)",
    mustNotMatch: [/onSnapshot\(\s*collection\(db,\s*['"]azkar_categories['"]\)/],
  },
  {
    label: 'tasbihPresets collection',
    file: 'lib/admin-data-api.ts',
    mustContain: "shouldRefetchContent('tasbihPresets')",
    mustNotMatch: [/onSnapshot\(\s*collection\(db,\s*['"]tasbihPresets['"]\)/],
  },
  {
    label: 'islamicEvents collection',
    file: 'lib/admin-data-api.ts',
    mustContain: "shouldRefetchContent('islamicEvents')",
    mustNotMatch: [/onSnapshot\(\s*eventsQuery\b/, /onSnapshot\(\s*collection\(db,\s*['"]islamicEvents['"]\)/],
  },
  {
    label: 'quranThemes doc',
    file: 'lib/admin-data-api.ts',
    mustContain: "shouldRefetchContent('quranThemes')",
    mustNotMatch: [/onSnapshot\(\s*doc\(db,\s*['"]appConfig['"],\s*['"]quranThemes['"]\)/],
  },
  {
    label: 'appSettings doc (subscribeToAppConfig + Highlights share key)',
    file: 'lib/app-config-api.ts',
    mustContain: "shouldRefetchContent('appSettings')",
  },
  {
    label: 'homePageConfig doc',
    file: 'lib/app-config-api.ts',
    mustContain: "shouldRefetchContent('homePageConfig')",
  },
  {
    label: 'featureGating doc',
    file: 'lib/feature-gating.ts',
    mustContain: "shouldRefetchContent('featureGating')",
    mustNotMatch: [/onSnapshot\(/],
  },
  {
    label: 'subscriptionConfig doc',
    file: 'lib/subscription-manager.ts',
    mustContain: "shouldRefetchContent('subscriptionConfig')",
    mustNotMatch: [/onSnapshot\(/],
  },
  {
    label: 'soundSettings doc',
    file: 'lib/sound-manager.ts',
    mustContain: "shouldRefetchContent('soundSettings')",
  },
  {
    label: 'themeConfig doc',
    file: 'contexts/ThemeConfigContext.tsx',
    mustContain: "shouldRefetchContent('themeConfig')",
    mustNotMatch: [/onSnapshot\(/],
  },
  {
    label: 'seasonal listeners (appIcons + seasonalBannerCopy + seasonalContent)',
    file: 'contexts/SeasonalContext.tsx',
    mustContain: "shouldRefetchContent('appIcons')",
  },
];

describe('content manifest covers every launch-mounted Firestore fetcher', () => {
  for (const f of fetchers) {
    it(`gates ${f.label}`, () => {
      const src = readFileSync(f.file, 'utf8');
      expect(src, `${f.file} should call ${f.mustContain}`).toContain(f.mustContain);
      for (const pat of f.mustNotMatch ?? []) {
        expect(src, `${f.file} should no longer match ${pat}`).not.toMatch(pat);
      }
    });
  }

  it('seasonalContent and seasonalBannerCopy are both gated', () => {
    const src = readFileSync('contexts/SeasonalContext.tsx', 'utf8');
    expect(src).toContain("shouldRefetchContent('seasonalContent')");
    expect(src).toContain("shouldRefetchContent('seasonalBannerCopy')");
  });
});
