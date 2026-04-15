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
  ScrollView,
  TouchableOpacity,
  Keyboard,
  Animated,
  Share,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';

import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BackButton } from '@/components/ui';
import { Colors, DarkColors } from '@/constants/theme';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { transliterateReference } from '@/lib/source-transliteration';
import { stripAzkarBrackets } from '@/lib/basmala-utils';
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
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
  // true = expanded, undefined/false = collapsed (default collapsed)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Main category IDs shown on the primary azkar page (in order)
  const MAIN_CAT_ORDER = ['1', '1b', '2', '3', '27'];

  // Group benefits by category for SectionList
  const benefitSections = useMemo(() => {
    const grouped: Record<string, Zikr[]> = {};
    for (const z of allAzkarWithBenefits) {
      if (!grouped[z.category]) grouped[z.category] = [];
      grouped[z.category].push(z);
    }
    const sections = Object.entries(grouped).map(([catId, data]) => {
      const cat = getCategoryById(catId as any);
      const title = cat ? getCategoryName(cat, language) : catId;
      const color = cat?.color || '#10B981';
      return { title, color, catId, data };
    });
    // Sort: main categories first (in their defined order), then the rest
    sections.sort((a, b) => {
      const aIdx = MAIN_CAT_ORDER.indexOf(a.catId);
      const bIdx = MAIN_CAT_ORDER.indexOf(b.catId);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return 0;
    });
    return sections;
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
  // القسم القابل للطي
  // ==========================

  const toggleSection = (catId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => ({ ...prev, [catId]: !prev[catId] }));
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
            { backgroundColor: darkMode ? DarkColors.surfaceVariant : Colors.surface },
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
            style={[styles.arabicText, { color: colors.text }]}
            numberOfLines={3}
          >
            {stripAzkarBrackets(item.arabic)}
          </Text>

          {/* الترجمة */}
          <Text
            style={[styles.translation, { color: colors.textLight }]}
            numberOfLines={2}
          >
            {getZikrTranslation(item, language)}
          </Text>

          {/* الإجراءات */}
          <View style={[styles.resultActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.referenceContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="book-outline" size={12} color={colors.textLight} />
              <Text style={[styles.referenceText, { color: colors.textLight }]}>
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
                  color={favorites[item.id] ? '#EF4444' : (colors.textLight)}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => shareZikr(item)}
                style={styles.actionButton}
              >
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={colors.textLight}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
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
        { backgroundColor: darkMode ? DarkColors.surfaceVariant : Colors.surface, flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      onPress={() => handleSearch(search)}
    >
      <Ionicons name="time-outline" size={18} color={colors.textLight} />
      <Text style={[styles.recentText, { color: colors.text }]}>
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
            <BackButton color={colors.text} />

            {isBenefitsMode ? (
              <Text numberOfLines={1} style={[styles.benefitsHeaderTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('azkarSearch.virtueOfAzkar')}
              </Text>
            ) : (
              <View style={[
                styles.searchContainer,
                { backgroundColor: darkMode ? DarkColors.surfaceVariant : Colors.surface },
              ]}>
                <Ionicons name="search" size={20} color={colors.textLight} />
                <TextInput
                  ref={inputRef}
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder={t('azkar.searchPlaceholder')}
                  placeholderTextColor={colors.textLight}
                  value={query}
                  onChangeText={handleSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearch('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* المحتوى */}
        {isBenefitsMode ? (
          // وضع فضل الأذكار - عرض الأذكار مجمعة حسب التصنيف مع أقسام قابلة للطي
          <ScrollView
            contentContainerStyle={styles.benefitsContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Header with Stats */}
            <View style={[styles.statsHeader, { backgroundColor: darkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)' }]}>
              <View style={styles.statsIconWrapper}>
                <Ionicons name="sparkles" size={24} color="#10B981" />
              </View>
              <View style={styles.statsTextWrapper}>
                <Text style={[styles.statsTitle, { color: colors.text }]}>
                  {t('azkarSearch.virtueOfAzkar')}
                </Text>
                <Text style={[styles.statsSubtitle, { color: colors.textLight }]}>
                  {language === 'ar' 
                    ? `${allAzkarWithBenefits.length} ذكر في ${benefitSections.length} قسم`
                    : `${allAzkarWithBenefits.length} adhkar in ${benefitSections.length} categories`
                  }
                </Text>
              </View>
            </View>

            {/* Collapsible Sections */}
            {benefitSections.map((section) => {
              const isExpanded = expandedSections[section.catId];
              const secColor = section.color;
              
              return (
                <View key={section.catId} style={styles.sectionWrapper}>
                  {/* Section Header - Tappable */}
                  <TouchableOpacity
                    style={[
                      styles.sectionHeader, 
                      { 
                        flexDirection: isRTL ? 'row-reverse' : 'row', 
                        backgroundColor: darkMode ? secColor + '18' : secColor + '12',
                        borderColor: secColor + '30',
                      }
                    ]}
                    onPress={() => toggleSection(section.catId)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.sectionHeaderLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.sectionHeaderDot, { backgroundColor: secColor }]} />
                      <Text style={[styles.sectionHeaderText, { color: darkMode ? '#fff' : '#1a1a1a' }]}>
                        {section.title}
                      </Text>
                      <View style={[styles.sectionBadge, { backgroundColor: secColor + '25' }]}>
                        <Text style={[styles.sectionBadgeText, { color: secColor }]}>
                          {section.data.length}
                        </Text>
                      </View>
                    </View>
                    <Ionicons 
                      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={secColor} 
                    />
                  </TouchableOpacity>

                  {/* Section Content - Collapsible */}
                  {isExpanded && (
                    <View style={styles.sectionContent}>
                      {section.data.map((item) => {
                        const benefit = getZikrBenefit(item, language);
                        const catColor = secColor;

                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.benefitCard,
                              { 
                                backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)',
                                borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                              },
                            ]}
                            onPress={() => navigateToZikr(item)}
                            activeOpacity={0.7}
                          >
                            {/* الفضل في الأعلى */}
                            {benefit ? (
                              <View style={[styles.benefitHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <View style={[styles.benefitIconCircle, { backgroundColor: catColor + '20' }]}>
                                  <Ionicons name="sparkles" size={16} color={catColor} />
                                </View>
                                <Text 
                                  style={[
                                    styles.benefitHeaderText, 
                                    { 
                                      color: catColor, 
                                      textAlign: isRTL ? 'right' : 'left',
                                      writingDirection: 'rtl',
                                    }
                                  ]}
                                  numberOfLines={2}
                                >
                                  {benefit}
                                </Text>
                              </View>
                            ) : null}

                            {/* النص العربي */}
                            <Text
                              style={[styles.benefitArabicText, { color: colors.text }]}
                              numberOfLines={3}
                            >
                              {stripAzkarBrackets(item.arabic)}
                            </Text>

                            {/* المرجع في الأسفل */}
                            <View style={[styles.benefitFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                              <Ionicons name="book-outline" size={13} color={colors.textLight} />
                              <Text style={[styles.benefitReference, { color: colors.textLight }]}>
                                {transliterateReference(item.reference, language)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Empty State */}
            {benefitSections.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="star-outline" size={64} color={darkMode ? '#374151' : '#D1D5DB'} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t('azkarSearch.noAzkarWithVirtue')}
                </Text>
              </View>
            )}
          </ScrollView>
        ) : query.length < 2 ? (
          // البحث الأخير
          <View style={styles.recentContainer}>
            {recentSearches.length > 0 && (
              <>
                <View style={[styles.recentHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.recentTitle, { color: colors.text }]}>
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
              <Ionicons name="bulb-outline" size={24} color={darkMode ? '#F59E0B' : '#B57200'} />
              <Text style={[styles.tipsTitle, { color: colors.text }]}>
                {t('azkarSearch.searchTips')}
              </Text>
              <Text style={[styles.tipsText, { color: colors.textLight }]}>
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
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('azkar.noResults')}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
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
              <Text style={[styles.resultsCount, { color: colors.textLight }]}>
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

const _styles = StyleSheet.create({
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
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 20,
    includeFontPadding: false,
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
    lineHeight: 20,
    includeFontPadding: false,
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
    lineHeight: 28,
    includeFontPadding: false,
  },
  clearText: {
    fontSize: 14,
    color: '#EF4444',
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 28,
    includeFontPadding: false,
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
    lineHeight: 30,
    includeFontPadding: false,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 24,
    includeFontPadding: false,
  },
  benefitsHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 30,
    includeFontPadding: false,
    paddingHorizontal: 6,
  },
  // Benefits Container
  benefitsContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  // Stats Header - New design
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  statsIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsTextWrapper: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    includeFontPadding: false,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  statsSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: false,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  // Section Wrapper
  sectionWrapper: {
    marginBottom: 12,
  },
  sectionContent: {
    paddingTop: 8,
  },
  // Benefit Card Styles
  benefitCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
  },
  benefitHeader: {
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  benefitIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },
  benefitArabicText: {
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 30,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  benefitFooter: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  benefitReference: {
    fontSize: 12,
    lineHeight: 20,
    includeFontPadding: false,
  },
  // Section Header - Collapsible
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionHeaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 24,
    includeFontPadding: false,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
    marginRight: 6,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    includeFontPadding: false,
  },
  sectionHeaderCount: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 22,
    includeFontPadding: false,
  },
});
