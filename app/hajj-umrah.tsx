// app/hajj-umrah.tsx
// صفحة مناسك الحج والعمرة - تصميم إنفوجرافيك

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { fontRegular } from '@/lib/fonts';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';
import { t, getLanguage } from '@/lib/i18n';
import { localizeNumber } from '@/lib/format-number';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { s } from '@/components/hajj/shared';
import {
  fetchHajjUmrahContent,
  subscribeToHajjUmrahContent,
  type HajjUmrahContent,
} from '@/lib/content-api';

// ========================================
// الألوان
// ========================================

const ACCENT = '#22C55E';
const ACCENT_LIGHT = 'rgba(6,79,47,0.12)';
const ACCENT_BORDER = 'rgba(6,79,47,0.30)';

function stripTashkeel(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

// ========================================
// أنواع البيانات
// ========================================

interface Step {
  text: string;
  en: string;
}

interface RitualSection {
  title: string;
  titleEn: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  description: string;
  descriptionEn: string;
  steps: Step[];
  duas: { arabic: string; note?: string; noteEn?: string }[];
}

// ========================================
// بيانات العمرة
// ========================================

const UMRAH_SECTIONS: RitualSection[] = [
  {
    title: 'الإحرام',
    titleEn: 'Ihram',
    icon: 'human-handsup',
    description: 'الركن الأول من أركان العمرة، وهو نية الدخول في النسك عند الميقات المحدد.',
    descriptionEn: 'The first pillar of Umrah — the intention to enter the state of consecration at the designated Miqat.',
    steps: [
      { text: 'الاغتسال والتنظّف والتطيّب قبل الإحرام.', en: 'Bathing, cleaning, and applying perfume before Ihram.' },
      { text: 'لبس ثياب الإحرام: إزار ورداء أبيضان للرجال، والمرأة تلبس ما شاءت من الثياب الساترة.', en: 'Wearing Ihram clothing: a clean white garment and robe for men. Women may wear any modest clothing.' },
      { text: 'النية بالقلب والتلفظ: "لَبَّيْكَ اللَّهُمَّ عُمْرَةً".', en: 'Making the intention and saying: "Labbayk Allahumma Umrah" (Here I am, O Allah, for Umrah).' },
      { text: 'الإكثار من التلبية من الميقات حتى بداية الطواف.', en: 'Reciting the Talbiyah frequently from the Miqat until beginning Tawaf.' },
      { text: 'تجنب محظورات الإحرام: قص الشعر والأظافر، والطيب، وتغطية الرأس للرجال، ولبس المخيط.', en: 'Avoiding Ihram prohibitions: cutting hair and nails, using perfume, covering the head and wearing stitched clothes for men.' },
    ],
    duas: [
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً',
        note: 'تلبية العمرة — عند نية الإحرام',
        noteEn: 'Umrah Talbiyah — when intending Ihram',
      },
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
        note: 'التلبية — يكررها المعتمر حتى يبدأ الطواف',
        noteEn: 'The Talbiyah — repeated until beginning Tawaf',
      },
    ],
  },
  {
    title: 'الطواف',
    titleEn: 'Tawaf',
    icon: 'rotate-3d-variant',
    description: 'الطواف حول الكعبة المشرفة سبعة أشواط، وهو الركن الثاني من أركان العمرة.',
    descriptionEn: 'Circling the Holy Kaaba seven times — the second pillar of Umrah.',
    steps: [
      { text: 'التوجه إلى الحجر الأسود واستلامه أو الإشارة إليه مع التكبير.', en: 'Approach the Black Stone, touch it or point towards it while saying Takbir.' },
      { text: 'الاضطباع: كشف الكتف الأيمن للرجال طوال الطواف.', en: 'Idtiba: uncovering the right shoulder for men during Tawaf.' },
      { text: 'الرَّمَل (الإسراع في المشي) في الأشواط الثلاثة الأولى للرجال.', en: 'Raml (walking briskly) during the first three rounds for men.' },
      { text: 'جعل الكعبة عن يسارك والطواف سبعة أشواط كاملة.', en: 'Keep the Kaaba on your left and complete seven rounds.' },
      { text: 'الدعاء بين الركن اليماني والحجر الأسود: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً...".', en: 'Supplicating between the Yemeni Corner and the Black Stone: "Our Lord, give us good in this world..."' },
      { text: 'صلاة ركعتين خلف مقام إبراهيم بعد إتمام الطواف (الكافرون والإخلاص).', en: 'Pray two Rak\'ahs behind Maqam Ibrahim after completing Tawaf (Al-Kafirun and Al-Ikhlas).' },
      { text: 'الشرب من ماء زمزم والدعاء.', en: 'Drink Zamzam water and make supplication.' },
    ],
    duas: [
      {
        arabic: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ',
        note: 'عند استلام الحجر الأسود أو الإشارة إليه',
        noteEn: 'When touching or pointing at the Black Stone',
      },
      {
        arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
        note: 'من أذكار الطواف',
        noteEn: 'From Tawaf remembrances',
      },
      {
        arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        note: 'بين الركن اليماني والحجر الأسود',
        noteEn: 'Between the Yemeni Corner and the Black Stone',
      },
      {
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا وَاسِعًا، وَشِفَاءً مِنْ كُلِّ دَاءٍ',
        note: 'عند شرب ماء زمزم',
        noteEn: 'When drinking Zamzam water',
      },
      {
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
        note: 'من أدعية الطواف',
        noteEn: 'From Tawaf supplications',
      },
      {
        arabic: 'وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى',
        note: 'عند الصلاة خلف مقام إبراهيم — البقرة ١٢٥',
        noteEn: 'When praying behind Maqam Ibrahim — Al-Baqarah 125',
      },
    ],
  },
  {
    title: 'السعي بين الصفا والمروة',
    titleEn: "Sa'i between Safa and Marwa",
    icon: 'walk',
    description: 'السعي سبعة أشواط بين جبلي الصفا والمروة اقتداءً بالسيدة هاجر عليها السلام.',
    descriptionEn: 'Walking seven rounds between the hills of Safa and Marwa, following the footsteps of Lady Hajar.',
    steps: [
      { text: 'التوجه إلى الصفا وقراءة: ﴿إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ﴾.', en: 'Head to Safa and recite: "Indeed, Safa and Marwa are among the symbols of Allah."' },
      { text: 'الصعود على الصفا والتوجه إلى الكعبة والتكبير والدعاء.', en: 'Climb Safa, face the Kaaba, say Takbir, and make supplication.' },
      { text: 'المشي من الصفا إلى المروة (شوط واحد).', en: 'Walk from Safa to Marwa (one round).' },
      { text: 'الهرولة (الإسراع) بين العلمين الأخضرين للرجال.', en: 'Jog between the two green markers for men.' },
      { text: 'الصعود على المروة والدعاء — ثم العودة إلى الصفا (شوط ثانٍ).', en: 'Climb Marwa and make supplication — then return to Safa (second round).' },
      { text: 'إتمام سبعة أشواط تنتهي بالمروة.', en: 'Complete seven rounds, ending at Marwa.' },
    ],
    duas: [
      {
        arabic: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ ۖ أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ',
        note: 'عند بداية السعي',
        noteEn: "At the beginning of Sa'i",
      },
      {
        arabic: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        note: 'على الصفا والمروة',
        noteEn: 'On Safa and Marwa',
      },
      {
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ، أَنْجَزَ وَعْدَهُ، وَنَصَرَ عَبْدَهُ، وَهَزَمَ الْأَحْزَابَ وَحْدَهُ',
        note: 'على الصفا والمروة — يُقال ثلاث مرات مع الدعاء بينها',
        noteEn: 'On Safa and Marwa — said three times with supplication in between',
      },
      {
        arabic: 'رَبِّ اغْفِرْ وَارْحَمْ إِنَّكَ أَنْتَ الْأَعَزُّ الْأَكْرَمُ',
        note: 'بين الصفا والمروة أثناء المشي',
        noteEn: 'Between Safa and Marwa while walking',
      },
    ],
  },
  {
    title: 'الحلق أو التقصير',
    titleEn: 'Shaving or Trimming',
    icon: 'content-cut',
    description: 'وهو الواجب الأخير في العمرة ويتحلل بعده المعتمر من جميع محظورات الإحرام.',
    descriptionEn: 'The final obligation of Umrah — after which all Ihram prohibitions are lifted.',
    steps: [
      { text: 'الرجل: حلق الرأس بالكامل (أفضل) أو تقصير الشعر من جميع الجهات.', en: 'Men: shave the head completely (preferred) or trim the hair evenly from all sides.' },
      { text: 'المرأة: قص أطراف الشعر بمقدار أنملة (حوالي ٢ سم).', en: 'Women: trim the tips of the hair by about a fingertip\'s length (approximately 2 cm).' },
      { text: 'بعد الحلق أو التقصير تتم العمرة ويحلّ للمعتمر جميع ما حُرِّم بالإحرام.', en: 'After shaving or trimming, Umrah is complete and all Ihram prohibitions are lifted.' },
    ],
    duas: [
      {
        arabic: 'الْحَمْدُ لِلَّهِ الَّذِي قَضَى عَنِّي نُسُكِي، اللَّهُمَّ اجْعَلْهَا عُمْرَةً مَبْرُورَةً وَذَنْبًا مَغْفُورًا',
        note: 'بعد إتمام العمرة',
        noteEn: 'After completing Umrah',
      },
    ],
  },
];

