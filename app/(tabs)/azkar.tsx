import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, DarkColors, Spacing, BorderRadius, Shadows, Typography } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/app';
import { Share } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// أنواع الأذكار
// ============================================

interface AzkarCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
  count?: number;
}

const AZKAR_CATEGORIES: AzkarCategory[] = [
  {
    id: 'morning',
    title: 'أذكار الصباح',
    subtitle: 'تقال بعد صلاة الفجر حتى طلوع الشمس',
    icon: 'sunny',
    color: '#F59E0B',
    route: '/azkar/morning',
  },
  {
    id: 'evening',
    title: 'أذكار المساء',
    subtitle: 'تقال بعد صلاة العصر حتى غروب الشمس',
    icon: 'moon',
    color: '#6366F1',
    route: '/azkar/evening',
  },
  {
    id: 'after-prayer',
    title: 'أذكار بعد الصلاة',
    subtitle: 'تقال بعد السلام من الصلاة المفروضة',
    icon: 'checkmark-done',
    color: '#10B981',
    route: '/azkar/after-prayer',
  },
  {
    id: 'sleep',
    title: 'أذكار النوم',
    subtitle: 'تقال قبل النوم',
    icon: 'bed',
    color: '#8B5CF6',
    route: '/azkar/sleep',
  },
  {
    id: 'wakeup',
    title: 'أذكار الاستيقاظ',
    subtitle: 'تقال عند الاستيقاظ من النوم',
    icon: 'alarm',
    color: '#EC4899',
    route: '/azkar/wakeup',
  },
  {
    id: 'misc',
    title: 'أذكار متنوعة',
    subtitle: 'أذكار وأدعية مختلفة',
    icon: 'apps',
    color: '#059669',
    route: '/azkar/misc',
  },
];

// ============================================
// المكون الرئيسي
// ============================================

