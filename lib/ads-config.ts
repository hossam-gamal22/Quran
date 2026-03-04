// lib/ads-config.ts
// إعدادات الإعلانات - روح المسلم
// آخر تحديث: 2026-03-04

import { Platform } from 'react-native';
import { db } from './firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== Ad Unit IDs ====================

export const AD_IDS = {
  APP_OPEN: {
    android: 'ca-app-pub-6103597967254377/5798712736',
    ios: 'ca-app-pub-6103597967254377/3930767722',
  },
  // يمكنك إضافة المزيد لاحقاً
  BANNER: {
    android: '', // أضف لاحقاً
    ios: '',     // أضف لاحقاً
  },
  INTERSTITIAL: {
    android: '', // أضف لاحقاً
    ios: '',     // أضف لاحقاً
  },
};

// ==================== Test Ad IDs ====================

export const TEST_AD_IDS = {
  APP_OPEN: 'ca-app-pub-3940256099942544/9257395921',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
};

// ==================== Types ====================

export interface AdsConfig {
  enabled: boolean;
  showAppOpenAd: boolean;
  appOpenAdFrequency: number;
  skipFirstOpen: boolean;
  minTimeBetweenAds: number;
  maxAdsPerSession: number;
}

// ==================== Default Config ====================

const DEFAULT_ADS_CONFIG: AdsConfig = {
  enabled: true,
  showAppOpenAd: true,
  appOpenAdFrequency: 1,      // كل مرة يفتح التطبيق
  skipFirstOpen: true,         // تخطي أول فتح
  minTimeBetweenAds: 60,       // 60 ثانية
  maxAdsPerSession: 5,         // أقصى 5 إعلانات
};

// ==================== Functions ====================

/**
 * الحصول على Ad Unit ID حسب المنصة
 */
export const getAdUnitId = (type: 'APP_OPEN' | 'BANNER' | 'INTERSTITIAL', useTestAds: boolean = __DEV__): string => {
  if (useTestAds) {
    return TEST_AD_IDS[type];
  }
  
  const platformAds = AD_IDS[type];
  return Platform.OS === 'ios' ? platformAds.ios : platformAds.android;
};

/**
 * جلب إعدادات الإعلانات من Firebase
 */
export const fetchAdsConfig = async (): Promise<AdsConfig> => {
  try {
    const docRef = doc(db, 'config', 'ads');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<AdsConfig>;
      const config = { ...DEFAULT_ADS_CONFIG, ...data };
      
      // حفظ في Cache
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
 * التحقق إذا كانت الإعلانات مفعلة
 */
export const isAdsEnabled = async (): Promise<boolean> => {
  const config = await fetchAdsConfig();
  return config.enabled;
};
