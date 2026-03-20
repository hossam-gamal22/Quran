// lib/app-open-ad.ts
// App Open Ad — يعرض إعلان عند رجوع المستخدم للتطبيق

import { AppState, AppStateStatus, Platform } from 'react-native';
import { fetchAdsConfig, getAdUnitId } from './ads-config';
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
let lastAdShownTime = 0;
let appOpenCount = 0;
const MIN_AD_INTERVAL = 420_000; // 7 minutes between app-open ads
const MIN_OPENS_BEFORE_AD = 3; // skip first 3 background→active transitions
const SESSION_GRACE_PERIOD = 30_000; // no ads in first 30s after launch
const sessionStartTime = Date.now();

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
      lastAdShownTime = Date.now();
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
  appOpenCount++;

  if (!adReady || !adInstance || !adConfig?.enabled || !adConfig.showAdOnAppOpen) {
    return false;
  }

  // Skip first N background→active transitions
  if (appOpenCount <= MIN_OPENS_BEFORE_AD) return false;

  // Grace period after initial app launch
  if (Date.now() - sessionStartTime < SESSION_GRACE_PERIOD) return false;

  // Enforce minimum interval between ads
  if (Date.now() - lastAdShownTime < MIN_AD_INTERVAL) return false;

  // Global ad cooldown check
  try {
    const { canShowGlobalAd } = require('./ads-config');
    if (!canShowGlobalAd()) return false;
  } catch {}

  // Skip for premium users
  try {
    const sub = await getSubscriptionState();
    if (sub.isPremium) return false;
  } catch {}

  try {
    await adInstance.show();
    // Record in global ad cooldown
    try {
      const { recordGlobalAdShown } = require('./ads-config');
      recordGlobalAdShown();
    } catch {}
    return true;
  } catch {
    return false;
  }
};

export const initializeAppOpenAds = (): (() => void) => {
  loadAppOpenAd();

  let appState = AppState.currentState;
  const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextState === 'active') {
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
