// lib/smart-ad-manager.ts
// مدير الإعلانات الذكي - يُقلل الإزعاج ويحترم سياق المستخدم
// Smart Ad Manager — reduces ad annoyance with context awareness

import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== Storage Keys ====================

const DAILY_AD_COUNT_KEY = '@smart_ads_daily_count';
const DAILY_AD_DATE_KEY = '@smart_ads_daily_date';
const USER_INSTALL_DATE_KEY = '@smart_ads_install_date';
const ENGAGEMENT_SESSIONS_KEY = '@smart_ads_engagement_sessions';

// ==================== Limits ====================

/** Max interstitials per day (hard cap) */
const MAX_INTERSTITIALS_PER_DAY = 4;
/** Max app-open ads per day */
const MAX_APP_OPEN_ADS_PER_DAY = 2;
/** Max banner impressions per session to avoid fatigue */
const MAX_BANNERS_PER_SESSION = 8;
/** Minimum session duration (seconds) before showing first interstitial */
const MIN_SESSION_FOR_INTERSTITIAL = 60;
/** Delay (ms) before banner appears on a screen */
export const BANNER_APPEARANCE_DELAY = 3000;
/** Users in their first 3 days see 50% fewer ads */
const NEW_USER_GRACE_DAYS = 3;
/** Engagement reward: after 30 min of active use, give 10 min ad-free */
const ENGAGEMENT_REWARD_THRESHOLD = 30 * 60 * 1000; // 30 min
const ENGAGEMENT_REWARD_DURATION = 10 * 60 * 1000; // 10 min

// ==================== Sacred Contexts ====================
// Contexts where ads should NEVER be shown

export type SacredContext =
  | 'quran_reading'
  | 'prayer_time'
  | 'tasbih_active'
  | 'azkar_session'
  | 'dua_reading';

// ==================== Session State ====================

let _sessionStart = Date.now();
let _sessionPageViews = 0;
let _sessionInterstitials = 0;
let _sessionAppOpenAds = 0;
let _sessionBanners = 0;
let _activeSacredContexts: Set<SacredContext> = new Set();
let _lastUserInteraction = Date.now();
let _engagementRewardStart: number | null = null;
let _dailyCounts: { interstitials: number; appOpen: number; date: string } | null = null;

// ==================== Core Functions ====================

/**
 * Initialize on app start — loads daily counts and sets install date
 */
export async function initSmartAdManager(): Promise<void> {
  _sessionStart = Date.now();
  _sessionPageViews = 0;
  _sessionInterstitials = 0;
  _sessionAppOpenAds = 0;
  _sessionBanners = 0;

  // Set install date if first time
  try {
    const existing = await AsyncStorage.getItem(USER_INSTALL_DATE_KEY);
    if (!existing) {
      await AsyncStorage.setItem(USER_INSTALL_DATE_KEY, new Date().toISOString());
    }
  } catch {}

  // Load daily counts
  await _loadDailyCounts();
}

/**
 * Record a page view for engagement tracking
 */
export function recordPageView(): void {
  _sessionPageViews++;
  _lastUserInteraction = Date.now();
  _checkEngagementReward();
}

/**
 * Record a user interaction (tap, scroll, etc.)
 */
export function recordInteraction(): void {
  _lastUserInteraction = Date.now();
  _checkEngagementReward();
}

// ==================== Sacred Context Management ====================

/**
 * Enter a sacred context — blocks all ads while active
 */
export function enterSacredContext(context: SacredContext): void {
  _activeSacredContexts.add(context);
}

/**
 * Exit a sacred context
 */
export function exitSacredContext(context: SacredContext): void {
  _activeSacredContexts.delete(context);
}

/**
 * Check if any sacred context is active
 */
export function isInSacredContext(): boolean {
  return _activeSacredContexts.size > 0;
}

// ==================== Ad Permission Checks ====================

/**
 * Can we show a banner ad right now?
 * Note: Banners are non-intrusive, so they are NOT blocked by sacred contexts.
 * Only session cap and engagement reward apply.
 */
export function canShowBanner(): boolean {
  if (_isInEngagementReward()) return false;
  if (_sessionBanners >= MAX_BANNERS_PER_SESSION) return false;
  return true;
}

/**
 * Can we show an interstitial ad right now?
 * Much stricter than banners — these are the most annoying.
 */
