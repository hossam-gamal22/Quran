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

interface ShowInterstitialOptions {
  ignoreSmartFrequencyCaps?: boolean;
  ignoreSmartSessionDelay?: boolean;
  ignoreGlobalCooldown?: boolean;
  allowInSacredContext?: boolean;
  force?: boolean;
  onShown?: () => void | Promise<void>;
  timeoutMs?: number;
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

    // Smart ad manager async checks (daily caps, new user grace, engagement reward)
    try {
      const { canShowInterstitial: smartCheck } = require('@/lib/smart-ad-manager');
      if (!(await smartCheck())) return false;
    } catch {}

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
export const showInterstitial = async (options: ShowInterstitialOptions = {}): Promise<boolean> => {
  if (!InterstitialAdClass || Platform.OS === 'web') return false;

  try {
    const timeoutMs = Math.max(0, options.timeoutMs ?? 10000);
    const startedAt = Date.now();
    const remainingTimeout = () => Math.max(0, timeoutMs - (Date.now() - startedAt));
    const hasTimedOut = () => remainingTimeout() <= 0;
    const { fetchAdsConfig, getAdUnitId, canShowGlobalAd, recordGlobalAdShown } = require('@/lib/ads-config');
    const { getSubscriptionState, isPremiumActiveSync } = require('@/lib/subscription-manager');

    // Honor admin/winner (leaderboard top-3) grants that may not yet be
    // mirrored into the persisted subscription snapshot.
    if (isPremiumActiveSync()) return false;
    const [config, sub] = await Promise.all([fetchAdsConfig(), getSubscriptionState()]);
    if (hasTimedOut()) return false;
    if (!config.enabled || config.showInterstitials === false || sub.isPremium) return false;

    // Global cooldown: enforce ≥2 minutes between any two ads (shared with App Open / hook interstitials).
    if (!options.force && !options.ignoreGlobalCooldown && !canShowGlobalAd()) return false;

    // Smart ad manager checks
    if (!options.force) {
      try {
        const { canShowInterstitial: smartCheck, isInSacredContext } = require('@/lib/smart-ad-manager');
        if (!options.allowInSacredContext && isInSacredContext()) return false;
        if (!(await smartCheck({
          ignoreFrequencyCaps: options.ignoreSmartFrequencyCaps,
          ignoreSessionDelay: options.ignoreSmartSessionDelay,
          allowInSacredContext: options.allowInSacredContext,
        }))) return false;
        if (hasTimedOut()) return false;
      } catch {}
    }

    const adUnitId = getAdUnitId('INTERSTITIAL', config);
    if (!adUnitId) return false;
    if (hasTimedOut()) return false;

    return new Promise<boolean>((resolve) => {
      const ad = InterstitialAdClass.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      let didResolve = false;
      let didRecordShown = false;

      const resolveOnce = (value: boolean) => {
        if (didResolve) return;
        didResolve = true;
        clearTimeout(timeout);
        resolve(value);
      };

      const recordShownOnce = async () => {
        if (didRecordShown) return;
        didRecordShown = true;
        try { recordGlobalAdShown(); } catch {}
        try { await options.onShown?.(); } catch {}
      };

      const timeout = setTimeout(() => resolveOnce(false), remainingTimeout());

      ad.addAdEventListener(AdEventType.LOADED, () => {
        if (didResolve) return;
        ad.show().then(async () => {
          await recordShownOnce();
          resolveOnce(true);
        }).catch(() => {
          resolveOnce(false);
        });
      });

      ad.addAdEventListener(AdEventType.ERROR, () => {
        resolveOnce(false);
      });

      ad.addAdEventListener(AdEventType.CLOSED, () => {
        recordShownOnce().finally(() => resolveOnce(true));
      });

      ad.load();
    });
  } catch {
    return false;
  }
};

export const loadInterstitial = (): void => {};

export default useInterstitialAd;
