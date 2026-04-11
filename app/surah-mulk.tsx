/**
 * سورة الملك — Surah Al-Mulk dedicated reading view
 */

import React from 'react';
import SurahReadingScreen from '@/components/SurahReadingScreen';

export default function SurahMulkScreen() {
  return (
    <SurahReadingScreen
      surahNumber={67}
      titleKey="home.surahMulk"
      virtueTitle={{
        ar: 'فضل سورة الملك',
        en: 'Virtue of Surah Al-Mulk',
      }}
      virtueText={{
        ar: 'عن أبي هريرة رضي الله عنه عن النبي ﷺ قال: «إن سورة من القرآن ثلاثون آية شفعت لرجل حتى غُفر له، وهي: تبارك الذي بيده الملك». رواه أبو داود والترمذي وحسّنه.\n\nوعن ابن عباس رضي الله عنهما قال: ضرب بعض أصحاب النبي ﷺ خباءه على قبر وهو لا يحسب أنه قبر، فإذا فيه إنسان يقرأ سورة تبارك الذي بيده الملك حتى ختمها، فأتى النبي ﷺ فقال: «هي المانعة، هي المنجية، تنجيه من عذاب القبر». رواه الترمذي.',
        en: 'Abu Hurairah reported that the Prophet ﷺ said: "Indeed, there is a surah in the Quran of thirty verses that interceded for a man until he was forgiven. It is: Blessed is He in Whose Hand is the dominion (Al-Mulk)." (Abu Dawud, At-Tirmidhi — graded Hasan)\n\nIbn Abbas reported that one of the Prophet\'s companions pitched his tent over a grave without realizing it, and heard a man reciting Surah Al-Mulk to its end. He told the Prophet ﷺ, who said: "It is the Preventer, it is the Deliverer — it delivers from the punishment of the grave." (At-Tirmidhi)',
      }}
    />
  );
}
