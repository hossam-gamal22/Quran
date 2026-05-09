// lib/widget-data-bridge.ts
// Unified bridge: writes widget data to platform-specific shared storage
// iOS: UserDefaults via App Group (group.com.rooh.almuslim)
// Android: AsyncStorage (read by react-native-android-widget task handler)

import React from 'react';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  preparePrayerWidgetData,
  prepareAzkarWidgetData,
  prepareVerseWidgetData,
  prepareDhikrWidgetData,
  getPrayerCompletion,
  getWidgetSettings,
  type SharedWidgetData,
} from './widget-data';
import { getLanguage } from './i18n';
import { type PrayerTimes, getStoredLocation, fetchPrayerTimes, cachePrayerTimes, parsePrayerTimes } from './prayer-times';
import { getOfflinePrayerTimes } from './prayer-week-cache';

const APP_GROUP = 'group.com.rooh.almuslim';
const WIDGET_DATA_KEY = 'widget_shared_data';

/**
 * Trigger native widget reload on both platforms.
 * iOS: WidgetCenter.shared.reloadAllTimelines() via WidgetReloadModule
 * Android: requestWidgetUpdate via react-native-android-widget (renders immediately)
 */
async function triggerNativeWidgetReload(sharedData?: SharedWidgetData): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      const { WidgetReloadModule } = NativeModules;
      if (WidgetReloadModule?.reloadAllTimelines) {
        await WidgetReloadModule.reloadAllTimelines();
        if (__DEV__) console.log('✅ WidgetKit reloadAllTimelines triggered');
      }
    } catch (e) {
      if (__DEV__) console.warn('⚠️ WidgetKit reload failed:', e);
    }
  } else if (Platform.OS === 'android' && sharedData) {
    try {
      const { requestWidgetUpdate } = require('react-native-android-widget');

      const widgetNames = [
        'RoohSmall', 'RoohMedium', 'RoohLarge',
        'PrayerTimesSmall', 'PrayerTimesMedium', 'PrayerTimesLarge',
        'DailyVerseSmall', 'DailyVerseMedium',
        'DailyDhikrSmall', 'DailyDhikrMedium',
        'AzkarProgressSmall', 'AzkarProgressMedium',
        'HijriDateSmall', 'HijriDateMedium',
      ];

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
      if (__DEV__) console.log('✅ Android widget update requested');
    } catch {
      // react-native-android-widget not available (Expo Go / web)
    }
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
 * Render the correct widget component for a given widget name using the provided data.
 */
function renderWidgetByName(widgetName: string, data: SharedWidgetData): React.ReactElement | null {
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
  if (!Component) return null;
  return React.createElement(Component, { data });
}

/**
 * Aggregate all widget data and write to shared storage, then refresh all Android widgets.
 * Call this on: app startup, prayer time change, midnight, language change, foreground.
 */
export async function updateWidgetData(prayerTimes?: PrayerTimes | null, location?: string): Promise<void> {
  try {
    const lang = getLanguage();
    const settings = await getWidgetSettings();

    // Auto-fetch offline prayer times if none are passed
    let effectivePrayerTimes = prayerTimes || null;
    if (!effectivePrayerTimes) {
      try {
        const offlineResult = await getOfflinePrayerTimes();
        if (offlineResult.times) {
          effectivePrayerTimes = offlineResult.times;
          if (__DEV__) console.log(`📴 Widget: using offline prayer times (source: ${offlineResult.source})`);
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
    }

    const settledResults = await Promise.allSettled([
      preparePrayerWidgetData(effectivePrayerTimes, location, lang),
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
        if (d?.widgetFontVariant === 'widget2') widgetFontVariant = 'widget2';
        if (d?.widgetCalendar) widgetCalendar = d.widgetCalendar;
        if (d?.widgetDayCalendar) widgetDayCalendar = d.widgetDayCalendar;
        if (d?.widgetMonthCalendar) widgetMonthCalendar = d.widgetMonthCalendar;
        if (d?.widgetNumerals) widgetNumerals = d.widgetNumerals;
        if (d?.widgetTheme) widgetTheme = d.widgetTheme;
        if (d?.widgetDateFormat) widgetDateFormat = d.widgetDateFormat;
      }
    } catch {}

    const sharedData: SharedWidgetData = {
      prayer: prayerData,
      azkar: azkarData,
      verse: verseData,
      dhikr: dhikrData,
      prayerCompletion,
      settings,
      language: lang,
      widgetFontVariant,
      widgetCalendar,
      widgetDayCalendar,
      widgetMonthCalendar,
      widgetNumerals,
      widgetTheme,
      widgetLanguage,
      widgetDateFormat,
    };

    const json = JSON.stringify(sharedData);

    // Write to shared storage (UserDefaults + fallback file + AsyncStorage on iOS, AsyncStorage on Android)
    await writeToSharedStorage(WIDGET_DATA_KEY, json);

    // Trigger native widget refresh on both platforms
    await triggerNativeWidgetReload(sharedData);

    if (__DEV__) console.log('✅ Widget data synced to shared storage');
  } catch (error) {
    console.warn('⚠️ Widget data sync failed:', error);
  }
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
