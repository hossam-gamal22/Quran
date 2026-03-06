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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

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
} from '@/lib/azkar-api';
import { markAzkarCompleted, getTodayDate, DailyAzkarRecord } from '@/lib/worship-storage';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
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
  const [azkar, setAzkar] = useState<Zikr[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<AzkarCategory | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const language = (settings.language || 'ar') as Language;
  const [showTranslation, setShowTranslation] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [categoryLocked, setCategoryLocked] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

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
      // تحميل الإعدادات
      const [storedShowTranslation, storedShowTransliteration] = 
        await Promise.all([
          AsyncStorage.getItem('azkar_show_translation'),
          AsyncStorage.getItem('azkar_show_transliteration'),
        ]);

      if (storedShowTranslation !== null) setShowTranslation(JSON.parse(storedShowTranslation));
      if (storedShowTransliteration !== null) setShowTransliteration(JSON.parse(storedShowTransliteration));

      // تحميل الفئة والأذكار
      const catInfo = getCategoryById(category);
      const categoryAzkar = getAzkarByCategory(category);
      
      setCategoryInfo(catInfo || null);
      setAzkar(categoryAzkar);

      // تحميل العدادات والمفضلة
      const initialCounts: Record<number, number> = {};
      const initialFavorites: Record<number, boolean> = {};
      
      for (const zikr of categoryAzkar) {
        initialCounts[zikr.id] = 0;
        initialFavorites[zikr.id] = await isFavorite(zikr.id);
      }
      
      setCounts(initialCounts);
      setFavorites(initialFavorites);

      // التحقق من حالة القفل (صباح/مساء)
      if (category === 'morning' || category === 'evening') {
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
      }

      // تشغيل الأنيميشن
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error loading category data:', error);
    }
  }, [category, fadeAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const shareZikr = async (zikr: Zikr) => {
    try {
      const translation = getZikrTranslation(zikr, language);
      const message = `${zikr.arabic}\n\n${translation}\n\n📖 ${zikr.reference}\n\nمن تطبيق روح المسلم`;
      
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // ===================================
  // تشغيل صوت الذكر
  // ===================================

  const playZikrAudio = async (zikr: Zikr) => {
    try {
      // إيقاف الصوت الحالي
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (audioPlaying) {
        setAudioPlaying(false);
        return;
      }

      setAudioLoading(true);

      // fallback TTS يغطي كل الأذكار عند غياب ملف صوت مباشر
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q=${encodeURIComponent(zikr.arabic)}`;
      const audioUrl = zikr.audio || ttsUrl;
      
      if (!audioUrl) {
        setAudioLoading(false);
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
          if (status.isLoaded && status.didJustFinish) {
            setAudioPlaying(false);
            soundRef.current = null;
          }
        }
      );

      soundRef.current = sound;
      setAudioPlaying(true);
    } catch (error) {
      console.error('Error playing azkar audio:', error);
    } finally {
      setAudioLoading(false);
    }
  };

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

  if (!categoryInfo || azkar.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        <Text style={{ color: darkMode ? '#FFF' : '#000' }}>جاري التحميل...</Text>
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
              <TouchableOpacity onPress={() => router.push('/(tabs)/favorites' as any)} style={styles.favoriteButton}>
                <MaterialCommunityIcons name="heart-outline" size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => shareZikr(currentZikr)} style={styles.shareButton}>
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
        </View>

        {/* المحتوى */}
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
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => playZikrAudio(currentZikr)}
                  style={styles.actionButton}
                >
                  {audioLoading ? (
                    <ActivityIndicator size="small" color={categoryInfo.color} />
                  ) : (
                    <MaterialCommunityIcons
                      name={audioPlaying ? 'pause-circle' : 'play-circle'}
                      size={26}
                      color={categoryInfo.color}
                    />
                  )}
                </TouchableOpacity>
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
              <Text style={[styles.arabicText, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
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
                <View style={[styles.benefitContainer, { backgroundColor: categoryInfo.color + '15' }]}> 
                  <MaterialCommunityIcons name="star" size={16} color={categoryInfo.color} />
                  <Text style={[styles.benefitText, { color: categoryInfo.color }]}> 
                    {getZikrBenefit(currentZikr, language)}
                  </Text>
                </View>
              )}
            </GlassCard>

          </Animated.View>
        </ScrollView>

        {/* شريط العداد والتنقل */}
        <View style={[styles.bottomBar, { backgroundColor: 'rgba(120,120,128,0.12)' }]}>
          {/* زر السابق */}
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

          {/* العداد */}
          <TouchableOpacity
            onPress={() => handleCount(currentZikr)}
            style={[
              styles.counterButton,
              {
                backgroundColor: isCompleted ? '#10B981' : categoryInfo.color,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.counterText}>
              {isCompleted ? '✓' : currentCount}
            </Text>
            <Text style={styles.counterTotal}>
              / {currentZikr.count}
            </Text>
          </TouchableOpacity>

          {/* زر التالي */}
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
  benefitContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
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
});
