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
  complete: require('@/assets/sounds/notif_daily_summary.mp3'),
  subhanallah: require('@/assets/sounds/subhanallah.mp3'),
  morning_adhkar: require('@/assets/sounds/morning_adhkar.mp3'),
  evening_adhkar: require('@/assets/sounds/evening_adhkar.mp3'),
  notif_after_prayer: require('@/assets/sounds/notif_after_prayer.mp3'),
  notif_daily_summary: require('@/assets/sounds/notif_daily_summary.mp3'),
  notif_kahf: require('@/assets/sounds/notif_kahf.mp3'),
  notif_khatma: require('@/assets/sounds/notif_khatma.mp3'),
  notif_sleep: require('@/assets/sounds/notif_sleep.mp3'),
  notif_verse: require('@/assets/sounds/notif_verse.mp3'),
  notif_wakeup: require('@/assets/sounds/notif_wakeup.mp3'),
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

// ─── Complete Adhan Sounds (Full-Length Recordings, 2-4 min) ─────────────────
//
// Used ONLY by the in-app Full Adhan Player (`app/full-adhan.tsx`). DIFFERENT
// from `ADHAN_SOUNDS` above which holds the 29s/35s notification-cap clips
// played as the system notification sound.
//
// IMPORTANT: React Native bundles assets at build time via static `require()`.
// If you reference an MP3 here that does not physically exist in
// `assets/sounds/adhan_complete/`, Metro will fail the build — there is no
// runtime fallback for missing files.
//
// To populate:
//   1. Drop the real MP3 file in `assets/sounds/adhan_complete/`
//   2. Update SOURCES.md with the source URL, license, duration, and SHA256
//   3. Run `pnpm verify:adhan-assets` to confirm
//   4. Add the require() entry below
//   5. Update VOICE_HAS_FAJR_PHRASE in data/adhan-transcript.ts if the
//      recording contains "الصلاة خير من النوم"
//
// Example (after files are added):
//   makkah: require('@/assets/sounds/adhan_complete/adhan_makkah_full.mp3'),
//   madinah: require('@/assets/sounds/adhan_complete/adhan_madinah_full.mp3'),
//   al_aqsa: require('@/assets/sounds/adhan_complete/adhan_al_aqsa_full.mp3'),
//   mishary: require('@/assets/sounds/adhan_complete/adhan_mishary_full.mp3'),
//   abdulbasit: require('@/assets/sounds/adhan_complete/adhan_abdulbasit_full.mp3'),
//   fajr: require('@/assets/sounds/adhan_complete/adhan_fajr_full.mp3'),
export const COMPLETE_ADHAN_SOUNDS: Record<string, number> = {
  makkah: require('@/assets/sounds/adhan_complete/adhan_makkah_full.mp3'),
  madinah: require('@/assets/sounds/adhan_complete/adhan_madinah_full.mp3'),
  al_aqsa: require('@/assets/sounds/adhan_complete/adhan_al_aqsa_full.mp3'),
  mishary: require('@/assets/sounds/adhan_complete/adhan_mishary_full.mp3'),
  abdulbasit: require('@/assets/sounds/adhan_complete/adhan_abdulbasit_full.mp3'),
};

const COMPLETE_ADHAN_VOICE_ALIASES: Record<string, string> = {
  alaqsa: 'al_aqsa',
  al_aqsa: 'al_aqsa',
};

const COMPLETE_TO_NOTIFICATION_SOUND_KEY: Record<string, string> = {
  al_aqsa: 'alaqsa',
};

// All adhan voice keys that have a bundled CAF file in assets/sounds/adhan_full_ios/.
// Keys must exactly match the CAF filename suffix: adhan_full_{key}.caf
// This is the source of truth for iOS full-adhan notification sounds.
const IOS_FULL_ADHAN_CAF_VOICES = new Set([
  'makkah', 'madinah', 'alaqsa', 'mishary', 'abdulbasit',
  'sudais', 'egypt', 'dosari', 'ajman', 'ali_mulla',
  'naqshbandi', 'sharif', 'mansoor_zahrani', 'haramain',
]);

/** Normalizes any adhan voice key to a key that has a full-adhan notification
 * file (CAF on iOS, MP3 on Android). Wider than normalizeCompleteAdhanVoice
 * which only covers the 5 voices with in-app player recordings. */
