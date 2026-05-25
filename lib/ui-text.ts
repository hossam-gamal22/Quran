import { getLanguage } from '@/lib/i18n';
import type { Language } from '@/constants/translations';

type LocalizedText = Partial<Record<Language, string>> & {
  ar: string;
  en: string;
};

/**
 * Tiny UI-localization helper for screens that are not wired into the main
 * translations table yet. Non-Arabic languages intentionally fall back to
 * English so Arabic UI copy never appears alone in translated app modes.
 */
export function uiText(text: LocalizedText): string {
  const language = getLanguage();
  return text[language] || text.en;
}

export function uiDateLocale(): string {
  const language = getLanguage();
  const locales: Partial<Record<Language, string>> = {
    ar: 'ar-EG',
    en: 'en-US',
    fr: 'fr-FR',
    de: 'de-DE',
    es: 'es-ES',
    tr: 'tr-TR',
    ur: 'ur-PK',
    id: 'id-ID',
    ms: 'ms-MY',
    hi: 'hi-IN',
    bn: 'bn-BD',
    ru: 'ru-RU',
  };
  return locales[language] || 'en-US';
}
