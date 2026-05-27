import { getArabicSeasonalBannerCopy } from '@app-lib/seasonal-banner-copy';

type SeasonalPageKey = 'ramadan' | 'hajj' | 'mawlid' | 'ashura';

interface CMSSeasonalDua {
  id: string;
  titleKey: string;
  arabic: string;
  translation: string;
}

interface CMSSeasonalChecklist {
  id: string;
  icon: string;
  labelKey: string;
  color: string;
}

interface SeasonalPageContent {
  duas: CMSSeasonalDua[];
  checklist: CMSSeasonalChecklist[];
}

interface AdminSpecialDay {
  day: number;
  nameAr: string;
  nameEn: string;
  description: string;
  virtues: string[];
  recommendedActions: string[];
}

interface AdminSeasonMeta {
  type: string;
  nameAr: string;
  nameEn: string;
  description: string;
  startDate: { month: number; day: number };
  endDate: { month: number; day: number };
  color: string;
  icon: string;
  specialDays?: AdminSpecialDay[];
  greetings?: string[];
}

interface SeasonsMetadata {
  seasons: Record<string, AdminSeasonMeta>;
}

interface SeasonalBannerContent {
  id: string;
  seasonType: string;
  contentType: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  icon: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  startDate: string;
  endDate: string;
  isHijriDate: boolean;
  priority: number;
  isActive: boolean;
  targetScreen?: string;
  createdAt: string;
  updatedAt: string;
}

const now = () => new Date().toISOString();
const seasonTitleAr = (seasonType: string, fallback: string) =>
  getArabicSeasonalBannerCopy(seasonType)?.title || fallback;
const seasonSubtitleAr = (seasonType: string, fallback: string) =>
  getArabicSeasonalBannerCopy(seasonType)?.subtitle || fallback;

