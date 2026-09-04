// admin-panel/src/data/adhkar-defaults.ts
// Default tasbih presets and sample daily dhikr/duas for "Import Defaults"

import { getDefaultTasbihPresetsForAdmin } from '../../../lib/tasbih-presets';

export interface DefaultTasbihPreset {
  id: string;
  text: string;
  transliteration: string;
  target: number;
  source: 'quran' | 'hadith_sahih' | 'hadith_hasan' | 'athar';
  virtue?: string;
  reference?: string;
  order: number;
}

export interface DefaultDailyDhikr {
  arabic: string;
  reference: string;
  benefit: string;
}

export interface DefaultDua {
  arabic: string;
  translation: string;
  reference: string;
  source: string;
}

export function getDefaultTasbihPresets(): DefaultTasbihPreset[] {
  return getDefaultTasbihPresetsForAdmin();
}

export function getDefaultDailyDhikr(): DefaultDailyDhikr[] {
  return [
    { arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', reference: 'أبو داود والترمذي', benefit: 'من قالها ثلاث مرات لم تصبه فجأة بلاء' },
    { arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', reference: 'مسلم', benefit: 'لم يضره شيء حتى يرتحل من منزله' },
    { arabic: 'رَضِيتُ بِاللَّهِ رَبًّا وَبِالْإِسْلَامِ دِينًا وَبِمُحَمَّدٍ ﷺ نَبِيًّا', reference: 'أبو داود', benefit: 'كان حقاً على الله أن يرضيه يوم القيامة' },
    { arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ', reference: 'مسلم', benefit: 'أفضل من ذكر عامة الليل' },
    { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', reference: 'ابن ماجه', benefit: 'ما سئل شيء أعظم من العافية' },
    { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ', reference: 'البخاري', benefit: 'كان النبي ﷺ يكثر من هذا الدعاء' },
    { arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ', reference: 'أبو داود', benefit: 'من قالها سبع مرات كفاه الله ما أهمه' },
    { arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', reference: 'أبو داود والنسائي', benefit: 'أوصى بها النبي ﷺ معاذ بن جبل' },
  ];
}

export function getDefaultDuas(): DefaultDua[] {
  return [
    { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', translation: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.', reference: 'البقرة: 201', source: 'القرآن الكريم' },
    { arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً إِنَّكَ أَنتَ الْوَهَّابُ', translation: 'Our Lord, do not let our hearts deviate after You have guided us, and grant us mercy from You.', reference: 'آل عمران: 8', source: 'القرآن الكريم' },
    { arabic: 'رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ', translation: 'Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will be among the losers.', reference: 'الأعراف: 23', source: 'القرآن الكريم' },
    { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى', translation: 'O Allah, I ask You for guidance, piety, chastity, and self-sufficiency.', reference: 'مسلم', source: 'حديث صحيح' },
    { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا', translation: 'O Allah, I ask You for beneficial knowledge, good provision, and accepted deeds.', reference: 'ابن ماجه', source: 'حديث صحيح' },
    { arabic: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ', translation: 'O Turner of hearts, keep my heart firm on Your religion.', reference: 'الترمذي', source: 'حديث صحيح' },
    { arabic: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ', translation: 'O Allah, suffice me with what is lawful instead of what is unlawful, and enrich me by Your bounty from all besides You.', reference: 'الترمذي', source: 'حديث حسن' },
    { arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا', translation: 'O Allah, nothing is easy except what You make easy, and You can make what is difficult easy if You wish.', reference: 'ابن حبان', source: 'حديث صحيح' },
    { arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', translation: 'My Lord, expand my chest and ease my task for me.', reference: 'طه: 25-26', source: 'القرآن الكريم' },
    { arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا', translation: 'Our Lord, grant us from among our spouses and offspring comfort to our eyes, and make us leaders for the righteous.', reference: 'الفرقان: 74', source: 'القرآن الكريم' },
  ];
}
