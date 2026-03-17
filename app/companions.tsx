// app/companions.tsx
// صفحة قصص الصحابة - روح المسلم

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  LayoutAnimation,
  UIManager,
  Share,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/use-colors';
import { useSettings, useTranslation } from '@/contexts/SettingsContext';
import { t, getLanguage } from '@/lib/i18n';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { exportAsPDF, showAdThenExport, PdfTemplate } from '@/lib/pdf-export';
import { PdfTemplatePicker } from '@/components/ui/PdfTemplatePicker';
import { isFavorited, toggleFavorite } from '@/lib/favorites-manager';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { useCompanionsContent } from '@/lib/content-api';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing } from '@/constants/theme';
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ========================================
// الألوان
// ========================================

const ACCENT = '#2f7659';
const ACCENT_LIGHT = 'rgba(47,118,89,0.12)';
const ACCENT_BORDER = 'rgba(47,118,89,0.30)';

// ========================================
// أنواع البيانات
// ========================================

type CategoryKey = 'ashara' | 'muhajirun' | 'ansar' | 'mothers';

interface Companion {
  id: string;
  nameAr: string;
  nameEn: string;
  category: CategoryKey;
  brief: string;
  briefEn: string;
  story: string[];
  storyEn: string[];
  virtues: string[];
  virtuesEn: string[];
}

interface Category {
  key: CategoryKey;
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}

// ========================================
// التصنيفات
// ========================================

const CATEGORIES: Category[] = [
  { key: 'ashara', title: 'العشرة المبشرون بالجنة', icon: 'star-crescent' },
  { key: 'muhajirun', title: 'المهاجرون', icon: 'road-variant' },
  { key: 'ansar', title: 'الأنصار', icon: 'home-heart' },
  { key: 'mothers', title: 'أمهات المؤمنين', icon: 'heart-multiple' },
];

const CATEGORY_KEYS: Record<CategoryKey, string> = {
  ashara: 'companions.categoryTenPromised',
  muhajirun: 'companions.categoryMuhajirun',
  ansar: 'companions.categoryAnsar',
  mothers: 'companions.categoryMothers',
};

// ========================================
// بيانات الصحابة
// ========================================

