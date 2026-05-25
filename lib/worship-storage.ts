// lib/worship-storage.ts
// نظام تخزين وإدارة متتبع العبادات - روح المسلم

import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================
// الأنواع والواجهات
// ========================================

// أنواع العبادات
export type WorshipType = 'prayer' | 'fasting' | 'quran' | 'azkar';

// حالة الصلاة
export type PrayerStatus = 'prayed' | 'missed' | 'late' | 'none';

// أسماء الصلوات
export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

// سجل صلاة يوم واحد
export interface DailyPrayerRecord {
  date: string; // YYYY-MM-DD
  fajr: PrayerStatus;
  dhuhr: PrayerStatus;
  asr: PrayerStatus;
  maghrib: PrayerStatus;
  isha: PrayerStatus;
  tahajjud?: boolean;
  duha?: boolean;
  spihar?: boolean;
  // مواقيت الصلاة المجدولة لهذا اليوم (تُخزّن عند تسجيل الصلاة)
  scheduledTimes?: {
    fajr?: string;
    dhuhr?: string;
    asr?: string;
    maghrib?: string;
    isha?: string;
  };
}

// سجل صيام يوم واحد
export interface DailyFastingRecord {
  date: string;
  fasted: boolean;
  type?: 'ramadan' | 'voluntary' | 'making_up' | 'monday_thursday' | 'white_days' | 'makeup' | 'vow';
  notes?: string;
}

// سجل قراءة القرآن يوم واحد
export interface DailyQuranRecord {
  date: string;
  pagesRead: number;
  khatmaCompletions?: number;
  khatmaCompletionIds?: string[];
  versesRead?: number;
  surahsCompleted?: number[];
  khatmaProgress?: number;
  lastPage?: number;
  lastSurah?: number;
  lastVerse?: number;
  duration?: number; // بالدقائق
}

// سجل الأذكار يوم واحد
export interface DailyAzkarRecord {
  date: string;
  morning: boolean;
  evening: boolean;
  sleep: boolean;
  wakeup: boolean;
  afterPrayer: boolean;
  zikrCount?: number;
  completedZikrIds?: string[];
  typeCompletionSources?: Partial<Record<AzkarType, 'manual' | 'category'>>;
}

export type AzkarType = 'morning' | 'evening' | 'sleep' | 'wakeup' | 'afterPrayer';

// إحصائيات الصلاة
export interface PrayerStats {
  totalPrayers: number;
  prayedOnTime: number;
  prayedLate: number;
  missed: number;
  streak: number;
  bestStreak: number;
  percentage: number;
}

// إحصائيات الصيام
export interface FastingStats {
  totalDays: number;
  ramadanDays: number;
  voluntaryDays: number;
  currentStreak: number;
  bestStreak: number;
}

// إحصائيات القرآن
export interface QuranStats {
  totalPages: number;
  totalVerses: number;
  khatmasCompleted: number;
  averagePagesPerDay: number;
  currentStreak: number;
  bestStreak: number;
}

// إحصائيات الأذكار
export interface AzkarStats {
  morningCompleted: number;
  eveningCompleted: number;
  totalDays: number;
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
}

// الإحصائيات الشاملة
export interface WorshipStats {
  prayer: PrayerStats;
  fasting: FastingStats;
  quran: QuranStats;
  azkar: AzkarStats;
  lastUpdated: string;
}

// ========================================
// مفاتيح التخزين
// ========================================

const STORAGE_KEYS = {
  PRAYER_RECORDS: 'worship_prayer_records',
  FASTING_RECORDS: 'worship_fasting_records',
  QURAN_RECORDS: 'worship_quran_records',
  AZKAR_RECORDS: 'worship_azkar_records',
  WORSHIP_STATS: 'worship_stats',
  SETTINGS: 'worship_settings',
};

// ========================================
// دوال مساعدة للتاريخ
// ========================================

