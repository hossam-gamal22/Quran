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
let appOpenCount = 0;
/** Ignore brief inactive flickers (<10s) — not a real backgrounding. */
const MIN_BACKGROUND_DURATION = 10_000;
let lastBackgroundTime = 0;

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
  const everyN = Math.max(1, adConfig.appOpenFrequency ?? 3);
  if (appOpenCount === 0 || appOpenCount % everyN !== 0) return false;

  // Ignore brief inactive flickers (phone call, notification shade, etc.).
  if (lastBackgroundTime > 0 && (Date.now() - lastBackgroundTime) < MIN_BACKGROUND_DURATION) {
    return false;
  }

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
      const { recordGlobalAdShown } = require('./ads-config');
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
  const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    // Only record background time when leaving FROM active state
    // (prevents overwriting during return transitions like background → inactive → active on iOS)
    if (appState === 'active' && (nextState === 'background' || nextState === 'inactive')) {
      lastBackgroundTime = Date.now();
    }
    // Only trigger ad on genuine background → active transitions
    // (not brief inactive → active from notification shade, phone calls, etc.)
    if (appState === 'background' && nextState === 'active') {
      appOpenCount++;
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
