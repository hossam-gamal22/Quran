/**
 * Downloadable Sounds — أصوات قابلة للتحميل
 * Fetches sounds marked as downloadable from Firebase and manages local caching.
 * Also installs sounds for background notifications via notification-sound-installer.
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { installSoundForNotifications, uninstallSound as uninstallNotificationSound } from './notification-sound-installer';

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
  const info = await FileSystem.getInfoAsync(found.localUri);
  return info.exists;
}

/**
 * Download a sound file to local cache and install for background notifications
 */
export async function downloadSound(sound: DownloadableSound): Promise<DownloadedSound> {
  // Ensure cache directory exists
  const dirUri = (FileSystem.cacheDirectory ?? '') + 'downloaded_sounds/';
  const dirInfo = await FileSystem.getInfoAsync(dirUri);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
  }

  const fileUri = dirUri + `${sound.id}.mp3`;

  // Download the file
  await FileSystem.downloadAsync(sound.url, fileUri);

  const downloaded: DownloadedSound = {
    id: sound.id,
    name: sound.name,
    localUri: fileUri,
    downloadedAt: new Date().toISOString(),
  };

  // Save to downloaded list
  const existing = await getDownloadedSounds();
  const updated = [...existing.filter(s => s.id !== sound.id), downloaded];
  await AsyncStorage.setItem(DOWNLOADED_SOUNDS_KEY, JSON.stringify(updated));

  // Install for background notifications (copies to Library/Sounds on iOS, creates channel on Android)
  try {
    await installSoundForNotifications(sound.id, sound.name, fileUri);
    console.log(`[downloadable-sounds] Installed ${sound.id} for background notifications`);
  } catch (e) {
    console.warn(`[downloadable-sounds] Failed to install ${sound.id} for notifications:`, e);
    // Continue - foreground playback will still work
  }

  return downloaded;
}

/**
 * Delete a downloaded sound (also removes from notifications)
 */
export async function deleteDownloadedSound(soundId: string): Promise<void> {
  const downloaded = await getDownloadedSounds();
  const sound = downloaded.find(s => s.id === soundId);
  if (sound) {
    try {
      const info = await FileSystem.getInfoAsync(sound.localUri);
      if (info.exists) await FileSystem.deleteAsync(sound.localUri, { idempotent: true });
    } catch {}
  }
  
  // Also uninstall from notifications
  try {
    await uninstallNotificationSound(soundId);
  } catch {}
  
  const updated = downloaded.filter(s => s.id !== soundId);
  await AsyncStorage.setItem(DOWNLOADED_SOUNDS_KEY, JSON.stringify(updated));
}
