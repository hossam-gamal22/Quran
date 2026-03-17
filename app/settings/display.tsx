// app/settings/display.tsx
// إعدادات العرض - حجم الخط ونوعه وطريقة العرض والخلفية

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Dimensions,
  Switch,
  Platform,
} from 'react-native';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings, FontSize, HomeLayout, AppBackgroundKey } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { APP_BACKGROUNDS } from '@/lib/backgrounds';
import { fetchDynamicBackgrounds, type DynamicBackground } from '@/lib/app-config-api';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing } from '@/constants/theme';

const FONT_SIZES: { value: FontSize; labelKey: string; sample: number }[] = [
  { value: 'small', labelKey: 'settings.small', sample: 14 },
  { value: 'medium', labelKey: 'settings.medium', sample: 18 },
  { value: 'large', labelKey: 'settings.large', sample: 22 },
  { value: 'xlarge', labelKey: 'settings.xlarge', sample: 26 },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
const GRID_COLUMNS = 4;
const THUMB_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1) - 32) / GRID_COLUMNS;

export default function DisplaySettingsScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { settings, isDarkMode, updateDisplay, t } = useSettings();
  const colors = useColors();
  const [adminBackgrounds, setAdminBackgrounds] = useState<DynamicBackground[]>([]);

  useEffect(() => {
    fetchDynamicBackgrounds().then(setAdminBackgrounds);
  }, []);

  const handleFontSize = (size: FontSize) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sampleSize = FONT_SIZES.find(f => f.value === size)?.sample ?? 18;
    updateDisplay({ fontSize: size, arabicFontSize: sampleSize });
  };

  const handleSelectBackground = (key: AppBackgroundKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDisplay({
      appBackground: key,
      appBackgroundUrl: undefined,
      appBackgroundTextColor: undefined,
      dynamicBgColor: undefined,
      blurEnabled: false,
      dimEnabled: false,
    } as any);
  };

  const handleSelectAdminBackground = (bg: DynamicBackground) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDisplay({
      appBackground: 'dynamic' as AppBackgroundKey,
      appBackgroundUrl: bg.fullUrl,
      appBackgroundTextColor: bg.textColor || 'white',
      blurEnabled: false,
      dimEnabled: true,
    });
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      style={[styles.container, isDarkMode && styles.containerDark, { backgroundColor: 'transparent' }]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <UniversalHeader title={t('settings.displaySettings')} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* حجم الخط */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.fontSize')}
            </Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              {FONT_SIZES.map((fs) => (
                <TouchableOpacity
                  key={fs.value}
                  style={[
                    styles.option,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    settings.display.fontSize === fs.value && styles.optionSelected,
                  ]}
                  onPress={() => handleFontSize(fs.value)}
                >
                  <Text style={[styles.optionLabel, isDarkMode && styles.textLight, { fontSize: fs.sample, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t(fs.labelKey)}
                  </Text>
                  {settings.display.fontSize === fs.value && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* معاينة */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.preview')}
            </Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark, styles.preview]}>
              <Text
                style={[
                  styles.previewText,
                  isDarkMode && styles.textLight,
                  { fontSize: FONT_SIZES.find(f => f.value === settings.display.fontSize)?.sample || 18 },
                ]}
              >
                {settings.language === 'ar'
                  ? 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'
                  : 'In the name of All\u0101h, the Entirely Merciful, the Especially Merciful.'}
              </Text>
              <Text
                style={[
                  styles.previewSub,
                  isDarkMode && styles.textMuted,
                  { fontSize: (FONT_SIZES.find(f => f.value === settings.display.fontSize)?.sample || 18) - 4 },
                ]}
              >
                {settings.language === 'ar'
                  ? 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'
                  : '[All] praise is [due] to Allāh, Lord of the worlds.'}
              </Text>
            </View>
          </Animated.View>

          {/* شكل الصفحة الرئيسية */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('settings.homeLayout')}
            </Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              {([
                { value: 'grid' as HomeLayout, labelKey: 'settings.grid', icon: 'view-grid' as const },
                { value: 'list' as HomeLayout, labelKey: 'settings.list', icon: 'view-list' as const },
              ]).map((layout) => (
                <TouchableOpacity
                  key={layout.value}
                  style={[
                    styles.option,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    (settings.display.homeLayout || 'grid') === layout.value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateDisplay({ homeLayout: layout.value });
                  }}
                >
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <MaterialCommunityIcons
                      name={layout.icon}
                      size={24}
                      color={(settings.display.homeLayout || 'grid') === layout.value ? '#2f7659' : (isDarkMode ? '#999' : '#666')}
                    />
                    <Text style={[styles.optionLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {t(layout.labelKey)}
                    </Text>
                  </View>
                  {(settings.display.homeLayout || 'grid') === layout.value && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* إظهار زر معلومات القسم ⓘ */}
          <Animated.View entering={FadeInDown.delay(275).duration(400)}>
            <View style={[styles.section, isDarkMode && styles.sectionDark, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
                <MaterialCommunityIcons name="information-outline" size={24} color="#2f7659" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('settings.showSectionInfo')}
                  </Text>
                  <Text style={[{ fontSize: 12, fontFamily: fontRegular(), color: isDarkMode ? '#999' : '#888', textAlign: isRTL ? 'right' : 'left', marginTop: 2 }]}>
                    {t('settings.showSectionInfoDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.display.showSectionInfo !== false}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateDisplay({ showSectionInfo: val });
                }}
                trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#2f7659' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
              />
            </View>
          </Animated.View>

          {/* خلفيات الألوان */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <View style={[styles.bgSectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="palette" size={20} color={isDarkMode ? '#999' : '#666'} />
              <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted, { marginTop: 0, marginBottom: 0, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('settings.colorBackgrounds')}
              </Text>
            </View>
            <View style={styles.bgSeparator} />
            <View style={[styles.section, isDarkMode && styles.sectionDark, { padding: GRID_PADDING }]}>
              {/* Grid of backgrounds */}
              <View style={styles.bgGrid}>
                {/* Built-in background images */}
                {APP_BACKGROUNDS.map((bg) => {
                  const isSelected = settings.display.appBackground === bg.id;
                  return (
                    <TouchableOpacity
                      key={bg.id}
                      onPress={() => handleSelectBackground(bg.id)}
                      style={[
                        styles.bgGridThumb,
                        { width: THUMB_SIZE, height: THUMB_SIZE * 1.4 },
                        isSelected && styles.bgThumbSelected,
                      ]}
                    >
                      <Image
                        source={bg.source}
                        style={[styles.bgGridImage, { width: THUMB_SIZE - 4, height: THUMB_SIZE * 1.4 - 4 }]}
                      />
                      {isSelected && (
                        <View style={styles.bgCheck}>
                          <MaterialCommunityIcons name="check-circle" size={20} color="#2f7659" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                {/* Admin-added backgrounds from Firestore */}
                {adminBackgrounds.map((bg) => {
                  const isSelected = settings.display.appBackground === 'dynamic' && settings.display.appBackgroundUrl === bg.fullUrl;
                  return (
                    <TouchableOpacity
                      key={bg.id}
                      onPress={() => handleSelectAdminBackground(bg)}
                      style={[
                        styles.bgGridThumb,
                        { width: THUMB_SIZE, height: THUMB_SIZE * 1.4 },
                        isSelected && styles.bgThumbSelected,
                      ]}
                    >
                      <ExpoImage
                        source={{ uri: bg.thumbnailUrl }}
                        style={[styles.bgGridImage, { width: THUMB_SIZE - 4, height: THUMB_SIZE * 1.4 - 4 }]}
                        contentFit="cover"
                        transition={200}
                      />
                      {isSelected && (
                        <View style={styles.bgCheck}>
                          <MaterialCommunityIcons name="check-circle" size={20} color="#2f7659" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* خلفيات الصور */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <TouchableOpacity
              style={[styles.section, isDarkMode && styles.sectionDark, styles.photoLink, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/settings/photo-backgrounds');
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}>
                <MaterialCommunityIcons name="image-multiple" size={22} color="#0f987f" />
                <Text style={[styles.optionLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.photoBackgrounds')}</Text>
              </View>
              <MaterialCommunityIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={22} color={isDarkMode ? '#999' : '#666'} />
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#11151c' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 10 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  section: {
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionDark: {
    backgroundColor: 'rgba(120,120,128,0.18)',
  },
  option: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,120,128,0.2)',
  },
  optionSelected: {
    backgroundColor: 'rgba(47,118,89,0.08)',
  },
  optionLabel: {
    fontFamily: fontMedium(),
    color: '#333',
  },
  preview: {
    padding: 20,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewText: {
    fontFamily: fontBold(),
    color: '#333',
    textAlign: 'center',
  },
  previewSub: {
    fontFamily: fontRegular(),
    color: '#666',
    textAlign: 'center',
  },
  // Background grid
  bgSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  bgSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(120,120,128,0.3)',
    marginBottom: 12,
  },
  bgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  bgGridThumb: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgThumbSelected: {
    borderColor: '#2f7659',
  },
  bgGridImage: {
    borderRadius: 10,
  },
  bgCheck: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  photoLink: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 16,
  },
});
