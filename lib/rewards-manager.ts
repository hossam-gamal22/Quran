// lib/rewards-manager.ts
// نظام المكافآت الشهرية — إدارة النقاط والفائزين

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, onSnapshot, updateDoc, setDoc, increment as firestoreIncrement, collection, query, orderBy, limit, getDocs, where, getCountFromServer, serverTimestamp } from 'firebase/firestore';
import { db, ensureFirebaseUser, getFirebaseUid } from './firebase-config';
import type { RewardsConfig, ScoreWeights, ActivityType, MonthlyEngagement, Winner } from '@/types/rewards';
import { getMonthlyActivityStats, getTodayDate } from '@/lib/worship-storage';

const CACHE_KEY = '@rewards_config_cache';
const PENDING_SCORES_KEY = '@pending_monthly_scores';
const LAST_SYNC_FINGERPRINT_KEY = '@rewards_last_sync_fingerprint';
const LAST_SYNC_AT_KEY = '@rewards_last_sync_at';
const MIN_SYNC_INTERVAL_MS = 60 * 1000;

type SyncOptions = { force?: boolean };

const computeFingerprint = (
  month: string,
  score: number,
  activities: Record<string, number>,
): string => {
  const keys = Object.keys(activities).sort();
  const parts = keys.map(k => `${k}:${Math.trunc(activities[k] || 0)}`);
  return `${month}|${Math.trunc(score)}|${parts.join(',')}`;
};

const isThrottled = async (force: boolean): Promise<boolean> => {
  if (force) return false;
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNC_AT_KEY);
    if (!raw) return false;
    const last = Number(raw) || 0;
    return Date.now() - last < MIN_SYNC_INTERVAL_MS;
  } catch {
    return false;
  }
};

export const DEFAULT_WEIGHTS: ScoreWeights = {
  app_open: 1,
  azkar: 2,
  quran: 3,
  prayer: 5,
  tasbih: 0.5, // every 2 tasbih = 1 point
  khatma: 100,
  fasting: 4,
};

const APP_OPEN_LAST_DATE_KEY = '@app_open_last_scored_date';

const DEFAULT_CONFIG: RewardsConfig = {
  enabled: false,
  winnersCount: 3,
  rewardDurationDays: 30,
  autoSelect: false,
  autoNotify: false,
  scoreWeights: DEFAULT_WEIGHTS,
  currentMonth: '',
  currentWinners: [],
  history: [],
};

let cachedConfig: RewardsConfig | null = null;

const WORSHIP_ACTIVITY_KEYS = new Set<ActivityType>(['azkar', 'quran', 'prayer', 'tasbih', 'fasting', 'khatma']);

type PendingScores = {
  month: string;
  totalPoints: number;
  activities: Record<string, number>;
};

export type MonthlyEngagementSyncResult = {
  score: number;
  month: string;
  activities: Record<string, number>;
  mergeBonus?: { activities: Record<string, number>; score: number; mergedFrom?: string };
  displayName?: string;
  visibleOnLeaderboard?: boolean;
};

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  score: number;
};

const normalizeRewardsConfig = (raw?: Partial<RewardsConfig> | null): RewardsConfig => {
  const rawWeights = (raw as any)?.scoreWeights || {};
  return {
    ...DEFAULT_CONFIG,
    ...(raw || {}),
    scoreWeights: {
      ...DEFAULT_WEIGHTS,
      ...rawWeights,
      khatma: rawWeights.khatma === undefined || rawWeights.khatma === 5
        ? DEFAULT_WEIGHTS.khatma
        : rawWeights.khatma,
    },
    currentWinners: raw?.currentWinners || [],
    history: raw?.history || [],
  };
};

export const calculateMonthlyScore = (
  activities: Record<string, number>,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): number => {
  let score = 0;
  for (const [key, count] of Object.entries(activities)) {
    score += (Number(count) || 0) * (weights[key as ActivityType] || 1);
  }
  // Floor so fractional weights (e.g. tasbih = 0.5 → "every 2 tasbih = 1 pt")
  // always yield whole-number, comparable scores.
  return Math.floor(score);
};

export const orderLeaderboard = (
  entries: LeaderboardEntry[],
  topN: number = entries.length,
): LeaderboardEntry[] => {
  return entries
    .map((entry, index) => ({
      ...entry,
      score: Number(entry.score) || 0,
      __index: index,
    }))
    .sort((a, b) => {
      const scoreDiff = b.score - a.score;
      return scoreDiff !== 0 ? scoreDiff : a.__index - b.__index;
    })
    .slice(0, topN)
    .map(({ __index, ...entry }) => entry);
};

