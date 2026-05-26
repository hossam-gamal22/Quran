// lib/audio-player.ts
import { Platform, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Audio } from 'expo-av';
import {
  getAyahAudioUrl,
  saveLastPlayback,
  getLastPlayback,
  getCachedSurah,
  ReciterUnavailableError,
} from './quran-cache';
import { RECITERS_BY_ID, DEFAULT_RECITER_ID } from './reciters-registry';
import { audioCoordinator } from './audio-coordinator';
import { addListeningTime } from './listening-tracker';
import { fetchWithTimeout } from './fetch-with-timeout';
import { isTrackPlayerSetupDone } from './track-player-ready';
import { getCachedAyahUri, prefetchAyahAudio } from './ayah-audio-cache';
import { uiText } from '@/lib/ui-text';

// Throttle the offline alert to at most once per 30s so repeat taps don't spam.
let _lastOfflineAlertAt = 0;
export async function notifyOfflineAudio() {
  const now = Date.now();
  if (now - _lastOfflineAlertAt < 30_000) return;
  _lastOfflineAlertAt = now;

  // Check premium so we surface the right CTA (download vs subscribe).
  let isPremium = false;
  try {
    const { getSubscriptionState } = await import('./subscription-manager');
    const state = await getSubscriptionState();
    isPremium = !!state?.isPremium;
  } catch {}

  if (isPremium) {
    Alert.alert(
      uiText({ ar: 'لا يوجد اتصال بالإنترنت', en: 'No internet connection' }),
      uiText({
        ar: 'تشغيل التلاوة يحتاج إلى اتصال بالإنترنت. يمكنك تحميل السورة من زر التحميل للاستماع بدون نت.',
        en: 'Playing recitation needs an internet connection. You can download the surah to listen offline.',
      }),
      [{ text: uiText({ ar: 'حسناً', en: 'OK' }) }],
    );
    return;
  }

  // Free user: route to subscription page so they understand offline = premium.
  try {
    const { router } = await import('expo-router');
    Alert.alert(
      uiText({ ar: 'لا يوجد اتصال بالإنترنت', en: 'No internet connection' }),
      uiText({
        ar: 'الاستماع بدون إنترنت متاح في النسخة المميزة، حيث يمكنك تحميل السور والاستماع إليها في أي وقت.',
        en: 'Offline listening is available with Premium. You can download surahs and listen anytime.',
      }),
      [
        { text: uiText({ ar: 'حسناً', en: 'OK' }), style: 'cancel' },
        { text: uiText({ ar: 'اشترك الآن', en: 'Subscribe now' }), onPress: () => { try { router.push('/subscription'); } catch {} } },
      ],
    );
  } catch {
    Alert.alert(
      uiText({ ar: 'لا يوجد اتصال بالإنترنت', en: 'No internet connection' }),
      uiText({
        ar: 'الاستماع بدون إنترنت متاح في النسخة المميزة.',
        en: 'Offline listening is available with Premium.',
      }),
      [{ text: uiText({ ar: 'حسناً', en: 'OK' }) }],
    );
  }
}

// TrackPlayer is used for native platforms (iOS/Android) for lock screen controls
// expo-av is used as fallback for web platform and Expo Go

// Dynamic import of TrackPlayer - may not be available in Expo Go
let TrackPlayer: typeof import('react-native-track-player').default | null = null;
let Event: typeof import('react-native-track-player').Event | null = null;
let State: typeof import('react-native-track-player').State | null = null;
let trackPlayerAvailable = false;

// Try to load TrackPlayer (will fail in Expo Go)
try {
  if (Platform.OS !== 'web') {
    const TP = require('react-native-track-player');
    TrackPlayer = TP.default;
    Event = TP.Event;
    State = TP.State;
    // Check if native module is actually available
    trackPlayerAvailable = !!TrackPlayer?.getPlaybackState;
    console.log('[AudioPlayer] TrackPlayer available:', trackPlayerAvailable);
  }
} catch (e) {
  console.log('[AudioPlayer] TrackPlayer not available, using expo-av fallback');
  trackPlayerAvailable = false;
}

// Re-export TrackPlayer hooks for components to use (only if available)
export const usePlaybackState = trackPlayerAvailable
  ? require('react-native-track-player').usePlaybackState
  : () => ({ state: null });
export const useProgress = trackPlayerAvailable
  ? require('react-native-track-player').useProgress
  : () => ({ position: 0, duration: 0, buffered: 0 });

export interface PlaybackError {
  type: 'reciter_unavailable' | 'network' | 'unknown';
  reciterId: string;
  message: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  isLoading: boolean;
  currentSurah: number;
  currentAyah: number;
  reciterIdentifier: string;
  duration: number;
  position: number;
  playingFullSurah?: boolean;
  /** Latest playback error — cleared when a new ayah starts playing successfully. */
  error?: PlaybackError | null;
  /**
   * Timestamp (ms) bumped each time the active playback range refused a
   * prev/next request. Screens that pin a range (citation passage view)
   * watch this value to surface a soft "use the Mushaf for full browsing"
   * toast — undefined when no block has ever happened in this session.
   */
  playbackRangeBlockedAt?: number;
}

type PlaybackCallback = (state: PlaybackState) => void;

class AudioPlayerManager {
  // expo-av sound for web fallback
  private sound: Audio.Sound | null = null;
  // TrackPlayer state tracking
  private trackPlayerListeners: (() => void)[] = [];
  private useTrackPlayer: boolean = trackPlayerAvailable;
  
