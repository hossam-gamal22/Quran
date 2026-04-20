// app/settings/prayer-calibration.tsx
// معايرة أوقات الصلاة — تعديل بالدقائق لكل صلاة

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { fontBold, fontMedium, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';

type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

const PRAYER_KEYS: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function getPrayerLabel(key: PrayerKey, translate: typeof t): string {
  const map: Record<PrayerKey, string> = {
    fajr: translate('prayer.fajr'),
    sunrise: translate('prayer.sunrise'),
    dhuhr: translate('prayer.dhuhr'),
    asr: translate('prayer.asr'),
    maghrib: translate('prayer.maghrib'),
    isha: translate('prayer.isha'),
  };
  return map[key];
}

export default function PrayerCalibrationScreen() {
  const isRTL = useIsRTL();
  const { settings, isDarkMode, updatePrayer } = useSettings();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);
  const [localAdj, setLocalAdj] = useState({ ...settings.prayer.adjustments });

  const adjust = (key: PrayerKey, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = Math.max(-30, Math.min(30, (localAdj[key] || 0) + delta));
    const updated = { ...localAdj, [key]: newVal };
    setLocalAdj(updated);
    updatePrayer({ adjustments: updated });
  };

  const resetAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const zeroed = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
    setLocalAdj(zeroed);
    updatePrayer({ adjustments: zeroed });
  };

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      backgroundUrl={settings.display.appBackgroundUrl}
      opacity={settings.display.backgroundOpacity ?? 1}
      style={[styles.container]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />

        <UniversalHeader title={t('prayer.calibrationTitle')} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <Text style={[styles.desc, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('prayer.calibrationDesc')}
            </Text>

            <View style={[styles.section, { backgroundColor: colors.card }]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
              )}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />

              {PRAYER_KEYS.map((key) => (
                <View key={key} style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.prayerName, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                    {getPrayerLabel(key, t)}
                  </Text>
                  <View style={[styles.stepper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity onPress={() => adjust(key, -1)} style={[styles.stepBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                      <MaterialCommunityIcons name="minus" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.adjValue, { color: localAdj[key] === 0 ? colors.textLight : '#0d8e62' }]}>
                      {localAdj[key] > 0 ? `+${localAdj[key]}` : `${localAdj[key]}`}
                    </Text>
                    <TouchableOpacity onPress={() => adjust(key, 1)} style={[styles.stepBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                      <MaterialCommunityIcons name="plus" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
              onPress={resetAll}
            >
              <MaterialCommunityIcons name="restart" size={18} color={colors.textLight} style={{ marginHorizontal: 6 }} />
              <Text style={[styles.resetText, { color: colors.textLight }]}>{t('prayer.calibrationReset')}</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const _styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 10 },
  desc: {
    fontSize: 13,
    fontFamily: fontRegular(),
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  section: { borderRadius: 16, overflow: 'hidden' },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,120,128,0.2)',
  },
  prayerName: { fontFamily: fontSemiBold(), fontSize: 15, flex: 1 },
  stepper: { alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjValue: {
    fontFamily: fontBold(),
    fontSize: 16,
    minWidth: 36,
    textAlign: 'center',
    includeFontPadding: false,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetText: { fontFamily: fontMedium(), fontSize: 14 },
});
