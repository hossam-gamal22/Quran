// lib/i18n.ts
// نظام الترجمة - روح المسلم
// آخر تحديث: 2026-03-04

import { translations, Language, TranslationKeys } from '@/constants/translations';

// ==================== المتغيرات ====================

let currentLanguage: Language = 'ar';

// ==================== الدوال ====================

/**
 * تعيين اللغة الحالية
 */
export const setLanguage = (lang: Language): void => {
  currentLanguage = lang;
};

/**
 * الحصول على اللغة الحالية
 */
export const getLanguage = (): Language => {
  return currentLanguage;
};

/**
 * الحصول على الترجمة
 */
export const t = (key: string, params?: Record<string, string | number>): string => {
  const keys = key.split('.');
  let value: any = translations[currentLanguage];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // fallback للعربية
      value = translations['ar'];
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // إرجاع المفتاح إذا لم يوجد
        }
      }
      break;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // استبدال المتغيرات
  if (params) {
    Object.keys(params).forEach(param => {
      value = value.replace(`{${param}}`, String(params[param]));
    });
  }
  
  return value;
};

/**
 * الحصول على اتجاه اللغة
 */
export const isRTL = (lang?: Language): boolean => {
  const checkLang = lang || currentLanguage;
  return ['ar', 'ur'].includes(checkLang);
};

/**
 * الحصول على اسم اللغة
 */
export const getLanguageName = (lang: Language): string => {
  const names: Record<Language, string> = {
    ar: 'العربية',
    en: 'English',
    fr: 'Français',
    de: 'Deutsch',
    es: 'Español',
    tr: 'Türkçe',
    ur: 'اردو',
    id: 'Bahasa Indonesia',
    ms: 'Bahasa Melayu',
    hi: 'हिन्दी',
    bn: 'বাংলা',
    ru: 'Русский',
  };
  return names[lang] || lang;
};

/**
 * الحصول على علم اللغة
 */
export const getLanguageFlag = (lang: Language): string => {
  const flags: Record<Language, string> = {
    ar: '🇸🇦',
    en: '🇬🇧',
    fr: '🇫🇷',
    de: '🇩🇪',
    es: '🇪🇸',
    tr: '🇹🇷',
    ur: '🇵🇰',
    id: '🇮🇩',
    ms: '🇲🇾',
    hi: '🇮🇳',
    bn: '🇧🇩',
    ru: '🇷🇺',
  };
  return flags[lang] || '🌍';
};

/**
 * قائمة اللغات المدعومة
 */
export const supportedLanguages: { code: Language; name: string; flag: string; rtl: boolean }[] = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'en', name: 'English', flag: '🇬🇧', rtl: false },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', rtl: false },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', rtl: false },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾', rtl: false },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', rtl: false },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', rtl: false },
];

export default { t, setLanguage, getLanguage, isRTL };
