// app/names.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Modal,
  Animated,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { APP_CONFIG, APP_NAME } from '../constants/app';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { GlassSegmentedControl } from '@/components/ui/GlassCard';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { copyToClipboard, shareText } from '../lib/clipboard';
import namesTranslations from '@/data/json/names-of-allah-translations.json';

// ===============================
// الثوابت
// ===============================
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const ITEM_WIDTH = (SCREEN_WIDTH - Spacing.md * 4) / GRID_COLUMNS;

// ===============================
// أسماء الله الحسنى مع الشرح
// ===============================
interface AllahName {
  id: number;
  name: string;
  transliteration: string;
  meaning: string;
  description: string;
  evidence?: string; // الدليل من القرآن أو السنة
}

const ALLAH_NAMES: AllahName[] = [
  {
    id: 1,
    name: 'الله',
    transliteration: 'Allah',
    meaning: 'الإله المعبود بحق',
    description: 'هو الاسم الأعظم الذي تفرد به الرب سبحانه، وهو أصل الأسماء الحسنى وأجمعها للمعاني، ومعناه: المألوه المعبود، ذو الألوهية والعبودية على خلقه أجمعين.',
    evidence: '﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ﴾ [البقرة: 255]',
  },
  {
    id: 2,
    name: 'الرَّحْمَن',
    transliteration: 'Ar-Rahman',
    meaning: 'ذو الرحمة الواسعة',
    description: 'هو ذو الرحمة الواسعة الشاملة لجميع الخلائق في الدنيا، وللمؤمنين في الآخرة. والرحمن أبلغ من الرحيم.',
    evidence: '﴿الرَّحْمَٰنُ عَلَى الْعَرْشِ اسْتَوَىٰ﴾ [طه: 5]',
  },
  {
    id: 3,
    name: 'الرَّحِيم',
    transliteration: 'Ar-Raheem',
    meaning: 'الرحيم بعباده المؤمنين',
    description: 'هو الذي يرحم عباده المؤمنين رحمة خاصة يوم القيامة، فيدخلهم الجنة برحمته.',
    evidence: '﴿وَكَانَ بِالْمُؤْمِنِينَ رَحِيمًا﴾ [الأحزاب: 43]',
  },
  {
    id: 4,
    name: 'المَلِك',
    transliteration: 'Al-Malik',
    meaning: 'المالك لكل شيء',
    description: 'هو المتصرف في ملكه كيف يشاء، له الملك الكامل والسلطان التام على جميع المخلوقات.',
    evidence: '﴿فَتَعَالَى اللَّهُ الْمَلِكُ الْحَقُّ﴾ [طه: 114]',
  },
  {
    id: 5,
    name: 'القُدُّوس',
    transliteration: 'Al-Quddus',
    meaning: 'المنزه عن كل نقص',
    description: 'هو المنزه المطهر عن كل عيب ونقص، الموصوف بصفات الكمال والجلال.',
    evidence: '﴿الْمَلِكُ الْقُدُّوسُ السَّلَامُ﴾ [الحشر: 23]',
  },
  {
    id: 6,
    name: 'السَّلَام',
    transliteration: 'As-Salam',
    meaning: 'السالم من كل عيب',
    description: 'هو السالم من جميع العيوب والنقائص، ومنه السلام على عباده، وهو الذي يسلم عباده من العذاب.',
    evidence: '﴿الْمَلِكُ الْقُدُّوسُ السَّلَامُ﴾ [الحشر: 23]',
  },
  {
    id: 7,
    name: 'المُؤْمِن',
    transliteration: 'Al-Mu\'min',
    meaning: 'المصدق لرسله',
    description: 'هو الذي صدق رسله وأنبياءه بالآيات والبراهين، وصدق عباده المؤمنين ما وعدهم به من الثواب.',
    evidence: '﴿السَّلَامُ الْمُؤْمِنُ الْمُهَيْمِنُ﴾ [الحشر: 23]',
  },
  {
    id: 8,
    name: 'المُهَيْمِن',
    transliteration: 'Al-Muhaymin',
    meaning: 'الرقيب الحافظ',
    description: 'هو الرقيب على خلقه، الحافظ لهم، المطلع على أحوالهم وأعمالهم، الشاهد عليهم.',
    evidence: '﴿السَّلَامُ الْمُؤْمِنُ الْمُهَيْمِنُ﴾ [الحشر: 23]',
  },
  {
    id: 9,
    name: 'العَزِيز',
    transliteration: 'Al-Aziz',
    meaning: 'الغالب الذي لا يُغلب',
    description: 'هو الغالب القوي الذي لا يُغلب ولا يُقهر، العزيز في انتقامه من أعدائه.',
    evidence: '﴿وَهُوَ الْعَزِيزُ الْحَكِيمُ﴾ [إبراهيم: 4]',
  },
  {
    id: 10,
    name: 'الجَبَّار',
    transliteration: 'Al-Jabbar',
    meaning: 'العظيم القاهر',
    description: 'هو الذي يجبر الكسير ويغني الفقير، وهو القاهر لخلقه على ما أراد من أمر ونهي.',
    evidence: '﴿الْعَزِيزُ الْجَبَّارُ الْمُتَكَبِّرُ﴾ [الحشر: 23]',
  },
  {
    id: 11,
    name: 'المُتَكَبِّر',
    transliteration: 'Al-Mutakabbir',
    meaning: 'المتعالي عن صفات الخلق',
    description: 'هو المتعالي عن صفات الخلق، المتفرد بالكبرياء والعظمة، ذو الكبرياء والعظمة.',
    evidence: '﴿الْعَزِيزُ الْجَبَّارُ الْمُتَكَبِّرُ﴾ [الحشر: 23]',
  },
  {
    id: 12,
    name: 'الخَالِق',
    transliteration: 'Al-Khaliq',
    meaning: 'الموجد للأشياء من العدم',
    description: 'هو الذي أوجد الأشياء جميعها بعد أن لم تكن موجودة، وقدر أمورها قبل وجودها.',
    evidence: '﴿هُوَ اللَّهُ الْخَالِقُ الْبَارِئُ الْمُصَوِّرُ﴾ [الحشر: 24]',
  },
  {
    id: 13,
    name: 'البَارِئ',
    transliteration: 'Al-Bari\'',
    meaning: 'المنشئ للخلق',
    description: 'هو الذي برأ الخلق وأوجدهم بريئين من التفاوت والتنافر، منشئهم من العدم إلى الوجود.',
    evidence: '﴿هُوَ اللَّهُ الْخَالِقُ الْبَارِئُ الْمُصَوِّرُ﴾ [الحشر: 24]',
  },
  {
    id: 14,
    name: 'المُصَوِّر',
    transliteration: 'Al-Musawwir',
    meaning: 'الذي صور الخلق',
    description: 'هو الذي صور جميع المخلوقات وأعطى كل شيء صورته وشكله الخاص به.',
    evidence: '﴿هُوَ اللَّهُ الْخَالِقُ الْبَارِئُ الْمُصَوِّرُ﴾ [الحشر: 24]',
  },
  {
    id: 15,
    name: 'الغَفَّار',
    transliteration: 'Al-Ghaffar',
    meaning: 'كثير المغفرة',
    description: 'هو الذي يغفر الذنوب مهما عظمت، ويستر العيوب مهما كثرت، الغفار لمن تاب.',
    evidence: '﴿وَإِنِّي لَغَفَّارٌ لِمَنْ تَابَ﴾ [طه: 82]',
  },
  {
    id: 16,
    name: 'القَهَّار',
    transliteration: 'Al-Qahhar',
    meaning: 'الغالب على كل شيء',
    description: 'هو الذي قهر جميع المخلوقات وخضعت له جميع الكائنات، لا يخرج شيء عن قهره وسلطانه.',
    evidence: '﴿وَهُوَ الْوَاحِدُ الْقَهَّارُ﴾ [الرعد: 16]',
  },
  {
    id: 17,
    name: 'الوَهَّاب',
    transliteration: 'Al-Wahhab',
    meaning: 'كثير العطاء',
    description: 'هو الذي يهب لعباده ما يشاء من نعمه وفضله، المعطي بلا عوض والمانح بلا غرض.',
    evidence: '﴿أَمْ عِنْدَهُمْ خَزَائِنُ رَحْمَةِ رَبِّكَ الْعَزِيزِ الْوَهَّابِ﴾ [ص: 9]',
  },
  {
    id: 18,
    name: 'الرَّزَّاق',
    transliteration: 'Ar-Razzaq',
    meaning: 'المتكفل بالرزق',
    description: 'هو الذي يرزق جميع المخلوقات، وتكفل بأرزاقهم، وقسم لكل مخلوق رزقه.',
    evidence: '﴿إِنَّ اللَّهَ هُوَ الرَّزَّاقُ ذُو الْقُوَّةِ الْمَتِينُ﴾ [الذاريات: 58]',
  },
  {
    id: 19,
    name: 'الفَتَّاح',
    transliteration: 'Al-Fattah',
    meaning: 'الحاكم بين عباده',
    description: 'هو الذي يفتح أبواب الرزق والرحمة لعباده، ويحكم بينهم بالعدل، ويفتح المنغلق.',
    evidence: '﴿وَهُوَ الْفَتَّاحُ الْعَلِيمُ﴾ [سبأ: 26]',
  },
  {
    id: 20,
    name: 'العَلِيم',
    transliteration: 'Al-Alim',
    meaning: 'الذي يعلم كل شيء',
    description: 'هو الذي أحاط علمه بكل شيء، ظاهره وباطنه، دقيقه وجليله، ماضيه ومستقبله.',
    evidence: '﴿وَاللَّهُ بِكُلِّ شَيْءٍ عَلِيمٌ﴾ [البقرة: 282]',
  },
  {
    id: 21,
    name: 'القَابِض',
    transliteration: 'Al-Qabid',
    meaning: 'الذي يقبض الأرزاق',
    description: 'هو الذي يقبض الرزق عمن يشاء امتحاناً أو حكمة، ويقبض الأرواح عند الممات.',
    evidence: '﴿وَاللَّهُ يَقْبِضُ وَيَبْسُطُ﴾ [البقرة: 245]',
  },
  {
    id: 22,
    name: 'البَاسِط',
    transliteration: 'Al-Basit',
    meaning: 'الذي يوسع الرزق',
    description: 'هو الذي يبسط الرزق لمن يشاء من عباده ويوسعه عليهم بجوده وكرمه.',
    evidence: '﴿وَاللَّهُ يَقْبِضُ وَيَبْسُطُ﴾ [البقرة: 245]',
  },
  {
    id: 23,
    name: 'الخَافِض',
    transliteration: 'Al-Khafid',
    meaning: 'الذي يخفض الجبارين',
    description: 'هو الذي يخفض الجبارين والمتكبرين ويذلهم، ويخفض من يستحق الخفض.',
    evidence: '﴿خَافِضَةٌ رَافِعَةٌ﴾ [الواقعة: 3]',
  },
  {
    id: 24,
    name: 'الرَّافِع',
    transliteration: 'Ar-Rafi\'',
    meaning: 'الذي يرفع المؤمنين',
    description: 'هو الذي يرفع المؤمنين بالطاعة والإيمان، ويرفع من يشاء من خلقه.',
    evidence: '﴿يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنْكُمْ﴾ [المجادلة: 11]',
  },
  {
    id: 25,
    name: 'المُعِز',
    transliteration: 'Al-Mu\'izz',
    meaning: 'الذي يعز من يشاء',
    description: 'هو الذي يعز من يشاء من عباده بالإيمان والطاعة، ويهبهم العزة في الدنيا والآخرة.',
    evidence: '﴿تُعِزُّ مَنْ تَشَاءُ وَتُذِلُّ مَنْ تَشَاءُ﴾ [آل عمران: 26]',
  },
  {
    id: 26,
    name: 'المُذِل',
    transliteration: 'Al-Muzill',
    meaning: 'الذي يذل من يشاء',
    description: 'هو الذي يذل من يشاء من عباده بسبب كفرهم ومعاصيهم، فيصيرون أذلاء.',
    evidence: '﴿تُعِزُّ مَنْ تَشَاءُ وَتُذِلُّ مَنْ تَشَاءُ﴾ [آل عمران: 26]',
  },
  {
    id: 27,
    name: 'السَّمِيع',
    transliteration: 'As-Sami\'',
    meaning: 'الذي يسمع كل شيء',
    description: 'هو الذي يسمع جميع الأصوات باختلاف اللغات وتنوع الحاجات، لا يحجبه شيء.',
    evidence: '﴿إِنَّهُ هُوَ السَّمِيعُ الْعَلِيمُ﴾ [الأنفال: 61]',
  },
  {
    id: 28,
    name: 'البَصِير',
    transliteration: 'Al-Basir',
    meaning: 'الذي يبصر كل شيء',
    description: 'هو الذي يرى جميع الموجودات، لا يخفى عليه شيء في الأرض ولا في السماء.',
    evidence: '﴿وَاللَّهُ بَصِيرٌ بِالْعِبَادِ﴾ [آل عمران: 15]',
  },
  {
    id: 29,
    name: 'الحَكَم',
    transliteration: 'Al-Hakam',
    meaning: 'الحاكم العادل',
    description: 'هو الذي يحكم بين خلقه بالعدل، لا يظلم أحداً، حكمه نافذ لا معقب له.',
    evidence: '﴿أَفَغَيْرَ اللَّهِ أَبْتَغِي حَكَمًا﴾ [الأنعام: 114]',
  },
  {
    id: 30,
    name: 'العَدْل',
    transliteration: 'Al-Adl',
    meaning: 'العادل في حكمه',
    description: 'هو الذي لا يجور في حكمه، ولا يظلم عباده، بل يعطي كل ذي حق حقه.',
    evidence: '﴿وَتَمَّتْ كَلِمَتُ رَبِّكَ صِدْقًا وَعَدْلًا﴾ [الأنعام: 115]',
  },
  {
    id: 31,
    name: 'اللَّطِيف',
    transliteration: 'Al-Latif',
    meaning: 'الرفيق بعباده',
    description: 'هو الذي يلطف بعباده ويوصل إليهم ما ينفعهم برفق وحكمة، العليم بخفايا الأمور.',
    evidence: '﴿إِنَّ اللَّهَ لَطِيفٌ خَبِيرٌ﴾ [الحج: 63]',
  },
  {
    id: 32,
    name: 'الخَبِير',
    transliteration: 'Al-Khabir',
    meaning: 'العالم ببواطن الأمور',
    description: 'هو الذي يعلم بواطن الأمور وخفاياها، لا تخفى عليه خافية.',
    evidence: '﴿وَهُوَ الْحَكِيمُ الْخَبِيرُ﴾ [الأنعام: 18]',
  },
  {
    id: 33,
    name: 'الحَلِيم',
    transliteration: 'Al-Halim',
    meaning: 'الذي لا يعجل بالعقوبة',
    description: 'هو الذي لا يعجل بعقوبة العصاة، بل يمهلهم ليتوبوا، ولا يستفزه جهل الجاهلين.',
    evidence: '﴿وَاعْلَمُوا أَنَّ اللَّهَ غَفُورٌ حَلِيمٌ﴾ [البقرة: 235]',
  },
  {
    id: 34,
    name: 'العَظِيم',
    transliteration: 'Al-Azim',
    meaning: 'الذي له العظمة',
    description: 'هو الذي له العظمة في ذاته وصفاته وأفعاله، عظيم القدر والشأن.',
    evidence: '﴿وَهُوَ الْعَلِيُّ الْعَظِيمُ﴾ [البقرة: 255]',
  },
  {
    id: 35,
    name: 'الغَفُور',
    transliteration: 'Al-Ghafur',
    meaning: 'كثير المغفرة',
    description: 'هو الذي يغفر الذنوب ويستر العيوب، كثير المغفرة لعباده التائبين.',
    evidence: '﴿وَرَبُّكَ الْغَفُورُ ذُو الرَّحْمَةِ﴾ [الكهف: 58]',
  },
  {
    id: 36,
    name: 'الشَّكُور',
    transliteration: 'Ash-Shakur',
    meaning: 'الذي يثيب على الطاعة',
    description: 'هو الذي يشكر القليل من العمل ويثيب عليه الكثير من الأجر، يضاعف الحسنات.',
    evidence: '﴿إِنَّ رَبَّنَا لَغَفُورٌ شَكُورٌ﴾ [فاطر: 34]',
  },
  {
    id: 37,
    name: 'العَلِيّ',
    transliteration: 'Al-Ali',
    meaning: 'المتعالي فوق خلقه',
    description: 'هو المتعالي على خلقه بذاته وصفاته، فوق عرشه، عالٍ في قدره وشأنه.',
    evidence: '﴿وَهُوَ الْعَلِيُّ الْعَظِيمُ﴾ [البقرة: 255]',
  },
  {
    id: 38,
    name: 'الكَبِير',
    transliteration: 'Al-Kabir',
    meaning: 'العظيم الكبير',
    description: 'هو الكبير في ذاته وصفاته، أكبر من كل شيء، له الكبرياء في السماوات والأرض.',
    evidence: '﴿عَالِمُ الْغَيْبِ وَالشَّهَادَةِ الْكَبِيرُ الْمُتَعَالِ﴾ [الرعد: 9]',
  },
  {
    id: 39,
    name: 'الحَفِيظ',
    transliteration: 'Al-Hafiz',
    meaning: 'الحافظ لكل شيء',
    description: 'هو الذي يحفظ السماوات والأرض، ويحفظ عباده من المهالك والشرور.',
    evidence: '﴿وَرَبُّكَ عَلَىٰ كُلِّ شَيْءٍ حَفِيظٌ﴾ [سبأ: 21]',
  },
  {
    id: 40,
    name: 'المُقِيت',
    transliteration: 'Al-Muqit',
    meaning: 'المقتدر المعطي للقوت',
    description: 'هو الذي يوصل إلى كل موجود ما يقيته ويحفظه، المقتدر على كل شيء.',
    evidence: '﴿وَكَانَ اللَّهُ عَلَىٰ كُلِّ شَيْءٍ مُقِيتًا﴾ [النساء: 85]',
  },
  {
    id: 41,
    name: 'الحَسِيب',
    transliteration: 'Al-Hasib',
    meaning: 'المحاسب لعباده',
    description: 'هو الذي يحاسب عباده على أعمالهم، الكافي لمن توكل عليه.',
    evidence: '﴿وَكَفَىٰ بِاللَّهِ حَسِيبًا﴾ [النساء: 6]',
  },
  {
    id: 42,
    name: 'الجَلِيل',
    transliteration: 'Al-Jalil',
    meaning: 'ذو الجلال والعظمة',
    description: 'هو الموصوف بنعوت الجلال والكبرياء والعظمة، جليل القدر عظيم الشأن.',
    evidence: '﴿تَبَارَكَ اسْمُ رَبِّكَ ذِي الْجَلَالِ وَالْإِكْرَامِ﴾ [الرحمن: 78]',
  },
  {
    id: 43,
    name: 'الكَرِيم',
    transliteration: 'Al-Karim',
    meaning: 'الكثير الخير والعطاء',
    description: 'هو الكثير الخير والجود والعطاء، الذي يعطي بلا منة ولا سؤال.',
    evidence: '﴿يَا أَيُّهَا الْإِنْسَانُ مَا غَرَّكَ بِرَبِّكَ الْكَرِيمِ﴾ [الانفطار: 6]',
  },
  {
    id: 44,
    name: 'الرَّقِيب',
    transliteration: 'Ar-Raqib',
    meaning: 'المطلع على كل شيء',
    description: 'هو المطلع على ما أكنته الصدور، القائم على كل نفس بما كسبت، الرقيب على أحوال العباد.',
    evidence: '﴿إِنَّ اللَّهَ كَانَ عَلَيْكُمْ رَقِيبًا﴾ [النساء: 1]',
  },
  {
    id: 45,
    name: 'المُجِيب',
    transliteration: 'Al-Mujib',
    meaning: 'المستجيب لدعاء عباده',
    description: 'هو الذي يجيب دعاء الداعين ويستجيب لهم، قريب من عباده سميع لدعائهم.',
    evidence: '﴿إِنَّ رَبِّي قَرِيبٌ مُجِيبٌ﴾ [هود: 61]',
  },
  {
    id: 46,
    name: 'الوَاسِع',
    transliteration: 'Al-Wasi\'',
    meaning: 'الواسع في رحمته وعلمه',
    description: 'هو الواسع في صفاته وأفعاله، واسع الرحمة والعلم والقدرة والفضل.',
    evidence: '﴿وَاللَّهُ وَاسِعٌ عَلِيمٌ﴾ [البقرة: 247]',
  },
  {
    id: 47,
    name: 'الحَكِيم',
    transliteration: 'Al-Hakim',
    meaning: 'ذو الحكمة البالغة',
    description: 'هو الذي له الحكمة الكاملة في خلقه وأمره، يضع كل شيء في موضعه المناسب.',
    evidence: '﴿وَهُوَ الْعَزِيزُ الْحَكِيمُ﴾ [إبراهيم: 4]',
  },
  {
    id: 48,
    name: 'الوَدُود',
    transliteration: 'Al-Wadud',
    meaning: 'المحب لعباده المؤمنين',
    description: 'هو الذي يحب عباده المؤمنين ويحبونه، كثير الود والمحبة لهم.',
    evidence: '﴿وَهُوَ الْغَفُورُ الْوَدُودُ﴾ [البروج: 14]',
  },
  {
    id: 49,
    name: 'المَجِيد',
    transliteration: 'Al-Majid',
    meaning: 'ذو المجد والشرف',
    description: 'هو الماجد الكريم، ذو المجد والعظمة والشرف، كثير الإحسان واسع الكرم.',
    evidence: '﴿ذُو الْعَرْشِ الْمَجِيدُ﴾ [البروج: 15]',
  },
  {
    id: 50,
    name: 'البَاعِث',
    transliteration: 'Al-Ba\'ith',
    meaning: 'الذي يبعث الخلق',
    description: 'هو الذي يبعث الخلق من قبورهم يوم القيامة للحساب والجزاء.',
    evidence: '﴿وَأَنَّ اللَّهَ يَبْعَثُ مَنْ فِي الْقُبُورِ﴾ [الحج: 7]',
  },
  // ... باقي الأسماء حتى 99
  {
    id: 51,
    name: 'الشَّهِيد',
    transliteration: 'Ash-Shahid',
    meaning: 'المطلع على كل شيء',
    description: 'هو الذي لا يغيب عنه شيء، الشاهد على كل شيء في كل وقت.',
    evidence: '﴿وَاللَّهُ عَلَىٰ كُلِّ شَيْءٍ شَهِيدٌ﴾ [المجادلة: 6]',
  },
  {
    id: 52,
    name: 'الحَقّ',
    transliteration: 'Al-Haqq',
    meaning: 'الثابت الوجود',
    description: 'هو الثابت الذي لا يتغير ولا يزول، الحق في ذاته وصفاته وأفعاله.',
    evidence: '﴿ذَٰلِكَ بِأَنَّ اللَّهَ هُوَ الْحَقُّ﴾ [الحج: 6]',
  },
  {
    id: 53,
    name: 'الوَكِيل',
    transliteration: 'Al-Wakil',
    meaning: 'الكفيل بأرزاق العباد',
    description: 'هو الذي توكل بأرزاق العباد وتدبير أمورهم، الكافي لمن توكل عليه.',
    evidence: '﴿وَكَفَىٰ بِاللَّهِ وَكِيلًا﴾ [النساء: 81]',
  },
  {
    id: 54,
    name: 'القَوِيّ',
    transliteration: 'Al-Qawi',
    meaning: 'التام القدرة',
    description: 'هو الذي له القوة الكاملة التامة، لا يعجزه شيء ولا يغلبه أحد.',
    evidence: '﴿إِنَّ اللَّهَ قَوِيٌّ عَزِيزٌ﴾ [الحج: 40]',
  },
  {
    id: 55,
    name: 'المَتِين',
    transliteration: 'Al-Matin',
    meaning: 'الشديد القوة',
    description: 'هو الشديد القوة الذي لا تنقطع قوته ولا تضعف.',
    evidence: '﴿إِنَّ اللَّهَ هُوَ الرَّزَّاقُ ذُو الْقُوَّةِ الْمَتِينُ﴾ [الذاريات: 58]',
  },
  {
    id: 56,
    name: 'الوَلِيّ',
    transliteration: 'Al-Wali',
    meaning: 'الناصر لعباده',
    description: 'هو الذي يتولى أمور عباده المؤمنين وينصرهم ويؤيدهم.',
    evidence: '﴿اللَّهُ وَلِيُّ الَّذِينَ آمَنُوا﴾ [البقرة: 257]',
  },
  {
    id: 57,
    name: 'الحَمِيد',
    transliteration: 'Al-Hamid',
    meaning: 'المستحق للحمد',
    description: 'هو المحمود المستحق للحمد والثناء بما له من صفات الكمال.',
    evidence: '﴿وَهُوَ الْوَلِيُّ الْحَمِيدُ﴾ [الشورى: 28]',
  },
  {
    id: 58,
    name: 'المُحْصِي',
    transliteration: 'Al-Muhsi',
    meaning: 'الذي أحصى كل شيء',
    description: 'هو الذي أحصى كل شيء بعلمه، فلا يفوته شيء ولا يعزب عنه.',
    evidence: '﴿وَأَحْصَىٰ كُلَّ شَيْءٍ عَدَدًا﴾ [الجن: 28]',
  },
  {
    id: 59,
    name: 'المُبْدِئ',
    transliteration: 'Al-Mubdi\'',
    meaning: 'الذي بدأ الخلق',
    description: 'هو الذي بدأ خلق الأشياء واخترعها بلا مثال سابق.',
    evidence: '﴿إِنَّهُ هُوَ يُبْدِئُ وَيُعِيدُ﴾ [البروج: 13]',
  },
  {
    id: 60,
    name: 'المُعِيد',
    transliteration: 'Al-Mu\'id',
    meaning: 'الذي يعيد الخلق',
    description: 'هو الذي يعيد الخلق بعد فنائهم للبعث والحساب.',
    evidence: '﴿إِنَّهُ هُوَ يُبْدِئُ وَيُعِيدُ﴾ [البروج: 13]',
  },
  {
    id: 61,
    name: 'المُحْيِي',
    transliteration: 'Al-Muhyi',
    meaning: 'الذي يحيي الموتى',
    description: 'هو الذي يحيي الموتى ويخرجهم من قبورهم، ويحيي القلوب بالإيمان.',
    evidence: '﴿إِنَّ الَّذِي أَحْيَاهَا لَمُحْيِي الْمَوْتَىٰ﴾ [فصلت: 39]',
  },
  {
    id: 62,
    name: 'المُمِيت',
    transliteration: 'Al-Mumit',
    meaning: 'الذي يميت الأحياء',
    description: 'هو الذي يميت الأحياء ويقبض أرواحهم عند انتهاء آجالهم.',
    evidence: '﴿هُوَ يُحْيِي وَيُمِيتُ وَإِلَيْهِ تُرْجَعُونَ﴾ [يونس: 56]',
  },
  {
    id: 63,
    name: 'الحَيّ',
    transliteration: 'Al-Hayy',
    meaning: 'الدائم الحياة',
    description: 'هو الحي الذي لا يموت، حياته كاملة لم يسبقها عدم ولا يلحقها زوال.',
    evidence: '﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ﴾ [البقرة: 255]',
  },
  {
    id: 64,
    name: 'القَيُّوم',
    transliteration: 'Al-Qayyum',
    meaning: 'القائم بذاته المقيم لغيره',
    description: 'هو القائم بنفسه، المقيم لغيره، قائم على كل نفس بما كسبت.',
    evidence: '﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ﴾ [البقرة: 255]',
  },
  {
    id: 65,
    name: 'الوَاجِد',
    transliteration: 'Al-Wajid',
    meaning: 'الغني الذي لا يفتقر',
    description: 'هو الغني الذي لا يحتاج إلى شيء، واجد لكل ما يريد.',
    evidence: 'من أسماء الله الثابتة في السنة',
  },
  {
    id: 66,
    name: 'المَاجِد',
    transliteration: 'Al-Majid',
    meaning: 'العظيم المجد',
    description: 'هو عظيم المجد والكرم، واسع الجود والإحسان.',
    evidence: '﴿ذُو الْعَرْشِ الْمَجِيدُ﴾ [البروج: 15]',
  },
  {
    id: 67,
    name: 'الوَاحِد',
    transliteration: 'Al-Wahid',
    meaning: 'الفرد الذي لا نظير له',
    description: 'هو الفرد الذي لا شريك له ولا نظير له في ذاته وصفاته وأفعاله.',
    evidence: '﴿وَإِلَٰهُكُمْ إِلَٰهٌ وَاحِدٌ﴾ [البقرة: 163]',
  },
  {
    id: 68,
    name: 'الأَحَد',
    transliteration: 'Al-Ahad',
    meaning: 'المتفرد بالكمال',
    description: 'هو المتفرد بصفات الكمال والجلال، الذي لا يقبل الانقسام والتجزئة.',
    evidence: '﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾ [الإخلاص: 1]',
  },
  {
    id: 69,
    name: 'الصَّمَد',
    transliteration: 'As-Samad',
    meaning: 'المقصود في الحوائج',
    description: 'هو السيد الذي يُصمد إليه في الحوائج، الغني عن كل أحد.',
    evidence: '﴿اللَّهُ الصَّمَدُ﴾ [الإخلاص: 2]',
  },
  {
    id: 70,
    name: 'القَادِر',
    transliteration: 'Al-Qadir',
    meaning: 'القادر على كل شيء',
    description: 'هو الذي يقدر على إيجاد المعدوم وإعدام الموجود، لا يعجزه شيء.',
    evidence: '﴿وَهُوَ الْقَاهِرُ فَوْقَ عِبَادِهِ وَهُوَ الْحَكِيمُ الْخَبِيرُ﴾ [الأنعام: 18]',
  },
  {
    id: 71,
    name: 'المُقْتَدِر',
    transliteration: 'Al-Muqtadir',
    meaning: 'التام القدرة',
    description: 'هو البالغ في القدرة منتهاها، المقتدر على جميع المخلوقات.',
    evidence: '﴿فِي مَقْعَدِ صِدْقٍ عِنْدَ مَلِيكٍ مُقْتَدِرٍ﴾ [القمر: 55]',
  },
  {
    id: 72,
    name: 'المُقَدِّم',
    transliteration: 'Al-Muqaddim',
    meaning: 'الذي يقدم ما يشاء',
    description: 'هو الذي يقدم من يشاء بالتوفيق والهداية ورفع المنزلة.',
    evidence: 'من أسماء الله الثابتة في السنة',
  },
  {
    id: 73,
    name: 'المُؤَخِّر',
    transliteration: 'Al-Mu\'akhkhir',
    meaning: 'الذي يؤخر ما يشاء',
    description: 'هو الذي يؤخر من يشاء عن درجات الكمال والقرب.',
    evidence: 'من أسماء الله الثابتة في السنة',
  },
  {
    id: 74,
    name: 'الأَوَّل',
    transliteration: 'Al-Awwal',
    meaning: 'الذي ليس قبله شيء',
    description: 'هو الذي ليس قبله شيء، الأول بلا ابتداء، السابق للوجود كله.',
    evidence: '﴿هُوَ الْأَوَّلُ وَالْآخِرُ﴾ [الحديد: 3]',
  },
  {
    id: 75,
    name: 'الآخِر',
    transliteration: 'Al-Akhir',
    meaning: 'الذي ليس بعده شيء',
    description: 'هو الذي ليس بعده شيء، الباقي بعد فناء كل شيء.',
    evidence: '﴿هُوَ الْأَوَّلُ وَالْآخِرُ﴾ [الحديد: 3]',
  },
  {
    id: 76,
    name: 'الظَّاهِر',
    transliteration: 'Az-Zahir',
    meaning: 'الذي ليس فوقه شيء',
    description: 'هو الظاهر بالأدلة والبراهين على وجوده، الذي ليس فوقه شيء.',
    evidence: '﴿وَالظَّاهِرُ وَالْبَاطِنُ﴾ [الحديد: 3]',
  },
  {
    id: 77,
    name: 'البَاطِن',
    transliteration: 'Al-Batin',
    meaning: 'الذي ليس دونه شيء',
    description: 'هو المحتجب عن الأبصار، الذي لا يدرك بالحواس، العالم بالسرائر.',
    evidence: '﴿وَالظَّاهِرُ وَالْبَاطِنُ﴾ [الحديد: 3]',
  },
  {
    id: 78,
    name: 'الوَالِي',
    transliteration: 'Al-Wali',
    meaning: 'المالك المتصرف',
    description: 'هو المالك للأشياء المتصرف فيها كيف يشاء.',
    evidence: '﴿وَمَا لَهُمْ مِنْ دُونِهِ مِنْ وَالٍ﴾ [الرعد: 11]',
  },
  {
    id: 79,
    name: 'المُتَعَالِ',
    transliteration: 'Al-Muta\'ali',
    meaning: 'المتعالي عن صفات الخلق',
    description: 'هو المتعالي عن صفات المخلوقين، المنزه عن النقائص والعيوب.',
    evidence: '﴿عَالِمُ الْغَيْبِ وَالشَّهَادَةِ الْكَبِيرُ الْمُتَعَالِ﴾ [الرعد: 9]',
  },
  {
    id: 80,
    name: 'البَرّ',
    transliteration: 'Al-Barr',
    meaning: 'الكثير البر والإحسان',
    description: 'هو الذي يعامل عباده بالبر والإحسان واللطف.',
    evidence: '﴿إِنَّهُ هُوَ الْبَرُّ الرَّحِيمُ﴾ [الطور: 28]',
  },
  {
    id: 81,
    name: 'التَّوَّاب',
    transliteration: 'At-Tawwab',
    meaning: 'الذي يقبل التوبة',
    description: 'هو الذي يقبل توبة عباده ويتوب عليهم بقبولها.',
    evidence: '﴿إِنَّهُ هُوَ التَّوَّابُ الرَّحِيمُ﴾ [البقرة: 37]',
  },
  {
    id: 82,
    name: 'المُنْتَقِم',
    transliteration: 'Al-Muntaqim',
    meaning: 'الذي ينتقم من العصاة',
    description: 'هو الذي ينتقم ممن عصاه بعد إقامة الحجة عليه.',
    evidence: '﴿إِنَّا مِنَ الْمُجْرِمِينَ مُنْتَقِمُونَ﴾ [السجدة: 22]',
  },
  {
    id: 83,
    name: 'العَفُوّ',
    transliteration: 'Al-\'Afuw',
    meaning: 'الكثير العفو',
    description: 'هو الذي يعفو عن الذنوب ويمحوها ويتجاوز عنها.',
    evidence: '﴿إِنَّ اللَّهَ كَانَ عَفُوًّا غَفُورًا﴾ [النساء: 43]',
  },
  {
    id: 84,
    name: 'الرَّؤُوف',
    transliteration: 'Ar-Ra\'uf',
    meaning: 'الشديد الرحمة',
    description: 'هو الرحيم بعباده، الشديد الرحمة واللطف بهم.',
    evidence: '﴿إِنَّ اللَّهَ بِالنَّاسِ لَرَءُوفٌ رَحِيمٌ﴾ [البقرة: 143]',
  },
  {
    id: 85,
    name: 'مَالِكُ المُلْك',
    transliteration: 'Malik Al-Mulk',
    meaning: 'مالك الملك كله',
    description: 'هو المالك لجميع الأشياء، المتصرف فيها بلا منازع.',
    evidence: '﴿قُلِ اللَّهُمَّ مَالِكَ الْمُلْكِ﴾ [آل عمران: 26]',
  },
  {
    id: 86,
    name: 'ذُو الجَلَالِ وَالإِكْرَام',
    transliteration: 'Dhul-Jalali wal-Ikram',
    meaning: 'صاحب العظمة والكرم',
    description: 'هو المستحق للتعظيم والإجلال، وللإكرام بالإنعام على عباده.',
    evidence: '﴿تَبَارَكَ اسْمُ رَبِّكَ ذِي الْجَلَالِ وَالْإِكْرَامِ﴾ [الرحمن: 78]',
  },
  {
    id: 87,
    name: 'المُقْسِط',
    transliteration: 'Al-Muqsit',
    meaning: 'العادل في حكمه',
    description: 'هو العادل الذي يضع الأشياء في مواضعها بالعدل.',
    evidence: '﴿وَأَقْسِطُوا إِنَّ اللَّهَ يُحِبُّ الْمُقْسِطِينَ﴾ [الحجرات: 9]',
  },
  {
    id: 88,
    name: 'الجَامِع',
    transliteration: 'Al-Jami\'',
    meaning: 'الذي يجمع الخلائق',
    description: 'هو الذي يجمع الخلائق ليوم الحساب، ويجمع ما تفرق.',
    evidence: '﴿إِنَّ اللَّهَ جَامِعُ الْمُنَافِقِينَ وَالْكَافِرِينَ﴾ [النساء: 140]',
  },
  {
    id: 89,
    name: 'الغَنِيّ',
    transliteration: 'Al-Ghani',
    meaning: 'المستغني عن كل شيء',
    description: 'هو الغني بذاته عن كل ما سواه، لا يحتاج إلى أحد.',
    evidence: '﴿وَاللَّهُ الْغَنِيُّ وَأَنْتُمُ الْفُقَرَاءُ﴾ [محمد: 38]',
  },
  {
    id: 90,
    name: 'المُغْنِي',
    transliteration: 'Al-Mughni',
    meaning: 'الذي يغني من يشاء',
    description: 'هو الذي يغني من يشاء من عباده بفضله وكرمه.',
    evidence: '﴿وَأَنَّهُ هُوَ أَغْنَىٰ وَأَقْنَىٰ﴾ [النجم: 48]',
  },
  {
    id: 91,
    name: 'المَانِع',
    transliteration: 'Al-Mani\'',
    meaning: 'الذي يمنع ما يشاء',
    description: 'هو الذي يمنع ما يشاء عمن يشاء لحكمة يعلمها.',
    evidence: 'من أسماء الله الثابتة في السنة',
  },
  {
    id: 92,
    name: 'الضَّارّ',
    transliteration: 'Ad-Darr',
    meaning: 'الذي يضر من يشاء',
    description: 'هو الذي يقدر الضر على من يشاء من عباده لحكمة.',
    evidence: 'لا يُطلق إلا مع اسم النافع: الضار النافع',
  },
  {
    id: 93,
    name: 'النَّافِع',
    transliteration: 'An-Nafi\'',
    meaning: 'الذي ينفع من يشاء',
    description: 'هو الذي يوصل النفع إلى من يشاء من عباده.',
    evidence: 'لا يُطلق إلا مع اسم الضار: الضار النافع',
  },
  {
    id: 94,
    name: 'النُّور',
    transliteration: 'An-Nur',
    meaning: 'نور السماوات والأرض',
    description: 'هو نور السماوات والأرض، الذي أنار قلوب المؤمنين بالهداية.',
    evidence: '﴿اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ﴾ [النور: 35]',
  },
  {
    id: 95,
    name: 'الهَادِي',
    transliteration: 'Al-Hadi',
    meaning: 'الذي يهدي من يشاء',
    description: 'هو الذي يهدي عباده إلى الحق والصراط المستقيم.',
    evidence: '﴿وَإِنَّ اللَّهَ لَهَادِ الَّذِينَ آمَنُوا إِلَىٰ صِرَاطٍ مُسْتَقِيمٍ﴾ [الحج: 54]',
  },
  {
    id: 96,
    name: 'البَدِيع',
    transliteration: 'Al-Badi\'',
    meaning: 'المبدع على غير مثال',
    description: 'هو الذي أبدع الخلق واخترعه على غير مثال سابق.',
    evidence: '﴿بَدِيعُ السَّمَاوَاتِ وَالْأَرْضِ﴾ [البقرة: 117]',
  },
  {
    id: 97,
    name: 'البَاقِي',
    transliteration: 'Al-Baqi',
    meaning: 'الدائم الوجود',
    description: 'هو الباقي بعد فناء خلقه، الدائم الذي لا يفنى ولا يزول.',
    evidence: '﴿وَيَبْقَىٰ وَجْهُ رَبِّكَ ذُو الْجَلَالِ وَالْإِكْرَامِ﴾ [الرحمن: 27]',
  },
  {
    id: 98,
    name: 'الوَارِث',
    transliteration: 'Al-Warith',
    meaning: 'الباقي بعد فناء الخلق',
    description: 'هو الذي يرث الأرض ومن عليها، الباقي بعد فناء خلقه.',
    evidence: '﴿وَإِنَّا لَنَحْنُ نُحْيِي وَنُمِيتُ وَنَحْنُ الْوَارِثُونَ﴾ [الحجر: 23]',
  },
  {
    id: 99,
    name: 'الرَّشِيد',
    transliteration: 'Ar-Rashid',
    meaning: 'المرشد إلى الصواب',
    description: 'هو الذي يرشد عباده إلى مصالحهم، الحكيم في أفعاله.',
    evidence: '﴿وَإِنْ يُرِدْكَ بِخَيْرٍ فَلَا رَادَّ لِفَضْلِهِ﴾ [يونس: 107]',
  },
  {
    id: 100,
    name: 'الصَّبُور',
    transliteration: 'As-Sabur',
    meaning: 'الذي لا يعجل بالعقوبة',
    description: 'هو الذي لا يعجل بالعقوبة على العصاة، يمهلهم ولا يهملهم.',
    evidence: 'من أسماء الله الثابتة في السنة الصحيحة',
  },
];

