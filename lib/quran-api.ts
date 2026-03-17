// ============================================
// API القرآن الكريم
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { t, getLanguage } from '@/lib/i18n';

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';
const QURAN_AUDIO_BASE = 'https://cdn.islamic.network/quran/audio';

// ============================================
// الأنواع
// ============================================

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  hizbQuarter: number;
  sajda: boolean | { id: number; recommended: boolean; obligatory: boolean };
}

export interface SurahWithAyahs extends Surah {
  ayahs: Ayah[];
}

export interface Reciter {
  id: string;
  identifier: string;
  name: string;
  nameAr: string;
  style?: string;
  bitrate: number;
}

export interface Juz {
  number: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

// ============================================
// قائمة القراء
// ============================================

export const RECITERS: Reciter[] = [
  { id: 'ar.alafasy', identifier: 'ar.alafasy', name: 'Mishary Alafasy', nameAr: 'مشاري العفاسي', bitrate: 128 },
  { id: 'ar.abdulbasitmurattal', identifier: 'ar.abdulbasitmurattal', name: 'Abdul Basit (Murattal)', nameAr: 'عبد الباسط عبد الصمد - مرتل', bitrate: 128 },
  { id: 'ar.abdulsamad', identifier: 'ar.abdulsamad', name: 'Abdul Samad', nameAr: 'عبد الباسط عبد الصمد - مجود', bitrate: 64 },
  { id: 'ar.husary', identifier: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', nameAr: 'محمود خليل الحصري', bitrate: 128 },
  { id: 'ar.husarymujawwad', identifier: 'ar.husarymujawwad', name: 'Al-Husary (Mujawwad)', nameAr: 'الحصري - مجود', bitrate: 128 },
  { id: 'ar.minshawi', identifier: 'ar.minshawi', name: 'Mohamed Siddiq Al-Minshawi', nameAr: 'محمد صديق المنشاوي', bitrate: 128 },
  { id: 'ar.minshawimujawwad', identifier: 'ar.minshawimujawwad', name: 'Al-Minshawi (Mujawwad)', nameAr: 'المنشاوي - مجود', bitrate: 64 },
  { id: 'ar.ahmedajamy', identifier: 'ar.ahmedajamy', name: 'Ahmed Al-Ajamy', nameAr: 'أحمد العجمي', bitrate: 128 },
  { id: 'ar.muhammadayyoub', identifier: 'ar.muhammadayyoub', name: 'Muhammad Ayyoub', nameAr: 'محمد أيوب', bitrate: 128 },
  { id: 'ar.muhammadjibreel', identifier: 'ar.muhammadjibreel', name: 'Muhammad Jibreel', nameAr: 'محمد جبريل', bitrate: 128 },
  { id: 'ar.maaborimatar', identifier: 'ar.maaborimatar', name: 'Maher Al Muaiqly', nameAr: 'ماهر المعيقلي', bitrate: 128 },
  { id: 'ar.saaborimatar', identifier: 'ar.saaborimatar', name: 'Saud Al-Shuraim', nameAr: 'سعود الشريم', bitrate: 128 },
  { id: 'ar.abduraborimatar', identifier: 'ar.abduraborimatar', name: 'Abdurrahman As-Sudais', nameAr: 'عبدالرحمن السديس', bitrate: 128 },
  { id: 'ar.haborimatar', identifier: 'ar.haborimatar', name: 'Hani Ar-Rifai', nameAr: 'هاني الرفاعي', bitrate: 128 },
  { id: 'ar.abdullahbasfar', identifier: 'ar.abdullahbasfar', name: 'Abdullah Basfar', nameAr: 'عبدالله بصفر', bitrate: 128 },
  { id: 'ar.ibrahimakhbar', identifier: 'ar.ibrahimakhbar', name: 'Ibrahim Al-Akhdar', nameAr: 'إبراهيم الأخضر', bitrate: 128 },
  { id: 'ar.shaaborimatar', identifier: 'ar.shaaborimatar', name: 'Abu Bakr Al-Shatri', nameAr: 'أبو بكر الشاطري', bitrate: 128 },
  { id: 'ar.parhizgar', identifier: 'ar.parhizgar', name: 'Nasser Al-Qatami', nameAr: 'ناصر القطامي', bitrate: 128 },
  { id: 'ar.aaborimatar', identifier: 'ar.aaborimatar', name: 'Yasser Al-Dosari', nameAr: 'ياسر الدوسري', bitrate: 128 },
  { id: 'ar.abdulbarimatar', identifier: 'ar.abdulbarimatar', name: 'Saad Al-Ghamdi', nameAr: 'سعد الغامدي', bitrate: 128 },
  { id: 'ar.akaborimatar', identifier: 'ar.akaborimatar', name: 'Ahmed Al-Hudhaify', nameAr: 'أحمد الحذيفي', bitrate: 128 },
  { id: 'ar.abdulrahmanalsudais', identifier: 'ar.abdulrahmanalsudais', name: 'Ali Al-Huthaify', nameAr: 'علي الحذيفي', bitrate: 128 },
  { id: 'ar.bandarbalila', identifier: 'ar.bandarbalila', name: 'Bandar Baleela', nameAr: 'بندر بليلة', bitrate: 128 },
  { id: 'ar.faborimatar', identifier: 'ar.faborimatar', name: 'Fares Abbad', nameAr: 'فارس عباد', bitrate: 128 },
  { id: 'ar.khalifatulttaniji', identifier: 'ar.khalifatulttaniji', name: 'Khalifa Al-Tunaiji', nameAr: 'خليفة الطنيجي', bitrate: 128 },
  { id: 'ar.mahmoudalielbanna', identifier: 'ar.mahmoudalielbanna', name: 'Mahmoud Ali Al-Banna', nameAr: 'محمود علي البنا', bitrate: 128 },
];

// ============================================
// قائمة الأجزاء
// ============================================

export const JUZS: Juz[] = [
  { number: 1, startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 141 },
  { number: 2, startSurah: 2, startAyah: 142, endSurah: 2, endAyah: 252 },
  { number: 3, startSurah: 2, startAyah: 253, endSurah: 3, endAyah: 92 },
  { number: 4, startSurah: 3, startAyah: 93, endSurah: 4, endAyah: 23 },
  { number: 5, startSurah: 4, startAyah: 24, endSurah: 4, endAyah: 147 },
  { number: 6, startSurah: 4, startAyah: 148, endSurah: 5, endAyah: 81 },
  { number: 7, startSurah: 5, startAyah: 82, endSurah: 6, endAyah: 110 },
  { number: 8, startSurah: 6, startAyah: 111, endSurah: 7, endAyah: 87 },
  { number: 9, startSurah: 7, startAyah: 88, endSurah: 8, endAyah: 40 },
  { number: 10, startSurah: 8, startAyah: 41, endSurah: 9, endAyah: 92 },
  { number: 11, startSurah: 9, startAyah: 93, endSurah: 11, endAyah: 5 },
  { number: 12, startSurah: 11, startAyah: 6, endSurah: 12, endAyah: 52 },
  { number: 13, startSurah: 12, startAyah: 53, endSurah: 14, endAyah: 52 },
  { number: 14, startSurah: 15, startAyah: 1, endSurah: 16, endAyah: 128 },
  { number: 15, startSurah: 17, startAyah: 1, endSurah: 18, endAyah: 74 },
  { number: 16, startSurah: 18, startAyah: 75, endSurah: 20, endAyah: 135 },
  { number: 17, startSurah: 21, startAyah: 1, endSurah: 22, endAyah: 78 },
  { number: 18, startSurah: 23, startAyah: 1, endSurah: 25, endAyah: 20 },
  { number: 19, startSurah: 25, startAyah: 21, endSurah: 27, endAyah: 55 },
  { number: 20, startSurah: 27, startAyah: 56, endSurah: 29, endAyah: 45 },
  { number: 21, startSurah: 29, startAyah: 46, endSurah: 33, endAyah: 30 },
  { number: 22, startSurah: 33, startAyah: 31, endSurah: 36, endAyah: 27 },
  { number: 23, startSurah: 36, startAyah: 28, endSurah: 39, endAyah: 31 },
  { number: 24, startSurah: 39, startAyah: 32, endSurah: 41, endAyah: 46 },
  { number: 25, startSurah: 41, startAyah: 47, endSurah: 45, endAyah: 37 },
  { number: 26, startSurah: 46, startAyah: 1, endSurah: 51, endAyah: 30 },
  { number: 27, startSurah: 51, startAyah: 31, endSurah: 57, endAyah: 29 },
  { number: 28, startSurah: 58, startAyah: 1, endSurah: 66, endAyah: 12 },
  { number: 29, startSurah: 67, startAyah: 1, endSurah: 77, endAyah: 50 },
  { number: 30, startSurah: 78, startAyah: 1, endSurah: 114, endAyah: 6 },
];

// ============================================
// دوال API
// ============================================

export async function fetchSurahs(): Promise<Surah[]> {
  try {
    const response = await fetch(`${QURAN_API_BASE}/surah`);
    const data = await response.json();
    
    if (data.code === 200) {
      return data.data;
    }
    throw new Error('Failed to fetch surahs');
  } catch (error) {
    console.error('Error fetching surahs:', error);
    throw error;
  }
}

export async function fetchSurah(surahNumber: number): Promise<SurahWithAyahs> {
  try {
    const response = await fetch(`${QURAN_API_BASE}/surah/${surahNumber}`);
    const data = await response.json();
    
    if (data.code === 200) {
      return data.data;
    }
    throw new Error('Failed to fetch surah');
  } catch (error) {
    console.error('Error fetching surah:', error);
    throw error;
  }
}

export async function fetchSurahWithTranslation(
  surahNumber: number, 
  edition: string = 'ar.muyassar'
): Promise<{ arabic: SurahWithAyahs; translation: SurahWithAyahs }> {
  try {
    const [arabicRes, translationRes] = await Promise.all([
      fetch(`${QURAN_API_BASE}/surah/${surahNumber}`),
      fetch(`${QURAN_API_BASE}/surah/${surahNumber}/${edition}`),
    ]);
    
    const arabicData = await arabicRes.json();
    const translationData = await translationRes.json();
    
    if (arabicData.code === 200 && translationData.code === 200) {
      return {
        arabic: arabicData.data,
        translation: translationData.data,
      };
    }
    throw new Error('Failed to fetch surah with translation');
  } catch (error) {
    console.error('Error fetching surah with translation:', error);
    throw error;
  }
}

export async function fetchAyah(
  surahNumber: number, 
  ayahNumber: number
): Promise<Ayah> {
  try {
    const response = await fetch(`${QURAN_API_BASE}/ayah/${surahNumber}:${ayahNumber}`);
    const data = await response.json();
    
    if (data.code === 200) {
      return data.data;
    }
    throw new Error('Failed to fetch ayah');
  } catch (error) {
    console.error('Error fetching ayah:', error);
    throw error;
  }
}

export async function fetchPage(pageNumber: number): Promise<Ayah[]> {
  try {
    const response = await fetch(`${QURAN_API_BASE}/page/${pageNumber}`);
    const data = await response.json();
    
    if (data.code === 200) {
      return data.data.ayahs;
    }
    throw new Error('Failed to fetch page');
  } catch (error) {
    console.error('Error fetching page:', error);
    throw error;
  }
}

export async function fetchJuz(juzNumber: number): Promise<Ayah[]> {
  try {
    const response = await fetch(`${QURAN_API_BASE}/juz/${juzNumber}`);
    const data = await response.json();
    
    if (data.code === 200) {
      return data.data.ayahs;
    }
    throw new Error('Failed to fetch juz');
  } catch (error) {
    console.error('Error fetching juz:', error);
    throw error;
  }
}

export async function searchQuran(
  query: string,
  edition: string = 'ar',
  surah: string = 'all'
): Promise<{ matches: any[]; count: number }> {
  try {
    const response = await fetch(
      `${QURAN_API_BASE}/search/${encodeURIComponent(query)}/${surah}/${edition}`
    );
    const data = await response.json();

    if (data.code === 200) {
      return {
        matches: data.data.matches || [],
        count: data.data.count || data.data.matches?.length || 0,
      };
    }
    return { matches: [], count: 0 };
  } catch (error) {
    console.error('Error searching Quran:', error);
    return { matches: [], count: 0 };
  }
}

// ============================================
// التفسير
// ============================================

export interface TafsirEdition {
  identifier: string;
  name: string;
  nameEn?: string;
  language: string;
}

export const TAFSIR_EDITIONS: TafsirEdition[] = [
  { identifier: 'ar.muyassar', name: 'التفسير الميسر', nameEn: 'Al-Muyassar', language: 'ar' },
  { identifier: 'ar.jalalayn', name: 'تفسير الجلالين', nameEn: 'Al-Jalalayn', language: 'ar' },
  { identifier: 'ar.ibnkathir', name: 'تفسير ابن كثير', nameEn: 'Ibn Kathir', language: 'ar' },
  { identifier: 'ar.qurtubi', name: 'تفسير القرطبي', nameEn: 'Al-Qurtubi', language: 'ar' },
  { identifier: 'ar.tabari', name: 'تفسير الطبري', nameEn: 'Al-Tabari', language: 'ar' },
];

export const TRANSLATION_EDITIONS = [
  // English
  { identifier: 'en.sahih', name: 'Sahih International', language: 'en' },
  { identifier: 'en.pickthall', name: 'Pickthall', language: 'en' },
  { identifier: 'en.yusufali', name: 'Yusuf Ali', language: 'en' },
  // Urdu
  { identifier: 'ur.jalandhry', name: 'جالندھری', language: 'ur' },
  { identifier: 'ur.junagarhi', name: 'جوناگڑھی', language: 'ur' },
  // French
  { identifier: 'fr.hamidullah', name: 'Hamidullah', language: 'fr' },
  // Turkish
  { identifier: 'tr.diyanet', name: 'Diyanet İşleri', language: 'tr' },
  { identifier: 'tr.yazir', name: 'Elmalılı Hamdi Yazır', language: 'tr' },
  // Indonesian
  { identifier: 'id.indonesian', name: 'Bahasa Indonesia', language: 'id' },
  // German
  { identifier: 'de.bubenheim', name: 'Bubenheim & Elyas', language: 'de' },
  { identifier: 'de.aburida', name: 'Abu Rida', language: 'de' },
  // Spanish
  { identifier: 'es.cortes', name: 'Julio Cortes', language: 'es' },
  { identifier: 'es.asad', name: 'Muhammad Asad', language: 'es' },
  // Hindi
  { identifier: 'hi.hindi', name: 'फ़ारूक़ ख़ान & नदवी', language: 'hi' },
  { identifier: 'hi.farooq', name: 'फ़ारूक़ ख़ान & अहमद', language: 'hi' },
  // Bengali
  { identifier: 'bn.bengali', name: 'মুহিউদ্দীন খান', language: 'bn' },
  { identifier: 'bn.hoque', name: 'জহুরুল হক', language: 'bn' },
  // Malay
  { identifier: 'ms.basmeih', name: 'Abdullah Basmeih', language: 'ms' },
  // Russian
  { identifier: 'ru.kuliev', name: 'Эльмир Кулиев', language: 'ru' },
  { identifier: 'ru.osmanov', name: 'Османов', language: 'ru' },
  // Persian
  { identifier: 'fa.makarem', name: 'مکارم شیرازی', language: 'fa' },
  { identifier: 'fa.ansarian', name: 'حسین انصاریان', language: 'fa' },
];

/**
 * Get the default translation edition for a given language
 */
export function getDefaultTranslationForLanguage(language: string): string {
  const LANGUAGE_DEFAULT_TRANSLATIONS: Record<string, string> = {
    en: 'en.sahih',
    ur: 'ur.jalandhry',
    fr: 'fr.hamidullah',
    tr: 'tr.diyanet',
    id: 'id.indonesian',
    de: 'de.bubenheim',
    es: 'es.cortes',
    hi: 'hi.hindi',
    bn: 'bn.bengali',
    ms: 'ms.basmeih',
    ru: 'ru.kuliev',
    ar: 'ar.muyassar',
  };
  return LANGUAGE_DEFAULT_TRANSLATIONS[language] || 'en.sahih';
}

/**
 * Get all translation editions for a specific language
 */
export function getTranslationsForLanguage(language: string): typeof TRANSLATION_EDITIONS {
  return TRANSLATION_EDITIONS.filter(t => t.language === language);
}

/**
 * Fetch translation of a full surah
 */
export async function fetchSurahTranslation(
  surahNumber: number,
  edition: string
): Promise<{ ayahs: { numberInSurah: number; text: string }[] }> {
  try {
    const response = await fetch(`${QURAN_API_BASE}/surah/${surahNumber}/${edition}`);
    const data = await response.json();
    if (data.code === 200) {
      return { ayahs: data.data.ayahs.map((a: any) => ({ numberInSurah: a.numberInSurah, text: a.text })) };
    }
    throw new Error('Failed to fetch translation');
  } catch (error) {
    console.error('Error fetching surah translation:', error);
    return { ayahs: [] };
  }
}

export async function fetchTafsir(
  surahNumber: number,
  ayahNumber: number,
  edition: string = 'ar.muyassar'
): Promise<{ arabicText: string; tafsirText: string }> {
  const cacheKey = `@tafsir_${surahNumber}_${ayahNumber}_${edition}`;

  // Check cache first
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  try {
    const [arabicRes, tafsirRes] = await Promise.all([
      fetch(`${QURAN_API_BASE}/ayah/${surahNumber}:${ayahNumber}`),
      fetch(`${QURAN_API_BASE}/ayah/${surahNumber}:${ayahNumber}/${edition}`),
    ]);

    const arabicData = await arabicRes.json();
    const tafsirData = await tafsirRes.json();

    const result = {
      arabicText: arabicData.code === 200 ? arabicData.data.text : '',
      tafsirText: tafsirData.code === 200 ? tafsirData.data.text : 'تعذر تحميل التفسير',
    };

    // Cache successful results
    if (result.tafsirText !== 'تعذر تحميل التفسير') {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
    }

    return result;
  } catch (error) {
    console.error('Error fetching tafsir:', error);
    return { arabicText: '', tafsirText: 'تعذر تحميل التفسير' };
  }
}

// ============================================
// روابط الصوت
// ============================================

export function getSurahAudioUrl(
  surahNumber: number, 
  reciterId: string = 'ar.alafasy',
  bitrate: number = 128
): string {
  // للسور الكاملة
  const paddedNumber = String(surahNumber).padStart(3, '0');
  return `${QURAN_AUDIO_BASE}/${bitrate}/${reciterId}/${paddedNumber}.mp3`;
}

export function getAyahAudioUrl(
  surahNumber: number,
  ayahNumber: number,
  reciterId: string = 'ar.alafasy',
  bitrate: number = 128
): string {
  // حساب رقم الآية الكلي من رقم السورة والآية
  const ayahCounts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,45,33,27,57,29,19,18,12,11,82,8,11,98,5,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6,4,4];
  let globalAyah = ayahNumber;
  for (let i = 0; i < surahNumber - 1; i++) {
    globalAyah += ayahCounts[i];
  }
  return `${QURAN_AUDIO_BASE}/${bitrate}/${reciterId}/${globalAyah}.mp3`;
}

export function getFullAyahAudioUrl(
  globalAyahNumber: number,
  reciterId: string = 'ar.alafasy',
  bitrate: number = 128
): string {
  const paddedNumber = String(globalAyahNumber).padStart(6, '0');
  return `${QURAN_AUDIO_BASE}/${bitrate}/${reciterId}/${paddedNumber}.mp3`;
}

// ============================================
// أسماء السور بالعربية
// ============================================

export const SURAH_NAMES_AR: { [key: number]: string } = {
  1: 'الفاتحة', 2: 'البقرة', 3: 'آل عمران', 4: 'النساء', 5: 'المائدة',
  6: 'الأنعام', 7: 'الأعراف', 8: 'الأنفال', 9: 'التوبة', 10: 'يونس',
  11: 'هود', 12: 'يوسف', 13: 'الرعد', 14: 'إبراهيم', 15: 'الحجر',
  16: 'النحل', 17: 'الإسراء', 18: 'الكهف', 19: 'مريم', 20: 'طه',
  21: 'الأنبياء', 22: 'الحج', 23: 'المؤمنون', 24: 'النور', 25: 'الفرقان',
  26: 'الشعراء', 27: 'النمل', 28: 'القصص', 29: 'العنكبوت', 30: 'الروم',
  31: 'لقمان', 32: 'السجدة', 33: 'الأحزاب', 34: 'سبأ', 35: 'فاطر',
  36: 'يس', 37: 'الصافات', 38: 'ص', 39: 'الزمر', 40: 'غافر',
  41: 'فصلت', 42: 'الشورى', 43: 'الزخرف', 44: 'الدخان', 45: 'الجاثية',
  46: 'الأحقاف', 47: 'محمد', 48: 'الفتح', 49: 'الحجرات', 50: 'ق',
  51: 'الذاريات', 52: 'الطور', 53: 'النجم', 54: 'القمر', 55: 'الرحمن',
  56: 'الواقعة', 57: 'الحديد', 58: 'المجادلة', 59: 'الحشر', 60: 'الممتحنة',
  61: 'الصف', 62: 'الجمعة', 63: 'المنافقون', 64: 'التغابن', 65: 'الطلاق',
  66: 'التحريم', 67: 'الملك', 68: 'القلم', 69: 'الحاقة', 70: 'المعارج',
  71: 'نوح', 72: 'الجن', 73: 'المزمل', 74: 'المدثر', 75: 'القيامة',
  76: 'الإنسان', 77: 'المرسلات', 78: 'النبأ', 79: 'النازعات', 80: 'عبس',
  81: 'التكوير', 82: 'الانفطار', 83: 'المطففين', 84: 'الانشقاق', 85: 'البروج',
  86: 'الطارق', 87: 'الأعلى', 88: 'الغاشية', 89: 'الفجر', 90: 'البلد',
  91: 'الشمس', 92: 'الليل', 93: 'الضحى', 94: 'الشرح', 95: 'التين',
  96: 'العلق', 97: 'القدر', 98: 'البينة', 99: 'الزلزلة', 100: 'العاديات',
  101: 'القارعة', 102: 'التكاثر', 103: 'العصر', 104: 'الهمزة', 105: 'الفيل',
  106: 'قريش', 107: 'الماعون', 108: 'الكوثر', 109: 'الكافرون', 110: 'النصر',
  111: 'المسد', 112: 'الإخلاص', 113: 'الفلق', 114: 'الناس',
};

// ============================================
// أسماء السور بالإنجليزية (الأسماء المعرّبة)
// تُستخدم كلغة احتياطية لجميع اللغات غير العربية
// ============================================

export const SURAH_NAMES_EN: { [key: number]: string } = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali \'Imran', 4: 'An-Nisa', 5: 'Al-Ma\'idah',
  6: 'Al-An\'am', 7: 'Al-A\'raf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Ra\'d', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Taha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Mu\'minun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shu\'ara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-\'Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqi\'ah', 57: 'Al-Hadid', 58: 'Al-Mujadilah', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saff', 62: 'Al-Jumu\'ah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Ma\'arij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Nazi\'at', 80: '\'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-A\'la', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-\'Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-\'Adiyat',
  101: 'Al-Qari\'ah', 102: 'At-Takathur', 103: 'Al-\'Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Ma\'un', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas',
};

