// hooks/use-colors.ts

import { useSettings } from "@/contexts/SettingsContext";
import { Colors, DarkColors } from "@/constants/theme";
import { getContrastPalette, getContrastTextColor } from "@/lib/contrast-helper";

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
  const colors = isDarkMode ? DarkColorsExtended : LightColors;

  // Override text colors when a dynamic background with explicit textColor is active
  const bgTextColor = settings.display.appBackgroundTextColor;
  const hasBgOverride = settings.display.appBackground !== 'none' && bgTextColor;

  const text = hasBgOverride
    ? (bgTextColor === 'white' ? '#FFFFFF' : '#1C1C1E')
    : colors.text;
  const textLight = hasBgOverride
    ? (bgTextColor === 'white' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)')
    : colors.textLight;

  return {
    ...colors,
    text,
    textLight,
    // Aliases used by many pages (maps to SchemeColors naming)
    foreground: text,
    muted: textLight,
    /** Get contrast-aware text color for any background */
    getTextColor: (bg: string) => getContrastTextColor(bg),
    /** Get full contrast palette for any background */
    getContrastPalette: (bg: string) => getContrastPalette(bg),
  };
}
