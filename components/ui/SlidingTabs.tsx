/**
 * SlidingTabs — Reusable sliding pill tab bar
 *
 * Architecture:
 * - Absolutely positioned Animated.View (pill) slides behind transparent tab buttons
 * - onLayout measures each tab's x/width for precise indicator positioning
 * - withSpring() animates translateX + width between tabs
 * - withTiming() crossfades text colors between active/inactive
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  useDerivedValue,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// ========================================
// Types
// ========================================

export interface SlidingTab {
  key: string;
  label: string;
}

export interface SlidingTabsProps {
  tabs: SlidingTab[];
  selected: string;
  onSelect: (key: string) => void;
  /** Background color of the sliding pill indicator */
  activeColor?: string;
  /** Text color when tab is active */
  activeTextColor?: string;
  /** Text color when tab is inactive */
  inactiveTextColor?: string;
  /** Background color of the container */
  containerBg?: string;
  /** Container border radius */
  borderRadius?: number;
  /** Pill border radius */
  pillBorderRadius?: number;
  /** Vertical padding for tab buttons */
  tabPaddingVertical?: number;
  /** Container style overrides */
  style?: ViewStyle;
  /** Font family for tab labels */
  fontFamily?: string;
  /** Font size for tab labels */
  fontSize?: number;
}

// ========================================
// Spring & Timing configs
// ========================================

const SPRING_CONFIG = { damping: 18, stiffness: 200, mass: 0.7 };
const COLOR_TIMING = { duration: 200 };

// ========================================
// Animated tab label with color crossfade
// ========================================

const AnimatedText = Animated.createAnimatedComponent(Text);

interface TabItemProps {
  tab: SlidingTab;
  activeProgress: SharedValue<number>;
  activeTextColor: string;
  inactiveTextColor: string;
  onPress: () => void;
  onLayoutCb: (x: number, width: number) => void;
  tabPaddingVertical: number;
  fontFamily: string;
  fontSize: number;
}

const TabItem: React.FC<TabItemProps> = React.memo(({
  tab,
  activeProgress,
  activeTextColor,
  inactiveTextColor,
  onPress,
  onLayoutCb,
  tabPaddingVertical,
  fontFamily,
  fontSize,
}) => {
  const animatedLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeProgress.value,
      [0, 1],
      [inactiveTextColor, activeTextColor]
    ),
  }));

  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => {
        const { x, width } = e.nativeEvent.layout;
        onLayoutCb(x, width);
      }}
      style={[styles.tabButton, { paddingVertical: tabPaddingVertical }]}
    >
      <AnimatedText
        style={[
          styles.tabLabel,
          { fontFamily, fontSize },
          animatedLabelStyle,
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </AnimatedText>
    </Pressable>
  );
});

// ========================================
// Main SlidingTabs component
// ========================================

export function SlidingTabs({
  tabs,
  selected,
  onSelect,
  activeColor = 'rgba(255,255,255,0.2)',
  activeTextColor = '#fff',
  inactiveTextColor = 'rgba(255,255,255,0.55)',
  containerBg = 'rgba(120,120,128,0.1)',
  borderRadius = 12,
  pillBorderRadius = 10,
  tabPaddingVertical = 10,
  style,
  fontFamily = 'Cairo-SemiBold',
  fontSize = 14,
}: SlidingTabsProps) {
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const [layoutsReady, setLayoutsReady] = React.useState(false);
  const tabLayouts = React.useRef<{ x: number; width: number }[]>([]);
  const measuredCount = React.useRef(0);

  // Support up to 8 tabs via individual shared values
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const p4 = useSharedValue(0);
  const p5 = useSharedValue(0);
  const p6 = useSharedValue(0);
  const p7 = useSharedValue(0);
  const progressRefs = React.useMemo(
    () => [p0, p1, p2, p3, p4, p5, p6, p7],
    []
  );

  const handleTabLayout = React.useCallback(
    (index: number, x: number, width: number) => {
      tabLayouts.current[index] = { x, width };
      measuredCount.current++;
      if (measuredCount.current >= tabs.length && !layoutsReady) {
        setLayoutsReady(true);
      }
    },
    [tabs.length, layoutsReady]
  );

  // Animate indicator + crossfade on selection change
  React.useEffect(() => {
    const selectedIndex = tabs.findIndex((t) => t.key === selected);
    if (selectedIndex < 0 || !layoutsReady) return;

    const layout = tabLayouts.current[selectedIndex];
    if (!layout) return;

    indicatorX.value = withSpring(layout.x, SPRING_CONFIG);
    indicatorW.value = withSpring(layout.width, SPRING_CONFIG);

    for (let i = 0; i < tabs.length; i++) {
      if (progressRefs[i]) {
        progressRefs[i].value = withTiming(
          i === selectedIndex ? 1 : 0,
          COLOR_TIMING
        );
      }
    }
  }, [selected, layoutsReady, indicatorX, indicatorW, progressRefs, tabs]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: containerBg, borderRadius },
        style,
      ]}
    >
      {/* Sliding Pill Indicator */}
      {layoutsReady && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            { borderRadius: pillBorderRadius },
            indicatorStyle,
          ]}
        >
          <View
            style={[
              styles.pill,
              {
                backgroundColor: activeColor,
                borderRadius: pillBorderRadius,
              },
            ]}
          />
        </Animated.View>
      )}

      {/* Tab Buttons */}
      {tabs.map((tab, index) => (
        <TabItem
          key={tab.key}
          tab={tab}
          activeProgress={progressRefs[index]}
          activeTextColor={activeTextColor}
          inactiveTextColor={inactiveTextColor}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(tab.key);
          }}
          onLayoutCb={(x, width) => handleTabLayout(index, x, width)}
          tabPaddingVertical={tabPaddingVertical}
          fontFamily={fontFamily}
          fontSize={fontSize}
        />
      ))}
    </View>
  );
}

// ========================================
// Styles
// ========================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
    padding: 3,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 3,
    bottom: 3,
  },
  pill: {
    flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
