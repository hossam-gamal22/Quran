// components/ads/BannerAd.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useAds } from '@/lib/ads-context';
import { AdScreenKey } from '@/lib/ads-config';

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

  if (!GoogleBannerAd || Platform.OS === 'web') return null;

  // Slot-based rendering (priority)
  if (slotKey) {
    if (!isSlotEnabled(slotKey)) return null;
    const slotUnitId = getSlotUnitId(slotKey);
    if (!slotUnitId) return null;

    return (
      <View style={styles.container}>
        <GoogleBannerAd
          unitId={slotUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={(error: any) => console.log('Banner slot failed:', error)}
        />
      </View>
    );
  }

  // Legacy screen-based rendering
  if (screen && !isBannerVisible(screen)) return null;

  const adUnitId = getBannerAdUnitId();
  if (!adUnitId) return null;

  return (
    <View style={styles.container}>
      <GoogleBannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(error: any) => console.log('Banner failed:', error)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BannerAdComponent;
