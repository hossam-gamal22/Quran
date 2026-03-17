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
  Modal,
  FlatList,
  AppState,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import ViewShot from 'react-native-view-shot';

import { useSettings } from '@/contexts/SettingsContext';
import { getSubscriptionState } from '@/lib/subscription-manager';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { QuranAyahWithAudio } from '@/lib/api/quran-cloud-api';
import { searchPhotos, Photo } from '@/lib/api/pexels';
import { Image } from 'react-native';
import { getVerseQcfData } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily } from '@/lib/qcf-font-loader';
import { getDailyStoryOverride } from '@/lib/daily-content-override';
import { createVideoFromImageAndAudio } from '@/lib/ffmpeg-merge';
import { RECITERS } from '@/lib/quran-api';
import { useInterstitialAd } from '@/components/ads/InterstitialAdManager';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { t } from '@/lib/i18n';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';

const STORY_CACHE_KEY = 'story_of_day_cache';
const PHOTO_CACHE_KEY = '@story_photo_cache';
const STORY_RECITER_KEY = '@story_reciter';
const STORY_THUMBNAIL_KEY = '@story_thumbnail_cache';

// Clean, peaceful search terms for beautiful nature photos
const PHOTO_SEARCH_TERMS = [
  'peaceful nature landscape', 'calm ocean horizon',
  'beautiful sunrise sky', 'serene mountain lake',
  'golden sunset clouds', 'starry night sky',
  'green forest morning', 'desert sand dunes',
  'lavender field', 'tropical beach clear water',
];

interface PhotoCache {
  date: string;
  photos: { url: string; portraitUrl: string }[];
}

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
  reciterId?: string;
}

// Top 8 popular reciters for quick access
const POPULAR_RECITERS = [
  'ar.alafasy', 'ar.abdulbasitmurattal', 'ar.husary', 'ar.minshawi',
  'ar.maaborimatar', 'ar.abduraborimatar', 'ar.ahmedajamy', 'ar.muhammadayyoub',
];

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

