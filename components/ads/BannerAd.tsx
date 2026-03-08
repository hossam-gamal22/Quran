// components/ads/BannerAd.tsx
import React from 'react';
import { useAds } from '@/lib/ads-context';
import { AdScreenKey } from '@/lib/ads-config';

interface BannerAdComponentProps {
  screen: AdScreenKey;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ screen }) => {
  const { isBannerVisible } = useAds();

  if (!isBannerVisible(screen)) return null;

  // لا نعرض شيء حتى يتم تفعيل react-native-google-mobile-ads
  return null;
};

export default BannerAdComponent;
