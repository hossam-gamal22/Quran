// lib/sound-manager.ts
// Centralized sound file management — handles bundled, cached, and remote sounds

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

// ─── Constants ───────────────────────────────────────────────────────────────

const SOUND_CACHE_DIR = (FileSystem.cacheDirectory ?? '') + 'sounds/';
const SETTINGS_CACHE_KEY = '@sound_settings_cache';
const SETTINGS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Sound categories and their paths
export const SOUND_CATEGORIES = {
  adhan: 'assets/sounds/adhan',
  notifications: 'assets/sounds/notifications',
  adhkar: 'assets/sounds/adhkar',
  effects: 'assets/sounds/effects',
} as const;

// ─── Bundled Sound Mappings ──────────────────────────────────────────────────

export const NOTIFICATION_SOUNDS: Record<string, number> = {
  salawat: require('@/assets/sounds/notifications/salawat.mp3'),
  istighfar: require('@/assets/sounds/notifications/istighfar.mp3'),
  tasbih: require('@/assets/sounds/notifications/tasbih.mp3'),
  alhamdulillah: require('@/assets/sounds/notifications/alhamdulillah.mp3'),
  subhanallah: require('@/assets/sounds/notifications/subhanallah.mp3'),
  morning_adhkar: require('@/assets/sounds/notifications/morning_adhkar.mp3'),
  evening_adhkar: require('@/assets/sounds/notifications/evening_adhkar.mp3'),
  general_reminder: require('@/assets/sounds/notifications/general_reminder.mp3'),
};

export const ADHAN_SOUNDS: Record<string, number> = {
  makkah: require('@/assets/sounds/adhan/makkah.mp3'),
  madinah: require('@/assets/sounds/adhan/madinah.mp3'),
  alaqsa: require('@/assets/sounds/adhan/alaqsa.mp3'),
  mishary: require('@/assets/sounds/adhan/mishary.mp3'),
  abdulbasit: require('@/assets/sounds/adhan/abdulbasit.mp3'),
  sudais: require('@/assets/sounds/adhan/sudais.mp3'),
  egypt: require('@/assets/sounds/adhan/egypt.mp3'),
  dosari: require('@/assets/sounds/adhan/dosari.mp3'),
  ajman: require('@/assets/sounds/adhan/ajman.mp3'),
  ali_mulla: require('@/assets/sounds/adhan/ali_mulla.mp3'),
  naqshbandi: require('@/assets/sounds/adhan/naqshbandi.mp3'),
  sharif: require('@/assets/sounds/adhan/sharif.mp3'),
  mansoor_zahrani: require('@/assets/sounds/adhan/mansoor_zahrani.mp3'),
  haramain: require('@/assets/sounds/adhan/haramain.mp3'),
  silent: require('@/assets/sounds/adhan/silent.mp3'),
};

export const EFFECT_SOUNDS: Record<string, number> = {
  button_click: require('@/assets/sounds/effects/button_click.mp3'),
  success: require('@/assets/sounds/effects/success.mp3'),
  page_turn: require('@/assets/sounds/effects/page_turn.mp3'),
  tasbih_click: require('@/assets/sounds/effects/tasbih_click.mp3'),
  prayer_complete: require('@/assets/sounds/effects/prayer_complete.mp3'),
  quran_open: require('@/assets/sounds/effects/quran_open.mp3'),
};

