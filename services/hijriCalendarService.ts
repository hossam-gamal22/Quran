// services/hijriCalendarService.ts
// نظام التقويم الهجري — 4 طبقات بالترتيب:
// 1. Admin Override (أعلى أولوية)
// 2. AlAdhan API per country
// 3. Google News RSS (أيام 28-30 فقط)
// 4. Tabular Calculation (أدنى أولوية)

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { gregorianToHijri, getHijriMonthDays, HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, setCachedHijriOffset, setHijriSystemOffset, getHijriSystemOffset, hydrateHijriOffset } from '@/lib/hijri-date';
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
  return '';
}

export async function getUserCountry(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(USER_COUNTRY_KEY);
    if (saved) return saved;
  } catch {}
  return detectUserCountry();
}

export async function getSavedUserCountry(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(USER_COUNTRY_KEY)) || '';
  } catch {
    return '';
  }
}

export async function setUserCountry(countryCode: string): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_COUNTRY_KEY, countryCode);
  } catch {}
  // Country switched → admin override now lives under a different doc id.
  // Re-subscribe so onSnapshot watches the new country's overrides, and
  // immediately republish widget data so the home screen reflects the
  // resolved Hijri for the new region (which may differ from the previous
  // country's admin decision).
  try {
    const { updateSharedData } = await import('@/lib/widget-data');
    await subscribeToHijriOverridesForUser(() => {
      updateSharedData().catch(() => {});
    });
    // The new country may roll over on a different day → recompute the
    // synchronous-display correction for the new region right away.
    await syncHijriSystemOffset(countryCode).catch(() => {});
    updateSharedData().catch(() => {});
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
  setCachedHijriOffset(adj);
  try {
    await AsyncStorage.setItem(USER_ADJUSTMENT_KEY, String(adj));
  } catch {}
  // Keep `@hijri_date_offset` (legacy key consumed by `app/hijri.tsx` + the
  // older widget fallback path) in lock-step so the user only has to set
  // the value once and it propagates everywhere.
  try {
    await AsyncStorage.setItem('@hijri_date_offset', String(adj));
  } catch {}
  await invalidateHijriCache();
  // Push to widget immediately.
  try {
    const { updateSharedData } = await import('@/lib/widget-data');
    updateSharedData().catch(() => {});
  } catch {}
}

// ============================================
// Cache Layer
// ============================================

function getCacheKey(countryCode: string, date: Date, userAdj: number = 0): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  // Include the system offset in the key. The Layer-4 tabular fallback shifts
  // by (userAdj + systemOffset); a result cached while the offset was still 0
  // (cold/offline first paint, before syncHijriSystemOffset resolves) must NOT
  // be served once the authoritative offset is learned — otherwise the date
  // sticks a day behind Umm al-Qura until the 24h TTL expires.
  const sys = getHijriSystemOffset();
  return `${CACHE_PREFIX}${countryCode}_${yyyy}-${mm}-${dd}_adj_${userAdj}_sys_${sys}`;
}

export async function invalidateHijriCache(countryCode?: string, date?: Date): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const datePart = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : '';
    const prefix = countryCode ? `${CACHE_PREFIX}${countryCode}_` : CACHE_PREFIX;
    const stale = keys.filter((key) => key.startsWith(prefix) && (!datePart || key.includes(datePart)));
    if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  } catch {}
}

