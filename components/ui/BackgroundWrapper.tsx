// components/ui/BackgroundWrapper.tsx
// غلاف لتطبيق صور الخلفية على الشاشات

import React, { useMemo, useState, useEffect } from 'react';
import { View, ImageBackground, ViewProps, ImageSourcePropType, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppBackgroundKey, useSettings } from '@/contexts/SettingsContext';
import { BACKGROUND_SOURCE_MAP } from '@/lib/backgrounds';
import { useColors } from '@/hooks/use-colors';
import { getCachedBackgroundUri } from '@/lib/background-cache';
import { ALL_PEXELS_BACKGROUNDS } from '@/constants/pexels-backgrounds';

// Set of all curated Pexels IDs for URL validation
const CURATED_PEXELS_IDS = new Set(ALL_PEXELS_BACKGROUNDS.map(bg => bg.id));

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
  
  // Resolve cached background URI for remote Pexels URLs (offline safety net)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const resolveUrl = (url: string | null) => {
      if (!cancelled) setResolvedUrl(url);
    };

    if (backgroundKey !== 'dynamic' || !backgroundUrl) {
      resolveUrl(null);
      return () => { cancelled = true; };
    }
    // If URL is already local (file:// or no scheme), use as-is
    if (!backgroundUrl.startsWith('https://images.pexels.com/')) {
      resolveUrl(backgroundUrl);
      return () => { cancelled = true; };
    }
    // Try to extract pexels ID from URL and check cache
    const match = backgroundUrl.match(/photos\/(\d+)\//);
    if (match) {
      const pexelsId = parseInt(match[1], 10);
      getCachedBackgroundUri(pexelsId, 'large2x')
        .then(cached => resolveUrl(cached || backgroundUrl))
        .catch(() => resolveUrl(backgroundUrl));
    } else {
      resolveUrl(backgroundUrl);
    }
    return () => { cancelled = true; };
  }, [backgroundKey, backgroundUrl]);
  
  const effectiveUrl = resolvedUrl ?? backgroundUrl;

  // Determine background source
  const backgroundSource = useMemo<ImageSourcePropType | null>(() => {
    if (backgroundKey === 'dynamic' && effectiveUrl) {
      // Validate URL: only allow local files or curated Pexels photos
      const isLocal = !effectiveUrl.startsWith('http');
      const pexelsMatch = effectiveUrl.match(/photos\/(\d+)\//);
      const isCurated = pexelsMatch ? CURATED_PEXELS_IDS.has(parseInt(pexelsMatch[1], 10)) : false;
      if (isLocal || isCurated) {
        return { uri: effectiveUrl };
      }
      return null;
    }

    if (backgroundKey && backgroundKey !== 'dynamic' && backgroundKey !== 'none') {
      return BACKGROUND_SOURCE_MAP[backgroundKey] || null;
    }

    return null;
  }, [backgroundKey, effectiveUrl]);

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
          {blurEnabled && Platform.OS !== 'android' && (
            <BlurView
              intensity={blurIntensity}
              tint="default"
              style={StyleSheet.absoluteFill}
            />
          )}
          {blurEnabled && Platform.OS === 'android' && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
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
