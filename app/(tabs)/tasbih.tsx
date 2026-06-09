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
  AppState,
  KeyboardAvoidingView,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { playPageSound, EFFECT_SOUNDS } from '@/lib/sound-manager';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSettings } from '../../contexts/SettingsContext';
import BackgroundWrapper from '../../components/ui/BackgroundWrapper';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useSacredContext } from '@/hooks/use-sacred-context';
import { getLanguage, getTranslations, t } from '@/lib/i18n';
import { GlassCard, GlassToggle } from '../../components/ui/GlassCard';
import { AppModal } from '@/components/ui/AppModal';
import { copyToClipboard } from '../../lib/clipboard';
import { buildShareText } from '@/lib/share-text';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';
import { useAdBottomInset } from '@/lib/ads-context';
import { Share } from 'react-native';
import { getTodayDate, getAzkarRecord, saveAzkarRecord } from '../../lib/worship-storage';
import { trackTasbih } from '@/lib/firebase-analytics';
import { subscribeToTasbihPresets } from '@/lib/admin-data-api';
import { getUserId } from '@/lib/firebase-user';
import { syncMonthlyEngagementFromLocalWorship } from '@/lib/rewards-manager';
import {
  didReachTasbihTarget,
  removeLowerTargetDuplicateTasbihat,
} from '@/lib/tasbih-progress';
import {
  type AppTasbihPreset,
  getOpeningTasbihPreset,
  getDefaultTasbihatForApp,
  getTasbihVirtueTitle,
  resolveTasbihPresetText,
  YUNUS_DUA_POINT_TARGET,
  YUNUS_DUA_TASBIH_REFERENCE,
  YUNUS_DUA_TASBIH_TEXT,
  YUNUS_DUA_TASBIH_TRANSLITERATION,
  YUNUS_DUA_TASBIH_VIRTUE,
} from '@/lib/tasbih-presets';

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

type TasbihItem = AppTasbihPreset & { grade?: string };

interface CustomTasbih {
  id: number;
  text: string;
  target: number;
  createdAt: string;
}

const DEPRECATED_SUBHAN_WABIHAMDIH_TEXT = 'سبحان الله وبحمده';

// ============================================
// بيانات التسبيحات المعتمدة
// ============================================

const DEFAULT_PRESET_TASBIHAT: TasbihItem[] = getDefaultTasbihatForApp();

function normalizePresetTranslationId(id: unknown): number | undefined {
  if (typeof id === 'number' && Number.isInteger(id) && id >= 1 && id <= DEFAULT_PRESET_TASBIHAT.length) {
    return id;
  }

  if (typeof id === 'string') {
    const trailingNumber = id.match(/(\d+)$/)?.[1];
    if (trailingNumber) {
      const parsed = Number(trailingNumber);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= DEFAULT_PRESET_TASBIHAT.length) {
        return parsed;
      }
    }
  }

  return undefined;
}

function cleanOptionalText(text?: string): string | undefined {
  const trimmed = text?.trim();
  return trimmed ? trimmed : undefined;
}

function isGeneratedTasbihPlaceholder(text?: string): boolean {
  const normalized = text?.trim().toLowerCase().replace(/[_-]/g, ' ');
  return !!normalized && /^(virtue|reference)?\s*tasbih default \d+$/.test(normalized);
}

function getBundledTasbihValue(field: 'virtue' | 'reference', id: number): string | undefined {
  const key = `${field}${id}`;
  const current = getTranslations().tasbih as unknown as Record<string, string>;
  const arabic = getTranslations('ar').tasbih as unknown as Record<string, string>;
  return cleanOptionalText(current[key]) || cleanOptionalText(arabic[key]);
}

// Helper to get translated virtue/reference/grade for a preset
function getPresetVirtue(id: unknown, fallback?: string): string | undefined {
  const presetId = normalizePresetTranslationId(id);
  const cleanFallback = cleanOptionalText(fallback);
  if (!presetId) {
    return isGeneratedTasbihPlaceholder(cleanFallback) ? undefined : cleanFallback;
  }

  return resolveTasbihPresetText({
    language: getLanguage(),
    bundled: getBundledTasbihValue('virtue', presetId),
    fallback: isGeneratedTasbihPlaceholder(cleanFallback) ? undefined : cleanFallback,
  });
}
function getPresetReference(id: unknown, fallback?: string): string | undefined {
  const presetId = normalizePresetTranslationId(id);
  const cleanFallback = cleanOptionalText(fallback);
  if (!presetId) {
    return isGeneratedTasbihPlaceholder(cleanFallback) ? undefined : cleanFallback;
  }

  return resolveTasbihPresetText({
    language: getLanguage(),
    bundled: getBundledTasbihValue('reference', presetId),
    fallback: isGeneratedTasbihPlaceholder(cleanFallback) ? undefined : cleanFallback,
  });
}
function getPresetGrade(id: unknown): string | undefined {
  const presetId = normalizePresetTranslationId(id);
  if (!presetId) return undefined;

  const gradeMap: Record<number, string> = {
    1: 'gradeSahih', 2: 'gradeSahih', 3: 'gradeSahih',
    4: 'gradeMutafaq', 5: 'gradeMutafaq',
    7: 'gradeSahih', 8: 'gradeMutafaq', 9: 'gradeSahih',
    10: 'gradeHasan', 11: 'gradeSahih', 12: 'gradeSahih',
    13: 'gradeSahih', 14: 'gradeSahih', 15: 'gradeHasan',
  };
  const gradeKey = gradeMap[presetId];
  if (!gradeKey) return undefined;
  const fullKey = `tasbih.${gradeKey}` as any;
  const val = t(fullKey);
  return val !== fullKey ? val : undefined;
}

function normalizeTasbihTextForReplacement(text: string): string {
  return stripTashkeel(text).replace(/\s+/g, ' ').trim();
}

function isYunusDuaTasbih(item: Pick<TasbihItem, 'id' | 'text'>): boolean {
  return item.id === 6
    || normalizeTasbihTextForReplacement(item.text) === normalizeTasbihTextForReplacement(YUNUS_DUA_TASBIH_TEXT);
}

function getTasbihPointTarget(item: Pick<TasbihItem, 'id' | 'text' | 'target'>): number {
  return isYunusDuaTasbih(item) ? YUNUS_DUA_POINT_TARGET : Math.max(1, item.target || 1);
}

function getTargetOverrideForTasbih(item: TasbihItem, overrides: Record<string, number>): number | undefined {
  if (!isYunusDuaTasbih(item)) return undefined;
  const override = Number(overrides[String(item.id)]);
  return Number.isFinite(override) && override > 0 ? Math.floor(override) : undefined;
}

function applyTasbihTargetOverride(item: TasbihItem, overrides: Record<string, number>): TasbihItem {
  const override = getTargetOverrideForTasbih(item, overrides);
  return override ? { ...item, target: override } : item;
}

function replaceDeprecatedTasbihPreset(item: TasbihItem): TasbihItem {
  if (normalizeTasbihTextForReplacement(item.text) !== DEPRECATED_SUBHAN_WABIHAMDIH_TEXT) {
    return item;
  }

  return {
    ...item,
    text: YUNUS_DUA_TASBIH_TEXT,
    transliteration: YUNUS_DUA_TASBIH_TRANSLITERATION,
    target: 1,
    source: 'quran',
    virtue: YUNUS_DUA_TASBIH_VIRTUE,
    reference: YUNUS_DUA_TASBIH_REFERENCE,
    grade: undefined,
  };
}

// ============================================
// الثوابت
// ============================================

const RING_SIZE = SCREEN_WIDTH * 0.72;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const GREEN = '#0d8e62';
const GREEN_LIGHT = '#34D399';

const STORAGE_KEYS = {
  progress: 'tasbih_progress',
  settings: 'tasbih_settings',
  dailyStats: 'tasbih_daily_stats',
  customTasbihat: 'custom_tasbihat',
  completedToday: 'tasbih_completed_today',
  typeStats: 'tasbih_type_stats',
  targetOverrides: 'tasbih_target_overrides',
  lastDate: '@tasbih_last_date',
  dailyHistory: '@tasbih_daily_history',
};

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseTasbihAmount(value: string): number {
  const normalized = value
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[^\d]/g, '');
  return Number(normalized);
}

// ============================================
// المكون الرئيسي
// ============================================

