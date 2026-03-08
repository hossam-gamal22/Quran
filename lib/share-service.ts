// lib/share-service.ts
// نظام المشاركة المحسّن - نص وصورة

import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { APP_CONFIG, APP_NAME } from '../constants/app';

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
  const { includeAppName = true, includeTranslation = true } = options;
  
  let text = `﴿ ${arabicText} ﴾\n`;
  text += `\n📖 ${surahName} - آية ${ayahNumber}`;
  
  if (translation && includeTranslation) {
    text += `\n\n💬 الترجمة:\n${translation}`;
  }
  
  if (includeAppName) {
    text += APP_CONFIG.getShareSignature();
  }
  
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
    includeAppName = true, 
    includeReference = true, 
    includeBenefit = true 
  } = options;
  
  let text = `📿 ${content.title || 'ذكر'}\n\n`;
  text += `「 ${content.arabicText} 」`;
  
  if (content.reference && includeReference) {
    text += `\n\n📚 المصدر: ${content.reference}`;
    if (content.referenceNumber) {
      text += ` (${content.referenceNumber})`;
    }
  }
  
  if (content.benefit && includeBenefit) {
    text += `\n\n✨ الفضل: ${content.benefit}`;
  }
  
  if (includeAppName) {
    text += APP_CONFIG.getShareSignature();
  }
  
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
  let text = `🕌 مواقيت الصلاة\n`;
  if (location) text += `📍 ${location}\n`;
  text += `📅 ${date}\n\n`;
  
  for (const prayer of prayerTimes) {
    text += `${prayer.name}: ${prayer.time}\n`;
  }
  
  text += APP_CONFIG.getShareSignature();
  return text;
}

// ===============================
// مشاركة نص
// ===============================
export async function shareText(text: string, title?: string): Promise<void> {
  try {
    await Share.share(
      { message: text, title },
      { dialogTitle: title || 'مشاركة من ' + APP_NAME }
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
      dialogTitle: title || 'مشاركة من ' + APP_NAME,
      UTI: 'public.png',
    });
  } catch (error) {
    console.error('Error sharing image:', error);
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
    await Clipboard.setStringAsync(text);
  } catch (error) {
    console.error('Error copying text:', error);
  }
}
