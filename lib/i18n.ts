// lib/i18n.ts
// نظام الترجمة - روح المسلم
// آخر تحديث: 2026-03-12

import { translations, Language, TranslationKeys } from '@/constants/translations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRemoteTranslation } from '@/lib/remote-translations';
// I18nManager intentionally NOT used — RTL is handled manually via useIsRTL() hook

// ==================== المتغيرات ====================

let currentLanguage: Language = 'ar';
const LANGUAGE_STORAGE_KEY = '@app_language';

// ==================== تحميل اللغة المحفوظة ====================

export const loadSavedLanguage = async (): Promise<Language> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && isValidLanguage(saved)) {
      currentLanguage = saved as Language;
    }
  } catch (error) {
    console.error('Error loading language:', error);
  }

  // RTL is handled manually via useIsRTL() hook in 200+ components.
  // Do NOT call I18nManager.forceRTL() — it causes double-reversal on
  // Android production builds where the native bridge actually applies RTL,
  // conflicting with manual flexDirection: 'row-reverse' patterns.

  return currentLanguage;
};

// Start loading saved language immediately at module scope.
// This ensures currentLanguage is set from AsyncStorage BEFORE
// any React component renders and calls t(), preventing the
// "Arabic flash" when the app language is non-Arabic.
export const languageInitPromise: Promise<Language> = loadSavedLanguage();

// ==================== حفظ اللغة ====================

export const saveLanguage = async (lang: Language): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    currentLanguage = lang;
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// ==================== التحقق من صحة اللغة ====================

const isValidLanguage = (lang: string): lang is Language => {
  return ['ar', 'en', 'fr', 'de', 'es', 'tr', 'ur', 'id', 'ms', 'hi', 'bn', 'ru'].includes(lang);
};

// ==================== الدوال الأساسية ====================

/**
 * تعيين اللغة الحالية
 */
export const setLanguage = async (lang: Language): Promise<void> => {
  currentLanguage = lang;
  await saveLanguage(lang);
};

/**
 * الحصول على اللغة الحالية
 */
export const getLanguage = (): Language => {
  return currentLanguage;
};

/**
 * الحصول على الترجمة
 * @param key - مفتاح الترجمة (مثل: 'tabs.home' أو 'common.loading')
 * @param params - متغيرات للاستبدال (مثل: {count: 5})
 */
export const t = (key: string, params?: Record<string, string | number>): string => {
  // Check remote translations first (admin overrides)
  const remoteValue = getRemoteTranslation(key, currentLanguage);
  if (remoteValue) {
    let result = remoteValue;
    if (params) {
      Object.keys(params).forEach(param => {
        result = result.replace(new RegExp(`{${param}}`, 'g'), String(params[param]));
      });
    }
    return result;
  }

  const keys = key.split('.');
  let value: any = translations[currentLanguage];
  
  // البحث في اللغة الحالية
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // fallback للعربية
      value = null;
      break;
    }
  }
  
  // إذا لم يوجد، جرب الإنجليزية (fallback)
  if (value === null || value === undefined) {
    value = translations['en'];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        if (__DEV__) {
          console.warn(`[i18n] Missing translation key: "${key}" (lang: ${currentLanguage})`);
        }
        // Humanize the last segment instead of returning raw "word.word" key
        const lastSegment = keys[keys.length - 1];
        return lastSegment
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/[_-]/g, ' ')
          .replace(/^\w/, c => c.toUpperCase());
      }
    }
  }
  
  // التأكد من أن القيمة نص
  if (typeof value !== 'string') {
    if (__DEV__) {
      console.warn(`[i18n] Translation key "${key}" resolved to non-string value (lang: ${currentLanguage})`);
    }
    const lastSegment = keys[keys.length - 1];
    return lastSegment
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/^\w/, c => c.toUpperCase());
  }
  
  // استبدال المتغيرات
  if (params) {
    Object.keys(params).forEach(param => {
      value = value.replace(new RegExp(`{${param}}`, 'g'), String(params[param]));
    });
  }
  
  return value;
};

/**
 * الحصول على ترجمة من نوع مصفوفة (مثل أسماء الأشهر)
 * @param key - مفتاح الترجمة (مثل: 'calendar.months')
 */
export const tArray = (key: string): string[] => {
  const keys = key.split('.');
  let value: any = translations[currentLanguage];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      value = null;
      break;
    }
  }

  // fallback to English
  if (!Array.isArray(value)) {
    value = translations['en'];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return [];
      }
    }
  }

  return Array.isArray(value) ? value : [];
};

/**
 * الحصول على كل الترجمات للغة معينة
 */
export const getTranslations = (lang?: Language): TranslationKeys => {
  return translations[lang || currentLanguage];
};

/**
 * الحصول على اتجاه اللغة
 * @param lang - اللغة للتحقق منها (إذا لم تُحدد، تستخدم اللغة الحالية)
 */
export const isRTL = (lang?: Language): boolean => {
  const checkLang = lang || currentLanguage;
  return ['ar', 'ur', 'fa'].includes(checkLang);
};

/**
 * الحصول على اتجاه الكتابة
 */
export const getTextDirection = (lang?: Language): 'rtl' | 'ltr' => {
  return isRTL(lang) ? 'rtl' : 'ltr';
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
    en: '�🇸',
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
export const supportedLanguages: { 
  code: Language; 
  name: string; 
  nativeName: string;
  flag: string; 
  rtl: boolean;
}[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', rtl: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', rtl: false },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', rtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', rtl: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', rtl: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', rtl: false },
];

// ==================== Date Locale ====================

/**
 * Maps app language to proper date locale for toLocaleDateString / toLocaleTimeString.
 * Returns BCP 47 locale tag.
 */
const DATE_LOCALE_MAP: Record<Language, string> = {
  ar: 'ar-u-nu-latn',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  tr: 'tr-TR',
  ur: 'ur-u-nu-latn',
  id: 'id-ID',
  ms: 'ms-MY',
  hi: 'hi-u-nu-latn',
  bn: 'bn-u-nu-latn',
  ru: 'ru-RU',
};

export const getDateLocale = (lang?: Language): string => {
  const l = lang || currentLanguage;
  return DATE_LOCALE_MAP[l] || l;
};

// ==================== تصدير افتراضي ====================

export default {
  t,
  tArray,
  setLanguage,
  getLanguage, 
  isRTL,
  getTextDirection,
  getLanguageName,
  getLanguageFlag,
  loadSavedLanguage,
  saveLanguage,
  getTranslations,
  supportedLanguages,
  getDateLocale,
};
