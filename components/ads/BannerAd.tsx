// components/ads/BannerAd.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd as GoogleBannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useAds } from '../../lib/ads-context';

interface BannerAdProps {
  screen: 'home' | 'quran' | 'azkar' | 'other';
}

export default function BannerAd({ screen }: BannerAdProps) {
  const { config, showBanner } = useAds();

  // التحقق من إمكانية عرض البانر لهذه الشاشة
  const shouldShow = (): boolean => {
    if (!showBanner || !config) return false;
    
    switch (screen) {
      case 'home':
        return config.showBannerOnHome;
      case 'quran':
        return config.showBannerOnQuran;
      case 'azkar':
        return config.showBannerOnAzkar;
      default:
        return true;
    }
  };

  if (!shouldShow()) return null;

  // استخدام Test ID في التطوير أو الكود الحقيقي من الإعدادات
  const adUnitId = __DEV__ 
    ? TestIds.BANNER 
    : (config?.bannerAdCode || TestIds.BANNER);

  return (
    <View style={styles.container}>
      <GoogleBannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => console.log('Banner loaded')}
        onAdFailedToLoad={(error) => console.log('Banner failed:', error)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