// Build translations lookup by ID
const NAMES_MEANINGS_MAP: Record<number, Record<string, string>> = {};
for (const item of (namesTranslations as any).names) {
  NAMES_MEANINGS_MAP[item.id] = item.meanings;
}

/**
 * Get the localized meaning of a name of Allah
 */
function getNameMeaning(name: AllahName, language: string): string {
  const meanings = NAMES_MEANINGS_MAP[name.id];
  if (meanings) {
    return meanings[language] || meanings['ar'] || name.meaning;
  }
  return name.meaning;
}

// ===============================
// المكون الرئيسي
// ===============================
export default function AllahNamesScreen() {
  const router = useRouter();
  const { isDarkMode, settings } = useSettings();
  const { language } = useTranslation();
  const currentLang = settings.language || 'ar';
  
  // الحالة
  const [selectedName, setSelectedName] = useState<AllahName | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  
  // الرسوم المتحركة
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // تحميل المفضلة
  useEffect(() => {
    loadFavorites();
  }, []);
  
  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('allah_names_favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };
  
  const toggleFavorite = async (nameId: number) => {
    let updatedFavorites: number[];
    
    if (favorites.includes(nameId)) {
      updatedFavorites = favorites.filter(id => id !== nameId);
    } else {
      updatedFavorites = [...favorites, nameId];
    }
    
    setFavorites(updatedFavorites);
    await AsyncStorage.setItem('allah_names_favorites', JSON.stringify(updatedFavorites));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // فتح تفاصيل الاسم
  const openNameDetails = (name: AllahName) => {
    setSelectedName(name);
    setShowModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  
  // المشاركة
  const handleShareName = async (name: AllahName) => {
    const localizedMeaning = getNameMeaning(name, currentLang);
    const text = `\u2728 \u0645\u0646 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0644\u0647 \u0627\u0644\u062d\u0633\u0646\u0649 \u2728\n\n\ud83c\udf1f ${name.name}\n\n\ud83d\udc8e \u0627\u0644\u0645\u0639\u0646\u0649: ${localizedMeaning}\n\n\ud83d\udcdd \u0627\u0644\u0634\u0631\u062d:\n${name.description}${name.evidence ? `\n\n\ud83d\udcd6 \u0627\u0644\u062f\u0644\u064a\u0644:\n${name.evidence}` : ''}\n\n${APP_CONFIG.getShareSignature()}`;
    await shareText(text, `${name.name} - \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0644\u0647 \u0627\u0644\u062d\u0633\u0646\u0649`);
    setShowShareModal(false);
  };
  
  const handleCopyName = async (name: AllahName) => {
    const localizedMeaning = getNameMeaning(name, currentLang);
    const text = `✨ من أسماء الله الحسنى ✨\n\n🌟 ${name.name}\n\n💎 المعنى: ${localizedMeaning}\n\n📝 الشرح:\n${name.description}${name.evidence ? `\n\n📖 الدليل:\n${name.evidence}` : ''}\n\n${APP_CONFIG.getShareSignature()}`;
    
    const success = await copyToClipboard(text);
    if (success) {
      Alert.alert('تم النسخ', 'تم نسخ الاسم إلى الحافظة ✓');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowShareModal(false);
  };
  
  const openShareModal = (name: AllahName) => {
    setSelectedName(name);
    setShowShareModal(true);
  };
  
  // التنقل بين الأسماء
  const goToNextName = () => {
    if (selectedName) {
      const currentIndex = ALLAH_NAMES.findIndex(n => n.id === selectedName.id);
      const nextIndex = (currentIndex + 1) % ALLAH_NAMES.length;
      setSelectedName(ALLAH_NAMES[nextIndex]);
    }
  };
  
  const goToPreviousName = () => {
    if (selectedName) {
      const currentIndex = ALLAH_NAMES.findIndex(n => n.id === selectedName.id);
      const prevIndex = currentIndex === 0 ? ALLAH_NAMES.length - 1 : currentIndex - 1;
      setSelectedName(ALLAH_NAMES[prevIndex]);
    }
  };
  
  // فلترة الأسماء
  const filteredNames = searchQuery
    ? ALLAH_NAMES.filter(name =>
        name.name.includes(searchQuery) ||
        name.meaning.includes(searchQuery) ||
        getNameMeaning(name, currentLang).toLowerCase().includes(searchQuery.toLowerCase()) ||
        name.transliteration.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ALLAH_NAMES;
  
  // عرض عنصر الشبكة
  const renderGridItem = ({ item }: { item: AllahName }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => openNameDetails(item)}
      onLongPress={() => openShareModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.gridItemNumber}>
        <Text style={styles.gridItemNumberText}>{item.id}</Text>
      </View>
      
      <Text style={styles.gridItemName}>{item.name}</Text>
      
      {favorites.includes(item.id) && (
        <View style={styles.favoriteIndicator}>
          <Ionicons name="heart" size={12} color={Colors.error} />
        </View>
      )}
    </TouchableOpacity>
  );
  
  // عرض عنصر القائمة
  const renderListItem = ({ item }: { item: AllahName }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => openNameDetails(item)}
      onLongPress={() => openShareModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.listItemLeft}>
        <View style={styles.listItemNumber}>
          <Text style={styles.listItemNumberText}>{item.id}</Text>
        </View>
        
        <View style={styles.listItemContent}>
          <Text style={styles.listItemName}>{item.name}</Text>
          <Text style={styles.listItemMeaning}>{getNameMeaning(item, currentLang)}</Text>
        </View>
      </View>
      
      <View style={styles.listItemActions}>
        <TouchableOpacity
          style={styles.listItemAction}
          onPress={() => openShareModal(item)}
        >
          <Ionicons name="share-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.listItemAction}
          onPress={() => toggleFavorite(item.id)}
        >
          <Ionicons
            name={favorites.includes(item.id) ? 'heart' : 'heart-outline'}
            size={20}
            color={favorites.includes(item.id) ? Colors.error : Colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      style={[styles.container, isDarkMode && { backgroundColor: '#11151c' }]}
    >
    <SafeAreaView style={{ flex: 1 }}>
      {/* الرأس */}
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: 'rgba(120,120,128,0.18)' }]}>
          <Ionicons name="arrow-forward" size={24} color={isDarkMode ? '#fff' : Colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, isDarkMode && { color: '#fff' }]}>أسماء الله الحسنى</Text>
        
        <View style={{ width: 110 }}>
          <NativeTabs
            tabs={[
              { key: 'grid', label: 'شبكة' },
              { key: 'list', label: 'قائمة' },
            ]}
            selected={viewMode}
            onSelect={(key) => setViewMode(key as 'grid' | 'list')}
            indicatorColor="#2f7659"
          />
        </View>
      </View>
      
      {/* بطاقة المعلومات */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color={Colors.primary} />
        <Text style={styles.infoText}>
          قال رسول الله ﷺ: «إن لله تسعة وتسعين اسماً، مائة إلا واحداً، من أحصاها دخل الجنة»
        </Text>
      </View>
      
      {/* القائمة */}
      <FlatList
        data={filteredNames}
        renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
        keyExtractor={item => item.id.toString()}
        numColumns={viewMode === 'grid' ? GRID_COLUMNS : 1}
        key={viewMode}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <BannerAdComponent screen="names" />
      
      {/* نافذة التفاصيل */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModal}>
            {/* الرأس */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>
                {selectedName?.id} / 99
              </Text>
              
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  style={styles.modalHeaderBtn}
                  onPress={() => selectedName && openShareModal(selectedName)}
                >
                  <Ionicons name="share-outline" size={22} color={Colors.primary} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalHeaderBtn}
                  onPress={() => selectedName && toggleFavorite(selectedName.id)}
                >
                  <Ionicons
                    name={selectedName && favorites.includes(selectedName.id) ? 'heart' : 'heart-outline'}
                    size={22}
                    color={selectedName && favorites.includes(selectedName.id) ? Colors.error : Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {selectedName && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* الاسم */}
                <View style={styles.nameSection}>
                  <Text style={styles.bigName}>{selectedName.name}</Text>
                  <Text style={styles.transliteration}>{selectedName.transliteration}</Text>
                </View>
                
                {/* المعنى */}
                <View style={styles.meaningSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="bulb" size={20} color={Colors.gold} />
                    <Text style={styles.sectionTitle}>المعنى</Text>
                  </View>
                  <Text style={styles.meaningText}>{getNameMeaning(selectedName, currentLang)}</Text>
                </View>
                
                {/* الشرح */}
                <View style={styles.descriptionSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="document-text" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>الشرح</Text>
                  </View>
                  <Text style={styles.descriptionText}>{selectedName.description}</Text>
                </View>
                
                {/* الدليل */}
                {selectedName.evidence && (
                  <View style={styles.evidenceSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="book" size={20} color={Colors.secondary} />
                      <Text style={styles.sectionTitle}>الدليل</Text>
                    </View>
                    <Text style={styles.evidenceText}>{selectedName.evidence}</Text>
                  </View>
                )}
                
                {/* أزرار الإجراءات */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                    onPress={() => handleShareName(selectedName)}
                  >
                    <Ionicons name="share-social" size={20} color="#FFF" />
                    <Text style={styles.actionBtnText}>مشاركة</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.secondary }]}
                    onPress={() => handleCopyName(selectedName)}
                  >
                    <Ionicons name="copy" size={20} color="#FFF" />
                    <Text style={styles.actionBtnText}>نسخ</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
            
            {/* أزرار التنقل */}
            <View style={styles.navigationRow}>
              <TouchableOpacity style={styles.navBtn} onPress={goToPreviousName}>
                <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
                <Text style={styles.navBtnText}>السابق</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.navBtn} onPress={goToNextName}>
                <Text style={styles.navBtnText}>التالي</Text>
                <Ionicons name="chevron-back" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* نافذة المشاركة */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableOpacity
          style={styles.shareModalOverlay}
          activeOpacity={1}
          onPress={() => setShowShareModal(false)}
        >
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>مشاركة</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            {selectedName && (
              <>
                <View style={styles.sharePreview}>
                  <Text style={styles.sharePreviewName}>{selectedName.name}</Text>
                  <Text style={styles.sharePreviewMeaning}>{getNameMeaning(selectedName, currentLang)}</Text>
                </View>
                
                <View style={styles.shareOptions}>
                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleShareName(selectedName)}
                  >
                    <View style={styles.shareOptionIcon}>
                      <Ionicons name="share-social" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.shareOptionText}>مشاركة</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleCopyName(selectedName)}
                  >
                    <View style={styles.shareOptionIcon}>
                      <Ionicons name="copy" size={24} color={Colors.secondary} />
                    </View>
                    <Text style={styles.shareOptionText}>نسخ</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => {
                      handleShareName(selectedName);
                    }}
                  >
                    <View style={styles.shareOptionIcon}>
                      <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                    </View>
                    <Text style={styles.shareOptionText}>واتساب</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => {
                      toggleFavorite(selectedName.id);
                      setShowShareModal(false);
                    }}
                  >
                    <View style={styles.shareOptionIcon}>
                      <Ionicons
                        name={favorites.includes(selectedName.id) ? 'heart' : 'heart-outline'}
                        size={24}
                        color={Colors.error}
                      />
                    </View>
                    <Text style={styles.shareOptionText}>
                      {favorites.includes(selectedName.id) ? 'إزالة' : 'مفضلة'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ===============================
// الأنماط
// ===============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11151c',
  },
  
  // الرأس
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'transparent',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: Colors.text,
  },
  
  // بطاقة المعلومات
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
    lineHeight: 22,
  },
  
  // القائمة
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  
  // عنصر الشبكة
  gridItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    margin: Spacing.xs,
    backgroundColor: 'rgba(120,120,128,0.15)',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemNumber: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemNumberText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Cairo-Bold',
  },
  gridItemName: {
    fontSize: 22,
    fontFamily: 'Amiri-Bold',
    color: Colors.text,
    textAlign: 'center',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  
  // عنصر القائمة
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: 'rgba(120,120,128,0.15)',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  listItemNumberText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    fontSize: 20,
    fontFamily: 'Amiri-Bold',
    color: Colors.text,
  },
  listItemMeaning: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  listItemAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // نافذة التفاصيل
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailsModal: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: Colors.textMuted,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // قسم الاسم
  nameSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.primary + '08',
  },
  bigName: {
    fontSize: 48,
    fontFamily: 'Amiri-Bold',
    color: Colors.primary,
  },
  transliteration: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  
  // الأقسام
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: '#FFFFFF',
  },
  
  meaningSection: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  meaningText: {
    fontSize: 18,
    fontFamily: 'Cairo-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  
  descriptionSection: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    color: '#E0E0E0',
    lineHeight: 26,
    textAlign: 'justify',
  },
  
  evidenceSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.secondary + '08',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  evidenceText: {
    fontSize: 16,
    fontFamily: 'Amiri-Regular',
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 28,
  },
  
  // أزرار الإجراءات
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 14,
    gap: Spacing.xs,
    backgroundColor: 'rgba(120,120,128,0.18)',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
  },
  
  // أزرار التنقل
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  navBtnText: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: Colors.primary,
  },
  
  // نافذة المشاركة
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  shareModalTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: Colors.text,
  },
  sharePreview: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  sharePreviewName: {
    fontSize: 32,
    fontFamily: 'Amiri-Bold',
    color: Colors.primary,
  },
  sharePreviewMeaning: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shareOption: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shareOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareOptionText: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: Colors.text,
  },
});