export const ADHKAR_SOUNDS: Record<string, number> = {
  morning_full: require('@/assets/sounds/adhkar/morning_full.mp3'),
  evening_full: require('@/assets/sounds/adhkar/evening_full.mp3'),
  sleep_full: require('@/assets/sounds/adhkar/sleep_full.mp3'),
  wakeup_full: require('@/assets/sounds/adhkar/wakeup_full.mp3'),
  after_prayer_full: require('@/assets/sounds/adhkar/after_prayer_full.mp3'),
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SoundSettings {
  notificationSounds: {
    prayer: string;   // Firebase Storage URL
    azkar: string;
    salawat: string;
    general: string;
  };
  pageSounds: {
    tasbihComplete: string;
    khatmaComplete: string;
    dailyGoal: string;
  };
}

interface CachedSettings {
  data: SoundSettings;
  timestamp: number;
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

let _settingsCache: SoundSettings | null = null;

// ─── Firebase: Fetch Sound Settings ──────────────────────────────────────────

export async function fetchSoundSettings(): Promise<SoundSettings | null> {
  // Return in-memory cache if available
  if (_settingsCache) return _settingsCache;

  // Try local AsyncStorage cache first
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_CACHE_KEY);
    if (raw) {
      const cached: CachedSettings = JSON.parse(raw);
      if (Date.now() - cached.timestamp < SETTINGS_CACHE_TTL) {
        _settingsCache = cached.data;
        return cached.data;
      }
    }
  } catch {
    // Cache read failed, continue to Firestore
  }

  // Fetch from Firestore
  try {
    const docRef = doc(db, 'appConfig', 'soundSettings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as SoundSettings;
      _settingsCache = data;
      // Persist to local cache
      await AsyncStorage.setItem(
        SETTINGS_CACHE_KEY,
        JSON.stringify({ data, timestamp: Date.now() } as CachedSettings),
      ).catch(() => {});
      return data;
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch sound settings:', error);
    return null;
  }
}

/** Force refresh settings from Firestore (e.g. after admin change) */
export async function refreshSoundSettings(): Promise<SoundSettings | null> {
  _settingsCache = null;
  await AsyncStorage.removeItem(SETTINGS_CACHE_KEY).catch(() => {});
  return fetchSoundSettings();
}

// ─── File Caching ────────────────────────────────────────────────────────────

/**
 * Downloads a remote sound file and caches it locally.
 * Returns the local file URI for playback.
 */
export async function getCachedSound(
  url: string,
  category: string = 'general',
): Promise<string> {
  // Derive a safe filename from the URL
  const urlSegments = url.split('/');
  const rawName = urlSegments[urlSegments.length - 1] || 'sound.mp3';
  // Strip query params and keep only safe chars
  const fileName = rawName.split('?')[0].replace(/[^a-zA-Z0-9._-]/g, '_');
  const dir = SOUND_CACHE_DIR + category + '/';
  const localPath = dir + fileName;

  // Check if already cached
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) return localPath;
  } catch {
    // info check failed, try downloading
  }

  // Download and cache
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const result = await FileSystem.downloadAsync(url, localPath);
  if (result.status >= 200 && result.status < 300) {
    return localPath;
  }
  // Download failed — throw so callers can fall back
  throw new Error(`Download failed with status ${result.status}`);
}

/** Remove all cached sounds (e.g. to free space) */
export async function clearSoundCache(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(SOUND_CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(SOUND_CACHE_DIR, { idempotent: true });
    }
  } catch (error) {
    console.warn('Failed to clear sound cache:', error);
  }
}

// ─── Playback: Bundled (require()) ───────────────────────────────────────────

/**
 * Play a sound from a require() source and return the Sound instance.
 * The sound auto-unloads when playback finishes.
 */
export async function playSound(
  soundSource: number,
): Promise<Audio.Sound | null> {
  try {
    const { sound } = await Audio.Sound.createAsync(soundSource);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
    return sound;
  } catch (error) {
    console.warn('Failed to play sound:', error);
    return null;
  }
}

/** Play and forget — convenience wrapper that handles cleanup automatically */
export async function playSoundOnce(soundSource: number): Promise<void> {
  await playSound(soundSource);
}

// ─── Playback: Remote / Cached URL ──────────────────────────────────────────

/**
 * Play a sound from a URL, caching it locally first.
 * Falls back to an optional bundled sound if download/playback fails.
 */
export async function playSoundFromUrl(
  url: string,
  category: string = 'general',
  fallbackBundled?: number,
): Promise<Audio.Sound | null> {
  try {
    const localPath = await getCachedSound(url, category);
    const { sound } = await Audio.Sound.createAsync({ uri: localPath });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
    return sound;
  } catch (error) {
    console.warn('Failed to play remote sound, trying fallback:', error);
    if (fallbackBundled != null) {
      return playSound(fallbackBundled);
    }
    return null;
  }
}

// ─── Convenience: Play by Setting Key ────────────────────────────────────────

type NotificationSoundKey = keyof SoundSettings['notificationSounds'];
type PageSoundKey = keyof SoundSettings['pageSounds'];

/**
 * Play a notification sound by its key (prayer, azkar, salawat, general).
 * Fetches the URL from cached sound settings, downloads/caches the file,
 * and plays it. Falls back gracefully if settings or file aren't available.
 */
export async function playNotificationSound(
  key: NotificationSoundKey,
  fallbackBundled?: number,
): Promise<Audio.Sound | null> {
  const settings = await fetchSoundSettings();
  const url = settings?.notificationSounds?.[key];
  if (url) {
    return playSoundFromUrl(url, 'notifications', fallbackBundled);
  }
  if (fallbackBundled != null) {
    return playSound(fallbackBundled);
  }
  return null;
}

/**
 * Play a page/effect sound by its key (tasbihComplete, khatmaComplete, dailyGoal).
 */
export async function playPageSound(
  key: PageSoundKey,
  fallbackBundled?: number,
): Promise<Audio.Sound | null> {
  const settings = await fetchSoundSettings();
  const url = settings?.pageSounds?.[key];
  if (url) {
    return playSoundFromUrl(url, 'effects', fallbackBundled);
  }
  if (fallbackBundled != null) {
    return playSound(fallbackBundled);
  }
  return null;
}
