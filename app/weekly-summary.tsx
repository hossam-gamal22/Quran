// app/weekly-summary.tsx
// صفحة حصاد العبادات الأسبوعي — تُفتح من إشعار التقرير الأسبوعي

import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenContainer } from '@/components/screen-container';
import { GlassCard, UniversalHeader } from '@/components/ui';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { localizeNumber } from '@/lib/format-number';
import { guardPremiumFeature } from '@/lib/premium-guard';
import { t, getDateLocale } from '@/lib/i18n';
import { usePremiumFeature } from '@/hooks/use-premium-feature';
import {
  formatDate,
  getAllAzkarRecords,
  getAllFastingRecords,
  getAllPrayerRecords,
  getAllQuranRecords,
  type DailyAzkarRecord,
  type DailyPrayerRecord,
  type PrayerName,
} from '@/lib/worship-storage';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';

const ACCENT = '#0d8e62';
const PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

type DayValue = {
  date: string;
  value: number;
  total?: number;
};

type WeeklyStats = {
  prayersDone: number;
  prayersTotal: number;
  perfectPrayerDays: number;
  fastingDays: number;
  quranPages: number;
  azkarDone: number;
  azkarDays: number;
  tasbihCount: number;
  prayerDays: DayValue[];
  fastingWeek: DayValue[];
  quranWeek: DayValue[];
  azkarWeek: DayValue[];
  tasbihWeek: DayValue[];
};

const emptyStats: WeeklyStats = {
  prayersDone: 0,
  prayersTotal: 35,
  perfectPrayerDays: 0,
  fastingDays: 0,
  quranPages: 0,
  azkarDone: 0,
  azkarDays: 0,
  tasbihCount: 0,
  prayerDays: [],
  fastingWeek: [],
  quranWeek: [],
  azkarWeek: [],
  tasbihWeek: [],
};

function getLastSevenDateKeys(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

function countPrayerRecord(record: DailyPrayerRecord): { done: number; perfect: boolean } {
  const done = PRAYERS.filter(p => record[p] === 'prayed' || record[p] === 'late').length;
  return { done, perfect: done === PRAYERS.length };
}

function countAzkarRecord(record: DailyAzkarRecord): number {
  return [record.morning, record.evening, record.sleep, record.wakeup, record.afterPrayer].filter(Boolean).length;
}

async function loadWeeklyStats(dateKeys: string[]): Promise<WeeklyStats> {
  const dateSet = new Set(dateKeys);
  const [prayerRecords, fastingRecords, quranRecords, azkarRecords, tasbihHistoryRaw, tasbihTypeStatsRaw] = await Promise.all([
    getAllPrayerRecords(),
    getAllFastingRecords(),
    getAllQuranRecords(),
    getAllAzkarRecords(),
    AsyncStorage.getItem('@tasbih_daily_history'),
    AsyncStorage.getItem('tasbih_type_stats'),
  ]);

  const stats: WeeklyStats = {
    ...emptyStats,
    prayerDays: [],
    fastingWeek: [],
    quranWeek: [],
    azkarWeek: [],
    tasbihWeek: [],
  };
  const tasbihByDate: Record<string, number> = Object.fromEntries(dateKeys.map(date => [date, 0]));

  for (const date of dateKeys) {
    const record = prayerRecords[date] || {
      date,
      fajr: 'none',
      dhuhr: 'none',
      asr: 'none',
      maghrib: 'none',
      isha: 'none',
    };
    const counted = countPrayerRecord(record);
    stats.prayersDone += counted.done;
    if (counted.perfect) stats.perfectPrayerDays += 1;
    stats.prayerDays.push({ date, value: counted.done, total: PRAYERS.length });
  }

  for (const date of dateKeys) {
    const fasted = fastingRecords[date]?.fasted ? 1 : 0;
    stats.fastingDays += fasted;
    stats.fastingWeek.push({ date, value: fasted, total: 1 });

    const pagesRead = Number(quranRecords[date]?.pagesRead) || 0;
    stats.quranPages += pagesRead;
    stats.quranWeek.push({ date, value: pagesRead });

    const azkar = azkarRecords[date];
    let azkarDone = 0;
    if (azkar) {
      const manualDone = countAzkarRecord(azkar);
      const zikrCount = Number(azkar.zikrCount) || 0;
      azkarDone = zikrCount > 0 ? zikrCount : manualDone;
      stats.azkarDone += azkarDone;
      if (manualDone > 0 || zikrCount > 0) stats.azkarDays += 1;
    }
    stats.azkarWeek.push({ date, value: azkarDone, total: 5 });
  }

  const addTasbihFromMap = (raw: string | null, skipDates = new Set<string>()) => {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      for (const [date, dayData] of Object.entries(parsed)) {
        if (!dateSet.has(date) || skipDates.has(date) || !dayData || typeof dayData !== 'object') continue;
        for (const count of Object.values(dayData as Record<string, number>)) {
          tasbihByDate[date] = (tasbihByDate[date] || 0) + (typeof count === 'number' ? count : 0);
        }
      }
    } catch {}
  };

  const historyDates = new Set<string>();
  if (tasbihHistoryRaw) {
    try {
      const history = JSON.parse(tasbihHistoryRaw);
      Object.keys(history || {}).forEach(date => historyDates.add(date));
    } catch {}
  }
  addTasbihFromMap(tasbihHistoryRaw);
  addTasbihFromMap(tasbihTypeStatsRaw, historyDates);

  for (const date of dateKeys) {
    const value = tasbihByDate[date] || 0;
    stats.tasbihCount += value;
    stats.tasbihWeek.push({ date, value });
  }

  return stats;
}