// ============================================
// أسماء السور بالتركية
// ============================================

export const SURAH_NAMES_TR: { [key: number]: string } = {
  1: 'Fâtiha', 2: 'Bakara', 3: 'Âl-i İmrân', 4: 'Nisâ', 5: 'Mâide',
  6: 'En\'âm', 7: 'A\'râf', 8: 'Enfâl', 9: 'Tevbe', 10: 'Yûnus',
  11: 'Hûd', 12: 'Yûsuf', 13: 'Ra\'d', 14: 'İbrâhîm', 15: 'Hicr',
  16: 'Nahl', 17: 'İsrâ', 18: 'Kehf', 19: 'Meryem', 20: 'Tâhâ',
  21: 'Enbiyâ', 22: 'Hac', 23: 'Mü\'minûn', 24: 'Nûr', 25: 'Furkân',
  26: 'Şuarâ', 27: 'Neml', 28: 'Kasas', 29: 'Ankebût', 30: 'Rûm',
  31: 'Lokmân', 32: 'Secde', 33: 'Ahzâb', 34: 'Sebe', 35: 'Fâtır',
  36: 'Yâsîn', 37: 'Sâffât', 38: 'Sâd', 39: 'Zümer', 40: 'Mü\'min',
  41: 'Fussilet', 42: 'Şûrâ', 43: 'Zuhruf', 44: 'Duhân', 45: 'Câsiye',
  46: 'Ahkâf', 47: 'Muhammed', 48: 'Fetih', 49: 'Hucurât', 50: 'Kâf',
  51: 'Zâriyât', 52: 'Tûr', 53: 'Necm', 54: 'Kamer', 55: 'Rahmân',
  56: 'Vâkıa', 57: 'Hadîd', 58: 'Mücâdele', 59: 'Haşr', 60: 'Mümtehine',
  61: 'Saff', 62: 'Cumâ', 63: 'Münâfikûn', 64: 'Teğâbün', 65: 'Talâk',
  66: 'Tahrîm', 67: 'Mülk', 68: 'Kalem', 69: 'Hâkka', 70: 'Meâric',
  71: 'Nûh', 72: 'Cin', 73: 'Müzzemmil', 74: 'Müddessir', 75: 'Kıyâmet',
  76: 'İnsân', 77: 'Mürselât', 78: 'Nebe', 79: 'Nâziât', 80: 'Abese',
  81: 'Tekvîr', 82: 'İnfitâr', 83: 'Mutaffifîn', 84: 'İnşikâk', 85: 'Bürûc',
  86: 'Târık', 87: 'A\'lâ', 88: 'Gâşiye', 89: 'Fecr', 90: 'Beled',
  91: 'Şems', 92: 'Leyl', 93: 'Duhâ', 94: 'İnşirâh', 95: 'Tîn',
  96: 'Alâk', 97: 'Kadir', 98: 'Beyyine', 99: 'Zilzâl', 100: 'Âdiyât',
  101: 'Kâria', 102: 'Tekâsür', 103: 'Asr', 104: 'Hümeze', 105: 'Fîl',
  106: 'Kureyş', 107: 'Mâûn', 108: 'Kevser', 109: 'Kâfirûn', 110: 'Nasr',
  111: 'Tebbet', 112: 'İhlâs', 113: 'Felâk', 114: 'Nâs',
};

