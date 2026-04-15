// lib/rewards-manager.ts
// نظام المكافآت الشهرية — إدارة النقاط والفائزين

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc, setDoc, increment as firestoreIncrement, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from './firebase-config';
import { scheduleLocalNotification } from './push-notifications';
import type { RewardsConfig, ScoreWeights, ActivityType, MonthlyEngagement, Winner } from '@/types/rewards';

const CACHE_KEY = '@rewards_config_cache';
const PENDING_SCORES_KEY = '@pending_monthly_scores';

export const DEFAULT_WEIGHTS: ScoreWeights = {
  app_open: 1,
  azkar: 2,
  quran: 3,
  prayer: 5,
  tasbih: 1,
  khatma: 5,
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

/**
 * Get current month string YYYY-MM-v2
 * v2 suffix resets all previous engagement data (clean slate from 2026-03-24)
 */
const getCurrentMonth = (): string => {
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
      const parsed = { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
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
      cachedConfig = { ...DEFAULT_CONFIG, ...snap.data() } as RewardsConfig;
    } else {
      cachedConfig = DEFAULT_CONFIG;
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachedConfig));
  } catch {
    cachedConfig = cachedConfig || DEFAULT_CONFIG;
  }
  return cachedConfig;
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
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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
        const engagementData = {
          monthlyEngagement: {
            month: currentMonth,
            score: pending.totalPoints,
            activities: pending.activities,
          },
        };
        if (docExists) {
          await updateDoc(userRef, engagementData);
        } else {
          await setDoc(userRef, engagementData, { merge: true });
        }
        // Only clear local AFTER Firestore write confirmed
        await AsyncStorage.removeItem(PENDING_SCORES_KEY);
      } else {
        // Same month, doc exists — increment
        await updateDoc(userRef, {
          'monthlyEngagement.score': firestoreIncrement(points),
          [`monthlyEngagement.activities.${activityType}`]: firestoreIncrement(multiplier),
        });
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
 * Sync any pending offline scores to Firestore (call on app startup when online)
 */
export const syncPendingScores = async (userId: string): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_SCORES_KEY);
    if (!raw) return;
    const pending = JSON.parse(raw);
    if (!pending.month || pending.totalPoints <= 0) return;

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const docExists = userSnap.exists();
    const data = userSnap.data();
    const engagement: MonthlyEngagement = data?.monthlyEngagement || { month: '', score: 0 };

    if (!docExists || engagement.month !== pending.month) {
      // Doc doesn't exist or different month — set fresh
      const engagementData = {
        monthlyEngagement: {
          month: pending.month,
          score: pending.totalPoints,
          activities: pending.activities,
        },
      };
      if (docExists) {
        await updateDoc(userRef, engagementData);
      } else {
        await setDoc(userRef, engagementData, { merge: true });
      }
    } else {
      // Same month, doc exists — increment each activity
      const updates: Record<string, any> = {
        'monthlyEngagement.score': firestoreIncrement(pending.totalPoints),
      };
      for (const [key, count] of Object.entries(pending.activities)) {
        updates[`monthlyEngagement.activities.${key}`] = firestoreIncrement(count as number);
      }
      await updateDoc(userRef, updates);
    }

    await AsyncStorage.removeItem(PENDING_SCORES_KEY);
    console.log('📤 Pending scores synced to Firestore');
  } catch {
    // Will try again next time
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
 */
export const getUserMonthlyInfo = async (userId: string): Promise<{
  score: number;
  month: string;
  activities?: Record<string, number>;
} | null> => {
  try {
    const config = await fetchRewardsConfig();
    const userSnap = await getDoc(doc(db, 'users', userId));
    const data = userSnap.data();
    const engagement = data?.monthlyEngagement;
    const currentMonth = getCurrentMonth();

    let activities: Record<string, number> = {};

    if (engagement && engagement.month === currentMonth) {
      activities = { ...(engagement.activities || {}) };
    }

    // Merge any local pending scores not yet synced
    try {
      const raw = await AsyncStorage.getItem(PENDING_SCORES_KEY);
      if (raw) {
        const pending = JSON.parse(raw);
        if (pending.month === currentMonth && pending.activities) {
          // Local pending data complements Firestore
          // (don't double-count — just show local if Firestore is behind)
          for (const [key, count] of Object.entries(pending.activities)) {
            const firestoreCount = activities[key] || 0;
            if ((count as number) > firestoreCount) {
              activities[key] = count as number;
            }
          }
        }
      }
    } catch {}

    // Recalculate score from merged activities × weights for consistency
    const weights = config.scoreWeights || DEFAULT_WEIGHTS;
    let score = 0;
    for (const [key, count] of Object.entries(activities)) {
      score += (count as number) * (weights[key as ActivityType] || 1);
    }

    return { score, month: currentMonth, activities };
  } catch {
    // Fallback to local-only if Firestore fails
    try {
      const config = await fetchRewardsConfig();
      const weights = config.scoreWeights || DEFAULT_WEIGHTS;
      const raw = await AsyncStorage.getItem(PENDING_SCORES_KEY);
      if (raw) {
        const pending = JSON.parse(raw);
        const currentMonth = getCurrentMonth();
        if (pending.month === currentMonth) {
          const activities = pending.activities || {};
          let score = 0;
          for (const [key, count] of Object.entries(activities)) {
            score += (count as number) * (weights[key as ActivityType] || 1);
          }
          return {
            score,
            month: currentMonth,
            activities,
          };
        }
      }
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
    const q = query(usersRef, orderBy('monthlyEngagement.score', 'desc'), limit(topN));
    const snapshot = await getDocs(q);

    const leaderboard: Array<{ userId: string; displayName: string; score: number }> = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const engagement = data.monthlyEngagement;
      // Skip hidden/placeholder users (admin can hide users from leaderboard)
      if (data.hiddenFromLeaderboard || data.placeholder) return;
      // Only include users with a display name and current month data
      if (engagement && engagement.month === currentMonth && engagement.score > 0 && data.displayName) {
        leaderboard.push({
          userId: docSnap.id,
          displayName: data.displayName,
          score: engagement.score,
        });
      }
    });

    return leaderboard;
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

    // Already selected for this month?
    if (config.currentMonth === previousMonth) return;

    // Check if we already processed this month
    const alreadyProcessed = await AsyncStorage.getItem(`@winners_processed_${previousMonth}`);
    if (alreadyProcessed) return;

    // Query top users from last month (filter by month in Firestore, not client-side)
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('monthlyEngagement.month', '==', previousMonth),
      orderBy('monthlyEngagement.score', 'desc'),
      limit(config.winnersCount)
    );
    const snapshot = await getDocs(q);

    const winners: Winner[] = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.rewardDurationDays);

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const engagement = data.monthlyEngagement;
      if (engagement && engagement.score > 0) {
        winners.push({
          userId: docSnap.id,
          displayName: data.displayName || docSnap.id.slice(0, 8),
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
      const currentUserId = await AsyncStorage.getItem('@user_id');
      if (currentUserId && winners.some(w => w.userId === currentUserId)) {
        await scheduleLocalNotification(
          {
            title: '🏆 مبروك! أنت في لوحة الشرف',
            body: 'حصلت على اشتراك مجاني هذا الشهر مكافأة لك',
            data: { type: 'honor_board_winner' },
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
    };

    await setDoc(doc(db, 'config', 'rewards-settings'), updatedConfig);
    cachedConfig = updatedConfig;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedConfig));
    await AsyncStorage.setItem(`@winners_processed_${previousMonth}`, 'true');

    console.log(`🏆 Auto-selected ${winners.length} winners for ${previousMonth}`);
  } catch (error) {
    console.error('❌ Auto-winner selection failed:', error);
  }
};
