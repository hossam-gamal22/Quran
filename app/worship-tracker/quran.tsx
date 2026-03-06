// app/worship-tracker/quran.tsx
// صفحة متتبع القرآن - روح المسلم

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useQuranTracker } from '@/contexts/WorshipContext';
import { useSettings } from '@/contexts/SettingsContext';
import GlassCard from '@/components/ui/GlassCard';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const TOTAL_PAGES = 604; // إجمالي صفحات المصحف
const TOTAL_JUZS = 30;
const PAGES_PER_JUZ = Math.ceil(TOTAL_PAGES / TOTAL_JUZS);

const QUICK_ADD_OPTIONS = [1, 2, 5, 10, 20];

const READING_GOALS = [
  { pages: 1, label: 'صفحة واحدة', description: 'ختمة في سنتين' },
  { pages: 2, label: 'صفحتان', description: 'ختمة في سنة' },
  { pages: 4, label: '4 صفحات', description: 'ختمة في 5 أشهر' },
  { pages: 10, label: '10 صفحات', description: 'ختمة في شهرين' },
  { pages: 20, label: 'جزء كامل', description: 'ختمة في شهر' },
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

interface QuickAddButtonProps {
  value: number;
  onPress: () => void;
  isDarkMode?: boolean;
}

const QuickAddButton: React.FC<QuickAddButtonProps> = ({
  value,
  onPress,
  isDarkMode = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1)
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.quickAddButton, isDarkMode && styles.quickAddButtonDark]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={[styles.quickAddText, isDarkMode && styles.textLight]}>
          +{value}
        </Text>
        <Text style={[styles.quickAddLabel, isDarkMode && styles.textMuted]}>
          {value === 1 ? 'صفحة' : 'صفحات'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
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
  const progress = Math.min((pagesRead / totalPages) * 100, 100);
  const isComplete = progress >= 100;

  return (
    <View style={[styles.juzItem, isDarkMode && styles.juzItemDark]}>
      <View style={styles.juzHeader}>
        <Text style={[styles.juzNumber, isDarkMode && styles.textLight]}>
          الجزء {juzNumber}
        </Text>
        {isComplete && (
          <MaterialCommunityIcons name="check-circle" size={18} color="#2f7659" />
        )}
      </View>
      <View style={styles.juzProgressBar}>
        <View
          style={[
            styles.juzProgressFill,
            { width: `${progress}%` },
            isComplete && styles.juzProgressComplete,
          ]}
        />
      </View>
      <Text style={[styles.juzPages, isDarkMode && styles.textMuted]}>
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
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  isSelected,
  onSelect,
  isDarkMode = false,
}) => {
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
        isDarkMode && styles.textLight,
        isSelected && styles.goalLabelSelected,
      ]}>
        {goal.label}
      </Text>
      <Text style={[
        styles.goalDescription,
        isDarkMode && styles.textMuted,
        isSelected && styles.goalDescriptionSelected,
      ]}>
        {goal.description}
      </Text>
      {isSelected && (
        <View style={styles.goalCheck}>
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
  const router = useRouter();
  const {
    todayQuran,
    quranStats,
    addPagesRead,
    updateQuranRecord,
    todayPages,
  } = useQuranTracker();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customPages, setCustomPages] = useState('');
  const [dailyGoal, setDailyGoal] = useState(2);
  
  const { isDarkMode } = useSettings();

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

  // إضافة صفحات
  const handleAddPages = async (pages: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addPagesRead(pages);
  };

  const handleAddCustomPages = async () => {
    const pages = parseInt(customPages, 10);
    if (isNaN(pages) || pages <= 0) {
      Alert.alert('خطأ', 'الرجاء إدخال عدد صحيح');
      return;
    }
    await handleAddPages(pages);
    setCustomPages('');
  };

  // تعيين الهدف
  const handleSetGoal = (pages: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDailyGoal(pages);
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />
      
      {/* الهيدر */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}
            size={24}
            color={isDarkMode ? '#fff' : '#333'}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
          متتبع القرآن
        </Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

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
                    {currentKhatma.completed > 0 ? `الختمة ${currentKhatma.completed + 1}` : 'الختمة الأولى'}
                  </Text>
                  <Text style={styles.progressPercent}>
                    {Math.round(currentKhatma.progress)}%
                  </Text>
                  <Text style={styles.progressPages}>
                    {currentKhatma.current}/{TOTAL_PAGES}
                  </Text>
                </View>
              </CircularProgress>
              
              <View style={styles.mainStats}>
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatValue}>{todayPages}</Text>
                  <Text style={styles.mainStatLabel}>صفحات اليوم</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatValue}>{quranStats?.totalPages ?? 0}</Text>
                  <Text style={styles.mainStatLabel}>إجمالي الصفحات</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatValue}>{quranStats?.currentStreak ?? 0}</Text>
                  <Text style={styles.mainStatLabel}>أيام متتالية</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* تقدم اليوم */}
        <Animated.View entering={FadeInDown.delay(150).duration(500)}>
          <GlassCard style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Text style={[styles.todayTitle, isDarkMode && styles.textLight]}>
                هدف اليوم
              </Text>
              <Text style={[styles.todayGoal, isDarkMode && styles.textMuted]}>
                {todayPages}/{dailyGoal} صفحة
              </Text>
            </View>
            <View style={styles.todayProgressBar}>
              <View style={[styles.todayProgressFill, { width: `${todayProgress}%` }]} />
            </View>
            {todayProgress >= 100 && (
              <View style={styles.completedBadge}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#2f7659" />
                <Text style={styles.completedText}>أحسنت! أكملت هدف اليوم</Text>
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* إضافة سريعة */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
            إضافة صفحات
          </Text>
          <View style={styles.quickAddContainer}>
            {QUICK_ADD_OPTIONS.map((value, index) => (
              <Animated.View
                key={value}
                entering={FadeInRight.delay(index * 50).duration(300)}
              >
                <QuickAddButton
                  value={value}
                  onPress={() => handleAddPages(value)}
                  isDarkMode={isDarkMode}
                />
              </Animated.View>
            ))}
          </View>
          
          {/* إدخال مخصص */}
          <View style={[styles.customInput, isDarkMode && styles.customInputDark]}>
            <TextInput
              style={[styles.customInputField, isDarkMode && styles.textLight]}
              placeholder="عدد مخصص..."
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              keyboardType="numeric"
              value={customPages}
              onChangeText={setCustomPages}
            />
            <TouchableOpacity
              style={styles.customInputButton}
              onPress={handleAddCustomPages}
            >
              <MaterialCommunityIcons name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* اختيار الهدف اليومي */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
            الهدف اليومي
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.goalsContainer}
          >
            {READING_GOALS.map((goal, index) => (
              <GoalCard
                key={goal.pages}
                goal={goal}
                isSelected={dailyGoal === goal.pages}
                onSelect={() => handleSetGoal(goal.pages)}
                isDarkMode={isDarkMode}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* الإحصائيات */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <GlassCard style={styles.statsCard}>
            <Text style={[styles.statsTitle, isDarkMode && styles.textLight]}>
              إحصائياتك
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={24} color="#c17f59" />
                </View>
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {quranStats?.totalPages ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  إجمالي الصفحات
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="check-decagram" size={24} color="#2f7659" />
                </View>
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {quranStats?.khatmasCompleted ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  ختمات مكتملة
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="chart-line" size={24} color="#3a7ca5" />
                </View>
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {quranStats?.averagePagesPerDay?.toFixed(1) ?? '0'}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  متوسط يومي
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="fire" size={24} color="#ff6b35" />
                </View>
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {quranStats?.bestStreak ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  أفضل سلسلة
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* نصيحة */}
        <Animated.View entering={FadeInDown.delay(350).duration(500)}>
          <GlassCard style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#c17f59" />
              <Text style={[styles.tipTitle, isDarkMode && styles.textLight]}>نصيحة</Text>
            </View>
            <Text style={[styles.tipText, isDarkMode && styles.textMuted]}>
              "خيركم من تعلم القرآن وعلمه" - اجعل لك وردًا يوميًا ولو صفحة واحدة
            </Text>
          </GlassCard>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
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
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
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
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  progressPercent: {
    fontSize: 32,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  progressPages: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  mainStatLabel: {
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  todayGoal: {
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
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
    fontFamily: 'Cairo-Medium',
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
    fontFamily: 'Cairo-Bold',
    color: '#c17f59',
  },
  quickAddLabel: {
    fontSize: 10,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Regular',
    color: '#333',
    textAlign: 'right',
  },
  customInputButton: {
    width: 56,
    backgroundColor: '#c17f59',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // اختيار الهدف
  goalsContainer: {
    paddingHorizontal: 12,
    gap: 10,
  },
  goalCard: {
    width: 130,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  goalLabelSelected: {
    color: '#c17f59',
  },
  goalDescription: {
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 4,
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
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
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
    gap: 4,
  },
  juzNumber: {
    fontSize: 11,
    fontFamily: 'Cairo-Medium',
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
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 4,
  },
  bottomSpace: {
    height: 100,
  },
});
