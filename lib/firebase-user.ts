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
  increment,
  deleteField,
  collection,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';
import { ensureFirebaseUser } from '@/config/firebase';

// ==================== الثوابت ====================

const STORAGE_KEYS = {
  USER_ID: '@rooh_user_id',
  FCM_TOKEN: '@rooh_fcm_token',
  FIRST_OPEN: '@rooh_first_open',
  DISPLAY_NAME: '@rooh_display_name',
  APP_LANGUAGE: '@app_language',
};

const SUPPORTED_LANGUAGE_CODES = new Set([
  'ar', 'en', 'fr', 'de', 'es', 'tr', 'ur', 'id', 'ms', 'hi', 'bn', 'ru',
]);

const resolveLanguage = async (deviceLocale: string | null | undefined): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.APP_LANGUAGE);
    if (saved && SUPPORTED_LANGUAGE_CODES.has(saved)) return saved;
  } catch {}
  const normalized = (deviceLocale || '').slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGE_CODES.has(normalized) ? normalized : 'ar';
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
  authUid?: string;
  platform: 'ios' | 'android' | 'web';
  nativeDeviceId?: string;
  originalDeviceUserId?: string;
  deviceFingerprint?: string;
  deviceName: string;
  deviceBrand: string;
  deviceModel?: string;
  osVersion: string;
  appVersion: string;
  language: string;
  country: string;
  countrySource?: 'device_locale' | 'gps' | 'admin';
  countryName?: string;
  locationCity?: string;
  locationLatitude?: number;
  locationLongitude?: number;
  locationUpdatedAt?: Timestamp | null;
  timezone: string;
  fcmToken: string;
  appStatus?: 'installed' | 'uninstalled';
  appStatusUpdatedAt?: Timestamp | null;
  uninstalledDetectedAt?: Timestamp | null;
  pushTokenInvalid?: boolean;
  lastPushError?: string;
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
    // Don't trigger a system permission prompt here. The prompt is handled by
    // the onboarding flow and PermissionBanner. If permission is not granted,
    // skip token registration silently — it will be retried after grant.
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      console.log('⚠️ Push notification permission not granted — skipping FCM token');
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
    const firebaseUser = await ensureFirebaseUser();
    if (!firebaseUser) {
      throw new Error('Firebase anonymous auth is required before user registration');
    }
    const userId = await getUserId();
    const originalDeviceUserId = await getOriginalDeviceUserId();
    const nativeDeviceId = await getNativeDeviceId();
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const fcmToken = await getFCMToken();
    const installSource = await detectInstallSource();
    
    const locales = Localization.getLocales();
    const appVersion = Constants.expoConfig?.version || '1.2.1';
    const timezone = Localization.getCalendars()[0]?.timeZone || 'Asia/Riyadh';
    const deviceName = Device.deviceName || 'Unknown Device';
    const deviceBrand = Device.brand || 'Unknown';
    const deviceModel = Device.modelName || '';
    const deviceFingerprint = [
      Platform.OS,
      nativeDeviceId || originalDeviceUserId,
      deviceBrand,
      deviceModel || deviceName,
    ]
      .filter(Boolean)
      .join('::')
      .toLowerCase();
    const userData: Partial<UserData> = {
      id: userId,
      authUid: firebaseUser.uid,
      platform: Platform.OS as 'ios' | 'android' | 'web',
      nativeDeviceId: nativeDeviceId || originalDeviceUserId,
      originalDeviceUserId,
      deviceFingerprint,
      deviceName,
      deviceBrand,
      ...(deviceModel ? { deviceModel } : {}),
      osVersion: Device.osVersion || 'Unknown',
      appVersion,
      language: await resolveLanguage(locales[0]?.languageCode),
      // country is intentionally NOT written here — it must come from GPS via
      // `updateUserCountryFromGPS` (triggered when the user grants location for
      // prayer times). Device locale / timezone are unreliable signals and were
      // polluting notification targeting filters.
      timezone,
      fcmToken,
      appStatus: 'installed',
      appStatusUpdatedAt: serverTimestamp() as any,
      pushTokenInvalid: false,
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
      // Existing user — update session data.
      // Country is owned by GPS / admin only. We never write it from
      // registerUser; if a legacy device_locale value is still in Firestore,
      // we clear it so notification targeting doesn't act on a guessed country.
      const existingData = userDoc.data();
      const existingCountrySource = existingData?.countrySource;
      const isTrustedCountrySource =
        existingCountrySource === 'gps' || existingCountrySource === 'admin';
      const clearLegacyCountry = !isTrustedCountrySource && Boolean(existingData?.country);
      await updateDoc(userRef, {
        ...userData,
        ...(clearLegacyCountry
          ? {
              country: deleteField(),
              countrySource: deleteField(),
            }
          : {}),
        // Preserve installSource if already set (don't override on subsequent sessions)
        ...(existingData?.installSource ? {} : { installSource }),
        // Don't overwrite a valid token with empty string
        ...((!fcmToken && existingData?.fcmToken) ? { fcmToken: existingData.fcmToken } : {}),
        uninstalledDetectedAt: deleteField(),
        uninstallDetectionSource: deleteField(),
        lastPushError: deleteField(),
      });
      console.log('✅ User data updated:', userId);
    }
    
    return { success: true, userId };
  } catch (error) {
    console.warn('⚠️ Error registering user:', error);
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
 * Persist the user's chosen app language to Firestore so admin notification
 * targeting can reach them in the language they actually read the app in.
 * Without this, `users/{id}.language` stays pinned to the device locale and
 * language filters miss users who switched language in-app.
 */
export const updateUserLanguage = async (language: string): Promise<void> => {
  if (!SUPPORTED_LANGUAGE_CODES.has(language)) return;
  try {
    const userId = await getUserId();
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { language, updatedAt: serverTimestamp() });
  } catch (error) {
    console.log('Could not update user language');
  }
};

