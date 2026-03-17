import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  Dimensions,
} from 'react-native';
import { fontBold, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { getVerseQcfData } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily, isPageFontLoaded } from '@/lib/qcf-font-loader';

const DAILY_VIDEO_JSON_URL =
  'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/data/daily-video.json';

const { width: SCREEN_W } = Dimensions.get('window');

interface DailyVideoData {
  url: string;
  date: string;
  ayahText: string;
  surahName: string;
  surahEnglish: string;
  surahNumber: number;
  ayahNumber: number;
  globalAyahNumber: number;
  duration?: number;
  generatedAt: string;
}

export default function StoryOfDayScreen() {
  const isRTL = useIsRTL();
  const { settings } = useSettings();
  const colors = useColors();
  const isArabic = (settings.language || 'ar') === 'ar';

  const videoRef = useRef<Video>(null);
  const [data, setData] = useState<DailyVideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  // QCF font state
  const [qcfReady, setQcfReady] = useState(false);
  const [qcfPage, setQcfPage] = useState<number | null>(null);
  const [qcfGlyphs, setQcfGlyphs] = useState<string[]>([]);

  // Fetch daily video metadata
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(DAILY_VIDEO_JSON_URL);
        if (!res.ok) throw new Error('fetch failed');
        const json: DailyVideoData = await res.json();
        if (!cancelled && json.url) setData(json);
        else if (!cancelled) setError(true);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load QCF page font for the ayah
  useEffect(() => {
    if (!data?.surahNumber || !data?.ayahNumber) return;
    let cancelled = false;

    (async () => {
      try {
        const qcfData = getVerseQcfData(data.surahNumber, data.ayahNumber);
        if (!qcfData || cancelled) return;

        setQcfPage(qcfData.page);
        setQcfGlyphs(qcfData.glyphs);

        // darkMode=true for white text on dark blurred video
        if (!isPageFontLoaded(qcfData.page, true)) {
          await loadPageFont(qcfData.page, true);
        }
        if (!cancelled) setQcfReady(true);
      } catch {
        if (!cancelled) setQcfReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data?.surahNumber, data?.ayahNumber]);

  const handleDownload = useCallback(async () => {
    if (!data?.url) return;
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const localPath = `${FileSystem.cacheDirectory}today-video-${Date.now()}.mp4`;
      const download = await FileSystem.downloadAsync(data.url, localPath);
      if (!download?.uri) throw new Error('download failed');
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) return;
      await MediaLibrary.saveToLibraryAsync(download.uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }, [data]);

  const handleShare = useCallback(async () => {
    if (!data) return;
    setSharing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const localPath = `${FileSystem.cacheDirectory}share-video-${Date.now()}.mp4`;
      const download = await FileSystem.downloadAsync(data.url, localPath);

      if (download?.uri) {
        if (Platform.OS === 'ios') {
          const sl = isArabic ? data.surahName : data.surahEnglish;
          await Share.share({
            message: `${data.ayahText}\n\n${sl}\n\n${t('storyOfDay.shareText')}`,
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
    } catch {
      /* silent */
    } finally {
      setSharing(false);
    }
  }, [data, isArabic]);

  const surahLabel = data ? (isArabic ? data.surahName : data.surahEnglish) : '';

  // Use QCF Mushaf font when ready, otherwise fallback to KFGQPC
  const qcfFontFamily = qcfReady && qcfPage ? getPageFontFamily(qcfPage, true) : null;
  const ayahFontFamily = qcfFontFamily || 'KFGQPCUthmanic';
  const isQcf = !!qcfFontFamily;
  const ayahFontSize = isQcf ? 32 : 28;
  const ayahLineHeight = isQcf ? 64 : 56;

  return (
    <View style={styles.root}>
      {/* Full-screen video background */}
      {data?.url && (
        <Video
          ref={videoRef}
          source={{ uri: data.url }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted={false}
        />
      )}

      {/* Blur + dim overlay */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />

      {/* Content */}
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <UniversalHeader titleColor="#fff">
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {t('storyOfDay.title')}
            </Text>
            <SectionInfoButton sectionKey="stories" />
          </View>
        </UniversalHeader>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : error || !data?.url ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons
              name="video-off-outline"
              size={64}
              color="rgba(255,255,255,0.5)"
            />
            <Text style={styles.errorText}>{t('storyOfDay.loadError')}</Text>
          </View>
        ) : (
          <View style={styles.contentArea}>
            {/* Ayah — QCF Mushaf rendering centered */}
            <View style={styles.ayahContainer}>
              <Text
                style={[
                  styles.ayahText,
                  {
                    fontFamily: ayahFontFamily,
                    fontSize: ayahFontSize,
                    lineHeight: ayahLineHeight,
                  },
                ]}
                allowFontScaling={false}
              >
                {isQcf ? qcfGlyphs.join('') : data.ayahText}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.surahRef}>
                {surahLabel} - {data.ayahNumber}
              </Text>

              <Text style={styles.hintText}>اضغط مطولاً للمزيد</Text>
            </View>

            {/* Bottom: branding + buttons */}
            <View style={styles.bottomSection}>
              <View style={styles.brandingRow}>
                <Text style={styles.brandingEmoji}>🤲</Text>
                <Text style={styles.brandingLabel}>روح المسلم</Text>
              </View>

              <View style={styles.bottomActions}>
                <TouchableOpacity
                  onPress={handleDownload}
                  disabled={saving}
                  activeOpacity={0.7}
                  style={styles.actionBtn}
                >
                  <BlurView
                    intensity={Platform.OS === 'ios' ? 50 : 30}
                    tint="dark"
                    style={[
                      styles.glassBtnInner,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <MaterialCommunityIcons name="download" size={20} color="#fff" />
                    )}
                    <Text style={styles.btnText}>
                      {saving ? t('common.loading') : t('storyOfDay.saveVideoWithReciter')}
                    </Text>
                  </BlurView>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShare}
                  disabled={sharing}
                  activeOpacity={0.7}
                  style={styles.actionBtn}
                >
                  <BlurView
                    intensity={Platform.OS === 'ios' ? 50 : 30}
                    tint="dark"
                    style={[
                      styles.glassBtnInner,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    {sharing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                    )}
                    <Text style={styles.btnText}>
                      {sharing ? t('storyOfDay.sharingInProgress') : t('common.share')}
                    </Text>
                  </BlurView>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#fff',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  ayahContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
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
    marginVertical: 16,
    borderRadius: 1,
  },
  surahRef: {
    textAlign: 'center',
    fontFamily: fontBold(),
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    writingDirection: 'rtl',
  },
  hintText: {
    textAlign: 'center',
    fontFamily: fontRegular(),
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fontRegular(),
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
  },
  bottomSection: {
    paddingBottom: 12,
    gap: 16,
  },
  brandingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  brandingEmoji: {
    fontSize: 28,
  },
  brandingLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: fontBold(),
    textAlign: 'center',
  },
  bottomActions: {
    gap: 10,
  },
  actionBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  glassBtnInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnText: {
    color: '#fff',
    fontFamily: fontBold(),
    fontSize: 15,
  },
});
