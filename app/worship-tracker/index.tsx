// app/worship-tracker/index.tsx
// الصفحة الرئيسية لمتتبع العبادات - روح المسلم

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useSearchParams } from 'expo-router';
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
    <Animated.View
      entering={FadeInRight.delay(index * 100).duration(500)}
      style={animatedStyle}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.statCard, isDarkMode && styles.statCardDark]}
      >
        <View style={styles.statIconContainer}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.statValue, isDarkMode && styles.textLight]}>{value}</Text>
        <Text style={[styles.statTitle, isDarkMode && styles.textMuted]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.statSubtitle, isDarkMode && styles.textMuted]}>{subtitle}</Text>
        )}
      </TouchableOpacity>
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
  return (
    <Animated.View entering={FadeInDown.delay(index * 150).duration(500)}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View
          style={[styles.trackerCard, { backgroundColor: `${colors[0]}CC` }]}
        >
          <View style={styles.trackerContent}>
            <View style={styles.trackerLeft}>
              <View style={styles.trackerIconBg}>
                <MaterialCommunityIcons name={icon} size={32} color="#fff" />
              </View>
              <View style={styles.trackerTextContainer}>
                <Text style={styles.trackerTitle}>{title}</Text>
                <Text style={styles.trackerDescription}>{description}</Text>
              </View>
            </View>
            
            <View style={styles.trackerRight}>
              {progress !== undefined && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressCircle}>
                    <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                  </View>
                </View>
              )}
              {status && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{status}</Text>
                </View>
              )}
              <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={24} color="rgba(255,255,255,0.7)" />
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
  return (
    <TouchableOpacity
      style={[
        styles.quickAction,
        isDarkMode && styles.quickActionDark,
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
        color={isActive ? color : isDarkMode ? '#aaa' : '#666'}
      />
      <Text
        style={[
          styles.quickActionLabel,
          isDarkMode && styles.textMuted,
          isActive && { color },
        ]}
      >
        {label}
      </Text>
      {isActive && (
        <View style={[styles.checkBadge, { backgroundColor: color }]}>
          <MaterialCommunityIcons name="check" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function WorshipTrackerScreen() {
  const router = useRouter();
  const { context } = useSearchParams();
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
  
  const { isDarkMode, settings } = useSettings();
  const language = 'ar';

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

  // التنقل
  const navigateTo = (screen: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/worship-tracker/${screen}` as any);
  };

  // If a caller provided a ?context= parameter (e.g. ?context=quran), forward to that sub-screen
  useEffect(() => {
    if (!context) return;
    // Normalize to known keys
    const allowed = ['quran', 'prayer', 'azkar', 'tasbih'];
    const key = String(context).toLowerCase();
    if (allowed.includes(key)) {
      navigateTo(key);
    }
  }, [context]);

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
      style={[styles.container, { backgroundColor: settings.display.appBackground === 'none' ? (isDarkMode ? '#11151c' : '#fff') : 'transparent' }]}
    >
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />
      
      {/* الهيدر */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
            متتبع العبادات
          </Text>
          <Text style={[styles.headerSubtitle, isDarkMode && styles.textMuted]}>
            تابع عباداتك اليومية
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {/* إعدادات المتتبع */}}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={24}
            color={isDarkMode ? '#fff' : '#333'}
          />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#2f7659']}
            tintColor="#2f7659"
          />
        }
      >
        {/* إحصائيات سريعة */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
            إحصائيات سريعة
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainer}
          >
            <StatCard
              title="نسبة الصلاة"
              value={`${stats?.prayer?.percentage ?? 0}%`}
              subtitle={`سلسلة: ${stats?.prayer?.streak ?? 0} يوم`}
              icon="mosque"
              color="#2f7659"
              index={0}
              onPress={() => navigateTo('prayer')}
              isDarkMode={isDarkMode}
            />
            <StatCard
              title="أيام الصيام"
              value={stats?.fasting?.totalDays ?? 0}
              subtitle={`سلسلة: ${stats?.fasting?.currentStreak ?? 0} يوم`}
              icon="moon-waning-crescent"
              color="#5d4e8c"
              index={1}
              onPress={() => navigateTo('fasting')}
              isDarkMode={isDarkMode}
            />
            <StatCard
              title="صفحات القرآن"
              value={stats?.quran?.totalPages ?? 0}
              subtitle={`ختمات: ${stats?.quran?.khatmasCompleted ?? 0}`}
              icon="book-open-page-variant"
              color="#c17f59"
              index={2}
              onPress={() => navigateTo('quran')}
              isDarkMode={isDarkMode}
            />
            <StatCard
              title="أيام الأذكار"
              value={stats?.azkar?.totalDays ?? 0}
              subtitle={`نسبة: ${stats?.azkar?.completionRate ?? 0}%`}
              icon="hand-heart"
              color="#3a7ca5"
              index={3}
              isDarkMode={isDarkMode}
            />
          </ScrollView>
        </Animated.View>

        {/* أفعال سريعة */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
            أفعال سريعة
          </Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="moon-waning-crescent"
              label="صائم اليوم"
              color="#5d4e8c"
              isActive={todayFasting?.fasted ?? false}
              onPress={handleToggleFasting}
              isDarkMode={isDarkMode}
            />
            <QuickAction
              icon="weather-sunny"
              label="أذكار الصباح"
              color="#f5a623"
              isActive={todayAzkar?.morning ?? false}
              onPress={handleToggleMorningAzkar}
              isDarkMode={isDarkMode}
            />
            <QuickAction
              icon="weather-night"
              label="أذكار المساء"
              color="#3a7ca5"
              isActive={todayAzkar?.evening ?? false}
              onPress={handleToggleEveningAzkar}
              isDarkMode={isDarkMode}
            />
          </View>
        </Animated.View>

        {/* متتبعات العبادات */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
            متتبعات العبادات
          </Text>
          <View style={styles.trackersContainer}>
            <TrackerCard
              title="متتبع الصلاة"
              description="سجل صلواتك الخمس يومياً"
              icon="mosque"
              colors={['#2f7659', '#1d4a3a']}
              progress={getPrayerProgress()}
              status={getPrayedCount()}
              index={0}
              onPress={() => navigateTo('prayer')}
              isDarkMode={isDarkMode}
            />
            <TrackerCard
              title="متتبع الصيام"
              description="سجل أيام صيامك"
              icon="moon-waning-crescent"
              colors={['#5d4e8c', '#3d3260']}
              status={todayFasting?.fasted ? 'صائم' : 'مفطر'}
              index={1}
              onPress={() => navigateTo('fasting')}
              isDarkMode={isDarkMode}
            />
            <TrackerCard
              title="متتبع القرآن"
              description="تابع قراءتك اليومية"
              icon="book-open-page-variant"
              colors={['#c17f59', '#8a5a3d']}
              status={`${todayQuran?.pagesRead ?? 0} صفحة اليوم`}
              index={2}
              onPress={() => navigateTo('quran')}
              isDarkMode={isDarkMode}
            />
          </View>
        </Animated.View>

        {/* نصيحة اليوم */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <GlassCard style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#f5a623" />
              <Text style={[styles.tipTitle, isDarkMode && styles.textLight]}>نصيحة اليوم</Text>
            </View>
            <Text style={[styles.tipText, isDarkMode && styles.textMuted]}>
              "من صلى البردين دخل الجنة" - حافظ على صلاة الفجر والعصر في وقتهما
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#11151c',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,128,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  // إحصائيات
  statsContainer: {
    paddingHorizontal: 15,
    gap: 12,
  },
  statCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  statCardDark: {
    backgroundColor: '#1a1a2e',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Medium',
    color: '#666',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 2,
  },
  // أفعال سريعة
  quickActionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  quickActionDark: {
    backgroundColor: '#1a1a2e',
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: 'Cairo-Medium',
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
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
  // متتبعات
  trackersContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  trackerCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  trackerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackerIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  trackerTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  trackerDescription: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  trackerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Cairo-Medium',
    color: '#fff',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    lineHeight: 22,
  },
  bottomSpace: {
    height: 100,
  },
});
