// lib/localized-assets.ts
// Localized asset selection based on current language

import { getLanguage } from '@/lib/i18n';

/**
 * Registry of images that have localized variants.
 * Key: base image path identifier
 * Value: { default: Arabic/default require, en: English require }
 *
 * To add a new localized image:
 * 1. Place the default (Arabic) image at its normal path
 * 2. Place the English variant with _en suffix in the same directory
 * 3. Add both require() calls to this registry
 */
const LOCALIZED_IMAGES: Record<string, Record<string, any>> = {
  // Example (uncomment when _en variants are created):
  // basmala: {
  //   ar: require('@/assets/images/quran/basmala.png'),
  //   en: require('@/assets/images/quran/basmala_en.png'),
  // },
};

/**
 * Get the localized version of an image asset.
 * Falls back to default (Arabic) if no variant exists for the current language.
 */
export function getLocalizedImage(key: string): any {
  const entry = LOCALIZED_IMAGES[key];
  if (!entry) return null;

  const lang = getLanguage();
  return entry[lang] ?? entry.en ?? entry.ar;
}

/**
 * Check if a localized variant exists for the given key and language.
 */
export function hasLocalizedVariant(key: string): boolean {
  const entry = LOCALIZED_IMAGES[key];
  if (!entry) return false;
  const lang = getLanguage();
  return lang in entry;
}
