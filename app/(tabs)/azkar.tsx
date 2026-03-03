// app/(tabs)/azkar.tsx
// شاشة الأذكار الرئيسية - النظام الجديد
// =========================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AzkarAPI, {
  AzkarCategory,
  AzkarCategoryType,
  Language,
  getCategoryName,
  getAzkarByCategory,
  getCategoryCompletionPercentage,
  getAllCategories,
  getAzkarStats,
} from '@/lib/azkar-api';

const { width } = Dimensions.get('window');

// =========================================
// أيقونات الفئات
// =========================================

const CATEGORY_ICONS: Record<AzkarCategoryType, { name: string; type: 'ionicons' | 'material' | 'fontawesome' }> = {
  morning: { name: 'sunny', type: 'ionicons' },
  evening: { name: 'moon', type: 'ionicons' },
  sleep: { name: 'bed', type: 'fontawesome' },
  wakeup: { name: 'sunrise', type: 'material' },
  after_prayer: { name: 'hands-praying', type: 'fontawesome' },
  quran_duas: { name: 'book-open', type: 'fontawesome' },
  sunnah_duas: { name: 'star', type: 'ionicons' },
  ruqya: { name: 'shield-checkmark', type: 'ionicons' },
};

// =========================================
// المكون الرئيسي
// =========================================

