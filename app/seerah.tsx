// app/seerah.tsx
// صفحة السيرة النبوية - روح المسلم

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import Slider from '@react-native-community/slider';

import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useSettings } from '@/contexts/SettingsContext';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { useAudioSeekPreview } from '@/hooks/use-audio-seek-preview';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { ContentLanguageNotice } from '@/components/ui/ContentLanguageNotice';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { SourcesList } from '@/components/ui/SourcesList';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';
import { t, getLanguage } from '@/lib/i18n';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { EmbeddedVideo } from '@/components/ui/EmbeddedVideo';
import { useSeerahContent } from '@/lib/content-api';
import { prepareStoryAudio, isStoryAudioCached, downloadStoryAudio } from '@/lib/story-audio-cache';
import { formatAudioTime } from '@/lib/audio-time';
import { isFavorited, toggleFavorite } from '@/lib/favorites-manager';
import { StoryInteractionBar } from '@/components/social/StoryInteractionBar';
import { seerahSectionId } from '@/lib/story-id';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing, ModalColors } from '@/constants/theme';

// ========================================
// الألوان
// ========================================

const ACCENT = '#0d8e62';
const ACCENT_LIGHT = 'rgba(6,79,47,0.12)';
const ACCENT_BORDER = 'rgba(6,79,47,0.30)';
const AUDIO_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function sectionSlug(titleEn: string): string {
  return titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getSeerahAudioCopy() {
  return getLanguage() === 'ar'
    ? {
        title: 'السيرة النبوية',
        subtitle: 'الصوت',
        loadingAudioTitle: 'جاري تحميل الصوت',
        loadingAudioBody: 'انتظر لحظات، سيتم تشغيل السيرة تلقائيًا.',
        noInternetTitle: 'لا يوجد اتصال بالإنترنت',
        noInternetBody: 'صوت السيرة غير محمل على الجهاز. اتصل بالإنترنت للتشغيل أو حمّله مسبقًا للاستماع أوفلاين.',
        audioErrorTitle: 'تعذر تشغيل الصوت',
        audioErrorBody: 'استغرق تحميل الصوت وقتًا طويلًا. تحقق من الاتصال ثم حاول مرة أخرى.',
        retry: 'حاول مرة أخرى',
        close: 'إغلاق',
        speed: 'السرعة',
        download: 'تحميل',
        downloading: 'جاري التحميل',
        downloaded: 'محمل',
        downloadFailed: 'تعذر تحميل الصوت. تحقق من الاتصال ثم حاول مرة أخرى.',
      }
    : {
        title: 'The Prophetic Biography',
        subtitle: 'Audio',
        loadingAudioTitle: 'Loading audio',
        loadingAudioBody: 'Please wait. The Seerah will start automatically.',
        noInternetTitle: 'No internet connection',
        noInternetBody: 'Seerah audio is not downloaded on this device. Connect to play it, or download it first for offline listening.',
        audioErrorTitle: 'Audio could not be played',
        audioErrorBody: 'Audio loading took too long. Check your connection and try again.',
        retry: 'Try again',
        close: 'Close',
        speed: 'Speed',
        download: 'Download',
        downloading: 'Downloading',
        downloaded: 'Downloaded',
        downloadFailed: 'Audio could not be downloaded. Check your connection and try again.',
      };
}

// ========================================
// أنواع البيانات
// ========================================

interface SeerahSource {
  reference: string;
  url?: string;
  note?: string;
}

interface SeerahSection {
  title: string;
  titleEn: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  paragraphs: string[];
  paragraphsEn: string[];
  videoUrl?: string;
  videoTitle?: string;
  sources?: SeerahSource[];
}

// Core references for the whole Seerah. Shown after every section.
const SEERAH_COMMON_SOURCES: SeerahSource[] = [
  { reference: 'السيرة النبوية لابن هشام (تحقيق ابن إسحاق)' },
  { reference: 'الرحيق المختوم للمباركفوري' },
  { reference: 'البداية والنهاية لابن كثير — قسم السيرة' },
  { reference: 'صحيح البخاري — كتاب المغازي', url: 'https://sunnah.com/bukhari/64' },
  { reference: 'صحيح مسلم — كتاب الفضائل', url: 'https://sunnah.com/muslim/43' },
  { reference: 'دلائل النبوة للبيهقي' },
];

// ========================================
// محتوى السيرة النبوية
// ========================================

const SEERAH_SECTIONS: SeerahSection[] = [
  {
    title: 'المولد والنشأة',
    titleEn: 'Birth & Early Life',
    icon: 'baby-face-outline',
    paragraphs: [
      'وُلِد سيدنا محمد ﷺ في مكة المكرمة عام الفيل، الموافق سنة 570 ميلادية، في شهر ربيع الأول، في بيت عبد الله بن عبد المطلب الهاشمي القرشي. وقد تُوفي أبوه عبد الله قبل مولده، فنشأ يتيمًا من جهة الأب.',
      'أرضعته حليمة السعدية في بادية بني سعد، حيث نشأ في البادية فتعلّم الفصاحة وقوة البيان، وشهدت حليمة من بركات هذا الطفل المبارك ما جعلها تحرص على بقائه عندها. وقد وقعت في هذه الفترة حادثة شقّ الصدر، حيث جاءه ملكان فشقّا صدره واستخرجا منه حظّ الشيطان وغسلاه بماء زمزم.',
      'توفيت أمه آمنة بنت وهب وهو في السادسة من عمره، فكفله جدّه عبد المطلب الذي كان سيد قريش وأعزّ رجالها. ولما بلغ الثامنة توفي جدّه، فانتقلت كفالته إلى عمّه أبي طالب الذي أحبّه حبًّا شديدًا وحماه ورعاه أحسن رعاية.',
      'نشأ ﷺ على أحسن الأخلاق وأكرم الصفات، فلم يُعرف عنه كذب قطّ ولا خيانة، حتى لقّبته قريش بالصادق الأمين. كان يرعى الغنم لأهل مكة على قراريط، ثم اشتغل بالتجارة، وكان أمينًا صادقًا في تجارته.',
      'لما بلغ الخامسة والعشرين من عمره، بلغ خبرُ أمانته وصدقه السيدة خديجة بنت خويلد، وكانت سيدة شريفة ذات مال، فعرضت عليه أن يخرج في تجارة لها إلى الشام. فخرج ﷺ ومعه غلامها ميسرة، وربحت التجارة ربحًا كثيرًا. فلما عاد أُعجبت خديجة بأمانته وأخلاقه، فتزوجها ﷺ وكانت أوّل زوجاته وأحبّهنّ إليه، وأنجبت له جميع أبنائه عدا إبراهيم.',
    ],
    paragraphsEn: [
      'Prophet Muhammad ﷺ was born in Makkah in the Year of the Elephant, corresponding to 570 CE, in the month of Rabi al-Awwal, in the household of Abdullah ibn Abdul-Muttalib al-Hashimi al-Qurashi. His father Abdullah had passed away before his birth, so he grew up as an orphan from his father\'s side.',
      'He was nursed by Halimah al-Sa\'diyyah in the desert of Banu Sa\'d, where he grew up learning eloquence and strong articulation. Halimah witnessed such blessings from this blessed child that she was keen to keep him with her. During this period, the incident of the opening of the chest occurred, where two angels came and opened his chest, removed the portion of Satan, and washed it with Zamzam water.',
      'His mother Aminah bint Wahb passed away when he was six years old. His grandfather Abdul-Muttalib, who was the chief of Quraysh, took him into his care. When he reached the age of eight, his grandfather also passed away, and his guardianship was transferred to his uncle Abu Talib, who loved him dearly and protected and cared for him in the best manner.',
      'He ﷺ grew up with the finest character and most noble traits. He was never known to lie or betray, until Quraysh gave him the title of "The Truthful and Trustworthy" (al-Sadiq al-Amin). He used to tend sheep for the people of Makkah for a few coins, then engaged in trade, always honest and trustworthy in his dealings.',
      'When he reached the age of twenty-five, news of his honesty and truthfulness reached Lady Khadijah bint Khuwaylid, a noble and wealthy woman. She offered him to lead a trade caravan to Syria on her behalf. He ﷺ set out with her servant Maysarah, and the trade was very profitable. Upon his return, Khadijah was impressed by his integrity and character, so he ﷺ married her. She was his first wife and the most beloved to him, and she bore him all his children except Ibrahim.',
    ],
    sources: [
      { reference: 'صحيح مسلم 162 — حادثة شق الصدر في بادية بني سعد', url: 'https://sunnah.com/muslim:162' },
      { reference: 'صحيح البخاري 3437 — ولادته يوم الإثنين عام الفيل' },
      { reference: 'السيرة النبوية لابن هشام — كفالة عبد المطلب ثم أبي طالب' },
      { reference: 'مسند أحمد — رحلة الشام مع ميسرة وزواجه من خديجة في الخامسة والعشرين' },
    ],
  },
  {
    title: 'البعثة والوحي',
    titleEn: 'Prophethood & Revelation',
    icon: 'star-four-points',
    paragraphs: [
      'كان النبي ﷺ يتعبّد في غار حراء بجبل النور قبل البعثة، يتأمّل في خلق السماوات والأرض ويتحنّث الليالي ذوات العدد. وكانت الرؤيا الصادقة أوّل ما بُدئ به من الوحي، فكان لا يرى رؤيا إلا جاءت مثل فلق الصبح.',
      'في ليلة السابع عشر من رمضان، وقد بلغ الأربعين من عمره، نزل عليه جبريل عليه السلام في غار حراء فقال له: اقرأ. قال ﷺ: ما أنا بقارئ. فغطّه جبريل حتى بلغ منه الجَهد ثم أرسله، وكرّر ذلك ثلاثًا. ثم قال: ﴿اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ ۝ خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ ۝ اقْرَأْ وَرَبُّكَ الْأَكْرَمُ ۝ الَّذِي عَلَّمَ بِالْقَلَمِ ۝ عَلَّمَ الْإِنسَانَ مَا لَمْ يَعْلَمْ﴾.',
      'رجع النبي ﷺ إلى خديجة يرجف فؤاده، فقال: "زمّلوني زمّلوني"، فزمّلوه حتى ذهب عنه الروع. فأخبر خديجة بما حدث، فقالت كلمتها الخالدة: "كلّا واللهِ لا يُخزيك الله أبداً، إنك لتصل الرحم، وتحمل الكلّ، وتَكسب المعدوم، وتَقري الضيف، وتُعين على نوائب الحق." ثم انطلقت به إلى ابن عمها ورقة بن نوفل، فبشّره بأنه نبي هذه الأمة.',
      'كانت خديجة رضي الله عنها أوّل من آمن به من النساء، وأبو بكر الصدّيق أوّل من آمن من الرجال، وعلي بن أبي طالب أوّل من آمن من الصبيان، وزيد بن حارثة أوّل من آمن من الموالي. وبدأ ﷺ بالدعوة سرًّا ثلاث سنوات، يجتمع بالمؤمنين في دار الأرقم بن أبي الأرقم.',
      'لم تكن البعثة النبوية حدثًا عاديًا، بل كانت نقطة تحوّل في تاريخ البشرية كلها. فقد جاء ﷺ بدين يُحرّر العقول من الأوهام، والقلوب من الشرك، والمجتمعات من الظلم والجاهلية. وبدأ نور الإسلام ينتشر رغم كل العقبات والتحديات.',
    ],
    paragraphsEn: [
      'Before the prophethood, the Prophet ﷺ used to worship in the Cave of Hira on Mount Noor, contemplating the creation of the heavens and the earth, spending many nights in devotion. True visions were the first form of revelation he received — every vision he saw would come true as clearly as the break of dawn.',
      'On the night of the 17th of Ramadan, when he reached the age of forty, Angel Jibreel (Gabriel) descended upon him in the Cave of Hira and said: "Read!" He ﷺ replied: "I cannot read." Jibreel embraced him tightly until he could barely endure it, then released him. This was repeated three times. Then Jibreel recited: "Read in the name of your Lord who created, created man from a clinging substance. Read, and your Lord is the Most Generous, who taught by the pen, taught man that which he knew not."',
      'The Prophet ﷺ returned to Khadijah trembling with fear, saying: "Cover me, cover me!" They covered him until the fear subsided. He told Khadijah what had happened, and she spoke her immortal words: "By Allah, Allah will never disgrace you. You maintain ties of kinship, bear the burdens of others, earn for the destitute, honor your guests, and help those afflicted by calamities." She then took him to her cousin Waraqah ibn Nawfal, who gave him glad tidings that he was the prophet of this nation.',
      'Khadijah (may Allah be pleased with her) was the first woman to believe in him, Abu Bakr al-Siddiq was the first man, Ali ibn Abi Talib was the first youth, and Zayd ibn Harithah was the first freed slave. He ﷺ began calling to Islam secretly for three years, meeting with the believers in the house of al-Arqam ibn Abi al-Arqam.',
      'The prophetic mission was no ordinary event — it was a turning point in the history of all humanity. He ﷺ came with a religion that liberated minds from superstition, hearts from polytheism, and societies from oppression and ignorance. The light of Islam began to spread despite all obstacles and challenges.',
    ],
    sources: [
      { reference: 'صحيح البخاري 3 / صحيح مسلم 160 — بدء الوحي وقصة غار حراء', url: 'https://sunnah.com/bukhari:3' },
      { reference: 'سورة العلق 1-5 — أول ما نزل من القرآن', url: 'https://quran.com/96/1-5' },
      { reference: 'صحيح البخاري 4953 — قول خديجة "كلا والله لا يخزيك الله أبدًا"' },
      { reference: 'السيرة النبوية لابن هشام — أول من آمن من النساء والرجال والصبيان والموالي', note: 'في تحديد "أول من أسلم من الرجال" خلاف: قيل أبو بكر، وقيل علي (وهو صبي)، وقيل زيد بن حارثة. والجمهور على أبي بكر' },
    ],
  },
  {
    title: 'الدعوة في مكة',
    titleEn: 'The Da\'wah in Makkah',
    icon: 'account-voice',
    paragraphs: [
      'بعد ثلاث سنوات من الدعوة السرية، نزل الأمر الإلهي بالجهر بالدعوة: ﴿فَاصْدَعْ بِمَا تُؤْمَرُ وَأَعْرِضْ عَنِ الْمُشْرِكِينَ﴾. فصعد النبي ﷺ على جبل الصفا ونادى قريشًا بطنًا بطنًا، وأنذرهم عذاب الله، فأعلن عمّه أبو لهب العداوة وقال: "تبًّا لك! ألهذا جمعتنا؟" فنزلت سورة المسد.',
      'واجه المسلمون اضطهادًا شديدًا من قريش. فقد عُذّب بلال بن رباح في رمضاء مكة ووُضعت الصخرة على صدره وهو يقول: "أحدٌ أحد". وعُذّبت آل ياسر حتى استشهدت سمية بنت خياط، فكانت أوّل شهيدة في الإسلام. ومرّ بهم النبي ﷺ وهم يُعذّبون فقال: "صبرًا آل ياسر، فإنّ موعدكم الجنة."',
      'فرضت قريش حصارًا اقتصاديًا واجتماعيًا على بني هاشم في شِعب أبي طالب دام ثلاث سنوات. قُطعت عنهم الأسواق وحُرم عليهم البيع والشراء والمصاهرة، حتى أكلوا ورق الشجر من شدة الجوع. وصبر النبي ﷺ وصحابته صبرًا عجيبًا حتى فكّ الله الحصار.',
      'في العام العاشر من البعثة، تُوفيت السيدة خديجة رضي الله عنها، ثم تُوفي عمّه أبو طالب الذي كان يحميه من قريش. فسُمّي ذلك العام بِعام الحُزن. واشتدّ أذى قريش على النبي ﷺ، فخرج إلى الطائف يدعو ثقيفًا إلى الإسلام، فردّوه وسلّطوا عليه سفهاءهم وغلمانهم يرمونه بالحجارة حتى أدمَوا قدميه الشريفتين.',
      'في ليلة السابع والعشرين من رجب، أكرم الله نبيّه بمعجزة الإسراء والمعراج. أسرى به ﷺ من المسجد الحرام إلى المسجد الأقصى على دابة البُراق، ثم عُرج به إلى السماوات العُلا، حيث فُرضت الصلوات الخمس. وقد رأى من آيات ربه الكبرى، والتقى بالأنبياء عليهم السلام وصلّى بهم إمامًا في المسجد الأقصى.',
      'كانت سنوات الدعوة في مكة ثلاث عشرة سنة، تعلّم فيها المسلمون الصبر والثبات على الحق مهما اشتدّت المحن. وفي هذه السنوات نزل معظم القرآن المكّي الذي ركّز على توحيد الله وإثبات البعث والجزاء وقصص الأنبياء السابقين.',
    ],
    paragraphsEn: [
      'After three years of secret preaching, the divine command came to proclaim the message publicly: "So declare what you are commanded and turn away from the polytheists." The Prophet ﷺ climbed Mount Safa and called out to all the clans of Quraysh, warning them of Allah\'s punishment. His uncle Abu Lahab declared his enmity, saying: "May you perish! Is this why you gathered us?" Upon this, Surah al-Masad was revealed.',
      'The Muslims faced severe persecution from Quraysh. Bilal ibn Rabah was tortured under the scorching sun of Makkah with a boulder placed on his chest while he repeated: "One, One (God)." The family of Yasir was tortured until Sumayyah bint Khayyat was martyred, becoming the first martyr in Islam. The Prophet ﷺ passed by them as they were being tortured and said: "Be patient, O family of Yasir, for your appointment is Paradise."',
      'Quraysh imposed an economic and social boycott on Banu Hashim in the Valley of Abu Talib that lasted three years. They were cut off from markets and forbidden to trade, buy, or intermarry, until they ate tree leaves out of extreme hunger. The Prophet ﷺ and his companions endured with remarkable patience until Allah lifted the siege.',
      'In the tenth year of the mission, Lady Khadijah (may Allah be pleased with her) passed away, followed by his uncle Abu Talib who had been protecting him from Quraysh. That year was named the Year of Sorrow. The persecution from Quraysh intensified, so the Prophet ﷺ traveled to Taif to call the tribe of Thaqif to Islam. They rejected him and sent their foolish people and children to pelt him with stones until his blessed feet bled.',
      'On the night of the 27th of Rajab, Allah honored His Prophet with the miracle of al-Isra wal-Mi\'raj. He ﷺ was taken on a night journey from the Sacred Mosque to al-Aqsa Mosque on the mount al-Buraq, then ascended through the heavens, where the five daily prayers were prescribed. He witnessed the great signs of his Lord and met the prophets (peace be upon them), leading them in prayer at al-Aqsa Mosque.',
      'The years of preaching in Makkah lasted thirteen years, during which the Muslims learned patience and steadfastness upon the truth no matter how severe the trials. During these years, most of the Makkan Quran was revealed, focusing on the oneness of Allah, affirming the resurrection and judgment, and telling the stories of previous prophets.',
    ],
    sources: [
      { reference: 'صحيح البخاري 4770 / صحيح مسلم 208 — "وأنذر عشيرتك الأقربين"', url: 'https://sunnah.com/bukhari:4770' },
      { reference: 'سيرة ابن هشام — تعذيب بلال وآل ياسر وحصار الشعب' },
      { reference: 'سورة المسد كاملة — في أبي لهب', url: 'https://quran.com/111' },
      { reference: 'صحيح البخاري 349 / صحيح مسلم 162 — الإسراء والمعراج وفرض الصلوات', url: 'https://sunnah.com/bukhari:349' },
      { reference: 'سورة الإسراء 1', url: 'https://quran.com/17/1' },
      { reference: 'صحيح البخاري 3231 / صحيح مسلم 1795 — رحلة الطائف ولقاؤه ﷺ ملك الجبال' },
    ],
  },
  {
    title: 'الهجرة إلى المدينة',
    titleEn: 'The Hijrah to Madinah',
    icon: 'road-variant',
    paragraphs: [
      'قبل الهجرة إلى المدينة، كانت الهجرة الأولى إلى الحبشة حيث أمر النبي ﷺ أصحابه بالهجرة إلى أرض الحبشة عند النجاشي الملك العادل الذي لا يُظلم عنده أحد. فهاجر عدد من المسلمين فرارًا بدينهم، وأحسن النجاشي استقبالهم وأمّنهم.',
      'بدأ النبي ﷺ يعرض نفسه على القبائل في مواسم الحج، حتى لقي وفدًا من يثرب (المدينة) من قبيلتي الأوس والخزرج. فآمنوا به وبايعوه بيعة العقبة الأولى ثم الثانية، وتعاهدوا على نصرته وحمايته إذا هاجر إليهم.',
      'أذن الله لنبيّه ﷺ بالهجرة إلى المدينة سنة 622 ميلادية. وقد دبّرت قريش مؤامرة لقتله، فاختارت من كل قبيلة شابًّا قويًّا ليضربوه ضربة رجل واحد. لكنّ الله نجّاه، فخرج ﷺ من بين أيديهم وقد أعمى الله أبصارهم، وترك عليًّا رضي الله عنه ينام في فراشه.',
      'رافقه في الهجرة أبو بكر الصدّيق رضي الله عنه، واختبآ في غار ثور ثلاث ليالٍ. وقد وقفت قريش على باب الغار فقال أبو بكر: "لو أنّ أحدهم نظر تحت قدميه لأبصرنا." فقال ﷺ: "ما ظنّك باثنين الله ثالثهما." ونسج العنكبوت بيته على باب الغار، وباضت الحمامة عنده بأمر الله.',
      'وصل النبي ﷺ إلى المدينة يوم الاثنين 12 ربيع الأول، واستقبله أهل المدينة بالفرح والنشيد: "طلع البدر علينا، من ثنيّات الوداع." وكان أوّل ما فعله ﷺ بناء المسجد النبوي الشريف، وآخى بين المهاجرين والأنصار مؤاخاة جعلت الأنصاري يقاسم المهاجر ماله ومسكنه.',
      'أصدر النبي ﷺ وثيقة المدينة التي نظّمت العلاقات بين المسلمين وغيرهم من سكان المدينة، وأرست قواعد التعايش والعدل والمسؤولية المشتركة في الدفاع عن المدينة. وكانت هذه الوثيقة من أوائل الدساتير المدنية في التاريخ.',
    ],
    paragraphsEn: [
      'Before the Hijrah to Madinah, there was the first migration to Abyssinia (Ethiopia), where the Prophet ﷺ ordered his companions to migrate to the land of the Negus (al-Najashi), a just king under whom no one was oppressed. A number of Muslims migrated to escape persecution, and the Negus welcomed and protected them.',
      'The Prophet ﷺ began presenting himself to the tribes during the Hajj seasons, until he met a delegation from Yathrib (Madinah) from the tribes of al-Aws and al-Khazraj. They believed in him and pledged allegiance at the First Pledge of Aqabah, then the Second, committing to support and protect him if he migrated to them.',
      'Allah permitted His Prophet ﷺ to migrate to Madinah in the year 622 CE. Quraysh plotted to kill him, selecting a strong young man from each tribe to strike him as one. But Allah saved him — he ﷺ walked out from among them while Allah blinded their sight, leaving Ali (may Allah be pleased with him) sleeping in his bed.',
      'Abu Bakr al-Siddiq (may Allah be pleased with him) accompanied him on the Hijrah, and they hid in the Cave of Thawr for three nights. Quraysh stood at the entrance of the cave, and Abu Bakr said: "If any of them looked down at his feet, he would see us." The Prophet ﷺ replied: "What do you think of two whose third is Allah?" A spider spun its web over the cave entrance, and a dove nested there by Allah\'s command.',
      'The Prophet ﷺ arrived in Madinah on Monday, the 12th of Rabi al-Awwal. The people of Madinah received him with joy, singing: "The full moon has risen upon us, from the farewell passes." The first thing he ﷺ did was build the Prophet\'s Mosque, and he established brotherhood between the Muhajirun (emigrants) and the Ansar (helpers), a bond so strong that the Ansar would share their wealth and homes with the Muhajirun.',
      'The Prophet ﷺ issued the Charter of Madinah, which organized relations between Muslims and other residents of Madinah, and established the foundations of coexistence, justice, and shared responsibility in defending the city. This document was one of the earliest civil constitutions in history.',
    ],
    sources: [
      { reference: 'صحيح البخاري 3905 / صحيح مسلم 2381 — قصة الهجرة وغار ثور', url: 'https://sunnah.com/bukhari:3905' },
      { reference: 'سورة التوبة 40 — "ثاني اثنين إذ هما في الغار"', url: 'https://quran.com/9/40' },
      { reference: 'سيرة ابن هشام — هجرة الحبشة وبيعة العقبة' },
      { reference: 'صحيح البخاري 3779 — مؤاخاة الأنصار والمهاجرين' },
      { reference: 'صحيفة المدينة (وثيقة المدينة) — رواها ابن إسحاق' },
      { reference: 'قصة العنكبوت والحمامة على باب الغار', note: 'مذكورة عند ابن سعد وغيره من المؤرخين، لكن إسنادها ضعيف ولم تثبت في الصحيحين' },
    ],
  },
  {
    title: 'الغزوات',
    titleEn: 'The Battles',
    icon: 'shield-sword',
    paragraphs: [
      'غزوة بدر الكبرى (رمضان، 2 هـ / 624 م): أوّل معركة فاصلة في الإسلام. خرج المسلمون وعددهم نحو 313 مقاتلًا لاعتراض قافلة قريش التجارية، فقدّرالله أن يلتقوا بجيش قريش البالغ نحو ألف مقاتل عند آبار بدر. نصر الله المسلمين نصرًا مؤزّرًا وأنزل الملائكة تقاتل معهم، وقُتل صناديد الكفر وأُسر كثير منهم. وكانت هذه الغزوة يوم الفرقان الذي فرّق الله فيه بين الحق والباطل.',
      'غزوة أحد (شوال، 3 هـ / 625 م): جاءت قريش بثلاثة آلاف مقاتل للثأر من هزيمة بدر. وضع النبي ﷺ الرماة على جبل أحد وأمرهم ألّا يبرحوا مكانهم مهما حدث. بدأ المسلمون بالانتصار، لكنّ الرماة خالفوا أمر النبي ﷺ ونزلوا لجمع الغنائم، فالتفّ خالد بن الوليد بفرسان المشركين من خلف الجبل. استشهد حمزة بن عبد المطلب سيد الشهداء، وجُرح النبي ﷺ وكُسرت رَباعيته. وكان في الغزوة درس عظيم في طاعة القائد والانضباط.',
      'غزوة الخندق (شوال، 5 هـ / 627 م): تحالفت قريش واليهود والقبائل العربية وجاءوا بعشرة آلاف مقاتل لغزو المدينة. أشار سلمان الفارسي بحفر خندق حول المدينة، فحفره المسلمون وعملمعهم النبي ﷺ بنفسه. حاصر الأحزاب المدينة قرابة شهر، فأرسل الله عليهم ريحًا شديدة وجنودًا لم يروها، فانصرفوا خائبين. قال ﷺ بعدها: "الآن نغزوهم ولا يغزوننا."',
      'فتح مكة (رمضان، 8 هـ / 630 م): خرج النبي ﷺ في عشرة آلاف من المسلمين لفتح مكة بعد أن نقضت قريش صلح الحديبية. دخل مكة فاتحًا منتصرًا وهو يُطأطئ رأسه تواضعًا لله. وقف على باب الكعبة وقال: "يا معشر قريش، ما تظنون أنّي فاعل بكم؟" قالوا: "أخ كريم وابن أخ كريم." فقال: "اذهبوا فأنتم الطلقاء." وطهّر الكعبة من الأصنام التي كانت 360 صنمًا، وهو يتلو: ﴿وَقُلْ جَاءَ الْحَقُّ وَزَهَقَ الْبَاطِلُ إِنَّ الْبَاطِلَ كَانَ زَهُوقًا﴾.',
      'غزوة حنين (شوال، 8 هـ / 630 م): بعد فتح مكة، اجتمعت قبائل هوازن وثقيف لقتال المسلمين. خرج النبي ﷺ في اثني عشر ألفًا، فأعجب بعض المسلمين بكثرتهم. لكنّ العدوّ كمن لهم في وادي حنين، فانهزم كثير من المسلمين في البداية. ثبت النبي ﷺ ونادى أصحابه حتى عادوا والتفّوا حوله، ونصرهم الله. وفي ذلك نزل: ﴿وَيَوْمَ حُنَيْنٍ إِذْ أَعْجَبَتْكُمْ كَثْرَتُكُمْ فَلَمْ تُغْنِ عَنكُمْ شَيْئًا﴾.',
    ],
    paragraphsEn: [
      'The Battle of Badr (Ramadan, 2 AH / 624 CE): The first decisive battle in Islam. The Muslims, numbering about 313 fighters, set out to intercept a Quraysh trade caravan, but Allah decreed that they would meet the Quraysh army of about one thousand fighters at the wells of Badr. Allah granted the Muslims a resounding victory and sent down angels to fight alongside them. The leaders of disbelief were killed and many were captured. This battle was the Day of Criterion, when Allah distinguished between truth and falsehood.',
      'The Battle of Uhud (Shawwal, 3 AH / 625 CE): Quraysh came with three thousand fighters to avenge their defeat at Badr. The Prophet ﷺ positioned archers on Mount Uhud and ordered them not to leave their posts no matter what happened. The Muslims initially gained the upper hand, but the archers disobeyed the Prophet\'s orders and descended to collect spoils. Khalid ibn al-Walid flanked the Muslims from behind the mountain with the polytheist cavalry. Hamzah ibn Abdul-Muttalib, the Master of Martyrs, was killed, and the Prophet ﷺ was wounded with his front tooth broken. The battle taught a great lesson in obeying the leader and maintaining discipline.',
      'The Battle of the Trench (Shawwal, 5 AH / 627 CE): Quraysh, the Jews, and Arab tribes allied together and came with ten thousand fighters to invade Madinah. Salman al-Farisi suggested digging a trench around Madinah, which the Muslims dug with the Prophet ﷺ working alongside them. The confederates besieged Madinah for about a month, but Allah sent upon them a fierce wind and soldiers they could not see, and they withdrew in defeat. The Prophet ﷺ said afterward: "Now we march against them, and they do not march against us."',
      'The Conquest of Makkah (Ramadan, 8 AH / 630 CE): The Prophet ﷺ marched with ten thousand Muslims to conquer Makkah after Quraysh violated the Treaty of Hudaybiyyah. He entered Makkah as a victorious conqueror, bowing his head in humility before Allah. He stood at the door of the Kaaba and said: "O people of Quraysh, what do you think I will do with you?" They said: "A noble brother and the son of a noble brother." He replied: "Go, for you are free." He then purified the Kaaba of its 360 idols, reciting: "And say: Truth has come and falsehood has vanished. Indeed, falsehood is bound to vanish."',
      'The Battle of Hunayn (Shawwal, 8 AH / 630 CE): After the conquest of Makkah, the tribes of Hawazin and Thaqif gathered to fight the Muslims. The Prophet ﷺ set out with twelve thousand fighters, and some Muslims were impressed by their large numbers. But the enemy ambushed them in the valley of Hunayn, and many Muslims initially fled. The Prophet ﷺ stood firm and called his companions until they returned and rallied around him, and Allah granted them victory. Regarding this, it was revealed: "And on the day of Hunayn, when your great numbers pleased you, but they availed you nothing."',
    ],
    sources: [
      { reference: 'سورة الأنفال — تفصيل غزوة بدر', url: 'https://quran.com/8' },
      { reference: 'صحيح البخاري 3951-4080 — كتاب المغازي (بدر وأحد والخندق)', url: 'https://sunnah.com/bukhari/64' },
      { reference: 'سورة آل عمران 121-179 — أحداث غزوة أحد', url: 'https://quran.com/3/121-179' },
      { reference: 'سورة الأحزاب 9-27 — غزوة الأحزاب (الخندق)', url: 'https://quran.com/33/9-27' },
      { reference: 'صحيح البخاري 4280 / صحيح مسلم 1780 — فتح مكة سنة 8هـ' },
      { reference: 'سورة التوبة 25-26 — غزوة حنين', url: 'https://quran.com/9/25-26' },
    ],
  },
  {
    title: 'الفتوحات وانتشار الإسلام',
    titleEn: 'Conquests & Spread of Islam',
    icon: 'earth',
    paragraphs: [
      'بعد صلح الحديبية في السنة السادسة للهجرة، أرسل النبي ﷺ رسائل إلى ملوك وحكام العالم يدعوهم إلى الإسلام. كتب إلى هرقل عظيم الروم، وكسرى ملك الفرس، والمقوقس عظيم مصر، والنجاشي ملك الحبشة، وغيرهم من الملوك والأمراء. وكان في ذلك إعلان بأنّ الإسلام رسالة عالمية للبشرية جمعاء.',
      'بعد فتح مكة، بدأت القبائل العربية تأتي إلى المدينة أفواجًا تعلن إسلامها. وسُمّيت السنة التاسعة للهجرة بعام الوفود، حيث جاء وفود القبائل من أنحاء الجزيرة العربية يبايعون النبي ﷺ على الإسلام. ونزل في ذلك: ﴿إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ ۝ وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا﴾.',
      'في السنة العاشرة للهجرة، حجّ النبي ﷺ حجة الوداع مع أكثر من مائة ألف من المسلمين. وخطب خطبته الشهيرة في عرفة، وأرسى فيها قواعد حقوق الإنسان: حُرمة الدماء والأموال والأعراض، والمساواة بين الناس، وحقوق المرأة، والتحذير من الربا والثأر. وقال ﷺ: "كلّكم لآدم وآدم من تراب، لا فضل لعربي على أعجمي إلا بالتقوى."',
      'في خطبة الوداع أيضًا قال ﷺ: "إني تاركٌ فيكم ما إن تمسّكتم به لن تضلّوا بعدي أبدًا: كتاب الله." ثم سأل الناس: "ألا هل بلّغت؟" قالوا: نعم. قال: "اللهمّ فاشهد." وأشار بإصبعه إلى السماء ثم إلى الناس. ونزل في ذلك اليوم: ﴿الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ وَأَتْمَمْتُ عَلَيْكُمْ نِعْمَتِي وَرَضِيتُ لَكُمُ الْإِسْلَامَ دِينًا﴾.',
    ],
    paragraphsEn: [
      'After the Treaty of Hudaybiyyah in the sixth year after Hijrah, the Prophet ﷺ sent letters to the kings and rulers of the world inviting them to Islam. He wrote to Heraclius, the Emperor of Rome; Khosrow, the King of Persia; al-Muqawqis, the ruler of Egypt; the Negus, the King of Abyssinia; and other kings and princes. This was a declaration that Islam is a universal message for all of humanity.',
      'After the conquest of Makkah, Arab tribes began coming to Madinah in droves to declare their Islam. The ninth year after Hijrah was called the Year of Delegations, as delegations from tribes across the Arabian Peninsula came to pledge allegiance to the Prophet ﷺ. Regarding this, it was revealed: "When the victory of Allah has come and the conquest, and you see the people entering into the religion of Allah in multitudes."',
      'In the tenth year after Hijrah, the Prophet ﷺ performed the Farewell Pilgrimage with more than one hundred thousand Muslims. He delivered his famous sermon at Arafah, establishing the foundations of human rights: the sanctity of blood, wealth, and honor; equality among people; women\'s rights; and warnings against usury and blood vengeance. He ﷺ said: "All of you are from Adam, and Adam was from dust. There is no superiority of an Arab over a non-Arab except through piety."',
      'In the Farewell Sermon, he ﷺ also said: "I am leaving among you that which, if you hold fast to it, you will never go astray: the Book of Allah." Then he asked the people: "Have I conveyed the message?" They said: "Yes." He said: "O Allah, bear witness." He pointed his finger to the sky then to the people. On that day, it was revealed: "Today I have perfected for you your religion, completed My favor upon you, and have chosen for you Islam as your religion."',
    ],
    sources: [
      { reference: 'صحيح البخاري 7 / صحيح مسلم 1773 — رسائل النبي ﷺ إلى هرقل وكسرى والمقوقس والنجاشي' },
      { reference: 'سورة النصر — عام الوفود وفتح مكة', url: 'https://quran.com/110' },
      { reference: 'صحيح مسلم 1218 — حديث جابر الطويل في حجة الوداع وخطبتها', url: 'https://sunnah.com/muslim:1218' },
      { reference: 'سورة المائدة 3 — "اليوم أكملت لكم دينكم"', url: 'https://quran.com/5/3' },
      { reference: 'صحيح البخاري 1739 / صحيح مسلم 1679 — خطبة حجة الوداع' },
    ],
  },
  {
    title: 'الوفاة',
    titleEn: 'The Passing',
    icon: 'moon-waning-crescent',
    paragraphs: [
      'في أواخر شهر صفر من السنة الحادية عشرة للهجرة، بدأ المرض يشتدّ على النبي ﷺ. وكان آخر ما صلّى بالناس صلاة المغرب، قرأ فيها بسورة المرسلات. ثم أمر أبا بكر الصدّيق أن يصلّي بالناس، فلم يزل أبو بكر يصلّي بهم حتى وفاته ﷺ.',
      'في يوم الاثنين الثاني عشر من ربيع الأول، كشف النبي ﷺ ستار حجرته والناس في صلاة الفجر خلف أبي بكر، فنظر إليهم وتبسّم. قال أنس: "ما رأيت وجهه أحسن منه في تلك الساعة." ففرح الناس وظنّوا أنه قد شُفي. لكنّ المرض عاود واشتدّ.',
      'ضع رأسه الشريف ﷺ في حجر عائشة رضي الله عنها، وجعل يدخل يده في إناء فيه ماء فيمسح وجهه وهو يقول: "لا إله إلا الله، إنّ للموت لسكرات." ورفع إصبعه وجعل يقول: "في الرفيق الأعلى، في الرفيق الأعلى." ثم مالت يده الشريفة، ولحق بالرفيق الأعلى ﷺ.',
      'لما بلغ خبر وفاته ﷺ الصحابة، ذُهلوا وأصابهم حزن شديد. أنكر عمر بن الخطاب الخبر وقال: "من قال إنّ محمدًا قد مات ضربته بسيفي." فجاء أبو بكر وقبّل جبهة النبي ﷺ وقال: "طبتَ حيًّا وميّتًا يا رسول الله." ثم خرج إلى الناس وقال كلمته الخالدة: "من كان يعبد محمدًا فإنّ محمدًا قد مات، ومن كان يعبد الله فإنّ الله حيّ لا يموت." وتلا: ﴿وَمَا مُحَمَّدٌ إِلَّا رَسُولٌ قَدْ خَلَتْ مِن قَبْلِهِ الرُّسُلُ﴾.',
      'غُسّل النبي ﷺ ودُفن في حجرة عائشة رضي الله عنها بالمسجد النبوي الشريف، في المكان الذي قُبض فيه. ترك ﷺ للأمة كتاب الله وسنّته المطهّرة نورًا وهداية إلى يوم القيامة. صلى الله عليه وعلى آله وصحبه وسلّم تسليمًا كثيرًا.',
      'لم يترك النبي ﷺ دينارًا ولا درهمًا، ولا عبدًا ولا أمة، ولا شيئًا إلا بغلته البيضاء وسلاحه وأرضًا جعلها صدقة. لقد عاش ﷺ حياته كلها للدعوة والعبادة وخدمة الناس، وترك أثرًا خالدًا غيّر وجه التاريخ والحضارة الإنسانية إلى الأبد. صلوات الله وسلامه عليه.',
    ],
    paragraphsEn: [
      'In the last days of the month of Safar in the eleventh year after Hijrah, the illness of the Prophet ﷺ intensified. The last prayer he led was the Maghrib prayer, in which he recited Surah al-Mursalat. He then ordered Abu Bakr al-Siddiq to lead the people in prayer, and Abu Bakr continued to lead them until the Prophet\'s passing ﷺ.',
      'On Monday, the 12th of Rabi al-Awwal, the Prophet ﷺ lifted the curtain of his room while the people were praying Fajr behind Abu Bakr. He looked at them and smiled. Anas said: "I had never seen his face more beautiful than at that moment." The people rejoiced, thinking he had recovered. But the illness returned and worsened.',
      'He ﷺ laid his blessed head in the lap of Aisha (may Allah be pleased with her), dipping his hand in a vessel of water and wiping his face, saying: "There is no god but Allah. Indeed, death has agonies." He raised his finger and began saying: "With the Highest Companion, with the Highest Companion." Then his blessed hand fell, and he departed to the Highest Companion ﷺ.',
      'When news of his passing ﷺ reached the companions, they were stunned and overcome by profound grief. Umar ibn al-Khattab denied the news, saying: "Whoever says Muhammad has died, I will strike him with my sword." Abu Bakr came and kissed the forehead of the Prophet ﷺ, saying: "You were pure in life and in death, O Messenger of Allah." He then went out to the people and spoke his immortal words: "Whoever used to worship Muhammad, then Muhammad has died. And whoever worships Allah, then Allah is Ever-Living and never dies." He then recited: "Muhammad is not but a messenger. Other messengers have passed before him."',
      'The Prophet ﷺ was washed and buried in the room of Aisha (may Allah be pleased with her) in the Prophet\'s Mosque, in the very place where he passed away. He left for the nation the Book of Allah and his purified Sunnah as light and guidance until the Day of Judgment. May Allah\'s peace and blessings be upon him, his family, and his companions.',
      'The Prophet ﷺ left behind neither a dinar nor a dirham, neither a slave nor a servant, nor anything except his white mule, his weapons, and a piece of land he designated as charity. He ﷺ lived his entire life for the call to Allah, worship, and service to people, leaving an eternal legacy that changed the face of history and human civilization forever. May the peace and blessings of Allah be upon him.',
    ],
    sources: [
      { reference: 'صحيح البخاري 4451-4466 / صحيح مسلم 2444 — وفاة النبي ﷺ في حجرة عائشة', url: 'https://sunnah.com/bukhari:4451' },
      { reference: 'صحيح البخاري 4453 — أمر أبي بكر بالصلاة بالناس في مرض النبي ﷺ' },
      { reference: 'صحيح البخاري 4435 — رفع الإصبع وقول "بل الرفيق الأعلى"' },
      { reference: 'صحيح البخاري 4454 — خطبة أبي بكر "من كان يعبد محمدًا فإن محمدًا قد مات"' },
      { reference: 'سورة آل عمران 144', url: 'https://quran.com/3/144' },
      { reference: 'صحيح البخاري 2912 — لم يترك ﷺ دينارًا ولا درهمًا' },
      { reference: 'تفاصيل التاريخ بين أكثر العلماء على 12 ربيع الأول سنة 11هـ', note: 'وردت روايات أخرى (2 ربيع الأول عند ابن الكلبي وأبي مخنف)، رجّحها بعض المتأخرين كابن حجر، لكن الجمهور على 12 ربيع الأول' },
    ],
  },
];

// Suppress unused-variable warning while keeping COMMON_SOURCES available for
// future "show full source list" UI tweaks (admin panel can opt in later).
void SEERAH_COMMON_SOURCES;

// ========================================
// مكوّن القسم القابل للطيّ
// ========================================

interface SectionCardProps {
  section: SeerahSection;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}

function SectionCard({ section, index, isExpanded, onToggle, isDarkMode, colors }: SectionCardProps) {
  const isRTL = useIsRTL();
  const s = useScaledStyles(_s, colors.fs);
  const slug = sectionSlug(section.titleEn);
  const favoriteId = `seerah_${slug}`;
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    isFavorited(favoriteId, 'seerah').then(setIsFav);
  }, [favoriteId]);

  const handleToggleFav = useCallback(async (e: any) => {
    e?.stopPropagation?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowSaved = await toggleFavorite({
      id: favoriteId,
      type: 'seerah',
      title: getLanguage() === 'ar' ? section.title : section.titleEn,
      subtitle: getLanguage() === 'ar' ? section.titleEn : section.title,
      arabic: section.paragraphs[0] || section.title,
      route: `/seerah?section=${slug}`,
      meta: { chapter: index + 1 },
    });
    setIsFav(nowSaved);
  }, [favoriteId, slug, section, index]);

  return (
    <View style={s.sectionOuter}>
      {/* Section header */}
      <Pressable
        onPress={onToggle}
        style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        android_ripple={{ color: ACCENT_LIGHT, borderless: false }}
      >
        <View style={[s.sectionIconWrap, { backgroundColor: ACCENT_LIGHT }]}>
          <MaterialCommunityIcons name={section.icon} size={20} color={colors.text} />
        </View>
        <View style={s.sectionTitleWrap}>
          {getLanguage() === 'ar' ? (
            <Text style={[s.sectionTitle, { color: colors.text, textAlign: 'right', writingDirection: 'rtl' }]}>
              {section.title}
            </Text>
          ) : getLanguage() === 'en' ? (
            <Text style={[s.sectionTitle, { color: colors.text, textAlign: 'left', writingDirection: 'ltr' }]}>
              {section.titleEn}
            </Text>
          ) : (
            <TranslatedText from="en" type="section" style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {section.titleEn}
            </TranslatedText>
          )}
        </View>
        <Pressable
          onPress={handleToggleFav}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[s.sectionBadge, { backgroundColor: ACCENT_LIGHT }]}
        >
          <MaterialCommunityIcons
            name={isFav ? 'heart' : 'heart-outline'}
            size={20}
            color={isFav ? '#ef4444' : colors.text}
          />
        </Pressable>
        <View style={[s.sectionBadge, { backgroundColor: ACCENT_LIGHT }]}>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.text}
          />
        </View>
      </Pressable>

      {/* Content (collapsible) */}
      {isExpanded && (
        <View style={[s.glassOuter, isRTL ? { marginRight: 12, marginLeft: 0 } : { marginLeft: 12, marginRight: 0 }]}>
          <BlurView
           
            intensity={Platform.OS === 'ios' ? 25 : 10}
            tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.glassOverlay,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(6,79,47,0.08)'
                  : 'rgba(6,79,47,0.04)',
                borderColor: isDarkMode
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(0,0,0,0.08)',
              },
            ]}
          />
          <View style={s.glassContent}>
            <EmbeddedVideo
              source={section.videoUrl}
              title={section.videoTitle}
              colors={colors}
              style={section.paragraphs.length ? s.mediaSpacing : undefined}
              onBeforePlay={async () => {
                await showInterstitial({ allowInSacredContext: false });
              }}
            />
            {section.paragraphs.map((paragraph, pIdx) => {
              const lang = getLanguage();
              const enText = section.paragraphsEn?.[pIdx];
              if (lang === 'ar') {
                return (
                  <Text
                    key={pIdx}
                    style={[
                      s.paragraph,
                      { color: colors.text, textAlign: 'right', writingDirection: 'rtl' },
                      pIdx < section.paragraphs.length - 1 && s.paragraphSpacing,
                    ]}
                  >
                    {paragraph}
                  </Text>
                );
              }
              if (lang === 'en' && enText) {
                return (
                  <Text
                    key={pIdx}
                    style={[
                      s.paragraph,
                      { color: colors.text, textAlign: 'left', writingDirection: 'ltr' },
                      pIdx < section.paragraphs.length - 1 && s.paragraphSpacing,
                    ]}
                  >
                    {enText}
                  </Text>
                );
              }
              return (
                <TranslatedText
                  key={pIdx}
                  from="en"
                  type="section"
                  style={[
                    s.paragraph,
                    { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                    pIdx < section.paragraphs.length - 1 && s.paragraphSpacing,
                  ]}
                >
                  {enText || paragraph}
                </TranslatedText>
              );
            })}
            {(section.sources && section.sources.length > 0) ? (
              <SourcesList sources={section.sources} compact />
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

// ========================================
// مشغّل الصوت الموحّد للسيرة كاملة
// ========================================

interface SeerahAudioCardProps {
  audioUrl: string;
  colors: ReturnType<typeof useColors>;
  isDarkMode: boolean;
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
  const copy = getSeerahAudioCopy();
  const s = useScaledStyles(_s, colors.fs);
  const isRTL = useIsRTL();
  const isLoading = mode === 'loading';
  const title = isLoading ? copy.loadingAudioTitle : mode === 'offline' ? copy.noInternetTitle : copy.audioErrorTitle;
  const body = isLoading ? copy.loadingAudioBody : mode === 'offline' ? copy.noInternetBody : copy.audioErrorBody;
  const icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = isLoading ? 'headphones' : mode === 'offline' ? 'wifi-off' : 'alert-circle-outline';
  const tint = mode === 'offline' ? '#f59e0b' : mode === 'error' ? '#ef4444' : ACCENT;
  const cardBg = colors.isDarkMode ? ModalColors.cardDark : ModalColors.cardLight;
  const iconBg = colors.isDarkMode ? 'rgba(6,79,47,0.16)' : 'rgba(6,79,47,0.12)';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
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
          <Text style={[s.modalTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[s.modalBody, { color: colors.textLight }]}>{body}</Text>
          {isLoading ? (
            <Pressable
              onPress={onClose}
              style={[s.modalButton, s.modalButtonSecondary, { borderColor: colors.textLight, marginTop: 18, alignSelf: 'stretch' }]}
            >
              <Text style={[s.modalButtonText, { color: colors.text }]}>{copy.close}</Text>
            </Pressable>
          ) : (
            <View style={[s.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 18 }]}>
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

function SeerahAudioCard({ audioUrl, colors, isDarkMode }: SeerahAudioCardProps) {
  const isRTL = useIsRTL();
  const s = useScaledStyles(_s, colors.fs);
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
  const trackId = 'seerah-full-audio';
  const isThisStoryAudio = globalAudioState.source === 'azkar' && globalAudioState.currentTrackId === trackId;
  const isPlaying = isThisStoryAudio && globalAudioState.isPlaying;
  const currentPosition = isThisStoryAudio ? globalAudioState.position : 0;
  const duration = isThisStoryAudio ? globalAudioState.duration : 0;
  const isResolvingAudio = audioResolveState === 'resolving'
    || (isThisStoryAudio && globalAudioState.isLoading && !isPlaying && currentPosition === 0);
  const copy = getSeerahAudioCopy();
  const displayTitle = copy.title;
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
    resetKey: `${trackId}:${audioUrl}`,
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
    isStoryAudioCached(trackId, audioUrl)
      .then((cached) => {
        setAudioDownloadState(cached ? 'downloaded' : 'idle');
      })
      .catch(() => {});
  }, [audioUrl]);

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
    if (!audioUrl) throw new Error('missing-audio-url');
    setAudioResolveState('resolving');
    const prepared = await prepareStoryAudio(trackId, audioUrl);
    setAudioResolveState('ready');
    if (prepared.isLocal) {
      setAudioDownloadState('downloaded');
    }
    return prepared;
  }, [audioUrl]);

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

  const handlePress = useCallback(async () => {
    setAudioAttempted(true);
    setAudioModalDismissed(false);
    setAudioStartError(false);

    const hasStartedCurrentAudio = isThisStoryAudio && (isPlaying || currentPosition > 0 || duration > 0);
    const cachedLocally = await isStoryAudioCached(trackId, audioUrl);
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

    try {
      if (!prePlayAdShownRef.current && !hasStartedCurrentAudio) {
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

      const prepared = await resolveAudioForPlayback();
      await playAzkarQueue(
        [{
          id: trackId,
          title: displayTitle,
          subtitle: copy.subtitle,
          url: prepared.uri,
          forceExpoAv: true,
        }],
        0,
        '/seerah',
        { onTrackComplete: handleTrackComplete },
      );
    } catch (audioError) {
      setAudioModalDismissed(false);
      setAudioResolveState('error');
      setAudioStartError(true);
      console.log('Seerah audio playback failed', audioError);
    }
  }, [
    audioUrl,
    copy.subtitle,
    currentPosition,
    displayTitle,
    duration,
    globalAudioState.isLoading,
    handleTrackComplete,
    isPlaying,
    isThisStoryAudio,
    playAzkarQueue,
    resolveAudioForPlayback,
    toggleGlobalAudio,
  ]);

  const handleDownloadAudio = useCallback(async () => {
    if (!audioUrl || audioDownloadState === 'downloading') return;

    setAudioDownloadError(null);

    const cachedLocally = await isStoryAudioCached(trackId, audioUrl);
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
      await downloadStoryAudio(trackId, audioUrl);
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
      console.log('Seerah audio download failed', downloadError);
    }
  }, [
    audioDownloadState,
    audioUrl,
    copy.downloadFailed,
  ]);

  return (
    <>
      <View style={[s.seerahAudioOuter, isDarkMode ? { borderColor: 'rgba(255,255,255,0.08)' } : { borderColor: 'rgba(0,0,0,0.06)' }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 25 : 10}
          tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
          style={StyleSheet.absoluteFill}
        />
        <View style={[s.audioCard, { backgroundColor: 'transparent' }]}>
          <View style={[s.audioHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[s.audioIconWrap, { backgroundColor: ACCENT }]}>
              <MaterialCommunityIcons name="headphones" size={22} color="#fff" />
            </View>
            <View style={s.audioTitleWrap}>
              <Text style={[s.audioTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                {displayTitle}
              </Text>
              <Text style={[s.audioSubtitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {copy.subtitle}
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
            maximumTrackTintColor="rgba(6,79,47,0.18)"
            thumbTintColor={canSeekAudio ? ACCENT : 'rgba(255,255,255,0.45)'}
            onSlidingStart={handleSeekStart}
            onValueChange={handleSeekChange}
            onSlidingComplete={handleSeekComplete}
          />

          <View style={s.audioControlsRow}>
            <Text style={[s.audioTime, { color: colors.textLight }]}>{formattedPosition}</Text>
            <Pressable
              onPress={handlePress}
              disabled={isResolvingAudio}
              style={[s.audioPlayButton, isResolvingAudio && s.audioPlayButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'pause' : 'play'}
            >
              {isResolvingAudio ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={25} color="#fff" />
              )}
            </Pressable>
            <Text style={[s.audioTime, { color: colors.textLight }]}>{duration > 0 ? formattedDuration : '--:--'}</Text>
          </View>

          <View style={[s.audioSpeedRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[s.audioSpeedLabel, { color: colors.textLight }]}>{copy.speed}</Text>
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

          {!!audioDownloadError && (
            <Text style={[s.audioDownloadErrorText, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {audioDownloadError}
            </Text>
          )}

        </View>
      </View>
      <AudioStatusModal
        visible={showAudioModal}
        mode={audioModalMode}
        colors={colors}
        onRetry={handlePress}
        onClose={() => setAudioModalDismissed(true)}
      />
    </>
  );
}

// ========================================
// المكون الرئيسي
// ========================================

export default function SeerahScreen() {
  const { section: sectionParam } = useLocalSearchParams<{ section?: string }>();
  const { isDarkMode, t } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const s = useScaledStyles(_s, colors.fs);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));
  const scrollRef = useRef<ScrollView>(null);
  const sectionPositionsRef = useRef<Record<number, number>>({});
  const timelineOffsetRef = useRef(0);
  const handledSectionParamRef = useRef<string | null>(null);

  // CMS data with hardcoded fallback
  const { sections: seerahSections, audioUrl: seerahAudioUrl } = useSeerahContent(SEERAH_SECTIONS);

  // Auto-open + scroll to a saved chapter when navigated via ?section=<slug>
  useEffect(() => {
    if (!sectionParam || handledSectionParamRef.current === sectionParam) return;
    if (seerahSections.length === 0) return;
    const targetIndex = seerahSections.findIndex(sec => sectionSlug(sec.titleEn) === sectionParam);
    if (targetIndex < 0) return;
    handledSectionParamRef.current = sectionParam;

    setExpandedSections(prev => {
      if (prev.has(targetIndex)) return prev;
      const next = new Set(prev);
      next.add(targetIndex);
      return next;
    });

    const attemptScroll = (attempt: number) => {
      const y = sectionPositionsRef.current[targetIndex];
      if (y !== undefined && scrollRef.current) {
        const absoluteY = timelineOffsetRef.current + y;
        scrollRef.current.scrollTo({ y: Math.max(0, absoluteY - 16), animated: true });
        return;
      }
      if (attempt < 8) setTimeout(() => attemptScroll(attempt + 1), 80);
    };
    setTimeout(() => attemptScroll(0), 120);
  }, [sectionParam, seerahSections]);

  const toggleSection = useCallback((index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return (
    <ScreenContainer edges={['top', 'left', 'right']} screenKey="seerah">
      {/* Header */}
      <UniversalHeader
        backStyle={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', borderRadius: 14 }}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Text style={{ fontSize: colors.fs(18), fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('seerah.title')}</Text>
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
          <MaterialCommunityIcons name="book-account" size={36} color={colors.text} />
          <View style={s.heroTextWrap}>
            <Text style={[s.heroTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('seerah.heroTitle')}
            </Text>
            <Text style={[s.heroSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('seerah.heroSubtitle')}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        <ContentLanguageNotice />
        {/* Section count badge */}
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, flexWrap: 'wrap' }}>
          <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT, flexShrink: 1 }]}>
            <Text style={[s.countText, { color: colors.text }]}>
              {seerahSections.length} {t('seerah.chapters')}
            </Text>
          </View>
        </View>

        {/* Single audio for the whole Seerah (admin-managed) */}
        {!!seerahAudioUrl?.trim() && (
          <>
            <SeerahAudioCard
              audioUrl={seerahAudioUrl}
              colors={colors}
              isDarkMode={isDarkMode}
            />
            <View style={{ paddingHorizontal: Spacing.lg }}>
              <StoryInteractionBar
                storyId={seerahSectionId('full-audio')}
                section="seerah"
                storyTitle={t('seerah.title')}
              />
            </View>
          </>
        )}

        {/* Timeline with sections */}
        <View
          style={s.timeline}
          onLayout={(e) => {
            timelineOffsetRef.current = e.nativeEvent.layout.y;
          }}
        >
          {seerahSections.map((section, index) => (
            <View
              key={index}
              onLayout={(e) => {
                sectionPositionsRef.current[index] = e.nativeEvent.layout.y;
              }}
            >
              {/* Timeline connector line */}
              {index < seerahSections.length - 1 && (
                <View
                  style={[
                    s.timelineLine,
                    { backgroundColor: ACCENT_BORDER },
                    isRTL ? null : { left: 18, right: undefined },
                  ]}
                />
              )}
              <SectionCard
                section={section}
                index={index}
                isExpanded={expandedSections.has(index)}
                onToggle={() => toggleSection(index)}
                isDarkMode={isDarkMode}
                colors={colors}
              />
            </View>
          ))}
        </View>

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
            <TranslatedText from="ar" type="section" style={[s.footerText, { color: colors.text }]}>
              اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ
            </TranslatedText>
            <TranslatedText from="ar" type="section" style={[s.footerNote, { color: colors.textLight }]}>
              صلى الله عليه وعلى آله وصحبه وسلّم تسليمًا كثيرًا
            </TranslatedText>
          </View>
        </View>
      </ScrollView>
      <BannerAdComponent screen="seerah" />
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

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 16,
  },

  // Count badge
  countBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 16,
  },
  countText: {
    fontFamily: fontSemiBold(),
    fontSize: 13,
    lineHeight: 22,
    includeFontPadding: false,
  },
  // Timeline
  timeline: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    right: 18,
    top: 50,
    bottom: -10,
    width: 2,
    borderRadius: 1,
    zIndex: -1,
  },

  // Section
  sectionOuter: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: Spacing.md,
    paddingVertical: 4,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: fontBold(),
    fontSize: 18,
    lineHeight: 28,
  },
  sectionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Glass card
  glassOuter: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
  },
  glassContent: {
    padding: 18,
  },
  mediaSpacing: {
    marginBottom: 18,
  },
  audioCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  seerahAudioOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  audioHeaderRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 12,
  },
  audioIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTitleWrap: {
    flex: 1,
  },
  audioTitle: {
    fontFamily: fontBold(),
    fontSize: 15,
    lineHeight: 24,
  },
  audioSubtitle: {
    fontFamily: fontRegular(),
    fontSize: 12,
    lineHeight: 18,
    marginTop: 1,
  },
  audioProgressSlider: {
    width: '100%',
    height: 34,
    marginBottom: 2,
  },
  audioControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  audioTime: {
    width: 76,
    fontFamily: fontSemiBold(),
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  audioSpeedRow: {
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  audioSpeedLabel: {
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 18,
  },
  audioSpeedButton: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
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
    marginTop: 10,
  },
  audioPlayButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  audioPlayButtonDisabled: {
    opacity: 0.65,
  },
  audioError: {
    marginTop: 10,
    color: '#ff5a5f',
    fontFamily: fontSemiBold(),
    fontSize: 13,
    lineHeight: 20,
  },

  // Paragraph text
  paragraph: {
    fontFamily: fontRegular(),
    fontSize: 16,
    lineHeight: 30,
  },
  paragraphSpacing: {
    marginBottom: 16,
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
    textAlign: 'center',
    includeFontPadding: false,
  },
  modalBody: {
    fontFamily: fontRegular(),
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 18,
    textAlign: 'center',
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
