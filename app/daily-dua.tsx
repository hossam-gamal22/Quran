// app/daily-dua.tsx
// صفحة دعاء اليوم - مع زر تغيير لعرض أدعية مختلفة

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
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
import { getDuaOfTheDay, getRandomDua, type DailyDua } from '@/data/daily-duas';
import { getDailyDuaOverride } from '@/lib/daily-content-override';
import { useFavorite } from '@/hooks/use-favorite';
import { getFavorites } from '@/lib/favorites-manager';
import { transliterateReference } from '@/lib/source-transliteration';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSacredContext } from '@/hooks/use-sacred-context';
import { Spacing } from '@/constants/theme';
const ACCENT = '#FFFFFF';

export default function DailyDuaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  // Block all ads during dua reading
  useSacredContext('dua_reading');

  const params = useLocalSearchParams<{ favId?: string }>();
  const [dua, setDua] = useState<DailyDua>(() => getDuaOfTheDay());
  const [currentIndex, setCurrentIndex] = useState<number | undefined>(undefined);
  const language = getLanguage();
  const isArabic = language === 'ar';
  const isEnglish = language === 'en';
  const translatedDua = useAutoTranslate(dua.translation || dua.arabic, isArabic ? 'ar' : 'en', 'section');
  const translatedReference = useAutoTranslate(dua.reference || '', 'ar', 'section');
  const [showTranslation, setShowTranslation] = useState(!isArabic);
  const brandedRef = useRef<IslamicShareCardHandle>(null);

  const { saved: isFav, toggle: toggleFav } = useFavorite(
    `dua_${dua.reference}`,
    'dua',
    () => ({
      id: `dua_${dua.reference}`,
      type: 'dua',
      title: dua.reference,
      arabic: dua.arabic,
      translation: dua.translation,
      reference: dua.reference,
      route: `/daily-dua?favId=dua_${encodeURIComponent(dua.reference)}`,
      meta: { duaArabic: dua.arabic, duaTranslation: dua.translation || '', duaReference: dua.reference },
    }),
  );

  // Load saved dua from favorites if opened with favId, otherwise check admin override
  useEffect(() => {
    if (params.favId) {
      getFavorites('dua').then(favs => {
        const fav = favs.find(f => f.id === params.favId);
        if (fav?.meta?.duaArabic) {
          setDua({ arabic: String(fav.meta.duaArabic), translation: String(fav.meta.duaTranslation || ''), reference: String(fav.meta.duaReference || fav.reference || '') });
          return;
        }
        loadDefault();
      }).catch(() => loadDefault());
    } else {
      loadDefault();
    }
    function loadDefault() {
      getDailyDuaOverride().then(({ data, isOverride }) => {
        if (isOverride && data) {
          setDua({ arabic: data.arabic, translation: data.translation, reference: data.reference });
        }
      }).catch(() => {});
    }
  }, [params.favId]);

  const handleRefresh = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { dua: newDua, index } = getRandomDua(currentIndex);
    setDua(newDua);
    setCurrentIndex(index);
  }, [currentIndex]);

  const shareAsText = async () => {
    try {
      const parts: string[] = [];
      if (isArabic) {
        parts.push(dua.arabic);
        if (showTranslation && dua.translation) parts.push(dua.translation);
      } else {
        if (dua.translation) parts.push(dua.translation);
        else parts.push(dua.arabic);
      }
      parts.push(`📖 ${dua.reference}`);
      await Share.share({ message: buildShareText(parts.join('\n\n')) });
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
        style={styles.container}
      >
        {/* Header */}
        <UniversalHeader
          backColor={colors.text}
          style={{ paddingTop: insets.top }}
          rightActions={[
            { icon: isFav ? 'heart' : 'heart-outline', onPress: toggleFav, color: isFav ? '#ef4444' : colors.text },
            { icon: 'share-variant', onPress: handleShare, color: colors.text },
          ]}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {t('home.dailyDua')}
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
              <MaterialCommunityIcons name="book-heart" size={40} color={ACCENT} />
            </View>
          </View>

          {/* Premium Islamic share card */}
          <IslamicShareCard
            ref={brandedRef}
            categoryLabel={t('azkar.duaOfDay')}
            arabicText={dua.arabic}
            sourceText={transliterateReference(dua.reference, language)}
          />

          {/* Visible dua card */}
          <GlassCard intensity={80} borderRadius={20} style={styles.duaCard}>
            {isArabic ? (
              <Text style={[styles.arabicText, { color: colors.text, writingDirection: 'rtl' }]}>
                {dua.arabic}
              </Text>
            ) : (
              <Text style={[styles.arabicText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {isEnglish ? (dua.translation || dua.arabic) : translatedDua}
              </Text>
            )}
          </GlassCard>

          {/* Translation — only shown for Arabic users who want to see English */}
          {isArabic && showTranslation && dua.translation && (
            <GlassCard intensity={80} borderRadius={16} style={styles.translationCard}>
              <Text style={[styles.translationLabel, { color: ACCENT }]}>{t('azkar.translation')}</Text>
              <Text style={[styles.translationText, { color: colors.textLight, writingDirection: 'ltr', textAlign: 'left' }]}>
                {dua.translation}
              </Text>
            </GlassCard>
          )}

          {/* Reference */}
          <View style={[styles.referenceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="book-open-page-variant" size={18} color={ACCENT} />
            <Text style={[styles.referenceText, { color: colors.textLight }]}>
              {transliterateReference(dua.reference, language)}
            </Text>
          </View>

          {/* Refresh Button */}
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: ACCENT + '40', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="refresh" size={20} color={ACCENT} />
            <Text style={[styles.refreshButtonText, { color: ACCENT }]}>{t('azkar.anotherDua')}</Text>
          </TouchableOpacity>



          <Text style={[styles.footerText, { color: colors.textLight }]}>
            {t('azkar.tapForNewDua')}
          </Text>
        </ScrollView>

        <BannerAdComponent screen="daily_dua" />
        <View style={{ height: insets.bottom }} />
      </BackgroundWrapper>
    </>
  );
}

const _styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    lineHeight: 30,
    includeFontPadding: false,
  },
  content: { flex: 1 },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  arabicText: {
    fontSize: 26,
    fontWeight: '500',
    lineHeight: 48,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  translationCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  translationLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 22,
    includeFontPadding: false,
  },
  translationText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'left',
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: 24,
  },
  referenceText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 24,
    includeFontPadding: false,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 26,
    includeFontPadding: false,
  },

  footerText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 22,
    includeFontPadding: false,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 22,
    includeFontPadding: false,
  },
  duaCardInner: {
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
    lineHeight: 22,
    includeFontPadding: false,
  },
});
const styles = _styles;
