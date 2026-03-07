// lib/quran-cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import localQuranData from '../data/json/quran-uthmani.json';

const CACHE_KEYS = {
  QURAN_FULL: '@quran_full_data',
  SURAHS_LIST: '@quran_surahs_list',
  RECITERS_LIST: '@quran_reciters_list',
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
  identifier: string;
  name: string;
  englishName: string;
  format: string;
  type: string;
  bitrate?: string;
}

export interface LastPlayback {
  surahNumber: number;
  ayahNumber: number;
  reciterIdentifier: string;
  timestamp: number;
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

// ─── تحميل قائمة القراء ─────────────────────────────────────────────────────────
export async function fetchAndCacheReciters(): Promise<Reciter[]> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEYS.RECITERS_LIST);
    if (cached && await isCacheValid()) {
      return JSON.parse(cached);
    }

    const response = await fetch('https://api.alquran.cloud/v1/edition?format=audio&language=ar');
    const data = await response.json();

    if (data.code === 200 && data.data) {
      const reciters: Reciter[] = data.data
        .filter((edition: any) => edition.type === 'versebyverse')
        .map((edition: any) => ({
          identifier: edition.identifier,
          name: edition.name,
          englishName: edition.englishName,
          format: edition.format,
          type: edition.type,
        }));

      await AsyncStorage.setItem(CACHE_KEYS.RECITERS_LIST, JSON.stringify(reciters));
      console.log(`✅ Cached ${reciters.length} reciters`);
      return reciters;
    }
    throw new Error('Failed to fetch reciters');
  } catch (error) {
    console.error('Error fetching reciters:', error);
    const cached = await AsyncStorage.getItem(CACHE_KEYS.RECITERS_LIST);
    if (cached) return JSON.parse(cached);
    
    // قائمة افتراضية
    return [
      { identifier: 'ar.alafasy', name: 'مشاري العفاسي', englishName: 'Mishary Alafasy', format: 'audio', type: 'versebyverse' },
      { identifier: 'ar.abdurrahmaansudais', name: 'عبدالرحمن السديس', englishName: 'Abdurrahmaan Sudais', format: 'audio', type: 'versebyverse' },
      { identifier: 'ar.abdulbasitmurattal', name: 'عبدالباسط عبدالصمد', englishName: 'Abdul Basit', format: 'audio', type: 'versebyverse' },
      { identifier: 'ar.husary', name: 'محمود خليل الحصري', englishName: 'Mahmoud Khalil Al-Husary', format: 'audio', type: 'versebyverse' },
      { identifier: 'ar.minshawi', name: 'محمد صديق المنشاوي', englishName: 'Mohamed Siddiq El-Minshawi', format: 'audio', type: 'versebyverse' },
    ];
  }
}

// ─── رابط صوت الآية ─────────────────────────────────────────────────────────────
export function getAyahAudioUrl(reciterIdentifier: string, ayahNumber: number): string {
  return `https://cdn.islamic.network/quran/audio/128/${reciterIdentifier}/${ayahNumber}.mp3`;
}

// ─── رابط صوت السورة كاملة (QuranicAudio CDN — proven to work) ────────────────────
// Maps alquran.cloud reciter IDs to quranicaudio.com directory names
const QURANIC_AUDIO_PATHS: Record<string, string> = {
  'ar.alafasy':              'mishaari_raashid_al_3afaasee',
  'ar.abdullahbasfar':       'abdullaah_basfar',
  'ar.abdurrahmaansudais':   'abdurrahmaan_as-sudais',
  'ar.shaatree':             'abu_bakr_ash-shaatree',
  'ar.husary':               'mahmood_khaleel_al-husaree',
  'ar.minshawi':             'muhammad_siddeeq_al-minshaawee',
  'ar.hudhaify':             'ali_ibn_abi_taalib_al-hudhaifee',
  'ar.muhammadjibreel':      'muhammad_jibreel',
};

export function getSurahAudioUrl(reciterIdentifier: string, surahNumber: number): string {
  const paddedNumber = surahNumber.toString().padStart(3, '0');
  const path = QURANIC_AUDIO_PATHS[reciterIdentifier];
  if (path) {
    return `https://download.quranicaudio.com/quran/${path}/${paddedNumber}.mp3`;
  }
  // Generic fallback using alquran.cloud CDN per-edition path
  return `https://cdn.islamic.network/quran/audio-surah/128/${reciterIdentifier}/${paddedNumber}.mp3`;
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
