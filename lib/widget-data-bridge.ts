// lib/widget-data-bridge.ts
// Unified bridge: writes widget data to platform-specific shared storage
// iOS: UserDefaults via App Group (group.com.roohmuslim.app)
// Android: AsyncStorage (read by react-native-android-widget task handler)

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  preparePrayerWidgetData,
  prepareAzkarWidgetData,
  prepareVerseWidgetData,
  prepareDhikrWidgetData,
  getPrayerCompletion,
  getWidgetSettings,
  type SharedWidgetData,
  type WidgetPrayerData,
} from './widget-data';
import { getLocalizedHijriDate } from './hijri-date';
import { getLanguage } from './i18n';
import { type PrayerTimes } from './prayer-times';

const APP_GROUP = 'group.com.roohmuslim.app';
const WIDGET_DATA_KEY = 'widget_shared_data';

/**
 * Write data to iOS App Group UserDefaults via SharedGroupPreferences.
 * On Android, writes to AsyncStorage (react-native-android-widget reads it in the task handler).
 */
async function writeToSharedStorage(key: string, value: string): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      const SharedGroupPreferences = require('react-native-shared-group-preferences').default;
      await SharedGroupPreferences.setItem(key, value, APP_GROUP);
    } catch (e) {
      // Fallback: write to AsyncStorage (native bridge may not be available in Expo Go)
      await AsyncStorage.setItem(key, value);
    }
  } else {
    // Android: react-native-android-widget reads from AsyncStorage
    await AsyncStorage.setItem(key, value);
  }
}

/**
 * Aggregate all widget data and write to shared storage.
 * Call this on: app startup, prayer time change, midnight, language change, foreground.
 */
export async function updateWidgetData(prayerTimes?: PrayerTimes | null, location?: string): Promise<void> {
  try {
    const lang = getLanguage();
    const settings = await getWidgetSettings();

    const [prayerData, azkarData, verseData, dhikrData, prayerCompletion] = await Promise.all([
      preparePrayerWidgetData(prayerTimes || null, location, lang),
      prepareAzkarWidgetData(lang, settings.azkarWidget.categories),
      prepareVerseWidgetData(lang),
      prepareDhikrWidgetData(lang),
      getPrayerCompletion(),
    ]);

    const sharedData: SharedWidgetData = {
      prayer: prayerData,
      azkar: azkarData,
      verse: verseData,
      dhikr: dhikrData,
      prayerCompletion,
      settings,
      language: lang,
    };

    const json = JSON.stringify(sharedData);

    // Write to shared storage (iOS UserDefaults + Android AsyncStorage)
    await writeToSharedStorage(WIDGET_DATA_KEY, json);

    // Also keep AsyncStorage copy for in-app previews (widget gallery)
    if (Platform.OS === 'ios') {
      await AsyncStorage.setItem(WIDGET_DATA_KEY, json);
    }

    // Request native widget refresh
    if (Platform.OS === 'android') {
      try {
        const { requestWidgetUpdate } = require('react-native-android-widget');
        // Update all widget types
        await Promise.allSettled([
          requestWidgetUpdate({ widgetName: 'PrayerTimesSmall' }),
          requestWidgetUpdate({ widgetName: 'PrayerTimesMedium' }),
          requestWidgetUpdate({ widgetName: 'DailyVerseSmall' }),
          requestWidgetUpdate({ widgetName: 'DailyVerseMedium' }),
          requestWidgetUpdate({ widgetName: 'DailyDhikrSmall' }),
          requestWidgetUpdate({ widgetName: 'DailyDhikrMedium' }),
          requestWidgetUpdate({ widgetName: 'AzkarProgressSmall' }),
          requestWidgetUpdate({ widgetName: 'AzkarProgressMedium' }),
          requestWidgetUpdate({ widgetName: 'HijriDateSmall' }),
          requestWidgetUpdate({ widgetName: 'HijriDateMedium' }),
        ]);
      } catch {
        // react-native-android-widget not available (Expo Go / web)
      }
    }

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

  const timer = setTimeout(() => {
    updateWidgetData().catch(() => {});
    onRefresh?.();
    // Reschedule for next midnight
    scheduleMidnightRefresh(onRefresh);
  }, msUntilMidnight);

  return () => clearTimeout(timer);
}
