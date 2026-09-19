import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fontBold, fontMedium, fontSemiBold } from '@/lib/fonts';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { uiText } from '@/lib/ui-text';
import { getLanguage } from '@/lib/i18n';
import { gregorianToHijri } from '@/lib/hijri-date';

interface SuhoorDatePickerProps {
  visible: boolean;
  selectedDates: string[];
  onClose: () => void;
  onChange: (dates: string[]) => void;
}

const WEEKDAYS_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// How far ahead the quick-pick presets look when collecting matching dates.
const QUICK_RANGE_DAYS = 60;

/** Collect all dates in the next QUICK_RANGE_DAYS matching the given JS weekdays (0=Sun). */
function datesForWeekdays(weekdays: number[]): string[] {
  const out: string[] = [];
  const today = startOfToday();
  for (let i = 0; i < QUICK_RANGE_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (weekdays.includes(d.getDay())) {
      out.push(toDateStr(d.getFullYear(), d.getMonth(), d.getDate()));
    }
  }
  return out;
}

/** Collect the White Days (13/14/15 Hijri) falling in the next QUICK_RANGE_DAYS. */
function datesForWhiteDays(): string[] {
  const out: string[] = [];
  const today = startOfToday();
  for (let i = 0; i < QUICK_RANGE_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    try {
      const h = gregorianToHijri(d).day;
      if (h === 13 || h === 14 || h === 15) {
        out.push(toDateStr(d.getFullYear(), d.getMonth(), d.getDate()));
      }
    } catch {}
  }
  return out;
}

/**
 * Collect dates matching a specific Hijri month (1-12) + day list, scanning a
 * full year ahead (annual occasions like Ashura / 6 of Shawwal can be months
 * away). The scheduler only arms the nearest dates, but storing them ahead is fine.
 */
function datesForHijriOccasion(hijriMonth: number, hijriDays: number[]): string[] {
  const out: string[] = [];
  const today = startOfToday();
  for (let i = 0; i < 400; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    try {
      const h = gregorianToHijri(d);
      if (h.month === hijriMonth && hijriDays.includes(h.day)) {
        out.push(toDateStr(d.getFullYear(), d.getMonth(), d.getDate()));
      }
    } catch {}
  }
  return out;
}

