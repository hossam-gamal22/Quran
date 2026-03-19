// services/hijriCalendarService.ts
// نظام التقويم الهجري — 4 طبقات بالترتيب:
// 1. Admin Override (أعلى أولوية)
// 2. AlAdhan API per country
// 3. Google News RSS (أيام 28-30 فقط)
// 4. Tabular Calculation (أدنى أولوية)

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { gregorianToHijri, getHijriMonthDays, HIJRI_MONTHS_AR, HIJRI_MONTHS_EN } from '@/lib/hijri-date';
import { getFirestoreOverride } from '@/lib/hijri-overrides';
import { fetchMoonSightingNews } from '@/services/moonSightingNews';

// ============================================
// Types
// ============================================

export interface HijriResult {
  day: number;
  month: number;
  year: number;
  monthLength: 29 | 30;
  monthName: string;
  monthNameAr: string;
  source: 'admin_override' | 'aladhan_api' | 'news_detection' | 'calculation';
  countryCode: string;
  confidence: 'high' | 'medium' | 'low';
  note?: string;
}

interface AlAdhanHijriResponse {
  code: number;
  status: string;
  data: {
    hijri: {
      date: string;
      day: string;
      weekday: { en: string; ar: string };
      month: { number: number; en: string; ar: string };
      year: string;
      holidays: string[];
    };
  };
}

// ============================================
// Country Hijri Adjustment Map
// ============================================

export const COUNTRY_HIJRI_ADJUSTMENT: Record<string, number> = {
  // Group A — Saudi/Gulf (Umm Al-Qura)
  SA: 0, AE: 0, KW: 0, QA: 0, BH: 0, OM: 0,
  // Group B — Egypt/Levant
  EG: 0, JO: 0, PS: 0, SY: 0, IQ: 0, LB: 0, LY: 0,
  // Group C — North Africa
  MA: 0, DZ: 0, TN: 0,
  // Group D — South Asia (often +1 from Saudi)
  PK: 1, IN: 1, BD: 1,
  // Group E — Southeast Asia
  ID: 0, MY: 0, SG: 0,
  // Group F — Sub-Saharan Africa
  NG: 0, SN: 0, GH: 0,
  // Group G — Western countries
  US: 0, GB: 0, FR: 0, CA: 0, AU: 0, DE: 0, ES: 0,
  // Turkey
  TR: 0,
  // Default
  DEFAULT: 0,
};

// Country groups for fallback
export const COUNTRY_GROUPS: Record<string, string[]> = {
  A: ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'],
  B: ['EG', 'JO', 'PS', 'SY', 'IQ', 'LB', 'LY'],
  C: ['MA', 'DZ', 'TN'],
  D: ['PK', 'IN', 'BD'],
  E: ['ID', 'MY', 'SG', 'BN'],
};

// ============================================
// Storage Keys & Cache Durations
// ============================================

const CACHE_PREFIX = 'hijri_cache_';
const USER_COUNTRY_KEY = '@hijri_user_country';
const USER_ADJUSTMENT_KEY = '@hijri_user_adjustment';

const CACHE_DURATIONS = {
  admin_override: 60 * 60 * 1000,       // 1 hour
  aladhan_api: 12 * 60 * 60 * 1000,     // 12 hours
  news_detection: 2 * 60 * 60 * 1000,   // 2 hours
  calculation: 24 * 60 * 60 * 1000,     // 24 hours
};

// ============================================
// Detect User Country
// ============================================

export function detectUserCountry(): string {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0 && locales[0].regionCode) {
      return locales[0].regionCode;
    }
  } catch {}
  return 'SA';
}

export async function getUserCountry(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(USER_COUNTRY_KEY);
    if (saved) return saved;
  } catch {}
  return detectUserCountry();
}

export async function setUserCountry(countryCode: string): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_COUNTRY_KEY, countryCode);
  } catch {}
}

// ============================================
// User Adjustment (±1 on top of everything)
// ============================================

export async function getUserAdjustment(): Promise<number> {
  try {
    const val = await AsyncStorage.getItem(USER_ADJUSTMENT_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function setUserAdjustment(adj: number): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_ADJUSTMENT_KEY, String(adj));
  } catch {}
}

// ============================================
// Cache Layer
// ============================================

