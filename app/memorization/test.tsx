// app/memorization/test.tsx
// شاشة الاختبارات — 3 أنواع تتناوب: تكميل الآية، ترتيب الكلمات، الآية التالية.

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  formatAyahProgress,
  formatSurahAyahLabel,
  getAllSurahOptions,
  getAyahCount,
  getSurahName,
  toArabicDigits,
} from '@/lib/memorization-helpers';
import { buildQuiz, type TestQuestion } from '@/lib/memorization-test-builders';
import type { MemorizationPlan } from '@/types/memorization';

const QUIZ_LENGTH = 5;
const ARABIC_DIGIT_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => ARABIC_DIGIT_MAP[d] ?? d);
}

function parsePositiveInput(value: string): number | null {
  const normalized = normalizeDigits(value).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function TestScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const isRTL = useIsRTL();
  const { activePlan, todayPlan, ayahStates, markPassed, markFailed, recordDailyActivity } =
    useMemorization();
  const basePlan = useMemo<MemorizationPlan>(() => {
    return activePlan ?? {
      id: 'quick-test',
      name: mt('testCustomScope'),
      scope: 'range',
      ayahRange: { surahNumber: 67, fromAyah: 1, toAyah: 5 },
      dailyTarget: 5,
      level: 'reviewer',
      method: 'ayah_by_ayah',
      reciterId: 'mishary_alafasy',
      startDate: new Date().toISOString().slice(0, 10),
      reminderTime: null,
      reminderEnabled: false,
      createdAt: new Date().toISOString(),
      isActive: false,
      isCompleted: false,
    };
  }, [activePlan]);

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
  const [setupDone, setSetupDone] = useState(false);
  const [testSurah, setTestSurah] = useState('67');
  const [testFrom, setTestFrom] = useState('1');
  const [testTo, setTestTo] = useState('5');
  const [surahPickerOpen, setSurahPickerOpen] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');

  const surahOptions = useMemo(() => getAllSurahOptions(), []);
  const selectedSurahNumber = parsePositiveInput(testSurah) ?? 67;
  const selectedSurah = useMemo(
    () => surahOptions.find((surah) => surah.number === selectedSurahNumber),
    [selectedSurahNumber, surahOptions],
  );
  const filteredSurahOptions = useMemo(() => {
    const q = normalizeDigits(surahSearch).trim().toLowerCase();
    if (!q) return surahOptions;
    return surahOptions.filter((surah) =>
      String(surah.number).includes(q) ||
      surah.name.toLowerCase().includes(q) ||
      (surah.englishName ?? '').toLowerCase().includes(q)
    );
  }, [surahOptions, surahSearch]);

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

  const advanceBusyRef = useRef(false);
  const onNext = useCallback(async () => {
    if (!current || advanceBusyRef.current) return;
    advanceBusyRef.current = true;
    try {
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
    } finally {
      advanceBusyRef.current = false;
    }
  }, [current, isReorderCorrect, selected, qIndex, questions, markPassed, markFailed, recordDailyActivity, activePlan, scorePassed]);

  const onRestart = useCallback(() => {
    setQuestions(buildQuiz(basePlan, ayahPool, QUIZ_LENGTH));
    setQIndex(0);
    setSelected(null);
    setReorderPicked([]);
    setScorePassed(0);
    setFinished(false);
  }, [ayahPool, basePlan]);

  const resetQuizState = useCallback((nextQuestions: TestQuestion[]) => {
    setQuestions(nextQuestions);
    setQIndex(0);
    setSelected(null);
    setReorderPicked([]);
    setScorePassed(0);
    setFinished(false);
    setSetupDone(true);
  }, []);

  const startPlanTest = useCallback(() => {
    if (ayahPool.length === 0) return;
    resetQuizState(buildQuiz(basePlan, ayahPool, QUIZ_LENGTH));
  }, [ayahPool, basePlan, resetQuizState]);

  const startCustomTest = useCallback(() => {
    const surahNumber = parsePositiveInput(testSurah) ?? selectedSurahNumber;
    const from = parsePositiveInput(testFrom);
    const to = parsePositiveInput(testTo);
    const max = getAyahCount(surahNumber);
    if (!max || !from || !to || from > to || to > max) return;
    const pool = Array.from({ length: to - from + 1 }, (_, index) => ({
      surahNumber,
      ayahNumber: from + index,
    }));
    const customPlan: MemorizationPlan = {
      ...basePlan,
      scope: 'range',
      ayahRange: { surahNumber, fromAyah: from, toAyah: to },
      surahNumbers: [surahNumber],
    };
    resetQuizState(buildQuiz(customPlan, pool, Math.min(QUIZ_LENGTH, pool.length)));
  }, [basePlan, resetQuizState, selectedSurahNumber, testFrom, testSurah, testTo]);

  const styles = makeStyles(colors, isRTL);

  if (!setupDone) {
    return (
      <Wrapper appSettings={appSettings} styles={styles}>
        <UniversalHeader title={mt('testTitle')} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <GlassCard style={styles.setupCard}>
            <Text style={styles.setupTitle}>{mt('testPlanScope')}</Text>
            <Text style={styles.setupHint}>
              {ayahPool.length > 0 ? mt('currentWirdPosition', { n: 1, total: ayahPool.length }) : mt('noAyahsToday')}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }, ayahPool.length === 0 && { opacity: 0.45 }]}
              disabled={ayahPool.length === 0}
              onPress={startPlanTest}
            >
              <Text style={styles.primaryBtnText}>{mt('startTest')}</Text>
            </TouchableOpacity>
          </GlassCard>

          <GlassCard style={styles.setupCard}>
            <Text style={styles.setupTitle}>{mt('testCustomScope')}</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setSurahSearch('');
                setSurahPickerOpen(true);
              }}
              style={styles.surahPickerButton}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{mt('chooseSurah')}</Text>
                <Text style={styles.surahPickerName}>{selectedSurah?.name ?? mt('errInvalidSurah')}</Text>
                {!!selectedSurah && (
                  <Text style={styles.surahPickerMeta}>
                    {toArabicDigits(selectedSurah.ayahCount)} {mt('ayahsUnit')}
                  </Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textLight} />
            </TouchableOpacity>
            <View style={styles.inputsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{mt('ayahFrom')}</Text>
                <TextInput
                  style={styles.rangeInput}
                  keyboardType="number-pad"
                  value={toArabicDigits(testFrom)}
                  onChangeText={(v) => setTestFrom(normalizeDigits(v).replace(/[^0-9]/g, '').slice(0, 3))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{mt('ayahTo')}</Text>
                <TextInput
                  style={styles.rangeInput}
                  keyboardType="number-pad"
                  value={toArabicDigits(testTo)}
                  onChangeText={(v) => setTestTo(normalizeDigits(v).replace(/[^0-9]/g, '').slice(0, 3))}
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={startCustomTest}
            >
              <Text style={styles.primaryBtnText}>{mt('startTest')}</Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
        <SurahPickerModal
          visible={surahPickerOpen}
          colors={colors}
          isRTL={isRTL}
          search={surahSearch}
          setSearch={setSurahSearch}
          options={filteredSurahOptions}
          selected={selectedSurahNumber}
          onClose={() => setSurahPickerOpen(false)}
          onPick={(surah) => {
            setTestSurah(String(surah.number));
            const max = Math.max(1, surah.ayahCount);
            const from = Math.min(parsePositiveInput(testFrom) ?? 1, max);
            const to = Math.min(Math.max(parsePositiveInput(testTo) ?? from, from), max);
            setTestFrom(String(from));
            setTestTo(String(to));
            setSurahPickerOpen(false);
          }}
        />
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

function SurahPickerModal({
  visible,
  colors,
  isRTL,
  search,
  setSearch,
  options,
  selected,
  onClose,
  onPick,
}: {
  visible: boolean;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  search: string;
  setSearch: (value: string) => void;
  options: ReturnType<typeof getAllSurahOptions>;
  selected: number;
  onClose: () => void;
  onPick: (surah: ReturnType<typeof getAllSurahOptions>[number]) => void;
}) {
  const styles = makeStyles(colors, isRTL);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={modalStyles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={modalStyles.center}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[modalStyles.card, styles.surahPickerModal]}
          >
            <Text style={[modalStyles.title, { color: colors.text }]}>{mt('chooseSurah')}</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={mt('searchSurah')}
              placeholderTextColor={colors.textLight}
              style={styles.surahSearchInput}
            />
            <ScrollView style={styles.surahList} keyboardShouldPersistTaps="handled">
              {options.map((surah) => (
                <TouchableOpacity
                  key={surah.number}
                  onPress={() => onPick(surah)}
                  style={[
                    styles.surahOption,
                    selected === surah.number && styles.surahOptionActive,
                  ]}
                >
                  <View style={styles.surahOptionNumber}>
                    <Text style={styles.surahOptionNumberText}>{toArabicDigits(surah.number)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.surahOptionName}>{surah.name}</Text>
                    <Text style={styles.surahOptionMeta}>
                      {toArabicDigits(surah.ayahCount)} {mt('ayahsUnit')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
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
              fontFamily: 'Rubik-Bold',
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
        <Text style={{ color: colors.textLight, fontFamily: 'Rubik-SemiBold', fontSize: 12 }}>
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

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: { fontFamily: 'Rubik-Bold', fontSize: 18, textAlign: 'center' },
});

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
      fontSize: 12,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    qTypeLabel: {
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 16,
      textAlign: 'center',
    },
    setupCard: { padding: 16, gap: 12 },
    setupTitle: {
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 16,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    setupHint: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 12,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    inputsRow: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 },
    inputLabel: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 12,
      marginBottom: 4,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    rangeInput: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontFamily: 'Rubik-SemiBold',
      fontSize: 14,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    surahPickerButton: {
      minHeight: 72,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    surahPickerName: {
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 18,
      lineHeight: 32,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    surahPickerMeta: {
      color: colors.textLight,
      fontFamily: 'Rubik-SemiBold',
      fontSize: 13,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    surahPickerModal: {
      maxHeight: '78%',
      backgroundColor: colors.card,
    },
    surahSearchInput: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontFamily: 'Rubik-Regular',
      fontSize: 14,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    surahList: { maxHeight: 420 },
    surahOption: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    surahOptionActive: {
      backgroundColor: 'rgba(13,142,98,0.12)',
      borderRadius: 10,
      paddingHorizontal: 8,
    },
    surahOptionNumber: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    surahOptionNumberText: {
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 12,
    },
    surahOptionName: {
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 18,
      lineHeight: 32,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    surahOptionMeta: {
      color: colors.textLight,
      fontFamily: 'Rubik-SemiBold',
      fontSize: 13,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    primaryBtn: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    primaryBtnText: { color: '#fff', fontFamily: 'Rubik-Bold', fontSize: 15 },
    outlineBtn: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    outlineBtnText: { fontFamily: 'Rubik-Bold', fontSize: 15 },
    actionsRow: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 16, justifyContent: 'center' },
    resultCard: { padding: 24, gap: 12, alignItems: 'center' },
    resultTitle: { color: colors.text, fontFamily: 'Rubik-Bold', fontSize: 18 },
    resultScore: { color: colors.primary, fontFamily: 'Rubik-Bold', fontSize: 36 },
    resultLabel: { color: colors.textLight, fontFamily: 'Rubik-SemiBold', fontSize: 14 },
  });
