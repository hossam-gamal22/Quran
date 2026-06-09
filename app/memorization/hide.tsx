// app/memorization/hide.tsx
// وضع الإخفاء التدريجي — 4 مستويات (25/50/75/100%) لإخفاء الكلمات. اضغط مطولًا لكشف كلمة.

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
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
import { formatAyahMarker, formatAyahProgress, getAyahText, getSurahName } from '@/lib/memorization-helpers';
import { pickHiddenIndices } from '@/lib/memorization-test-builders';
import { rtlChevronBack, rtlChevronForward } from '@/lib/rtl-utils';
import type { AyahRef } from '@/types/memorization';

type HideLevel = 1 | 2 | 3 | 4;

export default function HideScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const isRTL = useIsRTL();
  const { activePlan, todayPlan, markPassed, markFailed, isTodayReady } =
    useMemorization();

  // Freeze today's ward ONCE for this session so marking ayahs (which mutates
  // the live todayPlan) cannot shrink/reorder the list mid-walk and skip ayahs.
  const [ayahs, setAyahs] = useState<AyahRef[] | null>(null);
  useEffect(() => {
    if (ayahs === null && isTodayReady && activePlan) {
      setAyahs([...todayPlan.newAyahs, ...todayPlan.reviewAyahs]);
    }
  }, [ayahs, isTodayReady, activePlan, todayPlan.newAyahs, todayPlan.reviewAyahs]);

  const [index, setIndex] = useState(0);
  const [level, setLevel] = useState<HideLevel>(1);
  const [revealedAll, setRevealedAll] = useState(false);
  const [peekIndex, setPeekIndex] = useState<number | null>(null);
  const busyRef = useRef(false);

  const current = ayahs ? ayahs[index] : undefined;

  const ayahWords = useMemo(() => {
    if (!current) return [];
    return getAyahText(current.surahNumber, current.ayahNumber)
      .split(/\s+/)
      .filter(Boolean);
  }, [current]);

  const hiddenIndices = useMemo(() => {
    if (!current) return new Set<number>();
    return pickHiddenIndices(current.surahNumber, current.ayahNumber, level, ayahWords.length);
  }, [current, level, ayahWords.length]);

  const hiddenCount = hiddenIndices.size;

  const onNext = useCallback(() => {
    setRevealedAll(false);
    setPeekIndex(null);
    setIndex((i) => Math.min((ayahs?.length ?? 1) - 1, i + 1));
  }, [ayahs]);

  const onPrev = useCallback(() => {
    setRevealedAll(false);
    setPeekIndex(null);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const onPass = useCallback(async () => {
    if (!current || busyRef.current) return;
    busyRef.current = true;
    try {
      await markPassed(current.surahNumber, current.ayahNumber);
      onNext();
    } finally {
      busyRef.current = false;
    }
  }, [current, markPassed, onNext]);

  const onFail = useCallback(async () => {
    if (!current || busyRef.current) return;
    busyRef.current = true;
    try {
      await markFailed(current.surahNumber, current.ayahNumber);
      onNext();
    } finally {
      busyRef.current = false;
    }
  }, [current, markFailed, onNext]);

  const styles = makeStyles(colors, isRTL);

  if (!activePlan || ayahs === null || !current) {
    return (
      <BackgroundWrapper
        backgroundKey={appSettings.display.appBackground}
        backgroundUrl={appSettings.display.appBackgroundUrl}
        opacity={appSettings.display.backgroundOpacity ?? 1}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safe} edges={['top']}>
          <UniversalHeader title={mt('hideTitle')} onBack={() => router.back()} />
          <View style={styles.empty}>
            {ayahs === null && activePlan ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.emptyText}>
                {!activePlan ? mt('noActivePlan') : mt('noAyahsToday')}
              </Text>
            )}
          </View>
        </SafeAreaView>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper
      backgroundKey={appSettings.display.appBackground}
      backgroundUrl={appSettings.display.appBackgroundUrl}
      opacity={appSettings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <UniversalHeader title={mt('hideTitle')} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.position}>
            {mt('ayahOf', { n: index + 1, total: ayahs.length })} • {getSurahName(current.surahNumber)}
          </Text>

          {/* Level selector */}
          <View style={styles.levelRow}>
            {([1, 2, 3, 4] as HideLevel[]).map((lv) => {
              const labelKey = `hideLevel${lv}`;
              const active = level === lv;
              return (
                <TouchableOpacity
                  key={lv}
                  onPress={() => {
                    setLevel(lv);
                    setRevealedAll(false);
                  }}
                  style={[
                    styles.levelChip,
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? '#fff' : colors.text,
                      fontFamily: 'Rubik-SemiBold',
                      fontSize: 12,
                    }}
                  >
                    {mt(labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Ayah display */}
          <GlassCard style={styles.quranCard}>
            <View style={styles.wordsWrap}>
              {ayahWords.map((w, i) => {
                const hidden = !revealedAll && hiddenIndices.has(i) && peekIndex !== i;
                const hiddenWidth = Math.min(128, Math.max(44, w.length * 17));
                return (
                  <Pressable
                    key={`${i}-${w}`}
                    onLongPress={() => setPeekIndex(i)}
                    onPressOut={() => setPeekIndex(null)}
                    delayLongPress={150}
                    style={[
                      styles.wordSlot,
                      hidden && styles.hiddenWordSlot,
                      hidden && { width: hiddenWidth },
                    ]}
                  >
                    <Text
                      style={[
                        styles.word,
                        hidden && styles.hiddenWordText,
                      ]}
                    >
                      {hidden ? '' : w}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.ayahNumber}>{formatAyahMarker(current.ayahNumber)}</Text>
            <Text style={styles.hint}>
              {`${mt('longPressToReveal')} • ${formatAyahProgress(hiddenCount, ayahWords.length)}`}
            </Text>
          </GlassCard>

          {/* Reveal toggle */}
          <TouchableOpacity
            style={styles.revealBtn}
            onPress={() => setRevealedAll((v) => !v)}
          >
            <MaterialCommunityIcons
              name={revealedAll ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.revealText, { color: colors.primary }]}>
              {revealedAll ? mt('hide') : mt('reveal')}
            </Text>
          </TouchableOpacity>

          {/* Mark buttons */}
          <View style={styles.markRow}>
            <TouchableOpacity style={styles.markFail} onPress={onFail}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.text} />
              <Text style={[styles.markText, { color: colors.text }]}>
                {mt('markNeedsReview')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.markPass, { backgroundColor: colors.primary }]}
              onPress={onPass}
            >
              <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
              <Text style={[styles.markText, { color: '#fff' }]}>{mt('markMemorized')}</Text>
            </TouchableOpacity>
          </View>

          {/* Nav */}
          <View style={styles.navRow}>
            <TouchableOpacity
              disabled={index === 0}
              onPress={onPrev}
              style={[styles.navBtn, index === 0 && { opacity: 0.4 }]}
            >
              <MaterialCommunityIcons name={rtlChevronBack(isRTL) as any} size={22} color={colors.text} />
              <Text style={styles.navText}>{mt('previous')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={index >= ayahs.length - 1}
              onPress={onNext}
              style={[styles.navBtn, index >= ayahs.length - 1 && { opacity: 0.4 }]}
            >
              <Text style={styles.navText}>{mt('next')}</Text>
              <MaterialCommunityIcons name={rtlChevronForward(isRTL) as any} size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, isRTL: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 16, gap: 14, paddingBottom: 60 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyText: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 14,
      textAlign: 'center',
    },
    position: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 13,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    levelRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 8,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    levelChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    quranCard: { padding: 20, gap: 14, alignItems: 'center' },
    wordsWrap: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },
    wordSlot: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    hiddenWordSlot: {
      height: 42,
      minHeight: 42,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: 'rgba(13,142,98,0.12)',
      shadowColor: colors.primary,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
    },
    word: {
      color: colors.text,
      fontFamily: 'KFGQPCUthmanic',
      fontSize: 32,
      lineHeight: 48,
      textAlign: 'center',
    },
    hiddenWordText: {
      color: colors.primary,
    },
    ayahNumber: {
      color: colors.primary,
      fontFamily: 'KFGQPCUthmanic',
      fontSize: 26,
    },
    hint: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 11,
      textAlign: 'center',
    },
    revealBtn: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignSelf: 'center',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    revealText: { fontFamily: 'Rubik-Bold', fontSize: 13 },
    markRow: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 },
    markFail: {
      flex: 1,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    markPass: {
      flex: 1,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
    },
    markText: { fontFamily: 'Rubik-Bold', fontSize: 13 },
    navRow: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 4 },
    navBtn: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    navText: { color: colors.text, fontFamily: 'Rubik-SemiBold', fontSize: 13 },
  });