export const getTodayDate = (): string => {
  const today = new Date();
  return formatDate(today);
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const DAY_MS = 24 * 60 * 60 * 1000;

const dateKeyToUtcDay = (dateString: string): number => {
  const [year, month, day] = dateString.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
};

const differenceInCalendarDays = (newerDate: string, olderDate: string): number => {
  return dateKeyToUtcDay(newerDate) - dateKeyToUtcDay(olderDate);
};

const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
};

const calculateConsecutiveDateStreak = (dates: string[]): { currentStreak: number; bestStreak: number } => {
  const sortedDates = Array.from(new Set(dates))
    .filter(Boolean)
    .sort((a, b) => dateKeyToUtcDay(b) - dateKeyToUtcDay(a));

  if (sortedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  let bestStreak = 1;
  let activeRun = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const gap = differenceInCalendarDays(sortedDates[i - 1], sortedDates[i]);
    if (gap === 1) {
      activeRun++;
    } else {
      bestStreak = Math.max(bestStreak, activeRun);
      activeRun = 1;
    }
  }
  bestStreak = Math.max(bestStreak, activeRun);

  const latestDate = sortedDates[0];
  const currentCanContinue = latestDate === getTodayDate() || latestDate === getYesterdayDate();
  if (!currentCanContinue) {
    return { currentStreak: 0, bestStreak };
  }

  let currentStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const gap = differenceInCalendarDays(sortedDates[i - 1], sortedDates[i]);
    if (gap !== 1) break;
    currentStreak++;
  }

  return { currentStreak, bestStreak };
};

export const getWeekDates = (startDate: Date = new Date()): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay()); // بداية الأسبوع (الأحد)
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(formatDate(date));
  }
  return dates;
};

export const getMonthDates = (year: number, month: number): string[] => {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return dates;
};

// ========================================
// دوال سجلات الصلاة
// ========================================

/**
 * جلب سجل صلاة يوم معين
 */
export const getPrayerRecord = async (date: string): Promise<DailyPrayerRecord | null> => {
  try {
    const records = await getAllPrayerRecords();
    return records[date] || null;
  } catch (error) {
    console.error('Error getting prayer record:', error);
    return null;
  }
};

/**
 * جلب جميع سجلات الصلاة
 */
export const getAllPrayerRecords = async (): Promise<Record<string, DailyPrayerRecord>> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PRAYER_RECORDS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting all prayer records:', error);
    return {};
  }
};

/**
 * حفظ سجل صلاة
 */
export const savePrayerRecord = async (record: DailyPrayerRecord): Promise<void> => {
  try {
    const records = await getAllPrayerRecords();
    records[record.date] = record;
    await AsyncStorage.setItem(STORAGE_KEYS.PRAYER_RECORDS, JSON.stringify(records));
    await updatePrayerStats();
  } catch (error) {
    console.error('Error saving prayer record:', error);
  }
};

/**
 * تحديث حالة صلاة واحدة
 */
export const updatePrayerStatus = async (
  date: string,
  prayer: PrayerName,
  status: PrayerStatus
): Promise<void> => {
  try {
    let record = await getPrayerRecord(date);
    
    if (!record) {
      record = {
        date,
        fajr: 'none',
        dhuhr: 'none',
        asr: 'none',
        maghrib: 'none',
        isha: 'none',
      };
    }
    
    record[prayer] = status;
    await savePrayerRecord(record);
  } catch (error) {
    console.error('Error updating prayer status:', error);
  }
};

/**
 * تحديث حالة صلاة واحدة مع حفظ الوقت المُجدول
 */
export const updatePrayerStatusWithTime = async (
  date: string,
  prayer: PrayerName,
  status: PrayerStatus,
  scheduledTime?: string
): Promise<void> => {
  try {
    let record = await getPrayerRecord(date);
    
    if (!record) {
      record = {
        date,
        fajr: 'none',
        dhuhr: 'none',
        asr: 'none',
        maghrib: 'none',
        isha: 'none',
      };
    }
    
    record[prayer] = status;
    
    if (scheduledTime) {
      if (!record.scheduledTimes) record.scheduledTimes = {};
      record.scheduledTimes[prayer] = scheduledTime;
    }
    
    await savePrayerRecord(record);
  } catch (error) {
    console.error('Error updating prayer status with time:', error);
  }
};

