import React, { useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { TranslatedText } from '@/components/ui/TranslatedText';

const basmalaImage = require('@/assets/images/quran/basmala.png');

interface BasmalaHeaderProps {
  style?: object;
  tintColor?: string;
}

export const BasmalaHeader: React.FC<BasmalaHeaderProps> = ({ style, tintColor }) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <View style={[styles.container, style]}>
        <TranslatedText from="ar" type="quran" style={[styles.fallbackText, { color: tintColor ?? '#C9A84C' }]}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </TranslatedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={basmalaImage}
        style={[styles.image, tintColor ? { tintColor } : undefined]}
        resizeMode="contain"
        onError={() => setImageError(true)}
      />
    </View>
  );
};

const _styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  image: {
    width: '75%',
    height: 40,
  },
  fallbackText: {
    fontFamily: 'KFGQPCHafsEx1',
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 44,
  },
});

export default BasmalaHeader;
