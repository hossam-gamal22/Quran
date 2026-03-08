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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';
import { getHijriDate } from '../../lib/hijri-date';
import { getTodayAyahWithAudio, QuranAyahWithAudio } from '../../lib/api/quran-cloud-api';
import { fetchAppConfig, HighlightItemConfig } from '../../lib/app-config-api';
import { getDuaOfTheDay } from '../../data/daily-duas';

const STORY_CACHE_KEY = 'story_of_day_cache';
const HIGHLIGHTS_ORDER_KEY = '@highlights_order';

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
  showReorderButton?: boolean;
}

const DailyHighlights: React.FC<DailyHighlightsProps> = ({ onStoryPress, showReorderButton }) => {
  const router = useRouter();
  const { isDarkMode } = useSettings();

  const hijriDate = getHijriDate();

  const [ayah, setAyah] = useState<QuranAyahWithAudio | null>(null);
  const [storyAyahText, setStoryAyahText] = useState<string | null>(null);
  const [storySurahName, setStorySurahName] = useState<string | null>(null);
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
              return;
            }
          } catch { /* ignore parse errors */ }
        }

        // Fetch today's ayah if not cached
        const ayahResult = await getTodayAyahWithAudio();
        if (!mounted) return;
        if (ayahResult) {
          setAyah(ayahResult);
          setStoryAyahText(ayahResult.text || null);
          setStorySurahName(ayahResult.surah?.name || null);
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

  // ===== ORDER (من اليمين): التاريخ الهجري, أذكار, دعاء اليوم, آية اليوم, ستوري, الصلاة =====
  const dailyDua = getDuaOfTheDay();

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
      id: 'daily-dua',
      title: 'دعاء اليوم',
      icon: 'book-heart',
      color: '#7c3aed',
      route: `/daily-dua`,
    },
    {
      id: 'daily-ayah',
      title: 'آية اليوم',
      icon: 'book-open-page-variant',
      color: '#1e40af',
      route: '/daily-ayah',
    },
    {
      id: 'daily-story',
      title: 'ستوري اليوم',
      icon: 'book-open-variant',
      color: storyBgColor,
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
          <MaterialCommunityIcons name="chevron-left" size={24} color={arrowColor} />
        </TouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ overflow: 'visible' }}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {sortedHighlights.map((h) => (
          <TouchableOpacity
            key={h.id}
            style={styles.itemWrapper}
            onPress={() => handlePress(h)}
            activeOpacity={0.75}
          >
            <View style={[styles.ring, { borderColor: h.color }]}>  
              {h.id === 'daily-story' ? (
                <View style={[styles.storyThumbWrapper, { backgroundColor: storyBgColor }]}>
                  {storyAyahText ? (
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
          <MaterialCommunityIcons name="chevron-right" size={24} color={arrowColor} />
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingBadge}>
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
            style={styles.fullReorderBtn}
            onPress={openReorderModal}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="swap-vertical" size={18} color={isDarkMode ? '#fff' : '#333'} style={{ marginLeft: 8 }} />
            <Text style={[styles.fullReorderBtnText, { color: isDarkMode ? '#fff' : '#333' }]}>ترتيب الأقسام</Text>
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
                ترتيب الأبرز
              </Text>

              <ScrollView style={styles.reorderList} showsVerticalScrollIndicator={false}>
                {tempOrder.map((id, index) => {
                  const item = highlights.find(h => h.id === id);
                  if (!item) return null;
                  return (
                    <View
                      key={id}
                      style={[
                        styles.reorderItem,
                        { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={[styles.reorderItemIcon, { backgroundColor: item.color }]}>
                          <MaterialCommunityIcons name={item.icon as any} size={18} color="#fff" />
                        </View>
                        <Text style={[
                          styles.reorderItemLabel,
                          { color: isDarkMode ? '#fff' : '#333' },
                        ]}>
                          {item.title}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
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

              <View style={styles.reorderButtons}>
                <TouchableOpacity
                  style={[styles.reorderBtn2, styles.reorderResetBtn]}
                  onPress={resetHighlightOrder}
                >
                  <Text style={[
                    styles.reorderBtnText,
                    { color: isDarkMode ? '#aaa' : '#666' },
                  ]}>
                    إعادة تعيين
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reorderBtn2, styles.reorderDoneBtn]}
                  onPress={saveHighlightOrder}
                >
                  <Text style={styles.reorderDoneBtnText}>تم</Text>
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
    flexDirection: 'row-reverse',
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  storyThumbText: {
    color: '#fff',
    fontSize: 7,
    lineHeight: 11,
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'center' as const,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Cairo-Medium',
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
    flexDirection: 'row-reverse' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  fullReorderBtnText: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-Bold',
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
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'right' as const,
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
    fontFamily: 'Cairo-SemiBold',
  },
  reorderDoneBtnText: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    color: '#fff',
  },
});

export default DailyHighlights;
