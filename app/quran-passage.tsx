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

import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  const { playAyah, playbackState, togglePlayPause } = useQuran();

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

  const [currentlyPlayingAyah, setCurrentlyPlayingAyah] = useState<number | null>(null);

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

  // Auto-advance: when the audio for the current ayah finishes, queue the
  // next ayah in the range. We can't rely on "position ≈ duration while
  // playing" because the player flips isPlaying → false right when the
  // track ends and we miss the window. Instead we watch for two signals:
  //   (a) snapshot the latest known duration & position for each ayah while
  //       it's still playing, and
  //   (b) when isPlaying transitions true → false on the same ayah at
  //       position >= duration - 0.5s, treat it as a natural end and play
  //       the next ayah.
  // The lastEndedAyah guard prevents re-triggering when playAyah() emits
  // multiple intermediate state updates.
  const lastEndedAyah = useRef<number | null>(null);
  const playingSnapshotRef = useRef<{
    ayah: number;
    surah: number;
    duration: number;
    position: number;
    wasPlaying: boolean;
  }>({ ayah: 0, surah: 0, duration: 0, position: 0, wasPlaying: false });
  useEffect(() => {
    const { isPlaying, currentSurah, currentAyah, position, duration } = playbackState;
    const snap = playingSnapshotRef.current;

    // Detect the playing → stopped transition for the same ayah.
    const stoppedNaturally =
      snap.wasPlaying &&
      !isPlaying &&
      snap.surah === currentSurah &&
      snap.ayah === currentAyah &&
      snap.duration > 0 &&
      // Either the snapshot was close to the end, or the player reported
      // position ≈ duration right at the transition. We're lenient here
      // because the underlying audio backend may emit one final update at
      // 0:30 / 0:30 before flipping isPlaying false.
      (snap.duration - snap.position < 1.2 || (duration > 0 && duration - position < 1.2));

    if (
      stoppedNaturally &&
      currentSurah === surahNum &&
      currentAyah >= ayahStart &&
      currentAyah < ayahEnd && // not at last cited ayah
      lastEndedAyah.current !== currentAyah
    ) {
      lastEndedAyah.current = currentAyah;
      playAyah(surahNum, currentAyah + 1);
      // Reset the guard a tick later so subsequent natural ends still fire.
      setTimeout(() => {
        if (lastEndedAyah.current === currentAyah) lastEndedAyah.current = null;
      }, 600);
    }

    // Update the snapshot. Only overwrite duration when we actually have
    // one — some intermediate updates report 0 momentarily.
    playingSnapshotRef.current = {
      ayah: currentAyah,
      surah: currentSurah,
      duration: duration > 0 ? duration : snap.duration,
      position: position > 0 ? position : snap.position,
      wasPlaying: isPlaying,
    };
  }, [playbackState, surahNum, ayahStart, ayahEnd, playAyah]);

  // Confinement: the global mini audio bar exposes prev/next skip buttons
  // that walk through the whole Mushaf. While the user is on this citation
  // page, playback must stay inside the cited range — if they skip out of
  // it (different surah, or ayah before / after the range), we redirect to
  // the nearest in-range ayah so they bounce back into the citation rather
  // than getting stuck silently. The guard ref prevents an infinite loop
  // when our redirect call itself triggers another playbackState update.
  const lastClampedAyah = useRef<number | null>(null);
  useEffect(() => {
    const { isPlaying, currentSurah, currentAyah } = playbackState;
    if (!isPlaying && playbackState.currentSurah === 0) return; // idle, nothing to do
    const inRange =
      currentSurah === surahNum && currentAyah >= ayahStart && currentAyah <= ayahEnd;
    if (inRange) {
      lastClampedAyah.current = null;
      return;
    }
    // Different surah → snap to the start of the range.
    // Before range → snap to ayahStart.
    // After range → snap to ayahEnd.
    let target: number;
    if (currentSurah !== surahNum) target = ayahStart;
    else if (currentAyah < ayahStart) target = ayahStart;
    else target = ayahEnd;
    if (lastClampedAyah.current === target) return;
    lastClampedAyah.current = target;
    playAyah(surahNum, target);
  }, [playbackState, surahNum, ayahStart, ayahEnd, playAyah]);

  const handlePlayAll = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (playbackState.isPlaying) {
      togglePlayPause();
      return;
    }
    playAyah(surahNum, ayahStart);
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
                        playAyah(surahNum, v.ns);
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
        </View>
      </BackgroundWrapper>
    </ScreenContainer>
  );
}
