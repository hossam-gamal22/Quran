// app/settings/display.tsx
// إعدادات العرض - حجم الخط ونوعه وطريقة العرض والخلفية

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings, FontSize, HomeLayout, AppBackgroundKey } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';

const FONT_SIZES: { value: FontSize; label: string; sample: number }[] = [
  { value: 'small', label: 'صغير', sample: 14 },
  { value: 'medium', label: 'متوسط', sample: 18 },
  { value: 'large', label: 'كبير', sample: 22 },
  { value: 'xlarge', label: 'كبير جداً', sample: 26 },
];

const BACKGROUND_OPTIONS: { key: AppBackgroundKey; source: any }[] = [
  { key: 'none', source: null },
  { key: 'background1', source: require('@/assets/images/background1.png') },
  { key: 'background2', source: require('@/assets/images/background2.png') },
  { key: 'background3', source: require('@/assets/images/background3.png') },
  { key: 'background4', source: require('@/assets/images/background4.png') },
  { key: 'background5', source: require('@/assets/images/background5.png') },
  { key: 'background6', source: require('@/assets/images/background6.png') },
  { key: 'background7', source: require('@/assets/images/background7.png') },
];

export default function DisplaySettingsScreen() {
  const router = useRouter();
  const { settings, isDarkMode, updateDisplay, t } = useSettings();

  const handleFontSize = (size: FontSize) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDisplay({ fontSize: size, arabicFontSize: size });
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
              name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}
              size={28}
              color={isDarkMode ? '#fff' : '#333'}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>
            {t('settings.displaySettings')}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* حجم الخط */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
              حجم الخط
            </Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              {FONT_SIZES.map((fs) => (
                <TouchableOpacity
                  key={fs.value}
                  style={[
                    styles.option,
                    settings.display.fontSize === fs.value && styles.optionSelected,
                  ]}
                  onPress={() => handleFontSize(fs.value)}
                >
                  <Text style={[styles.optionLabel, isDarkMode && styles.textLight, { fontSize: fs.sample }]}>
                    {fs.label}
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
            <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
              معاينة
            </Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark, styles.preview]}>
              <Text
                style={[
                  styles.previewText,
                  isDarkMode && styles.textLight,
                  { fontSize: FONT_SIZES.find(f => f.value === settings.display.fontSize)?.sample || 18 },
                ]}
              >
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </Text>
              <Text
                style={[
                  styles.previewSub,
                  isDarkMode && styles.textMuted,
                  { fontSize: (FONT_SIZES.find(f => f.value === settings.display.fontSize)?.sample || 18) - 4 },
                ]}
              >
                الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ
              </Text>
            </View>
          </Animated.View>

          {/* شكل الصفحة الرئيسية */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
              شكل الصفحة الرئيسية
            </Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              {([
                { value: 'grid' as HomeLayout, label: 'شبكة', icon: 'view-grid' as const },
                { value: 'list' as HomeLayout, label: 'قائمة', icon: 'view-list' as const },
              ]).map((layout) => (
                <TouchableOpacity
                  key={layout.value}
                  style={[
                    styles.option,
                    (settings.display.homeLayout || 'grid') === layout.value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateDisplay({ homeLayout: layout.value });
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <MaterialCommunityIcons
                      name={layout.icon}
                      size={24}
                      color={(settings.display.homeLayout || 'grid') === layout.value ? '#2f7659' : (isDarkMode ? '#999' : '#666')}
                    />
                    <Text style={[styles.optionLabel, isDarkMode && styles.textLight]}>
                      {layout.label}
                    </Text>
                  </View>
                  {(settings.display.homeLayout || 'grid') === layout.value && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* خلفية التطبيق */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>
              خلفية التطبيق
            </Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark, { padding: 16 }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {BACKGROUND_OPTIONS.map((bg) => {
                  const isSelected = (settings.display.appBackground || 'none') === bg.key;
                  return (
                    <TouchableOpacity
                      key={bg.key}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateDisplay({ appBackground: bg.key });
                      }}
                      style={[
                        styles.bgThumb,
                        isSelected && styles.bgThumbSelected,
                      ]}
                    >
                      {bg.source ? (
                        <Image source={bg.source} style={styles.bgThumbImage} />
                      ) : (
                        <View style={[styles.bgThumbImage, { backgroundColor: isDarkMode ? '#1a1a2e' : '#f0f0f0', alignItems: 'center', justifyContent: 'center' }]}>
                          <MaterialCommunityIcons name="cancel" size={24} color={isDarkMode ? '#666' : '#999'} />
                        </View>
                      )}
                      {isSelected && (
                        <View style={styles.bgCheck}>
                          <MaterialCommunityIcons name="check-circle" size={20} color="#2f7659" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 10 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
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
    flexDirection: 'row',
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
    fontFamily: 'Cairo-Medium',
    color: '#333',
  },
  preview: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  previewText: {
    fontFamily: 'Cairo-Bold',
    color: '#333',
    textAlign: 'center',
  },
  previewSub: {
    fontFamily: 'Cairo-Regular',
    color: '#666',
    textAlign: 'center',
  },
  bgThumb: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bgThumbSelected: {
    borderColor: '#2f7659',
  },
  bgThumbImage: {
    width: 72,
    height: 110,
    borderRadius: 10,
  },
  bgCheck: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
});
