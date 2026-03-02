// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';
import { AppConfigProvider } from '../lib/app-config-context';
import { QuranProvider } from '../contexts/QuranContext';

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('جاري التحميل...');

  useEffect(() => {
    async function prepare() {
      try {
        setLoadingMessage('جاري تحميل الإعدادات...');
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
        <Text style={styles.loadingText}>{loadingMessage}</Text>
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
            backgroundColor: darkMode ? '#000000' : Colors.background,
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
        <Stack.Screen name="ruqya" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="ayah-of-day" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppConfigProvider>
      <QuranProvider>
        <RootLayoutContent />
      </QuranProvider>
    </AppConfigProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
