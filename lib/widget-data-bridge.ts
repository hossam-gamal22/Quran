// lib/widget-data-bridge.ts
// Unified bridge: writes widget data to platform-specific shared storage
// iOS: UserDefaults via App Group (group.com.rooh.almuslim)
// Android: AsyncStorage (read by react-native-android-widget task handler)

import React from 'react';
import { Platform, NativeModules, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  preparePrayerWidgetData,
  prepareAzkarWidgetData,
  prepareVerseWidgetData,
  prepareDhikrWidgetData,
  getPrayerCompletion,
  getWidgetSettings,
  type SharedWidgetData,
  type WidgetSnapshotManifestEntry,
} from './widget-data';
import { getLanguage } from './i18n';
import { type PrayerTimes, getStoredLocation, fetchPrayerTimes, cachePrayerTimes, parsePrayerTimes } from './prayer-times';
import { getOfflinePrayerTimes } from './prayer-week-cache';
import {
  buildCanonicalPrayerSnapshot,
  loadCanonicalPrayerSnapshot,
  saveCanonicalPrayerSnapshot,
  type CanonicalPrayerSnapshot,
} from './canonical-prayer-snapshot';
import { getEffectivePrayerCalcSettings } from './prayer-settings-source';
import type {
  PrayerWidgetInputs,
  CalculationMethodId,
  HighLatRuleId,
} from './widget-prayer-calculator';
import { PRAYER_INPUTS_KEY, PRAYER_INPUTS_VERSION } from './widget-prayer-calculator';

const APP_GROUP = 'group.com.rooh.almuslim';
const WIDGET_DATA_KEY = 'widget_shared_data';
/** App-Group / AsyncStorage key for the small inputs JSON read by both the iOS
 *  widget extension (Swift PrayerInputs) and the Android headless JS task
 *  (lib/widget-prayer-calculator.ts). */
const WIDGET_PRAYER_INPUTS_KEY_IOS = 'widget_prayer_inputs';
const WIDGET_PRAYER_INPUTS_KEY_ANDROID = PRAYER_INPUTS_KEY; // '@widget_prayer_inputs'
const SNAPSHOT_VERSION_KEY = '@widget_snapshot_version';
const WIDGET_DISPLAY_PREFS_KEY = '@widget_display_preferences';

function logWidgetTheme(message: string, payload?: unknown) {
  if (!__DEV__) return;
  if (payload === undefined) {
    console.log(`[WidgetTheme] ${message}`);
  } else {
    console.log(`[WidgetTheme] ${message}`, payload);
  }
}

interface UpdateWidgetDataOptions {
  forceSnapshots?: boolean;
  clearSnapshotCache?: boolean;
  refreshProofMarker?: string;
}

/**
 * Trigger native widget reload on both platforms.
 * iOS: WidgetCenter.shared.reloadAllTimelines() via WidgetReloadModule
 * Android: requestWidgetUpdate via react-native-android-widget (renders immediately)
 */
async function triggerNativeWidgetReload(sharedData?: SharedWidgetData): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      const t0 = Date.now();
      const { WidgetReloadModule } = NativeModules;
      if (WidgetReloadModule?.reloadAllTimelines) {
        await WidgetReloadModule.reloadAllTimelines();
        if (__DEV__) console.log(`[widget/refresh] iosReloadMs=${Date.now() - t0}`);
        if (__DEV__) console.log('✅ WidgetKit reloadAllTimelines triggered');
      }
    } catch (e) {
      if (__DEV__) console.warn('⚠️ WidgetKit reload failed:', e);
    }
  } else if (Platform.OS === 'android' && sharedData) {
    try {
      const t0 = Date.now();
      const { requestWidgetUpdate } = require('react-native-android-widget');
      // Source the full provider name list from the unified registry. After
      // Phase I we register one provider per (id, size) variant in app.json,
      // so the refresh fan-out must enumerate every key in LEGACY_ANDROID_WIDGET_MAP
      // — `androidWidgetProviderNames()` returns exactly that.
      const { androidWidgetProviderNames } = require('./widgets/registry');
      const widgetNames: string[] = androidWidgetProviderNames();

      await Promise.allSettled(
        widgetNames.map((widgetName) =>
          requestWidgetUpdate({
            widgetName,
            renderWidget: () => {
              const element = renderWidgetByName(widgetName, sharedData);
              return element;
            },
            widgetNotFound: () => {
              // Widget not on home screen — nothing to do
            },
          })
        )
      );
      if (__DEV__) console.log(`[widget/refresh] androidProviderUpdateMs=${Date.now() - t0}`);
      if (__DEV__) console.log('✅ Android widget update requested');
    } catch {
      // react-native-android-widget not available (Expo Go / web)
    }
  }
}

async function scheduleAndroidPrayerWidgetRefreshes(sharedData: SharedWidgetData): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const epochs = (sharedData.prayer?.allPrayers ?? [])
      .map((item) => Number((item as any).epochMs))
      .filter((epoch) => Number.isFinite(epoch) && epoch > Date.now() + 30_000)
      .sort((a, b) => a - b);
    const { PrayerWidgetRefreshModule } = NativeModules;
    if (PrayerWidgetRefreshModule?.schedulePrayerWidgetUpdates) {
      const t0 = Date.now();
      const result = await PrayerWidgetRefreshModule.schedulePrayerWidgetUpdates(epochs);
      if (__DEV__) {
        console.log('[widget/android] prayer refresh schedule:', {
          epochs,
          result,
          scheduleMs: Date.now() - t0,
        });
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[widget/android] prayer refresh schedule failed:', e);
  }
}

