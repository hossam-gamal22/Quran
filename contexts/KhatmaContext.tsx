import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  Khatma,
  KhatmaDuration,
  KHATMA_DURATIONS,
  getAllKhatmas,
  getActiveKhatma,
  createKhatma as createKhatmaStorage,
  deleteKhatma as deleteKhatmaStorage,
  setActiveKhatma as setActiveKhatmaStorage,
  completeTodayWird as completeTodayWirdStorage,
  recordDailyProgress as recordProgressStorage,
  getTodayWird,
  getKhatmaStats,
} from '../lib/khatma-storage';

// ===== TYPES =====
interface KhatmaContextType {
  // Data
  khatmas: Khatma[];
  activeKhatma: Khatma | null;
  durations: KhatmaDuration[];
  isLoading: boolean;
  
  // Actions
  createKhatma: (name: string, duration: KhatmaDuration, reminderTime?: string | null) => Promise<Khatma | null>;
  deleteKhatma: (id: string) => Promise<boolean>;
  setActiveKhatma: (id: string) => Promise<boolean>;
  completeTodayWird: () => Promise<boolean>;
  recordProgress: (pages: number) => Promise<boolean>;
  refreshKhatmas: () => Promise<void>;
  
  // Helpers
  getTodayWirdInfo: () => { startPage: number; endPage: number; pagesRemaining: number; isCompleted: boolean } | null;
  getActiveKhatmaStats: () => {
    progressPercentage: number;
    pagesRead: number;
    pagesRemaining: number;
    daysRemaining: number;
    daysElapsed: number;
    isOnTrack: boolean;
    expectedPage: number;
  } | null;
}

// ===== CONTEXT =====
const KhatmaContext = createContext<KhatmaContextType | undefined>(undefined);

// ===== PROVIDER =====
interface KhatmaProviderProps {
  children: ReactNode;
}

export function KhatmaProvider({ children }: KhatmaProviderProps) {
  const [khatmas, setKhatmas] = useState<Khatma[]>([]);
  const [activeKhatma, setActiveKhatmaState] = useState<Khatma | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load khatmas on mount
  useEffect(() => {
    loadKhatmas();
  }, []);

  const loadKhatmas = async () => {
    setIsLoading(true);
    try {
      const allKhatmas = await getAllKhatmas();
      const active = await getActiveKhatma();
      
      setKhatmas(allKhatmas);
      setActiveKhatmaState(active);
    } catch (error) {
      console.error('Error loading khatmas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshKhatmas = useCallback(async () => {
    await loadKhatmas();
  }, []);

  const createKhatma = useCallback(
    async (name: string, duration: KhatmaDuration, reminderTime: string | null = null) => {
      const newKhatma = await createKhatmaStorage(name, duration, reminderTime);
      if (newKhatma) {
        await refreshKhatmas();
        return newKhatma;
      }
      return null;
    },
    [refreshKhatmas]
  );

  const deleteKhatma = useCallback(
    async (id: string) => {
      const success = await deleteKhatmaStorage(id);
      if (success) {
        await refreshKhatmas();
      }
      return success;
    },
    [refreshKhatmas]
  );

  const setActiveKhatma = useCallback(
    async (id: string) => {
      const success = await setActiveKhatmaStorage(id);
      if (success) {
        await refreshKhatmas();
      }
      return success;
    },
    [refreshKhatmas]
  );

  const completeTodayWird = useCallback(async () => {
    if (!activeKhatma) return false;
    
    const updated = await completeTodayWirdStorage(activeKhatma.id);
    if (updated) {
      await refreshKhatmas();
      return true;
    }
    return false;
  }, [activeKhatma, refreshKhatmas]);

  const recordProgress = useCallback(
    async (pages: number) => {
      if (!activeKhatma) return false;
      
      const updated = await recordProgressStorage(activeKhatma.id, pages);
      if (updated) {
        await refreshKhatmas();
        return true;
      }
      return false;
    },
    [activeKhatma, refreshKhatmas]
  );

  const getTodayWirdInfo = useCallback(() => {
    if (!activeKhatma) return null;
    return getTodayWird(activeKhatma);
  }, [activeKhatma]);

  const getActiveKhatmaStats = useCallback(() => {
    if (!activeKhatma) return null;
    return getKhatmaStats(activeKhatma);
  }, [activeKhatma]);

  const value: KhatmaContextType = {
    khatmas,
    activeKhatma,
    durations: KHATMA_DURATIONS,
    isLoading,
    createKhatma,
    deleteKhatma,
    setActiveKhatma,
    completeTodayWird,
    recordProgress,
    refreshKhatmas,
    getTodayWirdInfo,
    getActiveKhatmaStats,
  };

  return (
    <KhatmaContext.Provider value={value}>
      {children}
    </KhatmaContext.Provider>
  );
}

// ===== HOOK =====
export function useKhatma() {
  const context = useContext(KhatmaContext);
  if (context === undefined) {
    throw new Error('useKhatma must be used within a KhatmaProvider');
  }
  return context;
}
