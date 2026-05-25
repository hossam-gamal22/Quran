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
  Modal,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import { PrayerStatus, PrayerName, DailyPrayerRecord, formatDate, getTodayDate } from '@/lib/worship-storage';
import {
  getCachedPrayerTimes,
  formatPrayerTime,
  getPrayerTranslationKey,
  PrayerTimes,
} from '@/lib/prayer-times';
import {
  getPrayerWindowState,
  type PrayerWindowState,
  type PrayerTimesMap,
} from '@/lib/prayer-availability';
import GlassCard from '@/components/ui/GlassCard';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getTranslations, getDateLocale } from '@/lib/i18n';
import { Colors, DarkColors } from '@/constants/theme';
import { trackPrayer } from '@/lib/firebase-analytics';

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
  { value: 'prayed', color: '#0d8e62', icon: 'check-circle', labelKey: 'worship.onTime' },
  { value: 'late', color: '#c07b10', icon: 'clock-alert', labelKey: 'worship.late' },
  { value: 'missed', color: '#ef5350', icon: 'close-circle', labelKey: 'worship.missed' },
  { value: 'none', color: '#8E8E93', icon: 'circle-outline', labelKey: 'worship.notRecorded' },
];

// Theme-aware amber palette for the "upcoming" / "late only" pill — readable on
// both light and dark backgrounds (passes WCAG AA against the worship card teal
// and against light app backgrounds).
const PENDING_COLOR = '#c07b10';
const PENDING_BG = 'rgba(192,123,16,0.22)';

const STATUS_CONFIG: Record<PrayerStatus, { color: string; icon: string; labelKey: string }> = {
  prayed: { color: '#0d8e62', icon: 'check-circle', labelKey: 'worship.onTime' },
  late: { color: '#c07b10', icon: 'clock-alert', labelKey: 'worship.late' },
  missed: { color: '#ef5350', icon: 'close-circle', labelKey: 'worship.missed' },
  none: { color: '#8E8E93', icon: 'circle-outline', labelKey: 'worship.notRecorded' },
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
  windowState: PrayerWindowState;
  isPastDay: boolean;
  displayDate: Date;
}

