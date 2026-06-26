// contexts/SubscriptionContext.tsx
// سياق الاشتراكات - روح المسلم

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert, AppState } from 'react-native';
import Constants from 'expo-constants';

import {
  SubscriptionState,
  SubscriptionConfig,
  SubscriptionPlan,
  SubscriptionProduct,
  fetchSubscriptionConfig,
  subscribeToSubscriptionConfig,
  getSubscriptionState,
  setSubscriptionState,
  setInMemoryPremium,
  getPlanFromProductId,
  DEFAULT_SUBSCRIPTION_CONFIG,
} from '@/lib/subscription-manager';

import { fetchFeatureGatingConfig, subscribeToFeatureGating, isFeaturePremium, DEFAULT_FEATURE_GATING } from '@/lib/feature-gating';
import type { PremiumFeatureKey, PremiumSource, FeatureGatingConfig, AdminGrantedPremium } from '@/types/premium';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { t } from '@/lib/i18n';
import * as Notifications from 'expo-notifications';
import { getUserId } from '@/lib/firebase-user';
import {
  incrementPaywallOpenCount,
  shouldShowPaywall,
  markPaywallShown,
  resetPaywallCounter,
} from '@/lib/paywall-trigger';

// ==================== Safe IAP import ====================
// react-native-iap v14 depends on react-native-nitro-modules, which throws
// "NitroModules are not supported in Expo Go!" the moment any of its native
// methods are touched. The plain `require()` succeeds in Expo Go, but later
// calls (e.g. initConnection, listeners) crash the app. So we additionally
// detect Expo Go and force-disable IAP entirely there.

const IS_EXPO_GO =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient';

let IAP: {
  initConnection: () => Promise<any>;
  endConnection: () => Promise<any>;
  fetchProducts: (opts: { skus: string[]; type?: string }) => Promise<any[]>;
  requestPurchase: (opts: any) => Promise<any>;
  getAvailablePurchases: () => Promise<any[]>;
  purchaseUpdatedListener: (cb: (purchase: any) => void) => any;
  purchaseErrorListener: (cb: (error: any) => void) => any;
  finishTransaction: (opts: any) => Promise<any>;
  flushFailedPurchasesCachedAsPendingAndroid?: () => Promise<any>;
} | null = null;

if (!IS_EXPO_GO) {
  try {
    IAP = require('react-native-iap');
  } catch {
    console.log('⚠️ react-native-iap not available. Subscriptions disabled.');
  }
} else {
  console.log('⚠️ Running in Expo Go — react-native-iap disabled (no Nitro support).');
}

// ==================== Context Type ====================

