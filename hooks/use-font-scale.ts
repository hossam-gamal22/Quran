// hooks/use-font-scale.ts
import { useCallback, useMemo } from 'react';
import { useSettings, FontSize } from '@/contexts/SettingsContext';

const SCALE_MAP: Record<FontSize, number> = {
  small: 0.875,
  medium: 1.0,
  large: 1.125,
  xlarge: 1.25,
};

/**
 * Returns a font-scaling function `fs(baseSize)` that applies
 * the user's display font-size preference.
 *
 * Usage:
 *   const { fs } = useFontScale();
 *   <Text style={{ fontSize: fs(16) }}>…</Text>
 *
 * Scale factors:
 *   small  → 0.875×  (14 → 12, 16 → 14, 20 → 18)
 *   medium → 1.0×    (unchanged – current default)
 *   large  → 1.125×  (14 → 16, 16 → 18, 20 → 22)
 *   xlarge → 1.25×   (14 → 18, 16 → 20, 20 → 25)
 */
export function useFontScale() {
  const { settings } = useSettings();
  const scale = SCALE_MAP[settings.display.fontSize] ?? 1;

  /** Scale a base font size according to the user preference. */
  const fs = useCallback(
    (baseSize: number): number => Math.round(baseSize * scale),
    [scale],
  );

  return { fontScale: scale, fs };
}

/**
 * Pure utility — returns a shallow copy of a StyleSheet where every style
 * object that contains a `fontSize` property gets its value scaled via `fs`.
 * Styles without `fontSize` are passed through by reference (no allocation).
 *
 * Usage inside a component:
 *   const colors = useColors();
 *   const s = useScaledStyles(styles, colors.fs);
 *   // then use s.title, s.body, etc. instead of styles.title
 */
export function scaleStyles<T extends Record<string, any>>(
  styles: T,
  fs: (size: number) => number,
): T {
  const scaled: any = {};
  for (const key in styles) {
    const style = (styles as any)[key];
    if (style && typeof style === 'object' && typeof style.fontSize === 'number') {
      const patch: any = { fontSize: fs(style.fontSize) };
      // Scale lineHeight proportionally so text spacing stays consistent
      if (typeof style.lineHeight === 'number') {
        const ratio = style.lineHeight / style.fontSize;
        patch.lineHeight = Math.round(fs(style.fontSize) * ratio);
      }
      scaled[key] = { ...style, ...patch };
    } else {
      scaled[key] = style;
    }
  }
  return scaled as T;
}

/**
 * Hook wrapper around scaleStyles — memoizes so styles are only re-created
 * when the user's font-size preference changes.
 */
export function useScaledStyles<T extends Record<string, any>>(
  styles: T,
  fs: (size: number) => number,
): T {
  return useMemo(() => scaleStyles(styles, fs), [styles, fs]);
}

