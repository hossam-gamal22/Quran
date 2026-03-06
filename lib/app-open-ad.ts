// lib/app-open-ad.ts
// App Open Ad — يستخدم إعدادات الإعلانات من Firebase
// ⚠️ قبل النشر: استخدم react-native-google-mobile-ads بدل الوضع التجريبي

import { AppState, AppStateStatus } from 'react-native';
import { fetchAdsConfig, getAdUnitId } from './ads-config';

let adConfig: Awaited<ReturnType<typeof fetchAdsConfig>> | null = null;
let adReady = false;

export const loadAppOpenAd = async (): Promise<void> => {
  try {
    adConfig = await fetchAdsConfig();
    const adId = getAdUnitId('APP_OPEN', adConfig);
    if (adConfig.enabled && adConfig.showAdOnAppOpen && adId) {
      // في الإنتاج: تحميل الإعلان بواسطة react-native-google-mobile-ads
      console.log('📢 App Open Ad: محمّل بـ', adId);
      adReady = true;
    }
  } catch (e) {
    console.log('📢 App Open Ad: خطأ في التحميل', e);
  }
};

export const showAppOpenAd = async (): Promise<boolean> => {
  if (!adReady || !adConfig?.enabled || !adConfig.showAdOnAppOpen) {
    return false;
  }
  // في الإنتاج: عرض الإعلان
  console.log('📢 App Open Ad: جاهز للعرض');
  return false;
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
  };
};

export const isAdReady = (): boolean => {
  return adReady;
};
