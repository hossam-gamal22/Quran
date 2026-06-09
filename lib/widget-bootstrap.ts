// lib/widget-bootstrap.ts
// Boot-sequence orchestrator that makes widget data ready as soon as a location
// is available — primarily right after the onboarding location grant.
//
// The missing link this closes: granting location previously only saved the
// coordinates; nothing computed prayer times, wrote the shared payload, or
// reloaded the native widgets. So the gallery/home-screen widget kept showing
// the cold-launch fallback until a later background/interval sync. This runs the
// full chain immediately and idempotently:
//
//   stored coords → (best-effort) fetch+cache today's API times → write shared
//   payload (offline localCalc instant fallback) → reload native widgets.
//
// Single source of truth: it delegates the actual write+reload to
// syncWidgetDataToNative → updateWidgetData (the one widget writer). It never
// adds a second write/reload path.

import {
  applyAdjustments,
  cachePrayerTimes,
  fetchPrayerTimes,
  getStoredLocation,
  getTodayDateString,
  parsePrayerTimes,
  type PrayerAdjustments,
} from './prayer-times';
import { getEffectivePrayerCalcSettings } from './prayer-settings-source';
import { syncWidgetDataToNative } from './widget-native-sync';

/**
 * Prepare and publish widget data for the currently stored location, then reload
 * native widgets. Safe to call repeatedly (idempotent) and never throws — every
 * step is best-effort. `syncWidgetDataToNative()` is ALWAYS called last so that:
 *  - with a stored location: real times (API cache or offline localCalc) ship,
 *  - without a stored location: a clean `needsLocation` placeholder ships.
 *
 * Call this right after a location grant (onboarding) and defensively at
 * onboarding completion.
 */
export async function prepareWidgetsForLocation(): Promise<void> {
  let location: Awaited<ReturnType<typeof getStoredLocation>> = null;
  try {
    location = await getStoredLocation();
  } catch {}

  // 1. Publish + reload IMMEDIATELY. With a stored location the bridge computes
  //    accurate times via the vendored adhan engine (offline localCalc, no
  //    network) so the gallery/home-screen widget show real data within ~100ms.
  //    Without a location it writes the intentional "enable location" state.
  try {
    await syncWidgetDataToNative();
  } catch (e) {
    if (__DEV__) console.warn('[widget-bootstrap] initial sync failed:', e);
  }

  // 2. Best-effort upgrade: fetch today's times from the API and cache them so
  //    the canonical snapshot exactly matches the Prayer screen's provider, then
  //    re-publish. Slow/offline network fails quietly — step 1 already shipped
  //    correct offline-calculated times.
  if (location?.latitude != null && location?.longitude != null) {
    try {
      const calc = await getEffectivePrayerCalcSettings();
      const response = await fetchPrayerTimes(location, new Date(), {
        calculationMethod: calc.calculationMethod as any,
        asrJuristic: calc.asrJuristic as any,
      });
      const parsed = parsePrayerTimes(response);
      // Normalize to a full PrayerAdjustments — getEffectivePrayerCalcSettings
      // may return a partial/empty `{}` (fresh onboarding with no manual
      // offsets), and applyAdjustments would compute NaN times for any missing
      // key. Default every offset to 0.
      const a = calc.adjustments ?? {};
      const adjustments: PrayerAdjustments = {
        fajr: a.fajr ?? 0,
        sunrise: a.sunrise ?? 0,
        dhuhr: a.dhuhr ?? 0,
        asr: a.asr ?? 0,
        maghrib: a.maghrib ?? 0,
        isha: a.isha ?? 0,
      };
      const adjusted = applyAdjustments(parsed, adjustments);
      await cachePrayerTimes(
        getTodayDateString(),
        adjusted,
        calc.calculationMethod,
        calc.asrJuristic,
      );
      await syncWidgetDataToNative();
      if (__DEV__) console.log('[widget-bootstrap] upgraded widgets to API prayer times');
    } catch (e) {
      if (__DEV__) console.log('[widget-bootstrap] API upgrade skipped/failed — offline calc kept:', e);
    }
  } else if (__DEV__) {
    console.log('[widget-bootstrap] no stored location — needsLocation placeholder published');
  }
}
