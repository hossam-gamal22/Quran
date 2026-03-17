// app/settings/translations.tsx
// ترجمات القرآن — اختيار لغة ومصدر الترجمة

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import { t } from '@/lib/i18n';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { GlassCard } from '@/components/ui/GlassCard';
import { TRANSLATION_EDITIONS } from '@/lib/quran-api';
import { useIsRTL } from '@/hooks/use-is-rtl';

const LANGUAGE_NAMES: Record<string, Record<string, string>> = {
  en: { ar: 'الانجليزية', en: 'English' },
  fr: { ar: 'الفرنسية', en: 'French' },
  tr: { ar: 'التركية', en: 'Turkish' },
  ur: { ar: 'الأردية', en: 'Urdu' },
  id: { ar: 'الإندونيسية', en: 'Indonesian' },
  de: { ar: 'الألمانية', en: 'German' },
  es: { ar: 'الإسبانية', en: 'Spanish' },
  hi: { ar: 'الهندية', en: 'Hindi' },
  bn: { ar: 'البنغالية', en: 'Bengali' },
  ms: { ar: 'الملايوية', en: 'Malay' },
  ru: { ar: 'الروسية', en: 'Russian' },
  fa: { ar: 'الفارسية', en: 'Persian' },
};

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  fr: '🇫🇷',
  tr: '🇹🇷',
  ur: '🇵🇰',
  id: '🇮🇩',
  de: '🇩🇪',
  es: '🇪🇸',
  hi: '🇮🇳',
  bn: '🇧🇩',
  ms: '🇲🇾',
  ru: '🇷🇺',
  fa: '🇮🇷',
};

export default function TranslationsScreen() {
  const isRTL = useIsRTL();
  const { settings, isDarkMode, updateDisplay } = useSettings();
  const themeColors = useColors();

  const selectedEdition = settings.display.showTranslation
    ? settings.display.translationEdition || 'none'
    : 'none';

  const colors = {
    foreground: themeColors.foreground,
    muted: themeColors.muted,
    accent: isDarkMode ? '#4ADE80' : '#2f7659',
    divider: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  };

  const grouped = useMemo(() => {
    const map: Record<string, typeof TRANSLATION_EDITIONS> = {};
    for (const ed of TRANSLATION_EDITIONS) {
      if (!map[ed.language]) map[ed.language] = [];
      map[ed.language].push(ed);
    }
    return map;
  }, []);

  const handleSelect = (identifier: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (identifier === 'none') {
      updateDisplay({ showTranslation: false });
    } else {
      updateDisplay({ showTranslation: true, translationEdition: identifier });
    }
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <UniversalHeader title={t('settings.quranTranslations')} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* No Translation */}
          <TouchableOpacity
            style={[styles.editionRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => handleSelect('none')}
          >
            <View style={styles.flagContainer}>
              <MaterialCommunityIcons name="translate-off" size={28} color={colors.muted} />
            </View>
            <View style={styles.editionInfo}>
              <Text style={[styles.editionLang, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.noTranslationOption')}</Text>
            </View>
            {selectedEdition === 'none' && (
              <MaterialCommunityIcons name="check" size={22} color={colors.accent} />
            )}
          </TouchableOpacity>

          {/* Translations grouped by language */}
          {Object.entries(grouped).map(([lang, editions]) => (
            <View key={lang}>
              {editions.map((ed) => (
                <TouchableOpacity
                  key={ed.identifier}
                  style={[styles.editionRow, { borderBottomColor: colors.divider, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => handleSelect(ed.identifier)}
                >
                  <View style={styles.flagContainer}>
                    <Text style={styles.flagEmoji}>{LANGUAGE_FLAGS[lang] || ''}</Text>
                  </View>
                  <View style={styles.editionInfo}>
                    <Text style={[styles.editionLang, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
                      {LANGUAGE_NAMES[lang]?.[isRTL ? 'ar' : 'en'] || lang}
                    </Text>
                    <Text style={[styles.editionName, { color: colors.muted, textAlign: isRTL ? 'right' : 'left' }]}>
                      {ed.name}
                    </Text>
                  </View>
                  {selectedEdition === ed.identifier && (
                    <MaterialCommunityIcons name="check" size={22} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  containerDark: { backgroundColor: 'transparent' },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  editionRow: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flagContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  flagEmoji: {
    fontSize: 28,
  },
  editionInfo: {
    flex: 1,
    marginHorizontal: 4,
  },
  editionLang: {
    fontSize: 16,
    fontFamily: fontSemiBold(),
  },
  editionName: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 2,
  },
});