/**
 * Write JSON string to the App Group container file as fallback.
 * iOS only — the Swift widget reader (loadSharedRawData) reads UserDefaults first,
 * then falls back to this JSON file.
 */
async function writeAppGroupFallbackFile(jsonString: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const { WidgetReloadModule } = NativeModules;
    if (WidgetReloadModule?.writeSharedDataFile) {
      await WidgetReloadModule.writeSharedDataFile(jsonString);
      if (__DEV__) console.log('✅ App Group fallback JSON file written');
    }
  } catch (e) {
    if (__DEV__) console.warn('⚠️ App Group fallback file write failed:', e);
  }
}

/**
 * Write data to iOS App Group UserDefaults via SharedGroupPreferences + fallback JSON file,
 * with AsyncStorage copy for in-app gallery previews.
 * On Android, writes to AsyncStorage (react-native-android-widget reads it in the task handler).
 */
async function writeToSharedStorage(key: string, value: string): Promise<void> {
  if (Platform.OS === 'ios') {
    let sharedGroupOk = false;

    // Primary: UserDefaults via App Group (read by WidgetKit extension)
    try {
      const SharedGroupPreferences = require('react-native-shared-group-preferences').default;
      await SharedGroupPreferences.setItem(key, value, APP_GROUP);
      sharedGroupOk = true;
    } catch (e) {
      console.warn('⚠️ SharedGroupPreferences write failed:', e);
    }

    // Secondary: JSON file in App Group container (fallback for widget reads)
    await writeAppGroupFallbackFile(value);

    // Always keep AsyncStorage copy for in-app widget gallery previews
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Non-critical
    }

    if (__DEV__ && sharedGroupOk) {
      console.log('✅ Widget data written to App Group UserDefaults:', APP_GROUP);
    }
  } else {
    // Android: AsyncStorage is the primary storage
    await AsyncStorage.setItem(key, value);
  }
}

/**
 * Build the small prayer-inputs record from current app state and write it to
 * the platform-appropriate shared storage. This is the single contract the
 * widget extensions read for offline prayer-time computation — once written,
 * both iOS WidgetKit and Android headless tasks can compute prayer times
 * indefinitely without the app being open.
 *
 * Returns the inputs object on success, null if location is unknown (in which
 * case the widget falls back to legacy cached data or its setup-needed view).
 */
export async function writePrayerInputs(): Promise<PrayerWidgetInputs | null> {
  try {
    const location = await getStoredLocation();
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      if (__DEV__) console.log('[writePrayerInputs] no stored location — skipping inputs write');
      return null;
    }

    const calc = await getEffectivePrayerCalcSettings();

    // Time format + numerals preference — fall back to defaults if not set.
    let timeFormat: '12h' | '24h' = '12h';
    let numerals: 'western' | 'arabic' = 'western';
    try {
      const raw = await AsyncStorage.getItem('app_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        const display = parsed?.display ?? {};
        if (display.timeFormat === '24h' || display.timeFormat === '24-hour') timeFormat = '24h';
        if (display.numerals === 'arabic' || display.numerals === 'arabic-indic') numerals = 'arabic';
      }
    } catch {
      // keep defaults
    }

    // Timezone — MUST be the timezone of the user's selected LOCATION, not
    // the device's timezone. Otherwise the widget computes prayer times for
    // (e.g.) San Francisco coordinates but interprets the date in the
    // device's Cairo timezone, producing nonsense times. Source of truth is
    // `CanonicalPrayerSnapshot.timezone` (populated from the AlAdhan
    // response's `meta.timezone`, which the app already uses).
    let timezone = 'UTC';
    try {
      const snapshot = await loadCanonicalPrayerSnapshot({
        settings: {
          calculationMethod: calc.calculationMethod as any,
          asrJuristic: calc.asrJuristic,
          adjustments: calc.adjustments as any,
        },
        location,
        allowAnySameDayLocation: true,
      });
      if (snapshot?.timezone) {
        timezone = snapshot.timezone;
      } else {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) timezone = tz;
      }
    } catch {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) timezone = tz;
      } catch {
        // keep UTC
      }
    }

    const inputs: PrayerWidgetInputs = {
      version: PRAYER_INPUTS_VERSION,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone,
      calculationMethod: calc.calculationMethod as CalculationMethodId,
      madhab: calc.asrJuristic === 1 ? 'hanafi' : 'shafi',
      highLatitudeRule: undefined as HighLatRuleId | undefined,
      timeFormat,
      numerals,
      adjustments: calc.adjustments as PrayerWidgetInputs['adjustments'],
      writtenAt: new Date().toISOString(),
    };

    const json = JSON.stringify(inputs);

    if (Platform.OS === 'ios') {
      // App Group UserDefaults — read by Swift PrayerInputs.read()
      try {
        const SharedGroupPreferences = require('react-native-shared-group-preferences').default;
        await SharedGroupPreferences.setItem(WIDGET_PRAYER_INPUTS_KEY_IOS, json, APP_GROUP);
      } catch (e) {
        if (__DEV__) console.warn('[writePrayerInputs] iOS App Group write failed:', e);
      }
      // Mirror to AsyncStorage too so the in-app gallery preview can read it.
      try {
        await AsyncStorage.setItem(WIDGET_PRAYER_INPUTS_KEY_ANDROID, json);
      } catch {}
    } else if (Platform.OS === 'android') {
      try {
        await AsyncStorage.setItem(WIDGET_PRAYER_INPUTS_KEY_ANDROID, json);
      } catch (e) {
        if (__DEV__) console.warn('[writePrayerInputs] Android AsyncStorage write failed:', e);
      }
    }

    if (__DEV__) {
      console.log('[writePrayerInputs] wrote inputs', {
        method: inputs.calculationMethod,
        madhab: inputs.madhab,
        location: `${inputs.latitude.toFixed(4)},${inputs.longitude.toFixed(4)}`,
        timezone: inputs.timezone,
      });
    }

    return inputs;
  } catch (e) {
    if (__DEV__) console.warn('[writePrayerInputs] failed:', e);
    return null;
  }
}

