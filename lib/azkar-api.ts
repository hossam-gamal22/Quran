// lib/azkar-api.ts
// نظام الأذكار الجديد - يقرأ من JSON مع دعم 12 لغة
// ===================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import azkarData from '@/data/json/azkar.json';
import categoriesData from '@/data/json/categories.json';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { translateBenefit } from '@/lib/benefit-translations';

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
  | 'ruqya'
  | 'eating'
  | 'mosque'
  | 'house'
  | 'travel'
  | 'emotions'
  | 'wudu'
  | 'nature'
  | 'fasting'
  | 'protection'
  | 'prayerSupplications'
  | 'salawat'
  | 'istighfar'
  | 'ayat_kursi';

export interface Zikr {
  id: number;
  category: AzkarCategoryType;
  subcategory?: string;
  arabic: string;
  transliteration: string;
  translation?: Record<Language, string>;
  translations?: Record<Language, string>;
  count: number;
  reference: string;
  benefit?: Record<string, string> | string;
  audio?: string;
  currentCount?: number;
}

export interface AzkarCategory {
  id: AzkarCategoryType;
  name: Record<Language, string>;
  icon: string;
  color: string;
  order: number;
}

export interface ZikrProgress {
  zikrId: number;
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
  // التحقق من بنية البيانات
  if (Array.isArray(azkarData)) {
    return azkarData as Zikr[];
  }
  // إذا كانت البيانات في شكل { azkar: [...] }
  const data = azkarData as { azkar?: Zikr[] };
  return data.azkar || [];
};

/**
 * الحصول على جميع الفئات
 */
export const getAllCategories = (): AzkarCategory[] => {
  // التحقق من بنية البيانات
  if (Array.isArray(categoriesData)) {
    return (categoriesData as AzkarCategory[]).sort((a, b) => a.order - b.order);
  }
  // إذا كانت البيانات في شكل { categories: [...] }
  const data = categoriesData as { categories?: AzkarCategory[] };
  return (data.categories || []).sort((a, b) => a.order - b.order);
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
 * Extracts a plain string from a translation value that might be
 * either a string or { text: string; verified?: boolean }.
 */
const resolveTranslationValue = (val: unknown): string | undefined => {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'text' in val) return (val as { text: string }).text;
  return undefined;
};

export const getZikrTranslation = (zikr: Zikr, language: Language): string => {
  const t = zikr.translations || zikr.translation;
  // Fallback chain: requested lang → en → ar
  return resolveTranslationValue(t?.[language]) || resolveTranslationValue(t?.en) || resolveTranslationValue(t?.[DEFAULT_LANGUAGE]) || zikr.arabic;
};

/**
 * الحصول على اسم الفئة مترجم
 */
export const getCategoryName = (category: AzkarCategory, language: Language): string => {
  // Fallback chain: requested lang → en → ar
  return category.name?.[language] || category.name?.en || category.name?.[DEFAULT_LANGUAGE] || '';
};

/**
 * الحصول على فضل الذكر مترجم
 */
export const getZikrBenefit = (zikr: Zikr, language: Language): string | undefined => {
  if (!zikr.benefit) return undefined;
  
  // Handle case where benefit is a plain string (legacy format)
  // Use static translations map for non-Arabic languages
  if (typeof zikr.benefit === 'string') return translateBenefit(zikr.benefit, language);
  
  // Try requested language, then English, then Arabic fallback
  return zikr.benefit[language] || zikr.benefit.en || zikr.benefit.ar;
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
    if (zikr.arabic?.includes(normalizedQuery)) return true;
    
    // البحث في النطق
    if (zikr.transliteration?.toLowerCase().includes(normalizedQuery)) return true;
    
    // البحث في الترجمة
    const t = zikr.translations || zikr.translation;
    const translationText = resolveTranslationValue(t?.[language]);
    if (translationText && translationText.toLowerCase().includes(normalizedQuery)) return true;
    
    // البحث في المرجع
    if (zikr.reference?.toLowerCase().includes(normalizedQuery)) return true;
    
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
  zikrId: number,
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
          zikrId: z.id,
          completed: false,
          currentCount: 0,
          lastRead: '',
        })),
      };
    }
    
    const categoryProgress = progress.categories[category]!;
    const zikrProgress = categoryProgress.azkarProgress.find(z => z.zikrId === zikrId);
    
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

