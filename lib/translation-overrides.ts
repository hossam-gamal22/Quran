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
 *     screen?: string,
 *     createdAt: string,
 *     updatedAt: string,
 *   }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

// ─── Types ───────────────────────────────────────────────────────────────────

type LangCode = 'ar' | 'en' | 'fr' | 'de' | 'es' | 'tr' | 'ur' | 'id' | 'ms' | 'hi' | 'bn' | 'ru';

interface TranslationOverride {
  sourceText: string;
  overrides: Partial<Record<LangCode, string>>;
  screen?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = '@translation_overrides_cache';
const COLLECTION_NAME = 'translationOverrides';

// ─── In-Memory Store ─────────────────────────────────────────────────────────

/** Map: Arabic source text → { langCode → translated string } */
const overridesMap = new Map<string, Partial<Record<LangCode, string>>>();
let loaded = false;
let unsubscribeSnapshot: (() => void) | null = null;

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Load overrides from AsyncStorage cache first (instant),
 * then subscribe to Firestore for real-time updates.
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

  // 2. Subscribe to Firestore for real-time updates
  try {
    const colRef = collection(db, COLLECTION_NAME);

    unsubscribeSnapshot = onSnapshot(colRef, (snapshot) => {
      overridesMap.clear();
      const entries: TranslationOverride[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as TranslationOverride;
        if (data.sourceText && data.overrides) {
          const trimmed = data.sourceText.trim();
          overridesMap.set(trimmed, data.overrides);
          entries.push({ sourceText: trimmed, overrides: data.overrides, screen: data.screen });
        }
      }

      // Persist to AsyncStorage for next app start
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
    }, () => {
      // Snapshot error — cache already loaded, so we're fine
    });
  } catch {
    // Firestore unavailable — using cache only
  }
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
