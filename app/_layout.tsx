// ✅ MUST import global.css FIRST for NativeWind to work
import '../global.css';

import React, { useEffect, useState } from 'react';
import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-provider';
import { SettingsProvider } from '@/lib/settings-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

// ─── Root Layout ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Give NativeWind time to load
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        // Ignore errors
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
        <ActivityIndicator size="large" color="#1B6B3A" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsProvider>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="surah/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen
                name="tafsir/[surah]/[ayah]"
                options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
              />
            </Stack>
          </SafeAreaProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    color: '#1B6B3A',
    fontWeight: '600',
  },
});
