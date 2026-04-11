// app/sunnah-dua-daily.tsx
// صفحة دعاء يومي من السنة — يعرض دعاء مختلف كل يوم من أدعية السنة النبوية

import React, { useState, useCallback, useRef, useMemo } from 'react';
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
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { t, getLanguage } from '@/lib/i18n';
import { useAutoTranslate } from '@/hooks/use-auto-translate';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { IslamicShareCard, type IslamicShareCardHandle } from '@/components/ui/IslamicShareCard';
import { getAllAzkar, getZikrTranslation, getCategoryById, getCategoryName, type Zikr, type Language, type AzkarCategoryType } from '@/lib/azkar-api';
import { useFavorite } from '@/hooks/use-favorite';
import { transliterateReference } from '@/lib/source-transliteration';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSacredContext } from '@/hooks/use-sacred-context';
import { Spacing } from '@/constants/theme';

const ACCENT = '#FFFFFF';

// Sunnah dua categories (excluding Quran duas cat 26, and very specific situational ones)
const SUNNAH_DUA_CATEGORIES = [
  '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
  '46', '47', '48', '49', '61', '62', '63', '64', '65', '66', '67', '68',
  '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80',
  '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92',
  '93', '94', '95', '96', '97', '98', '99', '100', '101', '102', '103',
  '104', '105', '106', '107', '108', '109', '110', '111', '112', '113',
  '114', '115', '116', '117', '118', '119', '120', '121', '122', '123',
  '124', '125', '126', '127', '128', '129', '130', '131', '132',
];

/** Get day of year (1-366) */
function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Get today's sunnah dua by day of year */
function getSunnahDuaOfDay(duas: Zikr[]): { dua: Zikr; index: number } {
  if (duas.length === 0) return { dua: {} as Zikr, index: 0 };
  const dayOfYear = getDayOfYear();
  const index = dayOfYear % duas.length;
  return { dua: duas[index], index };
}

/** Get a random dua, excluding current index */
function getRandomSunnahDua(duas: Zikr[], excludeIndex?: number): { dua: Zikr; index: number } {
  if (duas.length <= 1) return { dua: duas[0], index: 0 };
  let idx: number;
  do {
    idx = Math.floor(Math.random() * duas.length);
  } while (idx === excludeIndex);
  return { dua: duas[idx], index: idx };
}

/** Get category label for a dua */
function getDuaCategoryLabel(dua: Zikr, language: Language): string {
  const catId = String(dua.category) as AzkarCategoryType;
  const cat = getCategoryById(catId);
  if (!cat) return '';
  return getCategoryName(cat, language);
}

export default function SunnahDuaDailyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  useSacredContext('dua_reading');

  const sunnahDuas = useMemo(() => {
    const all = getAllAzkar();
    const catSet = new Set(SUNNAH_DUA_CATEGORIES);
    return all.filter(z => catSet.has(String(z.category)));
  }, []);

  const initial = useMemo(() => getSunnahDuaOfDay(sunnahDuas), [sunnahDuas]);

  const [currentDua, setCurrentDua] = useState<Zikr>(initial.dua);
  const [currentIndex, setCurrentIndex] = useState<number>(initial.index);

  const language = getLanguage() as Language;
  const isArabic = language === 'ar';
  const isEnglish = language === 'en';

  const translationText = getZikrTranslation(currentDua, isEnglish ? 'en' : language);
  const translatedDua = useAutoTranslate(translationText, isArabic ? 'ar' : 'en', 'section');
  const translatedReference = useAutoTranslate(currentDua.reference || '', 'ar', 'section');
  const [showTranslation, setShowTranslation] = useState(!isArabic);
  const brandedRef = useRef<IslamicShareCardHandle>(null);

  const categoryLabel = useMemo(() => getDuaCategoryLabel(currentDua, language), [currentDua, language]);

  const { saved: isFav, toggle: toggleFav } = useFavorite(
    `sunnah_dua_${currentDua.id}`,
    'dua',
    () => ({
      id: `sunnah_dua_${currentDua.id}`,
      type: 'dua',
      title: categoryLabel || t('home.selectedDuas'),
      arabic: currentDua.arabic,
      translation: translationText !== currentDua.arabic ? translationText : undefined,
      reference: currentDua.reference,
      route: `/sunnah-dua-daily`,
      meta: { duaArabic: currentDua.arabic, duaTranslation: translationText, duaReference: currentDua.reference },
    }),
  );

  const handleRefresh = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { dua, index } = getRandomSunnahDua(sunnahDuas, currentIndex);
    setCurrentDua(dua);
    setCurrentIndex(index);
  }, [currentIndex, sunnahDuas]);

  const shareAsText = async () => {
    try {
      const parts: string[] = [];
      parts.push(currentDua.arabic);
      if (showTranslation && translationText !== currentDua.arabic) {
        parts.push(translationText);
      }
      if (currentDua.reference) parts.push(`📖 ${currentDua.reference}`);
      if (categoryLabel) parts.push(`📿 ${categoryLabel}`);
      parts.push(`\n${t('common.fromApp')}`);
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

  if (!currentDua?.arabic) return null;

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
              {t('home.selectedDuas')}
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
              <MaterialCommunityIcons name="hand-heart" size={40} color={ACCENT} />
            </View>
          </View>

          {/* Premium Islamic share card (hidden, for image export) */}
          <IslamicShareCard
            ref={brandedRef}
            categoryLabel={t('home.selectedDuas')}
            arabicText={currentDua.arabic}
            sourceText={transliterateReference(currentDua.reference || '', language)}
          />

          {/* Category label */}
          {categoryLabel ? (
            <View style={styles.categoryBadge}>
              <Text style={[styles.categoryText, { color: ACCENT }]}>
                {categoryLabel}
              </Text>
            </View>
          ) : null}

          {/* Visible dua card */}
          <GlassCard intensity={80} borderRadius={20} style={styles.duaCard}>
            <Text style={[styles.arabicText, { color: colors.text, writingDirection: 'rtl', textAlign: 'center' }]}>
              {currentDua.arabic}
            </Text>
          </GlassCard>

          {/* Translation */}
          {isArabic && showTranslation && translationText !== currentDua.arabic && (
            <GlassCard intensity={80} borderRadius={16} style={styles.translationCard}>
              <Text style={[styles.translationLabel, { color: ACCENT }]}>{t('azkar.translation')}</Text>
              <Text style={[styles.translationText, { color: colors.textLight, writingDirection: 'ltr', textAlign: 'left' }]}>
                {translationText}
              </Text>
            </GlassCard>
          )}

          {!isArabic && translatedDua && translatedDua !== currentDua.arabic && (
            <GlassCard intensity={80} borderRadius={16} style={styles.translationCard}>
              <Text style={[styles.translationLabel, { color: ACCENT }]}>{t('azkar.translation')}</Text>
              <Text style={[styles.translationText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {isEnglish ? translationText : translatedDua}
              </Text>
            </GlassCard>
          )}

          {/* Reference */}
          {currentDua.reference ? (
            <View style={[styles.referenceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="book-open-page-variant" size={18} color={ACCENT} />
              <Text style={[styles.referenceText, { color: colors.textLight }]}>
                {transliterateReference(currentDua.reference, language)}
              </Text>
            </View>
          ) : null}

          {/* Counter */}
          <Text style={[styles.counterText, { color: colors.textLight }]}>
            {currentIndex + 1} / {sunnahDuas.length}
          </Text>

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
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    lineHeight: 22,
    includeFontPadding: false,
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
    marginBottom: 12,
  },
  referenceText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 24,
    includeFontPadding: false,
  },
  counterText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 22,
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
});
