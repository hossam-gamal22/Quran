import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../constants/theme';
import { APP_CONFIG, APP_NAME } from '../constants/app';
import { ShareButton } from '../components/ShareButton';
import { copyToClipboard } from '../lib/share-service';
import { Share } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// الأنواع والواجهات
// ============================================

interface RuqyahItem {
  id: number;
  type: 'quran' | 'dua' | 'hadith';
  title: string;
  arabicText: string;
  translation?: string;
  repeat: number;
  reference: string;
  referenceDetail?: string;
  benefit?: string;
  audioUrl?: string;
}

interface RuqyahCategory {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  items: RuqyahItem[];
}

// ============================================
// بيانات الرقية الشرعية مع التخريج الكامل
// ============================================

const RUQYAH_DATA: RuqyahCategory[] = [
  {
    id: 1,
    title: 'الرقية من القرآن الكريم',
    description: 'آيات قرآنية للرقية الشرعية',
    icon: 'book',
    color: '#10B981',
    items: [
      {
        id: 101,
        type: 'quran',
        title: 'سورة الفاتحة',
        arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴿١﴾ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴿٢﴾ الرَّحْمَٰنِ الرَّحِيمِ ﴿٣﴾ مَالِكِ يَوْمِ الدِّينِ ﴿٤﴾ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٥﴾ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ﴿٦﴾ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ ﴿٧﴾',
        repeat: 7,
        reference: 'سورة الفاتحة',
        referenceDetail: 'رواه البخاري في حديث اللديغ (5749)',
        benefit: 'هي رقية، وفيها شفاء من كل داء',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
      },
      {
        id: 102,
        type: 'quran',
        title: 'آية الكرسي',
        arabicText: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
        repeat: 3,
        reference: 'البقرة: 255',
        referenceDetail: 'رواه البخاري (2311)',
        benefit: 'من قرأها في ليلة لم يزل عليه من الله حافظ ولا يقربه شيطان حتى يصبح',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/255.mp3',
      },
      {
        id: 103,
        type: 'quran',
        title: 'آخر آيتين من سورة البقرة',
        arabicText: 'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ﴿٢٨٥﴾ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ ﴿٢٨٦﴾',
        repeat: 1,
        reference: 'البقرة: 285-286',
        referenceDetail: 'رواه البخاري (5009) ومسلم (807)',
        benefit: 'من قرأهما في ليلة كفتاه',
        audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/285.mp3',
      },
      {
        id: 104,
        type: 'quran',
        title: 'سورة الإخلاص',
        arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ ﴿٤﴾',
        repeat: 3,
        reference: 'سورة الإخلاص',
        referenceDetail: 'رواه أبو داود (5082) والترمذي (3575)',
        benefit: 'من قرأها حين يصبح وحين يمسي ثلاث مرات كفته من كل شيء',
      },
      {
        id: 105,
        type: 'quran',
        title: 'سورة الفلق',
        arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِن شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾',
        repeat: 3,
        reference: 'سورة الفلق',
        referenceDetail: 'رواه أبو داود (5082) والترمذي (3575)',
        benefit: 'المعوذات للحماية من كل شر',
      },
      {
        id: 106,
        type: 'quran',
        title: 'سورة الناس',
        arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ إِلَٰهِ النَّاسِ ﴿٣﴾ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾',
        repeat: 3,
        reference: 'سورة الناس',
        referenceDetail: 'رواه أبو داود (5082) والترمذي (3575)',
        benefit: 'المعوذات للحماية من وسوسة الشيطان',
      },
      {
        id: 107,
        type: 'quran',
        title: 'آيات الشفاء',
        arabicText: 'وَيَشْفِ صُدُورَ قَوْمٍ مُّؤْمِنِينَ [التوبة:14]\n\nوَشِفَاءٌ لِّمَا فِي الصُّدُورِ [يونس:57]\n\nيَخْرُجُ مِن بُطُونِهَا شَرَابٌ مُّخْتَلِفٌ أَلْوَانُهُ فِيهِ شِفَاءٌ لِّلنَّاسِ [النحل:69]\n\nوَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ [الإسراء:82]\n\nوَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ [الشعراء:80]\n\nقُلْ هُوَ لِلَّذِينَ آمَنُوا هُدًى وَشِفَاءٌ [فصلت:44]',
        repeat: 3,
        reference: 'آيات الشفاء الستة',
        benefit: 'آيات ذُكر فيها الشفاء في القرآن الكريم',
      },
    ],
  },
  {
    id: 2,
    title: 'أدعية الرقية النبوية',
    description: 'أدعية ثابتة عن النبي ﷺ للرقية',
    icon: 'heart',
    color: '#6366F1',
    items: [
      {
        id: 201,
        type: 'dua',
        title: 'دعاء جبريل للنبي ﷺ',
        arabicText: 'بِسْمِ اللهِ أَرْقِيكَ، مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ، مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنِ حَاسِدٍ، اللهُ يَشْفِيكَ، بِسْمِ اللهِ أَرْقِيكَ',
        repeat: 3,
        reference: 'رواه مسلم (2186)',
        referenceDetail: 'من حديث أبي سعيد الخدري رضي الله عنه',
        benefit: 'رقية جبريل عليه السلام للنبي ﷺ',
      },
      {
        id: 202,
        type: 'dua',
        title: 'دعاء رقية المريض',
        arabicText: 'اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ البَاسَ، اشْفِهِ وَأَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا',
        repeat: 3,
        reference: 'رواه البخاري (5675) ومسلم (2191)',
        referenceDetail: 'من حديث عائشة رضي الله عنها',
        benefit: 'كان النبي ﷺ يعوذ بعض أهله بهذا الدعاء',
      },
      {
        id: 203,
        type: 'dua',
        title: 'دعاء وضع اليد على موضع الألم',
        arabicText: 'بِسْمِ اللهِ (ثلاثاً)\nأَعُوذُ باللهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ (سبع مرات)',
        repeat: 7,
        reference: 'رواه مسلم (2202)',
        referenceDetail: 'من حديث عثمان بن أبي العاص رضي الله عنه',
        benefit: 'يضع يده على موضع الألم ويقول هذا الدعاء',
      },
      {
        id: 204,
        type: 'dua',
        title: 'التعوذ من العين',
        arabicText: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ',
        repeat: 3,
        reference: 'رواه البخاري (3371)',
        referenceDetail: 'من حديث ابن عباس رضي الله عنهما',
        benefit: 'كان النبي ﷺ يعوذ الحسن والحسين بهذا الدعاء',
      },
      {
        id: 205,
        type: 'dua',
        title: 'دعاء دخول البيت',
        arabicText: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        repeat: 3,
        reference: 'رواه مسلم (2708)',
        referenceDetail: 'من حديث خولة بنت حكيم رضي الله عنها',
        benefit: 'من نزل منزلاً فقالها لم يضره شيء حتى يرتحل من منزله ذلك',
      },
      {
        id: 206,
        type: 'dua',
        title: 'دعاء الخروج من البيت',
        arabicText: 'بِسْمِ اللهِ، تَوَكَّلْتُ عَلَى اللهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
        repeat: 1,
        reference: 'رواه أبو داود (5095) والترمذي (3426)',
        referenceDetail: 'صححه الألباني',
        benefit: 'يُقال له: هُديت وكُفيت ووُقيت، وتنحى عنه الشيطان',
      },
      {
        id: 207,
        type: 'dua',
        title: 'الرقية من الهم والحزن',
        arabicText: 'اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ، أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ سَمَّيْتَ بِهِ نَفْسَكَ، أَوْ أَنْزَلْتَهُ فِي كِتَابِكَ، أَوْ عَلَّمْتَهُ أَحَدًا مِنْ خَلْقِكَ، أَوِ اسْتَأْثَرْتَ بِهِ فِي عِلْمِ الْغَيْبِ عِنْدَكَ، أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي',
        repeat: 1,
        reference: 'رواه أحمد (3712)',
        referenceDetail: 'صححه الألباني في الصحيحة (199)',
        benefit: 'ما قالها عبد قط إلا أذهب الله همه وأبدله مكان حزنه فرحاً',
      },
      {
        id: 208,
        type: 'dua',
        title: 'الرقية من الوسواس',
        arabicText: 'آمَنْتُ بِاللهِ وَرُسُلِهِ',
        repeat: 3,
        reference: 'رواه مسلم (134)',
        referenceDetail: 'من حديث أبي هريرة رضي الله عنه',
        benefit: 'إذا وجد أحدكم في نفسه شيئاً فليقل: آمنت بالله ورسله',
      },
    ],
  },
  {
    id: 3,
    title: 'رقية العين والحسد',
    description: 'آيات وأدعية للحماية من العين والحسد',
    icon: 'eye-off',
    color: '#F59E0B',
    items: [
      {
        id: 301,
        type: 'quran',
        title: 'آية الحسد',
        arabicText: 'وَإِن يَكَادُ الَّذِينَ كَفَرُوا لَيُزْلِقُونَكَ بِأَبْصَارِهِمْ لَمَّا سَمِعُوا الذِّكْرَ وَيَقُولُونَ إِنَّهُ لَمَجْنُونٌ ﴿٥١﴾ وَمَا هُوَ إِلَّا ذِكْرٌ لِّلْعَالَمِينَ ﴿٥٢﴾',
        repeat: 3,
        reference: 'القلم: 51-52',
        benefit: 'للحماية من نظرات الحاسدين',
      },
      {
        id: 302,
        type: 'quran',
        title: 'آية الكرسي للعين',
        arabicText: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ...',
        repeat: 3,
        reference: 'البقرة: 255',
        referenceDetail: 'رواه البخاري (2311)',
        benefit: 'أعظم آية في القرآن للحماية',
      },
      {
        id: 303,
        type: 'dua',
        title: 'دعاء رؤية ما يعجبه',
        arabicText: 'اللَّهُمَّ بَارِكْ عَلَيْهِ / مَا شَاءَ اللهُ لَا قُوَّةَ إِلَّا بِاللهِ',
        repeat: 1,
        reference: 'رواه ابن ماجه (3509)',
        referenceDetail: 'من حديث أنس رضي الله عنه',
        benefit: 'إذا رأيت ما يعجبك فادع بالبركة',
      },
      {
        id: 304,
        type: 'dua',
        title: 'غسل العائن',
        arabicText: 'إذا عُرف العائن يُطلب منه أن يتوضأ ويُصب الماء على المصاب',
        repeat: 1,
        reference: 'رواه مسلم (2188)',
        referenceDetail: 'من حديث عبدالله بن عباس رضي الله عنهما',
        benefit: 'العين حق، ولو كان شيء سابق القدر سبقته العين',
      },
    ],
  },
  {
    id: 4,
    title: 'رقية السحر والمس',
    description: 'آيات وأدعية للحماية من السحر',
    icon: 'shield-checkmark',
    color: '#EF4444',
    items: [
      {
        id: 401,
        type: 'quran',
        title: 'آيات إبطال السحر - الأعراف',
        arabicText: 'وَأَوْحَيْنَا إِلَىٰ مُوسَىٰ أَنْ أَلْقِ عَصَاكَ ۖ فَإِذَا هِيَ تَلْقَفُ مَا يَأْفِكُونَ ﴿١١٧﴾ فَوَقَعَ الْحَقُّ وَبَطَلَ مَا كَانُوا يَعْمَلُونَ ﴿١١٨﴾ فَغُلِبُوا هُنَالِكَ وَانقَلَبُوا صَاغِرِينَ ﴿١١٩﴾ وَأُلْقِيَ السَّحَرَةُ سَاجِدِينَ ﴿١٢٠﴾ قَالُوا آمَنَّا بِرَبِّ الْعَالَمِينَ ﴿١٢١﴾ رَبِّ مُوسَىٰ وَهَارُونَ ﴿١٢٢﴾',
        repeat: 3,
        reference: 'الأعراف: 117-122',
        benefit: 'آيات إبطال السحر',
      },
      {
        id: 402,
        type: 'quran',
        title: 'آيات إبطال السحر - يونس',
        arabicText: 'وَقَالَ فِرْعَوْنُ ائْتُونِي بِكُلِّ سَاحِرٍ عَلِيمٍ ﴿٧٩﴾ فَلَمَّا جَاءَ السَّحَرَةُ قَالَ لَهُم مُّوسَىٰ أَلْقُوا مَا أَنتُم مُّلْقُونَ ﴿٨٠﴾ فَلَمَّا أَلْقَوْا قَالَ مُوسَىٰ مَا جِئْتُم بِهِ السِّحْرُ ۖ إِنَّ اللَّهَ سَيُبْطِلُهُ ۖ إِنَّ اللَّهَ لَا يُصْلِحُ عَمَلَ الْمُفْسِدِينَ ﴿٨١﴾ وَيُحِقُّ اللَّهُ الْحَقَّ بِكَلِمَاتِهِ وَلَوْ كَرِهَ الْمُجْرِمُونَ ﴿٨٢﴾',
        repeat: 3,
        reference: 'يونس: 79-82',
        benefit: 'آيات إبطال السحر',
      },
      {
        id: 403,
        type: 'quran',
        title: 'آيات إبطال السحر - طه',
        arabicText: 'قَالُوا يَا مُوسَىٰ إِمَّا أَن تُلْقِيَ وَإِمَّا أَن نَّكُونَ أَوَّلَ مَنْ أَلْقَىٰ ﴿٦٥﴾ قَالَ بَلْ أَلْقُوا ۖ فَإِذَا حِبَالُهُمْ وَعِصِيُّهُمْ يُخَيَّلُ إِلَيْهِ مِن سِحْرِهِمْ أَنَّهَا تَسْعَىٰ ﴿٦٦﴾ فَأَوْجَسَ فِي نَفْسِهِ خِيفَةً مُّوسَىٰ ﴿٦٧﴾ قُلْنَا لَا تَخَفْ إِنَّكَ أَنتَ الْأَعْلَىٰ ﴿٦٨﴾ وَأَلْقِ مَا فِي يَمِينِكَ تَلْقَفْ مَا صَنَعُوا ۖ إِنَّمَا صَنَعُوا كَيْدُ سَاحِرٍ ۖ وَلَا يُفْلِحُ السَّاحِرُ حَيْثُ أَتَىٰ ﴿٦٩﴾',
        repeat: 3,
        reference: 'طه: 65-69',
        benefit: 'آيات إبطال السحر',
      },
      {
        id: 404,
        type: 'quran',
        title: 'سورة الكافرون',
        arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ قُلْ يَا أَيُّهَا الْكَافِرُونَ ﴿١﴾ لَا أَعْبُدُ مَا تَعْبُدُونَ ﴿٢﴾ وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُدُ ﴿٣﴾ وَلَا أَنَا عَابِدٌ مَّا عَبَدتُّمْ ﴿٤﴾ وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُدُ ﴿٥﴾ لَكُمْ دِينُكُمْ وَلِيَ دِينِ ﴿٦﴾',
        repeat: 3,
        reference: 'سورة الكافرون',
        referenceDetail: 'رواه أبو داود (5055)',
        benefit: 'براءة من الشرك',
      },
    ],
  },
];

