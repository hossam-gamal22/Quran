// lib/radio-player.ts
// Radio player engine — uses TrackPlayer for native platforms, expo-av as fallback
// Provides high-level API for radio streaming with lock screen controls

import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { resolveStreamUrl } from '@/services/radioService';
import { audioCoordinator } from '@/lib/audio-coordinator';
import { isTrackPlayerSetupDone } from '@/lib/track-player-ready';
import { addListeningTime } from '@/lib/listening-tracker';
import type { RadioStation, RadioPlaybackState, RadioPlaybackStatus } from '@/types/radio';

// Dynamic import of TrackPlayer - may not be available in Expo Go
let TrackPlayer: typeof import('react-native-track-player').default | null = null;
let Event: typeof import('react-native-track-player').Event | null = null;
let State: typeof import('react-native-track-player').State | null = null;
let TrackType: typeof import('react-native-track-player').TrackType | null = null;
let trackPlayerModuleAvailable = false;

try {
  if (Platform.OS !== 'web') {
    const TP = require('react-native-track-player');
    TrackPlayer = TP.default;
    Event = TP.Event;
    State = TP.State;
    TrackType = TP.TrackType;
    trackPlayerModuleAvailable = !!TrackPlayer?.getPlaybackState;
  }
} catch {
  trackPlayerModuleAvailable = false;
}

// Check at call time: module must exist AND setupPlayer() must have completed
function shouldUseTrackPlayer(): boolean {
  return trackPlayerModuleAvailable && isTrackPlayerSetupDone();
}

// ==================== TrackPlayer Radio Support ====================

let _trackPlayerListeners: (() => void)[] = [];
let _isTrackPlayerSetupForRadio = false;

async function setupTrackPlayerRadioListeners() {
  if (_isTrackPlayerSetupForRadio || !TrackPlayer || !Event || !State) return;
  _isTrackPlayerSetupForRadio = true;
  
  // Listen for playback state changes
  const stateListener = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    if (currentState.status === 'idle' || !State) return; // Not in radio mode
    
    switch (event.state) {
      case State.Playing:
        updateState({ status: 'playing' });
        break;
      case State.Paused:
      case State.Stopped:
        updateState({ status: 'paused' });
        break;
      case State.Loading:
      case State.Buffering:
        updateState({ status: 'buffering' });
        break;
      case State.Error:
        updateState({ status: 'error', errorMessage: 'Stream playback error' });
        break;
    }
  });
  _trackPlayerListeners.push(() => stateListener.remove());
  
  // Listen for errors
  const errorListener = TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
    console.error('[RadioPlayer] TrackPlayer error:', event);
    updateState({ status: 'error', errorMessage: event.message || 'Unknown error' });
  });
  _trackPlayerListeners.push(() => errorListener.remove());
}

async function playWithTrackPlayer(url: string, station: RadioStation): Promise<void> {
  if (!TrackPlayer) return;
  console.log('[RadioPlayer] playWithTrackPlayer:', url);
  
  await setupTrackPlayerRadioListeners();
  
  // Reset queue and add radio station
  await TrackPlayer.reset();
  
  // Determine track type for HLS streams
  const isHLS = url.includes('.m3u8') || url.includes('m3u8');
  
  await TrackPlayer.add({
    id: `radio-${station.id}`,
    url: url,
    title: station.name,
    artist: station.nameTranslations?.en || 'إذاعة',
    album: 'إذاعات القرآن الكريم',
    artwork: require('../assets/images/icons/icon.png'),
    isLiveStream: true,
    ...(isHLS && TrackType ? { type: TrackType.HLS } : {}),
  });
  
  await TrackPlayer.play();
  console.log('[RadioPlayer] TrackPlayer started radio stream');
}

async function stopTrackPlayer(): Promise<void> {
  if (!TrackPlayer) return;
  try {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
  } catch {}
}

async function toggleTrackPlayer(): Promise<void> {
  if (!TrackPlayer || !State) return;
  try {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === State.Playing) {
      await TrackPlayer.pause();
      updateState({ status: 'paused' });
    } else {
      await TrackPlayer.play();
      updateState({ status: 'playing' });
    }
  } catch {}
}

async function setTrackPlayerVolume(volume: number): Promise<void> {
  if (!TrackPlayer) return;
  try {
    await TrackPlayer.setVolume(volume);
  } catch {}
}

