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
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
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
  DISPLAY_NAME: '@rooh_display_name',
};

const SECURE_KEYS = {
  DEVICE_ID: 'rooh_device_id',
};

// ==================== SecureStore safe wrappers ====================
// iOS Simulator builds without code-signing (or missing keychain-access-groups
// entitlement) throw "A required entitlement isn't present". These wrappers
// silently fall back so callers never see entitlement errors; on real devices
// with a valid provisioning profile, SecureStore works normally.

const isEntitlementError = (err: unknown): boolean => {
  const msg = (err as { message?: string } | null)?.message ?? '';
  return /entitlement isn'?t present|Keychain access failed/i.test(msg);
};

const secureGetItem = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    if (!isEntitlementError(err)) {
      console.warn('SecureStore getItemAsync failed:', err);
    }
    return null;
  }
};

const secureSetItem = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    if (!isEntitlementError(err)) {
      console.warn('SecureStore setItemAsync failed:', err);
    }
  }
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

/**
 * Generate a random fallback ID (for web platform or errors)
 */
const generateFallbackId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `fallback_${timestamp}_${randomPart}`;
};

/**
 * Get native device ID that persists across app reinstalls
 * Priority order:
 * 1. SecureStore (most persistent — survives reinstall via iOS Keychain)
 * 2. AsyncStorage (preserves existing user identity — prevents duplicate Firestore docs)
 * 3. Native device ID (new users only)
 * 4. Fallback random ID (web/errors)
 * 
 * IMPORTANT: AsyncStorage is checked BEFORE native ID to prevent existing users
 * from getting a new identity when the app upgrades to native ID support.
 * fallback_ IDs in AsyncStorage are treated as unreliable and replaced with native IDs.
 */
const getDeviceId = async (): Promise<string> => {
  try {
    // 1. Check SecureStore first (most persistent, survives reinstall on iOS)
    const secureId = await secureGetItem(SECURE_KEYS.DEVICE_ID);
    if (secureId) {
      // If SecureStore has a fallback_ ID and we can get a native one, upgrade it
      if (secureId.startsWith('fallback_')) {
        const nativeId = await getNativeDeviceId();
        if (nativeId) {
          await secureSetItem(SECURE_KEYS.DEVICE_ID, nativeId);
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, nativeId);
          console.log('🔄 Upgraded fallback ID to native:', nativeId.substring(0, 20) + '...');
          return nativeId;
        }
      }
      console.log('🔐 Device ID from SecureStore:', secureId.substring(0, 20) + '...');
      return secureId;
    }

    // 2. Check AsyncStorage FIRST (preserves existing user identity)
    const asyncId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    if (asyncId) {
      // If existing ID is a fallback_, try to upgrade to native ID
      if (asyncId.startsWith('fallback_')) {
        const nativeId = await getNativeDeviceId();
        if (nativeId) {
          await secureSetItem(SECURE_KEYS.DEVICE_ID, nativeId);
          await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, nativeId);
          console.log('🔄 Upgraded fallback AsyncStorage ID to native:', nativeId.substring(0, 20) + '...');
          return nativeId;
        }
      }
      // Migrate existing non-fallback ID to SecureStore for persistence
      await secureSetItem(SECURE_KEYS.DEVICE_ID, asyncId);
      console.log('📦 Migrated existing ID to SecureStore:', asyncId.substring(0, 20) + '...');
      return asyncId;
    }

    // 3. New user — try native device ID
    const nativeId = await getNativeDeviceId();
    if (nativeId) {
      await secureSetItem(SECURE_KEYS.DEVICE_ID, nativeId);
      console.log('🆔 Native device ID saved:', nativeId.substring(0, 20) + '...');
      return nativeId;
    }

    // 4. Last resort: generate new ID and save everywhere
    const newId = generateFallbackId();
    await secureSetItem(SECURE_KEYS.DEVICE_ID, newId);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newId);
    console.log('🆕 Generated new fallback ID:', newId);
    return newId;

  } catch (error) {
    console.warn('Error getting device ID (using fallback):', error);
    // Ultimate fallback
    return generateFallbackId();
  }
};

/**
 * Get platform-specific native device ID
 */
const getNativeDeviceId = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'ios') {
      const vendorId = await Application.getIosIdForVendorAsync();
      if (vendorId) return `ios_${vendorId}`;
    } else if (Platform.OS === 'android') {
      const androidId = Application.getAndroidId();
      if (androidId) return `android_${androidId}`;
    }
  } catch {}
  return null;
};

/**
 * Get the original device-based user ID (ignoring merge override).
 * Used for checking merge status on the original user doc.
 */