export default function AzkarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // الحالة
  const [categories, setCategories] = useState<AzkarCategory[]>([]);
  const [progress, setProgress] = useState<Record<AzkarCategoryType, number>>({} as any);
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [language, setLanguage] = useState<Language>('ar');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<{ total: number; categoriesCount: number } | null>(null);
  
  // الأنيميشن
  const fadeAnim = useState(new Animated.Value(0))[0];

  // =========================================
  // تحميل البيانات
  // =========================================

  const loadData = useCallback(async () => {
    try {
      // تحميل الإعدادات
      const [storedDarkMode, storedViewMode, storedLanguage] = await Promise.all([
        AsyncStorage.getItem('darkMode'),
        AsyncStorage.getItem('azkar_view_mode'),
        AsyncStorage.getItem('app_language'),
      ]);

      if (storedDarkMode !== null) setDarkMode(JSON.parse(storedDarkMode));
      if (storedViewMode) setViewMode(storedViewMode as 'grid' | 'list');
      if (storedLanguage) setLanguage(storedLanguage as Language);

      // تحميل الفئات
      const allCategories = getAllCategories();
      setCategories(allCategories);

      // تحميل الإحصائيات
      const azkarStats = getAzkarStats();
      setStats({
        total: azkarStats.total,
        categoriesCount: azkarStats.categoriesCount,
      });

      // تحميل التقدم لكل فئة
      const progressData: Record<AzkarCategoryType, number> = {} as any;
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

  const navigateToCategory = (categoryId: AzkarCategoryType) => {
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
        message: `${categoryName}\n${azkarCount} أذكار\n\nحمّل تطبيق القرآن والأذكار`,
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

  const renderIcon = (categoryId: AzkarCategoryType, size: number, color: string) => {
    const iconConfig = CATEGORY_ICONS[categoryId];
    
    if (iconConfig.type === 'ionicons') {
      return <Ionicons name={iconConfig.name as any} size={size} color={color} />;
    } else if (iconConfig.type === 'material') {
      return <MaterialCommunityIcons name={iconConfig.name as any} size={size} color={color} />;
    } else {
      return <FontAwesome5 name={iconConfig.name} size={size} color={color} />;
    }
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
          style={[
            styles.gridCardInner,
            { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' },
          ]}
          onPress={() => navigateToCategory(category.id)}
          onLongPress={() => shareCategory(category)}
          activeOpacity={0.7}
        >
          {/* الأيقونة */}
          <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
            {renderIcon(category.id, 28, category.color)}
          </View>

          {/* الاسم */}
          <Text
            style={[
              styles.categoryName,
              { color: darkMode ? '#F9FAFB' : '#1F2937' },
            ]}
            numberOfLines={2}
          >
            {categoryName}
          </Text>

          {/* العدد */}
          <Text style={[styles.azkarCount, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
            {azkarCount} {language === 'ar' ? 'ذكر' : 'adhkar'}
          </Text>

          {/* شريط التقدم */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: darkMode ? '#374151' : '#E5E7EB' }]}>
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
            <Text style={[styles.progressText, { color: category.color }]}>
              {categoryProgress}%
            </Text>
          </View>
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
          style={[
            styles.listCardInner,
            { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' },
          ]}
          onPress={() => navigateToCategory(category.id)}
          onLongPress={() => shareCategory(category)}
          activeOpacity={0.7}
        >
          {/* الأيقونة */}
          <View style={[styles.listIconContainer, { backgroundColor: category.color + '20' }]}>
            {renderIcon(category.id, 24, category.color)}
          </View>

          {/* المحتوى */}
          <View style={styles.listContent}>
            <Text
              style={[
                styles.listCategoryName,
                { color: darkMode ? '#F9FAFB' : '#1F2937' },
              ]}
              numberOfLines={1}
            >
              {categoryName}
            </Text>
            <Text style={[styles.listAzkarCount, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
              {azkarCount} {language === 'ar' ? 'ذكر' : 'adhkar'}
            </Text>
          </View>

          {/* التقدم */}
          <View style={styles.listProgressContainer}>
            <Text style={[styles.listProgressText, { color: category.color }]}>
              {categoryProgress}%
            </Text>
            <Ionicons name="chevron-forward" size={20} color={darkMode ? '#6B7280' : '#9CA3AF'} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // =========================================
  // رندر الإحصائيات
  // =========================================

  const renderStats = () => {
    if (!stats) return null;

    return (
      <View style={[styles.statsContainer, { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
            {language === 'ar' ? 'إجمالي الأذكار' : 'Total Adhkar'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#8B5CF6' }]}>{stats.categoriesCount}</Text>
          <Text style={[styles.statLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
            {language === 'ar' ? 'الفئات' : 'Categories'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>12</Text>
          <Text style={[styles.statLabel, { color: darkMode ? '#9CA3AF' : '#6B7280' }]}>
            {language === 'ar' ? 'لغة' : 'Languages'}
          </Text>
        </View>
      </View>
    );
  };

  // =========================================
  // رندر الروابط السريعة
  // =========================================

  const renderQuickLinks = () => {
    const quickLinks = [
      { id: 'tasbih', icon: 'hand-left', label: language === 'ar' ? 'التسبيح' : 'Tasbih', route: '/tasbih', color: '#10B981' },
      { id: 'ruqya', icon: 'shield', label: language === 'ar' ? 'الرقية' : 'Ruqyah', route: '/ruqya', color: '#6366F1' },
      { id: 'names', icon: 'list', label: language === 'ar' ? 'الأسماء الحسنى' : 'Names', route: '/names', color: '#EC4899' },
    ];

    return (
      <View style={styles.quickLinksContainer}>
        <Text style={[styles.sectionTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
          {language === 'ar' ? 'روابط سريعة' : 'Quick Links'}
        </Text>
        <View style={styles.quickLinksRow}>
          {quickLinks.map(link => (
            <TouchableOpacity
              key={link.id}
              style={[
                styles.quickLinkCard,
                { backgroundColor: darkMode ? '#1F2937' : '#FFFFFF' },
              ]}
              onPress={() => router.push(link.route as any)}
              activeOpacity={0.7}
            >
              <Ionicons name={link.icon as any} size={24} color={link.color} />
              <Text style={[styles.quickLinkLabel, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
                {link.label}
              </Text>
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
    <View style={[styles.container, { backgroundColor: darkMode ? '#111827' : '#F3F4F6' }]}>
      {/* Header */}
      <LinearGradient
        colors={darkMode ? ['#1F2937', '#111827'] : ['#10B981', '#059669']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {language === 'ar' ? 'الأذكار والأدعية' : 'Adhkar & Duas'}
          </Text>
          <TouchableOpacity onPress={toggleViewMode} style={styles.viewToggle}>
            <Ionicons
              name={viewMode === 'grid' ? 'list' : 'grid'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* المحتوى */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* الإحصائيات */}
        {renderStats()}

        {/* الفئات */}
        <Text style={[styles.sectionTitle, { color: darkMode ? '#F9FAFB' : '#1F2937' }]}>
          {language === 'ar' ? 'الفئات' : 'Categories'}
        </Text>

        {viewMode === 'grid' ? (
          <View style={styles.gridContainer}>
            {categories.map((category, index) => renderGridCard(category, index))}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {categories.map((category, index) => renderListCard(category, index))}
          </View>
        )}

        {/* الروابط السريعة */}
        {renderQuickLinks()}

        {/* المسافة السفلية */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// =========================================
// الأنماط
// =========================================

const styles = StyleSheet.create({
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
  
  // الإحصائيات
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },

  // عنوان القسم
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },

  // Grid View
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: (width - 48) / 2,
    marginBottom: 16,
  },
  gridCardInner: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  azkarCount: {
    fontSize: 12,
    marginBottom: 12,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },

  // List View
  listContainer: {
    gap: 12,
  },
  listCard: {
    marginBottom: 0,
  },
  listCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  },
  listProgressText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
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
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickLinkLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});
