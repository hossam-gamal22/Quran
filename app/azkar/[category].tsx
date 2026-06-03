// app/azkar/[category].tsx
// صفحة عرض الأذكار حسب الفئة
// ===================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Animated,
  Share,
  Vibration,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';

import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';

import {
  Zikr,
  AzkarCategory,
  AzkarCategoryType,
  Language,
  getAzkarByCategory,
  getDailySunnahDuas,
  getCategoryById,
  getCategoryName,
  getZikrTranslation,
  getZikrBenefit,
  getDailyProgress,
  updateZikrProgress,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  getFavorites,
  onAzkarChange,
  resolveCategoryId,
} from '@/lib/azkar-api';
import { fetchSelectedDuas, getDailySelectedDuas, duaToZikr, subscribeToSelectedDuas } from '@/lib/duas-api';
import { markAzkarCompleted, incrementAzkarZikrCount, getTodayDate, AzkarType } from '@/lib/worship-storage';
import { trackAzkarRead } from '@/lib/firebase-analytics';
import { getUserId } from '@/lib/firebase-user';
import { syncMonthlyEngagementFromLocalWorship } from '@/lib/rewards-manager';
import { t } from '@/lib/i18n';
import { useSettings } from '@/contexts/SettingsContext';
import { useGlobalAudio, type AudioTrack } from '@/contexts/GlobalAudioContext';
import { useCelebration } from '@/contexts/CelebrationContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { InlineMrecAd } from '@/components/ads/InlineMrecAd';
import { IslamicShareCard, type IslamicShareCardHandle } from '@/components/ui/IslamicShareCard';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { transliterateReference } from '@/lib/source-transliteration';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSacredContext } from '@/hooks/use-sacred-context';
import { Spacing } from '@/constants/theme';
import { Image as ExpoImage } from 'expo-image';
import { BasmalaHeader } from '@/components/BasmalaHeader';
import { stripAzkarBrackets } from '@/lib/basmala-utils';
import { getAzkarAudioSource } from '@/lib/azkar-audio-map';
import { getAzkarAudioUri, prefetchAzkarFiles, isAzkarCached, isCacheableAzkarAudio } from '@/lib/azkar-audio-cache';
import NetInfo from '@react-native-community/netinfo';
import { hasQuranRefs } from '@/lib/azkar-quran-refs';
import AzkarQcfVerse from '@/components/AzkarQcfVerse';
import { getListenModeBackgrounds } from '@/constants/pexels-backgrounds';
import { LinearGradient } from 'expo-linear-gradient';
import { showOfflineModal } from '@/components/ui/OfflineBanner';
import { useQuran } from '@/contexts/QuranContext';
import { getAyahAudioUrl } from '@/lib/quran-cache';
import { formatAudioTime } from '@/lib/audio-time';
import { expandQuranAudioMarker, getSurahArabicName } from '@/lib/azkar-quran-audio';
import { expandAudioTracksForRepeat, getEffectiveZikrRepeatCount } from '@/lib/azkar-repeat';
import { areAzkarCountsCompleted, getAzkarCompletionPercentage, getAzkarCompletionRatio } from '@/lib/azkar-progress';
import { getAzkarDisplayParts } from '@/lib/azkar-display';
import { shareAudio } from '@/lib/share-service';
import { detectQuranTitle } from '@/lib/widget-azkar-helpers';

// Map azkar category IDs → worship tracker keys
const WORSHIP_AZKAR_MAP: Partial<Record<AzkarCategoryType, AzkarType>> = {
  '1': 'morning',
  '1b': 'evening',
  '2': 'sleep',
  '3': 'wakeup',
  '27': 'afterPrayer',
  morning: 'morning',
  evening: 'evening',
  sleep: 'sleep',
  wakeup: 'wakeup',
  after_prayer: 'afterPrayer',
};

const { width, height } = Dimensions.get('window');

// Custom dhikr
interface CustomDhikr {
  id: string;
  arabic: string;
  count: number;
  translation?: string;
  createdAt: number;
}

const getCustomDhikrKey = (cat: string) => `@custom_dhikr_${cat}`;
const AUDIO_REPEAT_DELAY_KEY = '@azkar_audio_repeat_delay_seconds';
const DEFAULT_AUDIO_REPEAT_DELAY_SECONDS = 2;