const COMPANIONS: Companion[] = [
  // ── العشرة المبشرون بالجنة ──
  {
    id: 'abu-bakr',
    nameAr: 'أبو بكر الصديق',
    nameEn: 'Abu Bakr As-Siddiq',
    category: 'ashara',
    brief: 'أول الخلفاء الراشدين وأول من أسلم من الرجال',
    briefEn: 'First of the Rightly Guided Caliphs and the first man to embrace Islam',
    story: [
      'هو عبد الله بن عثمان بن عامر القرشي التيمي، رضي الله عنه. وُلد بمكة سنة 573م، وكان من أشراف قريش وعلمائها بالأنساب. لُقِّب بالصدِّيق لتصديقه النبي ﷺ في كل ما جاء به، وخاصة في حادثة الإسراء والمعراج حين قال: "إن كان قاله فقد صدق".',
      'كان أول من أسلم من الرجال الأحرار، وأنفق ماله كله في سبيل الله. اشترى عدداً من العبيد المعذَّبين فأعتقهم، منهم بلال بن رباح رضي الله عنه. وكان رفيق النبي ﷺ في الهجرة إلى المدينة، واختبأ معه في غار ثور.',
      'بويع بالخلافة بعد وفاة النبي ﷺ، وكان أول أعماله حروب الردة التي حفظ بها الإسلام. ثبّت الله به الأمة في أحلك الظروف حين قال: "من كان يعبد محمداً فإن محمداً قد مات، ومن كان يعبد الله فإن الله حي لا يموت." جمع القرآن الكريم في عهده بعد استشهاد كثير من الحفاظ في حروب الردة.',
      'توفي رضي الله عنه سنة 13 هـ عن عمر يناهز 63 سنة، ودُفن بجوار النبي ﷺ في المسجد النبوي.',
    ],
    storyEn: [
      'He is Abdullah ibn Uthman ibn Amir al-Qurashi al-Taymi, may Allah be pleased with him. He was born in Makkah in 573 CE and was among the nobles of Quraysh and their genealogy scholars. He was given the title "As-Siddiq" (the truthful) for believing the Prophet ﷺ in everything, especially during the incident of al-Isra wal-Mi\'raj when he said: "If he said it, then it is true."',
      'He was the first free man to embrace Islam and spent all his wealth in the cause of Allah. He purchased and freed several tortured slaves, among them Bilal ibn Rabah, may Allah be pleased with him. He was the Prophet\'s ﷺ companion during the Hijrah to Madinah and hid with him in the Cave of Thawr.',
      'He was pledged allegiance as Caliph after the death of the Prophet ﷺ. His first task was fighting the Riddah (apostasy) wars, which preserved Islam. Allah strengthened the Ummah through him in the darkest times when he declared: "Whoever worshipped Muhammad, Muhammad has died. Whoever worships Allah, Allah is Ever-Living and never dies." The Quran was compiled into one book during his reign after many memorizers were martyred in the Riddah wars.',
      'He passed away, may Allah be pleased with him, in the year 13 AH at the age of about 63, and was buried next to the Prophet ﷺ in the Prophet\'s Mosque.',
    ],
    virtues: ['أول من أسلم من الرجال', 'رفيق النبي ﷺ في الهجرة', 'أول الخلفاء الراشدين', 'أنفق ماله كله في سبيل الله'],
    virtuesEn: ['First man to embrace Islam', 'Companion of the Prophet ﷺ in the Hijrah', 'First of the Rightly Guided Caliphs', 'Spent all his wealth in the cause of Allah'],
  },
  {
    id: 'umar',
    nameAr: 'عمر بن الخطاب',
    nameEn: 'Umar ibn Al-Khattab',
    category: 'ashara',
    brief: 'الفاروق، ثاني الخلفاء الراشدين',
    briefEn: 'Al-Faruq, the second of the Rightly Guided Caliphs',
    story: [
      'هو عمر بن الخطاب العدوي القرشي، رضي الله عنه، لُقِّب بالفاروق لأن الله فرّق به بين الحق والباطل. أسلم في السنة السادسة من البعثة، وكان إسلامه عزاً للمسلمين. قال النبي ﷺ: "اللهم أعِزّ الإسلام بأحب الرجلين إليك: عمر بن الخطاب أو أبي جهل." فكان عمر.',
      'كان شديداً في الحق، عادلاً في حكمه. فتحت في عهده بلاد الشام والعراق ومصر وفارس. وهو أول من دوّن الدواوين، ووضع التقويم الهجري، وأسس نظام القضاء. كان يتفقد رعيته بالليل ويقول: "لو عثرت بغلة في العراق لخشيت أن يسألني الله عنها: لِمَ لَم تُسوِّ لها الطريق يا عمر؟"',
      'من أشهر مواقفه فتح بيت المقدس سنة 15 هـ، حين جاء بنفسه لتسلّم مفاتيح المدينة من البطريرك صفرونيوس. ورفض الصلاة في كنيسة القيامة حتى لا يتخذها المسلمون مسجداً من بعده.',
      'استشهد رضي الله عنه سنة 23 هـ، طعنه أبو لؤلؤة المجوسي وهو يصلي الفجر. ودُفن بجوار النبي ﷺ وأبي بكر.',
    ],
    storyEn: [
      'He is Umar ibn al-Khattab al-Adawi al-Qurashi, may Allah be pleased with him. He was given the title "Al-Faruq" because Allah distinguished through him between truth and falsehood. He embraced Islam in the sixth year of the Prophet\'s mission, and his conversion was a source of strength for the Muslims. The Prophet ﷺ said: "O Allah, strengthen Islam with the dearest of these two men to You: Umar ibn al-Khattab or Abu Jahl." And it was Umar.',
      'He was firm in upholding the truth and just in his rule. During his caliphate, the lands of Sham, Iraq, Egypt, and Persia were conquered. He was the first to establish government registers, introduced the Hijri calendar, and founded the judicial system. He would patrol his subjects at night and said: "If a mule stumbled in Iraq, I would fear that Allah would ask me: Why did you not pave the road for it, O Umar?"',
      'Among his most famous acts was the conquest of Jerusalem in 15 AH, when he personally came to receive the keys of the city from Patriarch Sophronius. He refused to pray in the Church of the Holy Sepulchre so that Muslims would not turn it into a mosque after him.',
      'He was martyred, may Allah be pleased with him, in 23 AH. Abu Lu\'lu\'a al-Majusi stabbed him while he was leading the Fajr prayer. He was buried beside the Prophet ﷺ and Abu Bakr.',
    ],
    virtues: ['الفاروق بين الحق والباطل', 'فاتح بيت المقدس', 'أول من وضع التقويم الهجري', 'عُرف بالعدل والزهد'],
    virtuesEn: ['Distinguished between truth and falsehood', 'Conqueror of Jerusalem', 'First to establish the Hijri calendar', 'Known for justice and asceticism'],
  },
  {
    id: 'uthman',
    nameAr: 'عثمان بن عفان',
    nameEn: 'Uthman ibn Affan',
    category: 'ashara',
    brief: 'ذو النورين، ثالث الخلفاء الراشدين',
    briefEn: 'Dhun-Nurayn (Possessor of Two Lights), the third Rightly Guided Caliph',
    story: [
      'هو عثمان بن عفان الأموي القرشي، رضي الله عنه. لُقِّب بذي النورين لزواجه من ابنتي النبي ﷺ: رُقية ثم أم كلثوم. كان من أوائل من أسلم، وهاجر الهجرتين إلى الحبشة ثم إلى المدينة.',
      'كان أكثر قريش مالاً وأسخاهم يداً. جهّز جيش العُسرة بأكمله في غزوة تبوك حتى قال النبي ﷺ: "ما ضرّ عثمان ما عمل بعد اليوم." واشترى بئر رومة وجعلها وقفاً للمسلمين.',
      'في خلافته جُمع المصحف الشريف وتمّ توحيد القراءة على حرف واحد، وأُرسلت النسخ إلى الأمصار. كما اتسعت الفتوحات فشملت أرمينيا وأفريقيا وقبرص.',
      'استشهد رضي الله عنه مظلوماً في بيته سنة 35 هـ وهو يقرأ القرآن، ودمه على المصحف الشريف.',
    ],
    storyEn: [
      'He is Uthman ibn Affan al-Umawi al-Qurashi, may Allah be pleased with him. He was given the title "Dhun-Nurayn" (Possessor of Two Lights) because he married two daughters of the Prophet ﷺ: Ruqayyah then Umm Kulthum. He was among the earliest converts and migrated twice—to Abyssinia and then to Madinah.',
      'He was the wealthiest and most generous of Quraysh. He equipped the entire Army of Hardship for the Battle of Tabuk until the Prophet ﷺ said: "Nothing Uthman does after today can harm him." He also purchased the well of Rumah and made it a public endowment for the Muslims.',
      'During his caliphate, the Quran was compiled into a standardized Mushaf and copies were sent to the major cities. The conquests expanded to include Armenia, North Africa, and Cyprus.',
      'He was martyred unjustly in his own home in 35 AH while reading the Quran, and his blood stained the pages of the Mushaf.',
    ],
    virtues: ['ذو النورين', 'جهّز جيش العُسرة', 'جمع المصحف الشريف', 'من أكثر الصحابة إنفاقاً'],
    virtuesEn: ['Possessor of Two Lights', 'Equipped the Army of Hardship', 'Compiled the standardized Mushaf', 'Among the most generous companions'],
  },
  {
    id: 'ali',
    nameAr: 'علي بن أبي طالب',
    nameEn: 'Ali ibn Abi Talib',
    category: 'ashara',
    brief: 'باب مدينة العلم، رابع الخلفاء الراشدين',
    briefEn: 'The Gate to the City of Knowledge, the fourth Rightly Guided Caliph',
    story: [
      'هو علي بن أبي طالب بن عبد المطلب الهاشمي القرشي، رضي الله عنه، ابن عم النبي ﷺ وزوج ابنته فاطمة الزهراء. أول من أسلم من الصبيان، ونام في فراش النبي ﷺ ليلة الهجرة فداءً له.',
      'كان فارساً شجاعاً وعالماً فقيهاً. أبلى في غزوات بدر وأُحد والخندق بلاءً حسناً. وفي غزوة خيبر أعطاه النبي ﷺ الراية وقال: "لأُعطيَنّ الراية غداً رجلاً يحب الله ورسوله ويحبه الله ورسوله." ففتح الله على يديه.',
      'بويع بالخلافة بعد استشهاد عثمان رضي الله عنه. قال عنه النبي ﷺ: "أنا مدينة العلم وعلي بابها." كان قاضياً حكيماً وخطيباً بليغاً، ومن أشهر أقواله: "لا تستوحشوا طريق الحق لقلة سالكيه."',
      'استشهد رضي الله عنه سنة 40 هـ على يد عبد الرحمن بن ملجم أثناء صلاة الفجر في مسجد الكوفة.',
    ],
    storyEn: [
      'He is Ali ibn Abi Talib ibn Abdul-Muttalib al-Hashimi al-Qurashi, may Allah be pleased with him, the Prophet\'s ﷺ cousin and husband of his daughter Fatimah az-Zahra. He was the first boy to embrace Islam and slept in the Prophet\'s ﷺ bed on the night of the Hijrah to protect him.',
      'He was a brave knight and a learned scholar of jurisprudence. He showed great valor in the battles of Badr, Uhud, and al-Khandaq. In the Battle of Khaybar, the Prophet ﷺ gave him the banner and said: "Tomorrow I will give the banner to a man who loves Allah and His Messenger and whom Allah and His Messenger love." And Allah granted victory through him.',
      'He was pledged allegiance as Caliph after the martyrdom of Uthman. The Prophet ﷺ said about him: "I am the city of knowledge and Ali is its gate." He was a wise judge and an eloquent speaker. Among his famous sayings: "Do not feel lonely on the path of truth because few walk it."',
      'He was martyred, may Allah be pleased with him, in 40 AH at the hands of Abdur-Rahman ibn Muljam during the Fajr prayer in the mosque of Kufa.',
    ],
    virtues: ['أول من أسلم من الصبيان', 'باب مدينة العلم', 'فاتح خيبر', 'نام في فراش النبي ﷺ ليلة الهجرة'],
    virtuesEn: ['First boy to embrace Islam', 'The Gate to the City of Knowledge', 'Conqueror of Khaybar', 'Slept in the Prophet\'s ﷺ bed the night of Hijrah'],
  },
  {
    id: 'talha',
    nameAr: 'طلحة بن عبيد الله',
    nameEn: 'Talha ibn Ubaydillah',
    category: 'ashara',
    brief: 'طلحة الخير، من أوائل المسلمين',
    briefEn: 'Talha the Generous, among the earliest Muslims',
    story: [
      'هو طلحة بن عبيد الله التيمي القرشي، رضي الله عنه. أسلم على يد أبي بكر الصديق، وكان من أوائل ثمانية أسلموا. عُذّب في سبيل الله فصبر واحتسب.',
      'في غزوة أُحد وقى النبي ﷺ بنفسه حتى شُلّت يده. اتّخذ جسده درعاً للنبي ﷺ وأصابته أكثر من سبعين طعنة ورمية. قال النبي ﷺ: "من أحبّ أن ينظر إلى شهيد يمشي على وجه الأرض فلينظر إلى طلحة بن عبيد الله."',
      'لُقِّب بطلحة الخير وطلحة الفيّاض لكثرة جوده وإنفاقه. كان من أغنياء الصحابة لكنه أنفق ماله في سبيل الله.',
      'استشهد رضي الله عنه في موقعة الجمل سنة 36 هـ.',
    ],
    storyEn: [
      'He is Talha ibn Ubaydillah al-Taymi al-Qurashi, may Allah be pleased with him. He embraced Islam through Abu Bakr as-Siddiq and was among the first eight people to accept Islam. He was tortured for the sake of Allah but endured patiently.',
      'In the Battle of Uhud, he shielded the Prophet ﷺ with his own body until his hand was paralyzed. He used his body as armor for the Prophet ﷺ and sustained more than seventy stab wounds and arrow strikes. The Prophet ﷺ said: "Whoever wishes to see a martyr walking on the face of the earth, let him look at Talha ibn Ubaydillah."',
      'He was given the titles "Talha the Good" and "Talha the Generous" for his immense generosity and spending. He was one of the wealthiest companions but spent his wealth in the cause of Allah.',
      'He was martyred, may Allah be pleased with him, in the Battle of the Camel in 36 AH.',
    ],
    virtues: ['وقى النبي ﷺ بنفسه يوم أُحد', 'لُقّب بطلحة الخير', 'من أوائل ثمانية أسلموا', 'شهيد يمشي على الأرض'],
    virtuesEn: ['Shielded the Prophet ﷺ at Uhud', 'Titled Talha the Good', 'Among the first eight to embrace Islam', 'A martyr walking on earth'],
  },
  {
    id: 'zubayr',
    nameAr: 'الزبير بن العوام',
    nameEn: 'Az-Zubayr ibn Al-Awwam',
    category: 'ashara',
    brief: 'حواري رسول الله ﷺ',
    briefEn: 'The Disciple (Hawari) of the Messenger of Allah ﷺ',
    story: [
      'هو الزبير بن العوام بن خويلد القرشي الأسدي، رضي الله عنه، ابن عمة النبي ﷺ صفية بنت عبد المطلب. أسلم وعمره ست عشرة سنة، وكان أول من سلّ سيفاً في الإسلام حين شاع أن النبي ﷺ قُتل فخرج بسيفه يشق مكة.',
      'هاجر الهجرتين إلى الحبشة وإلى المدينة. شهد بدراً وأُحداً والأحزاب وجميع الغزوات مع النبي ﷺ. لقّبه النبي ﷺ بحواريّه، وقال: "إن لكل نبي حوارياً وحواريّ الزبير."',
      'كان فارساً شجاعاً ومقداماً، تظهر في جسده آثار الطعنات والضربات كالعيون في خبز القرص من كثرة الجراح.',
      'قُتل رضي الله عنه سنة 36 هـ بعد موقعة الجمل.',
    ],
    storyEn: [
      'He is Az-Zubayr ibn Al-Awwam ibn Khuwaylid al-Qurashi al-Asadi, may Allah be pleased with him, the son of the Prophet\'s ﷺ paternal aunt Safiyyah bint Abdul-Muttalib. He embraced Islam at the age of sixteen and was the first to draw a sword in Islam when a rumor spread that the Prophet ﷺ had been killed, so he went out with his sword through Makkah.',
      'He migrated twice — to Abyssinia and to Madinah. He fought at Badr, Uhud, the Trench, and all the battles alongside the Prophet ﷺ. The Prophet ﷺ called him his disciple (Hawari) and said: "Every prophet has a disciple, and my disciple is Az-Zubayr."',
      'He was a brave and courageous horseman. His body bore the marks of stab wounds and strikes like holes in flatbread from the many injuries he sustained.',
      'He was killed, may Allah be pleased with him, in 36 AH after the Battle of the Camel.',
    ],
    virtues: ['حواري رسول الله ﷺ', 'أول من سلّ سيفاً في الإسلام', 'شهد جميع الغزوات', 'ابن عمة النبي ﷺ'],
    virtuesEn: ['The Disciple of the Messenger of Allah ﷺ', 'First to draw a sword in Islam', 'Fought in all the battles', 'Son of the Prophet\'s ﷺ paternal aunt'],
  },
  {
    id: 'saad',
    nameAr: 'سعد بن أبي وقاص',
    nameEn: 'Saad ibn Abi Waqqas',
    category: 'ashara',
    brief: 'أول من رمى بسهم في سبيل الله',
    briefEn: 'First to shoot an arrow in the cause of Allah',
    story: [
      'هو سعد بن أبي وقاص مالك القرشي الزهري، رضي الله عنه. أسلم وهو ابن سبع عشرة سنة، وكان ثالث من أسلم أو سابعهم. كان أول من رمى بسهم في سبيل الله، وأول من أهرق دماً في سبيل الله.',
      'كان مستجاب الدعوة، قال له النبي ﷺ: "اللهم سدّد رميته وأجب دعوته." فكان لا يدعو إلا استُجيب له.',
      'في خلافة عمر رضي الله عنه قاد الجيوش الإسلامية في معركة القادسية سنة 15 هـ التي كانت فاتحة سقوط الإمبراطورية الفارسية. وبنى مدينة الكوفة.',
      'توفي رضي الله عنه سنة 55 هـ، وكان آخر العشرة المبشرين بالجنة وفاةً.',
    ],
    storyEn: [
      'He is Saad ibn Abi Waqqas Malik al-Qurashi az-Zuhri, may Allah be pleased with him. He embraced Islam at the age of seventeen and was the third or seventh person to accept Islam. He was the first to shoot an arrow in the cause of Allah and the first to shed blood for His sake.',
      'His supplications were always answered. The Prophet ﷺ prayed for him saying: "O Allah, guide his aim and answer his supplication." And so whenever he made dua, it was answered.',
      'During the caliphate of Umar, may Allah be pleased with him, he led the Muslim armies in the Battle of al-Qadisiyyah in 15 AH, which marked the beginning of the fall of the Persian Empire. He also founded the city of Kufa.',
      'He passed away, may Allah be pleased with him, in 55 AH, and was the last of the ten companions promised Paradise to die.',
    ],
    virtues: ['أول من رمى بسهم في سبيل الله', 'مستجاب الدعوة', 'قائد معركة القادسية', 'آخر العشرة المبشرين وفاةً'],
    virtuesEn: ['First to shoot an arrow in the cause of Allah', 'His supplications were always answered', 'Commander at the Battle of al-Qadisiyyah', 'Last of the ten promised Paradise to die'],
  },
  {
    id: 'said',
    nameAr: 'سعيد بن زيد',
    nameEn: 'Said ibn Zayd',
    category: 'ashara',
    brief: 'من السابقين الأولين إلى الإسلام',
    briefEn: 'Among the earliest to embrace Islam',
    story: [
      'هو سعيد بن زيد بن عمرو بن نُفيل العدوي القرشي، رضي الله عنه، ابن عم عمر بن الخطاب وزوج أخته فاطمة. كان أبوه زيد بن عمرو من الحنفاء الذين تركوا عبادة الأصنام قبل الإسلام.',
      'أسلم مبكراً هو وزوجته فاطمة بنت الخطاب. وكان إسلام عمر بن الخطاب في بيت سعيد حين جاء يبحث عن أخته التي أسلمت.',
      'شهد المشاهد كلها مع النبي ﷺ عدا بدر، وكان من الشجعان الأبطال. شارك في فتح دمشق وكان من أبرز قادة الجيش.',
      'توفي رضي الله عنه سنة 51 هـ بالمدينة.',
    ],
    storyEn: [
      'He is Said ibn Zayd ibn Amr ibn Nufayl al-Adawi al-Qurashi, may Allah be pleased with him, the cousin of Umar ibn al-Khattab and the husband of his sister Fatimah. His father Zayd ibn Amr was among the Hanifs who abandoned idol worship before Islam.',
      'He embraced Islam early along with his wife Fatimah bint al-Khattab. Umar ibn al-Khattab\'s conversion to Islam took place in Said\'s house when Umar came searching for his sister who had accepted Islam.',
      'He participated in all the battles with the Prophet ﷺ except Badr, and was among the brave heroes. He took part in the conquest of Damascus and was one of the most prominent army commanders.',
      'He passed away, may Allah be pleased with him, in 51 AH in Madinah.',
    ],
    virtues: ['من السابقين الأولين', 'إسلام عمر كان في بيته', 'شهد المشاهد كلها عدا بدر', 'من فاتحي دمشق'],
    virtuesEn: ['Among the earliest Muslims', 'Umar\'s conversion happened in his house', 'Fought in all battles except Badr', 'Among the conquerors of Damascus'],
  },
  {
    id: 'abdulrahman',
    nameAr: 'عبد الرحمن بن عوف',
    nameEn: 'Abdur-Rahman ibn Awf',
    category: 'ashara',
    brief: 'من أغنى الصحابة وأكثرهم إنفاقاً',
    briefEn: 'One of the wealthiest companions and most generous in spending',
    story: [
      'هو عبد الرحمن بن عوف الزهري القرشي، رضي الله عنه. أسلم على يد أبي بكر الصديق قبل دخول النبي ﷺ دار الأرقم، وكان من الثمانية السابقين إلى الإسلام.',
      'هاجر إلى المدينة ولم يكن معه شيء، فآخى النبي ﷺ بينه وبين سعد بن الربيع الأنصاري. عرض عليه سعد نصف ماله وأن يطلّق له إحدى زوجتيه، فقال: "بارك الله لك في مالك وأهلك، دلّني على السوق." فتاجر حتى صار من أغنى أهل المدينة.',
      'أنفق أموالاً عظيمة في سبيل الله. تصدّق بقافلة كاملة جاءت من الشام فيها سبعمئة راحلة محمّلة بالبضائع. وجهّز كثيراً من الغزوات.',
      'توفي رضي الله عنه سنة 32 هـ بالمدينة.',
    ],
    storyEn: [
      'He is Abdur-Rahman ibn Awf az-Zuhri al-Qurashi, may Allah be pleased with him. He embraced Islam through Abu Bakr as-Siddiq before the Prophet ﷺ entered Dar al-Arqam, and was among the first eight to accept Islam.',
      'He migrated to Madinah with nothing. The Prophet ﷺ established brotherhood between him and Saad ibn ar-Rabi al-Ansari. Saad offered him half his wealth and to divorce one of his wives for him, but he replied: "May Allah bless you in your wealth and family — just show me where the market is." He traded until he became one of the wealthiest people in Madinah.',
      'He spent enormous amounts in the cause of Allah. He donated an entire caravan that came from Syria carrying seven hundred loaded camels of merchandise. He also funded many military expeditions.',
      'He passed away, may Allah be pleased with him, in 32 AH in Madinah.',
    ],
    virtues: ['من الثمانية السابقين', 'تاجر أمين ناجح', 'أنفق أموالاً عظيمة في سبيل الله', 'من أهل الشورى'],
    virtuesEn: ['Among the first eight to embrace Islam', 'A trustworthy and successful merchant', 'Spent enormous wealth in the cause of Allah', 'Among the members of the Shura council'],
  },
  {
    id: 'abu-ubayda',
    nameAr: 'أبو عبيدة بن الجراح',
    nameEn: 'Abu Ubayda ibn Al-Jarrah',
    category: 'ashara',
    brief: 'أمين هذه الأمة',
    briefEn: 'The Trustee of this Ummah',
    story: [
      'هو عامر بن عبد الله بن الجراح القرشي الفهري، رضي الله عنه. أسلم على يد أبي بكر الصديق في أوائل الإسلام. لُقِّب بأمين الأمة، قال النبي ﷺ: "إن لكل أمة أميناً، وإن أميننا أيتها الأمة أبو عبيدة بن الجراح."',
      'شهد بدراً وأحداً وجميع الغزوات. في غزوة أُحد نزع الحلقتين اللتين دخلتا في وجنة النبي ﷺ من المِغفر بأسنانه فسقطت ثنيّتاه.',
      'تولى قيادة الجيوش الإسلامية في الشام في خلافة عمر، ففتح سوريا وفلسطين. كان زاهداً متواضعاً رغم ما ولّاه المسلمون.',
      'توفي رضي الله عنه في طاعون عمواس سنة 18 هـ بالأردن.',
    ],
    storyEn: [
      'He is Amir ibn Abdullah ibn al-Jarrah al-Qurashi al-Fihri, may Allah be pleased with him. He embraced Islam through Abu Bakr as-Siddiq in the early days of Islam. He was given the title "Trustee of the Ummah." The Prophet ﷺ said: "Every nation has a trustee, and the trustee of this Ummah is Abu Ubayda ibn al-Jarrah."',
      'He fought at Badr, Uhud, and all the battles. At the Battle of Uhud, he pulled out the two rings of the helmet that had pierced into the Prophet\'s ﷺ cheek using his teeth, losing his two front teeth in the process.',
      'He took command of the Muslim armies in the Levant during the caliphate of Umar, conquering Syria and Palestine. He was known for his asceticism and humility despite the great authority the Muslims entrusted to him.',
      'He passed away, may Allah be pleased with him, during the Plague of Amwas in 18 AH in Jordan.',
    ],
    virtues: ['أمين هذه الأمة', 'شهد جميع الغزوات', 'فاتح الشام', 'عُرف بالزهد والتواضع'],
    virtuesEn: ['The Trustee of this Ummah', 'Fought in all the battles', 'Conqueror of the Levant', 'Known for his asceticism and humility'],
  },

  // ── المهاجرون ──
  {
    id: 'bilal',
    nameAr: 'بلال بن رباح',
    nameEn: 'Bilal ibn Rabah',
    category: 'muhajirun',
    brief: 'مؤذن رسول الله ﷺ وأول من أذّن في الإسلام',
    briefEn: 'The Muezzin of the Messenger of Allah ﷺ and the first to call the Adhan in Islam',
    story: [
      'هو بلال بن رباح الحبشي، رضي الله عنه، مولى أبي بكر الصديق. كان عبداً لأمية بن خلف الذي عذّبه عذاباً شديداً لإسلامه. كان يُلقى على الرمال المحرقة ويُوضع على صدره الصخر العظيم وهو يردد: "أحدٌ أحد."',
      'اشتراه أبو بكر الصديق رضي الله عنه وأعتقه. فكان من أخلص أصحاب النبي ﷺ وأقربهم إليه. اختاره النبي ﷺ ليكون أول مؤذن في الإسلام فكان صوته يملأ سماء المدينة بالأذان.',
      'هاجر إلى المدينة وشهد بدراً وأُحداً وجميع الغزوات. بعد وفاة النبي ﷺ لم يستطع أن يؤذن من شدة البكاء، فخرج إلى الشام مجاهداً.',
      'توفي رضي الله عنه بدمشق سنة 20 هـ وهو يقول: "غداً ألقى الأحبة، محمداً وصحبه."',
    ],
    storyEn: [
      'He is Bilal ibn Rabah al-Habashi, may Allah be pleased with him, the freed slave of Abu Bakr as-Siddiq. He was a slave of Umayyah ibn Khalaf who tortured him severely for his Islam. He would be thrown onto the scorching sand with a huge boulder placed on his chest while he repeated: "Ahad, Ahad" (One, One).',
      'Abu Bakr as-Siddiq, may Allah be pleased with him, purchased and freed him. He became one of the most devoted and closest companions of the Prophet ﷺ. The Prophet ﷺ chose him to be the first muezzin in Islam, and his voice would fill the skies of Madinah with the call to prayer.',
      'He migrated to Madinah and fought at Badr, Uhud, and all the battles. After the death of the Prophet ﷺ, he could not bring himself to call the adhan due to overwhelming grief, so he went to the Levant as a fighter.',
      'He passed away, may Allah be pleased with him, in Damascus in 20 AH, saying: "Tomorrow I shall meet the beloved ones — Muhammad and his companions."',
    ],
    virtues: ['أول مؤذن في الإسلام', 'صبر على التعذيب حتى قال: أحدٌ أحد', 'شهد جميع الغزوات', 'من السابقين إلى الإسلام'],
    virtuesEn: ['First muezzin in Islam', 'Endured torture saying: Ahad, Ahad (One, One)', 'Fought in all the battles', 'Among the earliest to embrace Islam'],
  },
  {
    id: 'ammar',
    nameAr: 'عمار بن ياسر',
    nameEn: 'Ammar ibn Yasir',
    category: 'muhajirun',
    brief: 'من أوائل المسلمين، ابن أول شهيدة في الإسلام',
    briefEn: "Among the earliest Muslims, son of the first female martyr in Islam",
    story: [
      'هو عمار بن ياسر العنسي، رضي الله عنه. أسلم هو وأبوه ياسر وأمه سمية في أوائل الإسلام. عُذّبت عائلته عذاباً شديداً من قبل أبي جهل وقريش. مرّ بهم النبي ﷺ وهم يُعذَّبون فقال: "صبراً آل ياسر، فإن موعدكم الجنة."',
      'استشهدت سمية أمه فكانت أول شهيدة في الإسلام، ثم استشهد أبوه ياسر. أُكره عمار على الكفر فنطق بكلمة الكفر مُكرهاً وقلبه مطمئن بالإيمان، فنزل فيه: ﴿إِلَّا مَنْ أُكْرِهَ وَقَلْبُهُ مُطْمَئِنٌّ بِالْإِيمَانِ﴾.',
      'قال عنه النبي ﷺ: "إن عماراً مُلئ إيماناً من مشاشه إلى قدمه." وقال: "ما خُيِّر عمار بين أمرين إلا اختار أرشدهما." شهد المشاهد كلها مع النبي ﷺ.',
      'استشهد رضي الله عنه في معركة صفين سنة 37 هـ عن عمر يناهز 94 سنة.',
    ],
    storyEn: [
      "He is Ammar ibn Yasir al-Ansi, may Allah be pleased with him. He, his father Yasir, and his mother Sumayyah embraced Islam in the earliest days. His family was subjected to severe torture by Abu Jahl and the Quraysh. The Prophet ﷺ passed by them while they were being tortured and said: \"Patience, O family of Yasir, for your appointment is in Paradise.\"",
      "His mother Sumayyah was martyred, becoming the first female martyr in Islam, and then his father Yasir was also martyred. Ammar was forced to utter words of disbelief under compulsion while his heart remained firm in faith. Regarding him, the verse was revealed: \"Except for one who is forced while his heart is secure in faith\" (Quran 16:106).",
      "The Prophet ﷺ said about him: \"Ammar is filled with faith from head to toe.\" He also said: \"Whenever Ammar is given a choice between two matters, he always chooses the more righteous one.\" He was present at all the battles with the Prophet ﷺ.",
      "He was martyred, may Allah be pleased with him, in the Battle of Siffin in 37 AH at the age of about 94.",
    ],
    virtues: ['مُلئ إيماناً إلى قدميه', 'أمه أول شهيدة في الإسلام', 'نزلت فيه آية قرآنية', 'شهد جميع المشاهد'],
    virtuesEn: ["Filled with faith from head to toe", "His mother was the first female martyr in Islam", "A Quranic verse was revealed about him", "Present at all the battles"],
  },
  {
    id: 'musab',
    nameAr: 'مصعب بن عمير',
    nameEn: 'Musab ibn Umair',
    category: 'muhajirun',
    brief: 'أول سفير في الإسلام، فتى قريش المنعّم',
    briefEn: 'First ambassador of Islam, the pampered youth of Quraysh',
    story: [
      'هو مصعب بن عمير العبدري القرشي، رضي الله عنه. كان أجمل فتى في مكة وأكثرهم ترفاً ونعمة، يلبس أحسن الثياب ويتعطر بأطيب العطور حتى كان يُعرف بعطره إذا أقبل أو أدبر.',
      'أسلم سراً في دار الأرقم، فلما علمت أمه حبسته ومنعته من الطعام، فثبت على إيمانه وترك النعيم كله لله. هاجر إلى الحبشة ثم عاد.',
      'أرسله النبي ﷺ إلى المدينة بعد بيعة العقبة الأولى ليعلّم أهلها الإسلام، فكان أول سفير في الإسلام. نجح في مهمته نجاحاً عظيماً حتى لم يبقَ بيت في المدينة إلا ودخله الإسلام.',
      'استشهد رضي الله عنه يوم أُحد وهو حامل لواء المسلمين. لم يجدوا ما يكفّنونه به إلا نمرة قصيرة: إذا غطّوا رأسه ظهرت رجلاه، وإذا غطّوا رجليه ظهر رأسه. فقال النبي ﷺ: "غطّوا رأسه واجعلوا على رجليه الإذخر."',
    ],
    storyEn: [
      'He is Musab ibn Umair al-Abdari al-Qurashi, may Allah be pleased with him. He was the most handsome and pampered young man in Makkah, wearing the finest clothes and the most fragrant perfumes — he was recognized by his scent whether coming or going.',
      'He embraced Islam secretly in Dar al-Arqam. When his mother found out, she imprisoned him and denied him food, but he remained steadfast in his faith and abandoned all luxury for the sake of Allah. He migrated to Abyssinia and then returned.',
      'The Prophet ﷺ sent him to Madinah after the first Pledge of Aqabah to teach its people Islam, making him the first ambassador in Islam. He succeeded remarkably in his mission until there was hardly a house in Madinah that Islam had not entered.',
      'He was martyred, may Allah be pleased with him, on the day of Uhud while carrying the banner of the Muslims. They could not find enough cloth to shroud him except a short garment: when they covered his head, his feet showed, and when they covered his feet, his head showed. The Prophet ﷺ said: "Cover his head and place idhkhir grass over his feet."',
    ],
    virtues: ['أول سفير في الإسلام', 'ترك النعيم من أجل الله', 'حامل لواء المسلمين يوم أُحد', 'نشر الإسلام في المدينة'],
    virtuesEn: ['First ambassador of Islam', 'Abandoned luxury for the sake of Allah', 'Bearer of the Muslim banner at Uhud', 'Spread Islam throughout Madinah'],
  },
  {
    id: 'khalid',
    nameAr: 'خالد بن الوليد',
    nameEn: 'Khalid ibn Al-Walid',
    category: 'muhajirun',
    brief: 'سيف الله المسلول',
    briefEn: "The Drawn Sword of Allah",
    story: [
      'هو خالد بن الوليد بن المغيرة المخزومي القرشي، رضي الله عنه. أسلم في السنة الثامنة للهجرة بعد صلح الحديبية. كان قبل إسلامه من أشد أعداء المسلمين، وهو الذي التف بخيّالة المشركين يوم أُحد فحوّل مسار المعركة.',
      'بعد إسلامه لقّبه النبي ﷺ بسيف الله المسلول. قاد المسلمين في غزوة مؤتة بعد استشهاد القادة الثلاثة، فانسحب بالجيش انسحاباً بارعاً أنقذهم من الهلاك.',
      'في خلافة أبي بكر قاد حروب الردة ثم فتح العراق وانتقل إلى الشام. في معركة اليرموك سنة 15 هـ قاد المسلمين لنصر حاسم على الروم غيّر تاريخ المنطقة. لم يُهزم في معركة قطّ.',
      'توفي رضي الله عنه على فراشه سنة 21 هـ في حمص وبكى قائلاً: "ما في جسدي شبر إلا وفيه طعنة أو ضربة أو رمية، وها أنا أموت على فراشي كما يموت البعير، فلا نامت أعين الجبناء."',
    ],
    storyEn: [
      "He is Khalid ibn al-Walid ibn al-Mughirah al-Makhzumi al-Qurashi, may Allah be pleased with him. He embraced Islam in the eighth year after Hijrah, following the Treaty of Hudaybiyyah. Before his conversion, he was one of the fiercest enemies of the Muslims and was the one who outflanked the Muslim cavalry at Uhud, turning the tide of battle.",
      "After his conversion, the Prophet ﷺ gave him the title \"The Drawn Sword of Allah.\" He led the Muslims in the Battle of Mu'tah after the three appointed commanders were martyred, executing a brilliant tactical withdrawal that saved the army from destruction.",
      "During the caliphate of Abu Bakr, he led the Riddah wars, then conquered Iraq and moved on to Sham. In the Battle of Yarmouk in 15 AH, he led the Muslims to a decisive victory over the Romans that changed the history of the region. He was never defeated in any battle.",
      "He passed away, may Allah be pleased with him, on his bed in 21 AH in Homs, weeping and saying: \"There is not a spot on my body the size of a hand span that does not bear a stab wound, a sword strike, or an arrow mark—yet here I am, dying in my bed like a camel. May the eyes of cowards never sleep.\"",
    ],
    virtues: ['سيف الله المسلول', 'لم يُهزم في معركة قط', 'قائد معركة اليرموك', 'من أعظم القادة العسكريين في التاريخ'],
    virtuesEn: ["The Drawn Sword of Allah", "Never defeated in any battle", "Commander of the Battle of Yarmouk", "One of the greatest military commanders in history"],
  },
  {
    id: 'ibn-masud',
    nameAr: 'عبد الله بن مسعود',
    nameEn: 'Abdullah ibn Masud',
    category: 'muhajirun',
    brief: 'من أعلم الصحابة بالقرآن',
    briefEn: "Most knowledgeable of the companions in the Quran",
    story: [
      'هو عبد الله بن مسعود الهُذلي، رضي الله عنه. كان من أوائل من أسلم، وكان سادس ستة في الإسلام. كان نحيف الجسم صغير البنية، لكنه كان عظيماً عند الله.',
      'قال عنه النبي ﷺ: "من أحبّ أن يقرأ القرآن غضّاً كما أُنزل فليقرأه على قراءة ابن أم عبد." وهو أول من جهر بالقرآن في مكة أمام قريش فضربوه حتى أدموه.',
      'كان ملازماً للنبي ﷺ يخدمه ويحمل نعله ووساده وسواكه. كان يدخل على النبي ﷺ بلا إذن لشدة قربه منه. قال النبي ﷺ عن ساقيه النحيفتين: "لَهما أثقل عند الله من جبل أُحد."',
      'كان من أعلم الصحابة بالقرآن والفقه. تولّى قضاء الكوفة وبيت مالها في عهد عمر. توفي رضي الله عنه سنة 32 هـ بالمدينة.',
    ],
    storyEn: [
      "He is Abdullah ibn Mas'ud al-Hudhali, may Allah be pleased with him. He was among the earliest to embrace Islam and was the sixth person to accept the faith. He was thin and of small build, yet he was great in the sight of Allah.",
      "The Prophet ﷺ said about him: \"Whoever wishes to recite the Quran as fresh as it was revealed, let him recite it according to the recitation of Ibn Umm Abd.\" He was the first to recite the Quran aloud in Makkah before the Quraysh, and they beat him until he bled.",
      "He was a constant companion of the Prophet ﷺ, serving him and carrying his sandals, pillow, and siwak. He would enter upon the Prophet ﷺ without permission due to his extreme closeness. The Prophet ﷺ said about his thin legs: \"They are heavier in the sight of Allah than Mount Uhud.\"",
      "He was among the most knowledgeable companions in the Quran and jurisprudence. He was appointed judge and treasurer of Kufa during the caliphate of Umar. He passed away, may Allah be pleased with him, in 32 AH in Madinah.",
    ],
    virtues: ['من أعلم الصحابة بالقرآن', 'أول من جهر بالقرآن في مكة', 'ساقاه أثقل من أُحد عند الله', 'ملازم النبي ﷺ وخادمه'],
    virtuesEn: ["Most knowledgeable of the companions in the Quran", "First to recite the Quran aloud in Makkah", "His legs are heavier than Uhud in the sight of Allah", "Constant companion and servant of the Prophet ﷺ"],
  },

  // ── الأنصار ──
  {
    id: 'saad-muadh',
    nameAr: 'سعد بن معاذ',
    nameEn: 'Saad ibn Muadh',
    category: 'ansar',
    brief: 'سيد الأوس، اهتز لموته عرش الرحمن',
    briefEn: "Chief of the Aws tribe; the Throne of the Most Merciful shook at his death",
    story: [
      'هو سعد بن معاذ الأنصاري الأوسي، رضي الله عنه، سيد قبيلة الأوس في المدينة. أسلم على يد مصعب بن عمير قبل هجرة النبي ﷺ، وبإسلامه أسلمت قبيلة الأوس بأكملها.',
      'كان من أنصار النبي ﷺ المخلصين. في غزوة بدر قال قولته المشهورة: "يا رسول الله، لو استعرضت بنا هذا البحر فخُضته لخضناه معك، ما تخلّف منا رجل واحد." فسُرّ النبي ﷺ بقوله.',
      'أُصيب بسهم في غزوة الخندق قطع أكحَله (عرق في الذراع). دعا الله ألّا يموت حتى يقرّ عينه من بني قريظة. فلما حُكّم فيهم حكم بحكم الله.',
      'لما مات رضي الله عنه قال النبي ﷺ: "اهتزّ عرش الرحمن لموت سعد بن معاذ." وشيّعه سبعون ألف ملك لم ينزلوا الأرض قبل ذلك.',
    ],
    storyEn: [
      "He is Sa'd ibn Mu'adh al-Ansari al-Awsi, may Allah be pleased with him, the chief of the Aws tribe in Madinah. He embraced Islam through Mus'ab ibn Umayr before the Prophet's ﷺ migration, and with his conversion, the entire Aws tribe embraced Islam.",
      "He was among the most devoted supporters of the Prophet ﷺ. At the Battle of Badr, he made his famous proclamation: \"O Messenger of Allah, if you were to lead us across this sea and plunge into it, we would plunge in with you, and not a single man among us would stay behind.\" The Prophet ﷺ was delighted by his words.",
      "He was struck by an arrow during the Battle of the Trench that severed his akhal (a vein in the arm). He prayed to Allah not to let him die until he saw justice served against the Banu Qurayzah. When he was appointed as their judge, he ruled according to the judgment of Allah.",
      "When he died, may Allah be pleased with him, the Prophet ﷺ said: \"The Throne of the Most Merciful shook at the death of Sa'd ibn Mu'adh.\" Seventy thousand angels who had never descended to earth before attended his funeral.",
    ],
    virtues: ['اهتزّ عرش الرحمن لموته', 'سيد الأوس', 'بإسلامه أسلمت قبيلته', 'من أعظم أنصار النبي ﷺ'],
    virtuesEn: ["The Throne of the Most Merciful shook at his death", "Chief of the Aws tribe", "His entire tribe embraced Islam with his conversion", "Among the greatest supporters of the Prophet ﷺ"],
  },
  {
    id: 'asad-zurara',
    nameAr: 'أسعد بن زرارة',
    nameEn: 'Asad ibn Zurara',
    category: 'ansar',
    brief: 'أول من بايع من الأنصار وأول من جمّع في المدينة',
    briefEn: "First of the Ansar to pledge allegiance and the first to hold a Friday congregation in Madinah",
    story: [
      'هو أسعد بن زرارة الأنصاري الخزرجي، رضي الله عنه. كان من أوائل من لقي النبي ﷺ من أهل المدينة وآمن به في بيعة العقبة الأولى. وكان أحد النقباء الاثني عشر الذين اختارهم النبي ﷺ.',
      'كان أول من جمّع بالمسلمين في المدينة قبل هجرة النبي ﷺ، فكان يجمع المسلمين يوم الجمعة ويصلّي بهم. وهو أول من بايع النبي ﷺ من الأنصار.',
      'استضاف مصعب بن عمير حين أرسله النبي ﷺ للدعوة في المدينة، وكان عوناً له في نشر الإسلام بين أهلها.',
      'توفي رضي الله عنه قبل غزوة بدر في المدينة، فحزن عليه النبي ﷺ حزناً كبيراً.',
    ],
    storyEn: [
      "He is As'ad ibn Zurarah al-Ansari al-Khazraji, may Allah be pleased with him. He was among the first people of Madinah to meet the Prophet ﷺ and believe in him at the First Pledge of Aqabah. He was one of the twelve chieftains (naqibs) selected by the Prophet ﷺ.",
      "He was the first to hold a Friday congregation for the Muslims in Madinah before the Prophet's ﷺ migration. He would gather the Muslims on Fridays and lead them in prayer. He was also the first of the Ansar to pledge allegiance to the Prophet ﷺ.",
      "He hosted Mus'ab ibn Umayr when the Prophet ﷺ sent him to preach Islam in Madinah, and he was a great support in spreading Islam among its people.",
      "He passed away, may Allah be pleased with him, before the Battle of Badr in Madinah. The Prophet ﷺ grieved deeply over his death.",
    ],
    virtues: ['أول من بايع من الأنصار', 'أول من جمّع في المدينة', 'أحد النقباء الاثني عشر', 'استضاف مصعب بن عمير'],
    virtuesEn: ["First of the Ansar to pledge allegiance", "First to hold a Friday congregation in Madinah", "One of the twelve chieftains", "Hosted Mus'ab ibn Umayr"],
  },
  {
    id: 'abu-ayyub',
    nameAr: 'أبو أيوب الأنصاري',
    nameEn: 'Abu Ayyub Al-Ansari',
    category: 'ansar',
    brief: 'مضيف رسول الله ﷺ حين قدم المدينة',
    briefEn: "Host of the Messenger of Allah ﷺ upon his arrival in Madinah",
    story: [
      'هو خالد بن زيد بن كليب الأنصاري الخزرجي، رضي الله عنه. كُنّي بأبي أيوب. شهد بيعة العقبة الثانية وكان من أوائل الأنصار إسلاماً.',
      'حين قدم النبي ﷺ المدينة مهاجراً وأراد كل الأنصار أن يستضيفه، بركت ناقة النبي ﷺ عند دار أبي أيوب، فنزل عنده ضيفاً في الطابق الأرضي. كان أبو أيوب وزوجته في الطابق العلوي فلم يناما من هيبة أن يكونا فوق رسول الله ﷺ.',
      'شهد بدراً وأُحداً والأحزاب وجميع الغزوات. بعد وفاة النبي ﷺ ظل يجاهد في سبيل الله حتى شارك في حصار القسطنطينية.',
      'توفي رضي الله عنه أثناء حصار القسطنطينية سنة 52 هـ، ودُفن عند أسوارها. وقبره اليوم معروف في إسطنبول يزوره الناس.',
    ],
    storyEn: [
      "He is Khalid ibn Zayd ibn Kulayb al-Ansari al-Khazraji, may Allah be pleased with him. He was known by his kunya Abu Ayyub. He witnessed the Second Pledge of Aqabah and was among the earliest Ansar to embrace Islam.",
      "When the Prophet ﷺ arrived in Madinah as a migrant and all the Ansar wanted to host him, the Prophet's ﷺ she-camel knelt at the house of Abu Ayyub. So the Prophet ﷺ stayed with him as a guest on the ground floor. Abu Ayyub and his wife were on the upper floor and could not sleep out of reverence, fearing to be above the Messenger of Allah ﷺ.",
      "He was present at Badr, Uhud, al-Ahzab, and all the battles. After the death of the Prophet ﷺ, he continued to fight in the cause of Allah until he participated in the siege of Constantinople.",
      "He passed away, may Allah be pleased with him, during the siege of Constantinople in 52 AH and was buried near its walls. His grave is well-known today in Istanbul and is visited by people.",
    ],
    virtues: ['مضيف النبي ﷺ في المدينة', 'شهد جميع الغزوات', 'جاهد حتى آخر حياته', 'دُفن عند أسوار القسطنطينية'],
    virtuesEn: ["Host of the Prophet ﷺ in Madinah", "Present at all the battles", "Fought in the cause of Allah until the end of his life", "Buried near the walls of Constantinople"],
  },

  // ── أمهات المؤمنين ──
  {
    id: 'khadijah',
    nameAr: 'خديجة بنت خويلد',
    nameEn: 'Khadijah bint Khuwaylid',
    category: 'mothers',
    brief: 'أم المؤمنين الأولى وأول من آمن بالنبي ﷺ',
    briefEn: "The first Mother of the Believers and the first person to believe in the Prophet ﷺ",
    story: [
      'هي خديجة بنت خويلد القرشية الأسدية، رضي الله عنها. كانت سيدة قريش وأفضل نسائها نسباً وشرفاً وعقلاً. لُقِّبت بالطاهرة في الجاهلية. كانت ذات مال كثير وتجارة رابحة.',
      'تزوجها النبي ﷺ وعمره خمس وعشرون سنة وعمرها أربعون. وكانت أول من آمن بالنبي ﷺ مطلقاً من رجال ونساء. قالت له حين نزل عليه الوحي: "كلا والله لا يخزيك الله أبداً، إنك لتصل الرحم وتحمل الكلّ وتَكسب المعدوم وتَقري الضيف وتُعين على نوائب الحق."',
      'أنفقت مالها كله في نصرة الإسلام ودعم النبي ﷺ. وقفت بجانبه في أشد الظروف: في الحصار في شِعب أبي طالب، وفي بداية الوحي حين كان خائفاً. أنجبت له جميع أولاده عدا إبراهيم.',
      'أرسل الله إليها السلام مع جبريل وبشّرها ببيت في الجنة من قصب لا صخب فيه ولا نصب. توفيت رضي الله عنها قبل الهجرة بثلاث سنوات، في عام الحزن.',
    ],
    storyEn: [
      "She is Khadijah bint Khuwaylid al-Qurashiyyah al-Asadiyyah, may Allah be pleased with her. She was the noblest woman of Quraysh in lineage, honor, and intellect. She was known as \"at-Tahirah\" (the Pure) even before Islam. She possessed great wealth and a prosperous trade.",
      "The Prophet ﷺ married her when he was twenty-five years old and she was forty. She was the very first person to believe in the Prophet ﷺ—from among both men and women. When the revelation first came to him, she said: \"Never! By Allah, Allah will never disgrace you. You maintain ties of kinship, bear the burdens of others, earn for the destitute, are generous to guests, and help those afflicted by calamities.\"",
      "She spent all her wealth supporting Islam and the Prophet ﷺ. She stood by him through the most difficult times: during the boycott in the valley of Abu Talib, and at the beginning of revelation when he was afraid. She bore him all his children except Ibrahim.",
      "Allah sent His greetings to her through Jibril and gave her glad tidings of a palace in Paradise made of pearl, with no noise or fatigue therein. She passed away, may Allah be pleased with her, three years before the Hijrah, in the Year of Sorrow.",
    ],
    virtues: ['أول من آمن بالنبي ﷺ', 'بشّرها الله ببيت في الجنة', 'أنفقت مالها في نصرة الإسلام', 'لُقِّبت بالطاهرة'],
    virtuesEn: ["First person to believe in the Prophet ﷺ", "Allah gave her glad tidings of a palace in Paradise", "Spent her wealth supporting Islam", "Known as at-Tahirah (the Pure)"],
  },
  {
    id: 'aisha',
    nameAr: 'عائشة بنت أبي بكر',
    nameEn: 'Aisha bint Abu Bakr',
    category: 'mothers',
    brief: 'أفقه نساء الأمة وأعلمهن',
    briefEn: "The most learned woman of the Ummah in jurisprudence and knowledge",
    story: [
      'هي عائشة بنت أبي بكر الصديق، رضي الله عنهما. أم المؤمنين وأحب أزواج النبي ﷺ إليه بعد خديجة. لُقِّبت بالحُميراء والصدّيقة بنت الصدّيق.',
      'كانت أفقه نساء الأمة وأعلمهن بالحديث والفقه والأدب والشعر والطب والأنساب. روت عن النبي ﷺ أكثر من ألفين ومئتي حديث. كان كبار الصحابة يرجعون إليها في المسائل الفقهية.',
      'تُوفي النبي ﷺ في بيتها وهو في حجرها، ودُفن في حجرتها. قالت عن نفسها: "أُعطيت تسعاً ما أُعطيتهن امرأة: نزل جبريل بصورتي في راحته حين أُمر أن يتزوجني."',
      'عاشت بعد النبي ﷺ عمراً طويلاً قضته في تعليم الناس ونقل العلم. توفيت رضي الله عنها سنة 58 هـ في المدينة.',
    ],
    storyEn: [
      "She is Aisha bint Abu Bakr as-Siddiq, may Allah be pleased with them both. She was the Mother of the Believers and the most beloved wife of the Prophet ﷺ after Khadijah. She was given the titles \"al-Humayra\" and \"as-Siddiqah bint as-Siddiq\" (the truthful daughter of the truthful).",
      "She was the most learned woman of the Ummah in hadith, jurisprudence, literature, poetry, medicine, and genealogy. She narrated more than 2,200 hadiths from the Prophet ﷺ. The senior companions would consult her on matters of jurisprudence.",
      "The Prophet ﷺ passed away in her house, resting in her lap, and was buried in her chamber. She said about herself: \"I was given nine things not given to any other woman: Jibril came with my image in his hand when the Prophet was commanded to marry me.\"",
      "She lived a long life after the Prophet ﷺ, dedicating it to teaching people and transmitting knowledge. She passed away, may Allah be pleased with her, in 58 AH in Madinah.",
    ],
    virtues: ['أفقه نساء الأمة', 'روت أكثر من 2200 حديث', 'تُوفي النبي ﷺ في حجرها', 'الصدّيقة بنت الصدّيق'],
    virtuesEn: ["Most learned woman of the Ummah in jurisprudence", "Narrated more than 2,200 hadiths", "The Prophet ﷺ passed away in her lap", "As-Siddiqah bint as-Siddiq (the truthful daughter of the truthful)"],
  },
  {
    id: 'hafsa',
    nameAr: 'حفصة بنت عمر',
    nameEn: 'Hafsa bint Umar',
    category: 'mothers',
    brief: 'حافظة المصحف الشريف',
    briefEn: "Guardian of the Holy Mushaf",
    story: [
      'هي حفصة بنت عمر بن الخطاب، رضي الله عنهما. أم المؤمنين وحافظة المصحف. كانت صوّامة قوّامة، تحب العلم والعبادة.',
      'تزوجها النبي ﷺ بعد وفاة زوجها الأول خُنيس بن حذافة السهمي الذي استشهد من جراحه بعد غزوة بدر. عرض عمر رضي الله عنه ابنته على عثمان ثم أبي بكر فاعتذرا، فتزوجها النبي ﷺ.',
      'كانت تقرأ القرآن وتكتب، وكانت من القليلات اللواتي يعرفن الكتابة في ذلك الزمان. أودع عندها أبو بكر الصديق ثم عمر المصحف الأول الذي جُمع فيه القرآن، فحافظت عليه أشد الحفاظ.',
      'من ذلك المصحف نسخ عثمان رضي الله عنه المصاحف التي أرسلها إلى الأمصار. توفيت رضي الله عنها سنة 45 هـ في المدينة.',
    ],
    storyEn: [
      "She is Hafsa bint Umar ibn al-Khattab, may Allah be pleased with them both. She was the Mother of the Believers and the guardian of the Mushaf. She was a devout woman who fasted and prayed frequently, and loved knowledge and worship.",
      "The Prophet ﷺ married her after the death of her first husband, Khunays ibn Hudhafah as-Sahmi, who died from wounds sustained after the Battle of Badr. Umar, may Allah be pleased with him, offered his daughter to Uthman and then to Abu Bakr, but they both declined. Then the Prophet ﷺ married her.",
      "She could read and write, and was among the very few women who were literate in that era. Abu Bakr as-Siddiq and then Umar entrusted her with the first compiled copy of the Quran, and she guarded it with the utmost care.",
      "From that Mushaf, Uthman, may Allah be pleased with him, made the copies that he sent to the major cities. She passed away, may Allah be pleased with her, in 45 AH in Madinah.",
    ],
    virtues: ['حافظة المصحف الشريف', 'صوّامة قوّامة', 'من القليلات اللواتي يعرفن الكتابة', 'ابنة الفاروق عمر'],
    virtuesEn: ["Guardian of the Holy Mushaf", "Devout in fasting and prayer", "Among the few literate women of her era", "Daughter of al-Faruq Umar"],
  },
];


