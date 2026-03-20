// lib/radio-player.ts
// Radio player engine — uses TrackPlayer in native builds, expo-av in Expo Go
// Provides high-level API for radio streaming with lock screen controls

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';
import { setupTrackPlayer, isTrackPlayerSetup } from '@/lib/track-player-setup';
import { resolveStreamUrl } from '@/services/radioService';
import type { RadioStation, RadioPlaybackState, RadioPlaybackStatus } from '@/types/radio';

// Detect Expo Go — 'storeClient' means running inside Expo Go
const _isExpoGo = Constants.executionEnvironment === 'storeClient';

// Lazy-loaded TrackPlayer (only in native/dev builds)
let _TrackPlayer: any = null;
let _State: any = null;
let _Event: any = null;
let _trackPlayerAvailable = false;

function getTrackPlayer() {
  if (_isExpoGo) return null; // Never attempt in Expo Go
  if (_TrackPlayer) return _TrackPlayer;
  try {
    const mod = require('react-native-track-player');
    _TrackPlayer = mod.default || mod;
    _State = mod.State;
    _Event = mod.Event;
    _trackPlayerAvailable = true;
    return _TrackPlayer;
  } catch {
    _trackPlayerAvailable = false;
    return null;
  }
}

export function isTrackPlayerAvailable(): boolean {
  if (_isExpoGo) return false;
  if (_trackPlayerAvailable) return true;
  getTrackPlayer();
  return _trackPlayerAvailable;
}

// ==================== expo-av Fallback (for Expo Go) ====================

let _expoAvSound: Audio.Sound | null = null;
let _expoAvAudioConfigured = false;

async function ensureExpoAvConfig() {
  if (_expoAvAudioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
    _expoAvAudioConfigured = true;
  } catch {}
}

async function playWithExpoAv(url: string): Promise<void> {
  await ensureExpoAvConfig();
  // Unload previous sound
  if (_expoAvSound) {
    try { await _expoAvSound.unloadAsync(); } catch {}
    _expoAvSound = null;
  }
  const { sound } = await Audio.Sound.createAsync(
    { uri: url },
    { shouldPlay: true },
  );
  _expoAvSound = sound;
  // Monitor playback status
  sound.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded) {
      if (status.error) {
        updateState({ status: 'error', errorMessage: status.error });
      }
      return;
    }
    if (status.isPlaying) updateState({ status: 'playing' });
    else if (status.isBuffering) updateState({ status: 'buffering' });
  });
}

async function stopExpoAv(): Promise<void> {
  if (_expoAvSound) {
    try { await _expoAvSound.stopAsync(); } catch {}
    try { await _expoAvSound.unloadAsync(); } catch {}
    _expoAvSound = null;
  }
}

async function toggleExpoAv(): Promise<void> {
  if (!_expoAvSound) return;
  try {
    const status = await _expoAvSound.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await _expoAvSound.pauseAsync();
      updateState({ status: 'paused' });
    } else {
      await _expoAvSound.playAsync();
      updateState({ status: 'playing' });
    }
  } catch {}
}

async function setExpoAvVolume(volume: number): Promise<void> {
  if (!_expoAvSound) return;
  try { await _expoAvSound.setVolumeAsync(volume); } catch {}
}

// ==================== State Management ====================

type RadioPlayerListener = (state: RadioPlaybackState) => void;

let currentState: RadioPlaybackState = {
  status: 'idle',
  currentStation: null,
  volume: 1,
};

// Auto-retry config for Android stream failures
let _retryCount = 0;
const MAX_AUTO_RETRIES = 2;
let _retryTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<RadioPlayerListener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener({ ...currentState });
  }
}

function updateState(partial: Partial<RadioPlaybackState>) {
  currentState = { ...currentState, ...partial };
  notifyListeners();
}

// ==================== Track Player Event Monitoring ====================

let eventsRegistered = false;

function registerPlayerEvents() {
  if (eventsRegistered || Platform.OS === 'web') return;
  const TP = getTrackPlayer();
  if (!TP || !_Event || !_State) return;
  eventsRegistered = true;

  TP.addEventListener(_Event.PlaybackState, (event: any) => {
    const state = event.state;
    let status: RadioPlaybackStatus = 'idle';

    if (state === _State.Playing) status = 'playing';
    else if (state === _State.Paused) status = 'paused';
    else if (state === _State.Buffering || state === _State.Connecting) status = 'buffering';
    else if (state === _State.Loading) status = 'loading';
    else status = 'idle';

    updateState({ status });
  });

  TP.addEventListener(_Event.PlaybackError, (event: any) => {
    console.error('[RadioPlayer] Playback error:', event);

    // On Android, auto-retry on stream connection errors (HTTP blocked, timeout, etc.)
    if (Platform.OS === 'android' && _retryCount < MAX_AUTO_RETRIES && currentState.currentStation) {
      _retryCount++;
      console.log(`[RadioPlayer] Auto-retry ${_retryCount}/${MAX_AUTO_RETRIES}`);
      updateState({ status: 'buffering', errorMessage: undefined });
      if (_retryTimer) clearTimeout(_retryTimer);
      _retryTimer = setTimeout(() => {
        const station = currentState.currentStation;
        if (station) radioPlayer.play(station);
      }, 1500);
      return;
    }

    updateState({
      status: 'error',
      errorMessage: event.message || 'Stream playback error',
    });
  });
}

