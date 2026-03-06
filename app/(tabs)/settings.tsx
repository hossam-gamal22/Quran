// app/(tabs)/settings.tsx
// صفحة الإعدادات الرئيسية - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Application from 'expo-application';

import { useSettings, Language, ThemeMode, AppBackgroundKey } from '@/contexts/SettingsContext';
import GlassCard, { GlassSegmentedControl } from '@/components/ui/GlassCard';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { fetchDynamicBackgrounds, DynamicBackground } from '@/lib/app-config-api';

// ========================================
// الثوابت
// ========================================

const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

const THEMES: { mode: ThemeMode; nameKey: string; icon: string }[] = [
  { mode: 'light', nameKey: 'settings.lightMode', icon: 'white-balance-sunny' },
  { mode: 'dark', nameKey: 'settings.darkMode', icon: 'moon-waning-crescent' },
  { mode: 'system', nameKey: 'settings.systemMode', icon: 'theme-light-dark' },
];

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
  isDarkMode?: boolean;
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
  isDarkMode = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.settingItem, isDarkMode && styles.settingItemDark]}
      onPress={() => {
        if (onPress) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      activeOpacity={showSwitch ? 1 : 0.7}
      disabled={showSwitch}
    >
      <View style={styles.settingIconBg}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isDarkMode && styles.textLight]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, isDarkMode && styles.textMuted]}>
            {subtitle}
          </Text>
        )}
      </View>
      
      {value && (
        <Text style={[styles.settingValue, isDarkMode && styles.textMuted]}>
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
          trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
          thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
          ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
        />
      )}
      
      {showArrow && !showSwitch && (
        <MaterialCommunityIcons
          name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
          size={24}
          color={isDarkMode ? '#666' : '#ccc'}
        />
      )}
    </TouchableOpacity>
  );
};

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
  index: number;
  isDarkMode?: boolean;
}

const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  children,
  index,
  isDarkMode = false,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, isDarkMode && styles.sectionContentDark]}>
        {children}
      </View>
    </Animated.View>
  );
};

// ========================================
// خرائط صور الخلفيات
// ========================================

const APP_BG_IMAGES: Record<string, any> = {
  background1: require('@/assets/images/background1.png'),
  background2: require('@/assets/images/background2.png'),
  background3: require('@/assets/images/background3.png'),
  background4: require('@/assets/images/background4.png'),
  background5: require('@/assets/images/background5.png'),
  background6: require('@/assets/images/background6.png'),
  background7: require('@/assets/images/background7.png'),
};

