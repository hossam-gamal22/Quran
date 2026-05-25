// app/full-adhan.tsx
// Full Adhan Player — opens when the user taps a prayer/test notification
// scheduled with `useFullAdhan` enabled. Plays the complete 2–4 min adhan
// recording (no OS time cap), shows the canonical Arabic transcript
// statically (no fake sync — see plan), and lets the user pick a voice for
// current+future prayers.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { t } from '@/lib/i18n';
import { getPrayerTranslationKey, type PrayerName } from '@/lib/prayer-times';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useNotificationSettings } from '@/contexts/SettingsContext';
import {
  COMPLETE_ADHAN_SOUNDS,
  resolveCompleteAdhanSource,
  listCompleteAdhanVoices,
  hasCompleteFajrAdhanSource,
  normalizeCompleteAdhanVoice,
} from '@/lib/sound-manager';
import {
  countAdhanRowPhrases,
  getAdhanRows,
  hasVoiceFajrPhrase,
  type CompleteAdhanVoiceKey,
} from '@/data/adhan-transcript';
import { FullAdhanBackground } from '@/components/full-adhan/FullAdhanBackground';
import {
  AdhanVoicePickerSheet,
  COMPLETE_ADHAN_VOICES,
} from '@/components/full-adhan/AdhanVoicePickerSheet';
import BannerAdComponent from '@/components/ads/BannerAd';

const FULL_ADHAN_OPEN_FLAG = '@full_adhan_page_open';

function isCompleteVoiceKey(v: string | undefined): v is CompleteAdhanVoiceKey {
  if (!v) return false;
  return COMPLETE_ADHAN_VOICES.some((entry) => entry.key === v);
}

