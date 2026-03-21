// components/ads/BannerAd.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Animated } from 'react-native';
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

interface BannerAdComponentProps {
  /** Legacy per-screen key */
  screen?: AdScreenKey;
  /** Named ad slot key (takes priority over screen) */
  slotKey?: string;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ screen, slotKey }) => {
  const { isBannerVisible, getBannerAdUnitId, getSlotUnitId, isSlotEnabled } = useAds();
  const [adLoaded, setAdLoaded] = useState(false);
  const [delayPassed, setDelayPassed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  if (!GoogleBannerAd || Platform.OS === 'web') return null;
  if (!delayPassed) return null;

  // Slot-based rendering (priority)
  if (slotKey) {
    if (!isSlotEnabled(slotKey)) return null;
    const slotUnitId = getSlotUnitId(slotKey);
    if (!slotUnitId) return null;

    return (
      <Animated.View style={[styles.container, !adLoaded && styles.hidden, { opacity: fadeAnim }]}>
        <GoogleBannerAd
          unitId={slotUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdLoaded={() => setAdLoaded(true)}
          onAdFailedToLoad={(error: any) => { setAdLoaded(false); console.log('Banner slot failed:', error); }}
        />
      </Animated.View>
    );
  }

  // Legacy screen-based rendering
  if (screen && !isBannerVisible(screen)) return null;

  const adUnitId = getBannerAdUnitId();
  if (!adUnitId) return null;

  return (
    <Animated.View style={[styles.container, !adLoaded && styles.hidden, { opacity: fadeAnim }]}>
      <GoogleBannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error: any) => { setAdLoaded(false); console.log('Banner failed:', error); }}
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
