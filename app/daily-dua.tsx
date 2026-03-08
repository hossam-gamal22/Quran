// app/daily-dua.tsx
// صفحة دعاء اليوم - مع زر تغيير لعرض أدعية مختلفة

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import { getDuaOfTheDay, getRandomDua, type DailyDua } from '@/data/daily-duas';

const ACCENT = '#7c3aed';

export default function DailyDuaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, settings } = useSettings();

  const [dua, setDua] = useState<DailyDua>(() => getDuaOfTheDay());
  const [currentIndex, setCurrentIndex] = useState<number | undefined>(undefined);

  const handleRefresh = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { dua: newDua, index } = getRandomDua(currentIndex);
    setDua(newDua);
    setCurrentIndex(index);
  }, [currentIndex]);

  const shareDua = async () => {
    try {
      await Share.share({
        message: `${dua.arabic}\n\n${dua.translation}\n\n📖 ${dua.reference}\n\nمن تطبيق روح المسلم`,
      });
    } catch { /* ignore */ }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BackgroundWrapper
        backgroundKey={settings.display.appBackground}
        backgroundUrl={settings.display.appBackgroundUrl}
        style={[styles.container, { backgroundColor: isDarkMode ? '#111827' : '#F3F4F6' }]}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#F9FAFB' : '#1F2937'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>
            دعاء اليوم
          </Text>
          <TouchableOpacity onPress={shareDua} style={styles.shareButton}>
            <MaterialCommunityIcons name="share-variant" size={22} color={isDarkMode ? '#F9FAFB' : '#1F2937'} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: ACCENT + '20' }]}>
              <MaterialCommunityIcons name="book-heart" size={40} color={ACCENT} />
            </View>
          </View>

          {/* Arabic Text */}
          <GlassCard intensity={46} style={styles.duaCard}>
            <Text style={[styles.arabicText, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>
              {dua.arabic}
            </Text>
          </GlassCard>

          {/* Translation */}
          <GlassCard intensity={46} style={styles.translationCard}>
            <Text style={[styles.translationLabel, { color: ACCENT }]}>Translation</Text>
            <Text style={[styles.translationText, { color: isDarkMode ? '#D1D5DB' : '#4B5563' }]}>
              {dua.translation}
            </Text>
          </GlassCard>

          {/* Reference */}
          <View style={styles.referenceRow}>
            <MaterialCommunityIcons name="book-open-page-variant" size={18} color={ACCENT} />
            <Text style={[styles.referenceText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
              {dua.reference}
            </Text>
          </View>

          {/* Refresh Button */}
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: ACCENT + '40' }]}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="refresh" size={20} color={ACCENT} />
            <Text style={[styles.refreshButtonText, { color: ACCENT }]}>دعاء آخر</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={[styles.shareButtonLarge, { backgroundColor: ACCENT }]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              shareDua();
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>مشاركة الدعاء</Text>
          </TouchableOpacity>

          <Text style={[styles.footerText, { color: isDarkMode ? '#6B7280' : '#9CA3AF' }]}>
            اضغط "دعاء آخر" لعرض دعاء جديد
          </Text>
        </ScrollView>

        <View style={{ height: insets.bottom }} />
      </BackgroundWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  shareButton: { padding: 8 },
  content: { flex: 1 },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  arabicText: {
    fontSize: 26,
    fontWeight: '500',
    lineHeight: 48,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  translationCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  translationLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  translationText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'left',
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  referenceText: {
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  shareButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 16,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 13,
  },
});