async function fetchDailyAyah(reciterId: string = 'ar.alafasy'): Promise<QuranAyahWithAudio | null> {
  try {
    const ayahNumber = getDailyAyahNumber();
    const response = await fetch(
      `https://api.alquran.cloud/v1/ayah/${ayahNumber}/${reciterId}`
    );
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

async function fetchDailyPhotos(): Promise<{ url: string; portraitUrl: string }[]> {
  try {
    // Check cache first
    const cached = await AsyncStorage.getItem(PHOTO_CACHE_KEY);
    if (cached) {
      const parsed: PhotoCache = JSON.parse(cached);
      if (parsed.date === getTodayDateString() && parsed.photos?.length > 0) {
        return parsed.photos;
      }
    }

    const dayOfYear = getDayOfYear();
    const photos: { url: string; portraitUrl: string }[] = [];

    // Fetch 3 different photos using different search terms — portrait for story format
    for (let i = 0; i < 3 && photos.length < 3; i++) {
      const term = PHOTO_SEARCH_TERMS[(dayOfYear + i) % PHOTO_SEARCH_TERMS.length];
      try {
        const data = await searchPhotos(term, 1, 8, 'portrait');
        if (data.photos?.length > 0) {
          const photo = data.photos[(dayOfYear + i) % data.photos.length];
          photos.push({
            url: photo.src.large2x || photo.src.large,
            portraitUrl: photo.src.portrait || photo.src.large,
          });
        }
      } catch { /* skip failed term */ }
    }

    if (photos.length > 0) {
      const cacheData: PhotoCache = { date: getTodayDateString(), photos };
      await AsyncStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(cacheData));
    }
    return photos;
  } catch {
    return [];
  }
}

export default function StoryOfDayScreen() {
  const isRTL = useIsRTL();
  const { logoSource } = useAppIdentity();
  const router = useRouter();
  const { isDarkMode, settings } = useSettings();
  const colors = useColors();
  const isArabic = (settings.language || 'ar') === 'ar';

  const [ayah, setAyah] = useState<QuranAyahWithAudio | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [progressPhase, setProgressPhase] = useState<'downloading' | 'creating' | 'done'>('downloading');

  // Reciter selection
  const [selectedReciterId, setSelectedReciterId] = useState('ar.alafasy');
  const [showReciterPicker, setShowReciterPicker] = useState(false);

  // Video preview
  const [previewVideoUri, setPreviewVideoUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const videoRef = useRef<Video>(null);
  const storyCardRef = useRef<ViewShot>(null);

  // Interstitial ad
  const { showAd } = useInterstitialAd();

  // Info modal
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Premium state (controls branding visibility)
  const [isPremium, setIsPremium] = useState(false);
  const [showBranding, setShowBranding] = useState(true); // Premium can toggle, default ON
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    getSubscriptionState().then(s => setIsPremium(s.isPremium));
  }, []);

  // QCF state
  const [qcfGlyphs, setQcfGlyphs] = useState<string[] | null>(null);
  const [qcfFontFamily, setQcfFontFamily] = useState<string | null>(null);

  // Photo background state
  const [photos, setPhotos] = useState<{ url: string; portraitUrl: string }[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const currentPhoto = photos[photoIndex] || null;

  // Deterministic daily background color (fallback)
  const bgColor = useMemo(() => getDailyBgColor(), []);

  // Midnight reset: detect date change
  const lastDateRef = useRef(getTodayDateString());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const today = getTodayDateString();
        if (today !== lastDateRef.current) {
          lastDateRef.current = today;
          // Reset everything for new day
          setPhotos([]);
          setPhotoIndex(0);
          setImageLoaded(false);
          setPreviewVideoUri(null);
          load();
          fetchDailyPhotos().then((fetched) => {
            if (fetched.length > 0) setPhotos(fetched);
          });
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Load saved reciter preference
  useEffect(() => {
    AsyncStorage.getItem(STORY_RECITER_KEY).then((saved) => {
      if (saved) setSelectedReciterId(saved);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Check admin override first
      const { data: storyOverride } = await getDailyStoryOverride();
      if (storyOverride?.ayahText) {
        const overrideAyah = {
          text: storyOverride.ayahText,
          surah: { name: storyOverride.surahName || '', number: 0, numberOfAyahs: 0 },
          numberInSurah: 0,
          number: 0,
        } as unknown as QuranAyahWithAudio;
        setAyah(overrideAyah);
        // Admin can override with imageUrl or videoUrls
        if (storyOverride.imageUrl) {
          setPhotos([{ url: storyOverride.imageUrl, portraitUrl: storyOverride.imageUrl }]);
        } else if (storyOverride.videoUrls?.length) {
          // Legacy video override — use first frame placeholder
          setPhotos(storyOverride.videoUrls.map(u => ({ url: u, portraitUrl: u })));
        }
        // Admin thumbnail override
        if (storyOverride.thumbnailUrl || storyOverride.imageUrl) {
          const thumbUrl = storyOverride.thumbnailUrl || storyOverride.imageUrl!;
          await AsyncStorage.setItem(STORY_THUMBNAIL_KEY, JSON.stringify({
            date: getTodayDateString(),
            url: thumbUrl,
          }));
        }
        setLoading(false);
        return;
      }

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

      const dailyAyah = await fetchDailyAyah(selectedReciterId);
      setAyah(dailyAyah);

      // Cache for today
      if (dailyAyah) {
        const cacheData: StoryCache = {
          date: todayStr,
          ayah: dailyAyah,
          reciterId: selectedReciterId,
        };
        await AsyncStorage.setItem(STORY_CACHE_KEY, JSON.stringify(cacheData));
      }
    } catch {
      Alert.alert(t('common.warning'), t('storyOfDay.loadError'));
    } finally {
      setLoading(false);
    }
  }, [selectedReciterId]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch daily photo backgrounds & save thumbnail for highlights
  useEffect(() => {
    fetchDailyPhotos().then((fetched) => {
      if (fetched.length > 0) {
        setPhotos(fetched);
        // Save thumbnail for DailyHighlights circle
        const thumbData = {
          date: getTodayDateString(),
          url: fetched[0].portraitUrl,
        };
        AsyncStorage.setItem(STORY_THUMBNAIL_KEY, JSON.stringify(thumbData)).catch(() => {});
      }
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
    loadPageFont(data.page, true).then(() => {
      if (cancelled) return;
      setQcfGlyphs(data.glyphs);
      setQcfFontFamily(getPageFontFamily(data.page, true));
    });
    return () => { cancelled = true; };
  }, [ayah?.surah?.number, ayah?.numberInSurah]);

  // Change reciter: re-fetch with new audio
  const handleReciterChange = useCallback(async (reciterId: string) => {
    setSelectedReciterId(reciterId);
    await AsyncStorage.setItem(STORY_RECITER_KEY, reciterId);
    setShowReciterPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Re-fetch ayah with new reciter's audio
    setLoading(true);
    try {
      const dailyAyah = await fetchDailyAyah(reciterId);
      if (dailyAyah) {
        setAyah(dailyAyah);
        const cacheData: StoryCache = {
          date: getTodayDateString(),
          ayah: dailyAyah,
          reciterId,
        };
        await AsyncStorage.setItem(STORY_CACHE_KEY, JSON.stringify(cacheData));
      }
    } catch {}
    setLoading(false);
    // Clear any cached preview video
    setPreviewVideoUri(null);
  }, []);

  // Capture the story card as an image (with text overlay)
  const captureStoryCard = useCallback(async (): Promise<string | null> => {
    try {
      setIsCapturing(true);
      // Small delay for state to apply (hides long-press hint)
      await new Promise(r => setTimeout(r, 100));
      if (storyCardRef.current?.capture) {
        const uri = await storyCardRef.current.capture();
        return uri;
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Generate video preview
  const generatePreview = useCallback(async () => {
    if (!currentPhoto || !ayah?.audio) return;
    setGeneratingPreview(true);
    try {
      // Capture story card with text overlay
      const capturedImage = await captureStoryCard();
      const imageSource = capturedImage || currentPhoto.url;

      const videoUri = await createVideoFromImageAndAudio(
        imageSource,
        ayah.audio,
        (phase, p) => {
          setProgressPhase(phase);
          if (phase === 'downloading') setDownloadProgress(p * 0.4);
          else if (phase === 'creating') setDownloadProgress(0.4 + p * 0.6);
        },
        !!capturedImage, // isLocalImage — skip download if captured locally
      );
      if (videoUri) {
        setPreviewVideoUri(videoUri);
        setShowPreview(true);
      } else {
        Alert.alert(t('common.warning'), t('storyOfDay.videoPreviewRequiresDevBuild'));
      }
    } catch {
      Alert.alert(t('common.error'), t('storyOfDay.previewCreationError'));
    } finally {
      setGeneratingPreview(false);
      setDownloadProgress(0);
    }
  }, [currentPhoto, ayah, captureStoryCard]);

  // Navigate to ayah in Mushaf on long-press
  const handleLongPress = useCallback(() => {
    if (!ayah?.surah?.number) return;
    router.push(`/surah/${ayah.surah.number}${ayah.numberInSurah ? `?ayah=${ayah.numberInSurah}` : ''}` as any);
  }, [ayah, router]);

  // Download: create video from photo + reciter audio via FFmpeg
  const downloadVideo = useCallback(async () => {
    if (!currentPhoto) {
      Alert.alert(t('common.warning'), t('storyOfDay.noImageAvailable'));
      return;
    }
    if (!ayah?.audio) {
      Alert.alert(t('common.warning'), t('storyOfDay.noAudioAvailable'));
      return;
    }
    setSaving(true);
    setDownloadProgress(0);
    setProgressPhase('downloading');
    try {
      // Show interstitial ad before download
      await showAd();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Capture story card with text overlay
      const capturedImage = await captureStoryCard();
      const imageSource = capturedImage || currentPhoto.url;

      const videoUri = await createVideoFromImageAndAudio(
        imageSource,
        ayah.audio,
        (phase, p) => {
          setProgressPhase(phase);
          if (phase === 'downloading') setDownloadProgress(p * 0.4);
          else if (phase === 'creating') setDownloadProgress(0.4 + p * 0.6);
        },
        !!capturedImage, // isLocalImage
      );

      if (!videoUri) {
        Alert.alert(t('common.warning'), t('storyOfDay.videoExportFallback'));
        // Fallback: save the photo itself
        const imgPath = `${FileSystem.cacheDirectory}story-img-${Date.now()}.jpg`;
        const result = await FileSystem.downloadAsync(currentPhoto.url, imgPath);
        if (result?.uri) {
          const perm = await MediaLibrary.requestPermissionsAsync();
          if (perm.granted) await MediaLibrary.saveToLibraryAsync(result.uri);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ ' + t('common.savedSuccess'), t('storyOfDay.imageSaved'));
        return;
      }

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('common.warning'), t('storyOfDay.photoPermissionRequired'));
        return;
      }
      await MediaLibrary.saveToLibraryAsync(videoUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ ' + t('common.savedSuccess'), t('storyOfDay.videoWithAudioSaved'));
    } catch {
      Alert.alert(t('common.error'), t('storyOfDay.videoSaveError'));
    } finally {
      setSaving(false);
      setDownloadProgress(0);
    }
  }, [currentPhoto, ayah, showAd, captureStoryCard]);

  // Share: create video from photo + audio, then share
  const shareVideoAction = useCallback(async () => {
    if (!currentPhoto || !ayah) return;
    setSharing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let fileUri: string | undefined;

      // Capture card & merge with audio
      const capturedImage = await captureStoryCard();
      if (ayah.audio) {
        const merged = await createVideoFromImageAndAudio(
          capturedImage || currentPhoto.url,
          ayah.audio,
          undefined,
          !!capturedImage,
        );
        if (merged) fileUri = merged;
      }

      // Fallback: share the image directly
      if (!fileUri) {
        const imgPath = `${FileSystem.cacheDirectory}story-share-${Date.now()}.jpg`;
        const result = await FileSystem.downloadAsync(currentPhoto.url, imgPath);
        if (!result?.uri) throw new Error('Download failed');
        fileUri = result.uri;
      }

      const mimeType = fileUri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';

      if (Platform.OS === 'ios') {
        const surahName = isArabic ? (ayah.surah?.name || '') : (ayah.surah?.englishName || '');
        const verseText = `${ayah.text}\n\n${surahName}\n\n${t('storyOfDay.shareText')}`;
        await Share.share({ message: verseText, url: fileUri });
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType,
            dialogTitle: t('storyOfDay.shareText'),
          });
        }
      }
    } catch {
      Alert.alert(t('common.error'), t('storyOfDay.shareError'));
    } finally {
      setSharing(false);
    }
  }, [currentPhoto, ayah]);

  const refreshStory = useCallback(async () => {
    // Cycle to next photo background
    if (photos.length > 1) {
      setImageLoaded(false);
      setPhotoIndex((prev) => (prev + 1) % photos.length);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    // Fallback: refetch everything if only 1 or no photos
    await AsyncStorage.removeItem(STORY_CACHE_KEY);
    await AsyncStorage.removeItem(PHOTO_CACHE_KEY);
    setPhotos([]);
    setPhotoIndex(0);
    setImageLoaded(false);
    load();
    fetchDailyPhotos().then((fetched) => {
      if (fetched.length > 0) setPhotos(fetched);
    });
  }, [load, photos.length]);

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <UniversalHeader
          titleColor={colors.text}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('storyOfDay.title')}</Text>
            <SectionInfoButton sectionKey="stories" />
          </View>
        </UniversalHeader>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#2f7659" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {/* Story Card with solid color background */}
            <ViewShot ref={storyCardRef} options={{ format: 'png', quality: 1, width: 1080, height: 1920 }}>
            <View style={styles.storyCard}>
              {/* Background: Photo or solid color fallback */}
              <View style={[styles.imageContainer, { backgroundColor: bgColor }]}>
                {currentPhoto && (
                  <Image
                    source={{ uri: currentPhoto.portraitUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    onLoad={() => setImageLoaded(true)}
                  />
                )}
              </View>
              {/* Loading indicator while image loads */}
              {currentPhoto && !imageLoaded && (
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
                  <Text style={[styles.storyAyah, { fontFamily: qcfFontFamily, fontSize: 22, lineHeight: 42, color: '#FFFFFF' }]}>
                    {qcfGlyphs.join('')}
                  </Text>
                ) : (
                  <Text style={styles.storyAyah}>{ayah?.text || '—'}</Text>
                )}
                <Text style={styles.storyMeta}>
                  {isArabic ? (ayah?.surah?.name || '') : (ayah?.surah?.englishName || '')} {ayah?.numberInSurah ? `- ${ayah.numberInSurah}` : ''}
                </Text>
                {!isCapturing && (
                  <Text style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 6 }}>
                    {t('storyOfDay.longPressHint')}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Branding — premium users can toggle off */}
              {(!isPremium || showBranding) && (
                <View style={styles.brandingContainer}>
                  <Image source={logoSource} style={styles.brandingIcon} />
                </View>
              )}
            </View>
            </ViewShot>

            {/* Reciter selector */}
            <TouchableOpacity
              onPress={() => setShowReciterPicker(true)}
              activeOpacity={0.8}
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                style={[styles.glassBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <MaterialCommunityIcons name="account-music" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  {RECITERS.find(r => r.id === selectedReciterId)?.[isArabic ? 'nameAr' : 'name'] || 'Mishary Al-Afasy'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color="rgba(255,255,255,0.6)" />
              </BlurView>
            </TouchableOpacity>

            {/* Preview button */}
            <TouchableOpacity
              onPress={generatePreview}
              disabled={generatingPreview || !currentPhoto || !ayah?.audio}
              activeOpacity={0.8}
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                style={[styles.glassBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                {generatingPreview ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryBtnText}>
                      {progressPhase === 'creating'
                        ? `${t('storyOfDay.creatingPreview')} ${Math.round(downloadProgress * 100)}%`
                        : t('common.loading')}
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="play-circle-outline" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>{t('storyOfDay.previewVideo')}</Text>
                  </>
                )}
              </BlurView>
            </TouchableOpacity>

            {/* Save & Share buttons */}
            <TouchableOpacity
              onPress={downloadVideo}
              disabled={saving || !currentPhoto}
              activeOpacity={0.8}
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                style={[styles.glassBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                {saving ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryBtnText}>
                      {progressPhase === 'creating'
                        ? `${t('storyOfDay.creatingVideo')} ${Math.round(downloadProgress * 100)}%`
                        : downloadProgress > 0
                          ? `${t('common.loading')} ${Math.round(downloadProgress * 100)}%`
                          : t('common.loading')}
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="download" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>{t('storyOfDay.saveVideoWithReciter')}</Text>
                  </>
                )}
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={shareVideoAction}
              disabled={sharing || !currentPhoto}
              activeOpacity={0.8}
            >
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                style={[styles.glassBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                {sharing ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryBtnText}>{t('storyOfDay.sharingInProgress')}</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>{t('common.share')}</Text>
                  </>
                )}
              </BlurView>
            </TouchableOpacity>

            {/* Premium: branding toggle */}
            {isPremium && (
              <TouchableOpacity
                onPress={() => setShowBranding(prev => !prev)}
                activeOpacity={0.8}
              >
                <BlurView
                  intensity={Platform.OS === 'ios' ? 60 : 40}
                  tint="dark"
                  style={[styles.glassBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <MaterialCommunityIcons
                    name={showBranding ? 'watermark' : 'water-off'}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.primaryBtnText}>
                    {showBranding ? t('storyOfDay.hideBranding') : t('storyOfDay.showBranding')}
                  </Text>
                  <MaterialCommunityIcons
                    name={showBranding ? 'toggle-switch' : 'toggle-switch-off-outline'}
                    size={28}
                    color={showBranding ? '#2f7659' : 'rgba(255,255,255,0.4)'}
                  />
                </BlurView>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* Reciter Picker Modal */}
        <Modal
          visible={showReciterPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReciterPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 90 : 50}
              tint={isDarkMode ? 'dark' : 'light'}
              style={styles.reciterModalBlur}
            >
              <View style={[
                styles.reciterModalContent,
                { backgroundColor: isDarkMode ? 'rgba(30,30,32,0.85)' : 'rgba(255,255,255,0.9)' },
              ]}>
                <View style={[styles.reciterModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.reciterModalTitle, { color: isDarkMode ? '#fff' : '#333' }]}>
                    {t('storyOfDay.chooseReciter')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowReciterPicker(false)}>
                    <MaterialCommunityIcons name="close" size={24} color={isDarkMode ? '#fff' : '#333'} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={[
                    ...RECITERS.filter(r => POPULAR_RECITERS.includes(r.id)),
                    ...RECITERS.filter(r => !POPULAR_RECITERS.includes(r.id)),
                  ]}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 400 }}
                  renderItem={({ item, index }) => (
                    <>
                      {index === POPULAR_RECITERS.length && (
                        <View style={styles.reciterDivider}>
                          <Text style={[styles.reciterDividerText, { color: isDarkMode ? '#888' : '#999', textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('storyOfDay.allReciters')}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.reciterItem,
                          { flexDirection: isRTL ? 'row-reverse' : 'row' },
                          selectedReciterId === item.id && { backgroundColor: '#0f987f20' },
                        ]}
                        onPress={() => handleReciterChange(item.id)}
                      >
                        <Text style={[
                          styles.reciterItemText,
                          { color: isDarkMode ? '#fff' : '#333' },
                          selectedReciterId === item.id && { color: '#0f987f', fontFamily: fontBold() },
                        ]}>
                          {isArabic ? item.nameAr : item.name}
                        </Text>
                        {selectedReciterId === item.id && (
                          <MaterialCommunityIcons name="check-circle" size={22} color="#0f987f" />
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                />
              </View>
            </BlurView>
          </View>
        </Modal>

        {/* Video Preview Modal */}
        <Modal
          visible={showPreview && !!previewVideoUri}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPreview(false)}
        >
          <View style={styles.previewOverlay}>
            <SafeAreaView style={styles.previewContainer}>
              <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.previewCloseBtn}>
                  <MaterialCommunityIcons name="close" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.previewTitle}>{t('storyOfDay.previewVideo')}</Text>
                <View style={{ width: 36 }} />
              </View>
              {previewVideoUri && (
                <Video
                  ref={videoRef}
                  source={{ uri: previewVideoUri }}
                  style={styles.previewVideo}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping
                  useNativeControls
                />
              )}
            </SafeAreaView>
          </View>
        </Modal>
        {/* Info Modal */}
        <Modal
          visible={showInfoModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfoModal(false)}
        >
          <View style={styles.infoModalOverlay}>
            <View style={[styles.infoModalCard, { backgroundColor: isDarkMode ? '#1c1c1e' : '#fff' }]}>
              <View style={styles.infoModalIconWrap}>
                <MaterialCommunityIcons name="play-box-outline" size={52} color="#2f7659" />
              </View>
              <Text style={[styles.infoModalTitle, { color: colors.text }]}>{t('storyOfDay.title')}</Text>
              <Text style={[styles.infoModalBody, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('storyOfDay.infoBody1')}
              </Text>
              <Text style={[styles.infoModalBody, { color: colors.text, marginTop: 12, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('storyOfDay.infoBody2')}
              </Text>
              <Text style={[styles.infoModalBody, { color: 'rgba(47,118,89,0.9)', marginTop: 12, fontFamily: fontSemiBold(), textAlign: isRTL ? 'right' : 'left' }]}>
                {t('storyOfDay.infoBody3')}
              </Text>
              <TouchableOpacity
                style={styles.infoModalBtn}
                onPress={() => setShowInfoModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.infoModalBtnText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

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
  storyAyah: { fontSize: 20, lineHeight: 38, textAlign: 'center' as const, fontFamily: fontBold(), color: '#fff' },
  storyMeta: { marginTop: 12, textAlign: 'center' as const, fontFamily: fontRegular(), color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  sectionTitle: { marginTop: 14, marginBottom: 8, fontFamily: fontBold(), fontSize: 16 },
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
  primaryBtnText: { color: '#fff', fontFamily: fontBold(), fontSize: 16 },
  brandingContainer: {
    position: 'absolute' as const,
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 3,
  },
  brandingIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    opacity: 0.85,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end' as const,
  },
  reciterModalBlur: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden' as const,
  },
  reciterModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  reciterModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  reciterModalTitle: {
    fontSize: 20,
    fontFamily: fontBold(),
  },
  reciterItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  reciterItemText: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
  },
  reciterDivider: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.3)',
    marginTop: 4,
  },
  reciterDividerText: {
    fontSize: 13,
    fontFamily: fontMedium(),
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: fontBold(),
  },
  previewVideo: {
    flex: 1,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 28,
  },
  infoModalCard: {
    width: '100%' as const,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
  },
  infoModalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(47,118,89,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  infoModalTitle: {
    fontSize: 24,
    fontFamily: fontBold(),
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  infoModalBody: {
    fontSize: 15,
    fontFamily: fontRegular(),
    lineHeight: 26,
    textAlign: 'center' as const,
  },
  infoModalBtn: {
    marginTop: 24,
    backgroundColor: '#2f7659',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignSelf: 'stretch' as const,
    alignItems: 'center' as const,
  },
  infoModalBtnText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: fontBold(),
  },
});
