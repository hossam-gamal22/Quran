// app/seasonal/ramadan.tsx
// صفحة موسم رمضان - روح المسلم

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { getHijriDate, hijriToGregorian } from '@/lib/hijri-date';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import GlassCard from '@/components/ui/GlassCard';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getLanguage } from '@/lib/i18n';
import TranslatedText from '@/components/ui/TranslatedText';
import { useSeasonalCMS } from '@/lib/content-api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ========================================
// الثوابت
// ========================================

const RAMADAN_COLOR = '#0d8e62';
const RAMADAN_GRADIENT = ['#0d8e62', '#1d4a3a'];

const RAMADAN_DUAS = [
  {
    id: 'iftar',
    titleKey: 'ramadan.iftarDua' as const,
    arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ',
    translation: 'The thirst has gone, the veins are moistened and the reward is confirmed, if Allah wills.',
  },
  {
    id: 'laylat_qadr',
    titleKey: 'ramadan.laylatQadrDua' as const,
    arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
    translation: 'O Allah, You are Forgiving and love forgiveness, so forgive me.',
  },
  {
    id: 'suhoor',
    titleKey: 'ramadan.suhoorDua' as const,
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ بِرَحْمَتِكَ الَّتِي وَسِعَتْ كُلَّ شَيْءٍ أَنْ تَغْفِرَ لِي',
    translation: 'O Allah, I ask You by Your mercy which encompasses all things, to forgive me.',
  },
  {
    id: 'quran',
    titleKey: 'ramadan.quranCompletionDua' as const,
    arabic: 'اللَّهُمَّ ارْحَمْنِي بِالْقُرْآنِ وَاجْعَلْهُ لِي إِمَامًا وَنُورًا وَهُدًى وَرَحْمَةً',
    translation: 'O Allah, have mercy on me through the Quran, and make it for me a guide, light, guidance and mercy.',
  },
];

const DAILY_CHECKLIST = [
  { id: 'fasting', icon: 'food-off', labelKey: 'ramadan.fasting' as const, color: '#0d8e62' },
  { id: 'fajr', icon: 'weather-sunset-up', labelKey: 'ramadan.fajrPrayer' as const, color: '#4a3d73' },
  { id: 'quran', icon: 'book-open-variant', labelKey: 'ramadan.quranReading' as const, color: '#3a7ca5' },
  { id: 'tarawih', icon: 'mosque', labelKey: 'ramadan.tarawih' as const, color: '#c17f59' },
  { id: 'azkar', icon: 'hand-heart', labelKey: 'ramadan.adhkar' as const, color: '#c07b10' },
  { id: 'sadaqa', icon: 'hand-coin', labelKey: 'ramadan.charity' as const, color: '#e91e63' },
];

const LAST_TEN_NIGHTS = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
const ODD_NIGHTS = [21, 23, 25, 27, 29];

type RamadanDua = typeof RAMADAN_DUAS[number];
type ChecklistItem = typeof DAILY_CHECKLIST[number];

// ========================================
// مكونات فرعية
// ========================================

interface DayCalendarProps {
  currentDay: number;
  completedDays: number[];
  onDayPress: (day: number) => void;
  isDarkMode: boolean;
}

