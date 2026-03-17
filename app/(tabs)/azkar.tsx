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
} from 'react-native';
import { fontBold } from '@/lib/fonts';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { useColors } from '@/hooks/use-colors';

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
// أيقونات الفئات
// =========================================

const CATEGORY_ICONS: Record<AzkarCategoryType, { name: string; type: 'ionicons' | 'material' | 'fontawesome' }> = {
  morning: { name: 'sunny', type: 'ionicons' },
  evening: { name: 'moon', type: 'ionicons' },
  sleep: { name: 'bed', type: 'fontawesome' },
  wakeup: { name: 'weather-sunrise', type: 'material' },
  after_prayer: { name: 'praying-hands', type: 'fontawesome' },
  quran_duas: { name: 'book-open', type: 'fontawesome' },
  sunnah_duas: { name: 'sparkles', type: 'ionicons' },
  ruqya: { name: 'shield-checkmark', type: 'ionicons' },
  eating: { name: 'restaurant', type: 'ionicons' },
  mosque: { name: 'mosque', type: 'material' },
  house: { name: 'home', type: 'ionicons' },
  travel: { name: 'airplane', type: 'ionicons' },
  emotions: { name: 'heart', type: 'ionicons' },
  wudu: { name: 'water', type: 'ionicons' },
  nature: { name: 'leaf', type: 'ionicons' },
  fasting: { name: 'moon', type: 'ionicons' },
  protection: { name: 'shield', type: 'ionicons' },
  prayerSupplications: { name: 'praying-hands', type: 'fontawesome' },
  salawat: { name: 'star', type: 'ionicons' },
  istighfar: { name: 'refresh', type: 'ionicons' },
  ayat_kursi: { name: 'book', type: 'ionicons' },
};

// =========================================
// المكون الرئيسي
// =========================================

export default function AzkarScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const darkMode = isDarkMode;
  const colors = useColors();
  const language = (settings.language || 'ar') as Language;
  
  // الحالة
  const [categories, setCategories] = useState<AzkarCategory[]>([]);
  const [progress, setProgress] = useState<Record<AzkarCategoryType, number>>({} as any);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  
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
          style={styles.gridCardInner}
          onPress={() => navigateToCategory(category.id)}
          onLongPress={() => shareCategory(category)}
          activeOpacity={0.7}
        >
          <GlassCard intensity={42} style={styles.gridCardGlass}>
            {/* الأيقونة */}
            <View style={styles.iconContainer}> 
              {renderIcon(category.id, 28, category.color)}
            </View>

            {/* الاسم */}
            <Text
              style={[
                styles.categoryName,
                { color: colors.text },
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
              <View style={[styles.progressBar, { backgroundColor: darkMode ? '#374151' : '#E5E7EB', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
              <Text style={[styles.progressText, { color: category.color, textAlign: isRTL ? 'right' : 'left' }]}>
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
          <GlassCard intensity={40} style={{ ...styles.listCardGlass, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {/* الأيقونة */}
            <View style={styles.listIconContainer}> 
              {renderIcon(category.id, 24, category.color)}
            </View>

            {/* المحتوى */}
            <View style={styles.listContent}>
              <Text
                style={[
                  styles.listCategoryName,
                  { color: colors.text, textAlign: isRTL ? 'right' : 'left' },
                ]}
                numberOfLines={1}
              >
                {categoryName}
              </Text>
              <Text style={[styles.listAzkarCount, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                {azkarCount} {t('azkar.count')}
              </Text>
            </View>

            {/* التقدم */}
            <View style={[styles.listProgressContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.listProgressText, { color: category.color }]}>
                {categoryProgress}%
              </Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={darkMode ? '#6B7280' : '#9CA3AF'} />
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
      { id: 'tasbih', icon: 'hand-left', label: t('tabs.tasbih'), route: '/tasbih', color: '#10B981' },
      { id: 'ruqya', icon: 'shield', label: t('azkar.ruqya'), route: '/ruqya', color: '#6366F1' },
      { id: 'names', icon: 'list', label: t('home.namesOfAllah'), route: '/names', color: '#EC4899' },
    ];

    return (
      <View style={styles.quickLinksContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
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
              <GlassCard intensity={38} style={styles.quickLinkGlass}>
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
      style={[styles.container, { backgroundColor: settings.display.appBackground === 'none' ? (darkMode ? '#111827' : '#F3F4F6') : 'transparent' }]}
    >
      {/* Header */}
      <View
        style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: 'rgba(120,120,128,0.15)' }]}
      >
        <View style={[styles.headerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Left: worship tracker + favorites */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
            <TouchableOpacity
              onPress={() => router.push('/worship-tracker/azkar' as any)}
              style={styles.viewToggle}
            >
              <MaterialCommunityIcons name="chart-bar" size={22} color={darkMode ? '#fff' : '#333'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/all-favorites' as any)}
              style={styles.viewToggle}
            >
              <MaterialCommunityIcons name="bookmark" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Center: title — absolutely centered */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: 20, fontFamily: fontBold() }]}>
              {t('azkar.title')}
            </Text>
          </View>

          {/* Right: view toggle */}
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
            <View style={{ width: 110 }}>
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
                indicatorColor="#2f7659"
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
        {/* الفئات */}
        <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('azkar.categories')}
        </Text>

        {viewMode === 'grid' ? (
          <View style={[styles.gridContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
    </BackgroundWrapper>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: (width - 48) / 2,
    marginBottom: 16,
  },
  gridCardInner: {
    width: '100%',
  },
  gridCardGlass: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 160,
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
    gap: 8,
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
});
