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
  /**
   * Unified widget "ink" — the single text colour used by EVERY widget (curated
   * images + date/hijri) so the look stays consistent per theme: gold on
   * olive/desert, white on dark/green/blue/slate, black on light/auto.
   * Mirrored in components/widgets/previews/shared.ts and widgets/ios/RoohWidgets.swift.
   */
  ink: `#${string}`;
}

// `muted` is now derived from `ink` at ~70% opacity (AARRGGBB hex) so every
// piece of text on a widget — heading AND secondary/countdown/list rows —
// shares the SAME hue per theme (white-on-white, gold-on-gold, never a
// contrasting tint like the old per-theme greens/blues/tans).
export const THEME_PALETTES: Record<WidgetThemeKey, WidgetPalette> = {
  auto: { bg: '#E3E0DB', surface: '#4DFFFFFF', text: '#3A3A39', muted: '#B3000000', isLight: true, ink: '#000000' },
  dark: { bg: '#373737', surface: '#1FFFFFFF', text: '#FFFFFF', muted: '#B3FFFFFF', isLight: false, ink: '#FFFFFF' },
  light: { bg: '#E3E0DB', surface: '#4DFFFFFF', text: '#3A3A39', muted: '#B3000000', isLight: true, ink: '#000000' },
  olive: { bg: '#293126', surface: '#1FFFFFFF', text: '#F2F3E8', muted: '#B3F9E8CB', isLight: false, ink: '#f9e8cb' },
  green: { bg: '#0E3B2E', surface: '#1AFFFFFF', text: '#E8F4EC', muted: '#B3FFFFFF', isLight: false, ink: '#FFFFFF' },
  blue: { bg: '#0F2B4D', surface: '#1AFFFFFF', text: '#E2ECF8', muted: '#B3FFFFFF', isLight: false, ink: '#FFFFFF' },
  desert: { bg: '#4C3523', surface: '#1AFFFFFF', text: '#F1E2C8', muted: '#B3F9E8CB', isLight: false, ink: '#f9e8cb' },
  slate: { bg: '#2A2D31', surface: '#1AFFFFFF', text: '#E5E8EC', muted: '#B3FFFFFF', isLight: false, ink: '#FFFFFF' },
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

// Names below MUST be a prefix of the asset font filename. RNAW resolves font
// names via `ResourceUtils.findAssetFont` which scans `assets/fonts/` and picks
// the first file whose basename starts with the requested name + ".".
//
// Examples:
//   "Amiri"        → searches Amiri.ttf       (no match — fallback to system font)
//   "Amiri-Regular" → searches Amiri-Regular.ttf  (correct)
//   "AmiriBold"    → searches AmiriBold.ttf    (no match)
//   "Amiri-Bold"   → searches Amiri-Bold.ttf  (correct)
export const FONT = {
  amiri: 'Amiri-Regular',
  amiriBold: 'Amiri-Bold',
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

/**
 * Bundled per-widget preview images, shipped in the JS bundle so they are ALWAYS
 * present regardless of disk state. Rendered by SnapshotWidget as a guaranteed
 * fallback when a widget has no baked PNG yet (fresh add before the first
 * foreground bake, cleared cache, or a generation failure) — so the user never
 * sees a blank/«Missing» card. Keyed by `${id}_${size}`. Light theme only
 * (matches resolveWidgetTheme('auto') → 'light').
 *
 * Generated by scripts/generate-android-widget-preview-images.mjs into
 * assets/images/widgets/fallback/. Only snapshot-based widgets are listed; live
 * widgets (azkar, day/month date) render via FlexWidget and never hit this path.
 * Keep this map in sync with the generated files (paths must be static literals
 * for Metro to bundle them).
 */
export const WIDGET_FALLBACK_PREVIEWS: Record<string, number> = {
  prayerSingle_small: require('@/assets/images/widgets/fallback/prayerSingle_small.png'),
  prayerTable_small: require('@/assets/images/widgets/fallback/prayerTable_small.png'),
  prayerTable_medium: require('@/assets/images/widgets/fallback/prayerTable_medium.png'),
  prayerTable_large: require('@/assets/images/widgets/fallback/prayerTable_large.png'),
  prayerNextPrevious_medium: require('@/assets/images/widgets/fallback/prayerNextPrevious_medium.png'),
  verseOfDay_medium: require('@/assets/images/widgets/fallback/verseOfDay_medium.png'),
  hijriDate_small: require('@/assets/images/widgets/fallback/hijriDate_small.png'),
  hijriDate_medium: require('@/assets/images/widgets/fallback/hijriDate_medium.png'),
};

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
    'صلاة الجمعة': 'Jumuah',
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

export function usesArabicNumerals(
  pref: 'auto' | 'arabic' | 'western' | undefined,
  arFallback: boolean,
): boolean {
  if (pref === 'arabic') return true;
  if (pref === 'western') return false;
  return arFallback;
}

export function watermarkFontFor(
  pref: 'auto' | 'arabic' | 'western' | undefined,
  arFallback: boolean,
  calligraphyFont: string,
): string {
  return usesArabicNumerals(pref, arFallback) ? calligraphyFont : FONT.rubikBold;
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
