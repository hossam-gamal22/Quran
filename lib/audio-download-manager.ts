// lib/audio-download-manager.ts
// مدير تحميل الصوت — Audio Download Manager for Offline Listening

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSurahAudioUrl } from './quran-cache';

const DOWNLOADS_KEY = '@downloaded_surahs';
const BASE_DIR = (FileSystem.documentDirectory || '') + 'quran-audio/';

export interface DownloadedSurah {
  surahNumber: number;
  reciterId: string;
  fileUri: string;
  fileSize: number;
  downloadedAt: number;
}

// Active downloads tracking (prevents duplicate downloads)
const activeDownloads = new Set<string>();

function getKey(surahNumber: number, reciterId: string): string {
  return `${reciterId}_${surahNumber}`;
}

function getFileName(surahNumber: number): string {
  return `${surahNumber.toString().padStart(3, '0')}.mp3`;
}

function getFilePath(surahNumber: number, reciterId: string): string {
  return `${BASE_DIR}${reciterId}/${getFileName(surahNumber)}`;
}

// ─── Load/Save registry ──────────────────────────────────────────────────────
async function loadRegistry(): Promise<DownloadedSurah[]> {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveRegistry(items: DownloadedSurah[]): Promise<void> {
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(items));
}

async function ensureDir(reciterId: string): Promise<void> {
  const dirPath = `${BASE_DIR}${reciterId}/`;
  const info = await FileSystem.getInfoAsync(dirPath);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Check if a surah is downloaded for a specific reciter */
export async function isDownloaded(surahNumber: number, reciterId: string): Promise<boolean> {
  const registry = await loadRegistry();
  const entry = registry.find(d => d.surahNumber === surahNumber && d.reciterId === reciterId);
  if (!entry) return false;
  const info = await FileSystem.getInfoAsync(getFilePath(surahNumber, reciterId));
  return info.exists;
}

/** Get local file URI for a downloaded surah (null if not downloaded) */
export async function getLocalUri(surahNumber: number, reciterId: string): Promise<string | null> {
  const registry = await loadRegistry();
  const entry = registry.find(d => d.surahNumber === surahNumber && d.reciterId === reciterId);
  if (!entry) return null;
  const info = await FileSystem.getInfoAsync(getFilePath(surahNumber, reciterId));
  if (!info.exists) return null;
  return info.uri;
}

/** Download a surah for offline listening */
export async function downloadSurah(
  surahNumber: number,
  reciterId: string,
  onProgress?: (progress: number) => void,
): Promise<DownloadedSurah> {
  const key = getKey(surahNumber, reciterId);

  if (activeDownloads.has(key)) {
    throw new Error('التحميل جاري بالفعل');
  }

  const existing = await getLocalUri(surahNumber, reciterId);
  if (existing) {
    return {
      surahNumber,
      reciterId,
      fileUri: existing,
      fileSize: 0,
      downloadedAt: Date.now(),
    };
  }

  await ensureDir(reciterId);

  const url = getSurahAudioUrl(reciterId, surahNumber);
  const destPath = getFilePath(surahNumber, reciterId);

  activeDownloads.add(key);

  try {
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      destPath,
      {},
      (downloadProgress) => {
        if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
          const pct = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          onProgress(Math.min(pct, 1));
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result?.uri) throw new Error('فشل التحميل');

    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    const fileSize = (fileInfo as any).size || 0;

    const entry: DownloadedSurah = {
      surahNumber,
      reciterId,
      fileUri: result.uri,
      fileSize,
      downloadedAt: Date.now(),
    };

    const registry = await loadRegistry();
    const filtered = registry.filter(d => !(d.surahNumber === surahNumber && d.reciterId === reciterId));
    filtered.push(entry);
    await saveRegistry(filtered);

    return entry;
  } finally {
    activeDownloads.delete(key);
  }
}

/** Delete a downloaded surah */
export async function deleteDownload(surahNumber: number, reciterId: string): Promise<void> {
  const path = getFilePath(surahNumber, reciterId);
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {}
  const registry = await loadRegistry();
  await saveRegistry(registry.filter(d => !(d.surahNumber === surahNumber && d.reciterId === reciterId)));
}

/** Get all downloaded surahs */
export async function getDownloadedSurahs(): Promise<DownloadedSurah[]> {
  return loadRegistry();
}

/** Get downloaded surahs for a specific reciter */
export async function getDownloadedForReciter(reciterId: string): Promise<DownloadedSurah[]> {
  const registry = await loadRegistry();
  return registry.filter(d => d.reciterId === reciterId);
}

/** Get total download size in bytes */
export async function getTotalDownloadSize(): Promise<number> {
  const registry = await loadRegistry();
  return registry.reduce((sum, d) => sum + d.fileSize, 0);
}

/** Check if a download is in progress */
export function isDownloading(surahNumber: number, reciterId: string): boolean {
  return activeDownloads.has(getKey(surahNumber, reciterId));
}

/** Delete all downloads */
export async function deleteAllDownloads(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(BASE_DIR);
    if (info.exists) await FileSystem.deleteAsync(BASE_DIR, { idempotent: true });
  } catch {}
  await AsyncStorage.removeItem(DOWNLOADS_KEY);
}