function SummaryCard({
  icon,
  color,
  title,
  value,
  subtitle,
  delay,
  details,
  detailsLocked,
  onLockPress,
  isRTL,
  textColor,
  mutedColor,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  title: string;
  value: string;
  subtitle: string;
  delay: number;
  details?: Array<{ label: string; value: string; done: boolean }>;
  detailsLocked?: boolean;
  onLockPress?: () => void;
  isRTL: boolean;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <GlassCard style={styles.card}>
        <View style={[styles.cardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
            <MaterialCommunityIcons name={icon} size={24} color={color} />
          </View>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, { color: textColor, textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
            <Text style={[styles.cardSubtitle, { color: mutedColor, textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>
          </View>
          <Text style={[styles.cardValue, { color }]}>{value}</Text>
        </View>
        {details && details.length > 0 && (
          <View style={styles.detailsContainer}>
            {details.map((item, index) => (
              <View key={`${item.label}-${index}`} style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons
                  name={item.done ? 'check-circle' : 'circle-outline'}
                  size={17}
                  color={item.done ? color : mutedColor}
                />
                <Text style={[styles.detailLabel, { color: item.done ? textColor : mutedColor, textAlign: isRTL ? 'right' : 'left' }]}>
                  {item.label}
                </Text>
                <Text style={[styles.detailValue, { color: item.done ? color : mutedColor, textAlign: isRTL ? 'left' : 'right' }]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        )}
        {detailsLocked && (
          <TouchableOpacity
            style={[styles.lockedDetails, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.78}
            onPress={onLockPress}
          >
            <MaterialCommunityIcons name="lock" size={20} color={mutedColor} />
            <Text style={[styles.lockedDetailsText, { color: mutedColor }]}>
              {t('common.premiumFeature') || 'تفاصيل مميزة'}
            </Text>
          </TouchableOpacity>
        )}
      </GlassCard>
    </Animated.View>
  );
}

export default function WeeklySummaryScreen() {
  const router = useRouter();
  const colors = useColors();
  const isRTL = useIsRTL();
  const { isPremium } = useSubscription();
  const { isLocked: statsLocked } = usePremiumFeature('advanced_stats');
  const handleStatsLockPress = () => { guardPremiumFeature('advanced_stats', router, isPremium); };
  const [stats, setStats] = useState<WeeklyStats>(emptyStats);
  const dateKeys = useMemo(getLastSevenDateKeys, []);

  useEffect(() => {
    loadWeeklyStats(dateKeys).then(setStats).catch(() => setStats(emptyStats));
  }, [dateKeys]);

  const locale = getDateLocale();
  const start = new Date(`${dateKeys[0]}T00:00:00`);
  const end = new Date(`${dateKeys[dateKeys.length - 1]}T00:00:00`);
  const dateRange = `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
  const prayerPercent = Math.round((stats.prayersDone / Math.max(stats.prayersTotal, 1)) * 100);
  const prayerDays = stats.prayerDays ?? [];
  const fastingWeek = stats.fastingWeek ?? [];
  const quranWeek = stats.quranWeek ?? [];
  const azkarWeek = stats.azkarWeek ?? [];
  const tasbihWeek = stats.tasbihWeek ?? [];
  const activeDays = new Set([
    ...prayerDays.filter(day => day.value > 0).map(day => day.date),
    ...fastingWeek.filter(day => day.value > 0).map(day => day.date),
    ...quranWeek.filter(day => day.value > 0).map(day => day.date),
    ...azkarWeek.filter(day => day.value > 0).map(day => day.date),
    ...tasbihWeek.filter(day => day.value > 0).map(day => day.date),
  ]).size;
  const formatDayLabel = (date: string) => {
    const d = new Date(`${date}T00:00:00`);
    return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <ScreenContainer>
      <UniversalHeader title={t('worship.weeklyReport') || 'الحصاد الأسبوعي'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={[styles.headerCircle, { backgroundColor: `${ACCENT}20` }]}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={48} color={ACCENT} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('worship.weeklyReport') || 'الحصاد الأسبوعي'}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{dateRange}</Text>
        </Animated.View>

        <SummaryCard
          icon="mosque"
          color="#c17f59"
          title={t('worship.prayerTracker')}
          value={`${localizeNumber(stats.prayersDone)}/${localizeNumber(stats.prayersTotal)}`}
          subtitle={`${localizeNumber(prayerPercent)}% - ${localizeNumber(stats.perfectPrayerDays)} ${t('home.days')}`}
          delay={100}
          details={prayerDays.map(day => ({
            label: formatDayLabel(day.date),
            value: `${localizeNumber(day.value)}/${localizeNumber(day.total || 5)}`,
            done: day.value === (day.total || 5),
          }))}
          isRTL={isRTL}
          textColor={colors.text}
          mutedColor={colors.textSecondary}
        />
        <SummaryCard
          icon="food-off"
          color="#4a3d73"
          title={t('worship.fastingTracker')}
          value={localizeNumber(stats.fastingDays)}
          subtitle={t('worship.totalDays')}
          delay={180}
          details={statsLocked ? undefined : fastingWeek.map(day => ({
            label: formatDayLabel(day.date),
            value: day.value > 0 ? (t('worship.youAreFasting') || 'صائم') : (t('worship.notRecorded') || 'لم يسجل'),
            done: day.value > 0,
          }))}
          detailsLocked={statsLocked}
          onLockPress={handleStatsLockPress}
          isRTL={isRTL}
          textColor={colors.text}
          mutedColor={colors.textSecondary}
        />
        <SummaryCard
          icon="book-open-page-variant"
          color="#3a7ca5"
          title={t('worship.quranTracker')}
          value={localizeNumber(stats.quranPages)}
          subtitle={t('worship.totalPages')}
          delay={260}
          details={statsLocked ? undefined : quranWeek.map(day => ({
            label: formatDayLabel(day.date),
            value: `${localizeNumber(day.value)} ${t('worship.pages')}`,
            done: day.value > 0,
          }))}
          detailsLocked={statsLocked}
          onLockPress={handleStatsLockPress}
          isRTL={isRTL}
          textColor={colors.text}
          mutedColor={colors.textSecondary}
        />
        <SummaryCard
          icon="hand-heart"
          color="#0d8e62"
          title={t('worship.azkarTracker')}
          value={localizeNumber(stats.azkarDone)}
          subtitle={`${localizeNumber(stats.azkarDays)} ${t('home.days')}`}
          delay={340}
          details={statsLocked ? undefined : azkarWeek.map(day => ({
            label: formatDayLabel(day.date),
            value: `${localizeNumber(day.value)}/${localizeNumber(day.total || 5)}`,
            done: day.value > 0,
          }))}
          detailsLocked={statsLocked}
          onLockPress={handleStatsLockPress}
          isRTL={isRTL}
          textColor={colors.text}
          mutedColor={colors.textSecondary}
        />
        <SummaryCard
          icon="counter"
          color="#d4a017"
          title={t('tabs.tasbih') || 'التسبيح'}
          value={localizeNumber(stats.tasbihCount)}
          subtitle={t('worship.weeklyReportDesc')}
          delay={420}
          details={statsLocked ? undefined : tasbihWeek.map(day => ({
            label: formatDayLabel(day.date),
            value: localizeNumber(day.value),
            done: day.value > 0,
          }))}
          detailsLocked={statsLocked}
          onLockPress={handleStatsLockPress}
          isRTL={isRTL}
          textColor={colors.text}
          mutedColor={colors.textSecondary}
        />

        <GlassCard style={styles.highlightCard}>
          <Text style={[styles.highlightTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('worship.yourStats')}
          </Text>
          <Text style={[styles.highlightText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {activeDays > 0
              ? `نشاطك ظهر في ${localizeNumber(activeDays)} ${t('home.days')} هذا الأسبوع: ${localizeNumber(stats.prayersDone)} صلاة، ${localizeNumber(stats.quranPages)} صفحة قرآن، ${localizeNumber(stats.fastingDays)} أيام صيام، ${localizeNumber(stats.azkarDone)} ذكر، و${localizeNumber(stats.tasbihCount)} تسبيحة.`
              : 'لم يتم تسجيل نشاط هذا الأسبوع بعد. ابدأ بتسجيل عباداتك ليظهر الحصاد هنا بالتفصيل.'}
          </Text>
        </GlassCard>

        <TouchableOpacity
          style={[styles.detailsButton, { backgroundColor: ACCENT, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/worship-tracker' as any);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.detailsButtonText}>{t('worship.viewDetails') || 'عرض التفاصيل'}</Text>
          <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fontBold(),
    textAlign: 'center',
    lineHeight: 34,
    includeFontPadding: false,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 22,
    includeFontPadding: false,
  },
  card: {
    marginBottom: 12,
    padding: 16,
  },
  cardRow: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
    marginHorizontal: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 2,
    lineHeight: 22,
    includeFontPadding: false,
  },
  cardValue: {
    fontSize: 22,
    fontFamily: fontBold(),
    lineHeight: 34,
    includeFontPadding: false,
  },
  detailsContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.22)',
    gap: 8,
  },
  detailRow: {
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  detailValue: {
    minWidth: 70,
    fontSize: 12,
    fontFamily: fontSemiBold(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  lockedDetails: {
    marginTop: 14,
    paddingTop: 12,
    paddingBottom: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockedDetailsText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  highlightCard: {
    marginTop: 4,
    padding: 16,
  },
  highlightTitle: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  highlightText: {
    fontSize: 14,
    fontFamily: fontRegular(),
    marginTop: 6,
    lineHeight: 24,
  },
  detailsButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fontSemiBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
});
