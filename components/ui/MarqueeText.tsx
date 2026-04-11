/**
 * MarqueeText - Auto-scrolling title component
 *
 * Measurement: onTextLayout fires with the actual TEXT CONTENT width
 * (not the layout box width), so it works regardless of how the Text
 * box is sized by its parent. No off-screen tricks needed.
 *
 * RTL: startX = -(textWidth - containerWidth) → right side of Arabic
 *      (= sentence beginning) is visible first, scrolls leftward.
 * LTR: startX = 0 → left side visible, scrolls leftward.
 *
 * No delay. Loops forever. Restarts on every screen focus.
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  TextLayoutEventData,
  NativeSyntheticEvent,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useIsRTL } from '@/hooks/use-is-rtl';

interface MarqueeTextProps {
  text: string;
  /** Scroll speed in pixels per second (default: 50) */
  speed?: number;
  /** Delay in ms before scrolling starts (default: 0) */
  delay?: number;
  /** Gap in pixels between the two scrolling text copies (default: 40) */
  gap?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  speed = 50,
  delay = 0,
  gap = 40,
  style,
  containerStyle,
}) => {
  const isRTL = useIsRTL();
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);

  const shouldAnimate = containerWidth > 0 && textWidth > 0 && textWidth > containerWidth;

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  /**
   * onTextLayout fires with the ACTUAL rendered text width — not the box width.
   * lines[0].width is the pixel width of the first (and only) line of text.
   * This is reliable in any layout context.
   */
  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      const lines = e.nativeEvent.lines;
      if (lines && lines.length > 0) {
        setTextWidth(Math.ceil(lines[0].width));
      }
    },
    []
  );

  const runAnimation = useCallback(() => {
    cancelAnimation(translateX);

    if (!shouldAnimate) {
      translateX.value = 0;
      return;
    }

    const distance = textWidth + gap;
    const duration = (distance / speed) * 1000;

    // RTL: begin at right side of text (= Arabic sentence start), scroll left.
    // LTR: begin at left side (= sentence start), scroll left.
    const startX = isRTL ? -(textWidth - containerWidth) : 0;

    translateX.value = startX;

    // Apply delay before starting the loop
    if (delay > 0) {
      translateX.value = withDelay(
        delay,
        withRepeat(
          withTiming(startX - distance, { duration, easing: Easing.linear }),
          -1,
          false
        )
      );
    } else {
      translateX.value = withRepeat(
        withTiming(startX - distance, { duration, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [shouldAnimate, textWidth, containerWidth, gap, speed, delay, isRTL, translateX]);

  // Start animation once measurements are ready
  useEffect(() => {
    runAnimation();
  }, [runAnimation]);

  // Restart every time user navigates to this screen
  useFocusEffect(
    useCallback(() => {
      runAnimation();
      return () => cancelAnimation(translateX);
    }, [runAnimation, translateX])
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[styles.container, containerStyle]}
      onLayout={onContainerLayout}
      accessible
      accessibilityLabel={text}
      accessibilityRole="text"
    >
      {shouldAnimate ? (
        // Scrolling: two side-by-side copies for a seamless infinite loop
        <Animated.View style={[styles.row, animatedStyle]}>
          <Text style={[style, styles.noShrink]} numberOfLines={1}>
            {text}
          </Text>
          <View style={{ width: gap }} />
          <Text style={[style, styles.noShrink]} numberOfLines={1}>
            {text}
          </Text>
        </Animated.View>
      ) : (
        // Static: measure true text width; container overflow:hidden clips visually
        // We avoid numberOfLines={1} + ellipsizeMode during measurement so the user
        // never sees "..." flash before the marquee kicks in.
        <Text
          style={style}
          numberOfLines={textWidth > 0 ? 1 : undefined}
          ellipsizeMode={textWidth > 0 ? 'tail' : undefined}
          onTextLayout={onTextLayout}
        >
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noShrink: {
    flexShrink: 0,
  },
});

export default MarqueeText;
