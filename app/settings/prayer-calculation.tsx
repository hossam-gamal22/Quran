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
} from 'react-native';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings, CalculationMethod } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { t } from '@/lib/i18n';

function getMethods(translate: typeof t): { value: CalculationMethod; label: string; subtitle: string }[] {
  return [
    { value: 4, label: translate('prayer.methodUmmAlQura'), subtitle: translate('prayer.methodUmmAlQuraDesc') },
    { value: 3, label: translate('prayer.methodMuslimWorldLeague'), subtitle: translate('prayer.methodMuslimWorldLeagueDesc') },
    { value: 2, label: translate('prayer.methodIsna'), subtitle: translate('prayer.methodIsnaDesc') },
    { value: 5, label: translate('prayer.methodEgyptian'), subtitle: translate('prayer.methodEgyptianDesc') },
    { value: 1, label: translate('prayer.methodKarachi'), subtitle: translate('prayer.methodKarachiDesc') },
    { value: 7, label: translate('prayer.methodTehran'), subtitle: translate('prayer.methodTehranDesc') },
    { value: 0, label: translate('prayer.methodOmdurman'), subtitle: translate('prayer.methodOmdurmanDesc') },
    { value: 8, label: translate('prayer.methodGulf'), subtitle: translate('prayer.methodGulfDesc') },
    { value: 9, label: translate('prayer.methodKuwait'), subtitle: translate('prayer.methodKuwaitDesc') },
    { value: 10, label: translate('prayer.methodQatar'), subtitle: translate('prayer.methodQatarDesc') },
    { value: 11, label: translate('prayer.methodSingapore'), subtitle: translate('prayer.methodSingaporeDesc') },
    { value: 12, label: translate('prayer.methodFrance'), subtitle: translate('prayer.methodFranceDesc') },
    { value: 13, label: translate('prayer.methodTurkey'), subtitle: translate('prayer.methodTurkeyDesc') },
    { value: 14, label: translate('prayer.methodRussia'), subtitle: translate('prayer.methodRussiaDesc') },
    { value: 15, label: translate('prayer.methodMalaysia'), subtitle: translate('prayer.methodMalaysiaDesc') },
  ];
}

function getAsrMethods(translate: typeof t) {
  return [
    { value: 0, label: translate('prayer.asrMethodHanafi'), subtitle: translate('prayer.asrMethodHanafiDesc') },
    { value: 1, label: translate('prayer.asrMethodShafii'), subtitle: translate('prayer.asrMethodShafiiDesc') },
  ];
}

export default function PrayerCalculationScreen() {
  const isRTL = useIsRTL();
  const { settings, isDarkMode, updatePrayer } = useSettings();
  const colors = useColors();
  const METHODS = React.useMemo(() => getMethods(t), []);
  const ASR_METHODS = React.useMemo(() => getAsrMethods(t), []);

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
      opacity={settings.display.backgroundOpacity ?? 1}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <UniversalHeader title={t('prayer.calculationMethodHeader')} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* طريقة حساب العصر */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('prayer.asrCalculation')}</Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              {ASR_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.option, { flexDirection: isRTL ? 'row-reverse' : 'row' }, settings.prayer.asrJuristic === m.value && styles.optionSelected]}
                  onPress={() => handleAsr(m.value)}
                >
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.optionLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{m.label}</Text>
                    <Text style={[styles.optionSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{m.subtitle}</Text>
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
            <Text style={[styles.sectionTitle, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{t('prayer.calculationMethodSection')}</Text>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.option, { flexDirection: isRTL ? 'row-reverse' : 'row' }, settings.prayer.calculationMethod === m.value && styles.optionSelected]}
                  onPress={() => handleMethod(m.value)}
                >
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.optionLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{m.label}</Text>
                    <Text style={[styles.optionSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left' }]}>{m.subtitle}</Text>
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
  container: { flex: 1, backgroundColor: 'transparent' },
  containerDark: { backgroundColor: 'transparent' },
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
  optionLabel: { fontFamily: fontSemiBold(), fontSize: 15, color: '#333' },
  optionSub: { fontFamily: fontRegular(), fontSize: 12, color: '#999', marginTop: 2 },
});
