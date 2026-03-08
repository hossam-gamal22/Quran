// app/worship-tracker/fasting.tsx
// صفحة متتبع الصيام - روح المسلم

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
  I18nManager,
} from 'react-native';
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
import { getHijriDateObject } from '@/lib/hijri-date';
import GlassCard from '@/components/ui/GlassCard';

const { width } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const FASTING_TYPES: { key: DailyFastingRecord['type']; name: string; description: string; color: string }[] = [
  { key: 'voluntary', name: 'تطوع', description: 'صيام نافلة', color: '#5d4e8c' },
  { key: 'ramadan', name: 'رمضان', description: 'صيام فريضة', color: '#2f7659' },
  { key: 'makeup', name: 'قضاء', description: 'قضاء أيام', color: '#c17f59' },
  { key: 'vow', name: 'نذر', description: 'صيام نذر', color: '#3a7ca5' },
];

const SUNNAH_DAYS = [
  { name: 'الإثنين والخميس', description: 'صيام يومي الإثنين والخميس من كل أسبوع', icon: 'calendar-week' },
  { name: 'الأيام البيض', description: '13، 14، 15 من كل شهر هجري', icon: 'moon-full' },
  { name: 'يوم عرفة', description: '9 ذو الحجة لغير الحاج', icon: 'mosque' },
  { name: 'يوم عاشوراء', description: '10 محرم ويوم قبله أو بعده', icon: 'star-crescent' },
  { name: 'ست من شوال', description: '6 أيام من شهر شوال', icon: 'numeric-6-circle' },
  { name: 'صيام داود', description: 'صيام يوم وإفطار يوم', icon: 'swap-horizontal' },
];

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

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
          style={[styles.fastingButton, { backgroundColor: isFasting ? 'rgba(47,118,89,0.85)' : 'rgba(93,78,140,0.85)' }]}
        >
          <View style={styles.fastingButtonInner}>
            <MaterialCommunityIcons
              name={isFasting ? 'check-circle' : 'moon-waning-crescent'}
              size={64}
              color="#fff"
            />
            <Text style={styles.fastingButtonText}>
              {isFasting ? 'أنت صائم اليوم' : 'سجل صيامك'}
            </Text>
            <Text style={styles.fastingButtonSubtext}>
              {isFasting ? 'اضغط لإلغاء التسجيل' : 'اضغط للتسجيل'}
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
                isDarkMode && styles.textLight,
                selectedType === type.key && { color: type.color },
              ]}>
                {type.name}
              </Text>
              <Text style={[styles.typeDescription, isDarkMode && styles.textMuted]}>
                {type.description}
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
  onPress?: () => void;
  isDarkMode?: boolean;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  isFasted,
  isToday,
  onPress,
  isDarkMode = false,
}) => {
  if (day === 0) {
    return <View style={styles.calendarDayEmpty} />;
  }

  return (
    <TouchableOpacity
      style={[
        styles.calendarDay,
        isDarkMode && styles.calendarDayDark,
        isToday && styles.calendarDayToday,
        isFasted && styles.calendarDayFasted,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Text style={[
        styles.calendarDayText,
        isDarkMode && styles.textLight,
        isToday && styles.calendarDayTextToday,
        isFasted && styles.calendarDayTextFasted,
      ]}>
        {day}
      </Text>
      {isFasted && (
        <View style={styles.fastingDot} />
      )}
    </TouchableOpacity>
  );
};

interface SunnahCardProps {
  item: typeof SUNNAH_DAYS[0];
  index: number;
  isDarkMode?: boolean;
}

const SunnahCard: React.FC<SunnahCardProps> = ({
  item,
  index,
  isDarkMode = false,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <View style={[styles.sunnahCard, isDarkMode && styles.sunnahCardDark]}>
        <View style={styles.sunnahIconBg}>
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color="#5d4e8c"
          />
        </View>
        <View style={styles.sunnahInfo}>
          <Text style={[styles.sunnahName, isDarkMode && styles.textLight]}>
            {item.name}
          </Text>
          <Text style={[styles.sunnahDescription, isDarkMode && styles.textMuted]}>
            {item.description}
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
  const router = useRouter();
  const {
    todayFasting,
    fastingStats,
    toggleTodayFasting,
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
  
  const { isDarkMode } = useSettings();

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
    // تحميل بيانات الصيام للشهر
    setIsRefreshing(false);
  }, []);

  // تسجيل الصيام
  const handleToggleFasting = async () => {
    await toggleTodayFasting(selectedType);
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
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
          متتبع الصيام
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
            <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
              نوع الصيام
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
            <Text style={[styles.statsTitle, isDarkMode && styles.textLight]}>
              إحصائياتك
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="calendar-check" size={24} color="#2f7659" />
                </View>
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {fastingStats?.totalDays ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  إجمالي الأيام
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="star-crescent" size={24} color="#5d4e8c" />
                </View>
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {fastingStats?.ramadanDays ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  رمضان
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="heart" size={24} color="#c17f59" />
                </View>
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {fastingStats?.voluntaryDays ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  تطوع
                </Text>
              </View>
              <View style={styles.statItem}>
                <View style={styles.statIconBg}>
                  <MaterialCommunityIcons name="fire" size={24} color="#ff6b35" />
                </View>
                <Text style={[styles.statValue, isDarkMode && styles.textLight]}>
                  {fastingStats?.currentStreak ?? 0}
                </Text>
                <Text style={[styles.statLabel, isDarkMode && styles.textMuted]}>
                  سلسلة حالية
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* التقويم */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <View style={[styles.calendarCard, isDarkMode && styles.calendarCardDark]}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.calendarNav}>
                <MaterialCommunityIcons name="chevron-right" size={28} color={isDarkMode ? '#fff' : '#333'} />
              </TouchableOpacity>
              <Text style={[styles.calendarTitle, isDarkMode && styles.textLight]}>
                {MONTHS_AR[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNav}>
                <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={28} color={isDarkMode ? '#fff' : '#333'} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.calendarWeekHeader}>
              {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map((day, i) => (
                <Text key={i} style={[styles.calendarWeekDay, isDarkMode && styles.textMuted]}>
                  {day}
                </Text>
              ))}
            </View>
            
            <View style={styles.calendarGrid}>
              {calendarData.map((day, index) => (
                <CalendarDay
                  key={index}
                  day={day}
                  isFasted={monthFastingDays.includes(day)}
                  isToday={isToday(day)}
                  isDarkMode={isDarkMode}
                />
              ))}
            </View>
            
            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#5d4e8c' }]} />
                <Text style={[styles.legendText, isDarkMode && styles.textMuted]}>يوم صيام</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2f7659' }]} />
                <Text style={[styles.legendText, isDarkMode && styles.textMuted]}>اليوم</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* أيام السنة المستحبة */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
            أيام الصيام المستحبة
          </Text>
          <View style={styles.sunnahList}>
            {SUNNAH_DAYS.map((item, index) => (
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
    backgroundColor: 'transparent',
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
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    marginTop: 15,
  },
  fastingButtonSubtext: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
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
  },
  typeItemDark: {
    backgroundColor: '#1a1a2e',
  },
  typeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginLeft: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  typeDescription: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 2,
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
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Medium',
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
    backgroundColor: '#2f7659',
    borderRadius: 12,
  },
  calendarDayFasted: {
    backgroundColor: '#5d4e8c20',
    borderRadius: 12,
  },
  calendarDayText: {
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
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
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#666',
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
    marginLeft: 15,
  },
  sunnahName: {
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  sunnahDescription: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 2,
  },
  bottomSpace: {
    height: 100,
  },
});
