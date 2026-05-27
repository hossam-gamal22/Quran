// app/_layout.tsx
// التخطيط الرئيسي للتطبيق مع تكامل Firebase
// آخر تحديث: 2026-03-08
// ⚠️ الإعلانات معلّقة للتجربة على Expo Go

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Animated, AppState, AppStateStatus, Platform, StyleSheet as RNStyleSheet, View, Text, TextInput, LogBox, I18nManager, UIManager } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { OfflineModal } from '@/components/ui/OfflineBanner';
import { MaintenanceGuard } from '@/components/ui/MaintenanceGuard';
import { DynamicSplashOverlay } from '@/components/ui/DynamicSplashOverlay';
import { useSettings } from '@/contexts/SettingsContext';

import { initializeAppOpenAds } from '@/lib/app-open-ad';
import { languageInitPromise, getLanguage, isRTL as isRTLLang } from '@/lib/i18n';
import { syncAppIconOnStartup, checkForIconUpdate } from '@/lib/app-icon-manager';
import { getCurrentSeason as getLocalCurrentSeason } from '@/lib/seasonal-content';
import { hydrateHijriOffset } from '@/lib/hijri-date';

// Contexts
import { SettingsProvider, themeCachePromise } from '@/contexts/SettingsContext';
import { Colors, DarkColors } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { QuranProvider } from '@/contexts/QuranContext';
import { KhatmaProvider } from '@/contexts/KhatmaContext';
import { WorshipProvider } from '@/contexts/WorshipContext';
import { MemorizationProvider } from '@/contexts/MemorizationContext';
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
import { registerUser, updateLastActive, getUserId, getOriginalDeviceUserId, syncUserProfileFromFirestore } from '@/lib/firebase-user';
import { db } from '@/lib/firebase-config';
import { doc as firestoreDoc, updateDoc as firestoreUpdateDoc, increment as firestoreIncrement } from 'firebase/firestore';
import { 
  initializeGlobalStats, 
  trackAppOpen, 
  syncLocalStats 
} from '@/lib/firebase-analytics';
import { syncMonthlyEngagementFromLocalWorship } from '@/lib/rewards-manager';
import { syncPremiumWorshipCloudData } from '@/lib/premium-worship-cloud-sync';
import { AudioPlayerBar } from '@/components/quran/AudioPlayerBar';
import { GlobalAudioBar } from '@/components/ui/GlobalAudioBar';
import { SnapshotHost } from '@/lib/widgets/snapshot';
import { SnapshotPumpController } from '@/components/widgets/SnapshotPumpController';
import { GlobalAudioProvider, markTrackPlayerReady } from '@/contexts/GlobalAudioContext';
import { usePathname, useRouter } from 'expo-router';
import { syncWidgetDataToNative } from '@/lib/widget-native-sync';
import { scheduleMidnightRefresh } from '@/lib/widget-data-bridge';
import { refreshLiveActivityIfEnabled } from '@/lib/live-activity-sync';
import { checkAndClearCacheOnUpdate } from '@/lib/cache-manager';
import { ensureFirebaseUser } from '@/config/firebase';
import { initTranslationOverrides } from '@/lib/auto-translate';
import { subscribeToSoundSettings, refreshSoundSettings } from '@/lib/sound-manager';
import {
  hydrateAzkarFromFirestore,
  refreshAzkarFromFirestore,
  subscribeToAzkarFromFirestore,
  hydrateCustomCategoriesFromFirestore,
  subscribeToCustomCategoriesFromFirestore,
} from '@/lib/azkar-api';
import { hydrateFontSettings } from '@/hooks/use-font-config';
import { hydrateDailyDuasFromFirestore } from '@/data/daily-duas';
import { hydrateFamousDuasFromFirestore } from '@/data/famous-duas';
import { hydrateStoriesFromFirestore } from '@/data/stories';
import { initRemoteTranslations } from '@/lib/remote-translations';
import { fontRegular } from '@/lib/fonts';
import { toWesternDigits } from '@/lib/format-number';
import { fetchQuranThemes, subscribeToQuranThemes } from '@/lib/admin-data-api';
import { QURAN_THEMES, setQuranThemes } from '@/constants/quran-themes';
import * as ExpoNotifications from 'expo-notifications';
import { handleNotificationNavigation } from '@/lib/notification-router';
import { handleDidYouPrayResponse } from '@/lib/did-you-pray-handler';
import { consumePendingDeepLink, consumeInitialURL, subscribeToDeepLinks, wasDeepLinkConsumed } from '@/lib/deep-link-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadInstalledSoundsCache } from '@/lib/notification-sound-installer';
import { ensureNotificationIconsCached } from '@/lib/notification-icons';
import { initializeAllNotificationChannels, resetChannelsIfOutdated, verifyNotificationChannels } from '@/services/notifications/channels';
import {
  requestNotificationPermissions as requestNewNotifPermissions,
} from '@/services/notifications/permissions';
import { rescheduleAllFromStorage, ensurePrayerNotificationsExist, checkTimezoneChange, forceRescheduleAllFromStorage } from '@/lib/notifications-manager';
import { runScheduleHealthCheck } from '@/lib/schedule-health-check';
import { maybeUploadTelemetry } from '@/lib/notification-telemetry';
// Import at module scope to register the background task definition (required by expo-task-manager)
import '@/lib/background-notification-task';
import { registerBackgroundNotificationTask } from '@/lib/background-notification-task';
import '@/lib/app-icon-background-task';
import { registerAppIconBackgroundTask } from '@/lib/app-icon-background-task';
import '@/lib/hijri-push-sync';
import { applyHijriOverridePushPayload, registerHijriOverridePushTask } from '@/lib/hijri-push-sync';
import { prefetchDailyVideos } from '@/lib/daily-video-prefetch';
import { prefetchNatureImages } from '@/lib/nature-image-prefetch';
import { NATURE_BG_URLS } from '@/constants/nature-backgrounds';
import { downloadFromCloud, getCloudBackupMeta, uploadToCloud } from '@/lib/cloud-sync';
import { isLocalDataEmpty } from '@/lib/backup-utils';
import * as Auth from '@/lib/_core/auth';
import {
  recordSessionStart,
  saveSessionTime,
  shouldShowRating,
  showRatingPrompt,
} from '@/lib/app-rating';
import { recordHonorBoardNameReminderOpen } from '@/lib/honor-board-name-reminder';

