/**
 * Quran Evidence Translation
 * 
 * Parses Quranic evidence text like ﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ﴾ [البقرة: 255]
 * and fetches the proper translated verse from alquran.cloud API
 * instead of using generic translation APIs which mangle Quranic text.
 */

import { useState, useEffect } from 'react';
import { getLanguage } from './i18n';
import { getDefaultTranslationForLanguage } from './quran-api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transliterateReference } from './source-transliteration';

// Arabic surah name → number mapping
const SURAH_NAME_TO_NUMBER: Record<string, number> = {
  'الفاتحة': 1, 'البقرة': 2, 'آل عمران': 3, 'النساء': 4, 'المائدة': 5,
  'الأنعام': 6, 'الأعراف': 7, 'الأنفال': 8, 'التوبة': 9, 'يونس': 10,
  'هود': 11, 'يوسف': 12, 'الرعد': 13, 'إبراهيم': 14, 'الحجر': 15,
  'النحل': 16, 'الإسراء': 17, 'الكهف': 18, 'مريم': 19, 'طه': 20,
  'الأنبياء': 21, 'الحج': 22, 'المؤمنون': 23, 'النور': 24, 'الفرقان': 25,
  'الشعراء': 26, 'النمل': 27, 'القصص': 28, 'العنكبوت': 29, 'الروم': 30,
  'لقمان': 31, 'السجدة': 32, 'الأحزاب': 33, 'سبأ': 34, 'فاطر': 35,
  'يس': 36, 'الصافات': 37, 'ص': 38, 'الزمر': 39, 'غافر': 40,
  'فصلت': 41, 'الشورى': 42, 'الزخرف': 43, 'الدخان': 44, 'الجاثية': 45,
  'الأحقاف': 46, 'محمد': 47, 'الفتح': 48, 'الحجرات': 49, 'ق': 50,
  'الذاريات': 51, 'الطور': 52, 'النجم': 53, 'القمر': 54, 'الرحمن': 55,
  'الواقعة': 56, 'الحديد': 57, 'المجادلة': 58, 'الحشر': 59, 'الممتحنة': 60,
  'الصف': 61, 'الجمعة': 62, 'المنافقون': 63, 'التغابن': 64, 'الطلاق': 65,
  'التحريم': 66, 'الملك': 67, 'القلم': 68, 'الحاقة': 69, 'المعارج': 70,
  'نوح': 71, 'الجن': 72, 'المزمل': 73, 'المدثر': 74, 'القيامة': 75,
  'الإنسان': 76, 'المرسلات': 77, 'النبأ': 78, 'النازعات': 79, 'عبس': 80,
  'التكوير': 81, 'الانفطار': 82, 'المطففين': 83, 'الانشقاق': 84, 'البروج': 85,
  'الطارق': 86, 'الأعلى': 87, 'الغاشية': 88, 'الفجر': 89, 'البلد': 90,
  'الشمس': 91, 'الليل': 92, 'الضحى': 93, 'الشرح': 94, 'التين': 95,
  'العلق': 96, 'القدر': 97, 'البينة': 98, 'الزلزلة': 99, 'العاديات': 100,
  'القارعة': 101, 'التكاثر': 102, 'العصر': 103, 'الهمزة': 104, 'الفيل': 105,
  'قريش': 106, 'الماعون': 107, 'الكوثر': 108, 'الكافرون': 109, 'النصر': 110,
  'المسد': 111, 'الإخلاص': 112, 'الفلق': 113, 'الناس': 114,
};

// Surah number → English transliteration
const SURAH_ENGLISH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Aal-Imran', 4: 'An-Nisa', 5: 'Al-Ma\'idah',
  6: 'Al-An\'am', 7: 'Al-A\'raf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Ra\'d', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Mu\'minun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shu\'ara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqi\'ah', 57: 'Al-Hadid', 58: 'Al-Mujadilah', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saff', 62: 'Al-Jumu\'ah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Ma\'arij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Nazi\'at', 80: 'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-A\'la', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
  101: 'Al-Qari\'ah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Ma\'un', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas',
};

