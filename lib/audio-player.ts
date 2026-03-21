// lib/audio-player.ts
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { getAyahAudioUrl, saveLastPlayback, getLastPlayback, getCachedSurah } from './quran-cache';
import { audioCoordinator } from './audio-coordinator';

// TrackPlayer has been removed — always use expo-av
// Lock screen controls are not available with expo-av

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
  private sound: Audio.Sound | null = null;
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

  constructor() {
    this.initAudio();
  }

  private async initAudio() {
    if (Platform.OS !== 'web') {
      // Configure expo-av for background playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      console.log('[audio-player] ✅ Using expo-av for Quran playback');
    }
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
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
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
      
      // If full surah mode and starting from a specific ayah, don't auto-play — seek first
      const needsSeek = this.playingFullSurah && ayahNumber > 1;

      // Use expo-av for playback
      this.isTransitioning = false;
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
          const fallbackUrl = getSurahAudioUrl(reciterIdentifier, surahNumber);
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
        // Seek to specific ayah position if not starting from beginning
        if (ayahNumber > 1) {
          const key = `${reciterIdentifier}:${surahNumber}`;
          const offsets = this.surahOffsets.get(key);
          if (offsets && offsets.length >= ayahNumber) {
            const seekPosition = offsets[ayahNumber - 1];
            if (seekPosition > 0) {
              await this.sound?.setPositionAsync(seekPosition);
              console.log('[audio-player] seeked to ayah', ayahNumber, 'at', seekPosition, 'ms');
            }
          }
          // Now start playback after seeking
          await this.sound?.playAsync();
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
    if (!this.sound) return;
    if (this.state.isPlaying) {
      await this.sound.pauseAsync();
    } else {
      await this.sound.playAsync();
    }
  }

  async stop(skipReleaseFocus = false): Promise<void> {
    // Stop expo-av sound if exists
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
    this.playingFullSurah = false;
    this.stopOffsetPoller();
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
    if (this.sound) {
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
}

export const audioPlayer = new AudioPlayerManager();
