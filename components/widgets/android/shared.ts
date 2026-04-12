// components/widgets/android/shared.ts
// Shared constants and types for Android widgets

export const COLORS = {
  // Primary backgrounds — fully opaque, no wallpaper bleed
  bg: '#0a1929',
  bgLight: '#0f2137',
  bgCard: '#132d46',
  bgCardLight: '#183552',
  // Accent colors
  teal: '#0d9668',
  tealLight: '#14c78a',
  tealDark: '#0a7a54',
  green: '#10b981',
  gold: '#f0c654',
  goldDark: '#d4a853',
  // Text
  white: '#ffffff',
  whiteAlt: '#eef2f7',
  whiteMuted: '#c8d6e5',
  gray: '#8899a6',
  grayLight: '#b8c7d6',
  grayDark: '#4a5e6f',
  // Decorative
  divider: '#1e3a52',
  // Solid card backgrounds (inner elements)
  cardBg: '#14304a',
  cardBgAlt: '#1a3a56',
  badgeBg: '#0d3d2e',
  badgeBgAlt: '#1a2744',
} as const;

// Light mode color overrides
export const COLORS_LIGHT = {
  bg: '#f5f0e8',
  bgLight: '#efe9de',
  bgCard: '#e8dfd0',
  bgCardLight: '#dfd5c4',
  teal: '#0d9668',
  tealLight: '#0a7a54',
  tealDark: '#086648',
  green: '#10b981',
  gold: '#b8860b',
  goldDark: '#996f08',
  white: '#1a1a2e',
  whiteAlt: '#2d2d44',
  whiteMuted: '#4a4a6a',
  gray: '#6b6b8a',
  grayLight: '#8a8aa6',
  grayDark: '#3d3d5c',
  divider: '#d4c9b8',
  cardBg: '#e8dfd0',
  cardBgAlt: '#dfd5c4',
  badgeBg: '#d4e8d4',
  badgeBgAlt: '#dde5d8',
} as const;

type HexColor = `#${string}`;
type GradientDef = {
  from: HexColor;
  to: HexColor;
  orientation: 'TOP_BOTTOM' | 'TR_BL' | 'RIGHT_LEFT' | 'BR_TL' | 'BOTTOM_TOP' | 'BL_TR' | 'LEFT_RIGHT' | 'TL_BR';
};

// Fully opaque gradients — solid backgrounds, no wallpaper bleed-through
export const GRADIENTS: Record<string, GradientDef> = {
  prayer: { from: '#0c2440', to: '#081620', orientation: 'TOP_BOTTOM' },
  verse: { from: '#0e1f38', to: '#091428', orientation: 'TOP_BOTTOM' },
  dhikr: { from: '#0a2030', to: '#071520', orientation: 'TOP_BOTTOM' },
  azkar: { from: '#0c1e36', to: '#081422', orientation: 'TOP_BOTTOM' },
  hijri: { from: '#0f2238', to: '#091828', orientation: 'TOP_BOTTOM' },
};

// Light mode gradients
export const GRADIENTS_LIGHT: Record<string, GradientDef> = {
  prayer: { from: '#f5f0e8', to: '#efe9de', orientation: 'TOP_BOTTOM' },
  verse: { from: '#f0ead8', to: '#e8dfc8', orientation: 'TOP_BOTTOM' },
  dhikr: { from: '#eee8d6', to: '#e6dcc6', orientation: 'TOP_BOTTOM' },
  azkar: { from: '#f2ecd8', to: '#eae3c8', orientation: 'TOP_BOTTOM' },
  hijri: { from: '#f4eedc', to: '#ece5cc', orientation: 'TOP_BOTTOM' },
};

// ========================================
// Premium Widget Themes (Islamic aesthetics)
// ========================================

export interface WidgetTheme {
  id: string;
  nameAr: string;
  nameEn: string;
  isPremium: boolean;
  gradient: GradientDef;
  accentColor: HexColor;
  textColor: HexColor;
  mutedColor: HexColor;
  badgeBg: HexColor;
  badgeText: HexColor;
  /** Pattern overlay image filename in assets/images/widget-patterns/ */
  patternAsset?: string;
  /** Decorative icon filename in assets/images/widget-icons/ */
  iconAsset?: string;
}

