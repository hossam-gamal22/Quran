// components/ui/AudioPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Spacing, BorderRadius } from '../../constants/theme';
import { t } from '@/lib/i18n';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { useColors } from '@/hooks/use-colors';

interface AudioPlayerProps {
  audioUrl?: string;
  title: string;
  reciterName?: string;
  onError?: (error: string) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title,
  reciterName = t('quran.reciterLabel'),
  onError,
}) => {
  const isRTL = useIsRTL();
  const globalAudio = useGlobalAudio();
  const colors = useColors();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadAudio = async () => {
    if (!audioUrl) {
      onError?.(t('common.noAudioFile'));
      return;
    }

    try {
      setIsLoading(true);
      // Stop any other global audio source first
      if (globalAudio.state.isPlaying) {
        await globalAudio.stop();
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setIsPlaying(true);

      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis || 0);
        sound.setOnPlaybackStatusUpdate((newStatus) => {
          if (newStatus.isLoaded) {
            setPosition(newStatus.positionMillis || 0);
            Animated.timing(progressAnim, {
              toValue: (newStatus.positionMillis || 0) / (newStatus.durationMillis || 1),
              duration: 100,
              useNativeDriver: false,
            }).start();

            if (newStatus.didJustFinish) {
              setIsPlaying(false);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error loading audio:', error);
      onError?.(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    try {
      if (!soundRef.current) {
        await loadAudio();
      } else if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      onError?.(String(error));
    }
  };

  const stop = async () => {
    try {
      if (soundRef.current && isPlaying) {
        await soundRef.current.stopAsync();
        setIsPlaying(false);
        setPosition(0);
        progressAnim.setValue(0);
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <MaterialCommunityIcons name="music" size={20} color={colors.primary} />
        <View style={[styles.headerText]}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.reciter, { color: colors.textLight }]}>{reciterName}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={[styles.controls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.time, { color: colors.textLight }]}>{formatTime(position)}</Text>

        <TouchableOpacity
          onPress={togglePlayPause}
          disabled={isLoading}
          style={[styles.playButton, isLoading && styles.disabled]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialCommunityIcons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={40}
              color={colors.primary}
            />
          )}
        </TouchableOpacity>

        <Text style={[styles.time, { color: colors.textLight }]}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(6, 79, 47, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  reciter: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(6, 79, 47, 0.2)',
    borderRadius: 2,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButton: {
    padding: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  time: {
    fontSize: 12,
    minWidth: 45,
    textAlign: 'center',
  },
});

export default AudioPlayer;
