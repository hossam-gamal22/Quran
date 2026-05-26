import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import Slider from '@react-native-community/slider';
import { useLocalSearchParams } from 'expo-router';

import { BannerAdComponent } from '@/components/ads/BannerAd';
import { InlineMrecAd } from '@/components/ads/InlineMrecAd';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { ContentLanguageNotice } from '@/components/ui/ContentLanguageNotice';
import { PdfShareButton, PdfShareErrorModal } from '@/components/ui/PdfShareControls';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/SettingsContext';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useAudioSeekPreview } from '@/hooks/use-audio-seek-preview';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { getLanguage } from '@/lib/i18n';
import { formatAudioTime } from '@/lib/audio-time';
import { CMSReligiousStory, useReligiousStoriesContentStatus } from '@/lib/content-api';
import { findReligiousStoryEnglishFields } from '@/data/religious-story-english';
import { findCompleteReligiousStory, getStorySources, preferLongerText } from '@/data/religious-story-complete';
import { expandProphetEnglishTranscript, expandProphetTranscript } from '@/data/full-story-texts';
import { isFavorited, toggleFavorite } from '@/lib/favorites-manager';
import { SourcesList } from '@/components/ui/SourcesList';
import { prepareStoryAudio, isStoryAudioCached, downloadStoryAudio } from '@/lib/story-audio-cache';
import { shareIslamicPdf } from '@/lib/pdf/shareIslamicPdf';
import type { IslamicPdfSection } from '@/lib/pdf/islamicPdfTemplate';
import { StoryInteractionBar } from '@/components/social/StoryInteractionBar';

const ACCENT = '#0d8e62';
const ACCENT_LIGHT = 'rgba(6,79,47,0.16)';
const SCREEN_KEY = 'religious_stories';
const AUDIO_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function copy() {
  const lang = getLanguage();
  return lang === 'ar'
    ? {
        title: 'قصص دينية',
        subtitle: 'قصص إيمانية للاستماع والقراءة',
        emptyTitle: 'لا توجد قصص متاحة الآن',
        emptyBody: 'سيتم إضافة قصص جديدة قريبًا.',
        audioArabicOnly: '',
        limitedLanguages: '',
        loadingAudioTitle: 'جاري تحميل الصوت',
        loadingAudioBody: 'انتظر لحظات، سيتم تشغيل القصة تلقائيًا.',
        noInternetTitle: 'لا يوجد اتصال بالإنترنت',
        noInternetBody: 'الصوت غير محمل على الجهاز. اتصل بالإنترنت للتشغيل أو حمّله مسبقًا للاستماع أوفلاين.',
        audioErrorTitle: 'تعذر تشغيل الصوت',
        audioErrorBody: 'استغرق تحميل الصوت وقتًا طويلًا. تحقق من الاتصال ثم حاول مرة أخرى.',
        updatingStoriesTitle: 'جاري تحديث القصص',
        updatingStoriesBody: 'نجهز لك أحدث نسخة من القصص.',
        retry: 'حاول مرة أخرى',
        close: 'إغلاق',
        download: 'تحميل',
        downloading: 'جاري التحميل',
        downloaded: 'محمل',
        downloadFailed: 'تعذر تحميل الصوت. تحقق من الاتصال ثم حاول مرة أخرى.',
        listen: 'استمع للقصة',
        storyText: 'نص القصة',
        audio: 'الصوت',
        sharePdf: 'مشاركة PDF',
        pdfErrorTitle: 'تعذرت مشاركة القصة',
        pdfErrorBody: 'حاول مرة أخرى بعد لحظات.',
        searchPlaceholder: 'ابحث باسم القصة...',
        noSearchResults: 'لا توجد نتائج مطابقة.',
      }
    : {
        title: 'Religious Stories',
        subtitle: 'Faith stories for listening and reading',
        emptyTitle: 'No stories available yet',
        emptyBody: 'New stories will be added soon.',
        audioArabicOnly: 'Audio is available in Arabic only. The full story text is available in English below.',
        limitedLanguages:
          'Religious stories are currently available only in Arabic and English. Audio is available in Arabic only.',
        loadingAudioTitle: 'Loading audio',
        loadingAudioBody: 'Please wait. The story will start automatically.',
        noInternetTitle: 'No internet connection',
        noInternetBody: 'This audio is not downloaded on this device. Connect to play it, or download it first for offline listening.',
        audioErrorTitle: 'Audio could not be played',
        audioErrorBody: 'Audio loading took too long. Check your connection and try again.',
        updatingStoriesTitle: 'Updating stories',
        updatingStoriesBody: 'Preparing the latest stories version for you.',
        retry: 'Try again',
        close: 'Close',
        download: 'Download',
        downloading: 'Downloading',
        downloaded: 'Downloaded',
        downloadFailed: 'Audio could not be downloaded. Check your connection and try again.',
        listen: 'Listen to the story',
        storyText: 'Story text',
        audio: 'Audio',
        sharePdf: 'Share PDF',
        pdfErrorTitle: 'Story could not be shared',
        pdfErrorBody: 'Please try again in a moment.',
        searchPlaceholder: 'Search stories...',
        noSearchResults: 'No matching stories.',
      };
}

