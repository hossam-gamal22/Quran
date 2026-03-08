// app/azkar/[category].tsx
// صفحة عرض الأذكار حسب الفئة
// ===================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  Vibration,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  I18nManager,
  TextInput,
  Alert,
  LayoutAnimation,
  UIManager,
  Image as RNImage,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';

import {
  Zikr,
  AzkarCategory,
  AzkarCategoryType,
  Language,
  getAzkarByCategory,
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
import { markAzkarCompleted, getTodayDate, DailyAzkarRecord } from '@/lib/worship-storage';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { BannerAdComponent } from '@/components/ads/BannerAd';

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
  const [showTranslation, setShowTranslation] = useState(settings.display.showTranslation ?? false);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [categoryLocked, setCategoryLocked] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState('general');
  const [loadError, setLoadError] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isAfterPrayer = category === 'after_prayer';

  // Audio listen-all mode
  const [listenMode, setListenMode] = useState(false);
  const [audioQueueIndex, setAudioQueueIndex] = useState(-1);
  const [audioPaused, setAudioPaused] = useState(false);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

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
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareTargetZikr, setShareTargetZikr] = useState<Zikr | CustomDhikr | null>(null);
  const [shareStep, setShareStep] = useState<'options' | 'colorPicker'>('options');
  const [selectedShareBg, setSelectedShareBg] = useState<string>('#1a1a2e');
  const [selectedShareType, setSelectedShareType] = useState<'solid' | 'gradient' | 'custom'>('solid');
  const [customBgUri, setCustomBgUri] = useState<string | null>(null);

  // ViewShot ref for image export
  const viewShotRef = useRef<ViewShot>(null);

  const SHARE_BG_COLORS = [
    { color: '#1a1a2e', label: 'كحلي', textColor: '#FFFFFF' },
    { color: '#1B5E20', label: 'أخضر', textColor: '#FFFFFF' },
    { color: '#0D47A1', label: 'أزرق', textColor: '#FFFFFF' },
    { color: '#000000', label: 'أسود', textColor: '#FFFFFF' },
    { color: '#004D40', label: 'تيل', textColor: '#FFFFFF' },
    { color: '#FAFAFA', label: 'أبيض', textColor: '#1F2937' },
  ];

  const SHARE_BG_GRADIENTS = [
    { id: 'green', label: 'أخضر', colors: ['#1B5E20', '#4CAF50'] as [string, string], textColor: '#FFFFFF' },
    { id: 'blue', label: 'أزرق', colors: ['#0D47A1', '#42A5F5'] as [string, string], textColor: '#FFFFFF' },
    { id: 'purple', label: 'بنفسجي', colors: ['#4A148C', '#AB47BC'] as [string, string], textColor: '#FFFFFF' },
  ];

  const getShareTextColor = () => {
    if (selectedShareType === 'custom') return '#FFFFFF';
    if (selectedShareType === 'gradient') {
      return SHARE_BG_GRADIENTS.find(g => g.id === selectedShareBg)?.textColor || '#FFFFFF';
    }
    const solid = SHARE_BG_COLORS.find(c => c.color === selectedShareBg);
    return solid?.textColor || '#FFFFFF';
  };

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
      // 1. تحميل الفئة والأذكار أولاً (بيانات محلية - لا تفشل)
      const catInfo = getCategoryById(category);
      const categoryAzkar = getAzkarByCategory(category);

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
      language === 'ar' ? 'حذف الذكر' : 'Delete Dhikr',
      language === 'ar' ? 'هل تريد حذف هذا الذكر المخصص؟' : 'Delete this custom dhikr?',
      [
        { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: language === 'ar' ? 'حذف' : 'Delete',
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
      // إيقاف الصوت عند التنقل
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
        setAudioPlaying(false);
      }
      setCurrentIndex(prev => prev + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      
      // تحديث أنيميشن التقدم
      Animated.timing(progressAnim, {
        toValue: (currentIndex + 2) / azkar.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      // إيقاف الصوت عند التنقل
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
        setAudioPlaying(false);
      }
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
    setShareStep('options');
    setSelectedShareBg('#1B6B3A');
    setShowShareSheet(true);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const shareAsText = async (zikr: Zikr | CustomDhikr) => {
    try {
      const isCustom = 'createdAt' in zikr;
      let message = zikr.arabic;
      if (!isCustom) {
        const translation = getZikrTranslation(zikr as Zikr, language);
        message = `${zikr.arabic}\n\n${translation}\n\n📖 ${(zikr as Zikr).reference}\n\nمن تطبيق روح المسلم`;
      } else if ((zikr as CustomDhikr).translation) {
        message = `${zikr.arabic}\n\n${(zikr as CustomDhikr).translation}\n\nمن تطبيق روح المسلم`;
      } else {
        message = `${zikr.arabic}\n\nمن تطبيق روح المسلم`;
      }
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setShowShareSheet(false);
      setShareStep('options');
    }
  };

  const shareAsImage = async () => {
    try {
      if (!viewShotRef.current) return;
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1.0,
        width: 1080,
        height: 1350,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'مشاركة الذكر' });
      }
    } catch (error) {
      console.error('Error sharing image:', error);
    } finally {
      setShowShareSheet(false);
      setShareStep('options');
    }
  };

  const pickCustomBackground = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setCustomBgUri(result.assets[0].uri);
        setSelectedShareType('custom');
        setSelectedShareBg('custom');
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };
  // ===================================

  // Build audio queue from azkar that have audio URLs
  const audioQueue = React.useMemo(() => {
    return azkar
      .map((z, idx) => ({ zikr: z, originalIndex: idx }))
      .filter(item => !!item.zikr.audio);
  }, [azkar]);

  const hasAudio = audioQueue.length > 0;

  const stopAllAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setAudioPlaying(false);
    setAudioLoading(false);
    setAudioQueueIndex(-1);
    setAudioPaused(false);
    setAudioPosition(0);
    setAudioDuration(0);
  }, []);

  const playAudioAtIndex = useCallback(async (queueIdx: number) => {
    if (queueIdx < 0 || queueIdx >= audioQueue.length) {
      // Finished all
      await stopAllAudio();
      return;
    }

    try {
      // Unload previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setAudioLoading(true);
      setAudioQueueIndex(queueIdx);
      setAudioPaused(false);

      const audioUrl = audioQueue[queueIdx].zikr.audio;
      if (!audioUrl) {
        // Skip items without audio
        playAudioAtIndex(queueIdx + 1);
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setAudioPosition(status.positionMillis || 0);
            setAudioDuration(status.durationMillis || 0);
            if (status.didJustFinish) {
              // Auto-advance to next
              playAudioAtIndex(queueIdx + 1);
            }
          }
        }
      );

      soundRef.current = sound;
      setAudioPlaying(true);
    } catch (error) {
      console.error('Error playing azkar audio:', error);
      // Try next on error
      playAudioAtIndex(queueIdx + 1);
    } finally {
      setAudioLoading(false);
    }
  }, [audioQueue, stopAllAudio]);

  const handleListenAll = useCallback(async () => {
    if (audioPlaying) {
      // Toggle pause/resume
      if (soundRef.current) {
        if (audioPaused) {
          await soundRef.current.playAsync();
          setAudioPaused(false);
        } else {
          await soundRef.current.pauseAsync();
          setAudioPaused(true);
        }
      }
      return;
    }
    // Start from beginning
    setListenMode(true);
    playAudioAtIndex(0);
  }, [audioPlaying, audioPaused, playAudioAtIndex]);

  const handleStopListening = useCallback(async () => {
    await stopAllAudio();
    setListenMode(false);
  }, [stopAllAudio]);

  const handleNextTrack = useCallback(async () => {
    if (audioQueueIndex < audioQueue.length - 1) {
      playAudioAtIndex(audioQueueIndex + 1);
    }
  }, [audioQueueIndex, audioQueue.length, playAudioAtIndex]);

  const handlePrevTrack = useCallback(async () => {
    if (audioQueueIndex > 0) {
      playAudioAtIndex(audioQueueIndex - 1);
    }
  }, [audioQueueIndex, playAudioAtIndex]);

  const handleSeek = useCallback(async (value: number) => {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(value);
    }
  }, []);

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

  // تنظيف الصوت عند الخروج
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

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
        <Text style={{ color: darkMode ? '#FFF' : '#000', marginTop: 12, fontSize: 16 }}>لا توجد بيانات لهذا القسم</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#2f7659', borderRadius: 20 }}>
          <Text style={{ color: '#FFF', fontSize: 16 }}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!categoryInfo || azkar.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#2f7659" />
        <Text style={{ color: darkMode ? '#FFF' : '#000', marginTop: 12 }}>جاري التحميل...</Text>
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
        style={[styles.container, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { paddingTop: insets.top, backgroundColor: 'rgba(120,120,128,0.15)' }]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]} numberOfLines={1}>
              {getCategoryName(categoryInfo, language)}
            </Text>
            
            <View style={styles.headerActions}>
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
                <MaterialCommunityIcons name="heart-outline" size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openShareOptions(currentZikr)} style={styles.shareButton}>
                <MaterialCommunityIcons name="share-variant" size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
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

          {/* Read / Listen Mode Toggle */}
          {hasAudio && (
            <View style={styles.modeToggleRow}>
              <TouchableOpacity
                onPress={() => { handleStopListening(); setListenMode(false); }}
                style={[
                  styles.modeToggleButton,
                  !listenMode && { backgroundColor: categoryInfo.color },
                  listenMode && { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <Text style={{ fontSize: 14, marginRight: 4 }}>📖</Text>
                <Text style={[
                  styles.modeToggleText,
                  { color: !listenMode ? '#FFFFFF' : (darkMode ? '#D1D5DB' : '#4B5563') },
                ]}>
                  {language === 'ar' ? 'القراءة' : 'Read'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setListenMode(true); if (!audioPlaying) handleListenAll(); }}
                style={[
                  styles.modeToggleButton,
                  listenMode && { backgroundColor: categoryInfo.color },
                  !listenMode && { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <Text style={{ fontSize: 14, marginRight: 4 }}>🎧</Text>
                <Text style={[
                  styles.modeToggleText,
                  { color: listenMode ? '#FFFFFF' : (darkMode ? '#D1D5DB' : '#4B5563') },
                ]}>
                  {language === 'ar' ? 'الاستماع' : 'Listen'}
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
            style={{ marginHorizontal: 16, marginBottom: 4 }}
          />
        )}

        {/* المحتوى */}
        {listenMode && hasAudio ? (
          /* === Listen Mode: Audio-Only Interface === */
          <View style={styles.listenModeContainer}>
            <GlassCard intensity={46} style={styles.listenModeCard}>
              <MaterialCommunityIcons
                name="headphones"
                size={80}
                color={categoryInfo.color}
                style={{ marginBottom: 24 }}
              />

              <Text style={[styles.listenModeIndex, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                {language === 'ar' ? 'الذكر الحالي' : 'Current'}: {audioQueueIndex >= 0 ? audioQueueIndex + 1 : 0} / {audioQueue.length}
              </Text>

              <Text
                style={[styles.listenModeTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}
                numberOfLines={2}
              >
                {audioQueueIndex >= 0 && audioQueueIndex < audioQueue.length
                  ? audioQueue[audioQueueIndex].zikr.arabic.substring(0, 80) + (audioQueue[audioQueueIndex].zikr.arabic.length > 80 ? '...' : '')
                  : (language === 'ar' ? 'اضغط للتشغيل' : 'Tap to play')}
              </Text>

              {/* Controls */}
              <View style={styles.listenModeControls}>
                <TouchableOpacity
                  onPress={handlePrevTrack}
                  disabled={audioQueueIndex <= 0}
                  style={{ opacity: audioQueueIndex <= 0 ? 0.3 : 1 }}
                >
                  <MaterialCommunityIcons
                    name="skip-previous"
                    size={40}
                    color={darkMode ? '#D1D5DB' : '#4B5563'}
                  />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleListenAll} style={styles.listenModePlayBtn}>
                  {audioLoading ? (
                    <ActivityIndicator size="large" color={categoryInfo.color} />
                  ) : (
                    <MaterialCommunityIcons
                      name={audioPlaying && !audioPaused ? 'pause-circle' : 'play-circle'}
                      size={64}
                      color={categoryInfo.color}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleNextTrack}
                  disabled={audioQueueIndex >= audioQueue.length - 1}
                  style={{ opacity: audioQueueIndex >= audioQueue.length - 1 ? 0.3 : 1 }}
                >
                  <MaterialCommunityIcons
                    name="skip-next"
                    size={40}
                    color={darkMode ? '#D1D5DB' : '#4B5563'}
                  />
                </TouchableOpacity>
              </View>

              {/* Progress Slider */}
              <View style={styles.listenModeSliderContainer}>
                <Slider
                  style={styles.listenModeSlider}
                  minimumValue={0}
                  maximumValue={audioDuration || 1}
                  value={audioPosition}
                  onSlidingComplete={handleSeek}
                  minimumTrackTintColor={categoryInfo.color}
                  maximumTrackTintColor={darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
                  thumbTintColor={categoryInfo.color}
                />
                <View style={styles.listenModeTimeRow}>
                  <Text style={[styles.listenModeTime, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                    {formatTime(audioPosition)}
                  </Text>
                  <Text style={[styles.listenModeTime, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                    {formatTime(audioDuration)}
                  </Text>
                </View>
              </View>

              {/* Track list indicator */}
              <View style={styles.listenModeTrackDots}>
                {audioQueue.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.listenModeTrackDot,
                      {
                        backgroundColor: i === audioQueueIndex
                          ? categoryInfo.color
                          : (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                      },
                      i === audioQueueIndex && styles.listenModeTrackDotActive,
                    ]}
                  />
                ))}
              </View>
            </GlassCard>

            {/* Stop button */}
            <TouchableOpacity
              onPress={handleStopListening}
              style={[styles.listenModeStopBtn, { borderColor: darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
            >
              <MaterialCommunityIcons name="close" size={20} color={darkMode ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.listenModeStopText, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                {language === 'ar' ? 'إيقاف الاستماع' : 'Stop Listening'}
              </Text>
            </TouchableOpacity>
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
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
                  <GlassCard intensity={46} style={styles.zikrCardGlass}>
                    {/* أزرار الإجراءات */}
                    <View style={styles.actionButtons}>
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

                    {/* النص العربي */}
                    <Text style={[
                      styles.arabicText,
                      { color: darkMode ? '#F9FAFB' : '#1F2937' },
                      currentlyPlayingZikrId === currentZikr.id && { color: categoryInfo.color },
                    ]}>
                      {currentZikr.arabic}
                    </Text>

                    {/* النطق */}
                    {showTransliteration && currentZikr.transliteration && (
                      <Text style={[styles.transliteration, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                        {currentZikr.transliteration}
                      </Text>
                    )}

                    {/* الترجمة */}
                    {showTranslation && (
                      <Text style={[styles.translation, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                        {getZikrTranslation(currentZikr, language)}
                      </Text>
                    )}

                    {/* الفضل */}
                    {currentZikr.benefit && (
                      <View style={styles.benefitStarWrapper}>
                        <View style={[styles.benefitStarCircle, { backgroundColor: categoryInfo.color + '15' }]}>
                          <MaterialCommunityIcons name="star" size={16} color={categoryInfo.color} />
                        </View>
                        <View style={[styles.benefitContainer, { backgroundColor: categoryInfo.color + '15' }]}> 
                          <Text style={[styles.benefitText, { color: categoryInfo.color }]}> 
                            {getZikrBenefit(currentZikr, language)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Watermark for image export */}
                    <Text style={styles.watermarkHidden}>روح المسلم</Text>
                  </GlassCard>
                </ViewShot>
              </Animated.View>

              {/* Custom dhikr after main ones (scroll below current card if at end) */}
              {currentIndex === azkar.length - 1 && customAzkar.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.customSectionTitle, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                    {language === 'ar' ? 'أذكار مخصصة' : 'Custom Adhkar'}
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
                          <Text style={[styles.arabicText, { color: darkMode ? '#F9FAFB' : '#1F2937', fontSize: 20 }]}>
                            {cd.arabic}
                          </Text>
                          {cd.translation && (
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

            {/* شريط العداد والتنقل */}
            <View style={[styles.bottomBar, { backgroundColor: 'rgba(120,120,128,0.12)' }]}>
              <TouchableOpacity
                onPress={goToPrevious}
                disabled={currentIndex === 0}
                style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
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
                  {isCompleted ? '✓' : currentCount}
                </Text>
                <Text style={styles.counterTotal}>/ {currentZikr.count}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goToNext}
                disabled={currentIndex === azkar.length - 1}
                style={[styles.navButton, currentIndex === azkar.length - 1 && styles.navButtonDisabled]}
              >
                <MaterialCommunityIcons
                  name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
                  size={28}
                  color={currentIndex === azkar.length - 1 ? '#9CA3AF' : categoryInfo.color}
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
              return (
                <View key={zikr.id} style={{ marginBottom: 10 }}>
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
                      style={styles.listCollapseHeader}
                    >
                      <View style={[styles.listItemBadge, { backgroundColor: categoryInfo.color + '20', position: 'relative', top: 0, left: 0 }]}>
                        <Text style={[styles.listItemBadgeText, { color: categoryInfo.color }]}>{idx + 1}</Text>
                      </View>
                      <Text
                        style={[
                          styles.arabicText,
                          { color: darkMode ? '#F9FAFB' : '#1F2937', fontSize: 18, marginBottom: 0, flex: 1, textAlign: 'right' },
                          currentlyPlayingZikrId === zikr.id && { color: categoryInfo.color },
                        ]}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {zikr.arabic}
                      </Text>
                      <View style={styles.listCollapseRight}>
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
                        <View style={[styles.actionButtons, { marginBottom: 8 }]}>
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

                        {showTranslation && (
                          <Text style={[styles.translation, { color: darkMode ? '#D1D5DB' : '#4B5563', fontSize: 14 }]}>
                            {getZikrTranslation(zikr, language)}
                          </Text>
                        )}

                        {zikr.benefit && (
                          <View style={[styles.listBenefitBox, { backgroundColor: categoryInfo.color + '12' }]}>
                            <MaterialCommunityIcons name="star" size={14} color={categoryInfo.color} />
                            <Text style={[styles.benefitText, { color: categoryInfo.color, fontSize: 13 }]}>
                              {getZikrBenefit(zikr, language)}
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
                          <Text style={styles.listCounterText}>{zDone ? '✓' : zCount} / {zikr.count}</Text>
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
                  {language === 'ar' ? 'أذكار مخصصة' : 'Custom Adhkar'}
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
                        <Text style={[styles.arabicText, { color: darkMode ? '#F9FAFB' : '#1F2937', fontSize: 20 }]}>
                          {cd.arabic}
                        </Text>
                        {cd.translation && (
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

      {/* بوب أب اكتمال الأذكار */}
      <Modal
        visible={showCompletionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={[styles.modalTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
              مبروك!
            </Text>
            <Text style={[styles.modalSubtitle, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
              تم اكتمال {categoryInfo ? getCategoryName(categoryInfo, language) : 'الأذكار'} بنجاح
            </Text>
            <Text style={[styles.modalDua, { color: categoryInfo?.color || '#10B981' }]}>
              تقبّل الله منك 🤲
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: categoryInfo?.color || '#10B981' }]}
              onPress={() => {
                setShowCompletionModal(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>الحمد لله</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* بوب أب القفل */}
      {categoryLocked && (
        <Modal visible={categoryLocked} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' }]}>
              <Text style={styles.modalEmoji}>✅</Text>
              <Text style={[styles.modalTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                تم الإكمال
              </Text>
              <Text style={[styles.modalSubtitle, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                لقد أكملت {categoryInfo ? getCategoryName(categoryInfo, language) : 'هذه الأذكار'} اليوم
              </Text>
              <Text style={[styles.modalDua, { color: categoryInfo?.color || '#10B981' }]}>
                ستتجدد في موعدها إن شاء الله
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: categoryInfo?.color || '#10B981' }]}
                onPress={() => router.back()}
              >
                <Text style={styles.modalButtonText}>حسناً</Text>
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
              {language === 'ar' ? 'إضافة ذكر مخصص' : 'Add Custom Dhikr'}
            </Text>

            <TextInput
              style={[styles.modalInput, {
                color: darkMode ? '#F9FAFB' : '#1F2937',
                backgroundColor: darkMode ? '#374151' : '#F3F4F6',
                textAlign: 'right',
              }]}
              placeholder={language === 'ar' ? 'النص العربي *' : 'Arabic text *'}
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
              placeholder={language === 'ar' ? 'عدد التكرار' : 'Repeat count'}
              placeholderTextColor={darkMode ? '#6B7280' : '#9CA3AF'}
              value={newDhikrCount}
              onChangeText={setNewDhikrCount}
              keyboardType="number-pad"
            />

            <TextInput
              style={[styles.modalInput, {
                color: darkMode ? '#F9FAFB' : '#1F2937',
                backgroundColor: darkMode ? '#374151' : '#F3F4F6',
                textAlign: 'right',
              }]}
              placeholder={language === 'ar' ? 'الترجمة (اختياري)' : 'Translation (optional)'}
              placeholderTextColor={darkMode ? '#6B7280' : '#9CA3AF'}
              value={newDhikrTranslation}
              onChangeText={setNewDhikrTranslation}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: darkMode ? '#374151' : '#E5E7EB', flex: 1 }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: categoryInfo?.color || '#10B981', flex: 1 }]}
                onPress={addCustomDhikr}
              >
                <Text style={styles.modalButtonText}>
                  {language === 'ar' ? 'إضافة' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* بوب أب خيارات المشاركة */}
      <Modal
        visible={showShareSheet}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowShareSheet(false); setShareStep('options'); }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setShowShareSheet(false); setShareStep('options'); }}
        >
          <View
            style={[styles.shareSheet, { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.shareSheetHandle} />
            <Text style={[styles.shareSheetTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
              {shareStep === 'options'
                ? (language === 'ar' ? 'مشاركة الذكر' : 'Share Dhikr')
                : (language === 'ar' ? 'اختر لون الخلفية' : 'Choose Background')}
            </Text>

            {/* Off-screen ViewShot for image capture (1080×1350 Instagram-ready) */}
            {shareTargetZikr && (
              <View style={{ position: 'absolute', left: -9999 }}>
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1, width: 1080, height: 1350 }}>
                  {(() => {
                    const txtColor = getShareTextColor();
                    const refBgColor = txtColor === '#FFFFFF' ? 'rgba(255,255,255,0.12)' : 'rgba(31,41,55,0.08)';
                    const refBorderColor = txtColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(31,41,55,0.15)';

                    const contentInner = (
                      <View style={{
                        flex: 1, width: '100%', alignItems: 'center',
                        justifyContent: 'center', padding: 60,
                      }}>
                        <Text style={{
                          fontSize: 36, color: txtColor, textAlign: 'center',
                          lineHeight: 68, fontWeight: '600', paddingHorizontal: 16,
                        }}>
                          {shareTargetZikr.arabic}
                        </Text>
                        {'reference' in shareTargetZikr && (shareTargetZikr as Zikr).reference ? (
                          <View style={{
                            backgroundColor: refBgColor, borderRadius: 24,
                            paddingHorizontal: 20, paddingVertical: 8, borderWidth: 1,
                            borderColor: refBorderColor, marginTop: 28,
                          }}>
                            <Text style={{ color: txtColor, fontWeight: '800', fontSize: 18, opacity: 0.8 }}>
                              {(shareTargetZikr as Zikr).reference}
                            </Text>
                          </View>
                        ) : null}
                        <Text style={{
                          color: txtColor, opacity: 0.5, fontSize: 16,
                          marginTop: 32, fontWeight: '600',
                        }}>
                          روح المسلم
                        </Text>
                      </View>
                    );

                    if (selectedShareType === 'gradient') {
                      const grad = SHARE_BG_GRADIENTS.find(g => g.id === selectedShareBg);
                      return (
                        <LinearGradient
                          colors={grad?.colors || ['#1B5E20', '#4CAF50']}
                          style={{ width: 1080, height: 1350 }}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          {contentInner}
                        </LinearGradient>
                      );
                    }

                    if (selectedShareType === 'custom' && customBgUri) {
                      return (
                        <View style={{ width: 1080, height: 1350, overflow: 'hidden' }}>
                          <RNImage
                            source={{ uri: customBgUri }}
                            style={{ position: 'absolute', width: 1080, height: 1350 }}
                            blurRadius={8}
                            resizeMode="cover"
                          />
                          <View style={{
                            position: 'absolute', width: 1080, height: 1350,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                          }} />
                          {contentInner}
                        </View>
                      );
                    }

                    return (
                      <View style={{
                        width: 1080, height: 1350,
                        backgroundColor: selectedShareBg,
                      }}>
                        {contentInner}
                      </View>
                    );
                  })()}
                </ViewShot>
              </View>
            )}

            {shareStep === 'options' ? (
              <>
                <TouchableOpacity
                  style={[styles.shareOption, { backgroundColor: darkMode ? '#374151' : '#F3F4F6' }]}
                  onPress={() => shareTargetZikr && shareAsText(shareTargetZikr)}
                >
                  <MaterialCommunityIcons name="text" size={24} color={categoryInfo?.color || '#10B981'} />
                  <Text style={[styles.shareOptionText, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                    {language === 'ar' ? 'مشاركة كنص' : 'Share as Text'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shareOption, { backgroundColor: darkMode ? '#374151' : '#F3F4F6' }]}
                  onPress={() => setShareStep('colorPicker')}
                >
                  <MaterialCommunityIcons name="image" size={24} color={categoryInfo?.color || '#10B981'} />
                  <Text style={[styles.shareOptionText, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                    {language === 'ar' ? 'مشاركة كصورة' : 'Share as Image'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <ScrollView style={{ maxHeight: height * 0.55 }} showsVerticalScrollIndicator={false}>
                {/* Section: Solid Colors */}
                <Text style={[styles.bgSectionLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                  {language === 'ar' ? 'ألوان' : 'Colors'}
                </Text>
                <View style={styles.colorPickerRow}>
                  {SHARE_BG_COLORS.map((item) => (
                    <TouchableOpacity
                      key={item.color}
                      onPress={() => {
                        setSelectedShareType('solid');
                        setSelectedShareBg(item.color);
                      }}
                      style={[
                        styles.colorPickerItem,
                        selectedShareType === 'solid' && selectedShareBg === item.color && {
                          borderColor: categoryInfo?.color || '#10B981',
                          borderWidth: 3,
                        },
                      ]}
                    >
                      <View style={[
                        styles.colorPickerSwatch,
                        { backgroundColor: item.color },
                        item.color === '#FAFAFA' && { borderWidth: 1, borderColor: '#D1D5DB' },
                      ]} />
                      <Text style={[styles.colorPickerLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Section: Gradients */}
                <Text style={[styles.bgSectionLabel, { color: darkMode ? '#9CA3AF' : '#6B7280', marginTop: 12 }]}>
                  {language === 'ar' ? 'تدرجات' : 'Gradients'}
                </Text>
                <View style={styles.colorPickerRow}>
                  {SHARE_BG_GRADIENTS.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        setSelectedShareType('gradient');
                        setSelectedShareBg(item.id);
                      }}
                      style={[
                        styles.colorPickerItem,
                        selectedShareType === 'gradient' && selectedShareBg === item.id && {
                          borderColor: categoryInfo?.color || '#10B981',
                          borderWidth: 3,
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={item.colors}
                        style={[styles.colorPickerSwatch, { borderRadius: 20 }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Text style={[styles.colorPickerLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {/* Upload custom background */}
                  <TouchableOpacity
                    onPress={pickCustomBackground}
                    style={[
                      styles.colorPickerItem,
                      selectedShareType === 'custom' && {
                        borderColor: categoryInfo?.color || '#10B981',
                        borderWidth: 3,
                      },
                    ]}
                  >
                    {customBgUri ? (
                      <RNImage source={{ uri: customBgUri }} style={[styles.colorPickerSwatch, { borderRadius: 20 }]} />
                    ) : (
                      <View style={[styles.colorPickerSwatch, {
                        backgroundColor: darkMode ? '#374151' : '#E5E7EB',
                        alignItems: 'center', justifyContent: 'center',
                      }]}>
                        <MaterialCommunityIcons name="image-plus" size={20} color={darkMode ? '#9CA3AF' : '#6B7280'} />
                      </View>
                    )}
                    <Text style={[styles.colorPickerLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                      {language === 'ar' ? 'صورة' : 'Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Preview */}
                <Text style={[styles.bgSectionLabel, { color: darkMode ? '#9CA3AF' : '#6B7280', marginTop: 12 }]}>
                  {language === 'ar' ? 'معاينة' : 'Preview'}
                </Text>
                <View style={[styles.sharePreviewContainer, {
                  borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }]}>
                  {(() => {
                    const previewTxtColor = getShareTextColor();
                    const previewContent = (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                        <Text style={{
                          color: previewTxtColor, fontSize: 14, fontWeight: '600',
                          textAlign: 'center', lineHeight: 26,
                        }} numberOfLines={4}>
                          {shareTargetZikr?.arabic || ''}
                        </Text>
                        {'reference' in (shareTargetZikr || {}) && (shareTargetZikr as Zikr)?.reference ? (
                          <Text style={{ color: previewTxtColor, opacity: 0.7, fontSize: 10, marginTop: 8 }}>
                            {(shareTargetZikr as Zikr).reference}
                          </Text>
                        ) : null}
                        <Text style={{ color: previewTxtColor, opacity: 0.4, fontSize: 9, marginTop: 6 }}>
                          روح المسلم
                        </Text>
                      </View>
                    );

                    if (selectedShareType === 'gradient') {
                      const grad = SHARE_BG_GRADIENTS.find(g => g.id === selectedShareBg);
                      return (
                        <LinearGradient
                          colors={grad?.colors || ['#1B5E20', '#4CAF50']}
                          style={styles.sharePreviewInner}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          {previewContent}
                        </LinearGradient>
                      );
                    }
                    if (selectedShareType === 'custom' && customBgUri) {
                      return (
                        <View style={styles.sharePreviewInner}>
                          <RNImage
                            source={{ uri: customBgUri }}
                            style={StyleSheet.absoluteFill}
                            blurRadius={8}
                            resizeMode="cover"
                          />
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
                          {previewContent}
                        </View>
                      );
                    }
                    return (
                      <View style={[styles.sharePreviewInner, {
                        backgroundColor: selectedShareBg,
                      }]}>
                        {previewContent}
                      </View>
                    );
                  })()}
                </View>

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.shareOption, {
                      backgroundColor: darkMode ? '#374151' : '#F3F4F6', flex: 1,
                      justifyContent: 'center',
                    }]}
                    onPress={() => setShareStep('options')}
                  >
                    <MaterialCommunityIcons name="arrow-right" size={20} color={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <Text style={[styles.shareOptionText, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                      {language === 'ar' ? 'رجوع' : 'Back'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.shareOption, {
                      backgroundColor: categoryInfo?.color || '#10B981', flex: 2,
                      justifyContent: 'center',
                    }]}
                    onPress={() => shareTargetZikr && shareAsImage()}
                  >
                    <MaterialCommunityIcons name="share-variant" size={20} color="#FFFFFF" />
                    <Text style={[styles.shareOptionText, { color: '#FFFFFF' }]}>
                      {language === 'ar' ? 'مشاركة' : 'Share'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
    gap: 4,
  },
  favoriteButton: {
    padding: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 12,
    minWidth: 50,
    textAlign: 'right',
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
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  arabicText: {
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 42,
    textAlign: 'center',
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
    gap: 6,
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
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 120,
  },
  counterText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  counterTotal: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
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
    gap: 10,
  },
  listCollapseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    gap: 6,
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

  // Share sheet
  shareSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  shareSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,128,0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  shareSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    gap: 14,
  },
  shareOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  colorPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6,
  },
  colorPickerItem: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorPickerSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  colorPickerLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  sharePreview: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharePreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 4,
    aspectRatio: 4 / 5,
    width: '100%',
  },
  sharePreviewInner: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
  },
  bgSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  // Mode toggle (Read / Listen)
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Listen Mode: Audio-Only Interface
  listenModeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  listenModeCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  listenModeIndex: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  listenModeTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 32,
    writingDirection: 'rtl',
    paddingHorizontal: 8,
  },
  listenModeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 24,
  },
  listenModePlayBtn: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenModeSliderContainer: {
    width: '100%',
    marginBottom: 16,
  },
  listenModeSlider: {
    width: '100%',
    height: 40,
  },
  listenModeTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  listenModeTime: {
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  listenModeTrackDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  listenModeTrackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listenModeTrackDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  listenModeStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  listenModeStopText: {
    fontSize: 14,
    fontWeight: '600',
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
});
