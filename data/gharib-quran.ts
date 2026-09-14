// data/gharib-quran.ts
// غريب القرآن — قاموس منتقى لأشهر الكلمات الغريبة في القرآن مع معانيها المختصرة
// المعاني مأخوذة من التفاسير المعتمدة (التفسير الميسّر، غريب القرآن لابن قتيبة،
// تفسير الجلالين، كلمات القرآن للشيخ حسنين مخلوف). قابلة للتوسعة لاحقًا.

export interface GharibWord {
  /** الكلمة الغريبة كما ترد في الآية (بتشكيل خفيف للقراءة) */
  word: string;
  /** المعنى المختصر الموثوق */
  meaning: string;
  /** رقم السورة (1-114) */
  surah: number;
  /** رقم الآية داخل السورة */
  ayah: number;
  /** اسم السورة بالعربية */
  surahName: string;
}

export const GHARIB_WORDS: GharibWord[] = [
  { word: 'حَنِيفًا', meaning: 'مائلًا عن كل دين باطل إلى دين الإسلام، مستقيمًا عليه.', surah: 3, ayah: 67, surahName: 'آل عمران' },
  { word: 'صِبْغَةَ اللَّهِ', meaning: 'دِينُ الله وفطرته التي فطر الناس عليها.', surah: 2, ayah: 138, surahName: 'البقرة' },
  { word: 'الْمَنَّ وَالسَّلْوَىٰ', meaning: 'المنّ: شيء حلو كالعسل ينزل من السماء، والسلوى: طائر شبيه بالسُّمانى.', surah: 2, ayah: 57, surahName: 'البقرة' },
  { word: 'أَبًّا', meaning: 'ما تأكله الأنعام من العشب والمراعي.', surah: 80, ayah: 31, surahName: 'عبس' },
  { word: 'حَدَائِقَ غُلْبًا', meaning: 'بساتين عظيمة كثيرة الأشجار ملتفّة.', surah: 80, ayah: 30, surahName: 'عبس' },
  { word: 'غِسْلِينٍ', meaning: 'صديد أهل النار، وهو ما يسيل من أجسادهم من القيح والدم.', surah: 69, ayah: 36, surahName: 'الحاقة' },
  { word: 'الْمَوْءُودَةُ', meaning: 'البنت التي كانت تُدفن حيّة في الجاهلية.', surah: 81, ayah: 8, surahName: 'التكوير' },
  { word: 'كَالْعِهْنِ', meaning: 'الصوف المنفوش المصبوغ ألوانًا.', surah: 70, ayah: 9, surahName: 'المعارج' },
  { word: 'كَالْفَرَاشِ الْمَبْثُوثِ', meaning: 'الفراش: ما يتطاير من صغار الحشرات حول النار، والمبثوث: المنتشر المتفرّق.', surah: 101, ayah: 4, surahName: 'القارعة' },
  { word: 'صَلْصَالٍ', meaning: 'طين يابس يُصوّت إذا نُقر عليه.', surah: 15, ayah: 26, surahName: 'الحجر' },
  { word: 'حَمَإٍ مَّسْنُونٍ', meaning: 'طين أسود متغيّر الرائحة.', surah: 15, ayah: 26, surahName: 'الحجر' },
  { word: 'وَدْقَهُ', meaning: 'المطر يخرج من خلال السحاب.', surah: 24, ayah: 43, surahName: 'النور' },
  { word: 'سُندُسٍ وَإِسْتَبْرَقٍ', meaning: 'السندس: رقيق الديباج (الحرير)، والإستبرق: غليظه.', surah: 76, ayah: 21, surahName: 'الإنسان' },
  { word: 'الْأَرَائِكِ', meaning: 'الأسرّة المزيّنة في الحِجال، واحدتها أريكة.', surah: 36, ayah: 56, surahName: 'يس' },
  { word: 'زَنِيمٍ', meaning: 'الدَّعيّ المُلصَق بالقوم وليس منهم.', surah: 68, ayah: 13, surahName: 'القلم' },
  { word: 'عُتُلٍّ', meaning: 'الغليظ الجافي الشديد الخصومة.', surah: 68, ayah: 13, surahName: 'القلم' },
  { word: 'هَلُوعًا', meaning: 'شديد الجزع عند الشرّ، شديد المنع عند الخير.', surah: 70, ayah: 19, surahName: 'المعارج' },
  { word: 'صَرْصَرٍ', meaning: 'ريح شديدة البرد ذات صوت عظيم.', surah: 69, ayah: 6, surahName: 'الحاقة' },
  { word: 'عَاتِيَةٍ', meaning: 'شديدة جاوزت الحدّ في قوتها (ريح).', surah: 69, ayah: 6, surahName: 'الحاقة' },
  { word: 'حُسُومًا', meaning: 'متتابعةً لا تنقطع.', surah: 69, ayah: 7, surahName: 'الحاقة' },
  { word: 'أَعْجَازُ نَخْلٍ خَاوِيَةٍ', meaning: 'أصول نخل بالية فارغة الأجواف.', surah: 69, ayah: 7, surahName: 'الحاقة' },
  { word: 'تَتْرَا', meaning: 'متتابعين، واحدًا بعد آخر.', surah: 23, ayah: 44, surahName: 'المؤمنون' },
  { word: 'قَطِرَانٍ', meaning: 'ما يُتحلَّب من شجر فيُطلى به الإبل الجَربى، سريع الاشتعال.', surah: 14, ayah: 50, surahName: 'إبراهيم' },
  { word: 'ضَرِيعٍ', meaning: 'نبتٌ ذو شوك لاصق بالأرض، من طعام أهل النار.', surah: 88, ayah: 6, surahName: 'الغاشية' },
  { word: 'غَسَّاقًا', meaning: 'ما يسيل من صديد أهل النار، شديد البرد المنتن.', surah: 78, ayah: 25, surahName: 'النبأ' },
  { word: 'غَدَقًا', meaning: 'ماءً كثيرًا واسعًا.', surah: 72, ayah: 16, surahName: 'الجن' },
  { word: 'هُمَزَةٍ لُّمَزَةٍ', meaning: 'الهُمَزة: المغتاب للناس، واللُّمَزة: الطعّان فيهم بالعيب.', surah: 104, ayah: 1, surahName: 'الهمزة' },
  { word: 'الْحُطَمَةِ', meaning: 'نار الله الموقدة التي تحطّم كل ما يُلقى فيها.', surah: 104, ayah: 4, surahName: 'الهمزة' },
  { word: 'أَبَابِيلَ', meaning: 'جماعات من الطير متفرّقة يتبع بعضها بعضًا.', surah: 105, ayah: 3, surahName: 'الفيل' },
  { word: 'سِجِّيلٍ', meaning: 'طين متحجّر صُلب.', surah: 105, ayah: 4, surahName: 'الفيل' },
  { word: 'كَعَصْفٍ مَّأْكُولٍ', meaning: 'كورق الزرع الذي أكلته الدوابّ فداسته وأفنته.', surah: 105, ayah: 5, surahName: 'الفيل' },
  { word: 'إِيلَافِ', meaning: 'تأليفٌ وعادةٌ ولزومٌ ومداومة.', surah: 106, ayah: 1, surahName: 'قريش' },
  { word: 'الْكَوْثَرَ', meaning: 'نهر في الجنة أُعطيه النبي ﷺ، وقيل: الخير الكثير.', surah: 108, ayah: 1, surahName: 'الكوثر' },
  { word: 'الْأَبْتَرُ', meaning: 'المنقطع ذِكرُه، المنقطع من كل خير.', surah: 108, ayah: 3, surahName: 'الكوثر' },
  { word: 'الْمَاعُونَ', meaning: 'ما يتعاونه الناس بينهم من متاع البيت، وقيل: الزكاة.', surah: 107, ayah: 7, surahName: 'الماعون' },
  { word: 'الْفَلَقِ', meaning: 'الصبح إذا انفلق، وقيل: الخلق كله.', surah: 113, ayah: 1, surahName: 'الفلق' },
  { word: 'غَاسِقٍ إِذَا وَقَبَ', meaning: 'الليل إذا أظلم ودخل بظلامه.', surah: 113, ayah: 3, surahName: 'الفلق' },
  { word: 'النَّفَّاثَاتِ فِي الْعُقَدِ', meaning: 'السواحر اللاتي ينفُثن في عُقَد الخيط للسحر.', surah: 113, ayah: 4, surahName: 'الفلق' },
  { word: 'الْوَسْوَاسِ الْخَنَّاسِ', meaning: 'الشيطان يوسوس ثم يَخنُس (يتأخّر) عند ذكر الله.', surah: 114, ayah: 4, surahName: 'الناس' },
  { word: 'مَسَدٍ', meaning: 'الحبل المفتول من ليف أو غيره.', surah: 111, ayah: 5, surahName: 'المسد' },
  { word: 'تَبَّتْ', meaning: 'خسرت وهلكت.', surah: 111, ayah: 1, surahName: 'المسد' },
  { word: 'حَصَبُ جَهَنَّمَ', meaning: 'وقودها وما يُلقى فيها لتُسعَر به.', surah: 21, ayah: 98, surahName: 'الأنبياء' },
  { word: 'زَفِيرٌ وَشَهِيقٌ', meaning: 'الزفير: إخراج النفَس، والشهيق: ردُّه، وهو صوت أهل النار.', surah: 11, ayah: 106, surahName: 'هود' },
  { word: 'الصَّمَدُ', meaning: 'السيّد الذي يُقصَد في الحوائج، الكامل في صفاته.', surah: 112, ayah: 2, surahName: 'الإخلاص' },
  { word: 'كُفُوًا', meaning: 'مماثلًا ونظيرًا ومكافئًا.', surah: 112, ayah: 4, surahName: 'الإخلاص' },
  { word: 'دُسُرٍ', meaning: 'مسامير السفينة وحبالها التي تُشدّ بها ألواحها.', surah: 54, ayah: 13, surahName: 'القمر' },
  { word: 'كَهَشِيمِ الْمُحْتَظِرِ', meaning: 'كيابس الشجر المتكسّر الذي يجعله صاحب الحظيرة لماشيته.', surah: 54, ayah: 31, surahName: 'القمر' },
  { word: 'مُّقْمَحُونَ', meaning: 'رافعو رؤوسهم لا يستطيعون خفضها، غاضّو الأبصار.', surah: 36, ayah: 8, surahName: 'يس' },
  { word: 'عُرُبًا أَتْرَابًا', meaning: 'العُرُب: المتحبّبات إلى أزواجهنّ، والأتراب: المستويات في السنّ.', surah: 56, ayah: 37, surahName: 'الواقعة' },
  { word: 'كَوَاعِبَ أَتْرَابًا', meaning: 'الكواعب: نواهد استدارت ثُديّهنّ، الأتراب: لِدات في سنّ واحدة.', surah: 78, ayah: 33, surahName: 'النبأ' },
  { word: 'دِهَاقًا', meaning: 'كأسًا مملوءةً متتابعة.', surah: 78, ayah: 34, surahName: 'النبأ' },
  { word: 'يَحْمُومٍ', meaning: 'دخان أسود شديد السواد.', surah: 56, ayah: 43, surahName: 'الواقعة' },
  { word: 'حَمِيمٍ', meaning: 'ماء حارّ بلغ نهاية الحرارة.', surah: 56, ayah: 54, surahName: 'الواقعة' },
  { word: 'سَلْسَبِيلًا', meaning: 'عين في الجنة سَلِسة سهلة المساغ.', surah: 76, ayah: 18, surahName: 'الإنسان' },
  { word: 'زَنجَبِيلًا', meaning: 'شراب في الجنة مزاجه طعم الزنجبيل المستلذّ.', surah: 76, ayah: 17, surahName: 'الإنسان' },
  { word: 'نَضَّاخَتَانِ', meaning: 'فوّارتان بالماء لا تنقطعان.', surah: 55, ayah: 66, surahName: 'الرحمن' },
  { word: 'مُدْهَامَّتَانِ', meaning: 'خضراوان تضربان إلى السواد من شدّة الرّيّ.', surah: 55, ayah: 64, surahName: 'الرحمن' },
  { word: 'وَمَرْجَانٌ', meaning: 'صغار اللؤلؤ، وقيل: خرز أحمر.', surah: 55, ayah: 22, surahName: 'الرحمن' },
  { word: 'عَبْقَرِيٍّ حِسَانٍ', meaning: 'الطنافس والبُسُط الفاخرة الموشّاة.', surah: 55, ayah: 76, surahName: 'الرحمن' },
  { word: 'شُوَاظٌ مِّن نَّارٍ', meaning: 'لهبٌ خالص لا دخان فيه.', surah: 55, ayah: 35, surahName: 'الرحمن' },
  { word: 'نُحَاسٌ', meaning: 'دخان لا لهب فيه، وقيل: الصُّفر المذاب.', surah: 55, ayah: 35, surahName: 'الرحمن' },
  { word: 'مَارِجٍ مِّن نَّارٍ', meaning: 'لهبٌ صافٍ مختلط لا دخان فيه.', surah: 55, ayah: 15, surahName: 'الرحمن' },
  { word: 'كَالْفَخَّارِ', meaning: 'الطين المطبوخ بالنار حتى يصير خزفًا.', surah: 55, ayah: 14, surahName: 'الرحمن' },
  { word: 'أَفْنَانٍ', meaning: 'أغصان، واحدها فَنَن.', surah: 55, ayah: 48, surahName: 'الرحمن' },
  { word: 'قِطْمِيرٍ', meaning: 'القشرة الرقيقة التي تكون على نواة التمر.', surah: 35, ayah: 13, surahName: 'فاطر' },
  { word: 'نَقِيرًا', meaning: 'النقطة الصغيرة في ظهر نواة التمر.', surah: 4, ayah: 124, surahName: 'النساء' },
  { word: 'فَتِيلًا', meaning: 'الخيط الرقيق الذي في شقّ نواة التمر.', surah: 4, ayah: 49, surahName: 'النساء' },
  { word: 'سَيْلَ الْعَرِمِ', meaning: 'السيل الجارف الذي خرّب سدّ مأرب، وقيل: العَرِم السدّ نفسه.', surah: 34, ayah: 16, surahName: 'سبأ' },
  { word: 'أُكُلٍ خَمْطٍ', meaning: 'ثمر الأراك المرّ، وقيل: كل نبت مرّ لا يُؤكل.', surah: 34, ayah: 16, surahName: 'سبأ' },
  { word: 'إِمْلَاقٍ', meaning: 'الفقر وخشية الفاقة.', surah: 17, ayah: 31, surahName: 'الإسراء' },
  { word: 'بَحِيرَةٍ وَلَا سَائِبَةٍ', meaning: 'أنعام كان أهل الجاهلية يحرّمونها بأسماء ابتدعوها.', surah: 5, ayah: 103, surahName: 'المائدة' },
  { word: 'حَوَايَا', meaning: 'الأمعاء، واحدتها حاوية.', surah: 6, ayah: 146, surahName: 'الأنعام' },
  { word: 'وَيْكَأَنَّ', meaning: 'كلمة تنبيه وتعجّب، بمعنى: أَوَلم تعلم.', surah: 28, ayah: 82, surahName: 'القصص' },
  { word: 'هَيْتَ لَكَ', meaning: 'هلُمَّ وأقبِلْ، دعوةٌ للإقبال.', surah: 12, ayah: 23, surahName: 'يوسف' },
  { word: 'لِلسُّحْتِ', meaning: 'الكسب الحرام الخبيث الذي يَسحَت البركة.', surah: 5, ayah: 42, surahName: 'المائدة' },
  { word: 'صَيَاصِيهِمْ', meaning: 'حصونهم التي تحصّنوا بها.', surah: 33, ayah: 26, surahName: 'الأحزاب' },
  { word: 'أَسَاوِرَ', meaning: 'حُليّ تُلبَس في المعصم، واحدها سِوار.', surah: 18, ayah: 31, surahName: 'الكهف' },
  { word: 'الطَّارِقِ', meaning: 'النجم الذي يظهر ليلًا (سُمّي بذلك لأنه يطرق ليلًا).', surah: 86, ayah: 1, surahName: 'الطارق' },
  { word: 'الثَّاقِبُ', meaning: 'المضيء الذي يثقب الظلام بضوئه.', surah: 86, ayah: 3, surahName: 'الطارق' },
  { word: 'ذَاتِ الرَّجْعِ', meaning: 'السماء ذات المطر؛ ترجعه مرّة بعد مرّة.', surah: 86, ayah: 11, surahName: 'الطارق' },
  { word: 'ذَاتِ الصَّدْعِ', meaning: 'الأرض تتصدّع (تنشقّ) عن النبات.', surah: 86, ayah: 12, surahName: 'الطارق' },
  { word: 'الْخُنَّسِ', meaning: 'النجوم تختفي نهارًا وتظهر ليلًا.', surah: 81, ayah: 15, surahName: 'التكوير' },
  { word: 'الْجَوَارِ الْكُنَّسِ', meaning: 'الكواكب تجري في أفلاكها ثم تستتر كما تستتر الظباء في كناسها.', surah: 81, ayah: 16, surahName: 'التكوير' },
  { word: 'عَسْعَسَ', meaning: 'أقبل ظلامه، وقيل: أدبر (الليل).', surah: 81, ayah: 17, surahName: 'التكوير' },
  { word: 'تَنَفَّسَ', meaning: 'أضاء وأقبل وامتدّ ضوؤه (الصبح).', surah: 81, ayah: 18, surahName: 'التكوير' },
  { word: 'سِجِّينٍ', meaning: 'كتاب جامع لأعمال الفجّار، وهو مكان سُفليّ ضيّق.', surah: 83, ayah: 7, surahName: 'المطففين' },
  { word: 'عِلِّيِّينَ', meaning: 'كتاب أعمال الأبرار، وهو في أعالي الجنة.', surah: 83, ayah: 18, surahName: 'المطففين' },
  { word: 'الرَّحِيقِ الْمَخْتُومِ', meaning: 'الخمر الصافية المختومة آنيتها بالمسك.', surah: 83, ayah: 25, surahName: 'المطففين' },
  { word: 'تَسْنِيمٍ', meaning: 'عين في الجنة هي أعلى شراب أهلها وأشرفه.', surah: 83, ayah: 27, surahName: 'المطففين' },
  { word: 'الْأَبَارِيقُ', meaning: 'أوانٍ لها خراطيم وعُرى يُصبّ منها، واحدها إبريق.', surah: 56, ayah: 18, surahName: 'الواقعة' },
  { word: 'أَكْوَابٍ', meaning: 'أقداح مستديرة لا عُرى لها ولا خراطيم.', surah: 56, ayah: 18, surahName: 'الواقعة' },
  { word: 'مَّسْكُوبٍ', meaning: 'ماء جارٍ دائم لا ينقطع.', surah: 56, ayah: 31, surahName: 'الواقعة' },
  { word: 'سِدْرٍ مَّخْضُودٍ', meaning: 'شجر النَّبق لا شوك فيه.', surah: 56, ayah: 28, surahName: 'الواقعة' },
  { word: 'طَلْحٍ مَّنضُودٍ', meaning: 'شجر الموز، متراكب الثمر بعضه فوق بعض.', surah: 56, ayah: 29, surahName: 'الواقعة' },
  { word: 'الْعَادِيَاتِ ضَبْحًا', meaning: 'الخيل تعدو في الغزو فيُسمع صوت أنفاسها.', surah: 100, ayah: 1, surahName: 'العاديات' },
  { word: 'الْمُورِيَاتِ قَدْحًا', meaning: 'الخيل تُخرج النار من حوافرها بصدمها الحجارة.', surah: 100, ayah: 2, surahName: 'العاديات' },
  { word: 'فَأَثَرْنَ بِهِ نَقْعًا', meaning: 'هيّجن بعَدْوهنّ غبارًا.', surah: 100, ayah: 4, surahName: 'العاديات' },
  { word: 'لَكَنُودٌ', meaning: 'كفور جحود لنعمة ربّه.', surah: 100, ayah: 6, surahName: 'العاديات' },
  { word: 'هَاوِيَةٌ', meaning: 'النار يهوي فيها أهلها، وهي اسم من أسماء جهنم.', surah: 101, ayah: 9, surahName: 'القارعة' },
  { word: 'بِالنَّاصِيَةِ', meaning: 'مقدّم الرأس وشعره.', surah: 96, ayah: 15, surahName: 'العلق' },
  { word: 'الزَّبَانِيَةَ', meaning: 'ملائكة العذاب الغلاظ الشداد.', surah: 96, ayah: 18, surahName: 'العلق' },
  { word: 'بِمُصَيْطِرٍ', meaning: 'بمسلَّط متحكّم تقهرهم على الإيمان.', surah: 88, ayah: 22, surahName: 'الغاشية' },
  { word: 'رِدْءًا', meaning: 'عونًا ومُعينًا يصدّقني.', surah: 28, ayah: 34, surahName: 'القصص' },
  { word: 'وَيْلٌ', meaning: 'كلمة وعيدٍ وهلاك، وقيل: وادٍ في جهنم.', surah: 83, ayah: 1, surahName: 'المطففين' },
  { word: 'رَيْحَانٌ', meaning: 'الرزق، وقيل: نبتٌ طيّب الرائحة، وقيل: الرَّوح والرحمة.', surah: 56, ayah: 89, surahName: 'الواقعة' },
];

