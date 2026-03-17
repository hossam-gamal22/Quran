// lib/track-player-setup.ts
// Setup and initialization for react-native-track-player
// Uses lazy require to avoid crash in Expo Go (native module not available)

import { Platform } from 'react-native';

let isSetup = false;

export async function setupTrackPlayer(): Promise<boolean> {
  if (isSetup) return true;
  if (Platform.OS === 'web') return false;

  try {
    const mod = require('react-native-track-player');
    const TrackPlayer = mod.default || mod;
    const Capability = mod.Capability;
    const AppKilledPlaybackBehavior = mod.AppKilledPlaybackBehavior;

    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });

    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
    });

    isSetup = true;
    return true;
  } catch (error) {
    // Player might already be initialized
    const message = (error as Error)?.message || '';
    if (message.includes('already been initialized')) {
      isSetup = true;
      return true;
    }
    console.warn('[track-player] Setup failed:', error);
    return false;
  }
}

export function isTrackPlayerSetup(): boolean {
  return isSetup;
}
