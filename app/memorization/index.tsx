// app/memorization/index.tsx
// شاشة Hub رئيسية لوضع الحفظ — تعرض ورد اليوم + 4 أوضاع + إحصائيات سريعة.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useMemorization } from '@/contexts/MemorizationContext';
import { GlassCard, UniversalHeader } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { mt } from '@/lib/memorization-i18n';
import { getSurahName, toArabicDigits } from '@/lib/memorization-helpers';
import { DurationRing } from '@/components/memorization/DurationRing';
import { StatsTimeline } from '@/components/memorization/StatsTimeline';
import { rtlChevronForward } from '@/lib/rtl-utils';
interface ModeCardData {
  mode: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  titleKey: string;
  descKey: string;
  route: string;
}

const MODES: ModeCardData[] = [
  { mode: 'learn', icon: 'school-outline', titleKey: 'modeLearn', descKey: 'modeLearnDesc', route: '/memorization/learn' },
  { mode: 'hide', icon: 'eye-off-outline', titleKey: 'modeHide', descKey: 'modeHideDesc', route: '/memorization/hide' },
  { mode: 'test', icon: 'help-circle-outline', titleKey: 'modeTest', descKey: 'modeTestDesc', route: '/memorization/test' },
  { mode: 'review', icon: 'refresh', titleKey: 'modeReview', descKey: 'modeReviewDesc', route: '/memorization/review' },
  { mode: 'mistakes', icon: 'alert-circle-outline', titleKey: 'mistakesTitle', descKey: 'mistakesDesc', route: '/memorization/mistakes' },
];

