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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
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
  updateZikrProgress,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  getFavorites,
} from '@/lib/azkar-api';
import { fetchSelectedDuas, getDailySelectedDuas, duaToZikr } from '@/lib/duas-api';
import { markAzkarCompleted, getTodayDate, DailyAzkarRecord } from '@/lib/worship-storage';
import { trackAzkarRead } from '@/lib/firebase-analytics';
import { t } from '@/lib/i18n';
import { useSettings } from '@/contexts/SettingsContext';
import { useGlobalAudio, type AudioTrack } from '@/contexts/GlobalAudioContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { BrandedCapture, BrandedCaptureHandle } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { transliterateReference } from '@/lib/source-transliteration';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing } from '@/constants/theme';
import { Image as ExpoImage } from 'expo-image';
import { BasmalaHeader } from '@/components/BasmalaHeader';
import { stripBasmalaPrefix, stripVerseNumbers } from '@/lib/basmala-utils';
import { searchPhotos, type Photo } from '@/lib/api/pexels';
import { LinearGradient } from 'expo-linear-gradient';

// Search terms per azkar category for background images
const CATEGORY_PHOTO_TERMS: Record<string, string[]> = {
  morning: ['beautiful sunrise sky', 'golden morning light nature', 'dawn sky clouds'],
  evening: ['beautiful sunset sky', 'golden hour landscape', 'dusk sky orange'],
  sleep: ['starry night sky', 'calm night moon', 'peaceful dark blue sky'],
  wakeup: ['fresh morning sunrise', 'early morning dew nature', 'dawn light forest'],
  after_prayer: ['peaceful mosque interior', 'calm nature green', 'serene landscape'],
  quran_duas: ['beautiful sky clouds', 'peaceful nature light', 'calm ocean horizon'],
  sunnah_duas: ['serene nature landscape', 'peaceful garden', 'calm river nature'],
  ruqya: ['peaceful sky light rays', 'calm nature morning', 'green forest light'],
  eating: ['nature garden flowers', 'peaceful green field', 'beautiful meadow'],
  mosque: ['beautiful mosque architecture', 'islamic architecture', 'mosque minaret sky'],
  house: ['peaceful home garden', 'calm interior plants', 'cozy nature'],
  travel: ['beautiful road landscape', 'mountain path scenic', 'desert horizon'],
  emotions: ['calm ocean waves', 'peaceful rain nature', 'serene lake reflection'],
  wudu: ['clear water stream', 'crystal water nature', 'peaceful waterfall'],
  nature: ['beautiful nature scenery', 'green forest aerial', 'mountain lake scenic'],
  fasting: ['golden crescent moon', 'peaceful sunset dates', 'calm evening sky'],
  protection: ['strong mountain landscape', 'peaceful fortress', 'calm sky light'],
  prayerSupplications: ['beautiful clouds sky', 'peaceful light rays', 'calm nature morning'],
  salawat: ['beautiful green dome', 'peaceful landscape green', 'serene garden light'],
  istighfar: ['peaceful rain drops', 'calm misty morning', 'forest light rays'],
};

