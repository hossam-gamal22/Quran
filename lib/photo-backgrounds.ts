// lib/photo-backgrounds.ts
// خلفيات الصور من Pexels + Firestore — روح المسلم

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const CACHE_KEY = '@pexels_photos_cache_v4';
const ADMIN_CACHE_KEY = '@admin_photos_cache_v1';
const ADMIN_CATEGORIES_CACHE_KEY = '@admin_photo_categories_v1';
const SAVED_PHOTOS_KEY = '@saved_photo_backgrounds_v1';
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days
const ADMIN_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SavedPhoto {
  id: number;
  localPath: string;
  thumbnailUrl: string; // remote URL for thumbnail display
  photographer: string;
  savedAt: number;
  avgColor?: string; // average color from Pexels API for contrast detection
}

export interface PhotoCategory {
  id: string;
  name_ar: string;
  searchTerm: string;
}

export interface PexelsPhoto {
  id: number;
  url: string;
  photographer: string;
  is_free?: boolean; // from admin config
  avg_color?: string; // average color from Pexels API
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

// Fallback categories (used when admin hasn't configured categories)
const FALLBACK_CATEGORIES: PhotoCategory[] = [
  { id: 'sky', name_ar: 'سماء', searchTerm: 'blue sky wallpaper no people' },
  { id: 'clouds', name_ar: 'سحاب', searchTerm: 'clouds sky wallpaper no people' },
  { id: 'ocean', name_ar: 'بحر', searchTerm: 'ocean waves aerial wallpaper no people' },
  { id: 'nature', name_ar: 'طبيعة', searchTerm: 'nature scenery wallpaper no people' },
  { id: 'mountains', name_ar: 'جبال', searchTerm: 'mountains scenery wallpaper no people' },
  { id: 'forest', name_ar: 'غابات', searchTerm: 'forest trees wallpaper no people' },
  { id: 'sunset', name_ar: 'غروب', searchTerm: 'sunset sky wallpaper no people' },
  { id: 'flowers', name_ar: 'زهور', searchTerm: 'flower field wallpaper no people' },
];

// Mutable categories list — updated from Firestore
let _categories: PhotoCategory[] = [...FALLBACK_CATEGORIES];

export function getPhotoCategories(): PhotoCategory[] {
  return _categories;
}

// Legacy compat
export const PHOTO_CATEGORIES = FALLBACK_CATEGORIES;

const FREE_PHOTO_COUNT = 10; // fallback if admin hasn't set per-photo is_free

export function isPhotoFree(globalIndex: number): boolean {
  return globalIndex < FREE_PHOTO_COUNT;
}

// ========================================
// Firestore admin-curated photos
// ========================================

interface AdminPhotoDoc {
  pexels_id: number;
  category: string;
  thumbnail_url: string;
  full_url: string;
  large2x_url: string;
  photographer: string;
  is_free: boolean;
  is_active: boolean;
  order_index: number;
  avg_color?: string;
}

interface AdminCategoryDoc {
  id: string;
  name_ar: string;
  is_active: boolean;
  order_index: number;
}

/**
 * Fetch admin-curated categories from Firestore
 */
export async function fetchAdminCategories(): Promise<PhotoCategory[]> {
  // Check cache
  try {
    const cached = await AsyncStorage.getItem(ADMIN_CATEGORIES_CACHE_KEY);
    if (cached) {
      const { categories, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ADMIN_CACHE_DURATION && categories.length > 0) {
        _categories = categories;
        return categories;
      }
    }
  } catch { /* proceed */ }

  try {
    const { db } = await import('@/config/firebase');
    const { collection, getDocs, query, orderBy } = await import('firebase/firestore');

    const q = query(collection(db, 'photoBackgroundCategories'), orderBy('order_index'));
    const snap = await getDocs(q);

    if (snap.empty) {
      _categories = FALLBACK_CATEGORIES;
      return FALLBACK_CATEGORIES;
    }

    const categories: PhotoCategory[] = snap.docs
      .map(d => d.data() as AdminCategoryDoc)
      .filter(c => c.is_active)
      .map(c => {
        // Use fallback searchTerm so Pexels API works when no admin photos exist
        const fallback = FALLBACK_CATEGORIES.find(fc => fc.id === c.id);
        return {
          id: c.id,
          name_ar: c.name_ar,
          searchTerm: fallback?.searchTerm || `${c.name_ar} wallpaper no people`,
        };
      });

    if (categories.length > 0) {
      _categories = categories;
      await AsyncStorage.setItem(ADMIN_CATEGORIES_CACHE_KEY, JSON.stringify({
        categories,
        timestamp: Date.now(),
      }));
    }

    return categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  } catch (error) {
    console.log('Error fetching admin categories:', error);
    return FALLBACK_CATEGORIES;
  }
}

/**
 * Fetch admin-curated photos for a category from Firestore.
 * Returns null if no admin photos exist (fall back to Pexels API).
 */
async function fetchAdminPhotos(categoryId: string): Promise<PexelsPhoto[] | null> {
  const cacheKey = `${ADMIN_CACHE_KEY}_${categoryId}`;

  // Check cache
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { photos, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ADMIN_CACHE_DURATION) {
        return photos.length > 0 ? photos : null;
      }
    }
  } catch { /* proceed */ }

  try {
    const { db } = await import('@/config/firebase');
    const { collection, getDocs, query, where, orderBy: fsOrderBy } = await import('firebase/firestore');

    const q = query(
      collection(db, 'photoBackgrounds'),
      where('category', '==', categoryId),
      where('is_active', '==', true),
      fsOrderBy('order_index'),
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      // Cache empty result briefly so we don't re-fetch
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ photos: [], timestamp: Date.now() }));
      return null;
    }

    const photos: PexelsPhoto[] = snap.docs.map(d => {
      const data = d.data() as AdminPhotoDoc;
      return {
        id: data.pexels_id,
        url: `https://www.pexels.com/photo/${data.pexels_id}`,
        photographer: data.photographer,
        is_free: data.is_free,
        avg_color: data.avg_color,
        src: {
          original: data.large2x_url,
          large2x: data.large2x_url,
          large: data.full_url,
          medium: data.thumbnail_url,
          small: data.thumbnail_url,
          portrait: data.large2x_url,
          landscape: data.full_url,
          tiny: data.thumbnail_url,
        },
      };
    });

    // Cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ photos, timestamp: Date.now() }));
    return photos;
  } catch (error) {
    console.log('Error fetching admin photos:', error);
    return null;
  }
}

