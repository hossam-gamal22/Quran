// app/(tabs)/azkar.tsx
// شاشة الأذكار الرئيسية - النظام الجديد
// =========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  RefreshControl,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { fontBold } from '@/lib/fonts';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
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

import AzkarAPI, {
  AzkarCategory,
  AzkarCategoryType,
  Language,
  getCategoryName,
  getAzkarByCategory,
  getCategoryCompletionPercentage,
  getAllCategories,
} from '@/lib/azkar-api';
import { useIsRTL } from '@/hooks/use-is-rtl';

const { width } = Dimensions.get('window');

// =========================================
// المكون الرئيسي
// =========================================

export default function AzkarScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { exclude } = useLocalSearchParams<{ exclude?: string }>();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const darkMode = isDarkMode;
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const language = (settings.language || 'ar') as Language;
  
  // الحالة
  const [categories, setCategories] = useState<AzkarCategory[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Parse excluded category IDs from route params
  const excludeIds = React.useMemo(() => {
    if (!exclude) return null;
    return new Set(exclude.split(',').map(id => id.trim()));
  }, [exclude]);

  // Determine if we're in "other azkar" mode
  const isOtherMode = !!excludeIds;
  
  // الأنيميشن
  const fadeAnim = useState(new Animated.Value(0))[0];

  // =========================================
  // تحميل البيانات
  // =========================================

  const loadData = useCallback(async () => {
    try {
      // تحميل الإعدادات
      const storedViewMode = await AsyncStorage.getItem('azkar_view_mode');
      if (storedViewMode) setViewMode(storedViewMode as 'grid' | 'list');

      // تحميل الفئات
      const allCategories = getAllCategories();
      setCategories(allCategories);

      // تحميل التقدم لكل فئة
      const progressData: Record<string, number> = {};
      for (const cat of allCategories) {
        progressData[cat.id] = await getCategoryCompletionPercentage(cat.id);
      }
      setProgress(progressData);

      // تشغيل الأنيميشن
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error loading azkar data:', error);
    }
  }, [fadeAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh progress when returning from a category (e.g. after completing adhkar)
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
        } catch (error) {
          console.error('Error refreshing azkar progress:', error);
        }
      };
      refreshProgress();
    }, [])
  );

  // Filter categories based on exclude list and search query
  const filteredCategories = React.useMemo(() => {
    let result = categories;
    if (excludeIds) {
      result = result.filter(cat => !excludeIds.has(cat.id));
    }
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(cat => {
        const name = getCategoryName(cat, language).toLowerCase();
        return name.includes(query);
      });
    }
    return result;
  }, [categories, excludeIds, searchQuery, language]);


  // =========================================
  // التحديث
  // =========================================

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // =========================================
  // التنقل
  // =========================================

  const navigateToCategory = (categoryId: string) => {
    router.push({
      pathname: '/azkar/[category]',
      params: { category: categoryId },
    });
  };

  // =========================================
  // المشاركة
  // =========================================

  const shareCategory = async (category: AzkarCategory) => {
    try {
      const categoryName = getCategoryName(category, language);
      const azkarCount = getAzkarByCategory(category.id).length;
      
      await Share.share({
        message: `${categoryName}\n${azkarCount} ${t('tabs.azkar')}\n\n${t('common.fromApp')}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // =========================================
  // تبديل وضع العرض
  // =========================================

  const toggleViewMode = async () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    await AsyncStorage.setItem('azkar_view_mode', newMode);
  };

  // =========================================
  // رندر الأيقونة
  // =========================================

  const renderIcon = (categoryId: string, size: number, color: string) => {
    const cat = categories.find(c => c.id === categoryId);
    const iconName = cat?.icon || 'book-open-variant';
    return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
  };

  // =========================================
  // رندر كارت الفئة (Grid)
  // =========================================

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
          onLongPress={() => shareCategory(category)}
          activeOpacity={0.7}
        >
          <GlassCard intensity={80} borderRadius={16} style={styles.gridCardGlass}>
            {/* الأيقونة */}
            <View style={[styles.iconContainer, { backgroundColor: `${category.color}20` }]}> 
              {renderIcon(category.id, 26, category.color)}
            </View>

            {/* الاسم */}
            <Text
              style={[
                styles.categoryName,
                { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' },
              ]}
              numberOfLines={2}
            >
              {categoryName}
            </Text>

            {/* العدد */}
            <Text style={[styles.azkarCount, { color: colors.textLight }]}>
              {azkarCount} {t('azkar.count')}
            </Text>

            {/* شريط التقدم */}
            <View style={[styles.progressContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.progressBar, { backgroundColor: darkMode ? '#374151' : '#D1D5DB', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${categoryProgress}%`,
                      backgroundColor: category.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: category.color, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {categoryProgress}%
              </Text>
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // =========================================
  // رندر كارت الفئة (List)
  // =========================================

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
          onLongPress={() => shareCategory(category)}
          activeOpacity={0.7}
        >
          <GlassCard intensity={20} borderRadius={16} style={{ ...styles.listCardGlass, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {/* الأيقونة */}
            <View style={styles.listIconContainer}> 
              {renderIcon(category.id, 24, category.color)}
            </View>

            {/* المحتوى */}
            <View style={styles.listContent}>
              <Text
                style={[
                  styles.listCategoryName,
                  { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}
                numberOfLines={2}
              >
                {categoryName}
              </Text>
              <Text style={[styles.listAzkarCount, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {azkarCount} {t('azkar.count')}
              </Text>
            </View>

            {/* التقدم */}
            <View style={[styles.listProgressContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.listProgressText, { color: category.color }]}>
                {categoryProgress}%
              </Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textLight} />
            </View>
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  };



  // =========================================
  // رندر الروابط السريعة
  // =========================================

  const renderQuickLinks = () => {
    const quickLinks = [
      { id: 'tasbih', icon: 'hand-left', label: t('tabs.tasbih'), route: '/tasbih', color: '#0d8e62' },
      { id: 'ruqya', icon: 'shield', label: t('azkar.ruqya'), route: '/ruqya', color: '#6366F1' },
      { id: 'names', icon: 'list', label: t('home.namesOfAllah'), route: '/names', color: '#EC4899' },
    ];

    return (
      <View style={styles.quickLinksContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {t('home.quickAccess')}
        </Text>
        <View style={[styles.quickLinksRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {quickLinks.map(link => (
            <TouchableOpacity
              key={link.id}
              style={styles.quickLinkCard}
              onPress={() => router.push(link.route as any)}
              activeOpacity={0.7}
            >
              <GlassCard intensity={80} borderRadius={16} style={styles.quickLinkGlass}>
                <Ionicons name={link.icon as any} size={24} color={link.color} />
                <Text style={[styles.quickLinkLabel, { color: colors.text }]}>
                  {link.label}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // =========================================
  // الرندر الرئيسي
  // =========================================

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={styles.container}
    >
      <StatusBar style={colors.statusBarStyle} />
      {/* Header */}
      <View
        style={[styles.header, { paddingTop: insets.top + 10, overflow: 'hidden' }]}
      >
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
        <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Left: worship tracker + favorites */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity
              onPress={() => router.push('/worship-tracker/azkar' as any)}
              style={styles.viewToggle}
            >
              <MaterialCommunityIcons name="chart-bar" size={22} color={darkMode ? '#FAFAFA' : '#171717'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/all-favorites' as any)}
              style={styles.viewToggle}
            >
              <MaterialCommunityIcons name="bookmark" size={22} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/azkar-search' as any)}
              style={styles.viewToggle}
            >
              <MaterialCommunityIcons name="magnify" size={22} color={darkMode ? '#FAFAFA' : '#171717'} />
            </TouchableOpacity>
          </View>

          {/* Center: title — absolutely centered */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: 20, fontFamily: fontBold() }]}>
              {isOtherMode ? t('home.moreAzkar') : t('azkar.title')}
            </Text>
          </View>

          {/* Right: view toggle */}
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

      {/* المحتوى */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* شريط البحث */}
        {isOtherMode && (
          <View style={[styles.searchContainer, { backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
        )}

        {/* زر فضل الأذكار عند وضع أذكار أخرى */}
        {isOtherMode && (
          <TouchableOpacity
            style={{ marginHorizontal: 16, marginBottom: 16 }}
            onPress={() => router.push('/azkar-search?mode=benefits' as any)}
            activeOpacity={0.7}
          >
            <GlassCard intensity={80} style={{ padding: 16, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
              <MaterialCommunityIcons name="star-circle" size={28} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontFamily: fontBold(), textAlign: isRTL ? 'right' : 'left' }}>
                  {t('home.benefitAzkar')}
                </Text>
                <Text style={{ color: colors.textLight, fontSize: 13, marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                  {t('azkar.benefitAzkarDesc')}
                </Text>
              </View>
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={colors.textLight} />
            </GlassCard>
          </TouchableOpacity>
        )}

        {/* الفئات */}
        <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
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

        {/* الروابط السريعة */}
        {renderQuickLinks()}

        {/* المسافة السفلية */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </BackgroundWrapper>
  );
}

// =========================================
// الأنماط
// =========================================

const _styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  headerSide: {
    width: 40,
    height: 40,
  },
  headerLogo: {
    width: 64,
    height: 64,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  viewToggle: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  
  // عنوان القسم
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },

  // Grid View
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
  gridCardInner: {
    flex: 1,
  },
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
  azkarCount: {
    fontSize: 12,
    marginBottom: 10,
  },
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
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    width: 35,
  },

  // List View
  listContainer: {
    gap: 12,
  },
  listCard: {
    marginBottom: 0,
  },
  listCardInner: {
    width: '100%',
  },
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
  listContent: {
    flex: 1,
  },
  listCategoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listAzkarCount: {
    fontSize: 13,
  },
  listProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listProgressText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Quick Links
  quickLinksContainer: {
    marginTop: 24,
  },
  quickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickLinkCard: {
    width: (width - 56) / 3,
  },
  quickLinkGlass: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  quickLinkLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },

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
