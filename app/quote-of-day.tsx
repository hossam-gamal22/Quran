// app/quote-of-day.tsx
// صفحة حكمة اليوم - قصة يومية مع شاهد من القرآن أو السنة أو الدعاء

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fontBold, fontMedium, fontSemiBold } from '@/lib/fonts';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { t, getLanguage } from '@/lib/i18n';
import { buildShareText } from '@/lib/share-text';
import { useAutoTranslate } from '@/hooks/use-auto-translate';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { IslamicShareCard, type IslamicShareCardHandle } from '@/components/ui/IslamicShareCard';
import { getQuoteForDate, getRandomQuote, type IslamicQuote, getAuthorDisplay, WISDOM_BACKUP_DAYS } from '@/data/quotes';
import { getDailyQuoteOverride } from '@/lib/daily-content-override';
import { getWisdomBackupFromPool, getWisdomForDateFromPool, getWisdomPoolOnlineFirst } from '@/lib/daily-wisdom-api';
import { useFavorite } from '@/hooks/use-favorite';
import { getFavorites } from '@/lib/favorites-manager';
import { getAllSurahs, getVerseQcfData } from '@/lib/qcf-page-data';
import { getPageFontFamily, loadPageFont } from '@/lib/qcf-font-loader';

import { useIsRTL } from '@/hooks/use-is-rtl';
const ACCENT = '#FFFFFF';
const DAILY_WISDOM_CACHE_KEY = '@daily_wisdom_cache_v2';
const DAILY_WISDOM_BACKUP_KEY = '@daily_wisdom_backup_v2';
const SHARE_FONT_REGULAR = 'Rubik-Regular';
const SHARE_FONT_BOLD = 'Rubik-Bold';

type WisdomCacheEnvelope = {
  date: string;
  index?: number;
  data: IslamicQuote;
};

type WisdomBackupEnvelope = {
  startDate: string;
  data: IslamicQuote[];
};

type QcfEvidence = {
  text: string;
  fontFamily: string;
};

function getDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function normalizeArabicName(value: string): string {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/^سوره\s+/i, '')
    .replace(/^سورة\s+/i, '')
    .replace(/\s+/g, '')
    .trim();
}

function toWesternDigits(value: string): string {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = arabic.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);
    return String(persian.indexOf(digit));
  });
}

const SURAH_BY_NAME = new Map(
  getAllSurahs().map(surah => [normalizeArabicName(surah.name), surah.number]),
);

function parseQuranSource(source?: string): { surah: number; ayah: number } | null {
  if (!source?.includes(':')) return null;
  const [rawName, rawAyah] = source.split(':');
  const surah = SURAH_BY_NAME.get(normalizeArabicName(rawName || ''));
  const ayahMatch = toWesternDigits(rawAyah || '').match(/\d+/);
  if (!surah || !ayahMatch) return null;
  return { surah, ayah: Number(ayahMatch[0]) };
}

function resolveQuranRef(quote: IslamicQuote): { surah: number; ayah: number } | null {
  if (
    quote.quranRef &&
    Number.isInteger(quote.quranRef.surah) &&
    Number.isInteger(quote.quranRef.ayah) &&
    quote.quranRef.surah >= 1 &&
    quote.quranRef.surah <= 114 &&
    quote.quranRef.ayah >= 1
  ) {
    return quote.quranRef;
  }
  return parseQuranSource(quote.source);
}

function parseFavoriteJson<T>(value: unknown): T | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

async function readCachedWisdom(todayKey: string): Promise<{ quote: IslamicQuote; index?: number } | null> {
  try {
    const cached = await AsyncStorage.getItem(DAILY_WISDOM_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as WisdomCacheEnvelope;
    if (parsed?.date === todayKey && parsed.data?.arabic) {
      return { quote: parsed.data, index: parsed.index };
    }
  } catch {}
  return null;
}

async function readBackupWisdom(todayKey: string): Promise<IslamicQuote | null> {
  try {
    const cached = await AsyncStorage.getItem(DAILY_WISDOM_BACKUP_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as WisdomBackupEnvelope;
    const offset = daysBetween(parsed.startDate, todayKey);
    if (offset >= 0 && offset < parsed.data.length && parsed.data[offset]?.arabic) {
      return parsed.data[offset];
    }
  } catch {}
  return null;
}

async function saveDailyWisdom(date: string, data: IslamicQuote, index?: number): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_WISDOM_CACHE_KEY, JSON.stringify({ date, data, index }));
  } catch {}
}

