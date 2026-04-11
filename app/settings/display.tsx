// app/settings/display.tsx
// إعدادات العرض - حجم الخط ونوعه وطريقة العرض والخلفية

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Switch,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { fontBold, fontMedium, fontRegular } from '@/lib/fonts';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { useSettings, FontSize, HomeLayout, AppBackgroundKey, ThemeMode } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { APP_BACKGROUNDS, BACKGROUND_SOURCE_MAP } from '@/lib/backgrounds';
import { fetchDynamicBackgrounds, type DynamicBackground } from '@/lib/app-config-api';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { Spacing, Colors, DarkColors } from '@/constants/theme';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { FREE_PEXELS_BACKGROUNDS, PREMIUM_PEXELS_BACKGROUNDS, BACKGROUND_CATEGORIES, type PexelsBackground } from '@/constants/pexels-backgrounds';
import { cacheBackgroundOnSelect, getCachedBackgroundUri } from '@/lib/background-cache';

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
  const { settings, isDarkMode, updateDisplay, updateTheme, t, updateThemeAndDisplay } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const { isPremium } = useSubscription();
  const [adminBackgrounds, setAdminBackgrounds] = useState<DynamicBackground[]>([]);
  const [mergedBuiltIn, setMergedBuiltIn] = useState(APP_BACKGROUNDS.map(bg => ({ ...bg, is_premium: false })));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchDynamicBackgrounds().then(setAdminBackgrounds).catch(() => {});
    // Show all built-in backgrounds by default (7 color backgrounds)
    setMergedBuiltIn(APP_BACKGROUNDS.map(bg => ({ ...bg, is_premium: false })));
  }, []);

  // Theme mode options
  const THEME_MODES: { value: ThemeMode; labelKey: string; descKey: string; icon: 'weather-sunny' | 'weather-night' | 'cellphone-cog' | 'palette' }[] = [
    { value: 'light', labelKey: 'settings.lightMode', descKey: 'settings.lightModeDesc', icon: 'weather-sunny' },
    { value: 'dark', labelKey: 'settings.darkMode', descKey: 'settings.darkModeDesc', icon: 'weather-night' },
    { value: 'system', labelKey: 'settings.systemMode', descKey: 'settings.systemModeDesc', icon: 'cellphone-cog' },
    { value: 'custom', labelKey: 'settings.customBackground', descKey: 'settings.customBackgroundDesc', icon: 'palette' },
  ];

  const handleThemeChange = (mode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mode !== 'custom') {
      // Set theme + background='none' atomically
      updateThemeAndDisplay(mode, { appBackground: 'none' } as any);
    } else {
      // Set theme + default background atomically
      const bg = settings.display.appBackground === 'none' ? 'background1' : settings.display.appBackground;
      updateThemeAndDisplay(mode, { appBackground: bg } as any);
    }
  };

  const handleFontSize = (size: FontSize) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const sampleSize = FONT_SIZES.find(f => f.value === size)?.sample ?? 18;
    updateDisplay({ fontSize: size, arabicFontSize: sampleSize });
  };

  const handleSelectBackground = (key: AppBackgroundKey, bgIsPremium?: boolean) => {
    if (bgIsPremium && !isPremium) {
      router.push('/subscription');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Use updateThemeAndDisplay to ensure both theme and background update atomically
    if (key === 'none') {
      // When selecting "no background", switch to dark theme
      updateThemeAndDisplay('dark', {
        appBackground: 'none',
        appBackgroundUrl: undefined,
        appBackgroundTextColor: undefined,
        dynamicBgColor: undefined,
        blurEnabled: false,
        dimEnabled: false,
      } as any);
    } else {
      // When selecting a background, ensure theme is 'custom'
      updateThemeAndDisplay('custom', {
        appBackground: key,
        appBackgroundUrl: undefined,
        appBackgroundTextColor: undefined,
        dynamicBgColor: undefined,
        blurEnabled: false,
        dimEnabled: false,
      } as any);
    }
  };

  const handleSelectAdminBackground = (bg: DynamicBackground) => {
    if (bg.is_premium && !isPremium) {
      router.push('/subscription');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDisplay({
      appBackground: 'dynamic' as AppBackgroundKey,
      appBackgroundUrl: bg.fullUrl,
      appBackgroundTextColor: bg.textColor || 'white',
      blurEnabled: false,
      dimEnabled: true,
    });
  };

  const handleSelectPexelsPhoto = async (photo: PexelsBackground) => {
    if (photo.isPremium && !isPremium) {
      router.push('/subscription');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // First check if we have a cached version
    const cachedUri = await getCachedBackgroundUri(photo.id, 'large2x');
    
    updateDisplay({
      appBackground: 'dynamic' as AppBackgroundKey,
      appBackgroundUrl: cachedUri || photo.src.large2x,
      appBackgroundTextColor: 'white',
      blurEnabled: false,
      dimEnabled: true,
    });
    
    // Cache the background for offline use (in background)
    if (!cachedUri) {
      cacheBackgroundOnSelect(photo.id, photo.src.large2x);
    }
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />

        {/* Header */}
        <UniversalHeader title={t('settings.displaySettings')} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* حجم الخط */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('settings.fontSize')}
            </Text>
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
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
                  <Text style={[styles.optionLabel, { color: colors.text, fontSize: fs.sample, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t(fs.labelKey)}
                  </Text>
                  {settings.display.fontSize === fs.value && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* معاينة */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('settings.preview')}
            </Text>
            <View style={[styles.section, { backgroundColor: colors.card }, styles.preview]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
              <Text
                style={[
                  styles.previewText,
                  { color: colors.text, fontSize: FONT_SIZES.find(f => f.value === settings.display.fontSize)?.sample || 18 },
                ]}
              >
                {settings.language === 'ar'
                  ? 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'
                  : 'In the name of All\u0101h, the Entirely Merciful, the Especially Merciful.'}
              </Text>
              <Text
                style={[
                  styles.previewSub,
                  { color: colors.textLight, fontSize: (FONT_SIZES.find(f => f.value === settings.display.fontSize)?.sample || 18) - 4 },
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
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('settings.homeLayout')}
            </Text>
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
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
                      color={(settings.display.homeLayout || 'grid') === layout.value ? '#0d8e62' : colors.icon}
                    />
                    <Text style={[styles.optionLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                      {t(layout.labelKey)}
                    </Text>
                  </View>
                  {(settings.display.homeLayout || 'grid') === layout.value && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* إظهار زر معلومات القسم ⓘ */}
          <Animated.View entering={FadeInDown.delay(275).duration(400)}>
            <View style={[styles.section, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 }]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
              <MaterialCommunityIcons name="information-outline" size={24} color="#0d8e62" />
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[styles.optionLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('settings.showSectionInfo')}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: fontRegular(), color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', marginTop: 2 }}>
                  {t('settings.showSectionInfoDesc')}
                </Text>
              </View>
              <Switch
                value={settings.display.showSectionInfo !== false}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateDisplay({ showSectionInfo: val });
                }}
                trackColor={{ false: isDarkMode ? '#39393D' : '#E9E9EB', true: '#0d8e62' }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                ios_backgroundColor={isDarkMode ? '#39393D' : '#E9E9EB'}
              />
            </View>
          </Animated.View>

          {/* المظهر - Theme Mode */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('settings.appearance')}
            </Text>
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
              {THEME_MODES.map((mode, index) => (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.option,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    settings.theme === mode.value && styles.optionSelected,
                    index === THEME_MODES.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => handleThemeChange(mode.value)}
                >
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
                    <MaterialCommunityIcons
                      name={mode.icon}
                      size={24}
                      color={settings.theme === mode.value ? '#0d8e62' : colors.icon}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                        {t(mode.labelKey)}
                      </Text>
                      <Text style={[{ fontSize: 12, fontFamily: fontRegular(), color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr', marginTop: 2 }]}>
                        {t(mode.descKey)}
                      </Text>
                    </View>
                  </View>
                  {settings.theme === mode.value && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* خلفيات مخصصة - يظهر فقط عند اختيار "خلفية مخصصة" */}
          {settings.theme === 'custom' && (
            <>
              {/* ═══════════ قسم خلفيات الألوان ═══════════ */}
              <Animated.View entering={FadeInDown.delay(350).duration(400)}>
                <View style={[styles.bgSectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <MaterialCommunityIcons name="palette" size={20} color={colors.icon} />
                  <Text style={[styles.sectionTitle, { color: colors.textLight, marginTop: 0, marginBottom: 0, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t('settings.colorBackgrounds')}
                  </Text>
                </View>
                <View style={styles.bgSeparator} />
                <View style={[styles.section, { backgroundColor: colors.card, padding: GRID_PADDING }]}>
                  {Platform.OS === 'ios' && (
                    <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                  )}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                  <View style={styles.bgGrid}>
                    {/* بدون خلفية — None */}
                    <TouchableOpacity
                      onPress={() => handleSelectBackground('none' as AppBackgroundKey)}
                      style={[
                        styles.bgGridThumb,
                        { width: THUMB_SIZE, height: THUMB_SIZE * 1.4, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
                        settings.display.appBackground === 'none' && styles.bgThumbSelected,
                      ]}
                    >
                      <MaterialCommunityIcons name="cancel" size={28} color={colors.textLight} />
                      <Text style={{ fontSize: 10, fontFamily: fontMedium(), color: colors.textLight, marginTop: 4 }}>
                        {t('settings.noBackground')}
                      </Text>
                      {settings.display.appBackground === 'none' && (
                        <View style={[styles.bgCheck, { [isRTL ? 'left' : 'right']: 4 }]}>
                          <MaterialCommunityIcons name="check-circle" size={20} color="#0d8e62" />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Built-in color backgrounds — free */}
                    {mergedBuiltIn.filter(bg => !bg.is_premium).map((bg) => {
                      const isSelected = settings.display.appBackground === bg.id;
                      return (
                        <TouchableOpacity
                          key={bg.id}
                          onPress={() => handleSelectBackground(bg.id)}
                          style={[
                            styles.bgGridThumb,
                            { width: THUMB_SIZE, height: THUMB_SIZE * 1.4, backgroundColor: bg.dominantColor },
                            isSelected && styles.bgThumbSelected,
                          ]}
                        >
                          <Image
                            source={bg.source}
                            resizeMode="cover"
                            style={{ width: THUMB_SIZE - 4, height: THUMB_SIZE * 1.4 - 4, borderRadius: 10 }}
                          />
                          {isSelected && (
                            <View style={[styles.bgCheck, { [isRTL ? 'left' : 'right']: 4 }]}>
                              <MaterialCommunityIcons name="check-circle" size={20} color="#0d8e62" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Premium color backgrounds */}
                  {mergedBuiltIn.some(bg => bg.is_premium) && (
                    <>
                      <View style={[styles.premiumDivider, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons name="crown" size={14} color={isDarkMode ? "#FFC107" : "#9A7100"} />
                        <Text style={[styles.premiumLabel, { color: colors.textLight }, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                          {t('common.premiumOnly')}
                        </Text>
                        {!isPremium && (
                          <View style={styles.premiumLockBadge}>
                            <MaterialCommunityIcons name="lock" size={12} color={colors.textLight} />
                          </View>
                        )}
                      </View>
                      <View style={styles.bgGrid}>
                        {mergedBuiltIn.filter(bg => bg.is_premium).map((bg) => {
                          const isSelected = settings.display.appBackground === bg.id;
                          return (
                            <TouchableOpacity
                              key={bg.id}
                              onPress={() => handleSelectBackground(bg.id, true)}
                              style={[
                                styles.bgGridThumb,
                                { width: THUMB_SIZE, height: THUMB_SIZE * 1.4, backgroundColor: bg.dominantColor, opacity: isPremium ? 1 : 0.55 },
                                isSelected && styles.bgThumbSelected,
                              ]}
                            >
                              <Image
                                source={bg.source}
                                resizeMode="cover"
                                style={{ width: THUMB_SIZE - 4, height: THUMB_SIZE * 1.4 - 4, borderRadius: 10 }}
                              />
                              {!isPremium && (
                                <View style={[styles.bgPremiumBadge, { [isRTL ? 'right' : 'left']: 4 }]}>
                                  <MaterialCommunityIcons name="crown" size={12} color={isDarkMode ? "#FFC107" : "#9A7100"} />
                                </View>
                              )}
                              {isSelected && (
                                <View style={[styles.bgCheck, { [isRTL ? 'left' : 'right']: 4 }]}>
                                  <MaterialCommunityIcons name="check-circle" size={20} color="#0d8e62" />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              </Animated.View>

              {/* ═══════════ قسم خلفيات الصور ═══════════ */}
              <Animated.View entering={FadeInDown.delay(400).duration(400)}>
                <View style={[styles.bgSectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <MaterialCommunityIcons name="image-multiple" size={20} color={colors.icon} />
                  <Text style={[styles.sectionTitle, { color: colors.textLight, marginTop: 0, marginBottom: 0, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                    {t('settings.photoBackgrounds')}
                  </Text>
                </View>
                <View style={styles.bgSeparator} />
                <View style={[styles.section, { backgroundColor: colors.card, padding: GRID_PADDING }]}>
                  {Platform.OS === 'ios' && (
                    <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
                  )}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
                  {/* Admin backgrounds — free section */}
                  {adminBackgrounds.filter(bg => !bg.is_premium).length > 0 && (
                    <View style={styles.bgGrid}>
                      {adminBackgrounds.filter(bg => !bg.is_premium).map((bg) => {
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
                              <View style={[styles.bgCheck, { [isRTL ? 'left' : 'right']: 4 }]}>
                                <MaterialCommunityIcons name="check-circle" size={20} color="#0d8e62" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Admin backgrounds — premium section */}
                  {adminBackgrounds.filter(bg => bg.is_premium).length > 0 && (
                    <>
                      <View style={[styles.premiumDivider, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons name="crown" size={14} color={isDarkMode ? "#FFC107" : "#9A7100"} />
                        <Text style={[styles.premiumLabel, { color: colors.textLight }, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                          {t('common.premiumOnly')}
                        </Text>
                        {!isPremium && (
                          <View style={styles.premiumLockBadge}>
                            <MaterialCommunityIcons name="lock" size={12} color={colors.textLight} />
                          </View>
                        )}
                      </View>
                      <View style={styles.bgGrid}>
                        {adminBackgrounds.filter(bg => bg.is_premium).map((bg) => {
                          const isSelected = settings.display.appBackground === 'dynamic' && settings.display.appBackgroundUrl === bg.fullUrl;
                          return (
                            <TouchableOpacity
                              key={bg.id}
                              onPress={() => handleSelectAdminBackground(bg)}
                              style={[
                                styles.bgGridThumb,
                                { width: THUMB_SIZE, height: THUMB_SIZE * 1.4, opacity: isPremium ? 1 : 0.55 },
                                isSelected && styles.bgThumbSelected,
                              ]}
                            >
                              <ExpoImage
                                source={{ uri: bg.thumbnailUrl }}
                                style={[styles.bgGridImage, { width: THUMB_SIZE - 4, height: THUMB_SIZE * 1.4 - 4 }]}
                                contentFit="cover"
                                transition={200}
                              />
                              {!isPremium && (
                                <View style={[styles.bgPremiumBadge, { [isRTL ? 'right' : 'left']: 4 }]}>
                                  <MaterialCommunityIcons name="crown" size={12} color={isDarkMode ? "#FFC107" : "#9A7100"} />
                                </View>
                              )}
                              {isSelected && (
                                <View style={[styles.bgCheck, { [isRTL ? 'left' : 'right']: 4 }]}>
                                  <MaterialCommunityIcons name="check-circle" size={20} color="#0d8e62" />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {/* Pexels photos — Category selector */}
                  {adminBackgrounds.length > 0 && <View style={{ height: 8 }} />}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
                    style={{ marginBottom: 12, transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                  >
                    {/* "الكل" tab */}
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedCategory('all');
                      }}
                      style={[
                        styles.categoryChip,
                        selectedCategory === 'all' && styles.categoryChipSelected,
                        { transform: [{ scaleX: isRTL ? -1 : 1 }] },
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name="apps" 
                        size={16} 
                        color={selectedCategory === 'all' ? '#fff' : colors.icon} 
                      />
                      <Text style={[
                        styles.categoryChipText,
                        selectedCategory === 'all' && styles.categoryChipTextSelected,
                        selectedCategory !== 'all' && { color: colors.text },
                      ]}>
                        {settings.language === 'ar' ? 'الكل' : 'All'}
                      </Text>
                    </TouchableOpacity>
                    {/* Category tabs */}
                    {BACKGROUND_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.key}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedCategory(cat.key);
                        }}
                        style={[
                          styles.categoryChip,
                          selectedCategory === cat.key && styles.categoryChipSelected,
                          { transform: [{ scaleX: isRTL ? -1 : 1 }] },
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name={cat.icon as any} 
                          size={16} 
                          color={selectedCategory === cat.key ? '#fff' : colors.icon} 
                        />
                        <Text style={[
                          styles.categoryChipText,
                          selectedCategory === cat.key && styles.categoryChipTextSelected,
                          selectedCategory !== cat.key && { color: colors.text },
                        ]}>
                          {settings.language === 'ar' ? cat.labelAr : cat.labelEn}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  {/* Pexels photos — free (filtered by category) */}
                  <View style={styles.bgGrid}>
                    {FREE_PEXELS_BACKGROUNDS
                      .filter((photo) => selectedCategory === 'all' || photo.category === selectedCategory)
                      .map((photo) => {
                      const isSelected = settings.display.appBackground === 'dynamic' && settings.display.appBackgroundUrl === photo.src.large2x;
                      return (
                        <TouchableOpacity
                          key={photo.id}
                          onPress={() => handleSelectPexelsPhoto(photo)}
                          style={[
                            styles.bgGridThumb,
                            { width: THUMB_SIZE, height: THUMB_SIZE * 1.4 },
                            isSelected && styles.bgThumbSelected,
                          ]}
                        >
                          <ExpoImage
                            source={{ uri: photo.src.small }}
                            style={[styles.bgGridImage, { width: THUMB_SIZE - 4, height: THUMB_SIZE * 1.4 - 4 }]}
                            contentFit="cover"
                            transition={200}
                          />
                          {isSelected && (
                            <View style={[styles.bgCheck, { [isRTL ? 'left' : 'right']: 4 }]}>
                              <MaterialCommunityIcons name="check-circle" size={20} color="#0d8e62" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Pexels photos — premium (filtered by category) */}
                  {PREMIUM_PEXELS_BACKGROUNDS.filter((photo) => selectedCategory === 'all' || photo.category === selectedCategory).length > 0 && (
                    <>
                      <View style={[styles.premiumDivider, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <MaterialCommunityIcons name="crown" size={14} color={isDarkMode ? "#FFC107" : "#9A7100"} />
                        <Text style={[styles.premiumLabel, { color: colors.textLight }, { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                          {t('common.premiumOnly')}
                        </Text>
                        {!isPremium && (
                          <View style={styles.premiumLockBadge}>
                            <MaterialCommunityIcons name="lock" size={12} color={colors.textLight} />
                          </View>
                        )}
                      </View>
                      <View style={styles.bgGrid}>
                        {PREMIUM_PEXELS_BACKGROUNDS
                          .filter((photo) => selectedCategory === 'all' || photo.category === selectedCategory)
                          .map((photo) => {
                          const isSelected = settings.display.appBackground === 'dynamic' && settings.display.appBackgroundUrl === photo.src.large2x;
                          return (
                            <TouchableOpacity
                              key={photo.id}
                              onPress={() => handleSelectPexelsPhoto(photo)}
                              style={[
                                styles.bgGridThumb,
                                { width: THUMB_SIZE, height: THUMB_SIZE * 1.4, opacity: isPremium ? 1 : 0.55 },
                                isSelected && styles.bgThumbSelected,
                              ]}
                            >
                              <ExpoImage
                                source={{ uri: photo.src.small }}
                                style={[styles.bgGridImage, { width: THUMB_SIZE - 4, height: THUMB_SIZE * 1.4 - 4 }]}
                                contentFit="cover"
                                transition={200}
                              />
                              {!isPremium && (
                            <View style={[styles.bgPremiumBadge, { [isRTL ? 'right' : 'left']: 4 }]}>
                              <MaterialCommunityIcons name="crown" size={12} color={isDarkMode ? "#FFC107" : "#9A7100"} />
                            </View>
                          )}
                          {isSelected && (
                            <View style={[styles.bgCheck, { [isRTL ? 'left' : 'right']: 4 }]}>
                              <MaterialCommunityIcons name="check-circle" size={20} color="#0d8e62" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                      </View>
                    </>
                  )}
                </View>
              </Animated.View>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const _styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  containerDark: { backgroundColor: DarkColors.background },
  textLight: { color: DarkColors.text },
  textMuted: { color: Colors.textLight },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 10 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fontBold(),
    color: Colors.textLight,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
    lineHeight: 24,
    includeFontPadding: false,
  },
  section: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(120,120,128,0.16)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionDark: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(120,120,128,0.18)',
  },
  option: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,120,128,0.2)',
  },
  optionSelected: {
    backgroundColor: 'rgba(6,79,47,0.12)',
  },
  optionLabel: {
    fontFamily: fontMedium(),
    color: Colors.text,
    includeFontPadding: false,
  },
  preview: {
    padding: 20,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewText: {
    fontFamily: fontBold(),
    color: Colors.text,
    textAlign: 'center',
    includeFontPadding: false,
  },
  previewSub: {
    fontFamily: fontRegular(),
    color: Colors.textLight,
    textAlign: 'center',
    includeFontPadding: false,
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
    borderColor: '#0d8e62',
  },
  bgGridImage: {
    borderRadius: 10,
  },
  bgCheck: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  bgPremiumBadge: {
    position: 'absolute',
    top: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 2,
  },
  premiumDivider: {
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  premiumLabel: {
    fontSize: 12,
    fontFamily: fontMedium(),
    color: Colors.textLight,
    flex: 1,
    lineHeight: 20,
    includeFontPadding: false,
  },
  premiumLockBadge: {
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 10,
    padding: 4,
  },
  // Category chips
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  categoryChipSelected: {
    backgroundColor: '#0d8e62',
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: fontMedium(),
    color: Colors.text,
    lineHeight: 22,
    includeFontPadding: false,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
});
