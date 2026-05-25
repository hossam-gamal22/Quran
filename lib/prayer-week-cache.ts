// lib/prayer-week-cache.ts
// كاش أسبوعي لمواقيت الصلاة مع تقدير ذكي للأيام اللاحقة

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrayerTimes, parsePrayerTimes, applyAdjustments, PrayerSettings, getCachedPrayerTimes, cachePrayerTimes, getTodayDateString } from '@/lib/prayer-times';
import { calculateLocalPrayerTimes, getCountryFallbackPrayerTimes } from '@/lib/country-prayer-defaults';
import { getStoredLocation } from '@/lib/prayer-times';
import { getEffectivePrayerCalcSettings } from '@/lib/prayer-settings-source';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface DayPrayerEntry {
  date: string; // YYYY-MM-DD
  times: PrayerTimes;
}

export interface WeekCacheData {
  entries: DayPrayerEntry[];
  createdAt: string; // ISO date string
  location: { latitude: number; longitude: number };
}

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

const WEEK_CACHE_KEY_PREFIX = '@prayer_week_cache';
// Legacy key (pre-method-aware). Read for backward compat, never written.
const LEGACY_WEEK_CACHE_KEY = '@prayer_week_cache';
const MAX_EXTRAPOLATION_DAYS = 30;

/** Method/school-scoped cache key. Prevents reusing a cache built with a
 *  different calculation method (the root cause of the Dubai 6:46/6:49 bug). */
function getWeekCacheKey(method: number, school: number): string {
  return `${WEEK_CACHE_KEY_PREFIX}_M${method}_S${school}`;
}

async function resolveActiveWeekCacheKey(): Promise<string> {
  const eff = await getEffectivePrayerCalcSettings();
  return getWeekCacheKey(eff.calculationMethod, eff.asrJuristic);
}

/** Remove every week-cache key (all methods/schools + legacy). Called when the
 *  user changes calculation method, school, or location to prevent stale data. */
export async function clearAllWeekCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => k.startsWith(WEEK_CACHE_KEY_PREFIX));
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
      console.log(`🧹 [prayer-week-cache] Cleared ${toRemove.length} week cache keys`);
    }
  } catch (e) {
    console.warn('[prayer-week-cache] clearAllWeekCaches failed:', e);
  }
}
const PRAYER_KEYS: (keyof PrayerTimes)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight', 'lastThird'];

// ────────────────────────────────────────────
// Date Helpers
// ────────────────────────────────────────────

function formatDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ────────────────────────────────────────────
// Time <-> Minutes Conversion
// ────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  // Clamp to valid 24h range
  let m = Math.round(minutes) % (24 * 60);
  if (m < 0) m += 24 * 60;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// ────────────────────────────────────────────
// Cache Operations
// ────────────────────────────────────────────

export async function cacheWeekPrayerTimes(
  entries: DayPrayerEntry[],
  location: { latitude: number; longitude: number },
): Promise<void> {
  try {
    const eff = await getEffectivePrayerCalcSettings();
    const data: WeekCacheData = {
      entries: entries.slice(0, 7), // Max 7 days
      createdAt: new Date().toISOString(),
      location,
    };
    const key = await resolveActiveWeekCacheKey();
    await AsyncStorage.setItem(key, JSON.stringify(data));

    // Also populate per-day caches for instant lookup
    for (const entry of data.entries) {
      await cachePrayerTimes(entry.date, entry.times, eff.calculationMethod, eff.asrJuristic);
    }
    console.log(`📅 Week cache saved (${key}): ${data.entries.length} days starting ${data.entries[0]?.date}`);
  } catch (e) {
    console.warn('[prayer-week-cache] Failed to cache:', e);
  }
}

