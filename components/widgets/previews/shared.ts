// components/widgets/previews/shared.ts
// Shared helpers + theme palettes for in-app widget previews.
// Mirrors lib/widget-data + widgets/ios/RoohWidgets.swift palette() so previews
// look identical to the rendered native widgets.

import { Dimensions } from 'react-native';
import { gregorianToHijri, HIJRI_MONTHS_AR } from '@/lib/hijri-date';

export type WidgetThemeKey =
  | 'auto'
  | 'dark'
  | 'light'
  | 'olive'
  | 'green'
  | 'blue'
  | 'desert'
  | 'slate';

export type WidgetDateFormat =
  | 'none'
  | 'gregorian-ar'
  | 'hijri-ar'
  | 'gregorian-en'
  | 'hijri-en';


export type PreviewSize = 'small' | 'medium' | 'large';

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function latinToArabicDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => AR_DIGITS[parseInt(d, 10)] ?? d);
}

export function formatTimeHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatDateSlash(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear());
  return `${d} / ${m} / ${y}`;
}

export interface ThemePalette {
  background: string;
  surface: string;
  text: string;
  muted: string;
  faint: string;
  isLight: boolean;
}

/**
 * Mirrors palette() in widgets/ios/RoohWidgets.swift. Defaults to dark.
 */
export const PREVIEW_PALETTE: ThemePalette = {
  background: '#1C1C1E',
  surface: 'rgba(255,255,255,0.12)',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.62)',
  faint: 'rgba(255,255,255,0.32)',
  isLight: false,
};

// ────────────────────────────────────────────────────────
// Size constants
// ────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Small widget = square ~155×155. */
export const SMALL_DIM = 155;

/** Medium widget = wide ~329×155 (clamped to screen). */
export const MEDIUM_WIDTH = Math.min(329, SCREEN_WIDTH - 32);
export const MEDIUM_HEIGHT = 155;

/** Large widget = tall ~329×345 (clamped). */
export const LARGE_WIDTH = Math.min(329, SCREEN_WIDTH - 32);
export const LARGE_HEIGHT = 345;

export function getSizeDims(size: PreviewSize): { width: number; height: number } {
  if (size === 'small') return { width: SMALL_DIM, height: SMALL_DIM };
  if (size === 'medium') return { width: MEDIUM_WIDTH, height: MEDIUM_HEIGHT };
  return { width: LARGE_WIDTH, height: LARGE_HEIGHT };
}

// ────────────────────────────────────────────────────────
// Localised labels (Arabic first, English fallback)
// ────────────────────────────────────────────────────────

export const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
// Full weekday names to match Glassify's English presentation (e.g. "Friday").
export const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export interface DateInfo {
  weekdayAr: string;
  weekdayEn: string;
  day: number;
  monthEn: string;
  monthAr: string;
  year: number;
}

export function getDateInfo(date: Date = new Date()): DateInfo {
  const dow = date.getDay();
  const m = date.getMonth();
  return {
    weekdayAr: WEEKDAYS_AR[dow] ?? 'الجمعة',
    weekdayEn: WEEKDAYS_EN[dow] ?? 'Friday',
    day: date.getDate(),
    monthEn: MONTHS_EN[m] ?? 'MAY',
    monthAr: MONTHS_AR[m] ?? 'مايو',
    year: date.getFullYear(),
  };
}

// ────────────────────────────────────────────────────────
// Font selection — matches Swift/Android widget font logic
// ────────────────────────────────────────────────────────

/**
 * Returns the user-selected widget font family for Date/Prayer/Hijri previews.
 * Mirrors `arabicFont()` in widgets/ios/RoohWidgets.swift and
 * `widgetFontFamily()` in components/widgets/android/shared.ts.
 *
 * Accepts an optional variant override so callers that already have access to
 * settings don't need a second context read.
 */
export function useWidgetFontFamily(variant?: 'widget1' | 'widget2'): string {
  return variant === 'widget2' ? 'WidgetFont2' : 'WidgetFont';
}

/** Locked WidgetFont2 family for Azkar/Dhikr previews — bypasses user choice. */
// Phase E (C1): default Azkar font is Amiri-Regular (clean Naskh). Bold
// emphasis is only used for titles + count badges, not body dhikr text.
export const AZKAR_PREVIEW_FONT = 'Amiri';

/**
 * Prayer name labels (next/prev, table, single) — always Rubik for Arabic + Latin
 * (matches Glassify — bold Rubik for prayer names).
 */
export const PRAYER_NAME_FONT = 'Rubik-Bold';

// ────────────────────────────────────────────────────────
// Theme palettes for previews — mirrors palette() in RoohWidgets.swift
// ────────────────────────────────────────────────────────

