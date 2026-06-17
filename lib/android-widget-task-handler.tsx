// lib/android-widget-task-handler.tsx
// Task handler for react-native-android-widget
// If a widget is added before the user has ever launched the app, show an
// explicit "open the app first" state. After first launch, WIDGET_ADDED /
// WIDGET_UPDATE read cached data and fall back to fresh generation when needed.

import React from 'react';
import { Appearance } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SharedWidgetData } from './widget-data';
import { getPrayerNameAr, getPrayerNameEn, isFridayDate } from './prayer-times';
import { formatEpochTimeInTimeZone } from './widget-timezone';
import { deviceUses24Hour } from './widget-clock-format';
import { nextPrayerStaticState, resolvePrayerTableState } from './widget-prayer-table-state';
import {
  prayerStaticAssetName,
  prayerStaticAssetPath,
  prayerStaticAssetExistsOnDevice,
  defaultPreviousFor,
  type PrayerLang,
  type PrayerStateKey,
  type PrayerTheme,
} from './widget-android-asset-resolver';

/**
 * Map the resolved next/previous prayer state to the asset token, applying the
 * Friday "Jumuah" override: on Fridays a Dhuhr slot uses the baked "صلاة الجمعة"
 * variant. Runs in the headless task too, so Friday is correct even closed-app
 * (the per-state jumuah templates are always baked up front).
 */
function resolveFridayPrayerStates(prayer: SharedWidgetData['prayer'], now: Date): { active: PrayerStateKey | null; previous: PrayerStateKey } {
  const rawActive = nextPrayerStaticState(prayer);
  const validStates = new Set<PrayerStateKey>(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']);
  let active: PrayerStateKey | null = rawActive && validStates.has(rawActive as PrayerStateKey) ? (rawActive as PrayerStateKey) : null;
  const ts = resolvePrayerTableState(prayer, now.getTime());
  let previous: PrayerStateKey = (ts.previousKey as PrayerStateKey | undefined) ?? (active ? defaultPreviousFor(active) : 'sunrise');
  if (isFridayDate(now)) {
    if (active === 'dhuhr') active = 'jumuah';
    if (previous === 'dhuhr') previous = 'jumuah';
  }
  return { active, previous };
}

import {
  SnapshotWidget,
  snapshotFilePath,
  snapshotFilePathForKey,
  snapshotRouteKeyForPlacement,
  type AndroidSize,
} from '@/components/widgets/android/SnapshotWidget';
import { LockedWidget } from '@/components/widgets/android/LockedWidget';
import { AppNotOpenedWidget } from '@/components/widgets/android/AppNotOpenedWidget';
import { CuratedImageWidget } from '@/components/widgets/android/CuratedImageWidget';
import { ArabicOnlyWidget } from '@/components/widgets/android/ArabicOnlyWidget';
import { LocationNeededWidget } from '@/components/widgets/android/LocationNeededWidget';
import { WidgetFallbackNotice } from '@/components/widgets/android/WidgetFallbackNotice';
import { isCuratedWidget, type CuratedWidgetId } from '@/lib/widgets/curated-images';

const WIDGET_DATA_KEY = 'widget_shared_data';
const SUBSCRIPTION_STATE_KEY = '@subscription_state';
export const APP_OPENED_ONCE_KEY = '@rooh_app_opened_once';
/** Set to "true" when WIDGET_ADDED fires. SnapshotPumpController reads &
 *  clears this on the next foreground pass to force a re-pump. */
const PUMP_PENDING_KEY = '@widget_pump_pending';
/** Sticky list of provider names that have ever been placed on the home screen.
 *  The headless task cannot bake PNGs, so getActiveSnapshotRouteKeys() (in
 *  widget-data-bridge) unions this set with the (timing-sensitive) live
 *  getWidgetInfo() result — guaranteeing a placed widget's route key stays in the
 *  foreground bake set even when getWidgetInfo() momentarily returns empty. */
const PLACED_PROVIDERS_KEY = '@widget_placed_providers';

// Widget provider names permitted without premium on WIDGET_ADDED. Derived from
// LEGACY_ANDROID_WIDGET_MAP + premiumRequiredForSize so it matches gallery/iOS gating.
import {
  androidWidgetProviderNames,
  androidWidgetProviderTarget,
  getDefinition,
  isAndroidLockWidgetProvider,
  premiumRequiredForSize,
} from './widgets/registry';
import { resolveWidgetTheme } from './widgets/snapshot';

const FREE_WIDGET_NAMES = (() => {
  const free = new Set<string>();
  for (const legacyName of androidWidgetProviderNames()) {
    const mapped = androidWidgetProviderTarget(legacyName);
    if (!mapped) continue;
    const def = getDefinition(mapped.id);
    if (!def) continue;
    if (!premiumRequiredForSize(def, mapped.size)) free.add(legacyName);
  }
  return Array.from(free);
})();

async function isUserPremium(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTION_STATE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw);
    if (!state.isPremium) return false;
    // Check expiry (lifetime has null expiresAt)
    if (state.expiresAt && new Date(state.expiresAt) < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}

async function loadWidgetData(): Promise<SharedWidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

async function persistWidgetData(data: SharedWidgetData): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  } catch {
    // A widget update should still render the freshly computed in-memory data.
  }
}

