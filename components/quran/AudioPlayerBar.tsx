// components/quran/AudioPlayerBar.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuran } from '@/contexts/QuranContext';
import { useColors } from '@/hooks/use-colors';
import { GlassCard } from '@/components/ui/GlassCard';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';

export function AudioPlayerBar() {
  const colors = useColors();
  const {
    playbackState,
    togglePlayPause,
    stopPlayback,
    playNext,
    playPrevious,
    surahs,
  } = useQuran();

  const { isPlaying, isLoading, currentSurah, currentAyah } = playbackState;

  // لا نعرض الشريط إذا لم يكن هناك تشغيل
  if (currentSurah === 0 && !isPlaying && !isLoading) {
    return null;
  }

  const surahName = surahs.find(s => s.number === currentSurah)?.name || '';

  return (
    <GlassCard style={styles.container} borderRadius={BorderRadius.lg}>
      <View style={styles.content}>
        {/* معلومات التشغيل */}
        <View style={styles.info}>
          <Text style={[styles.surahName, { color: colors.text }]} numberOfLines={1}>
            {surahName}
          </Text>
          <Text style={[styles.ayahNumber, { color: colors.textSecondary }]}>
            الآية {currentAyah}
          </Text>
        </View>

        {/* أزرار التحكم */}
        <View style={styles.controls}>
          <Pressable onPress={playPrevious} style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={24} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={togglePlayPause}
            style={[styles.playButton, { backgroundColor: colors.primary }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color="#fff"
              />
            )}
          </Pressable>

          <Pressable onPress={playNext} style={styles.controlButton}>
            <Ionicons name="play-skip-back" size={24} color={colors.text} />
          </Pressable>

          <Pressable onPress={stopPlayback} style={styles.controlButton}>
            <Ionicons name="stop" size={24} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.md,
    right: Spacing.md,
    padding: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: Spacing.md,
  },
  surahName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    textAlign: 'right',
  },
  ayahNumber: {
    fontSize: Typography.sizes.sm,
    textAlign: 'right',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  controlButton: {
    padding: Spacing.xs,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
