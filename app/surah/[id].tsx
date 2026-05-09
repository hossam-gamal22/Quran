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
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import ViewShot from 'react-native-view-shot';
import { useQuran } from '@/contexts/QuranContext';
import { hasPerAyahSync } from '@/lib/reciters-registry';
import { useSettings } from '@/contexts/SettingsContext';
import { t as translate, getLanguage } from '@/lib/i18n';
import { useQuranTracker } from '@/contexts/WorshipContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { guardPremiumFeature } from '@/lib/premium-guard';
import {
  getQuranTextColor,
} from '@/components/ui/QuranBackgroundWrapper';
import { QURAN_THEMES, getGoldenColor, getSafeThemeIndex, getThemeCount, isThemeLight } from '@/constants/quran-themes';
import { Spacing, FONT_SIZES, DarkColors } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { getAppName } from '@/constants/app';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { useSacredContext } from '@/hooks/use-sacred-context';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';

/** Build a theme-appropriate highlight bg for the target ayah */
function getTargetAyahBg(themeIndex: number): string {
  const theme = QURAN_THEMES[themeIndex] || QURAN_THEMES[0];
  const hex = theme.highlight.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.40)`;
}
import NetInfo from '@react-native-community/netinfo';
import { setLastRead, addBookmark, removeBookmark, getBookmarks } from '@/lib/storage';
import { copyAyah } from '@/lib/clipboard';
import { isDownloaded, downloadSurah, deleteDownload } from '@/lib/audio-download-manager';
import { notifyOfflineAudio } from '@/lib/audio-player';
import { IslamicShareCard, type IslamicShareCardHandle } from '@/components/ui/IslamicShareCard';
import { playPageSound, EFFECT_SOUNDS } from '@/lib/sound-manager';
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
  ensureSharePageFontReady,
  loadColorPageFont,
  isColorPageFontLoaded,
  hasColorFontForPage,
} from '@/lib/qcf-font-loader';
import { getColorFontSource } from '@/lib/qcf-color-font-map';
import { isAllTajweedDownloaded } from '@/lib/qcf-color-font-cache';
import MushafLineSkia from '@/components/quran/MushafLineSkia';
import TajweedDownloadModal from '@/components/quran/TajweedDownloadModal';
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
import { useCelebration } from '@/contexts/CelebrationContext';

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

function SurahBanner({ surahNumber, themeIndex, isLightBg }: { surahNumber: number; themeIndex: number; isLightBg: boolean }) {
  const ornamentColor = isLightBg ? '#11171d' : getGoldenColor(themeIndex);
  const surahName = getSurahName(surahNumber);

  return (
    <View style={bs.wrap} collapsable={false}>
      <ImageBackground
        source={surahOrnament}
        style={bs.ornament}
        resizeMode="contain"
        tintColor={ornamentColor}
      >
        <View style={bs.overlay} collapsable={false}>
          <Text
            style={[bs.amiriSurahName, { color: ornamentColor }]}
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
  metaSide: { fontSize: 12, fontFamily: 'Amiri-Bold', textAlign: 'center', lineHeight: 20, includeFontPadding: false },
  centerCol: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  surahName: { fontSize: 14, fontFamily: fontBold(), textAlign: 'center' as const, lineHeight: 24, includeFontPadding: false },
  qcfSurahName: { fontSize: 28, fontFamily: 'QCFSurahNames', textAlign: 'center' as const },
  amiriSurahName: { fontSize: 17, fontFamily: 'Amiri-Bold', textAlign: 'center' as const, lineHeight: 28, includeFontPadding: false },
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
  forcePlainArabicForCapture?: boolean;
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
  page, themeIndex, width, fontSizeAdjust, forceLightText, forcePlainArabicForCapture, useCdnImage, bookmarkMap, playingAyahKey, highlightAyahKey, onAyahLongPress,
  translationMap, showTranslation, translationFontSize = 14, translationIsRTL = false,
}: MushafPageProps) {
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  // Tajweed mode: use COLRv1 colored font for this page if available.
  // RN <Text> on iOS does not rasterize COLR layers, so tajweed lines render
  // via Skia (see MushafLineSkia). Pages without a bundled color font
  // automatically fall back to tarteel rendering.
  const isTajweedMode = settings?.display?.quranReadingMode === 'tajweed' && hasColorFontForPage(page);
  // Choose CPAL palette variant from the ACTUAL background being painted,
  // not the system dark mode flag — users can pick a light/cream theme even
  // while the app is in dark mode, and vice versa. `forceLightText` (set by
  // bg images) wins; otherwise inspect the theme's own background luminance.
  const needsDarkFont = (() => {
    if (forceLightText !== undefined) return forceLightText;
    const hex = (QURAN_THEMES[themeIndex]?.background || '#FFF8F0').replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (r * 299 + g * 587 + b * 114) / 1000;
    return luminance < 128; // dark bg → need light (white-base) font
  })();
  const shouldForcePlainArabic = !!forcePlainArabicForCapture && Platform.OS === 'android';
  const [fontLoaded, setFontLoaded] = useState(
    isTajweedMode ? isColorPageFontLoaded(page) : isPageFontLoaded(page, needsDarkFont),
  );
  const [fontError, setFontError] = useState(false);
  // Safety fallback: only used for Android share-card capture (when the QCF
  // font would otherwise render as invisible PUA glyphs in viewshot). The
  // 604 QCF page fonts are bundled with the app and preloaded in background
  // at startup (see app/_layout.tsx → preloadAllPagesInBackground), so for
  // normal navigation the font is already in memory.
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
  // - Dark bg images (quranbg3, quranbg4) → white/light text (if theme color is dark)
  // - Light bg images (quranbg1, quranbg2) → black/dark text (if theme color is light)
  // - No bg image → use theme's own primary color directly (themes are pre-designed)
  let textColor: string;
  if (forceLightText === undefined) {
    // No background image override — use theme's designed color directly
    textColor = baseTextColor;
  } else if (forceLightText) {
    // Dark background image: if theme's base color is dark, override to white
    textColor = isBaseColorDark ? '#FFFFFF' : baseTextColor;
  } else {
    // Light background image: if theme's base color is light, override to black
    textColor = !isBaseColorDark ? '#000000' : baseTextColor;
  }
  const goldenColor = getGoldenColor(themeIndex);
  const targetAyahBg = getTargetAyahBg(themeIndex);
  // Plain-Arabic rendering is reserved for the Android share-card capture path
  // (forcePlainArabicForCapture). It is NOT triggered by load timeouts — the
  // QCF fonts are bundled, so we always wait for the proper font to register.
  const usePlainArabicMode = shouldForcePlainArabic || fontError;

  // Load QCF4 per-page font (use needsDarkFont based on actual background).
  // Fonts are bundled locally — no network, no timeout. Spinner shows briefly
  // (a few frames) on cold first-use; subsequent visits are instant because
  // the font registers in expo-font's global registry.
  useEffect(() => {
    if (shouldForcePlainArabic) return;
    // In Tajweed mode, MushafLineSkia loads its own font directly via useFont().
    // We still load the monochrome page font as a fallback for unsupported lines.
    const alreadyLoaded = isPageFontLoaded(page, needsDarkFont);
    if (alreadyLoaded) {
      setFontLoaded(true);
      return;
    }
    setFontLoaded(false);
    setFontError(false);
    loadPageFont(page, needsDarkFont)
      .then(() => {
        setFontLoaded(true);
      })
      .catch(() => {
        setFontError(true);
      });
  }, [page, needsDarkFont, shouldForcePlainArabic]);

  const blocks = useMemo(() => buildPageBlocks(page), [page]);
  const fontFamily = getPageFontFamily(page, needsDarkFont, isTajweedMode);

  // Page-scoped per-ayah word offset tracker for the plain-Arabic fallback.
  // Reset on every render so word indices are sequential across Mushaf lines
  // (prevents the same opening words from being re-printed on each line).
  const ayahWordOffsets = useMemo(() => new Map<string, number>(), [page, blocks, usePlainArabicMode]);
  // Reset offsets at the start of each render pass so the map state stays
  // consistent with the current blocks iteration.
  ayahWordOffsets.clear();

  // Dynamic font scaling: only boost very sparse pages, avoid cramping dense ones
  const contentLineCount = blocks.filter(b => b.type === 'ayah' || b.type === 'basmallah').length;
  const dynamicBoost = contentLineCount <= 5 ? 1.5 : contentLineCount <= 7 ? 0.5 : 0;
  const fontSize = getQcfFontSize(page, width - 32, fontSizeAdjust + dynamicBoost);

  // Use a tighter line height for dense pages to prevent overflow
  const lineHeight = contentLineCount >= 14
    ? fontSize * 1.65
    : contentLineCount >= 11
      ? fontSize * 1.75
      : fontSize * 1.9;

  // Add top/bottom padding when using QCF per-page fonts to avoid glyph clipping (letters like ك، ل، ط)
  const extraTopPadding = fontLoaded ? Math.ceil(fontSize * 0.18) : 0;

  // Font loading state — show spinner with text fallback so user always sees something
  if (!usePlainArabicMode && !fontLoaded && !fontError) {
    return (
      <View style={{ width, flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ActivityIndicator size="large" color={textColor} />
        <Text style={{ marginTop: 16, color: textColor, opacity: 0.7, fontSize: 14, textAlign: 'center' }}>
          {translate('quran.loadingPage') || translate('common.loading') || 'جاري التحميل...'}
        </Text>
      </View>
    );
  }

  // Font failed to load — retry UI
  if (!usePlainArabicMode && fontError) {
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
          return <SurahBanner key={`sh-${i}`} surahNumber={block.surahNumber} themeIndex={themeIndex} isLightBg={forceLightText === undefined ? isThemeLight(themeIndex) : !forceLightText} />;
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

          // Tajweed mode: render the line via Skia using the COLR font.
          // RN <Text> on iOS cannot rasterize COLR layers; Skia can.
          // Bookmark/playing/highlight backgrounds are not painted in this mode
          // for v1 (acceptable degradation — long-press still bookmarks).
          if (isTajweedMode && !usePlainArabicMode) {
            const colorFontSource = getColorFontSource(page, needsDarkFont);
            if (colorFontSource) {
              const lineText = ayahGroups
                .map(g => g.parts.map(p => p.glyph).join(''))
                .join('');
              const firstGroup = ayahGroups[0];
              return (
                <View key={i}>
                  <MushafLineSkia
                    text={lineText}
                    fontSource={colorFontSource}
                    fontSize={fontSize}
                    lineHeight={lineHeight}
                    width={width - 32}
                    paddingTop={extraTopPadding}
                    paddingBottom={extraTopPadding > 0 ? Math.ceil(fontSize * 0.1) : 0}
                    onLongPress={firstGroup ? () => onAyahLongPress?.(firstGroup.surah, firstGroup.ayah, page) : undefined}
                  />
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
          }

          return (
            <View key={i}>
              <Text
                style={{
                    fontFamily: !usePlainArabicMode && fontLoaded ? fontFamily : 'Amiri-Regular',
                  fontSize,
                  textAlign: 'center',
                  lineHeight,
                  letterSpacing: 0,
                  writingDirection: 'rtl',
                  paddingTop: extraTopPadding,
                  paddingBottom: extraTopPadding > 0 ? Math.ceil(fontSize * 0.1) : 0,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
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

                  // Plain-Arabic fallback (Android share-card capture only):
                  // render each glyph slot as the matching Uthmani word from
                  // quran-v4.json. The previous implementation reset
                  // `wordIndex = 0` on every Mushaf line, which caused the
                  // opening words of each ayah to be re-printed on every line
                  // that contained a fragment of that ayah (visible as
                  // duplicated text on Quran pages). We now build a
                  // page-level word offset per ayah so each word renders
                  // exactly once across the page.
                  if (ayahText && usePlainArabicMode) {
                    const wordsFromAyah = ayahText.split(/\s+/).filter(Boolean);
                    const startIdx = ayahWordOffsets.get(ayahKey) ?? 0;
                    const slice = wordsFromAyah.slice(startIdx, startIdx + group.parts.length);
                    ayahWordOffsets.set(ayahKey, startIdx + group.parts.length);
                    return (
                      <Text
                        key={gi}
                        onLongPress={() => {
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          onAyahLongPress?.(group.surah, group.ayah, page);
                        }}
                        style={bgColor ? {
                          backgroundColor: bgColor,
                          paddingHorizontal: Math.max(4, Math.round(fontSize * 0.18)),
                          paddingVertical: Math.max(1, Math.round(fontSize * 0.08)),
                          borderRadius: Math.round(fontSize * 0.22),
                        } : undefined}
                      >
                        {group.parts.map((part, pi) => {
                          const mapped = slice[pi] ?? part.glyph;
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
                      style={bgColor ? {
                        backgroundColor: bgColor,
                        paddingHorizontal: Math.max(4, Math.round(fontSize * 0.18)),
                        paddingVertical: Math.max(1, Math.round(fontSize * 0.08)),
                        borderRadius: Math.round(fontSize * 0.22),
                      } : undefined}
                    >
                      {group.parts.map((part, pi) => (
                        <Text key={pi} style={isTajweedMode ? undefined : { color: textColor }}>{part.glyph}</Text>
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

      {/* Spacer to push page number to the bottom */}
      <View style={{ flex: 1 }} />

      {/* Page number at bottom center — Mushaf style */}
      <Text
        style={{
          textAlign: 'center',
          fontSize: 16,
          color: textColor,
          fontFamily: fontSemiBold(),
          opacity: 0.6,
          marginTop: 12,
        }}
      >
        {page}
      </Text>
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
  showLockBadge: boolean;
  showDownloadButton: boolean;
  downloadState: 'idle' | 'downloading' | 'done';
  downloadProgress: number;
  onTafsir: () => void;
  onPlay: () => void;
  onBack: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  onSettings: () => void;
  onDownload: () => void;
  onDownloadLongPress: () => void;
}

function GlassHeader({ isLightBg, textColor, goldenColor, juz, surahName, tafsirActive, isPageFavorited, currentPage, showLockBadge, showDownloadButton, downloadState, downloadProgress, onTafsir, onPlay, onBack, onToggleFavorite, onShare, onSettings, onDownload, onDownloadLongPress }: GlassHeaderProps) {
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
            <View>
              <MaterialCommunityIcons name="play-circle-outline" size={24} color={goldenColor} />
              {showLockBadge && (
                <View style={gh.lockBadge}>
                  <MaterialCommunityIcons name="lock" size={9} color="#000" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          {showDownloadButton && (
            <TouchableOpacity
              hitSlop={8}
              onPress={onDownload}
              onLongPress={onDownloadLongPress}
              disabled={downloadState === 'downloading'}
            >
              {downloadState === 'downloading' ? (
                <View style={gh.downloadProgressWrap}>
                  <ActivityIndicator size="small" color={goldenColor} />
                  {downloadProgress > 0 && (
                    <Text style={[gh.downloadProgressText, { color: goldenColor }]}>
                      {Math.round(downloadProgress * 100)}%
                    </Text>
                  )}
                </View>
              ) : downloadState === 'done' ? (
                <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
              ) : (
                <MaterialCommunityIcons name="download-circle-outline" size={22} color={goldenColor} />
              )}
            </TouchableOpacity>
          )}
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
          <TouchableOpacity hitSlop={8} onPress={onSettings}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={goldenColor} />
          </TouchableOpacity>
        </View>

        {/* Center-Right: surah name + page/juz, aligned to back arrow */}
        <View style={gh.center}>
          <Text style={[gh.pageInfo, { color: goldenColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {surahName}
          </Text>
          <Text style={[gh.juzLabel, { color: goldenColor }]} numberOfLines={1}>
            الجزء {toArabicNumber(juz)}
          </Text>
        </View>

        {/* Right: back */}
        <TouchableOpacity hitSlop={8} onPress={onBack} style={gh.right}>
          <Ionicons name="chevron-forward" size={28} color={goldenColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const gh = StyleSheet.create({
  wrapper: {
    zIndex: 10,
    height: 52,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  right: { paddingLeft: 4 },
  center: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 6 },
  pageInfo: { fontSize: 15, fontFamily: 'Rubik-Bold', lineHeight: 20, includeFontPadding: false, textAlign: 'right' },
  juzLabel: { fontSize: 11, fontFamily: 'Rubik-Medium', lineHeight: 16, includeFontPadding: false, opacity: 0.75, textAlign: 'right' },
  lockBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    width: 13,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  downloadProgressText: {
    fontSize: 9,
    fontFamily: 'Rubik-SemiBold',
    includeFontPadding: false,
  },
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
  const { isPremium } = useSubscription();
  const surahColors = useColors();
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(_s, surahColors.fs);
  const stg = useScaledStyles(_stg, surahColors.fs);
  const isRTL = useIsRTL();

  // Block all ads during Quran reading
  useSacredContext('quran_reading');

  // On unmount: show an interstitial ad when user exits the Quran reader.
  // Firing is deferred a tick so the sacred context cleanup runs first
  // and the ad gate does not reject on isInSacredContext().
  useEffect(() => {
    return () => {
      if (trackedPagesRef.current.size === 0) return;
      setTimeout(() => { showInterstitial().catch(() => {}); }, 50);
    };
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // CRITICAL: All hooks MUST be called before any early returns (Rules of Hooks)
  // These hooks MUST stay above the loading check
  // ══════════════════════════════════════════════════════════════════════════
  const { playAyah, playbackState, togglePlayPause, reciters, currentReciter, setReciter } = useQuran();
  const { logoSource: appIcon } = useAppIdentity();
  const { showCelebration } = useCelebration();
  const { addPagesRead } = useQuranTracker();
  const flatListRef = useRef<FlatList>(null);
  const pageViewShotRef = useRef<ViewShot>(null);
  const trackedPagesRef = useRef<Set<number>>(new Set());
  const sessionPagesRef = useRef(0);
  const trackedPagesLoadedRef = useRef(false);
  const pendingPagesRef = useRef<number[]>([]);
  const translationCacheRef = useRef<Record<string, Record<string, string>>>({});
  const shareViewShotRef = useRef<ViewShot>(null);
  const verseShareRef = useRef<IslamicShareCardHandle>(null);
  const autoShareTriggeredRef = useRef(false);
  const targetIndicatorOpacity = useRef(new Animated.Value(targetAyah ? 1 : 0)).current;
  // waitForInteraction prevents the inverted FlatList from firing a spurious
  // onViewableItemsChanged during initial layout (which would overwrite the
  // correctly-initialized currentPage with whatever index happens to be in the
  // viewport before initialScrollIndex lands).
  // Stricter thresholds reduce false positives during fast swipes on Android
  // (where intermediate frames can briefly report wrong viewable items).
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80, minimumViewTime: 250, waitForInteraction: true }).current;

  // State declarations (must be before loading return)
  const [currentPage, setCurrentPage] = useState(() => {
    if (targetPageParam) {
      const p = parseInt(targetPageParam);
      return !isNaN(p) && p >= 1 && p <= 604 ? p : 1;
    }
    if (targetAyah) {
      const surah = getSurahData(surahNumber);
      const ayah = surah?.ayahs.find(a => a.ns === targetAyah);
      return ayah?.p || getSurahStartPage(surahNumber);
    }
    return getSurahStartPage(surahNumber);
  });
  const [showControls, setShowControls] = useState(true);
  const [bookmarks, setBookmarks] = useState<ColoredBookmark[]>([]);
  const [translationMap, setTranslationMap] = useState<Record<string, string>>({});
  const [translationFailed, setTranslationFailed] = useState(false);
  const [showAyahMenu, setShowAyahMenu] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<{ surah: number; ayah: number; page: number } | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareData, setShareData] = useState<{ text: string; title: string; reference: string; surahNumber?: number; ayahNumber?: number; page?: number; qcfGlyphs?: string[]; qcfFontFamily?: string } | null>(null);
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsirAyah] = useState<{ surah: number; ayah: number; surahName: string; text: string; tafsir: string; translation?: string } | null>(null);
  const [tafsirLocked, setTafsirLocked] = useState(false);
  const [tafsirMinimized, setTafsirMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTajweedDownload, setShowTajweedDownload] = useState(false);
  const [mushafThemeTab, setMushafThemeTab] = useState<'colors' | 'backgrounds'>('colors');
  const [showLongPressHint, setShowLongPressHint] = useState(false);
  const [isPageFavorited, setIsPageFavorited] = useState(false);
  const [highlightAyahKey, setHighlightAyahKey] = useState<string | null>(null);

  // FlatList onViewableItemsChanged callback - must be after setCurrentPage is available
  // Picks the item with the largest visible area (most reliable on inverted lists
  // where viewableItems[0] can be the partially-visible neighbor).
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (!viewableItems || viewableItems.length === 0) return;
    let best = viewableItems[0];
    for (const v of viewableItems) {
      // viewablePercent may not be present on all RN versions — fall back to isViewable
      if ((v.viewablePercent ?? (v.isViewable ? 100 : 0)) > (best.viewablePercent ?? (best.isViewable ? 100 : 0))) {
        best = v;
      }
    }
    if (best?.item && typeof best.item === 'number') {
      setCurrentPage(best.item);
    }
  }).current;

  // Backup truth source for currentPage — fires after every swipe settles.
  // Computes the page from contentOffset, immune to viewability race conditions
  // that have been observed on Android with inverted horizontal FlatLists.
  const onMomentumScrollEnd = useRef((e: any) => {
    const offsetX = e?.nativeEvent?.contentOffset?.x ?? 0;
    const idx = Math.round(offsetX / SCREEN_WIDTH);
    const page = idx + 1; // PAGES is 1..604, indexed 0..603
    if (page >= 1 && page <= TOTAL_PAGES) {
      setCurrentPage(page);
    }
  }).current;

  const themeIndex = getSafeThemeIndex(settings?.display?.quranThemeIndex ?? 0);
  const fontSizeAdjust = settings?.display?.quranFontSizeAdjust ?? 0;
  // Default to 'none' (show theme color), user can explicitly pick a bg image
  const quranBgKey = settings?.display?.quranBackground ?? 'none';
  const hasBgImage = quranBgKey && quranBgKey !== 'none' && !!QURAN_BG_IMAGES[quranBgKey];
  const hasDarkBackgroundImage = quranBgKey === 'quranbg3' || quranBgKey === 'quranbg4';
  // Determine if the effective background is light
  const isLightBg = hasBgImage
    ? !hasDarkBackgroundImage
    : (() => {
        const bg = (QURAN_THEMES[themeIndex]?.background || '#FFF8F0').replace('#', '');
        const r = parseInt(bg.substring(0, 2), 16);
        const g = parseInt(bg.substring(2, 4), 16);
        const b = parseInt(bg.substring(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 >= 128;
      })();
  const forceLightText = hasBgImage ? hasDarkBackgroundImage : undefined;
  const rawTextColor = getQuranTextColor('', themeIndex);
  const isRawColorDark = (() => {
    const hex = (rawTextColor || '#000000').replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();
  // When no bg image, use the theme's own text color directly
  const textColor = !hasBgImage
    ? rawTextColor
    : (forceLightText
        ? (isRawColorDark ? '#FFFFFF' : rawTextColor)
        : (!isRawColorDark ? '#000000' : rawTextColor));
  const goldenColor = getGoldenColor(themeIndex);

  // Display settings for toggles
  const showTashkeel = settings?.display?.showTashkeel ?? true;
  const isArabicLang = (settings?.language || 'ar') === 'ar';
  const showTranslation = isArabicLang ? (settings?.display?.showTranslation ?? false) : true;
  const translationEdition = settings?.display?.translationEdition ?? 'en.sahih';
  const translationFontSize = settings?.display?.translationFontSize ?? 14;
  const highlightTajweed = settings?.display?.highlightTajweed ?? false;

  // Translation language direction
  const translationLang = TRANSLATION_EDITIONS.find(e => e.identifier === translationEdition)?.language ?? 'en';
  const translationIsRTL = ['ar', 'ur', 'fa'].includes(translationLang);

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
          sessionPagesRef.current++;
          addPagesRead(1).catch(() => {});
          // Also track for honor board
          const sn = getFirstSurahOnPage(page);
          trackQuranPage(sn, getSurahName(sn) || '').catch(() => {});
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

  // Initial page — same source as the lazy useState initializer for currentPage
  const initialPage = useMemo(() => {
    if (targetPageParam) {
      const p = parseInt(targetPageParam);
      return isNaN(p) || p < 1 || p > 604 ? 1 : p;
    }
    if (targetAyah) {
      const surah = getSurahData(surahNumber);
      const ayah = surah?.ayahs.find(a => a.ns === targetAyah);
      return ayah?.p || getSurahStartPage(surahNumber);
    }
    return getSurahStartPage(surahNumber);
  }, [surahNumber, targetAyah, targetPageParam]);

  // ── Bookmarks map ──
  const bookmarkMap = useMemo(() => buildBookmarkMap(bookmarks), [bookmarks]);

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
        setTranslationFailed(false);
      })
      .catch(() => {
        setTranslationFailed(true);
      });
  }, [currentPage, showTranslation, translationEdition]);

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

  // Long-press onboarding tooltip — shown once on first visit
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

  // Auto-prompt the bulk Tajweed-fonts download when the user already has
  // tajweed mode enabled but the full set hasn't been downloaded yet.
  useEffect(() => {
    if (settings?.display?.quranReadingMode !== 'tajweed') return;
    let cancelled = false;
    isAllTajweedDownloaded().then((downloaded) => {
      if (!cancelled && !downloaded) {
        setShowTajweedDownload(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [settings?.display?.quranReadingMode]);

  // ── Page favorites (heart icon in header) ──
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

  // When the user deep-links to a specific ayah (e.g. from المحفوظات / آية اليوم
  // → `/surah/{n}?ayah={a}`), highlight that ayah on first render. The
  // existing fade/clear effect below removes it after ~5s.
  useEffect(() => {
    if (!targetAyah) return;
    setHighlightAyahKey(`${surahNumber}:${targetAyah}`);
  }, [targetAyah, surahNumber]);

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
  const showTafsirPanel = settings?.display?.showTafsir ?? false;
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

  // Surah names on current page — all surahs in page order (top to bottom)
  const surahsOnPage = useMemo(() => {
    const lines = getPageLines(currentPage);
    const ordered: number[] = [];
    const seen = new Set<number>();
    for (const line of lines) {
      if (line.lt === 'surah_name' && line.sn && !seen.has(line.sn)) {
        seen.add(line.sn);
        ordered.push(line.sn);
      }
      if (line.lt === 'ayah' && line.fw) {
        const w = getWord(line.fw);
        if (w && !seen.has(w.s)) {
          seen.add(w.s);
          ordered.push(w.s);
        }
      }
    }
    return ordered.map(n => getSurahName(n)).filter(Boolean);
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
      sessionPagesRef.current++;
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

  const handleBack = useCallback(() => {
    const pagesRead = sessionPagesRef.current;
    if (pagesRead > 0) {
      showCelebration({
        type: 'quran_pages',
        title: t('celebration.quranPages', { count: String(pagesRead) }),
        subtitle: t('celebration.quranSubtitle'),
        onDismiss: () => router.back(),
      });
    } else {
      router.back();
    }
  }, [showCelebration, router, t]);

  // ── Audio: offline gate + per-surah download (Premium) ──
  const currentAudioSurah = useMemo(
    () => getFirstAyahOnPage(currentPage).surah,
    [currentPage],
  );
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const offlineAlertShownRef = useRef<Set<number>>(new Set());

  // Track network connectivity (for free-user lock badge)
  useEffect(() => {
    NetInfo.fetch().then(net => setIsOffline(net?.isConnected === false)).catch(() => {});
    const unsub = NetInfo.addEventListener(net => setIsOffline(net?.isConnected === false));
    return () => unsub();
  }, []);

  // Refresh download state whenever surah or reciter changes
  useEffect(() => {
    if (!isPremium || !currentReciter) {
      setDownloadState('idle');
      setDownloadProgress(0);
      return;
    }
    let cancelled = false;
    isDownloaded(currentAudioSurah, currentReciter).then(exists => {
      if (cancelled) return;
      setDownloadState(exists ? 'done' : 'idle');
      setDownloadProgress(exists ? 1 : 0);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [currentAudioSurah, currentReciter, isPremium]);

  // One-time-per-surah offline upsell for free users
  useEffect(() => {
    if (isPremium) return;
    if (offlineAlertShownRef.current.has(currentAudioSurah)) return;
    let cancelled = false;
    NetInfo.fetch().then(net => {
      if (cancelled) return;
      if (net?.isConnected === false) {
        offlineAlertShownRef.current.add(currentAudioSurah);
        notifyOfflineAudio();
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [currentAudioSurah, isPremium]);

  const handleDownloadCurrentSurah = useCallback(async () => {
    if (!isPremium || !currentReciter || downloadState === 'downloading') return;
    if (downloadState === 'done') return;

    // Need internet to download
    const net = await NetInfo.fetch().catch(() => null);
    if (net?.isConnected === false) {
      Alert.alert('لا يوجد اتصال بالإنترنت', 'يحتاج تحميل السورة إلى اتصال بالإنترنت.');
      return;
    }

    setDownloadState('downloading');
    setDownloadProgress(0);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await downloadSurah(currentAudioSurah, currentReciter, (pct) => {
        setDownloadProgress(pct);
      });
      setDownloadState('done');
      setDownloadProgress(1);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setDownloadState('idle');
      setDownloadProgress(0);
      Alert.alert('فشل التحميل', e?.message || 'تعذّر تحميل السورة. حاول مرة أخرى.');
    }
  }, [isPremium, currentReciter, currentAudioSurah, downloadState]);

  const handleDeleteDownloadedSurah = useCallback(() => {
    if (!isPremium || !currentReciter || downloadState !== 'done') return;
    Alert.alert(
      'حذف التحميل',
      'هل تريد حذف الملف الصوتي المحمَّل لهذه السورة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDownload(currentAudioSurah, currentReciter);
              setDownloadState('idle');
              setDownloadProgress(0);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {}
          },
        },
      ],
    );
  }, [isPremium, currentReciter, currentAudioSurah, downloadState]);

  const handlePlayPage = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { surah, ayah } = getFirstAyahOnPage(currentPage);
    // Free user offline gate — proactively show upsell instead of silent failure
    if (!isPremium) {
      const net = await NetInfo.fetch().catch(() => null);
      if (net?.isConnected === false) {
        notifyOfflineAudio();
        return;
      }
    }
    playAyah(surah, ayah, true);
  }, [currentPage, playAyah, isPremium]);

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
    playPageSound('verseBookmark', EFFECT_SOUNDS.button_click).catch(() => {});
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

  const handleShareAyah = useCallback(async () => {
    if (!selectedAyah) return;
    const surah = getSurahData(selectedAyah.surah);
    const ayahData = surah?.ayahs.find(a => a.ns === selectedAyah.ayah);
    if (!ayahData || !surah) return;
    setShowAyahMenu(false);

    // Render the verse in the real QCF Mushaf font (never the Amiri fallback).
    const qcfData = getVerseQcfData(selectedAyah.surah, selectedAyah.ayah);
    const sharePage = qcfData?.page ?? ayahData.p;
    // Block until the page font is registered so the IslamicShareCard renders
    // glyphs correctly on the very first share (no flash of system font).
    await ensureSharePageFontReady(sharePage, forceLightText ?? isDarkMode);
    const qcfFontFamily = getPageFontFamily(sharePage, forceLightText ?? isDarkMode);

    setShareData({
      text: ayahData.t,
      title: getSurahName(selectedAyah.surah),
      reference: `${getSurahName(selectedAyah.surah)} - ${t('quran.ayah')} ${selectedAyah.ayah}`,
      surahNumber: selectedAyah.surah,
      ayahNumber: selectedAyah.ayah,
      page: sharePage,
      qcfGlyphs: qcfData?.glyphs,
      qcfFontFamily: qcfData?.glyphs ? qcfFontFamily : undefined,
    });
    // Use timeout to ensure shareData is set before showing picker
    setTimeout(() => verseShareRef.current?.showSizePicker(), 100);
  }, [selectedAyah, forceLightText, isDarkMode, t]);

  const handleSharePage = useCallback(async () => {
    try {
      // Block capture until the real QCF page font is registered so the
      // exported image always shows real Mushaf glyphs (never Amiri fallback).
      await ensureSharePageFontReady(currentPage, forceLightText ?? isDarkMode);
      if (shareViewShotRef.current?.capture) {
        // Small delay so the off-screen MushafPage re-renders with the now-loaded font.
        await new Promise(r => setTimeout(r, 250));
        const uri = await shareViewShotRef.current.capture();
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await shareImage(uri, `${translate('quran.page')} ${currentPage} - ${getAppName()}`);
      }
    } catch (e) {
      console.error('Error sharing page:', e);
    }
  }, [currentPage, forceLightText, isDarkMode]);

  const handlePlayAyah = useCallback(async () => {
    if (!selectedAyah) return;
    if (!isPremium) {
      const net = await NetInfo.fetch().catch(() => null);
      if (net?.isConnected === false) {
        setShowAyahMenu(false);
        notifyOfflineAudio();
        return;
      }
    }
    playAyah(selectedAyah.surah, selectedAyah.ayah, true);
    setShowAyahMenu(false);
  }, [selectedAyah, playAyah, isPremium]);

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

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index }),
    [],
  );

  const initialScrollIndex = Math.max(0, Math.min(initialPage - 1, TOTAL_PAGES - 1));

  const renderPage = useCallback(
    ({ item: page }: { item: number }) => (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => { if (settings?.display?.focusMode) setShowControls(p => !p); }}
        style={{ width: SCREEN_WIDTH, flex: 1 }}
      >
        <MushafPage
          page={page}
          themeIndex={themeIndex}
          width={SCREEN_WIDTH}
          fontSizeAdjust={fontSizeAdjust}
          forceLightText={forceLightText}
          useCdnImage={settings?.display?.quranUseCdnPages}
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
    [themeIndex, fontSizeAdjust, forceLightText, bookmarkMap, playingAyahKey, highlightAyahKey, handleAyahLongPress, showTranslation, translationMap, translationFontSize, translationIsRTL],
  );

  // ══════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════

  // Background image source
  const bgSource = hasBgImage ? QURAN_BG_IMAGES[quranBgKey] : null;
  const themeBgColor = QURAN_THEMES[themeIndex]?.background || '#FFF8F0';

  // Page content (wrapped in ViewShot for sharing)
  const pageContent = (
    <ViewShot ref={pageViewShotRef} options={{ format: 'png', quality: 1 }} style={{ flex: 1 }}>
      <ImageBackground source={hasBgImage ? bgSource : undefined} style={{ flex: 1, backgroundColor: themeBgColor }} resizeMode="cover">
        <View style={{ flex: 1 }}>
          {/* Translation unavailable banner */}
          {showTranslation && translationFailed && (
            <View style={{ backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)', paddingVertical: 6, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="wifi-off" size={14} color={isLightBg ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'} />
              <Text style={{ fontSize: 12, color: isLightBg ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)', fontFamily: fontRegular() }}>
                {t('quran.translationUnavailableOffline') || (currentLang === 'ar' ? '\u0627\u0644\u062a\u0631\u062c\u0645\u0629 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629 \u0628\u062f\u0648\u0646 \u0625\u0646\u062a\u0631\u0646\u062a' : 'Translation unavailable offline')}
              </Text>
            </View>
          )}
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
              onMomentumScrollEnd={onMomentumScrollEnd}
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
                intensity={Platform.OS === 'ios' ? 30 : 20}
                tint={(isLightBg ? 'systemThickMaterialLight' : 'systemThickMaterialDark') as any}
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
                      <Text style={{ fontFamily: fontSemiBold(), fontSize: surahColors.fs(14), color: goldenColor, flex: 1 }}>
                        {translate('home.tafsirMuyassar')}
                      </Text>
                      {/* Chevron indicator — always at this position */}
                      <MaterialCommunityIcons name="chevron-down" size={20} color={isLightBg ? '#555' : '#bbb'} />
                    </Pressable>
                    {/* Independent close — permanently disables the tafsir panel */}
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => { updateDisplay({ showTafsir: false }); setTafsirMinimized(false); }}
                      style={[s.tafsirActionBtn, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)' }]}
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
                            fontSize: surahColors.fs(12),
                            color: goldenColor,
                            marginBottom: 4,
                          }}>
                            ﴿{item.surahName} : {item.ayah}﴾
                          </Text>
                          <Text style={{
                            fontFamily: fontRegular(),
                            fontSize: surahColors.fs(14),
                            lineHeight: surahColors.fs(24),
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

  // Off-screen capture view for sharing — always rendered with watermark, never visible.
  // Layout: vertical flex column so the logo lives in a reserved footer band
  // and never overlaps the verses (the previous absolute watermark sat on top
  // of the last lines causing the apparent "duplicate verse" artifact).
  // Compute an explicit capture height that fully contains the MushafPage
  // (which uses minHeight = WINDOW_HEIGHT - 140 internally) plus the top
  // padding and the branding footer band — so no verses are clipped on
  // Android where ScrollView content is otherwise cropped at the visible
  // viewport during captureRef.
  const SHARE_TOP_PADDING = 60;
  const SHARE_FOOTER_HEIGHT = 160;
  const SHARE_PAGE_HEIGHT = Dimensions.get('window').height - 140; // matches MushafPage minHeight
  const SHARE_TOTAL_HEIGHT = SHARE_TOP_PADDING + SHARE_PAGE_HEIGHT + SHARE_FOOTER_HEIGHT;

  const offScreenShareView = (
    <View
      style={{ position: 'absolute', left: -9999, top: 0, width: SCREEN_WIDTH, height: SHARE_TOTAL_HEIGHT }}
      pointerEvents="none"
      collapsable={false}
    >
      <ViewShot ref={shareViewShotRef} options={{ format: 'png', quality: 1 }} style={{ width: SCREEN_WIDTH, height: SHARE_TOTAL_HEIGHT }}>
        <View style={{ width: SCREEN_WIDTH, height: SHARE_TOTAL_HEIGHT, backgroundColor: themeBgColor }} collapsable={false}>
          <ImageBackground source={hasBgImage ? bgSource : undefined} style={{ width: SCREEN_WIDTH, height: SHARE_TOTAL_HEIGHT, backgroundColor: themeBgColor }} resizeMode="cover">
            <View style={{ width: SCREEN_WIDTH, height: SHARE_TOP_PADDING + SHARE_PAGE_HEIGHT, paddingTop: SHARE_TOP_PADDING }} collapsable={false}>
              {/* Render current page for capture — empty bookmarkMap to remove highlights.
                  We intentionally do NOT pass forcePlainArabicForCapture so the real
                  QCF page font is used on every platform (Android included). */}
              <MushafPage
                page={currentPage}
                themeIndex={themeIndex}
                width={SCREEN_WIDTH}
                fontSizeAdjust={fontSizeAdjust}
                forceLightText={forceLightText}
                useCdnImage={settings?.display?.quranUseCdnPages}
                bookmarkMap={{}}
                playingAyahKey={null}
                highlightAyahKey={null}
              />
            </View>
            {/* Branding footer band — reserved space, no overlap with verses */}
            <View style={[s.shareFooter, { height: SHARE_FOOTER_HEIGHT }]} pointerEvents="none" collapsable={false}>
              <Image source={appIcon} style={s.shareFooterLogo} resizeMode="contain" />
            </View>
          </ImageBackground>
        </View>
      </ViewShot>
    </View>
  );

  // Early return for loading state - placed here AFTER all hooks have been called
  if (settingsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: surahColors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={surahColors.primary} />
      </View>
    );
  }

  return (
    <ImageBackground source={hasBgImage ? bgSource : undefined} style={[s.container, { backgroundColor: themeBgColor }]} resizeMode="cover">
      <StatusBar style={isLightBg ? 'dark' : 'light'} />
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
              surahName={surahsOnPage?.join(' - ') || ''}
              tafsirActive={showTafsirPanel}
              isPageFavorited={isPageFavorited}
              currentPage={currentPage}
              showLockBadge={!isPremium && isOffline}
              showDownloadButton={isPremium}
              downloadState={downloadState}
              downloadProgress={downloadProgress}
              onTafsir={() => updateDisplay({ showTafsir: !showTafsirPanel } as any)}
              onPlay={handlePlayPage}
              onBack={handleBack}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleSharePage}
              onSettings={() => setShowSettings(true)}
              onDownload={handleDownloadCurrentSurah}
              onDownloadLongPress={handleDeleteDownloadedSurah}
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
                intensity={Platform.OS === 'ios' ? 35 : 20}
                tint={(isLightBg ? 'systemThickMaterialLight' : 'systemThickMaterialDark') as any}
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
                    fontSize: surahColors.fs(14),
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
                intensity={Platform.OS === 'ios' ? 30 : 20}
                tint={(isLightBg ? 'systemThickMaterialLight' : 'systemThickMaterialDark') as any}
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
                <Text style={{ color: isLightBg ? '#111' : '#fff', fontFamily: fontMedium(), fontSize: surahColors.fs(13), flex: 1, textAlign: 'right' }} numberOfLines={1}>
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
                tint={(isLightBg ? 'systemThickMaterialLight' : 'systemThickMaterialDark') as any}
                style={s.menuBlur}
              >
                <View style={[s.menuCard, {
                  backgroundColor: isLightBg ? 'rgba(255,255,255,0.92)' : 'rgba(38,38,42,0.92)',
                  borderColor: isLightBg ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)',
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

                  <View style={[s.menuDivider, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)' }]} />

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
                      <View style={[s.menuDivider, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)' }]} />
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
                <BlurView intensity={Platform.OS === 'ios' ? 40 : 25} tint={(isLightBg ? 'systemThickMaterialLight' : 'systemThickMaterialDark') as any} style={s.sheetBlur}>
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
                        <TouchableOpacity hitSlop={10} onPress={() => { setShowTafsir(false); setTafsirMinimized(true); }} style={[s.tafsirActionBtn, { borderWidth: 1, borderColor: isLightBg ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)', backgroundColor: 'transparent' }]}>
                          <MaterialCommunityIcons name="chevron-down" size={16} color={isLightBg ? '#333' : '#fff'} />
                        </TouchableOpacity>

                        <TouchableOpacity hitSlop={12} onPress={() => { setShowTafsir(false); setTafsirMinimized(false); }} style={[s.tafsirActionBtn, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)' }]}>
                          <MaterialCommunityIcons name="close" size={16} color={isLightBg ? '#333' : '#fff'} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
                      {tafsirAyah && (
                        <>
                          <View style={[s.tafsirAyahBox, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)', borderColor: isLightBg ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.06)' }]}>
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
                              <Text style={{ color: goldenColor, fontSize: surahColors.fs(13), fontWeight: '600', marginTop: 12, marginBottom: 6 }}>{translate('quran.translation')}</Text>
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
                  intensity={Platform.OS === 'ios' ? 50 : 30}
                  tint={(settingsIsLight ? 'systemThickMaterialLight' : 'systemThickMaterialDark') as any}
                  style={s.sheetBlur}
                >
                  <View style={[s.sheetContent, {
                    backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.97)' : '#0f1a14',
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

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 16 }} showsVerticalScrollIndicator={false}>

                      {/* ─── Mushaf Theme (Segmented: Colors | Backgrounds) ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: settingsIsLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)' }]}>
                        <View style={[stg.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="palette-outline" size={20} color={goldenColor} />
                          <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('quran.mushafBackground')}</Text>
                        </View>

                        {/* Segmented Control */}
                        <View style={[stg.segmentedRow, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }]}>
                          {(['colors', 'backgrounds'] as const).map(tab => {
                            const isActive = mushafThemeTab === tab;
                            return (
                              <TouchableOpacity
                                key={tab}
                                style={[
                                  stg.segmentedTab,
                                  isActive && { backgroundColor: settingsIsLight ? '#fff' : 'rgba(255,255,255,0.18)' },
                                ]}
                                onPress={() => setMushafThemeTab(tab)}
                              >
                                <Text style={[stg.segmentedLabel, { color: isActive ? goldenColor : (settingsIsLight ? '#666' : '#aaa') }]}>
                                  {tab === 'colors' ? 'ألوان' : 'خلفيات'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Colors Tab — premium preview cards with name & icon */}
                        {mushafThemeTab === 'colors' && (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined} contentContainerStyle={{ gap: 12, paddingVertical: 8, paddingHorizontal: 16 }}>
                            {Array.from({ length: getThemeCount() }, (_, i) => {
                              const th = QURAN_THEMES[i];
                              // Defensive guard: skip entries missing required color fields
                              // so we never render an invisible (transparent) card.
                              if (!th || !th.background || !th.primary) return null;
                              const isSelected = themeIndex === i && (!quranBgKey || quranBgKey === 'none');
                              const lang = getLanguage();
                              const themeName = th.name?.[lang] || th.name?.ar || th.name?.en || '';
                              const isThemeLocked = i >= 5 && !isPremium;
                              return (
                                <TouchableOpacity
                                  key={i}
                                  onPress={() => {
                                    if (isThemeLocked) {
                                      guardPremiumFeature('exclusive_themes', router, isPremium);
                                      return;
                                    }
                                    updateDisplay({ quranThemeIndex: i, quranBackground: 'none' });
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  }}
                                  style={[
                                    stg.themePreview,
                                    {
                                      backgroundColor: th.background,
                                      borderWidth: isSelected ? 2.5 : 1,
                                      borderColor: isSelected ? goldenColor : (settingsIsLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'),
                                      opacity: isThemeLocked ? 0.65 : 1,
                                    },
                                    isRTL ? { transform: [{ scaleX: -1 }] } : undefined,
                                  ]}
                                >
                                  {th.iconUrl ? (
                                    <Image source={{ uri: th.iconUrl }} style={stg.themePreviewIcon} />
                                  ) : (
                                    <Text style={[stg.themePreviewText, { color: th.primary }]} numberOfLines={1}>
                                      بِسْمِ ٱللَّهِ
                                    </Text>
                                  )}
                                  <View style={[stg.themePreviewBar, { backgroundColor: th.secondary + '30' }]} />
                                  {isSelected && (
                                    <View style={[stg.themePreviewCheck, { backgroundColor: goldenColor }]}>
                                      <MaterialCommunityIcons name="check" size={10} color="#fff" />
                                    </View>
                                  )}
                                  {isThemeLocked && (
                                    <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 2 }}>
                                      <MaterialCommunityIcons name="lock" size={12} color="#fff" />
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        )}
                        {/* Theme name label below scroll */}
                        {mushafThemeTab === 'colors' && (() => {
                          const currentTh = QURAN_THEMES[themeIndex];
                          const lang = getLanguage();
                          const currentName = currentTh?.name?.[lang] || currentTh?.name?.ar || currentTh?.name?.en || '';
                          return currentName ? (
                            <Text style={[stg.themeNameLabel, { color: settingsIsLight ? '#555' : '#bbb' }]}>
                              {currentName}
                            </Text>
                          ) : null;
                        })()}

                        {/* Backgrounds Tab — image thumbnails + none option */}
                        {mushafThemeTab === 'backgrounds' && (
                          <View style={[stg.bgGrid, { paddingTop: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            {/* None option */}
                            <TouchableOpacity
                              style={[
                                stg.bgThumb,
                                !quranBgKey || quranBgKey === 'none'
                                  ? { borderColor: goldenColor, borderWidth: 2.5 }
                                  : {},
                              ]}
                              onPress={() => {
                                updateDisplay({ quranBackground: 'none' });
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }}
                            >
                              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: settingsIsLight ? '#f5f5f5' : '#2a2a2a' }}>
                                <MaterialCommunityIcons name="cancel" size={24} color={settingsIsLight ? '#999' : '#666'} />
                              </View>
                              {(!quranBgKey || quranBgKey === 'none') && (
                                <View style={[stg.bgCheck, { backgroundColor: goldenColor }]}>
                                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                                </View>
                              )}
                            </TouchableOpacity>
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
                        )}
                      </View>

                      {/* ─── Reading Mode (Tarteel | Tajweed) ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: settingsIsLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)' }]}>
                        <View style={[stg.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="format-color-text" size={20} color={goldenColor} />
                          <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('quran.readingMode')}</Text>
                        </View>
                        <View style={[stg.segmentedRow, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)' }]}>
                          {(['tarteel', 'tajweed'] as const).map(mode => {
                            const currentMode = settings?.display?.quranReadingMode || 'tarteel';
                            const isActive = currentMode === mode;
                            return (
                              <TouchableOpacity
                                key={mode}
                                style={[
                                  stg.segmentedTab,
                                  isActive && { backgroundColor: settingsIsLight ? '#fff' : 'rgba(255,255,255,0.18)' },
                                ]}
                                onPress={() => {
                                  if (mode === 'tajweed') {
                                    // Intercept: ensure full Tajweed font set is downloaded first.
                                    void (async () => {
                                      const downloaded = await isAllTajweedDownloaded();
                                      if (!downloaded) {
                                        setShowTajweedDownload(true);
                                        return;
                                      }
                                      updateDisplay({ quranReadingMode: mode });
                                    })();
                                  } else {
                                    updateDisplay({ quranReadingMode: mode });
                                  }
                                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                                }}
                              >
                                <Text style={[stg.segmentedLabel, { color: isActive ? goldenColor : (settingsIsLight ? '#666' : '#aaa') }]}>
                                  {mode === 'tarteel' ? translate('quran.tarteel') : translate('quran.tajweed')}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* ─── Tajweed Color Legend (only in tajweed mode) ─── */}
                      {(settings?.display?.quranReadingMode || 'tarteel') === 'tajweed' && (
                        <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: settingsIsLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)' }]}>
                          <View style={[stg.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <MaterialCommunityIcons name="palette" size={20} color={goldenColor} />
                            <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('quran.tajweedColorLegend')}</Text>
                          </View>
                          {[
                            { color: '#C62828', key: 'tajweedColorRed' as const },
                            { color: '#1565C0', key: 'tajweedColorBlue' as const },
                            { color: '#E65100', key: 'tajweedColorOrange' as const },
                            { color: '#D81B60', key: 'tajweedColorPink' as const },
                            { color: '#2E7D32', key: 'tajweedColorGreen' as const },
                          ].map(({ color, key }) => (
                            <View key={key} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, gap: 12 }}>
                              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: color, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)' }} />
                              <Text style={{ flex: 1, fontSize: 14, color: settingsIsLight ? '#1a1a2e' : '#eee', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', fontFamily: fontRegular() }}>
                                {translate(`quran.${key}`)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: settingsIsLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.08)' }]}>
                        <View style={[stg.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="format-size" size={20} color={goldenColor} />
                          <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('settings.fontSize')}</Text>
                        </View>
                        <View style={[stg.fontSizeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <TouchableOpacity
                            style={[stg.fontSizeBtn, { backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.1)' }]}
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
                            style={[stg.fontSizeBtn, { backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.1)' }]}
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

                      {/* ─── Reciter ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: settingsIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)' }]}>
                        <View style={[stg.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialCommunityIcons name="microphone-outline" size={20} color={goldenColor} />
                          <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{translate('quran.reciterLabel')}</Text>
                        </View>
                        <Text
                          style={{
                            color: settingsIsLight ? '#666' : '#aaa',
                            fontSize: 11,
                            fontFamily: 'Cairo-Regular',
                            textAlign: 'center',
                            marginBottom: 8,
                            paddingHorizontal: 8,
                          }}
                        >
                          {isArabicLang
                            ? 'هؤلاء القراء يدعمون تحديد الآية أثناء التلاوة. لمزيد من القراء انتقل إلى تبويب "استماع".'
                            : 'These reciters support per-ayah highlighting. For more reciters, see the Listen tab.'}
                        </Text>
                        {/* Note: Mushaf playback requires per-ayah sync, so only 🟢 reciters
                            are listed here. Continuous-only (🟡) reciters appear in the
                            Listen tab (recitations) where they work fully. */}
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {reciters.filter(r => hasPerAyahSync(r.identifier)).map(r => {
                            const isActive = currentReciter === r.identifier;
                            const isLoadingThis = isActive && playbackState.isLoading;
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
                                  <Text style={[stg.reciterName, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{isArabicLang ? (r.name || r.englishName) : (r.englishName || r.name)}</Text>
                                  {isLoadingThis && (
                                    <Text style={{ color: settingsIsLight ? '#888' : '#aaa', fontSize: 11, marginTop: 2, fontFamily: 'Cairo-Regular', textAlign: isRTL ? 'right' : 'left' }}>
                                      {isArabicLang ? 'جارٍ التحميل من الإنترنت…' : 'Streaming over network…'}
                                    </Text>
                                  )}
                                </View>
                                {isLoadingThis ? (
                                  <ActivityIndicator size="small" color={goldenColor} />
                                ) : isActive ? (
                                  <MaterialCommunityIcons name="check-circle" size={22} color={goldenColor} />
                                ) : null}
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
                            value={settings?.display?.showTafsir ?? false}
                            onValueChange={(val) => {
                              updateDisplay({ showTafsir: val } as any);
                              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            trackColor={{ false: settingsIsLight ? '#e0e0e0' : '#444', true: goldenColor + '60' }}
                            thumbColor={(settings?.display?.showTafsir ?? false) ? goldenColor : (settingsIsLight ? '#fff' : '#888')}
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
                            value={settings?.display?.focusMode ?? false}
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
                            thumbColor={(settings?.display?.focusMode ?? false) ? goldenColor : (settingsIsLight ? '#fff' : '#888')}
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

          {/* Tajweed first-time bulk download */}
          <TajweedDownloadModal
            visible={showTajweedDownload}
            onComplete={() => {
              setShowTajweedDownload(false);
              updateDisplay({ quranReadingMode: 'tajweed' });
            }}
            onCancel={() => {
              setShowTajweedDownload(false);
            }}
          />

          {/* Islamic Share Card */}
          {shareData && (
            <IslamicShareCard
              ref={verseShareRef}
              categoryLabel={shareData.title}
              arabicText={shareData.text}
              sourceText={shareData.reference}
              qcfGlyphs={shareData.qcfGlyphs}
              qcfFontFamily={shareData.qcfFontFamily}
            />
          )}

        </SafeAreaView>
    </ImageBackground>
  );
}


// ══════════════════════════════════════════════
// Styles
// ══════════════════════════════════════════════

const _s = StyleSheet.create({
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
  pageIndicator: { fontSize: 16, fontFamily: 'Amiri-Bold', lineHeight: 28, includeFontPadding: false },

  // Share footer band (visible in captures) — reserved bottom strip so the
  // logo never overlaps the Mushaf verses.
  shareFooter: {
    height: 160,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareFooterLogo: { width: 110, height: 110, opacity: 0.95 },

  // Legacy share watermark — kept temporarily for any external reference; unused.
  shareWatermark: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  shareWatermarkIcon: { width: 120, height: 120, borderRadius: 24, opacity: 0.95 },

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
    lineHeight: 22,
    includeFontPadding: false,
  },

  // ── Bottom Sheet ──
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheetContainer: { height: '72%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetBlur: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetContent: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 20 },
  sheetHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  sheetHandleBar: { width: 36, height: 5, borderRadius: 3 },

  // Sheet tabs
  sheetTabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
  sheetTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  sheetSubTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  sheetTabText: { fontSize: FONT_SIZES.md, fontFamily: fontSemiBold(), fontWeight: '600', lineHeight: 28, includeFontPadding: false },
  tafsirActionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tafsirMiniBar: { position: 'absolute', left: Spacing.md, right: Spacing.md, bottom: 90, borderRadius: 12, overflow: 'hidden', zIndex: 80 },

  // ── Ayah Action Menu ──
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center' },
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
  menuLabel: { fontSize: FONT_SIZES.sm, fontFamily: fontMedium(), textAlign: 'center', marginBottom: 10, lineHeight: 22, includeFontPadding: false },
  menuColorRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 12 },
  menuColorBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  menuDivider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  menuAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  menuActionText: { fontSize: FONT_SIZES.md, fontFamily: fontMedium(), flex: 1, lineHeight: 28, includeFontPadding: false },

  // ── Tafsir ──
  tafsirHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  tafsirTitle: { fontSize: FONT_SIZES.xl, fontFamily: fontBold(), lineHeight: 34, includeFontPadding: false },
  tafsirSource: { fontSize: FONT_SIZES.sm, fontFamily: fontRegular(), lineHeight: 22, includeFontPadding: false },
  tafsirFontBtn: { fontSize: 20, fontWeight: '700' },
  tafsirAyahBox: { borderRadius: 14, padding: 16, borderWidth: 1 },
  tafsirAyahText: { fontSize: 22, textAlign: 'center', lineHeight: 38 },
  tafsirSep: { height: 1, marginVertical: 16 },
  tafsirText: { fontSize: FONT_SIZES.lg, fontFamily: fontRegular(), lineHeight: 30, textAlign: 'right', writingDirection: 'rtl' },

  // ── Settings ──
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  settingsTitle: { fontSize: FONT_SIZES.xl, fontFamily: fontBold(), lineHeight: 34, includeFontPadding: false },
});

// ── Settings Sheet Styles ──
const _stg = StyleSheet.create({
  section: { borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: FONT_SIZES.md, fontFamily: fontBold(), lineHeight: 28, includeFontPadding: false },

  // Font size
  fontSizeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fontSizeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fontSizePreview: { flex: 1, alignItems: 'center' },
  fontSizeLabel: { fontSize: FONT_SIZES.md, fontFamily: fontBold(), marginBottom: 6, lineHeight: 28, includeFontPadding: false },
  fontSizeDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fontSizeDot: { borderRadius: 4 },
  resetBtn: { alignSelf: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 4 },
  resetText: { fontSize: FONT_SIZES.sm, fontFamily: fontMedium(), lineHeight: 22, includeFontPadding: false },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,120,128,0.1)',
  },
  toggleLabel: { fontSize: FONT_SIZES.md, fontFamily: fontSemiBold(), lineHeight: 28, includeFontPadding: false },
  toggleHint: { fontSize: FONT_SIZES.xs, fontFamily: fontRegular(), marginTop: 2, lineHeight: 18, includeFontPadding: false },

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

  // Theme grid — large preview rectangles
  themePreview: {
    width: 80,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  themePreviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  themePreviewText: {
    fontSize: 13,
    fontFamily: fontBold(),
    textAlign: 'center',
    lineHeight: 22,
    includeFontPadding: false,
  },
  themePreviewBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  themePreviewCheck: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeNameLabel: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fontMedium(),
    marginTop: 4,
    opacity: 0.8,
  },
  themeCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  themeInner: { width: 14, height: 14, borderRadius: 7 },
  themeCheck: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Segmented control
  segmentedRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentedLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontSemiBold(),
  },

  // Reciter
  reciterItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  reciterName: { fontSize: FONT_SIZES.md, fontFamily: fontSemiBold() },
  reciterSub: { fontSize: FONT_SIZES.xs, fontFamily: fontRegular(), marginTop: 1 },
});