// ============================================
// أسماء السور بالفرنسية
// ============================================

export const SURAH_NAMES_FR: { [key: number]: string } = {
  1: 'Al-Fatiha', 2: 'Al-Baqara', 3: 'Al Imran', 4: 'An-Nisa', 5: 'Al-Ma\'ida',
  6: 'Al-An\'am', 7: 'Al-A\'raf', 8: 'Al-Anfal', 9: 'At-Tawba', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Ra\'d', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Muminune', 24: 'An-Nur', 25: 'Al-Furqane',
  26: 'Ach-Chou\'ara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-\'Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajda', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ach-Choura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiya',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqi\'a', 57: 'Al-Hadid', 58: 'Al-Mujadala', 59: 'Al-Hashr', 60: 'Al-Mumtahana',
  61: 'As-Saff', 62: 'Al-Jumu\'a', 63: 'Al-Munafiqune', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqa', 70: 'Al-Ma\'arij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddathir', 75: 'Al-Qiyama',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Nazi\'at', 80: '\'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-A\'la', 88: 'Al-Ghashiya', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ach-Chams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ach-Charh', 95: 'At-Tin',
  96: 'Al-\'Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyina', 99: 'Az-Zalzala', 100: 'Al-\'Adiyat',
  101: 'Al-Qari\'a', 102: 'At-Takathur', 103: 'Al-\'Asr', 104: 'Al-Humaza', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Ma\'un', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas',
};

