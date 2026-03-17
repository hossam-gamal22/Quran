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
} from 'react-native';
import { fontBold, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

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

export default function StoryOfDayScreen() {
  const isRTL = useIsRTL();
  const { settings } = useSettings();
  const colors = useColors();
  const { isPremium } = useSubscription();
  const { appName, logoSource } = useAppIdentity();
  const isArabic = (settings.language || 'ar') === 'ar';

  const videoRef = useRef<Video>(null);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [selectedReciterIdx, setSelectedReciterIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [qcfReady, setQcfReady] = useState(false);
  const [qcfPage, setQcfPage] = useState<number | null>(null);
  const [qcfGlyphs, setQcfGlyphs] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(DAILY_VIDEO_JSON_URL);
        if (!res.ok) throw new Error('fetch failed');
        const json: RollingData = await res.json();
        const dates = Object.keys(json).sort().reverse();
        const latest = dates[0];
        if (!cancelled && latest && json[latest]?.videos?.length) {
          setDayData(json[latest]);
        } else if (!cancelled) {
          setError(true);
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
      if (!perm.granted) return;
      await MediaLibrary.saveToLibraryAsync(download.uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // silent
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
              <View style={styles.videoCard}>
                <Video
                  ref={videoRef}
                  source={{ uri: currentVideo.url }}
                  style={styles.videoPlayer}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  isMuted={false}
                />
                <View style={styles.videoOverlay} />
                <View style={styles.videoTextOverlay}>
                  <Text
                    style={[styles.ayahText, { fontFamily: ayahFontFamily, fontSize: ayahFontSize, lineHeight: ayahLineHeight }]}
                    allowFontScaling={false}
                  >
                    {isQcf ? qcfGlyphs.join('') : dayData.ayahText}
                  </Text>
                  <View style={styles.divider} />
                  <Text style={styles.surahRef}>
                    {surahLabel} - {dayData.ayahNumber}
                  </Text>
                  {!isPremium && (
                    <View style={styles.brandingRow}>
                      <Image source={logoSource} style={styles.brandingLogo} resizeMode="contain" />
                      <Text style={styles.brandingLabel}>{appName}</Text>
                    </View>
                  )}
                </View>
              </View>

              {dayData.videos.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.reciterChips, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  style={styles.reciterScroll}
                >
                  {dayData.videos.map((v, idx) => {
                    const active = idx === selectedReciterIdx;
                    return (
                      <TouchableOpacity
                        key={v.reciterId}
                        onPress={() => {
                          setSelectedReciterIdx(idx);
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

              <View style={styles.actionsSection}>
                <TouchableOpacity
                  onPress={handleDownload}
                  disabled={saving}
                  activeOpacity={0.7}
                  style={[styles.actionBtn, {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  }]}
                >
                  <View style={[styles.actionBtnInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {saving ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <MaterialCommunityIcons name="download" size={20} color={colors.primary} />
                    )}
                    <Text style={[styles.btnText, { color: colors.text }]}>
                      {saving ? t('common.loading') : t('storyOfDay.saveVideoWithReciter')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShare}
                  disabled={sharing}
                  activeOpacity={0.7}
                  style={[styles.actionBtn, {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  }]}
                >
                  <View style={[styles.actionBtnInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {sharing ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <MaterialCommunityIcons name="share-variant" size={20} color={colors.primary} />
                    )}
                    <Text style={[styles.btnText, { color: colors.text }]}>
                      {sharing ? t('storyOfDay.sharingInProgress') : t('common.share')}
                    </Text>
                  </View>
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
  videoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 9 / 16,
    width: '100%',
    marginTop: 8,
  },
  videoPlayer: { ...StyleSheet.absoluteFillObject },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
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
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  brandingLogo: { width: 28, height: 28, borderRadius: 6 },
  brandingLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontFamily: fontBold(),
  },
  reciterScroll: { marginTop: 14, maxHeight: 44 },
  reciterChips: { gap: 8, paddingHorizontal: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontFamily: fontBold(), fontSize: 13 },
  actionsSection: { gap: 10, marginTop: 16 },
  actionBtn: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  actionBtnInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { fontFamily: fontBold(), fontSize: 15 },
});
