// lib/widget-data.ts
// مشاركة البيانات مع الويدجت - روح المسلم

import AsyncStorage from '@react-native-async-storage/async-storage';

import { PrayerTimes, getNextPrayer, getTimeRemaining, formatTime12h } from './prayer-times';
import { getLocalizedHijriDate, HIJRI_MONTHS_EN } from './hijri-date';
import { getAllAzkar, resolveTranslationValue } from '@/lib/azkar-api';
import { stripAzkarBrackets } from '@/lib/basmala-utils';
import { t, getDateLocale, getLanguage } from '@/lib/i18n';
import { getTodayAyah, QuranAyah } from '@/lib/api/quran-cloud-api';

// ========================================
// الثوابت
// ========================================

const WIDGET_DATA_KEY = 'widget_shared_data';
const WIDGET_SETTINGS_KEY = 'widget_settings';

/**
 * مسارات أيقونات الويدجت
 * يتم استبدال هذه بملفات PNG فعلية عند توفرها في assets/images/widgets/
 */
export const WIDGET_ICON_PATHS: Record<string, string> = {
  prayer: 'assets/images/widgets/widget_prayer_times.png',
  ayah: 'assets/images/widgets/widget_verse.png',
  dhikr: 'assets/images/widgets/widget_dhikr.png',
  hijri: 'assets/images/widgets/widget_hijri.png',
};

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
  timeRemainingLabel: string;
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
  hijriMonthEn: string;
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
    timesLabel?: string;
    category: string;
    categoryName?: string;
    benefit?: string;
  };
  morningCompleted: boolean;
  eveningCompleted: boolean;
  lastUpdated: string;
}

export interface VerseWidgetData {
  arabic: string;
  translation?: string;
  surahName: string;
  surahNameEn: string;
  ayahNumber: number;
  numberInSurah: number;
  date: string;
  lastUpdated: string;
}

export interface DhikrWidgetData {
  arabic: string;
  translation?: string;
  count: number;
  timesLabel?: string;
  category: string;
  categoryName: string;
  benefit?: string;
  date: string;
  lastUpdated: string;
}

export interface PrayerCompletionData {
  date: string;
  prayers: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  };
  lastUpdated: string;
}

export interface WidgetSettings {
  enabled: boolean;
  widgetTheme?: string; // Theme ID from WIDGET_THEMES
  prayerWidget: {
    enabled: boolean;
    showAllPrayers: boolean;
    showHijriDate: boolean;
    showLocation: boolean;
    showCompletion: boolean;
    colorScheme: 'auto' | 'light' | 'dark';
    accentColor: string;
  };
  azkarWidget: {
    enabled: boolean;
    showTranslation: boolean;
    categories: string[];
  };
  hijriWidget: {
    enabled: boolean;
    showGregorian: boolean;
  };
  verseWidget: {
    enabled: boolean;
    showTranslation: boolean;
    colorScheme: 'auto' | 'light' | 'dark';
  };
  dhikrWidget: {
    enabled: boolean;
    showTranslation: boolean;
    showBenefit: boolean;
  };
}

export interface SharedWidgetData {
  prayer: WidgetPrayerData;
  azkar: WidgetAzkarData;
  verse: VerseWidgetData;
  dhikr: DhikrWidgetData;
  prayerCompletion: PrayerCompletionData;
  settings: WidgetSettings;
  language?: string;
}

// ========================================
// الإعدادات الافتراضية
// ========================================