// Signal that notification channels have been initialized.
// SettingsContext awaits this before scheduling to avoid race condition
// (child useEffects fire before parent useEffects in React).
let _channelsReadyResolve: () => void;
export const channelsReadyPromise = new Promise<void>((resolve) => {
  _channelsReadyResolve = resolve;
});
// Safety: resolve after 5s to prevent deadlock if init fails silently
setTimeout(() => _channelsReadyResolve(), 5000);

const APP_OPENED_ONCE_KEY = '@rooh_app_opened_once';

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
  // Firebase JS SDK WebSocket stream state-machine assertion in React Native.
  // Fixed by experimentalForceLongPolling in config/firebase.ts; kept here as
  // a safety net for any remaining edge cases during network transitions.
  'FIRESTORE (10',
  'INTERNAL ASSERTION FAILED',
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
  // iOS Simulator / unsigned builds lack keychain + aps-environment entitlements.
  // These errors never occur on real devices with a valid provisioning profile.
  "A required entitlement isn't present",
  'Keychain access failed',
  'aps-environment',
  'getValueWithKeyAsync',
  'getRegistrationInfoAsync',
  // Expo Go race condition: vector-icon components mount and call
  // Font.loadAsync() in parallel with our top-level useFonts() preload.
  // expo-asset's native module rejects one of the duplicate downloads
  // even though Metro returns 200 OK and the icons render correctly.
  // Harmless in dev — does not occur in standalone builds.
  'Unable to download asset from url',
]);

// Configure notification handler at the top level (before any component renders)
// Wrapped in try-catch to avoid console error on Expo Go (SDK 53+ removed push notifications from Expo Go)
try {
  ExpoNotifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const type = notification.request.content.data?.type;
      // On iOS, the system cuts notification sounds after ~2-3 s when the app is
      // in the foreground. For full_adhan we suppress the notification sound here
      // and instead play the audio via expo-av in addNotificationReceivedListener
      // so the full 2-4 min adhan plays without any OS time cap.
      // On Android the notification sound is just the short safety-net; the
      // foreground service handles the actual full-adhan playback — so we keep
      // sound enabled on Android for the safety-net path.
      const suppressSoundForFullAdhan =
        type === 'full_adhan' && Platform.OS === 'ios';
      return {
        shouldShowAlert: true,
        shouldPlaySound: !suppressSoundForFullAdhan,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
} catch (e) {
  // Silently ignore — Expo Go doesn't support push notifications
}

// Phase 6: سجّل category الـ "هل صليت؟" مبكراً جداً (module scope)
// عشان أزرار الإجابة تكون متاحة من أول لحظة بعد cold-start، حتى لو
// ما تمت أي عملية إعادة جدولة بعد. iOS تحفظها في النظام دائماً.
import('@/lib/did-you-pray-handler')
  .then(({ registerDidYouPrayCategory }) => registerDidYouPrayCategory())
  .catch(() => {});

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

if (Platform.OS === 'android') {
  setTimeout(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, 7000);
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
  // Walk the style prop (object | array | nested array | falsy) and check
  // whether any entry already sets one of the given keys. Used to let caller
  // styles opt out of the global RTL/font defaults below.
  const styleHasAny = (style: any, keys: string[]): boolean => {
    if (!style) return false;
    if (Array.isArray(style)) return style.some((s) => styleHasAny(s, keys));
    if (typeof style === 'object') {
      for (const k of keys) if (style[k] != null) return true;
    }
    return false;
  };

  (Text as any).render = function(props: any, ref: any) {
    const style = props.style;
    const hasFont = styleHasAny(style, ['fontFamily']);
    // Skip injecting RTL defaults if caller set textAlign/writingDirection.
    // This preserves explicit 'center' titles, numeric alignment, etc.
    const hasAlign = styleHasAny(style, ['textAlign', 'writingDirection']);

    const newProps = { ...props };
    // Convert Eastern Arabic numerals → Western in text children
    if (newProps.children != null) {
      newProps.children = westernizeChildren(newProps.children);
    }

    const defaults: any = {};
    if (!hasFont) defaults.fontFamily = fontRegular();
    // Global RTL default: Arabic/Urdu/Persian UI → text naturally right-aligned
    // with RTL writing direction. Any Text that wants otherwise must opt out
    // by setting textAlign or writingDirection explicitly.
    if (!hasAlign) {
      const rtl = isRTLLang();
      defaults.textAlign = rtl ? 'right' : 'left';
      defaults.writingDirection = rtl ? 'rtl' : 'ltr';
    }

    if (Object.keys(defaults).length > 0) {
      newProps.style = [defaults, style];
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
      // Don't count onboarding screens as page views for ad triggers
      if (!pathname.startsWith('/onboarding')) {
        onPageView();
      }
    }
  }, [pathname, onPageView]);

  return null;
};

