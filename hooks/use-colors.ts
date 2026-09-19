// hooks/use-colors.ts

import { useCallback } from "react";
import { Platform } from "react-native";
import { useSettings, FontSize } from "@/contexts/SettingsContext";
import { Colors, DarkColors, ModalColors } from "@/constants/theme";
import { getContrastPalette, getContrastTextColor, blendWithDimOverlay, getLuminance } from "@/lib/contrast-helper";
import { APP_BACKGROUNDS } from "@/lib/backgrounds";
import { useThemeConfig } from "@/contexts/ThemeConfigContext";

// ─── Font-scale map (kept here to co-locate with useColors for zero-import usage)
const FONT_SCALE: Record<FontSize, number> = {
  small: 0.875,
  medium: 1.0,
  large: 1.125,
  xlarge: 1.25,
};

// Extended colors object that includes commonly-used UI properties
const LightColors = {
  ...Colors,
  card: '#FFFFFF',
  cardGlass: Colors.cardGlass,
};

const DarkColorsExtended = {
  ...DarkColors,
  card: '#1a222a',
  cardGlass: DarkColors.cardGlass,
};

function parseLocalDate(value?: string): number | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).getTime();
}

function getActiveSeasonalThemeColors(seasonalThemes?: any[]) {
  if (!Array.isArray(seasonalThemes)) return undefined;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const activeTheme = seasonalThemes.find(theme => {
    if (!theme?.isActive) return false;
    const start = parseLocalDate(theme.startDate);
    const end = parseLocalDate(theme.endDate);
    return start !== null && end !== null && today >= start && today <= end;
  });

  return activeTheme?.colors;
}

