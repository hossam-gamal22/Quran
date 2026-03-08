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
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { TRANSLATION_EDITIONS } from '@/lib/quran-api';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'الانجليزية',
  fr: 'الفرنسية',
  tr: 'التركية',
  ur: 'الأردية',
  id: 'الإندونيسية',
  de: 'الألمانية',
  es: 'الإسبانية',
  hi: 'الهندية',
  bn: 'البنغالية',
  ms: 'الملايوية',
  ru: 'الروسية',
  fa: 'الفارسية',
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
  const router = useRouter();
  const { settings, isDarkMode, updateDisplay } = useSettings();

  const selectedEdition = settings.display.showTranslation
    ? settings.display.translationEdition || 'none'
    : 'none';

  const colors = {
    foreground: isDarkMode ? '#FFFFFF' : '#1C1C1E',
    muted: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
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
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'}
              size={28}
              color={colors.foreground}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            ترجمات القرآن
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* No Translation */}
          <TouchableOpacity
            style={[styles.editionRow, { borderBottomColor: colors.divider }]}
            onPress={() => handleSelect('none')}
          >
            <View style={styles.flagContainer}>
              <MaterialCommunityIcons name="translate-off" size={28} color={colors.muted} />
            </View>
            <View style={styles.editionInfo}>
              <Text style={[styles.editionLang, { color: colors.foreground }]}>بدون ترجمة</Text>
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
                  style={[styles.editionRow, { borderBottomColor: colors.divider }]}
                  onPress={() => handleSelect(ed.identifier)}
                >
                  <View style={styles.flagContainer}>
                    <Text style={styles.flagEmoji}>{LANGUAGE_FLAGS[lang] || '🌐'}</Text>
                  </View>
                  <View style={styles.editionInfo}>
                    <Text style={[styles.editionLang, { color: colors.foreground }]}>
                      {LANGUAGE_NAMES[lang] || lang}
                    </Text>
                    <Text style={[styles.editionName, { color: colors.muted }]}>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#11151c' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  editionRow: {
    flexDirection: 'row',
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
    marginLeft: 12,
  },
  flagEmoji: {
    fontSize: 28,
  },
  editionInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 4,
  },
  editionLang: {
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'right',
  },
  editionName: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    textAlign: 'right',
    marginTop: 2,
  },
});
