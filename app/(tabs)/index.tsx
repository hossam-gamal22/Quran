// app/(tabs)/index.tsx
// الصفحة الرئيسية - الأذكار - روح المسلم

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight, FadeIn, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllSurahs, type QuranV4Surah } from '@/lib/qcf-page-data';
import { getLocalizedHijriDate } from '@/lib/hijri-date';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { useSettings } from '@/contexts/SettingsContext';
import { useSeasonal } from '@/contexts/SeasonalContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useColors } from '@/hooks/use-colors';
import { fetchAppConfig, WelcomeBannerConfig, fetchHomePageConfig, type HomePageConfig } from '@/lib/app-config-api';
import { useFeatures } from '@/hooks/use-feature-enabled';
import DailyHighlights from '@/components/ui/DailyHighlights';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { ColoredButton } from '@/components/ui/colored-button';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { Dimensions } from 'react-native';
import { getCachedPrayerTimes, getNextPrayer, getTimeRemaining, getPrayerNameAr, timeStringToDate, type PrayerTimes, type PrayerName } from '@/lib/prayer-times';
import { schedulePrayerNotification, requestNotificationPermission, cancelNotification, scheduleLocalNotification } from '@/lib/push-notifications';
import * as Notifications from 'expo-notifications';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { safeIcon } from '@/lib/safe-icon';

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
  { id: 'favorites', nameKey: 'home.favorites', icon: 'heart', color: '#FF6B6B' },
  { id: 'ayat_kursi', nameKey: 'home.ayatKursi', icon: 'shield-star', color: '#DAA520' },
  { id: 'surah_kahf', nameKey: 'home.surahKahf', icon: 'book-open-page-variant', color: '#3a7ca5' },
  { id: 'surah_yasin', nameKey: 'home.surahYasin', icon: 'book-open-page-variant', color: '#5d4e8c' },
  { id: 'surah_mulk', nameKey: 'home.surahMulk', icon: 'book-open-page-variant', color: '#0D9488' },
  { id: 'names', nameKey: 'home.namesOfAllah', icon: 'star-crescent', color: '#c17f59' },
  { id: 'tasbih', nameKey: 'tabs.tasbih', icon: 'counter', color: '#2f7659' },
  { id: 'salawat', nameKey: 'home.salawat', icon: 'star-crescent', color: '#e91e63' },
  { id: 'istighfar', nameKey: 'home.istighfar', icon: 'heart', color: '#8B5CF6' },
  { id: 'hajj', nameKey: 'hajjUmrah.title', icon: 'star-crescent', color: '#0D9488' },
  { id: 'seerah', nameKey: 'home.seerah', icon: 'book-account', color: '#6366F1' },
  { id: 'benefit_azkar', nameKey: 'home.benefitAzkar', icon: 'information', color: '#f5a623' },
  { id: 'radio', nameKey: 'radio.title', icon: 'radio', color: '#22C55E' },
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
  { id: 'page_browse_tafsir', icon: 'book-search', color: '#3a7ca5', label: '', nameKey: 'home.browseTafsir', route: '/browse-tafsir' },
  { id: 'page_hijri', icon: 'calendar-month', color: '#0D9488', label: '', nameKey: 'home.hijriCalendar', route: '/hijri' },
  { id: 'page_widget_settings', icon: 'widgets', color: '#6366F1', label: '', nameKey: 'home.widgetSettingsLabel', route: '/widget-settings' },
  { id: 'page_daily_dua', icon: 'hands-pray', color: '#c17f59', label: '', nameKey: 'home.dailyDua', route: '/daily-dua' },
  { id: 'page_seerah', icon: 'book-account', color: '#2f7659', label: '', nameKey: 'home.seerah', route: '/seerah' },
  { id: 'page_names', icon: 'star-crescent', color: '#DAA520', label: '', nameKey: 'home.namesOfAllah', route: '/names' },
  { id: 'page_ruqya', icon: 'shield-check', color: '#e91e63', label: '', nameKey: 'azkar.ruqya', route: '/ruqya' },
  { id: 'page_companions', icon: 'account-group', color: '#2f7659', label: '', nameKey: 'companions.title', route: '/companions' },
  { id: 'page_quran_bookmarks', icon: 'bookmark', color: '#4CAF50', label: '', nameKey: 'home.quranBookmarks', route: '/quran-bookmarks' },
  { id: 'page_worship_tracker', icon: 'chart-line', color: '#2f7659', label: '', nameKey: 'home.followWorship', route: '/worship-tracker' },
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
  labelKey: string;
  icon: string;
  color: string;
  route?: string;
}

interface HomeSectionDef {
  id: string;
  titleKey: string;
  icon: string;
  color: string;
  items: HomeSectionItem[];
}

