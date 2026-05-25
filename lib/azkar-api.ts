// lib/azkar-api.ts
// نظام الأذكار الجديد - يقرأ من JSON مع دعم 12 لغة
// ===================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import azkarData from '@/data/json/azkar.json';
import categoriesData from '@/data/json/categories.json';
import shortNamesData from '@/data/json/azkar-short-names.json';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { translateBenefit } from '@/lib/benefit-translations';
import { getEffectiveZikrRepeatCount } from '@/lib/azkar-repeat';
import { dedupeAzkarByDisplayedText, removeLowerCountGlobalDuplicateAzkar } from '@/lib/azkar-dedupe';

// ===================================================
// الأنواع (Types)
// ===================================================

export type Language = 'ar' | 'en' | 'ur' | 'id' | 'tr' | 'fr' | 'de' | 'hi' | 'bn' | 'ms' | 'ru' | 'es';

/** Category IDs are now numeric strings ("1"-"132") from Hisnul Muslim */
export type AzkarCategoryType = string;

export interface Zikr {
  id: number;
  category: AzkarCategoryType;
  subcategory?: string;
  sortOrder?: number;
  arabic: string;
  transliteration: string;
  translation?: Record<Language, string>;
  translations?: Record<Language, string | { text: string; verified?: boolean }>;
  count: number;
  reference: string;
  benefit?: Record<string, string> | string;
  audio?: string | null;
  currentCount?: number;
}

export interface AzkarCategory {
  id: AzkarCategoryType;
  name: Record<string, string>;
  icon: string;
  color: string;
  order: number;
  audioFile?: string | null;
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
    [key: string]: {
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
// Firestore override cache (B3)
// Admin panel writes to top-level `azkar/{id}` collection.
// We hydrate a module-level override at startup; getAllAzkar()
// returns the override if present, falling back to bundled JSON.
// ===================================================

const AZKAR_CACHE_KEY = '@azkar_firestore_cache';
const AZKAR_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h (used as a soft TTL — we always background-revalidate)
let _azkarOverride: Zikr[] | null = null;
const _azkarChangeListeners = new Set<() => void>();

// ===================================================
// Custom Categories override (admin-managed)
// Admin panel writes to top-level `azkar_categories/{id}` collection.
// These are MERGED with the bundled default categories — defaults stay
// immutable; only custom ones can be edited/deleted from admin.
// ===================================================
const CUSTOM_CATEGORIES_CACHE_KEY = '@azkar_categories_cache';
let _customCategoriesOverride: AzkarCategory[] = [];

const getSortOrder = (zikr: Zikr): number => {
  const sortOrder = Number(zikr.sortOrder);
  return Number.isFinite(sortOrder) ? sortOrder : Number.POSITIVE_INFINITY;
};

export const compareAzkarItems = (a: Zikr, b: Zikr): number => {
  const aOrder = getSortOrder(a);
  const bOrder = getSortOrder(b);
  if (aOrder !== bOrder) return aOrder - bOrder;
  return (a.id ?? 0) - (b.id ?? 0);
};

export const sortAzkarItems = (items: Zikr[]): Zikr[] => {
  return [...items].sort(compareAzkarItems);
};

/** Notify React components/screens that azkar data changed (e.g. admin updated audio). */
const notifyAzkarChanged = () => {
  _azkarChangeListeners.forEach((cb) => {
    try { cb(); } catch {}
  });
};

/** Subscribe to azkar override changes (fired after Firestore refresh). Returns unsubscribe. */
export const onAzkarChange = (cb: () => void): (() => void) => {
  _azkarChangeListeners.add(cb);
  return () => { _azkarChangeListeners.delete(cb); };
};

interface AzkarCacheEnvelope {
  ts: number;
  data: Zikr[];
}

/**
 * Loads admin-managed adhkar from Firestore (or AsyncStorage cache).
 * Safe to call at app startup. Failures fall back silently to bundled JSON.
 *
 * Behavior:
 *  • Cache is shown immediately (instant cold start)
 *  • Firestore is ALWAYS fetched in the background — admin edits propagate
 *    on next app launch even if the local cache hasn't expired.
 */
export const hydrateAzkarFromFirestore = async (): Promise<void> => {
  // 1) Try cache first (instant, avoids gating on network on cold start)
  try {
    const cached = await AsyncStorage.getItem(AZKAR_CACHE_KEY);
    if (cached) {
      try {
        const env = JSON.parse(cached) as AzkarCacheEnvelope;
        if (env?.data?.length) {
          _azkarOverride = sortAzkarItems(env.data);
        }
      } catch {
        // corrupted cache — ignore, refetch
      }
    }
  } catch {
    // AsyncStorage unavailable — ignore
  }

  // 2) ALWAYS refresh from Firestore in background so admin edits show on
  //    next launch (even if soft TTL hasn't elapsed). Don't await — let
  //    it run while UI shows cached data.
  refreshAzkarFromFirestore().catch(() => {});
};

/** Compute a lightweight signature for change detection across all editable fields. */
export const computeAzkarSignature = (items: Zikr[]): string => {
  // Sort by id to make the signature order-independent
  const sorted = [...items].sort((a, b) => a.id - b.id);
  return JSON.stringify(
    sorted.map((z) => [
      z.id,
      z.category,
      z.subcategory || '',
      Number.isFinite(Number(z.sortOrder)) ? Number(z.sortOrder) : '',
      z.audio || '',
      z.arabic || '',
      z.transliteration || '',
      z.count || 0,
      z.reference || '',
      typeof z.benefit === 'string' ? z.benefit : JSON.stringify(z.benefit || {}),
      JSON.stringify(z.translations || z.translation || {}),
    ]),
  );
};

/** Force-refresh the azkar override from Firestore. Used on app foreground. */
export const refreshAzkarFromFirestore = async (): Promise<void> => {
  try {
    const snap = await getDocs(collection(db, 'azkar'));
    if (snap.empty) return; // collection empty — keep bundled fallback
    const items: Zikr[] = snap.docs
      .map((d) => d.data() as Zikr)
      .filter((z) => z && typeof z.id === 'number')
      // Sort by admin-managed order first, then numeric id for backward compatibility.
      // Firestore returns docs alphabetically by string id ("10" before "2").
      .sort(compareAzkarItems);
    if (!items.length) return;
    // Detect change against current override using a full-content signature
    // (text, audio, benefit, translations, count, reference). Without this,
    // text-only edits from the admin panel would silently update memory but
    // never trigger a UI re-render.
    const newSig = computeAzkarSignature(items);
    const oldSig = _azkarOverride ? computeAzkarSignature(_azkarOverride) : '';
    const changed = newSig !== oldSig;
    _azkarOverride = items;
    try {
      await AsyncStorage.setItem(
        AZKAR_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), data: items } as AzkarCacheEnvelope),
      );
    } catch {
      // ignore cache write failure
    }
    if (changed) notifyAzkarChanged();
  } catch (err) {
    console.warn('[azkar-api] refreshAzkarFromFirestore failed, keeping current data:', err);
  }
};

