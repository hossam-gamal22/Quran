// app/worship-tracker/prayer.tsx
// صفحة متتبع الصلاة - روح المسلم

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
  Modal,
  Pressable,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
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
} from 'react-native-reanimated';

import { usePrayerTracker } from '@/contexts/WorshipContext';
import { useSettings } from '@/contexts/SettingsContext';
import { PrayerStatus, PrayerName, DailyPrayerRecord } from '@/lib/worship-storage';
import {
  getCachedPrayerTimes,
  formatPrayerTime,
  timeStringToDate,
  PrayerTimes,
} from '@/lib/prayer-times';
import GlassCard from '@/components/ui/GlassCard';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getTranslations, getDateLocale } from '@/lib/i18n';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const PRAYER_KEYS: { key: PrayerName; nameKey: string; icon: string }[] = [
  { key: 'fajr', nameKey: 'prayer.fajr', icon: 'weather-sunset-up' },
  { key: 'dhuhr', nameKey: 'prayer.dhuhr', icon: 'weather-sunny' },
  { key: 'asr', nameKey: 'prayer.asr', icon: 'weather-sunny-alert' },
  { key: 'maghrib', nameKey: 'prayer.maghrib', icon: 'weather-sunset-down' },
  { key: 'isha', nameKey: 'prayer.isha', icon: 'weather-night' },
];

const STATUS_OPTIONS: { value: PrayerStatus; color: string; icon: string; labelKey: string }[] = [
  { value: 'prayed', color: '#2f7659', icon: 'check-circle', labelKey: 'worship.onTime' },
  { value: 'late', color: '#f5a623', icon: 'clock-alert', labelKey: 'worship.late' },
  { value: 'missed', color: '#ef5350', icon: 'close-circle', labelKey: 'worship.missed' },
  { value: 'none', color: '#999', icon: 'circle-outline', labelKey: 'worship.notRecorded' },
];

const STATUS_CONFIG: Record<PrayerStatus, { color: string; icon: string; labelKey: string }> = {
  prayed: { color: '#2f7659', icon: 'check-circle', labelKey: 'worship.onTime' },
  late: { color: '#f5a623', icon: 'clock-alert', labelKey: 'worship.late' },
  missed: { color: '#ef5350', icon: 'close-circle', labelKey: 'worship.missed' },
  none: { color: '#ccc', icon: 'circle-outline', labelKey: 'worship.notRecorded' },
};

// Day names are resolved via t('calendar.weekDays') at render time

// ========================================
// مكونات فرعية
// ========================================

interface PrayerItemProps {
  prayer: typeof PRAYER_KEYS[0];
  status: PrayerStatus;
  onStatusChange: (status: PrayerStatus) => void;
  index: number;
  isDarkMode?: boolean;
  timeString?: string;
  isAvailable: boolean;
}

