import { getLanguage } from '@/lib/i18n';
import type { Language } from '@/constants/translations';

/**
 * Get a localized field from an object that has language-suffixed fields.
 * e.g., item.meaning_en, item.meaning_fr, item.meaning_ar
 *
 * Fallback chain: item[field_lang] → item[field_en] → item[field] → ''
 */
export function getLocalizedField(
  item: Record<string, any>,
  fieldBase: string,
  language?: Language
): string {
  const lang = language || getLanguage();
  const localizedKey = `${fieldBase}_${lang}`;
  const englishKey = `${fieldBase}_en`;

  if (item[localizedKey]) return item[localizedKey];
  if (lang !== 'en' && item[englishKey]) return item[englishKey];
  if (item[fieldBase]) return item[fieldBase];
  return '';
}
