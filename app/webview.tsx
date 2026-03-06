// app/webview.tsx
// عرض محتوى HTML أو رابط خارجي داخل التطبيق

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/SettingsContext';

export default function WebViewScreen() {
  const { url, html, title } = useLocalSearchParams<{ url?: string; html?: string; title?: string }>();
  const { isDarkMode } = useSettings();

  const bgColor = isDarkMode ? '#111827' : '#ffffff';

  const wrappedHtml = html
    ? `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:16px;margin:0;color:${isDarkMode ? '#e5e7eb' : '#1f2937'};background:${bgColor};direction:rtl;line-height:1.8}img{max-width:100%;border-radius:12px}h1,h2,h3{color:${isDarkMode ? '#34d399' : '#065f46'}}</style></head><body>${html}</body></html>`
    : undefined;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <WebView
        source={wrappedHtml ? { html: wrappedHtml } : { uri: url || 'about:blank' }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#2f7659" />
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
