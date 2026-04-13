import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  ScrollView,
  Alert,
  AppState,
} from 'react-native';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { t } from '@/lib/i18n';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { ScreenContainer } from '@/components/screen-container';
import {
  getCachedDayData,
  getCachedVideoUri,
  cacheVideoFile,
  invalidateCachedVideo,
} from '@/lib/daily-video-prefetch';
import { showOfflineModal } from '@/components/ui/OfflineBanner';

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Constants & Types
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const DAILY_VIDEO_JSON_URL =
  'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/data/daily-video.json';

interface VideoEntry {
  reciterId: string;
  reciterLabel: string;
  reciterLabelEn: string;
  url: string;
  premiumUrl?: string;
  duration: number;
}

interface DayData {
  ayahText: string;
  surahName: string;
  surahEnglish: string;
  surahNumber: number;
  ayahNumber: number;
  globalAyahNumber: number;
  generatedAt: string;
  videos: VideoEntry[];
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Helpers
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/** Format seconds to m:ss */
function formatTime(seconds: number): string {
  const totalSec = Math.max(0, Math.floor(seconds));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Convert raw.githubusercontent.com URL to jsDelivr CDN URL.
 * jsDelivr serves correct Content-Type: video/mp4 headers,
 * enabling iOS AVPlayer to stream directly without downloading.
 */
function toJsDelivrUrl(rawUrl: string): string {
  // GitHub Releases URLs are already CDN-backed — no conversion needed
  if (rawUrl.includes('/releases/download/')) return rawUrl;
  const match = rawUrl.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/
  );
  if (!match) return rawUrl;
  const [, owner, repo, branch, path] = match;
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Component
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export default function StoryOfDayScreen() {
  const isRTL = useIsRTL();
  const { settings, isDarkMode } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { isPremium } = useSubscription();
  const { stop: stopGlobalAudio } = useGlobalAudio();

  useEffect(() => { stopGlobalAudio(); }, []);

  const isArabic = (settings.language || 'ar') === 'ar';

  // Data state
  const reciterScrollRef = useRef<ScrollView>(null);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [selectedReciterIdx, setSelectedReciterIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fetchRetryKey, setFetchRetryKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const cdnRetryCount = useRef(0);

  // Player UI state
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPositionRef = useRef(0);

  // Refs for values read inside event handlers / intervals (avoids stale closures)
  const isSeekingRef = useRef(false);
  const positionRef = useRef(0);
  const durationFoundRef = useRef(false);

  // Derive raw video URL
  const currentVideo = dayData?.videos?.[selectedReciterIdx] ?? null;
  const rawVideoUrl = currentVideo
    ? (isPremium && currentVideo.premiumUrl ? currentVideo.premiumUrl : currentVideo.url)
    : null;

  // Resolve video URL: cache-first, CDN fallback
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const resolvedSourceRef = useRef<'cache' | 'cdn' | null>(null);

  useEffect(() => {
    cdnRetryCount.current = 0;
    setVideoUnavailable(false);
    if (!rawVideoUrl) {
      if (__DEV__) console.log('[DailyVideo] No rawVideoUrl — currentVideo:', currentVideo?.reciterLabel, 'isPremium:', isPremium);
      setResolvedVideoUrl(null);
      return;
    }
    if (__DEV__) console.log('[DailyVideo] Resolving URL for:', rawVideoUrl.split('/').pop());
    let cancelled = false;
    (async () => {
      try {
        const cached = await getCachedVideoUri(rawVideoUrl);
        if (cached && !cancelled) {
          console.log('[DailyVideo] Playing from cache:', cached.split('/').pop());
          resolvedSourceRef.current = 'cache';
          setResolvedVideoUrl(cached);
          return;
        }
      } catch { /* ignore cache errors */ }
      if (!cancelled) {
        const cdnUrl = toJsDelivrUrl(rawVideoUrl);
        console.log('[DailyVideo] Playing from CDN:', cdnUrl.split('/').pop());
        resolvedSourceRef.current = 'cdn';
        setResolvedVideoUrl(cdnUrl);
        // Background-cache for next visit
        cacheVideoFile(rawVideoUrl).then((uri) => {
          if (uri) console.log('[DailyVideo] Background cache saved:', uri.split('/').pop());
          else console.warn('[DailyVideo] Background cache failed for:', rawVideoUrl.split('/').pop());
        }).catch((e) => {
          console.warn('[DailyVideo] Background cache error:', e);
        });
      }
    })();
    return () => { cancelled = true; };
  }, [rawVideoUrl]);

  // expo-video player — uses resolved URL (cache or CDN)
  const player = useVideoPlayer(resolvedVideoUrl, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.1;
    p.muted = isMuted; // preserve mute state across source changes
    p.play();
  });

  // Reactive state from player events
  const { status: eventStatus, error: playerErrorObj } = useEvent(player, 'statusChange', {
    status: player.status,
  });
  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  });

