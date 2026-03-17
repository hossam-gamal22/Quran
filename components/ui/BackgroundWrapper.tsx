// components/ui/BackgroundWrapper.tsx
// غلاف لتطبيق صور الخلفية على الشاشات

import React from 'react';
import { View, ImageBackground, ViewProps, ImageSourcePropType, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppBackgroundKey, useSettings } from '@/contexts/SettingsContext';
import { BACKGROUND_SOURCE_MAP } from '@/lib/backgrounds';

// ========================================
// واجهة الخصائص
// ========================================

interface BackgroundWrapperProps extends ViewProps {
  backgroundKey?: AppBackgroundKey;
  backgroundUrl?: string;
  opacity?: number;
  blurEnabled?: boolean;
  blurIntensity?: number;
  dimEnabled?: boolean;
  dimOpacity?: number;
  children: React.ReactNode;
}

// ========================================
// المكون
// ========================================

const BackgroundWrapper: React.FC<BackgroundWrapperProps> = ({
  backgroundKey: explicitKey,
  backgroundUrl: explicitUrl,
  opacity: explicitOpacity,
  blurEnabled: explicitBlur,
  blurIntensity: explicitBlurIntensity,
  dimEnabled: explicitDim,
  dimOpacity: explicitDimOpacity,
  children,
  style,
  ...props
}) => {
  const { settings } = useSettings();
  const display = settings.display;

  const rawKey = explicitKey ?? display.appBackground ?? 'background1';
  // Treat 'none' as default background — there's no "no background" option in the UI
  const backgroundKey = rawKey === 'none' ? 'background1' : rawKey;
  const backgroundUrl = explicitUrl ?? display.appBackgroundUrl;
  const opacity = 1; // Always full opacity
  const blurEnabled = (explicitBlur ?? display.blurEnabled ?? false) && backgroundKey === 'dynamic';
  const blurIntensity = explicitBlurIntensity ?? display.blurIntensity ?? 15;
  const dimEnabled = (explicitDim ?? display.dimEnabled ?? false) && backgroundKey === 'dynamic';
  const dimOpacity = explicitDimOpacity ?? (display as any).dimOpacity ?? 0.5;
  let backgroundSource: ImageSourcePropType | null = null;

  if (backgroundKey === 'dynamic' && backgroundUrl) {
    backgroundSource = { uri: backgroundUrl };
  } else if (backgroundKey && backgroundKey !== 'dynamic') {
    backgroundSource = BACKGROUND_SOURCE_MAP[backgroundKey] || null;
  }

  if (!backgroundSource) {
    return (
      <View style={[{ flex: 1 }, style]} {...props}>
        {children}
      </View>
    );
  }

  return (
    <ImageBackground
      source={backgroundSource}
      style={[{ flex: 1 }, style]}
      imageStyle={{ resizeMode: 'cover', opacity }}
      {...props}
    >
      {blurEnabled && (
        <BlurView
          intensity={blurIntensity}
          tint="default"
          style={StyleSheet.absoluteFill}
        />
      )}
      {dimEnabled && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${dimOpacity})` }]} />
      )}
      {children}
    </ImageBackground>
  );
};

export default BackgroundWrapper;
