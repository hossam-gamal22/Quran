// app/(tabs)/settings.tsx
// صفحة الإعدادات الرئيسية - روح المسلم

import React, { useState, useRef } from 'react';
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
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Constants from 'expo-constants';

import { useSettings, Language } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing } from '@/constants/theme';
import { db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStoreUrls } from '@/lib/app-config-api';

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
  const isRTL = useIsRTL();
  return (
    <TouchableOpacity
      style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.text === '#FFFFFF' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={showSwitch ? 1 : 0.7}
      disabled={showSwitch}
    >
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1, gap: Spacing.sm }}>
        <View style={[styles.settingIconBg, { backgroundColor: iconColor + '18' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.settingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
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
          name={isRTL ? 'chevron-left' : 'chevron-right'}
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
  const isRTL = useIsRTL();
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
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
  const isRTL = useIsRTL();
  const router = useRouter();
  const {
    settings,
    isDarkMode,
    t,
    updateNotifications,
    resetSettings,
  } = useSettings();
  const colors = useColors();

  const appVersion = Constants.expoConfig?.version || '1.0.0';

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
  const handleRate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const storeUrls = await getStoreUrls();
    const url = Platform.select({
      ios: storeUrls.ios || 'https://roohmuslim.app',
      android: storeUrls.android || 'https://play.google.com/store/apps/details?id=com.rooh.almuslim',
      default: 'https://roohmuslim.app',
    });
    if (url) Linking.openURL(url);
  };

  // التواصل معنا
  const handleContact = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`mailto:support@roohmuslim.app?subject=${encodeURIComponent(t('common.appName'))}`);
  };

  // اقتراح ميزة جديدة
  const [suggestModalVisible, setSuggestModalVisible] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

  const handleSuggestFeature = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSuggestionText('');
    setSuggestModalVisible(true);
  };

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) {
      Alert.alert(t('settings.suggestionAlert'), t('settings.suggestionEmpty'));
      return;
    }
    setSendingSuggestion(true);
    try {
      const docRef = await addDoc(collection(db, 'suggestions'), {
        text: suggestionText.trim(),
        platform: Platform.OS,
        language: settings.language,
        createdAt: serverTimestamp(),
      });
      console.log('✅ Suggestion saved with ID:', docRef.id);
      setSuggestModalVisible(false);
      Alert.alert(t('settings.suggestionThanks'), t('settings.suggestionSuccess'));
    } catch (error: any) {
      console.error('❌ Suggestion error:', error?.message || error);
      Alert.alert(t('settings.suggestionError'), `${t('settings.suggestionErrorMsg')}: ${error?.message || t('messages.tryAgain')}`);
    } finally {
      setSendingSuggestion(false);
    }
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
      />

      {/* الهيدر */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
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
            title={t('settings.prayerAndAzkarAlerts')}
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
          {Platform.OS === 'ios' && (
            <SettingItem
              icon="cellphone-screenshot"
              iconColor="#22C55E"
              title={t('settings.liveActivities')}
              onPress={() => router.push('/settings/live-activities')}
              colors={colors}
            />
          )}
        </SettingSection>

        {/* 4. النسخ الاحتياطي (Backup) */}
        <SettingSection title={t('settings.backupSection')} index={3} colors={colors}>
          <SettingItem
            icon="cloud-upload"
            iconColor="#5d4e8c"
            title={t('settings.backupRestore')}
            onPress={() => router.push('/settings/backup')}
            colors={colors}
          />
        </SettingSection>

        {/* 4.5. الاشتراك (Subscription) */}
        <SettingSection title={t('settings.subscription')} index={4} colors={colors}>
          <SettingItem
            icon="crown"
            iconColor="#FFD700"
            title={t('settings.premium')}
            onPress={() => router.push('/subscription')}
            colors={colors}
          />
        </SettingSection>

        {/* 5. مشاركة التطبيق (Share App) */}
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

        {/* 6. عن التطبيق (About) */}
        <SettingSection title={t('settings.about')} index={6} colors={colors}>
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

        {/* 7. روابط مفيدة (Useful Links) */}
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
          <SettingItem
            icon="lightbulb-on-outline"
            iconColor="#FFD700"
            title={t('settings.suggestFeature')}
            showArrow={false}
            onPress={handleSuggestFeature}
            colors={colors}
          />
        </SettingSection>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* مودال اقتراح ميزة */}
      <Modal
        visible={suggestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuggestModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.suggestOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSuggestModalVisible(false)}
          />
          <View style={[
            styles.suggestCard,
            { backgroundColor: isDarkMode ? '#1e1e20' : '#fff' }
          ]}>
            <Text style={[
              styles.suggestTitle,
              { color: colors.text }
            ]}>{t('settings.suggestFeatureTitle')}</Text>
            <Text style={[
              styles.suggestSubtitle,
              { color: colors.textSecondary || colors.muted }
            ]}>{t('settings.suggestFeatureDesc')}</Text>
            <TextInput
              style={[
                styles.suggestInput,
                {
                  color: colors.text,
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                }
              ]}
              placeholder={t('settings.suggestPlaceholder')}
              placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              value={suggestionText}
              onChangeText={setSuggestionText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              textAlign={isRTL ? 'right' : 'left'}
              autoFocus
            />
            <View style={[styles.suggestButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[
                  styles.suggestBtn,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }
                ]}
                onPress={() => setSuggestModalVisible(false)}
              >
                <Text style={{ color: colors.text, fontSize: 15, fontFamily: fontSemiBold() }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.suggestBtn,
                  styles.suggestBtnSend,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  sendingSuggestion && { opacity: 0.6 }
                ]}
                onPress={handleSendSuggestion}
                disabled={sendingSuggestion}
              >
                <MaterialCommunityIcons name="send" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: fontSemiBold() }}>{t('settings.sendSuggestion')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  },
  containerDark: {
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fontBold(),
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
    fontFamily: fontBold(),
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
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
    fontFamily: fontSemiBold(),
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: fontMedium(),
    marginHorizontal: 8,
  },
  bottomSpace: {
    height: 100,
  },
  suggestOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  suggestCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  suggestTitle: {
    fontSize: 20,
    fontFamily: fontBold(),
    textAlign: 'center',
    marginBottom: 4,
  },
  suggestSubtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginBottom: 16,
  },
  suggestInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: fontRegular(),
    minHeight: 130,
    marginBottom: 16,
  },
  suggestButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  suggestBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  suggestBtnSend: {
    backgroundColor: '#0f987f',
  },
});
