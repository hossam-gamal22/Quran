import { Platform } from 'react-native';

export type TabScreenPlatform = typeof Platform.OS;

export const ANDROID_TAB_BAR_TOP_PADDING = 8;
export const ANDROID_TAB_BAR_BUTTON_MIN_HEIGHT = 48;
export const ANDROID_TAB_BAR_MIN_SAFE_BOTTOM = 8;
export const ANDROID_TAB_BAR_EXTRA_BOTTOM_PADDING = 8;
export const TAB_SCREEN_END_GAP = 24;
export const TAB_SCREEN_DEFAULT_BOTTOM_SPACING = 100;

export const ANDROID_TAB_BAR_CONTENT_HEIGHT =
  ANDROID_TAB_BAR_TOP_PADDING + ANDROID_TAB_BAR_BUTTON_MIN_HEIGHT;

export function getAndroidTabBarBottomPadding(bottomSafeAreaInset: number): number {
  return Math.max(bottomSafeAreaInset, ANDROID_TAB_BAR_MIN_SAFE_BOTTOM) +
    ANDROID_TAB_BAR_EXTRA_BOTTOM_PADDING;
}

export function getAndroidTabBarHeight(bottomSafeAreaInset: number): number {
  return ANDROID_TAB_BAR_CONTENT_HEIGHT + getAndroidTabBarBottomPadding(bottomSafeAreaInset);
}

export function getTabScreenBottomSpacing({
  platform = Platform.OS,
  bottomSafeAreaInset,
}: {
  platform?: TabScreenPlatform;
  bottomSafeAreaInset: number;
}): number {
  if (platform !== 'android') {
    return TAB_SCREEN_DEFAULT_BOTTOM_SPACING;
  }

  return Math.max(
    TAB_SCREEN_DEFAULT_BOTTOM_SPACING,
    getAndroidTabBarHeight(bottomSafeAreaInset) + TAB_SCREEN_END_GAP,
  );
}
