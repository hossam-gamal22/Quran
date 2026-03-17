/**
 * useAutoTranslate — React hook for automatic text translation.
 *
 * Translates Arabic (or English) text to the current app language.
 * Uses persistent caching (AsyncStorage + memory) so repeated renders are instant.
 *
 * Usage:
 *   const translated = useAutoTranslate('بسم الله الرحمن الرحيم');
 *   const items = useAutoTranslateArray(['text1', 'text2']);
 */

import { useState, useEffect, useRef } from 'react';
import { getLanguage } from '@/lib/i18n';
import {
  autoTranslate,
  autoTranslateBatch,
  getCachedTranslation,
  preWarmTranslations,
} from '@/lib/auto-translate';
import type { ContentType } from '@/lib/unifiedTranslator';

/**
 * Translate a single string.
 * Returns the original text immediately, then the translated version once ready.
 */
export function useAutoTranslate(
  text: string,
  sourceLang: 'ar' | 'en' = 'ar',
  contentType: ContentType = 'section',
): string {
  const language = getLanguage();
  const isSource = language === sourceLang;

  // Try sync cache for no-flicker initial render
  const initial = isSource ? text : (getCachedTranslation(text, sourceLang) ?? text);
  const [translated, setTranslated] = useState(initial);
  const lastKey = useRef(`${text}:${language}`);

  useEffect(() => {
    const key = `${text}:${language}`;
    if (key === lastKey.current && translated !== text) return; // Already translated
    lastKey.current = key;

    if (isSource || !text?.trim()) {
      setTranslated(text);
      return;
    }

    // Check sync cache first
    const cached = getCachedTranslation(text, sourceLang);
    if (cached) {
      setTranslated(cached);
      return;
    }

    let cancelled = false;
    autoTranslate(text, sourceLang, contentType).then(result => {
      if (!cancelled) setTranslated(result);
    });
    return () => { cancelled = true; };
  }, [text, language, sourceLang, contentType, isSource]);

  return translated;
}

/**
 * Translate an array of strings.
 * Returns original texts immediately, updates as translations arrive.
 */
export function useAutoTranslateArray(
  texts: string[],
  sourceLang: 'ar' | 'en' = 'ar',
  contentType: ContentType = 'section',
): string[] {
  const language = getLanguage();
  const isSource = language === sourceLang;

  const initial = isSource
    ? texts
    : texts.map(t => getCachedTranslation(t, sourceLang) ?? t);
  const [translated, setTranslated] = useState<string[]>(initial);
  const lastKey = useRef(texts.join('|') + ':' + language);

  useEffect(() => {
    const key = texts.join('|') + ':' + language;
    if (key === lastKey.current && translated !== texts) return;
    lastKey.current = key;

    if (isSource || texts.length === 0) {
      setTranslated(texts);
      return;
    }

    let cancelled = false;
    autoTranslateBatch(texts, sourceLang, contentType).then(results => {
      if (!cancelled) setTranslated(results);
    });
    return () => { cancelled = true; };
  }, [texts.join('|'), language, sourceLang, contentType, isSource]);

  return translated;
}

/**
 * Pre-warm cache for a set of texts (call on mount).
 * Doesn't return values — just ensures they're cached for later.
 */
export function usePreWarmTranslations(
  texts: string[],
  sourceLang: 'ar' | 'en' = 'ar',
  contentType: ContentType = 'section',
): void {
  const language = getLanguage();

  useEffect(() => {
    if (language === sourceLang || texts.length === 0) return;
    preWarmTranslations(texts, sourceLang, contentType);
  }, [language, texts.length]);
}

/**
 * Translate an object's string values.
 * Useful for data models like { title: 'عنوان', brief: 'نبذة' }.
 */
export function useAutoTranslateObject<T extends Record<string, string>>(
  obj: T,
  sourceLang: 'ar' | 'en' = 'ar',
  contentType: ContentType = 'section',
): T {
  const language = getLanguage();
  const isSource = language === sourceLang;
  const keys = Object.keys(obj);
  const values = Object.values(obj);
  const translatedValues = useAutoTranslateArray(values, sourceLang, contentType);

  if (isSource) return obj;

  const result = {} as Record<string, string>;
  keys.forEach((key, i) => {
    result[key] = translatedValues[i];
  });
  return result as T;
}
