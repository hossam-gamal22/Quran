// lib/app-open-ad.ts
// إعلان فتح التطبيق - روح المسلم

import { AppOpenAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform, AppState, AppStateStatus } from 'react-native';

// ==================== Ad Unit IDs ====================

const AD_UNIT_IDS = {
  android: 'ca-app-pub-6103597967254377/5798712736',
  ios: 'ca-app-pub-6103597967254377/3930767722',
};

const USE_TEST_ADS = __DEV__;

const getAdUnitId = (): string => {
  if (USE_TEST_ADS) {
    return TestIds.APP_OPEN;
  }
  return Platform.OS === 'ios' ? AD_UNIT_IDS.ios : AD_UNIT_IDS.android;
};

// ==================== المتغيرات ====================

let appOpenAd: AppOpenAd | null = null;
let isShowingAd = false;
let lastAdShownTime = 0;
const MIN_TIME_BETWEEN_ADS = 60 * 1000;

// ==================== الدوال ====================

export const loadAppOpenAd = (): void => {
  try {
    appOpenAd = AppOpenAd.createForAdRequest(getAdUnitId(), {
      keywords: ['islamic', 'quran', 'prayer', 'muslim'],
    });

    appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('✅ App Open Ad loaded');
    });

    appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('❌ App Open Ad error:', error);
      appOpenAd = null;
    });

    appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('📱 App Open Ad closed');
      isShowingAd = false;
      lastAdShownTime = Date.now();
      loadAppOpenAd();
    });

    appOpenAd.addAdEventListener(AdEventType.OPENED, () => {
      console.log('📱 App Open Ad opened');
      isShowingAd = true;
    });

    appOpenAd.load();
  } catch (error) {
    console.log('Error creating app open ad:', error);
  }
};

export const showAppOpenAd = async (): Promise<boolean> => {
  const timeSinceLastAd = Date.now() - lastAdShownTime;
  if (timeSinceLastAd < MIN_TIME_BETWEEN_ADS) {
    console.log('⏳ Too soon to show another ad');
    return false;
  }

  if (isShowingAd) {
    console.log('⚠️ Ad is already showing');
    return false;
  }

  if (!appOpenAd) {
    console.log('⚠️ No ad loaded');
    loadAppOpenAd();
    return false;
  }

  try {
    await appOpenAd.show();
    return true;
  } catch (error) {
    console.log('Error showing app open ad:', error);
    loadAppOpenAd();
    return false;
  }
};

export const initializeAppOpenAds = (): (() => void) => {
  loadAppOpenAd();

  let appState = AppState.currentState;

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      showAppOpenAd();
    }
    appState = nextAppState;
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => {
    subscription.remove();
  };
};

export const isAdReady = (): boolean => {
  return appOpenAd !== null && !isShowingAd;
};