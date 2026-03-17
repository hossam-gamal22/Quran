// app/worship-tracker/azkar.tsx
// صفحة متتبع الأذكار - روح المسلم

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useAzkarTracker } from '@/contexts/WorshipContext';
import { useSettings } from '@/contexts/SettingsContext';
import { DailyAzkarRecord, getAllAzkarRecords } from '@/lib/worship-storage';
import GlassCard from '@/components/ui/GlassCard';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getDateLocale } from '@/lib/i18n';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const AZKAR_TYPES: { key: keyof Omit<DailyAzkarRecord, 'date'>; icon: string; color: string; labelKey: string }[] = [
  { key: 'morning', icon: 'weather-sunset-up', color: '#f5a623', labelKey: 'azkar.morning' },
  { key: 'evening', icon: 'weather-sunset-down', color: '#5d4e8c', labelKey: 'azkar.evening' },
  { key: 'sleep', icon: 'weather-night', color: '#1a237e', labelKey: 'azkar.sleep' },
  { key: 'wakeup', icon: 'white-balance-sunny', color: '#e65100', labelKey: 'azkar.wakeup' },
  { key: 'afterPrayer', icon: 'mosque', color: '#2f7659', labelKey: 'azkar.afterPrayer' },
];

// ========================================
// مكونات فرعية
// ========================================

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 160,
  strokeWidth = 12,
  color = '#2f7659',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function AzkarTrackerScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const {
    todayAzkar,
    azkarStats,
    toggleAzkarType,
    getAzkarForDate,
  } = useAzkarTracker();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [history, setHistory] = useState<{ date: string; completed: number; total: number }[]>([]);

  const { isDarkMode, settings } = useSettings();
  const colors = useColors();

  // تحميل السجل
  useEffect(() => {
    loadHistory();
  }, [todayAzkar]);

  const loadHistory = async () => {
    const records = await getAllAzkarRecords();
    const entries = Object.entries(records)
      .map(([date, r]) => {
        const completed = [r.morning, r.evening, r.sleep, r.wakeup, r.afterPrayer].filter(Boolean).length;
        return { date, completed, total: 5 };
      })
      .filter(e => e.completed > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);
    setHistory(entries);
  };

  // حساب التقدم اليوم
  const todayCompleted = useMemo(() => {
    if (!todayAzkar) return 0;
    return [todayAzkar.morning, todayAzkar.evening, todayAzkar.sleep, todayAzkar.wakeup, todayAzkar.afterPrayer].filter(Boolean).length;
  }, [todayAzkar]);

  const todayProgress = useMemo(() => {
    return (todayCompleted / 5) * 100;
  }, [todayCompleted]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadHistory();
    setIsRefreshing(false);
  }, []);

  const handleToggle = async (type: keyof Omit<DailyAzkarRecord, 'date'>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleAzkarType(type);
  };

  // حساب البار تشارت لآخر 7 أيام
  const weekData = useMemo(() => {
    const days: { label: string; completed: number }[] = [];
    const locale = getDateLocale();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = history.find(h => h.date === dateStr);
      const dayName = d.toLocaleDateString(locale, { weekday: 'short' });
      days.push({ label: dayName, completed: entry?.completed ?? 0 });
    }
    return days;
  }, [history]);

  const maxBar = 5;

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={[styles.container, { backgroundColor: settings.display.appBackground === 'none' ? (isDarkMode ? '#11151c' : '#fff') : 'transparent' }]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <UniversalHeader
          title={t('azkar.title')}
          titleColor={colors.text}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/azkar' as any);
            }
          }}
          showBack
        />

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
          {/* Today's Progress */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <GlassCard style={styles.progressCard}>
              <View style={styles.progressCenter}>
                <CircularProgress progress={todayProgress} color="#2f7659">
                  <Text style={[styles.progressText, { color: colors.text }]}>
                    {todayCompleted}/5
                  </Text>
                  <Text style={[styles.progressLabel, { color: colors.textLight }]}>
                    {t('worship.todayProgress')}
                  </Text>
                </CircularProgress>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Azkar Types Checklist */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('worship.azkarTracker')}
            </Text>

            {AZKAR_TYPES.map((azkar) => {
              const isCompleted = todayAzkar?.[azkar.key] ?? false;
              return (
                <TouchableOpacity
                  key={azkar.key}
                  style={[
                    styles.azkarItem,
                    isDarkMode && styles.azkarItemDark,
                    isCompleted && { borderColor: azkar.color, borderWidth: 1.5 },
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                  onPress={() => handleToggle(azkar.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.azkarIcon, { backgroundColor: azkar.color + '22' }]}>
                    <MaterialCommunityIcons name={azkar.icon as any} size={24} color={azkar.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.azkarLabel,
                      { color: colors.text, textAlign: isRTL ? 'right' : 'left' },
                      isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 },
                    ]}>
                      {t(azkar.labelKey)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={isCompleted ? 'check-circle' : 'circle-outline'}
                    size={28}
                    color={isCompleted ? azkar.color : (isDarkMode ? '#555' : '#ccc')}
                  />
                </TouchableOpacity>
              );
            })}
          </Animated.View>

          {/* Weekly Chart */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('worship.thisWeek')}
            </Text>
            <GlassCard style={styles.chartCard}>
              <View style={[styles.chartContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {weekData.map((day, i) => (
                  <View key={i} style={styles.chartBar}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${(day.completed / maxBar) * 100}%`,
                            backgroundColor: day.completed >= 5 ? '#2f7659' : day.completed > 0 ? '#f5a623' : (isDarkMode ? '#333' : '#e0e0e0'),
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.textLight }]}>
                      {day.label}
                    </Text>
                    <Text style={[styles.barValue, { color: colors.text }]}>
                      {day.completed}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Statistics */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('worship.statistics')}
            </Text>
            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <GlassCard style={styles.statCard}>
                <MaterialCommunityIcons name="weather-sunset-up" size={24} color="#f5a623" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {azkarStats?.morningCompleted ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('azkar.morning')}
                </Text>
              </GlassCard>
              <GlassCard style={styles.statCard}>
                <MaterialCommunityIcons name="weather-sunset-down" size={24} color="#5d4e8c" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {azkarStats?.eveningCompleted ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('azkar.evening')}
                </Text>
              </GlassCard>
            </View>
            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <GlassCard style={styles.statCard}>
                <MaterialCommunityIcons name="calendar-check" size={24} color="#2f7659" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {azkarStats?.totalDays ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.totalDays')}
                </Text>
              </GlassCard>
              <GlassCard style={styles.statCard}>
                <MaterialCommunityIcons name="fire" size={24} color="#e65100" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {azkarStats?.currentStreak ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.currentStreak')}
                </Text>
              </GlassCard>
            </View>
            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <GlassCard style={styles.statCard}>
                <MaterialCommunityIcons name="trophy" size={24} color="#c17f59" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {azkarStats?.bestStreak ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.bestStreak')}
                </Text>
              </GlassCard>
              <GlassCard style={styles.statCard}>
                <MaterialCommunityIcons name="percent" size={24} color="#3a7ca5" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {Math.round(azkarStats?.completionRate ?? 0)}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.dailyAverage')}
                </Text>
              </GlassCard>
            </View>
          </Animated.View>

          {/* Recent History */}
          {history.length > 0 && (
            <Animated.View entering={FadeInDown.delay(500).duration(500)}>
              <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('worship.readingHistory')}
              </Text>
              {history.slice(0, 10).map((entry, i) => {
                const dateLocale = getDateLocale();
                const d = new Date(entry.date + 'T00:00:00');
                const formatted = d.toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric' });
                const pct = Math.round((entry.completed / entry.total) * 100);
                return (
                  <View
                    key={entry.date}
                    style={[
                      styles.historyItem,
                      isDarkMode && styles.historyItemDark,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <Text style={[styles.historyDate, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                      {formatted}
                    </Text>
                    <View style={styles.historyBar}>
                      <View style={[styles.historyBarFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? '#2f7659' : '#f5a623' }]} />
                    </View>
                    <Text style={[styles.historyValue, { color: colors.textLight }]}>
                      {entry.completed}/{entry.total}
                    </Text>
                  </View>
                );
              })}
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginTop: 20,
    marginBottom: 10,
  },
  progressCard: { padding: 24, marginBottom: 8 },
  progressCenter: { alignItems: 'center' },
  progressText: { fontSize: 32, fontFamily: fontBold() },
  progressLabel: { fontSize: 13, fontFamily: fontRegular(), marginTop: 2 },
  azkarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,128,0.2)',
    gap: 12,
  },
  azkarItemDark: {
    backgroundColor: 'rgba(120,120,128,0.18)',
    borderColor: 'rgba(120,120,128,0.25)',
  },
  azkarIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  azkarLabel: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
  },
  chartCard: { padding: 16 },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBar: { alignItems: 'center', flex: 1 },
  barContainer: {
    width: 20,
    height: 80,
    backgroundColor: 'rgba(120,120,128,0.1)',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
    minHeight: 4,
  },
  barLabel: { fontSize: 10, fontFamily: fontRegular(), marginTop: 4 },
  barValue: { fontSize: 12, fontFamily: fontBold() },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontFamily: fontBold(), marginTop: 6 },
  statLabel: { fontSize: 12, fontFamily: fontRegular(), marginTop: 2, textAlign: 'center' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(120,120,128,0.08)',
  },
  historyItemDark: {
    backgroundColor: 'rgba(120,120,128,0.14)',
  },
  historyDate: { width: 80, fontSize: 12, fontFamily: fontRegular() },
  historyBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  historyBarFill: { height: '100%', borderRadius: 4 },
  historyValue: { fontSize: 12, fontFamily: fontSemiBold(), width: 30, textAlign: 'center' },
});