/**
 * Subscribe to live Firestore updates of the azkar collection.
 * Returns an unsubscribe function. Call once at app startup.
 */
export const subscribeToAzkarFromFirestore = (): (() => void) => {
  try {
    const unsub = onSnapshot(
      collection(db, 'azkar'),
      (snap) => {
        if (snap.empty) return;
        const items: Zikr[] = snap.docs
          .map((d) => d.data() as Zikr)
          .filter((z) => z && typeof z.id === 'number')
          // Same canonical admin-order sort as refreshAzkarFromFirestore.
          .sort(compareAzkarItems);
        if (!items.length) return;
        const newSig = computeAzkarSignature(items);
        const oldSig = _azkarOverride ? computeAzkarSignature(_azkarOverride) : '';
        const changed = newSig !== oldSig;
        _azkarOverride = items;
        AsyncStorage.setItem(
          AZKAR_CACHE_KEY,
          JSON.stringify({ ts: Date.now(), data: items } as AzkarCacheEnvelope),
        ).catch(() => {});
        if (changed) notifyAzkarChanged();
      },
      (err) => {
        console.warn('[azkar-api] subscribeToAzkarFromFirestore error:', err);
      },
    );
    return unsub;
  } catch (err) {
    console.warn('[azkar-api] subscribeToAzkarFromFirestore failed:', err);
    return () => {};
  }
};

// ===================================================
// تحميل البيانات
// ===================================================

/**
 * الحصول على جميع الأذكار
 */
