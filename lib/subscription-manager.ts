// lib/subscription-manager.ts
// مدير الاشتراكات - روح المسلم

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { t } from '@/lib/i18n';

// ==================== Types ====================

export type SubscriptionPlan = 'monthly' | 'yearly' | 'lifetime';

export interface SubscriptionProduct {
  id: string;
  plan: SubscriptionPlan;
  title: string;
  price: string;
  priceAmount: number;
  currency: string;
  description: string;
}

export interface SubscriptionState {
  isPremium: boolean;
  plan: SubscriptionPlan | null;
  expiresAt: string | null;
  purchaseToken: string | null;
}

export interface SubscriptionConfig {
  enabled: boolean;
  lifetimeEnabled: boolean;
  products: {
    monthly: { android: string; ios: string };
    yearly: { android: string; ios: string };
    lifetime: { android: string; ios: string };
  };
  features: string[];
  trialDays: number;
  showPaywallOnLaunch: boolean;
  paywallFrequency: number; // show paywall every N app opens
}

// ==================== Constants ====================

const STORAGE_KEY = '@subscription_state';
const CONFIG_CACHE_KEY = '@subscription_config_cache';

export const DEFAULT_SUBSCRIPTION_CONFIG: SubscriptionConfig = {
  enabled: false,
  lifetimeEnabled: false,
  products: {
    monthly: {
      android: 'rooh_muslim_monthly',
      ios: 'rooh_muslim_monthly',
    },
    yearly: {
      android: 'rooh_muslim_yearly',
      ios: 'rooh_muslim_yearly',
    },
    lifetime: {
      android: 'rooh_muslim_lifetime',
      ios: 'rooh_muslim_lifetime',
    },
  },
  features: [
    'subscription.removeAds',
    'subscription.removeLogo',
    'subscription.extraBackgrounds',
    'subscription.supportDev',
  ],
  trialDays: 3,
  showPaywallOnLaunch: false,
  paywallFrequency: 5,
};

const DEFAULT_STATE: SubscriptionState = {
  isPremium: false,
  plan: null,
  expiresAt: null,
  purchaseToken: null,
};

// ==================== Config ====================

export const fetchSubscriptionConfig = async (): Promise<SubscriptionConfig> => {
  try {
    const docRef = doc(db, 'config', 'subscription-settings');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const config = { ...DEFAULT_SUBSCRIPTION_CONFIG, ...data };
      await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
      return config;
    }
  } catch (error) {
    console.log('Error fetching subscription config:', error);
  }

  try {
    const cached = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
    if (cached) return { ...DEFAULT_SUBSCRIPTION_CONFIG, ...JSON.parse(cached) };
  } catch { }

  return DEFAULT_SUBSCRIPTION_CONFIG;
};

// ==================== State Management ====================

export const getSubscriptionState = async (): Promise<SubscriptionState> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state: SubscriptionState = JSON.parse(stored);

      // Check if subscription has expired (non-lifetime)
      if (state.isPremium && state.plan !== 'lifetime' && state.expiresAt) {
        const expiryDate = new Date(state.expiresAt);
        if (expiryDate < new Date()) {
          // Expired — clear premium status
          const expired = { ...DEFAULT_STATE };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expired));
          return expired;
        }
      }

      return state;
    }
  } catch (error) {
    console.log('Error reading subscription state:', error);
  }
  return DEFAULT_STATE;
};

export const setSubscriptionState = async (state: SubscriptionState): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearSubscription = async (): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
};

// ==================== Product IDs ====================

export const getProductIds = (config: SubscriptionConfig): string[] => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return [
    config.products.monthly[platform],
    config.products.yearly[platform],
    config.products.lifetime[platform],
  ];
};

export const getPlanFromProductId = (
  productId: string,
  config: SubscriptionConfig
): SubscriptionPlan | null => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  if (productId === config.products.monthly[platform]) return 'monthly';
  if (productId === config.products.yearly[platform]) return 'yearly';
  if (productId === config.products.lifetime[platform]) return 'lifetime';
  return null;
};

export const getPlanLabel = (plan: SubscriptionPlan): string => {
  switch (plan) {
    case 'monthly': return t('common.monthly');
    case 'yearly': return t('common.yearly');
    case 'lifetime': return t('common.lifetime');
  }
};
