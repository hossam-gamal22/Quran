// components/ui/DynamicScreen.tsx
// Server-Driven Dynamic Screen Container — حاوية الشاشة الديناميكية

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Animated,
  Text,
  ActivityIndicator,
} from 'react-native';
import { fontBold, fontRegular } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { useSettings } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';
import { 
  renderSections, 
  SectionAction 
} from '@/lib/sdui/section-registry';
import type { 
  SDUIScreenConfig, 
  SDUISection,
  BaseSectionConfig,
  SectionConditions 
} from '@/lib/sdui/types';
import { useSeasonal } from '@/contexts/SeasonalContext';
import { trackEvent } from '@/lib/analytics';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface DynamicScreenProps {
  /** Screen configuration from Firebase */
  config: SDUIScreenConfig | null;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callback to refetch config */
  onRefresh?: () => Promise<void>;
  /** Additional static sections to prepend */
  prependSections?: React.ReactNode;
  /** Additional static sections to append */
  appendSections?: React.ReactNode;
  /** Custom scroll view style */
  scrollViewStyle?: object;
  /** Custom content container style */
  contentContainerStyle?: object;
  /** Disable scroll */
  scrollEnabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Condition Evaluation Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluates section conditions to determine visibility
 */
function evaluateConditions(
  conditions: SectionConditions | undefined,
  context: {
    currentSeason?: string;
    currentTime: Date;
    isOnboardingComplete: boolean;
    featureFlags: Record<string, boolean>;
  }
): boolean {
  if (!conditions) return true;

  // Check season
  if (conditions.seasons && conditions.seasons.length > 0) {
    if (!context.currentSeason) return false;
    if (!conditions.seasons.includes(context.currentSeason)) return false;
  }

  // Check days of week (0-6, Sunday = 0)
  if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
    const currentDay = context.currentTime.getDay();
    if (!conditions.daysOfWeek.includes(currentDay)) return false;
  }

  // Check time range
  if (conditions.timeRange) {
    const { start, end } = conditions.timeRange;
    const currentHours = context.currentTime.getHours();
    const currentMinutes = context.currentTime.getMinutes();
    const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
    
    if (start <= end) {
      // Normal range (e.g., 09:00 to 17:00)
      if (currentTimeStr < start || currentTimeStr > end) return false;
    } else {
      // Overnight range (e.g., 22:00 to 06:00)
      if (currentTimeStr < start && currentTimeStr > end) return false;
    }
  }

  // Check onboarding
  if (conditions.onboardingComplete !== undefined) {
    if (conditions.onboardingComplete !== context.isOnboardingComplete) return false;
  }

  // Check feature flag
  if (conditions.featureFlag) {
    const flagEnabled = context.featureFlags[conditions.featureFlag] ?? false;
    if (!flagEnabled) return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export function DynamicScreen({
  config,
  loading = false,
  error = null,
  onRefresh,
  prependSections,
  appendSections,
  scrollViewStyle,
  contentContainerStyle,
  scrollEnabled = true,
  testID,
}: DynamicScreenProps) {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const { currentSeason } = useSeasonal();
  
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(() => new Animated.Value(0))[0];

  // Theme colors
  const colors = useMemo(() => ({
    background: isDarkMode ? '#0F0F0F' : '#F7F7F7',
    text: isDarkMode ? '#FFFFFF' : '#1C1C1E',
    textSecondary: isDarkMode ? '#A1A1AA' : '#6B7280',
    accent: isDarkMode ? '#4ADE80' : '#22C55E',
  }), [isDarkMode]);

  // Animate content on load
  useEffect(() => {
    if (config && !loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [config, loading, fadeAnim]);

  // Build context for condition evaluation
  const conditionContext = useMemo(() => ({
    currentSeason: currentSeason?.type, // Extract season type string
    currentTime: new Date(),
    isOnboardingComplete: true, // TODO: Get from onboarding context
    featureFlags: {} as Record<string, boolean>, // TODO: Get from remote config
  }), [currentSeason]);

  // Filter sections based on conditions
  const visibleSections = useMemo(() => {
    if (!config?.sections) return [];

    return config.sections.filter(section => {
      if (!section.enabled) return false;
      return evaluateConditions(section.conditions, conditionContext);
    });
  }, [config?.sections, conditionContext]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // Handle section actions
  const handleSectionAction = useCallback((action: SectionAction) => {
    trackEvent('navigation', 'click', `sdui_${action.type}`, undefined, action.payload);

    switch (action.type) {
      case 'navigate':
        const route = action.payload.route as string;
        if (route) {
          router.push(route as any);
        }
        break;

      case 'open_url':
        const url = action.payload.url as string;
        if (url) {
          Linking.openURL(url);
        }
        break;

      case 'show_modal':
        // TODO: Implement modal system
        console.log('Show modal:', action.payload);
        break;

      case 'track_event':
        trackEvent(
          'navigation', 
          'click', 
          action.payload.eventName as string,
          undefined,
          action.payload.params as Record<string, any>
        );
        break;

      case 'custom':
        // Custom action handler can be passed via context
        console.log('Custom action:', action.payload);
        break;
    }
  }, [router]);

  // Loading state
  if (loading && !config) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  // Error state
  if (error && !config) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="alert" size={40} color={colors.text} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {t('common.errorLoadContent')}
        </Text>
        <Text style={[styles.errorDescription, { color: colors.textSecondary }]}>
          {error.message}
        </Text>
      </View>
    );
  }

  // No config
  if (!config) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('common.noContent')}
        </Text>
      </View>
    );
  }

  // Settings from config
  const refreshable = config.settings?.refreshable ?? true;
  const animateScroll = config.settings?.animateScroll ?? true;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: colors.background, opacity: fadeAnim }
      ]}
      testID={testID}
    >
      <ScrollView
        style={[styles.scrollView, scrollViewStyle]}
        contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        refreshControl={
          refreshable && onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          ) : undefined
        }
      >
        {/* Prepended static sections */}
        {prependSections}

        {/* Dynamic sections from config */}
        {renderSections(visibleSections as BaseSectionConfig[], handleSectionAction)}

        {/* Appended static sections */}
        {appendSections}

        {/* Bottom padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: fontRegular(),
    fontSize: 16,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: fontBold(),
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDescription: {
    fontFamily: fontRegular(),
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fontRegular(),
    fontSize: 16,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});

export default DynamicScreen;