export const PREVIEW_PALETTES: Record<WidgetThemeKey, ThemePalette> = {
  auto: {
    background: '#E3E0DB',
    surface: 'rgba(255,255,255,0.30)',
    text: '#3A3A39',
    muted: '#5E5E5C',
    faint: 'rgba(58,58,57,0.32)',
    isLight: true,
  },
  dark: {
    background: '#373737',
    surface: 'rgba(255,255,255,0.12)',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.62)',
    faint: 'rgba(255,255,255,0.32)',
    isLight: false,
  },
  light: {
    background: '#E3E0DB',
    surface: 'rgba(255,255,255,0.30)',
    text: '#3A3A39',
    muted: '#5E5E5C',
    faint: 'rgba(58,58,57,0.32)',
    isLight: true,
  },
  olive: {
    background: '#293126',
    surface: 'rgba(255,255,255,0.10)',
    text: '#F2F3E8',
    muted: '#C7CBB8',
    faint: 'rgba(215,227,162,0.32)',
    isLight: false,
  },
  green: {
    background: '#0E3B2E',
    surface: 'rgba(255,255,255,0.10)',
    text: '#E8F4EC',
    muted: '#9EC4B0',
    faint: 'rgba(52,198,138,0.32)',
    isLight: false,
  },
  blue: {
    background: '#0F2B4D',
    surface: 'rgba(255,255,255,0.10)',
    text: '#E2ECF8',
    muted: '#94B2D0',
    faint: 'rgba(93,164,240,0.32)',
    isLight: false,
  },
  desert: {
    background: '#4C3523',
    surface: 'rgba(255,255,255,0.10)',
    text: '#F1E2C8',
    muted: '#C9AC85',
    faint: 'rgba(216,176,122,0.32)',
    isLight: false,
  },
  slate: {
    background: '#2A2D31',
    surface: 'rgba(255,255,255,0.10)',
    text: '#E5E8EC',
    muted: '#A3ABB3',
    faint: 'rgba(154,168,181,0.32)',
    isLight: false,
  },
};

export function paletteFor(theme: WidgetThemeKey | undefined): ThemePalette {
  if (!theme) return PREVIEW_PALETTES.auto;
  return PREVIEW_PALETTES[theme] ?? PREVIEW_PALETTES.auto;
}

// ────────────────────────────────────────────────────────
// Numeral helper — respects the user's widgetNumerals choice.
// ────────────────────────────────────────────────────────

export type NumeralPref = 'auto' | 'arabic' | 'western';

export function applyNumerals(
  value: string | number,
  pref: NumeralPref,
  arFallback: boolean,
): string {
  if (pref === 'arabic') return latinToArabicDigits(value);
  if (pref === 'western') return String(value);
  return arFallback ? latinToArabicDigits(value) : String(value);
}

/**
 * Returns whether the user's numeral choice resolves to Arabic-Indic digits.
 * Mirrors Swift's `context.usesArabicNumerals`.
 */
export function usesArabicNumerals(pref: NumeralPref, arFallback: boolean): boolean {
  if (pref === 'arabic') return true;
  if (pref === 'western') return false;
  return arFallback;
}

/**
 * Picks the right font family for the big watermark digit on Thuluth/Simple
 * widgets. When the digit will render in Arabic-Indic script we use the same
 * calligraphy face as the main text so it sits inside the artwork; when it's
 * in Latin we switch to Rubik so the glyphs aren't mangled by the calligraphy
 * font's missing Latin shapes.
 */
export function watermarkFontFor(pref: NumeralPref, arFallback: boolean, calligraphyFont: string): string {
  return usesArabicNumerals(pref, arFallback) ? calligraphyFont : 'Rubik-Bold';
}

// ────────────────────────────────────────────────────────
// Date format sample helper — matches Glassify dropdown values.
// Used both as a label inside the settings dropdown and as the live
// rendered text inside MonthSimplePreview.
// ────────────────────────────────────────────────────────

export function formatDateSample(
  date: Date,
  fmt: WidgetDateFormat,
  numerals?: NumeralPref | undefined,
  isArabic?: boolean,
): string {
  if (fmt === 'none') return '';
  const num = (v: string | number) => applyNumerals(v, numerals as NumeralPref, isArabic ?? false);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear());
  if (fmt === 'gregorian-ar') return `${num(y)} / ${num(m)} / ${num(d)}`;
  if (fmt === 'gregorian-en') return `${num(d)} / ${num(m)} / ${num(y)}`;
  const hijri = gregorianToHijri(date);
  const hd = String(hijri.day).padStart(2, '0');
  const hm = String(hijri.month).padStart(2, '0');
  const hy = String(hijri.year);
  if (fmt === 'hijri-ar') return `${num(hy)} / ${num(hm)} / ${num(hd)}`;
  if (fmt === 'hijri-en') return `${num(hd)} / ${num(hm)} / ${num(hy)}`;
  return '';
}

/**
 * Resolves which calendar to use for a given setting. When `auto`, uses Hijri for Arabic UI
 * and Gregorian otherwise. Used by previews and Swift fallback.
 */
export function resolveCalendar(
  pref: 'auto' | 'gregorian' | 'hijri' | undefined,
  isArabic: boolean,
): 'gregorian' | 'hijri' {
  if (pref === 'gregorian') return 'gregorian';
  if (pref === 'hijri') return 'hijri';
  return 'hijri';
}

// Helper used by hijri-date export consumers
export { HIJRI_MONTHS_AR };
