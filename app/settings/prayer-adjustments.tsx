// app/settings/prayer-adjustments.tsx
// تعديل مواقيت الصلاة بالدقائق

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

import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';

const PRAYERS = [
  { key: 'fajr', name: 'الفجر', icon: 'weather-sunset-up', color: '#3a7ca5' },
  { key: 'sunrise', name: 'الشروق', icon: 'white-balance-sunny', color: '#f5a623' },
  { key: 'dhuhr', name: 'الظهر', icon: 'weather-sunny', color: '#c17f59' },
  { key: 'asr', name: 'العصر', icon: 'weather-sunny-alert', color: '#2f7659' },
  { key: 'maghrib', name: 'المغرب', icon: 'weather-sunset-down', color: '#e91e63' },
  { key: 'isha', name: 'العشاء', icon: 'weather-night', color: '#5d4e8c' },
] as const;

export default function PrayerAdjustmentsScreen() {
  const router = useRouter();
  const { settings, isDarkMode, updatePrayer } = useSettings();

  const adjustments = settings.prayer.adjustments;

  const handleAdjust = (prayer: string, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = (adjustments as any)[prayer] || 0;
    updatePrayer({
      adjustments: {
        ...adjustments,
        [prayer]: current + delta,
      },
    });
  };

  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    updatePrayer({
      adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    });
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={isDarkMode ? '#fff' : '#333'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>تعديل المواقيت</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>إعادة</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <Text style={[styles.hint, isDarkMode && styles.textMuted]}>
              اضبط دقائق لكل صلاة (+ أو -)
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              {PRAYERS.map((prayer) => {
                const value = (adjustments as any)[prayer.key] || 0;
                return (
                  <View key={prayer.key} style={styles.row}>
                    <View style={styles.rowLeft}>
                      <View style={styles.iconBg}>
                        <MaterialCommunityIcons name={prayer.icon as any} size={22} color={prayer.color} />
                      </View>
                      <Text style={[styles.prayerName, isDarkMode && styles.textLight]}>{prayer.name}</Text>
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        onPress={() => handleAdjust(prayer.key, -1)}
                        style={[styles.stepperBtn, isDarkMode && styles.stepperBtnDark]}
                      >
                        <MaterialCommunityIcons name="minus" size={18} color={isDarkMode ? '#fff' : '#333'} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperValue, isDarkMode && styles.textLight, value !== 0 && styles.stepperValueActive]}>
                        {value > 0 ? `+${value}` : value} د
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleAdjust(prayer.key, 1)}
                        style={[styles.stepperBtn, isDarkMode && styles.stepperBtnDark]}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color={isDarkMode ? '#fff' : '#333'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
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
  resetBtn: { padding: 4 },
  resetText: { fontFamily: 'Cairo-Medium', fontSize: 14, color: '#ef5350' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 10 },
  hint: {
    fontFamily: 'Cairo-Regular',
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  section: {
    backgroundColor: 'rgba(120,120,128,0.12)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionDark: { backgroundColor: 'rgba(120,120,128,0.18)' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,120,128,0.2)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerName: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 16,
    color: '#333',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,128,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDark: {
    backgroundColor: 'rgba(120,120,128,0.24)',
  },
  stepperValue: {
    fontFamily: 'Cairo-Bold',
    fontSize: 17,
    color: '#666',
    minWidth: 48,
    textAlign: 'center',
  },
  stepperValueActive: {
    color: '#2f7659',
  },
});
