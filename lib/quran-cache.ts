// lib/quran-cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import localQuranData from '../data/json/quran-uthmani.json';
import {
  RECITERS_REGISTRY,
  RECITERS_BY_ID,
  LEGACY_RECITER_ID_MAP,
  DEFAULT_RECITER_ID,
  type ReciterEntry,
} from './reciters-registry';

const CACHE_KEYS = {
  QURAN_FULL: '@quran_full_data',
  SURAHS_LIST: '@quran_surahs_list',
  RECITERS_LIST: '@quran_reciters_list_v2',
  CACHE_TIMESTAMP: '@quran_cache_timestamp',
  LAST_PLAYBACK: '@quran_last_playback',
};

// مدة صلاحية الكاش (7 أيام)
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

export interface CachedSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: CachedAyah[];
}

export interface CachedAyah {
  number: number;
  numberInSurah: number;
  text: string;
  juz: number;
  page: number;
  hizbQuarter: number;
}

export interface Reciter {
  /** Stable internal id from RECITERS_REGISTRY (e.g. 'mishary_alafasy'). */
  identifier: string;
  /** Arabic display name. */
  name: string;
  /** English display name. */
  englishName: string;
  format: string;
  type: string;
  bitrate?: string;
  /** True when the reciter supports per-ayah highlight sync. */
  hasPerAyahSync: boolean;
  /** Style of recitation. */
  style: 'murattal' | 'mujawwad';
}

export interface LastPlayback {
  surahNumber: number;
  ayahNumber: number;
  reciterIdentifier: string;
  timestamp: number;
}

// ─── الحصول على نص الآية كامل من البيانات المحلية ────────────────────────────
export function getFullVerseText(surahNumber: number, ayahNumber: number): string | null {
  const surah = (localQuranData as any[]).find(s => s.number === surahNumber);
  if (!surah) return null;
  const ayah = surah.ayahs?.find((a: any) => a.numberInSurah === ayahNumber);
  return ayah?.text ?? null;
}

// ─── التحقق من صلاحية الكاش ─────────────────────────────────────────────────
async function isCacheValid(): Promise<boolean> {
  try {
    const timestamp = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
    if (!timestamp) return false;
    const cacheTime = parseInt(timestamp, 10);
    return Date.now() - cacheTime < CACHE_DURATION;
  } catch {
    return false;
  }
}

// ─── تحميل قائمة السور (من الملف المحلي مباشرة) ──────────────────────────────
export async function fetchAndCacheSurahsList(): Promise<CachedSurah[]> {
  // البيانات محفوظة محلياً — لا حاجة للإنترنت
  // JSON doesn't have numberOfAyahs — derive from ayahs array length
  return (localQuranData as any[]).map(s => ({
    ...s,
    numberOfAyahs: s.numberOfAyahs ?? s.ayahs?.length ?? 0,
  })) as CachedSurah[];
}

// ─── الحصول على سورة معينة ─────────────────────────────────────────────────────
export async function getCachedSurah(surahNumber: number): Promise<CachedSurah | null> {
  const surahs = await fetchAndCacheSurahsList();
  return surahs.find(s => s.number === surahNumber) || null;
}

// Reciter list comes directly from the verified registry — no network fetch needed.
function toReciter(entry: ReciterEntry): Reciter {
  return {
    identifier: entry.id,
    name: entry.nameAr,
    englishName: entry.nameEn,
    format: 'audio',
    type: 'versebyverse',
    bitrate: String(entry.bitrate),
    hasPerAyahSync: !!entry.quranCdnId,
    style: entry.style,
  };
}

// ─── تحميل قائمة القراء ─────────────────────────────────────────────────────────
export async function fetchAndCacheReciters(): Promise<Reciter[]> {
  const reciters = RECITERS_REGISTRY.map(toReciter);
  // Persist for offline access by other modules.
  try {
    await AsyncStorage.setItem(CACHE_KEYS.RECITERS_LIST, JSON.stringify(reciters));
  } catch (err) {
    console.warn('Could not persist reciters list:', err);
  }
  return reciters;
}

