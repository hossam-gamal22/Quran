// data/daily-hadiths.ts
// 50+ curated authentic hadiths from Sahih Bukhari, Muslim, and other major collections
// Deterministically picked based on day of year

export interface DailyHadith {
  arabic: string;
  translation: string;
  narrator: string;
  source: string;
}

const DAILY_HADITHS: DailyHadith[] = [
  // === الإيمان والعقيدة ===
  { arabic: 'إنَّما الأعْمالُ بالنِّيّاتِ، وإنَّما لِكُلِّ امْرِئٍ ما نَوى', translation: 'Actions are judged by intentions, and everyone will be rewarded according to what they intended.', narrator: 'عمر بن الخطاب رضي الله عنه', source: 'البخاري ومسلم' },
  { arabic: 'لا يُؤْمِنُ أَحَدُكُمْ حتَّى يُحِبَّ لأَخِيهِ ما يُحِبُّ لِنَفْسِهِ', translation: 'None of you truly believes until he loves for his brother what he loves for himself.', narrator: 'أنس بن مالك رضي الله عنه', source: 'البخاري ومسلم' },
  { arabic: 'مَن كانَ يُؤْمِنُ باللَّهِ واليَومِ الآخِرِ فَلْيَقُلْ خَيْرًا أوْ لِيَصْمُتْ', translation: 'Whoever believes in Allah and the Last Day should speak good or remain silent.', narrator: 'أبو هريرة رضي الله عنه', source: 'البخاري ومسلم' },
  { arabic: 'المُسْلِمُ مَن سَلِمَ المُسْلِمُونَ مِن لِسانِهِ ويَدِهِ', translation: 'A Muslim is one from whose tongue and hand other Muslims are safe.', narrator: 'عبد الله بن عمرو رضي الله عنهما', source: 'البخاري ومسلم' },
  { arabic: 'الدِّينُ النَّصِيحَةُ', translation: 'The religion is sincerity and sincere advice.', narrator: 'تميم الداري رضي الله عنه', source: 'مسلم' },
  
  // === العبادات والصلاة ===
  { arabic: 'صَلُّوا كما رَأَيْتُمُونِي أُصَلِّي', translation: 'Pray as you have seen me praying.', narrator: 'مالك بن الحويرث رضي الله عنه', source: 'البخاري' },
  { arabic: 'أَقْرَبُ ما يَكُونُ العَبْدُ مِن رَبِّهِ وهو ساجِدٌ', translation: 'The closest a servant is to his Lord is when he is prostrating.', narrator: 'أبو هريرة رضي الله عنه', source: 'مسلم' },
  { arabic: 'الصَّلاةُ عِمادُ الدِّينِ', translation: 'Prayer is the pillar of religion.', narrator: 'عمر بن الخطاب رضي الله عنه', source: 'البيهقي' },
  { arabic: 'مَن صَلَّى الصُّبْحَ فَهُوَ في ذِمَّةِ اللَّهِ', translation: 'Whoever prays the Fajr prayer is under the protection of Allah.', narrator: 'جندب بن عبد الله رضي الله عنه', source: 'مسلم' },
  { arabic: 'إِنَّ أَوَّلَ ما يُحاسَبُ بِهِ العَبْدُ يَوْمَ القِيامَةِ مِن عَمَلِهِ صَلاتُهُ', translation: 'The first thing a person will be held accountable for on the Day of Judgment is prayer.', narrator: 'أبو هريرة رضي الله عنه', source: 'الترمذي' },
  
  // === الأخلاق والمعاملات ===
  { arabic: 'إنَّما بُعِثْتُ لأُتَمِّمَ صالِحَ الأَخْلاقِ', translation: 'I was sent to perfect good character.', narrator: 'أبو هريرة رضي الله عنه', source: 'أحمد' },
  { arabic: 'خَيْرُكُمْ خَيْرُكُمْ لأَهْلِهِ، وأَنا خَيْرُكُمْ لأَهْلِي', translation: 'The best of you is the one who is best to his family, and I am the best of you to my family.', narrator: 'عائشة رضي الله عنها', source: 'الترمذي' },
  { arabic: 'لَيْسَ الشَّدِيدُ بِالصُّرَعَةِ، إِنَّما الشَّدِيدُ الَّذِي يَمْلِكُ نَفْسَهُ عِنْدَ الغَضَبِ', translation: 'The strong person is not the one who can wrestle others, but the one who controls himself when angry.', narrator: 'أبو هريرة رضي الله عنه', source: 'البخاري ومسلم' },
  { arabic: 'ما نَقَصَتْ صَدَقَةٌ مِن مالٍ', translation: 'Charity does not decrease wealth.', narrator: 'أبو هريرة رضي الله عنه', source: 'مسلم' },
  { arabic: 'المُؤْمِنُ لِلْمُؤْمِنِ كالبُنْيانِ يَشُدُّ بَعْضُهُ بَعْضًا', translation: 'A believer to another believer is like a building whose parts reinforce one another.', narrator: 'أبو موسى الأشعري رضي الله عنه', source: 'البخاري ومسلم' },
  
  // === التوبة والاستغفار ===
  { arabic: 'كُلُّ ابْنِ آدَمَ خَطّاءٌ، وخَيْرُ الخَطَّائِينَ التَّوَّابُونَ', translation: 'Every son of Adam sins, and the best of sinners are those who repent.', narrator: 'أنس بن مالك رضي الله عنه', source: 'الترمذي' },
  { arabic: 'ما مِنْ عَبْدٍ يُذْنِبُ ذَنْبًا فَيُحْسِنُ الطُّهورَ ثُمَّ يَقُومُ فَيُصَلِّي رَكْعَتَيْنِ ثُمَّ يَسْتَغْفِرُ اللَّهَ إِلَّا غَفَرَ اللَّهُ لَهُ', translation: 'No servant sins and then performs proper ablution and prays two units, then asks Allah for forgiveness, except that Allah forgives him.', narrator: 'أبو بكر الصديق رضي الله عنه', source: 'أبو داود' },
  { arabic: 'للَّهُ أَفْرَحُ بِتَوْبَةِ عَبْدِهِ مِن أَحَدِكُمْ سَقَطَ على بَعِيرِهِ وقَدْ أَضَلَّهُ في أَرْضِ فَلاةٍ', translation: 'Allah is more pleased with the repentance of His servant than one of you finding his lost camel in the wilderness.', narrator: 'أنس بن مالك رضي الله عنه', source: 'البخاري ومسلم' },
  
  // === الذكر والدعاء ===
  { arabic: 'أَقْرَبُ ما يَكُونُ الرَّبُّ مِنَ العَبْدِ في جَوْفِ اللَّيْلِ الآخِرِ', translation: 'The Lord is closest to His servant in the last part of the night.', narrator: 'عمرو بن عبسة رضي الله عنه', source: 'الترمذي' },
  { arabic: 'الدُّعاءُ هُوَ العِبادَةُ', translation: 'Supplication is worship.', narrator: 'النعمان بن بشير رضي الله عنهما', source: 'الترمذي' },
  { arabic: 'مَن قالَ: سُبْحانَ اللَّهِ وبِحَمْدِهِ في يَومٍ مِائَةَ مَرَّةٍ حُطَّتْ خَطاياهُ وإنْ كانَتْ مِثْلَ زَبَدِ البَحْرِ', translation: 'Whoever says "Glory be to Allah and praise Him" a hundred times a day, his sins will be forgiven even if they are like the foam of the sea.', narrator: 'أبو هريرة رضي الله عنه', source: 'البخاري ومسلم' },
  { arabic: 'كَلِمَتانِ خَفِيفَتانِ على اللِّسانِ، ثَقِيلَتانِ في المِيزانِ، حَبِيبَتانِ إلى الرَّحْمَنِ: سُبْحانَ اللَّهِ وبِحَمْدِهِ، سُبْحانَ اللَّهِ العَظِيمِ', translation: 'Two words that are light on the tongue, heavy in the scales, and beloved to the Most Merciful: Glory be to Allah and praise Him, Glory be to Allah the Almighty.', narrator: 'أبو هريرة رضي الله عنه', source: 'البخاري ومسلم' },
  
  // === العلم والعمل ===
  { arabic: 'طَلَبُ العِلْمِ فَرِيضَةٌ على كُلِّ مُسْلِمٍ', translation: 'Seeking knowledge is an obligation upon every Muslim.', narrator: 'أنس بن مالك رضي الله عنه', source: 'ابن ماجه' },
  { arabic: 'مَن سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ له طَرِيقًا إلى الجَنَّةِ', translation: 'Whoever takes a path seeking knowledge, Allah will make easy for him a path to Paradise.', narrator: 'أبو هريرة رضي الله عنه', source: 'مسلم' },
  { arabic: 'خَيْرُكُمْ مَن تَعَلَّمَ القُرْآنَ وعَلَّمَهُ', translation: 'The best of you is the one who learns the Quran and teaches it.', narrator: 'عثمان بن عفان رضي الله عنه', source: 'البخاري' },
  
  // === الصبر والتوكل ===
  { arabic: 'عَجَبًا لأَمْرِ المُؤْمِنِ، إنَّ أمْرَهُ كُلَّهُ خَيْرٌ', translation: 'How wonderful is the affair of the believer, for all his affairs are good.', narrator: 'صهيب الرومي رضي الله عنه', source: 'مسلم' },
  { arabic: 'ما يُصِيبُ المُسْلِمَ مِن نَصَبٍ ولا وصَبٍ ولا هَمٍّ ولا حُزْنٍ ولا أذًى ولا غَمٍّ حتَّى الشَّوْكَةِ يُشاكُها إلَّا كَفَّرَ اللَّهُ بِها مِن خَطاياهُ', translation: 'No fatigue, illness, anxiety, sorrow, harm, or grief afflicts a Muslim—even a thorn that pricks him—except that Allah expiates some of his sins thereby.', narrator: 'أبو سعيد الخدري وأبو هريرة رضي الله عنهما', source: 'البخاري ومسلم' },
  { arabic: 'إِذا سَأَلْتَ فاسْأَلِ اللَّهَ، وإِذا اسْتَعَنْتَ فاسْتَعِنْ باللَّهِ', translation: 'If you ask, ask Allah; and if you seek help, seek help from Allah.', narrator: 'عبد الله بن عباس رضي الله عنهما', source: 'الترمذي' },
  
  // === البر والتقوى ===
  { arabic: 'البِرُّ حُسْنُ الخُلُقِ', translation: 'Righteousness is good character.', narrator: 'النواس بن سمعان رضي الله عنه', source: 'مسلم' },
  { arabic: 'اتَّقِ اللَّهَ حَيْثُما كُنْتَ، وأَتْبِعِ السَّيِّئَةَ الحَسَنَةَ تَمْحُها، وخالِقِ النّاسَ بِخُلُقٍ حَسَنٍ', translation: 'Fear Allah wherever you are, follow a bad deed with a good deed and it will erase it, and treat people with good character.', narrator: 'معاذ بن جبل رضي الله عنه', source: 'الترمذي' },
  { arabic: 'الحَياءُ مِنَ الإِيمانِ', translation: 'Modesty is part of faith.', narrator: 'أبو هريرة رضي الله عنه', source: 'البخاري ومسلم' },
  { arabic: 'مَن حُرِمَ الرِّفْقَ حُرِمَ الخَيْرَ كُلَّهُ', translation: 'Whoever is deprived of gentleness is deprived of all good.', narrator: 'جرير بن عبد الله رضي الله عنه', source: 'مسلم' },
  
  // === الأسرة والمجتمع ===
  { arabic: 'رِضا الرَّبِّ في رِضا الوالِدَيْنِ، وسَخَطُ الرَّبِّ في سَخَطِ الوالِدَيْنِ', translation: 'The Lord\'s pleasure is in the parent\'s pleasure, and the Lord\'s anger is in the parent\'s anger.', narrator: 'عبد الله بن عمرو رضي الله عنهما', source: 'الترمذي' },
  { arabic: 'لَيْسَ مِنَّا مَن لَمْ يَرْحَمْ صَغِيرَنا ويُوَقِّرْ كَبِيرَنا', translation: 'He is not one of us who does not show mercy to our young ones and respect our elders.', narrator: 'عبد الله بن عمرو رضي الله عنهما', source: 'الترمذي' },
  { arabic: 'خَيْرُ الأَصْحابِ عِنْدَ اللَّهِ خَيْرُهُمْ لِصاحِبِهِ', translation: 'The best companion in Allah\'s sight is the one who is best to his companion.', narrator: 'عبد الله بن عمرو رضي الله عنهما', source: 'الترمذي' },
  { arabic: 'انْصُرْ أَخاكَ ظالِمًا أَوْ مَظْلُومًا', translation: 'Help your brother whether he is an oppressor or oppressed.', narrator: 'أنس بن مالك رضي الله عنه', source: 'البخاري' },
  
  // === الدنيا والآخرة ===
  { arabic: 'كُنْ في الدُّنْيا كَأَنَّكَ غَرِيبٌ أَوْ عابِرُ سَبِيلٍ', translation: 'Be in this world as if you were a stranger or a traveler.', narrator: 'عبد الله بن عمر رضي الله عنهما', source: 'البخاري' },
  { arabic: 'الدُّنْيا سِجْنُ المُؤْمِنِ وجَنَّةُ الكافِرِ', translation: 'This world is a prison for the believer and a paradise for the disbeliever.', narrator: 'أبو هريرة رضي الله عنه', source: 'مسلم' },
  { arabic: 'ازْهَدْ في الدُّنْيا يُحِبَّكَ اللَّهُ، وازْهَدْ فِيما في أَيْدِي النّاسِ يُحِبّوكَ', translation: 'Be indifferent to worldly things and Allah will love you; be indifferent to what people have and they will love you.', narrator: 'سهل بن سعد رضي الله عنه', source: 'ابن ماجه' },
  
  // === الإخلاص والتواضع ===
  { arabic: 'إِنَّ اللَّهَ لا يَنْظُرُ إلى صُوَرِكُمْ وأَمْوالِكُمْ ولَكِنْ يَنْظُرُ إلى قُلُوبِكُمْ وأَعْمالِكُمْ', translation: 'Allah does not look at your appearance or wealth, but He looks at your hearts and deeds.', narrator: 'أبو هريرة رضي الله عنه', source: 'مسلم' },
  { arabic: 'مَن تَواضَعَ للَّهِ رَفَعَهُ اللَّهُ', translation: 'Whoever humbles himself for Allah, Allah will raise him.', narrator: 'أبو هريرة رضي الله عنه', source: 'مسلم' },
  
  // === النية والعمل ===
  { arabic: 'إِنَّ اللَّهَ كَتَبَ الحَسَناتِ والسَّيِّئاتِ، فَمَن هَمَّ بِحَسَنَةٍ فَلَمْ يَعْمَلْها كَتَبَها اللَّهُ عِنْدَهُ حَسَنَةً كامِلَةً', translation: 'Allah has written down the good and bad deeds. If anyone intends a good deed but does not do it, Allah writes it as a complete good deed.', narrator: 'عبد الله بن عباس رضي الله عنهما', source: 'البخاري ومسلم' },
  { arabic: 'أَحَبُّ الأَعْمالِ إلى اللَّهِ أَدْوَمُها وإِنْ قَلَّ', translation: 'The deeds most loved by Allah are the most consistent, even if small.', narrator: 'عائشة رضي الله عنها', source: 'البخاري ومسلم' },
  
  // === الأمانة والصدق ===
  { arabic: 'آيَةُ المُنافِقِ ثَلاثٌ: إِذا حَدَّثَ كَذَبَ، وإِذا وَعَدَ أَخْلَفَ، وإِذا اؤْتُمِنَ خانَ', translation: 'The signs of a hypocrite are three: when he speaks he lies, when he promises he breaks it, and when he is trusted he betrays.', narrator: 'أبو هريرة رضي الله عنه', source: 'البخاري ومسلم' },
  { arabic: 'عَلَيْكُمْ بِالصِّدْقِ، فَإِنَّ الصِّدْقَ يَهْدِي إلى البِرِّ، وإِنَّ البِرَّ يَهْدِي إلى الجَنَّةِ', translation: 'Be truthful, for truthfulness leads to righteousness, and righteousness leads to Paradise.', narrator: 'عبد الله بن مسعود رضي الله عنه', source: 'البخاري ومسلم' },
  
  // === القناعة والرضا ===
  { arabic: 'لَيْسَ الغِنى عَن كَثْرَةِ العَرَضِ، ولَكِنَّ الغِنى غِنى النَّفْسِ', translation: 'Richness is not having many possessions, but richness is the contentment of the soul.', narrator: 'أبو هريرة رضي الله عنه', source: 'البخاري ومسلم' },
  { arabic: 'مَن أَصْبَحَ مِنْكُمْ آمِنًا في سِرْبِهِ مُعافًى في جَسَدِهِ عِنْدَهُ قُوتُ يَوْمِهِ فَكَأَنَّما حِيزَتْ لَهُ الدُّنْيا', translation: 'Whoever wakes up safe in his home, healthy in body, with enough food for the day, it is as if he has been given the whole world.', narrator: 'عبيد الله بن محصن رضي الله عنه', source: 'الترمذي' },
  
  // === الأخوة والمحبة ===
  { arabic: 'لا تَدْخُلُونَ الجَنَّةَ حتَّى تُؤْمِنُوا، ولا تُؤْمِنُونَ حتَّى تَحابُّوا', translation: 'You will not enter Paradise until you believe, and you will not believe until you love one another.', narrator: 'أبو هريرة رضي الله عنه', source: 'مسلم' },
  { arabic: 'مَثَلُ المُؤْمِنِينَ في تَوادِّهِمْ وتَراحُمِهِمْ وتَعاطُفِهِمْ مَثَلُ الجَسَدِ الواحِدِ', translation: 'The believers in their mutual love, mercy, and compassion are like one body.', narrator: 'النعمان بن بشير رضي الله عنهما', source: 'البخاري ومسلم' },
  
  // === الموت والآخرة ===
  { arabic: 'أَكْثِرُوا ذِكْرَ هادِمِ اللَّذَّاتِ', translation: 'Remember often the destroyer of pleasures (death).', narrator: 'أبو هريرة رضي الله عنه', source: 'الترمذي' },
  { arabic: 'اغْتَنِمْ خَمْسًا قَبْلَ خَمْسٍ: شَبابَكَ قَبْلَ هَرَمِكَ، وصِحَّتَكَ قَبْلَ سَقَمِكَ، وغِناكَ قَبْلَ فَقْرِكَ، وفَراغَكَ قَبْلَ شُغْلِكَ، وحَياتَكَ قَبْلَ مَوْتِكَ', translation: 'Take advantage of five before five: your youth before old age, health before illness, wealth before poverty, free time before busyness, and life before death.', narrator: 'عبد الله بن عباس رضي الله عنهما', source: 'الحاكم' },
];

