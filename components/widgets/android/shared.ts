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
