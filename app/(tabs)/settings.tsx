// app/(tabs)/settings.tsx
// صفحة الإعدادات الرئيسية - روح المسلم

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Share,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  DevSettings,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Constants from 'expo-constants';

import { useSettings, Language } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing } from '@/constants/theme';
import { db, auth } from '@/config/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import { getStoreUrls, fetchAppConfig } from '@/lib/app-config-api';
import ShareAppModal from '@/components/ui/ShareAppModal';
import { getDisplayName, setDisplayName, getUserId, getOriginalDeviceUserId, syncUserProfileFromFirestore, isDisplayNameTaken } from '@/lib/firebase-user';
import { saveDisplayName } from '@/lib/rewards-manager';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { uiText } from '@/lib/ui-text';

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
  iconColor = '#0d8e62',
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
  const { isDarkMode } = useSettings();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <TouchableOpacity
      style={[styles.settingItem, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
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
          <Text style={[styles.settingTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
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
  const { isDarkMode } = useSettings();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, {
        backgroundColor: isDarkMode
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
  const params = useLocalSearchParams<{ editName?: string }>();
  const {
    settings,
    isDarkMode,
    t,
    updateNotifications,
    resetSettings,
  } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { isPremium } = useSubscription();

  const appVersion = Constants.expoConfig?.version || '1.2.1';

  // مشاركة التطبيق — modal
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // مشاركة التطبيق
  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShareModalVisible(true);
  };

  // تقييم التطبيق
  const handleRate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const storeUrls = await getStoreUrls();
    const url = Platform.select({
      ios: storeUrls.ios || 'https://apps.apple.com/us/app/%D8%B1%D9%88%D8%AD-%D8%A7%D9%84%D9%85%D8%B3%D9%84%D9%85-rooh-al-muslim/id6761651911',
      android: storeUrls.android || 'https://play.google.com/store/apps/details?id=com.rooh.almuslim',
      default: 'https://apps.apple.com/us/app/%D8%B1%D9%88%D8%AD-%D8%A7%D9%84%D9%85%D8%B3%D9%84%D9%85-rooh-al-muslim/id6761651911',
    });
    if (url) Linking.openURL(url);
  };

  // التواصل معنا
  const handleContact = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const config = await fetchAppConfig();
      const email = config.contact?.email || 'hossamgamal290@gmail.com';
      Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(t('common.appName'))}`).catch(() => {});
    } catch {
      Linking.openURL(`mailto:hossamgamal290@gmail.com?subject=${encodeURIComponent(t('common.appName'))}`).catch(() => {});
    }
  };

  // اقتراح ميزة جديدة
  const [suggestModalVisible, setSuggestModalVisible] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

  // اسم المستخدم
  const [displayName, setDisplayNameState] = useState('');
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameDeepLinkHandled = useRef(false);
  const displayNameRef = useRef('');

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  useEffect(() => {
    // Load local name first for instant UI, then sync from Firestore for updates
    getDisplayName().then((name) => {
      if (name) setDisplayNameState(name);
    });
    // Sync profile from Firestore (catches admin name changes & merges)
    getOriginalDeviceUserId().then((originalId) => {
      syncUserProfileFromFirestore(originalId).then((result) => {
        if (result.displayName) {
          setDisplayNameState(result.displayName);
        } else if (result.merged && result.targetId) {
          // Name might be on the target doc — re-read local after sync
          getDisplayName().then((name) => {
            if (name) setDisplayNameState(name);
          });
        }
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (params.editName !== '1' || nameDeepLinkHandled.current) return;
    nameDeepLinkHandled.current = true;
    const timer = setTimeout(() => {
      setNameInput(displayNameRef.current);
      setNameModalVisible(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [params.editName]);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setNameError('');
    setSavingName(true);
    try {
      const userId = await getUserId();
      // Block duplicates so two devices can't share the same display name.
      // Skip the check when the user is just re-saving their existing name.
      if (trimmed !== displayName) {
        const taken = await isDisplayNameTaken(trimmed, userId);
        if (taken) {
          setNameError(t('settings.nameTaken'));
          setSavingName(false);
          return;
        }
      }
      await setDisplayName(trimmed);
      await saveDisplayName(userId, trimmed);
      setDisplayNameState(trimmed);
      setNameModalVisible(false);
      Alert.alert(t('settings.nameSaved'));
    } catch (error) {
      console.error('Error saving name:', error);
      setNameError(t('settings.nameCheckFailed'));
    } finally {
      setSavingName(false);
    }
  };

  const handleSuggestFeature = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSuggestionText('');
    setSuggestModalVisible(true);
  };

  // حذف الحساب (Apple 5.1.1(v) compliance) — wipes all local data, deletes Firestore user doc, and reloads the app.
  const handleDeleteAccount = () => {
    console.log('DELETE TAPPED');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const title = t('settings.deleteAccountTitle') || 'Delete Account';
      const message = t('settings.deleteAccountMessage') || 'Are you sure? All data will be deleted.';
      const cancelText = t('common.cancel') || 'Cancel';
      const confirmText = t('settings.deleteAccountConfirm') || 'Delete';
      console.log('DELETE: showing alert', { title, confirmText });
      Alert.alert(
        title,
        message,
        [
          { text: cancelText, style: 'cancel', onPress: () => console.log('DELETE: cancelled') },
          {
            text: confirmText,
            style: 'destructive',
            onPress: async () => {
              console.log('DELETE: confirmed, starting wipe');
            try {
              // 1. Delete Firestore user docs (current uid + original device id)
              try {
                const currentId = await getUserId();
                if (currentId) await deleteDoc(doc(db, 'users', currentId));
              } catch (e) {
                console.warn('deleteAccount: failed to delete current user doc', e);
              }
              try {
                const originalId = await getOriginalDeviceUserId();
                if (originalId) await deleteDoc(doc(db, 'users', originalId));
              } catch (e) {
                console.warn('deleteAccount: failed to delete original device user doc', e);
              }

              // 2. Cancel all scheduled notifications
              try {
                await Notifications.cancelAllScheduledNotificationsAsync();
              } catch (e) {
                console.warn('deleteAccount: failed to cancel notifications', e);
              }

              // 3. Clear SecureStore deviceId
              try {
                await SecureStore.deleteItemAsync('deviceId');
              } catch (e) {
                // SecureStore may be unavailable on some platforms
              }

              // 4. Clear AsyncStorage (all local data + onboarding flag)
              try {
                await AsyncStorage.clear();
              } catch (e) {
                console.warn('deleteAccount: failed to clear AsyncStorage', e);
              }

              // 5. Delete Firebase anonymous user (may require reauth on some accounts)
              try {
                if (auth?.currentUser) {
                  await auth.currentUser.delete();
                }
              } catch (e) {
                console.warn('deleteAccount: failed to delete Firebase user', e);
              }

              // 6. Reload app — user lands on onboarding
              console.log('DELETE: wipe complete, reloading app');
              // Try Updates.reloadAsync (production builds)
              let reloaded = false;
              try {
                await Updates.reloadAsync();
                reloaded = true;
              } catch (e) {
                console.warn('deleteAccount: Updates.reloadAsync failed', e);
              }
              // Fallback: DevSettings.reload (dev builds)
              if (!reloaded && __DEV__) {
                try {
                  DevSettings.reload();
                  reloaded = true;
                } catch (e) {
                  console.warn('deleteAccount: DevSettings.reload failed', e);
                }
              }
              // Final fallback: router navigation to onboarding
              if (!reloaded) {
                try {
                  router.replace('/onboarding');
                } catch (e) {
                  console.warn('deleteAccount: router.replace failed', e);
                  Alert.alert(
                    t('settings.deleteAccountTitle'),
                    uiText({
                      ar: 'تم حذف الحساب. يرجى إعادة تشغيل التطبيق يدوياً.',
                      en: 'Account deleted. Please restart the app manually.',
                    })
                  );
                }
              }
            } catch (error) {
              console.error('Account deletion failed:', error);
              Alert.alert(t('common.error'), t('settings.deleteAccountMessage'));
            }
            },
          },
        ]
      );
    } catch (outerError) {
      console.error('DELETE TAPPED outer error:', outerError);
      Alert.alert('Error', String((outerError as Error)?.message || outerError));
    }
  };

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) {
      Alert.alert(t('settings.suggestionAlert'), t('settings.suggestionEmpty'));
      return;
    }
    setSendingSuggestion(true);
    try {
      const userId = await getUserId();
      const docRef = await addDoc(collection(db, 'suggestions'), {
        text: suggestionText.trim(),
        platform: Platform.OS,
        language: settings.language,
        userName: displayName || '',
        userId: userId || '',
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
      style={[styles.container]}
    >
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <StatusBar style={colors.statusBarStyle} />

      {/* الهيدر */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t('settings.title')}
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* الملف الشخصي - Welcome Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNameInput(displayName);
              setNameModalVisible(true);
            }}
            style={[styles.profileHeader, {
              flexDirection: isRTL ? 'row-reverse' : 'row',
              backgroundColor: isDarkMode
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(120,120,128,0.12)',
            }]}
          >
            <View style={[styles.profileAvatar, { backgroundColor: '#0d8e62' + '20' }]}>
              <MaterialCommunityIcons name="account-circle" size={52} color="#0d8e62" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.profileName, {
                  color: colors.text,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                }]}>
                  {displayName
                    ? t('settings.welcomeUser').replace('{name}', displayName)
                    : t('home.welcome')}
                </Text>
                {isPremium && (
                  <MaterialCommunityIcons name="crown" size={18} color={isDarkMode ? '#FFD700' : '#B8860B'} />
                )}
              </View>
              <Text style={[styles.profileEditHint, {
                color: colors.textLight,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              }]}>
                {t('settings.editName')}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-left' : 'chevron-right'}
              size={22}
              color={colors.textLight}
            />
          </TouchableOpacity>
        </Animated.View>

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
            iconColor="#0d8e62"
            title={t('settings.notifications')}
            showArrow={false}
            showSwitch
            switchValue={settings.notifications.enabled}
            onSwitchChange={(value) => updateNotifications({ enabled: value })}
            colors={colors}
          />
          <SettingItem
            icon="bell-cog"
            iconColor="#c07b10"
            title={t('settings.prayerAndAzkarAlerts')}
            onPress={() => router.push('/settings/notifications')}
            colors={colors}
          />
        </SettingSection>

        {/* 3. الودجات (Widgets) */}
        <SettingSection title={t('settings.widgets')} index={2} colors={colors}>
          <SettingItem
            icon="widgets"
            iconColor="#0d8e62"
            title={t('settings.widgets')}
            onPress={() => router.push('/widget')}
            colors={colors}
          />
          {Platform.OS === 'ios' && (
            <SettingItem
              icon="cellphone-screenshot"
              iconColor="#0d8e62"
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
            iconColor="#4a3d73"
            title={t('settings.backupRestore')}
            onPress={() => router.push('/settings/backup')}
            colors={colors}
          />
        </SettingSection>

        {/* 4.5. الاشتراك (Subscription) */}
        <SettingSection title={t('settings.subscription')} index={4} colors={colors}>
          <SettingItem
            icon="crown"
            iconColor="#B8860B"
            title={t('settings.premium')}
            onPress={() => router.push('/subscription')}
            colors={colors}
          />
          <SettingItem
            icon="trophy"
            iconColor="#B8860B"
            title={t('honor.title')}
            onPress={() => router.push('/honor-board')}
            colors={colors}
          />
        </SettingSection>

        {/* 5. مشاركة التطبيق (Share App) */}
        <SettingSection title={t('settings.shareAppSection')} index={5} colors={colors}>
          <SettingItem
            icon="share-variant"
            iconColor="#0d8e62"
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
            iconColor="#4a3d73"
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
            iconColor="#c07b10"
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
            iconColor={isDarkMode ? '#FFD700' : '#B8860B'}
            title={t('settings.suggestFeature')}
            showArrow={false}
            onPress={handleSuggestFeature}
            colors={colors}
          />
        </SettingSection>

        {/* 8. منطقة الخطر (Danger Zone) — Apple 5.1.1(v) account deletion */}
        <SettingSection title={t('settings.dangerZone')} index={8} colors={colors}>
          <SettingItem
            icon="trash-can-outline"
            iconColor="#E53935"
            title={t('settings.deleteAccount')}
            showArrow={false}
            onPress={handleDeleteAccount}
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
            { backgroundColor: isDarkMode ? '#1a2a22' : '#ffffff' }
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

      {/* مودال تعديل الاسم */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.suggestOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setNameModalVisible(false)}
          />
          <View style={[styles.suggestCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.suggestTitle, { color: colors.text }]}>
              {t('settings.editName')}
            </Text>
            <TextInput
              style={[
                styles.nameInput,
                {
                  color: colors.text,
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                }
              ]}
              placeholder={t('settings.enterName')}
              placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              value={nameInput}
              onChangeText={(text) => { setNameInput(text.slice(0, 30)); setNameError(''); }}
              maxLength={30}
              textAlign={isRTL ? 'right' : 'left'}
              autoFocus
            />
            {nameError ? (
              <Text style={{
                color: '#f87171',
                fontSize: 13,
                fontFamily: fontSemiBold(),
                marginTop: 8,
                textAlign: isRTL ? 'right' : 'left',
              }}>
                {nameError}
              </Text>
            ) : null}
            <View style={[styles.suggestButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[
                  styles.suggestBtn,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }
                ]}
                onPress={() => setNameModalVisible(false)}
              >
                <Text style={{ color: colors.text, fontSize: 15, fontFamily: fontSemiBold() }}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.suggestBtn,
                  styles.suggestBtnSend,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  savingName && { opacity: 0.6 }
                ]}
                onPress={handleSaveName}
                disabled={savingName || !nameInput.trim()}
              >
                <MaterialCommunityIcons name="check" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: fontSemiBold() }}>
                  {t('settings.saved')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Share App Modal */}
      <ShareAppModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />

    </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const _styles = StyleSheet.create({
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
    lineHeight: 44,
    includeFontPadding: false,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  // الملف الشخصي
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontFamily: fontBold(),
    lineHeight: 30,
    includeFontPadding: false,
  },
  profileEditHint: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    fontFamily: fontRegular(),
    marginBottom: 16,
  },
  // الأقسام
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 28,
    includeFontPadding: false,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 20,
    includeFontPadding: false,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: fontMedium(),
    marginHorizontal: 8,
    lineHeight: 24,
    includeFontPadding: false,
  },
  bottomSpace: {
    height: 100,
  },
  suggestOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
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
    lineHeight: 34,
    includeFontPadding: false,
  },
  suggestSubtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
    includeFontPadding: false,
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
    backgroundColor: '#0d8e62',
  },
});
const styles = _styles;
