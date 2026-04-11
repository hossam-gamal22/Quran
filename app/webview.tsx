// app/webview.tsx
// عرض محتوى HTML أو رابط خارجي داخل التطبيق

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSettings } from '@/contexts/SettingsContext';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';

export default function WebViewScreen() {
  const { url, html, title } = useLocalSearchParams<{ url?: string; html?: string; title?: string }>();
  const { isDarkMode } = useSettings();
  const colors = useColors();

  const bgColor = colors.background;

  const wrappedHtml = html
    ? `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:16px;margin:0;color:${colors.text};background:${bgColor};direction:rtl;line-height:1.8}img{max-width:100%;border-radius:12px}h1,h2,h3{color:${colors.primary}}</style></head><body>${html}</body></html>`
    : undefined;

  return (
    <ScreenContainer edges={['top']}>
      <WebView
        source={wrappedHtml ? { html: wrappedHtml } : { uri: url || 'about:blank' }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0d8e62" />
          </View>
        )}
      />
    </ScreenContainer>
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
