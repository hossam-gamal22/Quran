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
  | 'worship'
  | 'seerah'
  | 'companions'
  | 'hajj_umrah'
  | 'daily_ayah'
  | 'hadith'
  | 'ayat_universe'
  | 'hadith_sifat';

// ==================== Test Ad IDs ====================

export const TEST_AD_IDS = {
  APP_OPEN: 'ca-app-pub-3940256099942544/9257395921',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
};

// ==================== Ad Slot IDs ====================

export type AdSlotKey =
  | 'ad_home_banner'
  | 'ad_home_interstitial'
  | 'ad_quran_between_surahs'
  | 'ad_prayer_times_bottom'
  | 'ad_tasbih_completion'
  | 'ad_settings_top'
  | 'ad_section_detail_banner';

// ==================== Types ====================

export interface AdUnitIds {
  android: string;
  ios: string;
}

export interface AdSlot {
  enabled: boolean;
  adUnitId: AdUnitIds;
  type: 'banner' | 'interstitial';
  label: string;
  /** Target screen(s) — empty/undefined = manual placement only */
  screens?: string[];
  /** Position on screen */
  position?: 'top' | 'bottom';
}

export interface AdsConfig {
  enabled: boolean;
  // Legacy global Ad Unit IDs (fallback)
  bannerAdId: AdUnitIds;
  interstitialAdId: AdUnitIds;
  appOpenAdId: AdUnitIds;
  // Named ad slots with individual ad unit IDs
  adSlots?: Record<string, AdSlot>;
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

// ==================== Production Ad Unit IDs ====================

export const PRODUCTION_AD_IDS = {
  ios: {
    banner: 'ca-app-pub-3645278220050673/9534813157',
    interstitial: 'ca-app-pub-3645278220050673/7064203695',
    appOpen: 'ca-app-pub-3645278220050673/6908649810',
    nativeAdvanced: 'ca-app-pub-3645278220050673/8070163603',
  },
  android: {
    banner: 'ca-app-pub-3645278220050673/6453829605',
    interstitial: 'ca-app-pub-3645278220050673/5882983961',
    appOpen: 'ca-app-pub-3645278220050673/3627880358',
    nativeAdvanced: 'ca-app-pub-3645278220050673/5595568144',
  },
};

export const DEFAULT_ADS_CONFIG: AdsConfig = {
  enabled: true,
  bannerAdId: {
    android: PRODUCTION_AD_IDS.android.banner,
    ios: PRODUCTION_AD_IDS.ios.banner,
  },
  interstitialAdId: {
    android: PRODUCTION_AD_IDS.android.interstitial,
    ios: PRODUCTION_AD_IDS.ios.interstitial,
  },
  appOpenAdId: {
    android: PRODUCTION_AD_IDS.android.appOpen,
    ios: PRODUCTION_AD_IDS.ios.appOpen,
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
    seerah: true,
    companions: true,
    hajj_umrah: true,
    daily_ayah: true,
    hadith: true,
    ayat_universe: true,
    hadith_sifat: true,
  },
  showAdOnAppOpen: true,
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

  // Ad slots
  if (data.adSlots) normalized.adSlots = data.adSlots;

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

/**
 * الحصول على Ad Unit ID لموضع إعلاني محدد
 * يرجع string فارغ إذا الموضع غير مفعّل (= لا يُعرض شيء)
 */
export const getSlotAdUnitId = (
  config: AdsConfig | null,
  slotKey: string,
  useTestAds: boolean = __DEV__
): string => {
  if (!config?.enabled) return '';
  const slot = config.adSlots?.[slotKey];
  if (!slot?.enabled) return '';

  const adUnitId = slot.adUnitId;
  const platformId = Platform.OS === 'ios' ? adUnitId.ios : adUnitId.android;
  if (!platformId) return '';

  if (useTestAds) {
    return slot.type === 'interstitial' ? TEST_AD_IDS.INTERSTITIAL : TEST_AD_IDS.BANNER;
  }
  return platformId;
};

/**
 * الحصول على نوع الإعلان لموضع محدد
 */
export const getSlotType = (config: AdsConfig | null, slotKey: string): 'banner' | 'interstitial' | null => {
  const slot = config?.adSlots?.[slotKey];
  if (!slot?.enabled) return null;
  return slot.type;
};

/**
 * الحصول على المواضع الإعلانية لشاشة معينة
 */
export const getSlotsForScreen = (
  config: AdsConfig | null,
  screenKey: string,
  position?: 'top' | 'bottom'
): { key: string; slot: AdSlot }[] => {
  if (!config?.enabled || !config.adSlots) return [];
  return Object.entries(config.adSlots)
    .filter(([, slot]) => {
      if (!slot.enabled) return false;
      if (!slot.screens?.includes(screenKey)) return false;
      if (position && slot.position !== position) return false;
      return true;
    })
    .map(([key, slot]) => ({ key, slot }));
};

// ==================== Global Ad Cooldown ====================
// Prevents ANY ad type from showing within 2 minutes of another ad

let _globalLastAdTime = 0;
const GLOBAL_AD_COOLDOWN = 120_000; // 2 minutes between any ad types

export function canShowGlobalAd(): boolean {
  return Date.now() - _globalLastAdTime >= GLOBAL_AD_COOLDOWN;
}

export function recordGlobalAdShown(): void {
  _globalLastAdTime = Date.now();
}
