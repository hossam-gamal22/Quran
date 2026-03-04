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
  Timestamp 
} from 'firebase/firestore';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';

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

export const registerUser = async (): Promise<{ success: boolean; userId: string }> => {
  try {
    const userId = await getUserId();
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const fcmToken = await getFCMToken();
    
    const locales = Localization.getLocales();
    const userData: Partial<UserData> = {
      id: userId,
      platform: Platform.OS as 'ios' | 'android' | 'web',
      deviceName: Device.deviceName || 'Unknown Device',
      deviceBrand: Device.brand || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      appVersion: '1.0.0',
      language: locales[0]?.languageCode || 'ar',
      country: locales[0]?.regionCode || 'SA',
      timezone: Localization.getCalendars()[0]?.timeZone || 'Asia/Riyadh',
      fcmToken,
      isActive: true,
      isPremium: false,
      updatedAt: serverTimestamp() as any,
      lastActive: serverTimestamp() as any,
    };
    
    if (!userDoc.exists()) {
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
      console.log('✅ New user registered successfully:', userId);
    } else {
      await updateDoc(userRef, userData);
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