export function normalizeFullAdhanNotificationVoice(voice: string | null | undefined): string {
  const raw = String(voice || 'makkah').trim();
  // al_aqsa → alaqsa to match the CAF/MP3 filename suffix
  const key = raw === 'al_aqsa' ? 'alaqsa' : raw;
  return IOS_FULL_ADHAN_CAF_VOICES.has(key) ? key : 'makkah';
}

// Dedicated Fajr adhan. Keep null until `adhan_fajr_full.mp3` is physically
// added and legally documented, then replace null with the static require().
export const COMPLETE_FAJR_ADHAN_SOUND: number | null =
  require('@/assets/sounds/adhan_complete/adhan_fajr_full.mp3');

/**
 * Resolves a complete-adhan asset for the requested voice. Falls back to
 * the makkah recording when the requested voice has no complete file
 * (e.g., user previously picked `sudais` for notifications — sudais has no
 * complete recording, so we play makkah instead).
 *
 * Fajr transcript safety lives in data/adhan-transcript.ts. Until a selected
 * voice is explicitly marked as containing "الصلاة خير من النوم", the UI shows
 * the normal transcript even when prayerKey is fajr.
 *
 * Returns `null` when no complete recordings are bundled at all (asset PR
 * has not landed). Callers MUST handle the null case and surface
 * `t('fullAdhan.loadError')` to the user instead of crashing.
 */
export function resolveCompleteAdhanSource(
  voice: string | undefined,
  prayerKey?: string,
): number | null {
  if (prayerKey === 'fajr' && COMPLETE_FAJR_ADHAN_SOUND != null) {
    return COMPLETE_FAJR_ADHAN_SOUND;
  }
  const normalizedVoice = normalizeCompleteAdhanVoice(voice);
  if (normalizedVoice && COMPLETE_ADHAN_SOUNDS[normalizedVoice] != null) {
    return COMPLETE_ADHAN_SOUNDS[normalizedVoice];
  }
  if (COMPLETE_ADHAN_SOUNDS.makkah != null) return COMPLETE_ADHAN_SOUNDS.makkah;
  // No complete recordings bundled yet.
  return null;
}

/** Normalizes saved/legacy regular-adhan keys to complete-adhan picker keys. */
export function normalizeCompleteAdhanVoice(voice: string | null | undefined): string {
  const cleaned = String(voice || 'makkah').trim();
  const aliased = COMPLETE_ADHAN_VOICE_ALIASES[cleaned] || cleaned;
  return COMPLETE_ADHAN_SOUNDS[aliased] != null ? aliased : 'makkah';
}

/** Maps adhan voice keys to notification/raw sound keys (used by AlarmManager on Android).
 * Delegates to normalizeFullAdhanNotificationVoice so all 14 voices are supported. */
export function completeAdhanVoiceToNotificationSoundKey(voice: string | null | undefined): string {
  return normalizeFullAdhanNotificationVoice(voice);
}

/** iOS notification-safe full adhan file. Custom notification sounds are
 * bundled as CAF files capped at 29 seconds; Android keeps using MP3/raw.
 * Covers all 14 voices with CAF files, not just the 5 in-app player voices. */
export function completeAdhanVoiceToIosNotificationSoundFile(voice: string | null | undefined): string {
  return `adhan_full_${normalizeFullAdhanNotificationVoice(voice)}.caf`;
}

/** Whether this build includes a dedicated complete Fajr recording. */
export function hasCompleteFajrAdhanSource(): boolean {
  return COMPLETE_FAJR_ADHAN_SOUND != null;
}

/** Voice keys that have a complete-adhan recording bundled in this build. */
export function listCompleteAdhanVoices(): string[] {
  return Object.keys(COMPLETE_ADHAN_SOUNDS);
}

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

/**
 * Manifest-gated one-shot read of sound settings (replaces a live single-doc
 * listener). Returns a no-op unsubscribe.
 */