async function refreshWisdomBackup(date = new Date(), pool?: IslamicQuote[]): Promise<void> {
  try {
    const startDate = getDateKey(date);
    await AsyncStorage.setItem(
      DAILY_WISDOM_BACKUP_KEY,
      JSON.stringify({
        startDate,
        data: pool?.length
          ? getWisdomBackupFromPool(pool, date, WISDOM_BACKUP_DAYS)
          : getWisdomBackupFromPool([], date, WISDOM_BACKUP_DAYS),
      }),
    );
  } catch {}
}

export default function QuoteOfDayScreen() {
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  const params = useLocalSearchParams<{ favId?: string }>();
  const shareCardRef = useRef<IslamicShareCardHandle>(null);
  const [quote, setQuote] = useState<IslamicQuote>(() => getQuoteForDate().quote);
  const [adminTranslations, setAdminTranslations] = useState<Record<string, string> | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | undefined>(undefined);
  const [wisdomPool, setWisdomPool] = useState<IslamicQuote[]>([]);
  const [qcfEvidence, setQcfEvidence] = useState<QcfEvidence | null>(null);
  const language = getLanguage();
  const isArabic = language === 'ar';
  const isEnglish = language === 'en';
  const translatedQuoteTrans = useAutoTranslate(quote.translation || '', 'en', 'section');
  const translatedEvidence = useAutoTranslate(
    quote.evidenceTranslation || quote.evidenceArabic || '',
    quote.evidenceTranslation ? 'en' : 'ar',
    'section',
  );
  // Prefer admin-provided translation for user's language, then fall back to existing logic
  const resolvedTranslation = (!isArabic && (adminTranslations?.[language] || quote.translations?.[language])) || null;
  const storyText = isArabic
    ? quote.arabic
    : resolvedTranslation || (isEnglish ? (quote.translation || quote.arabic) : (translatedQuoteTrans || quote.translation || quote.arabic));
  const evidenceText = isArabic
    ? quote.evidenceArabic
    : (isEnglish ? (quote.evidenceTranslation || quote.evidenceArabic) : (translatedEvidence || quote.evidenceTranslation || quote.evidenceArabic));
  const wisdomText = getAuthorDisplay(quote.author, isArabic).replace(isArabic ? /^الحكمة:\s*/ : /^Wisdom:\s*/, '');

  useEffect(() => {
    let cancelled = false;
    const ref = resolveQuranRef(quote);
    if (!ref) {
      setQcfEvidence(null);
      return;
    }

    const qcf = getVerseQcfData(ref.surah, ref.ayah);
    if (!qcf?.glyphs.length) {
      setQcfEvidence(null);
      return;
    }

    loadPageFont(qcf.page, isDarkMode)
      .then(() => {
        if (cancelled) return;
        setQcfEvidence({
          text: `\u200F${qcf.glyphs.join(' ')}`,
          fontFamily: getPageFontFamily(qcf.page, isDarkMode),
        });
      })
      .catch(() => {
        if (!cancelled) setQcfEvidence(null);
      });

    return () => { cancelled = true; };
  }, [quote.quranRef?.surah, quote.quranRef?.ayah, quote.source, isDarkMode]);

  const { saved: isFav, toggle: toggleFav } = useFavorite(
    `quote_${quote.author}`,
    'quote',
    () => ({
      id: `quote_${quote.author}`,
      type: 'quote',
      title: quote.author,
      subtitle: quote.source,
      arabic: quote.arabic,
      translation: quote.translation,
      reference: quote.source,
      route: `/quote-of-day?favId=quote_${encodeURIComponent(quote.author)}`,
      meta: {
        quoteArabic: quote.arabic,
        quoteTranslation: quote.translation || '',
        quoteAuthor: quote.author,
        quoteSource: quote.source || '',
        quoteEvidenceArabic: quote.evidenceArabic || '',
        quoteEvidenceTranslation: quote.evidenceTranslation || '',
        quoteQuranRef: quote.quranRef ? JSON.stringify(quote.quranRef) : '',
        quoteTranslations: quote.translations ? JSON.stringify(quote.translations) : '',
      },
    }),
  );

  // Load saved quote from favorites if opened with favId, otherwise use today's cached/admin wisdom.
  useEffect(() => {
    if (params.favId) {
      getFavorites('quote').then(favs => {
        const fav = favs.find(f => f.id === params.favId);
        if (fav?.meta?.quoteArabic) {
          setQuote({
            arabic: String(fav.meta.quoteArabic),
            translation: String(fav.meta.quoteTranslation || ''),
            author: String(fav.meta.quoteAuthor || ''),
            source: String(fav.meta.quoteSource || ''),
            evidenceArabic: String(fav.meta.quoteEvidenceArabic || ''),
            evidenceTranslation: String(fav.meta.quoteEvidenceTranslation || ''),
            quranRef: parseFavoriteJson<IslamicQuote['quranRef']>(fav.meta.quoteQuranRef),
            translations: parseFavoriteJson<Record<string, string>>(fav.meta.quoteTranslations),
          });
          return;
        }
        loadDefault();
      }).catch(() => loadDefault());
    } else {
      loadDefault();
    }
    async function loadDefault() {
      const today = new Date();
      const todayKey = getDateKey(today);
      const cached = await readCachedWisdom(todayKey);
      const backup = cached ? null : await readBackupWisdom(todayKey);
      const bundled = getQuoteForDate(today);
      const initialQuote = cached?.quote || backup || bundled.quote;

      setQuote(initialQuote);
      setCurrentIndex(cached?.index ?? bundled.index);
      await saveDailyWisdom(todayKey, initialQuote, cached?.index ?? bundled.index);
      await refreshWisdomBackup(today);

      try {
        const remotePool = await getWisdomPoolOnlineFirst();
        const remoteDaily = getWisdomForDateFromPool(remotePool, today);
        setWisdomPool(remotePool);
        setQuote(remoteDaily.quote);
        setCurrentIndex(remoteDaily.index);
        await saveDailyWisdom(todayKey, remoteDaily.quote, remoteDaily.index);
        await refreshWisdomBackup(today, remotePool);

        const { data } = await getDailyQuoteOverride();
        if (data) {
          const adminQuote = {
            arabic: data.arabic,
            translation: data.translation,
            author: data.author,
            source: data.source,
            evidenceArabic: data.evidenceArabic,
            evidenceTranslation: data.evidenceTranslation,
            quranRef: (data as any).quranRef,
            translations: (data as any).translations,
          };
          setQuote(adminQuote);
          await saveDailyWisdom(todayKey, adminQuote, remoteDaily.index);
          if ((data as any).translations) setAdminTranslations((data as any).translations);
        }
      } catch {
        // Offline: the daily cache/30-day backup above is enough to keep the page useful.
      }
    }
  }, [params.favId]);

  const handleRefresh = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (wisdomPool.length > 1) {
      let index: number;
      do {
        index = Math.floor(Math.random() * wisdomPool.length);
      } while (index === currentIndex && wisdomPool.length > 1);
      setQuote(wisdomPool[index]);
      setCurrentIndex(index);
      return;
    }
    const { quote: newQuote, index } = getRandomQuote(currentIndex);
    setQuote(newQuote);
    setCurrentIndex(index);
  }, [currentIndex, wisdomPool]);

  const shareQuoteText = useCallback(async () => {
    const authorLine = quote.author ? quote.author : '';
    const evidenceLine = quote.evidenceArabic ? `\n${quote.evidenceArabic}` : '';
    const sourceLine = quote.source ? `${t('azkar.source')}: ${quote.source}\n` : '';
    await Share.share({
      message: buildShareText(`${quote.arabic}\n${evidenceLine}\n\n${quote.translation}\n\n${authorLine}\n${sourceLine}`),
    });
  }, [quote]);

  const shareQuoteImage = async () => {
    try {
      if (String(Platform.OS) === 'web' || !shareCardRef.current) {
        await shareQuoteText();
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      shareCardRef.current.showSizePicker();
    } catch {
      try { await shareQuoteText(); } catch { /* ignore */ }
    }
  };

  const renderWisdomShareContent = useCallback((scale: number) => {
    const scaleText = (size: number, lineHeight?: number) => ({
      fontSize: size * scale,
      ...(lineHeight !== undefined ? { lineHeight: lineHeight * scale } : {}),
    });

    return (
      <View style={styles.shareContent}>
        <View style={styles.shareSection}>
          <Text style={[styles.shareLabel, scaleText(15, 23)]}>{isArabic ? 'القصة' : 'Story'}</Text>
          <Text
            style={[
              styles.shareStoryText,
              scaleText(23, 23 * 1.64),
              { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            {storyText}
          </Text>
        </View>

        {!!quote.evidenceArabic && (
          <View style={styles.shareSection}>
            <Text style={[styles.shareLabel, scaleText(15, 23)]}>{isArabic ? 'الشاهد' : 'Evidence'}</Text>
            {qcfEvidence ? (
              <>
                <Text
                  style={[
                    styles.shareQcfEvidenceText,
                    scaleText(28, 28 * 1.9),
                    { fontFamily: qcfEvidence.fontFamily },
                  ]}
                >
                  {qcfEvidence.text}
                </Text>
                {!isArabic && !!evidenceText && (
                  <Text style={[styles.shareTranslationText, scaleText(15, 15 * 1.65)]}>
                    {evidenceText}
                  </Text>
                )}
              </>
            ) : (
              <Text
                style={[
                  styles.shareEvidenceText,
                  scaleText(22, 22 * 1.6),
                  { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}
              >
                {evidenceText}
              </Text>
            )}
          </View>
        )}

        <View style={styles.shareSection}>
          <Text style={[styles.shareLabel, scaleText(15, 23)]}>{isArabic ? 'الحكمة' : 'Wisdom'}</Text>
          <Text
            style={[
              styles.shareWisdomText,
              scaleText(26, 26 * 1.48),
              { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            {wisdomText}
          </Text>
        </View>

        {!!quote.source && (
          <View style={styles.shareSourceRow}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={16 * scale} color="#D9B84E" />
            <Text style={[styles.shareSourceText, scaleText(16, 24)]}>{quote.source}</Text>
          </View>
        )}
      </View>
    );
  }, [evidenceText, isArabic, isRTL, qcfEvidence, quote.evidenceArabic, quote.source, storyText, styles, wisdomText]);

  const openShareOptions = () => {
    if (String(Platform.OS) === 'web') {
      shareQuoteText();
      return;
    }

    Alert.alert(
      t('home.quoteOfDay'),
      isArabic ? 'اختر طريقة المشاركة' : 'Choose how to share',
      [
        { text: isArabic ? 'كصورة' : 'As image', onPress: shareQuoteImage },
        { text: isArabic ? 'كنص' : 'As text', onPress: shareQuoteText },
        { text: t('common.cancel') || (isArabic ? 'إلغاء' : 'Cancel'), style: 'cancel' },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundWrapper
        backgroundKey={settings.display.appBackground}
        backgroundUrl={settings.display.appBackgroundUrl}
        opacity={settings.display.backgroundOpacity ?? 1}
        style={[styles.container, { backgroundColor: 'transparent' }]}
      >
        {/* Header */}
        <UniversalHeader
          style={{ paddingTop: insets.top }}
          rightActions={[
            { icon: isFav ? 'heart' : 'heart-outline', onPress: toggleFav, color: isFav ? '#ef4444' : colors.text },
            { icon: 'share-variant', onPress: openShareOptions },
          ]}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('home.quoteOfDay')}</Text>
            <SectionInfoButton sectionKey="duas_hadith" />
          </View>
        </UniversalHeader>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: ACCENT + '20' }]}>
              <MaterialCommunityIcons name="book-open-page-variant" size={40} color={ACCENT} />
            </View>
          </View>

          {/* Story text — Arabic for Arabic users, translation for others */}
          <GlassCard intensity={80} borderRadius={16} style={styles.quoteCard}>
            <Text style={[styles.cardLabel, { color: ACCENT, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isArabic ? 'القصة' : 'Story'}
            </Text>
            <Text style={[styles.storyText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {storyText}
            </Text>
          </GlassCard>

          {!!quote.evidenceArabic && (
            <GlassCard intensity={80} borderRadius={16} style={styles.evidenceCard}>
              <Text style={[styles.cardLabel, { color: ACCENT, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {isArabic ? 'الشاهد' : 'Evidence'}
              </Text>
              {qcfEvidence ? (
                <>
                  <Text style={[styles.qcfEvidenceText, { color: colors.text, fontFamily: qcfEvidence.fontFamily }]}>
                    {qcfEvidence.text}
                  </Text>
                  {!isArabic && !!evidenceText && (
                    <Text style={[styles.evidenceTranslationText, { color: colors.muted }]}>
                      {evidenceText}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.evidenceText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {evidenceText}
                </Text>
              )}
            </GlassCard>
          )}

          <GlassCard intensity={80} borderRadius={16} style={styles.wisdomCard}>
            <Text style={[styles.cardLabel, { color: ACCENT, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {isArabic ? 'الحكمة' : 'Wisdom'}
            </Text>
            <Text style={[styles.wisdomText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {wisdomText}
            </Text>
          </GlassCard>

          {/* Source (if available) */}
          {quote.source && (
            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="book-open-page-variant" size={18} color={ACCENT} />
              <Text style={[styles.infoText, { color: colors.muted }]}>
                {quote.source}
              </Text>
            </View>
          )}

          {/* Refresh Button */}
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: ACCENT + '40', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="refresh" size={20} color={ACCENT} />
            <Text style={[styles.refreshText, { color: ACCENT }]}>{t('home.anotherWisdom')}</Text>
          </TouchableOpacity>

          {/* Bottom Padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
        <IslamicShareCard
          ref={shareCardRef}
          categoryLabel={t('home.quoteOfDay')}
          arabicText={wisdomText}
          renderCustomContent={renderWisdomShareContent}
          showOrnaments={false}
          maxLongFontScale={1.75}
          forceLongContentToStory={false}
          footerPlacement="after-content"
        />
        <BannerAdComponent screen="quote_of_day" />
      </BackgroundWrapper>
    </>
  );
}

const _styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteCard: {
    padding: 24,
    marginBottom: 16,
    borderRadius: 16,
  },
  storyText: {
    fontSize: 19,
    fontFamily: fontSemiBold(),
    lineHeight: 34,
  },
  evidenceCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  wisdomCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: fontSemiBold(),
    marginBottom: 10,
    lineHeight: 22,
    includeFontPadding: false,
    alignSelf: 'stretch',
  },
  evidenceText: {
    fontSize: 20,
    fontFamily: fontSemiBold(),
    lineHeight: 34,
  },
  qcfEvidenceText: {
    fontSize: 22,
    lineHeight: 54,
    textAlign: 'right',
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  evidenceTranslationText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: fontMedium(),
    lineHeight: 26,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  wisdomText: {
    fontSize: 18,
    fontFamily: fontBold(),
    lineHeight: 30,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fontMedium(),
    textAlign: 'center',
    lineHeight: 24,
    includeFontPadding: false,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    marginTop: 20,
  },
  refreshText: {
    fontFamily: fontSemiBold(),
    fontSize: 15,
    lineHeight: 26,
    includeFontPadding: false,
  },
  shareContent: {
    width: '100%',
    alignItems: 'stretch',
  },
  shareSection: {
    marginTop: 10,
  },
  shareLabel: {
    color: '#D9B84E',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: SHARE_FONT_BOLD,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  shareStoryText: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 38,
    fontFamily: SHARE_FONT_BOLD,
  },
  shareEvidenceText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 35,
    fontFamily: SHARE_FONT_BOLD,
  },
  shareQcfEvidenceText: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 53,
    textAlign: 'right',
    writingDirection: 'rtl',
    includeFontPadding: true,
  },
  shareTranslationText: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 15,
    lineHeight: 25,
    fontFamily: SHARE_FONT_REGULAR,
    textAlign: 'left',
    writingDirection: 'ltr',
    marginTop: 8,
  },
  shareWisdomText: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 38,
    fontFamily: SHARE_FONT_BOLD,
  },
  shareSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  shareSourceText: {
    color: '#D9B84E',
    fontSize: 16,
    lineHeight: 24,
    fontFamily: SHARE_FONT_BOLD,
    writingDirection: 'rtl',
  },
});
const styles = _styles;
