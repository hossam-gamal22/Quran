/**
 * Tafsir Search Screen
 * البحث في تفاسير القرآن الكريم
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { NativeTabs } from '@/components/ui/NativeTabs';
import { SURAH_NAMES_AR, TAFSIR_EDITIONS, fetchTafsir, searchQuran, TRANSLATION_EDITIONS } from '@/lib/quran-api';
import * as Haptics from 'expo-haptics';

interface SearchResult {
  number: number;
  text: string;
  surah: { number: number; name: string; englishName: string };
  numberInSurah: number;
  juz: number;
}

interface TafsirDetail {
  surahNum: number;
  ayahNum: number;
  arabicText: string;
  tafsirText: string;
  edition: string;
}

// ─── Highlight matching text ─────────────────────────────────────────────────
function HighlightText({ text, query, color }: { text: string; query: string; color: string }) {
  if (!query.trim() || !text) return <Text>{text}</Text>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <Text>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <Text key={i} style={{ backgroundColor: color + '35', color, fontWeight: '700' }}>{part}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  );
}

export default function TafsirSearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLang, setSearchLang] = useState<'ar' | 'en'>('ar');
  const [selectedEdition, setSelectedEdition] = useState('ar.muyassar');
  const [tafsirDetail, setTafsirDetail] = useState<TafsirDetail | null>(null);
  const [loadingTafsir, setLoadingTafsir] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const editionForLang = searchLang === 'ar' ? 'quran-uthmani' : 'en.sahih';
  const englishEditions = TRANSLATION_EDITIONS.filter(e => e.language === 'en');
  const allModalEditions = [...TAFSIR_EDITIONS, ...englishEditions];

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await searchQuran(query.trim(), editionForLang, 'all');
      setResults(res.matches || []);
      setResultCount(res.count || 0);
    } catch {
      setResults([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  }, [query, editionForLang]);

  const handleOpenTafsir = useCallback(async (surahNum: number, ayahNum: number) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoadingTafsir(true);
    setTafsirDetail({ surahNum, ayahNum, arabicText: '', tafsirText: '', edition: selectedEdition });
    try {
      const { arabicText, tafsirText } = await fetchTafsir(surahNum, ayahNum, selectedEdition);
      setTafsirDetail({ surahNum, ayahNum, arabicText, tafsirText, edition: selectedEdition });
    } catch {
      setTafsirDetail(prev => prev ? { ...prev, tafsirText: 'تعذر تحميل التفسير' } : null);
    } finally {
      setLoadingTafsir(false);
    }
  }, [selectedEdition]);

  const renderResult = useCallback(({ item }: { item: SearchResult }) => {
    const surahName = SURAH_NAMES_AR[item.surah.number] || item.surah.name;
    return (
      <TouchableOpacity
        style={[s.resultCard, { backgroundColor: 'rgba(120,120,128,0.12)', borderColor: colors.border }]}
        onPress={() => handleOpenTafsir(item.surah.number, item.numberInSurah)}
        activeOpacity={0.8}
      >
        <View style={s.resultHeader}>
          <View style={[s.surahBadge, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[s.surahBadgeText, { color: colors.primary }]}>
              {surahName} ({item.surah.number}:{item.numberInSurah})
            </Text>
          </View>
          <View style={[s.juzBadge, { backgroundColor: 'rgba(120,120,128,0.12)', borderColor: colors.border }]}>
            <Text style={[s.juzBadgeText, { color: colors.muted }]}>ج {item.juz}</Text>
          </View>
        </View>
        <Text style={[s.resultText, { color: colors.foreground, fontSize: searchLang === 'ar' ? 18 : 14 }]}>
          <HighlightText text={item.text} query={query} color={colors.primary} />
        </Text>
        <View style={s.resultFooter}>
          <TouchableOpacity
            style={[s.tafsirBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleOpenTafsir(item.surah.number, item.numberInSurah)}
          >
            <Text style={s.tafsirBtnText}>التفسير</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [colors, query, searchLang, handleOpenTafsir]);

  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { fontSize: 22, fontWeight: '800', color: colors.foreground, textAlign: 'right', marginBottom: 14 },
    // Search bar
    searchRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    inputWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 14, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 14,
    },
    input: { flex: 1, height: 46, fontSize: 16, color: colors.foreground, textAlign: 'right' },
    clearBtn: { padding: 4 },
    searchBtn: {
      backgroundColor: colors.primary, borderRadius: 14,
      paddingHorizontal: 18, justifyContent: 'center',
    },
    searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    // Lang toggle
    langRow: { flexDirection: 'row', gap: 10 },
    langBtn: {
      flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center',
      backgroundColor: 'rgba(120,120,128,0.12)', borderWidth: 1, borderColor: colors.border,
    },
    langBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    langBtnText: { fontSize: 13, fontWeight: '700', color: colors.muted },
    langBtnTextActive: { color: '#fff' },
    // Tafsir edition chips
    editionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
    editionChip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: 'rgba(120,120,128,0.12)', borderWidth: 1, borderColor: colors.border,
    },
    editionChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    editionChipText: { fontSize: 12, fontWeight: '700', color: colors.muted },
    editionChipTextActive: { color: '#fff' },
    editionLabel: { fontSize: 12, color: colors.muted, paddingHorizontal: 16, paddingBottom: 6, textAlign: 'right' },
    // Results
    resultCount: { fontSize: 13, color: colors.muted, textAlign: 'right', paddingHorizontal: 16, paddingVertical: 8 },
    resultCard: {
      marginHorizontal: 14, marginVertical: 6, borderRadius: 16,
      padding: 16, borderWidth: 1,
    },
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    surahBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
    surahBadgeText: { fontSize: 12, fontWeight: '700' },
    juzBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
    juzBadgeText: { fontSize: 12 },
    resultText: { textAlign: 'right', lineHeight: 30, marginBottom: 10 },
    resultFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
    tafsirBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 },
    tafsirBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    // Empty
    emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 52, marginBottom: 12 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground, marginBottom: 6 },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
    // Tafsir Modal
    modalWrap: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    modalTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.foreground },
    closeBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(120,120,128,0.12)' },
    modalContent: { padding: 20 },
    ayahRef: { fontSize: 14, color: colors.primary, textAlign: 'right', fontWeight: '700', marginBottom: 10 },
    arabicBox: {
      backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: colors.border, marginBottom: 16,
    },
    arabicText: { fontSize: 22, color: colors.foreground, textAlign: 'right', lineHeight: 42 },
    editionTabsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    editionTab: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: 'rgba(120,120,128,0.12)', borderWidth: 1, borderColor: colors.border,
    },
    editionTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    editionTabText: { fontSize: 12, fontWeight: '700', color: colors.muted },
    editionTabTextActive: { color: '#fff' },
    tafsirTitle: { fontSize: 15, fontWeight: '800', color: colors.primary, textAlign: 'right', marginBottom: 10 },
    tafsirText: { fontSize: 16, color: colors.foreground, textAlign: 'right', lineHeight: 32 },
  });

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="chevron-forward" size={26} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[s.title, { marginBottom: 0, flex: 1 }]}>البحث في التفسير</Text>
            <View style={{ width: 34 }} />
          </View>
          {/* Search Row */}
          <View style={s.searchRow}>
            <View style={s.inputWrap}>
              {query.length > 0 && (
                <TouchableOpacity style={s.clearBtn} onPress={() => { setQuery(''); setResults([]); setHasSearched(false); }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
                </TouchableOpacity>
              )}
              <TextInput
                ref={inputRef}
                style={s.input}
                placeholder="ابحث في القرآن..."
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity style={s.searchBtn} onPress={handleSearch}>
              <Text style={s.searchBtnText}>بحث</Text>
            </TouchableOpacity>
          </View>
          {/* Lang toggle */}
          <View style={s.langRow}>
            <NativeTabs
              tabs={[
                { key: 'ar', label: 'عربي' },
                { key: 'en', label: 'English' },
              ]}
              selected={searchLang}
              onSelect={(key) => setSearchLang(key as 'ar' | 'en')}
              indicatorColor="#2f7659"
            />
          </View>
        </View>

        {/* Tafsir Edition Selector */}
        <Text style={s.editionLabel}>عرض التفسير بـ:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.editionRow}>
          {TAFSIR_EDITIONS.map(ed => (
            <TouchableOpacity
              key={ed.identifier}
              style={[s.editionChip, selectedEdition === ed.identifier && s.editionChipActive]}
              onPress={() => setSelectedEdition(ed.identifier)}
            >
              <Text style={[s.editionChipText, selectedEdition === ed.identifier && s.editionChipTextActive]}>
                {ed.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            {hasSearched && (
              <Text style={s.resultCount}>
                {resultCount > 0 ? `${resultCount} نتيجة` : 'لا توجد نتائج'}
              </Text>
            )}
            <FlatList
              data={results}
              keyExtractor={item => `${item.surah.number}_${item.numberInSurah}`}
              renderItem={renderResult}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                hasSearched ? (
                  <View style={s.emptyWrap}>
                    <MaterialCommunityIcons name="magnify" size={52} color={colors.muted} style={{ marginBottom: 12 }} />
                    <Text style={s.emptyTitle}>لا توجد نتائج</Text>
                    <Text style={s.emptyText}>جرّب البحث بكلمات مختلفة أو غيّر لغة البحث</Text>
                  </View>
                ) : (
                  <View style={s.emptyWrap}>
                    <MaterialCommunityIcons name="book-search" size={52} color={colors.muted} style={{ marginBottom: 12 }} />
                    <Text style={s.emptyTitle}>ابحث في القرآن</Text>
                    <Text style={s.emptyText}>ابحث بالكلمة أو العبارة لإيجاد الآيات وقراءة تفسيرها</Text>
                  </View>
                )
              }
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </>
        )}
      </KeyboardAvoidingView>

      {/* Tafsir Detail Modal */}
      <Modal
        visible={tafsirDetail !== null}
        animationType="slide"
        onRequestClose={() => setTafsirDetail(null)}
      >
        <View style={s.modalWrap}>
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.closeBtn} onPress={() => setTafsirDetail(null)}>
              <MaterialCommunityIcons name="close" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>التفسير</Text>
            <View style={{ width: 36 }} />
          </View>

          {loadingTafsir ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
          ) : tafsirDetail && (
            <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={s.ayahRef}>
                {SURAH_NAMES_AR[tafsirDetail.surahNum]} • آية {tafsirDetail.ayahNum}
              </Text>
              {tafsirDetail.arabicText ? (
                <View style={s.arabicBox}>
                  <Text style={s.arabicText}>{tafsirDetail.arabicText}</Text>
                </View>
              ) : null}
              {/* Edition Tabs */}
              <View style={s.editionTabsWrap}>
                {allModalEditions.map(ed => (
                  <TouchableOpacity
                    key={ed.identifier}
                    style={[s.editionTab, selectedEdition === ed.identifier && s.editionTabActive]}
                    onPress={async () => {
                      setSelectedEdition(ed.identifier);
                      setLoadingTafsir(true);
                      try {
                        const { tafsirText } = await fetchTafsir(tafsirDetail.surahNum, tafsirDetail.ayahNum, ed.identifier);
                        setTafsirDetail(prev => prev ? { ...prev, tafsirText, edition: ed.identifier } : null);
                      } catch {}
                      setLoadingTafsir(false);
                    }}
                  >
                    <Text style={[s.editionTabText, selectedEdition === ed.identifier && s.editionTabTextActive]}>
                      {ed.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.tafsirTitle}>{allModalEditions.find(e => e.identifier === selectedEdition)?.name}</Text>
              <Text style={s.tafsirText}>{tafsirDetail.tafsirText || 'لا يتوفر تفسير'}</Text>
              <View style={{ height: 60 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}