const HOME_SECTIONS: HomeSectionDef[] = [
  {
    id: 'azkar',
    titleKey: 'home.azkarSection',
    icon: 'book-open-variant',
    color: '#f5a623',
    items: [
      { id: 'morning', labelKey: 'home.morningAzkar', icon: 'weather-sunny', color: '#f5a623', route: '/azkar/morning' },
      { id: 'evening', labelKey: 'home.eveningAzkar', icon: 'weather-night', color: '#5d4e8c', route: '/azkar/evening' },
      { id: 'sleep', labelKey: 'home.sleepAzkar', icon: 'bed', color: '#3a7ca5', route: '/azkar/sleep' },
      { id: 'wakeup', labelKey: 'home.wakeupAzkar', icon: 'weather-sunset-up', color: '#c17f59', route: '/azkar/wakeup' },
      { id: 'after_prayer', labelKey: 'azkar.afterPrayer', icon: 'mosque', color: '#2f7659', route: '/azkar/after_prayer' },
      { id: 'benefit_azkar', labelKey: 'home.benefitAzkar', icon: 'information', color: '#f5a623', route: '/azkar-search?mode=benefits' },
    ],
  },
  {
    id: 'stories',
    titleKey: 'home.storiesSection',
    icon: 'book-account',
    color: '#6366F1',
    items: [
      { id: 'seerah', labelKey: 'seerah.title', icon: 'book-account', color: '#6366F1', route: '/seerah' },
      { id: 'companions', labelKey: 'companions.title', icon: 'account-group', color: '#2f7659', route: '/companions' },
    ],
  },
  {
    id: 'hajj_umrah',
    titleKey: 'home.hajjUmrahSection',
    icon: 'star-crescent',
    color: '#0D9488',
    items: [
      { id: 'hajj_duas', labelKey: 'hajjUmrah.hajj', icon: 'mosque', color: '#0D9488', route: '/hajj' },
      { id: 'umrah_duas', labelKey: 'hajjUmrah.umrah', icon: 'hands-pray', color: '#2f7659', route: '/umrah' },
    ],
  },
  {
    id: 'quran_surahs',
    titleKey: 'home.quranSurahsSection',
    icon: 'book-open-page-variant',
    color: '#3a7ca5',
    items: [
      { id: 'surah_kahf', labelKey: 'home.surahKahf', icon: 'book-open-page-variant', color: '#3a7ca5', route: '/surah/18' },
      { id: 'surah_yasin', labelKey: 'home.surahYasin', icon: 'book-open-page-variant', color: '#5d4e8c', route: '/surah/36' },
      { id: 'surah_mulk', labelKey: 'home.surahMulk', icon: 'book-open-page-variant', color: '#0D9488', route: '/surah/67' },
      { id: 'ayat_kursi', labelKey: 'home.ayatKursi', icon: 'shield-star', color: '#DAA520', route: '/surah/2?ayah=255' },
      { id: 'daily_ayah', labelKey: 'home.dailyVerse', icon: 'star-four-points', color: '#f5a623', route: '/daily-ayah' },
      { id: 'full_mushaf', labelKey: 'home.fullMushaf', icon: 'book-open-variant', color: '#2f7659', route: '/(tabs)/quran' },
    ],
  },
  {
    id: 'duas_hadith',
    titleKey: 'home.duasHadithSection',
    icon: 'hands-pray',
    color: '#c17f59',
    items: [
      { id: 'general_duas', labelKey: 'home.selectedDuas', icon: 'hands-pray', color: '#c17f59', route: '/azkar/sunnah_duas' },
      { id: 'daily_dua', labelKey: 'home.dailyDua', icon: 'calendar-heart', color: '#e91e63', route: '/daily-dua' },
      { id: 'daily_hadith', labelKey: 'home.hadithOfDay', icon: 'format-quote-open', color: '#6366F1', route: '/hadith-of-day' },
      { id: 'ruqya', labelKey: 'azkar.ruqya', icon: 'shield-check', color: '#e91e63', route: '/ruqya' },
      { id: 'quran_duas', labelKey: 'azkar.quranDuas', icon: 'book-open-variant', color: '#3a7ca5', route: '/azkar/quran_duas' },
    ],
  },
  {
    id: 'worship',
    titleKey: 'home.worshipSection',
    icon: 'mosque',
    color: '#2f7659',
    items: [
      { id: 'worship_tracker', labelKey: 'home.worshipTracker', icon: 'chart-areaspline', color: '#2f7659', route: '/worship-tracker' },
      { id: 'prayer_times', labelKey: 'home.prayerTimesLabel', icon: 'clock-outline', color: '#2f7659', route: '/(tabs)/prayer' },
      { id: 'qibla', labelKey: 'home.qibla', icon: 'compass', color: '#5856D6', route: '/(tabs)/prayer?tab=qibla' },
      { id: 'next_prayer', labelKey: 'home.myNextPrayer', icon: 'mosque', color: '#0D9488', route: '/(tabs)/prayer?view=next' },
      { id: 'hijri_calendar', labelKey: 'home.hijriCalendar', icon: 'calendar-month', color: '#0D9488', route: '/hijri' },
      { id: 'radio', labelKey: 'radio.title', icon: 'radio', color: '#22C55E', route: '/radio' },
    ],
  },
  {
    id: 'tasbih_section',
    titleKey: 'home.tasbihSection',
    icon: 'counter',
    color: '#8B5CF6',
    items: [
      { id: 'tasbih', labelKey: 'tabs.tasbih', icon: 'counter', color: '#2f7659', route: '/(tabs)/tasbih' },
      { id: 'istighfar', labelKey: 'home.istighfar', icon: 'heart', color: '#8B5CF6', route: '/azkar/istighfar' },
      { id: 'salawat', labelKey: 'home.salawat', icon: 'star-crescent', color: '#e91e63', route: '/azkar/salawat' },
      { id: 'tasbih_log', labelKey: 'home.tasbihLog', icon: 'history', color: '#3a7ca5', route: '/tasbih-stats' },
    ],
  },
  {
    id: 'marifat_allah',
    titleKey: 'home.knowAllah',
    icon: 'star-crescent',
    color: '#DAA520',
    items: [
      { id: 'names_of_allah', labelKey: 'home.namesOfAllah', icon: 'star-crescent', color: '#DAA520', route: '/names' },
      { id: 'ayat_universe', labelKey: 'home.versesOfGreatness', icon: 'creation', color: '#3a7ca5', route: '/ayat-universe' },
      { id: 'hadith_sifat', labelKey: 'home.hadithAttributes', icon: 'format-quote-open', color: '#c17f59', route: '/hadith-sifat' },
    ],
  },
];

interface ModalCategoryItem { id: string; labelKey: string; icon: string; color: string; route?: string; }
interface ModalCategoryDef { id: string; titleKey: string; icon: string; color: string; items: ModalCategoryItem[]; }

