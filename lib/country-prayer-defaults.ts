// lib/country-prayer-defaults.ts
// فولباك أوقات الصلاة بناءً على دولة الجهاز — يعمل بدون إنترنت
// يستخدم adhan npm package لحساب فلكي محلي دقيق

import {
  Coordinates,
  PrayerTimes as AdhanPrayerTimes,
  CalculationMethod as AdhanCalcMethod,
  SunnahTimes,
  Madhab,
} from 'adhan';
import type { PrayerTimes } from '@/lib/prayer-times';
import { detectUserCountry } from '@/services/hijriCalendarService';

// ────────────────────────────────────────────
// Country Defaults Map
// ────────────────────────────────────────────

interface CountryDefaults {
  lat: number;
  lng: number;
  cityNameAr: string;
  cityNameEn: string;
  /** aladhan.com method ID */
  method: number;
  /** 0 = Shafi, 1 = Hanafi */
  asrSchool: 0 | 1;
}

/**
 * Maps aladhan.com method IDs to adhan npm CalculationMethod factories.
 * Not all IDs have a 1:1 match; we use the closest equivalent.
 */
function getAdhanCalcParams(methodId: number) {
  switch (methodId) {
    case 0: return AdhanCalcMethod.Tehran();           // Shia → Tehran closest
    case 1: return AdhanCalcMethod.Karachi();
    case 2: return AdhanCalcMethod.NorthAmerica();
    case 3: return AdhanCalcMethod.MuslimWorldLeague();
    case 4: return AdhanCalcMethod.UmmAlQura();
    case 5: return AdhanCalcMethod.Egyptian();
    case 7: return AdhanCalcMethod.Tehran();
    case 8: return AdhanCalcMethod.Dubai();            // Gulf ≈ Dubai
    case 9: return AdhanCalcMethod.Kuwait();
    case 10: return AdhanCalcMethod.Qatar();
    case 11: return AdhanCalcMethod.Singapore();
    case 12: return AdhanCalcMethod.MuslimWorldLeague(); // France ≈ MWL
    case 13: return AdhanCalcMethod.Turkey();
    case 14: return AdhanCalcMethod.MuslimWorldLeague(); // Russia ≈ MWL
    case 15: return AdhanCalcMethod.MoonsightingCommittee();
    case 16: return AdhanCalcMethod.Dubai();
    default: return AdhanCalcMethod.UmmAlQura();
  }
}

