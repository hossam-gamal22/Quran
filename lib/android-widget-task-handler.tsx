// lib/android-widget-task-handler.tsx
// Task handler for react-native-android-widget
// On WIDGET_ADDED: generates fresh data immediately so widgets never show empty state
// On WIDGET_UPDATE: reads cached data from AsyncStorage, falls back to fresh generation

import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SharedWidgetData } from './widget-data';

import { PrayerTimesSmallWidget } from '@/components/widgets/android/PrayerTimesSmallWidget';
import { PrayerTimesMediumWidget } from '@/components/widgets/android/PrayerTimesMediumWidget';
import { DailyVerseSmallWidget } from '@/components/widgets/android/DailyVerseSmallWidget';
import { DailyVerseMediumWidget } from '@/components/widgets/android/DailyVerseMediumWidget';
import { DailyDhikrSmallWidget } from '@/components/widgets/android/DailyDhikrSmallWidget';
import { DailyDhikrMediumWidget } from '@/components/widgets/android/DailyDhikrMediumWidget';
import { AzkarProgressSmallWidget } from '@/components/widgets/android/AzkarProgressSmallWidget';
import { AzkarProgressMediumWidget } from '@/components/widgets/android/AzkarProgressMediumWidget';
import { HijriDateSmallWidget } from '@/components/widgets/android/HijriDateSmallWidget';
import { HijriDateMediumWidget } from '@/components/widgets/android/HijriDateMediumWidget';

const WIDGET_DATA_KEY = 'widget_shared_data';

async function loadWidgetData(): Promise<SharedWidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
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
    { name: 'Dhuhr', nameAr: 'الظهر' },
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
      prayerWidget: { enabled: true, showAllPrayers: true, showHijriDate: true, showLocation: true, showCompletion: true, colorScheme: 'auto', accentColor: '#0d8e62' },
      azkarWidget: { enabled: true, showTranslation: false, autoRefresh: true, refreshInterval: 60, categories: ['morning', 'evening', 'misc'] },
      hijriWidget: { enabled: true, showGregorian: true },
      verseWidget: { enabled: true, showTranslation: false, colorScheme: 'auto' },
      dhikrWidget: { enabled: true, showTranslation: false, showBenefit: true },
    },
    language: 'ar',
  };
}

const WIDGET_MAP: Record<string, React.FC<{ data: SharedWidgetData }>> = {
  PrayerTimesSmall: PrayerTimesSmallWidget,
  PrayerTimesMedium: PrayerTimesMediumWidget,
  DailyVerseSmall: DailyVerseSmallWidget,
  DailyVerseMedium: DailyVerseMediumWidget,
  DailyDhikrSmall: DailyDhikrSmallWidget,
  DailyDhikrMedium: DailyDhikrMediumWidget,
  AzkarProgressSmall: AzkarProgressSmallWidget,
  AzkarProgressMedium: AzkarProgressMediumWidget,
  HijriDateSmall: HijriDateSmallWidget,
  HijriDateMedium: HijriDateMediumWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, renderWidget } = props;
  const widgetName = widgetInfo.widgetName;

  switch (widgetAction) {
    case 'WIDGET_ADDED': {
      // Widget just added — try to generate fresh data immediately
      let data = await loadWidgetData();

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

      const WidgetComponent = WIDGET_MAP[widgetName];
      if (WidgetComponent) {
        renderWidget(<WidgetComponent data={data} />);
      }
      return;
    }

    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let data = await loadWidgetData();

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

      const WidgetComponent = WIDGET_MAP[widgetName];
      if (WidgetComponent) {
        renderWidget(<WidgetComponent data={data} />);
      }
      return;
    }

    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
    default:
      return;
  }
}
