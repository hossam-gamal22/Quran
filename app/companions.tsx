// app/companions.tsx
// صفحة قصص الصحابة - روح المسلم

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  TextInput,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useSettings, useTranslation } from '@/contexts/SettingsContext';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { useAudioSeekPreview } from '@/hooks/use-audio-seek-preview';
import { t, getLanguage } from '@/lib/i18n';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { ContentLanguageNotice } from '@/components/ui/ContentLanguageNotice';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { SourcesList } from '@/components/ui/SourcesList';
import { getCompanionSources } from '@/data/companions-extra';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { isFavorited, toggleFavorite } from '@/lib/favorites-manager';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';
import { useCompanionsContent } from '@/lib/content-api';
import { prepareStoryAudio, isStoryAudioCached, downloadStoryAudio } from '@/lib/story-audio-cache';
import {
  getSavedPlaybackProgress,
  clearPlaybackProgress,
  shouldOfferResume,
  type AudioResumeEntry,
} from '@/lib/audio-resume-store';
import { AudioResumePromptModal, formatResumeHint } from '@/components/ui/AudioResumePromptModal';
import { formatAudioTime } from '@/lib/audio-time';
import { expandCompanionStory } from '@/data/full-story-texts';
import { StoryInteractionBar } from '@/components/social/StoryInteractionBar';
import { StoryNotificationsBell } from '@/components/social/StoryNotificationsBell';
import { companionStoryId } from '@/lib/story-id';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing, ModalColors } from '@/constants/theme';

// ========================================
// الألوان
// ========================================

const ACCENT = '#0d8e62';
const ACCENT_LIGHT = 'rgba(6,79,47,0.12)';
const ACCENT_BORDER = 'rgba(6,79,47,0.30)';
const AUDIO_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

// ========================================
// أنواع البيانات
// ========================================

type CategoryKey = 'ashara' | 'muhajirun' | 'ansar' | 'mothers' | 'daughters';

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
  videoUrl?: string;
  videoTitle?: string;
  audioUrl?: string;
  audioTitle?: string;
  audioStoragePath?: string;
  transcript?: string;
  transcriptEn?: string;
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
  { key: 'daughters', title: 'بنات النبي ﷺ', icon: 'flower' },
];

const CATEGORY_KEYS: Record<CategoryKey, string> = {
  ashara: 'companions.categoryTenPromised',
  muhajirun: 'companions.categoryMuhajirun',
  ansar: 'companions.categoryAnsar',
  mothers: 'companions.categoryMothers',
  daughters: 'companions.categoryDaughters',
};

