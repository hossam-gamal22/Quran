// app/memorization/test.tsx
// شاشة الاختبارات — 3 أنواع تتناوب: تكميل الآية، ترتيب الكلمات، الآية التالية.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import { formatAyahProgress, formatSurahAyahLabel, toArabicDigits } from '@/lib/memorization-helpers';
import { buildQuiz, type TestQuestion } from '@/lib/memorization-test-builders';

const QUIZ_LENGTH = 5;

export default function TestScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const isRTL = useIsRTL();
  const { activePlan, todayPlan, ayahStates, markPassed, markFailed, recordDailyActivity } =
    useMemorization();

  const memorizedAyahs = useMemo(() => {
    return Object.values(ayahStates)
      .filter((s) => s.status === 'memorized' || s.status === 'mastered')
      .map((s) => ({ surahNumber: s.surahNumber, ayahNumber: s.ayahNumber }));
  }, [ayahStates]);

  const ayahPool = memorizedAyahs.length > 0
    ? memorizedAyahs
    : [...todayPlan.newAyahs, ...todayPlan.reviewAyahs];

  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [reorderPicked, setReorderPicked] = useState<number[]>([]);
  const [scorePassed, setScorePassed] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (activePlan && ayahPool.length > 0 && questions.length === 0) {
      setQuestions(buildQuiz(activePlan, ayahPool, QUIZ_LENGTH));
    }
  }, [activePlan, ayahPool, questions.length]);

  const current = questions[qIndex];

  const onSelectChoice = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
  }, [selected]);

  const onReorderPick = useCallback((wIdx: number) => {
    if (reorderPicked.includes(wIdx)) return;
    setReorderPicked((p) => [...p, wIdx]);
  }, [reorderPicked]);

  const onReorderReset = useCallback(() => {
    setReorderPicked([]);
  }, []);

  const isReorderComplete = useMemo(() => {
    if (!current || current.type !== 'reorder_words') return false;
    return reorderPicked.length === current.scrambledWords.length;
  }, [current, reorderPicked]);

  const isReorderCorrect = useMemo(() => {
    if (!current || current.type !== 'reorder_words' || !isReorderComplete) return false;
    const arranged = reorderPicked.map((i) => current.scrambledWords[i]);
    return JSON.stringify(arranged) === JSON.stringify(current.correctOrder);
  }, [current, reorderPicked, isReorderComplete]);

  const onNext = useCallback(async () => {
    if (!current) return;
    let passed = false;
    if (current.type === 'reorder_words') {
      passed = isReorderCorrect;
    } else {
      passed = selected === current.correctIndex;
    }
    if (passed) {
      setScorePassed((s) => s + 1);
      await markPassed(current.surahNumber, current.ayahNumber);
    } else {
      await markFailed(current.surahNumber, current.ayahNumber);
    }
    if (qIndex + 1 >= questions.length) {
      setFinished(true);
      await recordDailyActivity();
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
      setReorderPicked([]);
    }
  }, [current, isReorderCorrect, selected, qIndex, questions, markPassed, markFailed, recordDailyActivity, activePlan, scorePassed]);

  const onRestart = useCallback(() => {
    if (!activePlan) return;
    setQuestions(buildQuiz(activePlan, ayahPool, QUIZ_LENGTH));
    setQIndex(0);
    setSelected(null);
    setReorderPicked([]);
    setScorePassed(0);
    setFinished(false);
  }, [activePlan, ayahPool]);

  const styles = makeStyles(colors, isRTL);

  if (!activePlan || ayahPool.length === 0) {
    return (
      <Wrapper appSettings={appSettings} styles={styles}>
        <UniversalHeader title={mt('testTitle')} onBack={() => router.back()} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {!activePlan ? mt('noActivePlan') : mt('noAyahsToday')}
          </Text>
        </View>
      </Wrapper>
    );
  }

  if (finished) {
    const percent = Math.round((scorePassed / questions.length) * 100);
    const label = percent >= 80 ? mt('excellent') : percent >= 50 ? mt('good') : mt('needsReview');
    return (
      <Wrapper appSettings={appSettings} styles={styles}>
        <UniversalHeader title={mt('testTitle')} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <GlassCard style={styles.resultCard}>
            <MaterialCommunityIcons name="trophy-outline" size={48} color={colors.primary} />
            <Text style={styles.resultTitle}>{mt('result')}</Text>
            <Text style={styles.resultScore}>
              {mt('scoreSummary', { passed: scorePassed, total: questions.length })}
            </Text>
            <Text style={styles.resultLabel}>{label}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => router.back()}>
                <Text style={[styles.outlineBtnText, { color: colors.text }]}>{mt('done')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={onRestart}
              >
                <Text style={styles.primaryBtnText}>{mt('retry')}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </ScrollView>
      </Wrapper>
    );
  }

  if (!current) {
    return (
      <Wrapper appSettings={appSettings} styles={styles}>
        <UniversalHeader title={mt('testTitle')} onBack={() => router.back()} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>...</Text>
        </View>
      </Wrapper>
    );
  }

  return (
    <Wrapper appSettings={appSettings} styles={styles}>
      <UniversalHeader title={mt('testTitle')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.position}>
          {`${formatAyahProgress(qIndex + 1, questions.length)} • ${formatSurahAyahLabel(current.surahNumber, current.ayahNumber)}`}
        </Text>

        <Text style={styles.qTypeLabel}>
          {current.type === 'complete_ayah'
            ? mt('testCompleteAyah')
            : current.type === 'reorder_words'
              ? mt('testReorder')
              : mt('testNextAyah')}
        </Text>

        {current.type === 'complete_ayah' && (
          <CompleteAyahView
            q={current}
            selected={selected}
            onSelect={onSelectChoice}
            colors={colors}
            isRTL={isRTL}
          />
        )}

        {current.type === 'reorder_words' && (
          <ReorderView
            q={current}
            picked={reorderPicked}
            onPick={onReorderPick}
            onReset={onReorderReset}
            isComplete={isReorderComplete}
            isCorrect={isReorderCorrect}
            colors={colors}
            isRTL={isRTL}
          />
        )}

        {current.type === 'next_ayah' && (
          <NextAyahView
            q={current}
            selected={selected}
            onSelect={onSelectChoice}
            colors={colors}
            isRTL={isRTL}
          />
        )}

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary },
            !canProceed(current, selected, isReorderComplete) && { opacity: 0.4 },
          ]}
          disabled={!canProceed(current, selected, isReorderComplete)}
          onPress={onNext}
        >
          <Text style={styles.primaryBtnText}>
            {qIndex + 1 >= questions.length ? mt('finishTest') : mt('next')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Wrapper>
  );
}

