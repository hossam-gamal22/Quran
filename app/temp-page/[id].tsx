// app/temp-page/[id].tsx
// عرض صفحة مؤقتة حسب لغة المستخدم (عربي / إنجليزي)

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchTempPageById, TempPage } from '@/lib/app-config-api';
import { t, getLanguage, isRTL } from '@/lib/i18n';

export default function TempPageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDarkMode } = useSettings();
  const [page, setPage] = useState<TempPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchTempPageById(id).then(p => {
      setPage(p);
      setLoading(false);
    });
  }, [id]);

  const bgColor = isDarkMode ? '#111827' : '#ffffff';
  const lang = getLanguage();
  const isAr = lang === 'ar';
  const dir = isRTL() ? 'rtl' : 'ltr';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      </SafeAreaView>
    );
  }

  if (!page) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.loader}>
          <Text style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>
            {t('common.pageUnavailable')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Arabic users get Arabic content, all others get English (if available) or fallback to Arabic
  const htmlBody = isAr ? page.htmlContent : (page.htmlContentEn || page.htmlContent);

  const wrappedHtml = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:16px;margin:0;color:${isDarkMode ? '#e5e7eb' : '#1f2937'};background:${bgColor};direction:${dir};line-height:1.8}img{max-width:100%;border-radius:12px}h1,h2,h3{color:${isDarkMode ? '#34d399' : '#065f46'}}</style></head><body>${htmlBody}</body></html>`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <WebView
        source={{ html: wrappedHtml }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
