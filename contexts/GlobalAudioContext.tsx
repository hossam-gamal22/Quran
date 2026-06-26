// contexts/GlobalAudioContext.tsx
// Unified audio context — single source of truth for all audio playback
// Coordinates Quran, Azkar, and standalone audio sources
// Uses TrackPlayer for native platforms (lock screen controls)
// Uses expo-av as fallback for web platform

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { AppState, Platform } from 'react-native';
import { audioPlayer, type PlaybackState } from '@/lib/audio-player';
import { savePlaybackProgress, clearPlaybackProgress } from '@/lib/audio-resume-store';
import { radioPlayer } from '@/lib/radio-player';
import { audioCoordinator } from '@/lib/audio-coordinator';
import { markTrackPlayerSetupDone, isTrackPlayerSetupDone, onTrackPlayerSetupDone } from '@/lib/track-player-ready';
import { addBreadcrumb } from '@/lib/diagnostics-breadcrumbs';
import { getCategoryTrimMs } from '@/lib/azkar-audio-config';
import { getAzkarAudioUri } from '@/lib/azkar-audio-cache';
import { Asset } from 'expo-asset';
import type { RadioStation, RadioPlaybackState } from '@/types/radio';

// True if the value already looks like a non-cacheable playable URI.
function isAbsoluteUri(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^(https?:|file:|asset:|content:|data:)/i.test(value);
}

