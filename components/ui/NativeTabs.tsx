// components/ui/NativeTabs.tsx
// تبويبات أصلية موحدة - روح المسلم
// iOS: UISegmentedControl الأصلي
// Android: Material Design 3 segmented button

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, Platform, useColorScheme } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { fontBold, fontSemiBold } from '@/lib/fonts';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
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
  /** Height of the indicator line (ignored in native segmented mode) */
  indicatorHeight?: number;
  /** Minimal/transparent background style */
  transparent?: boolean;
}

// ========================================
// Spring config
// ========================================

const SPRING_CONFIG = { damping: 22, stiffness: 260, mass: 0.8 };

// ========================================
// iOS: Native UISegmentedControl
// ========================================

let SegmentedControl: React.ComponentType<any> | null = null;
if (Platform.OS === 'ios') {
  try {
    SegmentedControl = require('@react-native-segmented-control/segmented-control').default;
  } catch {
    // fallback to custom implementation
  }
}

function IOSNativeTabs({
  tabs,
  selected,
  onSelect,
  indicatorColor,
  style,
  transparent,
}: NativeTabsProps) {
  const colors = useColors();
  const iosStyles = useScaledStyles(_iosStyles, colors.fs);
  const { isDarkMode } = useSettings();
  const isDark = isDarkMode || colors.hasBgOverride;
  const activeColor = indicatorColor ?? colors.primary;
  const isRTL = useIsRTL();
  const displayTabs = useMemo(() => isRTL ? [...tabs].reverse() : tabs, [tabs, isRTL]);
  const selectedIndex = displayTabs.findIndex((t) => t.key === selected);
  const values = useMemo(() => displayTabs.map((t) => t.label), [displayTabs]);

  if (!SegmentedControl) {
    return <AndroidMaterialTabs tabs={tabs} selected={selected} onSelect={onSelect} indicatorColor={indicatorColor} style={style} transparent={transparent} />;
  }

  const bgColor = transparent
    ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
    : (isDark ? 'rgba(30,30,32,0.85)' : 'rgba(235,235,235,0.92)');

  return (
    <View style={[iosStyles.outerClip, { backgroundColor: bgColor }, style]}>
      <SegmentedControl
        values={values}
        selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
        onChange={(event: any) => {
          const idx = event.nativeEvent.selectedSegmentIndex;
          if (idx >= 0 && idx < displayTabs.length) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(displayTabs[idx].key);
          }
        }}
        appearance={isDark ? 'dark' : 'light'}
        activeFontStyle={{ ...iosStyles.activeFont, color: '#FFFFFF' }}
        fontStyle={iosStyles.inactiveFont}
        tintColor={activeColor}
        backgroundColor={bgColor}
        style={iosStyles.segmented}
      />
    </View>
  );
}

const _iosStyles = StyleSheet.create({
  outerClip: {
    borderRadius: 9,
    overflow: 'hidden',
  },
  segmented: {
    height: 40,
    margin: -2,
  },
  activeFont: {
    fontSize: 13,
    fontFamily: fontBold(),
    fontWeight: '700',
  },
  inactiveFont: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    fontWeight: '600',
  },
});

// ========================================
// Android: Material Design 3 Segmented Button
// ========================================

function AndroidMaterialTabs({
  tabs,
  selected,
  onSelect,
  indicatorColor,
  style,
  transparent,
}: NativeTabsProps) {
  const colors = useColors();
  const m3Styles = useScaledStyles(_m3Styles, colors.fs);
  const { isDarkMode } = useSettings();
  const isDark = isDarkMode || colors.hasBgOverride;
  const activeColor = indicatorColor ?? colors.primary;
  const isRTL = useIsRTL();

  const selectedIndex = tabs.findIndex((t) => t.key === selected);
  const indicatorPos = useSharedValue(selectedIndex >= 0 ? selectedIndex : 0);

  React.useEffect(() => {
    const idx = tabs.findIndex((t) => t.key === selected);
    if (idx >= 0) {
      indicatorPos.value = withSpring(idx, SPRING_CONFIG);
    }
  }, [selected, tabs]);

  // Transparent/minimal background colors
  const bgColor = transparent
    ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
    : (isDark ? 'rgba(30,30,32,0.85)' : 'rgba(255,255,255,0.92)');
  const borderColor = transparent
    ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
    : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)');

  return (
    <View style={[m3Styles.container, style]}>
      <View
        style={[
          m3Styles.segmentRow,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            borderColor: borderColor,
            backgroundColor: bgColor,
          },
        ]}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.key === selected;
          const isFirst = index === 0;
          const isLast = index === tabs.length - 1;

          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(tab.key);
              }}
              style={[
                m3Styles.segment,
                {
                  backgroundColor: isActive
                    ? activeColor
                    : 'transparent',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  borderLeftWidth: !isRTL && !isFirst ? StyleSheet.hairlineWidth : 0,
                  borderRightWidth: isRTL && !isFirst ? StyleSheet.hairlineWidth : 0,
                  borderTopLeftRadius: (isRTL ? isLast : isFirst) ? 12 : 0,
                  borderBottomLeftRadius: (isRTL ? isLast : isFirst) ? 12 : 0,
                  borderTopRightRadius: (isRTL ? isFirst : isLast) ? 12 : 0,
                  borderBottomRightRadius: (isRTL ? isFirst : isLast) ? 12 : 0,
                },
              ]}
            >
              <Text
                style={[
                  m3Styles.segmentText,
                  {
                    color: isActive
                      ? '#fff'
                      : (isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)'),
                    fontFamily: isActive ? fontBold() : fontSemiBold(),
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const _m3Styles = StyleSheet.create({
  container: {
    // No padding — let the segmented row fill the container fully
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
    paddingHorizontal: 4,
  },
});

// ========================================
// NativeTabs — Platform router
// ========================================

export function NativeTabs(props: NativeTabsProps) {
  if (Platform.OS === 'ios') {
    return <IOSNativeTabs {...props} />;
  }
  return <AndroidMaterialTabs {...props} />;
}

export default NativeTabs;
