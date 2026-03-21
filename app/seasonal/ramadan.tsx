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
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
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
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { getHijriDate, hijriToGregorian } from '@/lib/hijri-date';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
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

const RAMADAN_COLOR = '#22C55E';
const RAMADAN_GRADIENT = ['#22C55E', '#1d4a3a'];

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
  { id: 'fasting', icon: 'food-off', labelKey: 'ramadan.fasting' as const, color: '#22C55E' },
  { id: 'fajr', icon: 'weather-sunset-up', labelKey: 'ramadan.fajrPrayer' as const, color: '#5d4e8c' },
  { id: 'quran', icon: 'book-open-variant', labelKey: 'ramadan.quranReading' as const, color: '#3a7ca5' },
  { id: 'tarawih', icon: 'mosque', labelKey: 'ramadan.tarawih' as const, color: '#c17f59' },
  { id: 'azkar', icon: 'hand-heart', labelKey: 'ramadan.adhkar' as const, color: '#f5a623' },
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

const DayCalendar: React.FC<DayCalendarProps> = ({
  currentDay,
  completedDays,
  onDayPress,
  isDarkMode,
}) => {
  const colors = useColors();
  const isRTL = useIsRTL();
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
                  { color: colors.text },
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
              {ODD_NIGHTS.includes(day) && (
                <MaterialCommunityIcons
                  name="star"
                  size={10}
                  color="#f5a623"
                  style={[styles.specialStar, isRTL ? { left: 2, right: undefined } : null]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[styles.calendarLegend, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.legendDot, { backgroundColor: RAMADAN_COLOR }]} />
          <Text style={[styles.legendText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('ramadan.completed')}</Text>
        </View>
        <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.legendDot, { backgroundColor: '#f5a623' }]} />
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
  const isRTL = useIsRTL();
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400)}>
      <TouchableOpacity
        style={[
          styles.checklistItem,
          isDarkMode && styles.checklistItemDark,
          isChecked && styles.checklistItemChecked,
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
        <Text style={[styles.checklistLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t(item.labelKey)}
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
  const colors = useColors();
  const isRTL = useIsRTL();
  const isArabicLang = getLanguage() === 'ar';
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
        <Text style={[styles.duaTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t(dua.titleKey)}</Text>
        {isArabicLang ? (
          <Text style={[styles.duaPreview, { color: colors.textLight, textAlign: 'right', writingDirection: 'rtl' }]} numberOfLines={2}>
            {dua.arabic}
          </Text>
        ) : (
          <TranslatedText style={[styles.duaPreview, { color: colors.textLight }]} numberOfLines={2}>
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
  return (
    <View style={[styles.statsCard, isDarkMode && styles.statsCardDark]}>
      <View style={styles.statsIconBg}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.statsValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statsUnit, { color: colors.textLight }]}>{unit}</Text>
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
  const language = getLanguage();
  const isArabic = language === 'ar';
  const { currentSeason, specialDay, refreshSeasonalData } = useSeasonal();
  const { seasonalProgress, markDayCompleted, updateProgress } = useSeasonalProgress();

  // CMS data with hardcoded fallback
  const { duas: ramadanDuas, checklist: dailyChecklistItems } = useSeasonalCMS<RamadanDua, ChecklistItem>('ramadan', RAMADAN_DUAS, DAILY_CHECKLIST);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDua, setSelectedDua] = useState<RamadanDua | null>(null);
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
      const allChecked = dailyChecklistItems.every((item) => newState[item.id]);
      if (allChecked && !completedDays.includes(currentDay)) {
        markDayCompleted(currentDay);
      }

      return newState;
    });
  }, [seasonalProgress, updateProgress, completedDays, currentDay, markDayCompleted]);

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }, { backgroundColor: `${RAMADAN_GRADIENT[0]}CC` }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('ramadan.blessedRamadan')}</Text>
          {isRamadanActive && (
            <Text style={styles.headerSubtitle}>
              {currentDay} {t('ramadan.ofThirty')}
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
            <View style={styles.starAboveCardWrapper}>
              <View style={styles.starAboveCard}>
                <MaterialCommunityIcons name="star-four-points" size={24} color="#f5a623" />
              </View>
              <View
                style={[styles.specialDayBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }, { backgroundColor: 'rgba(245,166,35,0.15)' }]}
              >
                <View style={styles.specialDayContent}>
                  <Text style={[styles.specialDayTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{getLanguage() === 'ar' ? specialDay.nameAr : (specialDay.nameEn || specialDay.nameAr)}</Text>
                  {isArabic ? (
                    <Text style={[styles.specialDayDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{specialDay.description}</Text>
                  ) : (
                    <TranslatedText style={[styles.specialDayDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{specialDay.description}</TranslatedText>
                  )}
                  {specialDay.virtues && specialDay.virtues.length > 0 && (
                    <View style={{ marginTop: 8, gap: 4 }}>
                      {specialDay.virtues.map((virtue, idx) => (
                        <View key={idx} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialCommunityIcons name="check-circle" size={14} color="#f5a623" />
                          {isArabic ? (
                            <Text style={{ fontSize: 13, fontFamily: fontRegular(), color: colors.textLight, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>{virtue}</Text>
                          ) : (
                            <TranslatedText style={{ fontSize: 13, fontFamily: fontRegular(), color: colors.textLight, flex: 1, textAlign: isRTL ? 'right' : 'left' }}>{virtue}</TranslatedText>
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
          <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <StatsCard
              icon="food-off"
              label={t('ramadan.fastingDays')}
              value={stats.fasting}
              unit={t('ramadan.dayUnit')}
              color="#22C55E"
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
              label={t('ramadan.khatmaProgress')}
              value={stats.khatmaProgress}
              unit="%"
              color="#5d4e8c"
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
          <View style={[styles.checklistContainer, isDarkMode && styles.checklistContainerDark]}>
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
          <View style={[styles.tipCard, isDarkMode && styles.tipCardDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color="#f5a623" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('ramadan.dailyTip')}</Text>
              <Text style={[styles.tipText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
            style={[styles.duaModal, isDarkMode && styles.duaModalDark]}
          >
            <View style={[styles.duaModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.duaModalTitle, { color: colors.text }]}>
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
              <Text style={[styles.duaModalArabic, { color: colors.text, writingDirection: 'rtl' }]}>
                {selectedDua?.arabic}
              </Text>
            ) : (
              <TranslatedText style={[styles.duaModalArabic, { color: colors.text }]}>
                {selectedDua?.arabic || ''}
              </TranslatedText>
            )}
            <Text style={[styles.duaModalTranslation, { color: colors.textLight }]}>
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
    fontFamily: fontBold(),
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
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
    color: '#333',
  },
  specialDayDesc: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: '#666',
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
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
    fontFamily: fontBold(),
    color: '#333',
  },
  statsUnit: {
    fontSize: 11,
    fontFamily: fontRegular(),
    color: '#999',
  },
  statsLabel: {
    fontSize: 10,
    fontFamily: fontMedium(),
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
    fontFamily: fontMedium(),
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
    fontFamily: fontMedium(),
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
    fontFamily: fontBold(),
    color: '#333',
    marginBottom: 6,
  },
  duaPreview: {
    fontSize: 12,
    fontFamily: fontRegular(),
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
    fontFamily: fontBold(),
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    fontFamily: fontRegular(),
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
    fontFamily: fontBold(),
    color: '#333',
  },
  duaModalArabic: {
    fontSize: 22,
    fontFamily: fontBold(),
    color: '#333',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 16,
  },
  duaModalTranslation: {
    fontSize: 14,
    fontFamily: fontRegular(),
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
    fontFamily: fontBold(),
    color: '#fff',
  },

  bottomSpace: {
    height: 100,
  },
});
