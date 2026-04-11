// lib/track-player-manager.ts
// Wrapper around react-native-track-player for app-specific functionality
// Provides unified API for Quran, Azkar, and Radio playback with notification controls

import { Platform } from 'react-native';
import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
  RepeatMode,
  State,
  Track,
  AddTrack,
  usePlaybackState,
  useProgress,
  useActiveTrack,
} from 'react-native-track-player';

// Re-export hooks for easy access
export { usePlaybackState, useProgress, useActiveTrack };

// Audio source types
export type AudioSourceType = 'quran' | 'azkar' | 'radio' | 'none';

// Track metadata with source info
export interface AppTrack extends AddTrack {
  sourceType: AudioSourceType;
  // Quran-specific
  surahNumber?: number;
  ayahNumber?: number;
  reciterIdentifier?: string;
  // Azkar-specific
  dhikrId?: string;
  // Radio-specific
  stationId?: string;
}

// Manager state
interface ManagerState {
  isSetup: boolean;
  currentSource: AudioSourceType;
}

let managerState: ManagerState = {
  isSetup: false,
  currentSource: 'none',
};

// Event listeners
type SourceChangeListener = (source: AudioSourceType) => void;
const sourceListeners = new Set<SourceChangeListener>();

export function subscribeToSourceChange(listener: SourceChangeListener): () => void {
  sourceListeners.add(listener);
  return () => sourceListeners.delete(listener);
}

function notifySourceChange(source: AudioSourceType) {
  managerState.currentSource = source;
  sourceListeners.forEach(l => l(source));
}

/**
 * Initialize TrackPlayer - must be called once at app startup
 */
export async function setupPlayer(): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.log('[TrackPlayerManager] Web platform - skipping setup');
    return false;
  }

  if (managerState.isSetup) {
    console.log('[TrackPlayerManager] Already setup');
    return true;
  }

  try {
    await TrackPlayer.setupPlayer({
      // Buffer configuration for streaming
      minBuffer: 15, // minimum buffer in seconds
      maxBuffer: 50, // maximum buffer in seconds
      playBuffer: 2, // playback starts when this much is buffered
      backBuffer: 30, // how much to keep in back buffer
    });

    await TrackPlayer.updateOptions({
      // Notification appearance
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      // Capabilities shown in notification
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      // Capabilities when notification is compact (collapsed)
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      // Progress bar
      progressUpdateEventInterval: 1,
    });

    managerState.isSetup = true;
    console.log('[TrackPlayerManager] ✅ Setup complete');
    return true;
  } catch (error) {
    console.error('[TrackPlayerManager] Setup failed:', error);
    return false;
  }
}

/**
 * Check if player is ready
 */
export function isPlayerReady(): boolean {
  return managerState.isSetup;
}

/**
 * Get current source type
 */
export function getCurrentSource(): AudioSourceType {
  return managerState.currentSource;
}

/**
 * Play a single Quran ayah or full surah
 */
export async function playQuran(options: {
  url: string;
  surahNumber: number;
  ayahNumber: number;
  reciterIdentifier: string;
  surahName: string;
  reciterName: string;
  isFullSurah?: boolean;
  artwork?: string;
}): Promise<void> {
  if (!managerState.isSetup) {
    await setupPlayer();
  }

  const track: AppTrack = {
    id: `quran-${options.surahNumber}-${options.ayahNumber}`,
    url: options.url,
    title: options.isFullSurah 
      ? `سورة ${options.surahName}` 
      : `سورة ${options.surahName} - آية ${options.ayahNumber}`,
    artist: options.reciterName,
    album: 'القرآن الكريم',
    artwork: options.artwork || require('@/assets/images/app-icon.png'),
    sourceType: 'quran',
    surahNumber: options.surahNumber,
    ayahNumber: options.ayahNumber,
    reciterIdentifier: options.reciterIdentifier,
  };

  await TrackPlayer.reset();
  await TrackPlayer.add(track);
  await TrackPlayer.play();
  
  notifySourceChange('quran');
  console.log('[TrackPlayerManager] Playing Quran:', track.title);
}

/**
 * Play Azkar queue
 */
