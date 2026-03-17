// app/onboarding/notifications.tsx
// شاشة إعداد الإشعارات - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useOnboarding } from '@/contexts/OnboardingContext';
import { isRTL as checkIsRTL } from '@/lib/i18n';
import { tOnboarding, tOnboardingStep } from '@/constants/onboarding-translations';

// ========================================
// الثوابت
// ========================================

const getNotificationOptions = () => [
  {
    id: 'prayer',
    icon: 'mosque',
    title: tOnboarding('prayerTimes'),
    description: tOnboarding('prayerTimesDesc'),
    color: '#c17f59',
  },
  {
    id: 'azkar',
    icon: 'book-open-variant',
    title: tOnboarding('adhkar'),
    description: tOnboarding('adhkarDesc'),
    color: '#2f7659',
  },
  {
    id: 'salawat',
    icon: 'heart',
    title: tOnboarding('salawat'),
    description: tOnboarding('salawatDesc'),
    color: '#d4a017',
  },
  {
    id: 'dailyVerse',
    icon: 'book-open-page-variant',
    title: tOnboarding('dailyVerse'),
    description: tOnboarding('dailyVerseDesc'),
    color: '#3a7ca5',
  },
];

// ========================================
// المكون الرئيسي
// ========================================

export default function NotificationsScreen() {
  const isRTL = checkIsRTL();
  const notificationOptions = getNotificationOptions();
  const { preferences, updatePreferences, goToNextStep, goToPreviousStep, skipOnboarding } = useOnboarding();
  
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enabledOptions, setEnabledOptions] = useState<{ [key: string]: boolean }>({
    prayer: true,
    azkar: true,
    salawat: true,
    dailyVerse: true,
  });

  useEffect(() => {
    checkExistingPermission();
  }, []);

  const checkExistingPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionGranted(status === 'granted');
  };

  const requestNotificationPermission = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        setPermissionGranted(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(
          tOnboarding('notificationPermission'),
          tOnboarding('notificationPermissionDesc'),
          [{ text: tOnboarding('ok'), style: 'default' }]
        );
      }
    } catch (error) {
      console.error('Error requesting notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOption = (optionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnabledOptions((prev) => ({
      ...prev,
      [optionId]: !prev[optionId],
    }));
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    updatePreferences({
      notificationsEnabled: permissionGranted,
      prayerNotifications: enabledOptions.prayer,
      azkarNotifications: enabledOptions.azkar,
      salawatReminder: enabledOptions.salawat,
      dailyVerse: enabledOptions.dailyVerse,
    });
    
    goToNextStep();
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToPreviousStep();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePreferences({ notificationsEnabled: false });
    goToNextStep();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View style={[styles.gradient, { backgroundColor: '#1a1a2e' }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.stepText}>{tOnboardingStep(5, 5)}</Text>
              <Text style={styles.headerTitle}>{tOnboarding('notifications')}</Text>
            </View>
            <TouchableOpacity style={styles.skipBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); skipOnboarding(); }}>
              <Text style={styles.skipBtnText}>{tOnboarding('skip')}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBg, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Animated.View 
                entering={FadeInDown.delay(200).duration(600)}
                style={[styles.progressFill, { width: '75%' }]} 
              />
            </View>
          </View>

          {/* المحتوى */}
          <View style={styles.content}>
            {/* الأيقونة */}
            <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.iconContainer}>
              <View
                style={styles.iconGradient}
              >
                <MaterialCommunityIcons
                  name={permissionGranted ? 'bell-check' : 'bell-ring'}
                  size={50}
                  color="#fff"
                />
              </View>
            </Animated.View>

            {/* العنوان */}
            <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.title}>
              {permissionGranted ? tOnboarding('notificationsEnabled') : tOnboarding('enableNotifications')}
            </Animated.Text>

            <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={styles.description}>
              {tOnboarding('chooseNotifications')}
            </Animated.Text>

            {/* زر تفعيل الإشعارات */}
            {!permissionGranted && (
              <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.enableContainer}>
                <TouchableOpacity
                  style={styles.enableButton}
                  onPress={requestNotificationPermission}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="bell-plus" size={24} color="#fff" />
                  <Text style={styles.enableButtonText}>{tOnboarding('enableNotifications')}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* خيارات الإشعارات */}
            <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.optionsContainer}>
              {notificationOptions.map((option, index) => (
                <Animated.View
                  key={option.id}
                  entering={FadeInDown.delay(600 + index * 80).duration(400)}
                  style={[
                    styles.optionItem,
                    !permissionGranted && styles.optionItemDisabled,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={styles.optionIcon}>
                    <MaterialCommunityIcons name={option.icon as any} size={24} color={option.color} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{option.title}</Text>
                    <Text style={[styles.optionDesc, { textAlign: isRTL ? 'right' : 'left' }]}>{option.description}</Text>
                  </View>
                  <Switch
                    value={enabledOptions[option.id] && permissionGranted}
                    onValueChange={() => toggleOption(option.id)}
                    disabled={!permissionGranted}
                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: `${option.color}80` }}
                    thumbColor={enabledOptions[option.id] ? option.color : '#666'}
                  />
                </Animated.View>
              ))}
            </Animated.View>
          </View>

          {/* الأزرار */}
          <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
            <Animated.View entering={FadeInDown.delay(900).duration(500)}>
              {!permissionGranted && (
                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                  <Text style={styles.skipButtonText}>{tOnboarding('skipStep')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
              <View
                style={[styles.continueButtonGradient, { backgroundColor: 'rgba(47,118,89,0.85)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                  <Text style={styles.continueButtonText}>{tOnboarding('continue')}</Text>
                  <MaterialCommunityIcons name={isRTL ? 'arrow-left' : 'arrow-right'} size={24} color="#fff" />
              </View>
              </TouchableOpacity>

              {/* مؤشر الصفحات */}
              <View style={[styles.pageIndicator, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotActive]} />
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
    paddingHorizontal: 12,
  },
  skipBtnText: {
    fontSize: 15,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.7)',
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
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    backgroundColor: '#2f7659',
  },
  title: {
    fontSize: 24,
    fontFamily: fontBold(),
    color: '#fff',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
  },
  enableContainer: {
    marginTop: 20,
    width: '100%',
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5a623',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 10,
  },
  enableButtonText: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: '#fff',
  },
  optionsContainer: {
    width: '100%',
    marginTop: 24,
    gap: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
  },
  optionItemDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
    color: '#fff',
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.5)',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  skipButtonText: {
    fontSize: 15,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.6)',
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
    backgroundColor: '#2f7659',
  },
});
