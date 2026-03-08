// components/ui/NativeTabs.tsx
// تبويبات أصلية موحدة - روح المسلم
// يستخدم @react-navigation/material-top-tabs مع تصميم متسق

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, I18nManager, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';

// ========================================
// Types
// ========================================

export interface NativeTab {
  key: string;
  label: string;
  icon?: string;
}

export interface NativeTabsProps {
  tabs: NativeTab[];
  selected: string;
  onSelect: (key: string) => void;
  /** Primary indicator color (default: app green) */
  indicatorColor?: string;
  /** Whether to use scrollable tabs for many items */
  scrollable?: boolean;
  /** Container style overrides */
  style?: ViewStyle;
  /** Height of the indicator line */
  indicatorHeight?: number;
}

// ========================================
// Spring config
// ========================================

const SPRING_CONFIG = { damping: 20, stiffness: 220, mass: 0.8 };
const TIMING_CONFIG = { duration: 200 };

// ========================================
// Animated Tab Item
// ========================================

const AnimatedText = Animated.createAnimatedComponent(Text);

interface TabItemProps {
  tab: NativeTab;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
  onLayoutCb: (x: number, width: number) => void;
}

const TabItemInner: React.FC<TabItemProps> = ({
  tab,
  isActive,
  activeColor,
  inactiveColor,
  onPress,
  onLayoutCb,
}) => {
  const progress = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, TIMING_CONFIG);
  }, [isActive]);

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [inactiveColor, activeColor]),
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLayout={(e) => {
        const { x, width } = e.nativeEvent.layout;
        onLayoutCb(x, width);
      }}
      style={styles.tabButton}
    >
      <AnimatedText
        style={[styles.tabLabel, textStyle]}
        numberOfLines={1}
      >
        {tab.label}
      </AnimatedText>
    </Pressable>
  );
};

const TabItem = React.memo(TabItemInner);

// ========================================
// NativeTabs Component
// ========================================

export function NativeTabs({
  tabs,
  selected,
  onSelect,
  indicatorColor,
  style,
  indicatorHeight = 3,
}: NativeTabsProps) {
  const colors = useColors();
  const activeColor = indicatorColor ?? colors.primary;
  const inactiveColor = colors.textLight;

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const [layoutsReady, setLayoutsReady] = React.useState(false);
  const tabLayouts = React.useRef<Record<number, { x: number; width: number }>>({});
  const measuredCount = React.useRef(0);

  const handleTabLayout = React.useCallback(
    (index: number, x: number, width: number) => {
      tabLayouts.current[index] = { x, width };
      measuredCount.current++;
      if (measuredCount.current >= tabs.length && !layoutsReady) {
        setLayoutsReady(true);
        // Set initial position
        const selectedIndex = tabs.findIndex((t) => t.key === selected);
        const layout = tabLayouts.current[selectedIndex];
        if (layout) {
          indicatorX.value = layout.x;
          indicatorW.value = layout.width;
        }
      }
    },
    [tabs.length, layoutsReady, selected]
  );

  // Animate indicator on selection change
  React.useEffect(() => {
    const selectedIndex = tabs.findIndex((t) => t.key === selected);
    if (selectedIndex < 0 || !layoutsReady) return;

    const layout = tabLayouts.current[selectedIndex];
    if (!layout) return;

    indicatorX.value = withSpring(layout.x, SPRING_CONFIG);
    indicatorW.value = withSpring(layout.width, SPRING_CONFIG);
  }, [selected, layoutsReady]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  const isRTL = I18nManager.isRTL;

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }, style]}>
      <View style={[styles.tabRow, isRTL && styles.tabRowRTL]}>
        {tabs.map((tab, index) => (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={tab.key === selected}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            onPress={() => onSelect(tab.key)}
            onLayoutCb={(x, w) => handleTabLayout(index, x, w)}
          />
        ))}
      </View>
      {layoutsReady && (
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: activeColor,
              height: indicatorHeight,
              borderRadius: indicatorHeight / 2,
            },
            indicatorStyle,
          ]}
        />
      )}
    </View>
  );
}

// ========================================
// Styles
// ========================================

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    position: 'relative',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabRowRTL: {
    flexDirection: 'row-reverse',
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
  },
});

export default NativeTabs;
