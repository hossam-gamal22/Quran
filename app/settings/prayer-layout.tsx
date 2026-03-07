// app/settings/prayer-layout.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';

export default function PrayerLayoutScreen() {
  const router = useRouter();
  const { settings, isDarkMode, updatePrayer, t } = useSettings();

  const current = settings.prayer?.layout || 'list';

  const setLayout = (layout: 'list' | 'widget') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePrayer({ layout });
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
            <MaterialCommunityIcons name="arrow-left" size={28} color={isDarkMode ? '#fff' : '#333'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode && styles.textLight]}>شكل عرض مواقيت الصلاة</Text>
          <View style={{ width: 28 }} />
        </View>

        <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.content}>
          <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            <TouchableOpacity
              style={[styles.option, current === 'list' && styles.optionSelected]}
              onPress={() => setLayout('list')}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, isDarkMode && styles.textLight]}>قائمة</Text>
                <Text style={[styles.optionSub, isDarkMode && styles.textMuted]}>عرض القائمة الاعتيادية لمواقيت الصلاة</Text>
              </View>
              {current === 'list' && (
                <MaterialCommunityIcons name="check-circle" size={22} color="#2f7659" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, current === 'widget' && styles.optionSelected]}
              onPress={() => setLayout('widget')}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, isDarkMode && styles.textLight]}>لوحة تفاعلية</Text>
                <Text style={[styles.optionSub, isDarkMode && styles.textMuted]}>عرض لوحة/مكوّن دائري تفاعلي (الواجة المصغرة)</Text>
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  containerDark: { backgroundColor: '#11151c' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo-Bold', color: '#333' },
  textLight: { color: '#fff' },
  textMuted: { color: '#999' },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  section: { backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 16, overflow: 'hidden' },
  sectionDark: { backgroundColor: 'rgba(120,120,128,0.18)' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(120,120,128,0.2)' },
  optionSelected: { backgroundColor: 'rgba(47,118,89,0.08)' },
  optionLabel: { fontFamily: 'Cairo-SemiBold', fontSize: 15, color: '#333' },
  optionSub: { fontFamily: 'Cairo-Regular', fontSize: 12, color: '#999', marginTop: 2 },
});
