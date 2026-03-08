import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Platform,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';

import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { QuranAyahWithAudio } from '@/lib/api/quran-cloud-api';
import { searchVideos, VideoFile } from '@/lib/api/pexels';
import { Image } from 'react-native';
import { getVerseQcfData } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily } from '@/lib/qcf-font-loader';

const STORY_RENDERER_URL = process.env.EXPO_PUBLIC_STORY_RENDERER_URL || '';
const STORY_CACHE_KEY = 'story_of_day_cache';
const VIDEO_CACHE_KEY = '@story_video_cache';

const VIDEO_SEARCH_TERMS = [
  'nature peaceful', 'sky clouds', 'ocean waves',
  'sunrise', 'sunset', 'stars night',
  'forest', 'mountain landscape', 'waterfall',
];

interface VideoCache {
  date: string;
  url: string;
}

const RECITERS = [
  { id: 'ar.alafasy', name: 'مشاري العفاسي' },
  { id: 'ar.husary', name: 'الحصري' },
  { id: 'ar.minshawi', name: 'المنشاوي' },
  { id: 'ar.abdurrahmaansudais', name: 'السديس' },
  { id: 'ar.saoodshuraym', name: 'الشريم' },
];

// Solid dark colors cycled by day of year
const STORY_BG_COLORS = [
  '#1a3a2a', // Deep forest green
  '#1a2a3a', // Deep navy blue
  '#2a1a2a', // Deep purple
  '#3a2a1a', // Deep brown
  '#1a2a2a', // Deep teal
];

interface StoryCache {
  date: string;
  ayah: QuranAyahWithAudio;
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

function getDayOfYear(): number {
  const today = new Date();
  return Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
}

function getDailyBgColor(): string {
  return STORY_BG_COLORS[getDayOfYear() % STORY_BG_COLORS.length];
}

async function fetchDailyVideoUrl(): Promise<string | null> {
  try {
    // Check cache first
    const cached = await AsyncStorage.getItem(VIDEO_CACHE_KEY);
    if (cached) {
      const parsed: VideoCache = JSON.parse(cached);
      if (parsed.date === getTodayDateString() && parsed.url) {
        return parsed.url;
      }
    }

    const dayOfYear = getDayOfYear();
    const term = VIDEO_SEARCH_TERMS[dayOfYear % VIDEO_SEARCH_TERMS.length];
    const data = await searchVideos(term, 1, 5);

    if (data.videos?.length > 0) {
      const video = data.videos[dayOfYear % data.videos.length];
      const hdFile = video.video_files.find((f: VideoFile) => f.quality === 'hd' && f.file_type === 'video/mp4')
        || video.video_files.find((f: VideoFile) => f.quality === 'hd')
        || video.video_files[0];
      if (hdFile?.link) {
        const cacheData: VideoCache = { date: getTodayDateString(), url: hdFile.link };
        await AsyncStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(cacheData));
        return hdFile.link;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export default function StoryOfDayScreen() {
  const router = useRouter();
  const { isDarkMode, settings } = useSettings();

  const [ayah, setAyah] = useState<QuranAyahWithAudio | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id);
  const [renderedVideoUri, setRenderedVideoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);

  // QCF state
  const [qcfGlyphs, setQcfGlyphs] = useState<string[] | null>(null);
  const [qcfFontFamily, setQcfFontFamily] = useState<string | null>(null);

  // Video background state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Deterministic daily background color (fallback)
  const bgColor = useMemo(() => getDailyBgColor(), []);

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
        if (parsedCache.date === todayStr && parsedCache.ayah) {
          setAyah(parsedCache.ayah);
          setLoading(false);
          return;
        }
      }

      const dailyAyah = await fetchDailyAyah();
      setAyah(dailyAyah);

      // Cache for today
      if (dailyAyah) {
        const cacheData: StoryCache = {
          date: todayStr,
          ayah: dailyAyah,
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

  // Fetch daily video background
  useEffect(() => {
    fetchDailyVideoUrl().then((url) => {
      if (url) setVideoUrl(url);
    });
  }, []);

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

  const exportAsImage = useCallback(async () => {
    if (!ayah) {
      Alert.alert('تنبيه', 'لا توجد آية جاهزة حالياً');
      return;
    }
    setExportingImage(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!viewShotRef.current?.capture) {
        Alert.alert('خطأ', 'تعذر التقاط الصورة');
        return;
      }
      const uri = await viewShotRef.current.capture();

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        // Even without gallery permission, try sharing directly
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'ستوري اليوم - روح المسلم',
            UTI: 'public.png',
          });
        } else {
          Alert.alert('تنبيه', 'نحتاج إذن الوصول للصور لحفظ الصورة');
        }
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('تم ✅', 'تم حفظ صورة الستوري في جهازك');
    } catch {
      Alert.alert('خطأ', 'تعذر حفظ الصورة');
    } finally {
      setExportingImage(false);
    }
  }, [ayah]);