export function getDefaultSeasonalPageContent(page: SeasonalPageKey): SeasonalPageContent {
  const content: Record<SeasonalPageKey, SeasonalPageContent> = {
    ramadan: {
      duas: [
        {
          id: 'iftar',
          titleKey: 'دعاء الإفطار',
          arabic: 'ذَهَبَ الظَّمَأُ، وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ',
          translation: 'The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills.',
        },
        {
          id: 'laylat_qadr',
          titleKey: 'دعاء ليلة القدر',
          arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
          translation: 'O Allah, You are Pardoning and love pardon, so pardon me.',
        },
        {
          id: 'world_akhirah_good',
          titleKey: 'دعاء جامع',
          arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً، وَفِي الْآخِرَةِ حَسَنَةً، وَقِنَا عَذَابَ النَّارِ',
          translation: 'Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
        },
        {
          id: 'repentance',
          titleKey: 'دعاء التوبة',
          arabic: 'رَبَّنَا ظَلَمْنَا أَنْفُسَنَا، وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ',
          translation: 'Our Lord, we have wronged ourselves. If You do not forgive us and have mercy on us, we will be among the losers.',
        },
        {
          id: 'pardon_and_mercy',
          titleKey: 'طلب العفو والمغفرة',
          arabic: 'رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ، وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا',
          translation: 'Our Lord, do not burden us with what we cannot bear; pardon us, forgive us, and have mercy on us.',
        },
        {
          id: 'pre_iftar',
          titleKey: 'دعاء قبل الإفطار',
          arabic: 'اللَّهُمَّ إِنِّي لَكَ صُمْتُ، وَعَلَى رِزْقِكَ أَفْطَرْتُ، وَبِكَ آمَنْتُ، وَعَلَيْكَ تَوَكَّلْتُ',
          translation: 'O Allah, for You I fasted, by Your provision I broke my fast, in You I believed, and upon You I relied.',
        },
        {
          id: 'forgiveness',
          titleKey: 'دعاء المغفرة',
          arabic: 'اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ، دِقَّهُ وَجِلَّهُ، وَأَوَّلَهُ وَآخِرَهُ، وَعَلَانِيَتَهُ وَسِرَّهُ',
          translation: 'O Allah, forgive all my sins — minor and major, first and last, public and private.',
        },
        {
          id: 'guidance_and_chastity',
          titleKey: 'دعاء الهداية',
          arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى',
          translation: 'O Allah, I ask You for guidance, piety, chastity, and self-sufficiency.',
        },
        {
          id: 'paradise_protection',
          titleKey: 'دعاء بالجنة والاستعاذة من النار',
          arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ، وَأَعُوذُ بِكَ مِنَ النَّارِ',
          translation: 'O Allah, I ask You for Paradise and I seek refuge in You from the Fire.',
        },
        {
          id: 'good_ending',
          titleKey: 'دعاء حسن الخاتمة',
          arabic: 'اللَّهُمَّ اخْتِمْ لَنَا بِخَيْرٍ، وَتَوَفَّنَا وَأَنْتَ رَاضٍ عَنَّا',
          translation: 'O Allah, seal our lives with goodness, and take us back to You while You are pleased with us.',
        },
      ],
      checklist: [
        { id: 'fasting', icon: 'food-off', labelKey: 'الصيام بنية صادقة', color: '#0d8e62' },
        { id: 'fajr', icon: 'weather-sunset-up', labelKey: 'صلاة الفجر في وقتها', color: '#4a3d73' },
        { id: 'quran', icon: 'book-open-variant', labelKey: 'ورد يومي من القرآن', color: '#3a7ca5' },
        { id: 'tarawih', icon: 'mosque', labelKey: 'قيام الليل أو التراويح', color: '#c17f59' },
        { id: 'azkar', icon: 'hand-heart', labelKey: 'أذكار الصباح والمساء', color: '#c07b10' },
        { id: 'sadaqa', icon: 'hand-coin', labelKey: 'صدقة ولو بالقليل', color: '#e91e63' },
        { id: 'dua', icon: 'hands-pray', labelKey: 'دعاء عند الإفطار', color: '#0D9488' },
      ],
    },
    hajj: {
      duas: [
        {
          id: 'talbiyah',
          titleKey: 'التلبية',
          arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
          translation: 'تقال من الإحرام ويكثر منها الحاج حتى يبدأ الرمي يوم النحر.',
        },
        {
          id: 'arafah',
          titleKey: 'دعاء جامع يوم عرفة',
          arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
          translation: 'أفضل ما يقال يوم عرفة من الذكر والدعاء.',
        },
        {
          id: 'safa_marwah',
          titleKey: 'ذكر الصفا والمروة',
          arabic: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ، أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ',
          translation: 'عند بداية السعي من الصفا.',
        },
        {
          id: 'tawaf_between_corners',
          titleKey: 'بين الركن اليماني والحجر الأسود',
          arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً، وَفِي الْآخِرَةِ حَسَنَةً، وَقِنَا عَذَابَ النَّارِ',
          translation: 'من أجمع الأدعية في الطواف.',
        },
        {
          id: 'takbir_tashreeq',
          titleKey: 'تكبيرات أيام التشريق',
          arabic: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، وَلِلَّهِ الْحَمْدُ',
          translation: 'تقال في عشر ذي الحجة وأيام التشريق.',
        },
        {
          id: 'enter_makkah',
          titleKey: 'دعاء دخول مكة',
          arabic: 'اللَّهُمَّ هَذَا حَرَمُكَ وَأَمْنُكَ، فَحَرِّمْنِي عَلَى النَّارِ، وَآمِنِّي مِنْ عَذَابِكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
          translation: 'يقال عند دخول مكة المكرمة.',
        },
        {
          id: 'see_kaaba',
          titleKey: 'دعاء عند رؤية الكعبة',
          arabic: 'اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَشْرِيفًا وَتَعْظِيمًا وَتَكْرِيمًا وَمَهَابَةً، وَزِدْ مَنْ شَرَّفَهُ وَكَرَّمَهُ مِمَّنْ حَجَّهُ أَوِ اعْتَمَرَهُ تَشْرِيفًا وَتَكْرِيمًا',
          translation: 'يقال عند أول رؤية للكعبة المشرفة.',
        },
        {
          id: 'zamzam',
          titleKey: 'دعاء عند شرب ماء زمزم',
          arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا وَاسِعًا، وَشِفَاءً مِنْ كُلِّ دَاءٍ',
          translation: 'دعاء يقال عند شرب ماء زمزم.',
        },
        {
          id: 'accept_hajj',
          titleKey: 'دعاء قبول الحج',
          arabic: 'اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا، وَذَنْبًا مَغْفُورًا، وَسَعْيًا مَشْكُورًا، وَتِجَارَةً لَنْ تَبُورَ',
          translation: 'دعاء بقبول الحج في ختام المناسك.',
        },
        {
          id: 'comprehensive_hajj_dua',
          titleKey: 'دعاء جامع للحاج',
          arabic: 'رَبِّ اغْفِرْ وَارْحَمْ، وَأَنْتَ الْأَعَزُّ الْأَكْرَمُ',
          translation: 'دعاء جامع يقال في كل مواطن الدعاء.',
        },
      ],
      checklist: [
        { id: 'talbiyah', icon: 'bullhorn', labelKey: 'الإكثار من التلبية', color: '#5D4037' },
        { id: 'arafah_dua', icon: 'hands-pray', labelKey: 'الوقوف بعرفة للحاج والدعاء', color: '#1565C0' },
        { id: 'takbir', icon: 'star-crescent', labelKey: 'التكبير والذكر', color: '#C62828' },
        { id: 'sadaqa', icon: 'hand-coin', labelKey: 'الصدقة والإحسان', color: '#2E7D32' },
      ],
    },
    mawlid: {
      duas: [
        {
          id: 'ibrahimiyah',
          titleKey: 'الصلاة الإبراهيمية',
          arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
          translation: 'أفضل صيغ الصلاة على النبي ﷺ، وهي الصيغة التي تقال في التشهد.',
        },
        {
          id: 'short_salawat',
          titleKey: 'الصلاة المختصرة',
          arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
          translation: 'صيغة قصيرة سهلة التكرار في اليوم والليلة.',
        },
        {
          id: 'salawat_and_blessing',
          titleKey: 'صلاة وسلام وبركة',
          arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ، وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ',
          translation: 'صيغة جامعة للصلاة والسلام والبركة على النبي ﷺ.',
        },
        {
          id: 'salam_taslim',
          titleKey: 'السلام على النبي',
          arabic: 'السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ',
          translation: 'من التشهد في الصلاة.',
        },
        {
          id: 'abundant_salawat',
          titleKey: 'صلاة بعدد خلق الله',
          arabic: 'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ عَدَدَ خَلْقِكَ، وَرِضَا نَفْسِكَ، وَزِنَةَ عَرْشِكَ، وَمِدَادَ كَلِمَاتِكَ',
          translation: 'من أعظم صيغ الصلاة على النبي ﷺ.',
        },
        {
          id: 'comprehensive_salawat',
          titleKey: 'الصلاة جامعة',
          arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، فِي الْأَوَّلِينَ وَفِي الْآخِرِينَ، وَفِي الْمَلَإِ الْأَعْلَى إِلَى يَوْمِ الدِّينِ',
          translation: 'صيغة تجمع الزمان والمكان.',
        },
        {
          id: 'as_you_love',
          titleKey: 'صلاة كما يحب ويرضى',
          arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ كَمَا تُحِبُّ وَتَرْضَى لَهُ',
          translation: 'تفويض كيفية الصلاة لله تعالى.',
        },
        {
          id: 'intercession',
          titleKey: 'طلب الشفاعة',
          arabic: 'اللَّهُمَّ ارْزُقْنِي شَفَاعَةَ نَبِيِّنَا مُحَمَّدٍ ﷺ يَوْمَ الْقِيَامَةِ',
          translation: 'دعاء بنيل شفاعة النبي ﷺ.',
        },
        {
          id: 'salvation',
          titleKey: 'صلاة النجاة',
          arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ صَلَاةً تُنْجِينَا بِهَا مِنْ جَمِيعِ الْأَهْوَالِ وَالْآفَاتِ، وَتَقْضِي لَنَا بِهَا جَمِيعَ الْحَاجَاتِ',
          translation: 'صيغة جامعة لطلب الفرج والنجاة.',
        },
        {
          id: 'brief_salawat',
          titleKey: 'صيغة موجزة',
          arabic: 'صَلَّى اللَّهُ عَلَيْهِ وَعَلَى آلِهِ وَسَلَّمَ',
          translation: 'صيغة سهلة للإكثار من الصلاة على النبي ﷺ.',
        },
      ],
      checklist: [
        { id: 'salawat', icon: 'heart', labelKey: 'الإكثار من الصلاة على النبي ﷺ', color: '#e91e63' },
        { id: 'seerah', icon: 'book-open-variant', labelKey: 'قراءة موقف من السيرة', color: '#3a7ca5' },
        { id: 'sunnah', icon: 'star', labelKey: 'إحياء سنة عملية اليوم', color: '#c07b10' },
        { id: 'akhlaq', icon: 'account-heart', labelKey: 'التخلق بخلق نبوي', color: '#0d8e62' },
      ],
    },
    ashura: {
      duas: [
        {
          id: 'forgiveness',
          titleKey: 'استغفار وتجديد توبة',
          arabic: 'رَبَّنَا ظَلَمْنَا أَنْفُسَنَا، وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ',
          translation: 'دعاء قرآني جامع للتوبة وطلب الرحمة.',
        },
        {
          id: 'world_akhirah_good',
          titleKey: 'دعاء جامع',
          arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً، وَفِي الْآخِرَةِ حَسَنَةً، وَقِنَا عَذَابَ النَّارِ',
          translation: 'دعاء قرآني جامع للخير والنجاة.',
        },
        {
          id: 'pardon_and_mercy',
          titleKey: 'طلب العفو',
          arabic: 'رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ، وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا',
          translation: 'دعاء قرآني للعفو والمغفرة والرحمة.',
        },
        {
          id: 'pre_iftar',
          titleKey: 'دعاء قبل الإفطار',
          arabic: 'اللَّهُمَّ إِنِّي لَكَ صُمْتُ، وَعَلَى رِزْقِكَ أَفْطَرْتُ، وَبِكَ آمَنْتُ، وَعَلَيْكَ تَوَكَّلْتُ',
          translation: 'دعاء يقال عند الإفطار.',
        },
        {
          id: 'glorification',
          titleKey: 'تسبيح وتحميد',
          arabic: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ',
          translation: 'الباقيات الصالحات.',
        },
        {
          id: 'sufficiency',
          titleKey: 'دعاء النجاة',
          arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
          translation: 'دعاء التوكل والاكتفاء بالله.',
        },
        {
          id: 'gratitude',
          titleKey: 'دعاء الشكر',
          arabic: 'الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ',
          translation: 'حمد لله على إتمام النعم.',
        },
        {
          id: 'seek_refuge',
          titleKey: 'استعاذة',
          arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
          translation: 'استعاذة عامة بكلمات الله.',
        },
        {
          id: 'divine_protection',
          titleKey: 'دعاء الحفظ',
          arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِوَجْهِكَ الْكَرِيمِ وَكَلِمَاتِكَ التَّامَّاتِ مِنْ شَرِّ مَا أَنْتَ آخِذٌ بِنَاصِيَتِهِ',
          translation: 'دعاء جامع للحفظ والوقاية.',
        },
        {
          id: 'comprehensive_good',
          titleKey: 'دعاء جامع للخير',
          arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنَ الْخَيْرِ كُلِّهِ، عَاجِلِهِ وَآجِلِهِ، مَا عَلِمْتُ مِنْهُ وَمَا لَمْ أَعْلَمْ',
          translation: 'دعاء يجمع طلب الخير في الدنيا والآخرة.',
        },
      ],
      checklist: [
        { id: 'fast_9', icon: 'food-off', labelKey: 'صيام تاسوعاء مع عاشوراء لمن استطاع', color: '#4A4A4A' },
        { id: 'fast_10', icon: 'food-off', labelKey: 'صيام يوم عاشوراء', color: '#0d8e62' },
        { id: 'dua', icon: 'hands-pray', labelKey: 'الدعاء والاستغفار', color: '#3a7ca5' },
        { id: 'sadaqa', icon: 'hand-coin', labelKey: 'الصدقة وصلة الرحم', color: '#c07b10' },
      ],
    },
  };

  return content[page];
}