export async function playAzkarQueue(tracks: {
  id: string;
  url: string;
  title: string;
  subtitle?: string;
}[], startIndex: number = 0): Promise<void> {
  if (!managerState.isSetup) {
    await setupPlayer();
  }

  const appTracks: AppTrack[] = tracks.map((t, idx) => ({
    id: `azkar-${t.id}-${idx}`,
    url: t.url,
    title: t.title,
    artist: t.subtitle || 'أذكار',
    album: 'الأذكار',
    artwork: require('@/assets/images/app-icon.png'),
    sourceType: 'azkar' as AudioSourceType,
    dhikrId: t.id,
  }));

  await TrackPlayer.reset();
  await TrackPlayer.add(appTracks);
  
  if (startIndex > 0 && startIndex < appTracks.length) {
    await TrackPlayer.skip(startIndex);
  }
  
  await TrackPlayer.play();
  
  notifySourceChange('azkar');
  console.log('[TrackPlayerManager] Playing Azkar queue, tracks:', appTracks.length);
}

/**
 * Play Radio stream
 */
export async function playRadio(options: {
  url: string;
  stationId: string;
  stationName: string;
  artwork?: string;
}): Promise<void> {
  if (!managerState.isSetup) {
    await setupPlayer();
  }

  const track: AppTrack = {
    id: `radio-${options.stationId}`,
    url: options.url,
    title: options.stationName,
    artist: 'بث مباشر',
    album: 'إذاعة القرآن',
    artwork: options.artwork || require('@/assets/images/app-icon.png'),
    sourceType: 'radio',
    stationId: options.stationId,
    isLiveStream: true,
  };

  await TrackPlayer.reset();
  await TrackPlayer.add(track);
  await TrackPlayer.play();
  
  notifySourceChange('radio');
  console.log('[TrackPlayerManager] Playing Radio:', track.title);
}

/**
 * Play/Pause toggle
 */
export async function togglePlayPause(): Promise<void> {
  const state = await TrackPlayer.getPlaybackState();
  if (state.state === State.Playing) {
    await TrackPlayer.pause();
  } else {
    await TrackPlayer.play();
  }
}

/**
 * Stop playback and clear queue
 */
export async function stop(): Promise<void> {
  await TrackPlayer.stop();
  await TrackPlayer.reset();
  notifySourceChange('none');
}

/**
 * Seek to position
 */
export async function seekTo(position: number): Promise<void> {
  await TrackPlayer.seekTo(position);
}

/**
 * Skip to next track
 */
export async function skipToNext(): Promise<void> {
  try {
    await TrackPlayer.skipToNext();
  } catch {
    // End of queue
    console.log('[TrackPlayerManager] End of queue');
  }
}

/**
 * Skip to previous track
 */
export async function skipToPrevious(): Promise<void> {
  try {
    await TrackPlayer.skipToPrevious();
  } catch {
    // Beginning of queue
    console.log('[TrackPlayerManager] Beginning of queue');
  }
}

/**
 * Get current queue
 */
export async function getQueue(): Promise<Track[]> {
  return TrackPlayer.getQueue();
}

/**
 * Get current track index
 */
export async function getCurrentTrackIndex(): Promise<number | null> {
  const index = await TrackPlayer.getActiveTrackIndex();
  return index ?? null;
}

/**
 * Set playback rate
 */
export async function setRate(rate: number): Promise<void> {
  await TrackPlayer.setRate(rate);
}

/**
 * Set repeat mode
 */
export async function setRepeatMode(mode: RepeatMode): Promise<void> {
  await TrackPlayer.setRepeatMode(mode);
}

/**
 * Add track to queue
 */
export async function addToQueue(track: AppTrack): Promise<void> {
  await TrackPlayer.add(track);
}

/**
 * Update notification metadata for current track
 */
export async function updateMetadata(metadata: {
  title?: string;
  artist?: string;
  artwork?: string;
}): Promise<void> {
  const trackIndex = await TrackPlayer.getActiveTrackIndex();
  if (trackIndex !== undefined && trackIndex !== null) {
    await TrackPlayer.updateMetadataForTrack(trackIndex, metadata);
  }
}

/**
 * Destroy the player (call on app unmount if needed)
 */
export async function destroy(): Promise<void> {
  try {
    await TrackPlayer.reset();
    managerState.isSetup = false;
    managerState.currentSource = 'none';
  } catch {}
}
