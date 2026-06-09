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
import type { AndroidWidgetDecision } from './android-widget-task-handler';
import { deviceUses24Hour } from './widget-clock-format';
import { type Location, type PrayerTimes, getStoredLocation, fetchPrayerTimes, cachePrayerTimes, parsePrayerTimes, applyAdjustments, isFridayDate } from './prayer-times';
import { getOfflinePrayerTimes } from './prayer-week-cache';
import {
  buildCanonicalPrayerSnapshot,
  loadCanonicalPrayerSnapshot,
  saveCanonicalPrayerSnapshot,
  type CanonicalPrayerSnapshot,
} from './canonical-prayer-snapshot';
import { deviceTimezone } from './prayer-location-timezone';
import { getEffectivePrayerCalcSettings } from './prayer-settings-source';
import type {
  PrayerWidgetInputs,
  CalculationMethodId,
  HighLatRuleId,
} from './widget-prayer-calculator';
import {
  computePrayerTimesForDay,
  PRAYER_INPUTS_KEY,
  PRAYER_INPUTS_VERSION,
  type PrayerKey,
} from './widget-prayer-calculator';
import { nextPrayerStaticState, resolvePrayerTableState } from './widget-prayer-table-state';

const APP_GROUP = 'group.com.rooh.almuslim';
const WIDGET_DATA_KEY = 'widget_shared_data';
/** App-Group / AsyncStorage key for the small inputs JSON read by both the iOS
 *  widget extension (Swift PrayerInputs) and the Android headless JS task
 *  (lib/widget-prayer-calculator.ts). */
const WIDGET_PRAYER_INPUTS_KEY_IOS = 'widget_prayer_inputs';
const WIDGET_PRAYER_INPUTS_KEY_ANDROID = PRAYER_INPUTS_KEY; // '@widget_prayer_inputs'
const SNAPSHOT_VERSION_KEY = '@widget_snapshot_version';
const WIDGET_DISPLAY_PREFS_KEY = '@widget_display_preferences';
/** Set when a settings-driven re-bake is owed; cleared only once the visible
 *  widgets have been re-baked successfully. If the app is backgrounded mid-bake
 *  (captureRef needs a live RN tree, so the bake aborts), this marker survives
 *  and SnapshotPumpController's foreground drain force-rebakes on next launch —
 *  the change self-heals instead of waiting for the user to re-enter the gallery.
 *  Mirrors PUMP_PENDING_KEY in SnapshotPumpController / android-widget-task-handler. */
const WIDGET_REBAKE_PENDING_KEY = '@widget_pump_pending';

/** Mark that a user-initiated widget appearance change still owes a re-bake. */
export async function markWidgetRebakePending(): Promise<void> {
  try { await AsyncStorage.setItem(WIDGET_REBAKE_PENDING_KEY, 'true'); } catch {}
}

/** Clear the owed-re-bake marker after the visible widgets are freshly baked. */
export async function clearWidgetRebakePending(): Promise<void> {
  try { await AsyncStorage.removeItem(WIDGET_REBAKE_PENDING_KEY); } catch {}
}

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
  displayOverride?: WidgetDisplayOverride;
}

