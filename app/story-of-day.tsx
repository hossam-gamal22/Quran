import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Dimensions,
  Platform,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { QuranAyahWithAudio } from '@/lib/api/quran-cloud-api';
import { searchPhotos } from '@/lib/api/pexels';
import { Image } from 'react-native';
import { getVerseQcfData } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily } from '@/lib/qcf-font-loader';

const STORY_RENDERER_URL = process.env.EXPO_PUBLIC_STORY_RENDERER_URL || '';
const STORY_CACHE_KEY = 'story_of_day_cache';

const RECITERS = [
  { id: 'ar.alafasy', name: 'مشاري العفاسي' },
  { id: 'ar.husary', name: 'الحصري' },
  { id: 'ar.minshawi', name: 'المنشاوي' },
  { id: 'ar.abdurrahmaansudais', name: 'السديس' },
  { id: 'ar.saoodshuraym', name: 'الشريم' },
];

// Nature search queries for Pexels - sky, sea, clouds, nature
const NATURE_QUERIES = [
  'sky clouds sunset',
  'ocean sea waves',
  'mountains nature landscape',
  'clouds sky blue',
  'sunrise nature',
  'starry night sky',
  'calm sea horizon',
  'green forest nature',
  'desert sand dunes',
  'waterfall nature',
];

interface StoryCache {
  date: string;
  ayah: QuranAyahWithAudio;
  photoUrl: string;
}

