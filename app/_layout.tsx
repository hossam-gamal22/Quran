// app/_layout.tsx
// التخطيط الرئيسي للتطبيق مع تكامل Firebase
// آخر تحديث: 2026-03-08
// ⚠️ الإعلانات معلّقة للتجربة على Expo Go

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Platform, View, Text, TextInput, I18nManager } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OfflineModal } from '@/components/ui/OfflineBanner';
import { MaintenanceGuard } from '@/components/ui/MaintenanceGuard';
import { DynamicSplashOverlay } from '@/components/ui/DynamicSplashOverlay';
import { useSettings } from '@/contexts/SettingsContext';

import { initializeAppOpenAds } from '@/lib/app-open-ad';
import { languageInitPromise, getLanguage, isRTL as appIsRTL } from '@/lib/i18n';
import { syncAppIconOnStartup } from '@/lib/app-icon-manager';

// Contexts
import { SettingsProvider } from '@/contexts/SettingsContext';
import { QuranProvider } from '@/contexts/QuranContext';
import { KhatmaProvider } from '@/contexts/KhatmaContext';
import { WorshipProvider } from '@/contexts/WorshipContext';
import { SeasonalProvider } from '@/contexts/SeasonalContext';
import { ThemeConfigProvider } from '@/contexts/ThemeConfigContext';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { RemoteConfigProvider } from '@/contexts/RemoteConfigContext';
import { AdsProvider } from '@/lib/ads-context';
import { AppConfigProvider } from '@/lib/app-config-context';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

// Firebase Integration
import { registerUser, updateLastActive } from '@/lib/firebase-user';
import { 
  initializeGlobalStats, 
  trackAppOpen, 
  syncLocalStats 
} from '@/lib/firebase-analytics';
import { AudioPlayerBar } from '@/components/quran/AudioPlayerBar';
import { GlobalAudioBar } from '@/components/ui/GlobalAudioBar';
import { GlobalAudioProvider } from '@/contexts/GlobalAudioContext';
import { usePathname, useRouter } from 'expo-router';
import { syncWidgetDataToNative } from '@/lib/widget-native-sync';
import { checkAndClearCacheOnUpdate } from '@/lib/cache-manager';
import { initTranslationOverrides } from '@/lib/auto-translate';
import { initRemoteTranslations } from '@/lib/remote-translations';
import { ScreenshotBranding } from '@/components/ui/ScreenshotBranding';
import { fontRegular } from '@/lib/fonts';
import { toWesternDigits } from '@/lib/format-number';
import { fetchQuranThemes } from '@/lib/admin-data-api';
import { QURAN_THEMES, setQuranThemes } from '@/constants/quran-themes';
import * as ExpoNotifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { NOTIFICATION_SOUNDS as NOTIFICATION_SOUND_FILES, ADHAN_SOUNDS as ADHAN_SOUND_FILES } from '@/lib/sound-manager';

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

// Register TrackPlayer playback service for radio lock screen controls
// Must be at module scope (not inside a component)
// Only in native/dev builds — Expo Go doesn't have the native module
if (Platform.OS !== 'web') {
  try {
    const _ExpoConstants = require('expo-constants').default;
    // 'storeClient' = Expo Go — skip TrackPlayer registration
    if (_ExpoConstants.executionEnvironment !== 'storeClient') {
      const _TrackPlayer = require('react-native-track-player').default;
      const { PlaybackService } = require('@/lib/track-player-service');
      _TrackPlayer.registerPlaybackService(() => PlaybackService);
    }
  } catch {
    // TrackPlayer native module not available — radio will use expo-av fallback
  }
}

// Register Android widget task handler at module scope
// Only in native/dev builds on Android
if (Platform.OS === 'android') {
  try {
    const _ExpoConstants = require('expo-constants').default;
    if (_ExpoConstants.executionEnvironment !== 'storeClient') {
      const { registerWidgetTaskHandler } = require('react-native-android-widget');
      const { widgetTaskHandler } = require('@/lib/android-widget-task-handler');
      registerWidgetTaskHandler(widgetTaskHandler);
    }
  } catch {
    // react-native-android-widget not available in Expo Go
  }
}

// Set global default font and force Western numerals for all Text components
function westernizeChildren(children: any): any {
  if (typeof children === 'string') return toWesternDigits(children);
  if (typeof children === 'number') return children;
  if (Array.isArray(children)) return children.map(westernizeChildren);
  return children;
}

const origTextRender = (Text as any).render;
if (origTextRender) {
  (Text as any).render = function(props: any, ref: any) {
    const style = props.style;
    const hasFont = style && (
      (Array.isArray(style) && style.some((s: any) => s && s.fontFamily)) ||
      (!Array.isArray(style) && style.fontFamily)
    );
    const newProps = { ...props };
    // Convert Eastern Arabic numerals → Western in text children
    if (newProps.children != null) {
      newProps.children = westernizeChildren(newProps.children);
    }
    if (!hasFont) {
      // Evaluate fontRegular() at render time so it respects language changes
      newProps.style = [{ fontFamily: fontRegular() }, style];
    }
    return origTextRender.call(this, newProps, ref);
  };
}

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
    if (__DEV__) console.log(`✅ ${name} completed`);
  } catch (error) {
    console.warn(`⚠️ ${name} failed:`, error);
    // Don't throw — continue with other initialization
  }
};

