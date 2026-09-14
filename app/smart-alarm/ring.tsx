import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { fontBold, fontMedium, fontSemiBold } from '@/lib/fonts';
import { uiText } from '@/lib/ui-text';
import { getLanguage } from '@/lib/i18n';
import { useSmartAlarm } from '@/contexts/SmartAlarmContext';
import { ChallengeRunner } from '@/components/smart-alarm/challenges/ChallengeRunner';
import { FajrStreakBanner } from '@/components/smart-alarm/FajrStreakBanner';
import { cancelAllPendingRings } from '@/lib/smart-alarm/scheduler';
import {
  appendAlarmHistory,
  updateLatestHistory,
} from '@/lib/smart-alarm/storage';
import { resolveCompleteAdhanSource } from '@/lib/sound-manager';
import { formatLocalizedTime } from '@/lib/smart-alarm/format-time';
import { toggleFasting, formatDate, getFastingRecord } from '@/lib/worship-storage';
import type { SmartAlarmKind } from '@/lib/smart-alarm/types';

// Alarm ringtones bundled for Suhoor in-app playback. Fajr goes through
// resolveCompleteAdhanSource for the proper full adhan recording.
const ALARM_ASSETS: Record<string, number> = {
  alarm_classic: require('../../assets/sounds/alarm_classic.mp3'),
  alarm_digital: require('../../assets/sounds/alarm_digital.mp3'),
  alarm_buzzer: require('../../assets/sounds/alarm_buzzer.mp3'),
  alarm_radar: require('../../assets/sounds/alarm_radar.mp3'),
  alarm_chime: require('../../assets/sounds/alarm_chime.mp3'),
};

const HADITHS_AR = [
  'سُئل رسول الله ﷺ: أي العمل أحب إلى الله؟ قال: «الصلاة على وقتها»',
  'قال رسول الله ﷺ: «ركعتا الفجر خير من الدنيا وما فيها»',
  'قال رسول الله ﷺ: «من صلى البردين دخل الجنة»',
  'قال الله تعالى: ﴿وَقُرْآنَ الْفَجْرِ ۖ إِنَّ قُرْآنَ الْفَجْرِ كَانَ مَشْهُودًا﴾',
];

const HADITHS_EN = [
  'The Prophet ﷺ was asked: "Which deed is most beloved to Allah?" He said: "Prayer at its proper time."',
  'The Prophet ﷺ said: "The two rak\'ahs of Fajr are better than the world and all it contains."',
  'The Prophet ﷺ said: "Whoever prays the two cool prayers will enter Paradise."',
  'Allah says: "The recitation of dawn is ever witnessed." (Quran 17:78)',
];

function pickDaily(arr: string[]): string {
  const day = Math.floor(Date.now() / 86_400_000);
  return arr[day % arr.length];
}

