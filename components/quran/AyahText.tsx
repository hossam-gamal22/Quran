// components/quran/AyahText.tsx
import React from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { Typography, Spacing } from '@/constants/theme';

interface AyahTextProps {
  ayahs: Array<{
    numberInSurah: number;
    text: string;
  }>;
  fontSize?: number;
  showNumbers?: boolean;
  onAyahPress?: (ayahNumber: number) => void;
  highlightedAyah?: number;
}

// Force Western numerals for verse numbers
function toArabicNumber(num: number): string {
  return String(num);
}

export function AyahText({
  ayahs,
  fontSize = 24,
  showNumbers = true,
  onAyahPress,
  highlightedAyah,
}: AyahTextProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.text,
          {
            fontSize,
            lineHeight: fontSize * 2.2,
            color: colors.text,
          },
        ]}
      >
        {ayahs.map((ayah, index) => (
          <React.Fragment key={ayah.numberInSurah}>
            <Text
              onPress={() => onAyahPress?.(ayah.numberInSurah)}
              style={[
                highlightedAyah === ayah.numberInSurah && {
                  backgroundColor: colors.primary + '30',
                  borderRadius: Math.ceil(fontSize * 0.25),
                  paddingHorizontal: Math.max(6, Math.round(fontSize * 0.28)),
                  paddingVertical: Math.max(2, Math.round(fontSize * 0.12)),
                },
              ]}
            >
              {ayah.text}
            </Text>
            {showNumbers && (
              <Text
                style={[
                  styles.ayahNumber,
                  {
                    color: colors.primary,
                    fontSize: fontSize * 0.7,
                  },
                ]}
              >
                {' ﴿' + toArabicNumber(ayah.numberInSurah) + '﴾ '}
              </Text>
            )}
          </React.Fragment>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  text: {
    fontFamily: 'KFGQPC Uthmanic Script HAFS',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ayahNumber: {
    fontWeight: '600',
  },
});