// Map azkar category IDs → worship tracker keys
const WORSHIP_AZKAR_MAP: Partial<Record<AzkarCategoryType, keyof Omit<DailyAzkarRecord, 'date'>>> = {
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
  const { category } = useLocalSearchParams<{ category: AzkarCategoryType }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const { isDarkMode, settings } = useSettings();
  const darkMode = isDarkMode;

  // الحالة
  const [allAzkar, setAllAzkar] = useState<Zikr[]>([]);
  const [azkar, setAzkar] = useState<Zikr[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<AzkarCategory | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counts, setCounts] = useState<Record<number, number>>({});
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
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [categoryLocked, setCategoryLocked] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState('general');
  const [loadError, setLoadError] = useState(false);
  const isAfterPrayer = category === 'after_prayer';

  // Audio listen-all mode — restore if audio is already playing for this category
  const [listenMode, setListenMode] = useState(() => {
    return globalAudio.state.source === 'azkar' && 
           globalAudio.state.sourceRoute === `/azkar/${category}` &&
           (globalAudio.state.isPlaying || globalAudio.state.isLoading);
  });

  // Listen mode background photos
  const [listenPhotos, setListenPhotos] = useState<{ url: string; avgColor?: string }[]>([]);
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
  const brandedRef = useRef<BrandedCaptureHandle>(null);

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
    // تسجيل في تتبع العبادات
    if (category) {
      const worshipKey = WORSHIP_AZKAR_MAP[category];
      if (worshipKey) {
        await markAzkarCompleted(getTodayDate(), worshipKey);
      }

      // قفل أذكار الصباح والمساء حتى وقت التجديد
      if (category === 'morning' || category === 'evening') {
        const now = new Date();
        let unlockTime: Date;
        if (category === 'morning') {
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
        const lockKey = `azkar_lock_${category}`;
        await AsyncStorage.setItem(lockKey, JSON.stringify({ until: unlockTime.getTime() }));
        setCategoryLocked(true);
      }
    }

    // عرض بوب أب التحفيز
    setShowCompletionModal(true);
  }, [category]);

  const checkAllCompleted = useCallback((updatedCounts: Record<number, number>) => {
    return azkar.every(z => (updatedCounts[z.id] || 0) >= z.count);
  }, [azkar]);

  const handleCount = async (zikr: Zikr) => {
    if (categoryLocked) return;
    
    const currentCount = counts[zikr.id] || 0;
    
    if (currentCount >= zikr.count) {
      // انتهى العداد - انتقل للذكر التالي
      if (currentIndex < azkar.length - 1) {
        goToNext();
      }
      return;
    }

    const newCount = currentCount + 1;
    
    // تحديث العداد
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
      await updateZikrProgress(category, zikr.id, newCount);
    }

    // إذا اكتمل العداد
    if (newCount >= zikr.count) {
      // تسجيل إحصائيات القراءة في Firebase
      if (category) {
        trackAzkarRead(zikr.id, category, settings.language).catch(() => {});
      }

      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Vibration.vibrate([0, 100, 50, 100]);
      }

      const updatedCounts = { ...counts, [zikr.id]: newCount };
      
      // التحقق من اكتمال جميع الأذكار
      if (checkAllCompleted(updatedCounts)) {
        setTimeout(() => handleCategoryCompleted(), 500);
      } else {
        // انتقال تلقائي بعد ثانية
        setTimeout(() => {
          if (currentIndex < azkar.length - 1) {
            goToNext();
          }
        }, 1000);
      }
    }
  };

  // ===================================
  // التنقل
  // ===================================

  const goToNext = () => {
    if (currentIndex < azkar.length - 1) {
      setCurrentIndex(prev => prev + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      // تحديث أنيميشن التقدم
      Animated.timing(progressAnim, {
        toValue: (currentIndex + 2) / azkar.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      // Loop back to start — بدأت من جديد
      setCurrentIndex(0);
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
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

      Animated.timing(progressAnim, {
        toValue: currentIndex / azkar.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
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
      let message = zikr.arabic;
      if (!isCustom) {
        const translation = getZikrTranslation(zikr as Zikr, language);
        message = `${zikr.arabic}\n\n${translation}\n\n📖 ${(zikr as Zikr).reference}\n\n${t('azkar.fromApp')}`;
      } else if ((zikr as CustomDhikr).translation) {
        message = `${zikr.arabic}\n\n${(zikr as CustomDhikr).translation}\n\n${t('azkar.fromApp')}`;
      } else {
        message = `${zikr.arabic}\n\n${t('azkar.fromApp')}`;
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
    return audioQueue.map((item, index) => ({
      id: String(item.zikr.id),
      title: category?.includes('duas') ? t('azkar.duaNumber', { num: String(index + 1) }) : t('azkar.dhikrNumber', { num: String(index + 1) }),
      subtitle: categoryInfo ? getCategoryName(categoryInfo, language) : '',
      url: item.zikr.audio!,
    }));
  }, [audioQueue, categoryInfo]);

  const hasAudio = audioQueue.length > 0;

  // Derive playback state from global audio context
  const isGlobalAzkarPlaying = globalAudio.state.source === 'azkar';
  const audioQueueIndex = isGlobalAzkarPlaying ? globalAudio.state.queueIndex : -1;
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
    if (audioPlaying) {
      // Toggle pause/resume via global context
      await globalAudio.togglePlayPause();
      return;
    }
    // Start from beginning
    setListenMode(true);
    setAudioPlaying(true);
    await globalAudio.playAzkarQueue(audioTracks, 0, `/azkar/${category}`);
  }, [audioPlaying, audioTracks, globalAudio, category]);

  const handleStopListening = useCallback(async () => {
    await globalAudio.stop();
    setAudioPlaying(false);
    setAudioLoading(false);
    setListenMode(false);
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

  // Fetch background photos for listen mode
  useEffect(() => {
    if (!listenMode || !category) return;
    let cancelled = false;
    (async () => {
      try {
        const cacheKey = `@azkar_listen_photos_${category}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const oneDay = 24 * 60 * 60 * 1000;
          if (parsed.ts && Date.now() - parsed.ts < oneDay && parsed.photos?.length > 0) {
            if (!cancelled) setListenPhotos(parsed.photos);
            return;
          }
        }
        const terms = CATEGORY_PHOTO_TERMS[category] || CATEGORY_PHOTO_TERMS.morning;
        const photos: { url: string; avgColor?: string }[] = [];
        for (const term of terms) {
          try {
            const data = await searchPhotos(term, 1, 5, 'portrait');
            if (data.photos?.length > 0) {
              for (const p of data.photos) {
                photos.push({ url: p.src.large || p.src.medium, avgColor: p.avg_color });
              }
            }
          } catch { /* skip */ }
          if (photos.length >= 8) break;
        }
        if (!cancelled && photos.length > 0) {
          setListenPhotos(photos);
          await AsyncStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), photos }));
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [listenMode, category]);

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
    const newIndex = audioQueueIndex >= 0 ? audioQueueIndex % listenPhotos.length : 0;
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
  }, [audioQueueIndex, listenMode]);

  // ===================================
  // إعادة تعيين العداد
  // ===================================

  const resetCount = (zikrId: number) => {
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
      <View style={[styles.loadingContainer, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={darkMode ? '#9CA3AF' : '#6B7280'} />
        <Text style={{ color: darkMode ? '#FFF' : '#000', marginTop: 12, fontSize: 16 }}>{t('azkar.noDataSection')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#2f7659', borderRadius: 20 }}>
          <Text style={{ color: '#FFF', fontSize: 16 }}>{t('azkar.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!categoryInfo || azkar.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#2f7659" />
        <Text style={{ color: darkMode ? '#FFF' : '#000', marginTop: 12 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  const currentZikr = azkar[currentIndex];
  const currentCount = counts[currentZikr.id] || 0;
  const isCompleted = currentCount >= currentZikr.count;
  const currentItemProgress = Math.min(1, currentCount / Math.max(1, currentZikr.count));
  const progress = (currentIndex + currentItemProgress) / azkar.length;
  const progressPercent = Math.round(progress * 100);

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
            
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
              <Text style={[styles.headerTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {category === 'sunnah_duas' ? t('azkar.selectedDuas') : getCategoryName(categoryInfo, language)}
              </Text>
              <SectionInfoButton sectionKey="azkar" />
            </View>
            
            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => setViewMode(v => v === 'card' ? 'list' : 'card')}
                style={styles.favoriteButton}
              >
                <MaterialCommunityIcons
                  name={viewMode === 'card' ? 'view-list' : 'card-text'}
                  size={24}
                  color={darkMode ? '#F9FAFB' : '#1F2937'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.favoriteButton}>
                <MaterialCommunityIcons name="plus-circle-outline" size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/all-favorites' as any)} style={styles.favoriteButton}>
                <MaterialCommunityIcons name="bookmark-outline" size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openShareOptions(currentZikr)} style={styles.shareButton}>
                <MaterialCommunityIcons name="share-variant" size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
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
            scrollable
            style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 4 }}
          />
        )}

        {/* المحتوى */}
        {listenMode && hasAudio ? (
          /* === Listen Mode: Spotify-style Player === */
          <View style={{ flex: 1, backgroundColor: darkMode ? '#0a0a0a' : '#f0f0f0' }}>
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
                  numberOfLines={2}
                >
                  {audioQueueIndex >= 0
                    ? (category?.includes('duas') ? t('azkar.duaNumber', { num: String(audioQueueIndex + 1) }) : t('azkar.dhikrNumber', { num: String(audioQueueIndex + 1) }))
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
                  maximumTrackTintColor={darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                  thumbTintColor={categoryInfo.color}
                  onSlidingComplete={(val) => handleSeek(val * audioDuration)}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 12, fontFamily: fontRegular(), color: darkMode ? '#9CA3AF' : '#6B7280', fontVariant: ['tabular-nums'] }}>
                    {formatTime(audioPosition)}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: fontRegular(), color: darkMode ? '#9CA3AF' : '#6B7280', fontVariant: ['tabular-nums'] }}>
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
                  disabled={audioQueueIndex >= audioQueue.length - 1}
                  style={{ opacity: audioQueueIndex >= audioQueue.length - 1 ? 0.3 : 1, padding: 8 }}
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
                  const isCurrentTrack = index === audioQueueIndex;
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
                            writingDirection: isRTL ? 'rtl' : 'ltr',
                            lineHeight: 24,
                          }}
                          numberOfLines={1}
                        >
                          {category?.includes('duas') ? t('azkar.duaNumber', { num: String(index + 1) }) : t('azkar.dhikrNumber', { num: String(index + 1) })}
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
                  <GlassCard intensity={46} style={styles.zikrCardGlass}>
                    {/* أزرار الإجراءات */}
                    <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                    {/* Use Uthmanic font for Quran content (detected by verse brackets or known IDs) */}
                    {(() => {
                      const knownQuranIds = [48, 481, 482, 49];
                      const hasVerseBrackets = currentZikr.arabic?.includes('﴿') || currentZikr.arabic?.includes('﴾');
                      const isQuranSurah = knownQuranIds.includes(currentZikr.id) || hasVerseBrackets;
                      const { stripped, hadBasmala } = stripBasmalaPrefix(currentZikr.arabic);
                      const rawDisplay = hadBasmala ? stripped : currentZikr.arabic;
                      const displayText = isQuranSurah ? stripVerseNumbers(rawDisplay) : rawDisplay;
                      const quranFontStyle = isQuranSurah ? {
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
                        <>
                          {hadBasmala && (
                            <BasmalaHeader tintColor={darkMode ? '#D4A574' : '#C9A84C'} />
                          )}
                          {isArabic ? (
                            <Text style={[
                              styles.arabicText,
                              { color: darkMode ? '#F9FAFB' : '#1F2937' },
                              currentlyPlayingZikrId === currentZikr.id && { color: categoryInfo.color },
                              quranFontStyle,
                            ]}>
                              {displayText}
                            </Text>
                          ) : (
                            <Text style={[
                              styles.arabicText,
                              { color: darkMode ? '#F9FAFB' : '#1F2937', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                              currentlyPlayingZikrId === currentZikr.id && { color: categoryInfo.color },
                              quranFontStyle,
                            ]}>
                              {getZikrTranslation(currentZikr, language)}
                            </Text>
                          )}
                        </>
                      );
                    })()}

                    {/* النطق */}
                    {showTransliteration && currentZikr.transliteration && (
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
              {currentIndex === azkar.length - 1 && customAzkar.length > 0 && (
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
                          if (cdDone) return;
                          const next = cdCount + 1;
                          setCounts(prev => ({ ...prev, [cd.id as any]: next }));
                          if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            <View style={[styles.bottomBar, { backgroundColor: 'rgba(120,120,128,0.12)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
              const listDisplayText = isQuranItem ? stripVerseNumbers(rawListText) : rawListText;
              return (
                <View key={zikr.id} style={{ marginBottom: 10 }}>
                  {listItemHasBasmala && (
                    <BasmalaHeader tintColor={darkMode ? '#D4A574' : '#C9A84C'} style={{ marginBottom: 4 }} />
                  )}
                  <GlassCard intensity={40} style={[
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
                          { color: darkMode ? '#F9FAFB' : '#1F2937', fontSize: 18, marginBottom: 0, flex: 1, textAlign: isArabic ? 'right' : (isRTL ? 'right' : 'left'), writingDirection: isArabic ? 'rtl' : (isRTL ? 'rtl' : 'ltr') },
                          currentlyPlayingZikrId === zikr.id && { color: categoryInfo.color },
                          ([48, 481, 482, 49].includes(zikr.id) || zikr.arabic?.includes('﴿') || zikr.arabic?.includes('﴾')) && { fontFamily: 'KFGQPCUthmanic', fontSize: 22, lineHeight: 44 },
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
                            if (categoryLocked || zDone) return;
                            const next = zCount + 1;
                            setCounts(prev => ({ ...prev, [zikr.id]: next }));
                            if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (next >= zikr.count) {
                              if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              const updated = { ...counts, [zikr.id]: next };
                              if (checkAllCompleted(updated)) setTimeout(() => handleCategoryCompleted(), 500);
                            }
                            if (category) updateZikrProgress(category, zikr.id, next);
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
                        if (cdDone) return;
                        const next = cdCount + 1;
                        setCounts(prev => ({ ...prev, [cd.id as any]: next }));
                        if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        <View style={{ height: insets.bottom }} />
      </BackgroundWrapper>

      {/* Toast overlay for loop-back */}
      {toastMsg && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={[styles.toastBox, { backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.7)' }]}>
            <Text style={styles.toastText}>{toastMsg}</Text>
          </View>
        </View>
      )}

      {/* بوب أب اكتمال الأذكار */}
      <Modal
        visible={showCompletionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.modalEmoji}></Text>
            <Text style={[styles.modalTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
              {t('azkar.congratulations')}
            </Text>
            <Text style={[styles.modalSubtitle, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
              {t('azkar.completedSuccessfully', { name: categoryInfo ? getCategoryName(categoryInfo, language) : t('azkar.title') })}
            </Text>
            <Text style={[styles.modalDua, { color: categoryInfo?.color || '#10B981' }]}>
              {t('azkar.mayAllahAccept')}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: categoryInfo?.color || '#10B981' }]}
              onPress={() => {
                setShowCompletionModal(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>{t('azkar.alhamdulillah')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* بوب أب القفل */}
      {categoryLocked && (
        <Modal visible={categoryLocked} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' }]}>
              <Text style={styles.modalEmoji}></Text>
              <Text style={[styles.modalTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                {t('azkar.alreadyCompleted')}
              </Text>
              <Text style={[styles.modalSubtitle, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
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
          <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', width: '100%' }]}>
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

      {/* Unified BrandedCapture for image sharing */}
      <BrandedCapture ref={brandedRef}>
        <View style={{ alignItems: 'center', padding: 8 }}>
          <Text style={{
            fontSize: 18, fontFamily: fontBold(), textAlign: 'center',
            lineHeight: 34, color: '#FFFFFF',
          }}>
            {shareTargetZikr?.arabic || ''}
          </Text>
          {'reference' in (shareTargetZikr || {}) && (shareTargetZikr as Zikr)?.reference ? (
            <Text style={{
              fontSize: 14, fontFamily: fontSemiBold(), textAlign: 'center',
              color: 'rgba(255,255,255,0.7)', marginTop: 12,
            }}>
              {transliterateReference((shareTargetZikr as Zikr).reference, language)}
            </Text>
          ) : null}
        </View>
      </BrandedCapture>
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
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
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
    padding: 12,
    paddingTop: 22,
    borderRadius: 12,
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
});