// Deterministic daily ayah number based on day of year
function getDailyAyahNumber(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return (dayOfYear % 6236) + 1;
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function fetchDailyAyah(): Promise<QuranAyahWithAudio | null> {
  try {
    const ayahNumber = getDailyAyahNumber();
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${ayahNumber}/ar.alafasy`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || null;
  } catch {
    return null;
  }
}

async function fetchAyahWithReciter(ayahNumber: number, reciterEdition: string): Promise<QuranAyahWithAudio | null> {
  try {
    const response = await fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/${reciterEdition}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || null;
  } catch {
    return null;
  }
}

async function pickNaturePhoto(): Promise<string | null> {
  try {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const queryIndex = dayOfYear % NATURE_QUERIES.length;
    const query = NATURE_QUERIES[queryIndex];
    const page = (dayOfYear % 3) + 1;
    
    const result = await searchPhotos(query, page, 10);
    if (!result.photos || result.photos.length === 0) return null;
    
    const photoIndex = dayOfYear % result.photos.length;
    const photo = result.photos[photoIndex];
    return photo.src.large2x || photo.src.large || photo.src.original;
  } catch {
    return null;
  }
}

export default function StoryOfDayScreen() {
  const router = useRouter();
  const { isDarkMode, settings } = useSettings();

  const [ayah, setAyah] = useState<QuranAyahWithAudio | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id);
  const [bgPhotoUrl, setBgPhotoUrl] = useState<string | null>(null);
  const [renderedVideoUri, setRenderedVideoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  // QCF state
  const [qcfGlyphs, setQcfGlyphs] = useState<string[] | null>(null);
  const [qcfFontFamily, setQcfFontFamily] = useState<string | null>(null);

  // Ken Burns subtle animation
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.08, { duration: 12000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    translateX.value = withRepeat(
      withTiming(-10, { duration: 14000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
  }));

  const colors = useMemo(
    () => ({
      bg: isDarkMode ? '#11151c' : '#f5f5f5',
      card: isDarkMode ? '#1a1a2e' : '#fff',
      text: isDarkMode ? '#fff' : '#222',
      textMuted: isDarkMode ? '#9aa0aa' : '#666',
      primary: '#2f7659',
    }),
    [isDarkMode]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = getTodayDateString();

      // Try cache first
      const cached = await AsyncStorage.getItem(STORY_CACHE_KEY);
      if (cached) {
        const parsedCache: StoryCache = JSON.parse(cached);
        if (parsedCache.date === todayStr && parsedCache.ayah && parsedCache.photoUrl) {
          setAyah(parsedCache.ayah);
          setBgPhotoUrl(parsedCache.photoUrl);
          setLoading(false);
          return;
        }
      }

      const [dailyAyah, photoUrl] = await Promise.all([
        fetchDailyAyah(),
        pickNaturePhoto(),
      ]);
      
      setAyah(dailyAyah);
      setBgPhotoUrl(photoUrl);

      // Cache for today
      if (dailyAyah && photoUrl) {
        const cacheData: StoryCache = {
          date: todayStr,
          ayah: dailyAyah,
          photoUrl,
        };
        await AsyncStorage.setItem(STORY_CACHE_KEY, JSON.stringify(cacheData));
      }
    } catch {
      Alert.alert('تنبيه', 'تعذر تحميل بيانات الستوري حالياً');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load QCF font when ayah is available
  useEffect(() => {
    if (!ayah?.surah?.number || !ayah.numberInSurah) {
      setQcfGlyphs(null);
      setQcfFontFamily(null);
      return;
    }
    let cancelled = false;
    const data = getVerseQcfData(ayah.surah.number, ayah.numberInSurah);
    if (!data) {
      setQcfGlyphs(null);
      setQcfFontFamily(null);
      return;
    }
    loadPageFont(data.page).then(() => {
      if (cancelled) return;
      setQcfGlyphs(data.glyphs);
      setQcfFontFamily(getPageFontFamily(data.page));
    });
    return () => { cancelled = true; };
  }, [ayah?.surah?.number, ayah?.numberInSurah]);

  // Navigate to ayah in Mushaf on long-press
  const handleLongPress = useCallback(() => {
    if (!ayah?.surah?.number) return;
    router.push(`/surah/${ayah.surah.number}${ayah.numberInSurah ? `?ayah=${ayah.numberInSurah}` : ''}` as any);
  }, [ayah, router]);

  const renderStory = useCallback(async () => {
    if (!ayah) {
      Alert.alert('تنبيه', 'لا توجد آية جاهزة حالياً');
      return;
    }
    if (!STORY_RENDERER_URL) {
      Alert.alert('تنبيه', 'خدمة إنشاء الفيديو غير متوفرة حالياً. يمكنك مشاركة الآية كنص بدلاً من ذلك.');
      return;
    }

    setRendering(true);
    try {
      const recited = await fetchAyahWithReciter(ayah.number, selectedReciter);
      const reciterAudioUrl = recited?.audio || ayah.audio;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(STORY_RENDERER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text: ayah.text,
          lang: 'ar',
          reciterAudioUrl,
          backgroundImageUrl: bgPhotoUrl,
          duration: 12,
          width: 1080,
          height: 1920,
          watermark: 'روح المسلم',
        }),
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Renderer failed ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const target = `${FileSystem.cacheDirectory}story-${Date.now()}.mp4`;
      await FileSystem.writeAsStringAsync(target, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setRenderedVideoUri(target);
    } catch (err) {
      if (err && (err as any).name === 'AbortError') {
        Alert.alert('خطأ', 'انتهت مهلة إنشاء الفيديو. حاول مرة أخرى.');
      } else {
        Alert.alert('خطأ', 'تعذر إنشاء فيديو الستوري حالياً');
      }
    } finally {
      setRendering(false);
    }
  }, [ayah, bgPhotoUrl, selectedReciter]);

  const shareStory = useCallback(async () => {
    if (!ayah) return;
    setSharing(true);
    try {
      const text = `${ayah.text}\n\n${ayah.surah?.name || ''}\n\nمن تطبيق روح المسلم`;
      await Share.share({
        title: 'ستوري اليوم - روح المسلم',
        message: text,
        ...(renderedVideoUri ? { url: renderedVideoUri } : {}),
      });
    } catch {
      Alert.alert('خطأ', 'تعذر المشاركة حالياً');
    } finally {
      setSharing(false);
    }
  }, [ayah, renderedVideoUri]);

  const downloadToDevice = useCallback(async () => {
    if (!renderedVideoUri) return;
    setSaving(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('تنبيه', 'نحتاج إذن الوصول للصور لحفظ الفيديو');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(renderedVideoUri);
      Alert.alert('تم', 'تم حفظ الفيديو في جهازك');
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ الفيديو');
    } finally {
      setSaving(false);
    }
  }, [renderedVideoUri]);

  const refreshStory = useCallback(async () => {
    await AsyncStorage.removeItem(STORY_CACHE_KEY);
    setRenderedVideoUri(null);
    load();
  }, [load]);

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>ستوري اليوم</Text>
          <TouchableOpacity onPress={refreshStory} style={styles.headerBtn}>
            <MaterialCommunityIcons name="refresh" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Story Card with animated nature photo */}
            <View style={styles.storyCard}>
              {bgPhotoUrl ? (
                <View style={styles.imageContainer}>
                  <Animated.Image
                    source={{ uri: bgPhotoUrl }}
                    style={[styles.storyImage, imageAnimatedStyle]}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay} />
                </View>
              ) : (
                <View style={[styles.imageContainer, { backgroundColor: '#1a2332' }]}>
                  <View style={styles.imageOverlay} />
                </View>
              )}
              
              <TouchableOpacity
                style={styles.storyTextContainer}
                activeOpacity={0.9}
                onLongPress={handleLongPress}
                delayLongPress={500}
              >
                {qcfGlyphs && qcfFontFamily ? (
                  <Text style={[styles.storyAyah, { fontFamily: qcfFontFamily, fontSize: 28, lineHeight: 52 }]}>
                    {qcfGlyphs.join('')}
                  </Text>
                ) : (
                  <Text style={styles.storyAyah}>{ayah?.text || '—'}</Text>
                )}
                <Text style={styles.storyMeta}>
                  {ayah?.surah?.name || ''} {ayah?.numberInSurah ? `- ${ayah.numberInSurah}` : ''}
                </Text>
                <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 6 }}>
                  اضغط مطولاً للذهاب للآية في المصحف
                </Text>
              </TouchableOpacity>

              {/* Branding */}
              <View style={styles.brandingContainer}>
                <Image source={require('@/assets/images/App-icon.png')} style={styles.brandingIcon} />
                <Text style={styles.brandingText}>روح المسلم</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>القارئ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recitersRow}>
              {RECITERS.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setSelectedReciter(r.id)}
                  style={[
                    styles.reciterChip,
                    {
                      backgroundColor: selectedReciter === r.id ? colors.primary : 'rgba(120,120,128,0.15)',
                    },
                  ]}
                >
                  <Text style={{ color: '#fff', fontFamily: 'Cairo-SemiBold' }}>{r.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={renderStory}
              disabled={rendering}
              activeOpacity={0.8}
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                style={styles.glassBtn}
              >
                {rendering ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="movie-open-play" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>إنشاء فيديو الستوري</Text>
                  </>
                )}
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={shareStory}
              disabled={sharing}
              activeOpacity={0.8}
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                style={styles.glassBtn}
              >
                {sharing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>مشاركة الآية</Text>
                  </>
                )}
              </BlurView>
            </TouchableOpacity>

            {renderedVideoUri ? (
              <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
                <Video
                  source={{ uri: renderedVideoUri }}
                  style={styles.video}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls
                  shouldPlay={false}
                />
                <TouchableOpacity
                  onPress={downloadToDevice}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  <BlurView
                    intensity={Platform.OS === 'ios' ? 60 : 40}
                    tint="dark"
                    style={styles.glassBtn}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="download" size={20} color="#fff" />
                        <Text style={styles.primaryBtnText}>تحميل الفيديو</Text>
                      </>
                    )}
                  </BlurView>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,128,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden' as const,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Cairo-Bold' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 120 },
  storyCard: { borderRadius: 20, overflow: 'hidden', aspectRatio: 9 / 16, position: 'relative' as const },
  imageContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' as const },
  storyImage: { width: '120%', height: '120%', marginLeft: '-10%', marginTop: '-10%' } as any,
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  storyTextContainer: { flex: 1, justifyContent: 'center' as const, padding: 20, zIndex: 2 },
  storyAyah: { fontSize: 24, lineHeight: 44, textAlign: 'center' as const, fontFamily: 'Cairo-Bold', color: '#fff' },
  storyMeta: { marginTop: 12, textAlign: 'center' as const, fontFamily: 'Cairo-Regular', color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  sectionTitle: { marginTop: 14, marginBottom: 8, fontFamily: 'Cairo-Bold', fontSize: 16, textAlign: 'right' },
  recitersRow: { gap: 8, paddingVertical: 4 },
  reciterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, overflow: 'hidden' as const },
  primaryBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  glassBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    overflow: 'hidden' as const,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  primaryBtnText: { color: '#fff', fontFamily: 'Cairo-Bold', fontSize: 16 },
  previewCard: { marginTop: 16, borderRadius: 16, padding: 12 },
  video: { width: '100%', aspectRatio: 9 / 16, borderRadius: 14, backgroundColor: '#000' },
  brandingContainer: {
    position: 'absolute' as const,
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    zIndex: 3,
  },
  brandingIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  brandingText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontFamily: 'Cairo-SemiBold',
  },
});
