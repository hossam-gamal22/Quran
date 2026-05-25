// hooks/use-azkar-audio.ts
// Hook لتشغيل الأذكار مع الأصوات

import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { t } from '@/lib/i18n';
import { audioCoordinator } from '@/lib/audio-coordinator';

const AUDIO_LOAD_TIMEOUT_MS = 45000;

function friendlyAudioError(): string {
  return t('messages.networkError') || t('common.noAudioFile') || 'تعذر تشغيل الصوت. تحقق من الاتصال ثم حاول مرة أخرى.';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('audio-load-timeout')), timeoutMs);
    }),
  ]);
}

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
  const [playbackRate, setPlaybackRateState] = useState(1);

  const soundRef = useRef<Audio.Sound | null>(null);

  // تحميل الملف الصوتي
  const loadAudio = useCallback(async (playAfterLoad = false) => {
    if (!audioUrl) {
      setState(prev => ({ ...prev, error: t('common.noAudioFile') }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Request audio focus — this will stop any other audio source
      const audioId = `azkar-item-${Date.now()}`;
      await audioCoordinator.requestFocus('azkar-item', {
        stop: async () => {
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
          setState(prev => ({ ...prev, isPlaying: false, currentPosition: 0 }));
        },
      }, audioId);

      // تهيئة جلسة الصوت (ضروري على iOS)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
      });

      const { sound } = await withTimeout(
        Audio.Sound.createAsync(
          { uri: audioUrl },
          { rate: playbackRate, shouldCorrectPitch: true, shouldPlay: false },
          undefined,
          false,
        ),
        AUDIO_LOAD_TIMEOUT_MS,
      );
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

        if (autoPlay || playAfterLoad) {
          await sound.playAsync();
          setState(prev => ({ ...prev, isPlaying: true }));
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: friendlyAudioError(),
        isLoading: false,
      }));
      console.log('Audio loading failed', error);
    }
  }, [audioUrl, autoPlay, onPlaybackStatusUpdate, playbackRate]);

  // تشغيل/إيقاف
  const togglePlayPause = useCallback(async () => {
    try {
      if (!soundRef.current) {
        await loadAudio(true);
        return;
      }

      if (state.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: friendlyAudioError(), isLoading: false }));
      console.log('Audio playback failed', error);
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

  const setPlaybackRate = useCallback(async (rate: number) => {
    setPlaybackRateState(rate);
    try {
      if (!soundRef.current) return;
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) await soundRef.current.setRateAsync(rate, true);
    } catch (error) {
      console.log('Audio speed change failed', error);
    }
  }, []);

  // تحميل الصوت تلقائيًا فقط عند طلب autoplay. غير كده أول ضغطة تشغيل تجهز الصوت وتشغله مباشرة.
  useEffect(() => {
    if (audioUrl && autoPlay) {
      loadAudio(true);
    }

    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
    // Only re-run when the URL changes — loadAudio recreates on every render
    // if onPlaybackStatusUpdate isn't memoised, so we intentionally omit it here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, autoPlay]);

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
    playbackRate,

    // الدوال
    togglePlayPause,
    stop,
    reset,
    loadAudio,
    setPlaybackRate,

    // الخاصيات
    isAudioAvailable: !!audioUrl,
  };
}
