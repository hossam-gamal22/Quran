// lib/sdui/section-registry.tsx
// SDUI Section Registry — سجل أقسام الواجهة الديناميكية

import React, { ComponentType, lazy, Suspense } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { t } from '@/lib/i18n';
import type {
  SDUISectionType,
  BaseSectionConfig,
  WelcomeBannerSection,
  QuickActionsSection,
  HighlightsGridSection,
  FeaturedContentSection,
  HTMLBlockSection,
  PrayerTimesSection,
  DailyAyahSection,
  AzkarCategoriesSection,
  KhatmaProgressSection,
  WorshipStatsSection,
  SeasonalBannerSection,
  CustomCardsSection,
  ImageCarouselSection,
  AnnouncementSection,
  SpacerSection,
} from './types';
import { fontRegular } from '@/lib/fonts';

// ═══════════════════════════════════════════════════════════════════════════
// Section Props Type Helper
// ═══════════════════════════════════════════════════════════════════════════

export type SectionProps<T extends BaseSectionConfig = BaseSectionConfig> = {
  config: T;
  onAction?: (action: SectionAction) => void;
};

export interface SectionAction {
  type: 'navigate' | 'open_url' | 'show_modal' | 'track_event' | 'custom';
  payload: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Section Component Type
// ═══════════════════════════════════════════════════════════════════════════

export type SectionComponent<T extends BaseSectionConfig = BaseSectionConfig> = 
  ComponentType<SectionProps<T>>;

// ═══════════════════════════════════════════════════════════════════════════
// Loading Fallback
// ═══════════════════════════════════════════════════════════════════════════

function SectionLoadingFallback() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color="#4ADE80" />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Fallback for Lazy Components
// ═══════════════════════════════════════════════════════════════════════════

function SectionErrorFallback({ sectionType }: { sectionType: string }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>
        {t('common.sectionLoadError')}: {sectionType}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Placeholder Section (for unimplemented or unknown types)
// ═══════════════════════════════════════════════════════════════════════════

function PlaceholderSection({ config }: SectionProps) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>
        {t('common.sectionUnavailable')}: {config.type}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Spacer Section (Simple built-in)
// ═══════════════════════════════════════════════════════════════════════════

function SpacerSectionComponent({ config }: SectionProps<SpacerSection>) {
  const height = config.data?.height ?? 16;
  return <View style={{ height }} />;
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML Block Section (Uses GlassHTML)
// ═══════════════════════════════════════════════════════════════════════════

// Import GlassHTML directly since it's a core component
import { GlassHTML } from '@/components/ui/GlassHTML';

function HTMLBlockSectionComponent({ config }: SectionProps<HTMLBlockSection>) {
  return (
    <GlassHTML
      html={config.data?.html}
      htmlUrl={config.data?.htmlUrl}
      useGlassContainer={config.data?.useGlassContainer ?? true}
      useAppTypography={config.data?.useAppTypography ?? true}
      blurIntensity={config.data?.blurIntensity ?? 60}
      padding={config.data?.padding ?? 16}
      borderRadius={config.data?.borderRadius ?? 20}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Section Registry Map
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registry mapping section types to their components.
 * Components can be:
 * - Direct component references (for simple/core sections)
 * - Lazy-loaded components (for complex sections to reduce bundle size)
 * - null/undefined (uses placeholder)
 */
type SectionRegistryEntry = {
  component: SectionComponent<any>;
  lazy?: boolean;
};

const sectionRegistry: Partial<Record<SDUISectionType, SectionRegistryEntry>> = {
  // Built-in simple sections
  spacer: { component: SpacerSectionComponent },
  html_block: { component: HTMLBlockSectionComponent },
  
  // These will be implemented as we build out the SDUI system
  // For now they all use placeholder
  welcome_banner: { component: PlaceholderSection },
  quick_actions: { component: PlaceholderSection },
  highlights_grid: { component: PlaceholderSection },
  featured_content: { component: PlaceholderSection },
  prayer_times: { component: PlaceholderSection },
  daily_ayah: { component: PlaceholderSection },
  azkar_categories: { component: PlaceholderSection },
  khatma_progress: { component: PlaceholderSection },
  worship_stats: { component: PlaceholderSection },
  seasonal_banner: { component: PlaceholderSection },
  custom_cards: { component: PlaceholderSection },
  image_carousel: { component: PlaceholderSection },
  announcement: { component: PlaceholderSection },
};

// ═══════════════════════════════════════════════════════════════════════════
// Registry API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the component for a section type
 */
export function getSectionComponent(type: SDUISectionType): SectionComponent {
  const entry = sectionRegistry[type];
  return entry?.component ?? PlaceholderSection;
}

/**
 * Check if a section type is registered
 */
export function isSectionRegistered(type: SDUISectionType): boolean {
  const entry = sectionRegistry[type];
  return entry?.component !== PlaceholderSection && entry?.component !== undefined;
}

/**
 * Register a custom section component at runtime
 */
export function registerSection(
  type: SDUISectionType,
  component: SectionComponent<any>,
  options?: { lazy?: boolean }
): void {
  sectionRegistry[type] = {
    component,
    lazy: options?.lazy,
  };
}

/**
 * Get all registered section types
 */
export function getRegisteredSectionTypes(): SDUISectionType[] {
  return Object.keys(sectionRegistry) as SDUISectionType[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Section Renderer
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Renders a section based on its configuration
 */
export function renderSection(
  config: BaseSectionConfig,
  onAction?: (action: SectionAction) => void
): React.ReactNode {
  // Skip disabled sections
  if (!config.enabled) return null;

  const Component = getSectionComponent(config.type);
  
  return (
    <Suspense fallback={<SectionLoadingFallback />} key={config.id}>
      <Component config={config} onAction={onAction} />
    </Suspense>
  );
}

/**
 * Renders multiple sections in order
 */
export function renderSections(
  configs: BaseSectionConfig[],
  onAction?: (action: SectionAction) => void
): React.ReactNode[] {
  // Sort by order and filter enabled
  const sortedConfigs = [...configs]
    .filter(c => c.enabled)
    .sort((a, b) => a.order - b.order);

  return sortedConfigs.map(config => renderSection(config, onAction));
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  errorText: {
    color: '#EF4444',
    fontFamily: fontRegular(),
    fontSize: 14,
    textAlign: 'center',
  },
  placeholder: {
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(161, 161, 170, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(161, 161, 170, 0.2)',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#A1A1AA',
    fontFamily: fontRegular(),
    fontSize: 14,
    textAlign: 'center',
  },
});

export default sectionRegistry;
