// app/daily-dhikr.tsx
// صفحة أذكار يومية — ذكر مختلف كل يوم (محلي + إدارة)

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
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { t, getLanguage } from '@/lib/i18n';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { GlassCard } from '@/components/ui/GlassCard';
import { BrandedCapture, type BrandedCaptureHandle } from '@/components/ui/BrandedCapture';
import { useFavorite } from '@/hooks/use-favorite';
import { getDhikrOfTheDay, getRandomDhikr, type DailyDhikr } from '@/lib/daily-dhikr';
import { getFavorites, type FavoriteItem } from '@/lib/favorites-manager';
import { transliterateReference } from '@/lib/source-transliteration';
import { translateBenefit } from '@/lib/benefit-translations';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing } from '@/constants/theme';
import { fontBold } from '@/lib/fonts';
const ACCENT = '#be123c';

/** Resolve translation value that may be string or {text, verified} object */
function resolveVal(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && 'text' in val) return val.text;
  return undefined;
}

/** Get dhikr text in the user's language, returns { text, isTranslated } */
function getDhikrText(dhikr: DailyDhikr, lang: string): { text: string; isTranslated: boolean } {
  if (lang === 'ar') return { text: dhikr.arabic, isTranslated: true };
  const t = dhikr.translations;
  const translated = resolveVal(t?.[lang]) || resolveVal(t?.en);
  if (translated) return { text: translated, isTranslated: true };
  return { text: dhikr.arabic, isTranslated: false };
}

/** Get benefit text in the user's language, returns { text, isTranslated } */
function getDhikrBenefitText(dhikr: DailyDhikr, lang: string): { text: string; isTranslated: boolean } | undefined {
  if (!dhikr.benefit) return undefined;
  if (lang === 'ar') return { text: dhikr.benefit, isTranslated: true };
  const b = dhikr.benefitTranslations;
  if (b) {
    const translated = b[lang] || b.en;
    if (translated) return { text: translated, isTranslated: true };
  }
  // Use static benefit translations map
  const translated = translateBenefit(dhikr.benefit, lang);
  return { text: translated, isTranslated: translated !== dhikr.benefit };
}

