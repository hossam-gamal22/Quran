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
  Pressable,
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
  updateZikrProgress,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  getFavorites,
  resolveCategoryId,
} from '@/lib/azkar-api';
import { getAzkarAudioSource } from '@/lib/azkar-audio-map';
import { fetchSelectedDuas, getDailySelectedDuas, duaToZikr } from '@/lib/duas-api';
import { markAzkarCompleted, getTodayDate, DailyAzkarRecord, incrementAzkarZikrCount } from '@/lib/worship-storage';
import { trackAzkarRead } from '@/lib/firebase-analytics';
import { t } from '@/lib/i18n';
import { useSettings } from '@/contexts/SettingsContext';
import { useCelebration } from '@/contexts/CelebrationContext';
import { useAzkarTracker } from '@/contexts/WorshipContext';
import { useGlobalAudio, type AudioTrack } from '@/contexts/GlobalAudioContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { IslamicShareCard, type IslamicShareCardHandle } from '@/components/ui/IslamicShareCard';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { transliterateReference } from '@/lib/source-transliteration';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useSacredContext } from '@/hooks/use-sacred-context';
import { BlurView } from 'expo-blur';
import { Spacing } from '@/constants/theme';
import AzkarQcfVerse from '@/components/AzkarQcfVerse';
import { hasQuranRefs } from '@/lib/azkar-quran-refs';
import { Image as ExpoImage } from 'expo-image';
import { BasmalaHeader } from '@/components/BasmalaHeader';
import { stripBasmalaPrefix, stripVerseNumbers, stripAzkarBrackets } from '@/lib/basmala-utils';
import { LinearGradient } from 'expo-linear-gradient';
import { searchPhotos } from '@/lib/api/pexels';

// Pexels search terms by azkar category (numeric IDs from Hisnul Muslim)
const CATEGORY_PHOTO_TERMS: Record<string, string> = {
  '1': 'sunrise sky clouds golden',     // أذكار الصباح والمساء
  '2': 'night sky stars peaceful',      // أذكار النوم
  '3': 'morning light dawn peaceful',   // أذكار الاستيقاظ
  '27': 'mosque minaret architecture',  // الأذكار بعد السلام من الصلاة
  '96': 'road mountains landscape',     // دعاء السفر
  '10': 'mosque minaret architecture',  // دعاء الذهاب إلى المسجد
  '8': 'cozy home interior warm',       // الذكر عند الخروج من المنزل
  default: 'nature peaceful calm islamic',
};

