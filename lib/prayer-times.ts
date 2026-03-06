// lib/prayer-times.ts
// نظام مواقيت الصلاة - روح المسلم
// يستخدم AlAdhan API

import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================
// الأنواع والواجهات
// ========================================

export interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  midnight: string;
  lastThird: string;
}

export interface PrayerTimesResponse {
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
    Midnight: string;
    Lastthird: string;
  };
  date: {
    readable: string;
    timestamp: string;
    hijri: {
      date: string;
      day: string;
      month: { number: number; en: string; ar: string };
      year: string;
    };
    gregorian: {
      date: string;
      day: string;
      month: { number: number; en: string };
      year: string;
    };
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: { id: number; name: string };
  };
}

export interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface PrayerSettings {
  calculationMethod: CalculationMethod;
  asrJuristic: AsrJuristic;
  adjustments: PrayerAdjustments;
  notifications: PrayerNotifications;
}

export interface PrayerAdjustments {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface PrayerNotifications {
  enabled: boolean;
  fajr: boolean;
  sunrise: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  beforeMinutes: number;
}

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export type CalculationMethod = 
  | 0  // Shia Ithna-Ashari
  | 1  // University of Islamic Sciences, Karachi
  | 2  // Islamic Society of North America
  | 3  // Muslim World League
  | 4  // Umm Al-Qura University, Makkah
  | 5  // Egyptian General Authority of Survey
  | 7  // Institute of Geophysics, University of Tehran
  | 8  // Gulf Region
  | 9  // Kuwait
  | 10 // Qatar
  | 11 // Majlis Ugama Islam Singapura
  | 12 // Union Organization Islamic de France
  | 13 // Diyanet İşleri Başkanlığı, Turkey
  | 14 // Spiritual Administration of Muslims of Russia
  | 15 // Moonsighting Committee Worldwide
  | 16 // Dubai
  | 99; // Custom

export type AsrJuristic = 0 | 1; // 0 = Shafi, 1 = Hanafi

// ========================================
// طرق الحساب
// ========================================

export const calculationMethods: Record<CalculationMethod, { name: string; nameAr: string }> = {
  0: { name: 'Shia Ithna-Ashari', nameAr: 'الشيعة الإثنا عشرية' },
  1: { name: 'University of Islamic Sciences, Karachi', nameAr: 'جامعة العلوم الإسلامية، كراتشي' },
  2: { name: 'Islamic Society of North America', nameAr: 'الجمعية الإسلامية لأمريكا الشمالية' },
  3: { name: 'Muslim World League', nameAr: 'رابطة العالم الإسلامي' },
  4: { name: 'Umm Al-Qura University, Makkah', nameAr: 'جامعة أم القرى، مكة' },
  5: { name: 'Egyptian General Authority of Survey', nameAr: 'الهيئة المصرية العامة للمساحة' },
  7: { name: 'Institute of Geophysics, University of Tehran', nameAr: 'معهد الجيوفيزياء، جامعة طهران' },
  8: { name: 'Gulf Region', nameAr: 'منطقة الخليج' },
  9: { name: 'Kuwait', nameAr: 'الكويت' },
  10: { name: 'Qatar', nameAr: 'قطر' },
  11: { name: 'Majlis Ugama Islam Singapura', nameAr: 'مجلس الشؤون الإسلامية بسنغافورة' },
  12: { name: 'Union Organization Islamic de France', nameAr: 'اتحاد المنظمات الإسلامية بفرنسا' },
  13: { name: 'Diyanet İşleri Başkanlığı, Turkey', nameAr: 'رئاسة الشؤون الدينية، تركيا' },
  14: { name: 'Spiritual Administration of Muslims of Russia', nameAr: 'الإدارة الدينية لمسلمي روسيا' },
  15: { name: 'Moonsighting Committee Worldwide', nameAr: 'لجنة رؤية الهلال العالمية' },
  16: { name: 'Dubai', nameAr: 'دبي' },
  99: { name: 'Custom', nameAr: 'مخصص' },
};

// ========================================
// الإعدادات الافتراضية
// ========================================

const STORAGE_KEYS = {
  PRAYER_TIMES: 'prayer_times_cache',
  PRAYER_SETTINGS: 'prayer_settings',
  LOCATION: 'user_location',
};

const DEFAULT_SETTINGS: PrayerSettings = {
  calculationMethod: 4, // أم القرى
  asrJuristic: 0, // الشافعي
  adjustments: {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  },
  notifications: {
    enabled: true,
    fajr: true,
    sunrise: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
    beforeMinutes: 10,
  },
};

// ========================================
// دوال API
// ========================================

/**
 * جلب مواقيت الصلاة من AlAdhan API
 */
export const fetchPrayerTimes = async (
  location: Location,
  date: Date = new Date(),
  settings: PrayerSettings = DEFAULT_SETTINGS
): Promise<PrayerTimesResponse> => {
  const { latitude, longitude } = location;
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=${settings.calculationMethod}&school=${settings.asrJuristic}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 200 && data.status === 'OK') {
      return data.data;
    } else {
      throw new Error('Failed to fetch prayer times');
    }
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    throw error;
  }
};

