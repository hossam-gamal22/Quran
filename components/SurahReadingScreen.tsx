/**
 * SurahReadingScreen — Shared full surah reading view
 * Renders a surah using paginated Mushaf-style QCF fonts,
 * with horizontal page swiping, action buttons, and virtue section.
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { ScreenContainer } from '@/components/screen-container';
import { GlassCard, BackButton } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { getSurahData, buildPageBlocks, getQcfFontSize } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily, isPageFontLoaded } from '@/lib/qcf-font-loader';
import { getSurahName } from '@/lib/quran-api';
import { localizeNumber } from '@/lib/format-number';
import { useQuran } from '@/contexts/QuranContext';
import { Spacing } from '@/constants/theme';
import { QURAN_THEMES, getSafeThemeIndex, isThemeLight, getGoldenColor } from '@/constants/quran-themes';
import { useAppIdentity } from '@/hooks/use-app-identity';

// Assets for surah banner and basmala
const surahOrnament = require('@/assets/images/quran/surah-ornament.png');
const basmalaImg = require('@/assets/images/quran/basmala.png');

interface SurahReadingScreenProps {
  surahNumber: number;
  titleKey: string;
  virtueTitle: { ar: string; en: string };
  virtueText: { ar: string; en: string };
  /** Optional extra content to render after the virtue section */
  extraContent?: React.ReactNode;
  /** Hide the built-in header (BackButton + title) when parent handles header */
  hideHeader?: boolean;
}

// ── Mini SurahBanner for in-page rendering ──
function SurahBannerInline({ surahNumber, isDarkMode }: { surahNumber: number; isDarkMode: boolean }) {
  const ornamentColor = isDarkMode ? '#d4af37' : '#11171d';
  const name = getSurahName(surahNumber);
  return (
    <View style={{ marginHorizontal: 8, marginVertical: 4, height: 54 }}>
      <ImageBackground
        source={surahOrnament}
        style={{ width: '100%', height: 50, justifyContent: 'center', alignItems: 'center' }}
        resizeMode="contain"
        tintColor={ornamentColor}
      >
        <Text
          style={{ fontSize: 17, fontFamily: 'Amiri-Bold', textAlign: 'center', lineHeight: 28, color: ornamentColor }}
          allowFontScaling={false}
        >
          {name}
        </Text>
      </ImageBackground>
    </View>
  );
}

// ── Mini BasmalaLine for in-page rendering ──
function BasmalaLineInline({ isDarkMode }: { isDarkMode: boolean }) {
  const tintColor = isDarkMode ? '#d4af37' : '#11171d';
  return (
    <View style={{ alignItems: 'center', marginVertical: 2, paddingHorizontal: '20%' }}>
      <Image source={basmalaImg} style={{ width: '100%', height: 28 }} resizeMode="contain" tintColor={tintColor} />
    </View>
  );
}

