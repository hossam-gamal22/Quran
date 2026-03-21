/**
 * QPC V2 Mushaf Reader — quran_library V2 style
 *
 * Features:
 * - QPC V2 per-page font rendering from Tarteel CDN (monochrome, controllable color)
 * - Horizontal RTL page swiping (Medina Mushaf layout)
 * - Multi-color ayah bookmarks (yellow / red / green) with highlighting
 * - Current ayah highlighting during audio playback
 * - Quran text search
 * - Tafsir panel (تفسير الميسر)
 * - Ayah long-press menu (bookmark, tafsir, copy, play)
 * - 17 theme system with adaptive text color
 * - Golden ayah markers and surah banners
 * - Audio playback via alquran.cloud
 * - Glassmorphism header and modals
 * - Background image selection (quranbg1-4)
 * - Share page as image with branding
 * - Diacritics / Translation / Tajweed toggles
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ImageBackground,
  Image,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import ViewShot from 'react-native-view-shot';
import { useQuran } from '@/contexts/QuranContext';
import { useSettings } from '@/contexts/SettingsContext';
import { t as translate } from '@/lib/i18n';
import { useQuranTracker } from '@/contexts/WorshipContext';
import {
  getQuranTextColor,
} from '@/components/ui/QuranBackgroundWrapper';
import { ORNAMENT_NO_TINT_INDICES, QURAN_THEMES, getGoldenColor, getSafeThemeIndex } from '@/constants/quran-themes';
import { Spacing, FONT_SIZES } from '@/constants/theme';
import { getAppName } from '@/constants/app';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { useSacredContext } from '@/hooks/use-sacred-context';

/** Build a theme-appropriate highlight bg for the target ayah */
function getTargetAyahBg(themeIndex: number): string {
  const theme = QURAN_THEMES[themeIndex] || QURAN_THEMES[0];
  const hex = theme.highlight.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.40)`;
}
import { setLastRead, addBookmark, removeBookmark, getBookmarks } from '@/lib/storage';
import { copyAyah } from '@/lib/clipboard';
import { ShareableCard } from '@/components/ui/ShareableCard';
import { shareImage } from '@/lib/share-service';
import {
  buildPageBlocks,
  getJuzForPage,
  getFirstSurahOnPage,
  getFirstAyahOnPage,
  getSurahStartPage,
  getSurahData,
  getQcfFontSize,
  getPageLines,
  getWord,
  TOTAL_PAGES,
  getVerseQcfData,
} from '@/lib/qcf-page-data';
import {
  loadPageFont,
  ensurePagesLoaded,
  getPageFontFamily,
  isPageFontLoaded,
} from '@/lib/qcf-font-loader';
// AudioPlayerBar moved to global _layout.tsx
import {
  getColoredBookmarks,
  addColoredBookmark,
  removeColoredBookmark,
  buildBookmarkMap,
  type ColoredBookmark,
  type BookmarkColor,
  BOOKMARK_COLORS,
  BOOKMARK_BG_COLORS,
  BOOKMARK_BORDER_COLORS,
  BOOKMARK_COLOR_LABELS,
} from '@/lib/quran-bookmarks';
import tafsirData from '@/data/json/tafsir-muyassar.json';
import { fetchSurahTranslation, TRANSLATION_EDITIONS, getSurahName } from '@/lib/quran-api';
import { trackQuranPage } from '@/lib/firebase-analytics';

import { useIsRTL } from '@/hooks/use-is-rtl';
// ══════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
const LAST_PAGE_KEY = 'quran_last_page';

const BOOKMARK_COLOR_ORDER: BookmarkColor[] = ['yellow', 'red', 'green'];

// Playing ayah highlight — subtle golden glow
const PLAYING_AYAH_BG = 'rgba(212, 175, 55, 0.12)';

// Background images
const QURAN_BG_IMAGES: Record<string, any> = {
  quranbg1: require('@/assets/images/quran/quranbg1.png'),
  quranbg2: require('@/assets/images/quran/quranbg2.png'),
  quranbg3: require('@/assets/images/quran/quranbg3.png'),
  quranbg4: require('@/assets/images/quran/quranbg4.png'),
};


// ══════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════

const toArabicNumber = (n: number): string => String(n);

const stripTashkeel = (text: string): string =>
  text.replace(/[\u064B-\u065F\u0670]/g, '');

const getTafsir = (surah: number, ayah: number): string => {
  const surahEntries = (tafsirData as any)[String(surah)];
  if (!surahEntries) return '';
  const entry = surahEntries.find((a: any) => a.id === ayah);
  return entry?.text || '';
};

// ══════════════════════════════════════════════
// Image Assets
// ══════════════════════════════════════════════

const surahOrnament = require('@/assets/images/quran/surah-ornament.png');
const basmalaImg = require('@/assets/images/quran/basmala.png');

// ══════════════════════════════════════════════
// SurahBanner — Golden surah header with ornament
// ══════════════════════════════════════════════

/** QCF surah-names font maps surah 1 → U+E000, surah 2 → U+E001, etc. */
function getSurahNameGlyph(surahNumber: number): string {
  return String.fromCharCode(0xE000 + surahNumber - 1);
}

function SurahBanner({ surahNumber, themeIndex }: { surahNumber: number; themeIndex: number }) {
  const goldenColor = getGoldenColor(themeIndex);
  const noTint = ORNAMENT_NO_TINT_INDICES.includes(themeIndex);
  const surahName = getSurahName(surahNumber);

  return (
    <View style={bs.wrap} collapsable={false}>
      <ImageBackground
        source={surahOrnament}
        style={bs.ornament}
        resizeMode="contain"
        tintColor={noTint ? undefined : goldenColor}
      >
        <View style={bs.overlay} collapsable={false}>
          <Text
            style={[bs.amiriSurahName, { color: goldenColor }]}
            allowFontScaling={false}
          >
            {surahName}
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}

// ══════════════════════════════════════════════
// BasmalaLine — Tinted basmala image
// ══════════════════════════════════════════════

function BasmalaLine({ themeIndex }: { themeIndex: number }) {
  const goldenColor = getGoldenColor(themeIndex);
  return (
    <View style={bs.basmalaWrap}>
      <Image source={basmalaImg} style={bs.basmalaImg} resizeMode="contain" tintColor={goldenColor} />
    </View>
  );
}

const bs = StyleSheet.create({
  wrap: { marginHorizontal: 8, marginVertical: 4, height: 54 },
  ornament: { width: '100%', height: 50, justifyContent: 'center', alignItems: 'center' },
  overlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', paddingHorizontal: 24, height: 50 },
  metaSide: { fontSize: 12, fontFamily: 'Amiri-Bold', textAlign: 'center' },
  centerCol: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  surahName: { fontSize: 14, fontFamily: fontBold(), textAlign: 'center' as const },
  qcfSurahName: { fontSize: 28, fontFamily: 'QCFSurahNames', textAlign: 'center' as const },
  amiriSurahName: { fontSize: 17, fontFamily: 'Amiri-Bold', textAlign: 'center' as const },
  basmalaWrap: { alignItems: 'center', marginVertical: 2, paddingHorizontal: '20%' },
  basmalaImg: { width: '100%', height: 28 },
});

// ══════════════════════════════════════════════
// MushafPage — QCF4 V4 font-based rendering with bookmark + audio highlighting
// ══════════════════════════════════════════════

interface MushafPageProps {
  page: number;
  themeIndex: number;
  width: number;
  fontSizeAdjust: number;
  forceLightText?: boolean;
  useCdnImage?: boolean;
  bookmarkMap: Record<string, BookmarkColor>;
  playingAyahKey: string | null;
  highlightAyahKey: string | null;
  onAyahLongPress?: (surah: number, ayah: number, page: number) => void;
  translationMap?: Record<string, string>;
  showTranslation?: boolean;
  translationFontSize?: number;
  translationIsRTL?: boolean;
}

const MushafPage = React.memo(function MushafPage({
  page, themeIndex, width, fontSizeAdjust, forceLightText, useCdnImage, bookmarkMap, playingAyahKey, highlightAyahKey, onAyahLongPress,
  translationMap, showTranslation, translationFontSize = 14, translationIsRTL = false,
}: MushafPageProps) {
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  // Use forceLightText (actual background) to determine CPAL mode, not system isDarkMode
  const needsDarkFont = forceLightText ?? isDarkMode;
  const [fontLoaded, setFontLoaded] = useState(isPageFontLoaded(page, needsDarkFont));
  const [fontError, setFontError] = useState(false);
  const baseTextColor = getQuranTextColor('', themeIndex);
  // Determine if the theme's primary color is dark (i.e., designed for light backgrounds)
  const isBaseColorDark = (() => {
    const hex = (baseTextColor || '#000000').replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();

  // Dynamic text color based on background image:
  // - Dark backgrounds (quranbg3, quranbg4) → white/light text
  // - Light backgrounds (quranbg1, quranbg2) → black/dark text
  let textColor: string;
  if (forceLightText) {
    // Dark background: if theme's base color is dark, override to white
    textColor = isBaseColorDark ? '#FFFFFF' : baseTextColor;
  } else {
    // Light background: if theme's base color is light, override to black
    textColor = !isBaseColorDark ? '#000000' : baseTextColor;
  }
  const goldenColor = getGoldenColor(themeIndex);
  const targetAyahBg = getTargetAyahBg(themeIndex);

  // Load QCF4 per-page font (use needsDarkFont based on actual background)
  useEffect(() => {
    if (isPageFontLoaded(page, needsDarkFont)) {
      setFontLoaded(true);
      return;
    }
    setFontLoaded(false);
    setFontError(false);
    loadPageFont(page, needsDarkFont)
      .then(() => setFontLoaded(true))
      .catch(() => setFontError(true));
  }, [page, needsDarkFont]);

  const blocks = useMemo(() => buildPageBlocks(page), [page]);
  const fontFamily = getPageFontFamily(page, needsDarkFont);

  // Dynamic font scaling: only boost very sparse pages, avoid cramping dense ones
  const contentLineCount = blocks.filter(b => b.type === 'ayah' || b.type === 'basmallah').length;
  const dynamicBoost = contentLineCount <= 5 ? 3 : contentLineCount <= 7 ? 1 : 0;
  const fontSize = getQcfFontSize(page, width - 32, fontSizeAdjust + dynamicBoost);

  // Use a tighter line height for dense pages to prevent overflow
  const lineHeight = contentLineCount >= 14
    ? fontSize * 1.65
    : contentLineCount >= 11
      ? fontSize * 1.75
      : fontSize * 1.9;

  // Add top/bottom padding when using QCF per-page fonts to avoid glyph clipping (letters like ك، ل، ط)
  const extraTopPadding = fontLoaded ? Math.ceil(fontSize * 0.18) : 0;

  // Font loading state
  if (!fontLoaded && !fontError) {
    return (
      <View style={{ width, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={goldenColor} />
      </View>
    );
  }

  // Font failed to load — retry UI
  if (fontError) {
    return (
      <View style={{ width, flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: textColor, marginBottom: 12 }}>{translate('quran.fontLoadError')}</Text>
        <TouchableOpacity
          onPress={() => {
            setFontError(false);
            setFontLoaded(false);
          }}
          style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: getGoldenColor(themeIndex), borderRadius: 10 }}
        >
          <Text style={{ color: '#fff' }}>{translate('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const WINDOW_HEIGHT = Dimensions.get('window').height;
  const MIN_PAGE_HEIGHT = Math.max(WINDOW_HEIGHT - 140, 520);

  return (
    <ScrollView
      style={{ width, flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'flex-start',
        paddingTop: 12,
        paddingBottom: 44,
        paddingHorizontal: 16,
        minHeight: MIN_PAGE_HEIGHT,
      }}
      showsVerticalScrollIndicator={false}
      bounces={false}
      nestedScrollEnabled
      directionalLockEnabled
      scrollEventThrottle={16}
    >
      {blocks.map((block, i) => {
        if (block.type === 'surah_name') {
          return <SurahBanner key={`sh-${i}`} surahNumber={block.surahNumber} themeIndex={themeIndex} />;
        }
        if (block.type === 'basmallah') {
          return <BasmalaLine key={`bsm-${i}`} themeIndex={themeIndex} />;
        }

        // Render each page LINE as a single Text element to preserve layout
        if (block.type === 'ayah') {
          // build segments grouped by ayah but keep them inline within the line
          type SegGroup = { surah: number; ayah: number; parts: { glyph: string; isEnd: boolean }[] };
          const ayahGroups: SegGroup[] = [];
          let curr: SegGroup | null = null;
          for (const seg of block.segments) {
            if (!curr || curr.surah !== seg.surah || curr.ayah !== seg.ayah) {
              curr = { surah: seg.surah, ayah: seg.ayah, parts: [] };
              ayahGroups.push(curr);
            }
            curr.parts.push({ glyph: seg.glyph, isEnd: seg.isAyahEnd });
          }

          // Collect ayahs that END on this line (for translation display)
          const endingAyahs = showTranslation && translationMap
            ? ayahGroups.filter(g => g.parts.some(p => p.isEnd))
            : [];

          return (
            <View key={i}>
              <Text
                style={{
                  fontFamily: fontLoaded ? fontFamily : 'Amiri-Regular',
                  fontSize,
                  textAlign: 'center',
                  lineHeight,
                  letterSpacing: 0,
                  writingDirection: 'rtl',
                  paddingTop: extraTopPadding,
                  paddingBottom: extraTopPadding > 0 ? Math.ceil(fontSize * 0.1) : 0,
                }}
                allowFontScaling={false}
              >
                {ayahGroups.map((group, gi) => {
                  const ayahKey = `${group.surah}:${group.ayah}`;
                  const bcolor = bookmarkMap[ayahKey];
                  const isPlaying = playingAyahKey === ayahKey;
                  const isHighlighted = highlightAyahKey === ayahKey;

                  let bgColor: string | undefined;
                  if (bcolor) bgColor = BOOKMARK_BG_COLORS[bcolor];
                  else if (isPlaying) bgColor = PLAYING_AYAH_BG;
                  else if (isHighlighted) bgColor = targetAyahBg;

                  const surahData = getSurahData(group.surah);
                  const ayahObj = surahData?.ayahs.find(a => a.ns === group.ayah);
                  const ayahText = ayahObj?.t;

                  if (ayahText && !fontLoaded) {
                    const wordsFromAyah = ayahText.split(/\s+/).filter(Boolean);
                    let wordIndex = 0;
                    return (
                      <Text
                        key={gi}
                        onLongPress={() => {
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          onAyahLongPress?.(group.surah, group.ayah, page);
                        }}
                        style={{
                          backgroundColor: bgColor,
                          paddingHorizontal: Math.max(6, Math.round(fontSize * 0.28)),
                          paddingVertical: Math.max(2, Math.round(fontSize * 0.12)),
                          borderRadius: Math.round(fontSize * 0.28),
                        }}
                      >
                        {group.parts.map((part, pi) => {
                          const mapped = wordsFromAyah[wordIndex] ?? part.glyph;
                          wordIndex += 1;
                          return (
                            <Text key={pi} style={{ color: textColor }}>
                              {mapped}{' '}
                            </Text>
                          );
                        })}
                      </Text>
                    );
                  }

                  return (
                    <Text
                      key={gi}
                      onLongPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onAyahLongPress?.(group.surah, group.ayah, page);
                      }}
                      style={{
                        backgroundColor: bgColor,
                        paddingHorizontal: Math.max(6, Math.round(fontSize * 0.28)),
                        paddingVertical: Math.max(2, Math.round(fontSize * 0.12)),
                        borderRadius: Math.round(fontSize * 0.28),
                      }}
                    >
                      {group.parts.map((part, pi) => (
                        <Text key={pi} style={{ color: textColor }}>{part.glyph}</Text>
                      ))}
                    </Text>
                  );
                })}
              </Text>
              {/* Translation text for ayahs ending on this line */}
              {endingAyahs.map((g) => {
                const key = `${g.surah}:${g.ayah}`;
                const tText = translationMap?.[key];
                if (!tText) return null;
                const dir = translationIsRTL ? 'rtl' : 'ltr';
                const ayahLabel = translationIsRTL ? `﴿${g.ayah}﴾` : `(${g.ayah})`;
                return (
                  <View key={`tr-${key}`} style={{ direction: dir }}>
                    <Text
                      style={{
                        fontSize: translationFontSize,
                        color: forceLightText ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)',
                        textAlign: translationIsRTL ? 'right' : 'left',
                        writingDirection: dir,
                        fontFamily: fontRegular(),
                        lineHeight: translationFontSize * 1.6,
                        paddingHorizontal: 12,
                        paddingVertical: 2,
                      }}
                    >
                      {ayahLabel} {tText}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }
        return null;
      })}
    </ScrollView>
  );
});

// ══════════════════════════════════════════════
// GlassHeader — Frosted glass header bar
// ══════════════════════════════════════════════

interface GlassHeaderProps {
  isLightBg: boolean;
  textColor: string;
  goldenColor: string;
  juz: number;
  surahName: string;
  tafsirActive: boolean;
  isPageFavorited: boolean;
  currentPage: number;
  onTafsir: () => void;
  onPlay: () => void;
  onBack: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
}

function GlassHeader({ isLightBg, textColor, goldenColor, juz, surahName, tafsirActive, isPageFavorited, currentPage, onTafsir, onPlay, onBack, onToggleFavorite, onShare }: GlassHeaderProps) {
  return (
    <View style={gh.wrapper} collapsable={false}>
      <View style={gh.inner}>
        {/* Left: tafsir toggle + play + heart (save page) + share */}
        <View style={gh.left}>
          <TouchableOpacity hitSlop={8} onPress={onTafsir}>
            <MaterialCommunityIcons
              name={tafsirActive ? 'book-open-variant' : 'book-open-page-variant-outline'}
              size={22}
              color={tafsirActive ? goldenColor : (isLightBg ? '#555' : '#bbb')}
            />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8} onPress={onPlay}>
            <MaterialCommunityIcons name="play-circle-outline" size={24} color={goldenColor} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8} onPress={onToggleFavorite}>
            <MaterialCommunityIcons
              name={isPageFavorited ? 'heart' : 'heart-outline'}
              size={22}
              color={isPageFavorited ? '#EF4444' : goldenColor}
            />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8} onPress={onShare}>
            <MaterialCommunityIcons name="share-variant-outline" size={20} color={goldenColor} />
          </TouchableOpacity>
        </View>

        {/* Center: page number - surah name */}
        <View style={gh.center}>
          <Text style={[gh.pageInfo, { color: goldenColor }]} numberOfLines={1}>
            {toArabicNumber(currentPage)} - {surahName}
          </Text>
        </View>

        {/* Right: back */}
        <View style={gh.right}>
          <TouchableOpacity hitSlop={8} onPress={onBack}>
            <Ionicons name="chevron-forward" size={28} color={goldenColor} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const gh = StyleSheet.create({
  wrapper: {
    zIndex: 10,
    height: 48,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 50, justifyContent: 'flex-end' },
  center: { alignItems: 'center', paddingHorizontal: 8, flexShrink: 0 },
  pageInfo: { fontSize: 15, fontFamily: 'Amiri-Bold' },
});

// ══════════════════════════════════════════════
// Main Screen
// ══════════════════════════════════════════════

export default function SurahScreen() {
  const { id, ayah: targetAyahParam, page: targetPageParam, autoShare: autoShareParam } =
    useLocalSearchParams<{ id: string; ayah?: string; page?: string; autoShare?: string }>();
  const surahNumber = parseInt(id || '1');
  const targetAyah = targetAyahParam ? parseInt(targetAyahParam) : undefined;

  const router = useRouter();
  const { settings, isDarkMode, updateDisplay, isLoading: settingsLoading, t } = useSettings();
  const isRTL = useIsRTL();

  // Block all ads during Quran reading
  useSacredContext('quran_reading');

  // Guard: wait for settings to load to prevent theme flash (race condition)
  if (settingsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a2e' : '#f5f0e8', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }
  const { playAyah, playbackState, togglePlayPause, reciters, currentReciter, setReciter } = useQuran();

  const themeIndex = getSafeThemeIndex(settings.display.quranThemeIndex ?? 0);
  const fontSizeAdjust = settings.display.quranFontSizeAdjust ?? 0;
  // Intelligent default: light mode → quranbg1, dark mode → quranbg3
  const defaultBg = isDarkMode ? 'quranbg3' : 'quranbg1';
  const quranBgKey = settings.display.quranBackground ?? defaultBg;
  const hasDarkBackgroundImage = quranBgKey === 'quranbg3' || quranBgKey === 'quranbg4';
  const isLightBg = !hasDarkBackgroundImage;
  // Text color based on BACKGROUND IMAGE only (not system dark mode)
  // quranbg1/2 = light bg → dark/black text; quranbg3/4 = dark bg → light/white text
  const forceLightText = hasDarkBackgroundImage;
  const rawTextColor = getQuranTextColor('', themeIndex);
  // Adjust text color for readability on the actual background
  const isRawColorDark = (() => {
    const hex = (rawTextColor || '#000000').replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();
  const textColor = forceLightText
    ? (isRawColorDark ? '#FFFFFF' : rawTextColor)
    : (!isRawColorDark ? '#000000' : rawTextColor);
  const goldenColor = getGoldenColor(themeIndex);
  const { logoSource: appIcon } = useAppIdentity();

  // Display settings for toggles
  const showTashkeel = settings.display.showTashkeel ?? true;
  const isArabicLang = (settings.language || 'ar') === 'ar';
  const showTranslation = isArabicLang ? (settings.display.showTranslation ?? false) : true;
  const translationEdition = settings.display.translationEdition ?? 'en.sahih';
  const translationFontSize = settings.display.translationFontSize ?? 14;
  const highlightTajweed = settings.display.highlightTajweed ?? false;

  // Translation language direction
  const translationLang = TRANSLATION_EDITIONS.find(e => e.identifier === translationEdition)?.language ?? 'en';
  const translationIsRTL = ['ar', 'ur', 'fa'].includes(translationLang);

  const flatListRef = useRef<FlatList>(null);
  const pageViewShotRef = useRef<ViewShot>(null);
  const trackedPagesRef = useRef<Set<number>>(new Set());
  const trackedPagesLoadedRef = useRef(false);
  const pendingPagesRef = useRef<number[]>([]);
  const { addPagesRead } = useQuranTracker();
  const TRACKED_PAGES_KEY = '@quran_tracked_pages_khatma';

  // Load already-tracked pages for current khatma on mount
  useEffect(() => {
    const loadTrackedPages = async () => {
      try {
        const raw = await AsyncStorage.getItem(TRACKED_PAGES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.pages)) {
            trackedPagesRef.current = new Set(parsed.pages);
          }
        }
      } catch {}
      trackedPagesLoadedRef.current = true;
      // Process any pages that were visited before load finished
      for (const page of pendingPagesRef.current) {
        if (!trackedPagesRef.current.has(page)) {
          trackedPagesRef.current.add(page);
          addPagesRead(1).catch(() => {});
        }
      }
      pendingPagesRef.current = [];
      // Persist after processing pending
      if (trackedPagesRef.current.size >= 604) {
        trackedPagesRef.current = new Set();
        AsyncStorage.setItem(TRACKED_PAGES_KEY, JSON.stringify({ pages: [] })).catch(() => {});
      } else {
        AsyncStorage.setItem(TRACKED_PAGES_KEY, JSON.stringify({
          pages: Array.from(trackedPagesRef.current),
        })).catch(() => {});
      }
    };
    loadTrackedPages();
  }, []);

  // Initial page
  const initialPage = useMemo(() => {
    if (targetPageParam) return parseInt(targetPageParam);
    if (targetAyah) {
      const surah = getSurahData(surahNumber);
      const ayah = surah?.ayahs.find(a => a.ns === targetAyah);
      return ayah?.p || getSurahStartPage(surahNumber);
    }
    return getSurahStartPage(surahNumber);
  }, [surahNumber, targetAyah, targetPageParam]);

  // ── State ──

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showControls, setShowControls] = useState(true);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<ColoredBookmark[]>([]);
  const bookmarkMap = useMemo(() => buildBookmarkMap(bookmarks), [bookmarks]);

  // Translation data: map of "surah:ayah" → translation text
  const [translationMap, setTranslationMap] = useState<Record<string, string>>({});
  const translationCacheRef = useRef<Record<string, Record<string, string>>>({});

  // Fetch translation for surahs visible on current page
  useEffect(() => {
    if (!showTranslation) return;
    const surahNum = getFirstSurahOnPage(currentPage);
    if (!surahNum) return;
    const cacheKey = `${translationEdition}:${surahNum}`;
    if (translationCacheRef.current[cacheKey]) {
      setTranslationMap(prev => ({ ...prev, ...translationCacheRef.current[cacheKey] }));
      return;
    }
    fetchSurahTranslation(surahNum, translationEdition)
      .then(data => {
        const map: Record<string, string> = {};
        for (const a of data.ayahs) {
          map[`${surahNum}:${a.numberInSurah}`] = a.text;
        }
        translationCacheRef.current[cacheKey] = map;
        setTranslationMap(prev => ({ ...prev, ...map }));
      })
      .catch(() => {});
  }, [currentPage, showTranslation, translationEdition]);



  // Ayah action menu
  const [showAyahMenu, setShowAyahMenu] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<{ surah: number; ayah: number; page: number } | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareData, setShareData] = useState<{ text: string; title: string; reference: string; surahNumber?: number; ayahNumber?: number; page?: number } | null>(null);

  // Tafsir
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsirAyah] = useState<{ surah: number; ayah: number; surahName: string; text: string; tafsir: string; translation?: string } | null>(null);
  const [tafsirLocked, setTafsirLocked] = useState(false);
  const [tafsirMinimized, setTafsirMinimized] = useState(false);
  const currentLang = settings.language || 'ar';

  // Emit tafsir visibility to global UI listeners (audio bar)
  useEffect(() => {
    try {
      const ge = require('@/lib/global-events');
      ge.emit('tafsir:visibility', showTafsir);
    } catch (e) {}
  }, [showTafsir]);

  // When sheet is opened, clear minimized state
  useEffect(() => {
    if (showTafsir) setTafsirMinimized(false);
  }, [showTafsir]);

  // Settings
  const [showSettings, setShowSettings] = useState(false);



  // Long-press onboarding tooltip — shown once on first visit
  const [showLongPressHint, setShowLongPressHint] = useState(false);
  useEffect(() => {
    const HINT_KEY = 'quran_longpress_hint_seen';
    AsyncStorage.getItem(HINT_KEY).then(val => {
      if (!val) {
        setShowLongPressHint(true);
        AsyncStorage.setItem(HINT_KEY, '1');
      }
    });
  }, []);
  useEffect(() => {
    if (!showLongPressHint) return;
    const timer = setTimeout(() => setShowLongPressHint(false), 5000);
    return () => clearTimeout(timer);
  }, [showLongPressHint]);

  // ── Page favorites (heart icon in header) ──
  const [isPageFavorited, setIsPageFavorited] = useState(false);
  const pageFirstAyah = useMemo(() => getFirstAyahOnPage(currentPage), [currentPage]);

  useEffect(() => {
    // Check for page bookmark with ID pattern: page_{pageNumber}
    getBookmarks().then(bms => {
      const pageId = `page_${currentPage}`;
      setIsPageFavorited(bms.some(b => b.id === pageId));
    });
  }, [currentPage]);

  const handleToggleFavorite = useCallback(async () => {
    const pageId = `page_${currentPage}`;
    if (isPageFavorited) {
      await removeBookmark(pageId);
      setIsPageFavorited(false);
    } else {
      // Collect all ayah texts on this page
      const blocks = buildPageBlocks(currentPage);
      const seen = new Set<string>();
      const ayahTexts: string[] = [];
      for (const block of blocks) {
        if (block.type !== 'ayah' || !block.segments) continue;
        for (const seg of block.segments) {
          const key = `${seg.surah}:${seg.ayah}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const sd = getSurahData(seg.surah);
          const ad = sd?.ayahs?.find((a: any) => a.ns === seg.ayah);
          if (ad?.t) ayahTexts.push(ad.t);
        }
      }
      // Use page-based bookmark ID pattern and store page number in ayahNumber
      const bms = await getBookmarks();
      const filtered = bms.filter(b => b.id !== pageId);
      const newBookmark = {
        id: pageId,
        surahNumber: pageFirstAyah.surah,
        ayahNumber: currentPage, // store page number
        surahName: getSurahName(pageFirstAyah.surah),
        ayahText: ayahTexts.join(' '),
        createdAt: Date.now(),
      };
      await AsyncStorage.setItem('@quran_bookmarks', JSON.stringify([newBookmark, ...filtered]));
      setIsPageFavorited(true);
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isPageFavorited, currentPage, pageFirstAyah]);

  // Currently playing ayah key for highlighting
  const playingAyahKey = useMemo(() => {
    if (!playbackState.isPlaying && !playbackState.isLoading) return null;
    if (playbackState.currentSurah === 0) return null;
    return `${playbackState.currentSurah}:${playbackState.currentAyah}`;
  }, [playbackState.isPlaying, playbackState.isLoading, playbackState.currentSurah, playbackState.currentAyah]);

  // Target ayah highlight — auto-clears after 5 seconds
  const [highlightAyahKey, setHighlightAyahKey] = useState<string | null>(
    targetAyah ? `${surahNumber}:${targetAyah}` : null
  );

  // Fade animation for target ayah indicator
  const targetIndicatorOpacity = useRef(new Animated.Value(targetAyah ? 1 : 0)).current;

  useEffect(() => {
    if (!highlightAyahKey) return;
    targetIndicatorOpacity.setValue(1);
    const fadeTimer = setTimeout(() => {
      Animated.timing(targetIndicatorOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }, 4200);
    const clearTimer = setTimeout(() => setHighlightAyahKey(null), 5000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightAyahKey]);

  // ── Tafsir split-screen data ──
  const showTafsirPanel = settings.display.showTafsir ?? false;
  const tafsirPanelData = useMemo(() => {
    if (!showTafsirPanel) return [];
    const blocks = buildPageBlocks(currentPage);
    const seen = new Set<string>();
    const ayahs: { surah: number; ayah: number; surahName: string; tafsir: string }[] = [];
    for (const block of blocks) {
      if (block.type !== 'ayah' || !block.segments) continue;
      for (const seg of block.segments) {
        const key = `${seg.surah}:${seg.ayah}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const t = getTafsir(seg.surah, seg.ayah);
        if (t) {
          const sd = getSurahData(seg.surah);
          ayahs.push({ surah: seg.surah, ayah: seg.ayah, surahName: getSurahName(seg.surah), tafsir: t });
        }
      }
    }
    return ayahs;
  }, [showTafsirPanel, currentPage]);

  // ── Effects ──

  useEffect(() => {
    getColoredBookmarks().then(setBookmarks);
  }, []);

  useEffect(() => {
    ensurePagesLoaded(currentPage, 3, forceLightText);
  }, [currentPage, forceLightText]);

  // Surah names on current page
  const surahsOnPage = useMemo(() => {
    const lines = getPageLines(currentPage);
    const nums = new Set<number>();
    for (const line of lines) {
      if (line.lt === 'surah_name' && line.sn) nums.add(line.sn);
      if (line.lt === 'ayah' && line.fw) {
        const w = getWord(line.fw);
        if (w) nums.add(w.s);
      }
    }
    return Array.from(nums).map(n => getSurahName(n)).filter(Boolean);
  }, [currentPage]);

  const juz = getJuzForPage(currentPage);

  // Save last read position + track worship
  useEffect(() => {
    const sn = getFirstSurahOnPage(currentPage);
    const surah = getSurahData(sn);
    AsyncStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ surah: sn, page: currentPage }));
    if (surah) {
      setLastRead({ surahNumber: surah.number, ayahNumber: 1, surahName: getSurahName(surah.number) });
    }
    // Track page read for worship stats (unique per khatma)
    if (!trackedPagesLoadedRef.current) {
      // Storage hasn't loaded yet — queue this page for later check
      if (!pendingPagesRef.current.includes(currentPage)) {
        pendingPagesRef.current.push(currentPage);
      }
    } else if (!trackedPagesRef.current.has(currentPage)) {
      trackedPagesRef.current.add(currentPage);
      addPagesRead(1).catch(() => {});
      
      // تسجيل إحصائيات القراءة في Firebase
      const sn2 = getFirstSurahOnPage(currentPage);
      trackQuranPage(sn2, getSurahName(sn2) || '').catch(() => {});
      
      // Check if khatma is complete (604 pages)
      if (trackedPagesRef.current.size >= 604) {
        // Reset for next khatma
        trackedPagesRef.current = new Set();
        AsyncStorage.setItem(TRACKED_PAGES_KEY, JSON.stringify({
          pages: [],
        })).catch(() => {});
      } else {
        // Persist tracked pages for current khatma
        AsyncStorage.setItem(TRACKED_PAGES_KEY, JSON.stringify({
          pages: Array.from(trackedPagesRef.current),
        })).catch(() => {});
      }
    }
  }, [currentPage]);

  // ── Settings modal theming: uses global app theme, NOT quran page theme ──
  const settingsIsLight = !isDarkMode;

  // ── Handlers ──

  const handlePlayPage = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { surah, ayah } = getFirstAyahOnPage(currentPage);
    playAyah(surah, ayah, true);
  }, [currentPage, playAyah]);

  const handleAyahLongPress = useCallback((surah: number, ayah: number, page: number) => {
    setSelectedAyah({ surah, ayah, page });
    setShowAyahMenu(true);
  }, []);

  const handleBookmarkAyah = useCallback(async (color: BookmarkColor) => {
    if (!selectedAyah) return;
    const surah = getSurahData(selectedAyah.surah);
    const updated = await addColoredBookmark(
      selectedAyah.surah, selectedAyah.ayah,
      getSurahName(selectedAyah.surah), selectedAyah.page, color,
    );
    setBookmarks(updated);
    setShowAyahMenu(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedAyah]);

  const handleRemoveBookmark = useCallback(async (id: string) => {
    const updated = await removeColoredBookmark(id);
    setBookmarks(updated);
  }, []);

  const handleOpenTafsir = useCallback((surah: number, ayah: number) => {
    setShowAyahMenu(false);
    router.push(`/tafsir/${surah}/${ayah}` as any);
  }, [router]);

  const handleCopyAyah = useCallback(async () => {
    if (!selectedAyah) return;
    const surah = getSurahData(selectedAyah.surah);
    const ayahData = surah?.ayahs.find(a => a.ns === selectedAyah.ayah);
    if (ayahData && surah) {
      await copyAyah(ayahData.t, getSurahName(selectedAyah.surah), selectedAyah.ayah);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowAyahMenu(false);
  }, [selectedAyah]);

  const handleShareAyah = useCallback(() => {
    if (!selectedAyah) return;
    const surah = getSurahData(selectedAyah.surah);
    const ayahData = surah?.ayahs.find(a => a.ns === selectedAyah.ayah);
    if (ayahData && surah) {
      setShareData({
        text: ayahData.t,
        title: getSurahName(selectedAyah.surah),
        reference: `${getSurahName(selectedAyah.surah)} - ${t('quran.ayah')} ${selectedAyah.ayah}`,
        surahNumber: selectedAyah.surah,
        ayahNumber: selectedAyah.ayah,
        page: ayahData.p,
      });
      setShowAyahMenu(false);
      setShowShareCard(true);
    }
  }, [selectedAyah]);

  const handleSharePage = useCallback(async () => {
    try {
      if (shareViewShotRef.current?.capture) {
        const uri = await shareViewShotRef.current.capture();
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await shareImage(uri, `${translate('quran.page')} ${currentPage} - ${getAppName()}`);
      }
    } catch (e) {
      console.error('Error sharing page:', e);
    }
  }, [currentPage]);

  const handlePlayAyah = useCallback(() => {
    if (!selectedAyah) return;
    playAyah(selectedAyah.surah, selectedAyah.ayah, true);
    setShowAyahMenu(false);
  }, [selectedAyah, playAyah]);

  // Watermark for share — rendered off-screen, never visible to user
  const shareViewShotRef = useRef<ViewShot>(null);
  const autoShareTriggeredRef = useRef(false);

  // Auto-share: when navigated with ?autoShare=true, capture and share the page after font loads
  useEffect(() => {
    if (autoShareParam !== 'true' || autoShareTriggeredRef.current) return;
    // Wait for the off-screen page font to load before capturing
    const checkAndShare = async () => {
      const page = currentPage;
      if (!isPageFontLoaded(page, forceLightText ?? isDarkMode)) {
        try { await loadPageFont(page, forceLightText ?? isDarkMode); } catch { return; }
      }
      // Small delay to ensure ViewShot has rendered the MushafPage
      setTimeout(async () => {
        autoShareTriggeredRef.current = true;
        await handleSharePage();
      }, 600);
    };
    checkAndShare();
  }, [autoShareParam, currentPage, handleSharePage, forceLightText, isDarkMode]);

  const jumpToPage = useCallback((page: number) => {
    const idx = Math.max(0, Math.min(page - 1, TOTAL_PAGES - 1));
    flatListRef.current?.scrollToIndex({ index: idx, animated: false });
    setCurrentPage(page);
  }, []);

  // Auto-sync page to audio while playing — jump to verse page when playback moves
  useEffect(() => {
    const ps = playbackState;
    if (!ps.isPlaying) return;
    if (ps.currentSurah === 0) return;
    const verseData = getVerseQcfData(ps.currentSurah, ps.currentAyah);
    if (verseData && verseData.page && verseData.page !== currentPage) {
      // animate to play position (use a small delay to avoid choppy rapid jumps)
      setTimeout(() => jumpToPage(verseData.page), 80);
    }
  }, [playbackState.currentSurah, playbackState.currentAyah, playbackState.isPlaying, currentPage, jumpToPage]);

  // ── FlatList callbacks ──

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentPage(viewableItems[0].item);
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index }),
    [],
  );

  const initialScrollIndex = Math.max(0, Math.min(initialPage - 1, TOTAL_PAGES - 1));

  const renderPage = useCallback(
    ({ item: page }: { item: number }) => (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => { if (settings.display.focusMode) setShowControls(p => !p); }}
        style={{ width: SCREEN_WIDTH, flex: 1 }}
      >
        <MushafPage
          page={page}
          themeIndex={themeIndex}
          width={SCREEN_WIDTH}
          fontSizeAdjust={fontSizeAdjust}
          forceLightText={forceLightText}
          useCdnImage={settings.display.quranUseCdnPages}
          bookmarkMap={bookmarkMap}
          playingAyahKey={playingAyahKey}
          highlightAyahKey={highlightAyahKey}
          onAyahLongPress={handleAyahLongPress}
          translationMap={showTranslation ? translationMap : undefined}
          showTranslation={showTranslation}
          translationFontSize={translationFontSize}
          translationIsRTL={translationIsRTL}
        />
      </TouchableOpacity>
    ),
    [themeIndex, fontSizeAdjust, bookmarkMap, playingAyahKey, highlightAyahKey, handleAyahLongPress, showTranslation, translationMap, translationFontSize, translationIsRTL],
  );

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════

  // Background image source
  const bgSource = QURAN_BG_IMAGES[quranBgKey] || QURAN_BG_IMAGES.quranbg1;

  // Page content (wrapped in ViewShot for sharing)
  const pageContent = (
    <ViewShot ref={pageViewShotRef} options={{ format: 'png', quality: 1 }} style={{ flex: 1 }}>
      <ImageBackground source={bgSource} style={{ flex: 1 }} resizeMode="cover">
        <View style={{ flex: 1 }}>
          {/* Mushaf pages */}
          <View style={{ flex: (showTafsirPanel && !tafsirMinimized) ? 2 : 1 }}>
            <FlatList
              ref={flatListRef}
              data={PAGES}
              renderItem={renderPage}
              keyExtractor={String}
              horizontal
              inverted
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialScrollIndex}
              getItemLayout={getItemLayout}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              windowSize={5}
              maxToRenderPerBatch={2}
              initialNumToRender={3}
              removeClippedSubviews={Platform.OS !== 'web'}
              directionalLockEnabled
              disableIntervalMomentum
            />
          </View>

          {/* ═══ TAFSIR SPLIT-SCREEN PANEL ═══ */}
          {showTafsirPanel && tafsirPanelData.length > 0 && !tafsirMinimized && (
            <View style={{
              flex: 1,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
            }}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint={isLightBg ? 'light' : 'dark'}
                style={{ flex: 1 }}
              >
                <View style={{
                  flex: 1,
                  backgroundColor: isLightBg ? 'rgba(255,255,255,0.75)' : 'rgba(28,28,30,0.75)',
                }}>
                  {/* Header — tap anywhere to minimize, close button is independent */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                    gap: 8,
                    paddingEnd: 10,
                  }}>
                    {/* Tappable left area (title + chevron) — collapses panel */}
                    <Pressable
                      onPress={() => setTafsirMinimized(true)}
                      style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}
                    >
                      <MaterialCommunityIcons name="book-open-page-variant-outline" size={18} color={goldenColor} />
                      <Text style={{ fontFamily: fontSemiBold(), fontSize: 14, color: goldenColor, flex: 1 }}>
                        {translate('home.tafsirMuyassar')}
                      </Text>
                      {/* Chevron indicator — always at this position */}
                      <MaterialCommunityIcons name="chevron-down" size={20} color={isLightBg ? '#555' : '#bbb'} />
                    </Pressable>
                    {/* Independent close — permanently disables the tafsir panel */}
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => { updateDisplay({ showTafsir: false }); setTafsirMinimized(false); }}
                      style={[s.tafsirActionBtn, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]}
                    >
                      <MaterialCommunityIcons name="close" size={16} color={isLightBg ? '#333' : '#fff'} />
                    </TouchableOpacity>
                  </View>

                  {/* Scrollable tafsir content */}
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
                    showsVerticalScrollIndicator={true}
                  >
                    {tafsirPanelData.map((item, idx) => {
                      const isPlaying = playingAyahKey === `${item.surah}:${item.ayah}`;
                      return (
                        <View
                          key={`${item.surah}:${item.ayah}`}
                          style={{
                            marginBottom: 12,
                            paddingBottom: 12,
                            borderBottomWidth: idx < tafsirPanelData.length - 1 ? StyleSheet.hairlineWidth : 0,
                            borderBottomColor: isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                            ...(isPlaying ? {
                              backgroundColor: isLightBg ? 'rgba(201,169,78,0.08)' : 'rgba(212,175,55,0.1)',
                              borderRadius: 8,
                              padding: 8,
                              marginHorizontal: -8,
                            } : {}),
                          }}
                        >
                          <Text style={{
                            fontFamily: fontBold(),
                            fontSize: 12,
                            color: goldenColor,
                            marginBottom: 4,
                          }}>
                            ﴿{item.surahName} : {item.ayah}﴾
                          </Text>
                          <Text style={{
                            fontFamily: fontRegular(),
                            fontSize: 14,
                            lineHeight: 24,
                            color: isLightBg ? '#333' : '#ddd',
                            textAlign: 'right',
                            writingDirection: 'rtl',
                          }}>
                            {item.tafsir}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              </BlurView>
            </View>
          )}
        </View>
      </ImageBackground>
    </ViewShot>
  );

  // Off-screen capture view for sharing — always rendered with watermark, never visible
  const themeBgColor = QURAN_THEMES[themeIndex]?.background ?? '#FFF8F0';
  const offScreenShareView = (
    <View
      style={{ position: 'absolute', left: -9999, top: 0, width: SCREEN_WIDTH, height: Dimensions.get('window').height }}
      pointerEvents="none"
      collapsable={false}
    >
      <ViewShot ref={shareViewShotRef} options={{ format: 'png', quality: 1 }} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: themeBgColor }} collapsable={false}>
          <ImageBackground source={bgSource} style={{ flex: 1, paddingTop: 80, paddingBottom: 80 }} resizeMode="cover">
            {/* Render current page for capture — empty bookmarkMap to remove highlights */}
            <MushafPage
              page={currentPage}
              themeIndex={themeIndex}
              width={SCREEN_WIDTH}
              fontSizeAdjust={fontSizeAdjust}
              forceLightText={forceLightText}
              useCdnImage={settings.display.quranUseCdnPages}
              bookmarkMap={{}}
              playingAyahKey={null}
              highlightAyahKey={null}
            />
            {/* Branding watermark — always present in capture */}
            <View style={s.shareWatermark} pointerEvents="none" collapsable={false}>
              <Image source={appIcon} style={s.shareWatermarkIcon} resizeMode="contain" />
            </View>
          </ImageBackground>
        </View>
      </ViewShot>
    </View>
  );

  return (
    <ImageBackground source={bgSource} style={s.container} resizeMode="cover">
      <StatusBar barStyle={isLightBg ? 'dark-content' : 'light-content'} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>

          {/* Off-screen share capture (invisible to user) */}
          {offScreenShareView}

          {/* ═══ GLASS HEADER ═══ */}
          {showControls && (
            <GlassHeader
              isLightBg={isLightBg}
              textColor={textColor}
              goldenColor={goldenColor}
              juz={juz}
              surahName={surahsOnPage?.[0] || ''}
              tafsirActive={showTafsirPanel}
              isPageFavorited={isPageFavorited}
              currentPage={currentPage}
              onTafsir={() => updateDisplay({ showTafsir: !showTafsirPanel } as any)}
              onPlay={handlePlayPage}
              onBack={() => router.back()}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleSharePage}
            />
          )}

          {/* ═══ MUSHAF PAGES ═══ */}
          <View style={{ flex: 1, overflow: 'hidden' }}>
            {pageContent}
          </View>

          {/* ═══ TARGET AYAH INDICATOR ═══ */}
          {targetAyah && highlightAyahKey && (
            <Animated.View style={{
              position: 'absolute',
              bottom: 100,
              alignSelf: 'center',
              opacity: targetIndicatorOpacity,
            }}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 80 : 50}
                tint={isLightBg ? 'light' : 'dark'}
                style={{
                  borderRadius: 20,
                  overflow: 'hidden',
                }}
              >
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: isLightBg ? 'rgba(255,255,255,0.7)' : 'rgba(30,30,32,0.7)',
                }}>
                  <MaterialCommunityIcons name="target" size={18} color={goldenColor} />
                  <Text style={{
                    fontFamily: fontSemiBold(),
                    fontSize: 14,
                    color: isLightBg ? '#1a1a2e' : '#fff',
                  }}>
                    {t('quran.ayah')} {toArabicNumber(targetAyah)}
                  </Text>
                </View>
              </BlurView>
            </Animated.View>
          )}

          {/* ═══ LONG-PRESS ONBOARDING HINT ═══ */}
          {showLongPressHint && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowLongPressHint(false)}
              style={s.longPressHint}
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint={isLightBg ? 'light' : 'dark'}
                style={s.longPressHintBlur}
              >
                <View style={[s.longPressHintInner, { backgroundColor: isLightBg ? 'rgba(255,255,255,0.85)' : 'rgba(38,38,42,0.85)' }]}>
                  <MaterialCommunityIcons name="gesture-tap-hold" size={22} color={goldenColor} />
                  <Text style={[s.longPressHintText, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>
                    {translate('quran.longPressHint')}
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          )}

          {/* ═══ MINIMIZED TAFSIR BAR ═══ */}
          {showTafsirPanel && tafsirMinimized && (
            <Pressable
              onLongPress={() => setTafsirMinimized(false)}
              onPress={() => setTafsirMinimized(false)}
              style={[s.tafsirMiniBar, { backgroundColor: isLightBg ? 'rgba(255,255,255,0.95)' : 'rgba(28,28,30,0.85)' }]}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
                {/* Close — same position as audio bar X */}
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => { updateDisplay({ showTafsir: false }); setTafsirMinimized(false); }}
                  style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(120,120,128,0.4)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialCommunityIcons name="close" size={14} color="#fff" />
                </TouchableOpacity>
                {/* Icon */}
                <MaterialCommunityIcons name="book-open-page-variant-outline" size={18} color={goldenColor} />
                {/* Title */}
                <Text style={{ color: isLightBg ? '#111' : '#fff', fontFamily: fontMedium(), fontSize: 13, flex: 1, textAlign: 'right' }} numberOfLines={1}>
                  {translate('home.tafsirMuyassar')}
                </Text>
                {/* Expand chevron */}
                <MaterialCommunityIcons name="chevron-up" size={18} color={isLightBg ? '#555' : '#bbb'} />
              </View>
            </Pressable>
          )}

          {/* ═══ AUDIO PLAYER (handled globally in _layout.tsx) ═══ */}

          {/* ══════════════════════════════════════════ */}
          {/* AYAH ACTION MENU                           */}
          {/* ══════════════════════════════════════════ */}
          <Modal visible={showAyahMenu} transparent animationType="fade" onRequestClose={() => setShowAyahMenu(false)}>
            <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setShowAyahMenu(false)}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 30 : 0}
                tint={isLightBg ? 'light' : 'dark'}
                style={s.menuBlur}
              >
                <View style={[s.menuCard, {
                  backgroundColor: isLightBg ? 'rgba(255,255,255,0.92)' : 'rgba(38,38,42,0.92)',
                  borderColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                }]}>
                  {/* Bookmark color row */}
                  <Text style={[s.menuLabel, { color: isLightBg ? '#333' : '#ccc' }]}>{translate('quran.addBookmark')}</Text>
                  <View style={s.menuColorRow}>
                    {BOOKMARK_COLOR_ORDER.map(color => {
                      const isActive = selectedAyah && bookmarkMap[`${selectedAyah.surah}:${selectedAyah.ayah}`] === color;
                      return (
                        <TouchableOpacity
                          key={color}
                          style={[s.menuColorBtn, { backgroundColor: BOOKMARK_COLORS[color], borderWidth: isActive ? 3 : 0, borderColor: '#fff' }]}
                          onPress={() => handleBookmarkAyah(color)}
                        >
                          {isActive && <MaterialCommunityIcons name="check" size={18} color="#fff" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={[s.menuDivider, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]} />

                  <TouchableOpacity
                    style={[s.menuAction, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => selectedAyah && handleOpenTafsir(selectedAyah.surah, selectedAyah.ayah)}
                  >
                    <MaterialCommunityIcons name="book-open-variant" size={20} color={goldenColor} />
                    <Text style={[s.menuActionText, { color: isLightBg ? '#1a1a2e' : '#fff', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{translate('quran.tafsir')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[s.menuAction, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={handleCopyAyah}>
                    <MaterialCommunityIcons name="content-copy" size={20} color={goldenColor} />
                    <Text style={[s.menuActionText, { color: isLightBg ? '#1a1a2e' : '#fff', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{translate('quran.copyAyah')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[s.menuAction, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={handleShareAyah}>
                    <MaterialCommunityIcons name="share-variant" size={20} color={goldenColor} />
                    <Text style={[s.menuActionText, { color: isLightBg ? '#1a1a2e' : '#fff', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{translate('quran.shareWithBranding')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[s.menuAction, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={handlePlayAyah}>
                    <MaterialCommunityIcons name="play-circle-outline" size={20} color={goldenColor} />
                    <Text style={[s.menuActionText, { color: isLightBg ? '#1a1a2e' : '#fff', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{translate('quran.playAyah')}</Text>
                  </TouchableOpacity>

                  {selectedAyah && bookmarkMap[`${selectedAyah.surah}:${selectedAyah.ayah}`] && (
                    <>
                      <View style={[s.menuDivider, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]} />
                      <TouchableOpacity
                        style={[s.menuAction, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        onPress={async () => {
                          if (!selectedAyah) return;
                          const id = `${selectedAyah.surah}_${selectedAyah.ayah}`;
                          const updated = await removeColoredBookmark(id);
                          setBookmarks(updated);
                          setShowAyahMenu(false);
                        }}
                      >
                        <MaterialCommunityIcons name="bookmark-remove" size={20} color="#FF6B6B" />
                        <Text style={[s.menuActionText, { color: '#FF6B6B', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{translate('quran.removeBookmark')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </BlurView>
            </TouchableOpacity>
          </Modal>

          {/* ══════════════════════════════════════════ */}
          {/* TAFSIR SHEET                               */}
          {/* ══════════════════════════════════════════ */}
          <Modal visible={showTafsir} animationType="slide" transparent onRequestClose={() => setShowTafsir(false)}>
            <View style={s.sheetOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { if (!tafsirLocked) setShowTafsir(false); }} />
              <View style={[s.sheetContainer, { height: '90%' }]}>
                <BlurView intensity={Platform.OS === 'ios' ? 90 : 50} tint={isLightBg ? 'light' : 'dark'} style={s.sheetBlur}>
                  <View style={[s.sheetContent, { backgroundColor: isLightBg ? 'rgba(255,255,255,0.85)' : '#212d39' }]}>
                    <View style={s.sheetHandle}>
                      <View style={[s.sheetHandleBar, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />
                    </View>

                    <View style={[s.tafsirHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[s.tafsirTitle, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>{translate('quran.tafsir')}</Text>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[s.tafsirSource, { color: goldenColor }]}>{translate('home.tafsirMuyassar')}</Text>
                      </View>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity hitSlop={10} onPress={() => { setShowTafsir(false); setTafsirMinimized(true); }} style={[s.tafsirActionBtn, { borderWidth: 1, borderColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)', backgroundColor: 'transparent' }]}>
                          <MaterialCommunityIcons name="chevron-down" size={16} color={isLightBg ? '#333' : '#fff'} />
                        </TouchableOpacity>

                        <TouchableOpacity hitSlop={12} onPress={() => { setShowTafsir(false); setTafsirMinimized(false); }} style={[s.tafsirActionBtn, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]}>
                          <MaterialCommunityIcons name="close" size={16} color={isLightBg ? '#333' : '#fff'} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}>
                      {tafsirAyah && (
                        <>
                          <View style={[s.tafsirAyahBox, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)', borderColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]}>
                            <Text style={[s.tafsirAyahText, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>
                              {tafsirAyah.text}
                              {'  '}
                              <Text style={{ color: goldenColor }}>﴿{toArabicNumber(tafsirAyah.ayah)}﴾</Text>
                            </Text>
                          </View>

                          <View style={[s.tafsirSep, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }]} />

                          <Text style={[s.tafsirText, { color: isLightBg ? '#333' : '#ddd' }]}>
                            {tafsirAyah.tafsir || translate('quran.noTafsirAvailable')}
                          </Text>

                          {tafsirAyah.translation && (
                            <>
                              <View style={[s.tafsirSep, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', marginTop: 16 }]} />
                              <Text style={{ color: goldenColor, fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 }}>{translate('quran.translation')}</Text>
                              <Text style={[s.tafsirText, { color: isLightBg ? '#444' : '#ccc', writingDirection: currentLang === 'ur' ? 'rtl' : 'ltr' }]}>
                                {tafsirAyah.translation}
                              </Text>
                            </>
                          )}
                        </>
                      )}
                    </ScrollView>
                  </View>
                </BlurView>
              </View>
            </View>
          </Modal>

          {/* ══════════════════════════════════════════ */}
          {/* SETTINGS MODAL — uses GLOBAL app theme     */}
          {/* ══════════════════════════════════════════ */}
          <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
            <View style={s.sheetOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowSettings(false)} />
              <View style={[s.sheetContainer, { height: '82%' }]}>
                <BlurView
                  intensity={Platform.OS === 'ios' ? 100 : 60}
                  tint={settingsIsLight ? 'light' : 'dark'}
                  style={s.sheetBlur}
                >
                  <View style={[s.sheetContent, {
                    backgroundColor: settingsIsLight ? 'rgba(242,242,247,0.62)' : 'rgba(18,18,22,0.55)',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: settingsIsLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)',
                  }]}>
                    <View style={s.sheetHandle}>
                      <View style={[s.sheetHandleBar, { backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />
                    </View>

                    <View style={[s.settingsHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[s.settingsTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('common.settings')}</Text>
                      <TouchableOpacity hitSlop={12} onPress={() => setShowSettings(false)}>
                        <Ionicons name="close-circle" size={24} color={settingsIsLight ? '#999' : '#666'} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>

                      {/* ─── Font Size ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: settingsIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
                        <View style={[stg.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="format-size" size={20} color={goldenColor} />
                          <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('settings.fontSize')}</Text>
                        </View>
                        <View style={[stg.fontSizeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <TouchableOpacity
                            style={[stg.fontSizeBtn, { backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)' }]}
                            onPress={() => {
                              const newVal = Math.max(-4, fontSizeAdjust - 1);
                              updateDisplay({ quranFontSizeAdjust: newVal });
                              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                          >
                            <MaterialCommunityIcons name="minus" size={22} color={settingsIsLight ? '#333' : '#ddd'} />
                          </TouchableOpacity>

                          <View style={stg.fontSizePreview}>
                            <Text style={[stg.fontSizeLabel, { color: goldenColor }]}>
                              {fontSizeAdjust === 0 ? translate('quran.defaultSize') : fontSizeAdjust > 0 ? `+${fontSizeAdjust}` : String(fontSizeAdjust)}
                            </Text>
                            <View style={stg.fontSizeDots}>
                              {[-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map(v => (
                                <View
                                  key={v}
                                  style={[
                                    stg.fontSizeDot,
                                    {
                                      backgroundColor: v === fontSizeAdjust ? goldenColor
                                        : v === 0 ? (settingsIsLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)')
                                        : (settingsIsLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
                                      width: v === fontSizeAdjust ? 8 : v === 0 ? 6 : 4,
                                      height: v === fontSizeAdjust ? 8 : v === 0 ? 6 : 4,
                                    },
                                  ]}
                                />
                              ))}
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[stg.fontSizeBtn, { backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)' }]}
                            onPress={() => {
                              const newVal = Math.min(8, fontSizeAdjust + 1);
                              updateDisplay({ quranFontSizeAdjust: newVal });
                              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                          >
                            <MaterialCommunityIcons name="plus" size={22} color={settingsIsLight ? '#333' : '#ddd'} />
                          </TouchableOpacity>
                        </View>
                        {fontSizeAdjust !== 0 && (
                          <TouchableOpacity
                            style={stg.resetBtn}
                            onPress={() => {
                              updateDisplay({ quranFontSizeAdjust: 0 });
                              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                          >
                            <Text style={[stg.resetText, { color: goldenColor }]}>{translate('common.reset')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* ─── Background Image ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: settingsIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
                        <View style={[stg.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="image-outline" size={20} color={goldenColor} />
                          <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('quran.mushafBackground')}</Text>
                        </View>
                        <View style={stg.bgGrid}>
                          {(['quranbg1', 'quranbg2', 'quranbg3', 'quranbg4'] as const).map(key => {
                            const isSelected = quranBgKey === key;
                            return (
                              <TouchableOpacity
                                key={key}
                                style={[
                                  stg.bgThumb,
                                  isSelected && { borderColor: goldenColor, borderWidth: 2.5 },
                                ]}
                                onPress={() => {
                                  updateDisplay({ quranBackground: key });
                                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                              >
                                <Image source={QURAN_BG_IMAGES[key]} style={stg.bgThumbImg} resizeMode="cover" />
                                {isSelected && (
                                  <View style={[stg.bgCheck, { backgroundColor: goldenColor }]}>
                                    <MaterialCommunityIcons name="check" size={12} color="#fff" />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* ─── Reciter ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: settingsIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
                        <View style={[stg.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="microphone-outline" size={20} color={goldenColor} />
                          <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('quran.reciterLabel')}</Text>
                        </View>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {reciters.map(r => {
                            const isActive = currentReciter === r.identifier;
                            return (
                              <TouchableOpacity
                                key={r.identifier}
                                style={[
                                  stg.reciterItem,
                                  {
                                    flexDirection: isRTL ? 'row-reverse' : 'row',
                                    backgroundColor: isActive
                                      ? (settingsIsLight ? 'rgba(201,169,78,0.12)' : 'rgba(212,175,55,0.15)')
                                      : 'transparent',
                                    borderColor: isActive ? goldenColor : 'transparent',
                                  },
                                ]}
                                onPress={() => {
                                  setReciter(r.identifier);
                                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={[stg.reciterName, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{isArabicLang ? r.name : (r.englishName || r.name)}</Text>
                                  <Text style={[stg.reciterSub, { color: settingsIsLight ? '#666' : '#aaa' }]}>{isArabicLang ? r.englishName : r.name}</Text>
                                </View>
                                {isActive && <MaterialCommunityIcons name="check-circle" size={22} color={goldenColor} />}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* ─── Show Tafsir Toggle ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: settingsIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
                        <View style={stg.toggleRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[stg.toggleLabel, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('quran.showTafsir')}</Text>
                            <Text style={[stg.toggleHint, { color: settingsIsLight ? '#888' : '#777' }]}>{translate('quran.showTafsirDesc')}</Text>
                          </View>
                          <Switch
                            value={settings.display.showTafsir ?? false}
                            onValueChange={(val) => {
                              updateDisplay({ showTafsir: val } as any);
                              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            trackColor={{ false: settingsIsLight ? '#e0e0e0' : '#444', true: goldenColor + '60' }}
                            thumbColor={(settings.display.showTafsir ?? false) ? goldenColor : (settingsIsLight ? '#fff' : '#888')}
                            ios_backgroundColor={settingsIsLight ? '#e0e0e0' : '#444'}
                          />
                        </View>
                      </View>

                      {/* ─── Focus Mode Toggle ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: settingsIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
                        <View style={stg.toggleRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[stg.toggleLabel, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('quran.focusMode')}</Text>
                            <Text style={[stg.toggleHint, { color: settingsIsLight ? '#888' : '#777' }]}>{translate('quran.focusModeDesc')}</Text>
                          </View>
                          <Switch
                            value={settings.display.focusMode ?? false}
                            onValueChange={async (val) => {
                              if (val) {
                                const seen = await AsyncStorage.getItem('@focus_mode_intro_seen');
                                if (!seen) {
                                  Alert.alert(
                                    translate('quran.focusModeAlertTitle'),
                                    translate('quran.focusModeAlertMessage'),
                                    [{ text: translate('common.done'), style: 'default' }],
                                  );
                                  await AsyncStorage.setItem('@focus_mode_intro_seen', '1');
                                }
                              }
                              updateDisplay({ focusMode: val });
                              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            trackColor={{ false: settingsIsLight ? '#e0e0e0' : '#444', true: goldenColor + '60' }}
                            thumbColor={(settings.display.focusMode ?? false) ? goldenColor : (settingsIsLight ? '#fff' : '#888')}
                            ios_backgroundColor={settingsIsLight ? '#e0e0e0' : '#444'}
                          />
                        </View>
                      </View>

                    </ScrollView>
                  </View>
                </BlurView>
              </View>
            </View>
          </Modal>

          {/* ShareableCard Modal */}
          {shareData && (
            <ShareableCard
              visible={showShareCard}
              arabicText={shareData.text}
              title={shareData.title}
              reference={shareData.reference}
              surahNumber={shareData.surahNumber}
              ayahNumber={shareData.ayahNumber}
              page={shareData.page}
              onClose={() => setShowShareCard(false)}
            />
          )}

        </SafeAreaView>
    </ImageBackground>
  );
}


// ══════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1 },

  // Bottom bar - transparent, no background shape
  bottomBar: {
    alignItems: 'center',
    paddingVertical: 2,
    marginBottom: 4,
  },
  bottomBarBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  pageIndicator: { fontSize: 16, fontFamily: 'Amiri-Bold' },

  // Share watermark (visible in captures)
  shareWatermark: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  shareWatermarkIcon: { width: 48, height: 48, borderRadius: 12, opacity: 0.7 },

  // Long-press onboarding hint
  longPressHint: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    zIndex: 20,
  },
  longPressHintBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  longPressHintInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  longPressHintText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontMedium(),
  },

  // ── Bottom Sheet ──
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheetContainer: { height: '72%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetBlur: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetContent: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 20 },
  sheetHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  sheetHandleBar: { width: 36, height: 5, borderRadius: 3 },

  // Sheet tabs
  sheetTabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(120,120,128,0.1)' },
  sheetTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  sheetSubTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  sheetTabText: { fontSize: FONT_SIZES.md, fontFamily: fontSemiBold(), fontWeight: '600' },
  tafsirActionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tafsirMiniBar: { position: 'absolute', left: Spacing.md, right: Spacing.md, bottom: 90, borderRadius: 12, overflow: 'hidden', zIndex: 80 },

  // ── Ayah Action Menu ──
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  menuBlur: { borderRadius: 22, overflow: 'hidden' },
  menuCard: {
    width: 280,
    borderRadius: 22,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 12 },
    }),
  },
  menuLabel: { fontSize: FONT_SIZES.sm, fontFamily: fontMedium(), textAlign: 'center', marginBottom: 10 },
  menuColorRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 12 },
  menuColorBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  menuDivider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  menuAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  menuActionText: { fontSize: FONT_SIZES.md, fontFamily: fontMedium(), flex: 1 },

  // ── Tafsir ──
  tafsirHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  tafsirTitle: { fontSize: FONT_SIZES.xl, fontFamily: fontBold() },
  tafsirSource: { fontSize: FONT_SIZES.sm, fontFamily: fontRegular() },
  tafsirFontBtn: { fontSize: 20, fontWeight: '700' },
  tafsirAyahBox: { borderRadius: 14, padding: 16, borderWidth: 1 },
  tafsirAyahText: { fontSize: 22, textAlign: 'center', lineHeight: 38 },
  tafsirSep: { height: 1, marginVertical: 16 },
  tafsirText: { fontSize: FONT_SIZES.lg, fontFamily: fontRegular(), lineHeight: 30, textAlign: 'right', writingDirection: 'rtl' },

  // ── Settings ──
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  settingsTitle: { fontSize: FONT_SIZES.xl, fontFamily: fontBold() },
});

// ── Settings Sheet Styles ──
const stg = StyleSheet.create({
  section: { borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: FONT_SIZES.md, fontFamily: fontBold() },

  // Font size
  fontSizeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fontSizeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fontSizePreview: { flex: 1, alignItems: 'center' },
  fontSizeLabel: { fontSize: FONT_SIZES.md, fontFamily: fontBold(), marginBottom: 6 },
  fontSizeDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fontSizeDot: { borderRadius: 4 },
  resetBtn: { alignSelf: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 4 },
  resetText: { fontSize: FONT_SIZES.sm, fontFamily: fontMedium() },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,120,128,0.1)',
  },
  toggleLabel: { fontSize: FONT_SIZES.md, fontFamily: fontSemiBold() },
  toggleHint: { fontSize: FONT_SIZES.xs, fontFamily: fontRegular(), marginTop: 2 },

  // Background grid
  bgGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  bgThumb: {
    width: 70,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(120,120,128,0.2)',
  },
  bgThumbImg: { width: '100%', height: '100%' },
  bgCheck: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Theme grid
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  themeInner: { width: 14, height: 14, borderRadius: 7 },
  themeCheck: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Reciter
  reciterItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  reciterName: { fontSize: FONT_SIZES.md, fontFamily: fontSemiBold() },
  reciterSub: { fontSize: FONT_SIZES.xs, fontFamily: fontRegular(), marginTop: 1 },
});
