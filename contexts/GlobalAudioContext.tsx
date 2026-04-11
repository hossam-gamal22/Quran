// contexts/GlobalAudioContext.tsx
// Unified audio context — single source of truth for all audio playback
// Coordinates Quran, Azkar, and standalone audio sources
// Uses TrackPlayer for native platforms (lock screen controls)
// Uses expo-av as fallback for web platform

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { audioPlayer, type PlaybackState } from '@/lib/audio-player';
import { radioPlayer } from '@/lib/radio-player';
import { audioCoordinator } from '@/lib/audio-coordinator';
import { markTrackPlayerSetupDone, isTrackPlayerSetupDone, onTrackPlayerSetupDone } from '@/lib/track-player-ready';
import { getCategoryTrimMs } from '@/lib/azkar-audio-config';
import { Asset } from 'expo-asset';
import type { RadioStation, RadioPlaybackState } from '@/types/radio';

// Dynamic import of TrackPlayer - may not be available in Expo Go
let TrackPlayer: typeof import('react-native-track-player').default | null = null;
let Event: typeof import('react-native-track-player').Event | null = null;
let State: typeof import('react-native-track-player').State | null = null;
let trackPlayerAvailable = false;

try {
  if (Platform.OS !== 'web') {
    const TP = require('react-native-track-player');
    TrackPlayer = TP.default;
    Event = TP.Event;
    State = TP.State;
    trackPlayerAvailable = !!TrackPlayer?.getPlaybackState;
  }
} catch {
  trackPlayerAvailable = false;
}

/**
 * Called from _layout.tsx after TrackPlayer.setupPlayer() succeeds.
 * Marks both the shared readiness module and triggers the local ready callback.
 */
export function markTrackPlayerReady() {
  markTrackPlayerSetupDone();
}

// Helper: only use TrackPlayer if both module exists AND setup completed
function isTrackPlayerReady(): boolean {
  return trackPlayerAvailable && isTrackPlayerSetupDone();
}

export type AudioSource = 'quran' | 'azkar' | 'radio' | 'none';

export interface AudioTrack {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  /** Audio source — require() number for bundled assets, or string URI (file:// / https://) for remote/cached. */
  localSource?: number | string;
  /** Category ID for intro trimming (azkar only). */
  categoryId?: string;
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
  /** Register a callback to be called when a track is skipped due to missing local audio. */
  setOnTrackSkipped: (cb: (() => void) | null) => void;
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
  setOnTrackSkipped: () => {},
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
  const azkarPlayingRef = useRef(false);
  const azkarQueue = useRef<AudioTrack[]>([]);
  const azkarSound = useRef<Audio.Sound | null>(null);
  const trackPlayerListeners = useRef<(() => void)[]>([]);
  const progressPoller = useRef<number | null>(null);
  const isTogglingRef = useRef(false);
  // Consecutive audio error counter — stops retrying after 3 failures
  const audioErrorCountRef = useRef<number>(0);
  // Guard against double-fire of didJustFinish for the same track index
  const lastAdvancedIdx = useRef(-1);
  // Whether expo-av audio mode has been configured for this queue session
  const audioModeSetRef = useRef(false);
  // Callback for when a track is skipped due to missing local audio
  const onTrackSkippedRef = useRef<(() => void) | null>(null);
  const setOnTrackSkipped = useCallback((cb: (() => void) | null) => {
    onTrackSkippedRef.current = cb;
  }, []);

  // Keep refs in sync
  useEffect(() => { sourceRef.current = source; }, [source]);
  useEffect(() => { azkarPlayingRef.current = azkarPlaying; }, [azkarPlaying]);

  // Track when TrackPlayer setup completes (may happen after mount)
  const [tpReady, setTpReady] = useState(isTrackPlayerReady);
  useEffect(() => {
    if (tpReady) return; // Already ready
    onTrackPlayerSetupDone(() => setTpReady(true));
  }, [tpReady]);

