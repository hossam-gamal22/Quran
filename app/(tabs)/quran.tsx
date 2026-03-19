import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Platform,
  StatusBar,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useQuran } from '../../contexts/QuranContext';
import { useSettings } from '../../contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useAppConfig } from '@/lib/app-config-context';
import { useColors } from '../../hooks/use-colors';
import { getLastRead } from '../../lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NativeTabs } from '../../components/ui/NativeTabs';
import {
  GlassCard,
  GlassToggle,
} from '../../components/ui/GlassCard';
import { getColoredBookmarks } from '../../lib/quran-bookmarks';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { getFirstSurahOnPage } from '../../lib/qcf-page-data';
import { useIsRTL } from '@/hooks/use-is-rtl';
import {
  downloadSurah,
  isDownloading,
  getDownloadedForReciter,
  deleteDownload,
} from '@/lib/audio-download-manager';

// Background images
const QURAN_BG_IMAGES: Record<string, any> = {
  quranbg1: require('@/assets/images/quran/quranbg1.png'),
  quranbg2: require('@/assets/images/quran/quranbg2.png'),
  quranbg3: require('@/assets/images/quran/quranbg3.png'),
  quranbg4: require('@/assets/images/quran/quranbg4.png'),
};
import {
  Spacing,
  BorderRadius,
  FONT_SIZES,
} from '../../constants/theme';

// أرقام الصفحات لكل سورة
const SURAH_PAGES: { [key: number]: number } = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187,
  10: 208, 11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267,
  17: 282, 18: 293, 19: 305, 20: 312, 21: 322, 22: 332, 23: 342,
  24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404,
  31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446,
  38: 453, 39: 458, 40: 467, 41: 477, 42: 483, 43: 489, 44: 496,
  45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518, 51: 520,
  52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542,
  59: 545, 60: 549, 61: 551, 62: 553, 63: 554, 64: 556, 65: 558,
  66: 560, 67: 562, 68: 564, 69: 566, 70: 568, 71: 570, 72: 572,
  73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583,
  80: 585, 81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591,
  87: 591, 88: 592, 89: 593, 90: 594, 91: 595, 92: 595, 93: 596,
  94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599,
  101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602,
  107: 602, 108: 602, 109: 603, 110: 603, 111: 603, 112: 604,
  113: 604, 114: 604,
};

// بيانات الأجزاء
const JUZ_PAGE_STARTS = [1,22,42,62,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];

const JUZ_NAMES = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس',
  'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر',
  'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
  'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون',
  'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون',
];

interface JuzInfo {
  number: number;
  name: string;
  startPage: number;
  endPage: number;
}

const JUZ_DATA: JuzInfo[] = JUZ_PAGE_STARTS.map((startPage, i) => ({
  number: i + 1,
  name: JUZ_NAMES[i],
  startPage,
  endPage: i < 29 ? JUZ_PAGE_STARTS[i + 1] - 1 : 604,
}));

// تحويل الأرقام حسب اللغة
const toLocalizedNumber = (num: number | undefined | null, _isArabicLang: boolean): string => {
  if (num == null) return '';
  return String(num);
};

// أنواع السور
const getRevelationType = (type: string, t: (key: string) => string): string => {
  return type === 'Meccan' ? t('quran.meccan') : t('quran.medinan');
};

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Reciter {
  identifier: string;
  name: string;
  englishName: string;
}

// ========================================
// مكون زر الزجاج المتحرك
// ========================================

interface GlassActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  isLightBg: boolean;
  primaryColor: string;
  accentColor?: string;
}