// ============================================
// أسماء السور بالأوردية
// ============================================

export const SURAH_NAMES_UR: { [key: number]: string } = {
  1: 'الفاتحہ', 2: 'البقرۃ', 3: 'آلِ عمران', 4: 'النساء', 5: 'المائدۃ',
  6: 'الانعام', 7: 'الاعراف', 8: 'الانفال', 9: 'التوبۃ', 10: 'یونس',
  11: 'ھود', 12: 'یوسف', 13: 'الرعد', 14: 'ابراھیم', 15: 'الحجر',
  16: 'النحل', 17: 'الاسراء', 18: 'الکہف', 19: 'مریم', 20: 'طٰہٰ',
  21: 'الانبیاء', 22: 'الحج', 23: 'المؤمنون', 24: 'النور', 25: 'الفرقان',
  26: 'الشعراء', 27: 'النمل', 28: 'القصص', 29: 'العنکبوت', 30: 'الروم',
  31: 'لقمان', 32: 'السجدۃ', 33: 'الاحزاب', 34: 'سبا', 35: 'فاطر',
  36: 'یٰسین', 37: 'الصافات', 38: 'صٓ', 39: 'الزمر', 40: 'غافر',
  41: 'فصلت', 42: 'الشوریٰ', 43: 'الزخرف', 44: 'الدخان', 45: 'الجاثیۃ',
  46: 'الاحقاف', 47: 'محمد', 48: 'الفتح', 49: 'الحجرات', 50: 'قٓ',
  51: 'الذاریات', 52: 'الطور', 53: 'النجم', 54: 'القمر', 55: 'الرحمٰن',
  56: 'الواقعۃ', 57: 'الحدید', 58: 'المجادلۃ', 59: 'الحشر', 60: 'الممتحنۃ',
  61: 'الصف', 62: 'الجمعۃ', 63: 'المنافقون', 64: 'التغابن', 65: 'الطلاق',
  66: 'التحریم', 67: 'الملک', 68: 'القلم', 69: 'الحاقۃ', 70: 'المعارج',
  71: 'نوح', 72: 'الجن', 73: 'المزمل', 74: 'المدثر', 75: 'القیامۃ',
  76: 'الانسان', 77: 'المرسلات', 78: 'النبأ', 79: 'النازعات', 80: 'عبس',
  81: 'التکویر', 82: 'الانفطار', 83: 'المطففین', 84: 'الانشقاق', 85: 'البروج',
  86: 'الطارق', 87: 'الاعلیٰ', 88: 'الغاشیۃ', 89: 'الفجر', 90: 'البلد',
  91: 'الشمس', 92: 'اللیل', 93: 'الضحیٰ', 94: 'الشرح', 95: 'التین',
  96: 'العلق', 97: 'القدر', 98: 'البینۃ', 99: 'الزلزلۃ', 100: 'العادیات',
  101: 'القارعۃ', 102: 'التکاثر', 103: 'العصر', 104: 'الھمزۃ', 105: 'الفیل',
  106: 'قریش', 107: 'الماعون', 108: 'الکوثر', 109: 'الکافرون', 110: 'النصر',
  111: 'المسد', 112: 'الاخلاص', 113: 'الفلق', 114: 'الناس',
};

