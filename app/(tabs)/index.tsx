// app/(tabs)/index.tsx
// الصفحة الرئيسية - الأذكار - روح المسلم

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Modal,
  TextInput,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight, FadeIn, useSharedValue, withSpring, useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllSurahs, type QuranV4Surah } from '@/lib/qcf-page-data';
import { getHijriDate } from '@/lib/hijri-date';
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
  { id: 'favorites', nameKey: 'home.favorites', icon: 'bookmark', color: '#FF3B30' },
  { id: 'ayat_kursi', nameKey: 'home.ayatKursi', icon: 'shield-star', color: '#DAA520' },
  { id: 'surah_kahf', nameKey: 'home.surahKahf', icon: 'book-open-page-variant', color: '#3a7ca5' },
  { id: 'surah_yasin', nameKey: 'home.surahYasin', icon: 'book-open-page-variant', color: '#5d4e8c' },
  { id: 'surah_mulk', nameKey: 'home.surahMulk', icon: 'book-open-page-variant', color: '#0D9488' },
  { id: 'names', nameKey: 'home.namesOfAllah', icon: 'star-crescent', color: '#c17f59' },
  { id: 'tasbih', nameKey: 'tabs.tasbih', icon: 'circle-multiple', color: '#2f7659' },
  { id: 'salawat', nameKey: 'home.salawat', icon: 'star-crescent', color: '#e91e63' },
  { id: 'istighfar', nameKey: 'home.istighfar', icon: 'heart', color: '#8B5CF6' },
  { id: 'hajj', nameKey: 'hajjUmrah.title', icon: 'star-crescent', color: '#0D9488' },
  { id: 'seerah', nameKey: 'home.seerah', icon: 'book-account', color: '#6366F1' },
  { id: 'benefit_azkar', nameKey: 'home.benefitAzkar', icon: 'information', color: '#f5a623' },
];

const QUICK_ACCESS_IDS = new Set(QUICK_ACCESS.map(q => q.id));

interface CustomQuickAccessItem {
  id: string;
  icon: string;
  color: string;
  label: string;
  route: string;
  nameKey?: string;
}

const EXTRA_APP_PAGES: CustomQuickAccessItem[] = [
  { id: 'page_browse_tafsir', icon: 'book-search', color: '#3a7ca5', label: 'تصفح التفسير', route: '/browse-tafsir' },
  { id: 'page_hijri', icon: 'calendar-month', color: '#0D9488', label: 'التقويم الهجري', route: '/hijri' },
  { id: 'page_widget_settings', icon: 'widgets', color: '#6366F1', label: 'إعدادات الودجت', route: '/widget-settings' },
  { id: 'page_daily_dua', icon: 'hands-pray', color: '#c17f59', label: 'دعاء اليوم', route: '/daily-dua' },
  { id: 'page_seerah', icon: 'book-account', color: '#2f7659', label: 'السيرة النبوية', route: '/seerah' },
  { id: 'page_names', icon: 'star-crescent', color: '#DAA520', label: 'أسماء الله الحسنى', route: '/names' },
  { id: 'page_ruqya', icon: 'shield-check', color: '#e91e63', label: 'الرقية الشرعية', route: '/ruqya' },
  { id: 'page_companions', icon: 'account-group', color: '#2f7659', label: 'قصص الصحابة', route: '/companions' },
  { id: 'page_quran_bookmarks', icon: 'bookmark-multiple', color: '#FF3B30', label: 'علامات القرآن', route: '/quran-bookmarks' },
  { id: 'page_worship_tracker', icon: 'chart-line', color: '#2f7659', label: 'متابعة العبادات', route: '/worship-tracker' },
];

const CUSTOM_ITEMS_STORAGE_KEY = '@quick_access_custom_items';
const COLLAPSED_SECTIONS_KEY = '@home_collapsed_sections';

const DUA_CATEGORIES = [
  { id: 'quran_duas', nameKey: 'azkar.quranDuas', icon: 'book-open-variant', color: '#3a7ca5' },
  { id: 'sunnah_duas', nameKey: 'azkar.sunnahDuas', icon: 'book-cross', color: '#2f7659' },
];

// ========================================
// 7 أقسام الصفحة الرئيسية المطوية
// ========================================
interface HomeSectionItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  route?: string;
  nameKey?: string;
}

interface HomeSectionDef {
  id: string;
  title: string;
  icon: string;
  color: string;
  items: HomeSectionItem[];
}

