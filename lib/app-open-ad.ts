// lib/app-open-ad.ts
// إعلان فتح التطبيق - روح المسلم

import { AppOpenAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { Platform, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== Ad Unit IDs ====================

const AD_UNIT_IDS = {
  android: 'ca-app-pub-6103597967254377/5798712736',
  ios: 'ca-app-pub-6103597967254377/3930767722',
};

// للاختبار - استخدم Test IDs
const USE_TEST_ADS = __DEV__; // true في التطوير، false في الإنتاج

const getAdUnitId = (): string => {
  if (USE_TEST_ADS) {
    return TestIds.APP_OPEN;
  }
  return Platform.OS === 'ios' ? AD_UNIT_IDS.ios : AD_UNIT_IDS.android;
};

// ==================== المتغيرات ====================

let appOpenAd: AppOpenAd | null = null;
let isShowingAd = false;
let lastAdShownTime = 0;
const MIN_TIME_BETWEEN_ADS = 60 * 1000; // دقيقة واحدة بين كل إعلان

// ==================== الدوال ====================

/**
 * تحميل إعلان فتح التطبيق
 */
export const loadAppOpenAd = (): void => {
  try {
    // إنشاء الإعلان
    appOpenAd = AppOpenAd.createForAdRequest(getAdUnitId(), {
      keywords: ['islamic', 'quran', 'prayer', 'muslim'],
    });

    // الاستماع للأحداث
    appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('✅ App Open Ad loaded');
    });

    appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('❌ App Open Ad error:', error);
      appOpenAd = null;
    });

    appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('📱 App Open Ad closed');
      isShowingAd = false;
      lastAdShownTime = Date.now();
      // تحميل إعلان جديد للمرة القادمة
      loadAppOpenAd();
    });

    appOpenAd.addAdEventListener(AdEventType.OPENED, () => {
      console.log('📱 App Open Ad opened');
      isShowingAd = true;
    });

    // تحميل الإعلان
    appOpenAd.load();
  } catch (error) {
    console.log('Error creating app open ad:', error);
  }
};

/**
 * عرض إعلان فتح التطبيق
 */
export const showAppOpenAd = async (): Promise<boolean> => {
  // التحقق من الوقت بين الإعلانات
  const timeSinceLastAd = Date.now() - lastAdShownTime;
  if (timeSinceLastAd < MIN_TIME_BETWEEN_ADS) {
    console.log('⏳ Too soon to show another ad');
    return false;
  }

  // التحقق من حالة الإعلان
  if (isShowingAd) {
    console.log('⚠️ Ad is already showing');
    return false;
  }

  if (!appOpenAd) {
    console.log('⚠️ No ad loaded');
    loadAppOpenAd();
    return false;
  }

  try {
    await appOpenAd.show();
    return true;
  } catch (error) {
    console.log('Error showing app open ad:', error);
    loadAppOpenAd();
    return false;
  }
};

/**
 * تهيئة نظام الإعلانات مع تتبع حالة التطبيق
 */
export const initializeAppOpenAds = (): (() => void) => {
  // تحميل أول إعلان
  loadAppOpenAd();

  // تتبع حالة التطبيق
  let appState = AppState.currentState;

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // عند العودة للتطبيق من الـ background
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      showAppOpenAd();
    }
    appState = nextAppState;
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  // إرجاع دالة التنظيف
  return () => {
    subscription.remove();
  };
};

/**
 * التحقق إذا كان الإعلان جاهز
 */
export const isAdReady = (): boolean => {
  return appOpenAd !== null && !isShowingAd;
};
