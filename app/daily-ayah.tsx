/**
 * Daily Ayah Video — آية اليوم كفيديو
 * يُنشئ بطاقة آية يومية جميلة مع خلفية طبيعية (بحر/سماء/زرع)
 * قابلة للمشاركة والتنزيل
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert, Platform, Animated, Share, Dimensions, Image,
} from 'react-native';
import { fontRegular, fontSemiBold } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import { t, getLanguage } from '@/lib/i18n';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { useRouter, Stack } from 'expo-router';
import { fetchTafsir, getDefaultTranslationForLanguage } from '@/lib/quran-api';
import { getVerseQcfData } from '@/lib/qcf-page-data';
import { loadPageFont, getPageFontFamily } from '@/lib/qcf-font-loader';
import { getDailyAyahOverride } from '@/lib/daily-content-override';
import { useFavorite } from '@/hooks/use-favorite';
import { transliterateReference } from '@/lib/source-transliteration';
import { localizeNumber } from '@/lib/format-number';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { useAutoTranslate } from '@/hooks/use-auto-translate';
import { Spacing } from '@/constants/theme';
import { useAppIdentity } from '@/hooks/use-app-identity';
import { DAILY_AYAHS } from '@/data/daily-ayahs';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Background image categories ────────────────────────────────────────────
// Images are bundled locally (assets/images/backgrounds/) so they always work
// offline — same approach as story-of-day video caching but using app assets.
type BgSource = number | string; // number = require() result, string = '#hex' color
const BUNDLED_BACKGROUNDS: number[] = [
  require('@/assets/images/daily-ayah-bg/nature1.png'),
  require('@/assets/images/daily-ayah-bg/nature2.png'),
  require('@/assets/images/daily-ayah-bg/nature3.png'),
  require('@/assets/images/daily-ayah-bg/nature4.png'),
  require('@/assets/images/daily-ayah-bg/nature5.png'),
  require('@/assets/images/daily-ayah-bg/nature6.png'),
  require('@/assets/images/daily-ayah-bg/nature7.png'),
  require('@/assets/images/daily-ayah-bg/nature8.png'),
  require('@/assets/images/daily-ayah-bg/nature9.png'),
  require('@/assets/images/daily-ayah-bg/nature10.png'),
  require('@/assets/images/daily-ayah-bg/nature11.png'),
];

const BG_CATEGORIES: { id: string; label: string; images: BgSource[] }[] = [
  {
    id: 'nature',
    label: 'طبيعة',
    images: BUNDLED_BACKGROUNDS,
  },
  {
    id: 'solid',
    label: 'ألوان',
    images: [
      '#1a1a2e', '#1B5E20', '#0D47A1',
      '#2C3E50', '#1A237E', '#311B92',
      '#4A148C', '#880E4F', '#B71C1C',
      '#E65100', '#F57F17', '#33691E',
      '#004D40', '#006064', '#01579B',
      '#263238', '#3E2723', '#212121',
      '#0D7377', '#1B4332', '#2D3436',
      '#6C3483', '#1C2833', '#1E3A5F',
    ],
  },
];

const isSolidColor = (bg: BgSource): bg is string => typeof bg === 'string' && bg.startsWith('#');
const resolveImageSource = (bg: BgSource) => (typeof bg === 'number' ? bg : { uri: bg });

// ─── Card themes ──────────────────────────────────────────────────────────────
const CARD_STYLES = [
  { id: 'overlay_dark',  overlayColor: 'rgba(0,0,0,0.30)', textColor: '#FFFFFF', accentColor: '#F0C040' },
  { id: 'overlay_green', overlayColor: 'rgba(10,50,20,0.40)', textColor: '#E8F5E9', accentColor: '#A5D6A7' },
  { id: 'overlay_blue',  overlayColor: 'rgba(10,20,50,0.40)', textColor: '#E3F2FD', accentColor: '#90CAF9' },
  { id: 'overlay_warm',  overlayColor: 'rgba(60,20,5,0.40)', textColor: '#FFF8E1', accentColor: '#FFCC02' },
];

// ─── Ayah Image Card (off-screen for capture) ─────────────────────────────────
// ─── Uthmani font for Mushaf-style display ────────────────────────────────────
const UTHMANI_FONT = 'KFGQPCUthmanic';
const UTHMANI_FALLBACK = 'Amiri';

/** Small wrapper to auto-translate daily ayah English translation */
function TranslatedAyahTrans({ trans, isEnglish, textLight }: { trans: string; isEnglish: boolean; textLight: string }) {
  const translated = useAutoTranslate(trans || '', 'en', 'quran');
  return (
    <Text style={{ fontSize: 14, color: textLight, textAlign: 'left', writingDirection: 'ltr' as const, fontStyle: 'italic', lineHeight: 22 }}>
      {isEnglish ? trans : translated}
    </Text>
  );
}

