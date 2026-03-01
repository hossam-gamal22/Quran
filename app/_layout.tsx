// app/_layout.tsx
import "../global.css";

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import { SettingsProvider } from "@/lib/settings-context";
import { isOnboardingDone } from "@/app/onboarding";

// منع إخفاء شاشة البداية تلقائياً
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingBismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
      <ActivityIndicator size="large" color="#1B8A8A" style={{ marginTop: 24 }} />
      <Text style={styles.loadingText}>جارٍ التحميل...</Text>
    </View>
  );
}

function AppContent() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const checkOnboarding = async (): Promise<boolean> => {
          try {
            const timeoutPromise = new Promise<boolean>((resolve) =>
              setTimeout(() => resolve(true), 3000)
            );
            const checkPromise = isOnboardingDone();
            return await Promise.race([checkPromise, timeoutPromise]);
          } catch {
            return true;
          }
        };

        const onboardingComplete = await checkOnboarding();
        await SplashScreen.hideAsync();

        if (!onboardingComplete && segments[0] !== "onboarding") {
          router.replace("/onboarding");
        }
      } catch (e) {
        console.log("Error during app preparation:", e);
        await SplashScreen.hideAsync();
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_left",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        <Stack.Screen name="surah/[id]" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="juz/[id]" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="athkar/[id]" options={{ animation: "slide_from_left" }} />
        <Stack.Screen
          name="tafsir/[surah]/[ayah]"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AppContent />
          </SettingsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A1F1F",
  },
  loadingBismillah: {
    fontSize: 28,
    fontWeight: "600",
    color: "#1B8A8A",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 12,
  },
});
