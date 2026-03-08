// app/seerah.tsx
// صفحة السيرة النبوية - روح المسلم

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
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
import { exportAsPDF, showAdThenExport } from '@/lib/pdf-export';

// Enable LayoutAnimation on Android
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

interface SeerahSection {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  paragraphs: string[];
}

// ========================================
// محتوى السيرة النبوية
// ========================================

const SEERAH_SECTIONS: SeerahSection[] = [
  {
    title: 'المولد والنشأة',
    icon: 'baby-face-outline',
    paragraphs: [
      'وُلِد سيدنا محمد ﷺ في مكة المكرمة عام الفيل، الموافق سنة 570 ميلادية، في شهر ربيع الأول، في بيت عبد الله بن عبد المطلب الهاشمي القرشي. وقد تُوفي أبوه عبد الله قبل مولده، فنشأ يتيمًا من جهة الأب.',
      'أرضعته حليمة السعدية في بادية بني سعد، حيث نشأ في البادية فتعلّم الفصاحة وقوة البيان، وشهدت حليمة من بركات هذا الطفل المبارك ما جعلها تحرص على بقائه عندها. وقد وقعت في هذه الفترة حادثة شقّ الصدر، حيث جاءه ملكان فشقّا صدره واستخرجا منه حظّ الشيطان وغسلاه بماء زمزم.',
      'توفيت أمه آمنة بنت وهب وهو في السادسة من عمره، فكفله جدّه عبد المطلب الذي كان سيد قريش وأعزّ رجالها. ولما بلغ الثامنة توفي جدّه، فانتقلت كفالته إلى عمّه أبي طالب الذي أحبّه حبًّا شديدًا وحماه ورعاه أحسن رعاية.',
      'نشأ ﷺ على أحسن الأخلاق وأكرم الصفات، فلم يُعرف عنه كذب قطّ ولا خيانة، حتى لقّبته قريش بالصادق الأمين. كان يرعى الغنم لأهل مكة على قراريط، ثم اشتغل بالتجارة، وكان أمينًا صادقًا في تجارته.',
      'لما بلغ الخامسة والعشرين من عمره، بلغ خبرُ أمانته وصدقه السيدة خديجة بنت خويلد، وكانت سيدة شريفة ذات مال، فعرضت عليه أن يخرج في تجارة لها إلى الشام. فخرج ﷺ ومعه غلامها ميسرة، وربحت التجارة ربحًا كثيرًا. فلما عاد أُعجبت خديجة بأمانته وأخلاقه، فتزوجها ﷺ وكانت أوّل زوجاته وأحبّهنّ إليه، وأنجبت له جميع أبنائه عدا إبراهيم.',
    ],
  },
  {
    title: 'البعثة والوحي',
    icon: 'star-four-points',
    paragraphs: [
      'كان النبي ﷺ يتعبّد في غار حراء بجبل النور قبل البعثة، يتأمّل في خلق السماوات والأرض ويتحنّث الليالي ذوات العدد. وكانت الرؤيا الصادقة أوّل ما بُدئ به من الوحي، فكان لا يرى رؤيا إلا جاءت مثل فلق الصبح.',
      'في ليلة السابع عشر من رمضان، وقد بلغ الأربعين من عمره، نزل عليه جبريل عليه السلام في غار حراء فقال له: اقرأ. قال ﷺ: ما أنا بقارئ. فغطّه جبريل حتى بلغ منه الجَهد ثم أرسله، وكرّر ذلك ثلاثًا. ثم قال: ﴿اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ ۝ خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ ۝ اقْرَأْ وَرَبُّكَ الْأَكْرَمُ ۝ الَّذِي عَلَّمَ بِالْقَلَمِ ۝ عَلَّمَ الْإِنسَانَ مَا لَمْ يَعْلَمْ﴾.',
      'رجع النبي ﷺ إلى خديجة يرجف فؤاده، فقال: "زمّلوني زمّلوني"، فزمّلوه حتى ذهب عنه الروع. فأخبر خديجة بما حدث، فقالت كلمتها الخالدة: "كلّا واللهِ لا يُخزيك الله أبداً، إنك لتصل الرحم، وتحمل الكلّ، وتَكسب المعدوم، وتَقري الضيف، وتُعين على نوائب الحق." ثم انطلقت به إلى ابن عمها ورقة بن نوفل، فبشّره بأنه نبي هذه الأمة.',
      'كانت خديجة رضي الله عنها أوّل من آمن به من النساء، وأبو بكر الصدّيق أوّل من آمن من الرجال، وعلي بن أبي طالب أوّل من آمن من الصبيان، وزيد بن حارثة أوّل من آمن من الموالي. وبدأ ﷺ بالدعوة سرًّا ثلاث سنوات، يجتمع بالمؤمنين في دار الأرقم بن أبي الأرقم.',
      'لم تكن البعثة النبوية حدثًا عاديًا، بل كانت نقطة تحوّل في تاريخ البشرية كلها. فقد جاء ﷺ بدين يُحرّر العقول من الأوهام، والقلوب من الشرك، والمجتمعات من الظلم والجاهلية. وبدأ نور الإسلام ينتشر رغم كل العقبات والتحديات.',
    ],
  },
  {
    title: 'الدعوة في مكة',
    icon: 'account-voice',
    paragraphs: [
      'بعد ثلاث سنوات من الدعوة السرية، نزل الأمر الإلهي بالجهر بالدعوة: ﴿فَاصْدَعْ بِمَا تُؤْمَرُ وَأَعْرِضْ عَنِ الْمُشْرِكِينَ﴾. فصعد النبي ﷺ على جبل الصفا ونادى قريشًا بطنًا بطنًا، وأنذرهم عذاب الله، فأعلن عمّه أبو لهب العداوة وقال: "تبًّا لك! ألهذا جمعتنا؟" فنزلت سورة المسد.',
      'واجه المسلمون اضطهادًا شديدًا من قريش. فقد عُذّب بلال بن رباح في رمضاء مكة ووُضعت الصخرة على صدره وهو يقول: "أحدٌ أحد". وعُذّبت آل ياسر حتى استشهدت سمية بنت خياط، فكانت أوّل شهيدة في الإسلام. ومرّ بهم النبي ﷺ وهم يُعذّبون فقال: "صبرًا آل ياسر، فإنّ موعدكم الجنة."',
      'فرضت قريش حصارًا اقتصاديًا واجتماعيًا على بني هاشم في شِعب أبي طالب دام ثلاث سنوات. قُطعت عنهم الأسواق وحُرم عليهم البيع والشراء والمصاهرة، حتى أكلوا ورق الشجر من شدة الجوع. وصبر النبي ﷺ وصحابته صبرًا عجيبًا حتى فكّ الله الحصار.',
      'في العام العاشر من البعثة، تُوفيت السيدة خديجة رضي الله عنها، ثم تُوفي عمّه أبو طالب الذي كان يحميه من قريش. فسُمّي ذلك العام بِعام الحُزن. واشتدّ أذى قريش على النبي ﷺ، فخرج إلى الطائف يدعو ثقيفًا إلى الإسلام، فردّوه وسلّطوا عليه سفهاءهم وغلمانهم يرمونه بالحجارة حتى أدمَوا قدميه الشريفتين.',
      'في ليلة السابع والعشرين من رجب، أكرم الله نبيّه بمعجزة الإسراء والمعراج. أسرى به ﷺ من المسجد الحرام إلى المسجد الأقصى على دابة البُراق، ثم عُرج به إلى السماوات العُلا، حيث فُرضت الصلوات الخمس. وقد رأى من آيات ربه الكبرى، والتقى بالأنبياء عليهم السلام وصلّى بهم إمامًا في المسجد الأقصى.',
      'كانت سنوات الدعوة في مكة ثلاث عشرة سنة، تعلّم فيها المسلمون الصبر والثبات على الحق مهما اشتدّت المحن. وفي هذه السنوات نزل معظم القرآن المكّي الذي ركّز على توحيد الله وإثبات البعث والجزاء وقصص الأنبياء السابقين.',
    ],
  },
  {
    title: 'الهجرة إلى المدينة',
    icon: 'road-variant',
    paragraphs: [
      'قبل الهجرة إلى المدينة، كانت الهجرة الأولى إلى الحبشة حيث أمر النبي ﷺ أصحابه بالهجرة إلى أرض الحبشة عند النجاشي الملك العادل الذي لا يُظلم عنده أحد. فهاجر عدد من المسلمين فرارًا بدينهم، وأحسن النجاشي استقبالهم وأمّنهم.',
      'بدأ النبي ﷺ يعرض نفسه على القبائل في مواسم الحج، حتى لقي وفدًا من يثرب (المدينة) من قبيلتي الأوس والخزرج. فآمنوا به وبايعوه بيعة العقبة الأولى ثم الثانية، وتعاهدوا على نصرته وحمايته إذا هاجر إليهم.',
      'أذن الله لنبيّه ﷺ بالهجرة إلى المدينة سنة 622 ميلادية. وقد دبّرت قريش مؤامرة لقتله، فاختارت من كل قبيلة شابًّا قويًّا ليضربوه ضربة رجل واحد. لكنّ الله نجّاه، فخرج ﷺ من بين أيديهم وقد أعمى الله أبصارهم، وترك عليًّا رضي الله عنه ينام في فراشه.',
      'رافقه في الهجرة أبو بكر الصدّيق رضي الله عنه، واختبآ في غار ثور ثلاث ليالٍ. وقد وقفت قريش على باب الغار فقال أبو بكر: "لو أنّ أحدهم نظر تحت قدميه لأبصرنا." فقال ﷺ: "ما ظنّك باثنين الله ثالثهما." ونسج العنكبوت بيته على باب الغار، وباضت الحمامة عنده بأمر الله.',
      'وصل النبي ﷺ إلى المدينة يوم الاثنين 12 ربيع الأول، واستقبله أهل المدينة بالفرح والنشيد: "طلع البدر علينا، من ثنيّات الوداع." وكان أوّل ما فعله ﷺ بناء المسجد النبوي الشريف، وآخى بين المهاجرين والأنصار مؤاخاة جعلت الأنصاري يقاسم المهاجر ماله ومسكنه.',
      'أصدر النبي ﷺ وثيقة المدينة التي نظّمت العلاقات بين المسلمين وغيرهم من سكان المدينة، وأرست قواعد التعايش والعدل والمسؤولية المشتركة في الدفاع عن المدينة. وكانت هذه الوثيقة من أوائل الدساتير المدنية في التاريخ.',
    ],
  },
  {
    title: 'الغزوات',
    icon: 'shield-sword',
    paragraphs: [
      'غزوة بدر الكبرى (رمضان، 2 هـ / 624 م): أوّل معركة فاصلة في الإسلام. خرج المسلمون وعددهم نحو 313 مقاتلًا لاعتراض قافلة قريش التجارية، فقدّرالله أن يلتقوا بجيش قريش البالغ نحو ألف مقاتل عند آبار بدر. نصر الله المسلمين نصرًا مؤزّرًا وأنزل الملائكة تقاتل معهم، وقُتل صناديد الكفر وأُسر كثير منهم. وكانت هذه الغزوة يوم الفرقان الذي فرّق الله فيه بين الحق والباطل.',
      'غزوة أحد (شوال، 3 هـ / 625 م): جاءت قريش بثلاثة آلاف مقاتل للثأر من هزيمة بدر. وضع النبي ﷺ الرماة على جبل أحد وأمرهم ألّا يبرحوا مكانهم مهما حدث. بدأ المسلمون بالانتصار، لكنّ الرماة خالفوا أمر النبي ﷺ ونزلوا لجمع الغنائم، فالتفّ خالد بن الوليد بفرسان المشركين من خلف الجبل. استشهد حمزة بن عبد المطلب سيد الشهداء، وجُرح النبي ﷺ وكُسرت رَباعيته. وكان في الغزوة درس عظيم في طاعة القائد والانضباط.',
      'غزوة الخندق (شوال، 5 هـ / 627 م): تحالفت قريش واليهود والقبائل العربية وجاءوا بعشرة آلاف مقاتل لغزو المدينة. أشار سلمان الفارسي بحفر خندق حول المدينة، فحفره المسلمون وعملمعهم النبي ﷺ بنفسه. حاصر الأحزاب المدينة قرابة شهر، فأرسل الله عليهم ريحًا شديدة وجنودًا لم يروها، فانصرفوا خائبين. قال ﷺ بعدها: "الآن نغزوهم ولا يغزوننا."',
      'فتح مكة (رمضان، 8 هـ / 630 م): خرج النبي ﷺ في عشرة آلاف من المسلمين لفتح مكة بعد أن نقضت قريش صلح الحديبية. دخل مكة فاتحًا منتصرًا وهو يُطأطئ رأسه تواضعًا لله. وقف على باب الكعبة وقال: "يا معشر قريش، ما تظنون أنّي فاعل بكم؟" قالوا: "أخ كريم وابن أخ كريم." فقال: "اذهبوا فأنتم الطلقاء." وطهّر الكعبة من الأصنام التي كانت 360 صنمًا، وهو يتلو: ﴿وَقُلْ جَاءَ الْحَقُّ وَزَهَقَ الْبَاطِلُ إِنَّ الْبَاطِلَ كَانَ زَهُوقًا﴾.',
      'غزوة حنين (شوال، 8 هـ / 630 م): بعد فتح مكة، اجتمعت قبائل هوازن وثقيف لقتال المسلمين. خرج النبي ﷺ في اثني عشر ألفًا، فأعجب بعض المسلمين بكثرتهم. لكنّ العدوّ كمن لهم في وادي حنين، فانهزم كثير من المسلمين في البداية. ثبت النبي ﷺ ونادى أصحابه حتى عادوا والتفّوا حوله، ونصرهم الله. وفي ذلك نزل: ﴿وَيَوْمَ حُنَيْنٍ إِذْ أَعْجَبَتْكُمْ كَثْرَتُكُمْ فَلَمْ تُغْنِ عَنكُمْ شَيْئًا﴾.',
    ],
  },
  {
    title: 'الفتوحات وانتشار الإسلام',
    icon: 'earth',
    paragraphs: [
      'بعد صلح الحديبية في السنة السادسة للهجرة، أرسل النبي ﷺ رسائل إلى ملوك وحكام العالم يدعوهم إلى الإسلام. كتب إلى هرقل عظيم الروم، وكسرى ملك الفرس، والمقوقس عظيم مصر، والنجاشي ملك الحبشة، وغيرهم من الملوك والأمراء. وكان في ذلك إعلان بأنّ الإسلام رسالة عالمية للبشرية جمعاء.',
      'بعد فتح مكة، بدأت القبائل العربية تأتي إلى المدينة أفواجًا تعلن إسلامها. وسُمّيت السنة التاسعة للهجرة بعام الوفود، حيث جاء وفود القبائل من أنحاء الجزيرة العربية يبايعون النبي ﷺ على الإسلام. ونزل في ذلك: ﴿إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ ۝ وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا﴾.',
      'في السنة العاشرة للهجرة، حجّ النبي ﷺ حجة الوداع مع أكثر من مائة ألف من المسلمين. وخطب خطبته الشهيرة في عرفة، وأرسى فيها قواعد حقوق الإنسان: حُرمة الدماء والأموال والأعراض، والمساواة بين الناس، وحقوق المرأة، والتحذير من الربا والثأر. وقال ﷺ: "كلّكم لآدم وآدم من تراب، لا فضل لعربي على أعجمي إلا بالتقوى."',
      'في خطبة الوداع أيضًا قال ﷺ: "إني تاركٌ فيكم ما إن تمسّكتم به لن تضلّوا بعدي أبدًا: كتاب الله." ثم سأل الناس: "ألا هل بلّغت؟" قالوا: نعم. قال: "اللهمّ فاشهد." وأشار بإصبعه إلى السماء ثم إلى الناس. ونزل في ذلك اليوم: ﴿الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ وَأَتْمَمْتُ عَلَيْكُمْ نِعْمَتِي وَرَضِيتُ لَكُمُ الْإِسْلَامَ دِينًا﴾.',
    ],
  },
  {
    title: 'الوفاة',
    icon: 'moon-waning-crescent',
    paragraphs: [
      'في أواخر شهر صفر من السنة الحادية عشرة للهجرة، بدأ المرض يشتدّ على النبي ﷺ. وكان آخر ما صلّى بالناس صلاة المغرب، قرأ فيها بسورة المرسلات. ثم أمر أبا بكر الصدّيق أن يصلّي بالناس، فلم يزل أبو بكر يصلّي بهم حتى وفاته ﷺ.',
      'في يوم الاثنين الثاني عشر من ربيع الأول، كشف النبي ﷺ ستار حجرته والناس في صلاة الفجر خلف أبي بكر، فنظر إليهم وتبسّم. قال أنس: "ما رأيت وجهه أحسن منه في تلك الساعة." ففرح الناس وظنّوا أنه قد شُفي. لكنّ المرض عاود واشتدّ.',
      'ضع رأسه الشريف ﷺ في حجر عائشة رضي الله عنها، وجعل يدخل يده في إناء فيه ماء فيمسح وجهه وهو يقول: "لا إله إلا الله، إنّ للموت لسكرات." ورفع إصبعه وجعل يقول: "في الرفيق الأعلى، في الرفيق الأعلى." ثم مالت يده الشريفة، ولحق بالرفيق الأعلى ﷺ.',
      'لما بلغ خبر وفاته ﷺ الصحابة، ذُهلوا وأصابهم حزن شديد. أنكر عمر بن الخطاب الخبر وقال: "من قال إنّ محمدًا قد مات ضربته بسيفي." فجاء أبو بكر وقبّل جبهة النبي ﷺ وقال: "طبتَ حيًّا وميّتًا يا رسول الله." ثم خرج إلى الناس وقال كلمته الخالدة: "من كان يعبد محمدًا فإنّ محمدًا قد مات، ومن كان يعبد الله فإنّ الله حيّ لا يموت." وتلا: ﴿وَمَا مُحَمَّدٌ إِلَّا رَسُولٌ قَدْ خَلَتْ مِن قَبْلِهِ الرُّسُلُ﴾.',
      'غُسّل النبي ﷺ ودُفن في حجرة عائشة رضي الله عنها بالمسجد النبوي الشريف، في المكان الذي قُبض فيه. ترك ﷺ للأمة كتاب الله وسنّته المطهّرة نورًا وهداية إلى يوم القيامة. صلى الله عليه وعلى آله وصحبه وسلّم تسليمًا كثيرًا.',
      'لم يترك النبي ﷺ دينارًا ولا درهمًا، ولا عبدًا ولا أمة، ولا شيئًا إلا بغلته البيضاء وسلاحه وأرضًا جعلها صدقة. لقد عاش ﷺ حياته كلها للدعوة والعبادة وخدمة الناس، وترك أثرًا خالدًا غيّر وجه التاريخ والحضارة الإنسانية إلى الأبد. صلوات الله وسلامه عليه.',
    ],
  },
];

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
  return (
    <View style={s.sectionOuter}>
      {/* Section header */}
      <Pressable
        onPress={onToggle}
        style={s.sectionHeader}
        android_ripple={{ color: ACCENT_LIGHT, borderless: false }}
      >
        <View style={[s.sectionIconWrap, { backgroundColor: ACCENT_LIGHT }]}>
          <MaterialCommunityIcons name={section.icon} size={20} color={ACCENT} />
        </View>
        <View style={s.sectionTitleWrap}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>
            {section.title}
          </Text>
        </View>
        <View style={[s.sectionBadge, { backgroundColor: ACCENT_LIGHT }]}>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={ACCENT}
          />
        </View>
      </Pressable>

      {/* Content (collapsible) */}
      {isExpanded && (
        <View style={s.glassOuter}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 40 : 15}
            tint={isDarkMode ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              s.glassOverlay,
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
          <View style={s.glassContent}>
            {section.paragraphs.map((paragraph, pIdx) => (
              <Text
                key={pIdx}
                style={[
                  s.paragraph,
                  { color: colors.text },
                  pIdx < section.paragraphs.length - 1 && s.paragraphSpacing,
                ]}
              >
                {paragraph}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ========================================
// المكون الرئيسي
// ========================================

export default function SeerahScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const colors = useColors();
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

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

  const handleExportPDF = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const html = SEERAH_SECTIONS.map((sec, i) => {
      const paragraphsHtml = sec.paragraphs.map(p => `<p>${p}</p>`).join('');
      return `<div class="section">
        <div class="section-title">${i + 1}. ${sec.title}</div>
        ${paragraphsHtml}
      </div>`;
    }).join('');
    showAdThenExport(() => exportAsPDF('السيرة النبوية', html));
  }, []);

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
          <MaterialCommunityIcons
            name="chevron-right"
            size={28}
            color={colors.text}
          />
        </Pressable>
        <Text style={[s.headerTitle, { color: colors.text }]}>
          السيرة النبوية
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
          <MaterialCommunityIcons name="book-account" size={36} color={ACCENT} />
          <View style={s.heroTextWrap}>
            <Text style={[s.heroTitle, { color: colors.text }]}>
              سيرة خاتم الأنبياء ﷺ
            </Text>
            <Text style={[s.heroSub, { color: colors.textLight }]}>
              من المولد إلى الوفاة — نور للعالمين
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Section count badge */}
        <View style={[s.countBadge, { backgroundColor: ACCENT_LIGHT }]}>
          <Text style={[s.countText, { color: ACCENT }]}>
            {SEERAH_SECTIONS.length} أبواب
          </Text>
        </View>

        {/* Timeline with sections */}
        <View style={s.timeline}>
          {SEERAH_SECTIONS.map((section, index) => (
            <View key={index}>
              {/* Timeline connector line */}
              {index < SEERAH_SECTIONS.length - 1 && (
                <View
                  style={[
                    s.timelineLine,
                    { backgroundColor: ACCENT_BORDER },
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
              اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ
            </Text>
            <Text style={[s.footerNote, { color: colors.textLight }]}>
              صلى الله عليه وعلى آله وصحبه وسلّم تسليمًا كثيرًا
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
    textAlign: 'right',
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

  // Paragraph text
  paragraph: {
    fontFamily: 'Cairo-Regular',
    fontSize: 16,
    lineHeight: 30,
    textAlign: 'right',
    writingDirection: 'rtl',
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
