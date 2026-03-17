// lib/ffmpeg-merge.ts
// إنشاء فيديو من صورة + صوت القارئ باستخدام FFmpeg — روح المسلم

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

type ProgressPhase = 'downloading' | 'creating' | 'done';

/**
 * Create a video from a still image + reciter audio using FFmpeg.
 * Applies a slow Ken Burns zoom effect to the image.
 * Duration is determined by the audio length.
 *
 * Falls back gracefully if FFmpeg is unavailable (web/Expo Go).
 */
export async function createVideoFromImageAndAudio(
  imageUrl: string,
  audioUrl: string,
  onProgress?: (phase: ProgressPhase, progress: number) => void,
  isLocalImage?: boolean,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  // Lazy-import ffmpeg-kit (native-only module)
  let FFmpegKit: typeof import('ffmpeg-kit-react-native').FFmpegKit;
  let ReturnCode: typeof import('ffmpeg-kit-react-native').ReturnCode;
  try {
    const kit = require('ffmpeg-kit-react-native');
    FFmpegKit = kit.FFmpegKit;
    ReturnCode = kit.ReturnCode;
  } catch {
    console.warn('[ffmpeg-merge] ffmpeg-kit-react-native not available');
    return null;
  }

  const ts = Date.now();
  const imgPath = isLocalImage ? imageUrl : `${FileSystem.cacheDirectory}story_img_${ts}.jpg`;
  const audioPath = `${FileSystem.cacheDirectory}story_aud_${ts}.mp3`;
  const outputPath = `${FileSystem.cacheDirectory}story_final_${ts}.mp4`;

  try {
    // ── 1. Download assets ──
    onProgress?.('downloading', 0);

    if (isLocalImage) {
      // Image already on disk (captured via ViewShot), only download audio
      const audioResult = await FileSystem.downloadAsync(audioUrl, audioPath);
      if (!audioResult?.uri) throw new Error('Audio download failed');
    } else {
      // Download both image & audio in parallel
      const [imgResult, audioResult] = await Promise.all([
        FileSystem.downloadAsync(imageUrl, imgPath),
        FileSystem.downloadAsync(audioUrl, audioPath),
      ]);
      if (!imgResult?.uri || !audioResult?.uri) throw new Error('Download failed');
    }

    onProgress?.('downloading', 1);

    // ── 2. Create video with Ken Burns zoom + audio ──
    // zoompan: slow zoom from 1x to 1.15x over entire audio duration
    // -framerate 25: smooth video framerate
    // z='min(zoom+0.0003,1.15)': very gentle zoom-in
    // d=1: each input frame lasts 1 tick (controlled by zoompan internally)
    // s=1080x1920: portrait (9:16 story format)
    // fps=25: output 25fps
    onProgress?.('creating', 0);

    const command = [
      '-loop', '1',
      '-i', imgPath,
      '-i', audioPath,
      '-filter_complex',
      `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0003\\,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=25[v]`,
      '-map', '[v]',
      '-map', '1:a:0',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'stillimage',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      '-movflags', '+faststart',
      '-y', outputPath,
    ].join(' ');

    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();

    if (!ReturnCode.isSuccess(returnCode)) {
      const logs = await session.getAllLogsAsString();
      console.warn('[ffmpeg-merge] FFmpeg failed:', logs?.slice(-500));
      return null;
    }

    onProgress?.('done', 1);

    // Verify output exists
    const info = await FileSystem.getInfoAsync(outputPath);
    if (!info.exists) return null;

    return outputPath;
  } catch (err) {
    console.warn('[ffmpeg-merge] Error:', err);
    return null;
  } finally {
    // Clean up source files
    FileSystem.deleteAsync(imgPath, { idempotent: true }).catch(() => {});
    FileSystem.deleteAsync(audioPath, { idempotent: true }).catch(() => {});
  }
}
