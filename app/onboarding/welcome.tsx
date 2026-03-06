// app/onboarding/welcome.tsx
// شاشة الترحيب - روح المسلم

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
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
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { useOnboarding } from '@/contexts/OnboardingContext';

const { width, height } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const APP_INFO = {
  name: 'روح المسلم',
  tagline: 'رفيقك في رحلة الإيمان',
  description: 'تطبيق شامل للأذكار والقرآن الكريم وأوقات الصلاة',
};

const FEATURES = [
  { icon: 'book-open-variant', label: 'القرآن الكريم', color: '#3a7ca5' },
  { icon: 'hands-pray', label: 'الأذكار والأدعية', color: '#2f7659' },
  { icon: 'mosque', label: 'أوقات الصلاة', color: '#c17f59' },
  { icon: 'compass', label: 'اتجاه القبلة', color: '#5d4e8c' },
];

// ========================================
// المكون الرئيسي
// ========================================

export default function WelcomeScreen() {
  const { goToNextStep, skipOnboarding } = useOnboarding();
  
  // أنيميشن النجوم
  const starRotation = useSharedValue(0);
  const starScale = useSharedValue(1);
  
  useEffect(() => {
    starRotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    
    starScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);
  
  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${starRotation.value}deg` },
      { scale: starScale.value },
    ],
  }));

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    goToNextStep();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    skipOnboarding();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View
        style={[styles.gradient, { backgroundColor: '#1a1a2e' }]}
      >
        {/* زر التخطي */}
        <SafeAreaView edges={['top']} style={styles.topBar}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>تخطي</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* الزخرفة الخلفية */}
        <View style={styles.decorationContainer}>
          <Animated.View style={[styles.starDecoration, starAnimatedStyle]}>
            <MaterialCommunityIcons name="star-crescent" size={200} color="rgba(255,255,255,0.05)" />
          </Animated.View>
        </View>

        {/* المحتوى الرئيسي */}
        <View style={styles.content}>
          {/* الشعار */}
          <Animated.View entering={FadeIn.duration(800)} style={styles.logoContainer}>
            <View
              style={[styles.logoGradient, { backgroundColor: 'rgba(47,118,89,0.85)' }]}
            >
              <MaterialCommunityIcons name="star-crescent" size={60} color="#fff" />
            </View>
          </Animated.View>

          {/* اسم التطبيق */}
          <Animated.Text entering={FadeInDown.delay(200).duration(600)} style={styles.appName}>
            {APP_INFO.name}
          </Animated.Text>

          {/* الشعار الفرعي */}
          <Animated.Text entering={FadeInDown.delay(400).duration(600)} style={styles.tagline}>
            {APP_INFO.tagline}
          </Animated.Text>

          {/* الوصف */}
          <Animated.Text entering={FadeInDown.delay(600).duration(600)} style={styles.description}>
            {APP_INFO.description}
          </Animated.Text>

          {/* المميزات */}
          <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => (
              <Animated.View
                key={feature.label}
                entering={FadeInUp.delay(800 + index * 100).duration(400)}
                style={styles.featureItem}
              >
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons name={feature.icon as any} size={24} color={feature.color} />
                </View>
                <Text style={styles.featureLabel}>{feature.label}</Text>
              </Animated.View>
            ))}
          </Animated.View>
        </View>

        {/* الأزرار */}
        <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
          <Animated.View entering={FadeInUp.delay(1200).duration(600)} style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGetStarted}
              activeOpacity={0.8}
            >
              <View
                style={[styles.primaryButtonGradient, { backgroundColor: 'rgba(47,118,89,0.85)' }]}
              >
                <Text style={styles.primaryButtonText}>ابدأ الآن</Text>
                <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* مؤشر الصفحات */}
            <View style={styles.pageIndicator}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </Animated.View>
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
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'flex-start',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Cairo-Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  decorationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starDecoration: {
    position: 'absolute',
    top: height * 0.1,
    opacity: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  appName: {
    fontSize: 42,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    textAlign: 'center',
  },
  tagline: {
    fontSize: 20,
    fontFamily: 'Cairo-Medium',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 40,
    gap: 16,
  },
  featureItem: {
    alignItems: 'center',
    width: (width - 100) / 2,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 13,
    fontFamily: 'Cairo-Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  buttonsContainer: {
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  pageIndicator: {
    flexDirection: 'row',
    marginTop: 24,
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
