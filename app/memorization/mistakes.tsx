// app/memorization/mistakes.tsx
// قسم أخطائي — يعرض الآيات التي دخلت needs_review بعد خطأ في اختبار أو تسميع.

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
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
import {
  formatSurahAyahLabel,
  getAyahText,
  stripQuranicMarks,
  stripTashkeel,
  toArabicDigits,
} from '@/lib/memorization-helpers';
import type { AyahMemoryState } from '@/types/memorization';

export default function MistakesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const isRTL = useIsRTL();
  const {
    activePlan,
    ayahStates,
    settings,
    markPassed,
    markFailed,
    recordDailyActivity,
  } = useMemorization();

  const mistakes = useMemo(() => {
    return Object.values(ayahStates)
      .filter((state) => state.status === 'needs_review')
      .sort((a, b) => {
        if (a.failures !== b.failures) return b.failures - a.failures;
        if (a.surahNumber !== b.surahNumber) return a.surahNumber - b.surahNumber;
        return a.ayahNumber - b.ayahNumber;
      });
  }, [ayahStates]);

  const styles = makeStyles(colors, isRTL);

  const stabilize = async (state: AyahMemoryState) => {
    await markPassed(state.surahNumber, state.ayahNumber);
    await recordDailyActivity();
  };

  const keepWorking = async (state: AyahMemoryState) => {
    await markFailed(state.surahNumber, state.ayahNumber);
  };

  return (
    <BackgroundWrapper
      backgroundKey={appSettings.display.appBackground}
      backgroundUrl={appSettings.display.appBackgroundUrl}
      opacity={appSettings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <UniversalHeader title={mt('mistakesTitle')} onBack={() => router.back()} />
        {!activePlan ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{mt('noActivePlan')}</Text>
          </View>
        ) : mistakes.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="check-decagram" size={56} color={colors.primary} />
            <Text style={styles.emptyTitle}>{mt('noMistakes')}</Text>
            <Text style={styles.emptyText}>{mt('mistakesAutoHint')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <GlassCard style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <MaterialCommunityIcons name="alert-circle-outline" size={28} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>{mt('mistakesDesc')}</Text>
                  <Text style={styles.summaryHint}>{mt('mistakesAutoHint')}</Text>
                </View>
                <Text style={styles.summaryCount}>{toArabicDigits(mistakes.length)}</Text>
              </View>
            </GlassCard>

            {mistakes.map((state) => (
              <MistakeCard
                key={`${state.surahNumber}:${state.ayahNumber}`}
                state={state}
                showTashkeel={settings.showTashkeel}
                colors={colors}
                isRTL={isRTL}
                onStabilize={() => stabilize(state)}
                onKeepWorking={() => keepWorking(state)}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

function MistakeCard({
  state,
  showTashkeel,
  colors,
  isRTL,
  onStabilize,
  onKeepWorking,
}: {
  state: AyahMemoryState;
  showTashkeel: boolean;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  onStabilize: () => void;
  onKeepWorking: () => void;
}) {
  const raw = getAyahText(state.surahNumber, state.ayahNumber);
  const text = showTashkeel ? stripQuranicMarks(raw) : stripTashkeel(raw);
  const styles = makeStyles(colors, isRTL);

  return (
    <GlassCard style={styles.mistakeCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.ayahLabel}>
          {formatSurahAyahLabel(state.surahNumber, state.ayahNumber)}
        </Text>
        <View style={styles.failurePill}>
          <Text style={styles.failureText}>
            {mt('failuresCount', { n: state.failures || 1 })}
          </Text>
        </View>
      </View>

      <Text style={styles.quranText}>{text}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.needsBtn]} onPress={onKeepWorking}>
          <MaterialCommunityIcons name="repeat" size={18} color="#fff" />
          <Text style={styles.actionText}>{mt('stillNeedsWork')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.doneBtn]} onPress={onStabilize}>
          <MaterialCommunityIcons name="check-bold" size={18} color="#fff" />
          <Text style={styles.actionText}>{mt('stabilizeAyah')}</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, isRTL: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 16, gap: 14, paddingBottom: 60 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
    emptyTitle: {
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 17,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    emptyText: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 13,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    summaryCard: { padding: 16 },
    summaryHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 12,
    },
    summaryTitle: {
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 16,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    summaryHint: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 12,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    summaryCount: {
      color: '#F59E0B',
      fontFamily: 'Rubik-Bold',
      fontSize: 26,
      minWidth: 42,
      textAlign: 'center',
    },
    mistakeCard: { padding: 16, gap: 14 },
    cardHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
      justifyContent: 'space-between',
    },
    ayahLabel: {
      flex: 1,
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 15,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    failurePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(245,158,11,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(245,158,11,0.45)',
    },
    failureText: {
      color: '#F59E0B',
      fontFamily: 'Rubik-Bold',
      fontSize: 12,
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    quranText: {
      color: colors.text,
      fontFamily: 'KFGQPCUthmanic',
      fontSize: 26,
      lineHeight: 52,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    actionsRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 11,
      borderRadius: 12,
    },
    needsBtn: { backgroundColor: '#F59E0B' },
    doneBtn: { backgroundColor: colors.primary },
    actionText: {
      color: '#fff',
      fontFamily: 'Rubik-Bold',
      fontSize: 12,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
  });