function normalizeSearchText(value?: string) {
  return (value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .trim();
}

function storySearchText(story: CMSReligiousStory) {
  return normalizeSearchText([
    story.title,
    story.titleEn,
    story.brief,
    story.briefEn,
    story.audioTitle,
  ].filter(Boolean).join(' '));
}

function getStoryLanguage() {
  return getLanguage() === 'ar' ? 'ar' : 'en';
}

function shouldShowLimitedLanguageNotice() {
  const lang = getLanguage();
  return lang !== 'ar' && lang !== 'en';
}

function getStoryEnglishFields(story: CMSReligiousStory) {
  return findReligiousStoryEnglishFields(story);
}

function getCompleteStoryFields(story: CMSReligiousStory) {
  return findCompleteReligiousStory(story);
}

function getTitle(story: CMSReligiousStory) {
  if (getStoryLanguage() === 'ar') return story.title;
  return story.titleEn?.trim() || getStoryEnglishFields(story)?.titleEn || story.title;
}

function getStoryAudioDisplayTitle(story: CMSReligiousStory) {
  return getTitle(story);
}

function getBrief(story: CMSReligiousStory) {
  const complete = getCompleteStoryFields(story);
  if (getStoryLanguage() === 'ar') return complete?.brief || story.brief?.trim();
  return complete?.briefEn || story.briefEn?.trim() || getStoryEnglishFields(story)?.briefEn || '';
}

function getTranscript(story: CMSReligiousStory) {
  const complete = getCompleteStoryFields(story);
  if (getStoryLanguage() === 'ar') {
    const base = story.transcript || '';
    const expanded = story.id?.startsWith('prophet-') ? expandProphetTranscript(story.id, base) : base;
    return preferLongerText(expanded, complete?.transcript || '');
  }
  const base = story.transcriptEn || getStoryEnglishFields(story)?.transcriptEn || '';
  const expanded = story.id?.startsWith('prophet-') ? expandProphetEnglishTranscript(story.id, base) : base;
  return preferLongerText(expanded, complete?.transcriptEn || '');
}

function splitPdfStoryParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean);
}

const RELIGIOUS_STORY_PDF_CHARS_PER_LINE = 50;
const RELIGIOUS_STORY_PDF_PAGE_LINES = 15;

function estimateReligiousStoryPdfLines(paragraph: string): number {
  return Math.max(1, Math.ceil(Array.from(paragraph).length / RELIGIOUS_STORY_PDF_CHARS_PER_LINE));
}