/**
 * جلب مواقيت الصلاة لشهر كامل
 */
export const fetchMonthlyPrayerTimes = async (
  location: Location,
  month: number,
  year: number,
  settings: PrayerSettings = DEFAULT_SETTINGS
): Promise<PrayerTimesResponse[]> => {
  const { latitude, longitude } = location;

  const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${settings.calculationMethod}&school=${settings.asrJuristic}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 200 && data.status === 'OK') {
      return data.data;
    } else {
      throw new Error('Failed to fetch monthly prayer times');
    }
  } catch (error) {
    console.error('Error fetching monthly prayer times:', error);
    throw error;
  }
};

// ========================================
// دوال معالجة الأوقات
// ========================================

/**
 * تحويل الاستجابة إلى كائن PrayerTimes
 */
export const parsePrayerTimes = (response: PrayerTimesResponse): PrayerTimes => {
  const { timings } = response;
  
  // إزالة المنطقة الزمنية من الوقت (مثل "05:30 (EET)")
  const cleanTime = (time: string): string => {
    return time.replace(/\s*\([^)]*\)/g, '').trim();
  };

  return {
    fajr: cleanTime(timings.Fajr),
    sunrise: cleanTime(timings.Sunrise),
    dhuhr: cleanTime(timings.Dhuhr),
    asr: cleanTime(timings.Asr),
    maghrib: cleanTime(timings.Maghrib),
    isha: cleanTime(timings.Isha),
    midnight: cleanTime(timings.Midnight),
    lastThird: cleanTime(timings.Lastthird),
  };
};

/**
 * تطبيق التعديلات على المواقيت
 */
export const applyAdjustments = (
  times: PrayerTimes,
  adjustments: PrayerAdjustments
): PrayerTimes => {
  const adjustTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0, 0);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return {
    fajr: adjustTime(times.fajr, adjustments.fajr),
    sunrise: adjustTime(times.sunrise, adjustments.sunrise),
    dhuhr: adjustTime(times.dhuhr, adjustments.dhuhr),
    asr: adjustTime(times.asr, adjustments.asr),
    maghrib: adjustTime(times.maghrib, adjustments.maghrib),
    isha: adjustTime(times.isha, adjustments.isha),
    midnight: times.midnight,
    lastThird: times.lastThird,
  };
};

/**
 * تحويل الوقت النصي إلى كائن Date
 */
export const timeStringToDate = (timeString: string, baseDate: Date = new Date()): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * تنسيق الوقت للعرض (12 ساعة)
 */
export const formatTime12h = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * تنسيق الوقت للعرض (24 ساعة)
 */
export const formatTime24h = (timeString: string): string => {
  return timeString;
};

// ========================================
// دوال الصلاة القادمة
// ========================================

/**
 * الحصول على الصلاة القادمة
 */
