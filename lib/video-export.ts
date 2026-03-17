// lib/video-export.ts
// تصدير فيديو القصة — اتصال بخدمة التقديم — روح المسلم

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import Constants from 'expo-constants';
import { t } from '@/lib/i18n';

const RENDERER_URL = Constants.expoConfig?.extra?.storyRendererUrl
  || process.env.EXPO_PUBLIC_STORY_RENDERER_URL
  || '';

export interface VideoExportOptions {
  text: string;
  backgroundVideoUrl: string;
  reciterAudioUrl?: string;
  duration?: number;
  lang?: string;
}

export interface VideoExportResult {
  success: boolean;
  localUri?: string;
  error?: string;
}

/**
 * Check if the video renderer service is available
 */
export function isVideoExportAvailable(): boolean {
  return !!RENDERER_URL;
}

/**
 * Render a video with text overlay using the server-side renderer.
 * Posts to /render-story and streams back an MP4.
 */
export async function renderStoryVideo(options: VideoExportOptions): Promise<VideoExportResult> {
  if (!RENDERER_URL) {
    return { success: false, error: t('storyOfDay.exportServiceUnavailable') };
  }

  const endpoint = RENDERER_URL.replace(/\/+$/, '') + '/render-story';

  try {
    // Use FileSystem.downloadAsync to stream the response directly to disk,
    // avoiding blob/FileReader which is unreliable in React Native.
    const videoDir = `${FileSystem.cacheDirectory}rendered-videos/`;
    const dirInfo = await FileSystem.getInfoAsync(videoDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });
    }

    const filename = `story_${Date.now()}.mp4`;
    const localUri = `${videoDir}${filename}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: options.text,
        lang: options.lang || 'ar',
        backgroundVideoUrl: options.backgroundVideoUrl,
        reciterAudioUrl: options.reciterAudioUrl,
        duration: options.duration || 10,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { success: false, error: `${t('storyOfDay.exportServerError')}: ${response.status}` };
    }

    // Read response as arraybuffer → convert to base64 → write
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const base64 = uint8ToBase64(bytes);

    await FileSystem.writeAsStringAsync(localUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { success: true, localUri };
  } catch {
    return { success: false, error: t('storyOfDay.exportConnectionFailed') };
  }
}

/**
 * Save a rendered video to the device gallery
 */
export async function saveVideoToGallery(localUri: string): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') return false;
    await MediaLibrary.saveToLibraryAsync(localUri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share a rendered video
 */
export async function shareVideo(localUri: string, caption?: string): Promise<boolean> {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return false;
    await Sharing.shareAsync(localUri, {
      mimeType: 'video/mp4',
      dialogTitle: caption || 'قصة اليوم — روح المسلم',
    });
    return true;
  } catch {
    return false;
  }
}

/** Convert Uint8Array to base64 string (works in RN hermes) */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
