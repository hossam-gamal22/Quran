// lib/rewards-manager.ts
// نظام المكافآت الشهرية — إدارة النقاط والفائزين

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, updateDoc, increment as firestoreIncrement} from 'firebase/firestore';
import { db } from './firebase-config';
import type { RewardsConfig, ScoreWeights, ActivityType, MonthlyEngagement } from '@/types/rewards';

const CACHE_KEY = '@rewards_config_cache';

const DEFAULT_WEIGHTS: ScoreWeights = {
  app_open: 1,
  azkar: 2,
  quran: 3,
  prayer: 5,
  tasbih: 1,
  khatma: 5,
};

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
 * Get current month string YYYY-MM
 */
const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Fetch rewards config with 3-tier cache
 */
export const fetchRewardsConfig = async (): Promise<RewardsConfig> => {
  if (cachedConfig) return cachedConfig;

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      cachedConfig = { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
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
 * Update monthly engagement score for a user
 */
export const updateMonthlyScore = async (
  userId: string,
  activityType: ActivityType,
  multiplier: number = 1
): Promise<void> => {
  try {
    const config = await fetchRewardsConfig();
    if (!config.enabled) return;

    const points = (config.scoreWeights[activityType] || 1) * multiplier;
    const currentMonth = getCurrentMonth();
    const userRef = doc(db, 'users', userId);

    // Read current engagement
    const userSnap = await getDoc(userRef);
    const data = userSnap.data();
    const engagement: MonthlyEngagement = data?.monthlyEngagement || { month: '', score: 0 };

    if (engagement.month !== currentMonth) {
      // New month — reset
      await updateDoc(userRef, {
        'monthlyEngagement.month': currentMonth,
        'monthlyEngagement.score': points,
      });
    } else {
      // Same month — increment
      await updateDoc(userRef, {
        'monthlyEngagement.score': firestoreIncrement(points),
      });
    }
  } catch {
    // Non-critical — don't block the app
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
 * Get user's monthly rank info
 */
export const getUserMonthlyInfo = async (userId: string): Promise<{
  score: number;
  month: string;
} | null> => {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    const data = userSnap.data();
    if (!data?.monthlyEngagement) return null;
    return {
      score: data.monthlyEngagement.score || 0,
      month: data.monthlyEngagement.month || '',
    };
  } catch {
    return null;
  }
};
