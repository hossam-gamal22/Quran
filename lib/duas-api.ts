// lib/duas-api.ts
// أدعية من السنة — Firestore مع 3-tier cache — روح المسلم

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where, orderBy, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/config/firebase';

const CACHE_KEY = '@selected_duas_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes, so admin edits reach users quickly

export interface SelectedDua {
  id: string;
  arabic: string;
  translations: Record<string, string>;
  reference: string;
  benefit: Record<string, string> | string;
  source: string;
  enabled: boolean;
  order: number;
  audio?: string;
}

interface CachedDuas {
  duas: SelectedDua[];
  timestamp: number;
}

/**
 * Fetch curated duas from Firestore with 3-tier cache:
 * Memory → AsyncStorage → Firestore → local fallback
 */
let memoryCache: CachedDuas | null = null;

async function persistDuas(duas: SelectedDua[]): Promise<void> {
  const cacheData: CachedDuas = { duas, timestamp: Date.now() };
  memoryCache = cacheData;
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {}
}

export async function fetchSelectedDuas(options: { forceRefresh?: boolean } = {}): Promise<SelectedDua[]> {
  // Tier 1: Memory cache
  if (!options.forceRefresh && memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION) {
    return memoryCache.duas;
  }

  // Tier 2: AsyncStorage cache
  if (!options.forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedDuas = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          memoryCache = parsed;
          return parsed.duas;
        }
      }
    } catch {}
  }

  // Tier 3: Firestore
  try {
    const q = query(
      collection(db, 'selectedDuas'),
      where('enabled', '==', true),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    const duas: SelectedDua[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as SelectedDua));

    if (duas.length > 0) {
      await persistDuas(duas);
      return duas;
    }
  } catch (error) {
    console.log('Error fetching duas from Firestore:', error);
  }

  // Fallback: return empty (caller will use local data)
  return [];
}

export function subscribeToSelectedDuas(
  onUpdate: (duas: SelectedDua[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const q = query(
    collection(db, 'selectedDuas'),
    where('enabled', '==', true),
    orderBy('order', 'asc')
  );

  return onSnapshot(
    q,
    snapshot => {
      const duas: SelectedDua[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as SelectedDua));
      void persistDuas(duas);
      onUpdate(duas);
    },
    error => {
      console.log('Error subscribing to selected duas:', error);
      onError?.(error);
    }
  );
}

/**
 * Get daily rotating duas selection using deterministic hash.
 * Same duas for the same day, different next day.
 */
export function getDailySelectedDuas(allDuas: SelectedDua[], count: number = 10): SelectedDua[] {
  if (allDuas.length <= count) return allDuas;

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);

  // Seeded shuffle using day of year — same LCG as getDailySunnahDuas
  const indices = allDuas.map((_, i) => i);
  let seed = dayOfYear * 2654435761; // Knuth multiplicative hash
  for (let i = indices.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, count).map(i => allDuas[i]);
}

/**
 * Convert SelectedDua to Zikr-compatible shape for existing display components.
 */
export function duaToZikr(dua: SelectedDua): {
  id: number;
  arabic: string;
  reference: string;
  count: number;
  category: string;
  benefit: Record<string, string> | string;
  translations: Record<string, string>;
  audio?: string;
} {
  const numericId = typeof dua.id === 'string'
    ? parseInt(dua.id, 10) || Array.from(dua.id).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 0)
    : 0;

  return {
    id: numericId,
    arabic: dua.arabic,
    reference: dua.reference || dua.source,
    count: 1,
    category: 'sunnah_duas',
    benefit: dua.benefit,
    translations: dua.translations,
    audio: dua.audio || '',
  };
}

/**
 * Clear duas cache (useful when admin updates content)
 */
export async function clearDuasCache(): Promise<void> {
  memoryCache = null;
  await AsyncStorage.removeItem(CACHE_KEY);
}
