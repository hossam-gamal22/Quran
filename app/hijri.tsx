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
import { ISLAMIC_EVENTS as DEFAULT_ISLAMIC_EVENTS, gregorianToHijri, hijriToGregorian, isAyyamAlBidh, getAyyamAlBidhEvent } from '../lib/hijri-date';
import type { IslamicEventDetails } from '../lib/hijri-date';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchIslamicEvents, fetchGoogleCalendarEvents } from '@/lib/admin-data-api';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold } from '@/lib/fonts';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { getLanguage } from '@/lib/i18n';

const getEventName = (ev: IslamicEventDetails) => {
  const lang = getLanguage();
  return lang === 'ar' ? ev.nameAr : (ev.name || ev.nameAr);
};
const getEventDesc = (ev: IslamicEventDetails) => {
  const lang = getLanguage();
  return lang === 'ar' ? ev.descriptionAr : (ev.description || ev.descriptionAr);
};
const isEventSourceArabic = () => {
  const lang = getLanguage();
  if (lang === 'ar') return true;
  // For non-Arabic, we return English text, so source is 'en'
  return false;
};

const HIJRI_OFFSET_KEY = '@hijri_date_offset';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - Spacing.md * 2 - 12) / 7);

// ============================================
// ألوان المناسبات
// ============================================

const EVENT_COLORS: Record<IslamicEventDetails['type'], string> = {
  holiday: '#E91E63',
  fasting: '#FF9800',
  special: '#9C27B0',
  observance: '#607D8B',
  blessed_period: '#F5A623',
  sunnah_fasting: '#4CAF50',
};

