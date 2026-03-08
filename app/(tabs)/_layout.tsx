// app/(tabs)/_layout.tsx
// Native system tabs for iOS/Android behavior — icons + text labels

import React from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Label } from 'expo-router/unstable-native-tabs';
import { useSettings } from '@/contexts/SettingsContext';

// Icon/VectorIcon crash on web SSR (expo-font.renderToImageAsync unavailable)
// Only import and use on native platforms
let Icon: any = null;
let VectorIcon: any = null;
let MaterialCommunityIcons: any = null;

if (Platform.OS !== 'web') {
  const nativeTabs = require('expo-router/unstable-native-tabs');
  Icon = nativeTabs.Icon;
  VectorIcon = nativeTabs.VectorIcon;
  MaterialCommunityIcons = require('@expo/vector-icons/MaterialCommunityIcons').default;
}

const FALLBACK_LABELS: Record<string, string> = {
  settings: 'الإعدادات',
  prayer: 'الصلاة',
  tasbih: 'تسبيح',
  quran: 'القرآن',
  home: 'الرئيسية',
};

const TAB_ICONS: Record<string, string> = {
  settings: 'cog-outline',
  prayer: 'mosque',
  tasbih: 'counter',
  quran: 'book-open-variant',
  index: 'home-variant',
};

function TabIcon({ name }: { name: string }) {
  if (Platform.OS === 'web' || !Icon || !VectorIcon || !MaterialCommunityIcons) return null;
  return <Icon src={<VectorIcon family={MaterialCommunityIcons} name={TAB_ICONS[name]} />} />;
}

export default function TabsLayout() {
  const { t } = useSettings();

  const resolveLabel = (key: string) => t(`tabs.${key}`) || FALLBACK_LABELS[key];

  const LABEL_SIZE = 10;
  const ACTIVE_GREEN = '#22C55E';
  const inactiveColor = Platform.OS === 'ios' ? '#6B7280' : '#B8C0CC';

  const selectedStyle = { color: ACTIVE_GREEN, fontFamily: 'Cairo-SemiBold', fontSize: LABEL_SIZE + 1 };

  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      tintColor={ACTIVE_GREEN}
      labelStyle={{
        fontFamily: 'Cairo-Medium',
        fontSize: LABEL_SIZE,
        color: inactiveColor,
      }}
      backgroundColor={Platform.OS === 'ios' ? undefined : '#101621'}
    >
      <NativeTabs.Trigger name="settings" options={{ selectedLabelStyle: selectedStyle }}>
        <TabIcon name="settings" />
        <Label>{resolveLabel('settings')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="prayer" options={{ selectedLabelStyle: selectedStyle }}>
        <TabIcon name="prayer" />
        <Label>{resolveLabel('prayer')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tasbih" options={{ selectedLabelStyle: selectedStyle }}>
        <TabIcon name="tasbih" />
        <Label>{resolveLabel('tasbih')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="quran" options={{ selectedLabelStyle: selectedStyle }}>
        <TabIcon name="quran" />
        <Label>{resolveLabel('quran')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="index" options={{ selectedLabelStyle: selectedStyle }}>
        <TabIcon name="index" />
        <Label>{resolveLabel('home')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