function getCacheKey(countryCode: string, date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${CACHE_PREFIX}${countryCode}_${yyyy}-${mm}-${dd}`;
}

async function getCachedResult(countryCode: string, date: Date): Promise<HijriResult | null> {
  try {
    const key = getCacheKey(countryCode, date);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const duration = CACHE_DURATIONS[cached.source as keyof typeof CACHE_DURATIONS] || CACHE_DURATIONS.calculation;
    if (Date.now() - cached._cachedAt > duration) return null;
    const { _cachedAt, ...result } = cached;
    return result as HijriResult;
  } catch {
    return null;
  }
}

async function cacheResult(countryCode: string, date: Date, result: HijriResult): Promise<void> {
  try {
    const key = getCacheKey(countryCode, date);
    await AsyncStorage.setItem(key, JSON.stringify({ ...result, _cachedAt: Date.now() }));
  } catch {}
}

// ============================================
// LAYER 1 — Admin Firestore Override
// ============================================

function buildFromOverride(
  override: {
    hijriYear: number;
    hijriMonth: number;
    monthLength: 29 | 30;
    hijriStartGregorian: string;
    source?: string;
  },
  gregorianDate: Date,
  countryCode: string,
  userAdj: number,
): HijriResult {
  const startDate = new Date(override.hijriStartGregorian);
  const adjusted = new Date(gregorianDate);
  if (userAdj !== 0) {
    adjusted.setDate(adjusted.getDate() + userAdj);
  }
  const diffDays = Math.floor((adjusted.getTime() - startDate.getTime()) / 86400000);
  const hijriDay = Math.max(1, Math.min(diffDays + 1, override.monthLength));

  return {
    day: hijriDay,
    month: override.hijriMonth,
    year: override.hijriYear,
    monthLength: override.monthLength,
    monthName: HIJRI_MONTHS_EN[override.hijriMonth - 1] || '',
    monthNameAr: HIJRI_MONTHS_AR[override.hijriMonth - 1] || '',
    source: 'admin_override',
    countryCode,
    confidence: 'high',
    note: override.source,
  };
}

// ============================================
// LAYER 2 — AlAdhan API per country
// ============================================

async function fetchFromAlAdhan(
  gregorianDate: Date,
  countryCode: string,
): Promise<{ day: number; month: number; year: number } | null> {
  const adj = COUNTRY_HIJRI_ADJUSTMENT[countryCode] ?? COUNTRY_HIJRI_ADJUSTMENT.DEFAULT;
  const dd = String(gregorianDate.getDate()).padStart(2, '0');
  const mm = String(gregorianDate.getMonth() + 1).padStart(2, '0');
  const yyyy = gregorianDate.getFullYear();

  const url = `https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`
    + (adj !== 0 ? `?adjustment=${adj}` : '');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json: AlAdhanHijriResponse = await res.json();
    if (json.code !== 200) return null;
    return {
      day: parseInt(json.data.hijri.day, 10),
      month: json.data.hijri.month.number,
      year: parseInt(json.data.hijri.year, 10),
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ============================================
// LAYER 4 — Tabular Calculation (lowest priority)
// ============================================

function calculateTabular(date: Date, userAdj: number): Omit<HijriResult, 'source' | 'confidence' | 'countryCode'> {
  const adjusted = new Date(date);
  if (userAdj !== 0) {
    adjusted.setDate(adjusted.getDate() + userAdj);
  }
  const hijri = gregorianToHijri(adjusted);
  const monthLength: 29 | 30 = (getHijriMonthDays(hijri.year, hijri.month) as 29 | 30);
  return {
    day: hijri.day,
    month: hijri.month,
    year: hijri.year,
    monthLength,
    monthName: HIJRI_MONTHS_EN[hijri.month - 1] || '',
    monthNameAr: HIJRI_MONTHS_AR[hijri.month - 1] || '',
  };
}

// ============================================
// MAIN ORCHESTRATOR — checks layers in order
// ============================================

export async function getHijriDate(
  gregorianDate: Date = new Date(),
  countryCode?: string,
): Promise<HijriResult> {
  const country = countryCode || await getUserCountry();
  const userAdj = await getUserAdjustment();

  // Serve from cache immediately (no loading flash)
  const cached = await getCachedResult(country, gregorianDate);
  if (cached) {
    if (userAdj !== 0) {
      const adjusted = new Date(gregorianDate);
      adjusted.setDate(adjusted.getDate() + userAdj);
      const recalc = gregorianToHijri(adjusted);
      cached.day = recalc.day;
      cached.month = recalc.month;
      cached.year = recalc.year;
      cached.monthName = HIJRI_MONTHS_EN[recalc.month - 1] || '';
      cached.monthNameAr = HIJRI_MONTHS_AR[recalc.month - 1] || '';
    }
    return cached;
  }

  // Approximate hijri for Layer 1 lookup
  const approx = gregorianToHijri(gregorianDate);

  // ── LAYER 1 — Admin Firestore Override (highest priority) ──
  try {
    const override = await getFirestoreOverride(country, approx.year, approx.month);
    if (override && override.isVerified) {
      const result = buildFromOverride(override, gregorianDate, country, userAdj);
      await cacheResult(country, gregorianDate, result);
      return result;
    }
  } catch {}

  // ── LAYER 2 — AlAdhan API per country ──
  try {
    const apiResult = await fetchFromAlAdhan(gregorianDate, country);
    if (apiResult) {
      let monthLength: 29 | 30 = (getHijriMonthDays(apiResult.year, apiResult.month) as 29 | 30);
      let source: HijriResult['source'] = 'aladhan_api';
      let confidence: HijriResult['confidence'] = 'medium';
      let note: string | undefined;

      // ── LAYER 3 — Google News RSS cross-check (days 28-30 only) ──
      if (apiResult.day >= 28) {
        try {
          const newsResult = await fetchMoonSightingNews(country, apiResult.month, apiResult.day);
          if (newsResult) {
            monthLength = newsResult.monthLength;
            source = 'news_detection';
            confidence = 'high';
            note = newsResult.source;
          }
        } catch {}
      }

      // Apply user adjustment on top
      let finalDay = apiResult.day;
      let finalMonth = apiResult.month;
      let finalYear = apiResult.year;
      if (userAdj !== 0) {
        const adj = gregorianToHijri(new Date(gregorianDate.getTime() + userAdj * 86400000));
        finalDay = adj.day;
        finalMonth = adj.month;
        finalYear = adj.year;
      }

      const result: HijriResult = {
        day: finalDay,
        month: finalMonth,
        year: finalYear,
        monthLength,
        monthName: HIJRI_MONTHS_EN[finalMonth - 1] || '',
        monthNameAr: HIJRI_MONTHS_AR[finalMonth - 1] || '',
        source,
        countryCode: country,
        confidence,
        note,
      };
      await cacheResult(country, gregorianDate, result);
      return result;
    }
  } catch {}

  // ── LAYER 4 — Tabular Calculation (lowest priority / offline fallback) ──
  const calc = calculateTabular(gregorianDate, userAdj);
  const result: HijriResult = {
    ...calc,
    source: 'calculation',
    countryCode: country,
    confidence: 'low',
    note: 'Based on calculation — may differ from official announcement',
  };
  await cacheResult(country, gregorianDate, result);
  return result;
}

// ============================================
// Background refresh (call from app init)
// ============================================

export async function refreshHijriInBackground(): Promise<void> {
  try {
    const country = await getUserCountry();
    const today = new Date();
    const approx = gregorianToHijri(today);

    // Try Layer 1
    try {
      const override = await getFirestoreOverride(country, approx.year, approx.month);
      if (override && override.isVerified) {
        const result = buildFromOverride(override, today, country, 0);
        await cacheResult(country, today, result);
        return;
      }
    } catch {}

    // Try Layer 2
    try {
      const apiResult = await fetchFromAlAdhan(today, country);
      if (apiResult) {
        const monthLength: 29 | 30 = (getHijriMonthDays(apiResult.year, apiResult.month) as 29 | 30);
        const result: HijriResult = {
          day: apiResult.day,
          month: apiResult.month,
          year: apiResult.year,
          monthLength,
          monthName: HIJRI_MONTHS_EN[apiResult.month - 1] || '',
          monthNameAr: HIJRI_MONTHS_AR[apiResult.month - 1] || '',
          source: 'aladhan_api',
          countryCode: country,
          confidence: 'medium',
        };
        await cacheResult(country, today, result);
      }
    } catch {}
  } catch {}
}
