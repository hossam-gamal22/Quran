// contexts/WorshipContext.tsx
// سياق متتبع العبادات - روح المسلم

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

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
  
  // الإحصائيات
  getWorshipStats,
  updateAllStats,
  
  // مساعدة
  getTodayDate,
  formatDate,
  clearAllWorshipData,
} from '@/lib/worship-storage';

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
  getPrayerForDate: (date: string) => Promise<DailyPrayerRecord | null>;
  getWeekPrayers: (startDate?: Date) => Promise<DailyPrayerRecord[]>;
  getMonthPrayers: (year: number, month: number) => Promise<DailyPrayerRecord[]>;
  
  // دوال الصيام
  toggleTodayFasting: (type?: DailyFastingRecord['type']) => Promise<boolean>;
  getFastingForDate: (date: string) => Promise<DailyFastingRecord | null>;
  
  // دوال القرآن
  addPagesRead: (pages: number) => Promise<void>;
  updateQuranRecord: (record: Partial<DailyQuranRecord>) => Promise<void>;
  getQuranForDate: (date: string) => Promise<DailyQuranRecord | null>;
  
  // دوال الأذكار
  toggleAzkarType: (type: keyof Omit<DailyAzkarRecord, 'date'>) => Promise<boolean>;
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
  const [todayDate] = useState(getTodayDate());
  const [stats, setStats] = useState<WorshipStats | null>(null);
  
  // سجلات اليوم
  const [todayPrayer, setTodayPrayer] = useState<DailyPrayerRecord | null>(null);
  const [todayFasting, setTodayFasting] = useState<DailyFastingRecord | null>(null);
  const [todayQuran, setTodayQuran] = useState<DailyQuranRecord | null>(null);
  const [todayAzkar, setTodayAzkar] = useState<DailyAzkarRecord | null>(null);
  
  // سجلات الأسبوع
  const [weekPrayers, setWeekPrayers] = useState<DailyPrayerRecord[]>([]);

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
    
    const [prayer, fasting, quran, azkar] = await Promise.all([
      getPrayerRecord(today),
      getFastingRecord(today),
      getQuranRecord(today),
      getAzkarRecord(today),
    ]);
    
    setTodayPrayer(prayer || { ...defaultPrayerRecord, date: today });
    setTodayFasting(fasting);
    setTodayQuran(quran);
    setTodayAzkar(azkar || { ...defaultAzkarRecord, date: today });
  }, []);

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

  const toggleAzkarType = useCallback(async (type: keyof Omit<DailyAzkarRecord, 'date'>) => {
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
    getPrayerForDate,
    getWeekPrayers,
    getMonthPrayers,
    
    // دوال الصيام
    toggleTodayFasting,
    getFastingForDate,
    
    // دوال القرآن
    addPagesRead,
    updateQuranRecord,
    getQuranForDate,
    
    // دوال الأذكار
    toggleAzkarType,
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
    getPrayerForDate,
    getWeekPrayers,
    getMonthPrayers,
  } = useWorship();
  
  return {
    todayPrayer,
    weekPrayers,
    prayerStats: stats?.prayer,
    updatePrayer,
    getPrayerForDate,
    getWeekPrayers,
    getMonthPrayers,
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
    getFastingForDate,
  } = useWorship();
  
  return {
    todayFasting,
    fastingStats: stats?.fasting,
    toggleTodayFasting,
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
    getAzkarForDate,
  } = useWorship();
  
  return {
    todayAzkar,
    azkarStats: stats?.azkar,
    toggleAzkarType,
    getAzkarForDate,
  };
};

export default WorshipContext;
