// contexts/SubscriptionContext.tsx
// سياق الاشتراكات - روح المسلم

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';

import {
  SubscriptionState,
  SubscriptionConfig,
  SubscriptionPlan,
  SubscriptionProduct,
  fetchSubscriptionConfig,
  subscribeToSubscriptionConfig,
  getSubscriptionState,
  setSubscriptionState,
  getPlanFromProductId,
  DEFAULT_SUBSCRIPTION_CONFIG,
} from '@/lib/subscription-manager';

import { fetchFeatureGatingConfig, subscribeToFeatureGating, isFeaturePremium, DEFAULT_FEATURE_GATING } from '@/lib/feature-gating';
import type { PremiumFeatureKey, PremiumSource, FeatureGatingConfig, AdminGrantedPremium } from '@/types/premium';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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
// react-native-iap requires native modules. On Expo Go or web, import fails.
// We dynamically require it and fallback gracefully.

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

try {
  IAP = require('react-native-iap');
} catch {
  console.log('⚠️ react-native-iap not available (Expo Go or web). Subscriptions disabled.');
}

// ==================== Context Type ====================

interface SubscriptionContextType {
  isPremium: boolean;
  premiumSource: PremiumSource;
  currentPlan: SubscriptionPlan | null;
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
  currentPlan: null,
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
  badgeText: 'أفضل قيمة',
  lifetimePriceOverride: '',
  showUpgradeBanner: false,
  shouldAutoShowPaywall: false,
  markPaywallAutoShown: () => {},
  refetchProducts: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

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
  const [featureGating, setFeatureGating] = useState<FeatureGatingConfig>(DEFAULT_FEATURE_GATING);
  const purchaseUpdateSubscription = useRef<any>(null);
  const purchaseErrorSubscription = useRef<any>(null);
  const adminPremiumUnsub = useRef<(() => void) | null>(null);
  const [autoShowPaywall, setAutoShowPaywall] = useState(false);

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

        setState(savedState);
        setConfig(fetchedConfig);

        // Check admin-granted premium
        if (savedState.isPremium) {
          setPremiumSource('iap');
        } else {
          try {
            const userId = await getUserId();
            if (userId) {
              const userRef = doc(db, 'users', userId);
              // Real-time listener for admin premium changes (grant/revoke/expiry)
              adminPremiumUnsub.current = onSnapshot(userRef, async (snap) => {
                if (!mounted) return;
                const data = snap.data();
                const adminPremium = data?.adminPremium as AdminGrantedPremium | undefined;
                if (adminPremium?.granted) {
                  const notExpired = !adminPremium.expiresAt || new Date(adminPremium.expiresAt) > new Date();
                  if (notExpired) {
                    // Detect false → true transition (new grant)
                    const wasPremium = premiumSource === 'admin';
                    setState(prev => ({ ...prev, isPremium: true }));
                    setPremiumSource('admin');
                    // Send local notification on new premium grant (once per grantedAt)
                    if (!wasPremium) {
                      const grantTs = adminPremium.grantedAt
                        ? (typeof adminPremium.grantedAt === 'object' && 'seconds' in adminPremium.grantedAt
                            ? (adminPremium.grantedAt as any).seconds
                            : String(adminPremium.grantedAt))
                        : 'unknown';
                      const grantKey = `@admin_premium_notified_${grantTs}`;
                      const alreadyNotified = await AsyncStorage.getItem(grantKey).catch(() => null);
                      if (!alreadyNotified) {
                        await AsyncStorage.setItem(grantKey, 'true').catch(() => {});
                        const isWinner = adminPremium.grantedBy === 'auto_reward_system';
                        Notifications.scheduleNotificationAsync({
                          content: {
                            title: '🎉 تهانينا!',
                            body: isWinner
                              ? 'أنت بطل الشهر! تم منحك نسخة مميزة مجاناً 🏆'
                              : 'تم منحك نسخة مميزة من الإدارة 🌟',
                            sound: 'default',
                            data: { type: 'premium_granted' },
                          },
                          trigger: null,
                        }).catch(() => {});
                      }
                    }
                  } else {
                    // Premium expired — clean up stale data in Firestore
                    setState(prev => ({ ...prev, isPremium: prev.plan ? prev.isPremium : false }));
                    if (premiumSource === 'admin') setPremiumSource(null);
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
                  // Admin premium revoked or not granted
                  if (premiumSource === 'admin') {
                    setState(prev => ({ ...prev, isPremium: false }));
                    setPremiumSource(null);
                  }
                }
              }, (err) => {
                console.log('⚠️ Admin premium listener error:', err);
              });
            }
          } catch (e) {
            console.log('⚠️ Admin premium check failed:', e);
          }
        }

        if (!fetchedConfig.enabled || !IAP) {
          // Paywall auto-display check (even if IAP unavailable, count opens)
          await incrementPaywallOpenCount();
          const currentIsPremium = savedState.isPremium || premiumSource === 'admin';
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
                  await setDoc(doc(db, 'users', userId, 'purchases', purchase.transactionId || `purchase_${Date.now()}`), {
                    productId: purchase.productId,
                    plan,
                    transactionId: purchase.transactionId || null,
                    platform: Platform.OS,
                    purchasedAt: serverTimestamp(),
                    expiresAt: newState.expiresAt || null,
                  });
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
        const currentIsPremium = savedState.isPremium || premiumSource === 'admin';
        const showPw = await shouldShowPaywall(fetchedConfig, currentIsPremium);
        if (showPw && mounted) setAutoShowPaywall(true);

        // Revalidate subscription status against the store on launch
        // This handles auto-renewed subscriptions whose local expiry has passed
        if (savedState.isPremium && savedState.plan !== 'lifetime' && savedState.expiresAt) {
          const localExpiry = new Date(savedState.expiresAt);
          if (localExpiry < new Date()) {
            try {
              const activePurchases = await IAP.getAvailablePurchases();
              const stillActive = activePurchases.some((p: any) =>
                getPlanFromProductId(p.productId, fetchedConfig) != null
              );
              if (stillActive && mounted) {
                const renewedState: SubscriptionState = {
                  ...savedState,
                  expiresAt: new Date(Date.now() + (savedState.plan === 'yearly' ? 370 : 35) * 24 * 60 * 60 * 1000).toISOString(),
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
        await IAP.requestPurchase({
          type: 'in-app',
          request: Platform.OS === 'ios'
            ? { apple: { sku: productId } }
            : { google: { skus: [productId] } },
        });
      } else {
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
            : { google: { skus: [productId], ...(subscriptionOffers ? { subscriptionOffers } : {}) } },
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
        currentPlan: state.plan,
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
        badgeText: 'أفضل قيمة',
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
