// app/_layout.tsx
// التخطيط الرئيسي للتطبيق مع تكامل Firebase
// آخر تحديث: 2026-03-08
// ⚠️ الإعلانات معلّقة للتجربة على Expo Go

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Animated, AppState, AppStateStatus, Platform, StyleSheet as RNStyleSheet, View, Text, TextInput, LogBox, I18nManager, UIManager } from 'react-native';
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
import { syncAppIconOnStartup, checkForIconUpdate } from '@/lib/app-icon-manager';

// Contexts
import { SettingsProvider, themeCachePromise } from '@/contexts/SettingsContext';
import { Colors, DarkColors } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { QuranProvider } from '@/contexts/QuranContext';
import { KhatmaProvider } from '@/contexts/KhatmaContext';
import { WorshipProvider } from '@/contexts/WorshipContext';
import { SeasonalProvider } from '@/contexts/SeasonalContext';
import { ThemeConfigProvider } from '@/contexts/ThemeConfigContext';
import { OnboardingProvider, useOnboarding } from '@/contexts/OnboardingContext';
import { CelebrationProvider } from '@/contexts/CelebrationContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { RemoteConfigProvider } from '@/contexts/RemoteConfigContext';
import { AdsProvider, useAds } from '@/lib/ads-context';
import { AppConfigProvider } from '@/lib/app-config-context';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';

// Firebase Integration
import { registerUser, updateLastActive, getUserId } from '@/lib/firebase-user';
import { db } from '@/lib/firebase-config';
import { doc as firestoreDoc, updateDoc as firestoreUpdateDoc, increment as firestoreIncrement } from 'firebase/firestore';
import { 
  initializeGlobalStats, 
  trackAppOpen, 
  syncLocalStats 
} from '@/lib/firebase-analytics';
import { autoSelectMonthlyWinners, syncPendingScores } from '@/lib/rewards-manager';
import { AudioPlayerBar } from '@/components/quran/AudioPlayerBar';
import { GlobalAudioBar } from '@/components/ui/GlobalAudioBar';
import { GlobalAudioProvider, markTrackPlayerReady } from '@/contexts/GlobalAudioContext';
import { usePathname, useRouter } from 'expo-router';
import { syncWidgetDataToNative } from '@/lib/widget-native-sync';
import { scheduleMidnightRefresh } from '@/lib/widget-data-bridge';
import { refreshLiveActivityIfEnabled } from '@/lib/live-activity-sync';
import { checkAndClearCacheOnUpdate } from '@/lib/cache-manager';
import { initTranslationOverrides } from '@/lib/auto-translate';
import { initRemoteTranslations } from '@/lib/remote-translations';
import { fontRegular } from '@/lib/fonts';
import { toWesternDigits } from '@/lib/format-number';
import { fetchQuranThemes } from '@/lib/admin-data-api';
import { QURAN_THEMES, setQuranThemes } from '@/constants/quran-themes';
import * as ExpoNotifications from 'expo-notifications';
import { handleNotificationNavigation } from '@/lib/notification-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadInstalledSoundsCache } from '@/lib/notification-sound-installer';
import { ensureNotificationIconsCached } from '@/lib/notification-icons';
import { initializeAllNotificationChannels, resetChannelsIfOutdated } from '@/services/notifications/channels';
import {
  requestNotificationPermissions as requestNewNotifPermissions,
} from '@/services/notifications/permissions';
import { rescheduleAllFromStorage, ensurePrayerNotificationsExist, checkTimezoneChange } from '@/lib/notifications-manager';
// Import at module scope to register the background task definition (required by expo-task-manager)
import '@/lib/background-notification-task';
import { registerBackgroundNotificationTask } from '@/lib/background-notification-task';
import { prefetchDailyVideos } from '@/lib/daily-video-prefetch';

// Signal that notification channels have been initialized.
// SettingsContext awaits this before scheduling to avoid race condition
// (child useEffects fire before parent useEffects in React).
let _channelsReadyResolve: () => void;
export const channelsReadyPromise = new Promise<void>((resolve) => {
  _channelsReadyResolve = resolve;
});
// Safety: resolve after 5s to prevent deadlock if init fails silently
setTimeout(() => _channelsReadyResolve(), 5000);

// Disable system-level RTL — the app handles RTL manually via useIsRTL() hook
// in 200+ components. Without this, Arabic device language causes double-reversal.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// Enable LayoutAnimation on Android — single consolidated call for the entire app
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Suppress known non-critical warnings
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Failed to initialize IAP',
  '[RN-IAP]',
  'initConnection',
  '[expo-av]:',
  'setLayoutAnimationEnabledExperimental',
  'Error playing ayah',
  'No native splash screen registered',
  'LoadBundleFromServerRequestError',
  'Could not load bundle',
  "The action 'GO_BACK' was not handled",
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

