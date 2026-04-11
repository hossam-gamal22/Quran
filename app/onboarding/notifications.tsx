// app/onboarding/notifications.tsx
// شاشة إعداد الإشعارات - روح المسلم

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { useOnboarding } from '@/contexts/OnboardingContext';
import { isRTL as checkIsRTL } from '@/lib/i18n';
import { tOnboarding, tOnboardingStep } from '@/constants/onboarding-translations';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';

// ========================================
// الثوابت - مجموعات الإشعارات
// ========================================

interface NotificationItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface NotificationGroup {
  id: string;
  title: string;
  icon: string;
  color: string;
  items: NotificationItem[];
}

const getNotificationGroups = (): NotificationGroup[] => [
  {
    id: 'prayer',
    title: tOnboarding('groupPrayer'),
    icon: 'mosque',
    color: '#c17f59',
    items: [
      {
        id: 'prayer',
        icon: 'mosque',
        title: tOnboarding('prayerTimes'),
        description: tOnboarding('prayerTimesDesc'),
        color: '#c17f59',
      },
      {
        id: 'afterPrayerAzkar',
        icon: 'hands-pray',
        title: tOnboarding('afterPrayerAzkar'),
        description: tOnboarding('afterPrayerAzkarDesc'),
        color: '#c17f59',
      },
    ],
  },
  {
    id: 'azkar',
    title: tOnboarding('groupAzkar'),
    icon: 'book-open-variant',
    color: '#0d8e62',
    items: [
      {
        id: 'azkar',
        icon: 'weather-sunny',
        title: tOnboarding('adhkar'),
        description: tOnboarding('adhkarDesc'),
        color: '#0d8e62',
      },
      {
        id: 'sleepAzkar',
        icon: 'weather-night',
        title: tOnboarding('sleepAzkar'),
        description: tOnboarding('sleepAzkarDesc'),
        color: '#0d8e62',
      },
      {
        id: 'wakeupAzkar',
        icon: 'white-balance-sunny',
        title: tOnboarding('wakeupAzkar'),
        description: tOnboarding('wakeupAzkarDesc'),
        color: '#0d8e62',
      },
    ],
  },
  {
    id: 'quran',
    title: tOnboarding('groupQuran'),
    icon: 'book-open-page-variant',
    color: '#3a7ca5',
    items: [
      {
        id: 'dailyVerse',
        icon: 'book-open-page-variant',
        title: tOnboarding('dailyVerse'),
        description: tOnboarding('dailyVerseDesc'),
        color: '#3a7ca5',
      },
      {
        id: 'quranReadingReminder',
        icon: 'bookshelf',
        title: tOnboarding('quranReading'),
        description: tOnboarding('quranReadingDesc'),
        color: '#3a7ca5',
      },
      {
        id: 'kahfFriday',
        icon: 'calendar-star',
        title: tOnboarding('kahfFriday'),
        description: tOnboarding('kahfFridayDesc'),
        color: '#3a7ca5',
      },
    ],
  },
  {
    id: 'dhikr',
    title: tOnboarding('groupDhikr'),
    icon: 'heart',
    color: '#d4a017',
    items: [
      {
        id: 'salawat',
        icon: 'heart',
        title: tOnboarding('salawat'),
        description: tOnboarding('salawatDesc'),
        color: '#d4a017',
      },
      {
        id: 'tasbihReminder',
        icon: 'counter',
        title: tOnboarding('tasbihReminder'),
        description: tOnboarding('tasbihReminderDesc'),
        color: '#d4a017',
      },
      {
        id: 'istighfarReminder',
        icon: 'refresh',
        title: tOnboarding('istighfarReminder'),
        description: tOnboarding('istighfarReminderDesc'),
        color: '#d4a017',
      },
    ],
  },
  {
    id: 'tracking',
    title: tOnboarding('groupTracking'),
    icon: 'chart-line',
    color: '#8b5cf6',
    items: [
      {
        id: 'worshipDailySummary',
        icon: 'clipboard-check',
        title: tOnboarding('worshipSummary'),
        description: tOnboarding('worshipSummaryDesc'),
        color: '#8b5cf6',
      },
      {
        id: 'worshipWeeklyReport',
        icon: 'chart-bar',
        title: tOnboarding('worshipWeekly'),
        description: tOnboarding('worshipWeeklyDesc'),
        color: '#8b5cf6',
      },
    ],
  },
];

