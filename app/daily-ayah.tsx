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

// ─── Background image categories from Unsplash ───────────────────────────────
// Images are sourced from Unsplash (free, no API key required for direct access)
const BG_CATEGORIES = [
  {
    id: 'ocean',
    label: 'محيط',
    images: [
      'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80',
    ],
  },
  {
    id: 'sky',
    label: 'سماء',
    images: [
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80',
      'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80',
      'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80',
    ],
  },
  {
    id: 'nature',
    label: 'طبيعة',
    images: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
    ],
  },
  {
    id: 'desert',
    label: 'صحراء',
    images: [
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&q=80',
      'https://images.unsplash.com/photo-1527754046865-bfaed5b2aa2f?w=800&q=80',
    ],
  },
  {
    id: 'mosque',
    label: 'مسجد',
    images: [
      'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=800&q=80',
      'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=800&q=80',
      'https://images.unsplash.com/photo-1619608802079-d9c42e3d93fe?w=800&q=80',
    ],
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

// ─── Card themes ──────────────────────────────────────────────────────────────
const CARD_STYLES = [
  { id: 'overlay_dark',  overlayColor: 'rgba(0,0,0,0.55)', textColor: '#FFFFFF', accentColor: '#F0C040' },
  { id: 'overlay_green', overlayColor: 'rgba(10,50,20,0.65)', textColor: '#E8F5E9', accentColor: '#A5D6A7' },
  { id: 'overlay_blue',  overlayColor: 'rgba(10,20,50,0.60)', textColor: '#E3F2FD', accentColor: '#90CAF9' },
  { id: 'overlay_warm',  overlayColor: 'rgba(60,20,5,0.60)', textColor: '#FFF8E1', accentColor: '#FFCC02' },
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
  bgUrl: string;
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
  const isSolidBg = bgUrl.startsWith('#');
  const verseWithNumber = `${ayah.arabic} ﴿${toArabicNumeral(ayah.ayah)}﴾`;

  return (
    <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}>
      <View style={{ width: 360, height: 640, overflow: 'hidden', position: 'relative', backgroundColor: isSolidBg ? bgUrl : '#000' }}>
        {/* Background image */}
        {!isSolidBg && (
          <RNImage
            source={{ uri: bgUrl }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            resizeMode="cover"
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
  const [verseTranslation, setVerseTranslation] = useState<string | null>(null);

  const currentAyah = overrideAyah || DAILY_AYAHS[ayahIdx];

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
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(120,120,128,0.12)', borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '700', color: colors.textLight },
    chipTextActive: { color: '#fff' },
    cardWrap: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
    previewCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' },
    actionsRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: 16, marginBottom: 16 },
    actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', flexDirection: isRTL ? 'row-reverse' as const : 'row' as const, justifyContent: 'center', gap: Spacing.sm },
    actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    styleRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: 16, marginBottom: 12 },
    styleCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    toggleRow: { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const, alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  });

  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']} screenKey="daily_ayah">
      {/* Full-page blurred nature background */}
      <Image
        source={{ uri: pageBgUrl }}
        style={StyleSheet.absoluteFill}
        blurRadius={Platform.OS === 'ios' ? 20 : 15}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.80)' }]} />
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
                  <Text style={s.actionBtnText}>{t('common.download')}</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#2563EB' }]}
            onPress={handleShare}
            disabled={exporting}
          >
            <MaterialCommunityIcons name="share-variant" size={18} color="#fff" />
            <Text style={s.actionBtnText}>{t('common.share')}</Text>
          </TouchableOpacity>
        </View>

        {/* Ayah text preview — Mushaf style */}
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
            borderColor: isDarkMode ? 'rgba(180,160,100,0.3)' : 'rgba(180,160,100,0.5)',
          }}
        >
          {/* Verse text — Arabic for Arabic users, translation for others */}
          {isArabic ? (
            qcfGlyphs && qcfFontFamily ? (
              <Text style={{ fontSize: 26, color: colors.text, textAlign: 'center', lineHeight: 50, fontFamily: qcfFontFamily, marginBottom: 12, writingDirection: 'rtl' }}>
                {qcfGlyphs.join('')}
              </Text>
            ) : (
              <Text style={{ fontSize: 26, color: colors.text, textAlign: 'center', lineHeight: 50, fontFamily: UTHMANI_FONT, marginBottom: 12, writingDirection: 'rtl' }}>
                ﴿ {currentAyah.arabic} ﴾
              </Text>
            )
          ) : (
            <Text style={{ fontSize: 20, color: colors.text, textAlign: isRTL ? 'right' : 'left', lineHeight: 34, fontFamily: fontRegular(), marginBottom: 12, writingDirection: isRTL ? 'rtl' : 'ltr' }}>
              {verseTranslation || currentAyah.trans || currentAyah.arabic}
            </Text>
          )}

          {/* Surah reference — transliterated for non-Arabic */}
          <Text style={{ fontSize: 15, color: colors.primary, textAlign: 'center', fontFamily: isArabic ? UTHMANI_FALLBACK : undefined }}>
            {isArabic ? `${currentAyah.ref.split(' ')[0]}: ${toArabicNumeral(currentAyah.ayah)}` : transliterateReference(currentAyah.ref, language)}
          </Text>

          <Text style={{ fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: 8, opacity: 0.6 }}>
            {t('quran.longPressToGoToVerse')}
          </Text>

          {/* Translation with proper direction — only for non-Arabic users */}
          {!isArabic && showTranslation && (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: colors.border, direction: 'ltr' }}>
              <TranslatedAyahTrans trans={currentAyah.trans} isEnglish={isEnglish} textLight={colors.textLight} />
            </View>
          )}

          {/* Tafsir section */}
          {showTafsir && (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: colors.border }}>
              <Text style={{ fontSize: 14, fontFamily: fontSemiBold(), color: colors.primary, textAlign: isRTL ? 'right' : 'left', marginBottom: 6, writingDirection: isRTL ? 'rtl' : 'ltr' }}>
                {t('home.tafsirMuyassar')}
              </Text>
              {tafsirLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
              ) : (
                <Text style={{ fontSize: 15, fontFamily: fontRegular(), color: colors.text, textAlign: 'right', writingDirection: 'rtl', lineHeight: 26 }}>
                  {tafsirText || t('common.loading')}
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>

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
