import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { APP_CONFIG } from '../constants/app';
import { ISLAMIC_EVENTS, gregorianToHijri, hijriToGregorian, HIJRI_MONTHS_AR } from '../lib/hijri-date';
import type { IslamicEventDetails } from '../lib/hijri-date';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIJRI_OFFSET_KEY = '@hijri_date_offset';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - Spacing.md * 2 - 12) / 7);

// ============================================
// أسماء الأشهر والأيام
// ============================================

const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

const WEEKDAYS_AR_SHORT = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

const GREGORIAN_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const GREGORIAN_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ============================================
// ألوان المناسبات
// ============================================

const EVENT_COLORS: Record<IslamicEventDetails['type'], string> = {
  holiday: '#E91E63',
  fasting: '#FF9800',
  special: '#9C27B0',
  observance: '#607D8B',
};

const EVENT_ICONS: Record<IslamicEventDetails['type'], string> = {
  holiday: 'star',
  fasting: 'restaurant-outline',
  special: 'sparkles',
  observance: 'moon',
};

// ============================================
// أنواع البيانات
// ============================================

interface CalendarDay {
  gregorianDate: Date;
  day: number;
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: IslamicEventDetails[];
}

// ============================================
// المكون الرئيسي
// ============================================

export default function HijriScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), []);

  // الحالات
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth()); // 0-based
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [showOffsetModal, setShowOffsetModal] = useState(false);
  const [hijriOffset, setHijriOffset] = useState(0);

  // ============================================
  // تحميل الإعدادات
  // ============================================

  useEffect(() => {
    AsyncStorage.getItem(HIJRI_OFFSET_KEY).then(val => {
      if (val !== null) setHijriOffset(parseInt(val, 10) || 0);
    }).catch(() => {});
  }, []);

  // Process date param
  useEffect(() => {
    if (params?.date) {
      try {
        const decoded = decodeURIComponent(params.date as string);
        const parsed = new Date(decoded);
        if (!isNaN(parsed.getTime())) {
          setDisplayYear(parsed.getFullYear());
          setDisplayMonth(parsed.getMonth());
        }
      } catch (e) {
        console.warn('Failed to parse date param:', e);
      }
    }
  }, [params?.date]);

  // ============================================
  // بناء بيانات التقويم للشهر الميلادي
  // ============================================

  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    const firstOfMonth = new Date(displayYear, displayMonth, 1);
    const startDayOfWeek = firstOfMonth.getDay(); // 0=Sunday
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();

    // Previous month trailing days
    const prevMonthDays = new Date(displayYear, displayMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(displayYear, displayMonth - 1, prevMonthDays - i);
      days.push(buildCalendarDay(d, false));
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(displayYear, displayMonth, day);
      days.push(buildCalendarDay(d, true));
    }

    // Next month leading days to fill 6 rows max
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(displayYear, displayMonth + 1, i);
        days.push(buildCalendarDay(d, false));
      }
    }

    return days;
  }, [displayYear, displayMonth, hijriOffset]);

  function buildCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
    try {
      const adjusted = new Date(date);
      if (hijriOffset !== 0) {
        adjusted.setDate(adjusted.getDate() + hijriOffset);
      }
      const hijri = gregorianToHijri(adjusted);
      const events = ISLAMIC_EVENTS.filter(
        e => e.hijriMonth === hijri.month && e.hijriDay === hijri.day
      );
      return {
        gregorianDate: date,
        day: date.getDate(),
        hijriDay: hijri.day,
        hijriMonth: hijri.month,
        hijriYear: hijri.year,
        isCurrentMonth,
        isToday: date.toDateString() === today.toDateString(),
        events,
      };
    } catch {
      return {
        gregorianDate: date,
        day: date.getDate(),
        hijriDay: 0,
        hijriMonth: 0,
        hijriYear: 0,
        isCurrentMonth,
        isToday: date.toDateString() === today.toDateString(),
        events: [],
      };
    }
  }

  // Hijri months that appear in this Gregorian month
  const hijriMonthsInView = useMemo(() => {
    const currentMonthDays = calendarDays.filter(d => d.isCurrentMonth);
    if (currentMonthDays.length === 0) return '';
    const first = currentMonthDays[0];
    const last = currentMonthDays[currentMonthDays.length - 1];
    if (first.hijriMonth === last.hijriMonth) {
      return `${HIJRI_MONTHS[first.hijriMonth - 1]} ${first.hijriYear}هـ`;
    }
    const firstYearStr = `${first.hijriYear}`;
    const lastYearStr = `${last.hijriYear}`;
    if (firstYearStr === lastYearStr) {
      return `${HIJRI_MONTHS[first.hijriMonth - 1]} - ${HIJRI_MONTHS[last.hijriMonth - 1]} ${first.hijriYear}هـ`;
    }
    return `${HIJRI_MONTHS[first.hijriMonth - 1]} ${first.hijriYear} - ${HIJRI_MONTHS[last.hijriMonth - 1]} ${last.hijriYear}هـ`;
  }, [calendarDays]);

  // Events in view for the event list
  const eventsInMonth = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<IslamicEventDetails & { gregorianDate: Date; hijriDateStr: string }> = [];
    for (const d of calendarDays) {
      if (!d.isCurrentMonth) continue;
      for (const ev of d.events) {
        const key = `${ev.hijriMonth}-${ev.hijriDay}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({
            ...ev,
            gregorianDate: d.gregorianDate,
            hijriDateStr: `${d.hijriDay} ${HIJRI_MONTHS[d.hijriMonth - 1]} ${d.hijriYear}هـ`,
          });
        }
      }
    }
    return result;
  }, [calendarDays]);

  // ============================================
  // التنقل بين الأشهر
  // ============================================

  const goToPrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(y => y - 1);
    } else {
      setDisplayMonth(m => m - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(y => y + 1);
    } else {
      setDisplayMonth(m => m + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setDisplayYear(today.getFullYear());
    setDisplayMonth(today.getMonth());
    setSelectedDay(null);
  };

  const saveOffset = async (offset: number) => {
    setHijriOffset(offset);
    try {
      await AsyncStorage.setItem(HIJRI_OFFSET_KEY, String(offset));
    } catch {}
    setShowOffsetModal(false);
  };

  // ============================================
  // المشاركة
  // ============================================

  const handleShareDay = async (day: CalendarDay) => {
    try {
      let shareText = `📅 التاريخ الهجري\n\n`;
      shareText += `📆 ${day.hijriDay} ${HIJRI_MONTHS[day.hijriMonth - 1]} ${day.hijriYear}هـ\n`;
      shareText += `📅 ${day.day} ${GREGORIAN_MONTHS[day.gregorianDate.getMonth()]} ${day.gregorianDate.getFullYear()}م\n`;
      if (day.events.length > 0) {
        shareText += `\n🎉 ${day.events.map(e => e.nameAr).join(' - ')}\n`;
      }
      shareText += `\n${APP_CONFIG.getShareSignature()}`;
      await Share.share({ message: shareText });
    } catch {}
  };

  // ============================================
  // رسم خلية اليوم
  // ============================================

  const renderDayCell = (day: CalendarDay, index: number) => {
    const isSelected = selectedDay?.gregorianDate.toDateString() === day.gregorianDate.toDateString();
    const hasEvents = day.events.length > 0;
    const opacity = day.isCurrentMonth ? 1 : 0.3;

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCell,
          day.isToday && styles.dayCellToday,
          isSelected && { backgroundColor: colors.primary + '30', borderColor: colors.primary, borderWidth: 1 },
        ]}
        onPress={() => setSelectedDay(day)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.gregorianDayText,
          { opacity },
          day.isToday && { color: colors.primary, fontWeight: '700' },
          isSelected && { color: colors.primary },
        ]}>
          {day.day}
        </Text>
        {day.hijriDay > 0 && (
          <Text style={[
            styles.hijriDayText,
            { opacity: opacity * 0.7 },
            day.hijriDay === 1 && { color: colors.primary, fontWeight: '600' },
          ]}>
            {day.hijriDay}
          </Text>
        )}
        {hasEvents && day.isCurrentMonth && (
          <View style={styles.eventDotsRow}>
            {day.events.slice(0, 3).map((ev, i) => (
              <View
                key={i}
                style={[styles.eventDot, { backgroundColor: EVENT_COLORS[ev.type] }]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ============================================
  // العرض
  // ============================================

  const isCurrentMonthToday = displayYear === today.getFullYear() && displayMonth === today.getMonth();

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      style={[styles.container, isDarkMode && { backgroundColor: '#11151c' }]}
    >
      {/* الهيدر */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: 'rgba(120,120,128,0.18)' }]}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>التقويم الهجري</Text>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {!isCurrentMonthToday && (
            <TouchableOpacity onPress={goToToday} style={[styles.headerBtn, { backgroundColor: 'rgba(120,120,128,0.18)' }]}>
              <Ionicons name="today-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowOffsetModal(true)} style={[styles.headerBtn, { backgroundColor: 'rgba(120,120,128,0.18)' }]}>
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ============================================ */}
        {/* شريط التنقل بين الأشهر */}
        {/* ============================================ */}
        <View style={styles.monthNavBar}>
          {/* RTL: right arrow = previous */}
          <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavBtn}>
            <MaterialCommunityIcons name="chevron-right" size={32} color="#fff" />
          </TouchableOpacity>

          <View style={styles.monthNavCenter}>
            <Text style={styles.monthNavTitle}>
              {GREGORIAN_MONTHS[displayMonth]} {displayYear}
            </Text>
            <Text style={styles.monthNavSubtitle}>{hijriMonthsInView}</Text>
          </View>

          {/* RTL: left arrow = next */}
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavBtn}>
            <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* رؤوس أيام الأسبوع */}
        {/* ============================================ */}
        <View style={styles.weekdayHeader}>
          {WEEKDAYS_AR_SHORT.map((wd, i) => (
            <View key={i} style={styles.weekdayCell}>
              <Text style={[
                styles.weekdayText,
                i === 5 && { color: colors.primary }, // الجمعة
              ]}>{wd}</Text>
            </View>
          ))}
        </View>

        {/* ============================================ */}
        {/* شبكة التقويم */}
        {/* ============================================ */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => renderDayCell(day, index))}
        </View>

        {/* ============================================ */}
        {/* بطاقة اليوم المحدد */}
        {/* ============================================ */}
        {selectedDay && (
          <View style={styles.selectedDayCard}>
            <View style={styles.selectedDayHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedDayGregorian}>
                  {selectedDay.day} {GREGORIAN_MONTHS[selectedDay.gregorianDate.getMonth()]} {selectedDay.gregorianDate.getFullYear()}م
                </Text>
                <Text style={styles.selectedDayHijri}>
                  {selectedDay.hijriDay} {HIJRI_MONTHS[selectedDay.hijriMonth - 1]} {selectedDay.hijriYear}هـ
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleShareDay(selectedDay)} style={styles.shareBtn}>
                <MaterialCommunityIcons name="share-variant" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {selectedDay.events.length > 0 && (
              <View style={{ marginTop: Spacing.sm }}>
                {selectedDay.events.map((ev, i) => (
                  <View key={i} style={[styles.selectedDayEvent, { borderLeftColor: EVENT_COLORS[ev.type] }]}>
                    <Ionicons name={EVENT_ICONS[ev.type] as any} size={18} color={EVENT_COLORS[ev.type]} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.selectedEventName}>{ev.nameAr}</Text>
                      {ev.descriptionAr && (
                        <Text style={styles.selectedEventDesc}>{ev.descriptionAr}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ============================================ */}
        {/* قائمة مناسبات الشهر */}
        {/* ============================================ */}
        {eventsInMonth.length > 0 && (
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>مناسبات هذا الشهر</Text>
            {eventsInMonth.map((ev, index) => (
              <TouchableOpacity
                key={index}
                style={styles.eventCard}
                onPress={async () => {
                  const shareText = `🌙 ${ev.nameAr}\n📅 ${ev.hijriDateStr}\n📆 ${ev.gregorianDate.getDate()} ${GREGORIAN_MONTHS[ev.gregorianDate.getMonth()]} ${ev.gregorianDate.getFullYear()}م\n${ev.descriptionAr || ''}\n\n${APP_CONFIG.getShareSignature()}`;
                  await Share.share({ message: shareText });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.eventCardIcon, { backgroundColor: EVENT_COLORS[ev.type] + '20' }]}>
                  <Ionicons
                    name={EVENT_ICONS[ev.type] as any}
                    size={22}
                    color={EVENT_COLORS[ev.type]}
                  />
                </View>
                <View style={styles.eventCardInfo}>
                  <Text style={styles.eventCardName}>{ev.nameAr}</Text>
                  <View style={styles.eventCardDates}>
                    <Text style={[styles.eventCardDate, { color: colors.primary }]}>{ev.hijriDateStr}</Text>
                    <Text style={styles.eventCardDateSep}>|</Text>
                    <Text style={styles.eventCardDate}>
                      {ev.gregorianDate.getDate()} {GREGORIAN_MONTHS[ev.gregorianDate.getMonth()]}
                    </Text>
                  </View>
                  {ev.descriptionAr && (
                    <Text style={styles.eventCardDesc} numberOfLines={2}>{ev.descriptionAr}</Text>
                  )}
                </View>
                <MaterialCommunityIcons name="share-variant" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* معلومات إضافية */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.info} />
          <Text style={styles.infoText}>
            التقويم الهجري يعتمد على دورة القمر، وقد يختلف يوم أو يومين حسب رؤية الهلال في بلدك
          </Text>
        </View>

        <BannerAdComponent screen="hijri" />
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ============================================ */}
      {/* نافذة إعدادات تعديل التاريخ الهجري */}
      {/* ============================================ */}
      <Modal
        visible={showOffsetModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowOffsetModal(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={styles.offsetModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تعديل التاريخ الهجري</Text>
              <TouchableOpacity onPress={() => setShowOffsetModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.offsetDescription}>
              يمكنك تعديل التاريخ الهجري بحسب رؤية الهلال في بلدك
            </Text>

            <View style={styles.offsetOptions}>
              {[-2, -1, 0, 1, 2].map((offset) => (
                <TouchableOpacity
                  key={offset}
                  style={[
                    styles.offsetOption,
                    hijriOffset === offset && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => saveOffset(offset)}
                >
                  <Text style={[
                    styles.offsetOptionText,
                    hijriOffset === offset && { color: '#fff', fontWeight: '700' },
                  ]}>
                    {offset === 0 ? 'بدون تعديل' : offset > 0 ? `+${offset} يوم` : `${offset} يوم`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.offsetNote}>
              التعديل الحالي: {hijriOffset === 0 ? 'بدون تعديل' : hijriOffset > 0 ? `+${hijriOffset} يوم` : `${hijriOffset} يوم`}
            </Text>
          </View>
        </View>
      </Modal>
    </BackgroundWrapper>
  );
}

// ============================================
// الأنماط
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: '#fff',
  },
  headerBtn: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },

  // ---- Month navigation ----
  monthNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  monthNavBtn: {
    padding: Spacing.xs,
  },
  monthNavCenter: {
    alignItems: 'center',
  },
  monthNavTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: '#fff',
  },
  monthNavSubtitle: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // ---- Weekday header ----
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // ---- Calendar grid ----
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  dayCellToday: {
    backgroundColor: 'rgba(47,118,89,0.15)',
    borderRadius: BorderRadius.md,
  },
  gregorianDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  hijriDayText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  eventDotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // ---- Selected day card ----
  selectedDayCard: {
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedDayGregorian: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  selectedDayHijri: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  shareBtn: {
    padding: Spacing.sm,
  },
  selectedDayEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderLeftWidth: 3,
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.sm,
  },
  selectedEventName: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
  selectedEventDesc: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // ---- Events section ----
  eventsSection: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: '#fff',
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120,120,128,0.12)',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eventCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  eventCardName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  eventCardDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  eventCardDate: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  eventCardDateSep: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255,255,255,0.4)',
  },
  eventCardDesc: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
    lineHeight: 16,
  },

  // ---- Info card ----
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120,120,128,0.1)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },

  // ---- Modal styles ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: '#fff',
  },

  // ---- Offset modal ----
  offsetModalContent: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: BorderRadius.xl,
    margin: Spacing.lg,
    padding: Spacing.lg,
  },
  offsetDescription: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  offsetOptions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  offsetOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(120,120,128,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  offsetOptionText: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  offsetNote: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
