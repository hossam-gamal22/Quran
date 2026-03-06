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
  I18nManager,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight, FadeIn } from 'react-native-reanimated';
import * as Updates from 'expo-updates';

import { useSettings, Language } from '@/contexts/SettingsContext';

// ========================================
// الثوابت
// ========================================

interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  region: string;
}

const LANGUAGES: LanguageInfo[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true, region: 'middle_east' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', rtl: false, region: 'global' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', rtl: true, region: 'south_asia' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', rtl: false, region: 'southeast_asia' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', rtl: false, region: 'middle_east' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', rtl: false, region: 'europe' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', rtl: false, region: 'europe' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', rtl: false, region: 'south_asia' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', rtl: false, region: 'south_asia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', rtl: false, region: 'southeast_asia' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', rtl: false, region: 'europe' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', rtl: false, region: 'europe' },
];

const REGION_KEYS = ['middle_east', 'south_asia', 'southeast_asia', 'europe', 'global'];

const REGION_NAMES: Record<string, Record<string, string>> = {
  middle_east: { ar: 'الشرق الأوسط', en: 'Middle East', fr: 'Moyen-Orient', de: 'Naher Osten', es: 'Oriente Medio', tr: 'Orta Doğu', ur: 'مشرق وسطیٰ', id: 'Timur Tengah', ms: 'Timur Tengah', hi: 'मध्य पूर्व', bn: 'মধ্যপ্রাচ্য', ru: 'Ближний Восток' },
  south_asia: { ar: 'جنوب آسيا', en: 'South Asia', fr: 'Asie du Sud', de: 'Südasien', es: 'Asia del Sur', tr: 'Güney Asya', ur: 'جنوبی ایشیا', id: 'Asia Selatan', ms: 'Asia Selatan', hi: 'दक्षिण एशिया', bn: 'দক্ষিণ এশিয়া', ru: 'Южная Азия' },
  southeast_asia: { ar: 'جنوب شرق آسيا', en: 'Southeast Asia', fr: 'Asie du Sud-Est', de: 'Südostasien', es: 'Sudeste Asiático', tr: 'Güneydoğu Asya', ur: 'جنوب مشرقی ایشیا', id: 'Asia Tenggara', ms: 'Asia Tenggara', hi: 'दक्षिण पूर्व एशिया', bn: 'দক্ষিণ-পূর্ব এশিয়া', ru: 'Юго-Восточная Азия' },
  europe: { ar: 'أوروبا', en: 'Europe', fr: 'Europe', de: 'Europa', es: 'Europa', tr: 'Avrupa', ur: 'یورپ', id: 'Eropa', ms: 'Eropah', hi: 'यूरोप', bn: 'ইউরোপ', ru: 'Европа' },
  global: { ar: 'عالمي', en: 'Global', fr: 'Mondial', de: 'Global', es: 'Global', tr: 'Küresel', ur: 'عالمی', id: 'Global', ms: 'Global', hi: 'वैश्विक', bn: 'বৈশ্বিক', ru: 'Глобальный' },
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
}