export function getDefaultSeasonsMetadata(): SeasonsMetadata {
  return {
    seasons: {
      ramadan: {
        type: 'ramadan',
        nameAr: seasonTitleAr('ramadan', 'رمضان المبارك'),
        nameEn: 'Ramadan',
        description: seasonSubtitleAr('ramadan', 'شهر الصيام والقيام وتلاوة القرآن ومضاعفة الطاعات.'),
        startDate: { month: 9, day: 1 },
        endDate: { month: 9, day: 30 },
        color: '#0d8e62',
        icon: 'moon-waning-crescent',
        greetings: [seasonSubtitleAr('ramadan', 'شهر الصيام والقيام وتلاوة القرآن')],
        specialDays: [
          {
            day: 1,
            nameAr: 'أول رمضان',
            nameEn: 'First of Ramadan',
            description: 'بداية شهر الصيام والقرآن وفتح أبواب الخير.',
            virtues: ['فرض الله فيه الصيام على المؤمنين', 'شهر أنزل فيه القرآن هدى للناس'],
            recommendedActions: ['تجديد النية', 'وضع ورد يومي للقرآن', 'المحافظة على الصلوات'],
          },
          {
            day: 21,
            nameAr: 'بداية العشر الأواخر',
            nameEn: 'Last ten nights begin',
            description: 'ليال عظيمة يتحرى فيها المسلم ليلة القدر.',
            virtues: ['تحرى النبي ﷺ ليلة القدر في الوتر من العشر الأواخر', 'الدعاء المأثور فيها سؤال العفو'],
            recommendedActions: ['قيام الليل', 'الإكثار من الدعاء', 'الصدقة'],
          },
          {
            day: 27,
            nameAr: 'ليلة السابع والعشرين',
            nameEn: '27th night',
            description: 'من الليالي الوترية في العشر الأواخر التي يتحرى فيها المسلم ليلة القدر.',
            virtues: ['ليلة وترية داخلة في تحري ليلة القدر', 'الدعاء المأثور فيها: اللهم إنك عفو كريم تحب العفو فاعف عني'],
            recommendedActions: ['اللهم إنك عفو كريم تحب العفو فاعف عني', 'قيام الليل', 'قراءة القرآن'],
          },
        ],
      },
      hajj: {
        type: 'hajj',
        nameAr: 'موسم الحج',
        nameEn: 'Hajj Season',
        description: 'أيام المناسك والتلبية والوقوف بعرفة وأيام التشريق.',
        startDate: { month: 12, day: 8 },
        endDate: { month: 12, day: 13 },
        color: '#5D4037',
        icon: 'star-crescent',
        greetings: [seasonSubtitleAr('hajj', 'الركن الخامس من أركان الإسلام')],
        specialDays: [
          {
            day: 8,
            nameAr: 'يوم التروية',
            nameEn: 'Day of Tarwiyah',
            description: 'بداية أعمال الحج بالتوجه إلى منى.',
            virtues: ['افتتاح مناسك الحج', 'الإكثار من التلبية'],
            recommendedActions: ['التلبية', 'الاستعداد ليوم عرفة', 'الدعاء'],
          },
          {
            day: 9,
            nameAr: 'يوم عرفة',
            nameEn: 'Day of Arafah',
            description: 'أعظم أيام الحج، والوقوف بعرفة ركن الحج الأكبر.',
            virtues: ['الحج عرفة', 'صيامه لغير الحاج يكفر سنة ماضية وسنة قادمة بإذن الله'],
            recommendedActions: ['الإكثار من الدعاء', 'الذكر والتكبير', 'الصيام لغير الحاج'],
          },
          {
            day: 10,
            nameAr: 'يوم النحر',
            nameEn: 'Day of Sacrifice',
            description: 'يوم العيد وأعمال الرمي والنحر والحلق والطواف.',
            virtues: ['من أيام التشريق والذكر بعد النحر', 'إظهار الفرح المشروع والتكبير'],
            recommendedActions: ['صلاة العيد', 'التكبير', 'صلة الرحم'],
          },
        ],
      },
      dhul_hijjah: {
        type: 'dhul_hijjah',
        nameAr: seasonTitleAr('dhul_hijjah', 'العشر الأوائل من ذي الحجة'),
        nameEn: 'First Ten Days of Dhul Hijjah',
        description: seasonSubtitleAr('dhul_hijjah', 'أفضل أيام الدنيا — فأكثروا من العمل الصالح'),
        startDate: { month: 12, day: 1 },
        endDate: { month: 12, day: 9 },
        color: '#2f7659',
        icon: 'calendar-star',
        greetings: [seasonSubtitleAr('dhul_hijjah', 'أفضل أيام الدنيا — فأكثروا من العمل الصالح')],
        specialDays: [
          {
            day: 1,
            nameAr: 'بداية العشر',
            nameEn: 'Beginning of the ten days',
            description: 'افتتاح أيام العمل الصالح والذكر.',
            virtues: ['العمل الصالح فيها محبوب إلى الله', 'فرصة لبداية قوية مع الطاعة'],
            recommendedActions: ['التكبير', 'الصيام لمن استطاع', 'الصدقة'],
          },
          {
            day: 9,
            nameAr: 'يوم عرفة',
            nameEn: 'Day of Arafah',
            description: 'يوم الدعاء والعتق والمغفرة.',
            virtues: ['صيامه لغير الحاج يكفر سنة ماضية وسنة قادمة'],
            recommendedActions: ['الدعاء', 'الصيام لغير الحاج', 'الإكثار من لا إله إلا الله'],
          },
        ],
      },
      ashura: {
        type: 'ashura',
        nameAr: 'يوم عاشوراء',
        nameEn: 'Ashura',
        description: 'اليوم العاشر من محرم، صيامه سنة وفيه شكر لله على النجاة.',
        startDate: { month: 1, day: 9 },
        endDate: { month: 1, day: 10 },
        color: '#4A4A4A',
        icon: 'calendar-star',
        greetings: [seasonSubtitleAr('ashura', 'صيامه يكفر سنة ماضية')],
        specialDays: [
          {
            day: 9,
            nameAr: 'تاسوعاء',
            nameEn: 'Tasua',
            description: 'اليوم التاسع من محرم، يستحب صيامه مع عاشوراء.',
            virtues: ['مخالفة أهل الكتاب', 'تهيئة لصيام عاشوراء'],
            recommendedActions: ['الصيام', 'الذكر', 'الاستغفار'],
          },
          {
            day: 10,
            nameAr: 'عاشوراء',
            nameEn: 'Ashura',
            description: 'صيامه يكفر السنة الماضية بإذن الله.',
            virtues: ['تكفير سنة ماضية', 'شكر لله على نجاة موسى عليه السلام'],
            recommendedActions: ['الصيام', 'الدعاء', 'الصدقة'],
          },
        ],
      },
      mawlid: {
        type: 'mawlid',
        nameAr: 'ذكرى المولد النبوي',
        nameEn: 'Prophet Remembrance',
        description: 'تذكير بسيرة النبي ﷺ وشمائله، والإكثار من الصلاة والسلام عليه.',
        startDate: { month: 3, day: 12 },
        endDate: { month: 3, day: 12 },
        color: '#2E8B57',
        icon: 'star-four-points',
        greetings: [seasonSubtitleAr('mawlid', 'صلوا على النبي ﷺ')],
        specialDays: [
          {
            day: 12,
            nameAr: 'ذكرى مولد النبي ﷺ',
            nameEn: 'Prophet remembrance day',
            description: 'تذكير بالسيرة والصلاة على النبي ﷺ، من غير تخصيص عبادة ثابتة لهذا اليوم في المحتوى.',
            virtues: ['الصلاة على النبي ﷺ مأمور بها في القرآن', 'من صلى على النبي ﷺ مرة صلى الله عليه بها عشرا'],
            recommendedActions: ['الصلاة على النبي ﷺ', 'قراءة السيرة', 'اتباع سنة عملية'],
          },
        ],
      },
      eid_fitr: {
        type: 'eid_fitr',
        nameAr: seasonTitleAr('eid_fitr', 'عيد الفطر المبارك'),
        nameEn: 'Eid al-Fitr',
        description: seasonSubtitleAr('eid_fitr', 'كل عام وأنتم بخير — تقبل الله طاعتكم'),
        startDate: { month: 10, day: 1 },
        endDate: { month: 10, day: 3 },
        color: '#0D9488',
        icon: 'party-popper',
        greetings: [seasonSubtitleAr('eid_fitr', 'كل عام وأنتم بخير — تقبل الله طاعتكم')],
        specialDays: [
          {
            day: 1,
            nameAr: 'أول أيام عيد الفطر',
            nameEn: 'First day of Eid al-Fitr',
            description: 'يوم فرح وشكر وصلة رحم بعد رمضان.',
            virtues: ['إكمال عدة رمضان والتكبير على هداية الله', 'زكاة الفطر تؤدى قبل صلاة العيد'],
            recommendedActions: ['صلاة العيد', 'إخراج زكاة الفطر قبل الصلاة', 'التكبير وصلة الرحم'],
          },
        ],
      },
      eid_adha: {
        type: 'eid_adha',
        nameAr: seasonTitleAr('eid_adha', 'عيد الأضحى المبارك'),
        nameEn: 'Eid al-Adha',
        description: seasonSubtitleAr('eid_adha', 'تقبل الله منا ومنكم صالح الأعمال'),
        startDate: { month: 12, day: 10 },
        endDate: { month: 12, day: 13 },
        color: '#8B5E34',
        icon: 'mosque',
        greetings: [seasonSubtitleAr('eid_adha', 'تقبل الله منا ومنكم صالح الأعمال')],
        specialDays: [
          {
            day: 10,
            nameAr: 'أول أيام عيد الأضحى',
            nameEn: 'First day of Eid al-Adha',
            description: 'يوم العيد الأكبر والتكبير وصلة الرحم.',
            virtues: ['أيام التشريق أيام أكل وشرب وذكر لله', 'صلاة العيد والتكبير من شعائر العيد'],
            recommendedActions: ['صلاة العيد', 'التكبير', 'صلة الرحم'],
          },
        ],
      },
      muharram: {
        type: 'muharram',
        nameAr: 'شهر محرم',
        nameEn: 'Muharram',
        description: 'أول شهور السنة الهجرية ومن الأشهر الحرم.',
        startDate: { month: 1, day: 1 },
        endDate: { month: 1, day: 30 },
        color: '#607D8B',
        icon: 'calendar-month',
        greetings: [seasonSubtitleAr('muharram', 'أول شهور السنة الهجرية')],
        specialDays: [
          {
            day: 1,
            nameAr: 'بداية السنة الهجرية',
            nameEn: 'Hijri new year',
            description: 'بداية عام هجري جديد وفرصة للمحاسبة والتجديد.',
            virtues: ['محرم من الأشهر الحرم', 'أفضل الصيام بعد رمضان شهر الله المحرم'],
            recommendedActions: ['محاسبة النفس', 'وضع نية صالحة للعام', 'الصيام لمن اعتاده واستطاع'],
          },
          {
            day: 10,
            nameAr: 'عاشوراء',
            nameEn: 'Ashura',
            description: 'اليوم العاشر من محرم وصيامه سنة.',
            virtues: ['صيامه يكفر سنة ماضية بإذن الله'],
            recommendedActions: ['الصيام', 'الدعاء', 'الاستغفار'],
          },
        ],
      },
      rajab: {
        type: 'rajab',
        nameAr: 'شهر رجب',
        nameEn: 'Rajab',
        description: 'من الأشهر الحرم، فرصة لتعظيم الحرمات والاستعداد لرمضان.',
        startDate: { month: 7, day: 1 },
        endDate: { month: 7, day: 30 },
        color: '#4169E1',
        icon: 'calendar-month',
        greetings: [seasonSubtitleAr('rajab', 'من الأشهر الحرم — أعظِم فيه الطاعة')],
        specialDays: [
          {
            day: 1,
            nameAr: 'بداية رجب',
            nameEn: 'Beginning of Rajab',
            description: 'بداية شهر حرام يستحب فيه ترك الظلم وتعظيم الطاعة.',
            virtues: ['من الأشهر الحرم'],
            recommendedActions: ['التوبة', 'الذكر', 'الاستعداد لرمضان'],
          },
        ],
      },
      shaban: {
        type: 'shaban',
        nameAr: 'شهر شعبان',
        nameEn: 'Shaban',
        description: 'شهر الاستعداد لرمضان والإكثار من الصيام لمن استطاع.',
        startDate: { month: 8, day: 1 },
        endDate: { month: 8, day: 30 },
        color: '#7C3AED',
        icon: 'calendar-month',
        greetings: [seasonSubtitleAr('shaban', 'اللهم بلِّغنا رمضان')],
        specialDays: [
          {
            day: 1,
            nameAr: 'بداية شعبان',
            nameEn: 'Beginning of Shaban',
            description: 'شهر كان النبي ﷺ يكثر فيه من الصيام، وهو فرصة عملية للاستعداد لرمضان.',
            virtues: ['كان النبي ﷺ أكثر صيامه في شهر بعد رمضان في شعبان'],
            recommendedActions: ['الصيام لمن استطاع واعتاد', 'التوبة', 'قراءة القرآن'],
          },
        ],
      },
    },
  };
}