export default function TasbihScreen() {
  const router = useRouter();
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const adBottomInset = useAdBottomInset();
  const s = useScaledStyles(_s, colors.fs);

  // Block all ads during tasbih counting
  useSacredContext('tasbih_active');

  const C = {
    bg: colors.background,
    card: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    text: colors.text,
    textSec: colors.textLight,
    ring: GREEN,
    ringBg: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    // Glass card colors - safe for light glass overlays
    glassText: colors.glassText,
    glassTextSec: colors.glassTextLight,
    glassIcon: colors.glassIcon,
  };

  // ===== STATE =====
  const [PRESET_TASBIHAT, setPresetTasbihat] = useState<TasbihItem[]>(DEFAULT_PRESET_TASBIHAT);
  const [selectedTasbih, setSelectedTasbih] = useState<TasbihItem>(DEFAULT_PRESET_TASBIHAT[0]);
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // === Refs as SSOT for persistence (avoids stale closures) ===
  const countRef = useRef(0);
  const totalCountRef = useRef(0);
  const roundsRef = useRef(0);
  const selectedIdRef = useRef(DEFAULT_PRESET_TASBIHAT[0].id);
  const dailyStatsRef = useRef<Record<string, number>>({});
  const saveInFlightRef = useRef<Promise<void> | null>(null);
  const typeStatsRef = useRef<Record<string, Record<string, number>>>({});
  const targetOverridesRef = useRef<Record<string, number>>({});
  const rewardsSyncDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tasbihAdShownThisSessionRef = useRef(false);
  const tasbihAdInFlightRef = useRef(false);
  const completedTasbihatRef = useRef<Record<number, boolean>>({});
  // Per-tasbih count memory: remembers count for each tasbih when switching
  const perTasbihCountsRef = useRef<Record<number | string, number>>({});
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTasbihList, setShowTasbihList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const { showStats } = useLocalSearchParams<{ showStats?: string }>();

  // Open stats modal from URL param (e.g., /(tabs)/tasbih?showStats=true)
  useEffect(() => {
    if (showStats === 'true') {
      setShowStatsModal(true);
    }
  }, [showStats]);

  // Subscribe to admin-managed presets from Firestore so order/content updates live.
  useEffect(() => {
    const unsubscribe = subscribeToTasbihPresets(DEFAULT_PRESET_TASBIHAT as any, (presets) => {
      const nextPresets = removeLowerTargetDuplicateTasbihat(
        (presets as TasbihItem[]).map(replaceDeprecatedTasbihPreset),
      ).map(item => applyTasbihTargetOverride(item, targetOverridesRef.current));
      if (nextPresets.length === 0) return;

      setPresetTasbihat(nextPresets);
      const openingSelected = getOpeningTasbihPreset(nextPresets, {
        selectedId: selectedIdRef.current,
        count: countRef.current,
        totalCount: totalCountRef.current,
        rounds: roundsRef.current,
      });
      if (openingSelected) {
        selectedIdRef.current = openingSelected.id;
        setSelectedTasbih(openingSelected);
        return;
      }

      const updatedSelected = nextPresets.find(item => item.id === selectedIdRef.current);
      if (updatedSelected) {
        selectedIdRef.current = updatedSelected.id;
        setSelectedTasbih(updatedSelected);
        return;
      }

      selectedIdRef.current = nextPresets[0].id;
      countRef.current = 0;
      setCount(0);
      setSelectedTasbih(nextPresets[0]);
    });

    return () => unsubscribe();
  }, []);

  const [customTasbihat, setCustomTasbihat] = useState<CustomTasbih[]>([]);
  const [customText, setCustomText] = useState('');
  const [customTarget, setCustomTarget] = useState('33');
  const [manualCountInput, setManualCountInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [dailyStats, setDailyStats] = useState<Record<string, number>>({});
  const [showVirtue, setShowVirtue] = useState(true);
  const isArabic = getLanguage() === 'ar';
  const [showTranslation, setShowTranslation] = useState(false);
  const [completedTasbihat, setCompletedTasbihat] = useState<Record<number, boolean>>({});
  const [typeStats, setTypeStats] = useState<Record<string, Record<string, number>>>({});
  const [targetOverrides, setTargetOverrides] = useState<Record<string, number>>({});
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

  // Keep refs in sync with state (SSOT for async saves)
  useEffect(() => { countRef.current = count; }, [count]);
  useEffect(() => { totalCountRef.current = totalCount; }, [totalCount]);
  useEffect(() => { roundsRef.current = rounds; }, [rounds]);
  useEffect(() => { selectedIdRef.current = selectedTasbih.id; }, [selectedTasbih.id]);
  useEffect(() => { typeStatsRef.current = typeStats; }, [typeStats]);
  useEffect(() => { targetOverridesRef.current = targetOverrides; }, [targetOverrides]);
  useEffect(() => { completedTasbihatRef.current = completedTasbihat; }, [completedTasbihat]);

  const scheduleRewardsSync = useCallback(() => {
    if (rewardsSyncDebounceRef.current) {
      clearTimeout(rewardsSyncDebounceRef.current);
    }
    rewardsSyncDebounceRef.current = setTimeout(() => {
      getUserId()
        .then(userId => (userId ? syncMonthlyEngagementFromLocalWorship(userId) : null))
        .catch(() => {});
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (rewardsSyncDebounceRef.current) {
        clearTimeout(rewardsSyncDebounceRef.current);
      }
    };
  }, []);

  // Track slider content width for RTL scroll calculation
  const sliderContentWidth = useRef(0);
  // Track actual measured positions of slider items for precise scrolling
  const itemPositionsRef = useRef<Record<number | string, { x: number; width: number }>>({});

  // ===== DATA LOADING (reload on every tab focus) =====
  useFocusEffect(
    useCallback(() => {
      // Wait for any in-flight save to finish before loading
      const doLoad = async () => {
        if (saveInFlightRef.current) {
          console.log('📿 [Tasbih] Waiting for pending save before load...');
          await saveInFlightRef.current.catch(() => {});
        }
        await loadData();
      };
      doLoad();
      return () => {
        // On blur: cancel pending debounce and flush latest ref-based state to AsyncStorage
        if (saveDebounceRef.current) {
          clearTimeout(saveDebounceRef.current);
          saveDebounceRef.current = null;
        }
        const today = getTodayISO();
        const payload = JSON.stringify({
          date: today,
          count: countRef.current,
          totalCount: totalCountRef.current,
          rounds: roundsRef.current,
          selectedId: selectedIdRef.current,
        });
        const stats = { ...dailyStatsRef.current, [today]: totalCountRef.current };
        console.log('📿 [Tasbih] Blur flush:', { count: countRef.current, total: totalCountRef.current, rounds: roundsRef.current });
        const flushPromise = Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.progress, payload),
          AsyncStorage.setItem(STORAGE_KEYS.lastDate, today),
          AsyncStorage.setItem(STORAGE_KEYS.dailyStats, JSON.stringify(stats)),
        ]).then(() => { saveInFlightRef.current = null; }).catch(() => { saveInFlightRef.current = null; });
        saveInFlightRef.current = flushPromise;
      };
    }, [])
  );

  // Flush tasbih progress when app goes to background (covers app kill scenario)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (saveDebounceRef.current) {
          clearTimeout(saveDebounceRef.current);
          saveDebounceRef.current = null;
        }
        const today = getTodayISO();
        const payload = JSON.stringify({
          date: today,
          count: countRef.current,
          totalCount: totalCountRef.current,
          rounds: roundsRef.current,
          selectedId: selectedIdRef.current,
        });
        AsyncStorage.setItem(STORAGE_KEYS.progress, payload).catch(() => {});
        AsyncStorage.setItem(STORAGE_KEYS.lastDate, today).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    progress.value = withTiming(count / selectedTasbih.target, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [count, selectedTasbih.target]);

  // Auto-scroll slider to selected tasbih using measured positions
  useEffect(() => {
    const pos = itemPositionsRef.current[selectedTasbih.id];
    if (pos && sliderRef.current) {
      sliderRef.current.scrollTo({
        x: Math.max(0, pos.x - SCREEN_WIDTH / 2 + pos.width / 2),
        animated: true,
      });
    } else if (sliderRef.current) {
      // Fallback: use index-based estimate before items are measured
      const allItems = [...PRESET_TASBIHAT, ...customTasbihat];
      const idx = allItems.findIndex(t => t.id === selectedTasbih.id);
      if (idx >= 0) {
        const estimatedItemWidth = 160;
        sliderRef.current.scrollTo({
          x: Math.max(0, idx * estimatedItemWidth - SCREEN_WIDTH / 2 + estimatedItemWidth / 2),
          animated: true,
        });
      }
    }
  }, [selectedTasbih.id, customTasbihat]);

  const loadData = async () => {
    try {
      const [settingsRaw, customRaw, progressRaw, statsRaw, completedRaw, typeStatsRaw, targetOverridesRaw, lastDateRaw, dailyHistoryRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.settings),
        AsyncStorage.getItem(STORAGE_KEYS.customTasbihat),
        AsyncStorage.getItem(STORAGE_KEYS.progress),
        AsyncStorage.getItem(STORAGE_KEYS.dailyStats),
        AsyncStorage.getItem(STORAGE_KEYS.completedToday),
        AsyncStorage.getItem(STORAGE_KEYS.typeStats),
        AsyncStorage.getItem(STORAGE_KEYS.targetOverrides),
        AsyncStorage.getItem(STORAGE_KEYS.lastDate),
        AsyncStorage.getItem(STORAGE_KEYS.dailyHistory),
      ]);

      console.log('📿 [Tasbih] loadData raw:', { progressRaw, lastDateRaw });

      if (settingsRaw) {
        try {
          const p = JSON.parse(settingsRaw);
          setVibrationEnabled(p.vibrationEnabled ?? true);
          setShowVirtue(p.showVirtue ?? true);
          setAutoAdvance(p.autoAdvance ?? true);
          setShowTranslation(p.showTranslation ?? false);
        } catch {}
      }
      if (customRaw) {
        try { setCustomTasbihat(JSON.parse(customRaw)); } catch {}
      }
      if (targetOverridesRaw) {
        try {
          const parsedOverrides = JSON.parse(targetOverridesRaw);
          targetOverridesRef.current = parsedOverrides;
          setTargetOverrides(parsedOverrides);
          setPresetTasbihat(items => items.map(item => applyTasbihTargetOverride(item, parsedOverrides)));
        } catch {}
      }

      // --- Daily auto-reset logic ---
      const todayISO = getTodayISO();
      const lastDate = lastDateRaw || '';
      let didReset = false;

      console.log('📿 [Tasbih] Date check:', { todayISO, lastDate, match: lastDate === todayISO });

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
        completedTasbihatRef.current = {};
        setCompletedTasbihat({});
        perTasbihCountsRef.current = {};
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
          if (progressDate === todayISO) {
            console.log('📿 [Tasbih] Restoring same-day progress:', { count: p.count, total: p.totalCount, rounds: p.rounds });
            const savedCount = p.count || 0;
            const savedTotalCount = p.totalCount || 0;
            const savedRounds = p.rounds || 0;
            setCount(savedCount);
            setTotalCount(savedTotalCount);
            setRounds(savedRounds);
            // Sync refs immediately
            countRef.current = savedCount;
            totalCountRef.current = savedTotalCount;
            roundsRef.current = savedRounds;
            const openingSelected = getOpeningTasbihPreset(PRESET_TASBIHAT, {
              selectedId: p.selectedId,
              count: savedCount,
              totalCount: savedTotalCount,
              rounds: savedRounds,
            });
            if (openingSelected) {
              selectedIdRef.current = openingSelected.id;
              setSelectedTasbih(applyTasbihTargetOverride(openingSelected, targetOverridesRef.current));
            }
          } else {
            console.log('📿 [Tasbih] Progress date mismatch, treating as fresh day:', { progressDate, todayISO });
          }
        } catch {}
      } else {
        console.log('📿 [Tasbih] No saved progress found, starting fresh');
      }

      // Save today as last active date
      await AsyncStorage.setItem(STORAGE_KEYS.lastDate, todayISO);

      if (statsRaw) {
        try {
          const parsed = JSON.parse(statsRaw);
          setDailyStats(parsed);
          dailyStatsRef.current = parsed;
        } catch {}
      }
      if (!didReset && completedRaw) {
        try {
          const parsed = JSON.parse(completedRaw);
          const compDate = parsed.date || '';
          if (compDate === todayISO || compDate === new Date().toDateString()) {
            const parsedCompleted = parsed.completed || {};
            completedTasbihatRef.current = parsedCompleted;
            setCompletedTasbihat(parsedCompleted);
          }
        } catch {}
      }
      if (typeStatsRaw) {
        try {
          const parsed = JSON.parse(typeStatsRaw);
          typeStatsRef.current = parsed;
          setTypeStats(parsed);
        } catch {} 
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
    // Update refs immediately so blur handler always has latest values
    countRef.current = c;
    totalCountRef.current = t;
    roundsRef.current = r;

    // Debounce actual AsyncStorage write to avoid thrashing on rapid taps
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      try {
        const today = getTodayISO();
        const payload = {
          date: today, count: c, totalCount: t, rounds: r, selectedId: selectedIdRef.current,
        };
        console.log('📿 [Tasbih] saveProgress:', payload);
        const saveOp = AsyncStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(payload));
        saveInFlightRef.current = saveOp.then(() => { saveInFlightRef.current = null; }).catch(() => { saveInFlightRef.current = null; });
        await saveOp;
        await AsyncStorage.setItem(STORAGE_KEYS.lastDate, today);
        const newStats = { ...dailyStatsRef.current, [today]: t };
        dailyStatsRef.current = newStats;
        setDailyStats(newStats);
        await AsyncStorage.setItem(STORAGE_KEYS.dailyStats, JSON.stringify(newStats));
      } catch (e) { console.error('📿 [Tasbih] saveProgress error:', e); }
    }, 500);
  }, []);

  const saveSettings = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ vibrationEnabled, showVirtue, autoAdvance, showTranslation }));
  };

  const trackTypeIncrement = useCallback(async (tasbihText: string, amount: number = 1) => {
    if (amount <= 0) return;
    try {
      const today = getTodayISO();
      const updated = { ...typeStatsRef.current };
      updated[today] = { ...(updated[today] || {}) };
      updated[today][tasbihText] = (updated[today][tasbihText] || 0) + amount;
      typeStatsRef.current = updated;
      setTypeStats(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.typeStats, JSON.stringify(updated));
    } catch (e) { console.error(e); }
  }, []);

  const adjustTodayTypeCount = useCallback(async (tasbihText: string, delta: number) => {
    if (delta === 0) return;
    try {
      const today = getTodayISO();
      const updated = { ...typeStatsRef.current };
      const dayStats = { ...(updated[today] || {}) };
      const nextValue = Math.max(0, (Number(dayStats[tasbihText]) || 0) + delta);
      if (nextValue > 0) {
        dayStats[tasbihText] = nextValue;
      } else {
        delete dayStats[tasbihText];
      }

      if (Object.keys(dayStats).length > 0) {
        updated[today] = dayStats;
      } else {
        delete updated[today];
      }

      typeStatsRef.current = updated;
      setTypeStats(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.typeStats, JSON.stringify(updated));
      scheduleRewardsSync();
    } catch (e) { console.error(e); }
  }, [scheduleRewardsSync]);

  const keepOnlyCompletedTodayTypeStats = useCallback(async (items: TasbihItem[]) => {
    try {
      const today = getTodayISO();
      const updated = { ...typeStatsRef.current };
      const dayStats = { ...(updated[today] || {}) };
      const completedLimits = new Map<string, number>();

      items.forEach(item => {
        if (!completedTasbihatRef.current[item.id]) return;
        completedLimits.set(item.text, Math.max(completedLimits.get(item.text) || 0, item.target));
      });

      const keptStats: Record<string, number> = {};
      Object.entries(dayStats).forEach(([text, value]) => {
        const completedLimit = completedLimits.get(text);
        if (!completedLimit) return;
        keptStats[text] = Math.min(Number(value) || 0, completedLimit);
      });

      if (Object.keys(keptStats).length > 0) {
        updated[today] = keptStats;
      } else {
        delete updated[today];
      }
      typeStatsRef.current = updated;
      setTypeStats(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.typeStats, JSON.stringify(updated));
      scheduleRewardsSync();
    } catch (e) { console.error(e); }
  }, [scheduleRewardsSync]);

  const markTasbihCompletedToday = useCallback(async (tasbihId: number) => {
    if (completedTasbihatRef.current[tasbihId]) return;

    const nextCompleted = { ...completedTasbihatRef.current, [tasbihId]: true };
    completedTasbihatRef.current = nextCompleted;
    setCompletedTasbihat(nextCompleted);
    await AsyncStorage.setItem(STORAGE_KEYS.completedToday, JSON.stringify({
      date: getTodayISO(), completed: nextCompleted,
    }));
  }, []);

  const getTodayPointBearingAmount = useCallback((tasbih: TasbihItem, amount: number): number => {
    if (amount <= 0 || completedTasbihatRef.current[tasbih.id]) return 0;

    const today = getTodayISO();
    const creditedToday = Number(typeStatsRef.current[today]?.[tasbih.text]) || 0;
    const remainingPointCredit = Math.max(0, getTasbihPointTarget(tasbih) - creditedToday);

    return Math.min(amount, remainingPointCredit);
  }, []);

  const getReversiblePointAmount = useCallback((tasbih: TasbihItem, currentCount: number): number => {
    if (completedTasbihatRef.current[tasbih.id] || currentCount <= 0) return 0;
    const today = getTodayISO();
    const creditedToday = Number(typeStatsRef.current[today]?.[tasbih.text]) || 0;
    return Math.min(Math.max(0, currentCount), Math.max(0, creditedToday), getTasbihPointTarget(tasbih));
  }, []);

  const showTasbihCompletionAd = useCallback(async () => {
    if (tasbihAdShownThisSessionRef.current || tasbihAdInFlightRef.current) return;
    tasbihAdInFlightRef.current = true;
    try {
      const didShow = await showInterstitial({
        allowInSacredContext: true,
        ignoreSmartFrequencyCaps: true,
        ignoreSmartSessionDelay: true,
      });
      if (didShow) {
        tasbihAdShownThisSessionRef.current = true;
      }
    } finally {
      tasbihAdInFlightRef.current = false;
    }
  }, []);

  const maybeShowCompletionAd = useCallback((
    previousRounds: number,
    nextRounds: number,
  ) => {
    const crossedFiveRounds = Math.floor(previousRounds / 5) < Math.floor(nextRounds / 5);

    if (crossedFiveRounds) {
      setTimeout(() => {
        showTasbihCompletionAd().catch(() => {});
      }, 650);
    }
  }, [showTasbihCompletionAd]);

  // ===== HANDLERS =====
  const handlePress = useCallback(async () => {
    const currentTasbih = selectedTasbih;
    const previousCount = countRef.current;
    const previousTotal = totalCountRef.current;
    const previousRounds = roundsRef.current;
    const target = Math.max(1, currentTasbih.target || 1);
    const wasCompletedToday = !!completedTasbihatRef.current[currentTasbih.id];

    tapScale.value = withSpring(0.9, { damping: 12, stiffness: 400 }, () => {
      tapScale.value = withSpring(1, { damping: 8, stiffness: 200 });
    });

    if (vibrationEnabled) {
      Platform.OS === 'ios'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Vibration.vibrate(30);
    }

    const newCount = previousCount + 1;
    const newTotal = previousTotal + 1;
    const completedRound = newCount >= target;
    const pointBearingAmount = isYunusDuaTasbih(currentTasbih)
      ? (completedRound ? getTodayPointBearingAmount(currentTasbih, YUNUS_DUA_POINT_TARGET) : 0)
      : getTodayPointBearingAmount(currentTasbih, 1);
    const completionWrite = completedRound && !wasCompletedToday
      ? markTasbihCompletedToday(currentTasbih.id).catch(e => console.error(e))
      : Promise.resolve();

    if (completedRound) {
      countRef.current = 0;
      totalCountRef.current = newTotal;
      roundsRef.current = previousRounds + 1;
      perTasbihCountsRef.current[currentTasbih.id] = 0;
    } else {
      countRef.current = newCount;
      totalCountRef.current = newTotal;
      perTasbihCountsRef.current[currentTasbih.id] = newCount;
    }

    if (pointBearingAmount > 0) {
      await trackTypeIncrement(currentTasbih.text, pointBearingAmount);
      scheduleRewardsSync();
    }

    if (completedRound) {
      if (vibrationEnabled) {
        Platform.OS === 'ios'
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Vibration.vibrate([0, 100, 100, 100]);
      }
      
      // تشغيل صوت إتمام التسبيح (من إعدادات الأدمن أو الافتراضي)
      playPageSound('tasbihComplete', EFFECT_SOUNDS.success).catch(() => {});
      
      setCount(0);
      setRounds(r => r + 1);
      setTotalCount(newTotal);
      // Clear per-tasbih count for completed tasbih
      perTasbihCountsRef.current[currentTasbih.id] = 0;
      saveProgress(0, newTotal, previousRounds + 1);

      if (!wasCompletedToday) {
        // تسجيل إحصائيات التسبيح في Firebase
        trackTasbih(getTasbihPointTarget(currentTasbih), currentTasbih.text, previousRounds + 1).catch(() => {});
        await completionWrite;
      }

      maybeShowCompletionAd(previousRounds, previousRounds + 1);

      // Log completion to worship tracker
      if (!wasCompletedToday) {
        try {
          const today = getTodayDate();
          const azkarRecord = await getAzkarRecord(today);
          const record = azkarRecord || { date: today, morning: false, evening: false, sleep: false, wakeup: false, afterPrayer: false };
          record.afterPrayer = true;
          await saveAzkarRecord(record);
        } catch (e) { console.error('Error logging to worship tracker:', e); }
      }
      
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
        const curIdx = advanceItems.findIndex(t => t.id === currentTasbih.id);
        const nextIdx = (curIdx + 1) % advanceItems.length;
        const nextItem = advanceItems[nextIdx];
        // Save current tasbih's count (0 since just completed) before switching
        perTasbihCountsRef.current[currentTasbih.id] = 0;
        // Restore the next tasbih's previous count (or 0 if fresh)
        const restoredCount = perTasbihCountsRef.current[nextItem.id] || 0;
        setSelectedTasbih(nextItem);
        setCount(restoredCount);
        countRef.current = restoredCount;
        // Update selectedIdRef BEFORE any further saves so progress is consistent
        selectedIdRef.current = nextItem.id;
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 200);
      }
    } else {
      setCount(newCount);
      setTotalCount(newTotal);
      perTasbihCountsRef.current[currentTasbih.id] = newCount;
      saveProgress(newCount, newTotal, previousRounds);
    }
  }, [selectedTasbih, vibrationEnabled, autoAdvance, PRESET_TASBIHAT, customTasbihat, saveProgress, trackTypeIncrement, scheduleRewardsSync, maybeShowCompletionAd, markTasbihCompletedToday, getTodayPointBearingAmount]);

  const handleReset = () => {
    Alert.alert(t('tasbih.reset'), t('tasbih.resetConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: () => {
        if (!completedTasbihatRef.current[selectedTasbih.id]) {
          adjustTodayTypeCount(selectedTasbih.text, -countRef.current).catch(() => {});
        }
        const nextTotal = Math.max(0, totalCountRef.current - countRef.current);
        perTasbihCountsRef.current[selectedTasbih.id] = 0;
        setCount(0);
        setTotalCount(nextTotal);
        saveProgress(0, nextTotal, roundsRef.current);
      } },
    ]);
  };

  const handleResetAll = () => {
    Alert.alert(t('tasbih.resetAll'), t('tasbih.resetAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: () => {
        const resetItems: TasbihItem[] = [
          ...PRESET_TASBIHAT,
          ...customTasbihat.map(ct => ({
            id: ct.id,
            text: ct.text,
            target: ct.target,
            source: 'athar' as const,
          })),
        ];
        keepOnlyCompletedTodayTypeStats(resetItems).catch(() => {});
        setCount(0);
        setTotalCount(0);
        setRounds(0);
        perTasbihCountsRef.current = {};
        saveProgress(0, 0, 0);
      } },
    ]);
  };

  const selectTasbih = (tasbih: TasbihItem | CustomTasbih) => {
    const item: TasbihItem = 'source' in tasbih
      ? tasbih as TasbihItem
      : { id: tasbih.id, text: tasbih.text, target: tasbih.target, source: 'athar' as const };
    const targetItem = applyTasbihTargetOverride(item, targetOverridesRef.current);
    const applySelection = () => {
      // Save current tasbih's count before switching
      perTasbihCountsRef.current[selectedTasbih.id] = countRef.current;
      // Restore the target tasbih's previous count (or 0 if fresh)
      const restored = perTasbihCountsRef.current[targetItem.id] || 0;
      setSelectedTasbih(targetItem);
      setCount(restored);
      countRef.current = restored;
      selectedIdRef.current = targetItem.id;
      setShowTasbihList(false);
    };

    if (targetItem.id !== selectedTasbih.id && completedTasbihatRef.current[targetItem.id]) {
      Alert.alert(
        isArabic ? 'تم تسبيح اليوم' : 'Completed today',
        isArabic
          ? 'أكملت هذا الذكر اليوم. يمكنك التسبيح مرة أخرى، لكنه لن يزيد النقاط أو الترتيب.'
          : 'You completed this dhikr today. You can repeat it, but it will not add points or ranking progress.',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: isArabic ? 'تسبيح مرة أخرى' : 'Repeat', onPress: applySelection },
        ],
      );
      return;
    }

    applySelection();
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

  const openTargetModal = useCallback(() => {
    setTargetInput(String(selectedTasbih.target));
    setShowTargetModal(true);
  }, [selectedTasbih.target]);

  const saveSelectedTargetOverride = useCallback(async () => {
    const nextTarget = parseTasbihAmount(targetInput);
    if (!Number.isFinite(nextTarget) || nextTarget <= 0 || nextTarget > 99999) {
      Alert.alert(t('common.error'), t('tasbih.externalCountError'));
      return;
    }

    const normalizedTarget = Math.floor(nextTarget);
    const nextOverrides = {
      ...targetOverridesRef.current,
      [String(selectedTasbih.id)]: normalizedTarget,
    };
    targetOverridesRef.current = nextOverrides;
    setTargetOverrides(nextOverrides);
    await AsyncStorage.setItem(STORAGE_KEYS.targetOverrides, JSON.stringify(nextOverrides));

    const updatedSelected = { ...selectedTasbih, target: normalizedTarget };
    setSelectedTasbih(updatedSelected);
    setPresetTasbihat(items => items.map(item => (
      item.id === selectedTasbih.id ? { ...item, target: normalizedTarget } : item
    )));

    const clampedCount = Math.min(countRef.current, Math.max(0, normalizedTarget - 1));
    if (clampedCount !== countRef.current) {
      countRef.current = clampedCount;
      perTasbihCountsRef.current[selectedTasbih.id] = clampedCount;
      setCount(clampedCount);
      saveProgress(clampedCount, totalCountRef.current, roundsRef.current);
    }

    setShowTargetModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [targetInput, selectedTasbih, saveProgress]);

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
    const currentCount = countRef.current;
    if (currentCount <= 0) return;
    if (vibrationEnabled) {
      Platform.OS === 'ios'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Vibration.vibrate(20);
    }
    const newCount = currentCount - 1;
    const newTotal = Math.max(0, totalCountRef.current - 1);
    if (!completedTasbihatRef.current[selectedTasbih.id]) {
      const reversibleAmount = getReversiblePointAmount(selectedTasbih, currentCount);
      if (reversibleAmount > 0 && currentCount <= getTasbihPointTarget(selectedTasbih)) {
        adjustTodayTypeCount(selectedTasbih.text, -1).catch(() => {});
      }
    }
    perTasbihCountsRef.current[selectedTasbih.id] = newCount;
    setCount(newCount);
    setTotalCount(newTotal);
    saveProgress(newCount, newTotal, roundsRef.current);
  }, [adjustTodayTypeCount, selectedTasbih, vibrationEnabled, saveProgress, getReversiblePointAmount]);

  const handleQuickReset = useCallback(() => {
    const currentCount = countRef.current;
    if (currentCount === 0) return;
    if (!completedTasbihatRef.current[selectedTasbih.id]) {
      const reversibleAmount = getReversiblePointAmount(selectedTasbih, currentCount);
      if (reversibleAmount > 0) {
        adjustTodayTypeCount(selectedTasbih.text, -reversibleAmount).catch(() => {});
      }
    }
    const nextTotal = Math.max(0, totalCountRef.current - currentCount);
    perTasbihCountsRef.current[selectedTasbih.id] = 0;
    setCount(0);
    setTotalCount(nextTotal);
    saveProgress(0, nextTotal, roundsRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [adjustTodayTypeCount, saveProgress, selectedTasbih, getReversiblePointAmount]);

  const addManualTasbihCount = useCallback(async () => {
    const amount = parseTasbihAmount(manualCountInput);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 99999) {
      Alert.alert(t('common.error'), t('tasbih.externalCountError'));
      return;
    }

    const previousCount = countRef.current;
    const previousTotal = totalCountRef.current;
    const previousRounds = roundsRef.current;
    const target = Math.max(1, selectedTasbih.target || 1);
    const combinedCount = previousCount + amount;
    const completedRoundsDelta = Math.floor(combinedCount / target);
    const nextCount = combinedCount % target;
    const nextTotal = previousTotal + amount;
    const nextRounds = previousRounds + completedRoundsDelta;
    const wasCompletedToday = !!completedTasbihatRef.current[selectedTasbih.id];
    const reachedFirstDailyCompletion = !wasCompletedToday && didReachTasbihTarget({
      amount,
      currentCount: previousCount,
      target,
    });
    const pointBearingAmount = isYunusDuaTasbih(selectedTasbih)
      ? (reachedFirstDailyCompletion ? getTodayPointBearingAmount(selectedTasbih, YUNUS_DUA_POINT_TARGET) : 0)
      : getTodayPointBearingAmount(selectedTasbih, amount);

    if (pointBearingAmount > 0) {
      await trackTypeIncrement(selectedTasbih.text, pointBearingAmount);
      scheduleRewardsSync();
    }

    setCount(nextCount);
    setTotalCount(nextTotal);
    setRounds(nextRounds);
    perTasbihCountsRef.current[selectedTasbih.id] = nextCount;
    saveProgress(nextCount, nextTotal, nextRounds);

    if (completedRoundsDelta > 0) {
      if (vibrationEnabled) {
        Platform.OS === 'ios'
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Vibration.vibrate([0, 100, 100, 100]);
      }
      playPageSound('tasbihComplete', EFFECT_SOUNDS.success).catch(() => {});
      if (reachedFirstDailyCompletion) {
        trackTasbih(getTasbihPointTarget(selectedTasbih), selectedTasbih.text, nextRounds).catch(() => {});
        await markTasbihCompletedToday(selectedTasbih.id);
      }

      if (reachedFirstDailyCompletion) {
        try {
          const today = getTodayDate();
          const azkarRecord = await getAzkarRecord(today);
          const record = azkarRecord || { date: today, morning: false, evening: false, sleep: false, wakeup: false, afterPrayer: false };
          record.afterPrayer = true;
          await saveAzkarRecord(record);
        } catch (e) { console.error('Error logging to worship tracker:', e); }
      }
    }

    maybeShowCompletionAd(previousRounds, nextRounds);
    setManualCountInput('');
    setShowManualModal(false);
  }, [
    manualCountInput,
    selectedTasbih,
    vibrationEnabled,
    saveProgress,
    trackTypeIncrement,
    scheduleRewardsSync,
    maybeShowCompletionAd,
    markTasbihCompletedToday,
    getTodayPointBearingAmount,
  ]);

  const handleShare = async () => {
    const dhikrDisplay = isArabic ? stripTashkeel(selectedTasbih.text) : (selectedTasbih.transliteration || stripTashkeel(selectedTasbih.text));
    const text = `📿 ${t('tasbih.title')}\n\n「 ${dhikrDisplay} 」\n\n🔢 ${t('tasbih.counter')}: ${count}/${selectedTasbih.target}\n🔄 ${t('tasbih.rounds')}: ${rounds}\n📊 ${t('tasbih.todayTotal')}: ${totalCount}`;
    try { await Share.share({ message: buildShareText(text) }); } catch (e) { console.error(e); }
  };

  // ===== COMPUTED =====
  const allTasbihItems: (TasbihItem | CustomTasbih)[] = [...PRESET_TASBIHAT, ...customTasbihat];
  const completedCount = Object.values(completedTasbihat).filter(Boolean).length;
  const currentIndex = allTasbihItems.findIndex(t => t.id === selectedTasbih.id);
  const allTimeTotal = Object.values(dailyStats).reduce((a, b) => a + b, 0);
  const daysCount = Object.keys(dailyStats).length || 1;
  const avgPerDay = Math.round(allTimeTotal / daysCount);
  const progressPct = Math.round((count / selectedTasbih.target) * 100);
  const selectedIsYunusDua = isYunusDuaTasbih(selectedTasbih);

  const hasBg = settings?.display?.appBackground && settings.display.appBackground !== 'none';

  // ===== RENDER =====
  return (
    <BackgroundWrapper backgroundKey={settings?.display?.appBackground} backgroundUrl={settings?.display?.appBackgroundUrl} opacity={settings?.display?.backgroundOpacity ?? 1} style={{ flex: 1, backgroundColor: hasBg ? 'transparent' : C.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar style={colors.statusBarStyle} />
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
          {/* Left side in RTL: add custom + settings */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity onPress={() => setShowCustomModal(true)} style={s.headerBtn}>
              <MaterialCommunityIcons name="plus" size={22} color={C.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={s.headerBtn}>
              <MaterialCommunityIcons name="cog-outline" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={[s.scrollContent, { paddingBottom: 140 + adBottomInset }]}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          nestedScrollEnabled
        >
          {/* Progress indicator */}
          <View style={[s.progressRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[s.progressText, { color: GREEN, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {String(completedCount)}/{String(allTasbihItems.length)}
          </Text>
          <Text style={[s.positionText, { color: C.textSec, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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
          onContentSizeChange={(w) => { sliderContentWidth.current = w; }}
        >
          {PRESET_TASBIHAT.map((item) => {
            const isSelected = selectedTasbih.id === item.id;
            const isCompleted = completedTasbihat[item.id];
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => selectTasbih(item)}
                onLayout={(e) => { itemPositionsRef.current[item.id] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width }; }}
                activeOpacity={0.7}
                style={[
                  s.sliderItem,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    backgroundColor: isSelected
                      ? GREEN
                      : isCompleted
                        ? (isDarkMode ? 'rgba(13,142,98,0.35)' : 'rgba(13,142,98,0.20)')
                        : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                    borderColor: isSelected ? GREEN : 'transparent',
                    borderWidth: isSelected ? 2 : 1,
                  },
                  isRTL && { transform: [{ scaleX: -1 }] },
                ]}
              >
                {isCompleted && !isSelected && <MaterialCommunityIcons name="check-circle" size={14} color={GREEN} />}
                <Text
                  style={[
                    s.sliderItemText,
                    { color: isSelected ? '#fff' : isCompleted ? GREEN : C.text, fontFamily: isSelected ? fontBold() : fontSemiBold() },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
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
                onLayout={(e) => { itemPositionsRef.current[item.id] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width }; }}
                activeOpacity={0.7}
                style={[
                  s.sliderItem,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    backgroundColor: isSelected
                      ? GREEN
                      : isCompleted
                        ? (isDarkMode ? 'rgba(13,142,98,0.35)' : 'rgba(13,142,98,0.20)')
                        : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                    borderColor: isSelected ? GREEN : 'transparent',
                    borderWidth: isSelected ? 2 : 1,
                  },
                  isRTL && { transform: [{ scaleX: -1 }] },
                ]}
              >
                {isCompleted && !isSelected && <MaterialCommunityIcons name="check-circle" size={14} color={GREEN} />}
                <Text
                  style={[
                    s.sliderItemText,
                    { color: isSelected ? '#fff' : isCompleted ? GREEN : C.text, fontFamily: isSelected ? fontBold() : fontSemiBold() },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
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
              style={[s.navBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]}
            >
              <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={22} color={C.text} />
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
              {selectedIsYunusDua && (
                <TouchableOpacity
                  style={[s.targetOverrideBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={openTargetModal}
                  activeOpacity={0.75}
                >
                  <View style={s.targetOverrideIcon}>
                    <MaterialCommunityIcons name="counter" size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={s.targetOverrideTitle}>
                      {isArabic ? 'اختر عدد التكرار' : 'Choose repeat count'}
                    </Text>
                    <Text style={s.targetOverrideSubtitle}>
                      {isArabic ? 'يُحسب في النقاط كإكمال واحد' : 'Counts as one completion for points'}
                    </Text>
                  </View>
                  <View style={s.targetOverrideValue}>
                    <Text style={s.targetOverrideValueText}>{String(selectedTasbih.target)}</Text>
                    <MaterialCommunityIcons name="pencil" size={13} color={GREEN} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                const allItems = [...PRESET_TASBIHAT, ...customTasbihat];
                const idx = allItems.findIndex(t => t.id === selectedTasbih.id);
                // Third child → LEFT in row-reverse (RTL) = Next
                if (idx < allItems.length - 1) selectTasbih(allItems[idx + 1]);
              }}
              style={[s.navBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]}
            >
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={C.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== VIRTUE CARD ===== */}
        {showVirtue && getPresetVirtue(selectedTasbih.id, selectedTasbih.virtue) && (
          <View style={s.virtueContainer}>
            {/* Virtue Card */}
            <View style={[s.virtueCard, { 
              backgroundColor: isDarkMode ? 'rgba(13,142,98,0.15)' : 'rgba(13,142,98,0.10)',
              borderColor: isDarkMode ? 'rgba(13,142,98,0.30)' : 'rgba(13,142,98,0.20)',
            }]}>
              {/* Header */}
              <View style={[s.virtueHeader, {
                flexDirection: 'row',
                alignSelf: isRTL ? 'flex-end' : 'flex-start',
              }]}>
                <MaterialCommunityIcons name="star" size={16} color={GREEN} />
                <Text style={[s.virtueTitle, {
                  color: GREEN,
                  marginLeft: 6,
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                  textAlign: isRTL ? 'right' : 'left',
                }]}>{getTasbihVirtueTitle(getLanguage())}</Text>
              </View>
              
              {/* Virtue text */}
              <Text style={[s.virtueText, { 
                color: C.text, 
                textAlign: isRTL ? 'right' : 'left', 
                writingDirection: isRTL ? 'rtl' : 'ltr' 
              }]}>
                {getPresetVirtue(selectedTasbih.id, selectedTasbih.virtue)}
              </Text>
              
              {/* Source reference */}
              {getPresetReference(selectedTasbih.id, selectedTasbih.reference) && (
                <Text style={[s.virtueSource, { 
                  color: C.textSec, 
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr'
                }]}>
                  {getPresetReference(selectedTasbih.id, selectedTasbih.reference)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ===== MAIN COUNTER with RING ===== */}
        <View style={s.counterArea}>
          <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
            <Animated.View style={[s.ringContainer, tapAnimStyle, {
              borderRadius: (RING_SIZE + 20) / 2,
              overflow: 'hidden',
              ...Platform.select({
                ios: { shadowColor: GREEN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.10, shadowRadius: 20 },
                android: {},
              }),
            }]}>
              {Platform.OS === 'ios' ? (
                <>
                  <BlurView

                    intensity={80}
                    tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
                    style={[StyleSheet.absoluteFill, { borderRadius: (RING_SIZE + 20) / 2 }]}
                  />
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.45)' : 'rgba(255,255,255,0.60)', borderRadius: (RING_SIZE + 20) / 2 }]} />
                </>
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(15,25,30,0.55)' : 'rgba(255,255,255,0.75)', borderRadius: (RING_SIZE + 20) / 2 }]} />
              )}
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
                <Text style={[s.countNum, { color: C.glassText, fontSize: count >= 1000 ? 52 : count >= 100 ? 72 : 96, lineHeight: count >= 1000 ? 64 : count >= 100 ? 86 : 110, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium', fontWeight: '900' }, colors.textShadowStyle]} numberOfLines={1}>{String(count)}</Text>
                <View style={[s.countDivider, { backgroundColor: C.glassTextSec }]} />
                <Text style={[s.countTarget, { color: C.glassTextSec, fontSize: colors.fs(24), fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium', fontWeight: '700' }]}>{String(selectedTasbih.target)}</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Stats chips */}
          <View style={[s.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {[
              { icon: 'sync' as const, text: `${String(rounds)} ${t('tasbih.rounds')}` },
              { icon: 'counter' as const, text: `${String(totalCount)} ${t('tasbih.total')}` },
              { icon: 'percent' as const, text: `${String(progressPct)}%` },
            ].map((chip, i) => (
              <View key={i} style={[s.chip, { overflow: 'hidden', borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {Platform.OS === 'ios' && (
                  <BlurView
                   
                    intensity={80}
                    tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.45)' : 'rgba(255,255,255,0.60)' }]} />
                <MaterialCommunityIcons name={chip.icon} size={14} color={GREEN} />
                <Text style={[s.chipText, { color: C.glassText, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{chip.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[s.externalCountBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => setShowManualModal(true)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="plus-box-outline" size={18} color="#fff" />
            <Text style={s.externalCountBtnText}>{t('tasbih.logExternal')}</Text>
          </TouchableOpacity>

          {/* Reset button */}
          <TouchableOpacity
            style={[s.resetBtn, {
              backgroundColor: count > 0 ? (isDarkMode ? 'rgba(6,79,47,0.12)' : 'rgba(6,79,47,0.08)') : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
              borderColor: count > 0 ? GREEN + '30' : C.cardBorder,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }]}
            onPress={handleQuickReset}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="restart" size={18} color={count > 0 ? GREEN : C.textSec} />
            <Text style={[s.resetBtnText, { color: count > 0 ? GREEN : C.textSec }]}>{t('tasbih.resetCounter')}</Text>
          </TouchableOpacity>

          <Text style={[s.tapHint, { color: isDarkMode ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)' }]}>
            {t('tasbih.tapToCount')}
          </Text>
        </View>
        </ScrollView>

        {/* Bottom actions */}
        <BannerAdComponent screen="tasbih" inTabScreen />
      </SafeAreaView>

      {/* Reset toast */}
      {resetToastVisible && (
        <View style={s.toastContainer}>
          <View style={[s.toast, { backgroundColor: isDarkMode ? 'rgba(6,79,47,0.95)' : 'rgba(6,79,47,0.9)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
            <Text style={s.toastText}>{t('tasbih.dailyResetToast')}</Text>
          </View>
        </View>
      )}

      {/* ===== TASBIH LIST MODAL ===== */}
      <Modal visible={showTasbihList} animationType="slide" transparent onRequestClose={() => setShowTasbihList(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { backgroundColor: colors.modalSurface, paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            <View style={[s.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.modalTitle, { color: C.text }]}>{t('tasbih.selectDhikr')}</Text>
              <TouchableOpacity onPress={() => setShowTasbihList(false)} style={[s.closeBtn, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={[s.sectionLabel, { color: C.textSec, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('tasbih.approvedDhikr')}</Text>
              {PRESET_TASBIHAT.map((item) => (
                <View key={item.id} style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 8, backgroundColor: isDarkMode ? 'rgba(15,25,30,0.55)' : 'rgba(255,255,255,0.85)' }}>
                  <TouchableOpacity
                    style={[s.listItem, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: 'transparent', marginBottom: 0 }, selectedTasbih.id === item.id && { borderColor: GREEN, borderWidth: 2 }]}
                    onPress={() => selectTasbih(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.listItemText, { color: C.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{isArabic ? stripTashkeel(item.text) : (item.transliteration || stripTashkeel(item.text))}</Text>
                      <View style={[s.listItemMeta, { justifyContent: isRTL ? 'flex-start' : 'flex-start', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[s.listItemTarget, { color: C.textSec }]}>× {item.target}</Text>
                        {getPresetGrade(item.id) && <View style={s.gradeBadge}><Text style={s.gradeBadgeText}>{getPresetGrade(item.id)}</Text></View>}
                      </View>
                      {getPresetVirtue(item.id, item.virtue) && <Text style={[s.listItemVirtue, { color: C.textSec, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>{getPresetVirtue(item.id, item.virtue)}</Text>}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}

              {customTasbihat.length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { color: C.textSec, marginTop: 16, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('tasbih.myCustomDhikr')}</Text>
                  {customTasbihat.map((item) => (
                    <View key={item.id} style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 8, backgroundColor: isDarkMode ? 'rgba(15,25,30,0.55)' : 'rgba(255,255,255,0.85)' }}>
                      <TouchableOpacity
                        style={[s.listItem, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: 'transparent', marginBottom: 0 }]}
                        onPress={() => selectTasbih(item)}
                        onLongPress={() => deleteCustomTasbih(item.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[s.listItemText, { color: C.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{isArabic ? stripTashkeel(item.text) : ((item as any).transliteration || stripTashkeel(item.text))}</Text>
                          <Text style={[s.listItemTarget, { color: C.textSec }]}>× {item.target}</Text>
                        </View>
                        <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
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

      {/* ===== TARGET OVERRIDE MODAL ===== */}
      <Modal visible={showTargetModal} animationType="slide" transparent onRequestClose={() => setShowTargetModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, {
            height: 'auto',
            backgroundColor: colors.modalSurface,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          }]}>
            <View style={[s.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.modalTitle, { color: C.text }]}>
                {isArabic ? 'تحديد العدد' : 'Set Target'}
              </Text>
              <TouchableOpacity onPress={() => setShowTargetModal(false)} style={[s.closeBtn, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <Text style={[s.inputLabel, { color: C.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isArabic ? 'العدد الذي تريد التسبيح به' : 'Your personal target'}
            </Text>
            <TextInput
              style={[s.stepperInput, s.manualInput, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.16)' : 'rgba(120,120,128,0.16)', color: C.text }]}
              value={targetInput}
              onChangeText={setTargetInput}
              placeholder="100"
              placeholderTextColor={C.textSec}
              keyboardType="number-pad"
              textAlign="center"
              autoFocus
            />

            <View style={[s.manualQuickRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {[1, 33, 100].map(value => (
                <TouchableOpacity key={value} style={s.manualQuickBtn} onPress={() => setTargetInput(String(value))}>
                  <Text style={s.manualQuickText}>{String(value)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.targetOverrideHint, { color: C.textSec, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isArabic
                ? 'هذا العدد للتسبيح فقط. في النقاط ولوحة الشرف يُحسب إكماله كتسبيحة واحدة.'
                : 'This is only your recitation target. Points and rankings count one completion.'}
            </Text>

            <TouchableOpacity style={s.saveBtn} onPress={saveSelectedTargetOverride}>
              <Text style={s.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== CUSTOM TASBIH MODAL ===== */}
      <Modal visible={showCustomModal} animationType="slide" transparent onRequestClose={() => setShowCustomModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, {
            height: 'auto',
            backgroundColor: isDarkMode ? '#0f1a14' : 'rgba(255,255,255,0.97)',
            borderWidth: 0.5,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          }]}>
            <View style={[s.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.modalTitle, { color: C.text }]}>{t('tasbih.addCustomDhikr')}</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)} style={[s.closeBtn, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>
            <Text style={[s.inputLabel, { color: C.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('tasbih.dhikrText')}</Text>
            <View style={{ borderRadius: 12, overflow: 'hidden', minHeight: 80, marginBottom: 14 }}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={20} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
              <TextInput
                style={[s.input, { backgroundColor: 'transparent', color: C.text, marginBottom: 0 }]}
                value={customText}
                onChangeText={setCustomText}
                placeholder={t('tasbih.enterDhikrText')}
                placeholderTextColor={C.textSec}
                multiline
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            <Text style={[s.inputLabel, { color: C.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('tasbih.target')}</Text>
            <View style={s.stepperRow}>
              <TouchableOpacity
                onPress={() => setCustomTarget(String(Math.max(1, (parseInt(customTarget) || 33) + 1)))}
                style={[s.stepperBtn, { backgroundColor: GREEN + '18' }]}
              >
                <MaterialCommunityIcons name="plus" size={22} color={GREEN} />
              </TouchableOpacity>
              <TextInput
                style={[s.stepperInput, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.16)' : 'rgba(120,120,128,0.16)', color: C.text }]}
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

      {/* ===== MANUAL COUNT MODAL ===== */}
      <Modal visible={showManualModal} animationType="slide" transparent onRequestClose={() => setShowManualModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, {
            height: 'auto',
            backgroundColor: colors.modalSurface,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          }]}>
            <View style={[s.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.modalTitle, { color: C.text }]}>{t('tasbih.logExternal')}</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)} style={[s.closeBtn, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <MaterialCommunityIcons name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <Text style={[s.inputLabel, { color: C.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('tasbih.dhikrText')}</Text>
            <View style={[s.manualDhikrBox, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(6,79,47,0.08)' }]}>
              <Text style={[s.manualDhikrText, { color: C.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>
                {isArabic ? stripTashkeel(selectedTasbih.text) : (selectedTasbih.transliteration || stripTashkeel(selectedTasbih.text))}
              </Text>
            </View>

            <Text style={[s.inputLabel, { color: C.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('tasbih.externalCount')}</Text>
            <TextInput
              style={[s.stepperInput, s.manualInput, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.16)' : 'rgba(120,120,128,0.16)', color: C.text }]}
              value={manualCountInput}
              onChangeText={setManualCountInput}
              placeholder={t('tasbih.externalCountPlaceholder')}
              placeholderTextColor={C.textSec}
              keyboardType="number-pad"
              textAlign={isRTL ? 'right' : 'left'}
              autoFocus
            />

            <View style={[s.manualQuickRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {[33, 100, selectedTasbih.target].filter((value, index, arr) => arr.indexOf(value) === index).map(value => (
                <TouchableOpacity key={value} style={s.manualQuickBtn} onPress={() => setManualCountInput(String(value))}>
                  <Text style={s.manualQuickText}>{String(value)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={addManualTasbihCount}>
              <Text style={s.saveBtnText}>{t('tasbih.addToCounter')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== SETTINGS MODAL ===== */}
      <AppModal
        visible={showSettings}
        onClose={() => { saveSettings(); setShowSettings(false); }}
        title={t('common.settings')}
        position="center"
      >
        <GlassToggle label={t('tasbih.vibration')} icon="cellphone" enabled={vibrationEnabled} onToggle={setVibrationEnabled} />
        <GlassToggle label={t('tasbih.showVirtue')} icon="star-outline" enabled={showVirtue} onToggle={setShowVirtue} />
        <GlassToggle label={t('tasbih.autoAdvance')} icon="arrow-right-circle-outline" enabled={autoAdvance} onToggle={setAutoAdvance} subtitle={t('tasbih.autoAdvanceDesc')} />
        <GlassToggle label={isArabic ? t('tasbih.showTranslation') : t('tasbih.showArabicOriginal')} icon="translate" enabled={showTranslation} onToggle={setShowTranslation} />
        <TouchableOpacity style={[s.saveBtn, { backgroundColor: '#EF4444', marginTop: 12 }]} onPress={() => { handleResetAll(); setShowSettings(false); }}>
          <Text style={s.saveBtnText}>{t('tasbih.resetAll')}</Text>
        </TouchableOpacity>
      </AppModal>

      {/* ===== STATS MODAL ===== */}
      <AppModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        title={t('tasbih.myStats')}
        position="center"
        scroll
        sheetStyle={{ maxHeight: '85%' }}
      >
        <View>
              {/* Summary cards */}
              <View style={s.statsGrid}>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(6,79,47,0.08)' }]}>
                  <MaterialCommunityIcons name="calendar-today" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{String(totalCount)}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>{t('tasbih.todaysCount')}</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(6,79,47,0.08)' }]}>
                  <MaterialCommunityIcons name="sync" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{String(rounds)}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>{t('tasbih.completedRounds')}</Text>
                </View>
              </View>
              <View style={s.statsGrid}>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(6,79,47,0.08)' }]}>
                  <MaterialCommunityIcons name="sigma" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{String(allTimeTotal)}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>{t('tasbih.todayTotal')}</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(6,79,47,0.08)' }]}>
                  <MaterialCommunityIcons name="chart-line" size={28} color={GREEN} />
                  <Text style={[s.statValue, { color: C.text }]}>{String(avgPerDay)}</Text>
                  <Text style={[s.statLabel, { color: C.textSec }]}>{t('tasbih.dailyAverage')}</Text>
                </View>
              </View>

              {/* Today's breakdown by type */}
              {(typeStats[getTodayISO()] || typeStats[new Date().toDateString()]) && Object.keys(typeStats[getTodayISO()] || typeStats[new Date().toDateString()] || {}).length > 0 && (
                <>
                  <Text style={[s.sectionLabel, { color: C.textSec, marginTop: 16, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('tasbih.todayBreakdown')}</Text>
                  {Object.entries(typeStats[getTodayISO()] || typeStats[new Date().toDateString()] || {}).sort((a, b) => b[1] - a[1]).map(([text, cnt]) => (
                    <View key={text} style={[s.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                      <Text style={[s.statsRowVal, { color: GREEN }]}>{String(cnt)}</Text>
                      <Text style={[s.statsRowDate, { color: C.text }]} numberOfLines={1}>{text.length > 30 ? text.slice(0, 28) + '…' : text}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Last 30 days */}
              <Text style={[s.sectionLabel, { color: C.textSec, marginTop: 16, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('tasbih.last30Days')}</Text>
              {Object.entries(dailyStats).slice(-30).reverse().map(([date, cnt]) => {
                const dayTypeStats = typeStats[date];
                return (
                  <View key={date} style={[s.statsRow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', flexDirection: 'column', alignItems: 'stretch' }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[s.statsRowVal, { color: GREEN }]}>{String(cnt)} {t('tasbih.dhikrUnit')}</Text>
                      <Text style={[s.statsRowDate, { color: C.textSec }]}>{date}</Text>
                    </View>
                    {dayTypeStats && Object.keys(dayTypeStats).length > 0 && (
                      <View style={{ marginTop: 8, gap: 4 }}>
                        {Object.entries(dayTypeStats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([text, c]) => (
                          <View key={text} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: colors.fs(11), fontFamily: fontMedium(), color: GREEN, opacity: 0.8 }}>{String(c)}</Text>
                            <Text style={{ fontSize: colors.fs(11), fontFamily: fontRegular(), color: C.textSec }} numberOfLines={1}>{text.length > 25 ? text.slice(0, 23) + '…' : text}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{ height: 20 }} />
        </View>
      </AppModal>
    </BackgroundWrapper>
  );
}

// ============================================
// الأنماط
// ============================================

const _s = StyleSheet.create({
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
    lineHeight: 34, includeFontPadding: false,
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
    flexShrink: 0, maxWidth: SCREEN_WIDTH * 0.45,
  },
  sliderItemText: {
    fontSize: 13, fontFamily: fontSemiBold(),
    lineHeight: 22, includeFontPadding: false,
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
    lineHeight: 22, includeFontPadding: false,
  },
  targetOverrideBtn: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 12,
    marginHorizontal: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: GREEN + '24',
    borderWidth: 1,
    borderColor: GREEN + '55',
  },
  targetOverrideIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
  },
  targetOverrideTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fontBold(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  targetOverrideSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontFamily: fontMedium(),
    lineHeight: 18,
    includeFontPadding: false,
  },
  targetOverrideValue: {
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  targetOverrideValueText: {
    color: GREEN,
    fontSize: 17,
    fontFamily: fontBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  selectedVirtue: {
    fontSize: 12, fontFamily: fontRegular(),
    marginTop: 4, textAlign: 'center',
    lineHeight: 20, includeFontPadding: false,
  },

  // Virtue Card
  virtueContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  virtueCard: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  virtueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  virtueTitle: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  virtueText: {
    fontSize: 14,
    fontFamily: fontRegular(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  virtueSource: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 8,
    opacity: 0.7,
    lineHeight: 18,
    includeFontPadding: false,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 140,
  },

  // Counter area
  counterArea: {
    alignItems: 'center', justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
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
    lineHeight: 24, includeFontPadding: false,
  },
  countDivider: {
    width: 48, height: 2, borderRadius: 1, marginVertical: 4, opacity: 0.5,
  },
  countTarget: {
    fontSize: 18, fontFamily: fontSemiBold(), opacity: 0.6,
    lineHeight: 30, includeFontPadding: false,
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
    lineHeight: 20, includeFontPadding: false,
  },
  tapHint: {
    fontSize: 11, fontFamily: fontRegular(), marginTop: 4, textAlign: 'center' as const,
    lineHeight: 18, includeFontPadding: false,
  },
  externalCountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, marginBottom: 8,
  },
  externalCountBtnText: {
    fontSize: 13, fontFamily: fontSemiBold(), color: '#fff',
    lineHeight: 20, includeFontPadding: false,
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end',
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
    lineHeight: 34, includeFontPadding: false,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  // List items
  sectionLabel: {
    fontSize: 15, fontFamily: fontSemiBold(), marginBottom: 10,
    lineHeight: 26, includeFontPadding: false,
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: 'transparent',
  },
  listItemText: {
    fontSize: 15, fontFamily: fontMedium(), marginBottom: 4,
    lineHeight: 26, includeFontPadding: false,
  },
  listItemMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  listItemTarget: {
    fontSize: 13, fontFamily: fontRegular(),
    lineHeight: 22, includeFontPadding: false,
  },
  listItemVirtue: {
    fontSize: 12, fontFamily: fontRegular(), marginTop: 2,
    lineHeight: 20, includeFontPadding: false,
  },
  gradeBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4,
  },
  gradeBadgeText: {
    fontSize: 10, color: '#0d8e62', fontFamily: fontSemiBold(),
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: GREEN, padding: 14, borderRadius: 14, gap: 8, marginTop: 8,
  },
  addBtnText: {
    fontSize: 15, fontFamily: fontSemiBold(), color: '#fff',
    lineHeight: 26, includeFontPadding: false,
  },

  // Inputs
  inputLabel: {
    fontSize: 15, fontFamily: fontSemiBold(), marginBottom: 6,
    lineHeight: 26, includeFontPadding: false,
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
  manualDhikrBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  manualDhikrText: {
    fontSize: 14,
    fontFamily: fontMedium(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  manualInput: {
    flex: 0,
    width: '100%',
    fontSize: 15,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  manualQuickRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  manualQuickBtn: {
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: GREEN + '18',
  },
  manualQuickText: {
    color: GREEN,
    fontSize: 13,
    fontFamily: fontSemiBold(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  targetOverrideHint: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
    marginBottom: 12,
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
