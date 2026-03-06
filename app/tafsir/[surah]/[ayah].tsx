import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SURAH_NAMES_AR, fetchTafsir, TAFSIR_EDITIONS } from '@/lib/quran-api';

export default function TafsirScreen() {
  const { surah, ayah } = useLocalSearchParams<{ surah: string; ayah: string }>();
  const colors = useColors();
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
      .then(({ arabicText: ar, tafsirText: t }) => {
        setArabicText(ar);
        setTafsirText(t);
      })
      .catch(() => setTafsirText('تعذر تحميل التفسير'))
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
    title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.foreground },
    closeBtn: { padding: 8 },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    surahRef: {
      fontSize: 14,
      color: colors.primary,
      textAlign: 'right',
      fontWeight: '600',
      marginBottom: 12,
    },
    arabicText: {
      fontSize: 22,
      color: colors.foreground,
      textAlign: 'right',
      lineHeight: 40,
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
    editionTabText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
    editionTabTextActive: { color: '#fff' },
    tafsirTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'right',
      marginBottom: 10,
    },
    tafsirText: {
      fontSize: 16,
      color: colors.foreground,
      textAlign: 'right',
      lineHeight: 30,
    },
  });

  const editionName = TAFSIR_EDITIONS.find(e => e.identifier === selectedEdition)?.name || 'التفسير';

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.title}>التفسير</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.surahRef}>
            {SURAH_NAMES_AR[surahNum - 1]} - آية {ayahNum}
          </Text>
          {arabicText ? <Text style={s.arabicText}>{arabicText}</Text> : null}

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

          <Text style={s.tafsirTitle}>📖 {editionName}</Text>
          <Text style={s.tafsirText}>{tafsirText || 'لا يتوفر تفسير لهذه الآية'}</Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
