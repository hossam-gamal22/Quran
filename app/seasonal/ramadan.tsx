// app/seasonal/ramadan.tsx
// صفحة موسم رمضان - روح المسلم

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useSeasonal, useSeasonalProgress } from '@/contexts/SeasonalContext';
import { getHijriDate, hijriToGregorian } from '@/lib/hijri-date';
import { useSettings } from '@/contexts/SettingsContext';
import GlassCard from '@/components/ui/GlassCard';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ========================================
// الثوابت
// ========================================

const RAMADAN_COLOR = '#2f7659';
const RAMADAN_GRADIENT = ['#2f7659', '#1d4a3a'];

const RAMADAN_DUAS = [
  {
    id: 'iftar',
    title: 'دعاء الإفطار',
    arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ',
    translation: 'The thirst has gone, the veins are moistened and the reward is confirmed, if Allah wills.',
  },
  {
    id: 'laylat_qadr',
    title: 'دعاء ليلة القدر',
    arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
    translation: 'O Allah, You are Forgiving and love forgiveness, so forgive me.',
  },
  {
    id: 'suhoor',
    title: 'دعاء السحور',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ بِرَحْمَتِكَ الَّتِي وَسِعَتْ كُلَّ شَيْءٍ أَنْ تَغْفِرَ لِي',
    translation: 'O Allah, I ask You by Your mercy which encompasses all things, to forgive me.',
  },
  {
    id: 'quran',
    title: 'دعاء ختم القرآن',
    arabic: 'اللَّهُمَّ ارْحَمْنِي بِالْقُرْآنِ وَاجْعَلْهُ لِي إِمَامًا وَنُورًا وَهُدًى وَرَحْمَةً',
    translation: 'O Allah, have mercy on me through the Quran, and make it for me a guide, light, guidance and mercy.',
  },
];

const DAILY_CHECKLIST = [
  { id: 'fasting', icon: 'food-off', label: 'الصيام', color: '#2f7659' },
  { id: 'fajr', icon: 'weather-sunset-up', label: 'صلاة الفجر', color: '#5d4e8c' },
  { id: 'quran', icon: 'book-open-variant', label: 'قراءة القرآن', color: '#3a7ca5' },
  { id: 'tarawih', icon: 'mosque', label: 'صلاة التراويح', color: '#c17f59' },
  { id: 'azkar', icon: 'hand-heart', label: 'الأذكار', color: '#f5a623' },
  { id: 'sadaqa', icon: 'hand-coin', label: 'الصدقة', color: '#e91e63' },
];

const LAST_TEN_NIGHTS = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
const ODD_NIGHTS = [21, 23, 25, 27, 29];

// ========================================
// مكونات فرعية
// ========================================

interface DayCalendarProps {
  currentDay: number;
  completedDays: number[];
  onDayPress: (day: number) => void;
  isDarkMode: boolean;
}

const DayCalendar: React.FC<DayCalendarProps> = ({
  currentDay,
  completedDays,
  onDayPress,
  isDarkMode,
}) => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarGrid}>
        {days.map((day) => {
          const isCompleted = completedDays.includes(day);
          const isCurrent = day === currentDay;
          const isLastTen = LAST_TEN_NIGHTS.includes(day);
          const isOdd = ODD_NIGHTS.includes(day);
          const isPast = day < currentDay;
          const isFuture = day > currentDay;

          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.calendarDay,
                isDarkMode && styles.calendarDayDark,
                isCompleted && styles.calendarDayCompleted,
                isCurrent && styles.calendarDayCurrent,
                isLastTen && styles.calendarDayLastTen,
                isOdd && isLastTen && styles.calendarDayOdd,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDayPress(day);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.calendarDayText,
                  isDarkMode && styles.textLight,
                  isCompleted && styles.calendarDayTextCompleted,
                  isCurrent && styles.calendarDayTextCurrent,
                  isFuture && styles.calendarDayTextFuture,
                ]}
              >
                {day}
              </Text>
              {isCompleted && (
                <View style={styles.completedDot}>
                  <MaterialCommunityIcons name="check" size={10} color="#fff" />
                </View>
              )}
              {day === 27 && (
                <MaterialCommunityIcons
                  name="star"
                  size={10}
                  color="#f5a623"
                  style={styles.specialStar}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.calendarLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: RAMADAN_COLOR }]} />
          <Text style={[styles.legendText, isDarkMode && styles.textMuted]}>مكتمل</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f5a623' }]} />
          <Text style={[styles.legendText, isDarkMode && styles.textMuted]}>العشر الأواخر</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#e91e63' }]} />
          <Text style={[styles.legendText, isDarkMode && styles.textMuted]}>الليالي الوترية</Text>
        </View>
      </View>
    </View>
  );
};

