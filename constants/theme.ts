// constants/theme.ts

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  // Main colors
  primary: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  gold: string;
  
  // Background
  background: string;
  backgroundGradientStart: string;
  backgroundGradientEnd: string;
  
  // Surface (cards)
  surface: string;
  surfaceGlass: string;
  surfaceBorder: string;
  
  // Text
  foreground: string;
  foregroundSecondary: string;
  muted: string;
  
  // UI
  border: string;
  success: string;
  warning: string;
  error: string;
  
  // Tab Bar
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export const SchemeColors: Record<ColorScheme, ThemeColors> = {
  dark: {
    // Main colors - Islamic Teal/Cyan
    primary: '#1B8A8A',
    primaryLight: '#2DB3B3',
    secondary: '#0D5C5C',
    accent: '#3DD9D9',
    gold: '#D4AF37',
    
    // Background - Deep Islamic Green/Teal
    background: '#0A1F1F',
    backgroundGradientStart: '#0D2B2B',
    backgroundGradientEnd: '#061414',
    
    // Surface (Glassmorphism)
    surface: 'rgba(27, 138, 138, 0.15)',
    surfaceGlass: 'rgba(255, 255, 255, 0.08)',
    surfaceBorder: 'rgba(255, 255, 255, 0.12)',
    
    // Text
    foreground: '#FFFFFF',
    foregroundSecondary: 'rgba(255, 255, 255, 0.85)',
    muted: 'rgba(255, 255, 255, 0.5)',
    
    // UI
    border: 'rgba(255, 255, 255, 0.1)',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    
    // Tab Bar
    tabBarBackground: 'rgba(13, 43, 43, 0.95)',
    tabBarActive: '#2DB3B3',
    tabBarInactive: 'rgba(255, 255, 255, 0.4)',
  },
  
  light: {
    // Main colors
    primary: '#0D7377',
    primaryLight: '#14A3A8',
    secondary: '#E8F4F4',
    accent: '#0D7377',
    gold: '#C9A227',
    
    // Background
    background: '#F0F7F7',
    backgroundGradientStart: '#E8F4F4',
    backgroundGradientEnd: '#D4E8E8',
    
    // Surface
    surface: 'rgba(255, 255, 255, 0.85)',
    surfaceGlass: 'rgba(255, 255, 255, 0.7)',
    surfaceBorder: 'rgba(13, 115, 119, 0.15)',
    
    // Text
    foreground: '#1A3A3A',
    foregroundSecondary: '#2D5454',
    muted: '#6B8A8A',
    
    // UI
    border: 'rgba(13, 115, 119, 0.1)',
    success: '#2E7D32',
    warning: '#F57C00',
    error: '#D32F2F',
    
    // Tab Bar
    tabBarBackground: 'rgba(255, 255, 255, 0.95)',
    tabBarActive: '#0D7377',
    tabBarInactive: 'rgba(26, 58, 58, 0.4)',
  },
};

// Islamic Pattern SVG (للخلفية)
export const ISLAMIC_PATTERN_OPACITY = {
  dark: 0.03,
  light: 0.05,
};

// Glass effect settings
export const GLASS_BLUR = 20;
export const GLASS_OPACITY = 0.15;

// Card border radius
export const BORDER_RADIUS = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// Font sizes
export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  '4xl': 34,
  arabic: 24,
  arabicLarge: 32,
};