const MODAL_CATEGORIES: ModalCategoryDef[] = [
  {
    id: 'cat_azkar', titleKey: 'home.azkarSection', icon: 'book-open-variant', color: '#f5a623',
    items: [
      { id: 'morning_azkar', labelKey: 'home.morningAzkar', icon: 'weather-sunny', color: '#f5a623', route: '/azkar/morning' },
      { id: 'evening_azkar', labelKey: 'home.eveningAzkar', icon: 'weather-night', color: '#5d4e8c', route: '/azkar/evening' },
      { id: 'sleep_azkar', labelKey: 'home.sleepAzkar', icon: 'bed', color: '#3a7ca5', route: '/azkar/sleep' },
      { id: 'wakeup_azkar', labelKey: 'home.wakeupAzkar', icon: 'weather-sunset-up', color: '#c17f59', route: '/azkar/wakeup' },
      { id: 'after_prayer_azkar', labelKey: 'azkar.afterPrayer', icon: 'mosque', color: '#2f7659', route: '/azkar/after_prayer' },
      { id: 'benefit_azkar', labelKey: 'home.benefitAzkar', icon: 'information', color: '#f5a623', route: '/azkar-search?mode=benefits' },
    ],
  },
  {
    id: 'cat_stories', titleKey: 'home.storiesSection', icon: 'book-account', color: '#6366F1',
    items: [
      { id: 'seerah', labelKey: 'seerah.title', icon: 'book-account', color: '#6366F1', route: '/seerah' },
      { id: 'companions_stories', labelKey: 'companions.title', icon: 'account-group', color: '#2f7659', route: '/companions' },
    ],
  },
  {
    id: 'cat_hajj', titleKey: 'home.hajjUmrahSection', icon: 'star-crescent', color: '#0D9488',
    items: [
      { id: 'hajj_duas', labelKey: 'hajjUmrah.hajj', icon: 'mosque', color: '#0D9488', route: '/hajj' },
      { id: 'umrah_duas', labelKey: 'hajjUmrah.umrah', icon: 'hands-pray', color: '#2f7659', route: '/umrah' },
    ],
  },
  {
    id: 'cat_quran', titleKey: 'home.quranSurahsSection', icon: 'book-open-page-variant', color: '#3a7ca5',
    items: [
      { id: 'surah_kahf', labelKey: 'home.surahKahf', icon: 'book-open-page-variant', color: '#3a7ca5', route: '/surah/18' },
      { id: 'surah_yasin', labelKey: 'home.surahYasin', icon: 'book-open-page-variant', color: '#5d4e8c', route: '/surah/36' },
      { id: 'surah_mulk', labelKey: 'home.surahMulk', icon: 'book-open-page-variant', color: '#0D9488', route: '/surah/67' },
      { id: 'ayat_kursi', labelKey: 'home.ayatKursi', icon: 'shield-star', color: '#DAA520', route: '/surah/2?ayah=255' },
      { id: 'daily_ayah', labelKey: 'home.dailyVerse', icon: 'star-four-points', color: '#f5a623', route: '/daily-ayah' },
      { id: 'full_mushaf', labelKey: 'home.fullMushaf', icon: 'book-open-variant', color: '#2f7659', route: '/(tabs)/quran' },
    ],
  },
  {
    id: 'cat_duas', titleKey: 'home.duasHadithSection', icon: 'hands-pray', color: '#c17f59',
    items: [
      { id: 'general_duas', labelKey: 'home.selectedDuas', icon: 'hands-pray', color: '#c17f59', route: '/azkar/sunnah_duas' },
      { id: 'daily_dua', labelKey: 'home.dailyDua', icon: 'calendar-heart', color: '#e91e63', route: '/daily-dua' },
      { id: 'daily_hadith', labelKey: 'home.hadithOfDay', icon: 'format-quote-open', color: '#6366F1', route: '/hadith-of-day' },
      { id: 'ruqya', labelKey: 'azkar.ruqya', icon: 'shield-check', color: '#e91e63', route: '/ruqya' },
      { id: 'quran_duas', labelKey: 'azkar.quranDuas', icon: 'book-open-variant', color: '#3a7ca5', route: '/azkar/quran_duas' },
    ],
  },
  {
    id: 'cat_worship', titleKey: 'home.worshipSection', icon: 'mosque', color: '#2f7659',
    items: [
      { id: 'worship_tracker', labelKey: 'home.worshipTracker', icon: 'chart-areaspline', color: '#2f7659', route: '/worship-tracker' },
      { id: 'prayer_times', labelKey: 'home.prayerTimesLabel', icon: 'clock-outline', color: '#2f7659', route: '/(tabs)/prayer' },
      { id: 'qibla', labelKey: 'home.qibla', icon: 'compass', color: '#5856D6', route: '/(tabs)/prayer?tab=qibla' },
      { id: 'next_prayer', labelKey: 'home.myNextPrayer', icon: 'mosque', color: '#0D9488', route: '/(tabs)/prayer?view=next' },
      { id: 'hijri_calendar', labelKey: 'home.hijriCalendar', icon: 'calendar-month', color: '#0D9488', route: '/hijri' },
      { id: 'radio', labelKey: 'radio.title', icon: 'radio', color: '#22C55E', route: '/radio' },
    ],
  },
  {
    id: 'cat_tasbih', titleKey: 'home.tasbihSection', icon: 'counter', color: '#8B5CF6',
    items: [
      { id: 'tasbih', labelKey: 'tabs.tasbih', icon: 'counter', color: '#2f7659', route: '/(tabs)/tasbih' },
      { id: 'istighfar', labelKey: 'home.istighfar', icon: 'heart', color: '#8B5CF6', route: '/azkar/istighfar' },
      { id: 'salawat', labelKey: 'home.salawat', icon: 'star-crescent', color: '#e91e63', route: '/azkar/salawat' },
      { id: 'tasbih_log', labelKey: 'home.tasbihLog', icon: 'history', color: '#3a7ca5', route: '/tasbih-stats' },
    ],
  },
  {
    id: 'cat_marifat', titleKey: 'home.knowAllah', icon: 'star-crescent', color: '#DAA520',
    items: [
      { id: 'names_of_allah', labelKey: 'home.namesOfAllah', icon: 'star-crescent', color: '#DAA520', route: '/names' },
      { id: 'ayat_universe', labelKey: 'home.versesOfGreatness', icon: 'creation', color: '#3a7ca5', route: '/ayat-universe' },
      { id: 'hadith_sifat', labelKey: 'home.hadithAttributes', icon: 'format-quote-open', color: '#c17f59', route: '/hadith-sifat' },
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
  const isRTL = useIsRTL();
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
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}>
            <View style={styles.listCardIcon}> 
              <MaterialCommunityIcons name={category.icon as any} size={22} color={category.color} />
            </View>
            <Text style={[styles.listCardLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {t(category.nameKey)}
            </Text>
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-left' : 'chevron-right'}
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
  isRTL?: boolean;
}

const QuickAccessItem: React.FC<QuickAccessItemProps> = ({ item, onPress, isDarkMode, index, t, isRTL }) => {
  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 60).duration(400)}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.8}
      >
        <GlassCard style={{ padding: 10, width: 100 }}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name={safeIcon(item.icon) as any} size={28} color={item.color} style={{ marginBottom: 6 }} />
          <Text style={[styles.quickAccessName, isDarkMode && styles.textLight, { writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
            {item.nameKey ? t(item.nameKey) : (item.label || '')}
          </Text>
          </View>
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
  infoKey?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title, icon, children, sectionId, collapsedSections, toggleSection, isDarkMode, infoKey,
}) => {
  const expanded = !collapsedSections.includes(sectionId);
  const isRTL = useIsRTL();

  return (
    <View>
      <TouchableOpacity onPress={() => {
        toggleSection(sectionId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }} style={[collapsibleStyles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} activeOpacity={0.7}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
          {icon && <MaterialCommunityIcons name={icon as any} size={20} color="#2f7659" />}
          <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0, textAlign: isRTL ? 'right' : 'left' }, isDarkMode && styles.textMuted]}>{title}</Text>
          {infoKey && <SectionInfoButton sectionKey={infoKey} />}
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={isDarkMode ? '#888' : '#999'}
        />
      </TouchableOpacity>
      {expanded && (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)}>
          {children}
        </Animated.View>
      )}
    </View>
  );
};

