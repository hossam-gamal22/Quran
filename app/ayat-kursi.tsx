/**
 * آية الكرسي — Ayat Al-Kursi dedicated view
 * Renders verse 255 of Surah Al-Baqarah using QCF fonts
 */

import React, { useEffect, useState, useRef } from 'react';
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
import { getVerseQcfData, getQcfFontSize, getSurahData } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily, isPageFontLoaded } from '@/lib/qcf-font-loader';
import { getSurahName } from '@/lib/quran-api';
import { localizeNumber } from '@/lib/format-number';
import { useQuran } from '@/contexts/QuranContext';
import { Spacing } from '@/constants/theme';
import { QURAN_THEMES, getSafeThemeIndex, isThemeLight, getGoldenColor } from '@/constants/quran-themes';
import { useAppIdentity } from '@/hooks/use-app-identity';

const surahOrnament = require('@/assets/images/quran/surah-ornament.png');

const SURAH_NUM = 2;
const AYAH_NUM = 255;

export default function AyatKursiScreen() {
  const colors = useColors();
  const { isDarkMode, fs } = colors;
  const { t, settings } = useSettings();
  const isRTL = useIsRTL();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { playAyah, playbackState, togglePlayPause } = useQuran();
  const shareViewShotRef = useRef<ViewShot>(null);
  const { logoSource: appIcon } = useAppIdentity();

  // Use the same Quran theme as the Mushaf reader for share capture
  const themeIndex = getSafeThemeIndex(settings?.display?.quranThemeIndex ?? 0);
  const quranTheme = QURAN_THEMES[themeIndex];
  const themeBgColor = quranTheme?.background || '#FFF8F0';
  const themeTextColor = quranTheme?.primary || '#1A1000';
  const isLightBg = isThemeLight(themeIndex);
  const shareOrnamentColor = isLightBg ? '#11171d' : getGoldenColor(themeIndex);

  const [qcfFontLoaded, setQcfFontLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get QCF glyph data for Ayat Al-Kursi
  const qcfData = getVerseQcfData(SURAH_NUM, AYAH_NUM);
  const qcfPage = qcfData?.page || 42;
  const qcfGlyphs = qcfData?.glyphs || [];
  const qcfText = qcfGlyphs.join('');

  // Get the actual Arabic text as fallback
  const surahData = getSurahData(SURAH_NUM);
  const ayahData = surahData?.ayahs.find(a => a.ns === AYAH_NUM);
  const arabicText = ayahData?.t || '';

  // Load QCF font
  useEffect(() => {
    if (!qcfData) {
      setLoading(false);
      return;
    }
    loadPageFont(qcfPage, isDarkMode)
      .then(() => {
        setQcfFontLoaded(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [qcfPage, isDarkMode]);

  const handleShare = async () => {
    try {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!shareViewShotRef.current) return;
      if (!isPageFontLoaded(qcfPage, isDarkMode)) return;
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
      console.warn('Error sharing Ayat Al-Kursi:', e);
    }
  };

  const handlePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playAyah(SURAH_NUM, AYAH_NUM);
  };

  const handleOpenMushaf = () => {
    router.push(`/surah/2?ayah=255` as any);
  };

  const isPlaying = playbackState.isPlaying;
  const bgColor = settings.display.appBackground !== 'none' ? 'transparent' : colors.background;
  const qcfFontSize = getQcfFontSize(qcfPage, width - 64) + 2;

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
    verseCard: {
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 20,
    },
    verseInner: {
      padding: 20,
      alignItems: 'center',
    },
    qcfText: {
      fontFamily: getPageFontFamily(qcfPage, isDarkMode),
      fontSize: qcfFontSize,
      textAlign: 'center',
      lineHeight: qcfFontSize * 1.85,
      color: colors.text,
      writingDirection: 'rtl',
    },
    fallbackText: {
      fontSize: 24,
      color: colors.text,
      textAlign: 'center',
      lineHeight: 46,
      fontFamily: 'Amiri-Bold',
      writingDirection: 'rtl',
    },
    referenceContainer: {
      marginTop: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDarkMode
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.05)',
    },
    referenceText: {
      fontSize: 14,
      fontFamily: fontSemiBold(),
      color: colors.text,
      textAlign: 'center',
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
    virtueText: {
      fontSize: 14,
      fontFamily: fontRegular(),
      color: colors.textLight || colors.muted,
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
      lineHeight: 24,
    },
  });
  const styles = useScaledStyles(_styles, colors.fs);

  if (loading) {
    return (
      <BackgroundWrapper style={{ flex: 1 }}>
        <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper style={{ flex: 1 }}>
      <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']} screenKey="ayat-kursi">
        <ScrollView
          style={[styles.container, { backgroundColor: bgColor }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <BackButton
              color={colors.text}
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderRadius: 20,
                width: 40,
                height: 40,
              }}
            />
            <Text numberOfLines={1} style={styles.title}>{t('home.ayatKursi')}</Text>
          </View>

          {/* Off-screen share capture — matches Mushaf reader style */}
          {(() => {
            const SHARE_CAPTURE_WIDTH = 375;
            const shareFontSize = getQcfFontSize(qcfPage, SHARE_CAPTURE_WIDTH - 64) + 2;
            const shareFontFamily = getPageFontFamily(qcfPage, !isLightBg);
            return (
              <View style={{ position: 'absolute', left: -9999, top: 0, width: SHARE_CAPTURE_WIDTH }} pointerEvents="none" collapsable={false}>
                <ViewShot ref={shareViewShotRef} options={{ format: 'png', quality: 1 }}>
                  <View style={{ backgroundColor: themeBgColor, paddingTop: 40, paddingBottom: 28, paddingHorizontal: 16 }} collapsable={false}>
                    {/* Surah banner */}
                    <View style={{ marginHorizontal: 8, marginBottom: 24, height: 54 }}>
                      <ImageBackground
                        source={surahOrnament}
                        style={{ width: '100%', height: 50, justifyContent: 'center', alignItems: 'center' }}
                        resizeMode="contain"
                        tintColor={shareOrnamentColor}
                      >
                        <Text style={{ fontSize: 17, fontFamily: 'Amiri-Bold', textAlign: 'center', lineHeight: 28, color: shareOrnamentColor }} allowFontScaling={false}>
                          {isRTL ? 'آية الكرسي' : 'Ayat Al-Kursi'}
                        </Text>
                      </ImageBackground>
                    </View>
                    {/* QCF Ayat Al-Kursi */}
                    {qcfFontLoaded && qcfText ? (
                      <Text
                        allowFontScaling={false}
                        style={{
                          fontFamily: shareFontFamily,
                          fontSize: shareFontSize,
                          textAlign: 'center',
                          lineHeight: shareFontSize * 1.85,
                          color: themeTextColor,
                          writingDirection: 'rtl',
                          paddingHorizontal: 8,
                        }}
                      >
                        {qcfText}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 24, color: themeTextColor, textAlign: 'center', lineHeight: 46, fontFamily: 'Amiri-Bold', writingDirection: 'rtl' }}>
                        {arabicText}
                      </Text>
                    )}
                    {/* Branding watermark */}
                    <View style={{ alignItems: 'center', marginTop: 28 }} pointerEvents="none" collapsable={false}>
                      <Image source={appIcon} style={{ width: 40, height: 40, borderRadius: 10, opacity: 0.7 }} resizeMode="contain" />
                    </View>
                  </View>
                </ViewShot>
              </View>
            );
          })()}

          {/* Verse Card */}
          <GlassCard style={styles.verseCard}>
            <View style={styles.verseInner}>
              {qcfFontLoaded && qcfText ? (
                <Text allowFontScaling={false} style={styles.qcfText}>
                  {qcfText}
                </Text>
              ) : (
                <Text style={styles.fallbackText}>{arabicText}</Text>
              )}

              {/* Surah reference */}
              <View style={styles.referenceContainer}>
                <Text style={styles.referenceText}>
                  {getSurahName(SURAH_NUM)} — {t('quran.ayah')} {localizeNumber(AYAH_NUM)}
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* Action buttons */}
          <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Play */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={isPlaying ? togglePlayPause : handlePlay}
              style={[styles.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <MaterialCommunityIcons
                name={isPlaying ? 'pause-circle' : 'play-circle'}
                size={22}
                color={colors.text}
              />
              <Text style={styles.actionBtnText}>
                {isPlaying ? t('common.pause') : t('common.play')}
              </Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleShare}
              style={[styles.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
              <Text style={styles.actionBtnText}>{t('common.share')}</Text>
            </TouchableOpacity>
          </View>

          {/* Open in Mushaf */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenMushaf}
            style={styles.mushafBtn}
          >
            <View style={[styles.mushafBtnInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.text} />
              <Text style={styles.mushafBtnText}>{t('ayatUniverse.readInMushaf')}</Text>
            </View>
          </TouchableOpacity>

          {/* Virtue/Fadl section */}
          <GlassCard style={styles.virtueCard}>
            <View style={styles.virtueInner}>
              <Text style={styles.virtueTitle}>
                {isRTL ? 'فضل آية الكرسي' : 'Virtue of Ayat Al-Kursi'}
              </Text>
              <Text style={styles.virtueText}>
                {isRTL
                  ? 'عن أُبيّ بن كعب رضي الله عنه قال: قال رسول الله ﷺ: «يا أبا المنذر، أتدري أيّ آية من كتاب الله معك أعظم؟» قلت: الله ورسوله أعلم. قال: «يا أبا المنذر، أتدري أيّ آية من كتاب الله معك أعظم؟» قلت: ﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ﴾ فضرب في صدري وقال: «واللَّهِ لِيَهْنِكَ العلمُ أبا المنذر». رواه مسلم.'
                  : 'Ubayy ibn Ka\'b reported: The Messenger of Allah ﷺ said, "O Abu al-Mundhir, do you know which verse in the Book of Allah is the greatest?" I said, "Allah and His Messenger know best." He repeated, so I said, \'Allah — there is no deity except Him, the Ever-Living, the Self-Sustaining.\' He struck my chest and said, "By Allah, may knowledge be pleasant for you, O Abu al-Mundhir." (Sahih Muslim)'}
              </Text>
            </View>
          </GlassCard>
        </ScrollView>
      </ScreenContainer>
    </BackgroundWrapper>
  );
}
