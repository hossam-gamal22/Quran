// app/settings/prayer-layout.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { UniversalHeader } from '@/components/ui';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold, fontRegular, fontSemiBold } from '@/lib/fonts';
export default function PrayerLayoutScreen() {
  const { settings, isDarkMode, updatePrayer, t } = useSettings();
  const isRTL = useIsRTL();
  const colors = useColors();

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
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

        <UniversalHeader title={t('settings.prayerLayout')} />

        <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.content}>
          <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            <TouchableOpacity
              style={[styles.option, { flexDirection: isRTL ? 'row-reverse' : 'row' }, current === 'list' && styles.optionSelected]}
              onPress={() => setLayout('list')}
            >
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.optionLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.layoutList')}</Text>
                <Text style={[styles.optionSub, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.layoutListDesc')}</Text>
              </View>
              {current === 'list' && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, { flexDirection: isRTL ? 'row-reverse' : 'row' }, current === 'widget' && styles.optionSelected]}
              onPress={() => setLayout('widget')}
            >
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.optionLabel, isDarkMode && styles.textLight, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.layoutWidget')}</Text>
                <Text style={[styles.optionSub, isDarkMode && styles.textMuted, { textAlign: isRTL ? 'right' : 'left' }]}>{t('settings.layoutWidgetDesc')}</Text>
              </View>
              {current === 'widget' && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  containerDark: { backgroundColor: 'transparent' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  section: { backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 16, overflow: 'hidden' },
  sectionDark: { backgroundColor: 'rgba(120,120,128,0.18)' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(120,120,128,0.2)' },
  optionSelected: { backgroundColor: 'rgba(47,118,89,0.08)' },
  optionLabel: { fontFamily: fontSemiBold(), fontSize: 15, color: '#333' },
  optionSub: { fontFamily: fontRegular(), fontSize: 12, color: '#999', marginTop: 2 },
});