/** Load a saved dhikr from favorites by its dhikr ID */
async function loadSavedDhikr(dhikrId: string): Promise<DailyDhikr | null> {
  try {
    const favs = await getFavorites('dhikr');
    const fav = favs.find(f => f.id === `dhikr_${dhikrId}`);
    if (fav?.meta?.dhikrArabic) {
      return {
        id: dhikrId,
        arabic: String(fav.meta.dhikrArabic),
        reference: String(fav.meta.dhikrReference || fav.reference || ''),
        benefit: fav.meta.benefit ? String(fav.meta.benefit) : undefined,
        source: 'local',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function DailyDhikrScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const language = getLanguage();
  const isArabic = language === 'ar';

  const params = useLocalSearchParams<{ dhikrId?: string }>();
  const [dhikr, setDhikr] = useState<DailyDhikr | null>(null);
  const [loading, setLoading] = useState(true);
  const brandedRef = useRef<BrandedCaptureHandle>(null);

  const { saved: isFav, toggle: toggleFav } = useFavorite(
    dhikr ? `dhikr_${dhikr.id}` : 'dhikr_loading',
    'dhikr',
    () => ({
      id: `dhikr_${dhikr?.id || ''}`,
      type: 'dhikr' as const,
      title: dhikr?.reference || '',
      arabic: dhikr?.arabic || '',
      reference: dhikr?.reference || '',
      route: `/daily-dhikr?dhikrId=${dhikr?.id || ''}`,
      meta: {
        benefit: dhikr?.benefit || '',
        dhikrArabic: dhikr?.arabic || '',
        dhikrReference: dhikr?.reference || '',
      },
    }),
  );

  useEffect(() => {
    // If opened from favorites with a specific dhikrId, try to load from saved favorites first
    if (params.dhikrId) {
      loadSavedDhikr(params.dhikrId).then(saved => {
        if (saved) {
          setDhikr(saved);
          setLoading(false);
        } else {
          getDhikrOfTheDay().then(d => { setDhikr(d); setLoading(false); }).catch(() => setLoading(false));
        }
      });
    } else {
      getDhikrOfTheDay().then(d => {
        setDhikr(d);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [params.dhikrId]);

  const handleRefresh = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDhikr = await getRandomDhikr(dhikr?.id);
    setDhikr(newDhikr);
  }, [dhikr?.id]);

  const shareAsText = async () => {
    if (!dhikr) return;
    try {
      const parts = [dhikr.arabic];
      if (dhikr.benefit) parts.push(`✨ ${dhikr.benefit}`);
      parts.push(`📖 ${dhikr.reference}`, `\n${t('common.fromApp')}`);
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
        { text: t('common.shareImage') || 'Share Image', onPress: shareAsImage },
        { text: t('common.share') + ' ' + t('common.text') || 'Share Text', onPress: shareAsText },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };


  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#111827' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </>
    );
  }

  if (!dhikr) return null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundWrapper
        backgroundKey={settings.display.appBackground}
        backgroundUrl={settings.display.appBackgroundUrl}
        opacity={settings.display.backgroundOpacity ?? 1}
        style={[styles.container, { backgroundColor: settings.display.appBackground !== 'none' ? 'transparent' : (isDarkMode ? '#111827' : '#F3F4F6') }]}
      >
        {/* Header */}
        <UniversalHeader
          backColor={isDarkMode ? '#F9FAFB' : '#1F2937'}
          style={{ paddingTop: insets.top }}
          rightActions={[
            { icon: isFav ? 'heart' : 'heart-outline', onPress: toggleFav, color: isFav ? '#ef4444' : (isDarkMode ? '#F9FAFB' : '#1F2937') },
            { icon: 'share-variant', onPress: handleShare, color: isDarkMode ? '#F9FAFB' : '#1F2937' },
          ]}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Text style={{ fontSize: 18, fontFamily: fontBold(), color: isDarkMode ? '#F9FAFB' : '#1F2937' }} numberOfLines={1}>{t('azkar.dailyAzkar')}</Text>
            <SectionInfoButton sectionKey="azkar" />
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
              <MaterialCommunityIcons name="hands-pray" size={40} color={ACCENT} />
            </View>
          </View>

          {/* Branded image capture */}
          <BrandedCapture ref={brandedRef} title={t('azkar.dailyAzkar')}>
            <View style={[styles.captureInner]}>
              {getDhikrText(dhikr, language).isTranslated ? (
                <Text style={[styles.arabicText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {getDhikrText(dhikr, language).text}
                </Text>
              ) : (
                <TranslatedText from="ar" style={[styles.arabicText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {getDhikrText(dhikr, language).text}
                </TranslatedText>
              )}
              {(() => {
                const benefit = getDhikrBenefitText(dhikr, language);
                if (!benefit) return null;
                return benefit.isTranslated ? (
                  <Text style={[styles.benefitTextCapture, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {benefit.text}
                  </Text>
                ) : (
                  <TranslatedText from="ar" style={[styles.benefitTextCapture, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {benefit.text}
                  </TranslatedText>
                );
              })()}
              <Text style={[styles.referenceCaptureText, { color: ACCENT }]}>
                📖 {transliterateReference(dhikr.reference, language)}
              </Text>
            </View>
          </BrandedCapture>

          {/* Dhikr card */}
          <GlassCard intensity={46} style={styles.dhikrCard}>
            {getDhikrText(dhikr, language).isTranslated ? (
              <Text style={[styles.arabicText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {getDhikrText(dhikr, language).text}
              </Text>
            ) : (
              <TranslatedText from="ar" style={[styles.arabicText, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {getDhikrText(dhikr, language).text}
              </TranslatedText>
            )}
          </GlassCard>

          {/* Benefit / فضل */}
          {(() => {
            const benefit = getDhikrBenefitText(dhikr, language);
            if (!benefit) return null;
            return (
              <GlassCard intensity={46} style={styles.benefitCard}>
                <Text style={[styles.benefitLabel, { color: ACCENT, textAlign: isRTL ? 'right' : 'left' }]}>{t('azkar.dhikrVirtue')}</Text>
                {benefit.isTranslated ? (
                  <Text style={[styles.benefitText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {benefit.text}
                  </Text>
                ) : (
                  <TranslatedText from="ar" style={[styles.benefitText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {benefit.text}
                  </TranslatedText>
                )}
              </GlassCard>
            );
          })()}

          {/* Reference */}
          <View style={[styles.referenceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="book-open-page-variant" size={18} color={ACCENT} />
            <Text style={[styles.referenceText, { color: colors.textLight }]}>
              {transliterateReference(dhikr.reference, language)}
            </Text>
          </View>

          {/* Refresh Button */}
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: ACCENT + '40', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="refresh" size={20} color={ACCENT} />
            <Text style={[styles.refreshButtonText, { color: ACCENT }]}>{t('azkar.anotherDhikr')}</Text>
          </TouchableOpacity>

          {/* Share Buttons */}


          <Text style={[styles.footerText, { color: colors.textLight }]}>
            {t('azkar.dhikrChangesDaily')}
          </Text>
        </ScrollView>

        <View style={{ height: insets.bottom }} />
      </BackgroundWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  dhikrCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  arabicText: {
    fontSize: 26,
    fontWeight: '500',
    lineHeight: 48,
    textAlign: 'center',
    writingDirection: 'rtl',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  benefitCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  benefitLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 16,
    lineHeight: 26,
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
  },

  footerText: {
    textAlign: 'center',
    fontSize: 13,
  },
  captureInner: {
    padding: 24,
    alignItems: 'center',
  },
  benefitTextCapture: {
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