export const getOriginalDeviceUserId = async (): Promise<string> => {
  try {
    const deviceId = await getDeviceId();
    return deviceId;
  } catch {
    return generateFallbackId();
  }
};

export const getUserId = async (): Promise<string> => {
  try {
    // Check if user was merged into another account — use override ID
    const override = await AsyncStorage.getItem('@rooh_user_id_override');
    if (override) return override;

    // Use device-based ID instead of random
    const deviceId = await getDeviceId();
    
    // Also store in AsyncStorage for quick access
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, deviceId);
    
    return deviceId;
  } catch (error) {
    console.error('❌ Error getting user ID:', error);
    return generateFallbackId();
  }
};

export const getFCMToken = async (): Promise<string> => {
  // APNs tokens require a real device + valid aps-environment entitlement from
  // the provisioning profile. Simulators + unsigned sim builds cannot obtain
  // them — skip silently so we don't spam LogBox with entitlement errors.
  if (!Device.isDevice) {
    return '';
  }
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
    // aps-environment is unavailable on simulator and unsigned builds.
    if (isEntitlementError(error)) {
      return '';
    }
    console.warn('Error getting FCM token:', error);
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
    const appVersion = Constants.expoConfig?.version || '1.2.0';
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
      const existingData = userDoc.data();
      await updateDoc(userRef, {
        ...userData,
        // Preserve installSource if already set (don't override on subsequent sessions)
        ...(existingData?.installSource ? {} : { installSource }),
        // Don't overwrite a valid token with empty string
        ...((!fcmToken && existingData?.fcmToken) ? { fcmToken: existingData.fcmToken } : {}),
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

/**
 * تحديث دولة المستخدم بناء على GPS الحقيقي (ISO country code)
 * أدق من locales[0].regionCode اللي بيعكس لغة الجهاز مش الموقع الفعلي
 */
export const updateUserCountryFromGPS = async (isoCountryCode: string): Promise<void> => {
  try {
    const code = (isoCountryCode || '').toUpperCase().trim();
    if (!code || code.length !== 2) return;
    const userId = await getUserId();
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      country: code,
      countrySource: 'gps',
      updatedAt: serverTimestamp(),
    });
    console.log('🌍 Updated user country from GPS:', code);
  } catch {
    console.log('Could not update user country from GPS');
  }
};

export const getDisplayName = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.DISPLAY_NAME);
  } catch {
    return null;
  }
};

export const setDisplayName = async (name: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, name.trim());
  } catch (error) {
    console.error('❌ Failed to save display name locally:', error);
  }
};

/**
 * Sync user profile from Firestore → local.
 * - Updates local display name from Firestore if changed (e.g. admin merge).
 * - Detects if user was merged into another account (placeholder + mergedInto).
 * - Follows merge chains (A→B→C) to find the final target.
 * Returns merge info so callers can react (e.g. migrate userId).
 */
export const syncUserProfileFromFirestore = async (
  userId: string
): Promise<{ merged: boolean; targetId?: string; displayName?: string }> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { merged: false };

    const data = userSnap.data();

    // Check if this user was merged into another account
    if (data.placeholder && data.mergedInto) {
      // Follow merge chain (A→B→C) — max 5 hops to prevent infinite loops
      let finalTargetId = data.mergedInto;
      for (let i = 0; i < 5; i++) {
        const targetSnap = await getDoc(doc(db, 'users', finalTargetId));
        if (!targetSnap.exists()) break;
        const targetData = targetSnap.data();
        if (targetData.placeholder && targetData.mergedInto) {
          finalTargetId = targetData.mergedInto;
        } else {
          // Found the final target — update local name and store override
          const targetName = targetData.displayName;
          if (targetName) {
            await AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, targetName);
          }
          // Store userId override so all future operations use the merged identity
          await AsyncStorage.setItem('@rooh_user_id_override', finalTargetId);
          console.log('🔀 User merged: redirecting', userId, '→', finalTargetId);
          return { merged: true, targetId: finalTargetId, displayName: targetName };
        }
      }
      // Chain too long or broken — just mark as merged with what we have
      await AsyncStorage.setItem('@rooh_user_id_override', finalTargetId);
      return { merged: true, targetId: finalTargetId };
    }

    // Not merged — just sync the display name from Firestore → local
    if (data.displayName) {
      const localName = await AsyncStorage.getItem(STORAGE_KEYS.DISPLAY_NAME);
      if (localName !== data.displayName) {
        await AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, data.displayName);
        console.log('📝 Display name synced from Firestore:', data.displayName);
      }
    }

    return { merged: false, displayName: data.displayName };
  } catch (error) {
    console.log('⚠️ syncUserProfileFromFirestore failed (non-fatal):', error);
    return { merged: false };
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