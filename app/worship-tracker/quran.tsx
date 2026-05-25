// app/worship-tracker/quran.tsx
// صفحة متتبع القرآن - روح المسلم

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useQuranTracker } from '@/contexts/WorshipContext';
import { useSettings } from '@/contexts/SettingsContext';
import GlassCard from '@/components/ui/GlassCard';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { getAllQuranRecords, DailyQuranRecord, getTodayDate } from '@/lib/worship-storage';
import { Colors, DarkColors } from '@/constants/theme';
import { t, getDateLocale } from '@/lib/i18n';
import { uiText } from '@/lib/ui-text';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const TOTAL_PAGES = 604; // إجمالي صفحات المصحف
const TOTAL_JUZS = 30;
const PAGES_PER_JUZ = Math.ceil(TOTAL_PAGES / TOTAL_JUZS);

const READING_GOALS = [
  { pages: 1, labelKey: 'worship.onePage', descKey: 'worship.onePageTime' },
  { pages: 2, labelKey: 'worship.twoPages', descKey: 'worship.twoPagesTime' },
  { pages: 4, labelKey: 'worship.fourPages', descKey: 'worship.fourPagesTime' },
  { pages: 10, labelKey: 'worship.tenPages', descKey: 'worship.tenPagesTime' },
  { pages: 20, labelKey: 'worship.fullJuz', descKey: 'worship.fullJuzTime' },
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
  size = 180,
  strokeWidth = 12,
  color = '#c17f59',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* خلفية الدائرة */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* التقدم */}
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

interface JuzProgressProps {
  juzNumber: number;
  pagesRead: number;
  totalPages: number;
  isDarkMode?: boolean;
}

const JuzProgress: React.FC<JuzProgressProps> = ({
  juzNumber,
  pagesRead,
  totalPages,
  isDarkMode = false,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const progress = Math.min((pagesRead / totalPages) * 100, 100);
  const isComplete = progress >= 100;

  return (
    <View style={[styles.juzItem, { backgroundColor: colors.card }]}>
      <View style={[styles.juzHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.juzNumber, { color: colors.text }]}>
          {t('worship.juzNumber')} {juzNumber}
        </Text>
        {isComplete && (
          <MaterialCommunityIcons name="check-circle" size={18} color="#0d8e62" />
        )}
      </View>
      <View style={[styles.juzProgressBar, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? colors.surface : '#eee' }]}>
        <View
          style={[
            styles.juzProgressFill,
            { width: `${progress}%` },
            isComplete && styles.juzProgressComplete,
          ]}
        />
      </View>
      <Text style={[styles.juzPages, { color: colors.textLight }]}>
        {pagesRead}/{totalPages}
      </Text>
    </View>
  );
};