/**
 * حفظ مواقيت الصلاة المُجدولة ليوم كامل
 */
export const saveDayScheduledTimes = async (
  date: string,
  times: { fajr?: string; dhuhr?: string; asr?: string; maghrib?: string; isha?: string }
): Promise<void> => {
  try {
    let record = await getPrayerRecord(date);
    
    if (!record) {
      record = {
        date,
        fajr: 'none',
        dhuhr: 'none',
        asr: 'none',
        maghrib: 'none',
        isha: 'none',
      };
    }
    
    record.scheduledTimes = { ...record.scheduledTimes, ...times };
    await savePrayerRecord(record);
  } catch (error) {
    console.error('Error saving scheduled times:', error);
  }
};

/**
 * جلب مواقيت الفجر التاريخية لعدد من الأيام الأخيرة
 */
export const getHistoricalFajrTimes = async (
  days: number = 30
): Promise<{ date: string; time: string; status: PrayerStatus }[]> => {
  try {
    const records = await getAllPrayerRecords();
    const results: { date: string; time: string; status: PrayerStatus }[] = [];
    
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = formatDate(d);
      const record = records[dateStr];
      
      if (record?.scheduledTimes?.fajr) {
        results.push({
          date: dateStr,
          time: record.scheduledTimes.fajr,
          status: record.fajr,
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error getting historical fajr times:', error);
    return [];
  }
};

/**
 * جلب سجلات الصلاة لأسبوع
 */
export const getWeekPrayerRecords = async (startDate?: Date): Promise<DailyPrayerRecord[]> => {
  const dates = getWeekDates(startDate);
  const records = await getAllPrayerRecords();
  
  return dates.map(date => records[date] || {
    date,
    fajr: 'none',
    dhuhr: 'none',
    asr: 'none',
    maghrib: 'none',
    isha: 'none',
  });
};

/**
 * جلب سجلات الصلاة لشهر
 */
export const getMonthPrayerRecords = async (
  year: number,
  month: number
): Promise<DailyPrayerRecord[]> => {
  const dates = getMonthDates(year, month);
  const records = await getAllPrayerRecords();
  
  return dates.map(date => records[date] || {
    date,
    fajr: 'none',
    dhuhr: 'none',
    asr: 'none',
    maghrib: 'none',
    isha: 'none',
  });
};

// ========================================
// دوال سجلات الصيام
// ========================================

/**
 * جلب سجل صيام يوم معين
 */
export const getFastingRecord = async (date: string): Promise<DailyFastingRecord | null> => {
  try {
    const records = await getAllFastingRecords();
    return records[date] || null;
  } catch (error) {
    console.error('Error getting fasting record:', error);
    return null;
  }
};

/**
 * جلب جميع سجلات الصيام
 */
export const getAllFastingRecords = async (): Promise<Record<string, DailyFastingRecord>> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FASTING_RECORDS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting all fasting records:', error);
    return {};
  }
};

/**
 * حفظ سجل صيام
 */
export const saveFastingRecord = async (record: DailyFastingRecord): Promise<void> => {
  try {
    const records = await getAllFastingRecords();
    records[record.date] = record;
    await AsyncStorage.setItem(STORAGE_KEYS.FASTING_RECORDS, JSON.stringify(records));
    await updateFastingStats();
  } catch (error) {
    console.error('Error saving fasting record:', error);
  }
};

/**
 * تسجيل صيام اليوم
 */
export const toggleFasting = async (
  date: string,
  type: DailyFastingRecord['type'] = 'voluntary'
): Promise<boolean> => {
  try {
    const record = await getFastingRecord(date);
    
    if (record?.fasted) {
      // إلغاء الصيام
      await saveFastingRecord({ date, fasted: false });
      return false;
    } else {
      // تسجيل الصيام
      await saveFastingRecord({ date, fasted: true, type });
      return true;
    }
  } catch (error) {
    console.error('Error toggling fasting:', error);
    return false;
  }
};

// ========================================
// دوال سجلات القرآن
// ========================================

/**
 * جلب سجل قرآن يوم معين
 */
export const getQuranRecord = async (date: string): Promise<DailyQuranRecord | null> => {
  try {
    const records = await getAllQuranRecords();
    return records[date] || null;
  } catch (error) {
    console.error('Error getting quran record:', error);
    return null;
  }
};

/**
 * جلب جميع سجلات القرآن
 */
export const getAllQuranRecords = async (): Promise<Record<string, DailyQuranRecord>> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.QURAN_RECORDS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting all quran records:', error);
    return {};
  }
};