const EVENT_ICONS: Record<IslamicEventDetails['type'], string> = {
  holiday: 'star',
  fasting: 'restaurant-outline',
  special: 'sparkles',
  observance: 'moon',
  blessed_period: 'moon-waning-crescent',
  sunnah_fasting: 'moon-outline',
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
  const { isDarkMode, settings, t, currentTranslations } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), []);

  // Event name/desc with translation key support
  const getLocalizedEventName = (ev: IslamicEventDetails) => {
    if (ev.translationKey) {
      const translated = t(ev.translationKey);
      if (translated && translated !== ev.translationKey) return translated;
    }
    return getEventName(ev);
  };
  const getLocalizedEventDesc = (ev: IslamicEventDetails) => {
    if (ev.descriptionKey) {
      const translated = t(ev.descriptionKey);
      if (translated && translated !== ev.descriptionKey) return translated;
    }
    return getEventDesc(ev);
  };

  // Translated month/weekday names
  const hijriMonthNames = currentTranslations.calendar.hijriMonths;
  const weekdaysFull = currentTranslations.calendar.weekDays;
  const gregorianMonthNames = currentTranslations.calendar.months;
  const ahSuffix = t('calendar.ahSuffix') || (settings.language === 'ar' ? 'هـ' : 'AH');

  // الحالات
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth()); // 0-based
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [showOffsetModal, setShowOffsetModal] = useState(false);
  const [hijriOffset, setHijriOffset] = useState(0);
  const [ISLAMIC_EVENTS, setIslamicEvents] = useState<IslamicEventDetails[]>(DEFAULT_ISLAMIC_EVENTS);

  // ============================================
  // تحميل الإعدادات
  // ============================================

  useEffect(() => {
    AsyncStorage.getItem(HIJRI_OFFSET_KEY).then(val => {
      if (val !== null) setHijriOffset(parseInt(val, 10) || 0);
    }).catch(() => {});

    // Fetch admin-managed events from Firestore
    fetchIslamicEvents(DEFAULT_ISLAMIC_EVENTS as any).then((events) => {
      if (events.length > 0) setIslamicEvents(events as unknown as IslamicEventDetails[]);
    });

    // Fetch Google Calendar events (admin-managed)
    fetchGoogleCalendarEvents().then((gcalEvents) => {
      if (gcalEvents.length > 0) {
        const mapped: IslamicEventDetails[] = gcalEvents
          .filter(e => e.hijriMonth && e.hijriDay)
          .map(e => ({
            name: e.title,
            nameAr: e.titleAr || e.title,
            hijriMonth: e.hijriMonth!,
            hijriDay: e.hijriDay!,
            hijriDayEnd: e.hijriDayEnd,
            description: e.description,
            descriptionAr: e.descriptionAr || e.description,
            type: (e.type as IslamicEventDetails['type']) || 'observance',
            importance: e.importance || 'minor',
          }));
        if (mapped.length > 0) {
          setIslamicEvents(prev => [...prev, ...mapped]);
        }
      }
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
      const events = ISLAMIC_EVENTS.filter(e => {
        if (e.hijriMonth !== hijri.month) return false;
        if (e.hijriDayEnd) {
          return hijri.day >= e.hijriDay && hijri.day <= e.hijriDayEnd;
        }
        return e.hijriDay === hijri.day;
      });
      // Add Ayyam al-Bidh (13th, 14th, 15th of every Hijri month)
      if (isAyyamAlBidh(hijri.day)) {
        events.push(getAyyamAlBidhEvent());
      }
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
      return `${hijriMonthNames[first.hijriMonth - 1]} ${first.hijriYear} ${ahSuffix}`;
    }
    const firstYearStr = `${first.hijriYear}`;
    const lastYearStr = `${last.hijriYear}`;
    if (firstYearStr === lastYearStr) {
      return `${hijriMonthNames[first.hijriMonth - 1]} - ${hijriMonthNames[last.hijriMonth - 1]} ${first.hijriYear} ${ahSuffix}`;
    }
    return `${hijriMonthNames[first.hijriMonth - 1]} ${first.hijriYear} - ${hijriMonthNames[last.hijriMonth - 1]} ${last.hijriYear} ${ahSuffix}`;
  }, [calendarDays, hijriMonthNames]);

  // Events in view for the event list
  const eventsInMonth = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<IslamicEventDetails & { gregorianDate: Date; hijriDateStr: string }> = [];
    for (const d of calendarDays) {
      if (!d.isCurrentMonth) continue;
      for (const ev of d.events) {
        // For range events, use translationKey as dedup key
        const key = ev.hijriDayEnd
          ? `${ev.hijriMonth}-${ev.hijriDay}-${ev.hijriDayEnd}`
          : `${ev.hijriMonth}-${ev.hijriDay}`;
        if (!seen.has(key)) {
          seen.add(key);
          const dateStr = ev.hijriDayEnd
            ? `${ev.hijriDay}-${ev.hijriDayEnd} ${hijriMonthNames[d.hijriMonth - 1]} ${d.hijriYear} ${ahSuffix}`
            : `${d.hijriDay} ${hijriMonthNames[d.hijriMonth - 1]} ${d.hijriYear} ${ahSuffix}`;
          result.push({
            ...ev,
            gregorianDate: d.gregorianDate,
            hijriDateStr: dateStr,
          });
        }
      }
    }
    return result;
  }, [calendarDays, hijriMonthNames]);

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
      let shareText = `📅 ${t('calendar.hijriDate')}\n\n`;
      shareText += `📆 ${day.hijriDay} ${hijriMonthNames[day.hijriMonth - 1]} ${day.hijriYear} ${ahSuffix}\n`;
      shareText += `📅 ${day.day} ${gregorianMonthNames[day.gregorianDate.getMonth()]} ${day.gregorianDate.getFullYear()}م\n`;
      if (day.events.length > 0) {
        shareText += `\n🎉 ${day.events.map(e => getLocalizedEventName(e)).join(' - ')}\n`;
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
    const isBlessedPeriod = day.events.some(e => e.type === 'blessed_period');

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCell,
          day.isToday && styles.dayCellToday,
          isSelected && { backgroundColor: colors.primary + '30', borderColor: colors.primary, borderWidth: 1 },
          isBlessedPeriod && day.isCurrentMonth && styles.blessedPeriodCell,
        ]}
        onPress={() => setSelectedDay(day)}
        activeOpacity={0.7}
      >
        {isBlessedPeriod && day.isCurrentMonth && (
          <View style={[styles.blessedIcon, isRTL ? { left: 4, right: undefined } : null]}>
            <MaterialCommunityIcons name="moon-waning-crescent" size={10} color="#F5A623" />
          </View>
        )}
        <Text style={[
          styles.gregorianDayText,
          { color: colors.text, opacity },
          day.isToday && { color: colors.primary, fontWeight: '700' },
          isSelected && { color: colors.primary },
          isBlessedPeriod && day.isCurrentMonth && { color: '#F5A623' },
        ]}>
          {day.day}
        </Text>
        {day.hijriDay > 0 && (
          <Text style={[
            styles.hijriDayText,
            { color: colors.textLight, opacity: opacity * 0.7 },
            day.hijriDay === 1 && { color: colors.primary, fontWeight: '600' },
            isBlessedPeriod && day.isCurrentMonth && { color: '#F5A623', opacity: 0.7 },
          ]}>
            {day.hijriDay}
          </Text>
        )}
        {hasEvents && day.isCurrentMonth && (
          <View style={[styles.eventDotsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {day.events.filter(e => e.type !== 'blessed_period').slice(0, 3).map((ev, i) => (
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
      opacity={settings.display.backgroundOpacity ?? 1}
      style={[styles.container, isDarkMode && { backgroundColor: '#11151c' }, settings.display.appBackground !== 'none' && { backgroundColor: 'transparent' }]}
    >
      {/* الهيدر */}
      <UniversalHeader
        titleColor={colors.text}
        backColor={colors.text}
        style={{ paddingTop: insets.top + 10 }}
        rightActions={[
          ...(!isCurrentMonthToday ? [{ icon: 'calendar-today' as const, onPress: goToToday, color: colors.text }] : []),
          { icon: 'cog-outline', onPress: () => setShowOffsetModal(true), color: colors.text },
        ]}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('calendar.hijriCalendar')}</Text>
          <SectionInfoButton sectionKey="worship" />
        </View>
      </UniversalHeader>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ============================================ */}
        {/* شريط التنقل بين الأشهر */}
        {/* ============================================ */}
        <View style={[styles.monthNavBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* RTL: left arrow = previous (arrow points in direction of movement) */}
          <TouchableOpacity onPress={goToPrevMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={32} color="#fff" />
          </TouchableOpacity>

          <View style={styles.monthNavCenter}>
            <Text style={[styles.monthNavTitle, { color: colors.text }]}>
              {gregorianMonthNames[displayMonth]} {displayYear}
            </Text>
            <Text style={[styles.monthNavSubtitle, { color: colors.textLight }]}>{hijriMonthsInView}</Text>
          </View>

          {/* RTL: right arrow = next (arrow points in direction of movement) */}
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* رؤوس أيام الأسبوع */}
        {/* ============================================ */}
        <View style={[styles.weekdayHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {weekdaysFull.map((wd, i) => (
            <View key={i} style={styles.weekdayCell}>
              <Text style={[
                styles.weekdayText,
                { color: colors.textLight },
                i === 5 && { color: colors.primary }, // الجمعة
              ]}>{wd}</Text>
            </View>
          ))}
        </View>

        {/* ============================================ */}
        {/* شبكة التقويم */}
        {/* ============================================ */}
        <View style={[styles.calendarGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {calendarDays.map((day, index) => renderDayCell(day, index))}
        </View>

        {/* ============================================ */}
        {/* بطاقة اليوم المحدد */}
        {/* ============================================ */}
        {selectedDay && (
          <View style={styles.selectedDayCard}>
            <View style={[styles.selectedDayHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedDayGregorian, { color: colors.text }]}>
                  {selectedDay.day} {gregorianMonthNames[selectedDay.gregorianDate.getMonth()]} {selectedDay.gregorianDate.getFullYear()}م
                </Text>
                <Text style={[styles.selectedDayHijri, { color: colors.textLight }]}>
                  {selectedDay.hijriDay} {hijriMonthNames[selectedDay.hijriMonth - 1]} {selectedDay.hijriYear}هـ
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleShareDay(selectedDay)} style={styles.shareBtn} activeOpacity={0.7}>
                <MaterialCommunityIcons name="share-variant" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {selectedDay.events.length > 0 && (
              <View style={{ marginTop: Spacing.sm }}>
                {selectedDay.events.map((ev, i) => (
                  <View key={i} style={[
                    styles.selectedDayEvent,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    isRTL ? { borderRightColor: EVENT_COLORS[ev.type], borderRightWidth: 3, borderLeftWidth: 0 } : { borderLeftColor: EVENT_COLORS[ev.type] },
                    ev.type === 'blessed_period' && styles.blessedEventCard,
                  ]}>
                    {ev.type === 'blessed_period' ? (
                      <MaterialCommunityIcons name="moon-waning-crescent" size={18} color={EVENT_COLORS[ev.type]} />
                    ) : (
                      <Ionicons name={EVENT_ICONS[ev.type] as any} size={18} color={EVENT_COLORS[ev.type]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <TranslatedText from={isEventSourceArabic() ? 'ar' : 'en'} type="section" style={[styles.selectedEventName, { color: colors.text }]}>{getLocalizedEventName(ev)}</TranslatedText>
                      {getLocalizedEventDesc(ev) ? (
                        <TranslatedText from={isEventSourceArabic() ? 'ar' : 'en'} type="section" style={[styles.selectedEventDesc, { color: colors.textLight }]}>{getLocalizedEventDesc(ev)}</TranslatedText>
                      ) : null}
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
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('calendar.islamicEvents')}</Text>
            {eventsInMonth.map((ev, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.eventCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={async () => {
                  const shareText = `🌙 ${getLocalizedEventName(ev)}\n📅 ${ev.hijriDateStr}\n📆 ${ev.gregorianDate.getDate()} ${gregorianMonthNames[ev.gregorianDate.getMonth()]} ${ev.gregorianDate.getFullYear()}م\n${getLocalizedEventDesc(ev) || ''}\n\n${APP_CONFIG.getShareSignature()}`;
                  await Share.share({ message: shareText });
                }}
                activeOpacity={0.7}
              >
                <View style={{ width: 30, alignItems: 'center', justifyContent: 'center' }}>
                  {ev.type === 'blessed_period' ? (
                    <MaterialCommunityIcons name="moon-waning-crescent" size={22} color={EVENT_COLORS[ev.type]} />
                  ) : (
                    <Ionicons
                      name={EVENT_ICONS[ev.type] as any}
                      size={22}
                      color={EVENT_COLORS[ev.type]}
                    />
                  )}
                </View>
                <View style={[styles.eventCardInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <TranslatedText from={isEventSourceArabic() ? 'ar' : 'en'} type="section" style={[styles.eventCardName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{getLocalizedEventName(ev)}</TranslatedText>
                  <View style={[styles.eventCardDates, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.eventCardDate, { color: colors.primary }]}>{ev.hijriDateStr}</Text>
                    <Text style={[styles.eventCardDateSep, { color: colors.textLight }]}>|</Text>
                    <Text style={[styles.eventCardDate, { color: colors.textLight }]}>
                      {ev.gregorianDate.getDate()} {gregorianMonthNames[ev.gregorianDate.getMonth()]}
                    </Text>
                  </View>
                  {getLocalizedEventDesc(ev) ? (
                    <TranslatedText from={isEventSourceArabic() ? 'ar' : 'en'} type="section" style={[styles.eventCardDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{getLocalizedEventDesc(ev)}</TranslatedText>
                  ) : null}
                </View>
                <MaterialCommunityIcons name="share-variant" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* معلومات إضافية */}
        <View style={[styles.infoCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="information-circle" size={20} color={Colors.info} />
          <Text style={[styles.infoText, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('calendar.hijriNote')}
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
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.modalTitle}>{t('hijri.adjustTitle')}</Text>
              <TouchableOpacity onPress={() => setShowOffsetModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.offsetDescription}>
              {t('hijri.adjustDesc')}
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
                    {offset === 0 ? t('hijri.noAdjustment') : offset > 0 ? `+${offset} ${t('seasonal.day')}` : `${offset} ${t('seasonal.day')}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.offsetNote}>
              {t('hijri.adjustDesc')}: {hijriOffset === 0 ? t('hijri.noAdjustment') : hijriOffset > 0 ? `+${hijriOffset} ${t('seasonal.day')}` : `${hijriOffset} ${t('seasonal.day')}`}
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
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // ---- Calendar grid ----
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  dayCellToday: {
    backgroundColor: 'rgba(47,118,89,0.15)',
    borderRadius: BorderRadius.md,
  },
  blessedPeriodCell: {
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
    borderRadius: BorderRadius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(245, 166, 35, 0.2)',
  },
  blessedIcon: {
    position: 'absolute',
    top: 2,
    right: 4,
  },
  blessedEventCard: {
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
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
    gap: 8,
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
    gap: 8,
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
    gap: Spacing.md,
  },
  eventCardInfo: {
    flex: 1,
  },
  eventCardName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: '#fff',
  },
  eventCardDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    color: '#555',
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