function cleanAudioDisplayText(value: string | undefined | null): string {
  const raw = value || '';
  try {
    return decodeURIComponent(raw).replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return raw.replace(/\+/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

// Resolve a track's `url` field to a real playable URI.
// If `localSource` is provided, prefer the bundled asset's localUri.
// Otherwise, if `url` is a bare azkar filename (e.g. "75.m4a"), resolve it via
// the azkar audio cache (returns cached file:// path or GitHub CDN URL).
async function resolveAzkarTrackUri(t: { url: string; localSource?: any }): Promise<string> {
  if (t.localSource) {
    try {
      const asset = Asset.fromModule(t.localSource);
      if (!asset.localUri) await asset.downloadAsync();
      const resolved = asset.localUri || asset.uri;
      if (resolved) {
        console.log('[GlobalAudio] Azkar track URI (bundled):', resolved.substring(0, 120));
        return resolved;
      }
    } catch {}
  }
  if (t.url) {
    if (isAbsoluteUri(t.url)) {
      console.log('[GlobalAudio] Azkar track URI (absolute):', t.url.substring(0, 120));
      return t.url;
    }
    try {
      const uri = await getAzkarAudioUri(t.url);
      if (uri) {
        console.log('[GlobalAudio] Azkar track URI (resolved from "' + t.url + '"):', uri.substring(0, 120));
        return uri;
      }
    } catch (e) {
      console.warn('[GlobalAudio] Failed to resolve azkar URI for', t.url, e);
    }
  }
  console.warn('[GlobalAudio] Azkar track URI (fallback raw):', t.url);
  return t.url;
}

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
  /** Optional bundled audio source from require(). Takes priority over url. */
  localSource?: number;
  /** Category ID for intro trimming (azkar only). */
  categoryId?: string;
  /** Original dhikr id for repeat-aware azkar playback. */
  zikrId?: number;
  /** Index in the visible azkar audio list, before repeat expansion. */
  baseIndex?: number;
  /** 1-based repeat number for this playable track. */
  repeatIndex?: number;
  /** Total repeats for the owning dhikr. */
  repeatTotal?: number;
  /** 1-based part number for multi-part tracks, such as Quran ayah ranges. */
  repeatPartIndex?: number;
  /** Total parts inside one repeat. */
  repeatPartTotal?: number;
  /** Whether finishing this track should increment the dhikr counter. */
  countsForRepeat?: boolean;
  /** Use expo-av even when TrackPlayer is ready. Useful for remote archive streams. */
  forceExpoAv?: boolean;
  /**
   * Durable resume key for long-form audio. When set, listening progress is
   * persisted to the audio-resume store and cleared on completion.
   */
  resumeKey?: string;
  /** Start playback from this offset (ms) instead of 0 — used for resume. */
  initialPositionMs?: number;
}

interface PlayAzkarQueueOptions {
  onTrackComplete?: (track: AudioTrack, index: number) => void;
  repeatDelayMs?: number;
}

export interface GlobalAudioState {
  source: AudioSource;
  isPlaying: boolean;
  isLoading: boolean;
  // Track info
  currentTrackId?: string;
  trackTitle: string;
  trackSubtitle?: string;
  error?: string | null;
  // Progress
  position: number;
  duration: number;
  // Azkar queue
  queueIndex: number;
  queueLength: number;
  queueDisplayIndex: number;
  queueDisplayLength: number;
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
  playAzkarQueue: (tracks: AudioTrack[], startIndex?: number, sourceRoute?: string, options?: PlayAzkarQueueOptions) => Promise<void>;
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
  currentTrackId: undefined,
  trackTitle: '',
  trackSubtitle: undefined,
  error: null,
  position: 0,
  duration: 0,
  queueIndex: 0,
  queueLength: 0,
  queueDisplayIndex: 0,
  queueDisplayLength: 0,
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

function getLogicalQueueDisplay(queue: AudioTrack[], index: number) {
  if (queue.length === 0) {
    return { index: 0, length: 0 };
  }

  const currentBaseIndex = queue[index]?.baseIndex;
  if (currentBaseIndex === undefined) {
    return { index: index + 1, length: queue.length };
  }

  const orderedBaseIndexes: number[] = [];
  const seenBaseIndexes = new Set<number>();
  queue.forEach((track) => {
    if (track.baseIndex === undefined || seenBaseIndexes.has(track.baseIndex)) return;
    seenBaseIndexes.add(track.baseIndex);
    orderedBaseIndexes.push(track.baseIndex);
  });

  const logicalIndex = orderedBaseIndexes.indexOf(currentBaseIndex);
  return {
    index: logicalIndex >= 0 ? logicalIndex + 1 : index + 1,
    length: orderedBaseIndexes.length || queue.length,
  };
}

export function GlobalAudioProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<AudioSource>('none');
  const [azkarPlaying, setAzkarPlaying] = useState(false);
  const [azkarLoading, setAzkarLoading] = useState(false);
  const [trackTitle, setTrackTitle] = useState('');
  const [trackSubtitle, setTrackSubtitle] = useState<string | undefined>();
  const [currentTrackId, setCurrentTrackId] = useState<string | undefined>();
  const [audioError, setAudioError] = useState<string | null>(null);
  const [sourceRoute, setSourceRoute] = useState<string | undefined>();
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueLength, setQueueLength] = useState(0);
  const [quranState, setQuranState] = useState<PlaybackState>(defaultState.quranState);
  const [radioState, setRadioState] = useState<RadioPlaybackState>(defaultRadioState);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [azkarDelayPending, setAzkarDelayPending] = useState(false);

  const sourceRef = useRef<AudioSource>('none');
  const azkarPlayingRef = useRef(false);
  const azkarQueue = useRef<AudioTrack[]>([]);
  const azkarSound = useRef<Audio.Sound | null>(null);
  const trackPlayerListeners = useRef<(() => void)[]>([]);
  const progressPoller = useRef<number | null>(null);
  const isTogglingRef = useRef(false);
  const queueIndexRef = useRef(0);
  const azkarTrackCompleteRef = useRef<PlayAzkarQueueOptions['onTrackComplete']>(undefined);
  const azkarRepeatDelayMsRef = useRef(0);
  const completedAzkarTracksRef = useRef<Set<string>>(new Set());
  const azkarDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressAzkarCompletionRef = useRef(false);
  const progressRef = useRef({ position: 0, duration: 0 });
  const azkarRunIdRef = useRef(0);
  // Last known progress of the active resumable track (resumeKey set).
  // Updated only from real progress callbacks; flushed to durable storage on
  // pause/stop/track-change/app-background and every few seconds while playing.
  const resumeTrackingRef = useRef<{ key: string; positionMs: number; durationMs: number } | null>(null);
  const lastResumeSaveAtRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { sourceRef.current = source; }, [source]);
  useEffect(() => { azkarPlayingRef.current = azkarPlaying; }, [azkarPlaying]);

  // Track when TrackPlayer setup completes (may happen after mount)
  const [tpReady, setTpReady] = useState(isTrackPlayerReady);
  useEffect(() => {
    if (tpReady) return; // Already ready
    onTrackPlayerSetupDone(() => setTpReady(true));
  }, [tpReady]);

  const clearAzkarDelayTimer = useCallback(() => {
    if (azkarDelayTimerRef.current) {
      clearTimeout(azkarDelayTimerRef.current);
      azkarDelayTimerRef.current = null;
    }
    setAzkarDelayPending(false);
  }, []);

  const finishSuppressingAzkarCompletionSoon = useCallback(() => {
    setTimeout(() => {
      suppressAzkarCompletionRef.current = false;
    }, 250);
  }, []);

  // Record live progress for a resumable track; throttled durable save while playing.
  const trackResumeProgress = useCallback((track: AudioTrack | undefined, positionMs: number, durationMs: number) => {
    const key = track?.resumeKey;
    if (!key || durationMs <= 0 || positionMs < 1000) return;
    resumeTrackingRef.current = { key, positionMs, durationMs };
    const now = Date.now();
    if (now - lastResumeSaveAtRef.current >= 5000) {
      lastResumeSaveAtRef.current = now;
      savePlaybackProgress(key, positionMs, durationMs).catch(() => {});
    }
  }, []);

  // Immediately persist the latest tracked position (pause/stop/background).
  const flushResumeProgress = useCallback(() => {
    const tracked = resumeTrackingRef.current;
    if (!tracked) return;
    lastResumeSaveAtRef.current = Date.now();
    savePlaybackProgress(tracked.key, tracked.positionMs, tracked.durationMs).catch(() => {});
  }, []);

  // Persist on app background so a later OS kill can't lose more than a moment.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') flushResumeProgress();
    });
    return () => sub.remove();
  }, [flushResumeProgress]);

  const shouldDelayBeforeTrack = useCallback((from?: AudioTrack, to?: AudioTrack): boolean => {
    if (!from || !to) return false;
    if (from.countsForRepeat === false) return false;
    if (from.baseIndex === undefined || to.baseIndex === undefined) return false;
    return from.baseIndex === to.baseIndex && from.repeatIndex !== to.repeatIndex;
  }, []);

  const markAzkarTrackComplete = useCallback((idx: number) => {
    const track = azkarQueue.current[idx];
    if (!track || track.countsForRepeat === false) return;

    // Finished content should not offer resume next time.
    if (track.resumeKey) {
      if (resumeTrackingRef.current?.key === track.resumeKey) {
        resumeTrackingRef.current = null;
      }
      clearPlaybackProgress(track.resumeKey).catch(() => {});
    }

    const completionKey = `${idx}:${track.id}:${track.repeatIndex ?? 1}:${track.repeatPartIndex ?? 1}`;
    if (completedAzkarTracksRef.current.has(completionKey)) return;

    completedAzkarTracksRef.current.add(completionKey);
    azkarTrackCompleteRef.current?.(track, idx);
  }, []);

  const findAdjacentLogicalAzkarIndex = useCallback((direction: 1 | -1): number => {
    const queue = azkarQueue.current;
    const currentIndex = queueIndexRef.current;
    const currentTrack = queue[currentIndex];
    const currentBaseIndex = currentTrack?.baseIndex;

    if (currentBaseIndex === undefined) {
      return currentIndex + direction;
    }

    if (direction > 0) {
      for (let i = currentIndex + 1; i < queue.length; i += 1) {
        if (queue[i]?.baseIndex !== currentBaseIndex) return i;
      }
      return queue.length;
    }

    let previousBaseIndex: number | undefined;
    for (let i = currentIndex - 1; i >= 0; i -= 1) {
      if (queue[i]?.baseIndex !== currentBaseIndex) {
        previousBaseIndex = queue[i]?.baseIndex;
        break;
      }
    }

    if (previousBaseIndex === undefined) return -1;
    const firstIndex = queue.findIndex(track => track.baseIndex === previousBaseIndex);
    return firstIndex >= 0 ? firstIndex : -1;
  }, []);

  // Setup TrackPlayer event listeners for azkar (re-runs when tpReady flips to true)
  useEffect(() => {
    if (!tpReady || !TrackPlayer || !Event || !State) return;

    // Listen for track changes
    const trackChangedListener = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async (event) => {
        if (sourceRef.current !== 'azkar') return;
        if (event.track) {
          const previousIndex = queueIndexRef.current;
          const index = event.index ?? 0;
          const previousTrack = azkarQueue.current[previousIndex];
          const nextTrack = azkarQueue.current[index];
          const { position: lastPosition, duration: lastDuration } = progressRef.current;
          const looksFinished = lastDuration <= 0 || lastPosition >= Math.max(0, lastDuration - 1250);

          if (
            !suppressAzkarCompletionRef.current &&
            previousIndex !== index &&
            previousTrack &&
            looksFinished
          ) {
            markAzkarTrackComplete(previousIndex);
          }

          // Persist the outgoing track's resume position (no-op if it just
          // completed — markAzkarTrackComplete cleared the tracking ref).
          if (previousIndex !== index) {
            flushResumeProgress();
            resumeTrackingRef.current = null;
          }

          clearAzkarDelayTimer();
          queueIndexRef.current = index;
          setQueueIndex(index);
          setCurrentTrackId(nextTrack?.id);
          setTrackTitle(cleanAudioDisplayText(event.track.title));
          setTrackSubtitle(cleanAudioDisplayText(event.track.artist));
          setPosition(0);
          setDuration(0);
          progressRef.current = { position: 0, duration: 0 };

          if (
            !suppressAzkarCompletionRef.current &&
            previousIndex !== index &&
            shouldDelayBeforeTrack(previousTrack, nextTrack)
          ) {
            const delayMs = azkarRepeatDelayMsRef.current;
            if (delayMs > 0) {
              const runId = azkarRunIdRef.current;
              try {
                await TrackPlayer.pause();
                await TrackPlayer.seekTo(0);
              } catch {}
              setAzkarDelayPending(true);
              azkarDelayTimerRef.current = setTimeout(async () => {
                if (
                  sourceRef.current === 'azkar' &&
                  queueIndexRef.current === index &&
                  azkarRunIdRef.current === runId
                ) {
                  setAzkarDelayPending(false);
                  try { await TrackPlayer?.play(); } catch {}
                }
              }, delayMs);
            }
          }
        }
      }
    );
    trackPlayerListeners.current.push(() => trackChangedListener.remove());

    // Listen for queue end
    const queueEndListener = TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      async () => {
        if (sourceRef.current !== 'azkar') return;
        if (!suppressAzkarCompletionRef.current) {
          markAzkarTrackComplete(queueIndexRef.current);
        }
        clearAzkarDelayTimer();
        // Queue finished
        setAzkarPlaying(false);
        azkarPlayingRef.current = false;
        setAzkarLoading(false);
        setAzkarDelayPending(false);
        setSource('none');
        sourceRef.current = 'none';
        setCurrentTrackId(undefined);
        audioCoordinator.releaseFocus('azkar-queue', 'azkar');
      }
    );
    trackPlayerListeners.current.push(() => queueEndListener.remove());

    // Listen for playback state
    const stateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (event) => {
        if (sourceRef.current !== 'azkar') return;
        // expo-av (forceExpoAv tracks) owns play/pause state for its path; a
        // stray idle-TrackPlayer state event must not override it.
        if (azkarSound.current) return;
        const isPlaying = event.state === State.Playing;
        const isLoading = event.state === State.Loading || event.state === State.Buffering;
        setAzkarPlaying(isPlaying);
        azkarPlayingRef.current = isPlaying;
        setAzkarLoading(isLoading);
        if (isPlaying) setAzkarDelayPending(false);
        // Covers lock-screen/notification pause where togglePlayPause never runs.
        if (!isPlaying && !isLoading) flushResumeProgress();
      }
    );
    trackPlayerListeners.current.push(() => stateListener.remove());

    // Start progress poller for azkar
    progressPoller.current = setInterval(async () => {
      if (sourceRef.current !== 'azkar' || !TrackPlayer) return;
      // When the active track plays through expo-av (forceExpoAv tracks such as
      // the long-form Seerah/stories archive streams), TrackPlayer's queue is
      // empty/reset, so getProgress() returns 0/0. Polling it here would clobber
      // the real position/duration coming from the expo-av status callback on
      // every tick — the visible "time flicker" between real values and 0:00 /
      // --:--. expo-av owns progress for that path; skip the TrackPlayer poll.
      if (azkarSound.current) return;
      try {
        const progress = await TrackPlayer.getProgress();
        const pos = progress.position;
        const dur = progress.duration;
        const positionMs = pos * 1000;
        const durationMs = dur * 1000;
        progressRef.current = { position: positionMs, duration: durationMs };
        setPosition(positionMs);
        setDuration(durationMs);
        trackResumeProgress(azkarQueue.current[queueIndexRef.current], positionMs, durationMs);
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
  }, [clearAzkarDelayTimer, flushResumeProgress, markAzkarTrackComplete, shouldDelayBeforeTrack, trackResumeProgress, tpReady]);

  // Cleanup azkar sound (both TrackPlayer and expo-av)
  const cleanupAzkar = useCallback(async () => {
    // Persist the resumable position before tearing the player down — this is
    // the single choke point for stop/focus-loss/queue-replacement paths.
    flushResumeProgress();
    resumeTrackingRef.current = null;
    suppressAzkarCompletionRef.current = true;
    clearAzkarDelayTimer();
    if (isTrackPlayerReady() && TrackPlayer) {
      try {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      } catch {}
    }
    
    if (azkarSound.current) {
      try {
        await azkarSound.current.stopAsync();
        await azkarSound.current.unloadAsync();
      } catch {}
      azkarSound.current = null;
    }
    finishSuppressingAzkarCompletionSoon();
  }, [clearAzkarDelayTimer, finishSuppressingAzkarCompletionSoon, flushResumeProgress]);

  // Play a specific item from the azkar queue by index
  const playAzkarAtIndex = useCallback(async (idx: number) => {
    const queue = azkarQueue.current;
    if (idx < 0 || idx >= queue.length) {
      // Queue finished
      await cleanupAzkar();
      setAzkarPlaying(false);
      azkarPlayingRef.current = false;
      setAzkarLoading(false);
      setAzkarDelayPending(false);
      setSource('none');
      sourceRef.current = 'none';
      setCurrentTrackId(undefined);
      audioCoordinator.releaseFocus('azkar-queue', 'azkar');
      return;
    }

    const track = queue[idx];
    const initialPositionMs = Math.max(0, Math.floor(track.initialPositionMs ?? 0));
    queueIndexRef.current = idx;
    progressRef.current = { position: initialPositionMs, duration: 0 };
    setPosition(initialPositionMs);
    setDuration(0);
    setQueueIndex(idx);
    setCurrentTrackId(track.id);
    setTrackTitle(cleanAudioDisplayText(track.title));
    setTrackSubtitle(cleanAudioDisplayText(track.subtitle));
    setAzkarLoading(true);
    setAudioError(null);
    setAzkarDelayPending(false);

    await cleanupAzkar();

    // Request audio focus — this will stop any other audio source
    await audioCoordinator.requestFocus('azkar', {
      stop: async () => {
        azkarRunIdRef.current += 1;
        await cleanupAzkar();
        setAzkarPlaying(false);
        azkarPlayingRef.current = false;
        setAzkarLoading(false);
        setAzkarDelayPending(false);
        setSource('none');
        sourceRef.current = 'none';
      },
    }, 'azkar-queue');

    try {
      if (isTrackPlayerReady() && TrackPlayer && !track.forceExpoAv) {
        // Force the shared iOS AVAudioSession into Playback mode BEFORE
        // TrackPlayer.play(). expo-av's setAudioModeAsync mutates the same
        // singleton session that TrackPlayer uses on iOS, so this overrides
        // any wrong category that may have been left by a previous subsystem
        // (e.g. expo-av sound effect, notification preview, radio player).
        // Without this, TrackPlayer plays the file but the OS routes audio
        // to silence because the session category respects the silent switch.
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        } catch {}

        // Use TrackPlayer for native platforms (with lock screen controls)
        const tpTracks = await Promise.all(queue.map(async (t, i) => {
          const resolvedUrl = await resolveAzkarTrackUri(t);
          return {
            id: `azkar-${t.id}-${i}`,
            url: resolvedUrl,
            title: cleanAudioDisplayText(t.title),
            artist: cleanAudioDisplayText(t.subtitle || 'أذكار'),
            album: 'الأذكار',
            artwork: require('../assets/images/icons/icon.png'),
          };
        }));

        await TrackPlayer.reset();
        await TrackPlayer.add(tpTracks);
        if (idx > 0) {
          await TrackPlayer.skip(idx);
        }

        // Force max volume — guards against the case where another audio
        // subsystem (radio, Quran player, focus loss/duck) left the player
        // at reduced or zero volume on the previous session.
        try { await TrackPlayer.setVolume(1.0); } catch {}

        await TrackPlayer.setRate(playbackSpeed);
        await TrackPlayer.play();
        setAzkarLoading(false);
        finishSuppressingAzkarCompletionSoon();

        // Apply resume offset or intro trim for current track if configured
        const trimMs = track.categoryId ? getCategoryTrimMs(track.categoryId) : 0;
        const startOffsetMs = initialPositionMs > 0 ? initialPositionMs : trimMs;
        if (startOffsetMs > 0) {
          // Small delay to let TrackPlayer initialize, then seek
          setTimeout(async () => {
            try {
              await TrackPlayer?.seekTo(startOffsetMs / 1000); // TrackPlayer uses seconds
            } catch (e) {
              console.error('[GlobalAudio] Failed to apply TrackPlayer start offset:', e);
            }
          }, 100);
        }

        console.log('[GlobalAudio] Playing azkar queue with TrackPlayer, tracks:', tpTracks.length);
      } else {
        // Use expo-av for web platform / Expo Go fallback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          staysActiveInBackground: true,
        });

        // Check for intro trim for this category
        const trimMs = track.categoryId ? getCategoryTrimMs(track.categoryId) : 0;

        const resolvedUri = await resolveAzkarTrackUri(track);
        const { sound } = await Audio.Sound.createAsync(
          track.localSource ? track.localSource : { uri: resolvedUri },
          { shouldPlay: false, rate: playbackSpeed, positionMillis: initialPositionMs },
          async (status: any) => {
            if (status.isLoaded) {
              setPosition(status.positionMillis || 0);
              setDuration(status.durationMillis || 0);
              progressRef.current = {
                position: status.positionMillis || 0,
                duration: status.durationMillis || 0,
              };
              trackResumeProgress(track, status.positionMillis || 0, status.durationMillis || 0);
              setAzkarPlaying(status.isPlaying);
              azkarPlayingRef.current = status.isPlaying;
              setAzkarLoading(false);

              if (status.didJustFinish) {
                markAzkarTrackComplete(idx);
                const nextTrack = azkarQueue.current[idx + 1];
                const delayMs = shouldDelayBeforeTrack(track, nextTrack) ? azkarRepeatDelayMsRef.current : 0;
                const runId = azkarRunIdRef.current;
                const playNext = () => {
                  if (azkarRunIdRef.current === runId) {
                    playAzkarAtIndex(idx + 1);
                  }
                };

                if (delayMs > 0) {
                  clearAzkarDelayTimer();
                  setAzkarDelayPending(true);
                  azkarDelayTimerRef.current = setTimeout(playNext, delayMs);
                } else {
                  playNext();
                }
              }
            } else if (status.error) {
              // Sound failed to load/play — skip to next track
              console.log('[GlobalAudio] expo-av playback error:', status.error);
              setAudioError('audio-playback-error');
              setAzkarLoading(false);
              playAzkarAtIndex(idx + 1);
            }
          },
          !/^https?:\/\//i.test(resolvedUri),
        );
        azkarSound.current = sound;

        // Apply resume offset or intro trim AFTER the sound is created —
        // Android's ExoPlayer ignores initialStatus.positionMillis on remote
        // streams, so an explicit seek is the only reliable path there.
        const startOffsetMs = initialPositionMs > 0 ? initialPositionMs : trimMs;
        if (startOffsetMs > 0) {
          try {
            const status = await sound.getStatusAsync();
            const knownDurationMs = status.isLoaded ? status.durationMillis : undefined;
            if (status.isLoaded && (!knownDurationMs || knownDurationMs > startOffsetMs)) {
              await sound.setPositionAsync(startOffsetMs);
            }
          } catch (e) {
            console.error('[GlobalAudio] Failed to apply start offset:', e);
          }
        }

        // Now start playback
        await sound.playAsync();
      }
    } catch (error) {
      console.log('[GlobalAudio] Error playing azkar track:', error);
      setAudioError('audio-playback-error');
      setAzkarLoading(false);
      setAzkarDelayPending(false);
      // Try next track
      playAzkarAtIndex(idx + 1);
    }
  }, [
    cleanupAzkar,
    clearAzkarDelayTimer,
    finishSuppressingAzkarCompletionSoon,
    markAzkarTrackComplete,
    playbackSpeed,
    shouldDelayBeforeTrack,
    trackResumeProgress,
  ]);

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

  const playAzkarQueue = useCallback(async (
    tracks: AudioTrack[],
    startIndex = 0,
    route?: string,
    options?: PlayAzkarQueueOptions,
  ) => {
    if (tracks.length === 0) return;
    // Diagnostics: audio (TrackPlayer/expo-av) is a leading source of NATIVE
    // crashes that never produce a JS stack. Trailing "audio started" lets a
    // later crash report be attributed to the playback path.
    addBreadcrumb('audio', `azkar-play(${tracks.length})`);
    azkarRunIdRef.current += 1;
    azkarQueue.current = tracks;
    completedAzkarTracksRef.current = new Set();
    azkarTrackCompleteRef.current = options?.onTrackComplete;
    azkarRepeatDelayMsRef.current = Math.max(0, options?.repeatDelayMs ?? 0);
    setAudioError(null);
    queueIndexRef.current = startIndex;
    if (route) setSourceRoute(route);

    // Defensively stop ANY other audio source before we touch the audio session.
    // We `await` so the previous Sound is fully unloaded before we create the
    // new one — without this, two expo-av Sound instances can play in parallel
    // (Quran ayah + story audio) when the user switches screens during loading.
    // Quran state may be stale, so don't gate on `quranState.isPlaying`.
    try { await audioPlayer.stop(); } catch {}
    if (sourceRef.current === 'radio') {
      try { await radioPlayer.stop(); } catch {}
    }

    setSource('azkar');
    sourceRef.current = 'azkar'; // Sync ref eagerly so TrackPlayer event listeners see it immediately
    setQueueLength(tracks.length);
    await playAzkarAtIndex(startIndex);
  }, [playAzkarAtIndex]);

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
        setAzkarDelayPending(false);
        azkarTrackCompleteRef.current = undefined;
        azkarQueue.current = [];
        setQueueLength(0);
        setCurrentTrackId(undefined);
        setAudioError(null);
      }
      setSource('radio');
      setSourceRoute(undefined);
      addBreadcrumb('audio', `radio-play(${station?.id ?? 'unknown'})`);
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
        clearAzkarDelayTimer();
        if (azkarSound.current) {
          try {
            const status = await azkarSound.current.getStatusAsync();
            if (!status.isLoaded) return;
            if (status.isPlaying) {
              setAzkarPlaying(false);
              azkarPlayingRef.current = false;
              await azkarSound.current.pauseAsync();
              flushResumeProgress();
            } else {
              setAzkarPlaying(true);
              azkarPlayingRef.current = true;
              await azkarSound.current.playAsync();
            }
          } catch {}
        } else if (isTrackPlayerReady() && TrackPlayer) {
          if (isCurrentlyPlaying) {
            // Immediately update state so UI responds
            setAzkarPlaying(false);
            azkarPlayingRef.current = false;
            try { await TrackPlayer.pause(); } catch {}
            flushResumeProgress();
          } else {
            setAzkarPlaying(true);
            azkarPlayingRef.current = true;
            try { await TrackPlayer.play(); } catch {}
          }
        }
      } else if (currentSource === 'radio') {
        await radioPlayer.togglePlayPause();
      }
    } finally {
      isTogglingRef.current = false;
    }
  }, [clearAzkarDelayTimer, flushResumeProgress]);

  const stop = useCallback(async () => {
    const currentSource = sourceRef.current;
    if (currentSource === 'quran') {
      audioPlayer.stop();
    } else if (currentSource === 'azkar') {
      await cleanupAzkar();
    } else if (currentSource === 'radio') {
      await radioPlayer.stop();
    }
    setSource('none');
    sourceRef.current = 'none';
    setSourceRoute(undefined);
    setCurrentTrackId(undefined);
    setAudioError(null);
    setAzkarPlaying(false);
    azkarPlayingRef.current = false;
    setAzkarLoading(false);
    setAzkarDelayPending(false);
    azkarRunIdRef.current += 1;
    azkarTrackCompleteRef.current = undefined;
    azkarQueue.current = [];
    setQueueLength(0);
  }, [cleanupAzkar]);

  const seekTo = useCallback(async (positionMs: number) => {
    const targetPosition = Math.max(0, positionMs);
    const currentSource = sourceRef.current;
    if (currentSource === 'quran') {
      setQuranState(prev => ({ ...prev, position: targetPosition }));
      audioPlayer.seekTo(targetPosition);
    } else if (currentSource === 'azkar') {
      setPosition(targetPosition);
      // Keep the resume snapshot honest so a kill right after a seek
      // restores the seeked position, not the pre-seek one.
      trackResumeProgress(azkarQueue.current[queueIndexRef.current], targetPosition, progressRef.current.duration);
      if (azkarSound.current) {
        try {
          const status = await azkarSound.current.getStatusAsync();
          if (status.isLoaded) await azkarSound.current.setPositionAsync(targetPosition);
        } catch {}
      } else if (isTrackPlayerReady() && TrackPlayer) {
        await TrackPlayer.seekTo(targetPosition / 1000); // TrackPlayer uses seconds
      }
    }
  }, [trackResumeProgress]);

  const next = useCallback(async () => {
    const currentSource = sourceRef.current;
    if (currentSource === 'quran') {
      audioPlayer.playNextAyah();
    } else if (currentSource === 'azkar') {
      const nextIdx = findAdjacentLogicalAzkarIndex(1);
      if (nextIdx < 0 || nextIdx >= azkarQueue.current.length) return;
      clearAzkarDelayTimer();
      if (azkarSound.current) {
        await playAzkarAtIndex(nextIdx);
      } else if (isTrackPlayerReady() && TrackPlayer) {
        suppressAzkarCompletionRef.current = true;
        queueIndexRef.current = nextIdx;
        await TrackPlayer.skip(nextIdx);
        await TrackPlayer.play();
        finishSuppressingAzkarCompletionSoon();
      } else {
        await playAzkarAtIndex(nextIdx);
      }
    }
  }, [clearAzkarDelayTimer, findAdjacentLogicalAzkarIndex, finishSuppressingAzkarCompletionSoon, playAzkarAtIndex]);

  const previous = useCallback(async () => {
    const currentSource = sourceRef.current;
    if (currentSource === 'quran') {
      audioPlayer.playPreviousAyah();
    } else if (currentSource === 'azkar') {
      const prevIdx = findAdjacentLogicalAzkarIndex(-1);
      if (prevIdx < 0 || prevIdx >= azkarQueue.current.length) return;
      clearAzkarDelayTimer();
      if (azkarSound.current) {
        await playAzkarAtIndex(prevIdx);
      } else if (isTrackPlayerReady() && TrackPlayer) {
        suppressAzkarCompletionRef.current = true;
        queueIndexRef.current = prevIdx;
        await TrackPlayer.skip(prevIdx);
        await TrackPlayer.play();
        finishSuppressingAzkarCompletionSoon();
      } else {
        await playAzkarAtIndex(prevIdx);
      }
    }
  }, [clearAzkarDelayTimer, findAdjacentLogicalAzkarIndex, finishSuppressingAzkarCompletionSoon, playAzkarAtIndex]);

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

  const queueDisplay = source === 'azkar'
    ? getLogicalQueueDisplay(azkarQueue.current, queueIndex)
    : { index: 0, length: 0 };

  const state: GlobalAudioState = {
    source,
    isPlaying: source === 'quran' ? quranState.isPlaying : source === 'azkar' ? azkarPlaying : source === 'radio' ? radioState.status === 'playing' : false,
    isLoading: source === 'quran' ? quranState.isLoading : source === 'azkar' ? (azkarLoading || azkarDelayPending) : source === 'radio' ? (radioState.status === 'loading' || radioState.status === 'buffering') : false,
    trackTitle: source === 'quran' ? '' : source === 'radio' ? (radioState.currentStation?.name || '') : trackTitle,
    trackSubtitle: source === 'quran' ? undefined : source === 'radio' ? (radioState.currentStation?.nameTranslations?.en) : trackSubtitle,
    position: source === 'quran' ? quranState.position : position,
    duration: source === 'quran' ? quranState.duration : duration,
    queueIndex: source === 'azkar' ? queueIndex : 0,
    queueLength: source === 'azkar' ? queueLength : 0,
    queueDisplayIndex: source === 'azkar' ? queueDisplay.index : 0,
    queueDisplayLength: source === 'azkar' ? queueDisplay.length : 0,
    sourceRoute: source === 'azkar' ? sourceRoute : undefined,
    currentTrackId: source === 'azkar' ? currentTrackId : undefined,
    quranState,
    radioState,
    error: audioError,
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
