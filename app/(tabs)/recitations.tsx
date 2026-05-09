/**
 * Full Recitations Screen — التلاوات الكاملة
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Pressable,
  Modal, ActivityIndicator, ScrollView, Platform, Animated,
  TextInput, Alert,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { t, getLanguage } from '@/lib/i18n';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { getSurahName, RECITERS, getSurahAudioUrl } from '@/lib/quran-api';
import { LEGACY_RECITER_ID_MAP, hasPerAyahSync, hasPerSurahAudio } from '@/lib/reciters-registry';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { guardPremiumFeature } from '@/lib/premium-guard';
import { NativeTabs } from '@/components/ui/NativeTabs';
import {
  downloadSurah as downloadSurahAudio,
  isDownloaded as checkIsDownloaded,
  getLocalUri,
  deleteDownload,
  isDownloading,
  getDownloadedForReciter,
} from '@/lib/audio-download-manager';

// ─── Constants ────────────────────────────────────────────────────────────────
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
  5,8,8,19,5,8,8,11,11,8,
  3,9,5,4,7,3,6,3,5,4,
  5,6,4,4
];

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
  const isRTL = useIsRTL();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPremium } = useSubscription();
  const language = getLanguage();
  const isArabic = language === 'ar';
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0]);
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSurahIdx, setCurrentSurahIdx] = useState(0);
  const [view, setView] = useState<'surahs' | 'juz'>('surahs');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  // Identifier of a reciter that is currently being switched to (audio reloading).
  // Used to render a spinner next to the row in the picker so users know it's
  // streaming over the network.
  const [loadingReciter, setLoadingReciter] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [downloadedSet, setDownloadedSet] = useState<Set<number>>(new Set());
  const [downloadingSet, setDownloadingSet] = useState<Set<number>>(new Set());
  const soundRef = useRef<Audio.Sound | null>(null);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_RECITER).then(v => {
      if (!v) return;
      // Migrate legacy ids (e.g. 'ar.alafasy') → new registry ids ('mishary_alafasy').
      const migrated = LEGACY_RECITER_ID_MAP[v] ?? v;
      let found = RECITERS.find(r => r.identifier === migrated) || RECITERS[0];
      // If the saved reciter no longer has a working per-surah source, fall back
      // to the first available reciter so playback never throws on launch.
      if (!hasPerSurahAudio(found.identifier)) {
        found = RECITERS.find(r => hasPerSurahAudio(r.identifier)) || RECITERS[0];
      }
      setSelectedReciter(found);
      if (found.identifier !== v) {
        AsyncStorage.setItem(STORAGE_KEY_RECITER, found.identifier).catch(() => {});
      }
    });
    AsyncStorage.getItem('@recitation_favs').then(v => {
      if (v) try { setFavorites(JSON.parse(v)); } catch {}
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

  // Switch reciter. If audio is currently playing, automatically restart the
  // same surah with the new reciter so the choice takes effect immediately
  // (previously the new reciter was only saved and would not load until the
  // user manually pressed play again — felt like "nothing happened").
  const saveReciter = useCallback(async (r: typeof RECITERS[0]) => {
    if (r.identifier === selectedReciter.identifier) return;
    setSelectedReciter(r);
    AsyncStorage.setItem(STORAGE_KEY_RECITER, r.identifier).catch(() => {});

    const playing = nowPlaying;
    if (!playing) return;

    // Reload the same surah with the new reciter
    setLoadingReciter(r.identifier);
    try {
      const localUri = await getLocalUri(playing.surahNum, r.identifier);
      const url = localUri || getSurahAudioUrl(playing.surahNum, r.identifier);

      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setAudioUrl(url);
      setIsPlaying(true);
      setNowPlaying({
        ...playing,
        reciter: r.name,
        reciterAr: isArabic ? r.nameAr : r.name,
      });
    } catch (e) {
      console.warn('Reciter switch error:', e);
      Alert.alert(t('common.error'), t('messages.networkError'));
    } finally {
      setLoadingReciter(null);
    }
  }, [selectedReciter.identifier, nowPlaying, isArabic]);

  // Load downloaded surahs for current reciter
  const loadDownloaded = useCallback(async () => {
    const items = await getDownloadedForReciter(selectedReciter.identifier);
    setDownloadedSet(new Set(items.map(d => d.surahNumber)));
  }, [selectedReciter.identifier]);

  useEffect(() => { loadDownloaded(); }, [loadDownloaded]);

  const handleDownload = useCallback(async (surahNum: number) => {
    if (!isPremium) {
      guardPremiumFeature('sound_downloads', router, isPremium);
      return;
    }
    if (isDownloading(surahNum, selectedReciter.identifier)) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check network before attempting download
    const netState = await NetInfo.fetch();
    if (!(netState.isConnected && netState.isInternetReachable !== false)) {
      Alert.alert(t('common.error'), t('messages.noInternet'));
      return;
    }

    setDownloadingSet(prev => new Set(prev).add(surahNum));
    try {
      await downloadSurahAudio(surahNum, selectedReciter.identifier);
      setDownloadedSet(prev => new Set(prev).add(surahNum));
    } catch (e: any) {
      // Show friendly message, not raw error
      Alert.alert(t('common.error'), t('messages.networkError'));
    } finally {
      setDownloadingSet(prev => {
        const next = new Set(prev);
        next.delete(surahNum);
        return next;
      });
    }
  }, [selectedReciter.identifier]);

  const handleDeleteDownload = useCallback(async (surahNum: number) => {
    Alert.alert(t('common.delete'), `${t('common.delete')} ${getSurahName(surahNum)}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
          await deleteDownload(surahNum, selectedReciter.identifier);
          setDownloadedSet(prev => {
            const next = new Set(prev);
            next.delete(surahNum);
            return next;
          });
        }
      },
    ]);
  }, [selectedReciter.identifier]);

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
      // Check for offline file first
      const localUri = await getLocalUri(surahNum, selectedReciter.identifier);
      const url = localUri || getSurahAudioUrl(surahNum, selectedReciter.identifier);
      // Stop previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setAudioUrl(url);
      setIsPlaying(true);
      setCurrentSurahIdx(surahNum - 1);
      setNowPlaying({
        surahNum,
        surahName: getSurahName(surahNum),
        reciter: selectedReciter.name,
        reciterAr: isArabic ? selectedReciter.nameAr : selectedReciter.name,
        mode, juzNum,
      });
    } catch (e) {
      console.warn('Play error:', e);
    } finally {
      setLoadingItem(null);
    }
  }, [selectedReciter]);

  const playJuz = useCallback((juzNum: number) => {
    const juzInfo = JUZ_INFO[juzNum - 1];
    playSurah(juzInfo.surah, 'juz', juzNum);
  }, [playSurah]);

  const stopPlayback = useCallback(async () => {
    try {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
    } catch {}
    setIsPlaying(false);
    setNowPlaying(null);
    setAudioUrl(null);
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      try { await soundRef.current?.pauseAsync(); } catch {}
      setIsPlaying(false);
    } else {
      try { await soundRef.current?.playAsync(); } catch {}
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const playNext = useCallback(() => {
    const next = Math.min(currentSurahIdx + 1, 113);
    playSurah(next + 1, nowPlaying?.mode || 'surah');
  }, [currentSurahIdx, playSurah, nowPlaying]);

  const playPrev = useCallback(() => {
    const prev = Math.max(currentSurahIdx - 1, 0);
    playSurah(prev + 1, nowPlaying?.mode || 'surah');
  }, [currentSurahIdx, playSurah, nowPlaying]);

  const surahs = Array.from({ length: 114 }, (_, i) => ({
    num: i + 1,
    name: getSurahName(i + 1),
    ayahs: AYAH_COUNTS_114[i] || 10,
  })).filter(s =>
    !searchQuery || s.name.includes(searchQuery) || s.num.toString().includes(searchQuery)
  );

  const favSurahs = surahs.filter(s => favorites.includes(s.num));

  const _s = StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: colors.foreground },
    iconBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(34, 197, 94, 0.22)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.35)' },
    reciterBar: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 10, backgroundColor: 'rgba(34, 197, 94, 0.12)', borderBottomWidth: 1, borderBottomColor: colors.border,
      gap: 10,
    },
    reciterInfo: { flex: 1 },
    reciterLabel: { fontSize: 10, color: colors.muted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
    reciterName: { fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
    changeBtn: { backgroundColor: colors.primary + '28', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
    changeBtnText: { fontSize: 12, fontWeight: '700', color: colors.primaryText },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 8,
      backgroundColor: 'rgba(34, 197, 94, 0.12)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.25)',
      paddingHorizontal: 12, height: 42,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.foreground, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', height: 42 },
    surahItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.border,
      gap: 8,
    },
    surahNum: {
      width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    },
    surahNumText: { fontSize: 13, fontWeight: '800' },
    surahInfo: { flex: 1 },
    surahName: { fontSize: 16, fontWeight: '700', color: colors.foreground, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
    surahMeta: { fontSize: 11, color: colors.muted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', marginTop: 1 },
    playBtn: {
      width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    },
    favBtn: { padding: 6 },
    downloadBtn: { padding: 6, justifyContent: 'center' as const, alignItems: 'center' as const },
    juzItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
      paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border,
      gap: 8,
    },
    juzNum: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: '#0d8e62',
      justifyContent: 'center', alignItems: 'center',
    },
    juzNumText: { fontSize: 16, fontWeight: '900', color: '#fff' },
    juzInfo: { flex: 1 },
    juzName: { fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
    juzMeta: { fontSize: 11, color: colors.muted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', marginTop: 2 },
    nowPlayingBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: '#1B6B3A',
      paddingVertical: 10, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    nowPlayingInfo: { flex: 1 },
    nowPlayingName: { fontSize: 14, fontWeight: '800', color: '#fff', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
    nowPlayingReciter: { fontSize: 11, color: 'rgba(255,255,255,0.75)', textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
    controlBtn: { padding: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.muted, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
    modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject },
    modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '90%', flexDirection: 'column' },
    modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: colors.foreground, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    reciterItem: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: 0.5, borderBottomColor: colors.border,
    },
    reciterItemInfo: { flex: 1 },
    reciterItemAr: { fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
    reciterItemEn: { fontSize: 12, color: colors.muted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
  });
  const s = useScaledStyles(_s, colors.fs);

  const renderSurahItem = ({ item }: { item: typeof surahs[0] }) => {
    const isCurrentlyPlaying = nowPlaying?.surahNum === item.num && isPlaying;
    const isLoading = loadingItem === `surah_${item.num}`;
    const isItemDownloaded = downloadedSet.has(item.num);
    const isItemDownloading = downloadingSet.has(item.num);
    return (
      <View style={[s.surahItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, isCurrentlyPlaying && { backgroundColor: colors.primary + '18' }]}>
        <TouchableOpacity style={s.favBtn} onPress={() => toggleFav(item.num)}>
          <IconSymbol name={favorites.includes(item.num) ? 'bookmark.fill' : 'bookmark'} size={16} color={favorites.includes(item.num) ? '#DC2626' : colors.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.downloadBtn}
          onPress={() => isItemDownloaded ? handleDeleteDownload(item.num) : handleDownload(item.num)}
          disabled={isItemDownloading}
        >
          {isItemDownloading
            ? <ActivityIndicator size={14} color={colors.primary} />
            : <MaterialCommunityIcons
                name={isItemDownloaded ? 'check-circle' : 'download-circle-outline'}
                size={22}
                color={isItemDownloaded ? '#0d8e62' : colors.muted}
              />
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.playBtn, { backgroundColor: isCurrentlyPlaying ? colors.primary : colors.primary + '25' }]}
          onPress={() => isCurrentlyPlaying ? togglePlay() : playSurah(item.num)}
        >
          {isLoading
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <IconSymbol name={isCurrentlyPlaying ? 'pause.fill' : 'play.fill'} size={16} color={isCurrentlyPlaying ? '#fff' : colors.primary} />
          }
        </TouchableOpacity>
        <View style={s.surahInfo}>
          <Text style={[s.surahName, isCurrentlyPlaying && { color: colors.primaryText }]}>{item.name}</Text>
          <Text style={s.surahMeta}>
            {t('quran.surah')} {item.num} • {item.ayahs} {t('quran.ayah')}{isItemDownloaded ? ` • ${t('recitations.downloaded')}` : ''}
          </Text>
        </View>
        <View style={[s.surahNum, { backgroundColor: isCurrentlyPlaying ? colors.primary : colors.primary + '25' }]}>
          <Text style={[s.surahNumText, { color: isCurrentlyPlaying ? '#fff' : colors.primaryText }]}>{item.num}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      <View style={[s.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={s.iconBtn} onPress={() => setShowReciterModal(true)}>
          <IconSymbol name="music.microphone" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.title}>{t('recitations.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[s.reciterBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity style={s.changeBtn} onPress={() => setShowReciterModal(true)}>
          <Text style={s.changeBtnText}>{t('common.change')}</Text>
        </TouchableOpacity>
        <View style={s.reciterInfo}>
          <Text style={s.reciterLabel}>{t('quran.selectedReciter')}</Text>
          <Text style={s.reciterName}>{isArabic ? selectedReciter.nameAr : selectedReciter.name}</Text>
        </View>
        <Animated.View style={[{
          width: 36, height: 36, borderRadius: 18, backgroundColor: '#0d8e62',
          justifyContent: 'center', alignItems: 'center',
          transform: [{ scale: isPlaying ? pulseAnim : 1 }],
        }]}>
          <MaterialCommunityIcons name="microphone" size={18} color="#fff" />
        </Animated.View>
      </View>

      <View style={{ marginHorizontal: 12, marginVertical: 6 }}>
        <NativeTabs
          tabs={[
            { key: 'surahs', label: `${t('recitations.surahsTab')} (114)` },
            { key: 'juz', label: `${t('recitations.juzTab')} (30)` },
          ]}
          selected={view}
          onSelect={(key) => setView(key as 'surahs' | 'juz')}
          indicatorColor="#0d8e62"
        />
      </View>

      {view === 'surahs' ? (
        <>
          <View style={[s.searchWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
            <TextInput
              style={s.searchInput}
              placeholder={t('recitations.searchSurah')}
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
                <Text style={s.sectionTitle}>{t('recitations.favoritesLabel')}</Text>
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
              <View style={[s.juzItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, isCurrentlyPlaying && { backgroundColor: colors.primary + '18' }]}>
                <TouchableOpacity
                  style={[s.playBtn, { backgroundColor: isCurrentlyPlaying ? colors.primary : colors.primary + '25', width: 44, height: 44, borderRadius: 22 }]}
                  onPress={() => isCurrentlyPlaying ? togglePlay() : playJuz(item.juz)}
                >
                  <IconSymbol name={isCurrentlyPlaying ? 'pause.fill' : 'play.fill'} size={18} color={isCurrentlyPlaying ? '#fff' : colors.primary} />
                </TouchableOpacity>
                <View style={s.juzInfo}>
                  <Text style={[s.juzName, isCurrentlyPlaying && { color: colors.primaryText }]}>{t('quran.juz')} {item.juz}</Text>
                  <Text style={s.juzMeta}>{getSurahName(item.surah)} {t('quran.ayah')} {item.ayah}</Text>
                </View>
                <View style={s.juzNum}>
                  <Text style={s.juzNumText}>{item.juz}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {nowPlaying && (
        <View style={[s.nowPlayingBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
            <Text style={s.nowPlayingName}>{nowPlaying.surahName}</Text>
            <Text style={s.nowPlayingReciter}>{nowPlaying.reciterAr}</Text>
          </View>
        </View>
      )}

      <Modal visible={showReciterModal} transparent animationType="slide" onRequestClose={() => setShowReciterModal(false)}>
        <View style={s.modalWrap}>
          <Pressable style={s.modalBackdrop} onPress={() => setShowReciterModal(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t('quran.chooseReciter')}</Text>
            {/* Legend explaining the dot colours */}
            <View
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 14,
                paddingHorizontal: 16,
                paddingVertical: 10,
                marginBottom: 6,
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                marginHorizontal: 12,
              }}
            >
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="circle" size={10} color="#22C55E" />
                <Text style={{ color: colors.text, fontSize: 12, fontFamily: 'Cairo-SemiBold' }}>
                  {isArabic ? 'تحديد الآية أثناء التلاوة' : 'Per-ayah highlighting'}
                </Text>
              </View>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="circle" size={10} color="#F59E0B" />
                <Text style={{ color: colors.text, fontSize: 12, fontFamily: 'Cairo-SemiBold' }}>
                  {isArabic ? 'تشغيل متواصل بدون تحديد' : 'Continuous play only'}
                </Text>
              </View>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator nestedScrollEnabled>
              {RECITERS.filter(r => hasPerSurahAudio(r.identifier)).map(r => {
                const sync = hasPerAyahSync(r.identifier);
                const isSelected = selectedReciter.identifier === r.identifier;
                const isLoadingThis = loadingReciter === r.identifier;
                return (
                <TouchableOpacity
                  key={r.identifier}
                  disabled={!!loadingReciter}
                  style={[s.reciterItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }, isSelected && { backgroundColor: colors.primary + '20' }, !!loadingReciter && !isLoadingThis && { opacity: 0.5 }]}
                  onPress={() => {
                    saveReciter(r);
                    // Keep the modal open while audio is loading so the spinner is visible.
                    if (!nowPlaying) setShowReciterModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : isSelected ? (
                    <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                  ) : (
                    <View style={{ width: 20 }} />
                  )}
                  <View style={s.reciterItemInfo}>
                    <Text style={[s.reciterItemAr, isSelected && { color: colors.primaryText }]}>{isArabic ? (r.nameAr || r.name) : (r.name || r.nameAr)}</Text>
                    {isLoadingThis && (
                      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2, fontFamily: 'Cairo-Regular', textAlign: isRTL ? 'right' : 'left' }}>
                        {isArabic ? 'جارٍ التحميل من الإنترنت…' : 'Streaming over network…'}
                      </Text>
                    )}
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                      backgroundColor: sync ? '#22C55E22' : '#F59E0B22',
                      marginHorizontal: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    accessibilityLabel={sync ? 'تحديد الآية تلقائياً' : 'تشغيل متواصل فقط'}
                  >
                    <MaterialCommunityIcons name="circle" size={10} color={sync ? '#22C55E' : '#F59E0B'} />
                  </View>
                </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
