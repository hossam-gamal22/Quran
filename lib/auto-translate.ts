/**
 * AUTO-TRANSLATION SERVICE
 * Wraps unifiedTranslator.ts with persistent AsyncStorage caching.
 * Automatically translates Arabic/English content into the user's language.
 *
 * Usage:
 *   const text = await autoTranslate('بسم الله الرحمن الرحيم', 'ar', 'section');
 *   const batch = await autoTranslateBatch(['text1', 'text2'], 'ar', 'section');
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateOne, type ContentType, type LangCode } from './unifiedTranslator';
import { getLanguage } from './i18n';
import { reportTranslationFailure } from './translation-alert';
import { getTranslationOverride, loadTranslationOverrides } from './translation-overrides';

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_PREFIX = '@autotranslate:';
const CACHE_VERSION = 'v6';

/** Max concurrent API calls to avoid rate limiting */
const MAX_CONCURRENT = 2;

/** In-memory cache for instant re-renders (cleared on app restart) */
const memoryCache = new Map<string, string>();

/** Heuristic: detect URL-encoded content (handles spaced/broken patterns) */
function looksEncoded(text: string): boolean {
  if (!text || text.length < 4) return false;
  if (/%[0-9A-Fa-f]{2}/.test(text)) return true;
  if (/[0-9A-Fa-f]{2}\s*%\s*[0-9A-Fa-f]{2}/.test(text)) return true;
  // Mostly hex chars, % signs and spaces → likely encoded
  const stripped = text.replace(/[\s%]/g, '');
  return stripped.length > 6 && /^[0-9A-Fa-f]+$/.test(stripped);
}

/** Decode repeatedly until no more %XX sequences remain */
function decodeLoop(text: string): string {
  let decoded = text;
  for (let i = 0; i < 5; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(decoded)) break;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch { break; }
  }
  return decoded;
}

/** Remove spaces embedded within URL-encoded sequences */
function removeEncodedSpaces(text: string): string {
  let cleaned = text.replace(/\s+/g, (match, offset, str) => {
    const before = str.substring(Math.max(0, offset - 4), offset);
    const after = str.substring(offset + match.length, offset + match.length + 4);
    if (/[0-9A-Fa-f%]$/.test(before) && /^[0-9A-Fa-f%]/.test(after)) return '';
    return match;
  });
  if (/^[0-9A-Fa-f]{2}%/.test(cleaned)) cleaned = '%' + cleaned;
  return cleaned;
}

/** Detect and fix URL-encoded text from translator APIs */
export function sanitizeText(text: string): string {
  if (!text) return text;
  if (!looksEncoded(text)) return text;

  // Phase 1: Remove embedded spaces and fix leading %
  const cleaned = removeEncodedSpaces(text);
  const isDoubleEncoded = /%25[0-9A-Fa-f]{2}/.test(cleaned);

  // Phase 2: For single-encoded text, fix missing % between hex pairs first
  // (must run BEFORE decode to handle %20 that lost its leading % during space removal)
  if (!isDoubleEncoded) {
    try {
      let fixed = cleaned;
      fixed = fixed.replace(/%([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})%/g, '%$1%$2%');
      fixed = fixed.replace(/%([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})%/g, '%$1%$2%');
      const decoded = decodeLoop(fixed);
      if (!/%[0-9A-Fa-f]{2}/.test(decoded)) return decoded;
    } catch { /* continue */ }
  }

  // Phase 3: Try direct decode (handles double-encoding via decodeLoop)
  try {
    const decoded = decodeLoop(cleaned);
    if (!/%[0-9A-Fa-f]{2}/.test(decoded)) return decoded;
  } catch { /* continue */ }

  // Phase 4: Strip ALL spaces and try from scratch
  try {
    let stripped = text.replace(/\s+/g, '');
    if (/^[0-9A-Fa-f]{2}%/.test(stripped)) stripped = '%' + stripped;
    const decoded = decodeLoop(stripped);
    if (!/%[0-9A-Fa-f]{2}/.test(decoded)) return decoded;
    // Also try with hex-pair fix
    let fixed = stripped;
    fixed = fixed.replace(/%([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})%/g, '%$1%$2%');
    fixed = fixed.replace(/%([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})%/g, '%$1%$2%');
    const decoded2 = decodeLoop(fixed);
    if (!/%[0-9A-Fa-f]{2}/.test(decoded2)) return decoded2;
  } catch { /* continue to last resort */ }

  // Phase 5: Last resort — decode each valid %XX%YY UTF-8 pair individually
  try {
    return text.replace(/%[0-9A-Fa-f]{2}(?:%[0-9A-Fa-f]{2})*/g, match => {
      try { return decodeURIComponent(match); } catch { return match; }
    });
  } catch { return text; }
}