export const WIDGET_THEMES: WidgetTheme[] = [
  // === FREE THEMES ===
  {
    id: 'default_dark',
    nameAr: 'الكلاسيكي',
    nameEn: 'Classic Dark',
    isPremium: false,
    gradient: { from: '#0e1f38', to: '#091428', orientation: 'TOP_BOTTOM' },
    accentColor: '#0d9668',
    textColor: '#ffffff',
    mutedColor: '#c8d6e5',
    badgeBg: '#1a2744',
    badgeText: '#f0c654',
  },
  {
    id: 'default_light',
    nameAr: 'النهار',
    nameEn: 'Daylight',
    isPremium: false,
    gradient: { from: '#f0ead8', to: '#e8dfc8', orientation: 'TOP_BOTTOM' },
    accentColor: '#0d9668',
    textColor: '#1a1a2e',
    mutedColor: '#4a4a6a',
    badgeBg: '#dde5d8',
    badgeText: '#b8860b',
  },
  // === PREMIUM THEMES ===
  {
    id: 'masjid_green',
    nameAr: 'أخضر المسجد',
    nameEn: 'Mosque Green',
    isPremium: true,
    gradient: { from: '#0a3d2e', to: '#062218', orientation: 'TOP_BOTTOM' },
    accentColor: '#14c78a',
    textColor: '#e8f5e9',
    mutedColor: '#a5d6a7',
    badgeBg: '#1b5e20',
    badgeText: '#c8e6c9',
    patternAsset: 'pattern_geometric.png',
    iconAsset: 'icon_mosque.png',
  },
  {
    id: 'kaaba_gold',
    nameAr: 'ذهب الكعبة',
    nameEn: 'Kaaba Gold',
    isPremium: true,
    gradient: { from: '#2c1810', to: '#1a0e08', orientation: 'TOP_BOTTOM' },
    accentColor: '#d4a017',
    textColor: '#fef3c7',
    mutedColor: '#d4a853',
    badgeBg: '#78350f',
    badgeText: '#fbbf24',
    patternAsset: 'pattern_arabesque.png',
    iconAsset: 'icon_kaaba.png',
  },
  {
    id: 'royal_purple',
    nameAr: 'الأرجواني الملكي',
    nameEn: 'Royal Purple',
    isPremium: true,
    gradient: { from: '#1a0a2e', to: '#0d0518', orientation: 'TOP_BOTTOM' },
    accentColor: '#a78bfa',
    textColor: '#ede9fe',
    mutedColor: '#a78bfa',
    badgeBg: '#4c1d95',
    badgeText: '#c4b5fd',
    patternAsset: 'pattern_stars.png',
    iconAsset: 'icon_crescent.png',
  },
  {
    id: 'ocean_blue',
    nameAr: 'أزرق المحيط',
    nameEn: 'Ocean Blue',
    isPremium: true,
    gradient: { from: '#0c2461', to: '#061630', orientation: 'TOP_BOTTOM' },
    accentColor: '#3a7ca5',
    textColor: '#dbeafe',
    mutedColor: '#93bbfc',
    badgeBg: '#1e3a5f',
    badgeText: '#bfdbfe',
    patternAsset: 'pattern_waves.png',
    iconAsset: 'icon_lantern.png',
  },
  {
    id: 'desert_sand',
    nameAr: 'رمال الصحراء',
    nameEn: 'Desert Sand',
    isPremium: true,
    gradient: { from: '#3d2b1f', to: '#261a10', orientation: 'TOP_BOTTOM' },
    accentColor: '#c17f59',
    textColor: '#fef3c7',
    mutedColor: '#d6a87c',
    badgeBg: '#78350f',
    badgeText: '#fde68a',
    patternAsset: 'pattern_desert.png',
    iconAsset: 'icon_dome.png',
  },
  {
    id: 'emerald_night',
    nameAr: 'ليلة الزمرد',
    nameEn: 'Emerald Night',
    isPremium: true,
    gradient: { from: '#064e3b', to: '#022c22', orientation: 'TR_BL' },
    accentColor: '#34d399',
    textColor: '#d1fae5',
    mutedColor: '#6ee7b7',
    badgeBg: '#065f46',
    badgeText: '#a7f3d0',
    patternAsset: 'pattern_floral.png',
    iconAsset: 'icon_minaret.png',
  },
  {
    id: 'midnight_rose',
    nameAr: 'وردة منتصف الليل',
    nameEn: 'Midnight Rose',
    isPremium: true,
    gradient: { from: '#4a1942', to: '#2d0f28', orientation: 'TOP_BOTTOM' },
    accentColor: '#f472b6',
    textColor: '#fce7f3',
    mutedColor: '#f9a8d4',
    badgeBg: '#831843',
    badgeText: '#fbcfe8',
    patternAsset: 'pattern_mashrabiya.png',
    iconAsset: 'icon_star.png',
  },
];

/** Get a theme by ID, fallback to default_dark */
export function getWidgetTheme(themeId?: string): WidgetTheme {
  if (!themeId) return WIDGET_THEMES[0];
  return WIDGET_THEMES.find(t => t.id === themeId) || WIDGET_THEMES[0];
}

/**
 * Resolve colors based on colorScheme setting.
 * Returns appropriate color palette for the scheme.
 */
export function resolveColorScheme(
  colorScheme: 'auto' | 'light' | 'dark' | undefined,
  widgetType: string,
): { colors: typeof COLORS; gradient: GradientDef } {
  const scheme = colorScheme || 'auto';
  // For 'auto', default to dark (widgets look better on dark backgrounds)
  if (scheme === 'light') {
    return {
      colors: COLORS_LIGHT as unknown as typeof COLORS,
      gradient: GRADIENTS_LIGHT[widgetType] || GRADIENTS_LIGHT.verse,
    };
  }
  return {
    colors: COLORS,
    gradient: GRADIENTS[widgetType] || GRADIENTS.verse,
  };
}

export const FONT = {
  amiri: 'Amiri',
  amiriBold: 'AmiriBold',
} as const;

export const BRANDING = {
  name: 'رُوح المسلم',
  fontSize: 10,
  color: COLORS.teal,
} as const;

// App icon for widget display
export const APP_ICON = require('@/assets/images/icons/icon.png');

// Icon sizes in dp
export const ICON_SIZE = {
  small: 28,
  header: 22,
} as const;