// ── Single Mushaf page rendered with QCF font ──
function MushafPageBlock({
  page,
  pageWidth,
  isDarkMode,
  textColor,
  surahNumber,
  hideSurahName,
}: {
  page: number;
  pageWidth: number;
  isDarkMode: boolean;
  textColor: string;
  surahNumber: number;
  hideSurahName?: boolean;
}) {
  const [fontLoaded, setFontLoaded] = useState(isPageFontLoaded(page, isDarkMode));
  const [fontError, setFontError] = useState(false);

  useEffect(() => {
    if (isPageFontLoaded(page, isDarkMode)) {
      setFontLoaded(true);
      return;
    }
    setFontLoaded(false);
    setFontError(false);
    loadPageFont(page, isDarkMode)
      .then(() => setFontLoaded(true))
      .catch(() => setFontError(true));
  }, [page, isDarkMode]);

  const allBlocks = useMemo(() => buildPageBlocks(page), [page]);
  // Filter blocks to only show content belonging to this surah
  const blocks = useMemo(() => {
    return allBlocks.filter((block) => {
      if (block.type === 'surah_name') return !hideSurahName && block.surahNumber === surahNumber;
      if (block.type === 'basmallah') return block.surahNumber === surahNumber;
      if (block.type === 'ayah') {
        return block.segments.length > 0 && block.segments[0].surah === surahNumber;
      }
      return false;
    });
  }, [allBlocks, surahNumber, hideSurahName]);
  const fontFamily = getPageFontFamily(page, isDarkMode);

  // Use FULL page line count for font sizing (keep QCF glyph size consistent)
  const fullPageLineCount = allBlocks.filter(b => b.type === 'ayah' || b.type === 'basmallah').length;
  const contentLineCount = blocks.filter(b => b.type === 'ayah' || b.type === 'basmallah').length;
  const dynamicBoost = fullPageLineCount <= 5 ? 3 : fullPageLineCount <= 7 ? 1 : 0;
  const fontSize = getQcfFontSize(page, pageWidth - 32, dynamicBoost);
  const lineHeight = contentLineCount >= 14
    ? fontSize * 1.65
    : contentLineCount >= 11
      ? fontSize * 1.75
      : fontSize * 1.9;
  const extraTopPadding = fontLoaded ? Math.ceil(fontSize * 0.18) : 0;

  if (!fontLoaded && !fontError) {
    return (
      <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
        <ActivityIndicator size="large" color="#d4af37" />
      </View>
    );
  }

  if (fontError) {
    return (
      <View style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <TouchableOpacity
          onPress={() => { setFontError(false); setFontLoaded(false); }}
          style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#d4af37', borderRadius: 10 }}
        >
          <Text style={{ color: '#fff', fontFamily: fontSemiBold() }}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If filtering removed all blocks on this page, show nothing
  if (blocks.length === 0) {
    return null;
  }

  return (
    <View style={{ paddingTop: 8, paddingBottom: 16, paddingHorizontal: 12 }}>
      {blocks.map((block, i) => {
        if (block.type === 'surah_name') {
          return <SurahBannerInline key={`sh-${i}`} surahNumber={block.surahNumber} isDarkMode={isDarkMode} />;
        }
        if (block.type === 'basmallah') {
          return <BasmalaLineInline key={`bsm-${i}`} isDarkMode={isDarkMode} />;
        }
        if (block.type === 'ayah') {
          return (
            <Text
              key={i}
              style={{
                fontFamily: fontLoaded ? fontFamily : 'Amiri-Regular',
                fontSize,
                textAlign: 'center',
                lineHeight,
                letterSpacing: 0,
                writingDirection: 'rtl',
                paddingTop: extraTopPadding,
                paddingBottom: extraTopPadding > 0 ? Math.ceil(fontSize * 0.1) : 0,
                color: textColor,
              }}
              allowFontScaling={false}
            >
              {block.segments.map((seg, si) => (
                <Text key={si}>{seg.glyph}</Text>
              ))}
            </Text>
          );
        }
        return null;
      })}
    </View>
  );
}

export default function SurahReadingScreen({
  surahNumber,
  titleKey,
  virtueTitle,
  virtueText,
  extraContent,
  hideHeader,
}: SurahReadingScreenProps) {
  const colors = useColors();
  const { isDarkMode, fs } = colors;
  const { t, settings } = useSettings();
  const isRTL = useIsRTL();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { playAyah, playbackState, togglePlayPause, stopPlayback } = useQuran();
  const shareViewShotRef = useRef<ViewShot>(null);
  const { logoSource: appIcon } = useAppIdentity();

  // Use the same Quran theme as the Mushaf reader for share capture
  const themeIndex = getSafeThemeIndex(settings?.display?.quranThemeIndex ?? 0);
  const quranTheme = QURAN_THEMES[themeIndex];
  const themeBgColor = quranTheme?.background || '#FFF8F0';
  const themeTextColor = quranTheme?.primary || '#1A1000';
  const isLightBg = isThemeLight(themeIndex);
  const shareOrnamentColor = isLightBg ? '#11171d' : getGoldenColor(themeIndex);

  // Calculate page range for this surah
  const surahData = getSurahData(surahNumber);
  const ayahs = surahData?.ayahs || [];
  const pages = useMemo(() => {
    if (!ayahs.length) return [];
    const firstPage = ayahs[0].p;
    const lastPage = ayahs[ayahs.length - 1].p;
    const result: number[] = [];
    for (let p = firstPage; p <= lastPage; p++) result.push(p);
    return result;
  }, [ayahs]);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const currentPage = pages[currentPageIndex];

  // Width for off-screen share capture
  const SHARE_CAPTURE_WIDTH = 375;

  // Sync page with audio playback - when ayah changes, navigate to correct page
  useEffect(() => {
    if (playbackState.currentSurah === surahNumber && playbackState.currentAyah > 0) {
      // Find which page contains the current ayah
      const currentAyahData = ayahs.find(a => a.ns === playbackState.currentAyah);
      if (currentAyahData) {
        const targetPage = currentAyahData.p;
        const targetPageIndex = pages.indexOf(targetPage);
        if (targetPageIndex >= 0 && targetPageIndex !== currentPageIndex) {
          setCurrentPageIndex(targetPageIndex);
        }
      }
    }
  }, [playbackState.currentAyah, playbackState.currentSurah, surahNumber, ayahs, pages, currentPageIndex]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (playbackState.isPlaying && playbackState.currentSurah === surahNumber) {
        stopPlayback();
      }
    };
  }, []);

  const handleShare = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!shareViewShotRef.current || !currentPage) return;
      if (!isPageFontLoaded(currentPage, isDarkMode)) return;
      // Small delay to ensure off-screen view is fully rendered
      await new Promise(r => setTimeout(r, Platform.OS === 'android' ? 400 : 150));
      const uri = await captureRef(shareViewShotRef, {
        format: 'png',
        quality: 1,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          UTI: 'public.png',
        });
      }
    } catch (e) {
      console.warn('Error sharing surah page:', e);
    }
  }, [currentPage, isDarkMode]);

  const handlePlay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playAyah(surahNumber, 1, true);
  }, [surahNumber, playAyah]);

  const handleTogglePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePlayPause();
  }, [togglePlayPause]);

  const handleOpenMushaf = useCallback(() => {
    router.push(`/surah/${surahNumber}` as any);
  }, [surahNumber, router]);

  const isPlayingThisSurah =
    playbackState.isPlaying && playbackState.currentSurah === surahNumber;
  const bgColor =
    settings.display.appBackground !== 'none' ? 'transparent' : colors.background;

  // Page content width for QCF rendering
  const pageContentWidth = width - (Spacing.md * 2);

  const _styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: Spacing.md,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      marginBottom: 16,
      marginTop: 8,
    },
    title: {
      fontSize: 20,
      fontFamily: fontBold(),
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
      flex: 1,
      paddingHorizontal: 8,
    },
    mushafCard: {
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 12,
    },
    pageNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 16,
    },
    pageNavBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(0,0,0,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageIndicator: {
      fontSize: 14,
      fontFamily: fontSemiBold(),
      color: colors.text,
      textAlign: 'center',
      minWidth: 60,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: isDarkMode
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.05)',
    },
    actionBtnText: {
      fontSize: 14,
      fontFamily: fontSemiBold(),
      color: colors.text,
    },
    mushafBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 16,
      backgroundColor: isDarkMode
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.05)',
      marginBottom: 12,
    },
    mushafBtnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    mushafBtnText: {
      fontSize: 14,
      fontFamily: fontSemiBold(),
      color: colors.text,
    },
    virtueCard: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 8,
    },
    virtueInner: {
      padding: 16,
    },
    virtueTitle: {
      fontSize: 16,
      fontFamily: fontBold(),
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
      marginBottom: 10,
    },
    virtueTextStyle: {
      fontSize: 14,
      fontFamily: fontRegular(),
      color: colors.textLight || colors.muted,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
      lineHeight: 24,
    },
  });
  const styles = useScaledStyles(_styles, colors.fs);

  if (!pages.length) {
    return (
      <BackgroundWrapper style={{ flex: 1 }}>
        <View
          style={[
            styles.container,
            { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper style={{ flex: 1 }}>
      <ScreenContainer
        containerClassName="bg-background"
        edges={['top', 'left', 'right']}
        screenKey={`surah-read-${surahNumber}`}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: bgColor }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          {!hideHeader && (
            <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <BackButton
                color={colors.text}
                style={{
                  backgroundColor: isDarkMode
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.05)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                }}
              />
              <Text numberOfLines={1} style={styles.title}>
                {titleKey.startsWith('__surah__') ? getSurahName(surahNumber) : t(titleKey)}
              </Text>
            </View>
          )}

          {/* Off-screen share capture — matches Mushaf reader style */}
          <View style={{ position: 'absolute', left: -9999, top: 0, width: SHARE_CAPTURE_WIDTH }} pointerEvents="none" collapsable={false}>
            <ViewShot ref={shareViewShotRef} options={{ format: 'png', quality: 1 }}>
              <View style={{ backgroundColor: themeBgColor, paddingTop: 40, paddingBottom: 90 }} collapsable={false}>
                {/* Surah banner — always shown above, matches Mushaf ornament style */}
                <View style={{ marginHorizontal: 24, marginBottom: 4, height: 54 }}>
                  <ImageBackground
                    source={surahOrnament}
                    style={{ width: '100%', height: 50, justifyContent: 'center', alignItems: 'center' }}
                    resizeMode="contain"
                    tintColor={shareOrnamentColor}
                  >
                    <Text style={{ fontSize: 17, fontFamily: 'Amiri-Bold', textAlign: 'center', lineHeight: 28, color: shareOrnamentColor }} allowFontScaling={false}>
                      {getSurahName(surahNumber)}
                    </Text>
                  </ImageBackground>
                </View>
                {/* QCF Mushaf content — hideSurahName to avoid duplication */}
                {currentPage && (
                  <MushafPageBlock
                    page={currentPage}
                    pageWidth={SHARE_CAPTURE_WIDTH - 32}
                    isDarkMode={!isLightBg}
                    textColor={themeTextColor}
                    surahNumber={surahNumber}
                    hideSurahName
                  />
                )}
                {/* Branding watermark — app icon like Mushaf reader */}
                <View style={{ alignItems: 'center', marginTop: 24 }} pointerEvents="none" collapsable={false}>
                  <Image source={appIcon} style={{ width: 40, height: 40, borderRadius: 10, opacity: 0.7 }} resizeMode="contain" />
                </View>
              </View>
            </ViewShot>
          </View>

          {/* Regular display card */}
          <GlassCard style={styles.mushafCard}>
            {currentPage && (
              <MushafPageBlock
                page={currentPage}
                pageWidth={pageContentWidth}
                isDarkMode={isDarkMode}
                textColor={colors.text}
                surahNumber={surahNumber}
              />
            )}
          </GlassCard>

          {/* Page navigation */}
          {pages.length > 1 && (
            <View style={[styles.pageNavRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.pageNavBtn, currentPageIndex <= 0 && { opacity: 0.3 }]}
                onPress={() => setCurrentPageIndex(currentPageIndex - 1)}
                disabled={currentPageIndex <= 0}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={isRTL ? 'chevron-right' : 'chevron-left'}
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>

              <Text style={styles.pageIndicator}>
                {localizeNumber(currentPageIndex + 1)} / {localizeNumber(pages.length)}
              </Text>

              <TouchableOpacity
                style={[styles.pageNavBtn, currentPageIndex >= pages.length - 1 && { opacity: 0.3 }]}
                onPress={() => setCurrentPageIndex(currentPageIndex + 1)}
                disabled={currentPageIndex >= pages.length - 1}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={isRTL ? 'chevron-left' : 'chevron-right'}
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons */}
          <View
            style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            {/* Play */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={isPlayingThisSurah ? handleTogglePlayPause : handlePlay}
              style={[
                styles.actionBtn,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <MaterialCommunityIcons
                name={isPlayingThisSurah ? 'pause-circle' : 'play-circle'}
                size={22}
                color={colors.text}
              />
              <Text style={styles.actionBtnText}>
                {isPlayingThisSurah ? t('common.pause') : t('common.play')}
              </Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleShare}
              style={[
                styles.actionBtn,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
              <Text style={styles.actionBtnText}>{t('common.share')}</Text>
            </TouchableOpacity>
          </View>

          {/* Open in Mushaf */}
          <TouchableOpacity activeOpacity={0.7} onPress={handleOpenMushaf} style={styles.mushafBtn}>
            <View
              style={[
                styles.mushafBtnInner,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.text} />
              <Text style={styles.mushafBtnText}>{t('ayatUniverse.readInMushaf')}</Text>
            </View>
          </TouchableOpacity>

          {/* Virtue/Fadl section */}
          <GlassCard style={styles.virtueCard}>
            <View style={styles.virtueInner}>
              <Text style={styles.virtueTitle}>
                {isRTL ? virtueTitle.ar : virtueTitle.en}
              </Text>
              <Text style={styles.virtueTextStyle}>
                {isRTL ? virtueText.ar : virtueText.en}
              </Text>
            </View>
          </GlassCard>

          {/* Extra content (e.g., notification settings) */}
          {extraContent}
        </ScrollView>
      </ScreenContainer>
    </BackgroundWrapper>
  );
}
