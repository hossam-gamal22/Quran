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
  getSubscriptionState,
  setSubscriptionState,
  getPlanFromProductId,
  DEFAULT_SUBSCRIPTION_CONFIG,
} from '@/lib/subscription-manager';

import { fetchFeatureGatingConfig, isFeaturePremium, DEFAULT_FEATURE_GATING } from '@/lib/feature-gating';
import type { PremiumFeatureKey, PremiumSource, FeatureGatingConfig, AdminGrantedPremium } from '@/types/premium';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { t } from '@/lib/i18n';
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
            const userId = await AsyncStorage.getItem('@user_id');
            if (userId) {
              const userSnap = await getDoc(doc(db, 'users', userId));
              if (userSnap.exists()) {
                const adminPremium = userSnap.data()?.adminPremium as AdminGrantedPremium | undefined;
                if (adminPremium?.granted) {
                  const notExpired = !adminPremium.expiresAt || new Date(adminPremium.expiresAt) > new Date();
                  if (notExpired && mounted) {
                    setState(prev => ({ ...prev, isPremium: true }));
                    setPremiumSource('admin');
                  }
                }
              }
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
          if (mounted && items) {
            rawProductsRef.current = items;
            setProducts(
              items.map((item: any) => {
                const plan = getPlanFromProductId(item.id, fetchedConfig);
                return {
                  id: item.id,
                  plan: plan || 'monthly',
                  title: item.title || '',
                  price: item.displayPrice || '',
                  priceAmount: item.price ?? 0,
                  currency: item.currency || '',
                  description: item.description || '',
                };
              })
            );
            // Cache product prices for offline display
            try {
              const serializable = items.map((item: any) => ({
                id: item.id,
                plan: getPlanFromProductId(item.id, fetchedConfig) || 'monthly',
                title: item.title || '',
                price: item.displayPrice || '',
                priceAmount: item.price ?? 0,
                currency: item.currency || '',
                description: item.description || '',
              }));
              await AsyncStorage.setItem('@subscription_products_cache', JSON.stringify(serializable));
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

    return () => {
      mounted = false;
      purchaseUpdateSubscription.current?.remove?.();
      purchaseErrorSubscription.current?.remove?.();
      IAP?.endConnection?.();
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
    } catch (error) {
      console.log('❌ Purchase failed:', error);
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
        setProducts(
          items.map((item: any) => {
            const plan = getPlanFromProductId(item.id, config);
            return {
              id: item.id,
              plan: plan || 'monthly',
              title: item.title || '',
              price: item.displayPrice || '',
              priceAmount: item.price ?? 0,
              currency: item.currency || '',
              description: item.description || '',
            };
          })
        );
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
