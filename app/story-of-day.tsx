import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { fontBold, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { t } from '@/lib/i18n';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { getVerseQcfData } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily, isPageFontLoaded } from '@/lib/qcf-font-loader';

const DAILY_VIDEO_JSON_URL =
  'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/data/daily-video.json';

interface VideoEntry {
  reciterId: string;
  reciterLabel: string;
  reciterLabelEn: string;
  url: string;
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

type RollingData = Record<string, DayData>;

function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function StoryOfDayScreen() {
  const isRTL = useIsRTL();
  const { settings } = useSettings();
  const colors = useColors();
  const { isPremium } = useSubscription();
  const { appName, logoSource } = useAppIdentity();
  const isArabic = (settings.language || 'ar') === 'ar';

  const videoRef = useRef<Video>(null);
  const reciterScrollRef = useRef<ScrollView>(null);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [selectedReciterIdx, setSelectedReciterIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [qcfReady, setQcfReady] = useState(false);
  const [qcfPage, setQcfPage] = useState<number | null>(null);
  const [qcfGlyphs, setQcfGlyphs] = useState<string[]>([]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetControlsTimer = useCallback(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
    resetControlsTimer();
  }, [isPlaying, resetControlsTimer]);

  const toggleMute = useCallback(async () => {
    if (!videoRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await videoRef.current.setIsMutedAsync(!isMuted);
    setIsMuted(!isMuted);
    resetControlsTimer();
  }, [isMuted, resetControlsTimer]);

  const handleVideoTap = useCallback(() => {
    setShowControls((prev) => {
      if (!prev) {
        resetControlsTimer();
        return true;
      }
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      return false;
    });
  }, [resetControlsTimer]);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (!isSeeking) {
      setPositionMs(status.positionMillis ?? 0);
    }
    setDurationMs(status.durationMillis ?? 0);
    setIsPlaying(status.isPlaying);
  }, [isSeeking]);

  const handleSeek = useCallback(async (value: number) => {
    setIsSeeking(false);
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(value);
    }
    resetControlsTimer();
  }, [resetControlsTimer]);