export const mergeCurrentUserIntoLeaderboard = (
  board: LeaderboardEntry[],
  currentUser: LeaderboardEntry,
  topN: number = board.length,
): LeaderboardEntry[] => {
  return orderLeaderboard([
    ...board.filter(user => user.userId !== currentUser.userId),
    currentUser,
  ], topN);
};

const getVisibleDisplayName = (data: Record<string, any>): string => {
  return String(data.displayName || data.name || '').trim();
};

const isEligibleForLeaderboard = (data: Record<string, any>): boolean => {
  return !data.hiddenFromLeaderboard && !data.placeholder && getVisibleDisplayName(data).length > 0;
};

const toActivityCount = (value: unknown): number => Math.max(0, Number(value) || 0);

const getMergeBonusActivities = (mergeBonus?: { activities?: Record<string, number> }): Record<string, number> => (
  mergeBonus?.activities || {}
);

const getExistingBaseActivities = (
  existingActivities: Record<string, any>,
  mergeBonusActivities: Record<string, number>,
): Record<string, number> => {
  const base: Record<string, number> = {};
  for (const [key, count] of Object.entries(existingActivities || {})) {
    base[key] = Math.max(0, toActivityCount(count) - toActivityCount(mergeBonusActivities[key]));
  }
  return base;
};

const getLocalWorshipActivities = (worshipStats: Awaited<ReturnType<typeof getMonthlyActivityStats>>): Record<ActivityType, number> => ({
  prayer: toActivityCount(worshipStats.prayers),
  quran: toActivityCount(worshipStats.quranPages),
  khatma: toActivityCount(worshipStats.khatmas),
  azkar: toActivityCount(worshipStats.azkar),
  tasbih: toActivityCount(worshipStats.tasbih),
  fasting: toActivityCount(worshipStats.fasting),
  app_open: 0,
});

const mergeMonthlyActivities = (
  existingActivities: Record<string, any>,
  pendingActivities: Record<string, any>,
  worshipStats: Awaited<ReturnType<typeof getMonthlyActivityStats>>,
  mergeBonus?: { activities?: Record<string, number> },
): Record<string, number> => {
  const mergeBonusActivities = getMergeBonusActivities(mergeBonus);
  const existingBaseActivities = getExistingBaseActivities(existingActivities, mergeBonusActivities);
  const localWorship = getLocalWorshipActivities(worshipStats);
  const activities: Record<string, number> = {};

  for (const [key, count] of Object.entries(existingBaseActivities)) {
    if (!WORSHIP_ACTIVITY_KEYS.has(key as ActivityType)) {
      activities[key] = toActivityCount(count);
    }
  }

  for (const [key, count] of Object.entries(pendingActivities || {})) {
    if (!WORSHIP_ACTIVITY_KEYS.has(key as ActivityType)) {
      activities[key] = (activities[key] || 0) + toActivityCount(count);
    }
  }

  for (const key of WORSHIP_ACTIVITY_KEYS) {
    activities[key] = Math.max(
      toActivityCount(existingBaseActivities[key]),
      toActivityCount(localWorship[key]),
    );
  }

  for (const [key, count] of Object.entries(mergeBonusActivities)) {
    activities[key] = (activities[key] || 0) + toActivityCount(count);
  }

  return activities;
};

const getCloudScoreFloor = (
  engagement: MonthlyEngagement | undefined,
  month: string,
): number => {
  if (!engagement || engagement.month !== month) return 0;
  return Math.max(0, Number(engagement.score) || 0);
};

/**
 * Get current month string YYYY-MM-v2
 * v2 suffix resets all previous engagement data (clean slate from 2026-03-24)
 */
