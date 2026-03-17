// components/ads/DynamicScreenAds.tsx
// Renders all admin-configured ad slots for a given screen + position.
// Zero space when no slots are enabled.

import React from 'react';
import { View } from 'react-native';
import { useAds } from '@/lib/ads-context';
import { BannerAdComponent } from './BannerAd';

interface DynamicScreenAdsProps {
  screen: string;
  position: 'top' | 'bottom';
}

export const DynamicScreenAds: React.FC<DynamicScreenAdsProps> = ({ screen, position }) => {
  const { getScreenSlots } = useAds();
  const slots = getScreenSlots(screen, position);

  if (slots.length === 0) return null;

  return (
    <View>
      {slots.map(({ key }) => (
        <BannerAdComponent key={key} slotKey={key} />
      ))}
    </View>
  );
};