/**
 * تحديث دولة المستخدم بناء على GPS الحقيقي (ISO country code)
 * أدق من locales[0].regionCode اللي بيعكس لغة الجهاز مش الموقع الفعلي
 */
export const updateUserCountryFromGPS = async (
  isoCountryCode: string,
  location?: {
    city?: string;
    countryName?: string;
    latitude?: number;
    longitude?: number;
  },
): Promise<void> => {
  try {
    const code = (isoCountryCode || '').toUpperCase().trim();
    if (!code || code.length !== 2) return;
    const userId = await getUserId();
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      id: userId,
      country: code,
      countrySource: 'gps',
      // Permanent GPS-derived country: admin manual edits never overwrite this
      // field, so it stays as the source of truth for notification targeting.
      prayerCountryCode: code,
      prayerCountryUpdatedAt: serverTimestamp(),
      ...(location?.countryName ? { countryName: location.countryName } : {}),
      ...(location?.city ? { locationCity: location.city } : {}),
      ...(typeof location?.latitude === 'number' ? { locationLatitude: location.latitude } : {}),
      ...(typeof location?.longitude === 'number' ? { locationLongitude: location.longitude } : {}),
      locationUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
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

/**
 * Normalize a display name for case-insensitive uniqueness checks.
 * Strips diacritics, collapses internal whitespace, lowercases. Both
 * `displayName` and `displayNameLower` live on the user doc; queries that
 * enforce uniqueness must run against `displayNameLower`.
 */
export const normalizeDisplayName = (raw: string): string => {
  return raw
    .normalize('NFD')
    .replace(/[̀-ًͯ-ٰٟۖ-ۭ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

/**
 * Returns true if any other user already owns this display name.
 * Pass the current userId so they can keep their own name on re-edit.
 */
export const isDisplayNameTaken = async (
  name: string,
  excludeUserId?: string,
): Promise<boolean> => {
  const key = normalizeDisplayName(name);
  if (!key) return false;
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('displayNameLower', '==', key), limit(5));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      if (excludeUserId && docSnap.id === excludeUserId) continue;
      const data = docSnap.data();
      if (data.placeholder === true) continue; // merged-away ghost
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Could not check display name uniqueness:', error);
    // Fail-open: better to let the user proceed than block them on a network blip.
    return false;
  }
};

export const setDisplayName = async (name: string): Promise<void> => {
  const trimmed = name.trim();
  const lower = normalizeDisplayName(trimmed);
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, trimmed);
  } catch (error) {
    console.error('❌ Failed to save display name locally:', error);
  }
  // Mirror to Firestore so server-side targeting (engagement notifications,
  // admin panel filters) sees the name immediately. `displayNameLower` powers
  // the uniqueness query in isDisplayNameTaken().
  try {
    const userId = await getUserId();
    await setDoc(doc(db, 'users', userId), {
      displayName: trimmed,
      displayNameLower: lower,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Could not sync display name to Firestore:', error);
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
