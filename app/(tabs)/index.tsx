// app/(tabs)/index.tsx
// الصفحة الرئيسية - الأذكار - روح المسلم

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useSettings } from '@/contexts/SettingsContext';
import { useSeasonal } from '@/contexts/SeasonalContext';
import { getHijriDate } from '@/lib/hijri-date';
import GlassCard from '@/components/ui/GlassCard';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// ========================================
// الثوابت
// ========================================

const AZKAR_CATEGORIES = [
  { id: 'morning', name: 'أذكار الصباح', icon: 'weather-sunny', color: '#f5a623', count: 33 },
  { id: 'evening', name: 'أذكار المساء', icon: 'weather-night', color: '#5d4e8c', count: 33 },
  { id: 'sleep', name: 'أذكار النوم', icon: 'bed', color: '#3a7ca5', count: 15 },
  { id: 'wake', name: 'أذكار الاستيقاظ', icon: 'weather-sunset-up', color: '#c17f59', count: 10 },
  { id: 'prayer', name: 'أذكار بعد الصلاة', icon: 'mosque', color: '#2f7659', count: 20 },
  { id: 'misc', name: 'أذكار متنوعة', icon: 'format-list-text', color: '#e91e63', count: 50 },
];

const QUICK_ACCESS = [
  { id: 'ayat_kursi', name: 'آية الكرسي', icon: 'shield-star', color: '#DAA520' },
  { id: 'tasbih', name: 'التسبيح', icon: 'circle-multiple', color: '#2f7659' },
  { id: 'istighfar', name: 'الاستغفار', icon: 'heart', color: '#e91e63' },
  { id: 'salawat', name: 'الصلاة على النبي', icon: 'star-crescent', color: '#3a7ca5' },
];

const DUA_CATEGORIES = [
  { id: 'quran', name: 'أدعية من القرآن', icon: 'book-open-variant', color: '#3a7ca5' },
  { id: 'sunnah', name: 'أدعية من السنة', icon: 'book-cross', color: '#2f7659' },
  { id: 'ruqya', name: 'الرقية الشرعية', icon: 'shield-check', color: '#5d4e8c' },
];

// ========================================
// مكونات فرعية
// ========================================

