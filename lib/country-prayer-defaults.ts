// lib/country-prayer-defaults.ts
// فولباك أوقات الصلاة — يعمل بدون إنترنت
// يستخدم adhan npm package لحساب فلكي محلي دقيق

import {
  Coordinates,
  PrayerTimes as AdhanPrayerTimes,
  CalculationMethod as AdhanCalcMethod,
  SunnahTimes,
  Madhab,
} from 'adhan';
import type { PrayerTimes } from '@/lib/prayer-times';

// ────────────────────────────────────────────
// Country Defaults Map
// ────────────────────────────────────────────

export interface CountryDefaults {
  lat: number;
  lng: number;
  cityNameAr: string;
  cityNameEn: string;
  /** aladhan.com method ID */
  method: number;
  /** 0 = Shafi, 1 = Hanafi */
  asrSchool: 0 | 1;
}

export const MAKKAH_FALLBACK_COUNTRY_CODE = 'SA';
export const MAKKAH_FALLBACK_DEFAULTS: CountryDefaults = {
  lat: 21.4225,
  lng: 39.8262,
  cityNameAr: 'مكة المكرمة',
  cityNameEn: 'Makkah',
  method: 4,
  asrSchool: 0,
};

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
    case 17: return AdhanCalcMethod.Singapore();         // JAKIM ≈ Singapore
    case 18: return AdhanCalcMethod.MuslimWorldLeague(); // Tunisia ≈ MWL
    case 19: return AdhanCalcMethod.MuslimWorldLeague(); // Algeria ≈ MWL
    case 20: return AdhanCalcMethod.Singapore();         // KEMENAG ≈ Singapore
    case 21: return AdhanCalcMethod.MuslimWorldLeague(); // Morocco ≈ MWL
    case 22: return AdhanCalcMethod.MuslimWorldLeague(); // Lisboa ≈ MWL
    case 23: return AdhanCalcMethod.MuslimWorldLeague(); // Jordan ≈ MWL
    default: return AdhanCalcMethod.MuslimWorldLeague();
  }
}

