// components/ui/tab-bar.tsx — Sliding Pill Tab Bar

import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme-provider";
import { BORDER_RADIUS } from "@/constants/theme";
import { IconSymbol } from "./icon-symbol";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  useDerivedValue,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';
const AnimatedText = Animated.createAnimatedComponent(Text);

const SPRING_CONFIG = { damping: 20, stiffness: 260, mass: 0.6 };
const COLOR_TIMING = { duration: 220 };

interface TabItem {
  name: string;
  labelKey: string;
  icon: string;
  iconFocused: string;
}

const TABS: TabItem[] = [
  {
    name: "settings",
    labelKey: "tabs.settings",
    icon: "gearshape",
    iconFocused: "gearshape.fill",
  },
  {
    name: "prayer",
    labelKey: "tabs.prayer",
    icon: "building.columns",
    iconFocused: "building.columns.fill",
  },
  {
    name: "quran",
    labelKey: "tabs.quran",
    icon: "book",
    iconFocused: "book.fill",
  },
  {
    name: "index",
    labelKey: "tabs.azkar",
    icon: "text.book.closed",
    iconFocused: "text.book.closed.fill",
  },
];

// ========================================
// Animated Tab Icon with color crossfade
// ========================================

interface AnimatedTabIconProps {
  tab: TabItem;
  activeProgress: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
}

const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = React.memo(
  ({ tab, activeProgress, activeColor, inactiveColor }) => {
    const [color, setColor] = React.useState(inactiveColor);
    const [iconName, setIconName] = React.useState(tab.icon);

    useDerivedValue(() => {
      const c = interpolateColor(
        activeProgress.value,
        [0, 1],
        [inactiveColor, activeColor]
      );
      const name = activeProgress.value > 0.5 ? tab.iconFocused : tab.icon;
      runOnJS(setColor)(c);
      runOnJS(setIconName)(name);
    });

    const animatedLabelStyle = useAnimatedStyle(() => ({
      color: interpolateColor(
        activeProgress.value,
        [0, 1],
        [inactiveColor, activeColor]
      ),
    }));

    return (
      <View style={styles.tabButtonInner}>
        <View style={styles.tabIconContainer}>
          <IconSymbol name={iconName} size={22} color={color} />
        </View>
        <AnimatedText
          style={[styles.tabLabel, animatedLabelStyle]}
          numberOfLines={1}
        >
          {t(tab.labelKey)}
        </AnimatedText>
      </View>
    );
  }
);

// ========================================
// Custom Tab Bar with Sliding Pill
// ========================================

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(60);
  const [layoutsReady, setLayoutsReady] = React.useState(false);
  const tabLayouts = React.useRef<{ x: number; width: number }[]>([]);
  const measuredCount = React.useRef(0);

  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const progressRefs = React.useMemo(() => [p0, p1, p2, p3], []);

  const activeIndex = React.useMemo(() => {
    const currentRoute = state.routes[state.index]?.name;
    return TABS.findIndex((tab) => tab.name === currentRoute);
  }, [state.index, state.routes]);

  const handleTabLayout = React.useCallback(
    (index: number, x: number, width: number) => {
      tabLayouts.current[index] = { x, width };
      measuredCount.current++;
      if (measuredCount.current >= TABS.length && !layoutsReady) {
        setLayoutsReady(true);
      }
    },
    [layoutsReady]
  );

  // Animate indicator + crossfade on active tab change
  React.useEffect(() => {
    if (!layoutsReady || activeIndex < 0) return;

    const layout = tabLayouts.current[activeIndex];
    if (!layout) return;

    indicatorX.value = withSpring(layout.x, SPRING_CONFIG);
    indicatorW.value = withSpring(layout.width, SPRING_CONFIG);

    for (let i = 0; i < TABS.length; i++) {
      progressRefs[i].value = withTiming(i === activeIndex ? 1 : 0, COLOR_TIMING);
    }
  }, [activeIndex, layoutsReady, indicatorX, indicatorW, progressRefs]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  const renderContent = () => (
    <View style={styles.tabContainer}>
      {/* Sliding Pill */}
      {layoutsReady && activeIndex >= 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.slidingPill, indicatorStyle]}
        >
          <View
            style={[
              styles.pillInner,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
          />
        </Animated.View>
      )}

      {TABS.map((tab, index) => {
        const onPress = () => {
          const currentRoute = state.routes[state.index]?.name;
          const isFocused = currentRoute === tab.name;

          const event = navigation.emit({
            type: "tabPress",
            target: tab.name,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(tab.name);
          }
        };

        return (
          <Pressable
            key={tab.name}
            onPress={onPress}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              handleTabLayout(index, x, width);
            }}
            style={styles.tabButton}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <AnimatedTabIcon
              tab={tab}
              activeProgress={progressRefs[index]}
              activeColor={(colors as any).tabBarActive || colors.primary}
              inactiveColor={(colors as any).tabBarInactive || colors.muted}
            />
          </Pressable>
        );
      })}
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <BlurView
          intensity={isDark ? 50 : 80}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.blurContainer,
            {
              borderTopColor: colors.border,
            },
          ]}
        >
          {renderContent()}
        </BlurView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          backgroundColor: (colors as any).tabBarBackground || colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      ]}
    >
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurContainer: {
    borderTopWidth: 0.5,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    position: "relative",
  },
  slidingPill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 0,
  },
  pillInner: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    zIndex: 2,
  },
  tabButtonInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    minHeight: 48,
    gap: 8,
  },
  tabIconContainer: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
});
