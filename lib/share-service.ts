// lib/share-service.ts
// في بداية الملف، استيراد اسم التطبيق

import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { APP_CONFIG, APP_NAME } from '../constants/app';

// ===============================
// اسم التطبيق والتوقيع (ديناميكي)
// ===============================
const APP_SIGNATURE = APP_CONFIG.getShareSignature();

// أو استخدام الدالة مع رابط التحميل
const getFullSignature = () => APP_CONFIG.getShareWithDownload();

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
    text += APP_CONFIG.getShareSignature(); // ✅ يستخدم "رُوح المسلم"
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
    text += APP_CONFIG.getShareSignature(); // ✅ يستخدم "رُوح المسلم"
  }
  
  return text;
}

// ... باقي الدوال تستخدم نفس الطريقة
