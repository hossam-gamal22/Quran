// lib/fonts.ts
// Dynamic font family system — Rubik is the app-wide default.

import { getLanguage, isRTL } from '@/lib/i18n';
import { Platform, TextStyle } from 'react-native';
import { getFontSettingsSync } from '@/hooks/use-font-config';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

const FONT_MAP = {
  ar: {
    regular: 'Rubik-Regular',
    medium: 'Rubik-Medium',
    semibold: 'Rubik-SemiBold',
    bold: 'Rubik-Bold',
  },
  default: {
    regular: 'Rubik-Regular',
    medium: 'Rubik-Medium',
    semibold: 'Rubik-SemiBold',
    bold: 'Rubik-Bold',
  },
} as const;

function getFontSet() {
  const lang = getLanguage();
  const settings = getFontSettingsSync();
  const isArabicLike = lang === 'ar' || lang === 'ur';

  if (isArabicLike) {
    if (settings.arabicFont === 'Amiri') {
      return {
        regular: 'Amiri',
        medium: 'Amiri',
        semibold: 'Amiri-Bold',
        bold: 'Amiri-Bold',
      };
    }
    return FONT_MAP.ar;
  }

  return FONT_MAP.default;
}

export function quranFontFamily(): string {
  const settings = getFontSettingsSync();
  if (settings.quranFont === 'Amiri') return 'Amiri';
  return 'KFGQPCUthmanic';
}

/** Returns the appropriate Regular font family for current language */
export function fontRegular(): string {
  return getFontSet().regular;
}

/** Returns the appropriate Medium font family for current language */
export function fontMedium(): string {
  return getFontSet().medium;
}

/** Returns the appropriate SemiBold font family for current language */
export function fontSemiBold(): string {
  return getFontSet().semibold;
}

/** Returns the appropriate Bold font family for current language */
export function fontBold(): string {
  return getFontSet().bold;
}

/** Returns font family string for a given weight */
export function fontFamily(weight: FontWeight = 'regular'): string {
  return getFontSet()[weight];
}

/**
 * Returns text style for Arabic justified text with Kashida support.
 * Use on paragraph/body text in Arabic to enable elegant justification.
 */
export function arabicBodyStyle(): TextStyle {
  if (!isRTL()) return {};
  return {
    textAlign: 'justify' as const,
    writingDirection: 'rtl' as const,
    ...(Platform.OS === 'ios' ? { lineBreakStrategyIOS: 'standard' as const } : {}),
  };
}
