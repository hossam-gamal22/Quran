// config/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_PUBLIC_FIREBASE_CONFIG = {
  android: {
    apiKey: 'AIzaSyB9DnDJnqTzy7L86W-cpZCyBr9Z7fTDsxo',
    appId: '1:328160076358:android:5cddcc506f5bfb15c06047',
  },
  ios: {
    apiKey: 'AIzaSyCy3pkmrqQz3lWYPr0b6NVoca1j5huU0Oo',
    appId: '1:328160076358:ios:db9a9b5e809ff250c06047',
  },
  web: {
    apiKey: 'AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A',
    appId: '1:328160076358:web:fe5ec8e8b07355f1c06047',
  },
} as const;

const getFirebaseApiKey = (): string => {
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_FIREBASE_API_KEY_ANDROID
      || process.env.EXPO_PUBLIC_FIREBASE_API_KEY
      || DEFAULT_PUBLIC_FIREBASE_CONFIG.android.apiKey;
  }
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_FIREBASE_API_KEY_IOS
      || process.env.EXPO_PUBLIC_FIREBASE_API_KEY
      || DEFAULT_PUBLIC_FIREBASE_CONFIG.ios.apiKey;
  }
  return process.env.EXPO_PUBLIC_FIREBASE_API_KEY_WEB
    || process.env.EXPO_PUBLIC_FIREBASE_API_KEY
    || DEFAULT_PUBLIC_FIREBASE_CONFIG.web.apiKey;
};

const getFirebaseAppId = (): string => {
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID
      || process.env.EXPO_PUBLIC_FIREBASE_APP_ID
      || DEFAULT_PUBLIC_FIREBASE_CONFIG.android.appId;
  }
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS
      || process.env.EXPO_PUBLIC_FIREBASE_APP_ID
      || DEFAULT_PUBLIC_FIREBASE_CONFIG.ios.appId;
  }
  return process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB
    || process.env.EXPO_PUBLIC_FIREBASE_APP_ID
    || DEFAULT_PUBLIC_FIREBASE_CONFIG.web.appId;
};

const firebaseApiKey = getFirebaseApiKey();
const firebaseAppId = getFirebaseAppId();

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: 'rooh-almuslim.firebaseapp.com',
  projectId: 'rooh-almuslim',
  storageBucket: 'rooh-almuslim.firebasestorage.app',
  messagingSenderId: '328160076358',
  appId: firebaseAppId,
};

// Initialize app once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Force HTTP long-polling instead of WebSockets. WebSocket streaming in the
// Firebase JS SDK causes "INTERNAL ASSERTION FAILED: Unexpected state" errors
// in React Native when the connection transitions (network change, background
// resume). Long-polling is more reliable in React Native's networking layer.
// The globalThis guard prevents Fast Refresh from re-calling initializeFirestore.
export const db = (() => {
  if ((globalThis as any).__firestoreInitialized) {
    return getFirestore(app);
  }
  (globalThis as any).__firestoreInitialized = true;
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
})();
export const storage = getStorage(app);

// Initialize Auth with React Native persistence (survives app restarts)
const initAuth = (): Auth | null => {
  // Web uses default auth initialization path
  if (Platform.OS === 'web') {
    try {
      return getAuth(app);
    } catch (error) {
      console.warn('⚠️ Firebase web Auth init failed:', error);
      return null;
    }
  }

  // Native (iOS/Android): initialize Auth with AsyncStorage persistence.
  // firebase v10 exposes `initializeAuth` + `getReactNativePersistence` from
  // the main `firebase/auth` entry (Metro resolves the react-native build).
  // The old v9 `firebase/auth/react-native` subpath no longer resolves and
  // was silently falling back to a persistence-less / null auth, which broke
  // anonymous sign-in and (via the auth-gated rules) all user-doc writes.
  try {
    const {
      initializeAuth: initializeAuthRN,
      getReactNativePersistence,
    } = require('firebase/auth') as typeof import('firebase/auth') & {
      getReactNativePersistence: (storage: unknown) => unknown;
    };

    return initializeAuthRN(app, {
      persistence: getReactNativePersistence(AsyncStorage) as any,
    });
  } catch (error: any) {
    const message = String(error?.message || '');
    const alreadyInitialized =
      error?.code === 'auth/already-initialized' ||
      message.includes('already-initialized') ||
      message.includes('already initialized');

    if (alreadyInitialized) {
      try {
        return getAuth(app);
      } catch (fallbackError) {
        console.warn('⚠️ Firebase Auth already initialized but getAuth failed:', fallbackError);
        return null;
      }
    }

    console.warn('⚠️ Firebase RN Auth init failed; falling back to getAuth:', error);
    try {
      return getAuth(app);
    } catch (fallbackError) {
      console.warn('⚠️ Firebase getAuth fallback failed; continuing without auth:', fallbackError);
      return null;
    }
  }
};

const auth: Auth | null = initAuth();
export { auth };

let signInPromise: Promise<User | null> | null = null;

/**
 * Ensure the user is signed in anonymously to Firebase Auth.
 * Returns the Firebase User (with .uid) once available.
 * Safe to call multiple times — the same in-flight promise is reused.
 */
export const ensureFirebaseUser = (): Promise<User | null> => {
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (signInPromise) return signInPromise;

  signInPromise = new Promise<User | null>((resolve) => {
    let resolved = false;
    const finish = (user: User | null) => {
      if (!resolved) {
        resolved = true;
        resolve(user);
      }
    };

    // First listen for restored session from AsyncStorage
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        finish(user);
      }
    });

    // Hard timeout: if neither listener nor sign-in resolves within 8s,
    // give up, return null, and clear the cached promise so the next call retries.
    const hardTimeout = setTimeout(() => {
      if (!resolved) {
        console.warn('⚠️ Firebase auth hard timeout after 8s; allowing retry');
        unsub();
        finish(null);
        signInPromise = null;
      }
    }, 8000);

    // Then trigger anonymous sign-in if no session restored within 1.5s
    setTimeout(() => {
      if (auth.currentUser) {
        unsub();
        clearTimeout(hardTimeout);
        finish(auth.currentUser);
        return;
      }
      signInAnonymously(auth)
        .then((cred) => {
          unsub();
          clearTimeout(hardTimeout);
          finish(cred.user);
        })
        .catch((err) => {
          console.warn('⚠️ Firebase anonymous sign-in failed:', err?.code || err);
          unsub();
          clearTimeout(hardTimeout);
          finish(null);
          signInPromise = null; // allow retry on next call
        });
    }, 1500);
  });

  return signInPromise;
};

/**
 * Get current Firebase Auth UID synchronously (or null if not signed in yet).
 * Safe to call any time; returns null until `ensureFirebaseUser()` resolves.
 */
export const getFirebaseUid = (): string | null => auth?.currentUser?.uid ?? null;


export default app;
