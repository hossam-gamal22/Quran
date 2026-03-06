// lib/widget-data.ts
// مشاركة البيانات مع الويدجت - روح المسلم

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import { PrayerTimes, getNextPrayer, getTimeRemaining, formatTime12h } from './prayer-times';
import { getHijriDate, getHijriDateObject } from './hijri-date';
import { getAllAzkar } from '@/lib/azkar-api';
import { t } from '@/lib/i18n';

// ========================================
// الثوابت
// ========================================

const WIDGET_DATA_KEY = 'widget_shared_data';
const WIDGET_SETTINGS_KEY = 'widget_settings';

// مسار مشاركة البيانات مع الويدجت
const SHARED_GROUP_ID = 'group.com.roohmuslim.app';

// ========================================
// الأنواع
// ========================================

export interface WidgetPrayerData {
  nextPrayer: string;
  nextPrayerName: string;
  nextPrayerNameAr: string;
  nextPrayerTime: string;
  timeRemaining: string;
  timeRemainingMinutes: number;
  allPrayers: {
    name: string;
    nameAr: string;
    time: string;
    isPassed: boolean;
    isNext: boolean;
  }[];
  hijriDate: string;
  hijriDay: number;
  hijriMonth: string;
  hijriYear: number;
  gregorianDate: string;
  location: string;
  lastUpdated: string;
}

export interface WidgetAzkarData {
  randomZikr: {
    id: string;
    text: string;
    translation?: string;
    count: number;
    category: string;
    benefit?: string;
  };
  morningCompleted: boolean;
  eveningCompleted: boolean;
  lastUpdated: string;
}

export interface WidgetSettings {
  enabled: boolean;
  prayerWidget: {
    enabled: boolean;
    showAllPrayers: boolean;
    showHijriDate: boolean;
    showLocation: boolean;
    colorScheme: 'auto' | 'light' | 'dark';
    accentColor: string;
  };
  azkarWidget: {
    enabled: boolean;
    showTranslation: boolean;
    autoRefresh: boolean;
    refreshInterval: number; // بالدقائق
    categories: string[];
  };
  hijriWidget: {
    enabled: boolean;
    showGregorian: boolean;
  };
}

export interface SharedWidgetData {
  prayer: WidgetPrayerData;
  azkar: WidgetAzkarData;
  settings: WidgetSettings;
}

// ========================================
// الإعدادات الافتراضية
// ========================================

export const defaultWidgetSettings: WidgetSettings = {
  enabled: true,
  prayerWidget: {
    enabled: true,
    showAllPrayers: true,
    showHijriDate: true,
    showLocation: true,
    colorScheme: 'auto',
    accentColor: '#2f7659',
  },
  azkarWidget: {
    enabled: true,
    showTranslation: false,
    autoRefresh: true,
    refreshInterval: 60,
    categories: ['morning', 'evening', 'misc'],
  },
  hijriWidget: {
    enabled: true,
    showGregorian: true,
  },
};

// ========================================
// دوال التخزين
// ========================================

/**
 * حفظ إعدادات الويدجت
 */
export const saveWidgetSettings = async (settings: WidgetSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(settings));
    // تحديث البيانات المشتركة
    await updateSharedData();
  } catch (error) {
    console.error('Error saving widget settings:', error);
  }
};

/**
 * جلب إعدادات الويدجت
 */
export const getWidgetSettings = async (): Promise<WidgetSettings> => {
  try {
    const data = await AsyncStorage.getItem(WIDGET_SETTINGS_KEY);
    if (data) {
      return { ...defaultWidgetSettings, ...JSON.parse(data) };
    }
    return defaultWidgetSettings;
  } catch (error) {
    console.error('Error getting widget settings:', error);
    return defaultWidgetSettings;
  }
};

// ========================================
// تحضير بيانات الويدجت
// ========================================

/**
 * تحضير بيانات الصلاة للويدجت
 */