export const getNextPrayer = (times: PrayerTimes): { name: PrayerName; time: string } | null => {
  const now = new Date();
  const prayers: { name: PrayerName; time: string }[] = [
    { name: 'fajr', time: times.fajr },
    { name: 'sunrise', time: times.sunrise },
    { name: 'dhuhr', time: times.dhuhr },
    { name: 'asr', time: times.asr },
    { name: 'maghrib', time: times.maghrib },
    { name: 'isha', time: times.isha },
  ];

  for (const prayer of prayers) {
    const prayerTime = timeStringToDate(prayer.time);
    if (prayerTime > now) {
      return prayer;
    }
  }

  // إذا انتهت كل الصلوات اليوم، الصلاة القادمة هي فجر الغد
  return { name: 'fajr', time: times.fajr };
};

/**
 * الحصول على الصلاة الحالية (التي دخل وقتها)
 */
export const getCurrentPrayer = (times: PrayerTimes): PrayerName | null => {
  const now = new Date();
  const prayers: { name: PrayerName; time: string }[] = [
    { name: 'isha', time: times.isha },
    { name: 'maghrib', time: times.maghrib },
    { name: 'asr', time: times.asr },
    { name: 'dhuhr', time: times.dhuhr },
    { name: 'sunrise', time: times.sunrise },
    { name: 'fajr', time: times.fajr },
  ];

  for (const prayer of prayers) {
    const prayerTime = timeStringToDate(prayer.time);
    if (now >= prayerTime) {
      return prayer.name;
    }
  }

  return null;
};

/**
 * حساب الوقت المتبقي للصلاة القادمة
 */
export const getTimeRemaining = (
  times: PrayerTimes
): { hours: number; minutes: number; seconds: number; totalSeconds: number } | null => {
  const nextPrayer = getNextPrayer(times);
  if (!nextPrayer) return null;

  const now = new Date();
  let prayerTime = timeStringToDate(nextPrayer.time);

  // إذا كان الوقت قد مر، أضف يوم (فجر الغد)
  if (prayerTime <= now) {
    prayerTime.setDate(prayerTime.getDate() + 1);
  }

  const diff = prayerTime.getTime() - now.getTime();
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds, totalSeconds };
};

/**
 * تنسيق الوقت المتبقي للعرض
 */
export const formatTimeRemaining = (
  remaining: { hours: number; minutes: number; seconds: number }
): string => {
  const { hours, minutes, seconds } = remaining;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

// ========================================
// دوال الثلث الأخير ومنتصف الليل
// ========================================

/**
 * حساب الثلث الأخير من الليل
 */
export const calculateLastThird = (maghrib: string, fajr: string): string => {
  const maghribDate = timeStringToDate(maghrib);
  let fajrDate = timeStringToDate(fajr);
  
  // إذا كان الفجر قبل المغرب، أضف يوم
  if (fajrDate <= maghribDate) {
    fajrDate.setDate(fajrDate.getDate() + 1);
  }
  
  const nightDuration = fajrDate.getTime() - maghribDate.getTime();
  const lastThirdStart = new Date(maghribDate.getTime() + (nightDuration * 2 / 3));
  
  return `${String(lastThirdStart.getHours()).padStart(2, '0')}:${String(lastThirdStart.getMinutes()).padStart(2, '0')}`;
};

/**
 * حساب منتصف الليل
 */
export const calculateMidnight = (maghrib: string, fajr: string): string => {
  const maghribDate = timeStringToDate(maghrib);
  let fajrDate = timeStringToDate(fajr);
  
  if (fajrDate <= maghribDate) {
    fajrDate.setDate(fajrDate.getDate() + 1);
  }
  
  const nightDuration = fajrDate.getTime() - maghribDate.getTime();
  const midnight = new Date(maghribDate.getTime() + (nightDuration / 2));
  
  return `${String(midnight.getHours()).padStart(2, '0')}:${String(midnight.getMinutes()).padStart(2, '0')}`;
};

/**
 * هل نحن في الثلث الأخير من الليل؟
 */
export const isInLastThird = (times: PrayerTimes): boolean => {
  const now = new Date();
  const lastThird = timeStringToDate(times.lastThird);
  const fajr = timeStringToDate(times.fajr);
  
  // التعامل مع حالة منتصف الليل
  if (fajr < lastThird) {
    fajr.setDate(fajr.getDate() + 1);
  }
  
  return now >= lastThird && now < fajr;
};

// ========================================
// دوال التخزين
// ========================================

/**
 * حفظ إعدادات الصلاة
 */
export const savePrayerSettings = async (settings: PrayerSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PRAYER_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving prayer settings:', error);
  }
};