  private state: PlaybackState = {
    isPlaying: false,
    isLoading: false,
    currentSurah: 0,
    currentAyah: 0,
    reciterIdentifier: DEFAULT_RECITER_ID,
    duration: 0,
    position: 0,
    playingFullSurah: false,
    error: null,
  };
  private listeners: Set<PlaybackCallback> = new Set();
  private continuousPlay: boolean = true;
  private surahAyahsCount: number = 0;
  private playingFullSurah: boolean = false;
  private loadingId: number = 0;
  private surahOffsets: Map<string, number[]> = new Map();
  private offsetPoller: number | null = null;
  private isTransitioning: boolean = false;
  private progressPoller: number | null = null;
  private listenersSetup: boolean = false;
  private listeningTimer: ReturnType<typeof setInterval> | null = null;
  private listeningAccumulator: number = 0; // seconds accumulated since last save
  // Optional confinement. When set, playPrev/playNext (and the continuous
  // auto-advance) refuse to step outside this surah+ayah window. The
  // citation passage page (app/quran-passage.tsx) sets this on mount and
  // clears it on unmount so listening stays inside the cited verses.
  private playbackRange: { surah: number; start: number; end: number } | null = null;

  constructor() {
    this.initAudio();
  }

  private async initAudio() {
    if (this.useTrackPlayer) {
      // TrackPlayer setup is handled externally in _layout.tsx
      // Here we just set up the event listeners
      this.setupTrackPlayerListeners();
      console.log('[audio-player] ✅ Using TrackPlayer for Quran playback (lock screen controls enabled)');
    } else {
      // Web fallback - configure expo-av
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      console.log('[audio-player] ✅ Using expo-av for Quran playback (web)');
    }
  }

  private setupTrackPlayerListeners() {
    if (!TrackPlayer || !Event || !State) {
      console.log('[audio-player] setupTrackPlayerListeners: deferred — TP=', !!TrackPlayer, 'Event=', !!Event, 'State=', !!State);
      return;
    }
    // Guard against duplicate listener setup (e.g. hot reload)
    if (this.listenersSetup) return;
    this.listenersSetup = true;
    console.log('[audio-player] setupTrackPlayerListeners: OK — registering listeners');
    
    // Listen for playback state changes from TrackPlayer
    const playbackStateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      async (event) => {
        if (!State) return;
        // Only process TrackPlayer events when Quran is the active source.
        // Radio and Azkar also use the same TrackPlayer instance — without
        // this guard, their Loading/Buffering events would update Quran state,
        // causing GlobalAudioContext to think Quran started and stop the radio.
        const currentSource = audioCoordinator.getCurrentSource();
        if (currentSource !== null && currentSource !== 'quran') return;

        const isPlaying = event.state === State.Playing;
        const isLoading = event.state === State.Loading || event.state === State.Buffering;

        this.updateState({
          isPlaying,
          isLoading,
        });
      }
    );
    this.trackPlayerListeners.push(() => playbackStateListener.remove());

