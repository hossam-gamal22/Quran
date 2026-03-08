// app/hajj-umrah.tsx
// صفحة مناسك الحج والعمرة - تصميم إنفوجرافيك

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { ScreenContainer } from '@/components/screen-container';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { exportAsPDF, showAdThenExport } from '@/lib/pdf-export';

// ========================================
// الألوان
// ========================================

const ACCENT = '#2f7659';
const ACCENT_LIGHT = 'rgba(47,118,89,0.12)';
const ACCENT_BORDER = 'rgba(47,118,89,0.30)';

// ========================================
// الأرقام العربية
// ========================================

const ARABIC_NUMS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢', '١٣'];

// ========================================
// أنواع البيانات
// ========================================

interface Step {
  text: string;
}

interface RitualSection {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  description: string;
  steps: Step[];
  duas: { arabic: string; note?: string }[];
}

// ========================================
// بيانات العمرة
// ========================================

const UMRAH_SECTIONS: RitualSection[] = [
  {
    title: 'الإحرام',
    icon: 'human-handsup',
    description: 'الركن الأول من أركان العمرة، وهو نية الدخول في النسك عند الميقات المحدد.',
    steps: [
      { text: 'الاغتسال والتنظّف والتطيّب قبل الإحرام.' },
      { text: 'لبس ثياب الإحرام: إزار ورداء أبيضان للرجال، والمرأة تلبس ما شاءت من الثياب الساترة.' },
      { text: 'النية بالقلب والتلفظ: "لَبَّيْكَ اللَّهُمَّ عُمْرَةً".' },
      { text: 'الإكثار من التلبية من الميقات حتى بداية الطواف.' },
      { text: 'تجنب محظورات الإحرام: قص الشعر والأظافر، والطيب، وتغطية الرأس للرجال، ولبس المخيط.' },
    ],
    duas: [
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً',
        note: 'تلبية العمرة — عند نية الإحرام',
      },
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لاَ شَرِيكَ لَكَ',
        note: 'التلبية — يكررها المعتمر حتى يبدأ الطواف',
      },
    ],
  },
  {
    title: 'الطواف',
    icon: 'rotate-3d-variant',
    description: 'الطواف حول الكعبة المشرفة سبعة أشواط، وهو الركن الثاني من أركان العمرة.',
    steps: [
      { text: 'التوجه إلى الحجر الأسود واستلامه أو الإشارة إليه مع التكبير.' },
      { text: 'الاضطباع: كشف الكتف الأيمن للرجال طوال الطواف.' },
      { text: 'الرَّمَل (الإسراع في المشي) في الأشواط الثلاثة الأولى للرجال.' },
      { text: 'جعل الكعبة عن يسارك والطواف سبعة أشواط كاملة.' },
      { text: 'الدعاء بين الركن اليماني والحجر الأسود: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً...".' },
      { text: 'صلاة ركعتين خلف مقام إبراهيم بعد إتمام الطواف (الكافرون والإخلاص).' },
      { text: 'الشرب من ماء زمزم والدعاء.' },
    ],
    duas: [
      {
        arabic: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ',
        note: 'عند استلام الحجر الأسود أو الإشارة إليه',
      },
      {
        arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
        note: 'من أذكار الطواف',
      },
      {
        arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        note: 'بين الركن اليماني والحجر الأسود',
      },
      {
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا وَاسِعًا، وَشِفَاءً مِنْ كُلِّ دَاءٍ',
        note: 'عند شرب ماء زمزم',
      },
      {
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
        note: 'من أدعية الطواف',
      },
      {
        arabic: 'وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى',
        note: 'عند الصلاة خلف مقام إبراهيم — البقرة ١٢٥',
      },
    ],
  },
  {
    title: 'السعي بين الصفا والمروة',
    icon: 'walk',
    description: 'السعي سبعة أشواط بين جبلي الصفا والمروة اقتداءً بالسيدة هاجر عليها السلام.',
    steps: [
      { text: 'التوجه إلى الصفا وقراءة: ﴿إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ﴾.' },
      { text: 'الصعود على الصفا والتوجه إلى الكعبة والتكبير والدعاء.' },
      { text: 'المشي من الصفا إلى المروة (شوط واحد).' },
      { text: 'الهرولة (الإسراع) بين العلمين الأخضرين للرجال.' },
      { text: 'الصعود على المروة والدعاء — ثم العودة إلى الصفا (شوط ثانٍ).' },
      { text: 'إتمام سبعة أشواط تنتهي بالمروة.' },
    ],
    duas: [
      {
        arabic: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ ۖ أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ',
        note: 'عند بداية السعي',
      },
      {
        arabic: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        note: 'على الصفا والمروة',
      },
      {
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ، أَنْجَزَ وَعْدَهُ، وَنَصَرَ عَبْدَهُ، وَهَزَمَ الْأَحْزَابَ وَحْدَهُ',
        note: 'على الصفا والمروة — يُقال ثلاث مرات مع الدعاء بينها',
      },
      {
        arabic: 'رَبِّ اغْفِرْ وَارْحَمْ إِنَّكَ أَنْتَ الْأَعَزُّ الْأَكْرَمُ',
        note: 'بين الصفا والمروة أثناء المشي',
      },
    ],
  },
  {
    title: 'الحلق أو التقصير',
    icon: 'content-cut',
    description: 'وهو الواجب الأخير في العمرة ويتحلل بعده المعتمر من جميع محظورات الإحرام.',
    steps: [
      { text: 'الرجل: حلق الرأس بالكامل (أفضل) أو تقصير الشعر من جميع الجهات.' },
      { text: 'المرأة: قص أطراف الشعر بمقدار أنملة (حوالي ٢ سم).' },
      { text: 'بعد الحلق أو التقصير تتم العمرة ويحلّ للمعتمر جميع ما حُرِّم بالإحرام.' },
    ],
    duas: [
      {
        arabic: 'الْحَمْدُ لِلَّهِ الَّذِي قَضَى عَنِّي نُسُكِي، اللَّهُمَّ اجْعَلْهَا عُمْرَةً مَبْرُورَةً وَذَنْبًا مَغْفُورًا',
        note: 'بعد إتمام العمرة',
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
    icon: 'human-handsup',
    description: 'نية الدخول في نسك الحج عند الميقات المحدد — أول أركان الحج.',
    steps: [
      { text: 'الاغتسال والتنظّف والتطيّب قبل الإحرام.' },
      { text: 'لبس ثياب الإحرام: إزار ورداء أبيضان نظيفان للرجال.' },
      { text: 'النية والتلبية: "لَبَّيْكَ اللَّهُمَّ حَجًّا" (إفراد) أو "لَبَّيْكَ اللَّهُمَّ عُمْرَةً وَحَجًّا" (قِران) أو "لَبَّيْكَ اللَّهُمَّ عُمْرَةً" (تمتّع).' },
      { text: 'الإكثار من التلبية حتى رمي جمرة العقبة يوم النحر.' },
      { text: 'تجنب محظورات الإحرام كقص الشعر والأظافر والطيب وتغطية الرأس ولبس المخيط للرجال.' },
    ],
    duas: [
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لاَ شَرِيكَ لَكَ',
        note: 'التلبية',
      },
    ],
  },
  {
    title: 'طواف القدوم',
    icon: 'rotate-3d-variant',
    description: 'طواف التحية عند الوصول إلى مكة المكرمة — سنّة مؤكدة للمفرد والقارن.',
    steps: [
      { text: 'استلام الحجر الأسود أو الإشارة إليه مع التكبير.' },
      { text: 'الاضطباع والرَّمَل في الأشواط الثلاثة الأولى للرجال.' },
      { text: 'الطواف سبعة أشواط حول الكعبة بدءاً من الحجر الأسود.' },
      { text: 'صلاة ركعتين خلف مقام إبراهيم.' },
      { text: 'الشرب من ماء زمزم والدعاء.' },
    ],
    duas: [
      {
        arabic: 'اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَشْرِيفًا وَتَعْظِيمًا وَتَكْرِيمًا وَمَهَابَةً',
        note: 'دعاء رؤية الكعبة',
      },
      {
        arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        note: 'بين الركن اليماني والحجر الأسود',
      },
    ],
  },
  {
    title: 'السعي بين الصفا والمروة',
    icon: 'walk',
    description: 'السعي سبعة أشواط بين الصفا والمروة — ركن من أركان الحج.',
    steps: [
      { text: 'التوجه إلى الصفا وقراءة: ﴿إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ﴾.' },
      { text: 'الصعود على الصفا والتكبير والدعاء مستقبلاً الكعبة.' },
      { text: 'السعي من الصفا إلى المروة مع الهرولة بين العلمين الأخضرين للرجال.' },
      { text: 'إتمام سبعة أشواط (تبدأ بالصفا وتنتهي بالمروة).' },
    ],
    duas: [
      {
        arabic: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ ۖ أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ',
        note: 'عند بداية السعي',
      },
      {
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        note: 'على الصفا والمروة',
      },
    ],
  },
  {
    title: 'يوم التروية (٨ ذو الحجة)',
    icon: 'tent',
    description: 'التوجه إلى منى والمبيت بها استعداداً ليوم عرفة.',
    steps: [
      { text: 'الإحرام بالحج لمن كان متمتعاً من مكانه في مكة.' },
      { text: 'التوجه إلى منى قبل الظهر.' },
      { text: 'صلاة الظهر والعصر والمغرب والعشاء قصراً بلا جمع (كل صلاة في وقتها).' },
      { text: 'المبيت بمنى وصلاة فجر يوم عرفة.' },
      { text: 'الإكثار من الذكر والتلبية والدعاء.' },
    ],
    duas: [
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ حَجًّا',
        note: 'تلبية الحج — عند الإحرام بالحج للمتمتع',
      },
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لاَ شَرِيكَ لَكَ لَبَّيْكَ',
        note: 'الاستمرار بالتلبية',
      },
    ],
  },
  {
    title: 'يوم عرفة (٩ ذو الحجة)',
    icon: 'mountain',
    description: 'ركن الحج الأعظم — قال النبي ﷺ: "الحَجُّ عَرَفَةُ". لا يصح الحج بدونه.',
    steps: [
      { text: 'التوجه من منى إلى عرفة بعد طلوع الشمس.' },
      { text: 'صلاة الظهر والعصر جمع تقديم مع القصر بأذان واحد وإقامتين.' },
      { text: 'الوقوف بعرفة من بعد الزوال إلى غروب الشمس (الركن).' },
      { text: 'الإكثار من الدعاء والذكر والاستغفار والتضرع إلى الله.' },
      { text: 'الانصراف إلى مزدلفة بعد غروب الشمس بسكينة ووقار.' },
    ],
    duas: [
      {
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        note: 'خير الدعاء دعاء يوم عرفة',
      },
      {
        arabic: 'اللَّهُمَّ إِنَّكَ تَسْمَعُ كَلامِي، وَتَرَى مَكَانِي، وَتَعْلَمُ سِرِّي وَعَلَانِيَتِي، لَا يَخْفَى عَلَيْكَ شَيْءٌ مِنْ أَمْرِي، أَنَا الْبَائِسُ الْفَقِيرُ، الْمُسْتَغِيثُ الْمُسْتَجِيرُ، الْوَجِلُ الْمُشْفِقُ، الْمُقِرُّ الْمُعْتَرِفُ بِذَنْبِهِ، أَسْأَلُكَ مَسْأَلَةَ الْمِسْكِينِ، وَأَبْتَهِلُ إِلَيْكَ ابْتِهَالَ الْمُذْنِبِ الذَّلِيلِ',
        note: 'من أدعية عرفة',
      },      {
        arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
        note: 'من أعظم الدعاء يوم عرفة',
      },
      {
        arabic: 'اللَّهُمَّ آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        note: 'من الأدعية الجامعة في عرفة',
      },
      {
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
        note: 'من أذكار يوم عرفة',
      },
      {
        arabic: 'اللَّهُمَّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
        note: 'دعاء للوالدين وللمؤمنين يوم عرفة',
      },    ],
  },
  {
    title: 'المبيت بمزدلفة',
    icon: 'weather-night',
    description: 'النزول بمزدلفة بعد الإفاضة من عرفة والمبيت بها.',
    steps: [
      { text: 'الإفاضة من عرفة إلى مزدلفة بسكينة بعد الغروب.' },
      { text: 'صلاة المغرب والعشاء جمع تأخير مع القصر عند الوصول.' },
      { text: 'المبيت بمزدلفة (واجب) وصلاة الفجر في أول وقتها.' },
      { text: 'الوقوف عند المشعر الحرام والدعاء حتى الإسفار.' },
      { text: 'جمع الحصى (سبعين حصاة أو أكثر) لرمي الجمرات.' },
      { text: 'الانصراف إلى منى قبل طلوع الشمس.' },
    ],
    duas: [
      {
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ أَنْ تَرْزُقَنِيَ جَوَامِعَ الْخَيْرِ، وَأَعُوذُ بِكَ مِنْ سُوءِ الْقَضَاءِ',
        note: 'دعاء المبيت بمزدلفة',
      },
      {
        arabic: '﴿رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ﴾',
        note: 'الوقوف بالمشعر الحرام — البقرة ٢٠١',
      },
    ],
  },
  {
    title: 'رمي الجمرات',
    icon: 'bullseye-arrow',
    description: 'رمي جمرة العقبة الكبرى يوم النحر، ثم الجمرات الثلاث أيام التشريق.',
    steps: [
      { text: 'يوم النحر (١٠ ذو الحجة): رمي جمرة العقبة الكبرى فقط بسبع حصيات بعد طلوع الشمس.' },
      { text: 'التكبير مع كل حصاة: "بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ".' },
      { text: 'قطع التلبية عند أول حصاة من رمي جمرة العقبة.' },
      { text: 'أيام التشريق (١١-١٢-١٣): رمي الجمرات الثلاث كل يوم بعد الزوال.' },
      { text: 'الترتيب: الصغرى → الوسطى → الكبرى، كل واحدة بسبع حصيات.' },
      { text: 'الوقوف والدعاء بعد الجمرة الصغرى والوسطى (لا يقف بعد الكبرى).' },
      { text: 'يجوز التعجل بالنفر يوم ١٢ قبل الغروب.' },
    ],
    duas: [
      {
        arabic: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ، رَغْمًا لِلشَّيْطَانِ وَحِزْبِهِ',
        note: 'عند رمي كل حصاة',
      },
      {
        arabic: 'اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَسَعْيًا مَشْكُورًا وَذَنْبًا مَغْفُورًا',
        note: 'دعاء بعد رمي الجمرات',
      },
    ],
  },
  {
    title: 'ذبح الهدي',
    icon: 'food-steak',
    description: 'ذبح الهدي واجب على المتمتع والقارن يوم النحر أو أيام التشريق.',
    steps: [
      { text: 'يُذبح الهدي بعد رمي جمرة العقبة يوم النحر.' },
      { text: 'يجوز الذبح في أي يوم من أيام التشريق (١٠-١١-١٢-١٣).' },
      { text: 'يأكل الحاج من هديه ويُطعم الفقراء والمساكين.' },
      { text: 'من لم يجد الهدي صام ثلاثة أيام في الحج وسبعة إذا رجع.' },
    ],
    duas: [
      {
        arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ، اللَّهُمَّ مِنْكَ وَلَكَ، اللَّهُمَّ تَقَبَّلْ مِنِّي',
        note: 'عند ذبح الهدي',
      },
    ],
  },
  {
    title: 'الحلق أو التقصير',
    icon: 'content-cut',
    description: 'حلق الرأس أو تقصير الشعر بعد رمي جمرة العقبة وذبح الهدي — يحصل به التحلل الأول.',
    steps: [
      { text: 'الحلق أفضل للرجال لدعاء النبي ﷺ ثلاثاً للمحلّقين ومرة للمقصّرين.' },
      { text: 'المرأة تقص من أطراف شعرها قدر أنملة (حوالي ٢ سم).' },
      { text: 'بعد الحلق يحصل التحلل الأول: يباح كل شيء إلا مباشرة النساء.' },
    ],
    duas: [
      {
        arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ',
        note: 'عند الحلق',
      },
    ],
  },
  {
    title: 'طواف الإفاضة والسعي',
    icon: 'kabaddi',
    description: 'ركن من أركان الحج لا يصح بدونه — يحصل بعده التحلل الثاني الكامل.',
    steps: [
      { text: 'النزول إلى مكة والطواف حول الكعبة سبعة أشواط.' },
      { text: 'صلاة ركعتين خلف مقام إبراهيم.' },
      { text: 'السعي بين الصفا والمروة سبعة أشواط (إن لم يكن سعى بعد طواف القدوم).' },
      { text: 'بعد هذا الطواف يحصل التحلل الثاني: يحلّ كل شيء.' },
    ],
    duas: [
      {
        arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ، وَتُبْ عَلَيْنَا إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
        note: 'بعد طواف الإفاضة',
      },
    ],
  },
  {
    title: 'طواف الوداع',
    icon: 'exit-run',
    description: 'آخر ما يفعله الحاج قبل مغادرة مكة — واجب على غير الحائض والنفساء.',
    steps: [
      { text: 'الطواف حول الكعبة سبعة أشواط وداعاً للبيت الحرام.' },
      { text: 'صلاة ركعتين بعد الطواف.' },
      { text: 'الوقوف عند الملتزم (بين الحجر الأسود والباب) للدعاء والتضرع.' },
      { text: 'الخروج من المسجد الحرام وهو آخر عهده بالبيت.' },
    ],
    duas: [
      {
        arabic: 'اللَّهُمَّ إِنَّ الْبَيْتَ بَيْتُكَ وَالْحَرَمَ حَرَمُكَ وَالْأَمْنَ أَمْنُكَ وَهَذَا مَقَامُ الْعَائِذِ بِكَ مِنَ النَّارِ',
        note: 'دعاء عند الملتزم',
      },
      {
        arabic: 'اللَّهُمَّ يَا رَبَّ الْبَيْتِ الْعَتِيقِ، أَعْتِقْ رِقَابَنَا وَرِقَابَ آبَائِنَا وَأُمَّهَاتِنَا وَإِخْوَانِنَا وَأَوْلَادِنَا مِنَ النَّارِ',
        note: 'دعاء الوداع',
      },
      {
        arabic: 'اللَّهُمَّ إِنَّ هَذَا بَيْتُكَ، وَأَنَا عَبْدُكَ وَابْنُ عَبْدِكَ، حَمَلْتَنِي عَلَى مَا سَخَّرْتَ لِي مِنْ خَلْقِكَ حَتَّى سَيَّرْتَنِي فِي بِلَادِكَ وَبَلَّغْتَنِي بِنِعْمَتِكَ حَتَّى أَعَنْتَنِي عَلَى قَضَاءِ مَنَاسِكِكَ، فَإِنْ كُنْتَ رَضِيتَ عَنِّي فَازْدَدْ عَنِّي رِضًا',
        note: 'دعاء عند مغادرة المسجد الحرام',
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
  occasion: string;
}

interface DuaRitualGroup {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  duas: DuaEntry[];
}

const DUAS_BY_RITUAL: DuaRitualGroup[] = [
  {
    title: 'أدعية الإحرام والتلبية',
    icon: 'human-handsup',
    duas: [
      { arabic: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً', reference: 'تلبية العمرة', occasion: 'عند نية الإحرام بالعمرة' },
      { arabic: 'لَبَّيْكَ اللَّهُمَّ حَجًّا', reference: 'تلبية الحج', occasion: 'عند نية الإحرام بالحج (إفراد)' },
      { arabic: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً وَحَجًّا', reference: 'تلبية القِران', occasion: 'عند نية الإحرام بالحج والعمرة معاً (قِران)' },
      { arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ', reference: 'صحيح البخاري ومسلم', occasion: 'التلبية — تُردد من الميقات باستمرار' },
    ],
  },
  {
    title: 'أدعية الطواف',
    icon: 'rotate-3d-variant',
    duas: [
      { arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ', reference: 'عند استلام الحجر', occasion: 'عند استلام الحجر الأسود أو الإشارة إليه في بداية كل شوط' },
      { arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ', reference: 'من أذكار الطواف', occasion: 'أثناء الطواف بين الأشواط' },
      { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', reference: 'البقرة ٢٠١', occasion: 'بين الركن اليماني والحجر الأسود في كل شوط' },
      { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ', reference: 'سنن ابن ماجه', occasion: 'أثناء الطواف — يُدعى بما شاء' },
      { arabic: 'اللَّهُمَّ قَنِّعْنِي بِمَا رَزَقْتَنِي وَبَارِكْ لِي فِيهِ، وَاخْلُفْ عَلَيَّ كُلَّ غَائِبَةٍ لِي بِخَيْرٍ', reference: 'من أدعية الطواف', occasion: 'أثناء الطواف' },
      { arabic: 'اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَشْرِيفًا وَتَعْظِيمًا وَتَكْرِيمًا وَمَهَابَةً', reference: 'رواه البيهقي', occasion: 'عند رؤية الكعبة أول مرة' },
    ],
  },
  {
    title: 'الصلاة عند مقام إبراهيم',
    icon: 'mosque',
    duas: [
      { arabic: 'وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى', reference: 'البقرة ١٢٥', occasion: 'عند التوجه للصلاة خلف المقام بعد الطواف' },
      { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا وَاسِعًا، وَشِفَاءً مِنْ كُلِّ دَاءٍ', reference: 'حديث حسن', occasion: 'عند شرب ماء زمزم بعد الصلاة' },
    ],
  },
  {
    title: 'أدعية السعي بين الصفا والمروة',
    icon: 'walk',
    duas: [
      { arabic: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ', reference: 'البقرة ١٥٨', occasion: 'عند التوجه إلى الصفا في بداية السعي — تُقرأ مرة واحدة' },
      { arabic: 'نَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ', reference: 'صحيح مسلم', occasion: 'عند بداية السعي من الصفا' },
      { arabic: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', reference: 'صحيح مسلم', occasion: 'على الصفا والمروة — يُقال ثلاث مرات مع الدعاء بينها' },
      { arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ، أَنْجَزَ وَعْدَهُ، وَنَصَرَ عَبْدَهُ، وَهَزَمَ الْأَحْزَابَ وَحْدَهُ', reference: 'صحيح مسلم', occasion: 'على الصفا والمروة بعد التكبير' },
      { arabic: 'رَبِّ اغْفِرْ وَارْحَمْ إِنَّكَ أَنْتَ الْأَعَزُّ الْأَكْرَمُ', reference: 'رواه الطبراني', occasion: 'بين الصفا والمروة أثناء المشي والهرولة' },
    ],
  },
  {
    title: 'أدعية يوم التروية (٨ ذو الحجة)',
    icon: 'tent',
    duas: [
      { arabic: 'لَبَّيْكَ اللَّهُمَّ حَجًّا', reference: 'تلبية المتمتع', occasion: 'عند الإحرام بالحج يوم التروية للمتمتع' },
      { arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ', reference: 'صحيح البخاري', occasion: 'الاستمرار بالتلبية في منى وحتى رمي جمرة العقبة' },
      { arabic: 'اللَّهُمَّ هَذِهِ مِنًى فَامْنُنْ عَلَيَّ بِمَا مَنَنْتَ بِهِ عَلَى أَوْلِيَائِكَ وَأَهْلِ طَاعَتِكَ', reference: 'من أدعية منى', occasion: 'عند الوصول إلى منى' },
    ],
  },
  {
    title: 'أدعية يوم عرفة (٩ ذو الحجة)',
    icon: 'mountain',
    duas: [
      { arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', reference: 'الترمذي — خير الدعاء دعاء يوم عرفة', occasion: 'أفضل ما يُقال يوم عرفة — يُكرر بكثرة' },
      { arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', reference: 'الترمذي وابن ماجه', occasion: 'من أعظم الدعاء يوم عرفة' },
      { arabic: 'اللَّهُمَّ آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', reference: 'البقرة ٢٠١', occasion: 'من الأدعية الجامعة في عرفة' },
      { arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ', reference: 'صحيح البخاري ومسلم', occasion: 'من أذكار يوم عرفة' },
      { arabic: 'اللَّهُمَّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ', reference: 'إبراهيم ٤١', occasion: 'دعاء للوالدين وللمؤمنين يوم عرفة' },
      { arabic: 'اللَّهُمَّ إِنَّكَ تَسْمَعُ كَلامِي، وَتَرَى مَكَانِي، وَتَعْلَمُ سِرِّي وَعَلَانِيَتِي، لَا يَخْفَى عَلَيْكَ شَيْءٌ مِنْ أَمْرِي، أَنَا الْبَائِسُ الْفَقِيرُ، الْمُسْتَغِيثُ الْمُسْتَجِيرُ، الْوَجِلُ الْمُشْفِقُ، الْمُقِرُّ الْمُعْتَرِفُ بِذَنْبِهِ، أَسْأَلُكَ مَسْأَلَةَ الْمِسْكِينِ، وَأَبْتَهِلُ إِلَيْكَ ابْتِهَالَ الْمُذْنِبِ الذَّلِيلِ', reference: 'من أدعية عرفة', occasion: 'التضرع والابتهال في عرفة' },
      { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ', reference: 'صحيح البخاري', occasion: 'من أدعية يوم عرفة' },
      { arabic: 'اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي، وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي، وَأَصْلِحْ لِي آخِرَتِي الَّتِي فِيهَا مَعَادِي', reference: 'صحيح مسلم', occasion: 'من الأدعية الجامعة في عرفة' },
    ],
  },
  {
    title: 'أدعية المزدلفة',
    icon: 'weather-night',
    duas: [
      { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', reference: 'البقرة ٢٠١', occasion: 'عند الوقوف بالمشعر الحرام بعد صلاة الفجر' },
      { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ أَنْ تَرْزُقَنِيَ جَوَامِعَ الْخَيْرِ، وَأَعُوذُ بِكَ مِنْ سُوءِ الْقَضَاءِ', reference: 'من أدعية مزدلفة', occasion: 'ليلة المبيت بمزدلفة وعند المشعر الحرام' },
    ],
  },
  {
    title: 'أدعية رمي الجمرات',
    icon: 'bullseye-arrow',
    duas: [
      { arabic: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ', reference: 'سنة مؤكدة', occasion: 'عند رمي كل حصاة من الحصيات السبع' },
      { arabic: 'بِسْمِ اللَّهِ، اللَّهُ أَكْبَرُ، رَغْمًا لِلشَّيْطَانِ وَحِزْبِهِ', reference: 'من أدعية الرمي', occasion: 'عند رمي كل حصاة (صيغة أخرى)' },
      { arabic: 'اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَسَعْيًا مَشْكُورًا وَذَنْبًا مَغْفُورًا', reference: 'من أدعية الحج', occasion: 'بعد رمي الجمرات والدعاء بعد الصغرى والوسطى' },
    ],
  },
  {
    title: 'دعاء الذبح',
    icon: 'food-steak',
    duas: [
      { arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ', reference: 'التسمية والتكبير', occasion: 'عند الذبح — لا بد من التسمية' },
      { arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ، اللَّهُمَّ مِنْكَ وَلَكَ، اللَّهُمَّ تَقَبَّلْ مِنِّي', reference: 'صحيح مسلم', occasion: 'عند ذبح الهدي — الدعاء الكامل' },
    ],
  },
  {
    title: 'أدعية طواف الإفاضة والوداع',
    icon: 'exit-run',
    duas: [
      { arabic: 'رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ، وَتُبْ عَلَيْنَا إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ', reference: 'البقرة ١٢٧-١٢٨', occasion: 'بعد طواف الإفاضة' },
      { arabic: 'اللَّهُمَّ إِنَّ الْبَيْتَ بَيْتُكَ وَالْحَرَمَ حَرَمُكَ وَالْأَمْنَ أَمْنُكَ وَهَذَا مَقَامُ الْعَائِذِ بِكَ مِنَ النَّارِ', reference: 'من أدعية الملتزم', occasion: 'عند الملتزم — بين الحجر الأسود والباب' },
      { arabic: 'اللَّهُمَّ إِنَّ هَذَا بَيْتُكَ، وَأَنَا عَبْدُكَ وَابْنُ عَبْدِكَ، حَمَلْتَنِي عَلَى مَا سَخَّرْتَ لِي مِنْ خَلْقِكَ حَتَّى سَيَّرْتَنِي فِي بِلَادِكَ وَبَلَّغْتَنِي بِنِعْمَتِكَ حَتَّى أَعَنْتَنِي عَلَى قَضَاءِ مَنَاسِكِكَ', reference: 'من أدعية الوداع', occasion: 'عند مغادرة المسجد الحرام' },
      { arabic: 'اللَّهُمَّ يَا رَبَّ الْبَيْتِ الْعَتِيقِ، أَعْتِقْ رِقَابَنَا وَرِقَابَ آبَائِنَا وَأُمَّهَاتِنَا وَإِخْوَانِنَا وَأَوْلَادِنَا مِنَ النَّارِ', reference: 'دعاء مأثور', occasion: 'دعاء الوداع عند مغادرة مكة' },
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
      <Pressable onPress={toggleExpand} style={s.sectionHeader}>
        <View style={[s.sectionIconWrap, { backgroundColor: ACCENT }]}>
          <MaterialCommunityIcons name={group.icon} size={22} color="#fff" />
        </View>
        <View style={s.sectionTitleWrap}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>{group.title}</Text>
          <Text style={[s.sectionDesc, { color: colors.textLight }]} numberOfLines={1}>
            {group.duas.length} {group.duas.length > 10 ? 'دعاء' : group.duas.length > 2 ? 'أدعية' : 'دعاء'}
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
                    backgroundColor: isDarkMode ? 'rgba(47,118,89,0.10)' : 'rgba(47,118,89,0.06)',
                    borderColor: ACCENT_BORDER,
                  },
                ]}
              >
                <View style={s.duaAccentBar} />
                <Text style={[s.duaArabic, { color: colors.text }]}>{dua.arabic}</Text>
                {dua.occasion && (
                  <View style={s.duaMetaRow}>
                    <MaterialCommunityIcons name="clock-outline" size={13} color={ACCENT} />
                    <Text style={[s.duaOccasion, { color: colors.textLight }]}>{dua.occasion}</Text>
                  </View>
                )}
                {dua.reference && (
                  <View style={s.duaMetaRow}>
                    <MaterialCommunityIcons name="book-open-variant" size={13} color={ACCENT} />
                    <Text style={[s.duaReference, { color: ACCENT }]}>{dua.reference}</Text>
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
      {/* Section header — pressable to expand/collapse */}
      <Pressable onPress={toggleExpand} style={s.sectionHeader}>
        <View style={[s.sectionIconWrap, { backgroundColor: ACCENT }]}>
          <MaterialCommunityIcons name={section.icon} size={22} color="#fff" />
        </View>
        <View style={s.sectionTitleWrap}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>
            {section.title}
          </Text>
          <Text style={[s.sectionDesc, { color: colors.textLight }]} numberOfLines={expanded ? undefined : 1}>
            {section.description}
          </Text>
        </View>
        <View style={s.sectionHeaderRight}>
          <View style={[s.sectionBadge, { backgroundColor: ACCENT_LIGHT }]}>
            <Text style={[s.sectionBadgeText, { color: ACCENT }]}>
              {ARABIC_NUMS[sectionIndex + 1]}
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
            <View style={s.stepsLabel}>
              <MaterialCommunityIcons name="format-list-numbered" size={16} color={ACCENT} />
              <Text style={[s.stepsLabelText, { color: ACCENT }]}>الخطوات</Text>
            </View>
            {section.steps.map((step, i) => (
              <View key={i} style={s.stepRow}>
                <View style={[s.stepCircle, { backgroundColor: ACCENT }]}>
                  <Text style={s.stepCircleText}>{ARABIC_NUMS[i + 1]}</Text>
                </View>
                <Text style={[s.stepText, { color: colors.text }]}>
                  {step.text}
                </Text>
              </View>
            ))}

            {/* Duas */}
            {section.duas.length > 0 && (
              <View style={[s.duasContainer, { borderTopColor: ACCENT_BORDER }]}>
                <View style={s.duasHeader}>
                  <MaterialCommunityIcons name="hands-pray" size={16} color={ACCENT} />
                  <Text style={[s.duasHeaderText, { color: ACCENT }]}>الأدعية</Text>
                </View>
                {section.duas.map((dua, i) => (
                  <View
                    key={i}
                    style={[
                      s.duaBox,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(47,118,89,0.10)'
                          : 'rgba(47,118,89,0.06)',
                        borderColor: ACCENT_BORDER,
                      },
                    ]}
                  >
                    <View style={s.duaAccentBar} />
                    <Text style={[s.duaArabic, { color: colors.text }]}>
                      {dua.arabic}
                    </Text>
                    {dua.note && (
                      <Text style={[s.duaNote, { color: colors.textLight }]}>
                        — {dua.note}
                      </Text>
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

// ========================================
// المكون الرئيسي
// ========================================

export default function HajjUmrahScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const colors = useColors();
  const [activeTab, setActiveTab] = React.useState<'umrah' | 'hajj' | 'duas'>('umrah');

  const sections = activeTab === 'hajj' ? HAJJ_SECTIONS : UMRAH_SECTIONS;

  const handleExportPDF = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTab === 'duas') {
      const title = 'أدعية الحج والعمرة';
      const html = DUAS_BY_RITUAL.map((group, i) => {
        const duasHtml = group.duas.map(d =>
          `<div class="dua-box"><div class="dua-arabic">${d.arabic}</div>${d.occasion ? `<div class="dua-note">متى: ${d.occasion}</div>` : ''}${d.reference ? `<div class="dua-note">المرجع: ${d.reference}</div>` : ''}</div>`
        ).join('');
        return `<div class="section"><div class="section-title">${i + 1}. ${group.title}</div>${duasHtml}</div>`;
      }).join('');
      showAdThenExport(() => exportAsPDF(title, html));
      return;
    }
    const title = activeTab === 'hajj' ? 'مناسك الحج' : 'مناسك العمرة';
    const html = sections.map((sec, i) => {
      const stepsHtml = sec.steps.map((step, j) =>
        `<div class="step"><span class="step-num">${j + 1}</span><span class="step-text">${step.text}</span></div>`
      ).join('');
      const duasHtml = sec.duas.map(d =>
        `<div class="dua-box"><div class="dua-arabic">${d.arabic}</div>${d.note ? `<div class="dua-note">— ${d.note}</div>` : ''}</div>`
      ).join('');
      return `<div class="section">
        <div class="section-title">${i + 1}. ${sec.title}</div>
        <div class="section-desc">${sec.description}</div>
        <div class="steps-label">الخطوات:</div>
        ${stepsHtml}
        ${duasHtml ? `<div style="margin-top:12px"><div class="steps-label">الأدعية:</div>${duasHtml}</div>` : ''}
      </div>`;
    }).join('');
    showAdThenExport(() => exportAsPDF(title, html));
  }, [activeTab, sections]);

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.18)' }]}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={28}
            color={colors.text}
          />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>
          مناسك الحج والعمرة
        </Text>
        <Pressable
          onPress={handleExportPDF}
          style={[s.backBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.18)' }]}
        >
          <MaterialCommunityIcons name="file-pdf-box" size={24} color={colors.text} />
        </Pressable>
      </View>

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
        <View style={s.heroContent}>
          <MaterialCommunityIcons name="mosque" size={36} color={ACCENT} />
          <View style={s.heroTextWrap}>
            <Text style={[s.heroTitle, { color: colors.text }]}>
              {activeTab === 'hajj' ? 'دليل مناسك الحج' : activeTab === 'umrah' ? 'دليل مناسك العمرة' : 'أدعية الحج والعمرة'}
            </Text>
            <Text style={[s.heroSub, { color: colors.textLight }]}>
              {activeTab === 'hajj'
                ? 'خطوات الحج كاملة مع الأدعية المأثورة'
                : activeTab === 'umrah'
                ? 'خطوات العمرة كاملة مع الأدعية المأثورة'
                : 'جميع الأدعية المأثورة مرتبة حسب المنسك'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <NativeTabs
        tabs={[
          { key: 'umrah', label: 'العمرة' },
          { key: 'hajj', label: 'الحج' },
          { key: 'duas', label: 'الأدعية' },
        ]}
        selected={activeTab}
        onSelect={(key) => setActiveTab(key as 'umrah' | 'hajj' | 'duas')}
        indicatorColor={ACCENT}
      />

      {/* Content */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {activeTab === 'duas' ? (
          <>
            {/* Duas count badge */}
            <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT }]}>
              <Text style={[s.countText, { color: ACCENT }]}>
                {DUAS_BY_RITUAL.reduce((sum, g) => sum + g.duas.length, 0)} دعاء • {DUAS_BY_RITUAL.length} أقسام
              </Text>
            </View>

            {/* Duas by ritual */}
            {DUAS_BY_RITUAL.map((group, index) => (
              <DuaRitualCard
                key={`duas-${index}`}
                group={group}
                isDarkMode={isDarkMode}
                colors={colors}
                initiallyExpanded={index === 0}
              />
            ))}
          </>
        ) : (
          <>
            {/* Section count badge */}
            <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT }]}>
              <Text style={[s.countText, { color: ACCENT }]}>
                {sections.length} مناسك
              </Text>
            </View>

            {/* Timeline connector + sections */}
            <View style={s.timeline}>
              {sections.map((section, index) => (
                <View key={`${activeTab}-${index}`}>
                  {/* Timeline connector line */}
                  {index < sections.length - 1 && (
                    <View
                      style={[
                        s.timelineLine,
                        { backgroundColor: ACCENT_BORDER },
                      ]}
                    />
                  )}
                  <GlassSection
                    section={section}
                    sectionIndex={index}
                    isDarkMode={isDarkMode}
                    colors={colors}
                    initiallyExpanded={index === 0}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer dua */}
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
              اللَّهُمَّ تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ
            </Text>
            <Text style={[s.footerNote, { color: colors.textLight }]}>
              نسأل الله أن يتقبل منكم ويرزقكم حجاً مبروراً وعمرة مقبولة
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ========================================
// الأنماط
// ========================================

const s = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 20,
  },

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
    gap: 16,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: 19,
    lineHeight: 30,
  },
  heroSub: {
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-SemiBold',
    fontSize: 13,
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
    gap: 12,
    paddingVertical: 4,
  },
  sectionHeaderRight: {
    alignItems: 'center',
    gap: 4,
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
    fontFamily: 'Cairo-Bold',
    fontSize: 18,
    lineHeight: 28,
  },
  sectionDesc: {
    fontFamily: 'Cairo-Regular',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  sectionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 14,
  },

  // Glass card
  glassOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
  },
  glassContent: {
    padding: 18,
  },

  // Steps
  stepsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  stepsLabelText: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepCircleText: {
    fontFamily: 'Cairo-Bold',
    fontSize: 13,
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontFamily: 'Cairo-Regular',
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'right',
  },

  // Duas
  duasContainer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  duasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  duasHeaderText: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 14,
  },
  duaBox: {
    borderRadius: 14,
    padding: 16,
    paddingRight: 22,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    overflow: 'hidden',
  },
  duaAccentBar: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  duaArabic: {
    fontFamily: 'Cairo-Regular',
    fontSize: 17,
    lineHeight: 32,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  duaNote: {
    fontFamily: 'Cairo-Regular',
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'right',
    marginTop: 8,
  },

  // Duas tab meta
  duaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  duaOccasion: {
    fontFamily: 'Cairo-Regular',
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'right',
    flex: 1,
  },
  duaReference: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'right',
    flex: 1,
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
    gap: 10,
  },
  footerText: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 17,
    lineHeight: 32,
    textAlign: 'center',
  },
  footerNote: {
    fontFamily: 'Cairo-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 22,
  },
});
