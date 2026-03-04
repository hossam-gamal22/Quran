// app/(tabs)/settings.tsx
// صفحة الإعدادات الرئيسية - روح المسلم

import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Application from 'expo-application';

import { useSettings, Language, ThemeMode, AppBackgroundKey, QuranBackgroundKey } from '@/contexts/SettingsContext';
import GlassCard from '@/components/ui/GlassCard';

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

const THEMES: { mode: ThemeMode; name: string; icon: string }[] = [
  { mode: 'light', name: 'فاتح', icon: 'white-balance-sunny' },
  { mode: 'dark', name: 'داكن', icon: 'moon-waning-crescent' },
  { mode: 'system', name: 'تلقائي', icon: 'theme-light-dark' },
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
      <View style={[styles.settingIconBg, { backgroundColor: `${iconColor}15` }]}>
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
          trackColor={{ false: '#ddd', true: '#2f7659' }}
          thumbColor={switchValue ? '#fff' : '#f4f3f4'}
        />
      )}
      
      {showArrow && !showSwitch && (
        <MaterialCommunityIcons
          name="chevron-left"
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
    updateLanguage,
    updateTheme,
    updateNotifications,
    updateDisplay,
    resetSettings,
  } = useSettings();

  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // الحصول على اسم اللغة الحالية
  const currentLanguage = LANGUAGES.find(l => l.code === settings.language);
  const currentTheme = THEMES.find(t => t.mode === settings.theme);

  // مشاركة التطبيق
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: 'تطبيق روح المسلم - أذكار وأدعية ومواقيت الصلاة\n\nحمّله الآن من:\nhttps://roohmuslim.app',
        title: 'روح المسلم',
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
      'إعادة تعيين الإعدادات',
      'هل أنت متأكد من إعادة تعيين جميع الإعدادات إلى الافتراضية؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة تعيين',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await resetSettings();
            Alert.alert('تم', 'تم إعادة تعيين الإعدادات بنجاح');
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
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* الهيدر */}
      <Animated.View entering={FadeInDown.duration(500)} style={[styles.header, isDarkMode && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
          الإعدادات
        </Text>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* بطاقة الملف الشخصي */}
        <Animated.View entering={FadeInDown.delay(50).duration(500)}>
          <LinearGradient
            colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#2f7659', '#1d4a3a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.profileIcon}>
              <MaterialCommunityIcons name="account-circle" size={60} color="#fff" />
            </View>
            <Text style={styles.profileName}>روح المسلم</Text>
            <Text style={styles.profileVersion}>
              الإصدار {Application.nativeApplicationVersion || '1.0.0'}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* الإعدادات العامة */}
        <SettingSection title="الإعدادات العامة" index={1} isDarkMode={isDarkMode}>
          <SettingItem
            icon="translate"
            iconColor="#3a7ca5"
            title="اللغة"
            value={currentLanguage?.nativeName}
            onPress={() => router.push('/settings/language')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="theme-light-dark"
            iconColor="#5d4e8c"
            title="المظهر"
            value={currentTheme?.name}
            onPress={() => setShowThemePicker(true)}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="format-size"
            iconColor="#c17f59"
            title="حجم الخط"
            subtitle="تخصيص حجم النص العربي والترجمة"
            onPress={() => router.push('/settings/display')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* الخلفيات */}
        <SettingSection title="خلفية التطبيق" index={2} isDarkMode={isDarkMode}>
          <View style={styles.bgGrid}>
            <TouchableOpacity
              style={[
                styles.bgThumb,
                settings.display.appBackground === 'none' && styles.bgThumbSelected,
              ]}
              onPress={() => updateDisplay({ appBackground: 'none' })}
            >
              <View style={[styles.bgThumbInner, { backgroundColor: isDarkMode ? '#1a1a2e' : '#f5f5f5' }]}>
                <MaterialCommunityIcons name="cancel" size={24} color={isDarkMode ? '#aaa' : '#999'} />
                <Text style={[styles.bgThumbLabel, isDarkMode && styles.textMuted]}>بدون</Text>
              </View>
            </TouchableOpacity>
            {(Object.keys(APP_BG_IMAGES) as AppBackgroundKey[]).map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.bgThumb,
                  settings.display.appBackground === key && styles.bgThumbSelected,
                ]}
                onPress={() => updateDisplay({ appBackground: key })}
              >
                <Image source={APP_BG_IMAGES[key]} style={styles.bgThumbImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </SettingSection>

        <SettingSection title="خلفية القرآن" index={3} isDarkMode={isDarkMode}>
          <View style={styles.bgGrid}>
            {(Object.keys(QURAN_BG_IMAGES) as QuranBackgroundKey[]).map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.bgThumb,
                  settings.display.quranBackground === key && styles.bgThumbSelected,
                ]}
                onPress={() => updateDisplay({ quranBackground: key })}
              >
                <Image source={QURAN_BG_IMAGES[key]} style={styles.bgThumbImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        </SettingSection>

        {/* الإشعارات */}
        <SettingSection title="الإشعارات" index={4} isDarkMode={isDarkMode}>
          <SettingItem
            icon="bell"
            iconColor="#2f7659"
            title="الإشعارات"
            showSwitch
            switchValue={settings.notifications.enabled}
            onSwitchChange={(value) => updateNotifications({ enabled: value })}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="bell-cog"
            iconColor="#f5a623"
            title="إعدادات الإشعارات"
            subtitle="تنبيهات الصلاة والأذكار"
            onPress={() => router.push('/settings/notifications')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* مواقيت الصلاة */}
        <SettingSection title="مواقيت الصلاة" index={5} isDarkMode={isDarkMode}>
          <SettingItem
            icon="mosque"
            iconColor="#2f7659"
            title="طريقة الحساب"
            subtitle="أم القرى، رابطة العالم الإسلامي..."
            onPress={() => router.push('/settings/prayer-calculation')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="clock-edit"
            iconColor="#3a7ca5"
            title="تعديل المواقيت"
            subtitle="ضبط دقائق لكل صلاة"
            onPress={() => router.push('/settings/prayer-adjustments')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* البيانات */}
        <SettingSection title="البيانات والخصوصية" index={6} isDarkMode={isDarkMode}>
          <SettingItem
            icon="cloud-upload"
            iconColor="#5d4e8c"
            title="النسخ الاحتياطي"
            subtitle="حفظ واستعادة بياناتك"
            onPress={() => router.push('/settings/backup')}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="delete-sweep"
            iconColor="#ef5350"
            title="مسح البيانات"
            subtitle="حذف جميع البيانات المحلية"
            onPress={handleReset}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* الويدجت */}
        <SettingSection title="الويدجت" index={5} isDarkMode={isDarkMode}>
          <SettingItem
            icon="widgets"
            iconColor="#c17f59"
            title="إعدادات الويدجت"
            subtitle="تخصيص ويدجت الشاشة الرئيسية"
            onPress={() => router.push('/widget-settings')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* حول التطبيق */}
        <SettingSection title="حول التطبيق" index={6} isDarkMode={isDarkMode}>
          <SettingItem
            icon="share-variant"
            iconColor="#2f7659"
            title="مشاركة التطبيق"
            subtitle="شارك التطبيق مع أصدقائك"
            onPress={handleShare}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="star"
            iconColor="#f5a623"
            title="تقييم التطبيق"
            subtitle="قيّم التطبيق على المتجر"
            onPress={handleRate}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="email"
            iconColor="#3a7ca5"
            title="تواصل معنا"
            subtitle="أرسل لنا ملاحظاتك واقتراحاتك"
            onPress={handleContact}
            isDarkMode={isDarkMode}
          />
          <SettingItem
            icon="information"
            iconColor="#5d4e8c"
            title="عن التطبيق"
            onPress={() => router.push('/settings/about')}
            isDarkMode={isDarkMode}
          />
        </SettingSection>

        {/* الفوتر */}
        <Animated.View entering={FadeInDown.delay(700).duration(500)} style={styles.footer}>
          <Text style={[styles.footerText, isDarkMode && styles.textMuted]}>
            صُنع بـ ❤️ لخدمة المسلمين
          </Text>
          <Text style={[styles.footerVersion, isDarkMode && styles.textMuted]}>
            روح المسلم v{Application.nativeApplicationVersion || '1.0.0'}
          </Text>
        </Animated.View>

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
            style={[styles.themePickerModal, isDarkMode && styles.themePickerModalDark]}
          >
            <Text style={[styles.modalTitle, isDarkMode && styles.textLight]}>
              اختر المظهر
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
                <MaterialCommunityIcons
                  name={theme.icon as any}
                  size={24}
                  color={settings.theme === theme.mode ? '#2f7659' : isDarkMode ? '#aaa' : '#666'}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    isDarkMode && styles.textLight,
                    settings.theme === theme.mode && styles.themeOptionTextSelected,
                  ]}
                >
                  {theme.name}
                </Text>
                {settings.theme === theme.mode && (
                  <MaterialCommunityIcons name="check" size={24} color="#2f7659" />
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerDark: {
    backgroundColor: '#1a1a2e',
    borderBottomColor: '#2a2a3e',
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
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionContentDark: {
    backgroundColor: '#1a1a2e',
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
  themePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 350,
  },
  themePickerModalDark: {
    backgroundColor: '#1a1a2e',
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
});
