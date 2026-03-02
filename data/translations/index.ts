// data/translations/index.ts
// نظام الترجمات المركزي - روح المسلم

// ========================================
// أنواع اللغات المدعومة
// ========================================
export type SupportedLanguage = 'ar' | 'en' | 'ur' | 'id' | 'tr' | 'fr' | 'de' | 'hi' | 'bn' | 'ms' | 'ru' | 'es';

// ========================================
// واجهة الترجمة
// ========================================
export interface TranslationEntry {
  ar: string;
  en: string;
  ur: string;
  id: string;
  tr: string;
  fr: string;
  de: string;
  hi: string;
  bn: string;
  ms: string;
  ru: string;
  es: string;
}

export type TranslationKeys = {
  [key: string]: TranslationEntry;
};

// ========================================
// استيراد ملفات الترجمات
// ========================================
import { azkarTranslations } from './azkar';
import { categoriesTranslations } from './categories';
import { benefitsTranslations } from './benefits';
import { duasTranslations } from './duas';
import { ruqyaTranslations } from './ruqya';
import { uiTranslations } from './ui';

// ========================================
// دمج جميع الترجمات
// ========================================
export const translations: TranslationKeys = {
  ...azkarTranslations,
  ...categoriesTranslations,
  ...benefitsTranslations,
  ...duasTranslations,
  ...ruqyaTranslations,
  ...uiTranslations,
};

// ========================================
// قائمة اللغات المدعومة مع أسمائها
// ========================================
export const languageNames: Record<SupportedLanguage, string> = {
  ar: 'العربية',
  en: 'English',
  ur: 'اردو',
  id: 'Bahasa Indonesia',
  tr: 'Türkçe',
  fr: 'Français',
  de: 'Deutsch',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  ms: 'Bahasa Melayu',
  ru: 'Русский',
  es: 'Español',
};

// ========================================
// قائمة اللغات مع الأيقونات
// ========================================
export const languageFlags: Record<SupportedLanguage, string> = {
  ar: '🇸🇦',
  en: '🇬🇧',
  ur: '🇵🇰',
  id: '🇮🇩',
  tr: '🇹🇷',
  fr: '🇫🇷',
  de: '🇩🇪',
  hi: '🇮🇳',
  bn: '🇧🇩',
  ms: '🇲🇾',
  ru: '🇷🇺',
  es: '🇪🇸',
};

// ========================================
// دالة الترجمة الرئيسية
// ========================================
export function t(key: string, lang: SupportedLanguage = 'ar'): string {
  const entry = translations[key];
  
  if (!entry) {
    console.warn(`[Translation] Missing key: ${key}`);
    return key;
  }
  
  const translation = entry[lang];
  
  if (!translation) {
    // fallback للعربية
    return entry.ar || key;
  }
  
  return translation;
}

// ========================================
// دالة للحصول على جميع ترجمات مفتاح معين
// ========================================
export function getAllTranslations(key: string): TranslationEntry | null {
  return translations[key] || null;
}

// ========================================
// دالة للتحقق من وجود ترجمة
// ========================================
export function hasTranslation(key: string): boolean {
  return key in translations;
}

// ========================================
// دالة للحصول على قائمة اللغات
// ========================================
export function getSupportedLanguages(): SupportedLanguage[] {
  return ['ar', 'en', 'ur', 'id', 'tr', 'fr', 'de', 'hi', 'bn', 'ms', 'ru', 'es'];
}

// ========================================
// دالة للحصول على اسم اللغة
// ========================================
export function getLanguageName(code: SupportedLanguage): string {
  return languageNames[code] || code;
}

// ========================================
// دالة للحصول على علم اللغة
// ========================================
export function getLanguageFlag(code: SupportedLanguage): string {
  return languageFlags[code] || '🏳️';
}

// ========================================
// دالة للحصول على اللغة مع العلم والاسم
// ========================================
export function getLanguageInfo(code: SupportedLanguage): { code: SupportedLanguage; name: string; flag: string } {
  return {
    code,
    name: languageNames[code] || code,
    flag: languageFlags[code] || '🏳️',
  };
}

// ========================================
// دالة للحصول على جميع اللغات مع معلوماتها
// ========================================
export function getAllLanguagesInfo(): Array<{ code: SupportedLanguage; name: string; flag: string }> {
  return getSupportedLanguages().map(code => getLanguageInfo(code));
}

// ========================================
// دالة للتحقق من اتجاه اللغة (RTL/LTR)
// ========================================
export function isRTL(lang: SupportedLanguage): boolean {
  const rtlLanguages: SupportedLanguage[] = ['ar', 'ur'];
  return rtlLanguages.includes(lang);
}

// ========================================
// دالة للحصول على اتجاه اللغة
// ========================================
export function getTextDirection(lang: SupportedLanguage): 'rtl' | 'ltr' {
  return isRTL(lang) ? 'rtl' : 'ltr';
}

// ========================================
// دالة للحصول على محاذاة النص
// ========================================
export function getTextAlign(lang: SupportedLanguage): 'right' | 'left' {
  return isRTL(lang) ? 'right' : 'left';
}

// ========================================
// Hook للاستخدام في React
// ========================================
export function createTranslator(lang: SupportedLanguage) {
  return {
    t: (key: string) => t(key, lang),
    lang,
    isRTL: isRTL(lang),
    direction: getTextDirection(lang),
    textAlign: getTextAlign(lang),
  };
}

// ========================================
// تصدير الملفات الفرعية
// ========================================
export { azkarTranslations } from './azkar';
export { categoriesTranslations } from './categories';
export { benefitsTranslations } from './benefits';
export { duasTranslations } from './duas';
export { ruqyaTranslations } from './ruqya';
export { uiTranslations } from './ui';
