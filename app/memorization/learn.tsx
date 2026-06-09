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
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useColors } from '@/hooks/use-colors';
import { GlassCard, UniversalHeader } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { useMemorization } from '@/contexts/MemorizationContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { mt } from '@/lib/memorization-i18n';
import {
  formatAyahMarker,
  getAllSurahOptions,
  getAyahCount,
  getAyahText,
  getSurahName,
  splitAyahSegments,
  stripQuranicMarks,
  stripTashkeel,
  toArabicDigits,
} from '@/lib/memorization-helpers';
import { memorizationPlayer, type MemoPlayerEvent } from '@/lib/memorization-player';
import type { AyahRef } from '@/types/memorization';
import { rtlChevronBack, rtlChevronForward } from '@/lib/rtl-utils';

const REPEAT_OPTIONS = [3, 5, 7, 10];
const SPEED_OPTIONS = [0.75, 1, 1.25];
const GAP_OPTIONS = [1000, 3000, 5000];
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
    isTodayReady,
  } = useMemorization();

  // Freeze today's ward ONCE for this session. Marking ayahs mutates the live
  // todayPlan; without freezing, the daily list would shrink/refill mid-walk
  // and skip ayahs. Re-entering the screen remounts → fresh snapshot.
  const [ayahs, setAyahs] = useState<AyahRef[] | null>(null);
  useEffect(() => {
    if (ayahs === null && isTodayReady && activePlan) {
      const list = [...todayPlan.newAyahs];
      setAyahs(list.length > 0 ? list : [...todayPlan.reviewAyahs]);
    }
  }, [ayahs, isTodayReady, activePlan, todayPlan.newAyahs, todayPlan.reviewAyahs]);

  const [index, setIndex] = useState(0);
  const [repeats, setRepeats] = useState(settings.defaultRepeatCount);
  const [speed, setSpeed] = useState(settings.defaultSpeed);
  const [gap, setGap] = useState(settings.defaultGapMs);
  const [isPlaying, setIsPlaying] = useState(false);
  const [iter, setIter] = useState(0);
  const [iterTotal, setIterTotal] = useState(0);
  const [learnMode, setLearnMode] = useState<'menu' | 'daily' | 'range' | 'recital'>('menu');
  const [listenSurah, setListenSurah] = useState('67');
  const [recitalSurah, setRecitalSurah] = useState('67');
  const [recitalAyahNumber, setRecitalAyahNumber] = useState('1');
  const [surahPickerOpen, setSurahPickerOpen] = useState(false);
  const [surahPickerTarget, setSurahPickerTarget] = useState<'range' | 'recital'>('range');
  const [surahSearch, setSurahSearch] = useState('');
  const [listenFrom, setListenFrom] = useState('1');
  const [listenTo, setListenTo] = useState('1');
  const [rangeProgressLabel, setRangeProgressLabel] = useState('');
  const [rangePlayingAyah, setRangePlayingAyah] = useState<{
    surahNumber: number;
    ayahNumber: number;
  } | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [step, setStep] = useState<'idle' | 'listen' | 'recite_with' | 'recite_alone' | 'done'>('idle');

  const current = ayahs ? ayahs[index] : undefined;
  const ayahsLen = ayahs?.length ?? 0;
  const defaultRangeSurah = useMemo(() => {
    return (
      current?.surahNumber ??
      activePlan?.ayahRange?.surahNumber ??
      activePlan?.surahNumbers?.[0] ??
      67
    );
  }, [activePlan, current]);
  const totalRepeatRounds = 3; // listen / recite_with / recite_alone
  const subscriptionRef = useRef<(() => void) | null>(null);
  const flowCancelledRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingSoundRef = useRef<Audio.Sound | null>(null);
  const markBusyRef = useRef(false);
  // Mirror the latest recorded URI so unmount cleanup can delete the temp file.
  const recordedUriRef = useRef<string | null>(null);

  // Delete a temporary recording file so re-recording doesn't orphan audio on disk.
  const deleteRecordedFile = useCallback(async (uri: string | null) => {
    if (!uri) return;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {}
  }, []);

  useEffect(() => {
    recordedUriRef.current = recordedUri;
  }, [recordedUri]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) subscriptionRef.current();
      memorizationPlayer.stop();
      recordingSoundRef.current?.unloadAsync().catch(() => {});
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      if (recordedUriRef.current) {
        FileSystem.deleteAsync(recordedUriRef.current, { idempotent: true }).catch(
          () => {},
        );
      }
    };
  }, []);

  useEffect(() => {
    const from = activePlan?.ayahRange?.fromAyah ?? current?.ayahNumber ?? 1;
    const to = activePlan?.ayahRange?.toAyah ?? Math.min(getAyahCount(defaultRangeSurah) || from, from + 4);
    setListenSurah(String(defaultRangeSurah));
    setListenFrom(String(from));
    setListenTo(String(to));
    setRecitalSurah(String(defaultRangeSurah));
    setRecitalAyahNumber(String(from));
    setRangeProgressLabel('');
    setRangePlayingAyah(null);
  }, [activePlan?.id, defaultRangeSurah]);

  const playOnce = useCallback(
    async (times: number) => {
      if (!current || !activePlan) return;
      setRangePlayingAyah(null);
      setRangeProgressLabel('');
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

  const onPlayListeningRange = useCallback(async () => {
    if (!activePlan) return;
    const surah = parsePositiveInput(listenSurah) ?? defaultRangeSurah;
    const from = parsePositiveInput(listenFrom);
    const to = parsePositiveInput(listenTo);
    const maxAyah = getAyahCount(surah);
    if (!maxAyah) {
      Alert.alert(mt('errSave'), mt('errInvalidSurah'));
      return;
    }
    if (!from || !to || from > to || to > maxAyah) {
      Alert.alert(mt('errSave'), mt('errInvalidRange'));
      return;
    }

    flowCancelledRef.current = false;
    setStep('listen');
    setIsPlaying(true);
    setRangeProgressLabel(`${toArabicDigits(from)}-${toArabicDigits(to)}`);
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }

    const rangeAyahs = Array.from({ length: to - from + 1 }, (_, offset) => ({
      surah,
      ayah: from + offset,
    }));
    setRangePlayingAyah({ surahNumber: surah, ayahNumber: from });
    setRangeProgressLabel(`${getSurahName(surah)} ${formatAyahMarker(from)}`);

    const unsub = memorizationPlayer.subscribe((e: MemoPlayerEvent) => {
      if (e.kind === 'started') {
        setIter(e.iteration);
        setIterTotal(e.total);
      }
      if (e.kind === 'all_done' || e.kind === 'stopped' || e.kind === 'error') {
        setIsPlaying(false);
        setIter(0);
        setIterTotal(0);
        setStep('idle');
        setRangePlayingAyah(null);
      }
    });
    subscriptionRef.current = unsub;

    try {
      await memorizationPlayer.playSequence(rangeAyahs, {
        times: repeats,
        gapMs: gap,
        speed,
        reciterId: activePlan.reciterId,
        onAdvance: (ayahIndex) => {
          const ayah = rangeAyahs[ayahIndex];
          setRangePlayingAyah({
            surahNumber: surah,
            ayahNumber: ayah.ayah,
          });
          setRangeProgressLabel(
            `${getSurahName(surah)} ${formatAyahMarker(ayah.ayah)}`,
          );
        },
      });
    } finally {
      unsub();
      if (subscriptionRef.current === unsub) subscriptionRef.current = null;
      setRangeProgressLabel('');
      setRangePlayingAyah(null);
    }
  }, [activePlan, defaultRangeSurah, gap, listenFrom, listenSurah, listenTo, repeats, speed]);

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
    setRangeProgressLabel('');
    setRangePlayingAyah(null);
    setStep('idle');
  }, []);

  const startRecording = useCallback(async () => {
    try {
      await onStop();
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(mt('recordPermissionTitle'), mt('recordPermissionDesc'));
        return;
      }
      await recordingSoundRef.current?.unloadAsync().catch(() => {});
      recordingSoundRef.current = null;
      await deleteRecordedFile(recordedUri);
      setRecordedUri(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording: nextRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = nextRecording;
      setRecording(nextRecording);
    } catch (e: any) {
      Alert.alert(mt('errSave'), String(e?.message ?? e));
    }
  }, [onStop, recordedUri, deleteRecordedFile]);

  const stopRecording = useCallback(async () => {
    const currentRecording = recordingRef.current;
    if (!currentRecording) return;
    try {
      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();
      recordingRef.current = null;
      setRecording(null);
      setRecordedUri(uri);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (e: any) {
      recordingRef.current = null;
      setRecording(null);
      Alert.alert(mt('errSave'), String(e?.message ?? e));
    }
  }, []);

  const playRecording = useCallback(async () => {
    if (!recordedUri) return;
    try {
      await onStop();
      await recordingSoundRef.current?.unloadAsync().catch(() => {});
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: recordedUri },
        {
          shouldPlay: true,
          volume: 1,
          isMuted: false,
        },
      );
      await sound.setVolumeAsync(1);
      recordingSoundRef.current = sound;
      setIsPlayingRecording(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          setIsPlayingRecording(false);
          return;
        }
        if (status.didJustFinish) {
          setIsPlayingRecording(false);
          sound.unloadAsync().catch(() => {});
          if (recordingSoundRef.current === sound) recordingSoundRef.current = null;
        }
      });
    } catch (e: any) {
      setIsPlayingRecording(false);
      Alert.alert(mt('errLoad'), String(e?.message ?? e));
    }
  }, [onStop, recordedUri]);

  const onMarkMemorized = useCallback(async () => {
    if (!current || markBusyRef.current) return;
    markBusyRef.current = true;
    try {
      await markPassed(current.surahNumber, current.ayahNumber);
      await recordDailyActivity();
      await deleteRecordedFile(recordedUri);
      setRecordedUri(null);
      setStep('idle');
      setIndex((i) => Math.min(i + 1, (ayahs?.length ?? 1) - 1));
    } finally {
      markBusyRef.current = false;
    }
  }, [current, markPassed, recordDailyActivity, ayahs, recordedUri, deleteRecordedFile]);

  const onMarkNeedsReview = useCallback(async () => {
    if (!current || markBusyRef.current) return;
    markBusyRef.current = true;
    try {
      await markFailed(current.surahNumber, current.ayahNumber);
      await deleteRecordedFile(recordedUri);
      setRecordedUri(null);
      setStep('idle');
      setIndex((i) => Math.min(i + 1, (ayahs?.length ?? 1) - 1));
    } finally {
      markBusyRef.current = false;
    }
  }, [current, markFailed, ayahs, recordedUri, deleteRecordedFile]);

  const rangeSurahNumber = parsePositiveInput(listenSurah) ?? defaultRangeSurah;
  const recitalSurahNumber = parsePositiveInput(recitalSurah) ?? defaultRangeSurah;
  const surahOptions = useMemo(() => getAllSurahOptions(), []);
  const selectedSurahOption = useMemo(
    () => surahOptions.find((s) => s.number === rangeSurahNumber),
    [rangeSurahNumber, surahOptions],
  );
  const selectedRecitalSurahOption = useMemo(
    () => surahOptions.find((s) => s.number === recitalSurahNumber),
    [recitalSurahNumber, surahOptions],
  );
  const recitalAyahMax = Math.max(1, getAyahCount(recitalSurahNumber));
  const filteredSurahOptions = useMemo(() => {
    const q = normalizeDigits(surahSearch).trim().toLowerCase();
    if (!q) return surahOptions;
    return surahOptions.filter((s) => {
      return (
        String(s.number).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.englishName ?? '').toLowerCase().includes(q)
      );
    });
  }, [surahOptions, surahSearch]);
  const rangeFromAyah = parsePositiveInput(listenFrom) ?? 1;
  const rangePreviewAyah =
    learnMode === 'range' && getAyahCount(rangeSurahNumber) >= rangeFromAyah
      ? { surahNumber: rangeSurahNumber, ayahNumber: rangeFromAyah }
      : null;
  const recitalAyahValue = parsePositiveInput(recitalAyahNumber) ?? 1;
  const setRecitalAyahClamped = useCallback((next: number) => {
    const clamped = Math.max(1, Math.min(recitalAyahMax, next));
    setRecitalAyahNumber(String(clamped));
    setRecordedUri(null);
  }, [recitalAyahMax]);
  const recitalAyah =
    getAyahCount(recitalSurahNumber) >= recitalAyahValue
      ? { surahNumber: recitalSurahNumber, ayahNumber: recitalAyahValue }
      : { surahNumber: recitalSurahNumber, ayahNumber: 1 };
  const displayAyah =
    learnMode === 'recital'
      ? recitalAyah
      : rangePlayingAyah ?? rangePreviewAyah ?? current;
  const displayRef = displayAyah
    ? `${getSurahName(displayAyah.surahNumber)} ${formatAyahMarker(displayAyah.ayahNumber)}`
    : '';
  const isListeningRangeActive = Boolean(rangePlayingAyah || rangeProgressLabel);

  const playSheikhForRecital = useCallback(async () => {
    if (!activePlan || !recitalAyah) return;
    await recordingSoundRef.current?.unloadAsync().catch(() => {});
    recordingSoundRef.current = null;
    setIsPlayingRecording(false);
    await memorizationPlayer.playAyahWithRepeat(recitalAyah.surahNumber, recitalAyah.ayahNumber, {
      times: 1,
      gapMs: 0,
      speed,
      reciterId: activePlan.reciterId,
    });
  }, [activePlan, recitalAyah, speed]);

  const ayahText = displayAyah
    ? settings.showTashkeel
      ? stripQuranicMarks(getAyahText(displayAyah.surahNumber, displayAyah.ayahNumber))
      : stripTashkeel(getAyahText(displayAyah.surahNumber, displayAyah.ayahNumber))
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

  if (learnMode === 'menu') {
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
            <ModeChoiceCard
              icon="calendar-check-outline"
              title={mt('learnDailyWird')}
              description={mt('learnDailyWirdDesc')}
              colors={colors}
              isRTL={isRTL}
              onPress={() => setLearnMode('daily')}
            />
            <ModeChoiceCard
              icon="repeat-variant"
              title={mt('learnListeningRange')}
              description={mt('learnListeningRangeDesc')}
              colors={colors}
              isRTL={isRTL}
              onPress={() => setLearnMode('range')}
            />
            <ModeChoiceCard
              icon="microphone-outline"
              title={mt('recorderTitle')}
              description={`${mt('recordStart')} • ${mt('compareWithSheikh')}`}
              colors={colors}
              isRTL={isRTL}
              onPress={() => setLearnMode('recital')}
            />
          </ScrollView>
        </SafeAreaView>
      </BackgroundWrapper>
    );
  }

  if (learnMode === 'daily' && !current) {
    return (
      <BackgroundWrapper
        backgroundKey={appSettings.display.appBackground}
        backgroundUrl={appSettings.display.appBackgroundUrl}
        opacity={appSettings.display.backgroundOpacity ?? 1}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safe} edges={['top']}>
          <UniversalHeader title={mt('learnDailyWird')} onBack={() => setLearnMode('menu')} />
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
        <UniversalHeader
          title={
            learnMode === 'range'
              ? mt('learnListeningRange')
              : learnMode === 'recital'
                ? mt('recorderTitle')
                : mt('learnDailyWird')
          }
          onBack={() => setLearnMode('menu')}
        />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.position}>
          {learnMode === 'range'
            ? isListeningRangeActive
            ? mt('listeningRangeProgress', { ref: displayRef || rangeProgressLabel })
              : `${mt('previewAyah')}: ${displayRef}`
            : learnMode === 'recital'
              ? displayRef
            : current
              ? `${mt('currentWirdPosition', { n: index + 1, total: ayahsLen })} • ${getSurahName(current.surahNumber)}`
              : ''}
        </Text>

        {/* Quran text */}
        <GlassCard style={styles.quranCard}>
          {segments.map((seg, i) => (
            <Text key={i} style={styles.quranText}>
              {seg}
            </Text>
          ))}
          {!!displayAyah && <Text style={styles.ayahNumber}>{formatAyahMarker(displayAyah.ayahNumber)}</Text>}
        </GlassCard>

        {/* Status / step indicator */}
        {learnMode === 'daily' && step !== 'idle' && (
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
              {isListeningRangeActive ? `${mt('listeningRangeProgress', { ref: displayRef || rangeProgressLabel })} • ` : ''}
              {toArabicDigits(iter)} / {toArabicDigits(iterTotal || repeats)}
            </Text>
          </View>
        )}

        {learnMode === 'recital' && (
          <GlassCard style={styles.recorderCard}>
            <View style={styles.rangeHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rangeTitle}>{mt('recorderTitle')}</Text>
                <Text style={styles.rangeHint}>{mt('compareWithSheikh')}</Text>
              </View>
              <MaterialCommunityIcons
                name={recording ? 'record-circle' : 'microphone-outline'}
                size={24}
                color={recording ? '#b00020' : colors.primary}
              />
            </View>

            <View style={styles.rangeInputs}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setSurahSearch('');
                  setSurahPickerTarget('recital');
                  setSurahPickerOpen(true);
                }}
                style={styles.surahPickerButton}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rangeLabel}>{mt('chooseRecitalAyah')}</Text>
                  <Text style={styles.surahPickerName} numberOfLines={1}>
                    {selectedRecitalSurahOption?.name ?? mt('errInvalidSurah')}
                  </Text>
                  {!!selectedRecitalSurahOption && (
                    <Text style={styles.surahPickerMeta} numberOfLines={1}>
                      {toArabicDigits(selectedRecitalSurahOption.ayahCount)} {mt('ayahsUnit')}
                    </Text>
                  )}
                </View>
                <View style={styles.surahNumberPill}>
                  <Text style={styles.surahNumberPillText}>{toArabicDigits(recitalSurahNumber)}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.rangeInputs}>
              <View style={styles.ayahStepperBox}>
                <Text style={styles.rangeLabel}>{mt('ayahNumber')}</Text>
                <View style={styles.ayahStepperRow}>
                  <TouchableOpacity
                    style={styles.ayahStepBtn}
                    onPress={() => setRecitalAyahClamped((parsePositiveInput(recitalAyahNumber) ?? 1) - 1)}
                  >
                    <MaterialCommunityIcons name="minus" size={24} color={colors.primary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.ayahStepInput}
                    value={toArabicDigits(recitalAyahNumber)}
                    onChangeText={(v) => {
                      const normalized = normalizeDigits(v).replace(/[^0-9]/g, '').slice(0, 3);
                      const parsed = parsePositiveInput(normalized);
                      setRecitalAyahNumber(
                        parsed ? String(Math.min(parsed, recitalAyahMax)) : normalized,
                      );
                      setRecordedUri(null);
                    }}
                    onBlur={() => setRecitalAyahClamped(parsePositiveInput(recitalAyahNumber) ?? 1)}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={styles.ayahStepBtn}
                    onPress={() => setRecitalAyahClamped((parsePositiveInput(recitalAyahNumber) ?? 1) + 1)}
                  >
                    <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.quickAyahRow}>
                  <TouchableOpacity
                    style={styles.quickAyahBtn}
                    onPress={() => setRecitalAyahClamped(1)}
                  >
                    <Text style={styles.quickAyahText}>{mt('firstAyah')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickAyahBtn}
                    onPress={() => setRecitalAyahClamped(recitalAyahMax)}
                  >
                    <Text style={styles.quickAyahText}>{mt('lastAyah')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.recordBtn, recording && { backgroundColor: '#b00020' }]}
              onPress={recording ? stopRecording : startRecording}
            >
              <MaterialCommunityIcons
                name={recording ? 'stop-circle' : 'record-circle-outline'}
                size={20}
                color="#fff"
              />
              <Text style={styles.rangePlayText}>
                {recording ? mt('recordStop') : recordedUri ? mt('recordAgain') : mt('recordStart')}
              </Text>
            </TouchableOpacity>

            <View style={styles.recorderActions}>
              <TouchableOpacity
                style={[styles.recorderSecondaryBtn, !recordedUri && { opacity: 0.45 }]}
                disabled={!recordedUri || isPlayingRecording}
                onPress={playRecording}
              >
                <MaterialCommunityIcons name="play-circle-outline" size={18} color={colors.text} />
                <Text style={styles.recorderSecondaryText}>
                  {recordedUri ? mt('recordPlay') : mt('noRecordingYet')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.recorderSecondaryBtn} onPress={playSheikhForRecital}>
                <MaterialCommunityIcons name="account-voice" size={18} color={colors.text} />
                <Text style={styles.recorderSecondaryText}>{mt('compareWithSheikh')}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {learnMode === 'range' && <GlassCard style={styles.rangeCard}>
          <View style={styles.rangeHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeTitle}>{mt('listeningRange')}</Text>
              <Text style={styles.rangeHint}>{mt('listeningRangeHint')}</Text>
            </View>
            <MaterialCommunityIcons name="repeat-variant" size={22} color={colors.primary} />
          </View>
          <View style={styles.rangeInputs}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setSurahSearch('');
                setSurahPickerTarget('range');
                setSurahPickerOpen(true);
              }}
              style={styles.surahPickerButton}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rangeLabel}>{mt('chooseSurah')}</Text>
                <Text style={styles.surahPickerName} numberOfLines={1}>
                  {selectedSurahOption?.name ?? mt('errInvalidSurah')}
                </Text>
                {!!selectedSurahOption && (
                  <Text style={styles.surahPickerMeta} numberOfLines={1}>
                    {toArabicDigits(selectedSurahOption.ayahCount)} {mt('ayahsUnit')}
                  </Text>
                )}
              </View>
              <View style={styles.surahNumberPill}>
                <Text style={styles.surahNumberPillText}>{toArabicDigits(rangeSurahNumber)}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>
          <Text style={styles.rangeSurah}>{getSurahName(rangeSurahNumber)}</Text>
          <View style={styles.rangeInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeLabel}>{mt('ayahFrom')}</Text>
              <TextInput
                style={styles.rangeInput}
                value={toArabicDigits(listenFrom)}
                onChangeText={(v) =>
                  setListenFrom(normalizeDigits(v).replace(/[^0-9]/g, '').slice(0, 3))
                }
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeLabel}>{mt('ayahTo')}</Text>
              <TextInput
                style={styles.rangeInput}
                value={toArabicDigits(listenTo)}
                onChangeText={(v) =>
                  setListenTo(normalizeDigits(v).replace(/[^0-9]/g, '').slice(0, 3))
                }
                keyboardType="number-pad"
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.rangePlayBtn, isPlaying && { backgroundColor: '#b00020' }]}
            onPress={isPlaying ? onStop : onPlayListeningRange}
          >
            <MaterialCommunityIcons name={isPlaying ? 'stop' : 'play'} size={18} color="#fff" />
            <Text style={styles.rangePlayText}>{isPlaying ? 'إيقاف' : mt('playRange')}</Text>
          </TouchableOpacity>
        </GlassCard>}

        <Modal
          visible={surahPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSurahPickerOpen(false)}
        >
          <Pressable style={modalStyles.backdrop} onPress={() => setSurahPickerOpen(false)}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={modalStyles.center}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={[modalStyles.card, styles.surahPickerModal]}
              >
                <Text style={[modalStyles.title, { color: colors.text }]}>
                  {mt('chooseSurah')}
                </Text>
                <TextInput
                  value={surahSearch}
                  onChangeText={setSurahSearch}
                  placeholder={mt('searchSurah')}
                  placeholderTextColor={colors.textLight}
                  style={styles.surahSearchInput}
                />
                <ScrollView style={styles.surahList} keyboardShouldPersistTaps="handled">
                  {filteredSurahOptions.map((surah) => (
                    <TouchableOpacity
                      key={surah.number}
                      onPress={() => {
                        const max = Math.max(1, surah.ayahCount);
                        if (surahPickerTarget === 'range') {
                          setListenSurah(String(surah.number));
                          const from = Math.min(parsePositiveInput(listenFrom) ?? 1, max);
                          const to = Math.min(Math.max(parsePositiveInput(listenTo) ?? from, from), max);
                          setListenFrom(String(from));
                          setListenTo(String(to));
                          setRangePlayingAyah(null);
                          setRangeProgressLabel('');
                        } else {
                          setRecitalSurah(String(surah.number));
                          const ayah = Math.min(parsePositiveInput(recitalAyahNumber) ?? 1, max);
                          setRecitalAyahNumber(String(ayah));
                          setRecordedUri(null);
                        }
                        setSurahPickerOpen(false);
                      }}
                      style={[
                        styles.surahOption,
                        surah.number === (surahPickerTarget === 'range' ? rangeSurahNumber : recitalSurahNumber) &&
                          styles.surahOptionActive,
                      ]}
                    >
                      <View style={styles.surahOptionNumber}>
                        <Text style={styles.surahOptionNumberText}>
                          {toArabicDigits(surah.number)}
                        </Text>
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

        {/* Controls */}
        {learnMode !== 'recital' && <GlassCard style={styles.controlsCard}>
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
        </GlassCard>}

        {/* Magic Start */}
        {learnMode === 'daily' && (!isPlaying ? (
          <TouchableOpacity style={styles.magicBtn} onPress={onMagicStart}>
            <MaterialCommunityIcons name="play-circle" size={22} color="#fff" />
            <Text style={styles.magicText}>{mt('startMemorize')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.magicBtn, { backgroundColor: '#b00020' }]} onPress={onStop}>
            <MaterialCommunityIcons name="stop-circle" size={22} color="#fff" />
            <Text style={styles.magicText}>{mt('recordStop')}</Text>
          </TouchableOpacity>
        ))}

        {/* Mark buttons */}
        {learnMode === 'daily' && <View style={styles.markRow}>
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
        </View>}

        {/* Nav */}
        {learnMode === 'daily' && <View style={styles.navRow}>
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
            disabled={index >= ayahsLen - 1}
            onPress={() => setIndex((i) => Math.min(ayahsLen - 1, i + 1))}
            style={[styles.navBtn, index >= ayahsLen - 1 && { opacity: 0.4 }]}
          >
            <Text style={styles.navText}>{mt('next')}</Text>
            <MaterialCommunityIcons name={rtlChevronForward(isRTL) as any} size={22} color={colors.text} />
          </TouchableOpacity>
        </View>}
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
          fontFamily: 'Rubik-SemiBold',
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ModeChoiceCard({
  icon,
  title,
  description,
  colors,
  isRTL,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  colors: ReturnType<typeof useColors>;
  isRTL: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <GlassCard
          style={{
            padding: 18,
            opacity: pressed ? 0.75 : 1,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <MaterialCommunityIcons name={icon} size={30} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.text,
                fontFamily: 'Rubik-Bold',
                fontSize: 17,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: colors.textLight,
                fontFamily: 'Rubik-Regular',
                fontSize: 13,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
              }}
            >
              {description}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={rtlChevronForward(isRTL) as any}
            size={22}
            color={colors.textLight}
          />
        </GlassCard>
      )}
    </Pressable>
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
          fontFamily: 'Rubik-Regular',
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
          fontFamily: 'Rubik-SemiBold',
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
            fontFamily: 'Rubik-SemiBold',
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
  title: { fontFamily: 'Rubik-Bold', fontSize: 17, textAlign: 'center' },
  hint: { fontFamily: 'Rubik-Regular', fontSize: 12, textAlign: 'center' },
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
    fontFamily: 'Rubik-Bold',
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 2,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  btnText: { fontFamily: 'Rubik-Bold', fontSize: 14 },
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
          fontFamily: 'Rubik-SemiBold',
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
      fontFamily: 'Rubik-SemiBold',
      fontSize: 14,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    controlsCard: { padding: 14, gap: 12 },
    recorderCard: { padding: 14, gap: 12 },
    recordBtn: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 13,
      borderRadius: 12,
    },
    recorderActions: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 8,
    },
    recorderSecondaryBtn: {
      flex: 1,
      minHeight: 50,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
    recorderSecondaryText: {
      color: colors.text,
      fontFamily: 'Rubik-SemiBold',
      fontSize: 12,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    ayahStepperBox: { flex: 1, gap: 8 },
    ayahStepperRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
    },
    ayahStepBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(13,142,98,0.14)',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    ayahStepInput: {
      flex: 1,
      minHeight: 58,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 24,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
    },
    quickAyahRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 8,
    },
    quickAyahBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    quickAyahText: {
      color: colors.text,
      fontFamily: 'Rubik-SemiBold',
      fontSize: 12,
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    rangeCard: { padding: 14, gap: 12 },
    rangeHeader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
    },
    rangeTitle: {
      color: colors.text,
      fontFamily: 'Rubik-Bold',
      fontSize: 14,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    rangeHint: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 12,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    rangeSurah: {
      color: colors.primary,
      fontFamily: 'Rubik-SemiBold',
      fontSize: 13,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    rangeInputs: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 },
    rangeLabel: {
      color: colors.textLight,
      fontFamily: 'Rubik-Regular',
      fontSize: 12,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
      marginBottom: 4,
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
    rangeReadOnly: {
      minHeight: 47,
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    rangeReadOnlyText: {
      color: colors.text,
      fontFamily: 'Rubik-SemiBold',
      fontSize: 13,
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    surahPickerButton: {
      flex: 1,
      minHeight: 74,
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
      lineHeight: 22,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    surahNumberPill: {
      minWidth: 38,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(13,142,98,0.18)',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    surahNumberPillText: {
      color: colors.primary,
      fontFamily: 'Rubik-Bold',
      fontSize: 13,
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
      lineHeight: 22,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    rangePlayBtn: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
    },
    rangePlayText: { color: '#fff', fontFamily: 'Rubik-Bold', fontSize: 14 },
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
    magicText: { color: '#fff', fontFamily: 'Rubik-Bold', fontSize: 16 },
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
