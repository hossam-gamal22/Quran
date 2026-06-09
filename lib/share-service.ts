// lib/share-service.ts
// نظام المشاركة المحسّن - نص وصورة

import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAppName } from '../constants/app';
import { buildShareText } from './share-text';
import { t } from '@/lib/i18n';

// ===============================
// أنواع
// ===============================

export interface ShareOptions {
  includeAppName?: boolean;
  includeTranslation?: boolean;
  includeReference?: boolean;
  includeBenefit?: boolean;
}

export interface ShareContent {
  title?: string;
  arabicText: string;
  translation?: string;
  reference?: string;
  referenceNumber?: string;
  benefit?: string;
}

// ===============================
// تنسيق آية قرآنية
// ===============================
export function formatAyahForShare(
  arabicText: string,
  surahName: string,
  ayahNumber: number,
  translation?: string,
  options: ShareOptions = {}
): string {
  const { includeTranslation = true } = options;

  let text = `﴿ ${arabicText} ﴾\n`;
  text += `\n📖 ${surahName} - ${t('shareService.ayahRef')} ${ayahNumber}`;

  if (translation && includeTranslation) {
    text += `\n\n💬 ${t('shareService.translation')}:\n${translation}`;
  }

  // الـ footer الموحّد يُضاف مركزيًا عند المشاركة عبر shareText/buildShareText
  return text;
}

// ===============================
// تنسيق ذكر للمشاركة
// ===============================
export function formatZikrForShare(
  content: ShareContent,
  options: ShareOptions = {}
): string {
  const {
    includeReference = true,
    includeBenefit = true
  } = options;

  let text = `📿 ${content.title || t('shareService.dhikr')}\n\n`;
  text += `「 ${content.arabicText} 」`;

  if (content.reference && includeReference) {
    text += `\n\n📚 ${t('shareService.source')}: ${content.reference}`;
    if (content.referenceNumber) {
      text += ` (${content.referenceNumber})`;
    }
  }

  if (content.benefit && includeBenefit) {
    text += `\n\n✨ ${t('shareService.virtue')}: ${content.benefit}`;
  }

  // الـ footer الموحّد يُضاف مركزيًا عند المشاركة عبر shareText/buildShareText
  return text;
}

// ===============================
// تنسيق أوقات الصلاة
// ===============================
export function formatPrayerTimesForShare(
  prayerTimes: { name: string; time: string }[],
  date: string,
  location?: string
): string {
  let text = `🕌 ${t('shareService.prayerTimes')}\n`;
  if (location) text += `📍 ${location}\n`;
  text += `📅 ${date}\n\n`;
  
  for (const prayer of prayerTimes) {
    text += `${prayer.name}: ${prayer.time}\n`;
  }

  // الـ footer الموحّد يُضاف مركزيًا عند المشاركة عبر shareText/buildShareText
  return text;
}

// ===============================
// مشاركة نص
// ===============================
export async function shareText(text: string, title?: string): Promise<void> {
  try {
    await Share.share(
      { message: buildShareText(text), title },
      { dialogTitle: title || t('shareService.shareFrom') + ' ' + getAppName() }
    );
  } catch (error) {
    console.error('Error sharing text:', error);
  }
}

// ===============================
// مشاركة صورة (من ViewShot URI)
// ===============================
export async function shareImage(imageUri: string, title?: string): Promise<void> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      console.warn('Sharing is not available on this platform');
      return;
    }
    
    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: title || t('shareService.shareFrom') + ' ' + getAppName(),
      UTI: 'public.png',
    });
  } catch (error) {
    console.error('Error sharing image:', error);
  }
}

// ===============================
// مشاركة صوت
// ===============================

function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function getFileExtension(uri: string): string {
  const path = (() => {
    try {
      return isRemoteUri(uri) ? new URL(uri).pathname : uri.split('?')[0] || uri;
    } catch {
      return uri.split('?')[0] || uri;
    }
  })();
  const ext = path.match(/\.([a-zA-Z0-9]{1,6})$/)?.[1]?.toLowerCase();
  return ext ? `.${ext}` : '.mp3';
}

function getAudioMimeType(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.m4a':
    case '.mp4':
      return 'audio/mp4';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
      return 'audio/ogg';
    case '.aac':
      return 'audio/aac';
    case '.mp3':
    default:
      return 'audio/mpeg';
  }
}

function stableHash(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

async function buildShareAudioPath(audioUri: string, preferredFileName?: string): Promise<string> {
  const baseDir = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ''}shared-audio/`;
  const dirInfo = await FileSystem.getInfoAsync(baseDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
  }

  const ext = getFileExtension(preferredFileName || audioUri);
  const safeName = (preferredFileName || `audio-${stableHash(audioUri)}${ext}`)
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/\.(mp3|m4a|mp4|wav|ogg|aac)$/i, '');
  const localPath = `${baseDir}${safeName}${ext}`;

  const existing = await FileSystem.getInfoAsync(localPath);
  if (existing.exists && ((existing as any).size ?? 0) > 0) {
    return localPath;
  }
  return localPath;
}

async function ensureLocalShareUri(audioUri: string, preferredFileName?: string): Promise<string> {
  if (!isRemoteUri(audioUri)) {
    if (!preferredFileName || !/^file:\/\//i.test(audioUri)) return audioUri;
    const localPath = await buildShareAudioPath(audioUri, preferredFileName);
    const existing = await FileSystem.getInfoAsync(localPath);
    if (existing.exists && ((existing as any).size ?? 0) > 0) {
      return localPath;
    }
    await FileSystem.copyAsync({ from: audioUri, to: localPath });
    return localPath;
  }

  const localPath = await buildShareAudioPath(audioUri, preferredFileName);

  const result = await FileSystem.downloadAsync(audioUri, localPath);
  if (result.status < 200 || result.status >= 300) {
    await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
    throw new Error(`Audio download failed with status ${result.status}`);
  }
  return result.uri;
}

export async function shareAudio(audioUri: string, title?: string, preferredFileName?: string): Promise<void> {
  return shareAudioWithOptions(audioUri, title, preferredFileName);
}

export async function shareAudioWithOptions(
  audioUri: string,
  title?: string,
  preferredFileName?: string,
  options?: { onPrepared?: () => void },
): Promise<void> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      console.warn('Sharing is not available on this platform');
      return;
    }

    const localUri = await ensureLocalShareUri(audioUri, preferredFileName);
    options?.onPrepared?.();
    if (options?.onPrepared) {
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    const ext = getFileExtension(localUri);
    await Sharing.shareAsync(localUri, {
      mimeType: getAudioMimeType(ext),
      dialogTitle: title || t('shareService.shareFrom') + ' ' + getAppName(),
      UTI: 'public.audio',
    });
  } catch (error) {
    console.error('Error sharing audio:', error);
    throw error;
  }
}

// ===============================
// التقاط مع علامة التطبيق
// ===============================

/**
 * Captures a ViewShot ref and shares the resulting image.
 * Use with BrandedCapture component for automatic branding.
 */
export async function captureWithBranding(
  captureHandle: { capture: () => Promise<string> },
  title?: string
): Promise<void> {
  try {
    const uri = await captureHandle.capture();
    await shareImage(uri, title);
  } catch (error) {
    console.error('Error capturing branded image:', error);
  }
}

// ===============================
// نسخ للحافظة
// ===============================
export async function copyText(text: string): Promise<void> {
  try {
    await Clipboard.setStringAsync(buildShareText(text));
  } catch (error) {
    console.error('Error copying text:', error);
  }
}
