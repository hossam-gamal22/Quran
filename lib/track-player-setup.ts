// lib/track-player-setup.ts
// DEPRECATED: TrackPlayer has been replaced with expo-av for audio playback
// These exports are kept as no-ops to prevent import errors during migration

/**
 * No-op: TrackPlayer setup is disabled, app uses expo-av instead
 */
export async function setupTrackPlayer(): Promise<boolean> {
  return false;
}

/**
 * No-op: Always returns false as TrackPlayer is disabled
 */
export function isTrackPlayerSetup(): boolean {
  return false;
}
