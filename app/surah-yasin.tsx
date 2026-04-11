/**
 * سورة يس — Surah Yasin dedicated reading view
 */

import React from 'react';
import SurahReadingScreen from '@/components/SurahReadingScreen';

export default function SurahYasinScreen() {
  return (
    <SurahReadingScreen
      surahNumber={36}
      titleKey="home.surahYasin"
      virtueTitle={{
        ar: 'فضل سورة يس',
        en: 'Virtue of Surah Yasin',
      }}
      virtueText={{
        ar: 'عن معقل بن يسار رضي الله عنه أن النبي ﷺ قال: «اقرؤوا يس على موتاكم». رواه أبو داود وابن ماجه.\n\nوعن أنس رضي الله عنه قال: قال رسول الله ﷺ: «إن لكل شيء قلبًا، وقلب القرآن يس». رواه الترمذي.\n\nوقد سُميت بقلب القرآن لما تضمنته من أصول العقيدة والإيمان بالبعث والجزاء.',
        en: 'Ma\'qil ibn Yasar reported that the Prophet ﷺ said: "Recite Yasin over your dying." (Abu Dawud, Ibn Majah)\n\nAnas reported that the Messenger of Allah ﷺ said: "Everything has a heart, and the heart of the Quran is Yasin." (At-Tirmidhi)\n\nIt is called the Heart of the Quran for the fundamental beliefs it contains about faith, resurrection, and divine recompense.',
      }}
    />
  );
}