// ─── Cache Helpers ───────────────────────────────────────────────────────────

function makeCacheKey(text: string, sourceLang: string, targetLang: string): string {
  // Use first 80 chars + length as key to avoid massive AsyncStorage keys
  const textKey = text.length <= 80 ? text : `${text.slice(0, 80)}__${text.length}`;
  return `${CACHE_PREFIX}${CACHE_VERSION}:${sourceLang}>${targetLang}:${textKey}`;
}

async function getCached(text: string, sourceLang: string, targetLang: string): Promise<string | null> {
  const key = makeCacheKey(text, sourceLang, targetLang);

  // Check memory first (instant)
  if (memoryCache.has(key)) return memoryCache.get(key)!;

  // Check AsyncStorage (persistent)
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      const clean = sanitizeText(stored);
      // Reject corrupted cached entries
      if (looksEncoded(clean)) {
        await AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
      memoryCache.set(key, clean);
      return clean;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

async function setCache(text: string, sourceLang: string, targetLang: string, translated: string): Promise<void> {
  const key = makeCacheKey(text, sourceLang, targetLang);
  memoryCache.set(key, translated);

  try {
    await AsyncStorage.setItem(key, translated);
  } catch {
    // Ignore storage errors — memory cache still works
  }
}

// ─── Queue / Rate Limiting ───────────────────────────────────────────────────

let activeRequests = 0;
const pendingQueue: Array<{ resolve: () => void }> = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return;
  }
  return new Promise<void>(resolve => {
    pendingQueue.push({ resolve });
  });
}

