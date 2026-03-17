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
const MIN_AD_INTERVAL = 60_000; // 60 seconds between app-open ads

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
  if (!adReady || !adInstance || !adConfig?.enabled || !adConfig.showAdOnAppOpen) {
    return false;
  }

  // Enforce minimum interval
  if (Date.now() - lastAdShownTime < MIN_AD_INTERVAL) return false;

  // Skip for premium users
  try {
    const sub = await getSubscriptionState();
    if (sub.isPremium) return false;
  } catch {}

  try {
    await adInstance.show();
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