function canProceed(q: TestQuestion, selected: number | null, reorderDone: boolean): boolean {
  if (q.type === 'reorder_words') return reorderDone;
  return selected !== null;
}

function Wrapper({
  appSettings,
  children,
  styles,
}: {
  appSettings: any;
  children: React.ReactNode;
  styles: any;
}) {
  return (
    <BackgroundWrapper
      backgroundKey={appSettings.display.appBackground}
      backgroundUrl={appSettings.display.appBackgroundUrl}
      opacity={appSettings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        {children}
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

function CompleteAyahView({
  q,
  selected,
  onSelect,
  colors,
  isRTL,
}: {
  q: Extract<TestQuestion, { type: 'complete_ayah' }>;
  selected: number | null;
  onSelect: (i: number) => void;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <GlassCard style={{ padding: 16 }}>
        <Text style={qStyles(colors).quranLine}>{q.prefix} ...</Text>
      </GlassCard>
      <View style={{ gap: 8 }}>
        {q.options.map((opt, i) => (
          <ChoiceRow
            key={i}
            text={opt}
            state={
              selected === null
                ? 'idle'
                : i === q.correctIndex
                  ? 'correct'
                  : i === selected
                    ? 'wrong'
                    : 'idle'
            }
            onPress={() => onSelect(i)}
            colors={colors}
            isRTL={isRTL}
          />
        ))}
      </View>
    </View>
  );
}

function NextAyahView({
  q,
  selected,
  onSelect,
  colors,
  isRTL,
}: {
  q: Extract<TestQuestion, { type: 'next_ayah' }>;
  selected: number | null;
  onSelect: (i: number) => void;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <GlassCard style={{ padding: 16 }}>
        <Text style={qStyles(colors).quranLine}>{q.promptText}</Text>
      </GlassCard>
      <View style={{ gap: 8 }}>
        {q.options.map((opt, i) => (
          <ChoiceRow
            key={i}
            text={opt}
            state={
              selected === null
                ? 'idle'
                : i === q.correctIndex
                  ? 'correct'
                  : i === selected
                    ? 'wrong'
                    : 'idle'
            }
            onPress={() => onSelect(i)}
            colors={colors}
            isRTL={isRTL}
          />
        ))}
      </View>
    </View>
  );
}

function ReorderView({
  q,
  picked,
  onPick,
  onReset,
  isComplete,
  isCorrect,
  colors,
  isRTL,
}: {
  q: Extract<TestQuestion, { type: 'reorder_words' }>;
  picked: number[];
  onPick: (i: number) => void;
  onReset: () => void;
  isComplete: boolean;
  isCorrect: boolean;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <GlassCard style={{ padding: 14, minHeight: 80 }}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
          {picked.map((idx, i) => (
            <Text key={i} style={qStyles(colors).pickedWord}>
              {q.scrambledWords[idx]}
            </Text>
          ))}
        </View>
        {isComplete && (
          <Text
            style={{
              color: isCorrect ? '#0d8e62' : '#b00020',
              fontFamily: 'Cairo-Bold',
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            {isCorrect ? mt('correct') : mt('wrong')}
          </Text>
        )}
      </GlassCard>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
        {q.scrambledWords.map((w, i) => {
          const used = picked.includes(i);
          return (
            <TouchableOpacity
              key={i}
              disabled={used}
              onPress={() => onPick(i)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: used ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)',
                opacity: used ? 0.3 : 1,
              }}
            >
              <Text style={{ color: colors.text, fontFamily: 'KFGQPCUthmanic', fontSize: 22 }}>
                {w}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity onPress={onReset} style={{ alignSelf: 'center' }}>
        <Text style={{ color: colors.textLight, fontFamily: 'Cairo-SemiBold', fontSize: 12 }}>
          ↺ {mt('retry')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ChoiceRow({
  text,
  state,
  onPress,
  colors,
  isRTL,
}: {
  text: string;
  state: 'idle' | 'correct' | 'wrong';
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
}) {
  const bg =
    state === 'correct'
      ? 'rgba(13,142,98,0.25)'
      : state === 'wrong'
        ? 'rgba(176,0,32,0.25)'
        : 'rgba(255,255,255,0.06)';
  const border =
    state === 'correct'
      ? '#0d8e62'
      : state === 'wrong'
        ? '#b00020'
        : 'rgba(255,255,255,0.12)';
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: bg,
        borderWidth: 1.5,
        borderColor: border,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 12,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontFamily: 'KFGQPCUthmanic',
          fontSize: 22,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        }}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const qStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    quranLine: {
      color: colors.text,
      fontFamily: 'KFGQPCUthmanic',
      fontSize: 24,
      lineHeight: 48,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    pickedWord: {
      color: colors.text,
      fontFamily: 'KFGQPCUthmanic',
      fontSize: 22,
      backgroundColor: 'rgba(13,142,98,0.15)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
  });

const makeStyles = (colors: ReturnType<typeof useColors>, isRTL: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 16, gap: 14, paddingBottom: 60 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyText: {
      color: colors.textLight,
      fontFamily: 'Cairo-Regular',
      fontSize: 14,
      textAlign: 'center',
    },
    position: {
      color: colors.textLight,
      fontFamily: 'Cairo-Regular',
      fontSize: 12,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    qTypeLabel: {
      color: colors.text,
      fontFamily: 'Cairo-Bold',
      fontSize: 16,
      textAlign: 'center',
    },
    primaryBtn: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    primaryBtnText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 15 },
    outlineBtn: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    outlineBtnText: { fontFamily: 'Cairo-Bold', fontSize: 15 },
    actionsRow: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 16, justifyContent: 'center' },
    resultCard: { padding: 24, gap: 12, alignItems: 'center' },
    resultTitle: { color: colors.text, fontFamily: 'Cairo-Bold', fontSize: 18 },
    resultScore: { color: colors.primary, fontFamily: 'Cairo-Bold', fontSize: 36 },
    resultLabel: { color: colors.textLight, fontFamily: 'Cairo-SemiBold', fontSize: 14 },
  });
