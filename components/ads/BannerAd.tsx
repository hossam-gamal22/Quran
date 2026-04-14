// components/ads/BannerAd.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAds } from '@/lib/ads-context';
import { AdScreenKey } from '@/lib/ads-config';
import { BANNER_APPEARANCE_DELAY, recordBannerShown } from '@/lib/smart-ad-manager';

// Dynamically import google-mobile-ads (fails gracefully in Expo Go)
let GoogleBannerAd: any = null;
let BannerAdSize: any = null;
try {
  // Check native module availability first (TurboModules throw lazily)
  const { TurboModuleRegistry } = require('react-native');
  TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsModule');
  const ads = require('react-native-google-mobile-ads');
  GoogleBannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
} catch {
  // Not available in Expo Go / web
}

// Approximate tab bar heights so banners in tab screens don't sit behind the
// native/custom tab bar. iOS UITabBar ≈ 49pt, Android custom glass tab bar ≈ 56pt.
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

interface BannerAdComponentProps {
  /** Legacy per-screen key */
  screen?: AdScreenKey;
  /** Named ad slot key (takes priority over screen) */
  slotKey?: string;
  /** Pass true when rendered inside a (tabs) screen so the banner lifts above the tab bar */
  inTabScreen?: boolean;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ screen, slotKey, inTabScreen }) => {
  const { isBannerVisible, getBannerAdUnitId, getSlotUnitId, isSlotEnabled } = useAds();
  const insets = useSafeAreaInsets();
  const bottomOffset = insets.bottom + (inTabScreen ? TAB_BAR_HEIGHT : 0);
  const [adLoaded, setAdLoaded] = useState(false);
  const [delayPassed, setDelayPassed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 10_000; // 10 seconds between retries

  // Delay banner appearance to prevent layout shifts and reduce initial annoyance
  useEffect(() => {
    const timer = setTimeout(() => setDelayPassed(true), BANNER_APPEARANCE_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // Gentle fade-in when ad loads
  useEffect(() => {
    if (adLoaded && delayPassed) {
      recordBannerShown();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [adLoaded, delayPassed, fadeAnim]);

  // Retry logic for failed banner loads
  const handleAdFailedToLoad = useCallback((error: any, label: string) => {
    setAdLoaded(false);
    console.log(`${label} failed:`, error);
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setRetryKey(prev => prev + 1);
      }, RETRY_DELAY);
    }
  }, [retryCount]);

  if (!GoogleBannerAd || Platform.OS === 'web') return null;
  if (!delayPassed) return null;

  // Slot-based rendering (priority)
  if (slotKey) {
    if (!isSlotEnabled(slotKey)) return null;
    const slotUnitId = getSlotUnitId(slotKey);
    if (!slotUnitId) return null;

    return (
      <Animated.View style={[styles.container, !adLoaded && styles.hidden, { opacity: fadeAnim, paddingBottom: bottomOffset }]}>
        <GoogleBannerAd
          key={`slot-${slotKey}-${retryKey}`}
          unitId={slotUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdLoaded={() => setAdLoaded(true)}
          onAdFailedToLoad={(error: any) => handleAdFailedToLoad(error, 'Banner slot')}
        />
      </Animated.View>
    );
  }

  // Legacy screen-based rendering
  if (screen && !isBannerVisible(screen)) return null;

  const adUnitId = getBannerAdUnitId();
  if (!adUnitId) return null;

  return (
    <Animated.View style={[styles.container, !adLoaded && styles.hidden, { opacity: fadeAnim, paddingBottom: bottomOffset }]}>
      <GoogleBannerAd
        key={`screen-${screen}-${retryKey}`}
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error: any) => handleAdFailedToLoad(error, 'Banner')}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: {
    height: 0,
    overflow: 'hidden',
    margin: 0,
    padding: 0,
  },
});

export default BannerAdComponent;
