// lib/app-open-ad.ts
// App Open Ad — يعرض إعلان عند رجوع المستخدم للتطبيق

import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAdsConfig, getAdUnitId, canShowGlobalAd, recordGlobalAdShown } from './ads-config';
import { getSubscriptionState } from './subscription-manager';

// Dynamically import google-mobile-ads
let AppOpenAdClass: any = null;
let AdEventType: any = null;
try {
  const { TurboModuleRegistry } = require('react-native');
  TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsModule');
  const ads = require('react-native-google-mobile-ads');
  AppOpenAdClass = ads.AppOpenAd;
  AdEventType = ads.AdEventType;
} catch {
  // Not available in Expo Go / web
}

let adConfig: Awaited<ReturnType<typeof fetchAdsConfig>> | null = null;
let adInstance: any = null;
let adReady = false;
let appOpenCount = 0;
/** Ignore brief inactive flickers (<10s) — not a real backgrounding. */
const MIN_BACKGROUND_DURATION = 10_000;
/** Skip ad if previous foreground session was shorter than this (user just bounced). */
const MIN_PREV_SESSION_DURATION = 30_000;
/** AsyncStorage key tracking the date of the first foreground transition each day. */
const FIRST_OPEN_DATE_KEY = '@app_open_ad_first_open_date';
let lastBackgroundTime = 0;
let lastActiveStart = 0;
let lastActiveDuration = Infinity;

export const loadAppOpenAd = async (): Promise<void> => {
  if (!AppOpenAdClass || Platform.OS === 'web') return;

  try {
    adConfig = await fetchAdsConfig();
    if (!adConfig.enabled || !adConfig.showAdOnAppOpen) return;

    const adId = getAdUnitId('APP_OPEN', adConfig);
    if (!adId) return;

    adInstance = AppOpenAdClass.createForAdRequest(adId, {
      requestNonPersonalizedAdsOnly: true,
    });

    adInstance.addAdEventListener(AdEventType.LOADED, () => {
      adReady = true;
    });

    adInstance.addAdEventListener(AdEventType.CLOSED, () => {
      adReady = false;
      // Reload for next time
      adInstance.load();
    });

    adInstance.addAdEventListener(AdEventType.ERROR, () => {
      adReady = false;
    });

    adInstance.load();
  } catch (e) {
    console.log('App Open Ad load error:', e);
  }
};

export const showAppOpenAd = async (): Promise<boolean> => {
  if (!adReady || !adInstance || !adConfig?.enabled || !adConfig.showAdOnAppOpen) {
    return false;
  }

  // Frequency cap: show once every N app opens (configured from admin panel).
  // iOS match rate is currently very low; double the interval on iOS to reduce
  // wasted requests until mediation is in place.
  const baseEveryN = Math.max(1, adConfig.appOpenFrequency ?? 3);
  const everyN = Platform.OS === 'ios' ? baseEveryN * 2 : baseEveryN;
  if (appOpenCount === 0 || appOpenCount % everyN !== 0) return false;

  // Global cooldown: at least 2 minutes between ANY two ads (interstitial / app-open / etc.).
  // Prevents the "close interstitial → background → return → app-open ad" double-ad pattern.
  if (!canShowGlobalAd()) return false;

  // Ignore brief inactive flickers (phone call, notification shade, etc.).
  if (lastBackgroundTime > 0 && (Date.now() - lastBackgroundTime) < MIN_BACKGROUND_DURATION) {
    return false;
  }

  // Skip if the previous foreground session was very short (user opened the app,
  // didn't do anything, then left). Showing an ad when they return is intrusive.
  if (lastActiveDuration < MIN_PREV_SESSION_DURATION) {
    return false;
  }

  // Skip the first foreground transition of the day — keep the morning open clean,
  // which historically improves day-1 retention.
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const storedDate = await AsyncStorage.getItem(FIRST_OPEN_DATE_KEY);
    if (storedDate !== today) {
      await AsyncStorage.setItem(FIRST_OPEN_DATE_KEY, today);
      return false;
    }
  } catch {}

  // Skip during onboarding
  try {
    const onboardingFlag = await AsyncStorage.getItem('onboarding_complete');
    if (onboardingFlag !== 'true') return false;
  } catch {}

  // Skip if user is inside a sacred context (reading Quran, praying, etc.).
  try {
    const { isInSacredContext } = require('./smart-ad-manager');
    if (isInSacredContext()) return false;
  } catch {}

  // Skip for premium users.
  try {
    const sub = await getSubscriptionState();
    if (sub.isPremium) return false;
  } catch {}

  try {
    await adInstance.show();
    try {
      recordGlobalAdShown();
    } catch {}
    try {
      const { recordAppOpenAdShown } = require('./smart-ad-manager');
      await recordAppOpenAdShown();
    } catch {}
    return true;
  } catch {
    return false;
  }
};

export const initializeAppOpenAds = (): (() => void) => {
  loadAppOpenAd();

  let appState = AppState.currentState;
  if (appState === 'active') lastActiveStart = Date.now();

  const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    // Only record background time when leaving FROM active state
    // (prevents overwriting during return transitions like background → inactive → active on iOS)
    if (appState === 'active' && (nextState === 'background' || nextState === 'inactive')) {
      lastBackgroundTime = Date.now();
      // Capture how long the user was actively engaged before leaving.
      if (lastActiveStart > 0) {
        lastActiveDuration = Date.now() - lastActiveStart;
      }
    }
    // Only trigger ad on genuine background → active transitions
    // (not brief inactive → active from notification shade, phone calls, etc.)
    if (appState === 'background' && nextState === 'active') {
      appOpenCount++;
      lastActiveStart = Date.now();
      showAppOpenAd();
    }
    appState = nextState;
  });

  return () => {
    subscription.remove();
    adInstance?.removeAllListeners?.();
  };
};

export const isAdReady = (): boolean => {
  return adReady;
};
