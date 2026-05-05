// contexts/WorshipContext.tsx
// سياق متتبع العبادات - روح المسلم

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  // أنواع
  WorshipType,
  PrayerStatus,
  PrayerName,
  DailyPrayerRecord,
  DailyFastingRecord,
  DailyQuranRecord,
  DailyAzkarRecord,
  WorshipStats,
  PrayerStats,
  FastingStats,
  QuranStats,
  AzkarStats,
  
  // دوال الصلاة
  getPrayerRecord,
  savePrayerRecord,
  updatePrayerStatus,
  updatePrayerStatusWithTime,
  saveDayScheduledTimes,
  getHistoricalFajrTimes,
  getWeekPrayerRecords,
  getMonthPrayerRecords,
  
  // دوال الصيام
  getFastingRecord,
  saveFastingRecord,
  toggleFasting,
  
  // دوال القرآن
  getQuranRecord,
  saveQuranRecord,
  addQuranPages,
  
  // دوال الأذكار
  getAzkarRecord,
  saveAzkarRecord,
  toggleAzkar,
  markAzkarCompleted,
  
  // الإحصائيات
  getWorshipStats,
  updateAllStats,
  
  // مساعدة
  getTodayDate,
  formatDate,
  clearAllWorshipData,
} from '@/lib/worship-storage';
import { applyAutoMissed, extractScheduledTimes, type PrayerTimesMap } from '@/lib/prayer-availability';
import { getCachedPrayerTimes } from '@/lib/prayer-times';


// ========================================
// أنواع السياق
// ========================================

interface WorshipContextType {
  // الحالات
  isLoading: boolean;
  todayDate: string;
  stats: WorshipStats | null;
  
  // سجلات اليوم
  todayPrayer: DailyPrayerRecord | null;
  todayFasting: DailyFastingRecord | null;
  todayQuran: DailyQuranRecord | null;
  todayAzkar: DailyAzkarRecord | null;
  
  // سجلات الأسبوع
  weekPrayers: DailyPrayerRecord[];
  
  // دوال الصلاة
  updatePrayer: (prayer: PrayerName, status: PrayerStatus) => Promise<void>;
  updatePrayerWithTime: (prayer: PrayerName, status: PrayerStatus, scheduledTime?: string) => Promise<void>;
  updatePrayerForDate: (date: string, prayer: PrayerName, status: PrayerStatus) => Promise<void>;
  saveDayTimes: (date: string, times: { fajr?: string; dhuhr?: string; asr?: string; maghrib?: string; isha?: string }) => Promise<void>;
  getHistoricalFajr: (days?: number) => Promise<{ date: string; time: string; status: PrayerStatus }[]>;
  getPrayerForDate: (date: string) => Promise<DailyPrayerRecord | null>;
  getWeekPrayers: (startDate?: Date) => Promise<DailyPrayerRecord[]>;
  getMonthPrayers: (year: number, month: number) => Promise<DailyPrayerRecord[]>;
  
  // دوال الصيام
  toggleTodayFasting: (type?: DailyFastingRecord['type']) => Promise<boolean>;
  toggleFastingForDate: (date: string, type?: DailyFastingRecord['type']) => Promise<boolean>;
  getFastingForDate: (date: string) => Promise<DailyFastingRecord | null>;
  
  // دوال القرآن
  addPagesRead: (pages: number) => Promise<void>;
  updateQuranRecord: (record: Partial<DailyQuranRecord>) => Promise<void>;
  getQuranForDate: (date: string) => Promise<DailyQuranRecord | null>;
  
  // دوال الأذكار
  toggleAzkarType: (type: keyof Omit<DailyAzkarRecord, 'date' | 'zikrCount'>) => Promise<boolean>;
  markAzkarDone: (type: keyof Omit<DailyAzkarRecord, 'date' | 'zikrCount'>) => Promise<void>;
  getAzkarForDate: (date: string) => Promise<DailyAzkarRecord | null>;
  
