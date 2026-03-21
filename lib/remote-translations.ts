/**
 * REMOTE TRANSLATIONS SERVICE
 * Downloads and caches bulk UI translation packs from Firestore.
 * These override bundled translations in t() calls.
 *
 * Firestore collection: `translations/{lang}` — per-language docs
 * Document structure:
 *   {
 *     strings: Record<string, string | Record<string, string>>,
 *     version: number,
 *     updatedAt: string,
 *   }
 *
 * Flow:
 *   App start → load cache (instant) → check Firestore version → update if newer
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

// ─── Types ───────────────────────────────────────────────────────────────────

type LangCode = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

interface RemoteTranslationPack {
  strings: Record<string, any>;
  version: number;
  updatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = '@remote_translations_';
const VERSION_KEY = '@remote_translations_versions';
const COLLECTION_NAME = 'translations';

// ─── In-Memory Store ─────────────────────────────────────────────────────────

/** Map: langCode → { dot.notation.key → translated string } */
const remoteStrings = new Map<LangCode, Record<string, any>>();
const versions = new Map<LangCode, number>();
let initialized = false;

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Load cached remote translations for a specific language.
 * Called on app start for instant availability.
 */
async function loadCachedTranslations(lang: LangCode): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${lang}`);
    if (cached) {
      const pack: RemoteTranslationPack = JSON.parse(cached);
      if (pack.strings && typeof pack.strings === 'object') {
        remoteStrings.set(lang, pack.strings);
        versions.set(lang, pack.version || 0);
      }
    }
  } catch {
    // Cache miss or corruption — will try Firestore
  }
}

/**
 * Fetch latest translations from Firestore for a language.
 * Only downloads if version is newer than cached.
 */
async function fetchRemoteTranslations(lang: LangCode): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, lang);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return false;

    const data = docSnap.data() as RemoteTranslationPack;
    if (!data.strings || typeof data.strings !== 'object') return false;

    const currentVersion = versions.get(lang) || 0;
    const remoteVersion = data.version || 0;

    // Only update if remote version is newer
    if (remoteVersion <= currentVersion && remoteStrings.has(lang)) {
      return false;
    }

    remoteStrings.set(lang, data.strings);
    versions.set(lang, remoteVersion);

    // Cache for offline use
    await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${lang}`, JSON.stringify(data));

    return true;
  } catch {
    // Firestore unavailable — use cache
    return false;
  }
}

/**
 * Initialize remote translations for the current language.
 * Loads cache first (instant), then checks Firestore in background.
 */
export async function initRemoteTranslations(lang: LangCode): Promise<void> {
  // Load cached translations instantly
  await loadCachedTranslations(lang);
  initialized = true;

  // Check for updates in background (non-blocking)
  fetchRemoteTranslations(lang).catch(() => {});
}

/**
 * Get a remote translation override for a dotted key path.
 * Returns null if no remote override exists.
 *
 * Supports both flat keys ("tabs.home") and nested objects.
 */
export function getRemoteTranslation(key: string, lang: LangCode): string | null {
  const strings = remoteStrings.get(lang);
  if (!strings) return null;

  // Try flat key first (e.g., "tabs.home" as a single key)
  if (typeof strings[key] === 'string') {
    return strings[key];
  }

  // Try nested path (e.g., strings.tabs.home)
  const keys = key.split('.');
  let value: any = strings;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return null;
    }
  }

  return typeof value === 'string' ? value : null;
}

/**
 * Check if remote translations have been initialized.
 */
export function areRemoteTranslationsLoaded(): boolean {
  return initialized;
}

/**
 * Force refresh remote translations for a language.
 * Called after language change.
 */
export async function refreshRemoteTranslations(lang: LangCode): Promise<void> {
  await loadCachedTranslations(lang);
  await fetchRemoteTranslations(lang);
}

/**
 * Get stats for debugging.
 */
export function getRemoteTranslationsStats(): { lang: string; keys: number; version: number }[] {
  const stats: { lang: string; keys: number; version: number }[] = [];
  for (const [lang, strings] of remoteStrings.entries()) {
    stats.push({
      lang,
      keys: Object.keys(strings).length,
      version: versions.get(lang) || 0,
    });
  }
  return stats;
}
