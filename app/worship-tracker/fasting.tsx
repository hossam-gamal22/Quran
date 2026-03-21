// app/worship-tracker/fasting.tsx
// صفحة متتبع الصيام - روح المسلم

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
  Alert,
} from 'react-native';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useFastingTracker } from '@/contexts/WorshipContext';
import { useSettings } from '@/contexts/SettingsContext';
import { DailyFastingRecord } from '@/lib/worship-storage';
import { getHijriDateObject, gregorianToHijri } from '@/lib/hijri-date';
import GlassCard from '@/components/ui/GlassCard';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getTranslations } from '@/lib/i18n';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const FASTING_TYPES: { key: DailyFastingRecord['type']; nameKey: string; descKey: string; color: string }[] = [
  { key: 'voluntary', nameKey: 'worship.voluntary', descKey: 'worship.voluntaryDesc', color: '#5d4e8c' },
  { key: 'ramadan', nameKey: 'worship.ramadan', descKey: 'worship.ramadanDesc', color: '#22C55E' },
  { key: 'makeup', nameKey: 'worship.makeup', descKey: 'worship.makeupDesc', color: '#c17f59' },
  { key: 'vow', nameKey: 'worship.vow', descKey: 'worship.vowDesc', color: '#3a7ca5' },
];

const SUNNAH_DAYS_KEYS = [
  { nameKey: 'worship.mondayThursday', descKey: 'worship.mondayThursdayDesc', icon: 'calendar-week' },
  { nameKey: 'worship.whiteDays', descKey: 'worship.whiteDaysDesc', icon: 'moon-full' },
  { nameKey: 'worship.dayOfArafat', descKey: 'worship.dayOfArafatDesc', icon: 'mosque' },
  { nameKey: 'worship.dayOfAshura', descKey: 'worship.dayOfAshuraDesc', icon: 'star-crescent' },
  { nameKey: 'worship.sixShawwal', descKey: 'worship.sixShawwalDesc', icon: 'numeric-6-circle' },
  { nameKey: 'worship.davidFasting', descKey: 'worship.davidFastingDesc', icon: 'swap-horizontal' },
];

// Month names are resolved via getTranslations().calendar.months at render time

// ========================================
// مكونات فرعية
// ========================================

interface FastingButtonProps {
  isFasting: boolean;
  onPress: () => void;
  isDarkMode?: boolean;
}

