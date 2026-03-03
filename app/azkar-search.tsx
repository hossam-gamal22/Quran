// app/azkar-search.tsx
// شاشة البحث في الأذكار
// ==========================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Keyboard,
  Animated,
  Share,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Zikr,
  Language,
  searchAzkar,
  getZikrTranslation,
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
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // الحالة
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Zikr[]>([]);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<Language>('ar');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // الأنيميشن
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ==========================
  // تحميل البيانات
  // ==========================

  const loadSettings = useCallback(async () => {
    try {
      const [storedDarkMode, storedLanguage, storedRecent] = await Promise.all([
        AsyncStorage.getItem('darkMode'),
        AsyncStorage.getItem('app_language'),
        AsyncStorage.getItem('azkar_recent_searches'),
      ]);

      if (storedDarkMode !== null) setDarkMode(JSON.parse(storedDarkMode));
      if (storedLanguage) setLanguage(storedLanguage as Language);
      if (storedRecent) setRecentSearches(JSON.parse(storedRecent));

      // تركيز على حقل البحث
      setTimeout(() => inputRef.current?.focus(), 300);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

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
      const message = `${zikr.arabic}\n\n${translation}\n\n📖 ${zikr.reference}\n\nمن تطبيق القرآن والأذكار`;
      
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
          <View style={[styles.categoryBadge, { backgroundColor: category?.color + '20' }]}>
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
          <View style={styles.resultActions}>
            <View style={styles.referenceContainer}>
              <Ionicons name="book-outline" size={12} color={darkMode ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.referenceText, { color: darkMode ? '#6B7280' : '#9CA3AF' }]}>
                {item.reference}
              </Text>
            </View>

            <View style={styles.actionButtons}>
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
  // رندر البحث الأخير
  // ==========================

  const renderRecentSearch = (search: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.recentItem,
        { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' },
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
      
      <View style={[styles.container, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
        {/* Header مع البحث */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={darkMode ? '#F9FAFB' : '#1F2937'} />
            </TouchableOpacity>

            <View style={[
              styles.searchContainer,
              { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' },
            ]}>
              <Ionicons name="search" size={20} color={darkMode ? '#6B7280' : '#9CA3AF'} />
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}
                placeholder={language === 'ar' ? 'ابحث في الأذكار...' : 'Search adhkar...'}
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
          </View>
        </View>

        {/* المحتوى */}
        {query.length < 2 ? (
          // البحث الأخير
          <View style={styles.recentContainer}>
            {recentSearches.length > 0 && (
              <>
                <View style={styles.recentHeader}>
                  <Text style={[styles.recentTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                    {language === 'ar' ? 'عمليات البحث الأخيرة' : 'Recent Searches'}
                  </Text>
                  <TouchableOpacity onPress={clearRecentSearches}>
                    <Text style={styles.clearText}>
                      {language === 'ar' ? 'مسح الكل' : 'Clear All'}
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
                {language === 'ar' ? 'نصائح للبحث' : 'Search Tips'}
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
              {language === 'ar' ? 'لا توجد نتائج' : 'No Results'}
            </Text>
            <Text style={[styles.emptyText, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
              {language === 'ar'
                ? `لم نجد أذكار تطابق "${query}"`
                : `No adhkar found matching "${query}"`}
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
                {language === 'ar'
                  ? `${results.length} نتيجة`
                  : `${results.length} results`}
              </Text>
            }
          />
        )}
      </View>
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
  },
  backButton: {
    padding: 8,
    marginRight: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    gap: 4,
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
});