/**
 * حفظ سجل قرآن
 */
export const saveQuranRecord = async (record: DailyQuranRecord): Promise<void> => {
  try {
    const records = await getAllQuranRecords();
    records[record.date] = record;
    await AsyncStorage.setItem(STORAGE_KEYS.QURAN_RECORDS, JSON.stringify(records));
    await updateQuranStats();
  } catch (error) {
    console.error('Error saving quran record:', error);
  }
};

/**
 * إضافة صفحات مقروءة
 */
export const addQuranPages = async (date: string, pages: number): Promise<void> => {
  try {
    let record = await getQuranRecord(date);
    
    if (!record) {
      record = { date, pagesRead: 0 };
    }
    
    const currentPages = Number(record.pagesRead) || 0;
    const nextPages = currentPages + (Number(pages) || 0);
    record.pagesRead = Math.max(0, Math.min(604, nextPages));
    await saveQuranRecord(record);
  } catch (error) {
    console.error('Error adding quran pages:', error);
  }
};

/**
 * تسجيل ختمة مكتملة مرة واحدة لكل دورة/معرّف داخل اليوم.
 */
export const recordKhatmaCompletion = async (
  date: string,
  completionId?: string
): Promise<boolean> => {
  try {
    let record = await getQuranRecord(date);

    if (!record) {
      record = { date, pagesRead: 0 };
    }

    const ids = Array.isArray(record.khatmaCompletionIds)
      ? [...record.khatmaCompletionIds]
      : [];

    if (completionId) {
      if (ids.includes(completionId)) return false;
      ids.push(completionId);
      record.khatmaCompletionIds = ids;
      record.khatmaCompletions = Math.max(Number(record.khatmaCompletions) || 0, ids.length);
    } else {
      record.khatmaCompletions = (Number(record.khatmaCompletions) || ids.length || 0) + 1;
    }

    await saveQuranRecord(record);
    return true;
  } catch (error) {
    console.error('Error recording khatma completion:', error);
    return false;
  }
};

export const removeKhatmaCompletion = async (
  date: string,
  completionId: string
): Promise<boolean> => {
  try {
    const record = await getQuranRecord(date);
    if (!record?.khatmaCompletionIds?.includes(completionId)) return false;

    record.khatmaCompletionIds = record.khatmaCompletionIds.filter(id => id !== completionId);
    record.khatmaCompletions = Math.max(0, (Number(record.khatmaCompletions) || 0) - 1);
    await saveQuranRecord(record);
    return true;
  } catch (error) {
    console.error('Error removing khatma completion:', error);
    return false;
  }
};

// ========================================
// دوال سجلات الأذكار
// ========================================

/**
 * جلب سجل أذكار يوم معين
 */
export const getAzkarRecord = async (date: string): Promise<DailyAzkarRecord | null> => {
  try {
    const records = await getAllAzkarRecords();
    return records[date] || null;
  } catch (error) {
    console.error('Error getting azkar record:', error);
    return null;
  }
};

/**
 * جلب جميع سجلات الأذكار
 */
export const getAllAzkarRecords = async (): Promise<Record<string, DailyAzkarRecord>> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.AZKAR_RECORDS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting all azkar records:', error);
    return {};
  }
};

/**
 * حفظ سجل أذكار
 */
export const saveAzkarRecord = async (record: DailyAzkarRecord): Promise<void> => {
  try {
    const records = await getAllAzkarRecords();
    records[record.date] = record;
    await AsyncStorage.setItem(STORAGE_KEYS.AZKAR_RECORDS, JSON.stringify(records));
    await updateAzkarStats();
  } catch (error) {
    console.error('Error saving azkar record:', error);
  }
};

