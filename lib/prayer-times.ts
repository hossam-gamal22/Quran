// lib/prayer-times.ts
// نظام مواقيت الصلاة - روح المسلم
// يستخدم AlAdhan API

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLanguage, isRTL as isRTLLang } from '@/lib/i18n';
import { MAKKAH_FALLBACK_DEFAULTS } from '@/lib/country-prayer-defaults';
import {
  dateForTimeZoneCalendarDay,
  epochForTimeStringOnDateInTimeZone,
} from './widget-timezone';

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
  /** Next location-local calendar day's Fajr, used after today's Isha. */
  tomorrowFajr?: string;
}

// Source of truth lives in prayer-api.ts. Re-exported here to keep all
// historical imports from '@/lib/prayer-times' working without duplicating
// the shape (any drift would break the offline cache + week-cache pipelines).
import type { PrayerTimesResponse } from './prayer-api';
export type { PrayerTimesResponse };

export interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  /** IANA timezone for these coordinates, persisted from the AlAdhan response. */
  timezone?: string;
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

export const isFridayDate = (date: Date = new Date()): boolean => date.getDay() === 5;

export const getPrayerTranslationKey = (prayer: PrayerName, date: Date = new Date()): string => {
  if (prayer === 'dhuhr' && isFridayDate(date)) {
    return 'prayer.jumuah';
  }
  return `prayer.${prayer}`;
};

export const getPrayerNameEn = (prayer: PrayerName, date: Date = new Date()): string => {
  const names: Record<PrayerName, string> = {
    fajr: 'Fajr',
    sunrise: 'Sunrise',
    dhuhr: isFridayDate(date) ? 'Jumuah' : 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
  };
  return names[prayer];
};

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
  | 17 // JAKIM, Malaysia
  | 18 // Tunisia
  | 19 // Algeria
  | 20 // KEMENAG, Indonesia
  | 21 // Morocco
  | 22 // Comunidade Islâmica de Lisboa
  | 23 // Ministry of Awqaf, Jordan
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
  17: { name: 'JAKIM, Malaysia', nameAr: 'دائرة الشؤون الإسلامية الماليزية — JAKIM' },
  18: { name: 'Tunisia', nameAr: 'تونس — وزارة الشؤون الدينية' },
  19: { name: 'Algeria', nameAr: 'الجزائر — وزارة الشؤون الدينية' },
  20: { name: 'KEMENAG, Indonesia', nameAr: 'إندونيسيا — وزارة الشؤون الدينية' },
  21: { name: 'Morocco', nameAr: 'المغرب — وزارة الأوقاف' },
  22: { name: 'Comunidade Islâmica de Lisboa', nameAr: 'الجالية الإسلامية بلشبونة' },
  23: { name: 'Ministry of Awqaf, Jordan', nameAr: 'الأردن — وزارة الأوقاف' },
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
  calculationMethod: MAKKAH_FALLBACK_DEFAULTS.method as CalculationMethod,
  asrJuristic: MAKKAH_FALLBACK_DEFAULTS.asrSchool,
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

const LOCATION_STABILITY_KM = 5;

const distanceKm = (a: Location, b: Location): number => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthKm * Math.asin(Math.sqrt(h));
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
  // Only the calculation method + school are needed to build the request, so accept
  // any object carrying them (callers pass either app or prayer-lib settings shapes).
  settings: Pick<PrayerSettings, 'calculationMethod' | 'asrJuristic'> = DEFAULT_SETTINGS
): Promise<PrayerTimesResponse> => {
  const { latitude, longitude } = location;
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${latitude}&longitude=${longitude}&method=${settings.calculationMethod}&school=${settings.asrJuristic}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await response.json();

    if (data.code === 200 && data.status === 'OK') {
      return data.data;
    } else {
      throw new Error('Failed to fetch prayer times');
    }
  } catch (error) {
    clearTimeout(timeoutId);
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
  const { fetchMonthlyPrayerTimes: fetchRobust } = await import('./prayer-api');
  return fetchRobust(
    location.latitude,
    location.longitude,
    month,
    year,
    settings.calculationMethod,
    settings.asrJuristic
  ) as unknown as Promise<PrayerTimesResponse[]>;
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
    midnight: cleanTime(timings.Midnight ?? ''),
    lastThird: cleanTime(timings.Lastthird ?? ''),
  };
};

