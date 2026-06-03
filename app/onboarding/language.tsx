// app/onboarding/language.tsx
// شاشة اختيار اللغة - روح المسلم

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { setLanguage } from '@/lib/i18n';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const LANGUAGES = [
  { code: 'ar', name: 'العربية', nameEn: 'Arabic', flag: '🇸🇦', isRTL: true },
  { code: 'en', name: 'English', nameEn: 'English', flag: '🇺🇸', isRTL: false },
  { code: 'fr', name: 'Français', nameEn: 'French', flag: '🇫🇷', isRTL: false },
  { code: 'tr', name: 'Türkçe', nameEn: 'Turkish', flag: '🇹🇷', isRTL: false },
  { code: 'ur', name: 'اردو', nameEn: 'Urdu', flag: '🇵🇰', isRTL: true },
  { code: 'de', name: 'Deutsch', nameEn: 'German', flag: '🇩🇪', isRTL: false },
  { code: 'hi', name: 'हिन्दी', nameEn: 'Hindi', flag: '🇮🇳', isRTL: false },
  { code: 'bn', name: 'বাংলা', nameEn: 'Bengali', flag: '🇧🇩', isRTL: false },
  { code: 'id', name: 'Bahasa Indonesia', nameEn: 'Indonesian', flag: '🇮🇩', isRTL: false },
  { code: 'ms', name: 'Bahasa Melayu', nameEn: 'Malay', flag: '🇲🇾', isRTL: false },
  { code: 'es', name: 'Español', nameEn: 'Spanish', flag: '🇪🇸', isRTL: false },
  { code: 'ru', name: 'Русский', nameEn: 'Russian', flag: '🇷🇺', isRTL: false },
];

// ترجمات شاشة اللغة — تتغير فوراً عند اختيار لغة جديدة
const LANG_SCREEN_TEXT: Record<string, { title: string; desc: string; btn: string }> = {
  ar: { title: 'اختر لغتك', desc: 'اختر اللغة التي تفضلها للتطبيق. يمكنك تغييرها لاحقاً من الإعدادات.', btn: 'متابعة' },
  en: { title: 'Choose Language', desc: 'Choose your preferred language. You can change it later in Settings.', btn: 'Continue' },
  ur: { title: 'اپنی زبان منتخب کریں', desc: 'ایپ کے لیے اپنی پسندیدہ زبان منتخب کریں۔ آپ بعد میں سیٹنگز سے تبدیل کر سکتے ہیں۔', btn: 'جاری رکھیں' },
  id: { title: 'Pilih Bahasa', desc: 'Pilih bahasa yang Anda inginkan. Anda bisa mengubahnya nanti di Pengaturan.', btn: 'Lanjutkan' },
  tr: { title: 'Dilinizi Seçin', desc: 'Tercih ettiğiniz dili seçin. Daha sonra Ayarlar\'dan değiştirebilirsiniz.', btn: 'Devam' },
  fr: { title: 'Choisir la langue', desc: 'Choisissez votre langue préférée. Vous pouvez la changer plus tard dans les Paramètres.', btn: 'Continuer' },
  de: { title: 'Sprache wählen', desc: 'Wählen Sie Ihre bevorzugte Sprache. Sie können sie später in den Einstellungen ändern.', btn: 'Weiter' },
  hi: { title: 'भाषा चुनें', desc: 'अपनी पसंदीदा भाषा चुनें। आप इसे बाद में सेटिंग्स में बदल सकते हैं।', btn: 'जारी रखें' },
  bn: { title: 'ভাষা নির্বাচন করুন', desc: 'আপনার পছন্দের ভাষা নির্বাচন করুন। আপনি পরে সেটিংস থেকে পরিবর্তন করতে পারেন।', btn: 'চালিয়ে যান' },
  ms: { title: 'Pilih Bahasa', desc: 'Pilih bahasa pilihan anda. Anda boleh menukarnya kemudian di Tetapan.', btn: 'Teruskan' },
  ru: { title: 'Выберите язык', desc: 'Выберите предпочитаемый язык. Вы можете изменить его позже в Настройках.', btn: 'Продолжить' },
  es: { title: 'Elige tu idioma', desc: 'Elige tu idioma preferido. Puedes cambiarlo después en Ajustes.', btn: 'Continuar' },
};

// ========================================
// مكون اللغة
// ========================================

