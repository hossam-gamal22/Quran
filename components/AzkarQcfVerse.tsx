/**
 * AzkarQcfVerse — Renders Quran verses using QCF4 Mushaf fonts
 * 
 * Renders each surah in its own block with ornamental banner.
 * Verses flow inline (side by side) like the real Mushaf.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ImageBackground, Dimensions, StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import { getVerseQcfData, getQcfFontSize } from '@/lib/qcf-page-data';
import { getPageFontFamily, loadPageFont } from '@/lib/qcf-font-loader';
import { getQuranRefs } from '@/lib/azkar-quran-refs';
import { getSurahName } from '@/lib/quran-api';
import { stripAzkarBrackets } from '@/lib/basmala-utils';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const surahOrnament = require('@/assets/images/quran/surah-ornament.png');

interface AzkarQcfVerseProps {
  azkarId: number;
  textColor?: string;
  fallbackText?: string;
  /** Compact mode for share images — smaller fonts & banners */
  compact?: boolean;
}

interface VerseRenderData {
  page: number;
  glyphs: string[];
  surah: number;
  ayah: number;
}

interface SurahGroup {
  surah: number;
  verses: VerseRenderData[];
}

export default function AzkarQcfVerse({ azkarId, textColor, fallbackText, compact }: AzkarQcfVerseProps) {
  const { isDarkMode } = useSettings();
  const colors = useColors();
  const color = textColor || colors.text;
  const darkMode = isDarkMode === true;

  // Allow one render-cycle for iOS CoreText to register pre-loaded fonts
  const [renderReady, setRenderReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRenderReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Actively load the QCF page fonts needed for this azkar's verses on first
  // mount. The global preloader may not have reached these pages yet (e.g. on
  // first cold launch), so without this the component would silently fall back
  // to plain Uthmanic — or render nothing if no fallbackText is provided.
  const [fontsTick, setFontsTick] = useState(0);

  // Collect all verse data for this azkar
  const verseDataList = useMemo(() => {
    const refs = getQuranRefs(azkarId);
    if (!refs) return [];

    const result: VerseRenderData[] = [];
    for (const ref of refs) {
      for (let ayah = ref.startAyah; ayah <= ref.endAyah; ayah++) {
        const qcfData = getVerseQcfData(ref.surah, ayah);
        if (qcfData) {
          result.push({
            page: qcfData.page,
            glyphs: qcfData.glyphs,
            surah: ref.surah,
            ayah,
          });
        }
      }
    }
    return result;
  }, [azkarId]);

  // Group verses by surah
  const surahGroups = useMemo((): SurahGroup[] => {
    const groups: SurahGroup[] = [];
    let current: SurahGroup | null = null;
    for (const verse of verseDataList) {
      if (!current || current.surah !== verse.surah) {
        current = { surah: verse.surah, verses: [] };
        groups.push(current);
      }
      current.verses.push(verse);
    }
    return groups;
  }, [verseDataList]);

  // Check if all needed QCF fonts are loaded (pre-loaded at startup)
  const allFontsLoaded = useMemo(() => {
    if (!renderReady) return false;
    const pages = new Set(verseDataList.map(v => v.page));
    return [...pages].every(page => Font.isLoaded(getPageFontFamily(page, darkMode)));
    // fontsTick included so we re-evaluate after on-demand loads complete
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseDataList, darkMode, renderReady, fontsTick]);

  // Trigger on-demand load for any missing pages and bump fontsTick when done.
  useEffect(() => {
    if (verseDataList.length === 0) return;
    const pages = [...new Set(verseDataList.map(v => v.page))];
    const missing = pages.filter(p => !Font.isLoaded(getPageFontFamily(p, darkMode)));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(p => loadPageFont(p, darkMode).catch(() => null))).then(() => {
      if (!cancelled) setFontsTick(t => t + 1);
    });
    return () => { cancelled = true; };
  }, [verseDataList, darkMode]);

  if (verseDataList.length === 0) return null;

  // While QCF fonts load, render nothing — avoids any flash of plain text or
  // empty placeholder. The card background remains; once fonts are ready the
  // Mushaf glyphs appear in place.
  if (!allFontsLoaded) return null;

  const hasMultipleSurahs = surahGroups.length > 1;
  const ornamentColor = compact ? '#8B7332' : (darkMode ? '#C9A84C' : '#8B7332');

  return (
    <View style={styles.container}>
      {surahGroups.map((group, gi) => {
        const showBanner = hasMultipleSurahs;
        // Join all glyphs from all verses into one inline text (like the Mushaf)
        const allGlyphs = group.verses.flatMap(v => v.glyphs);
        const page = group.verses[0]?.page ?? 604;
        const fontFamily = getPageFontFamily(page, darkMode);
        const fontSize = compact ? 12 : getQcfFontSize(page, SCREEN_WIDTH - 48);
        const lineHeight = fontSize * 1.85;

        return (
          <View key={`surah-${group.surah}-${gi}`} style={showBanner ? (compact ? styles.surahBlockCompact : styles.surahBlock) : undefined}>
            {/* Ornamental surah banner */}
            {showBanner && (
              <View style={compact ? styles.bannerWrapCompact : styles.bannerWrap}>
                <ImageBackground
                  source={surahOrnament}
                  style={compact ? styles.bannerOrnamentCompact : styles.bannerOrnament}
                  resizeMode="contain"
                  tintColor={ornamentColor}
                >
                  <View style={compact ? styles.bannerOverlayCompact : styles.bannerOverlay}>
                    <Text
                      style={[compact ? styles.bannerTextCompact : styles.bannerText, { color: ornamentColor }]}
                      allowFontScaling={false}
                      numberOfLines={1}
                      adjustsFontSizeToFit={compact}
                    >
                      {getSurahName(group.surah)}
                    </Text>
                  </View>
                </ImageBackground>
              </View>
            )}

            {/* QCF verses — all glyphs inline like Mushaf */}
            <Text
              allowFontScaling={false}
              style={{
                fontFamily,
                fontSize,
                textAlign: 'center',
                lineHeight,
                color,
                writingDirection: 'rtl',
                letterSpacing: 0,
              }}
            >
              {allGlyphs.join('')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
    width: '100%',
  },
  surahBlock: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  surahBlockCompact: {
    alignItems: 'center',
    marginBottom: 4,
    width: '100%',
  },
  bannerWrap: {
    marginHorizontal: 8,
    marginBottom: 4,
    height: 48,
    width: '100%',
  },
  bannerWrapCompact: {
    alignSelf: 'stretch' as const,
    marginHorizontal: 8,
    marginBottom: 2,
    height: 34,
  },
  bannerOrnament: {
    width: '100%',
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOrnamentCompact: {
    width: '100%',
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 46,
  },
  bannerOverlayCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 32,
  },
  bannerText: {
    fontSize: 17,
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    lineHeight: 28,
    includeFontPadding: false,
  },
  bannerTextCompact: {
    fontSize: 13,
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    lineHeight: 20,
    includeFontPadding: false,
  },
});
