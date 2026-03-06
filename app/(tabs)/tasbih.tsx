import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Vibration,
  Alert,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { useSettings } from '../../contexts/SettingsContext';
import BackgroundWrapper from '../../components/ui/BackgroundWrapper';
import { GlassCard, GlassToggle } from '../../components/ui/GlassCard';
import { copyToClipboard } from '../../lib/clipboard';
import { APP_CONFIG } from '../../constants/app';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { Share } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================
// الأنواع
// ============================================

interface TasbihItem {
  id: number;
  text: string;
  transliteration?: string;
  target: number;
  virtue?: string;
  reference?: string;
  source?: 'quran' | 'hadith_sahih' | 'hadith_hasan' | 'athar';
  grade?: string;
}

interface CustomTasbih {
  id: number;
  text: string;
  target: number;
  createdAt: string;
}

// ============================================
// بيانات التسبيحات المعتمدة
// ============================================

const PRESET_TASBIHAT: TasbihItem[] = [
  {
    id: 1,
    text: 'سُبْحَانَ اللهِ',
    transliteration: 'Subhan Allah',
    target: 33,
    virtue: 'تملأ الميزان',
    reference: 'رواه مسلم (223)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 2,
    text: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    target: 33,
    virtue: 'تملأ الميزان',
    reference: 'رواه مسلم (223)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 3,
    text: 'اللهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    target: 33,
    virtue: 'تملأ ما بين السماء والأرض',
    reference: 'رواه مسلم (223)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 4,
    text: 'لَا إِلَهَ إِلَّا اللهُ',
    transliteration: 'La ilaha illa Allah',
    target: 100,
    virtue: 'كانت له عدل عشر رقاب، وكتبت له مائة حسنة',
    reference: 'رواه البخاري (3293) ومسلم (2691)',
    source: 'hadith_sahih',
    grade: 'متفق عليه',
  },
  {
    id: 5,
    text: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illa Allahu wahdahu la sharika lah...',
    target: 100,
    virtue: 'كانت له عدل عشر رقاب وكتبت له مائة حسنة ومحيت عنه مائة سيئة',
    reference: 'رواه البخاري (3293) ومسلم (2691)',
    source: 'hadith_sahih',
    grade: 'متفق عليه',
  },
  {
    id: 6,
    text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    transliteration: 'Subhan Allahi wa bihamdih',
    target: 100,
    virtue: 'حُطَّت خطاياه وإن كانت مثل زبد البحر',
    reference: 'رواه البخاري (6405) ومسلم (2691)',
    source: 'hadith_sahih',
    grade: 'متفق عليه',
  },
  {
    id: 7,
    text: 'سُبْحَانَ اللهِ الْعَظِيمِ وَبِحَمْدِهِ',
    transliteration: 'Subhan Allahil Azeem wa bihamdih',
    target: 100,
    virtue: 'غُرست له نخلة في الجنة',
    reference: 'رواه الترمذي (3464) وصححه الألباني',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 8,
    text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
    transliteration: 'La hawla wa la quwwata illa billah',
    target: 100,
    virtue: 'كنز من كنوز الجنة',
    reference: 'رواه البخاري (4205) ومسلم (2704)',
    source: 'hadith_sahih',
    grade: 'متفق عليه',
  },
  {
    id: 9,
    text: 'أَسْتَغْفِرُ اللهَ',
    transliteration: 'Astaghfirullah',
    target: 100,
    virtue: 'من لزم الاستغفار جعل الله له من كل هم فرجاً',
    reference: 'رواه أبو داود (1518) وصححه الألباني',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 10,
    text: 'أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullah al-Azeem...',
    target: 3,
    virtue: 'غُفرت ذنوبه وإن كان فارًا من الزحف',
    reference: 'رواه أبو داود (1517) والترمذي (3577)',
    source: 'hadith_hasan',
    grade: 'حسن',
  },
  {
    id: 11,
    text: 'سُبْحَانَ اللهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ',
    transliteration: 'Subhan Allah, wal hamdulillah...',
    target: 100,
    virtue: 'أحب الكلام إلى الله',
    reference: 'رواه مسلم (2137)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 12,
    text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    transliteration: 'Allahumma salli wa sallim ala nabiyyina Muhammad',
    target: 100,
    virtue: 'من صلى عليَّ صلاة صلى الله عليه بها عشراً',
    reference: 'رواه مسلم (384)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 13,
    text: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    transliteration: 'Rabbi ighfir li wa tub alayya...',
    target: 100,
    virtue: 'كان النبي ﷺ يقولها في المجلس الواحد مائة مرة',
    reference: 'رواه أبو داود (1516) والترمذي (3434)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 14,
    text: 'سُبُّوحٌ قُدُّوسٌ رَبُّ الْمَلَائِكَةِ وَالرُّوحِ',
    transliteration: 'Subbuhun Quddusun Rabbul malaikati war-ruh',
    target: 33,
    virtue: 'كان النبي ﷺ يقولها في ركوعه وسجوده',
    reference: 'رواه مسلم (487)',
    source: 'hadith_sahih',
    grade: 'صحيح',
  },
  {
    id: 15,
    text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
    transliteration: 'Ya Hayyu Ya Qayyum bi rahmatika astaghith',
    target: 7,
    virtue: 'دعاء الكرب والشدة',
    reference: 'رواه الترمذي (3524) وحسنه الألباني',
    source: 'hadith_hasan',
    grade: 'حسن',
  },
];

