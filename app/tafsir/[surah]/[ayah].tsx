import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getSurahName, fetchTafsir, TAFSIR_EDITIONS } from '@/lib/quran-api';
import { t } from '@/lib/i18n';
import { useIsRTL } from '@/hooks/use-is-rtl';
export default function TafsirScreen() {
  const { surah, ayah } = useLocalSearchParams<{ surah: string; ayah: string }>();
  const colors = useColors();
  const isRTL = useIsRTL();
  const router = useRouter();

  const [arabicText, setArabicText] = useState('');
  const [tafsirText, setTafsirText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEdition, setSelectedEdition] = useState('ar.muyassar');

  const surahNum = parseInt(surah || '1', 10);
  const ayahNum = parseInt(ayah || '1', 10);

  useEffect(() => {
    setLoading(true);
    fetchTafsir(surahNum, ayahNum, selectedEdition)
      .then(({ arabicText: ar, tafsirText: tf }) => {
        setArabicText(ar);
        setTafsirText(tf);
      })
      .catch(() => setTafsirText(t('quranSearch.loadTafsirFailed')))
      .finally(() => setLoading(false));
  }, [surahNum, ayahNum, selectedEdition]);

  const s = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', fontFamily: fontBold(), color: colors.text },
    closeBtn: { padding: 8 },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    surahRef: {
      fontSize: 14,
      color: colors.primary,
      textAlign: isRTL ? 'right' : 'left',
      fontFamily: fontSemiBold(),
      marginBottom: 12,
    },
    arabicText: {
      backgroundColor: 'rgba(120,120,128,0.12)',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    editionTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    editionTab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: 'rgba(120,120,128,0.12)',
      borderWidth: 1,
      borderColor: colors.border,
    },
    editionTabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    editionTabText: { fontSize: 12, color: colors.textLight, fontFamily: fontSemiBold() },
    editionTabTextActive: { color: '#fff' },
    tafsirTitle: {
      fontSize: 16,
      fontFamily: fontBold(),
      color: colors.text,
      textAlign: isRTL ? 'right' : 'left',
      marginBottom: 10,
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

  const editionName = TAFSIR_EDITIONS.find(e => e.identifier === selectedEdition)?.name || t('quran.tafsir');

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']} screenKey="tafsir">
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
            <View style={s.arabicText}>
              <Text style={{ fontSize: 22, color: colors.text, textAlign: 'center', lineHeight: 40, fontFamily: 'Amiri-Bold' }}>
                {arabicText}
                {'  '}
                <Text style={{ color: colors.primary, fontSize: 16 }}>﴿{ayahNum}﴾</Text>
              </Text>
            </View>
          ) : null}

          <View style={s.editionTabs}>
            {TAFSIR_EDITIONS.map(ed => (
              <TouchableOpacity
                key={ed.identifier}
                style={[s.editionTab, selectedEdition === ed.identifier && s.editionTabActive]}
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