const GlassActionButton: React.FC<GlassActionButtonProps> = ({
  icon,
  label,
  onPress,
  isLightBg,
  primaryColor,
  accentColor,
}) => {
  const scale = useSharedValue(1);
  const tint = accentColor || primaryColor;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.93, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      <TouchableOpacity
        style={[
          styles.glassQuickAction,
          {
            backgroundColor: isLightBg
              ? `${tint}1A`
              : `${tint}26`,
            borderColor: isLightBg
              ? `${tint}33`
              : `${tint}55`,
          },
        ]}
        onPress={handlePress}
        activeOpacity={1}
      >
        <View style={[
          styles.glassQuickActionInner,
          {
            backgroundColor: isLightBg
              ? 'rgba(255,255,255,0.72)'
              : 'rgba(25,28,34,0.75)',
            borderColor: isLightBg
              ? 'rgba(255,255,255,0.78)'
              : 'rgba(255,255,255,0.12)',
          },
        ]}>
          <View style={styles.glassQuickActionIcon}>
            <MaterialCommunityIcons name={icon as any} size={20} color={tint} />
          </View>
          <Text style={[
            styles.glassQuickActionText,
            { color: tint },
          ]}>
            {label}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function QuranScreen() {
  const router = useRouter();

  const { isDarkMode, settings, updateDisplay, updateNotifications, t } = useSettings();
  const { config } = useAppConfig();
  const colors = useColors();
  const isRTL = useIsRTL();
  const isArabic = settings.language === 'ar';
  const isLightBg = !isDarkMode;

  const {
    surahs,
    reciters,
    isLoading,
    error,
    playbackState,
    currentReciter,
    setReciter,
    playAyah,
    togglePlayPause,
  } = useQuran();

  const [searchQuery, setSearchQuery] = useState('');
  const [showReciterModal, setShowReciterModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastReadSurah, setLastReadSurah] = useState<number | null>(null);
  const [lastReadPage, setLastReadPage] = useState<number | null>(null);
  const [firstBookmarkPage, setFirstBookmarkPage] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<'surahs' | 'juz' | 'listen'>('surahs');

  // Download state for listen tab
  const [downloadedSet, setDownloadedSet] = useState<Set<number>>(new Set());
  const [downloadingSet, setDownloadingSet] = useState<Set<number>>(new Set());
  const [failedSet, setFailedSet] = useState<Set<number>>(new Set());
  const [progressMap, setProgressMap] = useState<Map<number, number>>(new Map());

  const quranSegments = useMemo(() => {
    const defaults = {
      surahs: { label: t('quran.surahs'), icon: 'book-open-variant' },
      juz: { label: t('quran.juz'), icon: 'bookshelf' },
      listen: { label: t('quran.listen'), icon: 'headphones' },
    };

    const byKey = new Map((config.uiCustomization?.quranSegments || []).map((item) => [item.key, item]));

    return (['surahs', 'juz', 'listen'] as const)
      .filter((key) => key !== 'listen' || settings.language === 'ar')
      .map((key) => {
      const item = byKey.get(key);
      const label = settings.language === 'ar'
        ? (item?.labelAr || defaults[key].label)
        : (item?.labelEn || item?.labelAr || defaults[key].label);

      const iconMode = item?.icon?.mode;
      const iconName = item?.icon?.name;
      const iconPng = item?.icon?.pngUrl;

      let icon: string = defaults[key].icon;
      if (iconMode === 'png' && iconPng) {
        icon = `img:${iconPng}`;
      } else if (iconMode === 'ionicons' && iconName) {
        icon = `ion:${iconName}`;
      } else if ((iconMode === 'material' || iconMode === 'sf') && iconName) {
        icon = iconName;
      }

      return { key, label, icon };
    });
  }, [config.uiCustomization?.quranSegments, settings.language]);

  const quranSegmentKeys = useMemo(() => quranSegments.map((segment) => segment.key as 'surahs' | 'juz' | 'listen'), [quranSegments]);
  const quranSegmentLabels = useMemo(() => quranSegments.map((segment) => segment.label), [quranSegments]);
  const quranSelectedIndex = Math.max(0, quranSegmentKeys.indexOf(activeTab));

  // Reset to surahs if current tab is no longer available (e.g. listen tab hidden for non-Arabic)
  React.useEffect(() => {
    if (!quranSegmentKeys.includes(activeTab)) {
      setActiveTab('surahs');
    }
  }, [quranSegmentKeys, activeTab]);

  useFocusEffect(useCallback(() => {
    let mounted = true;

    const loadLastRead = async () => {
      const lastRead = await getLastRead();
      if (mounted) {
        setLastReadSurah(lastRead?.surahNumber ?? null);
      }
      // Also load last exact page
      try {
        const pageData = await AsyncStorage.getItem('quran_last_page');
        if (mounted && pageData) {
          const parsed = JSON.parse(pageData);
          setLastReadPage(parsed.page ?? null);
        }
      } catch {}
      // Load first bookmark
      try {
        const bookmarks = await getColoredBookmarks();
        if (mounted && bookmarks.length > 0) {
          setFirstBookmarkPage(bookmarks[0].page);
        }
      } catch {}
    };

    loadLastRead();

    return () => {
      mounted = false;
    };
  }, []));

  // Load downloaded surahs for current reciter
  useFocusEffect(useCallback(() => {
    if (activeTab !== 'listen') return;
    let mounted = true;
    const loadDownloaded = async () => {
      try {
        const downloaded = await getDownloadedForReciter(currentReciter);
        if (mounted) {
          setDownloadedSet(new Set(downloaded.map(d => d.surahNumber)));
        }
      } catch {}
    };
    loadDownloaded();
    return () => { mounted = false; };
  }, [activeTab, currentReciter]));

  // Download handler
  const handleDownloadSurah = useCallback(async (surahNumber: number) => {
    if (downloadingSet.has(surahNumber) || downloadedSet.has(surahNumber)) return;
    // Clear previous failure
    setFailedSet(prev => {
      const next = new Set(prev);
      next.delete(surahNumber);
      return next;
    });
    setProgressMap(prev => { const m = new Map(prev); m.set(surahNumber, 0); return m; });
    setDownloadingSet(prev => new Set(prev).add(surahNumber));
    try {
      await downloadSurah(surahNumber, currentReciter, (pct) => {
        setProgressMap(prev => { const m = new Map(prev); m.set(surahNumber, pct); return m; });
      });
      setDownloadedSet(prev => new Set(prev).add(surahNumber));
    } catch (e: any) {
      setFailedSet(prev => new Set(prev).add(surahNumber));
    } finally {
      setDownloadingSet(prev => {
        const next = new Set(prev);
        next.delete(surahNumber);
        return next;
      });
      setProgressMap(prev => { const m = new Map(prev); m.delete(surahNumber); return m; });
    }
  }, [currentReciter, downloadingSet, downloadedSet]);

  // Delete download handler
  const handleDeleteDownload = useCallback(async (surahNumber: number) => {
    Alert.alert(t('quran.deleteDownload'), t('quran.confirmDeleteDownload'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
          await deleteDownload(surahNumber, currentReciter);
          setDownloadedSet(prev => {
            const next = new Set(prev);
            next.delete(surahNumber);
            return next;
          });
        }
      },
    ]);
  }, [currentReciter]);

  // فلترة السور حسب البحث
  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return surahs;
    const query = searchQuery.toLowerCase().trim();
    return surahs.filter(
      (surah: Surah) =>
        surah.name.includes(query) ||
        surah.englishName.toLowerCase().includes(query) ||
        surah.number.toString() === query
    );
  }, [surahs, searchQuery]);

  // الحصول على اسم القارئ الحالي
  const currentReciterName = useMemo(() => {
    const reciter = reciters.find(
      (r: Reciter) => r.identifier === currentReciter
    );
    if (!reciter) return t('quran.selectReciter');
    return isArabic ? reciter.name : (reciter.englishName || reciter.name);
  }, [reciters, currentReciter, isArabic]);

  // فلترة الأجزاء حسب البحث
  const filteredJuz = useMemo(() => {
    if (!searchQuery.trim()) return JUZ_DATA;
    const query = searchQuery.trim();
    return JUZ_DATA.filter(
      (j) => String(j.number) === query || j.name.includes(query)
    );
  }, [searchQuery]);

  // فتح صفحة السورة
  const openSurah = useCallback(
    (surahNumber: number) => {
      router.push(`/surah/${surahNumber}`);
    },
    [router]
  );

  // اختيار قارئ
  const selectReciter = useCallback(
    (identifier: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setReciter(identifier);
      setShowReciterModal(false);
    },
    [setReciter]
  );

  const openLastReadSurah = useCallback(() => {
    const surah = lastReadSurah ?? 1;
    if (lastReadPage) {
      router.push(`/surah/${surah}?page=${lastReadPage}`);
    } else {
      openSurah(surah);
    }
  }, [lastReadSurah, lastReadPage, openSurah, router]);

  const openBookmarkPage = useCallback(() => {
    router.push('/quran-bookmarks' as any);
  }, [router]);

  const onSurahPress = useCallback(
    async (surahNumber: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (activeTab !== 'listen') {
        openSurah(surahNumber);
        return;
      }

      const isCurrentSurah =
        playbackState.currentSurah === surahNumber &&
        playbackState.currentAyah > 0;

      if (isCurrentSurah) {
        await togglePlayPause();
        return;
      }

      await playAyah(surahNumber, 1, true);
    },
    [activeTab, openSurah, playbackState.currentAyah, playbackState.currentSurah, playAyah, togglePlayPause]
  );

  // عرض عنصر السورة
  const renderSurahItem = useCallback(
    ({ item, index }: { item: Surah; index: number }) => {
      const isCurrentPlaying = playbackState.currentSurah === item.number;

      return (
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 40 : 25}
            tint={isLightBg ? 'light' : 'dark'}
            style={{ borderRadius: 16 }}
          >
            <TouchableOpacity
              style={[
                styles.surahItem,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  backgroundColor: isLightBg
                    ? 'rgba(255,255,255,0.35)'
                    : 'rgba(28,30,36,0.35)',
                  borderColor: isCurrentPlaying
                    ? colors.primary + '55'
                    : isLightBg
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(255,255,255,0.08)',
                },
              ]}
              onPress={() => onSurahPress(item.number)}
              activeOpacity={0.7}
            >
              {/* رقم السورة */}
              <View
                style={[
                  styles.surahNumber,
                  { backgroundColor: colors.primary + '14' },
                ]}
              >
                <Text style={[styles.surahNumberText, { color: colors.primary }]}>
                  {toLocalizedNumber(item.number, isArabic)}
                </Text>
              </View>

              {/* معلومات السورة */}
              <View style={styles.surahInfo}>
                <Text style={[styles.surahName, { color: colors.text }]}>
                  {isArabic ? item.name : item.englishName}
                </Text>
                <Text style={[styles.surahDetails, { color: colors.textSecondary }]}>
                  {getRevelationType(item.revelationType, t)} • {toLocalizedNumber(item.numberOfAyahs, isArabic)} {t('quran.ayah')} • {t('quran.page')} {toLocalizedNumber(SURAH_PAGES[item.number] || 1, isArabic)}
                </Text>
              </View>

              {/* الأكشن */}
              <View style={[styles.pageInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {activeTab === 'listen' ? (
                  <View style={[styles.listenActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {/* زر التحميل */}
                    <TouchableOpacity
                      style={styles.listenActionBtn}
                      onPress={(event) => {
                        event.stopPropagation();
                        if (downloadedSet.has(item.number)) {
                          handleDeleteDownload(item.number);
                        } else {
                          handleDownloadSurah(item.number);
                        }
                      }}
                      hitSlop={8}
                    >
                      {downloadingSet.has(item.number) ? (
                        <View style={[styles.progressContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <ActivityIndicator size={14} color="#F59E0B" />
                          <Text style={styles.progressText}>
                            {Math.round((progressMap.get(item.number) || 0) * 100)}%
                          </Text>
                        </View>
                      ) : (
                        <MaterialCommunityIcons
                          name={
                            downloadedSet.has(item.number)
                              ? 'check-circle'
                              : failedSet.has(item.number)
                                ? 'alert-circle'
                                : 'download'
                          }
                          size={22}
                          color={
                            downloadedSet.has(item.number)
                              ? '#22C55E'
                              : failedSet.has(item.number)
                                ? '#EF4444'
                                : '#9CA3AF'
                          }
                        />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.listenActionBtn}
                      onPress={(event) => {
                        event.stopPropagation();
                        openSurah(item.number);
                      }}
                      hitSlop={8}
                    >
                      <MaterialCommunityIcons
                        name="book-open-variant"
                        size={15}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    <View style={styles.playIconCircle}>
                      <MaterialCommunityIcons
                        name={
                          isCurrentPlaying && playbackState.isPlaying
                            ? 'pause-circle'
                            : 'play-circle'
                        }
                        size={28}
                        color={colors.primary}
                      />
                    </View>
                  </View>
                ) : (
                  <MaterialCommunityIcons
                    name={isRTL ? 'chevron-left' : 'chevron-right'}
                    size={18}
                    color={colors.textSecondary}
                    style={{ opacity: 0.5 }}
                  />
                )}
              </View>
            </TouchableOpacity>
          </BlurView>
        </View>
      );
    },
    [activeTab, colors, isLightBg, onSurahPress, openSurah, playbackState.currentSurah, playbackState.isPlaying, downloadedSet, downloadingSet, failedSet, progressMap, handleDownloadSurah, handleDeleteDownload]
  );

  // عرض عنصر القارئ
  const renderReciterItem = useCallback(
    ({ item }: { item: Reciter }) => {
      const isSelected = item.identifier === currentReciter;
      return (
        <TouchableOpacity
          style={[
            styles.reciterItem,
            {
              borderBottomColor: isLightBg
                ? 'rgba(0,0,0,0.06)'
                : 'rgba(255,255,255,0.06)',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
            isSelected && {
              backgroundColor: colors.primary + '12',
            },
          ]}
          onPress={() => selectReciter(item.identifier)}
          activeOpacity={0.7}
        >
          <View style={[styles.reciterInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.reciterAvatar,
                {
                  backgroundColor: isSelected
                    ? colors.primary + '20'
                    : isLightBg
                      ? 'rgba(0,0,0,0.04)'
                      : 'rgba(255,255,255,0.06)',
                },
              ]}
            >
              <MaterialCommunityIcons
                name="account"
                size={20}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.reciterName,
                { color: isSelected ? colors.primary : colors.text },
                isSelected && { fontWeight: '600' },
              ]}
            >
              {item.name}
            </Text>
          </View>
          {isSelected && (
            <MaterialCommunityIcons
              name="check-circle"
              size={22}
              color={colors.primary}
            />
          )}
        </TouchableOpacity>
      );
    },
    [colors, currentReciter, isLightBg, selectReciter]
  );

  // عرض عنصر الجزء
  const renderJuzItem = useCallback(
    ({ item }: { item: JuzInfo }) => (
      <TouchableOpacity
        style={[
          styles.surahItem,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            backgroundColor: isLightBg
              ? 'rgba(255,255,255,0.55)'
              : 'rgba(28,30,36,0.55)',
            borderColor: isLightBg
              ? 'rgba(255,255,255,0.7)'
              : 'rgba(255,255,255,0.06)',
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const firstSurah = getFirstSurahOnPage(item.startPage);
          router.push(`/surah/${firstSurah}?page=${item.startPage}`);
        }}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.surahNumber,
            { backgroundColor: colors.primary + '14' },
          ]}
        >
          <Text style={[styles.surahNumberText, { color: colors.primary }]}>
            {toLocalizedNumber(item.number, isArabic)}
          </Text>
        </View>
        <View style={styles.surahInfo}>
          <Text style={[styles.surahName, { color: colors.text }]}>
            {`${t('quran.juz')} ${isArabic ? item.name : item.number}`}
          </Text>
          <Text style={[styles.surahDetails, { color: colors.textSecondary }]}>
            {t('quran.page')} {toLocalizedNumber(item.startPage, isArabic)} - {toLocalizedNumber(item.endPage, isArabic)}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={isRTL ? 'chevron-left' : 'chevron-right'}
          size={18}
          color={colors.textSecondary}
          style={{ opacity: 0.5 }}
        />
      </TouchableOpacity>
    ),
    [colors, isLightBg, router],
  );

  // شاشة التحميل
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('quran.loadingQuran')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // شاشة الخطأ
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="cloud-off-outline"
            size={64}
            color={colors.error}
          />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/quran')}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
    <View style={[styles.container, { backgroundColor: settings.display.appBackground !== 'none' ? 'transparent' : colors.background }]}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        edges={['top']}
      >
        <StatusBar
          barStyle={isLightBg ? 'dark-content' : 'light-content'}
          backgroundColor={colors.background}
        />

        {/* الهيدر */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Right side in RTL: worship tracker + favorites + radio */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.xs }}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/radio' as any)}
            >
              <MaterialCommunityIcons name="radio" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/worship-tracker/quran' as any)}
            >
              <MaterialCommunityIcons name="chart-bar" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={openBookmarkPage}
            >
              <MaterialCommunityIcons name="bookmark-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Center: title */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('quran.title')}
            </Text>
          </View>

          {/* Left side in RTL: settings */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.xs }}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setShowSettings(true)}
            >
              <MaterialCommunityIcons name="cog-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* التبويبات - Native Tabs */}
        <View style={{ marginHorizontal: Spacing.lg, marginTop: 10, marginBottom: Spacing.md }}>
          <NativeTabs
            tabs={quranSegments.map(s => ({ key: s.key, label: s.label }))}
            selected={activeTab}
            onSelect={(key) => setActiveTab(key as 'surahs' | 'juz' | 'listen')}
            indicatorColor="#D4AF37"
          />
        </View>

        {/* اختيار القارئ (في وضع الاستماع) */}
        {activeTab === 'listen' && (
          <View style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowReciterModal(true)}
            >
              <View
                style={[
                  styles.reciterSelector,
                  {
                    backgroundColor: isLightBg
                      ? 'rgba(255,255,255,0.5)'
                      : 'rgba(40,42,48,0.5)',
                    borderColor: isLightBg
                      ? 'rgba(255,255,255,0.7)'
                      : 'rgba(255,255,255,0.06)',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View style={styles.reciterSelectorIcon}>
                  <MaterialCommunityIcons
                    name="account-music"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.reciterSelectorInfo}>
                  <Text style={[styles.reciterSelectorLabel, { color: colors.textSecondary }]}>
                    {t('quran.reciterLabel')}
                  </Text>
                  <Text style={[styles.reciterSelectorName, { color: colors.text }]}>
                    {currentReciterName}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* شريط البحث - Glass Style */}
        <View style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
          <View
            style={[
              styles.searchContainer,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                backgroundColor: isLightBg
                  ? 'rgba(255,255,255,0.45)'
                  : 'rgba(120,120,128,0.12)',
                borderColor: isLightBg
                  ? 'rgba(255,255,255,0.6)'
                  : 'rgba(255,255,255,0.04)',
              },
            ]}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={activeTab === 'juz' ? t('quran.searchByJuz') : t('quran.searchBySurah')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign={isRTL ? 'right' : 'left'}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* أزرار سريعة - 2x2 Grid Glass Widgets (فقط في تاب السور) */}
        {activeTab === 'surahs' && (
          <View style={styles.quickActionsGrid}>
            <View style={[styles.quickActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <GlassActionButton
                icon="book-search-outline"
                label={t('quran.tafsir')}
                onPress={() => router.push('/browse-tafsir' as any)}
                isLightBg={isLightBg}
                primaryColor={colors.primary}
                accentColor="#2563EB"
              />
              <GlassActionButton
                icon="book-open-page-variant"
                label={t('quran.lastPage')}
                onPress={openLastReadSurah}
                isLightBg={isLightBg}
                primaryColor={colors.primary}
                accentColor="#16A34A"
              />
            </View>
            <View style={[styles.quickActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <GlassActionButton
                icon="bookmark-outline"
                label={t('quran.bookmark')}
                onPress={openBookmarkPage}
                isLightBg={isLightBg}
                primaryColor={colors.primary}
                accentColor="#D97706"
              />
              <GlassActionButton
                icon="book-check"
                label={t('quran.khatma')}
                onPress={() => router.push('/khatma')}
                isLightBg={isLightBg}
                primaryColor={colors.primary}
                accentColor="#7C3AED"
              />
            </View>
          </View>
        )}

        {/* قائمة السور / الأجزاء */}
        {activeTab === 'juz' ? (
          <FlatList
            data={filteredJuz}
            renderItem={renderJuzItem}
            keyExtractor={(item) => item.number.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('quran.noResults')}
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={filteredSurahs}
            renderItem={renderSurahItem}
            keyExtractor={(item) => item.number.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('quran.noResults')}
                </Text>
              </View>
            }
          />
        )}

        {/* شريط التشغيل */}
        <BannerAdComponent screen="quran" />

        {/* Modal اختيار القارئ - Glass Style */}
        <Modal
          visible={showReciterModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowReciterModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowReciterModal(false)}
            />
            <View style={styles.modalContainer}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 40 : 18}
                tint={isLightBg ? 'light' : 'dark'}
                style={styles.modalBlur}
              >
                <View
                  style={[
                    styles.modalContent,
                    {
                      backgroundColor: isLightBg
                        ? 'rgba(255,255,255,0.75)'
                        : 'rgba(28,28,30,0.75)',
                    },
                  ]}
                >
                  {/* المقبض */}
                  <View style={styles.modalHandle}>
                    <View
                      style={[
                        styles.modalHandleBar,
                        {
                          backgroundColor: isLightBg
                            ? 'rgba(0,0,0,0.15)'
                            : 'rgba(255,255,255,0.2)',
                        },
                      ]}
                    />
                  </View>

                  {/* Header */}
                  <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {t('quran.selectReciter')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowReciterModal(false)}
                    >
                      <BlurView
                        intensity={Platform.OS === 'ios' ? 25 : 10}
                        tint={isLightBg ? 'light' : 'dark'}
                        style={styles.modalCloseBtnBlur}
                      >
                        <View
                          style={[
                            styles.modalCloseBtn,
                            {
                              backgroundColor: isLightBg
                                ? 'rgba(120,120,128,0.12)'
                                : 'rgba(120,120,128,0.24)',
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="close"
                            size={16}
                            color={isLightBg ? '#6c6c70' : '#8e8e93'}
                          />
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  </View>

                  {/* قائمة القراء */}
                  <FlatList
                    data={reciters}
                    renderItem={renderReciterItem}
                    keyExtractor={(item) => item.identifier}
                    contentContainerStyle={styles.recitersList}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </BlurView>
            </View>
          </View>
        </Modal>

        {/* نافذة إعدادات القرآن */}
        <Modal
          visible={showSettings}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSettings(false)}
        >
          <View style={styles.settingsOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowSettings(false)}
            />
            <View style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', height: Dimensions.get('window').height * 0.7 }}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint={isLightBg ? 'systemChromeMaterialLight' : 'systemChromeMaterialDark'}
                style={StyleSheet.absoluteFill}
              />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isLightBg ? 'rgba(255,255,255,0.4)' : 'rgba(30,30,32,0.55)', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 0.5, borderColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)' }]} />
              <View style={{ flex: 1, padding: Spacing.lg, paddingBottom: Spacing.xl + 20 }}>
              <View style={[styles.settingsHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.settingsTitle, { color: colors.text }]}>{t('quran.quranSettings')}</Text>
                <TouchableOpacity
                  onPress={() => setShowSettings(false)}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isLightBg ? 'rgba(120,120,128,0.12)' : 'rgba(120,120,128,0.24)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialCommunityIcons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                {/* ─── 1. إعدادات الخط (Font Settings) ─── */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                    <MaterialCommunityIcons name="format-size" size={14} color={colors.textSecondary} />
                    <Text style={[styles.settingsSectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                      {t('quran.fontSettings')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                    <TouchableOpacity
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => {
                        const newVal = Math.max(-4, (settings.display.quranFontSizeAdjust ?? 0) - 1);
                        updateDisplay({ quranFontSizeAdjust: newVal });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <MaterialCommunityIcons name="minus" size={22} color={isLightBg ? '#333' : '#ddd'} />
                    </TouchableOpacity>
                    <Text style={{ color: colors.primary, fontSize: 16, fontFamily: fontSemiBold() }}>
                      {(settings.display.quranFontSizeAdjust ?? 0) === 0 ? t('quran.defaultSize') : (settings.display.quranFontSizeAdjust ?? 0) > 0 ? `+${settings.display.quranFontSizeAdjust}` : String(settings.display.quranFontSizeAdjust)}
                    </Text>
                    <TouchableOpacity
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => {
                        const newVal = Math.min(8, (settings.display.quranFontSizeAdjust ?? 0) + 1);
                        updateDisplay({ quranFontSizeAdjust: newVal });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <MaterialCommunityIcons name="plus" size={22} color={isLightBg ? '#333' : '#ddd'} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ─── 2. إعدادات التذكير بقراءة القرآن ─── */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                    <MaterialCommunityIcons name="bell-ring-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.settingsSectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                      {t('quran.quranReminder')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: isLightBg ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)', gap: Spacing.sm }}
                    onPress={() => { setShowSettings(false); router.push('/quran-reminder'); }}
                  >
                    <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={{ fontFamily: fontSemiBold(), fontSize: 15, color: colors.text }}>{t('quran.reminderSettings')}</Text>
                      <Text style={{ fontFamily: fontRegular(), fontSize: 12, color: colors.textSecondary }}>
                        {(settings.notifications.quranReadingReminder ?? false) ? `${t('quran.enabled')} · ${settings.notifications.quranReadingReminderTime ?? '20:00'}` : t('quran.notEnabled')}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="bell-ring-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* ─── 3. خلفية المصحف ─── */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                    <MaterialCommunityIcons name="image-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.settingsSectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                      {t('quran.mushafBackground')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: Spacing.sm, marginTop: 8 }}>
                    {(['quranbg1', 'quranbg2', 'quranbg3', 'quranbg4'] as const).map(key => {
                      const isSelected = (settings.display.quranBackground ?? 'quranbg1') === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={{
                            width: 60,
                            height: 85,
                            borderRadius: 10,
                            overflow: 'hidden',
                            borderWidth: isSelected ? 2.5 : 1,
                            borderColor: isSelected ? colors.primary : 'rgba(120,120,128,0.2)',
                          }}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            updateDisplay({ quranBackground: key });
                          }}
                        >
                          <Image
                            source={QURAN_BG_IMAGES[key]}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* ─── 4. الترجمة للغات أخرى ─── */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                    <MaterialCommunityIcons name="translate" size={14} color={colors.textSecondary} />
                    <Text style={[styles.settingsSectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                      {t('quran.translationToOtherLanguages')}
                    </Text>
                  </View>
                  {(() => {
                    const LANG_FLAGS: Record<string, string> = { en: '🇺🇸', fr: '🇫🇷', tr: '🇹🇷', ur: '🇵🇰', id: '🇮🇩', de: '🇩🇪', es: '🇪🇸', hi: '🇮🇳', bn: '🇧🇩', ms: '🇲🇾', ru: '🇷🇺', fa: '🇮🇷' };
                    const LANG_NAMES: Record<string, string> = { en: 'English', fr: 'Français', tr: 'Türkçe', ur: 'اردو', id: 'Indonesia', de: 'Deutsch', es: 'Español', hi: 'हिन्दी', bn: 'বাংলা', ms: 'Melayu', ru: 'Русский', fa: 'فارسی' };
                    const selEdition = settings.display.showTranslation ? (settings.display.translationEdition || '') : '';
                    const selLang = selEdition ? selEdition.split('.')[0] : '';
                    const flag = LANG_FLAGS[selLang] || '🌐';
                    const langName = LANG_NAMES[selLang] || t('quran.noTranslation');
                    return (
                      <TouchableOpacity
                        style={{
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                          alignItems: 'center',
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          marginTop: 8,
                          backgroundColor: isLightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                          gap: Spacing.sm,
                        }}
                        onPress={() => {
                          setShowSettings(false);
                          router.push('/settings/translations' as any);
                        }}
                      >
                        <Text style={{ fontSize: 26 }}>{flag}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: fontSemiBold(), fontSize: 14, color: colors.text }}>
                            {t('quran.chooseTranslationLanguage')}
                          </Text>
                          <Text style={{ fontFamily: fontRegular(), fontSize: 12, color: colors.textSecondary }}>
                            {selLang ? `${langName} ${flag}` : t('quran.chooseTranslationDesc')}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    );
                  })()}
                </View>

                {/* ─── 5. اختيار القارئ (Reciter Selection) ─── */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                    <MaterialCommunityIcons name="account-music-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.settingsSectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                      {t('quran.chooseReciter')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      marginTop: 8,
                      backgroundColor: isLightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                    }}
                    onPress={() => {
                      setShowSettings(false);
                      setShowReciterModal(true);
                    }}
                  >
                    <MaterialCommunityIcons name="account-music" size={20} color={colors.primary} />
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={{ fontFamily: fontSemiBold(), fontSize: 14, color: colors.text }}>
                        {currentReciterName}
                      </Text>
                      <Text style={{ fontFamily: fontRegular(), fontSize: 12, color: colors.textSecondary }}>
                        {t('quran.selectReciterDesc')}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* ─── 6. عرض التفسير (Tafsir Split Screen Toggle) ─── */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                    <MaterialCommunityIcons name="book-open-page-variant-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.settingsSectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                      {t('quran.showTafsir')}
                    </Text>
                  </View>
                  <GlassToggle
                    label={t('quran.autoTafsir')}
                    subtitle={t('quran.autoTafsirDesc')}
                    icon="book-open-variant"
                    enabled={settings.display.showTafsir ?? false}
                    onToggle={(v) => {
                      updateDisplay({ showTafsir: v } as any);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  />
                </View>

                {/* ─── 7. وضع التركيز (Focus Mode) ─── */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                    <MaterialCommunityIcons name="eye-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.settingsSectionLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                      {t('quran.focusMode')}
                    </Text>
                  </View>
                  <GlassToggle
                    label={t('quran.focusMode')}
                    subtitle={t('quran.focusModeDesc')}
                    icon="eye-off-outline"
                    enabled={settings.display.focusMode ?? false}
                    onToggle={async (v) => {
                      if (v) {
                        const seen = await AsyncStorage.getItem('@focus_mode_intro_seen');
                        if (seen !== 'true') {
                          Alert.alert(
                            t('quran.focusModeAlertTitle'),
                            t('quran.focusModeAlertMessage'),
                            [
                              {
                                text: t('quran.dontShowAgain'),
                                onPress: async () => {
                                  await AsyncStorage.setItem('@focus_mode_intro_seen', 'true');
                                  updateDisplay({ focusMode: true });
                                },
                              },
                              {
                                text: t('quran.ok'),
                                onPress: () => {
                                  updateDisplay({ focusMode: true });
                                },
                              },
                            ]
                          );
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          return;
                        }
                      }
                      updateDisplay({ focusMode: v });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  />
                </View>
              </ScrollView>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontMedium(),
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontMedium(),
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontFamily: fontSemiBold(),
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fontBold(),
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search - Glass
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontFamily: fontRegular(),
    paddingVertical: Platform.OS === 'ios' ? 2 : 0,
  },

  // Quick Actions - Glass 2x2 Grid
  quickActionsGrid: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  glassQuickAction: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  glassQuickActionInner: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    minHeight: 60,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glassQuickActionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassQuickActionText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: fontSemiBold(),
    fontWeight: '600',
  },

  // Surah List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
    gap: 8,
  },
  surahItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  surahNumber: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surahNumberText: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontBold(),
    fontWeight: '700',
  },
  surahInfo: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xs,
  },
  surahName: {
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Amiri-Bold',
    fontWeight: '600',
  },
  surahDetails: {
    fontSize: FONT_SIZES.xs,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
  pageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  listenActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listenActionBtn: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 10,
    fontFamily: fontBold(),
    color: '#F59E0B',
  },
  playIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumber: {
    fontSize: FONT_SIZES.xs,
    fontFamily: fontRegular(),
  },

  // Reciter Selector - Glass
  reciterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  reciterSelectorIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reciterSelectorInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  reciterSelectorLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: fontRegular(),
  },
  reciterSelectorName: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontSemiBold(),
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontMedium(),
  },

  // Modal - Glass
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '72%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalBlur: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  modalHandleBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: fontBold(),
    fontWeight: '700',
  },
  modalCloseBtnBlur: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recitersList: {
    paddingBottom: Spacing.xl,
  },
  reciterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reciterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  reciterAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reciterName: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontMedium(),
    fontWeight: '500',
  },
  // Quran Settings Modal
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  settingsContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 20,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  settingsTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: fontBold(),
    fontWeight: '700',
  },
  settingsSectionLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontMedium(),
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  bgOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bgOption: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
