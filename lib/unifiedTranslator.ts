/**
 * UNIFIED ISLAMIC TRANSLATION SERVICE
 * Shared between app scripts and admin panel.
 * 100% free — no paid APIs.
 *
 * Priority chain:
 *   1. Quran.com      (Quranic content — verified)
 *   2. Sunnah.com     (Hadith — verified)
 *   3. HisnulMuslim   (Adhkar/Duas — verified)
 *   4. MyMemory       (general — needs review)
 *   5. LibreTranslate (general — needs review)
 *   6. Lingva         (general — needs review)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export const LANGUAGES = [
  { code: 'ar', name: 'العربية',          rtl: true,  myMemory: 'ar-SA' },
  { code: 'en', name: 'English',          rtl: false, myMemory: 'en-US' },
  { code: 'fr', name: 'Français',         rtl: false, myMemory: 'fr-FR' },
  { code: 'tr', name: 'Türkçe',           rtl: false, myMemory: 'tr-TR' },
  { code: 'ur', name: 'اردو',             rtl: false, myMemory: 'ur-PK' },
  { code: 'de', name: 'Deutsch',          rtl: false, myMemory: 'de-DE' },
  { code: 'es', name: 'Español',          rtl: false, myMemory: 'es-ES' },
  { code: 'hi', name: 'हिन्दी',           rtl: false, myMemory: 'hi-IN' },
  { code: 'bn', name: 'বাংলা',            rtl: false, myMemory: 'bn-BD' },
  { code: 'id', name: 'Bahasa Indonesia', rtl: false, myMemory: 'id-ID' },
  { code: 'ms', name: 'Bahasa Melayu',    rtl: false, myMemory: 'ms-MY' },
  { code: 'ru', name: 'Русский',          rtl: false, myMemory: 'ru-RU' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];

export type TranslationSource =
  | 'Quran.com'
  | 'Sunnah.com'
  | 'HisnulMuslim'
  | 'MyMemory'
  | 'LibreTranslate'
  | 'Lingva'
  | 'FAILED';

export interface TranslationResult {
  text:        string;
  source:      TranslationSource;
  verified:    boolean;
  needsReview: boolean;
}

export type AllTranslations = Record<LangCode, TranslationResult>;

export type ContentType =
  | 'adhkar'
  | 'quran'
  | 'hadith'
  | 'ui'
  | 'notification'
  | 'section'
  | 'html';

export interface TranslateRequest {
  text:               string;
  sourceLang:         'ar' | 'en';
  contentType:        ContentType;
  arabicText?:        string;
  surahNumber?:       number;
  ayahNumber?:        number;
  hadithCollection?:  string;
  hadithNumber?:      number;
}

// ─── API Configuration ───────────────────────────────────────────────────────

/** Quran.com v4 translation resource IDs */
const QURANCOM_IDS: Record<string, number | null> = {
  ar: null,   // Original Arabic — no translation needed
  en: 131,    // Saheeh International
  fr: 31,     // Muhammad Hamidullah
  tr: 77,     // Diyanet İşleri Vakfı
  ur: 97,     // Fateh Muhammad Jalandhari
  de: 27,     // Aburida & Aziz & Sadeghi
  es: 83,     // Muhammad Asad
  hi: 122,    // Suhel Farooq Khan
  bn: 161,    // Muhiuddin Khan
  id: 134,    // Kementerian Agama RI
  ms: 39,     // Abdullah Muhammad Basmeih
  ru: 79,     // Elmir Kuliev
};

const SUNNAH_API_KEY = 'SqD712P3E82xnwOAEOkGd5JZH8s9wRR24TnnTSSJ';

/** Sunnah.com language codes differ from ours */
const SUNNAH_LANG_MAP: Partial<Record<string, string>> = {
  en: 'en', ar: 'ar', ur: 'ur', bn: 'bn', id: 'id', tr: 'tr', ru: 'ru',
};

const HISNUL_BASE = 'https://raw.githubusercontent.com/YoussefRaafatNasry/hisnul-muslim-json/master/data';
const HISNUL_LANGS: string[] = ['en', 'fr', 'tr', 'ur', 'id', 'bn', 'ru', 'de', 'es', 'hi'];

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

