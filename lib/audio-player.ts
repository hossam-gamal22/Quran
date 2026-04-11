// lib/audio-player.ts
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { getAyahAudioUrl, saveLastPlayback, getLastPlayback, getCachedSurah } from './quran-cache';
import { audioCoordinator } from './audio-coordinator';
import { addListeningTime } from './listening-tracker';

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

export interface PlaybackState {
  isPlaying: boolean;
  isLoading: boolean;
  currentSurah: number;
  currentAyah: number;
  reciterIdentifier: string;
  duration: number;
  position: number;
  playingFullSurah?: boolean;
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
    reciterIdentifier: 'ar.alafasy',
    duration: 0,
    position: 0,
    playingFullSurah: false,
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
    if (!TrackPlayer || !Event || !State) return;
    // Guard against duplicate listener setup (e.g. hot reload)
    if (this.listenersSetup) return;
    this.listenersSetup = true;
    
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
          await this.playNextAyah(true);
        }
      }
    );
    this.trackPlayerListeners.push(() => queueEndListener.remove());

    // Start progress poller for TrackPlayer (since useProgress hook is for components only)
    this.startProgressPoller();
  }

  private startProgressPoller() {
    if (this.progressPoller || !TrackPlayer || !State) return;
    
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
          this.updateState({
            position: position * 1000, // Convert to ms
            duration: duration * 1000, // Convert to ms
          });
        }
      } catch {
        // Ignore errors when player is not ready
      }
    }, 500) as unknown as number;
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
    suppressLoading: boolean = false
  ): Promise<void> {
    try {
      if (!suppressLoading) this.updateState({ isLoading: true });
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
      this.playingFullSurah = !!continuous;

      let audioUrl: string;
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
        } else {
          try {
            const { offsets, audioUrl: cdnUrl } = await this.fetchSurahTimestamps(reciterIdentifier, surahNumber);
            audioUrl = cdnUrl || getSurahAudioUrl(reciterIdentifier, surahNumber);
            console.log('[audio-player] full surah', reciterIdentifier, surahNumber, 'offsets:', offsets.length, 'url=', audioUrl);
          } catch (e) {
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
        audioUrl = getAyahAudioUrl(reciterIdentifier, globalAyahNumber);
      }

      console.log('[audio-player] creating sound url=', audioUrl, 'playingFullSurah=', this.playingFullSurah);

      // Abort if a newer playAyah call was made while resolving URL
      if (myLoadId !== this.loadingId) return;

      // If full surah mode and starting from a specific ayah, don't auto-play — seek first
      const needsSeek = this.playingFullSurah && ayahNumber > 1;

      this.isTransitioning = false;

      // Get surah name for notification
      const surahName = surah?.englishName || `Surah ${surahNumber}`;
      const reciterName = this.getReciterName(reciterIdentifier);

      if (this.useTrackPlayer && TrackPlayer) {
        // Use TrackPlayer for native platforms (with lock screen controls)
        try {
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
          await this.playWithExpoAv(audioUrl, needsSeek);
        }
      } else {
        // Use expo-av for web platform
        await this.playWithExpoAv(audioUrl, needsSeek);
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

      if (this.playingFullSurah) {
        this.startOffsetPoller(reciterIdentifier, surahNumber);
        // For expo-av, handle seek after playback starts
        if (!this.useTrackPlayer && ayahNumber > 1) {
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
      console.warn('Error playing ayah:', error);
      this.isTransitioning = false;
      this.updateState({ isLoading: false, isPlaying: false });
    }
  }

  private getReciterName(reciterIdentifier: string): string {
    const reciterNames: Record<string, string> = {
      'ar.alafasy': 'مشاري العفاسي',
      'ar.abdullahbasfar': 'عبدالله بصفر',
      'ar.abdurrahmaansudais': 'عبدالرحمن السديس',
      'ar.shaatree': 'أبو بكر الشاطري',
      'ar.husary': 'محمود خليل الحصري',
      'ar.minshawi': 'محمد صديق المنشاوي',
      'ar.hudhaify': 'علي الحذيفي',
      'ar.ibrahim.akhdar': 'إبراهيم الأخضر',
      'ar.muhammadjibreel': 'محمد جبريل',
    };
    return reciterNames[reciterIdentifier] || 'القارئ';
  }

  // Helper method for expo-av playback (web platform)
  private async playWithExpoAv(audioUrl: string, needsSeek: boolean): Promise<void> {
    // Unload previous sound before creating new one to prevent resource leak
    if (this.sound) {
      try { await this.sound.unloadAsync(); } catch {}
      this.sound = null;
    }

    let sound: Audio.Sound;
    try {
      ({ sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: !needsSeek },
        this.onPlaybackStatusUpdate.bind(this)
      ));
    } catch (urlError) {
      // If CDN URL failed, retry with islamic.network fallback for full surah
      if (this.playingFullSurah) {
        const { getSurahAudioUrl } = await import('./quran-cache');
        const fallbackUrl = getSurahAudioUrl(this.state.reciterIdentifier, this.state.currentSurah);
        console.warn('[audio-player] CDN URL failed, retrying with fallback:', fallbackUrl);
        ({ sound } = await Audio.Sound.createAsync(
          { uri: fallbackUrl },
          { shouldPlay: !needsSeek },
          this.onPlaybackStatusUpdate.bind(this)
        ));
      } else {
        throw urlError;
      }
    }
    this.sound = sound;
  }

  private async onPlaybackStatusUpdate(status: any) {
    if (status.isLoaded) {
      this.updateState({
        duration: status.durationMillis || 0,
        position: status.positionMillis || 0,
        isPlaying: status.isPlaying,
        playingFullSurah: this.playingFullSurah,
      });

      if (status.didJustFinish) {
        if (this.continuousPlay) {
          await this.playNextAyah(true);
        }
      }
    }
  }

  async togglePlayPause(): Promise<void> {
    if (this.useTrackPlayer && TrackPlayer && State) {
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
    if (this.useTrackPlayer && TrackPlayer) {
      try {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      } catch {}
    }
    
    // Also stop expo-av sound if exists (fallback)
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

  async playNextAyah(suppressLoading: boolean = false): Promise<void> {
    const { currentSurah, currentAyah, reciterIdentifier } = this.state;

    if (this.playingFullSurah) {
      if (currentSurah < 114) {
        await this.playAyah(currentSurah + 1, 1, reciterIdentifier, true, suppressLoading);
      } else {
        await this.stop();
      }
      return;
    }

    if (currentAyah < this.surahAyahsCount) {
      await this.playAyah(currentSurah, currentAyah + 1, reciterIdentifier, true, suppressLoading);
    } else if (currentSurah < 114) {
      await this.playAyah(currentSurah + 1, 1, reciterIdentifier, true, suppressLoading);
    } else {
      await this.stop();
    }
  }

  async playPreviousAyah(): Promise<void> {
    const { currentSurah, currentAyah, reciterIdentifier } = this.state;
    if (currentAyah > 1) {
      await this.playAyah(currentSurah, currentAyah - 1, reciterIdentifier, this.continuousPlay);
    } else if (currentSurah > 1) {
      const prevSurah = await getCachedSurah(currentSurah - 1);
      if (prevSurah) {
        await this.playAyah(currentSurah - 1, prevSurah.numberOfAyahs, reciterIdentifier, this.continuousPlay);
      }
    }
  }

  async seekTo(positionMillis: number): Promise<void> {
    if (this.useTrackPlayer && TrackPlayer) {
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

  // Map alquran.cloud reciter identifiers → QuranCDN reciter IDs
  private static readonly QURAN_CDN_RECITER_IDS: Record<string, number> = {
    'ar.alafasy': 7,
    'ar.abdullahbasfar': 9,
    'ar.abdurrahmaansudais': 3,
    'ar.shaatree': 2,
    'ar.husary': 1,
    'ar.minshawi': 4,
    'ar.hudhaify': 12,
    'ar.ibrahim.akhdar': 130,
    'ar.muhammadjibreel': 42,
  };

  // Fetch per-ayah start timestamps (ms) for a surah from QuranCDN in a single API call.
  // Returns { offsets, audioUrl } — audioUrl is the CDN file that matches these timestamps.
  // Cache audio URLs from QuranCDN alongside offsets so they stay in sync
  private surahAudioUrls = new Map<string, string>();

  private async fetchSurahTimestamps(
    reciterIdentifier: string,
    surahNumber: number,
  ): Promise<{ offsets: number[]; audioUrl: string | null }> {
    const reciterId = AudioPlayerManager.QURAN_CDN_RECITER_IDS[reciterIdentifier];
    if (!reciterId) return { offsets: [], audioUrl: null };

    const key = `${reciterIdentifier}:${surahNumber}`;
    if (this.surahOffsets.has(key)) {
      return { offsets: this.surahOffsets.get(key)!, audioUrl: this.surahAudioUrls.get(key) || null };
    }

    const url = `https://api.qurancdn.com/api/qdc/audio/reciters/${reciterId}/audio_files?chapter_number=${surahNumber}&segments=true`;
    const res = await fetch(url);
    if (!res.ok) return { offsets: [], audioUrl: null };
    const data = await res.json();

    const file = data.audio_files?.[0];
    if (!file?.verse_timings?.length) return { offsets: [], audioUrl: null };

    const offsets: number[] = file.verse_timings.map((t: any) => t.timestamp_from as number);
    // Use the audio_url from QuranCDN so timestamps and audio file are always in sync
    const cdnAudioUrl: string | null = file.audio_url || null;
    this.surahOffsets.set(key, offsets);
    if (cdnAudioUrl) this.surahAudioUrls.set(key, cdnAudioUrl);
    return { offsets, audioUrl: cdnAudioUrl };
  }

  private startOffsetPoller(reciterIdentifier: string, surahNumber: number) {
    this.stopOffsetPoller();
    const key = `${reciterIdentifier}:${surahNumber}`;
    const offsets = this.surahOffsets.get(key) || null;
    if (!offsets) return;

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