// ========================================
// بيانات الحج
// ========================================

const HAJJ_SECTIONS: RitualSection[] = [
  {
    title: 'الإحرام',
    titleEn: 'Ihram',
    icon: 'human-handsup',
    description: 'نية الدخول في نسك الحج عند الميقات المحدد — أول أركان الحج.',
    descriptionEn: 'The intention to enter into the Hajj pilgrimage at the designated Miqat — the first pillar of Hajj.',
    steps: [
      { text: 'الاغتسال والتنظّف والتطيّب قبل الإحرام.', en: 'Bathing, cleaning, and applying perfume before Ihram.' },
      { text: 'لبس ثياب الإحرام: إزار ورداء أبيضان نظيفان للرجال.', en: 'Wearing Ihram clothing: a clean white garment and robe for men.' },
      { text: 'النية والتلبية: "لَبَّيْكَ اللَّهُمَّ حَجًّا" (إفراد) أو "لَبَّيْكَ اللَّهُمَّ عُمْرَةً وَحَجًّا" (قِران) أو "لَبَّيْكَ اللَّهُمَّ عُمْرَةً" (تمتّع).', en: 'Intention and Talbiyah: "At your service, O God, perform the Hajj" (Ifrad) or "At your service, O God, for the Umrah and Hajj" (Qiran) or "At your service, O God, for the Umrah" (Tamattu).' },
      { text: 'الإكثار من التلبية حتى رمي جمرة العقبة يوم النحر.', en: 'Recite the Talbiyah frequently until throwing Jamarat al-Aqaba on the Day of Sacrifice.' },
      { text: 'تجنب محظورات الإحرام كقص الشعر والأظافر والطيب وتغطية الرأس ولبس المخيط للرجال.', en: 'Avoid Ihram prohibitions: cutting hair and nails, using perfume, covering the head and wearing stitched clothes for men.' },
    ],
    duas: [
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لاَ شَرِيكَ لَكَ',
        note: 'التلبية',
        noteEn: 'The Talbiyah',
      },
    ],
  },
  {
    title: 'طواف القدوم',
    titleEn: 'Tawaf al-Qudum (Arrival Tawaf)',
    icon: 'rotate-3d-variant',
    description: 'طواف التحية عند الوصول إلى مكة المكرمة — سنّة مؤكدة للمفرد والقارن.',
    descriptionEn: 'The greeting Tawaf upon arriving in Makkah — a confirmed Sunnah for those performing Ifrad and Qiran.',
    steps: [
      { text: 'استلام الحجر الأسود أو الإشارة إليه مع التكبير.', en: 'Touch the Black Stone or point towards it while saying Takbir.' },
      { text: 'الاضطباع والرَّمَل في الأشواط الثلاثة الأولى للرجال.', en: 'Idtiba and Raml (walking briskly) during the first three rounds for men.' },
      { text: 'الطواف سبعة أشواط حول الكعبة بدءاً من الحجر الأسود.', en: 'Perform seven rounds of Tawaf around the Kaaba starting from the Black Stone.' },
      { text: 'صلاة ركعتين خلف مقام إبراهيم.', en: 'Pray two Rak\'ahs behind Maqam Ibrahim.' },
      { text: 'الشرب من ماء زمزم والدعاء.', en: 'Drink Zamzam water and make supplication.' },
    ],
    duas: [
      {
        arabic: 'اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَشْرِيفًا وَتَعْظِيمًا وَتَكْرِيمًا وَمَهَابَةً',
        note: 'دعاء رؤية الكعبة',
        noteEn: 'Supplication upon seeing the Kaaba',
      },
      {
        arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        note: 'بين الركن اليماني والحجر الأسود',
        noteEn: 'Between the Yemeni Corner and the Black Stone',
      },
    ],
  },
  {
    title: 'السعي بين الصفا والمروة',
    titleEn: 'Sa\'i between Safa and Marwa',
    icon: 'walk',
    description: 'السعي سبعة أشواط بين الصفا والمروة — ركن من أركان الحج.',
    descriptionEn: 'Walking seven rounds between Safa and Marwa — a pillar of Hajj.',
    steps: [
      { text: 'التوجه إلى الصفا وقراءة: ﴿إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ﴾.', en: 'Head to Safa and recite: "Indeed, Safa and Marwa are among the symbols of Allah."' },
      { text: 'الصعود على الصفا والتكبير والدعاء مستقبلاً الكعبة.', en: 'Climb Safa, say Takbir, and make supplication facing the Kaaba.' },
      { text: 'السعي من الصفا إلى المروة مع الهرولة بين العلمين الأخضرين للرجال.', en: 'Walk from Safa to Marwa, jogging between the two green markers for men.' },
      { text: 'إتمام سبعة أشواط (تبدأ بالصفا وتنتهي بالمروة).', en: 'Complete seven rounds (starting at Safa and ending at Marwa).' },
    ],
    duas: [
      {
        arabic: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ ۖ أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ',
        note: 'عند بداية السعي',
        noteEn: "At the beginning of Sa'i",
      },
      {
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        note: 'على الصفا والمروة',
        noteEn: 'On Safa and Marwa',
      },
    ],
  },
  {
    title: 'يوم التروية (٨ ذو الحجة)',
    titleEn: 'Day of Tarwiyah (8th Dhul Hijjah)',
    icon: 'tent',
    description: 'التوجه إلى منى والمبيت بها استعداداً ليوم عرفة.',
    descriptionEn: 'Heading to Mina and spending the night in preparation for the Day of Arafah.',
    steps: [
      { text: 'الإحرام بالحج لمن كان متمتعاً من مكانه في مكة.', en: 'Enter Ihram for Hajj if performing Tamattu, from your place in Makkah.' },
      { text: 'التوجه إلى منى قبل الظهر.', en: 'Head to Mina before noon.' },
      { text: 'صلاة الظهر والعصر والمغرب والعشاء قصراً بلا جمع (كل صلاة في وقتها).', en: 'Pray Dhuhr, Asr, Maghrib, and Isha shortened but not combined (each at its proper time).' },
      { text: 'المبيت بمنى وصلاة فجر يوم عرفة.', en: 'Spend the night in Mina and pray Fajr on the Day of Arafah.' },
      { text: 'الإكثار من الذكر والتلبية والدعاء.', en: 'Increase in remembrance of Allah, Talbiyah, and supplication.' },
    ],
    duas: [
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ حَجًّا',
        note: 'تلبية الحج — عند الإحرام بالحج للمتمتع',
        noteEn: 'Hajj Talbiyah — when entering Ihram for Hajj (Tamattu)',
      },
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ',
        note: 'الاستمرار بالتلبية',
        noteEn: 'Continue reciting the Talbiyah',
      },
    ],
  },
  {
    title: 'يوم عرفة (٩ ذو الحجة)',
    titleEn: 'Day of Arafah (9th Dhul Hijjah)',
    icon: 'image-filter-hdr',
    description: 'ركن الحج الأعظم — قال النبي ﷺ: "الحَجُّ عَرَفَةُ". لا يصح الحج بدونه.',
    descriptionEn: 'The greatest pillar of Hajj — the Prophet ﷺ said: "Hajj is Arafah." Hajj is not valid without it.',
    steps: [
      { text: 'التوجه من منى إلى عرفة بعد طلوع الشمس.', en: 'Head from Mina to Arafah after sunrise.' },
      { text: 'صلاة الظهر والعصر جمع تقديم مع القصر بأذان واحد وإقامتين.', en: 'Pray Dhuhr and Asr combined and shortened with one Adhan and two Iqamahs.' },
      { text: 'الوقوف بعرفة من بعد الزوال إلى غروب الشمس (الركن).', en: 'Stand at Arafah from after noon until sunset (the essential pillar).' },
      { text: 'الإكثار من الدعاء والذكر والاستغفار والتضرع إلى الله.', en: 'Increase in supplication, remembrance, seeking forgiveness, and humbling yourself before Allah.' },
      { text: 'الانصراف إلى مزدلفة بعد غروب الشمس بسكينة ووقار.', en: 'Depart to Muzdalifah after sunset calmly and with dignity.' },
    ],
    duas: [
      {
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        note: 'خير الدعاء دعاء يوم عرفة',
        noteEn: 'The best supplication is on the Day of Arafah',
      },
      {
        arabic: 'اللَّهُمَّ إِنَّكَ تَسْمَعُ كَلامِي، وَتَرَى مَكَانِي، وَتَعْلَمُ سِرِّي وَعَلَانِيَتِي، لَا يَخْفَى عَلَيْكَ شَيْءٌ مِنْ أَمْرِي، أَنَا الْبَائِسُ الْفَقِيرُ، الْمُسْتَغِيثُ الْمُسْتَجِيرُ، الْوَجِلُ الْمُشْفِقُ، الْمُقِرُّ الْمُعْتَرِفُ بِذَنْبِهِ، أَسْأَلُكَ مَسْأَلَةَ الْمِسْكِينِ، وَأَبْتَهِلُ إِلَيْكَ ابْتِهَالَ الْمُذْنِبِ الذَّلِيلِ',
        note: 'من أدعية عرفة',
        noteEn: 'From Arafah supplications',
      },      {
        arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
        note: 'من أعظم الدعاء يوم عرفة',
        noteEn: 'One of the greatest supplications on Arafah',
      },
      {
        arabic: 'اللَّهُمَّ آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        note: 'من الأدعية الجامعة في عرفة',
        noteEn: 'A comprehensive supplication at Arafah',
      },
      {
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
        note: 'من أذكار يوم عرفة',
        noteEn: 'From the remembrances of the Day of Arafah',
      },
      {
        arabic: 'اللَّهُمَّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
        note: 'دعاء للوالدين وللمؤمنين يوم عرفة',
        noteEn: 'Supplication for parents and believers on Arafah',
      },    ],
  },
  {
    title: 'المبيت بمزدلفة',
    titleEn: 'Overnight Stay in Muzdalifah',
    icon: 'weather-night',
    description: 'النزول بمزدلفة بعد الإفاضة من عرفة والمبيت بها.',
    descriptionEn: 'Staying overnight in Muzdalifah after departing from Arafah.',
    steps: [
      { text: 'الإفاضة من عرفة إلى مزدلفة بسكينة بعد الغروب.', en: 'Depart from Arafah to Muzdalifah calmly after sunset.' },
      { text: 'صلاة المغرب والعشاء جمع تأخير مع القصر عند الوصول.', en: 'Pray Maghrib and Isha combined (delayed) and shortened upon arrival.' },
      { text: 'المبيت بمزدلفة (واجب) وصلاة الفجر في أول وقتها.', en: 'Spend the night in Muzdalifah (obligatory) and pray Fajr at its earliest time.' },
      { text: 'الوقوف عند المشعر الحرام والدعاء حتى الإسفار.', en: 'Stand at Al-Mash\'ar Al-Haram and supplicate until dawn.' },
      { text: 'جمع الحصى (سبعين حصاة أو أكثر) لرمي الجمرات.', en: 'Collect pebbles (seventy or more) for throwing at the Jamarat.' },
      { text: 'الانصراف إلى منى قبل طلوع الشمس.', en: 'Depart to Mina before sunrise.' },
    ],
    duas: [
      {
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ أَنْ تَرْزُقَنِيَ جَوَامِعَ الْخَيْرِ، وَأَعُوذُ بِكَ مِنْ سُوءِ الْقَضَاءِ',
        note: 'دعاء المبيت بمزدلفة',
        noteEn: 'Supplication for the overnight stay in Muzdalifah',
      },
      {
        arabic: '﴿رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ﴾',
        note: 'الوقوف بالمشعر الحرام — البقرة ٢٠١',
        noteEn: 'Standing at al-Mashar al-Haram — Al-Baqarah 201',
      },
    ],
  },
  {
    title: 'رمي الجمرات',
    titleEn: 'Throwing the Jamarat',
    icon: 'bullseye-arrow',
    description: 'رمي جمرة العقبة الكبرى يوم النحر، ثم الجمرات الثلاث أيام التشريق.',
    descriptionEn: 'Throwing at Jamarat al-Aqaba on the Day of Sacrifice, then all three Jamarat on the Days of Tashriq.',
    steps: [
      { text: 'يوم النحر (١٠ ذو الحجة): رمي جمرة العقبة الكبرى فقط بسبع حصيات بعد طلوع الشمس.', en: 'Day of Sacrifice (10th Dhul Hijjah): throw seven pebbles at Jamarat al-Aqaba only, after sunrise.' },
      { text: 'التكبير مع كل حصاة: "بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ".', en: 'Say Takbir with each pebble: "In the name of Allah, Allah is the Greatest."' },
      { text: 'قطع التلبية عند أول حصاة من رمي جمرة العقبة.', en: 'Stop the Talbiyah upon throwing the first pebble at Jamarat al-Aqaba.' },
      { text: 'أيام التشريق (١١-١٢-١٣): رمي الجمرات الثلاث كل يوم بعد الزوال.', en: 'Days of Tashriq (11-12-13): throw at all three Jamarat each day after noon.' },
      { text: 'الترتيب: الصغرى → الوسطى → الكبرى، كل واحدة بسبع حصيات.', en: 'Order: small → middle → large, seven pebbles each.' },
      { text: 'الوقوف والدعاء بعد الجمرة الصغرى والوسطى (لا يقف بعد الكبرى).', en: 'Stand and supplicate after the small and middle Jamarat (do not stand after the large one).' },
      { text: 'يجوز التعجل بالنفر يوم ١٢ قبل الغروب.', en: 'It is permissible to hasten departure on the 12th before sunset.' },
    ],
    duas: [
      {
        arabic: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ، رَغْمًا لِلشَّيْطَانِ وَحِزْبِهِ',
        note: 'عند رمي كل حصاة',
        noteEn: 'When throwing each pebble',
      },
      {
        arabic: 'اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَسَعْيًا مَشْكُورًا وَذَنْبًا مَغْفُورًا',
        note: 'دعاء بعد رمي الجمرات',
        noteEn: 'Supplication after stoning the Jamarat',
      },
    ],
  },
  {
    title: 'ذبح الهدي',
    titleEn: 'Sacrificing the Animal',
    icon: 'food-steak',
    description: 'ذبح الهدي واجب على المتمتع والقارن يوم النحر أو أيام التشريق.',
    descriptionEn: 'Sacrificing the animal is obligatory for those performing Tamattu and Qiran on the Day of Sacrifice or the Days of Tashriq.',
    steps: [
      { text: 'يُذبح الهدي بعد رمي جمرة العقبة يوم النحر.', en: 'Sacrifice the animal after throwing at Jamarat al-Aqaba on the Day of Sacrifice.' },
      { text: 'يجوز الذبح في أي يوم من أيام التشريق (١٠-١١-١٢-١٣).', en: 'Sacrifice is permissible on any of the Days of Tashriq (10-11-12-13).' },
      { text: 'يأكل الحاج من هديه ويُطعم الفقراء والمساكين.', en: 'The pilgrim eats from the sacrifice and feeds the poor and needy.' },
      { text: 'من لم يجد الهدي صام ثلاثة أيام في الحج وسبعة إذا رجع.', en: 'If unable to sacrifice, fast three days during Hajj and seven upon return.' },
    ],
    duas: [
      {
        arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ، اللَّهُمَّ مِنْكَ وَلَكَ، اللَّهُمَّ تَقَبَّلْ مِنِّي',
        note: 'عند ذبح الهدي',
        noteEn: 'When sacrificing the animal',
      },
    ],
  },
  {
    title: 'الحلق أو التقصير',
    titleEn: 'Shaving or Trimming',
    icon: 'content-cut',
    description: 'حلق الرأس أو تقصير الشعر بعد رمي جمرة العقبة وذبح الهدي — يحصل به التحلل الأول.',
    descriptionEn: 'Shaving the head or trimming the hair after throwing at Jamarat al-Aqaba and sacrificing — achieving the first release from Ihram.',
    steps: [
      { text: 'الحلق أفضل للرجال لدعاء النبي ﷺ ثلاثاً للمحلّقين ومرة للمقصّرين.', en: 'Shaving is preferred for men as the Prophet ﷺ supplicated three times for those who shave and once for those who trim.' },
      { text: 'المرأة تقص من أطراف شعرها قدر أنملة (حوالي ٢ سم).', en: 'Women trim the tips of their hair by about a fingertip\'s length (approximately 2 cm).' },
      { text: 'بعد الحلق يحصل التحلل الأول: يباح كل شيء إلا مباشرة النساء.', en: 'After shaving, the first release occurs: everything is permitted except marital relations.' },
    ],
    duas: [
      {
        arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ',
        note: 'عند الحلق',
        noteEn: 'When shaving the head',
      },
    ],
  },
  {
    title: 'طواف الإفاضة والسعي',
    titleEn: 'Tawaf al-Ifadah and Sa\'i',
    icon: 'kabaddi',
    description: 'ركن من أركان الحج لا يصح بدونه — يحصل بعده التحلل الثاني الكامل.',
    descriptionEn: 'A pillar of Hajj without which it is not valid — after which full release from Ihram is achieved.',
    steps: [
      { text: 'النزول إلى مكة والطواف حول الكعبة سبعة أشواط.', en: 'Go down to Makkah and perform seven rounds of Tawaf around the Kaaba.' },
      { text: 'صلاة ركعتين خلف مقام إبراهيم.', en: 'Pray two Rak\'ahs behind Maqam Ibrahim.' },
      { text: 'السعي بين الصفا والمروة سبعة أشواط (إن لم يكن سعى بعد طواف القدوم).', en: 'Perform Sa\'i between Safa and Marwa seven rounds (if not done after Tawaf al-Qudum).' },
      { text: 'بعد هذا الطواف يحصل التحلل الثاني: يحلّ كل شيء.', en: 'After this Tawaf, the full release occurs: everything is permitted.' },
    ],
    duas: [
      {
        arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ، وَتُبْ عَلَيْنَا إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
        note: 'بعد طواف الإفاضة',
        noteEn: 'After Tawaf al-Ifadah',
      },
    ],
  },
  {
    title: 'طواف الوداع',
    titleEn: 'Farewell Tawaf',
    icon: 'exit-run',
    description: 'آخر ما يفعله الحاج قبل مغادرة مكة — واجب على غير الحائض والنفساء.',
    descriptionEn: 'The last act the pilgrim performs before leaving Makkah — obligatory for all except menstruating and postpartum women.',
    steps: [
      { text: 'الطواف حول الكعبة سبعة أشواط وداعاً للبيت الحرام.', en: 'Perform seven farewell rounds of Tawaf around the Kaaba.' },
      { text: 'صلاة ركعتين بعد الطواف.', en: 'Pray two Rak\'ahs after Tawaf.' },
      { text: 'الوقوف عند الملتزم (بين الحجر الأسود والباب) للدعاء والتضرع.', en: 'Stand at Al-Multazam (between the Black Stone and the door) for supplication.' },
      { text: 'الخروج من المسجد الحرام وهو آخر عهده بالبيت.', en: 'Leave the Sacred Mosque as the last act of farewell to the House.' },
    ],
    duas: [
      {
        arabic: 'اللَّهُمَّ إِنَّ الْبَيْتَ بَيْتُكَ وَالْحَرَمَ حَرَمُكَ وَالْأَمْنَ أَمْنُكَ وَهَذَا مَقَامُ الْعَائِذِ بِكَ مِنَ النَّارِ',
        note: 'دعاء عند الملتزم',
        noteEn: 'Supplication at al-Multazam',
      },
      {
        arabic: 'اللَّهُمَّ يَا رَبَّ الْبَيْتِ الْعَتِيقِ، أَعْتِقْ رِقَابَنَا وَرِقَابَ آبَائِنَا وَأُمَّهَاتِنَا وَإِخْوَانِنَا وَأَوْلَادِنَا مِنَ النَّارِ',
        note: 'دعاء الوداع',
        noteEn: 'Farewell supplication',
      },
      {
        arabic: 'اللَّهُمَّ إِنَّ هَذَا بَيْتُكَ، وَأَنَا عَبْدُكَ وَابْنُ عَبْدِكَ، حَمَلْتَنِي عَلَى مَا سَخَّرْتَ لِي مِنْ خَلْقِكَ حَتَّى سَيَّرْتَنِي فِي بِلَادِكَ وَبَلَّغْتَنِي بِنِعْمَتِكَ حَتَّى أَعَنْتَنِي عَلَى قَضَاءِ مَنَاسِكِكَ، فَإِنْ كُنْتَ رَضِيتَ عَنِّي فَازْدَدْ عَنِّي رِضًا',
        note: 'دعاء عند مغادرة المسجد الحرام',
        noteEn: 'Supplication when leaving al-Masjid al-Haram',
      },
    ],
  },
];

