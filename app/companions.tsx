// app/companions.tsx
// صفحة قصص الصحابة - روح المسلم

import React, { useState, useCallback, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { ScreenContainer } from '@/components/screen-container';
import { exportAsPDF, showAdThenExport } from '@/lib/pdf-export';

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
  story: string[];
  virtues: string[];
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
    story: [
      'هو عبد الله بن عثمان بن عامر القرشي التيمي، رضي الله عنه. وُلد بمكة سنة 573م، وكان من أشراف قريش وعلمائها بالأنساب. لُقِّب بالصدِّيق لتصديقه النبي ﷺ في كل ما جاء به، وخاصة في حادثة الإسراء والمعراج حين قال: "إن كان قاله فقد صدق".',
      'كان أول من أسلم من الرجال الأحرار، وأنفق ماله كله في سبيل الله. اشترى عدداً من العبيد المعذَّبين فأعتقهم، منهم بلال بن رباح رضي الله عنه. وكان رفيق النبي ﷺ في الهجرة إلى المدينة، واختبأ معه في غار ثور.',
      'بويع بالخلافة بعد وفاة النبي ﷺ، وكان أول أعماله حروب الردة التي حفظ بها الإسلام. ثبّت الله به الأمة في أحلك الظروف حين قال: "من كان يعبد محمداً فإن محمداً قد مات، ومن كان يعبد الله فإن الله حي لا يموت." جمع القرآن الكريم في عهده بعد استشهاد كثير من الحفاظ في حروب الردة.',
      'توفي رضي الله عنه سنة 13 هـ عن عمر يناهز 63 سنة، ودُفن بجوار النبي ﷺ في المسجد النبوي.',
    ],
    virtues: ['أول من أسلم من الرجال', 'رفيق النبي ﷺ في الهجرة', 'أول الخلفاء الراشدين', 'أنفق ماله كله في سبيل الله'],
  },
  {
    id: 'umar',
    nameAr: 'عمر بن الخطاب',
    nameEn: 'Umar ibn Al-Khattab',
    category: 'ashara',
    brief: 'الفاروق، ثاني الخلفاء الراشدين',
    story: [
      'هو عمر بن الخطاب العدوي القرشي، رضي الله عنه، لُقِّب بالفاروق لأن الله فرّق به بين الحق والباطل. أسلم في السنة السادسة من البعثة، وكان إسلامه عزاً للمسلمين. قال النبي ﷺ: "اللهم أعِزّ الإسلام بأحب الرجلين إليك: عمر بن الخطاب أو أبي جهل." فكان عمر.',
      'كان شديداً في الحق، عادلاً في حكمه. فتحت في عهده بلاد الشام والعراق ومصر وفارس. وهو أول من دوّن الدواوين، ووضع التقويم الهجري، وأسس نظام القضاء. كان يتفقد رعيته بالليل ويقول: "لو عثرت بغلة في العراق لخشيت أن يسألني الله عنها: لِمَ لَم تُسوِّ لها الطريق يا عمر؟"',
      'من أشهر مواقفه فتح بيت المقدس سنة 15 هـ، حين جاء بنفسه لتسلّم مفاتيح المدينة من البطريرك صفرونيوس. ورفض الصلاة في كنيسة القيامة حتى لا يتخذها المسلمون مسجداً من بعده.',
      'استشهد رضي الله عنه سنة 23 هـ، طعنه أبو لؤلؤة المجوسي وهو يصلي الفجر. ودُفن بجوار النبي ﷺ وأبي بكر.',
    ],
    virtues: ['الفاروق بين الحق والباطل', 'فاتح بيت المقدس', 'أول من وضع التقويم الهجري', 'عُرف بالعدل والزهد'],
  },
  {
    id: 'uthman',
    nameAr: 'عثمان بن عفان',
    nameEn: 'Uthman ibn Affan',
    category: 'ashara',
    brief: 'ذو النورين، ثالث الخلفاء الراشدين',
    story: [
      'هو عثمان بن عفان الأموي القرشي، رضي الله عنه. لُقِّب بذي النورين لزواجه من ابنتي النبي ﷺ: رُقية ثم أم كلثوم. كان من أوائل من أسلم، وهاجر الهجرتين إلى الحبشة ثم إلى المدينة.',
      'كان أكثر قريش مالاً وأسخاهم يداً. جهّز جيش العُسرة بأكمله في غزوة تبوك حتى قال النبي ﷺ: "ما ضرّ عثمان ما عمل بعد اليوم." واشترى بئر رومة وجعلها وقفاً للمسلمين.',
      'في خلافته جُمع المصحف الشريف وتمّ توحيد القراءة على حرف واحد، وأُرسلت النسخ إلى الأمصار. كما اتسعت الفتوحات فشملت أرمينيا وأفريقيا وقبرص.',
      'استشهد رضي الله عنه مظلوماً في بيته سنة 35 هـ وهو يقرأ القرآن، ودمه على المصحف الشريف.',
    ],
    virtues: ['ذو النورين', 'جهّز جيش العُسرة', 'جمع المصحف الشريف', 'من أكثر الصحابة إنفاقاً'],
  },
  {
    id: 'ali',
    nameAr: 'علي بن أبي طالب',
    nameEn: 'Ali ibn Abi Talib',
    category: 'ashara',
    brief: 'باب مدينة العلم، رابع الخلفاء الراشدين',
    story: [
      'هو علي بن أبي طالب بن عبد المطلب الهاشمي القرشي، رضي الله عنه، ابن عم النبي ﷺ وزوج ابنته فاطمة الزهراء. أول من أسلم من الصبيان، ونام في فراش النبي ﷺ ليلة الهجرة فداءً له.',
      'كان فارساً شجاعاً وعالماً فقيهاً. أبلى في غزوات بدر وأُحد والخندق بلاءً حسناً. وفي غزوة خيبر أعطاه النبي ﷺ الراية وقال: "لأُعطيَنّ الراية غداً رجلاً يحب الله ورسوله ويحبه الله ورسوله." ففتح الله على يديه.',
      'بويع بالخلافة بعد استشهاد عثمان رضي الله عنه. قال عنه النبي ﷺ: "أنا مدينة العلم وعلي بابها." كان قاضياً حكيماً وخطيباً بليغاً، ومن أشهر أقواله: "لا تستوحشوا طريق الحق لقلة سالكيه."',
      'استشهد رضي الله عنه سنة 40 هـ على يد عبد الرحمن بن ملجم أثناء صلاة الفجر في مسجد الكوفة.',
    ],
    virtues: ['أول من أسلم من الصبيان', 'باب مدينة العلم', 'فاتح خيبر', 'نام في فراش النبي ﷺ ليلة الهجرة'],
  },
  {
    id: 'talha',
    nameAr: 'طلحة بن عبيد الله',
    nameEn: 'Talha ibn Ubaydillah',
    category: 'ashara',
    brief: 'طلحة الخير، من أوائل المسلمين',
    story: [
      'هو طلحة بن عبيد الله التيمي القرشي، رضي الله عنه. أسلم على يد أبي بكر الصديق، وكان من أوائل ثمانية أسلموا. عُذّب في سبيل الله فصبر واحتسب.',
      'في غزوة أُحد وقى النبي ﷺ بنفسه حتى شُلّت يده. اتّخذ جسده درعاً للنبي ﷺ وأصابته أكثر من سبعين طعنة ورمية. قال النبي ﷺ: "من أحبّ أن ينظر إلى شهيد يمشي على وجه الأرض فلينظر إلى طلحة بن عبيد الله."',
      'لُقِّب بطلحة الخير وطلحة الفيّاض لكثرة جوده وإنفاقه. كان من أغنياء الصحابة لكنه أنفق ماله في سبيل الله.',
      'استشهد رضي الله عنه في موقعة الجمل سنة 36 هـ.',
    ],
    virtues: ['وقى النبي ﷺ بنفسه يوم أُحد', 'لُقّب بطلحة الخير', 'من أوائل ثمانية أسلموا', 'شهيد يمشي على الأرض'],
  },
  {
    id: 'zubayr',
    nameAr: 'الزبير بن العوام',
    nameEn: 'Az-Zubayr ibn Al-Awwam',
    category: 'ashara',
    brief: 'حواري رسول الله ﷺ',
    story: [
      'هو الزبير بن العوام بن خويلد القرشي الأسدي، رضي الله عنه، ابن عمة النبي ﷺ صفية بنت عبد المطلب. أسلم وعمره ست عشرة سنة، وكان أول من سلّ سيفاً في الإسلام حين شاع أن النبي ﷺ قُتل فخرج بسيفه يشق مكة.',
      'هاجر الهجرتين إلى الحبشة وإلى المدينة. شهد بدراً وأُحداً والأحزاب وجميع الغزوات مع النبي ﷺ. لقّبه النبي ﷺ بحواريّه، وقال: "إن لكل نبي حوارياً وحواريّ الزبير."',
      'كان فارساً شجاعاً ومقداماً، تظهر في جسده آثار الطعنات والضربات كالعيون في خبز القرص من كثرة الجراح.',
      'قُتل رضي الله عنه سنة 36 هـ بعد موقعة الجمل.',
    ],
    virtues: ['حواري رسول الله ﷺ', 'أول من سلّ سيفاً في الإسلام', 'شهد جميع الغزوات', 'ابن عمة النبي ﷺ'],
  },
  {
    id: 'saad',
    nameAr: 'سعد بن أبي وقاص',
    nameEn: 'Saad ibn Abi Waqqas',
    category: 'ashara',
    brief: 'أول من رمى بسهم في سبيل الله',
    story: [
      'هو سعد بن أبي وقاص مالك القرشي الزهري، رضي الله عنه. أسلم وهو ابن سبع عشرة سنة، وكان ثالث من أسلم أو سابعهم. كان أول من رمى بسهم في سبيل الله، وأول من أهرق دماً في سبيل الله.',
      'كان مستجاب الدعوة، قال له النبي ﷺ: "اللهم سدّد رميته وأجب دعوته." فكان لا يدعو إلا استُجيب له.',
      'في خلافة عمر رضي الله عنه قاد الجيوش الإسلامية في معركة القادسية سنة 15 هـ التي كانت فاتحة سقوط الإمبراطورية الفارسية. وبنى مدينة الكوفة.',
      'توفي رضي الله عنه سنة 55 هـ، وكان آخر العشرة المبشرين بالجنة وفاةً.',
    ],
    virtues: ['أول من رمى بسهم في سبيل الله', 'مستجاب الدعوة', 'قائد معركة القادسية', 'آخر العشرة المبشرين وفاةً'],
  },
  {
    id: 'said',
    nameAr: 'سعيد بن زيد',
    nameEn: 'Said ibn Zayd',
    category: 'ashara',
    brief: 'من السابقين الأولين إلى الإسلام',
    story: [
      'هو سعيد بن زيد بن عمرو بن نُفيل العدوي القرشي، رضي الله عنه، ابن عم عمر بن الخطاب وزوج أخته فاطمة. كان أبوه زيد بن عمرو من الحنفاء الذين تركوا عبادة الأصنام قبل الإسلام.',
      'أسلم مبكراً هو وزوجته فاطمة بنت الخطاب. وكان إسلام عمر بن الخطاب في بيت سعيد حين جاء يبحث عن أخته التي أسلمت.',
      'شهد المشاهد كلها مع النبي ﷺ عدا بدر، وكان من الشجعان الأبطال. شارك في فتح دمشق وكان من أبرز قادة الجيش.',
      'توفي رضي الله عنه سنة 51 هـ بالمدينة.',
    ],
    virtues: ['من السابقين الأولين', 'إسلام عمر كان في بيته', 'شهد المشاهد كلها عدا بدر', 'من فاتحي دمشق'],
  },
  {
    id: 'abdulrahman',
    nameAr: 'عبد الرحمن بن عوف',
    nameEn: 'Abdur-Rahman ibn Awf',
    category: 'ashara',
    brief: 'من أغنى الصحابة وأكثرهم إنفاقاً',
    story: [
      'هو عبد الرحمن بن عوف الزهري القرشي، رضي الله عنه. أسلم على يد أبي بكر الصديق قبل دخول النبي ﷺ دار الأرقم، وكان من الثمانية السابقين إلى الإسلام.',
      'هاجر إلى المدينة ولم يكن معه شيء، فآخى النبي ﷺ بينه وبين سعد بن الربيع الأنصاري. عرض عليه سعد نصف ماله وأن يطلّق له إحدى زوجتيه، فقال: "بارك الله لك في مالك وأهلك، دلّني على السوق." فتاجر حتى صار من أغنى أهل المدينة.',
      'أنفق أموالاً عظيمة في سبيل الله. تصدّق بقافلة كاملة جاءت من الشام فيها سبعمئة راحلة محمّلة بالبضائع. وجهّز كثيراً من الغزوات.',
      'توفي رضي الله عنه سنة 32 هـ بالمدينة.',
    ],
    virtues: ['من الثمانية السابقين', 'تاجر أمين ناجح', 'أنفق أموالاً عظيمة في سبيل الله', 'من أهل الشورى'],
  },
  {
    id: 'abu-ubayda',
    nameAr: 'أبو عبيدة بن الجراح',
    nameEn: 'Abu Ubayda ibn Al-Jarrah',
    category: 'ashara',
    brief: 'أمين هذه الأمة',
    story: [
      'هو عامر بن عبد الله بن الجراح القرشي الفهري، رضي الله عنه. أسلم على يد أبي بكر الصديق في أوائل الإسلام. لُقِّب بأمين الأمة، قال النبي ﷺ: "إن لكل أمة أميناً، وإن أميننا أيتها الأمة أبو عبيدة بن الجراح."',
      'شهد بدراً وأحداً وجميع الغزوات. في غزوة أُحد نزع الحلقتين اللتين دخلتا في وجنة النبي ﷺ من المِغفر بأسنانه فسقطت ثنيّتاه.',
      'تولى قيادة الجيوش الإسلامية في الشام في خلافة عمر، ففتح سوريا وفلسطين. كان زاهداً متواضعاً رغم ما ولّاه المسلمون.',
      'توفي رضي الله عنه في طاعون عمواس سنة 18 هـ بالأردن.',
    ],
    virtues: ['أمين هذه الأمة', 'شهد جميع الغزوات', 'فاتح الشام', 'عُرف بالزهد والتواضع'],
  },

  // ── المهاجرون ──
  {
    id: 'bilal',
    nameAr: 'بلال بن رباح',
    nameEn: 'Bilal ibn Rabah',
    category: 'muhajirun',
    brief: 'مؤذن رسول الله ﷺ وأول من أذّن في الإسلام',
    story: [
      'هو بلال بن رباح الحبشي، رضي الله عنه، مولى أبي بكر الصديق. كان عبداً لأمية بن خلف الذي عذّبه عذاباً شديداً لإسلامه. كان يُلقى على الرمال المحرقة ويُوضع على صدره الصخر العظيم وهو يردد: "أحدٌ أحد."',
      'اشتراه أبو بكر الصديق رضي الله عنه وأعتقه. فكان من أخلص أصحاب النبي ﷺ وأقربهم إليه. اختاره النبي ﷺ ليكون أول مؤذن في الإسلام فكان صوته يملأ سماء المدينة بالأذان.',
      'هاجر إلى المدينة وشهد بدراً وأُحداً وجميع الغزوات. بعد وفاة النبي ﷺ لم يستطع أن يؤذن من شدة البكاء، فخرج إلى الشام مجاهداً.',
      'توفي رضي الله عنه بدمشق سنة 20 هـ وهو يقول: "غداً ألقى الأحبة، محمداً وصحبه."',
    ],
    virtues: ['أول مؤذن في الإسلام', 'صبر على التعذيب حتى قال: أحدٌ أحد', 'شهد جميع الغزوات', 'من السابقين إلى الإسلام'],
  },
  {
    id: 'ammar',
    nameAr: 'عمار بن ياسر',
    nameEn: 'Ammar ibn Yasir',
    category: 'muhajirun',
    brief: 'من أوائل المسلمين، ابن أول شهيدة في الإسلام',
    story: [
      'هو عمار بن ياسر العنسي، رضي الله عنه. أسلم هو وأبوه ياسر وأمه سمية في أوائل الإسلام. عُذّبت عائلته عذاباً شديداً من قبل أبي جهل وقريش. مرّ بهم النبي ﷺ وهم يُعذَّبون فقال: "صبراً آل ياسر، فإن موعدكم الجنة."',
      'استشهدت سمية أمه فكانت أول شهيدة في الإسلام، ثم استشهد أبوه ياسر. أُكره عمار على الكفر فنطق بكلمة الكفر مُكرهاً وقلبه مطمئن بالإيمان، فنزل فيه: ﴿إِلَّا مَنْ أُكْرِهَ وَقَلْبُهُ مُطْمَئِنٌّ بِالْإِيمَانِ﴾.',
      'قال عنه النبي ﷺ: "إن عماراً مُلئ إيماناً من مشاشه إلى قدمه." وقال: "ما خُيِّر عمار بين أمرين إلا اختار أرشدهما." شهد المشاهد كلها مع النبي ﷺ.',
      'استشهد رضي الله عنه في معركة صفين سنة 37 هـ عن عمر يناهز 94 سنة.',
    ],
    virtues: ['مُلئ إيماناً إلى قدميه', 'أمه أول شهيدة في الإسلام', 'نزلت فيه آية قرآنية', 'شهد جميع المشاهد'],
  },
  {
    id: 'musab',
    nameAr: 'مصعب بن عمير',
    nameEn: 'Musab ibn Umair',
    category: 'muhajirun',
    brief: 'أول سفير في الإسلام، فتى قريش المنعّم',
    story: [
      'هو مصعب بن عمير العبدري القرشي، رضي الله عنه. كان أجمل فتى في مكة وأكثرهم ترفاً ونعمة، يلبس أحسن الثياب ويتعطر بأطيب العطور حتى كان يُعرف بعطره إذا أقبل أو أدبر.',
      'أسلم سراً في دار الأرقم، فلما علمت أمه حبسته ومنعته من الطعام، فثبت على إيمانه وترك النعيم كله لله. هاجر إلى الحبشة ثم عاد.',
      'أرسله النبي ﷺ إلى المدينة بعد بيعة العقبة الأولى ليعلّم أهلها الإسلام، فكان أول سفير في الإسلام. نجح في مهمته نجاحاً عظيماً حتى لم يبقَ بيت في المدينة إلا ودخله الإسلام.',
      'استشهد رضي الله عنه يوم أُحد وهو حامل لواء المسلمين. لم يجدوا ما يكفّنونه به إلا نمرة قصيرة: إذا غطّوا رأسه ظهرت رجلاه، وإذا غطّوا رجليه ظهر رأسه. فقال النبي ﷺ: "غطّوا رأسه واجعلوا على رجليه الإذخر."',
    ],
    virtues: ['أول سفير في الإسلام', 'ترك النعيم من أجل الله', 'حامل لواء المسلمين يوم أُحد', 'نشر الإسلام في المدينة'],
  },
  {
    id: 'khalid',
    nameAr: 'خالد بن الوليد',
    nameEn: 'Khalid ibn Al-Walid',
    category: 'muhajirun',
    brief: 'سيف الله المسلول',
    story: [
      'هو خالد بن الوليد بن المغيرة المخزومي القرشي، رضي الله عنه. أسلم في السنة الثامنة للهجرة بعد صلح الحديبية. كان قبل إسلامه من أشد أعداء المسلمين، وهو الذي التف بخيّالة المشركين يوم أُحد فحوّل مسار المعركة.',
      'بعد إسلامه لقّبه النبي ﷺ بسيف الله المسلول. قاد المسلمين في غزوة مؤتة بعد استشهاد القادة الثلاثة، فانسحب بالجيش انسحاباً بارعاً أنقذهم من الهلاك.',
      'في خلافة أبي بكر قاد حروب الردة ثم فتح العراق وانتقل إلى الشام. في معركة اليرموك سنة 15 هـ قاد المسلمين لنصر حاسم على الروم غيّر تاريخ المنطقة. لم يُهزم في معركة قطّ.',
      'توفي رضي الله عنه على فراشه سنة 21 هـ في حمص وبكى قائلاً: "ما في جسدي شبر إلا وفيه طعنة أو ضربة أو رمية، وها أنا أموت على فراشي كما يموت البعير، فلا نامت أعين الجبناء."',
    ],
    virtues: ['سيف الله المسلول', 'لم يُهزم في معركة قط', 'قائد معركة اليرموك', 'من أعظم القادة العسكريين في التاريخ'],
  },
  {
    id: 'ibn-masud',
    nameAr: 'عبد الله بن مسعود',
    nameEn: 'Abdullah ibn Masud',
    category: 'muhajirun',
    brief: 'من أعلم الصحابة بالقرآن',
    story: [
      'هو عبد الله بن مسعود الهُذلي، رضي الله عنه. كان من أوائل من أسلم، وكان سادس ستة في الإسلام. كان نحيف الجسم صغير البنية، لكنه كان عظيماً عند الله.',
      'قال عنه النبي ﷺ: "من أحبّ أن يقرأ القرآن غضّاً كما أُنزل فليقرأه على قراءة ابن أم عبد." وهو أول من جهر بالقرآن في مكة أمام قريش فضربوه حتى أدموه.',
      'كان ملازماً للنبي ﷺ يخدمه ويحمل نعله ووساده وسواكه. كان يدخل على النبي ﷺ بلا إذن لشدة قربه منه. قال النبي ﷺ عن ساقيه النحيفتين: "لَهما أثقل عند الله من جبل أُحد."',
      'كان من أعلم الصحابة بالقرآن والفقه. تولّى قضاء الكوفة وبيت مالها في عهد عمر. توفي رضي الله عنه سنة 32 هـ بالمدينة.',
    ],
    virtues: ['من أعلم الصحابة بالقرآن', 'أول من جهر بالقرآن في مكة', 'ساقاه أثقل من أُحد عند الله', 'ملازم النبي ﷺ وخادمه'],
  },

  // ── الأنصار ──
  {
    id: 'saad-muadh',
    nameAr: 'سعد بن معاذ',
    nameEn: 'Saad ibn Muadh',
    category: 'ansar',
    brief: 'سيد الأوس، اهتز لموته عرش الرحمن',
    story: [
      'هو سعد بن معاذ الأنصاري الأوسي، رضي الله عنه، سيد قبيلة الأوس في المدينة. أسلم على يد مصعب بن عمير قبل هجرة النبي ﷺ، وبإسلامه أسلمت قبيلة الأوس بأكملها.',
      'كان من أنصار النبي ﷺ المخلصين. في غزوة بدر قال قولته المشهورة: "يا رسول الله، لو استعرضت بنا هذا البحر فخُضته لخضناه معك، ما تخلّف منا رجل واحد." فسُرّ النبي ﷺ بقوله.',
      'أُصيب بسهم في غزوة الخندق قطع أكحَله (عرق في الذراع). دعا الله ألّا يموت حتى يقرّ عينه من بني قريظة. فلما حُكّم فيهم حكم بحكم الله.',
      'لما مات رضي الله عنه قال النبي ﷺ: "اهتزّ عرش الرحمن لموت سعد بن معاذ." وشيّعه سبعون ألف ملك لم ينزلوا الأرض قبل ذلك.',
    ],
    virtues: ['اهتزّ عرش الرحمن لموته', 'سيد الأوس', 'بإسلامه أسلمت قبيلته', 'من أعظم أنصار النبي ﷺ'],
  },
  {
    id: 'asad-zurara',
    nameAr: 'أسعد بن زرارة',
    nameEn: 'Asad ibn Zurara',
    category: 'ansar',
    brief: 'أول من بايع من الأنصار وأول من جمّع في المدينة',
    story: [
      'هو أسعد بن زرارة الأنصاري الخزرجي، رضي الله عنه. كان من أوائل من لقي النبي ﷺ من أهل المدينة وآمن به في بيعة العقبة الأولى. وكان أحد النقباء الاثني عشر الذين اختارهم النبي ﷺ.',
      'كان أول من جمّع بالمسلمين في المدينة قبل هجرة النبي ﷺ، فكان يجمع المسلمين يوم الجمعة ويصلّي بهم. وهو أول من بايع النبي ﷺ من الأنصار.',
      'استضاف مصعب بن عمير حين أرسله النبي ﷺ للدعوة في المدينة، وكان عوناً له في نشر الإسلام بين أهلها.',
      'توفي رضي الله عنه قبل غزوة بدر في المدينة، فحزن عليه النبي ﷺ حزناً كبيراً.',
    ],
    virtues: ['أول من بايع من الأنصار', 'أول من جمّع في المدينة', 'أحد النقباء الاثني عشر', 'استضاف مصعب بن عمير'],
  },
  {
    id: 'abu-ayyub',
    nameAr: 'أبو أيوب الأنصاري',
    nameEn: 'Abu Ayyub Al-Ansari',
    category: 'ansar',
    brief: 'مضيف رسول الله ﷺ حين قدم المدينة',
    story: [
      'هو خالد بن زيد بن كليب الأنصاري الخزرجي، رضي الله عنه. كُنّي بأبي أيوب. شهد بيعة العقبة الثانية وكان من أوائل الأنصار إسلاماً.',
      'حين قدم النبي ﷺ المدينة مهاجراً وأراد كل الأنصار أن يستضيفه، بركت ناقة النبي ﷺ عند دار أبي أيوب، فنزل عنده ضيفاً في الطابق الأرضي. كان أبو أيوب وزوجته في الطابق العلوي فلم يناما من هيبة أن يكونا فوق رسول الله ﷺ.',
      'شهد بدراً وأُحداً والأحزاب وجميع الغزوات. بعد وفاة النبي ﷺ ظل يجاهد في سبيل الله حتى شارك في حصار القسطنطينية.',
      'توفي رضي الله عنه أثناء حصار القسطنطينية سنة 52 هـ، ودُفن عند أسوارها. وقبره اليوم معروف في إسطنبول يزوره الناس.',
    ],
    virtues: ['مضيف النبي ﷺ في المدينة', 'شهد جميع الغزوات', 'جاهد حتى آخر حياته', 'دُفن عند أسوار القسطنطينية'],
  },

  // ── أمهات المؤمنين ──
  {
    id: 'khadijah',
    nameAr: 'خديجة بنت خويلد',
    nameEn: 'Khadijah bint Khuwaylid',
    category: 'mothers',
    brief: 'أم المؤمنين الأولى وأول من آمن بالنبي ﷺ',
    story: [
      'هي خديجة بنت خويلد القرشية الأسدية، رضي الله عنها. كانت سيدة قريش وأفضل نسائها نسباً وشرفاً وعقلاً. لُقِّبت بالطاهرة في الجاهلية. كانت ذات مال كثير وتجارة رابحة.',
      'تزوجها النبي ﷺ وعمره خمس وعشرون سنة وعمرها أربعون. وكانت أول من آمن بالنبي ﷺ مطلقاً من رجال ونساء. قالت له حين نزل عليه الوحي: "كلا والله لا يخزيك الله أبداً، إنك لتصل الرحم وتحمل الكلّ وتَكسب المعدوم وتَقري الضيف وتُعين على نوائب الحق."',
      'أنفقت مالها كله في نصرة الإسلام ودعم النبي ﷺ. وقفت بجانبه في أشد الظروف: في الحصار في شِعب أبي طالب، وفي بداية الوحي حين كان خائفاً. أنجبت له جميع أولاده عدا إبراهيم.',
      'أرسل الله إليها السلام مع جبريل وبشّرها ببيت في الجنة من قصب لا صخب فيه ولا نصب. توفيت رضي الله عنها قبل الهجرة بثلاث سنوات، في عام الحزن.',
    ],
    virtues: ['أول من آمن بالنبي ﷺ', 'بشّرها الله ببيت في الجنة', 'أنفقت مالها في نصرة الإسلام', 'لُقِّبت بالطاهرة'],
  },
  {
    id: 'aisha',
    nameAr: 'عائشة بنت أبي بكر',
    nameEn: 'Aisha bint Abu Bakr',
    category: 'mothers',
    brief: 'أفقه نساء الأمة وأعلمهن',
    story: [
      'هي عائشة بنت أبي بكر الصديق، رضي الله عنهما. أم المؤمنين وأحب أزواج النبي ﷺ إليه بعد خديجة. لُقِّبت بالحُميراء والصدّيقة بنت الصدّيق.',
      'كانت أفقه نساء الأمة وأعلمهن بالحديث والفقه والأدب والشعر والطب والأنساب. روت عن النبي ﷺ أكثر من ألفين ومئتي حديث. كان كبار الصحابة يرجعون إليها في المسائل الفقهية.',
      'تُوفي النبي ﷺ في بيتها وهو في حجرها، ودُفن في حجرتها. قالت عن نفسها: "أُعطيت تسعاً ما أُعطيتهن امرأة: نزل جبريل بصورتي في راحته حين أُمر أن يتزوجني."',
      'عاشت بعد النبي ﷺ عمراً طويلاً قضته في تعليم الناس ونقل العلم. توفيت رضي الله عنها سنة 58 هـ في المدينة.',
    ],
    virtues: ['أفقه نساء الأمة', 'روت أكثر من 2200 حديث', 'تُوفي النبي ﷺ في حجرها', 'الصدّيقة بنت الصدّيق'],
  },
  {
    id: 'hafsa',
    nameAr: 'حفصة بنت عمر',
    nameEn: 'Hafsa bint Umar',
    category: 'mothers',
    brief: 'حافظة المصحف الشريف',
    story: [
      'هي حفصة بنت عمر بن الخطاب، رضي الله عنهما. أم المؤمنين وحافظة المصحف. كانت صوّامة قوّامة، تحب العلم والعبادة.',
      'تزوجها النبي ﷺ بعد وفاة زوجها الأول خُنيس بن حذافة السهمي الذي استشهد من جراحه بعد غزوة بدر. عرض عمر رضي الله عنه ابنته على عثمان ثم أبي بكر فاعتذرا، فتزوجها النبي ﷺ.',
      'كانت تقرأ القرآن وتكتب، وكانت من القليلات اللواتي يعرفن الكتابة في ذلك الزمان. أودع عندها أبو بكر الصديق ثم عمر المصحف الأول الذي جُمع فيه القرآن، فحافظت عليه أشد الحفاظ.',
      'من ذلك المصحف نسخ عثمان رضي الله عنه المصاحف التي أرسلها إلى الأمصار. توفيت رضي الله عنها سنة 45 هـ في المدينة.',
    ],
    virtues: ['حافظة المصحف الشريف', 'صوّامة قوّامة', 'من القليلات اللواتي يعرفن الكتابة', 'ابنة الفاروق عمر'],
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
        {category.title}
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

function CompanionCard({ companion, onPress, isDarkMode, colors }: CompanionCardProps) {
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
      <View style={s.cardContent}>
        <View style={[s.cardAvatar, { backgroundColor: ACCENT_LIGHT }]}>
          <MaterialCommunityIcons name="account" size={24} color={ACCENT} />
        </View>
        <View style={s.cardTextWrap}>
          <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>
            {companion.nameAr}
          </Text>
          <Text style={[s.cardBrief, { color: colors.textLight }]} numberOfLines={2}>
            {companion.brief}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-left" size={22} color={colors.textLight} />
      </View>
    </Pressable>
  );
}

