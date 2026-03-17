// components/ui/GlobalAudioBar.tsx
// Unified audio bar for all audio sources (Quran + Azkar)

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { useRouter, usePathname } from 'expo-router';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useQuran } from '@/contexts/QuranContext';
import { t } from '@/lib/i18n';
import { FONT_SIZES, BorderRadius, Spacing } from '@/constants/theme';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const ACCENT = '#2f7659';

export function GlobalAudioBar() {
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const { state, togglePlayPause, stop, seekTo, next, previous, playbackSpeed, setPlaybackSpeed } = useGlobalAudio();
  const { playbackState, togglePlayPause: quranToggle, stopPlayback: quranStop, playNext: quranNext, playPrevious: quranPrev, seekTo: quranSeek, surahs } = useQuran();
  const router = useRouter();
  const pathname = usePathname();
  const [minimized, setMinimized] = useState(false);

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(playbackSpeed);
    const nextSpeed = SPEEDS[(idx + 1) % SPEEDS.length];
    setPlaybackSpeed(nextSpeed);
  }, [playbackSpeed, setPlaybackSpeed]);

  const handlePress = useCallback((action: () => void) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  }, []);

  // Determine active source
  const isQuran = state.source === 'quran' || (playbackState.isPlaying || playbackState.isLoading);
  const isAzkar = state.source === 'azkar';
  const isRadio = state.source === 'radio';

  // Nothing playing — hide bar
  if (!isQuran && !isAzkar && !isRadio) return null;
  if (isAzkar && !state.isPlaying && !state.isLoading && !state.trackTitle) return null;
  if (isQuran && playbackState.currentSurah === 0 && !playbackState.isPlaying && !playbackState.isLoading) return null;
  if (isRadio && !state.isPlaying && !state.isLoading) return null;

  // Hide on azkar page that owns this audio (it has its own player UI)
  if (isAzkar && state.sourceRoute && pathname === state.sourceRoute) return null;
  // Hide on radio page (it has its own now-playing bar)
  if (isRadio && pathname === '/radio') return null;

  // Resolve display properties based on source
  const surahName = isQuran ? (surahs.find(s => s.number === playbackState.currentSurah)?.name || '') : '';
  const displayTitle = isQuran ? `${surahName} - ${t('quran.ayah')} ${playbackState.currentAyah}` : isRadio ? state.trackTitle : state.trackTitle;
  const displayIcon: 'book-open-variant' | 'headphones' | 'radio' = isQuran ? 'book-open-variant' : isRadio ? 'radio' : 'headphones';
  const isPlaying = isQuran ? playbackState.isPlaying : state.isPlaying;
  const isLoading = isQuran ? playbackState.isLoading : state.isLoading;
  const currentPosition = isQuran ? playbackState.position : state.position;
  const currentDuration = isQuran ? playbackState.duration : state.duration;
  const showQueue = isAzkar && state.queueLength > 1;
  const showSpeed = isAzkar;
  const isLive = isRadio;

  const handleTogglePlay = () => {
    if (isQuran) quranToggle();
    else togglePlayPause();
  };

  const handleStop = () => {
    if (isQuran) quranStop();
    else stop();
  };

  const handleNext = () => {
    if (isQuran) quranNext();
    else next();
  };

  const handlePrevious = () => {
    if (isQuran) quranPrev();
    else previous();
  };

  const handleSeek = (v: number) => {
    if (isQuran) quranSeek(v);
    else seekTo(v);
  };

  const navigateToSurah = () => {
    if (isQuran && playbackState.currentSurah > 0 && !pathname.startsWith('/surah/')) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/surah/${playbackState.currentSurah}`);
    }
  };

  const navigateToSource = () => {
    if (isQuran) {
      navigateToSurah();
    } else if (isRadio && pathname !== '/radio') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/radio' as any);
    } else if (isAzkar && state.sourceRoute && pathname !== state.sourceRoute) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(state.sourceRoute as any);
    }
  };

  const textColor = isDarkMode ? '#fff' : '#1C1C1E';
  const textSecondary = isDarkMode ? '#8E8E93' : '#3A3A3C';

  if (minimized) {
    return (
      <Pressable
        onLongPress={() => setMinimized(false)}
        onPress={navigateToSource}
        style={[styles.container, styles.globalPosition]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 90 : 50}
          tint={isDarkMode ? 'dark' : 'light'}
          style={styles.blur}
        >
          <View
            style={[
              styles.miniPill,
              {
                backgroundColor: isDarkMode ? 'rgba(28,28,30,0.55)' : 'rgba(255,255,255,0.6)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Pressable onPress={() => handlePress(handleStop)} hitSlop={8} style={styles.closeCircle}>
              <MaterialCommunityIcons name="close" size={14} color="#fff" />
            </Pressable>

            <Pressable
              onPress={() => handlePress(handleTogglePlay)}
              style={[styles.miniPlayBtn, { backgroundColor: ACCENT }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
              )}
            </Pressable>

            <Text style={[styles.miniText, { color: textColor, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {displayTitle}
            </Text>

            {showQueue && (
              <Text style={[styles.queueBadge, { color: textSecondary }]}>
                {state.queueIndex + 1}/{state.queueLength}
              </Text>
            )}

            <Pressable onPress={() => setMinimized(false)} hitSlop={8}>
              <MaterialCommunityIcons name="chevron-up" size={18} color={textSecondary} />
            </Pressable>
          </View>
        </BlurView>
      </Pressable>
    );
  }

  // Expanded view
  return (
    <Pressable onPress={navigateToSource} style={[styles.container, styles.globalPosition]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 90 : 50}
        tint={isDarkMode ? 'dark' : 'light'}
        style={styles.blur}
      >
        <View
          style={[
            styles.expanded,
            {
              backgroundColor: isDarkMode ? 'rgba(28,28,30,0.55)' : 'rgba(255,255,255,0.6)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          {/* Header row */}
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Pressable onPress={() => handlePress(handleStop)} hitSlop={8} style={styles.closeCircle}>
              <MaterialCommunityIcons name="close" size={14} color="#fff" />
            </Pressable>
            <View style={[styles.titleContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name={displayIcon} size={16} color={ACCENT} />
              <Text style={[styles.title, { color: textColor, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                {displayTitle}
              </Text>
              {isRadio && isPlaying && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' }} />
                  <Text style={{ fontSize: 10, fontFamily: fontMedium(), color: '#EF4444' }}>LIVE</Text>
                </View>
              )}
              {isAzkar && state.trackSubtitle ? (
                <Text style={[styles.queueInfo, { color: textSecondary, marginTop: 2 }]} numberOfLines={1}>
                  {state.trackSubtitle}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={() => setMinimized(true)} hitSlop={8}>
              <MaterialCommunityIcons name="chevron-down" size={20} color={textSecondary} />
            </Pressable>
          </View>

          {/* Queue info */}
          {showQueue && (
            <Text style={[styles.queueInfo, { color: textSecondary }]}>
              {state.queueIndex + 1} / {state.queueLength}
            </Text>
          )}

          {/* Progress slider (not for live radio) */}
          {currentDuration > 0 && !isLive && (
            <View style={[styles.sliderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.time, { color: textSecondary }]}>{formatTime(currentPosition)}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={Math.max(currentDuration, 1)}
                value={currentPosition}
                onSlidingComplete={(v) => handleSeek(v)}
                minimumTrackTintColor={ACCENT}
                maximumTrackTintColor={isDarkMode ? '#3A3A3C' : '#D1D1D6'}
                thumbTintColor={ACCENT}
              />
              <Text style={[styles.time, { color: textSecondary }]}>{formatTime(currentDuration)}</Text>
            </View>
          )}

          {/* Controls */}
          <View style={[styles.controls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Speed button (azkar only) */}
            {showSpeed ? (
              <Pressable onPress={() => handlePress(cycleSpeed)} style={styles.speedBtn}>
                <Text style={[styles.speedText, { color: ACCENT }]}>
                  {playbackSpeed}x
                </Text>
              </Pressable>
            ) : (
              <View style={styles.speedBtn} />
            )}

            <Pressable onPress={() => handlePress(handlePrevious)} hitSlop={8} style={styles.controlBtn}>
              <MaterialCommunityIcons name={isQuran ? 'skip-next' : 'skip-previous'} size={28} color={textColor} />
            </Pressable>

            <Pressable
              onPress={() => handlePress(handleTogglePlay)}
              style={[styles.playBtn, { backgroundColor: ACCENT }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialCommunityIcons
                  name={isPlaying ? 'pause' : 'play'}
                  size={28}
                  color="#fff"
                />
              )}
            </Pressable>

            <Pressable onPress={() => handlePress(handleNext)} hitSlop={8} style={styles.controlBtn}>
              <MaterialCommunityIcons name={isQuran ? 'skip-previous' : 'skip-next'} size={28} color={textColor} />
            </Pressable>

            {/* Spacer to balance speed button */}
            <View style={styles.speedBtn} />
          </View>
        </View>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
  },
  globalPosition: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 90,
    zIndex: 999,
  },
  blur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  // Mini
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 0.5,
    gap: 8,
  },
  closeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(120,120,128,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: fontMedium(),
  },
  queueBadge: {
    fontSize: FONT_SIZES.xs,
    fontFamily: fontRegular(),
  },
  // Expanded
  expanded: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 0.5,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontSemiBold(),
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueInfo: {
    fontSize: FONT_SIZES.xs,
    fontFamily: fontRegular(),
    textAlign: 'center',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 20,
  },
  time: {
    fontSize: 11,
    fontFamily: fontRegular(),
    width: 38,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlBtn: {
    padding: 4,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedBtn: {
    width: 40,
    alignItems: 'center',
  },
  speedText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: fontBold(),
  },
});