function releaseSlot(): void {
  activeRequests--;
  if (pendingQueue.length > 0) {
    activeRequests++;
    pendingQueue.shift()?.resolve();
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Translate a single text to the current app language.
 * Returns original text if:
 *   - Current language is Arabic (source language)
 *   - Translation fails
 *   - Text is empty
 */
export async function autoTranslate(
  text: string,
  sourceLang: 'ar' | 'en' = 'ar',
  contentType: ContentType = 'section',
): Promise<string> {
  if (!text?.trim()) return text;

  const targetLang = getLanguage() as LangCode;

  // No translation needed if target = source
  if (targetLang === sourceLang) return text;

  // Check admin overrides first (highest priority)
  const override = getTranslationOverride(text, targetLang);
  if (override) return override;

  // Check cache
  const cached = await getCached(text, sourceLang, targetLang);
  if (cached) return cached;

  // Rate-limited API call
  await acquireSlot();
  try {
    const result = await translateOne(text, sourceLang, targetLang, contentType);
    if (result.text && result.source !== 'FAILED') {
      const cleaned = sanitizeText(result.text);
      // Don't cache or return text that still looks URL-encoded
      if (!looksEncoded(cleaned)) {
        await setCache(text, sourceLang, targetLang, cleaned);
        return cleaned;
      }
    }
  } catch {
    // Fall through to return original
  } finally {
    releaseSlot();
  }

  reportTranslationFailure();
  return text; // Fallback: return original
}

/**
 * Translate to a specific language (not necessarily the current one).
 */
export async function autoTranslateTo(
  text: string,
  targetLang: LangCode,
  sourceLang: 'ar' | 'en' = 'ar',
  contentType: ContentType = 'section',
): Promise<string> {
  if (!text?.trim()) return text;
  if (targetLang === sourceLang) return text;

  // Check admin overrides first (highest priority)
  const override = getTranslationOverride(text, targetLang);
  if (override) return override;

  const cached = await getCached(text, sourceLang, targetLang);
  if (cached) return cached;

  await acquireSlot();
  try {
    const result = await translateOne(text, sourceLang, targetLang, contentType);
    if (result.text && result.source !== 'FAILED') {
      const cleaned = sanitizeText(result.text);
      if (!looksEncoded(cleaned)) {
        await setCache(text, sourceLang, targetLang, cleaned);
        return cleaned;
      }
    }
  } catch {
    // Fall through
  } finally {
    releaseSlot();
  }

  reportTranslationFailure();
  return text;
}

/**
 * Translate multiple texts in parallel (with rate limiting).
 * Returns array in same order as input.
 */
export async function autoTranslateBatch(
  texts: string[],
  sourceLang: 'ar' | 'en' = 'ar',
  contentType: ContentType = 'section',
): Promise<string[]> {
  return Promise.all(
    texts.map(text => autoTranslate(text, sourceLang, contentType))
  );
}

/**
 * Get a synchronous cached translation (memory only, no async).
 * Returns null if not cached — useful for initial render.
 */
export function getCachedTranslation(
  text: string,
  sourceLang: 'ar' | 'en' = 'ar',
): string | null {
  if (!text?.trim()) return text;
  const targetLang = getLanguage() as LangCode;
  if (targetLang === sourceLang) return text;

  // Check admin overrides first
  const override = getTranslationOverride(text, targetLang);
  if (override) return override;

  const key = makeCacheKey(text, sourceLang, targetLang);
  const cached = memoryCache.get(key) ?? null;
  if (cached && looksEncoded(cached)) {
    memoryCache.delete(key);
    return null;
  }
  return cached;
}

/**
 * Pre-warm cache for a batch of texts.
 * Call this when a page loads to translate content in background.
 */
export async function preWarmTranslations(
  texts: string[],
  sourceLang: 'ar' | 'en' = 'ar',
  contentType: ContentType = 'section',
): Promise<void> {
  const targetLang = getLanguage() as LangCode;
  if (targetLang === sourceLang) return;

  // Filter out already-cached texts
  const uncached: string[] = [];
  for (const text of texts) {
    if (!text?.trim()) continue;
    const key = makeCacheKey(text, sourceLang, targetLang);
    if (!memoryCache.has(key)) {
      uncached.push(text);
    }
  }

  if (uncached.length === 0) return;

  // Load from AsyncStorage first
  const keysToCheck = uncached.map(t => makeCacheKey(t, sourceLang, targetLang));
  try {
    const pairs = await AsyncStorage.multiGet(keysToCheck);
    const stillUncached: string[] = [];

    for (let i = 0; i < pairs.length; i++) {
      const [key, value] = pairs[i];
      if (value) {
        memoryCache.set(key, value);
      } else {
        stillUncached.push(uncached[i]);
      }
    }

    // API translate remaining
    if (stillUncached.length > 0) {
      await autoTranslateBatch(stillUncached, sourceLang, contentType);
    }
  } catch {
    // Fallback: translate all
    await autoTranslateBatch(uncached, sourceLang, contentType);
  }
}

/**
 * Clear all auto-translation cache.
 */
export async function clearAutoTranslateCache(): Promise<void> {
  memoryCache.clear();
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const translateKeys = allKeys.filter(k => k.startsWith(CACHE_PREFIX));
    if (translateKeys.length > 0) {
      await AsyncStorage.multiRemove(translateKeys);
    }
  } catch {
    // Ignore
  }
}

/**
 * Initialize the translation system (load Firestore overrides).
 * Call once on app startup.
 */
export async function initTranslationOverrides(): Promise<void> {
  await loadTranslationOverrides();
}