// ========================================
// بيانات الأدعية الشاملة (التبويب الثالث)
// ========================================

interface DuaEntry {
  arabic: string;
  reference?: string;
  referenceEn?: string;
  occasion: string;
  occasionEn: string;
}

interface DuaRitualGroup {
  title: string;
  titleEn: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  duas: DuaEntry[];
}

const DUAS_BY_RITUAL: DuaRitualGroup[] = [
  {
    title: 'أدعية الإحرام والتلبية',
    titleEn: 'Ihram & Talbiyah Supplications',
    icon: 'human-handsup',
    duas: [
      { arabic: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً', reference: 'تلبية العمرة', referenceEn: 'Umrah Talbiyah', occasion: 'عند نية الإحرام بالعمرة', occasionEn: 'When intending Ihram for Umrah' },
      { arabic: 'لَبَّيْكَ اللَّهُمَّ حَجًّا', reference: 'تلبية الحج', referenceEn: 'Hajj Talbiyah', occasion: 'عند نية الإحرام بالحج (إفراد)', occasionEn: 'When intending Ihram for Hajj (Ifrad)' },
      { arabic: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً وَحَجًّا', reference: 'تلبية القِران', referenceEn: 'Qiran Talbiyah', occasion: 'عند نية الإحرام بالحج والعمرة معاً (قِران)', occasionEn: 'When intending Ihram for Hajj and Umrah together (Qiran)' },
      { arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ', reference: 'صحيح البخاري ومسلم', referenceEn: 'Sahih al-Bukhari & Muslim', occasion: 'التلبية — تُردد من الميقات باستمرار', occasionEn: 'The Talbiyah — repeated continuously from the Miqat' },
    ],
  },
  {
    title: 'أدعية الطواف',
    titleEn: 'Tawaf Supplications',
    icon: 'rotate-3d-variant',
    duas: [
      { arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ', reference: 'عند استلام الحجر', referenceEn: 'When touching the Black Stone', occasion: 'عند استلام الحجر الأسود أو الإشارة إليه في بداية كل شوط', occasionEn: 'When touching or pointing at the Black Stone at the start of each round' },
      { arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ', reference: 'من أذكار الطواف', referenceEn: 'From Tawaf remembrances', occasion: 'أثناء الطواف بين الأشواط', occasionEn: 'During Tawaf between rounds' },
      { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', reference: 'البقرة ٢٠١', referenceEn: 'Al-Baqarah 201', occasion: 'بين الركن اليماني والحجر الأسود في كل شوط', occasionEn: 'Between the Yemeni Corner and the Black Stone in each round' },
      { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', reference: 'سنن ابن ماجه', referenceEn: 'Sunan Ibn Majah', occasion: 'أثناء الطواف — يُدعى بما شاء', occasionEn: 'During Tawaf — one may supplicate freely' },
      { arabic: 'اللَّهُمَّ قَنِّعْنِي بِمَا رَزَقْتَنِي وَبَارِكْ لِي فِيهِ، وَاخْلُفْ عَلَيَّ كُلَّ غَائِبَةٍ لِي بِخَيْرٍ', reference: 'من أدعية الطواف', referenceEn: 'From Tawaf supplications', occasion: 'أثناء الطواف', occasionEn: 'During Tawaf' },
      { arabic: 'اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَشْرِيفًا وَتَعْظِيمًا وَتَكْرِيمًا وَمَهَابَةً', reference: 'رواه البيهقي', referenceEn: 'Narrated by al-Bayhaqi', occasion: 'عند رؤية الكعبة أول مرة', occasionEn: 'Upon first seeing the Kaaba' },
    ],
  },
  {
    title: 'الصلاة عند مقام إبراهيم',
    titleEn: 'Prayer at Maqam Ibrahim',
    icon: 'mosque',
    duas: [
      { arabic: 'وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى', reference: 'البقرة ١٢٥', referenceEn: 'Al-Baqarah 125', occasion: 'عند التوجه للصلاة خلف المقام بعد الطواف', occasionEn: 'When heading to pray behind the Maqam after Tawaf' },
      { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا وَاسِعًا، وَشِفَاءً مِنْ كُلِّ دَاءٍ', reference: 'حديث حسن', referenceEn: 'Hasan Hadith', occasion: 'عند شرب ماء زمزم بعد الصلاة', occasionEn: 'When drinking Zamzam water after prayer' },
    ],
  },
  {
    title: 'أدعية السعي بين الصفا والمروة',
    titleEn: "Sa'i Supplications (Safa & Marwa)",
    icon: 'walk',
    duas: [
      { arabic: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ', reference: 'البقرة ١٥٨', referenceEn: 'Al-Baqarah 158', occasion: 'عند التوجه إلى الصفا في بداية السعي — تُقرأ مرة واحدة', occasionEn: "When heading to Safa at the start of Sa'i — recited once" },
      { arabic: 'نَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ', reference: 'صحيح مسلم', referenceEn: 'Sahih Muslim', occasion: 'عند بداية السعي من الصفا', occasionEn: "At the beginning of Sa'i from Safa" },
      { arabic: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', reference: 'صحيح مسلم', referenceEn: 'Sahih Muslim', occasion: 'على الصفا والمروة — يُقال ثلاث مرات مع الدعاء بينها', occasionEn: 'On Safa and Marwa — said three times with supplication in between' },
      { arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ، أَنْجَزَ وَعْدَهُ، وَنَصَرَ عَبْدَهُ، وَهَزَمَ الْأَحْزَابَ وَحْدَهُ', reference: 'صحيح مسلم', referenceEn: 'Sahih Muslim', occasion: 'على الصفا والمروة بعد التكبير', occasionEn: 'On Safa and Marwa after Takbir' },
      { arabic: 'رَبِّ اغْفِرْ وَارْحَمْ إِنَّكَ أَنْتَ الْأَعَزُّ الْأَكْرَمُ', reference: 'رواه الطبراني', referenceEn: 'Narrated by al-Tabarani', occasion: 'بين الصفا والمروة أثناء المشي والهرولة', occasionEn: 'Between Safa and Marwa while walking and jogging' },
    ],
  },
  {
    title: 'أدعية يوم التروية (٨ ذو الحجة)',
    titleEn: 'Day of Tarwiyah Supplications (8th Dhul Hijjah)',
    icon: 'tent',
    duas: [
      { arabic: 'لَبَّيْكَ اللَّهُمَّ حَجًّا', reference: 'تلبية المتمتع', referenceEn: 'Tamattu Talbiyah', occasion: 'عند الإحرام بالحج يوم التروية للمتمتع', occasionEn: 'When entering Ihram for Hajj on the Day of Tarwiyah (Tamattu)' },
      { arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ', reference: 'صحيح البخاري', referenceEn: 'Sahih al-Bukhari', occasion: 'الاستمرار بالتلبية في منى وحتى رمي جمرة العقبة', occasionEn: 'Continue reciting Talbiyah in Mina until stoning Jamrat al-Aqabah' },
      { arabic: 'اللَّهُمَّ هَذِهِ مِنًى فَامْنُنْ عَلَيَّ بِمَا مَنَنْتَ بِهِ عَلَى أَوْلِيَائِكَ وَأَهْلِ طَاعَتِكَ', reference: 'من أدعية منى', referenceEn: 'From Mina supplications', occasion: 'عند الوصول إلى منى', occasionEn: 'Upon arriving at Mina' },
    ],
  },
  {
    title: 'أدعية يوم عرفة (٩ ذو الحجة)',
    titleEn: 'Day of Arafah Supplications (9th Dhul Hijjah)',
    icon: 'image-filter-hdr',
    duas: [
      { arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', reference: 'الترمذي — خير الدعاء دعاء يوم عرفة', referenceEn: 'al-Tirmidhi — The best supplication is on the Day of Arafah', occasion: 'أفضل ما يُقال يوم عرفة — يُكرر بكثرة', occasionEn: 'The best to say on Arafah — repeat frequently' },
      { arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', reference: 'الترمذي وابن ماجه', referenceEn: 'al-Tirmidhi & Ibn Majah', occasion: 'من أعظم الدعاء يوم عرفة', occasionEn: 'One of the greatest supplications on Arafah' },
      { arabic: 'اللَّهُمَّ آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', reference: 'البقرة ٢٠١', referenceEn: 'Al-Baqarah 201', occasion: 'من الأدعية الجامعة في عرفة', occasionEn: 'A comprehensive supplication at Arafah' },
      { arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ', reference: 'صحيح البخاري ومسلم', referenceEn: 'Sahih al-Bukhari & Muslim', occasion: 'من أذكار يوم عرفة', occasionEn: 'From the remembrances of the Day of Arafah' },
      { arabic: 'اللَّهُمَّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ', reference: 'إبراهيم ٤١', referenceEn: 'Ibrahim 41', occasion: 'دعاء للوالدين وللمؤمنين يوم عرفة', occasionEn: 'Supplication for parents and believers on Arafah' },
      { arabic: 'اللَّهُمَّ إِنَّكَ تَسْمَعُ كَلامِي، وَتَرَى مَكَانِي، وَتَعْلَمُ سِرِّي وَعَلَانِيَتِي، لَا يَخْفَى عَلَيْكَ شَيْءٌ مِنْ أَمْرِي، أَنَا الْبَائِسُ الْفَقِيرُ، الْمُسْتَغِيثُ الْمُسْتَجِيرُ، الْوَجِلُ الْمُشْفِقُ، الْمُقِرُّ الْمُعْتَرِفُ بِذَنْبِهِ، أَسْأَلُكَ مَسْأَلَةَ الْمِسْكِينِ، وَأَبْتَهِلُ إِلَيْكَ ابْتِهَالَ الْمُذْنِبِ الذَّلِيلِ', reference: 'من أدعية عرفة', referenceEn: 'From Arafah supplications', occasion: 'التضرع والابتهال في عرفة', occasionEn: 'Humble supplication and invocation at Arafah' },
      { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ', reference: 'صحيح البخاري', referenceEn: 'Sahih al-Bukhari', occasion: 'من أدعية يوم عرفة', occasionEn: 'From the supplications of the Day of Arafah' },
      { arabic: 'اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي، وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي، وَأَصْلِحْ لِي آخِرَتِي الَّتِي فِيهَا مَعَادِي', reference: 'صحيح مسلم', referenceEn: 'Sahih Muslim', occasion: 'من الأدعية الجامعة في عرفة', occasionEn: 'A comprehensive supplication at Arafah' },
    ],
  },
  {
    title: 'أدعية المزدلفة',
    titleEn: 'Muzdalifah Supplications',
    icon: 'weather-night',
    duas: [
      { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', reference: 'البقرة ٢٠١', referenceEn: 'Al-Baqarah 201', occasion: 'عند الوقوف بالمشعر الحرام بعد صلاة الفجر', occasionEn: 'At al-Mashar al-Haram after Fajr prayer' },
      { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ أَنْ تَرْزُقَنِيَ جَوَامِعَ الْخَيْرِ، وَأَعُوذُ بِكَ مِنْ سُوءِ الْقَضَاءِ', reference: 'من أدعية مزدلفة', referenceEn: 'From Muzdalifah supplications', occasion: 'ليلة المبيت بمزدلفة وعند المشعر الحرام', occasionEn: 'Night stay at Muzdalifah and at al-Mashar al-Haram' },
    ],
  },
  {
    title: 'أدعية رمي الجمرات',
    titleEn: 'Stoning the Jamarat Supplications',
    icon: 'bullseye-arrow',
    duas: [
      { arabic: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ', reference: 'سنة مؤكدة', referenceEn: 'Confirmed Sunnah', occasion: 'عند رمي كل حصاة من الحصيات السبع', occasionEn: 'When throwing each of the seven pebbles' },
      { arabic: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ، رَغْمًا لِلشَّيْطَانِ وَحِزْبِهِ', reference: 'من أدعية الرمي', referenceEn: 'From stoning supplications', occasion: 'عند رمي كل حصاة (صيغة أخرى)', occasionEn: 'When throwing each pebble (alternate wording)' },
      { arabic: 'اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَسَعْيًا مَشْكُورًا وَذَنْبًا مَغْفُورًا', reference: 'من أدعية الحج', referenceEn: 'From Hajj supplications', occasion: 'بعد رمي الجمرات والدعاء بعد الصغرى والوسطى', occasionEn: 'After stoning — supplication after the small and middle Jamarat' },
    ],
  },
  {
    title: 'دعاء الذبح',
    titleEn: 'Sacrifice Supplication',
    icon: 'food-steak',
    duas: [
      { arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ', reference: 'التسمية والتكبير', referenceEn: 'Naming Allah and Takbir', occasion: 'عند الذبح — لا بد من التسمية', occasionEn: 'When slaughtering — saying Bismillah is required' },
      { arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ، اللَّهُمَّ مِنْكَ وَلَكَ، اللَّهُمَّ تَقَبَّلْ مِنِّي', reference: 'صحيح مسلم', referenceEn: 'Sahih Muslim', occasion: 'عند ذبح الهدي — الدعاء الكامل', occasionEn: 'When sacrificing the animal — the complete supplication' },
    ],
  },
  {
    title: 'أدعية طواف الإفاضة والوداع',
    titleEn: 'Tawaf al-Ifadah & Farewell Tawaf Supplications',
    icon: 'exit-run',
    duas: [
      { arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ، وَتُبْ عَلَيْنَا إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ', reference: 'البقرة ١٢٧-١٢٨', referenceEn: 'Al-Baqarah 127-128', occasion: 'بعد طواف الإفاضة', occasionEn: 'After Tawaf al-Ifadah' },
      { arabic: 'اللَّهُمَّ إِنَّ الْبَيْتَ بَيْتُكَ وَالْحَرَمَ حَرَمُكَ وَالْأَمْنَ أَمْنُكَ وَهَذَا مَقَامُ الْعَائِذِ بِكَ مِنَ النَّارِ', reference: 'من أدعية الملتزم', referenceEn: 'From al-Multazam supplications', occasion: 'عند الملتزم — بين الحجر الأسود والباب', occasionEn: 'At al-Multazam — between the Black Stone and the door' },
      { arabic: 'اللَّهُمَّ إِنَّ هَذَا بَيْتُكَ، وَأَنَا عَبْدُكَ وَابْنُ عَبْدِكَ، حَمَلْتَنِي عَلَى مَا سَخَّرْتَ لِي مِنْ خَلْقِكَ حَتَّى سَيَّرْتَنِي فِي بِلَادِكَ وَبَلَّغْتَنِي بِنِعْمَتِكَ حَتَّى أَعَنْتَنِي عَلَى قَضَاءِ مَنَاسِكِكَ', reference: 'من أدعية الوداع', referenceEn: 'From farewell supplications', occasion: 'عند مغادرة المسجد الحرام', occasionEn: 'When leaving al-Masjid al-Haram' },
      { arabic: 'اللَّهُمَّ يَا رَبَّ الْبَيْتِ الْعَتِيقِ، أَعْتِقْ رِقَابَنَا وَرِقَابَ آبَائِنَا وَأُمَّهَاتِنَا وَإِخْوَانِنَا وَأَوْلَادِنَا مِنَ النَّارِ', reference: 'دعاء مأثور', referenceEn: 'Traditional supplication', occasion: 'دعاء الوداع عند مغادرة مكة', occasionEn: 'Farewell supplication when leaving Makkah' },
    ],
  },
];

// ========================================
// تفعيل LayoutAnimation على أندرويد
// ========================================

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ========================================
// مكون بطاقة أدعية المنسك (التبويب الثالث)
// ========================================

const DuaRitualCard: React.FC<{
  group: DuaRitualGroup;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
  initiallyExpanded?: boolean;
}> = ({ group, isDarkMode, colors, initiallyExpanded = false }) => {
  const isRTL = useIsRTL();
  const lang = getLanguage();
  const isArabic = lang === 'ar';
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const rotateAnim = useRef(new Animated.Value(initiallyExpanded ? 1 : 0)).current;

  const toggleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.spring(rotateAnim, {
      toValue: expanded ? 0 : 1,
      damping: 18,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
    setExpanded((prev) => !prev);
  }, [expanded, rotateAnim]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={s.sectionOuter}>
      <Pressable onPress={toggleExpand} style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[s.sectionIconWrap, { backgroundColor: ACCENT }]}>
          <MaterialCommunityIcons name={group.icon} size={22} color="#fff" />
        </View>
        <View style={s.sectionTitleWrap}>
          {isArabic ? (
            <Text style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{group.title}</Text>
          ) : lang === 'en' ? (
            <Text style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{group.titleEn}</Text>
          ) : (
            <TranslatedText from="en" type="section" style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{group.titleEn}</TranslatedText>
          )}
          <Text style={[s.sectionDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {group.duas.length} {group.duas.length > 10 ? t('hajj.duaWord') : group.duas.length > 2 ? t('hajj.duasWord') : t('hajj.duaWord')}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textLight} />
        </Animated.View>
      </Pressable>

      {expanded && (
        <View style={s.glassOuter}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 20}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.glassOverlay,
              {
                backgroundColor: isDarkMode ? 'rgba(30,30,32,0.55)' : 'rgba(255,255,255,0.50)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
              },
            ]}
          />
          <View style={s.glassContent}>
            {group.duas.map((dua, i) => (
              <View
                key={i}
                style={[
                  s.duaBox,
                  {
                    backgroundColor: isDarkMode ? 'rgba(6,79,47,0.10)' : 'rgba(6,79,47,0.06)',
                    borderColor: ACCENT_BORDER,
                  },
                ]}
              >
                <View style={[s.duaAccentBar, { right: isRTL ? undefined : 0, left: isRTL ? 0 : undefined }]} />
                <Text style={[s.duaArabic, { color: colors.text, textAlign: 'right', writingDirection: 'rtl' }]}>{dua.arabic}</Text>
                {dua.occasion && (
                  <View style={[s.duaMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="clock-outline" size={13} color={ACCENT} />
                    {isArabic ? (
                      <Text style={[s.duaOccasion, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{dua.occasion}</Text>
                    ) : lang === 'en' ? (
                      <Text style={[s.duaOccasion, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{dua.occasionEn}</Text>
                    ) : (
                      <TranslatedText from="en" type="section" style={[s.duaOccasion, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{dua.occasionEn}</TranslatedText>
                    )}
                  </View>
                )}
                {dua.reference && (
                  <View style={[s.duaMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="book-open-variant" size={13} color={ACCENT} />
                    {isArabic ? (
                      <Text style={[s.duaReference, { color: ACCENT, textAlign: isRTL ? 'right' : 'left' }]}>{dua.reference}</Text>
                    ) : dua.referenceEn ? (
                      lang === 'en' ? (
                        <Text style={[s.duaReference, { color: ACCENT, textAlign: isRTL ? 'right' : 'left' }]}>{dua.referenceEn}</Text>
                      ) : (
                        <TranslatedText from="en" type="section" style={[s.duaReference, { color: ACCENT, textAlign: isRTL ? 'right' : 'left' }]}>{dua.referenceEn}</TranslatedText>
                      )
                    ) : (
                      <Text style={[s.duaReference, { color: ACCENT, textAlign: isRTL ? 'right' : 'left' }]}>{dua.reference}</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// ========================================
// مكونات العرض
// ========================================

const GlassSection: React.FC<{
  section: RitualSection;
  sectionIndex: number;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
  initiallyExpanded?: boolean;
}> = ({ section, sectionIndex, isDarkMode, colors, initiallyExpanded = false }) => {
  const isRTL = useIsRTL();  const { t } = useSettings();  const lang = getLanguage();  const isArabic = lang === 'ar';  const [expanded, setExpanded] = useState(initiallyExpanded);
  const rotateAnim = useRef(new Animated.Value(initiallyExpanded ? 1 : 0)).current;

  const toggleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    Animated.spring(rotateAnim, {
      toValue: expanded ? 0 : 1,
      damping: 18,
      stiffness: 240,
      useNativeDriver: true,
    }).start();

    setExpanded((prev) => !prev);
  }, [expanded, rotateAnim]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={s.sectionOuter}>
      {/* Section header — pressable to expand/collapse */}
      <Pressable onPress={toggleExpand} style={[s.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[s.sectionIconWrap, { backgroundColor: ACCENT }]}>
          <MaterialCommunityIcons name={section.icon} size={22} color="#fff" />
        </View>
        <View style={s.sectionTitleWrap}>
          {isArabic ? (
            <Text style={[s.sectionTitle, { color: colors.text, textAlign: 'right' }]}>
              {section.title}
            </Text>
          ) : lang === 'en' ? (
            <Text style={[s.sectionTitle, { color: colors.text, textAlign: 'left' }]}>
              {section.titleEn || section.title}
            </Text>
          ) : (
            <TranslatedText from="en" type="section" style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {section.titleEn || section.title}
            </TranslatedText>
          )}
          {isArabic ? (
            <Text style={[s.sectionDesc, { color: colors.textLight, textAlign: 'right' }]} numberOfLines={expanded ? undefined : 1}>
              {section.description}
            </Text>
          ) : lang === 'en' ? (
            <Text style={[s.sectionDesc, { color: colors.textLight, textAlign: 'left' }]} numberOfLines={expanded ? undefined : 1}>
              {section.descriptionEn || section.description}
            </Text>
          ) : (
            <TranslatedText from="en" type="section" style={[s.sectionDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={expanded ? undefined : 1}>
              {section.descriptionEn || section.description}
            </TranslatedText>
          )}
        </View>
        <View style={s.sectionHeaderRight}>
          <View style={[s.sectionBadge, { backgroundColor: ACCENT_LIGHT }]}>
            <Text style={[s.sectionBadgeText, { color: ACCENT }]}>
              {localizeNumber(sectionIndex + 1)}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textLight} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Expandable content */}
      {expanded && (
        <View style={s.glassOuter}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 20}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.glassOverlay,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(30,30,32,0.55)'
                  : 'rgba(255,255,255,0.50)',
                borderColor: isDarkMode
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(0,0,0,0.06)',
              },
            ]}
          />
          <View style={s.glassContent}>
            {/* Steps list */}
            <View style={[s.stepsLabel, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="format-list-numbered" size={16} color={ACCENT} />
              <Text style={[s.stepsLabelText, { color: ACCENT }]}>{t('hajjUmrah.steps')}</Text>
            </View>
            {section.steps.map((step, i) => (
              <View key={i} style={[s.stepRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[s.stepCircle, { backgroundColor: ACCENT }]}>
                  <Text style={s.stepCircleText}>{localizeNumber(i + 1)}</Text>
                </View>
                {isArabic ? (
                  <Text style={[s.stepText, { color: colors.text, textAlign: 'right' }]}>
                    {step.text}
                  </Text>
                ) : lang === 'en' ? (
                  <Text style={[s.stepText, { color: colors.text, textAlign: 'left' }]}>
                    {step.en}
                  </Text>
                ) : (
                  <TranslatedText from="en" type="section" style={[s.stepText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                    {step.en}
                  </TranslatedText>
                )}
              </View>
            ))}

            {/* Duas */}
            {section.duas.length > 0 && (
              <View style={[s.duasContainer, { borderTopColor: ACCENT_BORDER }]}>
                <View style={[s.duasHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <MaterialCommunityIcons name="hands-pray" size={16} color={ACCENT} />
                  <Text style={[s.duasHeaderText, { color: ACCENT }]}>{t('hajjUmrah.duas')}</Text>
                </View>
                {section.duas.map((dua, i) => (
                  <View
                    key={i}
                    style={[
                      s.duaBox,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(6,79,47,0.10)'
                          : 'rgba(6,79,47,0.06)',
                        borderColor: ACCENT_BORDER,
                      },
                    ]}
                  >
                    <View style={[s.duaAccentBar, { right: isRTL ? undefined : 0, left: isRTL ? 0 : undefined }]} />
                    <Text style={[s.duaArabic, { color: colors.text, textAlign: 'right', writingDirection: 'rtl' }]}>
                      {dua.arabic}
                    </Text>
                    {dua.note && (
                      isArabic ? (
                        <Text style={[s.duaNote, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                          {`— ${dua.note}`}
                        </Text>
                      ) : dua.noteEn ? (
                        lang === 'en' ? (
                          <Text style={[s.duaNote, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                            {`— ${dua.noteEn}`}
                          </Text>
                        ) : (
                          <TranslatedText from="en" type="section" style={[s.duaNote, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                            {`— ${dua.noteEn}`}
                          </TranslatedText>
                        )
                      ) : (
                        <TranslatedText from="ar" type="section" style={[s.duaNote, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                          {`— ${dua.note}`}
                        </TranslatedText>
                      )
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

// Re-export data and components for hajj.tsx and umrah.tsx
export { UMRAH_SECTIONS, HAJJ_SECTIONS, DUAS_BY_RITUAL };
export { DuaRitualCard, GlassSection };
export type { RitualSection, DuaRitualGroup };

// ========================================
// Hook: CMS data with hardcoded fallback
// ========================================

export function useHajjUmrahContent() {
  const [hajjSections, setHajjSections] = useState<RitualSection[]>(HAJJ_SECTIONS);
  const [umrahSections, setUmrahSections] = useState<RitualSection[]>(UMRAH_SECTIONS);
  const [duasByRitual, setDuasByRitual] = useState<DuaRitualGroup[]>(DUAS_BY_RITUAL);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Try to load CMS data, fall back to hardcoded
    fetchHajjUmrahContent().then((data) => {
      if (data) applyData(data);
    });

    // Subscribe for real-time updates
    unsubscribe = subscribeToHajjUmrahContent((data) => {
      applyData(data);
    });

    return () => unsubscribe?.();
  }, []);

  const applyData = (data: HajjUmrahContent) => {
    // Merge CMS data with hardcoded defaults to preserve English fields
    if (data.hajjSections?.length) {
      setHajjSections(data.hajjSections.map((cms, i) => {
        const hc = HAJJ_SECTIONS[i];
        if (!hc) return cms as RitualSection;
        return {
          ...hc,
          ...cms,
          titleEn: (cms as any).titleEn || hc.titleEn,
          descriptionEn: (cms as any).descriptionEn || hc.descriptionEn,
          steps: cms.steps?.map((s, si) => ({
            ...s,
            en: (s as any).en || hc.steps?.[si]?.en,
          })) || hc.steps,
        } as RitualSection;
      }));
    }
    if (data.umrahSections?.length) {
      setUmrahSections(data.umrahSections.map((cms, i) => {
        const hc = UMRAH_SECTIONS[i];
        if (!hc) return cms as RitualSection;
        return {
          ...hc,
          ...cms,
          titleEn: (cms as any).titleEn || hc.titleEn,
          descriptionEn: (cms as any).descriptionEn || hc.descriptionEn,
          steps: cms.steps?.map((s, si) => ({
            ...s,
            en: (s as any).en || hc.steps?.[si]?.en,
          })) || hc.steps,
        } as RitualSection;
      }));
    }
    if (data.duasByRitual?.length) setDuasByRitual(data.duasByRitual as DuaRitualGroup[]);
  };

  return { hajjSections, umrahSections, duasByRitual };
}

// ========================================
// المكون الرئيسي
// ========================================

export default function HajjUmrahScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  React.useEffect(() => {
    if (tab === 'hajj') {
      router.replace('/hajj');
    } else {
      router.replace('/umrah');
    }
  }, [tab]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: fontRegular(), fontSize: 16, opacity: 0.5 }}>
        {t('common.loading')}
      </Text>
    </View>
  );
}