/** Prayer rows shown beside one visible phone day must remain ordered. Reject
 * stale caches that were accidentally converted across timezone boundaries
 * (for example Dhuhr at 00:09 before Fajr at 15:20). */
export const hasChronologicalPrayerTimes = (times: PrayerTimes | null | undefined): times is PrayerTimes => {
  if (!times) return false;
  const values = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha]
    .map((time) => {
      const [hour, minute] = time.split(':').map(Number);
      return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : NaN;
    });
  return values.every((value) => Number.isFinite(value))
    && values.every((value, index) => index === 0 || value > values[index - 1]);
};

/**
 * تطبيق التعديلات على المواقيت
 */
export const applyAdjustments = (
  times: PrayerTimes,
  adjustments: PrayerAdjustments
): PrayerTimes => {
  const adjustTime = (time: string, minutes: number): string => {
    const parts = time.split(':').map(Number);
    const hours = Number.isFinite(parts[0]) ? parts[0] : 0;
    const mins = Number.isFinite(parts[1]) ? parts[1] : 0;
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

export const withTomorrowFajr = async (
  times: PrayerTimes,
  location: Location,
  referenceDate: Date,
  settings: Pick<PrayerSettings, 'calculationMethod' | 'asrJuristic' | 'adjustments'>,
  displayTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<PrayerTimes> => {
  if (times.tomorrowFajr) return times;
  const tomorrow = dateForTimeZoneCalendarDay(referenceDate, displayTimezone, 1);
  const response = await fetchPrayerTimes(location, tomorrow, settings);
  const tomorrowTimes = applyAdjustments(parsePrayerTimes(response), settings.adjustments);
  return { ...times, tomorrowFajr: tomorrowTimes.fajr };
};

export const alignPrayerTimesToUpcomingDay = async (
  times: PrayerTimes,
  location: Location,
  referenceDate: Date,
  settings: Pick<PrayerSettings, 'calculationMethod' | 'asrJuristic' | 'adjustments'>,
  displayTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): Promise<PrayerTimes> => {
  const tomorrowDate = dateForTimeZoneCalendarDay(referenceDate, displayTimezone, 1);
  const tomorrowResponse = await fetchPrayerTimes(location, tomorrowDate, settings);
  const tomorrowTimes = applyAdjustments(parsePrayerTimes(tomorrowResponse), settings.adjustments);
  const todayIshaEpoch = epochForTimeStringOnDateInTimeZone(times.isha, referenceDate, displayTimezone);

  if (todayIshaEpoch <= referenceDate.getTime()) {
    return withTomorrowFajr(tomorrowTimes, location, tomorrowDate, settings, displayTimezone);
  }

  return { ...times, tomorrowFajr: tomorrowTimes.fajr };
};

/**
 * تحويل الوقت النصي إلى كائن Date
 */
export const timeStringToDate = (timeString: string, baseDate: Date = new Date()): Date => {
  const parts = timeString.split(':').map(Number);
  const hours = Number.isFinite(parts[0]) && parts[0] >= 0 && parts[0] <= 23 ? parts[0] : 0;
  const minutes = Number.isFinite(parts[1]) && parts[1] >= 0 && parts[1] <= 59 ? parts[1] : 0;
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * تنسيق الوقت للعرض (12 ساعة)
 */
export const formatTime12h = (timeString: string): string => {
  const parts = timeString.split(':').map(Number);
  const hours = Number.isFinite(parts[0]) ? parts[0] : 0;
  const minutes = Number.isFinite(parts[1]) ? parts[1] : 0;
  const lang = getLanguage();
  const amPm: Record<string, [string, string]> = {
    ar: ['ص', 'م'],
    ur: ['ص', 'م'],
    en: ['AM', 'PM'],
    fr: ['AM', 'PM'],
    de: ['AM', 'PM'],
    es: ['AM', 'PM'],
    tr: ['ÖÖ', 'ÖS'],
    id: ['AM', 'PM'],
    ms: ['AM', 'PM'],
    hi: ['AM', 'PM'],
    bn: ['AM', 'PM'],
    ru: ['AM', 'PM'],
  };
  const [am, pm] = amPm[lang] || amPm.en;
  const period = hours >= 12 ? pm : am;
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * تنسيق الوقت للعرض (24 ساعة)
 */
export const formatTime24h = (timeString: string): string => {
  return timeString;
};

/**
 * تنسيق الوقت حسب إعداد المستخدم (12 أو 24 ساعة)
 */
export const formatPrayerTime = (timeString: string, use24Hour: boolean): string => {
  return use24Hour ? formatTime24h(timeString) : formatTime12h(timeString);
};

// ========================================
// دوال الصلاة القادمة
// ========================================

/**
 * الحصول على الصلاة القادمة
 */
export type PrayerTimeContext = string | {
  now?: Date;
  timezone?: string;
};

export interface NextPrayerResult {
  name: PrayerName;
  time: string;
  epochMs?: number;
}

const normalizePrayerTimeContext = (context?: PrayerTimeContext): { now: Date; timezone: string } => {
  const now = typeof context === 'object' && context?.now ? context.now : new Date();
  const timezone = typeof context === 'string'
    ? context
    : context?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return { now, timezone };
};

const getPrayerEpochForContext = (
  prayerTime: string,
  context: { now: Date; timezone: string },
  dayOffset = 0,
): number => epochForTimeStringOnDateInTimeZone(prayerTime, context.now, context.timezone, dayOffset);

export const getNextPrayer = (times: PrayerTimes, context?: PrayerTimeContext): NextPrayerResult | null => {
  const resolvedContext = normalizePrayerTimeContext(context);
  const nowMs = resolvedContext.now.getTime();
  const prayers: { name: PrayerName; time: string }[] = [
    { name: 'fajr', time: times.fajr },
    { name: 'sunrise', time: times.sunrise },
    { name: 'dhuhr', time: times.dhuhr },
    { name: 'asr', time: times.asr },
    { name: 'maghrib', time: times.maghrib },
    { name: 'isha', time: times.isha },
  ];

  for (const prayer of prayers) {
    const epochMs = getPrayerEpochForContext(prayer.time, resolvedContext);
    if (epochMs > nowMs) {
      return { ...prayer, epochMs };
    }
  }

  // إذا انتهت كل الصلوات اليوم، الصلاة القادمة هي فجر الغد
  const tomorrowFajr = times.tomorrowFajr || times.fajr;
  return {
    name: 'fajr',
    time: tomorrowFajr,
    epochMs: getPrayerEpochForContext(tomorrowFajr, resolvedContext, 1),
  };
};

/**
 * الحصول على الصلاة الحالية (التي دخل وقتها)
 */
export const getCurrentPrayer = (times: PrayerTimes, context?: PrayerTimeContext): PrayerName | null => {
  const resolvedContext = normalizePrayerTimeContext(context);
  const nowMs = resolvedContext.now.getTime();
  const prayers: { name: PrayerName; time: string }[] = [
    { name: 'isha', time: times.isha },
    { name: 'maghrib', time: times.maghrib },
    { name: 'asr', time: times.asr },
    { name: 'dhuhr', time: times.dhuhr },
    { name: 'sunrise', time: times.sunrise },
    { name: 'fajr', time: times.fajr },
  ];

  for (const prayer of prayers) {
    const epochMs = getPrayerEpochForContext(prayer.time, resolvedContext);
    if (nowMs >= epochMs) {
      return prayer.name;
    }
  }

  return null;
};

/**
 * حساب الوقت المتبقي للصلاة القادمة
 */
export const getTimeRemaining = (
  times: PrayerTimes,
  context?: PrayerTimeContext,
): { hours: number; minutes: number; seconds: number; totalSeconds: number } | null => {
  const resolvedContext = normalizePrayerTimeContext(context);
  const nextPrayer = getNextPrayer(times, resolvedContext);
  if (!nextPrayer) return null;

  const nextPrayerEpochMs = nextPrayer.epochMs ?? getPrayerEpochForContext(nextPrayer.time, resolvedContext);
  const diff = nextPrayerEpochMs - resolvedContext.now.getTime();
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
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as Location;
      if (existing?.latitude && existing?.longitude) {
        const driftKm = distanceKm(existing, location);
        if (driftKm < LOCATION_STABILITY_KM) {
          const stableLocation: Location = {
            ...existing,
            city: location.city || existing.city,
            country: location.country || existing.country,
            timezone: location.timezone || existing.timezone,
          };
          console.log(`[PrayerCanonical] location drift ignored: ${driftKm.toFixed(2)}km < ${LOCATION_STABILITY_KM}km`);
          await AsyncStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(stableLocation));
          return;
        }
        console.log(`[PrayerCanonical] location changed: ${driftKm.toFixed(2)}km >= ${LOCATION_STABILITY_KM}km`);
      }
    }
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
 * When method+school provided, also writes a method-specific key.
 */
export const cachePrayerTimes = async (
  date: string,
  times: PrayerTimes,
  method?: number,
  school?: number
): Promise<void> => {
  try {
    // Always write generic key (for home, widgets, worship tracker, etc.)
    const genericKey = `${STORAGE_KEYS.PRAYER_TIMES}_${date}`;
    await AsyncStorage.setItem(genericKey, JSON.stringify(times));
    // Also write method-specific key so a method change won't serve stale data
    if (method !== undefined && school !== undefined) {
      const specificKey = `${STORAGE_KEYS.PRAYER_TIMES}_${date}_M${method}_S${school}`;
      await AsyncStorage.setItem(specificKey, JSON.stringify(times));
    }
  } catch (error) {
    console.error('Error caching prayer times:', error);
  }
};

/**
 * جلب مواقيت الصلاة من الكاش
 * When method+school provided, tries the method-specific key first.
 */
export const getCachedPrayerTimes = async (date: string, method?: number, school?: number): Promise<PrayerTimes | null> => {
  try {
    // When a method+school is specified, return ONLY the method-specific cache.
    // The generic key is shared across all callers (home, widgets, worship tracker)
    // and holds whichever method was written last — falling back to it could serve
    // a DIFFERENT method's times than the user's current one, making the on-screen
    // countdown disagree with the (correctly method-matched) notifications by a few
    // minutes. Returning null instead forces a fresh fetch with the right method.
    if (method !== undefined && school !== undefined) {
      const specificKey = `${STORAGE_KEYS.PRAYER_TIMES}_${date}_M${method}_S${school}`;
      const specificData = await AsyncStorage.getItem(specificKey);
      if (!specificData) return null;
      const parsed = JSON.parse(specificData) as PrayerTimes;
      return hasChronologicalPrayerTimes(parsed) ? parsed : null;
    }
    // No method specified — caller accepts the method-agnostic generic cache.
    const genericKey = `${STORAGE_KEYS.PRAYER_TIMES}_${date}`;
    const data = await AsyncStorage.getItem(genericKey);
    if (!data) return null;
    const parsed = JSON.parse(data) as PrayerTimes;
    return hasChronologicalPrayerTimes(parsed) ? parsed : null;
  } catch (error) {
    console.error('Error getting cached prayer times:', error);
    return null;
  }
};

export const clearPrayerTimeCaches = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((key) => key.startsWith(`${STORAGE_KEYS.PRAYER_TIMES}_`));
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
      console.log(`🧹 [prayer-times] Cleared ${toRemove.length} prayer time cache keys`);
    }
  } catch (error) {
    console.error('Error clearing prayer time caches:', error);
  }
};

// ========================================
// دوال مساعدة
// ========================================

/**
 * الحصول على اسم الصلاة بالعربية
 */
export const getPrayerNameAr = (prayer: PrayerName, date: Date = new Date()): string => {
  const names: Record<PrayerName, string> = {
    fajr: 'الفجر',
    sunrise: 'الشروق',
    dhuhr: isFridayDate(date) ? 'صلاة الجمعة' : 'الظهر',
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
export const isPrayerPassed = (prayerTime: string, context?: PrayerTimeContext): boolean => {
  const resolvedContext = normalizePrayerTimeContext(context);
  return resolvedContext.now.getTime() > getPrayerEpochForContext(prayerTime, resolvedContext);
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
  formatPrayerTime,
  savePrayerSettings,
  getPrayerSettings,
  saveLocation,
  getStoredLocation,
  cachePrayerTimes,
  getCachedPrayerTimes,
  clearPrayerTimeCaches,
  isFridayDate,
  getPrayerTranslationKey,
  getPrayerNameEn,
  getPrayerNameAr,
  getPrayerIcon,
  isInLastThird,
  calculationMethods,
};