// ─── أدوات مساعدة ────────────────────────────────────────────────────────────

const TASHKEEL_REGEX = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** تطبيع النص العربي للبحث: إزالة التشكيل وتوحيد الألف والهمزة والتاء المربوطة */
export function normalizeForSearch(text: string): string {
  return text
    .replace(TASHKEEL_REGEX, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * كلمة اليوم الغريبة — اختيار حتميّ بناءً على يوم السنة،
 * فتظهر نفس الكلمة طوال اليوم وتتغيّر كل يوم. (أساس جاهز للإشعار اليومي لاحقًا)
 */
export function getGharibWordOfTheDay(date: Date = new Date()): GharibWord {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return GHARIB_WORDS[dayOfYear % GHARIB_WORDS.length];
}

/** البحث في الكلمات الغريبة بالكلمة أو بجزء من المعنى (مع تطبيع عربي) */
export function searchGharib(query: string): GharibWord[] {
  const q = normalizeForSearch(query);
  if (!q) return GHARIB_WORDS;
  return GHARIB_WORDS.filter(
    (w) =>
      normalizeForSearch(w.word).includes(q) ||
      normalizeForSearch(w.meaning).includes(q) ||
      normalizeForSearch(w.surahName).includes(q),
  );
}

export interface GharibSurahGroup {
  surah: number;
  surahName: string;
  words: GharibWord[];
}

/** تجميع الكلمات حسب السورة مرتّبةً بترتيب المصحف */
export function getGharibGroupedBySurah(words: GharibWord[] = GHARIB_WORDS): GharibSurahGroup[] {
  const map = new Map<number, GharibSurahGroup>();
  for (const w of words) {
    let group = map.get(w.surah);
    if (!group) {
      group = { surah: w.surah, surahName: w.surahName, words: [] };
      map.set(w.surah, group);
    }
    group.words.push(w);
  }
  const groups = Array.from(map.values());
  groups.sort((a, b) => a.surah - b.surah);
  for (const g of groups) g.words.sort((a, b) => a.ayah - b.ayah);
  return groups;
}