const StatusBarManager = () => {
  const colors = useColors();
  return <StatusBar style={colors.statusBarStyle} translucent={true} />;
};

const PremiumWorshipCloudSyncGate = () => {
  const { isPremium, isLoading } = useSubscription();
  const syncInFlightRef = useRef(false);

  const runSync = useCallback(async (force = false) => {
    if (isLoading || !isPremium || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      await restoreFullCloudBackupIfFreshInstall();
      const userId = await getUserId();
      const result = await syncPremiumWorshipCloudData(userId, true, { force });
      if (__DEV__ && result.restoredKeys.length > 0) {
        console.log('[premium-backup] restored keys:', result.restoredKeys);
      }
    } catch (error) {
      if (__DEV__) console.warn('[premium-backup] sync failed:', error);
    } finally {
      syncInFlightRef.current = false;
    }
  }, [isLoading, isPremium]);

  useEffect(() => {
    runSync(true);
  }, [runSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        runSync(false);
      }
    });
    return () => subscription.remove();
  }, [runSync]);

  return null;
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

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
      // Delay to ensure navigation stack is ready + check if a deep link
      // already navigated the user (don't override Control Center / Spotlight).
      const timer = setTimeout(() => {
        if (!wasDeepLinkConsumed()) {
          router.push('/subscription' as any);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading, shouldAutoShowPaywall]);

  return null;
};

const HonorBoardNameReminderGate = () => {
  const { isLoading, isOnboardingComplete } = useOnboarding();
  const router = useRouter();
  const pathname = usePathname();
  const promptedThisSession = useRef(false);
  const checkInFlight = useRef(false);
  const activeCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCheck = useCallback(async () => {
    if (
      isLoading ||
      !isOnboardingComplete ||
      promptedThisSession.current ||
      checkInFlight.current ||
      pathname?.startsWith('/onboarding')
    ) {
      return;
    }

    checkInFlight.current = true;
    try {
      const result = await recordHonorBoardNameReminderOpen();
      if (!result.shouldPrompt || promptedThisSession.current) return;

      promptedThisSession.current = true;
      const isArabic = (getLanguage() || 'ar') === 'ar';
      Alert.alert(
        isArabic ? 'اسمك على لوحة الشرف' : 'Your honor board name',
        isArabic
          ? 'أنت تفتح التطبيق بانتظام منذ أسبوع. اكتب اسمك حتى يظهر في لوحة الشرف عند تقدمك في الترتيب.'
          : 'You have opened the app consistently for a week. Add your name so it can appear on the honor board as you climb the rankings.',
        [
          {
            text: isArabic ? 'لاحقًا' : 'Later',
            style: 'cancel',
          },
          {
            text: isArabic ? 'اكتب الاسم' : 'Add name',
            onPress: () => {
              router.push({ pathname: '/(tabs)/settings', params: { editName: '1' } } as any);
            },
          },
        ],
      );
    } catch (error) {
      if (__DEV__) console.warn('[honor-board-name-reminder] check failed:', error);
    } finally {
      checkInFlight.current = false;
    }
  }, [isLoading, isOnboardingComplete, pathname, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runCheck();
    }, 12_000);
    return () => clearTimeout(timer);
  }, [runCheck]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (activeCheckTimer.current) clearTimeout(activeCheckTimer.current);
        activeCheckTimer.current = setTimeout(() => {
          runCheck();
        }, 1500);
      }
    });
    return () => {
      subscription.remove();
      if (activeCheckTimer.current) clearTimeout(activeCheckTimer.current);
    };
  }, [runCheck]);

  return null;
};

const AUTO_BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function autoBackupIfNeeded() {
  try {
    const user = await Auth.getUserInfo();
    if (!user?.openId) return;
    // Check premium — read subscription state from AsyncStorage
    const subRaw = await AsyncStorage.getItem('@subscription_state');
    if (!subRaw) return;
    let sub: { isPremium?: boolean };
    try { sub = JSON.parse(subRaw); } catch { return; }
    if (!sub.isPremium) return;
    // Check last backup date
    const lastDate = await AsyncStorage.getItem('last_backup_date');
    if (lastDate) {
      const elapsed = Date.now() - new Date(lastDate).getTime();
      if (elapsed < AUTO_BACKUP_INTERVAL_MS) return;
    }
    // Perform silent backup
    const result = await uploadToCloud(user.openId);
    if (result.success) {
      await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
      console.log('☁️ [AutoBackup] Silent backup completed');
    }
  } catch (e) {
    console.warn('☁️ [AutoBackup] Failed:', e);
  }
}