// Map azkar category IDs → worship tracker keys (uses new numeric IDs)
const WORSHIP_AZKAR_MAP: Record<string, keyof Omit<DailyAzkarRecord, 'date' | 'zikrCount'>> = {
  '1': 'morning',         // أذكار الصباح
  '1b': 'evening',        // أذكار المساء
  '2': 'sleep',           // أذكار النوم
  '3': 'wakeup',          // أذكار الاستيقاظ
  '27': 'afterPrayer',    // الأذكار بعد السلام من الصلاة
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

// After-prayer subcategory tabs
const AFTER_PRAYER_TABS: Record<string, Record<string, string>> = {
  general: {
    ar: 'عامة', en: 'General', fr: 'Générales', de: 'Allgemein',
    tr: 'Genel', es: 'General', ur: 'عام', id: 'Umum',
    ms: 'Umum', hi: 'सामान्य', bn: 'সাধারণ', ru: 'Общие',
  },
  after_fajr: {
    ar: 'بعد الفجر', en: 'After Fajr', fr: 'Apr\u00e8s Fajr', de: 'Nach Fajr',
    tr: 'Sabahtan Sonra', es: 'Despu\u00e9s del Fajr', ur: 'فجر کے بعد',
    id: 'Setelah Subuh', ms: 'Selepas Subuh', hi: 'फज्र के बाद', bn: 'ফজরের পর', ru: 'После Фаджр',
  },
  after_maghrib: {
    ar: 'بعد المغرب', en: 'After Maghrib', fr: 'Apr\u00e8s Maghrib', de: 'Nach Maghrib',
    tr: 'Ak\u015famdan Sonra', es: 'Despu\u00e9s del Maghrib', ur: 'مغرب کے بعد',
    id: 'Setelah Maghrib', ms: 'Selepas Maghrib', hi: 'मगरिब के बाद', bn: 'মাগরিবের পর', ru: 'После Магриб',
  },
};

// ===================================
// المكون الرئيسي
// ===================================

export default function CategoryAzkarScreen() {
  const isRTL = useIsRTL();
  const { category: rawCategory } = useLocalSearchParams<{ category: string }>();
  // Resolve legacy category IDs (e.g. 'morning' → '1') to new numeric IDs
  const category = resolveCategoryId(rawCategory || '');
  const router = useRouter();
  const { showCelebration } = useCelebration();
  const { markAzkarDone } = useAzkarTracker();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const { isDarkMode, settings } = useSettings();
  const darkMode = isDarkMode;
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  // Block all ads during azkar session
  useSacredContext('azkar_session');

  // الحالة
  const [allAzkar, setAllAzkar] = useState<Zikr[]>([]);
  const [azkar, setAzkar] = useState<Zikr[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<AzkarCategory | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const countsRef = useRef<Record<number, number>>({});
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const language = (settings.language || 'ar') as Language;
  const isArabic = language === 'ar';
  const [showTranslation, setShowTranslation] = useState(!isArabic || (settings.display.showTranslation ?? false));
  const [showTransliteration, setShowTransliteration] = useState(false);

  // Global audio context — must be before state initializers that reference it
  const globalAudio = useGlobalAudio();

  const [audioPlaying, setAudioPlaying] = useState(() => {
    return globalAudio.state.source === 'azkar' && globalAudio.state.sourceRoute === `/azkar/${category}` && globalAudio.state.isPlaying;
  });
  const [audioLoading, setAudioLoading] = useState(() => {
    return globalAudio.state.source === 'azkar' && globalAudio.state.sourceRoute === `/azkar/${category}` && globalAudio.state.isLoading;
  });
  const [categoryLocked, setCategoryLocked] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState('general');
  const [loadError, setLoadError] = useState(false);
  const isAfterPrayer = category === '27';

  // Audio listen-all mode — restore if audio is already playing for this category
  const [listenMode, setListenMode] = useState(() => {
    return globalAudio.state.source === 'azkar' && 
           globalAudio.state.sourceRoute === `/azkar/${category}` &&
           (globalAudio.state.isPlaying || globalAudio.state.isLoading);
  });

  // Pexels album art for listen mode
  const [listenPhoto, setListenPhoto] = useState<string | null>(null);

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
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // الأنيميشن
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ===================================
  // تحميل البيانات
  // ===================================

  const loadData = useCallback(async () => {
    if (!category) return;

    try {
      // 1. تحميل الفئة والأذكار أولاً
      const catInfo = getCategoryById(category);

      let categoryAzkar: Zikr[];
      if (category === 'sunnah_duas') {
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
        categoryAzkar = getAzkarByCategory(category);
      }

      if (!catInfo || categoryAzkar.length === 0) {
        setLoadError(true);
        return;
      }

      setCategoryInfo(catInfo);

      setAllAzkar(categoryAzkar);

      // For after_prayer, filter by subcategory; otherwise show all
      if (category === 'after_prayer') {
        const filtered = categoryAzkar.filter(z => z.subcategory === 'general' || !z.subcategory);
        setAzkar(filtered);
      } else {
        setAzkar(categoryAzkar);
      }

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
        const favoriteIds = await getFavorites();
        const favoriteSet = new Set(favoriteIds);
        for (const zikr of categoryAzkar) {
          initialCounts[zikr.id] = 0;
          initialFavorites[zikr.id] = favoriteSet.has(zikr.id);
        }
      } catch {
        for (const zikr of categoryAzkar) {
          initialCounts[zikr.id] = 0;
          initialFavorites[zikr.id] = false;
        }
      }
      countsRef.current = initialCounts;
      setCounts(initialCounts);
      setFavorites(initialFavorites);

      // 4. التحقق من حالة القفل (صباح/مساء)
      if (category === 'morning' || category === 'evening') {
        try {
          const lockKey = `azkar_lock_${category}`;
          const lockData = await AsyncStorage.getItem(lockKey);
          if (lockData) {
            const { until } = JSON.parse(lockData);
            if (new Date().getTime() < until) {
              setCategoryLocked(true);
            } else {
              await AsyncStorage.removeItem(lockKey);
            }
          }
        } catch { /* lock check failed - ignore */ }
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
    }
  }, [category, fadeAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===================================
  // تحميل الأذكار المخصصة
  // ===================================

  const loadCustomAzkar = useCallback(async () => {
    if (!category) return;
    try {
      const stored = await AsyncStorage.getItem(getCustomDhikrKey(category));
      if (stored) setCustomAzkar(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [category]);

  useEffect(() => {
    loadCustomAzkar();
  }, [loadCustomAzkar]);

  // ===================================
  // إيقاف الصوت عند الخروج من الصفحة
  // ===================================
  useFocusEffect(
    useCallback(() => {
      // Called when screen gains focus — nothing to do here
      return () => {
        // Called when screen loses focus — pause audio if playing
        if (globalAudio.state.source === 'azkar' && globalAudio.state.isPlaying) {
          globalAudio.togglePlayPause();
        }
      };
    }, [globalAudio.state.source, globalAudio.state.isPlaying, globalAudio.togglePlayPause])
  );

  const saveCustomAzkar = async (items: CustomDhikr[]) => {
    if (!category) return;
    await AsyncStorage.setItem(getCustomDhikrKey(category), JSON.stringify(items));
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
    countsRef.current = { ...countsRef.current, [item.id as any]: 0 };
    setCounts(prev => ({ ...prev, [item.id as any]: 0 }));
    setNewDhikrArabic('');
    setNewDhikrCount('33');
    setNewDhikrTranslation('');
    setShowAddModal(false);
    if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
            if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    // تسجيل في تتبع العبادات (via context so state updates everywhere)
    if (category) {
      const worshipKey = WORSHIP_AZKAR_MAP[category];
      if (worshipKey) {
        await markAzkarDone(worshipKey);
      }
    }

    // عرض احتفال الاكتمال
    const catName = categoryInfo ? getCategoryName(categoryInfo, language) : t('azkar.title');
    showCelebration({
      type: 'adhkar_complete',
      title: t('azkar.congratulations') + '\n' + t('azkar.completedSuccessfully', { name: catName }),
      subtitle: t('azkar.mayAllahAccept'),
      onDismiss: async () => {
        // قفل أذكار الصباح والمساء بعد الإغلاق (لتجنب تضارب المودالات)
        if (category === 'morning' || category === 'evening') {
          const now = new Date();
          let unlockTime: Date;
          if (category === 'morning') {
            unlockTime = new Date(now);
            unlockTime.setHours(18, 0, 0, 0);
            if (unlockTime.getTime() <= now.getTime()) {
              unlockTime.setDate(unlockTime.getDate() + 1);
              unlockTime.setHours(4, 0, 0, 0);
            }
          } else {
            unlockTime = new Date(now);
            unlockTime.setDate(unlockTime.getDate() + 1);
            unlockTime.setHours(4, 0, 0, 0);
          }
          const lockKey = `azkar_lock_${category}`;
          await AsyncStorage.setItem(lockKey, JSON.stringify({ until: unlockTime.getTime() }));
          setCategoryLocked(true);
        }
        router.back();
      },
    });
  }, [category, categoryInfo, language, showCelebration, router, markAzkarDone]);

  const checkAllCompleted = useCallback((updatedCounts: Record<number, number>) => {
    return azkar.every(z => (updatedCounts[z.id] || 0) >= z.count);
  }, [azkar]);

  const handleCount = async (zikr: Zikr) => {
    if (categoryLocked) return;
    
    // Read from ref for latest synchronous value (avoids stale closure)
    const currentCount = countsRef.current[zikr.id] || 0;
    
    if (currentCount >= zikr.count) {
      // انتهى العداد - انتقل للذكر التالي
      if (currentIndex < azkar.length - 1) {
        goToNext();
      }
      return;
    }

    const newCount = currentCount + 1;
    
    // تحديث العداد — update ref first for immediate sync reads
    countsRef.current = { ...countsRef.current, [zikr.id]: newCount };
    setCounts(prev => ({ ...prev, [zikr.id]: newCount }));
    
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
    if (category) {
      updateZikrProgress(category, zikr.id, newCount).catch(() => {});
    }

    // إذا اكتمل العداد
    if (newCount >= zikr.count) {
      // تسجيل إحصائيات القراءة في Firebase
      if (category) {
        trackAzkarRead(zikr.id, category, settings.language).catch(() => {});
        incrementAzkarZikrCount(getTodayDate()).catch(() => {});
      }

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Vibration.vibrate([0, 100, 50, 100]);
      }

      const updatedCounts = { ...countsRef.current };
      
      // التحقق من اكتمال جميع الأذكار
      if (checkAllCompleted(updatedCounts)) {
        setTimeout(() => handleCategoryCompleted(), 500);
      } else {
        // انتقال تلقائي بعد ثانية — cancel any existing timer
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = setTimeout(() => {
          autoAdvanceRef.current = null;
          goToNext();
        }, 1000);
      }
    }
  };

  // ===================================
  // التنقل
  // ===================================

  const goToNext = () => {
    // Clear any pending auto-advance timer
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setCurrentIndex(prev => {
      if (prev < azkar.length - 1) {
        const next = prev + 1;
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        Animated.timing(progressAnim, {
          toValue: Math.min(1, (next + 1) / azkar.length),
          duration: 300,
          useNativeDriver: false,
        }).start();
        return next;
      } else {
        // Loop back to start — بدأت من جديد
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setToastMsg(t('azkar.startingOver'));
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMsg(null), 2000);
        return 0;
      }
    });
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => {
      if (prev > 0) {
        const next = prev - 1;
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        Animated.timing(progressAnim, {
          toValue: next / azkar.length,
          duration: 300,
          useNativeDriver: false,
        }).start();
        return next;
      }
      return prev;
    });
  };

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
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // ===================================
  // المشاركة
  // ===================================

  const openShareOptions = (zikr: Zikr | CustomDhikr) => {
    setShareTargetZikr(zikr);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('common.share'),
      '',
      [
        { text: t('common.shareText'), onPress: () => shareAsText(zikr) },
        { text: t('common.shareImage'), onPress: () => setTimeout(() => brandedRef.current?.showSizePicker(), 50) },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  const shareAsText = async (zikr: Zikr | CustomDhikr) => {
    try {
      const isCustom = 'createdAt' in zikr;
      let message = stripAzkarBrackets(zikr.arabic);
      if (!isCustom) {
        const translation = getZikrTranslation(zikr as Zikr, language);
        message = `${stripAzkarBrackets(zikr.arabic)}\n\n${translation}\n\n📖 ${(zikr as Zikr).reference}\n\n${t('azkar.fromApp')}`;
      } else if ((zikr as CustomDhikr).translation) {
        message = `${stripAzkarBrackets(zikr.arabic)}\n\n${(zikr as CustomDhikr).translation}\n\n${t('azkar.fromApp')}`;
      } else {
        message = `${stripAzkarBrackets(zikr.arabic)}\n\n${t('azkar.fromApp')}`;
      }
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Build audio queue from azkar that have audio URLs
  const audioQueue = React.useMemo(() => {
    return azkar
      .map((z, idx) => ({ zikr: z, originalIndex: idx }))
      .filter(item => !!item.zikr.audio);
  }, [azkar]);

  // Build GlobalAudioContext-compatible track list
  const audioTracks: AudioTrack[] = React.useMemo(() => {
    return audioQueue.map((item, index) => {
      // Use first ~40 chars of actual Arabic text (stripped of brackets) as track title
      const rawTitle = stripAzkarBrackets(item.zikr.arabic || '').replace(/﴿/g, '').replace(/﴾/g, '').trim();
      const title = rawTitle.length > 40 ? rawTitle.substring(0, 40) + '...' : rawTitle;
      return {
        id: String(item.zikr.id),
        title: title || (category?.includes('duas') ? t('azkar.duaNumber', { num: String(index + 1) }) : t('azkar.dhikrNumber', { num: String(index + 1) })),
        subtitle: categoryInfo ? getCategoryName(categoryInfo, language) : '',
        url: item.zikr.audio || '',
        localSource: getAzkarAudioSource(item.zikr.audio) || undefined,
        categoryId: category || undefined, // For intro trim lookup
      };
    });
  }, [audioQueue, categoryInfo, language, t, category]);

  const hasAudio = audioQueue.length > 0;

  // Derive playback state from global audio context
  const isGlobalAzkarPlaying = globalAudio.state.source === 'azkar';
  const isThisCategoryPlaying = isGlobalAzkarPlaying && globalAudio.state.sourceRoute === `/azkar/${category}`;
  const audioQueueIndex = isThisCategoryPlaying ? globalAudio.state.queueIndex : -1;
  const audioPaused = isThisCategoryPlaying && !globalAudio.state.isPlaying && !globalAudio.state.isLoading;
  const audioPosition = isThisCategoryPlaying ? globalAudio.state.position : 0;
  const audioDuration = isThisCategoryPlaying ? globalAudio.state.duration : 0;
  const playbackSpeed = globalAudio.playbackSpeed;

  // Track previous source to detect azkar→none transitions (queue end)
  const prevSourceRef = useRef(globalAudio.state.source);
  const listenModeRef = useRef(listenMode);
  listenModeRef.current = listenMode;

  // Sync audioPlaying state with global context
  useEffect(() => {
    const wasThisCategory = prevSourceRef.current === 'azkar';
    prevSourceRef.current = globalAudio.state.source;

    if (isThisCategoryPlaying) {
      setAudioPlaying(globalAudio.state.isPlaying || globalAudio.state.isLoading);
      setAudioLoading(globalAudio.state.isLoading);
    } else if (wasThisCategory && !isGlobalAzkarPlaying && listenModeRef.current) {
      // Source changed from 'azkar' to something else — queue ended or was interrupted
      setAudioPlaying(false);
      setAudioLoading(false);
      setListenMode(false);
    }
  }, [isGlobalAzkarPlaying, isThisCategoryPlaying, globalAudio.state.isPlaying, globalAudio.state.isLoading, globalAudio.state.source]);

  // Fetch Pexels photo for listen mode album art
  useEffect(() => {
    if (!listenMode || !categoryInfo || listenPhoto) return;
    const term = CATEGORY_PHOTO_TERMS[category as string] || CATEGORY_PHOTO_TERMS.default;
    let cancelled = false;
    searchPhotos(term, 1, 5, 'portrait')
      .then((res) => {
        if (!cancelled && res.photos.length > 0) {
          const randomPhoto = res.photos[Math.floor(Math.random() * res.photos.length)];
          setListenPhoto(randomPhoto.src.portrait);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [listenMode, category, categoryInfo]);

  const handleListenAll = useCallback(async () => {
    if (isThisCategoryPlaying) {
      // This category's azkar is playing or paused — toggle play/pause
      await globalAudio.togglePlayPause();
      return;
    }
    // Start from beginning
    setListenMode(true);
    setAudioPlaying(true);
    await globalAudio.playAzkarQueue(audioTracks, 0, `/azkar/${category}`);
  }, [isThisCategoryPlaying, audioTracks, globalAudio, category]);

  const handleStopListening = useCallback(async () => {
    // Set local state FIRST so UI exits listen mode immediately
    setAudioPlaying(false);
    setAudioLoading(false);
    setListenMode(false);
    try {
      await globalAudio.stop();
    } catch {}
  }, [globalAudio]);

  const handleNextTrack = useCallback(async () => {
    await globalAudio.next();
  }, [globalAudio]);

  const handlePrevTrack = useCallback(async () => {
    await globalAudio.previous();
  }, [globalAudio]);

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

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Currently playing zikr id for highlighting
  const currentlyPlayingZikrId = audioQueueIndex >= 0 && audioQueueIndex < audioQueue.length
    ? audioQueue[audioQueueIndex].zikr.id
    : null;

  // Audio continues playing when leaving page — GlobalAudioBar handles it
  // Stop only handled by explicit user action (close button / stop)

  // (Pexels photos removed — listen mode uses category-colored styling instead)

  // ===================================
  // إعادة تعيين العداد
  // ===================================

  const resetCount = (zikrId: number) => {
    countsRef.current = { ...countsRef.current, [zikrId]: 0 };
    setCounts(prev => ({ ...prev, [zikrId]: 0 }));
    if (category) {
      updateZikrProgress(category, zikrId, 0);
    }
  };

  // ===================================
  // الرندر
  // ===================================

  if (loadError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.icon} />
        <Text style={{ color: colors.text, marginTop: 12, fontSize: 16 }}>{t('azkar.noDataSection')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#0d8e62', borderRadius: 20 }}>
          <Text style={{ color: '#FFF', fontSize: 16 }}>{t('azkar.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!categoryInfo || azkar.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0d8e62" />
        <Text style={{ color: colors.text, marginTop: 12 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Clamp currentIndex to valid range to prevent crash after filtering
  const safeIndex = Math.min(currentIndex, azkar.length - 1);
  const currentZikr = azkar[safeIndex];
  const currentCount = counts[currentZikr.id] || 0;
  const isCompleted = currentCount >= currentZikr.count;
  const currentItemProgress = Math.min(1, currentCount / Math.max(1, currentZikr.count));
  const progress = (safeIndex + currentItemProgress) / azkar.length;
  const progressPercent = Math.min(100, Math.round(progress * 100));

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
        style={styles.container}
      >
        {/* Header */}
        <View
          style={[styles.header, { paddingTop: insets.top, overflow: 'hidden' }]}
        >
          {Platform.OS === 'ios' && (
            <BlurView intensity={80} tint={(darkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
          )}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: darkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
          <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={24} color={colors.text} />
            </TouchableOpacity>
            
            <View style={{ flex: 1, marginHorizontal: 4 }}>
              <Text
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                style={[styles.headerTitleText, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
              >
                {category === 'sunnah_duas' ? t('azkar.selectedDuas')
                  : category === '107' ? t('home.salawat')
                  : category === '129' ? t('home.istighfar')
                  : getCategoryName(categoryInfo, language)}
              </Text>
            </View>
            
            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => setViewMode(v => v === 'card' ? 'list' : 'card')}
                style={styles.favoriteButton}
              >
                <MaterialCommunityIcons
                  name={viewMode === 'card' ? 'view-list' : 'card-text'}
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.favoriteButton}>
                <MaterialCommunityIcons name="plus-circle-outline" size={24} color={colors.text} />
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
                      extrapolate: 'clamp',
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textLight }]}>
              {progressPercent}%
            </Text>
          </View>

          {/* Read / Listen Mode Toggle — Arabic only (audio is Arabic recordings) */}
          {hasAudio && language === 'ar' && (
            <NativeTabs
              tabs={[
                { key: 'read', label: t('azkar.reading') },
                { key: 'listen', label: t('azkar.listening') },
              ]}
              selected={listenMode ? 'listen' : 'read'}
              onSelect={(key) => {
                if (key === 'read') {
                  handleStopListening();
                  setListenMode(false);
                } else {
                  setListenMode(true);
                  if (!audioPlaying) handleListenAll();
                }
              }}
              indicatorColor={categoryInfo?.color}
              style={{ marginTop: 10 }}
            />
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
            scrollable
            style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 4 }}
          />
        )}

        {/* المحتوى */}
        {listenMode && hasAudio ? (
          /* === Listen Mode: Spotify-style Player === */
          <View style={{ flex: 1 }}>
            {/* Dim overlay so background doesn't overpower content */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.15)' }]} pointerEvents="none" />
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}
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
                  backgroundColor: colors.surface,
                  elevation: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                }}>
                  {listenPhoto ? (
                    <ExpoImage
                      source={{ uri: listenPhoto }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={400}
                    />
                  ) : (
                    <LinearGradient
                      colors={[categoryInfo.color + '40', categoryInfo.color + '18']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <MaterialCommunityIcons
                        name="headphones"
                        size={80}
                        color={categoryInfo.color}
                      />
                      <Text style={{
                        fontSize: colors.fs(16),
                        fontFamily: fontBold(),
                        color: categoryInfo.color,
                        marginTop: 12,
                        textAlign: 'center',
                      }}>
                        {getCategoryName(categoryInfo, language)}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
              </View>

              {/* Track Info */}
              <View style={{ paddingHorizontal: 32, paddingTop: 24 }}>
                <Text
                  style={{
                    fontSize: colors.fs(20),
                    fontFamily: fontBold(),
                    color: colors.text,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                    lineHeight: colors.fs(34),
                  }}
                  numberOfLines={2}
                >
                  {audioQueueIndex >= 0 && audioTracks[audioQueueIndex]
                    ? audioTracks[audioQueueIndex].title
                    : getCategoryName(categoryInfo, language)}
                </Text>
                <Text
                  style={{
                    fontSize: colors.fs(15),
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
                    fontSize: colors.fs(13),
                    fontFamily: fontRegular(),
                    color: colors.icon,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                    marginTop: 2,
                  }}
                >
                  {audioQueueIndex >= 0 ? audioQueueIndex + 1 : 0} / {audioQueue.length}
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
                  maximumTrackTintColor={colors.glass}
                  thumbTintColor={categoryInfo.color}
                  onSlidingComplete={(val) => handleSeek(val * audioDuration)}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 12, fontFamily: fontRegular(), color: colors.icon, fontVariant: ['tabular-nums'] }}>
                    {formatTime(audioPosition)}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: fontRegular(), color: colors.icon, fontVariant: ['tabular-nums'] }}>
                    {formatTime(audioDuration)}
                  </Text>
                </View>
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
                  disabled={audioQueueIndex <= 0}
                  style={{ opacity: audioQueueIndex <= 0 ? 0.3 : 1, padding: 8 }}
                >
                  <MaterialCommunityIcons name="skip-previous" size={36} color={colors.textLight} />
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
                  disabled={audioQueueIndex >= audioQueue.length - 1}
                  style={{ opacity: audioQueueIndex >= audioQueue.length - 1 ? 0.3 : 1, padding: 8 }}
                >
                  <MaterialCommunityIcons name="skip-next" size={36} color={colors.textLight} />
                </TouchableOpacity>

                {/* Close */}
                <TouchableOpacity
                  onPress={handleStopListening}
                  style={{ padding: 8 }}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={28} color={colors.icon} />
                </TouchableOpacity>
              </View>

              {/* Track list below */}
              <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 }}>
                <Text style={{
                  fontSize: colors.fs(16),
                  fontFamily: fontBold(),
                  color: colors.textLight,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                  marginBottom: 10,
                  paddingHorizontal: 4,
                }}>
                  {t('azkar.playlist')}
                </Text>
                {audioQueue.map((item, index) => {
                  const isCurrentTrack = index === audioQueueIndex;
                  // Use category color for all tracks
                  const trackGradient: [string, string] = isCurrentTrack
                    ? [categoryInfo.color + '35', categoryInfo.color + '15']
                    : [categoryInfo.color + '12', categoryInfo.color + '05'];

                  return (
                    <TouchableOpacity
                      key={item.zikr.id}
                      onPress={async () => {
                        await globalAudio.playAzkarQueue(audioTracks, index, `/azkar/${category}`);
                        setAudioPlaying(true);
                      }}
                      style={{
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        gap: Spacing.md,
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 14,
                        marginBottom: 8,
                        backgroundColor: 'transparent',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Gradient background */}
                      <LinearGradient
                        colors={trackGradient}
                        start={{ x: isRTL ? 0 : 1, y: 0 }}
                        end={{ x: isRTL ? 1 : 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      
                      {/* Track thumbnail */}
                      <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isCurrentTrack ? categoryInfo.color : colors.glass,
                        overflow: 'hidden',
                      }}>
                        <MaterialCommunityIcons
                          name={isCurrentTrack && audioPlaying && !audioPaused ? 'volume-high' : 'music-note'}
                          size={isCurrentTrack && audioPlaying && !audioPaused ? 20 : 18}
                          color={isCurrentTrack ? '#fff' : colors.icon}
                        />
                      </View>
                      
                      {/* Track info - simple title only */}
                      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text
                          style={{
                            fontSize: colors.fs(15),
                            fontFamily: isCurrentTrack ? fontBold() : fontSemiBold(),
                            color: isCurrentTrack ? categoryInfo.color : colors.text,
                            textAlign: isRTL ? 'right' : 'left',
                            writingDirection: 'rtl',
                            lineHeight: colors.fs(24),
                          }}
                        >
                          {audioTracks[index]?.title || t('azkar.dhikrNumber', { num: String(index + 1) })}
                        </Text>
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
                  <GlassCard intensity={80} borderRadius={20} style={styles.zikrCardGlass}>
                    {/* أزرار الإجراءات */}
                    <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        onPress={() => toggleFavorite(currentZikr.id)}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons
                          name={favorites[currentZikr.id] ? 'heart' : 'heart-outline'}
                          size={24}
                          color={favorites[currentZikr.id] ? '#EF4444' : colors.icon}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => openShareOptions(currentZikr)}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons
                          name="share-variant"
                          size={22}
                          color={colors.icon}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => resetCount(currentZikr.id)}
                        style={styles.actionButton}
                      >
                        <MaterialCommunityIcons
                          name="refresh"
                          size={22}
                          color={colors.icon}
                        />
                      </TouchableOpacity>
                      {/* Audio play icon — per-item playback */}
                      {currentZikr.audio ? (
                        <TouchableOpacity
                          onPress={async () => {
                            const trackIdx = audioQueue.findIndex(q => q.zikr.id === currentZikr.id);
                            if (trackIdx >= 0) {
                              if (currentlyPlayingZikrId === currentZikr.id && audioPlaying && !audioPaused) {
                                await globalAudio.togglePlayPause();
                              } else {
                                await globalAudio.playAzkarQueue(audioTracks, trackIdx, `/azkar/${category}`);
                                setAudioPlaying(true);
                              }
                              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                          }}
                          style={styles.actionButton}
                        >
                          <MaterialCommunityIcons
                            name={currentlyPlayingZikrId === currentZikr.id && audioPlaying && !audioPaused ? 'pause-circle-outline' : 'volume-high'}
                            size={22}
                            color={currentlyPlayingZikrId === currentZikr.id && audioPlaying ? categoryInfo.color : colors.icon}
                          />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* النص الرئيسي */}
                    {/* Main dhikr text: Arabic for Arabic users, translation for others */}
                    {/* Use Uthmanic font for Quran content (detected by verse brackets or known IDs) */}
                    {/* Long-press on text plays audio for the current item */}
                    {(() => {
                      const isQuranQcf = hasQuranRefs(currentZikr.id);
                      const hasVerseBrackets = currentZikr.arabic?.includes('﴿') || currentZikr.arabic?.includes('﴾');
                      const isQuranContent = isQuranQcf || hasVerseBrackets;
                      const { stripped, hadBasmala } = stripBasmalaPrefix(currentZikr.arabic);
                      const rawDisplay = hadBasmala ? stripped : currentZikr.arabic;
                      const bracketStripped = stripAzkarBrackets(rawDisplay);
                      const displayText = isQuranContent ? stripVerseNumbers(bracketStripped) : bracketStripped;
                      const quranFontStyle = (!isQuranQcf && isQuranContent) ? {
                        fontFamily: 'KFGQPCUthmanic',
                        fontWeight: 'normal' as const,
                        fontSize: 30,
                        lineHeight: 62,
                        letterSpacing: 0,
                        textAlign: 'center' as const,
                        writingDirection: 'rtl' as const,
                        paddingTop: 6,
                        paddingBottom: 4,
                      } : {};

                      const handleLongPressAudio = async () => {
                        if (!currentZikr.audio) return;
                        const trackIdx = audioQueue.findIndex(q => q.zikr.id === currentZikr.id);
                        if (trackIdx >= 0) {
                          if (currentlyPlayingZikrId === currentZikr.id && audioPlaying && !audioPaused) {
                            await globalAudio.togglePlayPause();
                          } else {
                            await globalAudio.playAzkarQueue(audioTracks, trackIdx, `/azkar/${category}`);
                            setAudioPlaying(true);
                          }
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                      };

                      return (
                        <>
                          {hadBasmala && (
                            <BasmalaHeader tintColor={darkMode ? '#D4A574' : '#C9A84C'} />
                          )}
                          <Pressable onLongPress={handleLongPressAudio} delayLongPress={400}>
                            {isQuranQcf && isArabic ? (
                              <AzkarQcfVerse
                                azkarId={currentZikr.id}
                                textColor={currentlyPlayingZikrId === currentZikr.id ? categoryInfo.color : colors.text}
                              />
                            ) : isArabic ? (
                              <Text style={[
                                styles.arabicText,
                                { color: colors.text },
                                currentlyPlayingZikrId === currentZikr.id && { color: categoryInfo.color },
                                quranFontStyle,
                              ]}>
                                {displayText}
                              </Text>
                            ) : (
                              <Text style={[
                                styles.arabicText,
                                { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                                currentlyPlayingZikrId === currentZikr.id && { color: categoryInfo.color },
                                quranFontStyle,
                              ]}>
                                {getZikrTranslation(currentZikr, language)}
                              </Text>
                            )}
                          </Pressable>
                        </>
                      );
                    })()}

                    {/* النطق */}
                    {showTransliteration && currentZikr.transliteration && (
                      <Text style={[styles.transliteration, { color: colors.icon }]}>
                        {currentZikr.transliteration}
                      </Text>
                    )}

                    {/* الترجمة — فقط للعربية مع التبديل */}
                    {isArabic && showTranslation && (
                      <Text style={[styles.translation, { color: colors.textLight, writingDirection: 'ltr', textAlign: 'left' }]}>
                        {getZikrTranslation(currentZikr, 'en' as Language)}
                      </Text>
                    )}

                    {/* الفضل — benefit text - moved BELOW the card */}

                    {/* المرجع — source reference */}
                    {(currentZikr as Zikr).reference && (
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 }}>
                        <MaterialCommunityIcons name="book-open-page-variant" size={13} color={colors.icon} />
                        <Text style={{ color: colors.icon, fontSize: colors.fs(13), lineHeight: colors.fs(18) }}>
                          {transliterateReference((currentZikr as Zikr).reference, language)}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.watermarkHidden}>روح المسلم</Text>
                  </GlassCard>

                  {/* الفضل — benefit card BELOW main text */}
                  {currentZikr.benefit && (
                    <GlassCard intensity={20} borderRadius={16} style={styles.benefitCard}>
                      <View style={[styles.benefitHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons name="star" size={18} color={categoryInfo.color} />
                        <Text style={[styles.benefitHeaderText, { color: categoryInfo.color, textAlign: isRTL ? 'right' : 'left' }]}>
                          {t('azkar.benefit')}
                        </Text>
                      </View>
                        <Text style={[styles.benefitText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                          {getZikrBenefit(currentZikr, language) || ''}
                        </Text>
                    </GlassCard>
                  )}
              </Animated.View>

              {/* Custom dhikr after main ones (scroll below current card if at end) */}
              {currentIndex === azkar.length - 1 && customAzkar.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.customSectionTitle, { color: colors.textLight }]}>
                    {t('azkar.customAdhkar')}
                  </Text>
                  {customAzkar.map((cd) => {
                    const cdCount = counts[cd.id as any] || 0;
                    const cdDone = cdCount >= cd.count;
                    return (
                      <TouchableOpacity
                        key={cd.id}
                        onPress={() => {
                          if (cdDone) return;
                          const currentVal = countsRef.current[cd.id as any] || 0;
                          if (currentVal >= cd.count) return;
                          const next = currentVal + 1;
                          countsRef.current = { ...countsRef.current, [cd.id as any]: next };
                          setCounts(prev => ({ ...prev, [cd.id as any]: next }));
                          if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        onLongPress={() => deleteCustomDhikr(cd.id)}
                        activeOpacity={0.8}
                      >
                        <GlassCard intensity={20} borderRadius={20} style={[styles.zikrCardGlass, { marginBottom: 12 }]}>
                          {/* Show Arabic for Arabic users, translation for others */}
                          {isArabic ? (
                            <Text style={[styles.arabicText, { color: colors.text, fontSize: colors.fs(20) }]}>
                              {cd.arabic}
                            </Text>
                          ) : (
                            <Text style={[styles.arabicText, { color: colors.text, fontSize: colors.fs(20), textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                              {cd.translation || cd.arabic}
                            </Text>
                          )}
                          {/* Show translation for Arabic users if enabled */}
                          {isArabic && showTranslation && cd.translation && (
                            <Text style={[styles.translation, { color: colors.textLight, writingDirection: 'ltr', textAlign: 'left' }]}>
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
            <View style={[styles.bottomBar, { overflow: 'hidden', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={80} tint={(darkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: darkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
              <TouchableOpacity
                onPress={goToPrevious}
                disabled={currentIndex === 0}
                style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              >
                <MaterialCommunityIcons
                  name={isRTL ? 'chevron-right' : 'chevron-left'}
                  size={28}
                  color={currentIndex === 0 ? '#9CA3AF' : categoryInfo.color}
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
                  {isCompleted ? '✓' : `${currentCount}/${currentZikr.count}`}
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
            contentContainerStyle={[styles.contentContainer, { paddingBottom: 32 }]}
            showsVerticalScrollIndicator={false}
          >
            {azkar.map((zikr, idx) => {
              const zCount = counts[zikr.id] || 0;
              const zDone = zCount >= zikr.count;
              const isExpanded = expandedItems.has(zikr.id);
              const { stripped: rawListText, hadBasmala: listItemHasBasmala } = stripBasmalaPrefix(zikr.arabic);
              const isQuranItem = [48, 481, 482, 49].includes(zikr.id) || zikr.arabic?.includes('﴿') || zikr.arabic?.includes('﴾');
              const bracketStrippedList = stripAzkarBrackets(rawListText);
              const listDisplayText = isQuranItem ? stripVerseNumbers(bracketStrippedList) : bracketStrippedList;
              return (
                <View key={zikr.id} style={{ marginBottom: 10 }}>
                  {listItemHasBasmala && (
                    <BasmalaHeader tintColor={darkMode ? '#D4A574' : '#C9A84C'} style={{ marginBottom: 4 }} />
                  )}
                  <GlassCard intensity={20} borderRadius={20} style={[
                    styles.zikrCardGlass,
                    { padding: 0 },
                    currentlyPlayingZikrId === zikr.id && { borderWidth: 1.5, borderColor: categoryInfo.color },
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
                          { color: colors.text, fontSize: colors.fs(18), marginBottom: 0, flex: 1, textAlign: isArabic ? 'right' : (isRTL ? 'right' : 'left'), writingDirection: isArabic ? 'rtl' : (isRTL ? 'rtl' : 'ltr') },
                          currentlyPlayingZikrId === zikr.id && { color: categoryInfo.color },
                          ([48, 481, 482, 49].includes(zikr.id) || zikr.arabic?.includes('﴿') || zikr.arabic?.includes('﴾')) && { fontFamily: 'KFGQPCUthmanic', fontWeight: 'normal' as const, fontSize: 22, lineHeight: 44 },
                        ]}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {isArabic ? listDisplayText : getZikrTranslation(zikr, language)}
                      </Text>
                      <View style={[styles.listCollapseRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.listMiniCount, { backgroundColor: zDone ? '#10B981' : categoryInfo.color }]}>
                          <Text style={styles.listMiniCountText}>{zDone ? '✓' : `${zCount}/${zikr.count}`}</Text>
                        </View>
                        <MaterialCommunityIcons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={22}
                          color={colors.icon}
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
                              color={favorites[zikr.id] ? '#EF4444' : colors.icon}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => openShareOptions(zikr)} style={styles.actionButton}>
                            <MaterialCommunityIcons name="share-variant" size={18} color={colors.icon} />
                          </TouchableOpacity>
                        </View>

                        {/* Translation: for Arabic users — toggle English */}
                        {isArabic && showTranslation && (
                          <Text style={[styles.translation, { color: colors.textLight, fontSize: colors.fs(14), writingDirection: 'ltr', textAlign: 'left' }]}>
                            {getZikrTranslation(zikr, 'en' as Language)}
                          </Text>
                        )}

                        {zikr.benefit && (
                          <View style={[styles.listBenefitBox, { backgroundColor: categoryInfo.color + '12', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <MaterialCommunityIcons name="star" size={14} color={categoryInfo.color} />
                            <Text style={[styles.benefitText, { flex: 1, color: categoryInfo.color, fontSize: colors.fs(13), textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                              {getZikrBenefit(zikr, language) || ''}
                            </Text>
                          </View>
                        )}

                        {/* المرجع — source reference */}
                        {zikr.reference && (
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 }}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={12} color={colors.icon} />
                            <Text style={{ color: colors.icon, fontSize: colors.fs(12), lineHeight: colors.fs(16) }}>
                              {transliterateReference(zikr.reference, language)}
                            </Text>
                          </View>
                        )}

                        {/* Counter button */}
                        <TouchableOpacity
                          onPress={() => {
                            if (categoryLocked || zDone) return;
                            const currentVal = countsRef.current[zikr.id] || 0;
                            if (currentVal >= zikr.count) return;
                            const next = currentVal + 1;
                            countsRef.current = { ...countsRef.current, [zikr.id]: next };
                            setCounts(prev => ({ ...prev, [zikr.id]: next }));
                            if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (next >= zikr.count) {
                              if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              const updated = { ...countsRef.current };
                              if (checkAllCompleted(updated)) setTimeout(() => handleCategoryCompleted(), 500);
                            }
                            if (category) updateZikrProgress(category, zikr.id, next).catch(() => {});
                          }}
                          style={[styles.listCounterButton, { backgroundColor: zDone ? '#10B981' : categoryInfo.color }]}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.listCounterText}>{zDone ? '✓' : `${zCount}/${zikr.count}`}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </GlassCard>
                </View>
              );
            })}

            {/* Custom dhikr in list mode */}
            {customAzkar.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.customSectionTitle, { color: colors.textLight }]}>
                  {t('azkar.customAdhkar')}
                </Text>
                {customAzkar.map((cd) => {
                  const cdCount = counts[cd.id as any] || 0;
                  const cdDone = cdCount >= cd.count;
                  return (
                    <TouchableOpacity
                      key={cd.id}
                      onPress={() => {
                        if (cdDone) return;
                        const currentVal = countsRef.current[cd.id as any] || 0;
                        if (currentVal >= cd.count) return;
                        const next = currentVal + 1;
                        countsRef.current = { ...countsRef.current, [cd.id as any]: next };
                        setCounts(prev => ({ ...prev, [cd.id as any]: next }));
                        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      onLongPress={() => deleteCustomDhikr(cd.id)}
                      activeOpacity={0.8}
                      style={{ marginBottom: 12 }}
                    >
                      <GlassCard intensity={20} borderRadius={20} style={styles.zikrCardGlass}>
                        {/* Show Arabic for Arabic users, translation for others */}
                        {isArabic ? (
                          <Text style={[styles.arabicText, { color: colors.text, fontSize: colors.fs(20) }]}>
                            {cd.arabic}
                          </Text>
                        ) : (
                          <Text style={[styles.arabicText, { color: colors.text, fontSize: colors.fs(20), textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                            {cd.translation || cd.arabic}
                          </Text>
                        )}
                        {isArabic && showTranslation && cd.translation && (
                          <Text style={[styles.translation, { color: colors.textLight }]}>
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

      {/* بوب أب القفل */}
      {categoryLocked && (
        <Modal visible={categoryLocked} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={styles.modalEmoji}></Text>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('azkar.alreadyCompleted')}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textLight }]}>
                {t('azkar.completedTodayMessage', { name: categoryInfo ? getCategoryName(categoryInfo, language) : t('azkar.title') })}
              </Text>
              <Text style={[styles.modalDua, { color: categoryInfo?.color || '#10B981' }]}>
                {t('azkar.willRenewOnTime')}
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: categoryInfo?.color || '#10B981' }]}
                onPress={() => router.back()}
              >
                <Text style={styles.modalButtonText}>{t('common.ok')}</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.surface, width: '100%' }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 20 }]}>
              {t('azkar.addCustomDhikr')}
            </Text>

            <TextInput
              style={[styles.modalInput, {
                color: colors.text,
                backgroundColor: colors.surfaceVariant,
                textAlign: 'right',
              }]}
              placeholder={t('azkar.arabicTextRequired')}
              placeholderTextColor={colors.muted}
              value={newDhikrArabic}
              onChangeText={setNewDhikrArabic}
              multiline
            />

            <TextInput
              style={[styles.modalInput, {
                color: colors.text,
                backgroundColor: colors.surfaceVariant,
                textAlign: 'center',
              }]}
              placeholder={t('azkar.repeatCount')}
              placeholderTextColor={colors.muted}
              value={newDhikrCount}
              onChangeText={setNewDhikrCount}
              keyboardType="number-pad"
            />

            <TextInput
              style={[styles.modalInput, {
                color: colors.text,
                backgroundColor: colors.surfaceVariant,
                textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr',
              }]}
              placeholder={t('azkar.translationOptional')}
              placeholderTextColor={colors.muted}
              value={newDhikrTranslation}
              onChangeText={setNewDhikrTranslation}
              multiline
            />

            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: Spacing.md, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border, flex: 1 }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textLight }]}>
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

      {/* Premium Islamic share card for image sharing */}
      <IslamicShareCard
        ref={brandedRef}
        categoryLabel={categoryInfo ? getCategoryName(categoryInfo, language) : t('azkar.title')}
        arabicText={shareTargetZikr?.arabic || ''}
        sourceText={'reference' in (shareTargetZikr || {}) && (shareTargetZikr as Zikr)?.reference
          ? transliterateReference((shareTargetZikr as Zikr).reference, language)
          : undefined}
      />
    </>
  );
}

// ===================================
// الأنماط
// ===================================

const _styles = StyleSheet.create({
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
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
    lineHeight: 30,
    includeFontPadding: false,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 30,
    includeFontPadding: false,
  },
  shareButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  favoriteButton: {
    padding: 8,
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
    lineHeight: 20,
    includeFontPadding: false,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  zikrCardAnimated: {
    borderRadius: 20,
  },
  zikrCardGlass: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  benefitCard: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 28,
    marginTop: 12,
    marginBottom: 8,
    marginHorizontal: 12,
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  benefitHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
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
    lineHeight: 44,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 24,
    marginHorizontal: 4,
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
    padding: 12,
    paddingTop: 22,
    borderRadius: 12,
  },
  benefitText: {
    fontSize: 16,
    lineHeight: 26,
    flex: 1,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  referenceText: {
    fontSize: 13,
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.10)',
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
    lineHeight: 34,
    includeFontPadding: false,
  },

  // Completion Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    lineHeight: 40,
    includeFontPadding: false,
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
    lineHeight: 30,
    includeFontPadding: false,
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
    lineHeight: 30,
    includeFontPadding: false,
  },

  // Custom dhikr
  customSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 20,
    includeFontPadding: false,
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
    lineHeight: 18,
    includeFontPadding: false,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
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
    lineHeight: 24,
    includeFontPadding: false,
  },

  // Add dhikr modal input
  modalInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 48,
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
    lineHeight: 24,
    includeFontPadding: false,
  },
  compactTrackMeta: {
    fontSize: 12,
    fontFamily: fontRegular(),
    marginTop: 2,
    fontVariant: ['tabular-nums'] as const,
    lineHeight: 20,
    includeFontPadding: false,
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
    lineHeight: 22,
    includeFontPadding: false,
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
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 24,
    includeFontPadding: false,
  },
});
const styles = _styles;