// ========================================
// المكوّنات
// ========================================

interface CategoryTabProps {
  category: Category;
  isActive: boolean;
  onPress: () => void;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}

function CategoryTab({ category, isActive, onPress, isDarkMode, colors }: CategoryTabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.categoryTab,
        {
          backgroundColor: isActive
            ? ACCENT
            : isDarkMode
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.05)',
          borderColor: isActive ? ACCENT : 'transparent',
        },
      ]}
    >
      <MaterialCommunityIcons
        name={category.icon}
        size={16}
        color={isActive ? '#fff' : colors.textLight}
      />
      <Text
        style={[
          s.categoryTabText,
          { color: isActive ? '#fff' : colors.text },
        ]}
        numberOfLines={1}
      >
        {t(CATEGORY_KEYS[category.key]) || category.title}
      </Text>
    </Pressable>
  );
}

interface CompanionCardProps {
  companion: Companion;
  onPress: () => void;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}

function getCompanionName(companion: Companion): string {
  return getLanguage() === 'ar' ? companion.nameAr : companion.nameEn;
}

function CompanionCard({ companion, onPress, isDarkMode, colors }: CompanionCardProps) {
  const isRTL = useIsRTL();
  return (
    <Pressable onPress={onPress} style={s.cardOuter}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 40 : 15}
        tint={isDarkMode ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          s.cardOverlay,
          {
            backgroundColor: isDarkMode
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.70)',
            borderColor: isDarkMode
              ? 'rgba(255,255,255,0.10)'
              : 'rgba(0,0,0,0.06)',
          },
        ]}
      />
      <View style={[s.cardContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[s.cardAvatar, { backgroundColor: ACCENT_LIGHT }]}>
          <MaterialCommunityIcons name="account" size={24} color={ACCENT} />
        </View>
        <View style={s.cardTextWrap}>
          <Text style={[s.cardName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {getCompanionName(companion)}
          </Text>
          {getLanguage() === 'ar' ? (
            <Text style={[s.cardBrief, { color: colors.textLight, textAlign: 'right' }]} numberOfLines={2}>
              {companion.brief}
            </Text>
          ) : getLanguage() === 'en' ? (
            <Text style={[s.cardBrief, { color: colors.textLight, textAlign: 'left' }]} numberOfLines={2}>
              {companion.briefEn}
            </Text>
          ) : (
            <TranslatedText from="en" type="section" style={[s.cardBrief, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
              {companion.briefEn}
            </TranslatedText>
          )}
        </View>
        <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={colors.textLight} />
      </View>
    </Pressable>
  );
}

interface StoryDetailProps {
  companion: Companion;
  onBack: () => void;
  onShare: () => void;
  onToggleFav: () => void;
  isFav: boolean;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}

function StoryDetail({ companion, onBack, onShare, onToggleFav, isFav, isDarkMode, colors }: StoryDetailProps) {
  const isRTL = useIsRTL();
  const { t } = useTranslation();
  return (
    <View style={s.detailContainer}>
      {/* Detail header */}
      <View style={[s.detailHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          onPress={onBack}
          style={[
            s.detailBackBtn,
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.18)' },
          ]}
        >
          <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={26} color={colors.text} />
        </Pressable>
        <Text style={[s.detailHeaderTitle, { color: colors.text }]} numberOfLines={1}>
          {getCompanionName(companion)}
        </Text>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Pressable
            onPress={onToggleFav}
            style={[
              s.detailShareBtn,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.18)' },
            ]}
          >
            <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? '#ef4444' : colors.text} />
          </Pressable>
          <Pressable
            onPress={onShare}
            style={[
              s.detailShareBtn,
              { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.18)' },
            ]}
          >
            <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={s.detailScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.detailScrollContent}
      >
        {/* Name hero */}
        <View style={s.detailHeroOuter}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 40 : 15}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.detailHeroOverlay,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(47,118,89,0.15)'
                  : 'rgba(47,118,89,0.08)',
              },
            ]}
          />
          <View style={s.detailHeroContent}>
            <View style={[s.detailAvatarLarge, { backgroundColor: ACCENT_LIGHT }]}>
              <MaterialCommunityIcons name="account" size={36} color={ACCENT} />
            </View>
            <Text style={[s.detailName, { color: colors.text }]}>
              {getCompanionName(companion)}
            </Text>
            <Text style={[s.detailNameEn, { color: colors.textLight }]}>
              {getLanguage() === 'ar' ? companion.nameEn : companion.nameAr}
            </Text>
            {getLanguage() === 'ar' ? (
              <Text style={[s.detailBrief, { color: colors.textLight }]}>
                {companion.brief}
              </Text>
            ) : getLanguage() === 'en' ? (
              <Text style={[s.detailBrief, { color: colors.textLight }]}>
                {companion.briefEn}
              </Text>
            ) : (
              <TranslatedText from="en" type="section" style={[s.detailBrief, { color: colors.textLight }]}>
                {companion.briefEn}
              </TranslatedText>
            )}
          </View>
        </View>

        {/* Story */}
        <View style={s.detailSectionOuter}>
          <View style={[s.detailSectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[s.sectionIconWrap, { backgroundColor: ACCENT_LIGHT }]}>
              <MaterialCommunityIcons name="book-open-variant" size={18} color={ACCENT} />
            </View>
            <Text style={[s.detailSectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('companions.story')}
            </Text>
          </View>
          <View style={s.detailGlassOuter}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 40 : 15}
              tint={isDarkMode ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                s.detailGlassOverlay,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(47,118,89,0.08)'
                    : 'rgba(47,118,89,0.04)',
                  borderColor: isDarkMode
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)',
                },
              ]}
            />
            <View style={s.detailGlassContent}>
              {(getLanguage() === 'ar' ? companion.story : companion.storyEn).map((paragraph, idx) => {
                const stories = getLanguage() === 'ar' ? companion.story : companion.storyEn;
                const lang = getLanguage();
                return lang === 'ar' || lang === 'en' ? (
                  <Text
                    key={idx}
                    style={[
                      s.storyParagraph,
                      { color: colors.text, textAlign: lang === 'ar' ? 'right' : 'left', writingDirection: lang === 'ar' ? 'rtl' : 'ltr' },
                      idx < stories.length - 1 && s.paragraphSpacing,
                    ]}
                  >
                    {paragraph}
                  </Text>
                ) : (
                  <TranslatedText
                    from="en"
                    type="section"
                    key={idx}
                    style={[
                      s.storyParagraph,
                      { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                      idx < stories.length - 1 && s.paragraphSpacing,
                    ]}
                  >
                    {paragraph}
                  </TranslatedText>
                );
              })}
            </View>
          </View>
        </View>

        {/* Virtues */}
        <View style={s.detailSectionOuter}>
          <View style={[s.detailSectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[s.sectionIconWrap, { backgroundColor: ACCENT_LIGHT }]}>
              <MaterialCommunityIcons name="star-four-points" size={18} color={ACCENT} />
            </View>
            <Text style={[s.detailSectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('companions.virtues')}
            </Text>
          </View>
          <View style={s.detailGlassOuter}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 40 : 15}
              tint={isDarkMode ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                s.detailGlassOverlay,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(47,118,89,0.08)'
                    : 'rgba(47,118,89,0.04)',
                  borderColor: isDarkMode
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)',
                },
              ]}
            />
            <View style={s.detailGlassContent}>
              {(getLanguage() === 'ar' ? companion.virtues : companion.virtuesEn).map((virtue, idx) => {
                const lang = getLanguage();
                return (
                  <View key={idx} style={[s.virtueRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="star-four-points" size={14} color={ACCENT} style={s.virtueIcon} />
                    {lang === 'ar' || lang === 'en' ? (
                      <Text style={[s.virtueText, { color: colors.text, textAlign: lang === 'ar' ? 'right' : 'left', writingDirection: lang === 'ar' ? 'rtl' : 'ltr' }]}>
                        {virtue}
                      </Text>
                    ) : (
                      <TranslatedText from="en" type="section" style={[s.virtueText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {virtue}
                      </TranslatedText>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Footer dua */}
        <View style={s.detailFooterOuter}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 40 : 15}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.detailFooterOverlay,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(47,118,89,0.12)'
                  : 'rgba(47,118,89,0.06)',
              },
            ]}
          />
          <View style={s.detailFooterContent}>
            {getLanguage() === 'ar' ? (
              <>
                <Text style={[s.detailFooterText, { color: colors.text }]}>رضي الله عنه وأرضاه</Text>
                <Text style={[s.detailFooterNote, { color: colors.textLight }]}>اللهم اجمعنا بهم مع النبي ﷺ في الفردوس الأعلى</Text>
              </>
            ) : getLanguage() === 'en' ? (
              <>
                <Text style={[s.detailFooterText, { color: colors.text }]}>May Allah be pleased with him</Text>
                <Text style={[s.detailFooterNote, { color: colors.textLight }]}>O Allah, gather us with them and the Prophet ﷺ in the highest Paradise</Text>
              </>
            ) : (
              <>
                <TranslatedText from="en" type="section" style={[s.detailFooterText, { color: colors.text }]}>May Allah be pleased with him</TranslatedText>
                <TranslatedText from="en" type="section" style={[s.detailFooterNote, { color: colors.textLight }]}>O Allah, gather us with them and the Prophet ﷺ in the highest Paradise</TranslatedText>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ========================================
// المكون الرئيسي
// ========================================

export default function CompanionsScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const colors = useColors();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('ashara');
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [companionFav, setCompanionFav] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // CMS data with hardcoded fallback
  const { companions: allCompanions } = useCompanionsContent(COMPANIONS, CATEGORIES);

  const filteredCompanions = allCompanions.filter(c => c.category === activeCategory);

  const handleCategoryChange = useCallback((key: CategoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveCategory(key);
  }, []);

  const handleSelectCompanion = useCallback((companion: Companion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCompanion(companion);
    isFavorited(`companion_${companion.id}`, 'companion').then(setCompanionFav);
  }, []);

  const handleBack = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCompanion(null);
  }, []);

  const handleShare = useCallback(async () => {
    if (!selectedCompanion) return;
    const lang = getLanguage();
    const brief = lang === 'ar' ? selectedCompanion.brief : selectedCompanion.briefEn;
    const story = lang === 'ar' ? selectedCompanion.story : selectedCompanion.storyEn;
    const virtues = lang === 'ar' ? selectedCompanion.virtues : selectedCompanion.virtuesEn;
    const text = `📖 ${getCompanionName(selectedCompanion)}\n\n${brief}\n\n${story.join('\n\n')}\n\n✨ ${t('companions.virtues')}:\n${virtues.map(v => `• ${v}`).join('\n')}\n\n— ${t('common.fromApp')}`;
    try {
      await Share.share({ message: text });
    } catch {
      // user cancelled
    }
  }, [selectedCompanion, t]);

  const handleExportPDF = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTemplatePicker(true);
  }, []);

  const doExport = useCallback((template: PdfTemplate) => {
    const lang = getLanguage();
    const html = CATEGORIES.map(cat => {
      const catCompanions = allCompanions.filter(c => c.category === cat.key);
      const companionHtml = catCompanions.map(comp => {
        const storyData = lang === 'ar' ? comp.story : comp.storyEn;
        const virtuesData = lang === 'ar' ? comp.virtues : comp.virtuesEn;
        const briefData = lang === 'ar' ? comp.brief : comp.briefEn;
        const storyHtml = storyData.map(p => `<p>${p}</p>`).join('');
        const virtuesHtml = virtuesData.map(v => `<div class="virtue-item">${v}</div>`).join('');
        return `<div class="section">
          <div class="section-title">${getCompanionName(comp)}</div>
          <div class="section-desc">${briefData}</div>
          ${storyHtml}
          ${virtuesHtml ? `<div style="margin-top:8px"><div class="steps-label">${t('companions.virtues')}:</div>${virtuesHtml}</div>` : ''}
        </div>`;
      }).join('');
      return `<h2>${t(CATEGORY_KEYS[cat.key])}</h2>${companionHtml}`;
    }).join('');
    return showAdThenExport(() => exportAsPDF(t('companions.title'), html, template));
  }, [t, allCompanions]);

  const handleToggleFav = useCallback(async () => {
    if (!selectedCompanion) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowSaved = await toggleFavorite({
      id: `companion_${selectedCompanion.id}`,
      type: 'companion',
      title: getCompanionName(selectedCompanion),
      subtitle: selectedCompanion.brief,
      arabic: selectedCompanion.story?.[0] || selectedCompanion.brief,
      route: '/companions',
    });
    setCompanionFav(nowSaved);
  }, [selectedCompanion]);

  // Detail view
  if (selectedCompanion) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']} screenKey="companions">
        <StoryDetail
          companion={selectedCompanion}
          onBack={handleBack}
          onShare={handleShare}
          onToggleFav={handleToggleFav}
          isFav={companionFav}
          isDarkMode={isDarkMode}
          colors={colors}
        />
      </ScreenContainer>
    );
  }

  // List view
  return (
    <ScreenContainer edges={['top', 'left', 'right']} screenKey="companions">
      {/* Header */}
      <UniversalHeader
        backStyle={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.18)', borderRadius: 14 }}
        rightActions={[{ icon: 'file-pdf-box', onPress: handleExportPDF, style: { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.18)' } }]}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('companions.title')}</Text>
          <SectionInfoButton sectionKey="stories" />
        </View>
      </UniversalHeader>

      {/* Hero banner */}
      <View style={s.heroOuter}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 15}
          tint={isDarkMode ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            s.heroOverlay,
            {
              backgroundColor: isDarkMode
                ? 'rgba(47,118,89,0.15)'
                : 'rgba(47,118,89,0.08)',
            },
          ]}
        />
        <View style={[s.heroContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="account-group" size={36} color={ACCENT} />
          <View style={s.heroTextWrap}>
            <Text style={[s.heroTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('companions.heroTitle')}
            </Text>
            <Text style={[s.heroSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('companions.heroSubtitle')}
            </Text>
          </View>
        </View>
      </View>

      {/* Category tabs */}
      <View style={{ marginTop: 10 }}>
        <NativeTabs
          tabs={CATEGORIES.map(cat => ({ key: cat.key, label: t(CATEGORY_KEYS[cat.key]) }))}
          selected={activeCategory}
          onSelect={(key) => handleCategoryChange(key as CategoryKey)}
          indicatorColor={ACCENT}
          scrollable
        />
      </View>

      {/* Companions list */}
      <ScrollView
        ref={scrollRef}
        style={s.listScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
      >
        {/* Count badge */}
        <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[s.countText, { color: ACCENT }]}>
            {filteredCompanions.length} {t('companions.companionsCount')}
          </Text>
        </View>

        {filteredCompanions.map(companion => (
          <CompanionCard
            key={companion.id}
            companion={companion}
            onPress={() => handleSelectCompanion(companion)}
            isDarkMode={isDarkMode}
            colors={colors}
          />
        ))}

        {/* Footer */}
        <View style={s.footerOuter}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 40 : 15}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.footerOverlay,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(47,118,89,0.12)'
                  : 'rgba(47,118,89,0.06)',
              },
            ]}
          />
          <View style={s.footerContent}>
            <MaterialCommunityIcons name="star-crescent" size={24} color={ACCENT} />
            <Text style={[s.footerText, { color: colors.text }]}>
              {t('companions.footerDua')}
            </Text>
            <Text style={[s.footerNote, { color: colors.textLight }]}>
              {t('companions.footerText')}
            </Text>
          </View>
        </View>
        <BannerAdComponent screen="companions" />
      </ScrollView>
      <PdfTemplatePicker
        visible={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelect={doExport}
        pageType="companions"
      />
    </ScreenContainer>
  );
}

// ========================================
// الأنماط
// ========================================

const s = StyleSheet.create({


  // Hero
  heroOuter: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: Spacing.md,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fontBold(),
    fontSize: 19,
    lineHeight: 30,
  },
  heroSub: {
    fontFamily: fontRegular(),
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },

  // Category tabs
  categoryScroll: {
    maxHeight: 48,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: Spacing.sm,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  categoryTabText: {
    fontFamily: fontSemiBold(),
    fontSize: 13,
  },

  // List
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Count badge
  countBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
  },
  countText: {
    fontFamily: fontSemiBold(),
    fontSize: 13,
  },

  // Companion card
  cardOuter: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: Spacing.md,
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardName: {
    fontFamily: fontBold(),
    fontSize: 16,
    lineHeight: 26,
  },
  cardBrief: {
    fontFamily: fontRegular(),
    fontSize: 13,
    lineHeight: 20,
  },

  // Detail view
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  detailBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderTitle: {
    fontFamily: fontBold(),
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  detailShareBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Detail hero
  detailHeroOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  detailHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  detailHeroContent: {
    alignItems: 'center',
    padding: 24,
    gap: Spacing.sm,
  },
  detailAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  detailName: {
    fontFamily: fontBold(),
    fontSize: 24,
    lineHeight: 38,
    textAlign: 'center',
  },
  detailNameEn: {
    fontFamily: fontRegular(),
    fontSize: 14,
    textAlign: 'center',
  },
  detailBrief: {
    fontFamily: fontRegular(),
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 4,
  },

  // Detail sections
  detailSectionOuter: {
    marginBottom: 20,
  },
  detailSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSectionTitle: {
    fontFamily: fontSemiBold(),
    fontSize: 17,
    lineHeight: 28,
  },
  detailGlassOuter: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  detailGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
  },
  detailGlassContent: {
    padding: 18,
  },

  // Story text
  storyParagraph: {
    fontFamily: fontRegular(),
    fontSize: 16,
    lineHeight: 30,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  paragraphSpacing: {
    marginBottom: 16,
  },

  // Virtues
  virtueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: 10,
  },
  virtueIcon: {
    marginTop: 5,
  },
  virtueText: {
    fontFamily: fontRegular(),
    fontSize: 15,
    lineHeight: 26,
    flex: 1,
  },

  // Detail footer
  detailFooterOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
  },
  detailFooterOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  detailFooterContent: {
    alignItems: 'center',
    padding: 24,
    gap: Spacing.sm,
  },
  detailFooterText: {
    fontFamily: fontSemiBold(),
    fontSize: 17,
    lineHeight: 28,
    textAlign: 'center',
  },
  detailFooterNote: {
    fontFamily: fontRegular(),
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Footer
  footerOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
  },
  footerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  footerContent: {
    alignItems: 'center',
    padding: 24,
    gap: Spacing.sm,
  },
  footerText: {
    fontFamily: fontSemiBold(),
    fontSize: 17,
    lineHeight: 32,
    textAlign: 'center',
  },
  footerNote: {
    fontFamily: fontRegular(),
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 22,
  },
});
