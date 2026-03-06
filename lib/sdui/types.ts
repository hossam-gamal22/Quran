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
 * All supported section types
 */
export type SDUISectionType =
  | 'welcome_banner'
  | 'quick_actions'
  | 'highlights_grid'
  | 'featured_content'
  | 'html_block'
  | 'prayer_times'
  | 'daily_ayah'
  | 'azkar_categories'
  | 'khatma_progress'
  | 'worship_stats'
  | 'seasonal_banner'
  | 'custom_cards'
  | 'image_carousel'
  | 'announcement'
  | 'spacer';

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
 * Welcome Banner Section
 */
export interface WelcomeBannerSection extends BaseSectionConfig {
  type: 'welcome_banner';
  data: {
    greeting: string;
    icon: string;
    color: string;
    route?: string;
    backgroundImage?: string;
    displayMode: 'text' | 'text_image' | 'image_only';
  };
}

/**
 * Quick Actions Grid Section
 */
export interface QuickActionsSection extends BaseSectionConfig {
  type: 'quick_actions';
  data: {
    columns: 2 | 3 | 4;
    items: QuickActionItem[];
  };
}

export interface QuickActionItem {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
  routeType: 'internal' | 'url' | 'html';
  enabled: boolean;
  badge?: string;
}

/**
 * Highlights Grid Section
 */
export interface HighlightsGridSection extends BaseSectionConfig {
  type: 'highlights_grid';
  data: {
    layout: 'grid' | 'horizontal_scroll' | 'masonry';
    items: HighlightItem[];
  };
}

export interface HighlightItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  backgroundColor?: string;
  imageUrl?: string;
  route: string;
  routeType: 'internal' | 'url' | 'html';
  enabled: boolean;
  order: number;
}

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
 * Featured Content Section (e.g., daily hadith, story of the day)
 */
export interface FeaturedContentSection extends BaseSectionConfig {
  type: 'featured_content';
  data: {
    contentType: 'hadith' | 'story' | 'dua' | 'ayah' | 'tip';
    content: {
      title: string;
      body: string;
      source?: string;
      route?: string;
    };
    style: 'card' | 'banner' | 'minimal';
  };
}

/**
 * Prayer Times Section
 */
export interface PrayerTimesSection extends BaseSectionConfig {
  type: 'prayer_times';
  data: {
    showNextPrayer: boolean;
    showAllPrayers: boolean;
    compact: boolean;
  };
}

/**
 * Daily Ayah Section
 */
export interface DailyAyahSection extends BaseSectionConfig {
  type: 'daily_ayah';
  data: {
    showTranslation: boolean;
    showTafsir: boolean;
    style: 'full' | 'compact';
  };
}

/**
 * Azkar Categories Section
 */
export interface AzkarCategoriesSection extends BaseSectionConfig {
  type: 'azkar_categories';
  data: {
    layout: 'grid' | 'list' | 'horizontal';
    categories: string[]; // Category IDs to show
    showProgress: boolean;
  };
}

/**
 * Khatma Progress Section
 */
export interface KhatmaProgressSection extends BaseSectionConfig {
  type: 'khatma_progress';
  data: {
    showActiveKhatma: boolean;
    showHistory: boolean;
  };
}

/**
 * Worship Stats Section
 */
export interface WorshipStatsSection extends BaseSectionConfig {
  type: 'worship_stats';
  data: {
    showPrayer: boolean;
    showQuran: boolean;
    showFasting: boolean;
    showAzkar: boolean;
    period: 'today' | 'week' | 'month';
  };
}

/**
 * Seasonal Banner Section
 */
export interface SeasonalBannerSection extends BaseSectionConfig {
  type: 'seasonal_banner';
  data: {
    season: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    backgroundColor: string;
    textColor: string;
    route?: string;
  };
}

/**
 * Custom Cards Section
 */
export interface CustomCardsSection extends BaseSectionConfig {
  type: 'custom_cards';
  data: {
    layout: 'vertical' | 'horizontal';
    cards: CustomCard[];
  };
}

export interface CustomCard {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  color: string;
  route: string;
  routeType: 'internal' | 'url' | 'html';
}

/**
 * Image Carousel Section
 */
export interface ImageCarouselSection extends BaseSectionConfig {
  type: 'image_carousel';
  data: {
    autoPlay: boolean;
    autoPlayInterval: number;
    images: CarouselImage[];
  };
}

export interface CarouselImage {
  id: string;
  imageUrl: string;
  title?: string;
  route?: string;
}

/**
 * Announcement Section
 */
export interface AnnouncementSection extends BaseSectionConfig {
  type: 'announcement';
  data: {
    message: string;
    type: 'info' | 'warning' | 'success' | 'promo';
    dismissible: boolean;
    route?: string;
    expiresAt?: string;
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

export type SDUISection =
  | WelcomeBannerSection
  | QuickActionsSection
  | HighlightsGridSection
  | HTMLBlockSection
  | FeaturedContentSection
  | PrayerTimesSection
  | DailyAyahSection
  | AzkarCategoriesSection
  | KhatmaProgressSection
  | WorshipStatsSection
  | SeasonalBannerSection
  | CustomCardsSection
  | ImageCarouselSection
  | AnnouncementSection
  | SpacerSection;

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
