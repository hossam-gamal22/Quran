// lib/daily-dhikr.ts
// Daily dhikr data layer — mixes local azkar.json + Firestore admin entries

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';

const CACHE_KEY = '@daily_dhikr_cache';
const CACHE_DATE_KEY = '@daily_dhikr_cache_date';

export interface DailyDhikr {
  id: string;
  arabic: string;
  reference: string;
  benefit?: string;
  category?: string;
  source: 'local' | 'firestore';
  translations?: Record<string, string>;
  benefitTranslations?: Record<string, string>;
}

interface FirestoreDhikr {
  arabic: string;
  reference: string;
  benefit?: string | Record<string, string>;
  enabled: boolean;
}

// Load local azkar as daily dhikr pool (select best ones across categories)
let localPool: DailyDhikr[] | null = null;

function getLocalPool(): DailyDhikr[] {
  if (localPool) return localPool;
  try {
    const azkarData = require('@/data/json/azkar.json');
    const azkar: any[] = azkarData.azkar || [];
    // Pick adhkar that have benefit (virtue) — these are more meaningful for daily display
    localPool = azkar
      .filter((z: any) => z.arabic && z.reference)
      .map((z: any) => ({
        id: `local_${z.id}`,
        arabic: z.arabic,
        reference: z.reference,
        benefit: typeof z.benefit === 'string' ? z.benefit : (z.benefit?.ar || ''),
        category: z.category,
        source: 'local' as const,
        translations: z.translations || undefined,
        benefitTranslations: typeof z.benefit === 'object' && z.benefit !== null ? z.benefit : undefined,
      }));
    return localPool;
  } catch {
    localPool = [];
    return localPool;
  }
}

// Fetch admin-added adhkar from Firestore
async function fetchFirestoreAdhkar(): Promise<DailyDhikr[]> {
  try {
    const db = getFirestore();
    const q = query(collection(db, 'dailyDhikr'), where('enabled', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as FirestoreDhikr;
      return {
        id: `fs_${d.id}`,
        arabic: data.arabic,
        reference: data.reference,
        benefit: typeof data.benefit === 'string' ? data.benefit : (data.benefit?.ar || ''),
        source: 'firestore' as const,
        benefitTranslations: typeof data.benefit === 'object' && data.benefit !== null ? data.benefit as Record<string, string> : undefined,
      };
    });
  } catch {
    return [];
  }
}

function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Build merged pool (local + Firestore) and cache for the day.
 * Returns combined pool sorted deterministically by id.
 */
async function getMergedPool(): Promise<DailyDhikr[]> {
  const today = getTodayStr();

  // Check cached pool
  try {
    const cachedDate = await AsyncStorage.getItem(CACHE_DATE_KEY);
    if (cachedDate === today) {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    }
  } catch {}

  const local = getLocalPool();
  const firestore = await fetchFirestoreAdhkar();
  const merged = [...local, ...firestore].sort((a, b) => a.id.localeCompare(b.id));

  // Cache for the day
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    await AsyncStorage.setItem(CACHE_DATE_KEY, today);
  } catch {}

  return merged;
}

/**
 * Get the dhikr of the day (deterministic by day-of-year).
 * Mixes local azkar.json + Firestore admin entries.
 */
export async function getDhikrOfTheDay(): Promise<DailyDhikr> {
  const pool = await getMergedPool();
  if (pool.length === 0) {
    return {
      id: 'fallback',
      arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
      reference: 'البخاري ومسلم',
      benefit: 'كلمتان خفيفتان على اللسان ثقيلتان في الميزان حبيبتان إلى الرحمن',
      source: 'local',
    };
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return pool[dayOfYear % pool.length];
}

/**
 * Get a random dhikr different from the current one.
 */
export async function getRandomDhikr(excludeId?: string): Promise<DailyDhikr> {
  const pool = await getMergedPool();
  if (pool.length <= 1) return pool[0] || await getDhikrOfTheDay();
  let item: DailyDhikr;
  do {
    item = pool[Math.floor(Math.random() * pool.length)];
  } while (item.id === excludeId && pool.length > 1);
  return item;
}
