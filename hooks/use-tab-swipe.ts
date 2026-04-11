// hooks/use-tab-swipe.ts
// Hook to add horizontal swipe gesture to navigate between bottom tabs
// Wraps each tab screen content in a gesture detector

import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SWIPE_THRESHOLD = 50;  // minimum horizontal distance
const VELOCITY_THRESHOLD = 500; // minimum horizontal velocity

/**
 * Returns a pan Gesture that navigates to adjacent tabs on horizontal swipe.
 * @param currentTabName - The route name of the current tab
 * @param tabOrder - Ordered array of tab route names (respects RTL)
 */
export function useTabSwipeGesture(
  currentTabName: string,
  tabOrder: string[],
) {
  const router = useRouter();
  const hasNavigated = useRef(false);

  const navigateToTab = useCallback((tabName: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.navigate(`/(tabs)/${tabName === 'index' ? '' : tabName}` as any);
  }, [router]);

  const currentIndex = tabOrder.indexOf(currentTabName);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20]) // Start after 20px horizontal movement
    .failOffsetY([-10, 10])   // Fail if vertical movement exceeds 10px
    .onBegin(() => {
      hasNavigated.current = false;
    })
    .onEnd((event) => {
      if (hasNavigated.current) return;

      const { translationX, velocityX } = event;

      // Must pass distance OR velocity threshold
      const passedThreshold =
        Math.abs(translationX) > SWIPE_THRESHOLD ||
        Math.abs(velocityX) > VELOCITY_THRESHOLD;

      if (!passedThreshold) return;

      // Swipe left (negative translationX) → next tab (higher index)
      // Swipe right (positive translationX) → previous tab (lower index)
      const direction = translationX < 0 ? 1 : -1;
      const targetIndex = currentIndex + direction;

      if (targetIndex >= 0 && targetIndex < tabOrder.length) {
        hasNavigated.current = true;
        const targetTab = tabOrder[targetIndex];
        runOnJS(navigateToTab)(targetTab);
      }
    });

  return panGesture;
}