// ============================================
// أسماء السور بلغات أخرى (هندية، بنغالية، إندونيسية، ماليزية، روسية، ألمانية، إسبانية)
// تستخدم الأسماء الإنجليزية المعرّبة كأساس مشترك
// ============================================

export const SURAH_NAMES_HI: { [key: number]: string } = {
  1: 'अल-फ़ातिहा', 2: 'अल-बक़रा', 3: 'आलि इमरान', 4: 'अन-निसा', 5: 'अल-माइदा',
  6: 'अल-अनआम', 7: 'अल-आराफ़', 8: 'अल-अनफ़ाल', 9: 'अत-तौबा', 10: 'यूनुस',
  11: 'हूद', 12: 'यूसुफ़', 13: 'अर-रअद', 14: 'इब्राहीम', 15: 'अल-हिज्र',
  16: 'अन-नह्ल', 17: 'अल-इसरा', 18: 'अल-कहफ़', 19: 'मरयम', 20: 'ताहा',
  21: 'अल-अंबिया', 22: 'अल-हज्ज', 23: 'अल-मुमिनून', 24: 'अन-नूर', 25: 'अल-फ़ुरक़ान',
  26: 'अश-शुअरा', 27: 'अन-नम्ल', 28: 'अल-क़सस', 29: 'अल-अंकबूत', 30: 'अर-रूम',
  31: 'लुक़मान', 32: 'अस-सजदा', 33: 'अल-अहज़ाब', 34: 'सबा', 35: 'फ़ातिर',
  36: 'यासीन', 37: 'अस-साफ़्फ़ात', 38: 'साद', 39: 'अज़-ज़ुमर', 40: 'ग़ाफ़िर',
  41: 'फ़ुस्सिलत', 42: 'अश-शूरा', 43: 'अज़-ज़ुख़रुफ़', 44: 'अद-दुख़ान', 45: 'अल-जासिया',
  46: 'अल-अहक़ाफ़', 47: 'मुहम्मद', 48: 'अल-फ़त्ह', 49: 'अल-हुजुरात', 50: 'क़ाफ़',
  51: 'अज़-ज़ारियात', 52: 'अत-तूर', 53: 'अन-नज्म', 54: 'अल-क़मर', 55: 'अर-रहमान',
  56: 'अल-वाक़िआ', 57: 'अल-हदीद', 58: 'अल-मुजादिला', 59: 'अल-हश्र', 60: 'अल-मुम्तहिना',
  61: 'अस-सफ़्फ़', 62: 'अल-जुमुआ', 63: 'अल-मुनाफ़िक़ून', 64: 'अत-तग़ाबुन', 65: 'अत-तलाक़',
  66: 'अत-तहरीम', 67: 'अल-मुल्क', 68: 'अल-क़लम', 69: 'अल-हाक़्क़ा', 70: 'अल-मआरिज',
  71: 'नूह', 72: 'अल-जिन्न', 73: 'अल-मुज़्ज़म्मिल', 74: 'अल-मुद्दस्सिर', 75: 'अल-क़ियामा',
  76: 'अल-इंसान', 77: 'अल-मुर्सलात', 78: 'अन-नबा', 79: 'अन-नाज़िआत', 80: 'अबसा',
  81: 'अत-तक्वीर', 82: 'अल-इन्फ़ितार', 83: 'अल-मुतफ़्फ़िफ़ीन', 84: 'अल-इन्शिक़ाक़', 85: 'अल-बुरूज',
  86: 'अत-तारिक़', 87: 'अल-आला', 88: 'अल-ग़ाशिया', 89: 'अल-फ़ज्र', 90: 'अल-बलद',
  91: 'अश-शम्स', 92: 'अल-लैल', 93: 'अद-दुहा', 94: 'अश-शर्ह', 95: 'अत-तीन',
  96: 'अल-अलक़', 97: 'अल-क़द्र', 98: 'अल-बय्यिना', 99: 'अज़-ज़लज़ला', 100: 'अल-आदियात',
  101: 'अल-क़ारिआ', 102: 'अत-तकासुर', 103: 'अल-अस्र', 104: 'अल-हुमज़ा', 105: 'अल-फ़ील',
  106: 'क़ुरैश', 107: 'अल-माऊन', 108: 'अल-कौसर', 109: 'अल-काफ़िरून', 110: 'अन-नस्र',
  111: 'अल-मसद', 112: 'अल-इख़्लास', 113: 'अल-फ़लक़', 114: 'अन-नास',
};

