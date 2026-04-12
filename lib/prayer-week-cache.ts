// lib/prayer-week-cache.ts
// كاش أسبوعي لمواقيت الصلاة مع تقدير ذكي للأيام اللاحقة

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrayerTimes, parsePrayerTimes, applyAdjustments, PrayerSettings, getCachedPrayerTimes, cachePrayerTimes, getTodayDateString } from '@/lib/prayer-times';

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

const WEEK_CACHE_KEY = '@prayer_week_cache';
const MAX_EXTRAPOLATION_DAYS = 30;
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
    const data: WeekCacheData = {
      entries: entries.slice(0, 7), // Max 7 days
      createdAt: new Date().toISOString(),
      location,
    };
    await AsyncStorage.setItem(WEEK_CACHE_KEY, JSON.stringify(data));

    // Also populate per-day caches for instant lookup
    for (const entry of data.entries) {
      await cachePrayerTimes(entry.date, entry.times);
    }
    console.log(`📅 Week cache saved: ${data.entries.length} days starting ${data.entries[0]?.date}`);
  } catch (e) {
    console.warn('[prayer-week-cache] Failed to cache:', e);
  }
}

export async function getWeekCache(): Promise<WeekCacheData | null> {
  try {
    const raw = await AsyncStorage.getItem(WEEK_CACHE_KEY);
    if (!raw) return null;
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

export type PrayerDataSource = 'live' | 'todayCache' | 'weekCache' | 'extrapolated' | 'error';

export interface OfflinePrayerResult {
  times: PrayerTimes | null;
  source: PrayerDataSource;
  cacheAgeDays: number; // Days since last fresh data
}

/**
 * Try to load prayer times from any available offline source.
 * Priority: today's cache → week cache → extrapolation → null
 */
export async function getOfflinePrayerTimes(targetDate?: string): Promise<OfflinePrayerResult> {
  const today = targetDate || getTodayDateString();

  // 1. Try today's per-day cache
  const todayCache = await getCachedPrayerTimes(today);
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
    const prevCache = await getCachedPrayerTimes(prevDateStr);
    if (prevCache) {
      return { times: prevCache, source: 'extrapolated', cacheAgeDays: i };
    }
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