export const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-v2`;
};

/**
 * Fetch rewards config with 3-tier cache
 */
export const fetchRewardsConfig = async (): Promise<RewardsConfig> => {
  if (cachedConfig) {
    // If cached config says disabled, await fresh Firestore data
    // (admin may have enabled it since last cache)
    if (!cachedConfig.enabled) {
      return refreshRewardsFromFirestore();
    }
    return cachedConfig;
  }

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = normalizeRewardsConfig(JSON.parse(cached));
      // If stored cache says disabled, skip it and fetch fresh from Firestore
      if (!parsed.enabled) {
        return refreshRewardsFromFirestore();
      }
      cachedConfig = parsed;
      // Refresh from Firestore in background
      refreshRewardsFromFirestore();
      return cachedConfig!;
    }
  } catch {}

  return refreshRewardsFromFirestore();
};

const refreshRewardsFromFirestore = async (): Promise<RewardsConfig> => {
  try {
    const snap = await getDoc(doc(db, 'config', 'rewards-settings'));
    if (snap.exists()) {
      cachedConfig = normalizeRewardsConfig(snap.data() as Partial<RewardsConfig>);
    } else {
      cachedConfig = normalizeRewardsConfig(DEFAULT_CONFIG);
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachedConfig));
  } catch {
    cachedConfig = cachedConfig || normalizeRewardsConfig(DEFAULT_CONFIG);
  }
  return cachedConfig;
};

/**
 * Real-time listener for rewards config changes from admin panel.
 * Returns an unsubscribe function.
 */
export function subscribeToRewardsConfig(
  onUpdate: (config: RewardsConfig) => void,
): () => void {
  try {
    return onSnapshot(
      doc(db, 'config', 'rewards-settings'),
      (snap) => {
        const merged: RewardsConfig = snap.exists()
          ? normalizeRewardsConfig(snap.data() as Partial<RewardsConfig>)
          : normalizeRewardsConfig(DEFAULT_CONFIG);
        cachedConfig = merged;
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged)).catch(() => {});
        onUpdate(merged);
      },
      (error) => {
        if (__DEV__) console.warn('[rewards-manager] subscribe error:', error);
      },
    );
  } catch (e) {
    if (__DEV__) console.warn('[rewards-manager] failed to subscribe:', e);
    return () => {};
  }
}

/**
 * Update monthly engagement score for a user.
 * Saves locally first (offline-safe), then syncs to Firestore.
 */
export const updateMonthlyScore = async (
  userId: string,
  activityType: ActivityType,
  multiplier: number = 1
): Promise<void> => {
  try {
    // Daily cap for app_open: max 1 point per day (unique days only)
    if (activityType === 'app_open') {
      const today = getTodayDate();
      const lastDate = await AsyncStorage.getItem(APP_OPEN_LAST_DATE_KEY);
      if (lastDate === today) {
        console.log('📊 app_open already scored today, skipping');
        return;
      }
      await AsyncStorage.setItem(APP_OPEN_LAST_DATE_KEY, today);
    }

    const config = await fetchRewardsConfig();
    const points = (config.scoreWeights[activityType] || 1) * multiplier;
    const currentMonth = getCurrentMonth();

    // 1. Always save locally first (works offline + works even if config.enabled is stale)
    await saveLocalPendingScore(activityType, points, multiplier, currentMonth);

    // 2. Only sync to Firestore if rewards are enabled
    if (!config.enabled) {
      console.log('⚠️ Rewards disabled — score saved locally for', activityType);
      return;
    }

    // 3. Try to sync to Firestore
    try {
      // Establish the anonymous auth session first — the user-doc write rules
      // require `signedIn()`; otherwise the write is denied and points only
      // ever live in local pending until the next forced reconcile.
      await ensureFirebaseUser().catch(() => {});
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const docExists = userSnap.exists();
      const data = userSnap.data();
      const engagement: MonthlyEngagement = data?.monthlyEngagement || { month: '', score: 0 };

      if (!docExists || engagement.month !== currentMonth) {
        // New doc or new month — read pending WITHOUT clearing
        const pending = await getPendingScores(currentMonth);
        const engagementUpdate: Record<string, any> = {
          monthlyEngagement: {
            month: currentMonth,
            score: pending.totalPoints,
            activities: pending.activities,
          },
        };
        // Archive old month data before overwriting (if exists)
        if (docExists && engagement.month && engagement.score > 0) {
          engagementUpdate[`engagementHistory.${engagement.month}`] = {
            score: engagement.score,
            activities: (engagement as any).activities || {},
          };
        }
        if (docExists) {
          await updateDoc(userRef, engagementUpdate);
        } else {
          await setDoc(userRef, engagementUpdate, { merge: true });
        }
        // Only clear local AFTER Firestore write confirmed
        await AsyncStorage.removeItem(PENDING_SCORES_KEY);
      } else {
        // Same month, doc exists — increment
        await updateDoc(userRef, {
          'monthlyEngagement.score': firestoreIncrement(points),
          [`monthlyEngagement.activities.${activityType}`]: firestoreIncrement(multiplier),
        });
        await consumeLocalPendingScore(activityType, points, multiplier, currentMonth);
      }
      console.log(`🏆 Monthly score synced: +${points} pts (${activityType})`);
    } catch (syncError) {
      // Firestore failed — points saved locally, will sync later
      console.log('📴 Offline — score saved locally, will sync later');
    }
  } catch (error) {
    console.error('❌ Failed to update monthly score:', error);
  }
};

/**
 * Save a pending score to local storage (offline-safe)
 */
const saveLocalPendingScore = async (
  activityType: ActivityType,
  points: number,
  multiplier: number,
  month: string
): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SCORES_KEY);
    const pending = raw ? JSON.parse(raw) : { month: '', totalPoints: 0, activities: {} };

    if (pending.month !== month) {
      // New month — reset local
      pending.month = month;
      pending.totalPoints = points;
      pending.activities = { [activityType]: multiplier };
    } else {
      pending.totalPoints += points;
      pending.activities[activityType] = (pending.activities[activityType] || 0) + multiplier;
    }

    await AsyncStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(pending));
  } catch {}
};

const consumeLocalPendingScore = async (
  activityType: ActivityType,
  points: number,
  multiplier: number,
  month: string
): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SCORES_KEY);
    if (!raw) return;
    const pending = JSON.parse(raw) as PendingScores;
    if (pending.month !== month) return;

    const activities = { ...(pending.activities || {}) };
    const nextCount = (Number(activities[activityType]) || 0) - multiplier;
    if (nextCount > 0) {
      activities[activityType] = nextCount;
    } else {
      delete activities[activityType];
    }

    const totalPoints = Math.max(0, (Number(pending.totalPoints) || 0) - points);
    if (totalPoints <= 0 || Object.keys(activities).length === 0) {
      await AsyncStorage.removeItem(PENDING_SCORES_KEY);
      return;
    }

    await AsyncStorage.setItem(PENDING_SCORES_KEY, JSON.stringify({
      month,
      totalPoints,
      activities,
    }));
  } catch {}
};

/**
 * Get pending scores WITHOUT clearing (safe read-only)
 */
const getPendingScores = async (month: string): Promise<{ totalPoints: number; activities: Record<string, number> }> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SCORES_KEY);
    if (raw) {
      const pending = JSON.parse(raw);
      if (pending.month === month) {
        return { totalPoints: pending.totalPoints || 0, activities: pending.activities || {} };
      }
    }
  } catch {}
  return { totalPoints: 0, activities: {} };
};

/**
 * Recalculate the current month from local worship storage and merge in
 * non-worship Firestore/pending activity such as app_open.
 */
export const syncMonthlyEngagementFromLocalWorship = async (
  userId: string,
  options: SyncOptions = {},
): Promise<MonthlyEngagementSyncResult | null> => {
  try {
    const force = options.force === true;
    if (await isThrottled(force)) return null;

    const config = await fetchRewardsConfig();
    if (!config.enabled) return null;

    const currentMonth = getCurrentMonth();

    // Cheap pre-check: if local activities haven't changed since last
    // sync AND we synced recently, skip the Firestore read entirely.
    // This is the single biggest cost saving at scale.
    const worshipStats = await getMonthlyActivityStats();
    const pending = await getPendingScores(currentMonth);
    const weights = config.scoreWeights || DEFAULT_WEIGHTS;
    const localActivities = mergeMonthlyActivities({}, pending.activities || {}, worshipStats, undefined);
    const localScore = calculateMonthlyScore(localActivities, weights);
    const localFingerprint = computeFingerprint(currentMonth, localScore, localActivities);
    if (!force) {
      try {
        const lastFingerprint = await AsyncStorage.getItem(LAST_SYNC_FINGERPRINT_KEY);
        if (lastFingerprint === localFingerprint) {
          await AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(Date.now()));
          return null;
        }
      } catch {}
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const docExists = userSnap.exists();
    const data = userSnap.data();
    const engagement: MonthlyEngagement = data?.monthlyEngagement || { month: '', score: 0 };
    const existingActivities = engagement.month === currentMonth
      ? { ...(engagement.activities || {}) }
      : {};

    const mergeBonus = data?.mergeBonus || undefined;
    const activities = mergeMonthlyActivities(
      existingActivities,
      pending.activities || {},
      worshipStats,
      mergeBonus,
    );

    const calculatedScore = calculateMonthlyScore(activities, weights);

    // When the admin changes the point weights, scoreWeightsVersion bumps. The
    // usual `Math.max(calculated, cloudFloor)` floor (which guards against a
    // reinstalled device wiping the cloud score) would otherwise pin the OLD
    // higher score forever after a weight DECREASE (e.g. tasbih 1 → 0.5). So
    // when this device's stored weightsVersion is older than the config, the
    // fresh recompute is authoritative and may lower the score. We stamp a
    // fresh engagementCorrection so the server guard accepts the same-month
    // decrease, exactly like the admin remediation script does.
    const configWeightsVersion = Number((config as any).scoreWeightsVersion) || 0;
    const cloudWeightsVersion = engagement.month === currentMonth
      ? Number((engagement as any).weightsVersion) || 0
      : 0;
    const weightsChanged = configWeightsVersion > cloudWeightsVersion;
    const score = weightsChanged
      ? calculatedScore
      : Math.max(calculatedScore, getCloudScoreFloor(engagement, currentMonth));

    const monthIsCurrent = engagement.month === currentMonth;
    const scoreUnchanged =
      monthIsCurrent &&
      Number(engagement.score) === score &&
      cloudWeightsVersion === configWeightsVersion;
    const willArchivePrevMonth =
      docExists && engagement.month && engagement.month !== currentMonth && engagement.score > 0;

    if (scoreUnchanged && !willArchivePrevMonth) {
      await AsyncStorage.setItem(LAST_SYNC_FINGERPRINT_KEY, computeFingerprint(currentMonth, score, activities));
      await AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(Date.now()));
      await AsyncStorage.removeItem(PENDING_SCORES_KEY);
      return {
        score,
        month: currentMonth,
        activities,
        mergeBonus,
        displayName: getVisibleDisplayName(data || {}),
        visibleOnLeaderboard: data ? isEligibleForLeaderboard(data) : false,
      };
    }

    const engagementUpdate: Record<string, any> = {
      monthlyEngagement: {
        month: currentMonth,
        score,
        activities,
        // Stamp the weights version this score was computed with so a later
        // weight change is detected and allowed to re-lower the score.
        weightsVersion: configWeightsVersion,
      },
    };
    // If a weight change lowered the score below the cloud value, mark this as a
    // deliberate correction so guardMonthlyEngagementRegression accepts the
    // same-month decrease (otherwise the server would revert it).
    if (weightsChanged && monthIsCurrent && score < (Number(engagement.score) || 0)) {
      engagementUpdate.engagementCorrection = {
        type: 'weights_recompute',
        weightsVersion: configWeightsVersion,
        correctedAt: serverTimestamp(),
      };
    }
    if (willArchivePrevMonth) {
      engagementUpdate[`engagementHistory.${engagement.month}`] = {
        score: engagement.score,
        activities: engagement.activities || {},
      };
      // Denormalised pointer so the winner-selection Cloud Function can
      // still find this user's previous-month score after their
      // engagement record has rolled over to the new month.
      engagementUpdate.lastFinalizedMonth = {
        month: engagement.month,
        score: engagement.score,
        activities: engagement.activities || {},
        displayName: getVisibleDisplayName(data || {}),
      };
    }

    // Ensure an anonymous Firebase Auth session exists BEFORE writing. The
    // Firestore rules gate user-doc writes on `signedIn()`; without awaiting
    // this the write races ahead of auth and is denied (request.auth == null),
    // which previously froze all monthly-engagement updates. Persist authUid
    // so the doc-ownership rules (self-delete) can match this session later.
    try {
      await ensureFirebaseUser();
      const uid = getFirebaseUid();
      if (uid && data?.authUid !== uid) {
        engagementUpdate.authUid = uid;
      }
    } catch {}

    if (docExists) {
      await updateDoc(userRef, engagementUpdate);
    } else {
      await setDoc(userRef, engagementUpdate, { merge: true });
    }

    await AsyncStorage.setItem(LAST_SYNC_FINGERPRINT_KEY, computeFingerprint(currentMonth, score, activities));
    await AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(Date.now()));
    await AsyncStorage.removeItem(PENDING_SCORES_KEY);
    return {
      score,
      month: currentMonth,
      activities,
      mergeBonus,
      displayName: getVisibleDisplayName(data || {}),
      visibleOnLeaderboard: data ? isEligibleForLeaderboard(data) : false,
    };
  } catch (error) {
    if (__DEV__) console.log('📴 Monthly engagement sync failed:', error);
    return null;
  }
};

/**
 * Legacy entry point kept for callers that still request pending sync.
 * It now delegates to the unified monthly recalculation to avoid duplicates.
 */
export const syncPendingScores = async (userId: string): Promise<void> => {
  await syncMonthlyEngagementFromLocalWorship(userId);
};

/**
 * Returns how often the foreground app should push the user's monthly
 * score to the server, based on how close we are to the month boundary.
 *
 * Winner selection runs at 12:00 on day 1, so a user's true score must
 * already be on the server before the month rolls over at midnight.
 * The window below is intentionally wide so that any user who opens the
 * app in the final two days gets their score uploaded while it is still
 * the current month — maximising the chance the leaderboard ranking is
 * correct at selection time:
 *
 * - Last 30 minutes of month: every 30 seconds (last-minute activity)
 * - Last 2 hours of month: every 60 seconds
 * - Last 48 hours of month: every 5 minutes
 * - Otherwise: null (the 15-min background task is enough)
 *
 * Note: this only fires while the app is in the foreground. Devices that
 * stay closed through the rollover are still recovered (best-effort) by
 * the day 1–3 `syncPreviousMonthIfPending` back-fill on next app open.
 */
export const getEndOfMonthSyncIntervalMs = (now: Date = new Date()): number | null => {
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  const msUntilEnd = endOfMonth.getTime() - now.getTime();
  if (msUntilEnd <= 0) return null;
  if (msUntilEnd <= 30 * 60 * 1000) return 30 * 1000;
  if (msUntilEnd <= 2 * 60 * 60 * 1000) return 60 * 1000;
  if (msUntilEnd <= 48 * 60 * 60 * 1000) return 5 * 60 * 1000;
  return null;
};

const getPrevMonthKey = (): { month: string; year: number; monthNumber: number } => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    year: prev.getFullYear(),
    monthNumber: prev.getMonth() + 1,
    month: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-v2`,
  };
};

