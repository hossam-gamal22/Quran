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
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
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
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';

const DAILY_VIDEO_JSON_URL =
  'https://raw.githubusercontent.com/hossam-gamal22/Quran/main/data/daily-video.json';

interface DailyVideoData {
  url: string;
  date: string;
  ayahText: string;
  surahName: string;
  surahEnglish: string;
  surahNumber: number;
  ayahNumber: number;
  globalAyahNumber: number;
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

  // Fetch the daily video metadata on mount
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
    return () => { cancelled = true; };
  }, []);

  // Download video to camera roll
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
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }, [data]);

  // Share video
  const handleShare = useCallback(async () => {
    if (!data) return;
    setSharing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Download first, then share the file for best UX
      const localPath = `${FileSystem.cacheDirectory}share-video-${Date.now()}.mp4`;
      const download = await FileSystem.downloadAsync(data.url, localPath);

      if (download?.uri) {
        if (Platform.OS === 'ios') {
          const surahLabel = isArabic ? data.surahName : data.surahEnglish;
          await Share.share({
            message: `${data.ayahText}\n\n${surahLabel}\n\n${t('storyOfDay.shareText')}`,
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
    } catch { /* silent */ } finally {
      setSharing(false);
    }
  }, [data, isArabic]);

  const surahLabel = data
    ? isArabic ? data.surahName : data.surahEnglish
    : '';

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <UniversalHeader titleColor={colors.text}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>
              {t('storyOfDay.title')}
            </Text>
            <SectionInfoButton sectionKey="stories" />
          </View>
        </UniversalHeader>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2f7659" />
          </View>
        ) : error || !data?.url ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="video-off-outline" size={64} color={colors.muted} />
            <Text style={[styles.errorText, { color: colors.muted }]}>
              {t('storyOfDay.loadError')}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Video Player */}
            <View style={styles.videoCard}>
              <Video
                ref={videoRef}
                source={{ uri: data.url }}
                style={styles.video}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                useNativeControls
              />
            </View>

            {/* Ayah Text */}
            <View style={styles.ayahCard}>
              <Text style={[styles.ayahText, { color: colors.text }]}>
                {data.ayahText}
              </Text>
              <Text style={[styles.surahLabel, { color: colors.muted }]}>
                {surahLabel} {data.ayahNumber ? `﴿${data.ayahNumber}﴾` : ''}
              </Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity onPress={handleDownload} disabled={saving} activeOpacity={0.8}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                style={[styles.glassBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="download" size={20} color="#fff" />
                )}
                <Text style={styles.btnText}>
                  {saving ? t('common.loading') : t('storyOfDay.saveVideoWithReciter')}
                </Text>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleShare} disabled={sharing} activeOpacity={0.8}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 60 : 40}
                tint="dark"
                style={[styles.glassBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                {sharing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                )}
                <Text style={styles.btnText}>
                  {sharing ? t('storyOfDay.sharingInProgress') : t('common.share')}
                </Text>
              </BlurView>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { padding: 16, paddingBottom: 120 },

  videoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },

  ayahCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  ayahText: {
    fontSize: 20,
    lineHeight: 38,
    textAlign: 'center',
    fontFamily: fontSemiBold(),
    writingDirection: 'rtl',
    direction: 'rtl',
  },
  surahLabel: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: fontRegular(),
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fontRegular(),
    textAlign: 'center',
  },

  glassBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  btnText: {
    color: '#fff',
    fontFamily: fontBold(),
    fontSize: 16,
  },
});
