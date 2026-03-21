// lib/audio-coordinator.ts
// Central audio coordinator — ensures only one audio source plays at a time
// All audio sources must request focus before playing

import { Audio, type AVPlaybackSource } from 'expo-av';

export type AudioSourceType = 
  | 'quran' 
  | 'radio' 
  | 'azkar' 
  | 'azkar-item'  // Individual azkar playback (not queue)
  | 'notification-preview'
  | 'recitations'
  | 'notification-sound'
  | 'other';

interface AudioSourceCallbacks {
  stop: () => Promise<void> | void;
  pause?: () => Promise<void> | void;
}

interface RegisteredSource {
  type: AudioSourceType;
  callbacks: AudioSourceCallbacks;
  priority: number;
}

// Higher priority sources can interrupt lower priority ones
const PRIORITY_MAP: Record<AudioSourceType, number> = {
  'notification-sound': 100,  // Highest - always plays
  'quran': 50,
  'radio': 50,
  'azkar': 50,
  'recitations': 50,
  'azkar-item': 40,
  'notification-preview': 30,
  'other': 20,
};

class AudioCoordinator {
  private currentSource: RegisteredSource | null = null;
  private registeredSources: Map<string, RegisteredSource> = new Map();
  private listeners: Set<(source: AudioSourceType | null) => void> = new Set();

  /**
   * Request audio focus before playing.
   * This will stop any currently playing audio source.
   * 
   * @param sourceType - The type of audio source requesting focus
   * @param callbacks - Stop/pause callbacks for when another source needs focus
   * @param sourceId - Unique identifier for this source instance
   * @returns true if focus was granted
   */
  async requestFocus(
    sourceType: AudioSourceType,
    callbacks: AudioSourceCallbacks,
    sourceId?: string
  ): Promise<boolean> {
    const id = sourceId || `${sourceType}_${Date.now()}`;
    const priority = PRIORITY_MAP[sourceType] || 20;

    // Stop current audio if playing (unless it's a notification sound)
    if (this.currentSource && sourceType !== 'notification-sound') {
      if (this.currentSource.type !== 'notification-sound') {
        console.log(`🔇 [AudioCoordinator] Stopping ${this.currentSource.type} for ${sourceType}`);
        try {
          await this.currentSource.callbacks.stop();
        } catch (e) {
          console.warn('[AudioCoordinator] Error stopping previous source:', e);
        }
      }
    }

    // Register this source
    const source: RegisteredSource = { type: sourceType, callbacks, priority };
    this.registeredSources.set(id, source);
    this.currentSource = source;

    console.log(`🎵 [AudioCoordinator] Focus granted to ${sourceType} (id: ${id})`);
    this.notifyListeners(sourceType);

    return true;
  }

  /**
   * Release audio focus (call when audio stops playing)
   */
  releaseFocus(sourceId?: string, sourceType?: AudioSourceType): void {
    if (sourceId) {
      this.registeredSources.delete(sourceId);
    }

    // Clear current source if it matches
    if (this.currentSource && 
        (sourceType === this.currentSource.type || 
         (sourceId && this.registeredSources.size === 0))) {
      console.log(`🔈 [AudioCoordinator] Focus released by ${this.currentSource.type}`);
      this.currentSource = null;
      this.notifyListeners(null);
    }
  }

  /**
   * Stop all audio sources
   */
  async stopAll(): Promise<void> {
    console.log('🔇 [AudioCoordinator] Stopping all audio sources');
    
    for (const [id, source] of this.registeredSources) {
      try {
        await source.callbacks.stop();
      } catch (e) {
        console.warn(`[AudioCoordinator] Error stopping source ${id}:`, e);
      }
    }
    
    this.registeredSources.clear();
    this.currentSource = null;
    this.notifyListeners(null);
  }

  /**
   * Get the currently playing source type
   */
  getCurrentSource(): AudioSourceType | null {
    return this.currentSource?.type || null;
  }

  /**
   * Subscribe to source changes
   */
  subscribe(listener: (source: AudioSourceType | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(source: AudioSourceType | null): void {
    this.listeners.forEach(listener => listener(source));
  }
}

// Singleton instance
export const audioCoordinator = new AudioCoordinator();

// Convenience function for one-off sounds that auto-cleanup
export async function playOneShotSound(
  source: AVPlaybackSource,
  sourceType: AudioSourceType = 'other'
): Promise<Audio.Sound> {
  const soundId = `oneshot_${Date.now()}`;
  let sound: Audio.Sound | null = null;

  // Request focus
  await audioCoordinator.requestFocus(
    sourceType,
    {
      stop: async () => {
        if (sound) {
          try {
            await sound.stopAsync();
            await sound.unloadAsync();
          } catch {}
          sound = null;
        }
      }
    },
    soundId
  );

  // Play the sound
  const { sound: newSound } = await Audio.Sound.createAsync(
    source,
    { shouldPlay: true },
    (status) => {
      if (status.isLoaded && status.didJustFinish) {
        newSound.unloadAsync();
        audioCoordinator.releaseFocus(soundId, sourceType);
      }
    }
  );
  
  sound = newSound;
  return newSound;
}