export const preparePrayerWidgetData = async (
  prayerTimes: PrayerTimes | null,
  location?: string,
  language: string = 'ar'
): Promise<WidgetPrayerData> => {
  const now = new Date();
  const hijri = getHijriDateObject();
  
  // الصلاة القادمة
  const nextPrayerKey = prayerTimes ? getNextPrayer(prayerTimes) : 'fajr';
  const timeRemaining = prayerTimes ? getTimeRemaining(prayerTimes) : null;
  
  // أسماء الصلوات
  const prayerNames: Record<string, { en: string; ar: string }> = {
    fajr: { en: 'Fajr', ar: 'الفجر' },
    sunrise: { en: 'Sunrise', ar: 'الشروق' },
    dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
    asr: { en: 'Asr', ar: 'العصر' },
    maghrib: { en: 'Maghrib', ar: 'المغرب' },
    isha: { en: 'Isha', ar: 'العشاء' },
  };

  // تحضير قائمة الصلوات
  const prayersList = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const allPrayers = prayersList.map(prayer => {
    const time = prayerTimes?.[prayer as keyof PrayerTimes] as string || '--:--';
    const prayerDate = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    prayerDate.setHours(hours, minutes, 0, 0);
    
    return {
      name: prayerNames[prayer]?.en || prayer,
      nameAr: prayerNames[prayer]?.ar || prayer,
      time: formatTime12h(time),
      isPassed: prayerDate < now,
      isNext: prayer === nextPrayerKey,
    };
  });

  return {
    nextPrayer: nextPrayerKey,
    nextPrayerName: prayerNames[nextPrayerKey]?.en || nextPrayerKey,
    nextPrayerNameAr: prayerNames[nextPrayerKey]?.ar || nextPrayerKey,
    nextPrayerTime: prayerTimes ? formatTime12h(prayerTimes[nextPrayerKey as keyof PrayerTimes] as string) : '--:--',
    timeRemaining: timeRemaining 
      ? `${timeRemaining.hours}:${String(timeRemaining.minutes).padStart(2, '0')}`
      : '--:--',
    timeRemainingMinutes: timeRemaining 
      ? timeRemaining.hours * 60 + timeRemaining.minutes 
      : 0,
    allPrayers,
    hijriDate: hijri ? `${hijri.day} ${hijri.monthAr} ${hijri.year}` : '',
    hijriDay: hijri?.day || 1,
    hijriMonth: hijri?.monthAr || '',
    hijriYear: hijri?.year || 1446,
    gregorianDate: now.toLocaleDateString('ar-SA', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }),
    location: location || '',
    lastUpdated: now.toISOString(),
  };
};

/**
 * تحضير بيانات الأذكار للويدجت
 */
export const prepareAzkarWidgetData = async (
  language: string = 'ar',
  categories: string[] = ['morning', 'evening', 'misc']
): Promise<WidgetAzkarData> => {
  const allAzkar = getAllAzkar();
  // فلترة الأذكار حسب الفئات المختارة
  const filteredAzkar = allAzkar.filter(zikr => 
    categories.includes(zikr.category)
  );
  
  // اختيار ذكر عشوائي
  const randomIndex = Math.floor(Math.random() * filteredAzkar.length);
  const randomZikr = filteredAzkar[randomIndex] || filteredAzkar[0];
  
  // جلب النص والترجمة
  const lang = language as 'ar' | 'en' | 'ur' | 'id' | 'tr' | 'fr' | 'de' | 'hi' | 'bn' | 'ms' | 'ru' | 'es';
  const text = language === 'ar' ? randomZikr.arabic : (randomZikr.translations?.[lang] || randomZikr.arabic);
  const translation = language !== 'ar' ? randomZikr.translations?.['en'] : undefined;
  const benefit = randomZikr.benefit?.[lang as 'ar' | 'en' | 'fr'] || undefined;

  // حالة إكمال الأذكار (من التخزين)
  let morningCompleted = false;
  let eveningCompleted = false;
  
  try {
    const todayKey = new Date().toISOString().split('T')[0];
    const azkarStatus = await AsyncStorage.getItem(`azkar_status_${todayKey}`);
    if (azkarStatus) {
      const status = JSON.parse(azkarStatus);
      morningCompleted = status.morning || false;
      eveningCompleted = status.evening || false;
    }
  } catch (error) {
    console.error('Error getting azkar status:', error);
  }

  return {
    randomZikr: {
      id: randomZikr.id,
      text,
      translation,
      count: randomZikr.count,
      category: randomZikr.category,
      benefit,
    },
    morningCompleted,
    eveningCompleted,
    lastUpdated: new Date().toISOString(),
  };
};

// ========================================
// مشاركة البيانات مع الويدجت
// ========================================

/**
 * كتابة البيانات للمشاركة مع الويدجت (iOS)
 */