const PrayerItem: React.FC<PrayerItemProps> = ({
  prayer,
  status,
  onStatusChange,
  index,
  isDarkMode = false,
  timeString,
  windowState,
  isPastDay,
  displayDate,
}) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const [menuOpen, setMenuOpen] = useState(false);
  const scale = useSharedValue(1);
  const config = STATUS_CONFIG[status];

  // Past days are always fully editable. For today: dropdown is open unless the
  // prayer is `upcoming` (adhan hasn't fired yet).
  const isInteractive = isPastDay || windowState !== 'upcoming';
  const isUpcoming = !isPastDay && windowState === 'upcoming';

  // Filter the dropdown options based on the smart window state:
  // - onTime: full list (prayed / late / missed / none)
  // - lateOnly: late + missed + none (no on-time option past the 60-min mark)
  // - expired: late + missed + none (auto-missed already applied; user can still
  //   correct via dropdown until end of day per spec)
  // - past day: full list
  // Always show full list (prayed / late / missed / none) so the user can
  // freely correct any prayer's status. The smart window state only affects
  // the visual hint (amber pill) — never restricts the dropdown choices.
  const availableOptions = isInteractive ? STATUS_OPTIONS : [];

  // Pill foreground/background:
  // - upcoming → amber "غير متاح بعد" pill
  // - lateOnly + not yet recorded → amber "متأخر فقط" pill
  // - everything else → status-driven
  const isLateOnlyUnrecorded = !isPastDay && windowState === 'lateOnly' && status === 'none';
  const useAmber = isUpcoming || isLateOnlyUnrecorded;
  const pillColor = useAmber ? PENDING_COLOR : config.color;
  const pillBg = useAmber ? PENDING_BG : `${config.color}20`;
  const pillIcon = isUpcoming ? 'clock-outline' : (isLateOnlyUnrecorded ? 'clock-alert' : config.icon);
  const pillLabel = isUpcoming
    ? t('worship.notYetAvailable')
    : (isLateOnlyUnrecorded ? t('worship.lateOnly') : t(config.labelKey));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!isInteractive) {
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
          { backgroundColor: colors.card },
          { borderLeftColor: isRTL ? undefined : pillColor, borderLeftWidth: isRTL ? 0 : 4, borderRightColor: isRTL ? pillColor : undefined, borderRightWidth: isRTL ? 4 : 0, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <View style={[styles.prayerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.prayerIconBg}>
            <MaterialCommunityIcons
              name={prayer.icon as any}
              size={24}
              color={pillColor}
            />
          </View>
          <View style={styles.prayerInfo}>
            <Text style={[styles.prayerName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t(getPrayerTranslationKey(prayer.key, displayDate))}
            </Text>
            <Text style={[styles.prayerTime, { color: colors.textLight }]}>
              {timeString || '--:--'}
            </Text>
          </View>
        </View>
        
        <View style={styles.prayerRight}>
          <View style={[styles.statusBadge, { backgroundColor: pillBg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons
              name={pillIcon as any}
              size={18}
              color={pillColor}
            />
            <Text style={[styles.statusText, { color: pillColor }]}>
              {pillLabel}
            </Text>
            {isInteractive && (
              <MaterialCommunityIcons
                name={menuOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={pillColor}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* القائمة المنسدلة */}
      {menuOpen && isInteractive && (
        <View style={[styles.dropdownMenu, { backgroundColor: colors.modalSurface }]}>
          {availableOptions.map(opt => (
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
  const styles = useScaledStyles(_styles, colors.fs);
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
        { backgroundColor: colors.surface },
        isToday && styles.weekDayToday,
        isSelected && !isToday && styles.weekDaySelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[
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
      <View style={[styles.weekDayProgress, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? colors.surface : '#eee' }]}>
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
  const savingPrayerRef = useRef<Set<string>>(new Set());
  
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  const isSelectedToday = useMemo(() => {
    return selectedDate.toDateString() === new Date().toDateString();
  }, [selectedDate]);

  const selectedDateStr = useMemo(() => {
    return formatDate(selectedDate);
  }, [selectedDate]);

  // جلب مواقيت الصلاة الحقيقية من الكاش + سجل الفجر التاريخي
  useEffect(() => {
    const loadTimes = async () => {
      const today = getTodayDate();
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

  // تحديد حالة نافذة الصلاة الذكية — فقط لليوم الحالي
  const getWindowState = useCallback((prayerKey: PrayerName): PrayerWindowState => {
    if (!isSelectedToday) return 'onTime'; // الأيام السابقة: تحرير كامل
    if (!prayerTimes) return 'onTime';
    const times: PrayerTimesMap = {
      fajr: prayerTimes.fajr,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      isha: prayerTimes.isha,
    };
    return getPrayerWindowState(prayerKey as any, times);
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
    // Prevent double-tap: skip if this prayer is already being saved
    const key = `${selectedDateStr}_${prayer}`;
    if (savingPrayerRef.current.has(key)) return;
    savingPrayerRef.current.add(key);

    try {
      // تسجيل إحصائيات الصلاة في Firebase عند تسجيل صلاة
      if (status === 'prayed' || status === 'late') {
        trackPrayer(prayer, status === 'prayed').catch(() => {});
      }

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
    } finally {
      savingPrayerRef.current.delete(key);
    }
  };

  // البحث عن سجل يوم معين
  const getRecordForDate = (date: Date): DailyPrayerRecord | undefined => {
    const dateStr = formatDate(date);
    return weekPrayers.find(r => r.date === dateStr);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
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
            colors={['#0d8e62']}
            tintColor="#0d8e62"
          />
        }
      >
        {/* بطاقة التقدم */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <View
            style={[styles.progressCard, { backgroundColor: 'rgba(6,79,47,0.85)' }]}
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
                windowState={getWindowState(prayer.key)}
                isPastDay={!isSelectedToday}
                displayDate={selectedDate}
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
                <MaterialCommunityIcons name="check-all" size={24} color="#0d8e62" />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {prayerStats?.prayedOnTime ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>
                  {t('worship.onTime')}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock-alert" size={24} color="#c07b10" />
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
                <MaterialCommunityIcons name="weather-sunset-up" size={22} color="#0d8e62" />
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
                        { backgroundColor: colors.card },
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
    lineHeight: 34,
    includeFontPadding: false,
  },
  progressDate: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 30,
    includeFontPadding: false,
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
    lineHeight: 38,
    includeFontPadding: false,
  },
  progressStatLabel: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    lineHeight: 20,
    includeFontPadding: false,
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
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
    lineHeight: 30,
    includeFontPadding: false,
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
    backgroundColor: '#0d8e6220',
  },
  returnTodayText: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    color: '#0d8e62',
    lineHeight: 20,
    includeFontPadding: false,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    paddingHorizontal: 20,
    marginTop: -8,
    marginBottom: 12,
    lineHeight: 20,
    includeFontPadding: false,
  },
  weekContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  weekDay: {
    width: 60,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  weekDayDark: {
    backgroundColor: DarkColors.surface,
  },
  weekDayToday: {
    backgroundColor: '#0d8e62',
  },
  weekDaySelected: {
    backgroundColor: '#0d8e6240',
    borderColor: '#0d8e62',
    borderWidth: 1.5,
  },
  weekDayName: {
    fontSize: 10,
    fontFamily: fontMedium(),
    lineHeight: 16,
    includeFontPadding: false,
  },
  weekDayNumber: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginVertical: 4,
    lineHeight: 30,
    includeFontPadding: false,
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
    backgroundColor: '#0d8e62',
    borderRadius: 2,
  },
  weekDayProgressComplete: {
    backgroundColor: '#0d8e62',
  },
  weekDayCount: {
    fontSize: 10,
    fontFamily: fontMedium(),
    marginTop: 6,
    lineHeight: 16,
    includeFontPadding: false,
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  prayerItemDark: {
    backgroundColor: DarkColors.surface,
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
    lineHeight: 28,
    includeFontPadding: false,
  },
  prayerTime: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 20,
    includeFontPadding: false,
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
    lineHeight: 20,
    includeFontPadding: false,
  },
  // dropdown
  dropdownMenu: {
    marginHorizontal: 4,
    marginTop: -4,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderTopWidth: 0,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  dropdownMenuDark: {
    backgroundColor: DarkColors.surface,
    borderColor: 'rgba(255,255,255,0.10)',
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
    lineHeight: 26,
    includeFontPadding: false,
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
  statValue: {
    fontSize: 20,
    fontFamily: fontBold(),
    lineHeight: 34,
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: fontRegular(),
    lineHeight: 18,
    includeFontPadding: false,
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
    lineHeight: 20,
    includeFontPadding: false,
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
    lineHeight: 20,
    includeFontPadding: false,
  },
  fajrDate: {
    fontSize: 13,
    fontFamily: fontMedium(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  fajrTime: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    flex: 1,
    textAlign: 'center',
    lineHeight: 26,
    includeFontPadding: false,
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
    lineHeight: 18,
    includeFontPadding: false,
  },
  bottomSpace: {
    height: 100,
  },
});
const styles = _styles;