/** Thrown when no working CDN source exists for a reciter. */
export class ReciterUnavailableError extends Error {
  readonly reciterId: string;
  constructor(reciterId: string, message?: string) {
    super(message || `Reciter "${reciterId}" has no available audio source.`);
    this.name = 'ReciterUnavailableError';
    this.reciterId = reciterId;
  }
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

/**
 * Resolve any incoming reciter identifier (current id, legacy `ar.*`/`extra.*`, or unknown)
 * to a valid registry entry. Falls back to the default reciter if the id is completely unknown,
 * so the app never throws on stale stored preferences (notification settings, AsyncStorage, etc.).
 */
function resolveReciterEntry(reciterIdentifier: string): { id: string; entry: ReciterEntry } {
  const direct = RECITERS_BY_ID[reciterIdentifier];
  if (direct) return { id: reciterIdentifier, entry: direct };

  const migrated = LEGACY_RECITER_ID_MAP[reciterIdentifier];
  if (migrated && RECITERS_BY_ID[migrated]) {
    return { id: migrated, entry: RECITERS_BY_ID[migrated] };
  }

  const fallback = RECITERS_BY_ID[DEFAULT_RECITER_ID];
  if (fallback) {
    console.warn(`[quran-cache] Unknown reciter "${reciterIdentifier}" — falling back to ${DEFAULT_RECITER_ID}`);
    return { id: DEFAULT_RECITER_ID, entry: fallback };
  }

  throw new ReciterUnavailableError(reciterIdentifier, `Unknown reciter: ${reciterIdentifier}`);
}

// ─── رابط صوت الآية (per-ayah) ─────────────────────────────────────────────────
export function getAyahAudioUrl(
  reciterIdentifier: string,
  globalAyahNumber: number,
  surahNumber?: number,
  ayahInSurah?: number,
): string {
  const { id, entry } = resolveReciterEntry(reciterIdentifier);

  // Priority 1: alquran.cloud CDN (uses global ayah number)
  if (entry.alquranCloudId) {
    return `https://cdn.islamic.network/quran/audio/${entry.bitrate}/${entry.alquranCloudId}/${globalAyahNumber}.mp3`;
  }

  // Priority 2: everyayah.com (needs surah + ayah-in-surah)
  if (entry.everyAyahFolder && surahNumber && ayahInSurah) {
    return `https://everyayah.com/data/${entry.everyAyahFolder}/${pad3(surahNumber)}${pad3(ayahInSurah)}.mp3`;
  }

  throw new ReciterUnavailableError(
    id,
    `Reciter "${id}" has no per-ayah audio source.`,
  );
}

// ─── رابط صوت السورة كاملة (per-surah / continuous play / download) ──────────────
export function getSurahAudioUrl(reciterIdentifier: string, surahNumber: number): string {
  const urls = getSurahAudioUrls(reciterIdentifier, surahNumber);
  if (urls.length === 0) {
    const { id } = resolveReciterEntry(reciterIdentifier);
    throw new ReciterUnavailableError(
      id,
      `Reciter "${id}" has no per-surah audio source.`,
    );
  }
  return urls[0];
}

/**
 * Returns ALL candidate per-surah URLs for a reciter, in priority order.
 * Used by audio-player.ts to retry on HTTP load failure (CDN drift defense).
 */
export function getSurahAudioUrls(reciterIdentifier: string, surahNumber: number): string[] {
  const { entry } = resolveReciterEntry(reciterIdentifier);
  const padded = pad3(surahNumber);
  const urls: string[] = [];

  // Priority 1: quranicaudio.com (large catalog, fast)
  if (entry.quranicAudioDir) {
    urls.push(`https://download.quranicaudio.com/quran/${entry.quranicAudioDir}/${padded}.mp3`);
  }

  // Priority 2: mp3quran.net mirror
  if (entry.mp3Quran) {
    urls.push(`https://server${entry.mp3Quran.server}.mp3quran.net/${entry.mp3Quran.folder}/${padded}.mp3`);
  }

  return urls;
}

// ─── حفظ واسترجاع آخر موضع تشغيل ─────────────────────────────────────────────────
export async function saveLastPlayback(playback: Omit<LastPlayback, 'timestamp'>): Promise<void> {
  const data: LastPlayback = { ...playback, timestamp: Date.now() };
  await AsyncStorage.setItem(CACHE_KEYS.LAST_PLAYBACK, JSON.stringify(data));
}

export async function getLastPlayback(): Promise<LastPlayback | null> {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.LAST_PLAYBACK);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ─── مسح الكاش ─────────────────────────────────────────────────────────────────
export async function clearQuranCache(): Promise<void> {
  await AsyncStorage.multiRemove([
    CACHE_KEYS.QURAN_FULL,
    CACHE_KEYS.SURAHS_LIST,
    CACHE_KEYS.RECITERS_LIST,
    CACHE_KEYS.CACHE_TIMESTAMP,
  ]);
  console.log('🗑️ Quran cache cleared');
}

// ─── تهيئة الكاش عند بدء التطبيق ─────────────────────────────────────────────────
export async function initializeQuranCache(): Promise<{
  surahs: CachedSurah[];
  reciters: Reciter[];
}> {
  console.log('📥 Initializing Quran cache...');
  const [surahs, reciters] = await Promise.all([
    fetchAndCacheSurahsList(),
    fetchAndCacheReciters(),
  ]);
  console.log(`✅ Loaded ${surahs.length} surahs and ${reciters.length} reciters`);
  return { surahs, reciters };
}