export default function AzkarScreen() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  
  // الأنيميشن
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSettings();
    loadProgress();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setDarkMode(parsed.darkMode ?? false);
        setViewMode(parsed.azkarViewMode ?? 'grid');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadProgress = async () => {
    try {
      const today = new Date().toDateString();
      const progressData: { [key: string]: number } = {};
      
      for (const category of AZKAR_CATEGORIES) {
        const saved = await AsyncStorage.getItem(`azkar_progress_${category.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.date === today) {
            const completed = parsed.azkar?.filter((a: any) => a.completed)?.length || 0;
            const total = parsed.azkar?.length || 1;
            progressData[category.id] = Math.round((completed / total) * 100);
          }
        }
      }
      
      setProgress(progressData);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const currentColors = darkMode ? DarkColors : Colors;

  const shareCategory = async (category: AzkarCategory) => {
    const shareText = `📿 ${category.title}\n${category.subtitle}\n\n${APP_CONFIG.getShareSignature()}`;
    try {
      await Share.share({ message: shareText });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // ============================================
  // عرض الشبكة
  // ============================================

  const renderGridItem = (category: AzkarCategory, index: number) => (
    <TouchableOpacity
      key={category.id}
      style={[styles.gridItem, { backgroundColor: currentColors.surface }]}
      onPress={() => router.push(category.route as any)}
      onLongPress={() => shareCategory(category)}
      activeOpacity={0.7}
    >
      <View style={[styles.gridIconContainer, { backgroundColor: category.color + '15' }]}>
        <Ionicons name={category.icon as any} size={32} color={category.color} />
      </View>
      <Text style={[styles.gridTitle, { color: currentColors.text }]} numberOfLines={2}>
        {category.title}
      </Text>
      
      {/* شريط التقدم */}
      {progress[category.id] !== undefined && progress[category.id] > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progress[category.id]}%`, backgroundColor: category.color }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: category.color }]}>
            {progress[category.id]}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // ============================================
  // عرض القائمة
  // ============================================

  const renderListItem = (category: AzkarCategory) => (
    <TouchableOpacity
      key={category.id}
      style={[styles.listItem, { backgroundColor: currentColors.surface }]}
      onPress={() => router.push(category.route as any)}
      onLongPress={() => shareCategory(category)}
      activeOpacity={0.7}
    >
      <View style={[styles.listIconContainer, { backgroundColor: category.color + '15' }]}>
        <Ionicons name={category.icon as any} size={28} color={category.color} />
      </View>
      
      <View style={styles.listContent}>
        <Text style={[styles.listTitle, { color: currentColors.text }]}>{category.title}</Text>
        <Text style={[styles.listSubtitle, { color: currentColors.textLight }]} numberOfLines={1}>
          {category.subtitle}
        </Text>
        
        {/* شريط التقدم */}
        {progress[category.id] !== undefined && progress[category.id] > 0 && (
          <View style={styles.listProgressContainer}>
            <View style={styles.listProgressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${progress[category.id]}%`, backgroundColor: category.color }
                ]} 
              />
            </View>
            <Text style={[styles.listProgressText, { color: category.color }]}>
              {progress[category.id]}%
            </Text>
          </View>
        )}
      </View>
      
      <Ionicons name="chevron-back" size={20} color={currentColors.textLight} />
    </TouchableOpacity>
  );

  // ============================================
  // العرض
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* الهيدر */}
      <View style={[styles.header, { backgroundColor: currentColors.surface }]}>
        <TouchableOpacity 
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Ionicons 
            name={viewMode === 'grid' ? 'list' : 'grid'} 
            size={22} 
            color={currentColors.text} 
          />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>الأذكار</Text>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => router.push('/tasbih')}
        >
          <Ionicons name="radio-button-on" size={22} color={currentColors.primary} />
        </TouchableOpacity>
      </View>

      {/* المحتوى */}
      <Animated.ScrollView 
        style={[styles.content, { opacity: fadeAnim }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}
      >
        {/* بانر علوي */}
        <View style={[styles.banner, { backgroundColor: currentColors.primary }]}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>📿 حافظ على أذكارك</Text>
            <Text style={styles.bannerSubtitle}>
              "من قال سبحان الله وبحمده في يوم مائة مرة حُطت خطاياه"
            </Text>
          </View>
        </View>

        {/* قائمة الأذكار */}
        {viewMode === 'grid' ? (
          <View style={styles.gridWrapper}>
            {AZKAR_CATEGORIES.map((category, index) => renderGridItem(category, index))}
          </View>
        ) : (
          AZKAR_CATEGORIES.map(renderListItem)
        )}

        {/* روابط سريعة */}
        <View style={styles.quickLinks}>
          <Text style={[styles.quickLinksTitle, { color: currentColors.text }]}>المزيد</Text>
          
          <View style={styles.quickLinksRow}>
            <TouchableOpacity 
              style={[styles.quickLinkItem, { backgroundColor: currentColors.surface }]}
              onPress={() => router.push('/tasbih')}
            >
              <Ionicons name="radio-button-on" size={24} color="#8B5CF6" />
              <Text style={[styles.quickLinkText, { color: currentColors.text }]}>التسبيح</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickLinkItem, { backgroundColor: currentColors.surface }]}
              onPress={() => router.push('/ruqyah')}
            >
              <Ionicons name="shield-checkmark" size={24} color="#EF4444" />
              <Text style={[styles.quickLinkText, { color: currentColors.text }]}>الرقية</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.quickLinkItem, { backgroundColor: currentColors.surface }]}
              onPress={() => router.push('/names')}
            >
              <Ionicons name="sparkles" size={24} color="#D4AF37" />
              <Text style={[styles.quickLinkText, { color: currentColors.text }]}>أسماء الله</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ============================================
// الأنماط
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    ...Shadows.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
  },
  viewModeButton: {
    padding: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  banner: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  bannerContent: {
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  bannerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Grid styles
  gridContainer: {
    paddingBottom: Spacing.xl,
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    ...Shadows.sm,
  },
  gridIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  gridTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginTop: 4,
  },
  // List styles
  listContainer: {
    paddingBottom: Spacing.xl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  listIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  listTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    textAlign: 'right',
  },
  listSubtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    textAlign: 'right',
  },
  listProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  listProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  listProgressText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    minWidth: 35,
  },
  // Quick links
  quickLinks: {
    marginTop: Spacing.lg,
  },
  quickLinksTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  quickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickLinkItem: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.xs,
    ...Shadows.sm,
  },
  quickLinkText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
    marginTop: Spacing.sm,
  },
});
