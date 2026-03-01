import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchSurahs, Surah, searchQuran, SURAH_NAMES_AR } from '@/lib/quran-api';
import { getBookmarks, Bookmark } from '@/lib/storage';
import { useSettings } from '@/lib/settings-context';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
type TabType = 'surahs' | 'juz' | 'search' | 'bookmarks';
type SearchMode = 'ayah' | 'surah';
type SearchLang = 'arabic' | 'translation' | 'both';

interface SearchResult {
  number: number;
  text: string;
  surah: { number: number; name: string; englishName: string };
  numberInSurah: number;
  translation?: string;
}

// ─────────────────────────────────────────────
//  JUZ data
// ─────────────────────────────────────────────
const JUZ_DATA = Array.from({ length: 30 }, (_, i) => ({
  number: i + 1,
  name: `الجزء ${i + 1}`,
  startSurah: [1,2,2,3,4,4,5,6,7,8,9,10,12,15,17,18,19,21,23,25,27,29,33,36,39,41,46,49,52,56][i],
}));

const SEARCH_HISTORY_KEY = '@quran_search_history';
const MAX_HISTORY = 8;

// ─────────────────────────────────────────────
//  HighlightText — highlights search term
// ─────────────────────────────────────────────
function HighlightText({
  text,
  highlight,
  style,
  highlightStyle,
}: {
  text: string;
  highlight: string;
  style?: any;
  highlightStyle?: any;
}) {
  if (!highlight.trim()) return <Text style={style}>{text}</Text>;
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Text key={i} style={highlightStyle}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function QuranScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { settings } = useSettings();

  // ── tabs ──
  const [activeTab, setActiveTab] = useState<TabType>((params.tab as TabType) || 'surahs');

  // ── surahs ──
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [filteredSurahs, setFilteredSurahs] = useState<Surah[]>([]);
  const [surahsLoading, setSurahsLoading] = useState(true);
  const [surahFilter, setSurahFilter] = useState('');

  // ── bookmarks ──
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // ── search ──
  const [searchMode, setSearchMode] = useState<SearchMode>('ayah');
  const [searchLang, setSearchLang] = useState<SearchLang>('arabic');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurahFilter, setSelectedSurahFilter] = useState<number | null>(null); // null = all
  const [showSurahPicker, setShowSurahPicker] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // ─────────────── init ───────────────
  useEffect(() => {
    if (params.tab) setActiveTab(params.tab as TabType);
  }, [params.tab]);

  useEffect(() => {
    fetchSurahs()
      .then(data => { setSurahs(data); setFilteredSurahs(data); setSurahsLoading(false); })
      .catch(() => setSurahsLoading(false));
    loadSearchHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'bookmarks') getBookmarks().then(setBookmarks);
    if (activeTab === 'search') loadSearchHistory();
  }, [activeTab]);

  // ─────────────── history ───────────────
  const loadSearchHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (raw) setSearchHistory(JSON.parse(raw));
    } catch {}
  };

  const saveToHistory = async (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...searchHistory.filter(h => h !== query)].slice(0, MAX_HISTORY);
    setSearchHistory(updated);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  };

  const clearHistory = async () => {
    setSearchHistory([]);
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  // ─────────────── surah filter ───────────────
  const filterSurahs = useCallback((query: string) => {
    setSurahFilter(query);
    if (!query.trim()) { setFilteredSurahs(surahs); return; }
    const q = query.toLowerCase();
    setFilteredSurahs(surahs.filter(s =>
      s.englishName.toLowerCase().includes(q) ||
      s.name.includes(query) ||
      (SURAH_NAMES_AR[s.number - 1] || '').includes(query) ||
      String(s.number).includes(query)
    ));
  }, [surahs]);

  // ─────────────── search logic ───────────────
  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError('');
      return;
    }
    setSearchLoading(true);
    setSearchError('');
    setHasSearched(true);

    try {
      const surahScope = selectedSurahFilter ? String(selectedSurahFilter) : 'all';
      let results: SearchResult[] = [];

      if (searchMode === 'surah') {
        // Filter surah list locally
        const q = query.toLowerCase();
        const matched = surahs.filter(s =>
          s.englishName.toLowerCase().includes(q) ||
          (SURAH_NAMES_AR[s.number - 1] || '').includes(query) ||
          String(s.number).includes(query)
        );
        // Convert Surah to SearchResult-like for unified display
        setSearchResults(matched.map(s => ({
          number: s.number,
          text: SURAH_NAMES_AR[s.number - 1] || s.name,
          surah: { number: s.number, name: s.name, englishName: s.englishName },
          numberInSurah: 0,
          translation: `${s.englishName} • ${s.numberOfAyahs} آية • ${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}`,
        })));
        setSearchLoading(false);
        return;
      }

      // Ayah search
      if (searchLang === 'arabic' || searchLang === 'both') {
        const arRes = await searchQuran(query, 'quran-uthmani', surahScope);
        results = [...results, ...(arRes.matches || [])];
      }

      if (searchLang === 'translation' || searchLang === 'both') {
        const transRes = await searchQuran(query, settings.translationEdition, surahScope);
        // Merge without duplicates
        const existingNums = new Set(results.map(r => r.number));
        const transMatches = (transRes.matches || []).map((m: any) => ({
          ...m,
          translation: m.text,
          text: results.find(r => r.number === m.number)?.text || '',
        }));
        transMatches.forEach((m: SearchResult) => {
          if (!existingNums.has(m.number)) results.push(m);
          else {
            const idx = results.findIndex(r => r.number === m.number);
            if (idx !== -1) results[idx].translation = m.translation;
          }
        });
      }

      // Sort by surah then ayah
      results.sort((a, b) => a.number - b.number);
      setSearchResults(results);
      await saveToHistory(query);
    } catch (e) {
      setSearchError('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchMode, searchLang, selectedSurahFilter, surahs, settings.translationEdition]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setSearchError('');
      return;
    }
    searchTimeout.current = setTimeout(() => doSearch(query), 500);
  }, [doSearch]);

  const handleHistoryPress = (h: string) => {
    setSearchQuery(h);
    doSearch(h);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setSearchError('');
    searchInputRef.current?.focus();
  };

  // ─────────────── styles ───────────────
  const s = StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 24, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: 12, fontWeight: '600', color: colors.muted },
    tabTextActive: { color: '#fff' },

    // ── search box ──
    searchBoxWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      height: 50,
    },
    searchBoxFocused: { borderColor: colors.primary },
    input: {
      flex: 1,
      paddingVertical: 0,
      paddingHorizontal: 10,
      fontSize: 17,
      color: colors.foreground,
      textAlign: 'right',
    },

    // ── mode row ──
    modeRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
      marginTop: 10,
      marginBottom: 4,
    },
    modeBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    modeBtnText: { fontSize: 13, fontWeight: '600', color: colors.muted },
    modeBtnTextActive: { color: '#fff' },

    // ── lang row ──
    langRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 10,
    },
    langBtn: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    langBtnActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
    langBtnText: { fontSize: 12, color: colors.muted },
    langBtnTextActive: { color: colors.primary, fontWeight: '700' },

    // ── surah scope picker ──
    scopeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 10,
      gap: 8,
    },
    scopeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: selectedSurahFilter ? colors.primary : colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    scopeBtnText: {
      fontSize: 14,
      color: selectedSurahFilter ? colors.primary : colors.muted,
      fontWeight: selectedSurahFilter ? '700' : '400',
    },
    clearScopeBtn: {
      padding: 6,
    },

    // ── stats bar ──
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    statsText: { fontSize: 13, color: colors.muted, fontWeight: '600' },

    // ── result item ──
    resultItem: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    resultRef: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '700',
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    resultAyahNum: {
      fontSize: 12,
      color: colors.muted,
      backgroundColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    resultAr: {
      fontSize: 18,
      color: colors.foreground,
      textAlign: 'right',
      lineHeight: 34,
    },
    resultHighlight: {
      color: colors.primary,
      fontWeight: '700',
      backgroundColor: colors.primary + '20',
    },
    resultTrans: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'left',
      marginTop: 6,
      lineHeight: 20,
      fontStyle: 'italic',
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
      paddingLeft: 8,
    },
    resultTransHighlight: {
      color: colors.gold,
      fontWeight: '700',
    },

    // ── surah result item ──
    surahResultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },

    // ── empty / error ──
    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, textAlign: 'center', marginBottom: 6 },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 22 },
    errorText: { fontSize: 15, color: colors.error, textAlign: 'center', marginTop: 60 },

    // ── history ──
    historySection: { paddingHorizontal: 20, paddingTop: 12 },
    historyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.muted,
      textAlign: 'right',
      marginBottom: 10,
    },
    historyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    historyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    historyChipText: { fontSize: 14, color: colors.foreground },
    clearHistoryBtn: { marginTop: 14, alignSelf: 'flex-end' },
    clearHistoryText: { fontSize: 13, color: colors.error },

    // ── surah list ──
    searchBox2: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 14,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input2: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 16, color: colors.foreground, textAlign: 'right' },
    surahItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border },
    numCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    numText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    surahInfo: { flex: 1, alignItems: 'flex-end' },
    nameAr: { fontSize: 18, fontWeight: '600', color: colors.foreground },
    nameEn: { fontSize: 12, color: colors.muted, marginTop: 2 },
    metaCol: { alignItems: 'flex-end' },
    ayahCount: { fontSize: 12, color: colors.muted },
    revType: { fontSize: 11, color: colors.primary, marginTop: 2 },

    // ── juz ──
    juzItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border },
    juzCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 14 },
    juzCircleText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    juzName: { fontSize: 18, fontWeight: '600', color: colors.foreground, textAlign: 'right' },

    // ── bookmarks ──
    bkItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border },
    bkSurah: { fontSize: 13, color: colors.primary, fontWeight: '600', textAlign: 'right' },
    bkText: { fontSize: 17, color: colors.foreground, textAlign: 'right', lineHeight: 30, marginTop: 4 },
    empty: { textAlign: 'center', color: colors.muted, fontSize: 16, marginTop: 60 },

    // ── surah picker modal ──
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '75%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    pickerSearch: { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
    pickerInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15, color: colors.foreground, textAlign: 'right' },
    pickerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: colors.border },
    pickerItemText: { flex: 1, fontSize: 16, color: colors.foreground, textAlign: 'right' },
    pickerItemNum: { fontSize: 13, color: colors.muted, marginLeft: 10 },
  });

  const TABS: { key: TabType; label: string }[] = [
    { key: 'surahs', label: 'السور' },
    { key: 'juz', label: 'الأجزاء' },
    { key: 'search', label: '🔍 البحث' },
    { key: 'bookmarks', label: 'المفضلة' },
  ];

  // ── surah picker state ──
  const [pickerFilter, setPickerFilter] = useState('');
  const pickerSurahs = surahs.filter(s =>
    !pickerFilter.trim() ||
    (SURAH_NAMES_AR[s.number - 1] || '').includes(pickerFilter) ||
    s.englishName.toLowerCase().includes(pickerFilter.toLowerCase()) ||
    String(s.number).includes(pickerFilter)
  );

  const selectedSurahName = selectedSurahFilter
    ? SURAH_NAMES_AR[selectedSurahFilter - 1]
    : null;

  // ── search tab UI ──
  const renderSearchTab = () => (
    <View style={{ flex: 1 }}>
      {/* Search Input */}
      <View style={s.searchBoxWrap}>
        <View style={s.searchBox}>
          <IconSymbol name="magnifyingglass" size={20} color={searchQuery ? colors.primary : colors.muted} />
          <TextInput
            ref={searchInputRef}
            style={s.input}
            placeholder="ابحث في القرآن الكريم..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(searchQuery)}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mode Buttons: في الآيات | في السور */}
      <View style={s.modeRow}>
        {([
          { key: 'ayah', label: '📖 في الآيات' },
          { key: 'surah', label: '🗂 في السور' },
        ] as { key: SearchMode; label: string }[]).map(m => (
          <TouchableOpacity
            key={m.key}
            style={[s.modeBtn, searchMode === m.key && s.modeBtnActive]}
            onPress={() => { setSearchMode(m.key); setSearchResults([]); setHasSearched(false); }}
            activeOpacity={0.7}
          >
            <Text style={[s.modeBtnText, searchMode === m.key && s.modeBtnTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Language filter (only for ayah mode) */}
      {searchMode === 'ayah' && (
        <View style={s.langRow}>
          {([
            { key: 'arabic', label: 'عربي' },
            { key: 'translation', label: 'ترجمة' },
            { key: 'both', label: 'كلاهما' },
          ] as { key: SearchLang; label: string }[]).map(l => (
            <TouchableOpacity
              key={l.key}
              style={[s.langBtn, searchLang === l.key && s.langBtnActive]}
              onPress={() => { setSearchLang(l.key); if (searchQuery) doSearch(searchQuery); }}
              activeOpacity={0.7}
            >
              <Text style={[s.langBtnText, searchLang === l.key && s.langBtnTextActive]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Surah scope picker (only for ayah mode) */}
      {searchMode === 'ayah' && (
        <View style={s.scopeRow}>
          <TouchableOpacity style={s.scopeBtn} onPress={() => setShowSurahPicker(true)} activeOpacity={0.7}>
            <Text style={s.scopeBtnText}>
              {selectedSurahName ? `سورة ${selectedSurahName}` : 'بحث في كل القرآن'}
            </Text>
            <IconSymbol name="chevron.down" size={14} color={selectedSurahFilter ? colors.primary : colors.muted} />
          </TouchableOpacity>
          {selectedSurahFilter && (
            <TouchableOpacity
              style={s.clearScopeBtn}
              onPress={() => { setSelectedSurahFilter(null); if (searchQuery) doSearch(searchQuery); }}
            >
              <IconSymbol name="xmark.circle.fill" size={22} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Stats bar */}
      {hasSearched && !searchLoading && (
        <View style={s.statsBar}>
          <Text style={s.statsText}>
            {searchResults.length > 0
              ? `${searchResults.length} نتيجة`
              : 'لا توجد نتائج'}
          </Text>
          {selectedSurahName && (
            <Text style={s.statsText}>في سورة {selectedSurahName}</Text>
          )}
        </View>
      )}

      {/* Loading */}
      {searchLoading && (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      )}

      {/* Error */}
      {!searchLoading && searchError ? (
        <Text style={s.errorText}>{searchError}</Text>
      ) : null}

      {/* Results */}
      {!searchLoading && !searchError && hasSearched && searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item, i) => `${item.number}_${i}`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (searchMode === 'surah') {
              return (
                <TouchableOpacity
                  style={s.surahResultItem}
                  onPress={() => router.push({ pathname: '/surah/[id]' as any, params: { id: item.surah.number } })}
                  activeOpacity={0.7}
                >
                  <View style={s.metaCol}>
                    <Text style={s.ayahCount}>{item.translation}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', marginHorizontal: 12 }}>
                    <HighlightText
                      text={item.text}
                      highlight={searchQuery}
                      style={s.nameAr}
                      highlightStyle={{ color: colors.primary, fontWeight: '700', backgroundColor: colors.primary + '20' }}
                    />
                    <Text style={s.nameEn}>{item.surah.englishName}</Text>
                  </View>
                  <View style={s.numCircle}>
                    <Text style={s.numText}>{item.surah.number}</Text>
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                style={s.resultItem}
                onPress={() => router.push({ pathname: '/surah/[id]' as any, params: { id: item.surah.number } })}
                activeOpacity={0.7}
              >
                <View style={s.resultHeader}>
                  <Text style={s.resultAyahNum}>آية {item.numberInSurah}</Text>
                  <Text style={s.resultRef}>
                    {SURAH_NAMES_AR[item.surah.number - 1] || item.surah.name}
                  </Text>
                </View>
                {item.text ? (
                  <HighlightText
                    text={item.text}
                    highlight={searchLang !== 'translation' ? searchQuery : ''}
                    style={s.resultAr}
                    highlightStyle={s.resultHighlight}
                  />
                ) : null}
                {item.translation ? (
                  <HighlightText
                    text={item.translation}
                    highlight={searchLang !== 'arabic' ? searchQuery : ''}
                    style={s.resultTrans}
                    highlightStyle={s.resultTransHighlight}
                  />
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Empty state */}
      {!searchLoading && !searchError && hasSearched && searchResults.length === 0 && (
        <View style={s.centerBox}>
          <Text style={s.emptyIcon}>🔍</Text>
          <Text style={s.emptyTitle}>لا توجد نتائج</Text>
          <Text style={s.emptyText}>
            لم نجد نتائج لـ "{searchQuery}"{'\n'}
            جرب كلمة أخرى أو غيّر نطاق البحث
          </Text>
        </View>
      )}

      {/* Initial state — show history */}
      {!hasSearched && !searchLoading && (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          {searchHistory.length > 0 ? (
            <View style={s.historySection}>
              <Text style={s.historyTitle}>عمليات البحث الأخيرة</Text>
              <View style={s.historyChips}>
                {searchHistory.map((h, i) => (
                  <TouchableOpacity key={i} style={s.historyChip} onPress={() => handleHistoryPress(h)} activeOpacity={0.7}>
                    <IconSymbol name="clock" size={14} color={colors.muted} />
                    <Text style={s.historyChipText}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={s.clearHistoryBtn} onPress={clearHistory}>
                <Text style={s.clearHistoryText}>مسح السجل</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.centerBox}>
              <Text style={s.emptyIcon}>📖</Text>
              <Text style={s.emptyTitle}>ابحث في القرآن الكريم</Text>
              <Text style={s.emptyText}>
                يمكنك البحث بكلمة عربية أو الترجمة{'\n'}
                أو البحث عن اسم سورة
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Surah Scope Picker Modal */}
      <Modal
        visible={showSurahPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSurahPicker(false)}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSurahPicker(false)}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowSurahPicker(false)}>
                <IconSymbol name="xmark" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={s.modalTitle}>اختر نطاق البحث</Text>
            </View>
            <View style={s.pickerSearch}>
              <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
              <TextInput
                style={s.pickerInput}
                placeholder="ابحث عن سورة..."
                placeholderTextColor={colors.muted}
                value={pickerFilter}
                onChangeText={setPickerFilter}
              />
            </View>
            <FlatList
              data={[{ number: 0, name: 'كل القرآن', englishName: 'All', numberOfAyahs: 6236, revelationType: 'Meccan' as const } as Surah, ...pickerSurahs]}
              keyExtractor={item => String(item.number)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.pickerItem}
                  onPress={() => {
                    setSelectedSurahFilter(item.number === 0 ? null : item.number);
                    setShowSurahPicker(false);
                    setPickerFilter('');
                    if (searchQuery) setTimeout(() => doSearch(searchQuery), 100);
                  }}
                  activeOpacity={0.7}
                >
                  {(selectedSurahFilter === item.number || (item.number === 0 && !selectedSurahFilter)) && (
                    <IconSymbol name="checkmark" size={18} color={colors.primary} style={{ marginLeft: 8 }} />
                  )}
                  <Text style={s.pickerItemText}>
                    {item.number === 0 ? 'كل القرآن الكريم' : SURAH_NAMES_AR[item.number - 1] || item.name}
                  </Text>
                  {item.number !== 0 && (
                    <Text style={s.pickerItemNum}>{item.number}</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={s.header}>
        <Text style={s.title}>القرآن الكريم</Text>
      </View>
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, activeTab === t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, activeTab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── SURAHS ── */}
      {activeTab === 'surahs' && (
        <>
          <View style={s.searchBox2}>
            <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
            <TextInput
              style={s.input2}
              placeholder="ابحث عن سورة بالاسم أو الرقم..."
              placeholderTextColor={colors.muted}
              value={surahFilter}
              onChangeText={filterSurahs}
            />
            {surahFilter.length > 0 && (
              <TouchableOpacity onPress={() => filterSurahs('')}>
                <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
          {surahsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <FlatList
              data={filteredSurahs}
              keyExtractor={item => String(item.number)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.surahItem}
                  onPress={() => router.push({ pathname: '/surah/[id]' as any, params: { id: item.number } })}
                  activeOpacity={0.7}
                >
                  <View style={s.metaCol}>
                    <Text style={s.ayahCount}>{item.numberOfAyahs} آية</Text>
                    <Text style={s.revType}>{item.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</Text>
                  </View>
                  <View style={s.surahInfo}>
                    <HighlightText
                      text={SURAH_NAMES_AR[item.number - 1] || item.name}
                      highlight={surahFilter}
                      style={s.nameAr}
                      highlightStyle={{ color: colors.primary, fontWeight: '700', backgroundColor: colors.primary + '20' }}
                    />
                    <Text style={s.nameEn}>{item.englishName}</Text>
                  </View>
                  <View style={s.numCircle}>
                    <Text style={s.numText}>{item.number}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      {/* ── JUZ ── */}
      {activeTab === 'juz' && (
        <FlatList
          data={JUZ_DATA}
          keyExtractor={item => String(item.number)}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.juzItem}
              onPress={() => router.push({ pathname: '/surah/[id]' as any, params: { id: item.startSurah } })}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.juzName}>{item.name}</Text>
              </View>
              <View style={s.juzCircle}>
                <Text style={s.juzCircleText}>{item.number}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── SEARCH ── */}
      {activeTab === 'search' && renderSearchTab()}

      {/* ── BOOKMARKS ── */}
      {activeTab === 'bookmarks' && (
        bookmarks.length > 0 ? (
          <FlatList
            data={bookmarks}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.bkItem}
                onPress={() => router.push({ pathname: '/surah/[id]' as any, params: { id: item.surahNumber } })}
                activeOpacity={0.7}
              >
                <Text style={s.bkSurah}>{item.surahName} - آية {item.ayahNumber}</Text>
                <Text style={s.bkText} numberOfLines={2}>{item.ayahText}</Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={s.centerBox}>
            <Text style={s.emptyIcon}>🔖</Text>
            <Text style={s.emptyTitle}>لا توجد آيات محفوظة</Text>
            <Text style={s.emptyText}>اضغط على أي آية أثناء القراءة واحفظها في المفضلة</Text>
          </View>
        )
      )}
    </ScreenContainer>
  );
}
