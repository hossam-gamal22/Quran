// components/ui/AnimatedTabBar.tsx
// Animated bottom tab bar with sliding pill indicator + spring animation
// Replaces the default React Navigation bottom tab bar

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { fontMedium } from '@/lib/fonts';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useColors } from '@/hooks/use-colors';

const AnimatedText = Animated.createAnimatedComponent(Text);

const SPRING_CONFIG = { damping: 22, stiffness: 260, mass: 0.8 };
const COLOR_TIMING = { duration: 200 };

// Inline type for the tabBar props from React Navigation bottom tabs
interface TabBarProps {
  state: {
    index: number;
    routes: { name: string; key: string }[];
  };
  navigation: {
    emit: (e: any) => any;
    navigate: (name: string) => void;
  };
  descriptors: Record<string, any>;
}

interface AnimatedTabBarConfig {
  activeColor: string;
  inactiveColor: string;
  isDarkMode: boolean;
  tabBarBg: string;
  isRTL: boolean;
  hasBg: boolean;
  orderedTabs: { name: string; iconName: string; label: string }[];
}

// ─── Animated Icon + Label ───────────────────────

interface AnimatedTabItemProps {
  iconName: string;
  label: string;
  activeProgress: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
}

const AnimatedTabItem: React.FC<AnimatedTabItemProps> = React.memo(
  ({ iconName, label, activeProgress, activeColor, inactiveColor }) => {
    const [color, setColor] = React.useState(inactiveColor);
    const { fs } = useColors();
    const styles = useScaledStyles(_styles, fs);

    useDerivedValue(() => {
      const c = interpolateColor(
        activeProgress.value,
        [0, 1],
        [inactiveColor, activeColor],
      );
      runOnJS(setColor)(c);
    });

    const animatedLabelStyle = useAnimatedStyle(() => ({
      color: interpolateColor(
        activeProgress.value,
        [0, 1],
        [inactiveColor, activeColor],
      ),
    }));

    return (
      <View style={styles.tabButtonInner}>
        <View style={styles.tabIconWrap}>
          <MaterialCommunityIcons
            name={iconName as any}
            size={24}
            color={color}
          />
        </View>
        <AnimatedText
          style={[styles.tabLabel, animatedLabelStyle]}
          numberOfLines={1}
        >
          {label}
        </AnimatedText>
      </View>
    );
  },
);

// ─── Main Animated Tab Bar ───────────────────────

export function AnimatedTabBar(
  props: TabBarProps & { config: AnimatedTabBarConfig },
) {
  const { state, navigation, config } = props;
  const {
    activeColor,
    inactiveColor,
    isDarkMode,
    tabBarBg,
    hasBg,
    orderedTabs,
  } = config;

  const insets = useSafeAreaInsets();
  const { fs } = useColors();
  const styles = useScaledStyles(_styles, fs);
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(60);
  const [layoutsReady, setLayoutsReady] = React.useState(false);
  const tabLayouts = React.useRef<{ x: number; width: number }[]>([]);
  const measuredCount = React.useRef(0);

  // Per-tab progress shared values (max 5 tabs)
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const p4 = useSharedValue(0);
  const progressRefs = React.useMemo(() => [p0, p1, p2, p3, p4], []);

  // Map route index to tab visual index
  const activeVisualIndex = React.useMemo(() => {
    const currentRouteName = state.routes[state.index]?.name;
    return orderedTabs.findIndex((t) => t.name === currentRouteName);
  }, [state.index, state.routes, orderedTabs]);

  const handleTabLayout = React.useCallback(
    (index: number, e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      tabLayouts.current[index] = { x, width };
      measuredCount.current++;
      if (measuredCount.current >= orderedTabs.length && !layoutsReady) {
        setLayoutsReady(true);
      }
    },
    [layoutsReady, orderedTabs.length],
  );

  // Animate indicator + color on active tab change
  React.useEffect(() => {
    if (!layoutsReady || activeVisualIndex < 0) return;
    const layout = tabLayouts.current[activeVisualIndex];
    if (!layout) return;

    indicatorX.value = withSpring(layout.x, SPRING_CONFIG);
    indicatorW.value = withSpring(layout.width, SPRING_CONFIG);

    for (let i = 0; i < orderedTabs.length; i++) {
      progressRefs[i].value = withTiming(
        i === activeVisualIndex ? 1 : 0,
        COLOR_TIMING,
      );
    }
  }, [activeVisualIndex, layoutsReady]);

  // Indicator animated style
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  const renderContent = () => (
    <View style={styles.tabRow}>
      {/* Sliding pill indicator */}
      {layoutsReady && activeVisualIndex >= 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.slidingPill, indicatorStyle]}
        >
          <View
            style={[
              styles.pillInner,
              {
                backgroundColor: isDarkMode
                  ? '#0d8e62'
                  : 'rgba(13,142,98,0.15)',
              },
            ]}
          />
        </Animated.View>
      )}

      {/* Tab buttons */}
      {orderedTabs.map((tab, index) => {
        const isFocused =
          state.routes[state.index]?.name === tab.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes.find((r: any) => r.name === tab.name)?.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.navigate(tab.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: state.routes.find((r: any) => r.name === tab.name)?.key,
          });
        };

        return (
          <Pressable
            key={tab.name}
            onPress={onPress}
            onLongPress={onLongPress}
            onLayout={(e) => handleTabLayout(index, e)}
            style={styles.tabButton}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={tab.label}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
          >
            <AnimatedTabItem
              iconName={tab.iconName}
              label={tab.label}
              activeProgress={progressRefs[index]}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
            />
          </Pressable>
        );
      })}
    </View>
  );

  // iOS: glass blur background
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {hasBg ? (
          // Transparent bg when app has background image
          <View style={[styles.barWrap, { backgroundColor: 'transparent' }]}>
            {renderContent()}
          </View>
        ) : (
          <BlurView
           
            intensity={isDarkMode ? 50 : 80}
            tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
            style={[
              styles.barWrap,
              {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: isDarkMode
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.10)',
              },
            ]}
          >
            {renderContent()}
          </BlurView>
        )}
      </View>
    );
  }

  // Android: glass-blur background (matching iOS aesthetic)
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <BlurView
        intensity={isDarkMode ? 50 : 80}
        tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
        style={[
          styles.barWrap,
          {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: isDarkMode
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.10)',
          },
        ]}
      >
        {renderContent()}
      </BlurView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────

const _styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  barWrap: {
    overflow: 'hidden',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 8,
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: 2,
    height: 44,
    left: 0,
  },
  pillInner: {
    flex: 1,
    borderRadius: 14,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    zIndex: 2,
  },
  tabButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 44,
    gap: 2,
  },
  tabIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: fontMedium(),
    textAlign: 'center',
  },
});