  const skipForward = useCallback(async () => {
    if (!videoRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPos = Math.min(positionMs + 10000, durationMs);
    await videoRef.current.setPositionAsync(newPos);
    resetControlsTimer();
  }, [positionMs, durationMs, resetControlsTimer]);

  const skipBack = useCallback(async () => {
    if (!videoRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPos = Math.max(positionMs - 10000, 0);
    await videoRef.current.setPositionAsync(newPos);
    resetControlsTimer();
  }, [positionMs, resetControlsTimer]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(DAILY_VIDEO_JSON_URL);
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();

        let resolved: DayData | null = null;
        const dateKeys = Object.keys(json).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));

        if (dateKeys.length > 0) {
          const sorted = dateKeys.sort().reverse();
          for (const dk of sorted) {
            const entry = json[dk];
            if (entry?.videos?.length) {
              resolved = entry as DayData;
              break;
            }
          }
        }

        if (!resolved && json.url && json.ayahText) {
          resolved = {
            ayahText: json.ayahText,
            surahName: json.surahName,
            surahEnglish: json.surahEnglish,
            surahNumber: json.surahNumber,
            ayahNumber: json.ayahNumber,
            globalAyahNumber: json.globalAyahNumber,
            generatedAt: json.generatedAt || json.date,
            videos: [{
              reciterId: 'ar.alafasy',
              reciterLabel: 'مشاري العفاسي',
              reciterLabelEn: 'Mishary Alafasy',
              url: json.url,
              duration: json.duration || 0,
            }],
          };
        }

        if (!cancelled) {
          if (resolved) setDayData(resolved);
          else setError(true);
        }
      } catch (e) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!dayData?.surahNumber || !dayData?.ayahNumber) return;
    let cancelled = false;
    (async () => {
      try {
        const qcfData = getVerseQcfData(dayData.surahNumber, dayData.ayahNumber);
        if (!qcfData || cancelled) return;
        setQcfPage(qcfData.page);
        setQcfGlyphs(qcfData.glyphs);
        if (!isPageFontLoaded(qcfData.page, true)) {
          await loadPageFont(qcfData.page, true);
        }
        if (!cancelled) setQcfReady(true);
      } catch (e) {
        if (!cancelled) setQcfReady(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dayData?.surahNumber, dayData?.ayahNumber]);

  // Auto-hide controls after 4s
  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, []);

  const currentVideo = dayData?.videos?.[selectedReciterIdx] ?? null;

  const handleDownload = useCallback(async () => {
    if (!currentVideo?.url) return;
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const localPath = FileSystem.cacheDirectory + 'daily-video-' + Date.now() + '.mp4';
      const download = await FileSystem.downloadAsync(currentVideo.url, localPath);
      if (!download?.uri) throw new Error('download failed');
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('', t('storyOfDay.photoPermissionRequired'));
        return;
      }
      await MediaLibrary.saveToLibraryAsync(download.uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅', 'تم تحميل فيديو اليوم بنجاح');
    } catch (e) {
      Alert.alert('', t('storyOfDay.videoSaveError'));
    } finally {
      setSaving(false);
    }
  }, [currentVideo]);

  const handleShare = useCallback(async () => {
    if (!dayData || !currentVideo) return;
    setSharing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const localPath = FileSystem.cacheDirectory + 'share-video-' + Date.now() + '.mp4';
      const download = await FileSystem.downloadAsync(currentVideo.url, localPath);
      if (download?.uri) {
        if (Platform.OS === 'ios') {
          const sl = isArabic ? dayData.surahName : dayData.surahEnglish;
          await Share.share({
            message: dayData.ayahText + '\n\n' + sl + '\n\n' + t('storyOfDay.shareText'),
            url: download.uri,
          });
        } else {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(download.uri, {
              mimeType: 'video/mp4',
              dialogTitle: t('storyOfDay.shareText'),
            });
          }
        }
      }
    } catch (e) {
      // silent
    } finally {
      setSharing(false);
    }
  }, [dayData, currentVideo, isArabic]);

  const surahLabel = dayData ? (isArabic ? dayData.surahName : dayData.surahEnglish) : '';
  const qcfFontFamily = qcfReady && qcfPage ? getPageFontFamily(qcfPage, true) : null;
  const ayahFontFamily = qcfFontFamily || 'KFGQPCUthmanic';
  const isQcf = !!qcfFontFamily;
  const ayahFontSize = isQcf ? 32 : 28;
  const ayahLineHeight = isQcf ? 64 : 56;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
              <MaterialCommunityIcons name="video-off-outline" size={64} color={colors.muted} />
              <Text style={[styles.errorText, { color: colors.muted }]}>
                {t('storyOfDay.loadError')}
              </Text>
            </View>
          ) : (
            <>
              {/* Reciter Chips — starts from far right in RTL */}
              {dayData.videos.length > 0 && (
                <ScrollView
                  ref={reciterScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.reciterChips, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  style={styles.reciterScroll}
                  onContentSizeChange={() => {
                    if (isRTL && reciterScrollRef.current) {
                      reciterScrollRef.current.scrollToEnd({ animated: false });
                    }
                  }}
                >
                  {dayData.videos.map((v, idx) => {
                    const active = idx === selectedReciterIdx;
                    return (
                      <TouchableOpacity
                        key={v.reciterId}
                        onPress={() => {
                          setSelectedReciterIdx(idx);
                          setIsPlaying(true);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        activeOpacity={0.7}
                        style={[styles.chip, {
                          backgroundColor: active ? colors.primary : colors.card,
                          borderColor: active ? colors.primary : colors.border,
                        }]}
                      >
                        <Text
                          style={[styles.chipText, { color: active ? '#fff' : colors.text }]}
                          numberOfLines={1}
                        >
                          {isArabic ? v.reciterLabel : v.reciterLabelEn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* Video Card */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleVideoTap}
                style={styles.videoCard}
              >
                <Video
                  ref={videoRef}
                  source={{ uri: currentVideo.url }}
                  style={styles.videoPlayer}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={isPlaying}
                  isLooping
                  isMuted={isMuted}
                  onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                />
                {/* Subtle gradient for text readability */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
                  locations={[0, 0.45, 1]}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />

                {/* QCF Text overlay — centered, no duplicated verse number */}
                <View style={styles.videoTextOverlay} pointerEvents="none">
                  <Text
                    style={[styles.ayahText, { fontFamily: ayahFontFamily, fontSize: ayahFontSize, lineHeight: ayahLineHeight }]}
                    allowFontScaling={false}
                  >
                    {isQcf ? qcfGlyphs.join('') : dayData.ayahText}
                  </Text>
                  <View style={styles.divider} />
                  <Text style={styles.surahRef}>
                    {surahLabel}
                  </Text>
                </View>

                {/* Branding — bigger, pinned to very bottom */}
                {!isPremium && (
                  <View style={styles.brandingRow} pointerEvents="none">
                    <Image source={logoSource} style={styles.brandingLogo} resizeMode="contain" />
                    <Text style={styles.brandingLabel}>{appName}</Text>
                  </View>
                )}

                {/* Full controls overlay */}
                {showControls && (
                  <View style={styles.controlsOverlay} pointerEvents="box-none">
                    {/* Center: skip back, play/pause, skip forward */}
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

                    {/* Bottom bar: time + seekbar + mute */}
                    <View style={styles.bottomBar}>
                      <View style={[styles.bottomBarRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={styles.timeText}>{formatTime(positionMs)}</Text>
                        <View style={styles.sliderContainer}>
                          <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={durationMs || 1}
                            value={positionMs}
                            onSlidingStart={() => setIsSeeking(true)}
                            onSlidingComplete={handleSeek}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor="rgba(255,255,255,0.3)"
                            thumbTintColor="#fff"
                          />
                        </View>
                        <Text style={styles.timeText}>{formatTime(durationMs)}</Text>
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

              {/* Action Buttons */}
              <View style={styles.actionsSection}>
                <TouchableOpacity
                  onPress={handleDownload}
                  disabled={saving}
                  activeOpacity={0.7}
                  style={[styles.actionBtn, {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  }]}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <MaterialCommunityIcons name="download" size={20} color={colors.primary} />
                  )}
                  <Text style={[styles.btnText, { color: colors.text }]}>
                    {saving ? t('common.loading') : t('storyOfDay.saveVideoWithReciter')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShare}
                  disabled={sharing}
                  activeOpacity={0.7}
                  style={[styles.actionBtn, {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  }]}
                >
                  {sharing ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <MaterialCommunityIcons name="share-variant" size={20} color={colors.primary} />
                  )}
                  <Text style={[styles.btnText, { color: colors.text }]}>
                    {sharing ? t('storyOfDay.sharingInProgress') : t('common.share')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 300,
  },
  headerTitle: { fontSize: 18, fontFamily: fontBold() },
  errorText: { fontSize: 16, fontFamily: fontRegular(), textAlign: 'center' },

  // Reciter chips
  reciterScroll: { marginTop: 8, marginBottom: 10, maxHeight: 44 },
  reciterChips: { gap: 8, paddingHorizontal: 2 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontFamily: fontBold(), fontSize: 14 },

  // Video card
  videoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 9 / 16,
    width: '100%',
  },
  videoPlayer: { ...StyleSheet.absoluteFillObject },
  videoTextOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ayahText: {
    textAlign: 'center',
    color: '#fff',
    writingDirection: 'rtl',
    paddingHorizontal: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  divider: {
    width: 60,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 14,
    borderRadius: 1,
  },
  surahRef: {
    textAlign: 'center',
    fontFamily: fontBold(),
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Branding — pinned at very bottom of video
  brandingRow: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  brandingLogo: { width: 36, height: 36, borderRadius: 8 },
  brandingLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontFamily: fontBold(),
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Full controls overlay
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  playPauseBtn: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 8,
  },
  bottomBarRow: {
    alignItems: 'center',
    gap: 6,
  },
  sliderContainer: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 30,
  },
  timeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: fontRegular(),
    minWidth: 36,
    textAlign: 'center',
  },
  muteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Action buttons
  actionsSection: { gap: 10, marginTop: 14 },
  actionBtn: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { fontFamily: fontBold(), fontSize: 15 },
});
