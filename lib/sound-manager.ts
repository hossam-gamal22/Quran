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
  salawat: require('@/assets/sounds/salawat.mp3'),
  istighfar: require('@/assets/sounds/istighfar.mp3'),
  tasbih: require('@/assets/sounds/tasbih.mp3'),
  alhamdulillah: require('@/assets/sounds/alhamdulillah.mp3'),
  subhanallah: require('@/assets/sounds/subhanallah.mp3'),
  morning_adhkar: require('@/assets/sounds/morning_adhkar.mp3'),
  evening_adhkar: require('@/assets/sounds/evening_adhkar.mp3'),
  general_reminder: require('@/assets/sounds/general_reminder.mp3'),
};

export const ADHAN_SOUNDS: Record<string, number> = {
  makkah: require('@/assets/sounds/makkah.mp3'),
  madinah: require('@/assets/sounds/madinah.mp3'),
  alaqsa: require('@/assets/sounds/alaqsa.mp3'),
  mishary: require('@/assets/sounds/mishary.mp3'),
  abdulbasit: require('@/assets/sounds/abdulbasit.mp3'),
  sudais: require('@/assets/sounds/sudais.mp3'),
  egypt: require('@/assets/sounds/egypt.mp3'),
  dosari: require('@/assets/sounds/dosari.mp3'),
  ajman: require('@/assets/sounds/ajman.mp3'),
  ali_mulla: require('@/assets/sounds/ali_mulla.mp3'),
  naqshbandi: require('@/assets/sounds/naqshbandi.mp3'),
  sharif: require('@/assets/sounds/sharif.mp3'),
  mansoor_zahrani: require('@/assets/sounds/mansoor_zahrani.mp3'),
  haramain: require('@/assets/sounds/haramain.mp3'),
  silent: require('@/assets/sounds/silent.mp3'),
};

export const EFFECT_SOUNDS: Record<string, number> = {
  button_click: require('@/assets/sounds/effects/button_click.mp3'),
  success: require('@/assets/sounds/effects/success.mp3'),
  page_turn: require('@/assets/sounds/effects/page_turn.mp3'),
  tasbih_click: require('@/assets/sounds/effects/tasbih_click.mp3'),
  prayer_complete: require('@/assets/sounds/effects/prayer_complete.mp3'),
  quran_open: require('@/assets/sounds/effects/quran_open.mp3'),
};

/** @deprecated Old full-category recordings removed. Use per-item audio from azkar-audio-map.ts instead. */
export const ADHKAR_SOUNDS: Record<string, number> = {};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SoundSettings {
  notifications: {
    prayer: string;        // bundled sound ID or Firestore sound doc ID
    azkarReminder: string;
    salawat: string;
    general: string;
  };
  pageEvents: {
    tasbihComplete: string;
    khatmaComplete: string;
    dailyGoalComplete: string;
    verseBookmark: string;
  };
  updatedAt?: string;
}

// Legacy compatibility alias
export type NotificationSoundKey = keyof SoundSettings['notifications'];
export type PageSoundKey = keyof SoundSettings['pageEvents'];

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

// ─── Bundled Sound Enable/Disable from Admin ─────────────────────────────────

interface BundledSoundConfig {
  id: string;
  enabled: boolean;
}

const DISABLED_SOUNDS_CACHE_KEY = '@disabled_bundled_sounds';
const DISABLED_SOUNDS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
let _disabledSoundsCache: Set<string> | null = null;

/**
 * Fetch the set of disabled bundled sound IDs from Firestore appConfig/soundSettings.
 * The admin panel writes bundledSounds[] with enabled flags to this doc.
 */
export async function fetchDisabledBundledSounds(): Promise<Set<string>> {
  if (_disabledSoundsCache) return _disabledSoundsCache;

  // Try local cache
  try {
    const raw = await AsyncStorage.getItem(DISABLED_SOUNDS_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (Date.now() - cached.timestamp < DISABLED_SOUNDS_CACHE_TTL) {
        _disabledSoundsCache = new Set(cached.ids as string[]);
        return _disabledSoundsCache;
      }
    }
  } catch { /* continue */ }

  // Fetch from Firestore
  try {
    const docRef = doc(db, 'appConfig', 'soundSettings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const bundled: BundledSoundConfig[] = data.bundledSounds || [];
      const disabledIds = bundled
        .filter(s => s.enabled === false)
        .map(s => s.id);
      _disabledSoundsCache = new Set(disabledIds);
      await AsyncStorage.setItem(
        DISABLED_SOUNDS_CACHE_KEY,
        JSON.stringify({ ids: disabledIds, timestamp: Date.now() }),
      ).catch(() => {});
      return _disabledSoundsCache;
    }
  } catch (error) {
    console.warn('Failed to fetch disabled bundled sounds:', error);
  }

  return new Set();
}