/**
 * جلب إعدادات الصلاة
 */
export const getPrayerSettings = async (): Promise<PrayerSettings> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting prayer settings:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * حفظ الموقع
 */
export const saveLocation = async (location: Location): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(location));
  } catch (error) {
    console.error('Error saving location:', error);
  }
};

/**
 * جلب الموقع المحفوظ
 */
export const getStoredLocation = async (): Promise<Location | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting stored location:', error);
    return null;
  }
};

/**
 * حفظ مواقيت الصلاة في الكاش
 */
export const cachePrayerTimes = async (
  date: string,
  times: PrayerTimes
): Promise<void> => {
  try {
    const cacheKey = `${STORAGE_KEYS.PRAYER_TIMES}_${date}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(times));
  } catch (error) {
    console.error('Error caching prayer times:', error);
  }
};

/**
 * جلب مواقيت الصلاة من الكاش
 */
export const getCachedPrayerTimes = async (date: string): Promise<PrayerTimes | null> => {
  try {
    const cacheKey = `${STORAGE_KEYS.PRAYER_TIMES}_${date}`;
    const data = await AsyncStorage.getItem(cacheKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached prayer times:', error);
    return null;
  }
};

// ========================================
// دوال مساعدة
// ========================================

/**
 * الحصول على اسم الصلاة بالعربية
 */
export const getPrayerNameAr = (prayer: PrayerName): string => {
  const names: Record<PrayerName, string> = {
    fajr: 'الفجر',
    sunrise: 'الشروق',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
  };
  return names[prayer];
};

/**
 * الحصول على أيقونة الصلاة
 */
export const getPrayerIcon = (prayer: PrayerName): string => {
  const icons: Record<PrayerName, string> = {
    fajr: 'weather-sunset-up',
    sunrise: 'weather-sunny',
    dhuhr: 'white-balance-sunny',
    asr: 'weather-sunny-alert',
    maghrib: 'weather-sunset-down',
    isha: 'weather-night',
  };
  return icons[prayer];
};

/**
 * الحصول على تاريخ اليوم بالتنسيق المطلوب
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * هل الصلاة فاتت؟
 */
export const isPrayerPassed = (prayerTime: string): boolean => {
  const now = new Date();
  const prayer = timeStringToDate(prayerTime);
  return now > prayer;
};

/**
 * الحصول على جميع الصلوات كمصفوفة
 */
export const getPrayersArray = (times: PrayerTimes): { name: PrayerName; time: string }[] => {
  return [
    { name: 'fajr', time: times.fajr },
    { name: 'sunrise', time: times.sunrise },
    { name: 'dhuhr', time: times.dhuhr },
    { name: 'asr', time: times.asr },
    { name: 'maghrib', time: times.maghrib },
    { name: 'isha', time: times.isha },
  ];
};

export default {
  fetchPrayerTimes,
  fetchMonthlyPrayerTimes,
  parsePrayerTimes,
  applyAdjustments,
  getNextPrayer,
  getCurrentPrayer,
  getTimeRemaining,
  formatTimeRemaining,
  formatTime12h,
  formatTime24h,
  savePrayerSettings,
  getPrayerSettings,
  saveLocation,
  getStoredLocation,
  cachePrayerTimes,
  getCachedPrayerTimes,
  getPrayerNameAr,
  getPrayerIcon,
  isInLastThird,
  calculationMethods,
};
