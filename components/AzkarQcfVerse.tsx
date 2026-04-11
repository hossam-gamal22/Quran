/**
 * AzkarQcfVerse — Renders Quran verses using QCF4 Mushaf fonts
 * 
 * Used inside azkar category pages to render Quran text with authentic
 * Mushaf typography instead of plain Arabic.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Dimensions, ActivityIndicator, StyleSheet } from 'react-native';
import { getVerseQcfData, getQcfFontSize } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily, isPageFontLoaded } from '@/lib/qcf-font-loader';
import { getQuranRefs, type QuranRef } from '@/lib/azkar-quran-refs';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AzkarQcfVerseProps {
  azkarId: number;
  textColor?: string;
}

interface VerseRenderData {
  page: number;
  glyphs: string[];
  surah: number;
  startAyah: number;
  endAyah: number;
}

export default function AzkarQcfVerse({ azkarId, textColor }: AzkarQcfVerseProps) {
  const { isDarkMode } = useSettings();
  const colors = useColors();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const color = textColor || colors.text;

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
            startAyah: ayah,
            endAyah: ayah,
          });
        }
      }
    }
    return result;
  }, [azkarId]);

  // Get unique pages needed for font loading
  const uniquePages = useMemo(() => {
    return [...new Set(verseDataList.map(v => v.page))];
  }, [verseDataList]);

  // Load all needed QCF fonts
  useEffect(() => {
    if (uniquePages.length === 0) return;

    let cancelled = false;
    const load = async () => {
      try {
        await Promise.all(
          uniquePages.map(page => loadPageFont(page, isDarkMode))
        );
        if (!cancelled) setFontsLoaded(true);
      } catch (err) {
        console.warn('[AzkarQcfVerse] Font loading failed:', err);
        if (!cancelled) setFontsLoaded(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [uniquePages, isDarkMode]);

  if (verseDataList.length === 0) return null;

  // Show loading indicator while fonts load
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // Group consecutive verses by page for efficient rendering
  const pageGroups: { page: number; glyphs: string[] }[] = [];
  let currentGroup: { page: number; glyphs: string[] } | null = null;

  for (const verse of verseDataList) {
    if (currentGroup && currentGroup.page === verse.page) {
      currentGroup.glyphs.push(...verse.glyphs);
    } else {
      currentGroup = { page: verse.page, glyphs: [...verse.glyphs] };
      pageGroups.push(currentGroup);
    }
  }

  return (
    <View style={styles.container}>
      {pageGroups.map((group, index) => {
        const fontFamily = getPageFontFamily(group.page, isDarkMode);
        const fontSize = getQcfFontSize(group.page, SCREEN_WIDTH - 48);
        const lineHeight = fontSize * 1.85;

        return (
          <Text
            key={`${group.page}-${index}`}
            allowFontScaling={false}
            style={{
              fontFamily,
              fontSize,
              textAlign: 'center',
              lineHeight,
              color,
              writingDirection: 'rtl',
              paddingVertical: 4,
            }}
          >
            {group.glyphs.join('')}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});