// ========================================
// المكون الرئيسي
// ========================================

export default function NotificationsScreen() {
  const isRTL = checkIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const notificationGroups = getNotificationGroups();
  const { preferences, updatePreferences, goToNextStep, goToPreviousStep, skipOnboarding } = useOnboarding();
  
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enabledOptions, setEnabledOptions] = useState<{ [key: string]: boolean }>({
    prayer: true,
    afterPrayerAzkar: true,
    azkar: true,
    sleepAzkar: true,
    wakeupAzkar: true,
    dailyVerse: true,
    quranReadingReminder: true,
    kahfFriday: true,
    salawat: true,
    tasbihReminder: true,
    istighfarReminder: true,
    worshipDailySummary: true,
    worshipWeeklyReport: true,
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
      afterPrayerAzkar: enabledOptions.afterPrayerAzkar,
      sleepAzkar: enabledOptions.sleepAzkar,
      wakeupAzkar: enabledOptions.wakeupAzkar,
      quranReadingReminder: enabledOptions.quranReadingReminder,
      kahfFriday: enabledOptions.kahfFriday,
      tasbihReminder: enabledOptions.tasbihReminder,
      istighfarReminder: enabledOptions.istighfarReminder,
      worshipDailySummary: enabledOptions.worshipDailySummary,
      worshipWeeklyReport: enabledOptions.worshipWeeklyReport,
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
      <StatusBar style="light" translucent />
      
      <View style={[styles.gradient, { backgroundColor: '#1a1a2e' }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.stepText}>{tOnboardingStep(6, 6)}</Text>
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
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* الأيقونة */}
            <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.iconContainer}>
              <View style={styles.iconGradient}>
                <MaterialCommunityIcons
                  name={permissionGranted ? 'bell-check' : 'bell-ring'}
                  size={44}
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

            {/* مجموعات الإشعارات */}
            {notificationGroups.map((group, groupIndex) => (
              <Animated.View
                key={group.id}
                entering={FadeInDown.delay(500 + groupIndex * 100).duration(400)}
                style={styles.groupContainer}
              >
                {/* رأس المجموعة */}
                <View style={[styles.groupHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <MaterialCommunityIcons name={group.icon as any} size={18} color={group.color} />
                  <Text style={[styles.groupTitle, { textAlign: isRTL ? 'right' : 'left', color: group.color }]}>{group.title}</Text>
                </View>

                {/* عناصر المجموعة */}
                {group.items.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.optionItem,
                      !permissionGranted && styles.optionItemDisabled,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: `${item.color}18` }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{item.title}</Text>
                      <Text style={[styles.optionDesc, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{item.description}</Text>
                    </View>
                    <Switch
                      value={enabledOptions[item.id] && permissionGranted}
                      onValueChange={() => toggleOption(item.id)}
                      disabled={!permissionGranted}
                      trackColor={{ false: 'rgba(255,255,255,0.2)', true: `${item.color}80` }}
                      thumbColor={enabledOptions[item.id] ? item.color : '#666'}
                    />
                  </View>
                ))}
              </Animated.View>
            ))}

            {/* مسافة أسفل ScrollView */}
            <View style={{ height: 16 }} />
          </ScrollView>

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
                style={[styles.continueButtonGradient, { backgroundColor: 'rgba(6,79,47,0.85)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
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
    backgroundColor: '#0d8e62',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    backgroundColor: '#0d8e62',
  },
  title: {
    fontSize: 22,
    fontFamily: fontBold(),
    color: '#fff',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 6,
  },
  enableContainer: {
    marginTop: 16,
    width: '100%',
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c07b10',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 10,
  },
  enableButtonText: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: '#fff',
  },
  groupContainer: {
    marginTop: 18,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
  },
  optionItemDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
    marginHorizontal: 10,
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#fff',
  },
  optionDesc: {
    fontSize: 11,
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
    color: 'rgba(255,255,255,0.85)',
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