// ============================================
// الثوابت
// ============================================

const RING_SIZE = SCREEN_WIDTH * 0.6;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const GREEN = '#2f7659';
const GREEN_LIGHT = '#34D399';

const STORAGE_KEYS = {
  progress: 'tasbih_progress',
  settings: 'tasbih_settings',
  dailyStats: 'tasbih_daily_stats',
  customTasbihat: 'custom_tasbihat',
  completedToday: 'tasbih_completed_today',
};

// ============================================
// المكون الرئيسي
// ============================================

export default function TasbihScreen() {
  const { isDarkMode, settings, isRTL } = useSettings();

  const C = {
    bg: isDarkMode ? '#0f1117' : '#f5f5f5',
    card: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    text: isDarkMode ? '#fff' : '#1a1a1a',
    textSec: isDarkMode ? '#8e8e93' : '#6c6c70',
    ring: GREEN,
    ringBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  };

  // ===== STATE =====
  const [selectedTasbih, setSelectedTasbih] = useState<TasbihItem>(PRESET_TASBIHAT[0]);
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [showTasbihList, setShowTasbihList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [customTasbihat, setCustomTasbihat] = useState<CustomTasbih[]>([]);
  const [customText, setCustomText] = useState('');
  const [customTarget, setCustomTarget] = useState('33');
  const [dailyStats, setDailyStats] = useState<Record<string, number>>({});
  const [showVirtue, setShowVirtue] = useState(true);
  const [completedTasbihat, setCompletedTasbihat] = useState<Record<number, boolean>>({});

  // ===== ANIMATION =====
  const progress = useSharedValue(0);
  const tapScale = useSharedValue(1);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value),
  }));

  const tapAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
  }));

  // ===== DATA LOADING =====
  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    progress.value = withTiming(count / selectedTasbih.target, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [count, selectedTasbih.target]);

  const loadData = async () => {
    try {
      const [settingsRaw, customRaw, progressRaw, statsRaw, completedRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.settings),
        AsyncStorage.getItem(STORAGE_KEYS.customTasbihat),
        AsyncStorage.getItem(STORAGE_KEYS.progress),
        AsyncStorage.getItem(STORAGE_KEYS.dailyStats),
        AsyncStorage.getItem(STORAGE_KEYS.completedToday),
      ]);

      if (settingsRaw) {
        const p = JSON.parse(settingsRaw);
        setVibrationEnabled(p.vibrationEnabled ?? true);
        setShowVirtue(p.showVirtue ?? true);
        setAutoAdvance(p.autoAdvance ?? false);
      }
      if (customRaw) setCustomTasbihat(JSON.parse(customRaw));
      if (progressRaw) {
        const p = JSON.parse(progressRaw);
        if (p.date === new Date().toDateString()) {
          setCount(p.count || 0);
          setTotalCount(p.totalCount || 0);
          setRounds(p.rounds || 0);
          if (p.selectedId) {
            const found = PRESET_TASBIHAT.find(t => t.id === p.selectedId);
            if (found) setSelectedTasbih(found);
          }
        }
      }
      if (statsRaw) setDailyStats(JSON.parse(statsRaw));
      if (completedRaw) {
        const parsed = JSON.parse(completedRaw);
        if (parsed.date === new Date().toDateString()) {
          setCompletedTasbihat(parsed.completed || {});
        }
      }
    } catch (e) {
      console.error('Error loading tasbih data:', e);
    }
  };

  const saveProgress = useCallback(async (c: number, t: number, r: number) => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(STORAGE_KEYS.progress, JSON.stringify({
        date: today, count: c, totalCount: t, rounds: r, selectedId: selectedTasbih.id,
      }));
      const newStats = { ...dailyStats, [today]: t };
      setDailyStats(newStats);
      await AsyncStorage.setItem(STORAGE_KEYS.dailyStats, JSON.stringify(newStats));
    } catch (e) { console.error(e); }
  }, [selectedTasbih.id, dailyStats]);

  const saveSettings = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ vibrationEnabled, showVirtue, autoAdvance }));
  };

  // ===== HANDLERS =====
  const handlePress = useCallback(() => {
    tapScale.value = withSpring(0.95, { damping: 10, stiffness: 300 }, () => {
      tapScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    });

    if (vibrationEnabled) {
      Platform.OS === 'ios'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Vibration.vibrate(30);
    }

    const newCount = count + 1;
    const newTotal = totalCount + 1;

    if (newCount >= selectedTasbih.target) {
      if (vibrationEnabled) {
        Platform.OS === 'ios'
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Vibration.vibrate([0, 100, 100, 100]);
      }
      setCount(0);
      setRounds(r => r + 1);
      setTotalCount(newTotal);
      saveProgress(0, newTotal, rounds + 1);
      const newCompleted = { ...completedTasbihat, [selectedTasbih.id]: true };
      setCompletedTasbihat(newCompleted);
      AsyncStorage.setItem(STORAGE_KEYS.completedToday, JSON.stringify({
        date: new Date().toDateString(), completed: newCompleted,
      }));
      
      // Auto-advance to next tasbih if enabled
      if (autoAdvance) {
        const allItems: TasbihItem[] = [
          ...PRESET_TASBIHAT,
          ...customTasbihat.map(ct => ({
            id: ct.id,
            text: ct.text,
            target: ct.target,
            source: 'athar' as const,
          })),
        ];
        const currentIndex = allItems.findIndex(t => t.id === selectedTasbih.id);
        const nextIndex = (currentIndex + 1) % allItems.length;
        setSelectedTasbih(allItems[nextIndex]);
      }
    } else {
      setCount(newCount);
      setTotalCount(newTotal);
      saveProgress(newCount, newTotal, rounds);
    }
  }, [count, totalCount, rounds, selectedTasbih, vibrationEnabled, autoAdvance, customTasbihat, completedTasbihat, saveProgress]);

  const handleReset = () => {
    Alert.alert('إعادة تعيين', 'هل تريد إعادة تعيين العداد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'نعم', style: 'destructive', onPress: () => { setCount(0); saveProgress(0, totalCount, rounds); } },
    ]);
  };

  const handleResetAll = () => {
    Alert.alert('إعادة تعيين الكل', 'هل تريد إعادة تعيين كل شيء؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'نعم', style: 'destructive', onPress: () => { setCount(0); setTotalCount(0); setRounds(0); saveProgress(0, 0, 0); } },
    ]);
  };

  const selectTasbih = (tasbih: TasbihItem | CustomTasbih) => {
    const item: TasbihItem = 'virtue' in tasbih
      ? tasbih
      : { id: tasbih.id, text: tasbih.text, target: tasbih.target, source: 'athar' as const };
    setSelectedTasbih(item);
    setCount(0);
    setShowTasbihList(false);
  };

  const addCustomTasbih = async () => {
    if (!customText.trim()) { Alert.alert('خطأ', 'يرجى إدخال نص التسبيح'); return; }
    const newCustom: CustomTasbih = { id: Date.now(), text: customText.trim(), target: parseInt(customTarget) || 33, createdAt: new Date().toISOString() };
    const updated = [...customTasbihat, newCustom];
    setCustomTasbihat(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.customTasbihat, JSON.stringify(updated));
    setCustomText(''); setCustomTarget('33'); setShowCustomModal(false);
  };

  const deleteCustomTasbih = async (id: number) => {
    Alert.alert('حذف', 'هل تريد حذف هذا التسبيح؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        const updated = customTasbihat.filter(t => t.id !== id);
        setCustomTasbihat(updated);
        await AsyncStorage.setItem(STORAGE_KEYS.customTasbihat, JSON.stringify(updated));
      }},
    ]);
  };

  const handleDecrement = useCallback(() => {
    if (count <= 0) return;
    if (vibrationEnabled) {
      Platform.OS === 'ios'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Vibration.vibrate(20);
    }
    const newCount = count - 1;
    const newTotal = Math.max(0, totalCount - 1);
    setCount(newCount);
    setTotalCount(newTotal);
    saveProgress(newCount, newTotal, rounds);
  }, [count, totalCount, rounds, vibrationEnabled, saveProgress]);

  const handleShare = async () => {
    const text = `📿 تسبيح\n\n「 ${selectedTasbih.text} 」\n\n🔢 العدد: ${count}/${selectedTasbih.target}\n🔄 الجولات: ${rounds}\n📊 الإجمالي اليوم: ${totalCount}\n\n${APP_CONFIG.getShareSignature()}`;
    try { await Share.share({ message: text }); } catch (e) { console.error(e); }
  };

  // ===== COMPUTED =====
  const allTimeTotal = Object.values(dailyStats).reduce((a, b) => a + b, 0);
  const daysCount = Object.keys(dailyStats).length || 1;
  const avgPerDay = Math.round(allTimeTotal / daysCount);
  const progressPct = Math.round((count / selectedTasbih.target) * 100);

  // ===== RENDER =====
  return (
    <BackgroundWrapper backgroundKey={settings?.display?.appBackground} backgroundUrl={settings?.display?.appBackgroundUrl} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => setShowStatsModal(true)} style={s.headerBtn}>
            <MaterialCommunityIcons name="chart-bar" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: C.text }]}>التسبيح</Text>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={s.headerBtn}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={C.text} />
          </TouchableOpacity>
        </View>

        {/* Horizontal Tasbih Slider */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.sliderContent}
          style={s.slider}
        >
          {PRESET_TASBIHAT.map((t) => {
            const isSelected = selectedTasbih.id === t.id;
            const isCompleted = completedTasbihat[t.id];
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => selectTasbih(t)}
                activeOpacity={0.7}
                style={[
                  s.sliderItem,
                  { backgroundColor: isCompleted ? GREEN : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') },
                  isSelected && { borderColor: GREEN, borderWidth: 2 },
                ]}
              >
                {isCompleted && <MaterialCommunityIcons name="check-circle" size={14} color="#fff" style={{ marginLeft: 4 }} />}
                <Text
                  style={[
                    s.sliderItemText,
                    { color: isCompleted ? '#fff' : C.text },
                  ]}
                  numberOfLines={1}
                >
                  {t.text.length > 25 ? t.text.slice(0, 23) + '…' : t.text}
                </Text>
              </TouchableOpacity>
            );
          })}
          {customTasbihat.map((t) => {
            const isSelected = selectedTasbih.id === t.id;
            const isCompleted = completedTasbihat[t.id];
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => selectTasbih(t)}
                activeOpacity={0.7}
                style={[
                  s.sliderItem,
                  { backgroundColor: isCompleted ? GREEN : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') },
                  isSelected && { borderColor: GREEN, borderWidth: 2 },
                ]}
              >
                {isCompleted && <MaterialCommunityIcons name="check-circle" size={14} color="#fff" style={{ marginLeft: 4 }} />}
                <Text
                  style={[
                    s.sliderItemText,
                    { color: isCompleted ? '#fff' : C.text },
                  ]}
                  numberOfLines={1}
                >
                  {t.text.length > 25 ? t.text.slice(0, 23) + '…' : t.text}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => setShowCustomModal(true)}
            style={[s.sliderItem, { backgroundColor: GREEN + '18', borderColor: GREEN, borderStyle: 'dashed' }]}
          >
            <MaterialCommunityIcons name="plus" size={18} color={GREEN} />
          </TouchableOpacity>
        </ScrollView>

        {/* Selected tasbih info with navigation */}
        <View style={s.selectedInfo}>
          <View style={s.navRow}>
            <TouchableOpacity
              onPress={() => {
                const allItems = [...PRESET_TASBIHAT, ...customTasbihat];
                const idx = allItems.findIndex(t => t.id === selectedTasbih.id);
                // In RTL: left button goes to PREVIOUS, in LTR: left button goes to PREVIOUS
                if (idx > 0) selectTasbih(allItems[idx - 1]);
              }}
              style={[s.navBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <MaterialCommunityIcons name={isRTL ? "chevron-right" : "chevron-left"} size={22} color={C.textSec} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[s.selectedText, { color: C.text }]}>{selectedTasbih.text}</Text>
              {selectedTasbih.transliteration && (
                <Text style={[s.selectedTranslit, { color: C.textSec }]}>{selectedTasbih.transliteration}</Text>
              )}
              {selectedTasbih.virtue && showVirtue && (
                <Text style={[s.selectedVirtue, { color: C.textSec }]} numberOfLines={2}>{selectedTasbih.virtue}</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                const allItems = [...PRESET_TASBIHAT, ...customTasbihat];
                const idx = allItems.findIndex(t => t.id === selectedTasbih.id);
                // In RTL: right button goes to NEXT, in LTR: right button goes to NEXT
                if (idx < allItems.length - 1) selectTasbih(allItems[idx + 1]);
              }}
              style={[s.navBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <MaterialCommunityIcons name={isRTL ? "chevron-left" : "chevron-right"} size={22} color={C.textSec} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== MAIN COUNTER with RING ===== */}
        <View style={s.counterArea}>
          <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
            <Animated.View style={[s.ringContainer, tapAnimStyle, {
              backgroundColor: isDarkMode ? 'rgba(47,118,89,0.04)' : 'rgba(47,118,89,0.03)',
              borderRadius: (RING_SIZE + 20) / 2,
              ...Platform.select({
                ios: { shadowColor: GREEN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 24 },
                android: { elevation: 6 },
              }),
            }]}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
                {/* Inner subtle fill */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS - RING_STROKE / 2 - 2}
                  fill={GREEN + '06'}
                />
                {/* Background ring */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={C.ringBg}
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                />
                {/* Progress ring */}
                <AnimatedCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={GREEN}
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  animatedProps={animatedCircleProps}
                  strokeLinecap="round"
                />
              </Svg>
              {/* Center content */}
              <View style={s.ringCenter}>
                <Text style={[s.countNum, { color: C.text }]}>{count}</Text>
                <View style={[s.countDivider, { backgroundColor: C.textSec }]} />
                <Text style={[s.countTarget, { color: C.textSec }]}>{selectedTasbih.target}</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Stats chips */}
          <View style={s.chipsRow}>
            <View style={[s.chip, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
              <MaterialCommunityIcons name="sync" size={14} color={GREEN} />
              <Text style={[s.chipText, { color: C.textSec }]}>{rounds} جولات</Text>
            </View>
            <View style={[s.chip, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
              <MaterialCommunityIcons name="counter" size={14} color={GREEN} />
              <Text style={[s.chipText, { color: C.textSec }]}>{totalCount} إجمالي</Text>
            </View>
            <View style={[s.chip, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
              <MaterialCommunityIcons name="percent" size={14} color={GREEN} />
              <Text style={[s.chipText, { color: C.textSec }]}>{progressPct}%</Text>
            </View>
          </View>

          <Text style={[s.tapHint, { color: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]}>
            اضغط الدائرة للتسبيح
          </Text>
        </View>

        {/* Bottom actions */}
        <BannerAdComponent screen="tasbih" />
        <View style={[s.actionBar, { backgroundColor: isDarkMode ? 'rgba(30,30,32,0.85)' : 'rgba(255,255,255,0.85)', borderTopColor: C.cardBorder }]}>
          <TouchableOpacity style={s.actionBtn} onPress={handleReset}>
            <MaterialCommunityIcons name="refresh" size={24} color={C.textSec} />
            <Text style={[s.actionLabel, { color: C.textSec }]}>إعادة</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => setShowTasbihList(true)}>
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color={GREEN} />
            <Text style={[s.actionLabel, { color: GREEN }]}>التسبيحات</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant" size={24} color={C.textSec} />
            <Text style={[s.actionLabel, { color: C.textSec }]}>مشاركة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ===== TASBIH LIST MODAL ===== */}
      <Modal visible={showTasbihList} animationType="slide" transparent onRequestClose={() => setShowTasbihList(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: isDarkMode ? '#1c1e23' : '#fff' }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>اختر التسبيح</Text>
              <TouchableOpacity onPress={() => setShowTasbihList(false)} style={[s.closeBtn, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={[s.sectionLabel, { color: C.textSec }]}>التسبيحات المعتمدة</Text>
              {PRESET_TASBIHAT.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[s.listItem, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.12)' : 'rgba(120,120,128,0.06)' }, selectedTasbih.id === t.id && { borderColor: GREEN, borderWidth: 2 }]}
                  onPress={() => selectTasbih(t)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.listItemText, { color: C.text }]}>{t.text}</Text>
                    <View style={s.listItemMeta}>
                      <Text style={[s.listItemTarget, { color: C.textSec }]}>× {t.target}</Text>
                      {t.grade && <View style={s.gradeBadge}><Text style={s.gradeBadgeText}>{t.grade}</Text></View>}
                    </View>
                    {t.virtue && <Text style={[s.listItemVirtue, { color: C.textSec }]} numberOfLines={1}>{t.virtue}</Text>}
                  </View>
                  {selectedTasbih.id === t.id && <MaterialCommunityIcons name="check-circle" size={24} color={GREEN} />}
                </TouchableOpacity>
              ))}

              {customTasbihat.length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { color: C.textSec, marginTop: 16 }]}>تسبيحاتي المخصصة</Text>
                  {customTasbihat.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[s.listItem, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.12)' : 'rgba(120,120,128,0.06)' }]}
                      onPress={() => selectTasbih(t)}
                      onLongPress={() => deleteCustomTasbih(t.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.listItemText, { color: C.text }]}>{t.text}</Text>
                        <Text style={[s.listItemTarget, { color: C.textSec }]}>× {t.target}</Text>
                      </View>
                      <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  ))}
                </>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>

            <TouchableOpacity
              style={s.addBtn}
              onPress={() => { setShowTasbihList(false); setShowCustomModal(true); }}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#fff" />
              <Text style={s.addBtnText}>إضافة تسبيح مخصص</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== CUSTOM TASBIH MODAL ===== */}
      <Modal visible={showCustomModal} animationType="slide" transparent onRequestClose={() => setShowCustomModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { height: 'auto', backgroundColor: isDarkMode ? '#1c1e23' : '#fff' }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>إضافة تسبيح مخصص</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)} style={[s.closeBtn, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <Text style={[s.inputLabel, { color: C.text }]}>نص التسبيح</Text>
            <TextInput
              style={[s.input, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.16)' : 'rgba(120,120,128,0.08)', color: C.text }]}
              value={customText}
              onChangeText={setCustomText}
              placeholder="أدخل نص التسبيح..."
              placeholderTextColor={C.textSec}
              multiline
              textAlign="right"
            />
            <Text style={[s.inputLabel, { color: C.text }]}>العدد</Text>
            <View style={s.stepperRow}>
              <TouchableOpacity
                onPress={() => setCustomTarget(String(Math.max(1, (parseInt(customTarget) || 33) + 1)))}
                style={[s.stepperBtn, { backgroundColor: GREEN + '18' }]}
              >
                <MaterialCommunityIcons name="plus" size={22} color={GREEN} />
              </TouchableOpacity>
              <TextInput
                style={[s.stepperInput, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.16)' : 'rgba(120,120,128,0.08)', color: C.text }]}
                value={customTarget}
                onChangeText={setCustomTarget}
                placeholder="33"
                placeholderTextColor={C.textSec}
                keyboardType="number-pad"
                textAlign="center"
              />
              <TouchableOpacity
                onPress={() => setCustomTarget(String(Math.max(1, (parseInt(customTarget) || 33) - 1)))}
                style={[s.stepperBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
              >
                <MaterialCommunityIcons name="minus" size={22} color={C.textSec} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.saveBtn} onPress={addCustomTasbih}>
              <Text style={s.saveBtnText}>حفظ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== SETTINGS MODAL ===== */}
      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { height: 'auto', backgroundColor: isDarkMode ? '#1c1e23' : '#fff' }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>الإعدادات</Text>
              <TouchableOpacity onPress={() => { saveSettings(); setShowSettings(false); }} style={[s.closeBtn, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <GlassToggle label="الاهتزاز" icon="cellphone" enabled={vibrationEnabled} onToggle={setVibrationEnabled} />
            <GlassToggle label="إظهار الفضل" icon="star-outline" enabled={showVirtue} onToggle={setShowVirtue} />
            <GlassToggle label="الانتقال التلقائي" icon="arrow-right-circle-outline" enabled={autoAdvance} onToggle={setAutoAdvance} subtitle="الانتقال للتسبيح التالي عند الإكمال" />
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#EF4444', marginTop: 20 }]} onPress={() => { handleResetAll(); setShowSettings(false); }}>
              <Text style={s.saveBtnText}>إعادة تعيين كل شيء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== STATS MODAL ===== */}
      <Modal visible={showStatsModal} animationType="slide" transparent onRequestClose={() => setShowStatsModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: isDarkMode ? '#1c1e23' : '#fff' }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: C.text }]}>إحصائياتي</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)} style={[s.closeBtn, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Summary cards */}
              <View style={s.statsGrid}>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(47,118,89,0.08)' }]}>
                  <MaterialCommunityIcons name="calendar-today" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{totalCount}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>تسبيحات اليوم</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(47,118,89,0.08)' }]}>
                  <MaterialCommunityIcons name="sync" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{rounds}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>جولات مكتملة</Text>
                </View>
              </View>
              <View style={s.statsGrid}>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(47,118,89,0.08)' }]}>
                  <MaterialCommunityIcons name="sigma" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{allTimeTotal}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>الإجمالي الكلي</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(47,118,89,0.08)' }]}>
                  <MaterialCommunityIcons name="chart-line" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{avgPerDay}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>متوسط يومي</Text>
                </View>
              </View>

              {/* Last 7 days */}
              <Text style={[s.sectionLabel, { color: C.textSec, marginTop: 16 }]}>آخر ٧ أيام</Text>
              {Object.entries(dailyStats).slice(-7).reverse().map(([date, cnt]) => (
                <View key={date} style={[s.statsRow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(120,120,128,0.06)' }]}>
                  <Text style={[s.statsRowVal, { color: GREEN }]}>{cnt} تسبيحة</Text>
                  <Text style={[s.statsRowDate, { color: C.textSec }]}>{date}</Text>
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </BackgroundWrapper>
  );
}

// ============================================
// الأنماط
// ============================================

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20, fontFamily: 'Cairo-Bold',
  },

  // Slider
  slider: {
    maxHeight: 44, marginTop: 8,
  },
  sliderContent: {
    paddingHorizontal: 20, gap: 8,
  },
  sliderItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'transparent',
  },
  sliderItemText: {
    fontSize: 13, fontFamily: 'Cairo-SemiBold',
  },

  // Selected info
  selectedInfo: {
    paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center',
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%',
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedText: {
    fontSize: 18, fontFamily: 'Cairo-Bold',
    textAlign: 'center', lineHeight: 30,
  },
  selectedTranslit: {
    fontSize: 13, fontFamily: 'Cairo-Regular',
    marginTop: 2, textAlign: 'center', fontStyle: 'italic',
  },
  selectedVirtue: {
    fontSize: 12, fontFamily: 'Cairo-Regular',
    marginTop: 4, textAlign: 'center',
  },

  // Counter area
  counterArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20,
  },
  ringRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, marginBottom: 16,
  },
  pmBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  ringContainer: {
    width: RING_SIZE + 20, height: RING_SIZE + 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  ringCenter: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
  },
  countNum: {
    fontSize: 56, fontFamily: 'Cairo-Bold',
  },
  countOf: {
    fontSize: 14, fontFamily: 'Cairo-Medium', marginTop: -4,
  },
  countDivider: {
    width: 36, height: 1.5, borderRadius: 1, marginVertical: 2, opacity: 0.3,
  },
  countTarget: {
    fontSize: 18, fontFamily: 'Cairo-SemiBold', opacity: 0.6,
  },

  // Chips
  chipsRow: {
    flexDirection: 'row', gap: 8, marginBottom: 12,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  chipText: {
    fontSize: 12, fontFamily: 'Cairo-Medium',
  },
  tapHint: {
    fontSize: 11, fontFamily: 'Cairo-Regular', marginTop: 4,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 12, paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    alignItems: 'center', gap: 4, paddingHorizontal: 20,
  },
  actionLabel: {
    fontSize: 11, fontFamily: 'Cairo-Medium',
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: '72%', padding: 20,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20, fontFamily: 'Cairo-Bold',
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  // List items
  sectionLabel: {
    fontSize: 15, fontFamily: 'Cairo-SemiBold', textAlign: 'right', marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: 'transparent',
  },
  listItemText: {
    fontSize: 15, fontFamily: 'Cairo-Medium', textAlign: 'right', marginBottom: 4,
  },
  listItemMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
  },
  listItemTarget: {
    fontSize: 13, fontFamily: 'Cairo-Regular',
  },
  listItemVirtue: {
    fontSize: 12, fontFamily: 'Cairo-Regular', marginTop: 2, textAlign: 'right',
  },
  gradeBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4,
  },
  gradeBadgeText: {
    fontSize: 10, color: '#10B981', fontFamily: 'Cairo-SemiBold',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, padding: 14, borderRadius: 14, gap: 8, marginTop: 8,
  },
  addBtnText: {
    fontSize: 15, fontFamily: 'Cairo-SemiBold', color: '#fff',
  },

  // Inputs
  inputLabel: {
    fontSize: 15, fontFamily: 'Cairo-SemiBold', textAlign: 'right', marginBottom: 6,
  },
  input: {
    borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Cairo-Regular',
    minHeight: 80, textAlignVertical: 'top', marginBottom: 14,
  },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14,
  },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperInput: {
    flex: 1, height: 44, borderRadius: 12,
    fontSize: 18, fontFamily: 'Cairo-SemiBold',
  },
  saveBtn: {
    backgroundColor: GREEN, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15, fontFamily: 'Cairo-SemiBold', color: '#fff',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row', gap: 10, marginBottom: 10,
  },
  statCard: {
    flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, gap: 4,
  },
  statValue: {
    fontSize: 28, fontFamily: 'Cairo-Bold',
  },
  statLabel: {
    fontSize: 12, fontFamily: 'Cairo-Regular',
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12, marginBottom: 6,
  },
  statsRowDate: {
    fontSize: 13, fontFamily: 'Cairo-Regular',
  },
  statsRowVal: {
    fontSize: 14, fontFamily: 'Cairo-SemiBold',
  },
});
