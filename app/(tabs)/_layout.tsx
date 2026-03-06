// app/(tabs)/_layout.tsx
// تخطيط التابات السفلية - Apple Glassmorphism Bottom Navigation
// آخر تحديث: 2026-03-06

import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable, I18nManager } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolateColor,
  runOnJS,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSettings } from '@/contexts/SettingsContext';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// ========================================
// الثوابت
// ========================================

const ACTIVE_COLOR = '#fff';
const INACTIVE_COLOR = 'rgba(255,255,255,0.55)';
const INDICATOR_BORDER_COLOR = 'rgba(255,255,255,0.35)';
const INDICATOR_BG = 'rgba(255,255,255,0.12)';
const SWIPE_TRANSLATION_THRESHOLD = 38;
const SWIPE_VELOCITY_THRESHOLD = 240;

const SPRING_CONFIG = { damping: 20, stiffness: 260, mass: 0.6 };
const COLOR_TIMING = { duration: 220 };

// The ONLY tabs that should appear in the bottom bar (whitelist)
const VISIBLE_TAB_NAMES = new Set(['index', 'quran', 'tasbih-placeholder', 'prayer', 'settings']);

// Tab configuration
const TAB_CONFIG: Record<string, { icon: string; labelKey: string }> = {
  'index': { icon: 'home-variant', labelKey: 'home' },
  'quran': { icon: 'book-open-variant', labelKey: 'quran' },
  'tasbih-placeholder': { icon: 'hand-heart', labelKey: 'tasbih' },
  'prayer': { icon: 'mosque', labelKey: 'prayer' },
  'settings': { icon: 'cog-outline', labelKey: 'settings' },
};

// ========================================
// أيقونة التاب المخصصة مع color crossfade
// ========================================

interface TabIconProps {
  name: string;
  label: string;
  activeProgress: SharedValue<number>;
}

const AnimatedText = Animated.createAnimatedComponent(Text);

const TabIcon: React.FC<TabIconProps> = React.memo(({ name, label, activeProgress }) => {
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + activeProgress.value * 0.05 }],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(activeProgress.value, [0, 1], [INACTIVE_COLOR, ACTIVE_COLOR]),
    fontFamily: activeProgress.value > 0.5 ? 'Cairo-Bold' : 'Cairo-Medium',
    fontSize: activeProgress.value > 0.5 ? 10.5 : 10,
  }));

  return (
    <Animated.View style={[styles.tabIconContainer, animatedContainerStyle]}>
      <View style={styles.iconCircle}>
        <AnimatedMCIcon
          name={name}
          activeProgress={activeProgress}
        />
      </View>
      <AnimatedText
        style={[styles.tabLabel, animatedLabelStyle]}
        numberOfLines={1}
      >
        {label}
      </AnimatedText>
    </Animated.View>
  );
});

// Animated MaterialCommunityIcons - bridges worklet color to JS
const AnimatedMCIcon: React.FC<{
  name: string;
  activeProgress: SharedValue<number>;
}> = React.memo(({ name, activeProgress }) => {
  const [color, setColor] = React.useState(INACTIVE_COLOR);
  const [size, setSize] = React.useState(23);

  useDerivedValue(() => {
    const c = interpolateColor(activeProgress.value, [0, 1], [INACTIVE_COLOR, ACTIVE_COLOR]);
    const s = Math.round(23 + activeProgress.value * 2);
    runOnJS(setColor)(c);
    runOnJS(setSize)(s);
  });

  return (
    <MaterialCommunityIcons
      name={name as any}
      size={size}
      color={color}
    />
  );
});

// ========================================
// 3D Glass Pill Indicator (sliding behind active tab)
// ========================================

const GlassPill: React.FC<{ indicatorStyle: any }> = React.memo(({ indicatorStyle }) => {
  return (
    <Animated.View style={[styles.slidingIndicator, indicatorStyle]}>
      <View style={styles.glassPillOuter}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 25}
          tint="light"
          style={styles.glassPillBlur}
        >
          <View style={styles.glassPillInner} />
        </BlurView>
      </View>
    </Animated.View>
  );
});

// ========================================
// Custom Tab Bar مع BlurView و Sliding Glass Pill
// ========================================

interface TabLayout {
  x: number;
  width: number;
}