const LIBRE_INSTANCES = [
  'https://libretranslate.com',
  'https://translate.argosopentech.com',
  'https://libretranslate.de',
];

const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://lingva.thedaviddelta.com',
];

// ─── Cache ───────────────────────────────────────────────────────────────────

const cache = new Map<string, TranslationResult>();

function cacheKey(text: string, src: string, tgt: string): string {
  return `${src}>${tgt}:${text.slice(0, 120)}`;
}

/** Heuristic: detect URL-encoded content */
function looksEncoded(text: string): boolean {
  if (!text || text.length < 4) return false;
  if (/%[0-9A-Fa-f]{2}/.test(text)) return true;
  if (/[0-9A-Fa-f]{2}\s*%\s*[0-9A-Fa-f]{2}/.test(text)) return true;
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

/** Detect and fix URL-encoded text that translation APIs may return */
function sanitizeTranslation(text: string): string {
  if (!text) return text;
  if (!looksEncoded(text)) return text;

  const cleaned = removeEncodedSpaces(text);
  const isDoubleEncoded = /%25[0-9A-Fa-f]{2}/.test(cleaned);

  // For single-encoded text, fix missing % between hex pairs first
  if (!isDoubleEncoded) {
    try {
      let fixed = cleaned;
      fixed = fixed.replace(/%([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})%/g, '%$1%$2%');
      fixed = fixed.replace(/%([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})%/g, '%$1%$2%');
      const decoded = decodeLoop(fixed);
      if (!/%[0-9A-Fa-f]{2}/.test(decoded)) return decoded;
    } catch { /* continue */ }
  }

  // Try direct decode (handles double-encoding via decodeLoop)
  try {
    const decoded = decodeLoop(cleaned);
    if (!/%[0-9A-Fa-f]{2}/.test(decoded)) return decoded;
  } catch { /* continue */ }

  // Strip ALL spaces and try from scratch
  try {
    let stripped = text.replace(/\s+/g, '');
    if (/^[0-9A-Fa-f]{2}%/.test(stripped)) stripped = '%' + stripped;
    const decoded = decodeLoop(stripped);
    if (!/%[0-9A-Fa-f]{2}/.test(decoded)) return decoded;
    let fixed = stripped;
    fixed = fixed.replace(/%([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})%/g, '%$1%$2%');
    fixed = fixed.replace(/%([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})%/g, '%$1%$2%');
    const decoded2 = decodeLoop(fixed);
    if (!/%[0-9A-Fa-f]{2}/.test(decoded2)) return decoded2;
  } catch { /* continue */ }

  // Last resort — decode each valid %XX%YY UTF-8 pair individually
  try {
    return text.replace(/%[0-9A-Fa-f]{2}(?:%[0-9A-Fa-f]{2})*/g, match => {
      try { return decodeURIComponent(match); } catch { return match; }
    });
  } catch { return text; }
}

/** HisnulMuslim JSON cache — keyed by lang code */
const hisnulCache = new Map<string, any[]>();

// ─── Arabic Normalization (for HisnulMuslim fuzzy matching) ──────────────────

function normalizeArabic(text: string): string {
  return text
    // Strip tashkeel (diacritics)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    // Normalize alef variants → bare alef
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    // Normalize taa marbuta → haa
    .replace(/\u0629/g, '\u0647')
    // Normalize alef maqsura → yaa
    .replace(/\u0649/g, '\u064A')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Source 1: Quran.com ─────────────────────────────────────────────────────

async function tryQuranCom(
  surah: number,
  ayah: number,
  lang: string,
): Promise<TranslationResult | null> {
  const resourceId = QURANCOM_IDS[lang];
  if (resourceId == null) return null;

  try {
    const url = `https://api.quran.com/api/v4/quran/translations/${resourceId}?verse_key=${surah}:${ayah}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const translation = data?.translations?.[0];
    if (!translation?.text) return null;

    // Strip HTML tags that Quran.com sometimes includes
    const cleanText = translation.text.replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return null;

    return { text: cleanText, source: 'Quran.com', verified: true, needsReview: false };
  } catch {
    return null;
  }
}

// ─── Source 2: Sunnah.com ────────────────────────────────────────────────────

async function trySunnahCom(
  collectionName: string,
  hadithNumber: number,
  lang: string,
): Promise<TranslationResult | null> {
  const sunnahLang = SUNNAH_LANG_MAP[lang];
  if (!sunnahLang) return null;

  try {
    const url = `https://api.sunnah.com/v1/hadiths/${collectionName}:${hadithNumber}`;
    const res = await fetch(url, {
      headers: { 'x-api-key': SUNNAH_API_KEY },
    });
    if (!res.ok) return null;

    const data = await res.json();
    // Sunnah.com returns hadith body per language
    const body = data?.hadith?.find((h: any) => h.lang === sunnahLang)?.body;
    if (!body) return null;

    const cleanText = body.replace(/<[^>]*>/g, '').trim();
    if (!cleanText) return null;

    return { text: cleanText, source: 'Sunnah.com', verified: true, needsReview: false };
  } catch {
    return null;
  }
}

// ─── Source 3: HisnulMuslim GitHub JSONs ─────────────────────────────────────

async function fetchHisnulData(lang: string): Promise<any[]> {
  if (hisnulCache.has(lang)) return hisnulCache.get(lang)!;
  if (!HISNUL_LANGS.includes(lang)) return [];

  try {
    const url = `${HISNUL_BASE}/${lang}.json`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    // The JSON structure: array of categories, each with array of adhkar
    const items: any[] = Array.isArray(data) ? data : (data?.data ?? []);
    hisnulCache.set(lang, items);
    return items;
  } catch {
    return [];
  }
}

async function tryHisnulMuslim(
  arabicText: string,
  lang: string,
): Promise<TranslationResult | null> {
  if (!HISNUL_LANGS.includes(lang)) return null;

  try {
    const allData = await fetchHisnulData(lang);
    if (!allData.length) return null;

    const normalizedInput = normalizeArabic(arabicText);

    // Walk through categories and their items looking for a match
    for (const category of allData) {
      const items = category?.array ?? category?.adhkar ?? category?.items ?? [];
      for (const item of items) {
        // Compare Arabic text from the item with our input
        const itemArabic = item?.arabic ?? item?.text ?? item?.ar ?? '';
        if (!itemArabic) continue;

        const normalizedItem = normalizeArabic(itemArabic);

        // Exact match or one contains the other (handles partial dhikr text)
        if (
          normalizedInput === normalizedItem ||
          normalizedItem.includes(normalizedInput) ||
          normalizedInput.includes(normalizedItem)
        ) {
          const translation = item?.translation ?? item?.text ?? item?.[lang] ?? '';
          if (translation && typeof translation === 'string' && translation.trim()) {
            return {
              text: translation.trim(),
              source: 'HisnulMuslim',
              verified: true,
              needsReview: false,
            };
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Source 4: MyMemory ──────────────────────────────────────────────────────

function getMyMemoryLangPair(src: string, tgt: string): string {
  const srcLocale = LANGUAGES.find(l => l.code === src)?.myMemory ?? src;
  const tgtLocale = LANGUAGES.find(l => l.code === tgt)?.myMemory ?? tgt;
  return `${srcLocale}|${tgtLocale}`;
}

async function tryMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslationResult | null> {
  try {
    const langpair = getMyMemoryLangPair(sourceLang, targetLang);
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated || translated === text) return null;

    // MyMemory returns warning string when quota exceeded
    if (data?.responseStatus === 429 || data?.responseDetails?.includes?.('LIMIT')) return null;

    // Reject URL-encoded echo (API sometimes echoes the encoded input)
    const sanitized = sanitizeTranslation(translated.trim());
    if (looksEncoded(sanitized)) return null;

    return { text: sanitized, source: 'MyMemory', verified: false, needsReview: true };
  } catch {
    return null;
  }
}

// ─── Source 5: LibreTranslate ────────────────────────────────────────────────

async function tryLibreTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslationResult | null> {
  for (const instance of LIBRE_INSTANCES) {
    try {
      const res = await fetch(`${instance}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        }),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const translated = data?.translatedText;
      if (translated && translated !== text) {
        const sanitized = sanitizeTranslation(translated.trim());
        if (looksEncoded(sanitized)) continue;
        return { text: sanitized, source: 'LibreTranslate', verified: false, needsReview: true };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Source 6: Lingva ────────────────────────────────────────────────────────

async function tryLingva(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslationResult | null> {
  for (const instance of LINGVA_INSTANCES) {
    try {
      const url = `${instance}/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      const translated = data?.translation;
      if (translated && translated !== text) {
        const sanitized = sanitizeTranslation(translated.trim());
        if (looksEncoded(sanitized)) continue;
        return { text: sanitized, source: 'Lingva', verified: false, needsReview: true };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

/**
 * Translates text into all 12 languages.
 * Uses Islamic sources first, general translators as fallback.
 * Calls onProgress() after each language — for live UI updates.
 */
export async function translateToAll(
  req: TranslateRequest,
  onProgress?: (lang: LangCode, result: TranslationResult) => void,
): Promise<AllTranslations> {
  const results: Partial<AllTranslations> = {};

  for (const lang of LANGUAGES) {
    const code = lang.code;

    // Arabic source text — return original unchanged
    if (code === 'ar' && req.sourceLang === 'ar') {
      results.ar = {
        text:        req.arabicText ?? req.text,
        source:      'HisnulMuslim',
        verified:    true,
        needsReview: false,
      };
      onProgress?.(code, results.ar);
      continue;
    }

    // Same language as source — return as-is
    if (code === req.sourceLang) {
      results[code] = {
        text:        req.text,
        source:      'HisnulMuslim',
        verified:    true,
        needsReview: false,
      };
      onProgress?.(code, results[code]!);
      continue;
    }

    // Check cache
    const ck = cacheKey(req.text, req.sourceLang, code);
    if (cache.has(ck)) {
      results[code] = cache.get(ck)!;
      onProgress?.(code, results[code]!);
      continue;
    }

    let result: TranslationResult | null = null;

    // ── Islamic sources based on content type ──

    if (req.contentType === 'quran' && req.surahNumber && req.ayahNumber) {
      result = await tryQuranCom(req.surahNumber, req.ayahNumber, code);
    }

    if (!result && req.contentType === 'hadith' && req.hadithCollection && req.hadithNumber) {
      result = await trySunnahCom(req.hadithCollection, req.hadithNumber, code);
    }

    if (!result && req.contentType === 'adhkar' && req.arabicText) {
      result = await tryHisnulMuslim(req.arabicText, code);
    }

    // ── General free translators as fallback ──

    if (!result) result = await tryMyMemory(req.text, req.sourceLang, code);
    if (!result) result = await tryLibreTranslate(req.text, req.sourceLang, code);
    if (!result) result = await tryLingva(req.text, req.sourceLang, code);

    // ── All failed ──

    const final: TranslationResult = result ?? {
      text:        '',
      source:      'FAILED',
      verified:    false,
      needsReview: true,
    };

    results[code] = final;
    cache.set(ck, final);

    onProgress?.(code, final);

    // Respectful rate limiting
    await new Promise(r => setTimeout(r, 150));
  }

  return results as AllTranslations;
}

/**
 * Translate a single text to a single target language.
 * Convenience wrapper around translateToAll for one-off translations.
 */
export async function translateOne(
  text: string,
  sourceLang: 'ar' | 'en',
  targetLang: LangCode,
  contentType: ContentType = 'ui',
): Promise<TranslationResult> {
  const ck = cacheKey(text, sourceLang, targetLang);
  if (cache.has(ck)) return cache.get(ck)!;

  if (targetLang === sourceLang) {
    return { text, source: 'HisnulMuslim', verified: true, needsReview: false };
  }

  let result: TranslationResult | null = null;
  result = await tryMyMemory(text, sourceLang, targetLang);
  if (!result) result = await tryLibreTranslate(text, sourceLang, targetLang);
  if (!result) result = await tryLingva(text, sourceLang, targetLang);

  const final: TranslationResult = result ?? {
    text: '',
    source: 'FAILED',
    verified: false,
    needsReview: true,
  };

  cache.set(ck, final);
  return final;
}

/** Clear all cached translation results */
export function clearCache(): void {
  cache.clear();
  hisnulCache.clear();
}
