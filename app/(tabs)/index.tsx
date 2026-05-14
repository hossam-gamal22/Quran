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
  Platform,
  Modal,
  TextInput,
  LayoutAnimation,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight, FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllSurahs, type QuranV4Surah } from '@/lib/qcf-page-data';
import { getLocalizedHijriDate } from '@/lib/hijri-date';
import { getCategoryById, type AzkarCategoryType, resolveCategoryId } from '@/lib/azkar-api';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { useSettings } from '@/contexts/SettingsContext';
import { useSeasonal } from '@/contexts/SeasonalContext';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useColors } from '@/hooks/use-colors';
import { fetchAppConfig, WelcomeBannerConfig, MultiLangText, fetchHomePageConfig, subscribeToHomePageConfig, type HomePageConfig } from '@/lib/app-config-api';
import { useFeatures } from '@/hooks/use-feature-enabled';
import DailyHighlights from '@/components/ui/DailyHighlights';
import ShareAppModal from '@/components/ui/ShareAppModal';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { InlineMrecAd } from '@/components/ads/InlineMrecAd';
import { useAdBottomInset } from '@/lib/ads-context';
import { ColoredButton } from '@/components/ui/colored-button';
import { GlassCard } from '@/components/ui/GlassCard';
import { AppIcon } from '@/components/ui/AppIcon';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { Dimensions } from 'react-native';
import { getCachedPrayerTimes, getNextPrayer, getTimeRemaining, getPrayerNameAr, timeStringToDate, type PrayerTimes, type PrayerName } from '@/lib/prayer-times';
import { schedulePrayerNotification, requestNotificationPermission, cancelNotification, scheduleLocalNotification } from '@/lib/push-notifications';
import * as Notifications from 'expo-notifications';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { safeIcon } from '@/lib/safe-icon';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { showOfflineModal } from '@/components/ui/OfflineBanner';
import { PermissionBanner } from '@/components/notifications/PermissionBanner';
import { getUserId } from '@/lib/firebase-user';
import { getMonthlyLeaderboard, getUserMonthlyInfo, syncMonthlyEngagementFromLocalWorship } from '@/lib/rewards-manager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ========================================
// Helper to get azkar category color/icon from single source of truth (categories.json)
// ========================================
const getAzkarCategoryData = (categoryId: AzkarCategoryType) => {
  const resolvedId = resolveCategoryId(categoryId);
  const cat = getCategoryById(resolvedId);
  return {
    color: cat?.color || '#0d8e62',
    icon: cat?.icon || 'book',
  };
};

// ========================================
// Centralized page configs (single source of truth for icons/colors)
// These should match the ACCENT colors used inside each page
// ========================================
const PAGE_CONFIGS = {
  daily_dua: { icon: '🤲', color: '#7c3aed' }, // matches daily-dua.tsx ACCENT
  question_answer: { icon: 'frequently-asked-questions', color: '#0d8e62' }, // matches question-answer.tsx ACCENT
  names: { icon: 'star-crescent', color: '#0d8e62' }, // matches names.tsx green theme
  ayat_universe: { icon: 'creation', color: '#3a7ca5' }, // cosmos theme - matches page
  hadith_sifat: { icon: 'format-quote-open', color: '#0d8e62' }, // matches names green theme
  seerah: { icon: 'book-account', color: '#6366F1' }, // seerah page
  companions: { icon: 'account-group', color: '#0d8e62' }, // companions page
  daily_hadith: { icon: 'format-quote-open', color: '#6366F1' }, // hadith of day
};

// ========================================
// الثوابت
// ========================================

const AZKAR_CATEGORIES = [
  { id: '1', nameKey: 'home.morningAzkar', ...getAzkarCategoryData('1'), count: 23 },
  { id: '1b', nameKey: 'home.eveningAzkar', ...getAzkarCategoryData('1b'), count: 21 },
  { id: '2', nameKey: 'home.sleepAzkar', ...getAzkarCategoryData('2'), count: 13 },
  { id: '3', nameKey: 'home.wakeupAzkar', ...getAzkarCategoryData('3'), count: 4 },
  { id: '27', nameKey: 'azkar.afterPrayer', ...getAzkarCategoryData('27'), count: 20 },
  { id: '34', nameKey: 'azkar.ruqya', ...getAzkarCategoryData('34'), count: 12 },
];

const QUICK_ACCESS = [
  { id: 'qibla', nameKey: 'home.qibla', icon: 'compass', color: '#5856D6' },
  { id: 'favorites', nameKey: 'home.favorites', icon: 'heart', color: '#FF6B6B' },
  { id: 'question_answer', nameKey: 'questionAnswer.title', icon: 'frequently-asked-questions', color: '#0d8e62' },
  { id: 'ayat_kursi', nameKey: 'home.ayatKursi', icon: 'shield-star', color: '#9B7B00' },
  { id: 'surah_kahf', nameKey: 'home.surahKahf', icon: 'book-open-page-variant', color: '#3a7ca5' },
  { id: 'surah_yasin', nameKey: 'home.surahYasin', icon: 'book-open-page-variant', color: '#9B6BD6' },
  { id: 'surah_mulk', nameKey: 'home.surahMulk', icon: 'book-open-page-variant', color: '#0D9488' },
  { id: 'names', nameKey: 'home.namesOfAllah', ...PAGE_CONFIGS.names },
  { id: 'tasbih', nameKey: 'tabs.tasbih', icon: 'counter', color: '#0d8e62' },
  { id: 'salawat', nameKey: 'home.salawat', ...getAzkarCategoryData('107') },
  { id: 'istighfar', nameKey: 'home.istighfar', ...getAzkarCategoryData('129') },
  { id: 'benefit_azkar', nameKey: 'home.benefitAzkar', icon: 'information', color: getAzkarCategoryData('1').color },
  { id: 'hajj', nameKey: 'hajjUmrah.title', icon: 'star-crescent', color: '#0D9488' },
  { id: 'seerah', nameKey: 'home.seerah', icon: 'book-account', color: '#6366F1' },
  { id: 'radio', nameKey: 'radio.title', icon: 'radio', color: '#0d8e62' },
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
  { id: 'page_widget_settings', icon: 'widgets', color: '#6366F1', label: '', nameKey: 'home.widgetSettingsLabel', route: '/widget' },
  { id: 'page_daily_dua', ...PAGE_CONFIGS.daily_dua, label: '', nameKey: 'home.dailyDua', route: '/daily-dua' },
  { id: 'page_seerah', icon: 'book-account', color: '#0d8e62', label: '', nameKey: 'home.seerah', route: '/seerah' },
  { id: 'page_names', ...PAGE_CONFIGS.names, label: '', nameKey: 'home.namesOfAllah', route: '/names' },
  { id: 'page_ruqya', ...getAzkarCategoryData('34'), label: '', nameKey: 'azkar.ruqya', route: '/ruqya' },
  { id: 'page_companions', icon: 'account-group', color: '#0d8e62', label: '', nameKey: 'companions.title', route: '/companions' },
  { id: 'page_quote_of_day', icon: 'lightbulb-on', color: '#c07b10', label: '', nameKey: 'home.quoteOfDay', route: '/quote-of-day' },
  { id: 'page_quran_bookmarks', icon: 'bookmark', color: '#0d8e62', label: '', nameKey: 'home.quranBookmarks', route: '/quran-bookmarks' },
  { id: 'page_worship_tracker', icon: 'chart-line', color: '#0d8e62', label: '', nameKey: 'home.followWorship', route: '/worship-tracker' },
];

const CUSTOM_ITEMS_STORAGE_KEY = '@quick_access_custom_items';
const COLLAPSED_SECTIONS_KEY = '@home_collapsed_sections';