export async function canShowInterstitial(): Promise<boolean> {
  if (isInSacredContext()) return false;
  if (_isInEngagementReward()) return false;

  // Session must be old enough
  const sessionAge = (Date.now() - _sessionStart) / 1000;
  if (sessionAge < MIN_SESSION_FOR_INTERSTITIAL) return false;

  // Session cap
  if (_sessionInterstitials >= 2) return false;

  // Daily cap
  const counts = await _getDailyCounts();
  if (counts.interstitials >= MAX_INTERSTITIALS_PER_DAY) return false;

  // New user grace period — reduce by 50%
  if (await _isNewUser()) {
    if (counts.interstitials >= Math.ceil(MAX_INTERSTITIALS_PER_DAY / 2)) return false;
  }

  return true;
}

/**
 * Can we show an app-open ad right now?
 */
export async function canShowAppOpenAd(): Promise<boolean> {
  if (isInSacredContext()) return false;
  if (_isInEngagementReward()) return false;

  // Daily cap
  const counts = await _getDailyCounts();
  if (counts.appOpen >= MAX_APP_OPEN_ADS_PER_DAY) return false;

  // New users: max 1 app-open per day
  if (await _isNewUser()) {
    if (counts.appOpen >= 1) return false;
  }

  return true;
}

// ==================== Recording ====================

/**
 * Record that a banner was shown
 */
export function recordBannerShown(): void {
  _sessionBanners++;
}

/**
 * Record that an interstitial was shown
 */
export async function recordInterstitialShown(): Promise<void> {
  _sessionInterstitials++;
  const counts = await _getDailyCounts();
  counts.interstitials++;
  await _saveDailyCounts(counts);
}

/**
 * Record that an app-open ad was shown
 */
export async function recordAppOpenAdShown(): Promise<void> {
  _sessionAppOpenAds++;
  const counts = await _getDailyCounts();
  counts.appOpen++;
  await _saveDailyCounts(counts);
}

// ==================== Internal Helpers ====================

function _checkEngagementReward(): void {
  const activeTime = Date.now() - _sessionStart;
  if (activeTime >= ENGAGEMENT_REWARD_THRESHOLD && !_engagementRewardStart) {
    _engagementRewardStart = Date.now();
  }
}

function _isInEngagementReward(): boolean {
  if (!_engagementRewardStart) return false;
  return (Date.now() - _engagementRewardStart) < ENGAGEMENT_REWARD_DURATION;
}

async function _isNewUser(): Promise<boolean> {
  try {
    const installDate = await AsyncStorage.getItem(USER_INSTALL_DATE_KEY);
    if (!installDate) return true;
    const daysSinceInstall = (Date.now() - new Date(installDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceInstall < NEW_USER_GRACE_DAYS;
  } catch {
    return false;
  }
}

function _todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

async function _loadDailyCounts(): Promise<void> {
  try {
    const dateStr = await AsyncStorage.getItem(DAILY_AD_DATE_KEY);
    const today = _todayKey();

    if (dateStr === today) {
      const raw = await AsyncStorage.getItem(DAILY_AD_COUNT_KEY);
      if (raw) {
        _dailyCounts = { ...JSON.parse(raw), date: today };
        return;
      }
    }

    // New day — reset counts
    _dailyCounts = { interstitials: 0, appOpen: 0, date: today };
    await AsyncStorage.setItem(DAILY_AD_DATE_KEY, today);
    await AsyncStorage.setItem(DAILY_AD_COUNT_KEY, JSON.stringify(_dailyCounts));
  } catch {
    _dailyCounts = { interstitials: 0, appOpen: 0, date: _todayKey() };
  }
}

async function _getDailyCounts(): Promise<{ interstitials: number; appOpen: number; date: string }> {
  if (!_dailyCounts || _dailyCounts.date !== _todayKey()) {
    await _loadDailyCounts();
  }
  return _dailyCounts!;
}

async function _saveDailyCounts(counts: { interstitials: number; appOpen: number; date: string }): Promise<void> {
  _dailyCounts = counts;
  try {
    await AsyncStorage.setItem(DAILY_AD_COUNT_KEY, JSON.stringify(counts));
    await AsyncStorage.setItem(DAILY_AD_DATE_KEY, counts.date);
  } catch {}
}
