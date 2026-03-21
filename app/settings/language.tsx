// app/settings/language.tsx
// صفحة اختيار اللغة - روح المسلم

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight, FadeIn } from 'react-native-reanimated';

import { useSettings, Language } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useIsRTL } from '@/hooks/use-is-rtl';

// ========================================
// الثوابت
// ========================================

interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flagIcon: ImageSourcePropType;
  rtl: boolean;
  region: string;
}

const FLAG_IMAGES: Record<Language, ImageSourcePropType> = {
  ar: require('@/assets/images/flags/sa.png'),
  en: require('@/assets/images/flags/us.png'),
  fr: require('@/assets/images/flags/fr.png'),
  de: require('@/assets/images/flags/de.png'),
  es: require('@/assets/images/flags/es.png'),
  tr: require('@/assets/images/flags/tr.png'),
  ur: require('@/assets/images/flags/pk.png'),
  id: require('@/assets/images/flags/id.png'),
  ms: require('@/assets/images/flags/my.png'),
  hi: require('@/assets/images/flags/in.png'),
  bn: require('@/assets/images/flags/bd.png'),
  ru: require('@/assets/images/flags/ru.png'),
};

const LANGUAGES: LanguageInfo[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flagIcon: FLAG_IMAGES.ar, rtl: true, region: 'priority' },
  { code: 'en', name: 'English', nativeName: 'English', flagIcon: FLAG_IMAGES.en, rtl: false, region: 'priority' },
  { code: 'fr', name: 'French', nativeName: 'Français', flagIcon: FLAG_IMAGES.fr, rtl: false, region: 'priority' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flagIcon: FLAG_IMAGES.tr, rtl: false, region: 'other' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flagIcon: FLAG_IMAGES.ur, rtl: true, region: 'other' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flagIcon: FLAG_IMAGES.de, rtl: false, region: 'other' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flagIcon: FLAG_IMAGES.es, rtl: false, region: 'other' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flagIcon: FLAG_IMAGES.hi, rtl: false, region: 'other' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flagIcon: FLAG_IMAGES.bn, rtl: false, region: 'other' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flagIcon: FLAG_IMAGES.id, rtl: false, region: 'other' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flagIcon: FLAG_IMAGES.ms, rtl: false, region: 'other' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flagIcon: FLAG_IMAGES.ru, rtl: false, region: 'other' },
];

const REGION_KEYS = ['priority', 'other'];

const REGION_NAMES: Record<string, Record<string, string>> = {
  priority: { ar: 'اللغات الرئيسية', en: 'Primary Languages', fr: 'Langues principales', de: 'Hauptsprachen', es: 'Idiomas principales', tr: 'Ana Diller', ur: 'بنیادی زبانیں', id: 'Bahasa Utama', ms: 'Bahasa Utama', hi: 'प्राथमिक भाषाएँ', bn: 'প্রাথমিক ভাষা', ru: 'Основные языки' },
  other: { ar: 'لغات أخرى', en: 'Other Languages', fr: 'Autres langues', de: 'Andere Sprachen', es: 'Otros idiomas', tr: 'Diğer Diller', ur: 'دیگر زبانیں', id: 'Bahasa Lain', ms: 'Bahasa Lain', hi: 'अन्य भाषाएँ', bn: 'অন্যান্য ভাষা', ru: 'Другие языки' },
};

// ========================================
// مكونات فرعية
// ========================================

interface LanguageItemProps {
  language: LanguageInfo;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
  isDarkMode: boolean;
  isRTL: boolean;
}