function buildZikrAudioShareName(zikr: Zikr): string {
  const quranTitle = detectQuranTitle(zikr.arabic);
  if (quranTitle) return quranTitle;
  const displayText = getAzkarDisplayParts(zikr).text
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/[«»“”"'()[\]﴾﴿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const words = displayText.split(' ').filter(Boolean).slice(0, 8).join(' ');
  return words || `ذكر ${zikr.id}`;
}

const LISTEN_BACKGROUND_CATEGORY_MAP: Record<string, string> = {
  '1': 'morning',
  '1b': 'evening',
  '2': 'sleep',
  '3': 'wakeup',
  '27': 'after_prayer',
};

// After-prayer subcategory tabs
const AFTER_PRAYER_TABS: Record<string, Record<string, string>> = {
  general: {
    ar: 'عامة', en: 'General', fr: 'Générales', de: 'Allgemein',
    tr: 'Genel', es: 'General', ur: 'عام', id: 'Umum',
    ms: 'Umum', hi: 'सामान्य', bn: 'সাধারণ', ru: 'Общие',
  },
  after_fajr: {
    ar: 'الفجر', en: 'Fajr', fr: 'Fajr', de: 'Fajr',
    tr: 'Sabah', es: 'Fajr', ur: 'فجر',
    id: 'Subuh', ms: 'Subuh', hi: 'फज्र', bn: 'ফজর', ru: 'Фаджр',
  },
  after_maghrib: {
    ar: 'المغرب', en: 'Maghrib', fr: 'Maghrib', de: 'Maghrib',
    tr: 'Ak\u015fam', es: 'Maghrib', ur: 'مغرب',
    id: 'Maghrib', ms: 'Maghrib', hi: 'मगरिब', bn: 'মাগরিব', ru: 'Магриб',
  },
};

// ===================================
// المكون الرئيسي
// ===================================

export default function CategoryAzkarScreen() {
  const isRTL = useIsRTL();
  const { category } = useLocalSearchParams<{ category: AzkarCategoryType }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const { isDarkMode, settings } = useSettings();
  const darkMode = isDarkMode;
  const { showCelebration } = useCelebration();
  const requestedCategory = String(category || '');
  const resolvedCategory = React.useMemo(
    () => resolveCategoryId(requestedCategory),
    [requestedCategory],
  );
  const audioRoute = React.useMemo(
    () => `/azkar/${resolvedCategory}`,
    [resolvedCategory],
  );
  const isSunnahDuasRoute = requestedCategory === 'sunnah_duas';
  const isAfterPrayer = resolvedCategory === '27';
  const isMorningOrEvening = resolvedCategory === '1' || resolvedCategory === '1b';
  const lockCategoryKey = resolvedCategory === '1'
    ? 'morning'
    : resolvedCategory === '1b'
      ? 'evening'
      : resolvedCategory;

  // Block all ads during azkar session
  useSacredContext('azkar_session');

  // الحالة
  const [allAzkar, setAllAzkar] = useState<Zikr[]>([]);
  const [azkar, setAzkar] = useState<Zikr[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<AzkarCategory | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counts, setCounts] = useState<Record<number | string, number>>({});
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const language = (settings.language || 'ar') as Language;
  const isArabic = language === 'ar';
  const [showTranslation, setShowTranslation] = useState(!isArabic || (settings.display.showTranslation ?? false));
  const [showTransliteration, setShowTransliteration] = useState(false);

  // Global audio context — must be before state initializers that reference it
  const globalAudio = useGlobalAudio();

  const [audioPlaying, setAudioPlaying] = useState(() => {
    return globalAudio.state.source === 'azkar' && globalAudio.state.sourceRoute === audioRoute && globalAudio.state.isPlaying;
  });
  const [audioLoading, setAudioLoading] = useState(() => {
    return globalAudio.state.source === 'azkar' && globalAudio.state.sourceRoute === audioRoute && globalAudio.state.isLoading;
  });
  const [audioRepeatDelaySeconds, setAudioRepeatDelaySeconds] = useState(DEFAULT_AUDIO_REPEAT_DELAY_SECONDS);
  const [categoryLocked, setCategoryLocked] = useState(false);
  const [repeatSessionActive, setRepeatSessionActive] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState('general');
  const [loadError, setLoadError] = useState(false);

  // Audio listen-all mode — restore if audio is already playing for this category
  const [listenMode, setListenMode] = useState(() => {
    return globalAudio.state.source === 'azkar' && 
           globalAudio.state.sourceRoute === audioRoute &&
           (globalAudio.state.isPlaying || globalAudio.state.isLoading);
  });

  // Listen mode background photos
  const [listenPhotos, setListenPhotos] = useState<{ url: string; localUri?: string; avgColor?: string }[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const listenImageScale = useRef(new Animated.Value(1)).current;
  const listenImageOpacity = useRef(new Animated.Value(1)).current;

  // View mode: card (one-at-a-time) vs list (all at once)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Expanded items in list mode
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Custom dhikr
  const [customAzkar, setCustomAzkar] = useState<CustomDhikr[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDhikrArabic, setNewDhikrArabic] = useState('');
  const [newDhikrCount, setNewDhikrCount] = useState('33');
  const [newDhikrTranslation, setNewDhikrTranslation] = useState('');

  // Share options
  const [shareTargetZikr, setShareTargetZikr] = useState<Zikr | CustomDhikr | null>(null);
  const brandedRef = useRef<IslamicShareCardHandle>(null);

  // Toast for loop-back
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showIncompleteAlert, setShowIncompleteAlert] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incompleteAlertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countsRef = useRef<Record<number | string, number>>({});
  const visibleAzkarRef = useRef<Zikr[]>([]);
  const currentIndexRef = useRef(0);

  // الأنيميشن
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    countsRef.current = counts;
  }, [counts]);

  useEffect(() => {
    visibleAzkarRef.current = azkar;
  }, [azkar]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (azkar.length === 0) return;
    setCurrentIndex(prev => Math.min(Math.max(prev, 0), azkar.length - 1));
  }, [azkar.length]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (incompleteAlertTimer.current) clearTimeout(incompleteAlertTimer.current);
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(AUDIO_REPEAT_DELAY_KEY)
      .then(value => {
        if (value === null) return;
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          setAudioRepeatDelaySeconds(Math.max(0, Math.min(10, Math.round(parsed))));
        }
      })
      .catch(() => {});
  }, []);

  const triggerFeedback = useCallback((type: 'light' | 'medium' | 'success' = 'light') => {
    if (Platform.OS === 'web') return;
    if (Platform.OS === 'ios') {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.impactAsync(type === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      return;
    }

    if (type === 'success') {
      Vibration.vibrate([0, 100, 50, 100]);
    } else {
      Vibration.vibrate(type === 'medium' ? 30 : 20);
    }
  }, []);

  // ===================================
  // تحميل البيانات
  // ===================================

  const loadData = useCallback(async () => {
    if (!requestedCategory) return;

    try {
      // 1. تحميل الفئة والأذكار أولاً
      const catInfo = getCategoryById(resolvedCategory);

      let categoryAzkar: Zikr[];
      if (isSunnahDuasRoute) {
        // Try Firestore curated duas first, fallback to local
        try {
          const remoteDuas = await fetchSelectedDuas();
          if (remoteDuas.length > 0) {
            const daily = getDailySelectedDuas(remoteDuas, 10);
            categoryAzkar = daily.map(d => duaToZikr(d)) as unknown as Zikr[];
          } else {
            categoryAzkar = getDailySunnahDuas(10);
          }
        } catch {
          categoryAzkar = getDailySunnahDuas(10);
        }
      } else {
        categoryAzkar = getAzkarByCategory(resolvedCategory);
      }

      if (!catInfo || categoryAzkar.length === 0) {
        setLoadError(true);
        return;
      }

      setCategoryInfo(catInfo);

      setAllAzkar(categoryAzkar);

      // For after_prayer, filter by subcategory; otherwise show all
      let visibleAzkar = categoryAzkar;
      if (isAfterPrayer) {
        if (selectedSubcategory === 'general') {
          visibleAzkar = categoryAzkar.filter(z => z.subcategory === 'general' || !z.subcategory);
        } else if (selectedSubcategory === 'after_fajr') {
          visibleAzkar = categoryAzkar.filter(z => z.subcategory === 'after_fajr' || z.subcategory === 'after_fajr_maghrib');
        } else if (selectedSubcategory === 'after_maghrib') {
          visibleAzkar = categoryAzkar.filter(z => z.subcategory === 'after_fajr_maghrib');
        }
      }
      const previousVisible = visibleAzkarRef.current;
      const previousZikrId = previousVisible[currentIndexRef.current]?.id;
      setAzkar(visibleAzkar);
      setCurrentIndex(prev => {
        if (visibleAzkar.length === 0) return 0;
        const preservedIndex = previousZikrId !== undefined
          ? visibleAzkar.findIndex(z => z.id === previousZikrId)
          : -1;
        return preservedIndex >= 0 ? preservedIndex : Math.min(prev, visibleAzkar.length - 1);
      });

      // 2. تحميل الإعدادات (غير حرجة)
      try {
        const [storedShowTranslation, storedShowTransliteration] = 
          await Promise.all([
            AsyncStorage.getItem('azkar_show_translation'),
            AsyncStorage.getItem('azkar_show_transliteration'),
          ]);
        if (storedShowTranslation !== null) setShowTranslation(JSON.parse(storedShowTranslation));
        if (storedShowTransliteration !== null) setShowTransliteration(JSON.parse(storedShowTransliteration));
      } catch { /* settings parse error - use defaults */ }

      // 3. تحميل العدادات والمفضلة (قراءة واحدة بدلاً من حلقة)
      const initialCounts: Record<number, number> = {};
      const initialFavorites: Record<number, boolean> = {};
      try {
        const [favoriteIds, dailyProgress] = await Promise.all([
          getFavorites(),
          getDailyProgress().catch(() => null),
        ]);
        const favoriteSet = new Set(favoriteIds);
        const savedCounts = new Map(
          dailyProgress?.categories?.[resolvedCategory]?.azkarProgress.map(item => [item.zikrId, item.currentCount]) || [],
        );
        for (const zikr of categoryAzkar) {
          const currentSessionCount = countsRef.current[zikr.id];
          initialCounts[zikr.id] = typeof currentSessionCount === 'number'
            ? currentSessionCount
            : (savedCounts.get(zikr.id) || 0);
          initialFavorites[zikr.id] = favoriteSet.has(zikr.id);
        }
      } catch {
        for (const zikr of categoryAzkar) {
          initialCounts[zikr.id] = countsRef.current[zikr.id] || 0;
          initialFavorites[zikr.id] = false;
        }
      }
      countsRef.current = initialCounts;
      setCounts(initialCounts);
      setFavorites(initialFavorites);
      const alreadyCompletedToday = areAzkarCountsCompleted(visibleAzkar, initialCounts);

      // 4. التحقق من حالة القفل (صباح/مساء)
      if (isMorningOrEvening) {
        try {
          const lockKey = `azkar_lock_${lockCategoryKey}`;
          const lockData = await AsyncStorage.getItem(lockKey);
          if (lockData) {
            const { until } = JSON.parse(lockData);
            if (new Date().getTime() < until) {
              setCategoryLocked(!repeatSessionActive);
            } else {
              await AsyncStorage.removeItem(lockKey);
              setCategoryLocked(!repeatSessionActive && alreadyCompletedToday);
            }
          } else {
            setCategoryLocked(!repeatSessionActive && alreadyCompletedToday);
          }
        } catch { /* lock check failed - ignore */ }
      } else {
        setCategoryLocked(!repeatSessionActive && alreadyCompletedToday);
      }

      // 5. تشغيل الأنيميشن
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error loading category data:', error);
      setLoadError(true);
      showOfflineModal();
    }
  }, [
    fadeAnim,
    isAfterPrayer,
    isMorningOrEvening,
    isSunnahDuasRoute,
    lockCategoryKey,
    requestedCategory,
    resolvedCategory,
    repeatSessionActive,
    selectedSubcategory,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-run loadData whenever the admin updates the azkar collection in Firestore
  // (live snapshot subscription is wired in app/_layout.tsx). This keeps the
  // currently-open category in sync without needing the user to navigate away.
  useEffect(() => {
    const unsub = onAzkarChange(() => {
      loadData();
    });
    return unsub;
  }, [loadData]);

  useEffect(() => {
    if (!isSunnahDuasRoute) return undefined;
    return subscribeToSelectedDuas(() => {
      loadData();
    });
  }, [isSunnahDuasRoute, loadData]);

  // ===================================
  // تحميل الأذكار المخصصة
  // ===================================

  const loadCustomAzkar = useCallback(async () => {
    if (!resolvedCategory) return;
    try {
      const stored = await AsyncStorage.getItem(getCustomDhikrKey(resolvedCategory));
      if (stored) setCustomAzkar(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [resolvedCategory]);

  useEffect(() => {
    loadCustomAzkar();
  }, [loadCustomAzkar]);

  const saveCustomAzkar = async (items: CustomDhikr[]) => {
    if (!resolvedCategory) return;
    await AsyncStorage.setItem(getCustomDhikrKey(resolvedCategory), JSON.stringify(items));
    setCustomAzkar(items);
  };

  const addCustomDhikr = async () => {
    const arabic = newDhikrArabic.trim();
    if (!arabic) return;
    const count = parseInt(newDhikrCount, 10) || 1;
    const item: CustomDhikr = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      arabic,
      count,
      translation: newDhikrTranslation.trim() || undefined,
      createdAt: Date.now(),
    };
    const updated = [...customAzkar, item];
    await saveCustomAzkar(updated);
    // Reset & init counter
    setCounts(prev => ({ ...prev, [item.id as any]: 0 }));
    setNewDhikrArabic('');
    setNewDhikrCount('33');
    setNewDhikrTranslation('');
    setShowAddModal(false);
    triggerFeedback('success');
  };

  const deleteCustomDhikr = (id: string) => {
    Alert.alert(
      t('azkar.deleteCustomDhikr'),
      t('azkar.deleteCustomDhikrConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const updated = customAzkar.filter(d => d.id !== id);
            await saveCustomAzkar(updated);
            triggerFeedback('medium');
          },
        },
      ],
    );
  };

  // ===================================
  // تبديل الفئة الفرعية (بعد الصلاة)
  // ===================================

  const handleSubcategoryChange = useCallback((key: string) => {
    setSelectedSubcategory(key);
    let filtered: Zikr[];
    if (key === 'general') {
      filtered = allAzkar.filter(z => z.subcategory === 'general' || !z.subcategory);
    } else if (key === 'after_fajr') {
      filtered = allAzkar.filter(z => z.subcategory === 'after_fajr' || z.subcategory === 'after_fajr_maghrib');
    } else if (key === 'after_maghrib') {
      filtered = allAzkar.filter(z => z.subcategory === 'after_fajr_maghrib');
    } else {
      filtered = allAzkar;
    }
    setAzkar(filtered);
    setCurrentIndex(0);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [allAzkar]);

  // ===================================
  // التعامل مع العداد
  // ===================================

  const handleCategoryCompleted = useCallback(async () => {
    // تسجيل في تتبع العبادات
    if (resolvedCategory && !repeatSessionActive) {
      const worshipKey = WORSHIP_AZKAR_MAP[resolvedCategory];
      if (worshipKey) {
        await markAzkarCompleted(getTodayDate(), worshipKey, 'category');
      }

      // قفل أذكار الصباح والمساء حتى وقت التجديد
      if (isMorningOrEvening) {
        const now = new Date();
        let unlockTime: Date;
        if (resolvedCategory === '1') {
          // يتجدد عند آذان المغرب (تقريباً الساعة 6 مساءً)
          unlockTime = new Date(now);
          unlockTime.setHours(18, 0, 0, 0);
          if (unlockTime.getTime() <= now.getTime()) {
            // لو الوقت بعد المغرب، يتجدد بكرة الفجر
            unlockTime.setDate(unlockTime.getDate() + 1);
            unlockTime.setHours(4, 0, 0, 0);
          }
        } else {
          // أذكار المساء تتجدد عند الفجر (تقريباً الساعة 4 صباحاً)
          unlockTime = new Date(now);
          unlockTime.setDate(unlockTime.getDate() + 1);
          unlockTime.setHours(4, 0, 0, 0);
        }
        const lockKey = `azkar_lock_${lockCategoryKey}`;
        await AsyncStorage.setItem(lockKey, JSON.stringify({ until: unlockTime.getTime() }));
      }
    }

    // عرض بوب أب التحفيز
    showCelebration({
      type: 'adhkar_complete',
      title: t('azkar.completedSuccessfully', { name: categoryInfo ? getCategoryName(categoryInfo, language) : t('azkar.title') }),
      subtitle: repeatSessionActive
        ? (isArabic ? 'تمت القراءة مرة أخرى بدون إضافة نقاط جديدة' : 'Read again without adding new points')
        : t('azkar.mayAllahAccept'),
      onDismiss: () => router.back(),
    });
  }, [categoryInfo, isArabic, isMorningOrEvening, language, lockCategoryKey, repeatSessionActive, resolvedCategory, router, showCelebration]);

  const getZikrRequiredCount = useCallback((zikr: Zikr) => {
    return getEffectiveZikrRepeatCount(zikr);
  }, []);

  const checkAllCompleted = useCallback((updatedCounts: Record<number | string, number>) => {
    return areAzkarCountsCompleted(azkar, updatedCounts);
  }, [azkar]);

  const recordCompletedZikr = useCallback(async (zikr: Zikr) => {
    const today = getTodayDate();
    const zikrKey = `${resolvedCategory || 'azkar'}:${zikr.id}`;
    const didRecord = await incrementAzkarZikrCount(today, zikrKey);

    if (didRecord && resolvedCategory) {
      await trackAzkarRead(zikr.id, resolvedCategory, settings.language).catch(() => {});
    }
    if (didRecord) {
      getUserId()
        .then(userId => (userId ? syncMonthlyEngagementFromLocalWorship(userId) : null))
        .catch(() => {});
    }
  }, [resolvedCategory, settings.language]);

  const recordCompletedCustomDhikr = useCallback(async (item: CustomDhikr) => {
    const didRecord = await incrementAzkarZikrCount(getTodayDate(), `custom:${item.id}`);
    if (didRecord) {
      getUserId()
        .then(userId => (userId ? syncMonthlyEngagementFromLocalWorship(userId) : null))
        .catch(() => {});
    }
  }, []);

  const completeAudioRepeat = useCallback((track: AudioTrack) => {
    if (categoryLocked || track.zikrId === undefined) return;
    const zikr = azkar.find(item => item.id === track.zikrId);
    if (!zikr) return;

    const requiredCount = getZikrRequiredCount(zikr);
    const currentCount = countsRef.current[zikr.id] || 0;
    if (currentCount >= requiredCount) return;

    const newCount = currentCount + 1;
    const updatedCounts = { ...countsRef.current, [zikr.id]: newCount };
    countsRef.current = updatedCounts;
    setCounts(updatedCounts);

    if (resolvedCategory && !repeatSessionActive) {
      updateZikrProgress(resolvedCategory, zikr.id, newCount).catch(() => {});
    }

    if (newCount >= requiredCount) {
      if (!repeatSessionActive) {
        recordCompletedZikr(zikr).catch(() => {});
      }
      if (checkAllCompleted(updatedCounts)) {
        setTimeout(() => handleCategoryCompleted(), 500);
      }
    }
  }, [
    azkar,
    categoryLocked,
    checkAllCompleted,
    getZikrRequiredCount,
    handleCategoryCompleted,
    recordCompletedZikr,
    repeatSessionActive,
    resolvedCategory,
  ]);

  const audioPlaybackOptions = React.useMemo(() => ({
    onTrackComplete: completeAudioRepeat,
    repeatDelayMs: audioRepeatDelaySeconds * 1000,
  }), [audioRepeatDelaySeconds, completeAudioRepeat]);

  const updateAudioRepeatDelay = useCallback((seconds: number) => {
    const next = Math.max(0, Math.min(10, Math.round(seconds)));
    setAudioRepeatDelaySeconds(next);
    AsyncStorage.setItem(AUDIO_REPEAT_DELAY_KEY, String(next)).catch(() => {});
    triggerFeedback('light');
  }, [triggerFeedback]);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
  }, []);

  const scheduleAutoAdvance = useCallback((zikrId: number, indexAtCompletion: number) => {
    clearAutoAdvance();
    autoAdvanceTimer.current = setTimeout(() => {
      const currentVisible = visibleAzkarRef.current;
      const stillOnSameZikr =
        currentIndexRef.current === indexAtCompletion &&
        currentVisible[indexAtCompletion]?.id === zikrId;

      if (!stillOnSameZikr || indexAtCompletion >= currentVisible.length - 1) return;

      setCurrentIndex(indexAtCompletion + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      autoAdvanceTimer.current = null;
    }, 1000);
  }, [clearAutoAdvance]);

  const handleCount = async (zikr: Zikr) => {
    if (categoryLocked) return;
    
    const requiredCount = getZikrRequiredCount(zikr);
    const currentCount = countsRef.current[zikr.id] || 0;
    
    if (currentCount >= requiredCount) {
      // انتهى العداد - انتقل للذكر التالي
      goToNext();
      return;
    }

    const newCount = currentCount + 1;
    
    // تحديث العداد
    const nextCounts = { ...countsRef.current, [zikr.id]: newCount };
    countsRef.current = nextCounts;
    setCounts(nextCounts);
    
    // الاهتزاز
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Vibration.vibrate(30);
    }

    // أنيميشن الضغط
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // تحديث التقدم في AsyncStorage
    if (resolvedCategory && !repeatSessionActive) {
      await updateZikrProgress(resolvedCategory, zikr.id, newCount);
    }

    // إذا اكتمل العداد
    if (newCount >= requiredCount) {
      if (!repeatSessionActive) {
        await recordCompletedZikr(zikr);
      }

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Vibration.vibrate([0, 100, 50, 100]);
      }

      // التحقق من اكتمال جميع الأذكار
      if (checkAllCompleted(nextCounts)) {
        setTimeout(() => handleCategoryCompleted(), 500);
      } else {
        // انتقال تلقائي بعد ثانية، لكن فقط لو المستخدم ما زال على نفس الذكر.
        scheduleAutoAdvance(zikr.id, currentIndexRef.current);
      }
    }
  };

  const handleListCount = useCallback(async (zikr: Zikr) => {
    if (categoryLocked) return;

    const requiredCount = getZikrRequiredCount(zikr);
    const currentCount = countsRef.current[zikr.id] || 0;
    if (currentCount >= requiredCount) return;

    const newCount = currentCount + 1;
    const nextCounts = { ...countsRef.current, [zikr.id]: newCount };
    countsRef.current = nextCounts;
    setCounts(nextCounts);
    triggerFeedback('light');

    if (resolvedCategory && !repeatSessionActive) {
      await updateZikrProgress(resolvedCategory, zikr.id, newCount);
    }

    if (newCount >= requiredCount) {
      if (!repeatSessionActive) {
        await recordCompletedZikr(zikr);
      }
      triggerFeedback('success');

      if (checkAllCompleted(nextCounts)) {
        setTimeout(() => handleCategoryCompleted(), 500);
      }
    }
  }, [
    categoryLocked,
    checkAllCompleted,
    getZikrRequiredCount,
    handleCategoryCompleted,
    recordCompletedZikr,
    repeatSessionActive,
    resolvedCategory,
    triggerFeedback,
  ]);

  const handleCustomDhikrCount = useCallback(async (item: CustomDhikr) => {
    if (categoryLocked) return;

    const currentCount = countsRef.current[item.id] || 0;
    if (currentCount >= item.count) return;

    const newCount = currentCount + 1;
    const nextCounts = { ...countsRef.current, [item.id]: newCount };
    countsRef.current = nextCounts;
    setCounts(nextCounts);
    triggerFeedback(newCount >= item.count ? 'success' : 'light');

    if (newCount >= item.count) {
      await recordCompletedCustomDhikr(item);
    }
  }, [categoryLocked, recordCompletedCustomDhikr, triggerFeedback]);

  // ===================================
  // التنقل
  // ===================================

  const goToNext = () => {
    clearAutoAdvance();
    if (currentIndex < azkar.length - 1) {
      setCurrentIndex(prev => prev + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      if (!checkAllCompleted(countsRef.current)) {
        triggerFeedback('medium');
        setToastMsg(null);
        setShowIncompleteAlert(true);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        if (incompleteAlertTimer.current) clearTimeout(incompleteAlertTimer.current);
        incompleteAlertTimer.current = setTimeout(() => setShowIncompleteAlert(false), 6000);
        return;
      }

      if (!repeatSessionActive) {
        triggerFeedback('medium');
        setCategoryLocked(true);
        return;
      }

      // Loop back to start — بدأت من جديد
      startRepeatReadingSession();
      triggerFeedback('success');
      setToastMsg(t('azkar.startingOver'));
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastMsg(null), 2000);
    }
  };

  const goToPrevious = () => {
    clearAutoAdvance();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const goToFirstIncomplete = useCallback(() => {
    clearAutoAdvance();
    const firstIncompleteIndex = azkar.findIndex((zikr) => {
      const required = getZikrRequiredCount(zikr);
      return (countsRef.current[zikr.id] || 0) < required;
    });

    if (firstIncompleteIndex < 0) {
      setShowIncompleteAlert(false);
      return;
    }

    setViewMode('card');
    setCurrentIndex(firstIncompleteIndex);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    setShowIncompleteAlert(false);
    if (incompleteAlertTimer.current) clearTimeout(incompleteAlertTimer.current);
    triggerFeedback('light');
  }, [azkar, clearAutoAdvance, getZikrRequiredCount, triggerFeedback]);

  const startRepeatReadingSession = useCallback(() => {
    clearAutoAdvance();
    const resetVisibleCounts = azkar.reduce<Record<number | string, number>>(
      (next, zikr) => {
        next[zikr.id] = 0;
        return next;
      },
      { ...countsRef.current },
    );

    countsRef.current = resetVisibleCounts;
    setCounts(resetVisibleCounts);
    setRepeatSessionActive(true);
    setCategoryLocked(false);
    setShowIncompleteAlert(false);
    if (incompleteAlertTimer.current) clearTimeout(incompleteAlertTimer.current);
    setCurrentIndex(0);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    triggerFeedback('light');
  }, [azkar, clearAutoAdvance, triggerFeedback]);

  // ===================================
  // المفضلة
  // ===================================

  const toggleFavorite = async (zikrId: number) => {
    const isCurrentlyFavorite = favorites[zikrId];
    
    if (isCurrentlyFavorite) {
      await removeFromFavorites(zikrId);
    } else {
      await addToFavorites(zikrId);
    }
    
    setFavorites(prev => ({ ...prev, [zikrId]: !isCurrentlyFavorite }));

    triggerFeedback('medium');
  };

  // ===================================
  // المشاركة
  // ===================================

  const openShareOptions = (zikr: Zikr | CustomDhikr) => {
    setShareTargetZikr(zikr);
    triggerFeedback('light');
    const hasShareableAudio =
      !('createdAt' in zikr) &&
      !!zikr.audio &&
      !(zikr.audio.startsWith('quran:') && zikr.audio.split(':')[2]?.includes('-'));
    Alert.alert(
      t('common.share'),
      '',
      [
        { text: t('common.shareText'), onPress: () => shareAsText(zikr) },
        { text: t('common.shareImage'), onPress: () => setTimeout(() => brandedRef.current?.showSizePicker(), 50) },
        ...(hasShareableAudio ? [{ text: t('common.shareAudio'), onPress: () => shareAsAudio(zikr as Zikr) }] : []),
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  const shareAsText = async (zikr: Zikr | CustomDhikr) => {
    try {
      const isCustom = 'createdAt' in zikr;
      const parts: string[] = [zikr.arabic];
      if (!isCustom) {
        const translation = getZikrTranslation(zikr as Zikr, language);
        const stripped = (s: string) => s.replace(/[«»“”"'()\[\]﴾﴿]/g, '').replace(/\s+/g, ' ').trim();
        if (translation && stripped(translation) !== stripped(zikr.arabic)) {
          parts.push(translation);
        }
        const ref = (zikr as Zikr).reference;
        if (ref) parts.push(`📖 ${ref}`);
      } else if ((zikr as CustomDhikr).translation) {
        parts.push((zikr as CustomDhikr).translation as string);
      }
      parts.push(t('azkar.fromApp'));
      await Share.share({ message: parts.join('\n\n') });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const shareAsAudio = async (zikr: Zikr) => {
    try {
      if (!zikr.audio) return;
      if (zikr.audio.startsWith('quran:') && zikr.audio.split(':')[2]?.includes('-')) {
        Alert.alert(t('common.error'), t('common.noAudioFile'));
        return;
      }

      let audioUri = '';
      let fileName = `${buildZikrAudioShareName(zikr)}.m4a`;
      if (zikr.audio.startsWith('quran:')) {
        const queueIdx = audioQueue.findIndex(q => q.zikr.id === zikr.id);
        const startIndex = queueIdx >= 0 ? audioTrackStartByBaseIndex[queueIdx] : undefined;
        const track = startIndex !== undefined ? audioTracks[startIndex] : undefined;
        audioUri = track?.url || '';
        fileName = `${buildZikrAudioShareName(zikr)}.mp3`;
      } else {
        audioUri = await getAzkarAudioUri(zikr.audio);
      }

      if (!audioUri) {
        Alert.alert(t('common.error'), t('common.noAudioFile'));
        return;
      }

      await shareAudio(
        audioUri,
        getAzkarDisplayParts(zikr).text || t('common.share'),
        fileName,
      );
    } catch (error) {
      console.error('Error sharing audio:', error);
      Alert.alert(t('common.error'), t('common.shareError'));
    }
  };

  // Build audio queue from azkar that have audio URLs
  const audioQueue = React.useMemo(() => {
    return azkar
      .map((z, idx) => ({ zikr: z, originalIndex: idx }))
      .filter(item => !!item.zikr.audio);
  }, [azkar]);

  // Prefetch this category's audio files in the background so Listen mode
  // works fully offline on subsequent visits. Safe no-op for already-cached files.
  useEffect(() => {
    if (audioQueue.length === 0) return;
    const filenames = audioQueue
      .map(item => item.zikr.audio)
      .filter((f): f is string => !!f && isCacheableAzkarAudio(f));
    if (filenames.length === 0) return;
    prefetchAzkarFiles(filenames).catch(err =>
      console.warn('[azkar] prefetch failed:', err),
    );
  }, [audioQueue]);

  // Verify audio is playable: online OR all required files already cached.
  // Shows an alert and returns false if offline + uncached.
  const ensureAudioReachable = useCallback(async (filenames: (string | undefined)[]): Promise<boolean> => {
    const needed = filenames.filter(
      (f): f is string => !!f && isCacheableAzkarAudio(f),
    );
    if (needed.length === 0) return true;
    // If any needed file is missing from cache, we require network
    let allCached = true;
    for (const f of needed) {
      if (!(await isAzkarCached(f))) { allCached = false; break; }
    }
    if (allCached) return true;
    // Need network — check connectivity
    const net = await NetInfo.fetch().catch(() => null);
    const online = !!net && net.isConnected !== false && net.isInternetReachable !== false;
    if (online) return true;
    Alert.alert(
      t('azkar.offlineAudioTitle') || 'لا يوجد اتصال بالإنترنت',
      t('azkar.offlineAudioMessage') ||
        'يحتاج تشغيل الأذكار لأول مرة إلى اتصال بالإنترنت لتنزيل ملفات الصوت. بعد التحميل يعمل بدون نت.',
      [{ text: t('common.ok') || 'حسناً' }],
    );
    return false;
  }, []);

  // Build GlobalAudioContext-compatible track list.
  // For "quran:S:A-B" markers, expand into one AudioTrack per ayah using the
  // user's selected Quran reciter; otherwise pass through the legacy m4a flow.
  const { currentReciter } = useQuran();
  const audioTracks: AudioTrack[] = React.useMemo(() => {
    const subtitle = categoryInfo ? getCategoryName(categoryInfo, language) : '';
    const categoryId = String(categoryInfo?.id || resolvedCategory);
    const result: AudioTrack[] = [];
    audioQueue.forEach((item, index) => {
      const audio = item.zikr.audio || '';
      const repeatCount = getZikrRequiredCount(item.zikr);
      if (audio.startsWith('quran:')) {
        // Parse surah for the title; default Arabic surah name.
        const parts = audio.split(':');
        const surahNum = Number(parts[1]) || 0;
        const expanded = expandQuranAudioMarker(
          item.zikr.id,
          audio,
          currentReciter,
          getSurahArabicName(surahNum),
          subtitle,
          categoryId,
        );
        if (expanded.length > 0) {
          result.push(...expandAudioTracksForRepeat(expanded, {
            zikrId: item.zikr.id,
            baseIndex: index,
            repeatCount,
          }));
          return;
        }
        // Fall through to skip (no playable URL)
        return;
      }
      result.push(...expandAudioTracksForRepeat([
        {
          id: String(item.zikr.id),
          title: getAzkarDisplayParts(item.zikr).text || (isSunnahDuasRoute ? t('azkar.duaNumber', { num: String(index + 1) }) : t('azkar.dhikrNumber', { num: String(index + 1) })),
          subtitle,
          url: audio,
          localSource: getAzkarAudioSource(audio) ?? undefined,
          categoryId,
        },
      ], {
        zikrId: item.zikr.id,
        baseIndex: index,
        repeatCount,
      }));
    });
    return result;
  }, [audioQueue, categoryInfo, currentReciter, getZikrRequiredCount, isSunnahDuasRoute, language, resolvedCategory]);

  const audioTrackStartByBaseIndex = React.useMemo(() => {
    const starts: Record<number, number> = {};
    audioTracks.forEach((track, index) => {
      if (track.baseIndex !== undefined && starts[track.baseIndex] === undefined) {
        starts[track.baseIndex] = index;
      }
    });
    return starts;
  }, [audioTracks]);

  // Play a single zikr from its index in the full azkar array
  const handlePlayZikrAudio = useCallback(async (zikr: Zikr) => {
    if (!zikr.audio) return;
    const queueIdx = audioQueue.findIndex(q => q.zikr.id === zikr.id);
    if (queueIdx < 0) return;
    const startIndex = audioTrackStartByBaseIndex[queueIdx];
    if (startIndex === undefined) return;
    const isCurrentAzkarQueuePlaying =
      globalAudio.state.source === 'azkar' &&
      globalAudio.state.sourceRoute === audioRoute;
    const currentTrack = isCurrentAzkarQueuePlaying ? audioTracks[globalAudio.state.queueIndex] : undefined;
    if (isCurrentAzkarQueuePlaying && currentTrack?.baseIndex === queueIdx) {
      await globalAudio.togglePlayPause();
    } else {
      const ok = await ensureAudioReachable([zikr.audio]);
      if (!ok) return;
      await globalAudio.playAzkarQueue(audioTracks, startIndex, audioRoute, audioPlaybackOptions);
      setAudioPlaying(true);
    }
  }, [audioPlaybackOptions, audioQueue, audioRoute, audioTrackStartByBaseIndex, audioTracks, globalAudio, ensureAudioReachable]);

  const hasAudio = audioQueue.length > 0;

  // Derive playback state from global audio context
  const isGlobalAzkarPlaying = globalAudio.state.source === 'azkar' && globalAudio.state.sourceRoute === audioRoute;
  const audioQueueIndex = isGlobalAzkarPlaying ? globalAudio.state.queueIndex : -1;
  const currentAudioTrack = audioQueueIndex >= 0 ? audioTracks[audioQueueIndex] : undefined;
  const currentAudioBaseIndex = currentAudioTrack?.baseIndex ?? (audioQueueIndex >= 0 ? audioQueueIndex : -1);
  const currentAudioQueueItem = currentAudioBaseIndex >= 0 ? audioQueue[currentAudioBaseIndex] : undefined;
  const audioPaused = isGlobalAzkarPlaying && !globalAudio.state.isPlaying && !globalAudio.state.isLoading;
  const audioPosition = isGlobalAzkarPlaying ? globalAudio.state.position : 0;
  const audioDuration = isGlobalAzkarPlaying ? globalAudio.state.duration : 0;
  const playbackSpeed = globalAudio.playbackSpeed;

  // Sync audioPlaying state with global context
  useEffect(() => {
    if (isGlobalAzkarPlaying) {
      setAudioPlaying(globalAudio.state.isPlaying || globalAudio.state.isLoading);
      setAudioLoading(globalAudio.state.isLoading);
    } else if (listenMode && audioPlaying) {
      // Global audio stopped externally — exit listen mode
      setAudioPlaying(false);
      setAudioLoading(false);
      setListenMode(false);
    }
  }, [isGlobalAzkarPlaying, globalAudio.state.isPlaying, globalAudio.state.isLoading]);

  const handleListenAll = useCallback(async () => {
    const isThisAzkarAudioActive =
      globalAudio.state.source === 'azkar' &&
      globalAudio.state.sourceRoute === audioRoute;
    if (isThisAzkarAudioActive && (globalAudio.state.isPlaying || globalAudio.state.isLoading || audioPaused)) {
      // Toggle pause/resume via global context
      await globalAudio.togglePlayPause();
      return;
    }
    // Verify we can actually play (online OR cached)
    const filenames = audioQueue
      .map(item => item.zikr.audio)
      .filter((f): f is string => !!f);
    const ok = await ensureAudioReachable(filenames);
    if (!ok) return;
    // Start from beginning
    setListenMode(true);
    setAudioPlaying(true);
    await globalAudio.playAzkarQueue(audioTracks, 0, audioRoute, audioPlaybackOptions);
  }, [audioPaused, audioPlaybackOptions, audioRoute, audioTracks, audioQueue, globalAudio, ensureAudioReachable]);

  const handleStopListening = useCallback(async () => {
    await globalAudio.stop();
    setAudioPlaying(false);
    setAudioLoading(false);
    setListenMode(false);
  }, [globalAudio]);

  const playLogicalAudioBase = useCallback(async (baseIndex: number) => {
    if (baseIndex < 0 || baseIndex >= audioQueue.length) return;
    const startIndex = audioTrackStartByBaseIndex[baseIndex];
    if (startIndex === undefined) return;
    const ok = await ensureAudioReachable([audioQueue[baseIndex]?.zikr.audio || undefined]);
    if (!ok) return;
    await globalAudio.playAzkarQueue(audioTracks, startIndex, audioRoute, audioPlaybackOptions);
    setAudioPlaying(true);
  }, [
    audioPlaybackOptions,
    audioQueue,
    audioRoute,
    audioTrackStartByBaseIndex,
    audioTracks,
    ensureAudioReachable,
    globalAudio,
  ]);

  const handleNextTrack = useCallback(async () => {
    if (isGlobalAzkarPlaying && currentAudioBaseIndex >= 0) {
      await playLogicalAudioBase(currentAudioBaseIndex + 1);
      return;
    }
    await globalAudio.next();
  }, [currentAudioBaseIndex, globalAudio, isGlobalAzkarPlaying, playLogicalAudioBase]);

  const handlePrevTrack = useCallback(async () => {
    if (isGlobalAzkarPlaying && currentAudioBaseIndex >= 0) {
      await playLogicalAudioBase(currentAudioBaseIndex - 1);
      return;
    }
    await globalAudio.previous();
  }, [currentAudioBaseIndex, globalAudio, isGlobalAzkarPlaying, playLogicalAudioBase]);

  const handleSeek = useCallback(async (value: number) => {
    await globalAudio.seekTo(value);
  }, [globalAudio]);

  const cyclePlaybackSpeed = useCallback(async () => {
    const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIdx = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIdx];
    globalAudio.setPlaybackSpeed(newSpeed);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [playbackSpeed, globalAudio]);

  // Currently playing zikr id for highlighting
  const currentlyPlayingZikrId = currentAudioQueueItem?.zikr.id ?? null;

  useEffect(() => {
    if (!isGlobalAzkarPlaying || !currentAudioQueueItem) return;
    const nextIndex = currentAudioQueueItem.originalIndex;
    if (nextIndex < 0 || nextIndex >= azkar.length || nextIndex === currentIndex) return;

    setCurrentIndex(nextIndex);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });

  }, [
    azkar,
    currentAudioQueueItem,
    currentIndex,
    isGlobalAzkarPlaying,
  ]);

  // Audio continues playing when leaving page — GlobalAudioBar handles it
  // Stop only handled by explicit user action (close button / stop)

  // Use curated backgrounds for listen mode (no live API calls)
  useEffect(() => {
    if (!listenMode || !resolvedCategory) return;
    const photos = getListenModeBackgrounds(
      LISTEN_BACKGROUND_CATEGORY_MAP[resolvedCategory] || requestedCategory || resolvedCategory,
    );
    if (photos.length > 0) {
      setListenPhotos(photos);
    }
  }, [listenMode, requestedCategory, resolvedCategory]);

  // Animate listen mode image — subtle slow zoom
  useEffect(() => {
    if (!listenMode || listenPhotos.length === 0) return;
    const animateImage = () => {
      listenImageScale.setValue(1);
      Animated.timing(listenImageScale, {
        toValue: 1.08,
        duration: 12000,
        useNativeDriver: true,
      }).start();
    };
    animateImage();
    const interval = setInterval(animateImage, 12000);
    return () => clearInterval(interval);
  }, [listenMode, listenPhotos, currentPhotoIndex]);

  // Change photo on track change
  useEffect(() => {
    if (!listenMode || listenPhotos.length === 0) return;
    const newIndex = currentAudioBaseIndex >= 0 ? currentAudioBaseIndex % listenPhotos.length : 0;
    if (newIndex !== currentPhotoIndex) {
      Animated.timing(listenImageOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setCurrentPhotoIndex(newIndex);
        Animated.timing(listenImageOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [currentAudioBaseIndex, listenMode, listenPhotos.length, currentPhotoIndex, listenImageOpacity]);

  // ===================================
  // إعادة تعيين العداد
  // ===================================

  const resetCount = (zikrId: number) => {
    countsRef.current = { ...countsRef.current, [zikrId]: 0 };
    setCounts(prev => ({ ...prev, [zikrId]: 0 }));
    if (resolvedCategory && !repeatSessionActive) {
      updateZikrProgress(resolvedCategory, zikrId, 0);
    }
  };

  const completionRatio = React.useMemo(
    () => getAzkarCompletionRatio(azkar, counts),
    [azkar, counts],
  );

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: completionRatio,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [completionRatio, progressAnim]);

  // ===================================
  // الرندر
  // ===================================

  if (loadError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialCommunityIcons name="wifi-off" size={48} color={darkMode ? '#9CA3AF' : '#6B7280'} />
        <Text style={{ color: darkMode ? '#FFF' : '#000', marginTop: 12, fontSize: 16, fontFamily: fontSemiBold() }}>{t('azkar.noDataSection')}</Text>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, marginTop: 20 }}>
          <TouchableOpacity onPress={() => { setLoadError(false); loadData(); }} style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#22C55E', borderRadius: 20 }}>
            <Text style={{ color: '#FFF', fontSize: 16, fontFamily: fontSemiBold() }}>{t('common.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: darkMode ? '#4B5563' : '#D1D5DB' }}>
            <Text style={{ color: darkMode ? '#FFF' : '#000', fontSize: 16, fontFamily: fontSemiBold() }}>{t('azkar.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!categoryInfo || azkar.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={{ color: darkMode ? '#FFF' : '#000', marginTop: 12 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const safeCurrentIndex = Math.min(Math.max(currentIndex, 0), azkar.length - 1);
  const currentZikr = azkar[safeCurrentIndex];

  if (!currentZikr) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={{ color: darkMode ? '#FFF' : '#000', marginTop: 12 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const currentCount = counts[currentZikr.id] || 0;
  const currentZikrRequiredCount = getZikrRequiredCount(currentZikr);
  const isCompleted = currentCount >= currentZikrRequiredCount;
  const progressPercent = getAzkarCompletionPercentage(azkar, counts);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <BackgroundWrapper
        backgroundKey={settings.display.appBackground}
        backgroundUrl={settings.display.appBackgroundUrl}
        opacity={settings.display.backgroundOpacity ?? 1}
        style={[styles.container, { backgroundColor: settings.display.appBackground !== 'none' ? 'transparent' : (darkMode ? '#111827' : '#F3F4F6') }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { paddingTop: insets.top, backgroundColor: 'rgba(120,120,128,0.15)' }]}
        >
          <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
            </TouchableOpacity>
            
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1, gap: 4 }}>
              <Text style={[styles.headerTitle, { color: darkMode ? '#F9FAFB' : '#1F2937', textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                {isSunnahDuasRoute ? t('azkar.selectedDuas') : getCategoryName(categoryInfo, language)}
              </Text>
              <SectionInfoButton sectionKey="azkar" />
            </View>
            
            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => setViewMode(v => v === 'card' ? 'list' : 'card')}
                style={styles.headerIconButton}
              >
                <MaterialCommunityIcons
                  name={viewMode === 'card' ? 'view-list' : 'card-text'}
                  size={22}
                  color={darkMode ? '#F9FAFB' : '#1F2937'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerIconButton}>
                <MaterialCommunityIcons name="plus-circle-outline" size={22} color={darkMode ? '#F9FAFB' : '#1F2937'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBarContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.progressBarBg, isRTL && { transform: [{ scaleX: -1 }] }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: categoryInfo.color,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
              {progressPercent}%
            </Text>
          </View>

          {/* Read / Listen Mode Toggle — Arabic only (audio is Arabic recordings) */}
          {hasAudio && language === 'ar' && (
            <View style={[styles.modeToggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => { handleStopListening(); setListenMode(false); }}
                style={[
                  styles.modeToggleButton,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  !listenMode && { backgroundColor: categoryInfo.color },
                  listenMode && { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <MaterialCommunityIcons name="book-open-variant" size={16} color={!listenMode ? '#FFFFFF' : (darkMode ? '#D1D5DB' : '#4B5563')} />
                <Text style={[
                  styles.modeToggleText,
                  { color: !listenMode ? '#FFFFFF' : (darkMode ? '#D1D5DB' : '#4B5563') },
                ]}>
                  {t('azkar.reading')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setListenMode(true); if (!audioPlaying) handleListenAll(); }}
                style={[
                  styles.modeToggleButton,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  listenMode && { backgroundColor: categoryInfo.color },
                  !listenMode && { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <MaterialCommunityIcons name="headphones" size={16} color={listenMode ? '#FFFFFF' : (darkMode ? '#D1D5DB' : '#4B5563')} />
                <Text style={[
                  styles.modeToggleText,
                  { color: listenMode ? '#FFFFFF' : (darkMode ? '#D1D5DB' : '#4B5563') },
                ]}>
                  {t('azkar.listening')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* تبويبات فرعية لأذكار بعد الصلاة */}
        {!listenMode && isAfterPrayer && (
          <NativeTabs
            tabs={Object.keys(AFTER_PRAYER_TABS).map(key => ({
              key,
              label: AFTER_PRAYER_TABS[key][language] || AFTER_PRAYER_TABS[key].ar,
            }))}
            selected={selectedSubcategory}
            onSelect={handleSubcategoryChange}
            indicatorColor={categoryInfo?.color}
            style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 4 }}
          />
        )}

        {/* المحتوى */}
        {listenMode && hasAudio ? (
          /* === Listen Mode: Spotify-style Player === */
          <View style={{ flex: 1, backgroundColor: darkMode ? '#0a0a0a' : '#f0f0f0' }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom + 16, 80) }}
              showsVerticalScrollIndicator={false}
            >
              {/* Album Art */}
              <View style={{
                alignItems: 'center',
                paddingTop: 16,
                paddingHorizontal: 32,
              }}>
                <View style={{
                  width: width - 64,
                  height: width - 64,
                  borderRadius: 16,
                  overflow: 'hidden',
                  backgroundColor: darkMode ? '#1a1a1a' : '#e0e0e0',
                  elevation: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                }}>
                  {listenPhotos.length > 0 ? (
                    <Animated.View style={{
                      width: '100%',
                      height: '100%',
                      transform: [{ scale: listenImageScale }],
                      opacity: listenImageOpacity,
                    }}>
                      <ExpoImage
                        source={{ uri: listenPhotos[currentPhotoIndex]?.url }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={500}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.4)']}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' }}
                      />
                    </Animated.View>
                  ) : (
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: categoryInfo.color + '30',
                    }}>
                      <MaterialCommunityIcons
                        name="headphones"
                        size={80}
                        color={categoryInfo.color}
                      />
                    </View>
                  )}
                </View>
              </View>

              {/* Track Info */}
              <View style={{ paddingHorizontal: 32, paddingTop: 24 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontFamily: fontBold(),
                    color: darkMode ? '#F9FAFB' : '#1F2937',
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                    lineHeight: 34,
                  }}
                >
                  {currentAudioQueueItem
                    ? (getAzkarDisplayParts(currentAudioQueueItem.zikr).text || getCategoryName(categoryInfo, language))
                    : getCategoryName(categoryInfo, language)}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: fontSemiBold(),
                    color: categoryInfo.color,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                    marginTop: 4,
                  }}
                >
                  {getCategoryName(categoryInfo, language)}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: fontRegular(),
                    color: darkMode ? '#9CA3AF' : '#6B7280',
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                    marginTop: 2,
                  }}
                >
                  {currentAudioBaseIndex >= 0 ? currentAudioBaseIndex + 1 : 0} / {audioQueue.length}
                  {currentAudioTrack?.repeatTotal && currentAudioTrack.repeatTotal > 1
                    ? ` • ${t('azkar.repeatProgress', {
                        current: String(currentAudioTrack.repeatIndex || 1),
                        total: String(currentAudioTrack.repeatTotal),
                      })}`
                    : ''}
                </Text>
              </View>

              {/* Seek Slider */}
              <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
                <Slider
                  style={{ width: '100%', height: 28 }}
                  value={audioDuration > 0 ? audioPosition / audioDuration : 0}
                  minimumValue={0}
                  maximumValue={1}
                  minimumTrackTintColor={categoryInfo.color}
                  maximumTrackTintColor={darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                  thumbTintColor={categoryInfo.color}
                  onSlidingComplete={(val) => handleSeek(val * audioDuration)}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 12, fontFamily: fontRegular(), color: darkMode ? '#9CA3AF' : '#6B7280', fontVariant: ['tabular-nums'] }}>
                    {formatAudioTime(audioPosition)}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: fontRegular(), color: darkMode ? '#9CA3AF' : '#6B7280', fontVariant: ['tabular-nums'] }}>
                    {formatAudioTime(audioDuration)}
                  </Text>
                </View>
              </View>

              {/* Repeat delay */}
              <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 13, fontFamily: fontSemiBold(), color: darkMode ? '#D1D5DB' : '#4B5563', textAlign: isRTL ? 'right' : 'left' }}>
                    {t('azkar.repeatDelay')}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: fontSemiBold(), color: categoryInfo.color, fontVariant: ['tabular-nums'] }}>
                    {t('azkar.repeatDelaySeconds', { seconds: String(audioRepeatDelaySeconds) })}
                  </Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 28 }}
                  value={audioRepeatDelaySeconds}
                  minimumValue={0}
                  maximumValue={10}
                  step={1}
                  minimumTrackTintColor={categoryInfo.color}
                  maximumTrackTintColor={darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                  thumbTintColor={categoryInfo.color}
                  onSlidingComplete={updateAudioRepeatDelay}
                />
              </View>

              {/* Controls */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: Spacing.lg,
                paddingTop: 8,
                paddingHorizontal: 32,
              }}>
                {/* Speed */}
                <TouchableOpacity
                  onPress={cyclePlaybackSpeed}
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: categoryInfo.color + '40',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: categoryInfo.color, fontVariant: ['tabular-nums'] }}>
                    {playbackSpeed}x
                  </Text>
                </TouchableOpacity>

                {/* Previous */}
                <TouchableOpacity
                  onPress={handlePrevTrack}
                  disabled={currentAudioBaseIndex <= 0}
                  style={{ opacity: currentAudioBaseIndex <= 0 ? 0.3 : 1, padding: 8 }}
                >
                  <MaterialCommunityIcons name="skip-previous" size={36} color={darkMode ? '#E5E7EB' : '#374151'} />
                </TouchableOpacity>

                {/* Play / Pause */}
                <TouchableOpacity
                  onPress={handleListenAll}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: categoryInfo.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    elevation: 4,
                    shadowColor: categoryInfo.color,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  }}
                >
                  {audioLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialCommunityIcons
                      name={audioPlaying && !audioPaused ? 'pause' : 'play'}
                      size={32}
                      color="#fff"
                    />
                  )}
                </TouchableOpacity>

                {/* Next */}
                <TouchableOpacity
                  onPress={handleNextTrack}
                  disabled={currentAudioBaseIndex >= audioQueue.length - 1}
                  style={{ opacity: currentAudioBaseIndex >= audioQueue.length - 1 ? 0.3 : 1, padding: 8 }}
                >
                  <MaterialCommunityIcons name="skip-next" size={36} color={darkMode ? '#E5E7EB' : '#374151'} />
                </TouchableOpacity>

                {/* Close */}
                <TouchableOpacity
                  onPress={handleStopListening}
                  style={{ padding: 8 }}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={28} color={darkMode ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
              </View>

              {/* Track list below */}
              <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 }}>
                <Text style={{
                  fontSize: 16,
                  fontFamily: fontBold(),
                  color: darkMode ? '#E5E7EB' : '#374151',
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                  marginBottom: 10,
                  paddingHorizontal: 4,
                }}>
                  {t('azkar.playlist')}
                </Text>
                {audioQueue.map((item, index) => {
                  const isCurrentTrack = index === currentAudioBaseIndex;
                  return (
                    <TouchableOpacity
                      key={item.zikr.id}
                      onPress={async () => {
                        const startIndex = audioTrackStartByBaseIndex[index];
                        if (startIndex === undefined) return;
                        const ok = await ensureAudioReachable([item.zikr.audio || undefined]);
                        if (!ok) return;
                        await globalAudio.playAzkarQueue(audioTracks, startIndex, audioRoute, audioPlaybackOptions);
                        setAudioPlaying(true);
                      }}
                      style={{
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        gap: Spacing.md,
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: isCurrentTrack
                          ? (darkMode ? categoryInfo.color + '20' : categoryInfo.color + '15')
                          : 'transparent',
                        marginBottom: 2,
                      }}
                    >
                      <View style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isCurrentTrack ? categoryInfo.color : (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                      }}>
                        {isCurrentTrack && audioPlaying && !audioPaused ? (
                          <MaterialCommunityIcons name="volume-high" size={14} color="#fff" />
                        ) : (
                          <Text style={{
                            fontSize: 12,
                            fontFamily: fontBold(),
                            color: isCurrentTrack ? '#fff' : (darkMode ? '#9CA3AF' : '#6B7280'),
                          }}>
                            {index + 1}
                          </Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily: isCurrentTrack ? fontBold() : fontRegular(),
                            color: isCurrentTrack ? categoryInfo.color : (darkMode ? '#E5E7EB' : '#374151'),
                            textAlign: isRTL ? 'right' : 'left',
                            writingDirection: 'rtl',
                            lineHeight: 24,
                          }}
                          numberOfLines={1}
                        >
                          {getAzkarDisplayParts(item.zikr).text || (isSunnahDuasRoute ? t('azkar.duaNumber', { num: String(index + 1) }) : t('azkar.dhikrNumber', { num: String(index + 1) }))}
                        </Text>
                      </View>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isCurrentTrack ? categoryInfo.color : (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                      }}>
                        <MaterialCommunityIcons name="music-note" size={16} color={isCurrentTrack ? '#fff' : (darkMode ? '#9CA3AF' : '#6B7280')} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : viewMode === 'card' ? (
          /* === Card Mode (original one-at-a-time view) === */
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                style={[
                  styles.zikrCardAnimated,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                  <GlassCard intensity={46} style={styles.zikrCardGlass}>
                    {/* أزرار الإجراءات */}
                    <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {hasAudio && !!currentZikr.audio && language === 'ar' && (
                        <TouchableOpacity
                          onPress={() => handlePlayZikrAudio(currentZikr)}
                          style={styles.actionButton}
                        >
                          <MaterialCommunityIcons
                            name={isGlobalAzkarPlaying && currentlyPlayingZikrId === currentZikr.id && audioPlaying && !audioPaused ? 'volume-high' : 'volume-medium'}
                            size={22}
                            color={isGlobalAzkarPlaying && currentlyPlayingZikrId === currentZikr.id && audioPlaying && !audioPaused ? categoryInfo.color : (darkMode ? '#9CA3AF' : '#6B7280')}
                          />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => toggleFavorite(currentZikr.id)}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons
                          name={favorites[currentZikr.id] ? 'heart' : 'heart-outline'}
                          size={24}
                          color={favorites[currentZikr.id] ? '#EF4444' : (darkMode ? '#9CA3AF' : '#6B7280')}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => openShareOptions(currentZikr)}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons
                          name="share-variant"
                          size={22}
                          color={darkMode ? '#9CA3AF' : '#6B7280'}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => resetCount(currentZikr.id)}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons
                          name="refresh"
                          size={22}
                          color={darkMode ? '#9CA3AF' : '#6B7280'}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* النص الرئيسي */}
                    {/* Main dhikr text: Arabic for Arabic users, translation for others */}
                    {/* Use QCF Mushaf font for mapped Quran verses, KFGQPCUthmanic fallback for others */}
                    {(() => {
                      const display = getAzkarDisplayParts(currentZikr);
                      const quranFontStyle = display.useFallbackQuranFont ? {
                        fontFamily: 'KFGQPCUthmanic',
                        fontSize: 30,
                        lineHeight: 62,
                        letterSpacing: 0,
                        textAlign: 'center' as const,
                        writingDirection: 'rtl' as const,
                        paddingTop: 6,
                        paddingBottom: 4,
                      } : {};
                      return (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onLongPress={() => {
                            if (hasAudio && currentZikr.audio && language === 'ar') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              handlePlayZikrAudio(currentZikr);
                            }
                          }}
                          delayLongPress={400}
                        >
                          {display.hadBasmala && !display.useQcf && (
                            <BasmalaHeader tintColor={darkMode ? '#D4A574' : '#C9A84C'} />
                          )}
                          {display.useQcf && isArabic ? (
                            <AzkarQcfVerse
                              azkarId={currentZikr.id}
                              textColor={isGlobalAzkarPlaying && audioPlaying && !audioPaused && currentlyPlayingZikrId === currentZikr.id ? categoryInfo.color : (darkMode ? '#F9FAFB' : '#1F2937')}
                              fallbackText={display.text || currentZikr.arabic}
                            />
                          ) : isArabic ? (
                            <Text style={[
                              styles.arabicText,
                              { color: darkMode ? '#F9FAFB' : '#1F2937' },
                              isGlobalAzkarPlaying && audioPlaying && !audioPaused && currentlyPlayingZikrId === currentZikr.id && { color: categoryInfo.color },
                              quranFontStyle,
                            ]}>
                              {display.text}
                            </Text>
                          ) : (
                            <Text style={[
                              styles.arabicText,
                              { color: darkMode ? '#F9FAFB' : '#1F2937', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                              isGlobalAzkarPlaying && audioPlaying && !audioPaused && currentlyPlayingZikrId === currentZikr.id && { color: categoryInfo.color },
                              quranFontStyle,
                            ]}>
                              {getZikrTranslation(currentZikr, language)}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })()}

                    {/* النطق — never auto-shown when the user's interface is
                        Arabic; they must explicitly opt in via showTransliteration. */}
                    {(!isArabic || showTransliteration) && showTransliteration && currentZikr.transliteration && (
                      <Text style={[styles.transliteration, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                        {currentZikr.transliteration}
                      </Text>
                    )}

                    {/* الترجمة — فقط للعربية مع التبديل */}
                    {isArabic && showTranslation && (
                      <Text style={[styles.translation, { color: darkMode ? '#D1D5DB' : '#4B5563', writingDirection: 'ltr', textAlign: 'left' }]}>
                        {getZikrTranslation(currentZikr, 'en' as Language)}
                      </Text>
                    )}

                    {/* الفضل — benefit text */}
                    {currentZikr.benefit && (
                      <View style={styles.benefitStarWrapper}>
                        <View style={[styles.benefitStarCircle, { backgroundColor: categoryInfo.color + '15' }]}>
                          <MaterialCommunityIcons name="star" size={16} color={categoryInfo.color} />
                        </View>
                        <View style={[styles.benefitContainer, { backgroundColor: categoryInfo.color + '15' }]}>
                          <Text style={[styles.benefitText, { color: categoryInfo.color, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                            {getZikrBenefit(currentZikr, language) || ''}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* المرجع — source reference */}
                    {(currentZikr as Zikr).reference && (
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 }}>
                        <MaterialCommunityIcons name="book-open-page-variant" size={13} color={darkMode ? '#9CA3AF' : '#6B7280'} />
                        <Text style={{ color: darkMode ? '#9CA3AF' : '#6B7280', fontSize: 13, lineHeight: 18 }}>
                          {transliterateReference((currentZikr as Zikr).reference, language)}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.watermarkHidden}>روح المسلم</Text>
                  </GlassCard>
              </Animated.View>

              {/* Custom dhikr after main ones (scroll below current card if at end) */}
              {safeCurrentIndex === azkar.length - 1 && customAzkar.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.customSectionTitle, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                    {t('azkar.customAdhkar')}
                  </Text>
                  {customAzkar.map((cd) => {
                    const cdCount = counts[cd.id as any] || 0;
                    const cdDone = cdCount >= cd.count;
                    return (
                      <TouchableOpacity
                        key={cd.id}
                        onPress={() => {
                          handleCustomDhikrCount(cd).catch(() => {});
                        }}
                        onLongPress={() => deleteCustomDhikr(cd.id)}
                        activeOpacity={0.8}
                      >
                        <GlassCard intensity={40} style={[styles.zikrCardGlass, { marginBottom: 12 }]}>
                          {/* Show Arabic for Arabic users, translation for others */}
                          {isArabic ? (
                            <Text style={[styles.arabicText, { color: darkMode ? '#F9FAFB' : '#1F2937', fontSize: 20 }]}>
                              {cd.arabic}
                            </Text>
                          ) : (
                            <Text style={[styles.arabicText, { color: darkMode ? '#F9FAFB' : '#1F2937', fontSize: 20, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                              {cd.translation || cd.arabic}
                            </Text>
                          )}
                          {/* Show translation for Arabic users if enabled */}
                          {isArabic && showTranslation && cd.translation && (
                            <Text style={[styles.translation, { color: darkMode ? '#D1D5DB' : '#4B5563', writingDirection: 'ltr', textAlign: 'left' }]}>
                              {cd.translation}
                            </Text>
                          )}
                          <View style={[styles.customCountBadge, { backgroundColor: cdDone ? '#10B981' : categoryInfo.color }]}>
                            <Text style={styles.customCountText}>{cdDone ? '✓' : cdCount} / {cd.count}</Text>
                          </View>
                        </GlassCard>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* شريط العداد والتنقل */}
            <View style={[styles.bottomBar, { backgroundColor: 'rgba(120,120,128,0.12)', flexDirection: isRTL ? 'row-reverse' : 'row', paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                onPress={goToPrevious}
                disabled={safeCurrentIndex === 0}
                style={[styles.navButton, safeCurrentIndex === 0 && styles.navButtonDisabled]}
              >
                <MaterialCommunityIcons
                  name={isRTL ? 'chevron-right' : 'chevron-left'}
                  size={28}
                  color={safeCurrentIndex === 0 ? '#9CA3AF' : categoryInfo.color}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleCount(currentZikr)}
                style={[
                  styles.counterButton,
                  { backgroundColor: isCompleted ? '#10B981' : categoryInfo.color },
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.counterText}>
                  {isCompleted ? '✓' : `${currentCount}/${currentZikrRequiredCount}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goToNext}
                style={styles.navButton}
              >
                <MaterialCommunityIcons
                  name={isRTL ? 'chevron-left' : 'chevron-right'}
                  size={28}
                  color={categoryInfo.color}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* === List Mode (expandable/collapsible) === */
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {azkar.map((zikr, idx) => {
              const zCount = counts[zikr.id] || 0;
              const zRequiredCount = getZikrRequiredCount(zikr);
              const zDone = zCount >= zRequiredCount;
              const isExpanded = expandedItems.has(zikr.id);
              const listDisplay = getAzkarDisplayParts(zikr);
              return (
                <View key={zikr.id} style={{ marginBottom: 10 }}>
                  {listDisplay.hadBasmala && !listDisplay.useQcf && (
                    <BasmalaHeader tintColor={darkMode ? '#D4A574' : '#C9A84C'} style={{ marginBottom: 4 }} />
                  )}
                  <GlassCard intensity={40} style={[
                    styles.zikrCardGlass,
                    { padding: 0 },
                    isGlobalAzkarPlaying && audioPlaying && !audioPaused && currentlyPlayingZikrId === zikr.id && { borderWidth: 1.5, borderColor: categoryInfo.color },
                  ]}>
                    {/* Collapsed header — always visible */}
                    <TouchableOpacity
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setExpandedItems(prev => {
                          const next = new Set(prev);
                          if (next.has(zikr.id)) next.delete(zikr.id);
                          else next.add(zikr.id);
                          return next;
                        });
                      }}
                      activeOpacity={0.7}
                      style={[styles.listCollapseHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    >
                      <View style={[styles.listItemBadge, { backgroundColor: categoryInfo.color + '20', position: 'relative', top: 0, left: 0 }]}>
                        <Text style={[styles.listItemBadgeText, { color: categoryInfo.color }]}>{idx + 1}</Text>
                      </View>
                      <Text
                        style={[
                          styles.arabicText,
                          { color: darkMode ? '#F9FAFB' : '#1F2937', fontSize: 18, marginBottom: 0, flex: 1, textAlign: isArabic ? 'right' : (isRTL ? 'right' : 'left'), writingDirection: isArabic ? 'rtl' : (isRTL ? 'rtl' : 'ltr') },
                          isGlobalAzkarPlaying && audioPlaying && !audioPaused && currentlyPlayingZikrId === zikr.id && { color: categoryInfo.color },
                          listDisplay.useFallbackQuranFont && { fontFamily: 'KFGQPCUthmanic', fontSize: 22, lineHeight: 44 },
                        ]}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {isArabic ? listDisplay.text : getZikrTranslation(zikr, language)}
                      </Text>
                      <View style={[styles.listCollapseRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.listMiniCount, { backgroundColor: zDone ? '#10B981' : categoryInfo.color }]}>
                          <Text style={styles.listMiniCountText}>{zDone ? '✓' : `${zCount}/${zRequiredCount}`}</Text>
                        </View>
                        <MaterialCommunityIcons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={22}
                          color={darkMode ? '#9CA3AF' : '#6B7280'}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Expanded content */}
                    {isExpanded && (
                      <View style={styles.listExpandedContent}>
                        {/* Action row */}
                        <View style={[styles.actionButtons, { marginBottom: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <TouchableOpacity onPress={() => toggleFavorite(zikr.id)} style={styles.actionButton}>
                            <MaterialCommunityIcons
                              name={favorites[zikr.id] ? 'heart' : 'heart-outline'}
                              size={20}
                              color={favorites[zikr.id] ? '#EF4444' : (darkMode ? '#9CA3AF' : '#6B7280')}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => openShareOptions(zikr)} style={styles.actionButton}>
                            <MaterialCommunityIcons name="share-variant" size={18} color={darkMode ? '#9CA3AF' : '#6B7280'} />
                          </TouchableOpacity>
                        </View>

                        {/* Translation: for Arabic users — toggle English */}
                        {isArabic && showTranslation && (
                          <Text style={[styles.translation, { color: darkMode ? '#D1D5DB' : '#4B5563', fontSize: 14, writingDirection: 'ltr', textAlign: 'left' }]}>
                            {getZikrTranslation(zikr, 'en' as Language)}
                          </Text>
                        )}

                        {zikr.benefit && (
                          <View style={[styles.listBenefitBox, { backgroundColor: categoryInfo.color + '12', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <MaterialCommunityIcons name="star" size={14} color={categoryInfo.color} />
                            <Text style={[styles.benefitText, { color: categoryInfo.color, fontSize: 13, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                              {getZikrBenefit(zikr, language) || ''}
                            </Text>
                          </View>
                        )}

                        {/* المرجع — source reference */}
                        {zikr.reference && (
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 }}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={12} color={darkMode ? '#9CA3AF' : '#6B7280'} />
                            <Text style={{ color: darkMode ? '#9CA3AF' : '#6B7280', fontSize: 12, lineHeight: 16 }}>
                              {transliterateReference(zikr.reference, language)}
                            </Text>
                          </View>
                        )}

                        {/* Counter button */}
                        <TouchableOpacity
                          onPress={() => {
                            handleListCount(zikr).catch(() => {});
                          }}
                          style={[styles.listCounterButton, { backgroundColor: zDone ? '#10B981' : categoryInfo.color }]}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.listCounterText}>{zDone ? '✓' : `${zCount}/${zRequiredCount}`}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </GlassCard>
                  {/* Inline MREC ad: after every 7 adhkar (and not last item) */}
                  {(idx + 1) % 7 === 0 && idx < azkar.length - 1 && (
                    <InlineMrecAd screen="azkar" darkMode={darkMode} />
                  )}
                </View>
              );
            })}

            {/* Custom dhikr in list mode */}
            {customAzkar.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.customSectionTitle, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                  {t('azkar.customAdhkar')}
                </Text>
                {customAzkar.map((cd) => {
                  const cdCount = counts[cd.id as any] || 0;
                  const cdDone = cdCount >= cd.count;
                  return (
                    <TouchableOpacity
                      key={cd.id}
                      onPress={() => {
                        handleCustomDhikrCount(cd).catch(() => {});
                      }}
                      onLongPress={() => deleteCustomDhikr(cd.id)}
                      activeOpacity={0.8}
                      style={{ marginBottom: 12 }}
                    >
                      <GlassCard intensity={40} style={styles.zikrCardGlass}>
                        {/* Show Arabic for Arabic users, translation for others */}
                        {isArabic ? (
                          <Text style={[styles.arabicText, { color: darkMode ? '#F9FAFB' : '#1F2937', fontSize: 20 }]}>
                            {cd.arabic}
                          </Text>
                        ) : (
                          <Text style={[styles.arabicText, { color: darkMode ? '#F9FAFB' : '#1F2937', fontSize: 20, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                            {cd.translation || cd.arabic}
                          </Text>
                        )}
                        {isArabic && showTranslation && cd.translation && (
                          <Text style={[styles.translation, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                            {cd.translation}
                          </Text>
                        )}
                        <View style={[styles.customCountBadge, { backgroundColor: cdDone ? '#10B981' : categoryInfo.color }]}>
                          <Text style={styles.customCountText}>{cdDone ? '✓' : cdCount} / {cd.count}</Text>
                        </View>
                      </GlassCard>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* مساحة آمنة */}
        <BannerAdComponent screen="azkar" />
      </BackgroundWrapper>

      {/* Toast overlay for loop-back */}
      {toastMsg && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={[styles.toastBox, { backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.7)' }]}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        </View>
      )}

      {showIncompleteAlert && (
        <View style={styles.incompleteAlertContainer} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={goToFirstIncomplete}
            style={[
              styles.incompleteAlertBox,
              {
                backgroundColor: darkMode ? 'rgba(69, 45, 16, 0.96)' : 'rgba(255, 247, 237, 0.98)',
                borderColor: categoryInfo.color,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={[styles.incompleteAlertIcon, { backgroundColor: categoryInfo.color }]}>
              <MaterialCommunityIcons name="alert" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.incompleteAlertContent}>
              <Text
                style={[
                  styles.incompleteAlertTitle,
                  {
                    color: darkMode ? '#FFFFFF' : '#7C2D12',
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {isArabic ? 'لم تكتمل الأذكار بعد' : 'Adhkar are not complete yet'}
              </Text>
              <Text
                style={[
                  styles.incompleteAlertText,
                  {
                    color: darkMode ? '#FED7AA' : '#9A3412',
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {isArabic ? 'اضغط هنا للرجوع لأول ذكر غير مكتمل' : 'Tap to return to the first incomplete dhikr'}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-left' : 'chevron-right'}
              size={22}
              color={darkMode ? '#FED7AA' : '#9A3412'}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* بوب أب القفل */}
      {categoryLocked && (
        <Modal visible={categoryLocked} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: darkMode ? '#0f1a14' : '#FFFFFF' }]}>
              <MaterialCommunityIcons name="check-decagram" size={46} color={categoryInfo?.color || '#10B981'} />
              <Text style={[styles.modalTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                {isArabic ? 'قرأت أذكار اليوم' : 'Today\'s adhkar are done'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                {isArabic
                  ? 'يمكنك قراءتها مرة أخرى للذكر والطمأنينة، لكن القراءة الإضافية لن تُحسب في النقاط أو الترتيب.'
                  : 'You can read them again for remembrance, but this extra reading will not count toward points or ranking.'}
              </Text>
              <Text style={[styles.modalDua, { color: categoryInfo?.color || '#10B981' }]}>
                {isArabic ? 'هل تريد البدء من جديد؟' : 'Start again anyway?'}
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: categoryInfo?.color || '#10B981' }]}
                onPress={startRepeatReadingSession}
              >
                <Text style={styles.modalButtonText}>{isArabic ? 'قراءة مرة أخرى' : 'Read again'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: darkMode ? '#374151' : '#E5E7EB', marginTop: 10 }]}
                onPress={() => router.back()}
              >
                <Text style={[styles.modalButtonText, { color: darkMode ? '#F9FAFB' : '#374151' }]}>
                  {isArabic ? 'رجوع' : 'Go back'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* بوب أب إضافة ذكر مخصص */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: darkMode ? '#0f1a14' : '#FFFFFF', width: '100%' }]}>
            <Text style={[styles.modalTitle, { color: darkMode ? '#F9FAFB' : '#1F2937', marginBottom: 20 }]}>
              {t('azkar.addCustomDhikr')}
            </Text>

            <TextInput
              style={[styles.modalInput, {
                color: darkMode ? '#F9FAFB' : '#1F2937',
                backgroundColor: darkMode ? '#374151' : '#F3F4F6',
                textAlign: 'right',
              }]}
              placeholder={t('azkar.arabicTextRequired')}
              placeholderTextColor={darkMode ? '#6B7280' : '#9CA3AF'}
              value={newDhikrArabic}
              onChangeText={setNewDhikrArabic}
              multiline
            />

            <TextInput
              style={[styles.modalInput, {
                color: darkMode ? '#F9FAFB' : '#1F2937',
                backgroundColor: darkMode ? '#374151' : '#F3F4F6',
                textAlign: 'center',
              }]}
              placeholder={t('azkar.repeatCount')}
              placeholderTextColor={darkMode ? '#6B7280' : '#9CA3AF'}
              value={newDhikrCount}
              onChangeText={setNewDhikrCount}
              keyboardType="number-pad"
            />

            <TextInput
              style={[styles.modalInput, {
                color: darkMode ? '#F9FAFB' : '#1F2937',
                backgroundColor: darkMode ? '#374151' : '#F3F4F6',
                textAlign: isRTL ? 'right' : 'left',
              }]}
              placeholder={t('azkar.translationOptional')}
              placeholderTextColor={darkMode ? '#6B7280' : '#9CA3AF'}
              value={newDhikrTranslation}
              onChangeText={setNewDhikrTranslation}
              multiline
            />

            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: Spacing.md, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: darkMode ? '#374151' : '#E5E7EB', flex: 1 }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: categoryInfo?.color || '#10B981', flex: 1 }]}
                onPress={addCustomDhikr}
              >
                <Text style={styles.modalButtonText}>
                  {t('common.add')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unified IslamicShareCard for image sharing */}
      {(() => {
        const isZikr = shareTargetZikr && !('createdAt' in shareTargetZikr);
        const zikrObj = isZikr ? (shareTargetZikr as Zikr) : null;
        const zikrId = zikrObj?.id ?? 0;
        const useQcf = isZikr && hasQuranRefs(zikrId);
        const catLabel = categoryInfo
          ? (isSunnahDuasRoute ? t('azkar.selectedDuas') : getCategoryName(categoryInfo, language))
          : t('azkar.title');
        const refText = zikrObj?.reference ? transliterateReference(zikrObj.reference, language) : undefined;
        const benefitVal = zikrObj ? getZikrBenefit(zikrObj, language) : undefined;
        // Match on-screen display: strip wrapping brackets, count instructions,
        // and any "أعوذ بالله من الشيطان الرجيم" prefix before the verse so the
        // shared image is identical to what the user sees on screen.
        const cleanArabic = stripAzkarBrackets(shareTargetZikr?.arabic || '');

        return (
          <IslamicShareCard
            ref={brandedRef}
            categoryLabel={catLabel}
            arabicText={cleanArabic}
            sourceText={refText}
            benefitText={benefitVal || undefined}
            renderCustomContent={useQcf ? () => (
              <AzkarQcfVerse azkarId={zikrId} textColor="#FFFFFF" fallbackText={cleanArabic} compact />
            ) : undefined}
          />
        );
      })()}
    </>
  );
}

// ===================================
// الأنماط
// ===================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontFamily: fontBold(),
    lineHeight: 30,
    includeFontPadding: false,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconButton: {
    padding: 6,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(120,120,128,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  zikrCardAnimated: {
    borderRadius: 20,
  },
  zikrCardGlass: {
    borderRadius: 20,
    padding: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    gap: Spacing.md,
  },
  actionButton: {
    padding: 8,
  },
  arabicText: {
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 42,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  transliteration: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  translation: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 20,
  },
  benefitStarWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitStarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -16,
    zIndex: 1,
  },
  benefitContainer: {
    alignSelf: 'stretch',
    alignItems: 'center',
    padding: 14,
    paddingTop: 24,
    borderRadius: 24,
  },
  benefitText: {
    fontSize: 14,
    lineHeight: 22,
    flexShrink: 1,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  referenceText: {
    fontSize: 13,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  navButton: {
    padding: 12,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  counterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 120,
  },
  counterText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Completion Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  modalDua: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  modalButton: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  // Custom dhikr
  customSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  customCountBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  customCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // List mode
  listItemBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listCollapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: Spacing.sm,
  },
  listCollapseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listMiniCount: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  listMiniCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  listExpandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(120,120,128,0.15)',
    paddingTop: 12,
  },
  listBenefitBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 20,
    marginBottom: 10,
    gap: Spacing.sm,
  },
  listCounterButton: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  listCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Add dhikr modal input
  modalInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 48,
  },

  // Mode toggle (Read / Listen)
  modeToggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 10,
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Compact Player (sticky bottom)
  compactPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingBottom: 16,
  },
  compactProgressBg: {
    height: 3,
    width: '100%',
  },
  compactProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  compactTrackInfo: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  compactTrackTitle: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
  },
  compactTrackMeta: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
    fontVariant: ['tabular-nums'] as const,
  },
  compactControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  compactPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSpeedBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactSpeedText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as const,
  },
  speedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  speedButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Watermark (hidden in normal view, visible in image capture)
  watermarkHidden: {
    fontSize: 10,
    color: 'transparent',
    textAlign: 'center',
    marginTop: 8,
    height: 0,
    overflow: 'hidden',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  toastBox: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  incompleteAlertContainer: {
    position: 'absolute',
    bottom: 120,
    left: 18,
    right: 18,
    zIndex: 1000,
  },
  incompleteAlertBox: {
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
  incompleteAlertIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incompleteAlertContent: {
    flex: 1,
    minWidth: 0,
  },
  incompleteAlertTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
  },
  incompleteAlertText: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fontSemiBold(),
  },
});
