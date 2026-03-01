/**
 * Daily Wird Screen — الورد اليومي
 * يشمل: أذكار الصباح، أذكار المساء، أذكار النوم، أذكار بعد الصلاة، دعاء اليوم
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Modal, Animated, Platform, Switch,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Dhikr {
  id: string;
  arabic: string;
  translation: string;
  count: number;
  virtue?: string;
  source?: string;
}

interface WirdCategory {
  id: string;
  title: string;
  icon: string;
  color: string;
  time: string;
  adhkar: Dhikr[];
}

// ─── Wird Data ────────────────────────────────────────────────────────────────
const WIRD_CATEGORIES: WirdCategory[] = [
  {
    id: 'morning',
    title: 'أذكار الصباح',
    icon: '🌅',
    color: '#F59E0B',
    time: 'بعد صلاة الفجر',
    adhkar: [
      {
        id: 'm1', count: 1,
        arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        translation: 'أصبحنا وأصبح الملك لله، والحمد لله وحده لا شريك له',
        source: 'أبو داود',
      },
      {
        id: 'm2', count: 3,
        arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
        translation: 'اللهم بك أصبحنا وبك نحيا ونموت وإليك النشور',
        source: 'الترمذي',
      },
      {
        id: 'm3', count: 1,
        arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
        translation: 'سيد الاستغفار',
        virtue: 'من قاله موقناً به فمات من يومه دخل الجنة',
        source: 'البخاري',
      },
      {
        id: 'm4', count: 3,
        arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        translation: 'من قالها ثلاثاً لم تصبه فجأة بلاء',
        virtue: 'لم يضره شيء',
        source: 'الترمذي',
      },
      {
        id: 'm5', count: 100,
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        translation: 'سبحان الله وبحمده',
        virtue: 'حطّت خطاياه وإن كانت مثل زبد البحر',
        source: 'مسلم',
      },
      {
        id: 'm6', count: 10,
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        translation: 'التهليل عشر مرات صباحاً',
        virtue: 'كانت كعِدْل عشر رقاب',
        source: 'أحمد',
      },
      {
        id: 'm7', count: 1,
        arabic: 'آيَةُ الكُرْسِيِّ — اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
        translation: 'آية الكرسي — البقرة: 255',
        virtue: 'من قرأها دبر كل صلاة لم يمنعه من دخول الجنة إلا أن يموت',
        source: 'النسائي',
      },
      {
        id: 'm8', count: 3,
        arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ • قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ • قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
        translation: 'المعوذات الثلاث',
        virtue: 'كفتك من كل شيء',
        source: 'أبو داود',
      },
    ],
  },
  {
    id: 'evening',
    title: 'أذكار المساء',
    icon: '🌙',
    color: '#2563EB',
    time: 'بعد صلاة العصر',
    adhkar: [
      {
        id: 'e1', count: 1,
        arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        translation: 'أمسينا وأمسى الملك لله',
        source: 'أبو داود',
      },
      {
        id: 'e2', count: 3,
        arabic: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ',
        translation: 'اللهم عافني في بدني وسمعي وبصري',
        source: 'أبو داود',
      },
      {
        id: 'e3', count: 1,
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي',
        translation: 'دعاء العافية',
        source: 'ابن ماجه',
      },
      {
        id: 'e4', count: 3,
        arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        translation: 'لم يضره لدغ تلك الليلة',
        virtue: 'لم يضره لدغ تلك الليلة',
        source: 'مسلم',
      },
      {
        id: 'e5', count: 7,
        arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
        translation: 'سبع مرات صباحاً ومساءً',
        virtue: 'كفاه الله ما أهمه من أمر الدنيا والآخرة',
        source: 'أبو داود',
      },
      {
        id: 'e6', count: 100,
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
        translation: 'سبحان الله وبحمده',
        virtue: 'حطّت خطاياه وإن كانت مثل زبد البحر',
        source: 'مسلم',
      },
    ],
  },
  {
    id: 'sleep',
    title: 'أذكار النوم',
    icon: '😴',
    color: '#7C3AED',
    time: 'عند النوم',
    adhkar: [
      {
        id: 's1', count: 1,
        arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
        translation: 'باسمك اللهم أموت وأحيا',
        source: 'البخاري',
      },
      {
        id: 's2', count: 1,
        arabic: 'الَّلهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
        translation: 'اللهم قني عذابك',
        source: 'أبو داود',
      },
      {
        id: 's3', count: 33,
        arabic: 'سُبْحَانَ اللَّهِ ﴿33﴾ • الْحَمْدُ لِلَّهِ ﴿33﴾ • اللَّهُ أَكْبَرُ ﴿34﴾',
        translation: 'تسبيح فاطمة عليها السلام',
        virtue: 'خير من خادم',
        source: 'البخاري',
      },
      {
        id: 's4', count: 1,
        arabic: 'آيَةُ الكُرْسِيِّ — اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...',
        translation: 'آية الكرسي',
        virtue: 'لا يزال عليك من الله حافظ ولا يقربك شيطان حتى تصبح',
        source: 'البخاري',
      },
      {
        id: 's5', count: 1,
        arabic: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ',
        translation: 'دعاء وضع الجنب',
        source: 'البخاري ومسلم',
      },
    ],
  },
  {
    id: 'prayer',
    title: 'أذكار بعد الصلاة',
    icon: '🕌',
    color: '#1B6B3A',
    time: 'عقب كل صلاة',
    adhkar: [
      {
        id: 'p1', count: 3,
        arabic: 'أَسْتَغْفِرُ اللَّهَ',
        translation: 'أستغفر الله',
        source: 'مسلم',
      },
      {
        id: 'p2', count: 1,
        arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
        translation: 'اللهم أنت السلام',
        source: 'مسلم',
      },
      {
        id: 'p3', count: 33,
        arabic: 'سُبْحَانَ اللَّهِ ﴿33﴾ • الْحَمْدُ لِلَّهِ ﴿33﴾ • اللَّهُ أَكْبَرُ ﴿33﴾\nثُمَّ: لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        translation: 'التسبيح والتحميد والتكبير',
        virtue: 'غُفرت خطاياه وإن كانت مثل زبد البحر',
        source: 'مسلم',
      },
      {
        id: 'p4', count: 1,
        arabic: 'آيَةُ الكُرْسِيِّ دُبُرَ كُلِّ صَلَاةٍ',
        translation: 'آية الكرسي دبر كل صلاة مكتوبة',
        virtue: 'لم يمنعه من دخول الجنة إلا أن يموت',
        source: 'النسائي',
      },
      {
        id: 'p5', count: 1,
        arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
        translation: 'اللهم أعني على ذكرك وشكرك وحسن عبادتك',
        source: 'أبو داود',
      },
    ],
  },
];

// ─── Daily Duas (rotated by day of year) ─────────────────────────────────────
const DAILY_DUAS = [
  { arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', ref: 'البقرة 201' },
  { arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِنْ لِسَانِي يَفْقَهُوا قَوْلِي', ref: 'طه 25-28' },
  { arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ', ref: 'آل عمران 8' },
  { arabic: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَى وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ وَأَصْلِحْ لِي فِي ذُرِّيَّتِي', ref: 'الأحقاف 15' },
  { arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى', ref: 'مسلم' },
  { arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْجُبْنِ وَالْبُخْلِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ', ref: 'البخاري' },
  { arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا', ref: 'الفرقان 74' },
];

const STORAGE_KEY = '@wird_progress';

interface WirdProgress {
  [categoryId: string]: {
    [dhikrId: string]: boolean;
  };
}

export default function DailyWirdScreen() {
  const colors = useColors();
  const [activeCategory, setActiveCategory] = useState('morning');
  const [progress, setProgress] = useState<WirdProgress>({});
  const [expandedDhikr, setExpandedDhikr] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const celebAnim = useRef(new Animated.Value(0)).current;

  const todayKey = new Date().toDateString();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyDua = DAILY_DUAS[dayOfYear % DAILY_DUAS.length];

  useEffect(() => {
    AsyncStorage.getItem(`${STORAGE_KEY}_${todayKey}`).then(data => {
      if (data) setProgress(JSON.parse(data));
    });
  }, []);

  const saveProgress = useCallback((p: WirdProgress) => {
    AsyncStorage.setItem(`${STORAGE_KEY}_${todayKey}`, JSON.stringify(p));
  }, [todayKey]);

  const toggleDhikr = useCallback((categoryId: string, dhikrId: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProgress(prev => {
      const newP: WirdProgress = {
        ...prev,
        [categoryId]: { ...(prev[categoryId] || {}), [dhikrId]: !prev[categoryId]?.[dhikrId] },
      };
      saveProgress(newP);

      // Check if category complete
      const cat = WIRD_CATEGORIES.find(c => c.id === categoryId)!;
      const allDone = cat.adhkar.every(d => newP[categoryId]?.[d.id]);
      if (allDone && !Object.values(prev[categoryId] || {}).every(Boolean)) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.sequence([
          Animated.timing(celebAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(2000),
          Animated.timing(celebAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      }
      return newP;
    });
  }, [saveProgress, celebAnim]);

  const getCategoryProgress = (cat: WirdCategory) => {
    const done = cat.adhkar.filter(d => progress[cat.id]?.[d.id]).length;
    return { done, total: cat.adhkar.length, pct: Math.round((done / cat.adhkar.length) * 100) };
  };

  const totalDone = WIRD_CATEGORIES.reduce((sum, cat) => sum + getCategoryProgress(cat).done, 0);
  const totalAll  = WIRD_CATEGORIES.reduce((sum, cat) => sum + cat.adhkar.length, 0);
  const overallPct = Math.round((totalDone / totalAll) * 100);

  const activeCat = WIRD_CATEGORIES.find(c => c.id === activeCategory)!;
  const { done: catDone, total: catTotal } = getCategoryProgress(activeCat);

  const s = StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: colors.foreground },
    // Daily dua card
    duaCard: {
      margin: 12, backgroundColor: '#1B6B3A', borderRadius: 18, padding: 18,
      shadowColor: '#1B6B3A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    duaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginBottom: 6, fontWeight: '700' },
    duaText: { fontSize: 17, color: '#fff', textAlign: 'right', lineHeight: 32, fontWeight: '600' },
    duaRef: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginTop: 8 },
    // Overall progress
    progressCard: {
      marginHorizontal: 12, marginBottom: 4, backgroundColor: colors.surface,
      borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: 13, fontWeight: '700', color: colors.foreground },
    progressPct: { fontSize: 13, fontWeight: '900', color: colors.primary },
    progressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: 8, backgroundColor: '#1B6B3A', borderRadius: 4 },
    // Category tabs
    tabsScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    tab: {
      paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5,
      flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8,
    },
    tabText: { fontSize: 13, fontWeight: '700' },
    tabBadge: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    // Category header
    catHeader: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    catTitle: { fontSize: 16, fontWeight: '800', color: colors.foreground },
    catProgress: { fontSize: 13, fontWeight: '700' },
    // Dhikr cards
    dhikrCard: {
      marginHorizontal: 12, marginVertical: 5, borderRadius: 14,
      borderWidth: 1, overflow: 'hidden',
    },
    dhikrMain: { padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    checkBtn: {
      width: 28, height: 28, borderRadius: 14, borderWidth: 2,
      justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 4,
    },
    dhikrBody: { flex: 1 },
    dhikrArabic: { fontSize: 17, lineHeight: 32, textAlign: 'right', fontWeight: '600' },
    dhikrTrans: { fontSize: 12, textAlign: 'right', marginTop: 4 },
    dhikrSource: { fontSize: 11, textAlign: 'right', marginTop: 2 },
    countBadge: {
      borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
      alignSelf: 'flex-end', marginTop: 6,
    },
    countText: { fontSize: 11, fontWeight: '800' },
    // Virtue card
    virtueCard: {
      paddingHorizontal: 14, paddingVertical: 10,
      borderTopWidth: 1,
    },
    virtueText: { fontSize: 12, textAlign: 'right', lineHeight: 20 },
    // Celebrate
    celebOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 999,
    },
    celebCard: {
      backgroundColor: '#fff', borderRadius: 28, padding: 40, alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20,
    },
  });

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ width: 36 }} />
        <Text style={s.title}>📜 الورد اليومي</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Dua of the Day */}
        <View style={s.duaCard}>
          <Text style={s.duaLabel}>📿 دعاء اليوم</Text>
          <Text style={s.duaText}>{dailyDua.arabic}</Text>
          <Text style={s.duaRef}>— {dailyDua.ref}</Text>
        </View>

        {/* Overall Progress */}
        <View style={s.progressCard}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>التقدم اليومي الكلي</Text>
            <Text style={[s.progressPct, { color: overallPct === 100 ? '#1B6B3A' : colors.primary }]}>
              {totalDone}/{totalAll} ({overallPct}%)
            </Text>
          </View>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${overallPct}%` as any, backgroundColor: overallPct === 100 ? '#1B6B3A' : colors.primary }]} />
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsScroll}>
          {WIRD_CATEGORIES.map(cat => {
            const { done, total } = getCategoryProgress(cat);
            const isActive = activeCategory === cat.id;
            const isDone = done === total;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[s.tab, {
                  borderColor: isActive ? cat.color : colors.border,
                  backgroundColor: isActive ? cat.color + '15' : colors.surface,
                }]}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                <Text style={[s.tabText, { color: isActive ? cat.color : colors.muted }]}>{cat.title}</Text>
                <View style={[s.tabBadge, { backgroundColor: isDone ? '#1B6B3A' : cat.color }]}>
                  <Text style={s.tabBadgeText}>{isDone ? '✓' : done}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Active Category */}
        <View style={s.catHeader}>
          <Text style={[s.catProgress, { color: activeCat.color }]}>{catDone}/{catTotal}</Text>
          <Text style={s.catTitle}>{activeCat.icon} {activeCat.title}</Text>
        </View>

        {/* Adhkar list */}
        {activeCat.adhkar.map((dhikr, idx) => {
          const isDone = !!progress[activeCat.id]?.[dhikr.id];
          const isExpanded = expandedDhikr === dhikr.id;
          return (
            <TouchableOpacity
              key={dhikr.id}
              style={[s.dhikrCard, {
                backgroundColor: isDone ? activeCat.color + '08' : colors.surface,
                borderColor: isDone ? activeCat.color + '40' : colors.border,
              }]}
              onPress={() => setExpandedDhikr(isExpanded ? null : dhikr.id)}
              activeOpacity={0.85}
            >
              <View style={s.dhikrMain}>
                <TouchableOpacity
                  style={[s.checkBtn, {
                    borderColor: isDone ? activeCat.color : colors.border,
                    backgroundColor: isDone ? activeCat.color : 'transparent',
                  }]}
                  onPress={() => toggleDhikr(activeCat.id, dhikr.id)}
                >
                  {isDone && <Text style={{ fontSize: 14, color: '#fff' }}>✓</Text>}
                </TouchableOpacity>
                <View style={s.dhikrBody}>
                  <Text style={[s.dhikrArabic, { color: isDone ? colors.muted : colors.foreground }]}>
                    {dhikr.arabic}
                  </Text>
                  {dhikr.translation !== dhikr.arabic && (
                    <Text style={[s.dhikrTrans, { color: colors.muted }]}>{dhikr.translation}</Text>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    {dhikr.source && <Text style={[s.dhikrSource, { color: colors.muted }]}>📚 {dhikr.source}</Text>}
                    <View style={[s.countBadge, { backgroundColor: activeCat.color + '18' }]}>
                      <Text style={[s.countText, { color: activeCat.color }]}>× {dhikr.count}</Text>
                    </View>
                  </View>
                </View>
              </View>
              {/* Virtue (expanded) */}
              {dhikr.virtue && isExpanded && (
                <View style={[s.virtueCard, { borderTopColor: activeCat.color + '30', backgroundColor: activeCat.color + '08' }]}>
                  <Text style={[s.virtueText, { color: activeCat.color }]}>🌟 {dhikr.virtue}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Celebration Overlay */}
      <Animated.View style={[s.celebOverlay, { opacity: celebAnim }]} pointerEvents="none">
        <View style={s.celebCard}>
          <Text style={{ fontSize: 60, marginBottom: 8 }}>🎉</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#1B6B3A', marginBottom: 6 }}>أحسنت!</Text>
          <Text style={{ fontSize: 14, color: '#555', textAlign: 'center' }}>أتممت {activeCat.title}</Text>
          <Text style={{ fontSize: 22, marginTop: 10 }}>بارك الله فيك 🌟</Text>
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}