/**
 * If we're in the early days of a new month, push any stranded
 * previous-month activity from the device to the server so the
 * scheduled winner-selection Cloud Function can see it.
 *
 * Safe to call at any time. Skips if the user already has the latest
 * previous-month score on the server (no Firestore write performed).
 */
export const syncPreviousMonthIfPending = async (userId: string): Promise<void> => {
  try {
    const config = await fetchRewardsConfig();
    if (!config.enabled) return;

    const now = new Date();
    if (now.getDate() > 3) return;

    const prev = getPrevMonthKey();
    const weights = config.scoreWeights || DEFAULT_WEIGHTS;
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const data = userSnap.data();
    const docExists = userSnap.exists();

    const worshipStats = await getMonthlyActivityStats(prev.year, prev.monthNumber);
    const localWorship = getLocalWorshipActivities(worshipStats);
    if (Object.values(localWorship).every(v => v <= 0)) return;

    const engagement: MonthlyEngagement = data?.monthlyEngagement || { month: '', score: 0 };
    const historyKey = `engagementHistory.${prev.month}`;
    const archived = data?.engagementHistory?.[prev.month];

    const existingActivities: Record<string, number> =
      engagement.month === prev.month
        ? { ...(engagement.activities || {}) }
        : { ...((archived?.activities as Record<string, number>) || {}) };

    const mergedActivities: Record<string, number> = { ...existingActivities };
    for (const key of WORSHIP_ACTIVITY_KEYS) {
      mergedActivities[key] = Math.max(
        toActivityCount(existingActivities[key]),
        toActivityCount(localWorship[key]),
      );
    }

    const calculatedScore = calculateMonthlyScore(mergedActivities, weights);
    const existingScore = Math.max(
      Number(archived?.score) || 0,
      engagement.month === prev.month ? (Number(engagement.score) || 0) : 0,
    );

    if (calculatedScore <= existingScore) return;

    const update: Record<string, any> = {
      [historyKey]: {
        score: calculatedScore,
        activities: mergedActivities,
      },
      lastFinalizedMonth: {
        month: prev.month,
        score: calculatedScore,
        activities: mergedActivities,
        displayName: getVisibleDisplayName(data || {}),
      },
    };
    if (engagement.month === prev.month) {
      update.monthlyEngagement = {
        month: prev.month,
        score: calculatedScore,
        activities: mergedActivities,
      };
    }

    if (docExists) {
      await updateDoc(userRef, update);
    } else {
      await setDoc(userRef, update, { merge: true });
    }
  } catch (error) {
    if (__DEV__) console.log('📴 Previous month sync failed:', error);
  }
};