export const getAllAzkar = (): Zikr[] => {
  // Admin override takes precedence when hydrated
  if (_azkarOverride && _azkarOverride.length) return _azkarOverride;
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
 * Defaults (bundled JSON) + custom categories from Firestore (admin-managed).
 * Custom categories appear ONLY in the mobile app's "أذكار أخرى" page —
 * the Home page filters them out via its hardcoded MAIN_IDS list.
 */
export const getAllCategories = (): AzkarCategory[] => {
  let defaults: AzkarCategory[];
  if (Array.isArray(categoriesData)) {
    defaults = categoriesData as AzkarCategory[];
  } else {
    const data = categoriesData as { categories?: AzkarCategory[] };
    defaults = data.categories || [];
  }
  const merged = [...defaults, ..._customCategoriesOverride];
  return merged.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
};

/**
 * Hydrate custom categories from Firestore. Loads cache first for instant
 * cold start, then refreshes in the background so admin edits propagate.
 */
export const hydrateCustomCategoriesFromFirestore = async (): Promise<void> => {
  // 1) Try cache for instant render
  try {
    const cached = await AsyncStorage.getItem(CUSTOM_CATEGORIES_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as AzkarCategory[];
        if (Array.isArray(parsed)) _customCategoriesOverride = parsed;
      } catch {
        // corrupted cache — ignore
      }
    }
  } catch {
    // AsyncStorage unavailable
  }
  // 2) Always background-refresh so admin edits show up on next launch
  refreshCustomCategoriesFromFirestore().catch(() => {});
};

/** Force refresh custom categories from Firestore. */
export const refreshCustomCategoriesFromFirestore = async (): Promise<void> => {
  try {
    const snap = await getDocs(collection(db, 'azkar_categories'));
    const items: AzkarCategory[] = snap.docs
      .map((d) => d.data() as AzkarCategory)
      .filter((c) => c && typeof c.id === 'string');
    _customCategoriesOverride = items;
    try {
      await AsyncStorage.setItem(CUSTOM_CATEGORIES_CACHE_KEY, JSON.stringify(items));
    } catch {
      // ignore cache write failure
    }
    notifyAzkarChanged();
  } catch (err) {
    console.warn('[azkar-api] refreshCustomCategoriesFromFirestore failed:', err);
  }
};

/** Live subscribe to custom categories changes. Returns unsubscribe. */
export const subscribeToCustomCategoriesFromFirestore = (): (() => void) => {
  try {
    const unsub = onSnapshot(
      collection(db, 'azkar_categories'),
      async (snap) => {
        try {
          const items: AzkarCategory[] = snap.docs
            .map((d) => d.data() as AzkarCategory)
            .filter((c) => c && typeof c.id === 'string');
          _customCategoriesOverride = items;
          try {
            await AsyncStorage.setItem(CUSTOM_CATEGORIES_CACHE_KEY, JSON.stringify(items));
          } catch {
            // ignore cache write failure
          }
          notifyAzkarChanged();
        } catch (err) {
          console.warn('[azkar-api] custom categories snapshot handler error:', err);
        }
      },
      (err) => console.warn('[azkar-api] subscribeToCustomCategoriesFromFirestore error:', err),
    );
    return unsub;
  } catch (err) {
    console.warn('[azkar-api] subscribeToCustomCategoriesFromFirestore failed:', err);
    return () => {};
  }
};

/**
/**
 * الحصول على الأذكار حسب الفئة
 * Always sorted by numeric id ascending so Morning + Evening (and every other
 * category) follow the exact same canonical order shown in the admin panel.
 * Firestore returns docs alphabetically by document id ("10" before "2"),
 * so we MUST sort here — otherwise the on-device order diverges from admin.
 */
export const getAzkarByCategory = (category: AzkarCategoryType): Zikr[] => {
  const resolvedCategory = resolveCategoryId(category);
  const allAzkar = getAllAzkar();
  return sortAzkarItems(dedupeAzkarByDisplayedText(
    removeLowerCountGlobalDuplicateAzkar(
      allAzkar.filter((zikr) => zikr.category === resolvedCategory),
      allAzkar,
    ),
  ));
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
export const resolveTranslationValue = (val: unknown): string | undefined => {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'text' in val) return (val as { text: string }).text;
  return undefined;
};