/**
 * تحديث حالة ذكر
 */
export const toggleAzkar = async (
  date: string,
  type: AzkarType
): Promise<boolean> => {
  try {
    let record = await getAzkarRecord(date);
    
    if (!record) {
      record = {
        date,
        morning: false,
        evening: false,
        sleep: false,
        wakeup: false,
        afterPrayer: false,
        zikrCount: 0,
      };
    }
    
    record[type] = !record[type];
    record.typeCompletionSources = { ...(record.typeCompletionSources || {}) };
    if (record[type]) {
      record.typeCompletionSources[type] = 'manual';
    } else {
      delete record.typeCompletionSources[type];
    }
    await saveAzkarRecord(record);
    return record[type];
  } catch (error) {
    console.error('Error toggling azkar:', error);
    return false;
  }
};

/**
 * تسجيل إكمال أذكار (بدون toggle — يسجل true فقط)
 */
export const markAzkarCompleted = async (
  date: string,
  type: AzkarType,
  source: 'manual' | 'category' = 'manual'
): Promise<void> => {
  try {
    let record = await getAzkarRecord(date);
    if (!record) {
      record = {
        date,
        morning: false,
        evening: false,
        sleep: false,
        wakeup: false,
        afterPrayer: false,
        zikrCount: 0,
      };
    }
    if (!record[type]) {
      record[type] = true;
      record.typeCompletionSources = {
        ...(record.typeCompletionSources || {}),
        [type]: source,
      };
      await saveAzkarRecord(record);
    } else if (!record.typeCompletionSources?.[type]) {
      record.typeCompletionSources = {
        ...(record.typeCompletionSources || {}),
        [type]: source,
      };
      await saveAzkarRecord(record);
    }
  } catch (error) {
    console.error('Error marking azkar completed:', error);
  }
};

/**
 * زيادة عداد الأذكار المقروءة (ذكر واحد مكتمل = +1)
 */
export const incrementAzkarZikrCount = async (
  date: string,
  zikrKey?: string
): Promise<boolean> => {
  try {
    let record = await getAzkarRecord(date);
    if (!record) {
      record = {
        date,
        morning: false,
        evening: false,
        sleep: false,
        wakeup: false,
        afterPrayer: false,
        zikrCount: 0,
      };
    }
    if (zikrKey) {
      const completedZikrIds = Array.isArray(record.completedZikrIds)
        ? [...record.completedZikrIds]
        : [];
      if (completedZikrIds.includes(zikrKey)) return false;
      completedZikrIds.push(zikrKey);
      record.completedZikrIds = completedZikrIds;
    }
    record.zikrCount = (record.zikrCount || 0) + 1;
    await saveAzkarRecord(record);
    return true;
  } catch (error) {
    console.error('Error incrementing azkar zikr count:', error);
    return false;
  }
};

/**
 * إلغاء ذكر مكتمل تم تسجيله بمفتاح يومي محدد.
 */
export const removeAzkarZikrCompletion = async (
  date: string,
  zikrKey: string
): Promise<boolean> => {
  try {
    const record = await getAzkarRecord(date);
    if (!record?.completedZikrIds?.includes(zikrKey)) return false;

    record.completedZikrIds = record.completedZikrIds.filter(id => id !== zikrKey);
    record.zikrCount = Math.max(0, (Number(record.zikrCount) || 0) - 1);
    await saveAzkarRecord(record);
    return true;
  } catch (error) {
    console.error('Error removing azkar zikr completion:', error);
    return false;
  }
};

// ========================================
// دوال الإحصائيات
// ========================================

/**
 * حساب إحصائيات الصلاة
 */
