// components/quran/AudioPlayerBar.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { useQuran } from '@/contexts/QuranContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Spacing, BorderRadius, FONT_SIZES } from '@/constants/theme';

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

interface AudioPlayerBarProps {
  /** If true, use global positioning (for root layout). Otherwise no absolute positioning. */
  global?: boolean;
}

export function AudioPlayerBar({ global = false }: AudioPlayerBarProps) {
  const { isDarkMode } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const {
    playbackState,
    togglePlayPause,
    stopPlayback,
    playNext,
    playPrevious,
    seekTo,
    surahs,
  } = useQuran();

  const [minimized, setMinimized] = useState(false);
  const { isPlaying, isLoading, currentSurah, currentAyah, duration, position } = playbackState;

  // All hooks must be called before any early return (Rules of Hooks)
  const handleSeek = useCallback((value: number) => {
    seekTo(value);
  }, [seekTo]);

  // Navigate to current surah when tapping player from outside surah page
  const navigateToSurah = useCallback(() => {
    if (currentSurah > 0) {
      const isInSurahPage = pathname.startsWith('/surah/');
      if (!isInSurahPage) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(`/surah/${currentSurah}`);
      }
    }
  }, [currentSurah, pathname, router]);

  if (currentSurah === 0 && !isPlaying && !isLoading) {
    return null;
  }

  const surahName = surahs.find(s => s.number === currentSurah)?.name || '';
  const primaryColor = '#2f7659';
  const textColor = isDarkMode ? '#fff' : '#1C1C1E';
  const textSecondary = isDarkMode ? '#8E8E93' : '#3A3A3C';

  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  const toggleMinimize = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMinimized(prev => !prev);
  };

  // ── Minimized pill view ──
  if (minimized) {
    return (
      <Pressable
        onPress={navigateToSurah}
        onLongPress={toggleMinimize}
        style={[styles.container, global && styles.globalPosition]}
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
                backgroundColor: isDarkMode
                  ? 'rgba(28,28,30,0.55)'
                  : 'rgba(255,255,255,0.6)',
                borderColor: isDarkMode
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.06)',
              },
            ]}
          >
            <Pressable
              onPress={(e) => { e.stopPropagation && e.stopPropagation(); handlePress(togglePlayPause); }}
              style={[styles.miniPlayBtn, { backgroundColor: primaryColor }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialCommunityIcons
                  name={isPlaying ? 'pause' : 'play'}
                  size={18}
                  color="#fff"
                />
              )}
            </Pressable>
            <Text style={[styles.miniText, { color: textColor }]} numberOfLines={1}>
              {surahName}
            </Text>
            <Pressable
              onPress={(e) => { e.stopPropagation && e.stopPropagation(); handlePress(stopPlayback); }}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="close" size={18} color={textSecondary} />
            </Pressable>
          </View>
        </BlurView>
      </Pressable>
    );
  }

  // ── Full expanded view ──
  return (
    <View style={[styles.container, global && styles.globalPosition]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 90 : 50}
        tint={isDarkMode ? 'dark' : 'light'}
        style={styles.blur}
      >
        <View
          style={[
            styles.inner,
            {
              backgroundColor: isDarkMode
                ? 'rgba(28,28,30,0.45)'
                : 'rgba(255,255,255,0.5)',
              borderColor: isDarkMode
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          {/* Top row: info + controls */}
          <View style={styles.topRow}>
            {/* معلومات التشغيل */}
            <View style={styles.info}>
              <Text style={[styles.surahName, { color: textColor }]} numberOfLines={1}>
                {surahName}
              </Text>
              <Text style={[styles.ayahNumber, { color: textSecondary }]}>
                الآية {currentAyah}
              </Text>
            </View>

            {/* أزرار التحكم */}
            <View style={styles.controls}>
              <Pressable onPress={toggleMinimize} style={styles.controlButton}>
                <MaterialCommunityIcons name="chevron-down" size={22} color={textColor} />
              </Pressable>

              <Pressable onPress={() => handlePress(playPrevious)} style={styles.controlButton}>
                <MaterialCommunityIcons name="skip-next" size={22} color={textColor} />
              </Pressable>

              <Pressable
                onPress={() => handlePress(togglePlayPause)}
                style={[styles.playButton, { backgroundColor: primaryColor }]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <MaterialCommunityIcons
                    name={isPlaying ? 'pause' : 'play'}
                    size={26}
                    color="#fff"
                  />
                )}
              </Pressable>

              <Pressable onPress={() => handlePress(playNext)} style={styles.controlButton}>
                <MaterialCommunityIcons name="skip-previous" size={22} color={textColor} />
              </Pressable>

              <Pressable onPress={() => handlePress(stopPlayback)} style={styles.controlButton}>
                <MaterialCommunityIcons name="stop" size={22} color="#FF3B30" />
              </Pressable>
            </View>
          </View>

          {/* Progress bar / scrubber */}
          {duration > 0 && (
            <View style={styles.progressRow}>
              <Text style={[styles.timeText, { color: textSecondary }]}>
                {formatTime(position)}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration}
                value={position}
                onSlidingComplete={handleSeek}
                minimumTrackTintColor={primaryColor}
                maximumTrackTintColor={isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                thumbTintColor={primaryColor}
              />
              <Text style={[styles.timeText, { color: textSecondary }]}>
                {formatTime(duration)}
              </Text>
            </View>
          )}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: 12,
  },
  globalPosition: {
    position: 'absolute',
    bottom: 56,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 50,
  },
  blur: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  inner: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: Spacing.md,
  },
  surahName: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Cairo-SemiBold',
    fontWeight: '600',
    textAlign: 'right',
  },
  ayahNumber: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Cairo-Regular',
    textAlign: 'right',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  controlButton: {
    padding: Spacing.xs,
  },
  playButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  slider: {
    flex: 1,
    height: 24,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'Cairo-Regular',
    minWidth: 32,
    textAlign: 'center',
  },
  // Mini pill (minimized state)
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  miniPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Cairo-SemiBold',
    fontWeight: '600',
    textAlign: 'right',
  },
});