// ============================================
// المكون الرئيسي
// ============================================

export default function RuqyahScreen() {
  const router = useRouter();
  
  // الحالات
  const [selectedCategory, setSelectedCategory] = useState<RuqyahCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<RuqyahItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ [key: number]: number }>({});
  
  // الأنيميشن
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ============================================
  // تحميل البيانات
  // ============================================

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadData = async () => {
    try {
      const favs = await AsyncStorage.getItem('ruqyah_favorites');
      if (favs) {
        setFavorites(JSON.parse(favs));
      }

      const prog = await AsyncStorage.getItem('ruqyah_progress');
      if (prog) {
        setProgress(JSON.parse(prog));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const toggleFavorite = async (itemId: number) => {
    const newFavorites = favorites.includes(itemId)
      ? favorites.filter(id => id !== itemId)
      : [...favorites, itemId];
    
    setFavorites(newFavorites);
    await AsyncStorage.setItem('ruqyah_favorites', JSON.stringify(newFavorites));
  };

  // ============================================
  // تشغيل الصوت
  // ============================================

  const playAudio = async (item: RuqyahItem) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      if (!item.audioUrl) {
        Alert.alert('تنبيه', 'لا يتوفر ملف صوتي لهذه الآية');
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: item.audioUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);
      setCurrentPlayingId(item.id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setCurrentPlayingId(null);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تشغيل الصوت');
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
      setCurrentPlayingId(null);
    }
  };

  // ============================================
  // المشاركة والنسخ
  // ============================================

  const formatRuqyahForShare = (item: RuqyahItem) => {
    let shareText = `📖 الرقية الشرعية\n\n`;
    shareText += `📌 ${item.title}\n\n`;
    shareText += `「 ${item.arabicText} 」\n\n`;
    shareText += `🔄 التكرار: ${item.repeat} ${item.repeat > 1 ? 'مرات' : 'مرة'}\n`;
    
    if (item.reference) {
      shareText += `\n📚 المصدر: ${item.reference}`;
    }
    
    if (item.referenceDetail) {
      shareText += `\n📖 التخريج: ${item.referenceDetail}`;
    }
    
    if (item.benefit) {
      shareText += `\n\n✨ الفائدة:\n${item.benefit}`;
    }
    
    shareText += `\n\n${APP_CONFIG.getShareSignature()}`;
    
    return shareText;
  };

  const handleShare = async (item: RuqyahItem) => {
    try {
      const shareText = formatRuqyahForShare(item);
      await Share.share({ message: shareText });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopy = async (item: RuqyahItem) => {
    const shareText = formatRuqyahForShare(item);
    await copyToClipboard(shareText);
    Alert.alert('تم النسخ', 'تم نسخ الرقية إلى الحافظة');
    setShowShareModal(false);
  };

  const shareCategory = async (category: RuqyahCategory) => {
    let shareText = `📖 ${category.title}\n`;
    shareText += `${category.description}\n\n`;
    
    category.items.forEach((item, index) => {
      shareText += `${index + 1}. ${item.title}\n`;
    });
    
    shareText += `\n${APP_CONFIG.getShareSignature()}`;
    
    try {
      await Share.share({ message: shareText });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // ============================================
  // عرض التفاصيل
  // ============================================

  const openItemDetails = (item: RuqyahItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  // ============================================
  // عرض الفئات
  // ============================================

  const renderCategory = (category: RuqyahCategory) => (
    <TouchableOpacity
      key={category.id}
      style={[styles.categoryCard, { borderLeftColor: category.color }]}
      onPress={() => setSelectedCategory(category)}
      onLongPress={() => shareCategory(category)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
        <Ionicons name={category.icon as any} size={28} color={category.color} />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryTitle}>{category.title}</Text>
        <Text style={styles.categoryDescription}>{category.description}</Text>
        <Text style={styles.categoryCount}>{category.items.length} عنصر</Text>
      </View>
      <Ionicons name="chevron-back" size={24} color={Colors.textLight} />
    </TouchableOpacity>
  );

  // ============================================
  // عرض عناصر الرقية
  // ============================================

  const renderItem = (item: RuqyahItem) => {
    const isFavorite = favorites.includes(item.id);
    const isCurrentPlaying = currentPlayingId === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemCard}
        onPress={() => openItemDetails(item)}
        onLongPress={() => {
          setSelectedItem(item);
          setShowShareModal(true);
        }}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleRow}>
            <View style={[styles.typeBadge, { 
              backgroundColor: item.type === 'quran' ? Colors.success + '20' : Colors.primary + '20' 
            }]}>
              <Text style={[styles.typeBadgeText, {
                color: item.type === 'quran' ? Colors.success : Colors.primary
              }]}>
                {item.type === 'quran' ? 'قرآن' : item.type === 'dua' ? 'دعاء' : 'حديث'}
              </Text>
            </View>
            <Text style={styles.itemTitle}>{item.title}</Text>
          </View>
          
          <View style={styles.itemActions}>
            {item.audioUrl && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => isCurrentPlaying ? stopAudio() : playAudio(item)}
              >
                <Ionicons 
                  name={isCurrentPlaying && isPlaying ? "pause" : "play"} 
                  size={18} 
                  color={Colors.primary} 
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleShare(item)}
            >
              <Ionicons name="share-outline" size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleFavorite(item.id)}
            >
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={18} 
                color={isFavorite ? Colors.error : Colors.textLight} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.itemText} numberOfLines={3}>
          {item.arabicText}
        </Text>

        <View style={styles.itemFooter}>
          <View style={styles.repeatBadge}>
            <Ionicons name="repeat" size={14} color={Colors.primary} />
            <Text style={styles.repeatText}>{item.repeat}x</Text>
          </View>
          {item.reference && (
            <Text style={styles.referenceText}>{item.reference}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ============================================
  // العرض الرئيسي
  // ============================================

  return (
    <View style={styles.container}>
      {/* الهيدر */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => selectedCategory ? setSelectedCategory(null) : router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-forward" size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {selectedCategory ? selectedCategory.title : 'الرقية الشرعية'}
        </Text>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => {
            if (selectedCategory) {
              shareCategory(selectedCategory);
            }
          }}
        >
          <Ionicons name="share-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* المحتوى */}
      <Animated.ScrollView 
        style={[styles.content, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
      >
        {!selectedCategory ? (
          // عرض الفئات
          <>
            <View style={styles.introCard}>
              <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
              <Text style={styles.introTitle}>الرقية الشرعية</Text>
              <Text style={styles.introText}>
                الرقية الشرعية هي القراءة على المريض بالقرآن الكريم والأدعية النبوية الصحيحة طلباً للشفاء من الله تعالى
              </Text>
            </View>

            {RUQYAH_DATA.map(renderCategory)}

            <View style={styles.noteCard}>
              <Ionicons name="information-circle" size={24} color={Colors.warning} />
              <Text style={styles.noteText}>
                الرقية الشرعية من الأسباب المشروعة للشفاء، مع الأخذ بالأسباب الأخرى والتوكل على الله
              </Text>
            </View>
          </>
        ) : (
          // عرض عناصر الفئة
          <>
            <View style={[styles.categoryHeader, { backgroundColor: selectedCategory.color + '10' }]}>
              <Ionicons name={selectedCategory.icon as any} size={32} color={selectedCategory.color} />
              <Text style={styles.categoryHeaderTitle}>{selectedCategory.title}</Text>
              <Text style={styles.categoryHeaderDesc}>{selectedCategory.description}</Text>
            </View>

            {selectedCategory.items.map(renderItem)}
          </>
        )}
      </Animated.ScrollView>

      {/* ============================================ */}
      {/* نافذة تفاصيل العنصر */}
      {/* ============================================ */}
      <Modal
        visible={showItemModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedItem.title}</Text>
                  <TouchableOpacity onPress={() => setShowItemModal(false)}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* نوع العنصر */}
                  <View style={[styles.typeBadgeLarge, { 
                    backgroundColor: selectedItem.type === 'quran' ? Colors.success + '20' : Colors.primary + '20' 
                  }]}>
                    <Text style={[styles.typeBadgeLargeText, {
                      color: selectedItem.type === 'quran' ? Colors.success : Colors.primary
                    }]}>
                      {selectedItem.type === 'quran' ? '📖 قرآن كريم' : selectedItem.type === 'dua' ? '🤲 دعاء نبوي' : '📜 حديث شريف'}
                    </Text>
                  </View>

                  {/* النص */}
                  <View style={styles.textContainer}>
                    <Text style={styles.arabicText}>{selectedItem.arabicText}</Text>
                  </View>

                  {/* التكرار */}
                  <View style={styles.repeatContainer}>
                    <Ionicons name="repeat" size={20} color={Colors.primary} />
                    <Text style={styles.repeatLabel}>التكرار:</Text>
                    <Text style={styles.repeatValue}>
                      {selectedItem.repeat} {selectedItem.repeat > 1 ? 'مرات' : 'مرة'}
                    </Text>
                  </View>

                  {/* المصدر */}
                  {selectedItem.reference && (
                    <View style={styles.referenceContainer}>
                      <View style={styles.referenceHeader}>
                        <Ionicons name="book" size={18} color={Colors.secondary} />
                        <Text style={styles.referenceTitle}>المصدر</Text>
                      </View>
                      <Text style={styles.referenceValue}>{selectedItem.reference}</Text>
                      {selectedItem.referenceDetail && (
                        <Text style={styles.referenceDetail}>{selectedItem.referenceDetail}</Text>
                      )}
                    </View>
                  )}

                  {/* الفائدة */}
                  {selectedItem.benefit && (
                    <View style={styles.benefitContainer}>
                      <View style={styles.benefitHeader}>
                        <Ionicons name="sparkles" size={18} color={Colors.warning} />
                        <Text style={styles.benefitTitle}>الفائدة</Text>
                      </View>
                      <Text style={styles.benefitText}>{selectedItem.benefit}</Text>
                    </View>
                  )}
                </ScrollView>

                {/* أزرار الإجراءات */}
                <View style={styles.modalActions}>
                  {selectedItem.audioUrl && (
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: Colors.primary }]}
                      onPress={() => currentPlayingId === selectedItem.id && isPlaying ? stopAudio() : playAudio(selectedItem)}
                    >
                      <Ionicons 
                        name={currentPlayingId === selectedItem.id && isPlaying ? "pause" : "play"} 
                        size={20} 
                        color={Colors.white} 
                      />
                      <Text style={styles.modalButtonText}>
                        {currentPlayingId === selectedItem.id && isPlaying ? 'إيقاف' : 'استماع'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: Colors.secondary }]}
                    onPress={() => handleShare(selectedItem)}
                  >
                    <Ionicons name="share-outline" size={20} color={Colors.white} />
                    <Text style={styles.modalButtonText}>مشاركة</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: favorites.includes(selectedItem.id) ? Colors.error : Colors.textLight }]}
                    onPress={() => toggleFavorite(selectedItem.id)}
                  >
                    <Ionicons 
                      name={favorites.includes(selectedItem.id) ? "heart" : "heart-outline"} 
                      size={20} 
                      color={Colors.white} 
                    />
                    <Text style={styles.modalButtonText}>
                      {favorites.includes(selectedItem.id) ? 'إزالة' : 'حفظ'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* نافذة المشاركة */}
      {/* ============================================ */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto' }]}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>مشاركة</Text>
                  <TouchableOpacity onPress={() => setShowShareModal(false)}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </TouchableOpacity>
                </View>

                {/* معاينة */}
                <View style={styles.sharePreview}>
                  <Text style={styles.sharePreviewTitle}>{selectedItem.title}</Text>
                  <Text style={styles.sharePreviewText} numberOfLines={2}>
                    {selectedItem.arabicText}
                  </Text>
                </View>

                {/* خيارات المشاركة */}
                <View style={styles.shareOptions}>
                  <TouchableOpacity 
                    style={styles.shareOption} 
                    onPress={() => {
                      handleShare(selectedItem);
                      setShowShareModal(false);
                    }}
                  >
                    <View style={[styles.shareOptionIcon, { backgroundColor: Colors.primary }]}>
                      <Ionicons name="share-outline" size={24} color={Colors.white} />
                    </View>
                    <Text style={styles.shareOptionText}>مشاركة</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.shareOption} onPress={() => handleCopy(selectedItem)}>
                    <View style={[styles.shareOptionIcon, { backgroundColor: Colors.secondary }]}>
                      <Ionicons name="copy-outline" size={24} color={Colors.white} />
                    </View>
                    <Text style={styles.shareOptionText}>نسخ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.shareOption} 
                    onPress={async () => {
                      const text = formatRuqyahForShare(selectedItem);
                      await Share.share({ message: text });
                      setShowShareModal(false);
                    }}
                  >
                    <View style={[styles.shareOptionIcon, { backgroundColor: '#25D366' }]}>
                      <Ionicons name="logo-whatsapp" size={24} color={Colors.white} />
                    </View>
                    <Text style={styles.shareOptionText}>واتساب</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.shareOption} 
                    onPress={() => {
                      toggleFavorite(selectedItem.id);
                      setShowShareModal(false);
                    }}
                  >
                    <View style={[styles.shareOptionIcon, { 
                      backgroundColor: favorites.includes(selectedItem.id) ? Colors.error : Colors.textLight 
                    }]}>
                      <Ionicons 
                        name={favorites.includes(selectedItem.id) ? "heart" : "heart-outline"} 
                        size={24} 
                        color={Colors.white} 
                      />
                    </View>
                    <Text style={styles.shareOptionText}>
                      {favorites.includes(selectedItem.id) ? 'إزالة' : 'حفظ'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// الأنماط
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  introCard: {
    backgroundColor: Colors.primary + '10',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  introTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  introText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    ...Shadows.sm,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  categoryTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
  },
  categoryDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: 'right',
  },
  categoryCount: {
    fontSize: Typography.sizes.xs,
    color: Colors.primary,
    marginTop: 4,
    textAlign: 'right',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  noteText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
    lineHeight: 22,
  },
  categoryHeader: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  categoryHeaderTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  categoryHeaderDesc: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: 4,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.xs,
  },
  itemText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    lineHeight: 26,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  repeatText: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  referenceText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '80%',
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  modalBody: {
    flex: 1,
  },
  typeBadgeLarge: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  typeBadgeLargeText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
  },
  // ... إكمال الأنماط من حيث توقفنا

  textContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  arabicText: {
    fontSize: 22,
    fontWeight: '500',
    color: Colors.text,
    lineHeight: 38,
    textAlign: 'right',
  },
  repeatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  repeatLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
  },
  repeatValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  referenceContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  referenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  referenceTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  referenceValue: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    textAlign: 'right',
  },
  referenceDetail: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: 'right',
  },
  benefitContainer: {
    backgroundColor: Colors.warning + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  benefitTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  benefitText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  modalButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.white,
  },
  sharePreview: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  sharePreviewTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sharePreviewText: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  shareOption: {
    alignItems: 'center',
    width: '25%',
    marginBottom: Spacing.md,
  },
  shareOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  shareOptionText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
});
