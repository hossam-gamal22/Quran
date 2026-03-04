// components/ads/InterstitialAdManager.tsx
import { useEffect, useRef, useCallback } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { useAds } from '../../lib/ads-context';

export function useInterstitialAd() {
  const { config, canShowInterstitial, recordInterstitialShown } = useAds();
  const interstitialRef = useRef<InterstitialAd | null>(null);
  const isLoadedRef = useRef(false);

  // تحميل الإعلان
  const loadAd = useCallback(() => {
    if (!config?.enabled) return;

    const adUnitId = __DEV__ 
      ? TestIds.INTERSTITIAL 
      : (config?.interstitialAdCode || TestIds.INTERSTITIAL);

    const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      isLoadedRef.current = true;
      console.log('Interstitial loaded');
    });

    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      isLoadedRef.current = false;
      // إعادة تحميل إعلان جديد بعد الإغلاق
      loadAd();
    });

    interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('Interstitial error:', error);
      isLoadedRef.current = false;
    });

    interstitial.load();
    interstitialRef.current = interstitial;
  }, [config]);

  // عرض الإعلان
  const showAd = useCallback(async (): Promise<boolean> => {
    if (!canShowInterstitial()) {
      console.log('Cannot show interstitial now');
      return false;
    }

    if (!isLoadedRef.current || !interstitialRef.current) {
      console.log('Interstitial not loaded');
      return false;
    }

    try {
      await interstitialRef.current.show();
      recordInterstitialShown();
      return true;
    } catch (error) {
      console.log('Error showing interstitial:', error);
      return false;
    }
  }, [canShowInterstitial, recordInterstitialShown]);

  // تحميل عند البداية
  useEffect(() => {
    loadAd();

    return () => {
      interstitialRef.current?.removeAllListeners();
    };
  }, [loadAd]);

  return { showAd, isLoaded: isLoadedRef.current };
}