export async function getWeekCache(): Promise<WeekCacheData | null> {
  try {
    const key = await resolveActiveWeekCacheKey();
    let raw = await AsyncStorage.getItem(key);
    // Backward-compat: if no scoped cache exists, try the legacy unscoped key once.
    // We do NOT migrate it (would require knowing what method built it), but we
    // also don't return it as it may be from a different method.
    if (!raw) {
      const legacyRaw = await AsyncStorage.getItem(LEGACY_WEEK_CACHE_KEY);
      if (legacyRaw) {
        // Drop the legacy key — it's untrusted because we can't verify its method.
        await AsyncStorage.removeItem(LEGACY_WEEK_CACHE_KEY).catch(() => {});
        console.log('🧹 [prayer-week-cache] Removed untyped legacy week cache (method unknown)');
      }
      return null;
    }
    const data: WeekCacheData = JSON.parse(raw);
    if (!data.entries || !Array.isArray(data.entries) || data.entries.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getWeekCacheAgeDays(): Promise<number> {
  const cache = await getWeekCache();
  if (!cache) return -1;
  const lastEntry = cache.entries[cache.entries.length - 1];
  const today = getTodayDateString();
  return daysBetween(lastEntry.date, today);
}

// ────────────────────────────────────────────
// Find Cached Day in Week Cache
// ────────────────────────────────────────────

export function findDayInWeekCache(cache: WeekCacheData, targetDate: string): PrayerTimes | null {
  const entry = cache.entries.find(e => e.date === targetDate);
  return entry?.times || null;
}

// ────────────────────────────────────────────
// Extrapolation Engine
// ────────────────────────────────────────────

/**
 * Calculate linear regression slope for a prayer time across cached days.
 * Returns minutes-per-day change rate.
 */
function calculateSlope(entries: DayPrayerEntry[], prayerKey: keyof PrayerTimes): number {
  if (entries.length < 2) return 0;

  const n = entries.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  // Handle midnight wrap-around: if values jump from ~1400 to ~20,
  // add 1440 to low values to keep continuity
  const values = entries.map(e => timeToMinutes(e.times[prayerKey]));
  const midnightPrayers = ['midnight', 'lastThird'];
  const isMidnightPrayer = midnightPrayers.includes(prayerKey);

  let adjusted = [...values];
  if (isMidnightPrayer) {
    // Normalize: all values should be near each other
    const first = values[0];
    adjusted = values.map(v => {
      if (Math.abs(v - first) > 720) return v < first ? v + 1440 : v - 1440;
      return v;
    });
  }

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += adjusted[i];
    sumXY += i * adjusted[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Extrapolate prayer times for a target date beyond the cached window.
 * Uses linear regression from the 7-day cache to estimate daily shift.
 */
export function extrapolatePrayerTimes(
  cache: WeekCacheData,
  targetDate: string,
): PrayerTimes | null {
  const entries = cache.entries;
  if (entries.length < 2) return null;

  const lastEntry = entries[entries.length - 1];
  const daysOffset = daysBetween(lastEntry.date, targetDate);

  // Safety: don't extrapolate beyond MAX_EXTRAPOLATION_DAYS
  if (daysOffset < 0 || daysOffset > MAX_EXTRAPOLATION_DAYS) return null;

  const result: Partial<PrayerTimes> = {};

  for (const key of PRAYER_KEYS) {
    const slope = calculateSlope(entries, key);
    const lastMinutes = timeToMinutes(lastEntry.times[key]);
    const extrapolatedMinutes = lastMinutes + slope * daysOffset;
    result[key] = minutesToTime(extrapolatedMinutes);
  }

  return result as PrayerTimes;
}

/**
 * Check if extrapolation is within reliable range.
 * Returns true if the target date is within MAX_EXTRAPOLATION_DAYS of the last cached day.
 */
export function isExtrapolationReliable(cache: WeekCacheData, targetDate: string): boolean {
  const lastEntry = cache.entries[cache.entries.length - 1];
  const daysOffset = daysBetween(lastEntry.date, targetDate);
  return daysOffset >= 0 && daysOffset <= MAX_EXTRAPOLATION_DAYS;
}

// ────────────────────────────────────────────
// Offline Fallback Chain
// ────────────────────────────────────────────

export type PrayerDataSource = 'live' | 'todayCache' | 'weekCache' | 'extrapolated' | 'localCalc' | 'countryFallback' | 'error';

export interface OfflinePrayerResult {
  times: PrayerTimes | null;
  source: PrayerDataSource;
  cacheAgeDays: number; // Days since last fresh data
}

/**
 * Try to load prayer times from any available offline source.
 * Priority: today's cache → week cache → extrapolation → local calc (stored coords) → Makkah fallback → null
 */
export async function getOfflinePrayerTimes(targetDate?: string): Promise<OfflinePrayerResult> {
  const today = targetDate || getTodayDateString();
  const eff = await getEffectivePrayerCalcSettings();

  // 1. Try today's per-day cache
  const todayCache = await getCachedPrayerTimes(today, eff.calculationMethod, eff.asrJuristic);
  if (todayCache) {
    return { times: todayCache, source: 'todayCache', cacheAgeDays: 0 };
  }

  // 2. Try week cache for today's exact date
  const weekCache = await getWeekCache();
  if (weekCache) {
    const weekDay = findDayInWeekCache(weekCache, today);
    if (weekDay) {
      return { times: weekDay, source: 'weekCache', cacheAgeDays: 0 };
    }

    // 3. Try extrapolation
    if (isExtrapolationReliable(weekCache, today)) {
      const extrapolated = extrapolatePrayerTimes(weekCache, today);
      if (extrapolated) {
        const lastEntry = weekCache.entries[weekCache.entries.length - 1];
        const ageDays = daysBetween(lastEntry.date, today);
        return { times: extrapolated, source: 'extrapolated', cacheAgeDays: ageDays };
      }
    }
  }

  // 4. Try previous days (up to 2 days back) from per-day cache
  for (let i = 1; i <= 2; i++) {
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - i);
    const prevDateStr = formatDateString(prevDate);
    const prevCache = await getCachedPrayerTimes(prevDateStr, eff.calculationMethod, eff.asrJuristic);
    if (prevCache) {
      return { times: prevCache, source: 'extrapolated', cacheAgeDays: i };
    }
  }

  // 5. Local calculation using stored coordinates (adhan package — no network)
  try {
    const storedLoc = await getStoredLocation();
    if (storedLoc?.latitude && storedLoc?.longitude) {
      const targetDateObj = new Date(today + 'T12:00:00');
      const rawTimes = calculateLocalPrayerTimes(
        storedLoc.latitude,
        storedLoc.longitude,
        targetDateObj,
        eff.calculationMethod,
        eff.asrJuristic,
      );
      const times = applyAdjustments(rawTimes, eff.adjustments as any);
      console.log(`📍 Offline: used local calculation from stored coordinates method=${eff.calculationMethod} school=${eff.asrJuristic}`);
      return { times, source: 'localCalc', cacheAgeDays: 0 };
    }
  } catch (e) {
    console.warn('Local calculation from stored coords failed:', e);
  }

  // 6. App-wide fallback — Makkah calculation
  try {
    const result = getCountryFallbackPrayerTimes(new Date(today + 'T12:00:00'));
    const times = applyAdjustments(result.times, eff.adjustments as any);
    console.log(`🌍 Offline: used country fallback (${result.countryCode} → ${result.cityNameEn})`);
    return { times, source: 'countryFallback', cacheAgeDays: 0 };
  } catch (e) {
    console.warn('Country fallback failed:', e);
  }

  return { times: null, source: 'error', cacheAgeDays: -1 };
}

// ────────────────────────────────────────────
// Build Week Cache from Monthly API Response
// ────────────────────────────────────────────

/**
 * Process monthly API response into a 7-day week cache.
 * Called after successful API fetch to ensure offline coverage.
 */
export function buildWeekEntries(
  monthlyData: Array<{ timings: Record<string, string>; date: { gregorian: { date: string; day: string; month: { number: number }; year: string } } }>,
  settings: PrayerSettings | { adjustments?: Record<string, number> },
  todayIndex?: number,
): DayPrayerEntry[] {
  const today = new Date();
  const todayDay = today.getDate();

  // Find today's index in the monthly data
  const startIdx = todayIndex ?? monthlyData.findIndex(d => {
    const dayNum = parseInt(d.date?.gregorian?.day || '0', 10);
    return dayNum === todayDay;
  });

  if (startIdx === -1) return [];

  const entries: DayPrayerEntry[] = [];
  for (let i = 0; i < 7 && startIdx + i < monthlyData.length; i++) {
    const dayData = monthlyData[startIdx + i];
    if (!dayData?.timings) continue;

    const cleanTime = (time: string): string => time.replace(/\s*\([^)]*\)/g, '').trim();

    const times: PrayerTimes = {
      fajr: cleanTime(dayData.timings.Fajr || ''),
      sunrise: cleanTime(dayData.timings.Sunrise || ''),
      dhuhr: cleanTime(dayData.timings.Dhuhr || ''),
      asr: cleanTime(dayData.timings.Asr || ''),
      maghrib: cleanTime(dayData.timings.Maghrib || ''),
      isha: cleanTime(dayData.timings.Isha || ''),
      midnight: cleanTime(dayData.timings.Midnight || ''),
      lastThird: cleanTime(dayData.timings.Lastthird || ''),
    };

    // Apply user adjustments if present
    if (settings.adjustments) {
      const adj = settings.adjustments;
      for (const key of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
        if (adj[key] && adj[key] !== 0) {
          const mins = timeToMinutes(times[key]) + adj[key];
          times[key] = minutesToTime(mins);
        }
      }
    }

    // Build date string from the API response
    const greg = dayData.date?.gregorian;
    const dateStr = greg
      ? `${greg.year}-${String(greg.month?.number || (today.getMonth() + 1)).padStart(2, '0')}-${String(greg.day).padStart(2, '0')}`
      : formatDateString(new Date(today.getTime() + i * 86400000));

    entries.push({ date: dateStr, times });
  }

  return entries;
}

// ────────────────────────────────────────────
// Offline Range for Notifications/Widgets
// ────────────────────────────────────────────

/**
 * Get prayer times for a range of days using the best offline source available.
 * Used by notification scheduling and widget data when the API is unreachable.
 * Returns an array of { date, times } entries — one per day.
 */
export async function getOfflinePrayerTimesRange(
  startDate: Date,
  days: number,
): Promise<Array<{ date: string; times: PrayerTimes; source: PrayerDataSource }>> {
  const results: Array<{ date: string; times: PrayerTimes; source: PrayerDataSource }> = [];
  const weekCache = await getWeekCache();
  const storedLoc = await getStoredLocation();
  const eff = await getEffectivePrayerCalcSettings();

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = formatDateString(d);

    // 1. Per-day cache
    const cached = await getCachedPrayerTimes(dateStr, eff.calculationMethod, eff.asrJuristic);
    if (cached) {
      results.push({ date: dateStr, times: cached, source: 'todayCache' });
      continue;
    }

    // 2. Week cache exact match
    if (weekCache) {
      const weekDay = findDayInWeekCache(weekCache, dateStr);
      if (weekDay) {
        results.push({ date: dateStr, times: weekDay, source: 'weekCache' });
        continue;
      }

      // 3. Extrapolation
      if (isExtrapolationReliable(weekCache, dateStr)) {
        const extrapolated = extrapolatePrayerTimes(weekCache, dateStr);
        if (extrapolated) {
          results.push({ date: dateStr, times: extrapolated, source: 'extrapolated' });
          continue;
        }
      }
    }

    // 4. Local calculation with stored coordinates
    if (storedLoc?.latitude && storedLoc?.longitude) {
      try {
        const rawTimes = calculateLocalPrayerTimes(
          storedLoc.latitude,
          storedLoc.longitude,
          d,
          eff.calculationMethod,
          eff.asrJuristic,
        );
        const times = applyAdjustments(rawTimes, eff.adjustments as any);
        results.push({ date: dateStr, times, source: 'localCalc' });
        continue;
      } catch {}
    }

    // 5. Country fallback
    try {
      const fb = getCountryFallbackPrayerTimes(d);
      const times = applyAdjustments(fb.times, eff.adjustments as any);
      results.push({ date: dateStr, times, source: 'countryFallback' });
    } catch {
      // Skip this day if everything fails
    }
  }

  return results;
}