const HOME_SECTIONS: HomeSectionDef[] = [
  {
    id: 'azkar',
    title: 'أذكار',
    icon: 'book-open-variant',
    color: '#f5a623',
    items: [
      { id: 'morning', label: 'أذكار الصباح', icon: 'weather-sunny', color: '#f5a623', route: '/azkar/morning' },
      { id: 'evening', label: 'أذكار المساء', icon: 'weather-night', color: '#5d4e8c', route: '/azkar/evening' },
      { id: 'sleep', label: 'أذكار النوم', icon: 'bed', color: '#3a7ca5', route: '/azkar/sleep' },
      { id: 'wakeup', label: 'أذكار الاستيقاظ', icon: 'weather-sunset-up', color: '#c17f59', route: '/azkar/wakeup' },
      { id: 'after_prayer', label: 'أذكار بعد الصلاة', icon: 'mosque', color: '#2f7659', route: '/azkar/after_prayer' },
      { id: 'benefit_azkar', label: 'فضل الأذكار', icon: 'information', color: '#f5a623', route: '/azkar-search?mode=benefits' },
    ],
  },
  {
    id: 'stories',
    title: 'قصص',
    icon: 'book-account',
    color: '#6366F1',
    items: [
      { id: 'seerah', label: 'قصص الأنبياء', icon: 'book-account', color: '#6366F1', route: '/seerah' },
      { id: 'companions', label: 'قصص الصحابة', icon: 'account-group', color: '#2f7659', route: '/companions' },
    ],
  },
  {
    id: 'hajj_umrah',
    title: 'مناسك الحج والعمرة',
    icon: 'star-crescent',
    color: '#0D9488',
    items: [
      { id: 'hajj_duas', label: 'أدعية الحج', icon: 'hands-pray', color: '#0D9488', route: '/hajj-umrah?tab=hajj' },
      { id: 'umrah_duas', label: 'أدعية العمرة', icon: 'hands-pray', color: '#2f7659', route: '/hajj-umrah?tab=umrah' },
      { id: 'hajj_steps', label: 'المناسك خطوة بخطوة', icon: 'format-list-numbered', color: '#c17f59', route: '/hajj-umrah' },
      { id: 'hajj_places', label: 'أماكن المناسك', icon: 'map-marker-radius', color: '#3a7ca5', route: '/hajj-umrah' },
    ],
  },
  {
    id: 'quran_surahs',
    title: 'سور وآيات قرآنية',
    icon: 'book-open-page-variant',
    color: '#3a7ca5',
    items: [
      { id: 'surah_kahf', label: 'سورة الكهف', icon: 'book-open-page-variant', color: '#3a7ca5', route: '/surah/18' },
      { id: 'surah_yasin', label: 'سورة يس', icon: 'book-open-page-variant', color: '#5d4e8c', route: '/surah/36' },
      { id: 'surah_mulk', label: 'سورة الملك', icon: 'book-open-page-variant', color: '#0D9488', route: '/surah/67' },
      { id: 'ayat_kursi', label: 'آية الكرسي', icon: 'shield-star', color: '#DAA520', route: '/surah/2?ayah=255' },
      { id: 'daily_ayah', label: 'آية اليوم', icon: 'star-four-points', color: '#f5a623', route: '/daily-ayah' },
      { id: 'full_mushaf', label: 'المصحف الكامل', icon: 'book-open-variant', color: '#2f7659', route: '/(tabs)/quran' },
    ],
  },
  {
    id: 'duas_hadith',
    title: 'أدعية وأحاديث',
    icon: 'hands-pray',
    color: '#c17f59',
    items: [
      { id: 'general_duas', label: 'أدعية عامة', icon: 'hands-pray', color: '#c17f59', route: '/azkar/sunnah_duas' },
      { id: 'daily_dua', label: 'دعاء اليوم', icon: 'calendar-heart', color: '#e91e63', route: '/daily-dua' },
      { id: 'daily_hadith', label: 'حديث اليوم', icon: 'format-quote-open', color: '#6366F1', route: '/daily-ayah' },
      { id: 'ruqya', label: 'الرقية الشرعية', icon: 'shield-check', color: '#e91e63', route: '/ruqya' },
      { id: 'quran_duas', label: 'أدعية من القرآن', icon: 'book-open-variant', color: '#3a7ca5', route: '/azkar/quran_duas' },
    ],
  },
  {
    id: 'worship',
    title: 'عبادات',
    icon: 'mosque',
    color: '#2f7659',
    items: [
      { id: 'prayer_times', label: 'مواقيت الصلاة', icon: 'clock-outline', color: '#2f7659', route: '/(tabs)/prayer' },
      { id: 'qibla', label: 'القبلة', icon: 'compass', color: '#5856D6', route: '/qibla-fullscreen' },
      { id: 'next_prayer', label: 'صلاتي القادمة', icon: 'mosque', color: '#0D9488', route: '/(tabs)/prayer' },
      { id: 'worship_tracker', label: 'تتبع الصلوات', icon: 'chart-line', color: '#2f7659', route: '/worship-tracker' },
      { id: 'hijri_calendar', label: 'التقويم الهجري', icon: 'calendar-month', color: '#0D9488', route: '/hijri' },
    ],
  },
  {
    id: 'tasbih_section',
    title: 'تسبيح واستغفار',
    icon: 'circle-multiple',
    color: '#8B5CF6',
    items: [
      { id: 'tasbih', label: 'المسبحة', icon: 'circle-multiple', color: '#2f7659', route: '/(tabs)/tasbih' },
      { id: 'istighfar', label: 'الاستغفار', icon: 'heart', color: '#8B5CF6', route: '/(tabs)/tasbih?mode=istighfar' },
      { id: 'salawat', label: 'الصلاة على النبي', icon: 'star-crescent', color: '#e91e63', route: '/(tabs)/tasbih?mode=salawat' },
      { id: 'tasbih_log', label: 'سجل التسبيح', icon: 'history', color: '#3a7ca5', route: '/worship-tracker' },
    ],
  },
];

