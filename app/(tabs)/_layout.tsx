// app/(tabs)/_layout.tsx
// Native system tabs for iOS/Android behavior

import React from 'react';
import { Platform } from 'react-native';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppConfig } from '@/lib/app-config-context';
import type { ConfigurableNavItem } from '@/lib/app-config-api';

const FALLBACK_LABELS: Record<string, string> = {
  settings: 'الإعدادات',
  prayer: 'الصلاة',
  tasbih: 'تسبيح',
  quran: 'القرآن',
  home: 'الرئيسية',
};

const TAB_ACCENTS = {
  settings: '#60A5FA',
  prayer: '#22C55E',
  tasbih: '#F59E0B',
  quran: '#8B5CF6',
  index: '#EF4444',
} as const;

const TAB_FALLBACKS = {
  settings: { sf: { default: 'gearshape', selected: 'gearshape.fill' }, material: { default: 'cog-outline', selected: 'cog' } },
  prayer: { sf: { default: 'building.columns', selected: 'building.columns.fill' }, material: { default: 'mosque', selected: 'mosque' } },
  tasbih: { sf: { default: 'hand.raised', selected: 'hand.raised.fill' }, material: { default: 'counter', selected: 'counter' } },
  quran: { sf: { default: 'book', selected: 'book.fill' }, material: { default: 'book-open-variant', selected: 'book-open-variant' } },
  index: { sf: { default: 'house', selected: 'house.fill' }, material: { default: 'home-variant-outline', selected: 'home-variant' } },
} as const;

function tabLabel(t: (key: string) => string, key: keyof typeof FALLBACK_LABELS) {
  return t(`tabs.${key}`) || FALLBACK_LABELS[key];
}