export const calculatePrayerStats = async (): Promise<PrayerStats> => {
  const records = await getAllPrayerRecords();
  const recordsList = Object.values(records);
  
  let totalPrayers = 0;
  let prayedOnTime = 0;
  let prayedLate = 0;
  let missed = 0;
  
  const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  
  recordsList.forEach(record => {
    prayers.forEach(prayer => {
      const status = record[prayer];
      if (status !== 'none') {
        totalPrayers++;
        if (status === 'prayed') prayedOnTime++;
        else if (status === 'late') prayedLate++;
        else if (status === 'missed') missed++;
      }
    });
  });
  
  // حساب السلسلة
  const { streak, bestStreak } = calculatePrayerStreak(recordsList);
  
  const percentage = totalPrayers > 0 
    ? Math.round(((prayedOnTime + prayedLate) / totalPrayers) * 100) 
    : 0;
  
  return {
    totalPrayers,
    prayedOnTime,
    prayedLate,
    missed,
    streak,
    bestStreak,
    percentage,
  };
};

/**
 * حساب سلسلة الصلاة
 */
const calculatePrayerStreak = (records: DailyPrayerRecord[]): { streak: number; bestStreak: number } => {
  const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const completeDates = records
    .filter(record => prayers.every(p =>
      record[p] === 'prayed' || record[p] === 'late'
    ))
    .map(record => record.date);

  const { currentStreak, bestStreak } = calculateConsecutiveDateStreak(completeDates);
  return { streak: currentStreak, bestStreak };
};

/**
 * حساب إحصائيات الصيام
 */
export const calculateFastingStats = async (): Promise<FastingStats> => {
  const records = await getAllFastingRecords();
  const recordsList = Object.values(records).filter(r => r.fasted);
  
  const ramadanDays = recordsList.filter(r => r.type === 'ramadan').length;
  const voluntaryDays = recordsList.filter(r => r.type !== 'ramadan').length;
  
  const { currentStreak, bestStreak } = calculateConsecutiveDateStreak(
    recordsList.map(record => record.date)
  );
  
  return {
    totalDays: recordsList.length,
    ramadanDays,
    voluntaryDays,
    currentStreak,
    bestStreak,
  };
};

/**
 * حساب إحصائيات القرآن
 */
export const calculateQuranStats = async (): Promise<QuranStats> => {
  const records = await getAllQuranRecords();
  const recordsList = Object.values(records);
  
  const totalPages = recordsList.reduce((sum, r) => sum + (r.pagesRead || 0), 0);
  const totalVerses = recordsList.reduce((sum, r) => sum + (r.versesRead || 0), 0);
  const khatmasCompleted = Math.floor(totalPages / 604);
  
  const daysWithReading = recordsList.filter(r => r.pagesRead > 0).length;
  const averagePagesPerDay = daysWithReading > 0 
    ? Math.round((totalPages / daysWithReading) * 10) / 10 
    : 0;
  
  const readingDates = recordsList
    .filter(r => r.pagesRead > 0)
    .map(record => record.date);
  const { currentStreak, bestStreak } = calculateConsecutiveDateStreak(readingDates);
  
  return {
    totalPages,
    totalVerses,
    khatmasCompleted,
    averagePagesPerDay,
    currentStreak,
    bestStreak,
  };
};

/**
 * حساب إحصائيات الأذكار
 */
export const calculateAzkarStats = async (): Promise<AzkarStats> => {
  const records = await getAllAzkarRecords();
  const recordsList = Object.values(records);
  
  const morningCompleted = recordsList.filter(r => r.morning).length;
  const eveningCompleted = recordsList.filter(r => r.evening).length;
  const totalDays = recordsList.length;
  
  const completionRate = totalDays > 0
    ? Math.round(((morningCompleted + eveningCompleted) / (totalDays * 2)) * 100)
    : 0;
  
  const completedDates = recordsList
    .filter(r => r.morning && r.evening)
    .map(record => record.date);
  const { currentStreak, bestStreak } = calculateConsecutiveDateStreak(completedDates);
  
  return {
    morningCompleted,
    eveningCompleted,
    totalDays,
    currentStreak,
    bestStreak,
    completionRate,
  };
};

/**
 * تحديث جميع الإحصائيات
 */
