// lib/photo-backgrounds.ts
// Background photo download & saved photos management — روح المسلم
// All browsable photos now come from constants/pexels-backgrounds.ts (static curated list).
// No live Pexels API calls or Firestore fetches in user-facing code.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const SAVED_PHOTOS_KEY = '@saved_photo_backgrounds_v1';

export interface SavedPhoto {
  id: number;
  localPath: string;
  thumbnailUrl: string;
  photographer: string;
  savedAt: number;
  avgColor?: string;
}

export interface PexelsPhoto {
  id: number;
  url: string;
  photographer: string;
  is_free?: boolean;
  avg_color?: string;
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
    await savePhotoMetadata(photo, localPath);
    return localPath;
  }

  const downloadResult = await FileSystem.downloadAsync(
    photo.src.large2x,
    localPath
  );
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
  if (saved.some(s => s.id === photo.id)) return;
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
