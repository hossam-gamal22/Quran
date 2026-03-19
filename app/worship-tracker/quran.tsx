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
  StatusBar,
} from 'react-native';
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
import { useIsRTL } from '@/hooks/use-is-rtl';
import { getAllQuranRecords, DailyQuranRecord } from '@/lib/worship-storage';
import { t, getDateLocale } from '@/lib/i18n';

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
  const isRTL = useIsRTL();
  const progress = Math.min((pagesRead / totalPages) * 100, 100);
  const isComplete = progress >= 100;

  return (
    <View style={[styles.juzItem, isDarkMode && styles.juzItemDark]}>
      <View style={[styles.juzHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.juzNumber, { color: colors.text }]}>
          {t('worship.juzNumber')} {juzNumber}
        </Text>
        {isComplete && (
          <MaterialCommunityIcons name="check-circle" size={18} color="#2f7659" />
        )}
      </View>
      <View style={[styles.juzProgressBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
  return (
    <TouchableOpacity
      style={[
        styles.goalCard,
        isDarkMode && styles.goalCardDark,
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

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      
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
            <View style={[styles.todayProgressBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.todayProgressFill, { width: `${todayProgress}%` }]} />
            </View>
            {todayProgress >= 100 && (
              <View style={[styles.completedBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#2f7659" />
                <Text style={styles.completedText}>{t('worship.todayGoalComplete')}</Text>
              </View>
            )}
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
                  <MaterialCommunityIcons name="check-decagram" size={24} color="#2f7659" />
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
                const isToday = entry.date === new Date().toISOString().split('T')[0];
                return (
                  <View key={entry.date} style={[historyStyles.row, idx < readingHistory.length - 1 && historyStyles.rowBorder]}>
                    <View style={historyStyles.dateCol}>
                      <Text style={[historyStyles.dayName, { color: isToday ? '#c17f59' : colors.textLight }]}>
                        {isToday ? t('worship.today') : dayName}
                      </Text>
                      <Text style={[historyStyles.dateStr, { color: colors.textLight }]}>{dateStr}</Text>
                    </View>
                    <View style={historyStyles.barCol}>
                      <View style={[historyStyles.barBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <View style={[historyStyles.barFill, { width: `${barWidth}%`, backgroundColor: barWidth >= 100 ? '#2f7659' : '#c17f59' }]} />
                      </View>
                    </View>
                    <Text style={[historyStyles.pagesText, { color: entry.pages >= dailyGoal ? '#2f7659' : colors.text }]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  containerDark: {
    backgroundColor: 'transparent',
  },

  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
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
    color: '#333',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
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
  },
  progressPercent: {
    fontSize: 32,
    fontFamily: fontBold(),
    color: '#fff',
  },
  progressPages: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
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
  },
  mainStatLabel: {
    fontSize: 11,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
    color: '#333',
  },
  todayGoal: {
    fontSize: 14,
    fontFamily: fontMedium(),
    color: '#666',
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
    backgroundColor: '#2f765915',
    borderRadius: 10,
  },
  completedText: {
    fontSize: 13,
    fontFamily: fontMedium(),
    color: '#2f7659',
  },
  // إضافة سريعة
  quickAddContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  quickAddButton: {
    width: 60,
    height: 70,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  quickAddButtonDark: {
    backgroundColor: '#1a1a2e',
  },
  quickAddText: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#c17f59',
  },
  quickAddLabel: {
    fontSize: 10,
    fontFamily: fontRegular(),
    color: '#666',
  },
  // إدخال مخصص
  customInput: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 15,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  customInputDark: {
    backgroundColor: '#1a1a2e',
  },
  customInputField: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    fontFamily: fontRegular(),
    color: '#333',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    overflow: 'visible',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  goalCardDark: {
    backgroundColor: '#1a1a2e',
  },
  goalCardSelected: {
    borderColor: '#c17f59',
    backgroundColor: '#c17f5910',
  },
  goalLabel: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#333',
  },
  goalLabelSelected: {
    color: '#c17f59',
  },
  goalDescription: {
    fontSize: 11,
    fontFamily: fontRegular(),
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
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
    color: '#333',
    marginBottom: 15,
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
    color: '#333',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: fontRegular(),
    color: '#666',
    textAlign: 'center',
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
    color: '#333',
  },
  tipText: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: '#666',
    lineHeight: 22,
  },
  // الأجزاء
  juzItem: {
    width: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  juzItemDark: {
    backgroundColor: '#1a1a2e',
  },
  juzHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  juzNumber: {
    fontSize: 11,
    fontFamily: fontMedium(),
    color: '#333',
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
    backgroundColor: '#2f7659',
  },
  juzPages: {
    fontSize: 10,
    fontFamily: fontRegular(),
    color: '#666',
    marginTop: 4,
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
  },
  dateStr: {
    fontSize: 10,
    fontFamily: fontRegular(),
    marginTop: 1,
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
  },
});