/**
 * Check if user is a winner this month
 */
export const checkIfUserIsWinner = async (userId: string): Promise<boolean> => {
  const config = await fetchRewardsConfig();
  return config.currentWinners.some(w => w.userId === userId);
};

/**
 * Check and apply reward on app startup
 */
export const checkAndApplyReward = async (userId: string): Promise<boolean> => {
  try {
    const config = await fetchRewardsConfig();
    if (!config.enabled || config.currentWinners.length === 0) return false;

    const isWinner = config.currentWinners.find(w => w.userId === userId);
    if (!isWinner) return false;

    // Check if already applied locally
    const appliedKey = `@reward_applied_${config.currentMonth}`;
    const alreadyApplied = await AsyncStorage.getItem(appliedKey);
    if (alreadyApplied) return false;

    // Mark as applied locally
    await AsyncStorage.setItem(appliedKey, 'true');
    return true;
  } catch {
    return false;
  }
};

/**
 * Get user's monthly rank info (merges Firestore + local pending)
 * Also returns mergeBonus if user received merged points from admin
 */
export const getUserMonthlyInfo = async (userId: string): Promise<{
  score: number;
  month: string;
  activities?: Record<string, number>;
  mergeBonus?: { activities: Record<string, number>; score: number; mergedFrom?: string };
} | null> => {
  try {
    const config = await fetchRewardsConfig();
    const userSnap = await getDoc(doc(db, 'users', userId));
    const data = userSnap.data();
    const engagement = data?.monthlyEngagement;
    const currentMonth = getCurrentMonth();
    const pending = await getPendingScores(currentMonth);
    const worshipStats = await getMonthlyActivityStats();
    const mergeBonus = data?.mergeBonus || undefined;
    const activities = mergeMonthlyActivities(
      engagement && engagement.month === currentMonth ? (engagement.activities || {}) : {},
      pending.activities || {},
      worshipStats,
      mergeBonus,
    );

    // Recalculate score from merged activities × weights for consistency
    const weights = config.scoreWeights || DEFAULT_WEIGHTS;
    const calculatedScore = calculateMonthlyScore(activities, weights);
    // Mirror the sync floor logic: after a weight change (newer config version
    // than the score was stamped with) the recompute is authoritative and may
    // be lower; otherwise keep the anti-regression floor.
    const configWeightsVersion = Number((config as any).scoreWeightsVersion) || 0;
    const cloudWeightsVersion = engagement && engagement.month === currentMonth
      ? Number((engagement as any).weightsVersion) || 0
      : 0;
    const score = configWeightsVersion > cloudWeightsVersion
      ? calculatedScore
      : Math.max(calculatedScore, getCloudScoreFloor(engagement, currentMonth));

    return { score, month: currentMonth, activities, mergeBonus };
  } catch {
    // Fallback to local-only if Firestore fails
    try {
      const config = await fetchRewardsConfig();
      const weights = config.scoreWeights || DEFAULT_WEIGHTS;
      const raw = await AsyncStorage.getItem(PENDING_SCORES_KEY);
      const currentMonth = getCurrentMonth();
      const activities: Record<string, number> = {};
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending.month === currentMonth) {
          Object.assign(activities, pending.activities || {});
        }
      }
      const worshipStats = await getMonthlyActivityStats();
      activities.prayer = worshipStats.prayers;
      activities.quran = worshipStats.quranPages;
      activities.khatma = worshipStats.khatmas;
      activities.azkar = worshipStats.azkar;
      activities.tasbih = worshipStats.tasbih;
      activities.fasting = worshipStats.fasting;
      const score = calculateMonthlyScore(activities, weights);
      return {
        score,
        month: currentMonth,
        activities,
      };
    } catch {}
    return null;
  }
};