  // Setup TrackPlayer event listeners for azkar (re-runs when tpReady flips to true)
  useEffect(() => {
    if (!tpReady || !TrackPlayer || !Event || !State) return;

    // Listen for track changes
    const trackChangedListener = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async (event) => {
        if (sourceRef.current !== 'azkar') return;
        if (event.track) {
          const index = event.index ?? 0;
          setQueueIndex(index);
          setTrackTitle(event.track.title || '');
          setTrackSubtitle(event.track.artist);
        }
      }
    );
    trackPlayerListeners.current.push(() => trackChangedListener.remove());

    // Listen for queue end
    const queueEndListener = TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      async () => {
        if (sourceRef.current !== 'azkar') return;
        // Queue finished
        setAzkarPlaying(false);
        azkarPlayingRef.current = false;
        setAzkarLoading(false);
        setSource('none');
        sourceRef.current = 'none';
        audioCoordinator.releaseFocus('azkar-queue', 'azkar');
      }
    );
    trackPlayerListeners.current.push(() => queueEndListener.remove());

    // Listen for playback state
    const stateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (event) => {
        if (sourceRef.current !== 'azkar') return;
        const isPlaying = event.state === State.Playing;
        const isLoading = event.state === State.Loading || event.state === State.Buffering;
        setAzkarPlaying(isPlaying);
        azkarPlayingRef.current = isPlaying;
        setAzkarLoading(isLoading);
      }
    );
    trackPlayerListeners.current.push(() => stateListener.remove());

    // Start progress poller for azkar
    progressPoller.current = setInterval(async () => {
      if (sourceRef.current !== 'azkar' || !TrackPlayer) return;
      try {
        const progress = await TrackPlayer.getProgress();
        const pos = progress.position;
        const dur = progress.duration;
        setPosition(pos * 1000); // Convert to ms
        setDuration(dur * 1000);
      } catch {}
    }, 500) as unknown as number;

    return () => {
      trackPlayerListeners.current.forEach(remove => remove());
      trackPlayerListeners.current = [];
      if (progressPoller.current) {
        clearInterval(progressPoller.current);
        progressPoller.current = null;
      }
    };
  }, [tpReady]);

  // Cleanup azkar sound (both TrackPlayer and expo-av)
  const cleanupAzkar = useCallback(async () => {
    if (isTrackPlayerReady() && TrackPlayer) {
      try {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      } catch {}
    }

    if (azkarSound.current) {
      try {
        // Detach the status callback first to prevent didJustFinish from firing during cleanup
        azkarSound.current.setOnPlaybackStatusUpdate(null);
        await azkarSound.current.stopAsync();
        await azkarSound.current.unloadAsync();
      } catch {}
      azkarSound.current = null;
      // Brief yield to let iOS fully release the AVPlayerItem decoder resources
      await new Promise(r => setTimeout(r, 50));
    }
  }, []);

  // Play a specific item from the azkar queue by index
  const playAzkarAtIndex = useCallback(async (idx: number) => {
    const queue = azkarQueue.current;
    if (idx < 0 || idx >= queue.length) {
      // Queue finished
      await cleanupAzkar();
      audioModeSetRef.current = false;
      setAzkarPlaying(false);
      azkarPlayingRef.current = false;
      setAzkarLoading(false);
      setSource('none');
      sourceRef.current = 'none';
      audioCoordinator.releaseFocus('azkar-queue', 'azkar');
      return;
    }

    // Guard against double-fire of didJustFinish for the same track
    if (lastAdvancedIdx.current === idx) return;
    lastAdvancedIdx.current = idx;

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
        azkarPlayingRef.current = false;
        setAzkarLoading(false);
        setSource('none');
        sourceRef.current = 'none';
      },
    }, 'azkar-queue');

    try {
      if (isTrackPlayerReady() && TrackPlayer) {
        // Use TrackPlayer for native platforms (with lock screen controls)
        // Resolve each localSource to a playable URL:
        //   - string → already a file:// or https:// URI, use directly
        //   - number → bundled require() asset, resolve via expo-asset
        const tpTracks = await Promise.all(
          queue.map(async (t, i) => {
            let resolvedUrl = t.url; // fallback (bare filename — should not be used)
            if (typeof t.localSource === 'string') {
              resolvedUrl = t.localSource;
            } else if (typeof t.localSource === 'number') {
              try {
                const asset = Asset.fromModule(t.localSource);
                if (!asset.localUri) await asset.downloadAsync();
                resolvedUrl = asset.localUri ?? asset.uri;
              } catch (assetErr) {
                console.warn('[GlobalAudio] Failed to resolve asset for track:', t.url, assetErr);
              }
            }
            return {
              id: `azkar-${t.id}-${i}`,
              url: resolvedUrl,
              title: t.title,
              artist: t.subtitle || 'أذكار',
              album: 'الأذكار',
              artwork: require('../assets/images/icons/icon.png'),
            };
          })
        );

        await TrackPlayer.reset();
        await TrackPlayer.add(tpTracks);

        if (idx > 0) {
          await TrackPlayer.skip(idx);
        }

        await TrackPlayer.setRate(playbackSpeed);
        await TrackPlayer.play();
        audioErrorCountRef.current = 0; // Reset consecutive error count on successful playback

        // Apply intro trim for current track if configured
        const trimMs = track.categoryId ? getCategoryTrimMs(track.categoryId) : 0;
        if (trimMs > 0) {
          // Small delay to let TrackPlayer initialize, then seek
          setTimeout(async () => {
            try {
              await TrackPlayer?.seekTo(trimMs / 1000); // TrackPlayer uses seconds
            } catch (e) {
              console.error('[GlobalAudio] Failed to apply TrackPlayer intro trim:', e);
            }
          }, 100);
        }

        console.log('[GlobalAudio] Playing azkar queue via TrackPlayer (offline-first), tracks:', tpTracks.length);
      } else {
        // Use expo-av for web platform / Expo Go fallback
        if (!track.localSource) {
          console.warn('[GlobalAudio] No audio source for track, skipping:', track.url);
          setAzkarLoading(false);
          audioErrorCountRef.current += 1;
          if (audioErrorCountRef.current >= 3) {
            audioErrorCountRef.current = 0;
            onTrackSkippedRef.current?.();
            setAzkarPlaying(false);
            azkarPlayingRef.current = false;
            setSource('none');
            sourceRef.current = 'none';
            return;
          }
          onTrackSkippedRef.current?.();
          lastAdvancedIdx.current = -1; // Reset guard for skip-advance
          playAzkarAtIndex(idx + 1);
          return;
        }

        // Set audio mode once per queue session (avoid reconfiguring AVAudioSession per track)
        if (!audioModeSetRef.current) {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            staysActiveInBackground: true,
          });
          audioModeSetRef.current = true;
        }

        // Check for intro trim for this category
        const trimMs = track.categoryId ? getCategoryTrimMs(track.categoryId) : 0;

        // Create sound with retry — iOS needs time to release the previous decoder
        let sound: Audio.Sound | null = null;
        let createAttempts = 0;
        const MAX_CREATE_ATTEMPTS = 3;

        while (!sound && createAttempts < MAX_CREATE_ATTEMPTS) {
          createAttempts++;
          try {
            // Small delay before retry to let iOS release the previous AVPlayerItem decoder
            if (createAttempts > 1) {
              await new Promise(r => setTimeout(r, 150 * createAttempts));
            }
            // Resolve source: string URI → { uri }, number → pass directly (require ID)
            const avSource = typeof track.localSource === 'string'
              ? { uri: track.localSource }
              : track.localSource as number;
            const created = await Audio.Sound.createAsync(
              avSource,
              { shouldPlay: false, rate: playbackSpeed },
              (status: any) => {
                if (status.isLoaded) {
                  setPosition(status.positionMillis || 0);
                  setDuration(status.durationMillis || 0);
                  setAzkarPlaying(status.isPlaying);
                  azkarPlayingRef.current = status.isPlaying;
                  setAzkarLoading(false);

                  if (status.didJustFinish) {
                    // Auto-advance to next track
                    playAzkarAtIndex(idx + 1);
                  }
                } else if (status.error) {
                  // Sound failed to load/play — skip to next track
                  console.error('[GlobalAudio] expo-av playback error:', status.error);
                  setAzkarLoading(false);
                  audioErrorCountRef.current += 1;
                  if (audioErrorCountRef.current >= 3) {
                    audioErrorCountRef.current = 0;
                    setAzkarPlaying(false);
                    azkarPlayingRef.current = false;
                    setSource('none');
                    sourceRef.current = 'none';
                    return;
                  }
                  playAzkarAtIndex(idx + 1);
                }
              }
            );
            sound = created.sound;
          } catch (createErr) {
            console.warn(`[GlobalAudio] createAsync attempt ${createAttempts}/${MAX_CREATE_ATTEMPTS} failed:`, createErr);
            if (createAttempts >= MAX_CREATE_ATTEMPTS) {
              throw createErr; // Let outer catch handle it
            }
          }
        }

        azkarSound.current = sound!;

        // Apply intro trim AFTER sound is created
        if (trimMs > 0) {
          try {
            const status = await sound!.getStatusAsync();
            if (status.isLoaded && status.durationMillis && status.durationMillis > trimMs) {
              await sound!.setPositionAsync(trimMs);
            }
          } catch (e) {
            console.error('[GlobalAudio] Failed to apply intro trim:', e);
          }
        }

        // Start playback
        await sound!.playAsync();
        audioErrorCountRef.current = 0; // Reset consecutive error count on successful playback
      }
    } catch (error) {
      console.warn('[GlobalAudio] Error playing azkar track:', error);
      setAzkarLoading(false);

      audioErrorCountRef.current += 1;
      if (audioErrorCountRef.current >= 3) {
        // Stop retrying — 3 consecutive failures means something is structurally wrong
        audioErrorCountRef.current = 0;
        setAzkarPlaying(false);
        azkarPlayingRef.current = false;
        setSource('none');
        sourceRef.current = 'none';
        audioCoordinator.releaseFocus('azkar-queue', 'azkar');
        return;
      }

      // Advance to next track only if within retry limit
      const nextIdx = idx + 1;
      if (nextIdx < azkarQueue.current.length) {
        lastAdvancedIdx.current = -1; // Reset guard for error-advance
        playAzkarAtIndex(nextIdx);
      } else {
        // End of playlist — stop cleanly
        audioErrorCountRef.current = 0;
        setAzkarPlaying(false);
        azkarPlayingRef.current = false;
        setSource('none');
        sourceRef.current = 'none';
        audioCoordinator.releaseFocus('azkar-queue', 'azkar');
      }
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
    lastAdvancedIdx.current = -1; // Reset double-fire guard for new queue
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
    sourceRef.current = 'azkar'; // Sync ref eagerly so TrackPlayer event listeners see it immediately
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
    // Guard against rapid repeated calls
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    try {
      const currentSource = sourceRef.current;
      const isCurrentlyPlaying = azkarPlayingRef.current;
      if (currentSource === 'quran') {
        audioPlayer.togglePlayPause();
      } else if (currentSource === 'azkar') {
        if (isTrackPlayerReady() && TrackPlayer) {
          if (isCurrentlyPlaying) {
            // Immediately update state so UI responds
            setAzkarPlaying(false);
            azkarPlayingRef.current = false;
            try { await TrackPlayer.pause(); } catch {}
          } else {
            setAzkarPlaying(true);
            azkarPlayingRef.current = true;
            try { await TrackPlayer.play(); } catch {}
          }
        } else if (azkarSound.current) {
          try {
            const status = await azkarSound.current.getStatusAsync();
            if (!status.isLoaded) return;
            if (status.isPlaying) {
              setAzkarPlaying(false);
              azkarPlayingRef.current = false;
              await azkarSound.current.pauseAsync();
            } else {
              setAzkarPlaying(true);
              azkarPlayingRef.current = true;
              await azkarSound.current.playAsync();
            }
          } catch {}
        }
      } else if (currentSource === 'radio') {
        await radioPlayer.togglePlayPause();
      }
    } finally {
      isTogglingRef.current = false;
    }
  }, []);

  const stop = useCallback(async () => {
    const currentSource = sourceRef.current;
    if (currentSource === 'quran') {
      audioPlayer.stop();
    } else if (currentSource === 'azkar') {
      await cleanupAzkar();
    } else if (currentSource === 'radio') {
      await radioPlayer.stop();
    }
    audioModeSetRef.current = false;
    setSource('none');
    sourceRef.current = 'none';
    setSourceRoute(undefined);
    setAzkarPlaying(false);
    azkarPlayingRef.current = false;
    setAzkarLoading(false);
    azkarQueue.current = [];
    setQueueLength(0);
  }, [cleanupAzkar]);

  const seekTo = useCallback(async (positionMs: number) => {
    const currentSource = sourceRef.current;
    if (currentSource === 'quran') {
      audioPlayer.seekTo(positionMs);
    } else if (currentSource === 'azkar') {
      if (isTrackPlayerReady() && TrackPlayer) {
        await TrackPlayer.seekTo(positionMs / 1000); // TrackPlayer uses seconds
      } else if (azkarSound.current) {
        try {
          const status = await azkarSound.current.getStatusAsync();
          if (status.isLoaded) await azkarSound.current.setPositionAsync(positionMs);
        } catch {}
      }
    }
  }, []);

  const next = useCallback(async () => {
    const currentSource = sourceRef.current;
    if (currentSource === 'quran') {
      audioPlayer.playNextAyah();
    } else if (currentSource === 'azkar') {
      if (isTrackPlayerReady() && TrackPlayer) {
        // TrackPlayer handles queue automatically
        await TrackPlayer.skipToNext();
      } else {
        const nextIdx = queueIndex + 1;
        if (nextIdx < azkarQueue.current.length) {
          await playAzkarAtIndex(nextIdx);
        }
      }
    }
  }, [queueIndex, playAzkarAtIndex]);

  const previous = useCallback(async () => {
    const currentSource = sourceRef.current;
    if (currentSource === 'quran') {
      audioPlayer.playPreviousAyah();
    } else if (currentSource === 'azkar') {
      if (isTrackPlayerReady() && TrackPlayer) {
        await TrackPlayer.skipToPrevious();
      } else {
        const prevIdx = queueIndex - 1;
        if (prevIdx >= 0) {
          await playAzkarAtIndex(prevIdx);
        }
      }
    }
  }, [queueIndex, playAzkarAtIndex]);

  const setPlaybackSpeed = useCallback(async (speed: number) => {
    setPlaybackSpeedState(speed);
    if (sourceRef.current === 'azkar') {
      if (isTrackPlayerReady() && TrackPlayer) {
        await TrackPlayer.setRate(speed);
      } else if (azkarSound.current) {
        try {
          const status = await azkarSound.current.getStatusAsync();
          if (status.isLoaded) await azkarSound.current.setRateAsync(speed, true);
        } catch {}
      }
    }
  }, []);

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
      setOnTrackSkipped,
    }}>
      {children}
    </GlobalAudioContext.Provider>
  );
}

export function useGlobalAudio() {
  return useContext(GlobalAudioContext);
}
