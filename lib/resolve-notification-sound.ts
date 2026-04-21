/**
 * Unified notification sound resolution.
 *
 * Single source of truth for turning a soundType key (e.g. "salawat", "makkah")
 * into the platform-appropriate filename that expo-notifications expects.
 *
 * Extracted from notifications-manager.ts to avoid a require cycle between
 * notifications-manager.ts ↔ prayer-notifications.ts.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getNotificationSoundValueSync } from './notification-sound-installer';
import {
  NOTIFICATION_SOUND_FILES,
  ADHAN_SOUND_FILES,
  resolveSoundFile,
} from '@/services/notifications/channels';

// ─── Merged sound map (single source of truth from channels.ts) ──────────────
const ALL_SOUND_FILES: Record<string, string> = {
  ...NOTIFICATION_SOUND_FILES,
  ...ADHAN_SOUND_FILES,
};

/**
 * Resolve a soundType to the native sound value for notification content.
 *
 * - iOS: filename with .mp3 extension (must match app.json sounds)
 * - Android: filename WITHOUT .mp3 (raw resource name); actual sound
 *   comes from the channel, but we set content.sound as well for completeness
 * - Returns false for truly silent notifications
 *
 * Resolution: custom installed (Firebase) → bundled sound → general_reminder fallback.
 * NEVER returns 'default' in production builds — always a real bundled filename.
 * In Expo Go, returns 'default' because custom sounds aren't bundled.
 */
// SDK 54: Constants.appOwnership is deprecated and may be null inside Expo Go;
// fall back to the modern executionEnvironment === 'storeClient' signal.
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient';

export function resolveNotificationSound(soundType?: string, soundEnabled?: boolean): string | false {
  if (soundEnabled === false || soundType === 'silent') {
    return false;
  }

  // Expo Go: custom sounds aren't bundled — use system sound so something plays
  if (isExpoGo) return 'default';

  // Determine the key to look up
  // 'default' or missing soundType → 'makkah' for adhan-like contexts,
  // but we resolve to 'general_reminder' for non-adhan contexts here.
  // The caller (prayer-notifications.ts) already forces 'makkah' before calling us,
  // so this fallback mainly catches edge cases from other callers.
  const key = (!soundType || soundType === 'default') ? 'general_reminder' : soundType;

  // 1. Check installed custom sounds (downloaded from Firebase)
  const customSoundValue = getNotificationSoundValueSync(key);
  if (customSoundValue) {
    console.log(`[resolve-notification-sound] Using custom installed sound for ${key}: ${customSoundValue}`);
    return customSoundValue;
  }

  // 2. Look up in the authoritative sound maps from channels.ts
  const file = ALL_SOUND_FILES[key];
  if (file) {
    return resolveSoundFile(file);
  }

  // 3. Unknown sound type — fall back to a real bundled file, never 'default'
  console.warn(`[resolve-notification-sound] Sound type '${key}' not found, falling back to general_reminder`);
  return resolveSoundFile(NOTIFICATION_SOUND_FILES['general_reminder']);
}
