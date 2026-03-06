/**
 * QPC V2 Mushaf Reader — quran_library V2 style
 *
 * Features:
 * - QPC V2 per-page font rendering from Tarteel CDN (monochrome, controllable color)
 * - Horizontal RTL page swiping (Medina Mushaf layout)
 * - Multi-color ayah bookmarks (yellow / red / green) with highlighting
 * - Current ayah highlighting during audio playback
 * - Bottom sheet with 3 tabs: الفواصل | البحث | الفهرس
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
  I18nManager,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useQuran } from '@/contexts/QuranContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
  getQuranTextColor,
} from '@/components/ui/QuranBackgroundWrapper';
import { isThemeLight, ORNAMENT_NO_TINT_INDICES, QURAN_THEMES, getGoldenColor } from '@/constants/quran-themes';
import { Spacing, FONT_SIZES } from '@/constants/theme';
import { APP_NAME } from '@/constants/app';

/** Build a theme-appropriate highlight bg for the target ayah */
function getTargetAyahBg(themeIndex: number): string {
  const theme = QURAN_THEMES[themeIndex] || QURAN_THEMES[0];
  const hex = theme.highlight.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.25)`;
}
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { setLastRead } from '@/lib/storage';
import { copyAyah } from '@/lib/clipboard';
import { ShareableCard } from '@/components/ui/ShareableCard';
import {
  buildPageBlocks,
  getJuzForPage,
  getFirstSurahOnPage,
  getSurahStartPage,
  getSurahData,
  getQcfFontSize,
  getPageLines,
  getWord,
  TOTAL_PAGES,
  getAllSurahs,
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
import { getDefaultTranslationForLanguage } from '@/lib/quran-api';
import tafsirData from '@/data/json/tafsir-muyassar.json';

// ══════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
const LAST_PAGE_KEY = 'quran_last_page';
const ALL_SURAHS = getAllSurahs();

const JUZ_PAGE_STARTS = [1,22,42,62,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
const JUZ_NAMES = [
  'الأول','الثاني','الثالث','الرابع','الخامس',
  'السادس','السابع','الثامن','التاسع','العاشر',
  'الحادي عشر','الثاني عشر','الثالث عشر','الرابع عشر','الخامس عشر',
  'السادس عشر','السابع عشر','الثامن عشر','التاسع عشر','العشرون',
  'الحادي والعشرون','الثاني والعشرون','الثالث والعشرون','الرابع والعشرون','الخامس والعشرون',
  'السادس والعشرون','السابع والعشرون','الثامن والعشرون','التاسع والعشرون','الثلاثون',
];

const BOOKMARK_COLOR_ORDER: BookmarkColor[] = ['yellow', 'red', 'green'];

// Playing ayah highlight — subtle golden glow
const PLAYING_AYAH_BG = 'rgba(212, 175, 55, 0.12)';

// Background images
const QURAN_BG_IMAGES: Record<string, any> = {
  quranbg1: require('@/assets/images/quranbg1.png'),
  quranbg2: require('@/assets/images/quranbg2.png'),
  quranbg3: require('@/assets/images/quranbg3.png'),
  quranbg4: require('@/assets/images/quranbg4.png'),
};


// ══════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════

const toArabicNumber = (n: number): string => {
  const d = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  return String(n).split('').map(c => d[parseInt(c)] || c).join('');
};

const stripTashkeel = (text: string): string =>
  text.replace(/[\u064B-\u065F\u0670]/g, '');

const getTafsir = (surah: number, ayah: number): string => {
  const surahEntries = (tafsirData as any)[String(surah)];
  if (!surahEntries) return '';
  const entry = surahEntries.find((a: any) => a.id === ayah);
  return entry?.text || '';
};

interface SearchResult {
  surah: number;
  surahName: string;
  ayah: number;
  page: number;
  text: string;
}

// ══════════════════════════════════════════════
// Image Assets
// ══════════════════════════════════════════════

const surahOrnament = require('@/assets/images/surah-ornament.png');
const basmalaImg = require('@/assets/images/basmala.png');
const appIcon = require('@/assets/images/App-icon.png');

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
  const surahData = getSurahData(surahNumber);
  const surahName = stripTashkeel(surahData?.name || `سورة ${surahNumber}`);

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
  const primaryColor = getQuranTextColor('', themeIndex);
  return (
    <View style={bs.basmalaWrap}>
      <Image source={basmalaImg} style={bs.basmalaImg} resizeMode="contain" tintColor={primaryColor + 'E6'} />
    </View>
  );
}

const bs = StyleSheet.create({
  wrap: { marginHorizontal: 8, marginVertical: 4, height: 54 },
  ornament: { width: '100%', height: 50, justifyContent: 'center', alignItems: 'center' },
  overlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', paddingHorizontal: 24, height: 50 },
  metaSide: { fontSize: 12, fontFamily: 'Amiri-Bold', textAlign: 'center' },
  centerCol: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  surahName: { fontSize: 14, fontFamily: 'Cairo-Bold', textAlign: 'center' as const },
  qcfSurahName: { fontSize: 28, fontFamily: 'QCFSurahNames', textAlign: 'center' as const },
  amiriSurahName: { fontSize: 17, fontFamily: 'Amiri-Bold', textAlign: 'center' as const },
  basmalaWrap: { alignItems: 'center', marginVertical: 2, paddingHorizontal: '20%' },
  basmalaImg: { width: '100%', height: 28 },
});

// ══════════════════════════════════════════════
// MushafPage — QPC V2 rendering with bookmark + audio highlighting
// ══════════════════════════════════════════════

interface MushafPageProps {
  page: number;
  themeIndex: number;
  width: number;
  fontSizeAdjust: number;
  bookmarkMap: Record<string, BookmarkColor>;
  playingAyahKey: string | null;
  highlightAyahKey: string | null;
  onAyahLongPress?: (surah: number, ayah: number, page: number) => void;
}

const MushafPage = React.memo(function MushafPage({
  page, themeIndex, width, fontSizeAdjust, bookmarkMap, playingAyahKey, highlightAyahKey, onAyahLongPress,
}: MushafPageProps) {
  const [fontLoaded, setFontLoaded] = useState(isPageFontLoaded(page));
  const textColor = getQuranTextColor('', themeIndex);
  const goldenColor = getGoldenColor(themeIndex);
  const targetAyahBg = getTargetAyahBg(themeIndex);

  useEffect(() => {
    if (!fontLoaded) {
      loadPageFont(page).then(() => setFontLoaded(true)).catch(() => {});
    }
  }, [page, fontLoaded]);

  const blocks = useMemo(() => (fontLoaded ? buildPageBlocks(page) : []), [page, fontLoaded]);
  const fontFamily = getPageFontFamily(page);

  // Dynamic font scaling: only boost very sparse pages, avoid cramping dense ones
  const contentLineCount = blocks.filter(b => b.type === 'ayah' || b.type === 'basmallah').length;
  const dynamicBoost = contentLineCount <= 5 ? 3 : contentLineCount <= 7 ? 1 : 0;
  const fontSize = getQcfFontSize(page, width - 16, fontSizeAdjust + dynamicBoost);

  // Use a tighter line height for dense pages to prevent overflow
  const lineHeight = contentLineCount >= 14
    ? fontSize * 1.55
    : contentLineCount >= 11
      ? fontSize * 1.6
      : fontSize * 1.7;

  if (!fontLoaded) {
    return (
      <View style={{ width, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={goldenColor} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 4,
      }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {blocks.map((block, i) => {
        if (block.type === 'surah_name') {
          return <SurahBanner key={`sh-${i}`} surahNumber={block.surahNumber} themeIndex={themeIndex} />;
        }
        if (block.type === 'basmallah') {
          return <BasmalaLine key={`bsm-${i}`} themeIndex={themeIndex} />;
        }

        // Group segments by ayah for bookmark/audio highlighting
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

        return (
          <Text
            key={i}
            style={{ fontFamily, fontSize, textAlign: 'center', lineHeight }}
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

              return (
                <Text
                  key={gi}
                  style={{ backgroundColor: bgColor }}
                  onLongPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onAyahLongPress?.(group.surah, group.ayah, page);
                  }}
                >
                  {group.parts.map((part, pi) => (
                    <Text
                      key={pi}
                      style={{ color: part.isEnd ? goldenColor : textColor }}
                    >
                      {part.glyph}
                    </Text>
                  ))}
                </Text>
              );
            })}
          </Text>
        );
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
  onSettings: () => void;
  onPlay: () => void;
  onIndex: () => void;
  onBack: () => void;
  onShare: () => void;
  onFavorites: () => void;
}

function GlassHeader({ isLightBg, textColor, goldenColor, juz, onSettings, onPlay, onIndex, onBack, onShare, onFavorites }: GlassHeaderProps) {
  return (
    <View style={gh.wrapper}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 60 : 40}
        tint={isLightBg ? 'light' : 'dark'}
        style={gh.blur}
      >
        <View style={gh.inner}>
          {/* Left: settings + play + share + favorites */}
          <View style={gh.left}>
            <TouchableOpacity hitSlop={8} onPress={onSettings}>
              <Ionicons name="settings-outline" size={22} color={goldenColor} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} onPress={onPlay}>
              <MaterialCommunityIcons name="play-circle-outline" size={24} color={goldenColor} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} onPress={onFavorites}>
              <MaterialCommunityIcons name="heart-outline" size={22} color={goldenColor} />
            </TouchableOpacity>
          </View>

          {/* Center: juz info */}
          <View style={gh.center}>
            <Text style={[gh.name, { color: goldenColor }]}>
              الجزء {toArabicNumber(juz)}
            </Text>
          </View>

          {/* Right: index + back */}
          <View style={gh.right}>
            <TouchableOpacity hitSlop={8} onPress={onIndex}>
              <MaterialCommunityIcons name="format-list-bulleted" size={22} color={goldenColor} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} onPress={onBack}>
              <Ionicons name="chevron-forward" size={28} color={goldenColor} />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const gh = StyleSheet.create({
  wrapper: {
    zIndex: 10,
    overflow: 'hidden',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  blur: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 90 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10, width: 70, justifyContent: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  name: { fontSize: 15, fontFamily: 'Amiri-Bold' },
});

// ══════════════════════════════════════════════
// Main Screen
// ══════════════════════════════════════════════

export default function SurahScreen() {
  const { id, ayah: targetAyahParam, page: targetPageParam } =
    useLocalSearchParams<{ id: string; ayah?: string; page?: string }>();
  const surahNumber = parseInt(id || '1');
  const targetAyah = targetAyahParam ? parseInt(targetAyahParam) : undefined;

  const router = useRouter();
  const { settings, isDarkMode, updateDisplay } = useSettings();
  const { playAyah, playbackState, togglePlayPause, reciters, currentReciter, setReciter } = useQuran();

  const themeIndex = settings.display.quranThemeIndex ?? 0;
  const fontSizeAdjust = settings.display.quranFontSizeAdjust ?? 0;
  // Intelligent default: light mode → quranbg1, dark mode → quranbg3
  const defaultBg = isDarkMode ? 'quranbg3' : 'quranbg1';
  const quranBgKey = settings.display.quranBackground ?? defaultBg;
  const isLightBg = isThemeLight(themeIndex);
  const textColor = getQuranTextColor('', themeIndex);
  const goldenColor = getGoldenColor(themeIndex);

  // Display settings for toggles
  const showTashkeel = settings.display.showTashkeel ?? true;
  const showTranslation = settings.display.showTranslation ?? false;
  const highlightTajweed = settings.display.highlightTajweed ?? false;

  const flatListRef = useRef<FlatList>(null);
  const pageViewShotRef = useRef<ViewShot>(null);

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

  // Bottom sheet
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetTab, setBottomSheetTab] = useState<'bookmarks' | 'search' | 'index'>('index');
  const [indexSubTab, setIndexSubTab] = useState<'surahs' | 'juz'>('surahs');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Ayah action menu
  const [showAyahMenu, setShowAyahMenu] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<{ surah: number; ayah: number; page: number } | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareData, setShareData] = useState<{ text: string; title: string; reference: string } | null>(null);

  // Tafsir
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsirAyah, setTafsirAyah] = useState<{ surah: number; ayah: number; surahName: string; text: string; tafsir: string; translation?: string } | null>(null);
  const currentLang = settings.language || 'ar';

  // Settings
  const [showSettings, setShowSettings] = useState(false);

  // Bookmarks: expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Record<BookmarkColor, boolean>>({ yellow: true, red: false, green: false });

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

  useEffect(() => {
    if (!highlightAyahKey) return;
    const timer = setTimeout(() => setHighlightAyahKey(null), 5000);
    return () => clearTimeout(timer);
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
          ayahs.push({ surah: seg.surah, ayah: seg.ayah, surahName: sd?.name || '', tafsir: t });
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
    ensurePagesLoaded(currentPage, 3);
  }, [currentPage]);

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
    return Array.from(nums).map(n => getSurahData(n)?.name || '').filter(Boolean);
  }, [currentPage]);

  const juz = getJuzForPage(currentPage);

  // Save last read position
  useEffect(() => {
    const sn = getFirstSurahOnPage(currentPage);
    const surah = getSurahData(sn);
    AsyncStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ surah: sn, page: currentPage }));
    if (surah) {
      setLastRead({ surahNumber: surah.number, ayahNumber: 1, surahName: surah.name });
    }
  }, [currentPage]);

  // ── Settings modal theming: uses global app theme, NOT quran page theme ──
  const settingsIsLight = !isDarkMode;

  // ── Handlers ──

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query || query.length < 2) { setSearchResults([]); return; }
    const stripped = stripTashkeel(query.trim());
    const results: SearchResult[] = [];
    for (const surah of ALL_SURAHS) {
      for (const ayah of surah.ayahs) {
        if (ayah.e.includes(stripped) || stripTashkeel(ayah.t).includes(stripped)) {
          results.push({ surah: surah.number, surahName: surah.name, ayah: ayah.ns, page: ayah.p, text: ayah.t });
          if (results.length >= 50) { setSearchResults(results); return; }
        }
      }
    }
    setSearchResults(results);
  }, []);

  const handlePlayPage = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sn = getFirstSurahOnPage(currentPage);
    playAyah(sn, 1, true);
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
      surah?.name || '', selectedAyah.page, color,
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
    const surahData = getSurahData(surah);
    const ayahData = surahData?.ayahs.find(a => a.ns === ayah);
    const tafsir = getTafsir(surah, ayah);
    setTafsirAyah({
      surah, ayah,
      surahName: surahData?.name || '',
      text: ayahData?.t || '',
      tafsir,
      translation: undefined,
    });
    setShowAyahMenu(false);
    setShowTafsir(true);

    if (currentLang !== 'ar') {
      const edition = getDefaultTranslationForLanguage(currentLang);
      fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/${edition}`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 200 && data.data?.text) {
            setTafsirAyah(prev => prev ? { ...prev, translation: data.data.text } : prev);
          }
        })
        .catch(() => {});
    }
  }, [currentLang]);

  const handleCopyAyah = useCallback(async () => {
    if (!selectedAyah) return;
    const surah = getSurahData(selectedAyah.surah);
    const ayahData = surah?.ayahs.find(a => a.ns === selectedAyah.ayah);
    if (ayahData && surah) {
      await copyAyah(ayahData.t, surah.name, selectedAyah.ayah);
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
        title: surah.name,
        reference: `سورة ${surah.name} - آية ${selectedAyah.ayah}`,
      });
      setShowAyahMenu(false);
      setShowShareCard(true);
    }
  }, [selectedAyah]);

  const handlePlayAyah = useCallback(() => {
    if (!selectedAyah) return;
    playAyah(selectedAyah.surah, selectedAyah.ayah, true);
    setShowAyahMenu(false);
  }, [selectedAyah, playAyah]);

  // Watermark for share — rendered off-screen, never visible to user
  const shareViewShotRef = useRef<ViewShot>(null);

  // Share current page as image — uses off-screen capture view
  const handleSharePage = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (shareViewShotRef.current?.capture) {
        const uri = await shareViewShotRef.current.capture();
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png' });
        }
      }
    } catch (e) {
      console.error('Share page error:', e);
    }
  }, []);

  const jumpToPage = useCallback((page: number) => {
    const idx = Math.max(0, Math.min(page - 1, TOTAL_PAGES - 1));
    flatListRef.current?.scrollToIndex({ index: idx, animated: false });
    setCurrentPage(page);
    setShowBottomSheet(false);
  }, []);

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
        onPress={() => setShowControls(p => !p)}
        style={{ width: SCREEN_WIDTH, flex: 1 }}
      >
        <MushafPage
          page={page}
          themeIndex={themeIndex}
          width={SCREEN_WIDTH}
          fontSizeAdjust={fontSizeAdjust}
          bookmarkMap={bookmarkMap}
          playingAyahKey={playingAyahKey}
          highlightAyahKey={highlightAyahKey}
          onAyahLongPress={handleAyahLongPress}
        />
      </TouchableOpacity>
    ),
    [themeIndex, fontSizeAdjust, bookmarkMap, playingAyahKey, highlightAyahKey, handleAyahLongPress],
  );

  // ── Bottom sheet helpers ──

  const bookmarksByColor = useMemo(() => {
    const grouped: Record<BookmarkColor, ColoredBookmark[]> = { yellow: [], red: [], green: [] };
    for (const b of bookmarks) grouped[b.color]?.push(b);
    return grouped;
  }, [bookmarks]);

  const toggleGroup = (color: BookmarkColor) => {
    setExpandedGroups(prev => ({ ...prev, [color]: !prev[color] }));
  };

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
          <View style={{ flex: showTafsirPanel ? 2 : 1 }}>
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
            />
          </View>

          {/* ═══ TAFSIR SPLIT-SCREEN PANEL ═══ */}
          {showTafsirPanel && tafsirPanelData.length > 0 && (
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
                  {/* Header */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: isLightBg ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                  }}>
                    <MaterialCommunityIcons name="book-open-page-variant-outline" size={18} color={goldenColor} />
                    <Text style={{
                      fontFamily: 'Cairo-SemiBold',
                      fontSize: 14,
                      color: goldenColor,
                      marginStart: 6,
                    }}>التفسير الميسّر</Text>
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
                            fontFamily: 'Cairo-Bold',
                            fontSize: 12,
                            color: goldenColor,
                            marginBottom: 4,
                          }}>
                            ﴿{item.surahName} : {item.ayah}﴾
                          </Text>
                          <Text style={{
                            fontFamily: 'Cairo',
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
          <ImageBackground source={bgSource} style={{ flex: 1 }} resizeMode="cover">
            {/* Render current page for capture */}
            <MushafPage
              page={currentPage}
              themeIndex={themeIndex}
              width={SCREEN_WIDTH}
              fontSizeAdjust={fontSizeAdjust}
              bookmarkMap={bookmarkMap}
              playingAyahKey={null}
              highlightAyahKey={null}
            />
            {/* Branding watermark — always present in capture */}
            <View style={s.shareWatermark} pointerEvents="none" collapsable={false}>
              <Image source={appIcon} style={s.shareWatermarkIcon} resizeMode="contain" />
              <Text style={[s.shareWatermarkText, { color: goldenColor }]}>{APP_NAME}</Text>
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
              onSettings={() => setShowSettings(true)}
              onPlay={handlePlayPage}
              onIndex={() => { setShowBottomSheet(true); setBottomSheetTab('index'); }}
              onBack={() => router.back()}
              onShare={handleSharePage}
              onFavorites={() => router.push('/(tabs)/favorites' as any)}
            />
          )}

          {/* ═══ MUSHAF PAGES ═══ */}
          {pageContent}

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
                    اضغط مطولاً على أي آية لفتح القائمة
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          )}

          {/* ═══ BOTTOM PAGE INDICATOR ═══ */}
          {showControls && (
            <View style={s.bottomBar}>
              <Text style={[s.pageIndicator, { color: goldenColor }]}>
                {toArabicNumber(currentPage)}
              </Text>
            </View>
          )}

          {/* ═══ AUDIO PLAYER (handled globally in _layout.tsx) ═══ */}

          {/* ══════════════════════════════════════════ */}
          {/* BOTTOM SHEET — الفواصل | البحث | الفهرس    */}
          {/* ══════════════════════════════════════════ */}
          <Modal visible={showBottomSheet} animationType="slide" transparent onRequestClose={() => setShowBottomSheet(false)}>
            <View style={s.sheetOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowBottomSheet(false)} />
              <View style={s.sheetContainer}>
                <BlurView intensity={Platform.OS === 'ios' ? 90 : 50} tint={isLightBg ? 'light' : 'dark'} style={s.sheetBlur}>
                  <View style={[s.sheetContent, { backgroundColor: isLightBg ? 'rgba(255,255,255,0.8)' : 'rgba(28,28,30,0.8)' }]}>
                    {/* Handle */}
                    <View style={s.sheetHandle}>
                      <View style={[s.sheetHandleBar, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />
                    </View>

                    {/* Tabs */}
                    <SlidingTabs
                      tabs={[
                        { key: 'bookmarks', label: 'الفواصل' },
                        { key: 'search', label: 'البحث' },
                        { key: 'index', label: 'الفهرس' },
                      ]}
                      selected={bottomSheetTab}
                      onSelect={(key) => setBottomSheetTab(key as 'bookmarks' | 'search' | 'index')}
                      activeColor={goldenColor}
                      activeTextColor="#fff"
                      inactiveTextColor={isLightBg ? '#333' : '#ccc'}
                      containerBg="rgba(120,120,128,0.1)"
                      style={{ marginHorizontal: 16, marginBottom: 10 }}
                    />

                    {/* ── TAB: الفهرس (Index) ── */}
                    {bottomSheetTab === 'index' && (
                      <View style={{ flex: 1 }}>
                        <SlidingTabs
                          tabs={[
                            { key: 'surahs', label: 'السور' },
                            { key: 'juz', label: 'الأجزاء' },
                          ]}
                          selected={indexSubTab}
                          onSelect={(key) => setIndexSubTab(key as 'surahs' | 'juz')}
                          activeColor={goldenColor}
                          activeTextColor="#fff"
                          inactiveTextColor={isLightBg ? '#333' : '#ccc'}
                          containerBg="rgba(120,120,128,0.1)"
                          tabPaddingVertical={8}
                          pillBorderRadius={10}
                          style={{ marginHorizontal: 16, marginBottom: 4 }}
                        />

                        {indexSubTab === 'surahs' ? (
                          <FlatList
                            data={ALL_SURAHS}
                            keyExtractor={item => String(item.number)}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={[s.indexItem, { backgroundColor: isLightBg ? 'rgba(0,150,136,0.06)' : 'rgba(0,150,136,0.1)' }]}
                                onPress={() => jumpToPage(getSurahStartPage(item.number))}
                              >
                                <View style={[s.indexNumBadge, { borderColor: goldenColor }]}>
                                  <Text style={[s.indexNumText, { color: goldenColor }]}>{toArabicNumber(item.number)}</Text>
                                </View>
                                <View style={s.indexInfo}>
                                  <Text style={[s.indexName, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>{item.name}</Text>
                                  <Text style={[s.indexSub, { color: isLightBg ? '#666' : '#aaa' }]}>
                                    {item.englishName}    {toArabicNumber(item.ayahs.length)} آيات
                                  </Text>
                                </View>
                                <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={isLightBg ? '#999' : '#666'} />
                              </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingBottom: 30 }}
                          />
                        ) : (
                          <FlatList
                            data={JUZ_PAGE_STARTS.map((startPage, i) => ({ number: i + 1, name: JUZ_NAMES[i], startPage }))}
                            keyExtractor={item => String(item.number)}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={[s.indexItem, { backgroundColor: isLightBg ? 'rgba(0,150,136,0.06)' : 'rgba(0,150,136,0.1)' }]}
                                onPress={() => jumpToPage(item.startPage)}
                              >
                                <View style={[s.indexNumBadge, { borderColor: goldenColor }]}>
                                  <Text style={[s.indexNumText, { color: goldenColor }]}>{toArabicNumber(item.number)}</Text>
                                </View>
                                <View style={s.indexInfo}>
                                  <Text style={[s.indexName, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>الجزء {item.name}</Text>
                                  <Text style={[s.indexSub, { color: isLightBg ? '#666' : '#aaa' }]}>
                                    صفحة {toArabicNumber(item.startPage)}
                                  </Text>
                                </View>
                                <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={isLightBg ? '#999' : '#666'} />
                              </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingBottom: 30 }}
                          />
                        )}
                      </View>
                    )}

                    {/* ── TAB: البحث (Search) ── */}
                    {bottomSheetTab === 'search' && (
                      <View style={{ flex: 1 }}>
                        <View style={[s.searchBar, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)' }]}>
                          <MaterialCommunityIcons name="magnify" size={20} color={isLightBg ? '#999' : '#777'} />
                          <TextInput
                            style={[s.searchInput, { color: isLightBg ? '#1a1a2e' : '#fff' }]}
                            placeholder="ابحث في القرآن..."
                            placeholderTextColor={isLightBg ? '#999' : '#777'}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            textAlign="right"
                            autoFocus
                          />
                          {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                              <MaterialCommunityIcons name="close-circle" size={18} color={isLightBg ? '#999' : '#777'} />
                            </TouchableOpacity>
                          )}
                        </View>

                        <FlatList
                          data={searchResults}
                          keyExtractor={(item, i) => `${item.surah}-${item.ayah}-${i}`}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[s.searchResult, { borderBottomColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]}
                              onPress={() => jumpToPage(item.page)}
                            >
                              <Text style={[s.searchAyahText, { color: isLightBg ? '#1a1a2e' : '#fff' }]} numberOfLines={3}>
                                {item.text}
                              </Text>
                              <Text style={[s.searchMeta, { color: isLightBg ? '#666' : '#aaa' }]}>
                                {item.surahName}  صفحة: {toArabicNumber(item.page)}
                              </Text>
                            </TouchableOpacity>
                          )}
                          contentContainerStyle={{ paddingBottom: 30 }}
                          ListEmptyComponent={
                            searchQuery.length >= 2 ? (
                              <Text style={[s.emptyText, { color: isLightBg ? '#999' : '#666' }]}>لا توجد نتائج</Text>
                            ) : null
                          }
                        />
                      </View>
                    )}

                    {/* ── TAB: الفواصل (Bookmarks) ── */}
                    {bottomSheetTab === 'bookmarks' && (
                      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
                        {BOOKMARK_COLOR_ORDER.map(color => {
                          const items = bookmarksByColor[color] || [];
                          const expanded = expandedGroups[color];
                          return (
                            <View key={color} style={[s.bmGroup, { borderColor: BOOKMARK_BORDER_COLORS[color], backgroundColor: BOOKMARK_BG_COLORS[color] }]}>
                              <TouchableOpacity style={s.bmGroupHeader} onPress={() => toggleGroup(color)}>
                                <MaterialCommunityIcons name="bookmark" size={24} color={BOOKMARK_COLORS[color]} />
                                <View style={{ flex: 1, marginHorizontal: 10 }}>
                                  <Text style={[s.bmGroupTitle, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>
                                    {BOOKMARK_COLOR_LABELS[color]}
                                  </Text>
                                  <Text style={[s.bmGroupCount, { color: isLightBg ? '#666' : '#aaa' }]}>
                                    عدد: {toArabicNumber(items.length)}
                                  </Text>
                                </View>
                                <MaterialCommunityIcons
                                  name={expanded ? 'chevron-up' : 'chevron-down'}
                                  size={22}
                                  color={isLightBg ? '#999' : '#666'}
                                />
                              </TouchableOpacity>

                              {expanded && items.map(bm => (
                                <TouchableOpacity
                                  key={bm.id}
                                  style={[s.bmItem, { backgroundColor: isLightBg ? 'rgba(255,255,255,0.6)' : 'rgba(40,40,44,0.5)' }]}
                                  onPress={() => jumpToPage(bm.page)}
                                >
                                  <View style={[s.bmItemIcon, { backgroundColor: BOOKMARK_BG_COLORS[color] }]}>
                                    <MaterialCommunityIcons name="bookmark" size={18} color={BOOKMARK_COLORS[color]} />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[s.bmItemName, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>{bm.surahName}</Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                      <Text style={[s.bmItemMeta, { color: isLightBg ? '#666' : '#aaa' }]}>
                                        آية {toArabicNumber(bm.ayahNumber)}
                                      </Text>
                                      <Text style={[s.bmItemMeta, { color: isLightBg ? '#666' : '#aaa' }]}>
                                        صفحة {toArabicNumber(bm.page)}
                                      </Text>
                                    </View>
                                  </View>
                                  <TouchableOpacity hitSlop={12} onPress={() => handleRemoveBookmark(bm.id)}>
                                    <MaterialCommunityIcons name="close" size={16} color={isLightBg ? '#999' : '#666'} />
                                  </TouchableOpacity>
                                  <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={isLightBg ? '#999' : '#666'} />
                                </TouchableOpacity>
                              ))}
                            </View>
                          );
                        })}

                        {bookmarks.length === 0 && (
                          <View style={s.emptyBm}>
                            <MaterialCommunityIcons name="bookmark-outline" size={48} color={isLightBg ? '#ccc' : '#555'} />
                            <Text style={[s.emptyText, { color: isLightBg ? '#999' : '#666' }]}>لا توجد فواصل بعد</Text>
                            <Text style={[s.emptyHint, { color: isLightBg ? '#bbb' : '#555' }]}>
                              اضغط مطولاً على أي آية لإضافة فاصل
                            </Text>
                          </View>
                        )}
                      </ScrollView>
                    )}
                  </View>
                </BlurView>
              </View>
            </View>
          </Modal>

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
                  <Text style={[s.menuLabel, { color: isLightBg ? '#333' : '#ccc' }]}>إضافة فاصل</Text>
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
                    style={s.menuAction}
                    onPress={() => selectedAyah && handleOpenTafsir(selectedAyah.surah, selectedAyah.ayah)}
                  >
                    <MaterialCommunityIcons name="book-open-variant" size={20} color={goldenColor} />
                    <Text style={[s.menuActionText, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>التفسير</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.menuAction} onPress={handleCopyAyah}>
                    <MaterialCommunityIcons name="content-copy" size={20} color={goldenColor} />
                    <Text style={[s.menuActionText, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>نسخ الآية</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.menuAction} onPress={handleShareAyah}>
                    <MaterialCommunityIcons name="share-variant" size={20} color={goldenColor} />
                    <Text style={[s.menuActionText, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>مشاركة بالعلامة</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.menuAction} onPress={handlePlayAyah}>
                    <MaterialCommunityIcons name="play-circle-outline" size={20} color={goldenColor} />
                    <Text style={[s.menuActionText, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>تشغيل الآية</Text>
                  </TouchableOpacity>

                  {selectedAyah && bookmarkMap[`${selectedAyah.surah}:${selectedAyah.ayah}`] && (
                    <>
                      <View style={[s.menuDivider, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }]} />
                      <TouchableOpacity
                        style={s.menuAction}
                        onPress={async () => {
                          if (!selectedAyah) return;
                          const id = `${selectedAyah.surah}_${selectedAyah.ayah}`;
                          const updated = await removeColoredBookmark(id);
                          setBookmarks(updated);
                          setShowAyahMenu(false);
                        }}
                      >
                        <MaterialCommunityIcons name="bookmark-remove" size={20} color="#FF6B6B" />
                        <Text style={[s.menuActionText, { color: '#FF6B6B' }]}>إزالة الفاصل</Text>
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
              <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowTafsir(false)} />
              <View style={[s.sheetContainer, { height: '90%' }]}>
                <BlurView intensity={Platform.OS === 'ios' ? 90 : 50} tint={isLightBg ? 'light' : 'dark'} style={s.sheetBlur}>
                  <View style={[s.sheetContent, { backgroundColor: isLightBg ? 'rgba(255,255,255,0.85)' : 'rgba(28,28,30,0.85)' }]}>
                    <View style={s.sheetHandle}>
                      <View style={[s.sheetHandleBar, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />
                    </View>

                    <View style={s.tafsirHeader}>
                      <Text style={[s.tafsirTitle, { color: isLightBg ? '#1a1a2e' : '#fff' }]}>التفسير</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="chevron-down" size={18} color={goldenColor} />
                        <Text style={[s.tafsirSource, { color: goldenColor }]}>تفسير الميسّر</Text>
                      </View>
                      <TouchableOpacity hitSlop={12} onPress={() => setShowTafsir(false)}>
                        <Ionicons name="close-circle" size={24} color={isLightBg ? '#999' : '#666'} />
                      </TouchableOpacity>
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
                            {tafsirAyah.tafsir || 'لا يوجد تفسير متاح لهذه الآية'}
                          </Text>

                          {tafsirAyah.translation && (
                            <>
                              <View style={[s.tafsirSep, { backgroundColor: isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)', marginTop: 16 }]} />
                              <Text style={{ color: goldenColor, fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 }}>الترجمة</Text>
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
                  intensity={Platform.OS === 'ios' ? 90 : 50}
                  tint={settingsIsLight ? 'light' : 'dark'}
                  style={s.sheetBlur}
                >
                  <View style={[s.sheetContent, {
                    backgroundColor: settingsIsLight ? 'rgba(245,245,247,0.92)' : 'rgba(28,28,30,0.92)',
                  }]}>
                    <View style={s.sheetHandle}>
                      <View style={[s.sheetHandleBar, { backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]} />
                    </View>

                    <View style={s.settingsHeader}>
                      <Text style={[s.settingsTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>الإعدادات</Text>
                      <TouchableOpacity hitSlop={12} onPress={() => setShowSettings(false)}>
                        <Ionicons name="close-circle" size={24} color={settingsIsLight ? '#999' : '#666'} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>

                      {/* ─── Font Size ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }]}>
                        <View style={stg.sectionHeader}>
                          <MaterialCommunityIcons name="format-size" size={20} color={goldenColor} />
                          <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>حجم الخط</Text>
                        </View>
                        <View style={stg.fontSizeRow}>
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
                              {fontSizeAdjust === 0 ? 'افتراضي' : fontSizeAdjust > 0 ? `+${fontSizeAdjust}` : String(fontSizeAdjust)}
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
                            <Text style={[stg.resetText, { color: goldenColor }]}>إعادة تعيين</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* ─── Background Image ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }]}>
                        <View style={stg.sectionHeader}>
                          <MaterialCommunityIcons name="image-outline" size={20} color={goldenColor} />
                          <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>خلفية المصحف</Text>
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
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }]}>
                        <View style={stg.sectionHeader}>
                          <MaterialCommunityIcons name="microphone-outline" size={20} color={goldenColor} />
                          <Text style={[stg.sectionTitle, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>القارئ</Text>
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
                                  <Text style={[stg.reciterName, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>{r.name}</Text>
                                  <Text style={[stg.reciterSub, { color: settingsIsLight ? '#666' : '#aaa' }]}>{r.englishName}</Text>
                                </View>
                                {isActive && <MaterialCommunityIcons name="check-circle" size={22} color={goldenColor} />}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* ─── Show Tafsir Toggle ─── */}
                      <View style={[stg.section, { backgroundColor: settingsIsLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }]}>
                        <View style={stg.toggleRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[stg.toggleLabel, { color: settingsIsLight ? '#1a1a2e' : '#fff' }]}>إظهار التفسير</Text>
                            <Text style={[stg.toggleHint, { color: settingsIsLight ? '#888' : '#777' }]}>عرض تفسير الآيات أسفل المصحف</Text>
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
    paddingVertical: 4,
    marginBottom: 16,
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
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  shareWatermarkIcon: { width: 18, height: 18, opacity: 0.5 },
  shareWatermarkText: { fontSize: 10, fontFamily: 'Cairo-Medium' },

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
    fontFamily: 'Cairo-Medium',
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
  sheetTabText: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-SemiBold', fontWeight: '600' },

  // ── Index ──
  indexItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, marginHorizontal: 16, marginBottom: 4, borderRadius: 12 },
  indexNumBadge: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  indexNumText: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-Bold' },
  indexInfo: { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  indexName: { fontSize: FONT_SIZES.lg, fontFamily: 'Cairo-SemiBold', fontWeight: '600' },
  indexSub: { fontSize: FONT_SIZES.xs, fontFamily: 'Cairo-Regular', marginTop: 2 },

  // ── Search ──
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, borderRadius: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: FONT_SIZES.md, fontFamily: 'Cairo-Regular', paddingVertical: 0 },
  searchResult: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  searchAyahText: { fontSize: FONT_SIZES.lg, fontFamily: 'UthmanicHafs', textAlign: 'right', lineHeight: 32 },
  searchMeta: { fontSize: FONT_SIZES.xs, fontFamily: 'Cairo-Regular', marginTop: 4, textAlign: 'right' },

  // ── Bookmarks ──
  bmGroup: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  bmGroupHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  bmGroupTitle: { fontSize: FONT_SIZES.lg, fontFamily: 'Cairo-Bold' },
  bmGroupCount: { fontSize: FONT_SIZES.xs, fontFamily: 'Cairo-Regular' },
  bmItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, marginHorizontal: 8, marginBottom: 8, borderRadius: 12, gap: 10 },
  bmItemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bmItemName: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-SemiBold' },
  bmItemMeta: { fontSize: FONT_SIZES.xs, fontFamily: 'Cairo-Regular', backgroundColor: 'rgba(120,120,128,0.08)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },

  emptyBm: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-Medium', textAlign: 'center', marginTop: 16 },
  emptyHint: { fontSize: FONT_SIZES.sm, fontFamily: 'Cairo-Regular', textAlign: 'center' },

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
  menuLabel: { fontSize: FONT_SIZES.sm, fontFamily: 'Cairo-Medium', textAlign: 'center', marginBottom: 10 },
  menuColorRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 12 },
  menuColorBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  menuDivider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  menuAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  menuActionText: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-Medium', flex: 1, textAlign: 'right' },

  // ── Tafsir ──
  tafsirHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  tafsirTitle: { fontSize: FONT_SIZES.xl, fontFamily: 'Cairo-Bold' },
  tafsirSource: { fontSize: FONT_SIZES.sm, fontFamily: 'Cairo-Regular' },
  tafsirFontBtn: { fontSize: 20, fontWeight: '700' },
  tafsirAyahBox: { borderRadius: 14, padding: 16, borderWidth: 1 },
  tafsirAyahText: { fontSize: 22, fontFamily: 'UthmanicHafs', textAlign: 'center', lineHeight: 38 },
  tafsirSep: { height: 1, marginVertical: 16 },
  tafsirText: { fontSize: FONT_SIZES.lg, fontFamily: 'Cairo-Regular', lineHeight: 30, textAlign: 'right' },

  // ── Settings ──
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  settingsTitle: { fontSize: FONT_SIZES.xl, fontFamily: 'Cairo-Bold' },
});

// ── Settings Sheet Styles ──
const stg = StyleSheet.create({
  section: { borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-Bold' },

  // Font size
  fontSizeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fontSizeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fontSizePreview: { flex: 1, alignItems: 'center' },
  fontSizeLabel: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-Bold', marginBottom: 6 },
  fontSizeDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fontSizeDot: { borderRadius: 4 },
  resetBtn: { alignSelf: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 4 },
  resetText: { fontSize: FONT_SIZES.sm, fontFamily: 'Cairo-Medium' },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,120,128,0.1)',
  },
  toggleLabel: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-SemiBold' },
  toggleHint: { fontSize: FONT_SIZES.xs, fontFamily: 'Cairo-Regular', marginTop: 2 },

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
  reciterName: { fontSize: FONT_SIZES.md, fontFamily: 'Cairo-SemiBold' },
  reciterSub: { fontSize: FONT_SIZES.xs, fontFamily: 'Cairo-Regular', marginTop: 1 },
});
