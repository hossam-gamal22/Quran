// app/ruqya.tsx
// الرقية الشرعية — قسمان (قرآن / أدعية) مع عداد لكل بطاقة
// =========================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  Vibration,
  Dimensions,
  Platform,
  FlatList,
  ImageBackground,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Font from 'expo-font';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/lib/i18n';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BackButton, NativeTabs } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { Spacing } from '@/constants/theme';
import { getVerseQcfData, getQcfFontSize } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily } from '@/lib/qcf-font-loader';
import { getSurahName } from '@/lib/quran-api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const surahOrnament = require('@/assets/images/quran/surah-ornament.png');

// =====================================
// البيانات - قرآن وأدعية الرقية الشرعية
// =====================================

type QuranRef = {
  surah: number;
  startAyah: number;
  endAyah: number;
};

type QuranSlide = {
  id: string;
  refs: QuranRef[];
  count: number;
  labelAr: string;
  showBanner: boolean;
};

type DuaSlide = {
  id: string;
  arabic: string;
  count: number;
  reference: string;
};

const QURAN_SLIDES: QuranSlide[] = [
  {
    id: 'fatiha',
    refs: [{ surah: 1, startAyah: 1, endAyah: 7 }],
    count: 7,
    labelAr: 'سورة الفاتحة',
    showBanner: true,
  },
  {
    id: 'kursi',
    refs: [{ surah: 2, startAyah: 255, endAyah: 255 }],
    count: 1,
    labelAr: 'آية الكرسي',
    showBanner: false,
  },
  {
    id: 'ikhlas',
    refs: [{ surah: 112, startAyah: 1, endAyah: 4 }],
    count: 3,
    labelAr: 'سورة الإخلاص',
    showBanner: true,
  },
  {
    id: 'falaq',
    refs: [{ surah: 113, startAyah: 1, endAyah: 5 }],
    count: 3,
    labelAr: 'سورة الفلق',
    showBanner: true,
  },
  {
    id: 'nas',
    refs: [{ surah: 114, startAyah: 1, endAyah: 6 }],
    count: 3,
    labelAr: 'سورة الناس',
    showBanner: true,
  },
];

const DUA_SLIDES: DuaSlide[] = [
  {
    id: 'shafi',
    arabic:
      'اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَأْسَ، وَاشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا',
    count: 3,
    reference: 'البخاري ومسلم',
  },
  {
    id: 'urqeek',
    arabic:
      'بِسْمِ اللَّهِ أُرْقِيكَ، مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ، مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنِ حَاسِدٍ، اللَّهُ يَشْفِيكَ، بِسْمِ اللَّهِ أُرْقِيكَ',
    count: 3,
    reference: 'مسلم',
  },
  {
    id: 'hammah',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ',
    count: 3,
    reference: 'البخاري',
  },
  {
    id: 'bismillah',
    arabic:
      'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    count: 3,
    reference: 'أبو داود والترمذي',
  },
  {
    id: 'maKhalaq',
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    count: 3,
    reference: 'مسلم',
  },
];

// Unique pages we need QCF fonts for (Fatiha→1, Kursi→42, Mu'awwidhat→604)
const QCF_PAGES_NEEDED = [1, 42, 604];
const FAVORITES_KEY = '@ruqya_favorites';

// =====================================
// المكون الرئيسي
// =====================================

type TabKey = 'quran' | 'duas';