const QURAN_BG_IMAGES: Record<string, any> = {
  quranbg1: require('@/assets/images/quranbg1.png'),
  quranbg2: require('@/assets/images/quranbg2.png'),
  quranbg3: require('@/assets/images/quranbg3.png'),
  quranbg4: require('@/assets/images/quranbg4.png'),
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
    updateLanguage,
    updateTheme,
    updateNotifications,
    updateDisplay,
    resetSettings,
  } = useSettings();

  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  
  // حالة قسم الخلفيات
  const [bgCategory, setBgCategory] = useState<'colors' | 'images'>('colors');
  const [dynamicBackgrounds, setDynamicBackgrounds] = useState<DynamicBackground[]>([]);
  const [loadingBackgrounds, setLoadingBackgrounds] = useState(false);
  
  // جلب الخلفيات الديناميكية عند التبديل للصور
  useEffect(() => {
    if (bgCategory === 'images' && dynamicBackgrounds.length === 0) {
      loadDynamicBackgrounds();
    }
  }, [bgCategory]);
  
  const loadDynamicBackgrounds = async () => {
    setLoadingBackgrounds(true);
    try {
      const backgrounds = await fetchDynamicBackgrounds();
      setDynamicBackgrounds(backgrounds);
    } catch (error) {
      console.log('Error loading backgrounds:', error);
    } finally {
      setLoadingBackgrounds(false);
    }
  };

  // الحصول على اسم اللغة الحالية
  const currentLanguage = LANGUAGES.find(l => l.code === settings.language);
  const currentTheme = THEMES.find(th => th.mode === settings.theme);
  const currentThemeName = settings.theme === 'light' ? t('settings.lightMode') : settings.theme === 'dark' ? t('settings.darkMode') : t('settings.systemMode');

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
    // فتح صفحة التطبيق في المتجر
    Linking.openURL('https://apps.apple.com/app/rooh-muslim/id123456789');
  };

  // التواصل معنا
  const handleContact = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:support@roohmuslim.app?subject=تطبيق روح المسلم');
  };

  // إعادة تعيين الإعدادات
  const handleReset = () => {
    Alert.alert(
      t('settings.resetSettings'),
      t('settings.resetConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetSettings'),
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await resetSettings();
          },
        },
      ]
    );
  };

  // اختيار اللغة
  const handleSelectLanguage = async (code: Language) => {
    await updateLanguage(code);
    setShowLanguagePicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // اختيار الثيم
  const handleSelectTheme = async (mode: ThemeMode) => {
    await updateTheme(mode);
    setShowThemePicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      <Animated.View entering={FadeInDown.duration(500)} style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
          {t('settings.title')}
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* الإعدادات العامة */}
        <SettingSection title={t('settings.general')} index={1} isDarkMode={isDarkMode}>
          <SettingItem
            icon="translate"
            iconColor="#3a7ca5"
            title={t('settings.language')}
            value={currentLanguage?.nativeName}
            onPress={() => router.push('/settings/language')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="theme-light-dark"
            iconColor="#5d4e8c"
            title={t('settings.theme')}
            value={currentThemeName}
            onPress={() => setShowThemePicker(true)}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="format-size"
            iconColor="#c17f59"
            title={t('settings.fontSize')}
            subtitle={t('settings.arabicFontSize')}
            onPress={() => router.push('/settings/display')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="book-open-page-variant-outline"
            iconColor="#2f7659"
            title="إعدادات القرآن"
            subtitle="السمة والخط وخيارات القراءة"
            onPress={() => router.push('/settings/quran')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* الخلفيات */}
        <SettingSection title={t('settings.appearance')} index={2} isDarkMode={isDarkMode}>
          {/* تبديل بين الألوان والصور */}
          <View style={styles.bgCategoryContainer}>
            <GlassSegmentedControl
              segments={[
                { key: 'colors', label: 'الألوان' },
                { key: 'images', label: 'الصور' },
              ]}
              selected={bgCategory}
              onSelect={(key) => setBgCategory(key as 'colors' | 'images')}
            />
          </View>
          
          {/* قسم الألوان */}
          {bgCategory === 'colors' && (
            <View style={styles.bgGrid}>
              <TouchableOpacity
                style={[
                  styles.bgThumb,
                  settings.display.appBackground === 'none' && styles.bgThumbSelected,
                ]}
                onPress={() => updateDisplay({ appBackground: 'none', appBackgroundUrl: undefined })}
              >
                <View style={[styles.bgThumbInner, { backgroundColor: isDarkMode ? '#1a1a2e' : '#f5f5f5' }]}>
                  <MaterialCommunityIcons name="cancel" size={24} color={isDarkMode ? '#aaa' : '#999'} />
                  <Text style={[styles.bgThumbLabel, isDarkMode && styles.textMuted]}>{t('common.none')}</Text>
                </View>
              </TouchableOpacity>
              {(Object.keys(APP_BG_IMAGES) as AppBackgroundKey[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.bgThumb,
                    settings.display.appBackground === key && styles.bgThumbSelected,
                  ]}
                  onPress={() => updateDisplay({ appBackground: key, appBackgroundUrl: undefined })}
                >
                  <Image source={APP_BG_IMAGES[key]} style={styles.bgThumbImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* قسم الصور الديناميكية */}
          {bgCategory === 'images' && (
            <View style={styles.bgImagesSection}>
              {loadingBackgrounds ? (
                <View style={styles.bgLoadingContainer}>
                  <ActivityIndicator size="large" color="#2f7659" />
                  <Text style={[styles.bgLoadingText, isDarkMode && styles.textMuted]}>
                    جاري تحميل الصور...
                  </Text>
                </View>
              ) : dynamicBackgrounds.length === 0 ? (
                <View style={styles.bgEmptyContainer}>
                  <MaterialCommunityIcons
                    name="image-off-outline"
                    size={48}
                    color={isDarkMode ? '#555' : '#ccc'}
                  />
                  <Text style={[styles.bgEmptyTitle, isDarkMode && styles.textLight]}>
                    لا توجد صور متاحة
                  </Text>
                  <Text style={[styles.bgEmptySubtitle, isDarkMode && styles.textMuted]}>
                    سيتم إضافة صور خلفية قريباً
                  </Text>
                  <TouchableOpacity
                    style={styles.bgRefreshButton}
                    onPress={loadDynamicBackgrounds}
                  >
                    <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
                    <Text style={styles.bgRefreshText}>تحديث</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.bgGrid}>
                  {dynamicBackgrounds.map((bg) => (
                    <TouchableOpacity
                      key={bg.id}
                      style={[
                        styles.bgThumb,
                        settings.display.appBackground === 'dynamic' &&
                        settings.display.appBackgroundUrl === bg.fullUrl &&
                        styles.bgThumbSelected,
                      ]}
                      onPress={() => updateDisplay({ 
                        appBackground: 'dynamic', 
                        appBackgroundUrl: bg.fullUrl 
                      })}
                    >
                      <Image
                        source={{ uri: bg.thumbnailUrl }}
                        style={styles.bgThumbImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </SettingSection>

        {/* الإشعارات */}
        <SettingSection title={t('settings.notifications')} index={3} isDarkMode={isDarkMode}>
          <SettingItem
            icon="bell"
            iconColor="#2f7659"
            title={t('settings.notifications')}
            showSwitch
            switchValue={settings.notifications.enabled}
            onSwitchChange={(value) => updateNotifications({ enabled: value })}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="bell-cog"
            iconColor="#f5a623"
            title={t('settings.prayerNotifications')}
            subtitle={t('settings.azkarNotifications')}
            onPress={() => router.push('/settings/notifications')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* تذكيرات الاستغفار */}
        <SettingSection title={t('home.salawat')} index={5} isDarkMode={isDarkMode}>
          <SettingItem
            icon="hand-heart"
            iconColor="#e91e63"
            title={t('home.salawat')}
            onPress={() => router.push('/azkar-reminder')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="star-crescent"
            iconColor="#8B5CF6"
            title={t('tasbih.title')}
            onPress={() => router.push('/azkar-reminder')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="heart-pulse"
            iconColor="#f5a623"
            title={t('home.istighfar')}
            onPress={() => router.push('/azkar-reminder')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* إدارة التذكيرات */}
        <SettingSection title={t('settings.notifications')} index={6} isDarkMode={isDarkMode}>
          <SettingItem
            icon="alarm"
            iconColor="#3a7ca5"
            title={t('settings.notifications')}
            onPress={() => router.push('/azkar-reminder')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* مواقيت الصلاة */}
        <SettingSection title={t('settings.prayerSettings')} index={7} isDarkMode={isDarkMode}>
          <SettingItem
            icon="mosque"
            iconColor="#2f7659"
            title={t('settings.calculationMethod')}
            onPress={() => router.push('/settings/prayer-calculation')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="clock-edit"
            iconColor="#3a7ca5"
            title={t('settings.adjustments')}
            onPress={() => router.push('/settings/prayer-adjustments')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* إعدادات القرآن */}
        <SettingSection title={t('settings.display')} index={8} isDarkMode={isDarkMode}>
          <SettingItem
            icon="format-size"
            iconColor="#c17f59"
            title={t('settings.fontSize')}
            onPress={() => router.push('/settings/display')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="book-clock"
            iconColor="#2f7659"
            title={t('settings.dailyVerseNotification')}
            showSwitch
            switchValue={settings.notifications.dailyVerse}
            onSwitchChange={(value) => updateNotifications({ dailyVerse: value })}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="text-recognition"
            iconColor="#5d4e8c"
            title={t('settings.showTashkeel')}
            showSwitch
            switchValue={settings.display.showTashkeel}
            onSwitchChange={(value) => updateDisplay({ showTashkeel: value })}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="subtitles"
            iconColor="#059669"
            title={t('settings.showTranslation')}
            showSwitch
            switchValue={settings.display.showTranslation}
            onSwitchChange={(value) => updateDisplay({ showTranslation: value })}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="eye-off-outline"
            iconColor="#2f7659"
            title="وضع التركيز"
            subtitle="إخفاء عناصر الواجهة أثناء قراءة القرآن"
            showSwitch
            switchValue={settings.display.focusMode}
            onSwitchChange={(value) => updateDisplay({ focusMode: value })}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* إعدادات الأذكار */}
        <SettingSection title={t('settings.display')} index={9} isDarkMode={isDarkMode}>
          <SettingItem
            icon="view-grid"
            iconColor="#6366F1"
            title={t('settings.display')}
            onPress={() => router.push('/settings/display')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="pencil-plus"
            iconColor="#e91e63"
            title={t('settings.requestFeature')}
            onPress={() => router.push('/settings/custom-dhikr')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* البيانات */}
        <SettingSection title={t('settings.data')} index={10} isDarkMode={isDarkMode}>
          <SettingItem
            icon="cloud-upload"
            iconColor="#5d4e8c"
            title={t('settings.exportData')}
            onPress={() => router.push('/settings/backup')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="delete-sweep"
            iconColor="#ef5350"
            title={t('settings.clearCache')}
            onPress={handleReset}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* الويدجت */}
        <SettingSection title={t('settings.support')} index={11} isDarkMode={isDarkMode}>
          <SettingItem
            icon="widgets"
            iconColor="#c17f59"
            title={t('settings.support')}
            onPress={() => router.push('/widget-settings')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* حول التطبيق */}
        <SettingSection title={t('settings.about')} index={12} isDarkMode={isDarkMode}>
          <SettingItem
            icon="share-variant"
            iconColor="#2f7659"
            title={t('settings.shareApp')}
            onPress={handleShare}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="star"
            iconColor="#f5a623"
            title={t('settings.rateApp')}
            onPress={handleRate}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="information"
            iconColor="#5d4e8c"
            title={t('settings.about')}
            onPress={() => router.push('/settings/about')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* نافذة اختيار الثيم */}
      {showThemePicker && (
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowThemePicker(false)}
        >
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.themePickerModalWrapper}
          >
            <BlurView
              intensity={Platform.OS === 'ios' ? 80 : 50}
              tint={isDarkMode ? 'dark' : 'light'}
              style={styles.themePickerBlur}
            >
              <View style={[
                styles.themePickerModal,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(26, 26, 46, 0.75)'
                    : 'rgba(255, 255, 255, 0.78)',
                },
              ]}>
                <Text style={[styles.modalTitle, isDarkMode && styles.textLight]}>
                  {t('settings.theme')}
                </Text>
                {THEMES.map((theme) => (
                  <TouchableOpacity
                    key={theme.mode}
                    style={[
                      styles.themeOption,
                      settings.theme === theme.mode && styles.themeOptionSelected,
                    ]}
                    onPress={() => handleSelectTheme(theme.mode)}
                  >
                    <View style={styles.themeOptionIcon}>
                      <MaterialCommunityIcons
                        name={theme.icon as any}
                        size={24}
                        color={settings.theme === theme.mode ? '#2f7659' : isDarkMode ? '#aaa' : '#666'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.themeOptionText,
                        isDarkMode && styles.textLight,
                        settings.theme === theme.mode && styles.themeOptionTextSelected,
                      ]}
                    >
                      {t(theme.nameKey)}
                    </Text>
                    {settings.theme === theme.mode && (
                      <MaterialCommunityIcons name="check" size={24} color="#2f7659" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </BlurView>
          </Animated.View>
        </TouchableOpacity>
      )}
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
  headerDark: {
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 15,
  },
  // بطاقة الملف الشخصي
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  profileIcon: {
    marginBottom: 10,
  },
  profileName: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  profileVersion: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  // الأقسام
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#666',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionContent: {
    backgroundColor: 'rgba(120,120,128,0.12)',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionContentDark: {
    backgroundColor: 'rgba(120,120,128,0.18)',
  },
  // عنصر الإعداد
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemDark: {
    borderBottomColor: '#2a2a3e',
  },
  settingIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginHorizontal: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    color: '#999',
    marginRight: 5,
  },
  // الفوتر
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#999',
  },
  footerVersion: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#ccc',
    marginTop: 5,
  },
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themePickerModalWrapper: {
    width: '85%',
    maxWidth: 350,
    borderRadius: 20,
    overflow: 'hidden',
  },
  themePickerBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  themePickerModal: {
    borderRadius: 20,
    padding: 20,
  },
  themeOptionIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  themeOptionSelected: {
    backgroundColor: '#2f765915',
  },
  themeOptionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Cairo-Medium',
    color: '#333',
    marginLeft: 15,
  },
  themeOptionTextSelected: {
    color: '#2f7659',
  },
  bottomSpace: {
    height: 100,
  },
  // Background grid styles
  bgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
  },
  bgThumb: {
    width: 70,
    height: 70,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgThumbSelected: {
    borderColor: '#2f7659',
    borderWidth: 2.5,
  },
  bgThumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  bgThumbInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  bgThumbLabel: {
    fontSize: 11,
    fontFamily: 'Cairo-Medium',
    color: '#666',
    marginTop: 2,
  },
  // Background category styles
  bgCategoryContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bgImagesSection: {
    minHeight: 150,
  },
  bgLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  bgLoadingText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },
  bgEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    gap: 8,
  },
  bgEmptyTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginTop: 8,
  },
  bgEmptySubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#888',
    textAlign: 'center',
  },
  bgRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2f7659',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  bgRefreshText: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: '#fff',
  },
});