try {
  // Prevent auto-hide - we control when to hide via SplashGate
  SplashScreen.preventAutoHideAsync().catch(() => {
    // Ignore - native splash might not be available (Expo Go, hot reload)
  });
  // Disable native splash fade — we handle the transition ourselves via ThemeBootOverlay
  if (SplashScreen.setOptions) {
    SplashScreen.setOptions({ fade: false });
  }
} catch {
  // Native splash screen not available (Expo Go / hot reload)
}

// TrackPlayer initialization for lock screen audio controls (native only)
// Must be registered at module scope before any component renders
// Note: Will not work in Expo Go - requires dev client or standalone build
let trackPlayerAvailable = false;
if (Platform.OS !== 'web') {
  try {
    const TrackPlayer = require('react-native-track-player').default;
    const { PlaybackService } = require('@/lib/track-player-service');
    TrackPlayer.registerPlaybackService(() => PlaybackService);
    trackPlayerAvailable = true;
    console.log('🎵 TrackPlayer playback service registered');
  } catch (e) {
    // TrackPlayer not available (Expo Go)
    console.log('ℹ️ TrackPlayer not available, using expo-av fallback');
  }
}

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
    // Check if SplashScreen native module is available
    if (SplashScreen && typeof SplashScreen.hideAsync === 'function') {
      await SplashScreen.hideAsync().catch(() => {
        // Ignore all errors - splash may already be hidden or not registered
      });
      if (__DEV__) console.log('✅ Splash screen hidden');
    }
  } catch (e) {
    // Ignore — splash screen not available (Expo Go, hot reload, etc.)
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

// Centralized StatusBar — lives inside SettingsProvider so it can read theme state.
// Replaces the old `style="auto"` which couldn't account for app backgrounds.
/** Tracks route changes and calls onPageView() so the admin 'every N pages' interstitial mode works */
const NavigationTracker = () => {
  const pathname = usePathname();
  const { onPageView } = useAds();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (pathname && pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      onPageView();
    }
  }, [pathname, onPageView]);

  return null;
};

const StatusBarManager = () => {
  const colors = useColors();
  return <StatusBar style={colors.statusBarStyle} translucent={true} />;
};

// Smooth theme transition overlay — covers screen with correct theme color
// while the real content finishes rendering (including background images).
// Fades out AFTER settings are loaded, preventing any flash between splash and content.
const ThemeBootOverlay = () => {
  const { isLoading, isDarkMode } = useSettings();
  const colors = useColors();
  const opacity = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      // Wait two frames for real content (including ImageBackground) to paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }).start(() => setVisible(false));
        });
      });
    }
  }, [isLoading]);

  if (!visible) return null;

  const bg = colors.background;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        RNStyleSheet.absoluteFill,
        { backgroundColor: bg, opacity, zIndex: 99999 },
      ]}
    />
  );
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

