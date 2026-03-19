import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== STORAGE KEYS =====
const KHATMA_STORAGE_KEY = '@rooh_muslim_khatmas';
const ACTIVE_KHATMA_KEY = '@rooh_muslim_active_khatma';

// ===== TYPES =====
export interface Khatma {
  id: string;
  name: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  durationDays: number;
  totalPages: number; // 604 pages in Quran
  pagesPerDay: number;
  currentPage: number;
  completedDays: number;
  lastReadDate: string | null;
  dailyProgress: DailyProgress[];
  isCompleted: boolean;
  createdAt: string;
  reminderTime: string | null; // "HH:mm" format
  reminderEnabled: boolean;
  readPages: number[]; // Unique page numbers (1-604) that have been read
}

export interface DailyProgress {
  date: string; // ISO date string
  pagesRead: number;
  completed: boolean;
}

export interface KhatmaDuration {
  id: string;
  name: string;
  nameAr: string;
  days: number;
  pagesPerDay: number;
}

// ===== PREDEFINED DURATIONS =====
export const KHATMA_DURATIONS: KhatmaDuration[] = [
  { id: '7days', name: '1 Week', nameAr: 'أسبوع واحد', days: 7, pagesPerDay: 87 },
  { id: '14days', name: '2 Weeks', nameAr: 'أسبوعين', days: 14, pagesPerDay: 44 },
  { id: '30days', name: '1 Month', nameAr: 'شهر واحد', days: 30, pagesPerDay: 21 },
  { id: '60days', name: '2 Months', nameAr: 'شهرين', days: 60, pagesPerDay: 11 },
  { id: '90days', name: '3 Months', nameAr: '3 أشهر', days: 90, pagesPerDay: 7 },
  { id: '120days', name: '4 Months', nameAr: '4 أشهر', days: 120, pagesPerDay: 6 },
  { id: '180days', name: '6 Months', nameAr: '6 أشهر', days: 180, pagesPerDay: 4 },
  { id: '240days', name: '8 Months', nameAr: '8 أشهر', days: 240, pagesPerDay: 3 },
  { id: '365days', name: '1 Year', nameAr: 'سنة كاملة', days: 365, pagesPerDay: 2 },
];

// ===== TOTAL QURAN PAGES =====
export const TOTAL_QURAN_PAGES = 604;

// ===== HELPER FUNCTIONS =====
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const calculateEndDate = (startDate: Date, days: number): string => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  return endDate.toISOString().split('T')[0];
};

const getDaysDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ===== STORAGE FUNCTIONS =====

/**
 * Get all saved khatmas
 */
