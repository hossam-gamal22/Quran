// lib/photo-backgrounds-api.ts
// Fetches photo backgrounds from Firestore (admin-managed) with fallback to hardcoded list

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  FREE_PEXELS_BACKGROUNDS,
  PREMIUM_PEXELS_BACKGROUNDS,
  type PexelsBackground,
} from '@/constants/pexels-backgrounds';

const CACHE_KEY = '@photo_backgrounds_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CachedData {
  free: PexelsBackground[];
  premium: PexelsBackground[];
  timestamp: number;
}

// Build Pexels image URLs from an ID
function pexelsUrls(id: number) {
  const base = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;
  return {
    large2x: `${base}?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940`,
    small: `${base}?auto=compress&cs=tinysrgb&h=130`,
    portrait: `${base}?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800`,
  };
}

function numericIdFromDoc(id: string): number {
  return Array.from(id).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 0);
}

// Convert Firestore doc to PexelsBackground
function docToBackground(doc: any, docId: string): PexelsBackground {
  const d = doc;
  const id = typeof d.pexels_id === 'number' ? d.pexels_id : numericIdFromDoc(docId);
  return {
    id,
    src: d.full_url?.startsWith('https://images.pexels.com') && typeof d.pexels_id === 'number'
      ? pexelsUrls(d.pexels_id)
      : { large2x: d.full_url || d.large2x_url, small: d.thumbnail_url, portrait: d.full_url || d.large2x_url },
    photographer: d.photographer || '',
    avgColor: '#888888',
    alt: '',
    isPremium: !d.is_free,
    category: d.category || 'nature',
  };
}

/**
 * Fetch active photo backgrounds from Firestore.
 * Falls back to hardcoded curated list on error or empty Firestore.
 */
export async function fetchPhotoBackgrounds(skipCache = false): Promise<{ free: PexelsBackground[]; premium: PexelsBackground[] }> {
  // 1. Check local cache
  if (!skipCache) {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const entry: CachedData = JSON.parse(cached);
        if (Date.now() - entry.timestamp < CACHE_TTL) {
          return { free: entry.free, premium: entry.premium };
        }
      }
    } catch { /* skip corrupted cache */ }
  }

  // 2. Fetch from Firestore
  try {
    const q = query(
      collection(db, 'photoBackgrounds'),
      where('is_active', '==', true),
      orderBy('order_index', 'asc'),
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Firestore has no backgrounds yet — use hardcoded
      return { free: FREE_PEXELS_BACKGROUNDS, premium: PREMIUM_PEXELS_BACKGROUNDS };
    }

    const all = snap.docs.map(d => docToBackground(d.data(), d.id));
    const free = all.filter(b => !b.isPremium);
    const premium = all.filter(b => b.isPremium);

    // Cache results
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ free, premium, timestamp: Date.now() }));
    } catch { /* cache write failure is non-critical */ }

    return { free, premium };
  } catch (error) {
    console.warn('⚠️ Failed to fetch photo backgrounds from Firestore:', error);
    // Fallback to hardcoded
    return { free: FREE_PEXELS_BACKGROUNDS, premium: PREMIUM_PEXELS_BACKGROUNDS };
  }
}

/** Clear cached photo backgrounds so next fetch pulls fresh data from Firestore */
export async function clearPhotoBackgroundsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch { /* non-critical */ }
}

export function subscribeToPhotoBackgrounds(
  onChange: (data: { free: PexelsBackground[]; premium: PexelsBackground[] }) => void,
  onError?: (error: unknown) => void
): () => void {
  try {
    const q = query(
      collection(db, 'photoBackgrounds'),
      where('is_active', '==', true),
      orderBy('order_index', 'asc'),
    );

    return onSnapshot(
      q,
      (snap) => {
        const next = snap.empty
          ? { free: FREE_PEXELS_BACKGROUNDS, premium: PREMIUM_PEXELS_BACKGROUNDS }
          : (() => {
              const all = snap.docs.map(d => docToBackground(d.data(), d.id));
              return {
                free: all.filter(b => !b.isPremium),
                premium: all.filter(b => b.isPremium),
              };
            })();

        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, timestamp: Date.now() })).catch(() => {});
        onChange(next);
      },
      (error) => {
        console.warn('⚠️ Photo backgrounds listener failed:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    onError?.(error);
    return () => {};
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Categories — admin-managed, with hardcoded fallback
// ════════════════════════════════════════════════════════════════════════════

export interface PhotoBackgroundCategory {
  id: string;        // category key, e.g. 'islamic'
  name_ar: string;   // Arabic display name
  is_active: boolean;
  order_index: number;
}

const CATEGORIES_CACHE_KEY = '@photo_background_categories_cache';
const CATEGORIES_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CachedCategories {
  categories: PhotoBackgroundCategory[];
  timestamp: number;
}

/**
 * Fetch active photo background categories from Firestore.
 * Returns sorted, active-only categories.
 * Returns empty array if Firestore is empty or fetch fails — caller falls back to hardcoded BACKGROUND_CATEGORIES.
 */
export async function fetchPhotoBackgroundCategories(skipCache = false): Promise<PhotoBackgroundCategory[]> {
  // 1. Local cache
  if (!skipCache) {
    try {
      const raw = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
      if (raw) {
        const entry: CachedCategories = JSON.parse(raw);
        if (Date.now() - entry.timestamp < CATEGORIES_CACHE_TTL) {
          return entry.categories;
        }
      }
    } catch { /* skip corrupted cache */ }
  }

  // 2. Firestore
  try {
    const snap = await getDocs(collection(db, 'photoBackgroundCategories'));
    if (snap.empty) return [];

    const cats: PhotoBackgroundCategory[] = snap.docs
      .map(d => d.data() as PhotoBackgroundCategory)
      .filter(c => c.is_active !== false)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    // Persist cache
    try {
      await AsyncStorage.setItem(
        CATEGORIES_CACHE_KEY,
        JSON.stringify({ categories: cats, timestamp: Date.now() } as CachedCategories),
      );
    } catch { /* non-critical */ }

    return cats;
  } catch (error) {
    console.warn('⚠️ Failed to fetch photo background categories:', error);
    return [];
  }
}

/** Clear cached categories so next fetch pulls fresh data */
export async function clearPhotoBackgroundCategoriesCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CATEGORIES_CACHE_KEY);
  } catch { /* non-critical */ }
}

export function subscribeToPhotoBackgroundCategories(
  onChange: (categories: PhotoBackgroundCategory[]) => void,
  onError?: (error: unknown) => void
): () => void {
  try {
    return onSnapshot(
      collection(db, 'photoBackgroundCategories'),
      (snap) => {
        const cats: PhotoBackgroundCategory[] = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as PhotoBackgroundCategory))
          .filter(c => c.is_active !== false)
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

        AsyncStorage.setItem(
          CATEGORIES_CACHE_KEY,
          JSON.stringify({ categories: cats, timestamp: Date.now() } as CachedCategories),
        ).catch(() => {});
        onChange(cats);
      },
      (error) => {
        console.warn('⚠️ Photo background categories listener failed:', error);
        onError?.(error);
      }
    );
  } catch (error) {
    onError?.(error);
    return () => {};
  }
}
