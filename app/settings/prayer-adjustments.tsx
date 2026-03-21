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
} from 'react-native';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings, useTranslation } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { useIsRTL } from '@/hooks/use-is-rtl';

const PRAYERS = [
  { key: 'fajr', tKey: 'prayer.fajr', icon: 'weather-sunset-up', color: '#3a7ca5' },
  { key: 'sunrise', tKey: 'prayer.sunrise', icon: 'white-balance-sunny', color: '#f5a623' },
  { key: 'dhuhr', tKey: 'prayer.dhuhr', icon: 'weather-sunny', color: '#c17f59' },
  { key: 'asr', tKey: 'prayer.asr', icon: 'weather-sunny-alert', color: '#22C55E' },
  { key: 'maghrib', tKey: 'prayer.maghrib', icon: 'weather-sunset-down', color: '#e91e63' },
  { key: 'isha', tKey: 'prayer.isha', icon: 'weather-night', color: '#5d4e8c' },
] as const;

export default function PrayerAdjustmentsScreen() {
  const isRTL = useIsRTL();
  const router = useRouter();
  const { settings, isDarkMode, updatePrayer } = useSettings();
  const { t } = useTranslation();
  const colors = useColors();

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
      opacity={settings.display.backgroundOpacity ?? 1}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name={isRTL ? 'arrow-right' : 'arrow-left'} size={28} color={isDarkMode ? '#fff' : '#333'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('prayerAdjustments.title')}</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetText}>{t('prayerAdjustments.reset')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <Text style={[styles.hint, { color: colors.textLight }]}>
              {t('prayerAdjustments.hint')}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              {PRAYERS.map((prayer) => {
                const value = (adjustments as any)[prayer.key] || 0;
                return (
                  <View key={prayer.key} style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.rowLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={styles.iconBg}>
                        <MaterialCommunityIcons name={prayer.icon as any} size={22} color={prayer.color} />
                      </View>
                      <Text style={[styles.prayerName, { color: colors.text }]}>{t(prayer.tKey)}</Text>
                    </View>
                    <View style={[styles.stepper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        onPress={() => handleAdjust(prayer.key, -1)}
                        style={[styles.stepperBtn, isDarkMode && styles.stepperBtnDark]}
                      >
                        <MaterialCommunityIcons name="minus" size={18} color={isDarkMode ? '#fff' : '#333'} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperValue, { color: colors.text }, value !== 0 && styles.stepperValueActive]}>
                        {value > 0 ? `+${value}` : value} {t('prayerAdjustments.minutesSuffix')}
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
  container: { flex: 1, backgroundColor: 'transparent' },
  containerDark: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontFamily: fontBold(), color: '#333' },
  resetBtn: { padding: 4 },
  resetText: { fontFamily: fontMedium(), fontSize: 14, color: '#ef5350' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 10 },
  hint: {
    fontFamily: fontRegular(),
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
    fontFamily: fontSemiBold(),
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
    fontFamily: fontBold(),
    fontSize: 17,
    color: '#666',
    minWidth: 48,
    textAlign: 'center',
  },
  stepperValueActive: {
    color: '#22C55E',
  },
});
