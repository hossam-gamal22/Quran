/**
 * غريب القرآن — Gharib al-Quran
 * صفحة لتصفّح أشهر الكلمات الغريبة في القرآن مع معانيها المختصرة،
 * مع بحث فوري و«كلمة اليوم». كل كلمة قابلة للنقر لفتح موضعها في المصحف.
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { GlassCard, UniversalHeader } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';
import { fontRegular, fontSemiBold, fontBold, quranFontFamily } from '@/lib/fonts';
import { localizeNumber } from '@/lib/format-number';
import {
  GharibWord,
  getGharibWordOfTheDay,
  searchGharib,
  getGharibGroupedBySurah,
} from '@/data/gharib-quran';
import { fetchGharibWords, getGharibWordsSync } from '@/lib/gharib-api';

const ACCENT = '#3a7ca5';

export default function GharibQuranScreen() {
  const colors = useColors();
  const isRTL = useIsRTL();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [words, setWords] = useState<GharibWord[]>(() => getGharibWordsSync());

  // حمّل الكلمات المدموجة (مبنيّة + بعيدة من لوحة التحكم) عند فتح الصفحة
  useEffect(() => {
    let alive = true;
    fetchGharibWords()
      .then((w) => { if (alive) setWords(w); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const wordOfDay = useMemo(() => getGharibWordOfTheDay(new Date(), words), [words]);

  const results = useMemo(() => searchGharib(query, words), [query, words]);
  const groups = useMemo(() => getGharibGroupedBySurah(results), [results]);
  const isSearching = query.trim().length > 0;

  const openInMushaf = useCallback(
    (w: GharibWord) => {
      Haptics.selectionAsync().catch(() => {});
      router.push(`/surah/${w.surah}?ayah=${w.ayah}` as any);
    },
    [router],
  );

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const writingDir = isRTL ? 'rtl' : 'ltr';

  const renderWordCard = (w: GharibWord, key: string) => (
    <TouchableOpacity
      key={key}
      activeOpacity={0.85}
      onPress={() => openInMushaf(w)}
    >
      <GlassCard style={styles.wordCard}>
        <View style={[styles.wordHeaderRow, { flexDirection: rowDir }]}>
          <Text
            style={[
              styles.wordText,
              { color: colors.text, fontFamily: quranFontFamily(), textAlign, writingDirection: writingDir },
            ]}
          >
            {w.word}
          </Text>
          <View style={[styles.refBadge, { backgroundColor: ACCENT }]}>
            <Text style={styles.refBadgeText}>
              {w.surahName} {localizeNumber(w.ayah)}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.meaningText,
            { color: colors.textLight, textAlign, writingDirection: writingDir },
          ]}
        >
          {w.meaning}
        </Text>
        <View style={[styles.openRow, { flexDirection: rowDir }]}>
          <MaterialCommunityIcons name="book-open-variant" size={16} color={colors.text} />
          <Text style={[styles.openText, { color: colors.text }]}>
            {t('gharibQuran.openInMushaf')}
          </Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer screenKey="gharib-quran">
      <Stack.Screen options={{ headerShown: false }} />
      <UniversalHeader
        title={t('gharibQuran.title')}
        titleStyle={{ textAlign, writingDirection: writingDir }}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* وصف موجز */}
        <Text
          style={[
            styles.subtitle,
            { color: colors.textLight, textAlign, writingDirection: writingDir },
          ]}
        >
          {t('gharibQuran.subtitle')}
        </Text>

        {/* كلمة اليوم */}
        {!isSearching && (
          <View style={styles.section}>
            <View style={[styles.sectionTitleRow, { flexDirection: rowDir }]}>
              <MaterialCommunityIcons name="white-balance-sunny" size={18} color={ACCENT} />
              <Text style={[styles.sectionTitle, { color: colors.text, textAlign, writingDirection: writingDir }]}>
                {t('gharibQuran.wordOfTheDay')}
              </Text>
            </View>
            {renderWordCard(wordOfDay, 'wod')}
          </View>
        )}

        {/* البحث */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.cardSolid, flexDirection: rowDir },
          ]}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textLight} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.text, textAlign, writingDirection: writingDir },
            ]}
            placeholder={t('gharibQuran.searchPlaceholder')}
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* النتائج / التصفّح */}
        {isSearching && (
          <Text style={[styles.resultCount, { color: colors.textLight, textAlign, writingDirection: writingDir }]}>
            {results.length > 0
              ? `${localizeNumber(results.length)} ${t('gharibQuran.resultsCount')}`
              : t('gharibQuran.noResults')}
          </Text>
        )}

        {groups.map((group) => (
          <View key={group.surah} style={styles.section}>
            <View style={[styles.sectionTitleRow, { flexDirection: rowDir }]}>
              <MaterialCommunityIcons name="bookmark-outline" size={16} color={ACCENT} />
              <Text style={[styles.surahTitle, { color: colors.text, textAlign, writingDirection: writingDir }]}>
                {t('gharibQuran.surahLabel')} {group.surahName}
              </Text>
            </View>
            {group.words.map((w, i) => renderWordCard(w, `${group.surah}-${w.ayah}-${i}`))}
          </View>
        ))}

        <Text style={[styles.footerNote, { color: colors.textLight }]}>
          {`${localizeNumber(words.length)} ${t('gharibQuran.totalWords')}`}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: fontRegular(),
    marginTop: 4,
    marginBottom: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitleRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontBold(),
  },
  surahTitle: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
  },
  searchBar: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    borderRadius: 14,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontRegular(),
    padding: 0,
  },
  resultCount: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginBottom: 12,
  },
  wordCard: {
    padding: 16,
    marginBottom: 10,
  },
  wordHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  wordText: {
    fontSize: 26,
    lineHeight: 40,
    flexShrink: 1,
  },
  refBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  refBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: fontSemiBold(),
  },
  meaningText: {
    fontSize: 16,
    lineHeight: 28,
    fontFamily: fontRegular(),
  },
  openRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  openText: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
  },
  footerNote: {
    fontSize: 12,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginTop: 8,
  },
});