// ==================== Public API ====================

export const radioPlayer = {
  /**
   * Subscribe to playback state changes
   * Returns an unsubscribe function
   */
  subscribe(listener: RadioPlayerListener): () => void {
    listeners.add(listener);
    // Send current state immediately
    listener({ ...currentState });
    return () => { listeners.delete(listener); };
  },

  /** Get current state snapshot */
  getState(): RadioPlaybackState {
    return { ...currentState };
  },

  /**
   * Play a radio station
   * Sets up TrackPlayer if needed, then loads and plays the stream
   */
  async play(station: RadioStation): Promise<void> {
    if (Platform.OS === 'web') {
      console.warn('[RadioPlayer] Not supported on web');
      return;
    }

    // Reset retry counter on new play attempt
    _retryCount = 0;
    if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }

    updateState({
      status: 'loading',
      currentStation: station,
      errorMessage: undefined,
    });

    // Use expo-av fallback in Expo Go
    if (_isExpoGo) {
      try {
        const resolvedUrl = await resolveStreamUrl(station.streamUrl);
        await playWithExpoAv(resolvedUrl);
      } catch (error) {
        console.error('[RadioPlayer] expo-av fallback error:', error);
        updateState({ status: 'error', errorMessage: 'Failed to play stream' });
      }
      return;
    }

    const TP = getTrackPlayer();
    if (!TP) {
      updateState({ status: 'error', errorMessage: 'Radio player unavailable' });
      return;
    }

    // Setup player if not already done
    if (!isTrackPlayerSetup()) {
      const success = await setupTrackPlayer();
      if (!success) {
        updateState({ status: 'error', errorMessage: 'Failed to initialize audio player' });
        return;
      }
    }

    registerPlayerEvents();

    // Playback timeout — if no state change within 15s, surface error
    let playbackStarted = false;
    const playbackTimeout = setTimeout(() => {
      if (!playbackStarted && currentState.status === 'loading') {
        console.warn('[RadioPlayer] Playback timeout — no response after 15s');
        updateState({
          status: 'error',
          errorMessage: 'Stream connection timed out',
        });
      }
    }, 15_000);

    // Mark started when state changes from loading
    const unsub = radioPlayer.subscribe((s) => {
      if (s.status !== 'loading') {
        playbackStarted = true;
        clearTimeout(playbackTimeout);
        unsub();
      }
    });

    try {
      await TP.reset();

      const resolvedUrl = await resolveStreamUrl(station.streamUrl);

      await TP.add({
        id: station.id,
        url: resolvedUrl,
        title: station.name,
        artist: station.nameTranslations?.en || 'Quran Radio',
        artwork: station.imageUrl || undefined,
        isLiveStream: true,
      });

      await TP.play();
    } catch (error) {
      clearTimeout(playbackTimeout);
      unsub();
      console.error('[RadioPlayer] Failed to play station:', error);
      updateState({
        status: 'error',
        errorMessage: 'Failed to play stream',
      });
    }
  },

  /** Toggle play/pause */
  async togglePlayPause(): Promise<void> {
    if (Platform.OS === 'web') return;

    if (_isExpoGo) {
      await toggleExpoAv();
      return;
    }

    if (!isTrackPlayerSetup()) return;
    const TP = getTrackPlayer();
    if (!TP || !_State) return;

    try {
      const playbackState = await TP.getPlaybackState();
      const state = playbackState.state;

      if (state === _State.Playing) {
        await TP.pause();
      } else if (state === _State.Paused || state === _State.Stopped) {
        await TP.play();
      }
    } catch (error) {
      console.error('[RadioPlayer] togglePlayPause error:', error);
    }
  },

  /** Stop playback and clear */
  async stop(): Promise<void> {
    if (Platform.OS === 'web') return;

    if (_isExpoGo) {
      await stopExpoAv();
      updateState({ status: 'idle', currentStation: null, errorMessage: undefined });
      return;
    }

    if (!isTrackPlayerSetup()) return;
    const TP = getTrackPlayer();
    if (!TP) return;

    try {
      await TP.reset();
      updateState({
        status: 'idle',
        currentStation: null,
        errorMessage: undefined,
      });
    } catch (error) {
      console.error('[RadioPlayer] stop error:', error);
    }
  },

  /** Set volume (0 to 1) */
  async setVolume(volume: number): Promise<void> {
    if (Platform.OS === 'web') return;
    const clamped = Math.max(0, Math.min(1, volume));

    if (_isExpoGo) {
      await setExpoAvVolume(clamped);
      updateState({ volume: clamped });
      return;
    }

    if (!isTrackPlayerSetup()) return;
    const TP = getTrackPlayer();
    if (!TP) return;
    try {
      await TP.setVolume(clamped);
      updateState({ volume: clamped });
    } catch {}
  },

  /** Retry playing the current station (on error) */
  async retry(): Promise<void> {
    const station = currentState.currentStation;
    if (station) {
      await radioPlayer.play(station);
    }
  },
};