const FastingButton: React.FC<FastingButtonProps> = ({
  isFasting,
  onPress,
  isDarkMode = false,
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withSpring(1)
    );
    rotation.value = withSequence(
      withTiming(isFasting ? -10 : 10, { duration: 100 }),
      withSpring(0)
    );
    Haptics.notificationAsync(
      isFasting 
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success
    );
    onPress();
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
      >
        <View
          style={[styles.fastingButton, { backgroundColor: isFasting ? 'rgba(6,79,47,0.85)' : 'rgba(93,78,140,0.85)' }]}
        >
          <View style={styles.fastingButtonInner}>
            <MaterialCommunityIcons
              name={isFasting ? 'check-circle' : 'moon-waning-crescent'}
              size={64}
              color="#fff"
            />
            <Text style={styles.fastingButtonText}>
              {isFasting ? t('worship.youAreFasting') : t('worship.recordFasting')}
            </Text>
            <Text style={styles.fastingButtonSubtext}>
              {isFasting ? t('worship.tapToCancel') : t('worship.tapToRecord')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface TypeSelectorProps {
  selectedType?: DailyFastingRecord['type'];
  onSelect: (type: DailyFastingRecord['type']) => void;
  isDarkMode?: boolean;
}

const TypeSelector: React.FC<TypeSelectorProps> = ({
  selectedType,
  onSelect,
  isDarkMode = false,
}) => {
  const colors = useColors();
  const isRTL = useIsRTL();
  return (
    <View style={styles.typeSelector}>
      {FASTING_TYPES.map((type, index) => (
        <Animated.View
          key={type.key}
          entering={FadeInUp.delay(index * 50).duration(300)}
        >
          <TouchableOpacity
            style={[
              styles.typeItem,
              isDarkMode && styles.typeItemDark,
              selectedType === type.key && {
                borderColor: type.color,
                backgroundColor: `${type.color}15`,
              },
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(type.key);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.typeIndicator, { backgroundColor: type.color }]} />
            <View style={styles.typeInfo}>
              <Text style={[
                styles.typeName,
                { color: colors.text },
                selectedType === type.key && { color: type.color },
              ]}>
                {t(type.nameKey)}
              </Text>
              <Text style={[styles.typeDescription, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                {t(type.descKey)}
              </Text>
            </View>
            {selectedType === type.key && (
              <MaterialCommunityIcons name="check-circle" size={20} color={type.color} />
            )}
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
};

interface CalendarDayProps {
  day: number;
  isFasted: boolean;
  isToday: boolean;
  isRamadan?: boolean;
  onPress?: () => void;
  isDarkMode?: boolean;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  isFasted,
  isToday,
  isRamadan,
  onPress,
  isDarkMode = false,
}) => {
  const colors = useColors();
  if (day === 0) {
    return <View style={styles.calendarDayEmpty} />;
  }

  return (
    <TouchableOpacity
      style={[
        styles.calendarDay,
        isDarkMode && styles.calendarDayDark,
        isRamadan && !isFasted && !isToday && styles.calendarDayRamadan,
        isToday && styles.calendarDayToday,
        isFasted && styles.calendarDayFasted,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Text style={[
        styles.calendarDayText,
        { color: colors.text },
        isRamadan && !isFasted && !isToday && { color: '#22C55E' },
        isToday && styles.calendarDayTextToday,
        isFasted && styles.calendarDayTextFasted,
      ]}>
        {day}
      </Text>
      {isFasted && (
        <View style={styles.fastingDot} />
      )}
      {isRamadan && !isFasted && (
        <View style={[styles.fastingDot, { backgroundColor: 'rgba(6,79,47,0.4)' }]} />
      )}
    </TouchableOpacity>
  );
};

interface SunnahCardProps {
  item: typeof SUNNAH_DAYS_KEYS[0];
  index: number;
  isDarkMode?: boolean;
}

const SunnahCard: React.FC<SunnahCardProps> = ({
  item,
  index,
  isDarkMode = false,
}) => {
  const colors = useColors();
  const isRTL = useIsRTL();
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <View style={[styles.sunnahCard, isDarkMode && styles.sunnahCardDark, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.sunnahIconBg}>
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color="#5d4e8c"
          />
        </View>
        <View style={[styles.sunnahInfo]}>
          <Text style={[styles.sunnahName, { color: colors.text }]}>
            {t(item.nameKey)}
          </Text>
          <Text style={[styles.sunnahDescription, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
            {t(item.descKey)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function FastingTrackerScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const {
    todayFasting,
    fastingStats,
    toggleTodayFasting,
    toggleFastingForDate,
    getFastingForDate,
    isFastingToday,
  } = useFastingTracker();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<DailyFastingRecord['type']>(() => {
    const hijri = getHijriDateObject();
    return hijri.month === 9 ? 'ramadan' : 'voluntary';
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthFastingDays, setMonthFastingDays] = useState<number[]>([]);
  
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();

  // حساب أيام رمضان في الشهر الميلادي المعروض
  const ramadanDaysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const ramadanDays: number[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      try {
        const hijri = gregorianToHijri(new Date(year, month, day));
        if (hijri.month === 9) {
          ramadanDays.push(day);
        }
      } catch {}
    }
    return ramadanDays;
  }, [currentMonth]);

  // تحميل بيانات الصيام للشهر المعروض
  const loadMonthFastingData = useCallback(async () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const fastedDays: number[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = await getFastingForDate(dateStr);
      if (record?.fasted) {
        fastedDays.push(day);
      }
    }
    setMonthFastingDays(fastedDays);
  }, [currentMonth, getFastingForDate]);

  useEffect(() => {
    loadMonthFastingData();
  }, [loadMonthFastingData]);

  // إعادة تحميل عند تغير بيانات اليوم
  useEffect(() => {
    loadMonthFastingData();
  }, [todayFasting]);

  // حساب أيام الشهر
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: number[] = [];
    // إضافة أيام فارغة للبداية
    for (let i = 0; i < firstDay; i++) {
      days.push(0);
    }
    // إضافة أيام الشهر
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  }, [currentMonth]);

  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  // التنقل بين الأشهر
  const goToPrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const goToNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  // تحديث
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadMonthFastingData();
    setIsRefreshing(false);
  }, [loadMonthFastingData]);

  // تسجيل الصيام لليوم
  const handleToggleFasting = async () => {
    await toggleTodayFasting(selectedType);
  };

  // تسجيل/إلغاء الصيام ليوم معين من التقويم
  const handleToggleCalendarDay = async (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // لا نسمح بتسجيل أيام مستقبلية
    const dayDate = new Date(year, month, day);
    if (dayDate > new Date()) return;

    // تحقق إذا كان اليوم مسجل بالفعل — إلغاء بدون سؤال
    const existingRecord = await getFastingForDate(dateStr);
    if (existingRecord?.fasted) {
      const isToday_ = isToday(day);
      if (isToday_) {
        await toggleTodayFasting(selectedType);
      } else {
        await toggleFastingForDate(dateStr, selectedType);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadMonthFastingData();
      return;
    }

    // تحويل التاريخ لهجري لمعرفة إذا كان في رمضان
    const hijriDate = gregorianToHijri(dayDate);
    const isRamadanDay = hijriDate.month === 9;

    if (isRamadanDay) {
      // يوم رمضان — تسجيل تلقائي كصيام رمضان
      const isToday_ = isToday(day);
      if (isToday_) {
        await toggleTodayFasting('ramadan');
      } else {
        await toggleFastingForDate(dateStr, 'ramadan');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadMonthFastingData();
    } else {
      // يوم خارج رمضان — نسأل المستخدم عن نوع الصيام
      Alert.alert(
        t('worship.fastingType'),
        t('worship.whatTypeOfFasting'),
        [
          {
            text: t('worship.voluntary'),
            onPress: async () => {
              const isToday_ = isToday(day);
              if (isToday_) await toggleTodayFasting('voluntary');
              else await toggleFastingForDate(dateStr, 'voluntary');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadMonthFastingData();
            },
          },
          {
            text: t('worship.makeup'),
            onPress: async () => {
              const isToday_ = isToday(day);
              if (isToday_) await toggleTodayFasting('making_up');
              else await toggleFastingForDate(dateStr, 'making_up');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadMonthFastingData();
            },
          },
          {
            text: t('worship.vow'),
            onPress: async () => {
              const isToday_ = isToday(day);
              if (isToday_) await toggleTodayFasting('voluntary');
              else await toggleFastingForDate(dateStr, 'voluntary');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadMonthFastingData();
            },
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
        ]
      );
    }
  };

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />
      
      {/* الهيدر */}
      <UniversalHeader
        title={t('worship.fastingTracker')}
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
            colors={['#5d4e8c']}
            tintColor="#5d4e8c"
          />
        }
      >
        {/* زر الصيام الرئيسي */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <FastingButton
            isFasting={isFastingToday}
            onPress={handleToggleFasting}
            isDarkMode={isDarkMode}
          />
        </Animated.View>

        {/* نوع الصيام */}
        {!isFastingToday && (
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('worship.fastingType')}
            </Text>
            <TypeSelector
              selectedType={selectedType}
              onSelect={setSelectedType}
              isDarkMode={isDarkMode}
            />
          </Animated.View>
        )}

        {/* الإحصائيات */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <GlassCard style={styles.statsCard}>
            <Text style={[styles.statsTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('worship.yourStats')}
            </Text>
            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="calendar-check" size={24} color="#22C55E" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {fastingStats?.totalDays ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.totalDays')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="star-crescent" size={24} color="#5d4e8c" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {fastingStats?.ramadanDays ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.ramadan')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="heart" size={24} color="#c17f59" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {fastingStats?.voluntaryDays ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.voluntary')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="fire" size={24} color="#ff6b35" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {fastingStats?.currentStreak ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.currentStreak')}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* التقويم */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View style={[styles.calendarCard, isDarkMode && styles.calendarCardDark]}>
            <View style={[styles.calendarHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.calendarNav}>
                <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={28} color={isDarkMode ? '#fff' : '#333'} />
              </TouchableOpacity>
              <Text style={[styles.calendarTitle, { color: colors.text }]}>
                {getTranslations().calendar.months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNav}>
                <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={28} color={isDarkMode ? '#fff' : '#333'} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarWeekHeader}>
              {getTranslations().calendar.weekDays.map((day: string, i: number) => (
                <Text key={i} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[styles.calendarWeekDay, { color: colors.textLight }]}>
                  {day}
                </Text>
              ))}
            </View>
            
            <View style={styles.calendarGrid}>
              {calendarData.map((day, index) => {
                const isFutureDay = day > 0 && new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) > new Date();
                return (
                  <CalendarDay
                    key={index}
                    day={day}
                    isFasted={monthFastingDays.includes(day)}
                    isToday={isToday(day)}
                    isRamadan={ramadanDaysInMonth.includes(day)}
                    isDarkMode={isDarkMode}
                    onPress={day > 0 && !isFutureDay ? () => handleToggleCalendarDay(day) : undefined}
                  />
                );
              })}
            </View>
            
            <Text style={[styles.calendarHint, { color: colors.textLight }]}>
              {t('worship.tapToRecordFasting')}
            </Text>
            
            <View style={[styles.calendarLegend, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.legendDot, { backgroundColor: '#5d4e8c' }]} />
                <Text style={[styles.legendText, { color: colors.textLight }]}>{t('worship.fastingDay')}</Text>
              </View>
              <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                <Text style={[styles.legendText, { color: colors.textLight }]}>{t('calendar.today')}</Text>
              </View>
              {ramadanDaysInMonth.length > 0 && (
                <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.legendDot, { backgroundColor: 'rgba(6,79,47,0.4)', borderWidth: 1, borderColor: 'rgba(6,79,47,0.6)' }]} />
                  <Text style={[styles.legendText, { color: colors.textLight }]}>{t('worship.ramadan')}</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* أيام السنة المستحبة */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('worship.recommendedFastingDays')}
          </Text>
          <View style={styles.sunnahList}>
            {SUNNAH_DAYS_KEYS.map((item, index) => (
              <SunnahCard
                key={index}
                item={item}
                index={index}
                isDarkMode={isDarkMode}
              />
            ))}
          </View>
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
  // زر الصيام
  fastingButton: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
  },
  fastingButtonInner: {
    alignItems: 'center',
  },
  fastingButtonText: {
    fontSize: 24,
    fontFamily: fontBold(),
    color: '#fff',
    marginTop: 15,
  },
  fastingButtonSubtext: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  // نوع الصيام
  typeSelector: {
    paddingHorizontal: 16,
    gap: 10,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  typeItemDark: {
    backgroundColor: '#1a1a2e',
  },
  typeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: '#333',
  },
  typeDescription: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
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
    fontSize: 20,
    fontFamily: fontBold(),
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fontRegular(),
    color: '#666',
  },
  // التقويم
  calendarCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  calendarCardDark: {
    backgroundColor: '#1a1a2e',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  calendarNav: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#333',
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  calendarWeekDay: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fontMedium(),
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDay: {
    width: (width - 72) / 7,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calendarDayDark: {},
  calendarDayEmpty: {
    width: (width - 72) / 7,
    height: 40,
  },
  calendarDayToday: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
  },
  calendarDayFasted: {
    backgroundColor: '#5d4e8c20',
    borderRadius: 12,
  },
  calendarDayRamadan: {
    backgroundColor: 'rgba(6,79,47,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6,79,47,0.2)',
  },
  calendarDayText: {
    fontSize: 14,
    fontFamily: fontMedium(),
    color: '#333',
  },
  calendarDayTextToday: {
    color: '#fff',
  },
  calendarDayTextFasted: {
    color: '#5d4e8c',
  },
  fastingDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5d4e8c',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#666',
  },
  calendarHint: {
    fontSize: 11,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.7,
  },
  // أيام السنة
  sunnahList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  sunnahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 15,
  },
  sunnahCardDark: {
    backgroundColor: '#1a1a2e',
  },
  sunnahIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#5d4e8c15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunnahInfo: {
    flex: 1,
  },
  sunnahName: {
    fontSize: 15,
    fontFamily: fontBold(),
    color: '#333',
  },
  sunnahDescription: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  bottomSpace: {
    height: 100,
  },
});