interface LanguageItemProps {
  language: typeof LANGUAGES[0];
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

const LanguageItem: React.FC<LanguageItemProps> = ({
  language,
  isSelected,
  onSelect,
  index,
}) => {
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <Animated.View entering={FadeInRight.delay(index * 50).duration(400)}>
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.languageItemSelected, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect();
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.flagEmoji}>{language.flag}</Text>
        <View style={[styles.languageInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.languageName, isSelected && styles.languageNameSelected, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {language.name}
          </Text>
          <Text style={[styles.languageNameEn, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{language.nameEn}</Text>
        </View>
        <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
          {isSelected && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function LanguageScreen() {
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { preferences, updatePreferences, goToNextStep, goToPreviousStep } = useOnboarding();
  const [selectedLanguage, setSelectedLanguage] = useState(preferences.language || 'ar');

  // ترجمات تفاعلية بناءً على اللغة المختارة
  const screenText = LANG_SCREEN_TEXT[selectedLanguage] || LANG_SCREEN_TEXT.ar;
  const isSelectedRTL = LANGUAGES.find(l => l.code === selectedLanguage)?.isRTL ?? false;

  const handleLanguageSelect = async (code: string) => {
    setSelectedLanguage(code);
    updatePreferences({ language: code });
    await setLanguage(code as any);
    
    // Also save to app_settings so SettingsContext picks up the language on load
    try {
      const stored = await AsyncStorage.getItem('app_settings');
      const parsed = stored ? JSON.parse(stored) : {};
      parsed.language = code;
      await AsyncStorage.setItem('app_settings', JSON.stringify(parsed));
    } catch (e) {
      // Non-blocking — loadSettings will fall back to @app_language
    }
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    goToNextStep();
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToPreviousStep();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      
      <View style={[styles.gradient, { backgroundColor: '#0f1a14' }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={[styles.header, { flexDirection: isSelectedRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.headerPlaceholder} />
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{screenText.title}</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </Animated.View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Animated.View 
                entering={FadeInDown.delay(200).duration(600)}
                style={[styles.progressFill, { width: '25%' }]} 
              />
            </View>
          </View>

          {/* الوصف */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.descContainer}>
            <MaterialCommunityIcons name="translate" size={40} color="#0d8e62" />
            <Text style={[styles.descText, { textAlign: isSelectedRTL ? 'right' : 'left' }]}>
              {screenText.desc}
            </Text>
          </Animated.View>

          {/* قائمة اللغات */}
          <ScrollView
            style={styles.languagesList}
            contentContainerStyle={styles.languagesContent}
            showsVerticalScrollIndicator={false}
          >
            {LANGUAGES.map((language, index) => (
              <LanguageItem
                key={language.code}
                language={language}
                isSelected={selectedLanguage === language.code}
                onSelect={() => handleLanguageSelect(language.code)}
                index={index}
              />
            ))}
          </ScrollView>

          {/* زر المتابعة */}
          <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.continueButtonGradient, { backgroundColor: 'rgba(6,79,47,0.85)' }]}
                >
                  <Text style={styles.continueButtonText}>{screenText.btn}</Text>
<MaterialCommunityIcons name={isSelectedRTL ? 'arrow-left' : 'arrow-right'} size={24} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* مؤشر الصفحات */}
              <View style={[styles.pageIndicator, { flexDirection: isSelectedRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </Animated.View>
          </SafeAreaView>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ========================================
// الأنماط
// ========================================

const _styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  stepText: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.85)',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 34,
    includeFontPadding: false,
  },
  headerPlaceholder: {
    width: 44,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  progressBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0d8e62',
    borderRadius: 2,
  },
  descContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
  },
  descText: {
    fontSize: 15,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  languagesList: {
    flex: 1,
  },
  languagesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  languageItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  languageItemSelected: {
    backgroundColor: 'rgba(6,79,47,0.2)',
    borderColor: '#0d8e62',
  },
  flagEmoji: {
    fontSize: 28,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 17,
    fontFamily: fontBold(),
    color: '#fff',
  },
  languageNameSelected: {
    color: '#0d8e62',
  },
  languageNameEn: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.5)',
  },
  rtlBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rtlText: {
    fontSize: 10,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.7)',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#0d8e62',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0d8e62',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#fff',
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#0d8e62',
  },
});
