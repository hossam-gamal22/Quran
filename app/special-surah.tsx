// app/special-surah.tsx
// صفحة مخصصة لقراءة السور الخاصة (الكهف، يس، الملك) بعرض مستقل

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import { isColorLight } from '@/lib/contrast-helper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';
import {
  getSurahData,
  buildPageBlocks,
  getQcfFontSize,
  type RenderBlock,
} from '@/lib/qcf-page-data';
import {
  loadPageFont,
  getPageFontFamily,
  isPageFontLoaded,
} from '@/lib/qcf-font-loader';
import {
  QURAN_THEMES,
  getGoldenColor,
  ORNAMENT_NO_TINT_INDICES,
} from '@/constants/quran-themes';
import {
  getQuranTextColor,
  getQuranBackgroundColor,
} from '@/components/ui/QuranBackgroundWrapper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const surahOrnament = require('@/assets/images/surah-ornament.png');
const basmalaImg = require('@/assets/images/basmala.png');

const stripTashkeel = (text: string): string =>
  text.replace(/[\u064B-\u065F\u0670]/g, '');

// ══════════════════════════════════════════════
// SurahBanner
// ══════════════════════════════════════════════

function SurahBanner({ surahNumber, themeIndex }: { surahNumber: number; themeIndex: number }) {
  const goldenColor = getGoldenColor(themeIndex);
  const noTint = ORNAMENT_NO_TINT_INDICES.includes(themeIndex);
  const surahData = getSurahData(surahNumber);
  const surahName = stripTashkeel(surahData?.name || `سورة ${surahNumber}`);

  return (
    <View style={bannerStyles.wrap} collapsable={false}>
      <ImageBackground
        source={surahOrnament}
        style={bannerStyles.ornament}
        resizeMode="contain"
        tintColor={noTint ? undefined : goldenColor}
      >
        <View style={bannerStyles.overlay} collapsable={false}>
          <Text
            style={[bannerStyles.surahName, { color: goldenColor }]}
            allowFontScaling={false}
          >
            {surahName}
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  wrap: { marginHorizontal: 8, marginVertical: 4, height: 54 },
  ornament: { width: '100%', height: 50, justifyContent: 'center', alignItems: 'center' },
  overlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', height: 50 },
  surahName: { fontSize: 17, fontFamily: 'Amiri-Bold', textAlign: 'center' },
});

// ══════════════════════════════════════════════
// BasmalaLine
// ══════════════════════════════════════════════

function BasmalaLine({ themeIndex }: { themeIndex: number }) {
  const goldenColor = getGoldenColor(themeIndex);
  return (
    <View style={basmalaStyles.wrap}>
      <Image source={basmalaImg} style={basmalaStyles.img} resizeMode="contain" tintColor={goldenColor} />
    </View>
  );
}

const basmalaStyles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 2, paddingHorizontal: '20%' },
  img: { width: '100%', height: 28 },
});

// ══════════════════════════════════════════════
// PageRenderer — renders a single Mushaf page
// ══════════════════════════════════════════════

interface PageRendererProps {
  page: number;
  themeIndex: number;
  width: number;
  fontSizeAdjust: number;
  forceLightText?: boolean;
}

