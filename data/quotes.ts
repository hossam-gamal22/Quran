// data/quotes.ts
// حكمة اليوم: قصة كاملة مختصرة مع شاهد من القرآن أو السنة أو الدعاء.

export interface IslamicQuote {
  arabic: string;
  translation: string;
  author: string;
  source?: string;
  evidenceArabic?: string;
  evidenceTranslation?: string;
  quranRef?: {
    surah: number;
    ayah: number;
  };
  translations?: Record<string, string>;
}

export const WISDOM_BACKUP_DAYS = 30;

const ISLAMIC_QUOTES: IslamicQuote[] = [
  {
    arabic: 'في طريق الهجرة، دخل النبي صلى الله عليه وسلم وأبو بكر رضي الله عنه غار ثور، ووصل المطاردون إلى باب الغار حتى قال أبو بكر: لو نظر أحدهم تحت قدميه لرآنا. كان الموقف يستدعي خوفا طبيعيا، لكن النبي صلى الله عليه وسلم ربط قلب صاحبه بالله قبل أن يطمئنه بالأسباب. الحكمة هنا أن المؤمن يأخذ بالأسباب ثم لا يجعل قلبه أسيرا لها؛ فإذا ضاقت الأرض بقي باب معية الله مفتوحا.',
    translation: 'During the Hijrah, the Prophet and Abu Bakr entered the cave of Thawr. The pursuers reached the mouth of the cave, and Abu Bakr said that if one of them looked beneath his feet, he would see them. The moment naturally called for fear, but the Prophet tied his companion\'s heart to Allah before reassuring him through worldly means. The wisdom is to take the means without letting the heart become captive to them; when the earth feels tight, Allah\'s companionship remains open.',
    author: 'الحكمة: خذ بالأسباب ولا تترك قلبك لها',
    source: 'التوبة: 40',
    quranRef: { surah: 9, ayah: 40 },
    evidenceArabic: 'لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا',
    evidenceTranslation: 'Do not grieve; indeed Allah is with us.',
  },
  {
    arabic: 'في صلح الحديبية، رجع كثير من الصحابة وفي صدورهم ألم؛ فقد بدا لهم أن شروط الصلح ثقيلة وأن العمرة التي خرجوا لها لم تتم. لكن النبي صلى الله عليه وسلم كان ينظر إلى ما وراء اللحظة، فقبل صلحا فتح باب الدعوة والأمان، ثم ظهر أثره في دخول الناس في الإسلام. الحكمة أن القرار الصائب لا يقاس دائما براحة اللحظة، بل بما يفتحه الله من أبواب بعد الصبر.',
    translation: 'At Hudaybiyyah, many companions felt pain because the treaty seemed heavy and the Umrah they had set out for did not happen. Yet the Prophet saw beyond the immediate moment. He accepted a treaty that opened the door to safety and dawah, and its effects later appeared in people entering Islam. The wisdom is that a correct decision is not always measured by immediate comfort, but by the doors Allah opens after patience.',
    author: 'الحكمة: بعض الفتح يأتي في صورة تأخير',
    source: 'الفتح: 1',
    quranRef: { surah: 48, ayah: 1 },
    evidenceArabic: 'إِنَّا فَتَحْنَا لَكَ فَتْحًا مُّبِينًا',
    evidenceTranslation: 'Indeed, We have given you a clear conquest.',
  },
  {
    arabic: 'لما اجتمعت الأحزاب حول المدينة، كان الخطر أكبر من المعتاد، فجاء سلمان الفارسي رضي الله عنه برأي لم تعرفه العرب في حروبها: حفر الخندق. قبل النبي صلى الله عليه وسلم الرأي، وشارك الصحابة في العمل، فتحول الخوف إلى خطة وعمل جماعي. الحكمة أن الشورى ليست ضعفا في القيادة، بل قوة تجعل الخبرة عبادة إذا قصد بها نصرة الحق.',
    translation: 'When the confederate armies surrounded Madinah, the danger was unlike previous threats. Salman Al-Farisi suggested a strategy Arabs were not used to: digging a trench. The Prophet accepted the advice, and the companions worked together, turning fear into planning and collective effort. The wisdom is that consultation is not weakness in leadership; it is strength that turns experience into worship when it serves the truth.',
    author: 'الحكمة: الشورى قوة وليست نقصا',
    source: 'آل عمران: 159',
    quranRef: { surah: 3, ayah: 159 },
    evidenceArabic: 'وَشَاوِرْهُمْ فِي الْأَمْرِ',
    evidenceTranslation: 'And consult them in the matter.',
  },
  {
    arabic: 'بعد حادثة الإفك، نزلت براءة عائشة رضي الله عنها، وكان ممن خاض في الكلام مسطح بن أثاثة، وهو قريب لأبي بكر رضي الله عنه وكان أبو بكر ينفق عليه. وجد أبو بكر في نفسه ألما شديدا، فأقسم أن يقطع عنه النفقة، فنزل القرآن يربي القلوب على العفو. الحكمة أن من أراد عفو الله فليجعل لعفوه أثرا في معاملته للناس، خاصة عند القدرة على العقوبة.',
    translation: 'After the incident of slander, Aisha was declared innocent by revelation. Among those involved in the talk was Mistah ibn Uthathah, a relative of Abu Bakr whom Abu Bakr financially supported. Abu Bakr was deeply hurt and swore to stop supporting him, then the Quran came to train hearts upon forgiveness. The wisdom is that whoever wants Allah\'s pardon should let pardon appear in how he treats people, especially when he has the power to punish.',
    author: 'الحكمة: العفو عبادة عند القدرة',
    source: 'النور: 22',
    quranRef: { surah: 24, ayah: 22 },
    evidenceArabic: 'أَلَا تُحِبُّونَ أَن يَغْفِرَ اللَّهُ لَكُمْ',
    evidenceTranslation: 'Do you not love that Allah should forgive you?',
  },
  {
    arabic: 'تخلف كعب بن مالك رضي الله عنه عن غزوة تبوك بلا عذر حقيقي، فلما رجع النبي صلى الله عليه وسلم جاء المعتذرون يزينون أعذارهم، أما كعب فاختار الصدق رغم قسوته. طال عليه البلاء، وهجره الناس بأمر النبي صلى الله عليه وسلم، لكنه لم يهرب من الحقيقة. فلما تاب الله عليه، صارت قصته شاهدا أن الصدق قد يؤلم في البداية لكنه ينجي في النهاية.',
    translation: 'Ka‘b ibn Malik stayed behind from Tabuk without a true excuse. When the Prophet returned, others decorated their excuses, but Ka‘b chose honesty despite its pain. The trial lasted, and people were instructed to avoid him, yet he did not run from the truth. When Allah accepted his repentance, his story became proof that truthfulness may hurt at first but saves in the end.',
    author: 'الحكمة: الصدق طريق النجاة ولو طال',
    source: 'التوبة: 119',
    quranRef: { surah: 9, ayah: 119 },
    evidenceArabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَكُونُوا مَعَ الصَّادِقِينَ',
    evidenceTranslation: 'O believers, fear Allah and be with the truthful.',
  },
  {
    arabic: 'كان أبو طلحة رضي الله عنه يحب بستانه بيرحاء، وكان من أحب أمواله إليه. فلما سمع قول الله تعالى إن البر لا ينال حتى ينفق الإنسان مما يحب، لم يبحث عن أقل ما يخرجه، بل ذهب إلى أحب ما عنده وجعله لله. الحكمة أن الصدقة ليست فقط مقدار ما تعطي، بل مقدار ما ينتصر قلبك على التعلق بما تحب.',
    translation: 'Abu Talha loved his garden Bayruha; it was among his dearest possessions. When he heard Allah\'s statement that righteousness is not attained until one spends from what one loves, he did not look for the least he could give. He went to what was most beloved to him and gave it for Allah. The wisdom is that charity is not only about how much you give, but how much the heart overcomes attachment to what it loves.',
    author: 'الحكمة: أعظم البذل ما خرج من المحبوب',
    source: 'آل عمران: 92',
    quranRef: { surah: 3, ayah: 92 },
    evidenceArabic: 'لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ',
    evidenceTranslation: 'You will never attain righteousness until you spend from what you love.',
  },
  {
    arabic: 'كان بلال رضي الله عنه يعذب في مكة ليترك التوحيد، فيشتد عليه الأذى ويكرر: أحد أحد. لم تكن الكلمة طويلة، لكنها كانت تحمل قلبا عرف ربه، فصارت أقوى من الألم. الحكمة أن الثبات لا يحتاج دائما إلى كلام كثير؛ يحتاج إلى يقين واضح تعرف لأجله لماذا تصبر.',
    translation: 'Bilal was tortured in Makkah so that he would abandon tawhid, yet under severe harm he kept repeating: One, One. The phrase was short, but it carried a heart that knew its Lord, so it became stronger than pain. The wisdom is that steadfastness does not always need many words; it needs clear certainty that tells you why you endure.',
    author: 'الحكمة: الثبات يبدأ من وضوح الغاية',
    source: 'فصلت: 30',
    quranRef: { surah: 41, ayah: 30 },
    evidenceArabic: 'إِنَّ الَّذِينَ قَالُوا رَبُّنَا اللَّهُ ثُمَّ اسْتَقَامُوا',
    evidenceTranslation: 'Indeed, those who say, "Our Lord is Allah," then remain steadfast.',
  },
  {
    arabic: 'نشأ مصعب بن عمير رضي الله عنه في نعمة ورقة حال، ثم لما عرف الإسلام اختار الحق ولو خسر مظاهر الدنيا. أرسله النبي صلى الله عليه وسلم إلى المدينة قبل الهجرة، فكان سببا في دخول بيوت كثيرة في الإسلام بالحكمة واللين. الحكمة أن قيمة الإنسان ليست في رفاهه، بل في الرسالة التي يحملها والقلوب التي يهديها الله على يديه.',
    translation: 'Mus‘ab ibn Umayr grew up in comfort and refinement, then when he knew Islam he chose the truth even if worldly appearances were lost. The Prophet sent him to Madinah before the Hijrah, and through wisdom and gentleness he became a means for many homes to enter Islam. The wisdom is that a person\'s value is not in luxury, but in the message he carries and the hearts Allah guides through him.',
    author: 'الحكمة: الرسالة أغلى من المظهر',
    source: 'الأحزاب: 23',
    quranRef: { surah: 33, ayah: 23 },
    evidenceArabic: 'مِنَ الْمُؤْمِنِينَ رِجَالٌ صَدَقُوا مَا عَاهَدُوا اللَّهَ عَلَيْهِ',
    evidenceTranslation: 'Among the believers are men who were true to what they pledged to Allah.',
  },
  {
    arabic: 'في الحديبية، لما تأخر الصحابة في التحلل من الإحرام لشدة ما وجدوا في نفوسهم، دخل النبي صلى الله عليه وسلم على أم سلمة رضي الله عنها فاستشارها. أشارت عليه أن يخرج فينحر ويحلق دون أن يكلم أحدا، فلما رأى الصحابة فعله قاموا وفعلوا. الحكمة أن الرأي الهادئ وقت الاضطراب قد يفتح بابا تعجز عنه الكلمات الكثيرة.',
    translation: 'At Hudaybiyyah, when the companions delayed ending their ihram because of the heaviness they felt, the Prophet went to Umm Salamah and consulted her. She advised him to go out, sacrifice, and shave without speaking to anyone. When the companions saw him act, they rose and followed. The wisdom is that calm advice in a moment of tension can open a door that many words cannot.',
    author: 'الحكمة: الهدوء يرى ما لا يراه الغضب',
    source: 'البخاري',
    evidenceArabic: 'مَا خَابَ مَنِ اسْتَخَارَ، وَلَا نَدِمَ مَنِ اسْتَشَارَ',
    evidenceTranslation: 'The one who seeks guidance is not disappointed, and the one who consults does not regret.',
  },
  {
    arabic: 'قال سعد بن أبي وقاص رضي الله عنه إن أمه ضغطت عليه ليترك الإسلام، حتى امتنعت عن الطعام، وكان ذلك اختبارا قاسيا بين بر الوالدة والثبات على الدين. لم يأمره الإسلام بالقسوة عليها، ولم يأمره بطاعتها في ترك الحق. الحكمة أن البر لا يعني طاعة المخلوق في معصية الخالق، وأن الثبات يمكن أن يجتمع مع حسن الصحبة.',
    translation: 'Sa‘d ibn Abi Waqqas faced intense pressure from his mother to leave Islam, to the point that she refused food. It was a hard test between honoring a parent and remaining firm upon faith. Islam did not command him to be harsh to her, nor did it command him to obey her in leaving the truth. The wisdom is that dutifulness does not mean obeying creation in disobedience to the Creator, and firmness can exist with good companionship.',
    author: 'الحكمة: اثبت بلا قسوة وبر بلا تنازل عن الحق',
    source: 'لقمان: 15',
    quranRef: { surah: 31, ayah: 15 },
    evidenceArabic: 'وَصَاحِبْهُمَا فِي الدُّنْيَا مَعْرُوفًا',
    evidenceTranslation: 'And accompany them in this world with kindness.',
  },
  {
    arabic: 'خدم أنس بن مالك رضي الله عنه النبي صلى الله عليه وسلم عشر سنين، فكان يذكر أنه ما قال له أف قط، ولا عاتبه على شيء فعله أو تركه. هذا الموقف الطويل ليس لحظة عابرة، بل مدرسة في التربية بالرحمة. الحكمة أن حسن الخلق يظهر أكثر ما يظهر مع من تملك عليهم سلطة أو قربا يوميا.',
    translation: 'Anas ibn Malik served the Prophet for ten years, and he recalled that the Prophet never even said "uff" to him, nor blamed him for something he did or left. This long experience was not a passing moment; it was a school of mercy in upbringing. The wisdom is that good character appears most clearly with those over whom you have authority or daily closeness.',
    author: 'الحكمة: الأخلاق تظهر في المعاملة اليومية',
    source: 'مسلم',
    evidenceArabic: 'إِنَّ مِنْ خِيَارِكُمْ أَحَاسِنَكُمْ أَخْلَاقًا',
    evidenceTranslation: 'The best among you are those with the best character.',
  },
  {
    arabic: 'دخل أعرابي المسجد فبال فيه، فقام بعض الصحابة ليزجروه، لكن النبي صلى الله عليه وسلم أمرهم أن يتركوه حتى يفرغ، ثم علمه برفق أن المساجد لا تصلح لهذا. كان الخطأ واضحا، لكن طريقة علاجه كانت أهدى من الغضب. الحكمة أن تصحيح الخطأ يحتاج إلى علم بالحق ورحمة بالجاهل.',
    translation: 'A Bedouin entered the mosque and urinated in it. Some companions moved to stop him harshly, but the Prophet told them to leave him until he finished, then gently taught him that mosques are not for such things. The mistake was obvious, but the way it was treated was wiser than anger. The wisdom is that correcting mistakes needs knowledge of the truth and mercy toward the ignorant.',
    author: 'الحكمة: الرفق يصلح ما يفسده الغضب',
    source: 'البخاري ومسلم',
    evidenceArabic: 'إِنَّ الرِّفْقَ لَا يَكُونُ فِي شَيْءٍ إِلَّا زَانَهُ',
    evidenceTranslation: 'Gentleness is not found in anything except that it beautifies it.',
  },
  {
    arabic: 'كان أبو هريرة رضي الله عنه حريصا على إسلام أمه، فدعاها مرات، وسمع منها ما آلمه في شأن النبي صلى الله عليه وسلم، فذهب باكيا يطلب الدعاء. دعا النبي صلى الله عليه وسلم لها، فرجع فوجدها قد أسلمت. الحكمة أن الدعوة إلى أقرب الناس قد تحتاج صبرا ودعاء أكثر من الجدل.',
    translation: 'Abu Hurairah was eager for his mother to accept Islam. He invited her repeatedly and once heard words about the Prophet that hurt him, so he went weeping and asked for dua. The Prophet supplicated for her, and Abu Hurairah returned to find that she had accepted Islam. The wisdom is that inviting those closest to us may require patience and dua more than argument.',
    author: 'الحكمة: الدعاء باب القلوب المغلقة',
    source: 'غافر: 60',
    quranRef: { surah: 40, ayah: 60 },
    evidenceArabic: 'ادْعُونِي أَسْتَجِبْ لَكُمْ',
    evidenceTranslation: 'Call upon Me; I will respond to you.',
  },
  {
    arabic: 'علّم النبي صلى الله عليه وسلم أصحابه أن النصرة ليست تعصبا أعمى. قال: انصر أخاك ظالما أو مظلوما، فلما سألوا كيف ينصرونه ظالما، بيّن أن نصره يكون بمنعه من الظلم. الحكمة أن المحبة الصادقة لا تترك صاحبها يغرق في الخطأ باسم الوفاء.',
    translation: 'The Prophet taught his companions that support is not blind partisanship. He said to help your brother whether he is an oppressor or oppressed. When they asked how to help him as an oppressor, he explained that helping him means stopping him from oppression. The wisdom is that sincere love does not let someone drown in wrong under the name of loyalty.',
    author: 'الحكمة: النصيحة من الرحمة',
    source: 'البخاري',
    evidenceArabic: 'انْصُرْ أَخَاكَ ظَالِمًا أَوْ مَظْلُومًا',
    evidenceTranslation: 'Help your brother whether he is an oppressor or oppressed.',
  },
  {
    arabic: 'لما آخى النبي صلى الله عليه وسلم بين المهاجرين والأنصار، لم تكن الأخوة شعارا يقال، بل واقعا عاشه الناس. فتح الأنصار بيوتهم وقلوبهم لمن تركوا أموالهم وديارهم لله. الحكمة أن الإيمان يصنع مجتمعا لا يكتفي بالتعاطف، بل يحول المحبة إلى مواساة وعمل.',
    translation: 'When the Prophet established brotherhood between the Muhajirun and Ansar, brotherhood was not a slogan; it became lived reality. The Ansar opened their homes and hearts to those who had left wealth and homeland for Allah. The wisdom is that faith builds a community that does not stop at sympathy, but turns love into support and action.',
    author: 'الحكمة: الأخوة عبادة عملية',
    source: 'الحشر: 9',
    quranRef: { surah: 59, ayah: 9 },
    evidenceArabic: 'وَيُؤْثِرُونَ عَلَىٰ أَنفُسِهِمْ وَلَوْ كَانَ بِهِمْ خَصَاصَةٌ',
    evidenceTranslation: 'They give preference over themselves, even though they are in need.',
  },
  {
    arabic: 'جاء معاذ بن جبل رضي الله عنه يطلب من النبي صلى الله عليه وسلم عملا يقربه من الجنة ويباعده من النار، فدله على أبواب عظيمة، ومنها تقوى الله وحسن الخلق. لم يجعل النبي العبادة منعزلة عن حياة الناس، بل ربط صلاح القلب بصلاح المعاملة. الحكمة أن طريق الجنة يمر من محرابك ومن أخلاقك معا.',
    translation: 'Mu‘adh ibn Jabal asked the Prophet for a deed that would bring him close to Paradise and keep him away from the Fire. The Prophet guided him to great doors, including taqwa and good character. He did not isolate worship from people\'s lives; he connected the heart\'s righteousness with righteous conduct. The wisdom is that the path to Paradise passes through both your worship and your character.',
    author: 'الحكمة: حسن الخلق ثمرة العبادة',
    source: 'الترمذي',
    evidenceArabic: 'اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ',
    evidenceTranslation: 'Fear Allah wherever you are, follow a bad deed with a good deed to erase it, and treat people with good character.',
  },
  {
    arabic: 'في غزوة أحد، وقع ما وقع من مخالفة بعض الرماة، وتعرض المسلمون لابتلاء شديد. لم يكن الدرس مجرد هزيمة عسكرية، بل تربية على أثر الطاعة والصبر عند اضطراب الأحداث. الحكمة أن لحظة واحدة من مخالفة التوجيه قد تفتح باب ألم طويل، وأن الرجوع إلى الله يحول الألم إلى علم.',
    translation: 'At Uhud, some archers disobeyed the instruction, and the Muslims faced a severe trial. The lesson was not merely military loss; it was training in the effect of obedience and patience when events become unstable. The wisdom is that one moment of ignoring guidance can open a long door of pain, and returning to Allah can turn pain into learning.',
    author: 'الحكمة: الطاعة تحفظ الجماعة',
    source: 'آل عمران: 152',
    quranRef: { surah: 3, ayah: 152 },
    evidenceArabic: 'وَلَقَدْ صَدَقَكُمُ اللَّهُ وَعْدَهُ إِذْ تَحُسُّونَهُم بِإِذْنِهِ',
    evidenceTranslation: 'Allah had certainly fulfilled His promise to you when you were killing them by His permission.',
  },
  {
    arabic: 'لما مات ابن النبي صلى الله عليه وسلم إبراهيم، بكى النبي وقال كلمة جمعت بين الرحمة والرضا. لم يمنع الإيمان دمعة العين، ولم يجعل الحزن اعتراضا على قدر الله. الحكمة أن القلب المؤمن يحزن بصدق، لكنه لا يقول إلا ما يرضي ربه.',
    translation: 'When the Prophet\'s son Ibrahim died, the Prophet wept and said words that combined mercy and acceptance. Faith did not prevent tears, and grief did not become objection to Allah\'s decree. The wisdom is that a believing heart grieves honestly, but it says only what pleases its Lord.',
    author: 'الحكمة: الرضا لا يلغي الحزن',
    source: 'البخاري ومسلم',
    evidenceArabic: 'إِنَّ الْعَيْنَ تَدْمَعُ، وَالْقَلْبَ يَحْزَنُ، وَلَا نَقُولُ إِلَّا مَا يُرْضِي رَبَّنَا',
    evidenceTranslation: 'The eye sheds tears, the heart grieves, and we say only what pleases our Lord.',
  },
  {
    arabic: 'خرج النبي صلى الله عليه وسلم إلى الطائف يدعو إلى الله، فقوبل بالأذى والسخرية حتى سال دمه الشريف. ومع ذلك لم يكن قلبه مشغولا بالانتقام، بل ظل يرجو أن يخرج الله من أصلابهم من يعبده. الحكمة أن صاحب الرسالة يرى أبعد من جرح اللحظة، ويترك للرحمة مكانا حتى بعد الأذى.',
    translation: 'The Prophet went to Taif calling to Allah, but he was met with harm and mockery until his noble blood flowed. Yet his heart was not occupied with revenge; he hoped Allah would bring from their descendants people who worship Him. The wisdom is that a person of mission sees beyond the wound of the moment and leaves room for mercy even after harm.',
    author: 'الحكمة: الرحمة أقوى من رغبة الانتقام',
    source: 'البخاري ومسلم',
    evidenceArabic: 'بَلْ أَرْجُو أَنْ يُخْرِجَ اللَّهُ مِنْ أَصْلَابِهِمْ مَنْ يَعْبُدُ اللَّهَ وَحْدَهُ',
    evidenceTranslation: 'Rather, I hope Allah will bring from their descendants those who worship Allah alone.',
  },
  {
    arabic: 'في قصة يوسف عليه السلام، اجتمعت عليه الفتنة وهو غريب مملوك، وأغلقت الأبواب، ودعي إلى معصية تزينت بكل أسبابها. لكنه رأى أن النجاة في قول: معاذ الله. الحكمة أن الخلوة لا تختبر قوة الجسد فقط، بل تختبر حضور الله في القلب.',
    translation: 'In the story of Yusuf, temptation surrounded him while he was a stranger and enslaved. The doors were locked, and sin came decorated with every apparent means. Yet he saw salvation in saying: I seek refuge in Allah. The wisdom is that privacy does not only test bodily strength; it tests the presence of Allah in the heart.',
    author: 'الحكمة: مراقبة الله تنجي عند إغلاق الأبواب',
    source: 'يوسف: 23',
    quranRef: { surah: 12, ayah: 23 },
    evidenceArabic: 'قَالَ مَعَاذَ اللَّهِ',
    evidenceTranslation: 'He said, "I seek refuge in Allah."',
  },
  {
    arabic: 'خرج موسى عليه السلام من مصر خائفا لا يملك شيئا، فلما وصل إلى مدين وجد امرأتين تنتظران عند الماء، فساعدهما دون أن يطلب مقابلا، ثم جلس فقيرا يدعو ربه. الحكمة أن المعروف لا يحتاج إلى وفرة مال، وأن الدعاء بعد العمل يفتح أبوابا لا يتوقعها العبد.',
    translation: 'Musa left Egypt afraid and possessing nothing. When he reached Madyan, he found two women waiting by the water, so he helped them without asking for anything in return, then sat in need and called upon his Lord. The wisdom is that doing good does not require wealth, and dua after action opens doors the servant does not expect.',
    author: 'الحكمة: اصنع المعروف ثم ارفع حاجتك لله',
    source: 'القصص: 24',
    quranRef: { surah: 28, ayah: 24 },
    evidenceArabic: 'رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
    evidenceTranslation: 'My Lord, indeed I am in need of whatever good You send down to me.',
  },
  {
    arabic: 'كانت مريم عليها السلام في موقف عظيم؛ ولادة بلا زوج وقوم ينتظرون الجواب. أمرها الله أن تصوم عن الكلام، وأن تحمل الموقف بثقة وتسليم. الحكمة أن بعض المواقف لا يصلحها كثرة الدفاع عن النفس، بل يصلحها صدق التوكل وترك الأمر لله.',
    translation: 'Maryam was in an overwhelming situation: a birth without a husband and a people waiting for an explanation. Allah commanded her to refrain from speaking and to carry the moment with trust and surrender. The wisdom is that some situations are not repaired by excessive self-defense, but by sincere reliance and leaving the matter to Allah.',
    author: 'الحكمة: ليس كل مقام يحتاج إلى كلام',
    source: 'مريم: 26',
    quranRef: { surah: 19, ayah: 26 },
    evidenceArabic: 'فَقُولِي إِنِّي نَذَرْتُ لِلرَّحْمَٰنِ صَوْمًا',
    evidenceTranslation: 'Say, "I have vowed a fast to the Most Merciful."',
  },
  {
    arabic: 'ترك إبراهيم عليه السلام هاجر وابنها إسماعيل في واد غير ذي زرع بأمر الله، فسعت هاجر بين الصفا والمروة تبحث عن الماء، تجمع بين التوكل والحركة. لم تنتظر الرزق وهي ساكنة، ولم تعتمد على سعيها وحده. الحكمة أن التوكل الحق يجمع قلبا مع الله وقدما تتحرك في الأرض.',
    translation: 'Ibrahim left Hajar and her son Ismail in a barren valley by Allah\'s command. Hajar ran between Safa and Marwah seeking water, combining reliance with movement. She did not wait for provision while motionless, nor did she depend on her effort alone. The wisdom is that true reliance combines a heart with Allah and feet that move on earth.',
    author: 'الحكمة: التوكل عمل قلب وسعي جوارح',
    source: 'البخاري',
    evidenceArabic: 'فَإِنَّ اللَّهَ لَا يُضَيِّعُنَا',
    evidenceTranslation: 'Then Allah will not neglect us.',
  },
  {
    arabic: 'لما بلغ إسماعيل عليه السلام مع أبيه السعي، أخبره إبراهيم عليه السلام بأمر الذبح، فجاء جواب الابن تسليما لا تمردا. لم تكن القصة عن ألم فقط، بل عن بيت تربى على أن أمر الله مقدم على هوى النفس. الحكمة أن التربية الإيمانية تظهر عند الاختبار، حين يختار القلب مراد الله وهو لا يفهم كل الحكمة.',
    translation: 'When Ismail reached the age of working with his father, Ibrahim told him of the command to sacrifice him. The son\'s response was surrender, not rebellion. The story is not only about pain; it is about a household raised to place Allah\'s command before personal desire. The wisdom is that faith-based upbringing appears during tests, when the heart chooses what Allah wants even without knowing every wisdom.',
    author: 'الحكمة: التسليم ثمرة معرفة الله',
    source: 'الصافات: 102',
    quranRef: { surah: 37, ayah: 102 },
    evidenceArabic: 'يَا أَبَتِ افْعَلْ مَا تُؤْمَرُ',
    evidenceTranslation: 'O my father, do as you are commanded.',
  },
  {
    arabic: 'لبث نوح عليه السلام يدعو قومه زمنا طويلا، سرا وجهرا، ليلا ونهارا، ومع ذلك لم يؤمن معه إلا قليل. لم يكن بطء النتائج دليلا على فشل الدعوة، بل كان امتحانا للإخلاص والصبر. الحكمة أن العمل لله لا يقاس دائما بعدد المستجيبين، بل بصدق البلاغ والثبات.',
    translation: 'Nuh called his people for a very long time, privately and publicly, by night and by day, yet only a few believed with him. Slow results were not proof of failed dawah; they were a test of sincerity and patience. The wisdom is that work for Allah is not always measured by the number of responders, but by truthful delivery and steadfastness.',
    author: 'الحكمة: الثبات لا ينتظر التصفيق',
    source: 'نوح: 5',
    quranRef: { surah: 71, ayah: 5 },
    evidenceArabic: 'رَبِّ إِنِّي دَعَوْتُ قَوْمِي لَيْلًا وَنَهَارًا',
    evidenceTranslation: 'My Lord, I invited my people night and day.',
  },
  {
    arabic: 'في قصة أصحاب الكهف، كان الفتية قادرين على مسايرة قومهم ظاهرا، لكنهم خافوا على دينهم فآثروا العزلة المؤقتة على ذوبان الإيمان. لم يخرجوا طلبا للشهرة، بل حفظا لما في قلوبهم. الحكمة أن حفظ الدين قد يحتاج أحيانا إلى ترك بيئة تضعف القلب.',
    translation: 'In the story of the People of the Cave, the youths could have outwardly gone along with their people, but they feared for their faith and chose temporary isolation over the dissolving of belief. They did not leave seeking fame; they left to preserve what was in their hearts. The wisdom is that protecting faith may sometimes require leaving an environment that weakens the heart.',
    author: 'الحكمة: سلامة القلب مقدمة على رضا الناس',
    source: 'الكهف: 13',
    quranRef: { surah: 18, ayah: 13 },
    evidenceArabic: 'إِنَّهُمْ فِتْيَةٌ آمَنُوا بِرَبِّهِمْ وَزِدْنَاهُمْ هُدًى',
    evidenceTranslation: 'They were youths who believed in their Lord, and We increased them in guidance.',
  },
  {
    arabic: 'علّم لقمان ابنه وهو يعظه، فبدأ بالتوحيد ثم بالصلاة والأمر بالمعروف والصبر وحسن الخلق. لم يجعل التربية أوامر متفرقة، بل بنى قلب الابن قبل سلوكه. الحكمة أن النصيحة النافعة تبدأ بالأصل الأكبر، ثم تربط العبادة بالأخلاق والصبر.',
    translation: 'Luqman advised his son, beginning with tawhid, then prayer, enjoining good, patience, and good manners. He did not make upbringing a set of scattered commands; he built the child\'s heart before shaping behavior. The wisdom is that beneficial advice begins with the greatest foundation, then connects worship with character and patience.',
    author: 'الحكمة: التربية تبدأ من التوحيد',
    source: 'لقمان: 17',
    quranRef: { surah: 31, ayah: 17 },
    evidenceArabic: 'يَا بُنَيَّ أَقِمِ الصَّلَاةَ وَأْمُرْ بِالْمَعْرُوفِ وَانْهَ عَنِ الْمُنكَرِ وَاصْبِرْ عَلَىٰ مَا أَصَابَكَ',
    evidenceTranslation: 'O my son, establish prayer, enjoin what is right, forbid what is wrong, and be patient over what befalls you.',
  },
  {
    arabic: 'أعطى الله ذا القرنين ملكا وقوة، فلما طلب منه قوم أن يبني لهم سدا يحميهم، لم يستغل حاجتهم ولا نسب الفضل إلى نفسه. قال إن ما مكنه الله فيه خير، وطلب منهم عملا يعينون به. الحكمة أن صاحب القدرة الصالح يجعل قوته خدمة، وينسب الفضل لله لا لنفسه.',
    translation: 'Allah gave Dhul-Qarnayn power and authority. When a people asked him to build a barrier to protect them, he did not exploit their need or attribute the virtue to himself. He said what Allah had given him was better, and he asked them to help with work. The wisdom is that a righteous person with power turns strength into service and attributes the favor to Allah, not himself.',
    author: 'الحكمة: القوة أمانة لا زينة',
    source: 'الكهف: 95',
    quranRef: { surah: 18, ayah: 95 },
    evidenceArabic: 'مَا مَكَّنِّي فِيهِ رَبِّي خَيْرٌ',
    evidenceTranslation: 'What my Lord has established me in is better.',
  },
  {
    arabic: 'كان الرجل الذي قتل مئة نفس يبحث عن توبة، فدله عالم على ألا ييأس وأن يترك أرض السوء إلى أرض صالحة. مات في الطريق، فكان صدق توجهه سببا في رحمته. الحكمة أن التوبة ليست كلمة فقط؛ هي رجوع إلى الله وترك للبيئة التي تعيدك إلى الذنب.',
    translation: 'The man who had killed one hundred people sought repentance. A scholar told him not to despair and advised him to leave the land of evil for a righteous land. He died on the way, and the sincerity of his direction became a cause of mercy. The wisdom is that repentance is not only a word; it is returning to Allah and leaving the environment that pulls you back to sin.',
    author: 'الحكمة: اصدق في الرجوع ولو مت في الطريق',
    source: 'البخاري ومسلم',
    evidenceArabic: 'إِنَّ اللَّهَ يَقْبَلُ تَوْبَةَ الْعَبْدِ مَا لَمْ يُغَرْغِرْ',
    evidenceTranslation: 'Allah accepts the repentance of the servant as long as the soul has not reached the throat.',
  },
  {
    arabic: 'دخل رجل الجنة بسبب كلب سقاه، فقد رأى العطش في مخلوق ضعيف، فنزل إلى البئر وملأ خفه ماء. العمل في ظاهره صغير، لكنه خرج من قلب رحم. الحكمة أن أبواب رحمة الله قد تفتح بعمل لا يراه الناس كبيرا، إذا صدق فيه الإحسان.',
    translation: 'A man entered Paradise because he gave water to a thirsty dog. He saw thirst in a weak creature, went down into a well, filled his shoe with water, and gave it to drink. The act looked small outwardly, but it came from a merciful heart. The wisdom is that the doors of Allah\'s mercy may open through a deed people do not consider great, if it carries sincere excellence.',
    author: 'الحكمة: لا تحتقر بابا من الرحمة',
    source: 'البخاري ومسلم',
    evidenceArabic: 'فَشَكَرَ اللَّهُ لَهُ فَغَفَرَ لَهُ',
    evidenceTranslation: 'Allah appreciated his deed and forgave him.',
  },
  {
    arabic: 'كان أصحاب الأخدود أمام نار عظيمة وتهديد ظاهر، لكنهم اختاروا الإيمان على السلامة المؤقتة. لم تكن قوتهم في نجاتهم الجسدية، بل في وضوح الحق في قلوبهم. الحكمة أن المؤمن قد يخسر أشياء في الدنيا، لكنه لا يخسر إذا بقي قلبه مع الله.',
    translation: 'The People of the Trench faced a blazing fire and a visible threat, yet they chose faith over temporary safety. Their strength was not in bodily escape, but in the clarity of truth in their hearts. The wisdom is that a believer may lose things in this world, but he is not truly lost if his heart remains with Allah.',
    author: 'الحكمة: النجاة الحقيقية نجاة الإيمان',
    source: 'البروج: 8',
    quranRef: { surah: 85, ayah: 8 },
    evidenceArabic: 'وَمَا نَقَمُوا مِنْهُمْ إِلَّا أَن يُؤْمِنُوا بِاللَّهِ الْعَزِيزِ الْحَمِيدِ',
    evidenceTranslation: 'They resented them only because they believed in Allah, the Mighty, the Praiseworthy.',
  },
  {
    arabic: 'لما ابتلي أيوب عليه السلام في بدنه وأهله وماله، لم يجعل طول البلاء سببا لسوء الأدب مع الله. دعا بكلمات قليلة جمعت الاعتراف بالضر والثناء على رحمة الله. الحكمة أن البلاء الطويل يحتاج لسانا مؤدبا وقلبا لا ينسى رحمة ربه.',
    translation: 'When Ayyub was tested in his body, family, and wealth, the length of trial did not make him lose manners with Allah. He supplicated with few words that combined admission of harm with praise of Allah\'s mercy. The wisdom is that a long trial needs a disciplined tongue and a heart that does not forget the mercy of its Lord.',
    author: 'الحكمة: الشكوى إلى الله لا تنافي الصبر',
    source: 'الأنبياء: 83',
    quranRef: { surah: 21, ayah: 83 },
    evidenceArabic: 'أَنِّي مَسَّنِيَ الضُّرُّ وَأَنتَ أَرْحَمُ الرَّاحِمِينَ',
    evidenceTranslation: 'Indeed, adversity has touched me, and You are the Most Merciful of the merciful.',
  },
  {
    arabic: 'لما ابتلع الحوت يونس عليه السلام، كان في ظلمات البحر والحوت والليل، ولم يكن عنده سبب ظاهر للنجاة. لكنه رجع إلى التوحيد والاستغفار، فكان الدعاء مفتاح الفرج. الحكمة أن أضيق الأماكن لا تمنع وصول الدعاء إذا خرج من قلب منكسر موحد.',
    translation: 'When Yunus was swallowed by the whale, he was in the darkness of the sea, the whale, and the night, with no visible means of escape. Yet he returned to tawhid and seeking forgiveness, and dua became the key to relief. The wisdom is that the tightest places cannot block dua when it rises from a humbled heart upon tawhid.',
    author: 'الحكمة: افتح الضيق بالتوحيد',
    source: 'الأنبياء: 87',
    quranRef: { surah: 21, ayah: 87 },
    evidenceArabic: 'لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
    evidenceTranslation: 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.',
  },
];

function getDayOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
}

export function getQuoteIndexForDate(date = new Date()): number {
  return getDayOfYear(date) % ISLAMIC_QUOTES.length;
}

export function getQuoteForDate(date = new Date()): { quote: IslamicQuote; index: number } {
  const index = getQuoteIndexForDate(date);
  return { quote: ISLAMIC_QUOTES[index], index };
}

export function getQuoteOfTheDay(): IslamicQuote {
  return getQuoteForDate().quote;
}

export function getRandomQuote(excludeIndex?: number): { quote: IslamicQuote; index: number } {
  let index: number;
  do {
    index = Math.floor(Math.random() * ISLAMIC_QUOTES.length);
  } while (index === excludeIndex && ISLAMIC_QUOTES.length > 1);
  return { quote: ISLAMIC_QUOTES[index], index };
}

export function getQuoteBackupPool(startDate = new Date(), days = WISDOM_BACKUP_DAYS): IslamicQuote[] {
  return Array.from({ length: days }, (_, offset) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + offset);
    return getQuoteForDate(d).quote;
  });
}

export function getAllQuotes(): IslamicQuote[] {
  return ISLAMIC_QUOTES;
}

const AUTHOR_EN: Record<string, string> = {
  'الحكمة: خذ بالأسباب ولا تترك قلبك لها': 'Wisdom: take the means, but do not attach your heart to them',
  'الحكمة: بعض الفتح يأتي في صورة تأخير': 'Wisdom: some victories arrive in the form of delay',
  'الحكمة: الشورى قوة وليست نقصا': 'Wisdom: consultation is strength, not weakness',
  'الحكمة: العفو عبادة عند القدرة': 'Wisdom: forgiveness is worship when you have power',
  'الحكمة: الصدق طريق النجاة ولو طال': 'Wisdom: truthfulness is the path to safety, even if it takes time',
  'الحكمة: أعظم البذل ما خرج من المحبوب': 'Wisdom: the greatest giving comes from what is beloved',
  'الحكمة: الثبات يبدأ من وضوح الغاية': 'Wisdom: steadfastness begins with a clear purpose',
  'الحكمة: الرسالة أغلى من المظهر': 'Wisdom: the message is more valuable than appearance',
  'الحكمة: الهدوء يرى ما لا يراه الغضب': 'Wisdom: calmness sees what anger misses',
  'الحكمة: اثبت بلا قسوة وبر بلا تنازل عن الحق': 'Wisdom: be firm without harshness and kind without abandoning truth',
  'الحكمة: الأخلاق تظهر في المعاملة اليومية': 'Wisdom: character appears in daily dealings',
  'الحكمة: الرفق يصلح ما يفسده الغضب': 'Wisdom: gentleness repairs what anger ruins',
  'الحكمة: الدعاء باب القلوب المغلقة': 'Wisdom: dua is a door to closed hearts',
  'الحكمة: النصيحة من الرحمة': 'Wisdom: sincere advice is mercy',
  'الحكمة: الأخوة عبادة عملية': 'Wisdom: brotherhood is practical worship',
  'الحكمة: حسن الخلق ثمرة العبادة': 'Wisdom: good character is a fruit of worship',
  'الحكمة: الطاعة تحفظ الجماعة': 'Wisdom: obedience protects the community',
  'الحكمة: الرضا لا يلغي الحزن': 'Wisdom: acceptance does not erase grief',
  'الحكمة: الرحمة أقوى من رغبة الانتقام': 'Wisdom: mercy is stronger than the urge for revenge',
  'الحكمة: مراقبة الله تنجي عند إغلاق الأبواب': 'Wisdom: awareness of Allah saves when doors are closed',
  'الحكمة: اصنع المعروف ثم ارفع حاجتك لله': 'Wisdom: do good, then raise your need to Allah',
  'الحكمة: ليس كل مقام يحتاج إلى كلام': 'Wisdom: not every situation needs speech',
  'الحكمة: التوكل عمل قلب وسعي جوارح': 'Wisdom: reliance is a heart with Allah and limbs in motion',
  'الحكمة: التسليم ثمرة معرفة الله': 'Wisdom: surrender is the fruit of knowing Allah',
  'الحكمة: الثبات لا ينتظر التصفيق': 'Wisdom: steadfastness does not wait for applause',
  'الحكمة: سلامة القلب مقدمة على رضا الناس': 'Wisdom: the safety of the heart comes before people\'s approval',
  'الحكمة: التربية تبدأ من التوحيد': 'Wisdom: upbringing begins with tawhid',
  'الحكمة: القوة أمانة لا زينة': 'Wisdom: strength is a trust, not decoration',
  'الحكمة: اصدق في الرجوع ولو مت في الطريق': 'Wisdom: be sincere in returning, even if you die on the way',
  'الحكمة: لا تحتقر بابا من الرحمة': 'Wisdom: never belittle a door of mercy',
  'الحكمة: النجاة الحقيقية نجاة الإيمان': 'Wisdom: true salvation is the salvation of faith',
  'الحكمة: الشكوى إلى الله لا تنافي الصبر': 'Wisdom: complaining to Allah does not contradict patience',
  'الحكمة: افتح الضيق بالتوحيد': 'Wisdom: open tightness with tawhid',
};

export function getAuthorDisplay(author: string, isArabic: boolean): string {
  if (isArabic) return author;
  return AUTHOR_EN[author] || author;
}

export default ISLAMIC_QUOTES;