export type WidgetDisplayOverride = Partial<{
  widgetFontVariant: 'widget1' | 'widget2';
  widgetCalendar: string;
  widgetDayCalendar: string;
  widgetMonthCalendar: string;
  widgetNumerals: string;
  widgetTheme: string;
  widgetLanguage: 'auto' | 'ar' | 'en';
  widgetDateFormat: string;
}>;

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
      // Share the EXACT decide/render logic the headless task handler uses, so a
      // language switch (this in-app fan-out) and an organic Android WIDGET_UPDATE
      // can never diverge. This is what makes the Arabic-only / location / curated
      // fallbacks flip deterministically the instant the user changes language —
      // instead of waiting for Android's ~30-min updatePeriodMillis to route a
      // refresh through the task handler.
      const { decideAndroidWidget, renderAndroidWidgetDecision } = require('./android-widget-task-handler');
      const widgetNames: string[] = androidWidgetProviderNames();

      // Precompute each placement's render decision up front (async: language,
      // location check, prayer per-state template, PNG stat) so the synchronous
      // requestWidgetUpdate callback can just render the resolved element.
      const decisions = new Map<string, AndroidWidgetDecision | null>();
      await Promise.allSettled(widgetNames.map(async (widgetName) => {
        try {
          decisions.set(widgetName, await decideAndroidWidget(widgetName, sharedData));
        } catch {
          decisions.set(widgetName, null);
        }
      }));

      await Promise.allSettled(
        widgetNames.map((widgetName) =>
          requestWidgetUpdate({
            widgetName,
            renderWidget: (widgetInfo: { width?: number; height?: number }) => {
              const decision = decisions.get(widgetName);
              if (!decision) return null;
              return renderAndroidWidgetDecision(decision, sharedData, widgetInfo);
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
 * Arm the 15-minute content-widget refresh chain on Android. Mirrors the
 * iOS WidgetKit timeline cadence at a battery-friendly interval — once
 * scheduled, the native receiver re-arms itself on every fire so the
 * azkar / dhikr / verse widgets keep cycling indefinitely without the
 * user opening the app. Skips silently when no content widget is placed
 * (the receiver short-circuits in that case).
 */
async function scheduleAndroidContentWidgetRefresh(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const { PrayerWidgetRefreshModule } = NativeModules;
    if (PrayerWidgetRefreshModule?.scheduleContentWidgetRefresh) {
      await PrayerWidgetRefreshModule.scheduleContentWidgetRefresh();
      if (__DEV__) console.log('[widget/android] content refresh chain armed (15-min cadence)');
    }
  } catch (e) {
    if (__DEV__) console.warn('[widget/android] content refresh schedule failed:', e);
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

    // The widget table is rendered beside the phone clock, so its absolute
    // epochs must follow the same visible wall clock. The location still
    // controls the solar calculation coordinates; the device timezone
    // controls how displayed HH:mm values are interpreted and counted down.
    const timezone = deviceTimezone();

    const inputs: PrayerWidgetInputs = {
      version: PRAYER_INPUTS_VERSION,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone,
      calculationTimezone: location.timezone || timezone,
      calculationMethod: calc.calculationMethod as CalculationMethodId,
      madhab: calc.asrJuristic === 1 ? 'hanafi' : 'shafi',
      highLatitudeRule: undefined as HighLatRuleId | undefined,
      timeFormat,
      numerals,
      adjustments: calc.adjustments as PrayerWidgetInputs['adjustments'],
      writtenAt: new Date().toISOString(),
    };

    // AlAdhan API and the vendored offline Adhan engines occasionally differ
    // by a provider rounding minute. Calibrate the offline inputs against the
    // latest trusted same-day snapshot so a widget remains aligned after the
    // API cache expires, without mutating the user's own adjustments.
    try {
      const canonical = await loadCanonicalPrayerSnapshot({
        settings: {
          calculationMethod: calc.calculationMethod as any,
          asrJuristic: calc.asrJuristic,
          adjustments: calc.adjustments as any,
        },
        location,
      });
      if (canonical && canonical.timezone === timezone) {
        const [year, month, day] = canonical.date.split('-').map(Number);
        const canonicalLocalDay = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
          ? new Date(year, month - 1, day, 12, 0, 0, 0)
          : new Date();
        const local = computePrayerTimesForDay(inputs, canonicalLocalDay);
        const canonicalEpochs: Record<PrayerKey, number> = {
          fajr: canonical.fajrAtEpochMs,
          sunrise: canonical.sunriseAtEpochMs,
          dhuhr: canonical.dhuhrAtEpochMs,
          asr: canonical.asrAtEpochMs,
          maghrib: canonical.maghribAtEpochMs,
          isha: canonical.ishaAtEpochMs,
        };
        const providerCalibration: Partial<Record<PrayerKey, number>> = {};
        (Object.keys(canonicalEpochs) as PrayerKey[]).forEach((key) => {
          const deltaMinutes = Math.round((canonicalEpochs[key] - local[key].getTime()) / 60_000);
          if (deltaMinutes !== 0 && Math.abs(deltaMinutes) <= 180) {
            providerCalibration[key] = deltaMinutes;
          }
        });
        if (Object.keys(providerCalibration).length > 0) {
          inputs.providerCalibration = providerCalibration;
        }
      }
    } catch {
      // Inputs remain usable without calibration when no trusted API day is cached.
    }

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
        calculationTimezone: inputs.calculationTimezone,
        providerCalibration: inputs.providerCalibration ?? {},
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

function applyDisplayOverrideToSharedData(
  data: SharedWidgetData,
  displayOverride?: WidgetDisplayOverride,
): SharedWidgetData {
  if (!displayOverride) return data;
  return {
    ...data,
    ...(displayOverride.widgetFontVariant ? { widgetFontVariant: displayOverride.widgetFontVariant } : {}),
    ...(displayOverride.widgetCalendar ? {
      widgetCalendar: displayOverride.widgetCalendar,
      widgetDayCalendar: displayOverride.widgetDayCalendar ?? displayOverride.widgetCalendar,
      widgetMonthCalendar: displayOverride.widgetMonthCalendar ?? displayOverride.widgetCalendar,
    } : {}),
    ...(displayOverride.widgetDayCalendar ? { widgetDayCalendar: displayOverride.widgetDayCalendar } : {}),
    ...(displayOverride.widgetMonthCalendar ? { widgetMonthCalendar: displayOverride.widgetMonthCalendar } : {}),
    ...(displayOverride.widgetNumerals ? { widgetNumerals: displayOverride.widgetNumerals } : {}),
    ...(displayOverride.widgetTheme ? { widgetTheme: displayOverride.widgetTheme } : {}),
    ...(displayOverride.widgetDateFormat ? { widgetDateFormat: displayOverride.widgetDateFormat } : {}),
  };
}

export async function refreshWidgetDisplayNow(displayOverride: WidgetDisplayOverride): Promise<void> {
  const previous = await readCachedSharedData();
  if (!previous) {
    await updateWidgetData(undefined, undefined, { displayOverride });
    return;
  }

  const sharedData = applyDisplayOverrideToSharedData(previous, displayOverride);
  const writeT0 = Date.now();
  await writeToSharedStorage(WIDGET_DATA_KEY, JSON.stringify(sharedData));
  if (__DEV__) {
    console.log(`[widget/refresh] displayOnlyWriteMs=${Date.now() - writeT0}`);
    logWidgetTheme('display-only shared data pushed:', {
      selectedWidgetTheme: sharedData.widgetTheme,
      displayOverride,
    });
  }
  await triggerNativeWidgetReload(sharedData);
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
    language?: 'ar' | 'en';
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
      language: entry.language,
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

/** Single-state model: the manifest should only ever describe the active
 *  theme's snapshots (the only ones we keep on disk). Drop every other theme's
 *  entries so the manifest never points at a PNG that the disk prune deleted. */
function pruneManifestToTheme(
  manifest: Record<string, WidgetSnapshotManifestEntry> | undefined,
  theme: string,
): Record<string, WidgetSnapshotManifestEntry> {
  const out: Record<string, WidgetSnapshotManifestEntry> = {};
  for (const [key, entry] of Object.entries(manifest ?? {})) {
    if ((entry as WidgetSnapshotManifestEntry)?.theme === theme) out[key] = entry;
  }
  return out;
}

/** Guards the H2 in-session recovery retry so a failed recovery bake reschedules
 *  at most one pending retry at a time (reset when that retry settles). */
let recoveryRetryScheduled = false;

/** Widget ids that render LIVE in the headless task (FlexWidget) and never load a
 *  snapshot PNG — excluded from the missing-file check so they don't trigger an
 *  endless force when they legitimately have no baked snapshot. */
const LIVE_WIDGET_IDS_FOR_MISSING_CHECK = [
  'azkarMorning', 'azkarEvening', 'dailyDhikr',
  'daySimple', 'dayThuluth', 'dayDigital', 'monthSimple', 'monthThuluth',
];

/**
 * Android only: returns true when any placed widget's snapshot PNG is unusable —
 * either there is no manifest entry for its route key, or the manifest's file path
 * does not exist on disk. Used to FORCE a re-bake (bypassing the per-theme hash
 * skip in pumpWidgetSnapshotsForThemes) so that simply opening the app always
 * regenerates a missing/deleted snapshot. Self-limiting: once the file is on disk
 * the check returns false, so healthy foregrounds keep their normal hash-skip.
 * iOS App Group paths can't be stat'd by expo-file-system, so iOS returns false.
 */
async function anyPlacedSnapshotFileMissing(
  previousSharedData: SharedWidgetData | null,
  placedRouteKeys: string[],
): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (placedRouteKeys.length === 0) return false;
  let FileSystem: typeof import('expo-file-system');
  try {
    FileSystem = require('expo-file-system');
  } catch {
    return false;
  }
  const manifest = previousSharedData?.snapshotManifest ?? {};
  for (const routeKey of placedRouteKeys) {
    if (LIVE_WIDGET_IDS_FOR_MISSING_CHECK.some((id) => routeKey.startsWith(`${id}_`))) continue;
    const entry = manifest[routeKey];
    if (!entry?.path) return true; // never baked (or no path) → must bake
    try {
      const info = await FileSystem.getInfoAsync(entry.path);
      if (!info.exists) return true;
    } catch {
      return true; // can't stat → assume missing, force a bake
    }
  }
  return false;
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

      // Union the sticky "ever-placed" providers recorded by the headless
      // WIDGET_ADDED task (key kept in sync with android-widget-task-handler's
      // PLACED_PROVIDERS_KEY). getWidgetInfo() is timing-sensitive and can return
      // empty for a genuinely-placed widget; the sticky set keeps that widget's
      // route key in the bake set so its active-theme PNG is always regenerated.
      try {
        const rawPlaced = await AsyncStorage.getItem('@widget_placed_providers');
        const placedProviders: string[] = rawPlaced ? JSON.parse(rawPlaced) : [];
        if (Array.isArray(placedProviders)) {
          placedProviders.forEach((provider) => {
            const target = androidWidgetProviderTarget(provider);
            if (target) routeKeys.add(snapshotRouteKey(target.id, target.size, activeTheme));
          });
        }
      } catch (e) {
        if (__DEV__) console.warn('[widget/refresh] sticky placed providers read failed:', e);
      }
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

type AndroidPrayerStaticState = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

const ANDROID_PRAYER_STATIC_WIDGETS = new Set(['prayerSingle', 'prayerTable', 'prayerNextPrevious']);
const ANDROID_PRAYER_STATIC_STATES: AndroidPrayerStaticState[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function normalizeAndroidPrayerStaticState(value?: string): AndroidPrayerStaticState | null {
  const normalized = String(value ?? '').toLowerCase();
  return (ANDROID_PRAYER_STATIC_STATES as string[]).includes(normalized)
    ? normalized as AndroidPrayerStaticState
    : null;
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
    // Device 12/24h preference — single source of truth for every widget time
    // string (baked + live overlay). Read once so the whole payload is consistent.
    const use24 = deviceUses24Hour();
    const settings = await getWidgetSettings();

    const effectiveCalc = await getEffectivePrayerCalcSettings();
    const storedLocation = await getStoredLocation();
    const displayTimezone = deviceTimezone();
    let canonicalSnapshot: CanonicalPrayerSnapshot | null = await loadCanonicalPrayerSnapshot({
      settings: {
        calculationMethod: effectiveCalc.calculationMethod as any,
        asrJuristic: effectiveCalc.asrJuristic,
        adjustments: effectiveCalc.adjustments as any,
      },
      location: storedLocation,
      allowAnySameDayLocation: !storedLocation,
    });
    if (
      canonicalSnapshot
      && canonicalSnapshot.timezone !== displayTimezone
    ) {
      canonicalSnapshot = null;
    }

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
              timezone: displayTimezone,
            });
            await saveCanonicalPrayerSnapshot(canonicalSnapshot);
          }
        }
      } catch {}
    }

    // Track whether we have a REAL prayer source (explicit arg, canonical
    // snapshot, or offline calc from stored coords). When false, every reader
    // must render an intentional "enable location" placeholder rather than the
    // Makkah/sample fallback values below.
    const hasRealLocation = !!effectivePrayerTimes;

    // Last-resort Makkah fallback: keep the countdown/epoch machinery happy and
    // never crash on "--:--". The needsLocation flag (threaded below) tells the
    // UI layers NOT to display these as if they were the user's real times.
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
    await writePrayerInputs().catch(() => null);

    const settledResults = await Promise.allSettled([
      preparePrayerWidgetData(effectivePrayerTimes, location, lang, canonicalSnapshot, use24, !hasRealLocation),
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
    // widgetLanguage is a user-selectable widget override (auto/ar/en) read from
    // the display prefs below. 'auto' follows the app's main language (Arabic UI
    // → Arabic widgets, otherwise English). Resolved to a binary 'ar'|'en' after
    // the settings block.
    let widgetFontVariant: 'widget1' | 'widget2' = 'widget1';
    let widgetCalendar = 'auto';
    let widgetDayCalendar = 'auto';
    let widgetMonthCalendar = 'auto';
    let widgetNumerals = 'auto';
    let widgetTheme = 'auto';
    let widgetLanguageSetting: 'auto' | 'ar' | 'en' = 'auto';
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
        if (d?.widgetLanguage) widgetLanguageSetting = d.widgetLanguage;
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
        if (d?.widgetLanguage) widgetLanguageSetting = d.widgetLanguage;
        if (d?.widgetDateFormat) widgetDateFormat = d.widgetDateFormat;
      }
      const displayOverride = options.displayOverride;
      if (displayOverride) {
        if (displayOverride.widgetFontVariant === 'widget1' || displayOverride.widgetFontVariant === 'widget2') {
          widgetFontVariant = displayOverride.widgetFontVariant;
        }
        if (displayOverride.widgetCalendar) widgetCalendar = displayOverride.widgetCalendar;
        if (displayOverride.widgetDayCalendar) widgetDayCalendar = displayOverride.widgetDayCalendar;
        if (displayOverride.widgetMonthCalendar) widgetMonthCalendar = displayOverride.widgetMonthCalendar;
        if (displayOverride.widgetNumerals) widgetNumerals = displayOverride.widgetNumerals;
        if (displayOverride.widgetTheme) widgetTheme = displayOverride.widgetTheme;
        if (displayOverride.widgetLanguage) widgetLanguageSetting = displayOverride.widgetLanguage;
        if (displayOverride.widgetDateFormat) widgetDateFormat = displayOverride.widgetDateFormat;
        logWidgetTheme('applied immediate display override (updateWidgetData):', displayOverride);
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

    // Resolve the widget language: explicit ar/en wins; 'auto' follows the app
    // language. Used for the baked snapshot, prayer templates, the single-state
    // prune, and the widgetLanguage published to native (content data is already
    // bilingual, so the render language is decided by this flag, not data prep).
    // A widget ALWAYS renders in the app language — the per-widget language
    // override was removed so the bake, the placed widget, and the app can never
    // disagree or mix AR/EN. (`widgetLanguageSetting` is intentionally ignored.)
    void widgetLanguageSetting;
    const widgetLanguage: 'ar' | 'en' = (lang === 'ar' || lang === 'ur') ? 'ar' : 'en';

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

    // Generate / roll forward the 365-ayah verse pool. Idempotent —
    // when N days elapsed since the last seed, N consumed entries are
    // dropped and N new random ayat are appended so the widget keeps a
    // full year of daily content queued.
    let versePool: SharedWidgetData['versePool'] | undefined;
    try {
      const { ensureVersePool } = require('./verse-pool');
      const pool = await ensureVersePool();
      if (pool && Array.isArray(pool.entries) && pool.entries.length > 0) {
        versePool = {
          entries: pool.entries,
          seedDayOfYear: pool.seedDayOfYear,
          seedYear: pool.seedYear,
          generatedAt: pool.generatedAt,
        };
      }
    } catch (e) {
      if (__DEV__) console.warn('[widget/verse-pool] ensure failed:', e);
    }

    // Build morning + evening azkar pools (chunks + Quran-title pre-computed)
    // so the Android RN preview can pick the same chunk that iOS's SwiftUI
    // BundledAzkar.currentSlot picks at the same minute. Without this the
    // Android azkar widgets fall back to a hardcoded sample and Android +
    // iOS drift apart visually.
    let azkarPools: SharedWidgetData['azkarPools'] | undefined;
    try {
      const { prepareAzkarPools } = require('./widget-data');
      azkarPools = prepareAzkarPools();
    } catch (e) {
      if (__DEV__) console.warn('[widget/azkar-pools] build failed:', e);
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
      use24Hour: use24,
      hijriOffset,
      versePool,
      azkarPools,
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
    // True when a placed widget's snapshot PNG is missing on disk — forces a
    // re-bake even if content is unchanged (H1) and arms the H2 recovery retry.
    let missingPlacedFile = false;

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
        language: widgetLanguage,
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
        // If any placed widget's PNG is missing on disk, force a re-bake even when
        // the per-theme hash matches — otherwise the pump hash-skips and the widget
        // stays on the "open the app" fallback forever (gap b). Self-limiting once
        // the file exists.
        missingPlacedFile = await anyPlacedSnapshotFileMissing(previousSharedData, placedRouteKeys);
        if (__DEV__ && missingPlacedFile) {
          console.log('[widget/refresh] missingPlacedFile=true → forcing snapshot regeneration');
        }
        const snapshotT0 = Date.now();
        const result = await pumpThemesFromCurrentState?.([activeTheme], {
          debounceMs: 0,
          force: !!options.forceSnapshots || !!options.clearSnapshotCache || missingPlacedFile,
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
        // Android single-state: keep only the active theme's previous entries
        // (for placed widgets we didn't re-bake this run) plus the freshly
        // generated ones — every other theme is being pruned off disk below.
        // iOS keeps ALL themes in the manifest so the native Edit Widget picker
        // can resolve a PNG for any selectable appearance.
        snapshotManifest = Platform.OS === 'android'
          ? {
              ...pruneManifestToTheme(previousSharedData?.snapshotManifest, activeTheme),
              ...generatedManifest,
            }
          : mergeSnapshotManifest(previousSharedData, generatedManifest);
        if (Platform.OS === 'android') {
          const { ensureAndroidPrayerStaticTemplates } = require('./widgets/snapshot');
          // Generate ALL six prayer-state templates for EVERY prayer widget/size
          // of the ACTIVE theme — UNCONDITIONALLY (no `targets`, so it doesn't
          // depend on placed-widget detection). The previous version gated this
          // on `placedRouteKeys`, which is empty when `getWidgetInfo` returns
          // nothing (fresh manifest / flaky detection); the templates then never
          // generated and the widget served the stale gallery PNG all day — the
          // reported "الفجر/الظهر with the wrong time + wrong highlight". Omitting
          // `targets` makes ensureAndroidPrayerStaticTemplates bake the full
          // "all prayer kinds × sizes × 6 states" matrix for this theme. It is
          // signature-gated, so repeat calls are a cheap no-op once generated.
          const templates = await ensureAndroidPrayerStaticTemplates?.({
            theme: activeTheme,
            language: widgetLanguage,
            force: !!options.clearSnapshotCache,
          });
          if (templates?.errors?.length) {
            throw new Error(`android_prayer_template_generation_failed:${templates.errors.join('|')}`);
          }
          if (__DEV__) {
            console.log(
              `[widget/android] all-state prayer templates ready (active theme=${activeTheme}) generated=${templates?.generated ?? 0} skipped=${templates?.skipped ?? false}`,
            );
          }
        }
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
      // H2: a recovery bake (triggered because a placed PNG was missing) failed —
      // usually a transient capture error (fonts not yet applied, SnapshotHost not
      // mounted, app backgrounded mid-capture). Retry once, shortly, so it
      // self-heals within this session instead of waiting for the next manual open.
      if (missingPlacedFile && !recoveryRetryScheduled) {
        recoveryRetryScheduled = true;
        setTimeout(() => {
          updateWidgetData(undefined, undefined, { forceSnapshots: true })
            .catch(() => {})
            .finally(() => { recoveryRetryScheduled = false; });
        }, 1500);
      }
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
    await scheduleAndroidContentWidgetRefresh();

    // Trigger native widget refresh on both platforms (after active snapshot is ready).
    await triggerNativeWidgetReload(sharedData);

    if ((Platform.OS === 'android' || Platform.OS === 'ios') && activeThemeForPrewarm) {
      const prewarmTheme = activeThemeForPrewarm;
      const prewarmLang: 'ar' | 'en' = widgetLanguage;
      setTimeout(() => {
        (async () => {
          try {
            const prewarmT0 = Date.now();
            const { pumpThemesFromCurrentState } = require('./widgets/pump');

            if (Platform.OS === 'ios') {
              // iOS keeps ALL themes baked so the native "Edit Widget" theme
              // picker (RoohTheme AppEnum) can switch a placed widget's
              // appearance while the app is closed — every selectable theme's
              // PNG must already exist in the App Group. Filenames are
              // id_size_theme(_vN); cleanup on the last theme drops only stale
              // snapshot-version files, never a live theme. No single-state prune.
              const { RESOLVED_WIDGET_THEMES } = require('./widgets/snapshot');
              const themes: string[] = Array.from(RESOLVED_WIDGET_THEMES ?? [prewarmTheme]);
              let prewarmEntries = 0;
              for (const theme of themes) {
                const themeResult = await pumpThemesFromCurrentState?.([theme], {
                  debounceMs: 0,
                  force: false,
                  includeRouteKeys: undefined,
                  cleanup: theme === themes[themes.length - 1],
                  commit: false,
                });
                if (themeResult?.entries?.length) {
                  prewarmEntries += themeResult.entries.length;
                  const prewarmManifest = buildManifestFromEntries(themeResult.entries, new Date().toISOString());
                  const latest = await readCachedSharedData();
                  if (latest) {
                    await writeToSharedStorage(
                      WIDGET_DATA_KEY,
                      JSON.stringify({ ...latest, snapshotManifest: mergeSnapshotManifest(latest, prewarmManifest) }),
                    );
                  }
                }
              }
              if (__DEV__) console.log(`[widget/refresh] iosBackgroundPrewarmMs=${Date.now() - prewarmT0} entries=${prewarmEntries}`);
              await triggerNativeWidgetReload((await readCachedSharedData()) ?? sharedData);
              return;
            }

            // Android single-state model: never pre-bake other themes. Complete
            // the rest of the ACTIVE theme's gallery (widgets the user hasn't
            // placed yet) so a later placement finds its PNG instantly — the
            // foreground pass already baked the placed ones. `includeRouteKeys:
            // undefined` bakes the whole active-theme registry; signature-gated
            // so already-baked tiles are a cheap no-op.
            const result = await pumpThemesFromCurrentState?.([prewarmTheme], {
              debounceMs: 0,
              force: false,
              includeRouteKeys: undefined,
              cleanup: false,
              commit: false,
            });
            let latest = await readCachedSharedData();
            if (result?.entries?.length && latest) {
              const prewarmManifest = buildManifestFromEntries(result.entries, new Date().toISOString());
              latest = {
                ...latest,
                snapshotManifest: {
                  ...pruneManifestToTheme(latest.snapshotManifest, prewarmTheme),
                  ...prewarmManifest,
                },
              };
              await writeToSharedStorage(WIDGET_DATA_KEY, JSON.stringify(latest));
            }
            if (__DEV__) {
              console.log(`[widget/refresh] backgroundPrewarmMs=${Date.now() - prewarmT0} entries=${result?.entries?.length ?? 0}`);
            }
            if (Platform.OS === 'android') {
              // Bake the full prayer matrix (all kinds × sizes × 6 states) for the
              // ACTIVE theme + current language only. Signature-gated → cheap
              // no-op once generated. The foreground pass already did this when a
              // prayer widget is placed; this covers the gallery-complete case.
              const { ensureAndroidPrayerStaticTemplates } = require('./widgets/snapshot');
              const templates = await ensureAndroidPrayerStaticTemplates?.({
                theme: prewarmTheme,
                language: prewarmLang,
                force: false,
              });
              if (__DEV__) {
                console.log(`[widget/android] backgroundPrayerTemplates generated=${templates?.generated ?? 0} skipped=${templates?.skipped ?? false}`);
              }
            }
            // Single-state disk hygiene: delete every snapshot/template that is
            // not the active theme + current language, then refresh on-screen
            // widgets against the pruned manifest.
            const { pruneSnapshotsToActiveState } = require('./widgets/snapshot');
            await pruneSnapshotsToActiveState?.(prewarmTheme, prewarmLang);
            await triggerNativeWidgetReload(latest ?? sharedData);
          } catch (e) {
            if (__DEV__) console.warn('[widget/refresh] background prewarm skipped:', e);
          }
        })();
      }, 5000);
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
        const effective = await getEffectivePrayerCalcSettings();
        const response = await fetchPrayerTimes(location, tomorrow, {
          calculationMethod: effective.calculationMethod as any,
          asrJuristic: effective.asrJuristic as any,
          adjustments: effective.adjustments as any,
        } as any);
        if (response?.timings) {
          const parsed = parsePrayerTimes(response);
          const adjusted = applyAdjustments(parsed, effective.adjustments as any);
          await cachePrayerTimes(tomorrowStr, adjusted, effective.calculationMethod, effective.asrJuristic);
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