export function getDefaultSeasonalBannerContent(): SeasonalBannerContent[] {
  const createdAt = now();
  return [
    {
      id: 'seasonal_ramadan_default',
      seasonType: 'ramadan',
      contentType: 'greeting',
      titleAr: seasonTitleAr('ramadan', 'رمضان المبارك'),
      titleEn: 'Ramadan Mubarak',
      contentAr: seasonSubtitleAr('ramadan', 'شهر الصيام والقيام وتلاوة القرآن'),
      contentEn: 'A month of fasting and Quran. Make its days count with worship and dua.',
      icon: 'moon-waning-crescent',
      backgroundColor: '#0d8e62',
      textColor: '#ffffff',
      accentColor: '#f7d774',
      startDate: '9-1',
      endDate: '9-30',
      isHijriDate: true,
      priority: 1,
      isActive: true,
      targetScreen: 'seasonal/ramadan',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'seasonal_dhul_hijjah_default',
      seasonType: 'dhul_hijjah',
      contentType: 'reminder',
      titleAr: seasonTitleAr('dhul_hijjah', 'العشر الأوائل من ذي الحجة'),
      titleEn: 'Blessed Hajj Days',
      contentAr: seasonSubtitleAr('dhul_hijjah', 'أفضل أيام الدنيا — فأكثروا من العمل الصالح'),
      contentEn: 'Increase talbiyah, takbir, and dua during these blessed days.',
      icon: 'star-crescent',
      backgroundColor: '#5D4037',
      textColor: '#ffffff',
      accentColor: '#f6d7a7',
      startDate: '12-1',
      endDate: '12-9',
      isHijriDate: true,
      priority: 2,
      isActive: true,
      targetScreen: 'seasonal/hajj',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'seasonal_eid_fitr_default',
      seasonType: 'eid_fitr',
      contentType: 'greeting',
      titleAr: seasonTitleAr('eid_fitr', 'عيد الفطر المبارك'),
      titleEn: 'Eid al-Fitr Mubarak',
      contentAr: seasonSubtitleAr('eid_fitr', 'كل عام وأنتم بخير — تقبل الله طاعتكم'),
      contentEn: 'May Allah accept from us and from you.',
      icon: 'party-popper',
      backgroundColor: '#0D9488',
      textColor: '#ffffff',
      accentColor: '#d1fae5',
      startDate: '10-1',
      endDate: '10-3',
      isHijriDate: true,
      priority: 1,
      isActive: true,
      targetScreen: 'seasonal/ramadan',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'seasonal_eid_adha_default',
      seasonType: 'eid_adha',
      contentType: 'greeting',
      titleAr: seasonTitleAr('eid_adha', 'عيد الأضحى المبارك'),
      titleEn: 'Eid al-Adha Mubarak',
      contentAr: seasonSubtitleAr('eid_adha', 'تقبل الله منا ومنكم صالح الأعمال'),
      contentEn: 'May Allah accept our good deeds and yours.',
      icon: 'mosque',
      backgroundColor: '#8B5E34',
      textColor: '#ffffff',
      accentColor: '#f6d7a7',
      startDate: '12-10',
      endDate: '12-13',
      isHijriDate: true,
      priority: 1,
      isActive: true,
      targetScreen: 'seasonal/hajj',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'seasonal_ashura_default',
      seasonType: 'ashura',
      contentType: 'reminder',
      titleAr: seasonTitleAr('ashura', 'عاشوراء'),
      titleEn: 'Ashura',
      contentAr: seasonSubtitleAr('ashura', 'صيامه يكفر سنة ماضية'),
      contentEn: 'Fasting Ashura is a great Sunnah; add Tasua if you can.',
      icon: 'calendar-star',
      backgroundColor: '#4A4A4A',
      textColor: '#ffffff',
      accentColor: '#d8d8d8',
      startDate: '1-9',
      endDate: '1-10',
      isHijriDate: true,
      priority: 3,
      isActive: true,
      targetScreen: 'seasonal/ashura',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'seasonal_mawlid_default',
      seasonType: 'mawlid',
      contentType: 'quote',
      titleAr: seasonTitleAr('mawlid', 'ذكرى المولد النبوي'),
      titleEn: 'Send Salawat Upon Him',
      contentAr: seasonSubtitleAr('mawlid', 'صلوا على النبي ﷺ'),
      contentEn: 'Read from the Seerah and increase prayers upon the Prophet ﷺ.',
      icon: 'star-four-points',
      backgroundColor: '#2E8B57',
      textColor: '#ffffff',
      accentColor: '#f7d774',
      startDate: '3-12',
      endDate: '3-12',
      isHijriDate: true,
      priority: 4,
      isActive: true,
      targetScreen: 'seasonal/mawlid',
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'seasonal_friday_default',
      seasonType: 'friday',
      contentType: 'azkar',
      titleAr: 'يوم الجمعة',
      titleEn: 'Friday',
      contentAr: 'أكثر من الصلاة على النبي ﷺ، واقرأ سورة الكهف.',
      contentEn: 'Increase salawat upon the Prophet ﷺ and recite Surah Al-Kahf.',
      icon: 'mosque',
      backgroundColor: '#0D9488',
      textColor: '#ffffff',
      accentColor: '#d1fae5',
      startDate: 'friday',
      endDate: 'friday',
      isHijriDate: false,
      priority: 5,
      isActive: true,
      targetScreen: '(tabs)',
      createdAt,
      updatedAt: createdAt,
    },
  ];
}