const LanguageItem: React.FC<LanguageItemProps> = ({
  language,
  isSelected,
  onSelect,
  index,
  isDarkMode,
  isRTL,
}) => {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInRight.delay(index * 50).duration(400)}>
      <TouchableOpacity
        style={[
          styles.languageItem,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
          isDarkMode && styles.languageItemDark,
          isSelected && styles.languageItemSelected,
          isSelected && isDarkMode && styles.languageItemSelectedDark,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSelect();
        }}
        activeOpacity={0.7}
      >
        <Image source={language.flagIcon} style={styles.languageFlag} resizeMode="contain" />
        <View style={[styles.languageInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text
            style={[
              styles.languageName,
              { color: colors.text, textAlign: isRTL ? 'right' : 'left' },
              isSelected && styles.languageNameSelected,
            ]}
          >
            {language.nativeName}
          </Text>
          <Text
            style={[
              styles.languageEnglish,
              { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {language.name}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkIcon}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#22C55E" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

interface RegionSectionProps {
  region: string;
  languages: LanguageInfo[];
  selectedLanguage: Language;
  onSelectLanguage: (code: Language) => void;
  isDarkMode: boolean;
  startIndex: number;
  isRTL: boolean;
}

const RegionSection: React.FC<RegionSectionProps> = ({
  region,
  languages,
  selectedLanguage,
  onSelectLanguage,
  isDarkMode,
  startIndex,
  isRTL,
}) => {
  const colors = useColors();
  if (languages.length === 0) return null;

  return (
    <View style={styles.regionSection}>
      <Text style={[styles.regionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
        {region}
      </Text>
      {languages.map((lang, idx) => (
        <LanguageItem
          key={lang.code}
          language={lang}
          isSelected={selectedLanguage === lang.code}
          onSelect={() => onSelectLanguage(lang.code)}
          index={startIndex + idx}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      ))}
    </View>
  );
};

// ========================================
// المكون الرئيسي
// ========================================

export default function LanguageScreen() {
  const router = useRouter();
  const { settings, isDarkMode, updateLanguage, t } = useSettings();
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const isRTL = useIsRTL();

  const getRegionName = (regionKey: string) => {
    const names = REGION_NAMES[regionKey];
    return names?.[settings.language] || names?.en || regionKey;
  };

  const filteredLanguages = LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.includes(searchQuery)
  );

  const handleSelectLanguage = useCallback(
    async (code: Language) => {
      if (code === settings.language) {
        router.back();
        return;
      }

      const selectedLang = LANGUAGES.find((l) => l.code === code);
      const currentLang = LANGUAGES.find((l) => l.code === settings.language);
      const needsRestart = selectedLang?.rtl !== currentLang?.rtl;

      Alert.alert(
        t('settings.changeLanguage'),
        needsRestart
          ? t('settings.languageChangeRTLWarning')
          : t('settings.languageChangeConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: async () => {
              setIsChanging(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              try {
                // updateLanguage handles i18n update, settings save,
                // and app reload if text direction changes (RTL↔LTR)
                await updateLanguage(code);

                if (!needsRestart) {
                  router.back();
                }
              } catch (error) {
                console.error('Error changing language:', error);
                Alert.alert(t('common.error'), t('settings.languageChangeError'));
              } finally {
                setIsChanging(false);
              }
            },
          },
        ]
      );
    },
    [settings.language, router, updateLanguage]
  );

  // تجميع اللغات حسب المنطقة
  const groupedLanguages: { [key: string]: LanguageInfo[] } = {};
  let currentIndex = 0;

  REGION_KEYS.forEach((region) => {
    groupedLanguages[region] = filteredLanguages.filter((l) => l.region === region);
  });

  return (
    <BackgroundWrapper backgroundKey={settings.display.appBackground} backgroundUrl={settings.display.appBackgroundUrl} opacity={settings.display.backgroundOpacity ?? 1} style={{ flex: 1 }}>
    <SafeAreaView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      edges={['top']}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <UniversalHeader title={t('settings.language')} />

      {/* Search Bar */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={styles.searchContainer}
      >
        <View style={[styles.searchBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }, isDarkMode && styles.searchBarDark]}>
          <MaterialCommunityIcons
            name="magnify"
            size={22}
            color={isDarkMode ? '#666' : '#999'}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={t('common.search') + '...'}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={isDarkMode ? '#666' : '#999'}
              />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Info Card */}
      <Animated.View
        entering={FadeInDown.delay(150).duration(500)}
        style={styles.infoCardContainer}
      >
        <View style={[styles.infoCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }, isDarkMode && styles.infoCardDark]}>
          <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
          <Text style={[styles.infoText, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('settings.language')}:{' '}
            <Text style={styles.infoHighlight}>
              {LANGUAGES.find((l) => l.code === settings.language)?.nativeName}
            </Text>
          </Text>
        </View>
      </Animated.View>

      {/* Languages List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {searchQuery.length > 0 ? (
          // عرض نتائج البحث بدون تجميع
          <Animated.View entering={FadeIn.duration(300)}>
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang, idx) => (
                <LanguageItem
                  key={lang.code}
                  language={lang}
                  isSelected={settings.language === lang.code}
                  onSelect={() => handleSelectLanguage(lang.code)}
                  index={idx}
                  isDarkMode={isDarkMode}
                  isRTL={isRTL}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="translate-off"
                  size={48}
                  color={isDarkMode ? '#444' : '#ccc'}
                />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  {t('quran.noResults')}
                </Text>
              </View>
            )}
          </Animated.View>
        ) : (
          // عرض مجمّع حسب المنطقة
          REGION_KEYS.map((region) => {
            const regionLangs = groupedLanguages[region];
            const sectionStartIndex = currentIndex;
            currentIndex += regionLangs.length;

            return (
              <RegionSection
                key={region}
                region={getRegionName(region)}
                languages={regionLangs}
                selectedLanguage={settings.language}
                onSelectLanguage={handleSelectLanguage}
                isDarkMode={isDarkMode}
                startIndex={sectionStartIndex}
                isRTL={isRTL}
              />
            );
          })
        )}

        {/* Footer */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(500)}
          style={styles.footer}
        >
          <MaterialCommunityIcons
            name="translate"
            size={24}
            color={isDarkMode ? '#444' : '#ddd'}
          />
          <Text style={[styles.footerText, { color: colors.textLight }]}>
            12 {t('settings.language')}
          </Text>
          <Text style={[styles.footerSubtext, { color: colors.textLight }]}>
            {t('app.slogan')}
          </Text>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Loading Overlay */}
      {isChanging && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, isDarkMode && styles.loadingCardDark]}>
            <MaterialCommunityIcons name="loading" size={40} color="#22C55E" />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t('common.loading')}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
    </BackgroundWrapper>
  );
}