interface SubscriptionContextType {
  isPremium: boolean;
  premiumSource: PremiumSource;
  /** adminPremium.grantedBy when premiumSource is 'admin' — 'auto_reward_system' / 'reward_system' for honor-board winners, 'admin' for manual gifts */
  premiumGrantedBy: string | null;
  currentPlan: SubscriptionPlan | null;
  /** ISO expiry of the active premium (null for lifetime / unknown) */
  expiresAt: string | null;
  products: SubscriptionProduct[];
  config: SubscriptionConfig;
  isLoading: boolean;
  /** Master kill-switch from admin panel (config.enabled) */
  isSubscriptionEnabled: boolean;
  purchase: (plan: SubscriptionPlan) => Promise<boolean>;
  restore: () => Promise<boolean>;
  features: string[];
  isFeatureLocked: (key: PremiumFeatureKey) => boolean;
  // Admin-panel-controlled plan visibility (SSOT from Firestore config)
  showLifetime: boolean;
  showYearly: boolean;
  showMonthly: boolean;
  badgeText: string;
  lifetimePriceOverride: string;
  showUpgradeBanner: boolean;
  /** True if the paywall should auto-present on this app open */
  shouldAutoShowPaywall: boolean;
  /** Call after auto-showing paywall to record timestamp */
  markPaywallAutoShown: () => void;
  /** Re-fetch IAP products (for retry after failure) */
  refetchProducts: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  premiumSource: null,
  premiumGrantedBy: null,
  currentPlan: null,
  expiresAt: null,
  products: [],
  config: DEFAULT_SUBSCRIPTION_CONFIG,
  isLoading: true,
  isSubscriptionEnabled: false,
  purchase: async () => false,
  restore: async () => false,
  features: DEFAULT_SUBSCRIPTION_CONFIG.features,
  isFeatureLocked: () => true,
  showLifetime: false,
  showYearly: true,
  showMonthly: true,
  badgeText: '',
  lifetimePriceOverride: '',
  showUpgradeBanner: false,
  shouldAutoShowPaywall: false,
  markPaywallAutoShown: () => {},
  refetchProducts: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

const parseDateLike = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object') {
    const maybeTimestamp = value as { seconds?: number; nanoseconds?: number; toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === 'function') {
      const date = maybeTimestamp.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof maybeTimestamp.seconds === 'number') {
      const millis = maybeTimestamp.seconds * 1000 + Math.floor((maybeTimestamp.nanoseconds || 0) / 1_000_000);
      const date = new Date(millis);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
};

const dateLikeToStorageString = (value: unknown): string | null => {
  if (!value) return null;
  const date = parseDateLike(value);
  return date ? date.toISOString() : null;
};

const dateLikeKey = (value: unknown): string => {
  if (!value) return 'unknown';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  const date = parseDateLike(value);
  return date ? date.toISOString() : 'unknown';
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfLocalDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const formatExpiryTiming = (expiresAt: Date, now = new Date()): string => {
  const dayDiff = Math.max(
    0,
    Math.round((startOfLocalDay(expiresAt) - startOfLocalDay(now)) / DAY_MS)
  );

  if (dayDiff === 0) return 'اليوم';
  if (dayDiff === 1) return 'غدًا';
  if (dayDiff === 2) return 'خلال يومين';
  return `خلال ${dayDiff} أيام`;
};

const buildExpiryNotificationBody = (
  expiresAt: Date,
  isAdminGrant: boolean,
  now = new Date()
): string => {
  const timing = formatExpiryTiming(expiresAt, now);
  return isAdminGrant
    ? `تنتهي منحة البريميم ${timing}. سيعود التطبيق للوضع المجاني بعدها.`
    : `ينتهي اشتراكك ${timing}. جدد اشتراكك للاستمرار بدون إعلانات.`;
};

const sanitizeFirestoreId = (value: unknown): string => {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : `purchase_${Date.now()}`;
  return raw.replace(/[/.#[\]]/g, '_').slice(0, 180);
};

const getPurchaseField = (purchase: any, key: string): string | null => {
  const value = purchase?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const purchaseMillisToIso = (value: unknown): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// ==================== Provider ====================

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SubscriptionState>({
    isPremium: false,
    plan: null,
    expiresAt: null,
    purchaseToken: null,
  });
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const rawProductsRef = useRef<any[]>([]);
  const [config, setConfig] = useState<SubscriptionConfig>(DEFAULT_SUBSCRIPTION_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [premiumSource, setPremiumSource] = useState<PremiumSource>(null);
  const [premiumGrantedBy, setPremiumGrantedBy] = useState<string | null>(null);
  const stateRef = useRef<SubscriptionState>(state);
  const premiumSourceRef = useRef<PremiumSource>(null);
  const [featureGating, setFeatureGating] = useState<FeatureGatingConfig>(DEFAULT_FEATURE_GATING);
  const purchaseUpdateSubscription = useRef<any>(null);
  const purchaseErrorSubscription = useRef<any>(null);
  const adminPremiumUnsub = useRef<(() => void) | null>(null);
  const [autoShowPaywall, setAutoShowPaywall] = useState(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    premiumSourceRef.current = premiumSource;
  }, [premiumSource]);

  // Mirror the authoritative premium flag into a synchronous module-level
  // cache so imperative ad gates (app-open ad, standalone interstitial) honor
  // admin/winner grants the moment they are detected — not only after the
  // grant is persisted to AsyncStorage on a later launch.
  useEffect(() => {
    setInMemoryPremium(state.isPremium);
  }, [state.isPremium]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Load saved state and config
        const [savedState, fetchedConfig] = await Promise.all([
          getSubscriptionState(),
          fetchSubscriptionConfig(),
        ]);

        // Also load feature gating config
        const gatingConfig = await fetchFeatureGatingConfig();
        if (mounted) setFeatureGating(gatingConfig);

        if (!mounted) return;

        const savedSource: PremiumSource = savedState.isPremium
          ? (savedState.purchaseToken === 'admin_grant' ? 'admin' : 'iap')
          : null;
        setState(savedState);
        stateRef.current = savedState;
        setConfig(fetchedConfig);
        setPremiumSource(savedSource);
        premiumSourceRef.current = savedSource;

        // Check admin-granted premium.
        // Poll on app open + foreground resume instead of a persistent
        // onSnapshot listener. The user doc is written to frequently
        // (engagement sync, prayer sync, lastActive) and a live listener
        // would bill an extra read on every one of those writes. Admin
        // premium grants are rare and monthly, so refreshing on each
        // foreground is more than responsive enough.
        try {
          const userId = await getUserId();
          if (userId) {
            const userRef = doc(db, 'users', userId);
            const applyAdminPremium = async (data: any) => {
              if (!mounted) return;
              const adminPremium = data?.adminPremium as AdminGrantedPremium | undefined;
              const currentState = stateRef.current;
              const currentSource = premiumSourceRef.current;

              if (adminPremium?.granted) {
                const expiresAtValue = (adminPremium as any).expiresAt;
                const expiresAtDate = parseDateLike(expiresAtValue);
                const expiresAtStorage = dateLikeToStorageString(expiresAtValue);
                const notExpired = !expiresAtValue || (expiresAtDate ? expiresAtDate > new Date() : false);
                if (notExpired) {
                  const adminState: SubscriptionState = {
                    isPremium: true,
                    plan: adminPremium.plan || currentState.plan || 'yearly',
                    expiresAt: expiresAtStorage,
                    purchaseToken: 'admin_grant',
                  };
                  const wasAdminPremium =
                    currentSource === 'admin' &&
                    currentState.isPremium &&
                    currentState.purchaseToken === 'admin_grant';
                  const shouldApplyAdminState =
                    currentSource !== 'iap' ||
                    !currentState.isPremium ||
                    currentState.purchaseToken === 'admin_grant';

                  if (shouldApplyAdminState) {
                    stateRef.current = adminState;
                    premiumSourceRef.current = 'admin';
                    setState(adminState);
                    setPremiumSource('admin');
                    setPremiumGrantedBy(adminPremium.grantedBy || null);
                    setSubscriptionState(adminState).catch(() => {});
                  }

                  // Send local notification on new premium grant (once per grantedAt)
                  if (!wasAdminPremium) {
                    const grantTs = dateLikeKey((adminPremium as any).grantedAt);
                    const grantKey = `@admin_premium_notified_${grantTs}`;
                    const alreadyNotified = await AsyncStorage.getItem(grantKey).catch(() => null);
                    if (!alreadyNotified) {
                      await AsyncStorage.setItem(grantKey, 'true').catch(() => {});
                      const isWinner =
                        adminPremium.grantedBy === 'auto_reward_system' ||
                        adminPremium.grantedBy === 'reward_system';
                      Notifications.scheduleNotificationAsync({
                        content: {
                          title: '🎉 تهانينا!',
                          body: isWinner
                            ? 'أنت بطل الشهر! تم منحك نسخة مميزة مجاناً 🏆'
                            : 'تم منحك نسخة مميزة من الإدارة 🌟',
                          sound: 'default',
                          data: {
                            type: 'premium_granted',
                            actionType: 'screen',
                            actionUrl: isWinner ? '/honor-board' : '/subscription',
                          },
                          ...(Platform.OS === 'android' && { channelId: 'general' }),
                        },
                        trigger: null,
                      }).catch(() => {});
                    }
                  }
                } else {
                  const shouldClearAdmin =
                    currentSource === 'admin' ||
                    currentState.purchaseToken === 'admin_grant';
                  if (shouldClearAdmin) {
                    const clearedState: SubscriptionState = {
                      isPremium: false,
                      plan: null,
                      expiresAt: null,
                      purchaseToken: null,
                    };
                    stateRef.current = clearedState;
                    premiumSourceRef.current = null;
                    setState(clearedState);
                    setPremiumSource(null);
                    setPremiumGrantedBy(null);
                    setSubscriptionState(clearedState).catch(() => {});
                  }
                  try {
                    await updateDoc(userRef, {
                      'adminPremium.granted': false,
                      'adminPremium.expiredAt': serverTimestamp(),
                    });
                  } catch (cleanupErr) {
                    console.log('⚠️ Failed to clean stale admin premium:', cleanupErr);
                  }
                }
              } else {
                const shouldClearAdmin =
                  currentSource === 'admin' ||
                  currentState.purchaseToken === 'admin_grant';
                if (shouldClearAdmin) {
                  const clearedState: SubscriptionState = {
                    isPremium: false,
                    plan: null,
                    expiresAt: null,
                    purchaseToken: null,
                  };
                  stateRef.current = clearedState;
                  premiumSourceRef.current = null;
                  setState(clearedState);
                  setPremiumSource(null);
                  setPremiumGrantedBy(null);
                  setSubscriptionState(clearedState).catch(() => {});
                }
              }
            };

            const refreshAdminPremium = async () => {
              try {
                const snap = await getDoc(userRef);
                await applyAdminPremium(snap.data());
              } catch (err) {
                console.log('⚠️ Admin premium refresh failed:', err);
              }
            };

            await refreshAdminPremium();

            const appStateSub = AppState.addEventListener('change', (next) => {
              if (next === 'active') refreshAdminPremium();
            });
            adminPremiumUnsub.current = () => appStateSub.remove();
          }
        } catch (e) {
          console.log('⚠️ Admin premium check failed:', e);
        }

        if (!fetchedConfig.enabled || !IAP) {
          // Paywall auto-display check (even if IAP unavailable, count opens)
          await incrementPaywallOpenCount();
          const currentIsPremium = stateRef.current.isPremium || premiumSourceRef.current === 'admin';
          const show = await shouldShowPaywall(fetchedConfig, currentIsPremium);
          if (show && mounted) setAutoShowPaywall(true);
          setIsLoading(false);
          return;
        }

        // Initialize IAP connection
        try {
          await IAP.initConnection();
          if (__DEV__) console.log('✅ IAP connection initialized');
        } catch (initError) {
          console.log('⚠️ IAP initConnection failed:', initError);
          // Continue — some features may still work
        }

        // Flush stale pending purchases on Android (prevents "item already owned" errors)
        if (Platform.OS === 'android') {
          try {
            await IAP.flushFailedPurchasesCachedAsPendingAndroid?.();
            if (__DEV__) console.log('✅ Flushed stale Android pending purchases');
          } catch (flushError) {
            console.log('⚠️ Android flush pending purchases failed:', flushError);
          }
        }

        // Load available products (split by type: in-app vs subscriptions)
        // Filter out empty product IDs (e.g. iOS IDs not yet configured)
        const platformKey = Platform.OS === 'ios' ? 'ios' : 'android';
        const lifetimeId = fetchedConfig.products.lifetime[platformKey];
        const subIds = [
          fetchedConfig.products.monthly[platformKey],
          fetchedConfig.products.yearly[platformKey],
        ].filter(Boolean);
        try {
          const fetchPromises: Promise<any[]>[] = [];
          if (lifetimeId) {
            fetchPromises.push(IAP.fetchProducts({ skus: [lifetimeId], type: 'in-app' }));
          }
          if (subIds.length > 0) {
            fetchPromises.push(IAP.fetchProducts({ skus: subIds, type: 'subs' }));
          }
          const results = await Promise.all(fetchPromises);
          const items = results.flat().filter(Boolean);
          if (__DEV__) {
            const requested = [lifetimeId, ...subIds].filter(Boolean);
            const received = items.map((i: any) => i.id || i.productId);
            console.log('🛒 IAP products requested:', requested);
            console.log('🛒 IAP products received:', received);
            const missing = requested.filter(id => !received.includes(id));
            if (missing.length > 0) {
              console.log('⚠️ IAP products missing from store:', missing, '— check App Store Connect / Play Console (metadata, pricing, approval status).');
            }
          }
          if (mounted && items) {
            rawProductsRef.current = items;
            const mapped = items
              .map((item: any) => {
                const id = item.id || item.productId;
                const plan = getPlanFromProductId(id, fetchedConfig);
                if (!plan) {
                  if (__DEV__) console.log('⚠️ Unrecognized product id from store (no plan match):', id);
                  return null;
                }
                return {
                  id,
                  plan,
                  title: item.title || '',
                  price: item.displayPrice || '',
                  priceAmount: item.price ?? 0,
                  currency: item.currency || '',
                  description: item.description || '',
                };
              })
              .filter(Boolean) as SubscriptionProduct[];
            setProducts(mapped);
            try {
              await AsyncStorage.setItem('@subscription_products_cache', JSON.stringify(mapped));
            } catch {}
          }
        } catch (e) {
          console.log('⚠️ Could not load IAP products:', e);
          // Fallback: load cached prices if available
          if (mounted) {
            try {
              const cached = await AsyncStorage.getItem('@subscription_products_cache');
              if (cached) setProducts(JSON.parse(cached));
            } catch {}
          }
        }

        // Listen for purchase updates
        purchaseUpdateSubscription.current = IAP.purchaseUpdatedListener(
          async (purchase: any) => {
            const plan = getPlanFromProductId(purchase.productId, fetchedConfig);
            if (plan) {
              const newState: SubscriptionState = {
                isPremium: true,
                plan,
                expiresAt: plan === 'lifetime'
                  ? null
                  : new Date(Date.now() + (plan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
                purchaseToken: purchase.transactionId || null,
              };
              await setSubscriptionState(newState);
              if (mounted) {
                setState(newState);
                setPremiumSource('iap');
                setPremiumGrantedBy(null);
              }
              // Finish the transaction — critical for both Sandbox (TestFlight) and Production
              try {
                await IAP!.finishTransaction({ purchase, isConsumable: false });
                if (__DEV__) console.log('✅ Transaction finished:', purchase.transactionId);
              } catch (finishError) {
                console.log('⚠️ finishTransaction failed (will retry on next launch):', finishError);
              }

              // Record purchase in Firestore for admin visibility
              try {
                const userId = await getUserId();
                if (userId) {
                  const userRef = doc(db, 'users', userId);
                  const userSnap = await getDoc(userRef).catch(() => null);
                  const userData = userSnap?.exists?.() ? userSnap.data() : {};
                  const transactionId = getPurchaseField(purchase, 'transactionId');
                  const orderId = transactionId || getPurchaseField(purchase, 'id');
                  const purchaseToken =
                    getPurchaseField(purchase, 'purchaseToken') ||
                    getPurchaseField(purchase, 'purchaseTokenAndroid');
                  const purchaseDocId = sanitizeFirestoreId(orderId || purchaseToken);
                  const purchasedAtIso = purchaseMillisToIso(purchase.transactionDate);

                  await setDoc(doc(db, 'users', userId, 'purchases', purchaseDocId), {
                    userId,
                    userDisplayName: userData?.displayName || userData?.name || null,
                    userPlatform: userData?.platform || Platform.OS,
                    userInstallSource: userData?.installSource || null,
                    userCountry: userData?.country || null,
                    userLanguage: userData?.language || null,
                    userAppVersion: userData?.appVersion || Constants.expoConfig?.version || null,
                    productId: purchase.productId,
                    plan,
                    orderId,
                    transactionId,
                    purchaseId: getPurchaseField(purchase, 'id'),
                    purchaseToken,
                    platform: Platform.OS,
                    store: purchase.store || (Platform.OS === 'ios' ? 'app_store' : 'play_store'),
                    currentPlanId: purchase.currentPlanId || null,
                    purchaseState: purchase.purchaseState || null,
                    quantity: typeof purchase.quantity === 'number' ? purchase.quantity : null,
                    isAutoRenewing: typeof purchase.isAutoRenewing === 'boolean' ? purchase.isAutoRenewing : null,
                    isAcknowledgedAndroid: purchase.isAcknowledgedAndroid ?? null,
                    packageNameAndroid: purchase.packageNameAndroid || null,
                    obfuscatedAccountIdAndroid: purchase.obfuscatedAccountIdAndroid || null,
                    obfuscatedProfileIdAndroid: purchase.obfuscatedProfileIdAndroid || null,
                    environmentIOS: purchase.environmentIOS || null,
                    storefrontCountryCodeIOS: purchase.storefrontCountryCodeIOS || null,
                    originalTransactionIdentifierIOS: purchase.originalTransactionIdentifierIOS || null,
                    webOrderLineItemIdIOS: purchase.webOrderLineItemIdIOS || null,
                    transactionDate: purchasedAtIso,
                    purchasedAt: serverTimestamp(),
                    expiresAt: newState.expiresAt || null,
                    recordedAt: serverTimestamp(),
                    source: 'iap_listener',
                  }, { merge: true });

                  await setDoc(userRef, {
                    iapPremium: {
                      active: true,
                      plan,
                      productId: purchase.productId,
                      orderId,
                      transactionId,
                      purchaseDocId,
                      platform: Platform.OS,
                      store: purchase.store || (Platform.OS === 'ios' ? 'app_store' : 'play_store'),
                      expiresAt: newState.expiresAt || null,
                      updatedAt: serverTimestamp(),
                    },
                  }, { merge: true });
                }
              } catch (firestoreError) {
                console.log('⚠️ Purchase Firestore record failed (non-blocking):', firestoreError);
              }
            }
          }
        );

        purchaseErrorSubscription.current = IAP.purchaseErrorListener(
          (error: any) => {
            console.log('❌ Purchase error:', error);
            if (error.code !== 'user-cancelled') {
              Alert.alert(t('subscription.purchaseError'), t('subscription.purchaseErrorMessage'));
            }
          }
        );

        // Paywall auto-display check (full IAP path)
        await incrementPaywallOpenCount();
        const currentIsPremium = stateRef.current.isPremium || premiumSourceRef.current === 'admin';
        const showPw = await shouldShowPaywall(fetchedConfig, currentIsPremium);
        if (showPw && mounted) setAutoShowPaywall(true);

        // Revalidate subscription status against the store on launch
        // This handles auto-renewed subscriptions whose local expiry has passed
        if (savedState.isPremium && savedState.plan !== 'lifetime' && savedState.expiresAt) {
          const localExpiry = new Date(savedState.expiresAt);
          const now = new Date();
          const daysUntilExpiry = (localExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

          // Notify user if subscription expires within 3 days (once per expiry period)
          if (daysUntilExpiry > 0 && daysUntilExpiry <= 3) {
            const expiryNotifKey = `@sub_expiry_notified_${savedState.expiresAt}`;
            const alreadyNotified = await AsyncStorage.getItem(expiryNotifKey).catch(() => null);
            if (!alreadyNotified) {
              await AsyncStorage.setItem(expiryNotifKey, 'true').catch(() => {});
              Notifications.scheduleNotificationAsync({
                content: {
                  title: 'تنبيه الاشتراك',
                  body: buildExpiryNotificationBody(
                    localExpiry,
                    savedState.purchaseToken === 'admin_grant',
                    now
                  ),
                  sound: 'default',
                  data: { type: 'subscription_expiry' },
                  ...(Platform.OS === 'android' && { channelId: 'general' }),
                },
                trigger: null,
              }).catch(() => {});
            }
          }

          if (localExpiry < now) {
            try {
              const activePurchases = await IAP.getAvailablePurchases();
              const stillActive = activePurchases.some((p: any) =>
                getPlanFromProductId(p.productId, fetchedConfig) != null
              );
              if (stillActive && mounted) {
                // Calculate new expiry based on the most recent transaction date,
                // NOT from Date.now(). This prevents infinite premium on every app open.
                const sorted = [...activePurchases]
                  .filter((p: any) => getPlanFromProductId(p.productId, fetchedConfig) != null)
                  .sort((a: any, b: any) => (b.transactionDate || 0) - (a.transactionDate || 0));
                const latestTx = sorted[0];
                const txDate = latestTx?.transactionDate ? new Date(latestTx.transactionDate) : now;
                const renewalDays = savedState.plan === 'yearly' ? 370 : 35;
                const storeExpiry = new Date(txDate.getTime() + renewalDays * 24 * 60 * 60 * 1000);

                // Only update if the store-derived expiry is actually later than what we have
                const currentExpiry = savedState.expiresAt ? new Date(savedState.expiresAt) : new Date(0);
                const newExpiresAt = storeExpiry > currentExpiry ? storeExpiry.toISOString() : savedState.expiresAt;

                const renewedState: SubscriptionState = {
                  ...savedState,
                  expiresAt: newExpiresAt,
                };
                await setSubscriptionState(renewedState);
                setState(renewedState);
              } else if (!stillActive && mounted) {
                const expiredState: SubscriptionState = { isPremium: false, plan: null, expiresAt: null, purchaseToken: null };
                await setSubscriptionState(expiredState);
                setState(expiredState);
                setPremiumSource(null);
              }
            } catch (e) {
              console.log('⚠️ Subscription revalidation failed:', e);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ IAP init error:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    // Subscribe to real-time subscription config updates from admin panel
    const unsubConfigListener = subscribeToSubscriptionConfig((updatedConfig) => {
      if (mounted) setConfig(updatedConfig);
    });

    // Subscribe to real-time feature gating config updates
    const unsubFeatureGating = subscribeToFeatureGating((updatedGating) => {
      if (mounted) setFeatureGating(updatedGating);
    });

    return () => {
      mounted = false;
      purchaseUpdateSubscription.current?.remove?.();
      purchaseErrorSubscription.current?.remove?.();
      adminPremiumUnsub.current?.();
      IAP?.endConnection?.();
      unsubConfigListener();
      unsubFeatureGating();
    };
  }, []);

  const purchaseFn = useCallback(async (plan: SubscriptionPlan): Promise<boolean> => {
    if (!IAP) {
      Alert.alert(t('subscription.unavailable'), t('subscription.unavailableMessage'));
      return false;
    }
    try {
      const platformKey = Platform.OS === 'ios' ? 'ios' : 'android';
      const productId = config.products[plan][platformKey];

      if (!productId) {
        Alert.alert(t('subscription.unavailable'), t('subscription.unavailableMessage'));
        return false;
      }

      if (__DEV__) {
        console.log(`🛒 Purchase requested: plan=${plan}, productId=${productId}, platform=${platformKey}`);
      }

      // Verify the product was actually fetched from the store
      const fetchedProduct = rawProductsRef.current.find(
        (p: any) => p.productId === productId || p.id === productId
      );
      if (!fetchedProduct) {
        console.log('❌ Product not found in fetched products:', productId);
        Alert.alert(
          t('subscription.purchaseError'),
          t('subscription.purchaseErrorMessage')
        );
        return false;
      }

      if (plan === 'lifetime') {
        const userId = await getUserId().catch(() => '');
        await IAP.requestPurchase({
          type: 'in-app',
          request: Platform.OS === 'ios'
            ? { apple: { sku: productId } }
            : { google: { skus: [productId], ...(userId ? { obfuscatedAccountId: userId } : {}) } },
        });
      } else {
        const userId = await getUserId().catch(() => '');
        // For Android subscriptions, IAP v14 requires subscriptionOffers with offerToken
        let subscriptionOffers: { sku: string; offerToken: string }[] | undefined;
        if (Platform.OS === 'android') {
          const rawProduct = rawProductsRef.current.find((p: any) => p.productId === productId || p.id === productId);
          const offerDetails = rawProduct?.subscriptionOfferDetails;
          if (offerDetails && offerDetails.length > 0) {
            subscriptionOffers = [{ sku: productId, offerToken: offerDetails[0].offerToken }];
          }
        }

        await IAP.requestPurchase({
          type: 'subs',
          request: Platform.OS === 'ios'
            ? { apple: { sku: productId } }
            : { google: { skus: [productId], ...(subscriptionOffers ? { subscriptionOffers } : {}), ...(userId ? { obfuscatedAccountId: userId } : {}) } },
        });
      }
      return true;
    } catch (error: any) {
      console.log('❌ Purchase failed:', error);
      // Don't show alert for user-initiated cancellations
      const code = error?.code || error?.responseCode;
      if (code !== 'E_USER_CANCELLED' && code !== 'user-cancelled' && code !== 2) {
        Alert.alert(
          t('subscription.purchaseError'),
          t('subscription.purchaseErrorMessage')
        );
      }
      return false;
    }
  }, [config]);

  const restore = useCallback(async (): Promise<boolean> => {
    if (!IAP) {
      Alert.alert(t('subscription.unavailable'), t('subscription.unavailableMessage'));
      return false;
    }
    try {
      const purchases = await IAP.getAvailablePurchases();
      if (purchases.length > 0) {
        // Sort by transactionDate descending to get the most recent purchase
        const sorted = [...purchases].sort(
          (a: any, b: any) => (b.transactionDate || 0) - (a.transactionDate || 0)
        );
        const latestPurchase = sorted[0];
        const plan = getPlanFromProductId(latestPurchase.productId, config);

        if (plan) {
          // For active subscriptions returned by getAvailablePurchases, set a future expiry
          // rather than computing from original purchase date (which ignores renewals)
          const restoredState: SubscriptionState = {
            isPremium: true,
            plan,
            expiresAt: plan === 'lifetime'
              ? null
              : new Date(Date.now() + (plan === 'yearly' ? 370 : 35) * 24 * 60 * 60 * 1000).toISOString(),
            purchaseToken: latestPurchase.transactionId || null,
          };
          await setSubscriptionState(restoredState);
          setState(restoredState);
          setPremiumSource('iap');
          setPremiumGrantedBy(null);
          Alert.alert(t('subscription.restoreSuccess'), t('subscription.restoreSuccessMessage'));
          return true;
        }
      }
      Alert.alert(t('subscription.noSubscriptionFound'), t('subscription.noSubscriptionFoundMessage'));
      return false;
    } catch (error) {
      console.log('❌ Restore failed:', error);
      Alert.alert(t('subscription.restoreError'), t('subscription.restoreErrorMessage'));
      return false;
    }
  }, [config]);

  const isFeatureLocked = useCallback((key: PremiumFeatureKey): boolean => {
    // If subscriptions are disabled entirely, nothing is locked
    if (!config.enabled) return false;
    return isFeaturePremium(key, featureGating) && !state.isPremium;
  }, [featureGating, state.isPremium, config.enabled]);

  const handleMarkPaywallShown = useCallback(() => {
    setAutoShowPaywall(false);
    markPaywallShown();
  }, []);

  // Reset paywall counter on successful purchase
  const purchaseWrapped = useCallback(async (plan: SubscriptionPlan): Promise<boolean> => {
    const result = await purchaseFn(plan);
    if (result) resetPaywallCounter();
    return result;
  }, [purchaseFn]);

  // Re-fetch IAP products (retry after failure)
  const refetchProducts = useCallback(async () => {
    if (!IAP) return;
    const platformKey = Platform.OS === 'ios' ? 'ios' : 'android';
    const lifetimeId = config.products.lifetime[platformKey];
    const subIds = [
      config.products.monthly[platformKey],
      config.products.yearly[platformKey],
    ].filter(Boolean);
    try {
      const fetchPromises: Promise<any[]>[] = [];
      if (lifetimeId) fetchPromises.push(IAP.fetchProducts({ skus: [lifetimeId], type: 'in-app' }));
      if (subIds.length > 0) fetchPromises.push(IAP.fetchProducts({ skus: subIds, type: 'subs' }));
      const results = await Promise.all(fetchPromises);
      const items = results.flat().filter(Boolean);
      if (items.length > 0) {
        rawProductsRef.current = items;
        const mapped = items
          .map((item: any) => {
            const id = item.id || item.productId;
            const plan = getPlanFromProductId(id, config);
            if (!plan) return null;
            return {
              id,
              plan,
              title: item.title || '',
              price: item.displayPrice || '',
              priceAmount: item.price ?? 0,
              currency: item.currency || '',
              description: item.description || '',
            };
          })
          .filter(Boolean) as SubscriptionProduct[];
        setProducts(mapped);
      }
    } catch (e) {
      console.log('⚠️ refetchProducts failed:', e);
    }
  }, [config]);

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium: state.isPremium,
        premiumSource,
        premiumGrantedBy,
        currentPlan: state.plan,
        expiresAt: state.expiresAt,
        products,
        config,
        isLoading,
        isSubscriptionEnabled: config.enabled,
        purchase: purchaseWrapped,
        restore,
        features: config.features,
        isFeatureLocked,
        // SSOT: all plan visibility now derived from Firestore admin config
        showLifetime: config.enabled && config.lifetimeEnabled,
        showYearly: config.enabled,
        showMonthly: config.enabled,
        badgeText: '',
        lifetimePriceOverride: '',
        showUpgradeBanner: config.enabled && config.premiumBannerEnabled && !state.isPremium,
        shouldAutoShowPaywall: autoShowPaywall,
        markPaywallAutoShown: handleMarkPaywallShown,
        refetchProducts,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
