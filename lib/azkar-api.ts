// lib/azkar-api.ts
// نظام الأذكار الجديد - يقرأ من JSON مع دعم 12 لغة
// ===================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import azkarData from '@/data/json/azkar.json';
import categoriesData from '@/data/json/categories.json';

// ===================================================
// الأنواع (Types)
// ===================================================

export type Language = 'ar' | 'en' | 'ur' | 'id' | 'tr' | 'fr' | 'de' | 'hi' | 'bn' | 'ms' | 'ru' | 'es';

export type AzkarCategoryType = 
  | 'morning'
  | 'evening'
  | 'sleep'
  | 'wakeup'
  | 'after_prayer'
  | 'quran_duas'
  | 'sunnah_duas'
  | 'ruqya';

export interface Zikr {
  id: number;
  category: AzkarCategoryType;
  arabic: string;
  transliteration: string;
  translation: Record<Language, string>;
  count: number;
  reference: string;
  benefit?: {
    ar?: string;
    en?: string;
    fr?: string;
  };
  audio?: string;
  currentCount?: number; // للعداد في التطبيق
}

export interface AzkarCategory {
  id: AzkarCategoryType;
  name: Record<Language, string>;
  icon: string;
  color: string;
  order: number;
}

export interface ZikrProgress {
  oderId: number;
  completed: boolean;
  currentCount: number;
  lastRead: string;
}

export interface DailyProgress {
  date: string;
  categories: {
    [key in AzkarCategoryType]?: {
      total: number;
      completed: number;
      azkarProgress: ZikrProgress[];
    };
  };
}

// ===================================================
// ثوابت
// ===================================================

const STORAGE_KEYS = {
  DAILY_PROGRESS: 'azkar_daily_progress',
  FAVORITES: 'azkar_favorites',
  SETTINGS: 'azkar_settings',
  LAST_SYNC: 'azkar_last_sync',
};

const DEFAULT_LANGUAGE: Language = 'ar';

// ===================================================
// تحميل البيانات
// ===================================================

/**
 * الحصول على جميع الأذكار
 */
export const getAllAzkar = (): Zikr[] => {
  return azkarData as Zikr[];
};

/**
 * الحصول على جميع الفئات
 */
export const getAllCategories = (): AzkarCategory[] => {
  return (categoriesData as AzkarCategory[]).sort((a, b) => a.order - b.order);
};

/**
 * الحصول على الأذكار حسب الفئة
 */
export const getAzkarByCategory = (category: AzkarCategoryType): Zikr[] => {
  return getAllAzkar().filter(zikr => zikr.category === category);
};

/**
 * الحصول على ذكر بالـ ID
 */
export const getZikrById = (id: number): Zikr | undefined => {
  return getAllAzkar().find(zikr => zikr.id === id);
};

/**
 * الحصول على فئة بالـ ID
 */
export const getCategoryById = (id: AzkarCategoryType): AzkarCategory | undefined => {
  return getAllCategories().find(cat => cat.id === id);
};

// ===================================================
// الترجمات
// ===================================================

/**
 * الحصول على ترجمة الذكر
 */
export const getZikrTranslation = (zikr: Zikr, language: Language): string => {
  return zikr.translation[language] || zikr.translation[DEFAULT_LANGUAGE] || zikr.arabic;
};

/**
 * الحصول على اسم الفئة مترجم
 */
export const getCategoryName = (category: AzkarCategory, language: Language): string => {
  return category.name[language] || category.name[DEFAULT_LANGUAGE];
};

/**
 * الحصول على فضل الذكر مترجم
 */
export const getZikrBenefit = (zikr: Zikr, language: Language): string | undefined => {
  if (!zikr.benefit) return undefined;
  
  if (language === 'ar') return zikr.benefit.ar;
  if (language === 'fr') return zikr.benefit.fr;
  return zikr.benefit.en || zikr.benefit.ar;
};

// ===================================================
// البحث
// ===================================================

/**
 * البحث في الأذكار
 */
export const searchAzkar = (query: string, language: Language = 'ar'): Zikr[] => {
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) return [];
  
  return getAllAzkar().filter(zikr => {
    // البحث في النص العربي
    if (zikr.arabic.includes(normalizedQuery)) return true;
    
    // البحث في النطق
    if (zikr.transliteration.toLowerCase().includes(normalizedQuery)) return true;
    
    // البحث في الترجمة
    const translation = zikr.translation[language];
    if (translation && translation.toLowerCase().includes(normalizedQuery)) return true;
    
    // البحث في المرجع
    if (zikr.reference.toLowerCase().includes(normalizedQuery)) return true;
    
    return false;
  });
};

// ===================================================
// التقدم والإحصائيات
// ===================================================

/**
 * الحصول على تاريخ اليوم
 */
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * الحصول على التقدم اليومي
 */
export const getDailyProgress = async (): Promise<DailyProgress | null> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_PROGRESS);
    if (!stored) return null;
    
    const progress: DailyProgress = JSON.parse(stored);
    
    // إذا كان التقدم من يوم سابق، نعيد تعيينه
    if (progress.date !== getTodayDate()) {
      return null;
    }
    
    return progress;
  } catch (error) {
    console.error('Error getting daily progress:', error);
    return null;
  }
};

/**
 * حفظ التقدم اليومي
 */
export const saveDailyProgress = async (progress: DailyProgress): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_PROGRESS, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving daily progress:', error);
  }
};

/**
 * تحديث تقدم ذكر معين
 */
