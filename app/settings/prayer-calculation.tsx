// app/settings/prayer-calculation.tsx
// إعدادات طريقة حساب مواقيت الصلاة

import React from 'react';
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
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings, CalculationMethod } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';

const METHODS: { value: CalculationMethod; label: string; subtitle: string }[] = [
  { value: 4, label: 'أم القرى', subtitle: 'مكة المكرمة' },
  { value: 3, label: 'رابطة العالم الإسلامي', subtitle: 'Muslim World League' },
  { value: 2, label: 'الجمعية الإسلامية لأمريكا الشمالية', subtitle: 'ISNA' },
  { value: 5, label: 'الهيئة المصرية العامة للمساحة', subtitle: 'Egyptian General Authority' },
  { value: 1, label: 'جامعة العلوم الإسلامية - كراتشي', subtitle: 'University of Islamic Sciences, Karachi' },
  { value: 7, label: 'معهد الجيوفيزياء - جامعة طهران', subtitle: 'Institute of Geophysics, University of Tehran' },
  { value: 0, label: 'جامعة أم درمان الإسلامية', subtitle: 'Shia Ithna-Ashari, Leva Institute, Qum' },
  { value: 8, label: 'منطقة الخليج', subtitle: 'Gulf Region' },
  { value: 9, label: 'الكويت', subtitle: 'Kuwait' },
  { value: 10, label: 'قطر', subtitle: 'Qatar' },
  { value: 11, label: 'سنغافورة', subtitle: 'Majlis Ugama Islam Singapura' },
  { value: 12, label: 'فرنسا', subtitle: 'Union des organisations islamiques de France' },
  { value: 13, label: 'تركيا', subtitle: 'Diyanet İşleri Başkanlığı' },
  { value: 14, label: 'روسيا', subtitle: 'Spiritual Administration of Muslims of Russia' },
  { value: 15, label: 'ماليزيا', subtitle: 'JAKIM' },
];

const ASR_METHODS = [
  { value: 0, label: 'حنفي', subtitle: 'ظل المثلين' },
  { value: 1, label: 'شافعي / حنبلي / مالكي', subtitle: 'ظل المثل' },
];

export default function PrayerCalculationScreen() {
  const router = useRouter();
  const { settings, isDarkMode, updatePrayer } = useSettings();

  const handleMethod = (method: CalculationMethod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePrayer({ calculationMethod: method });
  };

  const handleAsr = (juristic: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePrayer({ asrJuristic: juristic as 0 | 1 });
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={isDarkMode ? '#fff' : '#333'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>طريقة الحساب</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* طريقة حساب العصر */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>حساب العصر</Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              {ASR_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.option, settings.prayer.asrJuristic === m.value && styles.optionSelected]}
                  onPress={() => handleAsr(m.value)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, isDarkMode && styles.textLight]}>{m.label}</Text>
                    <Text style={[styles.optionSub, isDarkMode && styles.textMuted]}>{m.subtitle}</Text>
                  </View>
                  {settings.prayer.asrJuristic === m.value && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* طريقة الحساب */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textMuted]}>طريقة حساب المواقيت</Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.option, settings.prayer.calculationMethod === m.value && styles.optionSelected]}
                  onPress={() => handleMethod(m.value)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, isDarkMode && styles.textLight]}>{m.label}</Text>
                    <Text style={[styles.optionSub, isDarkMode && styles.textMuted]}>{m.subtitle}</Text>
                  </View>
                  {settings.prayer.calculationMethod === m.value && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
                  )}
                </TouchableOpacity>
              ))}
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
  headerTitle: { fontSize: 20, fontFamily: 'Cairo-Bold', color: '#333' },
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
  sectionDark: { backgroundColor: 'rgba(120,120,128,0.18)' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,120,128,0.2)',
  },
  optionSelected: { backgroundColor: 'rgba(47,118,89,0.08)' },
  optionLabel: { fontFamily: 'Cairo-SemiBold', fontSize: 15, color: '#333' },
  optionSub: { fontFamily: 'Cairo-Regular', fontSize: 12, color: '#999', marginTop: 2 },
});