const LanguageItem: React.FC<LanguageItemProps> = ({
  language,
  isSelected,
  onSelect,
  index,
  isDarkMode,
}) => {
  return (
    <Animated.View entering={FadeInRight.delay(index * 50).duration(400)}>
      <TouchableOpacity
        style={[
          styles.languageItem,
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
        <Text style={styles.languageFlag}>{language.flag}</Text>
        <View style={styles.languageInfo}>
          <Text
            style={[
              styles.languageName,
              isDarkMode && styles.textLight,
              isSelected && styles.languageNameSelected,
            ]}
          >
            {language.nativeName}
          </Text>
          <Text
            style={[
              styles.languageEnglish,
              isDarkMode && styles.textMuted,
            ]}
          >
            {language.name}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkIcon}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#2f7659" />
          </View>
        )}
        {isSelected && (
          <View style={styles.checkIcon}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#2f7659" />
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
}

const RegionSection: React.FC<RegionSectionProps> = ({
  region,
  languages,
  selectedLanguage,
  onSelectLanguage,
  isDarkMode,
  startIndex,
}) => {
  if (languages.length === 0) return null;

  return (
    <View style={styles.regionSection}>
      <Text style={[styles.regionTitle, isDarkMode && styles.textMuted]}>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const isRTL = I18nManager.isRTL;

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
        'تغيير اللغة',
        needsRestart
          ? `سيتم تغيير اللغة إلى ${selectedLang?.nativeName}.\n\nنظراً لاختلاف اتجاه الكتابة، سيتم إعادة تشغيل التطبيق.`
          : `سيتم تغيير اللغة إلى ${selectedLang?.nativeName}.`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'تأكيد',
            onPress: async () => {
              setIsChanging(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              try {
                await updateLanguage(code);

                if (needsRestart) {
                  // تغيير اتجاه الواجهة
                  const isRTL = selectedLang?.rtl || false;
                  I18nManager.allowRTL(isRTL);
                  I18nManager.forceRTL(isRTL);

                  // إعادة تحميل التطبيق
                  if (!__DEV__) {
                    await Updates.reloadAsync();
                  } else {
                    Alert.alert(
                      'وضع التطوير',
                      'في وضع التطوير، يرجى إعادة تشغيل التطبيق يدوياً لتطبيق التغييرات.',
                      [{ text: 'حسناً', onPress: () => router.back() }]
                    );
                  }
                } else {
                  router.back();
                }
              } catch (error) {
                console.error('Error changing language:', error);
                Alert.alert('خطأ', 'حدث خطأ أثناء تغيير اللغة');
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
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.containerDark]}
      edges={['top']}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#11151c' : '#fff'}
      />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={[styles.header, isDarkMode && styles.headerDark]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <MaterialCommunityIcons
            name={isRTL ? 'arrow-right' : 'arrow-left'}
            size={28}
            color={isDarkMode ? '#fff' : '#333'}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>{t('settings.language')}</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={styles.searchContainer}
      >
        <View style={[styles.searchBar, isDarkMode && styles.searchBarDark]}>
          <MaterialCommunityIcons
            name="magnify"
            size={22}
            color={isDarkMode ? '#666' : '#999'}
          />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.textLight]}
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
        <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
          <MaterialCommunityIcons name="information" size={20} color="#3a7ca5" />
          <Text style={[styles.infoText, isDarkMode && styles.textMuted]}>
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
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="translate-off"
                  size={48}
                  color={isDarkMode ? '#444' : '#ccc'}
                />
                <Text style={[styles.emptyText, isDarkMode && styles.textMuted]}>
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
          <Text style={[styles.footerText, isDarkMode && styles.textMuted]}>
            12 {t('settings.language')}
          </Text>
          <Text style={[styles.footerSubtext, isDarkMode && styles.textMuted]}>
            {t('app.slogan')}
          </Text>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Loading Overlay */}
      {isChanging && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, isDarkMode && styles.loadingCardDark]}>
            <MaterialCommunityIcons name="loading" size={40} color="#2f7659" />
            <Text style={[styles.loadingText, isDarkMode && styles.textLight]}>
              {t('common.loading')}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerDark: {
    backgroundColor: '#1a1a2e',
    borderBottomColor: '#2a2a3e',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  headerPlaceholder: {
    width: 40,
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
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
    fontFamily: 'Cairo-Regular',
    color: '#333',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
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
    fontFamily: 'Cairo-Regular',
    color: '#333',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  infoHighlight: {
    fontFamily: 'Cairo-Bold',
    color: '#2f7659',
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
    fontFamily: 'Cairo-Bold',
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
  },
  languageItemDark: {
    backgroundColor: '#1a1a2e',
  },
  languageItemSelected: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#2f7659',
  },
  languageItemSelectedDark: {
    backgroundColor: '#1a2f1a',
    borderColor: '#2f7659',
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
    marginLeft: 0,
  },
  languageName: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  languageNameSelected: {
    color: '#2f7659',
  },
  languageEnglish: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    color: '#999',
    marginTop: 2,
  },
  rtlBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 10,
  },
  rtlBadgeText: {
    fontSize: 10,
    fontFamily: 'Cairo-Bold',
    color: '#666',
  },
  checkIcon: {
    marginRight: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Bold',
    color: '#999',
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
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
    fontFamily: 'Cairo-Medium',
    color: '#333',
  },
});
