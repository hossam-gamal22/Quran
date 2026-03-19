/**
 * Hijri Calendar Screen — تقويم هجري كامل
 * يعرض: التقويم الشهري الهجري، الأحداث الإسلامية، تحويل التواريخ
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Modal, Animated, Platform, Share,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { useSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { getDateLocale, tArray } from '@/lib/i18n';
import { fetchGoogleCalendarEvents, type GoogleCalendarEvent } from '@/lib/admin-data-api';
import { getDayNames } from '@/constants/dayNames';

// ─── Islamic Events ───────────────────────────────────────────────────────────
// We will generate the events inside the component to support translations

interface IslamicEvent {
  month: number;
  day: number;
  dayEnd?: number;
  name: string;
  icon: string;
  description: string;
  color: string;
}

// ─── Hijri conversion (Kuwaiti algorithm) ────────────────────────────────────
function gregorianToHijri(gYear: number, gMonth: number, gDay: number): [number, number, number] {
  if (gMonth < 3) { gYear--; gMonth += 12; }
  const A = Math.floor(gYear / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (gYear + 4716)) + Math.floor(30.6001 * (gMonth + 1)) + gDay + B - 1524.5;
  const Z = Math.floor(JD - 1948438.5) + 0.5;
  const hYear = Math.floor((30 * Z + 10646) / 10631);
  const hMonth = Math.min(12, Math.floor((11 * (Z - Math.floor((11 * hYear + 3) / 30) + 30)) / 325) + 1);
  const hDay = Math.floor(Z - Math.floor((29.5001 * (hMonth - 1))) - Math.floor((11 * hYear + 3) / 30) + 29 + 1);
  return [hYear, hMonth, Math.max(1, Math.min(30, hDay))];
}

function hijriToGregorian(hYear: number, hMonth: number, hDay: number): Date {
  const N = hDay + Math.ceil(29.5001 * (hMonth - 1)) + (hYear - 1) * 354 + Math.floor((3 + 11 * hYear) / 30) + 1948440 - 385;
  let J = N;
  let B, C, D, E;
  if (N > 2299160) { const A = Math.floor((N - 1867216.25) / 36524.25); J = N + 1 + A - Math.floor(A / 4); }
  B = J + 1524; C = Math.floor((B - 122.1) / 365.25); D = Math.floor(365.25 * C); E = Math.floor((B - D) / 30.6001);
  const gDay = B - D - Math.floor(30.6001 * E);
  const gMonth = E < 14 ? E - 1 : E - 13;
  const gYear = gMonth > 2 ? C - 4716 : C - 4715;
  return new Date(gYear, gMonth - 1, gDay);
}

function getDaysInHijriMonth(hYear: number, hMonth: number): number {
  const start = hijriToGregorian(hYear, hMonth, 1);
  const nextMonth = hMonth === 12 ? hijriToGregorian(hYear + 1, 1, 1) : hijriToGregorian(hYear, hMonth + 1, 1);
  return Math.round((nextMonth.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HijriCalendarScreen() {
  const { t, settings } = useSettings();
  const colors = useColors();
  const isRTL = useIsRTL();
  const today = new Date();
  
  // ─── Translations ────────────────────────────────────────────────────────────
  const hijriMonthsArr = tArray('calendar.hijriMonths');
  const HIJRI_MONTHS = hijriMonthsArr.length > 0 ? hijriMonthsArr : [
    'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
    'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', 'Shaban',
    'Ramadan', 'Shawwal', 'Dhul Qadah', 'Dhul Hijjah',
  ];

  const daysArr = tArray('calendar.weekDays');
  const ARABIC_DAYS = daysArr.length > 0 ? daysArr : getDayNames(settings.language || 'ar');
  
  const ISLAMIC_EVENTS: IslamicEvent[] = [
    { month: 1, day: 1,   name: t('calendar.newYear'), icon: 'weather-night', description: t('calendar.newYearDesc'), color: '#1B6B3A' },
    { month: 1, day: 10,  name: t('calendar.ashura'),       icon: 'star-four-points', description: t('calendar.ashuraDesc'), color: '#7C3AED' },
    { month: 3, day: 12,  name: t('calendar.mawlid'),     icon: 'star', description: t('calendar.mawlidDesc'), color: '#D97706' },
    { month: 7, day: 27,  name: t('calendar.isra'),      icon: 'weather-night', description: t('calendar.israDesc'), color: '#2563EB' },
    { month: 8, day: 15,  name: t('calendar.shaban15'), icon: 'moon-full', description: t('calendar.shaban15Desc'), color: '#059669' },
    { month: 9, day: 1,   name: t('calendar.ramadan'),         icon: 'weather-night', description: t('calendar.ramadanDesc'), color: '#DC2626' },
    { month: 9, day: 17,  name: t('calendar.badr'),          icon: 'script-text-outline', description: t('calendar.badrDesc'), color: '#6B7280' },
    { month: 9, day: 21, dayEnd: 30, name: t('calendar.lastTenNights'), icon: 'star-crescent', description: t('calendar.lastTenNightsDesc') || '', color: '#F5A623' },
    { month: 10, day: 1,  name: t('calendar.eidAlFitr'),         icon: 'party-popper', description: t('calendar.eidAlFitrDesc'), color: '#1B6B3A' },
    { month: 12, day: 8,  name: t('calendar.tarwiyah'),       icon: 'mosque', description: t('calendar.tarwiyahDesc'), color: '#B45309' },
    { month: 12, day: 9,  name: t('calendar.arafat'),          icon: 'mosque', description: t('calendar.arafatDesc'), color: '#DC2626' },
    { month: 12, day: 10, name: t('calendar.eidAlAdha'),        icon: 'star-shooting', description: t('calendar.eidAlAdhaDesc'), color: '#1B6B3A' },
    { month: 12, day: 11, dayEnd: 13, name: t('calendar.tashreeq'),      icon: 'counter', description: t('calendar.tashreeqDesc'), color: '#059669' },
  ];

  const [todayHijri] = useState(() => gregorianToHijri(today.getFullYear(), today.getMonth() + 1, today.getDate()));

  const [hYear, setHYear]   = useState(todayHijri[0]);
  const [hMonth, setHMonth] = useState(todayHijri[1]);
  const [selectedDay, setSelectedDay] = useState(todayHijri[2]);
  const [selectedEvent, setSelectedEvent] = useState<IslamicEvent | null>(null);
  const [showConverter, setShowConverter] = useState(false);
  const [gcalEvents, setGcalEvents] = useState<IslamicEvent[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Fetch admin Google Calendar events
  useEffect(() => {
    fetchGoogleCalendarEvents().then((events) => {
      const mapped: IslamicEvent[] = events
        .filter(e => e.hijriMonth && e.hijriDay)
        .map(e => ({
          month: e.hijriMonth!,
          day: e.hijriDay!,
          dayEnd: e.hijriDayEnd,
          name: e.titleAr || e.title,
          icon: e.icon || 'calendar',
          description: e.descriptionAr || e.description || '',
          color: e.color || '#607D8B',
        }));
      setGcalEvents(mapped);
    }).catch(() => {});
  }, []);

  const daysInMonth = getDaysInHijriMonth(hYear, hMonth);
  const firstDayGregorian = hijriToGregorian(hYear, hMonth, 1);
  const firstDayOfWeek = firstDayGregorian.getDay(); // 0=Sun

  // Events for current month (support range events) — includes Google Calendar events
  const allEvents = [...ISLAMIC_EVENTS, ...gcalEvents];
  const monthEvents = allEvents.filter(e => {
    if (e.month !== hMonth) return false;
    return true;
  });
  const eventDays = new Set<number>();
  monthEvents.forEach(e => {
    if (e.dayEnd) {
      for (let d = e.day; d <= e.dayEnd; d++) eventDays.add(d);
    } else {
      eventDays.add(e.day);
    }
  });
  // Add Ayyam al-Bidh (13, 14, 15) to every month
  eventDays.add(13); eventDays.add(14); eventDays.add(15);

  // Ayyam al-Bidh event object for display
  const AYYAM_AL_BIDH_EVENT: IslamicEvent = {
    month: hMonth,
    day: 13,
    dayEnd: 15,
    name: t('calendar.ayyamAlBidh'),
    icon: 'moon-full',
    description: t('calendar.ayyamAlBidhDesc'),
    color: '#4CAF50',
  };

  const localeStr = getDateLocale();
  const ahSuffix = t('calendar.ahSuffix') || (settings.language === 'ar' ? 'هـ' : 'AH');

  const getDateString = () => {
    try {
      const selectedGreg = hijriToGregorian(hYear, hMonth, selectedDay);
      return `${selectedDay} ${HIJRI_MONTHS[hMonth - 1]} ${hYear} ${ahSuffix}\n${selectedGreg.toLocaleDateString(localeStr, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    } catch {
      return `${selectedDay} ${HIJRI_MONTHS[hMonth - 1]} ${hYear} ${ahSuffix}`;
    }
  };

  const handleCopy = async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await Clipboard.setStringAsync(getDateString());
    } catch {}
  };

  const handleShare = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({ message: `🌙 ${getDateString()}\n\n— ${t('common.appSharingSig') || 'Rooh Al Muslim'}` });
    } catch {}
  };

  const navigate = (dir: -1 | 1) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: dir * -30, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
    let nm = hMonth + dir, ny = hYear;
    if (nm < 1)  { nm = 12; ny--; }
    if (nm > 12) { nm = 1;  ny++; }
    setHMonth(nm); setHYear(ny); setSelectedDay(1);
  };

  const isToday = (d: number) =>
    d === todayHijri[2] && hMonth === todayHijri[1] && hYear === todayHijri[0];

  const safeSelectedDay = Math.min(selectedDay, daysInMonth);
  const selectedGregorian = (() => {
    try { return hijriToGregorian(hYear, hMonth, safeSelectedDay); }
    catch { return new Date(); }
  })();
  const selectedEvents = (() => {
    const matched = allEvents.filter(e => {
      if (e.month !== hMonth) return false;
      if (e.dayEnd) return safeSelectedDay >= e.day && safeSelectedDay <= e.dayEnd;
      return e.day === safeSelectedDay;
    });
    // Add Ayyam al-Bidh if 13th-15th
    if (safeSelectedDay >= 13 && safeSelectedDay <= 15) {
      matched.push(AYYAM_AL_BIDH_EVENT);
    }
    return matched;
  })();

  // All events for upcoming section (sorted) — includes Google Calendar events
  const upcomingEvents = allEvents
    .map(e => {
      try {
        const evDate = hijriToGregorian(todayHijri[0], e.month, e.day);
        if (evDate < today) evDate.setFullYear(evDate.getFullYear() + 1);
        const diff = Math.ceil((evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...e, diff, evDate };
      } catch {
        return { ...e, diff: 999, evDate: new Date() };
      }
    })
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 8);

  const s = StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: colors.foreground },
    iconBtn: { padding: 8, borderRadius: 20 },
    // Month nav
    monthNav: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 12, backgroundColor: 'rgba(120,120,128,0.12)', borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    navBtn: { padding: 10, borderRadius: 20, backgroundColor: colors.primary + '18' },
    monthTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.primary },
    yearText: { textAlign: 'center', fontSize: 12, color: colors.muted, marginTop: 2 },
    // Weekday headers
    weekRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: 'rgba(120,120,128,0.12)' },
    weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.primary },
    // Calendar grid
    calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 8 },
    dayCell: {
      width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
      padding: 2,
    },
    dayInner: {
      width: 34, height: 34, borderRadius: 17,
      alignItems: 'center', justifyContent: 'center',
    },
    dayNum: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    eventDot: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 3 },
    // Selected day info
    selectedCard: {
      margin: 12, backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 16,
      padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    selectedDate: { fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: isRTL ? 'right' : 'left' },
    selectedGreg: { fontSize: 12, color: colors.muted, textAlign: isRTL ? 'right' : 'left', marginTop: 2 },
    eventItem: {
      flexDirection: 'row', alignItems: 'center', marginTop: 10,
      backgroundColor: colors.primary + '10', borderRadius: 12, padding: 10, gap: 10,
    },
    eventIcon: { fontSize: 20 },
    eventName: { fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: isRTL ? 'right' : 'left' },
    eventDesc: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 18 },
    // Section title
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.foreground, paddingHorizontal: 16, marginTop: 8, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' },
    // Upcoming events
    upcomingItem: {
      flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border, gap: 12,
    },
    upcomingIcon: { fontSize: 22 },
    upcomingInfo: { flex: 1 },
    upcomingName: { fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: isRTL ? 'right' : 'left' },
    upcomingDesc: { fontSize: 12, color: colors.muted, textAlign: isRTL ? 'right' : 'left', marginTop: 1, lineHeight: 18 },
    upcomingDate: { fontSize: 12, color: colors.muted, textAlign: isRTL ? 'right' : 'left', marginTop: 2 },
    upcomingDiff: {
      backgroundColor: colors.primary, borderRadius: 16,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    upcomingDiffText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    // Event modal
    modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24, paddingBottom: 40,
    },
    modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
    modalEventIcon: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: colors.foreground, textAlign: 'center', marginBottom: 6 },
    modalDesc: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 24 },
    modalDate: { fontSize: 13, color: colors.primary, textAlign: 'center', marginTop: 10, fontWeight: '700' },
    // Converter section
    convCard: {
      margin: 12, backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 16,
      padding: 16, borderWidth: 1, borderColor: colors.border,
    },
    convTitle: { fontSize: 14, fontWeight: '800', color: colors.foreground, textAlign: isRTL ? 'right' : 'left', marginBottom: 10 },
    convRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    convLabel: { fontSize: 13, color: colors.muted },
    convValue: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  });

  const renderCalendar = () => {
    const cells: React.ReactNode[] = [];
    // Empty cells for alignment
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<View key={`empty-${i}`} style={s.dayCell} />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = d === selectedDay;
      const isTodayDay = isToday(d);
      const hasEvent = eventDays.has(d);
      const dayEvent = allEvents.find(e => {
        if (e.month !== hMonth) return false;
        if (e.dayEnd) return d >= e.day && d <= e.dayEnd;
        return e.day === d;
      }) || (d >= 13 && d <= 15 ? AYYAM_AL_BIDH_EVENT : undefined);
      const isBlessedPeriod = dayEvent?.dayEnd !== undefined && dayEvent !== AYYAM_AL_BIDH_EVENT;
      const isAyyamDay = d >= 13 && d <= 15 && !dayEvent?.dayEnd; // Show green style for Ayyam al-Bidh only if no other range event
      cells.push(
        <TouchableOpacity
          key={d}
          style={s.dayCell}
          onPress={() => {
            setSelectedDay(d);
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
        >
          <View style={[
            s.dayInner,
            isSelected && { backgroundColor: colors.primary },
            isTodayDay && !isSelected && { borderWidth: 2, borderColor: colors.primary },
            hasEvent && !isSelected && { backgroundColor: (dayEvent?.color || colors.primary) + '15' },
            isBlessedPeriod && !isSelected && { backgroundColor: '#F5A62318', borderWidth: 0.5, borderColor: '#F5A62340' },
          ]}>
            <Text style={[
              s.dayNum,
              isSelected && { color: '#fff', fontWeight: '800' },
              isTodayDay && !isSelected && { color: colors.primary, fontWeight: '800' },
              hasEvent && !isSelected && { color: dayEvent?.color || colors.primary },
              isBlessedPeriod && !isSelected && { color: '#F5A623' },
            ]}>
              {d}
            </Text>
          </View>
          {hasEvent && <View style={[s.eventDot, { backgroundColor: dayEvent?.color || colors.primary }]} />}
        </TouchableOpacity>
      );
    }
    return cells;
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']} screenKey="hijri">
      {/* Header */}
      <View style={[s.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={s.iconBtn} onPress={handleCopy}>
          <IconSymbol name="doc.on.doc" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
          <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.title}>{t('calendar.hijriCalendar') || 'Hijri Calendar'}</Text>
        <TouchableOpacity style={s.iconBtn} onPress={() => { setHYear(todayHijri[0]); setHMonth(todayHijri[1]); setSelectedDay(todayHijri[2]); }}>
          <IconSymbol name="calendar.circle" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={() => setShowConverter(v => !v)}>
          <IconSymbol name="arrow.left.arrow.right" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Month Navigator */}
      <View style={[s.monthNav, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={s.navBtn} onPress={() => navigate(1)}>
          <IconSymbol name={isRTL ? 'chevron.left' : 'chevron.right'} size={18} color={colors.primary} />
        </TouchableOpacity>
        <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
          <Text style={s.monthTitle}>{HIJRI_MONTHS[hMonth - 1]} {hYear}</Text>
          <Text style={s.yearText}>
            {firstDayGregorian.toLocaleDateString(localeStr, { month: 'long', year: 'numeric' })}
          </Text>
        </Animated.View>
        <TouchableOpacity style={s.navBtn} onPress={() => navigate(-1)}>
          <IconSymbol name={isRTL ? 'chevron.right' : 'chevron.left'} size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Weekday headers */}
        <View style={s.weekRow}>
          {ARABIC_DAYS.map((d, idx) => (
            <Text key={d} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[s.weekDay, idx === 5 && { color: colors.primary }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={s.calGrid}>
          {renderCalendar()}
        </View>

        {/* Selected Day Info */}
        <View style={s.selectedCard}>
          <Text style={s.selectedDate}>
            {ARABIC_DAYS[selectedGregorian.getDay()]} {selectedDay} {HIJRI_MONTHS[hMonth - 1]} {hYear} {ahSuffix}
          </Text>
          <Text style={s.selectedGreg}>
            {selectedGregorian.toLocaleDateString(localeStr, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
          {selectedEvents.map(ev => (
            <TouchableOpacity key={ev.name} style={[s.eventItem, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: ev.color + '12' }]} onPress={() => setSelectedEvent(ev)}>
              <MaterialCommunityIcons name={ev.icon as any} size={20} color={ev.color || colors.primary} />
              <Text style={[s.eventName, { color: ev.color, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>{ev.name}</Text>
              <IconSymbol name={isRTL ? 'chevron.right' : 'chevron.left'} size={14} color={ev.color} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Converter */}
        {showConverter && (
          <View style={s.convCard}>
            <Text style={s.convTitle}>{t('calendar.dateConverter') || 'Date Converter — Today'}</Text>
            <View style={[s.convRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={s.convLabel}>{t('calendar.gregorian') || 'Gregorian'}</Text>
              <Text style={s.convValue}>{today.toLocaleDateString(localeStr, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
            <View style={[s.convRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={s.convLabel}>{t('calendar.hijri') || 'Hijri'}</Text>
              <Text style={[s.convValue, { color: colors.primary }]}>{todayHijri[2]} {HIJRI_MONTHS[todayHijri[1] - 1]} {todayHijri[0]} {ahSuffix}</Text>
            </View>
            <View style={[s.convRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={s.convLabel}>{t('calendar.selectedDay') || 'Selected Day'}</Text>
              <Text style={s.convValue}>{selectedDay} {HIJRI_MONTHS[hMonth - 1]} {hYear} {ahSuffix}</Text>
            </View>
            <View style={[s.convRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={s.convLabel}>{t('calendar.correspondsTo') || 'Corresponds To'}</Text>
              <Text style={[s.convValue, { color: colors.primary }]}>
                {selectedGregorian.toLocaleDateString(localeStr, { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>
          </View>
        )}

        {/* Upcoming Events */}
        <Text style={s.sectionTitle}>{t('calendar.upcomingEvents') || 'Upcoming Events'}</Text>
        {upcomingEvents.map((ev, i) => (
          <TouchableOpacity key={i} style={[s.upcomingItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => setSelectedEvent(ev)} activeOpacity={0.7}>
            <View style={[s.upcomingDiff, { backgroundColor: ev.diff === 0 ? '#DC2626' : colors.primary }]}>
              <Text style={s.upcomingDiffText}>{ev.diff === 0 ? (t('calendar.today') || 'Today!') : `${ev.diff}${t('calendar.daysShort') || 'd'}`}</Text>
            </View>
            <View style={s.upcomingInfo}>
              <Text style={s.upcomingName}>{ev.name}</Text>
              <Text style={s.upcomingDate}>{ev.day} {HIJRI_MONTHS[ev.month - 1]} • {ev.evDate.toLocaleDateString(localeStr)}</Text>
            </View>
            <MaterialCommunityIcons name={ev.icon as any} size={22} color={ev.color || colors.primary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Event Detail Modal */}
      <Modal visible={!!selectedEvent} transparent animationType="slide" onRequestClose={() => setSelectedEvent(null)}>
        <TouchableOpacity style={s.modalWrap} activeOpacity={1} onPress={() => setSelectedEvent(null)}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            {selectedEvent && (<>
              <MaterialCommunityIcons name={selectedEvent.icon as any} size={48} color={selectedEvent.color || colors.primary} style={{ textAlign: 'center', marginBottom: 8 }} />
              <Text style={[s.modalTitle, { color: selectedEvent.color }]}>{selectedEvent.name}</Text>
              <Text style={s.modalDate}>
                {selectedEvent.day} {HIJRI_MONTHS[selectedEvent.month - 1]}
              </Text>
            </>)}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}
