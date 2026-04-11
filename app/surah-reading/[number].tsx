/**
 * Dynamic Surah Reading Page
 * Displays any surah in the same style as Al-Kahf, Yasin, and Al-Mulk pages.
 * Uses the shared SurahReadingScreen component.
 */

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import SurahReadingScreen from '@/components/SurahReadingScreen';
import { getSurahName } from '@/lib/quran-api';
import { t } from '@/lib/i18n';

// Virtue texts for common surahs (fallback for surahs without specific virtues)
const SURAH_VIRTUES: Record<number, { ar: string; en: string }> = {
  1: {
    ar: 'سورة الفاتحة أم القرآن وأعظم سورة فيه، لا تصح صلاة بدونها.',
    en: 'Al-Fatiha is the mother of the Quran and the greatest surah. No prayer is valid without it.',
  },
  2: {
    ar: 'اقرؤوا سورة البقرة، فإن أخذها بركة، وتركها حسرة، ولا تستطيعها البطلة.',
    en: 'Read Surah Al-Baqarah, for taking it is a blessing and leaving it is a regret.',
  },
  18: {
    ar: 'من قرأ سورة الكهف يوم الجمعة أضاء له من النور ما بين الجمعتين.',
    en: 'Whoever reads Surah Al-Kahf on Friday will have light between the two Fridays.',
  },
  32: {
    ar: 'كان النبي ﷺ لا ينام حتى يقرأ "الم تنزيل" السجدة وتبارك الذي بيده الملك.',
    en: 'The Prophet ﷺ would not sleep until he read Alif Lam Mim As-Sajdah and Al-Mulk.',
  },
  36: {
    ar: 'إن لكل شيء قلباً، وقلب القرآن يس. من قرأها كتب له قراءة القرآن عشر مرات.',
    en: 'Everything has a heart, and the heart of the Quran is Yasin.',
  },
  55: {
    ar: 'سورة الرحمن عروس القرآن.',
    en: 'Ar-Rahman is the bride of the Quran.',
  },
  56: {
    ar: 'من قرأ سورة الواقعة كل ليلة لم تصبه فاقة أبداً.',
    en: 'Whoever reads Surah Al-Waqiah every night will never be afflicted by poverty.',
  },
  67: {
    ar: 'سورة الملك هي المانعة من عذاب القبر، تشفع لصاحبها حتى يُغفر له.',
    en: 'Surah Al-Mulk protects from the punishment of the grave and intercedes for its reader.',
  },
  112: {
    ar: 'قل هو الله أحد تعدل ثلث القرآن.',
    en: 'Qul Huwa Allahu Ahad equals one-third of the Quran.',
  },
  113: {
    ar: 'المعوذتان: لم ير مثلهن.',
    en: 'The Mu\'awwidhatayn: Nothing like them has been seen.',
  },
  114: {
    ar: 'المعوذتان: لم ير مثلهن.',
    en: 'The Mu\'awwidhatayn: Nothing like them has been seen.',
  },
};

// Default virtue for surahs without specific text
const DEFAULT_VIRTUE = {
  ar: 'فضل تلاوة القرآن الكريم عظيم، وكل حرف بحسنة والحسنة بعشر أمثالها.',
  en: 'The virtue of reciting the Quran is immense. Each letter earns a good deed, and each good deed is multiplied by ten.',
};

export default function DynamicSurahReadingPage() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const surahNumber = parseInt(number || '1', 10);
  
  // Validate surah number
  if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return null;
  }

  const surahName = getSurahName(surahNumber);
  const virtue = SURAH_VIRTUES[surahNumber] || DEFAULT_VIRTUE;

  // Use surah name directly as title key won't work - need a dynamic approach
  // We'll use a special format that SurahReadingScreen can handle
  return (
    <SurahReadingScreen
      surahNumber={surahNumber}
      titleKey={`__surah__${surahNumber}`}
      virtueTitle={{
        ar: `فضل سورة ${surahName}`,
        en: `Virtue of ${surahName}`,
      }}
      virtueText={virtue}
    />
  );
}
