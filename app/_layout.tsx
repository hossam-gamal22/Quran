// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds from 'react-native-google-mobile-ads';
import { Colors } from '../constants/theme';
import { AppConfigProvider } from '../lib/app-config-context';
import { AdsProvider } from '../lib/ads-context';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // تهيئة الإعلانات
        await mobileAds().initialize();
        console.log('✅ Mobile Ads initialized');

        // تحميل الإعدادات
        const settings = await AsyncStorage.getItem('app_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          setDarkMode(parsed.darkMode ?? false);
        }
      } catch (e) {
        console.warn('Error preparing app:', e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_left',
          contentStyle: {
            backgroundColor: darkMode ? '#111827' : Colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="azkar/[type]" options={{ headerShown: false }} />
        <Stack.Screen name="surah/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="qibla" options={{ headerShown: false }} />
        <Stack.Screen name="hijri" options={{ headerShown: false }} />
        <Stack.Screen name="tasbih" options={{ headerShown: false }} />
        <Stack.Screen name="names" options={{ headerShown: false }} />
        <Stack.Screen name="ruqyah" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppConfigProvider>
      <AdsProvider>
        <RootLayoutContent />
      </AdsProvider>
    </AppConfigProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