  const renderStory = useCallback(async () => {
    if (!ayah) {
      Alert.alert('تنبيه', 'لا توجد آية جاهزة حالياً');
      return;
    }
    if (!STORY_RENDERER_URL) {
      // No video API available — offer image export as fallback
      Alert.alert(
        'إنشاء ستوري',
        'خدمة إنشاء الفيديو غير متوفرة حالياً. هل تريد حفظ الستوري كصورة بدلاً من ذلك؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'حفظ كصورة', onPress: exportAsImage },
        ]
      );
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
          backgroundVideoUrl: null,
          backgroundColor: bgColor,
          duration: 12,
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
      const isTimeout = err && (err as any).name === 'AbortError';
      const message = isTimeout
        ? 'انتهت مهلة إنشاء الفيديو.'
        : 'تعذر إنشاء فيديو الستوري حالياً.';

      Alert.alert(
        'تعذر إنشاء الفيديو',
        `${message}\nهل تريد حفظ الستوري كصورة بدلاً من ذلك؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'حفظ كصورة', onPress: exportAsImage },
        ]
      );
    } finally {
      setRendering(false);
    }
  }, [ayah, bgColor, selectedReciter, exportAsImage]);

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
    await AsyncStorage.removeItem(VIDEO_CACHE_KEY);
    setRenderedVideoUri(null);
    setVideoUrl(null);
    setVideoLoaded(false);
    load();
    fetchDailyVideoUrl().then((url) => {
      if (url) setVideoUrl(url);
    });
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
            {/* Story Card with solid color background */}
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            <View style={styles.storyCard}>
              {/* Background: Video or solid color fallback */}
              <View style={[styles.imageContainer, { backgroundColor: bgColor }]}>
                {videoUrl && (
                  <Video
                    source={{ uri: videoUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted
                    onLoad={() => setVideoLoaded(true)}
                  />
                )}
              </View>
              {/* Loading indicator while video loads */}
              {videoUrl && !videoLoaded && (
                <View style={styles.videoLoadingOverlay}>
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
                </View>
              )}
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                style={styles.gradientOverlay}
              />
              
              <TouchableOpacity
                style={styles.storyTextContainer}
                activeOpacity={0.9}
                onLongPress={handleLongPress}
                delayLongPress={500}
              >
                {qcfGlyphs && qcfFontFamily ? (
                  <Text style={[styles.storyAyah, { fontFamily: qcfFontFamily, fontSize: 22, lineHeight: 42 }]}>
                    {qcfGlyphs.join('')}
                  </Text>
                ) : (
                  <Text style={styles.storyAyah}>{ayah?.text || '—'}</Text>
                )}
                <Text style={styles.storyMeta}>
                  {ayah?.surah?.name || ''} {ayah?.numberInSurah ? `- ${ayah.numberInSurah}` : ''}
                </Text>
                <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 6 }}>
                  اضغط مطولاً للذهاب للآية في المصحف
                </Text>
              </TouchableOpacity>

              {/* Branding */}
              <View style={styles.brandingContainer}>
                <Image source={require('@/assets/images/App-icon.png')} style={styles.brandingIcon} />
                <Text style={styles.brandingText}>روح المسلم</Text>
              </View>
            </View>
            </ViewShot>

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
              onPress={exportAsImage}
              disabled={exportingImage}
              activeOpacity={0.8}
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                style={styles.glassBtn}
              >
                {exportingImage ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="image-outline" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>حفظ كصورة</Text>
                  </>
                )}
              </BlurView>
            </TouchableOpacity>

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
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryBtnText}>جاري إنشاء الفيديو...</Text>
                  </>
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
  gradientOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  storyTextContainer: { flex: 1, justifyContent: 'center' as const, padding: 20, zIndex: 2 },
  storyAyah: { fontSize: 20, lineHeight: 38, textAlign: 'center' as const, fontFamily: 'Cairo-Bold', color: '#fff' },
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