// ==================== expo-av Audio Player (web fallback) ====================

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
    if (!res.ok) {
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
    setTimeout(() => {
      reject(new Error('Stream connection timed out'));
      // Clean up orphaned sound if createAsync resolves after timeout
      createPromise.then(result => {
        if (result?.sound && result.sound !== _expoAvSound) {
          try { result.sound.unloadAsync(); } catch {}
        }
      }).catch(() => {});
    }, 15_000)
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

// Track which engine is actively playing so stop/toggle go to the right one
let _activeEngine: 'trackplayer' | 'expoav' | null = null;

// Auto-retry config for stream failures
let _retryCount = 0;
const MAX_AUTO_RETRIES = 2;
let _retryTimer: ReturnType<typeof setTimeout> | null = null;
let _playLock = false;

const listeners = new Set<RadioPlayerListener>();

// Listening time tracking for radio
let _radioListeningTimer: ReturnType<typeof setInterval> | null = null;
let _radioListeningAccumulator = 0;

function startRadioListeningTimer() {
  if (_radioListeningTimer) return;
  _radioListeningTimer = setInterval(() => {
    _radioListeningAccumulator += 5;
    if (_radioListeningAccumulator >= 30) {
      addListeningTime(_radioListeningAccumulator);
      _radioListeningAccumulator = 0;
    }
  }, 5000);
}

function stopRadioListeningTimer() {
  if (_radioListeningTimer) {
    clearInterval(_radioListeningTimer);
    _radioListeningTimer = null;
  }
  if (_radioListeningAccumulator > 0) {
    addListeningTime(_radioListeningAccumulator);
    _radioListeningAccumulator = 0;
  }
}

function notifyListeners() {
  for (const listener of listeners) {
    listener({ ...currentState });
  }
}

function updateState(partial: Partial<RadioPlaybackState>) {
  const wasPlaying = currentState.status === 'playing';
  currentState = { ...currentState, ...partial };
  const nowPlaying = currentState.status === 'playing';

  // Track radio listening time
  if (!wasPlaying && nowPlaying) {
    startRadioListeningTimer();
  } else if (wasPlaying && !nowPlaying) {
    stopRadioListeningTimer();
  }

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
   * Play a radio station using TrackPlayer (native) or expo-av (web)
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
      
      if (shouldUseTrackPlayer()) {
        await playWithTrackPlayer(resolvedUrl, station);
        _activeEngine = 'trackplayer';
      } else {
        await playWithExpoAv(resolvedUrl);
        _activeEngine = 'expoav';
      }
    } catch (error) {
      console.error('[RadioPlayer] playback error:', error);

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
      
      if (shouldUseTrackPlayer()) {
        await playWithTrackPlayer(resolvedUrl, station);
        _activeEngine = 'trackplayer';
      } else {
        await playWithExpoAv(resolvedUrl);
        _activeEngine = 'expoav';
      }
    } catch {
      updateState({ status: 'error', errorMessage: 'Failed to play stream' });
    }
  },

  /** Toggle play/pause */
  async togglePlayPause(): Promise<void> {
    if (Platform.OS === 'web') return;

    if (_activeEngine === 'trackplayer') {
      await toggleTrackPlayer();
    } else {
      await toggleExpoAv();
    }
  },

  /** Stop playback and clear */
  async stop(): Promise<void> {
    if (Platform.OS === 'web') return;

    // Stop whichever engine is active (or both to be safe)
    if (_activeEngine === 'trackplayer') {
      await stopTrackPlayer();
    } else if (_activeEngine === 'expoav') {
      await stopExpoAv();
    } else {
      // Unknown state — stop both
      await stopTrackPlayer();
      await stopExpoAv();
    }

    _activeEngine = null;
    updateState({ status: 'idle', currentStation: null, errorMessage: undefined });
    audioCoordinator.releaseFocus('radio-player', 'radio');
  },

  /** Set volume (0 to 1) */
  async setVolume(volume: number): Promise<void> {
    if (Platform.OS === 'web') return;
    const clamped = Math.max(0, Math.min(1, volume));

    if (_activeEngine === 'trackplayer') {
      await setTrackPlayerVolume(clamped);
    } else {
      await setExpoAvVolume(clamped);
    }

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