interface ChecklistItemProps {
  item: typeof DAILY_CHECKLIST[0];
  isChecked: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
  index: number;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  isChecked,
  onToggle,
  isDarkMode,
  index,
}) => {
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400)}>
      <TouchableOpacity
        style={[
          styles.checklistItem,
          isDarkMode && styles.checklistItemDark,
          isChecked && styles.checklistItemChecked,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.checklistIcon}>
          <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
        </View>
        <Text style={[styles.checklistLabel, isDarkMode && styles.textLight]}>
          {item.label}
        </Text>
        <View
          style={[
            styles.checkbox,
            isChecked && { backgroundColor: item.color, borderColor: item.color },
          ]}
        >
          {isChecked && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface DuaCardProps {
  dua: typeof RAMADAN_DUAS[0];
  onPress: () => void;
  isDarkMode: boolean;
  index: number;
}

const DuaCard: React.FC<DuaCardProps> = ({ dua, onPress, isDarkMode, index }) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={styles.duaCardContainer}
    >
      <TouchableOpacity
        style={[styles.duaCard, isDarkMode && styles.duaCardDark]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.duaIconContainer}>
          <MaterialCommunityIcons name="hands-pray" size={24} color={RAMADAN_COLOR} />
        </View>
        <Text style={[styles.duaTitle, isDarkMode && styles.textLight]}>{dua.title}</Text>
        <Text style={[styles.duaPreview, isDarkMode && styles.textMuted]} numberOfLines={2}>
          {dua.arabic}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface StatsCardProps {
  icon: string;
  label: string;
  value: number;
  unit: string;
  color: string;
  isDarkMode: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value, unit, color, isDarkMode }) => {
  return (
    <View style={[styles.statsCard, isDarkMode && styles.statsCardDark]}>
      <View style={styles.statsIconBg}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.statsValue, isDarkMode && styles.textLight]}>{value}</Text>
      <Text style={[styles.statsUnit, isDarkMode && styles.textMuted]}>{unit}</Text>
      <Text style={[styles.statsLabel, isDarkMode && styles.textMuted]}>{label}</Text>
    </View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function RamadanScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const { currentSeason, specialDay, refreshSeasonalData } = useSeasonal();
  const { seasonalProgress, markDayCompleted, updateProgress } = useSeasonalProgress();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDua, setSelectedDua] = useState<typeof RAMADAN_DUAS[0] | null>(null);
  const [dailyChecklist, setDailyChecklist] = useState<{ [key: string]: boolean }>({});

  const isRamadanActive = currentSeason?.type === 'ramadan';
  const currentDay = currentSeason?.currentDay || 1;
  const completedDays = seasonalProgress?.completedDays || [];

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const progress = seasonalProgress?.stats || {
      fastingDays: 0,
      prayerCount: 0,
      quranPages: 0,
      azkarCount: 0,
    };
    return {
      fasting: progress.fastingDays,
      prayers: progress.prayerCount,
      quranPages: progress.quranPages,
      khatmaProgress: Math.round((progress.quranPages / 604) * 100),
    };
  }, [seasonalProgress]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshSeasonalData();
    setIsRefreshing(false);
  }, [refreshSeasonalData]);

  const handleDayPress = useCallback((day: number) => {
    // If clicked day is in or before currentDay, mark complete
    if (day <= currentDay && !completedDays.includes(day)) {
      markDayCompleted(day);
    }

    // Navigate to Hijri calendar showing the selected Hijri day
    try {
      const hijriNow = getHijriDate();
      const year = hijriNow.year;
      const month = 9; // Ramadan
      const gDate = hijriToGregorian(year, month, day);
      // send ISO string as query param
      router.push(`/hijri?date=${encodeURIComponent(gDate.toISOString())}`);
    } catch (e) {
      // fallback: just open hijri screen
      router.push('/hijri');
    }
  }, [currentDay, completedDays, markDayCompleted]);

  const handleChecklistToggle = useCallback((itemId: string) => {
    setDailyChecklist((prev) => {
      const newState = { ...prev, [itemId]: !prev[itemId] };

      // تحديث الإحصائيات
      if (itemId === 'fasting' && newState[itemId]) {
        updateProgress({ fastingDays: (seasonalProgress?.stats.fastingDays || 0) + 1 });
      }
      if (itemId === 'quran' && newState[itemId]) {
        updateProgress({ quranPages: (seasonalProgress?.stats.quranPages || 0) + 20 });
      }

      // التحقق من اكتمال اليوم
      const allChecked = DAILY_CHECKLIST.every((item) => newState[item.id]);
      if (allChecked && !completedDays.includes(currentDay)) {
        markDayCompleted(currentDay);
      }

      return newState;
    });
  }, [seasonalProgress, updateProgress, completedDays, currentDay, markDayCompleted]);

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: `${RAMADAN_GRADIENT[0]}CC` }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>رمضان المبارك</Text>
          {isRamadanActive && (
            <Text style={styles.headerSubtitle}>
              {currentDay} من 30
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#fff" />
        </TouchableOpacity>

        {/* زخرفة */}
        <MaterialCommunityIcons
          name="moon-waning-crescent"
          size={100}
          color="rgba(255,255,255,0.1)"
          style={styles.headerDecoration}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
            colors={[RAMADAN_COLOR]}
          />
        }
      >
        {/* بطاقة اليوم المميز */}
        {specialDay && isRamadanActive && (
          <Animated.View entering={FadeIn.duration(500)}>
            <View
              style={[styles.specialDayBanner, { backgroundColor: 'rgba(245,166,35,0.15)' }]}
            >
              <MaterialCommunityIcons name="star-four-points" size={24} color="#f5a623" />
              <View style={styles.specialDayContent}>
                <Text style={styles.specialDayTitle}>{specialDay.nameAr}</Text>
                <Text style={styles.specialDayDesc}>{specialDay.description}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* الإحصائيات */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>إحصائياتك</Text>
          <View style={styles.statsGrid}>
            <StatsCard
              icon="food-off"
              label="الصيام"
              value={stats.fasting}
              unit="يوم"
              color="#2f7659"
              isDarkMode={isDarkMode}
            />
            <StatsCard
              icon="book-open-variant"
              label="القرآن"
              value={stats.quranPages}
              unit="صفحة"
              color="#3a7ca5"
              isDarkMode={isDarkMode}
            />
            <StatsCard
              icon="percent"
              label="الختمة"
              value={stats.khatmaProgress}
              unit="%"
              color="#5d4e8c"
              isDarkMode={isDarkMode}
            />
            <StatsCard
              icon="mosque"
              label="الصلوات"
              value={stats.prayers}
              unit="صلاة"
              color="#c17f59"
              isDarkMode={isDarkMode}
            />
          </View>
        </Animated.View>

        {/* قائمة المهام اليومية */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
            مهام اليوم {currentDay}
          </Text>
          <View style={[styles.checklistContainer, isDarkMode && styles.checklistContainerDark]}>
            {DAILY_CHECKLIST.map((item, index) => (
              <ChecklistItem
                key={item.id}
                item={item}
                isChecked={dailyChecklist[item.id] || false}
                onToggle={() => handleChecklistToggle(item.id)}
                isDarkMode={isDarkMode}
                index={index}
              />
            ))}
          </View>
        </Animated.View>

        {/* تقويم الشهر */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>تقويم رمضان</Text>
          <View style={[styles.calendarCard, isDarkMode && styles.calendarCardDark]}>
            <DayCalendar
              currentDay={currentDay}
              completedDays={completedDays}
              onDayPress={handleDayPress}
              isDarkMode={isDarkMode}
            />
          </View>
        </Animated.View>

        {/* أدعية رمضان */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>أدعية رمضانية</Text>
          <View style={styles.duasGrid}>
            {RAMADAN_DUAS.map((dua, index) => (
              <DuaCard
                key={dua.id}
                dua={dua}
                onPress={() => setSelectedDua(dua)}
                isDarkMode={isDarkMode}
                index={index}
              />
            ))}
          </View>
        </Animated.View>

        {/* نصائح */}
        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <View style={[styles.tipCard, isDarkMode && styles.tipCardDark]}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#f5a623" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, isDarkMode && styles.textLight]}>نصيحة اليوم</Text>
              <Text style={[styles.tipText, isDarkMode && styles.textMuted]}>
                احرص على قراءة جزء من القرآن يومياً لتختم القرآن في رمضان. 
                الجزء الواحد يتكون من 20 صفحة تقريباً.
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Modal للدعاء */}
      <Modal
        visible={selectedDua !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDua(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedDua(null)}
        >
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.duaModal, isDarkMode && styles.duaModalDark]}
          >
            <View style={styles.duaModalHeader}>
              <Text style={[styles.duaModalTitle, isDarkMode && styles.textLight]}>
                {selectedDua?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDua(null)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={isDarkMode ? '#fff' : '#333'}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.duaModalArabic, isDarkMode && styles.textLight]}>
              {selectedDua?.arabic}
            </Text>
            <Text style={[styles.duaModalTranslation, isDarkMode && styles.textMuted]}>
              {selectedDua?.translation}
            </Text>
            <TouchableOpacity style={styles.duaModalButton}>
              <MaterialCommunityIcons name="content-copy" size={20} color="#fff" />
              <Text style={styles.duaModalButtonText}>نسخ الدعاء</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 10,
    overflow: 'hidden',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDecoration: {
    position: 'absolute',
    top: -20,
    left: -20,
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
    padding: 16,
  },

  // بطاقة اليوم المميز
  specialDayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  specialDayContent: {
    flex: 1,
  },
  specialDayTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  specialDayDesc: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },

  // الإحصائيات
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statsCard: {
    width: (width - 44) / 4,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    margin: 6,
    alignItems: 'center',
  },
  statsCardDark: {
    backgroundColor: '#1a1a2e',
  },
  statsIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  statsUnit: {
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
    color: '#999',
  },
  statsLabel: {
    fontSize: 10,
    fontFamily: 'Cairo-Medium',
    color: '#666',
    marginTop: 4,
  },

  // قائمة المهام
  checklistContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  checklistContainerDark: {
    backgroundColor: '#1a1a2e',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checklistItemDark: {
    borderBottomColor: '#2a2a3e',
  },
  checklistItemChecked: {
    backgroundColor: '#f0fff4',
  },
  checklistIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Cairo-Medium',
    color: '#333',
    marginHorizontal: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // التقويم
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  calendarCardDark: {
    backgroundColor: '#1a1a2e',
  },
  calendarContainer: {},
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarDayDark: {},
  calendarDayCompleted: {
    backgroundColor: `${RAMADAN_COLOR}20`,
    borderRadius: 8,
  },
  calendarDayCurrent: {
    backgroundColor: RAMADAN_COLOR,
    borderRadius: 8,
  },
  calendarDayLastTen: {
    borderWidth: 1,
    borderColor: '#f5a623',
    borderRadius: 8,
  },
  calendarDayOdd: {
    borderColor: '#e91e63',
    borderWidth: 2,
  },
  calendarDayText: {
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    color: '#333',
  },
  calendarDayTextCompleted: {
    color: RAMADAN_COLOR,
  },
  calendarDayTextCurrent: {
    color: '#fff',
  },
  calendarDayTextFuture: {
    color: '#999',
  },
  completedDot: {
    position: 'absolute',
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: RAMADAN_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialStar: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },

  // الأدعية
  duasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  duaCardContainer: {
    width: '50%',
    padding: 6,
  },
  duaCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    minHeight: 140,
  },
  duaCardDark: {
    backgroundColor: '#1a1a2e',
  },
  duaIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${RAMADAN_COLOR}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  duaTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginBottom: 6,
  },
  duaPreview: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    lineHeight: 20,
  },

  // النصيحة
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#fff8e1',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  tipCardDark: {
    backgroundColor: '#2a2a1e',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    lineHeight: 22,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  duaModal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  duaModalDark: {
    backgroundColor: '#1a1a2e',
  },
  duaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  duaModalTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  duaModalArabic: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 16,
  },
  duaModalTranslation: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  duaModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RAMADAN_COLOR,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  duaModalButtonText: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },

  bottomSpace: {
    height: 100,
  },
});
