// app/worship-tracker/prayer.tsx
// صفحة متتبع الصلاة - روح المسلم

import React, { useState, useCallback, useMemo } from 'react';
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
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { usePrayerTracker } from '@/contexts/WorshipContext';
import { PrayerStatus, PrayerName, DailyPrayerRecord } from '@/lib/worship-storage';
import GlassCard from '@/components/ui/GlassCard';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const PRAYERS: { key: PrayerName; name: string; icon: string; time: string }[] = [
  { key: 'fajr', name: 'الفجر', icon: 'weather-sunset-up', time: '٤:٣٠ ص' },
  { key: 'dhuhr', name: 'الظهر', icon: 'weather-sunny', time: '١٢:١٥ م' },
  { key: 'asr', name: 'العصر', icon: 'weather-sunny-alert', time: '٣:٤٥ م' },
  { key: 'maghrib', name: 'المغرب', icon: 'weather-sunset-down', time: '٦:٢٠ م' },
  { key: 'isha', name: 'العشاء', icon: 'weather-night', time: '٧:٥٠ م' },
];

const STATUS_CONFIG: Record<PrayerStatus, { color: string; icon: string; label: string }> = {
  prayed: { color: '#2f7659', icon: 'check-circle', label: 'في الوقت' },
  late: { color: '#f5a623', icon: 'clock-alert', label: 'متأخر' },
  missed: { color: '#ef5350', icon: 'close-circle', label: 'فائتة' },
  none: { color: '#ccc', icon: 'circle-outline', label: 'لم تسجل' },
};

const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// ========================================
// مكونات فرعية
// ========================================

interface PrayerItemProps {
  prayer: typeof PRAYERS[0];
  status: PrayerStatus;
  onStatusChange: (status: PrayerStatus) => void;
  index: number;
  isDarkMode?: boolean;
}