export const getAllKhatmas = async (): Promise<Khatma[]> => {
  try {
    const data = await AsyncStorage.getItem(KHATMA_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error getting khatmas:', error);
    return [];
  }
};

/**
 * Save all khatmas
 */
export const saveAllKhatmas = async (khatmas: Khatma[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(KHATMA_STORAGE_KEY, JSON.stringify(khatmas));
    return true;
  } catch (error) {
    console.error('Error saving khatmas:', error);
    return false;
  }
};

/**
 * Create a new khatma
 */
export const createKhatma = async (
  name: string,
  duration: KhatmaDuration,
  reminderTime: string | null = null
): Promise<Khatma | null> => {
  try {
    const now = new Date();
    const startDate = getTodayDateString();
    
    const newKhatma: Khatma = {
      id: generateId(),
      name: name || `ختمة ${duration.nameAr}`,
      startDate,
      endDate: calculateEndDate(now, duration.days),
      durationDays: duration.days,
      totalPages: TOTAL_QURAN_PAGES,
      pagesPerDay: duration.pagesPerDay,
      currentPage: 1,
      completedDays: 0,
      lastReadDate: null,
      dailyProgress: [],
      isCompleted: false,
      createdAt: now.toISOString(),
      reminderTime,
      reminderEnabled: reminderTime !== null,
      readPages: [],
    };

    const khatmas = await getAllKhatmas();
    khatmas.push(newKhatma);
    await saveAllKhatmas(khatmas);
    
    // Set as active khatma
    await setActiveKhatma(newKhatma.id);
    
    return newKhatma;
  } catch (error) {
    console.error('Error creating khatma:', error);
    return null;
  }
};

/**
 * Get a specific khatma by ID
 */
export const getKhatma = async (id: string): Promise<Khatma | null> => {
  try {
    const khatmas = await getAllKhatmas();
    return khatmas.find((k) => k.id === id) || null;
  } catch (error) {
    console.error('Error getting khatma:', error);
    return null;
  }
};

/**
 * Update a khatma
 */
export const updateKhatma = async (updatedKhatma: Khatma): Promise<boolean> => {
  try {
    const khatmas = await getAllKhatmas();
    const index = khatmas.findIndex((k) => k.id === updatedKhatma.id);
    
    if (index !== -1) {
      khatmas[index] = updatedKhatma;
      await saveAllKhatmas(khatmas);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating khatma:', error);
    return false;
  }
};

/**
 * Delete a khatma
 */
export const deleteKhatma = async (id: string): Promise<boolean> => {
  try {
    const khatmas = await getAllKhatmas();
    const filtered = khatmas.filter((k) => k.id !== id);
    await saveAllKhatmas(filtered);
    
    // If deleted khatma was active, clear active
    const activeId = await getActiveKhatmaId();
    if (activeId === id) {
      await AsyncStorage.removeItem(ACTIVE_KHATMA_KEY);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting khatma:', error);
    return false;
  }
};

/**
 * Set active khatma
 */
export const setActiveKhatma = async (id: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(ACTIVE_KHATMA_KEY, id);
    return true;
  } catch (error) {
    console.error('Error setting active khatma:', error);
    return false;
  }
};

/**
 * Get active khatma ID
 */
export const getActiveKhatmaId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ACTIVE_KHATMA_KEY);
  } catch (error) {
    console.error('Error getting active khatma ID:', error);
    return null;
  }
};

/**
 * Get active khatma
 */
export const getActiveKhatma = async (): Promise<Khatma | null> => {
  try {
    const activeId = await getActiveKhatmaId();
    if (activeId) {
      return await getKhatma(activeId);
    }
    return null;
  } catch (error) {
    console.error('Error getting active khatma:', error);
    return null;
  }
};

/**
 * Ensure readPages array exists (backward compat for old khatmas)
 */
const ensureReadPages = (khatma: Khatma): number[] => {
  if (!khatma.readPages) {
    // Migrate: if currentPage > 1, assume pages 1..(currentPage-1) were read
    const pages: number[] = [];
    for (let i = 1; i < khatma.currentPage; i++) {
      pages.push(i);
    }
    return pages;
  }
  return [...khatma.readPages];
};

/**
 * Record reading specific page numbers (Set-based, no duplicates)
 */
export const recordPageRead = async (
  khatmaId: string,
  pageNumbers: number[]
): Promise<Khatma | null> => {
  try {
    const khatma = await getKhatma(khatmaId);
    if (!khatma || khatma.isCompleted) return khatma;

    const readSet = new Set(ensureReadPages(khatma));
    let newPagesCount = 0;

    for (const page of pageNumbers) {
      if (page >= 1 && page <= TOTAL_QURAN_PAGES && !readSet.has(page)) {
        readSet.add(page);
        newPagesCount++;
      }
    }

    // No new pages were added — nothing to update
    if (newPagesCount === 0) return khatma;

    khatma.readPages = Array.from(readSet).sort((a, b) => a - b);
    khatma.currentPage = khatma.readPages.length + 1; // next unread page position
    if (khatma.currentPage > TOTAL_QURAN_PAGES) {
      khatma.currentPage = TOTAL_QURAN_PAGES;
    }
    khatma.lastReadDate = getTodayDateString();

    // Update daily progress
    const today = getTodayDateString();
    const todayProgress = khatma.dailyProgress.find((p) => p.date === today);
    if (todayProgress) {
      todayProgress.pagesRead += newPagesCount;
      todayProgress.completed = todayProgress.pagesRead >= khatma.pagesPerDay;
    } else {
      khatma.dailyProgress.push({
        date: today,
        pagesRead: newPagesCount,
        completed: newPagesCount >= khatma.pagesPerDay,
      });
      khatma.completedDays++;
    }

    // Check if khatma is completed (all 604 pages read)
    if (khatma.readPages.length >= TOTAL_QURAN_PAGES) {
      khatma.isCompleted = true;
    }

    await updateKhatma(khatma);
    return khatma;
  } catch (error) {
    console.error('Error recording page read:', error);
    return null;
  }
};