/** 30+ countries with capital coords and correct calculation method */
export const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  // Gulf & Saudi
  SA: { lat: 21.4225, lng: 39.8262, cityNameAr: 'مكة المكرمة', cityNameEn: 'Makkah', method: 4, asrSchool: 0 },
  AE: { lat: 25.2048, lng: 55.2708, cityNameAr: 'دبي', cityNameEn: 'Dubai', method: 16, asrSchool: 0 },
  KW: { lat: 29.3759, lng: 47.9774, cityNameAr: 'الكويت', cityNameEn: 'Kuwait City', method: 9, asrSchool: 0 },
  QA: { lat: 25.2854, lng: 51.5310, cityNameAr: 'الدوحة', cityNameEn: 'Doha', method: 10, asrSchool: 0 },
  BH: { lat: 26.2285, lng: 50.5860, cityNameAr: 'المنامة', cityNameEn: 'Manama', method: 8, asrSchool: 0 },
  OM: { lat: 23.5880, lng: 58.3829, cityNameAr: 'مسقط', cityNameEn: 'Muscat', method: 8, asrSchool: 0 },
  YE: { lat: 15.3694, lng: 44.1910, cityNameAr: 'صنعاء', cityNameEn: 'Sanaa', method: 4, asrSchool: 0 },

  // Egypt & Levant
  EG: { lat: 30.0444, lng: 31.2357, cityNameAr: 'القاهرة', cityNameEn: 'Cairo', method: 5, asrSchool: 0 },
  JO: { lat: 31.9454, lng: 35.9284, cityNameAr: 'عمّان', cityNameEn: 'Amman', method: 3, asrSchool: 0 },
  PS: { lat: 31.9038, lng: 35.2034, cityNameAr: 'القدس', cityNameEn: 'Jerusalem', method: 3, asrSchool: 0 },
  SY: { lat: 33.5138, lng: 36.2765, cityNameAr: 'دمشق', cityNameEn: 'Damascus', method: 3, asrSchool: 0 },
  IQ: { lat: 33.3128, lng: 44.3615, cityNameAr: 'بغداد', cityNameEn: 'Baghdad', method: 3, asrSchool: 0 },
  LB: { lat: 33.8938, lng: 35.5018, cityNameAr: 'بيروت', cityNameEn: 'Beirut', method: 3, asrSchool: 0 },
  LY: { lat: 32.8872, lng: 13.1913, cityNameAr: 'طرابلس', cityNameEn: 'Tripoli', method: 3, asrSchool: 0 },
  SD: { lat: 15.5007, lng: 32.5599, cityNameAr: 'الخرطوم', cityNameEn: 'Khartoum', method: 5, asrSchool: 0 },

  // North Africa
  MA: { lat: 34.0209, lng: -6.8416, cityNameAr: 'الرباط', cityNameEn: 'Rabat', method: 3, asrSchool: 0 },
  DZ: { lat: 36.7538, lng: 3.0588, cityNameAr: 'الجزائر', cityNameEn: 'Algiers', method: 3, asrSchool: 0 },
  TN: { lat: 36.8065, lng: 10.1815, cityNameAr: 'تونس', cityNameEn: 'Tunis', method: 3, asrSchool: 0 },

  // South Asia
  PK: { lat: 33.6844, lng: 73.0479, cityNameAr: 'إسلام أباد', cityNameEn: 'Islamabad', method: 1, asrSchool: 1 },
  IN: { lat: 28.6139, lng: 77.2090, cityNameAr: 'نيودلهي', cityNameEn: 'New Delhi', method: 1, asrSchool: 1 },
  BD: { lat: 23.8103, lng: 90.4125, cityNameAr: 'دكا', cityNameEn: 'Dhaka', method: 1, asrSchool: 1 },

  // Southeast Asia
  ID: { lat: -6.2088, lng: 106.8456, cityNameAr: 'جاكرتا', cityNameEn: 'Jakarta', method: 11, asrSchool: 0 },
  MY: { lat: 3.1390, lng: 101.6869, cityNameAr: 'كوالالمبور', cityNameEn: 'Kuala Lumpur', method: 11, asrSchool: 0 },
  SG: { lat: 1.3521, lng: 103.8198, cityNameAr: 'سنغافورة', cityNameEn: 'Singapore', method: 11, asrSchool: 0 },

  // Turkey & Central Asia
  TR: { lat: 41.0082, lng: 28.9784, cityNameAr: 'إسطنبول', cityNameEn: 'Istanbul', method: 13, asrSchool: 1 },

  // Sub-Saharan Africa
  NG: { lat: 9.0579, lng: 7.4951, cityNameAr: 'أبوجا', cityNameEn: 'Abuja', method: 3, asrSchool: 0 },
  SN: { lat: 14.7167, lng: -17.4677, cityNameAr: 'داكار', cityNameEn: 'Dakar', method: 3, asrSchool: 0 },
  SO: { lat: 2.0469, lng: 45.3182, cityNameAr: 'مقديشو', cityNameEn: 'Mogadishu', method: 3, asrSchool: 0 },

  // Western countries
  US: { lat: 38.9072, lng: -77.0369, cityNameAr: 'واشنطن', cityNameEn: 'Washington DC', method: 2, asrSchool: 0 },
  CA: { lat: 45.4215, lng: -75.6972, cityNameAr: 'أوتاوا', cityNameEn: 'Ottawa', method: 2, asrSchool: 0 },
  GB: { lat: 51.5074, lng: -0.1278, cityNameAr: 'لندن', cityNameEn: 'London', method: 3, asrSchool: 0 },
  FR: { lat: 48.8566, lng: 2.3522, cityNameAr: 'باريس', cityNameEn: 'Paris', method: 12, asrSchool: 0 },
  DE: { lat: 52.5200, lng: 13.4050, cityNameAr: 'برلين', cityNameEn: 'Berlin', method: 3, asrSchool: 0 },
  ES: { lat: 40.4168, lng: -3.7038, cityNameAr: 'مدريد', cityNameEn: 'Madrid', method: 3, asrSchool: 0 },
  AU: { lat: -33.8688, lng: 151.2093, cityNameAr: 'سيدني', cityNameEn: 'Sydney', method: 3, asrSchool: 0 },
  RU: { lat: 55.7558, lng: 37.6173, cityNameAr: 'موسكو', cityNameEn: 'Moscow', method: 14, asrSchool: 0 },
  IT: { lat: 41.9028, lng: 12.4964, cityNameAr: 'روما', cityNameEn: 'Rome', method: 3, asrSchool: 0 },
  NL: { lat: 52.3676, lng: 4.9041, cityNameAr: 'أمستردام', cityNameEn: 'Amsterdam', method: 3, asrSchool: 0 },
  SE: { lat: 59.3293, lng: 18.0686, cityNameAr: 'ستوكهولم', cityNameEn: 'Stockholm', method: 3, asrSchool: 0 },
  AT: { lat: 48.2082, lng: 16.3738, cityNameAr: 'فيينا', cityNameEn: 'Vienna', method: 3, asrSchool: 0 },
  BE: { lat: 50.8503, lng: 4.3517, cityNameAr: 'بروكسل', cityNameEn: 'Brussels', method: 3, asrSchool: 0 },
};