interface QuranRef {
  surahNumber: number;
  ayahNumber: number;
  surahNameAr: string;
}

/**
 * Parse a Quran reference from evidence text.
 * Handles formats like [البقرة: 255] or [طه: 5]
 */
function parseQuranReference(evidence: string): QuranRef | null {
  // Match [سورة: آية] pattern — Arabic brackets with number
  const match = evidence.match(/\[([^\]:]+):\s*(\d+)\]/);
  if (!match) return null;

  const surahName = match[1].trim();
  const ayahNumber = parseInt(match[2], 10);

  const surahNumber = SURAH_NAME_TO_NUMBER[surahName];
  if (!surahNumber || isNaN(ayahNumber)) return null;

  return { surahNumber, ayahNumber, surahNameAr: surahName };
}

/** Check if evidence contains a Quran verse (has ornamental brackets) */
function isQuranEvidence(evidence: string): boolean {
  return evidence.includes('﴿') || evidence.includes('﴾');
}

const evidenceCache = new Map<string, string>();

/**
 * Fetch translated verse from alquran.cloud API.
 * Uses the same API and edition mapping as daily-ayah and ayat-universe.
 */
async function fetchTranslatedVerse(
  surahNumber: number,
  ayahNumber: number,
  language: string,
): Promise<string | null> {
  const cacheKey = `${surahNumber}:${ayahNumber}:${language}`;
  if (evidenceCache.has(cacheKey)) return evidenceCache.get(cacheKey)!;

  // Check AsyncStorage for persistent cache
  const storageKey = `@quran_evidence:${cacheKey}`;
  try {
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) {
      evidenceCache.set(cacheKey, stored);
      return stored;
    }
  } catch { /* ignore */ }

  const edition = getDefaultTranslationForLanguage(language);
  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/${edition}`,
    );
    const data = await res.json();
    if (data.code === 200 && data.data?.text) {
      const text = data.data.text;
      evidenceCache.set(cacheKey, text);
      try { await AsyncStorage.setItem(storageKey, text); } catch { /* ignore */ }
      return text;
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * Hook to get translated evidence text for Names of Allah
 * Returns the translated text or the original evidence for Arabic users.
 */
export function useQuranEvidence(evidence: string | undefined): string {
  const language = getLanguage();
  const isArabic = language === 'ar';
  const [translated, setTranslated] = useState(evidence || '');

  useEffect(() => {
    if (!evidence || isArabic) {
      setTranslated(evidence || '');
      return;
    }

    // For non-Quranic evidence (no ﴿ ﴾), use transliteration
    if (!isQuranEvidence(evidence)) {
      setTranslated(transliterateReference(evidence, language));
      return;
    }

    const ref = parseQuranReference(evidence);
    if (!ref) {
      // Can't parse reference — use transliteration for the reference part
      setTranslated(transliterateReference(evidence, language));
      return;
    }

    let cancelled = false;

    fetchTranslatedVerse(ref.surahNumber, ref.ayahNumber, language).then(verse => {
      if (cancelled) return;
      if (verse) {
        const surahEn = SURAH_ENGLISH_NAMES[ref.surahNumber] || ref.surahNameAr;
        setTranslated(`"${verse}" [${surahEn}: ${ref.ayahNumber}]`);
      } else {
        // API failed — show original with transliterated reference
        setTranslated(transliterateReference(evidence, language));
      }
    });

    return () => { cancelled = true; };
  }, [evidence, language, isArabic]);

  return translated;
}

/** Convert Arabic numerals to Western numerals */
export function toWesternNumerals(text: string): string {
  return text
    .replace(/٠/g, '0').replace(/١/g, '1').replace(/٢/g, '2')
    .replace(/٣/g, '3').replace(/٤/g, '4').replace(/٥/g, '5')
    .replace(/٦/g, '6').replace(/٧/g, '7').replace(/٨/g, '8')
    .replace(/٩/g, '9');
}

/**
 * Get the English surah name for a given surah number 
 */
export function getSurahEnglishName(surahNumber: number): string {
  return SURAH_ENGLISH_NAMES[surahNumber] || '';
}
