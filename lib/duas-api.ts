// lib/duas-api.ts
// أدعية من السنة — Firestore مع 3-tier cache — روح المسلم

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';

const CACHE_KEY = '@selected_duas_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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

export async function fetchSelectedDuas(): Promise<SelectedDua[]> {
  // Tier 1: Memory cache
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION) {
    return memoryCache.duas;
  }

  // Tier 2: AsyncStorage cache
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
      const cacheData: CachedDuas = { duas, timestamp: Date.now() };
      memoryCache = cacheData;
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      return duas;
    }
  } catch (error) {
    console.log('Error fetching duas from Firestore:', error);
  }

  // Fallback: return empty (caller will use local data)
  return [];
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
} {
  return {
    id: typeof dua.id === 'string' ? parseInt(dua.id, 10) || 0 : 0,
    arabic: dua.arabic,
    reference: dua.reference || dua.source,
    count: 1,
    category: 'sunnah_duas',
    benefit: dua.benefit,
    translations: dua.translations,
  };
}

/**
 * Clear duas cache (useful when admin updates content)
 */
export async function clearDuasCache(): Promise<void> {
  memoryCache = null;
  await AsyncStorage.removeItem(CACHE_KEY);
}