/** 30+ countries with capital coords and correct calculation method */
export const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  // Gulf & Saudi
  SA: MAKKAH_FALLBACK_DEFAULTS,
  AE: { lat: 25.2048, lng: 55.2708, cityNameAr: 'دبي', cityNameEn: 'Dubai', method: 16, asrSchool: 0 },
  KW: { lat: 29.3759, lng: 47.9774, cityNameAr: 'الكويت', cityNameEn: 'Kuwait City', method: 9, asrSchool: 0 },
  QA: { lat: 25.2854, lng: 51.5310, cityNameAr: 'الدوحة', cityNameEn: 'Doha', method: 10, asrSchool: 0 },
  BH: { lat: 26.2285, lng: 50.5860, cityNameAr: 'المنامة', cityNameEn: 'Manama', method: 8, asrSchool: 0 },
  OM: { lat: 23.5880, lng: 58.3829, cityNameAr: 'مسقط', cityNameEn: 'Muscat', method: 8, asrSchool: 0 },
  YE: { lat: 15.3694, lng: 44.1910, cityNameAr: 'صنعاء', cityNameEn: 'Sanaa', method: 4, asrSchool: 0 },

  // Egypt & Levant
  EG: { lat: 30.0444, lng: 31.2357, cityNameAr: 'القاهرة', cityNameEn: 'Cairo', method: 5, asrSchool: 0 },
  JO: { lat: 31.9454, lng: 35.9284, cityNameAr: 'عمّان', cityNameEn: 'Amman', method: 23, asrSchool: 0 },
  PS: { lat: 31.9038, lng: 35.2034, cityNameAr: 'القدس', cityNameEn: 'Jerusalem', method: 3, asrSchool: 0 },
  SY: { lat: 33.5138, lng: 36.2765, cityNameAr: 'دمشق', cityNameEn: 'Damascus', method: 3, asrSchool: 0 },
  IQ: { lat: 33.3128, lng: 44.3615, cityNameAr: 'بغداد', cityNameEn: 'Baghdad', method: 3, asrSchool: 0 },
  LB: { lat: 33.8938, lng: 35.5018, cityNameAr: 'بيروت', cityNameEn: 'Beirut', method: 3, asrSchool: 0 },
  LY: { lat: 32.8872, lng: 13.1913, cityNameAr: 'طرابلس', cityNameEn: 'Tripoli', method: 3, asrSchool: 0 },
  SD: { lat: 15.5007, lng: 32.5599, cityNameAr: 'الخرطوم', cityNameEn: 'Khartoum', method: 5, asrSchool: 0 },

  // North Africa
  MA: { lat: 34.0209, lng: -6.8416, cityNameAr: 'الرباط', cityNameEn: 'Rabat', method: 21, asrSchool: 0 },
  DZ: { lat: 36.7538, lng: 3.0588, cityNameAr: 'الجزائر', cityNameEn: 'Algiers', method: 19, asrSchool: 0 },
  TN: { lat: 36.8065, lng: 10.1815, cityNameAr: 'تونس', cityNameEn: 'Tunis', method: 18, asrSchool: 0 },

  // South Asia
  PK: { lat: 33.6844, lng: 73.0479, cityNameAr: 'إسلام أباد', cityNameEn: 'Islamabad', method: 1, asrSchool: 1 },
  IN: { lat: 28.6139, lng: 77.2090, cityNameAr: 'نيودلهي', cityNameEn: 'New Delhi', method: 1, asrSchool: 1 },
  BD: { lat: 23.8103, lng: 90.4125, cityNameAr: 'دكا', cityNameEn: 'Dhaka', method: 1, asrSchool: 1 },

  // Southeast Asia
  ID: { lat: -6.2088, lng: 106.8456, cityNameAr: 'جاكرتا', cityNameEn: 'Jakarta', method: 20, asrSchool: 0 },
  MY: { lat: 3.1390, lng: 101.6869, cityNameAr: 'كوالالمبور', cityNameEn: 'Kuala Lumpur', method: 17, asrSchool: 0 },
  SG: { lat: 1.3521, lng: 103.8198, cityNameAr: 'سنغافورة', cityNameEn: 'Singapore', method: 11, asrSchool: 0 },

  // Turkey & Balkans
  TR: { lat: 41.0082, lng: 28.9784, cityNameAr: 'إسطنبول', cityNameEn: 'Istanbul', method: 13, asrSchool: 1 },
  BA: { lat: 43.8563, lng: 18.4131, cityNameAr: 'سراييفو', cityNameEn: 'Sarajevo', method: 13, asrSchool: 1 },
  AL: { lat: 41.3275, lng: 19.8187, cityNameAr: 'تيرانا', cityNameEn: 'Tirana', method: 13, asrSchool: 1 },
  XK: { lat: 42.6629, lng: 21.1655, cityNameAr: 'بريشتينا', cityNameEn: 'Pristina', method: 13, asrSchool: 1 },
  MK: { lat: 41.9973, lng: 21.4280, cityNameAr: 'سكوبيه', cityNameEn: 'Skopje', method: 13, asrSchool: 1 },

  // Iran
  IR: { lat: 35.6892, lng: 51.3890, cityNameAr: 'طهران', cityNameEn: 'Tehran', method: 7, asrSchool: 0 },

  // Central Asia
  AF: { lat: 34.5553, lng: 69.2075, cityNameAr: 'كابل', cityNameEn: 'Kabul', method: 1, asrSchool: 1 },
  UZ: { lat: 41.2995, lng: 69.2401, cityNameAr: 'طشقند', cityNameEn: 'Tashkent', method: 14, asrSchool: 1 },
  KZ: { lat: 51.1694, lng: 71.4491, cityNameAr: 'أستانا', cityNameEn: 'Astana', method: 14, asrSchool: 1 },
  TJ: { lat: 38.5598, lng: 68.7738, cityNameAr: 'دوشنبه', cityNameEn: 'Dushanbe', method: 1, asrSchool: 1 },
  KG: { lat: 42.8746, lng: 74.5698, cityNameAr: 'بشكيك', cityNameEn: 'Bishkek', method: 14, asrSchool: 1 },
  TM: { lat: 37.9601, lng: 58.3261, cityNameAr: 'عشق آباد', cityNameEn: 'Ashgabat', method: 14, asrSchool: 1 },
  AZ: { lat: 40.4093, lng: 49.8671, cityNameAr: 'باكو', cityNameEn: 'Baku', method: 13, asrSchool: 1 },

  // Sub-Saharan Africa
  NG: { lat: 9.0579, lng: 7.4951, cityNameAr: 'أبوجا', cityNameEn: 'Abuja', method: 3, asrSchool: 0 },
  SN: { lat: 14.7167, lng: -17.4677, cityNameAr: 'داكار', cityNameEn: 'Dakar', method: 3, asrSchool: 0 },
  SO: { lat: 2.0469, lng: 45.3182, cityNameAr: 'مقديشو', cityNameEn: 'Mogadishu', method: 3, asrSchool: 0 },
  ML: { lat: 12.6392, lng: -8.0029, cityNameAr: 'باماكو', cityNameEn: 'Bamako', method: 3, asrSchool: 0 },
  ZA: { lat: -33.9249, lng: 18.4241, cityNameAr: 'كيب تاون', cityNameEn: 'Cape Town', method: 3, asrSchool: 0 },

  // Southeast Asia (additional)
  TH: { lat: 13.7563, lng: 100.5018, cityNameAr: 'بانكوك', cityNameEn: 'Bangkok', method: 11, asrSchool: 0 },
  PH: { lat: 14.5995, lng: 120.9842, cityNameAr: 'مانيلا', cityNameEn: 'Manila', method: 11, asrSchool: 0 },
  BN: { lat: 4.9031, lng: 114.9398, cityNameAr: 'بندر سري بكاوان', cityNameEn: 'Bandar Seri Begawan', method: 11, asrSchool: 0 },

  // East Asia
  CN: { lat: 39.9042, lng: 116.4074, cityNameAr: 'بكين', cityNameEn: 'Beijing', method: 3, asrSchool: 1 },
  JP: { lat: 35.6762, lng: 139.6503, cityNameAr: 'طوكيو', cityNameEn: 'Tokyo', method: 3, asrSchool: 0 },
  KR: { lat: 37.5665, lng: 126.9780, cityNameAr: 'سيول', cityNameEn: 'Seoul', method: 3, asrSchool: 0 },

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

