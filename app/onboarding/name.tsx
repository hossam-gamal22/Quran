// app/onboarding/name.tsx
// شاشة إدخال اسم المستخدم — روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useOnboarding } from '@/contexts/OnboardingContext';
import { isRTL as checkIsRTL } from '@/lib/i18n';
import { tOnboarding, tOnboardingStep } from '@/constants/onboarding-translations';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';

export default function NameScreen() {
  const { goToNextStep, goToPreviousStep, updatePreferences, preferences, skippedToNameStep } = useOnboarding();
  const isRTL = checkIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  // Pre-fill from preferences (back-nav) or restored AsyncStorage name (server fallback)
  useEffect(() => {
    const seed = (full: string) => {
      const trimmed = full.trim();
      if (!trimmed) return;
      const idx = trimmed.indexOf(' ');
      if (idx === -1) {
        setFirstName(trimmed);
      } else {
        setFirstName(trimmed.slice(0, idx));
        setLastName(trimmed.slice(idx + 1).trim());
      }
    };
    if (preferences.displayName && preferences.displayName.trim()) {
      seed(preferences.displayName);
      return;
    }
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('@rooh_display_name');
        if (stored) seed(stored);
      } catch {
        // silent
      }
    })();
  }, []);

  const handleContinue = () => {
    const trimFirst = firstName.trim();
    const trimLast = lastName.trim();

    // Name is optional (Apple 5.1.1(v) compliance) — proceed even when blank.
    const parts = [trimFirst, trimLast].filter(Boolean);
    if (parts.length > 0) {
      updatePreferences({ displayName: parts.join(' ') });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    goToNextStep();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToNextStep();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      <View style={[styles.gradient, { backgroundColor: '#1a1a2e' }]}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {skippedToNameStep ? (
              <View style={styles.backButton} />
            ) : (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  goToPreviousStep();
                }}
              >
                <MaterialCommunityIcons
                  name={isRTL ? 'arrow-right' : 'arrow-left'}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            )}
            <View style={styles.headerContent}>
              <Text style={styles.stepText}>{tOnboardingStep(4, 6)}</Text>
              <Text style={styles.headerTitle}>{tOnboarding('nameTitle')}</Text>
            </View>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipBtnText}>{tOnboarding('skip')}</Text>
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: '50%' }]} />
            </View>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Icon */}
              <Animated.View entering={FadeIn.duration(600)} style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="account-edit" size={48} color="#0d8e62" />
                </View>
              </Animated.View>

              {/* Title */}
              <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.title}>
                {tOnboarding('nameHeadline')}
              </Animated.Text>

              {/* Description */}
              <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.description}>
                {tOnboarding('nameDescription')}
              </Animated.Text>

              {/* Input Fields */}
              <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.inputsContainer}>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="account" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                    placeholder={tOnboarding('firstNamePlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={firstName}
                    onChangeText={(text) => { setFirstName(text); setError(''); }}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="account-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                    placeholder={tOnboarding('lastNamePlaceholder')}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={lastName}
                    onChangeText={(text) => { setLastName(text); setError(''); }}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                  />
                </View>

                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}
              </Animated.View>

              {/* Privacy note */}
              <Animated.View entering={FadeInUp.delay(500).duration(500)} style={[styles.privacyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="shield-lock-outline" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={[styles.privacyText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {tOnboarding('namePrivacy')}
                </Text>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Bottom */}
          <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
            <Animated.View entering={FadeInUp.delay(600).duration(500)}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <View style={[styles.continueButtonGradient, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.continueButtonText}>{tOnboarding('continue')}</Text>
                  <MaterialCommunityIcons
                    name={isRTL ? 'arrow-left' : 'arrow-right'}
                    size={24}
                    color="#fff"
                  />
                </View>
              </TouchableOpacity>

              {/* Page indicator - 6 dots, index 3 active */}
              <View style={[styles.pageIndicator, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.dot} />
                <View style={styles.dot} />
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

const _styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
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
  headerContent: { flex: 1, alignItems: 'center' },
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
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.7)',
  },
  skipBtnText: {
    fontSize: 16,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.7)',
  },
  progressContainer: { paddingHorizontal: 24, marginTop: 8 },
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
  content: { flex: 1 },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  iconContainer: { marginBottom: 20 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(13,142,98,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(13,142,98,0.3)',
  },
  title: {
    fontSize: 24,
    fontFamily: fontBold(),
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 38,
  },
  description: {
    fontSize: 15,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  inputsContainer: {
    width: '100%',
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontRegular(),
    color: '#fff',
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: '#f87171',
    textAlign: 'center',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 8,
  },
  privacyText: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.5)',
    flex: 1,
    lineHeight: 20,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#0d8e62',
    borderRadius: 16,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: fontSemiBold(),
    color: '#fff',
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: '#0d8e62',
    width: 24,
  },
});
