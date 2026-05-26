/**
 * /quran-passage?surah=2&ayah=30&ayahEnd=39
 * ----------------------------------------------------------------------------
 * Dedicated reader for a verse range cited by a source link (religious story
 * sources, companion biographies, seerah sections). Rendering the cited
 * verses on their own screen sidesteps the iOS Mushaf-page-wide highlight
 * problem (CoreText's `adjustsFontSizeToFit` collapses nested-inline
 * backgroundColor) and gives the user a focused, distraction-free view of
 * exactly the verses the citation refers to.
 *
 * The page mirrors the visual language of `app/ayat-kursi.tsx` (glass card,
 * surah ornament header, play/share/open-in-Mushaf actions) so it feels like
 * a built-in companion to the existing Quran experience.
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Platform,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getLanguage } from '@/lib/i18n';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { ScreenContainer } from '@/components/screen-container';
import { GlassCard, BackButton } from '@/components/ui';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { getSurahData } from '@/lib/qcf-page-data';
import { getSurahName } from '@/lib/quran-api';
import { localizeNumber } from '@/lib/format-number';
import { useQuran } from '@/contexts/QuranContext';
import { Spacing } from '@/constants/theme';
import { QURAN_THEMES, getSafeThemeIndex, getGoldenColor } from '@/constants/quran-themes';

const surahOrnament = require('@/assets/images/quran/surah-ornament.png');

const RTL_LANGS = new Set(['ar', 'ur', 'fa']);

function toArabicDigits(n: number): string {
  return localizeNumber(n);
}

export default function QuranPassageScreen() {
  const { surah: surahParam, ayah: ayahParam, ayahEnd: ayahEndParam, title: titleParam } =
    useLocalSearchParams<{ surah?: string; ayah?: string; ayahEnd?: string; title?: string }>();
  const router = useRouter();
  const colors = useColors();
  const { isDarkMode } = colors;
  const { t, settings } = useSettings();
  const isRTL = useIsRTL();
  const { playAyah, playbackState, togglePlayPause, stopPlayback, setPlaybackRange } = useQuran();

  const surahNum = Math.max(1, Math.min(114, parseInt(surahParam || '1') || 1));
  const ayahStart = Math.max(1, parseInt(ayahParam || '1') || 1);
  const ayahEndParsed = ayahEndParam ? parseInt(ayahEndParam) : ayahStart;
  const ayahEnd = Math.max(ayahStart, ayahEndParsed);

  const themeIndex = getSafeThemeIndex(settings?.display?.quranThemeIndex ?? 0);
  const quranTheme = QURAN_THEMES[themeIndex];
  // Ornament + surah name always render in the golden hue so they stay
  // legible against the app's dark gradient background regardless of the
  // user's chosen Mushaf theme. (Earlier logic flipped to near-black for
  // light Mushaf themes, which then disappeared against the dark app bg.)
  const ornamentColor = getGoldenColor(themeIndex);

  const surahData = getSurahData(surahNum);
  const surahName = useMemo(() => getSurahName(surahNum), [surahNum]);

  // Materialise the requested verses once. We use the bundled Arabic text
  // (`ayah.t`) rather than QCF glyphs because a range can span multiple Mushaf
  // pages — loading a different QCF font per page is heavy and unnecessary
  // for a citation preview.
  const verses = useMemo(() => {
    if (!surahData) return [] as Array<{ ns: number; t: string }>;
    return surahData.ayahs.filter((a) => a.ns >= ayahStart && a.ns <= ayahEnd);
  }, [surahData, ayahStart, ayahEnd]);

  const langIsRTL = RTL_LANGS.has(getLanguage());

  // A source reference normally looks like "سورة البقرة 30-39 — خلق آدم
  // وسجود الملائكة والتوبة". The surah name and verse range are already
  // visible on this page (in the golden ornament and the reference badge),
  // so we strip everything before the em-dash separator and show only the
  // descriptive part of the citation in the header. Falls back to a generic
  // label when no title is passed in or when the format doesn't match.
  const headerTitle = useMemo(() => {
    if (!titleParam) {
      return langIsRTL ? `${surahName} — الآيات` : `${surahName} — Verses`;
    }
    const parts = titleParam.split(/\s+[—–-]\s+/);
    const descriptive = parts.length > 1 ? parts.slice(1).join(' — ').trim() : titleParam.trim();
    return descriptive || titleParam;
  }, [titleParam, langIsRTL, surahName]);

  const rangeLabel = useMemo(() => {
    if (ayahEnd > ayahStart) {
      return `${t('quran.ayah')} ${toArabicDigits(ayahStart)}-${toArabicDigits(ayahEnd)}`;
    }
    return `${t('quran.ayah')} ${toArabicDigits(ayahStart)}`;
  }, [ayahStart, ayahEnd, t]);

  // Pin the audio player's prev/next/auto-advance to the cited range while
  // this page is mounted. The player now refuses to step outside the range
  // at the source, so the prev/next buttons on the global mini bar never
  // even briefly load an out-of-range ayah. Released on unmount so other
  // screens get unconstrained playback again.
  useEffect(() => {
    setPlaybackRange({ surah: surahNum, start: ayahStart, end: ayahEnd });
    return () => setPlaybackRange(null);
  }, [setPlaybackRange, surahNum, ayahStart, ayahEnd]);

  const [currentlyPlayingAyah, setCurrentlyPlayingAyah] = useState<number | null>(null);

  // Centred modal surfaced whenever the player refuses a prev/next request
  // because it would leave the cited range. We watch the audio-player's
  // playbackRangeBlockedAt timestamp (bumped inside playPrev/playNext when
  // the range constraint denies the step) and open the dialog until the
  // user dismisses it. Unlike a transient toast it never covers a verse —
  // the backdrop is dimmed and only the modal card sits on top.
  const [rangeBlockVisible, setRangeBlockVisible] = useState(false);
  useEffect(() => {
    const stamp = playbackState.playbackRangeBlockedAt;
    if (!stamp) return;
    setRangeBlockVisible(true);
  }, [playbackState.playbackRangeBlockedAt]);

  // Keep the local "now playing" pointer in sync with the global audio
  // playback state, so when the user uses transport controls outside this
  // screen the highlight stays correct.
  useEffect(() => {
    if (playbackState.isPlaying && playbackState.currentSurah === surahNum) {
      setCurrentlyPlayingAyah(playbackState.currentAyah);
    } else if (!playbackState.isPlaying) {
      setCurrentlyPlayingAyah(null);
    }
  }, [playbackState.isPlaying, playbackState.currentSurah, playbackState.currentAyah, surahNum]);

  // Safety net: if anything outside our control (a saved-state restore on
  // app launch, a notification action) does land us on an out-of-range
  // ayah, stop playback. The primary confinement happens at the audio
  // player level via setPlaybackRange above — this useEffect just catches
  // edge cases where the range constraint can't pre-empt the transition.
  useEffect(() => {
    const { isPlaying, currentSurah, currentAyah } = playbackState;
    if (!isPlaying) return;
    if (currentSurah === 0 || currentAyah === 0) return;
    const inRange =
      currentSurah === surahNum && currentAyah >= ayahStart && currentAyah <= ayahEnd;
    if (!inRange) stopPlayback();
  }, [playbackState, surahNum, ayahStart, ayahEnd, stopPlayback]);

  const handlePlayAll = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (playbackState.isPlaying) {
      togglePlayPause();
      return;
    }
    // continuous=true tells the underlying audio player to auto-advance
    // to the next ayah when the current one finishes. We must pass
    // playFullSurah=false explicitly — otherwise the player defaults
    // playFullSurah to `continuous`, which puts it into whole-surah-file
    // mode and makes the end-of-file handler advance to the NEXT SURAH
    // instead of the next ayah inside this surah.
    playAyah(surahNum, ayahStart, true, false);
  };

  const handleOpenMushaf = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    const params: Record<string, string> = { id: String(surahNum), ayah: String(ayahStart) };
    if (ayahEnd > ayahStart) params.ayahEnd = String(ayahEnd);
    router.push({ pathname: '/surah/[id]', params } as never);
  };

  const handleShare = () => {
    if (verses.length === 0) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const body = verses
      .map((v) => `${v.t} ﴿${toArabicDigits(v.ns)}﴾`)
      .join('\n\n');
    const ref = `${surahName} — ${rangeLabel}`;
    Alert.alert(t('common.share'), `${ref}\n\n${body}`);
  };

  const isPlaying = playbackState.isPlaying && playbackState.currentSurah === surahNum;
  const bgColor =
    settings.display.appBackground !== 'none' ? 'transparent' : colors.background;

  const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: {
      paddingHorizontal: Spacing.md,
      paddingBottom: 40,
    },
    headerRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
    ornamentBlock: {
      marginHorizontal: 8,
      marginBottom: 18,
      height: 56,
    },
    ornamentText: {
      fontSize: 17,
      fontFamily: 'Amiri-Bold',
      textAlign: 'center',
      lineHeight: 28,
      color: ornamentColor,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: isDarkMode ? '#1c1d22' : '#ffffff',
      borderRadius: 20,
      padding: 22,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 16,
    },
    modalIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    modalTitle: {
      fontSize: 17,
      fontFamily: fontBold(),
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },
    modalBody: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.text,
      fontFamily: fontRegular(),
      textAlign: 'center',
      writingDirection: isRTL ? 'rtl' : 'ltr',
      marginBottom: 18,
    },
    modalLink: {
      color: getGoldenColor(themeIndex),
      fontFamily: fontSemiBold(),
    },
    modalActions: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      gap: 10,
      alignSelf: 'stretch',
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBtnPrimary: {
      backgroundColor: quranTheme?.primary || '#0d8e62',
    },
    modalBtnSecondary: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    modalBtnTextPrimary: {
      color: '#fff',
      fontFamily: fontSemiBold(),
      fontSize: 15,
    },
    modalBtnTextSecondary: {
      color: colors.text,
      fontFamily: fontSemiBold(),
      fontSize: 15,
    },
    verseCard: {
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 16,
    },
    verseInner: {
      padding: 18,
    },
    verseBody: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      writingDirection: 'rtl',
    },
    verseText: {
      flex: 1,
      fontSize: 22,
      color: colors.text,
      textAlign: 'right',
      lineHeight: 42,
      fontFamily: 'Amiri-Bold',
      writingDirection: 'rtl',
    },
    verseTextHighlighted: {
      color: getGoldenColor(themeIndex),
    },
    ayahNumberBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ayahNumberText: {
      fontFamily: fontSemiBold(),
      color: colors.text,
      fontSize: 14,
    },
    referenceContainer: {
      marginTop: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDarkMode
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.05)',
      alignSelf: 'center',
    },
    referenceText: {
      fontSize: 14,
      fontFamily: fontSemiBold(),
      color: colors.text,
      textAlign: 'center',
    },
    actionsRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
      flexWrap: 'wrap',
    },
    actionBtn: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
    },
    actionBtnText: {
      fontFamily: fontSemiBold(),
      color: colors.text,
      fontSize: 14,
    },
    actionBtnPrimary: {
      backgroundColor: quranTheme?.primary || '#0d8e62',
    },
    actionBtnPrimaryText: {
      color: '#fff',
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textLight,
      marginTop: 40,
      fontFamily: fontRegular(),
    },
  });

  return (
    <ScreenContainer>
      <BackgroundWrapper>
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <View style={styles.headerRow}>
            <BackButton />
            <Text style={styles.title} numberOfLines={2}>
              {headerTitle}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.ornamentBlock}>
              <ImageBackground
                source={surahOrnament}
                style={{ width: '100%', height: 50, justifyContent: 'center', alignItems: 'center' }}
                resizeMode="contain"
                tintColor={ornamentColor}
              >
                <Text style={styles.ornamentText} allowFontScaling={false}>
                  {surahName}
                </Text>
              </ImageBackground>
            </View>

            {verses.length === 0 ? (
              <Text style={styles.emptyText}>
                {langIsRTL ? 'لم نجد الآيات المطلوبة' : 'Verses not found'}
              </Text>
            ) : (
              verses.map((v) => {
                const isCurrent = currentlyPlayingAyah === v.ns;
                return (
                  <GlassCard key={v.ns} style={styles.verseCard}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync();
                        // continuous=true + playFullSurah=false → auto-advance
                        // by ayah, not by surah. See handlePlayAll() for the
                        // rationale behind passing playFullSurah explicitly.
                        playAyah(surahNum, v.ns, true, false);
                      }}
                    >
                      <View style={styles.verseInner}>
                        <View style={styles.verseBody}>
                          <Text style={[styles.verseText, isCurrent && styles.verseTextHighlighted]}>
                            {v.t}
                          </Text>
                          <View style={styles.ayahNumberBadge}>
                            <Text style={styles.ayahNumberText}>{toArabicDigits(v.ns)}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </GlassCard>
                );
              })
            )}

            <View style={styles.referenceContainer}>
              <Text style={styles.referenceText}>
                {surahName} — {rangeLabel}
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePlayAll}
                style={[styles.actionBtn, styles.actionBtnPrimary]}
              >
                <MaterialCommunityIcons
                  name={isPlaying ? 'pause-circle' : 'play-circle'}
                  size={22}
                  color="#fff"
                />
                <Text style={[styles.actionBtnText, styles.actionBtnPrimaryText]}>
                  {isPlaying ? t('common.pause') : t('common.play')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} onPress={handleOpenMushaf} style={styles.actionBtn}>
                <MaterialCommunityIcons name="book-open-page-variant" size={20} color={colors.text} />
                <Text style={styles.actionBtnText}>
                  {isRTL ? 'فتح في المصحف' : 'Open in Mushaf'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.7} onPress={handleShare} style={styles.actionBtn}>
                <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
                <Text style={styles.actionBtnText}>{t('common.share')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <Modal
            transparent
            visible={rangeBlockVisible}
            animationType="fade"
            onRequestClose={() => setRangeBlockVisible(false)}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setRangeBlockVisible(false)}
            >
              <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalIconWrap}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={28}
                    color={getGoldenColor(themeIndex)}
                  />
                </View>
                <Text style={styles.modalTitle}>
                  {langIsRTL ? 'تصفح خارج المصدر' : 'Outside the source'}
                </Text>
                <Text style={styles.modalBody}>
                  {langIsRTL
                    ? 'هذه الصفحة تعرض فقط الآيات المرتبطة بالمصدر. للتصفح الكامل للقرآن، '
                    : 'This screen plays only the verses cited by the source. To browse the full Qur\'an, '}
                  <Text style={styles.modalLink}>
                    {langIsRTL ? 'افتح المصحف' : 'open the Mushaf'}
                  </Text>
                  .
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    onPress={() => setRangeBlockVisible(false)}
                  >
                    <Text style={styles.modalBtnTextSecondary}>
                      {langIsRTL ? 'حسناً' : 'OK'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    onPress={() => {
                      setRangeBlockVisible(false);
                      handleOpenMushaf();
                    }}
                  >
                    <Text style={styles.modalBtnTextPrimary}>
                      {langIsRTL ? 'افتح المصحف' : 'Open Mushaf'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </BackgroundWrapper>
    </ScreenContainer>
  );
}
