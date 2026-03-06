// app/(tabs)/index.tsx
// الصفحة الرئيسية - الأذكار - روح المسلم

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight, FadeIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { useSettings } from '@/contexts/SettingsContext';
import { useSeasonal } from '@/contexts/SeasonalContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { fetchAppConfig, WelcomeBannerConfig } from '@/lib/app-config-api';
import DailyHighlights from '@/components/ui/DailyHighlights';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { ColoredButton } from '@/components/ui/colored-button';
import { GlassCard } from '@/components/ui/GlassCard';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { I18nManager, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ========================================
// الثوابت
// ========================================

const AZKAR_CATEGORIES = [
  { id: 'morning', nameKey: 'home.morningAzkar', icon: 'weather-sunny', color: '#f5a623', count: 33 },
  { id: 'evening', nameKey: 'home.eveningAzkar', icon: 'weather-night', color: '#5d4e8c', count: 33 },
  { id: 'sleep', nameKey: 'home.sleepAzkar', icon: 'bed', color: '#3a7ca5', count: 15 },
  { id: 'wakeup', nameKey: 'home.wakeupAzkar', icon: 'weather-sunset-up', color: '#c17f59', count: 10 },
  { id: 'after_prayer', nameKey: 'azkar.afterPrayer', icon: 'mosque', color: '#2f7659', count: 20 },
  { id: 'ruqya', nameKey: 'azkar.ruqya', icon: 'shield-check', color: '#e91e63', count: 12 },
];

const QUICK_ACCESS = [
  { id: 'qibla', nameKey: 'home.qibla', icon: 'compass', color: '#5856D6' },
  { id: 'favorites', nameKey: 'home.favorites', icon: 'heart', color: '#FF3B30' },
  { id: 'ayat_kursi', nameKey: 'home.ayatKursi', icon: 'shield-star', color: '#DAA520' },
  { id: 'surah_kahf', nameKey: 'home.surahKahf', icon: 'book-open-page-variant', color: '#3a7ca5' },
  { id: 'surah_yasin', nameKey: 'home.surahYasin', icon: 'book-heart', color: '#5d4e8c' },
  { id: 'surah_mulk', nameKey: 'home.surahMulk', icon: 'book-cross', color: '#0D9488' },
  { id: 'names', nameKey: 'home.namesOfAllah', icon: 'star-crescent', color: '#c17f59' },
  { id: 'tasbih', nameKey: 'tabs.tasbih', icon: 'circle-multiple', color: '#2f7659' },
  { id: 'salawat', nameKey: 'home.salawat', icon: 'star-crescent', color: '#e91e63' },
  { id: 'istighfar', nameKey: 'home.istighfar', icon: 'heart', color: '#8B5CF6' },
  { id: 'hajj', nameKey: 'hajjUmrah.title', icon: 'star-crescent', color: '#0D9488' },
  { id: 'seerah', nameKey: 'home.seerah', icon: 'book-account', color: '#6366F1' },
  { id: 'benefit_azkar', nameKey: 'home.benefitAzkar', icon: 'information', color: '#f5a623' },
];

const DUA_CATEGORIES = [
  { id: 'quran_duas', nameKey: 'azkar.quranDuas', icon: 'book-open-variant', color: '#3a7ca5' },
  { id: 'sunnah_duas', nameKey: 'azkar.sunnahDuas', icon: 'book-cross', color: '#2f7659' },
];

// ========================================
// مكونات فرعية
// ========================================

interface CategoryCardProps {
  category: { id: string; nameKey: string; icon: string; color: string; count: number };
  onPress: () => void;
  isDarkMode: boolean;
  index: number;
  t: (key: string) => string;
  isGrid?: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress, isDarkMode, index, t, isGrid }) => {
  if (isGrid) {
    const cardWidth = (SCREEN_WIDTH - 32 - 10) / 2; // padding + gap
    return (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(400)} style={{ width: cardWidth }}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }}
          activeOpacity={0.8}
          style={styles.gridCardOuter}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 80 : 40}
            tint={isDarkMode ? 'dark' : 'light'}
            style={styles.gridCardBlur}
          >
            <View style={[
              styles.gridCard,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.40)',
                borderColor: isDarkMode
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(0,0,0,0.06)',
              },
            ]}>
              <View style={styles.gridCardIcon}> 
                <MaterialCommunityIcons name={category.icon as any} size={28} color={category.color} />
              </View>
              <Text style={[styles.gridCardLabel, isDarkMode && styles.textLight]} numberOfLines={2}>
                {t(category.nameKey)}
              </Text>
            </View>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    );
  }
  // List layout — also glassmorphism
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(400)}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.8}
        style={styles.listCardOuter}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 40}
          tint={isDarkMode ? 'dark' : 'light'}
          style={styles.listCardBlur}
        >
          <View style={[
            styles.listCard,
            {
              backgroundColor: isDarkMode
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.40)',
              borderColor: isDarkMode
                ? 'rgba(255,255,255,0.15)'
                : 'rgba(0,0,0,0.06)',
            },
          ]}>
            <View style={styles.listCardIcon}> 
              <MaterialCommunityIcons name={category.icon as any} size={22} color={category.color} />
            </View>
            <Text style={[styles.listCardLabel, isDarkMode && styles.textLight]} numberOfLines={1}>
              {t(category.nameKey)}
            </Text>
            <MaterialCommunityIcons
              name="chevron-left"
              size={20}
              color={isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'}
            />
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface QuickAccessItemProps {
  item: { id: string; nameKey: string; icon: string; color: string };
  onPress: () => void;
  isDarkMode: boolean;
  index: number;
  t: (key: string) => string;
}

const QuickAccessItem: React.FC<QuickAccessItemProps> = ({ item, onPress, isDarkMode, index, t }) => {
  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 60).duration(400)}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <GlassCard style={{ padding: 14, alignItems: 'center', width: 90 }}>
          <View style={styles.quickAccessIcon}> 
            <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
          </View>
          <Text style={[styles.quickAccessName, isDarkMode && styles.textLight]} numberOfLines={1}>
            {t(item.nameKey)}
          </Text>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function HomeScreen() {
  const router = useRouter();
  const { isDarkMode, settings, t } = useSettings();
  const isRTL = I18nManager.isRTL;
  const { currentSeason, dailyData } = useSeasonal();
  const { getConfig } = useRemoteConfig();
  const logoUrl = getConfig('app_logo_url' as any) as string | undefined;

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Welcome banner from Firestore
  const [welcomeBanner, setWelcomeBanner] = useState<WelcomeBannerConfig | null>({
    enabled: true,
    title: 'رمضان مبارك 🌙',
    subtitle: 'تابع مهام يومك الرمضانية',
    icon: 'heart',
    color: '#2f7659',
    route: '/worship-tracker',
  });

  useEffect(() => {
    let mounted = true;
    fetchAppConfig().then(cfg => {
      if (mounted && cfg.welcomeBanner) setWelcomeBanner(cfg.welcomeBanner);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // تحديث البيانات
    try {
      const cfg = await fetchAppConfig();
      if (cfg.welcomeBanner) setWelcomeBanner(cfg.welcomeBanner);
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRefreshing(false);
  }, []);

  const navigateToCategory = (categoryId: string) => {
    if (categoryId === 'ruqya') {
      router.push('/ruqya');
    } else {
      router.push(`/azkar/${categoryId}` as any);
    }
  };

  const navigateToQuickAccess = (itemId: string) => {
    switch (itemId) {
      case 'qibla':
        router.push('/(tabs)/qibla' as any);
        break;
      case 'favorites':
        router.push('/(tabs)/favorites' as any);
        break;
      case 'surah_kahf':
        router.push('/surah/18' as any);
        break;
      case 'surah_yasin':
        router.push('/surah/36' as any);
        break;
      case 'surah_mulk':
        router.push('/surah/67' as any);
        break;
      case 'names':
        router.push('/names');
        break;
      case 'hajj':
        router.push('/hajj-umrah');
        break;
      case 'tasbih':
        router.push('/tasbih');
        break;
      case 'seerah':
        router.push('/story-of-day');
        break;
      case 'benefit_azkar':
        router.push('/azkar-search');
        break;
      default:
        router.push(`/azkar/${itemId}` as any);
    }
  };

  const navigateToDuas = (categoryId: string) => {
    router.push(`/azkar/${categoryId}` as any);
  };

  const homeLayout = settings.display.homeLayout || 'grid';
  const isGrid = homeLayout === 'grid';

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header — app icon only, no title */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={styles.logoImage}
            resizeMode="contain"
            accessibilityLabel="App logo"
          />
        ) : (
          <Image
            source={require('@/assets/images/App-icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
            accessibilityLabel="App logo"
          />
        )}
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
        {/* الرسالة الترحيبية */}
        {welcomeBanner?.enabled && (
          <Animated.View entering={FadeIn.duration(600)}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push(welcomeBanner.route as any)}
            >
              {welcomeBanner.displayMode === 'image_only' && welcomeBanner.backgroundImage ? (
                <Image
                  source={{ uri: welcomeBanner.backgroundImage }}
                  style={styles.seasonCardImage}
                  resizeMode="cover"
                />
              ) : welcomeBanner.displayMode === 'text_image' && welcomeBanner.backgroundImage ? (
                <ImageBackground
                  source={{ uri: welcomeBanner.backgroundImage }}
                  style={styles.seasonCard}
                  imageStyle={{ borderRadius: 20 }}
                  resizeMode="cover"
                >
                  <View style={styles.seasonCardOverlay}>
                    <View style={styles.seasonContent}>
                      <View style={styles.seasonInfo}>
                        <Text style={styles.seasonName}>{welcomeBanner.title}</Text>
                        <Text style={styles.seasonGreeting}>{welcomeBanner.subtitle}</Text>
                      </View>
                      <MaterialCommunityIcons name={welcomeBanner.icon as any} size={36} color="#fff" />
                    </View>
                  </View>
                </ImageBackground>
              ) : (
                <View
                  style={[styles.seasonCard, { backgroundColor: `${welcomeBanner.color}CC` }]}
                >
                  <View style={styles.seasonContent}>
                    <View style={styles.seasonInfo}>
                      <Text style={styles.seasonName}>{welcomeBanner.title}</Text>
                      <Text style={styles.seasonGreeting}>{welcomeBanner.subtitle}</Text>
                    </View>
                    <MaterialCommunityIcons name={welcomeBanner.icon as any} size={36} color="#fff" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Daily Highlights */}
        <DailyHighlights />

        {/* الوصول السريع */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('home.quickAccess')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickAccessContainer}
            style={{ direction: 'rtl' }}
          >
            {QUICK_ACCESS.map((item, index) => (
              <QuickAccessItem
                key={item.id}
                item={item}
                onPress={() => navigateToQuickAccess(item.id)}
                isDarkMode={isDarkMode}
                index={index}
                t={t}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* أقسام الأذكار */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('home.azkarSection')}</Text>
          <View style={isGrid ? styles.categoriesGridWrap : styles.categoriesGrid}>
            {AZKAR_CATEGORIES.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                onPress={() => navigateToCategory(category.id)}
                isDarkMode={isDarkMode}
                index={index}
                t={t}
                isGrid={isGrid}
              />
            ))}
          </View>
        </Animated.View>

        {/* الأدعية والرقية */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('home.duasSection')}</Text>
          <View style={styles.duasContainer}>
            {DUA_CATEGORIES.map((category, index) => (
              <Animated.View
                key={category.id}
                entering={FadeInRight.delay(300 + index * 80).duration(400)}
              >
                <ColoredButton
                  label={t(category.nameKey)}
                  icon={category.icon}
                  backgroundColor={category.color}
                  iconColor="#fff"
                  textColor="#fff"
                  size="medium"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigateToDuas(category.id);
                  }}
                />
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* عبادات */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>{t('home.worshipSection')}</Text>
          <View style={styles.extraLinks}>
            <ColoredButton
              label={t('home.worshipTracker')}
              icon="chart-line"
              backgroundColor="#2f7659"
              iconColor="#fff"
              textColor="#fff"
              size="medium"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/worship-tracker');
              }}
            />

            <ColoredButton
              label={t('home.khatmaQuran')}
              icon="book-check"
              backgroundColor="#3a7ca5"
              iconColor="#fff"
              textColor="#fff"
              size="medium"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/khatma');
              }}
            />
          </View>
        </Animated.View>

        <BannerAdComponent screen="home" />
        <View style={styles.bottomSpace} />
      </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
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
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  logo: {
    marginBottom: 8,
  },
  logoImage: {
    width: 140,
    height: 140,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Amiri-Bold',
    color: '#333',
    textAlign: 'center',
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#D1D1D6',
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
  seasonCardImage: {
    borderRadius: 20,
    height: 120,
    marginBottom: 20,
    width: '100%',
  },
  seasonCardOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 20,
    flex: 1,
    justifyContent: 'center',
  },
  seasonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  seasonInfo: {
    flex: 1,
  },
  seasonName: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#fff',
    textAlign: 'right',
  },
  seasonGreeting: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
  },
  seasonBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
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
    marginTop: 20,
  },

  // الوصول السريع
  quickAccessContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  quickAccessItem: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    width: 90,
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickAccessItemDark: {
    backgroundColor: 'rgba(120,120,128,0.18)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  quickAccessIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickAccessName: {
    fontSize: 11,
    fontFamily: 'Cairo-Medium',
    color: '#666',
    textAlign: 'center',
  },

  // شبكة الأقسام
  categoriesGrid: {
    gap: 10,
  },
  categoriesGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCardOuter: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gridCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gridCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  gridCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridCardLabel: {
    fontSize: 13,
    fontFamily: 'Cairo-SemiBold',
    color: '#444',
    textAlign: 'center',
  },

  // List layout glassmorphism cards
  listCardOuter: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  listCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  listCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    color: '#444',
    textAlign: 'right',
  },

  // الأدعية
  duasContainer: {
    gap: 10,
  },

  // روابط إضافية
  extraLinks: {
    gap: 10,
  },

  bottomSpace: {
    height: 100,
  },
});
