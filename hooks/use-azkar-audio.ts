// hooks/use-azkar-audio.ts
// Hook لتشغيل الأذكار مع الأصوات

import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

export interface AzkarAudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentPosition: number;
  duration: number;
  error: string | null;
}

interface AzkarAudioOptions {
  audioUrl?: string;
  autoPlay?: boolean;
  onPlaybackStatusUpdate?: (status: any) => void;
}

export function useAzkarAudio(options: AzkarAudioOptions = {}) {
  const { audioUrl, autoPlay = false, onPlaybackStatusUpdate } = options;
  
  const [state, setState] = useState<AzkarAudioState>({
    isPlaying: false,
    isLoading: false,
    currentPosition: 0,
    duration: 0,
    error: null,
  });

  const soundRef = useRef<Audio.Sound | null>(null);

  // تحميل الملف الصوتي
  const loadAudio = useCallback(async () => {
    if (!audioUrl) {
      setState(prev => ({ ...prev, error: 'لا يوجد ملف صوتي' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // تهيئة جلسة الصوت (ضروري على iOS)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
      soundRef.current = sound;

      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setState(prev => ({
          ...prev,
          duration: status.durationMillis || 0,
          isLoading: false,
        }));

        sound.setOnPlaybackStatusUpdate((newStatus) => {
          if (newStatus.isLoaded) {
            setState(prev => ({
              ...prev,
              currentPosition: newStatus.positionMillis || 0,
              isPlaying: newStatus.isPlaying,
            }));

            onPlaybackStatusUpdate?.(newStatus);

            if (newStatus.didJustFinish) {
              setState(prev => ({ ...prev, isPlaying: false }));
            }
          }
        });

        if (autoPlay) {
          await sound.playAsync();
          setState(prev => ({ ...prev, isPlaying: true }));
        }
      }
    } catch (error) {
      const errorMessage = String(error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      console.error('Error loading audio:', error);
    }
  }, [audioUrl, autoPlay, onPlaybackStatusUpdate]);

  // تشغيل/إيقاف
  const togglePlayPause = useCallback(async () => {
    try {
      if (!soundRef.current) {
        await loadAudio();
        return;
      }

      if (state.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  }, [state.isPlaying, loadAudio]);

  // إيقاف النغمة
  const stop = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        setState(prev => ({
          ...prev,
          isPlaying: false,
          currentPosition: 0,
        }));
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  }, []);

  // إعادة تعيين
  const reset = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setState({
        isPlaying: false,
        isLoading: false,
        currentPosition: 0,
        duration: 0,
        error: null,
      });
    } catch (error) {
      console.error('Error resetting audio:', error);
    }
  }, []);

  // تحميل الصوت عند تغيير URL
  useEffect(() => {
    if (audioUrl) {
      loadAudio();
    }

    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
    // Only re-run when the URL changes — loadAudio recreates on every render
    // if onPlaybackStatusUpdate isn't memoised, so we intentionally omit it here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // تنظيف عند إزالة المكون
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    // الحالة
    ...state,
    formattedPosition: formatTime(state.currentPosition),
    formattedDuration: formatTime(state.duration),

    // الدوال
    togglePlayPause,
    stop,
    reset,
    loadAudio,

    // الخاصيات
    isAudioAvailable: !!audioUrl,
  };
}
