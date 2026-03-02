// contexts/QuranContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  initializeQuranCache, 
  CachedSurah, 
  Reciter,
  getCachedSurah,
  fetchAndCacheSurahsList,
} from '@/lib/quran-cache';
import { audioPlayer, PlaybackState } from '@/lib/audio-player';

interface QuranContextType {
  // البيانات
  surahs: CachedSurah[];
  reciters: Reciter[];
  isLoading: boolean;
  error: string | null;
  
  // الصوت
  playbackState: PlaybackState;
  playAyah: (surahNumber: number, ayahNumber: number, continuous?: boolean) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  stopPlayback: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  resumePlayback: () => Promise<boolean>;
  setReciter: (identifier: string) => void;
  setContinuousPlay: (enabled: boolean) => void;
  
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
  const [currentReciter, setCurrentReciter] = useState('ar.alafasy');

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
        setError('فشل في تحميل بيانات القرآن');
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

  const playAyah = useCallback(async (surahNumber: number, ayahNumber: number, continuous = false) => {
    await audioPlayer.playAyah(surahNumber, ayahNumber, currentReciter, continuous);
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
    setCurrentReciter(identifier);
  }, []);

  const setContinuousPlay = useCallback((enabled: boolean) => {
    audioPlayer.setContinuousPlay(enabled);
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
