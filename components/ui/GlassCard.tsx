// components/ui/GlassCard.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { BorderRadius, Shadows } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  borderRadius?: number;
  noBorder?: boolean;
  noShadow?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity = 80,
  borderRadius = BorderRadius.xl,
  noBorder = false,
  noShadow = false,
}: GlassCardProps) {
  const colors = useColors();
const isDark = colors.background === '#11151c';

  // على الويب نستخدم CSS backdrop-filter
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.75)',
            borderRadius,
            borderWidth: noBorder ? 0 : 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)',
            // @ts-ignore - web only
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          },
          !noShadow && Shadows.md,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // على iOS/Android نستخدم BlurView
  return (
    <View
      style={[
        styles.container,
        { borderRadius, overflow: 'hidden' },
        !noShadow && Shadows.md,
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
          },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(28, 28, 30, 0.5)' : 'rgba(255, 255, 255, 0.3)',
            borderRadius,
            borderWidth: noBorder ? 0 : 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
          },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    zIndex: 1,
  },
});