export const getMorningAzkar = (): Zikr[] => getAzkarByCategory('morning');
export const getEveningAzkar = (): Zikr[] => getAzkarByCategory('evening');
export const getSleepAzkar = (): Zikr[] => getAzkarByCategory('sleep');
export const getWakeupAzkar = (): Zikr[] => getAzkarByCategory('wakeup');
export const getAfterPrayerAzkar = (): Zikr[] => getAzkarByCategory('after_prayer');
export const getQuranDuas = (): Zikr[] => getAzkarByCategory('quran_duas');
export const getSunnahDuas = (): Zikr[] => getAzkarByCategory('sunnah_duas');
export const getRuqya = (): Zikr[] => getAzkarByCategory('ruqya');

/**
 * أدعية يومية متجددة — 10 أدعية مختلفة كل يوم من مجموعة السنة
 * يعتمد على يوم السنة لاختيار عشوائي ثابت خلال اليوم
 */
export const getDailySunnahDuas = (count: number = 10): Zikr[] => {
  const all = getSunnahDuas();
  if (all.length <= count) return all;

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);

  // Seeded shuffle using day of year
  const indices = all.map((_, i) => i);
  let seed = dayOfYear * 2654435761; // Knuth multiplicative hash
  for (let i = indices.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, count).map(i => all[i]);
};

// ===================================================
// التصدير الافتراضي
// ===================================================

// ===================================================
// Firestore override — admin-managed azkar
// ===================================================

const FIRESTORE_AZKAR_CACHE_KEY = '@azkar_firestore_cache';
const FIRESTORE_AZKAR_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

let firestoreAzkarCache: Zikr[] | null = null;

/**
 * Fetch azkar from Firestore collection `azkar/`.
 * Caches in memory + AsyncStorage for 24h.
 * Falls back to local JSON if Firestore is empty or fails.
 */
export const fetchAzkarFromFirestore = async (): Promise<Zikr[]> => {
  // Memory cache
  if (firestoreAzkarCache) return firestoreAzkarCache;

  // AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(FIRESTORE_AZKAR_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < FIRESTORE_AZKAR_CACHE_TTL && data?.length > 0) {
        firestoreAzkarCache = data;
        return data;
      }
    }
  } catch { /* continue to Firestore */ }

  // Firestore
  try {
    const snap = await getDocs(collection(db, 'azkar'));
    if (!snap.empty) {
      const items = snap.docs.map(d => d.data() as Zikr);
      items.sort((a, b) => a.id - b.id);
      firestoreAzkarCache = items;
      await AsyncStorage.setItem(FIRESTORE_AZKAR_CACHE_KEY, JSON.stringify({ data: items, timestamp: Date.now() }));
      return items;
    }
  } catch { /* fallback to local */ }

  // Fallback to local JSON
  return getAllAzkar();
};

export default {
  getAllAzkar,
  getAllCategories,
  getAzkarByCategory,
  getZikrById,
  getCategoryById,
  getZikrTranslation,
  getCategoryName,
  getZikrBenefit,
  searchAzkar,
  getDailyProgress,
  saveDailyProgress,
  updateZikrProgress,
  resetDailyProgress,
  getCategoryCompletionPercentage,
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  getFavoriteAzkar,
  getAzkarStats,
  getMorningAzkar,
  getEveningAzkar,
  getSleepAzkar,
  getWakeupAzkar,
  getAfterPrayerAzkar,
  getQuranDuas,
  getSunnahDuas,
  getRuqya,
  fetchAzkarFromFirestore,
};
