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
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

// ─── Hijri month names ────────────────────────────────────────────────────────
const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_DAYS_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

// ─── Islamic Events ───────────────────────────────────────────────────────────
interface IslamicEvent {
  month: number;
  day: number;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const ISLAMIC_EVENTS: IslamicEvent[] = [
  { month: 1, day: 1,   name: 'رأس السنة الهجرية', icon: '🌙', description: 'بداية العام الهجري الجديد', color: '#1B6B3A' },
  { month: 1, day: 10,  name: 'يوم عاشوراء',       icon: '✨', description: 'يوم صيام مستحب - اليوم الذي نجّى الله فيه موسى عليه السلام', color: '#7C3AED' },
  { month: 3, day: 12,  name: 'المولد النبوي',     icon: '⭐', description: 'ذكرى مولد النبي محمد ﷺ', color: '#D97706' },
  { month: 7, day: 27,  name: 'ليلة المعراج',      icon: '🌌', description: 'ذكرى الإسراء والمعراج', color: '#2563EB' },
  { month: 8, day: 15,  name: 'ليلة النصف من شعبان', icon: '🌕', description: 'ليلة مباركة', color: '#059669' },
  { month: 9, day: 1,   name: 'أول رمضان',         icon: '🌙', description: 'بداية شهر رمضان المبارك', color: '#DC2626' },
  { month: 9, day: 17,  name: 'غزوة بدر',          icon: '📜', description: 'ذكرى غزوة بدر الكبرى', color: '#6B7280' },
  { month: 9, day: 21,  name: 'ليالي القدر تبدأ',  icon: '✨', description: 'أوتار العشر الأواخر من رمضان', color: '#7C3AED' },
  { month: 9, day: 27,  name: 'ليلة القدر',        icon: '🌟', description: 'خير من ألف شهر - ليلة السابع والعشرين', color: '#F59E0B' },
  { month: 10, day: 1,  name: 'عيد الفطر',         icon: '🎉', description: 'عيد الفطر المبارك', color: '#1B6B3A' },
  { month: 12, day: 8,  name: 'يوم التروية',       icon: '🕋', description: 'بداية الحج الأكبر', color: '#B45309' },
  { month: 12, day: 9,  name: 'يوم عرفة',          icon: '🕋', description: 'أفضل أيام الدنيا - ركن الحج الأعظم', color: '#DC2626' },
  { month: 12, day: 10, name: 'عيد الأضحى',        icon: '🌟', description: 'عيد الأضحى المبارك', color: '#1B6B3A' },
  { month: 12, day: 11, name: 'أيام التشريق',      icon: '📿', description: 'أيام أكل وشرب وذكر لله', color: '#059669' },
];

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
  const colors = useColors();
  const today = new Date();
  const [todayHijri] = useState(() => gregorianToHijri(today.getFullYear(), today.getMonth() + 1, today.getDate()));

  const [hYear, setHYear]   = useState(todayHijri[0]);
  const [hMonth, setHMonth] = useState(todayHijri[1]);
  const [selectedDay, setSelectedDay] = useState(todayHijri[2]);
  const [selectedEvent, setSelectedEvent] = useState<IslamicEvent | null>(null);
  const [showConverter, setShowConverter] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const daysInMonth = getDaysInHijriMonth(hYear, hMonth);
  const firstDayGregorian = hijriToGregorian(hYear, hMonth, 1);
  const firstDayOfWeek = firstDayGregorian.getDay(); // 0=Sun

  // Events for current month
  const monthEvents = ISLAMIC_EVENTS.filter(e => e.month === hMonth);
  const eventDays = new Set(monthEvents.map(e => e.day));

