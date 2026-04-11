// components/ui/BackgroundWrapper.tsx
// غلاف لتطبيق صور الخلفية على الشاشات

import React from 'react';
import { View, ImageBackground, ViewProps, ImageSourcePropType, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppBackgroundKey, useSettings } from '@/contexts/SettingsContext';
import { BACKGROUND_SOURCE_MAP } from '@/lib/backgrounds';
import { useColors } from '@/hooks/use-colors';

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
  const { settings, isDarkMode } = useSettings();
  const themeColors = useColors();
  const display = settings.display;

  const backgroundKey = explicitKey ?? display.appBackground ?? 'none';
  const backgroundUrl = explicitUrl ?? display.appBackgroundUrl;
  const opacity = 1; // Always full opacity
  const blurEnabled = (explicitBlur ?? display.blurEnabled ?? false) && backgroundKey === 'dynamic';
  const blurIntensity = explicitBlurIntensity ?? display.blurIntensity ?? 15;
  const dimEnabled = (explicitDim ?? display.dimEnabled ?? false) && backgroundKey === 'dynamic';
  const dimOpacity = explicitDimOpacity ?? (display as any).dimOpacity ?? 0.5;
  
  const solidBg = themeColors.background;
  
  // Determine background source
  let backgroundSource: ImageSourcePropType | null = null;
  if (backgroundKey === 'dynamic' && backgroundUrl) {
    backgroundSource = { uri: backgroundUrl };
  } else if (backgroundKey && backgroundKey !== 'dynamic' && backgroundKey !== 'none') {
    backgroundSource = BACKGROUND_SOURCE_MAP[backgroundKey] || null;
  }

  const hasBackground = !!backgroundSource;

  // CRITICAL: Always render the SAME parent View structure to avoid remounting
  // native components (NativeTabs/UITabBarController) when switching themes.
  // Previously, switching from 'none' to a background changed the parent from
  // <View> to <ImageBackground>, causing iOS native bridge crashes.
  return (
    <View style={[{ flex: 1, backgroundColor: solidBg }, style]} {...props}>
      {hasBackground && (
        <ImageBackground
          source={backgroundSource!}
          style={StyleSheet.absoluteFill}
          imageStyle={{ resizeMode: 'cover', opacity }}
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
        </ImageBackground>
      )}
      {children}
    </View>
  );
};

export default BackgroundWrapper;