interface ModalCategoryItem { id: string; label: string; icon: string; color: string; route?: string; }
interface ModalCategoryDef { id: string; title: string; icon: string; color: string; items: ModalCategoryItem[]; }

const MODAL_CATEGORIES: ModalCategoryDef[] = [
  {
    id: 'cat_azkar', title: 'أذكار', icon: 'book-open-variant', color: '#f5a623',
    items: [
      { id: 'morning_azkar', label: 'أذكار الصباح', icon: 'weather-sunny', color: '#f5a623', route: '/azkar/morning' },
      { id: 'evening_azkar', label: 'أذكار المساء', icon: 'weather-night', color: '#5d4e8c', route: '/azkar/evening' },
      { id: 'sleep_azkar', label: 'أذكار النوم', icon: 'bed', color: '#3a7ca5', route: '/azkar/sleep' },
      { id: 'wakeup_azkar', label: 'أذكار الاستيقاظ', icon: 'weather-sunset-up', color: '#c17f59', route: '/azkar/wakeup' },
      { id: 'after_prayer_azkar', label: 'أذكار بعد الصلاة', icon: 'mosque', color: '#2f7659', route: '/azkar/after_prayer' },
      { id: 'benefit_azkar', label: 'فضل الأذكار', icon: 'information', color: '#f5a623' },
    ],
  },
  {
    id: 'cat_stories', title: 'قصص', icon: 'book-account', color: '#6366F1',
    items: [
      { id: 'seerah', label: 'قصص الأنبياء', icon: 'book-account', color: '#6366F1' },
      { id: 'companions_stories', label: 'قصص الصحابة', icon: 'account-group', color: '#2f7659', route: '/companions' },
    ],
  },
  {
    id: 'cat_hajj', title: 'مناسك الحج والعمرة', icon: 'star-crescent', color: '#0D9488',
    items: [
      { id: 'hajj_duas', label: 'أدعية الحج', icon: 'hands-pray', color: '#0D9488', route: '/hajj-umrah' },
      { id: 'umrah_duas', label: 'أدعية العمرة', icon: 'hands-pray', color: '#2f7659', route: '/hajj-umrah' },
      { id: 'hajj_steps', label: 'المناسك خطوة بخطوة', icon: 'format-list-numbered', color: '#c17f59', route: '/hajj-umrah' },
      { id: 'hajj_places', label: 'أماكن المناسك', icon: 'map-marker-radius', color: '#3a7ca5', route: '/hajj-umrah' },
    ],
  },
  {
    id: 'cat_quran', title: 'سور وآيات قرآنية', icon: 'book-open-page-variant', color: '#3a7ca5',
    items: [
      { id: 'surah_kahf', label: 'سورة الكهف', icon: 'book-open-page-variant', color: '#3a7ca5' },
      { id: 'surah_yasin', label: 'سورة يس', icon: 'book-open-page-variant', color: '#5d4e8c' },
      { id: 'surah_mulk', label: 'سورة الملك', icon: 'book-open-page-variant', color: '#0D9488' },
      { id: 'ayat_kursi', label: 'آية الكرسي', icon: 'shield-star', color: '#DAA520' },
      { id: 'daily_ayah', label: 'آية اليوم', icon: 'star-four-points', color: '#f5a623', route: '/daily-ayah' },
      { id: 'full_mushaf', label: 'المصحف الكامل', icon: 'book-open-variant', color: '#2f7659', route: '/(tabs)/quran' },
    ],
  },
  {
    id: 'cat_duas', title: 'أدعية وأحاديث', icon: 'hands-pray', color: '#c17f59',
    items: [
      { id: 'general_duas', label: 'أدعية عامة', icon: 'hands-pray', color: '#c17f59', route: '/azkar/sunnah_duas' },
      { id: 'daily_dua', label: 'دعاء اليوم', icon: 'calendar-heart', color: '#e91e63', route: '/daily-dua' },
      { id: 'daily_hadith', label: 'حديث اليوم', icon: 'format-quote-open', color: '#6366F1', route: '/daily-ayah' },
      { id: 'ruqya', label: 'الرقية الشرعية', icon: 'shield-check', color: '#e91e63', route: '/ruqya' },
      { id: 'quran_duas', label: 'أدعية من القرآن', icon: 'book-open-variant', color: '#3a7ca5', route: '/azkar/quran_duas' },
    ],
  },
  {
    id: 'cat_worship', title: 'عبادات', icon: 'mosque', color: '#2f7659',
    items: [
      { id: 'prayer_times', label: 'مواقيت الصلاة', icon: 'clock-outline', color: '#2f7659', route: '/(tabs)/prayer' },
      { id: 'qibla', label: 'القبلة', icon: 'compass', color: '#5856D6' },
      { id: 'next_prayer', label: 'صلاتي القادمة', icon: 'mosque', color: '#0D9488', route: '/(tabs)/prayer' },
      { id: 'worship_tracker', label: 'تتبع الصلوات', icon: 'chart-line', color: '#2f7659', route: '/worship-tracker' },
      { id: 'hijri_calendar', label: 'التقويم الهجري', icon: 'calendar-month', color: '#0D9488', route: '/hijri' },
    ],
  },
  {
    id: 'cat_tasbih', title: 'تسبيح واستغفار', icon: 'circle-multiple', color: '#8B5CF6',
    items: [
      { id: 'tasbih', label: 'المسبحة', icon: 'circle-multiple', color: '#2f7659' },
      { id: 'istighfar', label: 'الاستغفار', icon: 'heart', color: '#8B5CF6' },
      { id: 'salawat', label: 'الصلاة على النبي', icon: 'star-crescent', color: '#e91e63' },
      { id: 'tasbih_log', label: 'سجل التسبيح', icon: 'history', color: '#3a7ca5', route: '/worship-tracker' },
    ],
  },
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
  item: { id: string; nameKey?: string; icon: string; color: string; label?: string };
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
        <GlassCard style={{ padding: 14, alignItems: 'center', justifyContent: 'center', width: 90 }}>
          <View style={[styles.quickAccessIcon, { backgroundColor: `${item.color}15` }]}> 
            <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
          </View>
          <Text style={[styles.quickAccessName, isDarkMode && styles.textLight]} numberOfLines={1}>
            {item.nameKey ? t(item.nameKey) : (item.label || '')}
          </Text>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ========================================
// مكون الأقسام القابلة للطي
// ========================================

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  sectionId: string;
  collapsedSections: string[];
  toggleSection: (id: string) => void;
  isDarkMode: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title, icon, children, sectionId, collapsedSections, toggleSection, isDarkMode,
}) => {
  const expanded = !collapsedSections.includes(sectionId);
  const animValue = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    animValue.value = withSpring(expanded ? 1 : 0, {
      damping: 18,
      stiffness: 240,
    });
  }, [expanded]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animValue.value,
    maxHeight: interpolate(animValue.value, [0, 1], [0, 2000]),
    overflow: 'hidden' as const,
  }));

  return (
    <View>
      <TouchableOpacity onPress={() => {
        toggleSection(sectionId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }} style={collapsibleStyles.sectionHeader} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          {icon && <MaterialCommunityIcons name={icon as any} size={20} color="#2f7659" />}
          <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }, isDarkMode && styles.textMuted]}>{title}</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={isDarkMode ? '#888' : '#999'}
        />
      </TouchableOpacity>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </View>
  );
};