export const SURAH_NAMES_BN: { [key: number]: string } = {
  1: 'আল-ফাতিহা', 2: 'আল-বাকারা', 3: 'আলি ইমরান', 4: 'আন-নিসা', 5: 'আল-মায়িদা',
  6: 'আল-আনআম', 7: 'আল-আরাফ', 8: 'আল-আনফাল', 9: 'আত-তাওবা', 10: 'ইউনুস',
  11: 'হুদ', 12: 'ইউসুফ', 13: 'আর-রাদ', 14: 'ইবরাহীম', 15: 'আল-হিজর',
  16: 'আন-নাহল', 17: 'আল-ইসরা', 18: 'আল-কাহফ', 19: 'মারইয়াম', 20: 'তা-হা',
  21: 'আল-আম্বিয়া', 22: 'আল-হজ্জ', 23: 'আল-মুমিনুন', 24: 'আন-নূর', 25: 'আল-ফুরকান',
  26: 'আশ-শুআরা', 27: 'আন-নামল', 28: 'আল-কাসাস', 29: 'আল-আনকাবুত', 30: 'আর-রূম',
  31: 'লুকমান', 32: 'আস-সাজদা', 33: 'আল-আহযাব', 34: 'সাবা', 35: 'ফাতির',
  36: 'ইয়া-সীন', 37: 'আস-সাফফাত', 38: 'সাদ', 39: 'আয-যুমার', 40: 'গাফির',
  41: 'ফুসসিলাত', 42: 'আশ-শূরা', 43: 'আয-যুখরুফ', 44: 'আদ-দুখান', 45: 'আল-জাসিয়া',
  46: 'আল-আহকাফ', 47: 'মুহাম্মদ', 48: 'আল-ফাতহ', 49: 'আল-হুজুরাত', 50: 'কাফ',
  51: 'আয-যারিয়াত', 52: 'আত-তূর', 53: 'আন-নাজম', 54: 'আল-কামার', 55: 'আর-রাহমান',
  56: 'আল-ওয়াকিআ', 57: 'আল-হাদীদ', 58: 'আল-মুজাদালা', 59: 'আল-হাশর', 60: 'আল-মুমতাহিনা',
  61: 'আস-সাফ', 62: 'আল-জুমুআ', 63: 'আল-মুনাফিকুন', 64: 'আত-তাগাবুন', 65: 'আত-তালাক',
  66: 'আত-তাহরীম', 67: 'আল-মুলক', 68: 'আল-কলম', 69: 'আল-হাক্কা', 70: 'আল-মাআরিজ',
  71: 'নূহ', 72: 'আল-জিন', 73: 'আল-মুযযাম্মিল', 74: 'আল-মুদ্দাসসির', 75: 'আল-কিয়ামা',
  76: 'আল-ইনসান', 77: 'আল-মুরসালাত', 78: 'আন-নাবা', 79: 'আন-নাযিআত', 80: 'আবাসা',
  81: 'আত-তাকভীর', 82: 'আল-ইনফিতার', 83: 'আল-মুতাফফিফীন', 84: 'আল-ইনশিকাক', 85: 'আল-বুরূজ',
  86: 'আত-তারিক', 87: 'আল-আলা', 88: 'আল-গাশিয়া', 89: 'আল-ফাজর', 90: 'আল-বালাদ',
  91: 'আশ-শামস', 92: 'আল-লাইল', 93: 'আদ-দুহা', 94: 'আশ-শারহ', 95: 'আত-তীন',
  96: 'আল-আলাক', 97: 'আল-কাদর', 98: 'আল-বাইয়িনা', 99: 'আয-যালযালা', 100: 'আল-আদিয়াত',
  101: 'আল-কারিআ', 102: 'আত-তাকাসুর', 103: 'আল-আসর', 104: 'আল-হুমাযা', 105: 'আল-ফীল',
  106: 'কুরাইশ', 107: 'আল-মাউন', 108: 'আল-কাওসার', 109: 'আল-কাফিরুন', 110: 'আন-নাসর',
  111: 'আল-মাসাদ', 112: 'আল-ইখলাস', 113: 'আল-ফালাক', 114: 'আন-নাস',
};