const DUA_CATEGORIES = [
  { id: '26', nameKey: 'azkar.quranDuas', ...getAzkarCategoryData('26') },
  { id: '34', nameKey: 'azkar.sunnahDuas', ...getAzkarCategoryData('34') },
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
  iconTextColor?: boolean;
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
    icon: getAzkarCategoryData('1').icon,
    color: getAzkarCategoryData('1').color,
    items: [
      { id: '1', labelKey: 'home.morningAzkar', ...getAzkarCategoryData('1'), route: '/azkar/1' },
      { id: '1b', labelKey: 'home.eveningAzkar', ...getAzkarCategoryData('1b'), route: '/azkar/1b' },
      { id: '2', labelKey: 'home.sleepAzkar', ...getAzkarCategoryData('2'), route: '/azkar/2' },
      { id: '3', labelKey: 'home.wakeupAzkar', ...getAzkarCategoryData('3'), route: '/azkar/3' },
      { id: '27', labelKey: 'azkar.afterPrayer', ...getAzkarCategoryData('27'), route: '/azkar/27' },
      { id: 'more_azkar', labelKey: 'home.moreAzkar', icon: 'book-open-variant', color: '#0d8e62', route: '/more-azkar' },
    ],
  },
  {
    id: 'stories',
    titleKey: 'home.storiesSection',
    icon: 'book-account',
    color: '#6366F1',
    items: [
      { id: 'seerah', labelKey: 'seerah.title', icon: 'book-account', color: '#6366F1', route: '/seerah' },
      { id: 'companions', labelKey: 'companions.title', icon: 'account-group', color: '#0d8e62', route: '/companions' },
    ],
  },
  {
    id: 'hajj_umrah',
    titleKey: 'home.hajjUmrahSection',
    icon: 'star-crescent',
    color: '#0D9488',
    items: [
      { id: 'hajj_duas', labelKey: 'hajjUmrah.hajj', icon: '🕋', color: '#0D9488', route: '/hajj' },
      { id: 'umrah_duas', labelKey: 'hajjUmrah.umrah', icon: '🕋', color: '#0d8e62', route: '/umrah' },
    ],
  },
  {
    id: 'quran_surahs',
    titleKey: 'home.quranSurahsSection',
    icon: 'book-open-page-variant',
    color: '#3a7ca5',
    items: [
      { id: 'surah_kahf', labelKey: 'home.surahKahf', icon: 'book-open-page-variant', color: '#3a7ca5', route: '/surah-kahf' },
      { id: 'surah_yasin', labelKey: 'home.surahYasin', icon: 'book-open-page-variant', color: '#9B6BD6', route: '/surah-yasin' },
      { id: 'surah_mulk', labelKey: 'home.surahMulk', icon: 'book-open-page-variant', color: '#0D9488', route: '/surah-mulk' },
      { id: 'ayat_kursi', labelKey: 'home.ayatKursi', icon: 'shield-star', color: '#9B7B00', route: '/ayat-kursi' },
      { id: 'daily_ayah', labelKey: 'home.dailyVerse', icon: 'star-four-points', color: '#c07b10', route: '/daily-ayah' },
      { id: 'full_mushaf', labelKey: 'home.fullMushaf', icon: 'book-open-variant', color: '#0d8e62', route: '/(tabs)/quran' },
    ],
  },
  {
    id: 'duas_hadith',
    titleKey: 'home.duasHadithSection',
    icon: '🤲',
    color: getAzkarCategoryData('34').color,
    items: [
      { id: 'general_duas', labelKey: 'home.selectedDuas', ...getAzkarCategoryData('34'), icon: 'hand-heart', color: '#c07b10', route: '/sunnah-dua-daily' },
      { id: 'daily_dua', labelKey: 'home.dailyDua', ...PAGE_CONFIGS.daily_dua, icon: 'calendar-heart', route: '/daily-dua' },
      { id: 'daily_hadith', labelKey: 'home.hadithOfDay', ...PAGE_CONFIGS.daily_hadith, route: '/hadith-of-day' },
      { id: 'ruqya', labelKey: 'azkar.ruqya', ...getAzkarCategoryData('34'), icon: 'shield-check', color: '#0D9488', route: '/ruqya' },
      { id: 'quran_duas', labelKey: 'azkar.quranDuas', ...getAzkarCategoryData('26'), icon: 'book-open-page-variant', color: '#3a7ca5', route: '/quran-dua-daily' },
      { id: 'famous_duas', labelKey: 'home.famousDuas', icon: 'star-circle', color: '#0d8e62', route: '/famous-duas' },
    ],
  },
  {
    id: 'worship',
    titleKey: 'home.worshipSection',
    icon: 'mosque',
    color: '#0d8e62',
    items: [
      { id: 'worship_tracker', labelKey: 'home.worshipTracker', icon: 'chart-areaspline', color: '#0d8e62', route: '/worship-tracker' },
      { id: 'prayer_times', labelKey: 'home.prayerTimesLabel', icon: 'clock-outline', color: '#0d8e62', route: '/(tabs)/prayer' },
      { id: 'qibla', labelKey: 'home.qibla', icon: 'compass', color: '#5856D6', route: '/(tabs)/prayer?tab=qibla' },
      { id: 'next_prayer', labelKey: 'home.myNextPrayer', icon: 'mosque', color: '#0D9488', route: '/(tabs)/prayer?view=next' },
      { id: 'hijri_calendar', labelKey: 'home.hijriCalendar', icon: 'calendar-month', color: '#0D9488', route: '/hijri' },
      { id: 'radio', labelKey: 'radio.title', icon: 'radio', color: '#0d8e62', route: '/radio' },
      { id: 'question_answer', labelKey: 'questionAnswer.title', ...PAGE_CONFIGS.question_answer, route: '/question-answer' },
    ],
  },
  {
    id: 'tasbih_section',
    titleKey: 'home.tasbihSection',
    icon: 'counter',
    color: getAzkarCategoryData('129').color,
    items: [
      { id: 'tasbih', labelKey: 'tabs.tasbih', icon: 'counter', color: '#0d8e62', route: '/(tabs)/tasbih' },
      { id: 'istighfar', labelKey: 'home.istighfar', ...getAzkarCategoryData('129'), icon: 'refresh-circle', route: '/azkar/129' },
      { id: 'salawat', labelKey: 'home.salawat', ...getAzkarCategoryData('107'), icon: 'salawat-symbol', iconTextColor: true, route: '/azkar/107' },
      { id: 'tasbih_log', labelKey: 'home.tasbihLog', icon: 'history', color: '#3a7ca5', route: '/tasbih-stats' },
    ],
  },
  {
    id: 'marifat_allah',
    titleKey: 'home.knowAllah',
    icon: 'star-crescent',
    color: '#9B7B00',
    items: [
      { id: 'names_of_allah', labelKey: 'home.namesOfAllah', ...PAGE_CONFIGS.names, route: '/names' },
      { id: 'ayat_universe', labelKey: 'ayatUniverse.title', ...PAGE_CONFIGS.ayat_universe, route: '/ayat-universe' },
      { id: 'hadith_sifat', labelKey: 'home.hadithAttributes', ...PAGE_CONFIGS.hadith_sifat, route: '/hadith-sifat' },
    ],
  },
];

interface ModalCategoryItem { id: string; labelKey: string; icon: string; color: string; route?: string; iconTextColor?: boolean; }
interface ModalCategoryDef { id: string; titleKey: string; icon: string; color: string; items: ModalCategoryItem[]; }

