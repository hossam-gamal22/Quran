// أحاديث صفات الله — صفحة عرض الأحاديث النبوية عن صفات الله

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Share,
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useSettings, useTranslation } from '@/contexts/SettingsContext';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { TranslatedText } from '@/components/ui/TranslatedText';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { HADITH_SIFAT, HADITH_SIFAT_THEMES, DivineTrait } from '@/data/hadith-sifat';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { isFavorited, toggleFavorite } from '@/lib/favorites-manager';
import { transliterateReference } from '@/lib/source-transliteration';
import { getLanguage } from '@/lib/i18n';

import { useIsRTL } from '@/hooks/use-is-rtl';

const THEME_LABEL_KEYS: Record<string, string> = {
  mercy: 'hadithSifat.themeMercy',
  greatness: 'hadithSifat.themeGreatness',
  knowledge: 'hadithSifat.themeKnowledge',
  generosity: 'hadithSifat.themeGenerosity',
  closeness: 'hadithSifat.themeCloseness',
};
export default function HadithSifatScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const language = getLanguage();
  const isArabic = language === 'ar';
  const [selectedTheme, setSelectedTheme] = useState<string>(HADITH_SIFAT_THEMES[0]?.id ?? '');
  const [favIds, setFavIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all(HADITH_SIFAT.map(h => isFavorited(`hadith_sifat_${h.id}`, 'hadith_sifat'))).then(results => {
      const ids = new Set<number>();
      results.forEach((fav, i) => { if (fav) ids.add(HADITH_SIFAT[i].id); });
      setFavIds(ids);
    });
  }, []);

  const handleToggleFav = useCallback(async (hadith: DivineTrait) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nowSaved = await toggleFavorite({
      id: `hadith_sifat_${hadith.id}`,
      type: 'hadith_sifat',
      title: hadith.source,
      subtitle: hadith.narrator,
      arabic: hadith.arabic,
      reference: `${hadith.narrator} — ${hadith.source}`,
      route: '/hadith-sifat',
    });
    setFavIds(prev => {
      const next = new Set(prev);
      nowSaved ? next.add(hadith.id) : next.delete(hadith.id);
      return next;
    });
  }, []);

  const filteredHadiths = useMemo(() => {
    if (!selectedTheme) return HADITH_SIFAT;
    return HADITH_SIFAT.filter(h => h.theme === selectedTheme);
  }, [selectedTheme]);

  const shareHadith = async (hadith: DivineTrait) => {
    await Share.share({
      message: `${hadith.arabic}\n\n${t('hadithSifat.narrator')}: ${transliterateReference(hadith.narrator, language)}\n${t('hadithSifat.source')}: ${transliterateReference(hadith.source, language)}\n\n${t('hadithSifat.shareText')}`,
    });
  };

  return (
    <ScreenContainer screenKey="hadith_sifat">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <UniversalHeader
        style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#fff', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#2a2a3e' : '#eee' }}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('hadithSifat.title')}</Text>
          <SectionInfoButton sectionKey="marifat_allah" />
        </View>
      </UniversalHeader>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Card */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={[styles.introCard, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.85)' : 'rgba(193,127,89,0.85)' }]}>
            <MaterialCommunityIcons name="format-quote-open" size={40} color="#fff" />
            <Text style={styles.introTitle}>{t('hadithSifat.introTitle')}</Text>
            <Text style={styles.introSubtitle}>{t('hadithSifat.introSubtitle')}</Text>
          </View>
        </Animated.View>

        {/* Theme Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.themesContainer}
          style={[styles.themesScroll, isRTL && { transform: [{ scaleX: -1 }] }]}
        >
          {HADITH_SIFAT_THEMES.map(theme => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeChip,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
                selectedTheme === theme.id && { backgroundColor: theme.color },
                selectedTheme !== theme.id && { backgroundColor: isDarkMode ? '#1a1a2e' : '#fff' },
                isRTL && { transform: [{ scaleX: -1 }] },
              ]}
              onPress={() => setSelectedTheme(theme.id)}
            >
              <MaterialCommunityIcons
                name={theme.icon as any}
                size={16}
                color={selectedTheme === theme.id ? '#fff' : theme.color}
              />
              <Text style={[
                styles.themeChipText,
                { color: selectedTheme === theme.id ? '#fff' : colors.text },
              ]}>
                {t(THEME_LABEL_KEYS[theme.id] || '') || theme.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hadiths */}
        {filteredHadiths.map((hadith, index) => {
          const themeInfo = HADITH_SIFAT_THEMES.find(t => t.id === hadith.theme);
          return (
            <Animated.View key={hadith.id} entering={FadeInDown.delay(index * 50).duration(400)}>
              <View style={[styles.hadithCard, { backgroundColor: isDarkMode ? '#1a1a2e' : '#fff' }]}>
                <View style={[styles.hadithAccent, { backgroundColor: themeInfo?.color || '#c17f59' }]} />
                <View style={styles.hadithContent}>
                {isArabic ? (
                  <Text style={[styles.hadithArabic, { color: colors.text }]}>
                    {hadith.arabic}
                  </Text>
                ) : (
                  <TranslatedText from="ar" type="section" style={[styles.hadithArabic, { color: colors.text }]}>
                    {hadith.arabic}
                  </TranslatedText>
                )}
                  <View style={styles.hadithMeta}>
                    <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <MaterialCommunityIcons name="account" size={14} color={colors.muted || '#999'} />
                      <Text style={[styles.metaText, { color: colors.muted || '#999' }]}>{transliterateReference(hadith.narrator, language)}</Text>
                    </View>
                    <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <MaterialCommunityIcons name="book-open-variant" size={14} color={colors.muted || '#999'} />
                      <Text style={[styles.metaText, { color: colors.muted || '#999' }]}>{transliterateReference(hadith.source, language)}</Text>
                    </View>
                  </View>
                  <View style={[styles.hadithActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? '#2a2a3e' : '#f5f5f5' }]}
                      onPress={() => handleToggleFav(hadith)}
                    >
                      <MaterialCommunityIcons name={favIds.has(hadith.id) ? 'heart' : 'heart-outline'} size={16} color={favIds.has(hadith.id) ? '#ef4444' : colors.text} />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>{t('common.save')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: isDarkMode ? '#2a2a3e' : '#f5f5f5' }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        shareHadith(hadith);
                      }}
                    >
                      <MaterialCommunityIcons name="share-variant" size={16} color={colors.text} />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>{t('common.share')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Animated.View>
          );
        })}

        <BannerAdComponent screen="hadith_sifat" />
        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({

  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  introCard: {
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 20,
    fontFamily: fontBold(),
    color: '#fff',
    marginTop: 12,
  },
  introSubtitle: {
    fontSize: 14,
    fontFamily: fontRegular(),
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 6,
  },
  themesScroll: { marginBottom: 16 },
  themesContainer: {
    gap: 8,
    paddingHorizontal: 2,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  themeChipActive: {
    backgroundColor: '#c17f59',
  },
  themeChipText: {
    fontSize: 13,
    fontFamily: fontMedium(),
  },
  themeChipTextActive: {
    color: '#fff',
  },
  hadithCard: {
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  hadithAccent: {
    width: 4,
  },
  hadithContent: {
    flex: 1,
    padding: 16,
  },
  hadithArabic: {
    fontSize: 18,
    fontFamily: fontSemiBold(),
    lineHeight: 32,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hadithMeta: {
    marginTop: 12,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    fontFamily: fontRegular(),
  },
  hadithActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: fontMedium(),
  },
});