/**
 * Get the monthly leaderboard — top users by score for the current month.
 *
 * Reads the shared `cache/leaderboard-current` document maintained by the
 * `cacheLeaderboardSnapshot` Cloud Function. This costs 1 read per
 * client visit instead of 50, which is the single biggest cost driver
 * at scale. Falls back to the live query if the cache is missing or
 * stale (e.g., first-month rollover before the schedule has fired).
 */
export const getMonthlyLeaderboard = async (topN: number = 20): Promise<LeaderboardEntry[]> => {
  const currentMonth = getCurrentMonth();
  try {
    const cacheSnap = await getDoc(doc(db, 'cache', 'leaderboard-current'));
    if (cacheSnap.exists()) {
      const data = cacheSnap.data() as { month?: string; entries?: LeaderboardEntry[] } | undefined;
      if (data?.month === currentMonth && Array.isArray(data.entries) && data.entries.length > 0) {
        return orderLeaderboard(data.entries, topN);
      }
    }
  } catch {}

  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('monthlyEngagement.month', '==', currentMonth),
      orderBy('monthlyEngagement.score', 'desc'),
      limit(Math.max(topN * 3, topN))
    );
    const snapshot = await getDocs(q);

    const leaderboard: LeaderboardEntry[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const engagement = data.monthlyEngagement;
      const displayName = getVisibleDisplayName(data);
      if (isEligibleForLeaderboard(data) && engagement?.score > 0) {
        leaderboard.push({
          userId: docSnap.id,
          displayName,
          score: engagement.score,
        });
      }
    });

    return orderLeaderboard(leaderboard, topN);
  } catch {
    return [];
  }
};