export const defaultWidgetSettings: WidgetSettings = {
  enabled: true,
  widgetTheme: 'default_dark',
  prayerWidget: {
    enabled: true,
    showAllPrayers: true,
    showHijriDate: true,
    showLocation: true,
    showCompletion: true,
    colorScheme: 'auto',
    accentColor: '#0d8e62',
  },
  azkarWidget: {
    enabled: true,
    showTranslation: false,
    categories: ['1', '2', '3'],
  },
  hijriWidget: {
    enabled: true,
    showGregorian: true,
  },
  verseWidget: {
    enabled: true,
    showTranslation: false,
    colorScheme: 'auto',
  },
  dhikrWidget: {
    enabled: true,
    showTranslation: false,
    showBenefit: true,
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
  const hijri = getLocalizedHijriDate();
  
  // الصلاة القادمة
  const nextPrayerResult = prayerTimes ? getNextPrayer(prayerTimes) : null;
  const nextPrayerKey = nextPrayerResult?.name || 'fajr';
  const nextPrayerTime = nextPrayerResult?.time || '--:--';
  const timeRemaining = prayerTimes ? getTimeRemaining(prayerTimes) : null;
  
  // أسماء الصلوات
  const prayerNames: Record<string, { en: string; ar: string }> = {
    fajr: { en: 'Fajr', ar: t('prayer.fajr') },
    sunrise: { en: 'Sunrise', ar: t('prayer.sunrise') },
    dhuhr: { en: 'Dhuhr', ar: t('prayer.dhuhr') },
    asr: { en: 'Asr', ar: t('prayer.asr') },
    maghrib: { en: 'Maghrib', ar: t('prayer.maghrib') },
    isha: { en: 'Isha', ar: t('prayer.isha') },
  };

  // تحضير قائمة الصلوات
  const prayersList = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const allPrayers = prayersList.map(prayer => {
    const time = prayerTimes?.[prayer as keyof PrayerTimes] as string || '--:--';
    const prayerDate = new Date();
    const parts = time.split(':').map(Number);
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    if (!isNaN(hours) && !isNaN(minutes)) {
      prayerDate.setHours(hours, minutes, 0, 0);
    }
    
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
    nextPrayerTime: prayerTimes ? formatTime12h(nextPrayerTime) : '--:--',
    timeRemaining: timeRemaining 
      ? `${timeRemaining.hours}:${String(timeRemaining.minutes).padStart(2, '0')}`
      : '--:--',
    timeRemainingMinutes: timeRemaining 
      ? timeRemaining.hours * 60 + timeRemaining.minutes 
      : 0,
    timeRemainingLabel: t('prayer.timeRemaining'),
    allPrayers,
    hijriDate: hijri ? `${hijri.day} ${hijri.monthName} ${hijri.year}` : '',
    hijriDay: hijri?.day || 1,
    hijriMonth: hijri?.monthName || '',
    hijriMonthEn: hijri ? (HIJRI_MONTHS_EN[hijri.month - 1] || '') : '',
    hijriYear: hijri?.year || 1446,
    gregorianDate: now.toLocaleDateString(getDateLocale(), { 
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
  categories: string[] = ['1', '2', '3']
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
  const text = language === 'ar' ? stripAzkarBrackets(randomZikr.arabic) : (resolveTranslationValue(randomZikr.translations?.[lang]) || stripAzkarBrackets(randomZikr.arabic));
  const translation = language !== 'ar' ? resolveTranslationValue(randomZikr.translations?.['en']) : undefined;
  const benefit = typeof randomZikr.benefit === 'object' && randomZikr.benefit ? (randomZikr.benefit as Record<string, string>)[lang] : undefined;

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
      id: String(randomZikr.id),
      text,
      translation,
      count: randomZikr.count,
      timesLabel: t('azkar.times'),
      category: randomZikr.category,
      categoryName: getDhikrCategoryName(randomZikr.category),
      benefit,
    },
    morningCompleted,
    eveningCompleted,
    lastUpdated: new Date().toISOString(),
  };
};

// ========================================
// بيانات آية اليوم للويدجت
// ========================================

/**
 * حساب رقم آية يومي ثابت بناءً على يوم السنة
 */
function getDailyVerseNumber(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return (dayOfYear % 6236) + 1;
}

/**
 * الحصول على ذكر يومي ثابت (مختلف عن ذكر الأذكار العشوائي)
 */
function getDailyDhikrIndex(totalAzkar: number): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  // Offset by 137 to differentiate from verse-of-the-day numbering
  return ((dayOfYear + 137) % totalAzkar);
}

function getDhikrCategoryName(category: string): string {
  const names: Record<string, () => string> = {
    // New numeric IDs
    '1': () => t('azkar.morning'),
    '1b': () => t('azkar.evening'),
    '2': () => t('azkar.sleep'),
    '3': () => t('azkar.wakeup'),
    '27': () => t('prayer.afterPrayer'),
    '26': () => t('azkar.quranDuas'),
    '34': () => t('azkar.sunnahDuas'),
    // Legacy string IDs (backward compat)
    morning: () => t('azkar.morning'),
    evening: () => t('azkar.evening'),
    sleep: () => t('azkar.sleep'),
    wakeup: () => t('azkar.wakeup'),
    after_prayer: () => t('prayer.afterPrayer'),
    quran_duas: () => t('azkar.quranDuas'),
    sunnah_duas: () => t('azkar.sunnahDuas'),
    ruqya: () => t('azkar.ruqya'),
    protection: () => t('azkar.protectionAdhkar'),
    misc: () => t('widget.miscAzkar'),
  };
  return names[category]?.() || category;
}

/**
 * تحضير بيانات آية اليوم للويدجت
 */
export const prepareVerseWidgetData = async (
  language: string = 'ar',
  options?: { showTranslation?: boolean }
): Promise<VerseWidgetData> => {
  const todayDate = new Date().toISOString().split('T')[0]!;

  // Try cached verse first
  try {
    const cached = await AsyncStorage.getItem(`widget_verse_${todayDate}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch { /* proceed to fetch */ }

  // Fetch from API
  try {
    const ayah = await getTodayAyah();
    if (ayah) {
      const verseData: VerseWidgetData = {
        arabic: ayah.text,
        surahName: ayah.surah.name,
        surahNameEn: ayah.surah.englishName,
        ayahNumber: ayah.number,
        numberInSurah: ayah.numberInSurah || ayah.number,
        date: todayDate,
        lastUpdated: new Date().toISOString(),
      };
      // Cache for the day
      await AsyncStorage.setItem(`widget_verse_${todayDate}`, JSON.stringify(verseData));
      return verseData;
    }
  } catch (error) {
    console.error('Error fetching verse for widget:', error);
  }

  // Fallback: Al-Fatiha first verse
  return {
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    surahName: 'سورة الفاتحة',
    surahNameEn: 'Al-Fatiha',
    ayahNumber: 1,
    numberInSurah: 1,
    date: todayDate,
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * تحضير بيانات الذكر اليومي للويدجت
 */
export const prepareDhikrWidgetData = async (
  language: string = 'ar',
  options?: { showTranslation?: boolean; showBenefit?: boolean }
): Promise<DhikrWidgetData> => {
  const todayDate = new Date().toISOString().split('T')[0]!;
  const allAzkar = getAllAzkar();

  if (allAzkar.length === 0) {
    return {
      arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ',
      count: 3,
      timesLabel: t('azkar.times'),
      category: 'misc',
      categoryName: t('widget.miscAzkar'),
      date: todayDate,
      lastUpdated: new Date().toISOString(),
    };
  }

  const index = getDailyDhikrIndex(allAzkar.length);
  const zikr = allAzkar[index]!;

  const lang = language as 'ar' | 'en' | 'ur' | 'id' | 'tr' | 'fr' | 'de' | 'hi' | 'bn' | 'ms' | 'ru' | 'es';
  const translation = (options?.showTranslation !== false && language !== 'ar') ? (resolveTranslationValue(zikr.translations?.[lang]) || resolveTranslationValue(zikr.translations?.['en'])) : undefined;
  const benefitVal = zikr.benefit;
  const benefit = (options?.showBenefit !== false) ? (typeof benefitVal === 'string'
    ? benefitVal
    : benefitVal?.[lang] || benefitVal?.['ar'] || undefined) : undefined;

  return {
    arabic: stripAzkarBrackets(zikr.arabic),
    translation,
    count: zikr.count,
    timesLabel: t('azkar.times'),
    category: zikr.category,
    categoryName: getDhikrCategoryName(zikr.category),
    benefit,
    date: todayDate,
    lastUpdated: new Date().toISOString(),
  };
};

// ========================================
// تتبع إكمال الصلوات من الويدجت
// ========================================

const PRAYER_COMPLETION_KEY = 'widget_prayer_completion';

/**
 * جلب حالة إكمال الصلوات لليوم
 */
export const getPrayerCompletion = async (): Promise<PrayerCompletionData> => {
  const todayDate = new Date().toISOString().split('T')[0]!;
  try {
    const data = await AsyncStorage.getItem(PRAYER_COMPLETION_KEY);
    if (data) {
      const parsed: PrayerCompletionData = JSON.parse(data);
      if (parsed.date === todayDate) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error getting prayer completion:', error);
  }

  return {
    date: todayDate,
    prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * حفظ حالة إكمال صلاة
 */
export const setPrayerCompleted = async (
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
  completed: boolean
): Promise<void> => {
  try {
    const current = await getPrayerCompletion();
    current.prayers[prayer] = completed;
    current.lastUpdated = new Date().toISOString();
    await AsyncStorage.setItem(PRAYER_COMPLETION_KEY, JSON.stringify(current));
    // Update shared widget data
    await updateSharedData();
  } catch (error) {
    console.error('Error setting prayer completion:', error);
  }
};

// ========================================
// مشاركة البيانات مع الويدجت
// ========================================

/**
 * تحديث البيانات المشتركة
 * يفوض إلى updateWidgetData من widget-data-bridge الذي يكتب إلى التخزين المشترك
 * ويطلب تحديث الويدجت الأصلي
 */
export const updateSharedData = async (
  prayerTimes?: PrayerTimes | null,
  location?: string
): Promise<void> => {
  const { updateWidgetData } = require('./widget-data-bridge');
  await updateWidgetData(prayerTimes, location);
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
 * يفوض إلى updateWidgetData من widget-data-bridge الذي يكتب البيانات
 * ويطلب تحديث الويدجت الأصلي على Android و iOS
 */
export const requestWidgetUpdate = async (): Promise<void> => {
  const { updateWidgetData } = require('./widget-data-bridge');
  await updateWidgetData();
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
    dhuhr: ['#0d8e62', '#1d4a3a'],
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
  prepareVerseWidgetData,
  prepareDhikrWidgetData,
  updateSharedData,
  getSharedData,
  
  // إكمال الصلوات
  getPrayerCompletion,
  setPrayerCompleted,
  
  // التحديث
  requestWidgetUpdate,
  
  // مساعدة
  getWidgetBackgroundColor,
  getWidgetPrayerIcon,
  WIDGET_ICON_PATHS,
};
