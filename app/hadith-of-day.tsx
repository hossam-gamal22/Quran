// app/hadith-of-day.tsx
// صفحة حديث اليوم - حديث يومي من السنة النبوية الشريفة

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
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
import { BrandedCapture, type BrandedCaptureHandle } from '@/components/ui/BrandedCapture';
import { getHadithOfTheDay, getRandomHadith, type DailyHadith, getNarratorDisplay, getSourceDisplay } from '@/data/daily-hadiths';
import { getDailyHadithOverride } from '@/lib/daily-content-override';
import { useFavorite } from '@/hooks/use-favorite';
import { getFavorites } from '@/lib/favorites-manager';

import { useIsRTL } from '@/hooks/use-is-rtl';
const ACCENT = '#6366F1'; // Indigo accent for hadith page

export default function HadithOfDayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();

  const params = useLocalSearchParams<{ favId?: string }>();
  const [hadith, setHadith] = useState<DailyHadith>(() => getHadithOfTheDay());
  const [currentIndex, setCurrentIndex] = useState<number | undefined>(undefined);
  const language = getLanguage();
  const isArabic = language === 'ar';
  const isEnglish = language === 'en';
  const translatedHadith = useAutoTranslate(hadith.translation || hadith.arabic, isArabic ? 'ar' : 'en', 'hadith');
  const [showTranslation, setShowTranslation] = useState(!isArabic);
  const brandedRef = useRef<BrandedCaptureHandle>(null);

  const { saved: isFav, toggle: toggleFav } = useFavorite(
    `hadith_${hadith.narrator}_${hadith.source}`,
    'hadith',
    () => ({
      id: `hadith_${hadith.narrator}_${hadith.source}`,
      type: 'hadith',
      title: hadith.source,
      subtitle: hadith.narrator,
      arabic: hadith.arabic,
      translation: hadith.translation,
      reference: `${hadith.narrator} — ${hadith.source}`,
      route: `/hadith-of-day?favId=hadith_${encodeURIComponent(hadith.narrator)}_${encodeURIComponent(hadith.source)}`,
      meta: { hadithArabic: hadith.arabic, hadithTranslation: hadith.translation || '', hadithNarrator: hadith.narrator, hadithSource: hadith.source },
    }),
  );

  // Load saved hadith from favorites if opened with favId, otherwise check admin override
  useEffect(() => {
    if (params.favId) {
      getFavorites('hadith').then(favs => {
        const fav = favs.find(f => f.id === params.favId);
        if (fav?.meta?.hadithArabic) {
          setHadith({ arabic: String(fav.meta.hadithArabic), translation: String(fav.meta.hadithTranslation || ''), narrator: String(fav.meta.hadithNarrator || ''), source: String(fav.meta.hadithSource || '') });
          return;
        }
        loadDefault();
      }).catch(() => loadDefault());
    } else {
      loadDefault();
    }
    function loadDefault() {
      getDailyHadithOverride().then(({ data }) => {
        if (data) {
          setHadith({ arabic: data.arabic, translation: data.translation, narrator: data.narrator, source: data.source });
        }
      });
    }
  }, [params.favId]);

  const handleRefresh = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { hadith: newHadith, index } = getRandomHadith(currentIndex);
    setHadith(newHadith);
    setCurrentIndex(index);
  }, [currentIndex]);

  const shareAsText = async () => {
    try {
      const parts: string[] = [];
      if (isArabic) {
        parts.push(hadith.arabic);
        if (showTranslation && hadith.translation) parts.push(hadith.translation);
      } else {
        if (hadith.translation) parts.push(hadith.translation);
        else parts.push(hadith.arabic);
      }
      parts.push(`📜 ${hadith.narrator} — ${hadith.source}`, `\n${t('common.fromApp')}`);
      await Share.share({ message: parts.join('\n\n') });
    } catch { /* ignore */ }
  };

  const shareAsImage = async () => {
    try {
      if (!brandedRef.current) return;
      brandedRef.current.showSizePicker();
    } catch { /* ignore */ }
  };

  const handleShare = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('common.share'),
      '',
      [
        { text: t('common.shareText'), onPress: shareAsText },
        { text: t('common.shareImage'), onPress: shareAsImage },
        { text: t('common.cancel'), style: 'cancel' },
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
            { icon: 'share-variant', onPress: handleShare },
          ]}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20, color: colors.text, fontFamily: fontBold() }} numberOfLines={1}>
              {t('home.hadithOfDay')}
            </Text>
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
              <MaterialCommunityIcons name="format-quote-open" size={40} color={ACCENT} />
            </View>
          </View>

          {/* Branded image capture */}
          <BrandedCapture ref={brandedRef} title={t('home.hadithOfDay')}>
            <View style={styles.hadithCardInner}>
              {isArabic ? (
                <Text style={[styles.arabicText, { color: colors.text }]}>
                  {hadith.arabic}
                </Text>
              ) : (
                <Text style={[styles.arabicText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {isEnglish ? (hadith.translation || hadith.arabic) : translatedHadith}
                </Text>
              )}
              <Text style={[styles.referenceCaptureText, { color: ACCENT }]}>
                📜 {getNarratorDisplay(hadith.narrator, isArabic)} — {getSourceDisplay(hadith.source, isArabic)}
              </Text>
            </View>
          </BrandedCapture>

          {/* Hadith card */}
          <GlassCard intensity={46} style={styles.hadithCard}>
            {isArabic ? (
              <Text style={[styles.arabicText, { color: colors.text }]}>
                {hadith.arabic}
              </Text>
            ) : (
              <Text style={[styles.arabicText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {isEnglish ? (hadith.translation || hadith.arabic) : translatedHadith}
              </Text>
            )}
          </GlassCard>

          {/* Translation — only shown for Arabic users who want to see English */}
          {isArabic && showTranslation && hadith.translation && (
            <GlassCard intensity={46} style={styles.translationCard}>
              <Text style={[styles.translationLabel, { color: ACCENT }]}>{t('azkar.translation')}</Text>
              <Text style={[styles.translationText, { color: colors.textLight, writingDirection: 'ltr', textAlign: 'left' }]}>
                {hadith.translation}
              </Text>
            </GlassCard>
          )}

          {/* Narrator */}
          <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="account" size={18} color={ACCENT} />
            <Text style={[styles.infoText, { color: colors.muted }]}>
              {getNarratorDisplay(hadith.narrator, isArabic)}
            </Text>
          </View>

          {/* Source */}
          <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="book-open-page-variant" size={18} color={ACCENT} />
            <Text style={[styles.infoText, { color: colors.muted }]}>
              {getSourceDisplay(hadith.source, isArabic)}
            </Text>
          </View>

          {/* Refresh Button */}
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: ACCENT + '40', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="refresh" size={20} color={ACCENT} />
            <Text style={[styles.refreshButtonText, { color: ACCENT }]}>{t('home.anotherHadith')}</Text>
          </TouchableOpacity>



          {/* Bottom Padding */}
          <View style={{ height: 20 }} />
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
  hadithCard: {
    padding: 24,
    marginBottom: 16,
    borderRadius: 16,
  },
  arabicText: {
    fontSize: 22,
    fontFamily: fontSemiBold(),
    lineHeight: 38,
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
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  hadithCardInner: {
    padding: 24,
    alignItems: 'center',
  },
  translationTextCapture: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 16,
  },
  referenceCaptureText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
});
