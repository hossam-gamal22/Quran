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
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';

import { useOnboarding } from '@/contexts/OnboardingContext';

const { width, height } = Dimensions.get('window');

// ========================================
// المكون الرئيسي
// ========================================

export default function CompleteScreen() {
  const { completeOnboarding, preferences } = useOnboarding();
  
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
      
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
        {/* كونفيتي */}
        <ConfettiCannon
          count={80}
          origin={{ x: width / 2, y: -20 }}
          autoStart={true}
          fadeOut={true}
          explosionSpeed={300}
          fallSpeed={2500}
          colors={['#2f7659', '#3a7ca5', '#f5a623', '#c17f59', '#5d4e8c']}
        />

        <SafeAreaView style={styles.safeArea}>
          {/* المحتوى */}
          <View style={styles.content}>
            {/* الأيقونة */}
            <Animated.View entering={FadeIn.duration(600)} style={styles.iconContainer}>
              <Animated.View style={[styles.starContainer, starAnimatedStyle]}>
                <LinearGradient
                  colors={['#2f7659', '#1d5a3a']}
                  style={styles.iconGradient}
                >
                  <Animated.View style={checkAnimatedStyle}>
                    <MaterialCommunityIcons name="check-bold" size={70} color="#fff" />
                  </Animated.View>
                </LinearGradient>
              </Animated.View>
            </Animated.View>

            {/* العنوان */}
            <Animated.Text entering={FadeInDown.delay(400).duration(600)} style={styles.title}>
              تم الإعداد بنجاح!
            </Animated.Text>

            <Animated.Text entering={FadeInDown.delay(600).duration(600)} style={styles.subtitle}>
              أنت الآن جاهز لبدء رحلتك الإيمانية
            </Animated.Text>

            {/* ملخص الإعدادات */}
            <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>ملخص إعداداتك</Text>
              
              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <MaterialCommunityIcons name="translate" size={20} color="#3a7ca5" />
                </View>
                <Text style={styles.summaryLabel}>اللغة:</Text>
                <Text style={styles.summaryValue}>
                  {preferences.language === 'ar' ? 'العربية' : preferences.language}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <MaterialCommunityIcons
                    name={preferences.locationEnabled ? 'map-marker-check' : 'map-marker-off'}
                    size={20}
                    color={preferences.locationEnabled ? '#2f7659' : '#999'}
                  />
                </View>
                <Text style={styles.summaryLabel}>الموقع:</Text>
                <Text style={styles.summaryValue}>
                  {preferences.locationEnabled ? `${preferences.city || 'مفعّل'}` : 'غير مفعّل'}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <View style={styles.summaryIcon}>
                  <MaterialCommunityIcons
                    name={preferences.notificationsEnabled ? 'bell-check' : 'bell-off'}
                    size={20}
                    color={preferences.notificationsEnabled ? '#f5a623' : '#999'}
                  />
                </View>
                <Text style={styles.summaryLabel}>الإشعارات:</Text>
                <Text style={styles.summaryValue}>
                  {preferences.notificationsEnabled ? 'مفعّلة' : 'غير مفعّلة'}
                </Text>
              </View>
            </Animated.View>

            {/* نصيحة */}
            <Animated.View entering={FadeInUp.delay(1000).duration(600)} style={styles.tipContainer}>
              <MaterialCommunityIcons name="lightbulb-on" size={20} color="#f5a623" />
              <Text style={styles.tipText}>
                يمكنك تعديل هذه الإعدادات في أي وقت من صفحة الإعدادات
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
              <LinearGradient
                colors={['#2f7659', '#1d5a3a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButtonGradient}
              >
                <Text style={styles.startButtonText}>ابدأ الآن</Text>
                <MaterialCommunityIcons name="rocket-launch" size={26} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              بسم الله الرحمن الرحيم
            </Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
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
    marginBottom: 30,
  },
  starContainer: {},
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2f7659',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
    fontFamily: 'Cairo-Medium',
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 12,
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  tipContainer: {
    flexDirection: 'row',
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
    fontFamily: 'Cairo-Regular',
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
    shadowColor: '#2f7659',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  startButtonText: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 20,
  },
});