/**
 * Resolve the AlAdhan calculation method + Asr school for a given country code.
 * Returns `null` when the code is empty/unknown so callers can decide to fall back
 * to Makkah or keep existing settings.
 */
export function applyCountryPrayerDefaults(
  countryCode: string | undefined | null,
): { method: number; asrSchool: 0 | 1 } | null {
  if (!countryCode) return null;
  const defaults = COUNTRY_DEFAULTS[countryCode.toUpperCase()];
  if (!defaults) return null;
  return { method: defaults.method, asrSchool: defaults.asrSchool };
}

/**
 * Like `applyCountryPrayerDefaults` but always returns a value — falling back to
 * Makkah/Umm Al-Qura when the country is unknown. Used to seed
 * initial settings for a fresh install.
 */
export function getCountryPrayerDefaultsOrFallback(
  countryCode: string | undefined | null,
): { method: number; asrSchool: 0 | 1 } {
  return (
    applyCountryPrayerDefaults(countryCode) ?? {
      method: MAKKAH_FALLBACK_DEFAULTS.method,
      asrSchool: MAKKAH_FALLBACK_DEFAULTS.asrSchool,
    }
  );
}

// ────────────────────────────────────────────
// Core Calculation (Pure Offline)
// ────────────────────────────────────────────

function formatTime(date: Date, timezone?: string): string {
  if (!timezone) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return `${String(get('hour') % 24).padStart(2, '0')}:${String(get('minute')).padStart(2, '0')}`;
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
  calculationTimezone?: string,
): PrayerTimes {
  const coordinates = new Coordinates(lat, lng);
  const params = getAdhanCalcParams(methodId);
  params.madhab = asrSchool === 1 ? Madhab.Hanafi : Madhab.Shafi;

  const prayerTimes = new AdhanPrayerTimes(coordinates, date, params);
  const sunnahTimes = new SunnahTimes(prayerTimes);

  return {
    fajr: formatTime(prayerTimes.fajr, calculationTimezone),
    sunrise: formatTime(prayerTimes.sunrise, calculationTimezone),
    dhuhr: formatTime(prayerTimes.dhuhr, calculationTimezone),
    asr: formatTime(prayerTimes.asr, calculationTimezone),
    maghrib: formatTime(prayerTimes.maghrib, calculationTimezone),
    isha: formatTime(prayerTimes.isha, calculationTimezone),
    midnight: formatTime(sunnahTimes.middleOfTheNight, calculationTimezone),
    lastThird: formatTime(sunnahTimes.lastThirdOfTheNight, calculationTimezone),
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
 * Get approximate prayer times for a given date using the app-wide Makkah fallback.
 * Uses purely local calculation — no internet required.
 */
export function getCountryFallbackPrayerTimes(date?: Date): CountryFallbackResult {
  const defaults = MAKKAH_FALLBACK_DEFAULTS;
  const targetDate = date || new Date();

  const times = calculateLocalPrayerTimes(
    defaults.lat,
    defaults.lng,
    targetDate,
    defaults.method,
    defaults.asrSchool,
    'Asia/Riyadh',
  );

  return {
    times,
    cityNameAr: defaults.cityNameAr,
    cityNameEn: defaults.cityNameEn,
    countryCode: MAKKAH_FALLBACK_COUNTRY_CODE,
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
  const defaults = MAKKAH_FALLBACK_DEFAULTS;

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
      'Asia/Riyadh',
    );
    result.push({ date: dateStr, times });
  }
  return result;
}
