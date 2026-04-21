/**
 * Single Source of Truth (SSOT) for user/device metrics across the admin panel.
 *
 * Unified rule — a user is counted only if ALL of:
 *   1. `!data.placeholder`
 *   2. `installSource` ∈ { 'play_store', 'app_store' }
 *   3. `fcmToken` starts with 'ExponentPushToken'
 *
 * Results are always deduplicated via `deduplicateByDevice()`.
 * A 30-second in-memory TTL cache prevents redundant Firestore reads
 * when navigating between admin pages.
 */

import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { deduplicateByDevice, type DeviceUser } from './device-dedup';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ActiveDevice extends DeviceUser {
  fcmToken: string;
  platform: string;
  language: string;
  country: string;
  countrySource: string;
  prayerCity?: string;
  prayerLatitude?: number;
  prayerLongitude?: number;
  lastActive: unknown;
  installSource: string;
  displayName?: string;
  name?: string;
  email?: string;
  phone?: string;
  plan?: string;
  status?: string;
  registrationDate?: unknown;
  [key: string]: unknown;
}

export interface ActiveDeviceStats {
  total: number;
  withTokens: number; // always === total (kept for backward compat)
  ios: number;
  android: number;
  active: number;       // last 7 days
  daily: number;        // last 24 hours
  byLanguage: Record<string, number>;
  byCountry: Record<string, number>;
  retentionRate: number; // (active / total) * 100
  // Monthly engagement (from user docs — zero extra reads)
  monthlyAzkar: number;
  monthlyQuran: number;
  monthlyPrayers: number;
}

export interface ActiveDevicesResult {
  users: ActiveDevice[];
  stats: ActiveDeviceStats;
  groupMap: Map<string, string[]>;
}

// ── Constants ──────────────────────────────────────────────────────────────

const STORE_SOURCES = new Set(['play_store', 'app_store']);
const CACHE_TTL_MS = 30_000; // 30 seconds

// ── In-memory cache ────────────────────────────────────────────────────────

let _cache: ActiveDevicesResult | null = null;
let _cacheTimestamp = 0;

/** Force-clear the cache (e.g. after a user delete operation). */
export function invalidateActiveDevicesCache(): void {
  _cache = null;
  _cacheTimestamp = 0;
}

// ── Core SSOT query ────────────────────────────────────────────────────────

/**
 * Fetch all active installed devices from Firestore.
 *
 * Applies the unified filter:
 *   !placeholder  &&  storeSource  &&  valid ExponentPushToken
 *
 * Then deduplicates so one physical device = one user.
 *
 * Returns `{ users, stats, groupMap }`.
 * Results are cached for 30 s to avoid redundant Firestore reads.
 *
 * @param forceRefresh  Skip cache and re-fetch from Firestore.
 */