  // Workaround: expo-video useEvent can miss readyToPlay if emitted synchronously.
  // Poll the actual player status to detect when it's ready.
  const [actualStatus, setActualStatus] = useState(player.status);
  useEffect(() => {
    setActualStatus(eventStatus);
  }, [eventStatus]);
  useEffect(() => {
    // If the player is already ready but useEvent hasn't caught up, fix it
    const id = setInterval(() => {
      try {
        const real = player.status;
        if (real === 'readyToPlay' && actualStatus !== 'readyToPlay') {
          setActualStatus('readyToPlay');
        }
      } catch { /* player released */ }
    }, 300);
    return () => clearInterval(id);
  }, [player, actualStatus]);

  const status = actualStatus;

  // Keep refs in sync with state (for use inside event handlers/intervals)
  useEffect(() => { isSeekingRef.current = isSeeking; }, [isSeeking]);

  // Track position + detect duration (timeUpdate fires every 0.1s — most reliable)
  useEventListener(player, 'timeUpdate', ({ currentTime: ct }) => {
    positionRef.current = ct;
    if (!isSeekingRef.current) setPositionSec(ct);
    // Aggressively check duration until found
    if (!durationFoundRef.current) {
      try {
        const d = player.duration;
        if (d && d > 0 && isFinite(d)) {
          durationFoundRef.current = true;
          setDurationSec(d);
        }
      } catch { /* player may be released */ }
    }
  });

  // Android fallback: poll position when timeUpdate events stall
  useEffect(() => {
    if (Platform.OS !== 'android' || status !== 'readyToPlay') return;
    const id = setInterval(() => {
      try {
        if (!isSeekingRef.current && player.playing) {
          const ct = player.currentTime;
          positionRef.current = ct;
          setPositionSec(ct);
        }
      } catch { /* player may be released */ }
    }, 500);
    return () => clearInterval(id);
  }, [status]);

  // Update duration & auto-play when ready; recover from cache errors
  useEffect(() => {
    if (__DEV__) console.log('[DailyVideo] Status changed:', status, 'resolvedUrl:', resolvedVideoUrl ? 'set' : 'null');
    if (status === 'readyToPlay') {
      setIsBuffering(false);
      player.play();

      // Try to get duration immediately; timeUpdate handler will keep retrying if 0
      const dur = player.duration;
      if (dur && dur > 0 && isFinite(dur)) {
        durationFoundRef.current = true;
        setDurationSec(dur);
      } else {
        durationFoundRef.current = false;
        // Retry after a short delay — timeUpdate will also keep trying
        const t = setTimeout(() => {
          try {
            const d = player.duration;
            if (d && d > 0 && isFinite(d)) {
              durationFoundRef.current = true;
              setDurationSec(d);
            }
          } catch {}
        }, 500);
        return () => clearTimeout(t);
      }

      // If loaded from CDN, ensure playback cache is populated for next visit
      if (resolvedSourceRef.current === 'cdn' && rawVideoUrl) {
        getCachedVideoUri(rawVideoUrl).then((cached) => {
          if (!cached) {
            console.log('[DailyVideo] Video playing from CDN — retrying background cache');
            cacheVideoFile(rawVideoUrl).catch(() => {});
          }
        }).catch(() => {});
      }
    }
    if (status === 'error') {
      setIsBuffering(false);
      console.warn('[DailyVideo] Player error:', playerErrorObj?.message);
      // If cached file failed, invalidate and retry with CDN
      if (resolvedSourceRef.current === 'cache' && rawVideoUrl) {
        console.log('[DailyVideo] Cache playback failed, falling back to CDN');
        invalidateCachedVideo(rawVideoUrl).catch(() => {});
        resolvedSourceRef.current = 'cdn';
        cdnRetryCount.current = 0;
        setResolvedVideoUrl(toJsDelivrUrl(rawVideoUrl));
      } else {
        cdnRetryCount.current += 1;
        // First CDN failure: retry with a cache-buster to force a fresh connection
        if (cdnRetryCount.current === 1 && rawVideoUrl && !rawVideoUrl.includes('file://')) {
          console.log('[DailyVideo] First attempt failed, retrying with cache-bust');
          resolvedSourceRef.current = 'cdn';
          // Append cache-buster to force React state change + fresh network request
          const separator = rawVideoUrl.includes('?') ? '&' : '?';
          setResolvedVideoUrl(rawVideoUrl + separator + '_retry=' + Date.now());
        } else {
          // Both attempts failed — mark video as unavailable
          console.warn('[DailyVideo] All sources exhausted — showing ayah text fallback');
          setVideoUnavailable(true);
        }
      }
    }
  }, [status]);

