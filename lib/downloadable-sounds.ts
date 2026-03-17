/**
 * Downloadable Sounds — أصوات قابلة للتحميل
 * Fetches sounds marked as downloadable from Firebase and manages local caching.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Paths, File, Directory } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRESTORE_SOUNDS_COLLECTION = 'sounds';
const DOWNLOADED_SOUNDS_KEY = '@downloaded_sounds';

export interface DownloadableSound {
  id: string;
  name: string;
  category: string;
  url: string;
  fileSize: number;
  description?: string;
}

export interface DownloadedSound {
  id: string;
  name: string;
  localUri: string;
  downloadedAt: string;
}

/**
 * Fetch all sounds marked as downloadable from Firestore
 */
export async function fetchDownloadableSounds(): Promise<DownloadableSound[]> {
  try {
    const q = query(
      collection(db, FIRESTORE_SOUNDS_COLLECTION),
      where('isDownloadable', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        category: data.category || 'notification',
        url: data.url || '',
        fileSize: data.fileSize || 0,
        description: data.downloadDescription || '',
      };
    });
  } catch (err) {
    console.warn('Error fetching downloadable sounds:', err);
    return [];
  }
}

/**
 * Get all locally downloaded sounds
 */
export async function getDownloadedSounds(): Promise<DownloadedSound[]> {
  try {
    const data = await AsyncStorage.getItem(DOWNLOADED_SOUNDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Check if a sound is already downloaded
 */
export async function isSoundDownloaded(soundId: string): Promise<boolean> {
  const downloaded = await getDownloadedSounds();
  const found = downloaded.find(s => s.id === soundId);
  if (!found) return false;
  const file = new File(found.localUri);
  return file.exists;
}

/**
 * Download a sound file to local cache
 */
export async function downloadSound(sound: DownloadableSound): Promise<DownloadedSound> {
  // Ensure cache directory exists
  const dir = new Directory(Paths.cache, 'downloaded_sounds');
  if (!dir.exists) {
    dir.create();
  }

  const file = new File(dir, `${sound.id}.mp3`);
  
  // Download the file
  const response = await fetch(sound.url);
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  file.write(new Uint8Array(arrayBuffer));

  const downloaded: DownloadedSound = {
    id: sound.id,
    name: sound.name,
    localUri: file.uri,
    downloadedAt: new Date().toISOString(),
  };

  // Save to downloaded list
  const existing = await getDownloadedSounds();
  const updated = [...existing.filter(s => s.id !== sound.id), downloaded];
  await AsyncStorage.setItem(DOWNLOADED_SOUNDS_KEY, JSON.stringify(updated));

  return downloaded;
}

/**
 * Delete a downloaded sound
 */
export async function deleteDownloadedSound(soundId: string): Promise<void> {
  const downloaded = await getDownloadedSounds();
  const sound = downloaded.find(s => s.id === soundId);
  if (sound) {
    try {
      const file = new File(sound.localUri);
      if (file.exists) file.delete();
    } catch {}
  }
  const updated = downloaded.filter(s => s.id !== soundId);
  await AsyncStorage.setItem(DOWNLOADED_SOUNDS_KEY, JSON.stringify(updated));
}
