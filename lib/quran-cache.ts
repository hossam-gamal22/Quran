// lib/quran-cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// ─── تحميل قائمة السور ─────────────────────────────────────────────────────────
export async function fetchAndCacheSurahsList(): Promise<CachedSurah[]> {
  try {
    // التحقق من الكاش أولاً
    const cached = await AsyncStorage.getItem(CACHE_KEYS.SURAHS_LIST);
    if (cached && await isCacheValid()) {
      return JSON.parse(cached);
    }

    // جلب من API
    const response = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
    const data = await response.json();
    
    if (data.code === 200 && data.data?.surahs) {
      const surahs: CachedSurah[] = data.data.surahs.map((surah: any) => ({
        number: surah.number,
        name: surah.name,
        englishName: surah.englishName,
        englishNameTranslation: surah.englishNameTranslation,
        numberOfAyahs: surah.numberOfAyahs,
        revelationType: surah.revelationType,
        ayahs: surah.ayahs.map((ayah: any) => ({
          number: ayah.number,
          numberInSurah: ayah.numberInSurah,
          text: ayah.text,
          juz: ayah.juz,
          page: ayah.page,
          hizbQuarter: ayah.hizbQuarter,
        })),
      }));

      // حفظ في الكاش
      await AsyncStorage.setItem(CACHE_KEYS.SURAHS_LIST, JSON.stringify(surahs));
      await AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
      
      console.log('✅ Cached all 114 surahs');
      return surahs;
    }
    throw new Error('Failed to fetch Quran data');
  } catch (error) {
    console.error('Error fetching surahs:', error);
    // محاولة استرجاع من الكاش حتى لو منتهي
    const cached = await AsyncStorage.getItem(CACHE_KEYS.SURAHS_LIST);
    if (cached) return JSON.parse(cached);
    return [];
  }
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

// ─── رابط صوت السورة كاملة ───────────────────────────────────────────────────────
export function getSurahAudioUrl(reciterIdentifier: string, surahNumber: number): string {
  // بعض القراء يوفرون السورة كاملة
  const paddedNumber = surahNumber.toString().padStart(3, '0');
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
