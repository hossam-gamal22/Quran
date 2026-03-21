/**
 * Notification Sound Installer — تثبيت أصوات الإشعارات
 * 
 * Installs downloaded sounds in platform-specific directories so they can be used
 * for background notifications (when app is closed).
 * 
 * Platform behavior:
 * - iOS: Copies sounds to Library/Sounds/ which iOS natively checks for notification sounds
 * - Android: Creates notification channels with custom sound URIs
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from './i18n';

// Storage key for installed notification sounds
const INSTALLED_SOUNDS_KEY = '@installed_notification_sounds';

// In-memory cache for sync access (populated by loadInstalledSoundsCache)
let installedSoundsCache: InstalledSound[] | null = null;

export interface InstalledSound {
  id: string;
  name: string;
  filename: string;           // Just the filename (e.g., 'dhikr_reminder.mp3')
  installedPath: string;      // Full path where installed
  installedAt: string;
  androidChannelId?: string;  // Channel ID for Android
}

/**
 * Load installed sounds into memory cache for sync access
 * Call this on app startup before scheduling notifications
 */
export async function loadInstalledSoundsCache(): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(INSTALLED_SOUNDS_KEY);
    installedSoundsCache = data ? JSON.parse(data) : [];
  } catch {
    installedSoundsCache = [];
  }
}

/**
 * Get cached installed sounds (sync, for use in sync contexts)
 * Returns null if cache not loaded yet
 */
export function getCachedInstalledSounds(): InstalledSound[] | null {
  return installedSoundsCache;
}

/**
 * Get notification sound value sync (from cache)
 * Returns the correct format for each platform, or null if not installed
 */
export function getNotificationSoundValueSync(soundId: string): string | null {
  if (!installedSoundsCache) return null;
  
  const sound = installedSoundsCache.find(s => s.id === soundId);
  if (!sound) return null;
  
  if (Platform.OS === 'ios') {
    // iOS: Just use the filename - iOS will find it in Library/Sounds/
    return sound.filename;
  }
  
  // Android: Return null to indicate we should use the custom channel instead
  return null;
}

/**
 * Get Android channel ID for an installed sound (sync, from cache)
 * Returns null on iOS or if sound not installed
 */
export function getAndroidChannelForSoundSync(soundId: string): string | null {
  if (Platform.OS !== 'android') return null;
  if (!installedSoundsCache) return null;
  
  const sound = installedSoundsCache.find(s => s.id === soundId);
  return sound?.androidChannelId || null;
}

/**
 * Get the directory where notification sounds should be installed
 * - iOS: Library/Sounds/ (iOS looks here automatically for notification sounds)
 * - Android: App's cache (referenced by content URI in channel)
 */
function getNotificationSoundsDirectory(): string {
  if (Platform.OS === 'ios') {
    // iOS looks for custom notification sounds in Library/Sounds/
    // documentDirectory is typically: file:///var/mobile/.../Documents/
    // We need: file:///var/mobile/.../Library/Sounds/
    const docDir = FileSystem.documentDirectory ?? '';
    // Safely construct the Library/Sounds path
    const libraryDir = docDir.replace(/Documents\/?$/, 'Library/');
    return libraryDir + 'Sounds/';
  }
  // Android: use a dedicated notification-sounds folder in cache
  return (FileSystem.cacheDirectory ?? '') + 'notification-sounds/';
}

/**
 * Ensure the notification sounds directory exists
 */
