// app/_layout.tsx
// التخطيط الرئيسي للتطبيق مع تكامل Firebase
// آخر تحديث: 2026-03-08
// ⚠️ الإعلانات معلّقة للتجربة على Expo Go

import React, { useEffect, useCallback, useState, useRef } from 'react';
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
import { usePathname } from 'expo-router';
import { syncWidgetDataToNative } from '@/lib/widget-native-sync';
import { checkAndClearCacheOnUpdate } from '@/lib/cache-manager';
import * as ExpoNotifications from 'expo-notifications';

// Configure notification handler at the top level (before any component renders)
// Wrapped in try-catch to avoid console error on Expo Go (SDK 53+ removed push notifications from Expo Go)
try {
  ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Silently ignore — Expo Go doesn't support push notifications
}

SplashScreen.preventAutoHideAsync().catch(() => {});

// Run an async operation with a timeout — never throws, always resolves
const INIT_TIMEOUT = 10000; // 10 seconds max per operation
const initWithTimeout = async (fn: () => Promise<void>, name: string, timeout = INIT_TIMEOUT) => {
  try {
    await Promise.race([
      fn(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`${name} timed out after ${timeout}ms`)), timeout)
      ),
    ]);
    console.log(`✅ ${name} completed`);
  } catch (error) {
    console.warn(`⚠️ ${name} failed:`, error);
    // Don't throw — continue with other initialization
  }
};

const hideSplash = async () => {
  try {
    await SplashScreen.hideAsync();
    console.log('✅ Splash screen hidden');
  } catch (e) {
    // Ignore — might already be hidden
  }
};

export default function RootLayout() {
  const pathname = usePathname();
  const [appReady, setAppReady] = useState(false);
  const splashHidden = useRef(false);

  const [fontsLoaded, fontError] = useFonts({
    'Cairo-Regular': require('../assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Medium': require('../assets/fonts/Cairo-Medium.ttf'),
    'Cairo-SemiBold': require('../assets/fonts/Cairo-SemiBold.ttf'),
    'Cairo-Bold': require('../assets/fonts/Cairo-Bold.ttf'),
    'QCF_Default': require('../assets/fonts/qcf/QCF4_tajweed_001.ttf'),
    'QCFSurahNames': require('../assets/fonts/qcf/surah-names.ttf'),
    'Amiri': require('../assets/fonts/Amiri-Regular.ttf'),
    'Amiri-Bold': require('../assets/fonts/Amiri-Bold.ttf'),
    'KFGQPCUthmanic': require('../assets/fonts/KFGQPC-Uthmanic-Script.ttf'),
    'Orbitron-Bold': require('../assets/fonts/Orbitron-Bold.ttf'),
    'Orbitron-Regular': require('../assets/fonts/Orbitron-Regular.ttf'),
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

  // Safety timeout: ALWAYS hide splash screen after 12 seconds no matter what
  useEffect(() => {
    const safetyTimer = setTimeout(async () => {
      if (!splashHidden.current) {
        console.warn('⚠️ Safety timeout reached — forcing splash screen hide');
        splashHidden.current = true;
        setAppReady(true);
        await hideSplash();
      }
    }, 12000);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Firebase Integration — each step isolated with timeout
  useEffect(() => {
    console.log('🚀 Starting app initialization...');

    const initFirebase = async () => {
      console.log('🔥 Initializing Firebase services...');

      await initWithTimeout(
        () => checkAndClearCacheOnUpdate().then(() => {}),
        'Cache check',
        5000
      );

      await initWithTimeout(
        () => initializeGlobalStats(),
        'Global stats init',
        8000
      );

      await initWithTimeout(
        () => registerUser().then(() => {}),
        'User registration',
        8000
      );

      await initWithTimeout(
        () => trackAppOpen(),
        'Track app open',
        5000
      );

      console.log('✅ Firebase initialization sequence complete');
    };

    initFirebase();

    // Sync widget data to native storage on launch
    initWithTimeout(
      () => syncWidgetDataToNative(),
      'Widget sync',
      5000
    );
    
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateLastActive().catch(() => {});
        syncWidgetDataToNative().catch(() => {});
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

  // Hide splash and mark ready when fonts finish (loaded or errored)
  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.warn('⚠️ Font loading failed, continuing with system fonts:', fontError);
      } else {
        console.log('✅ Fonts loaded successfully');
      }

      if (!splashHidden.current) {
        splashHidden.current = true;
        setAppReady(true);
        hideSplash();
      }
    }
  }, [fontsLoaded, fontError]);

  if (!appReady && !fontsLoaded) {
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
                          <Stack.Screen name="tafsir" />
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
                          <Stack.Screen name="widgets-gallery" />
                          <Stack.Screen name="widget-settings" />
                          <Stack.Screen name="browse-tafsir" />
                          <Stack.Screen name="all-favorites" />
                          <Stack.Screen name="quran-reminder" />
                          <Stack.Screen name="daily-dua" />
                          <Stack.Screen name="daily-ayah" />
                          <Stack.Screen name="companions" />
                        </Stack>
                        {!(pathname && pathname.startsWith('/qibla')) && <AudioPlayerBar global />}
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
