// app/azkar-search.tsx
// شاشة البحث في الأذكار
// ==========================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  SectionList,
  TouchableOpacity,
  Keyboard,
  Animated,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BackButton } from '@/components/ui';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { transliterateReference } from '@/lib/source-transliteration';
import {
  Zikr,
  Language,
  searchAzkar,
  getAllAzkar,
  getAllCategories,
  getZikrTranslation,
  getZikrBenefit,
  getCategoryById,
  getCategoryName,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
} from '@/lib/azkar-api';

// ==========================
// المكون الرئيسي
// ==========================

export default function AzkarSearchScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const darkMode = isDarkMode;
  const language = (settings.language || 'ar') as Language;
  const isBenefitsMode = mode === 'benefits';

  // الحالة
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Zikr[]>([]);
  const [allAzkarWithBenefits, setAllAzkarWithBenefits] = useState<Zikr[]>([]);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Group benefits by category for SectionList
  const benefitSections = useMemo(() => {
    const grouped: Record<string, Zikr[]> = {};
    for (const z of allAzkarWithBenefits) {
      if (!grouped[z.category]) grouped[z.category] = [];
      grouped[z.category].push(z);
    }
    return Object.entries(grouped).map(([catId, data]) => {
      const cat = getCategoryById(catId as any);
      const title = cat ? getCategoryName(cat, language) : catId;
      const color = cat?.color || '#10B981';
      return { title, color, catId, data };
    });
  }, [allAzkarWithBenefits, language]);

  // الأنيميشن
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ==========================
  // تحميل البيانات
  // ==========================

  const loadSettings = useCallback(async () => {
    try {
      const storedRecent = await AsyncStorage.getItem('azkar_recent_searches');
      if (storedRecent) setRecentSearches(JSON.parse(storedRecent));

      // في وضع فضل الأذكار، نعرض جميع الأذكار التي لها فضل
      if (isBenefitsMode) {
        const all = getAllAzkar().filter(z => {
          const benefit = getZikrBenefit(z, language);
          return benefit && benefit.trim().length > 0;
        });
        setAllAzkarWithBenefits(all);

        // تحميل المفضلة
        const favs: Record<number, boolean> = {};
        for (const zikr of all) {
          favs[zikr.id] = await isFavorite(zikr.id);
        }
        setFavorites(favs);
      } else {
        // تركيز على حقل البحث
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [isBenefitsMode, language]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ==========================
  // البحث
  // ==========================

  const handleSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // البحث في الأذكار
    const searchResults = searchAzkar(searchQuery, language);
    setResults(searchResults);

    // تحميل المفضلة للنتائج
    const favs: Record<number, boolean> = {};
    for (const zikr of searchResults) {
      favs[zikr.id] = await isFavorite(zikr.id);
    }
    setFavorites(favs);

    // أنيميشن
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setIsSearching(false);
  }, [language, fadeAnim]);

  // ==========================
  // حفظ البحث الأخير
  // ==========================

  const saveRecentSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery),
    ].slice(0, 10);

    setRecentSearches(updated);
    await AsyncStorage.setItem('azkar_recent_searches', JSON.stringify(updated));
  };

  // ==========================
  // مسح البحث الأخير
  // ==========================

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem('azkar_recent_searches');
  };

  // ==========================
  // التنقل للذكر
  // ==========================

  const navigateToZikr = (zikr: Zikr) => {
    saveRecentSearch(query);
    Keyboard.dismiss();
    
    router.push({
      pathname: '/azkar/[category]',
      params: { category: zikr.category },
    });
  };

  // ==========================
  // المفضلة
  // ==========================

  const toggleFavorite = async (id: number) => {
    const isCurrentlyFavorite = favorites[id];
    
    if (isCurrentlyFavorite) {
      await removeFromFavorites(id);
    } else {
      await addToFavorites(id);
    }
    
    setFavorites(prev => ({ ...prev, [id]: !isCurrentlyFavorite }));
  };

  // ==========================
  // المشاركة
  // ==========================

  const shareZikr = async (zikr: Zikr) => {
    try {
      const translation = getZikrTranslation(zikr, language);
      const message = `${zikr.arabic}\n\n${translation}\n\n📖 ${transliterateReference(zikr.reference, language)}\n\n${t('common.fromApp')}`;
      
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // ==========================
  // رندر نتيجة البحث
  // ==========================

  const renderSearchResult = ({ item }: { item: Zikr }) => {
    const category = getCategoryById(item.category);
    const categoryName = category ? getCategoryName(category, language) : '';

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={[
            styles.resultCard,
            { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' },
          ]}
          onPress={() => navigateToZikr(item)}
          activeOpacity={0.7}
        >
          {/* التصنيف */}
          <View style={[styles.categoryBadge, { backgroundColor: category?.color + '20', alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.categoryBadgeText, { color: category?.color }]}>
              {categoryName}
            </Text>
          </View>

          {/* النص العربي */}
          <Text
            style={[styles.arabicText, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}
            numberOfLines={3}
          >
            {item.arabic}
          </Text>

          {/* الترجمة */}
          <Text
            style={[styles.translation, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}
            numberOfLines={2}
          >
            {getZikrTranslation(item, language)}
          </Text>

          {/* الإجراءات */}
          <View style={[styles.resultActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.referenceContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="book-outline" size={12} color={darkMode ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.referenceText, { color: darkMode ? '#6B7280' : '#9CA3AF' }]}>
                {transliterateReference(item.reference, language)}
              </Text>
            </View>

            <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => toggleFavorite(item.id)}
                style={styles.actionButton}
              >
                <Ionicons
                  name={favorites[item.id] ? 'heart' : 'heart-outline'}
                  size={20}
                  color={favorites[item.id] ? '#EF4444' : (darkMode ? '#6B7280' : '#9CA3AF')}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => shareZikr(item)}
                style={styles.actionButton}
              >
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={darkMode ? '#6B7280' : '#9CA3AF'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ==========================
  // رندر ذكر مع الفضل
  // ==========================

  const renderBenefitItem = ({ item }: { item: Zikr }) => {
    const cat = getCategoryById(item.category);
    const categoryName = cat ? getCategoryName(cat, language) : '';
    const benefit = getZikrBenefit(item, language);

    return (
      <TouchableOpacity
        style={[
          styles.resultCard,
          { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' },
        ]}
        onPress={() => navigateToZikr(item)}
        activeOpacity={0.7}
      >
        {/* التصنيف */}
        <View style={[styles.categoryBadge, { backgroundColor: (cat?.color || '#10B981') + '20', alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.categoryBadgeText, { color: cat?.color || '#10B981' }]}>
            {categoryName}
          </Text>
        </View>

        {/* النص — translated for non-Arabic */}
        <Text
          style={[styles.arabicText, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}
          numberOfLines={3}
        >
          {getZikrTranslation(item, language)}
        </Text>

        {/* الفضل */}
        {benefit ? (
          <View style={[styles.benefitBox, { backgroundColor: (cat?.color || '#10B981') + '12', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="star" size={14} color={cat?.color || '#10B981'} />
            <Text style={[styles.benefitText, { color: cat?.color || '#10B981' }]}>
              {benefit}
            </Text>
          </View>
        ) : null}

        {/* المرجع */}
        <View style={[styles.referenceContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="book-outline" size={12} color={darkMode ? '#6B7280' : '#9CA3AF'} />
          <Text style={[styles.referenceText, { color: darkMode ? '#6B7280' : '#9CA3AF' }]}>
            {transliterateReference(item.reference, language)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ==========================
  // رندر البحث الأخير
  // ==========================

  const renderRecentSearch = (search: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.recentItem,
        { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF', flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      onPress={() => handleSearch(search)}
    >
      <Ionicons name="time-outline" size={18} color={darkMode ? '#6B7280' : '#9CA3AF'} />
      <Text style={[styles.recentText, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
        {search}
      </Text>
    </TouchableOpacity>
  );

  // ==========================
  // الرندر الرئيسي
  // ==========================

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        {/* Header مع البحث */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <BackButton color={darkMode ? '#F9FAFB' : '#1F2937'} />

            {isBenefitsMode ? (
              <Text style={[styles.benefitsHeaderTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                {t('azkarSearch.virtueOfAzkar')}
              </Text>
            ) : (
              <View style={[
                styles.searchContainer,
                { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' },
              ]}>
                <Ionicons name="search" size={20} color={darkMode ? '#6B7280' : '#9CA3AF'} />
                <TextInput
                  ref={inputRef}
                  style={[styles.searchInput, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}
                  placeholder={t('azkar.searchPlaceholder')}
                  placeholderTextColor={darkMode ? '#6B7280' : '#9CA3AF'}
                  value={query}
                  onChangeText={handleSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearch('')}>
                    <Ionicons name="close-circle" size={20} color={darkMode ? '#6B7280' : '#9CA3AF'} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* المحتوى */}
        {isBenefitsMode ? (
          // وضع فضل الأذكار - عرض الأذكار مجمعة حسب التصنيف
          <SectionList
            sections={benefitSections}
            renderItem={renderBenefitItem}
            renderSectionHeader={({ section }) => (
              <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
                <View style={[styles.sectionHeaderDot, { backgroundColor: (section as any).color }]} />
                <Text style={[styles.sectionHeaderText, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionHeaderCount, { color: darkMode ? '#6B7280' : '#9CA3AF' }]}>
                  ({section.data.length})
                </Text>
              </View>
            )}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.resultsContainer}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled
            ListHeaderComponent={
              <Text style={[styles.resultsCount, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                {`${allAzkarWithBenefits.length} ${t('azkarSearch.hasVirtue')}`}
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="star-outline" size={64} color={darkMode ? '#374151' : '#D1D5DB'} />
                <Text style={[styles.emptyTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                  {t('azkarSearch.noAzkarWithVirtue')}
                </Text>
              </View>
            }
          />
        ) : query.length < 2 ? (
          // البحث الأخير
          <View style={styles.recentContainer}>
            {recentSearches.length > 0 && (
              <>
                <View style={[styles.recentHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.recentTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                    {t('azkarSearch.recentSearches')}
                  </Text>
                  <TouchableOpacity onPress={clearRecentSearches}>
                    <Text style={styles.clearText}>
                      {t('azkarSearch.clearAll')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.recentList}>
                  {recentSearches.map((search, index) => renderRecentSearch(search, index))}
                </View>
              </>
            )}

            {/* نصائح البحث */}
            <View style={styles.tipsContainer}>
              <Ionicons name="bulb-outline" size={24} color="#F59E0B" />
              <Text style={[styles.tipsTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                {t('azkarSearch.searchTips')}
              </Text>
              <Text style={[styles.tipsText, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                {language === 'ar'
                  ? '• ابحث بالنص العربي أو الترجمة\n• استخدم كلمات مفتاحية مثل "الصباح" أو "النوم"\n• يمكنك البحث بالمرجع مثل "البخاري"'
                  : '• Search in Arabic or translation\n• Use keywords like "morning" or "sleep"\n• You can search by reference like "Bukhari"'}
              </Text>
            </View>
          </View>
        ) : results.length === 0 && !isSearching ? (
          // لا توجد نتائج
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={darkMode ? '#374151' : '#D1D5DB'} />
            <Text style={[styles.emptyTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
              {t('azkar.noResults')}
            </Text>
            <Text style={[styles.emptyText, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
              {`${t('azkarSearch.noAzkarMatch')} "${query}"`}
            </Text>
          </View>
        ) : (
          // النتائج
          <FlatList
            data={results}
            renderItem={renderSearchResult}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.resultsContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <Text style={[styles.resultsCount, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
                {`${results.length} ${t('common.result')}`}
              </Text>
            }
          />
        )}
      </View>
      </BackgroundWrapper>
    </>
  );
}

// ==========================
// الأنماط
// ==========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  // النتائج
  resultsContainer: {
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    marginBottom: 12,
  },
  resultCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  arabicText: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 32,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  translation: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referenceText: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },

  // البحث الأخير
  recentContainer: {
    padding: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  clearText: {
    fontSize: 14,
    color: '#EF4444',
  },
  recentList: {
    gap: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  recentText: {
    fontSize: 14,
  },

  // النصائح
  tipsContainer: {
    marginTop: 32,
    alignItems: 'center',
    padding: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },

  // لا توجد نتائج
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  benefitsHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  benefitBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    gap: 8,
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 4,
  },
  sectionHeaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeaderCount: {
    fontSize: 13,
    fontWeight: '500',
  },
});
