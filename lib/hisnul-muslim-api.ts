// lib/hisnul-muslim-api.ts
// حصن المسلم - 133 باب من الأذكار والأدعية
// =============================================

import hisnulData from '@/data/json/hisnul-muslim.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================
// الأنواع
// =============================================

export interface HisnulCategory {
  id: number;
  name_ar: string;
  name_en: string;
  color: string;
  icon: string;
}

export interface HisnulChapter {
  id: number;
  categoryId: number;
  name_ar: string;
  name_en: string;
}

export interface HisnulItem {
  id: number;
  chapterId: number;
  arabic: string;
  translation_ar: string;
  translation_en: string;
  reference_ar: string;
  reference_en: string;
}

// =============================================
// البيانات
// =============================================

const data = hisnulData as {
  categories: HisnulCategory[];
  chapters: HisnulChapter[];
  items: HisnulItem[];
};

// =============================================
// دوال الوصول
// =============================================

export const getHisnulCategories = (): HisnulCategory[] => data.categories;

export const getHisnulCategory = (id: number): HisnulCategory | undefined =>
  data.categories.find(c => c.id === id);

export const getHisnulChapters = (categoryId?: number): HisnulChapter[] => {
  if (categoryId === undefined) return data.chapters;
  return data.chapters.filter(ch => ch.categoryId === categoryId);
};

export const getHisnulChapter = (id: number): HisnulChapter | undefined =>
  data.chapters.find(ch => ch.id === id);

export const getHisnulItems = (chapterId: number): HisnulItem[] =>
  data.items.filter(item => item.chapterId === chapterId);

export const getHisnulItem = (id: number): HisnulItem | undefined =>
  data.items.find(item => item.id === id);

export const searchHisnul = (query: string): HisnulChapter[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return data.chapters.filter(ch =>
    ch.name_ar.includes(q) || ch.name_en.toLowerCase().includes(q)
  );
};

export const searchHisnulItems = (query: string): HisnulItem[] => {
  const q = query.trim();
  if (!q) return [];
  return data.items.filter(item =>
    item.arabic.includes(q) ||
    item.translation_en.toLowerCase().includes(q.toLowerCase())
  );
};

// =============================================
// المفضلة
// =============================================

const HISNUL_FAVORITES_KEY = 'hisnul_favorites';

export const getHisnulFavorites = async (): Promise<number[]> => {
  try {
    const stored = await AsyncStorage.getItem(HISNUL_FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

export const toggleHisnulFavorite = async (chapterId: number): Promise<boolean> => {
  const favorites = await getHisnulFavorites();
  const index = favorites.indexOf(chapterId);
  if (index >= 0) {
    favorites.splice(index, 1);
    await AsyncStorage.setItem(HISNUL_FAVORITES_KEY, JSON.stringify(favorites));
    return false;
  } else {
    favorites.push(chapterId);
    await AsyncStorage.setItem(HISNUL_FAVORITES_KEY, JSON.stringify(favorites));
    return true;
  }
};

export const isHisnulFavorite = async (chapterId: number): Promise<boolean> => {
  const favorites = await getHisnulFavorites();
  return favorites.includes(chapterId);
};

// =============================================
// الإحصائيات
// =============================================

export const getHisnulStats = () => ({
  totalCategories: data.categories.length,
  totalChapters: data.chapters.length,
  totalItems: data.items.length,
});
