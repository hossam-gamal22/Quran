// lib/track-player-service.ts
// Playback service for react-native-track-player
// Handles remote events (lock screen controls, notification buttons)

import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * This is the service that handles remote events from notification/lock screen.
 * It must be registered in the app entry point.
 */
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch {
      // Single-track mode (Quran) — skipToNext fails because queue has 1 track.
      // Delegate to audioPlayer for next ayah/surah.
      try {
        const { audioPlayer } = require('./audio-player');
        await audioPlayer.playNextAyah();
      } catch (e) {
        console.warn('[TrackPlayer] RemoteNext: no next track available', e);
      }
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch {
      // Single-track mode (Quran) — delegate to audioPlayer for previous ayah.
      try {
        const { audioPlayer } = require('./audio-player');
        await audioPlayer.playPreviousAyah();
      } catch (e) {
        console.warn('[TrackPlayer] RemotePrevious: no previous track available', e);
      }
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(progress.position + (event.interval || 10));
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(0, progress.position - (event.interval || 10)));
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
    if (event.track) {
      console.log('[TrackPlayer] Track changed:', event.track.title);
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
    const message = event?.message;
    const code = event?.code;
    if (!message && !code) {
      // Empty payload — happens during normal track transitions on some
      // versions of react-native-track-player. Don't surface as a red
      // LogBox error.
      console.warn('[TrackPlayer] Playback event without payload', event);
      return;
    }
    console.warn('[TrackPlayer] Playback error:', { code, message });
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => {
    console.log('[TrackPlayer] Queue ended, track:', event.track);
  });
}

export default PlaybackService;
