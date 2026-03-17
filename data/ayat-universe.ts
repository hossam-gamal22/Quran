// آيات عظمة الله — الآيات الكونية التي تدل على عظمة الخالق

export interface CosmicVerse {
  id: number;
  arabic: string;
  surah: string;
  surahNumber: number;
  ayahNumber: number;
  reference: string;
  theme: string;
}

export const COSMIC_VERSE_THEMES = [
  { id: 'creation', label: 'الخلق والتكوين', icon: 'creation', color: '#3a7ca5' },
  { id: 'sky', label: 'السماوات والأرض', icon: 'weather-night', color: '#5d4e8c' },
  { id: 'nature', label: 'الطبيعة والماء', icon: 'water', color: '#0D9488' },
  { id: 'human', label: 'خلق الإنسان', icon: 'account', color: '#c17f59' },
  { id: 'power', label: 'القدرة والملك', icon: 'crown', color: '#DAA520' },
];

export const COSMIC_VERSES: CosmicVerse[] = [
  // الخلق والتكوين
  {
    id: 1,
    arabic: 'إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِّأُولِي الْأَلْبَابِ',
    surah: 'آل عمران',
    surahNumber: 3,
    ayahNumber: 190,
    reference: 'آل عمران: ١٩٠',
    theme: 'creation',
  },
  {
    id: 2,
    arabic: 'أَوَلَمْ يَنظُرُوا فِي مَلَكُوتِ السَّمَاوَاتِ وَالْأَرْضِ وَمَا خَلَقَ اللَّهُ مِن شَيْءٍ',
    surah: 'الأعراف',
    surahNumber: 7,
    ayahNumber: 185,
    reference: 'الأعراف: ١٨٥',
    theme: 'creation',
  },
  {
    id: 3,
    arabic: 'اللَّهُ الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ وَمِنَ الْأَرْضِ مِثْلَهُنَّ يَتَنَزَّلُ الْأَمْرُ بَيْنَهُنَّ لِتَعْلَمُوا أَنَّ اللَّهَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ وَأَنَّ اللَّهَ قَدْ أَحَاطَ بِكُلِّ شَيْءٍ عِلْمًا',
    surah: 'الطلاق',
    surahNumber: 65,
    ayahNumber: 12,
    reference: 'الطلاق: ١٢',
    theme: 'creation',
  },
  {
    id: 4,
    arabic: 'أَفَلَا يَنظُرُونَ إِلَى الْإِبِلِ كَيْفَ خُلِقَتْ ﴿١٧﴾ وَإِلَى السَّمَاءِ كَيْفَ رُفِعَتْ ﴿١٨﴾ وَإِلَى الْجِبَالِ كَيْفَ نُصِبَتْ ﴿١٩﴾ وَإِلَى الْأَرْضِ كَيْفَ سُطِحَتْ',
    surah: 'الغاشية',
    surahNumber: 88,
    ayahNumber: 17,
    reference: 'الغاشية: ١٧-٢٠',
    theme: 'creation',
  },

  // السماوات والأرض
  {
    id: 5,
    arabic: 'وَالسَّمَاءَ بَنَيْنَاهَا بِأَيْدٍ وَإِنَّا لَمُوسِعُونَ',
    surah: 'الذاريات',
    surahNumber: 51,
    ayahNumber: 47,
    reference: 'الذاريات: ٤٧',
    theme: 'sky',
  },
  {
    id: 6,
    arabic: 'تَبَارَكَ الَّذِي جَعَلَ فِي السَّمَاءِ بُرُوجًا وَجَعَلَ فِيهَا سِرَاجًا وَقَمَرًا مُّنِيرًا',
    surah: 'الفرقان',
    surahNumber: 25,
    ayahNumber: 61,
    reference: 'الفرقان: ٦١',
    theme: 'sky',
  },
  {
    id: 7,
    arabic: 'وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ وَجَعَلْنَاهَا رُجُومًا لِّلشَّيَاطِينِ',
    surah: 'الملك',
    surahNumber: 67,
    ayahNumber: 5,
    reference: 'الملك: ٥',
    theme: 'sky',
  },
  {
    id: 8,
    arabic: 'أَلَمْ تَرَ أَنَّ اللَّهَ يُولِجُ اللَّيْلَ فِي النَّهَارِ وَيُولِجُ النَّهَارَ فِي اللَّيْلِ وَسَخَّرَ الشَّمْسَ وَالْقَمَرَ كُلٌّ يَجْرِي إِلَىٰ أَجَلٍ مُّسَمًّى',
    surah: 'لقمان',
    surahNumber: 31,
    ayahNumber: 29,
    reference: 'لقمان: ٢٩',
    theme: 'sky',
  },

  // الطبيعة والماء
  {
    id: 9,
    arabic: 'وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ أَفَلَا يُؤْمِنُونَ',
    surah: 'الأنبياء',
    surahNumber: 21,
    ayahNumber: 30,
    reference: 'الأنبياء: ٣٠',
    theme: 'nature',
  },
  {
    id: 10,
    arabic: 'وَهُوَ الَّذِي أَنزَلَ مِنَ السَّمَاءِ مَاءً فَأَخْرَجْنَا بِهِ نَبَاتَ كُلِّ شَيْءٍ فَأَخْرَجْنَا مِنْهُ خَضِرًا',
    surah: 'الأنعام',
    surahNumber: 6,
    ayahNumber: 99,
    reference: 'الأنعام: ٩٩',
    theme: 'nature',
  },
  {
    id: 11,
    arabic: 'وَالْأَرْضَ مَدَدْنَاهَا وَأَلْقَيْنَا فِيهَا رَوَاسِيَ وَأَنبَتْنَا فِيهَا مِن كُلِّ زَوْجٍ بَهِيجٍ',
    surah: 'ق',
    surahNumber: 50,
    ayahNumber: 7,
    reference: 'ق: ٧',
    theme: 'nature',
  },
  {
    id: 12,
    arabic: 'أَلَمْ نَجْعَلِ الْأَرْضَ مِهَادًا ﴿٦﴾ وَالْجِبَالَ أَوْتَادًا ﴿٧﴾ وَخَلَقْنَاكُمْ أَزْوَاجًا',
    surah: 'النبأ',
    surahNumber: 78,
    ayahNumber: 6,
    reference: 'النبأ: ٦-٨',
    theme: 'nature',
  },

  // خلق الإنسان
  {
    id: 13,
    arabic: 'وَلَقَدْ خَلَقْنَا الْإِنسَانَ مِن سُلَالَةٍ مِّن طِينٍ ﴿١٢﴾ ثُمَّ جَعَلْنَاهُ نُطْفَةً فِي قَرَارٍ مَّكِينٍ',
    surah: 'المؤمنون',
    surahNumber: 23,
    ayahNumber: 12,
    reference: 'المؤمنون: ١٢-١٣',
    theme: 'human',
  },
  {
    id: 14,
    arabic: 'لَقَدْ خَلَقْنَا الْإِنسَانَ فِي أَحْسَنِ تَقْوِيمٍ',
    surah: 'التين',
    surahNumber: 95,
    ayahNumber: 4,
    reference: 'التين: ٤',
    theme: 'human',
  },
  {
    id: 15,
    arabic: 'يَا أَيُّهَا الْإِنسَانُ مَا غَرَّكَ بِرَبِّكَ الْكَرِيمِ ﴿٦﴾ الَّذِي خَلَقَكَ فَسَوَّاكَ فَعَدَلَكَ ﴿٧﴾ فِي أَيِّ صُورَةٍ مَّا شَاءَ رَكَّبَكَ',
    surah: 'الانفطار',
    surahNumber: 82,
    ayahNumber: 6,
    reference: 'الانفطار: ٦-٨',
    theme: 'human',
  },
  {
    id: 16,
    arabic: 'وَفِي أَنفُسِكُمْ أَفَلَا تُبْصِرُونَ',
    surah: 'الذاريات',
    surahNumber: 51,
    ayahNumber: 21,
    reference: 'الذاريات: ٢١',
    theme: 'human',
  },

  // القدرة والملك
  {
    id: 17,
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    surah: 'البقرة',
    surahNumber: 2,
    ayahNumber: 255,
    reference: 'البقرة: ٢٥٥',
    theme: 'power',
  },
  {
    id: 18,
    arabic: 'وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    surah: 'البقرة',
    surahNumber: 2,
    ayahNumber: 255,
    reference: 'البقرة: ٢٥٥',
    theme: 'power',
  },
  {
    id: 19,
    arabic: 'وَمَا قَدَرُوا اللَّهَ حَقَّ قَدْرِهِ وَالْأَرْضُ جَمِيعًا قَبْضَتُهُ يَوْمَ الْقِيَامَةِ وَالسَّمَاوَاتُ مَطْوِيَّاتٌ بِيَمِينِهِ سُبْحَانَهُ وَتَعَالَىٰ عَمَّا يُشْرِكُونَ',
    surah: 'الزمر',
    surahNumber: 39,
    ayahNumber: 67,
    reference: 'الزمر: ٦٧',
    theme: 'power',
  },
  {
    id: 20,
    arabic: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    surah: 'الملك',
    surahNumber: 67,
    ayahNumber: 1,
    reference: 'الملك: ١',
    theme: 'power',
  },
];
