import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// الألوان
// ============================================

export const Colors = {
  // الألوان الأساسية
  primary: '#059669',        // أخضر إسلامي
  primaryLight: '#10B981',
  primaryDark: '#047857',
  
  secondary: '#6366F1',      // بنفسجي
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
// الوضع الليلي
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

// ============================================
// الظلال
// ============================================

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
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