export const updateAllStats = async (): Promise<WorshipStats> => {
  const [prayer, fasting, quran, azkar] = await Promise.all([
    calculatePrayerStats(),
    calculateFastingStats(),
    calculateQuranStats(),
    calculateAzkarStats(),
  ]);
  
  const stats: WorshipStats = {
    prayer,
    fasting,
    quran,
    azkar,
    lastUpdated: new Date().toISOString(),
  };
  
  await AsyncStorage.setItem(STORAGE_KEYS.WORSHIP_STATS, JSON.stringify(stats));
  
  return stats;
};

// دوال تحديث فردية
const updatePrayerStats = async () => {
  const stats = await getWorshipStats();
  stats.prayer = await calculatePrayerStats();
  stats.lastUpdated = new Date().toISOString();
  await AsyncStorage.setItem(STORAGE_KEYS.WORSHIP_STATS, JSON.stringify(stats));
};

const updateFastingStats = async () => {
  const stats = await getWorshipStats();
  stats.fasting = await calculateFastingStats();
  stats.lastUpdated = new Date().toISOString();
  await AsyncStorage.setItem(STORAGE_KEYS.WORSHIP_STATS, JSON.stringify(stats));
};

const updateQuranStats = async () => {
  const stats = await getWorshipStats();
  stats.quran = await calculateQuranStats();
  stats.lastUpdated = new Date().toISOString();
  await AsyncStorage.setItem(STORAGE_KEYS.WORSHIP_STATS, JSON.stringify(stats));
};

const updateAzkarStats = async () => {
  const stats = await getWorshipStats();
  stats.azkar = await calculateAzkarStats();
  stats.lastUpdated = new Date().toISOString();
  await AsyncStorage.setItem(STORAGE_KEYS.WORSHIP_STATS, JSON.stringify(stats));
};

/**
 * جلب الإحصائيات المحفوظة
 */
export const getWorshipStats = async (): Promise<WorshipStats> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WORSHIP_STATS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error getting worship stats:', error);
  }
  
  // إرجاع إحصائيات فارغة
  return {
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
};

/**
 * مسح جميع البيانات
 */
export const clearAllWorshipData = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.PRAYER_RECORDS),
      AsyncStorage.removeItem(STORAGE_KEYS.FASTING_RECORDS),
      AsyncStorage.removeItem(STORAGE_KEYS.QURAN_RECORDS),
      AsyncStorage.removeItem(STORAGE_KEYS.AZKAR_RECORDS),
      AsyncStorage.removeItem(STORAGE_KEYS.WORSHIP_STATS),
    ]);
  } catch (error) {
    console.error('Error clearing worship data:', error);
  }
};

export default {
  // الصلاة
  getPrayerRecord,
  getAllPrayerRecords,
  savePrayerRecord,
  updatePrayerStatus,
  getWeekPrayerRecords,
  getMonthPrayerRecords,
  
  // الصيام
  getFastingRecord,
  getAllFastingRecords,
  saveFastingRecord,
  toggleFasting,
  
  // القرآن
  getQuranRecord,
  getAllQuranRecords,
  saveQuranRecord,
  addQuranPages,
  recordKhatmaCompletion,
  removeKhatmaCompletion,
  
  // الأذكار
  getAzkarRecord,
  getAllAzkarRecords,
  saveAzkarRecord,
  toggleAzkar,
  markAzkarCompleted,
  incrementAzkarZikrCount,
  removeAzkarZikrCompletion,
  
  // الإحصائيات
  calculatePrayerStats,
  calculateFastingStats,
  calculateQuranStats,
  calculateAzkarStats,
  updateAllStats,
  getWorshipStats,
  
  // عام
  clearAllWorshipData,
  getTodayDate,
  formatDate,
  getWeekDates,
  getMonthDates,
  getMonthlyActivityStats,
};

// ========================================
// إحصائيات النشاط الشهري (مصدر موحّد)
// ========================================

export interface MonthlyActivityStats {
  prayers: number;
  quranPages: number;
  khatmas: number;
  azkar: number;
  tasbih: number;
  fasting: number;
}

