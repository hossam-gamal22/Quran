// contexts/QuranContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  initializeQuranCache, 
  CachedSurah, 
  Reciter,
  getCachedSurah,
  fetchAndCacheSurahsList,
} from '@/lib/quran-cache';
import { audioPlayer, PlaybackState } from '@/lib/audio-player';
import { DEFAULT_RECITER_ID, RECITERS_BY_ID, LEGACY_RECITER_ID_MAP, hasPerAyahSync } from '@/lib/reciters-registry';
import { t } from '@/lib/i18n';

const RECITER_STORAGE_KEY = '@quran_current_reciter';

function migrateReciterId(stored: string | null | undefined): string {
  if (!stored) return DEFAULT_RECITER_ID;
  const candidate = RECITERS_BY_ID[stored] ? stored : (LEGACY_RECITER_ID_MAP[stored] ?? DEFAULT_RECITER_ID);
  // The Mushaf reader requires per-ayah sync (timestamps). If the persisted
  // reciter no longer supports it (e.g. we removed their quranCdnId), fall
  // back to the default sync-capable reciter so the ▶ button works.
  return hasPerAyahSync(candidate) ? candidate : DEFAULT_RECITER_ID;
}

interface QuranContextType {
  // البيانات
  surahs: CachedSurah[];
  reciters: Reciter[];
  isLoading: boolean;
  error: string | null;
  
  // الصوت
  playbackState: PlaybackState;
  playAyah: (surahNumber: number, ayahNumber: number, continuous?: boolean, playFullSurah?: boolean) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  stopPlayback: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  resumePlayback: () => Promise<boolean>;
  setReciter: (identifier: string) => void;
  setContinuousPlay: (enabled: boolean) => void;
  /**
   * Constrain prev/next/auto-advance to a surah+ayah window. Used by the
   * citation passage page so listening can't drift outside the cited
   * verses. Pass null to lift the constraint.
   */
  setPlaybackRange: (range: { surah: number; start: number; end: number } | null) => void;
  seekTo: (positionMillis: number) => Promise<void>;
  
  // البيانات
  getSurah: (number: number) => Promise<CachedSurah | null>;
  currentReciter: string;
}

const QuranContext = createContext<QuranContextType | null>(null);

export function QuranProvider({ children }: { children: React.ReactNode }) {
  const [surahs, setSurahs] = useState<CachedSurah[]>([]);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(audioPlayer.getState());
  const [currentReciter, setCurrentReciter] = useState<string>(DEFAULT_RECITER_ID);

  // Load saved reciter (with legacy id migration) on first mount.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(RECITER_STORAGE_KEY);
        const migrated = migrateReciterId(saved);
        setCurrentReciter(migrated);
        if (saved !== migrated) {
          await AsyncStorage.setItem(RECITER_STORAGE_KEY, migrated).catch(() => {});
        }
      } catch (e) {
        console.warn('Failed to load saved reciter, using default:', e);
      }
    })();
  }, []);

  // تحميل البيانات عند بدء التطبيق
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        console.log('📥 Loading Quran data...');
        const { surahs, reciters } = await initializeQuranCache();
        setSurahs(surahs);
        setReciters(reciters);
        console.log('✅ Quran data loaded successfully');
      } catch (err) {
        setError(t('common.loadFailed'));
        console.error('❌ Error loading Quran data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // الاشتراك في تحديثات المشغل
  useEffect(() => {
    const unsubscribe = audioPlayer.subscribe(setPlaybackState);
    return unsubscribe;
  }, []);

  const playAyah = useCallback(async (
    surahNumber: number,
    ayahNumber: number,
    continuous = false,
    playFullSurah = continuous,
  ) => {
    await audioPlayer.playAyah(surahNumber, ayahNumber, currentReciter, continuous, false, playFullSurah);
  }, [currentReciter]);

  const togglePlayPause = useCallback(async () => {
    await audioPlayer.togglePlayPause();
  }, []);

  const stopPlayback = useCallback(async () => {
    await audioPlayer.stop();
  }, []);

  const playNext = useCallback(async () => {
    await audioPlayer.playNextAyah();
  }, []);

  const playPrevious = useCallback(async () => {
    await audioPlayer.playPreviousAyah();
  }, []);

  const resumePlayback = useCallback(async () => {
    return await audioPlayer.resumeLastPlayback();
  }, []);

  const setReciter = useCallback((identifier: string) => {
    const safe = RECITERS_BY_ID[identifier] ? identifier : migrateReciterId(identifier);
    setCurrentReciter(safe);
    AsyncStorage.setItem(RECITER_STORAGE_KEY, safe).catch(() => {});
    // If audio is currently playing, hand the current ayah to the new reciter
    // immediately. Force per-ayah mode: a single-ayah mp3 is tiny and starts
    // playing in well under a second, vs. a full-surah file (5–30 MB) that
    // would otherwise re-download from scratch when the listener is just
    // trying to swap voices. Continuous play stays on, so the rest of the
    // surah keeps streaming verse-by-verse with the existing prefetcher.
    const state = audioPlayer.getState();
    if ((state.isPlaying || state.isLoading) && state.currentSurah > 0) {
      // Kick off the new reciter's current-ayah download immediately so the
      // file is on disk by the time playAyah reaches expo-av createAsync.
      if (typeof audioPlayer.prefetchAyah === 'function') {
        audioPlayer.prefetchAyah(state.currentSurah, state.currentAyah, safe);
      }
      audioPlayer.playAyah(state.currentSurah, state.currentAyah, safe, true, false, false);
    }
  }, []);

  const setContinuousPlay = useCallback((enabled: boolean) => {
    audioPlayer.setContinuousPlay(enabled);
  }, []);

  const seekTo = useCallback(async (positionMillis: number) => {
    await audioPlayer.seekTo(positionMillis);
  }, []);

  const getSurah = useCallback(async (number: number) => {
    // أولاً نحاول من الـ state
    const fromState = surahs.find(s => s.number === number);
    if (fromState) return fromState;
    // إذا مش موجود، نجيبه من الكاش
    return await getCachedSurah(number);
  }, [surahs]);

  return (
    <QuranContext.Provider
      value={{
        surahs,
        reciters,
        isLoading,
        error,
        playbackState,
        playAyah,
        togglePlayPause,
        stopPlayback,
        playNext,
        playPrevious,
        resumePlayback,
        setReciter,
        setContinuousPlay,
        setPlaybackRange: (range) => audioPlayer.setPlaybackRange(range),
        seekTo,
        getSurah,
        currentReciter,
      }}
    >
      {children}
    </QuranContext.Provider>
  );
}

export function useQuran() {
  const context = useContext(QuranContext);
  if (!context) {
    throw new Error('useQuran must be used within QuranProvider');
  }
  return context;
}
