// admin-panel/src/data/adhkar-defaults.ts
// Default tasbih presets and sample daily dhikr/duas for "Import Defaults"

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
  return [
    { id: 'tasbih_default_1', text: 'سُبْحَانَ اللهِ', transliteration: 'Subhan Allah', target: 33, source: 'hadith_sahih', virtue: 'كلمة خفيفة على اللسان ثقيلة في الميزان', reference: 'البخاري ومسلم', order: 0 },
    { id: 'tasbih_default_2', text: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', target: 33, source: 'hadith_sahih', virtue: 'تملأ الميزان', reference: 'مسلم', order: 1 },
    { id: 'tasbih_default_3', text: 'اللهُ أَكْبَرُ', transliteration: 'Allahu Akbar', target: 33, source: 'hadith_sahih', virtue: 'من قالها دبر كل صلاة لم يخب', reference: 'مسلم', order: 2 },
    { id: 'tasbih_default_4', text: 'لَا إِلَهَ إِلَّا اللهُ', transliteration: 'La ilaha illa Allah', target: 100, source: 'hadith_sahih', virtue: 'أفضل ما قلت أنا والنبيون من قبلي', reference: 'الترمذي', order: 3 },
    { id: 'tasbih_default_5', text: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', transliteration: 'La ilaha illa Allahu wahdahu la sharika lah, lahul mulku wa lahul hamdu wa huwa ala kulli shayin qadir', target: 100, source: 'hadith_sahih', virtue: 'من قالها في يوم مائة مرة كانت له عدل عشر رقاب', reference: 'البخاري ومسلم', order: 4 },
    { id: 'tasbih_default_6', text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', transliteration: 'Subhan Allahi wa bihamdih', target: 100, source: 'hadith_sahih', virtue: 'من قالها في يوم مائة مرة حُطت خطاياه وإن كانت مثل زبد البحر', reference: 'البخاري ومسلم', order: 5 },
    { id: 'tasbih_default_7', text: 'سُبْحَانَ اللهِ الْعَظِيمِ وَبِحَمْدِهِ', transliteration: 'Subhan Allahil Azeem wa bihamdih', target: 100, source: 'hadith_sahih', virtue: 'كلمتان حبيبتان إلى الرحمن ثقيلتان في الميزان', reference: 'البخاري ومسلم', order: 6 },
    { id: 'tasbih_default_8', text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ', transliteration: 'La hawla wa la quwwata illa billah', target: 100, source: 'hadith_sahih', virtue: 'كنز من كنوز الجنة', reference: 'البخاري ومسلم', order: 7 },
    { id: 'tasbih_default_9', text: 'أَسْتَغْفِرُ اللهَ', transliteration: 'Astaghfirullah', target: 100, source: 'hadith_sahih', virtue: 'من لزم الاستغفار جعل الله له من كل ضيق مخرجاً', reference: 'أبو داود', order: 8 },
    { id: 'tasbih_default_10', text: 'أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ', transliteration: 'Astaghfirullaha al-Azeem alladhi la ilaha illa huwal Hayyul Qayyumu wa atubu ilayh', target: 3, source: 'hadith_hasan', virtue: 'غُفرت ذنوبه وإن كان فارًّا من الزحف', reference: 'أبو داود والترمذي', order: 9 },
    { id: 'tasbih_default_11', text: 'سُبْحَانَ اللهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ', transliteration: 'Subhan Allah, wal hamdulillah, wa la ilaha illa Allah, wallahu Akbar', target: 100, source: 'hadith_sahih', virtue: 'أحب الكلام إلى الله', reference: 'مسلم', order: 10 },
    { id: 'tasbih_default_12', text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', transliteration: 'Allahumma salli wa sallim ala nabiyyina Muhammad', target: 100, source: 'hadith_sahih', virtue: 'من صلى عليّ صلاة واحدة صلى الله عليه بها عشرًا', reference: 'مسلم', order: 11 },
    { id: 'tasbih_default_13', text: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ', transliteration: 'Rabbi ighfir li wa tub alayya innaka antat-Tawwabur-Rahim', target: 100, source: 'hadith_sahih', virtue: 'كان النبي ﷺ يقولها في المجلس الواحد مائة مرة', reference: 'أبو داود والترمذي', order: 12 },
    { id: 'tasbih_default_14', text: 'سُبُّوحٌ قُدُّوسٌ رَبُّ الْمَلَائِكَةِ وَالرُّوحِ', transliteration: 'Subbuhun Quddusun Rabbul malaikati war-ruh', target: 33, source: 'hadith_sahih', virtue: 'من أذكار الركوع والسجود', reference: 'مسلم', order: 13 },
    { id: 'tasbih_default_15', text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ', transliteration: 'Ya Hayyu Ya Qayyum bi rahmatika astaghith', target: 7, source: 'hadith_hasan', virtue: 'أصلح الله له شأنه كله', reference: 'الحاكم', order: 14 },
  ];
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
