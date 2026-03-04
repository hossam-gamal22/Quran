// components/ads/BannerAd.tsx
// نسخة تجريبية للاختبار على Expo Go - الإعلانات معطلة
// ⚠️ قبل النشر: استخدم النسخة الأصلية

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BannerAdComponentProps {
  screen?: 'home' | 'quran' | 'azkar' | 'other';
}

export const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ screen = 'other' }) => {
  // في وضع التجربة، نعرض placeholder بدلاً من الإعلان
  if (__DEV__) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>📢 مكان الإعلان ({screen})</Text>
      </View>
    );
  }
  
  // في الإنتاج، لا نعرض شيء (الإعلانات معطلة)
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
