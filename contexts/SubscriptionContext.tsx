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
  getProductIds,
  getPlanFromProductId,
  DEFAULT_SUBSCRIPTION_CONFIG,
} from '@/lib/subscription-manager';

import { fetchFeatureGatingConfig, isFeaturePremium, DEFAULT_FEATURE_GATING } from '@/lib/feature-gating';
import type { PremiumFeatureKey, PremiumSource, FeatureGatingConfig, AdminGrantedPremium } from '@/types/premium';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { t } from '@/lib/i18n';

// ==================== Safe IAP import ====================
// react-native-iap requires native modules. On Expo Go or web, import fails.
// We dynamically require it and fallback gracefully.

let IAP: {
  initConnection: () => Promise<any>;
  endConnection: () => Promise<any>;
  fetchProducts: (opts: { skus: string[] }) => Promise<any[]>;
  requestPurchase: (opts: any) => Promise<any>;
  getAvailablePurchases: () => Promise<any[]>;
  purchaseUpdatedListener: (cb: (purchase: any) => void) => any;
  purchaseErrorListener: (cb: (error: any) => void) => any;
  finishTransaction: (opts: any) => Promise<any>;
  ErrorCode: any;
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
  purchase: (plan: SubscriptionPlan) => Promise<boolean>;
  restore: () => Promise<boolean>;
  features: string[];
  isFeatureLocked: (key: PremiumFeatureKey) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  premiumSource: null,
  currentPlan: null,
  products: [],
  config: DEFAULT_SUBSCRIPTION_CONFIG,
  isLoading: true,
  purchase: async () => false,
  restore: async () => false,
  features: DEFAULT_SUBSCRIPTION_CONFIG.features,
  isFeatureLocked: () => true,
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
  const [config, setConfig] = useState<SubscriptionConfig>(DEFAULT_SUBSCRIPTION_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [premiumSource, setPremiumSource] = useState<PremiumSource>(null);
  const [featureGating, setFeatureGating] = useState<FeatureGatingConfig>(DEFAULT_FEATURE_GATING);
  const purchaseUpdateSubscription = useRef<any>(null);
  const purchaseErrorSubscription = useRef<any>(null);

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
          setIsLoading(false);
          return;
        }

        // Initialize IAP connection
        await IAP.initConnection();

        // Load available products
        const productIds = getProductIds(fetchedConfig);
        try {
          const items = await IAP.fetchProducts({ skus: productIds });
          if (mounted && items) {
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
          }
        } catch (e) {
          console.log('⚠️ Could not load IAP products:', e);
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
              if (mounted) setState(newState);
              await IAP!.finishTransaction({ purchase, isConsumable: false });
            }
          }
        );

        purchaseErrorSubscription.current = IAP.purchaseErrorListener(
          (error: any) => {
            console.log('❌ Purchase error:', error);
            if (error.code !== IAP!.ErrorCode?.UserCancelled) {
              Alert.alert(t('subscription.purchaseError'), t('subscription.purchaseErrorMessage'));
            }
          }
        );
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

  const purchase = useCallback(async (plan: SubscriptionPlan): Promise<boolean> => {
    if (!IAP) {
      Alert.alert(t('subscription.unavailable'), t('subscription.unavailableMessage'));
      return false;
    }
    try {
      const platformKey = Platform.OS === 'ios' ? 'ios' : 'android';
      const productId = config.products[plan][platformKey];

      if (plan === 'lifetime') {
        await IAP.requestPurchase({
          type: 'in-app',
          request: Platform.OS === 'ios'
            ? { apple: { sku: productId } }
            : { google: { skus: [productId] } },
        });
      } else {
        await IAP.requestPurchase({
          type: 'subs',
          request: Platform.OS === 'ios'
            ? { apple: { sku: productId } }
            : { google: { skus: [productId] } },
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
        const latestPurchase = purchases[purchases.length - 1];
        const plan = getPlanFromProductId(latestPurchase.productId, config);

        if (plan) {
          const restoredState: SubscriptionState = {
            isPremium: true,
            plan,
            expiresAt: plan === 'lifetime' ? null : latestPurchase.transactionDate
              ? new Date(latestPurchase.transactionDate + (plan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString()
              : null,
            purchaseToken: latestPurchase.transactionId || null,
          };
          await setSubscriptionState(restoredState);
          setState(restoredState);
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
    return isFeaturePremium(key, featureGating) && !state.isPremium;
  }, [featureGating, state.isPremium]);

  return (
    <SubscriptionContext.Provider
      value={{
        isPremium: state.isPremium,
        premiumSource,
        currentPlan: state.plan,
        products,
        config,
        isLoading,
        purchase,
        restore,
        features: config.features,
        isFeatureLocked,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