export function SuhoorDatePicker({
  visible,
  selectedDates,
  onClose,
  onChange,
}: SuhoorDatePickerProps) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const isAr = getLanguage() === 'ar';
  const isDarkMode = (colors as any).isDarkMode as boolean;

  const today = startOfToday();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const selected = useMemo(() => new Set(selectedDates), [selectedDates]);

  // Build the day grid for the visible month (with leading blanks).
  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    Haptics.selectionAsync().catch(() => {});
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    Haptics.selectionAsync().catch(() => {});
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const toggleDay = (day: number) => {
    const dateStr = toDateStr(viewYear, viewMonth, day);
    const dayDate = new Date(viewYear, viewMonth, day);
    if (dayDate.getTime() < today.getTime()) return; // ignore past
    Haptics.selectionAsync().catch(() => {});
    const next = new Set(selected);
    if (next.has(dateStr)) next.delete(dateStr);
    else next.add(dateStr);
    onChange(Array.from(next).sort());
  };

  const clearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onChange([]);
  };

  // Quick presets merge their matching dates into the current selection.
  const addDates = (newDates: string[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const merged = new Set([...selectedDates, ...newDates]);
    onChange(Array.from(merged).sort());
  };

  const weekdays = isAr ? WEEKDAYS_AR : WEEKDAYS_EN;
  const orderedWeekdays = isRTL ? [...weekdays].reverse() : weekdays;
  const monthLabel = `${(isAr ? MONTHS_AR : MONTHS_EN)[viewMonth]} ${viewYear}`;
  const futureSelectedCount = selectedDates.filter((d) => {
    const dt = new Date(`${d}T00:00:00`);
    return dt.getTime() >= today.getTime();
  }).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.modalSurface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={90}
              tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={styles.handle} />

          <Text style={[styles.title, { color: colors.text }]}>
            {uiText({ ar: 'اختر أيام الصيام', en: 'Choose fasting days' })}
          </Text>

          {/* Quick presets — flex-wrap so they read right-to-left and never need
              horizontal scrolling (avoids RTL scroll-position issues). */}
          <View style={[styles.quickRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {[
              { label: uiText({ ar: 'إثنين وخميس', en: 'Mon & Thu' }), onPress: () => addDates(datesForWeekdays([1, 4])) },
              { label: uiText({ ar: 'الأيام البيض', en: 'White Days' }), onPress: () => addDates(datesForWhiteDays()) },
              { label: uiText({ ar: 'الست من شوال', en: '6 of Shawwal' }), onPress: () => addDates(datesForHijriOccasion(10, [2, 3, 4, 5, 6, 7])) },
              { label: uiText({ ar: 'تاسوعاء وعاشوراء', en: 'Tasua & Ashura' }), onPress: () => addDates(datesForHijriOccasion(1, [9, 10])) },
            ].map((p) => (
              <TouchableOpacity
                key={p.label}
                style={[styles.quickChip, { borderColor: colors.primary }]}
                onPress={p.onPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickChipText, { color: colors.primary }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Month nav */}
          <View style={[styles.monthNav, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={isRTL ? goNextMonth : goPrevMonth} style={styles.navBtn}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
            <TouchableOpacity onPress={isRTL ? goPrevMonth : goNextMonth} style={styles.navBtn}>
              <MaterialCommunityIcons name="chevron-right" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Weekday header */}
          <View style={[styles.weekRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {orderedWeekdays.map((wd) => (
              <Text key={wd} style={[styles.weekday, { color: colors.textLight }]}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Day grid */}
          <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
            <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {cells.map((day, idx) => {
                if (day === null) {
                  return <View key={`blank-${idx}`} style={styles.cell} />;
                }
                const dateStr = toDateStr(viewYear, viewMonth, day);
                const dayDate = new Date(viewYear, viewMonth, day);
                const isPast = dayDate.getTime() < today.getTime();
                const isSelected = selected.has(dateStr);
                const hijriDay = (() => {
                  try {
                    return gregorianToHijri(dayDate).day;
                  } catch {
                    return null;
                  }
                })();

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={styles.cell}
                    onPress={() => toggleDay(day)}
                    disabled={isPast}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.dayInner,
                        isSelected && { backgroundColor: colors.primary },
                        isPast && { opacity: 0.3 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          { color: isSelected ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {day}
                      </Text>
                      {hijriDay != null && (
                        <Text
                          style={[
                            styles.hijriNum,
                            { color: isSelected ? 'rgba(255,255,255,0.85)' : colors.textLight },
                          ]}
                        >
                          {hijriDay}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={clearAll} style={styles.clearBtn} activeOpacity={0.7}>
              <Text style={[styles.clearText, { color: colors.textLight }]}>
                {uiText({ ar: 'مسح الكل', en: 'Clear all' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Text style={styles.doneText}>
                {uiText({ ar: `تم (${futureSelectedCount})`, en: `Done (${futureSelectedCount})` })}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '82%',
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.4)',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontFamily: fontBold(), textAlign: 'center', marginBottom: 12 },
  quickRow: { flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, paddingBottom: 12 },
  quickChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickChipText: { fontSize: 13, fontFamily: fontSemiBold() },
  monthNav: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 16, fontFamily: fontSemiBold() },
  weekRow: { marginBottom: 6 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: fontMedium() },
  gridScroll: { maxHeight: 320 },
  grid: { flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  dayInner: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dayNum: { fontSize: 15, fontFamily: fontSemiBold(), writingDirection: 'ltr' },
  hijriNum: { fontSize: 9, fontFamily: fontMedium(), writingDirection: 'ltr' },
  footer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 12,
  },
  clearBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  clearText: { fontSize: 14, fontFamily: fontSemiBold() },
  doneBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneText: { fontSize: 15, fontFamily: fontBold(), color: '#FFFFFF' },
});
