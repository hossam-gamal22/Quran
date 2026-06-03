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
 * Resolution: missing/'default' → system default sound; otherwise
 * custom installed (Firebase) → bundled sound → system default fallback.
 * Returning 'default' lets iOS/Android play the phone's normal notification tone.
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

  // Missing or explicit 'default' → use the phone's system notification sound.
  // Adhan callers (prayer-notifications.ts) force 'makkah' before calling us,
  // so this only affects reminder/general-style notifications.
  if (!soundType || soundType === 'default') return 'default';

  // iOS short-adhan: Apple only reliably plays caf/aiff/wav for
  // UNNotificationSound — mp3 is silently dropped to the default tone. The
  // matching <voice>.caf clips (15s, 2s fade-out) are bundled into the iOS
  // target by plugins/with-ios-adhan-sounds.js, which copies every .caf from
  // assets/sounds/adhan_full_ios/. Android is untouched: it keeps playing the
  // faded <voice>.mp3 via its immutable notification channel.
  if (Platform.OS === 'ios' && ADHAN_SOUND_FILES[soundType]) {
    return `${soundType}.caf`;
  }

  // 1. Check installed custom sounds (downloaded from Firebase)
  const customSoundValue = getNotificationSoundValueSync(soundType);
  if (customSoundValue) {
    console.log(`[resolve-notification-sound] Using custom installed sound for ${soundType}: ${customSoundValue}`);
    return customSoundValue;
  }

  // 2. Look up in the authoritative sound maps from channels.ts
  const file = ALL_SOUND_FILES[soundType];
  if (file) {
    return resolveSoundFile(file);
  }

  // 3. Unknown sound type — fall back to the system default sound
  console.warn(`[resolve-notification-sound] Sound type '${soundType}' not found, falling back to system default`);
  return 'default';
}