interface StoryDetailProps {
  companion: Companion;
  onBack: () => void;
  onShare: () => void;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}

function StoryDetail({ companion, onBack, onShare, isDarkMode, colors }: StoryDetailProps) {
  return (
    <View style={s.detailContainer}>
      {/* Detail header */}
      <View style={s.detailHeader}>
        <Pressable
          onPress={onBack}
          style={[
            s.detailBackBtn,
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.18)' },
          ]}
        >
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.text} />
        </Pressable>
        <Text style={[s.detailHeaderTitle, { color: colors.text }]} numberOfLines={1}>
          {companion.nameAr}
        </Text>
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
              {companion.nameAr}
            </Text>
            <Text style={[s.detailNameEn, { color: colors.textLight }]}>
              {companion.nameEn}
            </Text>
            <Text style={[s.detailBrief, { color: colors.textLight }]}>
              {companion.brief}
            </Text>
          </View>
        </View>

        {/* Story */}
        <View style={s.detailSectionOuter}>
          <View style={s.detailSectionHeaderRow}>
            <View style={[s.sectionIconWrap, { backgroundColor: ACCENT_LIGHT }]}>
              <MaterialCommunityIcons name="book-open-variant" size={18} color={ACCENT} />
            </View>
            <Text style={[s.detailSectionTitle, { color: colors.text }]}>
              القصة
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
              {companion.story.map((paragraph, idx) => (
                <Text
                  key={idx}
                  style={[
                    s.storyParagraph,
                    { color: colors.text },
                    idx < companion.story.length - 1 && s.paragraphSpacing,
                  ]}
                >
                  {paragraph}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Virtues */}
        <View style={s.detailSectionOuter}>
          <View style={s.detailSectionHeaderRow}>
            <View style={[s.sectionIconWrap, { backgroundColor: ACCENT_LIGHT }]}>
              <MaterialCommunityIcons name="star-four-points" size={18} color={ACCENT} />
            </View>
            <Text style={[s.detailSectionTitle, { color: colors.text }]}>
              الفضائل والمناقب
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
              {companion.virtues.map((virtue, idx) => (
                <View key={idx} style={s.virtueRow}>
                  <MaterialCommunityIcons name="star-four-points" size={14} color={ACCENT} style={s.virtueIcon} />
                  <Text style={[s.virtueText, { color: colors.text }]}>
                    {virtue}
                  </Text>
                </View>
              ))}
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
            <Text style={[s.detailFooterText, { color: colors.text }]}>
              رضي الله عنه وأرضاه
            </Text>
            <Text style={[s.detailFooterNote, { color: colors.textLight }]}>
              اللهم اجمعنا بهم مع النبي ﷺ في الفردوس الأعلى
            </Text>
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
  const colors = useColors();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('ashara');
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const filteredCompanions = COMPANIONS.filter(c => c.category === activeCategory);

  const handleCategoryChange = useCallback((key: CategoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveCategory(key);
  }, []);

  const handleSelectCompanion = useCallback((companion: Companion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCompanion(companion);
  }, []);

  const handleBack = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCompanion(null);
  }, []);

  const handleShare = useCallback(async () => {
    if (!selectedCompanion) return;
    const text = `📖 ${selectedCompanion.nameAr}\n\n${selectedCompanion.brief}\n\n${selectedCompanion.story.join('\n\n')}\n\n✨ الفضائل:\n${selectedCompanion.virtues.map(v => `• ${v}`).join('\n')}\n\nرضي الله عنه وأرضاه\n\n— تطبيق روح المسلم`;
    try {
      await Share.share({ message: text });
    } catch {
      // user cancelled
    }
  }, [selectedCompanion]);

  const handleExportPDF = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const html = CATEGORIES.map(cat => {
      const companions = COMPANIONS.filter(c => c.category === cat.key);
      const companionHtml = companions.map(comp => {
        const storyHtml = comp.story.map(p => `<p>${p}</p>`).join('');
        const virtuesHtml = comp.virtues.map(v => `<div class="virtue-item">${v}</div>`).join('');
        return `<div class="section">
          <div class="section-title">${comp.nameAr}</div>
          <div class="section-desc">${comp.brief}</div>
          ${storyHtml}
          ${virtuesHtml ? `<div style="margin-top:8px"><div class="steps-label">الفضائل:</div>${virtuesHtml}</div>` : ''}
        </div>`;
      }).join('');
      return `<div style="margin-bottom:24px"><h2 style="font-size:20px;color:#2f7659;border-bottom:2px solid #2f7659;padding-bottom:8px;margin-bottom:16px">${cat.title}</h2>${companionHtml}</div>`;
    }).join('');
    showAdThenExport(() => exportAsPDF('قصص الصحابة', html));
  }, []);

  // Detail view
  if (selectedCompanion) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']}>
        <StoryDetail
          companion={selectedCompanion}
          onBack={handleBack}
          onShare={handleShare}
          isDarkMode={isDarkMode}
          colors={colors}
        />
      </ScreenContainer>
    );
  }

  // List view
  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={[
            s.backBtn,
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.18)' },
          ]}
        >
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>
          قصص الصحابة
        </Text>
        <Pressable
          onPress={handleExportPDF}
          style={[
            s.backBtn,
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(120,120,128,0.18)' },
          ]}
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
          <MaterialCommunityIcons name="account-group" size={36} color={ACCENT} />
          <View style={s.heroTextWrap}>
            <Text style={[s.heroTitle, { color: colors.text }]}>
              صحابة رسول الله ﷺ
            </Text>
            <Text style={[s.heroSub, { color: colors.textLight }]}>
              رضي الله عنهم أجمعين — خير القرون
            </Text>
          </View>
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoryRow}
        style={s.categoryScroll}
      >
        {CATEGORIES.map(cat => (
          <CategoryTab
            key={cat.key}
            category={cat}
            isActive={activeCategory === cat.key}
            onPress={() => handleCategoryChange(cat.key)}
            isDarkMode={isDarkMode}
            colors={colors}
          />
        ))}
      </ScrollView>

      {/* Companions list */}
      <ScrollView
        ref={scrollRef}
        style={s.listScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
      >
        {/* Count badge */}
        <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT }]}>
          <Text style={[s.countText, { color: ACCENT }]}>
            {filteredCompanions.length} {filteredCompanions.length > 10 ? 'صحابياً' : 'صحابة'}
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
              رضي الله عنهم أجمعين
            </Text>
            <Text style={[s.footerNote, { color: colors.textLight }]}>
              اللهم احشرنا في زمرتهم يوم القيامة
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
    textAlign: 'right',
  },
  heroSub: {
    fontFamily: 'Cairo-Regular',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
    textAlign: 'right',
  },

  // Category tabs
  categoryScroll: {
    maxHeight: 48,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
  },
  categoryTabText: {
    fontFamily: 'Cairo-SemiBold',
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
    fontFamily: 'Cairo-SemiBold',
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
    gap: 12,
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
    fontFamily: 'Cairo-Bold',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
  },
  cardBrief: {
    fontFamily: 'Cairo-Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
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
    fontFamily: 'Cairo-Bold',
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
    gap: 8,
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
    fontFamily: 'Cairo-Bold',
    fontSize: 24,
    lineHeight: 38,
    textAlign: 'center',
  },
  detailNameEn: {
    fontFamily: 'Cairo-Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  detailBrief: {
    fontFamily: 'Cairo-Regular',
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
    gap: 10,
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
    fontFamily: 'Cairo-SemiBold',
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
    fontFamily: 'Cairo-Regular',
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
    gap: 10,
    marginBottom: 10,
  },
  virtueIcon: {
    marginTop: 5,
  },
  virtueText: {
    fontFamily: 'Cairo-Regular',
    fontSize: 15,
    lineHeight: 26,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
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
    gap: 6,
  },
  detailFooterText: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 17,
    lineHeight: 28,
    textAlign: 'center',
  },
  detailFooterNote: {
    fontFamily: 'Cairo-Regular',
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