// Default for unknown country codes
const DEFAULT_COUNTRY: CountryDefaults = COUNTRY_DEFAULTS['SA'];

// ────────────────────────────────────────────
// Core Calculation (Pure Offline)
// ────────────────────────────────────────────

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Calculate prayer times for a specific date and location using the adhan package.
 * Pure offline — no network calls.
 */
export function calculateLocalPrayerTimes(
  lat: number,
  lng: number,
  date: Date,
  methodId: number,
  asrSchool: 0 | 1 = 0,
): PrayerTimes {
  const coordinates = new Coordinates(lat, lng);
  const params = getAdhanCalcParams(methodId);
  params.madhab = asrSchool === 1 ? Madhab.Hanafi : Madhab.Shafi;

  const prayerTimes = new AdhanPrayerTimes(coordinates, date, params);
  const sunnahTimes = new SunnahTimes(prayerTimes);

  return {
    fajr: formatTime(prayerTimes.fajr),
    sunrise: formatTime(prayerTimes.sunrise),
    dhuhr: formatTime(prayerTimes.dhuhr),
    asr: formatTime(prayerTimes.asr),
    maghrib: formatTime(prayerTimes.maghrib),
    isha: formatTime(prayerTimes.isha),
    midnight: formatTime(sunnahTimes.middleOfTheNight),
    lastThird: formatTime(sunnahTimes.lastThirdOfTheNight),
  };
}

// ────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────

export interface CountryFallbackResult {
  times: PrayerTimes;
  cityNameAr: string;
  cityNameEn: string;
  countryCode: string;
  source: 'countryFallback';
}

/**
 * Get prayer times for a given date based on the device's country.
 * Uses purely local calculation — no internet required.
 */
export function getCountryFallbackPrayerTimes(date?: Date): CountryFallbackResult {
  const countryCode = detectUserCountry();
  const defaults = COUNTRY_DEFAULTS[countryCode] || DEFAULT_COUNTRY;
  const targetDate = date || new Date();

  const times = calculateLocalPrayerTimes(
    defaults.lat,
    defaults.lng,
    targetDate,
    defaults.method,
    defaults.asrSchool,
  );

  return {
    times,
    cityNameAr: defaults.cityNameAr,
    cityNameEn: defaults.cityNameEn,
    countryCode,
    source: 'countryFallback',
  };
}

/**
 * Get prayer times for a range of dates (for notification scheduling).
 * Pure offline — no internet required.
 */
export function getCountryFallbackTimesRange(
  startDate: Date,
  days: number,
): Array<{ date: string; times: PrayerTimes }> {
  const countryCode = detectUserCountry();
  const defaults = COUNTRY_DEFAULTS[countryCode] || DEFAULT_COUNTRY;

  const result: Array<{ date: string; times: PrayerTimes }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const times = calculateLocalPrayerTimes(
      defaults.lat,
      defaults.lng,
      d,
      defaults.method,
      defaults.asrSchool,
    );
    result.push({ date: dateStr, times });
  }
  return result;
}
