// components/ads/InterstitialAdManager.tsx
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAds } from '@/lib/ads-context';

// Dynamically import google-mobile-ads
let InterstitialAdClass: any = null;
let AdEventType: any = null;
try {
  const { TurboModuleRegistry } = require('react-native');
  TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsModule');
  const ads = require('react-native-google-mobile-ads');
  InterstitialAdClass = ads.InterstitialAd;
  AdEventType = ads.AdEventType;
} catch {
  // Not available in Expo Go / web
}

interface UseInterstitialAdReturn {
  showAd: () => Promise<boolean>;
  isLoaded: boolean;
}

export const useInterstitialAd = (): UseInterstitialAdReturn => {
  const { getInterstitialAdUnitId, canShowInterstitial, recordInterstitialShown } = useAds();
  const interstitialRef = useRef<any>(null);
  const isLoadedRef = useRef(false);

  const loadAd = useCallback(() => {
    if (!InterstitialAdClass || Platform.OS === 'web') return;

    const adUnitId = getInterstitialAdUnitId();
    if (!adUnitId) return;

    const interstitial = InterstitialAdClass.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      isLoadedRef.current = true;
    });

    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      isLoadedRef.current = false;
      loadAd();
    });

    interstitial.addAdEventListener(AdEventType.ERROR, () => {
      isLoadedRef.current = false;
    });

    interstitial.load();
    interstitialRef.current = interstitial;
  }, [getInterstitialAdUnitId]);

  const showAd = useCallback(async (): Promise<boolean> => {
    if (!canShowInterstitial() || !isLoadedRef.current || !interstitialRef.current) {
      return false;
    }

    try {
      await interstitialRef.current.show();
      recordInterstitialShown();
      return true;
    } catch {
      return false;
    }
  }, [canShowInterstitial, recordInterstitialShown]);

  useEffect(() => {
    loadAd();
    return () => {
      interstitialRef.current?.removeAllListeners?.();
    };
  }, [loadAd]);

  return { showAd, isLoaded: isLoadedRef.current };
};

// Standalone function for non-hook usage (e.g., PDF export)
export const showInterstitial = async (): Promise<boolean> => {
  if (!InterstitialAdClass || Platform.OS === 'web') return false;

  try {
    const { fetchAdsConfig, getAdUnitId } = require('@/lib/ads-config');
    const { getSubscriptionState } = require('@/lib/subscription-manager');

    const [config, sub] = await Promise.all([fetchAdsConfig(), getSubscriptionState()]);
    if (!config.enabled || sub.isPremium) return false;

    const adUnitId = getAdUnitId('INTERSTITIAL', config);
    if (!adUnitId) return false;

    return new Promise<boolean>((resolve) => {
      const ad = InterstitialAdClass.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      const timeout = setTimeout(() => resolve(false), 10000);

      ad.addAdEventListener(AdEventType.LOADED, () => {
        ad.show().then(() => {
          clearTimeout(timeout);
          resolve(true);
        }).catch(() => {
          clearTimeout(timeout);
          resolve(false);
        });
      });

      ad.addAdEventListener(AdEventType.ERROR, () => {
        clearTimeout(timeout);
        resolve(false);
      });

      ad.addAdEventListener(AdEventType.CLOSED, () => {
        clearTimeout(timeout);
        resolve(true);
      });

      ad.load();
    });
  } catch {
    return false;
  }
};

export const loadInterstitial = (): void => {};

export default useInterstitialAd;