/**
 * Get hadith of the day based on current date (deterministic)
 */
export function getHadithOfTheDay(): DailyHadith {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % DAILY_HADITHS.length;
  return DAILY_HADITHS[index];
}

/**
 * Get a random hadith (optionally excluding a specific index)
 */
export function getRandomHadith(excludeIndex?: number): { hadith: DailyHadith; index: number } {
  let index: number;
  do {
    index = Math.floor(Math.random() * DAILY_HADITHS.length);
  } while (index === excludeIndex && DAILY_HADITHS.length > 1);
  return { hadith: DAILY_HADITHS[index], index };
}

/**
 * Get all hadiths
 */
export function getAllHadiths(): DailyHadith[] {
  return DAILY_HADITHS;
}

// ========================================
// Transliteration maps for non-Arabic users
// ========================================

const NARRATOR_EN: Record<string, string> = {
  'أبو بكر الصديق رضي الله عنه': 'Abu Bakr As-Siddiq (may Allah be pleased with him)',
  'أبو سعيد الخدري وأبو هريرة رضي الله عنهما': 'Abu Sa\'id Al-Khudri & Abu Hurairah (may Allah be pleased with them)',
  'أبو موسى الأشعري رضي الله عنه': 'Abu Musa Al-Ash\'ari (may Allah be pleased with him)',
  'أبو هريرة رضي الله عنه': 'Abu Hurairah (may Allah be pleased with him)',
  'أنس بن مالك رضي الله عنه': 'Anas ibn Malik (may Allah be pleased with him)',
  'النعمان بن بشير رضي الله عنهما': 'An-Nu\'man ibn Bashir (may Allah be pleased with them)',
  'النواس بن سمعان رضي الله عنه': 'An-Nawwas ibn Sam\'an (may Allah be pleased with him)',
  'تميم الداري رضي الله عنه': 'Tamim Ad-Dari (may Allah be pleased with him)',
  'جرير بن عبد الله رضي الله عنه': 'Jarir ibn Abdullah (may Allah be pleased with him)',
  'جندب بن عبد الله رضي الله عنه': 'Jundub ibn Abdullah (may Allah be pleased with him)',
  'سهل بن سعد رضي الله عنه': 'Sahl ibn Sa\'d (may Allah be pleased with him)',
  'صهيب الرومي رضي الله عنه': 'Suhayb Ar-Rumi (may Allah be pleased with him)',
  'عائشة رضي الله عنها': 'Aisha (may Allah be pleased with her)',
  'عبد الله بن عباس رضي الله عنهما': 'Abdullah ibn Abbas (may Allah be pleased with them)',
  'عبد الله بن عمر رضي الله عنهما': 'Abdullah ibn Umar (may Allah be pleased with them)',
  'عبد الله بن عمرو رضي الله عنهما': 'Abdullah ibn Amr (may Allah be pleased with them)',
  'عبد الله بن مسعود رضي الله عنه': 'Abdullah ibn Mas\'ud (may Allah be pleased with him)',
  'عبيد الله بن محصن رضي الله عنه': 'Ubaydullah ibn Muhsin (may Allah be pleased with him)',
  'عثمان بن عفان رضي الله عنه': 'Uthman ibn Affan (may Allah be pleased with him)',
  'عمر بن الخطاب رضي الله عنه': 'Umar ibn Al-Khattab (may Allah be pleased with him)',
  'عمرو بن عبسة رضي الله عنه': 'Amr ibn Abasa (may Allah be pleased with him)',
  'مالك بن الحويرث رضي الله عنه': 'Malik ibn Al-Huwayrith (may Allah be pleased with him)',
  'معاذ بن جبل رضي الله عنه': 'Mu\'adh ibn Jabal (may Allah be pleased with him)',
};

const SOURCE_EN: Record<string, string> = {
  'البخاري ومسلم': 'Al-Bukhari & Muslim',
  'البخاري': 'Al-Bukhari',
  'مسلم': 'Muslim',
  'الترمذي': 'At-Tirmidhi',
  'أبو داود': 'Abu Dawud',
  'ابن ماجه': 'Ibn Majah',
  'أحمد': 'Ahmad',
  'البيهقي': 'Al-Bayhaqi',
  'الحاكم': 'Al-Hakim',
};

/**
 * Get transliterated narrator name for non-Arabic users
 */
export function getNarratorDisplay(narrator: string, isArabic: boolean): string {
  if (isArabic) return narrator;
  return NARRATOR_EN[narrator] || narrator;
}

/**
 * Get transliterated source name for non-Arabic users
 */
export function getSourceDisplay(source: string, isArabic: boolean): string {
  if (isArabic) return source;
  return SOURCE_EN[source] || source;
}

export default DAILY_HADITHS;
