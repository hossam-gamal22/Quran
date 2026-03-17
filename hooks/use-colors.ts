// hooks/use-colors.ts

import { useSettings } from "@/contexts/SettingsContext";
import { Colors, DarkColors } from "@/constants/theme";
import { getContrastPalette, getContrastTextColor, blendWithDimOverlay, getLuminance } from "@/lib/contrast-helper";
import { APP_BACKGROUNDS } from "@/lib/backgrounds";
import { useThemeConfig } from "@/contexts/ThemeConfigContext";

// Extended colors object that includes commonly-used UI properties
const LightColors = {
  ...Colors,
  card: '#FFFFFF',
  cardGlass: Colors.cardGlass,
};

const DarkColorsExtended = {
  ...DarkColors,
  card: '#1a1f2b',
  cardGlass: DarkColors.cardGlass,
};

export function useColors() {
  const { isDarkMode, settings } = useSettings();
  const { themeConfig } = useThemeConfig();
  
  // Merge: hardcoded defaults → admin Firestore overrides
  const adminOverrides = isDarkMode ? themeConfig?.dark : themeConfig?.light;
  const baseColors = isDarkMode ? DarkColorsExtended : LightColors;
  const colors = adminOverrides ? { ...baseColors, ...adminOverrides } : baseColors;

  // Override text colors when a background is active
  const appBg = settings.display.appBackground;
  const opacity = settings.display.backgroundOpacity ?? 0.2;
  const builtInBg = APP_BACKGROUNDS.find(bg => bg.id === appBg);

  // Auto-contrast: use dominantColor + getLuminance when available
  // If opacity is very low (<0.3) in light mode, don't override text colors
  // because the background image barely shows through
  const isActive = appBg !== 'none';
  const skipOverride = isActive && opacity < 0.3 && !isDarkMode;

  let bgTextColor: 'white' | 'black' | undefined;
  if (isActive && !skipOverride) {
    if (builtInBg?.dominantColor) {
      // Auto-detect from dominantColor
      bgTextColor = getContrastTextColor(builtInBg.dominantColor) === '#FFFFFF' ? 'white' : 'black';
    } else if (builtInBg?.textColor) {
      bgTextColor = builtInBg.textColor;
    } else if (appBg === 'dynamic' && (settings.display as any).dynamicBgColor) {
      // Smart contrast: blend photo avg_color with dim overlay to get effective color
      const photoColor = (settings.display as any).dynamicBgColor as string;
      const dimEnabled = settings.display.dimEnabled;
      const dimOpacity = (settings.display as any).dimOpacity ?? 0.55;
      const effectiveColor = dimEnabled
        ? blendWithDimOverlay(photoColor, dimOpacity)
        : photoColor;
      bgTextColor = getContrastTextColor(effectiveColor) === '#FFFFFF' ? 'white' : 'black';
    } else if (settings.display.appBackgroundTextColor) {
      bgTextColor = settings.display.appBackgroundTextColor as 'white' | 'black';
    }
  }

  const hasBgOverride = isActive && !skipOverride && !!bgTextColor;

  const text = hasBgOverride
    ? (bgTextColor === 'white' ? '#FFFFFF' : '#1C1C1E')
    : colors.text;
  const textLight = hasBgOverride
    ? (bgTextColor === 'white' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)')
    : colors.textLight;

  // When a background is active, use glass card colors for better integration
  const card = hasBgOverride
    ? (bgTextColor === 'white' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')
    : colors.card;

  const hasDynamicBg = isActive && appBg === 'dynamic';

  // Text shadow — adaptive based on how much contrast the dim provides
  // High dim = dark bg, white text is clear → lighter shadow
  // Low dim = photo shows through → stronger shadow for white text, or none for dark text
  const dynamicBgColor = (settings.display as any).dynamicBgColor as string | undefined;
  const dimOpacityVal = (settings.display as any).dimOpacity ?? 0.55;
  let textShadowStyle: Record<string, any> = {};
  if (hasDynamicBg) {
    if (bgTextColor === 'black') {
      // Dark text on light bg — use subtle light shadow for depth
      textShadowStyle = {
        textShadowColor: 'rgba(255,255,255,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      };
    } else if (dynamicBgColor && settings.display.dimEnabled) {
      // White text — shadow strength inversely proportional to dim
      const shadowOpacity = dimOpacityVal >= 0.5 ? 0.3 : 0.7;
      textShadowStyle = {
        textShadowColor: `rgba(0,0,0,${shadowOpacity})`,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: dimOpacityVal >= 0.5 ? 2 : 4,
      };
    } else {
      // Fallback: strong shadow
      textShadowStyle = {
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      };
    }
  }

  return {
    ...colors,
    text,
    textLight,
    card,
    // Aliases used by many pages (maps to SchemeColors naming)
    foreground: text,
    muted: textLight,
    /** Whether a dynamic photo background is active */
    hasDynamicBg,
    /** Text shadow style for readability on photo backgrounds */
    textShadowStyle,
    /** Get contrast-aware text color for any background */
    getTextColor: (bg: string) => getContrastTextColor(bg),
    /** Get full contrast palette for any background */
    getContrastPalette: (bg: string) => getContrastPalette(bg),
  };
}
