/**
 * Single Source of Truth (SSOT) for user/device metrics across the admin panel.
 *
 * The returned `users` array is intentionally the actionable subset used by
 * notifications/leaderboards: store installs with a valid push token + name.
 *
 * `stats` also includes broader raw counters so dashboard/analytics can show
 * everyone who opened the store app, even if they never granted notifications
 * or entered a display name.
 *
 * The actionable `users` result is always deduplicated via `deduplicateByDevice()`.
 * A 30-second in-memory TTL cache prevents redundant Firestore reads
 * when navigating between admin pages.
 */

import { collection, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
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
  /** Actionable named users with valid Expo push tokens (legacy meaning). */
  total: number;
  /** Store users with valid Expo push tokens. */
  withTokens: number;
  /** All non-placeholder docs in users, including dev/expo installs. */
  firestoreUsers: number;
  /** Non-placeholder users whose installSource is play_store/app_store. */
  storeRegistered: number;
  /** Store users active in the last 7 days, regardless of token/name. */
  storeActive: number;
  /** Store users active in the last 24 hours, regardless of token/name. */
  storeDaily: number;
  /** Store users with a displayName/name. */
  namedUsers: number;
  /** Store users without a displayName/name. */
  unnamedUsers: number;
  /** Store users with no valid Expo push token. */
  withoutTokens: number;
  /** Store iOS users, regardless of token/name. */
  storeIos: number;
  /** Store Android users, regardless of token/name. */
  storeAndroid: number;
  ios: number;
  android: number;
  active: number;       // last 7 days
  daily: number;        // last 24 hours
  byLanguage: Record<string, number>;
  byCountry: Record<string, number>;
  storeByLanguage: Record<string, number>;
  storeByCountry: Record<string, number>;
  retentionRate: number; // (active / total) * 100
  // Monthly engagement (from user docs — zero extra reads)
  monthlyAzkar: number;
  monthlyQuran: number;
  monthlyPrayers: number;
}

export interface ActiveDevicesResult {
  /** All non-placeholder store users. This matches `stats.storeRegistered`. */
  storeUsers: ActiveDevice[];
  /** Actionable users: store install + valid Expo push token + name, deduplicated. */
  users: ActiveDevice[];
  stats: ActiveDeviceStats;
  groupMap: Map<string, string[]>;
}

// ── Constants ──────────────────────────────────────────────────────────────

const STORE_SOURCES = new Set(['play_store', 'app_store']);
const CACHE_TTL_MS = 30_000; // 30 seconds

const isStoreSource = (source: unknown): boolean => (
  typeof source === 'string' && STORE_SOURCES.has(source)
);

const isValidExpoPushToken = (token: unknown): boolean => (
  typeof token === 'string' && token.startsWith('ExponentPushToken')
);

const isMarkedUninstalled = (data: Record<string, any>): boolean => (
  data.appStatus === 'uninstalled' || data.pushTokenInvalid === true || Boolean(data.uninstalledDetectedAt)
);

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  try {
    if (typeof (value as any)?.toDate === 'function') return (value as any).toDate();
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
      return new Date((value as { seconds: number }).seconds * 1000);
    }
    const date = value instanceof Date ? value : new Date(value as string);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

// ── In-memory cache ────────────────────────────────────────────────────────

let _cache: ActiveDevicesResult | null = null;
let _cacheTimestamp = 0;

type UsersSnapshotLike = {
  forEach: (callback: (docSnap: { id: string; data: () => Record<string, any> }) => void) => void;
};

/** Force-clear the cache (e.g. after a user delete operation). */
export function invalidateActiveDevicesCache(): void {
  _cache = null;
  _cacheTimestamp = 0;
}

// ── Core SSOT query ────────────────────────────────────────────────────────