function splitReligiousStoryPdfParagraph(paragraph: string, maxLines = RELIGIOUS_STORY_PDF_PAGE_LINES): string[] {
  const maxChars = RELIGIOUS_STORY_PDF_CHARS_PER_LINE * maxLines;
  if (Array.from(paragraph).length <= maxChars) return [paragraph];

  const parts: string[] = [];
  let remaining = paragraph.trim();
  while (Array.from(remaining).length > maxChars) {
    const chars = Array.from(remaining);
    const windowText = chars.slice(0, maxChars).join('');
    const punctuationCut = Math.max(
      windowText.lastIndexOf('،'),
      windowText.lastIndexOf('؛'),
      windowText.lastIndexOf('.'),
      windowText.lastIndexOf('؟'),
      windowText.lastIndexOf('!'),
    );
    const spaceCut = windowText.lastIndexOf(' ');
    const cutIndex = punctuationCut > maxChars * 0.55
      ? punctuationCut + 1
      : Math.max(spaceCut, Math.floor(maxChars * 0.75));
    parts.push(chars.slice(0, cutIndex).join('').trim());
    remaining = chars.slice(cutIndex).join('').trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

function buildReligiousStoryPdfSections(transcript: string, storyTitle: string): IslamicPdfSection[] {
  const paragraphs = splitPdfStoryParagraphs(transcript);
  const sections: IslamicPdfSection[] = [];
  let currentBody: string[] = [];
  let currentLines = 0;

  const flush = () => {
    if (!currentBody.length) return;
    sections.push({
      title: sections.length === 0 ? storyTitle : undefined,
      body: currentBody,
      continuation: sections.length > 0,
      keepTogether: true,
      largeText: true,
    });
    currentBody = [];
    currentLines = 0;
  };

  const pushParagraph = (paragraph: string) => {
    let remaining = paragraph.trim();
    while (remaining) {
      const availableLines = RELIGIOUS_STORY_PDF_PAGE_LINES - currentLines;

      if (availableLines <= 0) {
        flush();
        continue;
      }

      const remainingLines = estimateReligiousStoryPdfLines(remaining);
      if (remainingLines <= availableLines) {
        currentBody.push(remaining);
        currentLines += remainingLines;
        remaining = '';
        continue;
      }

      if (currentBody.length && availableLines >= 1) {
        const [head, ...tail] = splitReligiousStoryPdfParagraph(remaining, availableLines);
        if (head) {
          currentBody.push(head);
          currentLines += estimateReligiousStoryPdfLines(head);
          remaining = tail.join(' ').trim();
          flush();
          continue;
        }
      }

      if (currentBody.length) {
        flush();
        continue;
      }

      const [head, ...tail] = splitReligiousStoryPdfParagraph(remaining);
      if (!head) break;
      currentBody.push(head);
      currentLines += estimateReligiousStoryPdfLines(head);
      remaining = tail.join(' ').trim();
      flush();
    }
  };

  paragraphs.forEach(pushParagraph);

  flush();
  return sections.length ? sections : [{ title: storyTitle, body: transcript, keepTogether: true, largeText: true }];
}

function LanguageNotice({ colors }: { colors: ReturnType<typeof useColors> }) {
  const isRTL = useIsRTL();
  const s = useScaledStyles(_s, colors.fs);
  const labels = copy();

  if (shouldShowLimitedLanguageNotice()) {
    return <ContentLanguageNotice style={{ marginHorizontal: 0 }} />;
  }

  const text = labels.audioArabicOnly;
  if (!text) return null;

  return (
    <View style={[s.languageNotice, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <MaterialCommunityIcons name="volume-high" size={18} color={colors.text} />
      <Text style={[s.noticeText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
        {text}
      </Text>
    </View>
  );
}

function AudioStatusModal({
  visible,
  mode,
  colors,
  onRetry,
  onClose,
  titleOverride,
  bodyOverride,
  iconOverride,
}: {
  visible: boolean;
  mode: 'loading' | 'offline' | 'error';
  colors: ReturnType<typeof useColors>;
  onRetry: () => void;
  onClose: () => void;
  titleOverride?: string;
  bodyOverride?: string;
  iconOverride?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}) {
  const labels = copy();
  const s = useScaledStyles(_s, colors.fs);
  const isRTL = useIsRTL();
  const isLoading = mode === 'loading';
  const title = titleOverride || (isLoading ? labels.loadingAudioTitle : mode === 'offline' ? labels.noInternetTitle : labels.audioErrorTitle);
  const body = bodyOverride || (isLoading ? labels.loadingAudioBody : mode === 'offline' ? labels.noInternetBody : labels.audioErrorBody);
  const icon = iconOverride || (isLoading ? 'headphones' : mode === 'offline' ? 'wifi-off' : 'alert-circle-outline');
  const tint = mode === 'offline' ? '#f59e0b' : mode === 'error' ? '#ef4444' : ACCENT;
  const cardBg = colors.isDarkMode ? 'rgba(15,26,20,0.92)' : 'rgba(255,255,255,0.94)';
  const iconBg = colors.isDarkMode ? 'rgba(6,79,47,0.16)' : 'rgba(6,79,47,0.12)';

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View
          style={[
            s.modalCard,
            {
              backgroundColor: cardBg,
              borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <View style={[s.modalIconCircle, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={icon} size={42} color={tint} />
          </View>
          {isLoading && <ActivityIndicator size="large" color={tint} style={s.modalSpinner} />}
          <Text style={[s.modalTitle, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
          <Text style={[s.modalBody, { color: colors.textLight, textAlign: 'center' }]}>{body}</Text>
          {isLoading ? (
            <Pressable
              onPress={onClose}
              style={[s.modalButton, s.modalButtonSecondary, { borderColor: colors.textLight, marginTop: 18, alignSelf: 'stretch' }]}
            >
              <Text style={[s.modalButtonText, { color: colors.text }]}>{labels.close}</Text>
            </Pressable>
          ) : (
            <View style={[s.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 18 }]}>
              <Pressable onPress={onClose} style={[s.modalButton, s.modalButtonSecondary, { borderColor: colors.textLight }]}>
                <Text style={[s.modalButtonText, { color: colors.text }]}>{labels.close}</Text>
              </Pressable>
              <Pressable onPress={onRetry} style={[s.modalButton, s.modalButtonPrimary]}>
                <Text style={[s.modalButtonText, { color: '#fff' }]}>{labels.retry}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function StoriesUpdateModal({
  visible,
  colors,
}: {
  visible: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const labels = copy();
  const s = useScaledStyles(_s, colors.fs);
  const cardBg = colors.isDarkMode ? 'rgba(15,26,20,0.92)' : 'rgba(255,255,255,0.94)';
  const iconBg = colors.isDarkMode ? 'rgba(6,79,47,0.16)' : 'rgba(6,79,47,0.12)';

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={s.modalOverlay}>
        <View
          style={[
            s.modalCard,
            {
              backgroundColor: cardBg,
              borderColor: colors.isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          <View style={[s.modalIconCircle, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name="book-sync" size={42} color={ACCENT} />
          </View>
          <ActivityIndicator size="large" color={ACCENT} style={s.modalSpinner} />
          <Text style={[s.modalTitle, { color: colors.text, textAlign: 'center' }]}>{labels.updatingStoriesTitle}</Text>
          <Text style={[s.modalBody, { color: colors.textLight, textAlign: 'center', marginBottom: 0 }]}>{labels.updatingStoriesBody}</Text>
        </View>
      </View>
    </Modal>
  );
}

function StoryCard({
  story,
  index,
  onPress,
  isDarkMode,
  colors,
}: {
  story: CMSReligiousStory;
  index: number;
  onPress: () => void;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const isRTL = useIsRTL();
  const s = useScaledStyles(_s, colors.fs);
  const brief = getBrief(story);

  return (
    <Pressable onPress={onPress} style={s.cardOuter}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 24 : 10}
        tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
        style={StyleSheet.absoluteFill}
      />
      <View style={[s.cardOverlay, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.70)' }]} />
      <View style={[s.cardContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={s.storyNumberBadge}>
          <Text style={s.storyNumberText}>{index + 1}</Text>
        </View>
        <View style={s.cardText}>
          <Text style={[s.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {getTitle(story)}
          </Text>
          {!!brief && (
            <Text style={[s.cardBrief, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {brief}
            </Text>
          )}
        </View>
        <MaterialCommunityIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={24} color={colors.textLight} />
      </View>
    </Pressable>
  );
}

function StoryListening({
  story,
  onBack,
  isDarkMode,
  colors,
}: {
  story: CMSReligiousStory;
  onBack: () => void;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const isRTL = useIsRTL();
  const s = useScaledStyles(_s, colors.fs);
  const labels = copy();
  const {
    state: globalAudioState,
    playAzkarQueue,
    togglePlayPause: toggleGlobalAudio,
    seekTo: seekGlobalAudio,
    playbackSpeed,
    setPlaybackSpeed,
  } = useGlobalAudio();
  const transcript = useMemo(() => getTranscript(story), [story]);
  const hasTranscript = transcript.length > 0;
  const finishAdShownRef = useRef(false);
  const prePlayAdShownRef = useRef(false);
  const prePlayAdDisplayedRef = useRef(false);
  const [networkState, setNetworkState] = useState<'checking' | 'online' | 'offline'>('checking');
  const [audioResolveState, setAudioResolveState] = useState<'idle' | 'resolving' | 'ready' | 'error'>('idle');
  const [audioAttempted, setAudioAttempted] = useState(false);
  const [audioStartError, setAudioStartError] = useState(false);
  const [audioModalDismissed, setAudioModalDismissed] = useState(false);
  const [pdfErrorVisible, setPdfErrorVisible] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [audioDownloadState, setAudioDownloadState] = useState<'idle' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [audioDownloadError, setAudioDownloadError] = useState<string | null>(null);
  const favoriteId = useMemo(() => `story_${story.id}`, [story.id]);
  const trackId = useMemo(() => `religious-story-${story.id}`, [story.id]);

  useEffect(() => {
    isFavorited(favoriteId, 'story').then(setIsFav);
  }, [favoriteId]);

  const handleToggleFav = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowSaved = await toggleFavorite({
      id: favoriteId,
      type: 'story',
      title: getTitle(story),
      subtitle: getBrief(story) || undefined,
      arabic: transcript.split(/\n{2,}/)[0]?.trim() || getTitle(story),
      route: `/religious-stories?id=${encodeURIComponent(story.id)}`,
    });
    setIsFav(nowSaved);
  }, [favoriteId, story, transcript]);
  const isThisStoryAudio = globalAudioState.source === 'azkar' && globalAudioState.currentTrackId === trackId;
  const isPlaying = isThisStoryAudio && globalAudioState.isPlaying;
  const currentPosition = isThisStoryAudio ? globalAudioState.position : 0;
  const duration = isThisStoryAudio ? globalAudioState.duration : 0;
  // Spinner on the play button covers both URL resolution AND expo-av buffering,
  // so the user gets visible feedback even after they dismiss the loading modal.
  const isResolvingAudio = audioResolveState === 'resolving'
    || (isThisStoryAudio && globalAudioState.isLoading && !isPlaying && currentPosition === 0);
  const canSeekAudio = isThisStoryAudio && duration > 0 && !isResolvingAudio;
  const {
    displayPosition,
    sliderPosition,
    handleSeekStart,
    handleSeekChange,
    handleSeekComplete,
  } = useAudioSeekPreview({
    currentPosition,
    duration,
    canSeek: canSeekAudio,
    isCurrentTrack: isThisStoryAudio,
    resetKey: trackId,
    seekTo: seekGlobalAudio,
  });
  const formattedPosition = formatAudioTime(displayPosition);
  const formattedDuration = formatAudioTime(duration);

  const checkConnection = useCallback(async () => {
    setAudioModalDismissed(false);
    setNetworkState('checking');
    const net = await NetInfo.fetch().catch(() => null);
    const offline = !net || net.isConnected === false || net.isInternetReachable === false;
    setNetworkState(offline ? 'offline' : 'online');
  }, []);

  useEffect(() => {
    checkConnection();
    const unsubscribe = NetInfo.addEventListener((net) => {
      const offline = net.isConnected === false || net.isInternetReachable === false;
      setNetworkState(offline ? 'offline' : 'online');
      if (!offline) setAudioModalDismissed(false);
    });
    return () => unsubscribe();
  }, [checkConnection]);

  useEffect(() => {
    finishAdShownRef.current = false;
    prePlayAdShownRef.current = false;
    prePlayAdDisplayedRef.current = false;
    setAudioResolveState('idle');
    setAudioAttempted(false);
    setAudioStartError(false);
    setAudioModalDismissed(false);
    setAudioDownloadState('idle');
    setAudioDownloadError(null);
    if (story.audioUrl) {
      isStoryAudioCached(story.id, story.audioUrl)
        .then((cached) => {
          setAudioDownloadState(cached ? 'downloaded' : 'idle');
        })
        .catch(() => {});
    }
  }, [story.id, story.audioUrl]);

  const handleTrackComplete = useCallback(() => {
    if (finishAdShownRef.current) return;
    if (prePlayAdDisplayedRef.current) return;
    finishAdShownRef.current = true;
    showInterstitial({
      allowInSacredContext: false,
      ignoreSmartFrequencyCaps: true,
      ignoreSmartSessionDelay: true,
      ignoreGlobalCooldown: true,
      timeoutMs: 5000,
    }).catch(() => {});
  }, []);

  const resolveAudioForPlayback = useCallback(async () => {
    if (!story.audioUrl) throw new Error('missing-audio-url');
    setAudioResolveState('resolving');
    const prepared = await prepareStoryAudio(story.id, story.audioUrl);
    setAudioResolveState('ready');
    if (prepared.isLocal) {
      setAudioDownloadState('downloaded');
    }
    return prepared;
  }, [story.audioUrl, story.id]);

  const hasAudioError = audioAttempted && (audioResolveState === 'error' || audioStartError || (isThisStoryAudio && !!globalAudioState.error));
  // Keep the loading modal up while the URL is being resolved AND while expo-av
  // is still buffering. Without the second clause, the modal would flash off as
  // soon as we hand the URL to the player, leaving the user staring at a 0:00
  // play button with no feedback during the actual buffer wait.
  const audioStillBuffering = isThisStoryAudio && globalAudioState.isLoading && !isPlaying && currentPosition === 0;
  const isAudioPreparing = audioAttempted && (networkState === 'checking' || audioResolveState === 'resolving' || audioStillBuffering);
  const audioModalMode = networkState === 'offline' ? 'offline' : hasAudioError ? 'error' : 'loading';
  const showAudioModal = !audioModalDismissed && audioAttempted && (isAudioPreparing || networkState === 'offline' || hasAudioError);

  useEffect(() => {
    if (!audioAttempted) return;
    // Auto-dismiss only when audio actually starts playing — never on a timer,
    // so the user is never told "loading" after playback has actually begun
    // and never told "ready" before it has.
    if (isPlaying || currentPosition > 0 || duration > 0) {
      setAudioModalDismissed(true);
    }
  }, [audioAttempted, currentPosition, duration, isPlaying]);

  const handlePlayPress = useCallback(async () => {
    setAudioAttempted(true);
    setAudioModalDismissed(false);
    setAudioStartError(false);

    const hasStartedCurrentAudio = isThisStoryAudio && (isPlaying || currentPosition > 0 || duration > 0);

    // Cache check first — if the file is already on disk, we can play offline.
    const cachedLocally = await isStoryAudioCached(story.id, story.audioUrl || '');
    if (cachedLocally) {
      setAudioDownloadState('downloaded');
    }

    // Only block on the network check when we actually need to stream.
    if (!cachedLocally && !hasStartedCurrentAudio) {
      const net = await NetInfo.fetch().catch(() => null);
      const offline = !net || net.isConnected === false || net.isInternetReachable === false;
      setNetworkState(offline ? 'offline' : 'online');
      if (offline) return;
    } else {
      setNetworkState('online');
    }

    if (hasStartedCurrentAudio && !globalAudioState.isLoading) {
      await toggleGlobalAudio();
      return;
    }

    try {
      if (!prePlayAdShownRef.current && !hasStartedCurrentAudio) {
        prePlayAdShownRef.current = true;
        const didShowPrePlayAd = await showInterstitial({
          allowInSacredContext: false,
          ignoreSmartFrequencyCaps: true,
          ignoreSmartSessionDelay: true,
          ignoreGlobalCooldown: true,
          timeoutMs: 5000,
        }).catch(() => {});
        prePlayAdDisplayedRef.current = didShowPrePlayAd === true;
      }

      const prepared = await resolveAudioForPlayback();

      // Do NOT dismiss the modal here — keep it visible through expo-av's
      // buffer wait. The auto-dismiss effect closes it the moment playback
      // actually starts (isPlaying or position > 0).
      await playAzkarQueue(
        [{
          id: trackId,
          title: getStoryAudioDisplayTitle(story),
          subtitle: labels.audio,
          url: prepared.uri,
          forceExpoAv: true,
        }],
        0,
        '/religious-stories',
        { onTrackComplete: handleTrackComplete },
      );
    } catch (audioError) {
      setAudioModalDismissed(false);
      setAudioResolveState('error');
      setAudioStartError(true);
      console.log('Religious story audio playback failed', audioError);
    }
  }, [
    globalAudioState.isLoading,
    handleTrackComplete,
    currentPosition,
    duration,
    isPlaying,
    isThisStoryAudio,
    labels.audio,
    playAzkarQueue,
    resolveAudioForPlayback,
    story,
    toggleGlobalAudio,
    trackId,
  ]);

  const handleDownloadAudio = useCallback(async () => {
    if (!story.audioUrl || audioDownloadState === 'downloading') return;

    setAudioDownloadError(null);

    const cachedLocally = await isStoryAudioCached(story.id, story.audioUrl);
    if (cachedLocally) {
      setAudioDownloadState('downloaded');
      return;
    }

    const net = await NetInfo.fetch().catch(() => null);
    const offline = !net || net.isConnected === false || net.isInternetReachable === false;
    setNetworkState(offline ? 'offline' : 'online');
    if (offline) {
      setAudioAttempted(true);
      setAudioModalDismissed(false);
      return;
    }

    setAudioDownloadState('downloading');
    const didShowPreDownloadAd = await showInterstitial({
      force: true,
      allowInSacredContext: true,
      ignoreSmartFrequencyCaps: true,
      ignoreSmartSessionDelay: true,
      ignoreGlobalCooldown: true,
      timeoutMs: 12000,
    }).catch(() => false);

    try {
      setAudioDownloadState('downloading');
      await downloadStoryAudio(story.id, story.audioUrl);
      setAudioDownloadState('downloaded');
      if (didShowPreDownloadAd !== true) {
        showInterstitial({
          force: true,
          allowInSacredContext: true,
          ignoreSmartFrequencyCaps: true,
          ignoreSmartSessionDelay: true,
          ignoreGlobalCooldown: true,
          timeoutMs: 12000,
        }).catch(() => {});
      }
    } catch (downloadError) {
      setAudioDownloadState('error');
      setAudioDownloadError(labels.downloadFailed);
      console.log('Religious story audio download failed', downloadError);
    }
  }, [audioDownloadState, labels.downloadFailed, story.audioUrl, story.id]);

  const handleSharePdf = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const title = getTitle(story);
      const storySections = buildReligiousStoryPdfSections(transcript, labels.storyText);
      await shareIslamicPdf({
        title,
        subtitle: labels.title,
        shortDescription: getBrief(story),
        category: labels.title,
        footerTitle: 'رُوح المسلم',
        sections: storySections,
      });
    } catch (pdfError) {
      setPdfErrorVisible(true);
      console.log('Religious story PDF sharing failed', pdfError);
    }
  }, [labels.storyText, labels.title, story, transcript]);

  return (
    <View style={s.container}>
      <UniversalHeader
        onBack={onBack}
        backStyle={{ backgroundColor: 'rgba(109, 93, 252, 0.16)', borderRadius: 14 }}
        rightActions={[{
          icon: isFav ? 'heart' : 'heart-outline',
          onPress: handleToggleFav,
          color: isFav ? '#ef4444' : colors.text,
          size: 22,
          style: { backgroundColor: 'rgba(109, 93, 252, 0.16)' },
        }]}
      >
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={2}>
          {getTitle(story)}
        </Text>
      </UniversalHeader>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <LanguageNotice colors={colors} />

        {/* Audio panel is hidden until an admin attaches a recording. */}
        {!!story.audioUrl && <View style={s.audioPanel}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 24 : 10}
            tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
            style={StyleSheet.absoluteFill}
          />
          <View style={[s.panelOverlay, { backgroundColor: isDarkMode ? 'rgba(6,79,47,0.14)' : 'rgba(6,79,47,0.08)' }]} />
          <View style={s.audioContent}>
            <View style={[s.audioTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={s.cardIcon}>
                <MaterialCommunityIcons name="headphones" size={26} color="#fff" />
              </View>
              <View style={s.cardText}>
                <Text style={[s.cardTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {getStoryAudioDisplayTitle(story)}
                </Text>
                <Text style={[s.cardBrief, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
                  {labels.audio}
                </Text>
              </View>
              <Pressable
                onPress={handleDownloadAudio}
                disabled={audioDownloadState === 'downloading' || audioDownloadState === 'downloaded'}
                style={[s.downloadButton, audioDownloadState === 'downloaded' && s.downloadButtonDone]}
                accessibilityRole="button"
                accessibilityLabel={labels.download}
              >
                {audioDownloadState === 'downloading' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name={audioDownloadState === 'downloaded' ? 'check' : 'download'} size={16} color="#fff" />
                )}
                <Text style={s.downloadButtonText} numberOfLines={1}>
                  {audioDownloadState === 'downloading'
                    ? labels.downloading
                    : audioDownloadState === 'downloaded'
                      ? labels.downloaded
                      : labels.download}
                </Text>
              </Pressable>
            </View>

            <Slider
              style={s.progressSlider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={sliderPosition}
              disabled={!canSeekAudio}
              minimumTrackTintColor={ACCENT}
              maximumTrackTintColor="rgba(6,79,47,0.18)"
              thumbTintColor={canSeekAudio ? ACCENT : 'rgba(255,255,255,0.45)'}
              onSlidingStart={handleSeekStart}
              onValueChange={handleSeekChange}
              onSlidingComplete={handleSeekComplete}
            />

            <View style={s.controls}>
              <Text style={[s.time, { color: colors.textLight }]}>{formattedPosition}</Text>
              <Pressable onPress={handlePlayPress} disabled={isResolvingAudio} style={[s.playButton, isResolvingAudio && s.disabled]}>
                {isResolvingAudio ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name={isPlaying ? 'pause' : 'play'} size={30} color="#fff" />
                )}
              </Pressable>
              <Text style={[s.time, { color: colors.textLight }]}>{duration > 0 ? formattedDuration : '--:--'}</Text>
            </View>

            <View style={[s.speedRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[s.speedLabel, { color: colors.textLight }]}>{getLanguage() === 'ar' ? 'السرعة' : 'Speed'}</Text>
              {AUDIO_SPEEDS.map((speed) => {
                const active = Math.abs(playbackSpeed - speed) < 0.01;
                return (
                  <Pressable
                    key={speed}
                    onPress={() => setPlaybackSpeed(speed)}
                    style={[s.speedButton, active && s.speedButtonActive]}
                  >
                    <Text style={[s.speedButtonText, active && s.speedButtonTextActive]}>{speed}x</Text>
                  </Pressable>
                );
              })}
            </View>

            {!!audioDownloadError && (
              <Text style={[s.downloadErrorText, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {audioDownloadError}
              </Text>
            )}

          </View>
        </View>}

        <View style={{ paddingHorizontal: Spacing.lg }}>
          <StoryInteractionBar
            storyId={story.id}
            section="prophet"
            storyTitle={getTitle(story)}
          />
        </View>

        <InlineMrecAd screen={SCREEN_KEY} darkMode={isDarkMode} />

        {hasTranscript && (
          <>
            <View style={s.sectionHeader}>
              <View style={[s.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={s.sectionIcon}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={18} color={colors.text} />
                </View>
                <Text style={[s.sectionTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {labels.storyText}
                </Text>
                <PdfShareButton onPress={handleSharePdf} />
              </View>
            </View>

            <View style={s.transcriptBox}>
              <BlurView
                intensity={Platform.OS === 'ios' ? 24 : 10}
                tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
                style={StyleSheet.absoluteFill}
              />
              <View style={[s.panelOverlay, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.64)' }]} />
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator
                contentContainerStyle={s.transcriptContent}
              >
                <Text style={[s.transcriptText, { color: colors.text, textAlign: getLanguage() === 'ar' ? 'right' : 'left', writingDirection: getLanguage() === 'ar' ? 'rtl' : 'ltr' }]}>
                  {transcript}
                </Text>
              </ScrollView>
            </View>

            <SourcesList sources={story.sources && story.sources.length > 0 ? story.sources : getStorySources(story)} />

            <InlineMrecAd screen={SCREEN_KEY} darkMode={isDarkMode} />
          </>
        )}
      </ScrollView>

      <AudioStatusModal
        visible={showAudioModal}
        mode={audioModalMode}
        colors={colors}
        onRetry={handlePlayPress}
        onClose={() => setAudioModalDismissed(true)}
      />
      <PdfShareErrorModal
        visible={pdfErrorVisible}
        onRetry={() => {
          setPdfErrorVisible(false);
          handleSharePdf();
        }}
        onClose={() => setPdfErrorVisible(false)}
      />
      <BannerAdComponent screen={SCREEN_KEY} />
    </View>
  );
}

export default function ReligiousStoriesScreen() {
  const { isDarkMode } = useSettings();
  const colors = useColors();
  const s = useScaledStyles(_s, colors.fs);
  const isRTL = useIsRTL();
  const { stories, isRefreshing } = useReligiousStoriesContentStatus();
  const [selectedStory, setSelectedStory] = useState<CMSReligiousStory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const handledIdParamRef = useRef<string | null>(null);
  const labels = copy();
  const storyNumberById = useMemo(() => {
    const map = new Map<string, number>();
    stories.forEach((story, index) => map.set(story.id, index + 1));
    return map;
  }, [stories]);
  const filteredStories = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) return stories;
    return stories.filter(story => storySearchText(story).includes(query));
  }, [searchQuery, stories]);

  // Auto-open a saved story when navigated via ?id=<storyId>
  useEffect(() => {
    if (!idParam || handledIdParamRef.current === idParam) return;
    if (stories.length === 0) return;
    const target = stories.find(st => st.id === idParam);
    if (!target) return;
    handledIdParamRef.current = idParam;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedStory(target);
  }, [idParam, stories]);

  useEffect(() => {
    if (!selectedStory) return;
    const updatedStory = stories.find(story => story.id === selectedStory.id);
    if (!updatedStory) return;
    if (updatedStory === selectedStory) return;
    setSelectedStory(updatedStory);
  }, [selectedStory, stories]);

  const openStory = useCallback(async (story: CMSReligiousStory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedStory(story);
  }, []);

  const closeStory = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedStory(null);
  }, []);

  if (selectedStory) {
    return (
      <ScreenContainer edges={['top', 'left', 'right']} screenKey={SCREEN_KEY}>
        <StoryListening story={selectedStory} onBack={closeStory} isDarkMode={isDarkMode} colors={colors} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right']} screenKey={SCREEN_KEY}>
      <View style={s.container}>
        <UniversalHeader backStyle={{ backgroundColor: 'rgba(109, 93, 252, 0.16)', borderRadius: 14 }}>
          <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {labels.title}
          </Text>
        </UniversalHeader>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          <View style={s.hero}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 24 : 10}
              tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
              style={StyleSheet.absoluteFill}
            />
            <View style={[s.panelOverlay, { backgroundColor: isDarkMode ? 'rgba(6,79,47,0.14)' : 'rgba(6,79,47,0.08)' }]} />
            <View style={[s.heroContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={s.cardIcon}>
                <MaterialCommunityIcons name="book-heart" size={28} color="#fff" />
              </View>
              <View style={s.cardText}>
                <Text style={[s.heroTitle, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {labels.title}
                </Text>
                <Text style={[s.cardBrief, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {labels.subtitle}
                </Text>
              </View>
            </View>
          </View>

          <LanguageNotice colors={colors} />

          <View style={s.searchOuter}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 20 : 8}
              tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any}
              style={StyleSheet.absoluteFill}
            />
            <View style={[s.searchOverlay, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.62)' }]} />
            <View style={[s.searchContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="magnify" size={21} color={colors.textLight} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={labels.searchPlaceholder}
                placeholderTextColor={colors.textLight}
                style={[s.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
                returnKeyType="search"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {!!searchQuery && (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={20} color={colors.textLight} />
                </Pressable>
              )}
            </View>
          </View>

          {stories.length === 0 ? (
            <View style={s.emptyBox}>
              <MaterialCommunityIcons name="book-plus" size={34} color={colors.textLight} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>{labels.emptyTitle}</Text>
              <Text style={[s.emptyBody, { color: colors.textLight }]}>{labels.emptyBody}</Text>
            </View>
          ) : filteredStories.length === 0 ? (
            <View style={s.emptyBox}>
              <MaterialCommunityIcons name="magnify-close" size={34} color={colors.textLight} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>{labels.noSearchResults}</Text>
            </View>
          ) : (
            filteredStories.map((story, index) => (
              <StoryCard
                key={story.id}
                story={story}
                index={(storyNumberById.get(story.id) || index + 1) - 1}
                onPress={() => openStory(story)}
                isDarkMode={isDarkMode}
                colors={colors}
              />
            ))
          )}
        </ScrollView>

        <StoriesUpdateModal visible={isRefreshing} colors={colors} />
        <BannerAdComponent screen={SCREEN_KEY} />
      </View>
    </ScreenContainer>
  );
}

const _s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: fontBold(),
    fontSize: 18,
    lineHeight: 30,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  hero: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: 18,
  },
  heroTitle: {
    fontFamily: fontBold(),
    fontSize: 20,
    lineHeight: 32,
  },
  languageNotice: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: 12,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(6,79,47,0.16)',
  },
  noticeText: {
    flex: 1,
    fontFamily: fontSemiBold(),
    fontSize: 13,
    lineHeight: 22,
  },
  searchOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
  },
  searchContent: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontSemiBold(),
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 0,
  },
  cardOuter: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 18,
  },
  cardContent: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: 14,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  storyNumberBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  storyNumberText: {
    color: '#fff',
    fontFamily: fontBold(),
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fontSemiBold(),
    fontSize: 16,
    lineHeight: 26,
  },
  cardBrief: {
    fontFamily: fontRegular(),
    fontSize: 13,
    lineHeight: 22,
  },
  panelOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  audioPanel: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  audioContent: {
    padding: 18,
    gap: 14,
  },
  audioTitleRow: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  progressSlider: {
    width: '100%',
    height: 34,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  disabled: {
    opacity: 0.5,
  },
  time: {
    width: 76,
    fontFamily: fontSemiBold(),
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  speedRow: {
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  speedLabel: {
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 18,
  },
  speedButton: {
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  speedButtonActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  speedButtonText: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 16,
  },
  speedButtonTextActive: {
    color: '#fff',
  },
  downloadButton: {
    flexShrink: 0,
    minWidth: 92,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: ACCENT,
  },
  downloadButtonDone: {
    backgroundColor: '#0d8e62',
  },
  downloadButtonText: {
    color: '#fff',
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  downloadErrorText: {
    color: '#ef4444',
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: '#ef4444',
    fontFamily: fontRegular(),
    fontSize: 13,
    lineHeight: 22,
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: 10,
  },
  sectionTitleRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_LIGHT,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: fontSemiBold(),
    fontSize: 17,
    lineHeight: 28,
  },
  autoScrollToggle: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  autoScrollText: {
    color: '#fff',
    fontFamily: fontSemiBold(),
    fontSize: 12,
    lineHeight: 18,
  },
  transcriptBox: {
    height: 390,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  transcriptContent: {
    padding: 18,
  },
  transcriptText: {
    fontFamily: fontRegular(),
    fontSize: 16,
    lineHeight: 30,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: fontSemiBold(),
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fontRegular(),
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
  modalIconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSpinner: {
    marginTop: 18,
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: fontBold(),
    fontSize: 18,
    lineHeight: 30,
    marginBottom: 8,
    includeFontPadding: false,
  },
  modalBody: {
    fontFamily: fontRegular(),
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 18,
    includeFontPadding: false,
  },
  modalActions: {
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalButtonPrimary: {
    backgroundColor: ACCENT,
  },
  modalButtonSecondary: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalButtonText: {
    fontFamily: fontSemiBold(),
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