  // دوال عامة
  refreshStats: () => Promise<void>;
  refreshTodayRecords: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

// ========================================
// القيم الافتراضية
// ========================================

const defaultStats: WorshipStats = {
  prayer: {
    totalPrayers: 0,
    prayedOnTime: 0,
    prayedLate: 0,
    missed: 0,
    streak: 0,
    bestStreak: 0,
    percentage: 0,
  },
  fasting: {
    totalDays: 0,
    ramadanDays: 0,
    voluntaryDays: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
  quran: {
    totalPages: 0,
    totalVerses: 0,
    khatmasCompleted: 0,
    averagePagesPerDay: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
  azkar: {
    morningCompleted: 0,
    eveningCompleted: 0,
    totalDays: 0,
    currentStreak: 0,
    bestStreak: 0,
    completionRate: 0,
  },
  lastUpdated: new Date().toISOString(),
};

const defaultPrayerRecord: DailyPrayerRecord = {
  date: getTodayDate(),
  fajr: 'none',
  dhuhr: 'none',
  asr: 'none',
  maghrib: 'none',
  isha: 'none',
};

const defaultAzkarRecord: DailyAzkarRecord = {
  date: getTodayDate(),
  morning: false,
  evening: false,
  sleep: false,
  wakeup: false,
  afterPrayer: false,
  zikrCount: 0,
};

// ========================================
// إنشاء السياق
// ========================================

const WorshipContext = createContext<WorshipContextType | undefined>(undefined);

// ========================================
// مزود السياق
// ========================================

interface WorshipProviderProps {
  children: ReactNode;
}

export const WorshipProvider: React.FC<WorshipProviderProps> = ({ children }) => {
  // الحالات الأساسية
  const [isLoading, setIsLoading] = useState(true);
  const [todayDate, setTodayDate] = useState(getTodayDate());
  const [stats, setStats] = useState<WorshipStats | null>(null);
  const todayDateRef = useRef(todayDate);
  todayDateRef.current = todayDate;
  
  // سجلات اليوم
  const [todayPrayer, setTodayPrayer] = useState<DailyPrayerRecord | null>(null);
  const [todayFasting, setTodayFasting] = useState<DailyFastingRecord | null>(null);
  const [todayQuran, setTodayQuran] = useState<DailyQuranRecord | null>(null);
  const [todayAzkar, setTodayAzkar] = useState<DailyAzkarRecord | null>(null);
  
  // سجلات الأسبوع
  const [weekPrayers, setWeekPrayers] = useState<DailyPrayerRecord[]>([]);

  // ========================================
  // استماع لتغير اليوم عند العودة للتطبيق
  // ========================================

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        // Always refresh on foreground — refreshTodayRecords handles date internally
        await refreshTodayRecords();
        const currentDate = getTodayDate();
        if (currentDate !== todayDateRef.current) {
          await refreshStats();
          await loadWeekPrayers();
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // ========================================
  // تحميل البيانات الأولية
  // ========================================
  
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        refreshTodayRecords(),
        refreshStats(),
        loadWeekPrayers(),
      ]);
    } catch (error) {
      console.error('Error loading initial worship data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // دوال التحديث
  // ========================================

  const refreshTodayRecords = useCallback(async () => {
    const today = getTodayDate();

    setTodayDate(today);
    
    const [prayer, fasting, quran, azkar] = await Promise.all([
      getPrayerRecord(today),
      getFastingRecord(today),
      getQuranRecord(today),
      getAzkarRecord(today),
    ]);

    // Smart auto-missed: if any prayer's window has fully expired and the user
    // hasn't recorded it, flip it to `missed` and persist so streak/stats stay
    // accurate. Already-recorded statuses are never overwritten.
    let prayerRecord = prayer || { ...defaultPrayerRecord, date: today };
    try {
      let times: PrayerTimesMap = extractScheduledTimes(prayerRecord);
      if (!times.fajr) {
        const cached = await getCachedPrayerTimes(today);
        if (cached) {
          times = {
            fajr: cached.fajr,
            dhuhr: cached.dhuhr,
            asr: cached.asr,
            maghrib: cached.maghrib,
            isha: cached.isha,
          };
        }
      }
      if (times.fajr) {
        const { record: reconciled, changed } = applyAutoMissed(prayerRecord, times);
        if (changed) {
          await savePrayerRecord(reconciled);
          prayerRecord = reconciled;
        }
      }
    } catch (error) {
      console.warn('[WorshipContext] auto-missed reconciliation failed:', error);
    }

    setTodayPrayer(prayerRecord);
    setTodayFasting(fasting);
    setTodayQuran(quran);
    setTodayAzkar(azkar || { ...defaultAzkarRecord, date: today });
  }, []);

  // Re-run auto-missed every minute while the app is in the foreground so the UI
  // flips a prayer to `missed` as soon as the next prayer's adhan starts.
  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        refreshTodayRecords().catch(() => {});
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [refreshTodayRecords]);

  const refreshStats = useCallback(async () => {
    const newStats = await getWorshipStats();
    setStats(newStats);
  }, []);

  const loadWeekPrayers = useCallback(async () => {
    const prayers = await getWeekPrayerRecords();
    setWeekPrayers(prayers);
  }, []);

  // ========================================
  // دوال الصلاة
  // ========================================

  const updatePrayer = useCallback(async (prayer: PrayerName, status: PrayerStatus) => {
    const today = getTodayDate();
    await updatePrayerStatus(today, prayer, status);

    // تحديث الحالة المحلية
    setTodayPrayer(prev => {
      if (!prev) return { ...defaultPrayerRecord, date: today, [prayer]: status };
      return { ...prev, [prayer]: status };
    });

    // تحديث سجلات الأسبوع
    await loadWeekPrayers();

    // تحديث الإحصائيات
    await refreshStats();

    // إلغاء إشعار "هل صليت؟" عند تسجيل الصلاة
    if (status === 'prayed' || status === 'late') {
      try { await Notifications.cancelScheduledNotificationAsync(`did_you_pray_${prayer}`); } catch {}
    }
  }, [loadWeekPrayers, refreshStats]);

  const updatePrayerWithTime = useCallback(async (prayer: PrayerName, status: PrayerStatus, scheduledTime?: string) => {
    const today = getTodayDate();
    await updatePrayerStatusWithTime(today, prayer, status, scheduledTime);

    setTodayPrayer(prev => {
      const base = prev || { ...defaultPrayerRecord, date: today };
      const updated = { ...base, [prayer]: status };
      if (scheduledTime) {
        updated.scheduledTimes = { ...updated.scheduledTimes, [prayer]: scheduledTime };
      }
      return updated;
    });

    await loadWeekPrayers();
    await refreshStats();

    if (status === 'prayed' || status === 'late') {
      try { await Notifications.cancelScheduledNotificationAsync(`did_you_pray_${prayer}`); } catch {}
    }
  }, [loadWeekPrayers, refreshStats]);

  const saveDayTimes = useCallback(async (date: string, times: { fajr?: string; dhuhr?: string; asr?: string; maghrib?: string; isha?: string }) => {
    await saveDayScheduledTimes(date, times);
    if (date === getTodayDate()) {
      setTodayPrayer(prev => {
        if (!prev) return null;
        return { ...prev, scheduledTimes: { ...prev.scheduledTimes, ...times } };
      });
    }
  }, []);

  const getHistoricalFajr = useCallback(async (days?: number) => {
    return await getHistoricalFajrTimes(days);
  }, []);

  const updatePrayerForDate = useCallback(async (date: string, prayer: PrayerName, status: PrayerStatus) => {
    await updatePrayerStatus(date, prayer, status);
    await loadWeekPrayers();
    await refreshStats();
    // If updating today, also refresh local state
    if (date === getTodayDate()) {
      setTodayPrayer(prev => {
        if (!prev) return { ...defaultPrayerRecord, date, [prayer]: status };
        return { ...prev, [prayer]: status };
      });
    }
  }, [loadWeekPrayers, refreshStats]);

  const getPrayerForDate = useCallback(async (date: string) => {
    return await getPrayerRecord(date);
  }, []);

  const getWeekPrayers = useCallback(async (startDate?: Date) => {
    return await getWeekPrayerRecords(startDate);
  }, []);

  const getMonthPrayers = useCallback(async (year: number, month: number) => {
    return await getMonthPrayerRecords(year, month);
  }, []);

  // ========================================
  // دوال الصيام
  // ========================================

  const toggleTodayFasting = useCallback(async (type?: DailyFastingRecord['type']) => {
    const today = getTodayDate();
    const result = await toggleFasting(today, type);
    
    // تحديث الحالة المحلية
    const newRecord = await getFastingRecord(today);
    setTodayFasting(newRecord);
    
    // تحديث الإحصائيات
    await refreshStats();
    
    return result;
  }, [refreshStats]);

  const toggleFastingForDate = useCallback(async (date: string, type?: DailyFastingRecord['type']) => {
    const result = await toggleFasting(date, type);
    await refreshStats();
    // If updating today, refresh local state too
    if (date === getTodayDate()) {
      const newRecord = await getFastingRecord(date);
      setTodayFasting(newRecord);
    }
    return result;
  }, [refreshStats]);

  const getFastingForDate = useCallback(async (date: string) => {
    return await getFastingRecord(date);
  }, []);

  // ========================================
  // دوال القرآن
  // ========================================

  const addPagesRead = useCallback(async (pages: number) => {
    const today = getTodayDate();
    await addQuranPages(today, pages);
    
    // تحديث الحالة المحلية
    const newRecord = await getQuranRecord(today);
    setTodayQuran(newRecord);
    
    // تحديث الإحصائيات
    await refreshStats();
  }, [refreshStats]);

  const updateQuranRecord = useCallback(async (updates: Partial<DailyQuranRecord>) => {
    const today = getTodayDate();
    let currentRecord = await getQuranRecord(today);
    
    if (!currentRecord) {
      currentRecord = { date: today, pagesRead: 0 };
    }
    
    const newRecord: DailyQuranRecord = {
      ...currentRecord,
      ...updates,
      date: today,
    };
    
    await saveQuranRecord(newRecord);
    setTodayQuran(newRecord);
    
    // تحديث الإحصائيات
    await refreshStats();
  }, [refreshStats]);

  const getQuranForDate = useCallback(async (date: string) => {
    return await getQuranRecord(date);
  }, []);

  // ========================================
  // دوال الأذكار
  // ========================================

  const toggleAzkarType = useCallback(async (type: keyof Omit<DailyAzkarRecord, 'date' | 'zikrCount'>) => {
    const today = getTodayDate();
    const result = await toggleAzkar(today, type);
    
    // تحديث الحالة المحلية
    const newRecord = await getAzkarRecord(today);
    setTodayAzkar(newRecord || { ...defaultAzkarRecord, date: today });
    
    // تحديث الإحصائيات
    await refreshStats();
    
    return result;
  }, [refreshStats]);

  const getAzkarForDate = useCallback(async (date: string) => {
    return await getAzkarRecord(date);
  }, []);

  const markAzkarDone = useCallback(async (type: keyof Omit<DailyAzkarRecord, 'date' | 'zikrCount'>) => {
    const today = getTodayDate();
    await markAzkarCompleted(today, type);
    // Refresh in-memory state so all consumers see the update immediately
    const newRecord = await getAzkarRecord(today);
    setTodayAzkar(newRecord || { ...defaultAzkarRecord, date: today });
    await refreshStats();
  }, [refreshStats]);

  // ========================================
  // دوال عامة
  // ========================================

  const clearAllData = useCallback(async () => {
    await clearAllWorshipData();
    
    // إعادة تعيين الحالات
    setTodayPrayer({ ...defaultPrayerRecord, date: todayDate });
    setTodayFasting(null);
    setTodayQuran(null);
    setTodayAzkar({ ...defaultAzkarRecord, date: todayDate });
    setWeekPrayers([]);
    setStats(defaultStats);
  }, [todayDate]);

  // ========================================
  // القيمة المقدمة
  // ========================================

  const value: WorshipContextType = {
    // الحالات
    isLoading,
    todayDate,
    stats,
    
    // سجلات اليوم
    todayPrayer,
    todayFasting,
    todayQuran,
    todayAzkar,
    
    // سجلات الأسبوع
    weekPrayers,
    
    // دوال الصلاة
    updatePrayer,
    updatePrayerWithTime,
    updatePrayerForDate,
    saveDayTimes,
    getHistoricalFajr,
    getPrayerForDate,
    getWeekPrayers,
    getMonthPrayers,
    
    // دوال الصيام
    toggleTodayFasting,
    toggleFastingForDate,
    getFastingForDate,
    
    // دوال القرآن
    addPagesRead,
    updateQuranRecord,
    getQuranForDate,
    
    // دوال الأذكار
    toggleAzkarType,
    markAzkarDone,
    getAzkarForDate,
    
    // دوال عامة
    refreshStats,
    refreshTodayRecords,
    clearAllData,
  };

  return (
    <WorshipContext.Provider value={value}>
      {children}
    </WorshipContext.Provider>
  );
};

// ========================================
// Hook للاستخدام
// ========================================

export const useWorship = (): WorshipContextType => {
  const context = useContext(WorshipContext);
  
  if (context === undefined) {
    throw new Error('useWorship must be used within a WorshipProvider');
  }
  
  return context;
};

// ========================================
// Hooks متخصصة
// ========================================

/**
 * Hook للصلاة فقط
 */
export const usePrayerTracker = () => {
  const {
    todayPrayer,
    weekPrayers,
    stats,
    updatePrayer,
    updatePrayerWithTime,
    updatePrayerForDate,
    saveDayTimes,
    getHistoricalFajr,
    getPrayerForDate,
    getWeekPrayers,
    getMonthPrayers,
    refreshTodayRecords,
  } = useWorship();
  
  return {
    todayPrayer,
    weekPrayers,
    prayerStats: stats?.prayer,
    updatePrayer,
    updatePrayerWithTime,
    updatePrayerForDate,
    saveDayTimes,
    getHistoricalFajr,
    getPrayerForDate,
    getWeekPrayers,
    getMonthPrayers,
    refreshTodayRecords,
  };
};

/**
 * Hook للصيام فقط
 */
export const useFastingTracker = () => {
  const {
    todayFasting,
    stats,
    toggleTodayFasting,
    toggleFastingForDate,
    getFastingForDate,
  } = useWorship();
  
  return {
    todayFasting,
    fastingStats: stats?.fasting,
    toggleTodayFasting,
    toggleFastingForDate,
    getFastingForDate,
    isFastingToday: todayFasting?.fasted ?? false,
  };
};

/**
 * Hook للقرآن فقط
 */
export const useQuranTracker = () => {
  const {
    todayQuran,
    stats,
    addPagesRead,
    updateQuranRecord,
    getQuranForDate,
  } = useWorship();
  
  return {
    todayQuran,
    quranStats: stats?.quran,
    addPagesRead,
    updateQuranRecord,
    getQuranForDate,
    todayPages: todayQuran?.pagesRead ?? 0,
  };
};

/**
 * Hook للأذكار فقط
 */
export const useAzkarTracker = () => {
  const {
    todayAzkar,
    stats,
    toggleAzkarType,
    markAzkarDone,
    getAzkarForDate,
  } = useWorship();
  
  return {
    todayAzkar,
    azkarStats: stats?.azkar,
    toggleAzkarType,
    markAzkarDone,
    getAzkarForDate,
  };
};

export default WorshipContext;
