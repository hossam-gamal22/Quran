// app/onboarding/complete.tsx
// شاشة اكتمال الإعداد - روح المسلم

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
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
  withDelay,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';

import { useOnboarding } from '@/contexts/OnboardingContext';
import { tOnboarding } from '@/constants/onboarding-translations';
import { useIsRTL } from '@/hooks/use-is-rtl';
const { width, height } = Dimensions.get('window');

// ========================================
// المكون الرئيسي
// ========================================

export default function CompleteScreen() {
  const { completeOnboarding, preferences } = useOnboarding();
  const isRTL = useIsRTL();
  
  // أنيميشن النجمة
  const starScale = useSharedValue(0);
  const checkScale = useSharedValue(0);
  
  useEffect(() => {
    // تشغيل الاهتزاز
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // أنيميشن النجمة
    starScale.value = withDelay(
      300,
      withSequence(
        withTiming(1.2, { duration: 400 }),
        withTiming(1, { duration: 200 })
      )
    );
    
    // أنيميشن علامة الصح
    checkScale.value = withDelay(
      600,
      withSequence(
        withTiming(1.3, { duration: 300 }),
        withTiming(1, { duration: 150 })
      )
    );
  }, []);
  
  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));
  
  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    completeOnboarding();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View style={[styles.gradient, { backgroundColor: '#1a1a2e' }]}>
        {/* كونفيتي */}
        <ConfettiCannon
          count={80}
          origin={{ x: width / 2, y: -20 }}
          autoStart={true}
          fadeOut={true}
          explosionSpeed={300}
          fallSpeed={2500}
          colors={['#22C55E', '#3a7ca5', '#f5a623', '#c17f59', '#5d4e8c']}
        />

        <SafeAreaView style={styles.safeArea}>
          {/* المحتوى */}
          <View style={styles.content}>
            {/* الأيقونة */}
            <Animated.View entering={FadeIn.duration(600)} style={styles.iconContainer}>
              <Animated.View style={[styles.starContainer, starAnimatedStyle]}>
                <View
                  style={styles.iconGradient}
                >
                  <Animated.View style={checkAnimatedStyle}>
                    <MaterialCommunityIcons name="check-bold" size={70} color="#fff" />
                  </Animated.View>
                </View>
              </Animated.View>
            </Animated.View>

            {/* العنوان */}
            <Animated.Text entering={FadeInDown.delay(400).duration(600)} style={styles.title}>
              {tOnboarding('setupComplete')}
            </Animated.Text>

            <Animated.Text entering={FadeInDown.delay(600).duration(600)} style={styles.subtitle}>
              {tOnboarding('readyToStart')}
            </Animated.Text>

            {/* ملخص الإعدادات */}
            <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>{tOnboarding('settingsSummary')}</Text>
              
              <View style={[styles.summaryItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.summaryIcon}>
                  <MaterialCommunityIcons name="translate" size={20} color="#3a7ca5" />
                </View>
                <Text style={styles.summaryLabel}>{tOnboarding('languageLabel')}</Text>
                <Text style={styles.summaryValue}>
                  {preferences.language === 'ar' ? tOnboarding('arabic') : preferences.language}
                </Text>
              </View>

              <View style={[styles.summaryItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.summaryIcon}>
                  <MaterialCommunityIcons
                    name={preferences.locationEnabled ? 'map-marker-check' : 'map-marker-off'}
                    size={20}
                    color={preferences.locationEnabled ? '#22C55E' : '#999'}
                  />
                </View>
                <Text style={styles.summaryLabel}>{tOnboarding('locationLabel')}</Text>
                <Text style={styles.summaryValue}>
                  {preferences.locationEnabled ? `${preferences.city || tOnboarding('enabled')}` : tOnboarding('notEnabled')}
                </Text>
              </View>

              <View style={[styles.summaryItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.summaryIcon}>
                  <MaterialCommunityIcons
                    name={preferences.notificationsEnabled ? 'bell-check' : 'bell-off'}
                    size={20}
                    color={preferences.notificationsEnabled ? '#f5a623' : '#999'}
                  />
                </View>
                <Text style={styles.summaryLabel}>{tOnboarding('notificationsLabel')}</Text>
                <Text style={styles.summaryValue}>
                  {preferences.notificationsEnabled ? tOnboarding('enabledF') : tOnboarding('notEnabledF')}
                </Text>
              </View>
            </Animated.View>

            {/* نصيحة */}
            <Animated.View entering={FadeInUp.delay(1000).duration(600)} style={[styles.tipContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="lightbulb-on" size={20} color="#f5a623" />
              <Text style={styles.tipText}>
                {tOnboarding('canChangeSettings')}
              </Text>
            </Animated.View>
          </View>

          {/* زر البدء */}
          <Animated.View entering={FadeInUp.delay(1200).duration(600)} style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStart}
              activeOpacity={0.8}
            >
              <View
                style={[styles.startButtonGradient, { backgroundColor: 'rgba(6,79,47,0.85)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={styles.startButtonText}>{tOnboarding('startNow')}</Text>
                <MaterialCommunityIcons name="rocket-launch" size={26} color="#fff" />
              </View>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              {tOnboarding('bismillah')}
            </Text>
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
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  starContainer: {},
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 15,
    backgroundColor: '#22C55E',
  },
  title: {
    fontSize: 32,
    fontFamily: fontBold(),
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 10,
  },
  summaryContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    marginTop: 30,
    width: '100%',
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.7)',
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: fontBold(),
    color: '#fff',
  },
  tipContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(245,166,35,0.15)',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    alignItems: 'center',
  },
  startButton: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 10,
  },
  startButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  startButtonText: {
    fontSize: 20,
    fontFamily: fontBold(),
    color: '#fff',
  },
  footerText: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.5)',
    marginTop: 20,
  },
});
