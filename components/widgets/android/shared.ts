// components/widgets/android/shared.ts
// Shared constants and types for Android widgets

export const COLORS = {
  // Primary backgrounds (deep teal/navy gradients)
  bg: '#081827',
  bgAlt: '#0c2235',
  bgCard: '#0f2a3e',
  // Accent colors
  teal: '#22C55E',
  tealLight: '#14b899',
  green: '#22c55e',
  greenDark: '#16a34a',
  gold: '#d4a853',
  goldLight: '#f0d48a',
  // Text
  white: '#ffffff',
  whiteAlt: '#f0f4f8',
  gray: '#9ca3af',
  grayLight: '#d1d5db',
  grayDark: '#4b5563',
  // Decorative
  divider: '#1a3a50',
  overlay: '#0e2030',
  brandBg: '#0a1e30',
} as const;

type HexColor = `#${string}`;
type GradientDef = {
  from: HexColor;
  to: HexColor;
  orientation: 'TOP_BOTTOM' | 'TR_BL' | 'RIGHT_LEFT' | 'BR_TL' | 'BOTTOM_TOP' | 'BL_TR' | 'LEFT_RIGHT' | 'TL_BR';
};

// Gradient presets for different widget types
export const GRADIENTS: Record<string, GradientDef> = {
  prayer: { from: '#081827', to: '#0c2e3a', orientation: 'TOP_BOTTOM' },
  verse: { from: '#0f1a2e', to: '#081827', orientation: 'TOP_BOTTOM' },
  dhikr: { from: '#081a20', to: '#0a1e30', orientation: 'TOP_BOTTOM' },
  azkar: { from: '#0a1628', to: '#081827', orientation: 'TOP_BOTTOM' },
  hijri: { from: '#1a1a0a', to: '#0f1a2e', orientation: 'TOP_BOTTOM' },
};

export const FONT = {
  amiri: 'Amiri',
  amiriBold: 'AmiriBold',
} as const;

export const BRANDING = {
  name: 'رُوح المسلم',
  fontSize: 9,
  color: COLORS.teal,
} as const;