    // Listen for track end to auto-play next
    const queueEndListener = TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      async () => {
        // Ignore queue-end events when another source (radio/azkar) owns TrackPlayer
        const currentSource = audioCoordinator.getCurrentSource();
        if (currentSource !== null && currentSource !== 'quran') return;

        if (this.continuousPlay && !this.isTransitioning) {
          if (this.playingFullSurah) {
            // Whole-surah file ended — advance to next surah, not next ayah
            // of the same surah (that would re-load + replay the same file).
            const { currentSurah, reciterIdentifier } = this.state;
            if (currentSurah < 114) {
              await this.playAyah(currentSurah + 1, 1, reciterIdentifier, true, true, true);
            } else {
              await this.stop();
            }
          } else {
            await this.playNextAyah(true);
          }
        }
      }
    );
    this.trackPlayerListeners.push(() => queueEndListener.remove());

    // Native progress event — fires on the player thread at the cadence set
    // via TrackPlayer.updateOptions({ progressUpdateEventInterval }). This is
    // independent of the JS setInterval poller so the per-ayah highlight stays
    // accurate even when the JS thread is busy rendering pages.
    if ((Event as any).PlaybackProgressUpdated) {
      const progressListener = TrackPlayer.addEventListener(
        (Event as any).PlaybackProgressUpdated,
        (data: any) => {
          const currentSource = audioCoordinator.getCurrentSource();
          if (currentSource !== null && currentSource !== 'quran') return;
          if (!this.playingFullSurah || this.state.currentSurah <= 0) return;
          const key = `${this.state.reciterIdentifier}:${this.state.currentSurah}`;
          const offsets = this.surahOffsets.get(key);
          if (!offsets || offsets.length === 0) return;
          const posMs = (data?.position || 0) * 1000;
          let lo = 0, hi = offsets.length - 1, idx = 0;
          while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (offsets[mid] <= posMs) { idx = mid; lo = mid + 1; }
            else hi = mid - 1;
          }
          const ayahIndex = idx + 1;
          if (this.state.currentAyah !== ayahIndex) {
            console.log('[audio-player] PROGRESS evt advancing ayah', this.state.currentAyah, '→', ayahIndex, 'pos=', Math.round(posMs), 'ms');
            this.updateState({ currentAyah: ayahIndex, position: posMs });
          } else {
            this.updateState({ position: posMs });
          }
        }
      );
      this.trackPlayerListeners.push(() => progressListener.remove());
      console.log('[audio-player] PlaybackProgressUpdated listener registered');
    } else {
      console.warn('[audio-player] Event.PlaybackProgressUpdated NOT available — falling back to setInterval poller only');
    }

    // Start progress poller for TrackPlayer (since useProgress hook is for components only)
    this.startProgressPoller();
  }

  private startProgressPoller() {
    if (this.progressPoller || !TrackPlayer || !State) return;
    console.log('[audio-player] startProgressPoller: STARTED');

    this.progressPoller = setInterval(async () => {
      if (!this.useTrackPlayer || !TrackPlayer || !State) return;
      // Only poll progress when Quran owns TrackPlayer
      const currentSource = audioCoordinator.getCurrentSource();
      if (currentSource !== null && currentSource !== 'quran') return;
      try {
        const progress = await TrackPlayer.getProgress();
        const position = progress.position;
        const duration = progress.duration;
        const state = await TrackPlayer.getPlaybackState();

        if (state.state !== State.Stopped && state.state !== State.None) {
          const updates: Partial<PlaybackState> = {
            position: position * 1000, // Convert to ms
            duration: duration * 1000, // Convert to ms
          };

          // While playing a full surah on TrackPlayer, derive currentAyah from
          // the audio position using cached per-ayah offsets. Without this,
          // the sticky player text, the page highlight and the auto page-turn
          // effect all stay frozen on the first ayah.
          if (this.playingFullSurah && this.state.currentSurah > 0) {
            const key = `${this.state.reciterIdentifier}:${this.state.currentSurah}`;
            const offsets = this.surahOffsets.get(key);
            // Heartbeat log every ~5s so we can confirm the poller is alive
            if (Math.random() < 0.02) {
              console.log('[audio-player] poller TICK pos=', Math.round(position * 1000), 'ms key=', key, 'offsets=', offsets?.length ?? 'NONE', 'currentAyah=', this.state.currentAyah);
            }
            if (offsets && offsets.length > 0) {
              const posMs = position * 1000;
              let lo = 0, hi = offsets.length - 1, idx = 0;
              while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                if (offsets[mid] <= posMs) {
                  idx = mid;
                  lo = mid + 1;
                } else {
                  hi = mid - 1;
                }
              }
              const ayahIndex = idx + 1;
              if (this.state.currentAyah !== ayahIndex) {
                console.log('[audio-player] poller advancing ayah', this.state.currentAyah, '→', ayahIndex, 'pos=', Math.round(posMs), 'ms');
                updates.currentAyah = ayahIndex;
              }
            } else {
              // Helpful diagnostic — fires once per 500ms while offsets missing
              if (Math.random() < 0.05) {
                console.log('[audio-player] poller has no offsets for', key, 'cache size=', this.surahOffsets.size);
              }
            }
          }

          this.updateState(updates);
        }
      } catch {
        // Ignore errors when player is not ready
      }
    }, 500) as unknown as number;
  }

  private canUseTrackPlayer(): boolean {
    return !!(this.useTrackPlayer && TrackPlayer && isTrackPlayerSetupDone());
  }

  subscribe(callback: PlaybackCallback): () => void {
    this.listeners.add(callback);
    callback(this.state);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.state));
  }

  private updateState(updates: Partial<PlaybackState>) {
    const wasPlaying = this.state.isPlaying;
    this.state = { ...this.state, ...updates };
    const nowPlaying = this.state.isPlaying;

    // Track listening time
    if (!wasPlaying && nowPlaying) {
      this.startListeningTimer();
    } else if (wasPlaying && !nowPlaying) {
      this.stopListeningTimer();
    }

    this.notifyListeners();
  }

  private startListeningTimer() {
    if (this.listeningTimer) return;
    this.listeningTimer = setInterval(() => {
      this.listeningAccumulator += 5;
      if (this.listeningAccumulator >= 30) {
        addListeningTime(this.listeningAccumulator);
        this.listeningAccumulator = 0;
      }
    }, 5000);
  }

  private stopListeningTimer() {
    if (this.listeningTimer) {
      clearInterval(this.listeningTimer);
      this.listeningTimer = null;
    }
    if (this.listeningAccumulator > 0) {
      addListeningTime(this.listeningAccumulator);
      this.listeningAccumulator = 0;
    }
  }

  async playAyah(
    surahNumber: number,
    ayahNumber: number,
    reciterIdentifier: string,
    continuous: boolean = false,
    suppressLoading: boolean = false,
    playFullSurah: boolean = continuous,
  ): Promise<void> {
    let resolvedAudioUrl: string | undefined;

    try {
      if (!suppressLoading) this.updateState({ isLoading: true, error: null });
      else this.updateState({ error: null });
      this.continuousPlay = continuous;
      const myLoadId = ++this.loadingId;

      // Request audio focus — this will stop any other audio source
      await audioCoordinator.requestFocus('quran', {
        stop: () => this.stop(),
        pause: () => this.togglePlayPause(),
      }, 'quran-player');

      // get surah info
      const surah = await getCachedSurah(surahNumber);
      this.surahAyahsCount = surah?.numberOfAyahs || 0;

      // stop current sound FIRST — stop() resets playingFullSurah to false,
      // so we must set it again afterwards.
      // Use skipReleaseFocus=true to keep the coordinator focus we just acquired
      this.isTransitioning = true;
      await this.stop(true);
      // Abort if a newer playAyah call was made while we were loading
      if (myLoadId !== this.loadingId) return;
      this.playingFullSurah = !!playFullSurah;
      this.updateState({
        isLoading: !suppressLoading,
        isPlaying: false,
        currentSurah: surahNumber,
        currentAyah: ayahNumber,
        reciterIdentifier,
        playingFullSurah: this.playingFullSurah,
        error: null,
      });

      let audioUrl: string;
      try {
        if (this.playingFullSurah) {
          const { getSurahAudioUrl } = await import('./quran-cache');
          // Check for locally downloaded file first
          let localUri: string | null = null;
          try {
            const { getLocalUri } = await import('./audio-download-manager');
            localUri = await getLocalUri(surahNumber, reciterIdentifier);
          } catch {}

          if (localUri) {
            audioUrl = localUri;
            console.log('[audio-player] using offline file:', audioUrl);
            // Still fetch timestamps (best-effort) so per-ayah tracking works
            // when playing the locally downloaded surah file.
            try {
              await this.fetchSurahTimestamps(reciterIdentifier, surahNumber);
            } catch (e) {
              console.warn('[audio-player] Offline timestamps fetch failed (non-fatal):', e);
            }
          } else {
            try {
              const { offsets, audioUrl: cdnUrl } = await this.fetchSurahTimestamps(reciterIdentifier, surahNumber);
              audioUrl = cdnUrl || getSurahAudioUrl(reciterIdentifier, surahNumber);
              console.log('[audio-player] full surah', reciterIdentifier, surahNumber, 'offsets:', offsets.length, 'url=', audioUrl);
            } catch (e) {
              if (e instanceof ReciterUnavailableError) throw e;
              console.warn('[audio-player] Failed to fetch surah timestamps, falling back:', e);
              audioUrl = getSurahAudioUrl(reciterIdentifier, surahNumber);
            }
          }
        } else {
          // compute global ayah number for single-ayah files
          let globalAyahNumber = ayahNumber;
          if (surah) {
            const surahs = await import('./quran-cache').then(m => m.fetchAndCacheSurahsList());
            let totalAyahs = 0;
            for (const s of surahs) {
              if (s.number < surahNumber) totalAyahs += s.numberOfAyahs;
            }
            globalAyahNumber = totalAyahs + ayahNumber;
          }
          const remoteUrl = getAyahAudioUrl(reciterIdentifier, globalAyahNumber, surahNumber, ayahNumber);
          // Prefer the locally cached file when we have it — eliminates the
          // per-ayah CDN round-trip that causes audible buffering between verses.
          let cachedUri = await getCachedAyahUri(remoteUrl);
          if (!cachedUri) {
            // No file on disk yet. Race a fast prefetch against a 900ms timeout:
            // for a tiny per-ayah mp3 on a decent network the file typically
            // lands inside that window, and starting from a local file:// makes
            // playback truly instant (no expo-av streaming buffer wait). If the
            // prefetch loses the race we fall back to streaming — same behavior
            // as before, no worse.
            const winner = await Promise.race([
              prefetchAyahAudio(remoteUrl).then((p) => (p ? 'cached' : 'failed')),
              new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 900)),
            ]);
            if (winner === 'cached') {
              cachedUri = await getCachedAyahUri(remoteUrl);
            }
          }
          audioUrl = cachedUri ?? remoteUrl;
        }
      } catch (e) {
        if (e instanceof ReciterUnavailableError) {
          console.warn('[audio-player] Reciter unavailable:', reciterIdentifier, e.message);
          this.isTransitioning = false;
          this.updateState({
            isLoading: false,
            isPlaying: false,
            error: {
              type: 'reciter_unavailable',
              reciterId: reciterIdentifier,
              message: e.message,
            },
          });
          try { audioCoordinator.releaseFocus('quran-player', 'quran'); } catch {}
          // User-facing alert so the failure isn't silent.
          try {
            Alert.alert(
              uiText({ ar: 'تعذّر تشغيل التلاوة', en: 'Could not play recitation' }),
              uiText({
                ar: `هذا القارئ غير متاح حالياً (${this.getReciterName(reciterIdentifier)}). الرجاء اختيار قارئ آخر.`,
                en: `This reciter is currently unavailable (${this.getReciterName(reciterIdentifier)}). Please choose another reciter.`,
              }),
              [{ text: uiText({ ar: 'حسناً', en: 'OK' }) }],
            );
          } catch {}
          return;
        }
        throw e;
      }

      resolvedAudioUrl = audioUrl;
      console.log('[audio-player] creating sound url=', audioUrl, 'playingFullSurah=', this.playingFullSurah);

      // Abort if a newer playAyah call was made while resolving URL
      if (myLoadId !== this.loadingId) return;

      // Offline guard: if URL is remote (CDN) and device is offline, alert and bail
      // gracefully instead of leaving the user staring at an infinite spinner.
      const isRemote = !/^(file:|asset:|content:)/i.test(audioUrl);
      if (isRemote) {
        const net = await NetInfo.fetch().catch(() => null);
        const offline = !!net && net.isConnected === false;
        if (offline) {
          console.warn('[audio-player] Offline + remote URL — aborting playback');
          notifyOfflineAudio();
          this.isTransitioning = false;
          this.updateState({ isLoading: false, isPlaying: false });
          try { audioCoordinator.releaseFocus('quran-player', 'quran'); } catch {}
          return;
        }
      }

      // If full surah mode and starting from a specific ayah, don't auto-play — seek first
      const needsSeek = this.playingFullSurah && ayahNumber > 1;

      this.isTransitioning = false;

      // Get surah name for notification
      const surahName = surah?.englishName || `Surah ${surahNumber}`;
      const reciterName = this.getReciterName(reciterIdentifier);

      if (this.canUseTrackPlayer() && this.playingFullSurah) {
        // Use TrackPlayer for native platforms (with lock screen controls)
        try {
          if (!TrackPlayer) throw new Error('TrackPlayer unavailable');
          await TrackPlayer.reset();
          await TrackPlayer.add({
            id: `quran-${surahNumber}-${ayahNumber}`,
            url: audioUrl,
            title: this.playingFullSurah
              ? `${surah?.name || `سورة ${surahNumber}`}`
              : `${surah?.name || `سورة ${surahNumber}`} - آية ${ayahNumber}`,
            artist: reciterName,
            album: 'القرآن الكريم',
            artwork: require('../assets/images/icons/icon.png'),
          });
          
          if (needsSeek) {
            // Seek to specific ayah position before playing
            const key = `${reciterIdentifier}:${surahNumber}`;
            const offsets = this.surahOffsets.get(key);
            if (offsets && offsets.length >= ayahNumber) {
              const seekPosition = offsets[ayahNumber - 1] / 1000; // Convert ms to seconds
              await TrackPlayer.seekTo(seekPosition);
              console.log('[audio-player] TrackPlayer seeked to ayah', ayahNumber, 'at', seekPosition, 's');
            }
          }
          
          await TrackPlayer.play();
        } catch (tpError) {
          console.warn('[audio-player] TrackPlayer error, falling back to expo-av:', tpError);
          // Fallback to expo-av if TrackPlayer fails
          await this.playWithExpoAv(audioUrl, needsSeek, reciterIdentifier, surahNumber);
        }
      } else {
        // Per-ayah Mushaf playback always uses expo-av directly.
        await this.playWithExpoAv(audioUrl, needsSeek, reciterIdentifier, surahNumber);
      }

      this.updateState({
        isPlaying: true,
        isLoading: false,
        currentSurah: surahNumber,
        currentAyah: ayahNumber,
        reciterIdentifier,
        playingFullSurah: this.playingFullSurah,
      });

      await saveLastPlayback({ surahNumber, ayahNumber, reciterIdentifier });

      if (!this.playingFullSurah) {
        // Per-ayah mode: warm the cache with the next ayah while the current
        // one plays, so the transition is instant (no CDN round-trip).
        this.prefetchNextAyah(surahNumber, ayahNumber, reciterIdentifier, surah?.numberOfAyahs);
      }

      if (this.playingFullSurah) {
        // Lazy-init the listeners (and the progress poller) the first time we
        // actually play a surah. This works around the race where the module
        // loaded before react-native-track-player exposed Event/State, which
        // would otherwise leave the per-ayah tracker permanently disabled.
        if (this.canUseTrackPlayer() && !this.listenersSetup) {
          this.setupTrackPlayerListeners();
        }
        // Tighten TrackPlayer's native progress event cadence to ~250ms so
        // the per-ayah lookup advances close to real time.
        if (this.canUseTrackPlayer() && TrackPlayer?.updateOptions) {
          try {
            await TrackPlayer.updateOptions({ progressUpdateEventInterval: 0.25 });
          } catch {}
        }
        // Only run the expo-av-only offset poller on the web/expo-av path.
        // On TrackPlayer the per-ayah lookup is performed inside the unified
        // progress poller (see startProgressPoller) using the same offsets cache.
        if (!this.canUseTrackPlayer()) {
          this.startOffsetPoller(reciterIdentifier, surahNumber);
        } else {
          // Make absolutely sure the poller is running on TrackPlayer too.
          this.startProgressPoller();
        }
        // For expo-av, handle seek after playback starts
        if (!this.canUseTrackPlayer() && ayahNumber > 1) {
          const key = `${reciterIdentifier}:${surahNumber}`;
          const offsets = this.surahOffsets.get(key);
          if (offsets && offsets.length >= ayahNumber) {
            const seekPosition = offsets[ayahNumber - 1];
            if (seekPosition > 0 && this.sound) {
              await this.sound.setPositionAsync(seekPosition);
              console.log('[audio-player] expo-av seeked to ayah', ayahNumber, 'at', seekPosition, 'ms');
              await this.sound.playAsync();
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('[audio-player] playAyah failed', {
        surahNumber,
        ayahNumber,
        reciterIdentifier,
        audioUrl: resolvedAudioUrl,
        playingFullSurah: playFullSurah,
        errorMessage,
        error,
      });
      this.isTransitioning = false;
      this.updateState({
        isLoading: false,
        isPlaying: false,
        error: {
          type: 'unknown',
          reciterId: this.state.reciterIdentifier,
          message: errorMessage,
        },
      });
      try {
        Alert.alert(
          uiText({ ar: 'تعذّر تشغيل التلاوة', en: 'Could not play recitation' }),
          uiText({
            ar: 'حدث خطأ أثناء تشغيل الصوت. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.',
            en: 'An error occurred while starting audio. Check your connection and try again.',
          }),
          [{ text: uiText({ ar: 'حسناً', en: 'OK' }) }],
        );
      } catch {}
    }
  }

  private getReciterName(reciterIdentifier: string): string {
    return RECITERS_BY_ID[reciterIdentifier]?.nameAr || 'القارئ';
  }

  /**
   * Public: warm the per-ayah cache for an upcoming ayah (e.g. when the user
   * opens a Mushaf page, prefetch its first ayah so tapping play is instant).
   * Fire-and-forget; failure here just means a slightly slower first play.
   */
  prefetchAyah(surahNumber: number, ayahInSurah: number, reciterIdentifier: string): void {
    (async () => {
      try {
        const surahs = await import('./quran-cache').then(m => m.fetchAndCacheSurahsList());
        let totalAyahs = 0;
        for (const s of surahs) {
          if (s.number < surahNumber) totalAyahs += s.numberOfAyahs;
        }
        const globalAyahNumber = totalAyahs + ayahInSurah;
        const url = getAyahAudioUrl(reciterIdentifier, globalAyahNumber, surahNumber, ayahInSurah);
        await prefetchAyahAudio(url);
      } catch {
        // best-effort
      }
    })();
  }

  // Fire-and-forget: warm the per-ayah cache with the NEXT ayah while the
  // current one plays. Resolves the next URL (handling surah boundaries) and
  // hands it to the cache layer, which coalesces concurrent calls and skips
  // already-cached files. Errors are swallowed by design — failure here just
  // means the next ayah streams instead of starting from disk.
  private prefetchNextAyah(
    currentSurah: number,
    currentAyah: number,
    reciterIdentifier: string,
    surahAyahsCount: number | undefined,
  ): void {
    (async () => {
      try {
        const ayahCount = surahAyahsCount ?? this.surahAyahsCount;
        let nextSurah = currentSurah;
        let nextAyah = currentAyah + 1;
        if (ayahCount > 0 && currentAyah >= ayahCount) {
          if (currentSurah >= 114) return; // end of Quran
          nextSurah = currentSurah + 1;
          nextAyah = 1;
        }

        const surahs = await import('./quran-cache').then(m => m.fetchAndCacheSurahsList());
        let totalAyahs = 0;
        for (const s of surahs) {
          if (s.number < nextSurah) totalAyahs += s.numberOfAyahs;
        }
        const globalAyahNumber = totalAyahs + nextAyah;
        const url = getAyahAudioUrl(reciterIdentifier, globalAyahNumber, nextSurah, nextAyah);
        await prefetchAyahAudio(url);
      } catch {
        // best-effort; ignore
      }
    })();
  }

  // Helper method for expo-av playback. Per-ayah Mushaf playback reaches this
  // path directly; full-surah playback only uses it when TrackPlayer is not used.
  private async playWithExpoAv(
    audioUrl: string,
    needsSeek: boolean,
    reciterIdentifier = this.state.reciterIdentifier,
    surahNumber = this.state.currentSurah,
  ): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (modeError) {
      console.warn('[audio-player] Audio.setAudioModeAsync failed before playback:', modeError);
    }

    // Unload previous sound before creating new one to prevent resource leak
    if (this.sound) {
      try { await this.sound.unloadAsync(); } catch {}
      this.sound = null;
    }

    let sound: Audio.Sound;
    if (this.playingFullSurah) {
      const { getSurahAudioUrls } = await import('./quran-cache');
      const candidateUrls = [audioUrl, ...getSurahAudioUrls(reciterIdentifier, surahNumber).filter(u => u !== audioUrl)];
      sound = await this.createExpoAvSoundSequential(candidateUrls, needsSeek);
    } else {
      sound = await this.createExpoAvSound(audioUrl, needsSeek);
    }

    this.sound = sound;
    // Tighten status update cadence so per-ayah tracking advances within ~100ms
    // of the audio crossing each ayah boundary (default is 250-500ms).
    try { await sound.setProgressUpdateIntervalAsync(100); } catch {}
  }

  private async createExpoAvSoundSequential(
    candidateUrls: string[],
    needsSeek: boolean,
  ): Promise<Audio.Sound> {
    let lastError: unknown = null;
    for (const candidateUrl of candidateUrls) {
      try {
        return await this.createExpoAvSound(candidateUrl, needsSeek);
      } catch (urlError) {
        lastError = urlError;
        console.warn('[audio-player] URL failed, trying next candidate if available:', candidateUrl, urlError);
      }
    }
    throw lastError || new Error('No playable audio URL');
  }

  private createExpoAvSound(audioUrl: string, needsSeek: boolean): Promise<Audio.Sound> {
    let settled = false;

    return new Promise((resolve, reject) => {
      Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: !needsSeek },
        this.onPlaybackStatusUpdate.bind(this),
      ).then(({ sound }) => {
        if (settled) {
          sound.unloadAsync().catch(() => {});
          return;
        }
        settled = true;
        resolve(sound);
      }).catch((error) => {
        if (settled) return;
        settled = true;
        reject(error);
      });
    });
  }

  private async onPlaybackStatusUpdate(status: any) {
    if (status.isLoaded) {
      const updates: Partial<PlaybackState> = {
        duration: status.durationMillis || 0,
        position: status.positionMillis || 0,
        isPlaying: status.isPlaying,
        playingFullSurah: this.playingFullSurah,
      };

      // Per-ayah tracking from the audio position using cached offsets.
      // Doing this inside the status callback (which expo-av invokes ~10x/sec)
      // is far more reliable than a separate setInterval poller. It drives
      // the sticky player text, the on-page highlight, and the auto page-turn.
      if (this.playingFullSurah && this.state.currentSurah > 0) {
        const key = `${this.state.reciterIdentifier}:${this.state.currentSurah}`;
        const offsets = this.surahOffsets.get(key);
        if (offsets && offsets.length > 0) {
          const pos = status.positionMillis || 0;
          let lo = 0, hi = offsets.length - 1, idx = 0;
          while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (offsets[mid] <= pos) { idx = mid; lo = mid + 1; }
            else hi = mid - 1;
          }
          const ayahIndex = idx + 1;
          if (this.state.currentAyah !== ayahIndex) {
            updates.currentAyah = ayahIndex;
          }
        }
      }

      this.updateState(updates);

      if (status.didJustFinish) {
        if (this.continuousPlay) {
          if (this.playingFullSurah) {
            // Whole-surah MP3 just ended — advance to the FIRST ayah of the
            // NEXT surah. Calling playNextAyah() here would re-load the same
            // surah file and seek to the next ayah offset, which causes the
            // surah to replay from that point endlessly.
            const { currentSurah, reciterIdentifier } = this.state;
            if (currentSurah < 114) {
              await this.playAyah(currentSurah + 1, 1, reciterIdentifier, true, true, true);
            } else {
              await this.stop();
            }
          } else {
            await this.playNextAyah(true);
          }
        }
      }
    }
  }

  async togglePlayPause(): Promise<void> {
    if (this.playingFullSurah && !this.sound && this.canUseTrackPlayer() && TrackPlayer && State) {
      const state = await TrackPlayer.getPlaybackState();
      if (state.state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } else {
      // expo-av fallback
      if (!this.sound) return;
      if (this.state.isPlaying) {
        await this.sound.pauseAsync();
      } else {
        await this.sound.playAsync();
      }
    }
  }

  async stop(skipReleaseFocus = false): Promise<void> {
    // Always tear down TrackPlayer when we're on a platform that uses it,
    // regardless of playingFullSurah. The original guard
    // `playingFullSurah && !this.sound` left per-ayah TrackPlayer streams
    // playing through stop(), which then collided with the next playAyah()
    // — audible as two ayat playing at once after a deep-link redirect or
    // a manual prev/next that crossed a citation boundary.
    if (this.canUseTrackPlayer() && TrackPlayer) {
      try {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      } catch {}
    }

    // Also stop expo-av sound if exists (web / fallback).
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch {}
      this.sound = null;
    }
    
    this.playingFullSurah = false;
    this.stopOffsetPoller();
    this.stopProgressPoller();
    this.updateState({
      isPlaying: false,
      isLoading: false,
      duration: 0,
      position: 0,
      currentSurah: 0,
      currentAyah: 0,
      playingFullSurah: false,
    });
    
    // Release audio focus (skip when called internally during playAyah transition)
    if (!skipReleaseFocus) {
      audioCoordinator.releaseFocus('quran-player', 'quran');
    }
  }

  /**
   * Pin playback to a surah+ayah window. While set, playNextAyah(),
   * playPreviousAyah() and the continuous auto-advance refuse to step
   * outside [start, end] in `surah`. Pass null to release the constraint.
   */
  setPlaybackRange(range: { surah: number; start: number; end: number } | null): void {
    this.playbackRange = range;
  }

  /**
   * Whether stepping to (`surah`, `ayah`) is allowed under the current
   * range constraint. Returns true when no range is set.
   */
  private isAyahInRange(surah: number, ayah: number): boolean {
    const r = this.playbackRange;
    if (!r) return true;
    return surah === r.surah && ayah >= r.start && ayah <= r.end;
  }

  async playNextAyah(suppressLoading: boolean = false): Promise<void> {
    const { currentSurah, currentAyah, reciterIdentifier } = this.state;
    // Compute the candidate next position the same way the unrestricted
    // logic below did, then refuse it if the citation range would forbid
    // crossing out. Refusal = stop, not silently no-op, so the listener
    // hears a clear endpoint and the UI mini-bar parks on the last ayah.
    let nextSurah = currentSurah;
    let nextAyah = currentAyah + 1;
    if (currentAyah >= this.surahAyahsCount) {
      if (currentSurah >= 114) {
        await this.stop();
        return;
      }
      nextSurah = currentSurah + 1;
      nextAyah = 1;
    }
    if (!this.isAyahInRange(nextSurah, nextAyah)) {
      this.updateState({ playbackRangeBlockedAt: Date.now() });
      await this.stop();
      return;
    }
    await this.playAyah(
      nextSurah,
      nextAyah,
      reciterIdentifier,
      this.continuousPlay,
      suppressLoading,
      this.playingFullSurah,
    );
  }

  async playPreviousAyah(): Promise<void> {
    const { currentSurah, currentAyah, reciterIdentifier } = this.state;
    let prevSurah = currentSurah;
    let prevAyah = currentAyah - 1;
    if (currentAyah <= 1) {
      if (currentSurah <= 1) return;
      const previous = await getCachedSurah(currentSurah - 1);
      if (!previous) return;
      prevSurah = currentSurah - 1;
      prevAyah = previous.numberOfAyahs;
    }
    // Refuse to step before the citation start — the user stays on the
    // current (first) ayah of the citation rather than briefly hearing
    // (or even loading) an out-of-range verse.
    if (!this.isAyahInRange(prevSurah, prevAyah)) {
      this.updateState({ playbackRangeBlockedAt: Date.now() });
      return;
    }
    await this.playAyah(
      prevSurah,
      prevAyah,
      reciterIdentifier,
      this.continuousPlay,
      false,
      this.playingFullSurah,
    );
  }

  async seekTo(positionMillis: number): Promise<void> {
    if (this.playingFullSurah && !this.sound && this.canUseTrackPlayer() && TrackPlayer) {
      await TrackPlayer.seekTo(positionMillis / 1000); // Convert ms to seconds
    } else if (this.sound) {
      await this.sound.setPositionAsync(positionMillis);
    }
  }

  async resumeLastPlayback(continuous: boolean = true): Promise<boolean> {
    const lastPlayback = await getLastPlayback();
    if (lastPlayback) {
      await this.playAyah(lastPlayback.surahNumber, lastPlayback.ayahNumber, lastPlayback.reciterIdentifier, continuous);
      return true;
    }
    return false;
  }

  getState(): PlaybackState {
    return this.state;
  }

  setContinuousPlay(enabled: boolean) {
    this.continuousPlay = enabled;
  }

  // QuranCDN reciter id is now sourced from RECITERS_REGISTRY (entry.quranCdnId).
  // Fetch per-ayah start timestamps (ms) for a surah from QuranCDN in a single API call.
  // Returns { offsets, audioUrl } — audioUrl is the CDN file that matches these timestamps.
  // Cache audio URLs from QuranCDN alongside offsets so they stay in sync
  private surahAudioUrls = new Map<string, string>();

  private async fetchSurahTimestamps(
    reciterIdentifier: string,
    surahNumber: number,
  ): Promise<{ offsets: number[]; audioUrl: string | null }> {
    const reciterId = RECITERS_BY_ID[reciterIdentifier]?.quranCdnId;
    if (!reciterId) {
      console.warn('[audio-player] fetchSurahTimestamps: reciter', reciterIdentifier, 'has NO QuranCDN id mapping — per-ayah tracking will not work');
      return { offsets: [], audioUrl: null };
    }

    const key = `${reciterIdentifier}:${surahNumber}`;
    if (this.surahOffsets.has(key)) {
      return { offsets: this.surahOffsets.get(key)!, audioUrl: this.surahAudioUrls.get(key) || null };
    }

    const url = `https://api.qurancdn.com/api/qdc/audio/reciters/${reciterId}/audio_files?chapter_number=${surahNumber}&segments=true`;
    let res: Response;
    try {
      res = await fetchWithTimeout(url, {}, 8000);
    } catch (e) {
      console.warn('[audio-player] fetchSurahTimestamps: network fetch failed for', key, e);
      return { offsets: [], audioUrl: null };
    }
    if (!res.ok) {
      console.warn('[audio-player] fetchSurahTimestamps: HTTP', res.status, 'for', key);
      return { offsets: [], audioUrl: null };
    }
    const data = await res.json();

    const file = data.audio_files?.[0];
    if (!file?.verse_timings?.length) {
      console.warn('[audio-player] fetchSurahTimestamps: no verse_timings in response for', key);
      return { offsets: [], audioUrl: null };
    }

    const offsets: number[] = file.verse_timings.map((t: any) => t.timestamp_from as number);
    // Use the audio_url from QuranCDN so timestamps and audio file are always in sync
    const cdnAudioUrl: string | null = file.audio_url || null;
    this.surahOffsets.set(key, offsets);
    if (cdnAudioUrl) this.surahAudioUrls.set(key, cdnAudioUrl);
    console.log('[audio-player] fetchSurahTimestamps: cached', offsets.length, 'offsets for', key);
    return { offsets, audioUrl: cdnAudioUrl };
  }

  private startOffsetPoller(reciterIdentifier: string, surahNumber: number) {
    this.stopOffsetPoller();
    const key = `${reciterIdentifier}:${surahNumber}`;
    const offsets = this.surahOffsets.get(key) || null;
    if (!offsets) {
      console.warn('[audio-player] startOffsetPoller: NO offsets for', key, '— per-ayah tracking disabled');
      return;
    }
    console.log('[audio-player] startOffsetPoller: OK for', key, 'offsets count=', offsets.length);

    this.offsetPoller = setInterval(async () => {
      if (!this.sound) return;
      try {
        const st = await this.sound.getStatusAsync();
        const pos = (st as any).positionMillis || 0;
        let lo = 0, hi = offsets.length - 1, idx = 0;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (offsets[mid] <= pos) {
            idx = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        const ayahIndex = idx + 1;
        if (this.state.currentAyah !== ayahIndex) {
          console.log('[audio-player] offset poller advancing ayah', this.state.currentAyah, '→', ayahIndex, 'pos=', pos, 'ms');
          this.updateState({ currentAyah: ayahIndex });
        }
      } catch (e) {
        // ignore transient errors
      }
    }, 600) as unknown as number;
  }

  private stopOffsetPoller() {
    if (this.offsetPoller) {
      clearInterval(this.offsetPoller);
      this.offsetPoller = null;
    }
  }

  private stopProgressPoller() {
    if (this.progressPoller) {
      clearInterval(this.progressPoller);
      this.progressPoller = null;
    }
  }
}

export const audioPlayer = new AudioPlayerManager();
