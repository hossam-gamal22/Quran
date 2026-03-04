/* components/ui/DailyHighlights.tsx */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { getHijriDate } from '../../lib/hijri-date';
import { getRandomDua } from '../../lib/api/duas-api';
import { getTodayAyahWithAudio, QuranAyahWithAudio } from '../../lib/api/quran-cloud-api';
import { searchPhotos, searchVideos } from '../../lib/api/pexels';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.28);
const CARD_HEIGHT = CARD_WIDTH + 60;

interface DailyHighlight {
  id: string;
  title: string;
  icon: string;
  gradient: [string, string];
  description?: string;
  imageUrl?: string;
  route: string;
}

interface DailyHighlightsProps {
  onStoryPress?: (storyId: string) => void;
}

const DailyHighlights: React.FC<DailyHighlightsProps> = ({ onStoryPress }) => {
  const router = useRouter();

  const hijriDate = getHijriDate();
  const dailyDua = getRandomDua();

  const [ayah, setAyah] = useState<QuranAyahWithAudio | null>(null);
  const [storyImageUrl, setStoryImageUrl] = useState<string | null>(null);
  const [storyVideoUrl, setStoryVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [ayahResult, photosResult, videosResult] = await Promise.allSettled([
          getTodayAyahWithAudio(),
          searchPhotos('islamic nature sky serene mosque', 1, 15),
          searchVideos('islamic nature mosque prayer', 1, 5),
        ]);

        if (!mounted) return;

        if (ayahResult.status === 'fulfilled' && ayahResult.value) {
          setAyah(ayahResult.value);
        }

        if (photosResult.status === 'fulfilled' && photosResult.value.photos.length > 0) {
          const idx = Math.floor(
            Math.random() * Math.min(photosResult.value.photos.length, 10)
          );
          setStoryImageUrl(photosResult.value.photos[idx].src.large);
        }

        if (videosResult.status === 'fulfilled' && videosResult.value.videos.length > 0) {
          const video = videosResult.value.videos[0];
          const sdFile =
            video.video_files.find((f) => f.quality === 'sd') ||
            video.video_files.find((f) => f.quality === 'hd') ||
            video.video_files[0];
          if (sdFile?.link) {
            setStoryVideoUrl(sdFile.link);
          }
        }
      } catch {
        // Silently degrade
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handlePress = (highlight: DailyHighlight) => {
    onStoryPress?.(highlight.id);
    router.push(highlight.route as any);
  };

  const highlights: DailyHighlight[] = [
    {
      id: 'hijri-date',
      title: `${hijriDate.day} ${hijriDate.monthNameAr}`,
      icon: 'calendar-islamic',
      gradient: ['#2f7659', '#1a4d35'],
      description: `${hijriDate.year} هـ`,
      route: '/hijri',
    },
    {
      id: 'daily-story',
      title: 'ستوري اليوم',
      icon: 'play-circle-outline',
      gradient: ['#5b21b6', '#3730a3'],
      description: ayah?.surah?.name ?? 'جاري التحميل...',
      imageUrl: storyImageUrl ?? undefined,
      route: '/night-reading',
    },
    {
      id: 'daily-dua',
      title: 'دعاء اليوم',
      icon: 'hands-pray',
      gradient: ['#dc2626', '#b91c1c'],
      description: dailyDua?.textAr ? `${dailyDua.textAr.substring(0, 18)}…` : undefined,
      route: '/azkar/sunnah',
    },
    {
      id: 'daily-ayah',
      title: 'آية اليوم',
      icon: 'book-open-page-variant',
      gradient: ['#1e40af', '#1e3a8a'],
      description: ayah?.surah?.name ?? 'جاري التحميل...',
      route: '/(tabs)/daily-ayah',
    },
    {
      id: 'next-prayer',
      title: 'صلاتي القادمة',
      icon: 'mosque',
      gradient: ['#7c2d12', '#5a1f0f'],
      route: '/(tabs)/prayer',
    },
    {
      id: 'azkar-adhkar',
      title: 'أدعية وأذكار',
      icon: 'meditation',
      gradient: ['#be123c', '#9f1239'],
      route: '/azkar/morning',
    },
  ];

  const renderCardContent = (highlight: DailyHighlight) => (
    <View style={styles.cardContent}>
      <MaterialCommunityIcons
        name={highlight.icon as any}
        size={32}
        color="white"
        style={styles.cardIcon}
      />
      <Text style={styles.cardTitle} numberOfLines={2}>
        {highlight.title}
      </Text>
      {highlight.description ? (
        <Text style={styles.cardDescription} numberOfLines={1}>
          {highlight.description}
        </Text>
      ) : null}
    </View>
  );

  const renderCard = (highlight: DailyHighlight) => {
    // Story card with video
    if (highlight.id === 'daily-story' && storyVideoUrl) {
      return (
        <View style={[styles.card, { overflow: 'hidden' }]}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Video
              ref={videoRef}
              source={{ uri: storyVideoUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping
              isMuted
              volume={0}
            />
          </View>
          <View style={styles.androidDarkOverlay}>{renderCardContent(highlight)}</View>
        </View>
      );
    }

    // Image card (photo background)
    if (highlight.imageUrl) {
      return (
        <ImageBackground
          source={{ uri: highlight.imageUrl }}
          style={styles.card}
          imageStyle={styles.cardImage}
          resizeMode="cover"
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={55} tint="dark" style={styles.cardOverlay}>
              {renderCardContent(highlight)}
            </BlurView>
          ) : (
            <View style={styles.androidDarkOverlay}>{renderCardContent(highlight)}</View>
          )}
        </ImageBackground>
      );
    }

    // Gradient card
    return (
      <LinearGradient
        colors={highlight.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {Platform.OS === 'ios' ? (
          <View style={styles.iosGlassLayer}>{renderCardContent(highlight)}</View>
        ) : (
          renderCardContent(highlight)
        )}
      </LinearGradient>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {highlights.map((highlight) => (
          <TouchableOpacity
            key={highlight.id}
            style={styles.cardWrapper}
            onPress={() => handlePress(highlight)}
            activeOpacity={0.85}
          >
            {renderCard(highlight)}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT + Spacing.lg * 2,
    marginVertical: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
  },
  cardWrapper: {
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  card: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    borderRadius: BorderRadius.lg,
  },
  cardOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  androidDarkOverlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  iosGlassLayer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cardIcon: {
    marginBottom: 6,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    textAlign: 'center',
  },
  loadingBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
  },
});

export default DailyHighlights;
