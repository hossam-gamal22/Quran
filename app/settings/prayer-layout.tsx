// app/settings/prayer-layout.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { useScaledStyles } from '@/hooks/use-font-scale';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
export default function PrayerLayoutScreen() {
  const { settings, isDarkMode, updatePrayer, t } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();
  const styles = useScaledStyles(_styles, colors.fs);

  const current = settings.prayer?.layout || 'list';

  const setLayout = (layout: 'list' | 'widget') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePrayer({ layout });
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

        <UniversalHeader title={t('settings.prayerLayout')} />

        <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.content}>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            {Platform.OS === 'ios' && (
              <BlurView intensity={80} tint={(isDarkMode ? 'systemThickMaterialDark' : 'systemThickMaterialLight') as any} style={StyleSheet.absoluteFill} />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(30,30,30,0.40)' : 'rgba(255,255,255,0.60)' }]} />
            <TouchableOpacity
              style={[styles.option, { flexDirection: isRTL ? 'row-reverse' : 'row' }, current === 'list' && styles.optionSelected]}
              onPress={() => setLayout('list')}
            >
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.optionLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.layoutList')}</Text>
                <Text style={[styles.optionSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.layoutListDesc')}</Text>
              </View>
              {current === 'list' && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, { flexDirection: isRTL ? 'row-reverse' : 'row' }, current === 'widget' && styles.optionSelected]}
              onPress={() => setLayout('widget')}
            >
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.optionLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.layoutWidget')}</Text>
                <Text style={[styles.optionSub, { color: colors.textLight, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('settings.layoutWidgetDesc')}</Text>
              </View>
              {current === 'widget' && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#0d8e62" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const _styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  section: { borderRadius: 16, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(120,120,128,0.2)' },
  optionSelected: { backgroundColor: 'rgba(6,79,47,0.08)' },
  optionLabel: { fontFamily: fontSemiBold(), fontSize: 15 },
  optionSub: { fontFamily: fontRegular(), fontSize: 12, marginTop: 2 },
});
