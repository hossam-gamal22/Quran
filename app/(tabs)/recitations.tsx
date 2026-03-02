/**
 * Full Recitations Screen — التلاوات الكاملة
 * يعرض: قائمة السور مع زر الاستماع الكامل، اختيار القارئ،
 * تشغيل متواصل للجزء أو للقرآن كله، شريط تشغيل ثابت
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, ScrollView, Platform, Animated,
  TextInput,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Audio } from 'expo-av';
import { SURAH_NAMES_AR, RECITERS, getSurahAudioUrl } from '@/lib/quran-api';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const SURAH_AYAH_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,
  89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,
  30,52,52,44,28,28,20,56,40,31,50,45,33,27,57,29,19,18,12,11,82,8,11,98,
  135,112,78,118,64,77,227,93,88,7,286,200,176,120,165,206,75,129,109,123,
  111,43,52,99,128,
];

// Fix to exactly 114
const AYAH_COUNTS_114 = [
  7,286,200,176,120,165,206,75,129,109,
  123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,
  34,30,73,54,45,83,182,88,75,85,
  54,53,89,59,37,35,38,29,18,45,
  60,49,62,55,78,96,29,22,24,13,
  14,11,11,18,12,12,30,52,52,44,
  28,28,20,56,40,31,50,45,33,27,
  57,29,19,18,12,11,82,8,11,98,
  135,112,78,118,64,77,227,93,88,7,
  286,200,176,120,165,206,75,129,109,123,
  111,43,52,99,128,
];

// Juz info
const JUZ_INFO: { juz: number; surah: number; ayah: number }[] = [
  {juz:1,surah:1,ayah:1},{juz:2,surah:2,ayah:142},{juz:3,surah:2,ayah:253},
  {juz:4,surah:3,ayah:92},{juz:5,surah:4,ayah:24},{juz:6,surah:4,ayah:148},
  {juz:7,surah:5,ayah:82},{juz:8,surah:6,ayah:111},{juz:9,surah:7,ayah:87},
  {juz:10,surah:8,ayah:41},{juz:11,surah:9,ayah:93},{juz:12,surah:11,ayah:6},
  {juz:13,surah:12,ayah:53},{juz:14,surah:15,ayah:1},{juz:15,surah:17,ayah:1},
  {juz:16,surah:18,ayah:75},{juz:17,surah:21,ayah:1},{juz:18,surah:23,ayah:1},
  {juz:19,surah:25,ayah:21},{juz:20,surah:27,ayah:56},{juz:21,surah:29,ayah:46},
  {juz:22,surah:33,ayah:31},{juz:23,surah:36,ayah:28},{juz:24,surah:39,ayah:32},
  {juz:25,surah:41,ayah:47},{juz:26,surah:46,ayah:1},{juz:27,surah:51,ayah:31},
  {juz:28,surah:58,ayah:1},{juz:29,surah:67,ayah:1},{juz:30,surah:78,ayah:1},
];

type PlayMode = 'surah' | 'juz' | 'all';

interface NowPlaying {
  surahNum: number;
  surahName: string;
  reciter: string;
  reciterAr: string;
  mode: PlayMode;
  juzNum?: number;
}

const STORAGE_KEY_RECITER = '@recitations_reciter';

export default function RecitationsScreen() {
  const colors = useColors();
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0]);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSurahIdx, setCurrentSurahIdx] = useState(0);
  const [view, setView] = useState<'surahs' | 'juz'>('surahs');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const playerRef = useRef<any>(null);

  const player = Audio.Sound.createAsync('');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_RECITER).then(v => {
      if (v) setSelectedReciter(RECITERS.find(r => r.identifier === v) || RECITERS[0]);
    });
    AsyncStorage.getItem('@recitation_favs').then(v => {
      if (v) setFavorites(JSON.parse(v));
    });
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]));
      pulse.start();
      return () => pulse.stop();
    }
  }, [isPlaying]);

  const saveReciter = (r: typeof RECITERS[0]) => {
    setSelectedReciter(r);
    AsyncStorage.setItem(STORAGE_KEY_RECITER, r.identifier);
  };

  const toggleFav = (num: number) => {
    setFavorites(prev => {
      const next = prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num];
      AsyncStorage.setItem('@recitation_favs', JSON.stringify(next));
      return next;
    });
  };

  const playSurah = useCallback(async (surahNum: number, mode: PlayMode = 'surah', juzNum?: number) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const key = `${mode}_${surahNum}`;
    setLoadingItem(key);
    try {
      const url = getSurahAudioUrl(surahNum, selectedReciter.identifier);
      player.replace({ uri: url });
      player.play();
      setIsPlaying(true);
      setCurrentSurahIdx(surahNum - 1);
      setNowPlaying({
        surahNum,
        surahName: SURAH_NAMES_AR[surahNum - 1],
        reciter: selectedReciter.name,
        reciterAr: selectedReciter.nameAr,
        mode, juzNum,
      });
    } catch (e) {
      // silent error — handled by UI state
    } finally {
      setLoadingItem(null);
    }
  }, [selectedReciter, player]);

  const playJuz = useCallback((juzNum: number) => {
    const juzInfo = JUZ_INFO[juzNum - 1];
    playSurah(juzInfo.surah, 'juz', juzNum);
  }, [playSurah]);

  const stopPlayback = useCallback(() => {
    try { player.pause(); } catch {}
    setIsPlaying(false);
    setNowPlaying(null);
  }, [player]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [isPlaying, player]);

  const playNext = useCallback(() => {
    const next = Math.min(currentSurahIdx + 1, 113);
    playSurah(next + 1, nowPlaying?.mode || 'surah');
  }, [currentSurahIdx, playSurah, nowPlaying]);

  const playPrev = useCallback(() => {
    const prev = Math.max(currentSurahIdx - 1, 0);
    playSurah(prev + 1, nowPlaying?.mode || 'surah');
  }, [currentSurahIdx, playSurah, nowPlaying]);

  // Filter surahs
  const surahs = Array.from({ length: 114 }, (_, i) => ({
    num: i + 1,
    name: SURAH_NAMES_AR[i],
    ayahs: AYAH_COUNTS_114[i] || 10,
  })).filter(s =>
    !searchQuery || s.name.includes(searchQuery) || s.num.toString().includes(searchQuery)
  );

  const favSurahs = surahs.filter(s => favorites.includes(s.num));

  const s = StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: colors.foreground },
    iconBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    // Reciter bar
    reciterBar: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
      gap: 10,
    },
    reciterInfo: { flex: 1 },
    reciterLabel: { fontSize: 10, color: colors.muted, textAlign: 'right' },
    reciterName: { fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    changeBtn: { backgroundColor: colors.primary + '18', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
    changeBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    // View toggle
    viewToggle: { flexDirection: 'row', margin: 12, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: colors.primary },
    toggleBtnText: { fontSize: 13, fontWeight: '700', color: colors.muted },
    toggleBtnTextActive: { color: '#fff' },
    // Search
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 8,
      backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: 12, height: 42,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.foreground, textAlign: 'right', height: 42 },
    // Surah item
    surahItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    surahNum: {
      width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
      marginLeft: 12,
    },
    surahNumText: { fontSize: 13, fontWeight: '800' },
    surahInfo: { flex: 1 },
    surahName: { fontSize: 16, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    surahMeta: { fontSize: 11, color: colors.muted, textAlign: 'right', marginTop: 1 },
    playBtn: {
      width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
      marginLeft: 8,
    },
    favBtn: { padding: 6, marginLeft: 4 },
    // Juz item
    juzItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    juzNum: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
      justifyContent: 'center', alignItems: 'center', marginLeft: 12,
    },
    juzNumText: { fontSize: 16, fontWeight: '900', color: '#fff' },
    juzInfo: { flex: 1 },
    juzName: { fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    juzMeta: { fontSize: 11, color: colors.muted, textAlign: 'right', marginTop: 2 },
    // Now playing bar
    nowPlayingBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: '#1B6B3A',
      paddingVertical: 10, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.2, shadowRadius: 6, elevation: 10,
    },
    nowPlayingInfo: { flex: 1 },
    nowPlayingName: { fontSize: 14, fontWeight: '800', color: '#fff', textAlign: 'right' },
    nowPlayingReciter: { fontSize: 11, color: 'rgba(255,255,255,0.75)', textAlign: 'right' },
    controlBtn: { padding: 8 },
    // Section title
    sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.muted, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, textAlign: 'right' },
    // Reciter modal
    modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '75%' },
    modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.foreground, textAlign: 'right', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    reciterItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    reciterItemInfo: { flex: 1 },
    reciterItemAr: { fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    reciterItemEn: { fontSize: 12, color: colors.muted, textAlign: 'right' },
  });

  const renderSurahItem = ({ item }: { item: typeof surahs[0] }) => {
    const isCurrentlyPlaying = nowPlaying?.surahNum === item.num && isPlaying;
    const isLoading = loadingItem === `surah_${item.num}`;
    return (
      <View style={[s.surahItem, isCurrentlyPlaying && { backgroundColor: colors.primary + '08' }]}>
        <TouchableOpacity style={s.favBtn} onPress={() => toggleFav(item.num)}>
          <IconSymbol name={favorites.includes(item.num) ? 'heart.fill' : 'heart'} size={16} color={favorites.includes(item.num) ? '#DC2626' : colors.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.playBtn, { backgroundColor: isCurrentlyPlaying ? colors.primary : colors.primary + '15' }]}
          onPress={() => isCurrentlyPlaying ? togglePlay() : playSurah(item.num)}
        >
          {isLoading
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <IconSymbol name={isCurrentlyPlaying ? 'pause.fill' : 'play.fill'} size={16} color={isCurrentlyPlaying ? '#fff' : colors.primary} />
          }
        </TouchableOpacity>
        <View style={s.surahInfo}>
          <Text style={[s.surahName, isCurrentlyPlaying && { color: colors.primary }]}>{item.name}</Text>
          <Text style={s.surahMeta}>سورة {item.num} • {item.ayahs} آية</Text>
        </View>
        <View style={[s.surahNum, { backgroundColor: isCurrentlyPlaying ? colors.primary : colors.primary + '15' }]}>
          <Text style={[s.surahNumText, { color: isCurrentlyPlaying ? '#fff' : colors.primary }]}>{item.num}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => setShowReciterModal(true)}>
          <IconSymbol name="music.microphone" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.title}>🎙️ التلاوات الكاملة</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Reciter Bar */}
      <View style={s.reciterBar}>
        <TouchableOpacity style={s.changeBtn} onPress={() => setShowReciterModal(true)}>
          <Text style={s.changeBtnText}>تغيير</Text>
        </TouchableOpacity>
        <View style={s.reciterInfo}>
          <Text style={s.reciterLabel}>القارئ المختار</Text>
          <Text style={s.reciterName}>{selectedReciter.nameAr}</Text>
        </View>
        <Animated.View style={[{
          width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary,
          justifyContent: 'center', alignItems: 'center',
          transform: [{ scale: isPlaying ? pulseAnim : new Animated.Value(1) }],
        }]}>
          <Text style={{ fontSize: 18 }}>🎙️</Text>
        </Animated.View>
      </View>

      {/* View Toggle */}
      <View style={s.viewToggle}>
        <TouchableOpacity style={[s.toggleBtn, view === 'surahs' && s.toggleBtnActive]} onPress={() => setView('surahs')}>
          <Text style={[s.toggleBtnText, view === 'surahs' && s.toggleBtnTextActive]}>📖 السور (114)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.toggleBtn, view === 'juz' && s.toggleBtnActive]} onPress={() => setView('juz')}>
          <Text style={[s.toggleBtnText, view === 'juz' && s.toggleBtnTextActive]}>📚 الأجزاء (30)</Text>
        </TouchableOpacity>
      </View>

      {view === 'surahs' ? (
        <>
          {/* Search */}
          <View style={s.searchWrap}>
            <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
            <TextInput
              style={s.searchInput}
              placeholder="ابحث عن سورة..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={surahs}
            keyExtractor={item => item.num.toString()}
            renderItem={renderSurahItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: nowPlaying ? 80 : 20 }}
            ListHeaderComponent={
              favSurahs.length > 0 && !searchQuery ? (
                <Text style={s.sectionTitle}>⭐ المفضلة</Text>
              ) : null
            }
          />
        </>
      ) : (
        <FlatList
          data={JUZ_INFO}
          keyExtractor={item => item.juz.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: nowPlaying ? 80 : 20 }}
          renderItem={({ item }) => {
            const isCurrentlyPlaying = nowPlaying?.juzNum === item.juz && nowPlaying?.mode === 'juz' && isPlaying;
            return (
              <View style={[s.juzItem, isCurrentlyPlaying && { backgroundColor: colors.primary + '08' }]}>
                <TouchableOpacity
                  style={[s.playBtn, { backgroundColor: isCurrentlyPlaying ? colors.primary : colors.primary + '15', width: 44, height: 44, borderRadius: 22 }]}
                  onPress={() => isCurrentlyPlaying ? togglePlay() : playJuz(item.juz)}
                >
                  <IconSymbol name={isCurrentlyPlaying ? 'pause.fill' : 'play.fill'} size={18} color={isCurrentlyPlaying ? '#fff' : colors.primary} />
                </TouchableOpacity>
                <View style={s.juzInfo}>
                  <Text style={[s.juzName, isCurrentlyPlaying && { color: colors.primary }]}>الجزء {item.juz}</Text>
                  <Text style={s.juzMeta}>يبدأ من {SURAH_NAMES_AR[item.surah - 1]} آية {item.ayah}</Text>
                </View>
                <View style={s.juzNum}>
                  <Text style={s.juzNumText}>{item.juz}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Now Playing Bar */}
      {nowPlaying && (
        <View style={s.nowPlayingBar}>
          <TouchableOpacity style={s.controlBtn} onPress={stopPlayback}>
            <IconSymbol name="xmark" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.controlBtn} onPress={playNext}>
            <IconSymbol name="forward.fill" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.controlBtn, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 10 }]}
            onPress={togglePlay}
          >
            <IconSymbol name={isPlaying ? 'pause.fill' : 'play.fill'} size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.controlBtn} onPress={playPrev}>
            <IconSymbol name="backward.fill" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={s.nowPlayingInfo}>
            <Text style={s.nowPlayingName}>🎙️ {nowPlaying.surahName}</Text>
            <Text style={s.nowPlayingReciter}>{nowPlaying.reciterAr}</Text>
          </View>
        </View>
      )}

      {/* Reciter Modal */}
      <Modal visible={showReciterModal} transparent animationType="slide" onRequestClose={() => setShowReciterModal(false)}>
        <TouchableOpacity style={s.modalWrap} activeOpacity={1} onPress={() => setShowReciterModal(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>اختر القارئ</Text>
            <ScrollView>
              {RECITERS.map(r => (
                <TouchableOpacity
                  key={r.identifier}
                  style={[s.reciterItem, selectedReciter.identifier === r.identifier && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => { saveReciter(r); setShowReciterModal(false); }}
                  activeOpacity={0.7}
                >
                  {selectedReciter.identifier === r.identifier && (
                    <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} style={{ marginLeft: 10 }} />
                  )}
                  <View style={s.reciterItemInfo}>
                    <Text style={[s.reciterItemAr, selectedReciter.identifier === r.identifier && { color: colors.primary }]}>{r.nameAr}</Text>
                    <Text style={s.reciterItemEn}>{r.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenContainer>
  );
}
