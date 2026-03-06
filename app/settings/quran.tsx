// app/settings/quran.tsx
// إعدادات القرآن الموحدة - جميع خيارات المصحف في مكان واحد

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  I18nManager,
  Image,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { QURAN_THEMES } from '@/constants/quran-themes';

// Background images
const QURAN_BG_IMAGES: Record<string, any> = {
  quranbg1: require('@/assets/images/quranbg1.png'),
  quranbg2: require('@/assets/images/quranbg2.png'),
  quranbg3: require('@/assets/images/quranbg3.png'),
  quranbg4: require('@/assets/images/quranbg4.png'),
};

export default function QuranSettingsScreen() {
  const router = useRouter();
  const { settings, isDarkMode, updateDisplay } = useSettings();

  const colors = {
    primary: '#2f7659',
    foreground: isDarkMode ? '#FFFFFF' : '#1C1C1E',
    muted: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
    card: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
    accent: isDarkMode ? '#4ADE80' : '#2f7659',
  };

  const currentThemeIndex = settings.display.quranThemeIndex ?? 0;
  const currentFontAdjust = settings.display.quranFontSizeAdjust ?? 0;
  const currentBackground = settings.display.quranBackground ?? 'quranbg1';

  const handleThemeSelect = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDisplay({ quranThemeIndex: index });
  };

  const handleFontAdjust = (delta: number) => {
    const newVal = Math.max(-4, Math.min(8, currentFontAdjust + delta));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDisplay({ quranFontSizeAdjust: newVal });
  };

  const handleBackgroundSelect = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDisplay({ quranBackground: key as any });
  };

  const handleToggle = (key: string, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDisplay({ [key]: value });
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
            إعدادات القرآن
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Theme Selection ─── */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              <MaterialCommunityIcons name="palette-outline" size={18} /> سمة المصحف
            </Text>
            <GlassCard style={styles.card}>
              <View style={styles.themeGrid}>
                {QURAN_THEMES.map((theme, index) => {
                  const isSelected = currentThemeIndex === index;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.themeItem,
                        { backgroundColor: theme.background },
                        isSelected && styles.themeItemSelected,
                      ]}
                      onPress={() => handleThemeSelect(index)}
                    >
                      <View
                        style={[
                          styles.themePreview,
                          { backgroundColor: theme.primary + '40' },
                        ]}
                      />
                      {isSelected && (
                        <View style={styles.themeCheck}>
                          <MaterialCommunityIcons
                            name="check"
                            size={12}
                            color="#fff"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.themeLabel, { color: colors.muted }]}>
                سمة رقم {currentThemeIndex + 1} من {QURAN_THEMES.length}
              </Text>
            </GlassCard>
          </Animated.View>

          {/* ─── Font Size ─── */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              <MaterialCommunityIcons name="format-size" size={18} /> حجم الخط
            </Text>
            <GlassCard style={styles.card}>
              <View style={styles.fontSizeRow}>
                <TouchableOpacity
                  style={[styles.fontBtn, { backgroundColor: colors.accent + '20' }]}
                  onPress={() => handleFontAdjust(-1)}
                >
                  <MaterialCommunityIcons name="minus" size={24} color={colors.accent} />
                </TouchableOpacity>
                <View style={styles.fontValueWrap}>
                  <Text style={[styles.fontValue, { color: colors.foreground }]}>
                    {currentFontAdjust === 0
                      ? 'افتراضي'
                      : currentFontAdjust > 0
                      ? `+${currentFontAdjust}`
                      : currentFontAdjust}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.fontBtn, { backgroundColor: colors.accent + '20' }]}
                  onPress={() => handleFontAdjust(1)}
                >
                  <MaterialCommunityIcons name="plus" size={24} color={colors.accent} />
                </TouchableOpacity>
              </View>
              {currentFontAdjust !== 0 && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => updateDisplay({ quranFontSizeAdjust: 0 })}
                >
                  <Text style={[styles.resetText, { color: colors.muted }]}>
                    إعادة تعيين
                  </Text>
                </TouchableOpacity>
              )}
            </GlassCard>
          </Animated.View>

          {/* ─── Background Selection ─── */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              <MaterialCommunityIcons name="image-outline" size={18} /> خلفية المصحف
            </Text>
            <GlassCard style={styles.card}>
              <View style={styles.bgGrid}>
                {(['quranbg1', 'quranbg2', 'quranbg3', 'quranbg4'] as const).map(
                  (key) => {
                    const isSelected = currentBackground === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.bgItem,
                          isSelected && styles.bgItemSelected,
                        ]}
                        onPress={() => handleBackgroundSelect(key)}
                      >
                        <Image
                          source={QURAN_BG_IMAGES[key]}
                          style={styles.bgImage}
                          resizeMode="cover"
                        />
                        {isSelected && (
                          <View style={styles.bgCheck}>
                            <MaterialCommunityIcons
                              name="check"
                              size={14}
                              color="#fff"
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </GlassCard>
          </Animated.View>

          {/* ─── Reading Options ─── */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              <MaterialCommunityIcons name="book-open-variant" size={18} /> خيارات القراءة
            </Text>
            <GlassCard style={styles.card}>
              {/* Show Tashkeel */}
              <View style={styles.toggleRow}>
                <Switch
                  value={settings.display.showTashkeel !== false}
                  onValueChange={(v) => handleToggle('showTashkeel', v)}
                  trackColor={{ false: '#767577', true: colors.accent + '80' }}
                  thumbColor={settings.display.showTashkeel !== false ? colors.accent : '#f4f3f4'}
                />
                <View style={styles.toggleTextWrap}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                    إظهار التشكيل
                  </Text>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    عرض علامات التشكيل (الحركات)
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Show Translation */}
              <View style={styles.toggleRow}>
                <Switch
                  value={settings.display.showTranslation ?? false}
                  onValueChange={(v) => handleToggle('showTranslation', v)}
                  trackColor={{ false: '#767577', true: colors.accent + '80' }}
                  thumbColor={settings.display.showTranslation ? colors.accent : '#f4f3f4'}
                />
                <View style={styles.toggleTextWrap}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                    إظهار الترجمة
                  </Text>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    عرض ترجمة الآيات
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Highlight Tajweed */}
              <View style={styles.toggleRow}>
                <Switch
                  value={settings.display.highlightTajweed ?? false}
                  onValueChange={(v) => handleToggle('highlightTajweed', v)}
                  trackColor={{ false: '#767577', true: colors.accent + '80' }}
                  thumbColor={settings.display.highlightTajweed ? colors.accent : '#f4f3f4'}
                />
                <View style={styles.toggleTextWrap}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                    تمييز التجويد
                  </Text>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    تلوين أحكام التجويد
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Show Tafsir */}
              <View style={styles.toggleRow}>
                <Switch
                  value={settings.display.showTafsir ?? false}
                  onValueChange={(v) => handleToggle('showTafsir', v)}
                  trackColor={{ false: '#767577', true: colors.accent + '80' }}
                  thumbColor={settings.display.showTafsir ? colors.accent : '#f4f3f4'}
                />
                <View style={styles.toggleTextWrap}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                    لوحة التفسير
                  </Text>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    عرض التفسير أثناء القراءة
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Focus Mode */}
              <View style={styles.toggleRow}>
                <Switch
                  value={settings.display.focusMode ?? false}
                  onValueChange={(v) => handleToggle('focusMode', v)}
                  trackColor={{ false: '#767577', true: colors.accent + '80' }}
                  thumbColor={settings.display.focusMode ? colors.accent : '#f4f3f4'}
                />
                <View style={styles.toggleTextWrap}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                    وضع التركيز
                  </Text>
                  <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                    إخفاء عناصر الواجهة للتركيز على القراءة
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

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
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    marginBottom: 10,
    marginTop: 16,
  },
  card: {
    padding: 16,
  },
  // Theme grid
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  themeItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeItemSelected: {
    borderColor: '#2f7659',
    shadowColor: '#2f7659',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  themePreview: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  themeCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2f7659',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    textAlign: 'center',
    marginTop: 12,
  },
  // Font size
  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  fontBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontValueWrap: {
    minWidth: 80,
    alignItems: 'center',
  },
  fontValue: {
    fontSize: 18,
    fontFamily: 'Cairo-SemiBold',
  },
  resetBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  resetText: {
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
  },
  // Background grid
  bgGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  bgItem: {
    width: 70,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgItemSelected: {
    borderColor: '#2f7659',
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  bgCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2f7659',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    textAlign: 'right',
  },
  toggleDesc: {
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
    textAlign: 'right',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(128,128,128,0.15)',
    marginVertical: 4,
  },
});
