import { useMemo } from 'react';
import type { TextStyle } from 'react-native';
import { isRTL } from '@/lib/i18n';

/**
 * Returns the canonical Arabic/RTL text alignment props that every Text
 * component in this app needs when running in an RTL language.
 *
 * Why this exists:
 *   - The app intentionally avoids `I18nManager.forceRTL` (see app/_layout.tsx)
 *     to dodge double-reversal on Android production builds.
 *   - That means every Text node has to opt into RTL manually via
 *     `textAlign: 'right'` + `writingDirection: 'rtl'`.
 *   - Forgetting either pair causes Android to fall back to LTR, which is
 *     what produces the "title is on the wrong side" and "icon-text gap"
 *     symptoms users report.
 *
 * Usage:
 *   const rtl = useRTLText();
 *   <Text style={[styles.title, { color: colors.text }, rtl.text]} />
 *
 * For rows that need direction:
 *   <View style={[styles.row, { flexDirection: rtl.row }]}>...</View>
 */
export function useRTLText(): {
  /** Spread into Text style to right-align Arabic content. */
  text: Pick<TextStyle, 'textAlign' | 'writingDirection'>;
  /** Row direction string for View flexDirection. */
  row: 'row' | 'row-reverse';
  /** Boolean — same value as useIsRTL. */
  isRTL: boolean;
} {
  const rtl = isRTL();
  return useMemo(
    () => ({
      text: {
        textAlign: rtl ? 'right' : 'left',
        writingDirection: rtl ? 'rtl' : 'ltr',
      },
      row: rtl ? 'row-reverse' : 'row',
      isRTL: rtl,
    }),
    [rtl],
  );
}