// Auto-presents the paywall based on admin config (showPaywallOnLaunch + paywallFrequency)
const PaywallAutoTrigger = () => {
  const { shouldAutoShowPaywall, markPaywallAutoShown, isLoading } = useSubscription();
  const router = useRouter();
  const triggered = useRef(false);

  useEffect(() => {
    if (!isLoading && shouldAutoShowPaywall && !triggered.current) {
      triggered.current = true;
      markPaywallAutoShown();
      // Small delay to ensure navigation stack is ready
      const timer = setTimeout(() => {
        router.push('/subscription' as any);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, shouldAutoShowPaywall]);

  return null;
};


export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);
  const [languageReady, setLanguageReady] = useState(false);
  const splashHidden = useRef(false);

  // Wait for the eagerly-started language + theme cache loads.
  // Both are module-scope promises that read from AsyncStorage.
  // We gate rendering on these so the first paint has correct language AND theme.
  // Safety: 4s timeout prevents permanent hang if AsyncStorage is slow/stuck.
  useEffect(() => {
    let done = false;
    Promise.all([languageInitPromise, themeCachePromise]).then(() => {
      if (!done) { done = true; setLanguageReady(true); }
    }).catch(() => {
      if (!done) { done = true; setLanguageReady(true); }
    });
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        console.warn('⚠️ Language/theme cache timed out after 4s — proceeding with defaults');
        setLanguageReady(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
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
    // Pre-load QCF page fonts used by azkar Quran verses (light + dark variants)
    'QCF4p24l': require('../assets/fonts/qcf/QCF4_tajweed_024.ttf'),
    'QCF4p24d': require('../assets/fonts/qcf/QCF4_tajweed_024.ttf'),
    'QCF4p31l': require('../assets/fonts/qcf/QCF4_tajweed_031.ttf'),
    'QCF4p31d': require('../assets/fonts/qcf/QCF4_tajweed_031.ttf'),
    'QCF4p42l': require('../assets/fonts/qcf/QCF4_tajweed_042.ttf'),
    'QCF4p42d': require('../assets/fonts/qcf/QCF4_tajweed_042.ttf'),
    'QCF4p49l': require('../assets/fonts/qcf/QCF4_tajweed_049.ttf'),
    'QCF4p49d': require('../assets/fonts/qcf/QCF4_tajweed_049.ttf'),
    'QCF4p75l': require('../assets/fonts/qcf/QCF4_tajweed_075.ttf'),
    'QCF4p75d': require('../assets/fonts/qcf/QCF4_tajweed_075.ttf'),
    'QCF4p342l': require('../assets/fonts/qcf/QCF4_tajweed_342.ttf'),
    'QCF4p342d': require('../assets/fonts/qcf/QCF4_tajweed_342.ttf'),
    'QCF4p415l': require('../assets/fonts/qcf/QCF4_tajweed_415.ttf'),
    'QCF4p415d': require('../assets/fonts/qcf/QCF4_tajweed_415.ttf'),
    'QCF4p490l': require('../assets/fonts/qcf/QCF4_tajweed_490.ttf'),
    'QCF4p490d': require('../assets/fonts/qcf/QCF4_tajweed_490.ttf'),
    'QCF4p537l': require('../assets/fonts/qcf/QCF4_tajweed_537.ttf'),
    'QCF4p537d': require('../assets/fonts/qcf/QCF4_tajweed_537.ttf'),
    'QCF4p562l': require('../assets/fonts/qcf/QCF4_tajweed_562.ttf'),
    'QCF4p562d': require('../assets/fonts/qcf/QCF4_tajweed_562.ttf'),
    'QCF4p604l': require('../assets/fonts/qcf/QCF4_tajweed_604.ttf'),
    'QCF4p604d': require('../assets/fonts/qcf/QCF4_tajweed_604.ttf'),
    'Amiri': require('../assets/fonts/Amiri-Regular.ttf'),
    'Amiri-Bold': require('../assets/fonts/Amiri-Bold.ttf'),
    'Amiri-Italic': require('../assets/fonts/Amiri-Italic.ttf'),
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
        // Globally mute ad audio so ads never interrupt Quran/Radio playback
        await ads.default().setAppVolume(0);
        await ads.default().setAppMuted(true);
        if (__DEV__) console.log('✅ Google Mobile Ads SDK initialized (audio muted)');
      } catch {
        // Not available (Expo Go / web)
      }
    };
    initAds();
  }, []);

  // Safety timeout: ALWAYS hide splash screen after 6 seconds no matter what.
  // Must call hideSplash() unconditionally — the font-loaded effect sets
  // splashHidden.current=true but delegates actual hide to SplashGate,
  // which may be waiting for SettingsContext.isLoading (blocked by Firebase
  // offline timeout). Without this, splash stays forever on slow networks.
  useEffect(() => {
    const safetyTimer = setTimeout(async () => {
      console.warn('⚠️ Safety timeout reached — forcing splash screen hide');
      splashHidden.current = true;
      setAppReady(true);
      await hideSplash();
    }, 6000);
    return () => clearTimeout(safetyTimer);
  }, []);

  // Notification channels — SEPARATE useEffect, runs immediately on mount.
  // Must NOT be inside Firebase useEffect: channels must be ready before
  // any notification fires, and Firebase init can be slow or fail.
  useEffect(() => {
    async function initNotificationChannels() {
      try {
        console.log('[Notifications] Init starting — requesting permissions...');
        const granted = await requestNewNotifPermissions();

        // Always set up channels regardless of permission — they must exist
        // before any notification can be scheduled (e.g. after user grants
        // permission later via Settings).
        console.log('[Notifications] Setting up channels...');
        await resetChannelsIfOutdated();
        console.log('[Notifications] resetChannelsIfOutdated complete');

        await initializeAllNotificationChannels();
        console.log('[Notifications] initializeAllNotificationChannels complete');

        // Load installed custom sounds cache BEFORE unblocking scheduling.
        // SettingsContext awaits channelsReadyPromise before scheduling —
        // custom sounds must be in memory so resolveNotificationSound() finds them.
        try {
          await loadInstalledSoundsCache();
          console.log('[Notifications] Installed sounds cache loaded');
        } catch (e) {
          console.warn('[Notifications] Failed to load sounds cache:', e);
        }

        // Unblock SettingsContext scheduling now that channels + sounds are ready
        _channelsReadyResolve();

        if (!granted) {
          console.log('[Notifications] Permission NOT granted, skipping scheduling');
          return;
        }
        console.log('[Notifications] Permission granted — scheduling...');

        // Register background task to reschedule DATE-based notifications
        // (prayer times, after-prayer azkar) even when app is closed/killed
        await registerBackgroundNotificationTask();
        console.log('[Notifications] Background task registered');

        // NOTE: rescheduleAllFromStorage() is NOT called here intentionally.
        // Scheduling is handled by SettingsContext.loadSettings() which:
        // 1. Waits for channelsReadyPromise to resolve (channels exist)
        // 2. Calls scheduleNotificationsFromSettings() with mutex protection
        // 3. Sets initialSchedulingDone=true so admin sync can proceed
        // Calling rescheduleAllFromStorage() here would race and potentially
        // wipe notifications scheduled by SettingsContext.

        console.log('[Notifications] Init complete');
      } catch (error) {
        console.error('[Notifications] Init failed:', error);
        _channelsReadyResolve(); // Unblock scheduling even on failure
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

      // Initialize TrackPlayer in parallel (non-blocking) — runs alongside Firebase inits
      // so its startup cost doesn't gate the splash screen hide.
      const trackPlayerInitPromise = Platform.OS !== 'web' && trackPlayerAvailable
        ? initWithTimeout(
            async () => {
              try {
                const TrackPlayer = require('react-native-track-player').default;
                const { Capability, RepeatMode } = require('react-native-track-player');
                await TrackPlayer.setupPlayer({
                  autoUpdateMetadata: true,
                });
                await TrackPlayer.updateOptions({
                  capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.Stop,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.SeekTo,
                  ],
                  compactCapabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                  ],
                  notificationCapabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.Stop,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                  ],
                });
                await TrackPlayer.setRepeatMode(RepeatMode.Off);
                markTrackPlayerReady();
                console.log('🎵 TrackPlayer initialized');
              } catch (e) {
                console.log('ℹ️ TrackPlayer setup skipped (not available)');
              }
            },
            'TrackPlayer setup',
            5000
          )
        : Promise.resolve();

      // Load installed sounds cache BEFORE any parallel init
      // This must complete before notification scheduling uses getNotificationSoundValueSync()
      await initWithTimeout(
        () => loadInstalledSoundsCache(),
        'Installed sounds cache',
        2000
      );

      // Run remaining Firebase inits in parallel for faster startup
      // TrackPlayer setup runs here too — no longer gates the sounds cache load
      await Promise.all([
        trackPlayerInitPromise,
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
          8000
        ),
        initWithTimeout(
          async () => {
            // Track app open FIRST (saves score locally), then sync all pending to Firestore
            await trackAppOpen();
            const uid = await getUserId();
            if (uid) await syncPendingScores(uid);
          },
          'Track app open + sync scores',
          10000
        ),
        initWithTimeout(
          () => autoSelectMonthlyWinners(),
          'Auto-select monthly winners',
          5000
        ),
        initWithTimeout(
          async () => {
            const themes = await fetchQuranThemes(QURAN_THEMES);
            setQuranThemes(themes);
          },
          'Quran themes sync',
          3000
        ),
        initWithTimeout(
          () => ensureNotificationIconsCached(),
          'Notification icons cache',
          3000
        ),
      ]);

      if (__DEV__) console.log('✅ Firebase initialization sequence complete');

      // Video prefetch runs AFTER all critical init — truly fire-and-forget.
      // Not inside Promise.all to avoid blocking Firebase init completion.
      // The story screen falls back to CDN streaming if not cached yet.
      prefetchDailyVideos().catch(() => {});
    };

    initFirebase();

    // Sync widget data to native storage on launch
    initWithTimeout(
      () => syncWidgetDataToNative(),
      'Widget sync',
      5000
    );

    // Auto-start/refresh Live Activity for prayer countdown (iOS only)
    initWithTimeout(
      () => refreshLiveActivityIfEnabled(),
      'Live Activity refresh',
      5000
    );

    // Schedule midnight refresh for daily verse/dhikr widget content
    const cleanupMidnight = scheduleMidnightRefresh();

    // Sync app icon to match saved language on launch
    initWithTimeout(
      () => syncAppIconOnStartup(getLanguage() as any),
      'App icon sync',
      5000
    );

    // Check for admin-pushed icon updates and show alert if new version
    initWithTimeout(
      () => checkForIconUpdate(),
      'App icon update check',
      5000
    );
    
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateLastActive().catch(() => {});
        syncWidgetDataToNative().catch(() => {});
        refreshLiveActivityIfEnabled().catch(() => {});
        // Verify prayer notifications exist; if none, force reschedule.
        // This catches the case where all DATE triggers have fired and nothing is left.
        ensurePrayerNotificationsExist().catch(() => {});
        // Detect timezone/DST changes and force-reschedule if changed.
        // This catches travel, manual timezone change, and DST transitions.
        checkTimezoneChange().catch(() => {});
        // Refresh the 7-day DATE trigger window for all notification categories.
        // rescheduleAllFromStorage is internally throttled (60s) to avoid excessive work.
        rescheduleAllFromStorage().catch(() => {});
      } else if (nextAppState === 'background') {
        syncLocalStats().catch(() => {});
        // Sync widget data before app goes to background so widgets show fresh content
        syncWidgetDataToNative().catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    const activityInterval = setInterval(() => {
      updateLastActive().catch(() => {});
    }, 5 * 60 * 1000);

    const syncInterval = setInterval(() => {
      syncLocalStats().catch(() => {});
    }, 15 * 60 * 1000);

    // Periodic widget sync every 15 minutes to keep prayer countdown and azkar status current
    const widgetSyncInterval = setInterval(() => {
      syncWidgetDataToNative().catch(() => {});
    }, 15 * 60 * 1000);

    // Periodic prayer notification health check every 10 minutes
    // Catches edge cases where all scheduled prayers expired while app stayed open
    const prayerCheckInterval = setInterval(() => {
      ensurePrayerNotificationsExist().catch(() => {});
    }, 10 * 60 * 1000);

    return () => {
      subscription.remove();
      clearInterval(activityInterval);
      clearInterval(syncInterval);
      clearInterval(widgetSyncInterval);
      clearInterval(prayerCheckInterval);
      cleanupMidnight();
    };
  }, []);

  useEffect(() => {
    const cleanupAds = initializeAppOpenAds();
    return () => {
      cleanupAds();
    };
  }, []);

  // NOTE: Foreground notification sound player REMOVED.
  // The native notification handler (setNotificationHandler with shouldPlaySound: true)
  // already plays the correct custom sound from the bundled assets.
  // Having a second expo-av player here caused double sound playback / echo
  // when notifications arrived while the app was in the foreground.

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

  // ── Cold-start notification handler ──
  // When the app is killed and the user taps a notification, this captures the
  // last notification response *after* the navigation tree is ready, then routes
  // to the correct screen via the shared router.
  const coldStartHandled = useRef(false);
  useEffect(() => {
    if (!appReady || !languageReady || coldStartHandled.current) return;
    coldStartHandled.current = true;

    const checkLastNotification = async () => {
      try {
        const response = await ExpoNotifications.getLastNotificationResponseAsync();
        if (!response) return;

        const data = response.notification.request.content.data;
        const notifId = response.notification.request.identifier;

        if (__DEV__) console.log('🔔 Cold-start notification tap:', notifId, data?.type);

        // Track notification open in Firestore
        if (data?.notificationDocId) {
          firestoreUpdateDoc(firestoreDoc(db, 'notifications', data.notificationDocId as string), {
            openedCount: firestoreIncrement(1),
          }).catch(() => {});
        }

        // Small delay to ensure the navigation container is fully mounted
        setTimeout(() => {
          handleNotificationNavigation(data, router, notifId);
        }, 600);
      } catch (e) {
        console.warn('Failed to handle cold-start notification:', e);
      }
    };

    checkLastNotification();
  }, [appReady, languageReady, router]);

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
          <ThemeBootOverlay />
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
                          <CelebrationProvider>
                        <OnboardingGate />
                        <PaywallAutoTrigger />
                        <StatusBarManager />
                        <NavigationTracker />
                        <OfflineModal />
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            animation: Platform.OS === 'ios' ? 'ios_from_right' : 'fade_from_bottom',
                            gestureEnabled: true,
                            fullScreenGestureEnabled: Platform.OS === 'ios',
                            contentStyle: { backgroundColor: 'transparent' },
                          }}
                        >
                          <Stack.Screen name="(tabs)" />
                          <Stack.Screen name="onboarding" />
                          <Stack.Screen name="surah/[id]" />
                          <Stack.Screen name="tafsir" />
                          <Stack.Screen name="azkar/[category]" />
                          <Stack.Screen name="settings/live-activities" options={{ headerShown: false }} />
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
                          </CelebrationProvider>
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
