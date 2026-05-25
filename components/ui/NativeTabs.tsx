// components/ui/NativeTabs.tsx
// System-native segmented tabs across the app.
// iOS: UIKit UISegmentedControl (via @react-native-segmented-control/segmented-control).
// Android: the same package's native-looking JS fallback.
// Scrollable variant: horizontal chip row (used when there are too many tabs to fit).

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  Platform,
  ScrollView,
  LayoutChangeEvent,
} from 'react-native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as Haptics from 'expo-haptics';
import { fontBold, fontSemiBold } from '@/lib/fonts';
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
  /** Whether to use a scrollable chip-row fallback instead of the segmented control */
  scrollable?: boolean;
  /** Container style overrides */
  style?: ViewStyle;
  /** Height of the indicator line (kept for API compatibility) */
  indicatorHeight?: number;
  /** Minimal/transparent background style */
  transparent?: boolean;
}

// ========================================
// SegmentedTabs — real UISegmentedControl on iOS, native-looking JS fallback on Android
// ========================================

function SegmentedTabs({ tabs, selected, onSelect, indicatorColor, style }: NativeTabsProps) {
  const colors = useColors();
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const activeColor = indicatorColor ?? colors.primary;
  const isDark = isDarkMode || colors.hasBgOverride;

  // UISegmentedControl doesn't know about RTL; we reverse the order manually so the
  // first tab sits on the right in Arabic layouts.
  const displayTabs = useMemo(() => (isRTL ? [...tabs].reverse() : tabs), [tabs, isRTL]);
  const values = useMemo(() => displayTabs.map((t) => t.label), [displayTabs]);
  const selectedIndex = Math.max(
    0,
    displayTabs.findIndex((t) => t.key === selected),
  );

  // Borderless: no explicit backgroundColor so the native control picks up its parent.
  // Selected segment: primary green tint. Inactive label: theme text color (NOT activeColor —
  // using activeColor on near-white surfaces renders as faded "silver" green, hard to read).
  const inactiveLabel = isDark ? '#FFFFFF' : (colors.text ?? '#1C1C1E');

  return (
    <View style={style}>
      <SegmentedControl
        values={values}
        selectedIndex={selectedIndex}
        onChange={(event: any) => {
          const idx = event.nativeEvent.selectedSegmentIndex;
          const tab = displayTabs[idx];
          if (!tab) return;
          if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect(tab.key);
        }}
        appearance={isDark ? 'dark' : 'light'}
        tintColor={activeColor}
        fontStyle={{
          color: inactiveLabel,
          fontSize: 14,
          fontFamily: fontSemiBold(),
        }}
        activeFontStyle={{
          color: '#FFFFFF',
          fontSize: 14,
          fontFamily: fontBold(),
          fontWeight: '700',
        }}
        style={segStyles.control}
      />
    </View>
  );
}

const segStyles = StyleSheet.create({
  control: {
    height: 36,
  },
});

// ========================================
// Scrollable chip-row fallback (for radio categories, etc.)
// ========================================

function ScrollableChipTabs({
  tabs,
  selected,
  onSelect,
  indicatorColor,
  style,
  transparent,
}: NativeTabsProps) {
  const colors = useColors();
  const chipStyles = useScaledStyles(_chipStyles, colors.fs);
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const activeColor = indicatorColor ?? colors.primary;
  const isDark = isDarkMode || colors.hasBgOverride;
  const scrollRef = useRef<ScrollView>(null);

  // Track viewport + content + per-chip layouts so we can:
  //   1. Anchor the first tab to the visual start (right edge in RTL, left in LTR).
  //   2. Scroll the currently-selected tab into view when `selected` changes.
  const viewportWidthRef = useRef(0);
  const contentWidthRef = useRef(0);
  const chipLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});

  const scrollSelectedIntoView = useCallback(
    (key: string, animated: boolean = true) => {
      const layout = chipLayoutsRef.current[key];
      const vp = viewportWidthRef.current;
      const cw = contentWidthRef.current;
      if (!layout || !vp || !cw) return;
      // Center the chip within the viewport when possible.
      const target = Math.max(0, layout.x + layout.width / 2 - vp / 2);
      const maxX = Math.max(0, cw - vp);
      const x = Math.min(target, maxX);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x, animated });
      });
    },
    []
  );

  // When selection changes programmatically (not from a tap), keep it visible.
  useEffect(() => {
    scrollSelectedIntoView(selected);
  }, [selected, scrollSelectedIntoView]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e: LayoutChangeEvent) => {
        viewportWidthRef.current = e.nativeEvent.layout.width;
        // Keep current selection visible whenever the viewport changes (e.g., rotation).
        scrollSelectedIntoView(selected, false);
      }}
      onContentSizeChange={(w) => {
        contentWidthRef.current = w;
        // Re-anchor on content size change (font load, locale switch, tab list change)
        // around the currently selected tab so the user's choice stays visible.
        scrollSelectedIntoView(selected, false);
      }}
      contentContainerStyle={[
        chipStyles.row,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      style={[
        chipStyles.container,
        !transparent && {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === selected;
        return (
          <Pressable
            key={tab.key}
            onLayout={(e: LayoutChangeEvent) => {
              const { x, width } = e.nativeEvent.layout;
              chipLayoutsRef.current[tab.key] = { x, width };
              if (tab.key === selected) {
                scrollSelectedIntoView(tab.key, false);
              }
            }}
            onPress={() => {
              if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(tab.key);
            }}
            style={[
              chipStyles.chip,
              {
                backgroundColor: isActive
                  ? activeColor
                  : isDark
                    ? 'rgba(255,255,255,0.18)'
                    : 'rgba(0,0,0,0.08)',
                borderColor: isActive
                  ? activeColor
                  : isDark
                    ? 'rgba(255,255,255,0.45)'
                    : 'rgba(0,0,0,0.28)',
              },
              isActive && {
                shadowColor: activeColor,
                shadowOpacity: 0.45,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              },
            ]}
          >
            <Text
              style={[
                chipStyles.chipLabel,
                {
                  color: isActive ? '#FFFFFF' : isDark ? '#FFFFFF' : 'rgba(0,0,0,0.88)',
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
    </ScrollView>
  );
}

const _chipStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
  },
  row: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: 13,
  },
});

// ========================================
// NativeTabs — picks the segmented control or scrollable chips based on props
// ========================================

export function NativeTabs(props: NativeTabsProps) {
  if (props.scrollable) {
    return <ScrollableChipTabs {...props} />;
  }
  return <SegmentedTabs {...props} />;
}

export default NativeTabs;