async function restoreFullCloudBackupIfFreshInstall() {
  try {
    const user = await Auth.getUserInfo();
    if (!user?.openId) return;
    const isEmpty = await isLocalDataEmpty();
    if (!isEmpty) return;
    const meta = await getCloudBackupMeta(user.openId);
    if (!meta) return;
    const result = await downloadFromCloud(user.openId);
    if (result) {
      await AsyncStorage.setItem('last_backup_date', new Date().toISOString());
      console.log('☁️ [AutoRestore] Full cloud backup restored:', result.restored);
    }
  } catch (e) {
    console.warn('☁️ [AutoRestore] Failed:', e);
  }
}

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);
  const [languageReady, setLanguageReady] = useState(false);
  const splashHidden = useRef(false);

  // Wait for the eagerly-started language + theme cache loads, plus the Hijri
  // offset that older date helpers read synchronously on first paint.
  // These are module-scope or tiny AsyncStorage reads, so the first render has
  // correct language, theme, and moon-sighting adjustment.
  // Safety: 4s timeout prevents permanent hang if AsyncStorage is slow/stuck.
  useEffect(() => {
    let done = false;
    Promise.all([languageInitPromise, themeCachePromise, hydrateHijriOffset()]).then(() => {
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
    'QCF4p293l': require('../assets/fonts/qcf/QCF4_tajweed_293.ttf'),
    'QCF4p293d': require('../assets/fonts/qcf/QCF4_tajweed_293.ttf'),
    'QCF4p440l': require('../assets/fonts/qcf/QCF4_tajweed_440.ttf'),
    'QCF4p440d': require('../assets/fonts/qcf/QCF4_tajweed_440.ttf'),
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
    'WidgetFont': require('../assets/fonts/WidgetFont.ttf'),
    'WidgetFont2': require('../assets/fonts/WidgetFont2.ttf'),
    // NOTE: vector-icon fonts (MaterialCommunityIcons, Ionicons) are NOT
    // preloaded here — `@expo/vector-icons` lazy-loads them when an Icon
    // component mounts. Preloading via useFonts() spread breaks in Expo Go
    // because expo-asset fails to download the bundled TTF reliably.
  });

  useEffect(() => {
    const initAds = async () => {
      try {
        const { TurboModuleRegistry } = require('react-native');
        TurboModuleRegistry.getEnforcing('RNGoogleMobileAdsModule');

        // Note: ATT permission is requested from the onboarding completion screen
        // (app/onboarding/complete.tsx) AFTER showing a Pre-ATT explainer modal.
        // The SDK initializes here without ATT — initial ads will be non-personalized
        // until the user grants permission, then subsequent requests are personalized.

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
        // Don't auto-prompt for notification permission on every launch.
        // First-time grant happens in onboarding (app/onboarding/notifications.tsx).
        // Re-engagement after a denial happens via PermissionBanner.
        // Here we only read the current status to decide whether to schedule.
        const ExpoNotificationsLib = await import('expo-notifications');
        const { status: permStatus } = await ExpoNotificationsLib.getPermissionsAsync();
        const granted = permStatus === 'granted';
        console.log(`[Notifications] Init starting — current permission: ${permStatus}`);

        // Always set up channels regardless of permission — they must exist
        // before any notification can be scheduled (e.g. after user grants
        // permission later via Settings).
        console.log('[Notifications] Setting up channels...');
        await resetChannelsIfOutdated();
        console.log('[Notifications] resetChannelsIfOutdated complete');

        await initializeAllNotificationChannels();
        console.log('[Notifications] initializeAllNotificationChannels complete');

        // Sanity check: warn if any non-silent channel ended up with null sound
        verifyNotificationChannels().catch(() => {});

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
        await registerHijriOverridePushTask();
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
    AsyncStorage.setItem(APP_OPENED_ONCE_KEY, 'true').catch(() => {});

    const initFirebase = async () => {
      if (__DEV__) console.log('🔥 Initializing Firebase services...');

      // Cache check must run first (sequential)
      await initWithTimeout(
        () => checkAndClearCacheOnUpdate().then(() => {}),
        'Cache check',
        3000
      );

      // Kick off Firebase anonymous sign-in early (non-blocking).
      // Provides request.auth.uid for Firestore rules; survives restarts via AsyncStorage.
      ensureFirebaseUser().catch((e) => {
        if (__DEV__) console.warn('⚠️ ensureFirebaseUser failed (non-fatal):', e);
      });

      // Phase 2: ارفع موقع وإعدادات الصلاة لـ Firestore عشان FCM Push fallback
      // (Cloud Function تحسب الصلاة محلياً وترسل push احتياطي لو local scheduling فشل)
      // Fire IMMEDIATELY after auth (with force=true) so the server's
      // "skip active users" check sees this device on its very next cron tick —
      // the previous 8s timer left a window where the user could open + lock the
      // app and still receive a duplicate FCM.
      getUserId().then((uid) => {
        if (!uid) return;
        import('@/lib/fcm-prayer-sync').then(({ syncPrayerDataToFirestore }) => {
          syncPrayerDataToFirestore(uid, /* force */ true).catch(() => {});
        });
      }).catch(() => {});

      // Initialize TrackPlayer in parallel (non-blocking) — runs alongside Firebase inits
      // so its startup cost doesn't gate the splash screen hide.
      const trackPlayerInitPromise = Platform.OS !== 'web' && trackPlayerAvailable
        ? initWithTimeout(
            async () => {
              try {
                const TrackPlayer = require('react-native-track-player').default;
                const {
                  Capability,
                  RepeatMode,
                  IOSCategory,
                  AndroidAudioContentType,
                } = require('react-native-track-player');
                await TrackPlayer.setupPlayer({
                  autoUpdateMetadata: true,
                  // Force the Playback audio category so playback ignores the
                  // iPhone hardware silent switch and stays audible in foreground
                  // and background. We intentionally do NOT set iosCategoryMode
                  // or iosCategoryOptions — the framework defaults work best
                  // for general media playback. SpokenAudio mode + MixWithOthers
                  // option together caused inaudible playback on some devices.
                  iosCategory: IOSCategory?.Playback,
                  androidAudioContentType: AndroidAudioContentType?.Music,
                });
                // Some devices restore volume = 0 on cold start; force max.
                try { await TrackPlayer.setVolume(1.0); } catch {}
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

      // Configure shared iOS AVAudioSession early so any later expo-av calls
      // (sound-manager effects, notification previews, etc.) don't reset the
      // session to SoloAmbient — which would silence TrackPlayer playback
      // (e.g. adhkar listen mode) when the iPhone hardware silent switch is on.
      await initWithTimeout(
        async () => {
          try {
            const { Audio, InterruptionModeIOS, InterruptionModeAndroid } = require('expo-av');
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              // مهم على الـ Simulator: من غير interruptionMode صريح، iOS بيستخدم
              // AVAudioSessionCategoryAmbient أحيانًا ويبقى الصوت متقطّع/مكتوم.
              interruptionModeIOS: InterruptionModeIOS?.DoNotMix ?? 1,
              interruptionModeAndroid: InterruptionModeAndroid?.DuckOthers ?? 2,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            });
          } catch {
            // ignore — expo-av may be unavailable on web
          }
        },
        'Audio session init',
        2000
      );

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
          async () => {
            // Register user, then sync profile from Firestore (detect admin merge/name changes)
            await registerUser();
            const originalId = await getOriginalDeviceUserId();
            await syncUserProfileFromFirestore(originalId);
          },
          'User registration + profile sync',
          10000
        ),
        initWithTimeout(
          async () => {
            // Track app open FIRST (saves score locally), then sync monthly truth to Firestore
            await trackAppOpen();
            const uid = await getUserId();
            if (uid) await syncMonthlyEngagementFromLocalWorship(uid);
          },
          'Track app open + sync scores',
          10000
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

      // Nature background images for "آية اليوم" — throttled internally to once/day.
      // Caches Unsplash photos to persistent storage so they work offline
      // even if the user never opens the daily-ayah screen while online.
      prefetchNatureImages(NATURE_BG_URLS).catch(() => {});
    };

    // Sync widget data immediately before long Firebase/background hydration starts.
    // This prevents newly added widgets from rendering blank/--:-- on first launch.
    initWithTimeout(
      () => syncWidgetDataToNative(),
      'Early widget sync',
      5000
    );

    initFirebase();

    // B3: hydrate adhkar from Firestore admin overrides (background, with cache)
    initWithTimeout(
      () => hydrateAzkarFromFirestore(),
      'Azkar Firestore hydrate',
      6000
    );

    // Hydrate admin-managed custom adhkar categories (background, with cache)
    initWithTimeout(
      () => hydrateCustomCategoriesFromFirestore(),
      'Custom adhkar categories hydrate',
      5000
    );

    // B9: hydrate admin-managed font settings (background, with cache)
    initWithTimeout(
      async () => { await hydrateFontSettings(); },
      'Font settings hydrate',
      5000
    );

    // C1/C2/C3: hydrate dynamic content from Firestore (background, with cache + bundled fallback)
    initWithTimeout(
      () => hydrateDailyDuasFromFirestore(),
      'Daily duas hydrate',
      6000
    );
    initWithTimeout(
      () => hydrateFamousDuasFromFirestore(),
      'Famous duas hydrate',
      6000
    );
    initWithTimeout(
      () => hydrateStoriesFromFirestore(),
      'Stories hydrate',
      6000
    );

    // Sync widget data to native storage on launch
    initWithTimeout(
      () => syncWidgetDataToNative(),
      'Widget sync',
      5000
    );

    // Schedule Eid prayer reminder (8 PM the day before Eid).
    // Safe to call on every launch — duplicates are skipped via AsyncStorage marker.
    initWithTimeout(
      async () => {
        const { scheduleEidNotification } = require('@/lib/eid-notifications');
        await scheduleEidNotification();
      },
      'Eid notification schedule',
      5000,
    );

    // Live-subscribe to admin Hijri overrides for the user's country. When
    // the admin publishes a new moon-sighting decision (e.g. "Egypt's
    // Ramadan starts on May 17"), the widget refreshes within seconds — no
    // need for the user to relaunch the app or wait for cache expiry.
    initWithTimeout(
      async () => {
        const { subscribeToHijriOverridesForUser } = require('@/services/hijriCalendarService');
        const { updateSharedData } = require('@/lib/widget-data');
        await subscribeToHijriOverridesForUser(() => {
          updateSharedData().catch(() => {});
        });
      },
      'Hijri-override Firestore subscription',
      5000,
    );

    // Auto-start/refresh Live Activity for prayer countdown (iOS only)
    initWithTimeout(
      async () => { await refreshLiveActivityIfEnabled(); },
      'Live Activity refresh',
      5000
    );

    // Schedule midnight refresh for daily verse/dhikr widget content
    const cleanupMidnight = scheduleMidnightRefresh();

    // Phase 8: cold-start schedule health check (throttled internally to 6h)
    // يفحص لو الإشعارات اختفت من النظام بعد OEM kill أو system restore
    initWithTimeout(
      async () => { await runScheduleHealthCheck(); },
      'Schedule health check',
      8000,
    );

    // Phase 1.D: Detect device reboot and force-reschedule FullAdhan AlarmManager
    // entries (which DON'T survive reboot, unlike expo-notifications which BootReceiver
    // restores). If the boot flag is set, run forceRescheduleAllFromStorage().
    if (Platform.OS === 'android') {
      initWithTimeout(
        async () => {
          try {
            const { NativeModules } = require('react-native');
            const FullAdhan = (NativeModules as any).FullAdhanModule;
            if (FullAdhan?.consumeBootPendingReschedule) {
              const wasBoot = await FullAdhan.consumeBootPendingReschedule();
              if (wasBoot) {
                console.log('🔄 [Boot] Device rebooted — forcing full reschedule (FullAdhan AlarmManager lost)');
                await forceRescheduleAllFromStorage();
              }
            }
          } catch (e) {
            console.warn('⚠️ [Boot] consumeBootPendingReschedule failed:', e);
          }
        },
        'Boot reschedule check',
        8000
      );
    }

    // Sync app icon to match saved language/season on launch.
    // SeasonalProvider refreshes this later with authoritative Hijri data.
    initWithTimeout(
      () => syncAppIconOnStartup(getLanguage() as any, getLocalCurrentSeason()?.type ?? null),
      'App icon sync',
      5000
    );

    // Check for admin-pushed icon updates and show alert if new version
    initWithTimeout(
      () => checkForIconUpdate(),
      'App icon update check',
      5000
    );

    // Register the periodic icon-refresh task so seasonal icons still swap
    // even when the user doesn't open the app during a short window (Eid,
    // Mawlid). On Android the task kills the process after toggling so OEM
    // launchers (MIUI, EMUI, One UI) re-query the icon on next launch.
    initWithTimeout(
      () => registerAppIconBackgroundTask(),
      'App icon background task registration',
      5000
    );
    
    // Rating: record session start + periodic check
    recordSessionStart();
    const ratingCheckInterval = setInterval(async () => {
      const should = await shouldShowRating();
      if (should) {
        clearInterval(ratingCheckInterval);
        showRatingPrompt();
      }
    }, 30_000);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updateLastActive().catch((e) => console.warn('⚠️ [AppResume] updateLastActive:', e?.message));
        getUserId()
          .then(uid => (uid ? syncMonthlyEngagementFromLocalWorship(uid) : null))
          .catch((e) => console.warn('⚠️ [AppResume] syncMonthlyEngagement:', e?.message));
        syncWidgetDataToNative().catch((e) => console.warn('⚠️ [AppResume] syncWidgetDataToNative:', e?.message));
        // Refresh the "active user" marker on every foreground so the FCM
        // fallback server keeps skipping duplicate notifications. The sync
        // helper has its own 1-hour throttle so this is cheap on quick
        // app-switches.
        getUserId()
          .then((uid) => {
            if (!uid) return;
            return import('@/lib/fcm-prayer-sync').then(({ syncPrayerDataToFirestore }) =>
              syncPrayerDataToFirestore(uid),
            );
          })
          .catch((e) => console.warn('⚠️ [AppResume] syncPrayerDataToFirestore:', e?.message));
        refreshLiveActivityIfEnabled().catch((e) => console.warn('⚠️ [AppResume] refreshLiveActivity:', e?.message));
        // Force-refresh sound settings from Firestore so admin sound assignment
        // changes propagate immediately when user returns to the app (instead
        // of waiting up to 24h for the local cache to expire).
        refreshSoundSettings().catch((e) => console.warn('⚠️ [AppResume] refreshSoundSettings:', e?.message));
        // Force-refresh azkar overrides (admin edits to text/audio/benefit)
        // so changes show without needing to reinstall or wait for cache TTL.
        refreshAzkarFromFirestore().catch((e) => console.warn('⚠️ [AppResume] refreshAzkar:', e?.message));
        // Check for a pending deep link from Control Center / Spotlight shortcut
        consumePendingDeepLink(router);
        // Verify prayer notifications exist; if none, force reschedule.
        // This catches the case where all DATE triggers have fired and nothing is left.
        ensurePrayerNotificationsExist().catch((e) => console.warn('⚠️ [AppResume] ensurePrayerNotificationsExist:', e?.message));
        // Detect timezone/DST changes and force-reschedule if changed.
        // This catches travel, manual timezone change, and DST transitions.
        checkTimezoneChange().catch((e) => console.warn('⚠️ [AppResume] checkTimezoneChange:', e?.message));
        // Refresh the 7-day DATE trigger window for all notification categories.
        // rescheduleAllFromStorage is internally throttled (60s) to avoid excessive work.
        rescheduleAllFromStorage().catch((e) => console.warn('⚠️ [AppResume] rescheduleAllFromStorage:', e?.message));
        // Phase 8: فحص دوري (كل 6س) لصحة الإشعارات + auto-heal
        runScheduleHealthCheck().catch((e) => console.warn('⚠️ [AppResume] scheduleHealthCheck:', e?.message));
        // Phase 9: رفع تقرير telemetry لـ Firestore (throttled 24س داخلياً)
        maybeUploadTelemetry().catch((e) => console.warn('⚠️ [AppResume] uploadTelemetry:', e?.message));
        recordSessionStart();
      } else if (nextAppState === 'background') {
        syncLocalStats().catch((e) => console.warn('⚠️ [AppBackground] syncLocalStats:', e?.message));
        // Sync widget data before app goes to background so widgets show fresh content
        syncWidgetDataToNative().catch((e) => console.warn('⚠️ [AppBackground] syncWidgetDataToNative:', e?.message));
        // Auto-backup: silently upload to cloud if premium, logged in, and >7 days since last backup
        autoBackupIfNeeded().catch((e) => console.warn('⚠️ [AppBackground] autoBackupIfNeeded:', e?.message));
        saveSessionTime().catch((e) => console.warn('⚠️ [AppBackground] saveSessionTime:', e?.message));
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Subscribe to admin sound settings changes from Firestore so notifications,
    // adhan, and effect sounds always reflect the latest admin assignments
    // without waiting for the 24h cache TTL.
    const unsubscribeSoundSettings = subscribeToSoundSettings();

    // Subscribe to live admin edits of the azkar collection (text, audio,
    // benefit, translations). Updates the in-memory override and notifies
    // any listening screens to re-render.
    const unsubscribeAzkar = subscribeToAzkarFromFirestore();

    // Subscribe to live admin edits of custom adhkar categories.
    const unsubscribeCustomCategories = subscribeToCustomCategoriesFromFirestore();

    // Subscribe to live admin edits of Quran themes so the reader sees color
    // changes without waiting for cache expiry or app reinstall.
    const unsubscribeQuranThemes = subscribeToQuranThemes((themes) => {
      setQuranThemes(themes);
    });

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
      clearInterval(ratingCheckInterval);
      cleanupMidnight();
      unsubscribeSoundSettings();
      unsubscribeAzkar();
      unsubscribeCustomCategories();
      unsubscribeQuranThemes();
      saveSessionTime().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const cleanupAds = initializeAppOpenAds();
    return () => {
      cleanupAds();
    };
  }, []);

  // iOS foreground full-adhan player:
  // When a full_adhan notification arrives while the app is in the foreground,
  // iOS would cut the notification sound at ~2-3 s (system limitation).
  // We suppress the notification sound for full_adhan on iOS (see setNotificationHandler
  // above) and instead auto-navigate to /full-adhan which plays the audio via
  // expo-av without any OS time cap.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = ExpoNotifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type !== 'full_adhan') return;
      const prayer = typeof data.prayer === 'string' ? data.prayer : 'dhuhr';
      const voice = typeof data.voice === 'string' ? data.voice : 'makkah';
      const test = data.test === '1' ? '1' : '0';
      try {
        router.push({ pathname: '/full-adhan', params: { prayer, voice, test } } as any);
      } catch {}
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    const receivedSub = ExpoNotifications.addNotificationReceivedListener((notification) => {
      applyHijriOverridePushPayload(notification.request.content.data).catch(() => {});
    });
    const responseSub = ExpoNotifications.addNotificationResponseReceivedListener((response) => {
      applyHijriOverridePushPayload(response.notification.request.content.data).catch(() => {});
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
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
      // QCF page fonts are loaded on demand by Quran screens/components.
      // Loading all 604 pages in both light and dark variants during startup
      // creates avoidable memory pressure on low-end Android devices.
      // Scan the on-disk Tajweed color font cache so hasColorFontForPage() / getColorFontSource()
      // return correct results without an extra round-trip when the user enters a Mushaf page.
      try {
        const { loadCachedColorFontIndex } = require('@/lib/qcf-color-font-cache');
        loadCachedColorFontIndex().catch((e: any) =>
          console.warn('⚠️ Tajweed cache index scan failed:', e?.message ?? e)
        );
      } catch (err) {
        console.warn('⚠️ Tajweed cache index module failed to load:', err);
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

        if (__DEV__) console.log('🔔 Cold-start notification tap:', notifId, JSON.stringify(data));
        await applyHijriOverridePushPayload(data).catch(() => false);

        // Handle "هل صليت؟" action buttons (prayed / will_pray) on cold start.
        // If consumed, skip navigation — the user tapped an action, not the notification body.
        const consumedByDidYouPray = await handleDidYouPrayResponse(response).catch(() => false);
        if (consumedByDidYouPray) return;

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

  // ── Cold-start deep link handler (AppIntent / Control Center / Spotlight) ──
  // When the user taps a shortcut while the app is killed, the AppIntent writes
  // a pending deep link to App Group UserDefaults. We consume it here once the
  // navigation tree is ready.  If that yields nothing, fall back to
  // Linking.getInitialURL() so the standard iOS URL delivery still works.
  const coldStartDeepLinkHandled = useRef(false);
  useEffect(() => {
    if (!appReady || !languageReady || coldStartDeepLinkHandled.current) return;
    coldStartDeepLinkHandled.current = true;

    (async () => {
      const consumed = await consumePendingDeepLink(router);
      if (!consumed) {
        await consumeInitialURL(router);
      }
    })();
  }, [appReady, languageReady]);

  // ── Warm/foreground URL listener ──
  // Required for the case where the app is already open (AppState === 'active')
  // and the user taps a Spotlight/Control Center shortcut. AppState does not
  // fire in that case, so the AppState→'active' path never reaches
  // consumePendingDeepLink. Subscribe independently of appReady so URLs fired
  // early in the lifecycle are still caught; navigation on `router` is safe
  // because the Stack is mounted synchronously with this effect.
  useEffect(() => {
    const unsubscribe = subscribeToDeepLinks(router);
    return unsubscribe;
  }, [router]);

  // ── Background pre-download of azkar audio ──
  // Caches all azkar mp3/m4a files to documentDirectory after first launch.
  // Skipped if already complete. Failures are non-fatal — playback falls back
  // to streaming via getAzkarAudioUri's race-with-timeout strategy.
  useEffect(() => {
    if (!appReady || !languageReady) return;
    // Defer 3s after ready so we don't compete with critical startup network calls
    const t = setTimeout(() => {
      import('@/lib/azkar-audio-cache')
        .then(({ preDownloadAll }) => preDownloadAll())
        .catch((e) => {
          if (__DEV__) console.warn('[azkar-cache] background pre-download failed:', e);
        });
    }, 3000);
    return () => clearTimeout(t);
  }, [appReady, languageReady]);

  // Don't render tree until language is loaded from storage.
  // This prevents t() calls from returning Arabic on first render
  // when the user's language is different.
  if (!languageReady || (!appReady && !fontsLoaded)) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  // RTL is handled manually via useIsRTL() hook throughout the app (200+ components).
  // I18nManager.forceRTL() is NOT called — it causes double-reversal on Android
  // production builds where the native bridge applies RTL, conflicting with the
  // manual flexDirection: 'row-reverse' patterns used throughout the codebase.

  return (
    <ErrorBoundary>
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
                      <MemorizationProvider>
                      <WorshipProvider>
                        <SeasonalProvider>
                          <OnboardingProvider>
                          <CelebrationProvider>
                        <OnboardingGate />
                        <PremiumWorshipCloudSyncGate />
                        <PaywallAutoTrigger />
                        <HonorBoardNameReminderGate />
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
                          <Stack.Screen name="widget" />
                          <Stack.Screen name="browse-tafsir" />
                          <Stack.Screen name="all-favorites" />
                          <Stack.Screen name="quran-reminder" />
                          <Stack.Screen name="daily-dua" />
                          <Stack.Screen name="daily-ayah" />
                          <Stack.Screen name="companions" />
                          <Stack.Screen name="religious-stories" />
                          <Stack.Screen name="question-answer" />
                          <Stack.Screen name="qa-thread/[id]" />
                          <Stack.Screen name="memorization" />
                          <Stack.Screen name="temp-page/[id]" />
                          <Stack.Screen name="sdui/[screenId]" />
                          <Stack.Screen
                            name="full-adhan"
                            options={{
                              headerShown: false,
                              presentation: 'fullScreenModal',
                              animation: 'slide_from_bottom',
                            }}
                          />
                        </Stack>
                        {!(pathname && pathname.startsWith('/qibla')) && <GlobalAudioBar />}
                        <DynamicSplashOverlay />
                        <SnapshotHost />
                        <SnapshotPumpController />
                          </CelebrationProvider>
                          </OnboardingProvider>
                        </SeasonalProvider>
                      </WorshipProvider>
                      </MemorizationProvider>
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
    </ErrorBoundary>
  );
}
