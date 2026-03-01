import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';
import { APP_NAME } from '../constants/app';

// منع إخفاء شاشة البداية تلقائياً
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // تحميل الخطوط (اختياري - يمكن إضافة خطوط عربية مخصصة)
  const [fontsLoaded] = useFonts({
    // يمكن إضافة خطوط هنا
    // 'Amiri': require('../assets/fonts/Amiri-Regular.ttf'),
    // 'AmiriBold': require('../assets/fonts/Amiri-Bold.ttf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        // تحميل الإعدادات المحفوظة
        const settings = await AsyncStorage.getItem('app_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          setDarkMode(parsed.darkMode ?? false);
        }

        // تحميل أي بيانات أخرى ضرورية
        await Promise.all([
          // يمكن إضافة عمليات تحميل أخرى هنا
        ]);

      } catch (e) {
        console.warn('Error preparing app:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsLoaded]);

  if (!appIsReady || !fontsLoaded) {
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
        {/* الصفحات الرئيسية (tabs) */}
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
          }} 
        />

        {/* صفحات الأذكار */}
        <Stack.Screen 
          name="azkar/[type]" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_left',
          }} 
        />

        {/* صفحة قراءة السورة */}
        <Stack.Screen 
          name="surah/[id]" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_left',
          }} 
        />

        {/* صفحات فرعية */}
        <Stack.Screen 
          name="qibla" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_bottom',
          }} 
        />

        <Stack.Screen 
          name="hijri" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_left',
          }} 
        />

        <Stack.Screen 
          name="tasbih" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_left',
          }} 
        />

        <Stack.Screen 
          name="names" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_left',
          }} 
        />

        <Stack.Screen 
          name="ruqyah" 
          options={{ 
            headerShown: false,
            animation: 'slide_from_left',
          }} 
        />
      </Stack>
    </>
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
