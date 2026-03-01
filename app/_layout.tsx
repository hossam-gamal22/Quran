// ✅ MUST import global.css FIRST for NativeWind to work
import '../global.css';

import React, { useEffect, useState } from 'react';
import { Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-provider';
import { SettingsProvider } from '@/lib/settings-context';
import { isOnboardingDone } from '@/app/onboarding';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

// ─── Loading Screen ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
      <ActivityIndicator size="large" color="#1B6B3A" style={{ marginTop: 20 }} />
    </View>
  );
}

// ─── App Initializer ─────────────────────────────────────────────────────────
function AppInitializer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        // Small delay to let NativeWind styles load first
        await new Promise(r => setTimeout(r, 100));
        await SplashScreen.hideAsync().catch(() => {});
        
        // Add timeout for onboarding check - max 3 seconds
        const timeoutPromise = new Promise<boolean>(resolve => 
          setTimeout(() => resolve(true), 3000)
        );
        const onboardingPromise = isOnboardingDone();
        
        const done = await Promise.race([onboardingPromise, timeoutPromise]);
        
        if (!done && mounted) {
          router.replace('/onboarding' as any);
        }
      } catch (e) {
        // If any error – just proceed to main app
      } finally {
        if (mounted) setChecked(true);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  // Show loading spinner instead of blank white screen
  if (!checked) return <LoadingScreen />;
  return <>{children}</>;
}

// ─── Root Layout ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsProvider>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <AppInitializer>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen
                  name="(tabs)"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="onboarding"
                  options={{ headerShown: false, animation: 'fade' }}
                />
                <Stack.Screen
                  name="night-reading"
                  options={{ headerShown: false, animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="oauth"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="surah/[id]"
                  options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="tafsir/[surah]/[ayah]"
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                  }}
                />
              </Stack>
            </AppInitializer>
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