/**
 * Record daily progress (legacy wrapper — converts page count to page numbers)
 */
export const recordDailyProgress = async (
  khatmaId: string,
  pagesRead: number
): Promise<Khatma | null> => {
  try {
    const khatma = await getKhatma(khatmaId);
    if (!khatma || khatma.isCompleted) return khatma;

    const readSet = new Set(ensureReadPages(khatma));

    // Find the next N unread pages
    const pagesToMark: number[] = [];
    for (let p = 1; p <= TOTAL_QURAN_PAGES && pagesToMark.length < pagesRead; p++) {
      if (!readSet.has(p)) {
        pagesToMark.push(p);
      }
    }

    if (pagesToMark.length === 0) return khatma;

    return await recordPageRead(khatmaId, pagesToMark);
  } catch (error) {
    console.error('Error recording progress:', error);
    return null;
  }
};

/**
 * Mark today's wird as complete
 */
export const completeTodayWird = async (khatmaId: string): Promise<Khatma | null> => {
  try {
    const khatma = await getKhatma(khatmaId);
    if (!khatma) return null;

    return await recordDailyProgress(khatmaId, khatma.pagesPerDay);
  } catch (error) {
    console.error('Error completing wird:', error);
    return null;
  }
};

/**
 * Get today's wird info
 */
export const getTodayWird = (khatma: Khatma): {
  startPage: number;
  endPage: number;
  pagesRemaining: number;
  isCompleted: boolean;
} => {
  const today = getTodayDateString();
  const todayProgress = khatma.dailyProgress.find((p) => p.date === today);
  const readSet = new Set(ensureReadPages(khatma));

  // Find the first unread page as start
  let startPage = 1;
  for (let p = 1; p <= TOTAL_QURAN_PAGES; p++) {
    if (!readSet.has(p)) {
      startPage = p;
      break;
    }
  }

  const pagesReadToday = todayProgress?.pagesRead || 0;
  const endPage = Math.min(startPage + khatma.pagesPerDay - 1, TOTAL_QURAN_PAGES);
  const pagesRemaining = Math.max(khatma.pagesPerDay - pagesReadToday, 0);

  return {
    startPage,
    endPage,
    pagesRemaining,
    isCompleted: todayProgress?.completed || false,
  };
};

/**
 * Get khatma statistics
 */
export const getKhatmaStats = (khatma: Khatma): {
  progressPercentage: number;
  pagesRead: number;
  pagesRemaining: number;
  daysRemaining: number;
  daysElapsed: number;
  isOnTrack: boolean;
  expectedPage: number;
} => {
  const today = getTodayDateString();
  const daysElapsed = getDaysDifference(khatma.startDate, today);
  const daysRemaining = Math.max(khatma.durationDays - daysElapsed, 0);

  const readPages = ensureReadPages(khatma);
  const pagesRead = readPages.length;
  const pagesRemaining = TOTAL_QURAN_PAGES - pagesRead;
  const progressPercentage = Math.round((pagesRead / TOTAL_QURAN_PAGES) * 100);
  
  // Expected page based on elapsed days
  const expectedPage = Math.min(
    Math.round(daysElapsed * khatma.pagesPerDay),
    TOTAL_QURAN_PAGES
  );
  
  const isOnTrack = khatma.currentPage >= expectedPage;

  return {
    progressPercentage,
    pagesRead,
    pagesRemaining,
    daysRemaining,
    daysElapsed,
    isOnTrack,
    expectedPage,
  };
};

/**
 * Get page info (surah name for a given page)
 */
