// app/quote-of-day.tsx
// صفحة حكمة اليوم - أقوال وحكم إسلامية

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { t, getLanguage } from '@/lib/i18n';
import { useAutoTranslate } from '@/hooks/use-auto-translate';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { getQuoteOfTheDay, getRandomQuote, type IslamicQuote, getAuthorDisplay } from '@/data/quotes';
import { getDailyQuoteOverride } from '@/lib/daily-content-override';
import { useFavorite } from '@/hooks/use-favorite';
import { getFavorites } from '@/lib/favorites-manager';

import { useIsRTL } from '@/hooks/use-is-rtl';
const ACCENT = '#8B5CF6'; // Purple accent for quotes page

export default function QuoteOfDayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();

  const params = useLocalSearchParams<{ favId?: string }>();
  const [quote, setQuote] = useState<IslamicQuote>(() => getQuoteOfTheDay());
  const [currentIndex, setCurrentIndex] = useState<number | undefined>(undefined);
  const language = getLanguage();
  const isArabic = language === 'ar';
  const isEnglish = language === 'en';
  const translatedQuoteText = useAutoTranslate(quote.arabic, 'ar', 'section');
  const translatedQuoteTrans = useAutoTranslate(quote.translation || '', 'en', 'section');

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
      meta: { quoteArabic: quote.arabic, quoteTranslation: quote.translation || '', quoteAuthor: quote.author, quoteSource: quote.source || '' },
    }),
  );

  // Load saved quote from favorites if opened with favId, otherwise check admin override
  useEffect(() => {
    if (params.favId) {
      getFavorites('quote').then(favs => {
        const fav = favs.find(f => f.id === params.favId);
        if (fav?.meta?.quoteArabic) {
          setQuote({ arabic: String(fav.meta.quoteArabic), translation: String(fav.meta.quoteTranslation || ''), author: String(fav.meta.quoteAuthor || ''), source: String(fav.meta.quoteSource || '') });
          return;
        }
        loadDefault();
      }).catch(() => loadDefault());
    } else {
      loadDefault();
    }
    function loadDefault() {
      getDailyQuoteOverride().then(({ data }) => {
        if (data) {
          setQuote({ arabic: data.arabic, translation: data.translation, author: data.author, source: data.source });
        }
      });
    }
  }, [params.favId]);

  const handleRefresh = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { quote: newQuote, index } = getRandomQuote(currentIndex);
    setQuote(newQuote);
    setCurrentIndex(index);
  }, [currentIndex]);

  const shareQuote = async () => {
    try {
      const authorLine = quote.author ? `— ${quote.author}` : '';
      const sourceLine = quote.source ? `📖 ${t('azkar.source')}: ${quote.source}\n` : '';
      await Share.share({
        message: `${quote.arabic}\n\n${quote.translation}\n\n${authorLine}\n${sourceLine}\n${t('common.fromApp')}`,
      });
    } catch { /* ignore */ }
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
            { icon: 'share-variant', onPress: shareQuote },
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
              <MaterialCommunityIcons name="lightbulb-on" size={40} color={ACCENT} />
            </View>
          </View>

          {/* Quote text — Arabic for Arabic users, translation for others */}
          <GlassCard intensity={46} style={styles.quoteCard}>
            {isArabic ? (
              <Text style={[styles.arabicText, { color: colors.text }]}>
                {quote.arabic}
              </Text>
            ) : (
              <Text style={[styles.arabicText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {isEnglish ? (quote.translation || quote.arabic) : (translatedQuoteTrans || quote.translation || quote.arabic)}
              </Text>
            )}
          </GlassCard>

          {/* Author */}
          <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="account-tie" size={18} color={ACCENT} />
            <Text style={[styles.infoText, { color: colors.muted }]}>
              {getAuthorDisplay(quote.author, isArabic)}
            </Text>
          </View>

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
            style={[styles.refreshButton, { backgroundColor: ACCENT, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleRefresh}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#FFF" />
            <Text style={styles.refreshText}>{t('home.anotherWisdom')}</Text>
          </TouchableOpacity>

          {/* Bottom Padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </BackgroundWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
  arabicText: {
    fontSize: 24,
    fontFamily: fontBold(),
    lineHeight: 42,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  translationCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  translationLabel: {
    fontSize: 12,
    fontFamily: fontSemiBold(),
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  translationText: {
    fontSize: 15,
    fontFamily: fontRegular(),
    lineHeight: 26,
    textAlign: 'left',
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
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 20,
    alignSelf: 'center',
  },
  refreshText: {
    fontFamily: fontSemiBold(),
    fontSize: 15,
    color: '#FFF',
  },
});