function normalizeSearchText(value?: string) {
  return (value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .trim();
}

function companionSearchText(companion: Companion) {
  return normalizeSearchText([
    companion.nameAr,
    companion.nameEn,
    companion.brief,
    companion.briefEn,
  ].filter(Boolean).join(' '));
}

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
  {
    id: 'hamza',
    nameAr: 'حمزة بن عبد المطلب',
    nameEn: 'Hamza ibn Abd al-Muttalib',
    category: 'muhajirun',
    brief: 'أسد الله وسيد الشهداء، عمّ النبي ﷺ وأخوه من الرضاعة',
    briefEn: 'Lion of Allah and Master of the Martyrs, uncle of the Prophet ﷺ and his foster brother',
    story: [
      'هو حمزة بن عبد المطلب بن هاشم القرشي، عمّ النبي ﷺ. وُلد بمكة قبل النبي ﷺ بعامين على أرجح الأقوال. وكانت أمه هالة بنت أهيب قد أرضعته كما أرضعت محمداً ﷺ، فصار عمه وأخاه من الرضاعة معاً. كان في الجاهلية رجلاً قوياً شجاعاً مغرماً بالصيد والقنص.',
      'أسلم بسبب موقف غضب فيه لابن أخيه. مرّ بسوق مكة بعد رحلة صيد فأخبرته جارية أن أبا جهل آذى النبي ﷺ وشتمه. فدخل المسجد الحرام وضرب أبا جهل بقوسه ضربة شجّت رأسه، ثم قال: "أتشتمه وأنا على دينه أقول ما يقول؟" ثم نزل عليه نور الهداية فأعلن إسلامه، فكان إسلامه قوة عظيمة للمسلمين.',
      'شارك في غزوة بدر وقتل عتبة بن ربيعة في مبارزة عظيمة. وفي غزوة أحد سنة 3 هـ كان يقاتل ببسالة، فتربّص به وحشي بن حرب — عبد حبشي استأجرته هند بنت عتبة لتأخذ بثأرها — فرماه بحربة من خلفه فاستشهد رضي الله عنه. ثم مزّقت هند جسده وأخذت كبده، فحزن النبي ﷺ حزناً شديداً.',
      'لما رأى النبي ﷺ جسده بكى بكاءً شديداً وقال: "لن أصاب بمثلك أبداً." ثم قال كلمته الخالدة: "حمزة سيد الشهداء." وقد أسلم وحشي بعد ذلك، فكفّر عن قتله لحمزة بقتل مسيلمة الكذاب في معركة اليمامة بالحربة نفسها.',
    ],
    storyEn: [
      'He is Hamza ibn Abd al-Muttalib ibn Hashim al-Qurashi, the uncle of the Prophet ﷺ. He was born in Makkah two years before the Prophet ﷺ on the strongest opinions. His mother Halah bint Uhayb had nursed him as she nursed Muhammad ﷺ, so he was both his uncle and his foster brother. In the Jahiliyyah he was a strong, brave man devoted to hunting.',
      'He embraced Islam in a moment of anger for his nephew. Passing the market of Makkah after a hunting trip, a slave-girl told him that Abu Jahl had harmed and insulted the Prophet ﷺ. He entered the Sacred Mosque and struck Abu Jahl on the head with his bow, then said: "Do you insult him while I am on his religion saying what he says?" The light of guidance then descended on him and he announced his Islam — a great strength for the Muslims.',
      "He fought at Badr and killed Utbah ibn Rabi'ah in a great duel. At Uhud in 3 AH he fought valiantly, but Wahshi ibn Harb — an Abyssinian slave hired by Hind bint Utbah to take her revenge — lay in wait and pierced him with a javelin from behind. He was martyred, and Hind then tore at his body and took his liver. The Prophet ﷺ grieved severely.",
      'When the Prophet ﷺ saw his body, he wept severely and said: "I shall never be afflicted like this again." Then he spoke his immortal word: "Hamza is the master of the martyrs." Wahshi himself later embraced Islam and atoned by killing Musaylamah the Liar at the Battle of Yamamah with the very same javelin.',
    ],
    virtues: ['أسد الله وأسد رسوله', 'سيد الشهداء', 'عمّ النبي ﷺ وأخوه من الرضاعة', 'قتل عتبة بن ربيعة في بدر'],
    virtuesEn: ['Lion of Allah and His Messenger', 'Master of the Martyrs', 'Uncle of the Prophet ﷺ and his foster brother', "Killed Utbah ibn Rabi'ah at Badr"],
  },
  {
    id: 'salman-farisi',
    nameAr: 'سلمان الفارسي',
    nameEn: 'Salman al-Farisi',
    category: 'muhajirun',
    brief: 'الباحث عن الحق الذي قال فيه النبي ﷺ: "سلمان منا أهل البيت"',
    briefEn: 'The seeker of truth of whom the Prophet ﷺ said: "Salman is one of us, the People of the House"',
    story: [
      'وُلد سلمان في قرية جَيّ من قرى أصبهان بفارس، في أسرة من النبلاء، وكان أبوه ديقاناً (مالكاً كبيراً للأرض) ومن قادة المجوس عبدة النار. لكنه ترك دين أبيه بعد أن رأى نصارى يصلون في كنيسة فمالت نفسه إلى دينهم. هرب من بيت أبيه ولحق بقافلة إلى الشام بحثاً عن الحق.',
      'تنقّل بين الرهبان من الشام إلى الموصل إلى نصيبين إلى عمورية. ولما اقترب أجل آخر راهب أخبره أن زمن نبي قد أظلّ، يبعث من أرض العرب، مهاجره إلى أرض ذات نخل بين حرّتين، له علامات: لا يأكل الصدقة ويأكل الهدية، وبين كتفيه خاتم النبوة.',
      'سافر مع تجار من بني كلب، فخدعوه وباعوه عبداً ليهودي بوادي القرى، ثم باعه إلى قريب له في يثرب. هكذا وصل إلى أرض النبي ﷺ. ولما هاجر النبي ﷺ إلى المدينة، اختبره بالعلامات الثلاث ثم سقط ساجداً يقبّل قدميه. أُعتق بمكاتبة سيده بمساعدة النبي ﷺ والصحابة.',
      'في غزوة الخندق اقترح حفر خندق حول المدينة — وكانت فكرة فارسية لم يعرفها العرب — فأنقذ الله بها المسلمين. تنازع المهاجرون والأنصار عليه، فقال النبي ﷺ: "سلمان منا أهل البيت." ولّاه عمر على المدائن فعاش زاهداً يبيع الخوص من يده، يفرّق عطاءه على الفقراء. توفي رضي الله عنه سنة 35 هـ بالمدائن.',
    ],
    storyEn: [
      "Salman was born in a village called Jayy in Isfahan, Persia, into a noble family. His father was a dihqan (great landowner) and a leader of the Magian fire-worshippers. He abandoned his father's religion after seeing Christians praying in a church and feeling drawn to their faith. He fled his father's house and joined a caravan to Sham seeking the truth.",
      "He moved between monks from Sham to Mosul, Nasibin, and Amuria. As the last monk's end approached, he told Salman that the time of a prophet had dawned — sent from the land of the Arabs, his place of emigration a land of palms between two lava plains, with three signs: he does not eat charity but accepts gifts, and between his shoulders is the seal of prophethood.",
      "He travelled with traders of Banu Kalb who betrayed him and sold him as a slave to a Jew in al-Qura, then to his relative in Yathrib. Thus he reached the land of the Prophet ﷺ. After the Hijrah, Salman tested the Prophet ﷺ with the three signs, then fell prostrate kissing his feet. He was freed by a contract of manumission with help from the Prophet ﷺ and the Companions.",
      "At the Battle of the Trench, he proposed digging a trench around Madinah — a Persian idea unknown to the Arabs — by which Allah saved the Muslims. When the Muhajirun and Ansar disputed over him, the Prophet ﷺ said: \"Salman is one of us, the People of the House.\" Umar appointed him governor of al-Mada'in where he lived ascetic, weaving palm leaves with his own hand and distributing his stipend to the poor. He died, may Allah be pleased with him, in 35 AH at al-Mada'in.",
    ],
    virtues: ['من أهل بيت النبي ﷺ', 'صاحب فكرة الخندق', 'باحث صادق عن الحق قطع آلاف الأميال', 'زاهد ولّي المدائن فاكتفى بكسب يده'],
    virtuesEn: ["One of the Prophet's ﷺ household", 'Originator of the Trench strategy', 'Sincere seeker of truth who travelled thousands of miles', "An ascetic governor of al-Mada'in who ate from his own labour"],
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
  {
    id: 'handhalah',
    nameAr: 'حنظلة بن أبي عامر',
    nameEn: 'Handhalah ibn Abi Amir',
    category: 'ansar',
    brief: 'غسيل الملائكة — ترك ليلة عرسه ليلحق بالنبي ﷺ في أحد',
    briefEn: 'Washed by the Angels — he left his wedding night to join the Prophet ﷺ at Uhud',
    story: [
      'هو حنظلة بن أبي عامر الأنصاري الأوسي، رضي الله عنه. كان أبوه أبو عامر الراهب رجلاً اشتُهر بالتدين قبل الإسلام، لكنه رفض الإسلام حين جاء النبي ﷺ، وذهب إلى مكة يحرّض قريشاً على المسلمين. أما حنظلة فآمن مع النبي ﷺ، وخالف أباه وأخلص لله.',
      'تزوج جميلة بنت عبد الله بن أبيّ بن سلول — وكان أبوها رأس المنافقين في المدينة، لكنها آمنت برسول الله ﷺ. ودخل بها ليلة زفافه. وفي الفجر سمع منادي الجهاد ينادي بالخروج إلى أحد. كان عريساً ليلته الأولى، له رخصة شرعية أن يبقى ويغتسل، لكنه آثر اللحاق بالنبي ﷺ.',
      'قام من فراش العرس مسرعاً، لبس ثيابه على عجل وحمل سيفه ولم يغتسل من الجنابة. لحق بالجيش في طريقه إلى أحد. وفي ساحة المعركة هاجم أبا سفيان بن حرب — قائد المشركين — وكاد يقتله، حتى رماه شدّاد بن الأسود برمح من خلفه، ثم تكاثروا عليه فاستشهد رضي الله عنه.',
      'بعد المعركة قال النبي ﷺ متعجباً: "إن صاحبكم تغسّله الملائكة." فسألوا زوجته جميلة عن حاله، فأخبرتهم أنه خرج جنباً حين سمع نداء الجهاد. فكان غسله بأيدي الملائكة بين السماء والأرض، وبقي لقبه إلى يومنا هذا: غسيل الملائكة.',
    ],
    storyEn: [
      'He is Handhalah ibn Abi Amir al-Ansari al-Awsi, may Allah be pleased with him. His father, Abu Amir "the Monk," had been famous for piety before Islam but refused Islam when the Prophet ﷺ came, going to Makkah to incite Quraysh against the Muslims. Handhalah, however, believed with the Prophet ﷺ, opposed his father, and devoted himself to Allah.',
      "He married Jamilah bint Abdullah ibn Ubayy ibn Salul — whose father was the head of the hypocrites in Madinah, yet she believed in the Messenger of Allah ﷺ. He entered upon her on his wedding night. At dawn he heard the caller to jihad announcing the march to Uhud. He was a bridegroom on his first night, with a legitimate dispensation to stay and perform ghusl, but he preferred to catch up with the Prophet ﷺ.",
      'He rose from the wedding bed in haste, dressed quickly, took his sword, and did not perform ghusl from impurity. He overtook the army on its way to Uhud. In battle he attacked Abu Sufyan ibn Harb — commander of the polytheists — and nearly killed him, until Shaddad ibn al-Aswad pierced him with a spear from behind. Others bore down on him, and he was martyred.',
      'After the battle the Prophet ﷺ said in wonder: "Your companion is being washed by the angels." They asked his wife Jamilah about his condition, and she told them he had set out in a state of major impurity when he heard the call to jihad. His washing was by the hands of angels between sky and earth, and his title has remained to this day: "the one washed by the angels."',
    ],
    virtues: ['غسّلته الملائكة بين السماء والأرض', 'استشهد في غزوة أحد', 'ترك ليلة عرسه استجابة لنداء الجهاد', 'كاد أن يقتل أبا سفيان بن حرب'],
    virtuesEn: ['Washed by the angels between sky and earth', 'Martyred at the Battle of Uhud', 'Left his wedding night for the call to jihad', 'Nearly killed Abu Sufyan ibn Harb'],
  },
  {
    id: 'umm-sulaym',
    nameAr: 'أم سُليم بنت ملحان',
    nameEn: 'Umm Sulaym bint Milhan',
    category: 'ansar',
    brief: 'الصحابية التي جعلت إسلام خاطبها مهرها، فكان مهرها الإسلام',
    briefEn: "The female Companion who made her suitor's Islam her dowry — so her dowry was Islam itself",
    story: [
      'هي أم سُليم بنت ملحان الأنصارية، رضي الله عنها، أم خادم النبي ﷺ أنس بن مالك. كانت من السابقات إلى الإسلام في المدينة، آمنت قبل كثير من رجال قومها، وربّت ابنها أنساً على القرآن. وكان زوجها الأول مالك بن النضر مشركاً، فلما أسلمت غضب وغادر إلى الشام ومات في غربته.',
      'صارت أرملة بابن صغير، فخطبها أبو طلحة الأنصاري — زيد بن سهل — من سادات الخزرج وأغنيائهم، وكان لا يزال على الشرك. بعث إليها بمهر عظيم، فردّت عليه بكلمات صارت من أعظم كلمات النساء: "والله إن مثلك ما يُرَدّ، ولكنك رجل كافر، وأنا امرأة مسلمة لا يحلّ لي أن أتزوجك. فإن أسلمت فذاك مهري، والله ما أريد منك ذهباً ولا فضة."',
      'دخلت كلمتها قلب أبي طلحة ولم تخرج. أسلم بين يدي النبي ﷺ ثم رجع إليها، فتزوجها على هذا المهر الذي ليس له نظير في الدنيا: الإسلام. قال أحد الصحابة: "ما سمعنا بمهر قط كان أعظم من مهر أم سُليم: الإسلام." وأنجبت له ولداً اسمه أبو عمير، فمات صغيراً، فصبرت واحتسبت، فعوّضها الله بعبد الله الذي رزقه الله تسعة من الولد كلهم قرأوا القرآن.',
      'ذكرها النبي ﷺ في الجنة قبل موتها فقال: "دخلت الجنة فسمعت خشفة، فقلت: من هذا؟ قالوا: الغميصاء بنت ملحان أم أنس بن مالك." فبقي ذكرها نوراً في تاريخ المرأة المسلمة.',
    ],
    storyEn: [
      "She is Umm Sulaym bint Milhan al-Ansariyyah, may Allah be pleased with her, mother of the Prophet's ﷺ servant Anas ibn Malik. She was among the early Muslims of Madinah, accepting Islam before many of the men of her people, and raised her son Anas upon the Qur'an. Her first husband, Malik ibn al-Nadr, was a polytheist; when she embraced Islam he was angered and left for Sham, where he died.",
      'She became a widow with a small son. Then Abu Talhah al-Ansari — Zayd ibn Sahl — among the chiefs and wealthiest of the Khazraj, still a polytheist, proposed to her with a great dowry. She answered him with words that became among the greatest words of women: "By Allah, a man like you is not refused. But you are a disbelieving man, and I am a Muslim woman; it is not lawful for me to marry you. If you embrace Islam, that is my dowry. By Allah I want no gold or silver from you."',
      "Her words entered Abu Talhah's heart and did not leave. He embraced Islam before the Prophet ﷺ and returned to her — and she married him upon this dowry without parallel in the world: Islam. A Companion said: \"We have never heard of a dowry greater than the dowry of Umm Sulaym — Islam.\" She bore him a son named Abu Umayr, who died young. She bore the loss patiently, and Allah compensated her with Abdullah, to whom Allah granted nine children, all reciting the Qur'an.",
      "The Prophet ﷺ mentioned her in Paradise before her death, saying: \"I entered Paradise and heard footsteps, and asked: Who is this? They said: al-Ghumaysa' bint Milhan, the mother of Anas ibn Malik.\" Her memory remains a light in the history of the Muslim woman.",
    ],
    virtues: ['مهرها كان الإسلام — أعظم مهر في التاريخ', 'أم خادم رسول الله ﷺ أنس بن مالك', 'بشّرها النبي ﷺ بالجنة قبل موتها', 'صبرت على موت ابنها أبي عمير'],
    virtuesEn: ['Her dowry was Islam — the greatest dowry in history', "Mother of the Prophet's ﷺ servant Anas ibn Malik", 'The Prophet ﷺ gave her glad tidings of Paradise before her death', 'Patient over the death of her son Abu Umayr'],
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

  // ───────────────────── أمهات المؤمنين (تكملة) ─────────────────────
  {
    id: 'sawdah',
    nameAr: 'سودة بنت زمعة',
    nameEn: 'Sawdah bint Zam\'ah',
    category: 'mothers',
    brief: 'أول من تزوجها النبي ﷺ بعد خديجة، صاحبة الحلم والكرم',
    briefEn: 'The first woman the Prophet ﷺ married after Khadijah, distinguished by forbearance and generosity',
    story: [
      'هي سودة بنت زمعة بن قيس القرشية العامرية. أسلمت قديمًا في مكة، وكانت ممن هاجر إلى الحبشة الهجرة الثانية مع زوجها الأول السكران بن عمرو. لما رجعت ومات زوجها، تزوجها النبي ﷺ في السنة العاشرة من البعثة بعد وفاة خديجة، وكان عمرها يومئذ يقارب الخمسين.',
      'كانت سيدةً جليلةً سخيةً، تحب النبي ﷺ حبًا شديدًا، وتحب نساءه. لما كبرت وخشيت أن يطلقها النبي ﷺ، وهبت ليلتها لعائشة، إيثارًا لرسول الله ﷺ، وحبًا في البقاء من أزواجه في الدنيا والآخرة. أنزل الله في حقها: وإن امرأة خافت من بعلها نشوزًا أو إعراضًا فلا جناح عليهما أن يصلحا بينهما صلحًا.',
      'كانت متفانية في خدمة بيت النبي ﷺ. تعتني بأمر المهاجرين، وتساعد عائشة في حفظ الحديث. روت عن النبي ﷺ خمسة أحاديث. توفيت في خلافة عمر بن الخطاب سنة 23 هـ بالمدينة، ودُفنت بالبقيع.',
    ],
    storyEn: [
      "She is Sawdah bint Zam'ah ibn Qays al-Qurashiyyah al-Amiriyyah. She embraced Islam early in Makkah and was among those who emigrated to Abyssinia in the second emigration with her first husband, al-Sakran ibn Amr. When she returned and her husband died, the Prophet ﷺ married her in the tenth year of the mission after Khadijah's death; she was nearly fifty at the time.",
      "She was a noble, generous lady who loved the Prophet ﷺ deeply and loved his wives. When she grew old and feared the Prophet ﷺ would divorce her, she gave her night to A'isha, preferring the Messenger of Allah ﷺ and loving to remain among his wives in this world and the next. Allah revealed about her: 'And if a woman fears from her husband contempt or evasion, there is no sin upon them if they make terms of settlement between them.'",
      "She was devoted to serving the Prophet's ﷺ household. She cared for the affairs of the Muhajirun and helped A'isha in preserving hadith. She narrated five hadiths from the Prophet ﷺ. She died in Umar ibn al-Khattab's caliphate in 23 AH in Madinah and was buried in al-Baqi'.",
    ],
    virtues: ['أول من تزوجها النبي ﷺ بعد خديجة', 'وهبت ليلتها لعائشة إيثارًا', 'من السابقات إلى الإسلام', 'هاجرت إلى الحبشة'],
    virtuesEn: ['First woman the Prophet ﷺ married after Khadijah', 'Gave her night to A\'isha out of preference', 'Among the early Muslims', 'Emigrated to Abyssinia'],
  },
  {
    id: 'umm-salama',
    nameAr: 'أم سلمة هند بنت أبي أمية',
    nameEn: 'Umm Salamah Hind bint Abi Umayyah',
    category: 'mothers',
    brief: 'صاحبة الرأي السديد في صلح الحديبية، آخر أمهات المؤمنين وفاة',
    briefEn: 'Owner of the wise counsel at Hudaybiyyah, the last of the Mothers of the Believers to die',
    story: [
      'هي هند بنت أبي أمية حذيفة المخزومية. أسلمت قديمًا مع زوجها أبي سلمة عبد الله بن عبد الأسد، وكانا من السابقين، وهاجرا إلى الحبشة مرتين، ثم إلى المدينة. أصيب أبو سلمة في غزوة أحد، ومات من جراحه. حزنت عليه أم سلمة حزنًا شديدًا، ودعت بدعاء النبي ﷺ: اللهم أجرني في مصيبتي واخلف لي خيرًا منها. فعوّضها الله بزواج النبي ﷺ.',
      'تزوجها النبي ﷺ في السنة الرابعة من الهجرة، وكانت أرملة ذات أولاد. كانت من أعقل النساء وأحسنهن رأيًا. في صلح الحديبية، حين أمر النبي ﷺ الصحابة أن يحلقوا وينحروا ولم يبادر أحد إيمانًا منهم بأن الصلح فيه ظلم لهم، استشار النبي ﷺ أم سلمة. أشارت عليه أن يخرج ولا يكلم أحدًا حتى ينحر بنفسه ويحلق. ففعل، فقام الصحابة كلهم يفعلون كما فعل.',
      'كانت من فقيهات الصحابة، روت عن النبي ﷺ ثلاثمئة وثمانية وسبعين حديثًا. توفيت في خلافة يزيد بن معاوية سنة 61 هـ بالمدينة، وكان عمرها قاربت التسعين. كانت آخر أمهات المؤمنين وفاة، فكان موتها نهاية عصر الزوجات الطاهرات.',
    ],
    storyEn: [
      "She is Hind bint Abi Umayyah Hudhayfah al-Makhzumiyyah. She embraced Islam early with her husband Abu Salamah Abdullah ibn Abd al-Asad; they were among the foremost, and emigrated to Abyssinia twice and then to Madinah. Abu Salamah was wounded at Uhud and died of his wounds. Umm Salamah grieved deeply and supplicated with the supplication the Prophet ﷺ taught: 'O Allah, reward me for my calamity and replace it with something better.' Allah replaced it with marriage to the Prophet ﷺ.",
      "The Prophet ﷺ married her in the fourth year of the Hijrah; she was a widow with children. She was among the wisest of women with the best counsel. At the Treaty of Hudaybiyyah, when the Prophet ﷺ ordered the Companions to shave and slaughter and none stepped forward — believing there was wrong done to them in the treaty — the Prophet ﷺ consulted Umm Salamah. She advised him to go out, speak to no one, and slaughter and shave himself. He did, and all the Companions rose and did as he did.",
      "She was among the female jurists of the Companions, narrating from the Prophet ﷺ three hundred and seventy-eight hadiths. She died in Yazid ibn Mu'awiyah's caliphate in 61 AH in Madinah at nearly ninety years of age. She was the last of the Mothers of the Believers to die, marking the end of the era of the pure wives.",
    ],
    virtues: ['صاحبة الرأي السديد في الحديبية', 'هاجرت الهجرتين', 'من فقيهات الصحابة', 'آخر أمهات المؤمنين وفاة'],
    virtuesEn: ['Owner of the wise counsel at Hudaybiyyah', 'Made both emigrations', 'Among the female jurists of the Companions', 'Last of the Mothers of the Believers to die'],
  },
  {
    id: 'zaynab-jahsh',
    nameAr: 'زينب بنت جحش',
    nameEn: 'Zaynab bint Jahsh',
    category: 'mothers',
    brief: 'التي زوّجها الله من فوق سبع سماوات',
    briefEn: 'The one whom Allah married to His Messenger from above seven heavens',
    story: [
      'هي زينب بنت جحش بن رئاب الأسدية. ابنة عمة النبي ﷺ، فهي ابنة أميمة بنت عبد المطلب. أسلمت قديمًا وهاجرت إلى المدينة. زوّجها النبي ﷺ من زيد بن حارثة مولاه ليكسر بزواجها به الفوارق الطبقية، فقد كانت شريفة قرشية وزيد عبدًا معتقًا.',
      'لم يدم الزواج طويلًا لاختلاف الطباع. طلقها زيد بعد فترة. أنزل الله في شأنها قرآنًا فريدًا: فلما قضى زيد منها وطرًا زوجناكها لكي لا يكون على المؤمنين حرج في أزواج أدعيائهم إذا قضوا منهن وطرًا. زوّجها الله من نبيه ﷺ مباشرة من فوق سبع سماوات، دون أن يخطبها أحد. كانت تفتخر على زوجات النبي ﷺ وتقول: زوجكن أهاليكن وزوجني الله من فوق سبع سماوات.',
      'كانت كثيرة الصدقة، تعمل بيدها وتتصدّق بكل ما تكسب. قال النبي ﷺ عنها: أسرعكن لحاقًا بي أطولكن يدًا. ظنّت كل من زوجاته أن المقصود طول اليد الحقيقية. وكانت أم المؤمنين سودة أطولهن. لكن بعد سنوات، ماتت زينب أولًا، فعلمن أن المقصود طول اليد في الصدقة. توفيت سنة 20 هـ في خلافة عمر، ودُفنت بالبقيع.',
    ],
    storyEn: [
      "She is Zaynab bint Jahsh ibn Ri'ab al-Asadiyyah. The cousin of the Prophet ﷺ, daughter of Umaymah bint Abd al-Muttalib. She embraced Islam early and emigrated to Madinah. The Prophet ﷺ married her to Zayd ibn Harithah, his freed slave, to break class distinctions through her marriage to him — she was a noble Qurashi and Zayd was a freed slave.",
      "The marriage did not last long due to differences in temperament. Zayd divorced her after a period. Allah revealed about her a unique Qur'an: 'When Zayd had no further need of her, We married her to you, so that there should be no difficulty for the believers concerning the wives of their adopted sons when they have no further need of them.' Allah married her to His Prophet ﷺ directly from above seven heavens, with no human proposing. She used to take pride before the Prophet's wives, saying: 'Your families married you off, but Allah married me from above seven heavens.'",
      "She was much given to charity, working with her hand and giving everything she earned. The Prophet ﷺ said about her: 'The first of you to follow me will be the one with the longest hand.' Each of his wives thought the longest physical hand was meant; Mother of the Believers Sawdah was the tallest. But years later, Zaynab died first, and they knew the longest hand meant the longest in charity. She died in 20 AH in Umar's caliphate and was buried in al-Baqi'.",
    ],
    virtues: ['زوّجها الله من فوق سبع سماوات', 'أطول زوجات النبي ﷺ يدًا بالصدقة', 'ابنة عمة النبي ﷺ', 'أول من لحق بالنبي بعد وفاته من زوجاته'],
    virtuesEn: ['Married to the Prophet ﷺ from above seven heavens', 'The Prophet\'s wife with the longest hand in charity', 'The Prophet\'s ﷺ cousin', 'The first of his wives to follow him after his death'],
  },
  {
    id: 'juwayriyya',
    nameAr: 'جويرية بنت الحارث',
    nameEn: 'Juwayriyya bint al-Harith',
    category: 'mothers',
    brief: 'أعتق بزواجها مئة بيت من بني المصطلق',
    briefEn: 'Through her marriage, a hundred households of Banu al-Mustaliq were freed',
    story: [
      'هي جويرية بنت الحارث بن أبي ضرار، سيد بني المصطلق من خزاعة. وقعت في الأسر بعد غزوة بني المصطلق سنة 5 هـ. كان والدها سيدًا، وقد كرهت أن تكون أمَةً عند صحابي. سألت النبي ﷺ أن يعينها على فدائها من ثابت بن قيس بن شماس الذي وقعت في سهمه.',
      'فقال لها النبي ﷺ: أو خيرٌ من ذلك؟ قالت: وما هو يا رسول الله؟ قال: أقضي عنك كتابتك وأتزوجك. قالت: نعم يا رسول الله. تزوجها النبي ﷺ. لما سمع الصحابة بزواجها، قالوا: أصهار رسول الله ﷺ. فأطلقوا ما بأيديهم من سبي بني المصطلق. أعتق بزواجها مئة بيت من قومها.',
      'قالت عائشة: ما رأينا امرأة أعظم بركة على قومها منها. كانت أم المؤمنين كثيرة العبادة. روى مسلم أن النبي ﷺ خرج من عندها لصلاة الصبح وهي في مصلاها، ثم رجع قبل الضحى فوجدها في مصلاها. قال: ما زلتِ على الحال التي فارقتك عليها؟ قالت: نعم. توفيت سنة 56 هـ، ودُفنت بالبقيع.',
    ],
    storyEn: [
      "She is Juwayriyya bint al-Harith ibn Abi Dirar, chief of Banu al-Mustaliq of Khuza'ah. She was captured after the Battle of Banu al-Mustaliq in 5 AH. Her father was a chief, and she disliked being a slave-girl to a Companion. She asked the Prophet ﷺ to help her with her ransom from Thabit ibn Qays ibn Shammas, in whose share she had fallen.",
      "The Prophet ﷺ said to her: 'Or shall I offer you something better?' She said: 'What is it, O Messenger of Allah?' He said: 'I will pay your contract for you and marry you.' She said: 'Yes, O Messenger of Allah.' The Prophet ﷺ married her. When the Companions heard of her marriage, they said: 'In-laws of the Messenger of Allah ﷺ.' They released all the captives of Banu al-Mustaliq in their possession. Through her marriage a hundred households of her people were freed.",
      "A'isha said: 'We have not seen a woman greater in blessing to her people than her.' The Mother of the Believers was much given to worship. Muslim narrated that the Prophet ﷺ left her at Fajr while she was in her place of prayer, returned before Duha, and found her still in her place of prayer. He said: 'Are you still in the state I left you in?' She said: 'Yes.' She died in 56 AH and was buried in al-Baqi'.",
    ],
    virtues: ['أعتق بزواجها مئة بيت', 'كثيرة الذكر والعبادة', 'بنت سيد بني المصطلق', 'بركة على قومها'],
    virtuesEn: ['Through her marriage 100 households were freed', 'Much given to remembrance and worship', 'Daughter of the chief of Banu al-Mustaliq', 'A blessing upon her people'],
  },
  {
    id: 'safiyya',
    nameAr: 'صفية بنت حيي',
    nameEn: 'Safiyya bint Huyayy',
    category: 'mothers',
    brief: 'بنت سيد بني النضير، صبرت على فقد أهلها وأسلمت',
    briefEn: 'Daughter of the chief of Banu al-Nadir, who bore the loss of her family and embraced Islam',
    story: [
      'هي صفية بنت حيي بن أخطب، سيد بني النضير من يهود المدينة، تنتسب إلى هارون أخي موسى عليهما السلام. سُبيت في غزوة خيبر سنة 7 هـ بعد أن قُتل أبوها وزوجها في المعركة. وقعت في سهم دحية الكلبي أولًا، ثم اشتراها النبي ﷺ منه وأعتقها وتزوجها، وجعل عتقها صداقها.',
      'كانت صفية ذات عقل وأدب. واجهت في بيت النبي ﷺ بعض الأذى من أمهات المؤمنين بسبب أصلها اليهودي. شكت إلى النبي ﷺ مرة أن نساءه يعيّرنها بأنها بنت يهودي. علّمها النبي ﷺ كيف ترد بحكمة، قال لها: قولي لهنّ: إن أبي هارون وعمي موسى وزوجي محمد. لما قالت ذلك، سكتن ولم يجدن ردًّا.',
      'كانت تحب النبي ﷺ حبًا شديدًا. في مرض النبي ﷺ الأخير، قالت: يا رسول الله، والله لوددت أن الذي بك بي. ظنّ بعض زوجاته أنها تتظاهر، فعرف النبي ﷺ نواياهن وقال: إنها لصادقة. توفيت سنة 50 هـ في خلافة معاوية، ودُفنت بالبقيع. تركت بمالها ثلث ميراثها لابن أخت لها كان يهوديًا، رحمةً بقرابتها.',
    ],
    storyEn: [
      "She is Safiyya bint Huyayy ibn Akhtab, chief of Banu al-Nadir of the Jews of Madinah, descending from Harun, brother of Musa. She was captured at the Battle of Khaybar in 7 AH after her father and husband were killed in the battle. She first fell in the share of Dihyah al-Kalbi, then the Prophet ﷺ bought her from him, freed her, married her, and made her freeing her dowry.",
      "Safiyya was wise and refined. In the Prophet's ﷺ house she faced some harm from the Mothers of the Believers because of her Jewish origin. She once complained to the Prophet ﷺ that his wives taunted her with being a Jew's daughter. The Prophet ﷺ taught her how to reply wisely: 'Say to them: My father is Harun, my uncle is Musa, and my husband is Muhammad.' When she said this, they were silent and found no reply.",
      "She loved the Prophet ﷺ deeply. In the Prophet's ﷺ final illness she said: 'O Messenger of Allah, by Allah, I wish what is upon you were upon me.' Some of his wives thought she pretended, but the Prophet ﷺ knew their intentions and said: 'She is truthful.' She died in 50 AH in Mu'awiyah's caliphate and was buried in al-Baqi'. She left from her wealth a third of her inheritance to a sister's son who was Jewish, out of mercy to her relatives.",
    ],
    virtues: ['من نسل هارون عليه السلام', 'صبرت على فقد أهلها', 'ذكية حكيمة الرد', 'أوصت لقرابتها اليهود رحمةً'],
    virtuesEn: ['Descended from Harun, peace be upon him', 'Bore the loss of her family with patience', 'Wise and clever in reply', 'Bequeathed to her Jewish relatives out of mercy'],
  },
  {
    id: 'umm-habiba',
    nameAr: 'أم حبيبة رملة بنت أبي سفيان',
    nameEn: 'Umm Habibah Ramlah bint Abi Sufyan',
    category: 'mothers',
    brief: 'هاجرت إلى الحبشة، وزوّجها النجاشي بالنيابة عن النبي ﷺ',
    briefEn: 'Emigrated to Abyssinia; the Negus contracted her marriage on the Prophet\'s ﷺ behalf',
    story: [
      'هي رملة بنت أبي سفيان بن حرب الأموية. ابنة أبي سفيان زعيم قريش في الجاهلية. أسلمت قبل أبيها بسنوات، وهاجرت مع زوجها عبيد الله بن جحش إلى الحبشة. كان زوجها قد ارتد عن الإسلام في الحبشة وتنصّر، فهجرته وثبتت على دينها.',
      'لما علم النبي ﷺ بحالها، أرسل إلى النجاشي ملك الحبشة يخطبها من رسوله. وافق النجاشي، وقام بالعقد بنفسه نيابةً عن النبي ﷺ، وأمهرها أربعمئة دينار من ماله الخاص. كانت هذه الزيجة من أعجب الزيجات: زوج في المدينة، زوجة في الحبشة، ووليّ ملك مسلم في إفريقيا.',
      'رجعت إلى المدينة سنة 7 هـ بعد فتح خيبر. لما دخلت بيت النبي ﷺ، كان أبوها أبو سفيان لا يزال مشركًا. زاره مرة في المدينة فأراد أن يجلس على فراش النبي ﷺ، فطوته دونه. سألها: يا بنية، أرغبت بهذا الفراش عني، أم رغبت بي عنه؟ قالت: بل هو فراش رسول الله ﷺ، وأنت رجل مشرك نجس. قال: لقد أصابك يا بنية بعدي شر. لاحقًا أسلم أبو سفيان في فتح مكة. توفيت أم حبيبة سنة 44 هـ.',
    ],
    storyEn: [
      "She is Ramlah bint Abi Sufyan ibn Harb al-Umawiyyah. Daughter of Abu Sufyan, chief of Quraysh in the Jahiliyyah. She embraced Islam years before her father and emigrated with her husband Ubaydullah ibn Jahsh to Abyssinia. Her husband had apostatised from Islam in Abyssinia and become a Christian. She left him and stood firm on her religion.",
      "When the Prophet ﷺ learned of her condition, he sent to the Negus, king of Abyssinia, to propose to her from his messenger. The Negus agreed and conducted the contract himself on the Prophet's ﷺ behalf, paying her a dowry of four hundred dinars from his own wealth. This marriage was among the most remarkable: a husband in Madinah, a wife in Abyssinia, and a Muslim king as guardian in Africa.",
      "She returned to Madinah in 7 AH after the conquest of Khaybar. When she entered the Prophet's ﷺ house, her father Abu Sufyan was still a polytheist. He visited her once in Madinah and wanted to sit on the Prophet's ﷺ bed; she folded it away from him. He asked: 'My daughter, did you keep this bed from me, or did you keep me from it?' She said: 'Rather, it is the bed of the Messenger of Allah ﷺ, and you are a polytheist, impure man.' He said: 'Some evil has touched you after me, my daughter.' Abu Sufyan later embraced Islam at the conquest of Makkah. Umm Habibah died in 44 AH.",
    ],
    virtues: ['هاجرت إلى الحبشة', 'زوّجها النجاشي بأمر النبي ﷺ', 'ثبتت على دينها رغم ردة زوجها', 'ابنة أبي سفيان زعيم قريش'],
    virtuesEn: ['Emigrated to Abyssinia', 'The Negus married her to the Prophet ﷺ', 'Stood firm despite her husband\'s apostasy', 'Daughter of Abu Sufyan, chief of Quraysh'],
  },
  {
    id: 'maymuna',
    nameAr: 'ميمونة بنت الحارث',
    nameEn: 'Maymunah bint al-Harith',
    category: 'mothers',
    brief: 'آخر من تزوجها النبي ﷺ، توفيت حيث تزوجها',
    briefEn: 'The last woman the Prophet ﷺ married; she died where he married her',
    story: [
      'هي ميمونة بنت الحارث الهلالية. أختها أم الفضل لبابة زوجة العباس عم النبي ﷺ. تزوجها النبي ﷺ سنة 7 هـ في عمرة القضاء بمكان اسمه سَرِف قرب مكة. كانت أرملة، وهي آخر من تزوج النبي ﷺ من النساء.',
      'كانت ميمونة من الفقيهات الصوّامات القوّامات. روت عن النبي ﷺ ستة وأربعين حديثًا، اشتهرت بالأحاديث الفقهية في الطهارة والغسل والصيام. كان ابن أختها ابن عباس يتعلم منها كثيرًا من فقه النساء، ومن ذلك حديث المبيت في بيتها الذي اشتهر برؤية ابن عباس صلاة النبي ﷺ في الليل.',
      'توفيت ميمونة سنة 51 هـ بنفس المكان الذي تزوجها فيه النبي ﷺ — سَرِف. كانت ذاهبة من المدينة إلى مكة، فمرضت في الطريق وماتت في سَرِف. دفنت هناك. وقفت عائشة على قبرها وقالت: لقد تزوجها رسول الله ﷺ في سرف وماتت في سرف، فدفناها في موضع بنائها بها. سبحان الذي بدأها أنشأها زوجة هناك، وأرجعها روحها هناك.',
    ],
    storyEn: [
      "She is Maymunah bint al-Harith al-Hilaliyyah. Her sister Umm al-Fadl Lubabah was the wife of al-Abbas, the Prophet's ﷺ uncle. The Prophet ﷺ married her in 7 AH at the Compensatory Umrah at a place called Sarif near Makkah. She was a widow, and she was the last woman the Prophet ﷺ married.",
      "Maymunah was among the female jurists, much given to fasting and night prayer. She narrated from the Prophet ﷺ forty-six hadiths and was famous for jurisprudential hadiths on purity, ritual washing, and fasting. Her nephew Ibn Abbas learned much women's jurisprudence from her, including the famous hadith of his night in her house where Ibn Abbas saw the Prophet ﷺ pray at night.",
      "Maymunah died in 51 AH in the very place the Prophet ﷺ had married her — Sarif. She was traveling from Madinah to Makkah, fell ill on the road, and died at Sarif. She was buried there. A'isha stood over her grave and said: 'The Messenger of Allah ﷺ married her at Sarif, and she died at Sarif, and we buried her in the very place of her consummation.' Glory to the One who began her as a wife there and returned her soul there.",
    ],
    virtues: ['آخر من تزوجها النبي ﷺ', 'فقيهة محدّثة', 'خالة ابن عباس ترجمان القرآن', 'ماتت حيث تزوجها بسَرِف'],
    virtuesEn: ['Last woman the Prophet ﷺ married', 'A jurist and narrator of hadith', 'Aunt of Ibn Abbas, Translator of the Qur\'an', 'Died where she was married, at Sarif'],
  },
  {
    id: 'zaynab-khuzayma',
    nameAr: 'زينب بنت خزيمة (أم المساكين)',
    nameEn: 'Zaynab bint Khuzaymah (Mother of the Poor)',
    category: 'mothers',
    brief: 'لُقّبت بأم المساكين لكثرة إطعامها الفقراء',
    briefEn: 'Nicknamed "Mother of the Poor" for her frequent feeding of the destitute',
    story: [
      'هي زينب بنت خزيمة بن الحارث العامرية الهلالية. كانت قبل الإسلام تُلقّب بـ أم المساكين لشدة كرمها على الفقراء، وكثرة إطعامها لهم. تزوجها قبل النبي ﷺ عبيدة بن الحارث بن المطلب، فاستشهد في غزوة بدر.',
      'تزوجها النبي ﷺ في السنة الثالثة من الهجرة بعد وفاة عبيدة. كانت تكره أن يفوتها النبي ﷺ، فلما عرضها عليها قبلت في الحال. لم تمكث في بيت النبي ﷺ طويلًا — يقول أكثر العلماء إنها مكثت ثمانية أشهر فقط أو نحوها، ثم توفيت.',
      'صلى عليها النبي ﷺ ودفنها بالبقيع. كانت أول زوجة للنبي ﷺ تموت في حياته بعد خديجة. لم تترك أولادًا منه. بقيت سيرتها في الذاكرة الإسلامية كنموذج للمرأة الكريمة، التي يفتح بيتها للفقراء قبل أن يعرفهم أحد. ذكرها يبقى علامةً على أن الكرم مع المحتاج طريق إلى محبة الناس وذكرهم الحسن.',
    ],
    storyEn: [
      "She is Zaynab bint Khuzaymah ibn al-Harith al-Amiriyyah al-Hilaliyyah. Before Islam she was nicknamed 'Mother of the Poor' for her great generosity to the destitute and her frequent feeding of them. Before the Prophet ﷺ she married Ubaydah ibn al-Harith ibn al-Muttalib, who was martyred at the Battle of Badr.",
      "The Prophet ﷺ married her in the third year of the Hijrah after Ubaydah's death. She disliked missing the Prophet ﷺ, so when he offered marriage she accepted at once. She did not stay in the Prophet's ﷺ house long — most scholars say she stayed only about eight months — then she died.",
      "The Prophet ﷺ prayed over her and buried her in al-Baqi'. She was the first of the Prophet's ﷺ wives to die in his lifetime after Khadijah. She left no children from him. Her life remained in Islamic memory as a model of the generous woman who opens her house to the poor before anyone knows them. Her remembrance is a sign that generosity to the needy is a road to people's love and good remembrance.",
    ],
    virtues: ['أم المساكين', 'أول زوجات النبي ﷺ موتًا بعد خديجة', 'أرملة شهيد بدر', 'لم تمكث في بيت النبي طويلًا'],
    virtuesEn: ['Mother of the Poor', 'First of the Prophet\'s ﷺ wives to die after Khadijah', 'Widow of a martyr of Badr', 'Did not stay in the Prophet\'s house long'],
  },

  // ───────────────────── الأنصار (تكملة) ─────────────────────
  {
    id: 'ubayy',
    nameAr: 'أُبيّ بن كعب',
    nameEn: 'Ubayy ibn Ka\'b',
    category: 'ansar',
    brief: 'سيد القراء، وأقرأ الأمة لكتاب الله',
    briefEn: 'Master of the reciters, and the most learned in reciting the Book of Allah',
    story: [
      'هو أُبيّ بن كعب بن قيس الأنصاري الخزرجي النجاري. من سادة الأنصار. أسلم في بيعة العقبة الثانية، فهو من السابقين. كان من القلائل في يثرب الذين يقرأون ويكتبون. اختاره النبي ﷺ من كتاب الوحي.',
      'كان أعلم الصحابة بالقرآن. قال النبي ﷺ: أقرؤكم أُبيّ. وقال: إن الله أمرني أن أقرأ عليك القرآن. قال أُبيّ: آلله سمّاني لك؟ قال النبي: نعم. فبكى أُبيّ وقال: وقد ذُكرت عند رب العالمين؟ قال: نعم. فبكى أُبيّ بكاءً شديدًا. هذه شهادة من السماء بأن أُبيّ سيد القراء.',
      'روى عن النبي ﷺ مئة وأربعة وستين حديثًا. شهد بدرًا وأحدًا والخندق وسائر الغزوات. كان من جامعي القرآن في حياة النبي ﷺ. في خلافة عثمان، كان أحد الأربعة الذين كلّفهم عثمان بنسخ المصحف العثماني. توفي في خلافة عثمان سنة 32 هـ بالمدينة.',
    ],
    storyEn: [
      "He is Ubayy ibn Ka'b ibn Qays al-Ansari al-Khazraji al-Najjari. Among the chiefs of the Ansar. He embraced Islam at the Second Pledge of Aqabah, among the foremost. He was among the few in Yathrib who could read and write. The Prophet ﷺ chose him as one of the scribes of revelation.",
      "He was the most knowledgeable of the Companions in the Qur'an. The Prophet ﷺ said: 'The best reciter among you is Ubayy.' He also said: 'Allah has commanded me to recite the Qur'an to you.' Ubayy said: 'Did Allah name me to you?' The Prophet said: 'Yes.' Ubayy wept and said: 'I have been mentioned before the Lord of the Worlds?' He said: 'Yes.' Ubayy wept greatly. This is a testimony from the sky that Ubayy is the master of reciters.",
      "He narrated from the Prophet ﷺ one hundred and sixty-four hadiths. He witnessed Badr, Uhud, the Trench, and the rest of the battles. He was among those who collected the Qur'an in the Prophet's ﷺ lifetime. In Uthman's caliphate he was one of the four whom Uthman charged with copying the Uthmanic Mushaf. He died in Uthman's caliphate in 32 AH in Madinah.",
    ],
    virtues: ['سيد القراء', 'كاتب الوحي', 'جامع للقرآن في حياة النبي', 'قرأ الله عليه القرآن من فوق سبع سماوات'],
    virtuesEn: ['Master of the reciters', 'Scribe of revelation', 'Collected the Qur\'an in the Prophet\'s lifetime', 'Allah recited the Qur\'an to him from above seven heavens'],
  },
  {
    id: 'ubada',
    nameAr: 'عبادة بن الصامت',
    nameEn: 'Ubadah ibn al-Samit',
    category: 'ansar',
    brief: 'أحد النقباء في بيعة العقبة، فاتح حمص وقاضيها',
    briefEn: 'One of the chiefs at the Pledge of Aqabah, conqueror and judge of Homs',
    story: [
      'هو عبادة بن الصامت بن قيس الأنصاري الخزرجي. كان من النقباء الاثني عشر الذين بايعوا النبي ﷺ في بيعة العقبة الثانية. شارك في كل غزوات النبي ﷺ. كان طويل القامة، شجاعًا، صريحًا في الحق لا يخاف لومة لائم.',
      'كان من حافظي القرآن في حياة النبي ﷺ، ومن مفسّريه. أُرسل إلى أهل الصُّفّة يعلّمهم القرآن. هو الذي روى حديث: لا ضرر ولا ضرار، وأحاديث كثيرة في الأحكام والمعاملات. في خلافة عمر، أرسله إلى الشام مع معاذ بن جبل وأبي الدرداء لتعليم الناس الإسلام.',
      'تولى قضاء حمص وفلسطين. كان قاضيًا صارمًا، لا يخاف من أحد. لما رأى من معاوية بن أبي سفيان أمرًا يخالف الشرع، أنكر عليه، فكتب معاوية إلى عثمان يشكوه. كتب عثمان لمعاوية: خل بين عبادة وبين الشام، فإنما أراد ما أنزل الله. توفي بفلسطين سنة 34 هـ، ودُفن في الرملة، وقبره معروف بها إلى اليوم.',
    ],
    storyEn: [
      "He is Ubadah ibn al-Samit ibn Qays al-Ansari al-Khazraji. He was one of the twelve chiefs who pledged to the Prophet ﷺ at the Second Pledge of Aqabah. He participated in every campaign of the Prophet ﷺ. He was tall, brave, and candid in truth, fearing no blamer's blame.",
      "He was among the memorisers of the Qur'an in the Prophet's ﷺ lifetime and among its interpreters. He was sent to the people of al-Suffah to teach them the Qur'an. He narrated the hadith: 'No harm and no reciprocal harm,' and many hadiths on rulings and dealings. In Umar's caliphate he was sent to Sham with Mu'adh ibn Jabal and Abu al-Darda' to teach the people Islam.",
      "He took the judgeship of Homs and Palestine. He was a strict judge, fearing no one. When he saw Mu'awiyah ibn Abi Sufyan doing something against the Shari'ah, he objected. Mu'awiyah wrote to Uthman complaining. Uthman wrote to Mu'awiyah: 'Leave Ubadah alone with Sham; he only wants what Allah revealed.' He died in Palestine in 34 AH and was buried in al-Ramlah, his grave is known there to this day.",
    ],
    virtues: ['أحد النقباء الاثني عشر', 'صريح في الحق لا يخاف لومة لائم', 'قاضي حمص وفلسطين', 'علّم أهل الشام القرآن'],
    virtuesEn: ['One of the twelve chiefs', 'Candid in truth, fearing no blame', 'Judge of Homs and Palestine', 'Taught the people of Sham the Qur\'an'],
  },
  {
    id: 'usayd',
    nameAr: 'أُسيد بن حُضير',
    nameEn: 'Usayd ibn Hudayr',
    category: 'ansar',
    brief: 'من السبعين في بيعة العقبة، الذي اختلطت أصوات الملائكة بقراءته',
    briefEn: 'One of the seventy at the Pledge of Aqabah, whose recitation the angels mingled with',
    story: [
      'هو أُسيد بن حُضير بن سماك الأنصاري الأوسي. ابن خال سعد بن معاذ. أسلم على يد مصعب بن عمير قبل بيعة العقبة الكبرى. كان من سادات الأوس، رجلًا حكيمًا فطنًا. لما أسلم، تبعه قومه بنو عبد الأشهل في الإسلام.',
      'شارك في غزوات النبي ﷺ ابتداءً من بدر. كان من أحسن الصحابة صوتًا في قراءة القرآن. روى البخاري ومسلم أنه قرأ ليلةً سورة البقرة، وفرسه مربوطة بقربه، فاضطرب الفرس. أمسك عن القراءة فهدأ. ثم قرأ، فاضطرب الفرس مرة أخرى. خشي أُسيد على ابنه يحيى الصغير الذي كان قريبًا، فالتفت. فرأى مثل الظلة فيها مصابيح تعرج إلى السماء.',
      'لما أخبر النبي ﷺ، قال: تلك الملائكة كانت تستمع لك. لو قرأت لأصبحت الملائكة لا تتوارى منك ينظر إليها الناس. هذه شهادة عظيمة — ملائكة تنزل من السماء لتستمع لرجل يقرأ القرآن. توفي أُسيد في خلافة عمر سنة 20 هـ، وحمل عمر جنازته بنفسه، ودفنه بالبقيع.',
    ],
    storyEn: [
      "He is Usayd ibn Hudayr ibn Simak al-Ansari al-Awsi. The cousin of Sa'd ibn Mu'adh. He embraced Islam at the hand of Mus'ab ibn Umayr before the Great Pledge of Aqabah. He was among the chiefs of the Aws, wise and astute. When he embraced Islam, his people Banu Abd al-Ashhal followed him into Islam.",
      "He participated in the campaigns of the Prophet ﷺ starting from Badr. He had one of the most beautiful voices among the Companions in reciting the Qur'an. Bukhari and Muslim narrated that he was reciting Surah al-Baqarah one night with his horse tied near him, and the horse stirred. He stopped reciting and it calmed. He recited again, and the horse stirred again. Usayd feared for his young son Yahya who was nearby, so he turned. He saw something like a canopy with lamps ascending to the sky.",
      "When he informed the Prophet ﷺ, he said: 'Those were the angels listening to you. Had you recited more, the angels would not have hidden from you in the morning; people would see them.' This is a great testimony — angels descending from the sky to listen to a man recite the Qur'an. Usayd died in Umar's caliphate in 20 AH; Umar carried his bier himself and buried him in al-Baqi'.",
    ],
    virtues: ['اختلطت قراءته بأصوات الملائكة', 'أسلمت قبيلته بإسلامه', 'من النقباء الاثني عشر', 'حمل عمر بن الخطاب جنازته'],
    virtuesEn: ['His recitation was mingled with the voices of the angels', 'His tribe embraced Islam through his Islam', 'One of the twelve chiefs', 'Umar ibn al-Khattab carried his bier'],
  },
  {
    id: 'jabir',
    nameAr: 'جابر بن عبد الله',
    nameEn: 'Jabir ibn Abdullah',
    category: 'ansar',
    brief: 'من حفظة الحديث، روى عن النبي ﷺ 1540 حديثًا',
    briefEn: 'A memoriser of hadith, narrating 1,540 hadiths from the Prophet ﷺ',
    story: [
      'هو جابر بن عبد الله بن عمرو بن حرام الأنصاري الخزرجي السلمي. وُلد قبل الهجرة بنحو 16 سنة. أبوه عبد الله من النقباء الاثني عشر، استشهد في غزوة أحد. كان جابر صغيرًا يومئذ. شارك في غزوات النبي ﷺ بعد ذلك ابتداءً من الخندق، وقيل شهد 19 غزوة.',
      'حدثت معه قصة عجيبة في غزوة ذات الرقاع. كان مع النبي ﷺ في الطريق، فاحتاج جابر إلى أن يعود إلى المدينة. أمر النبي ﷺ جمله أن يكون قويًا، فصار جمله أسبق جمل في الجيش. ثم اشترى النبي ﷺ منه الجمل بأوقية، واشترط أن يحمله إلى المدينة، فحمله جابر. وفي المدينة، أعطاه النبي ﷺ الجمل هدية مع ثمنه. كرم النبي ﷺ.',
      'أبوه عبد الله استشهد في أحد، وترك ديونًا كثيرة على ولده جابر. اشتدت ديونه. ذهب إلى النبي ﷺ يطلب الدعاء. دعا النبي ﷺ، فأنبت الله في بستان جابر تمرًا كثيرًا قضى به ديون أبيه. كان من فقهاء الصحابة، روى عن النبي ﷺ 1540 حديثًا، فهو من أكثر الصحابة رواية. توفي بالمدينة سنة 78 هـ وعمره 94 سنة، وكان آخر من توفي من الصحابة بالمدينة.',
    ],
    storyEn: [
      "He is Jabir ibn Abdullah ibn Amr ibn Haram al-Ansari al-Khazraji al-Sulami. He was born about 16 years before the Hijrah. His father Abdullah was one of the twelve chiefs and was martyred at the Battle of Uhud. Jabir was young at the time. He participated in the campaigns of the Prophet ﷺ afterward starting from the Trench; it is said he witnessed 19 campaigns.",
      "A remarkable story happened with him at the campaign of Dhat al-Riqa'. He was with the Prophet ﷺ on the road and needed to return to Madinah. The Prophet ﷺ ordered his camel to be strong, and his camel became the fastest in the army. The Prophet ﷺ then bought the camel from him for an ounce, stipulating that he carry him to Madinah, which Jabir did. In Madinah, the Prophet ﷺ gave him the camel as a gift with its price. The Prophet's ﷺ generosity.",
      "His father Abdullah was martyred at Uhud, leaving many debts upon his son Jabir. His debts pressed heavily. He went to the Prophet ﷺ requesting supplication. The Prophet ﷺ supplicated, and Allah caused much fruit to grow in Jabir's garden, with which he paid his father's debts. He was among the jurists of the Companions, narrating 1,540 hadiths from the Prophet ﷺ, making him among the most prolific narrators. He died in Madinah in 78 AH at 94 years old, the last Companion to die in Madinah.",
    ],
    virtues: ['روى 1540 حديثًا عن النبي', 'ابن شهيد أحد', 'دعا له النبي فقضى دينه', 'آخر صحابي توفي بالمدينة'],
    virtuesEn: ['Narrated 1,540 hadiths from the Prophet', 'Son of a martyr of Uhud', 'The Prophet supplicated and his debt was paid', 'Last Companion to die in Madinah'],
  },
  {
    id: 'anas',
    nameAr: 'أنس بن مالك',
    nameEn: 'Anas ibn Malik',
    category: 'ansar',
    brief: 'خادم رسول الله ﷺ، عاش معه عشر سنين، ثاني أكثر الصحابة رواية للحديث',
    briefEn: 'Servant of the Messenger of Allah ﷺ, lived with him for ten years, second-most prolific narrator of hadith',
    story: [
      'هو أنس بن مالك بن النضر الأنصاري الخزرجي النجاري. وُلد قبل الهجرة بعشر سنين. أمه أم سُليم بنت ملحان — التي مهرها الإسلام (انظر قصصها). لما هاجر النبي ﷺ إلى المدينة، جاءت به أمه إليه وقالت: يا رسول الله، هذا أنس غلامك، يخدمك. فقبله النبي ﷺ. كان عمره عشر سنين.',
      'خدم النبي ﷺ عشر سنين كاملة، حتى توفي ﷺ. قال أنس: خدمتُ رسول الله ﷺ عشر سنين، فما قال لي لشيء فعلتُه: لمَ فعلت؟ ولا لشيء لم أفعله: لمَ لم تفعل؟ كان لطيفًا مع غلمانه أعظم اللطف. دعا له النبي ﷺ: اللهم أكثر ماله وولده، وبارك له فيما أعطيته.',
      'استجاب الله الدعاء. عاش أنس 103 سنين، وكان من أغنى الأنصار، ورأى من ولده وولد ولده أكثر من مئة. روى عن النبي ﷺ 2286 حديثًا، فهو ثاني أكثر الصحابة رواية بعد أبي هريرة. توفي بالبصرة سنة 93 هـ، وكان آخر صحابي توفي بها، وفي عمومًا من آخر الصحابة وفاة.',
    ],
    storyEn: [
      "He is Anas ibn Malik ibn al-Nadr al-Ansari al-Khazraji al-Najjari. He was born ten years before the Hijrah. His mother was Umm Sulaym bint Milhan — whose dowry was Islam (see her story). When the Prophet ﷺ emigrated to Madinah, his mother brought him and said: 'O Messenger of Allah, this is Anas, your servant boy, to serve you.' The Prophet ﷺ accepted him. He was ten years old.",
      "He served the Prophet ﷺ a full ten years until the Prophet ﷺ died. Anas said: 'I served the Messenger of Allah ﷺ ten years, and he never said to me for something I did: Why did you do it? Nor for something I did not do: Why did you not do it?' He was the gentlest of people with his servants. The Prophet ﷺ supplicated for him: 'O Allah, increase his wealth and children, and bless him in what You have given him.'",
      "Allah answered the supplication. Anas lived 103 years, was among the wealthiest of the Ansar, and saw of his children and grandchildren more than a hundred. He narrated from the Prophet ﷺ 2,286 hadiths, the second-most prolific Companion after Abu Hurayrah. He died in Basra in 93 AH, the last Companion to die there, and generally among the last of the Companions to die.",
    ],
    virtues: ['خادم رسول الله ﷺ عشر سنين', 'دعا له النبي بطول العمر والمال والولد', 'روى 2286 حديثًا', 'آخر الصحابة بالبصرة'],
    virtuesEn: ['Served the Messenger of Allah ﷺ for ten years', 'The Prophet supplicated for long life, wealth, and children', 'Narrated 2,286 hadiths', 'Last Companion to die in Basra'],
  },

  // ───────────────────── المهاجرون (تكملة) ─────────────────────
  {
    id: 'abu-hurayra',
    nameAr: 'أبو هريرة عبد الرحمن بن صخر الدوسي',
    nameEn: 'Abu Hurayrah Abd al-Rahman ibn Sakhr al-Dawsi',
    category: 'muhajirun',
    brief: 'أكثر الصحابة رواية للحديث، روى عن النبي 5374 حديثًا',
    briefEn: 'Most prolific narrator of hadith, narrating 5,374 hadiths from the Prophet',
    story: [
      'هو عبد الرحمن بن صخر الدوسي من قبيلة دوس باليمن. كني أبا هريرة لأنه كان يحمل هرة صغيرة دائمًا. أسلم على يد الطفيل بن عمرو الدوسي في اليمن قبل الهجرة، ثم هاجر إلى المدينة سنة 7 هـ بعد فتح خيبر.',
      'لازم النبي ﷺ ثلاث سنين فقط — من السنة 7 إلى السنة 11 هـ — لكنه كان من أحرص الناس على العلم. ترك التجارة والكسب وآثر صحبة النبي ﷺ. كان من أهل الصُّفة الذين يعيشون في المسجد على ما يأتيهم من الصدقة. كان دائم الجلوس عند النبي ﷺ، يستمع ويحفظ.',
      'دعا له النبي ﷺ بحفظ العلم. قال أبو هريرة: قلت يا رسول الله، إني أسمع منك حديثًا كثيرًا أنساه. قال: ابسط رداءك. فبسطه، فحدّث ثم قال: ضمّه. فضمّه. قال أبو هريرة: فما نسيتُ شيئًا بعده. روى 5374 حديثًا، فهو أكثر الصحابة رواية. تولى إمارة المدينة في خلافة مروان بن الحكم. توفي بالمدينة سنة 57 أو 58 هـ.',
    ],
    storyEn: [
      "He is Abd al-Rahman ibn Sakhr al-Dawsi of the tribe of Daws in Yemen. He was nicknamed Abu Hurayrah (Father of the Kitten) because he always carried a small kitten. He embraced Islam at the hand of al-Tufayl ibn Amr al-Dawsi in Yemen before the Hijrah, then emigrated to Madinah in 7 AH after the conquest of Khaybar.",
      "He accompanied the Prophet ﷺ only three years — from 7 to 11 AH — but was the most eager of people for knowledge. He left trade and earning and preferred the company of the Prophet ﷺ. He was among the People of al-Suffah who lived in the mosque on charity. He was constantly seated by the Prophet ﷺ, listening and memorising.",
      "The Prophet ﷺ supplicated for him with the memorisation of knowledge. Abu Hurayrah said: 'I said: O Messenger of Allah, I hear from you much hadith and I forget it.' He said: 'Spread out your cloak.' He spread it; the Prophet spoke, then said: 'Wrap it.' He wrapped it. Abu Hurayrah said: 'I have not forgotten anything after it.' He narrated 5,374 hadiths, the most of any Companion. He took the governorship of Madinah in Marwan ibn al-Hakam's caliphate. He died in Madinah in 57 or 58 AH.",
    ],
    virtues: ['أكثر الصحابة رواية للحديث', 'دعا له النبي بحفظ العلم', 'من أهل الصُّفّة', 'لزم النبي ﷺ لطلب العلم'],
    virtuesEn: ['Most prolific narrator of hadith', 'The Prophet supplicated for him with memorisation', 'Of the People of al-Suffah', 'Devoted himself to the Prophet ﷺ for knowledge'],
  },
  {
    id: 'ibn-umar',
    nameAr: 'عبد الله بن عمر',
    nameEn: 'Abdullah ibn Umar',
    category: 'muhajirun',
    brief: 'أعلم الصحابة باتباع السنة، ابن أمير المؤمنين عمر',
    briefEn: 'Most knowledgeable Companion in following the Sunnah, son of the Commander of the Believers Umar',
    story: [
      'هو عبد الله بن عمر بن الخطاب القرشي العدوي. وُلد بمكة قبل البعثة بسنوات قليلة. أسلم مع أبيه عمر وهو صغير. هاجر مع أبيه إلى المدينة وعمره عشر سنين. تربى في بيت عمر، فجمع بين فقه أبيه وملازمة النبي ﷺ.',
      'كان شديد التمسك بالسنة. قال ابن مسعود: أكثرنا اتباعًا لسنة النبي ﷺ عبد الله بن عمر. كان إذا رأى النبي ﷺ يفعل شيئًا في مكان، عمل مثله في نفس المكان حرفًا بحرف. كان يصلي حيث صلى النبي، ويقف حيث وقف، حتى أنه كان يبرك بعيره حيث برك بعير النبي.',
      'روى عن النبي ﷺ 2630 حديثًا. كان من أعلم الصحابة، يلتفّ حوله طلاب العلم. اعتزل الفتنة كلها — لم يبايع عليًا ولا معاوية، ولم يشارك في الجمل ولا صفين. عاش بعد وفاة النبي ﷺ زاهدًا فقيهًا. ندم على ترك بيعة الإمام، وقال: ما آسى على شيء كأسفي على أني لم أقاتل الفئة الباغية كما أمرني الله. توفي بمكة سنة 73 هـ.',
    ],
    storyEn: [
      "He is Abdullah ibn Umar ibn al-Khattab al-Qurashi al-Adawi. He was born in Makkah a few years before the mission. He embraced Islam with his father Umar while young. He emigrated with his father to Madinah at ten years old. He was raised in Umar's house, combining his father's jurisprudence with companionship of the Prophet ﷺ.",
      "He was extremely strict in following the Sunnah. Ibn Mas'ud said: 'The most of us in following the Sunnah of the Prophet ﷺ is Abdullah ibn Umar.' Whenever he saw the Prophet ﷺ do something in a place, he did the same in the same place exactly. He would pray where the Prophet prayed, stand where he stood, even kneel his camel where the Prophet's camel knelt.",
      "He narrated from the Prophet ﷺ 2,630 hadiths. He was among the most knowledgeable Companions, with students of knowledge gathering around him. He withdrew from all the trials — he pledged allegiance neither to Ali nor Mu'awiyah and participated in neither the Camel nor Siffin. He lived after the Prophet's ﷺ death as an ascetic jurist. He regretted leaving the pledge to the Imam and said: 'I regret nothing as much as I regret not having fought the transgressing party as Allah commanded me.' He died in Makkah in 73 AH.",
    ],
    virtues: ['أعلم الصحابة باتباع السنة', 'روى 2630 حديثًا', 'ابن الفاروق عمر', 'زاهد فقيه اعتزل الفتنة'],
    virtuesEn: ['Most knowledgeable Companion in following the Sunnah', 'Narrated 2,630 hadiths', 'Son of al-Faruq Umar', 'Ascetic jurist who withdrew from the trial'],
  },
  {
    id: 'ibn-abbas',
    nameAr: 'عبد الله بن عباس',
    nameEn: 'Abdullah ibn Abbas',
    category: 'muhajirun',
    brief: 'حبر الأمة وترجمان القرآن، ابن عم النبي ﷺ',
    briefEn: 'Scholar of the Ummah and Translator of the Qur\'an, the Prophet\'s ﷺ cousin',
    story: [
      'هو عبد الله بن العباس بن عبد المطلب الهاشمي. ابن عم النبي ﷺ. وُلد قبل الهجرة بثلاث سنين، ومات النبي ﷺ وله 13 سنة. مع صغر عمره، كان من أعلم الصحابة بالقرآن وفقهه، لأن النبي ﷺ دعا له. قال: اللهم فقّهه في الدين، وعلّمه التأويل.',
      'استجاب الله الدعاء. صار ابن عباس من أعلم الناس بتفسير القرآن، حتى لقّبوه بـ ترجمان القرآن و حبر الأمة. كان عمر بن الخطاب يستشيره رغم صغره. يجلس مع كبار الصحابة في مجلس الخلافة، ويأخذ برأيه. قال عنه ابن مسعود: نِعم ترجمان القرآن ابن عباس.',
      'روى عن النبي ﷺ 1660 حديثًا. كان كثير الجلوس مع الصحابة لجمع علومهم. قال: علمت أن العلم لا يجمعه إلا الجد والتقصد، فكنت أبيت على عتبة باب الصحابي حتى يخرج فأسأله. تولى ولاية البصرة لعلي بن أبي طالب. عاش طويلًا، وعمي في آخر حياته. توفي بالطائف سنة 68 هـ.',
    ],
    storyEn: [
      "He is Abdullah ibn al-Abbas ibn Abd al-Muttalib al-Hashimi. The cousin of the Prophet ﷺ. He was born three years before the Hijrah; the Prophet ﷺ died when he was 13. Despite his youth, he was among the most knowledgeable Companions in the Qur'an and its jurisprudence, because the Prophet ﷺ supplicated for him: 'O Allah, grant him understanding in religion and teach him interpretation.'",
      "Allah answered the supplication. Ibn Abbas became the most knowledgeable of people in tafsir of the Qur'an, until they nicknamed him 'Translator of the Qur'an' and 'Scholar of the Ummah.' Umar ibn al-Khattab would consult him despite his youth. He would sit with senior Companions in the caliphate council, and his opinion was taken. Ibn Mas'ud said: 'The best Translator of the Qur'an is Ibn Abbas.'",
      "He narrated from the Prophet ﷺ 1,660 hadiths. He sat frequently with the Companions to gather their knowledge. He said: 'I knew that knowledge could only be gathered through earnestness, so I would spend the night at a Companion's doorstep until he came out and I asked him.' He took the governorship of Basra for Ali ibn Abi Talib. He lived long and went blind at the end of his life. He died in Ta'if in 68 AH.",
    ],
    virtues: ['ترجمان القرآن', 'حبر الأمة', 'دعا له النبي بالعلم والفهم', 'استشاره عمر رغم صغره'],
    virtuesEn: ['Translator of the Qur\'an', 'Scholar of the Ummah', 'The Prophet supplicated for him with knowledge', 'Umar consulted him despite his youth'],
  },
  {
    id: 'jaafar',
    nameAr: 'جعفر بن أبي طالب',
    nameEn: 'Ja\'far ibn Abi Talib',
    category: 'muhajirun',
    brief: 'ذو الجناحين، أشبه الناس بالنبي ﷺ خَلقًا وخُلُقًا',
    briefEn: 'The Two-Winged One, the most similar to the Prophet ﷺ in appearance and character',
    story: [
      'هو جعفر بن أبي طالب بن عبد المطلب الهاشمي. ابن عم النبي ﷺ، وأخو علي بن أبي طالب الأكبر بعشر سنين. أسلم من السابقين الأولين، وهاجر إلى الحبشة في الهجرة الثانية مع جماعة من المسلمين. صار رئيسهم في الحبشة.',
      'لما أرسلت قريش عمرو بن العاص وعبد الله بن أبي ربيعة إلى النجاشي ليردّ المسلمين، كلّمهم النجاشي. فقام جعفر يدافع عنهم بكلامه العظيم. قرأ على النجاشي أول سورة مريم — في قصة عيسى وأمه — فبكى النجاشي والقساوسة. ثم قال للنجاشي: ما يقولون عنا، أنه قال عن عيسى ما لا يحب نسمعه. فقال جعفر بإيمان وثبات: نقول هو عبد الله ورسوله، ابن مريم العذراء البتول. فقبل النجاشي قوله وحمى المسلمين.',
      'بقي جعفر في الحبشة 13 سنة. ثم عاد إلى المدينة سنة 7 هـ بعد فتح خيبر. ففرح به النبي ﷺ فرحًا شديدًا، وقال: ما أدري بأيهما أنا أسرّ، بفتح خيبر أم بقدوم جعفر! ثم استشهد جعفر في غزوة مؤتة سنة 8 هـ، حين قاتل الروم. قُطعت يداه وهو يحمل راية المسلمين. قال النبي ﷺ: إن الله أبدل جعفرًا جناحين يطير بهما في الجنة حيث شاء. فلُقّب جعفر بـ ذي الجناحين.',
    ],
    storyEn: [
      "He is Ja'far ibn Abi Talib ibn Abd al-Muttalib al-Hashimi. The cousin of the Prophet ﷺ and brother of Ali ibn Abi Talib by ten years older. He embraced Islam among the very first and emigrated to Abyssinia in the second emigration with a group of Muslims. He became their leader in Abyssinia.",
      "When Quraysh sent Amr ibn al-As and Abdullah ibn Abi Rabi'ah to the Negus to return the Muslims, the Negus spoke to them. Ja'far rose defending them with his great speech. He recited to the Negus the beginning of Surah Maryam — the story of Jesus and his mother — and the Negus and the bishops wept. The Negus said: 'They say you have said about Jesus what we do not love to hear.' Ja'far said with faith and steadfastness: 'We say he is a servant of Allah and His Messenger, son of the virgin Mary.' The Negus accepted his speech and protected the Muslims.",
      "Ja'far remained in Abyssinia 13 years. He then returned to Madinah in 7 AH after the conquest of Khaybar. The Prophet ﷺ rejoiced greatly at his arrival and said: 'I do not know which makes me happier — the conquest of Khaybar or Ja'far's arrival!' Then Ja'far was martyred at the Battle of Mu'tah in 8 AH while fighting the Romans. His hands were cut off while carrying the Muslims' banner. The Prophet ﷺ said: 'Allah has replaced Ja'far's hands with two wings; he flies with them in Paradise wherever he wishes.' Ja'far was named 'Dhul Janahayn' (the Two-Winged).",
    ],
    virtues: ['ذو الجناحين يطير في الجنة', 'أشبه الناس بالنبي ﷺ', 'أمير المسلمين في الحبشة', 'استشهد في مؤتة'],
    virtuesEn: ['The Two-Winged who flies in Paradise', 'The most similar to the Prophet ﷺ', 'Leader of the Muslims in Abyssinia', 'Martyred at Mu\'tah'],
  },
  {
    id: 'zayd-haritha',
    nameAr: 'زيد بن حارثة',
    nameEn: 'Zayd ibn Harithah',
    category: 'muhajirun',
    brief: 'مولى رسول الله، الوحيد المسمى في القرآن من الصحابة',
    briefEn: 'Freed slave of the Messenger of Allah, the only Companion named in the Qur\'an',
    story: [
      'هو زيد بن حارثة بن شراحيل الكلبي. وُلد في الجاهلية في قبيلة كلب. سُبي وهو صغير في غارة بين القبائل، وبيع عبدًا. اشترته خديجة بنت خويلد، وأهدته للنبي ﷺ قبل البعثة. أعتقه النبي ﷺ.',
      'بحث أبوه حارثة عنه سنين، حتى علم مكانه عند النبي ﷺ. جاء يطلبه. خيّره النبي ﷺ بين أن يبقى معه أو يذهب مع أبيه. اختار زيد البقاء مع النبي ﷺ — قبل البعثة! قال: ما كنت لأختار عليك أحدًا أبدًا. تبنّاه النبي ﷺ، فكان يُدعى زيد بن محمد، حتى نزل قوله تعالى: ادعوهم لآبائهم. فرجع إلى اسم أبيه الحقيقي.',
      'كان زيد من أحب الناس إلى النبي ﷺ. أمّره النبي ﷺ على غزوات كثيرة، وكان رابع من أسلم — بعد خديجة وعلي وأبي بكر. ذكره الله في القرآن باسمه، فهو الصحابي الوحيد المسمى صراحة في القرآن: فلما قضى زيد منها وطرًا زوجناكها. استشهد زيد في غزوة مؤتة سنة 8 هـ قائدًا للجيش الإسلامي. كان أول قتلى المؤمنين في تلك المعركة.',
    ],
    storyEn: [
      "He is Zayd ibn Harithah ibn Sharahil al-Kalbi. He was born in the Jahiliyyah in the tribe of Kalb. He was captured young in a raid between tribes and sold as a slave. Khadijah bint Khuwaylid bought him and gave him as a gift to the Prophet ﷺ before the mission. The Prophet ﷺ freed him.",
      "His father Harithah searched for him for years until he learned of his place with the Prophet ﷺ. He came to claim him. The Prophet ﷺ gave Zayd the choice between staying with him or going with his father. Zayd chose to stay with the Prophet ﷺ — before the mission! He said: 'I would never choose anyone over you.' The Prophet ﷺ adopted him, and he came to be called Zayd ibn Muhammad, until Allah's words came down: 'Call them by their fathers.' He returned to his real father's name.",
      "Zayd was among the most beloved of people to the Prophet ﷺ. The Prophet ﷺ appointed him over many campaigns, and he was the fourth to embrace Islam — after Khadijah, Ali, and Abu Bakr. Allah mentioned him by name in the Qur'an, making him the only Companion explicitly named: 'When Zayd had no further need of her, We married her to you.' Zayd was martyred at the Battle of Mu'tah in 8 AH as commander of the Muslim army. He was the first of the believers killed in that battle.",
    ],
    virtues: ['الصحابي الوحيد المسمى في القرآن', 'مولى رسول الله ﷺ', 'رابع من أسلم', 'استشهد في مؤتة قائدًا'],
    virtuesEn: ['Only Companion named in the Qur\'an', 'Freed slave of the Messenger of Allah ﷺ', 'Fourth to embrace Islam', 'Martyred at Mu\'tah as commander'],
  },

  // ───────────────────── بنات النبي ﷺ ─────────────────────
  {
    id: 'fatima',
    nameAr: 'فاطمة الزهراء',
    nameEn: 'Fatimah al-Zahra\'',
    category: 'daughters',
    brief: 'سيدة نساء أهل الجنة، بنت رسول الله ﷺ، زوج علي وأم الحسن والحسين',
    briefEn: 'Lady of the women of Paradise, daughter of the Messenger of Allah ﷺ, wife of Ali, mother of Hasan and Husayn',
    story: [
      'هي فاطمة بنت محمد بن عبد الله ﷺ. وُلدت بمكة قبل البعثة بخمس سنوات، أصغر بنات النبي ﷺ من خديجة. لُقّبت بـ الزهراء، و البتول، و سيدة نساء العالمين، و أم أبيها.',
      'تزوجها علي بن أبي طالب ابن عم النبي ﷺ في السنة الثانية من الهجرة. كان مهرها درعًا اشتراها بأربعمئة درهم. عاشت معه حياة فقر وكرامة، تطحن القمح بيدها حتى مجلت يداها، وتسقي الماء حتى أثّر القربة على صدرها. سألت أباها النبي ﷺ خادمًا، فعلّمها بدل الخادم تسبيحة فاطمة المشهورة: سبحان الله 33 مرة، الحمد لله 33 مرة، الله أكبر 34 مرة، عند النوم.',
      'كانت أحب الناس إلى النبي ﷺ. كان إذا قدم من سفر، بدأ بها قبل غيره. كان يقبّل يدها ويجلسها بجواره. قال النبي ﷺ: فاطمة سيدة نساء أهل الجنة. وقال: فاطمة بضعة مني، من آذاها فقد آذاني. أنجبت للنبي ﷺ ذريّته الباقية: الحسن، الحسين، زينب، أم كلثوم.',
      'كانت أول أهل بيت النبي ﷺ يلحق به بعد وفاته. مرضت بعد وفاته بستة أشهر فقط، وتوفيت سنة 11 هـ، وعمرها 28 أو 29 سنة. كانت قد بشّرها النبي ﷺ قبل موته بأنها أول أهله لحاقًا به. غسّلتها أسماء بنت عميس، ودفنها علي بن أبي طالب ليلًا بالبقيع.',
    ],
    storyEn: [
      "She is Fatimah bint Muhammad ibn Abdullah ﷺ. She was born in Makkah five years before the mission, the youngest of the Prophet's ﷺ daughters from Khadijah. She was nicknamed al-Zahra (the Radiant), al-Batul (the Pure), Sayyidat Nisa al-Alamin (Lady of the Women of the Worlds), and Umm Abiha (Mother of her Father).",
      "Ali ibn Abi Talib, the Prophet's ﷺ cousin, married her in the second year of the Hijrah. Her dowry was a coat of mail he bought for four hundred dirhams. She lived with him a life of poverty and dignity, grinding wheat with her hand until her hands blistered, drawing water until the waterskin marked her chest. She asked her father the Prophet ﷺ for a servant; he taught her instead the famous Tasbih of Fatimah: SubhanAllah 33 times, Alhamdulillah 33 times, Allahu Akbar 34 times, at bedtime.",
      "She was the most beloved of people to the Prophet ﷺ. When he returned from travel, he would begin with her before others. He would kiss her hand and seat her beside him. The Prophet ﷺ said: 'Fatimah is the lady of the women of Paradise.' He said: 'Fatimah is a part of me; whoever harms her has harmed me.' She bore the Prophet's ﷺ remaining offspring: Hasan, Husayn, Zaynab, Umm Kulthum.",
      "She was the first of the Prophet's ﷺ household to follow him after his death. She fell ill only six months after his death and died in 11 AH at 28 or 29 years old. The Prophet ﷺ had given her glad tidings before his death that she would be the first of his household to follow him. Asma' bint Umays washed her, and Ali ibn Abi Talib buried her at night in al-Baqi'.",
    ],
    virtues: ['سيدة نساء أهل الجنة', 'بنت رسول الله ﷺ', 'زوج علي وأم الحسنين', 'أول أهل البيت لحاقًا بالنبي'],
    virtuesEn: ['Lady of the women of Paradise', 'Daughter of the Messenger of Allah ﷺ', 'Wife of Ali and mother of Hasan and Husayn', 'First of the Prophet\'s household to follow him'],
  },
  {
    id: 'zaynab-prophet',
    nameAr: 'زينب بنت رسول الله',
    nameEn: 'Zaynab bint Rasulillah',
    category: 'daughters',
    brief: 'كبرى بنات النبي ﷺ، التي قال عنها: خير بناتي',
    briefEn: 'Eldest daughter of the Prophet ﷺ, of whom he said: "The best of my daughters"',
    story: [
      'هي زينب بنت محمد بن عبد الله ﷺ. كبرى بنات النبي ﷺ من خديجة. وُلدت قبل البعثة بعشر سنين. تزوجها قبل البعثة ابن خالتها أبو العاص بن الربيع، وكان رجلًا كريمًا تاجرًا، لكنه لم يسلم في البداية.',
      'لما هاجر النبي ﷺ إلى المدينة، بقيت زينب مع زوجها في مكة. شارك أبو العاص في غزوة بدر مع المشركين، فأُسر. أرسلت زينب فدية له، وأرسلت قلادة لأمها خديجة. لما رأى النبي ﷺ القلادة، رقّ لها، وردّ الفدية وأطلق سراح أبي العاص. اشترط النبي ﷺ أن يرسل زينب إلى المدينة، فأرسلها.',
      'في طريقها من مكة إلى المدينة، اعترضها هبار بن الأسود وضربها بالرمح فأسقطت جنينها. ماتت بعد ذلك بسنين من آثار تلك الضربة. أسلم زوجها أبو العاص بعد فتح مكة، فردّ النبي ﷺ زينب إليه. لم تعش طويلًا بعد ذلك. توفيت سنة 8 هـ في المدينة، فحزن عليها النبي ﷺ حزنًا شديدًا.',
    ],
    storyEn: [
      "She is Zaynab bint Muhammad ibn Abdullah ﷺ. The eldest of the Prophet's ﷺ daughters from Khadijah. She was born ten years before the mission. Before the mission she married her maternal cousin Abu al-As ibn al-Rabi, a generous merchant who did not initially embrace Islam.",
      "When the Prophet ﷺ emigrated to Madinah, Zaynab stayed with her husband in Makkah. Abu al-As participated in the Battle of Badr with the polytheists and was captured. Zaynab sent ransom for him along with a necklace for her mother Khadijah. When the Prophet ﷺ saw the necklace, he was moved; he returned the ransom and freed Abu al-As. The Prophet ﷺ stipulated that he send Zaynab to Madinah, which he did.",
      "On her way from Makkah to Madinah, Habbar ibn al-Aswad intercepted her and struck her with a spear; she miscarried. She died years later from the effects of that blow. Her husband Abu al-As embraced Islam after the conquest of Makkah, and the Prophet ﷺ returned Zaynab to him. She did not live long after that. She died in 8 AH in Madinah, and the Prophet ﷺ grieved deeply for her.",
    ],
    virtues: ['كبرى بنات النبي ﷺ', 'صبرت على فراق زوجها في مكة', 'تحملت ضربة هبار في الهجرة', 'قال النبي عنها: خير بناتي'],
    virtuesEn: ['Eldest daughter of the Prophet ﷺ', 'Endured separation from her husband in Makkah', 'Bore Habbar\'s blow during the emigration', 'The Prophet said: "The best of my daughters"'],
  },
  {
    id: 'ruqayyah',
    nameAr: 'رقية بنت رسول الله',
    nameEn: 'Ruqayyah bint Rasulillah',
    category: 'daughters',
    brief: 'زوج عثمان بن عفان، هاجرت إلى الحبشة مرتين',
    briefEn: 'Wife of Uthman ibn Affan, emigrated to Abyssinia twice',
    story: [
      'هي رقية بنت محمد بن عبد الله ﷺ. ثانية بنات النبي ﷺ من خديجة. وُلدت بمكة قبل البعثة بسبع سنوات. كانت من أجمل نساء قريش. خطبها قبل البعثة عتبة بن أبي لهب، ابن عم النبي ﷺ، لكن لما نزلت سورة المسد في أبيه أبي لهب، طلّقها قبل البناء بها.',
      'تزوجها عثمان بن عفان بعد إسلامه. كانا من أوائل المسلمين. هاجرا معًا إلى الحبشة في الهجرة الأولى — أول رجل وامرأة هاجرا في الإسلام. قال النبي ﷺ لما خرجا: إنهما أول أهل بيت هاجر بعد لوط. كانت قصتهما إيمان كامل وزواج مبارك.',
      'هاجرت إلى المدينة مع زوجها. مرضت قبل غزوة بدر. تأخر عثمان عن الغزوة ليرعاها بأمر النبي ﷺ. ماتت في يوم وقعة بدر سنة 2 هـ، فعاد عثمان حزينًا، لكن النبي ﷺ ضرب له بسهم من غنائم بدر وأجر. ثم زوّج النبي ﷺ عثمان بأختها أم كلثوم بعد ذلك. لذلك لُقّب عثمان بذي النورين.',
    ],
    storyEn: [
      "She is Ruqayyah bint Muhammad ibn Abdullah ﷺ. The second of the Prophet's ﷺ daughters from Khadijah. She was born in Makkah seven years before the mission. She was among the most beautiful women of Quraysh. Utbah ibn Abi Lahab, the Prophet's ﷺ cousin, was engaged to her before the mission, but when Surah al-Masad was revealed about his father Abu Lahab, he divorced her before consummation.",
      "Uthman ibn Affan married her after his Islam. They were both among the early Muslims. They emigrated together to Abyssinia in the first emigration — the first man and woman to emigrate in Islam. The Prophet ﷺ said when they went out: 'They are the first family to emigrate after Lot.' Their story was complete faith and a blessed marriage.",
      "She emigrated to Madinah with her husband. She fell ill before the Battle of Badr. Uthman stayed behind from the battle to care for her by the Prophet's ﷺ order. She died on the day of Badr in 2 AH; Uthman returned grieving, but the Prophet ﷺ allotted him a share of Badr's spoils and reward. The Prophet ﷺ then married Uthman to her sister Umm Kulthum. That is why Uthman was nicknamed Dhu al-Nurayn (Possessor of the Two Lights).",
    ],
    virtues: ['زوج عثمان بن عفان', 'هاجرت إلى الحبشة مرتين', 'أول من هاجر بأهله بعد لوط', 'ماتت يوم بدر'],
    virtuesEn: ['Wife of Uthman ibn Affan', 'Emigrated to Abyssinia twice', 'First to emigrate with family after Lot', 'Died on the day of Badr'],
  },
  {
    id: 'umm-kulthum-daughter',
    nameAr: 'أم كلثوم بنت رسول الله',
    nameEn: 'Umm Kulthum bint Rasulillah',
    category: 'daughters',
    brief: 'ثالثة بنات النبي ﷺ، تزوجها عثمان بعد أختها رقية',
    briefEn: 'Third daughter of the Prophet ﷺ, married by Uthman after her sister Ruqayyah',
    story: [
      'هي أم كلثوم بنت محمد بن عبد الله ﷺ. ثالثة بنات النبي ﷺ من خديجة. وُلدت بمكة قبل البعثة بست سنين. خطبها قبل البعثة عتيبة بن أبي لهب — أخو عتبة الذي خطب رقية — وعندما نزلت سورة المسد في أبيه، طلّقها قبل البناء بها.',
      'بقيت في بيت أبيها سنين، حتى توفيت أختها رقية يوم بدر. زوّجها النبي ﷺ من عثمان بن عفان سنة 3 هـ. قال النبي ﷺ: لو كان عندي ثالثة لزوّجتك إياها يا عثمان. كانت أم كلثوم من الصابرات الصالحات، تشبه أختها رقية في خلقها ودينها.',
      'عاشت مع عثمان ست سنين تقريبًا. توفيت سنة 9 هـ في المدينة، ولم تنجب أولادًا. صلى عليها النبي ﷺ ودفنها بالبقيع، وحزن عليها حزنًا شديدًا. بقيت من بناته بعد ذلك فاطمة الزهراء فقط. مات النبي ﷺ ولم تبق له من ذريته إلا فاطمة، التي ماتت بعده بستة أشهر، ومن نسلها بقي ذريّته كلها — الحسن والحسين ومن بعدهما.',
    ],
    storyEn: [
      "She is Umm Kulthum bint Muhammad ibn Abdullah ﷺ. The third of the Prophet's ﷺ daughters from Khadijah. She was born in Makkah six years before the mission. Before the mission Utaybah ibn Abi Lahab — brother of Utbah who was engaged to Ruqayyah — was engaged to her. When Surah al-Masad was revealed about his father, he divorced her before consummation.",
      "She remained in her father's house for years, until her sister Ruqayyah died on the day of Badr. The Prophet ﷺ married her to Uthman ibn Affan in 3 AH. The Prophet ﷺ said: 'If I had a third, I would have married her to you, Uthman.' Umm Kulthum was among the patient and righteous, resembling her sister Ruqayyah in character and religion.",
      "She lived with Uthman about six years. She died in 9 AH in Madinah, leaving no children. The Prophet ﷺ prayed over her and buried her in al-Baqi', and grieved deeply for her. Of his daughters only Fatimah al-Zahra remained after that. The Prophet ﷺ died with only Fatimah remaining of his offspring; she died six months after him, and through her line all his descendants remain — Hasan, Husayn, and those after them.",
    ],
    virtues: ['ثالثة بنات النبي ﷺ', 'زوج عثمان ذي النورين بعد رقية', 'صبرت على فقد أختها', 'دفنت بالبقيع'],
    virtuesEn: ['Third daughter of the Prophet ﷺ', 'Wife of Uthman Dhu al-Nurayn after Ruqayyah', 'Endured the loss of her sister', 'Buried in al-Baqi\''],
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
  const s = useScaledStyles(_s, colors.fs);
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.categoryTab,
        {
          backgroundColor: isActive
            ? ACCENT
            : colors.card,
          borderColor: isActive ? ACCENT : 'transparent',
        },
      ]}
    >
      <MaterialCommunityIcons
        name={category.icon}
        size={16}
        color={isActive ? '#fff' : colors.icon}
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

function getCompanionAudioTitle(companion: Companion): string {
  return getCompanionName(companion);
}

function getCompanionTranscript(companion: Companion): string {
  const lang = getLanguage();
  if (lang === 'ar') {
    const transcript = companion.transcript?.trim() || '';
    const storyText = companion.story.join('\n\n').trim();
    return transcript.length >= storyText.length ? transcript : storyText;
  }
  const transcript = companion.transcriptEn?.trim() || '';
  const storyText = companion.storyEn.join('\n\n').trim();
  return transcript.length >= storyText.length ? transcript : storyText;
}

function getListenCopy() {
  const lang = getLanguage();
  return lang === 'ar'
    ? {
        title: 'استمع للقصة',
        subtitle: 'صوت القصة مع النص',
        open: 'فتح صفحة الاستماع',
        noAudio: 'لم يتم إضافة ملف الصوت بعد',
        noAudioHint: 'الصوت غير متاح لهذه القصة حاليًا.',
        loadingAudioTitle: 'جاري تحميل الصوت',
        loadingAudioBody: 'انتظر لحظات، سيتم تشغيل القصة تلقائيًا.',
        noInternetTitle: 'لا يوجد اتصال بالإنترنت',
        noInternetBody: 'الصوت غير محمل على الجهاز. اتصل بالإنترنت للتشغيل أو حمّله مسبقًا للاستماع أوفلاين.',
        audioErrorTitle: 'تعذر تشغيل الصوت',
        audioErrorBody: 'استغرق تحميل الصوت وقتًا طويلًا. تحقق من الاتصال ثم حاول مرة أخرى.',
        retry: 'حاول مرة أخرى',
        close: 'إغلاق',
        download: 'تحميل',
        downloading: 'جاري التحميل',
        downloaded: 'محمل',
        downloadFailed: 'تعذر تحميل الصوت. تحقق من الاتصال ثم حاول مرة أخرى.',
        play: 'تشغيل',
        pause: 'إيقاف مؤقت',
        transcript: 'نص القصة',
        audioSource: 'الصوت',
      }
    : {
        title: 'Listen to the story',
        subtitle: 'Story audio with text',
        open: 'Open listening page',
        noAudio: 'No audio file has been added yet',
        noAudioHint: 'Audio is not available for this story yet.',
        loadingAudioTitle: 'Loading audio',
        loadingAudioBody: 'Please wait. The story will start automatically.',
        noInternetTitle: 'No internet connection',
        noInternetBody: 'This audio is not downloaded on this device. Connect to play it, or download it first for offline listening.',
        audioErrorTitle: 'Audio could not be played',
        audioErrorBody: 'Audio loading took too long. Check your connection and try again.',
        retry: 'Try again',
        close: 'Close',
        download: 'Download',
        downloading: 'Downloading',
        downloaded: 'Downloaded',
        downloadFailed: 'Audio could not be downloaded. Check your connection and try again.',
        play: 'Play',
        pause: 'Pause',
        transcript: 'Story text',
        audioSource: 'Audio',
      };
}

function AudioStatusModal({
  visible,
  mode,
  colors,
  onRetry,
  onClose,
}: {
  visible: boolean;
  mode: 'loading' | 'offline' | 'error';
  colors: ReturnType<typeof useColors>;
  onRetry: () => void;
  onClose: () => void;
}) {
  const copy = getListenCopy();
  const s = useScaledStyles(_s, colors.fs);
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const isLoading = mode === 'loading';
  const title = isLoading ? copy.loadingAudioTitle : mode === 'offline' ? copy.noInternetTitle : copy.audioErrorTitle;
  const body = isLoading ? copy.loadingAudioBody : mode === 'offline' ? copy.noInternetBody : copy.audioErrorBody;
  const icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = isLoading ? 'headphones' : mode === 'offline' ? 'wifi-off' : 'alert-circle-outline';
  const tint = mode === 'offline' ? '#f59e0b' : mode === 'error' ? '#ef4444' : ACCENT;
  const cardBg = colors.isDarkMode ? ModalColors.cardDark : ModalColors.cardLight;
  const iconBg = colors.isDarkMode ? 'rgba(6,79,47,0.16)' : 'rgba(6,79,47,0.12)';

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[s.modalOverlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View
          style={[
            s.modalCard,
            {
              backgroundColor: cardBg,
              borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <View style={[s.modalIconCircle, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={icon} size={42} color={tint} />
          </View>
          {isLoading && <ActivityIndicator size="large" color={tint} style={s.modalSpinner} />}
          <Text style={[s.modalTitle, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
          <Text style={[s.modalBody, { color: colors.textLight, textAlign: 'center' }]}>{body}</Text>
          {isLoading ? (
            <Pressable
              onPress={onClose}
              // Centered pill (flex:0 so it never stretches on the column's
              // vertical axis; not full-width so it reads as clearly inside the
              // card). flex:1 only belongs to the row-laid error actions below.
              style={[s.modalButton, s.modalButtonSecondary, { borderColor: colors.textLight, flex: 0, alignSelf: 'center', paddingHorizontal: 40, marginTop: 4 }]}
            >
              <Text style={[s.modalButtonText, { color: colors.text }]}>{copy.close}</Text>
            </Pressable>
          ) : (
            <View style={[s.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable onPress={onClose} style={[s.modalButton, s.modalButtonSecondary, { borderColor: colors.textLight }]}>
                <Text style={[s.modalButtonText, { color: colors.text }]}>{copy.close}</Text>
              </Pressable>
              <Pressable onPress={onRetry} style={[s.modalButton, s.modalButtonPrimary]}>
                <Text style={[s.modalButtonText, { color: '#fff' }]}>{copy.retry}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function CompanionCard({ companion, onPress, isDarkMode, colors }: CompanionCardProps) {
  const isRTL = useIsRTL();
  const s = useScaledStyles(_s, colors.fs);
  return (
    <Pressable onPress={onPress} style={s.cardOuter}>
      <BlurView
       
        intensity={Platform.OS === 'ios' ? 25 : 10}
        tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
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
              ? 'rgba(255,255,255,0.60)'
              : 'rgba(0,0,0,0.10)',
          },
        ]}
      />
      <View style={[s.cardContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[s.cardAvatar, { backgroundColor: ACCENT_LIGHT }]}>
          <MaterialCommunityIcons name="account" size={24} color={colors.text} />
        </View>
        <View style={s.cardTextWrap}>
          <Text style={[s.cardName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
            <TranslatedText from="en" type="section" style={[s.cardBrief, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>
              {companion.briefEn}
            </TranslatedText>
          )}
        </View>
        <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={colors.textLight} />
      </View>
    </Pressable>
  );
}

interface StoryListeningProps {
  companion: Companion;
  onBack: () => void;
  onToggleFav?: () => void;
  isFav?: boolean;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}

function StoryListening({ companion, onBack, onToggleFav, isFav = false, isDarkMode, colors }: StoryListeningProps) {
  const isRTL = useIsRTL();
  const s = useScaledStyles(_s, colors.fs);
  const copy = getListenCopy();
  const transcript = useMemo(() => getCompanionTranscript(companion), [companion]);
  const audioTitle = getCompanionAudioTitle(companion);
  const {
    state: globalAudioState,
    playAzkarQueue,
    togglePlayPause: toggleGlobalAudio,
    seekTo: seekGlobalAudio,
    playbackSpeed,
    setPlaybackSpeed,
  } = useGlobalAudio();
  const finishAdShownRef = useRef(false);
  const prePlayAdShownRef = useRef(false);
  const prePlayAdDisplayedRef = useRef(false);
  const [networkState, setNetworkState] = useState<'checking' | 'online' | 'offline'>('checking');
  const [audioResolveState, setAudioResolveState] = useState<'idle' | 'resolving' | 'ready' | 'error'>('idle');
  const [audioAttempted, setAudioAttempted] = useState(false);
  const [audioStartError, setAudioStartError] = useState(false);
  const [audioModalDismissed, setAudioModalDismissed] = useState(false);
  const [audioDownloadState, setAudioDownloadState] = useState<'idle' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [audioDownloadError, setAudioDownloadError] = useState<string | null>(null);
  const [savedResume, setSavedResume] = useState<AudioResumeEntry | null>(null);
  const [resumePromptVisible, setResumePromptVisible] = useState(false);
  const pendingResumeRef = useRef<AudioResumeEntry | null>(null);
  // Position to begin playback from, applied only AFTER the resume prompt has
  // fully dismissed — see handleResumePromptDismissed (prevents the iOS
  // modal-handoff freeze).
  const pendingPlaybackRef = useRef<number | null>(null);
  const hasAudio = !!companion.audioUrl?.trim();
  const trackId = useMemo(() => `companion-story-${companion.id}`, [companion.id]);
  const isThisStoryAudio = globalAudioState.source === 'azkar' && globalAudioState.currentTrackId === trackId;
  const isPlaying = isThisStoryAudio && globalAudioState.isPlaying;
  const currentPosition = isThisStoryAudio ? globalAudioState.position : 0;
  const duration = isThisStoryAudio ? globalAudioState.duration : 0;
  const isResolvingAudio = audioResolveState === 'resolving'
    || (isThisStoryAudio && globalAudioState.isLoading && !isPlaying && currentPosition === 0);
  const canSeekAudio = isThisStoryAudio && duration > 0 && !isResolvingAudio;
  const {
    displayPosition,
    sliderPosition,
    handleSeekStart,
    handleSeekChange,
    handleSeekComplete,
  } = useAudioSeekPreview({
    currentPosition,
    duration,
    canSeek: canSeekAudio,
    isCurrentTrack: isThisStoryAudio,
    resetKey: trackId,
    seekTo: seekGlobalAudio,
  });
  const formattedPosition = formatAudioTime(displayPosition);
  const formattedDuration = formatAudioTime(duration);

  const checkConnection = useCallback(async () => {
    setAudioModalDismissed(false);
    setNetworkState('checking');
    const net = await NetInfo.fetch().catch(() => null);
    const offline = !net || net.isConnected === false || net.isInternetReachable === false;
    setNetworkState(offline ? 'offline' : 'online');
  }, []);

  useEffect(() => {
    checkConnection();
    const unsubscribe = NetInfo.addEventListener((net) => {
      const offline = net.isConnected === false || net.isInternetReachable === false;
      setNetworkState(offline ? 'offline' : 'online');
      if (!offline) setAudioModalDismissed(false);
    });
    return () => unsubscribe();
  }, [checkConnection]);

  useEffect(() => {
    finishAdShownRef.current = false;
    prePlayAdShownRef.current = false;
    prePlayAdDisplayedRef.current = false;
    setAudioResolveState('idle');
    setAudioAttempted(false);
    setAudioStartError(false);
    setAudioModalDismissed(false);
    setAudioDownloadState('idle');
    setAudioDownloadError(null);
    if (companion.audioUrl) {
      isStoryAudioCached(companion.id, companion.audioUrl)
        .then((cached) => {
          setAudioDownloadState(cached ? 'downloaded' : 'idle');
        })
        .catch(() => {});
    }
  }, [companion.id, companion.audioUrl]);

  // Per-companion durable resume position for the inline hint. Refreshed when
  // this story stops being the live track so the hint reflects what is stored.
  useEffect(() => {
    if (isThisStoryAudio) return;
    let cancelled = false;
    getSavedPlaybackProgress(trackId)
      .then((entry) => {
        if (!cancelled) setSavedResume(entry);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [trackId, isThisStoryAudio]);

  const handleTrackComplete = useCallback(() => {
    if (finishAdShownRef.current) return;
    if (prePlayAdDisplayedRef.current) return;
    finishAdShownRef.current = true;
    showInterstitial({
      allowInSacredContext: false,
      ignoreSmartFrequencyCaps: true,
      ignoreSmartSessionDelay: true,
      ignoreGlobalCooldown: true,
      timeoutMs: 5000,
    }).catch(() => {});
  }, []);

  const resolveAudioForPlayback = useCallback(async () => {
    if (!companion.audioUrl) throw new Error('missing-audio-url');
    setAudioResolveState('resolving');
    const prepared = await prepareStoryAudio(companion.id, companion.audioUrl);
    setAudioResolveState('ready');
    if (prepared.isLocal) {
      setAudioDownloadState('downloaded');
    }
    return prepared;
  }, [companion.audioUrl, companion.id]);

  const hasAudioError = audioAttempted && (audioResolveState === 'error' || audioStartError || (isThisStoryAudio && !!globalAudioState.error));
  const audioStillBuffering = isThisStoryAudio && globalAudioState.isLoading && !isPlaying && currentPosition === 0;
  const isAudioPreparing = audioAttempted && (networkState === 'checking' || audioResolveState === 'resolving' || audioStillBuffering);
  const audioModalMode = networkState === 'offline' ? 'offline' : hasAudioError ? 'error' : 'loading';
  const showAudioModal = !audioModalDismissed && audioAttempted && (isAudioPreparing || networkState === 'offline' || hasAudioError);

  useEffect(() => {
    if (!audioAttempted) return;
    if (isPlaying || currentPosition > 0 || duration > 0) {
      setAudioModalDismissed(true);
    }
  }, [audioAttempted, currentPosition, duration, isPlaying]);

  const startPlayback = useCallback(async (initialPositionMs: number) => {
    try {
      // Resolve/prepare the audio in the background while the ad is on
      // screen, so playback can begin as soon as the ad closes.
      const preparedPromise = resolveAudioForPlayback();
      preparedPromise.catch(() => {}); // rethrown at the await below

      if (!prePlayAdShownRef.current) {
        prePlayAdShownRef.current = true;
        const didShowPrePlayAd = await showInterstitial({
          allowInSacredContext: false,
          ignoreSmartFrequencyCaps: true,
          ignoreSmartSessionDelay: true,
          ignoreGlobalCooldown: true,
          timeoutMs: 5000,
        }).catch(() => {});
        prePlayAdDisplayedRef.current = didShowPrePlayAd === true;
      }

      const prepared = await preparedPromise;
      await playAzkarQueue(
        [{
          id: trackId,
          title: audioTitle,
          subtitle: copy.audioSource,
          url: prepared.uri,
          forceExpoAv: true,
          resumeKey: trackId,
          initialPositionMs,
        }],
        0,
        '/companions',
        { onTrackComplete: handleTrackComplete },
      );
    } catch (audioError) {
      setAudioModalDismissed(false);
      setAudioResolveState('error');
      setAudioStartError(true);
      console.log('Companion story audio playback failed', audioError);
    }
  }, [
    audioTitle,
    copy.audioSource,
    handleTrackComplete,
    playAzkarQueue,
    resolveAudioForPlayback,
    trackId,
  ]);

  const handlePlayPress = useCallback(async () => {
    setAudioAttempted(true);
    setAudioModalDismissed(false);
    setAudioStartError(false);

    const hasStartedCurrentAudio = isThisStoryAudio && (isPlaying || currentPosition > 0 || duration > 0);
    const cachedLocally = await isStoryAudioCached(companion.id, companion.audioUrl || '');
    if (cachedLocally) {
      setAudioDownloadState('downloaded');
    }

    if (!cachedLocally && !hasStartedCurrentAudio) {
      const net = await NetInfo.fetch().catch(() => null);
      const offline = !net || net.isConnected === false || net.isInternetReachable === false;
      setNetworkState(offline ? 'offline' : 'online');
      if (offline) return;
    } else {
      setNetworkState('online');
    }

    if (hasStartedCurrentAudio && !globalAudioState.isLoading) {
      await toggleGlobalAudio();
      return;
    }

    // Fresh start of this story: check the durable resume position first.
    // Read from storage (not component state) so the decision is never stale.
    const saved = await getSavedPlaybackProgress(trackId).catch(() => null);
    if (shouldOfferResume(saved)) {
      pendingResumeRef.current = saved;
      setSavedResume(saved);
      setResumePromptVisible(true);
      return;
    }

    // Too early to matter or practically finished — restart silently.
    if (saved) {
      clearPlaybackProgress(trackId).catch(() => {});
      setSavedResume(null);
    }
    await startPlayback(0);
  }, [
    companion.audioUrl,
    companion.id,
    currentPosition,
    duration,
    globalAudioState.isLoading,
    isPlaying,
    isThisStoryAudio,
    startPlayback,
    toggleGlobalAudio,
    trackId,
  ]);

  // Resume/restart only *record the intent* and close the prompt. Playback —
  // which presents the loading/status modal — is started from the prompt's
  // onDismiss, so the two native modals never transition in the same commit.
  const handleResumeChoice = useCallback(() => {
    const saved = pendingResumeRef.current;
    pendingResumeRef.current = null;
    pendingPlaybackRef.current = saved ? saved.positionMs : 0;
    setResumePromptVisible(false);
  }, []);

  const handleRestartChoice = useCallback(() => {
    pendingResumeRef.current = null;
    setSavedResume(null);
    clearPlaybackProgress(trackId).catch(() => {});
    pendingPlaybackRef.current = 0;
    setResumePromptVisible(false);
  }, [trackId]);

  const dismissResumePrompt = useCallback(() => {
    pendingResumeRef.current = null;
    pendingPlaybackRef.current = null;
    setResumePromptVisible(false);
  }, []);

  const handleResumePromptDismissed = useCallback(() => {
    const startAt = pendingPlaybackRef.current;
    pendingPlaybackRef.current = null;
    if (startAt != null) startPlayback(startAt);
  }, [startPlayback]);

  const handleDownloadAudio = useCallback(async () => {
    if (!companion.audioUrl || audioDownloadState === 'downloading') return;

    setAudioDownloadError(null);

    const cachedLocally = await isStoryAudioCached(companion.id, companion.audioUrl);
    if (cachedLocally) {
      setAudioDownloadState('downloaded');
      return;
    }

    const net = await NetInfo.fetch().catch(() => null);
    const offline = !net || net.isConnected === false || net.isInternetReachable === false;
    setNetworkState(offline ? 'offline' : 'online');
    if (offline) {
      setAudioAttempted(true);
      setAudioModalDismissed(false);
      return;
    }

    setAudioDownloadState('downloading');
    const didShowPreDownloadAd = await showInterstitial({
      force: true,
      allowInSacredContext: true,
      ignoreSmartFrequencyCaps: true,
      ignoreSmartSessionDelay: true,
      ignoreGlobalCooldown: true,
      timeoutMs: 12000,
    }).catch(() => false);

    try {
      setAudioDownloadState('downloading');
      await downloadStoryAudio(companion.id, companion.audioUrl);
      setAudioDownloadState('downloaded');
      if (didShowPreDownloadAd !== true) {
        showInterstitial({
          force: true,
          allowInSacredContext: true,
          ignoreSmartFrequencyCaps: true,
          ignoreSmartSessionDelay: true,
          ignoreGlobalCooldown: true,
          timeoutMs: 12000,
        }).catch(() => {});
      }
    } catch (downloadError) {
      setAudioDownloadState('error');
      setAudioDownloadError(copy.downloadFailed);
      console.log('Companion story audio download failed', downloadError);
    }
  }, [
    audioDownloadState,
    companion.audioUrl,
    companion.id,
    copy.downloadFailed,
  ]);

  return (
    <View style={s.detailContainer}>
      <UniversalHeader
        onBack={onBack}
        backStyle={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', borderRadius: 14 }}
        rightActions={onToggleFav ? [{
          icon: isFav ? 'bookmark' : 'bookmark-outline',
          onPress: onToggleFav,
          color: isFav ? colors.primary : colors.text,
          size: 22,
          style: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
        }] : []}
      >
        <Text style={[s.detailHeaderTitle, { color: colors.text }]} numberOfLines={2}>
          {getCompanionName(companion)}
        </Text>
      </UniversalHeader>

      <ScrollView
        style={s.detailScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listenPageContent}
      >
        <ContentLanguageNotice />
        {hasAudio && <View style={s.audioPanelOuter}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 25 : 10}
            tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.audioPanelOverlay,
              {
                backgroundColor: isDarkMode ? 'rgba(6,79,47,0.16)' : 'rgba(6,79,47,0.08)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          />
          <View style={s.audioPanelContent}>
            <View style={[s.audioTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[s.listenEntryIcon, { backgroundColor: ACCENT }]}>
                <MaterialCommunityIcons name="headphones" size={24} color="#fff" />
              </View>
              <View style={s.listenEntryText}>
                <Text style={[s.listenEntryTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {audioTitle}
                </Text>
                <Text style={[s.listenEntrySubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {copy.audioSource}
                </Text>
              </View>
              <Pressable
                onPress={handleDownloadAudio}
                disabled={audioDownloadState === 'downloading' || audioDownloadState === 'downloaded'}
                style={[s.audioDownloadButton, audioDownloadState === 'downloaded' && s.audioDownloadButtonDone]}
                accessibilityRole="button"
                accessibilityLabel={copy.download}
              >
                {audioDownloadState === 'downloading' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name={audioDownloadState === 'downloaded' ? 'check' : 'download'} size={16} color="#fff" />
                )}
                <Text style={s.audioDownloadButtonText} numberOfLines={1}>
                  {audioDownloadState === 'downloading'
                    ? copy.downloading
                    : audioDownloadState === 'downloaded'
                      ? copy.downloaded
                      : copy.download}
                </Text>
              </Pressable>
            </View>

            <Slider
              style={s.audioProgressSlider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={sliderPosition}
              disabled={!canSeekAudio}
              minimumTrackTintColor={ACCENT}
              maximumTrackTintColor={colors.isDarkMode ? 'rgba(255,255,255,0.28)' : 'rgba(6,79,47,0.20)'}
              thumbTintColor={canSeekAudio ? ACCENT : (colors.isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(6,79,47,0.45)')}
              onSlidingStart={handleSeekStart}
              onValueChange={handleSeekChange}
              onSlidingComplete={handleSeekComplete}
            />

            <View style={s.audioControlsRow}>
              <Text style={[s.audioTime, { color: colors.textLight }]}>{formattedPosition}</Text>
              <Pressable
                onPress={handlePlayPress}
                disabled={!hasAudio || isResolvingAudio}
                style={[s.audioPlayButton, (!hasAudio || isResolvingAudio) && s.audioPlayButtonDisabled]}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? copy.pause : copy.play}
              >
                {isResolvingAudio ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={30} color="#fff" />
                )}
              </Pressable>
              <Text style={[s.audioTime, { color: colors.textLight }]}>{duration > 0 ? formattedDuration : '--:--'}</Text>
            </View>

            <View style={[s.audioSpeedRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.audioSpeedLabel, { color: colors.textLight }]}>{getLanguage() === 'ar' ? 'السرعة' : 'Speed'}</Text>
              {AUDIO_SPEEDS.map((speed) => {
                const active = Math.abs(playbackSpeed - speed) < 0.01;
                return (
                  <Pressable
                    key={speed}
                    onPress={() => setPlaybackSpeed(speed)}
                    style={[s.audioSpeedButton, active && s.audioSpeedButtonActive]}
                  >
                    <Text style={[s.audioSpeedButtonText, active && s.audioSpeedButtonTextActive]}>{speed}x</Text>
                  </Pressable>
                );
              })}
            </View>

            {hasAudio && !isThisStoryAudio && shouldOfferResume(savedResume) && (
              <Text style={[s.audioResumeHint, { color: colors.textLight, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {formatResumeHint(savedResume.positionMs)}
              </Text>
            )}

            {!hasAudio && (
              <Text style={[s.audioNotice, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {copy.noAudio}. {copy.noAudioHint}
              </Text>
            )}

            {!!audioDownloadError && (
              <Text style={[s.audioDownloadErrorText, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {audioDownloadError}
              </Text>
            )}
          </View>
        </View>}

        <View style={{ paddingHorizontal: Spacing.lg }}>
          <StoryInteractionBar
            storyId={companionStoryId(companion.id)}
            section="companion"
            storyTitle={getCompanionName(companion)}
          />
        </View>

        <View style={s.detailSectionOuter}>
          <View style={[s.detailSectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[s.sectionIconWrap, { backgroundColor: ACCENT_LIGHT }]}>
              <MaterialCommunityIcons name="book-open-page-variant" size={18} color={colors.text} />
            </View>
            <Text style={[s.detailSectionTitle, { flex: 1, color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {copy.transcript}
            </Text>
          </View>
          <View style={s.transcriptOuter}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 25 : 10}
              tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                s.detailGlassOverlay,
                {
                  backgroundColor: isDarkMode ? 'rgba(6,79,47,0.08)' : 'rgba(6,79,47,0.08)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            />
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              contentContainerStyle={s.transcriptContent}
            >
              <Text style={[s.storyParagraph, { color: colors.text, textAlign: getLanguage() === 'ar' ? 'right' : 'left', writingDirection: getLanguage() === 'ar' ? 'rtl' : 'ltr' }]}>
                {transcript}
              </Text>
            </ScrollView>
          </View>
        </View>

        <View style={s.detailSectionOuter}>
          <View style={[s.detailSectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[s.sectionIconWrap, { backgroundColor: ACCENT_LIGHT }]}>
              <MaterialCommunityIcons name="star-four-points" size={18} color={colors.text} />
            </View>
            <Text style={[s.detailSectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('companions.virtues')}
            </Text>
          </View>
          <View style={s.detailGlassOuter}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 25 : 10}
              tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                s.detailGlassOverlay,
                {
                  backgroundColor: isDarkMode ? 'rgba(6,79,47,0.08)' : 'rgba(6,79,47,0.08)',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            />
            <View style={s.detailGlassContent}>
              {(getLanguage() === 'ar' ? companion.virtues : companion.virtuesEn).map((virtue, idx) => {
                const lang = getLanguage();
                return (
                  <View key={idx} style={[s.virtueRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="star-four-points" size={14} color={colors.text} style={s.virtueIcon} />
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

        <SourcesList sources={getCompanionSources((companion as { id?: string }).id)} />
      </ScrollView>

      <AudioResumePromptModal
        visible={resumePromptVisible}
        savedPositionMs={pendingResumeRef.current?.positionMs ?? savedResume?.positionMs ?? 0}
        onResume={handleResumeChoice}
        onRestart={handleRestartChoice}
        onClose={dismissResumePrompt}
        onDismiss={handleResumePromptDismissed}
      />
      <AudioStatusModal
        visible={showAudioModal && !resumePromptVisible}
        mode={audioModalMode}
        colors={colors}
        onRetry={handlePlayPress}
        onClose={() => setAudioModalDismissed(true)}
      />
      <BannerAdComponent screen="companions" />
    </View>
  );
}

// ========================================
// المكون الرئيسي
// ========================================

export default function CompanionsScreen() {
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const colors = useColors();
  const s = useScaledStyles(_s, colors.fs);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('ashara');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [companionFav, setCompanionFav] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const { id: companionIdParam } = useLocalSearchParams<{ id?: string }>();

  // CMS data with hardcoded fallback
  const { companions: cmsCompanions } = useCompanionsContent(COMPANIONS, CATEGORIES);
  const allCompanions = useMemo(
    () => cmsCompanions.map((companion) => expandCompanionStory(companion)),
    [cmsCompanions]
  );

  const filteredCompanions = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    // When searching, span ALL categories so the user can find any companion
    // without first switching to the right tab. With no query, show the active tab.
    if (query) {
      return allCompanions.filter((companion) => companionSearchText(companion).includes(query));
    }
    return allCompanions.filter((companion) => companion.category === activeCategory);
  }, [activeCategory, allCompanions, searchQuery]);
  const searchPlaceholder = getLanguage() === 'ar' ? 'ابحث باسم الصحابي...' : 'Search companions...';
  const noSearchResults = getLanguage() === 'ar' ? 'لا توجد نتائج مطابقة.' : 'No matching companions.';

  // Auto-select companion from URL param (e.g., from favorites navigation)
  useEffect(() => {
    if (companionIdParam && allCompanions.length > 0 && !selectedCompanion) {
      const found = allCompanions.find(c => c.id === companionIdParam);
      if (found) {
        setActiveCategory(found.category);
        setSelectedCompanion(found);
        isFavorited(`companion_${found.id}`, 'companion').then(setCompanionFav);
      }
    }
  }, [companionIdParam, allCompanions]);

  const handleCategoryChange = useCallback((key: CategoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveCategory(key);
    setSearchQuery('');
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

  const handleToggleFav = useCallback(async () => {
    if (!selectedCompanion) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowSaved = await toggleFavorite({
      id: `companion_${selectedCompanion.id}`,
      type: 'companion',
      title: getCompanionName(selectedCompanion),
      subtitle: selectedCompanion.brief,
      arabic: selectedCompanion.story?.[0] || selectedCompanion.brief,
      route: `/companions?id=${selectedCompanion.id}`,
    });
    setCompanionFav(nowSaved);
  }, [selectedCompanion]);

  // Detail view
  if (selectedCompanion) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']} screenKey="companions">
        <StoryListening
          companion={selectedCompanion}
          onBack={handleBack}
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
        backStyle={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', borderRadius: 14 }}
        rightExtra={<StoryNotificationsBell style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }} />}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Text style={{ fontSize: colors.fs(18), fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('companions.title')}</Text>
          <SectionInfoButton sectionKey="stories" />
        </View>
      </UniversalHeader>

      {/* Hero banner */}
      <View style={s.heroOuter}>
        <BlurView
         
          intensity={Platform.OS === 'ios' ? 25 : 10}
          tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            s.heroOverlay,
            {
              backgroundColor: isDarkMode
                ? 'rgba(6,79,47,0.15)'
                : 'rgba(6,79,47,0.08)',
            },
          ]}
        />
        <View style={[s.heroContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="account-group" size={36} color={colors.text} />
          <View style={s.heroTextWrap}>
            <Text style={[s.heroTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('companions.heroTitle')}
            </Text>
            <Text style={[s.heroSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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

      <View style={s.searchOuter}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 20 : 8}
          tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            s.searchOverlay,
            {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.62)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        />
        <View style={[s.searchContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <MaterialCommunityIcons name="magnify" size={21} color={colors.textLight} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textLight}
            style={[s.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {!!searchQuery && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.textLight} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Companions list */}
      <ScrollView
        ref={scrollRef}
        style={s.listScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
      >
        <ContentLanguageNotice />
        {/* Count badge */}
        <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[s.countText, { color: colors.text }]}>
            {filteredCompanions.length} {t('companions.companionsCount')}
          </Text>
        </View>

        {filteredCompanions.length === 0 ? (
          <View style={s.emptySearchBox}>
            <MaterialCommunityIcons name="magnify-close" size={30} color={colors.textLight} />
            <Text style={[s.emptySearchText, { color: colors.text }]}>{noSearchResults}</Text>
          </View>
        ) : (
          filteredCompanions.map(companion => (
            <CompanionCard
              key={companion.id}
              companion={companion}
              onPress={() => handleSelectCompanion(companion)}
              isDarkMode={isDarkMode}
              colors={colors}
            />
          ))
        )}

        {/* Footer */}
        <View style={s.footerOuter}>
          <BlurView
           
            intensity={Platform.OS === 'ios' ? 25 : 10}
            tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.footerOverlay,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(6,79,47,0.12)'
                  : 'rgba(6,79,47,0.06)',
              },
            ]}
          />
          <View style={s.footerContent}>
            <MaterialCommunityIcons name="star-crescent" size={24} color={colors.text} />
            <Text style={[s.footerText, { color: colors.text }]}>
              {t('companions.footerDua')}
            </Text>
            <Text style={[s.footerNote, { color: colors.textLight }]}>
              {t('companions.footerText')}
            </Text>
          </View>
        </View>
      </ScrollView>
      <BannerAdComponent screen="companions" />
    </ScreenContainer>
  );
}

// ========================================
// الأنماط
// ========================================

const _s = StyleSheet.create({


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
    lineHeight: 22,
    includeFontPadding: false,
  },
  searchOuter: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  searchContent: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontSemiBold(),
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 0,
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
    lineHeight: 22,
    includeFontPadding: false,
  },
  emptySearchBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
    marginBottom: 12,
  },
  emptySearchText: {
    fontFamily: fontSemiBold(),
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
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
    lineHeight: 30,
    includeFontPadding: false,
  },
  detailShareBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 38,
    height: 38,
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
    lineHeight: 24,
    includeFontPadding: false,
  },
  detailBrief: {
    fontFamily: fontRegular(),
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 4,
  },
  listenEntryOuter: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  listenEntryOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listenEntryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: Spacing.md,
  },
  listenEntryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenEntryText: {
    flex: 1,
  },
  listenEntryTitle: {
    fontFamily: fontSemiBold(),
    fontSize: 16,
    lineHeight: 26,
  },
  listenEntrySubtitle: {
    fontFamily: fontRegular(),
    fontSize: 13,
    lineHeight: 21,
    marginTop: 2,
  },
  listenPageContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  audioPanelOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  audioPanelOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  audioPanelContent: {
    padding: 18,
    gap: 14,
  },
  audioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  audioProgressSlider: {
    width: '100%',
    height: 34,
  },
  audioControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioPlayButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  audioPlayButtonDisabled: {
    opacity: 0.45,
  },
  audioTime: {
    width: 76,
    fontFamily: fontSemiBold(),
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  audioSpeedRow: {
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  audioSpeedLabel: {
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 18,
  },
  audioSpeedButton: {
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  audioSpeedButtonActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  audioSpeedButtonText: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 16,
  },
  audioSpeedButtonTextActive: {
    color: '#fff',
  },
  audioDownloadButton: {
    flexShrink: 0,
    minWidth: 92,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: ACCENT,
  },
  audioDownloadButtonDone: {
    backgroundColor: '#0d8e62',
  },
  audioDownloadButtonText: {
    color: '#fff',
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  audioDownloadErrorText: {
    color: '#ef4444',
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 18,
  },
  audioResumeHint: {
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  audioNotice: {
    fontFamily: fontRegular(),
    fontSize: 13,
    lineHeight: 22,
  },
  transcriptOuter: {
    height: 390,
    borderRadius: 20,
    overflow: 'hidden',
  },
  transcriptContent: {
    padding: 18,
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
  // Fixed height for the story section so the long biographical transcripts
  // scroll inside a box instead of stretching the entire detail page. Mirrors
  // the height used by the audio "listen" view (transcriptOuter, 390).
  storyScrollOuter: {
    height: 460,
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
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
  modalIconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSpinner: {
    marginTop: 18,
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: fontBold(),
    fontSize: 18,
    lineHeight: 30,
    marginBottom: 8,
    includeFontPadding: false,
  },
  modalBody: {
    fontFamily: fontRegular(),
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 18,
    includeFontPadding: false,
  },
  modalActions: {
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalButtonPrimary: {
    backgroundColor: ACCENT,
  },
  modalButtonSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalButtonText: {
    fontFamily: fontSemiBold(),
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
