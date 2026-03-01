import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Share,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import {
  fetchSurahWithTranslation,
  SurahDetail,
  Ayah,
  getAyahAudioUrl,
  SURAH_NAMES_AR,
  hasSajda,
  fetchTafsir,
} from '@/lib/quran-api';
import { addBookmark, removeBookmark, isBookmarked, setLastRead, getLastRead } from '@/lib/storage';
import { useSettings } from '@/lib/settings-context';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AyahWithTrans extends Ayah {
  translation?: string;
}

// ─── Tafsir Bottom Sheet ────────────────────────────────────────────────────
const TAFSIR_EDITIONS = [
  { identifier: 'ar.muyassar', name: 'الميسر', lang: 'ar' },
  { identifier: 'ar.jalalayn', name: 'الجلالين', lang: 'ar' },
  { identifier: 'ar.kathir', name: 'ابن كثير', lang: 'ar' },
  { identifier: 'en.sahih', name: 'Sahih Intl', lang: 'en' },
  { identifier: 'en.asad', name: 'M. Asad', lang: 'en' },
];

interface TafsirSheetProps {
  visible: boolean;
  surahNumber: number;
  ayah: AyahWithTrans | null;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
}

function TafsirSheet({ visible, surahNumber, ayah, colors, onClose }: TafsirSheetProps) {
  const [tafsirText, setTafsirText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState('ar.muyassar');
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && ayah) {
      setLoading(true);
      setTafsirText('');
      fetchTafsir(surahNumber, ayah.numberInSurah, selectedEdition)
        .then(({ tafsirText: t }) => setTafsirText(t || 'لا يتوفر تفسير لهذه الآية'))
        .catch(() => setTafsirText('تعذر تحميل التفسير'))
        .finally(() => setLoading(false));
    }
  }, [visible, ayah, selectedEdition, surahNumber]);

  if (!visible || !ayah) return null;

  const s = StyleSheet.create({
    overlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999,
    },
    sheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: colors.background,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: SCREEN_HEIGHT * 0.75,
      zIndex: 1000,
      shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15, shadowRadius: 12, elevation: 20,
    },
    handle: {
      width: 40, height: 5, borderRadius: 3,
      backgroundColor: colors.border,
      alignSelf: 'center', marginTop: 10, marginBottom: 6,
    },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingBottom: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.foreground },
    closeBtn: { padding: 6, borderRadius: 20, backgroundColor: colors.surface },
    content: { paddingHorizontal: 20, paddingTop: 14 },
    ayahBadge: {
      backgroundColor: colors.primary + '18',
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
      alignSelf: 'flex-end', marginBottom: 12,
    },
    ayahBadgeText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    arabicBox: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: colors.border, marginBottom: 16,
    },
    arabicText: {
      fontSize: 22, color: colors.foreground, textAlign: 'right',
      lineHeight: 42, fontFamily: Platform.select({ ios: 'Damascus', default: undefined }),
    },
    editionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    tafsirTitle: { fontSize: 15, fontWeight: '700', color: colors.primary, textAlign: 'right', marginBottom: 10 },
    tafsirText: { fontSize: 16, color: colors.foreground, textAlign: 'right', lineHeight: 32 },
  });

  return (
    <>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.handle} />
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <IconSymbol name="xmark" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.title}>تفسير الآية</Text>
          <View style={{ width: 32 }} />
        </View>
        <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.ayahBadge}>
            <Text style={s.ayahBadgeText}>{SURAH_NAMES_AR[surahNumber - 1]} • آية {ayah.numberInSurah}</Text>
          </View>
          <View style={s.arabicBox}>
            <Text style={s.arabicText}>{ayah.text}</Text>
          </View>
          <View style={s.editionRow}>
            {TAFSIR_EDITIONS.map(ed => (
              <TouchableOpacity
                key={ed.identifier}
                style={[s.chip, selectedEdition === ed.identifier && s.chipActive]}
                onPress={() => setSelectedEdition(ed.identifier)}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, selectedEdition === ed.identifier && s.chipTextActive]}>
                  {ed.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.tafsirTitle}>📖 التفسير</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <Text style={s.tafsirText}>{tafsirText || 'لا يتوفر تفسير'}</Text>
          )}
          <View style={{ height: 50 }} />
        </ScrollView>
      </Animated.View>
    </>
  );
}

