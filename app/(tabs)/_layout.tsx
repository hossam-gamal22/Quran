// app/(tabs)/_layout.tsx
// Native system tabs for iOS/Android behavior — icons + text labels
// Tab order adapts to RTL/LTR: Home on the leading edge (left in LTR, right in RTL)

import React from 'react';
import { Platform, View } from 'react-native';
import { NativeTabs, Label, Icon, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { fontMedium, fontSemiBold } from '@/lib/fonts';

const FALLBACK_LABELS: Record<string, string> = {
  settings: 'Settings',
  prayer: 'Prayer',
  tasbih: 'Tasbih',
  quran: 'Quran',
  home: 'Home',
};

// Tab configuration — each tab's route name, icon, and translation key
const TAB_CONFIG = [
  { name: 'index', iconName: 'home-variant' as const, labelKey: 'home' },
  { name: 'quran', iconName: 'book-open-variant' as const, labelKey: 'quran' },
  { name: 'tasbih', iconName: 'counter' as const, labelKey: 'tasbih' },
  { name: 'prayer', iconName: 'mosque' as const, labelKey: 'prayer' },
  { name: 'settings', iconName: 'cog-outline' as const, labelKey: 'settings' },
];

// LTR order: Home(left) → Quran → Tasbih → Prayer → Settings(right)
const LTR_ORDER = ['index', 'quran', 'tasbih', 'prayer', 'settings'];
// RTL order: Settings(left) → Prayer → Tasbih → Quran → Home(right)
// Home visually appears on the right (leading edge in RTL)
const RTL_ORDER = ['settings', 'prayer', 'tasbih', 'quran', 'index'];

export default function TabsLayout() {
  const { t, settings } = useSettings();
  const colors = useColors();
  const isRTLMode = useIsRTL();

  const resolveLabel = (key: string) => t(`tabs.${key}`) || FALLBACK_LABELS[key];

  const LABEL_SIZE = 10;
  const activeColor = (colors as any).tabBarActive || '#22C55E';
  const inactiveColor = (colors as any).tabBarInactive || (Platform.OS === 'ios' ? '#6B7280' : '#B8C0CC');
  const bgColor = (colors as any).tabBarBackground;

  const hasBg = settings?.display?.appBackground && settings.display.appBackground !== 'none';

  const selectedStyle = { color: activeColor, fontFamily: fontSemiBold(), fontSize: LABEL_SIZE + 1 };

  const isNative = Platform.OS !== 'web';

  // When a background is active, make tab bar transparent so the background shows through
  const tabBarBg = hasBg
    ? 'transparent'
    : (bgColor || (Platform.OS === 'ios' ? undefined : '#101621'));

  // Pick tab order based on language direction
  const tabOrder = isRTLMode ? RTL_ORDER : LTR_ORDER;
  const orderedTabs = tabOrder.map(name => TAB_CONFIG.find(tab => tab.name === name)!);

  const tabs = (
    <NativeTabs
      key={isRTLMode ? 'rtl' : 'ltr'}
      disableTransparentOnScrollEdge
      tintColor={activeColor}
      labelStyle={{
        fontFamily: fontMedium(),
        fontSize: LABEL_SIZE,
        color: inactiveColor,
      }}
      backgroundColor={tabBarBg}
    >
      {orderedTabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name} options={{ selectedLabelStyle: selectedStyle }}>
          {isNative && <Icon src={<VectorIcon family={MaterialCommunityIcons} name={tab.iconName} />} />}
          <Label>{resolveLabel(tab.labelKey)}</Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );

  // Wrap in BackgroundWrapper when a background is active so img extends behind tab bar
  if (hasBg) {
    return (
      <BackgroundWrapper
        backgroundKey={settings.display.appBackground}
        backgroundUrl={settings.display.appBackgroundUrl}
        opacity={settings.display.backgroundOpacity ?? 1}
        style={{ flex: 1 }}
      >
        {tabs}
      </BackgroundWrapper>
    );
  }

  return tabs;
}
