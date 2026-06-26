import { describe, expect, it } from 'vitest';

import {
  ANDROID_TAB_BAR_CONTENT_HEIGHT,
  ANDROID_TAB_BAR_EXTRA_BOTTOM_PADDING,
  ANDROID_TAB_BAR_MIN_SAFE_BOTTOM,
  TAB_SCREEN_END_GAP,
  getAndroidTabBarBottomPadding,
  getAndroidTabBarHeight,
  getTabScreenBottomSpacing,
} from '@/lib/tab-screen-spacing';

describe('tab screen bottom spacing', () => {
  it('keeps Android tab bar padding tied to safe-area bottom inset', () => {
    expect(getAndroidTabBarBottomPadding(0)).toBe(
      ANDROID_TAB_BAR_MIN_SAFE_BOTTOM + ANDROID_TAB_BAR_EXTRA_BOTTOM_PADDING,
    );
    expect(getAndroidTabBarBottomPadding(36)).toBe(36 + ANDROID_TAB_BAR_EXTRA_BOTTOM_PADDING);
  });

  it('pads Android tab ScrollViews below the full custom tab bar plus breathing room', () => {
    const bottomSafeAreaInset = 36;
    const tabBarHeight = getAndroidTabBarHeight(bottomSafeAreaInset);

    expect(tabBarHeight).toBe(
      ANDROID_TAB_BAR_CONTENT_HEIGHT +
        bottomSafeAreaInset +
        ANDROID_TAB_BAR_EXTRA_BOTTOM_PADDING,
    );
    expect(getTabScreenBottomSpacing({ platform: 'android', bottomSafeAreaInset })).toBe(
      tabBarHeight + TAB_SCREEN_END_GAP,
    );
  });

  it('does not shrink existing iOS-style spacing on native tabs', () => {
    expect(getTabScreenBottomSpacing({ platform: 'ios', bottomSafeAreaInset: 34 })).toBe(100);
  });
});
