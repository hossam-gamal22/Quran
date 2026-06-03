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
import { getPrayerNameAr, getPrayerNameEn } from './prayer-times';
import { formatEpochTimeInTimeZone } from './widget-timezone';
import { nextPrayerStaticState } from './widget-prayer-table-state';
import {
  prayerStaticAssetName,
  prayerStaticAssetPath,
  prayerStaticAssetExistsOnDevice,
  type PrayerLang,
  type PrayerStateKey,
  type PrayerTheme,
} from './widget-android-asset-resolver';

import {
  SnapshotWidget,
  snapshotFilePath,
  snapshotFilePathForKey,
  snapshotRouteKeyForPlacement,
  type AndroidSize,
} from '@/components/widgets/android/SnapshotWidget';
import { LockedWidget } from '@/components/widgets/android/LockedWidget';
import { AppNotOpenedWidget } from '@/components/widgets/android/AppNotOpenedWidget';
import { AzkarFlexWidget } from '@/components/widgets/android/AzkarFlexWidget';

/** Widget ids that bypass the PNG snapshot pipeline and render as live
 *  FlexWidget trees. Lets the 15-minute content alarm produce visible
 *  cycling — each refresh reads `azkarPools` + current minute fresh. */
const LIVE_AZKAR_WIDGET_IDS = new Set(['azkarMorning', 'azkarEvening', 'dailyDhikr']);

const WIDGET_DATA_KEY = 'widget_shared_data';
const SUBSCRIPTION_STATE_KEY = '@subscription_state';
export const APP_OPENED_ONCE_KEY = '@rooh_app_opened_once';
/** Set to "true" when WIDGET_ADDED fires. SnapshotPumpController reads &
 *  clears this on the next foreground pass to force a re-pump. */
const PUMP_PENDING_KEY = '@widget_pump_pending';

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
    const formatWidgetTime = (ms: number) => {
      return formatEpochTimeInTimeZone(ms, inputs.timezone, isAr ? 'ar' : 'en') ?? '--:--';
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

function widgetDeepLink(widgetId: string): string {
  switch (widgetId) {
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
}

/**
 * Render a SnapshotWidget for a placement. Resolves the active theme from the
 * shared widget data, checks whether the corresponding `<id>_<size>_<theme>.png`
 * exists on disk, and passes both signals to SnapshotWidget so it can pick the
 * correct branch (real PNG vs branded loading card). Never layers a fallback
 * underneath the transparent foreground PNG.
 */
async function renderSnapshotWidget(
  widgetName: string,
  data: SharedWidgetData,
  renderWidget: (jsx: React.ReactElement) => void,
  widgetBounds?: { width?: number; height?: number },
): Promise<void> {
  const target = resolveTarget(widgetName);
  if (!target) return;

  // Azkar / Daily-Dhikr widgets render LIVE via FlexWidget so they cycle
  // visibly when the 15-min content alarm fires — no PNG to regenerate.
  // Each task-handler invocation reads sharedData + current time and picks
  // the active content without relying on app foreground snapshot pumping.
  if (LIVE_AZKAR_WIDGET_IDS.has(target.id)) {
    renderWidget(
      <AzkarFlexWidget
        widgetId={target.id as 'azkarMorning' | 'azkarEvening' | 'dailyDhikr'}
        size={target.size as 'small' | 'medium'}
        data={data}
        clickUri={widgetDeepLink(target.id)}
      />,
    );
    return;
  }

  const theme = resolveWidgetTheme(data.widgetTheme, Appearance.getColorScheme());
  const routeKey = snapshotRouteKeyForPlacement(target.id, target.size, theme);
  const manifestEntry = data.snapshotManifest?.[routeKey];
  let snapshotKey = manifestEntry?.key ?? routeKey;
  let path = manifestEntry?.path ?? (manifestEntry?.key
    ? snapshotFilePathForKey(manifestEntry.key)
    : snapshotFilePath(target.id, target.size, theme));
  let isPrayerStaticTemplate = false;
  if (PRAYER_WIDGET_IDS.has(target.id)) {
    const rawState = nextPrayerStaticState(data.prayer);
    const validStates = new Set<PrayerStateKey>(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']);
    if (rawState && validStates.has(rawState as PrayerStateKey)) {
      const templateOpts = {
        widgetId: target.id as 'prayerSingle' | 'prayerTable' | 'prayerNextPrevious',
        size: target.size,
        theme: theme as PrayerTheme,
        language: (data.widgetLanguage === 'en' || data.language === 'en' ? 'en' : 'ar') as PrayerLang,
        active: rawState as PrayerStateKey,
      };
      if (await prayerStaticAssetExistsOnDevice(templateOpts)) {
        snapshotKey = prayerStaticAssetName(templateOpts);
        path = prayerStaticAssetPath(templateOpts);
        isPrayerStaticTemplate = true;
      }
    }
  }
  let hasSnapshot = false;
  let fallbackReason: string | undefined;
  try {
    const info = await FileSystem.getInfoAsync(path);
    hasSnapshot = info.exists;
    if (!hasSnapshot) fallbackReason = 'png_missing';
  } catch (e) {
    fallbackReason = `stat_failed:${(e as Error)?.message ?? 'unknown'}`;
  }
  if (__DEV__) {
    const action = hasSnapshot ? 'loaded' : 'fallback';
    console.log(`[widget/android] ${action} snapshot route=${routeKey} key=${snapshotKey} path=${path}${fallbackReason ? ` reason=${fallbackReason}` : ''}`);
  }
  const missingKey = hasSnapshot ? undefined : snapshotKey;
  renderWidget(
    <SnapshotWidget
      widgetId={target.id}
      size={target.size}
      data={data}
      hasSnapshot={hasSnapshot}
      missingKey={missingKey}
      snapshotKey={snapshotKey}
      snapshotPath={path}
      fallbackReason={fallbackReason}
      isPrayerStaticTemplate={isPrayerStaticTemplate}
      widgetWidth={widgetBounds?.width}
      widgetHeight={widgetBounds?.height}
      clickAction="OPEN_URI"
      clickUri={widgetDeepLink(target.id)}
    />,
  );
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;
  const widgetName = widgetInfo.widgetName;

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
    case 'WIDGET_CLICK':
    default:
      return;
  }
}
