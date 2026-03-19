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
}: NativeTabsProps) {
  const colors = useColors();
  const { settings } = useSettings();
  const isDark = settings?.theme === 'dark';
  const activeColor = indicatorColor ?? colors.primary;
  const isRTL = useIsRTL();
  const displayTabs = useMemo(() => isRTL ? [...tabs].reverse() : tabs, [tabs, isRTL]);
  const selectedIndex = displayTabs.findIndex((t) => t.key === selected);
  const values = useMemo(() => displayTabs.map((t) => t.label), [displayTabs]);

  if (!SegmentedControl) {
    // Fallback if native control unavailable
    return <AndroidMaterialTabs tabs={tabs} selected={selected} onSelect={onSelect} indicatorColor={indicatorColor} style={style} />;
  }

  return (
    <View style={[iosStyles.container, style]}>
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
        activeFontStyle={iosStyles.activeFont}
        fontStyle={iosStyles.inactiveFont}
        tintColor={activeColor}
        style={iosStyles.segmented}
      />
    </View>
  );
}

const iosStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  segmented: {
    height: 36,
  },
  activeFont: {
    fontSize: 14,
    fontFamily: fontBold(),
    fontWeight: '700',
  },
  inactiveFont: {
    fontSize: 14,
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
}: NativeTabsProps) {
  const colors = useColors();
  const { settings } = useSettings();
  const isDark = settings?.theme === 'dark';
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

  return (
    <View style={[m3Styles.container, style]}>
      <View
        style={[
          m3Styles.segmentRow,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
            backgroundColor: isDark ? 'rgba(30,30,32,0.85)' : 'rgba(255,255,255,0.92)',
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
                    ? activeColor + (isDark ? 'CC' : '22')
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
                      ? (isDark ? '#fff' : activeColor)
                      : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'),
                    fontFamily: isActive ? fontBold() : fontSemiBold(),
                  },
                ]}
                numberOfLines={1}
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

const m3Styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
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
