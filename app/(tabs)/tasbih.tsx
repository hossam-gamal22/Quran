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
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSettings } from '../../contexts/SettingsContext';
import BackgroundWrapper from '../../components/ui/BackgroundWrapper';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { useColors } from '@/hooks/use-colors';
import { getLanguage, t } from '@/lib/i18n';
import { GlassCard, GlassToggle } from '../../components/ui/GlassCard';
import { copyToClipboard } from '../../lib/clipboard';
import { APP_CONFIG } from '../../constants/app';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { Share } from 'react-native';
import { getTodayDate, getAzkarRecord, saveAzkarRecord } from '../../lib/worship-storage';
import { fetchTasbihPresets } from '@/lib/admin-data-api';

import { useIsRTL } from '@/hooks/use-is-rtl';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Strip tashkeel (diacritics) from Arabic text for display
function stripTashkeel(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

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

const DEFAULT_PRESET_TASBIHAT: TasbihItem[] = [
  {
    id: 1,
    text: 'سُبْحَانَ اللهِ',
    transliteration: 'Subhan Allah',
    target: 33,
    source: 'hadith_sahih',
  },
  {
    id: 2,
    text: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    target: 33,
    source: 'hadith_sahih',
  },
  {
    id: 3,
    text: 'اللهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    target: 33,
    source: 'hadith_sahih',
  },
  {
    id: 4,
    text: 'لَا إِلَهَ إِلَّا اللهُ',
    transliteration: 'La ilaha illa Allah',
    target: 100,
    source: 'hadith_sahih',
  },
  {
    id: 5,
    text: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illa Allahu wahdahu la sharika lah, lahul mulku wa lahul hamdu wa huwa ala kulli shayin qadir',
    target: 100,
    source: 'hadith_sahih',
  },
  {
    id: 6,
    text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    transliteration: 'Subhan Allahi wa bihamdih',
    target: 100,
    source: 'hadith_sahih',
  },
  {
    id: 7,
    text: 'سُبْحَانَ اللهِ الْعَظِيمِ وَبِحَمْدِهِ',
    transliteration: 'Subhan Allahil Azeem wa bihamdih',
    target: 100,
    source: 'hadith_sahih',
  },
  {
    id: 8,
    text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
    transliteration: 'La hawla wa la quwwata illa billah',
    target: 100,
    source: 'hadith_sahih',
  },
  {
    id: 9,
    text: 'أَسْتَغْفِرُ اللهَ',
    transliteration: 'Astaghfirullah',
    target: 100,
    source: 'hadith_sahih',
  },
  {
    id: 10,
    text: 'أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullaha al-Azeem alladhi la ilaha illa huwal Hayyul Qayyumu wa atubu ilayh',
    target: 3,
    source: 'hadith_hasan',
  },
  {
    id: 11,
    text: 'سُبْحَانَ اللهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ',
    transliteration: 'Subhan Allah, wal hamdulillah, wa la ilaha illa Allah, wallahu Akbar',
    target: 100,
    source: 'hadith_sahih',
  },
  {
    id: 12,
    text: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    transliteration: 'Allahumma salli wa sallim ala nabiyyina Muhammad',
    target: 100,
    source: 'hadith_sahih',
  },
  {
    id: 13,
    text: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    transliteration: 'Rabbi ighfir li wa tub alayya innaka antat-Tawwabur-Rahim',
    target: 100,
    source: 'hadith_sahih',
  },
  {
    id: 14,
    text: 'سُبُّوحٌ قُدُّوسٌ رَبُّ الْمَلَائِكَةِ وَالرُّوحِ',
    transliteration: 'Subbuhun Quddusun Rabbul malaikati war-ruh',
    target: 33,
    source: 'hadith_sahih',
  },
  {
    id: 15,
    text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
    transliteration: 'Ya Hayyu Ya Qayyum bi rahmatika astaghith',
    target: 7,
    source: 'hadith_hasan',
  },
];

// Helper to get translated virtue/reference/grade for a preset
function getPresetVirtue(id: number): string | undefined {
  const key = `tasbih.virtue${id}` as any;
  const val = t(key);
  return val !== key ? val : undefined;
}
function getPresetReference(id: number): string | undefined {
  const key = `tasbih.reference${id}` as any;
  const val = t(key);
  return val !== key ? val : undefined;
}
function getPresetGrade(id: number): string | undefined {
  const gradeMap: Record<number, string> = {
    1: 'gradeSahih', 2: 'gradeSahih', 3: 'gradeSahih',
    4: 'gradeMutafaq', 5: 'gradeMutafaq', 6: 'gradeMutafaq',
    7: 'gradeSahih', 8: 'gradeMutafaq', 9: 'gradeSahih',
    10: 'gradeHasan', 11: 'gradeSahih', 12: 'gradeSahih',
    13: 'gradeSahih', 14: 'gradeSahih', 15: 'gradeHasan',
  };
  const gradeKey = gradeMap[id];
  if (!gradeKey) return undefined;
  const fullKey = `tasbih.${gradeKey}` as any;
  const val = t(fullKey);
  return val !== fullKey ? val : undefined;
}

// ============================================
// الثوابت
// ============================================

const RING_SIZE = SCREEN_WIDTH * 0.72;
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
  typeStats: 'tasbih_type_stats',
  lastDate: '@tasbih_last_date',
  dailyHistory: '@tasbih_daily_history',
};

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================
// المكون الرئيسي
// ============================================

