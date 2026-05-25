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
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useAzkarTracker } from '@/contexts/WorshipContext';
import { useSettings } from '@/contexts/SettingsContext';
import { AzkarType, getAllAzkarRecords, formatDate } from '@/lib/worship-storage';
import GlassCard from '@/components/ui/GlassCard';
import { AppIcon } from '@/components/ui/AppIcon';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getDateLocale } from '@/lib/i18n';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const AZKAR_TYPES: { key: AzkarType; icon: string; color: string; labelKey: string }[] = [
  { key: 'morning', icon: 'weather-sunset-up', color: '#F59E0B', labelKey: 'azkar.morning' },
  { key: 'evening', icon: 'weather-night', color: '#6366F1', labelKey: 'azkar.evening' },
  { key: 'sleep', icon: 'weather-night', color: '#3B82F6', labelKey: 'azkar.sleep' },
  { key: 'wakeup', icon: 'white-balance-sunny', color: '#10B981', labelKey: 'azkar.wakeup' },
  { key: 'afterPrayer', icon: '🤲', color: '#EC4899', labelKey: 'azkar.afterPrayer' },
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
  color = '#0d8e62',
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
  const styles = useScaledStyles(_styles, colors.fs);

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

  const handleToggle = async (type: AzkarType) => {
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
      const dateStr = formatDate(d);
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
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />

        {/* Header */}
        <UniversalHeader
          title={t('worship.azkarTracker')}
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
              colors={['#0d8e62']}
              tintColor="#0d8e62"
            />
          }
        >
          {/* Today's Progress */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <GlassCard style={styles.progressCard}>
              <View style={styles.progressCenter}>
                <CircularProgress progress={todayProgress} color="#0d8e62">
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
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('worship.azkarTracker')}
            </Text>

            {AZKAR_TYPES.map((azkar) => {
              const isCompleted = todayAzkar?.[azkar.key] ?? false;
              return (
                <TouchableOpacity
                  key={azkar.key}
                  style={[
                    styles.azkarItem,
                    { backgroundColor: colors.card },
                    isCompleted && { borderColor: azkar.color, borderWidth: 1.5 },
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                  onPress={() => handleToggle(azkar.key)}
                  activeOpacity={0.7}
                >
                  {Platform.OS === 'ios' && (
                    <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                  )}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                  <View style={[styles.azkarIcon, { backgroundColor: azkar.color + '22' }]}>
                    <AppIcon name={azkar.icon} size={24} color={azkar.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.azkarLabel,
                      { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                      isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 },
                    ]}>
                      {t(azkar.labelKey)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name={isCompleted ? 'check-circle' : 'circle-outline'}
                    size={28}
                    color={isCompleted ? azkar.color : colors.textLight}
                  />
                </TouchableOpacity>
              );
            })}
          </Animated.View>

          {/* Weekly Chart */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('worship.thisWeek')}
            </Text>
            <GlassCard style={styles.chartCard}>
              <View style={[styles.chartContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {weekData.map((day, i) => (
                  <View key={i} style={styles.chartBar}>
                    <View style={styles.barContainer}>
                      {Platform.OS === 'ios' && (
                        <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                      )}
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${(day.completed / maxBar) * 100}%`,
                            backgroundColor: day.completed >= 5 ? '#0d8e62' : day.completed > 0 ? '#c07b10' : (isDarkMode ? '#333' : '#e0e0e0'),
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
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('worship.statistics')}
            </Text>
            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <GlassCard style={styles.statCard}>
                <MaterialCommunityIcons name="weather-sunset-up" size={24} color="#c07b10" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {azkarStats?.morningCompleted ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('azkar.morning')}
                </Text>
              </GlassCard>
              <GlassCard style={styles.statCard}>
                <MaterialCommunityIcons name="weather-sunset-down" size={24} color="#4a3d73" />
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
                <MaterialCommunityIcons name="calendar-check" size={24} color="#0d8e62" />
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
              <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
                      { backgroundColor: colors.card },
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    {Platform.OS === 'ios' && (
                      <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                    )}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                    <Text style={[styles.historyDate, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                      {formatted}
                    </Text>
                    <View style={styles.historyBar}>
                      {Platform.OS === 'ios' && (
                        <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                      )}
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                      <View style={[styles.historyBarFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? '#0d8e62' : '#c07b10' }]} />
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

const _styles = StyleSheet.create({
  container: { flex: 1 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginTop: 20,
    marginBottom: 10,
    lineHeight: 30,
    includeFontPadding: false,
  },
  progressCard: { padding: 24, marginBottom: 8 },
  progressCenter: { alignItems: 'center' },
  progressText: { fontSize: 32, fontFamily: fontBold(), lineHeight: 50, includeFontPadding: false },
  progressLabel: { fontSize: 13, fontFamily: fontRegular(), marginTop: 2, lineHeight: 22, includeFontPadding: false },
  azkarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,120,128,0.2)',
    gap: 12,
  },
  azkarItemDark: {
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
    lineHeight: 28,
    includeFontPadding: false,
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
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
    minHeight: 4,
  },
  barLabel: { fontSize: 10, fontFamily: fontRegular(), marginTop: 4, lineHeight: 16, includeFontPadding: false },
  barValue: { fontSize: 12, fontFamily: fontBold(), lineHeight: 20, includeFontPadding: false },
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
  statValue: { fontSize: 24, fontFamily: fontBold(), marginTop: 6, lineHeight: 38, includeFontPadding: false },
  statLabel: { fontSize: 12, fontFamily: fontRegular(), marginTop: 2, textAlign: 'center', lineHeight: 20, includeFontPadding: false },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  historyItemDark: {
  },
  historyDate: { width: 80, fontSize: 12, fontFamily: fontRegular(), lineHeight: 20, includeFontPadding: false },
  historyBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  historyBarFill: { height: '100%', borderRadius: 4 },
  historyValue: { fontSize: 12, fontFamily: fontSemiBold(), width: 30, textAlign: 'center', lineHeight: 20, includeFontPadding: false },
});
const styles = _styles;
