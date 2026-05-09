// app/memorization/learn.tsx
// وضع التعلّم — استماع وتكرار وقراءة الآيات الجديدة في وِرد اليوم.

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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
  formatAyahMarker,
  getAyahText,
  getSurahName,
  splitAyahSegments,
  stripQuranicMarks,
  stripTashkeel,
  toArabicDigits,
} from '@/lib/memorization-helpers';
import { memorizationPlayer, type MemoPlayerEvent } from '@/lib/memorization-player';
import { rtlChevronBack, rtlChevronForward } from '@/lib/rtl-utils';

const REPEAT_OPTIONS = [3, 5, 7, 10];
const SPEED_OPTIONS = [0.75, 1, 1.25];
const GAP_OPTIONS = [1000, 3000, 5000];

export default function LearnScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings: appSettings } = useSettings();
  const isRTL = useIsRTL();
  const {
    activePlan,
    todayPlan,
    settings,
    markPassed,
    markFailed,
    updateSettings,
    recordDailyActivity,
  } = useMemorization();

  const ayahs = useMemo(() => {
    const list = [...todayPlan.newAyahs];
    if (list.length === 0) return todayPlan.reviewAyahs;
    return list;
  }, [todayPlan]);

  const [index, setIndex] = useState(0);
  const [repeats, setRepeats] = useState(settings.defaultRepeatCount);
  const [speed, setSpeed] = useState(settings.defaultSpeed);
  const [gap, setGap] = useState(settings.defaultGapMs);
  const [isPlaying, setIsPlaying] = useState(false);
  const [iter, setIter] = useState(0);
  const [iterTotal, setIterTotal] = useState(0);
  const [step, setStep] = useState<'idle' | 'listen' | 'recite_with' | 'recite_alone' | 'done'>('idle');

  const current = ayahs[index];
  const totalRepeatRounds = 3; // listen / recite_with / recite_alone
  const subscriptionRef = useRef<(() => void) | null>(null);
  const flowCancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) subscriptionRef.current();
      memorizationPlayer.stop();
    };
  }, []);

  const playOnce = useCallback(
    async (times: number) => {
      if (!current || !activePlan) return;
      setIsPlaying(true);
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      const unsub = memorizationPlayer.subscribe((e: MemoPlayerEvent) => {
        if (e.kind === 'started') {
          setIter(e.iteration);
          setIterTotal(e.total);
        }
        if (e.kind === 'all_done' || e.kind === 'stopped' || e.kind === 'error') {
          setIsPlaying(false);
          setIter(0);
          setIterTotal(0);
        }
      });
      subscriptionRef.current = unsub;
      try {
        await memorizationPlayer.playAyahWithRepeat(
          current.surahNumber,
          current.ayahNumber,
          {
            times,
            gapMs: gap,
            speed,
            reciterId: activePlan.reciterId,
          },
        );
      } finally {
        unsub();
        if (subscriptionRef.current === unsub) subscriptionRef.current = null;
      }
    },
    [current, activePlan, gap, speed],
  );

  const onMagicStart = useCallback(async () => {
    if (!current) return;
    flowCancelledRef.current = false;
    setStep('listen');
    await playOnce(repeats);
    if (flowCancelledRef.current) return;
    setStep('recite_with');
    await playOnce(2);
    if (flowCancelledRef.current) return;
    setStep('recite_alone');
    setStep('done');
  }, [current, playOnce, repeats]);

  const onStop = useCallback(async () => {
    flowCancelledRef.current = true;
    await memorizationPlayer.stop();
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
    setIsPlaying(false);
    setIter(0);
    setIterTotal(0);
    setStep('idle');
  }, []);

  const onMarkMemorized = useCallback(async () => {
    if (!current) return;
    await markPassed(current.surahNumber, current.ayahNumber);
    await recordDailyActivity();
    setStep('idle');
    setIndex((i) => Math.min(i + 1, ayahs.length - 1));
  }, [current, markPassed, recordDailyActivity, ayahs.length]);

  const onMarkNeedsReview = useCallback(async () => {
    if (!current) return;
    await markFailed(current.surahNumber, current.ayahNumber);
    setStep('idle');
    setIndex((i) => Math.min(i + 1, ayahs.length - 1));
  }, [current, markFailed, ayahs.length]);

  const ayahText = current
    ? settings.showTashkeel
      ? stripQuranicMarks(getAyahText(current.surahNumber, current.ayahNumber))
      : stripTashkeel(getAyahText(current.surahNumber, current.ayahNumber))
    : '';

  const segments = useMemo(
    () => (settings.splitAyahSegments ? splitAyahSegments(ayahText) : [ayahText]),
    [ayahText, settings.splitAyahSegments],
  );

  const styles = makeStyles(colors, settings.nightMode, isRTL);

  if (!activePlan) {
    return (
      <BackgroundWrapper
        backgroundKey={appSettings.display.appBackground}
        backgroundUrl={appSettings.display.appBackgroundUrl}
        opacity={appSettings.display.backgroundOpacity ?? 1}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safe} edges={['top']}>
          <UniversalHeader title={mt('learnTitle')} onBack={() => router.back()} />
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{mt('noActivePlan')}</Text>
          </View>
        </SafeAreaView>
      </BackgroundWrapper>
    );
  }

  if (!current) {
    return (
      <BackgroundWrapper
        backgroundKey={appSettings.display.appBackground}
        backgroundUrl={appSettings.display.appBackgroundUrl}
        opacity={appSettings.display.backgroundOpacity ?? 1}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safe} edges={['top']}>
          <UniversalHeader title={mt('learnTitle')} onBack={() => router.back()} />
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{mt('noAyahsToday')}</Text>
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
        <UniversalHeader title={mt('learnTitle')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.position}>
          {mt('ayahOf', { n: index + 1, total: ayahs.length })} • {getSurahName(current.surahNumber)}
        </Text>

        {/* Quran text */}
        <GlassCard style={styles.quranCard}>
          {segments.map((seg, i) => (
            <Text key={i} style={styles.quranText}>
              {seg}
            </Text>
          ))}
          <Text style={styles.ayahNumber}>{formatAyahMarker(current.ayahNumber)}</Text>
        </GlassCard>

        {/* Status / step indicator */}
        {step !== 'idle' && (
          <View style={styles.stepRow}>
            <StepBadge active={step === 'listen'} label={mt('listenStep')} />
            <StepBadge active={step === 'recite_with'} label={mt('recitWithStep')} />
            <StepBadge active={step === 'recite_alone' || step === 'done'} label={mt('recitAloneStep')} />
          </View>
        )}

        {isPlaying && (
          <View style={styles.playingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.playingText}>
              {toArabicDigits(iter)} / {toArabicDigits(iterTotal || repeats)}
            </Text>
          </View>
        )}

        {/* Controls */}
        <GlassCard style={styles.controlsCard}>
          <ControlRow label={mt('repeatCount')} colors={colors} isRTL={isRTL}>
            {REPEAT_OPTIONS.map((n) => (
              <Chip
                key={n}
                label={toArabicDigits(n)}
                active={repeats === n}
                onPress={() => setRepeats(n)}
                colors={colors}
              />
            ))}
            <CustomRepeatInput
              value={repeats}
              onChange={setRepeats}
              colors={colors}
              presets={REPEAT_OPTIONS}
            />
          </ControlRow>
          <ControlRow label={mt('speed')} colors={colors} isRTL={isRTL}>
            {SPEED_OPTIONS.map((s) => (
              <Chip
                key={s}
                label={`${s}x`}
                active={speed === s}
                onPress={() => setSpeed(s)}
                colors={colors}
              />
            ))}
          </ControlRow>
          <ControlRow label={mt('gap')} colors={colors} isRTL={isRTL}>
            {GAP_OPTIONS.map((g) => (
              <Chip
                key={g}
                label={`${g / 1000}s`}
                active={gap === g}
                onPress={() => setGap(g)}
                colors={colors}
              />
            ))}
          </ControlRow>

          <View style={styles.toggleRow}>
            <ToggleBtn
              active={settings.splitAyahSegments}
              label={mt('splitSegments')}
              onPress={() =>
                updateSettings({ splitAyahSegments: !settings.splitAyahSegments })
              }
              colors={colors}
            />
          </View>
        </GlassCard>

        {/* Magic Start */}
        {!isPlaying ? (
          <TouchableOpacity style={styles.magicBtn} onPress={onMagicStart}>
            <MaterialCommunityIcons name="play-circle" size={22} color="#fff" />
            <Text style={styles.magicText}>{mt('startMemorize')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.magicBtn, { backgroundColor: '#b00020' }]} onPress={onStop}>
            <MaterialCommunityIcons name="stop-circle" size={22} color="#fff" />
            <Text style={styles.magicText}>إيقاف</Text>
          </TouchableOpacity>
        )}

        {/* Mark buttons */}
        <View style={styles.markRow}>
          <Pressable
            onPress={onMarkNeedsReview}
            style={({ pressed }) => [
              styles.markBtn,
              pressed
                ? { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }
                : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' },
            ]}
          >
            {({ pressed }) => (
              <>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={18}
                  color={pressed ? '#fff' : colors.text}
                />
                <Text style={[styles.markText, { color: pressed ? '#fff' : colors.text }]}>
                  {mt('markNeedsReview')}
                </Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={onMarkMemorized}
            style={({ pressed }) => [
              styles.markBtn,
              pressed
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)' },
            ]}
          >
            {({ pressed }) => (
              <>
                <MaterialCommunityIcons
                  name="school-outline"
                  size={18}
                  color={pressed ? '#fff' : colors.text}
                />
                <Text style={[styles.markText, { color: pressed ? '#fff' : colors.text }]}>
                  {mt('markMemorized')}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Nav */}
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => {
              if (index > 0) {
                setIndex((i) => Math.max(0, i - 1));
              } else {
                // عند أول آية: زر "السابق" يعيد تشغيل الآية الحالية
                onMagicStart();
              }
            }}
            style={styles.navBtn}
          >
            <MaterialCommunityIcons
              name={index === 0 ? 'restart' : (rtlChevronBack(isRTL) as any)}
              size={22}
              color={colors.text}
            />
            <Text style={styles.navText}>
              {index === 0 ? mt('replayAyah') : mt('previous')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={index >= ayahs.length - 1}
            onPress={() => setIndex((i) => Math.min(ayahs.length - 1, i + 1))}
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

function StepBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: active ? '#0d8e62' : 'rgba(255,255,255,0.08)',
      }}
    >
      <Text
        style={{
          color: active ? '#fff' : '#aaa',
          fontFamily: 'Cairo-SemiBold',
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ControlRow({
  label,
  colors,
  isRTL,
  children,
}: {
  label: string;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: colors.textLight,
          fontFamily: 'Cairo-Regular',
          fontSize: 12,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6, flexWrap: 'wrap' }}>{children}</View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: active ? colors.primary : 'rgba(255,255,255,0.06)',
      }}
    >
      <Text
        style={{
          color: active ? '#fff' : colors.text,
          fontFamily: 'Cairo-SemiBold',
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// شيب "مخصّص" يفتح نافذة لإدخال عدد التكرار بشكل واضح.
function CustomRepeatInput({
  value,
  onChange,
  colors,
  presets,
}: {
  value: number;
  onChange: (n: number) => void;
  colors: ReturnType<typeof useColors>;
  presets: number[];
}) {
  const isCustom = !presets.includes(value);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(isCustom ? value : 1));

  const openSheet = () => {
    setDraft(isCustom ? String(value) : '1');
    setOpen(true);
  };

  const currentNum = () => {
    const n = parseInt(draft.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 1;
  };

  const step = (delta: number) => {
    const next = Math.max(1, Math.min(999, currentNum() + delta));
    setDraft(String(next));
  };

  const submit = () => {
    const n = Math.max(1, Math.min(999, currentNum()));
    onChange(n);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={openSheet}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: isCustom ? colors.primary : 'rgba(255,255,255,0.06)',
        }}
      >
        <MaterialCommunityIcons
          name="dots-horizontal"
          size={14}
          color={isCustom ? '#fff' : colors.text}
        />
        <Text
          style={{
            color: isCustom ? '#fff' : colors.text,
            fontFamily: 'Cairo-SemiBold',
            fontSize: 12,
          }}
        >
          {isCustom ? toArabicDigits(value) : mt('customRepeat')}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={modalStyles.backdrop} onPress={() => setOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={modalStyles.center}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[modalStyles.card, { backgroundColor: colors.card }]}
            >
              <Text style={[modalStyles.title, { color: colors.text }]}>
                {mt('customRepeatTitle')}
              </Text>
              <Text style={[modalStyles.hint, { color: colors.textLight }]}>
                {mt('customRepeatHint')}
              </Text>
              <View style={modalStyles.stepperRow}>
                <TouchableOpacity
                  onPress={() => step(-1)}
                  style={[modalStyles.stepBtn, { borderColor: colors.primary }]}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="minus" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TextInput
                  value={draft}
                  onChangeText={(t) => setDraft(t.replace(/[^0-9]/g, '').slice(0, 3))}
                  onSubmitEditing={submit}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  selectTextOnFocus
                  maxLength={3}
                  placeholder="1"
                  placeholderTextColor={colors.textLight}
                  style={[
                    modalStyles.input,
                    {
                      color: colors.text,
                      borderColor: colors.primary,
                    },
                  ]}
                />
                <TouchableOpacity
                  onPress={() => step(1)}
                  style={[modalStyles.stepBtn, { borderColor: colors.primary }]}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="plus" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={modalStyles.actions}>
                <TouchableOpacity
                  onPress={() => setOpen(false)}
                  style={[modalStyles.btn, { borderColor: 'rgba(255,255,255,0.2)' }]}
                >
                  <Text style={[modalStyles.btnText, { color: colors.text }]}>
                    {mt('cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submit}
                  style={[modalStyles.btn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Text style={[modalStyles.btnText, { color: '#fff' }]}>
                    {mt('confirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

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
  title: { fontFamily: 'Cairo-Bold', fontSize: 17, textAlign: 'center' },
  hint: { fontFamily: 'Cairo-Regular', fontSize: 12, textAlign: 'center' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    fontFamily: 'Cairo-Bold',
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 2,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  btnText: { fontFamily: 'Cairo-Bold', fontSize: 14 },
});

function ToggleBtn({
  active,
  label,
  onPress,
  colors,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: active ? colors.primary : 'rgba(255,255,255,0.12)',
        backgroundColor: active ? 'rgba(13,142,98,0.12)' : 'transparent',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: active ? colors.primary : colors.textLight,
          fontFamily: 'Cairo-SemiBold',
          fontSize: 11,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>, nightMode: boolean, isRTL: boolean) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: nightMode ? '#0a0a0a' : 'transparent',
    },
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
      fontSize: 13,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    quranCard: {
      padding: 24,
      gap: 12,
      alignItems: 'center',
      backgroundColor: nightMode ? 'rgba(255,255,255,0.04)' : undefined,
    },
    quranText: {
      color: nightMode ? '#f5f5f5' : colors.text,
      fontFamily: 'KFGQPCUthmanic',
      fontSize: 32,
      lineHeight: 64,
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    ayahNumber: {
      color: colors.primary,
      fontFamily: 'KFGQPCUthmanic',
      fontSize: 26,
      marginTop: 4,
    },
    stepRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 8,
      justifyContent: 'center',
    },
    playingRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playingText: {
      color: colors.text,
      fontFamily: 'Cairo-SemiBold',
      fontSize: 14,
    },
    controlsCard: { padding: 14, gap: 12 },
    toggleRow: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 },
    magicBtn: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 14,
    },
    magicText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 16 },
    markRow: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 },
    markBtn: {
      flex: 1,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    markText: { fontFamily: 'Cairo-Bold', fontSize: 13 },
    navRow: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 4 },
    navBtn: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    navText: { color: colors.text, fontFamily: 'Cairo-SemiBold', fontSize: 13 },
  });
