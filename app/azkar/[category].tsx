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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

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

const { width, height } = Dimensions.get('window');

// ===================================
// المكون الرئيسي
// ===================================

export default function CategoryAzkarScreen() {
  const { category } = useLocalSearchParams<{ category: AzkarCategoryType }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // الحالة
  const [azkar, setAzkar] = useState<Zikr[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<AzkarCategory | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<Language>('ar');
  const [showTranslation, setShowTranslation] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(false);

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
      const [storedDarkMode, storedLanguage, storedShowTranslation, storedShowTransliteration] = 
        await Promise.all([
          AsyncStorage.getItem('darkMode'),
          AsyncStorage.getItem('app_language'),
          AsyncStorage.getItem('azkar_show_translation'),
          AsyncStorage.getItem('azkar_show_transliteration'),
        ]);

      if (storedDarkMode !== null) setDarkMode(JSON.parse(storedDarkMode));
      if (storedLanguage) setLanguage(storedLanguage as Language);
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

  const handleCount = async (zikr: Zikr) => {
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

      // انتقال تلقائي بعد ثانية
      setTimeout(() => {
        if (currentIndex < azkar.length - 1) {
          goToNext();
        }
      }, 1000);
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

  const shareZikr = async (zikr: Zikr) => {
    try {
      const translation = getZikrTranslation(zikr, language);
      const message = `${zikr.arabic}\n\n${translation}\n\n📖 ${zikr.reference}\n\nمن تطبيق القرآن والأذكار`;
      
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

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
  const progress = (currentIndex + 1) / azkar.length;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={[styles.container, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        {/* Header */}
        <LinearGradient
          colors={[categoryInfo.color, categoryInfo.color + 'CC']}
          style={[styles.header, { paddingTop: insets.top }]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle} numberOfLines={1}>
              {getCategoryName(categoryInfo, language)}
            </Text>
            
            <TouchableOpacity onPress={() => shareZikr(currentZikr)} style={styles.shareButton}>
              <Ionicons name="share-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentIndex + 1} / {azkar.length}
            </Text>
          </View>
        </LinearGradient>

        {/* المحتوى */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.zikrCard,
              {
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* أزرار الإجراءات */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => toggleFavorite(currentZikr.id)}
                style={styles.actionButton}
              >
                <Ionicons
                  name={favorites[currentZikr.id] ? 'heart' : 'heart-outline'}
                  size={24}
                  color={favorites[currentZikr.id] ? '#EF4444' : (darkMode ? '#9CA3AF' : '#6B7280')}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => resetCount(currentZikr.id)}
                style={styles.actionButton}
              >
                <Ionicons
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
                <Ionicons name="star" size={16} color={categoryInfo.color} />
                <Text style={[styles.benefitText, { color: categoryInfo.color }]}>
                  {getZikrBenefit(currentZikr, language)}
                </Text>
              </View>
            )}

            {/* المرجع */}
            <View style={styles.referenceContainer}>
              <Ionicons name="book-outline" size={14} color={darkMode ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.referenceText, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                {currentZikr.reference}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* شريط العداد والتنقل */}
        <View style={[styles.bottomBar, { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' }]}>
          {/* زر السابق */}
          <TouchableOpacity
            onPress={goToPrevious}
            disabled={currentIndex === 0}
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          >
            <Ionicons
              name="chevron-back"
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
            <Ionicons
              name="chevron-forward"
              size={28}
              color={currentIndex === azkar.length - 1 ? '#9CA3AF' : categoryInfo.color}
            />
          </TouchableOpacity>
        </View>

        {/* مساحة آمنة */}
        <View style={{ height: insets.bottom }} />
      </View>
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
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  shareButton: {
    padding: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  progressText: {
    color: '#FFFFFF',
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
  zikrCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
});
