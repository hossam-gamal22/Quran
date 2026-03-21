// lib/firebase-user.ts
// تسجيل وإدارة المستخدمين في Firebase
// آخر تحديث: 2026-03-04

import { db } from './firebase-config';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  serverTimestamp,
  Timestamp,
  increment 
} from 'firebase/firestore';
import * as Device from 'expo-device';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';

// ==================== الثوابت ====================

const STORAGE_KEYS = {
  USER_ID: '@rooh_user_id',
  FCM_TOKEN: '@rooh_fcm_token',
  FIRST_OPEN: '@rooh_first_open',
};

// ==================== الأنواع ====================

export interface UserData {
  id: string;
  platform: 'ios' | 'android' | 'web';
  deviceName: string;
  deviceBrand: string;
  osVersion: string;
  appVersion: string;
  language: string;
  country: string;
  timezone: string;
  fcmToken: string;
  installSource: string;
  isActive: boolean;
  isPremium: boolean;
  createdAt: Timestamp | null;
  lastActive: Timestamp | null;
  updatedAt: Timestamp | null;
  settings: {
    notifications: boolean;
    prayerReminders: boolean;
    azkarReminders: boolean;
    dailyAyah: boolean;
  };
}

// ==================== الدوال ====================

const generateUserId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `user_${timestamp}_${randomPart}`;
};

export const getUserId = async (): Promise<string> => {
  try {
    let userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!userId) {
      userId = generateUserId();
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      console.log('🆔 New user ID generated:', userId);
    }
    return userId;
  } catch (error) {
    console.error('❌ Error getting user ID:', error);
    return generateUserId();
  }
};

export const getFCMToken = async (): Promise<string> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('⚠️ Push notification permission not granted');
      return '';
    }
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '12ffec15-6357-43b4-a309-8e71cc2afc8c',
    });
    
    const token = tokenData.data;
    await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
    console.log('🔔 FCM Token obtained:', token.substring(0, 20) + '...');
    return token;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return '';
  }
};

/**
 * Detect where the app was installed from
 */
const detectInstallSource = async (): Promise<string> => {
  try {
    if (Platform.OS === 'android') {
      try {
        const installer = await NativeModules?.RNGetInstallerPackageName?.getInstallerPackageName?.();
        if (installer === 'com.android.vending') return 'play_store';
        if (installer === 'com.google.android.packageinstaller' || installer === 'com.android.packageinstaller') return 'external_apk';
        if (installer === 'com.samsung.android.packageinstaller') return 'external_apk';
      } catch {}
      if (Constants.appOwnership === 'expo') return 'expo_go';
      if (Constants.appOwnership === 'standalone' || !Constants.appOwnership) return 'play_store';
      return 'unknown';
    }
    if (Platform.OS === 'ios') {
      if (Constants.appOwnership === 'expo') return 'expo_go';
      if (Constants.appOwnership === 'standalone' || !Constants.appOwnership) return 'app_store';
      return 'unknown';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
};

export const registerUser = async (): Promise<{ success: boolean; userId: string }> => {
  try {
    const userId = await getUserId();
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const fcmToken = await getFCMToken();
    const installSource = await detectInstallSource();
    
    const locales = Localization.getLocales();
    const appVersion = Constants.expoConfig?.version || '1.0.0';
    const userData: Partial<UserData> = {
      id: userId,
      platform: Platform.OS as 'ios' | 'android' | 'web',
      deviceName: Device.deviceName || 'Unknown Device',
      deviceBrand: Device.brand || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      appVersion,
      language: locales[0]?.languageCode || 'ar',
      country: locales[0]?.regionCode || 'SA',
      timezone: Localization.getCalendars()[0]?.timeZone || 'Asia/Riyadh',
      fcmToken,
      isActive: true,
      isPremium: false,
      installSource,
      updatedAt: serverTimestamp() as any,
      lastActive: serverTimestamp() as any,
    };
    
    if (!userDoc.exists()) {
      // New user — create doc and track install
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        settings: {
          notifications: true,
          prayerReminders: true,
          azkarReminders: true,
          dailyAyah: true,
        },
      });
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_OPEN, 'false');
      
      // Track install in global stats
      try {
        const statsRef = doc(db, 'stats', 'global');
        const installField = `installs_${installSource}`;
        await updateDoc(statsRef, {
          totalInstalls: increment(1),
          [installField]: increment(1),
          [`installs_${Platform.OS}`]: increment(1),
          lastInstall: serverTimestamp(),
        });
      } catch {
        // stats doc might not exist yet
      }
      
      console.log('✅ New user registered:', userId, 'from:', installSource);
    } else {
      // Existing user — update session data
      await updateDoc(userRef, {
        ...userData,
        // Preserve installSource if already set (don't override on subsequent sessions)
        ...(userDoc.data()?.installSource ? {} : { installSource }),
      });
      console.log('✅ User data updated:', userId);
    }
    
    return { success: true, userId };
  } catch (error) {
    console.error('❌ Error registering user:', error);
    return { success: false, userId: '' };
  }
};

export const updateLastActive = async (): Promise<void> => {
  try {
    const userId = await getUserId();
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { lastActive: serverTimestamp() });
  } catch (error) {
    console.log('Could not update last active');
  }
};

export const isFirstOpen = async (): Promise<boolean> => {
  try {
    const firstOpen = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_OPEN);
    return firstOpen === null;
  } catch {
    return true;
  }
};