export function useColors() {
  const { isDarkMode, settings } = useSettings();
  const { themeConfig } = useThemeConfig();

  // Merge: hardcoded defaults → admin Firestore overrides → active seasonal overrides
  const baseAdminOverrides = isDarkMode ? themeConfig?.dark : themeConfig?.light;
  const seasonalOverrides = getActiveSeasonalThemeColors(themeConfig?.seasonalThemes);
  const adminOverrides = seasonalOverrides
    ? { ...(baseAdminOverrides || {}), ...seasonalOverrides }
    : baseAdminOverrides;
  const baseColors = isDarkMode ? DarkColorsExtended : LightColors;
  // Sanitize admin overrides: an admin can accidentally publish an unusable
  // brand color (e.g. primary = "#FFFFFF" in light mode, primary = "#d6d6d6"
  // in dark mode). Such values destroy contrast on every CTA / active tab /
  // accent in the app. Reject overrides that are too extreme and keep the
  // hardcoded brand green instead.
  const sanitizedOverrides = (() => {
    if (!adminOverrides) return adminOverrides;
    const out: any = { ...adminOverrides };
    const primary = (adminOverrides as any).primary as string | undefined;
    if (primary) {
      const lum = getLuminance(primary);
      // In dark mode reject very-light primaries (would look like a white pill).
      // In light mode reject very-light primaries (would vanish on white surfaces).
      // Always reject pitch black (would vanish in dark mode).
      if (lum > 0.7 || lum < 0.03) {
        delete out.primary;
      }
    }
    return out;
  })();
  const colors = sanitizedOverrides ? { ...baseColors, ...sanitizedOverrides } : baseColors;

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
    // Custom theme always uses dark backgrounds → force white text
    if (settings.theme === 'custom') {
      bgTextColor = 'white';
    } else if (builtInBg?.dominantColor) {
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
    ? (bgTextColor === 'white' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)')
    : colors.textLight;

  // When a background is active, use a semi-opaque card overlay so cards stay visibly
  // separated from the background image (otherwise neighbouring cards "bleed" together
  // and the grid looks like floating text). Use a slightly heavier alpha on Android
  // because there's no BlurView underneath to add depth.
  const cardSolid = hasBgOverride
    ? (bgTextColor === 'white'
        ? (Platform.OS === 'android' ? 'rgba(15,25,30,0.55)' : 'rgba(0,0,0,0.30)')
        : (Platform.OS === 'android' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.65)'))
    : colors.card;
  const card = cardSolid;
  const cardElevation = undefined;
  const modalSurface = hasBgOverride
    ? (bgTextColor === 'white' ? ModalColors.cardDark : ModalColors.cardLight)
    : (isDarkMode ? ModalColors.cardDark : ModalColors.cardLight);

  // Icon color override: adapt for bg-override mode
  const icon = hasBgOverride
    ? (bgTextColor === 'white' ? 'rgba(255,255,255,0.85)' : '#525252')
    : (colors.icon ?? (isDarkMode ? '#A3A3A3' : '#525252'));

  // Glass card text colors — for cards with semi-transparent overlays like:
  // Dark mode: rgba(30,30,30,0.40) + BlurView → light text needed
  // Light mode: rgba(255,255,255,0.60) + BlurView → dark text needed
  // These colors are INDEPENDENT of hasBgOverride and always match the card's own local background.
  // Secondary text uses a darker tone (0.78) in light mode so labels sitting on
  // frosted-white cards still clear WCAG AA against the pale backdrop.
  const glassText = isDarkMode ? '#FFFFFF' : '#0F172A';
  const glassTextLight = isDarkMode ? 'rgba(255,255,255,0.78)' : 'rgba(15,23,42,0.78)';
  const glassIcon = isDarkMode ? 'rgba(255,255,255,0.9)' : '#334155';

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

  // Tab bar background — theme-aware for Android Material Design 3 compatibility
  // Light mode: slightly darker than background for subtle elevation
  // Dark mode: slightly lighter than background
  // Custom background active: semi-transparent dark overlay
  const tabBarBackground = hasBgOverride
    ? 'rgba(0,0,0,0.92)'
    : isDarkMode
      ? '#1a222a'
      : '#E0E0E0';

  // Primary color for TEXT usage — darker in light mode for better contrast
  // Use colors.primary for backgrounds/buttons, use primaryText for text
  const primaryText = isDarkMode ? colors.primary : '#086B4A';

  // Font scaling based on user's display font-size preference
  const _scale = FONT_SCALE[settings.display.fontSize] ?? 1;
  const fs = useCallback(
    (baseSize: number): number => Math.round(baseSize * _scale),
    [_scale],
  );

  return {
    ...colors,
    text,
    textLight,
    card,
    /** Semi-transparent card bg for components that NEED a visible background (headers, search bars, modals) */
    cardSolid,
    /** Guaranteed FULLY OPAQUE surface for modals/bottom sheets. */
    modalSurface,
    /** Elevation override: 0 on Android when bg override is active, undefined otherwise */
    cardElevation: cardElevation as number | undefined,
    icon,
    tabBarBackground,
    primaryText,
    /** Scale a base font size by the user's display preference */
    fs,
    // Aliases used by many pages (maps to SchemeColors naming)
    foreground: text,
    muted: textLight,
    /** Whether a dynamic photo background is active */
    hasDynamicBg,
    /** Whether a background image is overriding text colors */
    hasBgOverride,
    /** Text shadow style for readability on photo backgrounds */
    textShadowStyle,
    /** Get contrast-aware text color for any background */
    getTextColor: (bg: string) => getContrastTextColor(bg),
    /** Get full contrast palette for any background */
    getContrastPalette: (bg: string) => getContrastPalette(bg),
    /** Whether the app is currently in dark mode */
    isDarkMode,
    /** Correct StatusBar style accounting for dark mode AND background override */
    statusBarStyle: (isDarkMode || (hasBgOverride && bgTextColor === 'white') ? 'light' : 'dark') as 'light' | 'dark',
    // Glass card colors — use these for cards with BlurView + semi-transparent overlay
    // These are safe regardless of global app background
    /** Text color for glass cards (dark text in light mode, light text in dark mode) */
    glassText,
    /** Secondary text color for glass cards */
    glassTextLight,
    /** Icon color for glass cards */
    glassIcon,
  };
}
