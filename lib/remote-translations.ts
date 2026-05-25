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
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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
let activeLang: LangCode | null = null;
let unsubscribeSnapshot: (() => void) | null = null;
const listeners = new Set<() => void>();

// ─── Core Functions ──────────────────────────────────────────────────────────

function isGeneratedPlaceholderTranslation(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/[_-]/g, ' ');
  return /^(virtue|reference|benefit|title|subtitle|label|body)?[a-z]+(?:tasbih|azkar|dua|dhikr|daily|seasonal|prayer|quran|default)\s+default\s+\d+$/.test(normalized);
}

function sanitizeRemoteStrings(input: Record<string, any>): Record<string, any> {
  const output: Record<string, any> = {};

  Object.entries(input || {}).forEach(([key, value]) => {
    if (typeof value === 'string') {
      if (!isGeneratedPlaceholderTranslation(value)) {
        output[key] = value;
      }
      return;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = sanitizeRemoteStrings(value);
      if (Object.keys(nested).length > 0) {
        output[key] = nested;
      }
      return;
    }

    output[key] = value;
  });

  return output;
}

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
        remoteStrings.set(lang, sanitizeRemoteStrings(pack.strings));
        versions.set(lang, pack.version || 0);
      }
    }
  } catch {
    // Cache miss or corruption — will try Firestore
  }
}

async function applyRemotePack(lang: LangCode, data: RemoteTranslationPack): Promise<boolean> {
  if (!data.strings || typeof data.strings !== 'object') return false;

  const sanitizedStrings = sanitizeRemoteStrings(data.strings);

  remoteStrings.set(lang, sanitizedStrings);
  versions.set(lang, data.version || 0);

  await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${lang}`, JSON.stringify({
    ...data,
    strings: sanitizedStrings,
  }));
  listeners.forEach(listener => {
    try {
      listener();
    } catch {
      // Listener updates should never break translation hydration.
    }
  });

  return true;
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

    return await applyRemotePack(lang, data);
  } catch {
    // Firestore unavailable — use cache
    return false;
  }
}

function subscribeToRemotePack(lang: LangCode): void {
  if (activeLang === lang && unsubscribeSnapshot) return;
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  activeLang = lang;

  try {
    unsubscribeSnapshot = onSnapshot(
      doc(db, COLLECTION_NAME, lang),
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data() as RemoteTranslationPack;
        applyRemotePack(lang, data).catch(() => {});
      },
      () => {
        // Cache remains active when Firestore listener is unavailable.
      },
    );
  } catch {
    unsubscribeSnapshot = null;
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
  subscribeToRemotePack(lang);

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
    if (isGeneratedPlaceholderTranslation(strings[key])) return null;
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

  if (typeof value !== 'string') return null;
  return isGeneratedPlaceholderTranslation(value) ? null : value;
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
  subscribeToRemotePack(lang);
  await fetchRemoteTranslations(lang);
}

export function subscribeRemoteTranslationChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
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
