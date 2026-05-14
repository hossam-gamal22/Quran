import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader, GlassCard, NativeTabs } from '@/components/ui';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';

// Arabic character range (Arabic + Supplement + Extended-A + Presentation Forms)
const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const hasArabic = (s?: string) => !!s && ARABIC_RANGE.test(s);
/** Pick the best name to display given the current UI language. */
function resolveStationName(station: RadioStation, lang: string): string {
  return station.nameTranslations?.[lang] || station.name;
}
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { t } from '@/lib/i18n';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { Spacing, BorderRadius, FONT_SIZES } from '@/constants/theme';
import type { RadioStation, RadioTab, RadioCategory } from '@/types/radio';
import {
  fetchAllStations,
  searchStations,
  getRadioFavorites,
  toggleRadioFavorite,
  isRadioFavorite,
} from '@/services/radioService';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showOfflineModal } from '@/components/ui/OfflineBanner';

const ACCENT = '#0d8e62';
const RADIO_INTERSTITIAL_INTERVAL_MS = 180_000;
const RADIO_DAILY_INTERSTITIAL_LIMIT = 6;
const RADIO_AD_COUNT_KEY = '@radio_interstitial_daily_count';
const RADIO_AD_DATE_KEY = '@radio_interstitial_daily_date';

function radioTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