const PrayerItem: React.FC<PrayerItemProps> = ({
  prayer,
  status,
  onStatusChange,
  index,
  isDarkMode = false,
  timeString,
  isAvailable,
}) => {
  const colors = useColors();
  const isRTL = useIsRTL();
  const [menuOpen, setMenuOpen] = useState(false);
  const scale = useSharedValue(1);
  const config = STATUS_CONFIG[status];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!isAvailable) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    scale.value = withSpring(0.97);
    setTimeout(() => { scale.value = withSpring(1); }, 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(!menuOpen);
  };

  const selectStatus = (newStatus: PrayerStatus) => {
    Haptics.notificationAsync(
      newStatus === 'prayed'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
    onStatusChange(newStatus);
    setMenuOpen(false);
  };

  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400)}>
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={[
          styles.prayerItem,
          isDarkMode && styles.prayerItemDark,
          { borderLeftColor: isRTL ? undefined : (isAvailable ? config.color : '#555'), borderLeftWidth: isRTL ? 0 : 4, borderRightColor: isRTL ? (isAvailable ? config.color : '#555') : undefined, borderRightWidth: isRTL ? 4 : 0, flexDirection: isRTL ? 'row-reverse' : 'row' },
          !isAvailable && { opacity: 0.5 },
        ]}
      >
        <View style={[styles.prayerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.prayerIconBg}>
            <MaterialCommunityIcons
              name={prayer.icon as any}
              size={24}
              color={isAvailable ? config.color : '#999'}
            />
          </View>
          <View style={styles.prayerInfo}>
            <Text style={[styles.prayerName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t(prayer.nameKey)}
            </Text>
            <Text style={[styles.prayerTime, { color: colors.textLight }]}>
              {timeString || '--:--'}
            </Text>
          </View>
        </View>
        
        <View style={styles.prayerRight}>
          <View style={[styles.statusBadge, { backgroundColor: `${isAvailable ? config.color : '#999'}20`, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons
              name={isAvailable ? config.icon as any : 'lock-clock'}
              size={18}
              color={isAvailable ? config.color : '#999'}
            />
            <Text style={[styles.statusText, { color: isAvailable ? config.color : '#999' }]}>
              {isAvailable ? t(config.labelKey) : t('worship.notYetAvailable')}
            </Text>
            {isAvailable && (
              <MaterialCommunityIcons
                name={menuOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={config.color}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* القائمة المنسدلة */}
      {menuOpen && isAvailable && (
        <View style={[styles.dropdownMenu, isDarkMode && styles.dropdownMenuDark]}>
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dropdownItem,
                status === opt.value && { backgroundColor: `${opt.color}15` },
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => selectStatus(opt.value)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={opt.icon as any}
                size={20}
                color={opt.color}
              />
              <Text style={[styles.dropdownLabel, { color: colors.text, flex: 1 }]}>
                {t(opt.labelKey)}
              </Text>
              {status === opt.value && (
                <MaterialCommunityIcons name="check" size={18} color={opt.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
    </Animated.View>
  );
};

interface WeekDayProps {
  date: Date;
  record?: DailyPrayerRecord;
  isToday: boolean;
  isSelected: boolean;
  onPress: () => void;
  isDarkMode?: boolean;
}

const WeekDay: React.FC<WeekDayProps> = ({
  date,
  record,
  isToday,
  isSelected,
  onPress,
  isDarkMode = false,
}) => {
  const colors = useColors();
  const isRTL = useIsRTL();
  const dayName = getTranslations().calendar.weekDays[date.getDay()];
  const dayNumber = date.getDate();

  const getPrayedCount = () => {
    if (!record) return 0;
    const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    return prayers.filter(p => record[p] === 'prayed' || record[p] === 'late').length;
  };

  const prayedCount = getPrayedCount();
  const percentage = (prayedCount / 5) * 100;

  return (
    <TouchableOpacity
      style={[
        styles.weekDay,
        isDarkMode && styles.weekDayDark,
        isToday && styles.weekDayToday,
        isSelected && !isToday && styles.weekDaySelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.weekDayName,
        { color: colors.textLight },
        (isToday || isSelected) && styles.weekDayTextToday,
      ]}>
        {dayName}
      </Text>
      <Text style={[
        styles.weekDayNumber,
        { color: colors.text },
        (isToday || isSelected) && styles.weekDayTextToday,
      ]}>
        {dayNumber}
      </Text>
      <View style={[styles.weekDayProgress, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View
          style={[
            styles.weekDayProgressFill,
            { width: `${percentage}%` },
            percentage === 100 && styles.weekDayProgressComplete,
          ]}
        />
      </View>
      <Text style={[
        styles.weekDayCount,
        { color: colors.textLight },
        (isToday || isSelected) && styles.weekDayTextToday,
      ]}>
        {prayedCount}/5
      </Text>
    </TouchableOpacity>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function PrayerTrackerScreen() {
  const isRTL = useIsRTL();
  const weekScrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const {
    todayPrayer,
    weekPrayers,
    prayerStats,
    updatePrayer,
    updatePrayerWithTime,
    updatePrayerForDate,
    getPrayerForDate,
    getWeekPrayers,
    getHistoricalFajr,
  } = usePrayerTracker();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayRecord, setSelectedDayRecord] = useState<DailyPrayerRecord | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [historicalFajr, setHistoricalFajr] = useState<{ date: string; time: string; status: PrayerStatus }[]>([]);
  
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();

  const isSelectedToday = useMemo(() => {
    return selectedDate.toDateString() === new Date().toDateString();
  }, [selectedDate]);

  const selectedDateStr = useMemo(() => {
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);

  // جلب مواقيت الصلاة الحقيقية من الكاش + سجل الفجر التاريخي
  useEffect(() => {
    const loadTimes = async () => {
      const today = new Date().toISOString().split('T')[0];
      const cached = await getCachedPrayerTimes(today);
      if (cached) setPrayerTimes(cached);
      
      const fajrHistory = await getHistoricalFajr(30);
      setHistoricalFajr(fajrHistory);
    };
    loadTimes();
  }, [getHistoricalFajr]);

  // تحميل سجل اليوم المحدد
  useEffect(() => {
    if (isSelectedToday) {
      setSelectedDayRecord(todayPrayer);
    } else {
      const loadRecord = async () => {
        const record = await getPrayerForDate(selectedDateStr);
        setSelectedDayRecord(record);
      };
      loadRecord();
    }
  }, [selectedDateStr, isSelectedToday, todayPrayer, getPrayerForDate]);

  // تحديد هل الصلاة حان وقتها (أو فات) — فقط لليوم الحالي
  const isPrayerAvailable = useCallback((prayerKey: PrayerName): boolean => {
    if (!isSelectedToday) return true; // الأيام السابقة كلها متاحة
    if (!prayerTimes) return true;
    const timeStr = prayerTimes[prayerKey as keyof PrayerTimes];
    if (!timeStr) return true;
    const prayerDate = timeStringToDate(timeStr);
    return new Date() >= prayerDate;
  }, [prayerTimes, isSelectedToday]);

  // جلب وقت الصلاة المنسق
  const getPrayerTimeDisplay = useCallback((prayerKey: PrayerName): string | undefined => {
    if (!prayerTimes) return undefined;
    const timeStr = prayerTimes[prayerKey as keyof PrayerTimes];
    if (!timeStr) return undefined;
    return formatPrayerTime(timeStr, settings.prayer.show24Hour);
  }, [prayerTimes]);

  // حساب أيام الأسبوع
  const weekDates = useMemo(() => {
    const today = new Date();
    const dates: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    return dates;
  }, []);

  // حساب الإحصائيات — بناءً على اليوم المحدد
  const selectedProgress = useMemo(() => {
    if (!selectedDayRecord) return 0;
    const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayed = prayers.filter(p => selectedDayRecord[p] === 'prayed' || selectedDayRecord[p] === 'late').length;
    return (prayed / 5) * 100;
  }, [selectedDayRecord]);

  const selectedPrayedCount = useMemo(() => {
    if (!selectedDayRecord) return 0;
    const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    return prayers.filter(p => selectedDayRecord[p] === 'prayed' || selectedDayRecord[p] === 'late').length;
  }, [selectedDayRecord]);

  // تحديث
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await getWeekPrayers();
    setIsRefreshing(false);
  }, [getWeekPrayers]);

  // تغيير حالة الصلاة — يدعم اليوم الحالي والأيام السابقة
  const handleStatusChange = async (prayer: PrayerName, status: PrayerStatus) => {
    if (isSelectedToday) {
      // حفظ الحالة مع وقت الصلاة المُجدول
      const scheduledTime = prayerTimes ? prayerTimes[prayer as keyof PrayerTimes] : undefined;
      await updatePrayerWithTime(prayer, status, scheduledTime);
    } else {
      await updatePrayerForDate(selectedDateStr, prayer, status);
      // تحديث السجل المحلي مباشرة
      setSelectedDayRecord(prev => {
        if (!prev) return { date: selectedDateStr, fajr: 'none', dhuhr: 'none', asr: 'none', maghrib: 'none', isha: 'none', [prayer]: status } as DailyPrayerRecord;
        return { ...prev, [prayer]: status };
      });
    }
  };

  // البحث عن سجل يوم معين
  const getRecordForDate = (date: Date): DailyPrayerRecord | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return weekPrayers.find(r => r.date === dateStr);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
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
        title={t('worship.prayerTracker')}
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
            colors={['#2f7659']}
            tintColor="#2f7659"
          />
        }
      >
        {/* بطاقة التقدم */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View
            style={[styles.progressCard, { backgroundColor: 'rgba(47,118,89,0.85)' }]}
          >
            <View style={[styles.progressHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View>
                <Text style={styles.progressTitle}>{isSelectedToday ? t('worship.todayProgress') : t('worship.selectedDayProgress')}</Text>
                <Text style={styles.progressDate}>
                  {selectedDate.toLocaleDateString(getDateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercent}>{Math.round(selectedProgress)}%</Text>
              </View>
            </View>
            
            <View style={[styles.progressBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.progressFill, { width: `${selectedProgress}%` }]} />
            </View>
            
            <View style={[styles.progressStats, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{selectedPrayedCount}</Text>
                <Text style={styles.progressStatLabel}>{t('prayer.title')}</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{prayerStats?.streak ?? 0}</Text>
                <Text style={styles.progressStatLabel}>{t('worship.consecutiveDays')}</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{prayerStats?.percentage ?? 0}%</Text>
                <Text style={styles.progressStatLabel}>{t('worship.bestStreak')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* أيام الأسبوع */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('worship.thisWeek')}
          </Text>
          <ScrollView
            ref={weekScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.weekContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onContentSizeChange={() => {
              if (isRTL) {
                weekScrollRef.current?.scrollToEnd({ animated: false });
              }
            }}
          >
            {weekDates.map((date, index) => (
              <WeekDay
                key={date.toISOString()}
                date={date}
                record={getRecordForDate(date)}
                isToday={isToday(date)}
                isSelected={date.toDateString() === selectedDate.toDateString()}
                onPress={() => setSelectedDate(date)}
                isDarkMode={isDarkMode}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* صلوات اليوم */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View style={[styles.prayerSectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isSelectedToday ? t('worship.todaysPrayers') : `${t('prayer.title')} ${getTranslations().calendar.weekDays[selectedDate.getDay()]} ${selectedDate.getDate()}`}
            </Text>
            {!isSelectedToday && (
              <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={styles.returnTodayBtn}>
                <Text style={styles.returnTodayText}>{t('calendar.today')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('worship.tapToSelectStatus')}
          </Text>
          <View style={styles.prayersContainer}>
            {PRAYER_KEYS.map((prayer, index) => (
              <PrayerItem
                key={prayer.key}
                prayer={prayer}
                status={selectedDayRecord?.[prayer.key] ?? 'none'}
                onStatusChange={(status) => handleStatusChange(prayer.key, status)}
                index={index}
                isDarkMode={isDarkMode}
                timeString={isSelectedToday ? getPrayerTimeDisplay(prayer.key) : undefined}
                isAvailable={isPrayerAvailable(prayer.key)}
              />
            ))}
          </View>
        </Animated.View>

        {/* إحصائيات */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <GlassCard style={styles.statsCard}>
            <Text style={[styles.statsTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('worship.yourStats')}
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="check-all" size={24} color="#2f7659" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {prayerStats?.prayedOnTime ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.onTime')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock-alert" size={24} color="#f5a623" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {prayerStats?.prayedLate ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.late')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="close-circle" size={24} color="#ef5350" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {prayerStats?.missed ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.missed')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="fire" size={24} color="#ff6b35" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {prayerStats?.bestStreak ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.bestStreak')}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* مواقيت الفجر التاريخية */}
        {historicalFajr.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <GlassCard style={styles.statsCard}>
              <View style={[styles.fajrHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="weather-sunset-up" size={22} color="#2f7659" />
                <Text style={[styles.statsTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', marginBottom: 0, flex: 1 }]}>
                  {t('worship.historicalFajrTimes')}
                </Text>
              </View>
              <Text style={[styles.fajrSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('worship.last30Days')}
              </Text>
              <View style={styles.fajrList}>
                {historicalFajr.slice(0, 14).map((item, index) => {
                  const dateObj = new Date(item.date + 'T00:00:00');
                  const statusConfig = STATUS_CONFIG[item.status];
                  return (
                    <View
                      key={item.date}
                      style={[
                        styles.fajrRow,
                        isDarkMode && styles.fajrRowDark,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                        index < historicalFajr.slice(0, 14).length - 1 && styles.fajrRowBorder,
                      ]}
                    >
                      <View style={[styles.fajrDateCol, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.fajrDayName, { color: colors.textLight }]}>
                          {getTranslations().calendar.weekDays[dateObj.getDay()]}
                        </Text>
                        <Text style={[styles.fajrDate, { color: colors.text }]}>
                          {dateObj.getDate()}/{dateObj.getMonth() + 1}
                        </Text>
                      </View>
                      <Text style={[styles.fajrTime, { color: colors.text }]}>
                        {formatPrayerTime(item.time, settings.prayer.show24Hour)}
                      </Text>
                      <View style={[styles.fajrStatusBadge, { backgroundColor: `${statusConfig.color}20`, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons
                          name={statusConfig.icon as any}
                          size={14}
                          color={statusConfig.color}
                        />
                        <Text style={[styles.fajrStatusText, { color: statusConfig.color }]}>
                          {t(statusConfig.labelKey)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>
        )}

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
  // بطاقة التقدم
  progressCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 22,
    fontFamily: fontBold(),
    color: '#fff',
  },
  progressDate: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#fff',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 24,
    fontFamily: fontBold(),
    color: '#fff',
  },
  progressStatLabel: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  progressDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  // أيام الأسبوع
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#333',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  prayerSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  returnTodayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#2f765920',
  },
  returnTodayText: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    color: '#2f7659',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#666',
    paddingHorizontal: 20,
    marginTop: -8,
    marginBottom: 12,
  },
  weekContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  weekDay: {
    width: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  weekDayDark: {
    backgroundColor: '#1a1a2e',
  },
  weekDayToday: {
    backgroundColor: '#2f7659',
  },
  weekDaySelected: {
    backgroundColor: '#2f765940',
    borderColor: '#2f7659',
    borderWidth: 1.5,
  },
  weekDayName: {
    fontSize: 10,
    fontFamily: fontMedium(),
    color: '#666',
  },
  weekDayNumber: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#333',
    marginVertical: 4,
  },
  weekDayTextToday: {
    color: '#fff',
  },
  weekDayProgress: {
    width: '100%',
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  weekDayProgressFill: {
    height: '100%',
    backgroundColor: '#2f7659',
    borderRadius: 2,
  },
  weekDayProgressComplete: {
    backgroundColor: '#4caf50',
  },
  weekDayCount: {
    fontSize: 10,
    fontFamily: fontMedium(),
    color: '#666',
    marginTop: 6,
  },
  // صلوات اليوم
  prayersContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  prayerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  prayerItemDark: {
    backgroundColor: '#1a1a2e',
  },
  prayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prayerIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerInfo: {},
  prayerName: {
    fontSize: 16,
    fontFamily: fontBold(),
    color: '#333',
  },
  prayerTime: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#666',
    marginTop: 2,
  },
  prayerRight: {},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fontMedium(),
  },
  // dropdown
  dropdownMenu: {
    backgroundColor: '#fff',
    marginHorizontal: 4,
    marginTop: -4,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderTopWidth: 0,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  dropdownMenuDark: {
    backgroundColor: '#1a1a2e',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dropdownLabel: {
    fontSize: 15,
    fontFamily: fontMedium(),
  },
  // إحصائيات
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
  fajrHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  fajrSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginBottom: 12,
  },
  fajrList: {
    gap: 0,
  },
  fajrRow: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  fajrRowDark: {},
  fajrRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  fajrDateCol: {
    width: 80,
    alignItems: 'center',
    gap: 6,
  },
  fajrDayName: {
    fontSize: 12,
    fontFamily: fontRegular(),
  },
  fajrDate: {
    fontSize: 13,
    fontFamily: fontMedium(),
  },
  fajrTime: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    flex: 1,
    textAlign: 'center',
  },
  fajrStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fajrStatusText: {
    fontSize: 11,
    fontFamily: fontMedium(),
  },
  bottomSpace: {
    height: 100,
  },
});
