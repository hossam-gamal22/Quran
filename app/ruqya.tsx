// app/ruqya.tsx
// صفحة الرقية الشرعية - النظام الجديد
// =====================================

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
  FlatList,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import {
  Zikr,
  Language,
  getRuqya,
  getZikrTranslation,
  getZikrBenefit,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
} from '@/lib/azkar-api';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BannerAdComponent } from '@/components/ads/BannerAd';

const { width, height } = Dimensions.get('window');

// =====================================
// المكون الرئيسي
// =====================================

export default function RuqyaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const { isDarkMode, settings } = useSettings();
  const darkMode = isDarkMode;
  const language = (settings.language || 'ar') as Language;

  // الحالة
  const [ruqyaList, setRuqyaList] = useState<Zikr[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [showTranslation, setShowTranslation] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'list'>('single');

  // الأنيميشن
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // =====================================
  // تحميل البيانات
  // =====================================

  const loadData = useCallback(async () => {
    try {
      // تحميل الإعدادات
      const [storedShowTranslation, storedShowTransliteration, storedViewMode] = 
        await Promise.all([
          AsyncStorage.getItem('ruqya_show_translation'),
          AsyncStorage.getItem('ruqya_show_transliteration'),
          AsyncStorage.getItem('ruqya_view_mode'),
        ]);

      if (storedShowTranslation !== null) setShowTranslation(JSON.parse(storedShowTranslation));
      if (storedShowTransliteration !== null) setShowTransliteration(JSON.parse(storedShowTransliteration));
      if (storedViewMode) setViewMode(storedViewMode as 'single' | 'list');

      // تحميل الرقية من JSON
      const ruqya = getRuqya();
      setRuqyaList(ruqya);

      // تحميل المفضلة
      const initialFavorites: Record<number, boolean> = {};
      for (const item of ruqya) {
        initialFavorites[item.id] = await isFavorite(item.id);
      }
      setFavorites(initialFavorites);

      // تشغيل الأنيميشن
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error loading ruqya data:', error);
    }
  }, [fadeAnim]);

  useEffect(() => {
    loadData();
    
    // تنظيف الصوت عند الخروج
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [loadData]);

  // =====================================
  // تشغيل الصوت
  // =====================================

  const playAudio = async (audioUrl: string | undefined, id: number, textForTts: string) => {
    try {
      // إيقاف الصوت الحالي
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (playingId === id && isPlaying) {
        // إيقاف نفس الصوت
        setIsPlaying(false);
        setPlayingId(null);
        return;
      }

      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q=${encodeURIComponent(textForTts)}`;
      const resolvedAudioUrl = audioUrl || ttsUrl;

      // تشغيل الصوت الجديد
      const { sound } = await Audio.Sound.createAsync(
        { uri: resolvedAudioUrl },
        { shouldPlay: true }
      );
      
      soundRef.current = sound;
      setIsPlaying(true);
      setPlayingId(id);

      // عند انتهاء الصوت
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setPlayingId(null);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      setPlayingId(null);
    }
  };

  // =====================================
  // التنقل
  // =====================================

  const goToNext = () => {
    if (currentIndex < ruqyaList.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  // =====================================
  // المفضلة
  // =====================================

  const toggleFavorite = async (id: number) => {
    const isCurrentlyFavorite = favorites[id];
    
    if (isCurrentlyFavorite) {
      await removeFromFavorites(id);
    } else {
      await addToFavorites(id);
    }
    
    setFavorites(prev => ({ ...prev, [id]: !isCurrentlyFavorite }));
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // =====================================
  // المشاركة
  // =====================================

  const shareRuqya = async (item: Zikr) => {
    try {
      const translation = getZikrTranslation(item, language);
      const message = `${item.arabic}\n\n${translation}\n\n📖 ${item.reference}\n\n🔒 الرؤية الشرعية\nمن تطبيق روح المسلم`;
      
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // =====================================
  // مشاركة الكل
  // =====================================

  const shareAll = async () => {
    try {
      let message = '🔒 الرؤية الشرعية\n\n';
      
      ruqyaList.forEach((item, index) => {
        message += `${index + 1}. ${item.arabic}\n`;
        if (item.count > 1) message += `(${item.count} مرات)\n`;
        message += '\n';
      });
      
      message += '\nمن تطبيق روح المسلم';
      
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing all:', error);
    }
  };

  // =====================================
  // تبديل وضع العرض
  // =====================================

  const toggleViewMode = async () => {
    const newMode = viewMode === 'single' ? 'list' : 'single';
    setViewMode(newMode);
    await AsyncStorage.setItem('ruqya_view_mode', newMode);
  };

  // =====================================
  // رندر العنصر الواحد (Single View)
  // =====================================

  const renderSingleItem = ({ item, index }: { item: Zikr; index: number }) => {
    return (
      <View style={[styles.singleItemContainer, { width }]}>
        <ScrollView 
          contentContainerStyle={styles.singleItemScroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.ruqyaCard,
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
                onPress={() => toggleFavorite(item.id)}
                style={styles.actionButton}
              >
                <Ionicons
                  name={favorites[item.id] ? 'heart' : 'heart-outline'}
                  size={24}
                  color={favorites[item.id] ? '#EF4444' : (darkMode ? '#9CA3AF' : '#6B7280')}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => playAudio(item.audio, item.id, item.arabic)}
                style={styles.actionButton}
              >
                <Ionicons
                  name={playingId === item.id && isPlaying ? 'pause-circle' : 'play-circle'}
                  size={28}
                  color="#6366F1"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => shareRuqya(item)}
                style={styles.actionButton}
              >
                <Ionicons
                  name="share-outline"
                  size={22}
                  color={darkMode ? '#9CA3AF' : '#6B7280'}
                />
              </TouchableOpacity>
            </View>

            {/* رقم الآية */}
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>

            {/* النص العربي */}
            <Text style={[styles.arabicText, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
              {item.arabic}
            </Text>

            {/* النطق */}
            {showTransliteration && item.transliteration && (
              <Text style={[styles.transliteration, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                {item.transliteration}
              </Text>
            )}

            {/* الترجمة */}
            {showTranslation && (
              <Text style={[styles.translation, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                {getZikrTranslation(item, language)}
              </Text>
            )}

            {/* عدد التكرار */}
            {item.count > 1 && (
              <View style={styles.countBadge}>
                <Ionicons name="repeat" size={16} color="#6366F1" />
                <Text style={styles.countText}>
                  {language === 'ar' ? `${item.count} مرات` : `${item.count} times`}
                </Text>
              </View>
            )}

            {/* الفضل */}
            {item.benefit && (
              <View style={[styles.benefitContainer, { backgroundColor: '#6366F115' }]}>
                <Ionicons name="star" size={16} color="#6366F1" />
                <Text style={[styles.benefitText, { color: '#6366F1' }]}>
                  {getZikrBenefit(item, language)}
                </Text>
              </View>
            )}

            {/* المرجع */}
            <View style={styles.referenceContainer}>
              <Ionicons name="book-outline" size={14} color={darkMode ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.referenceText, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                {item.reference}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  };

  // =====================================
  // رندر القائمة (List View)
  // =====================================

  const renderListItem = ({ item, index }: { item: Zikr; index: number }) => {
    return (
      <TouchableOpacity
        style={[
          styles.listItem,
          { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' },
        ]}
        onPress={() => {
          setCurrentIndex(index);
          setViewMode('single');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.listItemNumber}>
          <Text style={styles.listItemNumberText}>{index + 1}</Text>
        </View>
        
        <View style={styles.listItemContent}>
          <Text 
            style={[styles.listItemArabic, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}
            numberOfLines={2}
          >
            {item.arabic}
          </Text>
          <Text style={[styles.listItemReference, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
            {item.reference}
          </Text>
        </View>

        <View style={styles.listItemActions}>
          {item.count > 1 && (
            <View style={styles.listCountBadge}>
              <Text style={styles.listCountText}>{item.count}×</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={darkMode ? '#6B7280' : '#9CA3AF'} />
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================
  // الرندر الرئيسي
  // =====================================

  if (ruqyaList.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        <Text style={{ color: darkMode ? '#FFF' : '#000' }}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
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
              <Ionicons name="arrow-back" size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
              {language === 'ar' ? 'الرؤية الشرعية' : 'Legal Sighting'}
            </Text>
            
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={toggleViewMode} style={styles.headerButton}>
                <Ionicons name={viewMode === 'single' ? 'list' : 'albums'} size={22} color={darkMode ? '#F9FAFB' : '#1F2937'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={shareAll} style={styles.headerButton}>
                <Ionicons name="share-outline" size={22} color={darkMode ? '#F9FAFB' : '#1F2937'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress */}
          {viewMode === 'single' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${((currentIndex + 1) / ruqyaList.length) * 100}%`, backgroundColor: darkMode ? '#A78BFA' : '#6366F1' },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: darkMode ? '#D1D5DB' : '#4B5563' }]}>
                {currentIndex + 1} / {ruqyaList.length}
              </Text>
            </View>
          )}
        </View>

        {/* المحتوى */}
        {viewMode === 'single' ? (
          <>
            <FlatList
              ref={flatListRef}
              data={ruqyaList}
              renderItem={renderSingleItem}
              keyExtractor={item => item.id.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentIndex(index);
              }}
              initialScrollIndex={currentIndex}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
            />

            {/* أزرار التنقل */}
            <View style={[styles.navigationBar, { backgroundColor: 'rgba(120,120,128,0.12)' }]}>
              <TouchableOpacity
                onPress={goToPrevious}
                disabled={currentIndex === 0}
                style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              >
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={currentIndex === 0 ? '#9CA3AF' : '#6366F1'}
                />
                <Text style={[
                  styles.navButtonText,
                  { color: currentIndex === 0 ? '#9CA3AF' : '#6366F1' }
                ]}>
                  {language === 'ar' ? 'السابق' : 'Previous'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goToNext}
                disabled={currentIndex === ruqyaList.length - 1}
                style={[styles.navButton, currentIndex === ruqyaList.length - 1 && styles.navButtonDisabled]}
              >
                <Text style={[
                  styles.navButtonText,
                  { color: currentIndex === ruqyaList.length - 1 ? '#9CA3AF' : '#6366F1' }
                ]}>
                  {language === 'ar' ? 'التالي' : 'Next'}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={28}
                  color={currentIndex === ruqyaList.length - 1 ? '#9CA3AF' : '#6366F1'}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <FlatList
            data={ruqyaList}
            renderItem={renderListItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* مساحة آمنة */}
        <BannerAdComponent screen="ruqya" />
        <View style={{ height: insets.bottom }} />
      </BackgroundWrapper>
    </>
  );
}

// =====================================
// الأنماط
// =====================================

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
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  progressContainer: {
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

  // Single View
  singleItemContainer: {
    flex: 1,
  },
  singleItemScroll: {
    padding: 16,
    paddingBottom: 100,
  },
  ruqyaCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
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
  numberBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  arabicText: {
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 20,
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
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
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

  // Navigation Bar
  navigationBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // List View
  listContainer: {
    padding: 16,
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  listItemNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listItemContent: {
    flex: 1,
  },
  listItemArabic: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'right',
  },
  listItemReference: {
    fontSize: 12,
  },
  listItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listCountBadge: {
    backgroundColor: '#6366F115',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  listCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
});