export const updateZikrProgress = async (
  category: AzkarCategoryType,
  oderId: number,
  currentCount: number
): Promise<void> => {
  try {
    let progress = await getDailyProgress();
    const today = getTodayDate();
    
    if (!progress) {
      progress = {
        date: today,
        categories: {},
      };
    }
    
    if (!progress.categories[category]) {
      const categoryAzkar = getAzkarByCategory(category);
      progress.categories[category] = {
        total: categoryAzkar.length,
        completed: 0,
        azkarProgress: categoryAzkar.map(z => ({
          oderId: z.id,
          completed: false,
          currentCount: 0,
          lastRead: '',
        })),
      };
    }
    
    const categoryProgress = progress.categories[category]!;
    const zikrProgress = categoryProgress.azkarProgress.find(z => z.oderId === zikrId);
    
    if (zikrProgress) {
      const zikr = getZikrById(zikrId);
      zikrProgress.currentCount = currentCount;
      zikrProgress.lastRead = new Date().toISOString();
      
      if (zikr && currentCount >= zikr.count) {
        zikrProgress.completed = true;
      }
      
      // تحديث عدد المكتمل
      categoryProgress.completed = categoryProgress.azkarProgress.filter(z => z.completed).length;
    }
    
    await saveDailyProgress(progress);
  } catch (error) {
    console.error('Error updating zikr progress:', error);
  }
};

/**
 * إعادة تعيين التقدم اليومي
 */
export const resetDailyProgress = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_PROGRESS);
  } catch (error) {
    console.error('Error resetting daily progress:', error);
  }
};

/**
 * الحصول على نسبة الإنجاز لفئة معينة
 */
export const getCategoryCompletionPercentage = async (category: AzkarCategoryType): Promise<number> => {
  const progress = await getDailyProgress();
  if (!progress || !progress.categories[category]) return 0;
  
  const categoryProgress = progress.categories[category]!;
  if (categoryProgress.total === 0) return 0;
  
  return Math.round((categoryProgress.completed / categoryProgress.total) * 100);
};

// ===================================================
// المفضلة
// ===================================================

/**
 * الحصول على الأذكار المفضلة
 */
export const getFavorites = async (): Promise<number[]> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
};

/**
 * إضافة ذكر للمفضلة
 */
export const addToFavorites = async (zikrId: number): Promise<void> => {
  try {
    const favorites = await getFavorites();
    if (!favorites.includes(zikrId)) {
      favorites.push(zikrId);
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('Error adding to favorites:', error);
  }
};

/**
 * إزالة ذكر من المفضلة
 */
export const removeFromFavorites = async (zikrId: number): Promise<void> => {
  try {
    const favorites = await getFavorites();
    const updated = favorites.filter(id => id !== zikrId);
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing from favorites:', error);
  }
};

/**
 * التحقق إذا كان الذكر في المفضلة
 */
export const isFavorite = async (zikrId: number): Promise<boolean> => {
  const favorites = await getFavorites();
  return favorites.includes(zikrId);
};

/**
 * الحصول على الأذكار المفضلة كاملة
 */
export const getFavoriteAzkar = async (): Promise<Zikr[]> => {
  const favoriteIds = await getFavorites();
  return getAllAzkar().filter(zikr => favoriteIds.includes(zikr.id));
};

// ===================================================
// الإحصائيات
// ===================================================

/**
 * إحصائيات الأذكار
 */
export const getAzkarStats = () => {
  const allAzkar = getAllAzkar();
  const categories = getAllCategories();
  
  const stats: Record<AzkarCategoryType, number> = {} as Record<AzkarCategoryType, number>;
  
  categories.forEach(cat => {
    stats[cat.id] = allAzkar.filter(z => z.category === cat.id).length;
  });
  
  return {
    total: allAzkar.length,
    byCategory: stats,
    categoriesCount: categories.length,
    languagesSupported: 12,
  };
};

// ===================================================
// دوال مساعدة للعرض
// ===================================================

/**
 * الحصول على أذكار الصباح
 */
export const getMorningAzkar = (): Zikr[] => getAzkarByCategory('morning');

/**
 * الحصول على أذكار المساء
 */
export const getEveningAzkar = (): Zikr[] => getAzkarByCategory('evening');

/**
 * الحصول على أذكار النوم
 */
export const getSleepAzkar = (): Zikr[] => getAzkarByCategory('sleep');

/**
 * الحصول على أذكار الاستيقاظ
 */
export const getWakeupAzkar = (): Zikr[] => getAzkarByCategory('wakeup');

/**
 * الحصول على أذكار بعد الصلاة
 */
export const getAfterPrayerAzkar = (): Zikr[] => getAzkarByCategory('after_prayer');

/**
 * الحصول على أدعية القرآن
 */
export const getQuranDuas = (): Zikr[] => getAzkarByCategory('quran_duas');

/**
 * الحصول على أدعية السنة
 */
export const getSunnahDuas = (): Zikr[] => getAzkarByCategory('sunnah_duas');

/**
 * الحصول على الرقية الشرعية
 */
export const getRuqya = (): Zikr[] => getAzkarByCategory('ruqya');

// ===================================================
// التصدير الافتراضي
// ===================================================

export default {
  // البيانات
  getAllAzkar,
  getAllCategories,
  getAzkarByCategory,
  getZikrById,
  getCategoryById,
  
  // الترجمات
  getZikrTranslation,
  getCategoryName,
  getZikrBenefit,
  
  // البحث
  searchAzkar,
  
  // التقدم
  getDailyProgress,
  saveDailyProgress,
  updateZikrProgress,
  resetDailyProgress,
  getCategoryCompletionPercentage,
  
  // المفضلة
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  getFavoriteAzkar,
  
  // الإحصائيات
  getAzkarStats,
  
  // دوال مختصرة
  getMorningAzkar,
  getEveningAzkar,
  getSleepAzkar,
  getWakeupAzkar,
  getAfterPrayerAzkar,
  getQuranDuas,
  getSunnahDuas,
  getRuqya,
};