  // Pause on background, auto-resume on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        try { player.pause(); } catch { /* noop */ }
      } else if (state === 'active') {
        try {
          if (status === 'readyToPlay' && !videoUnavailable) {
            player.play();
          }
        } catch { /* noop */ }
      }
    });
    return () => {
      sub.remove();
    };
  }, [player, status, videoUnavailable]);

  // Fetch JSON data
  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 10_000);

    (async () => {
      let hasCacheData = false;
      try {
        const cached = await getCachedDayData();
        if (cached && !cancelled) {
          console.log('[DailyVideo] Cache hit:', cached.surahName);
          setDayData(cached);
          setLoading(false);
          hasCacheData = true;
        }

        const res = await fetch(DAILY_VIDEO_JSON_URL + `?_=${Date.now()}`, {
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        let resolved: DayData | null = null;
        const dateKeys = Object.keys(json)
          .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
          .sort()
          .reverse();

        for (const dk of dateKeys) {
          const entry = json[dk];
          if (entry?.videos?.length) {
            resolved = entry as DayData;
            console.log('[DailyVideo] Resolved:', dk, entry.videos.length, 'reciters');
            break;
          }
        }

        if (!cancelled) {
          if (resolved) setDayData(resolved);
          else if (!hasCacheData) setError(true);
        }
      } catch (e: any) {
        console.error('[DailyVideo]', e?.name === 'AbortError' ? 'Timeout' : e);
        if (!cancelled && !hasCacheData) {
          setError(true);
          showOfflineModal();
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; abort.abort(); };
  }, [fetchRetryKey]);

  // Controls helpers
  const resetControlsTimer = useCallback(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimeout.current) clearTimeout(controlsTimeout.current); };
  }, []);

  const togglePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) player.pause(); else player.play();
    resetControlsTimer();
  }, [isPlaying, player, resetControlsTimer]);

  const toggleMute = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !isMuted;
    player.muted = next;
    setIsMuted(next);
    resetControlsTimer();
  }, [isMuted, player, resetControlsTimer]);

  const handleVideoTap = useCallback(() => {
    setShowControls((prev) => {
      if (!prev) { resetControlsTimer(); return true; }
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      return false;
    });
  }, [resetControlsTimer]);

  const handleSeek = useCallback((value: number) => {
    if (seekingTimeoutRef.current) clearTimeout(seekingTimeoutRef.current);
    player.currentTime = value;
    setPositionSec(value);
    setIsSeeking(false);
    resetControlsTimer();
  }, [player, resetControlsTimer]);

  const skipForward = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    player.seekBy(10);
    resetControlsTimer();
  }, [player, resetControlsTimer]);

  const skipBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    player.seekBy(-10);
    resetControlsTimer();
  }, [player, resetControlsTimer]);

  const handleReciterSwitch = useCallback((newIdx: number) => {
    if (newIdx === selectedReciterIdx) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsBuffering(false);
    setPositionSec(0);
    setDurationSec(0);
    durationFoundRef.current = false;
    positionRef.current = 0;
    lastPositionRef.current = 0;
    setSelectedReciterIdx(newIdx);
  }, [selectedReciterIdx]);

  const retryFetch = useCallback(() => {
    setLoading(true);
    setError(false);
    setDayData(null);
    setFetchRetryKey((k) => k + 1);
  }, []);

  // Download & Share (FileSystem only for camera roll / share sheet)
  const handleDownload = useCallback(async () => {
    if (!rawVideoUrl) return;
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let saveUri: string;
      // Use cached file if available to avoid re-downloading
      const cachedUri = await getCachedVideoUri(rawVideoUrl);
      if (cachedUri) {
        const dest = FileSystem.cacheDirectory + 'save-video-' + Date.now() + '.mp4';
        await FileSystem.copyAsync({ from: cachedUri.replace('file://', ''), to: dest });
        saveUri = dest;
      } else {
        const localPath = FileSystem.cacheDirectory + 'daily-video-' + Date.now() + '.mp4';
        const download = await FileSystem.downloadAsync(toJsDelivrUrl(rawVideoUrl), localPath);
        if (!download?.uri) throw new Error('download failed');
        saveUri = download.uri;
        // Also populate playback cache so future visits don't re-download
        cacheVideoFile(rawVideoUrl).catch(() => {});
      }
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('', t('storyOfDay.photoPermissionRequired'));
        return;
      }
      await MediaLibrary.saveToLibraryAsync(saveUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), t('storyOfDay.videoWithAudioSaved'));
    } catch {
      Alert.alert('', t('storyOfDay.videoSaveError'));
    } finally {
      setSaving(false);
    }
  }, [rawVideoUrl]);

  const handleShare = useCallback(async () => {
    if (!dayData || !rawVideoUrl) return;
    setSharing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      let shareUri: string;
      // Use cached file if available to avoid re-downloading
      const cachedUri = await getCachedVideoUri(rawVideoUrl);
      if (cachedUri) {
        const dest = FileSystem.cacheDirectory + 'share-video-' + Date.now() + '.mp4';
        await FileSystem.copyAsync({ from: cachedUri.replace('file://', ''), to: dest });
        shareUri = dest;
      } else {
        const localPath = FileSystem.cacheDirectory + 'share-video-' + Date.now() + '.mp4';
        const download = await FileSystem.downloadAsync(toJsDelivrUrl(rawVideoUrl), localPath);
        if (!download?.uri) throw new Error('download failed');
        shareUri = download.uri;
        // Also populate playback cache so future visits don't re-download
        cacheVideoFile(rawVideoUrl).catch(() => {});
      }
      if (Platform.OS === 'ios') {
        const label = isArabic ? dayData.surahName : dayData.surahEnglish;
        await Share.share({
          message: `${dayData.ayahText}\n\n${label}\n\n${t('storyOfDay.shareText')}`,
          url: shareUri,
        });
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(shareUri, {
            mimeType: 'video/mp4',
            dialogTitle: t('storyOfDay.shareText'),
          });
        }
      }
    } catch (e) {
      console.warn('[Share] Error:', e);
      Alert.alert('', t('storyOfDay.videoSaveError'));
    } finally { setSharing(false); }
  }, [dayData, rawVideoUrl, isArabic]);

  const displayPosition = isSeeking ? seekPosition : positionSec;
  const playerReady = status === 'readyToPlay';
  const playerError = status === 'error';
  const playerLoading = status === 'loading' || status === 'idle';

  // Render
  return (
    <ScreenContainer edges={['top', 'bottom']}>
      <UniversalHeader>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {t('storyOfDay.title')}
          </Text>
          <SectionInfoButton sectionKey="stories" />
        </View>
      </UniversalHeader>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error || !dayData || !currentVideo ? (
          <View style={styles.centered}>
            <View style={[styles.fallbackCard, {
              backgroundColor: isDarkMode ? 'rgba(30,30,32,0.55)' : 'rgba(255,255,255,0.7)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
            }]}>
              <MaterialCommunityIcons name="video-off-outline" size={64} color={colors.muted} />
              <Text style={[styles.fallbackTitle, { color: colors.text, writingDirection: 'rtl' }]}>
                {'\u0641\u064a\u062f\u064a\u0648 \u0627\u0644\u064a\u0648\u0645 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u062d\u0627\u0644\u064a\u0627\u064b'}
              </Text>
              <Text style={[styles.fallbackSubtitle, { color: colors.muted, writingDirection: 'rtl' }]}>
                {isArabic ? '\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u062a\u0635\u0627\u0644\u0643 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a \u0648\u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629' : 'Check your connection and try again'}
              </Text>
              <TouchableOpacity onPress={retryFetch} activeOpacity={0.7} style={styles.retryBtn}>
                <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
                <Text style={styles.retryBtnText}>{t('common.retry') || '\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {dayData.videos.length > 0 && (
              <ScrollView
                ref={reciterScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.reciterChips, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                style={styles.reciterScroll}
                onContentSizeChange={() => {
                  if (isRTL) reciterScrollRef.current?.scrollToEnd({ animated: false });
                }}
              >
                {dayData.videos.map((v, idx) => {
                  const active = idx === selectedReciterIdx;
                  return (
                    <TouchableOpacity
                      key={v.reciterId}
                      onPress={() => handleReciterSwitch(idx)}
                      activeOpacity={0.7}
                      style={[styles.chip, {
                        backgroundColor: active ? '#0d8e62' : 'rgba(34,197,94,0.15)',
                        borderColor: active ? '#0d8e62' : 'rgba(34,197,94,0.3)',
                      }]}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>
                        {isArabic ? v.reciterLabel : v.reciterLabelEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {videoUnavailable && dayData ? (
              <View style={[styles.videoCard, styles.ayahFallbackCard]}>
                <View style={styles.ayahFallbackGradient}>
                  <MaterialCommunityIcons name="bookshelf" size={36} color="rgba(255,255,255,0.5)" style={{ marginBottom: 8 }} />
                  <Text style={styles.ayahFallbackText}>
                    {'\uFD3F'} {dayData.ayahText} {'\uFD3E'}
                  </Text>
                  <View style={styles.ayahFallbackDivider} />
                  <Text style={styles.ayahFallbackSurah}>
                    {isArabic ? dayData.surahName : dayData.surahEnglish}
                    {dayData.ayahNumber ? ` — ${isArabic ? 'آية' : 'Ayah'} ${dayData.ayahNumber}` : ''}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      cdnRetryCount.current = 0;
                      setVideoUnavailable(false);
                      if (rawVideoUrl) {
                        resolvedSourceRef.current = 'cdn';
                        setResolvedVideoUrl(toJsDelivrUrl(rawVideoUrl));
                      }
                    }}
                    style={[styles.retrySmallBtn, { marginTop: 16 }]}
                  >
                    <Text style={styles.retrySmallText}>
                      {t('common.retry') || 'إعادة المحاولة'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
            <TouchableOpacity activeOpacity={1} onPress={handleVideoTap} style={styles.videoCard}>
              <VideoView
                player={player}
                style={styles.videoPlayer}
                contentFit="cover"
                nativeControls={false}
              />

              {(playerLoading || !resolvedVideoUrl) && !playerError && (
                <View style={styles.transitionOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}

              {playerError && (
                <View style={[styles.transitionOverlay, { backgroundColor: 'rgba(0,0,0,0.6)', gap: 12 }]}>
                  <Ionicons name="cloud-offline-outline" size={48} color="rgba(255,255,255,0.7)" />
                  <Text style={{
                    color: 'rgba(255,255,255,0.8)', fontFamily: fontRegular(),
                    fontSize: 15, textAlign: 'center', writingDirection: 'rtl',
                  }}>
                    {t('storyOfDay.loadError')}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={async () => {
                      if (!rawVideoUrl) return;
                      try {
                        const cdnUrl = toJsDelivrUrl(rawVideoUrl);
                        resolvedSourceRef.current = 'cdn';
                        setResolvedVideoUrl(cdnUrl);
                      } catch { /* noop */ }
                    }}
                    style={styles.retrySmallBtn}
                  >
                    <Text style={styles.retrySmallText}>
                      {t('common.retry') || '\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {showControls && playerReady && (
                <View style={styles.controlsOverlay} pointerEvents="box-none">
                  <View style={styles.centerControls}>
                    <TouchableOpacity onPress={skipBack} style={styles.skipBtn}>
                      <MaterialCommunityIcons name="rewind-10" size={32} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseBtn}>
                      <MaterialCommunityIcons
                        name={isPlaying ? 'pause-circle' : 'play-circle'}
                        size={64}
                        color="rgba(255,255,255,0.95)"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={skipForward} style={styles.skipBtn}>
                      <MaterialCommunityIcons name="fast-forward-10" size={32} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.bottomBar}>
                    <View style={[styles.bottomBarRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.timeText}>{formatTime(durationSec)}</Text>
                      <View style={styles.sliderContainer}>
                        <Slider
                          style={styles.slider}
                          minimumValue={0}
                          maximumValue={durationSec || 1}
                          value={displayPosition}
                          inverted={isRTL}
                          onSlidingStart={() => {
                            setIsSeeking(true);
                            if (seekingTimeoutRef.current) clearTimeout(seekingTimeoutRef.current);
                            seekingTimeoutRef.current = setTimeout(() => setIsSeeking(false), 3000);
                          }}
                          onValueChange={(v: number) => { if (isSeeking) setSeekPosition(v); }}
                          onSlidingComplete={handleSeek}
                          minimumTrackTintColor={colors.primary}
                          maximumTrackTintColor="rgba(255,255,255,0.3)"
                          thumbTintColor="#fff"
                        />
                      </View>
                      <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
                      <TouchableOpacity onPress={toggleMute} style={styles.muteBtn}>
                        <MaterialCommunityIcons
                          name={isMuted ? 'volume-off' : 'volume-high'}
                          size={20}
                          color="rgba(255,255,255,0.9)"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            )}

            <View style={styles.actionsSection}>
              <TouchableOpacity
                onPress={handleDownload}
                disabled={saving}
                activeOpacity={0.7}
                style={[styles.actionBtn, {
                  backgroundColor: '#0d8e62',
                  borderColor: 'transparent',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }]}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <MaterialCommunityIcons name="download" size={20} color="#fff" />
                }
                <Text style={[styles.btnText, { color: '#fff' }]}>
                  {saving ? t('common.loading') : t('storyOfDay.saveVideoWithReciter')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                disabled={sharing}
                activeOpacity={0.7}
                style={[styles.actionBtn, {
                  backgroundColor: 'rgba(34,197,94,0.15)',
                  borderColor: 'rgba(34,197,94,0.3)',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }]}
              >
                {sharing
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
                }
                <Text style={[styles.btnText, { color: colors.text }]}>
                  {sharing ? t('storyOfDay.sharingInProgress') : t('common.share')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Styles
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const _styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 300 },
  fallbackCard: {
    alignItems: 'center', justifyContent: 'center', gap: 14,
    paddingHorizontal: 28, paddingVertical: 36, borderRadius: 20,
    borderWidth: 0.5, marginHorizontal: 8, width: '100%',
  },
  fallbackTitle: {
    fontSize: 18, fontFamily: fontBold(), textAlign: 'center',
    lineHeight: 30, includeFontPadding: false,
  },
  fallbackSubtitle: {
    fontSize: 14, fontFamily: fontRegular(), textAlign: 'center',
    lineHeight: 24, includeFontPadding: false, marginBottom: 4,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#22C55E', paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: 24, marginTop: 4,
  },
  retryBtnText: {
    color: '#fff', fontFamily: fontSemiBold(), fontSize: 15,
    lineHeight: 24, includeFontPadding: false,
  },
  retrySmallBtn: {
    backgroundColor: '#22C55E', paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 20, marginTop: 4,
  },
  retrySmallText: {
    color: '#fff', fontFamily: fontSemiBold(), fontSize: 14, writingDirection: 'rtl',
  },
  headerTitle: { fontSize: 18, fontFamily: fontBold(), lineHeight: 30, includeFontPadding: false },
  reciterScroll: { marginTop: 8, marginBottom: 10, maxHeight: 44 },
  reciterChips: { gap: 8, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth, flexShrink: 0,
  },
  chipText: { fontFamily: fontBold(), fontSize: 14, lineHeight: 24, includeFontPadding: false },
  videoCard: { borderRadius: 20, overflow: 'hidden', aspectRatio: 9 / 16, width: '100%' },
  videoPlayer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  controlsOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  centerControls: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  playPauseBtn: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  skipBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingBottom: 14, paddingTop: 8,
  },
  bottomBarRow: { alignItems: 'center', gap: 6 },
  sliderContainer: { flex: 1, height: 30, justifyContent: 'center' },
  slider: { width: '100%', height: 30 },
  timeText: {
    color: 'rgba(255,255,255,0.85)', fontSize: 12,
    fontFamily: fontRegular(), minWidth: 36, textAlign: 'center',
  },
  muteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center',
  },
  actionsSection: { gap: 10, marginTop: 14 },
  actionBtn: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnText: { fontFamily: fontBold(), fontSize: 15, lineHeight: 26, includeFontPadding: false },
  ayahFallbackCard: {
    backgroundColor: '#0a2e2e',
  },
  ayahFallbackGradient: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 32,
  },
  ayahFallbackText: {
    color: 'rgba(255,255,255,0.92)', fontFamily: fontBold(), fontSize: 24,
    lineHeight: 46, textAlign: 'center', writingDirection: 'rtl',
    includeFontPadding: false,
  },
  ayahFallbackDivider: {
    width: 60, height: 1.5, backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 16, borderRadius: 1,
  },
  ayahFallbackSurah: {
    color: 'rgba(255,255,255,0.6)', fontFamily: fontSemiBold(), fontSize: 15,
    textAlign: 'center', writingDirection: 'rtl', includeFontPadding: false,
  },
});