export default function RuqyaScreen() {
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  // حالة التبويب والتنقل
  const [activeTab, setActiveTab] = useState<TabKey>('quran');
  const [quranIndex, setQuranIndex] = useState(0);
  const [duasIndex, setDuasIndex] = useState(0);
  const [quranCounts, setQuranCounts] = useState<Record<string, number>>({});
  const [duasCounts, setDuasCounts] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [fontsReady, setFontsReady] = useState(false);

  // تحميل/حفظ المفضلة
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY)
      .then((raw) => {
        if (raw) setFavorites(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const toggleFavorite = useCallback((slideId: string) => {
    setFavorites((prev) => {
      const next = { ...prev, [slideId]: !prev[slideId] };
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const resetCount = useCallback(
    (slideId: string, tab: TabKey) => {
      const setter = tab === 'quran' ? setQuranCounts : setDuasCounts;
      setter((prev) => ({ ...prev, [slideId]: 0 }));
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [],
  );

  const quranListRef = useRef<FlatList>(null);
  const duasListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // =====================================
  // تحميل خطوط QCF للصفحات المطلوبة (أوفلاين)
  // =====================================

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all(
          QCF_PAGES_NEEDED.map((p) => loadPageFont(p, isDarkMode).catch(() => null)),
        );
      } finally {
        if (!cancelled) {
          setFontsReady(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDarkMode, fadeAnim]);

  // =====================================
  // مشتقات الحالة الحالية حسب التبويب
  // =====================================

  const isQuran = activeTab === 'quran';
  const currentList = isQuran ? QURAN_SLIDES : DUA_SLIDES;
  const currentIndex = isQuran ? quranIndex : duasIndex;
  const setCurrentIndex = isQuran ? setQuranIndex : setDuasIndex;
  const currentListRef = isQuran ? quranListRef : duasListRef;
  const currentCountsMap = isQuran ? quranCounts : duasCounts;
  const setCurrentCountsMap = isQuran ? setQuranCounts : setDuasCounts;
  const currentSlide = currentList[currentIndex];
  const currentSlideCount = currentCountsMap[currentSlide?.id] || 0;
  const currentSlideTarget = currentSlide?.count || 1;
  const isSlideDone = currentSlideCount >= currentSlideTarget;

  // =====================================
  // التنقل بين الشرائح
  // =====================================

  const scrollTo = useCallback(
    (list: FlatList | null, idx: number) => {
      list?.scrollToIndex({ index: idx, animated: true });
    },
    [],
  );

  const goToNext = useCallback(() => {
    const list = currentList;
    if (currentIndex < list.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      scrollTo(currentListRef.current, next);
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setCurrentIndex(0);
      scrollTo(currentListRef.current, 0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [currentIndex, currentList, currentListRef, setCurrentIndex, scrollTo]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
      scrollTo(currentListRef.current, prev);
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentIndex, currentListRef, setCurrentIndex, scrollTo]);

  const handleCount = useCallback(() => {
    if (!currentSlide) return;
    const current = currentCountsMap[currentSlide.id] || 0;
    if (current >= currentSlide.count) {
      goToNext();
      return;
    }
    const next = current + 1;
    setCurrentCountsMap((prev) => ({ ...prev, [currentSlide.id]: next }));
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(
        next >= currentSlide.count ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
      );
    } else {
      Vibration.vibrate(next >= currentSlide.count ? 100 : 30);
    }
    if (next >= currentSlide.count) {
      setTimeout(() => goToNext(), 400);
    }
  }, [currentSlide, currentCountsMap, setCurrentCountsMap, goToNext]);

  // =====================================
  // المشاركة
  // =====================================

  const shareCurrent = useCallback(async () => {
    if (!currentSlide) return;
    let message = '';
    if (isQuran) {
      const slide = currentSlide as QuranSlide;
      const glyphsText = collectSlideArabicText(slide);
      message = `${slide.labelAr}\n\n${glyphsText}\n\n${slide.count > 1 ? `— ${slide.count} مرات —\n\n` : ''}🔒 ${t('azkar.ruqya')}\n${t('common.fromApp')}`;
    } else {
      const slide = currentSlide as DuaSlide;
      message = `${slide.arabic}\n\n${slide.count > 1 ? `— ${slide.count} مرات —\n` : ''}📖 ${slide.reference}\n\n🔒 ${t('azkar.ruqya')}\n${t('common.fromApp')}`;
    }
    try {
      await Share.share({ message });
    } catch {}
  }, [currentSlide, isQuran]);

  // =====================================
  // Renderers
  // =====================================

  const iconColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  const renderActionRow = useCallback(
    (slideId: string, tab: TabKey) => (
      <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => toggleFavorite(slideId)} style={styles.actionButton}>
          <MaterialCommunityIcons
            name={favorites[slideId] ? 'heart' : 'heart-outline'}
            size={24}
            color={favorites[slideId] ? '#EF4444' : iconColor}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={shareCurrent} style={styles.actionButton}>
          <MaterialCommunityIcons name="share-variant" size={22} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => resetCount(slideId, tab)} style={styles.actionButton}>
          <MaterialCommunityIcons name="refresh" size={22} color={iconColor} />
        </TouchableOpacity>
      </View>
    ),
    [styles, isRTL, favorites, iconColor, toggleFavorite, shareCurrent, resetCount],
  );

  const renderQuranSlide = useCallback(
    ({ item }: { item: QuranSlide }) => (
      <View style={[styles.slideContainer, { width: SCREEN_WIDTH }, isRTL && { transform: [{ scaleX: -1 }] }]}>
        <ScrollView contentContainerStyle={styles.slideScroll} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.slideCard,
              { opacity: fadeAnim, borderColor: colors.glassBorder },
            ]}
          >
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={80}
                tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' },
              ]}
            />

            {renderActionRow(item.id, 'quran')}

            <QuranSlideBody slide={item} textColor={colors.text} darkMode={isDarkMode} fontsReady={fontsReady} />
          </Animated.View>
        </ScrollView>
      </View>
    ),
    [styles, isRTL, fadeAnim, colors.glassBorder, colors.text, isDarkMode, fontsReady, renderActionRow],
  );

  const renderDuaSlide = useCallback(
    ({ item }: { item: DuaSlide }) => (
      <View style={[styles.slideContainer, { width: SCREEN_WIDTH }, isRTL && { transform: [{ scaleX: -1 }] }]}>
        <ScrollView contentContainerStyle={styles.slideScroll} showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.slideCard,
              { opacity: fadeAnim, borderColor: colors.glassBorder },
            ]}
          >
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={80}
                tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' },
              ]}
            />

            {renderActionRow(item.id, 'duas')}

            <Text
              style={[styles.duaArabic, { color: colors.text, writingDirection: 'rtl' }]}
              allowFontScaling
            >
              {item.arabic}
            </Text>

            <View style={[styles.referenceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="book-outline" size={14} color={colors.icon} />
              <Text style={[styles.referenceText, { color: colors.textLight }]}>{item.reference}</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    ),
    [styles, isRTL, fadeAnim, colors.glassBorder, colors.text, colors.textLight, colors.icon, isDarkMode, renderActionRow],
  );

  // =====================================
  // رندر التبويب النشط
  // =====================================

  const progress = useMemo(() => ({
    current: currentIndex + 1,
    total: currentList.length,
    percent: ((currentIndex + 1) / currentList.length) * 100,
  }), [currentIndex, currentList.length]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <BackgroundWrapper
        backgroundKey={settings.display.appBackground}
        backgroundUrl={settings.display.appBackgroundUrl}
        opacity={settings.display.backgroundOpacity ?? 1}
        style={[styles.container, { backgroundColor: 'transparent' }]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={80}
              tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' },
            ]}
          />

          <View style={[styles.headerTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <BackButton color={colors.text} />

            <View
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                gap: Spacing.sm,
                flex: 1,
              }}
            >
              <Text
                style={[
                  styles.headerTitle,
                  { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}
                numberOfLines={1}
              >
                {t('azkar.ruqya')}
              </Text>
              <SectionInfoButton sectionKey="ruqya" />
            </View>

          </View>

          {/* Tabs — system-native segmented control (shared NativeTabs) */}
          <View style={styles.tabsWrap}>
            <NativeTabs
              tabs={[
                { key: 'quran', label: 'القرآن' },
                { key: 'duas', label: 'الأدعية' },
              ]}
              selected={activeTab}
              onSelect={(k) => setActiveTab(k as TabKey)}
              indicatorColor="#0f987f"
            />
          </View>

          {/* Progress */}
          <View style={[styles.progressContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.progressBarBg, isRTL && { transform: [{ scaleX: -1 }] }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progress.percent}%`, backgroundColor: isDarkMode ? '#FFFFFF' : '#0f987f' },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressText,
                { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
              ]}
            >
              {progress.current} / {progress.total}
            </Text>
          </View>
        </View>

        {/* Content - single pager per tab (only mount active one) */}
        {isQuran ? (
          <FlatList
            ref={quranListRef}
            data={QURAN_SLIDES}
            renderItem={renderQuranSlide}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setQuranIndex(idx);
            }}
            initialScrollIndex={quranIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          />
        ) : (
          <FlatList
            ref={duasListRef}
            data={DUA_SLIDES}
            renderItem={renderDuaSlide}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setDuasIndex(idx);
            }}
            initialScrollIndex={duasIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          />
        )}

        {/* Bottom Bar: Prev / Counter / Next */}
        <View
          style={[
            styles.bottomBar,
            { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={80}
              tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' },
            ]}
          />

          <TouchableOpacity
            onPress={goToPrevious}
            disabled={currentIndex === 0}
            style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          >
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={28}
              color={currentIndex === 0 ? colors.muted : '#6366F1'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCount}
            style={[
              styles.counterButton,
              { backgroundColor: isSlideDone ? '#10B981' : '#6366F1' },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.counterText}>
              {isSlideDone ? '✓' : `${currentSlideCount}/${currentSlideTarget}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNext} style={styles.navButton}>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={28}
              color={'#6366F1'}
            />
          </TouchableOpacity>
        </View>

        <BannerAdComponent screen="ruqya" />
      </BackgroundWrapper>
    </>
  );
}

// =====================================
// QuranSlideBody - renders surah banner + QCF glyphs (with Uthmanic fallback)
// =====================================

interface QuranSlideBodyProps {
  slide: QuranSlide;
  textColor: string;
  darkMode: boolean;
  fontsReady: boolean;
}

interface SurahGroupData {
  surah: number;
  page: number;
  glyphs: string;
  fallbackText: string;
}

function QuranSlideBody({ slide, textColor, darkMode, fontsReady }: QuranSlideBodyProps) {
  // Allow one render cycle for iOS CoreText to register pre-loaded fonts
  const [renderReady, setRenderReady] = useState(false);
  useEffect(() => {
    if (!fontsReady) return;
    const id = requestAnimationFrame(() => setRenderReady(true));
    return () => cancelAnimationFrame(id);
  }, [fontsReady]);

  // One block per surah ref: verses flow inline (Mushaf-style) within each block,
  // while multiple surahs (e.g. المعوذات الثلاث) stack with their own ornamental banners.
  const groups = useMemo<SurahGroupData[]>(() => {
    return slide.refs.map((ref) => {
      const ayahPieces: string[] = [];
      let firstPage: number | null = null;
      for (let ayah = ref.startAyah; ayah <= ref.endAyah; ayah++) {
        const data = getVerseQcfData(ref.surah, ayah);
        if (data) {
          if (firstPage === null) firstPage = data.page;
          ayahPieces.push(data.glyphs.join(''));
        }
      }
      // Fallback Uthmanic text flows as one continuous paragraph,
      // with ornamental verse numbers between ayahs so they read inline
      // rather than stacking one ayah per line.
      const ayahTexts = collectAyahTexts(ref.surah, ref.startAyah, ref.endAyah);
      const fallbackText = ayahTexts
        .map((txt, i) => `${txt} ﴿${toArabicNumeral(ref.startAyah + i)}﴾`)
        .join(' ');
      return {
        surah: ref.surah,
        page: firstPage ?? 604,
        glyphs: ayahPieces.join(''),
        fallbackText,
      };
    });
  }, [slide.refs]);

  const ornamentColor = darkMode ? '#C9A84C' : '#8B7332';

  return (
    <View style={qcfStyles.container}>
      {groups.map((group, idx) => {
        const fontFamily = getPageFontFamily(group.page, darkMode);
        const qcfLoaded = renderReady && Font.isLoaded(fontFamily);
        const fontSize = getQcfFontSize(group.page, SCREEN_WIDTH - 64);
        const lineHeight = fontSize * 1.95;
        // Real surahs show their Mushaf name; partial slides (e.g. آية الكرسي)
        // show their custom label inside the same ornamental frame.
        const bannerLabel = slide.showBanner ? getSurahName(group.surah) : slide.labelAr;

        return (
          <View
            key={`${slide.id}-${group.surah}-${idx}`}
            style={groups.length > 1 ? qcfStyles.surahBlock : undefined}
          >
            <View style={qcfStyles.bannerWrap}>
              <ImageBackground
                source={surahOrnament}
                style={qcfStyles.bannerOrnament}
                resizeMode="contain"
                tintColor={ornamentColor}
              >
                <View style={qcfStyles.bannerOverlay}>
                  <Text
                    style={[qcfStyles.bannerText, { color: ornamentColor }]}
                    allowFontScaling={false}
                    numberOfLines={1}
                  >
                    {bannerLabel}
                  </Text>
                </View>
              </ImageBackground>
            </View>

            {qcfLoaded ? (
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily,
                  fontSize,
                  textAlign: 'center',
                  lineHeight,
                  color: textColor,
                  writingDirection: 'rtl',
                  letterSpacing: 0,
                  paddingTop: 6,
                  paddingBottom: 6,
                }}
              >
                {group.glyphs}
              </Text>
            ) : (
              <Text
                style={{
                  fontFamily: 'KFGQPCUthmanic',
                  fontSize: 26,
                  lineHeight: 52,
                  textAlign: 'center',
                  color: textColor,
                  writingDirection: 'rtl',
                  paddingTop: 6,
                  paddingBottom: 6,
                }}
              >
                {group.fallbackText}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// =====================================
// Helpers
// =====================================

function collectAyahTexts(surah: number, startAyah: number, endAyah: number): string[] {
  // Local require to avoid circular imports; quran-v4 is bundled
  const quranV4 = require('@/data/json/quran-v4.json') as Array<{
    number: number;
    ayahs: Array<{ ns: number; t: string }>;
  }>;
  const s = quranV4.find((x) => x.number === surah);
  if (!s) return [];
  const out: string[] = [];
  for (let a = startAyah; a <= endAyah; a++) {
    const ayah = s.ayahs.find((x) => x.ns === a);
    if (ayah) out.push(ayah.t);
  }
  return out;
}

function collectSlideArabicText(slide: QuranSlide): string {
  return slide.refs
    .map((ref) => collectAyahTexts(ref.surah, ref.startAyah, ref.endAyah).join(' '))
    .join('\n\n');
}

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNumeral(n: number): string {
  return String(n)
    .split('')
    .map((d) => ARABIC_DIGITS[parseInt(d, 10)] ?? d)
    .join('');
}

// =====================================
// الأنماط
// =====================================

const _styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 32,
    includeFontPadding: false,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerButton: {
    padding: 8,
  },
  tabsWrap: {
    marginBottom: 12,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(120,120,128,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
  },

  // Slides
  slideContainer: {
    flex: 1,
  },
  slideScroll: {
    padding: 16,
    paddingBottom: 120,
  },
  slideCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    gap: Spacing.md,
  },
  actionButton: {
    padding: 8,
  },

  duaArabic: {
    fontSize: 24,
    fontFamily: 'KFGQPCUthmanic',
    fontWeight: '500',
    lineHeight: 48,
    textAlign: 'center',
    marginVertical: 16,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: 8,
  },
  referenceText: {
    fontSize: 13,
    lineHeight: 22,
    includeFontPadding: false,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.10)',
    overflow: 'hidden',
  },
  navButton: {
    padding: 12,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  counterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 120,
  },
  counterText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

const qcfStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  bannerWrap: {
    marginBottom: 6,
    height: 54,
    width: '100%',
  },
  bannerOrnament: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
  },
  // Surah name over the ornament — identical to the Mushaf reader's SurahBanner
  bannerText: {
    fontSize: 17,
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    lineHeight: 28,
    width: '100%',
    includeFontPadding: false,
  },
  surahBlock: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
});
