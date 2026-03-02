// constants/theme.ts
import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// الألوان - Light Mode
// ============================================

export const Colors = {
  // الألوان الأساسية
  primary: '#059669',
  primaryLight: '#10B981',
  primaryDark: '#047857',
  
  secondary: '#6366F1',
  secondaryLight: '#818CF8',
  secondaryDark: '#4F46E5',
  
  // ألوان الخلفية
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  
  // ألوان النص
  text: '#111827',
  textSecondary: '#4B5563',
  textLight: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  
  // ألوان الحالة
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // ألوان إضافية
  white: '#FFFFFF',
  black: '#000000',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // ألوان خاصة
  gold: '#D4AF37',
  quranGreen: '#0D9488',
  prayerBlue: '#0284C7',
};

// ============================================
// الألوان - Dark Mode
// ============================================

export const DarkColors = {
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  
  secondary: '#818CF8',
  secondaryLight: '#A5B4FC',
  secondaryDark: '#6366F1',
  
  background: '#111827',
  surface: '#1F2937',
  surfaceVariant: '#374151',
  
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textLight: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  
  white: '#FFFFFF',
  black: '#000000',
  border: '#374151',
  divider: '#1F2937',
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  gold: '#FCD34D',
  quranGreen: '#14B8A6',
  prayerBlue: '#38BDF8',
};

// ============================================
// مخططات الألوان للـ ThemeLab
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

// Alias للتوافق
export const SPACING = Spacing;

// ============================================
// الزوايا المستديرة
// ============================================

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Alias للتوافق
export const BORDER_RADIUS = BorderRadius;

// ============================================
// أحجام الخطوط
// ============================================

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 48,
};

// ============================================
// الظلال - متوافقة مع Web و Native
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
  sm: createShadow(1, 0.05, 2, 1),
  md: createShadow(2, 0.1, 4, 3),
  lg: createShadow(4, 0.15, 8, 5),
  xl: createShadow(8, 0.2, 16, 8),
};

// ============================================
// الخطوط
// ============================================

export const Typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
    display: 48,
  },
  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
};

// ============================================
// الأبعاد
// ============================================

export const Dimensions_App = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  headerHeight: 60,
  tabBarHeight: 80,
  buttonHeight: 48,
  inputHeight: 50,
  iconSize: {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  },
};

// ============================================
// الأنيميشن
// ============================================

export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: {
    damping: 15,
    stiffness: 150,
  },
};

// ============================================
// دالة مساعدة للحصول على الألوان حسب الثيم
// ============================================

export const getColors = (isDark: boolean) => {
  return isDark ? DarkColors : Colors;
};

export const getSchemeColors = (scheme: ColorScheme) => {
  return SchemeColors[scheme];
};