const PrayerItem: React.FC<PrayerItemProps> = ({
  prayer,
  status,
  onStatusChange,
  index,
  isDarkMode = false,
}) => {
  const scale = useSharedValue(1);
  const config = STATUS_CONFIG[status];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95);
    setTimeout(() => {
      scale.value = withSpring(1);
    }, 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // تدوير الحالة
    const statuses: PrayerStatus[] = ['none', 'prayed', 'late', 'missed'];
    const currentIndex = statuses.indexOf(status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    onStatusChange(statuses[nextIndex]);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      prayer.name,
      'اختر حالة الصلاة',
      [
        { text: 'في الوقت', onPress: () => onStatusChange('prayed') },
        { text: 'متأخر', onPress: () => onStatusChange('late') },
        { text: 'فائتة', onPress: () => onStatusChange('missed') },
        { text: 'إلغاء', style: 'cancel' },
      ]
    );
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 80).duration(400)}
      style={animatedStyle}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={[
          styles.prayerItem,
          isDarkMode && styles.prayerItemDark,
          { borderLeftColor: config.color, borderLeftWidth: 4 },
        ]}
      >
        <View style={styles.prayerLeft}>
          <View style={[styles.prayerIconBg, { backgroundColor: `${config.color}20` }]}>
            <MaterialCommunityIcons
              name={prayer.icon as any}
              size={24}
              color={config.color}
            />
          </View>
          <View style={styles.prayerInfo}>
            <Text style={[styles.prayerName, isDarkMode && styles.textLight]}>
              {prayer.name}
            </Text>
            <Text style={[styles.prayerTime, isDarkMode && styles.textMuted]}>
              {prayer.time}
            </Text>
          </View>
        </View>
        
        <View style={styles.prayerRight}>
          <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
            <MaterialCommunityIcons
              name={config.icon as any}
              size={18}
              color={config.color}
            />
            <Text style={[styles.statusText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface WeekDayProps {
  date: Date;
  record?: DailyPrayerRecord;
  isToday: boolean;
  onPress: () => void;
  isDarkMode?: boolean;
}

const WeekDay: React.FC<WeekDayProps> = ({
  date,
  record,
  isToday,
  onPress,
  isDarkMode = false,
}) => {
  const dayName = DAYS_AR[date.getDay()];
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
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.weekDayName,
        isDarkMode && styles.textMuted,
        isToday && styles.weekDayTextToday,
      ]}>
        {dayName}
      </Text>
      <Text style={[
        styles.weekDayNumber,
        isDarkMode && styles.textLight,
        isToday && styles.weekDayTextToday,
      ]}>
        {dayNumber}
      </Text>
      <View style={styles.weekDayProgress}>
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
        isDarkMode && styles.textMuted,
        isToday && styles.weekDayTextToday,
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
  const router = useRouter();
  const {
    todayPrayer,
    weekPrayers,
    prayerStats,
    updatePrayer,
    getWeekPrayers,
  } = usePrayerTracker();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const isDarkMode = false;

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

  // حساب الإحصائيات
  const todayProgress = useMemo(() => {
    if (!todayPrayer) return 0;
    const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayed = prayers.filter(p => todayPrayer[p] === 'prayed' || todayPrayer[p] === 'late').length;
    return (prayed / 5) * 100;
  }, [todayPrayer]);

  const todayPrayedCount = useMemo(() => {
    if (!todayPrayer) return 0;
    const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    return prayers.filter(p => todayPrayer[p] === 'prayed' || todayPrayer[p] === 'late').length;
  }, [todayPrayer]);

  // تحديث
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await getWeekPrayers();
    setIsRefreshing(false);
  }, [getWeekPrayers]);

  // تغيير حالة الصلاة
  const handleStatusChange = async (prayer: PrayerName, status: PrayerStatus) => {
    Haptics.notificationAsync(
      status === 'prayed' 
        ? Haptics.NotificationFeedbackType.Success 
        : Haptics.NotificationFeedbackType.Warning
    );
    await updatePrayer(prayer, status);
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
            name="arrow-right"
            size={24}
            color={isDarkMode ? '#fff' : '#333'}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
          متتبع الصلاة
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
            colors={['#2f7659']}
            tintColor="#2f7659"
          />
        }
      >
        {/* بطاقة التقدم */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <LinearGradient
            colors={['#2f7659', '#1d4a3a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressCard}
          >
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>تقدم اليوم</Text>
                <Text style={styles.progressDate}>
                  {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercent}>{Math.round(todayProgress)}%</Text>
              </View>
            </View>
            
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${todayProgress}%` }]} />
            </View>
            
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{todayPrayedCount}</Text>
                <Text style={styles.progressStatLabel}>صلوات اليوم</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{prayerStats?.streak ?? 0}</Text>
                <Text style={styles.progressStatLabel}>أيام متتالية</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{prayerStats?.percentage ?? 0}%</Text>
                <Text style={styles.progressStatLabel}>نسبة الالتزام</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* أيام الأسبوع */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
            هذا الأسبوع
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekContainer}
          >
            {weekDates.map((date, index) => (
              <WeekDay
                key={date.toISOString()}
                date={date}
                record={getRecordForDate(date)}
                isToday={isToday(date)}
                onPress={() => setSelectedDate(date)}
                isDarkMode={isDarkMode}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* صلوات اليوم */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
            صلوات اليوم
          </Text>
          <Text style={[styles.sectionSubtitle, isDarkMode && styles.textMuted]}>
            اضغط لتغيير الحالة • اضغط مطولاً لاختيار الحالة
          </Text>
          <View style={styles.prayersContainer}>
            {PRAYERS.map((prayer, index) => (
              <PrayerItem
                key={prayer.key}
                prayer={prayer}
                status={todayPrayer?.[prayer.key] ?? 'none'}
                onStatusChange={(status) => handleStatusChange(prayer.key, status)}
                index={index}
                isDarkMode={isDarkMode}
              />
            ))}
          </View>
        </Animated.View>

        {/* إحصائيات */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <GlassCard style={styles.statsCard}>
            <Text style={[styles.statsTitle, isDarkMode && styles.textLight]}>
              إحصائياتك
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="check-all" size={24} color="#2f7659" />
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {prayerStats?.prayedOnTime ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  في الوقت
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock-alert" size={24} color="#f5a623" />
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {prayerStats?.prayedLate ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  متأخرة
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="close-circle" size={24} color="#ef5350" />
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {prayerStats?.missed ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  فائتة
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="fire" size={24} color="#ff6b35" />
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {prayerStats?.bestStreak ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  أفضل سلسلة
                </Text>
              </View>
            </View>
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
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  progressDate: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  progressStatLabel: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  weekDayDark: {
    backgroundColor: '#1a1a2e',
  },
  weekDayToday: {
    backgroundColor: '#2f7659',
  },
  weekDayName: {
    fontSize: 10,
    fontFamily: 'Cairo-Medium',
    color: '#666',
  },
  weekDayNumber: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Medium',
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  prayerTime: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 2,
  },
  prayerRight: {},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Cairo-Medium',
  },
  // إحصائيات
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
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },
  bottomSpace: {
    height: 100,
  },
});