// Weekday names (Saturday-first for Islamic calendar)
const WEEKDAY_NAMES_AR = ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
const WEEKDAY_NAMES_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const DayCalendar: React.FC<DayCalendarProps> = ({
  currentDay,
  completedDays,
  onDayPress,
  isDarkMode,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const language = getLanguage();
  const weekdays = language === 'ar' ? WEEKDAY_NAMES_AR : WEEKDAY_NAMES_EN;
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  // Calculate what weekday Ramadan 1 falls on
  const startDayOffset = useMemo(() => {
    try {
      const hijri = getHijriDate();
      const ramadan1 = hijriToGregorian(hijri.year, 9, 1);
      // getDay(): 0=Sun,1=Mon,...,6=Sat -> convert to Sat-first: Sat=0,Sun=1,...,Fri=6
      const jsDay = ramadan1.getDay(); // 0-6 Sun-Sat
      return jsDay === 6 ? 0 : jsDay + 1; // Convert to Sat-first index
    } catch {
      return 0;
    }
  }, []);

  // Build full grid rows (7 per row) for proper RTL rendering
  const calendarRows = useMemo(() => {
    const rows: (number | null)[][] = [];
    const allCells: (number | null)[] = [];
    // Add empty cells for offset
    for (let i = 0; i < startDayOffset; i++) allCells.push(null);
    // Add actual days
    for (let d = 1; d <= 30; d++) allCells.push(d);
    // Pad last row to 7
    while (allCells.length % 7 !== 0) allCells.push(null);
    // Split into rows of 7
    for (let i = 0; i < allCells.length; i += 7) {
      rows.push(allCells.slice(i, i + 7));
    }
    return rows;
  }, [startDayOffset]);

  return (
    <View style={styles.calendarContainer}>
      {/* Weekday headers */}
      <View style={[styles.calendarRow, isRTL && { flexDirection: 'row-reverse' }]}>
        {weekdays.map((name, i) => (
          <View key={`header-${i}`} style={styles.calendarDay}>
            <Text style={[styles.calendarWeekdayText, { color: colors.textLight }]}>{name}</Text>
          </View>
        ))}
      </View>
      {/* Calendar rows */}
      {calendarRows.map((row, rowIdx) => (
        <View key={`row-${rowIdx}`} style={[styles.calendarRow, isRTL && { flexDirection: 'row-reverse' }]}>
          {row.map((day, colIdx) => {
            if (day === null) return <View key={`empty-${rowIdx}-${colIdx}`} style={styles.calendarDay} />;
            const isCompleted = completedDays.includes(day);
            const isCurrent = day === currentDay;
            const isLastTen = LAST_TEN_NIGHTS.includes(day);
            const isOdd = ODD_NIGHTS.includes(day);
            const isFuture = day > currentDay;
            return (
            <TouchableOpacity
              key={day}
              style={[
                styles.calendarDay,
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
                  { color: colors.text },
                  isCompleted && styles.calendarDayTextCompleted,
                  isCurrent && styles.calendarDayTextCurrent,
                  isFuture && { color: colors.textLight },
                ]}
              >
                {day}
              </Text>
              {isCompleted && (
                <View style={styles.completedDot}>
                  <MaterialCommunityIcons name="check" size={10} color="#fff" />
                </View>
              )}
              {ODD_NIGHTS.includes(day) && (
                <MaterialCommunityIcons
                  name="star"
                  size={10}
                  color="#c07b10"
                  style={[styles.specialStar, isRTL ? { left: 2, right: undefined } : null]}
                />
              )}
            </TouchableOpacity>
          );
          })}
        </View>
      ))}
      <View style={[styles.calendarLegend, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.legendDot, { backgroundColor: RAMADAN_COLOR }]} />
          <Text style={[styles.legendText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('ramadan.completed')}</Text>
        </View>
        <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.legendDot, { backgroundColor: '#c07b10' }]} />
          <Text style={[styles.legendText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('ramadan.lastTenNights')}</Text>
        </View>
        <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.legendDot, { backgroundColor: '#e91e63' }]} />
          <Text style={[styles.legendText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('ramadan.oddNights')}</Text>
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400)}>
      <TouchableOpacity
        style={[
          styles.checklistItem,
          { borderBottomColor: colors.border },
          isChecked && { backgroundColor: isDarkMode ? 'rgba(13,142,98,0.12)' : '#f0fff4' },
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
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
        <Text style={[styles.checklistLabel, { color: isChecked && !isDarkMode ? '#1B5E20' : colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t(item.labelKey)}
        </Text>
        <View
          style={[
            styles.checkbox,
            { borderColor: colors.border },
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const isArabicLang = getLanguage() === 'ar';
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={styles.duaCardContainer}
    >
      <TouchableOpacity
        style={[styles.duaCard, { backgroundColor: colors.card }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.duaIconContainer}>
          <MaterialCommunityIcons name="hands-pray" size={24} color={RAMADAN_COLOR} />
        </View>
        <Text style={[styles.duaTitle, { color: colors.text, textAlign: 'center' }]}>{t(dua.titleKey)}</Text>
        {isArabicLang ? (
          <Text style={[styles.duaPreview, { color: colors.textLight, textAlign: 'center', writingDirection: 'rtl' }]} numberOfLines={2}>
            {dua.arabic}
          </Text>
        ) : (
          <TranslatedText style={[styles.duaPreview, { color: colors.textLight, textAlign: 'center' }]} numberOfLines={2}>
            {dua.arabic}
          </TranslatedText>
        )}
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  return (
    <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statsIconBg, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statsValueRow}>
        <Text style={[styles.statsValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statsUnit, { color: colors.textLight }]}>{unit}</Text>
      </View>
      <Text style={[styles.statsLabel, { color: colors.textLight }]}>{label}</Text>
    </View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function RamadanScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const language = getLanguage();
  const isArabic = language === 'ar';
  const insets = useSafeAreaInsets();
  const { currentSeason, specialDay, refreshSeasonalData } = useSeasonal();
  const { seasonalProgress, markDayCompleted, updateProgress } = useSeasonalProgress();

  // CMS data with hardcoded fallback
  const { duas: ramadanDuas, checklist: dailyChecklistItems } = useSeasonalCMS<RamadanDua, ChecklistItem>('ramadan', RAMADAN_DUAS, DAILY_CHECKLIST);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDua, setSelectedDua] = useState<RamadanDua | null>(null);
  const [dailyChecklist, setDailyChecklist] = useState<{ [key: string]: boolean }>({});

  const isRamadanActive = currentSeason?.type === 'ramadan';

  // Determine the effective current day:
  // - During Ramadan: use actual current day from season
  // - After Ramadan (Hijri month > 9): all 30 days are past
  // - Before Ramadan (Hijri month < 9): none started yet
  const currentDay = useMemo(() => {
    if (isRamadanActive && currentSeason?.currentDay) return currentSeason.currentDay;
    try {
      const hijri = getHijriDate();
      if (hijri.month > 9) return 30; // Ramadan has passed
      if (hijri.month < 9) return 0;  // Ramadan hasn't started
      return 1; // fallback
    } catch {
      return 1;
    }
  }, [isRamadanActive, currentSeason?.currentDay]);

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
      const allChecked = dailyChecklistItems.every((item) => newState[item.id]);
      if (allChecked && !completedDays.includes(currentDay)) {
        markDayCompleted(currentDay);
      }

      return newState;
    });
  }, [seasonalProgress, updateProgress, completedDays, currentDay, markDayCompleted]);

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('ramadan.blessedRamadan')}</Text>
          {isRamadanActive && (
            <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
              {currentDay} {t('ramadan.ofThirty')}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.text} />
        </TouchableOpacity>
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
            <View style={styles.starAboveCardWrapper}>
              <View style={styles.starAboveCard}>
                <MaterialCommunityIcons name="star-four-points" size={24} color="#c07b10" />
              </View>
              <View
                style={[styles.specialDayBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }, { backgroundColor: 'rgba(245,166,35,0.15)' }]}
              >
                <View style={styles.specialDayContent}>
                  <Text style={[styles.specialDayTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{getLanguage() === 'ar' ? specialDay.nameAr : (specialDay.nameEn || specialDay.nameAr)}</Text>
                  {isArabic ? (
                    <Text style={[styles.specialDayDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{specialDay.description}</Text>
                  ) : (
                    <TranslatedText style={[styles.specialDayDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{specialDay.description}</TranslatedText>
                  )}
                  {specialDay.virtues && specialDay.virtues.length > 0 && (
                    <View style={{ marginTop: 8, gap: 4 }}>
                      {specialDay.virtues.map((virtue, idx) => (
                        <View key={idx} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialCommunityIcons name="check-circle" size={14} color="#c07b10" />
                          {isArabic ? (
                            <Text style={{ fontSize: colors.fs(13), fontFamily: fontRegular(), color: colors.textLight, flex: 1, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>{virtue}</Text>
                          ) : (
                            <TranslatedText style={{ fontSize: colors.fs(13), fontFamily: fontRegular(), color: colors.textLight, flex: 1, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }}>{virtue}</TranslatedText>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* الإحصائيات */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('ramadan.yourStats')}</Text>
          <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <StatsCard
              icon="food-off"
              label={t('ramadan.fastingDays')}
              value={stats.fasting}
              unit={t('ramadan.dayUnit')}
              color="#0d8e62"
              isDarkMode={isDarkMode}
            />
            <StatsCard
              icon="book-open-variant"
              label={t('ramadan.quranPages')}
              value={stats.quranPages}
              unit={t('ramadan.pageUnit')}
              color="#3a7ca5"
              isDarkMode={isDarkMode}
            />
            <StatsCard
              icon="percent"
              label={'النسبة المئوية'}
              value={stats.khatmaProgress}
              unit="%"
              color="#4a3d73"
              isDarkMode={isDarkMode}
            />
            <StatsCard
              icon="mosque"
              label={t('ramadan.prayers')}
              value={stats.prayers}
              unit={t('ramadan.prayerUnit')}
              color="#c17f59"
              isDarkMode={isDarkMode}
            />
          </View>
        </Animated.View>

        {/* قائمة المهام اليومية */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('ramadan.dailyTasks')} {currentDay}
          </Text>
          <View style={[styles.checklistContainer, { backgroundColor: colors.card }]}>
            {dailyChecklistItems.map((item, index) => (
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
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('ramadan.ramadanCalendar')}</Text>
          <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
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
          <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('ramadan.ramadanDuas')}</Text>
          <View style={styles.duasGrid}>
            {ramadanDuas.map((dua, index) => (
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
          <View style={[styles.tipCard, { backgroundColor: isDarkMode ? 'rgba(192,123,16,0.12)' : '#fff8e1', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#c07b10" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: isDarkMode ? colors.text : '#5D4037', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('ramadan.dailyTip')}</Text>
              <Text style={[styles.tipText, { color: isDarkMode ? colors.textLight : 'rgba(93,64,55,0.75)', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('ramadan.dailyTipText')}
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
            style={[styles.duaModal, { backgroundColor: colors.card }]}
          >
            <View style={[styles.duaModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.duaModalTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {selectedDua ? t(selectedDua.titleKey) : ''}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDua(null)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
            {isArabic ? (
              <Text style={[styles.duaModalArabic, { color: colors.text, textAlign: 'right', writingDirection: 'rtl' }]}>
                {selectedDua?.arabic}
              </Text>
            ) : (
              <TranslatedText style={[styles.duaModalArabic, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {selectedDua?.arabic || ''}
              </TranslatedText>
            )}
            <Text style={[styles.duaModalTranslation, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {selectedDua?.translation}
            </Text>
            <TouchableOpacity style={[styles.duaModalButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="content-copy" size={20} color="#fff" />
              <Text style={styles.duaModalButtonText}>{t('ramadan.copyDua')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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
  headerWrapper: {},
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(13,142,98,0.15)',
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
    overflow: 'visible',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fontBold(),
    lineHeight: 34,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    lineHeight: 20,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDecoration: {
    position: 'absolute',
    top: -10,
    left: -10,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // بطاقة اليوم المميز
  starAboveCardWrapper: {
    marginTop: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  starAboveCard: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245,166,35,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -20,
    zIndex: 1,
  },
  specialDayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    paddingTop: 28,
    gap: 12,
  },
  specialDayContent: {
    flex: 1,
  },
  specialDayTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
  },
  specialDayDesc: {
    fontSize: 13,
    fontFamily: fontRegular(),
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
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
    width: (width - 56) / 2,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statsIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statsValueRow: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statsValue: {
    fontSize: 28,
    fontFamily: fontBold(),
  },
  statsUnit: {
    fontSize: 13,
    fontFamily: fontMedium(),
  },
  statsLabel: {
    fontSize: 11,
    fontFamily: fontMedium(),
    marginTop: 4,
  },

  // قائمة المهام
  checklistContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  checklistItemChecked: {
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
    fontFamily: fontMedium(),
    marginHorizontal: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // التقويم
  calendarCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarContainer: {},
  calendarRow: {
    flexDirection: 'row',
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
    borderColor: '#c07b10',
    borderRadius: 8,
  },
  calendarDayOdd: {
    borderColor: '#e91e63',
    borderWidth: 2,
  },
  calendarWeekdayText: {
    fontSize: 11,
    fontFamily: fontMedium(),
    textAlign: 'center',
  },
  calendarDayText: {
    fontSize: 14,
    fontFamily: fontMedium(),
  },
  calendarDayTextCompleted: {
    color: RAMADAN_COLOR,
  },
  calendarDayTextCurrent: {
    color: '#fff',
  },
  calendarDayTextFuture: {},
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
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontFamily: fontRegular(),
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
    borderRadius: 16,
    padding: 16,
    minHeight: 150,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  duaIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: `${RAMADAN_COLOR}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  duaTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
    marginBottom: 6,
    textAlign: 'center',
  },
  duaPreview: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    textAlign: 'center',
  },

  // النصيحة
  tipCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    fontFamily: fontRegular(),
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
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  duaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  duaModalTitle: {
    fontSize: 20,
    fontFamily: fontBold(),
  },
  duaModalArabic: {
    fontSize: 22,
    fontFamily: fontBold(),
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 16,
  },
  duaModalTranslation: {
    fontSize: 14,
    fontFamily: fontRegular(),
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
    fontFamily: fontBold(),
    color: '#fff',
  },

  bottomSpace: {
    height: 100,
  },
});