export const SURAH_NAMES_RU: { [key: number]: string } = {
  1: 'Аль-Фатиха', 2: 'Аль-Бакара', 3: 'Али Имран', 4: 'Ан-Ниса', 5: 'Аль-Маида',
  6: 'Аль-Анам', 7: 'Аль-Араф', 8: 'Аль-Анфаль', 9: 'Ат-Тауба', 10: 'Юнус',
  11: 'Худ', 12: 'Юсуф', 13: 'Ар-Раад', 14: 'Ибрахим', 15: 'Аль-Хиджр',
  16: 'Ан-Нахль', 17: 'Аль-Исра', 18: 'Аль-Кахф', 19: 'Марьям', 20: 'Та Ха',
  21: 'Аль-Анбия', 22: 'Аль-Хадж', 23: 'Аль-Муминун', 24: 'Ан-Нур', 25: 'Аль-Фуркан',
  26: 'Аш-Шуара', 27: 'Ан-Намль', 28: 'Аль-Касас', 29: 'Аль-Анкабут', 30: 'Ар-Рум',
  31: 'Лукман', 32: 'Ас-Саджда', 33: 'Аль-Ахзаб', 34: 'Саба', 35: 'Фатыр',
  36: 'Ясин', 37: 'Ас-Саффат', 38: 'Сад', 39: 'Аз-Зумар', 40: 'Гафир',
  41: 'Фуссилят', 42: 'Аш-Шура', 43: 'Аз-Зухруф', 44: 'Ад-Духан', 45: 'Аль-Джасия',
  46: 'Аль-Ахкаф', 47: 'Мухаммад', 48: 'Аль-Фатх', 49: 'Аль-Худжурат', 50: 'Каф',
  51: 'Аз-Зарият', 52: 'Ат-Тур', 53: 'Ан-Наджм', 54: 'Аль-Камар', 55: 'Ар-Рахман',
  56: 'Аль-Вакиа', 57: 'Аль-Хадид', 58: 'Аль-Муджадила', 59: 'Аль-Хашр', 60: 'Аль-Мумтахана',
  61: 'Ас-Сафф', 62: 'Аль-Джумуа', 63: 'Аль-Мунафикун', 64: 'Ат-Тагабун', 65: 'Ат-Талак',
  66: 'Ат-Тахрим', 67: 'Аль-Мульк', 68: 'Аль-Калям', 69: 'Аль-Хакка', 70: 'Аль-Маариж',
  71: 'Нух', 72: 'Аль-Джинн', 73: 'Аль-Муззаммиль', 74: 'Аль-Муддассир', 75: 'Аль-Кияма',
  76: 'Аль-Инсан', 77: 'Аль-Мурсалят', 78: 'Ан-Наба', 79: 'Ан-Назиат', 80: 'Абаса',
  81: 'Ат-Таквир', 82: 'Аль-Инфитар', 83: 'Аль-Мутаффифин', 84: 'Аль-Иншикак', 85: 'Аль-Бурудж',
  86: 'Ат-Тарик', 87: 'Аль-Аля', 88: 'Аль-Гашия', 89: 'Аль-Фаджр', 90: 'Аль-Балад',
  91: 'Аш-Шамс', 92: 'Аль-Лайль', 93: 'Ад-Духа', 94: 'Аш-Шарх', 95: 'Ат-Тин',
  96: 'Аль-Алак', 97: 'Аль-Кадр', 98: 'Аль-Баййина', 99: 'Аз-Зальзаля', 100: 'Аль-Адият',
  101: 'Аль-Кариа', 102: 'Ат-Такасур', 103: 'Аль-Аср', 104: 'Аль-Хумаза', 105: 'Аль-Филь',
  106: 'Курайш', 107: 'Аль-Маун', 108: 'Аль-Каусар', 109: 'Аль-Кяфирун', 110: 'Ан-Наср',
  111: 'Аль-Масад', 112: 'Аль-Ихлас', 113: 'Аль-Фаляк', 114: 'Ан-Нас',
};

