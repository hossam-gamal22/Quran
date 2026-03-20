// app/(tabs)/_layout.tsx
// Bottom tabs using @react-navigation/bottom-tabs via expo-router Tabs
// Tab order adapts to RTL/LTR: Home on the leading edge (left in LTR, right in RTL)

import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
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

  // When a background is active, make tab bar transparent so the background shows through
  const tabBarBg = hasBg
    ? 'transparent'
    : (bgColor || (Platform.OS === 'ios' ? undefined : '#101621'));

  // Pick tab order based on language direction
  const tabOrder = isRTLMode ? RTL_ORDER : LTR_ORDER;
  const orderedTabs = tabOrder.map(name => TAB_CONFIG.find(tab => tab.name === name)!);

  // All tab names for hiding unordered ones
  const allTabNames = TAB_CONFIG.map(t => t.name);
  // Extra route files in (tabs)/ that should be hidden from tab bar
  const HIDDEN_ROUTES = [
    'azkar', 'favorites', 'hijri-calendar', 'khatm',
    'notifications-center', 'qibla', 'quran-search',
    'recitations', 'tafsir-search', 'tasbih-placeholder', 'wird',
  ];

  const tabs = (
    <Tabs
      key={isRTLMode ? 'rtl' : 'ltr'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: {
          fontFamily: fontMedium(),
          fontSize: LABEL_SIZE,
        },
        tabBarActiveBackgroundColor: undefined,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: Platform.OS === 'ios' ? undefined : '#1f3020',
          borderTopWidth: Platform.OS === 'ios' ? undefined : 1,
          elevation: Platform.OS === 'ios' ? undefined : 8,
        },
      }}
    >
      {orderedTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: resolveLabel(tab.labelKey),
            tabBarLabelStyle: {
              fontFamily: fontMedium(),
              fontSize: LABEL_SIZE,
            },
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={tab.iconName} size={size} color={color} />
            ),
          }}
        />
      ))}
      {/* Hide extra route files in (tabs) that aren't main tabs */}
      {HIDDEN_ROUTES.map(name => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
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