async function readCachedSharedData(): Promise<SharedWidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? JSON.parse(raw) as SharedWidgetData : null;
  } catch {
    return null;
  }
}

async function nextSnapshotVersion(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_VERSION_KEY);
    const current = raw ? Number.parseInt(raw, 10) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    await AsyncStorage.setItem(SNAPSHOT_VERSION_KEY, String(next));
    return next;
  } catch {
    return Date.now();
  }
}

function buildManifestFromEntries(
  entries: Array<{
    routeKey: string;
    key: string;
    path: string;
    hash: string;
    id: string;
    size: string;
    theme: string;
    capturedWidth?: number;
    capturedHeight?: number;
    anchors?: ReadonlyArray<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fontFamily: string;
      fontSize: number;
      fontWeight: 'regular' | 'medium' | 'semibold' | 'bold';
      color: string;
      alignment: 'leading' | 'center' | 'trailing';
      direction: 'ltr' | 'rtl';
      isCountdown?: boolean;
    }>;
  }>,
  updatedAt: string,
): Record<string, WidgetSnapshotManifestEntry> {
  const manifest: Record<string, WidgetSnapshotManifestEntry> = {};
  for (const entry of entries) {
    manifest[entry.routeKey] = {
      routeKey: entry.routeKey,
      key: entry.key,
      path: entry.path,
      hash: entry.hash,
      id: entry.id,
      size: entry.size,
      theme: entry.theme,
      updatedAt,
      capturedWidth: entry.capturedWidth,
      capturedHeight: entry.capturedHeight,
      anchors: entry.anchors ? Array.from(entry.anchors) : undefined,
    };
  }
  return manifest;
}

function mergeSnapshotManifest(
  previous: SharedWidgetData | null,
  nextEntries: Record<string, WidgetSnapshotManifestEntry>,
): Record<string, WidgetSnapshotManifestEntry> {
  return {
    ...(previous?.snapshotManifest ?? {}),
    ...nextEntries,
  };
}

