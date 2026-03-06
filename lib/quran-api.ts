// ============================================
// API القرآن الكريم
// ============================================

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
  { id: 'ar.alafasy', name: 'Mishary Alafasy', nameAr: 'مشاري العفاسي', bitrate: 128 },
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit (Murattal)', nameAr: 'عبد الباسط عبد الصمد - مرتل', bitrate: 128 },
  { id: 'ar.abdulsamad', name: 'Abdul Samad', nameAr: 'عبد الباسط عبد الصمد - مجود', bitrate: 64 },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', nameAr: 'محمود خليل الحصري', bitrate: 128 },
  { id: 'ar.husarymujawwad', name: 'Al-Husary (Mujawwad)', nameAr: 'الحصري - مجود', bitrate: 128 },
  { id: 'ar.minshawi', name: 'Mohamed Siddiq Al-Minshawi', nameAr: 'محمد صديق المنشاوي', bitrate: 128 },
  { id: 'ar.minshawimujawwad', name: 'Al-Minshawi (Mujawwad)', nameAr: 'المنشاوي - مجود', bitrate: 64 },
  { id: 'ar.ahmedajamy', name: 'Ahmed Al-Ajamy', nameAr: 'أحمد العجمي', bitrate: 128 },
  { id: 'ar.muhammadayyoub', name: 'Muhammad Ayyoub', nameAr: 'محمد أيوب', bitrate: 128 },
  { id: 'ar.muhammadjibreel', name: 'Muhammad Jibreel', nameAr: 'محمد جبريل', bitrate: 128 },
  { id: 'ar.maaborimatar', name: 'Maher Al Muaiqly', nameAr: 'ماهر المعيقلي', bitrate: 128 },
  { id: 'ar.saaborimatar', name: 'Saud Al-Shuraim', nameAr: 'سعود الشريم', bitrate: 128 },
  { id: 'ar.abduraborimatar', name: 'Abdurrahman As-Sudais', nameAr: 'عبدالرحمن السديس', bitrate: 128 },
  { id: 'ar.haborimatar', name: 'Hani Ar-Rifai', nameAr: 'هاني الرفاعي', bitrate: 128 },
  { id: 'ar.abdullahbasfar', name: 'Abdullah Basfar', nameAr: 'عبدالله بصفر', bitrate: 128 },
  { id: 'ar.ibrahimakhbar', name: 'Ibrahim Al-Akhdar', nameAr: 'إبراهيم الأخضر', bitrate: 128 },
  { id: 'ar.shaaborimatar', name: 'Abu Bakr Al-Shatri', nameAr: 'أبو بكر الشاطري', bitrate: 128 },
  { id: 'ar.parhizgar', name: 'Nasser Al-Qatami', nameAr: 'ناصر القطامي', bitrate: 128 },
  { id: 'ar.aaborimatar', name: 'Yasser Al-Dosari', nameAr: 'ياسر الدوسري', bitrate: 128 },
  { id: 'ar.abdulbarimatar', name: 'Saad Al-Ghamdi', nameAr: 'سعد الغامدي', bitrate: 128 },
  { id: 'ar.akaborimatar', name: 'Ahmed Al-Hudhaify', nameAr: 'أحمد الحذيفي', bitrate: 128 },
  { id: 'ar.abdulrahmanalsudais', name: 'Ali Al-Huthaify', nameAr: 'علي الحذيفي', bitrate: 128 },
  { id: 'ar.bandarbalila', name: 'Bandar Baleela', nameAr: 'بندر بليلة', bitrate: 128 },
  { id: 'ar.faborimatar', name: 'Fares Abbad', nameAr: 'فارس عباد', bitrate: 128 },
  { id: 'ar.khalifatulttaniji', name: 'Khalifa Al-Tunaiji', nameAr: 'خليفة الطنيجي', bitrate: 128 },
  { id: 'ar.mahmoudalielbanna', name: 'Mahmoud Ali Al-Banna', nameAr: 'محمود علي البنا', bitrate: 128 },
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
  language: string;
}

export const TAFSIR_EDITIONS: TafsirEdition[] = [
  { identifier: 'ar.muyassar', name: 'التفسير الميسر', language: 'ar' },
  { identifier: 'ar.jalalayn', name: 'تفسير الجلالين', language: 'ar' },
  { identifier: 'ar.ibnkathir', name: 'تفسير ابن كثير', language: 'ar' },
  { identifier: 'ar.qurtubi', name: 'تفسير القرطبي', language: 'ar' },
  { identifier: 'ar.tabari', name: 'تفسير الطبري', language: 'ar' },
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
  try {
    const [arabicRes, tafsirRes] = await Promise.all([
      fetch(`${QURAN_API_BASE}/ayah/${surahNumber}:${ayahNumber}`),
      fetch(`${QURAN_API_BASE}/ayah/${surahNumber}:${ayahNumber}/${edition}`),
    ]);

    const arabicData = await arabicRes.json();
    const tafsirData = await tafsirRes.json();

    return {
      arabicText: arabicData.code === 200 ? arabicData.data.text : '',
      tafsirText: tafsirData.code === 200 ? tafsirData.data.text : 'تعذر تحميل التفسير',
    };
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
  // حساب رقم الآية الكلي
  const ayahKey = `${surahNumber}:${ayahNumber}`;
  return `${QURAN_AUDIO_BASE}/${bitrate}/${reciterId}/${ayahKey}.mp3`;
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
// مساعدات
// ============================================

export function getSurahNameAr(surahNumber: number): string {
  return SURAH_NAMES_AR[surahNumber] || `سورة ${surahNumber}`;
}

export function getJuzName(juzNumber: number): string {
  return `الجزء ${juzNumber}`;
}

export function formatAyahReference(surahNumber: number, ayahNumber: number): string {
  return `${getSurahNameAr(surahNumber)} - آية ${ayahNumber}`;
}
