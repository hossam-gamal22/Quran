// components/ads/BannerAd.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAds } from '@/lib/ads-context';
import { AdScreenKey } from '@/lib/ads-config';

interface BannerAdComponentProps {
  screen: AdScreenKey;
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ screen }) => {
  const { isBannerVisible } = useAds();

  if (!isBannerVisible(screen)) return null;

  // في وضع التجربة، نعرض placeholder بدلاً من الإعلان
  if (__DEV__) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>📢 مكان الإعلان ({screen})</Text>
      </View>
    );
  }

  // في الإنتاج، لا نعرض شيء حتى يتم تفعيل react-native-google-mobile-ads
  return null;
};

const styles = StyleSheet.create({
  placeholder: {
    height: 50,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#666',
    fontSize: 12,
  },
});

export default BannerAdComponent;