/**
 * Resolve the exact monthly rank for a user — including users below the
 * cached top 50, where `findIndex` on the cache alone returns -1.
 *
 * Strategy:
 *  - Read `cache/leaderboard-current` (1 read; same doc `getMonthlyLeaderboard`
 *    uses, often already warmed by the caller).
 *  - If the user is in the cached entries, return `index + 1`.
 *  - Else, if their score is positive, run a `count()` aggregation for
 *    `month == currentMonth AND score > userScore`. Aggregate count is
 *    billed as 1 read per ≤1000 matched docs, so a single read per session
 *    even at scale.
 *  - Returns `null` for score-0 / no-engagement users (no rank to show).
 *
 * The result reflects rank among *all* users with a positive score
 * (matching the admin panel ordering), not only among named users —
 * which is what users actually want to see ("how many people scored more
 * than me?"). The visible leaderboard list remains named-only.
 */
export const getUserMonthlyRank = async (
  userId: string,
  userScore: number,
): Promise<number | null> => {
  if (!userId || !Number.isFinite(userScore) || userScore <= 0) return null;
  const currentMonth = getCurrentMonth();
  try {
    const cacheSnap = await getDoc(doc(db, 'cache', 'leaderboard-current'));
    if (cacheSnap.exists()) {
      const data = cacheSnap.data() as {
        month?: string;
        entries?: LeaderboardEntry[];
        lowestCachedScore?: number | null;
      } | undefined;
      if (data?.month === currentMonth && Array.isArray(data.entries)) {
        const idx = data.entries.findIndex(u => u.userId === userId);
        if (idx >= 0) return idx + 1;
        // Fast path: when the cache covers everyone with a positive
        // score (i.e. there are fewer eligible users than the cache
        // cap), a user not in the cache has score 0 and we already
        // returned null above. Skip the count read in that case.
        const lowest = data.lowestCachedScore;
        if (typeof lowest === 'number' && userScore >= lowest && data.entries.length < 50) {
          // Edge case: user has a score >= lowestCachedScore but was
          // filtered out (e.g. no displayName). Their position among
          // all positive-score users is just before the cache tail.
          return data.entries.length;
        }
      }
    }

    // Exact rank for users below the cached top — one count aggregation.
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('monthlyEngagement.month', '==', currentMonth),
      where('monthlyEngagement.score', '>', userScore),
    );
    const countSnap = await getCountFromServer(q);
    const higherCount = countSnap.data().count || 0;
    return higherCount + 1;
  } catch {
    return null;
  }
};