async function getCachedResult(countryCode: string, date: Date, userAdj: number): Promise<HijriResult | null> {
  try {
    const key = getCacheKey(countryCode, date, userAdj);
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

async function cacheResult(countryCode: string, date: Date, result: HijriResult, userAdj: number): Promise<void> {
  try {
    const key = getCacheKey(countryCode, date, userAdj);
    await AsyncStorage.setItem(key, JSON.stringify({ ...result, _cachedAt: Date.now() }));
  } catch {}
}

// ============================================
// Per-country source mode (admin override vs API)
// ============================================
//
// Stored by the admin panel in `hijri_overrides_config/sourceModes`:
//   { countries: { SA: 'api', EG: 'admin', ... } }
// Absent / 'admin' = current behaviour (a verified override wins, else API).
// 'api' = ignore the admin override entirely and follow AlAdhan (and, offline,
// the tabular calc + the system offset that was itself derived from the API).
// A live onSnapshot in subscribeToHijriOverridesForUser keeps this fresh.

const SOURCE_MODE_COLLECTION = 'hijri_overrides_config';
const SOURCE_MODE_DOC = 'sourceModes';
const SOURCE_MODE_CACHE_KEY = '@hijri_source_modes';

type CountrySourceMode = 'admin' | 'api';
let _sourceModesCache: Record<string, CountrySourceMode> | null = null;

function setSourceModesCache(modes: Record<string, CountrySourceMode>): void {
  _sourceModesCache = modes;
  AsyncStorage.setItem(SOURCE_MODE_CACHE_KEY, JSON.stringify(modes)).catch(() => {});
}

function normalizeSourceModes(raw: any): Record<string, CountrySourceMode> {
  const src = (raw && typeof raw === 'object' && raw.countries && typeof raw.countries === 'object')
    ? raw.countries
    : (raw && typeof raw === 'object' ? raw : {});
  const out: Record<string, CountrySourceMode> = {};
  for (const key of Object.keys(src)) {
    if (src[key] === 'api') out[key.toUpperCase()] = 'api';
  }
  return out;
}

async function loadSourceModes(): Promise<Record<string, CountrySourceMode>> {
  if (_sourceModesCache) return _sourceModesCache;
  // Firestore first (authoritative), AsyncStorage as the offline fallback.
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase-config');
    const snap = await getDoc(doc(db, SOURCE_MODE_COLLECTION, SOURCE_MODE_DOC));
    if (snap.exists()) {
      const modes = normalizeSourceModes(snap.data());
      setSourceModesCache(modes);
      return modes;
    }
  } catch {}
  try {
    const rawCache = await AsyncStorage.getItem(SOURCE_MODE_CACHE_KEY);
    if (rawCache) {
      _sourceModesCache = JSON.parse(rawCache);
      return _sourceModesCache!;
    }
  } catch {}
  return {};
}

export async function getCountrySourceMode(countryCode?: string): Promise<CountrySourceMode> {
  const country = (countryCode || '').toUpperCase();
  if (!country) return 'admin';
  try {
    const modes = await loadSourceModes();
    return modes[country] === 'api' ? 'api' : 'admin';
  } catch {
    return 'admin';
  }
}

/** @internal — reset the in-memory source-mode cache (test seam only). */
export function __resetHijriSourceModeCache(): void {
  _sourceModesCache = null;
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

type HijriMonthKey = { year: number; month: number };

function getAdjacentHijriMonthKeys(year: number, month: number): HijriMonthKey[] {
  const previous = month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };
  const current = { year, month };
  const next = month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 };
  return [previous, current, next];
}

function isDateInsideOverride(
  override: { hijriStartGregorian: string; monthLength: 29 | 30 },
  gregorianDate: Date,
  userAdj: number,
): boolean {
  const startDate = new Date(override.hijriStartGregorian);
  if (Number.isNaN(startDate.getTime())) return false;

  const adjusted = new Date(gregorianDate);
  if (userAdj !== 0) {
    adjusted.setDate(adjusted.getDate() + userAdj);
  }
  const diffDays = Math.floor((adjusted.getTime() - startDate.getTime()) / 86400000);
  return diffDays >= 0 && diffDays < override.monthLength;
}

