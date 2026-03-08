// app/(tabs)/settings.tsx
// صفحة الإعدادات الرئيسية - روح المسلم

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  Linking,
  Share,
  Platform,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Application from 'expo-application';

import { useSettings, Language } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';

// ========================================
// مكونات فرعية
// ========================================

interface SettingItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  showArrow?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
  onPress?: () => void;
  onSwitchChange?: (value: boolean) => void;
  colors: ReturnType<typeof useColors>;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  iconColor = '#2f7659',
  title,
  subtitle,
  value,
  showArrow = true,
  showSwitch = false,
  switchValue = false,
  onPress,
  onSwitchChange,
  colors,
}) => {
  return (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.text === '#FFFFFF' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={showSwitch ? 1 : 0.7}
      disabled={showSwitch}
    >
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1, gap: 12 }}>
        <View style={[styles.settingIconBg, { backgroundColor: iconColor + '18' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.textLight }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {value && (
        <Text style={[styles.settingValue, { color: colors.textLight }]}>
          {value}
        </Text>
      )}

      {showSwitch && (
        <Switch
          value={switchValue}
          onValueChange={(val) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSwitchChange?.(val);
          }}
          trackColor={{ false: colors.text === '#FFFFFF' ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={colors.text === '#FFFFFF' ? '#39393D' : '#E9E9EB'}
        />
      )}

      {showArrow && !showSwitch && (
        <MaterialCommunityIcons
          name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
          size={22}
          color={colors.textLight}
        />
      )}
    </TouchableOpacity>
  );
};

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
  index: number;
  colors: ReturnType<typeof useColors>;
}

const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  children,
  index,
  colors,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <Text style={[styles.sectionTitle, { color: colors.textLight }]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, {
        backgroundColor: colors.text === '#FFFFFF'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(120,120,128,0.12)',
      }]}>
        {children}
      </View>
    </Animated.View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function SettingsScreen() {
  const router = useRouter();
  const {
    settings,
    isDarkMode,
    t,
    updateNotifications,
    resetSettings,
  } = useSettings();
  const colors = useColors();

  const appVersion = Application.nativeApplicationVersion || '1.0.0';

  // مشاركة التطبيق
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${t('settings.shareApp')}\nhttps://roohmuslim.app`,
        title: t('common.appName'),
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // تقييم التطبيق
  const handleRate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('https://apps.apple.com/app/rooh-muslim/id123456789');
  };

  // التواصل معنا
  const handleContact = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:support@roohmuslim.app?subject=تطبيق روح المسلم');
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
      />

      {/* الهيدر */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('settings.title')}
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* 1. العرض (Display) */}
        <SettingSection title={t('settings.display')} index={0} colors={colors}>
          <SettingItem
            icon="translate"
            iconColor="#3a7ca5"
            title={t('settings.language')}
            onPress={() => router.push('/settings/language')}
            colors={colors}
          />
          <SettingItem
            icon="format-size"
            iconColor="#c17f59"
            title={t('settings.displaySettings')}
            onPress={() => router.push('/settings/display')}
            colors={colors}
          />
        </SettingSection>

        {/* 2. الإشعارات (Notifications) */}
        <SettingSection title={t('settings.notifications')} index={1} colors={colors}>
          <SettingItem
            icon="bell"
            iconColor="#2f7659"
            title={t('settings.notifications')}
            showArrow={false}
            showSwitch
            switchValue={settings.notifications.enabled}
            onSwitchChange={(value) => updateNotifications({ enabled: value })}
            colors={colors}
          />
          <SettingItem
            icon="bell-cog"
            iconColor="#f5a623"
            title={t('settings.prayerNotifications')}
            subtitle={t('settings.azkarNotifications')}
            onPress={() => router.push('/settings/notifications')}
            colors={colors}
          />
        </SettingSection>

        {/* 3. الودجات (Widgets) */}
        <SettingSection title={t('settings.widgets')} index={2} colors={colors}>
          <SettingItem
            icon="cog"
            iconColor="#6366F1"
            title={t('settings.widgetSettings')}
            onPress={() => router.push('/widget-settings')}
            colors={colors}
          />
          <SettingItem
            icon="view-grid"
            iconColor="#c17f59"
            title={t('settings.widgetGallery')}
            onPress={() => router.push('/widgets-gallery')}
            colors={colors}
          />
        </SettingSection>

        {/* 4. الأذكار (Adhkar) */}
        <SettingSection title={t('settings.adhkarSettings')} index={3} colors={colors}>
          <SettingItem
            icon="hand-heart"
            iconColor="#e91e63"
            title={t('settings.adhkarSettings')}
            subtitle={t('settings.sound') + ' · ' + t('settings.vibration')}
            onPress={() => router.push('/settings/notifications')}
            colors={colors}
          />
        </SettingSection>

        {/* 5. النسخ الاحتياطي (Backup) */}
        <SettingSection title={t('settings.backupSection')} index={4} colors={colors}>
          <SettingItem
            icon="cloud-upload"
            iconColor="#5d4e8c"
            title={t('settings.backupRestore')}
            onPress={() => router.push('/settings/backup')}
            colors={colors}
          />
        </SettingSection>

        {/* 6. مشاركة التطبيق (Share App) */}
        <SettingSection title={t('settings.shareAppSection')} index={5} colors={colors}>
          <SettingItem
            icon="share-variant"
            iconColor="#2f7659"
            title={t('settings.shareApp')}
            showArrow={false}
            onPress={handleShare}
            colors={colors}
          />
        </SettingSection>

        {/* 7. عن التطبيق (About) */}
        <SettingSection title={t('settings.aboutApp')} index={6} colors={colors}>
          <SettingItem
            icon="information"
            iconColor="#5d4e8c"
            title={t('settings.about')}
            value={`v${appVersion}`}
            onPress={() => router.push('/settings/about')}
            colors={colors}
          />
          <SettingItem
            icon="shield-lock"
            iconColor="#3a7ca5"
            title={t('settings.privacyPolicy')}
            onPress={() => router.push('/settings/privacy-policy')}
            colors={colors}
          />
          <SettingItem
            icon="file-document"
            iconColor="#c17f59"
            title={t('settings.termsOfService')}
            onPress={() => router.push('/settings/terms-of-use')}
            colors={colors}
          />
        </SettingSection>

        {/* 8. روابط مفيدة (Useful Links) */}
        <SettingSection title={t('settings.usefulLinks')} index={7} colors={colors}>
          <SettingItem
            icon="star"
            iconColor="#f5a623"
            title={t('settings.rateApp')}
            showArrow={false}
            onPress={handleRate}
            colors={colors}
          />
          <SettingItem
            icon="email"
            iconColor="#3a7ca5"
            title={t('settings.contactUs')}
            showArrow={false}
            onPress={handleContact}
            colors={colors}
          />
        </SettingSection>

        <View style={styles.bottomSpace} />
      </ScrollView>

    </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#11151c',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  // الأقسام
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  // عنصر الإعداد
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  settingValue: {
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    marginHorizontal: 8,
  },
  bottomSpace: {
    height: 100,
  },
});