const GlassTabBar: React.FC<{
  state: any;
  descriptors: any;
  navigation: any;
  isDarkMode: boolean;
  t: (key: string) => string;
}> = ({ state, navigation, t }) => {
  const router = useRouter();

  const visibleTabs = state.routes.filter((route: any) => VISIBLE_TAB_NAMES.has(route.name));

  const activeVisibleIndex = visibleTabs.findIndex((route: any) => {
    const routeIndex = state.routes.indexOf(route);
    return routeIndex === state.index;
  });

  // Store measured layouts for each tab
  const tabLayouts = React.useRef<TabLayout[]>([]);
  const [layoutsReady, setLayoutsReady] = React.useState(false);
  const measuredCount = React.useRef(0);

  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(60);

  // Per-tab active progress (0 = inactive, 1 = active) for color crossfade
  const progress0 = useSharedValue(0);
  const progress1 = useSharedValue(0);
  const progress2 = useSharedValue(0);
  const progress3 = useSharedValue(0);
  const progress4 = useSharedValue(0);
  const progressRefs = React.useMemo(() => [progress0, progress1, progress2, progress3, progress4], []);

  // Handle tab layout measurement
  const handleTabLayout = React.useCallback(
    (index: number, x: number, width: number) => {
      tabLayouts.current[index] = { x, width };
      measuredCount.current++;
      if (measuredCount.current >= visibleTabs.length && !layoutsReady) {
        setLayoutsReady(true);
      }
    },
    [visibleTabs.length, layoutsReady]
  );

  // Animate indicator + color crossfade when active tab changes
  React.useEffect(() => {
    if (!layoutsReady || activeVisibleIndex < 0) return;

    const layout = tabLayouts.current[activeVisibleIndex];
    if (!layout) return;

    // Animate indicator position and width
    indicatorX.value = withSpring(layout.x, SPRING_CONFIG);
    indicatorW.value = withSpring(layout.width, SPRING_CONFIG);

    // Crossfade tab colors
    for (let i = 0; i < visibleTabs.length; i++) {
      const target = i === activeVisibleIndex ? 1 : 0;
      if (progressRefs[i]) {
        progressRefs[i].value = withTiming(target, COLOR_TIMING);
      }
    }
  }, [activeVisibleIndex, layoutsReady, indicatorX, indicatorW, progressRefs, visibleTabs.length]);

  const navigateToVisibleIndex = React.useCallback(
    (targetVisibleIndex: number) => {
      if (targetVisibleIndex < 0 || targetVisibleIndex >= visibleTabs.length) {
        return;
      }

      const route = visibleTabs[targetVisibleIndex];
      const routeIndex = state.routes.indexOf(route);
      const isFocused = routeIndex === state.index;

      if (route.name === 'tasbih-placeholder') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/tasbih');
        return;
      }

      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate(route.name);
      }
    },
    [navigation, router, state.index, state.routes, visibleTabs]
  );

  const handleSwipe = React.useCallback(
    (direction: -1 | 1) => {
      if (activeVisibleIndex < 0) return;

      let nextIndex = activeVisibleIndex + direction;
      while (
        nextIndex >= 0 &&
        nextIndex < visibleTabs.length &&
        visibleTabs[nextIndex]?.name === 'tasbih-placeholder'
      ) {
        nextIndex += direction;
      }

      if (nextIndex < 0 || nextIndex >= visibleTabs.length) {
        return;
      }

      // Animate indicator immediately on swipe
      const layout = tabLayouts.current[nextIndex];
      if (layout) {
        indicatorX.value = withSpring(layout.x, SPRING_CONFIG);
        indicatorW.value = withSpring(layout.width, SPRING_CONFIG);
      }

      navigateToVisibleIndex(nextIndex);
    },
    [activeVisibleIndex, indicatorX, indicatorW, navigateToVisibleIndex, visibleTabs]
  );

  const swipeGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .failOffsetY([-14, 14])
        .onEnd((event) => {
          const canSwipe =
            Math.abs(event.translationX) > SWIPE_TRANSLATION_THRESHOLD ||
            Math.abs(event.velocityX) > SWIPE_VELOCITY_THRESHOLD;

          if (!canSwipe) return;

          const ltrDirection: -1 | 1 = event.translationX > 0 ? -1 : 1;
          const direction = I18nManager.isRTL ? ((ltrDirection * -1) as -1 | 1) : ltrDirection;
          runOnJS(handleSwipe)(direction);
        }),
    [handleSwipe]
  );

  // Indicator animated style with both translateX and width
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorW.value,
  }));

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.tabBarOuter}>
        {/* Main frosted glass bar */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 90 : 60}
          tint="dark"
          style={styles.tabBarBlur}
        >
          <View style={styles.tabBarInner}>
            {/* 3D Glass Pill Indicator */}
            {layoutsReady && activeVisibleIndex >= 0 && (
              <GlassPill indicatorStyle={indicatorStyle} />
            )}

            {/* Tab Items */}
            {visibleTabs.map((route: any, index: number) => {
              const routeIndex = state.routes.indexOf(route);
              const isTasbih = route.name === 'tasbih-placeholder';
              const config = TAB_CONFIG[route.name] || { icon: 'circle', labelKey: route.name };
              const label = t(`tabs.${config.labelKey}`) || config.labelKey;

              const onPress = () => {
                // Animate indicator on press
                const layout = tabLayouts.current[index];
                if (layout) {
                  indicatorX.value = withSpring(layout.x, SPRING_CONFIG);
                  indicatorW.value = withSpring(layout.width, SPRING_CONFIG);
                }

                if (isTasbih) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/tasbih');
                  return;
                }

                const isFocused = state.index === routeIndex;
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(route.name);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    handleTabLayout(index, x, width);
                  }}
                  style={styles.tabItem}
                >
                  <TabIcon
                    name={config.icon}
                    label={label}
                    activeProgress={progressRefs[index]}
                  />
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </GestureDetector>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function TabsLayout() {
  const { isDarkMode, t } = useSettings();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} isDarkMode={isDarkMode} t={t} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* الإعدادات */}
        <Tabs.Screen name="settings" options={{ title: 'الإعدادات' }} />

        {/* الصلاة */}
        <Tabs.Screen name="prayer" options={{ title: 'الصلاة' }} />

        {/* التسبيح - inline tab */}
        <Tabs.Screen
          name="tasbih-placeholder"
          options={{ title: 'تسبيح' }}
          listeners={{ tabPress: (e) => e.preventDefault() }}
        />

        {/* القرآن */}
        <Tabs.Screen name="quran" options={{ title: 'القرآن' }} />

        {/* رئيسية */}
        <Tabs.Screen name="index" options={{ title: 'رئيسية' }} />

        {/* إخفاء الشاشات الأخرى */}
        <Tabs.Screen name="qibla" options={{ href: null }} />
        <Tabs.Screen name="favorites" options={{ href: null }} />
        <Tabs.Screen name="khatm" options={{ href: null }} />
        <Tabs.Screen name="wird" options={{ href: null }} />
        <Tabs.Screen name="tasbih" options={{ href: null }} />
        <Tabs.Screen name="quran-search" options={{ href: null }} />
        <Tabs.Screen name="recitations" options={{ href: null }} />
        <Tabs.Screen name="tafsir-search" options={{ href: null }} />
        <Tabs.Screen name="daily-ayah" options={{ href: null }} />
        <Tabs.Screen name="hijri-calendar" options={{ href: null }} />
        <Tabs.Screen name="notifications-center" options={{ href: null }} />
        <Tabs.Screen name="azkar" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  // ─── Tab Bar Container ───────────────────────
  tabBarOuter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 18,
    left: 16,
    right: 16,
    height: 68,
  },

  // ─── Frosted Glass Base ───────────────────────
  tabBarBlur: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },

  tabBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    position: 'relative',
  },

  // ─── 3D Glass Pill (sliding indicator) ────────
  slidingIndicator: {
    position: 'absolute',
    top: 5,
    left: 0,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },

  glassPillOuter: {
    flex: 1,
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(255,255,255,0.3)',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },

  glassPillBlur: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: INDICATOR_BORDER_COLOR,
  },

  glassPillInner: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: INDICATOR_BG,
  },

  // ─── Tab Items ────────────────────────────────
  tabItem: {
    flex: 1,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  iconCircle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabLabel: {
    fontFamily: 'Cairo-Medium',
    fontSize: 10,
    lineHeight: 14,
  },
});