export function subscribeToSoundSettings(
  onUpdate?: (settings: SoundSettings) => void,
): () => void {
  (async () => {
    try {
      const { shouldRefetchContent, markContentFetched } = await import('./content-manifest');
      if (!(await shouldRefetchContent('soundSettings'))) return;
      const snap = await getDoc(doc(db, 'appConfig', 'soundSettings'));
      await markContentFetched('soundSettings');
      if (!snap.exists()) return;
      const data = snap.data() as SoundSettings;
      _settingsCache = data;
      AsyncStorage.setItem(
        SETTINGS_CACHE_KEY,
        JSON.stringify({ data, timestamp: Date.now() } as CachedSettings),
      ).catch(() => {});
      const bundled: BundledSoundConfig[] = (data as { bundledSounds?: BundledSoundConfig[] }).bundledSounds || [];
      const disabledIds = bundled.filter((s) => s.enabled === false).map((s) => s.id);
      _disabledSoundsCache = new Set(disabledIds);
      AsyncStorage.setItem(
        DISABLED_SOUNDS_CACHE_KEY,
        JSON.stringify({ ids: disabledIds, timestamp: Date.now() }),
      ).catch(() => {});
      onUpdate?.(data);
    } catch (e) {
      if (__DEV__) console.warn('[sound-manager] failed to fetch sound settings:', e);
    }
  })();
  return () => {};
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
 * Ensure the iOS audio session is configured for playback that:
 *   • Ignores the hardware silent switch (playsInSilentModeIOS: true)
 *   • Stays active in background
 *   • Does not interrupt other audio (mix policy left to native default)
 *
 * MUST be called before every Audio.Sound.createAsync(), because expo-av will
 * otherwise reset the shared AVAudioSession to SoloAmbient — which silences
 * subsequent TrackPlayer playback (e.g. adhkar listen mode) when the device
 * silent switch is on.
 */
async function ensurePlaybackAudioMode(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // Audio session config can fail on web/Expo Go — safe to ignore
  }
}

/**
 * Gracefully fade a Sound's volume to zero, then stop + unload it, so previews
 * (short adhan, ringtones) don't cut off abruptly when the user stops them or
 * navigates away. Falls back to an immediate stop if anything fails. Safe to
 * call with null. After this resolves the Sound is unloaded — discard the ref.
 *
 * @param sound    The expo-av Sound to fade out (may be null).
 * @param duration Total fade length in ms (default 600).
 */
export async function fadeOutAndStop(
  sound: Audio.Sound | null,
  duration = 600,
): Promise<void> {
  if (!sound) return;
  const steps = 8;
  const stepMs = Math.max(20, Math.floor(duration / steps));
  try {
    const status = await sound.getStatusAsync();
    // If it's not actually playing, skip the fade and stop immediately.
    if (status.isLoaded && status.isPlaying) {
      const startVolume =
        typeof status.volume === 'number' ? status.volume : 1.0;
      for (let i = steps - 1; i >= 1; i--) {
        try {
          await sound.setVolumeAsync(startVolume * (i / steps));
        } catch {
          break;
        }
        await new Promise((r) => setTimeout(r, stepMs));
      }
    }
  } catch {
    // getStatus/setVolume can fail if already unloaded — fall through to stop.
  }
  try { await sound.stopAsync(); } catch {}
  try { await sound.unloadAsync(); } catch {}
}

/**
 * Play a sound from a require() source and return the Sound instance.
 * The sound auto-unloads when playback finishes.
 */
export async function playSound(
  soundSource: number,
): Promise<Audio.Sound | null> {
  let sound: Audio.Sound | null = null;
  try {
    await ensurePlaybackAudioMode();
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
    await ensurePlaybackAudioMode();
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
 * - Otherwise looks up the `uploadedSounds` collection (admin-uploaded mp3s)
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

  // Look up in Firestore sounds collection (admin-managed)
  try {
    const { getDoc: getDocFn, doc: docFn } = await import('firebase/firestore');
    const soundDoc = await getDocFn(docFn(db, 'sounds', soundId));
    if (soundDoc.exists()) {
      const url = soundDoc.data()?.url;
      if (url) return { type: 'url', url };
    }
  } catch (error) {
    console.warn('Failed to resolve admin sound ID from sounds:', soundId, error);
  }

  // Look up in Firestore uploadedSounds collection (admin-uploaded mp3s, pending bundling)
  try {
    const { getDoc: getDocFn, doc: docFn } = await import('firebase/firestore');
    const uploadedDoc = await getDocFn(docFn(db, 'uploadedSounds', soundId));
    if (uploadedDoc.exists()) {
      const data = uploadedDoc.data();
      // Skip disabled uploads
      if (data?.status === 'disabled') return null;
      // If linked to a bundled sound, prefer that (instant playback)
      if (data?.bundledSoundId && ALL_BUNDLED[data.bundledSoundId] != null) {
        return { type: 'bundled', source: ALL_BUNDLED[data.bundledSoundId] };
      }
      // Otherwise stream from downloadUrl
      const url = data?.downloadUrl;
      if (url) return { type: 'url', url };
    }
  } catch (error) {
    console.warn('Failed to resolve admin sound ID from uploadedSounds:', soundId, error);
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