const collapsibleStyles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
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
  const colors = useColors();
  const isRTL = useIsRTL();
  const quickAccessScrollRef = useRef<ScrollView>(null);
  const { currentSeason, dailyData } = useSeasonal();
  const features = useFeatures();

  // Date display
  const homeHijriDate = useMemo(() => getLocalizedHijriDate(), []);
  const gregorianDateStr = useMemo(() => {
    const { getLocalizedFullDate } = require('@/lib/hijri-date');
    const full = getLocalizedFullDate();
    return full.formatted.gregorian;
  }, []);
  const { getConfig } = useRemoteConfig();
  const logoUrl = getConfig('app_logo_url' as any) as string | undefined;
  const { logoSource } = useAppIdentity();

  // Collapsed sections persistence
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [sectionsInitialized, setSectionsInitialized] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(COLLAPSED_SECTIONS_KEY).then(stored => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setCollapsedSections(parsed);
        } catch {}
      }
      setSectionsInitialized(true);
    });
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    // Prevent toggle before initial load completes to avoid race condition
    if (!sectionsInitialized) return;
    
    setCollapsedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  }, [sectionsInitialized]);

  // Persist collapsed sections separately (React best practice: side effects in useEffect)
  useEffect(() => {
    if (sectionsInitialized) {
      AsyncStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(collapsedSections));
    }
  }, [collapsedSections, sectionsInitialized]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // HomePageConfig: section visibility/ordering from admin
  const [homeConfig, setHomeConfig] = useState<HomePageConfig | null>(null);
  useEffect(() => {
    fetchHomePageConfig().then(cfg => {
      if (cfg) setHomeConfig(cfg);
    });
  }, []);

  // Map section IDs to feature keys for toggle filtering
  const sectionFeatureMap: Record<string, string> = {
    azkar: 'azkar',
    quran_surahs: 'quran',
    worship: 'prayer',
    tasbih_section: 'tasbih',
  };

  const orderedSections = useMemo(() => {
    let sections = HOME_SECTIONS;

    // Filter by feature toggles
    sections = sections.filter(s => {
      const featureKey = sectionFeatureMap[s.id];
      if (featureKey && features[featureKey as keyof typeof features] === false) return false;
      return true;
    });

    // Filter and sort by admin config
    if (homeConfig?.sections?.items?.length) {
      const configItems = homeConfig.sections.items;
      sections = sections
        .filter(s => {
          const cfg = configItems.find(ci => ci.id === s.id);
          return !cfg || cfg.enabled !== false;
        })
        .sort((a, b) => {
          const cfgA = configItems.find(ci => ci.id === a.id);
          const cfgB = configItems.find(ci => ci.id === b.id);
          return (cfgA?.order ?? 99) - (cfgB?.order ?? 99);
        });
    }

    return sections;
  }, [homeConfig, features]);

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

  // Next Prayer modal state
  const [showNextPrayerModal, setShowNextPrayerModal] = useState(false);
  const [notificationScheduled, setNotificationScheduled] = useState(false);
  const [scheduledNotifId, setScheduledNotifId] = useState<string | null>(null);
  const [hideNotifAlert, setHideNotifAlert] = useState(false);

  // Load "don't show again" preference
  useEffect(() => {
    AsyncStorage.getItem('@hide_next_prayer_alert').then(v => {
      if (v === 'true') setHideNotifAlert(true);
    });
  }, []);
  const [cachedPrayerTimes, setCachedPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayerCountdown, setNextPrayerCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  // Load cached prayer times — try cache first, fallback to fetch
  useEffect(() => {
    const loadPrayerTimes = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const cached = await getCachedPrayerTimes(today);
        if (cached) {
          setCachedPrayerTimes(cached);
          return;
        }
        // No cache — try to fetch using saved location
        const { getStoredLocation, fetchPrayerTimes, parsePrayerTimes } = await import('@/lib/prayer-times');
        const loc = await getStoredLocation();
        if (loc) {
          const response = await fetchPrayerTimes(loc);
          if (response) {
            const times = parsePrayerTimes(response);
            setCachedPrayerTimes(times);
          }
        }
      } catch (e) {
        console.log('[Home] Failed to load prayer times:', e);
      }
    };
    loadPrayerTimes();
  }, []);

  // Countdown timer for next prayer modal
  useEffect(() => {
    if (!showNextPrayerModal || !cachedPrayerTimes) return;
    const update = () => {
      const remaining = getTimeRemaining(cachedPrayerTimes);
      setNextPrayerCountdown(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [showNextPrayerModal, cachedPrayerTimes]);

  // Debug: Log when modal opens
  useEffect(() => {
    if (showCustomizeModal) {
      console.log('=== MODAL DEBUG ===' );
      console.log('MODAL_CATEGORIES count:', MODAL_CATEGORIES.length);
      console.log('filteredCategories count:', filteredCategories.length);
      console.log('Categories:', MODAL_CATEGORIES.map(c => c.titleKey));
    }
  }, [showCustomizeModal]);

  const filteredCategories = useMemo(() => {
    if (!modalSearch.trim()) return MODAL_CATEGORIES;
    const q = modalSearch.trim();
    return MODAL_CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        t(item.labelKey).includes(q) || t(cat.titleKey).includes(q)
      ),
    })).filter(cat => cat.items.length > 0);
  }, [modalSearch, t]);

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
        return [...prev, { id: item.id, icon: item.icon, color: item.color, label: '', nameKey: item.labelKey, route: item.route! }];
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
          if (Array.isArray(parsed)) {
            // Migrate any cached routes pointing to deprecated /special-surah
            // Also update quran bookmarks icon/color to match current design
            const migrated = parsed.map((item: CustomQuickAccessItem) => {
              if (item.route && item.route.startsWith('/special-surah')) {
                const match = item.route.match(/[?&]surah=(\d+)/);
                const surahNum = match ? match[1] : '18';
                return { ...item, route: `/surah/${surahNum}` };
              }
              if (item.id === 'page_quran_bookmarks') {
                return { ...item, icon: 'bookmark', color: '#4CAF50' };
              }
              return item;
            });
            setCustomItems(migrated);
            // Persist migrated routes
            if (JSON.stringify(migrated) !== storedCustom) {
              AsyncStorage.setItem(CUSTOM_ITEMS_STORAGE_KEY, JSON.stringify(migrated));
            }
          }
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
    return [...builtIn, ...customItems];
  }, [customItems]);

  const pendingAllQuickAccessItems = useMemo(() => {
    const builtIn = QUICK_ACCESS.map(item => ({ ...item, label: undefined, route: undefined }));
    return [...builtIn, ...pendingCustomItems];
  }, [pendingCustomItems]);

  const filteredQuickAccess = [...allQuickAccessItems]
    .filter(item => selectedQuickAccessIds.includes(item.id))
    .sort((a, b) => selectedQuickAccessIds.indexOf(a.id) - selectedQuickAccessIds.indexOf(b.id));

  // Welcome banner from Firestore
  const [welcomeBanner, setWelcomeBanner] = useState<WelcomeBannerConfig | null>({
    enabled: true,
    title: t('ramadan.blessedRamadan'),
    subtitle: t('ramadan.dailyTasks'),
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
    // Items that always show modal/special behavior — check before custom items
    if (itemId === 'next_prayer') {
      setShowNextPrayerModal(true);
      return;
    }

    // Check custom items first
    const custom = customItems.find(c => c.id === itemId);
    if (custom) {
      router.push(custom.route as any);
      return;
    }
    switch (itemId) {
      case 'qibla':
        router.navigate({ pathname: '/(tabs)/prayer', params: { tab: 'qibla' } } as any);
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
      case 'next_prayer':
        setShowNextPrayerModal(true);
        break;
      case 'hajj':
        router.push('/hajj');
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
      case 'radio':
        router.push('/radio' as any);
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
      opacity={settings.display.backgroundOpacity ?? 1}
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
            source={logoSource}
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
                    <View style={[styles.seasonContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={styles.seasonInfo}>
                        <Text style={[styles.seasonName, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{welcomeBanner.title}</Text>
                        <Text style={[styles.seasonGreeting, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{welcomeBanner.subtitle}</Text>
                      </View>
                      <MaterialCommunityIcons name={safeIcon(welcomeBanner.icon, 'heart') as any} size={36} color="#fff" />
                    </View>
                  </View>
                </ImageBackground>
              ) : (
                <View
                  style={[styles.seasonCard, { backgroundColor: `${welcomeBanner.color}CC` }]}
                >
                  <View style={[styles.seasonContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.seasonInfo}>
                      <Text style={[styles.seasonName, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{welcomeBanner.title}</Text>
                      <Text style={[styles.seasonGreeting, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{welcomeBanner.subtitle}</Text>
                    </View>
                    <MaterialCommunityIcons name={safeIcon(welcomeBanner.icon, 'heart') as any} size={36} color="#fff" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Date Display */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)}>
          <View style={[styles.dateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.dateRowText, isRTL && styles.dateRowArabic, { color: colors.text }]}>
              {`${homeHijriDate.weekday} ${homeHijriDate.day} ${homeHijriDate.monthName} ${homeHijriDate.year} ${t('calendar.ahSuffix')}`}
            </Text>
            <Text style={[styles.dateRowSeparator, { color: colors.textLight }]}>|</Text>
            <Text style={[styles.dateRowText, { color: colors.textLight }]}>
              {gregorianDateStr}
            </Text>
          </View>
        </Animated.View>

        {/* Daily Highlights */}
        <CollapsibleSection title={t('home.highlights')} icon="star-circle" sectionId="highlights" collapsedSections={collapsedSections} toggleSection={toggleSection} isDarkMode={isDarkMode}>
          <DailyHighlights showReorderButton onNextPrayerPress={() => setShowNextPrayerModal(true)} />
        </CollapsibleSection>

        {/* الوصول السريع */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <CollapsibleSection title={t('home.quickAccess')} icon="lightning-bolt" sectionId="quickAccess" collapsedSections={collapsedSections} toggleSection={toggleSection} isDarkMode={isDarkMode}>
          <ScrollView
            ref={quickAccessScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.quickAccessContainer, isRTL && { flexDirection: 'row-reverse' }]}
            style={{ overflow: 'visible' }}
            onContentSizeChange={() => {
              if (isRTL) {
                quickAccessScrollRef.current?.scrollToEnd({ animated: false });
              }
            }}
          >
            {filteredQuickAccess.map((item, index) => (
              <Animated.View key={item.id}>
                <QuickAccessItem
                  item={item}
                  onPress={() => navigateToQuickAccess(item.id)}
                  isDarkMode={isDarkMode}
                  index={index}
                  t={t}
                  isRTL={isRTL}
                />
              </Animated.View>
            ))}
            {/* Customize chip */}
            <Animated.View entering={FadeInDown.delay(200 + filteredQuickAccess.length * 60).duration(400)}>
              <Pressable
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setPendingIds([...selectedQuickAccessIds]);
                  setPendingCustomItems([...customItems]);
                  setAddOtherMode(null);
                  setSurahSearch('');
                  setModalSearch('');
                  setExpandedCategories([]);
                  setModalMode('select');
                  setShowCustomizeModal(true);
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={t('home.customizeQuickAccess')}
              >
                <GlassCard style={{ padding: 10, width: 100 }}>
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="pencil-plus" size={28} color={isDarkMode ? '#aaa' : '#888'} style={{ marginBottom: 6 }} />
                  <Text style={[styles.quickAccessName, isDarkMode && styles.textLight, { writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {t('home.customize')}
                  </Text>
                  </View>
                </GlassCard>
              </Pressable>
            </Animated.View>
          </ScrollView>
          </CollapsibleSection>
        </Animated.View>

        {/* 7 الأقسام الرئيسية المطوية */}
        {orderedSections.map((section, sectionIndex) => (
          <Animated.View
            key={section.id}
            entering={FadeInDown.delay(200 + sectionIndex * 80).duration(500)}
          >
            <CollapsibleSection
              title={t(section.titleKey)}
              icon={section.icon}
              sectionId={section.id}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              isDarkMode={isDarkMode}
              infoKey={section.id}
            >
              <View style={[isGrid ? styles.categoriesGridWrap : styles.categoriesGrid, isGrid && { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {section.items.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInRight.delay(index * 60).duration(400)}
                    style={isGrid ? { width: (SCREEN_WIDTH - 32 - 10) / 2 } : undefined}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (item.id === 'next_prayer') {
                          setShowNextPrayerModal(true);
                          return;
                        }
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
                            !isGrid && { flexDirection: isRTL ? 'row-reverse' : 'row' },
                          ]}
                        >
                          {isGrid ? (
                            <>
                              <View style={styles.gridCardIcon}>
                                <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
                              </View>
                              <Text style={[styles.gridCardLabel, isDarkMode && styles.textLight]} numberOfLines={2}>
                                {t(item.labelKey)}
                              </Text>
                            </>
                          ) : (
                            <>
                              <View style={[styles.listCardLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <View style={[styles.listCardIcon, { backgroundColor: `${item.color}18` }]}>
                                  <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                                </View>
                                <Text style={[styles.listCardLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                                  {t(item.labelKey)}
                                </Text>
                              </View>
                              <MaterialCommunityIcons
                                name={isRTL ? 'chevron-left' : 'chevron-right'}
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
        <SafeAreaView style={styles.modalOverlay}>
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
                { color: colors.text },
              ]}>
                {addOtherMode === 'pages' ? t('home.appPage')
                  : addOtherMode === 'surahs' ? t('home.quranSurahLabel')
                  : t('home.customizeQuickAccess')}
              </Text>

              {addOtherMode && (
                <TouchableOpacity
                  style={[styles.modalBackBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => { setAddOtherMode(null); setSurahSearch(''); }}
                >
                  <MaterialCommunityIcons name={isRTL ? 'arrow-left' : 'arrow-right'} size={20} color={isDarkMode ? '#aaa' : '#666'} />
                  <Text style={[styles.modalBackText, { color: colors.textLight }]}>{t('common.back')}</Text>
                </TouchableOpacity>
              )}

              {!addOtherMode && (
                <View style={[styles.modalModeToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[styles.modalModeBtn, modalMode === 'select' && styles.modalModeBtnActive]}
                    onPress={() => setModalMode('select')}
                  >
                    <Text style={[styles.modalModeBtnText, modalMode === 'select' && styles.modalModeBtnTextActive, { color: colors.textLight }]}>{t('home.selectMode')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalModeBtn, modalMode === 'reorder' && styles.modalModeBtnActive]}
                    onPress={() => setModalMode('reorder')}
                  >
                    <Text style={[styles.modalModeBtnText, modalMode === 'reorder' && styles.modalModeBtnTextActive, { color: colors.textLight }]}>{t('home.reorderMode')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!addOtherMode && modalMode === 'select' && (
                <>
                  <View style={[styles.surahSearchContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={isDarkMode ? '#aaa' : '#888'} />
                    <TextInput
                      style={[styles.surahSearchInput, { color: colors.text }]}
                      placeholder={t('home.searchSection')}
                      placeholderTextColor={isDarkMode ? '#666' : '#aaa'}
                      value={modalSearch}
                      onChangeText={setModalSearch}
                      autoCorrect={false}
                      textAlign={isRTL ? 'right' : 'left'}
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
                            style={[styles.modalCategoryHeader, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                            activeOpacity={0.7}
                            onPress={() => { Haptics.selectionAsync(); toggleModalCategory(category.id); }}
                          >
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                              <View style={[styles.modalItemIcon, { backgroundColor: `${category.color}20` }]}>
                                <MaterialCommunityIcons name={category.icon as any} size={20} color={category.color} />
                              </View>
                              <Text style={[styles.modalCategoryTitle, { color: colors.text }]}>
                                {t(category.titleKey)}
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
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                  <View style={[styles.modalItemIcon, { backgroundColor: `${item.color}15`, width: 32, height: 32, borderRadius: 16 }]}>
                                    <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                                  </View>
                                  <Text style={[styles.modalItemLabel, { color: colors.text }]}>{t(item.labelKey)}</Text>
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
                    <Text style={[styles.modalSectionHeader, { color: colors.textLight }]}>{t('home.addOther')}</Text>
                    <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} activeOpacity={0.7} onPress={() => { Haptics.selectionAsync(); setAddOtherMode('pages'); }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={[styles.modalItemIcon, { backgroundColor: 'rgba(99,102,241,0.15)' }]}><MaterialCommunityIcons name="view-grid-plus" size={20} color="#6366F1" /></View>
                        <Text style={[styles.modalItemLabel, { color: colors.text }]}>{t('home.appPage')}</Text>
                      </View>
                      <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={isDarkMode ? '#666' : '#ccc'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} activeOpacity={0.7} onPress={() => { Haptics.selectionAsync(); setAddOtherMode('surahs'); }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={[styles.modalItemIcon, { backgroundColor: 'rgba(13,148,136,0.15)' }]}><MaterialCommunityIcons name="book-open-page-variant" size={20} color="#0D9488" /></View>
                        <Text style={[styles.modalItemLabel, { color: colors.text }]}>{t('home.quranSurahLabel')}</Text>
                      </View>
                      <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={isDarkMode ? '#666' : '#ccc'} />
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
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={[styles.modalItemIcon, { backgroundColor: `${page.color}20` }]}><MaterialCommunityIcons name={page.icon as any} size={20} color={page.color} /></View>
                          <Text style={[styles.modalItemLabel, { color: colors.text }]}>{page.nameKey ? t(page.nameKey) : page.label}</Text>
                        </View>
                        {alreadyAdded && <MaterialCommunityIcons name="check" size={20} color="#2f7659" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {addOtherMode === 'surahs' && (
                <View style={{ flex: 1 }}>
                  <View style={[styles.surahSearchContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={isDarkMode ? '#aaa' : '#888'} />
                    <TextInput style={[styles.surahSearchInput, { color: colors.text }]} placeholder={t('home.searchSurah')} placeholderTextColor={isDarkMode ? '#666' : '#aaa'} value={surahSearch} onChangeText={setSurahSearch} autoCorrect={false} textAlign={isRTL ? 'right' : 'left'} />
                  </View>
                  <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                    {filteredSurahs.map(surah => {
                      const surahItemId = `surah_custom_${surah.number}`;
                      const alreadyAdded = pendingCustomItems.some(c => c.id === surahItemId);
                      const startPage = surah.ayahs[0]?.p || 1;
                      return (
                        <TouchableOpacity key={surah.number} style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }, alreadyAdded && { opacity: 0.5 }]} activeOpacity={0.7} disabled={alreadyAdded} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); const newItem: CustomQuickAccessItem = { id: surahItemId, icon: 'book-open-page-variant', color: '#0D9488', label: surah.name, route: `/surah/${surah.number}?page=${startPage}` }; setPendingCustomItems(prev => [...prev, newItem]); setPendingIds(prev => [...prev, surahItemId]); setAddOtherMode(null); setSurahSearch(''); }}>
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View style={[styles.surahNumber, { backgroundColor: isDarkMode ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.1)' }]}>
                              <Text style={[styles.surahNumberText, { color: isDarkMode ? '#5EEAD4' : '#0D9488' }]}>{surah.number}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.modalItemLabel, { color: colors.text }]}>{surah.name}</Text>
                              <Text style={[styles.surahSubtitle, { color: colors.textLight }]}>{surah.englishName} · {surah.ayahs.length} {t('quran.ayahs')}</Text>
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
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={[styles.modalItemIcon, { backgroundColor: `${item.color}20` }]}><MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} /></View>
                          <Text style={[styles.modalItemLabel, { color: colors.text }]}>{item.nameKey ? t(item.nameKey) : ((item as any).label || '')}</Text>
                        </View>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 4 }}>
                          <TouchableOpacity disabled={index === 0} onPress={() => moveQuickAccessItem(index, -1)} style={{ opacity: index === 0 ? 0.3 : 1, padding: 4 }}><MaterialCommunityIcons name="chevron-up" size={22} color={isDarkMode ? '#fff' : '#333'} /></TouchableOpacity>
                          <TouchableOpacity disabled={index === pendingIds.length - 1} onPress={() => moveQuickAccessItem(index, 1)} style={{ opacity: index === pendingIds.length - 1 ? 0.3 : 1, padding: 4 }}><MaterialCommunityIcons name="chevron-down" size={22} color={isDarkMode ? '#fff' : '#333'} /></TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {!addOtherMode && (
                <View style={[styles.modalButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setShowCustomizeModal(false)}>
                    <Text style={[styles.modalBtnText, { color: colors.textLight }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm, !pendingIds.length && { opacity: 0.5 }]} disabled={!pendingIds.length} onPress={() => { saveQuickAccessIds(pendingIds, pendingCustomItems); setShowCustomizeModal(false); }}>
                    <Text style={styles.modalBtnConfirmText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </BlurView>
        </SafeAreaView>
      </Modal>

      {/* Next Prayer Bottom Sheet Modal */}
      <Modal
        visible={showNextPrayerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNextPrayerModal(false)}
      >
        <Pressable
          style={styles.nextPrayerOverlay}
          onPress={() => setShowNextPrayerModal(false)}
        >
          <Pressable style={[styles.nextPrayerSheet, isDarkMode && styles.nextPrayerSheetDark]}>
            {/* Handle bar */}
            <View style={styles.nextPrayerHandle} />

            {(() => {
              const nextPrayer = cachedPrayerTimes ? getNextPrayer(cachedPrayerTimes) : null;
              const prayerNameAr = nextPrayer ? getPrayerNameAr(nextPrayer.name) : '';
              const prayerNameTranslated = nextPrayer ? t(`prayer.${nextPrayer.name}`) : '';
              return (
                <>
                  {/* Mosque icon */}
                  <View style={[styles.nextPrayerIconCircle, { backgroundColor: '#0D9488' + '18' }]}>
                    <MaterialCommunityIcons name="mosque" size={36} color="#0D9488" />
                  </View>

                  <Text style={[styles.nextPrayerTitle, { color: colors.text }]}>
                    {t('home.myNextPrayer')}
                  </Text>

                  {nextPrayer ? (
                    <>
                      <Text style={[styles.nextPrayerName, { color: '#0D9488' }]}>
                        {prayerNameTranslated}
                      </Text>
                      <Text style={[styles.nextPrayerTime, { color: colors.textLight }]}>
                        {nextPrayer.time}
                      </Text>

                      {/* Countdown */}
                      {nextPrayerCountdown && (
                        <View style={styles.nextPrayerCountdownRow}>
                          {[
                            { value: nextPrayerCountdown.hours, label: t('home.hour') },
                            { value: nextPrayerCountdown.minutes, label: t('home.minuteLabel') },
                            { value: nextPrayerCountdown.seconds, label: t('home.secondLabel') },
                          ].map((item, i) => (
                            <View key={i} style={[styles.nextPrayerCountdownBox, isDarkMode && styles.nextPrayerCountdownBoxDark]}>
                              <Text style={[styles.nextPrayerCountdownNum, { color: '#0D9488' }]}>
                                {String(item.value).padStart(2, '0')}
                              </Text>
                              <Text style={[styles.nextPrayerCountdownLabel, { color: colors.textLight }]}>
                                {item.label}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <Text style={[styles.nextPrayerTime, { color: colors.textLight }]}>
                        {t('home.noPrayerData')}
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: '#0D9488', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 }}
                        onPress={() => { setShowNextPrayerModal(false); router.navigate('/(tabs)/prayer'); }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' }}>
                          {t('prayer.title')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Enable notification toggle */}
                  {nextPrayer && (
                    <View style={[styles.nextPrayerToggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }, isDarkMode && styles.nextPrayerToggleRowDark]}>
                      <View style={[styles.nextPrayerToggleInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons
                          name={notificationScheduled ? 'bell-ring' : 'bell-outline'}
                          size={18}
                          color={notificationScheduled ? '#0D9488' : colors.textLight}
                        />
                        <Text style={[styles.nextPrayerToggleLabel, isDarkMode && { color: '#eee' }]}>
                          {t('home.alertBeforePrayer')}
                        </Text>
                      </View>
                      <Switch
                        value={notificationScheduled}
                        onValueChange={(value) => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          if (!value) {
                            setNotificationScheduled(false);
                            if (scheduledNotifId) {
                              cancelNotification(scheduledNotifId).catch(() => {});
                              setScheduledNotifId(null);
                            }
                            return;
                          }
                          setNotificationScheduled(true);
                          requestNotificationPermission().then(() => {
                            // === TEST: send a notification in 30 seconds to verify ===
                            if (__DEV__) {
                              const testDate = new Date();
                              testDate.setSeconds(testDate.getSeconds() + 30);
                              scheduleLocalNotification(
                                {
                                  title: `🔔 ${t('notifications.testPrayerTitle')}`,
                                  body: t('notifications.testBody'),
                                  data: { type: 'test' },
                                },
                                {
                                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                                  date: testDate,
                                }
                              ).catch(() => {});
                            }
                            // === END TEST ===
                            const prayerDate = timeStringToDate(nextPrayer.time);
                            if (prayerDate <= new Date()) {
                              prayerDate.setDate(prayerDate.getDate() + 1);
                            }
                            return schedulePrayerNotification(prayerNameAr, prayerDate, 5);
                          }).then((notifId) => {
                            setScheduledNotifId(notifId);
                            if (!hideNotifAlert) {
                              Alert.alert(
                                t('home.alertActivated'),
                                t('home.alertActivatedMsg'),
                                [
                                  { text: t('common.ok') },
                                  {
                                    text: t('home.dontShowAgain'),
                                    onPress: () => {
                                      setHideNotifAlert(true);
                                      AsyncStorage.setItem('@hide_next_prayer_alert', 'true');
                                    },
                                  },
                                ]
                              );
                            }
                          }).catch((e) => {
                            console.log('Notification error:', e);
                            setNotificationScheduled(false);
                          });
                        }}
                        trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
                        thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                        ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
                      />
                    </View>
                  )}

                  {/* Go to prayer page button */}
                  <TouchableOpacity
                    style={[styles.nextPrayerBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => {
                      setShowNextPrayerModal(false);
                      router.navigate('/(tabs)/prayer' as any);
                    }}
                  >
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#fff" />
                    <Text style={styles.nextPrayerBtnText}>{t('home.viewAllTimes')}</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
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
  },
  containerDark: {
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
    fontFamily: fontBold(),
    color: '#fff',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  seasonGreeting: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
    writingDirection: 'rtl',
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
    fontFamily: fontMedium(),
    color: '#fff',
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#333',
    marginBottom: 12,
    marginTop: 20,
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
    fontFamily: fontSemiBold(),
    textAlign: 'center' as const,
  },
  dateRowArabic: {
    writingDirection: 'rtl' as const,
  },
  dateRowSeparator: {
    fontSize: 14,
    fontFamily: fontRegular(),
  },

  // الوصول السريع
  quickAccessContainer: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 10,
  },
  quickAccessItem: {
    borderRadius: 16,
    padding: 6,
    alignItems: 'center',
    width: 88,
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickAccessItemDark: {
    backgroundColor: 'rgba(120,120,128,0.18)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  quickAccessIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickAccessName: {
    fontSize: 13,
    fontFamily: fontMedium(),
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
    fontFamily: fontSemiBold(),
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
  listCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    fontFamily: fontSemiBold(),
    color: '#444',
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
    paddingHorizontal: 16,
    paddingVertical: 50,
  },
  modalBlur: {
    flex: 1,
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
    fontFamily: fontBold(),
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalBackText: {
    fontSize: 14,
    fontFamily: fontSemiBold(),
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
    fontFamily: fontSemiBold(),
  },
  modalDivider: {
    height: 1,
    marginVertical: 12,
  },
  modalSectionHeader: {
    fontSize: 14,
    fontFamily: fontBold(),
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
    fontFamily: fontBold(),
  },
  modalCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalCategoryBadgeText: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
  },
  modalCategoryItem: {
    paddingStart: 20,
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
    fontFamily: fontSemiBold(),
  },
  modalBtnConfirmText: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
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
    fontFamily: fontRegular(),
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
    fontFamily: fontBold(),
  },
  surahSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
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
    fontFamily: fontSemiBold(),
  },
  modalModeBtnTextActive: {
    color: '#fff',
  },

  // Next Prayer Bottom Sheet
  nextPrayerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  nextPrayerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
  },
  nextPrayerSheetDark: {
    backgroundColor: '#1e293b',
  },
  nextPrayerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginBottom: 20,
  },
  nextPrayerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  nextPrayerTitle: {
    fontSize: 18,
    fontFamily: fontSemiBold(),
    color: '#374151',
    marginBottom: 8,
  },
  nextPrayerName: {
    fontSize: 32,
    fontFamily: fontBold(),
    marginBottom: 4,
  },
  nextPrayerTime: {
    fontSize: 17,
    fontFamily: fontMedium(),
    color: '#6b7280',
    marginBottom: 20,
  },
  nextPrayerCountdownRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  nextPrayerCountdownBox: {
    width: 72,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  nextPrayerCountdownBoxDark: {
    backgroundColor: '#334155',
  },
  nextPrayerCountdownNum: {
    fontSize: 26,
    fontFamily: fontBold(),
    lineHeight: 32,
  },
  nextPrayerCountdownLabel: {
    fontSize: 11,
    fontFamily: fontMedium(),
    color: '#9ca3af',
    marginTop: 2,
  },
  nextPrayerToggleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  nextPrayerToggleRowDark: {
    borderBottomColor: '#2a2a3e',
  },
  nextPrayerToggleInfo: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  nextPrayerToggleLabel: {
    fontSize: 14,
    fontFamily: fontMedium(),
    color: '#333',
  },
  nextPrayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
  },
  nextPrayerBtnText: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
    color: '#fff',
  },
});
