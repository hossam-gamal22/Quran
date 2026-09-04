import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { ScreenContainer } from '@/components/screen-container';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getSurahName, fetchTafsir, TAFSIR_EDITIONS } from '@/lib/quran-api';
import { t } from '@/lib/i18n';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { showOfflineModal } from '@/components/ui/OfflineBanner';
import { useSettings } from '@/contexts/SettingsContext';
import { getVerseQcfData, getQcfFontSize } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily } from '@/lib/qcf-font-loader';

export default function TafsirScreen() {
  const { surah, ayah } = useLocalSearchParams<{ surah: string; ayah: string }>();
  const colors = useColors();
  const isRTL = useIsRTL();
  const { isDarkMode } = useSettings();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [arabicText, setArabicText] = useState('');
  const [tafsirText, setTafsirText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEdition, setSelectedEdition] = useState('ar.muyassar');
  const [qcfFontLoaded, setQcfFontLoaded] = useState(false);

  const surahNum = parseInt(surah || '1', 10);
  const ayahNum = parseInt(ayah || '1', 10);

  // Get QCF data for this verse
  const qcfData = getVerseQcfData(surahNum, ayahNum);
  const qcfPage = qcfData?.page || 1;
  const qcfGlyphs = qcfData?.glyphs || [];
  const qcfText = qcfGlyphs.join('');
  const needsDarkFont = isDarkMode;

  // Load QCF font
  useEffect(() => {
    if (!qcfData) return;
    setQcfFontLoaded(false);
    loadPageFont(qcfPage, needsDarkFont)
      .then(() => setQcfFontLoaded(true))
      .catch(() => setQcfFontLoaded(false));
  }, [qcfPage, needsDarkFont, qcfData]);

  useEffect(() => {
    setLoading(true);
    fetchTafsir(surahNum, ayahNum, selectedEdition)
      .then(({ arabicText: ar, tafsirText: tf }) => {
        setArabicText(ar);
        setTafsirText(tf);
      })
      .catch(() => {
        setTafsirText(t('quranSearch.loadTafsirFailed'));
        showOfflineModal();
      })
      .finally(() => setLoading(false));
  }, [surahNum, ayahNum, selectedEdition]);

  const _s = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', fontFamily: fontBold(), color: colors.text, lineHeight: 30, includeFontPadding: false },
    closeBtn: { padding: 8 },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    surahRef: {
      fontSize: 14,
      color: colors.primaryText,
      textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr',
      fontFamily: fontSemiBold(),
      marginBottom: 12,
      lineHeight: 18,
      includeFontPadding: false,
    },
    arabicText: {
      overflow: 'hidden' as const,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    editionTabs: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    editionTab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: colors.border,
    },
    editionTabActive: {
      backgroundColor: '#0d8e62',
      borderColor: '#0d8e62',
    },
    editionTabInactive: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
    },
    editionTabText: { fontSize: 12, color: colors.text, fontFamily: fontSemiBold(), lineHeight: 20, includeFontPadding: false },
    editionTabTextActive: { color: '#fff' },
    tafsirTitle: {
      fontSize: 16,
      fontFamily: fontBold(),
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr',
      marginBottom: 10,
      lineHeight: 28,
      includeFontPadding: false,
    },
    tafsirText: {
      fontSize: 16,
      color: colors.text,
      textAlign: 'right',
      writingDirection: 'rtl',
      lineHeight: 30,
      fontFamily: fontRegular(),
    },
  });
  const s = useScaledStyles(_s, colors.fs);

  const editionName = TAFSIR_EDITIONS.find(e => e.identifier === selectedEdition)?.name || t('quran.tafsir');

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']} screenKey="tafsir">
      <View style={[s.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t('quranSearch.tafsir')}</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.surahRef}>
            {getSurahName(surahNum)} - {t('quran.ayah')} {ayahNum}
          </Text>
          {arabicText ? (
            <View style={[s.arabicText, { justifyContent: 'center', alignItems: 'center' }]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
              {qcfFontLoaded && qcfText ? (
                <Text
                  allowFontScaling={false}
                  style={{
                    fontFamily: getPageFontFamily(qcfPage, needsDarkFont),
                    fontSize: getQcfFontSize(qcfPage, width - 72) + 4,
                    textAlign: 'center',
                    lineHeight: (getQcfFontSize(qcfPage, width - 72) + 4) * 1.85,
                    color: colors.text,
                    writingDirection: 'rtl',
                    paddingVertical: 8,
                  }}
                >
                  {qcfText}
                </Text>
              ) : (
                <Text style={{ fontSize: 24, color: colors.text, textAlign: 'center', lineHeight: 42, fontFamily: 'Amiri-Bold', includeFontPadding: false, textAlignVertical: 'center', paddingVertical: 12 }}>
                  {arabicText}
                </Text>
              )}
            </View>
          ) : null}

          <View style={s.editionTabs}>
            {TAFSIR_EDITIONS.map(ed => (
              <TouchableOpacity
                key={ed.identifier}
                style={[s.editionTab, selectedEdition === ed.identifier ? s.editionTabActive : s.editionTabInactive]}
                onPress={() => setSelectedEdition(ed.identifier)}
                activeOpacity={0.7}
              >
                <Text style={[s.editionTabText, selectedEdition === ed.identifier && s.editionTabTextActive]}>
                  {ed.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.tafsirTitle}>{editionName}</Text>
          <Text style={s.tafsirText}>{tafsirText || t('quranSearch.noTafsirAvailable')}</Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
