// lib/widget-native-sync.ts
// Syncs widget data to native storage (UserDefaults / SharedPreferences)
// so native WidgetKit (iOS) and Glance (Android) widgets can read it.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getLocalizedHijriDate } from './hijri-date';
import { getDateLocale } from './i18n';

// ========================================
// Types matching native widget entries
// ========================================

export interface AyahWidgetNativeData {
  ayahText: string;
  surahName: string;
  ayahNumber: number;
  lastUpdated: string;
}

export interface AzkarWidgetNativeData {
  dhikrText: string;
  dhikrCount: number;
  category: string;
  lastUpdated: string;
}

export interface HijriWidgetNativeData {
  hijriDay: number;
  hijriMonth: string;
  hijriYear: number;
  gregorianDate: string;
  event: string | null;
  lastUpdated: string;
}

// ========================================
// Storage Keys (match native widget code)
// ========================================

const NATIVE_KEYS = {
  ayah: 'ayah_widget_data',
  azkar: 'azkar_widget_data',
  hijri: 'hijri_widget_data',
} as const;

// Also mirror to AsyncStorage for the in-app gallery previews
const ASYNC_KEYS = {
  ayah: '@widget_native_ayah',
  azkar: '@widget_native_azkar',
  hijri: '@widget_native_hijri',
} as const;

// ========================================
// Sample Ayahs for rotation
// ========================================

const DAILY_AYAHS: AyahWidgetNativeData[] = [
  { ayahText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', surahName: 'الفاتحة', ayahNumber: 1, lastUpdated: '' },
  { ayahText: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', surahName: 'الشرح', ayahNumber: 5, lastUpdated: '' },
  { ayahText: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', surahName: 'الطلاق', ayahNumber: 3, lastUpdated: '' },
  { ayahText: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', surahName: 'البقرة', ayahNumber: 153, lastUpdated: '' },
  { ayahText: 'فَاذْكُرُونِي أَذْكُرْكُمْ', surahName: 'البقرة', ayahNumber: 152, lastUpdated: '' },
  { ayahText: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', surahName: 'الحديد', ayahNumber: 4, lastUpdated: '' },
  { ayahText: 'إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ', surahName: 'التوبة', ayahNumber: 120, lastUpdated: '' },
];

const DAILY_AZKAR: AzkarWidgetNativeData[] = [
  { dhikrText: 'سبحان الله وبحمده سبحان الله العظيم', dhikrCount: 100, category: 'تسبيح', lastUpdated: '' },
  { dhikrText: 'لا إله إلا الله وحده لا شريك له', dhikrCount: 100, category: 'تهليل', lastUpdated: '' },
  { dhikrText: 'اللهم صل وسلم على نبينا محمد', dhikrCount: 10, category: 'صلاة على النبي', lastUpdated: '' },
  { dhikrText: 'أستغفر الله العظيم وأتوب إليه', dhikrCount: 100, category: 'استغفار', lastUpdated: '' },
  { dhikrText: 'لا حول ولا قوة إلا بالله', dhikrCount: 100, category: 'حوقلة', lastUpdated: '' },
  { dhikrText: 'حسبنا الله ونعم الوكيل', dhikrCount: 7, category: 'حسبلة', lastUpdated: '' },
];

// ========================================
// Sync functions
// ========================================

/**
 * Pick today's ayah based on day-of-year rotation.
 */
function getTodayAyah(): AyahWidgetNativeData {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const ayah = DAILY_AYAHS[dayOfYear % DAILY_AYAHS.length];
  return { ...ayah, lastUpdated: new Date().toISOString() };
}

/**
 * Pick a dhikr based on 4-hour rotation.
 */
function getCurrentDhikr(): AzkarWidgetNativeData {
  const slot = Math.floor(Date.now() / (4 * 3600 * 1000));
  const dhikr = DAILY_AZKAR[slot % DAILY_AZKAR.length];
  return { ...dhikr, lastUpdated: new Date().toISOString() };
}

/**
 * Get current Hijri date for widget.
 */
function getCurrentHijriData(): HijriWidgetNativeData {
  const hijri = getLocalizedHijriDate();
  const now = new Date();
  return {
    hijriDay: hijri?.day ?? 1,
    hijriMonth: hijri?.monthName ?? 'محرم',
    hijriYear: hijri?.year ?? 1447,
    gregorianDate: now.toLocaleDateString(getDateLocale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    event: null,
    lastUpdated: now.toISOString(),
  };
}

/**
 * Sync all widget data to native storage.
 * Call this on app launch and periodically.
 */
export async function syncWidgetDataToNative(): Promise<void> {
  const ayah = getTodayAyah();
  const azkar = getCurrentDhikr();
  const hijri = getCurrentHijriData();

  // Save to AsyncStorage (accessible from RN and in-app previews)
  await Promise.all([
    AsyncStorage.setItem(ASYNC_KEYS.ayah, JSON.stringify(ayah)),
    AsyncStorage.setItem(ASYNC_KEYS.azkar, JSON.stringify(azkar)),
    AsyncStorage.setItem(ASYNC_KEYS.hijri, JSON.stringify(hijri)),
  ]);

  // For native widgets:
  // iOS uses UserDefaults with App Group suite → requires native bridge
  // Android uses SharedPreferences → requires native bridge
  // The actual native bridge call will be added when expo-widgets
  // or a custom native module is integrated. For now, data is in AsyncStorage
  // and native widgets read from the shared container written by widget-data.ts.

  if (Platform.OS === 'ios') {
    // iOS: Data is written to shared App Group container via widget-data.ts
    // Native WidgetKit reads from UserDefaults(suiteName: "group.com.roohmuslim.app")
    console.log('[Widget Sync] iOS data prepared for WidgetKit');
  } else if (Platform.OS === 'android') {
    // Android: Data is available via SharedPreferences bridge
    console.log('[Widget Sync] Android data prepared for Glance widgets');
  }
}

/**
 * Get cached widget data for in-app gallery previews.
 */
export async function getWidgetPreviewData(): Promise<{
  ayah: AyahWidgetNativeData;
  azkar: AzkarWidgetNativeData;
  hijri: HijriWidgetNativeData;
}> {
  try {
    const [ayahStr, azkarStr, hijriStr] = await Promise.all([
      AsyncStorage.getItem(ASYNC_KEYS.ayah),
      AsyncStorage.getItem(ASYNC_KEYS.azkar),
      AsyncStorage.getItem(ASYNC_KEYS.hijri),
    ]);

    return {
      ayah: ayahStr ? JSON.parse(ayahStr) : getTodayAyah(),
      azkar: azkarStr ? JSON.parse(azkarStr) : getCurrentDhikr(),
      hijri: hijriStr ? JSON.parse(hijriStr) : getCurrentHijriData(),
    };
  } catch {
    return {
      ayah: getTodayAyah(),
      azkar: getCurrentDhikr(),
      hijri: getCurrentHijriData(),
    };
  }
}