/** Check if a bundled sound ID is enabled (not disabled by admin) */
export async function isBundledSoundEnabled(soundId: string): Promise<boolean> {
  const disabled = await fetchDisabledBundledSounds();
  return !disabled.has(soundId);
}

/** Clear the disabled sounds cache (e.g. on app update) */
export function clearDisabledSoundsCache(): void {
  _disabledSoundsCache = null;
  AsyncStorage.removeItem(DISABLED_SOUNDS_CACHE_KEY).catch(() => {});
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
  let sound: Audio.Sound | null = null;
  try {
    ({ sound } = await Audio.Sound.createAsync(soundSource));
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound!.unloadAsync();
      }
    });
    return sound;
  } catch (error) {
    if (sound) {
      try { await sound.unloadAsync(); } catch {}
    }
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
  let sound: Audio.Sound | null = null;
  try {
    const localPath = await getCachedSound(url, category);
    ({ sound } = await Audio.Sound.createAsync({ uri: localPath }));
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound!.unloadAsync();
      }
    });
    return sound;
  } catch (error) {
    if (sound) {
      try { await sound.unloadAsync(); } catch {}
    }
    console.warn('Failed to play remote sound, trying fallback:', error);
    if (fallbackBundled != null) {
      return playSound(fallbackBundled);
    }
    return null;
  }
}

// ─── Convenience: Play by Setting Key ────────────────────────────────────────

/** All known bundled sound IDs (merged notification + adhan + effects) */
const ALL_BUNDLED: Record<string, number> = {
  ...NOTIFICATION_SOUNDS,
  ...ADHAN_SOUNDS,
  ...EFFECT_SOUNDS,
};

/**
 * Resolve an admin-assigned sound ID.
 * - If it matches a bundled sound key, returns { type: 'bundled', source: require() }
 * - Otherwise looks up the `sounds` Firestore collection for a URL
 * - Returns null if not found
 */
async function resolveAdminSoundId(
  soundId: string,
): Promise<{ type: 'bundled'; source: number } | { type: 'url'; url: string } | null> {
  if (!soundId) return null;

  // Check bundled sounds first (instant, no network)
  if (ALL_BUNDLED[soundId] != null) {
    return { type: 'bundled', source: ALL_BUNDLED[soundId] };
  }

  // Look up in Firestore sounds collection (uploaded sounds)
  try {
    const { getDoc: getDocFn, doc: docFn } = await import('firebase/firestore');
    const soundDoc = await getDocFn(docFn(db, 'sounds', soundId));
    if (soundDoc.exists()) {
      const url = soundDoc.data()?.url;
      if (url) return { type: 'url', url };
    }
  } catch (error) {
    console.warn('Failed to resolve admin sound ID:', soundId, error);
  }

  return null;
}

/**
 * Play a notification sound by its admin assignment key.
 * Reads from `appConfig/soundSettings.notifications[key]`,
 * resolves the assigned sound ID, and plays it.
 * Falls back to a bundled sound if the admin hasn't assigned one.
 */
export async function playNotificationSound(
  key: NotificationSoundKey,
  fallbackBundled?: number,
): Promise<Audio.Sound | null> {
  const settings = await fetchSoundSettings();
  const soundId = settings?.notifications?.[key];

  if (soundId) {
    const resolved = await resolveAdminSoundId(soundId);
    if (resolved?.type === 'bundled') return playSound(resolved.source);
    if (resolved?.type === 'url') return playSoundFromUrl(resolved.url, 'notifications', fallbackBundled);
  }

  if (fallbackBundled != null) return playSound(fallbackBundled);
  return null;
}

/**
 * Play a page/event sound by its admin assignment key.
 * Reads from `appConfig/soundSettings.pageEvents[key]`,
 * resolves the assigned sound ID, and plays it.
 * Falls back to a bundled sound if the admin hasn't assigned one.
 */
export async function playPageSound(
  key: PageSoundKey,
  fallbackBundled?: number,
): Promise<Audio.Sound | null> {
  const settings = await fetchSoundSettings();
  const soundId = settings?.pageEvents?.[key];

  if (soundId) {
    const resolved = await resolveAdminSoundId(soundId);
    if (resolved?.type === 'bundled') return playSound(resolved.source);
    if (resolved?.type === 'url') return playSoundFromUrl(resolved.url, 'effects', fallbackBundled);
  }

  if (fallbackBundled != null) return playSound(fallbackBundled);
  return null;
}