// ─── Main Surah Screen ───────────────────────────────────────────────────────
export default function SurahScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { settings } = useSettings();

  const [surahData, setSurahData] = useState<SurahDetail | null>(null);
  const [ayahs, setAyahs] = useState<AyahWithTrans[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAyah, setSelectedAyah] = useState<AyahWithTrans | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showTafsir, setShowTafsir] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isContinuousPlaying, setIsContinuousPlaying] = useState(false);
  const [highlightedAyah, setHighlightedAyah] = useState<number | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const continuousPlayRef = useRef(false);
  const currentAyahIndexRef = useRef(0);

  useKeepAwake();

  const surahNumber = parseInt(id || '1', 10);
  const player = useAudioPlayer('');

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSurahWithTranslation(surahNumber, settings.translationEdition)
      .then(async ({ arabic, translation }) => {
        setSurahData(arabic);
        const merged: AyahWithTrans[] = arabic.ayahs.map((ayah, i) => ({
          ...ayah,
          translation: translation.ayahs[i]?.text,
        }));
        setAyahs(merged);
        setLoading(false);

        const lastRead = await getLastRead();
        const startAyah = lastRead?.surahNumber === surahNumber ? lastRead.ayahNumber : 1;
        await setLastRead({
          surahNumber,
          ayahNumber: startAyah,
          surahName: SURAH_NAMES_AR[surahNumber - 1] || arabic.name,
        });

        if (lastRead?.surahNumber === surahNumber && lastRead.ayahNumber > 1) {
          setTimeout(() => {
            const index = Math.max(0, lastRead.ayahNumber - 1);
            flatListRef.current?.scrollToIndex({ index, animated: true, viewOffset: 20 });
            setHighlightedAyah(lastRead.ayahNumber);
            setTimeout(() => setHighlightedAyah(null), 3000);
          }, 600);
        }
      })
      .catch(() => setLoading(false));
  }, [surahNumber, settings.translationEdition]);

  // Load bookmarks
  useEffect(() => {
    const loadBookmarks = async () => {
      const { getBookmarks } = await import('@/lib/storage');
      const bks = await getBookmarks();
      const ids = new Set(bks.filter(b => b.surahNumber === surahNumber).map(b => `${b.surahNumber}_${b.ayahNumber}`));
      setBookmarkedIds(ids);
    };
    loadBookmarks();
  }, [surahNumber]);

  const handleAyahPress = useCallback((ayah: AyahWithTrans) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedAyah(ayah);
    setShowOptions(true);
    setLastRead({
      surahNumber,
      ayahNumber: ayah.numberInSurah,
      surahName: SURAH_NAMES_AR[surahNumber - 1] || (surahData?.name || ''),
    });
  }, [surahNumber, surahData]);

  const handleAyahLongPress = useCallback((ayah: AyahWithTrans) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedAyah(ayah);
    setShowTafsir(true);
  }, []);

  const playAyahByIndex = useCallback(async (index: number) => {
    if (index < 0 || index >= ayahs.length) {
      setIsPlaying(false);
      setPlayingAyah(null);
      setIsContinuousPlaying(false);
      continuousPlayRef.current = false;
      return;
    }
    const ayah = ayahs[index];
    currentAyahIndexRef.current = index;
    const audioUrl = getAyahAudioUrl(ayah.number, settings.reciter);
    try {
      player.replace({ uri: audioUrl });
      player.play();
      setIsPlaying(true);
      setPlayingAyah(ayah.numberInSurah);
      flatListRef.current?.scrollToIndex({ index: Math.max(0, index), animated: true, viewOffset: 60 });
      if (settings.continuousPlay) {
        const wordCount = ayah.text.split(' ').length;
        const estimatedDuration = Math.max(3000, wordCount * 600);
        setTimeout(() => {
          if (continuousPlayRef.current) playAyahByIndex(index + 1);
        }, estimatedDuration);
      }
    } catch {}
  }, [ayahs, settings.reciter, settings.continuousPlay, player]);

  const handlePlayAyah = useCallback(async (ayah: AyahWithTrans) => {
    setShowOptions(false);
    const ayahIndex = ayahs.findIndex(a => a.numberInSurah === ayah.numberInSurah);
    if (playingAyah === ayah.numberInSurah && isPlaying) {
      player.pause();
      setIsPlaying(false);
      setPlayingAyah(null);
      continuousPlayRef.current = false;
      setIsContinuousPlaying(false);
    } else {
      continuousPlayRef.current = settings.continuousPlay;
      await playAyahByIndex(ayahIndex);
    }
  }, [player, playingAyah, isPlaying, ayahs, settings.continuousPlay, playAyahByIndex]);

  const handleContinuousPlay = useCallback(async () => {
    if (isContinuousPlaying) {
      player.pause();
      setIsPlaying(false);
      setPlayingAyah(null);
      setIsContinuousPlaying(false);
      continuousPlayRef.current = false;
    } else {
      setIsContinuousPlaying(true);
      continuousPlayRef.current = true;
      await playAyahByIndex(0);
    }
  }, [isContinuousPlaying, player, playAyahByIndex]);

  const handleBookmark = useCallback(async (ayah: AyahWithTrans) => {
    setShowOptions(false);
    const key = `${surahNumber}_${ayah.numberInSurah}`;
    const bookmarked = bookmarkedIds.has(key);
    if (bookmarked) {
      await removeBookmark(key);
      setBookmarkedIds(prev => { const s = new Set(prev); s.delete(key); return s; });
    } else {
      await addBookmark({
        surahNumber,
        ayahNumber: ayah.numberInSurah,
        surahName: SURAH_NAMES_AR[surahNumber - 1] || (surahData?.name || ''),
        ayahText: ayah.text,
      });
      setBookmarkedIds(prev => new Set([...prev, key]));
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [surahNumber, surahData, bookmarkedIds]);

  const handleShare = useCallback(async (ayah: AyahWithTrans) => {
    setShowOptions(false);
    const surahName = SURAH_NAMES_AR[surahNumber - 1] || (surahData?.name || '');
    const text = `${ayah.text}\n\n${ayah.translation ? ayah.translation + '\n\n' : ''}— ${surahName} (${surahNumber}:${ayah.numberInSurah})`;
    Share.share({ message: text }).catch(() => {});
  }, [surahNumber, surahData]);

  const handleOpenTafsir = useCallback((ayah: AyahWithTrans) => {
    setShowOptions(false);
    setSelectedAyah(ayah);
    setShowTafsir(true);
  }, []);

  const renderAyah = useCallback(({ item }: { item: AyahWithTrans }) => {
    const key = `${surahNumber}_${item.numberInSurah}`;
    const bookmarked = bookmarkedIds.has(key);
    const isCurrentlyPlaying = playingAyah === item.numberInSurah;
    const isHighlighted = highlightedAyah === item.numberInSurah;
    const isSajda = hasSajda(surahNumber, item.numberInSurah);

    return (
      <TouchableOpacity
        onPress={() => handleAyahPress(item)}
        onLongPress={() => handleAyahLongPress(item)}
        activeOpacity={0.85}
        style={[
          s.ayahCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isCurrentlyPlaying && { borderLeftWidth: 3, borderLeftColor: colors.primary },
          isHighlighted && { backgroundColor: colors.primary + '15' },
          isSajda && { borderTopWidth: 2, borderTopColor: colors.gold },
        ]}
      >
        {/* Ayah Number Badge */}
        <View style={[s.ayahNumberBadge, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[s.ayahNumberText, { color: colors.primary }]}>{item.numberInSurah}</Text>
        </View>

        {/* Arabic Text */}
        <Text
          style={[s.arabicText, {
            color: colors.foreground,
            fontSize: settings.fontSize,
            lineHeight: settings.fontSize * 1.8,
          }]}
        >
          {item.text}
          {isSajda && <Text style={{ color: colors.gold }}> ۩</Text>}
        </Text>

        {/* Translation */}
        {settings.showTranslation && item.translation && (
          <Text style={[s.translationText, { color: colors.muted }]}>
            {item.translation}
          </Text>
        )}

        {/* Action Row */}
        <View style={s.ayahActions}>
          {isCurrentlyPlaying && (
            <View style={[s.playingBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[s.playingBadgeText, { color: colors.primary }]}>🎵 يُشغَّل</Text>
            </View>
          )}
          {bookmarked && (
            <View style={[s.bookmarkBadge, { backgroundColor: colors.gold + '20' }]}>
              <IconSymbol name="bookmark.fill" size={12} color={colors.gold} />
            </View>
          )}
          {isSajda && (
            <View style={[s.sajdaBadge, { backgroundColor: colors.gold + '20' }]}>
              <Text style={[s.sajdaText, { color: colors.gold }]}>سجدة</Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.tafsirBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => handleOpenTafsir(item)}
          >
            <Text style={[s.tafsirBtnText, { color: colors.primary }]}>تفسير</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }, [surahNumber, bookmarkedIds, playingAyah, highlightedAyah, colors, settings, handleAyahPress, handleAyahLongPress, handleOpenTafsir]);

  const s = StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: colors.foreground },
    headerSub: { textAlign: 'center', fontSize: 12, color: colors.muted },
    backBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.surface },
    playBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.surface },
    basmala: {
      textAlign: 'center', fontSize: 26, color: colors.primary,
      paddingVertical: 20, paddingHorizontal: 20, lineHeight: 50,
    },
    ayahCard: {
      marginHorizontal: 12, marginVertical: 6, borderRadius: 16,
      padding: 16, borderWidth: 1,
    },
    ayahNumberBadge: {
      width: 32, height: 32, borderRadius: 16,
      justifyContent: 'center', alignItems: 'center',
      alignSelf: 'flex-end', marginBottom: 10,
    },
    ayahNumberText: { fontSize: 13, fontWeight: '800' },
    arabicText: { textAlign: 'right', writingDirection: 'rtl' },
    translationText: { fontSize: 14, lineHeight: 22, marginTop: 10, textAlign: 'left' },
    ayahActions: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
      marginTop: 10, gap: 8,
    },
    playingBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    playingBadgeText: { fontSize: 11, fontWeight: '600' },
    bookmarkBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
    sajdaBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    sajdaText: { fontSize: 11, fontWeight: '700' },
    tafsirBtn: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
    tafsirBtnText: { fontSize: 13, fontWeight: '700' },
    nowPlayingBar: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
    },
    nowPlayingText: { flex: 1, color: colors.foreground, fontSize: 13, fontWeight: '600', textAlign: 'right' },
    stopBtn: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
      backgroundColor: colors.primary,
    },
    stopBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    optionModal: {
      backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20,
    },
    optionHandle: {
      width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border,
      alignSelf: 'center', marginBottom: 16,
    },
    optionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, textAlign: 'right', marginBottom: 16 },
    optionBtn: {
      flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
      paddingVertical: 14, paddingHorizontal: 16,
      borderRadius: 14, marginBottom: 10,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    },
    optionBtnText: { flex: 1, textAlign: 'right', fontSize: 15, color: colors.foreground },
  });

  if (loading) {
    return (
      <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.muted, fontSize: 15 }}>جارٍ تحميل السورة...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.right" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{SURAH_NAMES_AR[surahNumber - 1] || surahData?.name}</Text>
          <Text style={s.headerSub}>
            {surahData?.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} • {surahData?.numberOfAyahs} آية
          </Text>
        </View>
        <TouchableOpacity
          style={[s.playBtn, isContinuousPlaying && { backgroundColor: colors.primary }]}
          onPress={handleContinuousPlay}
        >
          <IconSymbol
            name={isContinuousPlaying ? 'stop.fill' : 'play.fill'}
            size={20}
            color={isContinuousPlaying ? '#fff' : colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Quran List */}
      <FlatList
        ref={flatListRef}
        data={ayahs}
        keyExtractor={item => item.numberInSurah.toString()}
        renderItem={renderAyah}
        ListHeaderComponent={
          surahNumber !== 9 ? (
            <Text style={[s.basmala, { color: colors.primary }]}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </Text>
          ) : null
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
        onScrollToIndexFailed={info => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }, 500);
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Now Playing Bar */}
      {isPlaying && playingAyah && (
        <View style={s.nowPlayingBar}>
          <TouchableOpacity style={s.stopBtn} onPress={() => {
            player.pause();
            setIsPlaying(false);
            setPlayingAyah(null);
            setIsContinuousPlaying(false);
            continuousPlayRef.current = false;
          }}>
            <Text style={s.stopBtnText}>إيقاف</Text>
          </TouchableOpacity>
          <Text style={s.nowPlayingText}>
            🎵 يُشغَّل الآية {playingAyah} من {SURAH_NAMES_AR[surahNumber - 1]}
          </Text>
        </View>
      )}

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={s.optionModal}>
            <View style={s.optionHandle} />
            {selectedAyah && (
              <>
                <Text style={s.optionTitle}>
                  {SURAH_NAMES_AR[surahNumber - 1]} • الآية {selectedAyah.numberInSurah}
                </Text>

                <TouchableOpacity style={s.optionBtn} onPress={() => handleOpenTafsir(selectedAyah)}>
                  <IconSymbol name="book.fill" size={20} color={colors.primary} />
                  <Text style={[s.optionBtnText, { color: colors.primary, fontWeight: '700' }]}>عرض التفسير</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.optionBtn} onPress={() => handlePlayAyah(selectedAyah)}>
                  <IconSymbol
                    name={playingAyah === selectedAyah.numberInSurah && isPlaying ? 'pause.fill' : 'play.fill'}
                    size={20}
                    color={colors.foreground}
                  />
                  <Text style={s.optionBtnText}>
                    {playingAyah === selectedAyah.numberInSurah && isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.optionBtn} onPress={() => handleBookmark(selectedAyah)}>
                  <IconSymbol
                    name={bookmarkedIds.has(`${surahNumber}_${selectedAyah.numberInSurah}`) ? 'bookmark.fill' : 'bookmark'}
                    size={20}
                    color={colors.gold}
                  />
                  <Text style={s.optionBtnText}>
                    {bookmarkedIds.has(`${surahNumber}_${selectedAyah.numberInSurah}`) ? 'إزالة العلامة' : 'إضافة علامة'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.optionBtn} onPress={() => handleShare(selectedAyah)}>
                  <IconSymbol name="square.and.arrow.up" size={20} color={colors.foreground} />
                  <Text style={s.optionBtnText}>مشاركة الآية</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.optionBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowOptions(false);
                    router.push(`/tafsir/${surahNumber}/${selectedAyah.numberInSurah}`);
                  }}
                >
                  <IconSymbol name="arrow.up.right.square" size={20} color={colors.muted} />
                  <Text style={[s.optionBtnText, { color: colors.muted }]}>فتح صفحة التفسير</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Inline Tafsir Bottom Sheet */}
      <TafsirSheet
        visible={showTafsir}
        surahNumber={surahNumber}
        ayah={selectedAyah}
        colors={colors}
        onClose={() => setShowTafsir(false)}
      />
    </ScreenContainer>
  );
}
