// lib/track-player-service.ts
// Playback service for react-native-track-player
// Handles remote events (lock screen, notification controls)
// Uses lazy require to avoid crash in Expo Go

export async function PlaybackService() {
  try {
    const mod = require('react-native-track-player');
    const TrackPlayer = mod.default || mod;
    const Event = mod.Event;

    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
    TrackPlayer.addEventListener(Event.RemoteSeek, (e: any) => TrackPlayer.seekTo(e.position));
  } catch {
    // TrackPlayer native module not available (Expo Go) — silently skip
  }
}