async function getActiveSnapshotRouteKeys(
  activeTheme: string,
  previousSharedData: SharedWidgetData | null,
): Promise<string[]> {
  const routeKeys = new Set<string>();
  try {
    const { androidWidgetProviderNames, androidWidgetProviderTarget } = require('./widgets/registry');
    const { snapshotRouteKey } = require('./widgets/snapshot');

    if (Platform.OS === 'android') {
      const { getWidgetInfo } = require('react-native-android-widget');
      const providers: string[] = androidWidgetProviderNames();
      await Promise.allSettled(providers.map(async (provider) => {
        const target = androidWidgetProviderTarget(provider);
        if (!target) return;
        const placements = await getWidgetInfo(provider).catch(() => []);
        if (Array.isArray(placements) && placements.length > 0) {
          routeKeys.add(snapshotRouteKey(target.id, target.size, activeTheme));
        }
      }));
    } else if (Platform.OS === 'ios') {
      const { WidgetReloadModule } = NativeModules;
      const configs = WidgetReloadModule?.currentWidgetConfigurations
        ? await WidgetReloadModule.currentWidgetConfigurations().catch(() => [])
        : [];
      if (Array.isArray(configs)) {
        configs.forEach((config: any) => {
          const rawKind = String(config?.kind ?? '');
          const normalizedKind = rawKind.endsWith('Widget') ? rawKind.slice(0, -6) : rawKind;
          const target = androidWidgetProviderTarget(normalizedKind) ?? androidWidgetProviderTarget(rawKind);
          if (target) routeKeys.add(snapshotRouteKey(target.id, target.size, activeTheme));
        });
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[widget/refresh] placed widget detection failed:', e);
  }

  if (routeKeys.size === 0) {
    const previousKeys = Object.keys(previousSharedData?.snapshotManifest ?? {})
      .filter((key) => key.endsWith(`_${activeTheme}`));
    previousKeys.forEach((key) => routeKeys.add(key));
    if (__DEV__) {
      console.log(`[widget/refresh] placedRouteKeysFallback previousManifest count=${previousKeys.length}`);
    }
  }

  const out = Array.from(routeKeys);
  if (__DEV__) console.log('[widget/refresh] placedRouteKeys', out);
  return out;
}

/**
 * Render the correct widget component for a given widget name using the provided data.
 *
 * Two rendering paths:
 *   1. Legacy path — historic provider names (RoohSmall, PrayerTimesSmall, …)
 *      route through their hand-written wrapper components, which themselves
 *      delegate to SnapshotWidget. Preserved verbatim so existing placements
 *      keep working.
 *   2. Generic path (Phase I) — variant-specific provider names registered in
 *      app.json (e.g. RoohDayThuluthSmall) don't have wrapper files; they
 *      render `SnapshotWidget` directly using the (id, size) tuple resolved
 *      from the unified Android provider target map.
 */
function renderWidgetByName(widgetName: string, data: SharedWidgetData): React.ReactElement | null {
  const { androidWidgetProviderTarget } = require('./widgets/registry');
  const target = androidWidgetProviderTarget(widgetName);
  if (target) {
    const { SnapshotWidget } = require('@/components/widgets/android/SnapshotWidget');
    const clickUri = (() => {
      switch (target.id) {
        case 'prayerSingle':
        case 'prayerTable':
        case 'prayerNextPrevious':
          return 'rooh-almuslim://prayer';
        case 'verseOfDay':
          return 'rooh-almuslim://daily-ayah';
        case 'azkarMorning':
          return 'rooh-almuslim://azkar/morning';
        case 'azkarEvening':
        case 'dailyDhikr':
          return 'rooh-almuslim://azkar';
        case 'hijriDate':
        case 'daySimple':
        case 'dayThuluth':
        case 'dayDigital':
        case 'monthSimple':
        case 'monthThuluth':
          return 'rooh-almuslim://hijri';
        default:
          return 'rooh-almuslim://widget';
      }
    })();
    return React.createElement(SnapshotWidget, {
      widgetId: target.id,
      size: target.size,
      data,
      clickAction: 'OPEN_URI',
      clickUri,
    });
  }

  const { RoohSmallWidget } = require('@/components/widgets/android/RoohSmallWidget');
  const { RoohMediumWidget } = require('@/components/widgets/android/RoohMediumWidget');
  const { RoohLargeWidget } = require('@/components/widgets/android/RoohLargeWidget');
  const { PrayerTimesSmallWidget } = require('@/components/widgets/android/PrayerTimesSmallWidget');
  const { PrayerTimesMediumWidget } = require('@/components/widgets/android/PrayerTimesMediumWidget');
  const { PrayerTimesLargeWidget } = require('@/components/widgets/android/PrayerTimesLargeWidget');
  const { DailyVerseSmallWidget } = require('@/components/widgets/android/DailyVerseSmallWidget');
  const { DailyVerseMediumWidget } = require('@/components/widgets/android/DailyVerseMediumWidget');
  const { DailyDhikrSmallWidget } = require('@/components/widgets/android/DailyDhikrSmallWidget');
  const { DailyDhikrMediumWidget } = require('@/components/widgets/android/DailyDhikrMediumWidget');
  const { AzkarProgressSmallWidget } = require('@/components/widgets/android/AzkarProgressSmallWidget');
  const { AzkarProgressMediumWidget } = require('@/components/widgets/android/AzkarProgressMediumWidget');
  const { HijriDateSmallWidget } = require('@/components/widgets/android/HijriDateSmallWidget');
  const { HijriDateMediumWidget } = require('@/components/widgets/android/HijriDateMediumWidget');

  const map: Record<string, React.FC<{ data: SharedWidgetData }>> = {
    RoohSmall: RoohSmallWidget,
    RoohMedium: RoohMediumWidget,
    RoohLarge: RoohLargeWidget,
    PrayerTimesSmall: PrayerTimesSmallWidget,
    PrayerTimesMedium: PrayerTimesMediumWidget,
    PrayerTimesLarge: PrayerTimesLargeWidget,
    DailyVerseSmall: DailyVerseSmallWidget,
    DailyVerseMedium: DailyVerseMediumWidget,
    DailyDhikrSmall: DailyDhikrSmallWidget,
    DailyDhikrMedium: DailyDhikrMediumWidget,
    AzkarProgressSmall: AzkarProgressSmallWidget,
    AzkarProgressMedium: AzkarProgressMediumWidget,
    HijriDateSmall: HijriDateSmallWidget,
    HijriDateMedium: HijriDateMediumWidget,
  };

  const Component = map[widgetName];
  if (Component) return React.createElement(Component, { data });

  // Fallback: per-variant or Android keyguard provider name. Look up the
  // (id, size) in the registry map and render SnapshotWidget directly.
  return null;
}

/**
 * Aggregate all widget data and write to shared storage, then refresh all Android widgets.
 * Call this on: app startup, prayer time change, midnight, language change, foreground.
 */
export async function updateWidgetData(
  prayerTimes?: PrayerTimes | null,
  location?: string,
  options: UpdateWidgetDataOptions = {},
): Promise<void> {
  try {
    const totalT0 = Date.now();
    const lang = getLanguage();
    const settings = await getWidgetSettings();

    const effectiveCalc = await getEffectivePrayerCalcSettings();
    const storedLocation = await getStoredLocation();
    let canonicalSnapshot: CanonicalPrayerSnapshot | null = await loadCanonicalPrayerSnapshot({
      settings: {
        calculationMethod: effectiveCalc.calculationMethod as any,
        asrJuristic: effectiveCalc.asrJuristic,
        adjustments: effectiveCalc.adjustments as any,
      },
      location: storedLocation,
      allowAnySameDayLocation: !storedLocation,
    });

    // Auto-use the app's canonical prayer snapshot first. Widgets must not
    // silently calculate a different location/method/timezone than the Prayer
    // screen after the app has published a snapshot.
    let effectivePrayerTimes = prayerTimes || null;
    if (!effectivePrayerTimes && canonicalSnapshot?.prayerTimes) {
      effectivePrayerTimes = canonicalSnapshot.prayerTimes;
      location = location || canonicalSnapshot.locationName;
      if (__DEV__) console.log('[PrayerCanonical] widget data bridge using canonical snapshot');
    }

    if (!effectivePrayerTimes) {
      try {
        const offlineResult = await getOfflinePrayerTimes();
        if (offlineResult.times) {
          effectivePrayerTimes = offlineResult.times;
          if (__DEV__) console.log(`📴 Widget: using offline prayer times (source: ${offlineResult.source})`);
          if (storedLocation) {
            canonicalSnapshot = buildCanonicalPrayerSnapshot({
              times: offlineResult.times,
              location: storedLocation,
              locationName: location || [storedLocation.city, storedLocation.country].filter(Boolean).join(', '),
              settings: {
                calculationMethod: effectiveCalc.calculationMethod as any,
                asrJuristic: effectiveCalc.asrJuristic,
                adjustments: effectiveCalc.adjustments as any,
              },
              source: offlineResult.source as any,
            });
            await saveCanonicalPrayerSnapshot(canonicalSnapshot);
          }
        }
      } catch {}
    }

    // Last-resort Makkah fallback: never let widgets render "--:--".
    // The app will replace this with user-location data as soon as location is available.
    if (!effectivePrayerTimes) {
      effectivePrayerTimes = {
        fajr: '04:15',
        sunrise: '05:39',
        dhuhr: '12:19',
        asr: '15:42',
        maghrib: '18:56',
        isha: '20:17',
        midnight: '00:35',
        lastThird: '02:28',
      };
      location = location || 'مكة المكرمة';
      canonicalSnapshot = null;
    }

    // Write small inputs JSON for offline widget calculation (iOS App Group +
    // Android AsyncStorage). Best-effort — falls through to legacy cached
    // prayer epochs if location/settings aren't set yet.
    writePrayerInputs().catch(() => {});

    const settledResults = await Promise.allSettled([
      preparePrayerWidgetData(effectivePrayerTimes, location, lang, canonicalSnapshot),
      prepareAzkarWidgetData(lang, settings.azkarWidget.categories),
      prepareVerseWidgetData(lang, { showTranslation: settings.verseWidget.showTranslation }),
      prepareDhikrWidgetData(lang, { showTranslation: settings.dhikrWidget.showTranslation, showBenefit: settings.dhikrWidget.showBenefit }),
      getPrayerCompletion(),
    ]);

    settledResults.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`⚠️ Widget data slice ${i} failed:`, r.reason);
      }
    });

    // If any critical slice failed, abort to keep last-known-good shared data intact
    if (settledResults.some(r => r.status === 'rejected')) {
      console.warn('⚠️ Skipping widget data write due to partial failure');
      return;
    }

    const prayerData = (settledResults[0] as PromiseFulfilledResult<any>).value;
    const azkarData = (settledResults[1] as PromiseFulfilledResult<any>).value;
    const verseData = (settledResults[2] as PromiseFulfilledResult<any>).value;
    const dhikrData = (settledResults[3] as PromiseFulfilledResult<any>).value;
    const prayerCompletion = (settledResults[4] as PromiseFulfilledResult<any>).value;

    // Pull user's widget preferences from app_settings.
    // NOTE: widgetLanguage is intentionally derived from the app's main language —
    // there is no per-widget language toggle anymore (Arabic UI → Arabic widgets,
    // otherwise English).
    let widgetFontVariant: 'widget1' | 'widget2' = 'widget1';
    let widgetCalendar = 'auto';
    let widgetDayCalendar = 'auto';
    let widgetMonthCalendar = 'auto';
    let widgetNumerals = 'auto';
    let widgetTheme = 'auto';
    const widgetLanguage = (lang === 'ar' || lang === 'ur') ? 'ar' : 'en';
    let widgetDateFormat = 'gregorian-ar';
    try {
      const appSettingsRaw = await AsyncStorage.getItem('app_settings');
      if (appSettingsRaw) {
        const appSettings = JSON.parse(appSettingsRaw);
        const d = appSettings?.display;
        logWidgetTheme('loaded from app_settings (updateWidgetData):', {
          selectedWidgetTheme: d?.widgetTheme,
        });
        if (d?.widgetFontVariant === 'widget2') widgetFontVariant = 'widget2';
        if (d?.widgetCalendar) widgetCalendar = d.widgetCalendar;
        if (d?.widgetDayCalendar) widgetDayCalendar = d.widgetDayCalendar;
        if (d?.widgetMonthCalendar) widgetMonthCalendar = d.widgetMonthCalendar;
        if (d?.widgetNumerals) widgetNumerals = d.widgetNumerals;
        if (d?.widgetTheme) widgetTheme = d.widgetTheme;
        if (d?.widgetDateFormat) widgetDateFormat = d.widgetDateFormat;
      }
      const widgetPrefsRaw = await AsyncStorage.getItem(WIDGET_DISPLAY_PREFS_KEY);
      if (widgetPrefsRaw) {
        const d = JSON.parse(widgetPrefsRaw);
        logWidgetTheme('loaded from storage (updateWidgetData):', d);
        if (d?.widgetFontVariant === 'widget2') widgetFontVariant = 'widget2';
        if (d?.widgetCalendar) widgetCalendar = d.widgetCalendar;
        if (d?.widgetDayCalendar) widgetDayCalendar = d.widgetDayCalendar;
        if (d?.widgetMonthCalendar) widgetMonthCalendar = d.widgetMonthCalendar;
        if (d?.widgetNumerals) widgetNumerals = d.widgetNumerals;
        if (d?.widgetTheme) widgetTheme = d.widgetTheme;
        if (d?.widgetDateFormat) widgetDateFormat = d.widgetDateFormat;
      }
      logWidgetTheme('after merge/normalization (updateWidgetData):', {
        selectedWidgetTheme: widgetTheme,
        widgetFontVariant,
        widgetCalendar,
        widgetDayCalendar,
        widgetMonthCalendar,
        widgetNumerals,
        widgetDateFormat,
      });
    } catch (e) {
      logWidgetTheme('loaded from storage (updateWidgetData) failed:', (e as Error)?.message ?? e);
    }

    // Phase F: real premium gating sourced from the subscription state cached
    // by SubscriptionContext. Mirrors the gating in
    // lib/android-widget-task-handler.tsx#isUserPremium so that the widget
    // shell, the gallery, and the snapshot pipeline all agree on the same
    // verdict.
    let isPremium = false;
    try {
      const subRaw = await AsyncStorage.getItem('@subscription_state');
      if (subRaw) {
        const sub = JSON.parse(subRaw);
        if (sub?.isPremium) {
          // Lifetime entries have null `expiresAt`; subscriptions check expiry.
          if (!sub.expiresAt || new Date(sub.expiresAt) > new Date()) {
            isPremium = true;
          }
        }
      }
    } catch {}

    // Hijri offset = the integer number of days needed to shift the
    // widget's native islamicUmmAlQura calendar so it matches what the
    // user's app shows for TODAY. Collapsing four sources of truth into
    // ONE integer the widget can apply:
    //   1. Admin Firestore override (`hijri_overrides/{country}_{y}_{m}`) —
    //      official Hilal announcement per country (highest priority)
    //   2. AlAdhan API per-country method (Umm Al-Qura, Egyptian, etc.)
    //   3. Google News RSS moon-sighting detection (days 28-30)
    //   4. User's manual ±1/±2 day adjustment from the Hijri tab
    // `getHijriDate()` already resolves the full chain. We then probe
    // ±3 days from today against Apple's islamic-umalqura via Intl until
    // the resolved day matches — that's the offset to publish.
    let hijriOffset = 0;
    try {
      const { getHijriDate } = require('@/services/hijriCalendarService');
      const today = new Date();
      const resolved = await getHijriDate(today);
      if (resolved && typeof resolved.day === 'number') {
        const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric' });
        for (let n = -3; n <= 3; n++) {
          const shifted = new Date(today.getTime() + n * 86400000);
          const appleDay = parseInt(fmt.format(shifted), 10);
          if (Number.isFinite(appleDay) && appleDay === resolved.day) {
            hijriOffset = n;
            break;
          }
        }
        if (__DEV__) {
          console.log('[widget/hijri] resolved.day=', resolved.day, 'source=', resolved.source, 'country=', resolved.countryCode, 'offset=', hijriOffset);
        }
      } else {
        // Fallback to the user-only offset if the service is unavailable.
        const { getHijriOffset } = require('@/lib/hijri-date');
        const v = await getHijriOffset();
        if (typeof v === 'number' && Number.isFinite(v)) hijriOffset = v;
      }
    } catch (e) {
      if (__DEV__) console.warn('[widget/hijri] effective offset compute failed:', e);
    }

    const previousSharedData = await readCachedSharedData();
    const sharedDataBase: SharedWidgetData = {
      prayer: prayerData,
      azkar: azkarData,
      verse: verseData,
      dhikr: dhikrData,
      prayerCompletion,
      settings,
      language: lang,
      hijriOffset,
      widgetFontVariant,
      widgetCalendar,
      widgetDayCalendar,
      widgetMonthCalendar,
      widgetNumerals,
      widgetTheme,
      widgetLanguage,
      widgetDateFormat,
      isPremium,
      canonicalPrayerSnapshot: canonicalSnapshot ?? undefined,
    };
    logWidgetTheme('passed to updateWidgetData:', {
      selectedWidgetTheme: sharedDataBase.widgetTheme,
      display: {
        widgetTheme,
        widgetNumerals,
        widgetCalendar,
        widgetDayCalendar,
        widgetMonthCalendar,
        widgetFontVariant,
        widgetDateFormat,
      },
    });

    let snapshotVersion = previousSharedData?.snapshotVersion ?? 0;
    let snapshotUpdatedAt = previousSharedData?.snapshotUpdatedAt;
    let snapshotManifest = previousSharedData?.snapshotManifest ?? {};
    let activeThemeForPrewarm: string | null = null;
    let activeRouteKeysForPrewarm: string[] = [];

    // Regenerate the active-theme snapshot before shared data is published.
    // Native widgets only receive the new manifest after the versioned PNGs are
    // written and verified, so a reload cannot consume a missing/stale key.
    try {
      const { pumpThemesFromCurrentState, setPumpContext, clearSnapshotCache } = require('./widgets/pump');
      const { resolveWidgetTheme } = require('./widgets/snapshot');
      const display = {
        widgetTheme,
        widgetNumerals,
        widgetCalendar,
        widgetDayCalendar,
        widgetMonthCalendar,
        widgetFontVariant,
        widgetDateFormat,
        widgetLanguage,
      };
      if (options.clearSnapshotCache) {
        const clearT0 = Date.now();
        await clearSnapshotCache?.();
        if (__DEV__) console.log(`[widget/refresh] cacheClearMs=${Date.now() - clearT0}`);
      }
      snapshotVersion = await nextSnapshotVersion();
      snapshotUpdatedAt = new Date().toISOString();
      setPumpContext({
        language: lang,
        isPremium: !!isPremium,
        display,
        sharedData: sharedDataBase,
        snapshotVersion,
        refreshProofMarker: options.refreshProofMarker ?? (options.forceSnapshots ? snapshotUpdatedAt : undefined),
      prayerSignature: `${prayerData?.nextPrayer ?? ''}-${prayerData?.nextPrayerAtEpochMs ?? prayerData?.nextPrayerTime ?? ''}-${prayerData?.prayerDataUpdatedAt ?? ''}`,
        verseSignature: `${verseData?.surahName ?? ''}:${verseData?.numberInSurah ?? ''}`,
        dhikrSignature: `${dhikrData?.category ?? ''}:${dhikrData?.count ?? ''}`,
        azkarSignature: `${azkarData?.randomZikr?.id ?? ''}`,
      });
      const activeTheme = resolveWidgetTheme(widgetTheme, Appearance.getColorScheme());
      activeThemeForPrewarm = activeTheme;
      logWidgetTheme('snapshot theme:', {
        selectedWidgetTheme: widgetTheme,
        resolvedWidgetTheme: activeTheme,
      });
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const placedRouteKeys = await getActiveSnapshotRouteKeys(activeTheme, previousSharedData);
        activeRouteKeysForPrewarm = placedRouteKeys;
        const snapshotT0 = Date.now();
        const result = await pumpThemesFromCurrentState?.([activeTheme], {
          debounceMs: 0,
          force: !!options.forceSnapshots || !!options.clearSnapshotCache,
          includeRouteKeys: placedRouteKeys.length > 0 ? placedRouteKeys : undefined,
          cleanup: false,
          commit: false,
        });
        if (!result || result.reason === 'skipped' || result.errors?.length) {
          throw new Error(`snapshot_generation_failed:${result?.reason ?? 'no_result'}:${result?.errors?.join('|') ?? ''}`);
        }
        if (__DEV__) console.log(`[widget/refresh] activeSnapshotGenerationMs=${Date.now() - snapshotT0} entries=${result.entries?.length ?? 0}`);
        const generatedManifest = buildManifestFromEntries(result.entries ?? [], snapshotUpdatedAt);
        if (Object.keys(generatedManifest).length === 0) {
          throw new Error(`snapshot_generation_empty:${result.reason}`);
        }
        snapshotManifest = mergeSnapshotManifest(previousSharedData, generatedManifest);
        if (__DEV__) {
          Object.values(generatedManifest).forEach((entry) => {
            console.log(`[widget/app] generated snapshot key=${entry.key} path=${entry.path ?? 'n/a'} hash=${entry.hash ?? 'n/a'}`);
            logWidgetTheme('final snapshot key:', {
              selectedWidgetTheme: widgetTheme,
              snapshotTheme: entry.theme,
              snapshotKey: entry.key,
              routeKey: entry.routeKey,
            });
            logWidgetTheme('cream edge diagnostic:', {
              selectedWidgetTheme: widgetTheme,
              snapshotTheme: entry.theme,
              insideGeneratedPng: 'snapshot PNG contains the full React gallery tile for this theme',
              nativeBackground: 'set to the same resolved theme behind transparent rounded corners',
            });
          });
        }
      }
    } catch (e) {
      if (options.forceSnapshots || options.clearSnapshotCache) {
        throw e;
      }
      if (__DEV__) console.warn('⚠️ Snapshot generation skipped; keeping previous manifest:', e);
    }

    const sharedData: SharedWidgetData = {
      ...sharedDataBase,
      snapshotVersion,
      snapshotUpdatedAt,
      snapshotManifest,
    };

    const json = JSON.stringify(sharedData);

    // Write to shared storage only after active PNG generation has completed.
    const writeT0 = Date.now();
    await writeToSharedStorage(WIDGET_DATA_KEY, json);
    if (__DEV__) console.log(`[widget/refresh] sharedDataWriteMs=${Date.now() - writeT0}`);

    await scheduleAndroidPrayerWidgetRefreshes(sharedData);

    // Trigger native widget refresh on both platforms (after active snapshot is ready).
    await triggerNativeWidgetReload(sharedData);

    if ((Platform.OS === 'android' || Platform.OS === 'ios') && activeThemeForPrewarm) {
      const prewarmTheme = activeThemeForPrewarm;
      const activeRouteKeySet = new Set(activeRouteKeysForPrewarm);
      setTimeout(() => {
        (async () => {
          try {
            const prewarmT0 = Date.now();
            const { pumpThemesFromCurrentState } = require('./widgets/pump');
            const result = await pumpThemesFromCurrentState?.([prewarmTheme], {
              debounceMs: 0,
              force: false,
              cleanup: true,
              commit: false,
            });
            if (result?.entries?.length) {
              const extraEntries = result.entries.filter((entry: any) => !activeRouteKeySet.has(entry.routeKey));
              if (extraEntries.length > 0) {
                const prewarmManifest = buildManifestFromEntries(extraEntries, new Date().toISOString());
                const latest = await readCachedSharedData();
                if (latest) {
                  const merged: SharedWidgetData = {
                    ...latest,
                    snapshotManifest: mergeSnapshotManifest(latest, prewarmManifest),
                  };
                  await writeToSharedStorage(WIDGET_DATA_KEY, JSON.stringify(merged));
                }
              }
            }
            if (__DEV__) {
              console.log(`[widget/refresh] backgroundPrewarmMs=${Date.now() - prewarmT0} entries=${result?.entries?.length ?? 0}`);
            }
          } catch (e) {
            if (__DEV__) console.warn('[widget/refresh] background prewarm skipped:', e);
          }
        })();
      }, 0);
    }

    if (__DEV__) {
      const nowMs = Date.now();
      const nextPrayerAtEpochMs = prayerData?.nextPrayerAtEpochMs;
      const appRemainingSeconds = nextPrayerAtEpochMs ? Math.max(0, Math.floor((nextPrayerAtEpochMs - nowMs) / 1000)) : null;
      console.log(`[widget/prayer] appNowMs=${nowMs} nextPrayerAtEpochMs=${nextPrayerAtEpochMs ?? 'n/a'} appRemainingSeconds=${appRemainingSeconds ?? 'n/a'} prayerDataUpdatedAt=${prayerData?.prayerDataUpdatedAt ?? 'n/a'} snapshotVersion=${snapshotVersion}`);
      console.log('[PrayerCanonical] app countdown:', appRemainingSeconds);
      console.log('[PrayerCanonical] app timezone:', canonicalSnapshot?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
      console.log('[PrayerCanonical] app nextPrayerAtEpochMs:', canonicalSnapshot?.nextPrayerAtEpochMs ?? nextPrayerAtEpochMs ?? 'n/a');
      console.log('[PrayerCanonical] calculation method:', canonicalSnapshot?.calculationMethod ?? effectiveCalc.calculationMethod);
      console.log('[PrayerCanonical] location:', canonicalSnapshot?.latitude ?? storedLocation?.latitude ?? 'n/a', canonicalSnapshot?.longitude ?? storedLocation?.longitude ?? 'n/a', canonicalSnapshot?.locationName ?? location ?? '');
      console.log(`[widget/refresh] totalMs=${Date.now() - totalT0}`);
    }

    if (__DEV__) console.log('✅ Widget data synced to shared storage');
  } catch (error) {
    console.warn('⚠️ Widget data sync failed:', error);
    if (options.forceSnapshots || options.clearSnapshotCache) {
      throw error;
    }
  }
}

