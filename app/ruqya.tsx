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
import { t } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BackButton } from '@/components/ui';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { transliterateReference } from '@/lib/source-transliteration';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing } from '@/constants/theme';
import { stripVerseNumbers } from '@/lib/basmala-utils';

const { width, height } = Dimensions.get('window');

// =====================================
// المكون الرئيسي
// =====================================

export default function RuqyaScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();
  const darkMode = isDarkMode;
  const language = (settings.language || 'ar') as Language;
  const isArabic = language === 'ar';

  // الحالة
  const [ruqyaList, setRuqyaList] = useState<Zikr[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [showTranslation, setShowTranslation] = useState(true);
  const [showTransliteration, setShowTransliteration] = useState(false);
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
  }, [loadData]);

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
    } else {
      // Loop back to start
      setCurrentIndex(0);
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCount = (item: Zikr) => {
    const currentCount = counts[item.id] || 0;
    if (currentCount >= item.count) {
      goToNext();
      return;
    }
    const newCount = currentCount + 1;
    setCounts(prev => ({ ...prev, [item.id]: newCount }));
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(newCount >= item.count ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
    } else {
      Vibration.vibrate(newCount >= item.count ? 100 : 30);
    }
    if (newCount >= item.count) {
      setTimeout(() => goToNext(), 400);
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
      const message = `${item.arabic}\n\n${translation}\n\n📖 ${item.reference}\n\n🔒 ${t('azkar.ruqya')}\n${t('common.fromApp')}`;
      
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
      let message = `🔒 ${t('azkar.ruqya')}\n\n`;
      
      ruqyaList.forEach((item, index) => {
        message += `${index + 1}. ${item.arabic}\n`;
        if (item.count > 1) message += `(${item.count} ${t('azkar.times')})\n`;
        message += '\n';
      });
      
      message += `\n${t('common.fromApp')}`;
      
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



            {/* النص الرئيسي — Arabic for Arabic users, translation for others */}
            {(() => {
              const hasVerseBrackets = item.arabic?.includes('﴿') || item.arabic?.includes('﴾');
              const quranStyle = hasVerseBrackets ? {
                fontFamily: 'KFGQPCUthmanic',
                fontSize: 30,
                lineHeight: 62,
                letterSpacing: 0,
                textAlign: 'center' as const,
                writingDirection: 'rtl' as const,
                paddingTop: 6,
                paddingBottom: 4,
              } : {};
              const displayText = hasVerseBrackets ? stripVerseNumbers(item.arabic) : item.arabic;
              return isArabic ? (
                <Text style={[styles.arabicText, { color: colors.text, writingDirection: 'rtl' }, quranStyle]}>
                  {displayText}
                </Text>
              ) : (
                <Text style={[styles.arabicText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }, quranStyle]}>
                  {getZikrTranslation(item, language) || displayText}
                </Text>
              );
            })()}

            {/* النطق */}
            {showTransliteration && item.transliteration && (
              <Text style={[styles.transliteration, { color: colors.textLight }]}>
                {item.transliteration}
              </Text>
            )}

            {/* Translation — only for Arabic users who want to see English */}
            {isArabic && showTranslation && (
              <Text style={[styles.translation, { color: colors.textLight, writingDirection: 'ltr', textAlign: 'left' }]}>
                {getZikrTranslation(item, 'en' as any)}
              </Text>
            )}

            {/* عدد التكرار */}
            {item.count > 1 && (
              <View style={[styles.countBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="repeat" size={16} color="#6366F1" />
                <Text style={styles.countText}>
                  {`${item.count} ${t('azkar.times')}`}
                </Text>
              </View>
            )}

            {/* الفضل — benefit text */}
            {item.benefit && (
              <View style={styles.benefitStarWrapper}>
                <View style={[styles.benefitStarCircle, { backgroundColor: '#6366F115' }]}>
                  <Ionicons name="star" size={16} color="#6366F1" />
                </View>
                <View style={[styles.benefitContainer, { backgroundColor: '#6366F115' }]}>
                  <Text style={[styles.benefitText, { color: '#6366F1' }]}>
                    {getZikrBenefit(item, language) || ''}
                  </Text>
                </View>
              </View>
            )}

            {/* المرجع */}
            <View style={[styles.referenceContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="book-outline" size={14} color={darkMode ? '#9CA3AF' : '#6B7280'} />
              <Text style={[styles.referenceText, { color: colors.textLight }]}>
                {transliterateReference(item.reference, language)}
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
          { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
        onPress={() => {
          setCurrentIndex(index);
          setViewMode('single');
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.listItemNumber]}>
          <Text style={styles.listItemNumberText}>{index + 1}</Text>
        </View>
        
        <View style={styles.listItemContent}>
          <Text 
            style={[styles.listItemArabic, { color: colors.text, textAlign: 'right', writingDirection: 'rtl' }]}
            numberOfLines={2}
          >
            {(item.arabic?.includes('﴿') || item.arabic?.includes('﴾')) ? stripVerseNumbers(item.arabic) : item.arabic}
          </Text>
          <Text style={[styles.listItemReference, { color: colors.textLight }]}>
            {transliterateReference(item.reference, language)}
          </Text>
        </View>

        <View style={[styles.listItemActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {item.count > 1 && (
            <View style={styles.listCountBadge}>
              <Text style={styles.listCountText}>{item.count}×</Text>
            </View>
          )}
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={darkMode ? '#6B7280' : '#9CA3AF'} />
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================
  // الرندر الرئيسي
  // =====================================

  if (ruqyaList.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
        <Text style={{ color: colors.text }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <BackgroundWrapper
        backgroundKey={settings.display.appBackground}
        backgroundUrl={settings.display.appBackgroundUrl}
        opacity={settings.display.backgroundOpacity ?? 1}
        style={[styles.container, { backgroundColor: 'transparent' }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { paddingTop: insets.top, backgroundColor: 'rgba(120,120,128,0.15)' }]}
        >
          <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <BackButton color={darkMode ? '#F9FAFB' : '#1F2937'} />
            
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                {t('azkar.ruqya')}
              </Text>
              <SectionInfoButton sectionKey="ruqya" />
            </View>
            
            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
            <View style={[styles.progressContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.progressBarBg, isRTL && { transform: [{ scaleX: -1 }] }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${((currentIndex + 1) / ruqyaList.length) * 100}%`, backgroundColor: darkMode ? '#A78BFA' : '#6366F1' },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
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

            {/* شريط العداد والتنقل */}
            <View style={[styles.bottomBar, { backgroundColor: 'rgba(120,120,128,0.12)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={goToPrevious}
                disabled={currentIndex === 0}
                style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              >
                <Ionicons
                  name={isRTL ? 'chevron-forward' : 'chevron-back'}
                  size={28}
                  color={currentIndex === 0 ? '#9CA3AF' : '#6366F1'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => ruqyaList[currentIndex] && handleCount(ruqyaList[currentIndex])}
                style={[
                  styles.counterButton,
                  {
                    backgroundColor: (counts[ruqyaList[currentIndex]?.id] || 0) >= (ruqyaList[currentIndex]?.count || 1) ? '#10B981' : '#6366F1',
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.counterText}>
                  {(counts[ruqyaList[currentIndex]?.id] || 0) >= (ruqyaList[currentIndex]?.count || 1) ? '✓' : `${counts[ruqyaList[currentIndex]?.id] || 0}/${ruqyaList[currentIndex]?.count || 1}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goToNext}
                style={styles.navButton}
              >
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={28}
                  color={'#6366F1'}
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
    gap: Spacing.sm,
  },
  headerButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
    flexDirection: 'row-reverse',
    marginBottom: 16,
    gap: Spacing.md,
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
    gap: Spacing.sm,
    marginBottom: 16,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
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
    alignItems: 'center',
    padding: 12,
    paddingTop: 22,
    borderRadius: 12,
  },
  benefitText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
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

  // List View
  listContainer: {
    padding: 16,
    gap: Spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: Spacing.md,
  },
  listItemNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
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
    writingDirection: 'rtl',
  },
  listItemReference: {
    fontSize: 12,
  },
  listItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
