// app/memorization/progress.tsx
// لوحة تقدّم الحفظ — إحصائيات + أشرطة لكل سورة + سجل آخر 30 يومًا.

import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { GlassCard, UniversalHeader } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { useMemorization } from '@/contexts/MemorizationContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { mt } from '@/lib/memorization-i18n';
import { formatSurahAyahLabel, getSurahName, getAyahCount, toArabicDigits } from '@/lib/memorization-helpers';

export default function ProgressScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const isRTL = useIsRTL();
  const { stats, streak, ayahStates } = useMemorization();

  const styles = makeStyles(colors, isRTL);

  const surahRows = useMemo(() => {
    return Object.keys(stats.perSurahProgress)
      .map((s) => {
        const num = Number(s);
        const v = stats.perSurahProgress[num];
        const total = getAyahCount(num) || v.total || 1;
        return {
          num,
          memorized: v.memorized,
          total,
          ratio: Math.min(1, v.memorized / total),
        };
      })
      .sort((a, b) => b.ratio - a.ratio);
  }, [stats.perSurahProgress]);

  // 30-day grid: derive "active days" from ayahStates lastReviewDate counts
  const activityDays = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const k in ayahStates) {
      const d = ayahStates[k]?.lastReviewDate;
      if (d) counts[d] = (counts[d] || 0) + 1;
    }
    const today = new Date();
    const days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      // استخدم التاريخ المحلي (ليس UTC) لتجنب إزاحة يوم في بعض التوقيتات.
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: iso, count: counts[iso] || 0 });
    }
    return days;
  }, [ayahStates]);

  const maxCount = Math.max(1, ...activityDays.map((d) => d.count));

  return (
    <BackgroundWrapper
      backgroundKey={appSettings.display.appBackground}
      backgroundUrl={appSettings.display.appBackgroundUrl}
      opacity={appSettings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <UniversalHeader title={mt('progressTitle')} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* KPI cards */}
          <View style={styles.kpiRow}>
            <KpiCard
              icon="bookmark-check"
              value={stats.totalMemorized}
              label={mt('totalMemorized')}
              color={colors.primary}
            />
            <KpiCard
              icon="book-check"
              value={stats.totalSurahsCompleted}
              label={mt('surahsCompleted')}
              color="#0d8e62"
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="fire"
              value={streak.current}
              label={mt('currentStreak')}
              color="#e58a00"
            />
            <KpiCard
              icon="trophy"
              value={streak.best}
              label={mt('bestStreak')}
              color="#a07b00"
            />
          </View>

          {/* 30-day heatmap */}
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>آخر 30 يومًا</Text>
            <View style={styles.heatRow}>
              {activityDays.map((d, idx) => {
                const isToday = idx === activityDays.length - 1;
                const intensity = d.count === 0 ? 0 : Math.max(0.2, d.count / maxCount);
                return (
                  <View
                    key={d.date}
                    style={[
                      styles.heatCell,
                      {
                        backgroundColor:
                          d.count === 0
                            ? 'rgba(127,127,127,0.2)'
                            : `rgba(13,142,98,${intensity})`,
                      },
                      isToday && styles.heatCellToday,
                    ]}
                  />
                );
              })}
            </View>
          </GlassCard>

          {/* Per-surah progress */}
          <GlassCard style={styles.section}>
            <Text style={styles.sectionTitle}>التقدّم لكل سورة</Text>
            {surahRows.length === 0 ? (
              <Text style={styles.empty}>{mt('noProgressYet') || 'لا يوجد تقدّم بعد'}</Text>
            ) : (
              surahRows.map((row) => (
                <View key={row.num} style={styles.surahRow}>
                  <View style={styles.surahHeader}>
                    <Text style={styles.surahName}>{getSurahName(row.num)}</Text>
                    <Text style={styles.surahCount}>
                      {`${toArabicDigits(row.memorized)} / ${toArabicDigits(row.total)}`}
                    </Text>
                  </View>
                  <View style={styles.barBg}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${row.ratio * 100}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
            )}
          </GlassCard>

          {/* Weak ayahs */}
          {stats.weakAyahs.length > 0 ? (
            <GlassCard style={styles.section}>
              <Text style={styles.sectionTitle}>{mt('weakAyahs')}</Text>
              {stats.weakAyahs.map((w) => (
                <TouchableOpacity
                  key={`${w.surahNumber}:${w.ayahNumber}`}
                  style={styles.weakRow}
                  onPress={() => router.push(`/surah/${w.surahNumber}?ayah=${w.ayahNumber}`)}
                >
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#b00020" />
                  <Text style={styles.weakText}>
                    {formatSurahAyahLabel(w.surahNumber, w.ayahNumber)}
                  </Text>
                  <Text style={styles.weakFail}>{`×${toArabicDigits(w.failures)}`}</Text>
                </TouchableOpacity>
              ))}
            </GlassCard>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

function KpiCard({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  value: number;
  label: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <GlassCard style={kpiStyles.card}>
      <MaterialCommunityIcons name={icon} size={28} color={color} />
      <Text style={[kpiStyles.value, { color: colors.text }]}>{toArabicDigits(value)}</Text>
      <Text style={[kpiStyles.label, { color: colors.textLight }]}>{label}</Text>
    </GlassCard>
  );
}

const kpiStyles = StyleSheet.create({
  card: { flex: 1, padding: 14, alignItems: 'center', gap: 4 },
  value: { fontFamily: 'Cairo-Bold', fontSize: 22 },
  label: { fontFamily: 'Cairo-Regular', fontSize: 12, textAlign: 'center' },
});

const makeStyles = (colors: ReturnType<typeof useColors>, isRTL: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 16, gap: 14, paddingBottom: 60 },
    kpiRow: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 },
    section: { padding: 14, gap: 10 },
    sectionTitle: {
      color: colors.text,
      fontFamily: 'Cairo-Bold',
      fontSize: 15,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    empty: { color: colors.textLight, fontFamily: 'Cairo-Regular', fontSize: 13, textAlign: 'center' },
    heatRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4 },
    heatCell: { width: 22, height: 22, borderRadius: 4 },
    heatCellToday: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    surahRow: { gap: 6, paddingVertical: 6 },
    surahHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' },
    surahName: { color: colors.text, fontFamily: 'Cairo-SemiBold', fontSize: 13 },
    surahCount: { color: colors.textLight, fontFamily: 'Cairo-Regular', fontSize: 12 },
    barBg: { height: 8, borderRadius: 4, backgroundColor: 'rgba(127,127,127,0.2)', overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    weakRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(127,127,127,0.2)',
    },
    weakText: {
      flex: 1,
      color: colors.text,
      fontFamily: 'Cairo-SemiBold',
      fontSize: 13,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    weakFail: { color: '#b00020', fontFamily: 'Cairo-Bold', fontSize: 12 },
  });