export default function TasbihScreen() {
  const router = useRouter();
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();

  const C = {
    bg: isDarkMode ? '#0f1117' : '#f5f5f5',
    card: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    text: colors.text,
    textSec: colors.textLight,
    ring: GREEN,
    ringBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  };

  // ===== STATE =====
  const [PRESET_TASBIHAT, setPresetTasbihat] = useState<TasbihItem[]>(DEFAULT_PRESET_TASBIHAT);
  const [selectedTasbih, setSelectedTasbih] = useState<TasbihItem>(DEFAULT_PRESET_TASBIHAT[0]);
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [showTasbihList, setShowTasbihList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const { showStats } = useLocalSearchParams<{ showStats?: string }>();

  // Open stats modal from URL param (e.g., /(tabs)/tasbih?showStats=true)
  useEffect(() => {
    if (showStats === 'true') {
      setShowStatsModal(true);
    }
  }, [showStats]);

  // Fetch admin-managed presets from Firestore
  useEffect(() => {
    fetchTasbihPresets(DEFAULT_PRESET_TASBIHAT as any).then((presets) => {
      if (presets.length > 0) {
        setPresetTasbihat(presets as TasbihItem[]);
      }
    });
  }, []);

  const [customTasbihat, setCustomTasbihat] = useState<CustomTasbih[]>([]);
  const [customText, setCustomText] = useState('');
  const [customTarget, setCustomTarget] = useState('33');
  const [dailyStats, setDailyStats] = useState<Record<string, number>>({});
  const [showVirtue, setShowVirtue] = useState(false);
  const isArabic = getLanguage() === 'ar';
  const [showTranslation, setShowTranslation] = useState(false);
  const [completedTasbihat, setCompletedTasbihat] = useState<Record<number, boolean>>({});
  const [typeStats, setTypeStats] = useState<Record<string, Record<string, number>>>({});
  const [resetToastVisible, setResetToastVisible] = useState(false);

  // ===== ANIMATION =====
  const progress = useSharedValue(0);
  const tapScale = useSharedValue(1);
  const sliderRef = useRef<ScrollView>(null);

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

  // Auto-scroll slider to selected tasbih
  useEffect(() => {
    const allItems = [...PRESET_TASBIHAT, ...customTasbihat];
    const idx = allItems.findIndex(t => t.id === selectedTasbih.id);
    if (idx >= 0 && sliderRef.current) {
      const estimatedItemWidth = 120;
      sliderRef.current.scrollTo({
        x: Math.max(0, idx * estimatedItemWidth - SCREEN_WIDTH / 2 + estimatedItemWidth / 2),
        animated: true,
      });
    }
  }, [selectedTasbih.id, customTasbihat]);

  const loadData = async () => {
    try {
      const [settingsRaw, customRaw, progressRaw, statsRaw, completedRaw, typeStatsRaw, lastDateRaw, dailyHistoryRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.settings),
        AsyncStorage.getItem(STORAGE_KEYS.customTasbihat),
        AsyncStorage.getItem(STORAGE_KEYS.progress),
        AsyncStorage.getItem(STORAGE_KEYS.dailyStats),
        AsyncStorage.getItem(STORAGE_KEYS.completedToday),
        AsyncStorage.getItem(STORAGE_KEYS.typeStats),
        AsyncStorage.getItem(STORAGE_KEYS.lastDate),
        AsyncStorage.getItem(STORAGE_KEYS.dailyHistory),
      ]);

      if (settingsRaw) {
        const p = JSON.parse(settingsRaw);
        setVibrationEnabled(p.vibrationEnabled ?? true);
        setShowVirtue(p.showVirtue ?? false);
        setAutoAdvance(p.autoAdvance ?? true);
        setShowTranslation(p.showTranslation ?? false);
      }
      if (customRaw) setCustomTasbihat(JSON.parse(customRaw));

      // --- Daily auto-reset logic ---
      const todayISO = getTodayISO();
      const lastDate = lastDateRaw || '';
      let didReset = false;

      if (lastDate && lastDate !== todayISO) {
        // Date changed — save yesterday's progress to daily history
        let dailyHistory: Record<string, Record<string, number>> = {};
        if (dailyHistoryRaw) {
          try { dailyHistory = JSON.parse(dailyHistoryRaw); } catch {}
        }
        // Save type stats for the previous day
        let parsedTypeStats: Record<string, Record<string, number>> = {};
        if (typeStatsRaw) {
          try { parsedTypeStats = JSON.parse(typeStatsRaw); } catch {}
        }
        if (parsedTypeStats[lastDate]) {
          dailyHistory[lastDate] = parsedTypeStats[lastDate];
        } else if (progressRaw) {
          // Fallback: save total from progress
          try {
            const p = JSON.parse(progressRaw);
            if (p.totalCount > 0 && p.selectedId) {
              const found = PRESET_TASBIHAT.find(t => t.id === p.selectedId);
              const name = found ? found.text : t('tabs.tasbih');
              dailyHistory[lastDate] = { [name]: p.totalCount };
            }
          } catch {}
        }
        await AsyncStorage.setItem(STORAGE_KEYS.dailyHistory, JSON.stringify(dailyHistory));

        // Reset progress for the new day
        setCount(0);
        setTotalCount(0);
        setRounds(0);
        setCompletedTasbihat({});
        await AsyncStorage.setItem(STORAGE_KEYS.progress, JSON.stringify({
          date: todayISO, count: 0, totalCount: 0, rounds: 0, selectedId: PRESET_TASBIHAT[0].id,
        }));
        await AsyncStorage.setItem(STORAGE_KEYS.completedToday, JSON.stringify({ date: todayISO, completed: {} }));
        didReset = true;
      } else if (progressRaw) {
        // Same day — restore progress
        try {
          const p = JSON.parse(progressRaw);
          const progressDate = p.date || '';
          if (progressDate === todayISO || progressDate === new Date().toDateString()) {
            setCount(p.count || 0);
            setTotalCount(p.totalCount || 0);
            setRounds(p.rounds || 0);
            if (p.selectedId) {
              const found = PRESET_TASBIHAT.find(t => t.id === p.selectedId);
              if (found) setSelectedTasbih(found);
            }
          }
        } catch {}
      }

      // Save today as last active date
      await AsyncStorage.setItem(STORAGE_KEYS.lastDate, todayISO);

      if (statsRaw) setDailyStats(JSON.parse(statsRaw));
      if (!didReset && completedRaw) {
        try {
          const parsed = JSON.parse(completedRaw);
          const compDate = parsed.date || '';
          if (compDate === todayISO || compDate === new Date().toDateString()) {
            setCompletedTasbihat(parsed.completed || {});
          }
        } catch {}
      }
      if (typeStatsRaw) {
        try { setTypeStats(JSON.parse(typeStatsRaw)); } catch {} 
      }

      // Show reset toast after state is settled
      if (didReset) {
        setTimeout(() => setResetToastVisible(true), 500);
        setTimeout(() => setResetToastVisible(false), 3500);
      }
    } catch (e) {
      console.error('Error loading tasbih data:', e);
    }
  };

  const saveProgress = useCallback(async (c: number, t: number, r: number) => {
    try {
      const today = getTodayISO();
      await AsyncStorage.setItem(STORAGE_KEYS.progress, JSON.stringify({
        date: today, count: c, totalCount: t, rounds: r, selectedId: selectedTasbih.id,
      }));
      await AsyncStorage.setItem(STORAGE_KEYS.lastDate, today);
      const newStats = { ...dailyStats, [today]: t };
      setDailyStats(newStats);
      await AsyncStorage.setItem(STORAGE_KEYS.dailyStats, JSON.stringify(newStats));
    } catch (e) { console.error(e); }
  }, [selectedTasbih.id, dailyStats]);

  const saveSettings = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ vibrationEnabled, showVirtue, autoAdvance, showTranslation }));
  };

  const trackTypeIncrement = useCallback(async (tasbihText: string) => {
    try {
      const today = getTodayISO();
      const updated = { ...typeStats };
      if (!updated[today]) updated[today] = {};
      updated[today][tasbihText] = (updated[today][tasbihText] || 0) + 1;
      setTypeStats(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.typeStats, JSON.stringify(updated));
    } catch (e) { console.error(e); }
  }, [typeStats]);

  // ===== HANDLERS =====
  const handlePress = useCallback(async () => {
    tapScale.value = withSpring(0.9, { damping: 12, stiffness: 400 }, () => {
      tapScale.value = withSpring(1, { damping: 8, stiffness: 200 });
    });

    if (vibrationEnabled) {
      Platform.OS === 'ios'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Vibration.vibrate(30);
    }

    const newCount = count + 1;
    const newTotal = totalCount + 1;
    trackTypeIncrement(selectedTasbih.text);

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
        date: getTodayISO(), completed: newCompleted,
      }));

      // Log completion to worship tracker
      try {
        const today = getTodayDate();
        const azkarRecord = await getAzkarRecord(today);
        const record = azkarRecord || { date: today, morning: false, evening: false, sleep: false, wakeup: false, afterPrayer: false };
        record.afterPrayer = true;
        await saveAzkarRecord(record);
      } catch (e) { console.error('Error logging to worship tracker:', e); }
      
      // Auto-advance to next tasbih if enabled
      if (autoAdvance) {
        const advanceItems: TasbihItem[] = [
          ...PRESET_TASBIHAT,
          ...customTasbihat.map(ct => ({
            id: ct.id,
            text: ct.text,
            target: ct.target,
            source: 'athar' as const,
          })),
        ];
        const curIdx = advanceItems.findIndex(t => t.id === selectedTasbih.id);
        const nextIdx = (curIdx + 1) % advanceItems.length;
        setSelectedTasbih(advanceItems[nextIdx]);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 200);
      }
    } else {
      setCount(newCount);
      setTotalCount(newTotal);
      saveProgress(newCount, newTotal, rounds);
    }
  }, [count, totalCount, rounds, selectedTasbih, vibrationEnabled, autoAdvance, customTasbihat, completedTasbihat, saveProgress, trackTypeIncrement]);

  const handleReset = () => {
    Alert.alert(t('tasbih.reset'), t('tasbih.resetConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: () => { setCount(0); saveProgress(0, totalCount, rounds); } },
    ]);
  };

  const handleResetAll = () => {
    Alert.alert(t('tasbih.resetAll'), t('tasbih.resetAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: () => { setCount(0); setTotalCount(0); setRounds(0); saveProgress(0, 0, 0); } },
    ]);
  };

  const selectTasbih = (tasbih: TasbihItem | CustomTasbih) => {
    const item: TasbihItem = 'source' in tasbih
      ? tasbih as TasbihItem
      : { id: tasbih.id, text: tasbih.text, target: tasbih.target, source: 'athar' as const };
    setSelectedTasbih(item);
    setCount(0);
    setShowTasbihList(false);
  };

  const addCustomTasbih = async () => {
    if (!customText.trim()) { Alert.alert(t('common.error'), t('tasbih.enterTextError')); return; }
    const newCustom: CustomTasbih = { id: Date.now(), text: customText.trim(), target: parseInt(customTarget) || 33, createdAt: new Date().toISOString() };
    const updated = [...customTasbihat, newCustom];
    setCustomTasbihat(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.customTasbihat, JSON.stringify(updated));
    // Auto-select the newly added tasbih
    const asTasbihItem: TasbihItem = { id: newCustom.id, text: newCustom.text, target: newCustom.target, source: 'athar' as const };
    setSelectedTasbih(asTasbihItem);
    setCount(0);
    setCustomText(''); setCustomTarget('33'); setShowCustomModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteCustomTasbih = async (id: number) => {
    Alert.alert(t('common.delete'), t('tasbih.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
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

  const handleQuickReset = useCallback(() => {
    if (count === 0) return;
    setCount(0);
    saveProgress(0, totalCount, rounds);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [count, totalCount, rounds, saveProgress]);

  const handleShare = async () => {
    const dhikrDisplay = isArabic ? stripTashkeel(selectedTasbih.text) : (selectedTasbih.transliteration || stripTashkeel(selectedTasbih.text));
    const text = `📿 ${t('tasbih.title')}\n\n「 ${dhikrDisplay} 」\n\n🔢 ${t('tasbih.counter')}: ${count}/${selectedTasbih.target}\n🔄 ${t('tasbih.rounds')}: ${rounds}\n📊 ${t('tasbih.todayTotal')}: ${totalCount}\n\n${APP_CONFIG.getShareSignature()}`;
    try { await Share.share({ message: text }); } catch (e) { console.error(e); }
  };

  // ===== COMPUTED =====
  const allTasbihItems: (TasbihItem | CustomTasbih)[] = [...PRESET_TASBIHAT, ...customTasbihat];
  const completedCount = Object.values(completedTasbihat).filter(Boolean).length;
  const currentIndex = allTasbihItems.findIndex(t => t.id === selectedTasbih.id);
  const allTimeTotal = Object.values(dailyStats).reduce((a, b) => a + b, 0);
  const daysCount = Object.keys(dailyStats).length || 1;
  const avgPerDay = Math.round(allTimeTotal / daysCount);
  const progressPct = Math.round((count / selectedTasbih.target) * 100);

  const hasBg = settings?.display?.appBackground && settings.display.appBackground !== 'none';

  // ===== RENDER =====
  return (
    <BackgroundWrapper backgroundKey={settings?.display?.appBackground} backgroundUrl={settings?.display?.appBackgroundUrl} opacity={settings?.display?.backgroundOpacity ?? 1} style={{ flex: 1, backgroundColor: hasBg ? 'transparent' : C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[s.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Right side in RTL: stats + tasbih list */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity onPress={() => setShowStatsModal(true)} style={s.headerBtn}>
              <MaterialCommunityIcons name="chart-bar" size={22} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTasbihList(true)} style={s.headerBtn}>
              <MaterialCommunityIcons name="format-list-bulleted" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          {/* Center: title — absolutely centered */}
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'center', gap: 8 }}>
            <Text style={[s.headerTitle, { color: C.text }, colors.textShadowStyle]}>{t('tabs.tasbih')}</Text>
            <SectionInfoButton sectionKey="tasbih" />
          </View>
          {/* Left side in RTL: settings + add custom */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={s.headerBtn}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCustomModal(true)} style={s.headerBtn}>
              <MaterialCommunityIcons name="plus" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress indicator */}
        <View style={[s.progressRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[s.progressText, { color: GREEN, textAlign: isRTL ? 'right' : 'left' }]}>
            {String(completedCount)}/{String(allTasbihItems.length)}
          </Text>
          <Text style={[s.positionText, { color: C.textSec, textAlign: isRTL ? 'right' : 'left' }]}>
            {String(currentIndex + 1)} {t('tasbih.of')} {String(allTasbihItems.length)}
          </Text>
        </View>

        {/* Horizontal Tasbih Slider */}
        <ScrollView
          ref={sliderRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.sliderContent}
          style={[s.slider, isRTL && { transform: [{ scaleX: -1 }] }]}
        >
          {PRESET_TASBIHAT.map((item) => {
            const isSelected = selectedTasbih.id === item.id;
            const isCompleted = completedTasbihat[item.id];
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => selectTasbih(item)}
                activeOpacity={0.7}
                style={[
                  s.sliderItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isCompleted ? GREEN : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') },
                  isSelected && { borderColor: GREEN, borderWidth: 2 },
                  isRTL && { transform: [{ scaleX: -1 }] },
                ]}
              >
                {isCompleted && <MaterialCommunityIcons name="check-circle" size={14} color="#fff" />}
                <Text
                  style={[
                    s.sliderItemText,
                    { color: isCompleted ? '#fff' : C.text },
                  ]}
                  numberOfLines={1}
                >
                  {isArabic ? stripTashkeel(item.text) : (item.transliteration || stripTashkeel(item.text))}
                </Text>
              </TouchableOpacity>
            );
          })}
          {customTasbihat.map((item) => {
            const isSelected = selectedTasbih.id === item.id;
            const isCompleted = completedTasbihat[item.id];
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => selectTasbih(item)}
                activeOpacity={0.7}
                style={[
                  s.sliderItem,
                  { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isCompleted ? GREEN : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') },
                  isSelected && { borderColor: GREEN, borderWidth: 2 },
                  isRTL && { transform: [{ scaleX: -1 }] },
                ]}
              >
                {isCompleted && <MaterialCommunityIcons name="check-circle" size={14} color="#fff" />}
                <Text
                  style={[
                    s.sliderItemText,
                    { color: isCompleted ? '#fff' : C.text },
                  ]}
                  numberOfLines={1}
                >
                  {isArabic ? stripTashkeel(item.text) : ((item as any).transliteration || stripTashkeel(item.text))}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => setShowCustomModal(true)}
            style={[s.sliderItem, { backgroundColor: GREEN + '18', borderColor: GREEN, borderStyle: 'dashed' }, isRTL && { transform: [{ scaleX: -1 }] }]}
          >
            <MaterialCommunityIcons name="plus" size={18} color={GREEN} />
          </TouchableOpacity>
        </ScrollView>

        {/* Selected tasbih info with navigation */}
        <View style={s.selectedInfo}>
          <View style={[s.navRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              onPress={() => {
                const allItems = [...PRESET_TASBIHAT, ...customTasbihat];
                const idx = allItems.findIndex(t => t.id === selectedTasbih.id);
                // First child → RIGHT in row-reverse (RTL) = Previous
                if (idx > 0) selectTasbih(allItems[idx - 1]);
              }}
              style={[s.navBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={22} color={C.textSec} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[s.selectedText, { color: C.text }, colors.textShadowStyle]}>
                {isArabic ? stripTashkeel(selectedTasbih.text) : (selectedTasbih.transliteration || stripTashkeel(selectedTasbih.text))}
              </Text>
              {!isArabic && showTranslation && selectedTasbih.transliteration && (
                <Text style={[s.selectedTranslit, { color: C.textSec }]}>{stripTashkeel(selectedTasbih.text)}</Text>
              )}
              {isArabic && selectedTasbih.transliteration && showTranslation && (
                <Text style={[s.selectedTranslit, { color: C.textSec }]}>{selectedTasbih.transliteration}</Text>
              )}
              {getPresetVirtue(selectedTasbih.id) && showVirtue && (
                <Text style={[s.selectedVirtue, { color: C.textSec, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{getPresetVirtue(selectedTasbih.id)}</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                const allItems = [...PRESET_TASBIHAT, ...customTasbihat];
                const idx = allItems.findIndex(t => t.id === selectedTasbih.id);
                // Third child → LEFT in row-reverse (RTL) = Next
                if (idx < allItems.length - 1) selectTasbih(allItems[idx + 1]);
              }}
              style={[s.navBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            >
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={C.textSec} />
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
              <View style={[s.ringCenter, { overflow: 'visible', width: RING_SIZE * 0.8, height: RING_SIZE * 0.65 }]}>
                <Text style={[s.countNum, { color: C.text, fontSize: count >= 1000 ? 52 : count >= 100 ? 72 : 96, lineHeight: count >= 1000 ? 64 : count >= 100 ? 86 : 110, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium', fontWeight: '900' }, colors.textShadowStyle]} numberOfLines={1}>{String(count)}</Text>
                <View style={[s.countDivider, { backgroundColor: C.textSec }]} />
                <Text style={[s.countTarget, { color: C.textSec, fontSize: 24, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium', fontWeight: '700' }]}>{String(selectedTasbih.target)}</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Stats chips */}
          <View style={[s.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[s.chip, { backgroundColor: C.card, borderColor: C.cardBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="sync" size={14} color={GREEN} />
              <Text style={[s.chipText, { color: C.textSec, textAlign: isRTL ? 'right' : 'left' }]}>{String(rounds)} {t('tasbih.rounds')}</Text>
            </View>
            <View style={[s.chip, { backgroundColor: C.card, borderColor: C.cardBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="counter" size={14} color={GREEN} />
              <Text style={[s.chipText, { color: C.textSec, textAlign: isRTL ? 'right' : 'left' }]}>{String(totalCount)} {t('tasbih.total')}</Text>
            </View>
            <View style={[s.chip, { backgroundColor: C.card, borderColor: C.cardBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="percent" size={14} color={GREEN} />
              <Text style={[s.chipText, { color: C.textSec, textAlign: isRTL ? 'right' : 'left' }]}>{String(progressPct)}%</Text>
            </View>
          </View>

          {/* Reset button */}
          <TouchableOpacity
            style={[s.resetBtn, {
              backgroundColor: count > 0 ? (isDarkMode ? 'rgba(47,118,89,0.12)' : 'rgba(47,118,89,0.08)') : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              borderColor: count > 0 ? GREEN + '30' : C.cardBorder,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }]}
            onPress={handleQuickReset}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="restart" size={18} color={count > 0 ? GREEN : C.textSec} />
            <Text style={[s.resetBtnText, { color: count > 0 ? GREEN : C.textSec }]}>{t('tasbih.resetCounter')}</Text>
          </TouchableOpacity>

          <Text style={[s.tapHint, { color: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]}>
            {t('tasbih.tapToCount')}
          </Text>
        </View>

        {/* Bottom actions */}
        <BannerAdComponent screen="tasbih" />
      </SafeAreaView>

      {/* Reset toast */}
      {resetToastVisible && (
        <View style={s.toastContainer}>
          <View style={[s.toast, { backgroundColor: isDarkMode ? 'rgba(47,118,89,0.95)' : 'rgba(47,118,89,0.9)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
            <Text style={s.toastText}>{t('tasbih.dailyResetToast')}</Text>
          </View>
        </View>
      )}

      {/* ===== TASBIH LIST MODAL ===== */}
      <Modal visible={showTasbihList} animationType="slide" transparent onRequestClose={() => setShowTasbihList(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: isDarkMode ? '#1c1e23' : '#fff' }]}>
            <View style={[s.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.modalTitle, { color: C.text }]}>{t('tasbih.selectDhikr')}</Text>
              <TouchableOpacity onPress={() => setShowTasbihList(false)} style={[s.closeBtn, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={[s.sectionLabel, { color: C.textSec, textAlign: isRTL ? 'right' : 'left' }]}>{t('tasbih.approvedDhikr')}</Text>
              {PRESET_TASBIHAT.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[s.listItem, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.12)' : 'rgba(120,120,128,0.06)' }, selectedTasbih.id === item.id && { borderColor: GREEN, borderWidth: 2 }]}
                  onPress={() => selectTasbih(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.listItemText, { color: C.text, textAlign: isRTL ? 'right' : 'left' }]}>{isArabic ? stripTashkeel(item.text) : (item.transliteration || stripTashkeel(item.text))}</Text>
                    <View style={[s.listItemMeta, { justifyContent: isRTL ? 'flex-end' : 'flex-start', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[s.listItemTarget, { color: C.textSec }]}>× {item.target}</Text>
                      {getPresetGrade(item.id) && <View style={s.gradeBadge}><Text style={s.gradeBadgeText}>{getPresetGrade(item.id)}</Text></View>}
                    </View>
                    {getPresetVirtue(item.id) && <Text style={[s.listItemVirtue, { color: C.textSec, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{getPresetVirtue(item.id)}</Text>}
                  </View>
                  {selectedTasbih.id === item.id && <MaterialCommunityIcons name="check-circle" size={24} color={GREEN} />}
                </TouchableOpacity>
              ))}

              {customTasbihat.length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { color: C.textSec, marginTop: 16, textAlign: isRTL ? 'right' : 'left' }]}>{t('tasbih.myCustomDhikr')}</Text>
                  {customTasbihat.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[s.listItem, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? 'rgba(120,120,128,0.12)' : 'rgba(120,120,128,0.06)' }]}
                      onPress={() => selectTasbih(item)}
                      onLongPress={() => deleteCustomTasbih(item.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.listItemText, { color: C.text, textAlign: isRTL ? 'right' : 'left' }]}>{isArabic ? stripTashkeel(item.text) : ((item as any).transliteration || stripTashkeel(item.text))}</Text>
                        <Text style={[s.listItemTarget, { color: C.textSec }]}>× {item.target}</Text>
                      </View>
                      <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  ))}
                </>
              )}
              <View style={{ height: 20 }} />
            </ScrollView>

            <TouchableOpacity
              style={[s.addBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => { setShowTasbihList(false); setShowCustomModal(true); }}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#fff" />
              <Text style={s.addBtnText}>{t('tasbih.addCustomDhikr')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== CUSTOM TASBIH MODAL ===== */}
      <Modal visible={showCustomModal} animationType="slide" transparent onRequestClose={() => setShowCustomModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, {
            height: 'auto',
            backgroundColor: isDarkMode ? 'rgba(30,30,32,0.85)' : 'rgba(255,255,255,0.88)',
            borderWidth: 0.5,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
          }]}>
            <View style={[s.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.modalTitle, { color: C.text }]}>{t('tasbih.addCustomDhikr')}</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)} style={[s.closeBtn, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <Text style={[s.inputLabel, { color: C.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('tasbih.dhikrText')}</Text>
            <TextInput
              style={[s.input, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.16)' : 'rgba(120,120,128,0.08)', color: C.text }]}
              value={customText}
              onChangeText={setCustomText}
              placeholder={t('tasbih.enterDhikrText')}
              placeholderTextColor={C.textSec}
              multiline
              textAlign={isRTL ? 'right' : 'left'}
            />
            <Text style={[s.inputLabel, { color: C.text, textAlign: isRTL ? 'right' : 'left' }]}>{t('tasbih.target')}</Text>
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
              <Text style={s.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== SETTINGS MODAL ===== */}
      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { height: 'auto', backgroundColor: isDarkMode ? '#1c1e23' : '#fff' }]}>
            <View style={[s.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.modalTitle, { color: C.text }]}>{t('common.settings')}</Text>
              <TouchableOpacity onPress={() => { saveSettings(); setShowSettings(false); }} style={[s.closeBtn, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <GlassToggle label={t('tasbih.vibration')} icon="cellphone" enabled={vibrationEnabled} onToggle={setVibrationEnabled} />
            <GlassToggle label={t('tasbih.showVirtue')} icon="star-outline" enabled={showVirtue} onToggle={setShowVirtue} />
            <GlassToggle label={t('tasbih.autoAdvance')} icon="arrow-right-circle-outline" enabled={autoAdvance} onToggle={setAutoAdvance} subtitle={t('tasbih.autoAdvanceDesc')} />
            <GlassToggle label={isArabic ? t('tasbih.showTranslation') : t('tasbih.showArabicOriginal')} icon="translate" enabled={showTranslation} onToggle={setShowTranslation} />
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#EF4444', marginTop: 20 }]} onPress={() => { handleResetAll(); setShowSettings(false); }}>
              <Text style={s.saveBtnText}>{t('tasbih.resetAll')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== STATS MODAL ===== */}
      <Modal visible={showStatsModal} animationType="slide" transparent onRequestClose={() => setShowStatsModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: isDarkMode ? '#1c1e23' : '#fff' }]}>
            <View style={[s.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.modalTitle, { color: C.text }]}>{t('tasbih.myStats')}</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)} style={[s.closeBtn, { backgroundColor: isDarkMode ? 'rgba(120,120,128,0.24)' : 'rgba(120,120,128,0.12)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Summary cards */}
              <View style={s.statsGrid}>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(47,118,89,0.08)' }]}>
                  <MaterialCommunityIcons name="calendar-today" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{String(totalCount)}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>{t('tasbih.todaysCount')}</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(47,118,89,0.08)' }]}>
                  <MaterialCommunityIcons name="sync" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{String(rounds)}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>{t('tasbih.completedRounds')}</Text>
                </View>
              </View>
              <View style={s.statsGrid}>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(47,118,89,0.08)' }]}>
                  <MaterialCommunityIcons name="sigma" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{String(allTimeTotal)}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>{t('tasbih.todayTotal')}</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(47,118,89,0.08)' }]}>
                  <MaterialCommunityIcons name="chart-line" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{String(avgPerDay)}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>{t('tasbih.dailyAverage')}</Text>
                </View>
              </View>

              {/* Today's breakdown by type */}
              {(typeStats[getTodayISO()] || typeStats[new Date().toDateString()]) && Object.keys(typeStats[getTodayISO()] || typeStats[new Date().toDateString()] || {}).length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { color: C.textSec, marginTop: 16, textAlign: isRTL ? 'right' : 'left' }]}>{t('tasbih.todayBreakdown')}</Text>
                  {Object.entries(typeStats[getTodayISO()] || typeStats[new Date().toDateString()] || {}).sort((a, b) => b[1] - a[1]).map(([text, cnt]) => (
                    <View key={text} style={[s.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(120,120,128,0.06)' }]}>
                      <Text style={[s.statsRowVal, { color: GREEN }]}>{String(cnt)}</Text>
                      <Text style={[s.statsRowDate, { color: C.text }]} numberOfLines={1}>{text.length > 30 ? text.slice(0, 28) + '…' : text}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Last 7 days */}
              <Text style={[s.sectionLabel, { color: C.textSec, marginTop: 16, textAlign: isRTL ? 'right' : 'left' }]}>{t('tasbih.last7Days')}</Text>
              {Object.entries(dailyStats).slice(-7).reverse().map(([date, cnt]) => {
                const dayTypeStats = typeStats[date];
                return (
                  <View key={date} style={[s.statsRow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(120,120,128,0.06)', flexDirection: 'column', alignItems: 'stretch' }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[s.statsRowVal, { color: GREEN }]}>{String(cnt)} {t('tasbih.dhikrUnit')}</Text>
                      <Text style={[s.statsRowDate, { color: C.textSec }]}>{date}</Text>
                    </View>
                    {dayTypeStats && Object.keys(dayTypeStats).length > 0 && (
                      <View style={{ marginTop: 8, gap: 4 }}>
                        {Object.entries(dayTypeStats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([text, c]) => (
                          <View key={text} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, fontFamily: fontMedium(), color: GREEN, opacity: 0.8 }}>{String(c)}</Text>
                            <Text style={{ fontSize: 11, fontFamily: fontRegular(), color: C.textSec }} numberOfLines={1}>{text.length > 25 ? text.slice(0, 23) + '…' : text}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
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
    fontSize: 20, fontFamily: fontBold(),
  },

  // Slider
  slider: {
    maxHeight: 44, marginTop: 8,
  },
  sliderContent: {
    paddingHorizontal: 20, gap: 8, alignItems: 'center',
  },
  sliderItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: 'transparent',
    maxWidth: SCREEN_WIDTH * 0.55,
  },
  sliderItemText: {
    fontSize: 13, fontFamily: fontSemiBold(),
  },

  // Selected info
  selectedInfo: {
    paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center',
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%',
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedText: {
    fontSize: 22, fontFamily: fontBold(),
    textAlign: 'center', lineHeight: 34,
  },
  selectedTranslit: {
    fontSize: 13, fontFamily: fontRegular(),
    marginTop: 2, textAlign: 'center', fontStyle: 'italic',
  },
  selectedVirtue: {
    fontSize: 12, fontFamily: fontRegular(),
    marginTop: 4, textAlign: 'center',
  },

  // Counter area
  counterArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20,
    overflow: 'visible' as const,
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
    overflow: 'visible' as const,
  },
  ringCenter: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    overflow: 'visible' as const,
  },
  countNum: {
    fontSize: 72, fontFamily: fontBold(), lineHeight: 100,
    textAlignVertical: 'center' as const,
    includeFontPadding: false,
  },
  countOf: {
    fontSize: 14, fontFamily: fontMedium(), marginTop: -4,
  },
  countDivider: {
    width: 48, height: 2, borderRadius: 1, marginVertical: 4, opacity: 0.5,
  },
  countTarget: {
    fontSize: 18, fontFamily: fontSemiBold(), opacity: 0.6,
  },

  // Chips
  chipsRow: {
    flexDirection: 'row', gap: 8, marginBottom: 12,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  chipText: {
    fontSize: 12, fontFamily: fontMedium(),
  },
  tapHint: {
    fontSize: 11, fontFamily: fontRegular(), marginTop: 4, textAlign: 'center' as const,
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
    fontSize: 20, fontFamily: fontBold(),
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  // List items
  sectionLabel: {
    fontSize: 15, fontFamily: fontSemiBold(), marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: 'transparent',
  },
  listItemText: {
    fontSize: 15, fontFamily: fontMedium(), marginBottom: 4,
  },
  listItemMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  listItemTarget: {
    fontSize: 13, fontFamily: fontRegular(),
  },
  listItemVirtue: {
    fontSize: 12, fontFamily: fontRegular(), marginTop: 2,
  },
  gradeBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4,
  },
  gradeBadgeText: {
    fontSize: 10, color: '#10B981', fontFamily: fontSemiBold(),
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, padding: 14, borderRadius: 14, gap: 8, marginTop: 8,
  },
  addBtnText: {
    fontSize: 15, fontFamily: fontSemiBold(), color: '#fff',
  },

  // Inputs
  inputLabel: {
    fontSize: 15, fontFamily: fontSemiBold(), marginBottom: 6,
  },
  input: {
    borderRadius: 12, padding: 14, fontSize: 15, fontFamily: fontRegular(),
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
    fontSize: 18, fontFamily: fontSemiBold(),
  },
  saveBtn: {
    backgroundColor: GREEN, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: {
    fontSize: 15, fontFamily: fontSemiBold(), color: '#fff',
  },

  // Stats
  statsGrid: {
    flexDirection: 'row', gap: 10, marginBottom: 10,
  },
  statCard: {
    flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, gap: 8,
  },
  statValue: {
    fontSize: 28, fontFamily: fontBold(),
  },
  statLabel: {
    fontSize: 12, fontFamily: fontRegular(),
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12, marginBottom: 6,
  },
  statsRowDate: {
    fontSize: 13, fontFamily: fontRegular(),
  },
  statsRowVal: {
    fontSize: 14, fontFamily: fontSemiBold(),
  },
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 8,
  },
  progressText: {
    fontSize: 13, fontFamily: fontSemiBold(),
  },
  positionText: {
    fontSize: 12, fontFamily: fontMedium(),
  },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, marginTop: 4,
  },
  resetBtnText: {
    fontSize: 13, fontFamily: fontSemiBold(),
  },
  toastContainer: {
    position: 'absolute' as const,
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  toastText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    color: '#fff',
  },
});
