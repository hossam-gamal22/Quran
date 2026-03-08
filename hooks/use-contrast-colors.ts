// hooks/use-contrast-colors.ts
// هوك التباين التلقائي - يحدد ألوان النص بناءً على الخلفية

import { useMemo } from 'react';
import { useColors } from './use-colors';
import { getContrastPalette, getContrastTextColor, isColorLight } from '@/lib/contrast-helper';

/**
 * Returns contrast-aware colors based on the current theme background.
 * Use this instead of hardcoding text colors.
 */
export function useContrastColors(overrideBackground?: string) {
  const colors = useColors();
  const bg = overrideBackground ?? colors.background;

  return useMemo(() => getContrastPalette(bg), [bg]);
}

/**
 * Given a specific background color, returns the right text color.
 * Useful for cards, banners, or sections with custom backgrounds.
 */
export function useTextColorForBg(backgroundColor: string) {
  return useMemo(() => getContrastTextColor(backgroundColor), [backgroundColor]);
}

/**
 * Returns whether a color background is light (for conditional styling).
 */
export function useIsLightBackground(backgroundColor: string) {
  return useMemo(() => isColorLight(backgroundColor), [backgroundColor]);
}
