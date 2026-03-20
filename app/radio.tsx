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
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';
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

const ACCENT = '#22C55E';

export default function RadioScreenWrapper() {
  return (
    <ErrorBoundary>
      <RadioScreen />
    </ErrorBoundary>
  );
}

function RadioScreen() {
  const colors = useColors();
  const isRTL = useIsRTL();
  const { isDarkMode } = useSettings();
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
  const searchInputRef = useRef<TextInput>(null);

  // Interstitial ad — show after 20s of radio playback (every channel open)
  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation for search bar
  const searchAnim = useRef(new Animated.Value(0)).current;

  const loadStations = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllStations(forceRefresh);
      setStations(data);
    } catch {
      setError(t('radio.errorLoading'));
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
    try {
      setError(null);
      console.log('[Radio] handlePlayStation:', station.name, station.streamUrl);
      if (radioState.currentStation?.id === station.id && radioState.status === 'playing') {
        // Stopping — clear the ad timer
        if (adTimerRef.current) {
          clearTimeout(adTimerRef.current);
          adTimerRef.current = null;
        }
        console.log('[Radio] Stopping current station');
        await stopRadio();
      } else {
        // Starting a new station — schedule interstitial after 20s
        if (adTimerRef.current) clearTimeout(adTimerRef.current);
        adTimerRef.current = setTimeout(() => {
          try { showInterstitial(); } catch {}
          adTimerRef.current = null;
        }, 20_000);
        console.log('[Radio] Starting playback for:', station.name);
        await playRadio(station);
        console.log('[Radio] playRadio call completed');
      }
    } catch (e: any) {
      console.error('[Radio] handlePlayStation error:', e);
      setError(e?.message || t('radio.connectionError'));
    }
  }, [radioState, playRadio, stopRadio]);

  // Cleanup ad timer on unmount
  useEffect(() => {
    return () => {
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    };
  }, []);

  // Filter stations based on tab
  const filteredStations = useMemo(() => {
    let result = stations;

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
  }, [stations, activeTab, favorites, searchQuery]);

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
            backgroundColor: isDarkMode
              ? playing ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'
              : playing ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.03)',
            borderColor: playing
              ? ACCENT
              : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={[styles.stationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Station icon */}
          <View style={[styles.stationIcon, { backgroundColor: playing ? ACCENT : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') }]}>
            {buffering ? (
              <ActivityIndicator size="small" color={playing ? '#fff' : ACCENT} />
            ) : (
              <MaterialCommunityIcons
                name={playing ? 'radio' : 'radio-tower'}
                size={22}
                color={playing ? '#fff' : ACCENT}
              />
            )}
          </View>

          {/* Station info */}
          <View style={[styles.stationInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text
              style={[
                styles.stationName,
                { color: playing ? ACCENT : colors.text, textAlign: isRTL ? 'right' : 'left' },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View style={[styles.stationMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {playing && (
                <View style={[styles.liveBadge, { marginEnd: 6 }]}>
                  <View style={styles.liveIndicator} />
                  <Text style={styles.liveText}>{t('radio.liveStream')}</Text>
                </View>
              )}
              {!playing && item.category && (
                <Text style={[styles.categoryBadgeText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
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
  }, [isCurrentlyPlaying, isCurrentlyLoading, favorites, isDarkMode, isRTL, colors, handlePlayStation, handleToggleFavorite]);

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
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
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
              textAlign: isRTL ? 'right' : 'left',
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

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <NativeTabs
          tabs={tabs}
          selected={activeTab}
          onSelect={(key) => setActiveTab(key as RadioTab)}
          scrollable
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
          <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#EF4444" />
          <View style={[styles.errorBannerInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.errorBannerMsg, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
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
          <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#EF4444" />
          <View style={[styles.errorBannerInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.errorBannerTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {radioState.currentStation.name}
            </Text>
            <Text style={[styles.errorBannerMsg, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {radioState.errorMessage || t('radio.connectionError')}
            </Text>
          </View>
          <Pressable
            onPress={() => playRadio(radioState.currentStation!)}
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
            backgroundColor: isDarkMode ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
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
            <Text style={[styles.nowPlayingLabel, { color: ACCENT, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {t('radio.nowPlaying')}
            </Text>
            <Text style={[styles.nowPlayingName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {radioState.currentStation.name}
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
        <FlatList
          data={filteredStations}
          keyExtractor={(item) => item.id}
          renderItem={renderStation}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.stationCountText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
              {filteredStations.length} {t('radio.stationCount')}
            </Text>
          }
        />
      )}
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

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(34,197,94,0.15)',
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
  },
  nowPlayingName: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontSemiBold(),
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
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    fontFamily: fontMedium(),
    textAlign: 'center',
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
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: fontSemiBold(),
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontRegular(),
    textAlign: 'center',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 120,
  },
  stationCountText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontMedium(),
    paddingVertical: 6,
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
  },
  categoryBadgeText: {
    fontSize: 12,
    fontFamily: fontRegular(),
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
  },
  errorBannerMsg: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontRegular(),
  },
  retryBannerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
