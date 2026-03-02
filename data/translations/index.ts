// data/translations/index.ts
// نظام الترجمات المركزي لتطبيق روح المسلم

export type SupportedLanguage = 'ar' | 'en' | 'ur' | 'id' | 'tr' | 'fr' | 'de' | 'hi' | 'bn' | 'ms' | 'ru' | 'es';

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

// استيراد كل ملفات الترجمات
import { azkarTranslations } from './azkar';
import { duasTranslations } from './duas';
import { ruqyaTranslations } from './ruqya';
import { categoriesTranslations } from './categories';
import { benefitsTranslations } from './benefits';

// دمج كل الترجمات في كائن واحد
export const translations: TranslationKeys = {
  ...azkarTranslations,
  ...duasTranslations,
  ...ruqyaTranslations,
  ...categoriesTranslations,
  ...benefitsTranslations,
};

// ========================================
// الدوال الرئيسية
// ========================================

/**
 * الحصول على ترجمة نص معين
 * @param key - مفتاح الترجمة (مثال: "azkar.morning.1")
 * @param lang - اللغة المطلوبة
 * @returns النص المترجم أو المفتاح إذا لم يوجد
 */
export const t = (key: string, lang: SupportedLanguage = 'ar'): string => {
  const entry = translations[key];
  if (!entry) {
    console.warn(`Translation key not found: ${key}`);
    return key;
  }
  return entry[lang] || entry['ar'] || key;
};

/**
 * الحصول على كل الترجمات لمفتاح معين
 * @param key - مفتاح الترجمة
 * @returns كائن يحتوي على كل الترجمات
 */
export const getAllTranslations = (key: string): TranslationEntry | null => {
  return translations[key] || null;
};

/**
 * التحقق من وجود مفتاح ترجمة
 * @param key - مفتاح الترجمة
 * @returns true إذا كان المفتاح موجوداً
 */
export const hasTranslation = (key: string): boolean => {
  return key in translations;
};

/**
 * الحصول على قائمة اللغات المدعومة
 * @returns مصفوفة بأكواد اللغات
 */
export const getSupportedLanguages = (): SupportedLanguage[] => {
  return ['ar', 'en', 'ur', 'id', 'tr', 'fr', 'de', 'hi', 'bn', 'ms', 'ru', 'es'];
};

/**
 * الحصول على اسم اللغة
 * @param code - كود اللغة
 * @returns اسم اللغة بالعربية
 */
export const getLanguageName = (code: SupportedLanguage): string => {
  const names: Record<SupportedLanguage, string> = {
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
  return names[code] || code;
};