export const getZikrTranslation = (zikr: Zikr, language: Language): string => {
  const t = zikr.translations || zikr.translation;
  // Fallback chain: requested lang → en → ar
  const resolved = resolveTranslationValue(t?.[language]) || resolveTranslationValue(t?.en) || resolveTranslationValue(t?.[DEFAULT_LANGUAGE]) || zikr.arabic;
  // For non-Arabic languages, strip count-mention parens like "(four times)" /
  // "(× 10)" and the outer paren wrap — the count badge in the UI already
  // shows the repetition, so inline restating is redundant noise. Arabic
  // body comes straight from azkar.json with its own formatting conventions
  // that the screen layout expects, so leave Arabic untouched.
  if (language === 'ar') return resolved;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { stripAzkarTranslationNoise } = require('@/lib/widget-azkar-helpers');
    return stripAzkarTranslationNoise(resolved) || resolved;
  } catch {
    return resolved;
  }
};

/**
 * Short display names for categories whose original name in categories.json
 * is too verbose for a page header or list row. Sourced from
 * `data/json/azkar-short-names.json`, covering all 12 supported languages.
 * Keeps titles consistent between outside buttons and the page header.
 */
const SHORT_NAMES = shortNamesData as Record<string, Partial<Record<Language, string>>>;

/**
 * الحصول على اسم الفئة مترجم
 */
export const getCategoryName = (category: AzkarCategory, language: Language): string => {
  const short = SHORT_NAMES[category.id];
  if (short) {
    const override = short[language] || short.en || short.ar;
    if (override) return override;
  }
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
      
      if (zikr && currentCount >= getEffectiveZikrRepeatCount(zikr)) {
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
  
  const categoryProgress = progress.categories[category];
  if (!categoryProgress || categoryProgress.total === 0) return 0;
  
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
  
  const stats: Record<string, number> = {};
  
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
 * Legacy category ID mapping (old string IDs → new Hisnul Muslim numeric IDs).
 * Used for backward compatibility with worship tracking, notifications, etc.
 */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  morning: '1',      // أذكار الصباح
  evening: '1b',     // أذكار المساء
  sleep: '2',        // أذكار النوم
  wakeup: '3',       // أذكار الاستيقاظ من النوم
  after_prayer: '27', // الأذكار بعد السلام من الصلاة
  quran_duas: '26',  // الدعاء بعد التشهد الأخير قبل السلام
  sunnah_duas: '34', // دعاء الهم والحزن (general duas)
  ruqya: '34',       // (no exact match; use general supplication)
  eating: '69',      // الدعاء قبل الطعام
  mosque: '10',      // دعاء الذهاب إلى المسجد
  house: '8',        // الذكر عند الخروج من المنزل
  travel: '96',      // دعاء السفر
  emotions: '34',    // دعاء الهم والحزن
  wudu: '6',         // الذكر قبل الوضوء
  nature: '80',      // الدعاء عند سماع الرعد (closest nature match)
  fasting: '73',     // الدعاء عند الإفطار
  protection: '34',  // دعاء الهم والحزن
  prayerSupplications: '18', // دعاء الاستفتاح
  salawat: '107',    // فضل الصلاة على النبي
  istighfar: '129',  // الاستغفار و التوبة
  ayat_kursi: '1',   // (included in morning/evening adhkar)
};

/** Resolve a category ID that might be a legacy string ID */
export const resolveCategoryId = (id: string): string => {
  return LEGACY_CATEGORY_MAP[id] || id;
};

export const getMorningAzkar = (): Zikr[] => getAzkarByCategory('1');
export const getEveningAzkar = (): Zikr[] => getAzkarByCategory('1b');
export const getSleepAzkar = (): Zikr[] => getAzkarByCategory('2');
export const getWakeupAzkar = (): Zikr[] => getAzkarByCategory('3');
export const getAfterPrayerAzkar = (): Zikr[] => getAzkarByCategory('27');
export const getQuranDuas = (): Zikr[] => getAzkarByCategory('26');
export const getSunnahDuas = (): Zikr[] => getAzkarByCategory('34');
export const getRuqya = (): Zikr[] => getAzkarByCategory('34');

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
      items.sort(compareAzkarItems);
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
  LEGACY_CATEGORY_MAP,
  resolveCategoryId,
};
