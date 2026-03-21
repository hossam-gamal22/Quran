// lib/radio-player.ts
// Radio player engine — uses expo-av for audio streaming
// Provides high-level API for radio streaming

import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { resolveStreamUrl } from '@/services/radioService';
import { audioCoordinator } from '@/lib/audio-coordinator';
import type { RadioStation, RadioPlaybackState, RadioPlaybackStatus } from '@/types/radio';

// ==================== expo-av Audio Player ====================

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
  console.log('[RadioPlayer] playWithExpoAv:', url);
  await ensureExpoAvConfig();
  // Unload previous sound
  if (_expoAvSound) {
    try { await _expoAvSound.unloadAsync(); } catch {}
    _expoAvSound = null;
  }

  // Pre-check the stream URL with a HEAD request (quick 3s timeout)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok && res.status !== 200) {
      console.warn(`[RadioPlayer] Stream URL returned ${res.status}: ${url}`);
      throw new Error(`Stream returned HTTP ${res.status}`);
    }
    console.log(`[RadioPlayer] Stream URL OK (${res.status}), creating sound...`);
  } catch (e: any) {
    // AbortError means timeout — still try to play (some streams don't reply to HEAD)
    if (e?.name !== 'AbortError') {
      throw e;
    }
    console.log('[RadioPlayer] HEAD request timed out, trying to play anyway...');
  }

  // Race createAsync against a timeout — some dead URLs hang forever
  const createPromise = Audio.Sound.createAsync(
    { uri: url },
    { shouldPlay: true, progressUpdateIntervalMillis: 500 },
  );
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Stream connection timed out')), 15_000)
  );
  const { sound } = await Promise.race([createPromise, timeoutPromise]);
  _expoAvSound = sound;
  console.log('[RadioPlayer] expo-av sound created successfully');

  // Set up a playback start timeout — if not playing within 8s, error out
  let playbackStarted = false;
  const playbackTimer = setTimeout(() => {
    if (!playbackStarted && _expoAvSound === sound) {
      console.warn('[RadioPlayer] expo-av: No playback after 12s, erroring out');
      updateState({ status: 'error', errorMessage: 'Stream failed to start playing' });
      try { sound.unloadAsync(); } catch {}
      if (_expoAvSound === sound) _expoAvSound = null;
    }
  }, 12_000);

  // Monitor playback status
  sound.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.warn('[RadioPlayer] expo-av error:', status.error);
        playbackStarted = true; // prevent timeout from also firing
        clearTimeout(playbackTimer);
        updateState({ status: 'error', errorMessage: status.error });
      }
      return;
    }
    if (status.isPlaying) {
      if (!playbackStarted) {
        playbackStarted = true;
        clearTimeout(playbackTimer);
        console.log('[RadioPlayer] expo-av: Stream is PLAYING');
      }
      updateState({ status: 'playing' });
    } else if (status.isBuffering) {
      updateState({ status: 'buffering' });
    }
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

// Auto-retry config for stream failures
let _retryCount = 0;
const MAX_AUTO_RETRIES = 2;
let _retryTimer: ReturnType<typeof setTimeout> | null = null;
let _playLock = false;

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
   * Play a radio station using expo-av
   */
  async play(station: RadioStation): Promise<void> {
    if (Platform.OS === 'web') {
      console.warn('[RadioPlayer] Not supported on web');
      return;
    }

    // Debounce rapid play calls
    if (_playLock) {
      console.log('[RadioPlayer] Play already in progress, ignoring');
      return;
    }
    _playLock = true;
    setTimeout(() => { _playLock = false; }, 1000);

    // Request audio focus — this will stop any other audio source
    await audioCoordinator.requestFocus('radio', {
      stop: () => radioPlayer.stop(),
      pause: () => radioPlayer.togglePlayPause(),
    }, 'radio-player');

    // Reset retry counter on new play attempt
    _retryCount = 0;
    if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }

    updateState({
      status: 'loading',
      currentStation: station,
      errorMessage: undefined,
    });

    try {
      const resolvedUrl = await resolveStreamUrl(station.streamUrl);
      await playWithExpoAv(resolvedUrl);
    } catch (error) {
      console.error('[RadioPlayer] expo-av error:', error);
      
      // Auto-retry on stream connection errors
      if (_retryCount < MAX_AUTO_RETRIES) {
        _retryCount++;
        console.log(`[RadioPlayer] Auto-retry ${_retryCount}/${MAX_AUTO_RETRIES}`);
        updateState({ status: 'buffering', errorMessage: undefined });
        if (_retryTimer) clearTimeout(_retryTimer);
        _retryTimer = setTimeout(() => {
          if (station) radioPlayer._retryPlay(station);
        }, 2000);
        return;
      }
      
      updateState({ status: 'error', errorMessage: 'Failed to play stream' });
    }
  },

  /** Internal retry — same as play() but does NOT reset _retryCount */
  async _retryPlay(station: RadioStation): Promise<void> {
    if (Platform.OS === 'web') return;

    updateState({ status: 'loading', currentStation: station, errorMessage: undefined });

    try {
      const resolvedUrl = await resolveStreamUrl(station.streamUrl);
      await playWithExpoAv(resolvedUrl);
    } catch {
      updateState({ status: 'error', errorMessage: 'Failed to play stream' });
    }
  },

  /** Toggle play/pause */
  async togglePlayPause(): Promise<void> {
    if (Platform.OS === 'web') return;
    await toggleExpoAv();
  },

  /** Stop playback and clear */
  async stop(): Promise<void> {
    if (Platform.OS === 'web') return;

    await stopExpoAv();
    updateState({ status: 'idle', currentStation: null, errorMessage: undefined });
    audioCoordinator.releaseFocus('radio-player', 'radio');
  },

  /** Set volume (0 to 1) */
  async setVolume(volume: number): Promise<void> {
    if (Platform.OS === 'web') return;
    const clamped = Math.max(0, Math.min(1, volume));
    await setExpoAvVolume(clamped);
    updateState({ volume: clamped });
  },

  /** Retry playing the current station (on error) */
  async retry(): Promise<void> {
    const station = currentState.currentStation;
    if (station) {
      await radioPlayer.play(station);
    }
  },
};