export const getPageSurah = (pageNumber: number): string => {
  // Simplified mapping - first surah on each page
  const PAGE_SURAHS: { [key: number]: string } = {
    1: 'الفاتحة',
    2: 'البقرة',
    50: 'آل عمران',
    77: 'النساء',
    106: 'المائدة',
    128: 'الأنعام',
    151: 'الأعراف',
    177: 'الأنفال',
    187: 'التوبة',
    208: 'يونس',
    221: 'هود',
    235: 'يوسف',
    249: 'الرعد',
    255: 'إبراهيم',
    262: 'الحجر',
    267: 'النحل',
    282: 'الإسراء',
    293: 'الكهف',
    305: 'مريم',
    312: 'طه',
    322: 'الأنبياء',
    332: 'الحج',
    342: 'المؤمنون',
    350: 'النور',
    359: 'الفرقان',
    367: 'الشعراء',
    377: 'النمل',
    385: 'القصص',
    396: 'العنكبوت',
    404: 'الروم',
    411: 'لقمان',
    415: 'السجدة',
    418: 'الأحزاب',
    428: 'سبأ',
    434: 'فاطر',
    440: 'يس',
    446: 'الصافات',
    453: 'ص',
    458: 'الزمر',
    467: 'غافر',
    477: 'فصلت',
    483: 'الشورى',
    489: 'الزخرف',
    496: 'الدخان',
    499: 'الجاثية',
    502: 'الأحقاف',
    507: 'محمد',
    511: 'الفتح',
    515: 'الحجرات',
    518: 'ق',
    520: 'الذاريات',
    523: 'الطور',
    526: 'النجم',
    528: 'القمر',
    531: 'الرحمن',
    534: 'الواقعة',
    537: 'الحديد',
    542: 'المجادلة',
    545: 'الحشر',
    549: 'الممتحنة',
    551: 'الصف',
    553: 'الجمعة',
    554: 'المنافقون',
    556: 'التغابن',
    558: 'الطلاق',
    560: 'التحريم',
    562: 'الملك',
    564: 'القلم',
    566: 'الحاقة',
    568: 'المعارج',
    570: 'نوح',
    572: 'الجن',
    574: 'المزمل',
    575: 'المدثر',
    577: 'القيامة',
    578: 'الإنسان',
    580: 'المرسلات',
    582: 'النبأ',
    583: 'النازعات',
    585: 'عبس',
    586: 'التكوير',
    587: 'الانفطار',
    589: 'المطففين',
    590: 'الانشقاق',
    591: 'البروج',
    592: 'الطارق',
    593: 'الأعلى',
    594: 'الغاشية',
    595: 'الفجر',
    596: 'البلد',
    597: 'الشمس',
    598: 'الليل',
    599: 'الضحى',
    600: 'الشرح',
    601: 'التين',
    602: 'العلق',
    603: 'القدر',
    604: 'البينة',
  };

  // Find the surah for this page
  let surahName = 'الفاتحة';
  const pages = Object.keys(PAGE_SURAHS)
    .map(Number)
    .sort((a, b) => a - b);
  
  for (const page of pages) {
    if (pageNumber >= page) {
      surahName = PAGE_SURAHS[page];
    } else {
      break;
    }
  }
  
  return surahName;
};

/**
 * Reset a khatma (start new cycle — clears readPages, keeps settings)
 */
export const resetKhatma = async (khatmaId: string): Promise<Khatma | null> => {
  try {
    const khatma = await getKhatma(khatmaId);
    if (!khatma) return null;

    const now = new Date();
    khatma.readPages = [];
    khatma.currentPage = 1;
    khatma.completedDays = 0;
    khatma.dailyProgress = [];
    khatma.isCompleted = false;
    khatma.lastReadDate = null;
    khatma.startDate = getTodayDateString();
    khatma.endDate = calculateEndDate(now, khatma.durationDays);

    await updateKhatma(khatma);

    // Re-schedule reminder if enabled
    if (khatma.reminderEnabled && khatma.reminderTime) {
      const { scheduleKhatmaReminder } = require('../lib/khatma-notifications');
      await scheduleKhatmaReminder(khatma);
    }

    return khatma;
  } catch (error) {
    console.error('Error resetting khatma:', error);
    return null;
  }
};

/**
 * Clear all khatma data
 */
export const clearAllKhatmas = async (): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove([KHATMA_STORAGE_KEY, ACTIVE_KHATMA_KEY]);
    return true;
  } catch (error) {
    console.error('Error clearing khatmas:', error);
    return false;
  }
};
