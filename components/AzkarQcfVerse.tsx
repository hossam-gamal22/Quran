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
import { getPageFontFamily } from '@/lib/qcf-font-loader';
import { getQuranRefs } from '@/lib/azkar-quran-refs';
import { getSurahName } from '@/lib/quran-api';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const surahOrnament = require('@/assets/images/quran/surah-ornament.png');

interface AzkarQcfVerseProps {
  azkarId: number;
  textColor?: string;
  fallbackText?: string;
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

export default function AzkarQcfVerse({ azkarId, textColor, fallbackText }: AzkarQcfVerseProps) {
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
  }, [verseDataList, darkMode, renderReady]);

  if (verseDataList.length === 0) return null;

  // Fallback: show plain Arabic with KFGQPCUthmanic if QCF fonts aren't ready
  if (!allFontsLoaded) {
    if (fallbackText) {
      return (
        <View style={styles.container}>
          <Text
            style={{
              fontFamily: 'KFGQPCUthmanic',
              fontSize: 28,
              lineHeight: 56,
              textAlign: 'center',
              color,
              writingDirection: 'rtl',
            }}
          >
            {fallbackText}
          </Text>
        </View>
      );
    }
    return null;
  }

  const hasMultipleSurahs = surahGroups.length > 1;
  const ornamentColor = darkMode ? '#C9A84C' : '#8B7332';

  return (
    <View style={styles.container}>
      {surahGroups.map((group, gi) => {
        const showBanner = hasMultipleSurahs;
        // Join all glyphs from all verses into one inline text (like the Mushaf)
        const allGlyphs = group.verses.flatMap(v => v.glyphs);
        const page = group.verses[0]?.page ?? 604;
        const fontFamily = getPageFontFamily(page, darkMode);
        const fontSize = getQcfFontSize(page, SCREEN_WIDTH - 48);
        const lineHeight = fontSize * 1.85;

        return (
          <View key={`surah-${group.surah}-${gi}`} style={showBanner ? styles.surahBlock : undefined}>
            {/* Ornamental surah banner */}
            {showBanner && (
              <View style={styles.bannerWrap}>
                <ImageBackground
                  source={surahOrnament}
                  style={styles.bannerOrnament}
                  resizeMode="contain"
                  tintColor={ornamentColor}
                >
                  <View style={styles.bannerOverlay}>
                    <Text
                      style={[styles.bannerText, { color: ornamentColor }]}
                      allowFontScaling={false}
                    >
                      {getSurahName(group.surah)}
                    </Text>
                  </View>
                </ImageBackground>
              </View>
            )}

            {/* QCF verses — all glyphs inline like MushafÂ */}
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
  bannerWrap: {
    marginHorizontal: 8,
    marginBottom: 4,
    height: 48,
    width: '100%',
  },
  bannerOrnament: {
    width: '100%',
    height: 46,
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
  bannerText: {
    fontSize: 17,
    fontFamily: 'Amiri-Bold',
    textAlign: 'center',
    lineHeight: 28,
    includeFontPadding: false,
  },
});
