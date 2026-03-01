/**
 * Enhanced Quran Search Screen — بحث متقدم في القرآن
 * بحث بالعربية والترجمة، تظليل النتائج، فلترة بالسورة/الجزء،
 * اقتراحات فورية، إحصائيات البحث
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  SURAH_NAMES_AR, TAFSIR_EDITIONS,
  fetchTafsir, searchQuran, TRANSLATION_EDITIONS,
} from '@/lib/quran-api';
import { addBookmark, isBookmarked } from '@/lib/storage';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Highlighted Text Component ──────────────────────────────────────────────
function HighlightText({ text, query, bgColor, textColor }: {
  text: string; query: string; bgColor: string; textColor: string;
}) {
  if (!query.trim() || !text) return <Text style={{ color: textColor }}>{text}</Text>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <Text>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? (
            <Text key={i} style={{
              backgroundColor: bgColor + '40',
              color: bgColor,
              fontWeight: '800',
              borderRadius: 3,
              paddingHorizontal: 2,
            }}>
              {part}
            </Text>
          )
          : <Text key={i} style={{ color: textColor }}>{part}</Text>
      )}
    </Text>
  );
}

// ─── Search History Key ───────────────────────────────────────────────────────
const HISTORY_KEY = '@quran_search_history';

export default function QuranSearchScreen() {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLang, setSearchLang] = useState<'ar' | 'en'>('ar');
  const [surahFilter, setSurahFilter] = useState<number | null>(null);
  const [selectedEdition, setSelectedEdition] = useState('ar.muyassar');
  const [tafsirDetail, setTafsirDetail] = useState<TafsirDetail | null>(null);
  const [loadingTafsir, setLoadingTafsir] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [showSurahFilter, setShowSurahFilter] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const resultAnim = useRef(new Animated.Value(0)).current;

  // Load search history
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then(v => {
      if (v) setSearchHistory(JSON.parse(v));
    });
  }, []);

  const saveToHistory = useCallback(async (q: string) => {
    const updated = [q, ...searchHistory.filter(h => h !== q)].slice(0, 10);
    setSearchHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }, [searchHistory]);

  const clearHistory = useCallback(async () => {
    setSearchHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
  }, []);

  const editionForLang = searchLang === 'ar' ? 'ar.muyassar' : 'en.sahih';

  const handleSearch = useCallback(async (searchQ?: string) => {
    const q = (searchQ || query).trim();
    if (!q || q.length < 2) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setLoading(true);
    setHasSearched(true);
    setResults([]);
    resultAnim.setValue(0);

    try {
      const surahParam = surahFilter ? String(surahFilter) : 'all';
      const res = await searchQuran(q, editionForLang, surahParam);
      const matches = res.matches || [];
      setResults(matches);
      setResultCount(res.count || matches.length);

      // Check bookmarks for all results
      const bmap: Record<string, boolean> = {};
      await Promise.all(matches.slice(0, 30).map(async (r: SearchResult) => {
        const key = `${r.surah.number}_${r.numberInSurah}`;
        bmap[key] = await isBookmarked(r.surah.number, r.numberInSurah);
      }));
      setBookmarkedMap(bmap);

      // Animate results
      Animated.timing(resultAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

      await saveToHistory(q);
    } catch {
      setResults([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  }, [query, editionForLang, surahFilter, saveToHistory, resultAnim]);

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

  const handleBookmarkResult = useCallback(async (result: SearchResult) => {
    const key = `${result.surah.number}_${result.numberInSurah}`;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addBookmark({
      surahNumber: result.surah.number,
      ayahNumber: result.numberInSurah,
      surahName: SURAH_NAMES_AR[result.surah.number - 1] || result.surah.name,
      ayahText: result.text,
    });
    setBookmarkedMap(prev => ({ ...prev, [key]: true }));
  }, []);

  // Stats: unique surahs, juz distribution
  const statsData = hasSearched && results.length > 0 ? {
    uniqueSurahs: new Set(results.map(r => r.surah.number)).size,
    uniqueJuz: new Set(results.map(r => r.juz)).size,
    topSurah: (() => {
      const counts: Record<number, number> = {};
      results.forEach(r => { counts[r.surah.number] = (counts[r.surah.number] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return top ? { name: SURAH_NAMES_AR[Number(top[0]) - 1], count: top[1] } : null;
    })(),
  } : null;

  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: '800', color: colors.foreground, textAlign: 'right', marginBottom: 12 },
    // Search row
    searchRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    inputWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1.5,
      borderColor: hasSearched ? colors.primary : colors.border, paddingHorizontal: 12,
    },
    input: { flex: 1, height: 46, fontSize: 16, color: colors.foreground, textAlign: 'right' },
    clearBtn: { padding: 4 },
    searchBtn: {
      backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 16,
      justifyContent: 'center',
    },
    searchBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    // Lang toggle
    controlsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    controlChip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    controlChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    controlChipText: { fontSize: 12, fontWeight: '700', color: colors.muted },
    controlChipTextActive: { color: '#fff' },
    // Filter bar
    filterBar: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 8, backgroundColor: colors.surface,
      borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
    },
    filterChip: {
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
      backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '30',
    },
    filterChipText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    filterClearBtn: { padding: 4 },
    // Stats bar
    statsBar: {
      flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
      backgroundColor: colors.primary + '08', borderBottomWidth: 1, borderBottomColor: colors.border,
      gap: 12, flexWrap: 'wrap',
    },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statNum: { fontSize: 14, fontWeight: '800', color: colors.primary },
    statLabel: { fontSize: 11, color: colors.muted },
    // Result count
    resultCount: {
      fontSize: 13, color: colors.muted, textAlign: 'right',
      paddingHorizontal: 16, paddingVertical: 6,
    },
    // Result card
    resultCard: {
      marginHorizontal: 12, marginVertical: 5, borderRadius: 16,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    resultCardHeader: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
      paddingTop: 12, paddingBottom: 6, gap: 8,
    },
    surahBadge: {
      backgroundColor: colors.primary + '15', borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    surahBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    juzBadge: {
      backgroundColor: colors.surface, borderRadius: 16,
      paddingHorizontal: 8, paddingVertical: 4,
      borderWidth: 1, borderColor: colors.border,
    },
    juzText: { fontSize: 11, color: colors.muted },
    flex1: { flex: 1 },
    bookmarkBtn: { padding: 6 },
    ayahText: {
      fontSize: searchLang === 'ar' ? 18 : 14,
      paddingHorizontal: 14, paddingBottom: 10,
      lineHeight: searchLang === 'ar' ? 34 : 22,
      textAlign: 'right',
    },
    // Actions
    resultActions: {
      flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: colors.border,
    },
    resultActionBtn: {
      flex: 1, paddingVertical: 9, alignItems: 'center',
      flexDirection: 'row', justifyContent: 'center', gap: 5,
    },
    resultActionText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    actionDivider: { width: 0.5, backgroundColor: colors.border },
    // History
    historyWrap: { paddingHorizontal: 16, paddingTop: 12 },
    historyTitle: { fontSize: 14, fontWeight: '700', color: colors.muted, textAlign: 'right', marginBottom: 8 },
    historyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    historyChip: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    historyChipText: { fontSize: 13, color: colors.foreground },
    // Empty
    emptyWrap: { alignItems: 'center', paddingTop: 60 },
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
    closeBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.surface },
    modalContent: { padding: 20 },
    ayahRef: { fontSize: 14, color: colors.primary, textAlign: 'right', fontWeight: '700', marginBottom: 10 },
    arabicBox: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: colors.border, marginBottom: 16,
    },
    arabicTextLarge: { fontSize: 22, color: colors.foreground, textAlign: 'right', lineHeight: 42 },
    editionTabsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    editionTab: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    editionTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    editionTabText: { fontSize: 12, fontWeight: '700', color: colors.muted },
    editionTabTextActive: { color: '#fff' },
    tafsirTitle: { fontSize: 15, fontWeight: '800', color: colors.primary, textAlign: 'right', marginBottom: 10 },
    tafsirText: { fontSize: 16, color: colors.foreground, textAlign: 'right', lineHeight: 32 },
    // Surah filter modal
    surahModalWrap: { flex: 1, backgroundColor: colors.background },
    surahModalHeader: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    surahItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    surahNum: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '15',
      justifyContent: 'center', alignItems: 'center', marginLeft: 12,
    },
    surahNumText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    surahItemName: { flex: 1, fontSize: 16, color: colors.foreground, textAlign: 'right', fontWeight: '600' },
  });

  const renderResult = useCallback(({ item, index }: { item: SearchResult; index: number }) => {
    const surahName = SURAH_NAMES_AR[item.surah.number - 1] || item.surah.name;
    const key = `${item.surah.number}_${item.numberInSurah}`;
    const isBookmarkedItem = bookmarkedMap[key];

    return (
      <Animated.View style={[
        s.resultCard,
        {
          opacity: resultAnim,
          transform: [{ translateY: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        },
      ]}>
        {/* Header */}
        <View style={s.resultCardHeader}>
          <TouchableOpacity
            style={s.bookmarkBtn}
            onPress={() => !isBookmarkedItem && handleBookmarkResult(item)}
          >
            <IconSymbol
              name={isBookmarkedItem ? 'star.fill' : 'star'}
              size={18}
              color={isBookmarkedItem ? '#F59E0B' : colors.muted}
            />
          </TouchableOpacity>
          <View style={s.flex1} />
          <View style={s.juzBadge}>
            <Text style={s.juzText}>ج{item.juz}</Text>
          </View>
          <View style={s.surahBadge}>
            <Text style={s.surahBadgeText}>{surahName} ({item.surah.number}:{item.numberInSurah})</Text>
          </View>
        </View>

        {/* Highlighted text */}
        <Text style={s.ayahText}>
          <HighlightText
            text={item.text}
            query={query}
            bgColor={colors.primary}
            textColor={colors.foreground}
          />
        </Text>

        {/* Actions */}
        <View style={s.resultActions}>
          <TouchableOpacity
            style={s.resultActionBtn}
            onPress={() => handleOpenTafsir(item.surah.number, item.numberInSurah)}
          >
            <IconSymbol name="book" size={14} color={colors.primary} />
            <Text style={s.resultActionText}>التفسير</Text>
          </TouchableOpacity>
          <View style={s.actionDivider} />
          <TouchableOpacity
            style={s.resultActionBtn}
            onPress={() => handleBookmarkResult(item)}
            disabled={isBookmarkedItem}
          >
            <IconSymbol
              name={isBookmarkedItem ? 'star.fill' : 'star'}
              size={14}
              color={isBookmarkedItem ? '#F59E0B' : colors.primary}
            />
            <Text style={[s.resultActionText, isBookmarkedItem && { color: '#F59E0B' }]}>
              {isBookmarkedItem ? 'محفوظة' : 'حفظ'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }, [colors, query, searchLang, bookmarkedMap, handleOpenTafsir, handleBookmarkResult, resultAnim]);

  const tafsirEditionName = TAFSIR_EDITIONS.find(e => e.identifier === selectedEdition)?.name || '';

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>🔍 البحث في القرآن</Text>

          {/* Search Row */}
          <View style={s.searchRow}>
            <View style={s.inputWrap}>
              {query.length > 0 && (
                <TouchableOpacity style={s.clearBtn} onPress={() => { setQuery(''); setResults([]); setHasSearched(false); }}>
                  <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
                </TouchableOpacity>
              )}
              <TextInput
                ref={inputRef}
                style={s.input}
                placeholder={searchLang === 'ar' ? 'ابحث بالعربية...' : 'Search in English...'}
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={() => handleSearch()}
                autoCorrect={false}
              />
              <IconSymbol name="magnifyingglass" size={16} color={colors.muted} style={{ marginRight: 4 }} />
            </View>
            <TouchableOpacity style={s.searchBtn} onPress={() => handleSearch()} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.searchBtnText}>بحث</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Controls Row */}
          <View style={s.controlsRow}>
            {/* Language */}
            <TouchableOpacity
              style={[s.controlChip, searchLang === 'ar' && s.controlChipActive]}
              onPress={() => setSearchLang('ar')}
            >
              <Text style={[s.controlChipText, searchLang === 'ar' && s.controlChipTextActive]}>🇸🇦 عربي</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.controlChip, searchLang === 'en' && s.controlChipActive]}
              onPress={() => setSearchLang('en')}
            >
              <Text style={[s.controlChipText, searchLang === 'en' && s.controlChipTextActive]}>🇬🇧 English</Text>
            </TouchableOpacity>

            {/* Surah filter */}
            <TouchableOpacity
              style={[s.controlChip, surahFilter !== null && s.controlChipActive]}
              onPress={() => setShowSurahFilter(true)}
            >
              <IconSymbol name="line.3.horizontal.decrease" size={12} color={surahFilter !== null ? '#fff' : colors.muted} />
              <Text style={[s.controlChipText, surahFilter !== null && s.controlChipTextActive]}>
                {surahFilter ? SURAH_NAMES_AR[surahFilter - 1] : 'كل السور'}
              </Text>
            </TouchableOpacity>

            {/* Stats toggle */}
            {hasSearched && results.length > 0 && (
              <TouchableOpacity
                style={[s.controlChip, showStats && s.controlChipActive]}
                onPress={() => setShowStats(v => !v)}
              >
                <Text style={[s.controlChipText, showStats && s.controlChipTextActive]}>📊 إحصاء</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Active Filter Banner */}
        {surahFilter && (
          <View style={s.filterBar}>
            <TouchableOpacity style={s.filterClearBtn} onPress={() => setSurahFilter(null)}>
              <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: colors.muted, flex: 1, textAlign: 'right' }}>
              فلتر نشط:
            </Text>
            <View style={s.filterChip}>
              <Text style={s.filterChipText}>📖 {SURAH_NAMES_AR[surahFilter - 1]}</Text>
            </View>
          </View>
        )}

        {/* Stats Bar */}
        {showStats && statsData && (
          <View style={s.statsBar}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{resultCount}</Text>
              <Text style={s.statLabel}> نتيجة</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum}>{statsData.uniqueSurahs}</Text>
              <Text style={s.statLabel}> سورة</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statNum}>{statsData.uniqueJuz}</Text>
              <Text style={s.statLabel}> جزء</Text>
            </View>
            {statsData.topSurah && (
              <View style={s.statItem}>
                <Text style={s.statNum}>{statsData.topSurah.count}x</Text>
                <Text style={s.statLabel}> {statsData.topSurah.name}</Text>
              </View>
            )}
          </View>
        )}

        {/* Result Count */}
        {hasSearched && !loading && (
          <Text style={s.resultCount}>
            {resultCount > 0
              ? `${resultCount} نتيجة ${surahFilter ? `في ${SURAH_NAMES_AR[surahFilter - 1]}` : 'في القرآن الكريم'}`
              : 'لا توجد نتائج — جرّب كلمات مختلفة'
            }
          </Text>
        )}

        {/* Results / History / Empty */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>جاري البحث...</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => `${item.surah.number}_${item.numberInSurah}`}
            renderItem={renderResult}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              !hasSearched ? (
                <View style={s.historyWrap}>
                  {/* Search History */}
                  {searchHistory.length > 0 && (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <TouchableOpacity onPress={clearHistory}>
                          <Text style={{ fontSize: 12, color: colors.muted }}>مسح</Text>
                        </TouchableOpacity>
                        <Text style={s.historyTitle}>🕐 عمليات البحث الأخيرة</Text>
                      </View>
                      <View style={s.historyRow}>
                        {searchHistory.map((h, i) => (
                          <TouchableOpacity
                            key={i}
                            style={s.historyChip}
                            onPress={() => { setQuery(h); handleSearch(h); }}
                          >
                            <Text style={s.historyChipText}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  {/* Suggestions */}
                  <Text style={[s.historyTitle, { marginTop: 20 }]}>💡 جرّب البحث عن</Text>
                  <View style={s.historyRow}>
                    {['الصبر', 'الرحمة', 'التوبة', 'mercy', 'paradise', 'prayer'].map((s_) => (
                      <TouchableOpacity key={s_} style={s.historyChip} onPress={() => { setQuery(s_); setSearchLang(s_.match(/[a-z]/i) ? 'en' : 'ar'); handleSearch(s_); }}>
                        <Text style={s.historyChipText}>{s_}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={[s.emptyWrap, { paddingTop: 40 }]}>
                    <Text style={s.emptyEmoji}>🔍</Text>
                    <Text style={s.emptyTitle}>ابحث في القرآن الكريم</Text>
                    <Text style={s.emptyText}>ابحث بالكلمة أو العبارة بالعربية أو الإنجليزية</Text>
                  </View>
                </View>
              ) : (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyEmoji}>🤔</Text>
                  <Text style={s.emptyTitle}>لا توجد نتائج</Text>
                  <Text style={s.emptyText}>جرّب كلمات مختلفة أو غيّر لغة البحث</Text>
                </View>
              )
            }
          />
        )}
      </KeyboardAvoidingView>

      {/* ── Tafsir Detail Modal ── */}
      <Modal
        visible={tafsirDetail !== null}
        animationType="slide"
        onRequestClose={() => setTafsirDetail(null)}
      >
        <View style={s.modalWrap}>
          <View style={s.modalHeader}>
            <TouchableOpacity style={s.closeBtn} onPress={() => setTafsirDetail(null)}>
              <IconSymbol name="xmark" size={18} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>التفسير</Text>
            <View style={{ width: 36 }} />
          </View>

          {loadingTafsir ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
          ) : tafsirDetail && (
            <ScrollView style={s.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={s.ayahRef}>
                {SURAH_NAMES_AR[tafsirDetail.surahNum - 1]} • آية {tafsirDetail.ayahNum}
              </Text>

              {tafsirDetail.arabicText ? (
                <View style={s.arabicBox}>
                  <Text style={s.arabicTextLarge}>{tafsirDetail.arabicText}</Text>
                </View>
              ) : null}

              {/* Edition Tabs */}
              <View style={s.editionTabsWrap}>
                {TAFSIR_EDITIONS.map(ed => (
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

              <Text style={s.tafsirTitle}>📖 {tafsirEditionName}</Text>
              <Text style={s.tafsirText}>{tafsirDetail.tafsirText || 'لا يتوفر تفسير'}</Text>
              <View style={{ height: 60 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ── Surah Filter Modal ── */}
      <Modal
        visible={showSurahFilter}
        animationType="slide"
        onRequestClose={() => setShowSurahFilter(false)}
      >
        <View style={s.surahModalWrap}>
          <View style={s.surahModalHeader}>
            <TouchableOpacity onPress={() => setShowSurahFilter(false)}>
              <IconSymbol name="xmark" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { flex: 1 }]}>اختر السورة للفلترة</Text>
          </View>
          <TouchableOpacity
            style={[s.surahItem, { backgroundColor: surahFilter === null ? colors.primary + '12' : 'transparent' }]}
            onPress={() => { setSurahFilter(null); setShowSurahFilter(false); }}
          >
            <Text style={[s.surahItemName, surahFilter === null && { color: colors.primary }]}>كل السور</Text>
            {surahFilter === null && <IconSymbol name="checkmark" size={16} color={colors.primary} />}
          </TouchableOpacity>
          <FlatList
            data={Array.from({ length: 114 }, (_, i) => i + 1)}
            keyExtractor={n => n.toString()}
            renderItem={({ item: n }) => (
              <TouchableOpacity
                style={[s.surahItem, surahFilter === n && { backgroundColor: colors.primary + '12' }]}
                onPress={() => { setSurahFilter(n); setShowSurahFilter(false); }}
              >
                {surahFilter === n && <IconSymbol name="checkmark" size={16} color={colors.primary} style={{ marginLeft: 8 }} />}
                <Text style={[s.surahItemName, surahFilter === n && { color: colors.primary }]}>
                  {SURAH_NAMES_AR[n - 1]}
                </Text>
                <View style={s.surahNum}><Text style={s.surahNumText}>{n}</Text></View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}
