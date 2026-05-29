/**
 * TRANSLATION OVERRIDES SERVICE
 * Fetches admin-set translation overrides from Firestore.
 * These take priority over auto-translate API results.
 *
 * Firestore collection: `translationOverrides`
 * Document structure:
 *   {
 *     sourceText: string,
 *     overrides: Record<LangCode, string>,
 *     createdAt: string,
 *     updatedAt: string,
 *   }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

// ─── Types ───────────────────────────────────────────────────────────────────

type LangCode = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

interface TranslationOverride {
  sourceText: string;
  overrides: Partial<Record<LangCode, string>>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = '@translation_overrides_cache';
const STORAGE_TS_KEY = '@translation_overrides_cached_at';
const COLLECTION_NAME = 'translationOverrides';
const REFRESH_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ─── In-Memory Store ─────────────────────────────────────────────────────────

/** Map: Arabic source text → { langCode → translated string } */
const overridesMap = new Map<string, Partial<Record<LangCode, string>>>();
let loaded = false;
let unsubscribeSnapshot: (() => void) | null = null;

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Load overrides from AsyncStorage cache first (instant), then refresh
 * from Firestore at most once per TTL window.
 *
 * Previously this opened a persistent collection-wide onSnapshot for
 * every user, which re-read every override doc on each app session. For
 * rarely-changing admin text corrections that is wasteful at scale, so
 * we now do a single TTL-gated getDocs instead. Admin edits propagate
 * within the TTL (6h) rather than in real time — acceptable for
 * translation text.
 */
export async function loadTranslationOverrides(): Promise<void> {
  if (loaded) return;

  // 1. Load from local cache (fast)
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (cached) {
      const entries: TranslationOverride[] = JSON.parse(cached);
      for (const entry of entries) {
        if (entry.sourceText && entry.overrides) {
          overridesMap.set(entry.sourceText.trim(), entry.overrides);
        }
      }
    }
  } catch {
    // Cache miss or corrupt — will load from Firestore
  }

  loaded = true;

  // 2. Refresh from Firestore only if the cache is stale or missing.
  try {
    let cacheAge = Infinity;
    try {
      const ts = await AsyncStorage.getItem(STORAGE_TS_KEY);
      if (ts) cacheAge = Date.now() - Number(ts);
    } catch {}
    if (overridesMap.size > 0 && cacheAge < REFRESH_TTL_MS) return;

    await refreshTranslationOverridesFromFirestore();
  } catch {
    // Firestore unavailable — using cache only
  }
}

/**
 * One-shot refresh of the in-memory + persisted overrides from Firestore.
 * Exposed so callers (e.g. admin preview, manual refresh) can force an
 * immediate update without waiting for the TTL.
 */
export async function refreshTranslationOverridesFromFirestore(): Promise<void> {
  const colRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(colRef);

  overridesMap.clear();
  const entries: TranslationOverride[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as TranslationOverride;
    if (data.sourceText && data.overrides) {
      const trimmed = data.sourceText.trim();
      overridesMap.set(trimmed, data.overrides);
      entries.push({ sourceText: trimmed, overrides: data.overrides });
    }
  }

  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
  AsyncStorage.setItem(STORAGE_TS_KEY, String(Date.now())).catch(() => {});
}

/**
 * Get an admin override for a specific Arabic text + target language.
 * Returns the override string or null if none exists.
 */
export function getTranslationOverride(
  sourceText: string,
  targetLang: string,
): string | null {
  if (!sourceText?.trim()) return null;
  const overrides = overridesMap.get(sourceText.trim());
  if (!overrides) return null;
  const value = overrides[targetLang as LangCode];
  return value?.trim() || null;
}

/**
 * Check if overrides have been loaded (for initialization checks).
 */
export function areOverridesLoaded(): boolean {
  return loaded;
}

/**
 * Get count of loaded overrides (for debugging).
 */
export function getOverridesCount(): number {
  return overridesMap.size;
}

/**
 * Clean up Firestore listener on app shutdown.
 */
export function unsubscribeTranslationOverrides(): void {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
}