const hideSplash = async () => {
  try {
    await SplashScreen.hideAsync();
    if (__DEV__) console.log('✅ Splash screen hidden');
  } catch (e) {
    // Ignore — might already be hidden
  }
};

// Delays splash screen hide until BOTH fonts AND settings are loaded
// Prevents RTL flash for non-Arabic users (settings load is async)
const SplashGate = ({ fontsReady }: { fontsReady: boolean }) => {
  const { isLoading } = useSettings();
  const done = useRef(false);

  useEffect(() => {
    if (fontsReady && !isLoading && !done.current) {
      done.current = true;
      hideSplash();
    }
  }, [fontsReady, isLoading]);

  return null;
};

// Global RTL wrapper component
// Note: We do NOT set `direction: 'rtl'` here because it conflicts with
// the manual `flexDirection: isRTL ? 'row-reverse' : 'row'` patterns used
// throughout the app (200+ components). Setting direction at root level causes
// double-reversal: Yoga flips row→RTL, then row-reverse flips it back to LTR.
// Instead, all RTL layout is handled manually via useIsRTL() hook.
const RTLWrapper = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 480 } as any}>
          {children}
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      {children}
    </View>
  );
};

// Redirects first-time users to the onboarding flow
const OnboardingGate = () => {
  const { isLoading, isOnboardingComplete } = useOnboarding();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (!isLoading && !isOnboardingComplete && !redirected.current) {
      redirected.current = true;
      router.replace('/onboarding');
    }
  }, [isLoading, isOnboardingComplete]);

  return null;
};