export default function FullAdhanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isRTL = useIsRTL();
  const { notifications, updateNotifications } = useNotificationSettings();

  const params = useLocalSearchParams<{ prayer?: string; voice?: string; test?: string }>();
  const isTest = params.test === '1';
  const prayerKey = typeof params.prayer === 'string' && params.prayer.length > 0 ? params.prayer : 'dhuhr';

  const initialVoice: CompleteAdhanVoiceKey = useMemo(() => {
    const candidate = normalizeCompleteAdhanVoice(
      (typeof params.voice === 'string' && params.voice) ||
      notifications.fullAdhanSoundType ||
      notifications.adhanSoundType ||
      'makkah',
    );
    if (isCompleteVoiceKey(candidate) && COMPLETE_ADHAN_SOUNDS[candidate] != null) return candidate;
    if (COMPLETE_ADHAN_SOUNDS.makkah != null) return 'makkah';
    return (isCompleteVoiceKey(candidate) ? candidate : 'makkah') as CompleteAdhanVoiceKey;
  }, [params.voice, notifications.fullAdhanSoundType, notifications.adhanSoundType]);

  const [voice, setVoice] = useState<CompleteAdhanVoiceKey>(initialVoice);
  const [isPlaying, setIsPlaying] = useState(false);
  const [didFinish, setDidFinish] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const hasDedicatedFajrAudio = hasCompleteFajrAdhanSource();
  const transcriptRows = useMemo(
    () => getAdhanRows(prayerKey, voice, hasDedicatedFajrAudio),
    [prayerKey, voice, hasDedicatedFajrAudio],
  );
  const phraseCount = useMemo(() => countAdhanRowPhrases(transcriptRows), [transcriptRows]);
  const hasFajrPhrase = prayerKey === 'fajr' && (hasDedicatedFajrAudio || hasVoiceFajrPhrase(voice));
  const stackTranscriptPairs = width < 430;

  useEffect(() => {
    if (__DEV__) {
      console.log('[FullAdhan] transcript', {
        prayer: prayerKey,
        voice,
        hasFajrPhrase,
        phraseCount,
      });
    }
  }, [prayerKey, voice, hasFajrPhrase, phraseCount]);

  const stopOtherAudioSources = useCallback(async () => {
    // 1. Stop the Android foreground service if it's already playing the 35s clip
    //    (handles the case where the user tapped the notification while the
    //    foreground service was still running). Guarded so it doesn't crash on
    //    iOS or in Expo Go where the native module is missing.
    if (Platform.OS === 'android') {
      const FullAdhanModule = (NativeModules as any)?.FullAdhanModule;
      if (FullAdhanModule?.stopFullAdhan) {
        try { await FullAdhanModule.stopFullAdhan(); } catch {}
      } else if (FullAdhanModule?.stopPlayback) {
        // Backward compatibility for older dev builds that exposed this name.
        try { await FullAdhanModule.stopPlayback(); } catch {}
      }
    }
    // 2. Stop any leftover expo-av Sound from the previous mount of this page
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); } catch {}
      try { await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
  }, []);

  const loadAndPlay = useCallback(async (nextVoice: CompleteAdhanVoiceKey) => {
    setDidFinish(false);
    setLoadError(false);

    const source = resolveCompleteAdhanSource(nextVoice, prayerKey);
    if (source == null) {
      // No complete-adhan recordings bundled yet (asset PR has not landed)
      setLoadError(true);
      return;
    }

    await stopOtherAudioSources();

    try {
      // Audio session: match the existing app pattern (sound-manager.ts).
      // Honors physical volume, plays even with the silent ringer switch on,
      // and asks the OS to prioritize adhan playback over other app media.
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      } catch {}

      const { sound } = await Audio.Sound.createAsync(
        source,
        { shouldPlay: true, volume: 1.0, isLooping: false },
        (status: AVPlaybackStatus) => {
          if (!status.isLoaded) return;
          setIsPlaying(status.isPlaying === true);
          if (status.didJustFinish) {
            setDidFinish(true);
            setIsPlaying(false);
          }
        },
      );
      soundRef.current = sound;
    } catch (e) {
      console.warn('[FullAdhan] failed to load audio:', e);
      setLoadError(true);
    }
  }, [prayerKey, stopOtherAudioSources]);

  // Mount: set the open-flag (Android service checks this to avoid double playback),
  // start audio. Unmount: clear flag and stop audio.
  useEffect(() => {
    let mounted = true;
    AsyncStorage.setItem(FULL_ADHAN_OPEN_FLAG, '1').catch(() => {});
    (async () => {
      if (!mounted) return;
      await loadAndPlay(initialVoice);
    })();
    return () => {
      mounted = false;
      AsyncStorage.removeItem(FULL_ADHAN_OPEN_FLAG).catch(() => {});
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/prayer');
  }, [router]);

  const handleTogglePlay = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const sound = soundRef.current;
    if (!sound) {
      // Replay from start if audio finished or never loaded
      await loadAndPlay(voice);
      return;
    }
    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        await loadAndPlay(voice);
        return;
      }
      if (didFinish) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
        setDidFinish(false);
      } else if (status.isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch {
      await loadAndPlay(voice);
    }
  }, [voice, didFinish, loadAndPlay]);

  const handleVoiceChange = useCallback(async (nextVoice: CompleteAdhanVoiceKey) => {
    setShowPicker(false);
    setVoice(nextVoice);
    // Persist only the full-adhan voice. The regular notification adhan sound
    // has its own premium-gated setting and must stay independent.
    try {
      await updateNotifications({ fullAdhanSoundType: nextVoice });
    } catch (e) {
      console.warn('[FullAdhan] failed to persist voice:', e);
    }
    // Replay current playback with the new voice.
    await loadAndPlay(nextVoice);
  }, [updateNotifications, loadAndPlay]);

  const prayerTitleKey = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(prayerKey)
    ? getPrayerTranslationKey(prayerKey as PrayerName)
    : `prayer.${prayerKey}`;

  const titleText = isTest
    ? t('fullAdhan.testTitle')
    : t('fullAdhan.prayerTitle', { prayer: t(prayerTitleKey) });

  const closeIcon = isRTL ? 'chevron-right' : 'chevron-left';
  const availableVoices = useMemo(
    () => listCompleteAdhanVoices().filter(isCompleteVoiceKey) as CompleteAdhanVoiceKey[],
    [],
  );

  return (
    <FullAdhanBackground>
      <View
        style={[
          styles.topBar,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <Pressable
          onPress={handleTogglePlay}
          hitSlop={12}
          style={({ pressed }) => [
            styles.iconBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialCommunityIcons
            name={didFinish ? 'replay' : isPlaying ? 'pause' : 'play'}
            size={24}
            color="#ffffff"
          />
        </Pressable>

        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={styles.titleText} numberOfLines={1}>{titleText}</Text>
          {isTest && (
            <View style={styles.testBadge}>
              <Text style={styles.testBadgeText}>{t('fullAdhan.testBadge')}</Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={handleClose}
          hitSlop={12}
          style={({ pressed }) => [
            styles.iconBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialCommunityIcons name={closeIcon} size={24} color="#ffffff" />
        </Pressable>
      </View>

      <View style={styles.middle}>
        {loadError ? (
          <View style={styles.errorWrap}>
            <MaterialCommunityIcons name="alert-circle-outline" size={44} color="#ffffff" />
            <Text style={styles.errorText}>{t('fullAdhan.loadError')}</Text>
            <Pressable
              onPress={() => loadAndPlay(voice)}
              style={({ pressed }) => [
                styles.retryBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.retryBtnText}>{t('fullAdhan.retry')}</Text>
            </Pressable>
          </View>
        ) : didFinish ? (
          <View style={styles.completedWrap}>
            <Text style={styles.completedText}>{t('fullAdhan.completed')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {transcriptRows.map((row, i) => {
              if (row.center) {
                return (
                  <Text
                    key={`center-${i}-${row.center}`}
                    style={[styles.phrase, styles.centerPhrase]}
                    allowFontScaling={false}
                  >
                    {row.center}
                  </Text>
                );
              }

              return (
                <View
                  key={`pair-${i}-${row.left}-${row.right}`}
                  style={[
                    styles.phraseRow,
                    stackTranscriptPairs && styles.phraseRowStacked,
                  ]}
                >
                  <Text
                    style={[styles.phrase, styles.pairedPhrase]}
                    allowFontScaling={false}
                  >
                    {row.left}
                  </Text>
                  <Text
                    style={[styles.phrase, styles.pairedPhrase]}
                    allowFontScaling={false}
                  >
                    {row.right}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={({ pressed }) => [
            styles.pickerTrigger,
            {
              flexDirection: isRTL ? 'row-reverse' : 'row',
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name="cog-outline" size={20} color="#ffffff" />
          <Text style={styles.pickerTriggerText}>{t('fullAdhan.voicePickerTitle')}</Text>
        </Pressable>

        <View style={styles.adWrap}>
          <BannerAdComponent slotKey="full_adhan_page" />
        </View>
      </View>

      <AdhanVoicePickerSheet
        visible={showPicker}
        selectedVoice={voice}
        availableVoices={availableVoices}
        onSelect={handleVoiceChange}
        onClose={() => setShowPicker(false)}
      />
    </FullAdhanBackground>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'center',
  },
  testBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
  },
  testBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Rubik-SemiBold',
  },
  middle: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  phraseRow: {
    width: '100%',
    maxWidth: 720,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 18,
  },
  phraseRowStacked: {
    flexDirection: 'column',
    rowGap: 2,
  },
  phrase: {
    color: '#ffffff',
    fontSize: 22,
    lineHeight: 38,
    fontFamily: 'KFGQPCUthmanic',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pairedPhrase: {
    flex: 1,
  },
  centerPhrase: {
    width: '100%',
    maxWidth: 720,
    fontSize: 24,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
  },
  completedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  completedText: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Rubik-SemiBold',
    textAlign: 'center',
    lineHeight: 38,
  },
  bottom: {
    alignItems: 'center',
  },
  pickerTrigger: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pickerTriggerText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
  },
  adWrap: {
    width: '100%',
    alignItems: 'center',
  },
});
