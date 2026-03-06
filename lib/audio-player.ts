// lib/audio-player.ts
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { getAyahAudioUrl, saveLastPlayback, getLastPlayback, getCachedSurah } from './quran-cache';

export interface PlaybackState {
  isPlaying: boolean;
  isLoading: boolean;
  currentSurah: number;
  currentAyah: number;
  reciterIdentifier: string;
  duration: number;
  position: number;
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
  };
  private listeners: Set<PlaybackCallback> = new Set();
  private continuousPlay: boolean = true;
  private surahAyahsCount: number = 0;

  constructor() {
    this.initAudio();
  }

  private async initAudio() {
    if (Platform.OS !== 'web') {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    }
  }

  // ─── الاشتراك في التحديثات ─────────────────────────────────────────────────
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

  // ─── تشغيل آية ─────────────────────────────────────────────────────────────
  async playAyah(
    surahNumber: number,
    ayahNumber: number,
    reciterIdentifier: string,
    continuous: boolean = false
  ): Promise<void> {
    try {
      this.updateState({ isLoading: true });
      this.continuousPlay = continuous;

      // الحصول على عدد آيات السورة
      const surah = await getCachedSurah(surahNumber);
      this.surahAyahsCount = surah?.numberOfAyahs || 0;

      // حساب رقم الآية الكلي
      let globalAyahNumber = ayahNumber;
      if (surah) {
        // نحتاج حساب الرقم الكلي للآية
        const surahs = await import('./quran-cache').then(m => m.fetchAndCacheSurahsList());
        let totalAyahs = 0;
        for (const s of surahs) {
          if (s.number < surahNumber) {
            totalAyahs += s.numberOfAyahs;
          }
        }
        globalAyahNumber = totalAyahs + ayahNumber;
      }

      // إيقاف الصوت الحالي
      await this.stop();

      // تحميل الصوت الجديد
      const audioUrl = getAyahAudioUrl(reciterIdentifier, globalAyahNumber);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      this.updateState({
        isPlaying: true,
        isLoading: false,
        currentSurah: surahNumber,
        currentAyah: ayahNumber,
        reciterIdentifier,
      });

      // حفظ موضع التشغيل
      await saveLastPlayback({
        surahNumber,
        ayahNumber,
        reciterIdentifier,
      });

    } catch (error) {
      console.error('Error playing ayah:', error);
      this.updateState({ isLoading: false, isPlaying: false });
    }
  }

  // ─── متابعة حالة التشغيل ─────────────────────────────────────────────────────
  private async onPlaybackStatusUpdate(status: any) {
    if (status.isLoaded) {
      this.updateState({
        duration: status.durationMillis || 0,
        position: status.positionMillis || 0,
        isPlaying: status.isPlaying,
      });

      // عند انتهاء الآية
      if (status.didJustFinish && this.continuousPlay) {
        await this.playNextAyah();
      }
    }
  }

  // ─── تشغيل الآية التالية ─────────────────────────────────────────────────────
  async playNextAyah(): Promise<void> {
    const { currentSurah, currentAyah, reciterIdentifier } = this.state;
    
    if (currentAyah < this.surahAyahsCount) {
      // الآية التالية في نفس السورة
      await this.playAyah(currentSurah, currentAyah + 1, reciterIdentifier, true);
    } else if (currentSurah < 114) {
      // أول آية في السورة التالية
      await this.playAyah(currentSurah + 1, 1, reciterIdentifier, true);
    } else {
      // نهاية القرآن
      await this.stop();
    }
  }

  // ─── تشغيل الآية السابقة ─────────────────────────────────────────────────────
  async playPreviousAyah(): Promise<void> {
    const { currentSurah, currentAyah, reciterIdentifier } = this.state;
    
    if (currentAyah > 1) {
      await this.playAyah(currentSurah, currentAyah - 1, reciterIdentifier, this.continuousPlay);
    } else if (currentSurah > 1) {
      // آخر آية في السورة السابقة
      const prevSurah = await getCachedSurah(currentSurah - 1);
      if (prevSurah) {
        await this.playAyah(currentSurah - 1, prevSurah.numberOfAyahs, reciterIdentifier, this.continuousPlay);
      }
    }
  }

  // ─── إيقاف مؤقت / استئناف ─────────────────────────────────────────────────────
  async togglePlayPause(): Promise<void> {
    if (!this.sound) return;
    
    if (this.state.isPlaying) {
      await this.sound.pauseAsync();
    } else {
      await this.sound.playAsync();
    }
  }

  // ─── إيقاف كامل ─────────────────────────────────────────────────────────────
  async stop(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
    this.updateState({
      isPlaying: false,
      isLoading: false,
      duration: 0,
      position: 0,
    });
  }

  // ─── استكمال من آخر موضع ─────────────────────────────────────────────────────
  async resumeLastPlayback(continuous: boolean = true): Promise<boolean> {
    const lastPlayback = await getLastPlayback();
    if (lastPlayback) {
      await this.playAyah(
        lastPlayback.surahNumber,
        lastPlayback.ayahNumber,
        lastPlayback.reciterIdentifier,
        continuous
      );
      return true;
    }
    return false;
  }

  // ─── الحصول على الحالة الحالية ─────────────────────────────────────────────────
  getState(): PlaybackState {
    return this.state;
  }

  // ─── الانتقال لموضع معين ─────────────────────────────────────────────────
  async seekTo(positionMillis: number): Promise<void> {
    if (this.sound) {
      await this.sound.setPositionAsync(positionMillis);
    }
  }

  // ─── تعيين التشغيل المتواصل ─────────────────────────────────────────────────
  setContinuousPlay(enabled: boolean) {
    this.continuousPlay = enabled;
  }
}

// Singleton instance
export const audioPlayer = new AudioPlayerManager();
