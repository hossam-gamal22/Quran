// app/_layout.tsx
// التخطيط الرئيسي للتطبيق مع تكامل Firebase
// آخر تحديث: 2026-03-04

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Contexts
import { SettingsProvider } from '@/contexts/SettingsContext';
import { QuranProvider } from '@/contexts/QuranContext';
import { KhatmaProvider } from '@/contexts/KhatmaContext';
import { WorshipProvider } from '@/contexts/WorshipContext';
import { SeasonalProvider } from '@/contexts/SeasonalContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { RemoteConfigProvider } from '@/contexts/RemoteConfigContext';

// Firebase Integration
import { registerUser, updateLastActive } from '@/lib/firebase-user';
import { 
  initializeGlobalStats, 
  trackAppOpen, 
  syncLocalStats 
} from '@/lib/firebase-analytics';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // تحميل الخطوط
  const [fontsLoaded] = useFonts({
    'Cairo-Regular': require('../assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Medium': require('../assets/fonts/Cairo-Medium.ttf'),
    'Cairo-SemiBold': require('../assets/fonts/Cairo-SemiBold.ttf'),
    'Cairo-Bold': require('../assets/fonts/Cairo-Bold.ttf'),
    'Amiri-Regular': require('../assets/fonts/Amiri-Regular.ttf'),
    'Amiri-Bold': require('../assets/fonts/Amiri-Bold.ttf'),
    'UthmanicHafs': require('../assets/fonts/UthmanicHafs.ttf'),
  });

  // ========== Firebase Integration ==========
  useEffect(() => {
    const initFirebase = async () => {
      try {
        // تهيئة الإحصائيات العامة
        await initializeGlobalStats();
        
        // تسجيل المستخدم
        await registerUser();
        
        // تسجيل فتح التطبيق
        await trackAppOpen();
        
        console.log('✅ Firebase initialized in app');
      } catch (error) {
        console.log('Firebase init error (non-blocking):', error);
      }
    };
    
    initFirebase();
    
    // تتبع حالة التطبيق
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateLastActive();
      } else if (nextAppState === 'background') {
        syncLocalStats();
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // تحديث النشاط كل 5 دقائق
    const activityInterval = setInterval(() => {
      updateLastActive();
    }, 5 * 60 * 1000);
    
    // مزامنة الإحصائيات كل 15 دقيقة
    const syncInterval = setInterval(() => {
      syncLocalStats();
    }, 15 * 60 * 1000);
    
    return () => {
      subscription.remove();
      clearInterval(activityInterval);
      clearInterval(syncInterval);
    };
  }, []);

  // إخفاء شاشة البداية بعد تحميل الخطوط
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <RemoteConfigProvider>
            <NotificationsProvider>
              <QuranProvider>
                <KhatmaProvider>
                  <WorshipProvider>
                    <SeasonalProvider>
                      <OnboardingProvider>
                        <StatusBar style="auto" />
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            animation: 'slide_from_right',
                          }}
                        >
                          <Stack.Screen name="(tabs)" />
                          <Stack.Screen name="onboarding" />
                          <Stack.Screen name="surah/[id]" />
                          <Stack.Screen name="tafsir/[id]" />
                          <Stack.Screen name="azkar/[category]" />
                          <Stack.Screen name="khatma/[id]" />
                          <Stack.Screen name="settings/[section]" />
                          <Stack.Screen name="seasonal/[event]" />
                          <Stack.Screen name="worship-tracker" />
                          <Stack.Screen name="names" />
                          <Stack.Screen name="ruqya" />
                          <Stack.Screen name="hijri" />
                          <Stack.Screen name="hajj-umrah" />
                          <Stack.Screen name="night-reading" />
                          <Stack.Screen name="azkar-search" />
                          <Stack.Screen name="azkar-reminder" />
                        </Stack>
                      </OnboardingProvider>
                    </SeasonalProvider>
                  </WorshipProvider>
                </KhatmaProvider>
              </QuranProvider>
            </NotificationsProvider>
          </RemoteConfigProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