async function getActiveFirestoreOverride(
  countryCode: string,
  approxYear: number,
  approxMonth: number,
  gregorianDate: Date,
  userAdj: number,
) {
  // Per-country source mode: when the admin set this country to follow the API,
  // skip the override entirely so getHijriDate / resolveAuthoritativeToday /
  // refreshHijriInBackground all fall through to AlAdhan.
  if ((await getCountrySourceMode(countryCode)) === 'api') return null;
  for (const candidate of getAdjacentHijriMonthKeys(approxYear, approxMonth)) {
    const override = await getFirestoreOverride(countryCode, candidate.year, candidate.month);
    if (override && override.isVerified && isDateInsideOverride(override, gregorianDate, userAdj)) {
      return override;
    }
  }
  return null;
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
  // Offline last-resort: the network layers (AlAdhan) are unreachable here, so
  // mirror the AUTHORITATIVE date by applying the last-synced system offset on
  // top of the user's manual ±N. This keeps the widget + app date correct (and
  // advancing day-by-day) while offline, until the device is back online and a
  // fresh sync runs. Without it, an offline device silently reverts to the raw
  // tabular calc — a day behind Umm al-Qura and ignoring the admin override.
  const totalOffset = userAdj + getHijriSystemOffset();
  if (totalOffset !== 0) {
    adjusted.setDate(adjusted.getDate() + totalOffset);
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
  // Ensure the persisted system offset is in memory before any tabular
  // fallback runs. Cold/headless widget contexts start with an empty module
  // cache; hydrate is idempotent so this is a no-op in the warm app process.
  try { await hydrateHijriOffset(); } catch {}

  // Serve from cache immediately (no loading flash)
  const cached = await getCachedResult(country, gregorianDate, userAdj);
  if (cached) {
    return cached;
  }

  // Approximate hijri for Layer 1 lookup
  const approx = gregorianToHijri(gregorianDate);

  // ── LAYER 1 — Admin Firestore Override (highest priority) ──
  try {
    const override = await getActiveFirestoreOverride(country, approx.year, approx.month, gregorianDate, userAdj);
    if (override) {
      const result = buildFromOverride(override, gregorianDate, country, userAdj);
      await cacheResult(country, gregorianDate, result, userAdj);
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
      await cacheResult(country, gregorianDate, result, userAdj);
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
  await cacheResult(country, gregorianDate, result, userAdj);
  return result;
}

// ============================================
// System auto-correction offset
// ============================================
//
// Bridges the authoritative (async, network) calendar into the synchronous
// tabular call-sites the home/prayer/calendar screens use. Resolves "today"
// via the override + AlAdhan layers WITHOUT the user's manual ±N (that stays
// an independent layer), then stores the integer day-delta so every tabular
// conversion lands on the official rollover. Returns null when offline so we
// never overwrite a previously-correct offset with a guess.

async function resolveAuthoritativeToday(
  date: Date,
  country: string,
): Promise<{ year: number; month: number; day: number } | null> {
  const approx = gregorianToHijri(date);

  // LAYER 1 — admin override (no user adjustment)
  try {
    const override = await getActiveFirestoreOverride(country, approx.year, approx.month, date, 0);
    if (override) {
      const r = buildFromOverride(override, date, country, 0);
      return { year: r.year, month: r.month, day: r.day };
    }
  } catch {}

  // LAYER 2 — AlAdhan per country
  try {
    const api = await fetchFromAlAdhan(date, country);
    if (api) return { year: api.year, month: api.month, day: api.day };
  } catch {}

  return null; // offline / unavailable → caller leaves the stored offset intact
}

/**
 * Recompute and persist the tabular→authoritative correction for today.
 * Safe to call repeatedly (no-op when unchanged). Wired into app init, the
 * admin-override snapshot callback, country switch, push sync, and background
 * refresh.
 */
export async function syncHijriSystemOffset(countryCode?: string): Promise<number | null> {
  try {
    // Empty country is fine: AlAdhan gToH (Layer 2) doesn't need one, and the
    // admin override (Layer 1) just won't match. This keeps the correction
    // working on simulators / devices where region detection returns nothing.
    const country = countryCode || (await getUserCountry()) || '';
    const today = new Date();
    const authoritative = await resolveAuthoritativeToday(today, country);
    if (!authoritative) return null;

    // Find the integer day-shift N where the raw tabular calc for (today + N)
    // equals the authoritative {year,month,day}. Robust across month-length
    // and year boundaries; ±4 covers every real moon-sighting divergence.
    for (let n = -4; n <= 4; n++) {
      const probe = new Date(today);
      probe.setDate(probe.getDate() + n);
      const tab = gregorianToHijri(probe);
      if (tab.year === authoritative.year && tab.month === authoritative.month && tab.day === authoritative.day) {
        if (__DEV__) console.log('[hijri-fix] systemOffset =', n, '→ authoritative', authoritative.day, authoritative.month, authoritative.year);
        const changed = n !== getHijriSystemOffset();
        setHijriSystemOffset(n);
        // When the correction actually changes, drop today's resolved-date
        // cache so getHijriDate recomputes immediately instead of serving an
        // entry computed under the previous offset (belt-and-suspenders with
        // the offset-aware cache key).
        if (changed) {
          await invalidateHijriCache(country, today).catch(() => {});
        }
        return n;
      }
    }
    // No match within range → keep the last known offset (don't reset to 0).
    return null;
  } catch {
    return null;
  }
}

// ============================================
// Background refresh (call from app init)
// ============================================

export async function refreshHijriInBackground(): Promise<void> {
  try {
    const country = await getUserCountry();
    const today = new Date();
    const approx = gregorianToHijri(today);

    // Recompute the tabular→authoritative correction so the home/prayer/
    // calendar screens (which read the synchronous tabular calc) roll over to
    // the official date too. Runs before the early-return below.
    await syncHijriSystemOffset(country).catch(() => {});

    // Try Layer 1
    try {
      const override = await getActiveFirestoreOverride(country, approx.year, approx.month, today, 0);
      if (override) {
        const result = buildFromOverride(override, today, country, 0);
        await cacheResult(country, today, result, 0);
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
        await cacheResult(country, today, result, 0);
      }
    } catch {}
  } catch {}
}

// ============================================
// Firestore admin-override subscription
// ============================================
//
// Live-listens for changes to `hijri_overrides/{userCountry}_{year}_{month}`
// so the moment an admin publishes a new moon-sighting decision, the app
// invalidates its cache, recomputes the resolved Hijri date, and pushes
// the new effective offset out to the home-screen widget — no app reopen,
// no manual refresh, no waiting for cache to expire.
//
// Returns an unsubscribe function. Designed to be called once at app init.
let _hijriOverrideUnsub: (() => void) | null = null;

export async function subscribeToHijriOverridesForUser(
  onChange?: () => void,
): Promise<() => void> {
  // Tear down any previous subscription (in case of country switch).
  if (_hijriOverrideUnsub) {
    try { _hijriOverrideUnsub(); } catch {}
    _hijriOverrideUnsub = null;
  }
  try {
    const country = await getUserCountry();
    if (!country) return () => {};
    const today = new Date();
    const approx = gregorianToHijri(today);
    const { doc, onSnapshot } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase-config');

    const notifyChange = async () => {
      // Bust the day's cache so the next getHijriDate() call refetches
      // with the new override, instead of serving the now-stale cached
      // result for up to an hour.
      try {
        await invalidateHijriCache(country, today);
      } catch {}
      // Recompute the synchronous-display correction so the home/prayer/
      // calendar screens reflect the admin's decision immediately (the home
      // date line + calendar grid re-render via subscribeToHijriOffsetChanges).
      try {
        await syncHijriSystemOffset(country);
      } catch {}
      // Notify caller (typically: trigger widget data refresh).
      if (onChange) {
        try { onChange(); } catch {}
      }
    };

    const unsubscribers = getAdjacentHijriMonthKeys(approx.year, approx.month).map(({ year, month }) => {
      const ref = doc(db, 'hijri_overrides', `${country}_${year}_${month}`);
      return onSnapshot(
        ref,
        notifyChange,
        (err) => {
          if (__DEV__) console.warn('[hijri] override snapshot error:', err);
        },
      );
    });

    // Also live-watch the per-country source-mode doc, so flipping a country
    // between «API» and «admin» in the panel takes effect on devices without
    // an app reopen (refresh the in-memory mode cache, then run the same
    // invalidate → resync → widget-refresh chain).
    unsubscribers.push(
      onSnapshot(
        doc(db, SOURCE_MODE_COLLECTION, SOURCE_MODE_DOC),
        (snap) => {
          setSourceModesCache(snap.exists() ? normalizeSourceModes(snap.data()) : {});
          notifyChange();
        },
        (err) => {
          if (__DEV__) console.warn('[hijri] source-mode snapshot error:', err);
        },
      ),
    );

    const unsub = () => {
      unsubscribers.forEach(unsubscribe => {
        try { unsubscribe(); } catch {}
      });
    };
    _hijriOverrideUnsub = unsub;
    return unsub;
  } catch (e) {
    if (__DEV__) console.warn('[hijri] subscribe failed:', e);
    return () => {};
  }
}
