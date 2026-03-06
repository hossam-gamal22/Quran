// components/ui/GlassHTML.tsx
// Dynamic HTML Renderer with Native Glassmorphism — عرض HTML ديناميكي بتصميم زجاجي

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import RenderHtml, {
  HTMLSource,
  MixedStyleDeclaration,
  defaultSystemFonts,
  HTMLElementModel,
  HTMLContentModel,
} from 'react-native-render-html';
import { useSettings } from '@/contexts/SettingsContext';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface GlassHTMLProps {
  /** Raw HTML string to render */
  html?: string;
  /** URL to fetch HTML from */
  htmlUrl?: string;
  /** Apply glassmorphism container */
  useGlassContainer?: boolean;
  /** Apply app typography (Amiri font, theme colors) */
  useAppTypography?: boolean;
  /** Container padding */
  padding?: number;
  /** Container border radius */
  borderRadius?: number;
  /** Blur intensity for glass effect (0-100) */
  blurIntensity?: number;
  /** Custom base styles to merge */
  baseStyles?: MixedStyleDeclaration;
  /** Custom tags styles */
  tagsStyles?: Record<string, MixedStyleDeclaration>;
  /** Loading placeholder */
  loadingComponent?: React.ReactNode;
  /** Error fallback */
  errorComponent?: React.ReactNode;
  /** Callback when content is loaded */
  onLoad?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Custom Fonts Configuration
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM_FONTS = [
  ...defaultSystemFonts,
  'Amiri-Regular',
  'Amiri-Bold',
  'Cairo-Regular',
  'Cairo-SemiBold',
  'Cairo-Bold',
];

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function GlassHTML({
  html,
  htmlUrl,
  useGlassContainer = true,
  useAppTypography = true,
  padding = 16,
  borderRadius = 20,
  blurIntensity = 60,
  baseStyles,
  tagsStyles: customTagsStyles,
  loadingComponent,
  errorComponent,
  onLoad,
  onError,
}: GlassHTMLProps) {
  const { isDarkMode } = useSettings();
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = windowWidth - 32 - (padding * 2);

  const [fetchedHtml, setFetchedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!htmlUrl);
  const [error, setError] = useState<Error | null>(null);

  // Theme-aware colors
  const colors = useMemo(() => ({
    text: isDarkMode ? '#FFFFFF' : '#1C1C1E',
    textSecondary: isDarkMode ? '#A1A1AA' : '#6B7280',
    link: isDarkMode ? '#4ADE80' : '#2f7659',
    background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
    border: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
    codeBackground: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    blockquoteBorder: isDarkMode ? '#4ADE80' : '#2f7659',
  }), [isDarkMode]);

  // Fetch HTML from URL if provided
  useEffect(() => {
    if (!htmlUrl) return;

    const fetchHtml = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(htmlUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        setFetchedHtml(text);
        onLoad?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch HTML');
        setError(error);
        onError?.(error);
      } finally {
        setLoading(false);
      }
    };

    fetchHtml();
  }, [htmlUrl, onLoad, onError]);

  // Determine HTML source
  const htmlContent = html || fetchedHtml;

  // Default tags styles with app typography
  const defaultTagsStyles = useMemo((): Record<string, MixedStyleDeclaration> => {
    if (!useAppTypography) return {} as Record<string, MixedStyleDeclaration>;

    return {
      body: {
        fontFamily: 'Cairo-Regular',
        fontSize: 16,
        lineHeight: 28,
        color: colors.text,
        textAlign: 'right',
        direction: 'rtl',
      },
      p: {
        fontFamily: 'Cairo-Regular',
        fontSize: 16,
        lineHeight: 28,
        color: colors.text,
        marginVertical: 8,
      },
      h1: {
        fontFamily: 'Cairo-Bold',
        fontSize: 28,
        lineHeight: 40,
        color: colors.text,
        marginVertical: 12,
      },
      h2: {
        fontFamily: 'Cairo-Bold',
        fontSize: 24,
        lineHeight: 36,
        color: colors.text,
        marginVertical: 10,
      },
      h3: {
        fontFamily: 'Cairo-SemiBold',
        fontSize: 20,
        lineHeight: 32,
        color: colors.text,
        marginVertical: 8,
      },
      h4: {
        fontFamily: 'Cairo-SemiBold',
        fontSize: 18,
        lineHeight: 28,
        color: colors.text,
        marginVertical: 6,
      },
      h5: {
        fontFamily: 'Cairo-SemiBold',
        fontSize: 16,
        lineHeight: 24,
        color: colors.text,
        marginVertical: 4,
      },
      h6: {
        fontFamily: 'Cairo-SemiBold',
        fontSize: 14,
        lineHeight: 22,
        color: colors.textSecondary,
        marginVertical: 4,
      },
      a: {
        color: colors.link,
        fontFamily: 'Cairo-SemiBold',
        textDecorationLine: 'none',
      },
      strong: {
        fontFamily: 'Cairo-Bold',
        fontWeight: '700',
      },
      b: {
        fontFamily: 'Cairo-Bold',
        fontWeight: '700',
      },
      em: {
        fontStyle: 'italic',
      },
      i: {
        fontStyle: 'italic',
      },
      // Arabic Quran/Islamic text styling
      '.arabic': {
        fontFamily: 'Amiri-Regular',
        fontSize: 22,
        lineHeight: 44,
        color: colors.text,
        textAlign: 'center',
      },
      '.ayah': {
        fontFamily: 'Amiri-Regular',
        fontSize: 24,
        lineHeight: 48,
        color: colors.text,
        textAlign: 'center',
        marginVertical: 16,
      },
      '.dua': {
        fontFamily: 'Amiri-Regular',
        fontSize: 20,
        lineHeight: 40,
        color: colors.text,
        textAlign: 'right',
      },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: colors.blockquoteBorder,
        paddingLeft: 16,
        paddingRight: 0,
        marginVertical: 12,
        fontStyle: 'italic',
        color: colors.textSecondary,
      },
      code: {
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
        fontSize: 14,
        backgroundColor: colors.codeBackground,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
      },
      pre: {
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
        fontSize: 14,
        backgroundColor: colors.codeBackground,
        padding: 12,
        borderRadius: 8,
        overflow: 'hidden',
      },
      ul: {
        marginVertical: 8,
        paddingRight: 20,
      },
      ol: {
        marginVertical: 8,
        paddingRight: 20,
      },
      li: {
        fontFamily: 'Cairo-Regular',
        fontSize: 16,
        lineHeight: 28,
        color: colors.text,
        marginVertical: 4,
      },
      hr: {
        backgroundColor: colors.border,
        height: 1,
        marginVertical: 16,
      },
      table: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        overflow: 'hidden',
      },
      th: {
        fontFamily: 'Cairo-Bold',
        backgroundColor: colors.codeBackground,
        padding: 8,
      },
      td: {
        fontFamily: 'Cairo-Regular',
        padding: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      },
    };
  }, [useAppTypography, colors]);

  // Merge custom styles with defaults
  const mergedTagsStyles = useMemo(() => ({
    ...defaultTagsStyles,
    ...customTagsStyles,
  }), [defaultTagsStyles, customTagsStyles]);

  // Base styles for the HTML container
  const mergedBaseStyles: MixedStyleDeclaration = useMemo(() => ({
    fontFamily: 'Cairo-Regular',
    fontSize: 16,
    color: colors.text,
    ...baseStyles,
  }), [colors.text, baseStyles]);

  // Loading state
  if (loading) {
    return loadingComponent || (
      <View style={[styles.loadingContainer, { padding }]}>
        <ActivityIndicator size="small" color={colors.link} />
      </View>
    );
  }

  // Error state
  if (error) {
    return errorComponent || (
      <View style={[styles.errorContainer, { padding }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          فشل تحميل المحتوى
        </Text>
      </View>
    );
  }

  // No content
  if (!htmlContent) {
    return null;
  }

  // HTML source
  const source: HTMLSource = { html: htmlContent };

  // Render HTML content
  const htmlRenderer = (
    <RenderHtml
      contentWidth={contentWidth}
      source={source}
      tagsStyles={mergedTagsStyles}
      baseStyle={mergedBaseStyles}
      systemFonts={SYSTEM_FONTS}
      enableExperimentalMarginCollapsing
      enableExperimentalBRCollapsing
      defaultTextProps={{
        selectable: true,
        allowFontScaling: true,
      }}
    />
  );

  // Without glass container
  if (!useGlassContainer) {
    return <View style={{ padding }}>{htmlRenderer}</View>;
  }

  // With glass container (iOS BlurView)
  return (
    <View style={[styles.glassOuter, { borderRadius }]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? blurIntensity : Math.min(blurIntensity, 30)}
        tint={isDarkMode ? 'dark' : 'light'}
        style={[styles.blurView, { borderRadius }]}
      >
        <View
          style={[
            styles.glassInner,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius,
              padding,
            },
          ]}
        >
          {htmlRenderer}
        </View>
      </BlurView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  glassOuter: {
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  blurView: {
    overflow: 'hidden',
  },
  glassInner: {
    borderWidth: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  errorText: {
    fontFamily: 'Cairo-Regular',
    fontSize: 14,
  },
});

export default GlassHTML;
