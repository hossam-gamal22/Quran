// app/sdui/[screenId].tsx
// Dynamic SDUI screen route — renders admin-configured screens from Firestore

import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useSDUIScreen, renderSections } from '@/lib/sdui';
import type { SectionAction } from '@/lib/sdui';
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { t } from '@/lib/i18n';

import { useIsRTL } from '@/hooks/use-is-rtl';
import { fontBold, fontSemiBold } from '@/lib/fonts';
export default function SDUIScreen() {
  const { screenId } = useLocalSearchParams<{ screenId: string }>();
  const router = useRouter();
  const { isDarkMode } = useSettings();
  const isRTL = useIsRTL();
  const { config, loading, error } = useSDUIScreen(screenId || 'default');

  const handleAction = (action: SectionAction) => {
    if (action.type === 'navigate' && typeof action.payload.route === 'string') {
      router.push(action.payload.route as any);
    }
  };

  if (loading) {
    return (
      <BackgroundWrapper>
        <SafeAreaView style={styles.container}>
          <ActivityIndicator size="large" color="#4ADE80" style={{ marginTop: 100 }} />
        </SafeAreaView>
      </BackgroundWrapper>
    );
  }

  if (error || !config) {
    return (
      <BackgroundWrapper>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={[styles.errorText, { color: isDarkMode ? '#fff' : '#1a1a1a' }]}>
              {t('common.error')}
            </Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>{t('common.back')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <MaterialCommunityIcons
              name={isRTL ? 'arrow-right' : 'arrow-left'}
              size={24}
              color={isDarkMode ? '#fff' : '#1a1a1a'}
            />
          </TouchableOpacity>
          {config.title ? (
            <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : '#1a1a1a' }]}>
              {config.title}
            </Text>
          ) : null}
          <View style={{ width: 40 }} />
        </View>

        {/* SDUI Sections */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {renderSections(config.sections, handleAction)}
        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontBold(),
    fontSize: 18,
    textAlign: 'center',
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontFamily: fontSemiBold(),
    fontSize: 18,
    marginTop: 8,
  },
  backButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  backButtonText: {
    fontFamily: fontSemiBold(),
    fontSize: 16,
    color: '#fff',
  },
});