async function ensureSoundsDirectory(): Promise<string> {
  const dir = getNotificationSoundsDirectory();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Get all installed notification sounds
 */
export async function getInstalledSounds(): Promise<InstalledSound[]> {
  try {
    const data = await AsyncStorage.getItem(INSTALLED_SOUNDS_KEY);
    const sounds = data ? JSON.parse(data) : [];
    installedSoundsCache = sounds; // Update cache
    return sounds;
  } catch {
    return [];
  }
}

/**
 * Save installed sounds list (also updates in-memory cache)
 */
async function saveInstalledSounds(sounds: InstalledSound[]): Promise<void> {
  await AsyncStorage.setItem(INSTALLED_SOUNDS_KEY, JSON.stringify(sounds));
  installedSoundsCache = sounds; // Update cache
}

/**
 * Check if a sound is installed for notifications
 */
export async function isSoundInstalled(soundId: string): Promise<boolean> {
  const installed = await getInstalledSounds();
  const found = installed.find(s => s.id === soundId);
  if (!found) return false;
  
  // Verify file still exists
  const info = await FileSystem.getInfoAsync(found.installedPath);
  return info.exists;
}

/**
 * Get installed sound info by ID
 */
export async function getInstalledSound(soundId: string): Promise<InstalledSound | null> {
  const installed = await getInstalledSounds();
  return installed.find(s => s.id === soundId) || null;
}

/**
 * Install a downloaded sound for use in background notifications
 * 
 * @param soundId - Unique identifier for the sound
 * @param soundName - Display name of the sound
 * @param sourceUri - URI of the downloaded sound file
 * @returns The installed sound info
 */
export async function installSoundForNotifications(
  soundId: string,
  soundName: string,
  sourceUri: string,
): Promise<InstalledSound> {
  const dir = await ensureSoundsDirectory();
  
  // Use a safe filename - just the ID with .mp3 extension
  const filename = `${soundId}.mp3`;
  const destPath = dir + filename;
  
  // Copy the file to notification sounds directory
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destPath,
  });
  
  let androidChannelId: string | undefined;
  
  // For Android, create a notification channel with this sound
  if (Platform.OS === 'android') {
    androidChannelId = `custom_sound_${soundId}`;
    
    try {
      await Notifications.setNotificationChannelAsync(androidChannelId, {
        name: `${t('notifications.customSound')}: ${soundName}`,
        importance: Notifications.AndroidImportance.HIGH,
        // Android accepts file:// URIs for custom sounds
        sound: destPath,
        vibrationPattern: [0, 250, 250, 250],
      });
    } catch (e) {
      console.warn(`Failed to create Android channel for sound ${soundId}:`, e);
      // Still save the installation - foreground playback will work
    }
  }
  
  const installed: InstalledSound = {
    id: soundId,
    name: soundName,
    filename,
    installedPath: destPath,
    installedAt: new Date().toISOString(),
    androidChannelId,
  };
  
  // Save to installed list
  const existing = await getInstalledSounds();
  const updated = [...existing.filter(s => s.id !== soundId), installed];
  await saveInstalledSounds(updated);
  
  console.log(`[notification-sound-installer] Installed sound ${soundId} to ${destPath}`);
  
  return installed;
}

/**
 * Uninstall a sound from notifications
 */
export async function uninstallSound(soundId: string): Promise<void> {
  const installed = await getInstalledSounds();
  const sound = installed.find(s => s.id === soundId);
  
  if (sound) {
    // Delete the file
    try {
      const info = await FileSystem.getInfoAsync(sound.installedPath);
      if (info.exists) {
        await FileSystem.deleteAsync(sound.installedPath);
      }
    } catch {}
    
    // Delete Android channel if exists
    if (Platform.OS === 'android' && sound.androidChannelId) {
      try {
        await Notifications.deleteNotificationChannelAsync(sound.androidChannelId);
      } catch {}
    }
  }
  
  // Remove from list
  const updated = installed.filter(s => s.id !== soundId);
  await saveInstalledSounds(updated);
  
  console.log(`[notification-sound-installer] Uninstalled sound ${soundId}`);
}

/**
 * Get the sound value to use in notification content
 * Returns the correct format for each platform
 * 
 * @param soundId - ID of the installed sound
 * @returns Sound value for notification or null if not installed
 */
export async function getNotificationSoundValue(soundId: string): Promise<string | null> {
  const sound = await getInstalledSound(soundId);
  if (!sound) return null;
  
  // Verify file exists
  const info = await FileSystem.getInfoAsync(sound.installedPath);
  if (!info.exists) return null;
  
  if (Platform.OS === 'ios') {
    // iOS: Just use the filename - iOS will find it in Library/Sounds/
    return sound.filename;
  }
  
  // Android: Return null to indicate we should use the custom channel instead
  // The channelId will be used, not the sound property
  return null;
}

/**
 * Get Android channel ID for an installed sound
 * Returns null on iOS or if sound not installed
 */
export async function getAndroidChannelForSound(soundId: string): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  
  const sound = await getInstalledSound(soundId);
  return sound?.androidChannelId || null;
}

/**
 * Clean up orphaned sound files that are no longer tracked
 */
export async function cleanupOrphanedSounds(): Promise<void> {
  try {
    const dir = getNotificationSoundsDirectory();
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) return;
    
    const files = await FileSystem.readDirectoryAsync(dir);
    const installed = await getInstalledSounds();
    const installedFilenames = new Set(installed.map(s => s.filename));
    
    for (const file of files) {
      if (!installedFilenames.has(file)) {
        try {
          await FileSystem.deleteAsync(dir + file);
          console.log(`[notification-sound-installer] Cleaned up orphaned file: ${file}`);
        } catch {}
      }
    }
  } catch (e) {
    console.warn('[notification-sound-installer] Cleanup failed:', e);
  }
}