interface AyahCardProps {
  ayah: typeof DAILY_AYAHS[0];
  bgUrl: BgSource;
  cardStyle: typeof CARD_STYLES[0];
  cardRef: React.RefObject<ViewShot>;
  showTranslation: boolean;
  qcfGlyphs?: string[] | null;
  qcfFontFamily?: string | null;
  isArabic?: boolean;
  verseTranslation?: string | null;
  language?: string;
}

const toArabicNumeral = (n: number) => localizeNumber(n);

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.5)',
  textShadowOffset: { width: 0, height: 1 } as const,
  textShadowRadius: 3,
};

function AyahImageCard({ ayah, bgUrl, cardStyle, cardRef, showTranslation, qcfGlyphs, qcfFontFamily, isArabic: isArabicCard = true, verseTranslation: cardTranslation, language: cardLang = 'ar' }: AyahCardProps) {
  const { Image: RNImage } = require('react-native');
  const { logoSource } = useAppIdentity();
  const isSolidBg = isSolidColor(bgUrl);
  const verseWithNumber = `${ayah.arabic} ﴿${toArabicNumeral(ayah.ayah)}﴾`;

  return (
    <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}>
      <View style={{ width: 360, height: 640, overflow: 'hidden', position: 'relative', backgroundColor: isSolidBg ? (bgUrl as string) : '#000' }}>
        {/* Background image with subtle blur for elegant readability */}
        {!isSolidBg && (
          <RNImage
            source={resolveImageSource(bgUrl)}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            resizeMode="cover"
            blurRadius={Platform.OS === 'ios' ? 2 : 1.5}
          />
        )}
        {/* Color overlay */}
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: cardStyle.overlayColor }} />

        {/* Content */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          {/* Verse text — Arabic with QCF for Arabic users, translation for others */}
          {isArabicCard ? (
            qcfGlyphs && qcfFontFamily ? (
              <Text style={{ fontSize: 26, color: '#FFFFFF', textAlign: 'center', lineHeight: 50, fontFamily: qcfFontFamily, marginBottom: 14, writingDirection: 'rtl', ...TEXT_SHADOW }}>
                {qcfGlyphs.join('')}
              </Text>
            ) : (
              <Text style={{ fontSize: 26, color: '#FFFFFF', textAlign: 'center', lineHeight: 50, fontFamily: UTHMANI_FONT, marginBottom: 14, writingDirection: 'rtl', ...TEXT_SHADOW }}>
                ﴿ {ayah.arabic} ﴾
              </Text>
            )
          ) : (
            <Text style={{ fontSize: 18, color: '#FFFFFF', textAlign: 'center', lineHeight: 30, fontFamily: fontRegular(), marginBottom: 14, ...TEXT_SHADOW }}>
              {cardTranslation || ayah.trans || ayah.arabic}
            </Text>
          )}

          {/* Ref badge */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>
            <Text style={{ color: '#FFFFFF', fontFamily: isArabicCard ? UTHMANI_FALLBACK : undefined, fontSize: 13, ...TEXT_SHADOW }}>
              {isArabicCard ? `${ayah.ref.split(' ')[0]}: ${toArabicNumeral(ayah.ayah)}` : transliterateReference(ayah.ref, cardLang)}
            </Text>
          </View>

          {/* Translation — only for non-Arabic users with toggle ON */}
          {!isArabicCard && showTranslation && (
            <Text style={{ color: '#FFFFFF', opacity: 0.85, fontSize: 12, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 10, direction: 'ltr', writingDirection: 'ltr', ...TEXT_SHADOW }}>
              {ayah.trans}
            </Text>
          )}
        </View>

        {/* Branding watermark */}
        <View style={{ position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
          <RNImage source={logoSource} style={{ width: 56, height: 56, borderRadius: 14, opacity: 0.85 }} />
        </View>
      </View>
    </ViewShot>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DailyAyahVideoScreen() {
  const colors = useColors();
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const router = useRouter();
  const cardRef = useRef<ViewShot>(null!);
  const language = getLanguage();
  const isArabic = language === 'ar';

  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

  const ayahIdx = dayOfYear % DAILY_AYAHS.length;
  // Nature category (index 2) as default
  const natureCat = BG_CATEGORIES.find(c => c.id === 'nature') || BG_CATEGORIES[2];
  const [selectedCat, setSelectedCat] = useState(natureCat);
  const [selectedBgIdx, setSelectedBgIdx] = useState(dayOfYear % natureCat.images.length);
  // Always use dark overlay — no green/colored tints
  const selectedCardStyle = CARD_STYLES[0];
  // Full-page background image (blurred nature)
  const pageBgUrl = natureCat.images[dayOfYear % natureCat.images.length];
  const [showTranslation, setShowTranslation] = useState(!isArabic);
  const isEnglish = language === 'en';
  const [showTafsir, setShowTafsir] = useState(false);
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [qcfGlyphs, setQcfGlyphs] = useState<string[] | null>(null);
  const [qcfFontFamily, setQcfFontFamily] = useState<string | null>(null);
  const [overrideAyah, setOverrideAyah] = useState<typeof DAILY_AYAHS[0] | null>(null);
  const [randomAyah, setRandomAyah] = useState<typeof DAILY_AYAHS[0] | null>(null);
  const [verseTranslation, setVerseTranslation] = useState<string | null>(null);

  const currentAyah = randomAyah || overrideAyah || DAILY_AYAHS[ayahIdx];

  const { saved: isFav, toggle: toggleFav } = useFavorite(
    `ayah_${currentAyah.surah}_${currentAyah.ayah}`,
    'ayah',
    () => ({
      id: `ayah_${currentAyah.surah}_${currentAyah.ayah}`,
      type: 'ayah',
      title: currentAyah.ref,
      arabic: currentAyah.arabic,
      translation: currentAyah.trans,
      reference: currentAyah.ref,
      route: `/surah/${currentAyah.surah}?ayah=${currentAyah.ayah}`,
      meta: { surah: currentAyah.surah, ayah: currentAyah.ayah },
    }),
  );

  // Check for admin override
  useEffect(() => {
    getDailyAyahOverride().then(({ data }) => {
      if (data) {
        setOverrideAyah({
          arabic: data.text,
          ref: data.surahName || '',
          trans: '',
          surah: data.surah,
          ayah: data.ayah,
        });
      }
    });
  }, []);
  const currentBg = selectedCat.images[selectedBgIdx];

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Fetch verse translation for non-Arabic users
  useEffect(() => {
    if (isArabic) { setVerseTranslation(null); return; }
    let cancelled = false;
    const edition = getDefaultTranslationForLanguage(language);
    const cacheKey = `@verse_trans_${currentAyah.surah}_${currentAyah.ayah}_${edition}`;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached && !cancelled) { setVerseTranslation(cached); return; }
      } catch {}

      try {
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${currentAyah.surah}:${currentAyah.ayah}/${edition}`);
        const data = await res.json();
        if (!cancelled && data.code === 200 && data.data?.text) {
          setVerseTranslation(data.data.text);
          AsyncStorage.setItem(cacheKey, data.data.text).catch(() => {});
        } else if (!cancelled) {
          // Fallback to English translation
          setVerseTranslation(currentAyah.trans);
        }
      } catch {
        if (!cancelled) setVerseTranslation(currentAyah.trans);
      }
    })();
    return () => { cancelled = true; };
  }, [currentAyah.surah, currentAyah.ayah, language, isArabic]);

  // Load QCF font when ayah changes
  useEffect(() => {
    let cancelled = false;
    const data = getVerseQcfData(currentAyah.surah, currentAyah.ayah);
    if (!data) {
      setQcfGlyphs(null);
      setQcfFontFamily(null);
      return;
    }
    loadPageFont(data.page, isDarkMode).then(() => {
      if (cancelled) return;
      setQcfGlyphs(data.glyphs);
      setQcfFontFamily(getPageFontFamily(data.page, isDarkMode));
    });
    return () => { cancelled = true; };
  }, [currentAyah.surah, currentAyah.ayah, isDarkMode]);

  // Fetch tafsir when ayah changes or tafsir is shown
  useEffect(() => {
    if (!showTafsir) return;
    setTafsirLoading(true);
    setTafsirText(null);
    fetchTafsir(currentAyah.surah, currentAyah.ayah, 'ar.muyassar')
      .then(result => setTafsirText(result.tafsirText))
      .catch(() => setTafsirText(t('quranSearch.loadTafsirFailed')))
      .finally(() => setTafsirLoading(false));
  }, [showTafsir, currentAyah.surah, currentAyah.ayah]);



  // Navigate to ayah in Mushaf on long-press
  const handleLongPress = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push(`/surah/${currentAyah.surah}?ayah=${currentAyah.ayah}` as any);
  }, [currentAyah, router]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleRandomAyah = useCallback(() => {
    if (DAILY_AYAHS.length === 0) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setTafsirText(null);

    const currentIndex = DAILY_AYAHS.findIndex(
      ayah => ayah.surah === currentAyah.surah && ayah.ayah === currentAyah.ayah,
    );
    const randomPoolSize = currentIndex >= 0 ? DAILY_AYAHS.length - 1 : DAILY_AYAHS.length;
    if (randomPoolSize <= 0) {
      setRandomAyah(DAILY_AYAHS[0]);
      return;
    }

    let nextIndex = Math.floor(Math.random() * randomPoolSize);
    if (currentIndex >= 0 && nextIndex >= currentIndex) nextIndex += 1;
    setRandomAyah(DAILY_AYAHS[nextIndex]);
  }, [currentAyah.ayah, currentAyah.surah]);

  const handleSaveImage = useCallback(async () => {
    if (!cardRef.current) return;
    setExporting(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1.0 });
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ ' + t('common.savedSuccess'), t('common.imageSavedSuccess'));
      } else {
        Alert.alert(t('common.error'), t('common.photoPermissionRequired'));
      }
    } catch {
      Alert.alert(t('common.error'), t('common.imageSaveError'));
    } finally {
      setExporting(false);
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (Platform.OS === 'web') {
        await Share.share({
          message: `${currentAyah.arabic}\n\n﴿ ${currentAyah.ref} ﴾\n\n${currentAyah.trans}\n\n— ${t('common.appName')}`,
        });
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1.0 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `${t('shareService.ayahRef')}: ${currentAyah.ref}` });
      } else {
        await Share.share({ message: `${currentAyah.arabic}\n﴿ ${currentAyah.ref} ﴾` });
      }
    } catch {
      Alert.alert(t('common.error'), t('common.shareError'));
    }
  }, [currentAyah]);

  const s = StyleSheet.create({
    title: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 2 },
    subtitle: { fontSize: 13, color: colors.textLight },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textLight, textAlign: isRTL ? 'right' : 'left', marginBottom: 8, marginTop: 4 },
    hScroll: { paddingHorizontal: 16, gap: Spacing.sm },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)' },
    chipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
    chipText: { fontSize: 13, fontWeight: '700', color: colors.textLight },
    chipTextActive: { color: '#fff' },
    cardWrap: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
    previewCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' },
    actionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: 16, marginBottom: 16 },
    actionBtn: { flex: 1, minWidth: 0, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16, alignItems: 'center', flexDirection: isRTL ? 'row-reverse' as const : 'row' as const, justifyContent: 'center', gap: Spacing.xs },
    actionBtnText: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: '#fff' },
    styleRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: 16, marginBottom: 12 },
    styleCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    toggleRow: { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const, alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  });

  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']} screenKey="daily_ayah">
      {/* Header */}
      <UniversalHeader
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
        rightActions={[{ icon: isFav ? 'heart' : 'heart-outline', onPress: toggleFav, color: isFav ? '#ef4444' : colors.text }]}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Text style={s.title}>{t('quran.verseOfDay')}</Text>
            <SectionInfoButton sectionKey="quran_surahs" />
          </View>
          <Text style={s.subtitle}>{t('quran.shareWordsOfAllah')}</Text>
        </View>
      </UniversalHeader>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Preview Card */}
        <Animated.View style={[s.cardWrap, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={s.previewCard}
            activeOpacity={0.9}
            onLongPress={handleLongPress}
            delayLongPress={500}
          >
            <AyahImageCard
              ayah={currentAyah}
              bgUrl={currentBg}
              cardStyle={selectedCardStyle}
              cardRef={cardRef}
              showTranslation={showTranslation}
              qcfGlyphs={qcfGlyphs}
              qcfFontFamily={qcfFontFamily}
              isArabic={isArabic}
              verseTranslation={verseTranslation}
              language={language}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Action buttons */}
        <View style={[s.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#1B6B3A' }]}
            onPress={handleSaveImage}
            disabled={exporting}
          >
            {exporting
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <MaterialCommunityIcons name="download" size={18} color="#fff" />
                  <Text style={s.actionBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{t('common.download')}</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#0D9488' }]}
            onPress={handleRandomAyah}
            disabled={exporting}
            accessibilityLabel={t('common.change')}
          >
            <MaterialCommunityIcons name="shuffle-variant" size={18} color="#fff" />
            <Text style={s.actionBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{t('common.change')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#2563EB' }]}
            onPress={handleShare}
            disabled={exporting}
          >
            <MaterialCommunityIcons name="share-variant" size={18} color="#fff" />
            <Text style={s.actionBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{t('common.share')}</Text>
          </TouchableOpacity>
        </View>

        {/* Ayah text preview — Mushaf style */}
        {/* Parchment card — explicit text colors based on card background, not global theme */}
        {(() => {
          // Card-specific text colors: dark text on cream bg (light mode), light text on dark bg (dark mode)
          const cardTextColor = isDarkMode ? '#FFFFFF' : '#1C1C1E';
          const cardTextLightColor = isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)';
          const cardBorderColor = isDarkMode ? 'rgba(180,160,100,0.3)' : 'rgba(180,160,100,0.5)';
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onLongPress={handleLongPress}
              delayLongPress={500}
              style={{
                marginHorizontal: 16,
                padding: 20,
                backgroundColor: isDarkMode ? 'rgba(50,45,35,0.6)' : 'rgba(253,248,235,0.95)',
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: cardBorderColor,
              }}
            >
              {/* Verse text — Arabic for Arabic users, translation for others */}
              {isArabic ? (
                qcfGlyphs && qcfFontFamily ? (
                  <Text style={{ fontSize: 26, color: cardTextColor, textAlign: 'center', lineHeight: 50, fontFamily: qcfFontFamily, marginBottom: 12, writingDirection: 'rtl' }}>
                    {qcfGlyphs.join('')}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 26, color: cardTextColor, textAlign: 'center', lineHeight: 50, fontFamily: UTHMANI_FONT, marginBottom: 12, writingDirection: 'rtl' }}>
                    ﴿ {currentAyah.arabic} ﴾
                  </Text>
                )
              ) : (
                <Text style={{ fontSize: 20, color: cardTextColor, textAlign: isRTL ? 'right' : 'left', lineHeight: 34, fontFamily: fontRegular(), marginBottom: 12, writingDirection: isRTL ? 'rtl' : 'ltr' }}>
                  {verseTranslation || currentAyah.trans || currentAyah.arabic}
                </Text>
              )}

              {/* Surah reference — transliterated for non-Arabic */}
              <Text style={{ fontSize: 15, color: isDarkMode ? '#4ADE80' : '#0d8e62', textAlign: 'center', fontFamily: isArabic ? UTHMANI_FALLBACK : undefined }}>
                {isArabic ? `${currentAyah.ref.split(' ')[0]}: ${toArabicNumeral(currentAyah.ayah)}` : transliterateReference(currentAyah.ref, language)}
              </Text>

              <Text style={{ fontSize: 11, color: cardTextLightColor, textAlign: 'center', marginTop: 8 }}>
                {t('quran.longPressToGoToVerse')}
              </Text>

              {/* Translation with proper direction — only for non-Arabic users */}
              {!isArabic && showTranslation && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: cardBorderColor, direction: 'ltr' }}>
                  <Text style={{ fontSize: 14, color: cardTextLightColor, textAlign: 'left', writingDirection: 'ltr' as const, fontStyle: 'italic', lineHeight: 22 }}>
                    {isEnglish ? currentAyah.trans : currentAyah.trans}
                  </Text>
                </View>
              )}

              {/* Tafsir section */}
              {showTafsir && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: cardBorderColor }}>
                  <Text style={{ fontSize: 14, fontFamily: fontSemiBold(), color: colors.primary, textAlign: isRTL ? 'right' : 'left', marginBottom: 6, writingDirection: isRTL ? 'rtl' : 'ltr' }}>
                    {t('home.tafsirMuyassar')}
                  </Text>
                  {tafsirLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
                  ) : (
                    <Text style={{ fontSize: 15, fontFamily: fontRegular(), color: cardTextColor, textAlign: 'right', writingDirection: 'rtl', lineHeight: 26 }}>
                      {tafsirText || t('common.loading')}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })()}

        {/* Tafsir toggle button — at bottom */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, flexDirection: isRTL ? 'row-reverse' : 'row', gap: Spacing.sm }}>
          <TouchableOpacity
            style={[s.chip, showTafsir && s.chipActive, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }]}
            onPress={() => { setShowTafsir(v => !v); if (Platform.OS !== 'web') Haptics.selectionAsync(); }}
          >
            <MaterialCommunityIcons name="book-open-page-variant" size={16} color={showTafsir ? '#fff' : colors.textLight} />
            <Text style={[s.chipText, showTafsir && s.chipTextActive]}>{t('quran.tafsir')}</Text>
          </TouchableOpacity>
          {!isArabic && (
            <TouchableOpacity
              style={[s.chip, showTranslation && s.chipActive, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }]}
              onPress={() => setShowTranslation(v => !v)}
            >
              <MaterialCommunityIcons name="translate" size={16} color={showTranslation ? '#fff' : colors.textLight} />
              <Text style={[s.chipText, showTranslation && s.chipTextActive]}>{t('azkar.translation')}</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </ScreenContainer>
    </>
  );
}