export default function SmartAlarmRingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string; preview?: string }>();
  const kind: SmartAlarmKind = params.kind === 'suhoor' ? 'suhoor' : 'fajr';
  const isPreview = params.preview === '1';
  const { config, nextFajrAlarm, nextSuhoorAlarm } = useSmartAlarm();

  // For Suhoor, we don't have a "full adhan" — we'll just keep silent in-app
  // playback (the lockscreen notification sound is enough). The adhan voice
  // is only meaningful for the Fajr ring screen.
  const adhanVoice = kind === 'fajr' ? config.fajr.adhanVoice : 'makkah';
  const suhoorRingtone = config.suhoor.ringtoneKey;
  const challenge = kind === 'fajr' ? config.fajr.challenge : 'none';
  const difficulty = config.fajr.difficulty;

  // Auto-start the challenge when one is configured (per user spec —
  // no front-face button needed; the alarm IS the challenge).
  const hasRealChallenge = kind === 'fajr' && challenge !== 'none';

  const soundRef = useRef<Audio.Sound | null>(null);
  const [now, setNow] = useState(new Date());
  const [showChallenge, setShowChallenge] = useState(hasRealChallenge);
  const [dismissed, setDismissed] = useState(false);
  const startedAt = useRef(new Date());

  // Preview shows the ACTUAL upcoming alarm time, not the current device clock,
  // so the user sees exactly what time the alarm will trigger.
  const previewClock = useMemo(() => {
    const target = kind === 'fajr' ? nextFajrAlarm : nextSuhoorAlarm;
    return target ?? now;
  }, [kind, nextFajrAlarm, nextSuhoorAlarm, now]);

  const hadith = useMemo(
    () => pickDaily(getLanguage() === 'ar' ? HADITHS_AR : HADITHS_EN),
    [],
  );

  // On mount: cancel ALL pending cascade notifications (no more lockscreen rings),
  // then start the in-app full adhan as fast as possible.
  useEffect(() => {
    let cancelled = false;

    // Fire setAudioModeAsync without awaiting — runs in parallel with sound load
    // so the adhan starts ~200-400 ms sooner.
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    }).catch(() => {});

    const start = async () => {
      if (!isPreview) {
        cancelAllPendingRings(kind).catch(() => {});
      }

      try {
        // Fajr plays the full adhan recording (with "الصلاة خير من النوم").
        // Suhoor loops the configured alarm ringtone — there's no spoken adhan for suhoor.
        const source =
          kind === 'fajr'
            ? resolveCompleteAdhanSource(adhanVoice, 'fajr')
            : (ALARM_ASSETS[suhoorRingtone] ?? ALARM_ASSETS.alarm_chime);

        if (source == null) {
          if (__DEV__) console.warn('[ring] no adhan source resolved');
          return;
        }

        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        });
        if (cancelled) {
          sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
      } catch (e) {
        if (__DEV__) console.warn('[ring] adhan playback failed', e);
      }
    };

    void start();

    if (!isPreview) {
      appendAlarmHistory({
        kind,
        date: startedAt.current.toISOString().slice(0, 10),
        scheduledAt: startedAt.current.toISOString(),
        dismissedAt: null,
        challengePassed: false,
        snoozeCount: 0,
      }).catch(() => {});
    }

    return () => {
      cancelled = true;
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [kind, adhanVoice, suhoorRingtone, isPreview]);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Block hardware back unless this is a preview.
  useEffect(() => {
    if (isPreview) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isPreview]);

  const finalDismiss = useCallback(
    async (challengePassed: boolean) => {
      if (dismissed) return;
      setDismissed(true);

      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      if (!isPreview) {
        await updateLatestHistory(kind, {
          dismissedAt: new Date().toISOString(),
          challengePassed,
        }).catch(() => {});

        // Auto-log fasting on successful Suhoor dismiss — the user is awake
        // for suhoor, so they'll fast today. Reflects in worship stats + honor board.
        if (kind === 'suhoor' && config.suhoor.logFastingOnDismiss) {
          try {
            const today = formatDate(new Date());
            const existing = await getFastingRecord(today);
            if (!existing?.fasted) {
              await toggleFasting(today, 'voluntary');
            }
          } catch (e) {
            if (__DEV__) console.warn('[ring] fasting log failed', e);
          }
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    },
    [dismissed, kind, router, isPreview, config.suhoor.logFastingOnDismiss],
  );

  const onTapDismiss = useCallback(() => {
    // Only reachable when no challenge OR suhoor — instant dismiss
    finalDismiss(true);
  }, [finalDismiss]);

  const clockForDisplay = isPreview ? previewClock : now;
  const timeLabel = formatLocalizedTime(clockForDisplay);
  const titleLabel =
    kind === 'fajr'
      ? uiText({ ar: 'حان وقت الفجر', en: 'Time for Fajr' })
      : uiText({ ar: 'وقت السحور', en: 'Suhoor time' });

  return (
    <View style={[styles.root, { paddingTop: insets.top + (isPreview ? 104 : 56), paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#052017', '#0a3d2a', '#062a1d']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {isPreview && (
        <View style={[styles.previewBadgeWrap, { top: insets.top + 20 }]} pointerEvents="none">
          <View style={styles.previewBadge}>
            <MaterialCommunityIcons name="eye-outline" size={16} color="#FFFFFF" />
            <Text style={styles.previewBadgeText}>
              {uiText({ ar: 'معاينة', en: 'Preview' })}
            </Text>
          </View>
        </View>
      )}

      {!showChallenge && (
        <View style={styles.frontFace}>
          {/* Top: icon */}
          <View style={styles.topZone}>
            <MaterialCommunityIcons
              name={kind === 'fajr' ? 'mosque' : 'silverware-fork-knife'}
              size={72}
              color="#FFD27A"
            />
          </View>

          {/* Center: title + time */}
          <View style={styles.centerZone}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              {titleLabel}
            </Text>
            <Text style={styles.time} numberOfLines={1} adjustsFontSizeToFit>
              {timeLabel}
            </Text>
          </View>

          {/* Below center: hadith */}
          <View style={styles.hadithZone}>
            <Text style={styles.hadithText}>{hadith}</Text>
          </View>

          {/* Bottom: dismiss action */}
          <View style={styles.actions}>
            <Pressable
              onPress={onTapDismiss}
              style={({ pressed }) => [
                styles.dismissBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.dismissBtnText}>
                {uiText({ ar: 'إيقاف المنبه', en: 'Dismiss' })}
              </Text>
            </Pressable>

            {isPreview && (
              <Pressable
                onPress={() => finalDismiss(false)}
                style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={styles.secondaryBtnText}>
                  {uiText({ ar: 'إنهاء المعاينة', en: 'Exit preview' })}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {showChallenge && (
        <View style={styles.challengeWrap}>
          <View style={styles.challengeHeader}>
            <MaterialCommunityIcons
              name={kind === 'fajr' ? 'mosque' : 'silverware-fork-knife'}
              size={48}
              color="#FFD27A"
            />
            <Text style={styles.challengeTitle} numberOfLines={1} adjustsFontSizeToFit>
              {titleLabel}
            </Text>
            <Text style={styles.challengeTime}>{timeLabel}</Text>
            <Text style={styles.challengeHadith} numberOfLines={2}>{hadith}</Text>
          </View>

          <View style={styles.challengeBody}>
            <ChallengeRunner
              type={challenge}
              difficulty={difficulty}
              onCompleted={() => finalDismiss(true)}
            />
          </View>

          {/* Footer */}
          <View style={styles.challengeFooter}>
            {kind === 'fajr' && <FajrStreakBanner />}
            <Text style={styles.cancelHint}>
              {uiText({
                ar: 'أكمل التحدي لإيقاف المنبه',
                en: 'Complete the challenge to stop the alarm',
              })}
            </Text>
            {isPreview && (
              <Pressable
                onPress={() => finalDismiss(false)}
                style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.75 : 1, marginTop: 12 }]}
              >
                <Text style={styles.secondaryBtnText}>
                  {uiText({ ar: 'إنهاء المعاينة', en: 'Exit preview' })}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  previewBadgeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  previewBadgeText: { fontSize: 14, fontFamily: fontBold(), color: '#FFFFFF' },

  // Front face — content distributed across full screen height
  frontFace: { flex: 1 },
  topZone: { alignItems: 'center', paddingTop: 0 },
  centerZone: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  title: { fontSize: 26, fontFamily: fontBold(), color: '#FFFFFF', textAlign: 'center', width: '100%', includeFontPadding: false, lineHeight: 36 },
  time: {
    fontSize: 70,
    fontFamily: fontBold(),
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  hadithZone: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  hadithText: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  actions: { gap: 10 },
  dismissBtn: {
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  dismissBtnText: { fontSize: 17, fontFamily: fontBold(), color: '#0a3b2a' },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 999,
  },
  secondaryBtnText: { fontSize: 14, fontFamily: fontSemiBold(), color: '#FFFFFF' },

  // Challenge face — compact so the challenge body fits on small Android screens
  challengeWrap: { flex: 1 },
  challengeHeader: { alignItems: 'center', gap: 4, paddingTop: 0, paddingBottom: 12 },
  challengeTitle: {
    fontSize: 18,
    fontFamily: fontSemiBold(),
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
    lineHeight: 26,
  },
  challengeTime: {
    fontSize: 38,
    fontFamily: fontBold(),
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
  },
  challengeHadith: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  challengeBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  challengeFooter: { paddingTop: 4, gap: 12 },
  cancelHint: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
});