async function hasAppEverOpened(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(APP_OPENED_ONCE_KEY);
    if (value === 'true') return true;
    // Older builds wrote this after first user registration. Treat either value
    // as proof that the full app has run at least once.
    const legacyFirstOpen = await AsyncStorage.getItem('@rooh_first_open');
    return legacyFirstOpen !== null;
  } catch {
    return false;
  }
}

async function readPlacedProviders(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PLACED_PROVIDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Append a provider to the sticky placed-providers set (idempotent). */
async function recordPlacedProvider(widgetName: string): Promise<void> {
  try {
    const current = await readPlacedProviders();
    if (current.includes(widgetName)) return;
    await AsyncStorage.setItem(PLACED_PROVIDERS_KEY, JSON.stringify([...current, widgetName]));
  } catch {
    // Best-effort — a missed write just means we fall back to live detection.
  }
}

/**
 * Drop a provider from the sticky set, but ONLY when getWidgetInfo() confirms
 * zero remaining instances. A stale entry costs at most one extra offscreen
 * capture per foreground (harmless); dropping a still-placed provider would
 * reintroduce the missing-PNG bug — so we err toward keeping it.
 */
async function forgetPlacedProviderIfGone(widgetName: string): Promise<void> {
  try {
    const current = await readPlacedProviders();
    if (!current.includes(widgetName)) return;
    let stillPlaced = false;
    try {
      const { getWidgetInfo } = require('react-native-android-widget');
      const placements = await getWidgetInfo(widgetName).catch(() => null);
      // Only trust a definitive empty array. null / throw means we couldn't
      // confirm, so keep the entry.
      if (placements == null) return;
      stillPlaced = Array.isArray(placements) && placements.length > 0;
    } catch {
      return;
    }
    if (stillPlaced) return;
    await AsyncStorage.setItem(
      PLACED_PROVIDERS_KEY,
      JSON.stringify(current.filter((p) => p !== widgetName)),
    );
  } catch {
    // ignore
  }
}

/**
 * Generate minimal fallback data so widgets render immediately
 * even when the full app hasn't loaded prayer times yet.
 */
function generateFallbackData(): SharedWidgetData {
  const now = new Date();
  const todayDate = now.toISOString().split('T')[0]!;
  const timestamp = now.toISOString();

  // Try to compute Hijri date
  let hijriDay = 1;
  let hijriMonth = 'محرم';
  let hijriYear = 1447;
  let hijriDate = '';
  try {
    const { getLocalizedHijriDate } = require('./hijri-date');
    const hijri = getLocalizedHijriDate();
    if (hijri) {
      hijriDay = hijri.day;
      hijriMonth = hijri.monthName;
      hijriYear = hijri.year;
      hijriDate = `${hijri.day} ${hijri.monthName} ${hijri.year}`;
    }
  } catch {}

  // Basic prayer names
  const prayerNames = [
    { name: 'Fajr', nameAr: 'الفجر' },
    { name: getPrayerNameEn('dhuhr', now), nameAr: getPrayerNameAr('dhuhr', now) },
    { name: 'Asr', nameAr: 'العصر' },
    { name: 'Maghrib', nameAr: 'المغرب' },
    { name: 'Isha', nameAr: 'العشاء' },
  ];

  return {
    prayer: {
      nextPrayer: 'fajr',
      nextPrayerName: 'Fajr',
      nextPrayerNameAr: 'الفجر',
      nextPrayerTime: 'افتح التطبيق',
      nextPrayerAtEpochMs: now.getTime() + 60 * 60 * 1000,
      previousPrayerName: 'Isha',
      previousPrayerNameAr: 'العشاء',
      previousPrayerAtEpochMs: now.getTime() - 60 * 60 * 1000,
      calculationLocation: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      prayerDataUpdatedAt: timestamp,
      timeRemaining: '...',
      timeRemainingMinutes: 0,
      timeRemainingLabel: 'الوقت المتبقي',
      allPrayers: prayerNames.map((p, i) => ({
        name: p.name,
        nameAr: p.nameAr,
        time: '--:--',
        isPassed: false,
        isNext: i === 0,
      })),
      hijriDate,
      hijriDay,
      hijriMonth,
      hijriMonthEn: hijriMonth,
      hijriYear,
      gregorianDate: now.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' }),
      location: '',
      lastUpdated: timestamp,
    },
    azkar: {
      randomZikr: {
        id: '1',
        text: 'سبحان الله وبحمده سبحان الله العظيم',
        count: 100,
        timesLabel: 'مرة',
        category: 'misc',
        categoryName: 'أذكار عامة',
      },
      morningCompleted: false,
      eveningCompleted: false,
      lastUpdated: timestamp,
    },
    verse: {
      arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      surahName: 'سورة الفاتحة',
      surahNameEn: 'Al-Fatiha',
      ayahNumber: 1,
      numberInSurah: 1,
      date: todayDate,
      lastUpdated: timestamp,
    },
    dhikr: {
      arabic: 'لا إله إلا الله وحده لا شريك له',
      count: 100,
      timesLabel: 'مرة',
      category: 'misc',
      categoryName: 'تهليل',
      date: todayDate,
      lastUpdated: timestamp,
    },
    prayerCompletion: {
      date: todayDate,
      prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      lastUpdated: timestamp,
    },
    settings: {
      enabled: true,
      prayerWidget: { enabled: true, showAllPrayers: true, showHijriDate: true, showLocation: true, showCompletion: true },
      azkarWidget: { enabled: true, showTranslation: false, categories: ['morning', 'evening', 'misc'] },
      hijriWidget: { enabled: true, showGregorian: true },
      verseWidget: { enabled: true, showTranslation: false },
      dhikrWidget: { enabled: true, showTranslation: false, showBenefit: true },
    },
    language: 'ar',
  };
}

/**
 * Resolve the (id, size) registry tuple for a placed widget by its provider
 * name. All shipped legacy providers are listed in `LEGACY_ANDROID_WIDGET_MAP`.
 * Returns null for unknown providers (which the caller treats as a no-op so we
 * don't render an inert widget).
 */
function resolveTarget(widgetName: string): { id: string; size: AndroidSize } | null {
  const t = androidWidgetProviderTarget(widgetName);
  if (!t) return null;
  return { id: t.id, size: t.size as AndroidSize };
}

const PRAYER_WIDGET_IDS = new Set(['prayerSingle', 'prayerTable', 'prayerNextPrevious']);

function isPrayerWidget(widgetName: string): boolean {
  const t = resolveTarget(widgetName);
  return !!t && PRAYER_WIDGET_IDS.has(t.id);
}

/**
 * Refresh prayer widgets without requiring the foreground app.
 *
 * Prefer the app's canonical API-backed rows while they still cover the
 * selected location's current day. This keeps the widget byte-for-byte aligned
 * with the Prayer tab, including provider-specific minute rounding. Once that
 * cache has expired, fall back to the local adhan calculation so a placed
 * widget continues working indefinitely while the app stays closed.
 */
async function refreshPrayerWidgetData(
  widgetName: string,
  data: SharedWidgetData,
): Promise<SharedWidgetData> {
  if (!isPrayerWidget(widgetName)) return data;
  try {
    const {
      readPrayerInputs,
      computeFlatSnapshot,
      PRAYER_ORDER,
    } = require('./widget-prayer-calculator');
    const now = new Date();
    const cachedRows = (data.prayer?.allPrayers ?? [])
      .map((row, index) => ({
        ...row,
        key: (PRAYER_ORDER as string[])[index],
        epochMs: Number(row.epochMs),
      }))
      .filter((row) => row.key && Number.isFinite(row.epochMs) && row.epochMs > 0)
      .sort((a, b) => a.epochMs - b.epochMs);
    const cachedNext = cachedRows.find((row) => row.epochMs > now.getTime());
    if (cachedNext) {
      const cachedPrevious = [...cachedRows].reverse().find((row) => row.epochMs <= now.getTime());
      const remainingSeconds = Math.max(0, Math.floor((cachedNext.epochMs - now.getTime()) / 1000));
      const merged: SharedWidgetData = {
        ...data,
        prayer: {
          ...(data.prayer ?? {}),
          nextPrayer: cachedNext.key,
          nextPrayerName: cachedNext.name,
          nextPrayerNameAr: cachedNext.nameAr,
          nextPrayerTime: cachedNext.time,
          nextPrayerAtEpochMs: cachedNext.epochMs,
          previousPrayerName: cachedPrevious?.name ?? data.prayer?.previousPrayerName,
          previousPrayerNameAr: cachedPrevious?.nameAr ?? data.prayer?.previousPrayerNameAr,
          previousPrayerAtEpochMs: cachedPrevious?.epochMs ?? data.prayer?.previousPrayerAtEpochMs,
          timeRemainingMinutes: Math.floor(remainingSeconds / 60),
          allPrayers: cachedRows.map((row) => ({
            name: row.name,
            nameAr: row.nameAr,
            time: row.time,
            epochMs: row.epochMs,
            isPassed: row.epochMs <= now.getTime(),
            isNext: row.epochMs === cachedNext.epochMs,
          })),
        } as SharedWidgetData['prayer'],
      };
      if (__DEV__) {
        console.log('[widget/android] refreshed prayer data from canonical day cache', {
          next: cachedNext.key,
          nextAt: new Date(cachedNext.epochMs).toISOString(),
          source: data.prayer?.source,
        });
      }
      return merged;
    }

    const inputs = await readPrayerInputs();
    if (!inputs) return data;
    const snapshot = computeFlatSnapshot(inputs, now, 7);
    // Map prayer keys to display names.
    const nameMap: Record<string, { en: string; ar: string }> = {
      fajr:    { en: getPrayerNameEn('fajr', now),    ar: getPrayerNameAr('fajr', now) },
      sunrise: { en: getPrayerNameEn('sunrise', now), ar: getPrayerNameAr('sunrise', now) },
      dhuhr:   { en: getPrayerNameEn('dhuhr', now),   ar: getPrayerNameAr('dhuhr', now) },
      asr:     { en: getPrayerNameEn('asr', now),     ar: getPrayerNameAr('asr', now) },
      maghrib: { en: getPrayerNameEn('maghrib', now), ar: getPrayerNameAr('maghrib', now) },
      isha:    { en: getPrayerNameEn('isha', now),    ar: getPrayerNameAr('isha', now) },
    };
    const isAr = data.widgetLanguage === 'ar' || (!data.widgetLanguage && (data.language || 'ar') === 'ar');
    const use24 = deviceUses24Hour();
    const formatWidgetTime = (ms: number) => {
      return formatEpochTimeInTimeZone(ms, inputs.timezone, isAr ? 'ar' : 'en', use24) ?? '--:--';
    };
    const nextNames = nameMap[snapshot.next] ?? nameMap.fajr;
    const prevNames = nameMap[snapshot.previous] ?? nameMap.isha;
    const allPrayers = (PRAYER_ORDER as string[]).map((key) => ({
      name: nameMap[key].en,
      nameAr: nameMap[key].ar,
      time: formatWidgetTime(snapshot.todayTimes[key]),
      epochMs: snapshot.todayTimes[key],
      isPassed: snapshot.todayTimes[key] <= now.getTime(),
      isNext: key === snapshot.next,
    }));
    const merged: SharedWidgetData = {
      ...data,
      prayer: {
        ...(data.prayer ?? {}),
        nextPrayer: snapshot.next,
        nextPrayerName: nextNames.en,
        nextPrayerNameAr: nextNames.ar,
        nextPrayerTime: formatWidgetTime(snapshot.nextAtEpochMs),
        nextPrayerAtEpochMs: snapshot.nextAtEpochMs,
        previousPrayerName: prevNames.en,
        previousPrayerNameAr: prevNames.ar,
        previousPrayerAtEpochMs: snapshot.previousAtEpochMs,
        timezone: inputs.timezone,
        allPrayers,
        allPrayerEpochs: snapshot.allPrayerEpochs,
        source: 'widget-local-adhan',
        prayerDataUpdatedAt: new Date().toISOString(),
      } as SharedWidgetData['prayer'],
    };
    if (__DEV__) {
      console.log('[widget/android] refreshed prayer data offline', {
        next: snapshot.next,
        nextAt: new Date(snapshot.nextAtEpochMs).toISOString(),
      });
    }
    return merged;
  } catch (e) {
    if (__DEV__) console.warn('[widget/android] offline prayer refresh failed:', e);
    return data;
  }
}

/**
 * The render decision for a single Android widget placement. Computed once by the
 * async `decideAndroidWidget` (which may stat the filesystem, read prayer inputs,
 * etc.) and then turned into a React element by the pure, synchronous
 * `renderAndroidWidgetDecision`.
 *
 * Splitting decide/render is what lets BOTH render entry points share identical
 * logic: the headless task handler (async, imperative `renderWidget(jsx)`) and
 * the in-app `requestWidgetUpdate` fan-out (whose `renderWidget` callback must
 * return an element SYNCHRONOUSLY). Before this split the fan-out path rendered
 * SnapshotWidget directly and silently skipped the Arabic-only / location /
 * curated guards — so a language switch produced mixed/blank widgets until an
 * organic Android update happened to route through the task handler.
 */
export type AndroidWidgetDecision =
  | { kind: 'arabicOnly'; size: AndroidSize; theme: string }
  | { kind: 'location'; size: AndroidSize; theme: string; isArabic: boolean; clickUri: string }
  | { kind: 'curated'; id: CuratedWidgetId; size: 'small' | 'medium'; theme: string; clickUri: string }
  | {
      kind: 'snapshot';
      id: string;
      size: AndroidSize;
      hasSnapshot: boolean;
      missingKey?: string;
      snapshotKey: string;
      snapshotPath: string;
      fallbackReason?: string;
      isPrayerStaticTemplate: boolean;
      clickUri: string;
    }
  | { kind: 'fallbackNotice'; id: string; size: AndroidSize; theme: string; isArabic: boolean; clickUri: string };

/** A widget's language ALWAYS follows the app language (widgetLanguage override
 *  wins when explicitly 'ar'/'en'). Single source of truth for every guard. */
function resolveWidgetLangFromData(data: SharedWidgetData): 'ar' | 'en' {
  return data.widgetLanguage === 'ar'
    ? 'ar'
    : data.widgetLanguage === 'en'
      ? 'en'
      : (data.language || 'ar') === 'ar' ? 'ar' : 'en';
}

/**
 * Resolve which widget element a placement should render, doing all async work
 * (language resolution, location check, prayer per-state template lookup, PNG
 * stat) up front. Returns `null` only when the provider name is unknown.
 *
 * Deep-link tap targets are read straight from the registry (`def.deepLink`) —
 * the single source of truth — except the Arabic-only fallback, whose tap always
 * goes to Language settings so the user can un-break it.
 */
export async function decideAndroidWidget(
  widgetName: string,
  data: SharedWidgetData,
): Promise<AndroidWidgetDecision | null> {
  const target = resolveTarget(widgetName);
  if (!target) return null;

  const lang = resolveWidgetLangFromData(data);
  const theme = resolveWidgetTheme(data.widgetTheme, Appearance.getColorScheme());
  const def = getDefinition(target.id);
  const clickUri = def?.deepLink ?? 'rooh-almuslim://widget';

  // 1) Arabic-only widgets (forcedLanguage: 'ar' — curated verse/azkar/dhikr +
  // calligraphic day/month-thuluth) show an English "Arabic only" notice when
  // the app language isn't Arabic, instead of mixed/empty content.
  if (def?.forcedLanguage === 'ar' && lang === 'en') {
    return { kind: 'arabicOnly', size: target.size, theme };
  }

  // 2) Prayer widgets with no stored location and no usable cached times: show a
  // "enable location" notice instead of wrong/default times.
  if (PRAYER_WIDGET_IDS.has(target.id)) {
    try {
      const { readPrayerInputs } = require('./widget-prayer-calculator');
      const inputs = await readPrayerInputs();
      const hasFiniteEpoch = (data.prayer?.allPrayers ?? []).some(
        (r) => Number.isFinite(Number(r.epochMs)) && Number(r.epochMs) > 0,
      );
      if (!inputs && !hasFiniteEpoch) {
        return { kind: 'location', size: target.size, theme, isArabic: lang === 'ar', clickUri };
      }
    } catch {
      // If the location check fails, fall through to the normal render path.
    }
  }

  // 3) Curated bundled-image widgets (verse/azkar/dhikr): Arabic-only, tinted to
  // the theme over a native themed background, picked by date — offline-forever.
  if (isCuratedWidget(target.id)) {
    return {
      kind: 'curated',
      id: target.id as CuratedWidgetId,
      size: target.size as 'small' | 'medium',
      theme,
      clickUri,
    };
  }

  // 4) Snapshot (default): resolve the baked PNG route + per-state prayer template.
  try {
    const routeKey = snapshotRouteKeyForPlacement(target.id, target.size, theme);
    const manifestEntry = data.snapshotManifest?.[routeKey];
    const widgetLang = lang;
    let snapshotKey = manifestEntry?.key ?? routeKey;
    let path = manifestEntry?.path ?? (manifestEntry?.key
      ? snapshotFilePathForKey(manifestEntry.key)
      : snapshotFilePath(target.id, target.size, theme));
    let isPrayerStaticTemplate = false;
    if (PRAYER_WIDGET_IDS.has(target.id)) {
      const now = new Date();
      const { active, previous } = resolveFridayPrayerStates(data.prayer, now);
      if (active) {
        const templateOpts = {
          widgetId: target.id as 'prayerSingle' | 'prayerTable' | 'prayerNextPrevious',
          size: target.size,
          theme: theme as PrayerTheme,
          language: widgetLang as PrayerLang,
          active,
          previous,
          // Friday: the table swaps to the Jumuah-labeled per-state variant so the
          // Dhuhr row reads «صلاة الجمعة» all day (not just while Dhuhr is next).
          friday: isFridayDate(now),
        };
        if (await prayerStaticAssetExistsOnDevice(templateOpts)) {
          snapshotKey = prayerStaticAssetName(templateOpts);
          path = prayerStaticAssetPath(templateOpts);
          isPrayerStaticTemplate = true;
        }
      }
    }
    // Language guard: never serve a gallery PNG baked in a different language
    // than `widgetLang` — overlaying resolved-language names/times on stale
    // other-language chrome is what produced the AR/EN text overlap. Per-state
    // prayer templates are language-keyed in their filename already.
    const langMismatch = !isPrayerStaticTemplate
      && !!manifestEntry?.language
      && manifestEntry.language !== widgetLang;
    let hasSnapshot = false;
    let fallbackReason: string | undefined;
    try {
      const info = await FileSystem.getInfoAsync(path);
      hasSnapshot = info.exists && !langMismatch;
      if (!info.exists) fallbackReason = 'png_missing';
      else if (langMismatch) fallbackReason = `lang_mismatch:${manifestEntry?.language}!=${widgetLang}`;
    } catch (e) {
      fallbackReason = `stat_failed:${(e as Error)?.message ?? 'unknown'}`;
    }
    if (__DEV__) {
      const action = hasSnapshot ? 'loaded' : 'fallback';
      console.log(`[widget/android] ${action} snapshot route=${routeKey} key=${snapshotKey} path=${path}${fallbackReason ? ` reason=${fallbackReason}` : ''}`);
    }
    return {
      kind: 'snapshot',
      id: target.id,
      size: target.size,
      hasSnapshot,
      missingKey: hasSnapshot ? undefined : snapshotKey,
      snapshotKey,
      snapshotPath: path,
      fallbackReason,
      isPrayerStaticTemplate,
      clickUri,
    };
  } catch (e) {
    // Any failure in the snapshot path must never surface a raw error on the
    // home screen. Fall back to the bundled preview + "open the app" notice.
    if (__DEV__) console.warn('[widget/android] snapshot decision failed; using fallback notice:', e);
    return { kind: 'fallbackNotice', id: target.id, size: target.size, theme, isArabic: lang === 'ar', clickUri };
  }
}

/** Pure, synchronous render of a previously-computed decision. Safe to call from
 *  the `requestWidgetUpdate` callback (which must return an element synchronously). */
export function renderAndroidWidgetDecision(
  decision: AndroidWidgetDecision,
  data: SharedWidgetData,
  bounds?: { width?: number; height?: number },
): React.ReactElement | null {
  switch (decision.kind) {
    case 'arabicOnly':
      // Fixed tap target: Language settings (NOT the widget's own deepLink) so
      // the user lands where they can switch the app to Arabic and un-break it.
      return (
        <ArabicOnlyWidget
          size={decision.size}
          theme={decision.theme}
          widgetWidth={bounds?.width}
          widgetHeight={bounds?.height}
          clickUri="rooh-almuslim://settings/language"
        />
      );
    case 'location':
      return (
        <LocationNeededWidget theme={decision.theme} isArabic={decision.isArabic} clickUri={decision.clickUri} />
      );
    case 'curated':
      return (
        <CuratedImageWidget
          widgetId={decision.id}
          size={decision.size}
          theme={decision.theme}
          clickUri={decision.clickUri}
          widgetWidth={bounds?.width}
          widgetHeight={bounds?.height}
        />
      );
    case 'snapshot':
      return (
        <SnapshotWidget
          widgetId={decision.id}
          size={decision.size}
          data={data}
          hasSnapshot={decision.hasSnapshot}
          missingKey={decision.missingKey}
          snapshotKey={decision.snapshotKey}
          snapshotPath={decision.snapshotPath}
          fallbackReason={decision.fallbackReason}
          isPrayerStaticTemplate={decision.isPrayerStaticTemplate}
          widgetWidth={bounds?.width}
          widgetHeight={bounds?.height}
          clickAction="OPEN_URI"
          clickUri={decision.clickUri}
        />
      );
    case 'fallbackNotice':
      return (
        <WidgetFallbackNotice
          widgetId={decision.id}
          size={decision.size}
          theme={decision.theme}
          isArabic={decision.isArabic}
          widgetWidth={bounds?.width}
          widgetHeight={bounds?.height}
          clickAction="OPEN_URI"
          clickUri={decision.clickUri}
        />
      );
  }
}

async function renderSnapshotWidget(
  widgetName: string,
  data: SharedWidgetData,
  renderWidget: (jsx: React.ReactElement) => void,
  widgetBounds?: { width?: number; height?: number },
): Promise<void> {
  const decision = await decideAndroidWidget(widgetName, data);
  if (!decision) return;
  const element = renderAndroidWidgetDecision(decision, data, widgetBounds);
  if (element) renderWidget(element);
}

/** Render the universal graceful fallback (bundled preview + "open the app to
 *  refresh" banner). Used whenever a snapshot is missing or any render throws,
 *  so the user never sees a blank/error widget. */
function renderWidgetFallbackNotice(
  target: { id: string; size: string },
  data: SharedWidgetData | null,
  renderWidget: (jsx: React.ReactElement) => void,
  widgetBounds?: { width?: number; height?: number },
): void {
  const theme = resolveWidgetTheme(data?.widgetTheme, Appearance.getColorScheme());
  const isArabic = !(data?.widgetLanguage === 'en' || data?.language === 'en');
  renderWidget(
    <WidgetFallbackNotice
      widgetId={target.id}
      size={target.size}
      theme={theme}
      isArabic={isArabic}
      widgetWidth={widgetBounds?.width}
      widgetHeight={widgetBounds?.height}
      clickAction="OPEN_APP"
    />,
  );
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;
  const widgetName = widgetInfo.widgetName;

  // Load the persisted Hijri offsets (manual ±N + last-synced authoritative
  // system offset) into this (headless, cold) JS context BEFORE any synchronous
  // getLocalizedHijriDate() call below. Keeps the offline widget date correct
  // and rolling over day-by-day until the app is reopened online.
  try {
    const { hydrateHijriOffset } = require('./hijri-date');
    await hydrateHijriOffset();
  } catch {}

  try {
  switch (widgetAction) {
    case 'WIDGET_ADDED': {
      let data = await loadWidgetData();

      // Premium gate: non-free widgets require premium subscription
      if (!isAndroidLockWidgetProvider(widgetName) && !FREE_WIDGET_NAMES.includes(widgetName)) {
        const premium = await isUserPremium();
        if (!premium) {
          renderWidget(<LockedWidget widgetName={widgetName} data={data} />);
          return;
        }
      }

      // Flag the foreground pump to force-render on next launch even if the
      // hash matches. The headless task handler can't mount SnapshotHost, so
      // the snapshot PNGs are generated by the in-app pump.
      try { await AsyncStorage.setItem(PUMP_PENDING_KEY, 'true'); } catch {}

      // Remember this placement so the next foreground bake always includes its
      // route key, even if getWidgetInfo() is flaky on that pass.
      await recordPlacedProvider(widgetName);

      const appOpened = await hasAppEverOpened();

      // Widget just added — try to generate fresh data immediately only after
      // the app has launched once. Before that, show instructions instead of
      // silently writing generic Makkah/sample data.
      if (!data && !appOpened) {
        renderWidget(<AppNotOpenedWidget />);
        return;
      }

      if (!data) {
        // Try full sync first
        try {
          const { syncWidgetDataToNative } = require('./widget-native-sync');
          await syncWidgetDataToNative();
          data = await loadWidgetData();
        } catch {
          // Full sync failed — use fallback
        }
      }

      // Still no data? Generate fallback so the widget renders with content
      if (!data) {
        data = generateFallbackData();
        // Save fallback so future WIDGET_UPDATE reads it
        try {
          await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
        } catch {}
      }

      // Prayer widgets: recompute prayer times locally via adhan so the widget
      // stays accurate for weeks without the main app being opened.
      const fresh = await refreshPrayerWidgetData(widgetName, data);
      if (fresh !== data) await persistWidgetData(fresh);
      await renderSnapshotWidget(widgetName, fresh, renderWidget, widgetInfo);
      return;
    }

    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let data = await loadWidgetData();

      // Premium gate: non-free widgets require premium subscription
      if (!isAndroidLockWidgetProvider(widgetName) && !FREE_WIDGET_NAMES.includes(widgetName)) {
        const premium = await isUserPremium();
        if (!premium) {
          renderWidget(<LockedWidget widgetName={widgetName} data={data} />);
          return;
        }
      }

      const appOpened = await hasAppEverOpened();

      if (!data && !appOpened) {
        renderWidget(<AppNotOpenedWidget />);
        return;
      }

      // If no cached data, try sync then fallback
      if (!data) {
        try {
          const { syncWidgetDataToNative } = require('./widget-native-sync');
          await syncWidgetDataToNative();
          data = await loadWidgetData();
        } catch {}
      }

      if (!data) {
        data = generateFallbackData();
        try {
          await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
        } catch {}
      }

      // Prayer widgets: recompute prayer times locally via adhan so the widget
      // stays accurate for weeks without the main app being opened.
      const fresh = await refreshPrayerWidgetData(widgetName, data);
      if (fresh !== data) await persistWidgetData(fresh);
      await renderSnapshotWidget(widgetName, fresh, renderWidget, widgetInfo);
      return;
    }

    case 'WIDGET_DELETED':
      // Only drop the sticky entry when no instances of this provider remain.
      await forgetPlacedProviderIfGone(widgetName);
      return;
    case 'WIDGET_CLICK':
    default:
      return;
  }
  } catch (e) {
    // Ultimate safety net: an unhandled error must never surface a raw or blank
    // widget. Show the graceful fallback (bundled preview + "open the app"
    // notice) instead, degrading to the simplest possible render if even that
    // fails.
    if (__DEV__) console.warn('[widget/android] task handler failed; showing fallback notice:', e);
    try {
      const target = resolveTarget(widgetName);
      if (target) {
        const data = await loadWidgetData();
        renderWidgetFallbackNotice(target, data, renderWidget, widgetInfo);
      } else {
        renderWidget(<AppNotOpenedWidget />);
      }
    } catch {
      try { renderWidget(<AppNotOpenedWidget />); } catch {}
    }
  }
}