  const getDateString = () => {
    try {
      const selectedGreg = hijriToGregorian(hYear, hMonth, selectedDay);
      return `${selectedDay} ${HIJRI_MONTHS[hMonth - 1]} ${hYear} هـ\n${selectedGreg.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    } catch {
      return `${selectedDay} ${HIJRI_MONTHS[hMonth - 1]} ${hYear} هـ`;
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
      await Share.share({ message: `🌙 ${getDateString()}\n\n— روح المسلم` });
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
  const selectedEvents = ISLAMIC_EVENTS.filter(e => e.month === hMonth && e.day === safeSelectedDay);

  // All events for upcoming section (sorted)
  const upcomingEvents = ISLAMIC_EVENTS
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
    iconBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(120,120,128,0.12)' },
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
    selectedDate: { fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    selectedGreg: { fontSize: 12, color: colors.muted, textAlign: 'right', marginTop: 2 },
    eventItem: {
      flexDirection: 'row', alignItems: 'center', marginTop: 10,
      backgroundColor: colors.primary + '10', borderRadius: 12, padding: 10, gap: 10,
    },
    eventIcon: { fontSize: 20 },
    eventName: { fontSize: 14, fontWeight: '700', color: colors.foreground, flex: 1, textAlign: 'right' },
    // Section title
    sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.foreground, paddingHorizontal: 16, marginTop: 8, marginBottom: 6, textAlign: 'right' },
    // Upcoming events
    upcomingItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    upcomingIcon: { fontSize: 22, marginLeft: 12 },
    upcomingInfo: { flex: 1 },
    upcomingName: { fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    upcomingDate: { fontSize: 12, color: colors.muted, textAlign: 'right', marginTop: 2 },
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
    convTitle: { fontSize: 14, fontWeight: '800', color: colors.foreground, textAlign: 'right', marginBottom: 10 },
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
      const dayEvent = ISLAMIC_EVENTS.find(e => e.month === hMonth && e.day === d);
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
          ]}>
            <Text style={[
              s.dayNum,
              isSelected && { color: '#fff', fontWeight: '800' },
              isTodayDay && !isSelected && { color: colors.primary, fontWeight: '800' },
              hasEvent && !isSelected && { color: dayEvent?.color || colors.primary },
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
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={handleCopy}>
          <IconSymbol name="doc.on.doc" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
          <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.title}>🌙 التقويم الهجري</Text>
        <TouchableOpacity style={s.iconBtn} onPress={() => { setHYear(todayHijri[0]); setHMonth(todayHijri[1]); setSelectedDay(todayHijri[2]); }}>
          <IconSymbol name="calendar.circle" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={() => setShowConverter(v => !v)}>
          <IconSymbol name="arrow.left.arrow.right" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Month Navigator */}
      <View style={s.monthNav}>
        <TouchableOpacity style={s.navBtn} onPress={() => navigate(1)}>
          <IconSymbol name="chevron.right" size={18} color={colors.primary} />
        </TouchableOpacity>
        <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
          <Text style={s.monthTitle}>{HIJRI_MONTHS[hMonth - 1]} {hYear}</Text>
          <Text style={s.yearText}>
            {firstDayGregorian.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
          </Text>
        </Animated.View>
        <TouchableOpacity style={s.navBtn} onPress={() => navigate(-1)}>
          <IconSymbol name="chevron.left" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Weekday headers */}
        <View style={s.weekRow}>
          {ARABIC_DAYS_SHORT.map(d => (
            <Text key={d} style={[s.weekDay, d === 'جمعة' && { color: colors.primary }]}>{d}</Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={s.calGrid}>
          {renderCalendar()}
        </View>

        {/* Selected Day Info */}
        <View style={s.selectedCard}>
          <Text style={s.selectedDate}>
            {ARABIC_DAYS[selectedGregorian.getDay()]} {selectedDay} {HIJRI_MONTHS[hMonth - 1]} {hYear} هـ
          </Text>
          <Text style={s.selectedGreg}>
            {selectedGregorian.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
          {selectedEvents.map(ev => (
            <TouchableOpacity key={ev.name} style={[s.eventItem, { backgroundColor: ev.color + '12' }]} onPress={() => setSelectedEvent(ev)}>
              <Text style={s.eventIcon}>{ev.icon}</Text>
              <Text style={[s.eventName, { color: ev.color }]}>{ev.name}</Text>
              <IconSymbol name="chevron.left" size={14} color={ev.color} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Converter */}
        {showConverter && (
          <View style={s.convCard}>
            <Text style={s.convTitle}>📅 محوّل التواريخ — اليوم</Text>
            <View style={s.convRow}>
              <Text style={s.convLabel}>ميلادي</Text>
              <Text style={s.convValue}>{today.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
            <View style={s.convRow}>
              <Text style={s.convLabel}>هجري</Text>
              <Text style={[s.convValue, { color: colors.primary }]}>{todayHijri[2]} {HIJRI_MONTHS[todayHijri[1] - 1]} {todayHijri[0]} هـ</Text>
            </View>
            <View style={s.convRow}>
              <Text style={s.convLabel}>اليوم المختار</Text>
              <Text style={s.convValue}>{selectedDay} {HIJRI_MONTHS[hMonth - 1]} {hYear} هـ</Text>
            </View>
            <View style={s.convRow}>
              <Text style={s.convLabel}>يوافقه ميلادياً</Text>
              <Text style={[s.convValue, { color: colors.primary }]}>
                {selectedGregorian.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>
          </View>
        )}

        {/* Upcoming Events */}
        <Text style={s.sectionTitle}>📅 المناسبات القادمة</Text>
        {upcomingEvents.map((ev, i) => (
          <TouchableOpacity key={i} style={s.upcomingItem} onPress={() => setSelectedEvent(ev)} activeOpacity={0.7}>
            <View style={[s.upcomingDiff, { backgroundColor: ev.diff === 0 ? '#DC2626' : colors.primary }]}>
              <Text style={s.upcomingDiffText}>{ev.diff === 0 ? 'اليوم!' : `${ev.diff}د`}</Text>
            </View>
            <View style={s.upcomingInfo}>
              <Text style={s.upcomingName}>{ev.name}</Text>
              <Text style={s.upcomingDate}>{ev.day} {HIJRI_MONTHS[ev.month - 1]} • {ev.evDate.toLocaleDateString('ar-EG')}</Text>
            </View>
            <Text style={s.upcomingIcon}>{ev.icon}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Event Detail Modal */}
      <Modal visible={!!selectedEvent} transparent animationType="slide" onRequestClose={() => setSelectedEvent(null)}>
        <TouchableOpacity style={s.modalWrap} activeOpacity={1} onPress={() => setSelectedEvent(null)}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            {selectedEvent && (<>
              <Text style={s.modalEventIcon}>{selectedEvent.icon}</Text>
              <Text style={[s.modalTitle, { color: selectedEvent.color }]}>{selectedEvent.name}</Text>
              <Text style={s.modalDesc}>{selectedEvent.description}</Text>
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
