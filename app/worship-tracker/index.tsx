// app/worship-tracker/index.tsx
// الصفحة الرئيسية لمتتبع العبادات - روح المسلم

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useWorship } from '@/contexts/WorshipContext';
import { useSettings } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';
import GlassCard from '@/components/ui/GlassCard';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { Colors, DarkColors } from '@/constants/theme';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// ========================================
// مكونات فرعية
// ========================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  index: number;
  onPress?: () => void;
  isDarkMode?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  index,
  onPress,
  isDarkMode = false,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(500)}>
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.statCard, { backgroundColor: colors.card }]}
      >
        <View style={[styles.statIconContainer, { overflow: 'hidden' }]}>
          {Platform.OS === 'ios' && (
            <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
          )}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textLight }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.statSubtitle, { color: colors.textLight }]}>{subtitle}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
    </Animated.View>
  );
};

interface TrackerCardProps {
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  colors: [string, string];
  progress?: number;
  status?: string;
  index: number;
  onPress: () => void;
  isDarkMode?: boolean;
}

const TrackerCard: React.FC<TrackerCardProps> = ({
  title,
  description,
  icon,
  colors,
  progress,
  status,
  index,
  onPress,
  isDarkMode = false,
}) => {
  const isRTL = useIsRTL();
  return (
    <Animated.View entering={FadeInDown.delay(index * 150).duration(500)}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View
          style={[styles.trackerCard, { backgroundColor: `${colors[0]}CC` }]}
        >
          <View style={[styles.trackerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.trackerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.trackerIconBg}>
                <MaterialCommunityIcons name={icon} size={28} color="#fff" />
              </View>
              <View style={styles.trackerTextContainer}>
                <Text style={[styles.trackerTitle, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{title}</Text>
                <Text style={[styles.trackerDescription, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{description}</Text>
              </View>
            </View>
            
            <View style={[styles.trackerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color="rgba(255,255,255,0.7)" />
              {status && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{status}</Text>
                </View>
              )}
              {progress !== undefined && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressCircle}>
                    <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface QuickActionProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  isActive?: boolean;
  onPress: () => void;
  isDarkMode?: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({
  icon,
  label,
  color,
  isActive = false,
  onPress,
  isDarkMode = false,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  return (
    <TouchableOpacity
      style={[
        styles.quickAction,
        { backgroundColor: colors.card },
        isActive && { backgroundColor: `${color}30`, borderColor: color },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={isActive ? color : colors.icon}
      />
      <Text
        style={[
          styles.quickActionLabel,
          { color: colors.textLight },
          isActive && { color },
        ]}
      >
        {label}
      </Text>
      {isActive && (
        <View style={[styles.checkBadge, { backgroundColor: color, right: isRTL ? undefined : -5, left: isRTL ? -5 : undefined }]}>
          <MaterialCommunityIcons name="check" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

interface ReportShortcutProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}

const ReportShortcut: React.FC<ReportShortcutProps> = ({
  icon,
  title,
  subtitle,
  color,
  onPress,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();

  return (
    <TouchableOpacity
      style={[styles.reportShortcut, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      activeOpacity={0.78}
    >
      <View style={[styles.reportIconBg, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <View style={styles.reportText}>
        <Text style={[styles.reportTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {title}
        </Text>
        <Text style={[styles.reportSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {subtitle}
        </Text>
      </View>
      <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textLight} />
    </TouchableOpacity>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function WorshipTrackerScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { context, section } = useLocalSearchParams();
  const {
    isLoading,
    stats,
    todayPrayer,
    todayFasting,
    todayQuran,
    todayAzkar,
    toggleTodayFasting,
    toggleAzkarType,
    refreshTodayRecords,
    refreshStats,
  } = useWorship();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const statsScrollRef = useRef<ScrollView>(null);
  
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);


  // حساب إحصائيات الصلاة اليوم
  const getPrayerProgress = () => {
    if (!todayPrayer) return 0;
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
    const prayed = prayers.filter(p => todayPrayer[p] === 'prayed' || todayPrayer[p] === 'late').length;
    return (prayed / 5) * 100;
  };

  const getPrayedCount = () => {
    if (!todayPrayer) return '0/5';
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
    const prayed = prayers.filter(p => todayPrayer[p] === 'prayed' || todayPrayer[p] === 'late').length;
    return `${prayed}/5`;
  };

  // تحديث البيانات
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refreshTodayRecords(), refreshStats()]);
    setIsRefreshing(false);
  }, [refreshTodayRecords, refreshStats]);

  // Refresh when screen gains focus (e.g. returning from azkar completion)
  useFocusEffect(
    useCallback(() => {
      refreshTodayRecords().catch(() => {});
    }, [refreshTodayRecords])
  );

  // التنقل
  const navigateTo = (screen: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/worship-tracker/${screen}` as any);
  };

  // If a caller provided a ?context= or ?section= parameter (e.g. ?section=prayer), forward to that sub-screen
  useEffect(() => {
    const param = context || section;
    if (!param) return;
    // Normalize to known keys
    const allowed = ['quran', 'prayer', 'fasting', 'azkar', 'tasbih'];
    const key = String(param).toLowerCase();
    if (allowed.includes(key)) {
      router.replace(`/worship-tracker/${key}` as any);
    }
  }, [context, section]);

  // أزرار سريعة
  const handleToggleFasting = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await toggleTodayFasting();
  };

  const handleToggleMorningAzkar = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await toggleAzkarType('morning');
  };

  const handleToggleEveningAzkar = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await toggleAzkarType('evening');
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={styles.container}
    >
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* الهيدر */}
      <UniversalHeader
        titleColor={colors.text}
        onBack={() => router.back()}
        showBack
        rightActions={[{
          icon: 'cog-outline',
          onPress: () => router.push('/settings/worship-tracking'),
          color: colors.text,
          size: 24,
        }]}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('home.worshipTracker')}</Text>
          <SectionInfoButton sectionKey="worship" />
        </View>
      </UniversalHeader>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#0d8e62']}
            tintColor="#0d8e62"
          />
        }
      >
        {/* إحصائيات سريعة */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('worship.statistics')}
          </Text>
          <ScrollView
            ref={statsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.statsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onContentSizeChange={() => {
              if (isRTL) {
                statsScrollRef.current?.scrollToEnd({ animated: false });
              }
            }}
          >
            <StatCard
              title={t('worship.prayerTracker')}
              value={`${stats?.prayer?.percentage ?? 0}%`}
              subtitle={`${t('worship.currentStreak')}: ${stats?.prayer?.streak ?? 0} ${t('home.days')}`}
              icon="mosque"
              color="#0d8e62"
              index={0}
              onPress={() => navigateTo('prayer')}
              isDarkMode={isDarkMode}
            />
            <StatCard
              title={t('worship.totalDays')}
              value={stats?.fasting?.totalDays ?? 0}
              subtitle={`${t('worship.currentStreak')}: ${stats?.fasting?.currentStreak ?? 0} ${t('home.days')}`}
              icon="moon-waning-crescent"
              color="#4a3d73"
              index={1}
              onPress={() => navigateTo('fasting')}
              isDarkMode={isDarkMode}
            />
            <StatCard
              title={t('worship.totalPages')}
              value={stats?.quran?.totalPages ?? 0}
              subtitle={`${t('worship.khatmaNumber')}: ${stats?.quran?.khatmasCompleted ?? 0}`}
              icon="book-open-page-variant"
              color="#c17f59"
              index={2}
              onPress={() => navigateTo('quran')}
              isDarkMode={isDarkMode}
            />
            <StatCard
              title={t('worship.consecutiveDays')}
              value={stats?.azkar?.totalDays ?? 0}
              subtitle={`${stats?.azkar?.completionRate ?? 0}%`}
              icon="hand-heart"
              color="#3a7ca5"
              index={3}
              onPress={() => navigateTo('azkar')}
              isDarkMode={isDarkMode}
            />
          </ScrollView>
        </Animated.View>

        {/* أفعال سريعة */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('worship.quickTools')}
          </Text>
          <View style={[styles.quickActionsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <QuickAction
              icon="moon-waning-crescent"
              label={t('worship.recordFasting')}
              color="#4a3d73"
              isActive={todayFasting?.fasted ?? false}
              onPress={handleToggleFasting}
              isDarkMode={isDarkMode}
            />
            <QuickAction
              icon="weather-sunny"
              label={t('home.morningAzkar')}
              color="#c07b10"
              isActive={todayAzkar?.morning ?? false}
              onPress={handleToggleMorningAzkar}
              isDarkMode={isDarkMode}
            />
            <QuickAction
              icon="weather-night"
              label={t('home.eveningAzkar')}
              color="#3a7ca5"
              isActive={todayAzkar?.evening ?? false}
              onPress={handleToggleEveningAzkar}
              isDarkMode={isDarkMode}
            />
          </View>
        </Animated.View>

        {/* التقارير */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('worship.yourStats')}
          </Text>
          <View style={styles.reportsContainer}>
            <ReportShortcut
              icon="calendar-today"
              title={t('worship.dailySummary')}
              subtitle={t('worship.todaySummary')}
              color="#0d8e62"
              onPress={() => router.push('/daily-summary' as any)}
            />
            <ReportShortcut
              icon="chart-timeline-variant"
              title={t('worship.weeklyReport')}
              subtitle={t('worship.weeklyReportDesc')}
              color="#3a7ca5"
              onPress={() => router.push('/weekly-summary' as any)}
            />
          </View>
        </Animated.View>

        {/* متتبعات العبادات */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('home.worshipTracker')}
          </Text>
          <View style={styles.trackersContainer}>
            <TrackerCard
              title={t('worship.prayerTracker')}
              description={t('worship.tapToSelectStatus')}
              icon="mosque"
              colors={['#0d8e62', '#1d4a3a']}
              progress={getPrayerProgress()}
              status={getPrayedCount()}
              index={0}
              onPress={() => navigateTo('prayer')}
              isDarkMode={isDarkMode}
            />
            <TrackerCard
              title={t('worship.fastingTracker')}
              description={t('worship.recordFasting')}
              icon="moon-waning-crescent"
              colors={['#4a3d73', '#3d3260']}
              status={todayFasting?.fasted ? t('worship.youAreFasting') : t('worship.tapToRecord')}
              index={1}
              onPress={() => navigateTo('fasting')}
              isDarkMode={isDarkMode}
            />
            <TrackerCard
              title={t('worship.quranTracker')}
              description={t('worship.dailyGoal')}
              icon="book-open-page-variant"
              colors={['#c17f59', '#8a5a3d']}
              status={`${todayQuran?.pagesRead ?? 0} ${t('worship.dailyPages')}`}
              index={2}
              onPress={() => navigateTo('quran')}
              isDarkMode={isDarkMode}
            />
            <TrackerCard
              title={t('worship.azkarTracker')}
              description={t('worship.dailyAzkar')}
              icon="hand-heart"
              colors={['#3a7ca5', '#2a5a7a']}
              progress={stats?.azkar?.completionRate ?? 0}
              status={`${stats?.azkar?.completionRate ?? 0}%`}
              index={3}
              onPress={() => navigateTo('azkar')}
              isDarkMode={isDarkMode}
            />
          </View>
        </Animated.View>

        {/* نصيحة اليوم */}
        <Animated.View entering={FadeInDown.delay(450).duration(500)}>
          <GlassCard style={styles.tipCard}>
            <View style={[styles.tipHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#c07b10" />
              <Text style={[styles.tipTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('worship.tipOfDay')}</Text>
            </View>
            <Text style={[styles.tipText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('worship.tipOfDayText')}
            </Text>
          </GlassCard>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const _styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerDark: {
    backgroundColor: DarkColors.background,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 12,
    lineHeight: 30,
    includeFontPadding: false,
  },
  // إحصائيات
  statsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: 140,
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  statCardDark: {
    backgroundColor: DarkColors.surface,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  statValue: {
    fontSize: 24,
    fontFamily: fontBold(),
    lineHeight: 38,
    includeFontPadding: false,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: fontMedium(),
    marginTop: 2,
    lineHeight: 20,
    includeFontPadding: false,
  },
  statSubtitle: {
    fontSize: 10,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 16,
    includeFontPadding: false,
  },
  // أفعال سريعة
  quickActionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  quickActionDark: {
    backgroundColor: DarkColors.surface,
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: fontMedium(),
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
    includeFontPadding: false,
  },
  checkBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // التقارير
  reportsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  reportShortcut: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  reportIconBg: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportText: {
    flex: 1,
    minWidth: 0,
  },
  reportTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
    lineHeight: 25,
    includeFontPadding: false,
  },
  reportSubtitle: {
    fontSize: 11,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 18,
    includeFontPadding: false,
  },
  // متتبعات
  trackersContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  trackerCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  trackerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trackerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  trackerIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  trackerTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 28,
    includeFontPadding: false,
  },
  trackerDescription: {
    fontSize: 11,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    lineHeight: 18,
    includeFontPadding: false,
  },
  trackerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 12,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 20,
    includeFontPadding: false,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fontMedium(),
    color: '#fff',
    lineHeight: 18,
    includeFontPadding: false,
  },
  // نصيحة
  tipCard: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 20,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  tipText: {
    fontSize: 14,
    fontFamily: fontRegular(),
    lineHeight: 22,
  },
  bottomSpace: {
    height: 100,
  },
});
const styles = _styles;