const writeToSharedContainer = async (data: SharedWidgetData): Promise<void> => {
  if (Platform.OS !== 'ios') return;
  
  try {
    // في iOS، نستخدم App Groups للمشاركة
    // هذا يتطلب إعداد في Xcode
    const sharedPath = `${FileSystem.documentDirectory}../shared/widget_data.json`;
    await FileSystem.writeAsStringAsync(sharedPath, JSON.stringify(data));
  } catch (error) {
    // قد يفشل إذا لم يتم إعداد App Groups
    console.log('Shared container not available:', error);
  }
};

/**
 * تحديث البيانات المشتركة
 */
export const updateSharedData = async (
  prayerTimes?: PrayerTimes | null,
  location?: string
): Promise<void> => {
  try {
    const settings = await getWidgetSettings();
    
    const prayerData = await preparePrayerWidgetData(prayerTimes || null, location);
    const azkarData = await prepareAzkarWidgetData('ar', settings.azkarWidget.categories);
    
    const sharedData: SharedWidgetData = {
      prayer: prayerData,
      azkar: azkarData,
      settings,
    };
    
    // حفظ في AsyncStorage
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(sharedData));
    
    // كتابة للمشاركة مع الويدجت الأصلي
    await writeToSharedContainer(sharedData);
    
  } catch (error) {
    console.error('Error updating shared data:', error);
  }
};

/**
 * جلب البيانات المشتركة
 */
export const getSharedData = async (): Promise<SharedWidgetData | null> => {
  try {
    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error getting shared data:', error);
    return null;
  }
};

// ========================================
// تحديث الويدجت
// ========================================

/**
 * طلب تحديث الويدجت
 */
export const requestWidgetUpdate = async (): Promise<void> => {
  try {
    // تحديث البيانات المشتركة أولاً
    await updateSharedData();
    
    // في React Native، نستخدم مكتبة خاصة لتحديث الويدجت
    // مثل react-native-widget-extension أو expo-widgets
    
    if (Platform.OS === 'ios') {
      // iOS: استخدام WidgetKit
      // يتطلب مكتبة native
      console.log('Requesting iOS widget update...');
    } else if (Platform.OS === 'android') {
      // Android: استخدام AppWidgetManager
      // يتطلب مكتبة native
      console.log('Requesting Android widget update...');
    }
  } catch (error) {
    console.error('Error requesting widget update:', error);
  }
};

/**
 * جدولة تحديث الويدجت
 */
export const scheduleWidgetUpdates = async (): Promise<void> => {
  const settings = await getWidgetSettings();
  
  if (!settings.enabled) return;
  
  // تحديث عند كل صلاة
  // يتم تنفيذ هذا من خلال الإشعارات المجدولة
  console.log('Widget updates scheduled');
};

// ========================================
// دوال مساعدة للويدجت
// ========================================

/**
 * الحصول على لون الخلفية حسب الوقت
 */
export const getWidgetBackgroundColor = (prayer: string): string[] => {
  const colors: Record<string, string[]> = {
    fajr: ['#1a237e', '#283593'],
    sunrise: ['#ff6f00', '#ff8f00'],
    dhuhr: ['#2f7659', '#1d4a3a'],
    asr: ['#f57c00', '#ef6c00'],
    maghrib: ['#d84315', '#bf360c'],
    isha: ['#1a1a2e', '#16213e'],
  };
  return colors[prayer] || colors.dhuhr;
};

/**
 * الحصول على أيقونة الصلاة
 */
export const getWidgetPrayerIcon = (prayer: string): string => {
  const icons: Record<string, string> = {
    fajr: 'weather.sunrise',
    sunrise: 'sun.max',
    dhuhr: 'sun.max.fill',
    asr: 'sun.haze',
    maghrib: 'weather.sunset',
    isha: 'moon.stars',
  };
  return icons[prayer] || 'clock';
};

// ========================================
// التصدير
// ========================================

export default {
  // الإعدادات
  saveWidgetSettings,
  getWidgetSettings,
  defaultWidgetSettings,
  
  // البيانات
  preparePrayerWidgetData,
  prepareAzkarWidgetData,
  updateSharedData,
  getSharedData,
  
  // التحديث
  requestWidgetUpdate,
  scheduleWidgetUpdates,
  
  // مساعدة
  getWidgetBackgroundColor,
  getWidgetPrayerIcon,
};
