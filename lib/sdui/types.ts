// lib/sdui/types.ts
// Server-Driven UI Types — نظام واجهة المستخدم الديناميكية

/**
 * Base section configuration that all section types extend
 */
export interface BaseSectionConfig {
  /** Unique identifier for this section */
  id: string;
  /** Section type determines which component renders this section */
  type: SDUISectionType;
  /** Whether this section is visible */
  enabled: boolean;
  /** Display order (lower numbers appear first) */
  order: number;
  /** Optional title displayed above the section */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Conditional display rules */
  conditions?: SectionConditions;
}

/**
 * Supported section types (only implemented ones)
 */
export type SDUISectionType = 'html_block' | 'spacer';

/**
 * Conditional display rules for sections
 */
export interface SectionConditions {
  /** Show only during specific seasons (ramadan, hajj, etc.) */
  seasons?: string[];
  /** Show only to users with specific subscription status */
  subscriptionRequired?: boolean;
  /** Show only on specific days of week (0-6, Sunday = 0) */
  daysOfWeek?: number[];
  /** Show only between specific times (HH:MM format) */
  timeRange?: { start: string; end: string };
  /** Show only if user has completed onboarding */
  onboardingComplete?: boolean;
  /** Feature flag key to check */
  featureFlag?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Section-Specific Configurations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * HTML Block Section — Injected HTML content with native styling
 */
export interface HTMLBlockSection extends BaseSectionConfig {
  type: 'html_block';
  data: {
    /** Raw HTML content */
    html: string;
    /** URL to fetch HTML from (alternative to inline html) */
    htmlUrl?: string;
    /** Apply glassmorphism wrapper */
    useGlassContainer: boolean;
    /** Apply app typography (Amiri font, theme colors) */
    useAppTypography: boolean;
    /** Custom padding inside the container */
    padding?: number;
    /** Custom border radius */
    borderRadius?: number;
    /** Background blur intensity (0-100) */
    blurIntensity?: number;
  };
}

/**
 * Spacer Section
 */
export interface SpacerSection extends BaseSectionConfig {
  type: 'spacer';
  data: {
    height: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Union type for all sections
// ═══════════════════════════════════════════════════════════════════════════

export type SDUISection = HTMLBlockSection | SpacerSection;

// ═══════════════════════════════════════════════════════════════════════════
// Screen Configuration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete screen configuration from the server
 */
export interface SDUIScreenConfig {
  /** Screen identifier (e.g., 'home', 'azkar', 'quran') */
  screenId: string;
  /** Screen title */
  title?: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** Version for cache invalidation */
  version: number;
  /** Ordered list of sections to render */
  sections: SDUISection[];
  /** Global screen settings */
  settings?: ScreenSettings;
}

export interface ScreenSettings {
  /** Show pull-to-refresh */
  refreshable: boolean;
  /** Background color/image */
  background?: string;
  /** Header style */
  headerStyle?: 'default' | 'transparent' | 'hidden';
  /** Enable scroll animations */
  animateScroll: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// API Response Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SDUIConfigResponse {
  screens: Record<string, SDUIScreenConfig>;
  globalSettings?: {
    defaultBlurIntensity: number;
    defaultAnimationDuration: number;
    typographyScale: number;
  };
  version: number;
  updatedAt: string;
}
