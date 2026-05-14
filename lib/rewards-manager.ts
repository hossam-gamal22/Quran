// lib/rewards-manager.ts
// نظام المكافآت الشهرية — إدارة النقاط والفائزين

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, onSnapshot, updateDoc, setDoc, increment as firestoreIncrement, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from './firebase-config';
import { scheduleLocalNotification } from './push-notifications';
import type { RewardsConfig, ScoreWeights, ActivityType, MonthlyEngagement, Winner } from '@/types/rewards';
import { getMonthlyActivityStats, getTodayDate } from '@/lib/worship-storage';

const CACHE_KEY = '@rewards_config_cache';
const PENDING_SCORES_KEY = '@pending_monthly_scores';

export const DEFAULT_WEIGHTS: ScoreWeights = {
  app_open: 1,
  azkar: 2,
  quran: 3,
  prayer: 5,
  tasbih: 1,
  khatma: 5,
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

const WORSHIP_ACTIVITY_KEYS = new Set<ActivityType>(['azkar', 'quran', 'prayer', 'tasbih', 'fasting']);

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

const normalizeRewardsConfig = (raw?: Partial<RewardsConfig> | null): RewardsConfig => ({
  ...DEFAULT_CONFIG,
  ...(raw || {}),
  scoreWeights: {
    ...DEFAULT_WEIGHTS,
    ...((raw as any)?.scoreWeights || {}),
  },
  currentWinners: raw?.currentWinners || [],
  history: raw?.history || [],
});

export const calculateMonthlyScore = (
  activities: Record<string, number>,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): number => {
  let score = 0;
  for (const [key, count] of Object.entries(activities)) {
    score += (Number(count) || 0) * (weights[key as ActivityType] || 1);
  }
  return score;
};

const getVisibleDisplayName = (data: Record<string, any>): string => {
  return String(data.displayName || '').trim();
};

const isEligibleForLeaderboard = (data: Record<string, any>): boolean => {
  return !data.hiddenFromLeaderboard && !data.placeholder && getVisibleDisplayName(data).length > 0;
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
 * Overwrite monthly engagement in Firestore with recalculated values.
 * Used to correct stale leaderboard scores by setting the absolute truth
 * from worship storage instead of incrementing.
 */
export const setMonthlyEngagement = async (
  userId: string,
  activities: Record<string, number>,
  totalScore: number
): Promise<void> => {
  try {
    const currentMonth = getCurrentMonth();
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      monthlyEngagement: {
        month: currentMonth,
        score: totalScore,
        activities,
      },
    }, { merge: true });
  } catch (error) {
    console.log('📴 Failed to set monthly engagement:', error);
  }
};

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
): Promise<MonthlyEngagementSyncResult | null> => {
  try {
    const config = await fetchRewardsConfig();
    if (!config.enabled) return null;

    const currentMonth = getCurrentMonth();
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const docExists = userSnap.exists();
    const data = userSnap.data();
    const engagement: MonthlyEngagement = data?.monthlyEngagement || { month: '', score: 0 };
    const existingActivities = engagement.month === currentMonth
      ? { ...(engagement.activities || {}) }
      : {};
    const pending = await getPendingScores(currentMonth);
    const worshipStats = await getMonthlyActivityStats();

    const activities: Record<string, number> = {};

    for (const [key, count] of Object.entries(existingActivities)) {
      if (!WORSHIP_ACTIVITY_KEYS.has(key as ActivityType)) {
        activities[key] = Number(count) || 0;
      }
    }

    for (const [key, count] of Object.entries(pending.activities || {})) {
      if (!WORSHIP_ACTIVITY_KEYS.has(key as ActivityType)) {
        activities[key] = (activities[key] || 0) + (Number(count) || 0);
      }
    }

    activities.prayer = worshipStats.prayers;
    activities.quran = worshipStats.quranPages;
    activities.azkar = worshipStats.azkar;
    activities.tasbih = worshipStats.tasbih;
    activities.fasting = worshipStats.fasting;

    const mergeBonus = data?.mergeBonus || undefined;
    if (mergeBonus?.activities) {
      for (const [key, count] of Object.entries(mergeBonus.activities)) {
        activities[key] = (activities[key] || 0) + (Number(count) || 0);
      }
    }

    const score = calculateMonthlyScore(activities, config.scoreWeights || DEFAULT_WEIGHTS);

    const engagementUpdate: Record<string, any> = {
      monthlyEngagement: {
        month: currentMonth,
        score,
        activities,
      },
    };
    if (docExists && engagement.month && engagement.month !== currentMonth && engagement.score > 0) {
      engagementUpdate[`engagementHistory.${engagement.month}`] = {
        score: engagement.score,
        activities: engagement.activities || {},
      };
    }

    if (docExists) {
      await updateDoc(userRef, engagementUpdate);
    } else {
      await setDoc(userRef, engagementUpdate, { merge: true });
    }

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
    console.log('📴 Monthly engagement sync failed:', error);
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

    const activities: Record<string, number> = {};

    if (engagement && engagement.month === currentMonth) {
      for (const [key, count] of Object.entries(engagement.activities || {})) {
        if (!WORSHIP_ACTIVITY_KEYS.has(key as ActivityType)) {
          activities[key] = Number(count) || 0;
        }
      }
    }

    const pending = await getPendingScores(currentMonth);
    for (const [key, count] of Object.entries(pending.activities || {})) {
      if (!WORSHIP_ACTIVITY_KEYS.has(key as ActivityType)) {
        activities[key] = (activities[key] || 0) + (Number(count) || 0);
      }
    }

    const worshipStats = await getMonthlyActivityStats();
    activities.prayer = worshipStats.prayers;
    activities.quran = worshipStats.quranPages;
    activities.azkar = worshipStats.azkar;
    activities.tasbih = worshipStats.tasbih;
    activities.fasting = worshipStats.fasting;

    const mergeBonus = data?.mergeBonus || undefined;
    if (mergeBonus?.activities) {
      for (const [key, count] of Object.entries(mergeBonus.activities)) {
        activities[key] = (activities[key] || 0) + (Number(count) || 0);
      }
    }

    // Recalculate score from merged activities × weights for consistency
    const weights = config.scoreWeights || DEFAULT_WEIGHTS;
    const score = calculateMonthlyScore(activities, weights);

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
 * Get the monthly leaderboard — top users by score for the current month
 */
export const getMonthlyLeaderboard = async (topN: number = 20): Promise<Array<{
  userId: string;
  displayName: string;
  score: number;
}>> => {
  try {
    const currentMonth = getCurrentMonth();
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('monthlyEngagement.month', '==', currentMonth),
      orderBy('monthlyEngagement.score', 'desc'),
      limit(Math.max(topN * 3, topN))
    );
    const snapshot = await getDocs(q);

    const leaderboard: Array<{ userId: string; displayName: string; score: number }> = [];
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

    return leaderboard.slice(0, topN);
  } catch {
    return [];
  }
};

/**
 * Save user display name to Firestore
 */
export const saveDisplayName = async (userId: string, displayName: string): Promise<void> => {
  try {
    const trimmed = displayName.trim();
    const userRef = doc(db, 'users', userId);
    await Promise.allSettled([
      updateDoc(userRef, { displayName: trimmed }),
      AsyncStorage.setItem('@rooh_display_name', trimmed),
    ]);
    console.log('✅ Display name saved:', trimmed);
  } catch (error) {
    console.error('❌ Failed to save display name:', error);
  }
};

/**
 * Get previous month string YYYY-MM-v2
 */
const getPreviousMonth = (): string => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-v2`;
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
 * Auto-select winners on the 1st of each month.
 * Called on app startup — checks if winners for the previous month
 * have already been selected. If not, queries the leaderboard and
 * picks the top N users automatically.
 */
export const autoSelectMonthlyWinners = async (): Promise<void> => {
  try {
    const config = await refreshRewardsFromFirestore();
    if (!config.enabled) return;

    const previousMonth = getPreviousMonth();

    // Already selected for this month (client or server)?
    if (config.currentMonth === previousMonth) return;

    // Check server-side processedMonth flag (set by GitHub Action or another client)
    if ((config as any).processedMonth === previousMonth) return;

    // Check if we already processed this month locally
    const alreadyProcessed = await AsyncStorage.getItem(`@winners_processed_${previousMonth}`);
    if (alreadyProcessed) return;

    // Query top users from last month (filter by month in Firestore, not client-side)
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('monthlyEngagement.month', '==', previousMonth),
      orderBy('monthlyEngagement.score', 'desc'),
      limit(Math.max(config.winnersCount * 5, 20))
    );
    const snapshot = await getDocs(q);

    const winners: Winner[] = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.rewardDurationDays);

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const engagement = data.monthlyEngagement;
      const displayName = getVisibleDisplayName(data);
      if (winners.length < config.winnersCount && isEligibleForLeaderboard(data) && engagement?.score > 0) {
        winners.push({
          userId: docSnap.id,
          displayName,
          score: engagement.score,
          rewardedAt: new Date().toISOString(),
          notified: false,
          premiumExpiresAt: expiresAt.toISOString(),
        });
      }
    });

    if (winners.length === 0) {
      await AsyncStorage.setItem(`@winners_processed_${previousMonth}`, 'true');
      return;
    }

    // Grant premium to each winner
    for (const winner of winners) {
      try {
        await updateDoc(doc(db, 'users', winner.userId), {
          adminPremium: {
            granted: true,
            grantedBy: 'auto_reward_system',
            grantedAt: new Date().toISOString(),
            plan: 'monthly',
            expiresAt: expiresAt.toISOString(),
            reason: `فائز في مسابقة الشهر ${previousMonth}`,
          },
        });
      } catch (err) {
        console.error('❌ Error granting premium to', winner.userId, err);
      }
    }

    // Notify current user if they are among the winners
    try {
      const currentUserId = await AsyncStorage.getItem('@rooh_user_id');
      if (currentUserId && winners.some(w => w.userId === currentUserId)) {
        await scheduleLocalNotification(
          {
            title: '🏆 مبروك! أنت في لوحة الشرف',
            body: 'حصلت على اشتراك مجاني هذا الشهر مكافأة لك',
            data: {
              type: 'honor_board_winner',
              actionType: 'screen',
              actionUrl: '/honor-board',
            },
          },
          null // immediate trigger
        );
      }
    } catch (notifErr) {
      console.log('⚠️ Winner notification failed:', notifErr);
    }

    // Update rewards config
    const historyEntry = {
      month: previousMonth,
      winners,
      selectedAt: new Date().toISOString(),
      selectedBy: 'auto' as const,
    };

    const updatedConfig: RewardsConfig = {
      ...config,
      currentMonth: previousMonth,
      currentWinners: winners,
      history: [historyEntry, ...config.history.slice(0, 11)],
      processedMonth: previousMonth,
    };

    await setDoc(doc(db, 'config', 'rewards-settings'), updatedConfig, { merge: true });
    cachedConfig = updatedConfig;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedConfig));
    await AsyncStorage.setItem(`@winners_processed_${previousMonth}`, 'true');

    console.log(`🏆 Auto-selected ${winners.length} winners for ${previousMonth}`);
  } catch (error) {
    console.error('❌ Auto-winner selection failed:', error);
  }
};
