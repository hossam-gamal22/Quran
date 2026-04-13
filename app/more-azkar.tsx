// app/more-azkar.tsx
// شاشة أذكار أخرى — عرض الفئات غير الرئيسية مع بحث
// Stack screen (not a tab), navigated from home page "أذكار أخرى" button

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { fontBold } from '@/lib/fonts';
import {
  AzkarCategory,
  Language,
  getCategoryName,
  getAzkarByCategory,
  getCategoryCompletionPercentage,
  getAllCategories,
} from '@/lib/azkar-api';
import { useIsRTL } from '@/hooks/use-is-rtl';

// Main categories shown on home page — exclude these
const EXCLUDED_IDS = new Set(['1', '1b', '2', '3', '27']);

const { width } = Dimensions.get('window');

export default function MoreAzkarScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const language = (settings.language || 'ar') as Language;

  const [categories, setCategories] = useState<AzkarCategory[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fadeAnim = useState(new Animated.Value(0))[0];

  const filteredCategories = React.useMemo(() => {
    let result = categories.filter(cat => !EXCLUDED_IDS.has(cat.id));
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(cat =>
        getCategoryName(cat, language).toLowerCase().includes(query)
      );
    }
    return result;
  }, [categories, searchQuery, language]);

  const loadData = useCallback(async () => {
    try {
      const allCategories = getAllCategories();
      setCategories(allCategories);

      const progressData: Record<string, number> = {};
      for (const cat of allCategories) {
        progressData[cat.id] = await getCategoryCompletionPercentage(cat.id);
      }
      setProgress(progressData);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error loading more azkar:', error);
    }
  }, [fadeAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      const refreshProgress = async () => {
        try {
          const allCategories = getAllCategories();
          const progressData: Record<string, number> = {};
          for (const cat of allCategories) {
            progressData[cat.id] = await getCategoryCompletionPercentage(cat.id);
          }
          setProgress(progressData);
        } catch {}
      };
      refreshProgress();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const navigateToCategory = (categoryId: string) => {
    router.push({
      pathname: '/azkar/[category]',
      params: { category: categoryId },
    });
  };

  const renderGridCard = (category: AzkarCategory, index: number) => {
    const azkarCount = getAzkarByCategory(category.id).length;
    const categoryProgress = progress[category.id] || 0;
    const categoryName = getCategoryName(category, language);

    return (
      <Animated.View
        key={category.id}
        style={[
          styles.gridCard,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.gridCardInner}
          onPress={() => navigateToCategory(category.id)}
          activeOpacity={0.7}
        >
          <GlassCard intensity={80} borderRadius={16} style={styles.gridCardGlass}>
            <View style={[styles.iconContainer, { backgroundColor: `${category.color}20` }]}>
              <MaterialCommunityIcons
                name={(category.icon || 'book-open-variant') as any}
                size={26}
                color={category.color}
              />
            </View>
            <Text
              style={[styles.categoryName, { color: colors.text, textAlign: 'center', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
              numberOfLines={2}
            >
              {categoryName}
            </Text>
            <Text style={[styles.azkarCount, { color: colors.textLight }]}>
              {azkarCount} {t('azkar.count')}
            </Text>
            <View style={[styles.progressContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.progressBar, { backgroundColor: isDarkMode ? '#374151' : '#D1D5DB' }]}>
                <View
                  style={[styles.progressFill, { width: `${categoryProgress}%` as any, backgroundColor: category.color }]}
                />
              </View>
              <Text style={[styles.progressText, { color: category.color }]}>
                {categoryProgress}%
              </Text>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderListCard = (category: AzkarCategory, index: number) => {
    const azkarCount = getAzkarByCategory(category.id).length;
    const categoryProgress = progress[category.id] || 0;
    const categoryName = getCategoryName(category, language);

    return (
      <Animated.View
        key={category.id}
        style={[
          styles.listCard,
          {
            opacity: fadeAnim,
            transform: [{
              translateX: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.listCardInner}
          onPress={() => navigateToCategory(category.id)}
          activeOpacity={0.7}
        >
          <GlassCard intensity={20} borderRadius={16} style={{ ...styles.listCardGlass, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <View style={styles.listIconContainer}>
              <MaterialCommunityIcons
                name={(category.icon || 'book-open-variant') as any}
                size={24}
                color={category.color}
              />
            </View>
            <View style={styles.listContent}>
              <Text
                style={[styles.listCategoryName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                numberOfLines={2}
              >
                {categoryName}
              </Text>
              <Text style={[styles.listAzkarCount, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                {azkarCount} {t('azkar.count')}
              </Text>
            </View>
            <View style={[styles.listProgressContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.listProgressText, { color: category.color }]}>
                {categoryProgress}%
              </Text>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={20}
                color={colors.textLight}
              />
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={styles.container}
    >
      <StatusBar style={colors.statusBarStyle} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, overflow: 'hidden' }]}>
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={80}
            tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
        <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={26}
              color={colors.text}
            />
          </TouchableOpacity>

          {/* Title — absolutely centered */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fontBold() }]}>
              {t('home.moreAzkar')}
            </Text>
          </View>

          {/* View toggle */}
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
            <View style={{ minWidth: 100, maxWidth: 140 }}>
              <NativeTabs
                tabs={[
                  { key: 'grid', label: t('azkar.grid') },
                  { key: 'list', label: t('azkar.list') },
                ]}
                selected={viewMode}
                onSelect={async (key) => {
                  const newMode = key as 'grid' | 'list';
                  setViewMode(newMode);
                  await AsyncStorage.setItem('azkar_view_mode', newMode);
                }}
                indicatorColor="#0d8e62"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Search bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textLight} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
            placeholder={t('azkar.searchCategories')}
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* فضل الأذكار shortcut */}
        <TouchableOpacity
          style={{ marginBottom: 16 }}
          onPress={() => router.push('/azkar-search?mode=benefits' as any)}
          activeOpacity={0.7}
        >
          <GlassCard
            intensity={80}
            style={{ padding: 16, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}
          >
            <MaterialCommunityIcons name="star-circle" size={28} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontFamily: fontBold(), textAlign: isRTL ? 'right' : 'left' }}>
                {t('home.benefitAzkar')}
              </Text>
              <Text style={{ color: colors.textLight, fontSize: 13, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                {t('azkar.benefitAzkarDesc')}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-left' : 'chevron-right'}
              size={24}
              color={colors.textLight}
            />
          </GlassCard>
        </TouchableOpacity>

        {/* Categories */}
        <Text
          style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
        >
          {t('azkar.categories')}
        </Text>

        {viewMode === 'grid' ? (
          <View style={styles.gridContainer}>
            {(() => {
              const rows: AzkarCategory[][] = [];
              for (let i = 0; i < filteredCategories.length; i += 2) {
                rows.push(filteredCategories.slice(i, i + 2));
              }
              return rows.map((row, rowIdx) => (
                <View key={rowIdx} style={[styles.gridRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {row.map((cat, colIdx) => renderGridCard(cat, rowIdx * 2 + colIdx))}
                  {row.length === 1 && <View style={styles.gridCard} />}
                </View>
              ));
            })()}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredCategories.map((category, index) => renderListCard(category, index))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </BackgroundWrapper>
  );
}

const _styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 32,
    includeFontPadding: false,
  },
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  // Grid
  gridContainer: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
  },
  gridCardInner: { flex: 1 },
  gridCardGlass: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    flex: 1,
    minHeight: 170,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  azkarCount: { fontSize: 12, marginBottom: 10 },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 'auto',
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600', width: 35 },
  // List
  listContainer: { gap: 12 },
  listCard: { marginBottom: 0 },
  listCardInner: { width: '100%' },
  listCardGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  listIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { flex: 1 },
  listCategoryName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  listAzkarCount: { fontSize: 13 },
  listProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listProgressText: { fontSize: 14, fontWeight: '600' },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
});
