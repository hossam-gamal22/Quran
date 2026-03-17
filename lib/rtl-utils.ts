// lib/rtl-utils.ts
// أدوات RTL - لعكس الاتجاه بناءً على اللغة
import { ViewStyle } from 'react-native';

/**
 * Returns RTL-aware flexDirection style
 * Use this to override StyleSheet.create() styles that have hardcoded 'row'
 * In RTL: row-reverse (items flow right-to-left)
 * In LTR: row (items flow left-to-right)
 */
export const rtlRow = (isRTL: boolean): ViewStyle => ({
  flexDirection: isRTL ? 'row-reverse' : 'row',
});

/**
 * Returns RTL-aware flexDirection 'row-reverse'
 * For styles that are hardcoded 'row-reverse' but should be 'row' in LTR
 * In RTL: row (since row-reverse in RTL looks like LTR row)
 * In LTR: row-reverse (items flow right-to-left)
 */
export const rtlRowReverse = (isRTL: boolean): ViewStyle => ({
  flexDirection: isRTL ? 'row' : 'row-reverse',
});

/**
 * Returns RTL-aware text alignment
 */
export const rtlTextAlign = (isRTL: boolean): ViewStyle => ({
  textAlign: isRTL ? 'right' : 'left',
} as any);

/**
 * Returns RTL-aware alignItems for flex-end/flex-start
 */
export const rtlAlignSelf = (isRTL: boolean): ViewStyle => ({
  alignSelf: isRTL ? 'flex-end' : 'flex-start',
});

/**
 * Returns RTL-aware start margin (leads the reading direction)
 * In LTR: marginLeft; In RTL: marginRight
 */
export const startMargin = (isRTL: boolean, value: number): ViewStyle => ({
  marginLeft: isRTL ? 0 : value,
  marginRight: isRTL ? value : 0,
});

/**
 * Returns RTL-aware end margin (trails the reading direction)
 * In LTR: marginRight; In RTL: marginLeft
 */
export const endMargin = (isRTL: boolean, value: number): ViewStyle => ({
  marginLeft: isRTL ? value : 0,
  marginRight: isRTL ? 0 : value,
});

/**
 * Returns RTL-aware start padding
 * In LTR: paddingLeft; In RTL: paddingRight
 */
export const startPadding = (isRTL: boolean, value: number): ViewStyle => ({
  paddingLeft: isRTL ? 0 : value,
  paddingRight: isRTL ? value : 0,
});

/**
 * Returns RTL-aware end padding
 * In LTR: paddingRight; In RTL: paddingLeft
 */
export const endPadding = (isRTL: boolean, value: number): ViewStyle => ({
  paddingLeft: isRTL ? value : 0,
  paddingRight: isRTL ? 0 : value,
});

/**
 * Returns the correct chevron icon name for "forward" navigation
 * In LTR: chevron-right; In RTL: chevron-left
 */
export const rtlChevronForward = (isRTL: boolean): string =>
  isRTL ? 'chevron-left' : 'chevron-right';

/**
 * Returns the correct chevron icon name for "back" navigation
 * In LTR: chevron-left; In RTL: chevron-right
 */
export const rtlChevronBack = (isRTL: boolean): string =>
  isRTL ? 'chevron-right' : 'chevron-left';

/**
 * Returns the correct arrow icon name for "back" navigation
 * In LTR: arrow-left; In RTL: arrow-right
 */
export const rtlArrowBack = (isRTL: boolean): string =>
  isRTL ? 'arrow-right' : 'arrow-left';