export default function TabsLayout() {
  const { t, settings } = useSettings();
  const { config } = useAppConfig();

  const language = settings.language || 'ar';
  const ui = config.uiCustomization;
  const tabLayout = ui?.tabBarLayout;

  const findItem = React.useCallback(
    (key: keyof typeof TAB_FALLBACKS): ConfigurableNavItem | undefined =>
      ui?.tabBarItems?.find((item) => item.key === key),
    [ui?.tabBarItems]
  );

  const resolveLabel = React.useCallback(
    (key: keyof typeof TAB_FALLBACKS, fallbackKey: keyof typeof FALLBACK_LABELS) => {
      const item = findItem(key);
      if (item) {
        if (language === 'ar') return item.labelAr || FALLBACK_LABELS[fallbackKey];
        return item.labelEn || item.labelAr || FALLBACK_LABELS[fallbackKey];
      }
      return t(`tabs.${fallbackKey}`) || FALLBACK_LABELS[fallbackKey];
    },
    [findItem, language, t]
  );

  const renderTabIcon = React.useCallback(
    (key: keyof typeof TAB_FALLBACKS) => {
      const item = findItem(key);
      const icon = item?.icon;
      const fallback = TAB_FALLBACKS[key];

      if (icon?.mode === 'png' && (icon.pngUrl || icon.selectedPngUrl)) {
        const def = icon.pngUrl || icon.selectedPngUrl!;
        const sel = icon.selectedPngUrl || icon.pngUrl!;
        return <Icon src={{ default: { uri: def }, selected: { uri: sel } }} />;
      }

      if (icon?.mode === 'ionicons' && (icon.name || icon.selectedName)) {
        const def = icon.name || icon.selectedName!;
        const sel = icon.selectedName || icon.name!;
        return (
          <Icon
            src={{
              default: <VectorIcon family={Ionicons} name={def as any} />,
              selected: <VectorIcon family={Ionicons} name={sel as any} />,
            }}
          />
        );
      }

      if (icon?.mode === 'material' && (icon.name || icon.selectedName)) {
        const def = icon.name || icon.selectedName!;
        const sel = icon.selectedName || icon.name!;
        return (
          <Icon
            src={{
              default: <VectorIcon family={MaterialCommunityIcons} name={def as any} />,
              selected: <VectorIcon family={MaterialCommunityIcons} name={sel as any} />,
            }}
          />
        );
      }

      if (icon?.mode === 'sf' && (icon.name || icon.selectedName)) {
        const def = icon.name || icon.selectedName!;
        const sel = icon.selectedName || icon.name!;
        return <Icon sf={{ default: def as any, selected: sel as any }} />;
      }

      return (
        <Icon
          sf={{ default: fallback.sf.default as any, selected: fallback.sf.selected as any }}
          androidSrc={{
            default: <VectorIcon family={MaterialCommunityIcons} name={fallback.material.default as any} />,
            selected: <VectorIcon family={MaterialCommunityIcons} name={fallback.material.selected as any} />,
          }}
        />
      );
    },
    [findItem]
  );

  // DynamicColorIOS only works on iOS native, fallback for web/other
  const iosActive = Platform.OS === 'ios'
    ? require('react-native').DynamicColorIOS({ light: '#111111', dark: '#FFFFFF' })
    : '#111111';
  const iosInactive = Platform.OS === 'ios'
    ? require('react-native').DynamicColorIOS({ light: '#6B7280', dark: '#9CA3AF' })
    : '#6B7280';
  const resolvedLabelSize = tabLayout?.labelFontSize ?? 11;
  const resolvedVerticalOffset = tabLayout?.titleVerticalOffset ?? 2;
  const resolvedSelectedOpacity = Math.max(tabLayout?.selectedBgOpacity ?? 0.16, 0.22);
  const ACTIVE_GREEN = '#22C55E';

  return (
    <NativeTabs
      // Keep native bar visual stable on iOS scroll edges
      disableTransparentOnScrollEdge
      tintColor={ACTIVE_GREEN}
      labelStyle={{
        fontFamily: 'Cairo-Medium',
        fontSize: resolvedLabelSize,
        color: Platform.OS === 'ios' ? iosInactive : '#B8C0CC',
      }}
      iconColor={Platform.OS === 'ios' ? iosInactive : '#B8C0CC'}
      backgroundColor={Platform.OS === 'ios' ? undefined : '#101621'}
    >
      <NativeTabs.Trigger
        name="settings"
        selectedIconColor={ACTIVE_GREEN}
        iconColor={{ default: Platform.OS === 'ios' ? iosInactive : '#B8C0CC', selected: ACTIVE_GREEN }}
        selectedLabelStyle={{ color: ACTIVE_GREEN, fontFamily: 'Cairo-SemiBold', fontSize: resolvedLabelSize + 1 }}
        titlePositionAdjustment={{ vertical: resolvedVerticalOffset }}
      >
        <Label>{resolveLabel('settings', 'settings')}</Label>
        {renderTabIcon('settings')}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="prayer"
        selectedIconColor={ACTIVE_GREEN}
        iconColor={{ default: Platform.OS === 'ios' ? iosInactive : '#B8C0CC', selected: ACTIVE_GREEN }}
        selectedLabelStyle={{ color: ACTIVE_GREEN, fontFamily: 'Cairo-SemiBold', fontSize: resolvedLabelSize + 1 }}
        titlePositionAdjustment={{ vertical: resolvedVerticalOffset }}
      >
        <Label>{resolveLabel('prayer', 'prayer')}</Label>
        {renderTabIcon('prayer')}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="tasbih"
        selectedIconColor={ACTIVE_GREEN}
        iconColor={{ default: Platform.OS === 'ios' ? iosInactive : '#B8C0CC', selected: ACTIVE_GREEN }}
        selectedLabelStyle={{ color: ACTIVE_GREEN, fontFamily: 'Cairo-SemiBold', fontSize: resolvedLabelSize + 1 }}
        titlePositionAdjustment={{ vertical: resolvedVerticalOffset }}
      >
        <Label>{resolveLabel('tasbih', 'tasbih')}</Label>
        {renderTabIcon('tasbih')}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="quran"
        selectedIconColor={ACTIVE_GREEN}
        iconColor={{ default: Platform.OS === 'ios' ? iosInactive : '#B8C0CC', selected: ACTIVE_GREEN }}
        selectedLabelStyle={{ color: ACTIVE_GREEN, fontFamily: 'Cairo-SemiBold', fontSize: resolvedLabelSize + 1 }}
        titlePositionAdjustment={{ vertical: resolvedVerticalOffset }}
      >
        <Label>{resolveLabel('quran', 'quran')}</Label>
        {renderTabIcon('quran')}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="index"
        selectedIconColor={ACTIVE_GREEN}
        iconColor={{ default: Platform.OS === 'ios' ? iosInactive : '#B8C0CC', selected: ACTIVE_GREEN }}
        selectedLabelStyle={{ color: ACTIVE_GREEN, fontFamily: 'Cairo-SemiBold', fontSize: resolvedLabelSize + 1 }}
        titlePositionAdjustment={{ vertical: resolvedVerticalOffset }}
      >
        <Label>{resolveLabel('index', 'home')}</Label>
        {renderTabIcon('index')}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