export default function RootLayout() {
  const pathname = usePathname();
  const [appReady, setAppReady] = useState(false);
  const [languageReady, setLanguageReady] = useState(false);
  const splashHidden = useRef(false);

  // Wait for the eagerly-started language load (started at module scope in i18n.ts)
  // so that currentLanguage is correct before ANY component calls t()
  useEffect(() => {
    languageInitPromise.then(() => setLanguageReady(true));
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    'Rubik-Regular': require('../assets/fonts/Rubik-Regular.ttf'),
    'Rubik-Medium': require('../assets/fonts/Rubik-Medium.ttf'),
    'Rubik-SemiBold': require('../assets/fonts/Rubik-SemiBold.ttf'),
    'Rubik-Bold': require('../assets/fonts/Rubik-Bold.ttf'),
    'Raleway-Regular': require('../assets/fonts/Raleway-Regular.ttf'),
    'Raleway-Medium': require('../assets/fonts/Raleway-Medium.ttf'),
    'Raleway-SemiBold': require('../assets/fonts/Raleway-SemiBold.ttf'),
    'Raleway-Bold': require('../assets/fonts/Raleway-Bold.ttf'),
    'QCF_Default': require('../assets/fonts/qcf/QCF4_tajweed_001.ttf'),
    'QCFSurahNames': require('../assets/fonts/qcf/surah-names.ttf'),
    'Amiri': require('../assets/fonts/Amiri-Regular.ttf'),
    'Amiri-Bold': require('../assets/fonts/Amiri-Bold.ttf'),
    'KFGQPCUthmanic': require('../assets/fonts/KFGQPC-Uthmanic-Script.ttf'),
    'Orbitron-Bold': require('../assets/fonts/Orbitron-Bold.ttf'),
    'Orbitron-Regular': require('../assets/fonts/Orbitron-Regular.ttf'),
    // Required for VectorIcon in NativeTabs bottom navigation
    'MaterialCommunityIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
  });

  useEffect(() => {
    const initAds = async () => {
      try {
        const { TurboModuleRegistry } = require('react-native');
        TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsModule');
        const ads = require('react-native-google-mobile-ads');
        await ads.default().initialize();
        if (__DEV__) console.log('✅ Google Mobile Ads SDK initialized');
      } catch {
        // Not available (Expo Go / web)
      }
    };
    initAds();
  }, []);

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
    if (__DEV__) console.log('🚀 Starting app initialization...');

    const initFirebase = async () => {
      if (__DEV__) console.log('🔥 Initializing Firebase services...');

      await initWithTimeout(
        () => checkAndClearCacheOnUpdate().then(() => {}),
        'Cache check',
        5000
      );

      await initWithTimeout(
        () => initTranslationOverrides(),
        'Translation overrides',
        5000
      );

      await initWithTimeout(
        () => initRemoteTranslations(getLanguage() as any),
        'Remote translations',
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

      await initWithTimeout(
        async () => {
          const themes = await fetchQuranThemes(QURAN_THEMES);
          setQuranThemes(themes);
        },
        'Quran themes sync',
        5000
      );

      if (__DEV__) console.log('✅ Firebase initialization sequence complete');
    };

    initFirebase();

    // Sync widget data to native storage on launch
    initWithTimeout(
      () => syncWidgetDataToNative(),
      'Widget sync',
      5000
    );

    // Sync app icon to match saved language on launch
    initWithTimeout(
      () => syncAppIconOnStartup(getLanguage() as any),
      'App icon sync',
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

  useEffect(() => {
    const cleanupAds = initializeAppOpenAds();
    return () => {
      cleanupAds();
    };
  }, []);

  // Foreground notification sound player — plays custom sound based on notification data
  useEffect(() => {
    let currentSound: Audio.Sound | null = null;
    
    const subscription = ExpoNotifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;
      const soundType = data?.soundType as string | undefined;
      if (!soundType || soundType === 'default' || soundType === 'silent') return;

      // Handle ayah audio from URL
      if (soundType === 'ayah_audio' && data?.ayahAudioUrl) {
        try {
          if (currentSound) {
            try { await currentSound.unloadAsync(); } catch {}
            currentSound = null;
          }
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
          const { sound } = await Audio.Sound.createAsync(
            { uri: data.ayahAudioUrl as string },
            { shouldPlay: true }
          );
          currentSound = sound;
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              sound.unloadAsync();
              currentSound = null;
            }
          });
        } catch (e) {
          console.warn('Failed to play ayah audio:', e);
        }
        return;
      }

      // Resolve the sound file (check notification sounds first, then adhan sounds)
      const soundFile = NOTIFICATION_SOUND_FILES[soundType] || ADHAN_SOUND_FILES[soundType];
      if (!soundFile) return;

      try {
        // Clean up previous sound if still playing
        if (currentSound) {
          try { await currentSound.unloadAsync(); } catch {}
          currentSound = null;
        }

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound } = await Audio.Sound.createAsync(soundFile, { shouldPlay: true });
        currentSound = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            currentSound = null;
          }
        });
      } catch (e) {
        console.warn('Failed to play notification sound:', e);
      }
    });

    return () => {
      subscription.remove();
      if (currentSound) {
        currentSound.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Mark app ready when fonts finish (splash hide is handled by SplashGate inside SettingsProvider)
  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontError) {
        console.warn('⚠️ Font loading failed, continuing with system fonts:', fontError);
      }
      if (!splashHidden.current) {
        splashHidden.current = true;
        setAppReady(true);
      }
    }
  }, [fontsLoaded, fontError]);

  // Don't render tree until language is loaded from storage.
  // This prevents t() calls from returning Arabic on first render
  // when the user's language is different.
  if (!languageReady || (!appReady && !fontsLoaded)) {
    return null;
  }

  // ═══ RTL Mismatch Guard ═══
  // I18nManager.isRTL reflects the device locale at native bridge initialization.
  // If it doesn't match the app's saved language direction, forceRTL() was already
  // called (persisted to disk) by loadSavedLanguage() — we just need to reload
  // so the native bridge picks up the new value.
  const shouldBeRTL = appIsRTL();
  if (I18nManager.isRTL !== shouldBeRTL) {
    // forceRTL already called in loadSavedLanguage(), just need restart
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    if (!__DEV__) {
      try {
        const Updates = require('expo-updates');
        Updates.reloadAsync();
      } catch {
        // expo-updates not available
      }
    }
    // In dev, the next reload will apply the direction
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <SplashGate fontsReady={!!(fontsLoaded || fontError)} />
          <RTLWrapper>
          <ThemeConfigProvider>
          <RemoteConfigProvider>
            <AppConfigProvider>
              <MaintenanceGuard>
              <SubscriptionProvider>
              <AdsProvider>
                <NotificationsProvider>
                  <QuranProvider>
                  <GlobalAudioProvider>
                    <KhatmaProvider>
                      <WorshipProvider>
                        <SeasonalProvider>
                          <OnboardingProvider>
                        <OnboardingGate />
                        <StatusBar style="auto" />
                        <OfflineModal />
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
                          <Stack.Screen name="settings/live-activities" options={{ headerShown: false }} />
                          <Stack.Screen name="settings/photo-backgrounds" options={{ headerShown: false }} />
                          <Stack.Screen name="worship-tracker" />
                          <Stack.Screen name="names" />
                          <Stack.Screen name="ruqya" />
                          <Stack.Screen name="hijri" />
                          <Stack.Screen name="hajj-umrah" />
                          <Stack.Screen name="hajj" />
                          <Stack.Screen name="umrah" />
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
                          <Stack.Screen name="sdui/[screenId]" />
                        </Stack>
                        {!(pathname && pathname.startsWith('/qibla')) && <GlobalAudioBar />}
                        <DynamicSplashOverlay />
                        <ScreenshotBranding />
                          </OnboardingProvider>
                        </SeasonalProvider>
                      </WorshipProvider>
                    </KhatmaProvider>
                  </GlobalAudioProvider>
                  </QuranProvider>
                </NotificationsProvider>
              </AdsProvider>
              </SubscriptionProvider>
              </MaintenanceGuard>
            </AppConfigProvider>
          </RemoteConfigProvider>
          </ThemeConfigProvider>
          </RTLWrapper>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