const collapsibleStyles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

// ========================================
// المكون الرئيسي
// ========================================

export default function HomeScreen() {
  const router = useRouter();
  const { isDarkMode, settings, t } = useSettings();
  const isRTL = I18nManager.isRTL;
  const { currentSeason, dailyData } = useSeasonal();

  // Date display
  const homeHijriDate = useMemo(() => getHijriDate(), []);
  const gregorianDateStr = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, []);
  const { getConfig } = useRemoteConfig();
  const logoUrl = getConfig('app_logo_url' as any) as string | undefined;

  // Collapsed sections persistence
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(COLLAPSED_SECTIONS_KEY).then(stored => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setCollapsedSections(parsed);
        } catch {}
      }
    });
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const next = prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
      AsyncStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick Access customization
  const DEFAULT_QUICK_ACCESS_IDS = QUICK_ACCESS.slice(0, 4).map(i => i.id);
  const [selectedQuickAccessIds, setSelectedQuickAccessIds] = useState<string[]>(DEFAULT_QUICK_ACCESS_IDS);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [modalMode, setModalMode] = useState<'select' | 'reorder'>('select');
  const [customItems, setCustomItems] = useState<CustomQuickAccessItem[]>([]);
  const [pendingCustomItems, setPendingCustomItems] = useState<CustomQuickAccessItem[]>([]);
  const [addOtherMode, setAddOtherMode] = useState<null | 'pages' | 'surahs'>(null);
  const [surahSearch, setSurahSearch] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Debug: Log when modal opens
  useEffect(() => {
    if (showCustomizeModal) {
      console.log('=== MODAL DEBUG ===' );
      console.log('MODAL_CATEGORIES count:', MODAL_CATEGORIES.length);
      console.log('filteredCategories count:', filteredCategories.length);
      console.log('Categories:', MODAL_CATEGORIES.map(c => c.title));
    }
  }, [showCustomizeModal]);

  const filteredCategories = useMemo(() => {
    if (!modalSearch.trim()) return MODAL_CATEGORIES;
    const q = modalSearch.trim();
    return MODAL_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.label.includes(q) || cat.title.includes(q)
      ),
    })).filter(cat => cat.items.length > 0);
  }, [modalSearch]);

  const toggleModalCategory = useCallback((catId: string) => {
    setExpandedCategories(prev =>
      prev.includes(catId)
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  }, []);

  const toggleModalItem = useCallback((item: ModalCategoryItem) => {
    Haptics.selectionAsync();
    const isBuiltIn = QUICK_ACCESS_IDS.has(item.id);
    setPendingIds(prev => {
      const isSelected = prev.includes(item.id);
      return isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id];
    });
    if (!isBuiltIn && item.route) {
      setPendingCustomItems(prev => {
        const exists = prev.some(c => c.id === item.id);
        if (exists) return prev.filter(c => c.id !== item.id);
        return [...prev, { id: item.id, icon: item.icon, color: item.color, label: item.label, route: item.route! }];
      });
    } else if (!isBuiltIn) {
      setPendingCustomItems(prev => prev.filter(c => c.id !== item.id));
    }
  }, []);

  const allSurahs = useMemo(() => getAllSurahs(), []);
  const filteredSurahs = useMemo(() => {
    if (!surahSearch.trim()) return allSurahs;
    const q = surahSearch.trim().toLowerCase();
    return allSurahs.filter(s =>
      s.name.includes(q) ||
      s.englishName.toLowerCase().includes(q) ||
      String(s.number) === q
    );
  }, [allSurahs, surahSearch]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('@quick_access_items'),
      AsyncStorage.getItem(CUSTOM_ITEMS_STORAGE_KEY),
    ]).then(([stored, storedCustom]) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedQuickAccessIds(parsed);
          }
        } catch {}
      }
      if (storedCustom) {
        try {
          const parsed = JSON.parse(storedCustom);
          if (Array.isArray(parsed)) setCustomItems(parsed);
        } catch {}
      }
    });
  }, []);

  const saveQuickAccessIds = useCallback(async (ids: string[], customs: CustomQuickAccessItem[]) => {
    setSelectedQuickAccessIds(ids);
    setCustomItems(customs);
    await AsyncStorage.setItem('@quick_access_items', JSON.stringify(ids));
    await AsyncStorage.setItem(CUSTOM_ITEMS_STORAGE_KEY, JSON.stringify(customs));
  }, []);

  const allQuickAccessItems = useMemo(() => {
    const builtIn = QUICK_ACCESS.map(item => ({ ...item, label: undefined, route: undefined }));
    return [...builtIn, ...customItems.map(c => ({ ...c, nameKey: undefined }))];
  }, [customItems]);

  const pendingAllQuickAccessItems = useMemo(() => {
    const builtIn = QUICK_ACCESS.map(item => ({ ...item, label: undefined, route: undefined }));
    return [...builtIn, ...pendingCustomItems.map(c => ({ ...c, nameKey: undefined }))];
  }, [pendingCustomItems]);

  const filteredQuickAccess = [...allQuickAccessItems]
    .filter(item => selectedQuickAccessIds.includes(item.id))
    .sort((a, b) => selectedQuickAccessIds.indexOf(a.id) - selectedQuickAccessIds.indexOf(b.id));

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

  const moveQuickAccessItem = useCallback((index: number, direction: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingIds(prev => {
      const arr = [...prev];
      const targetIndex = index + direction;
      [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
      return arr;
    });
  }, []);

  const navigateToQuickAccess = (itemId: string) => {
    // Check custom items first
    const custom = customItems.find(c => c.id === itemId);
    if (custom) {
      router.push(custom.route as any);
      return;
    }
    switch (itemId) {
      case 'qibla':
        router.navigate('/(tabs)/qibla' as any);
        break;
      case 'favorites':
        router.push('/all-favorites' as any);
        break;
      case 'ayat_kursi':
        router.push('/surah/2?ayah=255' as any);
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
        router.push('/seerah');
        break;
      case 'benefit_azkar':
        router.push('/azkar-search?mode=benefits' as any);
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

        {/* Date Display */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)}>
          <View style={styles.dateRow}>
            <Text style={[styles.dateRowText, styles.dateRowArabic, { color: isDarkMode ? '#ddd' : '#444' }]}>
              {`${homeHijriDate.weekdayAr} ${homeHijriDate.day} ${homeHijriDate.monthNameAr} ${homeHijriDate.year}هـ`}
            </Text>
            <Text style={[styles.dateRowSeparator, { color: isDarkMode ? '#666' : '#bbb' }]}>|</Text>
            <Text style={[styles.dateRowText, { color: isDarkMode ? '#aaa' : '#666' }]}>
              {gregorianDateStr}
            </Text>
          </View>
        </Animated.View>

        {/* Daily Highlights */}
        <CollapsibleSection title="الأبرز" icon="star-circle" sectionId="highlights" collapsedSections={collapsedSections} toggleSection={toggleSection} isDarkMode={isDarkMode}>
          <DailyHighlights showReorderButton />
        </CollapsibleSection>

        {/* الوصول السريع */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <CollapsibleSection title={t('home.quickAccess')} icon="lightning-bolt" sectionId="quickAccess" collapsedSections={collapsedSections} toggleSection={toggleSection} isDarkMode={isDarkMode}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickAccessContainer}
            style={{ direction: 'rtl', overflow: 'visible' }}
          >
            {filteredQuickAccess.map((item, index) => (
              <QuickAccessItem
                key={item.id}
                item={item}
                onPress={() => navigateToQuickAccess(item.id)}
                isDarkMode={isDarkMode}
                index={index}
                t={t}
              />
            ))}
            {/* Customize chip */}
            <Animated.View entering={FadeInDown.delay(200 + filteredQuickAccess.length * 60).duration(400)}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPendingIds([...selectedQuickAccessIds]);
                  setPendingCustomItems([...customItems]);
                  setAddOtherMode(null);
                  setSurahSearch('');
                  setModalSearch('');
                  setExpandedCategories([]);
                  setModalMode('select');
                  setShowCustomizeModal(true);
                }}
                activeOpacity={0.8}
              >
                <GlassCard style={{ padding: 14, alignItems: 'center', justifyContent: 'center', width: 90 }}>
                  <View style={[styles.quickAccessIcon, { backgroundColor: isDarkMode ? 'rgba(170,170,170,0.15)' : 'rgba(136,136,136,0.15)' }]}>
                    <MaterialCommunityIcons name="pencil-plus" size={22} color={isDarkMode ? '#aaa' : '#888'} />
                  </View>
                  <Text style={[styles.quickAccessName, isDarkMode && styles.textLight]} numberOfLines={1}>
                    تخصيص
                  </Text>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
          </CollapsibleSection>
        </Animated.View>

        {/* 7 الأقسام الرئيسية المطوية */}
        {HOME_SECTIONS.map((section, sectionIndex) => (
          <Animated.View
            key={section.id}
            entering={FadeInDown.delay(200 + sectionIndex * 80).duration(500)}
          >
            <CollapsibleSection
              title={section.title}
              icon={section.icon}
              sectionId={section.id}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              isDarkMode={isDarkMode}
            >
              <View style={isGrid ? styles.categoriesGridWrap : styles.categoriesGrid}>
                {section.items.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInRight.delay(index * 60).duration(400)}
                    style={isGrid ? { width: (SCREEN_WIDTH - 32 - 10) / 2 } : undefined}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (item.route) {
                          router.push(item.route as any);
                        }
                      }}
                      activeOpacity={0.8}
                      style={isGrid ? styles.gridCardOuter : styles.listCardOuter}
                    >
                      <BlurView
                        intensity={Platform.OS === 'ios' ? 80 : 40}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={isGrid ? styles.gridCardBlur : styles.listCardBlur}
                      >
                        <View
                          style={[
                            isGrid ? styles.gridCard : styles.listCard,
                            {
                              backgroundColor: isDarkMode
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(255,255,255,0.40)',
                              borderColor: isDarkMode
                                ? 'rgba(255,255,255,0.15)'
                                : 'rgba(0,0,0,0.06)',
                            },
                          ]}
                        >
                          {isGrid ? (
                            <>
                              <View style={styles.gridCardIcon}>
                                <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
                              </View>
                              <Text style={[styles.gridCardLabel, isDarkMode && styles.textLight]} numberOfLines={2}>
                                {item.label}
                              </Text>
                            </>
                          ) : (
                            <>
                              <View style={styles.listCardLeft}>
                                <View style={[styles.listCardIcon, { backgroundColor: `${item.color}18` }]}>
                                  <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                                </View>
                                <Text style={[styles.listCardLabel, isDarkMode && styles.textLight]}>
                                  {item.label}
                                </Text>
                              </View>
                              <MaterialCommunityIcons
                                name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
                                size={20}
                                color={isDarkMode ? '#666' : '#ccc'}
                              />
                            </>
                          )}
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </CollapsibleSection>
          </Animated.View>
        ))}

        <BannerAdComponent screen="home" />
        <View style={styles.bottomSpace} />
      </ScrollView>
      </SafeAreaView>

      {/* Quick Access Customize Modal — rendered outside ScrollView to prevent stacking on mobile */}
      <Modal
        visible={showCustomizeModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (addOtherMode) { setAddOtherMode(null); setSurahSearch(''); }
          else setShowCustomizeModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 90 : 50}
            tint={isDarkMode ? 'dark' : 'light'}
            style={styles.modalBlur}
          >
            <View style={[
              styles.modalContent,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(30,30,32,0.55)'
                  : 'rgba(255,255,255,0.7)',
                borderWidth: 0.5,
                borderColor: 'rgba(255,255,255,0.2)',
              },
            ]}>
              <Text style={[
                styles.modalTitle,
                { color: isDarkMode ? '#fff' : '#333' },
              ]}>
                {addOtherMode === 'pages' ? 'صفحة من التطبيق'
                  : addOtherMode === 'surahs' ? 'سورة من القرآن'
                  : 'تخصيص الوصول السريع'}
              </Text>

              {addOtherMode && (
                <TouchableOpacity
                  style={styles.modalBackBtn}
                  onPress={() => { setAddOtherMode(null); setSurahSearch(''); }}
                >
                  <MaterialCommunityIcons name="arrow-right" size={20} color={isDarkMode ? '#aaa' : '#666'} />
                  <Text style={[styles.modalBackText, { color: isDarkMode ? '#aaa' : '#666' }]}>رجوع</Text>
                </TouchableOpacity>
              )}

              {!addOtherMode && (
                <View style={styles.modalModeToggle}>
                  <TouchableOpacity
                    style={[styles.modalModeBtn, modalMode === 'select' && styles.modalModeBtnActive]}
                    onPress={() => setModalMode('select')}
                  >
                    <Text style={[styles.modalModeBtnText, modalMode === 'select' && styles.modalModeBtnTextActive, { color: isDarkMode ? '#aaa' : '#666' }]}>اختيار</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalModeBtn, modalMode === 'reorder' && styles.modalModeBtnActive]}
                    onPress={() => setModalMode('reorder')}
                  >
                    <Text style={[styles.modalModeBtnText, modalMode === 'reorder' && styles.modalModeBtnTextActive, { color: isDarkMode ? '#aaa' : '#666' }]}>ترتيب</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!addOtherMode && modalMode === 'select' && (
                <>
                  <View style={[styles.surahSearchContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={isDarkMode ? '#aaa' : '#888'} />
                    <TextInput
                      style={[styles.surahSearchInput, { color: isDarkMode ? '#fff' : '#333' }]}
                      placeholder="ابحث عن قسم..."
                      placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                      value={modalSearch}
                      onChangeText={setModalSearch}
                      autoCorrect={false}
                      textAlign="right"
                    />
                    {modalSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setModalSearch('')}>
                        <MaterialCommunityIcons name="close-circle" size={18} color={isDarkMode ? '#666' : '#aaa'} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                    {filteredCategories.map(category => {
                      const isExpanded = expandedCategories.includes(category.id);
                      return (
                        <View key={category.id}>
                          <TouchableOpacity
                            style={[styles.modalCategoryHeader, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
                            activeOpacity={0.7}
                            onPress={() => { Haptics.selectionAsync(); toggleModalCategory(category.id); }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View style={[styles.modalItemIcon, { backgroundColor: `${category.color}20` }]}>
                                <MaterialCommunityIcons name={category.icon as any} size={20} color={category.color} />
                              </View>
                              <Text style={[styles.modalCategoryTitle, { color: isDarkMode ? '#fff' : '#333' }]}>
                                {category.title}
                              </Text>
                              <View style={[styles.modalCategoryBadge, { backgroundColor: `${category.color}20` }]}>
                                <Text style={[styles.modalCategoryBadgeText, { color: category.color }]}>{category.items.length}</Text>
                              </View>
                            </View>
                            <MaterialCommunityIcons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={22}
                              color={isDarkMode ? '#666' : '#999'}
                            />
                          </TouchableOpacity>
                          {isExpanded && category.items.map(item => {
                            const isSelected = pendingIds.includes(item.id) || pendingCustomItems.some(c => c.id === item.id);
                            return (
                              <TouchableOpacity
                                key={item.id}
                                style={[styles.modalItem, styles.modalCategoryItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                activeOpacity={0.7}
                                onPress={() => toggleModalItem(item)}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                  <View style={[styles.modalItemIcon, { backgroundColor: `${item.color}15`, width: 32, height: 32, borderRadius: 16 }]}>
                                    <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                                  </View>
                                  <Text style={[styles.modalItemLabel, { color: isDarkMode ? '#ddd' : '#444' }]}>{item.label}</Text>
                                </View>
                                <MaterialCommunityIcons
                                  name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                  size={24}
                                  color={isSelected ? '#2f7659' : (isDarkMode ? '#666' : '#ccc')}
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })}
                    <View style={[styles.modalDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
                    <Text style={[styles.modalSectionHeader, { color: isDarkMode ? '#aaa' : '#888' }]}>إضافة أخرى</Text>
                    <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} activeOpacity={0.7} onPress={() => { Haptics.selectionAsync(); setAddOtherMode('pages'); }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={[styles.modalItemIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}><MaterialCommunityIcons name="view-grid-plus" size={20} color="#6366F1" /></View>
                        <Text style={[styles.modalItemLabel, { color: isDarkMode ? '#fff' : '#333' }]}>صفحة من التطبيق</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-left" size={22} color={isDarkMode ? '#666' : '#ccc'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} activeOpacity={0.7} onPress={() => { Haptics.selectionAsync(); setAddOtherMode('surahs'); }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={[styles.modalItemIcon, { backgroundColor: 'rgba(13,148,136,0.15)' }]}><MaterialCommunityIcons name="book-open-page-variant" size={20} color="#0D9488" /></View>
                        <Text style={[styles.modalItemLabel, { color: isDarkMode ? '#fff' : '#333' }]}>سورة من القرآن</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-left" size={22} color={isDarkMode ? '#666' : '#ccc'} />
                    </TouchableOpacity>
                  </ScrollView>
                </>
              )}

              {addOtherMode === 'pages' && (
                <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                  {EXTRA_APP_PAGES.map(page => {
                    const alreadyAdded = pendingCustomItems.some(c => c.id === page.id);
                    return (
                      <TouchableOpacity key={page.id} style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }, alreadyAdded && { opacity: 0.5 }]} activeOpacity={0.7} disabled={alreadyAdded} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPendingCustomItems(prev => [...prev, page]); setPendingIds(prev => [...prev, page.id]); setAddOtherMode(null); }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={[styles.modalItemIcon, { backgroundColor: `${page.color}20` }]}><MaterialCommunityIcons name={page.icon as any} size={20} color={page.color} /></View>
                          <Text style={[styles.modalItemLabel, { color: isDarkMode ? '#fff' : '#333' }]}>{page.label}</Text>
                        </View>
                        {alreadyAdded && <MaterialCommunityIcons name="check" size={20} color="#2f7659" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {addOtherMode === 'surahs' && (
                <View style={{ flex: 1 }}>
                  <View style={[styles.surahSearchContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={isDarkMode ? '#aaa' : '#888'} />
                    <TextInput style={[styles.surahSearchInput, { color: isDarkMode ? '#fff' : '#333' }]} placeholder="ابحث عن سورة..." placeholderTextColor={isDarkMode ? '#666' : '#aaa'} value={surahSearch} onChangeText={setSurahSearch} autoCorrect={false} textAlign="right" />
                  </View>
                  <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                    {filteredSurahs.map(surah => {
                      const surahItemId = `surah_custom_${surah.number}`;
                      const alreadyAdded = pendingCustomItems.some(c => c.id === surahItemId);
                      const startPage = surah.ayahs[0]?.p || 1;
                      return (
                        <TouchableOpacity key={surah.number} style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }, alreadyAdded && { opacity: 0.5 }]} activeOpacity={0.7} disabled={alreadyAdded} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); const newItem: CustomQuickAccessItem = { id: surahItemId, icon: 'book-open-page-variant', color: '#0D9488', label: surah.name, route: `/surah/${surah.number}?page=${startPage}` }; setPendingCustomItems(prev => [...prev, newItem]); setPendingIds(prev => [...prev, surahItemId]); setAddOtherMode(null); setSurahSearch(''); }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View style={[styles.surahNumber, { backgroundColor: isDarkMode ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.1)' }]}>
                              <Text style={[styles.surahNumberText, { color: isDarkMode ? '#5EEAD4' : '#0D9488' }]}>{surah.number}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.modalItemLabel, { color: isDarkMode ? '#fff' : '#333' }]}>{surah.name}</Text>
                              <Text style={[styles.surahSubtitle, { color: isDarkMode ? '#888' : '#999' }]}>{surah.englishName} · {surah.ayahs.length} آيات</Text>
                            </View>
                          </View>
                          {alreadyAdded && <MaterialCommunityIcons name="check" size={20} color="#2f7659" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {!addOtherMode && modalMode === 'reorder' && (
                <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                  {pendingIds.map((id, index) => {
                    const item = pendingAllQuickAccessItems.find(i => i.id === id);
                    if (!item) return null;
                    return (
                      <View key={id} style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={[styles.modalItemIcon, { backgroundColor: `${item.color}20` }]}><MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} /></View>
                          <Text style={[styles.modalItemLabel, { color: isDarkMode ? '#fff' : '#333' }]}>{item.nameKey ? t(item.nameKey) : ((item as any).label || '')}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <TouchableOpacity disabled={index === 0} onPress={() => moveQuickAccessItem(index, -1)} style={{ opacity: index === 0 ? 0.3 : 1, padding: 4 }}><MaterialCommunityIcons name="chevron-up" size={22} color={isDarkMode ? '#fff' : '#333'} /></TouchableOpacity>
                          <TouchableOpacity disabled={index === pendingIds.length - 1} onPress={() => moveQuickAccessItem(index, 1)} style={{ opacity: index === pendingIds.length - 1 ? 0.3 : 1, padding: 4 }}><MaterialCommunityIcons name="chevron-down" size={22} color={isDarkMode ? '#fff' : '#333'} /></TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {!addOtherMode && (
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowCustomizeModal(false)}>
                    <Text style={[styles.modalBtnText, { color: isDarkMode ? '#aaa' : '#666' }]}>إلغاء</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm, !pendingIds.length && { opacity: 0.5 }]} disabled={!pendingIds.length} onPress={() => { saveQuickAccessIds(pendingIds, pendingCustomItems); setShowCustomizeModal(false); }}>
                    <Text style={styles.modalBtnConfirmText}>حفظ</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </BlurView>
        </View>
      </Modal>

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
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },

  // Date Row
  dateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  dateRowText: {
    fontSize: 13,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'center' as const,
  },
  dateRowArabic: {
    writingDirection: 'rtl' as const,
  },
  dateRowSeparator: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
  },

  // الوصول السريع
  quickAccessContainer: {
    paddingHorizontal: 20,
    paddingVertical: 4,
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
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  listCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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

  // Quick Access Customize Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBlur: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  modalBackText: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
  },
  modalList: {
    flex: 1,
    minHeight: 200,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemLabel: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'right',
  },
  modalDivider: {
    height: 1,
    marginVertical: 12,
  },
  modalSectionHeader: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    textAlign: 'right',
    marginBottom: 8,
  },
  modalCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCategoryTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    textAlign: 'right',
  },
  modalCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalCategoryBadgeText: {
    fontSize: 12,
    fontFamily: 'Cairo-SemiBold',
  },
  modalCategoryItem: {
    paddingLeft: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  modalBtnConfirm: {
    backgroundColor: '#2f7659',
  },
  modalBtnText: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
  },
  modalBtnConfirmText: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    color: '#fff',
  },
  surahSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  surahSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Cairo-Regular',
    paddingVertical: 0,
  },
  surahNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNumberText: {
    fontSize: 13,
    fontFamily: 'Cairo-Bold',
  },
  surahSubtitle: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    textAlign: 'right',
  },
  modalModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  modalModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalModeBtnActive: {
    backgroundColor: '#2f7659',
  },
  modalModeBtnText: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
  },
  modalModeBtnTextActive: {
    color: '#fff',
  },
});
