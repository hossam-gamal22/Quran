// app/_layout.tsx
// التخطيط الرئيسي للتطبيق مع تكامل Firebase
// آخر تحديث: 2026-03-08
// ⚠️ الإعلانات معلّقة للتجربة على Expo Go

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, Platform, View, Text, TextInput, LogBox, I18nManager } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OfflineModal } from '@/components/ui/OfflineBanner';
import { MaintenanceGuard } from '@/components/ui/MaintenanceGuard';
import { DynamicSplashOverlay } from '@/components/ui/DynamicSplashOverlay';
import { useSettings } from '@/contexts/SettingsContext';

import { initializeAppOpenAds } from '@/lib/app-open-ad';
import { languageInitPromise, getLanguage } from '@/lib/i18n';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadInstalledSoundsCache } from '@/lib/notification-sound-installer';
import { setupNotificationChannels, resetChannelsIfOutdated } from '@/services/notifications/channels';
import {
  requestNotificationPermissions as requestNewNotifPermissions,
  requestBatteryOptimizationExemption,
} from '@/services/notifications/permissions';

// Disable system-level RTL — the app handles RTL manually via useIsRTL() hook
// in 200+ components. Without this, Arabic device language causes double-reversal.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// Suppress known non-critical warnings
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Failed to initialize IAP',
  '[RN-IAP]',
  'initConnection',
  '[expo-av]:',
  'setLayoutAnimationEnabledExperimental',
  'Error playing ayah',
  'LoadBundleFromServerRequestError',
  'Could not load bundle',
]);

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

// TrackPlayer removed — app uses expo-av exclusively for audio

// Register Android widget task handler at module scope
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('@/lib/android-widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // react-native-android-widget not available
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
const INIT_TIMEOUT = 5000; // 5 seconds max per operation
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
    }, 6000);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Notification channels — SEPARATE useEffect, runs immediately on mount.
  // Must NOT be inside Firebase useEffect: channels must be ready before
  // any notification fires, and Firebase init can be slow or fail.
  useEffect(() => {
    async function initNotificationChannels() {
      try {
        const granted = await requestNewNotifPermissions();
        if (!granted) return;

        // Reset outdated cached channels (Android caches permanently)
        await resetChannelsIfOutdated();

        // Load user's saved sound preferences
        const adhanSound    = (await AsyncStorage.getItem('selectedAdhanSound')) ?? 'makkah';
        const fajrSound     = (await AsyncStorage.getItem('selectedFajrSound')) ?? 'makkah';
        const reminderSound = (await AsyncStorage.getItem('selectedReminderSound')) ?? 'general_reminder';

        // Create channels with correct sounds
        await setupNotificationChannels(adhanSound, fajrSound, reminderSound);

        // Battery optimization (Android only, shown once)
        await requestBatteryOptimizationExemption();
      } catch (error) {
        console.error('[Notifications] Init failed:', error);
      }
    }

    initNotificationChannels();
  }, []);

  // Firebase Integration — each step isolated with timeout
  useEffect(() => {
    if (__DEV__) console.log('🚀 Starting app initialization...');

    const initFirebase = async () => {
      if (__DEV__) console.log('🔥 Initializing Firebase services...');

      // Cache check must run first (sequential)
      await initWithTimeout(
        () => checkAndClearCacheOnUpdate().then(() => {}),
        'Cache check',
        3000
      );

      // Load installed sounds cache BEFORE any parallel init
      // This must complete before notification scheduling uses getNotificationSoundValueSync()
      await initWithTimeout(
        () => loadInstalledSoundsCache(),
        'Installed sounds cache',
        2000
      );

      // Run remaining Firebase inits in parallel for faster startup
      await Promise.all([
        initWithTimeout(
          () => initTranslationOverrides(),
          'Translation overrides',
          3000
        ),
        initWithTimeout(
          () => initRemoteTranslations(getLanguage() as any),
          'Remote translations',
          3000
        ),
        initWithTimeout(
          () => initializeGlobalStats(),
          'Global stats init',
          3000
        ),
        initWithTimeout(
          () => registerUser().then(() => {}),
          'User registration',
          3000
        ),
        initWithTimeout(
          () => trackAppOpen(),
          'Track app open',
          3000
        ),
        initWithTimeout(
          async () => {
            const themes = await fetchQuranThemes(QURAN_THEMES);
            setQuranThemes(themes);
          },
          'Quran themes sync',
          3000
        ),
      ]);

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

  // RTL is handled manually via useIsRTL() hook throughout the app (200+ components).
  // I18nManager.forceRTL() is NOT called — it causes double-reversal on Android
  // production builds where the native bridge applies RTL, conflicting with the
  // manual flexDirection: 'row-reverse' patterns used throughout the codebase.

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
