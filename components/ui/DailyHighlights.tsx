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
  Modal,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { fontBold, fontMedium, fontSemiBold } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';
import { getLocalizedHijriDate } from '../../lib/hijri-date';
import { getTodayAyahWithAudio, QuranAyahWithAudio } from '../../lib/api/quran-cloud-api';
import { fetchAppConfig, fetchActiveTempPages, subscribeToHighlights, getHighlightTitle, HighlightItemConfig } from '../../lib/app-config-api';
import { getDuaOfTheDay } from '../../data/daily-duas';
import { getLanguage, t } from '@/lib/i18n';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { safeIcon } from '@/lib/safe-icon';
const STORY_CACHE_KEY = 'story_of_day_cache';
const HIGHLIGHTS_ORDER_KEY = '@highlights_order';
const STORY_THUMBNAIL_KEY = '@story_thumbnail_cache';

// Match SOLID_BACKGROUNDS from story-of-day page
const STORY_COLORS = ['#1a3a2a', '#1a2744', '#2d2d2d', '#2d1b4e', '#1a3044'];

function getDayOfYear(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WEB_MAX_WIDTH = Platform.OS === 'web' ? Math.min(SCREEN_WIDTH, 480) : SCREEN_WIDTH;
const CIRCLE_SIZE = Math.round(WEB_MAX_WIDTH * 0.17);
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
  showReorderButton?: boolean;
  onNextPrayerPress?: () => void;
}

