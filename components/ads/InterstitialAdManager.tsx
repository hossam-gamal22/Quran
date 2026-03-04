// components/ads/InterstitialAdManager.tsx
// نسخة تجريبية للاختبار على Expo Go - الإعلانات معطلة
// ⚠️ قبل النشر: استخدم النسخة الأصلية

import { useCallback } from 'react';

interface UseInterstitialAdReturn {
  showAd: () => Promise<boolean>;
  isLoaded: boolean;
}

export const useInterstitialAd = (): UseInterstitialAdReturn => {
  const showAd = useCallback(async (): Promise<boolean> => {
    console.log('📢 Interstitial Ad: معطل للتجربة على Expo Go');
    return false;
  }, []);

  return {
    showAd,
    isLoaded: false,
  };
};

export const loadInterstitial = (): void => {
  console.log('📢 Interstitial Ad: التحميل معطل للتجربة');
};

export const showInterstitial = async (): Promise<boolean> => {
  console.log('📢 Interstitial Ad: العرض معطل للتجربة');
  return false;
};

export default useInterstitialAd;
