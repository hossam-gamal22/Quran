// app/onboarding/prize.tsx
// شاشة الإعلان عن الجائزة الشهرية - روح المسلم

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useOnboarding } from '@/contexts/OnboardingContext';
import { isRTL as checkIsRTL } from '@/lib/i18n';
import { tOnboarding, tOnboardingStep } from '@/constants/onboarding-translations';

const { width } = Dimensions.get('window');

const ENGAGEMENT_CATEGORIES = [
  { icon: 'mosque' as const, labelKey: 'prayer', color: '#c17f59' },
  { icon: 'book-open-variant' as const, labelKey: 'quran', color: '#3a7ca5' },
  { icon: 'hands-pray' as const, labelKey: 'azkar', color: '#2f7659' },
  { icon: 'counter' as const, labelKey: 'tasbih', color: '#5d4e8c' },
];

export default function PrizeScreen() {
  const { goToNextStep, goToPreviousStep, skipOnboarding } = useOnboarding();
  const isRTL = checkIsRTL();

  // Trophy bounce animation
  const trophyScale = useSharedValue(1);
  const trophyRotation = useSharedValue(0);

  useEffect(() => {
    trophyScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1500, easing: Easing.bezierFn(0.25, 0.1, 0.25, 1) }),
        withTiming(1, { duration: 1500, easing: Easing.bezierFn(0.25, 0.1, 0.25, 1) })
      ),
      -1,
      true
    );
    trophyRotation.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 2000 }),
        withTiming(-5, { duration: 2000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophyRotation.value}deg` },
    ],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View style={[styles.gradient, { backgroundColor: '#1a1a2e' }]}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          {/* Header */}
          <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
            <View style={styles.headerContent}>
              <Text style={styles.stepText}>{tOnboardingStep(3, 5)}</Text>
              <Text style={styles.headerTitle}>{tOnboarding('prizeTitle')}</Text>
            </View>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                skipOnboarding();
              }}
            >
              <Text style={styles.skipText}>{tOnboarding('skip')}</Text>
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: '40%' }]} />
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Trophy Icon */}
            <Animated.View entering={FadeIn.duration(600)} style={styles.trophyContainer}>
              <Animated.View style={trophyStyle}>
                <View style={styles.trophyCircle}>
                  <MaterialCommunityIcons name="trophy" size={52} color="#f59e0b" />
                </View>
              </Animated.View>
            </Animated.View>

            {/* Medal row */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={[styles.medalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.medalCircle, { backgroundColor: 'rgba(205,127,50,0.2)', borderColor: 'rgba(205,127,50,0.4)' }]}>
                <MaterialCommunityIcons name="medal" size={26} color="#CD7F32" />
              </View>
              <View style={[styles.medalCircle, { backgroundColor: 'rgba(255,215,0,0.2)', borderColor: 'rgba(255,215,0,0.4)' }]}>
                <MaterialCommunityIcons name="trophy" size={26} color="#FFD700" />
              </View>
              <View style={[styles.medalCircle, { backgroundColor: 'rgba(192,192,192,0.2)', borderColor: 'rgba(192,192,192,0.4)' }]}>
                <MaterialCommunityIcons name="medal" size={26} color="#C0C0C0" />
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.title}>
              {tOnboarding('prizeHeadline')}
            </Animated.Text>

            {/* Description */}
            <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={styles.description}>
              {tOnboarding('prizeDescription')}
            </Animated.Text>

            {/* Engagement categories */}
            <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.categoriesContainer}>
              <Text style={styles.categoriesTitle}>{tOnboarding('prizeActivities')}</Text>
              <View style={styles.categoriesGrid}>
                {ENGAGEMENT_CATEGORIES.map((cat, index) => (
                  <Animated.View
                    key={cat.labelKey}
                    entering={FadeInUp.delay(600 + index * 100).duration(400)}
                    style={styles.categoryItem}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}30` }]}>
                      <MaterialCommunityIcons name={cat.icon} size={28} color={cat.color} />
                    </View>
                    <Text style={styles.categoryLabel}>{tOnboarding(cat.labelKey)}</Text>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          </ScrollView>

          {/* Bottom */}
          <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
            <Animated.View entering={FadeInUp.delay(1000).duration(500)}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  goToNextStep();
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.continueButtonGradient, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.continueButtonText}>{tOnboarding('startJourney')}</Text>
                  <MaterialCommunityIcons
                    name={isRTL ? 'arrow-left' : 'arrow-right'}
                    size={24}
                    color="#fff"
                  />
                </View>
              </TouchableOpacity>

              {/* Page indicator - 5 dots, index 1 active */}
              <View style={[styles.pageIndicator, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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

const styles = StyleSheet.create({
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
    color: 'rgba(255,255,255,0.6)',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fontBold(),
    color: '#fff',
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
  progressContainer: { paddingHorizontal: 24, marginTop: 8 },
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
  content: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  trophyContainer: {
    marginBottom: 12,
  },
  trophyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  medalRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  medal: {
    fontSize: 30,
  },
  medalCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  title: {
    fontSize: 20,
    fontFamily: fontBold(),
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  description: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  categoriesContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
  },
  categoriesTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  categoryItem: {
    alignItems: 'center',
    width: (width - 120) / 2,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
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
    backgroundColor: 'rgba(47,118,89,0.85)',
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
    backgroundColor: '#2f7659',
  },
});