interface GoalCardProps {
  goal: typeof READING_GOALS[0];
  isSelected: boolean;
  onSelect: () => void;
  isDarkMode?: boolean;
  isRTL?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  isSelected,
  onSelect,
  isDarkMode = false,
  isRTL = true,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <TouchableOpacity
      style={[
        styles.goalCard,
        { backgroundColor: colors.card },
        isSelected && styles.goalCardSelected,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.goalLabel,
        { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
        isSelected && styles.goalLabelSelected,
      ]}>
        {t(goal.labelKey)}
      </Text>
      <Text style={[
        styles.goalDescription,
        { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
        isSelected && styles.goalDescriptionSelected,
      ]}>
        {t(goal.descKey)}
      </Text>
      {isSelected && (
        <View style={[styles.goalCheck, { right: isRTL ? undefined : -8, left: isRTL ? -8 : undefined }]}>
          <MaterialCommunityIcons name="check" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function QuranTrackerScreen() {
  const isRTL = useIsRTL();
  const goalsScrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const {
    todayQuran,
    quranStats,
    updateQuranRecord,
    todayPages,
  } = useQuranTracker();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(2);
  const [readingHistory, setReadingHistory] = useState<{ date: string; pages: number }[]>([]);
  
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  // تحميل سجل القراءة
  useEffect(() => {
    loadHistory();
  }, [todayPages]);

  const loadHistory = async () => {
    const records = await getAllQuranRecords();
    const entries = Object.entries(records)
      .map(([date, r]) => ({ date, pages: r.pagesRead || 0 }))
      .filter(e => e.pages > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30); // آخر 30 يوم
    setReadingHistory(entries);
  };

  // حساب التقدم
  const totalProgress = useMemo(() => {
    const total = quranStats?.totalPages ?? 0;
    return (total / TOTAL_PAGES) * 100;
  }, [quranStats]);

  const todayProgress = useMemo(() => {
    return Math.min((todayPages / dailyGoal) * 100, 100);
  }, [todayPages, dailyGoal]);

  const currentKhatma = useMemo(() => {
    const total = quranStats?.totalPages ?? 0;
    const khatmas = Math.floor(total / TOTAL_PAGES);
    const remaining = total % TOTAL_PAGES;
    return {
      completed: khatmas,
      current: remaining,
      progress: (remaining / TOTAL_PAGES) * 100,
    };
  }, [quranStats]);

  // تحديث
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(false);
  }, []);

  // تعيين الهدف
  const handleSetGoal = (pages: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDailyGoal(pages);
  };

  const setTodayPages = useCallback(async (pages: number) => {
    const nextPages = Math.max(0, Math.min(TOTAL_PAGES, pages));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateQuranRecord({ pagesRead: nextPages });
  }, [updateQuranRecord]);

  const addPages = useCallback((pages: number) => {
    setTodayPages(todayPages + pages).catch(() => {});
  }, [setTodayPages, todayPages]);

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* الهيدر */}
      <UniversalHeader
        title={t('worship.quranTracker')}
        titleColor={colors.text}
        onBack={() => router.back()}
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
            colors={['#c17f59']}
            tintColor="#c17f59"
          />
        }
      >
        {/* بطاقة التقدم الرئيسية */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View
            style={[styles.mainCard, { backgroundColor: 'rgba(193,127,89,0.85)' }]}
          >
            <View style={styles.mainCardContent}>
              <CircularProgress
                progress={currentKhatma.progress}
                size={160}
                strokeWidth={10}
                color="#fff"
              >
                <View style={styles.progressCenter}>
                  <Text style={styles.progressKhatma}>
                    {currentKhatma.completed > 0 ? `${t('worship.khatmaNumber')} ${currentKhatma.completed + 1}` : t('worship.firstKhatma')}
                  </Text>
                  <Text style={styles.progressPercent}>
                    {Math.round(currentKhatma.progress)}%
                  </Text>
                  <Text style={styles.progressPages}>
                    {currentKhatma.current}/{TOTAL_PAGES}
                  </Text>
                </View>
              </CircularProgress>
              
              <View style={[styles.mainStats, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatValue}>{todayPages}</Text>
                  <Text style={styles.mainStatLabel}>{t('worship.dailyPages')}</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatValue}>{quranStats?.totalPages ?? 0}</Text>
                  <Text style={styles.mainStatLabel}>{t('worship.totalPages')}</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatValue}>{quranStats?.currentStreak ?? 0}</Text>
                  <Text style={styles.mainStatLabel}>{t('worship.consecutiveDays')}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* تقدم اليوم */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <GlassCard style={styles.todayCard}>
            <View style={[styles.todayHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.todayTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('worship.todayGoal')}
              </Text>
              <Text style={[styles.todayGoal, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {todayPages}/{dailyGoal} {t('worship.pages')}
              </Text>
            </View>
            <View style={[styles.todayProgressBar, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? colors.surface : '#eee' }]}>
              <View style={[styles.todayProgressFill, { width: `${todayProgress}%` }]} />
            </View>
            {todayProgress >= 100 && (
              <View style={[styles.completedBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#0d8e62" />
                <Text style={styles.completedText}>{t('worship.todayGoalComplete')}</Text>
              </View>
            )}
            <View style={[styles.quickAddContainer, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 16, paddingHorizontal: 0 }]}>
              <TouchableOpacity
                style={[
                  styles.quickAddButton,
                  { backgroundColor: colors.card, opacity: todayPages <= 0 ? 0.45 : 1 },
                ]}
                onPress={() => addPages(-1)}
                disabled={todayPages <= 0}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="minus" size={20} color={todayPages <= 0 ? colors.textLight : '#c17f59'} />
                <Text style={[styles.quickAddTitle, { color: colors.text }]}>{uiText({ ar: 'تراجع', en: 'Undo' })}</Text>
                <Text style={[styles.quickAddLabel, { color: colors.textLight }]}>{uiText({ ar: 'صفحة -1', en: '-1 page' })}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAddButton, { backgroundColor: '#c17f5918', borderColor: '#c17f59' }]}
                onPress={() => addPages(1)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="book-plus" size={20} color="#c17f59" />
                <Text style={[styles.quickAddTitle, { color: '#c17f59' }]}>{uiText({ ar: 'إضافة صفحة', en: 'Add page' })}</Text>
                <Text style={[styles.quickAddLabel, { color: '#c17f59' }]}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAddButton, { backgroundColor: colors.card }]}
                onPress={() => addPages(dailyGoal)}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="target" size={20} color="#c17f59" />
                <Text style={[styles.quickAddTitle, { color: colors.text }]}>{uiText({ ar: 'إكمال الهدف', en: 'Complete goal' })}</Text>
                <Text style={[styles.quickAddLabel, { color: colors.textLight }]}>+{dailyGoal}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>

        {/* اختيار الهدف اليومي */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('worship.dailyGoal')}
          </Text>
          <ScrollView
            ref={goalsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.goalsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            style={{ overflow: 'visible' }}
            onContentSizeChange={() => {
              if (isRTL) {
                goalsScrollRef.current?.scrollToEnd({ animated: false });
              }
            }}
          >
            {READING_GOALS.map((goal, index) => (
              <GoalCard
                key={goal.pages}
                goal={goal}
                isSelected={dailyGoal === goal.pages}
                onSelect={() => handleSetGoal(goal.pages)}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* الإحصائيات */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <GlassCard style={styles.statsCard}>
            <Text style={[styles.statsTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('worship.yourStats')}
            </Text>
            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={24} color="#c17f59" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {quranStats?.totalPages ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.totalPages')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="check-decagram" size={24} color="#0d8e62" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {quranStats?.khatmasCompleted ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.completedKhatmas')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="chart-line" size={24} color="#3a7ca5" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {quranStats?.averagePagesPerDay?.toFixed(1) ?? '0'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.dailyAverage')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="fire" size={24} color="#ff6b35" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {quranStats?.bestStreak ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.bestStreak')}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* سجل القراءة اليومي */}
        {readingHistory.length > 0 && (
          <Animated.View entering={FadeInDown.delay(320).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('worship.readingHistory')}
            </Text>
            <GlassCard style={styles.statsCard}>
              {readingHistory.map((entry, idx) => {
                const dateObj = new Date(entry.date + 'T00:00:00');
                const dayName = dateObj.toLocaleDateString(getDateLocale(), { weekday: 'short' });
                const dateStr = dateObj.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short' });
                const barWidth = Math.min((entry.pages / Math.max(dailyGoal, 1)) * 100, 100);
                const isToday = entry.date === getTodayDate();
                return (
                  <View key={entry.date} style={[historyStyles.row, idx < readingHistory.length - 1 && historyStyles.rowBorder]}>
                    <View style={historyStyles.dateCol}>
                      <Text style={[historyStyles.dayName, { color: isToday ? '#c17f59' : colors.textLight }]}>
                        {isToday ? t('worship.today') : dayName}
                      </Text>
                      <Text style={[historyStyles.dateStr, { color: colors.textLight }]}>{dateStr}</Text>
                    </View>
                    <View style={historyStyles.barCol}>
                      <View style={[historyStyles.barBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)' }]}>
                        <View style={[historyStyles.barFill, { width: `${barWidth}%`, backgroundColor: barWidth >= 100 ? '#0d8e62' : '#c17f59' }]} />
                      </View>
                    </View>
                    <Text style={[historyStyles.pagesText, { color: entry.pages >= dailyGoal ? '#0d8e62' : colors.text }]}>
                      {entry.pages} {t('worship.pages')}
                    </Text>
                  </View>
                );
              })}
            </GlassCard>
          </Animated.View>
        )}

        {/* نصيحة */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <GlassCard style={styles.tipCard}>
            <View style={[styles.tipHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#c17f59" />
              <Text style={[styles.tipTitle, { color: colors.text }]}>{t('worship.tip')}</Text>
            </View>
            <Text style={[styles.tipText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('worship.tipText')}
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
    backgroundColor: 'transparent',
  },
  containerDark: {
    backgroundColor: 'transparent',
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
    marginTop: 20,
    marginBottom: 12,
    lineHeight: 30,
    includeFontPadding: false,
  },
  // البطاقة الرئيسية
  mainCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
  },
  mainCardContent: {
    alignItems: 'center',
  },
  progressCenter: {
    alignItems: 'center',
  },
  progressKhatma: {
    fontSize: 12,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    includeFontPadding: false,
  },
  progressPercent: {
    fontSize: 32,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 50,
    includeFontPadding: false,
  },
  progressPages: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
    includeFontPadding: false,
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  mainStatItem: {
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: 24,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 38,
    includeFontPadding: false,
  },
  mainStatLabel: {
    fontSize: 11,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    lineHeight: 18,
    includeFontPadding: false,
  },
  mainStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  // تقدم اليوم
  todayCard: {
    marginHorizontal: 16,
    marginTop: 15,
    padding: 20,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    lineHeight: 28,
    includeFontPadding: false,
  },
  todayGoal: {
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  todayProgressBar: {
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
    overflow: 'hidden',
  },
  todayProgressFill: {
    height: '100%',
    backgroundColor: '#c17f59',
    borderRadius: 5,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#0d8e6215',
    borderRadius: 10,
  },
  completedText: {
    fontSize: 13,
    fontFamily: fontMedium(),
    color: '#0d8e62',
    lineHeight: 22,
    includeFontPadding: false,
  },
  // إضافة سريعة
  quickAddContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  quickAddButton: {
    flex: 1,
    minHeight: 90,
    marginHorizontal: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  quickAddButtonDark: {
    backgroundColor: DarkColors.surface,
  },
  quickAddText: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#c17f59',
    lineHeight: 30,
    includeFontPadding: false,
  },
  quickAddTitle: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: fontBold(),
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
  },
  quickAddLabel: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: fontRegular(),
    lineHeight: 14,
    includeFontPadding: false,
  },
  // إدخال مخصص
  customInput: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 15,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  customInputDark: {
    backgroundColor: DarkColors.surface,
  },
  customInputField: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    fontFamily: fontRegular(),
  },
  customInputButton: {
    flexDirection: 'row',
    backgroundColor: '#c17f59',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // اختيار الهدف
  goalsContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
  },
  goalCard: {
    width: 130,
    borderRadius: 16,
    padding: 15,
    overflow: 'visible',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  goalCardDark: {
    backgroundColor: DarkColors.surface,
  },
  goalCardSelected: {
    borderColor: '#c17f59',
    backgroundColor: '#c17f5910',
  },
  goalLabel: {
    fontSize: 14,
    fontFamily: fontBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  goalLabelSelected: {
    color: '#c17f59',
  },
  goalDescription: {
    fontSize: 11,
    fontFamily: fontRegular(),
    marginTop: 4,
    textAlign: 'right',
    lineHeight: 18,
    includeFontPadding: false,
  },
  goalDescriptionSelected: {
    color: '#c17f59',
  },
  goalCheck: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#c17f59',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // الإحصائيات
  statsCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
    marginBottom: 15,
    lineHeight: 28,
    includeFontPadding: false,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: fontBold(),
    lineHeight: 30,
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: fontRegular(),
    textAlign: 'center',
    lineHeight: 16,
    includeFontPadding: false,
  },
  // نصيحة
  tipCard: {
    marginHorizontal: 16,
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
  // الأجزاء
  juzItem: {
    width: 80,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  juzItemDark: {
    backgroundColor: DarkColors.surface,
  },
  juzHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  juzNumber: {
    fontSize: 11,
    fontFamily: fontMedium(),
    lineHeight: 18,
    includeFontPadding: false,
  },
  juzProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  juzProgressFill: {
    height: '100%',
    backgroundColor: '#c17f59',
    borderRadius: 2,
  },
  juzProgressComplete: {
    backgroundColor: '#0d8e62',
  },
  juzPages: {
    fontSize: 10,
    fontFamily: fontRegular(),
    marginTop: 4,
    lineHeight: 16,
    includeFontPadding: false,
  },
  bottomSpace: {
    height: 100,
  },
});

const historyStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  dateCol: {
    width: 55,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  dateStr: {
    fontSize: 10,
    fontFamily: fontRegular(),
    marginTop: 1,
    lineHeight: 16,
    includeFontPadding: false,
  },
  barCol: {
    flex: 1,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  pagesText: {
    width: 60,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fontSemiBold(),
    lineHeight: 20,
    includeFontPadding: false,
  },
});
const styles = _styles;