interface CategoryCardProps {
  category: typeof AZKAR_CATEGORIES[0];
  onPress: () => void;
  isDarkMode: boolean;
  index: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress, isDarkMode, index }) => {
  return (
    <Animated.View
      entering={FadeInRight.delay(index * 80).duration(400)}
      style={styles.categoryCardContainer}
    >
      <TouchableOpacity
        style={[styles.categoryCard, isDarkMode && styles.categoryCardDark]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
          <MaterialCommunityIcons name={category.icon as any} size={28} color={category.color} />
        </View>
        <Text style={[styles.categoryName, isDarkMode && styles.textLight]} numberOfLines={1}>
          {category.name}
        </Text>
        <Text style={[styles.categoryCount, isDarkMode && styles.textMuted]}>
          {category.count} ذكر
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface QuickAccessItemProps {
  item: typeof QUICK_ACCESS[0];
  onPress: () => void;
  isDarkMode: boolean;
  index: number;
}

const QuickAccessItem: React.FC<QuickAccessItemProps> = ({ item, onPress, isDarkMode, index }) => {
  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 60).duration(400)}>
      <TouchableOpacity
        style={[styles.quickAccessItem, isDarkMode && styles.quickAccessItemDark]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.quickAccessIcon, { backgroundColor: `${item.color}20` }]}>
          <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
        </View>
        <Text style={[styles.quickAccessName, isDarkMode && styles.textLight]} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function HomeScreen() {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const { currentSeason, dailyData } = useSeasonal();
  
  const [isRefreshing, setIsRefreshing] = useState(false);

  // التاريخ الهجري
  const hijriDate = useMemo(() => getHijriDate(), []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // تحديث البيانات
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const navigateToCategory = (categoryId: string) => {
    router.push(`/azkar/${categoryId}`);
  };

  const navigateToQuickAccess = (itemId: string) => {
    router.push(`/azkar/${itemId}`);
  };

  const navigateToDuas = (categoryId: string) => {
    router.push(`/duas/${categoryId}`);
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>روح المسلم</Text>
          <Text style={[styles.headerDate, isDarkMode && styles.textMuted]}>
            {hijriDate.day} {hijriDate.monthName} {hijriDate.year}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/seasonal')}
        >
          <MaterialCommunityIcons
            name="calendar-star"
            size={26}
            color={isDarkMode ? '#fff' : '#333'}
          />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDarkMode ? '#fff' : '#2f7659'}
            colors={['#2f7659']}
          />
        }
      >
        {/* بطاقة الموسم */}
        {currentSeason && (
          <Animated.View entering={FadeIn.duration(600)}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push(`/seasonal/${currentSeason.type}`)}
            >
              <LinearGradient
                colors={[currentSeason.color, `${currentSeason.color}cc`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.seasonCard}
              >
                <View style={styles.seasonContent}>
                  <MaterialCommunityIcons name={currentSeason.icon as any} size={32} color="#fff" />
                  <View style={styles.seasonInfo}>
                    <Text style={styles.seasonName}>{currentSeason.nameAr}</Text>
                    <Text style={styles.seasonGreeting}>{dailyData.greeting}</Text>
                  </View>
                </View>
                <View style={styles.seasonBadge}>
                  <Text style={styles.seasonDay}>اليوم {currentSeason.currentDay}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* الوصول السريع */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>وصول سريع</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickAccessContainer}
          >
            {QUICK_ACCESS.map((item, index) => (
              <QuickAccessItem
                key={item.id}
                item={item}
                onPress={() => navigateToQuickAccess(item.id)}
                isDarkMode={isDarkMode}
                index={index}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* أقسام الأذكار */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>الأذكار</Text>
          <View style={styles.categoriesGrid}>
            {AZKAR_CATEGORIES.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                onPress={() => navigateToCategory(category.id)}
                isDarkMode={isDarkMode}
                index={index}
              />
            ))}
          </View>
        </Animated.View>

        {/* الأدعية والرقية */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>الأدعية والرقية</Text>
          <View style={styles.duasContainer}>
            {DUA_CATEGORIES.map((category, index) => (
              <Animated.View
                key={category.id}
                entering={FadeInRight.delay(300 + index * 80).duration(400)}
              >
                <TouchableOpacity
                  style={[styles.duaCard, isDarkMode && styles.duaCardDark]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigateToDuas(category.id);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.duaIcon, { backgroundColor: `${category.color}20` }]}>
                    <MaterialCommunityIcons name={category.icon as any} size={24} color={category.color} />
                  </View>
                  <Text style={[styles.duaName, isDarkMode && styles.textLight]}>{category.name}</Text>
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={22}
                    color={isDarkMode ? '#666' : '#ccc'}
                  />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* روابط إضافية */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <View style={styles.extraLinks}>
            <TouchableOpacity
              style={[styles.extraLinkCard, isDarkMode && styles.extraLinkCardDark]}
              onPress={() => router.push('/worship-tracker')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#2f7659', '#1d5a3a']}
                style={styles.extraLinkGradient}
              >
                <MaterialCommunityIcons name="chart-line" size={24} color="#fff" />
                <Text style={styles.extraLinkText}>تتبع العبادات</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.extraLinkCard, isDarkMode && styles.extraLinkCardDark]}
              onPress={() => router.push('/khatma')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3a7ca5', '#2a5a7a']}
                style={styles.extraLinkGradient}
              >
                <MaterialCommunityIcons name="book-check" size={24} color="#fff" />
                <Text style={styles.extraLinkText}>ختمة القرآن</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#11151c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {},
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  headerDate: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 2,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(47,118,89,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // بطاقة الموسم
  seasonCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  seasonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  seasonInfo: {
    flex: 1,
  },
  seasonName: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },
  seasonGreeting: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.9)',
  },
  seasonBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  seasonDay: {
    fontSize: 12,
    fontFamily: 'Cairo-Medium',
    color: '#fff',
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },

  // الوصول السريع
  quickAccessContainer: {
    paddingRight: 16,
    gap: 10,
  },
  quickAccessItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: 90,
  },
  quickAccessItemDark: {
    backgroundColor: '#1a1a2e',
  },
  quickAccessIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickAccessName: {
    fontSize: 11,
    fontFamily: 'Cairo-Medium',
    color: '#333',
    textAlign: 'center',
  },

  // شبكة الأقسام
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  categoryCardContainer: {
    width: '50%',
    padding: 6,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  categoryCardDark: {
    backgroundColor: '#1a1a2e',
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 4,
  },

  // الأدعية
  duasContainer: {
    gap: 10,
  },
  duaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
  },
  duaCardDark: {
    backgroundColor: '#1a1a2e',
  },
  duaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginHorizontal: 14,
  },

  // روابط إضافية
  extraLinks: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  extraLinkCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  extraLinkCardDark: {},
  extraLinkGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  extraLinkText: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
  },

  bottomSpace: {
    height: 100,
  },
});
