// آيات عظمة الله — صفحة عرض الآيات الكونية

import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Share,
} from 'react-native';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useSettings, useTranslation } from '@/contexts/SettingsContext';
import { ScreenContainer } from '@/components/screen-container';
import { UniversalHeader } from '@/components/ui';
import { SectionInfoButton } from '@/components/ui/SectionInfoButton';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COSMIC_VERSES, COSMIC_VERSE_THEMES, CosmicVerse } from '@/data/ayat-universe';
import { BannerAdComponent } from '@/components/ads/BannerAd';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t, getLanguage } from '@/lib/i18n';
import { transliterateReference } from '@/lib/source-transliteration';
import { getDefaultTranslationForLanguage } from '@/lib/quran-api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AyatUniverseScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const colors = useColors();
  const { isDarkMode } = useSettings();
  const { t } = useTranslation();
  const language = getLanguage();
  const isArabic = language === 'ar';
  const [selectedTheme, setSelectedTheme] = useState<string>(COSMIC_VERSE_THEMES[0]?.id ?? '');
  const [translations, setTranslations] = useState<Record<number, string>>({});

  // Fetch verse translations for non-Arabic users
  useEffect(() => {
    if (isArabic) return;
    const edition = getDefaultTranslationForLanguage(language);
    const cacheKey = `@ayat_universe_trans_${edition}`;

    (async () => {
      // Try cache first
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          setTranslations(JSON.parse(cached));
          return;
        }
      } catch {}

      // Fetch all verse translations
      const result: Record<number, string> = {};
      for (const verse of COSMIC_VERSES) {
        try {
          const res = await fetch(`https://api.alquran.cloud/v1/ayah/${verse.surahNumber}:${verse.ayahNumber}/${edition}`);
          const json = await res.json();
          if (json?.data?.text) {
            result[verse.id] = json.data.text;
          }
        } catch {}
      }
      if (Object.keys(result).length > 0) {
        setTranslations(result);
        try { await AsyncStorage.setItem(cacheKey, JSON.stringify(result)); } catch {}
      }
    })();
  }, [isArabic, language]);

  const themeLabels: Record<string, string> = {
    creation: t('ayatUniverse.themeCreation'),
    sky: t('ayatUniverse.themeHeavensEarth'),
    nature: t('ayatUniverse.themeNatureWater'),
    human: t('ayatUniverse.themeHumanCreation'),
    power: t('ayatUniverse.themePowerDominion'),
  };

  const filteredVerses = useMemo(() => {
    if (!selectedTheme) return COSMIC_VERSES;
    return COSMIC_VERSES.filter(v => v.theme === selectedTheme);
  }, [selectedTheme]);

  const shareVerse = async (verse: CosmicVerse) => {
    const ref = isArabic ? verse.reference : transliterateReference(verse.reference, language);
    const text = isArabic ? verse.arabic : (translations[verse.id] || verse.arabic);
    await Share.share({
      message: `﴿ ${text} ﴾\n\n${ref}\n\n${t('common.fromApp')}`,
    });
  };

  const goToSurah = (verse: CosmicVerse) => {
    router.push(`/surah/${verse.surahNumber}?ayah=${verse.ayahNumber}` as any);
  };

  return (
    <ScreenContainer screenKey="ayat_universe">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <UniversalHeader
        style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#fff', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#2a2a3e' : '#eee' }}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 18, fontFamily: fontBold(), color: colors.text }} numberOfLines={1}>{t('ayatUniverse.title')}</Text>
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
          <View style={[styles.introCard, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.85)' : 'rgba(58,124,165,0.85)' }]}>
            <MaterialCommunityIcons name="creation" size={40} color="#fff" />
            <Text style={styles.introTitle}>{t('ayatUniverse.introTitle')}</Text>
            <Text style={styles.introSubtitle}>{t('ayatUniverse.introSubtitle')}</Text>
          </View>
        </Animated.View>

        {/* Theme Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.themesContainer}
          style={[styles.themesScroll, isRTL && { transform: [{ scaleX: -1 }] }]}
        >
          {COSMIC_VERSE_THEMES.map(theme => (
            <TouchableOpacity
              key={theme.id}
              style={[
                styles.themeChip,
                selectedTheme === theme.id && { backgroundColor: theme.color },
                selectedTheme !== theme.id && { backgroundColor: isDarkMode ? '#1a1a2e' : '#fff' },
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
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
                {themeLabels[theme.id] || theme.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Verses */}
        {filteredVerses.map((verse, index) => {
          const themeInfo = COSMIC_VERSE_THEMES.find(t => t.id === verse.theme);
          return (
            <Animated.View key={verse.id} entering={FadeInDown.delay(index * 50).duration(400)}>
              <View style={[styles.verseCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }, { backgroundColor: isDarkMode ? '#1a1a2e' : '#fff' }]}>
                <View style={[styles.verseAccent, { backgroundColor: themeInfo?.color || '#3a7ca5' }]} />
                <View style={styles.verseContent}>
                  <Text style={[
                    styles.verseArabic,
                    { color: colors.text },
                    !isArabic && translations[verse.id] ? { textAlign: 'left', writingDirection: 'ltr' } : undefined,
                  ]}>
                    {isArabic || !translations[verse.id] ? `﴿ ${verse.arabic} ﴾` : translations[verse.id]}
                  </Text>
                  <Text style={[styles.verseRef, { color: colors.muted || '#999', textAlign: isRTL ? 'right' : 'left' }]}>
                    {isArabic ? verse.reference : transliterateReference(verse.reference, language)}
                  </Text>
                  <View style={[styles.verseActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        goToSurah(verse);
                      }}
                    >
                      <MaterialCommunityIcons name="book-open-variant" size={16} color={themeInfo?.color || '#3a7ca5'} />
                      <Text style={[styles.actionBtnText, { color: themeInfo?.color || '#3a7ca5' }]}>{t('ayatUniverse.readInMushaf')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        shareVerse(verse);
                      }}
                    >
                      <MaterialCommunityIcons name="share-variant" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Animated.View>
          );
        })}

        <BannerAdComponent screen="ayat_universe" />
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
    backgroundColor: '#3a7ca5',
  },
  themeChipText: {
    fontSize: 13,
    fontFamily: fontMedium(),
  },
  themeChipTextActive: {
    color: '#fff',
  },
  verseCard: {
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  verseAccent: {
    width: 4,
  },
  verseContent: {
    flex: 1,
    padding: 16,
  },
  verseArabic: {
    fontSize: 20,
    fontFamily: fontBold(),
    lineHeight: 36,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  verseRef: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 8,
  },
  verseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
