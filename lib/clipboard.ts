// lib/clipboard.ts
import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { t } from '@/lib/i18n';
import { buildShareText } from './share-text';

/**
 * نسخ نص إلى الحافظة
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      // على الويب نستخدم navigator.clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // fallback للمتصفحات القديمة
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } else {
      // على الموبايل نستخدم expo-clipboard
      await Clipboard.setStringAsync(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    }
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
}

/**
 * قراءة من الحافظة
 */
export async function readFromClipboard(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
      return null;
    } else {
      return await Clipboard.getStringAsync();
    }
  } catch (error) {
    console.error('Failed to read clipboard:', error);
    return null;
  }
}

/**
 * مشاركة نص
 */
export async function shareText(text: string, title?: string): Promise<boolean> {
  try {
    const message = buildShareText(text);
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({
          title: title || t('shareService.shareTitle'),
          text: message,
        });
        return true;
      }
      // fallback: نسخ للحافظة
      return await copyToClipboard(message);
    } else {
      const result = await Share.share({
        message,
        title: title,
      });
      return result.action === Share.sharedAction;
    }
  } catch (error) {
    console.error('Failed to share:', error);
    return false;
  }
}

/**
 * نسخ آية مع التنسيق
 */
export async function copyAyah(
  ayahText: string,
  surahName: string,
  ayahNumber: number,
  includeReference: boolean = true
): Promise<boolean> {
  let text = `﴿ ${ayahText} ﴾`;
  if (includeReference) {
    text += `\n\n📖 ${t('shareService.surahRef')} ${surahName} - ${t('shareService.ayahRef')} ${ayahNumber}`;
  }
  // الـ footer الموحّد يُضاف مركزيًا عبر buildShareText
  return await copyToClipboard(buildShareText(text));
}

/**
 * نسخ ذكر مع التنسيق
 */
export async function copyDhikr(
  dhikrText: string,
  category?: string,
  count?: number
): Promise<boolean> {
  let text = dhikrText;
  if (category) {
    text += `\n\n📿 ${category}`;
  }
  if (count) {
    text += `\n🔢 ${t('shareService.repeat')}: ${count} ${t('shareService.time')}`;
  }
  // الـ footer الموحّد يُضاف مركزيًا عبر buildShareText
  return await copyToClipboard(buildShareText(text));
}
