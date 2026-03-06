/* components/ui/DailyHighlights.tsx */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';
import { getHijriDate } from '../../lib/hijri-date';
import { getTodayAyahWithAudio, QuranAyahWithAudio } from '../../lib/api/quran-cloud-api';
import { searchPhotos } from '../../lib/api/pexels';
import { fetchAppConfig, HighlightItemConfig } from '../../lib/app-config-api';

const STORY_CACHE_KEY = 'story_of_day_cache';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = Math.round(SCREEN_WIDTH * 0.17);
const RING_SIZE = CIRCLE_SIZE + 6;
const ITEM_WIDTH = RING_SIZE + 8 + 14; // itemWrapper width + gap

interface DailyHighlight {
  id: string;
  title: string;
  icon: string;
  color: string;
  imageUrl?: string;
  route: string;
  htmlContent?: string;
}

interface DailyHighlightsProps {
  onStoryPress?: (storyId: string) => void;
}

const DailyHighlights: React.FC<DailyHighlightsProps> = ({ onStoryPress }) => {
  const router = useRouter();
  const { isDarkMode } = useSettings();

  const hijriDate = getHijriDate();

  const [ayah, setAyah] = useState<QuranAyahWithAudio | null>(null);
  const [storyImageUrl, setStoryImageUrl] = useState<string | null>(null);
  const [storyAyahText, setStoryAyahText] = useState<string | null>(null);
  const [adminHighlights, setAdminHighlights] = useState<DailyHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      let gotCachedPhoto = false;
      let gotCachedText = false;
      try {
        // Try reading story cache first (same source as story-of-day page)
        const cached = await AsyncStorage.getItem(STORY_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const todayStr = new Date().toISOString().slice(0, 10);
            if (parsed.date === todayStr && parsed.photoUrl && parsed.ayah?.text) {
              if (mounted) {
                setStoryImageUrl(parsed.photoUrl);
                setStoryAyahText(parsed.ayah.text);
                gotCachedPhoto = true;
                gotCachedText = true;
              }
            }
          } catch { /* ignore parse errors */ }
        }

        const [ayahResult, photosResult] = await Promise.allSettled([
          getTodayAyahWithAudio(),
          !gotCachedPhoto ? searchPhotos('islamic nature sky serene mosque', 1, 15) : Promise.resolve({ photos: [] }),
        ]);

        if (!mounted) return;

        if (ayahResult.status === 'fulfilled' && ayahResult.value) {
          setAyah(ayahResult.value);
          if (!gotCachedText) {
            setStoryAyahText(ayahResult.value.text || null);
          }
        }

        if (!gotCachedPhoto && photosResult.status === 'fulfilled' && photosResult.value.photos.length > 0) {
          const idx = Math.floor(
            Math.random() * Math.min(photosResult.value.photos.length, 10)
          );
          setStoryImageUrl(photosResult.value.photos[idx].src.large);
        }
      } catch {
        // Silently degrade
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Fetch admin-managed highlights from Firestore
  useEffect(() => {
    let mounted = true;
    fetchAppConfig().then(cfg => {
      if (!mounted) return;
      const items = cfg.highlights;
      if (items && items.length > 0) {
        const mapped: DailyHighlight[] = items
          .filter(h => h.enabled)
          .map(h => ({
            id: `admin-${h.id}`,
            title: h.title,
            icon: h.icon,
            color: h.color,
            imageUrl: h.imageUrl || undefined,
            route: h.route,
            htmlContent: h.htmlContent || undefined,
          }));
        setAdminHighlights(mapped);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handlePress = (highlight: DailyHighlight) => {
    onStoryPress?.(highlight.id);
    if (highlight.htmlContent) {
      // Open HTML content in in-app webview
      router.push({ pathname: '/webview', params: { html: highlight.htmlContent, title: highlight.title } } as any);
    } else if (highlight.route.startsWith('http://') || highlight.route.startsWith('https://')) {
      // Open URL in in-app webview
      router.push({ pathname: '/webview', params: { url: highlight.route, title: highlight.title } } as any);
    } else {
      router.push(highlight.route as any);
    }
  };

  // ===== ORDER (من اليمين): التاريخ الهجري, أذكار, آية اليوم, ستوري, الصلاة =====
  const builtInHighlights: DailyHighlight[] = [
    {
      id: 'hijri-date',
      title: `${hijriDate.day} ${hijriDate.monthNameAr}`,
      icon: 'calendar-month',
      color: '#2f7659',
      route: '/hijri',
    },
    {
      id: 'azkar-adhkar',
      title: 'أدعية وأذكار',
      icon: 'hands-pray',
      color: '#be123c',
      route: '/azkar/morning',
    },
    {
      id: 'daily-ayah',
      title: 'آية اليوم',
      icon: 'book-open-page-variant',
      color: '#1e40af',
      route: '/(tabs)/daily-ayah',
    },
    {
      id: 'daily-story',
      title: 'ستوري اليوم',
      icon: 'play-circle-outline',
      color: '#5b21b6',
      imageUrl: storyImageUrl ?? undefined,
      route: '/story-of-day',
    },
    {
      id: 'next-prayer',
      title: 'صلاتي القادمة',
      icon: 'mosque',
      color: '#7c2d12',
      route: '/(tabs)/prayer',
    },
  ];

  // Merge admin-managed highlights from Firestore
  const highlights = [...adminHighlights, ...builtInHighlights];

  const labelColor = isDarkMode ? '#ccc' : '#555';
  const arrowColor = isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)';

  const scrollRef = useRef<ScrollView>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(true);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollX = useRef(0);
  const maxScrollX = useRef(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    scrollX.current = contentOffset.x;
    maxScrollX.current = contentSize.width - layoutMeasurement.width;
    // RTL layout: content starts from right. x=0 is at the right end.
    // As user scrolls left (revealing more items on the left), x increases.
    setCanScrollLeft(contentOffset.x < maxScrollX.current - 10); // can scroll further left (more items on left)
    setCanScrollRight(contentOffset.x > 10); // can scroll back right (items on right)
  }, []);

  return (
    <View style={styles.container}>
      {/* Left arrow — scroll to reveal more items on the left */}
      {canScrollLeft && (
        <TouchableOpacity
          style={[styles.arrowBtn, styles.arrowLeft]}
          onPress={() => {
            const target = Math.min(scrollX.current + ITEM_WIDTH * 2, maxScrollX.current);
            scrollRef.current?.scrollTo?.({ x: target, animated: true });
          }}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={arrowColor} />
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {highlights.map((h) => (
          <TouchableOpacity
            key={h.id}
            style={styles.itemWrapper}
            onPress={() => handlePress(h)}
            activeOpacity={0.75}
          >
            <View style={[styles.ring, { borderColor: h.color }]}>  
              {h.id === 'daily-story' && h.imageUrl ? (
                <View style={styles.storyThumbWrapper}>
                  <Image
                    source={{ uri: h.imageUrl }}
                    style={styles.circleImage}
                    resizeMode="cover"
                  />
                  <View style={styles.storyThumbOverlay} />
                  {storyAyahText ? (
                    <Text style={styles.storyThumbText} numberOfLines={3}>
                      {storyAyahText.slice(0, 60)}
                    </Text>
                  ) : (
                    <MaterialCommunityIcons name="play-circle-outline" size={20} color="#fff" style={{ zIndex: 2 }} />
                  )}
                </View>
              ) : h.imageUrl ? (
                <Image
                  source={{ uri: h.imageUrl }}
                  style={styles.circleImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.circleInner, { backgroundColor: h.color }]}>
                  <MaterialCommunityIcons
                    name={h.icon as any}
                    size={28}
                    color="#fff"
                  />
                </View>
              )}
            </View>
            <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
              {h.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Right arrow — scroll back to show items on the right */}
      {canScrollRight && (
        <TouchableOpacity
          style={[styles.arrowBtn, styles.arrowRight]}
          onPress={() => {
            const target = Math.max(scrollX.current - ITEM_WIDTH * 2, 0);
            scrollRef.current?.scrollTo?.({ x: target, animated: true });
          }}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-right" size={22} color={arrowColor} />
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator size="small" color="#2f7659" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    position: 'relative' as const,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 14,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
  },
  arrowBtn: {
    position: 'absolute' as const,
    top: (RING_SIZE / 2) - 11,
    zIndex: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  arrowLeft: {
    left: 0,
  },
  arrowRight: {
    right: 0,
  },
  itemWrapper: {
    alignItems: 'center',
    width: RING_SIZE + 8,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  circleInner: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleImage: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  storyThumbWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  storyThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 1,
  },
  storyThumbText: {
    position: 'absolute' as const,
    zIndex: 2,
    color: '#fff',
    fontSize: 8,
    lineHeight: 12,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center' as const,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Cairo-Medium',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingBadge: {
    position: 'absolute',
    top: 4,
    right: 12,
  },
});

export default DailyHighlights;
