// constants/theme.ts
import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// الألوان - Light Mode
// ============================================

export const Colors = {
  // الألوان الأساسية
  primary: '#0d8e62',
  primaryLight: '#3da87e',
  primaryDark: '#0a7050',
  
  // الألوان الثانوية
  secondary: '#525252',
  secondaryLight: '#525252',
  secondaryDark: '#404040',
  
  // الخلفيات والأسطح - AAA Grayscale Palette
  background: '#eaeaea',
  surface: '#F5F5F5',
  surfaceVariant: '#FFFFFF',
  
  // النصوص - تباين عالي AAA
  text: '#171717',
  textSecondary: '#262626',
  textLight: '#525252',
  textOnPrimary: '#FFFFFF',
  
  // ألوان الأيقونات - تباين عالي
  icon: '#525252',
  iconMuted: '#636363',
  iconActive: '#0d8e62',
  
  // حالات
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',
  
  // ألوان أساسية
  white: '#FFFFFF',
  black: '#000000',
  
  // الحدود والفواصل - AAA
  border: '#D1D1D1',
  divider: '#E0E0E0',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // ألوان خاصة
  gold: '#FFD700',
  quranGreen: '#0d8e62',
  prayerBlue: '#007AFF',
  
  // ألوان زجاجية — Apple iOS frosted glass
  glass: 'rgba(255, 255, 255, 0.65)',
  glassDark: 'rgba(255, 255, 255, 0.50)',
  glassLight: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  cardGlass: 'rgba(255, 255, 255, 0.65)',

  // Aliases used by admin screens
  textMuted: '#525252',
  accent: '#0d8e62',
  shadow: '#000000',
};

// ============================================
// الألوان - Dark Mode
// ============================================

export const DarkColors = {
  // الألوان الأساسية
  primary: '#0d8e62',
  primaryLight: '#3da87e',
  primaryDark: '#0a7050',
  
  // الألوان الثانوية
  secondary: '#A3A3A3',
  secondaryLight: '#D4D4D4',
  secondaryDark: '#8A8A8A',
  
  // الخلفيات والأسطح - AAA Grayscale Palette
  background: '#151719',
  surface: '#1a222a',
  surfaceVariant: '#232d38',
  
  // النصوص - AAA
  text: '#FAFAFA',
  textSecondary: '#E5E5E5',
  textLight: '#A3A3A3',
  textOnPrimary: '#FFFFFF',
  
  // ألوان الأيقونات
  icon: '#A3A3A3',
  iconMuted: '#8A8A8A',
  iconActive: '#0d8e62',
  
  // حالات
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#0A84FF',
  
  // ألوان أساسية
  white: '#FFFFFF',
  black: '#000000',
  
  // الحدود والفواصل - AAA
  border: '#2d3740',
  divider: '#232d38',
  overlay: 'rgba(0, 0, 0, 0.6)',
  
  // ألوان خاصة
  gold: '#FFD60A',
  quranGreen: '#0d8e62',
  prayerBlue: '#0A84FF',
  
  // ألوان زجاجية — Apple iOS frosted glass dark
  glass: 'rgba(26, 34, 42, 0.65)',
  glassDark: 'rgba(26, 34, 42, 0.55)',
  glassLight: 'rgba(26, 34, 42, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  cardGlass: 'rgba(26, 34, 42, 0.65)',

  // Aliases used by admin screens
  textMuted: '#A3A3A3',
  accent: '#0d8e62',
  shadow: '#000000',
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
    icon: Colors.icon,
    iconMuted: Colors.iconMuted,
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
    icon: DarkColors.icon,
    iconMuted: DarkColors.iconMuted,
  },
};

export type ThemeColors = typeof SchemeColors.light;

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
  glass: createShadow(8, 0.1, 32, 8),
};

// ============================================
// أنماط الزجاج - Glassmorphism
// ============================================

export const GlassStyles = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    ...Shadows.glass,
  },
  dark: {
    backgroundColor: 'rgba(30, 30, 30, 0.20)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    ...Shadows.glass,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: BorderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Shadows.md,
  },
  cardDark: {
    backgroundColor: 'rgba(36, 43, 58, 0.85)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...Shadows.md,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  inputDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
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
// الألوان الثانوية المتاحة للتخصيص
// ============================================

export const AvailableAccentColors = [
  { name: 'أخضر', nameEn: 'Green', value: '#0d8e62' },
  { name: 'أزرق', nameEn: 'Blue', value: '#007AFF' },
  { name: 'بنفسجي', nameEn: 'Purple', value: '#5856D6' },
  { name: 'وردي', nameEn: 'Pink', value: '#FF2D55' },
  { name: 'برتقالي', nameEn: 'Orange', value: '#FF9500' },
  { name: 'أحمر', nameEn: 'Red', value: '#FF3B30' },
  { name: 'ذهبي', nameEn: 'Gold', value: '#FFD700' },
  { name: 'تركواز', nameEn: 'Teal', value: '#5AC8FA' },
];

// ============================================
// ألوان البطاقات (10 لون للآيات والأدعية)
// ============================================

export const CARD_COLORS = [
  '#1e3a5f', // أزرق داكن
  '#0d8e62', // أخضر إسلامي
  '#5b21b6', // بنفسجي
  '#7c2d12', // بني محروق
  '#1e40af', // أزرق ملكي
  '#be123c', // أحمر وردي
  '#065f46', // أخضر زمردي
  '#4c1d95', // نيلي
  '#92400e', // ذهبي داكن
  '#1f2937', // رمادي فحمي
];

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

// دالة لتحديث اللون الثانوي (للاستخدام في الإعدادات)
export const getColorsWithAccent = (isDark: boolean, accentColor: string) => {
  const baseColors = isDark ? { ...DarkColors } : { ...Colors };
  return {
    ...baseColors,
    primary: accentColor,
    primaryLight: accentColor + 'CC',
    primaryDark: accentColor,
    quranGreen: accentColor,
  };
};
