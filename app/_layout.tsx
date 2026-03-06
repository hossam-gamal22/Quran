// app/_layout.tsx
// التخطيط الرئيسي للتطبيق مع تكامل Firebase
// آخر تحديث: 2026-03-04
// ⚠️ الإعلانات معلّقة للتجربة على Expo Go

import React, { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ⚠️ قبل النشر: فك التعليق عن السطرين دول
// import mobileAds from 'react-native-google-mobile-ads';
// import { initializeAppOpenAds } from '@/lib/app-open-ad';

// Contexts
import { SettingsProvider } from '@/contexts/SettingsContext';
import { QuranProvider } from '@/contexts/QuranContext';
import { KhatmaProvider } from '@/contexts/KhatmaContext';
import { WorshipProvider } from '@/contexts/WorshipContext';
import { SeasonalProvider } from '@/contexts/SeasonalContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { RemoteConfigProvider } from '@/contexts/RemoteConfigContext';
import { AdsProvider } from '@/lib/ads-context';
import { AppConfigProvider } from '@/lib/app-config-context';

// Firebase Integration
import { registerUser, updateLastActive } from '@/lib/firebase-user';
import { 
  initializeGlobalStats, 
  trackAppOpen, 
  syncLocalStats 
} from '@/lib/firebase-analytics';
import { AudioPlayerBar } from '@/components/quran/AudioPlayerBar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Cairo-Regular': require('../assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Medium': require('../assets/fonts/Cairo-Medium.ttf'),
    'Cairo-SemiBold': require('../assets/fonts/Cairo-SemiBold.ttf'),
    'Cairo-Bold': require('../assets/fonts/Cairo-Bold.ttf'),
    'Amiri-Regular': require('../assets/fonts/Amiri-Regular.ttf'),
    'Amiri-Bold': require('../assets/fonts/Amiri-Bold.ttf'),
    'UthmanicHafs': require('../assets/fonts/UthmanicHafs.otf'),
    'QCFSurahNames': require('../assets/fonts/qcf/surah-names.ttf'),
  });

  // ⚠️ قبل النشر: فك التعليق عن الـ useEffect ده
  // useEffect(() => {
  //   const initAds = async () => {
  //     try {
  //       await mobileAds().initialize();
  //       console.log('✅ Google Mobile Ads SDK initialized');
  //     } catch (error) {
  //       console.log('❌ Error initializing ads SDK:', error);
  //     }
  //   };
  //   initAds();
  // }, []);

  // Firebase Integration
  useEffect(() => {
    const initFirebase = async () => {
      try {
        await initializeGlobalStats();
        await registerUser();
        await trackAppOpen();
        console.log('✅ Firebase initialized in app');
      } catch (error) {
        console.log('Firebase init error (non-blocking):', error);
      }
    };
    
    initFirebase();
    
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateLastActive().catch(() => {});
      } else if (nextAppState === 'background') {
        syncLocalStats().catch(() => {});
      }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    const activityInterval = setInterval(() => {
      updateLastActive().catch(() => {});
    }, 5 * 60 * 1000);
    
    const syncInterval = setInterval(() => {
      syncLocalStats().catch(() => {});
    }, 15 * 60 * 1000);
    
    return () => {
      subscription.remove();
      clearInterval(activityInterval);
      clearInterval(syncInterval);
    };
  }, []);

  // ⚠️ قبل النشر: فك التعليق عن الـ useEffect ده
  // useEffect(() => {
  //   const cleanupAds = initializeAppOpenAds();
  //   return () => {
  //     cleanupAds();
  //   };
  // }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <RemoteConfigProvider>
            <AppConfigProvider>
              <AdsProvider>
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
                            animation: Platform.OS === 'ios' ? 'ios_from_right' : 'fade_from_bottom',
                            gestureEnabled: true,
                            fullScreenGestureEnabled: Platform.OS === 'ios',
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
                        <AudioPlayerBar global />
                          </OnboardingProvider>
                        </SeasonalProvider>
                      </WorshipProvider>
                    </KhatmaProvider>
                  </QuranProvider>
                </NotificationsProvider>
              </AdsProvider>
            </AppConfigProvider>
          </RemoteConfigProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