const PageRenderer = React.memo(function PageRenderer({ page, themeIndex, width, fontSizeAdjust, forceLightText }: PageRendererProps) {
  const { isDarkMode } = useSettings();
  const [fontLoaded, setFontLoaded] = useState(isPageFontLoaded(page));
  const [fontError, setFontError] = useState(false);
  const baseTextColor = getQuranTextColor('', themeIndex);
  const isBaseColorDark = !isColorLight(baseTextColor);
  let textColor: string;
  if (forceLightText) {
    textColor = isBaseColorDark ? '#FFFFFF' : baseTextColor;
  } else {
    textColor = baseTextColor;
  }
  const goldenColor = getGoldenColor(themeIndex);

  useEffect(() => {
    if (!fontLoaded) {
      setFontError(false);
      loadPageFont(page, isDarkMode)
        .then(() => setFontLoaded(true))
        .catch(() => setFontError(true));
    }
  }, [page, fontLoaded, isDarkMode]);

  const blocks = useMemo(() => buildPageBlocks(page), [page]);
  const fontFamily = getPageFontFamily(page);

  const contentLineCount = blocks.filter(b => b.type === 'ayah' || b.type === 'basmallah').length;
  const dynamicBoost = contentLineCount <= 5 ? 3 : contentLineCount <= 7 ? 1 : 0;
  const fontSize = getQcfFontSize(page, width - 16, fontSizeAdjust + dynamicBoost);
  const lineHeight = contentLineCount >= 14
    ? fontSize * 1.55
    : contentLineCount >= 11
      ? fontSize * 1.6
      : fontSize * 1.7;
  const extraTopPadding = fontLoaded ? Math.ceil(fontSize * 0.08) : 0;

  if (!fontLoaded && !fontError) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={goldenColor} />
      </View>
    );
  }

  if (fontError) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{ color: textColor, marginBottom: 12 }}>تعذر تحميل خط الصفحة</Text>
        <TouchableOpacity
          onPress={() => { setFontError(false); setFontLoaded(false); }}
          style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: goldenColor, borderRadius: 10 }}
        >
          <Text style={{ color: '#fff' }}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ paddingVertical: 8, paddingHorizontal: 8 }}>
      {blocks.map((block, i) => {
        if (block.type === 'surah_name') {
          return <SurahBanner key={`sh-${i}`} surahNumber={block.surahNumber} themeIndex={themeIndex} />;
        }
        if (block.type === 'basmallah') {
          return <BasmalaLine key={`bsm-${i}`} themeIndex={themeIndex} />;
        }
        if (block.type === 'ayah') {
          const glyphs = block.segments.map(s => s.glyph).join('');
          return (
            <Text
              key={`line-${i}`}
              style={{
                fontFamily,
                fontSize,
                textAlign: 'center',
                lineHeight,
                writingDirection: 'rtl',
                color: textColor,
                paddingTop: extraTopPadding,
                paddingBottom: extraTopPadding > 0 ? 2 : 0,
              }}
              allowFontScaling={false}
            >
              {glyphs}
            </Text>
          );
        }
        return null;
      })}
    </View>
  );
});

// ══════════════════════════════════════════════
// SpecialSurahScreen
// ══════════════════════════════════════════════

// Background images (same as main Mushaf reader)
const QURAN_BG_IMAGES: Record<string, any> = {
  quranbg1: require('@/assets/images/quranbg1.png'),
  quranbg2: require('@/assets/images/quranbg2.png'),
  quranbg3: require('@/assets/images/quranbg3.png'),
  quranbg4: require('@/assets/images/quranbg4.png'),
};

export default function SpecialSurahScreen() {
  const { surah } = useLocalSearchParams<{ surah: string }>();
  const router = useRouter();
  const { settings, isDarkMode } = useSettings();
  const themeIndex = settings.display?.quranThemeIndex ?? 0;
  const fontSizeAdjust = settings.display?.quranFontSizeAdjust ?? 0;
  const defaultBg = isDarkMode ? 'quranbg3' : 'quranbg1';
  const quranBgKey = settings.display?.quranBackground ?? defaultBg;
  const hasDarkBackgroundImage = quranBgKey === 'quranbg3' || quranBgKey === 'quranbg4';
  const forceLightText = hasDarkBackgroundImage;
  const surahNumber = parseInt(surah || '18', 10);

  const surahData = useMemo(() => getSurahData(surahNumber), [surahNumber]);

  // Derive page range from ayah data
  const pages = useMemo(() => {
    if (!surahData || !surahData.ayahs.length) return [];
    const startPage = surahData.ayahs[0].p;
    const endPage = surahData.ayahs[surahData.ayahs.length - 1].p;
    const result: number[] = [];
    for (let p = startPage; p <= endPage; p++) {
      result.push(p);
    }
    return result;
  }, [surahData]);

  const bgColor = getQuranBackgroundColor(themeIndex);
  const baseTextColor = getQuranTextColor('', themeIndex);
  const isBaseColorDark = !isColorLight(baseTextColor);
  const textColor = forceLightText
    ? (isBaseColorDark ? '#FFFFFF' : baseTextColor)
    : baseTextColor;
  const goldenColor = getGoldenColor(themeIndex);

  const surahName = surahData ? stripTashkeel(surahData.name) : '';
  const contentWidth = SCREEN_WIDTH;
  const bgSource = QURAN_BG_IMAGES[quranBgKey] || QURAN_BG_IMAGES.quranbg1;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ImageBackground source={bgSource} style={{ flex: 1 }} resizeMode="cover">
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <MaterialCommunityIcons
                name="arrow-right"
                size={26}
                color={textColor}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
              {surahName}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {pages.map(page => (
            <PageRenderer
              key={page}
              page={page}
              themeIndex={themeIndex}
              width={contentWidth}
              fontSizeAdjust={fontSizeAdjust}
              forceLightText={forceLightText}
            />
          ))}
          {/* Bottom spacing */}
          <View style={{ height: 60 }} />
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
});