// ========================================
// الأنماط
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#11151c',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchBarDark: {
    backgroundColor: '#1a1a2e',
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 16,
    fontFamily: fontRegular(),
    color: '#333',
  },
  infoCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  infoCardDark: {
    backgroundColor: '#1a2a3a',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontRegular(),
    color: '#333',
  },
  infoHighlight: {
    fontFamily: fontBold(),
    color: '#22C55E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  regionSection: {
    marginBottom: 20,
  },
  regionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#666',
    marginBottom: 10,
    marginTop: 5,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  languageItemDark: {
    backgroundColor: '#1a1a2e',
  },
  languageItemSelected: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  languageItemSelectedDark: {
    backgroundColor: '#1a2f1a',
    borderColor: '#22C55E',
  },
  languageFlag: {
    width: 36,
    height: 24,
    borderRadius: 4,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontFamily: fontBold(),
    color: '#333',
  },
  languageNameSelected: {
    color: '#22C55E',
  },
  languageEnglish: {
    fontSize: 13,
    fontFamily: fontRegular(),
    color: '#999',
    marginTop: 2,
  },
  rtlBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rtlBadgeText: {
    fontSize: 10,
    fontFamily: fontBold(),
    color: '#666',
  },
  checkIcon: {
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fontRegular(),
    color: '#999',
    marginTop: 15,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#999',
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: fontRegular(),
    color: '#ccc',
  },
  bottomSpace: {
    height: 100,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    gap: 15,
  },
  loadingCardDark: {
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: fontMedium(),
    color: '#333',
  },
});