const DailyHighlights: React.FC<DailyHighlightsProps> = ({ onStoryPress, showReorderButton, onNextPrayerPress }) => {
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();

  const hijriDate = getLocalizedHijriDate();

  const [ayah, setAyah] = useState<QuranAyahWithAudio | null>(null);
  const [storyAyahText, setStoryAyahText] = useState<string | null>(null);
  const [storySurahName, setStorySurahName] = useState<string | null>(null);
  const [storyThumbnailUrl, setStoryThumbnailUrl] = useState<string | null>(null);
  const [adminHighlights, setAdminHighlights] = useState<DailyHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightOrder, setHighlightOrder] = useState<string[]>([]);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [tempOrder, setTempOrder] = useState<string[]>([]);

  const storyBgColor = STORY_COLORS[getDayOfYear() % STORY_COLORS.length];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // Try reading story cache for ayah text
        const todayStr = getTodayDateString();
        const cached = await AsyncStorage.getItem(STORY_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.date === todayStr && parsed.ayah?.text) {
              if (mounted) {
                setStoryAyahText(parsed.ayah.text);
                setStorySurahName(parsed.ayah.surah?.name || null);
              }
            }
          } catch { /* ignore parse errors */ }
        }

        // Load photo thumbnail
        const thumbCached = await AsyncStorage.getItem(STORY_THUMBNAIL_KEY);
        if (thumbCached) {
          try {
            const thumbParsed = JSON.parse(thumbCached);
            if (thumbParsed.date === todayStr && thumbParsed.url) {
              if (mounted) setStoryThumbnailUrl(thumbParsed.url);
              return; // We have both text and thumbnail
            }
          } catch {}
        }

        // If no cached text, fetch today's ayah
        if (!storyAyahText) {
          const ayahResult = await getTodayAyahWithAudio();
          if (!mounted) return;
          if (ayahResult) {
            setAyah(ayahResult);
            setStoryAyahText(ayahResult.text || null);
            setStorySurahName(ayahResult.surah?.name || null);
          }
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

  // Subscribe to real-time admin highlights + fetch temp pages
  useEffect(() => {
    let mounted = true;
    const lang = getLanguage();

    // Real-time subscription for admin highlights
    const unsubscribe = subscribeToHighlights((highlights) => {
      if (!mounted) return;
      const mapped: DailyHighlight[] = highlights
        .filter(h => h.type !== 'temp_page') // temp pages handled separately
        .map(h => ({
          id: `admin-${h.id}`,
          title: getHighlightTitle(h, lang),
          icon: h.icon,
          color: h.color,
          imageUrl: h.imageUrl || undefined,
          route: h.route,
          htmlContent: h.htmlContent || undefined,
        }));
      setAdminHighlights(prev => [...mapped, ...prev.filter(p => p.id.startsWith('temp-'))]);
    });

    // Fetch active temp pages (one-time)
    const loadTempPages = async () => {
      try {
        const tempPages = await fetchActiveTempPages();
        if (!mounted) return;
        if (tempPages.length > 0) {
          const isArabic = lang === 'ar';
          const tempHighlights: DailyHighlight[] = tempPages.map(tp => ({
            id: `temp-${tp.id}`,
            title: isArabic ? tp.title : (tp.titleEn || tp.title),
            icon: tp.icon || 'file-document-outline',
            color: tp.color || '#0f987f',
            route: `/temp-page/${tp.id}`,
          }));
          setAdminHighlights(prev => [
            ...prev.filter(p => !p.id.startsWith('temp-')),
            ...tempHighlights,
          ]);
        }
      } catch {}
    };
    loadTempPages();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(HIGHLIGHTS_ORDER_KEY).then(stored => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setHighlightOrder(parsed);
        } catch {}
      }
    });
  }, []);

  const handlePress = (highlight: DailyHighlight) => {
    onStoryPress?.(highlight.id);
    if (highlight.id === 'next-prayer' && onNextPrayerPress) {
      onNextPrayerPress();
      return;
    }
    if (highlight.htmlContent) {
      // Open HTML content in in-app webview
      router.push({ pathname: '/webview', params: { html: highlight.htmlContent, title: highlight.title } } as any);
    } else if (highlight.route.startsWith('http://') || highlight.route.startsWith('https://')) {
      // Open URL in in-app webview
      router.push({ pathname: '/webview', params: { url: highlight.route, title: highlight.title } } as any);
    } else {
      // Sanitize deprecated /special-surah routes → /surah/{number}
      let route = highlight.route;
      if (route.startsWith('/special-surah')) {
        const match = route.match(/[?&]surah=(\d+)/);
        route = `/surah/${match ? match[1] : '18'}`;
      }
      router.push(route as any);
    }
  };

  // ===== ORDER (من اليمين): التاريخ الهجري, أذكار, دعاء اليوم, آية اليوم, ستوري, الصلاة =====
  const dailyDua = getDuaOfTheDay();

  const builtInHighlights: DailyHighlight[] = [
    {
      id: 'hijri-date',
      title: `${hijriDate.day} ${hijriDate.monthName}`,
      icon: 'calendar-month',
      color: '#2f7659',
      route: '/hijri',
    },
    {
      id: 'radio',
      title: t('radio.title'),
      icon: 'radio',
      color: '#16a34a',
      route: '/radio',
    },
    {
      id: 'azkar-adhkar',
      title: t('azkar.dailyAzkar'),
      icon: 'hands-pray',
      color: '#be123c',
      route: '/daily-dhikr',
    },
    {
      id: 'daily-dua',
      title: t('home.dailyDua'),
      icon: 'book-heart',
      color: '#7c3aed',
      route: `/daily-dua`,
    },
    {
      id: 'daily-ayah',
      title: t('home.dailyVerse'),
      icon: 'book-open-page-variant',
      color: '#1e40af',
      route: '/daily-ayah',
    },
    {
      id: 'daily-story',
      title: t('home.dailyStory'),
      icon: 'book-open-variant',
      color: storyBgColor,
      route: '/story-of-day',
    },
    {
      id: 'next-prayer',
      title: t('prayer.nextPrayer'),
      icon: 'mosque',
      color: '#7c2d12',
      route: '/(tabs)/prayer',
    },
  ];

  // Merge admin-managed highlights from Firestore
  const highlights = [...adminHighlights, ...builtInHighlights];

  const sortedHighlights = highlightOrder.length > 0
    ? [...highlights].sort((a, b) => {
        const indexA = highlightOrder.indexOf(a.id);
        const indexB = highlightOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
    : highlights;

  const openReorderModal = () => {
    const currentIds = highlights.map(h => h.id);
    const ordered = highlightOrder.length > 0
      ? highlightOrder.filter(id => currentIds.includes(id))
      : currentIds;
    const missing = currentIds.filter(id => !ordered.includes(id));
    setTempOrder([...ordered, ...missing]);
    setShowReorderModal(true);
  };

  const moveHighlightItem = (index: number, direction: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempOrder(prev => {
      const arr = [...prev];
      const targetIndex = index + direction;
      [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
      return arr;
    });
  };

  const saveHighlightOrder = async () => {
    setHighlightOrder(tempOrder);
    await AsyncStorage.setItem(HIGHLIGHTS_ORDER_KEY, JSON.stringify(tempOrder));
    setShowReorderModal(false);
  };

  const resetHighlightOrder = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTempOrder(highlights.map(h => h.id));
  };

  const labelColor = isDarkMode ? '#ccc' : '#555';
  const arrowColor = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)';

  const scrollRef = useRef<ScrollView>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(true);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollX = useRef(0);
  const maxScrollX = useRef(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    scrollX.current = contentOffset.x;
    maxScrollX.current = contentSize.width - layoutMeasurement.width;
    // With scaleX: -1, physical x=0 is visual right. Increasing x = visual left.
    setCanScrollLeft(contentOffset.x < maxScrollX.current - 10);
    setCanScrollRight(contentOffset.x > 10);
  }, []);

  return (
    <View style={styles.container}>
      {/* Left arrow — scroll forward (reveal more items) */}
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
          <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={arrowColor} />
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={[{ overflow: 'visible' }, isRTL && { transform: [{ scaleX: -1 }] }]}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {sortedHighlights.map((h) => (
          <TouchableOpacity
            key={h.id}
            style={[styles.itemWrapper, isRTL && { transform: [{ scaleX: -1 }] }]}
            onPress={() => handlePress(h)}
            activeOpacity={0.75}
          >
            <View style={[styles.ring, { borderColor: h.color }]}>  
              {h.id === 'daily-story' ? (
                <View style={[styles.storyThumbWrapper, { backgroundColor: storyBgColor }]}>
                  {storyThumbnailUrl ? (
                    <View style={styles.storyThumbContent}>
                      <Image
                        source={{ uri: storyThumbnailUrl }}
                        style={styles.storyThumbImage}
                        resizeMode="cover"
                      />
                      {/* Dark overlay for text readability */}
                      <View style={styles.storyThumbOverlay} />
                      {storyAyahText ? (
                        <View style={styles.storyThumbTextOverlay}>
                          <Text style={styles.storyThumbText} numberOfLines={2}>
                            {storyAyahText.slice(0, 40)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : storyAyahText ? (
                    <View style={styles.storyThumbContent}>
                      <Text style={styles.storyThumbText} numberOfLines={3}>
                        {storyAyahText.slice(0, 50)}
                      </Text>
                      <View style={styles.storyThumbDivider} />
                      {storySurahName ? (
                        <Text style={styles.storyThumbSurah} numberOfLines={1}>
                          {storySurahName}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <MaterialCommunityIcons name="book-open-variant" size={22} color="#fff" />
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
                    name={safeIcon(h.icon) as any}
                    size={28}
                    color="#fff"
                  />
                </View>
              )}
            </View>
            <Text style={[styles.label, { color: labelColor, writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
              {h.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Right arrow — scroll back to start */}
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
          <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={24} color={arrowColor} />
        </TouchableOpacity>
      )}

      {loading && (
        <View style={[styles.loadingBadge, isRTL ? { left: 12, right: undefined } : null]}>
          <ActivityIndicator size="small" color="#2f7659" />
        </View>
      )}

      {/* Full-width reorder button */}
      {showReorderButton && (
        <BlurView
          intensity={80}
          tint={isDarkMode ? 'dark' : 'light'}
          style={styles.fullReorderBlur}
        >
          <TouchableOpacity
            style={[styles.fullReorderBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={openReorderModal}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="swap-vertical" size={18} color={isDarkMode ? '#fff' : '#333'} />
            <Text style={[styles.fullReorderBtnText, { color: isDarkMode ? '#fff' : '#333' }]}>{t('home.reorderSections')}</Text>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Reorder Modal */}
      <Modal
        visible={showReorderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReorderModal(false)}
      >
        <View style={styles.reorderOverlay}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 90 : 50}
            tint={isDarkMode ? 'dark' : 'light'}
            style={styles.reorderBlur}
          >
            <View style={[
              styles.reorderContent,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(30,30,32,0.55)'
                  : 'rgba(255,255,255,0.7)',
                borderWidth: 0.5,
                borderColor: 'rgba(255,255,255,0.2)',
              },
            ]}>
              <Text style={[
                styles.reorderTitle,
                { color: isDarkMode ? '#fff' : '#333' },
              ]}>
                {t('home.reorderHighlights')}              </Text>

              <ScrollView style={styles.reorderList} showsVerticalScrollIndicator={false}>
                {tempOrder.map((id, index) => {
                  const item = highlights.find(h => h.id === id);                  if (!item) return null;
                  return (
                    <View
                      key={id}
                      style={[
                        styles.reorderItem,
                        { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={[styles.reorderItemIcon, { backgroundColor: item.color }]}>
                          <MaterialCommunityIcons name={item.icon as any} size={18} color="#fff" />
                        </View>
                        <Text style={[
                          styles.reorderItemLabel,
                          { color: isDarkMode ? '#fff' : '#333', textAlign: isRTL ? 'right' : 'left' },
                        ]}>
                          {item.title}
                        </Text>
                      </View>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 4 }}>
                        <TouchableOpacity
                          disabled={index === 0}
                          onPress={() => moveHighlightItem(index, -1)}
                          style={[styles.reorderArrow, index === 0 && { opacity: 0.3 }]}
                        >
                          <MaterialCommunityIcons name="chevron-up" size={22} color={isDarkMode ? '#fff' : '#333'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={index === tempOrder.length - 1}
                          onPress={() => moveHighlightItem(index, 1)}
                          style={[styles.reorderArrow, index === tempOrder.length - 1 && { opacity: 0.3 }]}
                        >
                          <MaterialCommunityIcons name="chevron-down" size={22} color={isDarkMode ? '#fff' : '#333'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={[styles.reorderButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.reorderBtn2, styles.reorderResetBtn]}
                  onPress={resetHighlightOrder}
                >
                  <Text style={[
                    styles.reorderBtnText,
                    { color: isDarkMode ? '#aaa' : '#666' },
                  ]}>
                    {t('common.reset')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reorderBtn2, styles.reorderDoneBtn]}
                  onPress={saveHighlightOrder}
                >
                  <Text style={styles.reorderDoneBtnText}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    position: 'relative' as const,
    overflow: 'visible' as const,
  },
  scrollContent: {
    paddingHorizontal: 28,
    gap: 14,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  arrowBtn: {
    position: 'absolute' as const,
    top: (RING_SIZE / 2) - 15,
    zIndex: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(128,128,128,0.25)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  arrowLeft: {
    left: 2,
  },
  arrowRight: {
    right: 2,
  },
  itemWrapper: {
    alignItems: 'center',
    width: RING_SIZE + 8,
    overflow: 'visible' as const,
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
  storyThumbContent: {
    flex: 1,
    width: '100%' as any,
    height: '100%' as any,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  storyThumbImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%' as any,
    height: '100%' as any,
    borderRadius: CIRCLE_SIZE / 2,
  },
  storyThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: CIRCLE_SIZE / 2,
  },
  storyThumbTextOverlay: {
    zIndex: 1,
    paddingHorizontal: 3,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  storyThumbText: {
    color: '#fff',
    fontSize: 7,
    lineHeight: 11,
    fontFamily: fontBold(),
    textAlign: 'center' as const,
  },
  storyThumbDivider: {
    width: '40%' as any,
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginVertical: 1,
  },
  storyThumbSurah: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 5.5,
    fontFamily: fontSemiBold(),
    textAlign: 'center' as const,
  },
  label: {
    fontSize: 11,
    fontFamily: fontMedium(),
    marginTop: 4,
    textAlign: 'center',
    width: RING_SIZE + 12,
  },
  loadingBadge: {
    position: 'absolute',
    top: 4,
    right: 12,
  },
  fullReorderBlur: {
    borderRadius: 12,
    overflow: 'hidden' as const,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
    marginTop: 12,
  },
  fullReorderBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  fullReorderBtnText: {
    fontSize: 14,
    fontFamily: fontBold(),
  },
  reorderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 24,
  },
  reorderBlur: {
    width: '100%' as const,
    maxHeight: '70%' as const,
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  reorderContent: {
    width: '100%' as const,
    borderRadius: 16,
    padding: 20,
  },
  reorderTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  reorderList: {
    maxHeight: 340,
  },
  reorderItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reorderItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  reorderItemLabel: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
  },
  reorderArrow: {
    padding: 4,
  },
  reorderButtons: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 16,
  },
  reorderBtn2: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  reorderResetBtn: {
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  reorderDoneBtn: {
    backgroundColor: '#2f7659',
  },
  reorderBtnText: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
  },
  reorderDoneBtnText: {
    fontSize: 15,
    fontFamily: fontSemiBold(),
    color: '#fff',
  },
});

export default DailyHighlights;
