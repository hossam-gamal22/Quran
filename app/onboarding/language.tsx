// app/onboarding/language.tsx
// شاشة اختيار اللغة - روح المسلم

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { useOnboarding } from '@/contexts/OnboardingContext';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const LANGUAGES = [
  { code: 'ar', name: 'العربية', nameEn: 'Arabic', flag: '🇸🇦', isRTL: true },
  { code: 'en', name: 'English', nameEn: 'English', flag: '🇺🇸', isRTL: false },
  { code: 'ur', name: 'اردو', nameEn: 'Urdu', flag: '🇵🇰', isRTL: true },
  { code: 'id', name: 'Bahasa Indonesia', nameEn: 'Indonesian', flag: '🇮🇩', isRTL: false },
  { code: 'tr', name: 'Türkçe', nameEn: 'Turkish', flag: '🇹🇷', isRTL: false },
  { code: 'fr', name: 'Français', nameEn: 'French', flag: '🇫🇷', isRTL: false },
  { code: 'de', name: 'Deutsch', nameEn: 'German', flag: '🇩🇪', isRTL: false },
  { code: 'hi', name: 'हिन्दी', nameEn: 'Hindi', flag: '🇮🇳', isRTL: false },
  { code: 'bn', name: 'বাংলা', nameEn: 'Bengali', flag: '🇧🇩', isRTL: false },
  { code: 'ms', name: 'Bahasa Melayu', nameEn: 'Malay', flag: '🇲🇾', isRTL: false },
  { code: 'ru', name: 'Русский', nameEn: 'Russian', flag: '🇷🇺', isRTL: false },
  { code: 'es', name: 'Español', nameEn: 'Spanish', flag: '🇪🇸', isRTL: false },
];

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
  return (
    <Animated.View entering={FadeInRight.delay(index * 50).duration(400)}>
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.languageItemSelected]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect();
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.flag}>{language.flag}</Text>
        <View style={styles.languageInfo}>
          <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
            {language.name}
          </Text>
          <Text style={styles.languageNameEn}>{language.nameEn}</Text>
        </View>
        {language.isRTL && (
          <View style={styles.rtlBadge}>
            <Text style={styles.rtlText}>RTL</Text>
          </View>
        )}
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
  const { preferences, updatePreferences, goToNextStep, goToPreviousStep } = useOnboarding();
  const [selectedLanguage, setSelectedLanguage] = useState(preferences.language || 'ar');

  const handleLanguageSelect = (code: string) => {
    setSelectedLanguage(code);
    updatePreferences({ language: code });
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
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View style={[styles.gradient, { backgroundColor: '#1a1a2e' }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.stepText}>الخطوة 1 من 4</Text>
              <Text style={styles.headerTitle}>اختر لغتك</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </Animated.View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <Animated.View 
                entering={FadeInDown.delay(200).duration(600)}
                style={[styles.progressFill, { width: '25%' }]} 
              />
            </View>
          </View>

          {/* الوصف */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.descContainer}>
            <MaterialCommunityIcons name="translate" size={40} color="#2f7659" />
            <Text style={styles.descText}>
              اختر اللغة التي تفضلها للتطبيق. يمكنك تغييرها لاحقاً من الإعدادات.
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
                  style={[styles.continueButtonGradient, { backgroundColor: 'rgba(47,118,89,0.85)' }]}
                >
                  <Text style={styles.continueButtonText}>متابعة</Text>
                  <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* مؤشر الصفحات */}
              <View style={styles.pageIndicator}>
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotActive]} />
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

const styles = StyleSheet.create({
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
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
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
    backgroundColor: '#2f7659',
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
    fontFamily: 'Cairo-Regular',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageItemSelected: {
    backgroundColor: 'rgba(47,118,89,0.2)',
    borderColor: '#2f7659',
  },
  flag: {
    fontSize: 32,
    marginRight: 14,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  languageNameSelected: {
    color: '#2f7659',
  },
  languageNameEn: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  rtlBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  rtlText: {
    fontSize: 10,
    fontFamily: 'Cairo-Medium',
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
    borderColor: '#2f7659',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2f7659',
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
    fontFamily: 'Cairo-Bold',
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
    backgroundColor: '#2f7659',
  },
});