/**
 * Save user display name to Firestore
 */
export const saveDisplayName = async (userId: string, displayName: string): Promise<void> => {
  try {
    const trimmed = displayName.trim();
    // Lazy import to avoid a circular dep with firebase-user → rewards-manager.
    const { normalizeDisplayName } = await import('./firebase-user');
    const userRef = doc(db, 'users', userId);
    await Promise.allSettled([
      updateDoc(userRef, {
        displayName: trimmed,
        displayNameLower: normalizeDisplayName(trimmed),
      }),
      AsyncStorage.setItem('@rooh_display_name', trimmed),
    ]);
    console.log('✅ Display name saved:', trimmed);
  } catch (error) {
    console.error('❌ Failed to save display name:', error);
  }
};

const LAST_RANK_KEY = '@honor_board_last_rank';
const WINNER_CELEBRATED_PREFIX = '@winner_celebrated_';

/**
 * Detect if user's rank has improved since last check.
 * Stores the current rank in AsyncStorage for comparison.
 */
export const detectRankChange = async (
  userId: string,
  leaderboard: Array<{ userId: string; displayName: string; score: number }>
): Promise<{ improved: boolean; oldRank: number | null; newRank: number | null }> => {
  try {
    const rankIndex = leaderboard.findIndex(u => u.userId === userId);
    const newRank = rankIndex >= 0 ? rankIndex + 1 : null;

    const stored = await AsyncStorage.getItem(LAST_RANK_KEY);
    let oldRank: number | null = null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.month === getCurrentMonth()) {
          oldRank = parsed.rank;
        }
      } catch {}
    }

    // Save current rank
    if (newRank !== null) {
      await AsyncStorage.setItem(LAST_RANK_KEY, JSON.stringify({ rank: newRank, month: getCurrentMonth() }));
    }

    // Improved = old rank existed and new rank is lower number (better position)
    const improved = oldRank !== null && newRank !== null && newRank < oldRank;
    return { improved, oldRank, newRank };
  } catch {
    return { improved: false, oldRank: null, newRank: null };
  }
};

/**
 * Check if user is the monthly winner and hasn't been celebrated yet.
 */
export const checkAndCelebrateWinner = async (userId: string): Promise<boolean> => {
  try {
    const config = await fetchRewardsConfig();
    const isWinner = config.currentWinners.some((w: Winner) => w.userId === userId);
    if (!isWinner) return false;

    const currentMonth = getCurrentMonth();
    const key = `${WINNER_CELEBRATED_PREFIX}${currentMonth}`;
    const already = await AsyncStorage.getItem(key);
    if (already) return false;

    await AsyncStorage.setItem(key, 'true');
    return true;
  } catch {
    return false;
  }
};

/**
 * Compatibility no-op.
 * Monthly winner selection and premium grants are server-only via the
 * scheduled Cloud Function `selectMonthlyWinners`.
 */
export const autoSelectMonthlyWinners = async (): Promise<void> => {
  await refreshRewardsFromFirestore();
};