async function getRadioInterstitialCountToday(): Promise<number> {
  const today = radioTodayKey();
  const savedDate = await AsyncStorage.getItem(RADIO_AD_DATE_KEY);

  if (savedDate !== today) {
    await AsyncStorage.multiSet([
      [RADIO_AD_DATE_KEY, today],
      [RADIO_AD_COUNT_KEY, '0'],
    ]);
    return 0;
  }

  const rawCount = await AsyncStorage.getItem(RADIO_AD_COUNT_KEY);
  const count = Number(rawCount);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

async function canShowRadioInterstitialToday(): Promise<boolean> {
  try {
    return (await getRadioInterstitialCountToday()) < RADIO_DAILY_INTERSTITIAL_LIMIT;
  } catch {
    return true;
  }
}

async function recordRadioInterstitialShown(): Promise<void> {
  try {
    const today = radioTodayKey();
    const savedDate = await AsyncStorage.getItem(RADIO_AD_DATE_KEY);
    const currentCount = savedDate === today
      ? Number(await AsyncStorage.getItem(RADIO_AD_COUNT_KEY)) || 0
      : 0;

    await AsyncStorage.multiSet([
      [RADIO_AD_DATE_KEY, today],
      [RADIO_AD_COUNT_KEY, String(currentCount + 1)],
    ]);
  } catch {}
}

export default function RadioScreenWrapper() {
  return (
    <ErrorBoundary>
      <RadioScreen />
    </ErrorBoundary>
  );
}

function RadioScreen() {
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const isRTL = useIsRTL();
  const { isDarkMode, settings } = useSettings();
  const language = settings.language;
  const router = useRouter();
  const { state: audioState, playRadio, stopRadio } = useGlobalAudio();
  const radioState = audioState.radioState;

  // Detect playback error state for Android error display
  const isPlaybackError = radioState.status === 'error';

  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RadioTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Interstitial ad — show every 3 minutes of active radio playback.
  const adTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const radioAdInFlightRef = useRef(false);

  // Animation for search bar
  const searchAnim = useRef(new Animated.Value(0)).current;

  const loadStations = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllStations(forceRefresh);
      setStations(data);
    } catch {
      const netState = await NetInfo.fetch();
      if (!(netState.isConnected && netState.isInternetReachable !== false)) {
        setError(t('radio.onlineOnlyMessage'));
        showOfflineModal();
      } else {
        setError(t('radio.errorLoading'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    const favs = await getRadioFavorites();
    setFavorites(new Set(favs.map(f => f.stationId)));
  }, []);

  useEffect(() => {
    loadStations();
    loadFavorites();
  }, [loadStations, loadFavorites]);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  const maybeShowRadioInterstitial = useCallback(async () => {
    if (radioAdInFlightRef.current) return;

    radioAdInFlightRef.current = true;
    try {
      if (!(await canShowRadioInterstitialToday())) return;

      await showInterstitial({
        ignoreSmartFrequencyCaps: true,
        onShown: recordRadioInterstitialShown,
      });
    } finally {
      radioAdInFlightRef.current = false;
    }
  }, []);

  const shouldRunRadioAdTimer = !!radioState.currentStation && (
    radioState.status === 'loading' ||
    radioState.status === 'buffering' ||
    radioState.status === 'playing'
  );

  useEffect(() => {
    if (!shouldRunRadioAdTimer) {
      if (adTimerRef.current) {
        clearInterval(adTimerRef.current);
        adTimerRef.current = null;
      }
      return;
    }

    if (adTimerRef.current) clearInterval(adTimerRef.current);
    adTimerRef.current = setInterval(() => {
      maybeShowRadioInterstitial();
    }, RADIO_INTERSTITIAL_INTERVAL_MS);

    return () => {
      if (adTimerRef.current) {
        clearInterval(adTimerRef.current);
        adTimerRef.current = null;
      }
    };
  }, [maybeShowRadioInterstitial, shouldRunRadioAdTimer]);

  const toggleSearch = useCallback(() => {
    const toValue = showSearch ? 0 : 1;
    setShowSearch(!showSearch);
    Animated.spring(searchAnim, {
      toValue,
      damping: 18,
      stiffness: 240,
      useNativeDriver: false,
    }).start();
    if (!showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 200);
    } else {
      setSearchQuery('');
    }
  }, [showSearch, searchAnim]);

  const handleToggleFavorite = useCallback(async (station: RadioStation) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleRadioFavorite(station.id);
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(station.id)) {
        next.delete(station.id);
      } else {
        next.add(station.id);
      }
      return next;
    });
  }, []);

  const handlePlayStation = useCallback(async (station: RadioStation) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check network connectivity before trying to play
    const netState = await NetInfo.fetch();
    if (!(netState.isConnected && netState.isInternetReachable !== false)) {
      setError(t('radio.onlineOnlyMessage'));
      showOfflineModal();
      return;
    }

    try {
      console.log('[Radio] handlePlayStation:', station.name, station.streamUrl);
      if (radioState.currentStation?.id === station.id && radioState.status === 'playing') {
        console.log('[Radio] Stopping current station');
        await stopRadio();
      } else {
        console.log('[Radio] Starting playback for:', station.name);
        await playRadio(station);
        console.log('[Radio] playRadio call completed');
      }
    } catch (e: any) {
      // Don't set component-level error — playback errors are handled by
      // radioState.status === 'error' and the playback error banner UI.
      // Setting error here would hide the entire station list.
      console.error('[Radio] handlePlayStation error:', e);
    }
  }, [radioState, playRadio, stopRadio]);

  // Cleanup ad timer on unmount
  useEffect(() => {
    return () => {
      if (adTimerRef.current) clearInterval(adTimerRef.current);
    };
  }, []);

  // Filter stations based on tab
  const filteredStations = useMemo(() => {
    let result = stations;

    // When the UI is Arabic, drop stations whose display name would be non-Arabic.
    // Station qualifies if either the admin-provided Arabic translation or the
    // primary name contains Arabic script — otherwise it's noise for ar users.
    if (language === 'ar') {
      result = result.filter(s => hasArabic(s.nameTranslations?.ar) || hasArabic(s.name));
    }

    // Category filter based on tab
    if (activeTab === 'quran') {
      result = result.filter(s =>
        s.category === 'quran' || s.category === 'reciter'
      );
    } else if (activeTab === 'islamic') {
      result = result.filter(s =>
        s.category !== 'quran' && s.category !== 'reciter'
      );
    } else if (activeTab === 'favorites') {
      result = result.filter(s => favorites.has(s.id));
    }

    // Search filter
    if (searchQuery.trim()) {
      result = searchStations(result, searchQuery.trim());
    }

    return result;
  }, [stations, activeTab, favorites, searchQuery, language]);

  const tabs = useMemo(() => [
    { key: 'all' as const, label: t('radio.allStations') },
    { key: 'quran' as const, label: t('radio.quranStations') },
    { key: 'islamic' as const, label: t('radio.islamicStations') },
    { key: 'favorites' as const, label: t('radio.favorites') },
  ], []);

  const isCurrentlyPlaying = useCallback((stationId: string) => {
    return radioState.currentStation?.id === stationId && radioState.status === 'playing';
  }, [radioState]);

  const isCurrentlyLoading = useCallback((stationId: string) => {
    return radioState.currentStation?.id === stationId &&
      (radioState.status === 'loading' || radioState.status === 'buffering');
  }, [radioState]);

  const searchBarHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });

  const renderStation = useCallback(({ item }: { item: RadioStation }) => {
    const playing = isCurrentlyPlaying(item.id);
    const buffering = isCurrentlyLoading(item.id);
    const isFav = favorites.has(item.id);

    return (
      <Pressable
        onPress={() => handlePlayStation(item)}
        style={({ pressed }) => [
          styles.stationCard,
          {
            backgroundColor: playing
              ? (isDarkMode ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.15)')
              : colors.card,
            borderColor: playing ? ACCENT : colors.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={[styles.stationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Station icon */}
          <View style={[styles.stationIcon, { backgroundColor: playing ? ACCENT : (isDarkMode ? 'rgba(255,255,255,0.1)' : ACCENT) }]}>
            {buffering ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons
                name={playing ? 'radio' : 'radio-tower'}
                size={22}
                color="#fff"
              />
            )}
          </View>

          {/* Station info */}
          <View style={[styles.stationInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text
              style={[
                styles.stationName,
                { color: playing ? ACCENT : colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
              ]}
              numberOfLines={1}
            >
              {resolveStationName(item, language)}
            </Text>
            <View style={[styles.stationMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {playing && (
                <View style={[styles.liveBadge, { marginEnd: 6 }]}>
                  <View style={styles.liveIndicator} />
                  <Text style={styles.liveText}>{t('radio.liveStream')}</Text>
                </View>
              )}
              {!playing && item.category && (
                <Text style={[styles.categoryBadgeText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                  {getCategoryLabel(item.category)}
                </Text>
              )}
            </View>
          </View>

          {/* Favorite button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              handleToggleFavorite(item);
            }}
            hitSlop={12}
            style={styles.favButton}
          >
            <MaterialCommunityIcons
              name={isFav ? 'heart' : 'heart-outline'}
              size={22}
              color={isFav ? '#EF4444' : colors.textLight}
            />
          </Pressable>
        </View>
      </Pressable>
    );
  }, [isCurrentlyPlaying, isCurrentlyLoading, favorites, isDarkMode, isRTL, colors, handlePlayStation, handleToggleFavorite, language]);

  return (
    <ScreenContainer screenKey="radio" edges={['top', 'left', 'right']}>
      <UniversalHeader
        title={t('radio.title')}
        rightActions={[
          {
            icon: showSearch ? 'close' : 'magnify',
            onPress: toggleSearch,
          },
        ]}
      />

      {/* Search bar (animated) */}
      <Animated.View style={[styles.searchContainer, { height: searchBarHeight, opacity: searchAnim }]}>
        <View style={[styles.searchInputWrapper, {
          backgroundColor: colors.card,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.textLight}
            style={{ marginHorizontal: 8 }}
          />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, {
              color: colors.text,
              textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr',
              fontFamily: fontRegular(),
            }]}
            placeholder={t('radio.searchStations')}
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textLight} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Tabs — iOS UISegmentedControl handles RTL ordering natively */}
      <View style={styles.tabsContainer}>
        <NativeTabs
          tabs={tabs}
          selected={activeTab}
          onSelect={(key) => setActiveTab(key as RadioTab)}
          indicatorColor={ACCENT}
        />
      </View>

      {/* General Error Display */}
      {error && !isPlaybackError && (
        <View style={[styles.errorBanner, {
          backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
          borderColor: isDarkMode ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.15)',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }]}>
          <MaterialCommunityIcons name={isOffline ? 'wifi-off' : 'alert-circle-outline'} size={24} color="#EF4444" />
          <View style={[styles.errorBannerInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.errorBannerMsg, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={2}>
              {error}
            </Text>
          </View>
          <Pressable
            onPress={() => setError(null)}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="close" size={20} color={colors.textLight} />
          </Pressable>
        </View>
      )}

      {/* Playback Error Banner */}
      {isPlaybackError && radioState.currentStation && (
        <View style={[styles.errorBanner, {
          backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
          borderColor: isDarkMode ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.15)',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }]}>
          <MaterialCommunityIcons
            name={isOffline ? 'wifi-off' : radioState.errorMessage === 'STREAM_OFFLINE' ? 'broadcast-off' : 'alert-circle-outline'}
            size={24}
            color="#EF4444"
          />
          <View style={[styles.errorBannerInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.errorBannerTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
              {resolveStationName(radioState.currentStation, language)}
            </Text>
            <Text style={[styles.errorBannerMsg, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
              {isOffline ? t('radio.noInternet') : radioState.errorMessage === 'STREAM_OFFLINE' ? t('radio.stationOffline') : t('radio.connectionError')}
            </Text>
          </View>
          <Pressable
            onPress={() => handlePlayStation(radioState.currentStation!)}
            style={[styles.retryBannerBtn, { backgroundColor: '#EF4444' }]}
          >
            <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
          </Pressable>
        </View>
      )}

      {/* Now Playing Mini Bar */}
      {radioState.currentStation && radioState.status !== 'idle' && radioState.status !== 'error' && (
        <Pressable
          onPress={() => {
            if (radioState.currentStation) handlePlayStation(radioState.currentStation);
          }}
          style={[styles.nowPlayingBar, {
            backgroundColor: isDarkMode ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.15)',
            borderColor: `${ACCENT}30`,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }]}
        >
          <View style={styles.nowPlayingPulse}>
            {radioState.status === 'playing' ? (
              <View style={styles.equalizerContainer}>
                <View style={[styles.equalizerBar, styles.eqBar1]} />
                <View style={[styles.equalizerBar, styles.eqBar2]} />
                <View style={[styles.equalizerBar, styles.eqBar3]} />
              </View>
            ) : (radioState.status === 'loading' || radioState.status === 'buffering') ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (
              <MaterialCommunityIcons name="pause-circle" size={24} color={ACCENT} />
            )}
          </View>
          <View style={[styles.nowPlayingInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.nowPlayingLabel, { color: ACCENT, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
              {t('radio.nowPlaying')}
            </Text>
            <Text style={[styles.nowPlayingName, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
              {resolveStationName(radioState.currentStation, language)}
            </Text>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              stopRadio();
            }}
            hitSlop={12}
          >
            <MaterialCommunityIcons name="stop-circle-outline" size={28} color={colors.textLight} />
          </Pressable>
        </Pressable>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={[styles.loadingText, { color: colors.textLight }]}>
            {t('radio.loadingStations')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons name="wifi-off" size={48} color={colors.textLight} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <Pressable
            onPress={() => loadStations(true)}
            style={[styles.retryButton, { backgroundColor: ACCENT }]}
          >
            <Text style={styles.retryText}>{t('radio.tryAgain')}</Text>
          </Pressable>
        </View>
      ) : filteredStations.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons
            name={activeTab === 'favorites' ? 'heart-outline' : 'radio-tower'}
            size={48}
            color={colors.textLight}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {activeTab === 'favorites' ? t('radio.noFavorites') : t('radio.noStations')}
          </Text>
          {activeTab === 'favorites' && (
            <Text style={[styles.emptyDesc, { color: colors.textLight }]}>
              {t('radio.noFavoritesDesc')}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.listWrapper}>
          <FlatList
            data={filteredStations}
            keyExtractor={(item) => item.id}
            renderItem={renderStation}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={[styles.stationCountText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {filteredStations.length} {t('radio.stationCount')}
              </Text>
            }
          />
        </View>
      )}

      {/* Fixed Banner at Bottom */}
      <View style={styles.fixedBannerContainer}>
        <BannerAdComponent screen="radio" />
      </View>
    </ScreenContainer>
  );
}

function getCategoryLabel(category: RadioCategory): string {
  const map: Partial<Record<RadioCategory, string>> = {
    quran: t('radio.quranStations'),
    reciter: t('radio.reciter'),
    tafsir: t('radio.tafsir'),
    translation: t('radio.translation'),
    islamic: t('radio.islamicStations'),
  };
  return map[category] || '';
}

const _styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  searchInputWrapper: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    paddingVertical: 8,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  nowPlayingBar: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 10,
  },
  nowPlayingPulse: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equalizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 18,
  },
  equalizerBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: ACCENT,
  },
  eqBar1: { height: 8 },
  eqBar2: { height: 14 },
  eqBar3: { height: 10 },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingLabel: {
    fontSize: 11,
    fontFamily: fontMedium(),
    lineHeight: 18,
    includeFontPadding: false,
  },
  nowPlayingName: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontSemiBold(),
    lineHeight: 28,
    includeFontPadding: false,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontMedium(),
    marginTop: 8,
    lineHeight: 28,
    includeFontPadding: false,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontMedium(),
    textAlign: 'center',
    lineHeight: 28,
    includeFontPadding: false,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontFamily: fontSemiBold(),
    lineHeight: 28,
    includeFontPadding: false,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: fontSemiBold(),
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 30,
    includeFontPadding: false,
  },
  emptyDesc: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 22,
    includeFontPadding: false,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 80,
  },
  fixedBannerContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'transparent',
  },
  stationCountText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontMedium(),
    paddingVertical: 6,
    lineHeight: 22,
    includeFontPadding: false,
  },
  stationCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stationRow: {
    alignItems: 'center',
    gap: 12,
  },
  stationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationInfo: {
    flex: 1,
    gap: 2,
  },
  stationName: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontSemiBold(),
    lineHeight: 28,
    includeFontPadding: false,
  },
  stationMeta: {
    alignItems: 'center',
    gap: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11,
    fontFamily: fontMedium(),
    color: '#EF4444',
    lineHeight: 18,
    includeFontPadding: false,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontFamily: fontRegular(),
    lineHeight: 20,
    includeFontPadding: false,
  },
  favButton: {
    padding: 4,
  },
  errorBanner: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 10,
  },
  errorBannerInfo: {
    flex: 1,
    gap: 1,
  },
  errorBannerTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontSemiBold(),
    lineHeight: 28,
    includeFontPadding: false,
  },
  errorBannerMsg: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontRegular(),
    lineHeight: 22,
    includeFontPadding: false,
  },
  retryBannerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
const styles = _styles;
