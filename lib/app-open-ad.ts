// lib/app-open-ad.ts
// نسخة تجريبية للاختبار على Expo Go - الإعلانات معطلة
// ⚠️ قبل النشر: استخدم النسخة الأصلية من app-open-ad.ts.backup

import { AppState, AppStateStatus } from 'react-native';

// معرفات الإعلانات (للاستخدام لاحقاً)
const AD_UNIT_IDS = {
  android: 'ca-app-pub-6103597967254377/5798712736',
  ios: 'ca-app-pub-6103597967254377/3930767722',
};

export const loadAppOpenAd = (): void => {
  console.log('📢 App Open Ads: معطلة للتجربة على Expo Go');
};

export const showAppOpenAd = async (): Promise<boolean> => {
  console.log('📢 App Open Ads: معطلة للتجربة على Expo Go');
  return false;
};

export const initializeAppOpenAds = (): (() => void) => {
  console.log('📢 App Open Ads: تم تهيئة الوضع التجريبي');
  return () => {
    console.log('📢 App Open Ads: تم إيقاف الوضع التجريبي');
  };
};

export const isAdReady = (): boolean => {
  return false;
};
