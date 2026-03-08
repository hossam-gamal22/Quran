// lib/ads-config.ts
// إعدادات الإعلانات - روح المسلم

import { Platform } from 'react-native';
import { db } from './firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== Ad Screen Keys ====================

export type AdScreenKey =
  | 'home'
  | 'quran'
  | 'azkar'
  | 'tasbih'
  | 'prayer'
  | 'duas'
  | 'names'
  | 'ruqya'
  | 'hijri'
  | 'surah'
  | 'tafsir'
  | 'khatma'
  | 'worship';

// ==================== Test Ad IDs ====================

export const TEST_AD_IDS = {
  APP_OPEN: 'ca-app-pub-3940256099942544/9257395921',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
};

// ==================== Types ====================

export interface AdUnitIds {
  android: string;
  ios: string;
}

export interface AdsConfig {
  enabled: boolean;
  // Ad Unit IDs
  bannerAdId: AdUnitIds;
  interstitialAdId: AdUnitIds;
  appOpenAdId: AdUnitIds;
  // Per-screen banner visibility
  bannerScreens: Record<string, boolean>;
  // App Open Ad
  showAdOnAppOpen: boolean;
  // Qibla compass style change ad
  showAdOnQiblaStyleChange: boolean;
  // Interstitial settings
  interstitialMode: 'pages' | 'time' | 'session';
  interstitialFrequency: number;
  interstitialTimeInterval: number;
  interstitialSessionLimit: number;
  // Delay
  delayFirstAd: boolean;
  firstAdDelay: number;
  // Metadata
  updatedAt?: string;
}

// ==================== Default Config ====================

export const DEFAULT_ADS_CONFIG: AdsConfig = {
  enabled: true,
  bannerAdId: { android: '', ios: '' },
  interstitialAdId: { android: '', ios: '' },
  appOpenAdId: {
    android: 'ca-app-pub-6103597967254377/5798712736',
    ios: 'ca-app-pub-6103597967254377/3930767722',
  },
  bannerScreens: {
    home: true,
    quran: false,
    azkar: true,
    tasbih: false,
    prayer: false,
    duas: false,
    names: false,
    ruqya: false,
    hijri: false,
    surah: false,
    tafsir: false,
    khatma: false,
    worship: false,
  },
  showAdOnAppOpen: false,
  showAdOnQiblaStyleChange: true,
  interstitialMode: 'pages',
  interstitialFrequency: 5,
  interstitialTimeInterval: 3,
  interstitialSessionLimit: 2,
  delayFirstAd: true,
  firstAdDelay: 30,
};

// ==================== Functions ====================

/**
 * الحصول على Ad Unit ID حسب المنصة
 */
export const getAdUnitId = (
  type: 'APP_OPEN' | 'BANNER' | 'INTERSTITIAL',
  config?: AdsConfig | null,
  useTestAds: boolean = __DEV__
): string => {
  if (useTestAds) {
    return TEST_AD_IDS[type];
  }

  if (config) {
    const idMap = {
      APP_OPEN: config.appOpenAdId,
      BANNER: config.bannerAdId,
      INTERSTITIAL: config.interstitialAdId,
    };
    const ids = idMap[type];
    return Platform.OS === 'ios' ? ids.ios : ids.android;
  }

  return TEST_AD_IDS[type];
};

/**
 * تحويل صيغة admin panel القديمة إلى الصيغة الموحدة
 */
const normalizeAdminConfig = (data: Record<string, any>): Partial<AdsConfig> => {
  const normalized: Partial<AdsConfig> = {};

  if (data.enabled !== undefined) normalized.enabled = data.enabled;

  // Ad Unit IDs - support both old flat format and new nested format
  if (data.bannerAdId) {
    normalized.bannerAdId = data.bannerAdId;
  } else if (data.bannerAdCode) {
    normalized.bannerAdId = { android: data.bannerAdCode, ios: data.bannerAdCode };
  }

  if (data.interstitialAdId) {
    normalized.interstitialAdId = data.interstitialAdId;
  } else if (data.interstitialAdCode) {
    normalized.interstitialAdId = { android: data.interstitialAdCode, ios: data.interstitialAdCode };
  }

  if (data.appOpenAdId) {
    normalized.appOpenAdId = data.appOpenAdId;
  }

  // Banner screens - support both old flat booleans and new nested object
  if (data.bannerScreens) {
    normalized.bannerScreens = data.bannerScreens;
  } else {
    const screens: Record<string, boolean> = {};
    if (data.showBannerOnHome !== undefined) screens.home = data.showBannerOnHome;
    if (data.showBannerOnQuran !== undefined) screens.quran = data.showBannerOnQuran;
    if (data.showBannerOnAzkar !== undefined) screens.azkar = data.showBannerOnAzkar;
    if (Object.keys(screens).length > 0) {
      normalized.bannerScreens = { ...DEFAULT_ADS_CONFIG.bannerScreens, ...screens };
    }
  }

  if (data.showAdOnAppOpen !== undefined) normalized.showAdOnAppOpen = data.showAdOnAppOpen;
  if (data.interstitialMode) normalized.interstitialMode = data.interstitialMode;
  if (data.interstitialFrequency !== undefined) normalized.interstitialFrequency = data.interstitialFrequency;
  if (data.interstitialTimeInterval !== undefined) normalized.interstitialTimeInterval = data.interstitialTimeInterval;
  if (data.interstitialSessionLimit !== undefined) normalized.interstitialSessionLimit = data.interstitialSessionLimit;
  if (data.delayFirstAd !== undefined) normalized.delayFirstAd = data.delayFirstAd;
  if (data.firstAdDelay !== undefined) normalized.firstAdDelay = data.firstAdDelay;
  if (data.updatedAt) normalized.updatedAt = data.updatedAt;

  return normalized;
};

/**
 * جلب إعدادات الإعلانات من Firebase
 */
export const fetchAdsConfig = async (): Promise<AdsConfig> => {
  try {
    const docRef = doc(db, 'config', 'ads-settings');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const raw = docSnap.data();
      const normalized = normalizeAdminConfig(raw);
      const config = { ...DEFAULT_ADS_CONFIG, ...normalized };

      await AsyncStorage.setItem('ads_config_cache', JSON.stringify(config));
      return config;
    }
  } catch (error) {
    console.log('Error fetching ads config:', error);
  }

  // محاولة قراءة من Cache
  try {
    const cached = await AsyncStorage.getItem('ads_config_cache');
    if (cached) {
      return { ...DEFAULT_ADS_CONFIG, ...JSON.parse(cached) };
    }
  } catch (error) {
    console.log('Error reading ads cache');
  }

  return DEFAULT_ADS_CONFIG;
};

/**
 * التحقق إذا كان البانر مفعّل لشاشة معينة
 */
export const isBannerEnabledForScreen = (config: AdsConfig, screen: AdScreenKey): boolean => {
  if (!config.enabled) return false;
  return config.bannerScreens[screen] ?? false;
};

/**
 * التحقق إذا كانت الإعلانات مفعلة
 */
export const isAdsEnabled = async (): Promise<boolean> => {
  const config = await fetchAdsConfig();
  return config.enabled;
};