export async function fetchActiveDevices(
  forceRefresh = false,
): Promise<ActiveDevicesResult> {
  // Return cached result if still fresh
  if (!forceRefresh && _cache && Date.now() - _cacheTimestamp < CACHE_TTL_MS) {
    return _cache;
  }

  const snapshot = await getDocs(collection(db, 'users'));
  const rawUsers: ActiveDevice[] = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    // 1. Skip placeholders
    if (data.placeholder) return;

    // 2. Must be a real store install
    if (!STORE_SOURCES.has(data.installSource)) return;

    // 3. Must have a valid Expo push token
    const token: string = data.fcmToken || '';
    if (!token.startsWith('ExponentPushToken')) return;

    // 4. Must have a display name
    const displayName = data.displayName || data.name || '';
    if (!displayName) return;

    rawUsers.push({
      id: docSnap.id,
      ...data,
      fcmToken: token,
      platform: data.platform || 'unknown',
      language: data.language || 'ar',
      country: data.country || '',
      countrySource: data.countrySource || '',
      prayerCity: data.prayerCity || '',
      prayerLatitude: typeof data.prayerLatitude === 'number' ? data.prayerLatitude : undefined,
      prayerLongitude: typeof data.prayerLongitude === 'number' ? data.prayerLongitude : undefined,
      lastActive: data.lastActive ?? null,
      installSource: data.installSource,
    } as ActiveDevice);
  });

  // Deduplicate: one physical device = one unique user
  const { uniqueUsers, duplicateCount, groupMap } = deduplicateByDevice(rawUsers);

  if (duplicateCount > 0) {
    console.log(`[user-query] Deduplicated ${duplicateCount} duplicate device records`);
  }

  // Compute stats
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const byLanguage: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  let activeCount = 0;
  let dailyCount = 0;
  let iosCount = 0;
  let androidCount = 0;
  let monthlyAzkar = 0;
  let monthlyQuran = 0;
  let monthlyPrayers = 0;

  for (const user of uniqueUsers) {
    // Platform
    const platform = (user.platform || '').toLowerCase();
    if (platform === 'ios') iosCount++;
    else if (platform === 'android') androidCount++;

    // Language
    const lang = user.language || 'ar';
    byLanguage[lang] = (byLanguage[lang] || 0) + 1;

    // Country
    const country = user.country || 'unknown';
    byCountry[country] = (byCountry[country] || 0) + 1;

    // Monthly engagement (from user doc's monthlyEngagement.activities)
    const engagement = (user as any).monthlyEngagement;
    if (engagement?.activities) {
      monthlyAzkar += Number(engagement.activities.azkar) || 0;
      monthlyQuran += Number(engagement.activities.quran) || 0;
      monthlyPrayers += Number(engagement.activities.prayer) || 0;
    }

    // Activity
    if (user.lastActive) {
      try {
        const la =
          typeof (user.lastActive as any).toDate === 'function'
            ? (user.lastActive as any).toDate()
            : new Date(user.lastActive as string);
        if (la > weekAgo) activeCount++;
        if (la > dayAgo) dailyCount++;
      } catch { /* skip unparseable */ }
    }
  }

  const total = uniqueUsers.length;

  const result: ActiveDevicesResult = {
    users: uniqueUsers,
    stats: {
      total,
      withTokens: total, // all users have valid tokens by definition
      ios: iosCount,
      android: androidCount,
      active: activeCount,
      daily: dailyCount,
      byLanguage,
      byCountry,
      retentionRate: total > 0 ? Math.round((activeCount / total) * 100) : 0,
      monthlyAzkar,
      monthlyQuran,
      monthlyPrayers,
    },
    groupMap,
  };

  // Persist to cache
  _cache = result;
  _cacheTimestamp = Date.now();

  return result;
}

// ── Lifetime engagement (per-user subcollection reads) ─────────────────────

export interface LifetimeEngagement {
  totalAzkar: number;
  totalQuran: number;
  totalPrayers: number;
}

/**
 * Aggregate lifetime engagement strictly from currently active users.
 *
 * Reads `users/{uid}/stats/lifetime` for each user ID in the array.
 * Only sums data from users that passed the SSOT filter.
 */
export async function fetchActiveUsersLifetimeEngagement(
  userIds: string[],
): Promise<LifetimeEngagement> {
  let totalAzkar = 0;
  let totalQuran = 0;
  let totalPrayers = 0;

  // Read all lifetime docs in parallel
  const promises = userIds.map(uid =>
    getDoc(doc(db, 'users', uid, 'stats', 'lifetime')).catch(() => null),
  );
  const snapshots = await Promise.all(promises);

  for (const snap of snapshots) {
    if (!snap || !snap.exists()) continue;
    const d = snap.data();
    totalAzkar += Number(d.azkarRead) || 0;
    totalQuran += Number(d.quranPages) || 0;
    totalPrayers += Number(d.prayers) || 0;
  }

  return { totalAzkar, totalQuran, totalPrayers };
}