export async function refreshWidgetsNow(): Promise<{
  snapshotVersion?: number;
  snapshotUpdatedAt?: string;
  snapshotCount: number;
}> {
  await updateWidgetData(undefined, undefined, {
    forceSnapshots: true,
    clearSnapshotCache: true,
    refreshProofMarker: new Date().toISOString(),
  });
  const sharedData = await readCachedSharedData();
  return {
    snapshotVersion: sharedData?.snapshotVersion,
    snapshotUpdatedAt: sharedData?.snapshotUpdatedAt,
    snapshotCount: Object.keys(sharedData?.snapshotManifest ?? {}).length,
  };
}

/**
 * Re-trigger native widget reload using the most recently cached shared data.
 * Called by SnapshotPumpController after it finishes pumping PNGs to disk,
 * so the home-screen widget picks up the fresh snapshot without a full
 * updateWidgetData() round-trip.
 */
export async function reloadWidgetsFromCache(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (!raw) return;
    const sharedData = JSON.parse(raw) as SharedWidgetData;
    await triggerNativeWidgetReload(sharedData);
  } catch {}
}

/**
 * Schedule a midnight timer to refresh widget data (new daily verse/dhikr).
 * Returns a cleanup function.
 */
export function scheduleMidnightRefresh(onRefresh?: () => void): () => void {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 30, 0); // 00:00:30 next day (30s buffer)
  const msUntilMidnight = midnight.getTime() - now.getTime();

  const timer = setTimeout(async () => {
    updateWidgetData().catch((e) => console.warn('⚠️ Midnight widget refresh failed:', e));

    // Proactively cache tomorrow's prayer times so the prayer screen loads instantly
    try {
      const location = await getStoredLocation();
      if (location) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        const response = await fetchPrayerTimes(location, tomorrow);
        if (response?.timings) {
          const parsed = parsePrayerTimes(response);
          await cachePrayerTimes(tomorrowStr, parsed);
        }
      }
    } catch {
      // Non-critical — prayer screen will fetch on demand
    }

    onRefresh?.();
    scheduleMidnightRefresh(onRefresh);
  }, msUntilMidnight);

  return () => clearTimeout(timer);
}