/**
 * Single source of truth for monthly activity counts.
 * Used by honor board, backup page, and any screen needing current-month stats.
 */
export async function getMonthlyActivityStats(year?: number, month?: number): Promise<MonthlyActivityStats> {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? (now.getMonth() + 1);
  const monthPrefix = `${y}-${String(m).padStart(2, '0')}`;

  const stats: MonthlyActivityStats = { prayers: 0, quranPages: 0, khatmas: 0, azkar: 0, tasbih: 0, fasting: 0 };

  // 1. Prayers — count individual prayer events (prayed or late)
  try {
    const prayerRecords = await getMonthPrayerRecords(y, m);
    const prayerNames: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const record of prayerRecords) {
      for (const p of prayerNames) {
        if (record[p] === 'prayed' || record[p] === 'late') stats.prayers++;
      }
    }
  } catch {}

  // 2. Quran pages — sum pagesRead for the month
  try {
    const quranRecords = await getAllQuranRecords();
    for (const [date, record] of Object.entries(quranRecords)) {
      if (date.startsWith(monthPrefix) && record && typeof record === 'object') {
        stats.quranPages += (record as any).pagesRead || 0;
        const khatmaIds = Array.isArray((record as any).khatmaCompletionIds)
          ? (record as any).khatmaCompletionIds.length
          : 0;
        const khatmaCompletions = Number((record as any).khatmaCompletions) || 0;
        stats.khatmas += Math.max(khatmaCompletions, khatmaIds);
      }
    }
  } catch {}

  // 3. Fasting — count each fasted day once
  try {
    const fastingRecords = await getAllFastingRecords();
    for (const [date, record] of Object.entries(fastingRecords)) {
      if (date.startsWith(monthPrefix) && record?.fasted) {
        stats.fasting++;
      }
    }
  } catch {}

  // 4. Tasbih — daily history (previous days) + type stats (today), avoid double-counting
  try {
    const historyRaw = await AsyncStorage.getItem('@tasbih_daily_history');
    if (historyRaw) {
      const history = JSON.parse(historyRaw);
      for (const [date, dayData] of Object.entries(history)) {
        if (date.startsWith(monthPrefix) && dayData && typeof dayData === 'object') {
          for (const count of Object.values(dayData as Record<string, number>)) {
            stats.tasbih += (typeof count === 'number' ? count : 0);
          }
        }
      }
    }

    const typeStatsRaw = await AsyncStorage.getItem('tasbih_type_stats');
    if (typeStatsRaw) {
      const typeStats = JSON.parse(typeStatsRaw);
      const historyData = historyRaw ? JSON.parse(historyRaw) : {};
      for (const [date, dayData] of Object.entries(typeStats)) {
        if (date.startsWith(monthPrefix) && dayData && typeof dayData === 'object') {
          if (!historyData[date]) {
            for (const count of Object.values(dayData as Record<string, number>)) {
              stats.tasbih += (typeof count === 'number' ? count : 0);
            }
          }
        }
      }
    }
  } catch {}

	  // 5. Azkar — new records can distinguish manual checklist marks from
	  // auto category completion. Old records cannot, so use the larger value
	  // to avoid losing legitimate same-day activity without double-counting.
  try {
    const azkarRecords = await getAllAzkarRecords();
    for (const [date, record] of Object.entries(azkarRecords)) {
      if (date.startsWith(monthPrefix) && record && typeof record === 'object') {
        const typeKeys: AzkarType[] = ['morning', 'evening', 'sleep', 'wakeup', 'afterPrayer'];
        const completedTypes = typeKeys.filter(type => record[type]).length;
        const zikrCount = Number((record as any).zikrCount) || 0;
        const hasSourceData = !!record.typeCompletionSources;
        if (hasSourceData) {
          const manualTypes = typeKeys.filter(type => (
            record[type] && record.typeCompletionSources?.[type] !== 'category'
          )).length;
          stats.azkar += zikrCount + manualTypes;
	        } else {
	          stats.azkar += Math.max(zikrCount, completedTypes);
	        }
      }
    }
  } catch {}

  return stats;
}
