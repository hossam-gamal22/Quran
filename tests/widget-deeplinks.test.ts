import { describe, it, expect } from 'vitest';
import { parseDeepLink } from '@/lib/deep-linking';

// The widget → in-app route contract. These URIs are the single source of truth
// for "tap a home-screen widget, open the matching page": they come from the
// WIDGET_REGISTRY `deepLink` fields (read by the unified Android resolver in
// android-widget-task-handler.decideAndroidWidget), plus the Arabic-only
// fallback's FIXED tap target (Language settings). This test guards against the
// historic divergence where the task handler / data-bridge hard-coded different
// (wrong/generic) URIs than the registry.
const WIDGET_TAP_ROUTES: Record<string, { uri: string; route: string }> = {
  prayer: { uri: 'rooh-almuslim://prayer', route: '/prayer' },
  verseOfDay: { uri: 'rooh-almuslim://quran', route: '/quran' },
  azkarMorning: { uri: 'rooh-almuslim://azkar/morning', route: '/azkar/1' },
  azkarEvening: { uri: 'rooh-almuslim://azkar/evening', route: '/azkar/1b' },
  dailyDhikr: { uri: 'rooh-almuslim://daily-dhikr', route: '/daily-dhikr' },
  hijriDate: { uri: 'rooh-almuslim://hijri', route: '/hijri' },
  // Arabic-only fallback: tap always goes to Language settings so the user can
  // switch the app to Arabic and un-break the widget.
  arabicOnlyFallback: { uri: 'rooh-almuslim://settings/language', route: '/settings/language' },
};

describe('widget tap deep links resolve to the correct in-app route', () => {
  for (const [name, { uri, route }] of Object.entries(WIDGET_TAP_ROUTES)) {
    it(`${name}: ${uri} → ${route}`, () => {
      expect(parseDeepLink(uri)).toBe(route);
    });
  }
});
