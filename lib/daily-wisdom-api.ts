// Remote daily wisdom pool.
// Firestore collection: dailyWisdomStories

import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getAllQuotes, type IslamicQuote, WISDOM_BACKUP_DAYS } from '@/data/quotes';

export const DAILY_WISDOM_REMOTE_COLLECTION = 'dailyWisdomStories';

const REMOTE_POOL_CACHE_KEY = '@daily_wisdom_remote_pool_v1';

type FirestoreWisdomStory = Partial<IslamicQuote> & {
  enabled?: boolean;
  day?: number;
  yearDay?: number;
  order?: number;
};

type CachedRemotePool = {
  fetchedAt: string;
  data: IslamicQuote[];
};

function getDayOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asTranslations(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value)
    .map(([key, val]) => [key, asString(val)] as const)
    .filter(([, val]) => val.length > 0);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function asQuranRef(value: unknown): IslamicQuote['quranRef'] | undefined {
  if (!isRecord(value)) return undefined;
  const surah = Number(value.surah);
  const ayah = Number(value.ayah);
  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) return undefined;
  if (surah < 1 || surah > 114 || ayah < 1) return undefined;
  return { surah, ayah };
}

function toWisdomQuote(data: FirestoreWisdomStory): IslamicQuote | null {
  const arabic = asString(data.arabic);
  const translation = asString(data.translation);
  const author = asString(data.author);
  const evidenceArabic = asString(data.evidenceArabic);

  if (!arabic || !author || !evidenceArabic) return null;

  return {
    arabic,
    translation,
    author,
    source: asString(data.source) || undefined,
    evidenceArabic,
    evidenceTranslation: asString(data.evidenceTranslation) || undefined,
    quranRef: asQuranRef(data.quranRef),
    translations: asTranslations(data.translations),
  };
}

function sortRemoteStories(a: { id: string; data: FirestoreWisdomStory }, b: { id: string; data: FirestoreWisdomStory }): number {
  const aDay = Number(a.data.day ?? a.data.yearDay ?? Number.MAX_SAFE_INTEGER);
  const bDay = Number(b.data.day ?? b.data.yearDay ?? Number.MAX_SAFE_INTEGER);
  if (aDay !== bDay) return aDay - bDay;

  const aOrder = Number(a.data.order ?? Number.MAX_SAFE_INTEGER);
  const bOrder = Number(b.data.order ?? Number.MAX_SAFE_INTEGER);
  if (aOrder !== bOrder) return aOrder - bOrder;

  return a.id.localeCompare(b.id);
}

async function readCachedRemotePool(): Promise<IslamicQuote[]> {
  try {
    const cached = await AsyncStorage.getItem(REMOTE_POOL_CACHE_KEY);
    if (!cached) return [];
    const parsed = JSON.parse(cached) as CachedRemotePool;
    return Array.isArray(parsed.data) ? parsed.data.filter(item => !!item?.arabic) : [];
  } catch {
    return [];
  }
}

async function saveCachedRemotePool(data: IslamicQuote[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      REMOTE_POOL_CACHE_KEY,
      JSON.stringify({ fetchedAt: new Date().toISOString(), data } satisfies CachedRemotePool),
    );
  } catch {}
}

export async function fetchRemoteWisdomPool(): Promise<IslamicQuote[]> {
  try {
    const snap = await getDocs(collection(db, DAILY_WISDOM_REMOTE_COLLECTION));
    const remoteStories = snap.docs
      .map(doc => ({ id: doc.id, data: doc.data() as FirestoreWisdomStory }))
      .filter(item => item.data.enabled !== false)
      .sort(sortRemoteStories)
      .map(item => toWisdomQuote(item.data))
      .filter((item): item is IslamicQuote => !!item);

    if (remoteStories.length > 0) {
      await saveCachedRemotePool(remoteStories);
      return remoteStories;
    }
  } catch {}

  return readCachedRemotePool();
}

export async function getWisdomPoolOnlineFirst(): Promise<IslamicQuote[]> {
  const remotePool = await fetchRemoteWisdomPool();
  return remotePool.length ? remotePool : getAllQuotes();
}

export function getWisdomForDateFromPool(pool: IslamicQuote[], date = new Date()): { quote: IslamicQuote; index: number } {
  const safePool = pool.length ? pool : getAllQuotes();
  const index = getDayOfYear(date) % safePool.length;
  return { quote: safePool[index], index };
}

export function getWisdomBackupFromPool(pool: IslamicQuote[], startDate = new Date(), days = WISDOM_BACKUP_DAYS): IslamicQuote[] {
  return Array.from({ length: days }, (_, offset) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + offset);
    return getWisdomForDateFromPool(pool, d).quote;
  });
}
