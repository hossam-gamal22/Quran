import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Switch,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Shadows, Typography, DarkColors } from '../../constants/theme';
import { APP_CONFIG, APP_NAME } from '../../constants/app';
import { Share } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// الأنواع
// ============================================

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
  type: 'navigate' | 'toggle' | 'select' | 'action';
  value?: any;
  options?: { label: string; value: any }[];
  onPress?: () => void;
}

interface SettingSection {
  id: string;
  title: string;
  items: SettingItem[];
}

// ============================================
// المكون الرئيسي
// ============================================

export default function SettingsScreen() {
  const router = useRouter();
  
  // ============================================
  // الحالات
  // ============================================
  
  // إعدادات عامة
  const [darkMode, setDarkMode] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [language, setLanguage] = useState('ar');
  
  // إعدادات الأذكار
  const [azkarViewMode, setAzkarViewMode] = useState<'grid' | 'list'>('grid');
  const [showAzkarCount, setShowAzkarCount] = useState(true);
  const [azkarVibration, setAzkarVibration] = useState(true);
  const [showAzkarSource, setShowAzkarSource] = useState(true);
  const [showAzkarBenefit, setShowAzkarBenefit] = useState(true);
  const [azkarFontSize, setAzkarFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  
  // إعدادات القرآن
  const [quranFontSize, setQuranFontSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
  const [showTranslation, setShowTranslation] = useState(false);
  const [quranTheme, setQuranTheme] = useState<'auto' | 'light' | 'dark'>('auto');
  const [selectedReciter, setSelectedReciter] = useState('ar.alafasy');
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  
  // إعدادات الصلاة
  const [calculationMethod, setCalculationMethod] = useState(4);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [prayerNotifications, setPrayerNotifications] = useState({
    Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true,
  });
  const [adhanSound, setAdhanSound] = useState('default');
  const [fajrAlarm, setFajrAlarm] = useState(false);
  const [preAdhanReminder, setPreAdhanReminder] = useState(0);
  
  // تنبيهات الأذكار
  const [morningAzkarReminder, setMorningAzkarReminder] = useState(true);
  const [eveningAzkarReminder, setEveningAzkarReminder] = useState(true);
  const [sleepAzkarReminder, setSleepAzkarReminder] = useState(false);
  const [istighfarReminder, setIstighfarReminder] = useState(false);
  const [salatAlaNabiReminder, setSalatAlaNabiReminder] = useState(false);
  
  // النوافذ
  const [showAzkarSettings, setShowAzkarSettings] = useState(false);
  const [showQuranSettings, setShowQuranSettings] = useState(false);
  const [showPrayerSettings, setShowPrayerSettings] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showReminderSettings, setShowReminderSettings] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [showCalculationModal, setShowCalculationModal] = useState(false);

  // ============================================
  // تحميل وحفظ الإعدادات
  // ============================================

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setDarkMode(parsed.darkMode ?? false);
        setHapticEnabled(parsed.hapticEnabled ?? true);
        setLanguage(parsed.language ?? 'ar');
        setAzkarViewMode(parsed.azkarViewMode ?? 'grid');
        setShowAzkarCount(parsed.showAzkarCount ?? true);
        setAzkarVibration(parsed.azkarVibration ?? true);
        setShowAzkarSource(parsed.showAzkarSource ?? true);
        setShowAzkarBenefit(parsed.showAzkarBenefit ?? true);
        setAzkarFontSize(parsed.azkarFontSize ?? 'medium');
        setQuranFontSize(parsed.quranFontSize ?? 'medium');
        setShowTranslation(parsed.showTranslation ?? false);
        setQuranTheme(parsed.quranTheme ?? 'auto');
        setSelectedReciter(parsed.selectedReciter ?? 'ar.alafasy');
        setAutoPlayNext(parsed.autoPlayNext ?? true);
        setCalculationMethod(parsed.calculationMethod ?? 4);
        setTimeFormat(parsed.timeFormat ?? '12h');
        setPrayerNotifications(parsed.prayerNotifications ?? {
          Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true,
        });
        setAdhanSound(parsed.adhanSound ?? 'default');
        setFajrAlarm(parsed.fajrAlarm ?? false);
        setPreAdhanReminder(parsed.preAdhanReminder ?? 0);
        setMorningAzkarReminder(parsed.morningAzkarReminder ?? true);
        setEveningAzkarReminder(parsed.eveningAzkarReminder ?? true);
        setSleepAzkarReminder(parsed.sleepAzkarReminder ?? false);
        setIstighfarReminder(parsed.istighfarReminder ?? false);
        setSalatAlaNabiReminder(parsed.salatAlaNabiReminder ?? false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveAllSettings = async () => {
    try {
      const settings = {
        darkMode,
        hapticEnabled,
        language,
        azkarViewMode,
        showAzkarCount,
        azkarVibration,
        showAzkarSource,
        showAzkarBenefit,
        azkarFontSize,
        quranFontSize,
        showTranslation,
        quranTheme,
        selectedReciter,
        autoPlayNext,
        calculationMethod,
        timeFormat,
        prayerNotifications,
        adhanSound,
        fajrAlarm,
        preAdhanReminder,
        morningAzkarReminder,
        eveningAzkarReminder,
        sleepAzkarReminder,
        istighfarReminder,
        salatAlaNabiReminder,
      };
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // حفظ تلقائي عند تغيير أي إعداد
  useEffect(() => {
    saveAllSettings();
  }, [
    darkMode, hapticEnabled, language, azkarViewMode, showAzkarCount,
    azkarVibration, showAzkarSource, showAzkarBenefit, azkarFontSize,
    quranFontSize, showTranslation, quranTheme, selectedReciter, autoPlayNext,
    calculationMethod, timeFormat, prayerNotifications, adhanSound, fajrAlarm,
    preAdhanReminder, morningAzkarReminder, eveningAzkarReminder,
    sleepAzkarReminder, istighfarReminder, salatAlaNabiReminder,
  ]);

  // ============================================
  // الدوال المساعدة
  // ============================================

  const triggerHaptic = () => {
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleToggle = (setter: (value: boolean) => void, currentValue: boolean) => {
    triggerHaptic();
    setter(!currentValue);
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: APP_CONFIG.getShareWithDownload(),
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const openURL = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  const resetAllSettings = () => {
    Alert.alert(
      'إعادة تعيين الإعدادات',
      'هل تريد إعادة جميع الإعدادات إلى الوضع الافتراضي؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة تعيين',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('app_settings');
            loadAllSettings();
            Alert.alert('تم', 'تم إعادة تعيين جميع الإعدادات');
          },
        },
      ]
    );
  };

  // ============================================
  // القراء
  // ============================================

  const RECITERS = [
    { id: 'ar.alafasy', name: 'مشاري العفاسي' },
    { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط - مرتل' },
    { id: 'ar.husary', name: 'محمود خليل الحصري' },
    { id: 'ar.minshawi', name: 'محمد صديق المنشاوي' },
    { id: 'ar.ahmedajamy', name: 'أحمد العجمي' },
    { id: 'ar.mahermuaiqly', name: 'ماهر المعيقلي' },
    { id: 'ar.sudais', name: 'عبدالرحمن السديس' },
    { id: 'ar.shuraim', name: 'سعود الشريم' },
  ];

  // ============================================
  // طرق الحساب
  // ============================================

  const CALCULATION_METHODS = [
    { id: 4, name: 'جامعة أم القرى - مكة' },
    { id: 5, name: 'الهيئة المصرية العامة للمساحة' },
    { id: 3, name: 'رابطة العالم الإسلامي' },
    { id: 2, name: 'الجمعية الإسلامية لأمريكا الشمالية' },
    { id: 1, name: 'جامعة العلوم الإسلامية - كراتشي' },
    { id: 9, name: 'الكويت' },
    { id: 10, name: 'قطر' },
    { id: 8, name: 'منطقة الخليج' },
  ];

  // ============================================
  // اللغات
  // ============================================

  const LANGUAGES = [
    { id: 'ar', name: 'العربية', nameNative: 'العربية' },
    { id: 'en', name: 'الإنجليزية', nameNative: 'English' },
    { id: 'ur', name: 'الأردية', nameNative: 'اردو' },
    { id: 'id', name: 'الإندونيسية', nameNative: 'Bahasa Indonesia' },
    { id: 'tr', name: 'التركية', nameNative: 'Türkçe' },
    { id: 'fr', name: 'الفرنسية', nameNative: 'Français' },
  ];

  // ============================================
  // ألوان الثيم
  // ============================================

  const currentColors = darkMode ? DarkColors : Colors;

  // ============================================
  // العرض
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* الهيدر */}
      <View style={[styles.header, { backgroundColor: currentColors.surface }]}>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>الإعدادات</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ============================================ */}
        {/* قسم الأذكار */}
        {/* ============================================ */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => setShowAzkarSettings(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#10B981' + '20' }]}>
              <Ionicons name="leaf" size={24} color="#10B981" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>الأذكار</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                إعدادات العرض والخط والتنبيهات
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* قسم الصلاة */}
        {/* ============================================ */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => setShowPrayerSettings(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#0284C7' + '20' }]}>
              <Ionicons name="time" size={24} color="#0284C7" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>إشعارات الأذان</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                تفعيل وإدارة إشعارات الصلاة
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => setShowCalculationModal(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#6366F1' + '20' }]}>
              <Ionicons name="calculator" size={24} color="#6366F1" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>ضبط أوقات الصلاة</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                {CALCULATION_METHODS.find(m => m.id === calculationMethod)?.name}
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* تنبيهات الاستغفار */}
        {/* ============================================ */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => setShowReminderSettings(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#F59E0B' + '20' }]}>
              <Ionicons name="notifications" size={24} color="#F59E0B" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>تنبيهات الاستغفار</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                الصلاة على النبي، سبحان الله، أستغفر الله
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* الحس اللمسي */}
        {/* ============================================ */}
        <View style={styles.section}>
          <View style={[styles.settingCard, { backgroundColor: currentColors.surface }]}>
            <View style={[styles.settingIcon, { backgroundColor: '#8B5CF6' + '20' }]}>
              <Ionicons name="hand-left" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>الحس اللمسي</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                {hapticEnabled ? 'مفعّل' : 'معطّل'}
              </Text>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={() => handleToggle(setHapticEnabled, hapticEnabled)}
              trackColor={{ false: currentColors.border, true: currentColors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* ============================================ */}
        {/* قسم المظهر */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.textLight }]}>المظهر</Text>
          
          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#059669' + '20' }]}>
              <Ionicons name="globe" size={24} color="#059669" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>لغة التطبيق</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                {LANGUAGES.find(l => l.id === language)?.name}
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => setShowThemeModal(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#EC4899' + '20' }]}>
              <Ionicons name="color-palette" size={24} color="#EC4899" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>خلفية التطبيق</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                خلفيات مميزة وأنماط رائعة
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>

          <View style={[styles.settingCard, { backgroundColor: currentColors.surface }]}>
            <View style={[styles.settingIcon, { backgroundColor: '#1F2937' + '20' }]}>
              <Ionicons name="moon" size={24} color="#1F2937" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>الوضع الليلي</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={() => handleToggle(setDarkMode, darkMode)}
              trackColor={{ false: currentColors.border, true: currentColors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* ============================================ */}
        {/* إدارة التذكيرات */}
        {/* ============================================ */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => setShowNotificationSettings(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#EF4444' + '20' }]}>
              <Ionicons name="alarm" size={24} color="#EF4444" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>إدارة التذكيرات</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                إدارة كل التذكيرات وإضافة تذكيرات جديدة
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* قسم القرآن */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.textLight }]}>القرآن الكريم</Text>

          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => setShowQuranSettings(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#059669' + '20' }]}>
              <Text style={{ fontSize: 18, color: '#059669', fontWeight: '700' }}>عع</Text>
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>إعدادات الخط</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                حجم الخط: {quranFontSize === 'small' ? 'صغير' : quranFontSize === 'medium' ? 'متوسط' : quranFontSize === 'large' ? 'كبير' : 'كبير جداً'}
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => setShowReciterModal(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#10B981' + '20' }]}>
              <Ionicons name="mic" size={24} color="#10B981" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>القارئ</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                {RECITERS.find(r => r.id === selectedReciter)?.name}
              </Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>

          <View style={[styles.settingCard, { backgroundColor: currentColors.surface }]}>
            <View style={[styles.settingIcon, { backgroundColor: '#6366F1' + '20' }]}>
              <Ionicons name="language" size={24} color="#6366F1" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>الترجمة</Text>
              <Text style={[styles.settingSubtitle, { color: currentColors.textLight }]}>
                عرض التفسير الميسر
              </Text>
            </View>
            <Switch
              value={showTranslation}
              onValueChange={() => handleToggle(setShowTranslation, showTranslation)}
              trackColor={{ false: currentColors.border, true: currentColors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* ============================================ */}
        {/* حول التطبيق */}
        {/* ============================================ */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.textLight }]}>عن التطبيق</Text>

          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={shareApp}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#0284C7' + '20' }]}>
              <Ionicons name="share-social" size={24} color="#0284C7" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>مشاركة التطبيق</Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => setShowAboutModal(true)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#059669' + '20' }]}>
              <Ionicons name="information-circle" size={24} color="#059669" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>حول التطبيق</Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => openURL(`mailto:${APP_CONFIG.contact.email}`)}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#F59E0B' + '20' }]}>
              <Ionicons name="mail" size={24} color="#F59E0B" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>تواصل معنا</Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingCard, { backgroundColor: currentColors.surface }]}
            onPress={() => openURL('https://example.com/privacy')}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#EF4444' + '20' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#EF4444" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: currentColors.text }]}>سياسة الخصوصية</Text>
            </View>
            <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
          </TouchableOpacity>
        </View>

        {/* إصدار التطبيق */}
        <Text style={[styles.versionText, { color: currentColors.textLight }]}>
          {APP_NAME} - الإصدار {APP_CONFIG.version}
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ============================================ */}
      {/* نافذة إعدادات الأذكار */}
      {/* ============================================ */}
      <Modal
        visible={showAzkarSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAzkarSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAzkarSettings(false)}>
                <Ionicons name="arrow-forward" size={24} color={currentColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>إعدادات الأذكار</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              {/* عرض الأذكار */}
              <Text style={[styles.modalSectionTitle, { color: currentColors.textLight }]}>طريقة العرض</Text>
              <View style={[styles.segmentControl, { backgroundColor: currentColors.surface }]}>
                <TouchableOpacity 
                  style={[
                    styles.segmentButton, 
                    azkarViewMode === 'grid' && styles.segmentButtonActive
                  ]}
                  onPress={() => { triggerHaptic(); setAzkarViewMode('grid'); }}
                >
                  <Ionicons name="grid" size={18} color={azkarViewMode === 'grid' ? Colors.white : currentColors.text} />
                  <Text style={[
                    styles.segmentButtonText,
                    { color: azkarViewMode === 'grid' ? Colors.white : currentColors.text }
                  ]}>شبكة</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.segmentButton, 
                    azkarViewMode === 'list' && styles.segmentButtonActive
                  ]}
                  onPress={() => { triggerHaptic(); setAzkarViewMode('list'); }}
                >
                  <Ionicons name="list" size={18} color={azkarViewMode === 'list' ? Colors.white : currentColors.text} />
                  <Text style={[
                    styles.segmentButtonText,
                    { color: azkarViewMode === 'list' ? Colors.white : currentColors.text }
                  ]}>قائمة</Text>
                </TouchableOpacity>
              </View>

              {/* حجم الخط */}
              <Text style={[styles.modalSectionTitle, { color: currentColors.textLight }]}>حجم الخط</Text>
              <View style={[styles.segmentControl, { backgroundColor: currentColors.surface }]}>
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <TouchableOpacity 
                    key={size}
                    style={[
                      styles.segmentButton, 
                      azkarFontSize === size && styles.segmentButtonActive
                    ]}
                    onPress={() => { triggerHaptic(); setAzkarFontSize(size); }}
                  >
                    <Text style={[
                      styles.segmentButtonText,
                      { color: azkarFontSize === size ? Colors.white : currentColors.text }
                    ]}>
                      {size === 'small' ? 'صغير' : size === 'medium' ? 'متوسط' : 'كبير'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* إعدادات إضافية */}
              <Text style={[styles.modalSectionTitle, { color: currentColors.textLight }]}>خيارات العرض</Text>
              
              <View style={[styles.modalSettingItem, { backgroundColor: currentColors.surface }]}>
                <Text style={[styles.modalSettingText, { color: currentColors.text }]}>عرض العداد</Text>
                <Switch
                  value={showAzkarCount}
                  onValueChange={() => handleToggle(setShowAzkarCount, showAzkarCount)}
                  trackColor={{ false: currentColors.border, true: currentColors.primary }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={[styles.modalSettingItem, { backgroundColor: currentColors.surface }]}>
                <Text style={[styles.modalSettingText, { color: currentColors.text }]}>عرض المصدر والتخريج</Text>
                <Switch
                  value={showAzkarSource}
                  onValueChange={() => handleToggle(setShowAzkarSource, showAzkarSource)}
                  trackColor={{ false: currentColors.border, true: currentColors.primary }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={[styles.modalSettingItem, { backgroundColor: currentColors.surface }]}>
                <Text style={[styles.modalSettingText, { color: currentColors.text }]}>عرض الفضل</Text>
                <Switch
                  value={showAzkarBenefit}
                  onValueChange={() => handleToggle(setShowAzkarBenefit, showAzkarBenefit)}
                  trackColor={{ false: currentColors.border, true: currentColors.primary }}
                  thumbColor={Colors.white}
                />
              </View>

              <View style={[styles.modalSettingItem, { backgroundColor: currentColors.surface }]}>
                <Text style={[styles.modalSettingText, { color: currentColors.text }]}>الاهتزاز عند الضغط</Text>
                <Switch
                  value={azkarVibration}
                  onValueChange={() => handleToggle(setAzkarVibration, azkarVibration)}
                  trackColor={{ false: currentColors.border, true: currentColors.primary }}
                  thumbColor={Colors.white}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* نافذة إشعارات الأذان */}
      {/* ============================================ */}
      <Modal
        visible={showPrayerSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrayerSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPrayerSettings(false)}>
                <Ionicons name="arrow-forward" size={24} color={currentColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>إشعارات الأذان</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer) => {
                const names: { [key: string]: string } = {
                  Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', 
                  Maghrib: 'المغرب', Isha: 'العشاء'
                };
                return (
                  <View 
                    key={prayer} 
                    style={[styles.modalSettingItem, { backgroundColor: currentColors.surface }]}
                  >
                    <View style={styles.prayerNotifRow}>
                      <Ionicons 
                        name={prayerNotifications[prayer as keyof typeof prayerNotifications] ? 'notifications' : 'notifications-off-outline'} 
                        size={22} 
                        color={prayerNotifications[prayer as keyof typeof prayerNotifications] ? currentColors.primary : currentColors.textLight} 
                      />
                      <Text style={[styles.modalSettingText, { color: currentColors.text }]}>
                        إشعار {names[prayer]}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.notifStatus}
                      onPress={() => {
                        triggerHaptic();
                        setPrayerNotifications(prev => ({
                          ...prev,
                          [prayer]: !prev[prayer as keyof typeof prayerNotifications]
                        }));
                      }}
                    >
                      <Text style={[styles.notifStatusText, { color: currentColors.textLight }]}>
                        {prayerNotifications[prayer as keyof typeof prayerNotifications] ? 'مفعّل' : 'معطّل'}
                      </Text>
                      <Ionicons name="chevron-back" size={16} color={currentColors.textLight} />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* منبه الفجر */}
              <Text style={[styles.modalSectionTitle, { color: currentColors.textLight, marginTop: 20 }]}>
                منبه الفجر
              </Text>
              <View style={[styles.modalSettingItem, { backgroundColor: currentColors.surface }]}>
                <View style={styles.prayerNotifRow}>
                  <Ionicons name="alarm" size={22} color="#059669" />
                  <Text style={[styles.modalSettingText, { color: currentColors.text }]}>منبه الفجر</Text>
                </View>
                <Switch
                  value={fajrAlarm}
                  onValueChange={() => handleToggle(setFajrAlarm, fajrAlarm)}
                  trackColor={{ false: currentColors.border, true: currentColors.primary }}
                  thumbColor={Colors.white}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* نافذة تنبيهات الاستغفار */}
      {/* ============================================ */}
      <Modal
        visible={showReminderSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReminderSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReminderSettings(false)}>
                <Ionicons name="arrow-forward" size={24} color={currentColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>تنبيهات الاستغفار</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              {/* الصلاة على النبي */}
              <Text style={[styles.modalSectionTitle, { color: currentColors.textLight }]}>
                تنبيه الصلاة على محمد ﷺ
              </Text>
              <View style={[styles.reminderCard, { backgroundColor: currentColors.surface }]}>
                <View style={[styles.modalSettingItem, { backgroundColor: 'transparent', marginBottom: 0 }]}>
                  <Text style={[styles.modalSettingText, { color: currentColors.text }]}>تفعيل</Text>
                  <Switch
                    value={salatAlaNabiReminder}
                    onValueChange={() => handleToggle(setSalatAlaNabiReminder, salatAlaNabiReminder)}
                    trackColor={{ false: currentColors.border, true: currentColors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>
                {salatAlaNabiReminder && (
                  <>
                    <TouchableOpacity style={styles.reminderOption}>
                      <Text style={[styles.reminderOptionText, { color: currentColors.text }]}>موعد الإرسال</Text>
                      <View style={styles.reminderOptionValue}>
                        <Text style={[styles.reminderOptionValueText, { color: currentColors.textLight }]}>مرتين في اليوم</Text>
                        <Ionicons name="chevron-back" size={16} color={currentColors.textLight} />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.reminderOption}>
                      <Text style={[styles.reminderOptionText, { color: currentColors.text }]}>صوت التنبيه</Text>
                      <View style={styles.reminderOptionValue}>
                        <Text style={[styles.reminderOptionValueText, { color: currentColors.textLight }]}>إفتراضي</Text>
                        <Ionicons name="chevron-back" size={16} color={currentColors.textLight} />
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* سبحان الله وبحمده */}
              <Text style={[styles.modalSectionTitle, { color: currentColors.textLight }]}>
                تنبيه سبحان الله وبحمده
              </Text>
              <View style={[styles.reminderCard, { backgroundColor: currentColors.surface }]}>
                <View style={[styles.modalSettingItem, { backgroundColor: 'transparent', marginBottom: 0 }]}>
                  <Text style={[styles.modalSettingText, { color: currentColors.text }]}>تفعيل</Text>
                  <Switch
                    value={istighfarReminder}
                    onValueChange={() => handleToggle(setIstighfarReminder, istighfarReminder)}
                    trackColor={{ false: currentColors.border, true: currentColors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>
              </View>

              {/* أذكار الصباح والمساء */}
              <Text style={[styles.modalSectionTitle, { color: currentColors.textLight }]}>
                تذكيرات الأذكار
              </Text>
              <View style={[styles.reminderCard, { backgroundColor: currentColors.surface }]}>
                <View style={[styles.modalSettingItem, { backgroundColor: 'transparent' }]}>
                  <Text style={[styles.modalSettingText, { color: currentColors.text }]}>أذكار الصباح</Text>
                  <Switch
                    value={morningAzkarReminder}
                    onValueChange={() => handleToggle(setMorningAzkarReminder, morningAzkarReminder)}
                    trackColor={{ false: currentColors.border, true: currentColors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>
                <View style={[styles.modalSettingItem, { backgroundColor: 'transparent' }]}>
                  <Text style={[styles.modalSettingText, { color: currentColors.text }]}>أذكار المساء</Text>
                  <Switch
                    value={eveningAzkarReminder}
                    onValueChange={() => handleToggle(setEveningAzkarReminder, eveningAzkarReminder)}
                    trackColor={{ false: currentColors.border, true: currentColors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>
                <View style={[styles.modalSettingItem, { backgroundColor: 'transparent', marginBottom: 0 }]}>
                  <Text style={[styles.modalSettingText, { color: currentColors.text }]}>أذكار النوم</Text>
                  <Switch
                    value={sleepAzkarReminder}
                    onValueChange={() => handleToggle(setSleepAzkarReminder, sleepAzkarReminder)}
                    trackColor={{ false: currentColors.border, true: currentColors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* نافذة اختيار اللغة */}
      {/* ============================================ */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="arrow-forward" size={24} color={currentColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>لغة التطبيق</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.selectItem,
                    { backgroundColor: currentColors.surface },
                    language === lang.id && styles.selectItemActive,
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setLanguage(lang.id);
                    setShowLanguageModal(false);
                  }}
                >
                  <View>
                    <Text style={[styles.selectItemText, { color: currentColors.text }]}>{lang.nameNative}</Text>
                    <Text style={[styles.selectItemSubtext, { color: currentColors.textLight }]}>{lang.name}</Text>
                  </View>
                  {language === lang.id && (
                    <Ionicons name="checkmark" size={24} color={currentColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* نافذة اختيار القارئ */}
      {/* ============================================ */}
      <Modal
        visible={showReciterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReciterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReciterModal(false)}>
                <Ionicons name="arrow-forward" size={24} color={currentColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>اختر القارئ</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              {RECITERS.map((reciter) => (
                <TouchableOpacity
                  key={reciter.id}
                  style={[
                    styles.selectItem,
                    { backgroundColor: currentColors.surface },
                    selectedReciter === reciter.id && styles.selectItemActive,
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedReciter(reciter.id);
                    setShowReciterModal(false);
                  }}
                >
                  <Text style={[styles.selectItemText, { color: currentColors.text }]}>{reciter.name}</Text>
                  {selectedReciter === reciter.id && (
                    <Ionicons name="checkmark" size={24} color={currentColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* نافذة طريقة الحساب */}
      {/* ============================================ */}
      <Modal
        visible={showCalculationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalculationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCalculationModal(false)}>
                <Ionicons name="arrow-forward" size={24} color={currentColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>طريقة الحساب</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              {CALCULATION_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.selectItem,
                    { backgroundColor: currentColors.surface },
                    calculationMethod === method.id && styles.selectItemActive,
                  ]}
                  onPress={() => {
                    triggerHaptic();
                    setCalculationMethod(method.id);
                    setShowCalculationModal(false);
                  }}
                >
                  <Text style={[styles.selectItemText, { color: currentColors.text }]}>{method.name}</Text>
                  {calculationMethod === method.id && (
                    <Ionicons name="checkmark" size={24} color={currentColors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* نافذة حول التطبيق */}
      {/* ============================================ */}
      <Modal
        visible={showAboutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentColors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                <Ionicons name="arrow-forward" size={24} color={currentColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: currentColors.text }]}>حول التطبيق</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.aboutContainer}>
              <View style={styles.aboutLogo}>
                <Ionicons name="book" size={60} color={currentColors.primary} />
              </View>
              <Text style={[styles.aboutAppName, { color: currentColors.text }]}>{APP_NAME}</Text>
              <Text style={[styles.aboutVersion, { color: currentColors.textLight }]}>
                الإصدار {APP_CONFIG.version}
              </Text>
              <Text style={[styles.aboutDescription, { color: currentColors.textSecondary }]}>
                {APP_CONFIG.description}
              </Text>

              <View style={styles.aboutFeatures}>
                <Text style={[styles.aboutFeaturesTitle, { color: currentColors.text }]}>المميزات:</Text>
                {[
                  'القرآن الكريم كاملاً مع التفسير',
                  'أذكار الصباح والمساء والنوم',
                  'مواقيت الصلاة حسب موقعك',
                  'اتجاه القبلة',
                  'عداد التسبيح',
                  'أسماء الله الحسنى',
                  'الرقية الشرعية',
                  'التقويم الهجري',
                  'مشاركة الآيات والأذكار',
                ].map((feature, index) => (
                  <View key={index} style={styles.aboutFeatureItem}>
                    <Ionicons name="checkmark-circle" size={16} color={currentColors.primary} />
                    <Text style={[styles.aboutFeatureText, { color: currentColors.textSecondary }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.aboutButton, { backgroundColor: currentColors.primary }]}
                onPress={shareApp}
              >
                <Ionicons name="share-social" size={20} color={Colors.white} />
                <Text style={styles.aboutButtonText}>مشاركة التطبيق</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ============================================
// الأنماط
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginRight: Spacing.sm,
    textAlign: 'right',
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  settingTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    textAlign: 'right',
  },
  settingSubtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    textAlign: 'right',
  },
  versionText: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
    padding: Spacing.lg,
  },
  modalSectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textAlign: 'right',
  },
  modalSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  modalSettingText: {
    fontSize: Typography.sizes.md,
    textAlign: 'right',
  },
  segmentControl: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
  },
  selectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  selectItemActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  selectItemText: {
    fontSize: Typography.sizes.md,
    fontWeight: '500',
    textAlign: 'right',
  },
  selectItemSubtext: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    textAlign: 'right',
  },
  prayerNotifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  notifStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notifStatusText: {
    fontSize: Typography.sizes.sm,
  },
  reminderCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  reminderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reminderOptionText: {
    fontSize: Typography.sizes.md,
  },
  reminderOptionValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderOptionValueText: {
    fontSize: Typography.sizes.sm,
  },
  // About modal
  aboutContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  aboutLogo: {
    width: 100,
    height: 100,
    borderRadius: 25,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  aboutAppName: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
  },
  aboutVersion: {
    fontSize: Typography.sizes.sm,
    marginTop: 4,
  },
  aboutDescription: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    lineHeight: 24,
  },
  aboutFeatures: {
    width: '100%',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  aboutFeaturesTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  aboutFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  aboutFeatureText: {
    fontSize: Typography.sizes.md,
    flex: 1,
    textAlign: 'right',
  },
  aboutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  aboutButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.white,
  },
});