// ========================================
// Main fetch function
// ========================================

export async function fetchCategoryPhotos(category: PhotoCategory): Promise<PexelsPhoto[]> {
  // 1. Try admin-curated photos first
  const adminPhotos = await fetchAdminPhotos(category.id);
  if (adminPhotos && adminPhotos.length > 0) {
    return adminPhotos;
  }

  // 2. Fallback: fetch from Pexels API directly
  // Resolve searchTerm from fallback categories if cached category has empty searchTerm
  const searchTerm = category.searchTerm
    || FALLBACK_CATEGORIES.find(fc => fc.id === category.id)?.searchTerm
    || '';
  if (!searchTerm) return [];

  const cacheKey = `${CACHE_KEY}_${category.id}`;

  // Check cache first
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { photos, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return photos;
      }
    }
  } catch {
    // Cache miss or parse error, proceed to fetch
  }

  // Fetch from Pexels API
  try {
    const { searchPhotos } = await import('@/lib/api/pexels');
    const result = await searchPhotos(searchTerm, 1, 15, 'portrait');
    // Filter out photos with people (check alt text)
    const photos: PexelsPhoto[] = result.photos
      .filter((p: any) => {
        const alt = (p.alt || '').toLowerCase();
        return !alt.includes('person') && !alt.includes('people') && !alt.includes('man') && !alt.includes('woman') && !alt.includes('hand');
      })
      .map((p: any) => ({
        id: p.id,
        url: p.url,
        photographer: p.photographer,
        avg_color: p.avg_color,
        src: p.src,
      }));

    // Cache results
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      photos,
      timestamp: Date.now(),
    }));

    return photos;
  } catch (error) {
    console.log('Error fetching Pexels photos:', error);
    return [];
  }
}

export async function downloadPhotoBackground(photo: PexelsPhoto): Promise<string> {
  const dir = `${FileSystem.documentDirectory}backgrounds/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const filename = `pexels_${photo.id}.jpg`;
  const localPath = `${dir}${filename}`;

  const fileInfo = await FileSystem.getInfoAsync(localPath);
  if (fileInfo.exists) {
    // Ensure metadata is saved even if file already exists
    await savePhotoMetadata(photo, localPath);
    return localPath;
  }

  const downloadResult = await FileSystem.downloadAsync(
    photo.src.large2x,
    localPath
  );
  // Save photo metadata for the saved section
  await savePhotoMetadata(photo, downloadResult.uri);
  return downloadResult.uri;
}

export async function getDownloadedBackgrounds(): Promise<string[]> {
  const dir = `${FileSystem.documentDirectory}backgrounds/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) return [];

  const files = await FileSystem.readDirectoryAsync(dir);
  return files.filter(f => f.startsWith('pexels_')).map(f => `${dir}${f}`);
}

export async function isPhotoDownloaded(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    const info = await FileSystem.getInfoAsync(url);
    return info.exists;
  } catch {
    return false;
  }
}

// ===== Saved Photos Metadata =====

export async function getSavedPhotos(): Promise<SavedPhoto[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_PHOTOS_KEY);
    if (!raw) return [];
    const photos: SavedPhoto[] = JSON.parse(raw);
    // Verify files still exist
    const verified: SavedPhoto[] = [];
    for (const p of photos) {
      const info = await FileSystem.getInfoAsync(p.localPath);
      if (info.exists) verified.push(p);
    }
    if (verified.length !== photos.length) {
      await AsyncStorage.setItem(SAVED_PHOTOS_KEY, JSON.stringify(verified));
    }
    return verified;
  } catch {
    return [];
  }
}

export async function savePhotoMetadata(photo: PexelsPhoto, localPath: string): Promise<void> {
  const saved = await getSavedPhotos();
  if (saved.some(s => s.id === photo.id)) return; // already saved
  saved.unshift({
    id: photo.id,
    localPath,
    thumbnailUrl: photo.src.medium,
    photographer: photo.photographer,
    savedAt: Date.now(),
    avgColor: photo.avg_color,
  });
  await AsyncStorage.setItem(SAVED_PHOTOS_KEY, JSON.stringify(saved));
}

export async function deleteSavedPhoto(id: number): Promise<void> {
  const saved = await getSavedPhotos();
  const photo = saved.find(s => s.id === id);
  if (photo) {
    try { await FileSystem.deleteAsync(photo.localPath, { idempotent: true }); } catch { /* ignore */ }
  }
  const filtered = saved.filter(s => s.id !== id);
  await AsyncStorage.setItem(SAVED_PHOTOS_KEY, JSON.stringify(filtered));
}

export function isPhotoSaved(savedPhotos: SavedPhoto[], photoId: number): boolean {
  return savedPhotos.some(s => s.id === photoId);
}