const MODAL_CATEGORIES: ModalCategoryDef[] = [
  {
    id: 'cat_azkar', titleKey: 'home.azkarSection', icon: getAzkarCategoryData('1').icon, color: getAzkarCategoryData('1').color,
    items: [
      { id: 'morning_azkar', labelKey: 'home.morningAzkar', ...getAzkarCategoryData('1'), route: '/azkar/1' },
      { id: 'evening_azkar', labelKey: 'home.eveningAzkar', ...getAzkarCategoryData('1b'), route: '/azkar/1b' },
      { id: 'sleep_azkar', labelKey: 'home.sleepAzkar', ...getAzkarCategoryData('2'), route: '/azkar/2' },
      { id: 'wakeup_azkar', labelKey: 'home.wakeupAzkar', ...getAzkarCategoryData('3'), route: '/azkar/3' },
      { id: 'after_prayer_azkar', labelKey: 'azkar.afterPrayer', ...getAzkarCategoryData('27'), route: '/azkar/27' },
      { id: 'more_azkar', labelKey: 'home.moreAzkar', icon: 'book-open-variant', color: '#0d8e62', route: '/more-azkar' },
    ],
  },
  {
    id: 'cat_stories', titleKey: 'home.storiesSection', icon: 'book-account', color: '#6366F1',
    items: [
      { id: 'seerah', labelKey: 'seerah.title', icon: 'book-account', color: '#6366F1', route: '/seerah' },
      { id: 'companions_stories', labelKey: 'companions.title', icon: 'account-group', color: '#0d8e62', route: '/companions' },
    ],
  },
  {
    id: 'cat_hajj', titleKey: 'home.hajjUmrahSection', icon: 'star-crescent', color: '#0D9488',
    items: [
      { id: 'hajj_duas', labelKey: 'hajjUmrah.hajj', icon: '🕋', color: '#0D9488', route: '/hajj' },
      { id: 'umrah_duas', labelKey: 'hajjUmrah.umrah', icon: '🕋', color: '#0d8e62', route: '/umrah' },
    ],
  },
  {
    id: 'cat_quran', titleKey: 'home.quranSurahsSection', icon: 'book-open-page-variant', color: '#3a7ca5',
    items: [
      { id: 'surah_kahf', labelKey: 'home.surahKahf', icon: 'book-open-page-variant', color: '#3a7ca5', route: '/surah-kahf' },
      { id: 'surah_yasin', labelKey: 'home.surahYasin', icon: 'book-open-page-variant', color: '#9B6BD6', route: '/surah-yasin' },
      { id: 'surah_mulk', labelKey: 'home.surahMulk', icon: 'book-open-page-variant', color: '#0D9488', route: '/surah-mulk' },
      { id: 'ayat_kursi', labelKey: 'home.ayatKursi', icon: 'shield-star', color: '#9B7B00', route: '/ayat-kursi' },
      { id: 'daily_ayah', labelKey: 'home.dailyVerse', icon: 'star-four-points', color: '#c07b10', route: '/daily-ayah' },
      { id: 'full_mushaf', labelKey: 'home.fullMushaf', icon: 'book-open-variant', color: '#0d8e62', route: '/(tabs)/quran' },
    ],
  },
  {
    id: 'cat_duas', titleKey: 'home.duasHadithSection', icon: '🤲', color: getAzkarCategoryData('34').color,
    items: [
      { id: 'general_duas', labelKey: 'home.selectedDuas', ...getAzkarCategoryData('34'), icon: 'hand-heart', color: '#c07b10', route: '/sunnah-dua-daily' },
      { id: 'daily_dua', labelKey: 'home.dailyDua', ...PAGE_CONFIGS.daily_dua, icon: 'calendar-heart', route: '/daily-dua' },
      { id: 'daily_hadith', labelKey: 'home.hadithOfDay', ...PAGE_CONFIGS.daily_hadith, route: '/hadith-of-day' },
      { id: 'ruqya', labelKey: 'azkar.ruqya', ...getAzkarCategoryData('34'), icon: 'shield-check', color: '#0D9488', route: '/ruqya' },
      { id: 'quran_duas', labelKey: 'azkar.quranDuas', ...getAzkarCategoryData('26'), icon: 'book-open-page-variant', color: '#3a7ca5', route: '/quran-dua-daily' },
      { id: 'famous_duas', labelKey: 'home.famousDuas', icon: 'star-circle', color: '#0d8e62', route: '/famous-duas' },
    ],
  },
  {
    id: 'cat_worship', titleKey: 'home.worshipSection', icon: 'mosque', color: '#0d8e62',
    items: [
      { id: 'worship_tracker', labelKey: 'home.worshipTracker', icon: 'chart-areaspline', color: '#0d8e62', route: '/worship-tracker' },
      { id: 'prayer_times', labelKey: 'home.prayerTimesLabel', icon: 'clock-outline', color: '#0d8e62', route: '/(tabs)/prayer' },
      { id: 'qibla', labelKey: 'home.qibla', icon: 'compass', color: '#5856D6', route: '/(tabs)/prayer?tab=qibla' },
      { id: 'next_prayer', labelKey: 'home.myNextPrayer', icon: 'mosque', color: '#0D9488', route: '/(tabs)/prayer?view=next' },
      { id: 'hijri_calendar', labelKey: 'home.hijriCalendar', icon: 'calendar-month', color: '#0D9488', route: '/hijri' },
      { id: 'radio', labelKey: 'radio.title', icon: 'radio', color: '#0d8e62', route: '/radio' },
      { id: 'question_answer', labelKey: 'questionAnswer.title', ...PAGE_CONFIGS.question_answer, route: '/question-answer' },
    ],
  },
  {
    id: 'cat_tasbih', titleKey: 'home.tasbihSection', icon: 'counter', color: getAzkarCategoryData('129').color,
    items: [
      { id: 'tasbih', labelKey: 'tabs.tasbih', icon: 'counter', color: '#0d8e62', route: '/(tabs)/tasbih' },
      { id: 'istighfar', labelKey: 'home.istighfar', ...getAzkarCategoryData('129'), icon: 'refresh-circle', route: '/azkar/129' },
      { id: 'salawat', labelKey: 'home.salawat', ...getAzkarCategoryData('107'), icon: 'salawat-symbol', iconTextColor: true, route: '/azkar/107' },
      { id: 'tasbih_log', labelKey: 'home.tasbihLog', icon: 'history', color: '#3a7ca5', route: '/tasbih-stats' },
    ],
  },
  {
    id: 'cat_marifat', titleKey: 'home.knowAllah', icon: 'star-crescent', color: '#9B7B00',
    items: [
      { id: 'names_of_allah', labelKey: 'home.namesOfAllah', ...PAGE_CONFIGS.names, route: '/names' },
      { id: 'ayat_universe', labelKey: 'ayatUniverse.title', ...PAGE_CONFIGS.ayat_universe, route: '/ayat-universe' },
      { id: 'hadith_sifat', labelKey: 'home.hadithAttributes', ...PAGE_CONFIGS.hadith_sifat, route: '/hadith-sifat' },
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
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
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
           
            intensity={Platform.OS === 'ios' ? 80 : 65}
            tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
            style={styles.gridCardBlur}
          >
            <View style={[
              styles.gridCard,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(255,255,255,0.08)'
                  : colors.card,
                borderColor: isDarkMode
                  ? 'rgba(255,255,255,0.15)'
                  : colors.border,
              },
            ]}>
              <View style={styles.gridCardIcon}> 
                <AppIcon name={category.icon} size={28} color={category.color} />
              </View>
              <Text style={[styles.gridCardLabel, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
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
         
          intensity={Platform.OS === 'ios' ? 80 : 65}
          tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
          style={styles.listCardBlur}
        >
          <View style={[
            styles.listCard,
            {
              backgroundColor: isDarkMode
                ? 'rgba(255,255,255,0.08)'
                : colors.card,
              borderColor: isDarkMode
                ? 'rgba(255,255,255,0.15)'
                : colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}>
            <View style={styles.listCardIcon}> 
              <AppIcon name={category.icon} size={22} color={category.color} />
            </View>
            <Text style={[styles.listCardLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {t(category.nameKey)}
            </Text>
            <MaterialCommunityIcons
              name={isRTL ? 'chevron-left' : 'chevron-right'}
              size={20}
              color={colors.icon}
            />
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface QuickAccessItemProps {
  item: { id: string; nameKey?: string; icon: string; color: string; label?: string; nameAr?: string; nameEn?: string };
  onPress: () => void;
  isDarkMode: boolean;
  index: number;
  t: (key: string) => string;
  isRTL?: boolean;
  lang?: string;
}

const QuickAccessItem: React.FC<QuickAccessItemProps> = ({ item, onPress, isDarkMode, index, t, isRTL, lang }) => {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  // Resolve item name: Firestore nameAr/nameEn > translation key > label
  const getItemName = () => {
    // If Firestore provides nameAr/nameEn, use based on language
    const itemAny = item as any;
    if (itemAny.nameAr || itemAny.nameEn) {
      const isArabic = lang === 'ar' || lang === 'ur' || lang === 'fa';
      return isArabic ? (itemAny.nameAr || itemAny.nameEn) : (itemAny.nameEn || itemAny.nameAr);
    }
    // Fallback to translation key or label
    return item.nameKey ? t(item.nameKey) : (item.label || '');
  };

  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 60).duration(400)}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.8}
        style={{ alignItems: 'center', width: 90 }}
      >
        <View style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: item.color,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}>
           <AppIcon name={item.icon} size={30} color={colors.getTextColor(item.color)} />
        </View>
        <Text style={[styles.quickAccessName, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
          {getItemName()}
        </Text>
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
  iconColor?: string;
  children: React.ReactNode;
  sectionId: string;
  collapsedSections: string[];
  toggleSection: (id: string) => void;
  isDarkMode: boolean;
  infoKey?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title, icon, iconColor, children, sectionId, collapsedSections, toggleSection, isDarkMode, infoKey,
}) => {
  const expanded = !collapsedSections.includes(sectionId);
  const isRTL = useIsRTL();
  const colors = useColors();

  return (
    <View>
      <TouchableOpacity onPress={() => {
        toggleSection(sectionId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }} style={[collapsibleStyles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} activeOpacity={0.7}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
          {icon && <AppIcon name={icon} size={20} color={iconColor || colors.primary} />}
          <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', color: colors.text }]}>{title}</Text>
          {infoKey && <SectionInfoButton sectionKey={infoKey} />}
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.icon}
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
  const adBottomInset = useAdBottomInset();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const quickAccessScrollRef = useRef<ScrollView>(null);
  const { currentSeason, dailyData, adminBanner: adminSeasonalBanner } = useSeasonal();
  const features = useFeatures();
  const { isPremium, showUpgradeBanner, isSubscriptionEnabled } = useSubscription();

  // Date display
  const homeHijriDate = useMemo(() => getLocalizedHijriDate(), []);
  const gregorianDateStr = useMemo(() => {
    const { getLocalizedFullDate } = require('@/lib/hijri-date');
    const full = getLocalizedFullDate();
    return full.formatted.gregorian;
  }, []);

  // User rank for honor board
  const [userRank, setUserRank] = useState<number | null>(null);
  const [rankLoaded, setRankLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const userId = await getUserId();
        if (!userId) { setRankLoaded(true); return; }
        await syncMonthlyEngagementFromLocalWorship(userId).catch(() => null);
        const [info, board] = await Promise.all([
          getUserMonthlyInfo(userId),
          getMonthlyLeaderboard(200),
        ]);
        const userScore = info?.score || 0;
        if (userScore > 0) {
          const rankIndex = board.findIndex(u => u.userId === userId);
          if (rankIndex >= 0) {
            setUserRank(rankIndex + 1);
          } else {
            // User not in top N — calculate their approximate rank
            const higherCount = board.filter(u => u.score > userScore).length;
            setUserRank(higherCount + 1);
          }
        }
      } catch {}
      setRankLoaded(true);
    })();
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
    // Load cached config first for instant display
    fetchHomePageConfig().then(cfg => {
      if (cfg) setHomeConfig(cfg);
    });
    // Subscribe to real-time updates from admin panel
    const unsubscribe = subscribeToHomePageConfig(
      (cfg) => setHomeConfig(cfg),
      (err) => console.warn('Home config subscription error:', err)
    );
    return () => unsubscribe();
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
  const [hasUserCustomized, setHasUserCustomized] = useState<boolean | null>(null); // null = loading, false = use Firestore, true = use local
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

  // Share App modal
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Proactive share trigger — cooldown system with 3-strike limit
  const shareOpensRef = React.useRef(0);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [statsRaw, dismissRaw, nextTriggerRaw, sharedFlag] = await Promise.all([
          AsyncStorage.getItem('@rooh_local_stats'),
          AsyncStorage.getItem('@share_prompt_dismiss_count'),
          AsyncStorage.getItem('@share_prompt_next_trigger'),
          AsyncStorage.getItem('@share_prompt_shared'),
        ]);
        if (!mounted) return;

        // Already shared — never show again
        if (sharedFlag === 'true') return;

        // Dismissed 3+ times — never show again
        const dismissCount = dismissRaw ? parseInt(dismissRaw, 10) : 0;
        if (dismissCount >= 3) return;

        const stats = statsRaw ? JSON.parse(statsRaw) : null;
        const opens: number = stats?.appOpens ?? 0;
        if (opens <= 0) return;
        shareOpensRef.current = opens;

        const nextTrigger = nextTriggerRaw ? parseInt(nextTriggerRaw, 10) : 5;

        if (opens >= nextTrigger) {
          setTimeout(() => {
            if (mounted) setShareModalVisible(true);
          }, 1500);
        }
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, []);

  const handleShareDismiss = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@share_prompt_dismiss_count');
      const count = raw ? parseInt(raw, 10) : 0;
      const newCount = count + 1;
      await AsyncStorage.setItem('@share_prompt_dismiss_count', String(newCount));
      
      // Progressive delay: أول مرة +20، تاني مرة +35، بعد كده مفيش
      // Pattern: 5 → 25 → 60 → never
      const delays = [20, 35]; // delay increments per dismiss
      const delay = delays[count] ?? 50; // fallback to 50 if somehow more
      const nextTarget = shareOpensRef.current + delay;
      await AsyncStorage.setItem('@share_prompt_next_trigger', String(nextTarget));
    } catch { /* ignore */ }
  }, []);

  const handleShareCompleted = React.useCallback(async () => {
    try {
      await AsyncStorage.setItem('@share_prompt_shared', 'true');
    } catch { /* ignore */ }
  }, []);
  const [cachedPrayerTimes, setCachedPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayerCountdown, setNextPrayerCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  // Banner countdown state (always-on, independent of modal)
  const [bannerCountdown, setBannerCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [bannerNextPrayer, setBannerNextPrayer] = useState<{ name: PrayerName; time: string } | null>(null);

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
        // No cache — try to fetch using saved location, or request location
        const { getStoredLocation, fetchPrayerTimes, parsePrayerTimes, saveLocation, cachePrayerTimes } = await import('@/lib/prayer-times');
        const { MAKKAH_FALLBACK_DEFAULTS } = await import('@/lib/country-prayer-defaults');
        let loc = await getStoredLocation();
        if (!loc) {
          // No stored location — try to get current location
          const ExpoLocation = await import('expo-location');
          const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const current = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
            loc = { latitude: current.coords.latitude, longitude: current.coords.longitude, city: '', country: '' };
            await saveLocation(loc);
            // Location now available — reschedule prayer notifications that depend on it
            import('@/lib/notifications-manager').then(({ rescheduleAllFromStorage }) => {
              rescheduleAllFromStorage().catch(() => {});
            }).catch(() => {});
          } else {
            // Fallback to Makkah coordinates
            loc = {
              latitude: MAKKAH_FALLBACK_DEFAULTS.lat,
              longitude: MAKKAH_FALLBACK_DEFAULTS.lng,
              city: MAKKAH_FALLBACK_DEFAULTS.cityNameAr,
              country: 'السعودية',
            };
          }
        }
        if (loc) {
          const response = await fetchPrayerTimes(loc);
          if (response) {
            const times = parsePrayerTimes(response);
            await cachePrayerTimes(today, times);
            setCachedPrayerTimes(times);
            // Sync to widget data
            try {
              const { updateSharedData } = await import('@/lib/widget-data');
              const locationLabel = loc?.city ? `${loc.city}${loc.country ? ', ' + loc.country : ''}` : '';
              updateSharedData(times, locationLabel).catch(() => {});
            } catch {}
          }
        }
      } catch (e) {
        console.log('[Home] Failed to load prayer times:', e);
        // If no cached prayer times were loaded, notify user
        if (!cachedPrayerTimes) {
          showOfflineModal();
        }
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

  // Always-on banner countdown (updates every second for WelcomeBanner)
  useEffect(() => {
    if (!cachedPrayerTimes) return;
    const update = () => {
      const next = getNextPrayer(cachedPrayerTimes);
      setBannerNextPrayer(next);
      const remaining = getTimeRemaining(cachedPrayerTimes);
      setBannerCountdown(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cachedPrayerTimes]);

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
      AsyncStorage.getItem('@quick_access_customized'),
      AsyncStorage.getItem('@quick_access_migration_qa_v2'),
      AsyncStorage.getItem('@quick_access_migration_qa_v3'),
      AsyncStorage.getItem('@quick_access_migration_qa_v4'),
      AsyncStorage.getItem('@quick_access_migration_qa_v5'),
    ]).then(([stored, storedCustom, customizedFlag, qaMigrationV2Done, qaMigrationV3Done, qaMigrationV4Done, qaMigrationV5Done]) => {
      // Check if user has ever customized their Quick Access
      const userHasCustomized = customizedFlag === 'true';
      setHasUserCustomized(userHasCustomized);

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            let ids: string[] = parsed;

            if (!qaMigrationV2Done) {
              // Legacy migration — keep for historical completeness
              ids = ids.filter(id => id !== 'question_answer');
              const favIdx = ids.indexOf('favorites');
              const insertAt = favIdx >= 0 ? favIdx + 1 : Math.max(0, ids.length - 2);
              ids = [...ids.slice(0, insertAt), 'question_answer', ...ids.slice(insertAt)];
              AsyncStorage.setItem('@quick_access_migration_qa_v2', 'true');
            }

            if (!qaMigrationV3Done) {
              // Force question_answer to be the 3rd item (index 2) for all users
              ids = ids.filter(id => id !== 'question_answer');
              ids = [...ids.slice(0, 2), 'question_answer', ...ids.slice(2)];
              AsyncStorage.setItem('@quick_access_items', JSON.stringify(ids));
              AsyncStorage.setItem('@quick_access_migration_qa_v3', 'true');
              if (!userHasCustomized) {
                AsyncStorage.setItem('@quick_access_customized', 'true');
                setHasUserCustomized(true);
              }
            }

            // v4: Force question_answer at position 2 (3rd slot) on Android for all users
            if (!qaMigrationV4Done && Platform.OS === 'android') {
              ids = ids.filter(id => id !== 'question_answer');
              ids = [...ids.slice(0, 2), 'question_answer', ...ids.slice(2)];
              AsyncStorage.setItem('@quick_access_items', JSON.stringify(ids));
              AsyncStorage.setItem('@quick_access_migration_qa_v4', 'true');
            }

            // v5: Force question_answer on ALL platforms so it's always visible
            // until the user explicitly removes it via customisation.
            if (!qaMigrationV5Done) {
              ids = ids.filter(id => id !== 'question_answer');
              ids = [...ids.slice(0, 2), 'question_answer', ...ids.slice(2)];
              AsyncStorage.setItem('@quick_access_items', JSON.stringify(ids));
              AsyncStorage.setItem('@quick_access_migration_qa_v5', 'true');
              if (!userHasCustomized) {
                AsyncStorage.setItem('@quick_access_customized', 'true');
                setHasUserCustomized(true);
              }
            }

            setSelectedQuickAccessIds(ids);
          }
        } catch {}
      }
      if (storedCustom) {
        try {
          const parsed = JSON.parse(storedCustom);
          if (Array.isArray(parsed)) {
            // Migrate any cached routes pointing to deprecated /special-surah
            // Also update quran bookmarks icon/color to match current design
            // Migrate custom surah routes from /surah/X?page=Y to /surah-reading/X
            const migrated = parsed.map((item: CustomQuickAccessItem) => {
              if (item.route && item.route.startsWith('/special-surah')) {
                const match = item.route.match(/[?&]surah=(\d+)/);
                const surahNum = match ? match[1] : '18';
                return { ...item, route: `/surah-reading/${surahNum}` };
              }
              // Migrate custom surah items to use surah-reading page
              if (item.id && item.id.startsWith('surah_custom_') && item.route) {
                const match = item.route.match(/\/surah\/(\d+)(?:\?page=\d+)?/);
                if (match) {
                  const surahNum = match[1];
                  return { ...item, route: `/surah-reading/${surahNum}` };
                }
              }
              if (item.id === 'page_quran_bookmarks') {
                return { ...item, icon: 'bookmark', color: '#0d8e62' };
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
      // v4 fallback: no stored items on Android — force question_answer into defaults
      if (!stored && !qaMigrationV4Done && Platform.OS === 'android') {
        const defaultIds = QUICK_ACCESS.slice(0, 4).map(i => i.id);
        let ids = defaultIds.filter(id => id !== 'question_answer');
        ids = [...ids.slice(0, 2), 'question_answer', ...ids.slice(2)];
        setSelectedQuickAccessIds(ids);
        AsyncStorage.setItem('@quick_access_items', JSON.stringify(ids));
        AsyncStorage.setItem('@quick_access_migration_qa_v4', 'true');
        AsyncStorage.setItem('@quick_access_customized', 'true');
      }

      // v5 fallback: no stored items on any platform — force question_answer
      if (!stored && !qaMigrationV5Done) {
        const defaultIds = QUICK_ACCESS.slice(0, 4).map(i => i.id);
        let ids = defaultIds.filter(id => id !== 'question_answer');
        ids = [...ids.slice(0, 2), 'question_answer', ...ids.slice(2)];
        setSelectedQuickAccessIds(ids);
        AsyncStorage.setItem('@quick_access_items', JSON.stringify(ids));
        AsyncStorage.setItem('@quick_access_migration_qa_v5', 'true');
        AsyncStorage.setItem('@quick_access_customized', 'true');
      }
    });
  }, []);

  const saveQuickAccessIds = useCallback(async (ids: string[], customs: CustomQuickAccessItem[]) => {
    setSelectedQuickAccessIds(ids);
    setCustomItems(customs);
    setHasUserCustomized(true); // Mark that user has customized
    await AsyncStorage.setItem('@quick_access_items', JSON.stringify(ids));
    await AsyncStorage.setItem(CUSTOM_ITEMS_STORAGE_KEY, JSON.stringify(customs));
    await AsyncStorage.setItem('@quick_access_customized', 'true'); // Save flag
  }, []);

  // Reset Quick Access to Firestore defaults (admin settings)
  const resetQuickAccessToDefaults = useCallback(async () => {
    setHasUserCustomized(false);
    setCustomItems([]);
    await AsyncStorage.removeItem('@quick_access_items');
    await AsyncStorage.removeItem(CUSTOM_ITEMS_STORAGE_KEY);
    await AsyncStorage.removeItem('@quick_access_customized');
    setShowCustomizeModal(false);
  }, []);

  const allQuickAccessItems = useMemo(() => {
    // If Firestore config has quickAccess items, use them
    if (homeConfig?.quickAccess?.items?.length) {
      const firestoreItems = homeConfig.quickAccess.items.map(item => ({
        id: item.id,
        nameKey: `home.${item.id}`, // Will be overridden by nameAr/nameEn
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        icon: item.icon,
        color: item.color,
        enabled: item.enabled,
        order: item.order,
        route: item.route,
        label: undefined,
      }));
      const firestoreIds = new Set(firestoreItems.map(i => i.id));
      // Merge local QUICK_ACCESS items not yet in Firestore (e.g. newly added items like question_answer)
      const localOnly = QUICK_ACCESS
        .filter(q => !firestoreIds.has(q.id))
        .map(q => ({ ...q, label: undefined, route: undefined }));
      return [...firestoreItems, ...localOnly, ...customItems.filter(c => !firestoreIds.has(c.id))];
    }
    // Fallback to local hardcoded items
    const builtIn = QUICK_ACCESS.map(item => ({ ...item, label: undefined, route: undefined }));
    const builtInIds = new Set(builtIn.map(i => i.id));
    return [...builtIn, ...customItems.filter(c => !builtInIds.has(c.id))];
  }, [homeConfig, customItems]);

  const pendingAllQuickAccessItems = useMemo(() => {
    // If Firestore config has quickAccess items, use them for the modal too
    if (homeConfig?.quickAccess?.items?.length) {
      const firestoreItems = homeConfig.quickAccess.items.map(item => ({
        id: item.id,
        nameKey: `home.${item.id}`,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        icon: item.icon,
        color: item.color,
        enabled: item.enabled,
        order: item.order,
        route: item.route,
        label: undefined,
      }));
      const firestoreIds = new Set(firestoreItems.map(i => i.id));
      const localOnly = QUICK_ACCESS
        .filter(q => !firestoreIds.has(q.id))
        .map(q => ({ ...q, label: undefined, route: undefined }));
      return [...firestoreItems, ...localOnly, ...pendingCustomItems.filter(c => !firestoreIds.has(c.id))];
    }
    const builtIn = QUICK_ACCESS.map(item => ({ ...item, label: undefined, route: undefined }));
    const builtInIds = new Set(builtIn.map(i => i.id));
    return [...builtIn, ...pendingCustomItems.filter(c => !builtInIds.has(c.id))];
  }, [homeConfig, pendingCustomItems]);

  const filteredQuickAccess = useMemo(() => {
    let result: typeof allQuickAccessItems;

    // If user hasn't customized AND Firestore has config → use Firestore defaults
    if (!hasUserCustomized && homeConfig?.quickAccess?.items?.length) {
      result = [...allQuickAccessItems]
        .filter(item => {
          // Custom items (user-added) are always shown if selected
          if (!('enabled' in item)) return selectedQuickAccessIds.includes(item.id);
          return (item as any).enabled === true;
        })
        .sort((a, b) => {
          const orderA = (a as any).order ?? 99;
          const orderB = (b as any).order ?? 99;
          return orderA - orderB;
        });
    } else {
      // User has customized - use their saved selection and order
      result = [...allQuickAccessItems]
        .filter(item => selectedQuickAccessIds.includes(item.id))
        .sort((a, b) => selectedQuickAccessIds.indexOf(a.id) - selectedQuickAccessIds.indexOf(b.id));
    }

    // GUARANTEED on Android: question_answer MUST be at index 2
    if (Platform.OS === 'android') {
      const qaIndex = result.findIndex(item => item.id === 'question_answer');
      const qaItem = result[qaIndex]
        ?? allQuickAccessItems.find(item => item.id === 'question_answer')
        ?? QUICK_ACCESS.find(q => q.id === 'question_answer');
      if (qaItem) {
        // Remove from wherever it is (if present)
        result = result.filter(item => item.id !== 'question_answer');
        // Force into index 2
        const insertAt = Math.min(2, result.length);
        result = [...result.slice(0, insertAt), qaItem as any, ...result.slice(insertAt)];
      }
    } else if (!result.find(item => item.id === 'question_answer')) {
      // Non-Android: inject if missing
      const qaItem = allQuickAccessItems.find(item => item.id === 'question_answer')
        ?? QUICK_ACCESS.find(q => q.id === 'question_answer');
      if (qaItem) {
        const insertAt = Math.min(2, result.length);
        result = [...result.slice(0, insertAt), qaItem as any, ...result.slice(insertAt)];
      }
    }

    return result;
  }, [homeConfig, allQuickAccessItems, selectedQuickAccessIds, hasUserCustomized]);

  // Strip emoji characters that can't render with custom fonts (show as "?" boxes)
  const stripEmojis = useCallback((text: string) => {
    return text
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{200D}]|[\u{20E3}]|[\u{FE0F}]|[\u{E0020}-\u{E007F}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{E000}-\u{F8FF}]/gu, '')
      .trim();
  }, []);

  // Resolve multi-lang banner text with fallback: titles[lang] → titles.en → t() seasonal key → title
  const resolveBannerText = useCallback((banner: WelcomeBannerConfig, field: 'title' | 'subtitle') => {
    const lang = (settings.language || 'ar') as keyof MultiLangText;
    const multiField = field === 'title' ? banner.titles : banner.subtitles;
    if (multiField) {
      const resolved = multiField[lang] || multiField.en;
      if (resolved) return stripEmojis(resolved);
    }
    // If current language is Arabic, return the Arabic field directly
    if (lang === 'ar') return stripEmojis(banner[field]);
    // For non-Arabic languages without multi-lang data, try translation keys
    const text = banner[field] || '';
    if (text.includes('\u0639\u064a\u062f') || text.includes('\u0645\u0628\u0627\u0631\u0643')) {
      return stripEmojis(t(field === 'title' ? 'seasonal.eid.title' : 'seasonal.eid.subtitle'));
    }
    if (text.includes('\u0631\u0645\u0636\u0627\u0646')) {
      return stripEmojis(t(field === 'title' ? 'seasonal.ramadan.title' : 'seasonal.ramadan.subtitle'));
    }
    return stripEmojis(banner[field]);
  }, [settings.language, stripEmojis]);

  // Welcome banner from Firestore (start null to avoid flash of stale content)
  const [welcomeBanner, setWelcomeBanner] = useState<WelcomeBannerConfig | null>(null);

  // Admin flags (default true when not set — opt-out, not opt-in)
  const showPrayerCountdown = welcomeBanner?.showPrayerCountdown !== false;
  const showIconAnimation = welcomeBanner?.showIconAnimation !== false;

  // Breathe/pulse animation for mosque icon (scale 1.0 → 1.15 over 2s)
  const iconScale = useSharedValue(1);
  useEffect(() => {
    if (showIconAnimation) {
      iconScale.value = withRepeat(
        withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      iconScale.value = 1;
    }
  }, [showIconAnimation]);
  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  // Helper: check if banner is within its scheduled date range
  const isBannerActive = useCallback((banner: WelcomeBannerConfig | null): boolean => {
    if (!banner || !banner.enabled) return false;
    const now = new Date();
    if ((banner as any).scheduledFrom) {
      const from = new Date((banner as any).scheduledFrom);
      if (from > now) return false;
    }
    if ((banner as any).scheduledUntil) {
      const until = new Date((banner as any).scheduledUntil);
      if (until < now) return false;
    }
    return true;
  }, []);

  // Auto-generate seasonal banner when no Firebase banner is active
  const autoSeasonalBanner = useMemo((): WelcomeBannerConfig | null => {
    if (!currentSeason?.isActive) return null;
    
    // Map season type to route
    const seasonRoutes: Record<string, string> = {
      ramadan: '/seasonal/ramadan',
      hajj: '/seasonal/hajj',
      dhul_hijjah: '/seasonal/hajj', // Use hajj page for dhul_hijjah
      mawlid: '/seasonal/mawlid',
      ashura: '/seasonal/ashura',
      eid_fitr: '/seasonal/ramadan', // Use ramadan page for eid
      eid_adha: '/seasonal/hajj', // Use hajj page for eid adha
      muharram: '/seasonal/ashura', // Use ashura page for muharram
    };
    
    // Map season type to translation keys
    const seasonTranslationKeys: Record<string, { title: string; subtitle: string }> = {
      ramadan: { title: 'seasonal.ramadan.title', subtitle: 'seasonal.ramadan.subtitle' },
      hajj: { title: 'seasonal.hajj.title', subtitle: 'seasonal.hajj.subtitle' },
      dhul_hijjah: { title: 'seasonal.dhulHijjah.title', subtitle: 'seasonal.dhulHijjah.subtitle' },
      mawlid: { title: 'seasonal.mawlid.title', subtitle: 'seasonal.mawlid.subtitle' },
      ashura: { title: 'seasonal.ashura.title', subtitle: 'seasonal.ashura.subtitle' },
      eid_fitr: { title: 'seasonal.eid.title', subtitle: 'seasonal.eid.subtitle' },
      eid_adha: { title: 'seasonal.eidAdha.title', subtitle: 'seasonal.eidAdha.subtitle' },
      muharram: { title: 'seasonal.muharram.title', subtitle: 'seasonal.muharram.subtitle' },
    };
    
    const route = seasonRoutes[currentSeason.type] || '/seasonal/ramadan';
    const translationKey = seasonTranslationKeys[currentSeason.type];
    
    return {
      enabled: true,
      title: translationKey ? t(translationKey.title) : currentSeason.nameAr,
      subtitle: translationKey ? t(translationKey.subtitle) : currentSeason.description,
      icon: currentSeason.icon,
      color: currentSeason.color,
      route,
      displayMode: 'text',
    };
  }, [currentSeason, t]);

  useEffect(() => {
    let mounted = true;
    // Fetch fresh config from Firebase first to avoid stale image flash
    fetchAppConfig().then(cfg => {
      if (mounted && cfg.welcomeBanner) setWelcomeBanner(cfg.welcomeBanner);
    }).catch(() => {
      // Fallback to AsyncStorage cache only if Firebase fails
      AsyncStorage.getItem('remote_app_config').then(cached => {
        if (!mounted) return;
        if (cached) {
          try {
            const cfg = JSON.parse(cached);
            if (cfg.welcomeBanner) setWelcomeBanner(cfg.welcomeBanner);
          } catch {}
        }
      });
    });
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
    if (categoryId === 'ruqya' || categoryId === '34') {
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

    // Check all items (Firestore + custom) for an explicit route
    const itemWithRoute = allQuickAccessItems.find(item => item.id === itemId && (item as any).route);
    if (itemWithRoute && (itemWithRoute as any).route) {
      router.push((itemWithRoute as any).route as any);
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
        router.push('/ayat-kursi' as any);
        break;
      case 'surah_kahf':
        router.push('/surah-kahf' as any);
        break;
      case 'surah_yasin':
        router.push('/surah-yasin' as any);
        break;
      case 'surah_mulk':
        router.push('/surah-mulk' as any);
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
      case 'question_answer':
        router.push('/question-answer' as any);
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style={colors.statusBarStyle} />

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + adBottomInset }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={['#0d8e62']}
          />
        }
      >
        {/* الرسالة الترحيبية */}
        {/* الرسالة الترحيبية - Firebase banner → Admin seasonal → Auto-seasonal → Friday → Prayer Countdown */}
        {(() => {
          // Shared countdown formatter
          const fmtCountdown = (c: { hours: number; minutes: number; seconds: number }) =>
            `${String(c.hours).padStart(2, '0')}:${String(c.minutes).padStart(2, '0')}:${String(c.seconds).padStart(2, '0')}`;
            const countdownLine = bannerCountdown && bannerNextPrayer ? (textColor?: string) => (
              <Text style={[styles.bannerSecondaryCountdown, textColor ? { color: textColor } : {}, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {`${t(`prayer.${bannerNextPrayer.name}`)} · ${fmtCountdown(bannerCountdown)}`}
            </Text>
          ) : null;

          // Priority 1: Firebase / Admin / Auto-seasonal banner
          const activeBanner = isBannerActive(welcomeBanner) && welcomeBanner 
            ? welcomeBanner 
            : (adminSeasonalBanner || autoSeasonalBanner);
          
          if (activeBanner) {
            return (
            <Animated.View entering={FadeIn.duration(600)}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push(activeBanner.route as any)}
              >
                {(() => {
                  const isRTLLang = settings.language === 'ar' || settings.language === 'ur';
                  const bannerBg = (!isRTLLang && activeBanner.backgroundImageNonAr) ? activeBanner.backgroundImageNonAr : activeBanner.backgroundImage;
                  
                  return activeBanner.displayMode === 'image_only' && bannerBg ? (
                    <View style={[styles.seasonCardImage, { backgroundColor: `${activeBanner.color}22`, overflow: 'hidden' }]}>
                      <Image
                        source={{ uri: bannerBg }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                      />
                    </View>
                  ) : activeBanner.displayMode === 'text_image' && bannerBg ? (
                    <ImageBackground
                      source={{ uri: bannerBg }}
                      style={styles.seasonCard}
                      imageStyle={{ borderRadius: 20 }}
                      resizeMode="cover"
                    >
                      <View style={styles.seasonCardOverlay}>
                        <View style={[styles.seasonContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <View style={styles.seasonInfo}>
                            <Text style={[styles.seasonName, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{isBannerActive(welcomeBanner) ? resolveBannerText(activeBanner, 'title') : activeBanner.title}</Text>
                            <Text style={[styles.seasonGreeting, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{isBannerActive(welcomeBanner) ? resolveBannerText(activeBanner, 'subtitle') : activeBanner.subtitle}</Text>
                              {countdownLine?.()}
                          </View>
                          {activeBanner.customIconUrl ? (
                            <Image source={{ uri: activeBanner.customIconUrl }} style={{ width: 36, height: 36 }} resizeMode="contain" />
                          ) : (
                            <MaterialCommunityIcons name={safeIcon(activeBanner.icon, 'moon-waning-crescent') as any} size={36} color="#fff" />
                          )}
                        </View>
                      </View>
                    </ImageBackground>
                  ) : (
                    <View
                      style={[styles.seasonCard, { backgroundColor: `${activeBanner.color}CC` }]}
                    >
                        {(() => {
                          const bannerFg = colors.getTextColor(activeBanner.color);
                            const bannerFgSub = bannerFg === '#FFFFFF' ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.75)';
                            const bannerFgCount = bannerFg === '#FFFFFF' ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.55)';
                          return (
                      <View style={[styles.seasonContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={styles.seasonInfo}>
                            <Text style={[styles.seasonName, { color: bannerFg, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{isBannerActive(welcomeBanner) ? resolveBannerText(activeBanner, 'title') : activeBanner.title}</Text>
                              <Text style={[styles.seasonGreeting, { color: bannerFgSub, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{isBannerActive(welcomeBanner) ? resolveBannerText(activeBanner, 'subtitle') : activeBanner.subtitle}</Text>
                            {countdownLine?.(bannerFgCount)}
                        </View>
                        {activeBanner.customIconUrl ? (
                          <Image source={{ uri: activeBanner.customIconUrl }} style={{ width: 36, height: 36 }} resizeMode="contain" />
                        ) : (
                            <MaterialCommunityIcons name={safeIcon(activeBanner.icon, 'moon-waning-crescent') as any} size={36} color={bannerFg} />
                        )}
                      </View>
                          );
                        })()}
                    </View>
                  );
                })()}
              </TouchableOpacity>
            </Animated.View>
            );
          }

          // Priority 2: Friday banner (day 5 = Friday in JS)
          const isFriday = new Date().getDay() === 5;
          if (isFriday) {
            return (
            <Animated.View entering={FadeIn.duration(600)}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/surah-kahf' as any)}
              >
                <LinearGradient
                  colors={['#1a4a3a', '#2d6a4f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.prayerCountdownCard, styles.bannerShadow]}
                >
                  <View style={[styles.seasonContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.seasonInfo}>
                      <Text style={[styles.seasonName, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('home.fridayGreeting')}</Text>
                      <Text style={[styles.seasonGreeting, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('home.fridaySubtitle')}</Text>
                       {countdownLine?.()}
                    </View>
                    <Animated.View style={showIconAnimation ? animatedIconStyle : undefined}>
                      <MaterialCommunityIcons name="book-open-page-variant" size={36} color="rgba(255,255,255,0.7)" />
                    </Animated.View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            );
          }

          // Priority 3: Prayer countdown card (no event, not Friday) — gated by admin flag
          if (showPrayerCountdown && bannerCountdown && bannerNextPrayer) {
            const prayerName = t(`prayer.${bannerNextPrayer.name}`);
            return (
            <Animated.View entering={FadeIn.duration(600)}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.navigate('/(tabs)/prayer' as any)}
              >
                <LinearGradient
                  colors={['#1a4a3a', '#2d6a4f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.prayerCountdownCard, styles.bannerShadow]}
                >
                  <View style={[styles.seasonContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.seasonInfo}>
                      <Text style={[styles.prayerCountdownName, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {`${t('home.remainingForAdhan')} ${prayerName}`}
                      </Text>
                      <Text style={[styles.prayerCountdownTimer, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {fmtCountdown(bannerCountdown)}
                      </Text>
                    </View>
                    <Animated.View style={showIconAnimation ? animatedIconStyle : undefined}>
                      <MaterialCommunityIcons name="mosque" size={36} color="rgba(255,255,255,0.7)" />
                    </Animated.View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            );
          }

          return null;
        })()}

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
          {rankLoaded && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/honor-board')}
              style={[styles.rankBadgeHome, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? 'rgba(245,158,11,0.1)' : 'rgba(181,114,0,0.08)' }]}
            >
              <MaterialCommunityIcons name={userRank ? 'podium' : 'trophy-outline'} size={14} color={isDarkMode ? '#f59e0b' : '#B57200'} />
              <Text style={[styles.rankBadgeHomeText, { color: isDarkMode ? '#f59e0b' : '#B57200' }]}>
                {userRank
                  ? (settings.language === 'ar' ? `ترتيبك: #${userRank}` : `Your Rank: #${userRank}`)
                  : t('honor.title')
                }
              </Text>
              <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={14} color={isDarkMode ? '#f59e0b' : '#B57200'} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Premium Upgrade Banner — fallback only when no other banner is active */}
        {isSubscriptionEnabled && !isPremium && showUpgradeBanner && !(isBannerActive(welcomeBanner) || adminSeasonalBanner || autoSeasonalBanner || (showPrayerCountdown && bannerCountdown) || new Date().getDay() === 5) && (
          <Animated.View entering={FadeInDown.delay(60).duration(400)}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/subscription')}
              style={[styles.premiumBanner, { backgroundColor: colors.card, borderColor: '#B8860B33' }]}
            >
              <View style={[styles.premiumBannerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.premiumBannerIcon}>
                  <MaterialCommunityIcons name="crown" size={28} color={isDarkMode ? '#FFD700' : '#B8860B'} />
                </View>
                <View style={[styles.premiumBannerText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.premiumBannerTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('subscription.upgradeToPremium')}
                  </Text>
                  <Text style={[styles.premiumBannerDesc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('subscription.upgradeToPremiumDesc')}
                  </Text>
                </View>
                <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Permission Recovery Banner — يظهر فقط لو في إذن مفقود */}
        <PermissionBanner excludedKeys={['batteryOptimization', 'location']} />

        {/* Daily Highlights */}
        <CollapsibleSection title={t('home.highlights')} icon="star-circle" iconColor="#c07b10" sectionId="highlights" collapsedSections={collapsedSections} toggleSection={toggleSection} isDarkMode={isDarkMode}>
          <DailyHighlights showReorderButton onNextPrayerPress={() => setShowNextPrayerModal(true)} onShareAppPress={() => setShareModalVisible(true)} />
        </CollapsibleSection>

        {/* الوصول السريع */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <CollapsibleSection title={t('home.quickAccess')} icon="lightning-bolt" iconColor="#5856D6" sectionId="quickAccess" collapsedSections={collapsedSections} toggleSection={toggleSection} isDarkMode={isDarkMode}>
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
                  lang={settings.language}
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
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, alignItems: 'center', width: 90 }]}
                accessibilityRole="button"
                accessibilityLabel={t('home.customizeQuickAccess')}
              >
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#0d8e62',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}>
                  <MaterialCommunityIcons name="pencil-plus" size={30} color="#fff" />
                </View>
                <Text style={[styles.quickAccessName, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {t('home.customize')}
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
          </CollapsibleSection>
        </Animated.View>

        {/* 7 الأقسام الرئيسية المطوية */}
        {orderedSections.map((section, sectionIndex) => (
          <React.Fragment key={section.id}>
          <Animated.View
            entering={FadeInDown.delay(200 + sectionIndex * 80).duration(500)}
          >
            <CollapsibleSection
              title={t(section.titleKey)}
              icon={section.icon}
              iconColor={section.color}
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
                          // Parse query params from route if present
                          const [pathname, queryString] = item.route.split('?');
                          const params = queryString
                            ? Object.fromEntries(new URLSearchParams(queryString))
                            : undefined;

                          // Use navigate for plain tab switches (no params), push when params
                          // are present so useLocalSearchParams receives them on the tab screen.
                          if (item.route.startsWith('/(tabs)/') && !queryString) {
                            router.navigate({ pathname: pathname as any });
                          } else {
                            router.push({ pathname: pathname as any, params });
                          }
                        }
                      }}
                      activeOpacity={0.8}
                      style={isGrid ? styles.gridCardOuter : styles.listCardOuter}
                    >
                      <BlurView
                       
                        intensity={Platform.OS === 'ios' ? 80 : 65}
                        tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
                        style={isGrid ? styles.gridCardBlur : styles.listCardBlur}
                      >
                        <View
                          style={[
                            isGrid ? styles.gridCard : styles.listCard,
                            {
                              backgroundColor: isDarkMode
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(240,240,240,0.75)',
                              borderColor: isDarkMode
                                ? 'rgba(255,255,255,0.15)'
                                : 'rgba(0,0,0,0.12)',
                            },
                            !isGrid && { flexDirection: isRTL ? 'row-reverse' : 'row' },
                          ]}
                        >
                          {isGrid ? (
                            <>
                              <View style={styles.gridCardIcon}>
                                <AppIcon name={item.icon} size={28} color={item.iconTextColor ? colors.text : item.color} />
                              </View>
                              <Text style={[styles.gridCardLabel, { color: colors.text, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
                                {t(item.labelKey)}
                              </Text>
                            </>
                          ) : (
                            <>
                              <View style={[styles.listCardLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <View style={[styles.listCardIcon, { backgroundColor: `${item.color}18` }]}>
                                  <AppIcon name={item.icon} size={24} color={item.iconTextColor ? colors.text : item.color} />
                                </View>
                                <Text style={[styles.listCardLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                                  {t(item.labelKey)}
                                </Text>
                              </View>
                              <MaterialCommunityIcons
                                name={isRTL ? 'chevron-left' : 'chevron-right'}
                                size={20}
                                color={colors.icon}
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
          {/* Inline MREC ad after every 3rd section (and not after the last) */}
          {(sectionIndex + 1) % 3 === 0 && sectionIndex < orderedSections.length - 1 && (
            <InlineMrecAd screen="home" darkMode={isDarkMode} />
          )}
          </React.Fragment>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
      </SafeAreaView>

      <BannerAdComponent screen="home" inTabScreen />

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
           
            intensity={Platform.OS === 'ios' ? 40 : 35}
            tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
            style={styles.modalBlur}
          >
            <View style={[
              styles.modalContent,
              {
                backgroundColor: isDarkMode
                  ? '#0f1a14'
                  : 'rgba(255,255,255,0.97)',
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
                  <MaterialCommunityIcons name={isRTL ? 'arrow-left' : 'arrow-right'} size={20} color={colors.icon} />
                  <Text style={[styles.modalBackText, { color: colors.textLight }]}>{t('common.back')}</Text>
                </TouchableOpacity>
              )}

              {!addOtherMode && (
                <View style={[styles.modalModeToggle, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {Platform.OS === 'ios' && (
                    <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                  )}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
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
                    <MaterialCommunityIcons name="magnify" size={20} color={colors.icon} />
                    <TextInput
                      style={[styles.surahSearchInput, { color: colors.text }]}
                      placeholder={t('home.searchSection')}
                      placeholderTextColor={colors.muted}
                      value={modalSearch}
                      onChangeText={setModalSearch}
                      autoCorrect={false}
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                    {modalSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setModalSearch('')}>
                        <MaterialCommunityIcons name="close-circle" size={18} color={colors.icon} />
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
                                <AppIcon name={category.icon} size={20} color={category.color} />
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
                              color={colors.icon}
                            />
                          </TouchableOpacity>
                          {isExpanded && category.items.map(item => {
                            const isSelected = pendingIds.includes(item.id) || pendingCustomItems.some(c => c.id === item.id);
                            return (
                              <TouchableOpacity
                                key={item.id}
                                style={[styles.modalItem, styles.modalCategoryItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.10)' }]}
                                activeOpacity={0.7}
                                onPress={() => toggleModalItem(item)}
                              >
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                  <View style={[styles.modalItemIcon, { backgroundColor: `${item.color}15`, width: 32, height: 32, borderRadius: 16 }]}>
                                    <AppIcon name={item.icon} size={18} color={item.color} />
                                  </View>
                                  <Text style={[styles.modalItemLabel, { color: colors.text }]}>{t(item.labelKey)}</Text>
                                </View>
                                <MaterialCommunityIcons
                                  name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                                  size={24}
                                  color={isSelected ? '#0d8e62' : colors.icon}
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
                      <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={colors.icon} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} activeOpacity={0.7} onPress={() => { Haptics.selectionAsync(); setAddOtherMode('surahs'); }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={[styles.modalItemIcon, { backgroundColor: 'rgba(13,148,136,0.15)' }]}><MaterialCommunityIcons name="book-open-page-variant" size={20} color="#0D9488" /></View>
                        <Text style={[styles.modalItemLabel, { color: colors.text }]}>{t('home.quranSurahLabel')}</Text>
                      </View>
                      <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={colors.icon} />
                    </TouchableOpacity>
                  </ScrollView>
                </>
              )}

              {addOtherMode === 'pages' && (
                <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                  {EXTRA_APP_PAGES.filter(page => {
                    // Hide pages already managed by Firestore config
                    if (homeConfig?.quickAccess?.items?.some(fi => fi.id === page.id)) return false;
                    return true;
                  }).map(page => {
                    const alreadyAdded = pendingCustomItems.some(c => c.id === page.id);
                    return (
                      <TouchableOpacity key={page.id} style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }, alreadyAdded && { opacity: 0.5 }]} activeOpacity={0.7} disabled={alreadyAdded} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPendingCustomItems(prev => [...prev, page]); setPendingIds(prev => [...prev, page.id]); setAddOtherMode(null); }}>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={[styles.modalItemIcon, { backgroundColor: `${page.color}20` }]}><AppIcon name={page.icon} size={20} color={page.color} /></View>
                          <Text style={[styles.modalItemLabel, { color: colors.text }]}>{page.nameKey ? t(page.nameKey) : page.label}</Text>
                        </View>
                        {alreadyAdded && <MaterialCommunityIcons name="check" size={20} color="#0d8e62" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {addOtherMode === 'surahs' && (
                <View style={{ flex: 1 }}>
                  <View style={[styles.surahSearchContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={colors.icon} />
                    <TextInput style={[styles.surahSearchInput, { color: colors.text }]} placeholder={t('home.searchSurah')} placeholderTextColor={colors.muted} value={surahSearch} onChangeText={setSurahSearch} autoCorrect={false} textAlign={isRTL ? 'right' : 'left'} />
                  </View>
                  <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                    {filteredSurahs.map(surah => {
                      const surahItemId = `surah_custom_${surah.number}`;
                      const alreadyAdded = pendingCustomItems.some(c => c.id === surahItemId);
                      return (
                        <TouchableOpacity key={surah.number} style={[styles.modalItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }, alreadyAdded && { opacity: 0.5 }]} activeOpacity={0.7} disabled={alreadyAdded} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); const newItem: CustomQuickAccessItem = { id: surahItemId, icon: 'book-open-page-variant', color: '#0D9488', label: surah.name, route: `/surah-reading/${surah.number}` }; setPendingCustomItems(prev => [...prev, newItem]); setPendingIds(prev => [...prev, surahItemId]); setAddOtherMode(null); setSurahSearch(''); }}>
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                            <View style={[styles.surahNumber, { backgroundColor: isDarkMode ? 'rgba(13,148,136,0.2)' : 'rgba(13,148,136,0.1)' }]}>
                              <Text style={[styles.surahNumberText, { color: colors.primaryText }]}>{surah.number}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.modalItemLabel, { color: colors.text }]}>{surah.name}</Text>
                              <Text style={[styles.surahSubtitle, { color: colors.textLight }]}>{surah.englishName} · {surah.ayahs.length} {t('quran.ayahs')}</Text>
                            </View>
                          </View>
                          {alreadyAdded && <MaterialCommunityIcons name="check" size={20} color="#0d8e62" />}
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
                          <View style={[styles.modalItemIcon, { backgroundColor: `${item.color}20` }]}><AppIcon name={item.icon} size={20} color={item.color} /></View>
                          <Text style={[styles.modalItemLabel, { color: colors.text }]}>
                            {(item as any).nameAr || (item as any).nameEn 
                              ? ((settings.language === 'ar' || settings.language === 'ur') 
                                ? ((item as any).nameAr || (item as any).nameEn) 
                                : ((item as any).nameEn || (item as any).nameAr))
                              : (item.nameKey ? t(item.nameKey) : ((item as any).label || ''))}
                          </Text>
                        </View>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 4 }}>
                          <TouchableOpacity disabled={index === 0} onPress={() => moveQuickAccessItem(index, -1)} style={{ opacity: index === 0 ? 0.3 : 1, padding: 4 }}><MaterialCommunityIcons name="chevron-up" size={22} color={colors.text} /></TouchableOpacity>
                          <TouchableOpacity disabled={index === pendingIds.length - 1} onPress={() => moveQuickAccessItem(index, 1)} style={{ opacity: index === pendingIds.length - 1 ? 0.3 : 1, padding: 4 }}><MaterialCommunityIcons name="chevron-down" size={22} color={colors.text} /></TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {!addOtherMode && (
                <View style={{ gap: 12 }}>
                  {/* Reset to defaults button - only show if user has customized */}
                  {hasUserCustomized && homeConfig?.quickAccess?.items?.length && (
                    <TouchableOpacity 
                      style={{ 
                        paddingVertical: 10, 
                        paddingHorizontal: 16, 
                        borderRadius: 8, 
                        backgroundColor: isDarkMode ? 'rgba(255,100,100,0.15)' : 'rgba(220,38,38,0.1)',
                        alignItems: 'center',
                      }} 
                      onPress={resetQuickAccessToDefaults}
                    >
                      <Text style={{ color: '#DC2626', fontFamily: 'Cairo-SemiBold', fontSize: colors.fs(14) }}>
                        {t('home.resetToDefaults')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={[styles.modalButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel, { overflow: 'hidden' }]} onPress={() => setShowCustomizeModal(false)}>
                      {Platform.OS === 'ios' && (
                        <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                      )}
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                      <Text style={[styles.modalBtnText, { color: colors.glassTextLight }]}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm, !pendingIds.length && { opacity: 0.5 }]} disabled={!pendingIds.length} onPress={() => { saveQuickAccessIds(pendingIds, pendingCustomItems); setShowCustomizeModal(false); }}>
                      <Text style={styles.modalBtnConfirmText}>{t('common.save')}</Text>
                    </TouchableOpacity>
                  </View>
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
          <Pressable style={[styles.nextPrayerSheet, { backgroundColor: colors.surface }]}>
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
                            <View key={i} style={[styles.nextPrayerCountdownBox, { backgroundColor: colors.surface }]}>
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
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: colors.fs(15), textAlign: 'center' }}>
                          {t('prayer.title')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Enable notification toggle */}
                  {nextPrayer && (
                    <View style={[styles.nextPrayerToggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: colors.border }]}>
                      <View style={[styles.nextPrayerToggleInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons
                          name={notificationScheduled ? 'bell-ring' : 'bell-outline'}
                          size={18}
                          color={notificationScheduled ? '#0D9488' : colors.textLight}
                        />
                        <Text style={[styles.nextPrayerToggleLabel, { color: colors.text }]}>
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
                        trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
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

      {/* Share App Modal */}
      <ShareAppModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onDismiss={handleShareDismiss}
        onShared={handleShareCompleted}
      />

    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const _styles = StyleSheet.create({
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
    textAlign: 'center',
    lineHeight: 44,
    includeFontPadding: false,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // بطاقة الموسم
  seasonCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  seasonCardImage: {
    borderRadius: 20,
    aspectRatio: 3.5,
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
    lineHeight: 34,
    includeFontPadding: false,
  },
  seasonGreeting: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 20,
    includeFontPadding: false,
  },

  // Prayer countdown card (Scenario A — no event)
  prayerCountdownCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  prayerCountdownName: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#fff',
    lineHeight: 30,
    includeFontPadding: false,
  },
  prayerCountdownTimer: {
    fontSize: 28,
    fontFamily: fontBold(),
    color: '#D4AF37',
    lineHeight: 36,
    includeFontPadding: false,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'] as any,
    marginTop: 4,
  },
  // Secondary countdown line on event/Friday banners
  bannerSecondaryCountdown: {
    fontSize: 12,
    fontFamily: fontMedium(),
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'] as any,
    marginTop: 6,
  },
  // Depth shadow for premium banner cards
  bannerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },

  // العناوين
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    marginBottom: 12,
    marginTop: 20,
    lineHeight: 30,
    includeFontPadding: false,
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
    lineHeight: 22,
    includeFontPadding: false,
  },
  dateRowArabic: {
    writingDirection: 'rtl' as const,
  },
  dateRowSeparator: {
    fontSize: 14,
    fontFamily: fontRegular(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  rankBadgeHome: {
    alignSelf: 'center' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  rankBadgeHomeText: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    includeFontPadding: false,
  },

  // Premium upgrade banner
  premiumBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  premiumBannerRow: {
    alignItems: 'center',
    gap: 12,
  },
  premiumBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#B8860B15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBannerText: {
    flex: 1,
    gap: 2,
  },
  premiumBannerTitle: {
    fontSize: 15,
    fontFamily: fontBold(),
    lineHeight: 24,
    includeFontPadding: false,
  },
  premiumBannerDesc: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 18,
    includeFontPadding: false,
  },

  // الوصول السريع
  quickAccessContainer: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 10,
  },
  quickAccessItem: {
    borderRadius: 20,
    padding: 6,
    alignItems: 'center',
    width: 88,
    borderWidth: 1,
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
    textAlign: 'center',
    lineHeight: 22,
    includeFontPadding: false,
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
    borderRadius: 20,
    overflow: 'hidden',
  },
  gridCardBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gridCard: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    borderWidth: 1,
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
    textAlign: 'center',
    lineHeight: 22,
    includeFontPadding: false,
  },

  // List layout glassmorphism cards
  listCardOuter: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  listCardBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
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
    lineHeight: 26,
    includeFontPadding: false,
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
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 16,
    paddingVertical: 50,
  },
  modalBlur: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
    includeFontPadding: false,
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
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 26,
    includeFontPadding: false,
  },
  modalDivider: {
    height: 1,
    marginVertical: 12,
  },
  modalSectionHeader: {
    fontSize: 14,
    fontFamily: fontBold(),
    marginBottom: 8,
    lineHeight: 24,
    includeFontPadding: false,
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
    lineHeight: 28,
    includeFontPadding: false,
  },
  modalCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalCategoryBadgeText: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    lineHeight: 20,
    includeFontPadding: false,
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
    overflow: 'hidden',
  },
  modalBtnConfirm: {
    backgroundColor: '#0d8e62',
  },
  modalBtnText: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    lineHeight: 26,
    includeFontPadding: false,
  },
  modalBtnConfirmText: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    color: '#fff',
    lineHeight: 26,
    includeFontPadding: false,
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
    lineHeight: 22,
    includeFontPadding: false,
  },
  surahSubtitle: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  modalModeToggle: {
    flexDirection: 'row',
    overflow: 'hidden',
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
    backgroundColor: '#0d8e62',
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
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  nextPrayerSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
  },
  nextPrayerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(13,142,98,0.12)',
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
    backgroundColor: 'rgba(13,142,98,0.12)',
  },
  nextPrayerCountdownBoxDark: {
    backgroundColor: '#232d38',
  },
  nextPrayerCountdownNum: {
    fontSize: 26,
    fontFamily: fontBold(),
    lineHeight: 32,
  },
  nextPrayerCountdownLabel: {
    fontSize: 11,
    fontFamily: fontMedium(),
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
const styles = _styles;