// ============================================
// خريطة اللغات → أسماء السور
// ============================================

const SURAH_NAMES_MAP: { [lang: string]: { [key: number]: string } } = {
  ar: SURAH_NAMES_AR,
  en: SURAH_NAMES_EN,
  fr: SURAH_NAMES_FR,
  tr: SURAH_NAMES_TR,
  ur: SURAH_NAMES_UR,
  hi: SURAH_NAMES_HI,
  bn: SURAH_NAMES_BN,
  ru: SURAH_NAMES_RU,
  // de, es, id, ms — تستخدم الأسماء الإنجليزية كأساس مشترك
  de: SURAH_NAMES_EN,
  es: SURAH_NAMES_EN,
  id: SURAH_NAMES_EN,
  ms: SURAH_NAMES_EN,
};

// ============================================
// مساعدات
// ============================================

export function getSurahNameAr(surahNumber: number): string {
  return SURAH_NAMES_AR[surahNumber] || `سورة ${surahNumber}`;
}

/**
 * Get surah name in the current app language.
 * Falls back: current language → English → Arabic.
 */
export function getSurahName(surahNumber: number): string {
  const lang = getLanguage();
  const names = SURAH_NAMES_MAP[lang];
  if (names && names[surahNumber]) return names[surahNumber];
  if (SURAH_NAMES_EN[surahNumber]) return SURAH_NAMES_EN[surahNumber];
  return SURAH_NAMES_AR[surahNumber] || `Surah ${surahNumber}`;
}

export function getJuzName(juzNumber: number): string {
  return `${t('quran.juz')} ${juzNumber}`;
}

export function formatAyahReference(surahNumber: number, ayahNumber: number): string {
  return `${getSurahName(surahNumber)} - ${t('quran.ayah')} ${ayahNumber}`;
}