export default function MemorizationHub() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const isRTL = useIsRTL();
  const { activePlan, todayPlan, stats, streak, ayahStates, isLoading } = useMemorization();

  const goNew = useCallback(() => router.push('/memorization/new'), [router]);
  const goProgress = useCallback(
    () => router.push('/memorization/progress'),
    [router],
  );

  // Snapshot today's initial counts so the rings shrink as the user completes ayahs.
  // Stored in AsyncStorage keyed by date so it survives re-renders / app restarts.
  const todayKey = todayPlan.date;
  const [initialCounts, setInitialCounts] = useState<{
    date: string;
    newAyahs: number;
    reviewAyahs: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const STORAGE_KEY = '@memorization_today_initial';
    const currentNew = todayPlan.newAyahs.length;
    const currentReview = todayPlan.reviewAyahs.length;

    (async () => {
      let stored: { date: string; newAyahs: number; reviewAyahs: number } | null = null;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            typeof parsed.date === 'string' &&
            typeof parsed.newAyahs === 'number' &&
            typeof parsed.reviewAyahs === 'number'
          ) {
            stored = parsed;
          }
        }
      } catch {
        stored = null;
      }

      // If the stored snapshot is for a different day, start fresh from current counts.
      // Otherwise keep the max(stored, current) so we always remember the day's high-water mark.
      const baseNew = stored && stored.date === todayKey ? stored.newAyahs : currentNew;
      const baseReview = stored && stored.date === todayKey ? stored.reviewAyahs : currentReview;
      const next = {
        date: todayKey,
        newAyahs: Math.max(baseNew, currentNew),
        reviewAyahs: Math.max(baseReview, currentReview),
      };

      if (
        !stored ||
        stored.date !== next.date ||
        stored.newAyahs !== next.newAyahs ||
        stored.reviewAyahs !== next.reviewAyahs
      ) {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage errors
        }
      }

      if (!cancelled) setInitialCounts(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [todayKey, todayPlan.newAyahs.length, todayPlan.reviewAyahs.length]);

  const initialNew = Math.max(initialCounts?.newAyahs ?? todayPlan.newAyahs.length, 1);
  const initialReview = Math.max(initialCounts?.reviewAyahs ?? todayPlan.reviewAyahs.length, 1);
  const mistakesCount = Object.values(ayahStates).filter(
    (state) => state.status === 'needs_review',
  ).length;
  const nextReviewLabel = useMemo(() => {
    if (todayPlan.reviewAyahs.length > 0) {
      return mt('reviewTodayCount', { n: toArabicDigits(todayPlan.reviewAyahs.length) });
    }
    const dates = Object.values(ayahStates)
      .filter((state) => state.status !== 'new')
      .map((state) => state.nextReviewDate)
      .filter(Boolean)
      .sort();
    const nextDate = dates[0];
    if (!nextDate) return mt('noReviewToday');
    const today = new Date(`${todayPlan.date}T00:00:00`);
    const next = new Date(`${nextDate}T00:00:00`);
    const diff = Math.round((next.getTime() - today.getTime()) / 86400000);
    if (diff <= 0) return mt('today');
    if (diff === 1) return mt('tomorrow');
    return mt('inDays', { n: toArabicDigits(diff) });
  }, [ayahStates, todayPlan.date, todayPlan.reviewAyahs.length]);

  const styles = makeStyles(colors, isRTL);

  return (
    <BackgroundWrapper
      backgroundKey={appSettings.display.appBackground}
      backgroundUrl={appSettings.display.appBackgroundUrl}
      opacity={appSettings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
      <UniversalHeader
        title={mt('hubTitle')}
        onBack={() => router.back()}
        rightActions={[
          {
            icon: 'chart-bar',
            onPress: goProgress,
          },
        ]}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Today's Wird */}
        <GlassCard style={styles.todayCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{mt('todayWird')}</Text>
            <MaterialCommunityIcons name="book-open-variant" size={22} color={colors.primary} />
          </View>

          {!activePlan ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{mt('noActivePlan')}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={goNew}>
                <Text style={styles.primaryBtnText}>{mt('startNewPlan')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.planName}>{activePlan.name}</Text>
              <View style={styles.todayRow}>
                <DurationRing
                  value={toArabicDigits(todayPlan.newAyahs.length)}
                  topLabel={mt('newAyahs')}
                  progress={todayPlan.newAyahs.length / initialNew}
                  size={104}
                  strokeWidth={7}
                  arcColor={colors.primary}
                />
                <DurationRing
                  value={toArabicDigits(todayPlan.reviewAyahs.length)}
                  topLabel={mt('reviewAyahs')}
                  progress={todayPlan.reviewAyahs.length / initialReview}
                  size={104}
                  strokeWidth={7}
                  arcColor={colors.accent}
                />
                <DurationRing
                  value={toArabicDigits(todayPlan.estimatedMinutes)}
                  topLabel={mt('durationLabel')}
                  bottomLabel={mt('minutesUnit')}
                  progress={Math.min(todayPlan.estimatedMinutes / 60, 1)}
                  size={104}
                  strokeWidth={7}
                />
              </View>
              <View style={styles.nextReviewBox}>
                <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.primary} />
                <Text style={styles.nextReviewText}>
                  {mt('nextReview')}: {nextReviewLabel}
                </Text>
              </View>
              {todayPlan.newAyahs.length === 0 && todayPlan.reviewAyahs.length === 0 ? (
                <Text style={styles.muted}>{mt('noAyahsToday')}</Text>
              ) : (
                <View style={styles.chipsBox}>
                  {groupAyahsBySurah(todayPlan.newAyahs).map((g) => (
                    <View
                      key={`n-${g.surahNumber}`}
                      style={[styles.chip, { borderColor: colors.primary + '55' }]}
                    >
                      <View style={[styles.chipDot, { backgroundColor: colors.primary }]} />
                      <Text style={styles.chipSurah} numberOfLines={1}>
                        {getSurahName(g.surahNumber)}
                      </Text>
                      <Text style={styles.chipAyahs} numberOfLines={1}>
                        {formatAyahNumbers(g.ayahNumbers)}
                      </Text>
                    </View>
                  ))}
                  {groupAyahsBySurah(todayPlan.reviewAyahs).map((g) => (
                    <View
                      key={`r-${g.surahNumber}`}
                      style={[styles.chip, { borderColor: colors.accent + '55' }]}
                    >
                      <View style={[styles.chipDot, { backgroundColor: colors.accent }]} />
                      <MaterialCommunityIcons
                        name="refresh"
                        size={12}
                        color={colors.accent}
                        style={{ marginHorizontal: 2 }}
                      />
                      <Text style={styles.chipSurah} numberOfLines={1}>
                        {getSurahName(g.surahNumber)}
                      </Text>
                      <Text style={styles.chipAyahs} numberOfLines={1}>
                        {formatAyahNumbers(g.ayahNumbers)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </GlassCard>

        {/* 4 Modes */}
        <View style={styles.modesGrid}>
          {MODES.map((m) => (
            <Pressable
              key={m.mode}
              style={({ pressed }) => [
                styles.modeCard,
                pressed && { opacity: 0.7 },
                !activePlan && styles.modeCardDisabled,
              ]}
              onPress={() => {
                if (!activePlan) {
                  goNew();
                  return;
                }
                router.push(m.route as any);
              }}
            >
              <MaterialCommunityIcons name={m.icon} size={32} color={colors.primary} />
              {m.mode === 'mistakes' && mistakesCount > 0 && (
                <View style={styles.mistakeBadge}>
                  <Text style={styles.mistakeBadgeText}>{toArabicDigits(mistakesCount)}</Text>
                </View>
              )}
              <Text style={styles.modeTitle}>{mt(m.titleKey)}</Text>
              <Text style={styles.modeDesc}>{mt(m.descKey)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Quick stats */}
        <GlassCard style={styles.statsCard}>
          <Text style={styles.cardTitle}>{mt('byTheNumbers')}</Text>
          <StatsTimeline
            items={[
              {
                icon: 'book-check-outline',
                label: mt('totalMemorized'),
                value: toArabicDigits(stats.totalMemorized),
              },
              {
                icon: 'fire',
                label: mt('currentStreak'),
                value: `${toArabicDigits(streak.current)} ${mt('daysUnit')}`,
              },
              {
                icon: 'trophy-outline',
                label: mt('surahsCompleted'),
                value: toArabicDigits(stats.totalSurahsCompleted),
              },
            ]}
          />
          <TouchableOpacity onPress={goProgress} style={styles.linkBtn}>
            <Text style={styles.linkText}>{mt('myProgress')}</Text>
            <MaterialCommunityIcons name={rtlChevronForward(isRTL) as any} size={18} color={colors.primary} />
          </TouchableOpacity>
        </GlassCard>

        {/* New plan button */}
        {activePlan && (
          <TouchableOpacity
            style={[styles.outlineBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={goNew}
          >
            <MaterialCommunityIcons name="plus-circle" size={18} color="#fff" />
            <Text style={[styles.outlineBtnText, { color: '#fff' }]}>{mt('newPlan')}</Text>
          </TouchableOpacity>
        )}

        {isLoading && <Text style={styles.muted}>...</Text>}
      </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

// تجميع الآيات حسب رقم السورة (يحافظ على ترتيب الورود).
function groupAyahsBySurah(
  ayahs: { surahNumber: number; ayahNumber: number }[],
): { surahNumber: number; ayahNumbers: number[] }[] {
  const map = new Map<number, number[]>();
  for (const a of ayahs) {
    const arr = map.get(a.surahNumber) ?? [];
    arr.push(a.ayahNumber);
    map.set(a.surahNumber, arr);
  }
  return Array.from(map.entries()).map(([surahNumber, ayahNumbers]) => ({
    surahNumber,
    ayahNumbers: [...ayahNumbers].sort((x, y) => x - y),
  }));
}

// تحويل قائمة أرقام إلى نص مختصر بالأرقام العربية مع دمج المتتاليات (٢-٤، ٧).
function formatAyahNumbers(nums: number[]): string {
  if (nums.length === 0) return '';
  const sorted = [...nums].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push(
      start === prev
        ? toArabicDigits(start)
        : `${toArabicDigits(start)}–${toArabicDigits(prev)}`,
    );
    if (cur !== undefined) {
      start = cur;
      prev = cur;
    }
  }
  return ranges.join('، ');
}

function Stat({
  colors,
  label,
  value,
  small,
}: {
  colors: ReturnType<typeof useColors>;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text
        style={{
          color: colors.text,
          fontFamily: 'Cairo-Bold',
          fontSize: small ? 14 : 18,
        }}
      >
        {value}
      </Text>
      {!!label && (
        <Text
          style={{
            color: colors.textLight,
            fontFamily: 'Cairo-Regular',
            fontSize: 11,
            marginTop: 2,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, isRTL: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 16, gap: 16, paddingBottom: 40 },
    todayCard: { padding: 16, gap: 12 },
    rowBetween: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitle: {
      color: colors.text,
      fontFamily: 'Cairo-Bold',
      fontSize: 16,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    planName: {
      color: colors.text,
      fontFamily: 'Cairo-SemiBold',
      fontSize: 14,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    emptyBox: { alignItems: 'center', gap: 12, paddingVertical: 12 },
    emptyText: { color: colors.textLight, fontFamily: 'Cairo-Regular', fontSize: 13 },
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
    },
    primaryBtnText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 14 },
    statsRow: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginTop: 8 },
    todayRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      gap: 8,
      marginTop: 8,
      flexWrap: 'wrap',
    },
    previewBox: { gap: 4, marginTop: 4 },
    previewLine: {
      color: colors.text,
      fontFamily: 'Cairo-Regular',
      fontSize: 13,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    nextReviewBox: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: 'rgba(13,142,98,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(13,142,98,0.28)',
    },
    nextReviewText: {
      color: colors.text,
      fontFamily: 'Cairo-SemiBold',
      fontSize: 13,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    chipsBox: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    chip: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: colors.isDark
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(0,0,0,0.03)',
    },
    chipDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    chipSurah: {
      color: colors.text,
      fontFamily: 'Cairo-SemiBold',
      fontSize: 12,
      writingDirection: 'rtl',
    },
    chipAyahs: {
      color: colors.textLight,
      fontFamily: 'Cairo-Regular',
      fontSize: 12,
      writingDirection: 'rtl',
    },
    muted: {
      color: colors.textLight,
      fontFamily: 'Cairo-Regular',
      fontSize: 12,
      textAlign: 'center',
      marginTop: 4,
    },
    modesGrid: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    modeCard: {
      flexBasis: '47%',
      flexGrow: 1,
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.cardSolid,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      position: 'relative',
    },
    mistakeBadge: {
      position: 'absolute',
      top: 10,
      [isRTL ? 'right' : 'left']: 10,
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#b00020',
      paddingHorizontal: 6,
    },
    mistakeBadgeText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 12 },
    modeCardDisabled: { opacity: 0.55 },
    modeTitle: {
      color: colors.text,
      fontFamily: 'Cairo-Bold',
      fontSize: 14,
      marginTop: 4,
    },
    modeDesc: {
      color: colors.textLight,
      fontFamily: 'Cairo-Regular',
      fontSize: 11,
      textAlign: 'center',
    },
    statsCard: { padding: 16, gap: 8 },
    linkBtn: {
      alignSelf: isRTL ? 'flex-end' : 'flex-start',
      marginTop: 8,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
    },
    linkText: { color: colors.primary, fontFamily: 'Cairo-SemiBold', fontSize: 13 },
    outlineBtn: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    outlineBtnText: { fontFamily: 'Cairo-Bold', fontSize: 14 },
  });
