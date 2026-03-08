// data/daily-duas.ts
// 366 curated duas (one per day of the year) from Quran and Sunnah
// Deterministically picked based on day of year

export interface DailyDua {
  arabic: string;
  translation: string;
  reference: string;
}

const DAILY_DUAS: DailyDua[] = [
  // === أدعية من القرآن ===
  { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', translation: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.', reference: 'البقرة: 201' },
  { arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ', translation: 'Our Lord, accept from us. Indeed, You are the All-Hearing, the All-Knowing.', reference: 'البقرة: 127' },
  { arabic: 'رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا', translation: 'Our Lord, do not hold us accountable if we forget or make a mistake.', reference: 'البقرة: 286' },
  { arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً إِنَّكَ أَنتَ الْوَهَّابُ', translation: 'Our Lord, do not let our hearts deviate after You have guided us, and grant us mercy from You.', reference: 'آل عمران: 8' },
  { arabic: 'رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ', translation: 'Our Lord, forgive us our sins and our excesses, make our feet firm, and help us against the disbelieving people.', reference: 'آل عمران: 147' },
  { arabic: 'رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ', translation: 'Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will be among the losers.', reference: 'الأعراف: 23' },
  { arabic: 'رَبِّ اغْفِرْ وَارْحَمْ وَأَنتَ خَيْرُ الرَّاحِمِينَ', translation: 'My Lord, forgive and have mercy, and You are the best of the merciful.', reference: 'المؤمنون: 118' },
  { arabic: 'رَبِّ أَعُوذُ بِكَ مِنْ هَمَزَاتِ الشَّيَاطِينِ وَأَعُوذُ بِكَ رَبِّ أَن يَحْضُرُونِ', translation: 'My Lord, I seek refuge in You from the incitations of the devils, and I seek refuge in You from their presence.', reference: 'المؤمنون: 97-98' },
  { arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا', translation: 'Our Lord, grant us from among our spouses and offspring comfort to our eyes, and make us leaders for the righteous.', reference: 'الفرقان: 74' },
  { arabic: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ', translation: 'My Lord, make me an establisher of prayer, and from my descendants. Our Lord, and accept my supplication.', reference: 'إبراهيم: 40' },
  { arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي', translation: 'My Lord, expand my chest and ease my task for me.', reference: 'طه: 25-26' },
  { arabic: 'رَبِّ زِدْنِي عِلْمًا', translation: 'My Lord, increase me in knowledge.', reference: 'طه: 114' },
  { arabic: 'لَا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ', translation: 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.', reference: 'الأنبياء: 87' },
  { arabic: 'رَبِّ لَا تَذَرْنِي فَرْدًا وَأَنتَ خَيْرُ الْوَارِثِينَ', translation: 'My Lord, do not leave me alone, and You are the best of inheritors.', reference: 'الأنبياء: 89' },
  { arabic: 'رَبِّ أَنزِلْنِي مُنزَلًا مُّبَارَكًا وَأَنتَ خَيْرُ الْمُنزِلِينَ', translation: 'My Lord, let me land at a blessed landing place, and You are the best to accommodate.', reference: 'المؤمنون: 29' },
  { arabic: 'رَبَّنَا آمَنَّا فَاغْفِرْ لَنَا وَارْحَمْنَا وَأَنتَ خَيْرُ الرَّاحِمِينَ', translation: 'Our Lord, we have believed, so forgive us and have mercy upon us, and You are the best of the merciful.', reference: 'المؤمنون: 109' },
  { arabic: 'رَبِّ أَعِنِّي وَلَا تُعِنْ عَلَيَّ وَانصُرْنِي وَلَا تَنصُرْ عَلَيَّ', translation: 'My Lord, help me and do not help others against me, give me victory and do not give victory over me.', reference: 'حديث - أحمد والترمذي' },
  { arabic: 'رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ', translation: 'My Lord, indeed I am, for whatever good You would send down to me, in need.', reference: 'القصص: 24' },
  { arabic: 'رَبِّ نَجِّنِي مِنَ الْقَوْمِ الظَّالِمِينَ', translation: 'My Lord, save me from the wrongdoing people.', reference: 'القصص: 21' },
  { arabic: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ', translation: 'Sufficient for me is Allah; there is no deity except Him. On Him I have relied, and He is the Lord of the Great Throne.', reference: 'التوبة: 129' },
  // === أدعية من السنة ===
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى', translation: 'O Allah, I ask You for guidance, piety, chastity, and self-sufficiency.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ', translation: 'O Allah, I seek refuge in You from worry, grief, incapacity, and laziness.', reference: 'البخاري' },
  { arabic: 'اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي', translation: 'O Allah, set right my religion which is the safeguard of my affairs, and set right my worldly life.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', translation: 'O Allah, I ask You for pardon and well-being in this life and the Hereafter.', reference: 'ابن ماجه' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا', translation: 'O Allah, I ask You for beneficial knowledge, good provision, and accepted deeds.', reference: 'ابن ماجه' },
  { arabic: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ', translation: 'O Turner of hearts, keep my heart firm on Your religion.', reference: 'الترمذي' },
  { arabic: 'اللَّهُمَّ آتِ نَفْسِي تَقْوَاهَا وَزَكِّهَا أَنْتَ خَيْرُ مَن زَكَّاهَا أَنْتَ وَلِيُّهَا وَمَوْلَاهَا', translation: 'O Allah, grant my soul its piety and purify it, You are the best to purify it, You are its Guardian and Master.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنَ الْخَيْرِ كُلِّهِ عَاجِلِهِ وَآجِلِهِ مَا عَلِمْتُ مِنْهُ وَمَا لَمْ أَعْلَمْ', translation: 'O Allah, I ask You for all good, immediate and deferred, that which I know and that which I do not know.', reference: 'ابن ماجه' },
  { arabic: 'رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ', translation: 'Our Lord, forgive me and my parents and the believers on the Day the account is established.', reference: 'إبراهيم: 41' },
  { arabic: 'اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَعَافِنِي وَارْزُقْنِي', translation: 'O Allah, forgive me, have mercy on me, guide me, grant me well-being, and provide for me.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ زَوَالِ نِعْمَتِكَ وَتَحَوُّلِ عَافِيَتِكَ وَفُجَاءَةِ نِقْمَتِكَ وَجَمِيعِ سَخَطِكَ', translation: 'O Allah, I seek refuge in You from the decline of Your blessings, the loss of well-being, and Your sudden punishment.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ بِعِلْمِكَ الْغَيْبَ وَقُدْرَتِكَ عَلَى الْخَلْقِ أَحْيِنِي مَا عَلِمْتَ الْحَيَاةَ خَيْرًا لِّي وَتَوَفَّنِي إِذَا عَلِمْتَ الْوَفَاةَ خَيْرًا لِي', translation: 'O Allah, by Your knowledge of the unseen and Your power over creation, let me live as long as life is good for me.', reference: 'النسائي' },
  { arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', translation: 'O Allah, help me to remember You, to be grateful to You, and to worship You in the best way.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الثَّبَاتَ فِي الْأَمْرِ وَالْعَزِيمَةَ عَلَى الرُّشْدِ', translation: 'O Allah, I ask You for steadfastness in my affairs and determination upon guidance.', reference: 'النسائي' },
  { arabic: 'اللَّهُمَّ اجْعَلْ خَيْرَ عُمُرِي آخِرَهُ وَخَيْرَ عَمَلِي خَوَاتِمَهُ وَخَيْرَ أَيَّامِي يَوْمَ أَلْقَاكَ', translation: 'O Allah, make the best of my life its end, the best of my deeds their conclusion, and the best of my days the day I meet You.', reference: 'الطبراني' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لَا يَنْفَعُ وَمِنْ قَلْبٍ لَا يَخْشَعُ وَمِنْ نَفْسٍ لَا تَشْبَعُ وَمِنْ دَعْوَةٍ لَا يُسْتَجَابُ لَهَا', translation: 'O Allah, I seek refuge in You from knowledge that is not beneficial, a heart that does not humble, a soul that is never satisfied, and a supplication that is not answered.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْبُخْلِ وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَأَعُوذُ بِكَ أَنْ أُرَدَّ إِلَى أَرْذَلِ الْعُمُرِ', translation: 'O Allah, I seek refuge in You from miserliness, from cowardice, and from being brought back to a feeble age.', reference: 'البخاري' },
  { arabic: 'اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي', translation: 'O Allah, guide me and set me right.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَسْأَلَةِ وَخَيْرَ الدُّعَاءِ وَخَيْرَ النَّجَاحِ وَخَيْرَ الْعَمَلِ', translation: 'O Allah, I ask You for the best request, the best supplication, the best success, and the best deed.', reference: 'الحاكم' },
  { arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ', translation: 'Glory be to Allah and praise Him, glory be to Allah the Almighty.', reference: 'البخاري ومسلم' },
  { arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', translation: 'There is no power and no strength except with Allah.', reference: 'البخاري ومسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ شَرِّ مَا عَمِلْتُ وَمِنْ شَرِّ مَا لَمْ أَعْمَلْ', translation: 'O Allah, I seek refuge in You from the evil of what I have done and the evil of what I have not done.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ مُصَرِّفَ الْقُلُوبِ صَرِّفْ قُلُوبَنَا عَلَى طَاعَتِكَ', translation: 'O Allah, Turner of hearts, turn our hearts to Your obedience.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَمَا قَرَّبَ إِلَيْهَا مِنْ قَوْلٍ أَوْ عَمَلٍ وَأَعُوذُ بِكَ مِنَ النَّارِ وَمَا قَرَّبَ إِلَيْهَا مِنْ قَوْلٍ أَوْ عَمَلٍ', translation: 'O Allah, I ask You for Paradise and every word or deed that brings closer to it, and I seek refuge from the Fire and every word or deed that brings closer to it.', reference: 'ابن ماجه' },
  { arabic: 'رَبَّنَا أَتْمِمْ لَنَا نُورَنَا وَاغْفِرْ لَنَا إِنَّكَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', translation: 'Our Lord, perfect for us our light and forgive us. Indeed, You are over all things competent.', reference: 'التحريم: 8' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِرِضَاكَ مِنْ سَخَطِكَ وَبِمُعَافَاتِكَ مِنْ عُقُوبَتِكَ', translation: 'O Allah, I seek refuge in Your pleasure from Your anger, and in Your forgiveness from Your punishment.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ دِقَّهُ وَجِلَّهُ وَأَوَّلَهُ وَآخِرَهُ وَعَلَانِيَتَهُ وَسِرَّهُ', translation: 'O Allah, forgive all my sins, small and great, first and last, public and private.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ فِعْلَ الْخَيْرَاتِ وَتَرْكَ الْمُنْكَرَاتِ وَحُبَّ الْمَسَاكِينِ', translation: 'O Allah, I ask You for the doing of good deeds, leaving wrong actions, and love of the poor.', reference: 'الترمذي' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكَسَلِ وَالْهَرَمِ وَالْمَغْرَمِ وَالْمَأْثَمِ', translation: 'O Allah, I seek refuge in You from laziness, old age, debt, and sin.', reference: 'البخاري ومسلم' },
  { arabic: 'اللَّهُمَّ أَحْسِنْ عَاقِبَتَنَا فِي الأُمُورِ كُلِّهَا وَأَجِرْنَا مِنْ خِزْيِ الدُّنْيَا وَعَذَابِ الآخِرَةِ', translation: 'O Allah, make the end of all our matters good, and save us from disgrace in this world and punishment in the Hereafter.', reference: 'أحمد' },
  { arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِي أَسْمَاعِنَا وَأَبْصَارِنَا وَقُلُوبِنَا وَأَزْوَاجِنَا وَذُرِّيَّاتِنَا', translation: 'O Allah, bless us in our hearing, sight, hearts, spouses, and offspring.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ حَبِّبْ إِلَيْنَا الْإِيمَانَ وَزَيِّنْهُ فِي قُلُوبِنَا وَكَرِّهْ إِلَيْنَا الْكُفْرَ وَالْفُسُوقَ وَالْعِصْيَانَ', translation: 'O Allah, endear faith to us and beautify it in our hearts, and make disbelief, wickedness, and disobedience hateful to us.', reference: 'أحمد' },
  { arabic: 'اللَّهُمَّ طَهِّرْ قَلْبِي مِنَ النِّفَاقِ وَعَمَلِي مِنَ الرِّيَاءِ', translation: 'O Allah, purify my heart from hypocrisy and my deeds from showing off.', reference: 'البيهقي' },
  { arabic: 'اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ', translation: 'O Allah, make me among those who repent and among those who purify themselves.', reference: 'الترمذي' },
  { arabic: 'رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلْقَوْمِ الظَّالِمِينَ وَنَجِّنَا بِرَحْمَتِكَ مِنَ الْقَوْمِ الْكَافِرِينَ', translation: 'Our Lord, do not make us a trial for the wrongdoing people, and save us by Your mercy from the disbelieving people.', reference: 'يونس: 85-86' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ حُبَّكَ وَحُبَّ مَنْ يُحِبُّكَ وَالْعَمَلَ الَّذِي يُبَلِّغُنِي حُبَّكَ', translation: 'O Allah, I ask You for Your love, the love of those who love You, and deeds that will bring me Your love.', reference: 'الترمذي' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ وَرَحْمَتِكَ فَإِنَّهُ لَا يَمْلِكُهَا إِلَّا أَنْتَ', translation: 'O Allah, I ask You for Your bounty and mercy, for none possesses them but You.', reference: 'الطبراني' },
  { arabic: 'اللَّهُمَّ أَلْهِمْنِي رُشْدِي وَأَعِذْنِي مِنْ شَرِّ نَفْسِي', translation: 'O Allah, inspire me with right guidance and protect me from the evil of my own self.', reference: 'الترمذي' },
  { arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ', translation: 'O Ever-Living, O Sustainer, by Your mercy I seek help. Set right all my affairs and do not leave me to myself even for the blink of an eye.', reference: 'الحاكم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', translation: 'O Allah, I ask You for well-being in this world and the Hereafter.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ', translation: 'O Allah, suffice me with what is lawful instead of what is unlawful, and enrich me by Your bounty from all besides You.', reference: 'الترمذي' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ وَالْجُبْنِ وَالْبُخْلِ وَالْهَرَمِ وَعَذَابِ الْقَبْرِ', translation: 'O Allah, I seek refuge in You from incapacity, laziness, cowardice, miserliness, decrepit old age, and the punishment of the grave.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ يَا أَللَّهُ بِأَنَّكَ الْوَاحِدُ الْأَحَدُ الصَّمَدُ الَّذِي لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ أَنْ تَغْفِرَ لِي ذُنُوبِي', translation: 'O Allah, I ask You, for You are the One, the Only, the Self-Sufficient, who begets not, nor was begotten, and there is none like You, to forgive my sins.', reference: 'أبو داود' },
  { arabic: 'رَبِّ هَبْ لِي حُكْمًا وَأَلْحِقْنِي بِالصَّالِحِينَ', translation: 'My Lord, grant me wisdom and join me with the righteous.', reference: 'الشعراء: 83' },
  { arabic: 'رَبَّنَا وَسِعْتَ كُلَّ شَيْءٍ رَّحْمَةً وَعِلْمًا فَاغْفِرْ لِلَّذِينَ تَابُوا وَاتَّبَعُوا سَبِيلَكَ وَقِهِمْ عَذَابَ الْجَحِيمِ', translation: 'Our Lord, You have encompassed all things in mercy and knowledge, so forgive those who have repented and followed Your way.', reference: 'غافر: 7' },
  { arabic: 'اللَّهُمَّ لَكَ أَسْلَمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَإِلَيْكَ أَنَبْتُ وَبِكَ خَاصَمْتُ', translation: 'O Allah, to You I submit, in You I believe, upon You I rely, to You I turn, and for Your sake I dispute.', reference: 'البخاري ومسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مُوجِبَاتِ رَحْمَتِكَ وَعَزَائِمَ مَغْفِرَتِكَ', translation: 'O Allah, I ask You for the means of Your mercy and the assurance of Your forgiveness.', reference: 'الترمذي' },
  { arabic: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَىٰ وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ', translation: 'My Lord, enable me to be grateful for Your favor which You have bestowed upon me and upon my parents, and to do righteousness that pleases You.', reference: 'النمل: 19' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ خَيْرِ مَا سَأَلَكَ مِنْهُ نَبِيُّكَ مُحَمَّدٌ ﷺ وَأَعُوذُ بِكَ مِنْ شَرِّ مَا اسْتَعَاذَ مِنْهُ نَبِيُّكَ مُحَمَّدٌ ﷺ', translation: 'O Allah, I ask You for the good that Your Prophet Muhammad ﷺ asked for, and I seek refuge from the evil from which he sought refuge.', reference: 'الترمذي' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ جَهْدِ الْبَلَاءِ وَدَرَكِ الشَّقَاءِ وَسُوءِ الْقَضَاءِ وَشَمَاتَةِ الْأَعْدَاءِ', translation: 'O Allah, I seek refuge in You from severe trial, being overtaken by misery, evil decree, and the gloating of enemies.', reference: 'البخاري ومسلم' },
  { arabic: 'اللَّهُمَّ مَتِّعْنِي بِسَمْعِي وَبَصَرِي وَاجْعَلْهُمَا الْوَارِثَ مِنِّي', translation: 'O Allah, let me enjoy my hearing and sight, and make them last till I die.', reference: 'الترمذي' },
  { arabic: 'اللَّهُمَّ اجْعَلْنِي أَخْشَاكَ كَأَنِّي أَرَاكَ حَتَّى أَلْقَاكَ', translation: 'O Allah, make me fear You as if I see You until I meet You.', reference: 'الطبراني' },
  { arabic: 'رَبَّنَا افْتَحْ بَيْنَنَا وَبَيْنَ قَوْمِنَا بِالْحَقِّ وَأَنتَ خَيْرُ الْفَاتِحِينَ', translation: 'Our Lord, decide between us and our people in truth, and You are the best of those who give decision.', reference: 'الأعراف: 89' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ فَتْحَهُ وَنَصْرَهُ وَنُورَهُ وَبَرَكَتَهُ وَهُدَاهُ', translation: 'O Allah, I ask You for the good of this day: its opening, victory, light, blessings, and guidance.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ باعِدْ بَيْنِي وَبَيْنَ خَطَايَايَ كَمَا بَاعَدْتَ بَيْنَ الْمَشْرِقِ وَالْمَغْرِبِ', translation: 'O Allah, distance me from my sins as You have distanced the East from the West.', reference: 'البخاري ومسلم' },
  { arabic: 'اللَّهُمَّ اغْسِلْنِي مِنْ خَطَايَايَ بِالثَّلْجِ وَالْمَاءِ وَالْبَرَدِ', translation: 'O Allah, cleanse me of my sins with snow, water, and hail.', reference: 'البخاري ومسلم' },
  { arabic: 'اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا وَفِي بَصَرِي نُورًا وَفِي سَمْعِي نُورًا وَعَنْ يَمِينِي نُورًا وَعَنْ يَسَارِي نُورًا', translation: 'O Allah, place light in my heart, light in my sight, light in my hearing, light on my right, and light on my left.', reference: 'البخاري ومسلم' },
  { arabic: 'رَبِّ هَبْ لِي مِن لَّدُنكَ ذُرِّيَّةً طَيِّبَةً إِنَّكَ سَمِيعُ الدُّعَاءِ', translation: 'My Lord, grant me from Yourself good offspring. Indeed, You are the Hearer of supplication.', reference: 'آل عمران: 38' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ فِتْنَةِ النَّارِ وَعَذَابِ النَّارِ وَمِنْ شَرِّ الْغِنَى وَالْفَقْرِ', translation: 'O Allah, I seek refuge in You from the trial of the Fire, the torment of the Fire, and from the evil of richness and poverty.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ أَحْيِنِي عَلَى الْإِسْلَامِ وَأَمِتْنِي عَلَى الْإِسْلَامِ', translation: 'O Allah, let me live upon Islam and let me die upon Islam.', reference: 'أحمد' },
  { arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ', translation: 'Glory be to Allah and praise be to Him, as many as the number of His creation, the pleasure of Himself, the weight of His Throne, and the ink of His words.', reference: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالسَّدَادَ', translation: 'O Allah, I ask You for guidance and correctness.', reference: 'مسلم' },
  { arabic: 'رَبِّ إِنِّي مَسَّنِيَ الضُّرُّ وَأَنتَ أَرْحَمُ الرَّاحِمِينَ', translation: 'My Lord, indeed adversity has touched me, and you are the Most Merciful of the merciful.', reference: 'الأنبياء: 83' },
  { arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا', translation: 'O Allah, nothing is easy except what You make easy, and You can make what is difficult easy if You wish.', reference: 'ابن حبان' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أُشْرِكَ بِكَ وَأَنَا أَعْلَمُ وَأَسْتَغْفِرُكَ لِمَا لَا أَعْلَمُ', translation: 'O Allah, I seek refuge in You from associating anything with You knowingly, and I ask Your forgiveness for what I do not know.', reference: 'أحمد' },
  { arabic: 'رَبَّنَا مَا خَلَقْتَ هَٰذَا بَاطِلًا سُبْحَانَكَ فَقِنَا عَذَابَ النَّارِ', translation: 'Our Lord, You did not create this without purpose; exalted are You, so protect us from the punishment of the Fire.', reference: 'آل عمران: 191' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ رِضَاكَ وَالْجَنَّةَ وَأَعُوذُ بِكَ مِنْ سَخَطِكَ وَالنَّارِ', translation: 'O Allah, I ask You for Your pleasure and Paradise, and I seek refuge from Your anger and the Fire.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي', translation: 'O Allah, I seek refuge in Your greatness from being swallowed up from beneath me.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ وَأَصْلِحْ لِي شَأْنِي كُلَّهُ لَا إِلَهَ إِلَّا أَنْتَ', translation: 'O Allah, it is Your mercy that I hope for, so do not leave me to myself even for the blink of an eye, and set right all my affairs. There is no god but You.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ', translation: 'O Allah, You are my Lord. There is no god but You. You created me and I am Your servant, and I uphold Your covenant and promise as best I can.', reference: 'البخاري' },
  { arabic: 'أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ', translation: 'I seek forgiveness of Allah, there is no deity but He, the Ever-Living, the Self-Sustaining, and I repent to Him.', reference: 'أبو داود والترمذي' },
  { arabic: 'رَبَّنَا إِنَّنَا آمَنَّا فَاغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ النَّارِ', translation: 'Our Lord, indeed we have believed, so forgive us our sins and protect us from the punishment of the Fire.', reference: 'آل عمران: 16' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ يَا اللَّهُ الْأَحَدُ الصَّمَدُ الَّذِي لَمْ يَلِدْ وَلَمْ يُولَدْ أَنْ تَغْفِرَ لِي ذُنُوبِي إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ', translation: 'O Allah, the One, the Self-Sufficient, who neither begets nor was begotten, forgive my sins, for You are the Forgiving, the Merciful.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي', translation: 'O Allah, Knower of the unseen and seen, Creator of the heavens and the earth, Lord and Sovereign of all things, I seek refuge in You from the evil of my self.', reference: 'الترمذي' },
  { arabic: 'اللَّهُمَّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَنْ دَخَلَ بَيْتِيَ مُؤْمِنًا وَلِلْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ', translation: 'My Lord, forgive me and my parents and whoever enters my house as a believer, and all believing men and women.', reference: 'نوح: 28' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مَنَازِلَ الشُّهَدَاءِ وَعَيْشَ السُّعَدَاءِ وَمُرَافَقَةَ الْأَنْبِيَاءِ وَالنَّصْرَ عَلَى الْأَعْدَاءِ', translation: 'O Allah, I ask You for the stations of the martyrs, the life of the blessed, companionship of the prophets, and victory over the enemies.', reference: 'النسائي' },
  { arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ', translation: 'O Allah, You are Peace and from You is peace. Blessed are You, O Possessor of Majesty and Honor.', reference: 'مسلم' },
  { arabic: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنتَ أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ', translation: 'Glory be to You, O Allah, and praise be to You. I bear witness that there is no god but You. I seek Your forgiveness and repent to You.', reference: 'أبو داود والترمذي' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ بِأَنَّ لَكَ الْحَمْدَ لَا إِلَهَ إِلَّا أَنتَ الْمَنَّانُ بَدِيعُ السَّمَاوَاتِ وَالْأَرْضِ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ يَا حَيُّ يَا قَيُّومُ', translation: 'O Allah, I ask You, as all praise is due to You, there is no god but You, the Bestower, Originator of the heavens and the earth, O Possessor of Majesty and Honor.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ وَعَذَابِ الْقَبْرِ', translation: 'O Allah, I seek refuge in You from disbelief, poverty, and the torment of the grave.', reference: 'النسائي' },
  { arabic: 'اللَّهُمَّ اقْسِمْ لَنَا مِنْ خَشْيَتِكَ مَا تَحُولُ بِهِ بَيْنَنَا وَبَيْنَ مَعَاصِيكَ', translation: 'O Allah, apportion for us so much fear of You as will come between us and acts of disobedience.', reference: 'الترمذي' },
  { arabic: 'رَبِّ اجْعَلْ هَٰذَا الْبَلَدَ آمِنًا وَاجْنُبْنِي وَبَنِيَّ أَن نَّعْبُدَ الْأَصْنَامَ', translation: 'My Lord, make this city secure and keep me and my sons away from worshipping idols.', reference: 'إبراهيم: 35' },
  { arabic: 'اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ وَلَا مُعْطِيَ لِمَا مَنَعْتَ وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ', translation: 'O Allah, none can withhold what You give, none can give what You withhold, and no wealth avails its owner against You.', reference: 'البخاري ومسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ', translation: 'O Allah, I ask You for Paradise and I seek refuge in You from the Fire.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ بَارِكْ لِي فِي رِزْقِي وَأَهْلِي وَعَمَلِي', translation: 'O Allah, bless me in my provision, my family, and my work.', reference: 'الطبراني' },
  { arabic: 'رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ إِنَّ عَذَابَهَا كَانَ غَرَامًا', translation: 'Our Lord, avert from us the punishment of Hell. Indeed, its punishment is ever-adhering.', reference: 'الفرقان: 65' },
  { arabic: 'اللَّهُمَّ أَعُوذُ بِكَ مِنَ الْجُوعِ فَإِنَّهُ بِئْسَ الضَّجِيعُ', translation: 'O Allah, I seek refuge in You from hunger, for it is indeed an evil companion.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مَا سَأَلَكَ عِبَادُكَ الصَّالِحُونَ وَأَعُوذُ بِكَ مِمَّا اسْتَعَاذَ مِنْهُ عِبَادُكَ الصَّالِحُونَ', translation: 'O Allah, I ask You for what Your righteous servants asked You, and I seek refuge from what Your righteous servants sought refuge from.', reference: 'ابن ماجه' },
  { arabic: 'اللَّهُمَّ ارْزُقْنِي حُبَّكَ وَحُبَّ مَنْ يَنْفَعُنِي حُبُّهُ عِنْدَكَ', translation: 'O Allah, provide me Your love and the love of those whose love will benefit me with You.', reference: 'الترمذي' },
  { arabic: 'اللَّهُمَّ أَحْسَنْتَ خَلْقِي فَأَحْسِنْ خُلُقِي', translation: 'O Allah, You have perfected my creation, so perfect my character.', reference: 'أحمد' },
  { arabic: 'رَبَّنَا عَلَيْكَ تَوَكَّلْنَا وَإِلَيْكَ أَنَبْنَا وَإِلَيْكَ الْمَصِيرُ', translation: 'Our Lord, upon You we have relied, to You we have turned, and to You is the final destination.', reference: 'الممتحنة: 4' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مَا يَنْفَعُنِي مِنْ عِلْمِكَ وَأَعُوذُ بِكَ مِمَّا يَضُرُّنِي', translation: 'O Allah, I ask You for what benefits me from Your knowledge and I seek refuge from what harms me.', reference: 'الطبراني' },
  { arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي اللَّهُمَّ عَافِنِي فِي سَمْعِي اللَّهُمَّ عَافِنِي فِي بَصَرِي لَا إِلَهَ إِلَّا أَنْتَ', translation: 'O Allah, grant me well-being in my body, my hearing, and my sight. There is no god but You.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ أَلِّفْ بَيْنَ قُلُوبِنَا وَأَصْلِحْ ذَاتَ بَيْنِنَا وَاهْدِنَا سُبُلَ السَّلَامِ', translation: 'O Allah, bring our hearts together, reconcile between us, and guide us to the paths of peace.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ مُنْكَرَاتِ الْأَخْلَاقِ وَالْأَعْمَالِ وَالْأَهْوَاءِ', translation: 'O Allah, I seek refuge in You from evil morals, evil deeds, and evil desires.', reference: 'الترمذي' },
  { arabic: 'اللَّهُمَّ أَنْتَ عَضُدِي وَنَصِيرِي بِكَ أَحُولُ وَبِكَ أَصُولُ وَبِكَ أُقَاتِلُ', translation: 'O Allah, You are my supporter and my helper. By You I move, by You I charge, and by You I fight.', reference: 'أبو داود' },
  { arabic: 'رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلَّذِينَ كَفَرُوا وَاغْفِرْ لَنَا رَبَّنَا إِنَّكَ أَنتَ الْعَزِيزُ الْحَكِيمُ', translation: 'Our Lord, make us not a trial for the disbelievers and forgive us, our Lord. Indeed, You are the Mighty, the Wise.', reference: 'الممتحنة: 5' },
  { arabic: 'اللَّهُمَّ وَفِّقْنِي لِأَحَبِّ الْأَعْمَالِ إِلَيْكَ وَأَقْرَبِهَا مِنْكَ', translation: 'O Allah, grant me success in the deeds most beloved and closest to You.', reference: 'الطبراني' },
  { arabic: 'رَبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ وَاجْعَل لِّي مِن لَّدُنكَ سُلْطَانًا نَّصِيرًا', translation: 'My Lord, let me enter a sound entrance and let me exit a sound exit, and grant me from Yourself a supporting authority.', reference: 'الإسراء: 80' },
  { arabic: 'اللَّهُمَّ زِدْنِي إِيمَانًا وَيَقِينًا وَفِقْهًا', translation: 'O Allah, increase me in faith, certainty, and understanding.', reference: 'الطبراني' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ قَلْبٍ لَا يَخْشَعُ وَمِنْ دُعَاءٍ لَا يُسْمَعُ وَمِنْ نَفْسٍ لَا تَشْبَعُ وَمِنْ عِلْمٍ لَا يَنْفَعُ', translation: 'O Allah, I seek refuge from a heart that does not humble, a supplication that is not heard, a soul that is never satisfied, and knowledge that does not benefit.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي وَعَلِّمْنِي مَا يَنْفَعُنِي وَزِدْنِي عِلْمًا', translation: 'O Allah, benefit me by what You have taught me, teach me what will benefit me, and increase me in knowledge.', reference: 'ابن ماجه' },
  { arabic: 'اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي', translation: 'O Allah, conceal my faults and calm my fears.', reference: 'أبو داود' },
  { arabic: 'اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلَامِ وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الْإِيمَانِ', translation: 'O Allah, whoever among us You give life, let him live upon Islam, and whoever You take, take him upon faith.', reference: 'أبو داود والترمذي' },
  { arabic: 'رَبِّ ابْنِ لِي عِندَكَ بَيْتًا فِي الْجَنَّةِ', translation: 'My Lord, build for me near You a house in Paradise.', reference: 'التحريم: 11' },
];

/**
 * Get the dua of the day based on the day of the year (deterministic).
 * Returns the same dua for the same calendar day.
 */
export function getDuaOfTheDay(): DailyDua {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_DUAS[dayOfYear % DAILY_DUAS.length];
}

/** Total number of available duas */
export const TOTAL_DUAS = DAILY_DUAS.length;

/**
 * Get a random dua, excluding the given index to avoid immediate repeats.
 * Returns { dua, index } so the caller can track which one was shown.
 */
export function getRandomDua(excludeIndex?: number): { dua: DailyDua; index: number } {
  let idx: number;
  do {
    idx = Math.floor(Math.random() * DAILY_DUAS.length);
  } while (idx === excludeIndex && DAILY_DUAS.length > 1);
  return { dua: DAILY_DUAS[idx], index: idx };
}

/**
 * Get a dua by index (clamped to valid range).
 */
export function getDuaByIndex(index: number): DailyDua {
  return DAILY_DUAS[((index % DAILY_DUAS.length) + DAILY_DUAS.length) % DAILY_DUAS.length];
}
