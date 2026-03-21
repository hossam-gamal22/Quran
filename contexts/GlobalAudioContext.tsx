// contexts/GlobalAudioContext.tsx
// Unified audio context — single source of truth for all audio playback
// Coordinates Quran, Azkar, and standalone audio sources

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { audioPlayer, type PlaybackState } from '@/lib/audio-player';
import { radioPlayer } from '@/lib/radio-player';
import { audioCoordinator } from '@/lib/audio-coordinator';
import type { RadioStation, RadioPlaybackState } from '@/types/radio';

export type AudioSource = 'quran' | 'azkar' | 'radio' | 'none';

export interface AudioTrack {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

export interface GlobalAudioState {
  source: AudioSource;
  isPlaying: boolean;
  isLoading: boolean;
  // Track info
  trackTitle: string;
  trackSubtitle?: string;
  // Progress
  position: number;
  duration: number;
  // Azkar queue
  queueIndex: number;
  queueLength: number;
  // Source route for navigation back
  sourceRoute?: string;
  // Quran passthrough
  quranState: PlaybackState;
  // Radio state
  radioState: RadioPlaybackState;
}

interface GlobalAudioContextType {
  state: GlobalAudioState;
  // Azkar queue controls
  playAzkarQueue: (tracks: AudioTrack[], startIndex?: number, sourceRoute?: string) => Promise<void>;
  // Radio controls
  playRadio: (station: RadioStation) => Promise<void>;
  stopRadio: () => Promise<void>;
  // Unified controls
  togglePlayPause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  // Playback speed
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

const defaultRadioState: RadioPlaybackState = {
  status: 'idle',
  currentStation: null,
  volume: 1,
};

const defaultState: GlobalAudioState = {
  source: 'none',
  isPlaying: false,
  isLoading: false,
  trackTitle: '',
  trackSubtitle: undefined,
  position: 0,
  duration: 0,
  queueIndex: 0,
  queueLength: 0,
  quranState: {
    isPlaying: false,
    isLoading: false,
    currentSurah: 0,
    currentAyah: 0,
    reciterIdentifier: 'ar.alafasy',
    duration: 0,
    position: 0,
  },
  radioState: defaultRadioState,
};

const GlobalAudioContext = createContext<GlobalAudioContextType>({
  state: defaultState,
  playAzkarQueue: async () => {},
  playRadio: async () => {},
  stopRadio: async () => {},
  togglePlayPause: async () => {},
  stop: async () => {},
  seekTo: async () => {},
  next: async () => {},
  previous: async () => {},
  playbackSpeed: 1,
  setPlaybackSpeed: () => {},
});

export function GlobalAudioProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<AudioSource>('none');
  const [azkarPlaying, setAzkarPlaying] = useState(false);
  const [azkarLoading, setAzkarLoading] = useState(false);
  const [trackTitle, setTrackTitle] = useState('');
  const [trackSubtitle, setTrackSubtitle] = useState<string | undefined>();
  const [sourceRoute, setSourceRoute] = useState<string | undefined>();
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueLength, setQueueLength] = useState(0);
  const [quranState, setQuranState] = useState<PlaybackState>(defaultState.quranState);
  const [radioState, setRadioState] = useState<RadioPlaybackState>(defaultRadioState);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);

  const sourceRef = useRef<AudioSource>('none');
  const azkarQueue = useRef<AudioTrack[]>([]);
  const azkarSound = useRef<Audio.Sound | null>(null);

  // Keep sourceRef in sync
  useEffect(() => { sourceRef.current = source; }, [source]);

  // Cleanup azkar sound
  const cleanupAzkar = useCallback(async () => {
    if (azkarSound.current) {
      try {
        await azkarSound.current.stopAsync();
        await azkarSound.current.unloadAsync();
      } catch {}
      azkarSound.current = null;
    }
  }, []);

  // Play a specific item from the azkar queue by index
  const playAzkarAtIndex = useCallback(async (idx: number) => {
    const queue = azkarQueue.current;
    if (idx < 0 || idx >= queue.length) {
      // Queue finished
      await cleanupAzkar();
      setAzkarPlaying(false);
      setAzkarLoading(false);
      setSource('none');
      audioCoordinator.releaseFocus('azkar-queue', 'azkar');
      return;
    }

    const track = queue[idx];
    setQueueIndex(idx);
    setTrackTitle(track.title);
    setTrackSubtitle(track.subtitle);
    setAzkarLoading(true);

    await cleanupAzkar();

    // Request audio focus — this will stop any other audio source
    await audioCoordinator.requestFocus('azkar', {
      stop: async () => {
        await cleanupAzkar();
        setAzkarPlaying(false);
        setAzkarLoading(false);
        setSource('none');
      },
    }, 'azkar-queue');

    try {
      // Set audio mode for background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true, rate: playbackSpeed },
        (status: any) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            setDuration(status.durationMillis || 0);
            setAzkarPlaying(status.isPlaying);
            setAzkarLoading(false);

            if (status.didJustFinish) {
              // Auto-advance to next track
              playAzkarAtIndex(idx + 1);
            }
          }
        }
      );
      azkarSound.current = sound;
    } catch (error) {
      console.error('[GlobalAudio] Error playing azkar track:', error);
      setAzkarLoading(false);
      // Try next track
      playAzkarAtIndex(idx + 1);
    }
  }, [cleanupAzkar, playbackSpeed]);

  // Subscribe to Quran audio changes
  useEffect(() => {
    const unsub = audioPlayer.subscribe((ps: PlaybackState) => {
      setQuranState(ps);
      if (ps.isPlaying || ps.isLoading) {
        // Quran started playing — if azkar or radio was playing, stop them
        if (sourceRef.current === 'azkar') {
          cleanupAzkar();
        }
        if (sourceRef.current === 'radio') {
          radioPlayer.stop();
        }
        setSource('quran');
      } else if (sourceRef.current === 'quran' && !ps.isPlaying && !ps.isLoading && ps.currentSurah === 0) {
        setSource('none');
      }
    });
    return unsub;
  }, [cleanupAzkar]);

  // Subscribe to Radio player state changes
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const unsub = radioPlayer.subscribe((rs: RadioPlaybackState) => {
      setRadioState(rs);
      if (rs.status === 'playing' || rs.status === 'buffering' || rs.status === 'loading') {
        if (sourceRef.current !== 'radio') {
          setSource('radio');
        }
      } else if (sourceRef.current === 'radio' && rs.status === 'idle') {
        setSource('none');
      }
    });
    return unsub;
  }, []);

  const playAzkarQueue = useCallback(async (tracks: AudioTrack[], startIndex = 0, route?: string) => {
    if (tracks.length === 0) return;
    azkarQueue.current = tracks;
    if (route) setSourceRoute(route);

    // Stop Quran if playing
    if (quranState.isPlaying) {
      audioPlayer.stop();
    }
    // Stop Radio if playing
    if (sourceRef.current === 'radio') {
      await radioPlayer.stop();
    }

    setSource('azkar');
    setQueueLength(tracks.length);
    await playAzkarAtIndex(startIndex);
  }, [playAzkarAtIndex, quranState.isPlaying]);

  const playRadio = useCallback(async (station: RadioStation) => {
    try {
      // Stop Quran if playing
      if (quranState.isPlaying) {
        audioPlayer.stop();
      }
      // Stop Azkar if playing
      if (sourceRef.current === 'azkar') {
        try { await cleanupAzkar(); } catch {}
        setAzkarPlaying(false);
        setAzkarLoading(false);
        azkarQueue.current = [];
        setQueueLength(0);
      }
      setSource('radio');
      setSourceRoute(undefined);
      await radioPlayer.play(station);
    } catch (error) {
      console.error('[GlobalAudio] playRadio error:', error);
      throw error;
    }
  }, [quranState.isPlaying, cleanupAzkar]);

  const stopRadio = useCallback(async () => {
    await radioPlayer.stop();
    if (sourceRef.current === 'radio') {
      setSource('none');
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (source === 'quran') {
      audioPlayer.togglePlayPause();
    } else if (source === 'azkar' && azkarSound.current) {
      const status = await azkarSound.current.getStatusAsync();
      if ((status as any).isPlaying) {
        await azkarSound.current.pauseAsync();
      } else {
        await azkarSound.current.playAsync();
      }
    } else if (source === 'radio') {
      await radioPlayer.togglePlayPause();
    }
  }, [source]);

  const stop = useCallback(async () => {
    if (source === 'quran') {
      audioPlayer.stop();
    } else if (source === 'azkar') {
      await cleanupAzkar();
    } else if (source === 'radio') {
      await radioPlayer.stop();
    }
    setSource('none');
    setSourceRoute(undefined);
    setAzkarPlaying(false);
    setAzkarLoading(false);
    azkarQueue.current = [];
    setQueueLength(0);
  }, [source, cleanupAzkar]);

  const seekTo = useCallback(async (positionMs: number) => {
    if (source === 'quran') {
      audioPlayer.seekTo(positionMs);
    } else if (source === 'azkar' && azkarSound.current) {
      await azkarSound.current.setPositionAsync(positionMs);
    }
  }, [source]);

  const next = useCallback(async () => {
    if (source === 'quran') {
      audioPlayer.playNextAyah();
    } else if (source === 'azkar') {
      const nextIdx = queueIndex + 1;
      if (nextIdx < azkarQueue.current.length) {
        await playAzkarAtIndex(nextIdx);
      }
    }
  }, [source, queueIndex, playAzkarAtIndex]);

  const previous = useCallback(async () => {
    if (source === 'quran') {
      audioPlayer.playPreviousAyah();
    } else if (source === 'azkar') {
      const prevIdx = queueIndex - 1;
      if (prevIdx >= 0) {
        await playAzkarAtIndex(prevIdx);
      }
    }
  }, [source, queueIndex, playAzkarAtIndex]);

  const setPlaybackSpeed = useCallback(async (speed: number) => {
    setPlaybackSpeedState(speed);
    if (source === 'azkar' && azkarSound.current) {
      await azkarSound.current.setRateAsync(speed, true);
    }
  }, [source]);

  const state: GlobalAudioState = {
    source,
    isPlaying: source === 'quran' ? quranState.isPlaying : source === 'azkar' ? azkarPlaying : source === 'radio' ? radioState.status === 'playing' : false,
    isLoading: source === 'quran' ? quranState.isLoading : source === 'azkar' ? azkarLoading : source === 'radio' ? (radioState.status === 'loading' || radioState.status === 'buffering') : false,
    trackTitle: source === 'quran' ? '' : source === 'radio' ? (radioState.currentStation?.name || '') : trackTitle,
    trackSubtitle: source === 'quran' ? undefined : source === 'radio' ? (radioState.currentStation?.nameTranslations?.en) : trackSubtitle,
    position: source === 'quran' ? quranState.position : position,
    duration: source === 'quran' ? quranState.duration : duration,
    queueIndex: source === 'azkar' ? queueIndex : 0,
    queueLength: source === 'azkar' ? queueLength : 0,
    sourceRoute: source === 'azkar' ? sourceRoute : undefined,
    quranState,
    radioState,
  };

  return (
    <GlobalAudioContext.Provider value={{
      state,
      playAzkarQueue,
      playRadio,
      stopRadio,
      togglePlayPause,
      stop,
      seekTo,
      next,
      previous,
      playbackSpeed,
      setPlaybackSpeed,
    }}>
      {children}
    </GlobalAudioContext.Provider>
  );
}

export function useGlobalAudio() {
  return useContext(GlobalAudioContext);
}
