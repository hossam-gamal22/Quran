// lib/fonts.ts
// Dynamic font family system — switches based on active language
// Arabic → Rubik, Non-Arabic → Raleway

import { getLanguage, isRTL } from '@/lib/i18n';
import { Platform, TextStyle } from 'react-native';

export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

const FONT_MAP = {
  ar: {
    regular: 'Rubik-Regular',
    medium: 'Rubik-Medium',
    semibold: 'Rubik-SemiBold',
    bold: 'Rubik-Bold',
  },
  default: {
    regular: 'Raleway-Regular',
    medium: 'Raleway-Medium',
    semibold: 'Raleway-SemiBold',
    bold: 'Raleway-Bold',
  },
} as const;

function getFontSet() {
  const lang = getLanguage();
  return lang === 'ar' || lang === 'ur' ? FONT_MAP.ar : FONT_MAP.default;
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
