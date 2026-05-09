// components/widgets/android/shared.ts
// Glass design tokens + theme palettes for Android widgets.
// Mirrors palette() in widgets/ios/RoohWidgets.swift so iOS and Android match 1:1.

export const GLASS = {
  /** Translucent dark surface — main widget background. */
  bg: '#B3000000' as const, // ~70% black
  /** Stronger surface for inner cards/highlight rows. */
  surface: '#26FFFFFF' as const, // 15% white
  /** Hairline border matching iOS .ultraThinMaterial overlay. */
  border: '#33FFFFFF' as const, // 20% white
  /** Subtle inner divider. */
  divider: '#1AFFFFFF' as const, // 10% white
  // Text
  text: '#FFFFFF' as const,
  textMuted: '#B3FFFFFF' as const, // 70% white
  textFaint: '#80FFFFFF' as const, // 50% white
  // Accent (single white-tone — no per-widget colors)
  accent: '#FFFFFF' as const,
  accentMuted: '#CCFFFFFF' as const, // 80% white
  // Spacing/radius
  radius: 22,
  radiusInner: 14,
  padding: 14,
  headerHeight: 22,
} as const;

// ========================================
// Theme palettes — match iOS RoohTheme palette() in widgets/ios/RoohWidgets.swift.
// ========================================

export type WidgetThemeKey =
  | 'auto'
  | 'dark'
  | 'light'
  | 'olive'
  | 'green'
  | 'blue'
  | 'desert'
  | 'slate';

export interface WidgetPalette {
  bg: `#${string}`;
  surface: `#${string}`;
  text: `#${string}`;
  muted: `#${string}`;
  isLight: boolean;
}

export const THEME_PALETTES: Record<WidgetThemeKey, WidgetPalette> = {
  auto: { bg: '#373737', surface: '#1FFFFFFF', text: '#FFFFFF', muted: '#B3FFFFFF', isLight: false },
  dark: { bg: '#373737', surface: '#1FFFFFFF', text: '#FFFFFF', muted: '#B3FFFFFF', isLight: false },
  light: { bg: '#E3E0DB', surface: '#4DFFFFFF', text: '#3A3A39', muted: '#5E5E5C', isLight: true },
  olive: { bg: '#293126', surface: '#1FFFFFFF', text: '#F2F3E8', muted: '#C7CBB8', isLight: false },
  green: { bg: '#0E3B2E', surface: '#1AFFFFFF', text: '#E8F4EC', muted: '#9EC4B0', isLight: false },
  blue: { bg: '#0F2B4D', surface: '#1AFFFFFF', text: '#E2ECF8', muted: '#94B2D0', isLight: false },
  desert: { bg: '#4C3523', surface: '#1AFFFFFF', text: '#F1E2C8', muted: '#C9AC85', isLight: false },
  slate: { bg: '#2A2D31', surface: '#1AFFFFFF', text: '#E5E8EC', muted: '#A3ABB3', isLight: false },
};

/**
 * Resolves the widget palette to use for a given theme key.
 * Falls back to "dark" when nothing was selected.
 */
export function paletteFor(theme?: string): WidgetPalette {
  if (!theme) return THEME_PALETTES.auto;
  const t = theme as WidgetThemeKey;
  return THEME_PALETTES[t] ?? THEME_PALETTES.auto;
}

export const FONT = {
  amiri: 'Amiri',
  amiriBold: 'AmiriBold',
  /** Decorative Arabic + Latin headings (default Glassify-style font). */
  widget: 'WidgetFont',
  /** Alternate Glassify-style font — user can opt-in via app settings. */
  widget2: 'WidgetFont2',
  /** Body / numerals. */
  rubik: 'Rubik-Regular',
  rubikMedium: 'Rubik-Medium',
  rubikBold: 'Rubik-Bold',
  /** Mushaf script — only for Quran verses. */
  uthmanic: 'KFGQPC-Uthmanic-Script',
} as const;

/** User-selectable font for Date/Prayer/Hijri widgets. */
export function widgetFontFamily(variant?: 'widget1' | 'widget2'): string {
  return variant === 'widget2' ? 'WidgetFont2' : 'WidgetFont';
}

/** Locked WidgetFont2 family for Azkar/Dhikr widgets (always Font 2 regardless of user choice). */
export const AZKAR_FONT_FAMILY = 'WidgetFont2';

// App icon (used only by the in-app gallery preview, NOT inside widgets)
export const APP_ICON = require('@/assets/images/icons/icon.png');

// ========================================
// Localization helpers — language-aware rendering
// ========================================

/** Returns true when the widget should render Arabic-only (app language is Arabic). */
export function isArabicLang(lang?: string): boolean {
  return (lang || 'ar') === 'ar';
}

/** Map an Arabic prayer label to its English equivalent. */
export function prayerLabelEn(arabic: string): string {
  const map: Record<string, string> = {
    'الفجر': 'Fajr',
    'الشروق': 'Sunrise',
    'الظهر': 'Dhuhr',
    'العصر': 'Asr',
    'المغرب': 'Maghrib',
    'العشاء': 'Isha',
  };
  return map[arabic] ?? arabic;
}

/** Localized "in 1h 23m" / "بعد 1س 23د" countdown with numeral conversion. */
export function formatCountdown(
  remaining: string,
  isArabic: boolean,
  numerals?: 'auto' | 'arabic' | 'western',
): string {
  if (!remaining || remaining === '--:--' || remaining === '—') return '—';
  const digits = applyNumerals(remaining, numerals, isArabic);
  return isArabic ? `بعد ${digits}` : `in ${digits}`;
}

// ========================================
// Numeral helper — respects the user's widgetNumerals choice.
// ========================================

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicIndic(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[parseInt(d, 10)] ?? d);
}

export function applyNumerals(
  value: string | number,
  pref: 'auto' | 'arabic' | 'western' | undefined,
  arFallback: boolean,
): string {
  if (pref === 'arabic') return toArabicIndic(value);
  if (pref === 'western') return String(value);
  return arFallback ? toArabicIndic(value) : String(value);
}

// ========================================
// Language resolver — pulls explicit preference, else falls back to the data lang.
// ========================================

export function resolveIsArabic(
  widgetLanguage: string | undefined,
  dataLanguage: string | undefined,
): boolean {
  if (widgetLanguage === 'ar') return true;
  if (widgetLanguage === 'en') return false;
  return (dataLanguage || 'ar') === 'ar';
}