export function buildActiveDevicesResult(snapshot: UsersSnapshotLike): ActiveDevicesResult {
  const storeUserCandidates: ActiveDevice[] = [];

  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  let firestoreUsers = 0;
  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    // 1. Skip placeholders
    if (data.placeholder) return;

    firestoreUsers++;
    const storeSource = isStoreSource(data.installSource);
    const token: string = data.fcmToken || '';

    if (storeSource) {
      storeUserCandidates.push({
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
    }
  });

  // Deduplicate store installs first: one physical device/person context should
  // appear once in Users/Dashboard, even if it has both named and anonymous docs.
  const {
    uniqueUsers: storeUsers,
    duplicateCount: storeDuplicateCount,
    groupMap,
  } = deduplicateByDevice(storeUserCandidates);

  const rawUsers = storeUsers.filter(user => {
    const displayName = user.displayName || user.name || '';
    return displayName && isValidExpoPushToken(user.fcmToken) && !isMarkedUninstalled(user);
  });

  // Keep the historical actionable notification list deduped too.
  const { uniqueUsers, duplicateCount: actionableDuplicateCount } = deduplicateByDevice(rawUsers);
  const duplicateCount = storeDuplicateCount + actionableDuplicateCount;

  if (duplicateCount > 0) {
    console.log(`[user-query] Deduplicated ${duplicateCount} duplicate device records`);
  }

  // Compute stats
  let storeRegistered = storeUsers.length;
  let storeActive = 0;
  let storeDaily = 0;
  let namedUsers = 0;
  let pushReachable = 0;
  let storeIos = 0;
  let storeAndroid = 0;
  const storeByLanguage: Record<string, number> = {};
  const storeByCountry: Record<string, number> = {};
  const byLanguage: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  let activeCount = 0;
  let dailyCount = 0;
  let iosCount = 0;
  let androidCount = 0;
  let monthlyAzkar = 0;
  let monthlyQuran = 0;
  let monthlyPrayers = 0;

  for (const user of storeUsers) {
    const displayName = user.displayName || user.name || '';
    const token = user.fcmToken || '';
    const lastActive = toDate(user.lastActive);
    const platform = (user.platform || '').toLowerCase();
    if (displayName) namedUsers++;
    if (isValidExpoPushToken(token) && !isMarkedUninstalled(user)) pushReachable++;
    if (lastActive && lastActive > weekAgo) storeActive++;
    if (lastActive && lastActive > dayAgo) storeDaily++;
    if (platform === 'ios') storeIos++;
    else if (platform === 'android') storeAndroid++;
    const lang = user.language || 'ar';
    const country = user.country || 'unknown';
    storeByLanguage[lang] = (storeByLanguage[lang] || 0) + 1;
    storeByCountry[country] = (storeByCountry[country] || 0) + 1;
  }

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
    const la = toDate(user.lastActive);
    if (la && la > weekAgo) activeCount++;
    if (la && la > dayAgo) dailyCount++;
  }

  const total = uniqueUsers.length;

  return {
    storeUsers,
    users: uniqueUsers,
    stats: {
      total,
      withTokens: pushReachable,
      firestoreUsers,
      storeRegistered,
      storeActive,
      storeDaily,
      namedUsers,
      unnamedUsers: Math.max(storeRegistered - namedUsers, 0),
      withoutTokens: Math.max(storeRegistered - pushReachable, 0),
      storeIos,
      storeAndroid,
      ios: iosCount,
      android: androidCount,
      active: activeCount,
      daily: dailyCount,
      byLanguage,
      byCountry,
      storeByLanguage,
      storeByCountry,
      retentionRate: storeRegistered > 0 ? Math.round((storeActive / storeRegistered) * 100) : 0,
      monthlyAzkar,
      monthlyQuran,
      monthlyPrayers,
    },
    groupMap,
  };
}

export function subscribeActiveDevices(
  onUpdate: (result: ActiveDevicesResult) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const result = buildActiveDevicesResult(snapshot);
      _cache = result;
      _cacheTimestamp = Date.now();
      onUpdate(result);
    },
    (error) => onError?.(error),
  );
}

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
  const result = buildActiveDevicesResult(snapshot);

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
