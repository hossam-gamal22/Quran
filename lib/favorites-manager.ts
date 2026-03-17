// lib/favorites-manager.ts
// مدير المحفوظات الموحد — Universal Favorites Manager
// ====================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@unified_favorites';

export type FavoriteType =
  | 'dua'
  | 'ayah'
  | 'hadith'
  | 'quote'
  | 'companion'
  | 'hadith_sifat'
  | 'dhikr';

export interface FavoriteItem {
  id: string;
  type: FavoriteType;
  title: string;
  subtitle?: string;
  arabic: string;
  translation?: string;
  reference?: string;
  route?: string;
  meta?: Record<string, string | number>;
  savedAt: number;
}

// Category definitions for favorites display
export const FAVORITE_CATEGORIES: {
  key: string;
  labelKey: string;
  types: FavoriteType[];
  icon: string;
}[] = [
  { key: 'duas', labelKey: 'favorites.categoryDuas', types: ['dua'], icon: 'hands-pray' },
  { key: 'ayat', labelKey: 'favorites.categoryVerses', types: ['ayah'], icon: 'book-open-variant' },
  { key: 'ahadith', labelKey: 'favorites.categoryHadiths', types: ['hadith', 'hadith_sifat'], icon: 'script-text' },
  { key: 'adhkar', labelKey: 'favorites.categoryAzkar', types: ['dhikr'], icon: 'counter' },
  { key: 'quotes', labelKey: 'favorites.categoryWisdom', types: ['quote'], icon: 'format-quote-close' },
  { key: 'companions', labelKey: 'favorites.categoryCompanions', types: ['companion'], icon: 'account-group' },
];

async function loadAll(): Promise<FavoriteItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveAll(items: FavoriteItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getFavorites(type?: FavoriteType): Promise<FavoriteItem[]> {
  const all = await loadAll();
  if (!type) return all;
  return all.filter(i => i.type === type);
}

export async function getFavoritesByTypes(types: FavoriteType[]): Promise<FavoriteItem[]> {
  const all = await loadAll();
  return all.filter(i => types.includes(i.type));
}

export async function addFavorite(item: Omit<FavoriteItem, 'savedAt'>): Promise<void> {
  const all = await loadAll();
  if (all.some(f => f.id === item.id && f.type === item.type)) return; // already exists
  all.unshift({ ...item, savedAt: Date.now() });
  await saveAll(all);
}

export async function removeFavorite(id: string, type: FavoriteType): Promise<void> {
  const all = await loadAll();
  await saveAll(all.filter(f => !(f.id === id && f.type === type)));
}

export async function isFavorited(id: string, type: FavoriteType): Promise<boolean> {
  const all = await loadAll();
  return all.some(f => f.id === id && f.type === type);
}

export async function toggleFavorite(item: Omit<FavoriteItem, 'savedAt'>): Promise<boolean> {
  const exists = await isFavorited(item.id, item.type);
  if (exists) {
    await removeFavorite(item.id, item.type);
    return false;
  }
  await addFavorite(item);
  return true;
}
