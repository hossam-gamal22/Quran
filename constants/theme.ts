// constants/theme.ts
import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// الألوان - Light Mode
// ============================================

export const Colors = {
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  secondary: '#6366F1',
  secondaryLight: '#818CF8',
  secondaryDark: '#4F46E5',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  text: '#1C1C1E',
  textSecondary: '#3A3A3C',
  textLight: '#8E8E93',
  textOnPrimary: '#FFFFFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',
  white: '#FFFFFF',
  black: '#000000',
  border: 'rgba(0,0,0,0.1)',
  divider: 'rgba(0,0,0,0.05)',
  overlay: 'rgba(0, 0, 0, 0.4)',
  gold: '#FFD700',
  quranGreen: '#10B981',
  prayerBlue: '#007AFF',
  
  // ✅ ألوان زجاجية جديدة
  glass: 'rgba(255, 255, 255, 0.7)',
  glassDark: 'rgba(255, 255, 255, 0.5)',
  glassLight: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
  cardGlass: 'rgba(255, 255, 255, 0.75)',
};

// ============================================
// الألوان - Dark Mode
// ============================================

export const DarkColors = {
  primary: '#34D399',
  primaryLight: '#6EE7B7',
  primaryDark: '#10B981',
  secondary: '#818CF8',
  secondaryLight: '#A5B4FC',
  secondaryDark: '#6366F1',
  background: '#000000',
  surface: '#1C1C1E',
  surfaceVariant: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textLight: '#8E8E93',
  textOnPrimary: '#000000',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#0A84FF',
  white: '#FFFFFF',
  black: '#000000',
  border: 'rgba(255,255,255,0.1)',
  divider: 'rgba(255,255,255,0.05)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  gold: '#FFD60A',
  quranGreen: '#30D158',
  prayerBlue: '#0A84FF',
  
  // ✅ ألوان زجاجية للدارك مود
  glass: 'rgba(28, 28, 30, 0.8)',
  glassDark: 'rgba(28, 28, 30, 0.6)',
  glassLight: 'rgba(44, 44, 46, 0.9)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  cardGlass: 'rgba(28, 28, 30, 0.85)',
};

// ============================================
// مخططات الألوان
// ============================================

export type ColorScheme = 'light' | 'dark';

export const SchemeColors = {
  light: {
    primary: Colors.primary,
    secondary: Colors.secondary,
    background: Colors.background,
    surface: Colors.surface,
    foreground: Colors.text,
    muted: Colors.textLight,
    border: Colors.border,
    success: Colors.success,
    warning: Colors.warning,
    error: Colors.error,
    glass: Colors.glass,
    cardGlass: Colors.cardGlass,
  },
  dark: {
    primary: DarkColors.primary,
    secondary: DarkColors.secondary,
    background: DarkColors.background,
    surface: DarkColors.surface,
    foreground: DarkColors.text,
    muted: DarkColors.textLight,
    border: DarkColors.border,
    success: DarkColors.success,
    warning: DarkColors.warning,
    error: DarkColors.error,
    glass: DarkColors.glass,
    cardGlass: DarkColors.cardGlass,
  },
};

// ============================================
// المسافات
// ============================================

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const SPACING = Spacing;

// ============================================
// الزوايا المستديرة - Apple Style
// ============================================

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  full: 9999,
};

export const BORDER_RADIUS = BorderRadius;

// ============================================
// أحجام الخطوط
// ============================================

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 22,
  '3xl': 28,
  '4xl': 34,
  '5xl': 48,
};

// ============================================
// الظلال - Apple Style
// ============================================

type ShadowStyle = {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
  boxShadow?: string;
};

const createShadow = (
  offsetY: number,
  opacity: number,
  radius: number,
  elevation: number
): ShadowStyle => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0px ${offsetY}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    };
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: elevation,
  };
};

export const Shadows = {
  none: {},
  sm: createShadow(2, 0.08, 8, 2),
  md: createShadow(4, 0.12, 16, 4),
  lg: createShadow(8, 0.16, 24, 8),
  xl: createShadow(12, 0.2, 32, 12),
  // ✅ ظل زجاجي
  glass: createShadow(8, 0.1, 32, 8),
};

// ============================================
// ✅ أنماط الزجاج - Glassmorphism
// ============================================

export const GlassStyles = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Shadows.glass,
  },
  dark: {
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Shadows.glass,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...Shadows.md,
  },
  cardDark: {
    backgroundColor: 'rgba(44, 44, 46, 0.85)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Shadows.md,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  inputDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...Shadows.sm,
  },
  buttonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Shadows.sm,
  },
};

// ============================================
// الخطوط
// ============================================

export const Typography = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 28,
    xxxl: 34,
    display: 48,
  },
  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
};

// ============================================
// الأبعاد
// ============================================

export const Dimensions_App = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  headerHeight: 56,
  tabBarHeight: 84,
  buttonHeight: 50,
  inputHeight: 48,
  iconSize: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
  },
};

// ============================================
// الأنيميشن - Apple Style
// ============================================

export const Animation = {
  fast: 200,
  normal: 350,
  slow: 500,
  spring: {
    damping: 20,
    stiffness: 180,
    mass: 1,
  },
};

// ============================================
// دوال مساعدة
// ============================================

export const getColors = (isDark: boolean) => {
  return isDark ? DarkColors : Colors;
};

export const getSchemeColors = (scheme: ColorScheme) => {
  return SchemeColors[scheme];
};

export const getGlassStyle = (isDark: boolean, type: keyof typeof GlassStyles = 'card') => {
  if (type === 'card') return isDark ? GlassStyles.cardDark : GlassStyles.card;
  if (type === 'input') return isDark ? GlassStyles.inputDark : GlassStyles.input;
  if (type === 'button') return isDark ? GlassStyles.buttonDark : GlassStyles.button;
  return isDark ? GlassStyles.dark : GlassStyles.light;
};
