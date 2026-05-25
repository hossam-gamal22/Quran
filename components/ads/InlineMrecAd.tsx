// components/ads/InlineMrecAd.tsx
// Inline Medium Rectangle (300×250) ad — for injection between list items.
// Higher eCPM than standard banners (~3-4×) without requiring native-ad bridge work.

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useAds } from '@/lib/ads-context';
import { isInSacredContext } from '@/lib/smart-ad-manager';
import { uiText } from '@/lib/ui-text';

let GoogleBannerAd: any = null;
let BannerAdSize: any = null;
try {
  const { TurboModuleRegistry } = require('react-native');
  TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsModule');
  const ads = require('react-native-google-mobile-ads');
  GoogleBannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
} catch {
  // Not available in Expo Go / web
}

interface InlineMrecAdProps {
  /** Per-screen key used to skip if banner disabled in admin config */
  screen?: string;
  /** Optional dark-mode flag for badge contrast */
  darkMode?: boolean;
}

export const InlineMrecAd: React.FC<InlineMrecAdProps> = ({ screen, darkMode = false }) => {
  const { isPremiumUser, getBannerAdUnitId, isBannerVisible, config } = useAds();
  const [adLoaded, setAdLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleAdFailedToLoad = useCallback(() => {
    setFailed(true);
    setAdLoaded(false);
  }, []);

  if (!GoogleBannerAd || Platform.OS === 'web') return null;
  if (isPremiumUser) return null;
  if (!config?.enabled || config?.showBanners === false) return null;
  // Respect sacred contexts (quran reading, dua reading, tasbih active)
  if (isInSacredContext()) return null;
  // Respect per-screen banner toggle
  if (screen && !isBannerVisible(screen as any)) return null;
  // Hide entirely if load failed (don't show empty placeholder)
  if (failed) return null;

  const adUnitId = getBannerAdUnitId();
  if (!adUnitId) return null;

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)',
            borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{uiText({ ar: 'إعلان', en: 'Ad' })}</Text>
        </View>
        <View style={[styles.adFrame, !adLoaded && styles.hidden]}>
          <GoogleBannerAd
            unitId={adUnitId}
            size={BannerAdSize.MEDIUM_RECTANGLE}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            onAdLoaded={() => setAdLoaded(true)}
            onAdFailedToLoad={handleAdFailedToLoad}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  card: {
    width: 320,
    borderRadius: 16,
    borderWidth: 0.5,
    paddingTop: 26,
    paddingBottom: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  adFrame: {
    width: 300,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
});

export default InlineMrecAd;
