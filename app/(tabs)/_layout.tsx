// app/(tabs)/_layout.tsx
// iOS: Native UITabBarController (NativeTabs) for system-native look
// Android: Headless Tabs + custom glass-blur tab bar matching iOS aesthetic
// Tab order adapts to RTL/LTR

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Tabs, TabSlot, TabList, TabTrigger } from 'expo-router/ui';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const FALLBACK_LABELS: Record<string, string> = {
  settings: 'Settings',
  prayer: 'Prayer',
  tasbih: 'Tasbih',
  quran: 'Quran',
  home: 'Home',
};

// Tab configuration
const TAB_CONFIG = [
  { name: 'index', iconName: 'home-variant' as const, labelKey: 'home', href: '/' as const },
  { name: 'quran', iconName: 'book-open-variant' as const, labelKey: 'quran', href: '/quran' as const },
  { name: 'tasbih', iconName: 'counter' as const, labelKey: 'tasbih', href: '/tasbih' as const },
  { name: 'prayer', iconName: 'mosque' as const, labelKey: 'prayer', href: '/prayer' as const },
  { name: 'settings', iconName: 'cog-outline' as const, labelKey: 'settings', href: '/settings' as const },
];

const LTR_ORDER = ['index', 'quran', 'tasbih', 'prayer', 'settings'];
const RTL_ORDER = ['settings', 'prayer', 'tasbih', 'quran', 'index'];

// ─── iOS Layout (NativeTabs) ─────────────────────

function IOSTabsLayout() {
  const { t, settings, isDarkMode } = useSettings();
  const colors = useColors();
  const isRTLMode = useIsRTL();

  const resolveLabel = (key: string) => t(`tabs.${key}`) || FALLBACK_LABELS[key];
  const hasBg = settings?.display?.appBackground && settings.display.appBackground !== 'none';
  const tabDark = isDarkMode || !!hasBg;

  const activeColor = '#0d8e62';
  const inactiveColor = tabDark ? '#A3A3A3' : (colors.icon || '#525252');
  const tabBarBg = hasBg ? undefined : colors.tabBarBackground;

  const tabOrder = isRTLMode ? RTL_ORDER : LTR_ORDER;
  const orderedTabs = tabOrder.map(name => TAB_CONFIG.find(tab => tab.name === name)!);

  return (
    <BackgroundWrapper
      backgroundKey={settings?.display?.appBackground}
      backgroundUrl={settings?.display?.appBackgroundUrl}
      opacity={settings?.display?.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <NativeTabs
        key={isRTLMode ? 'rtl' : 'ltr'}
        tintColor={activeColor}
        iconColor={{ default: inactiveColor, selected: activeColor }}
        backgroundColor={tabBarBg}
        disableIndicator={false}
        labelStyle={{
          default: { fontSize: 12, fontFamily: 'Cairo-Medium', color: inactiveColor },
          selected: { fontSize: 12, fontFamily: 'Cairo-SemiBold', color: activeColor },
        }}
      >
        {orderedTabs.map((tab) => (
          <NativeTabs.Trigger key={tab.name} name={tab.name}>
            <Icon src={<VectorIcon family={MaterialCommunityIcons} name={tab.iconName} />} />
            <Label>{resolveLabel(tab.labelKey)}</Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    </BackgroundWrapper>
  );
}

// ─── Android Layout (Headless Tabs + Glass Tab Bar) ──

function AndroidTabsLayout() {
  const { t, settings, isDarkMode } = useSettings();
  const colors = useColors();
  const isRTLMode = useIsRTL();
  const insets = useSafeAreaInsets();

  const resolveLabel = (key: string) => t(`tabs.${key}`) || FALLBACK_LABELS[key];
  const hasBg = settings?.display?.appBackground && settings.display.appBackground !== 'none';
  const tabDark = isDarkMode || !!hasBg;

  const activeColor = '#0d8e62';
  const inactiveColor = tabDark ? '#A3A3A3' : (colors.icon || '#525252');

  const tabOrder = isRTLMode ? RTL_ORDER : LTR_ORDER;
  const orderedTabs = tabOrder.map(name => TAB_CONFIG.find(tab => tab.name === name)!);

  return (
    <BackgroundWrapper
      backgroundKey={settings?.display?.appBackground}
      backgroundUrl={settings?.display?.appBackgroundUrl}
      opacity={settings?.display?.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <Tabs key={isRTLMode ? 'rtl' : 'ltr'}>
        <TabSlot />
        <TabList
          style={[
            androidStyles.tabList,
            {
              paddingBottom: insets.bottom + 8,
              borderTopColor: isDarkMode
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.10)',
            },
          ]}
        >
          {/* Glass blur background (absolute positioned, won't affect flex layout) */}
          <BlurView
            intensity={isDarkMode ? 120 : 120}
            tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
            style={StyleSheet.absoluteFill}
          />
          {/* Semi-transparent overlay for depth */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: hasBg
                  ? 'rgba(0,0,0,0.85)'
                  : isDarkMode
                    ? 'rgba(30, 30, 30, 0.85)'
                    : 'rgba(255, 255, 255, 0.90)',
              },
            ]}
          />
          {/* Tab triggers */}
          {orderedTabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <AndroidTabButton
                iconName={tab.iconName}
                label={resolveLabel(tab.labelKey)}
                activeColor={activeColor}
                inactiveColor={inactiveColor}
              />
            </TabTrigger>
          ))}
        </TabList>
      </Tabs>
    </BackgroundWrapper>
  );
}

// ─── Custom Tab Button for Android ───────────────

const AndroidTabButton = React.forwardRef<
  View,
  {
    iconName: string;
    label: string;
    activeColor: string;
    inactiveColor: string;
    isFocused?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
  }
>(({ iconName, label, activeColor, inactiveColor, isFocused, onPress, onLongPress, ...rest }, ref) => {
  const color = isFocused ? activeColor : inactiveColor;

  return (
    <Pressable
      ref={ref}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={androidStyles.tabButton}
      accessibilityRole="tab"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      {...rest}
    >
      <View style={androidStyles.tabButtonInner}>
        <View style={androidStyles.tabIconWrap}>
          <MaterialCommunityIcons name={iconName as any} size={24} color={color} />
        </View>
        <Text
          style={[
            androidStyles.tabLabel,
            {
              color,
              fontFamily: isFocused ? 'Cairo-SemiBold' : 'Cairo-Medium',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
});

// ─── Entry Point ─────────────────────────────────

export default function TabsLayout() {
  if (Platform.OS === 'ios') {
    return <IOSTabsLayout />;
  }
  return <AndroidTabsLayout />;
}

// ─── Android Styles ──────────────────────────────

const androidStyles = StyleSheet.create({
  tabList: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
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
    minHeight: 48,
    gap: 2,
  },
  tabIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});
