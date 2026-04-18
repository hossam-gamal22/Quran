// config/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
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

const firebaseConfig = {
  apiKey: 'AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A',
  authDomain: 'rooh-almuslim.firebaseapp.com',
  projectId: 'rooh-almuslim',
  storageBucket: 'rooh-almuslim.firebasestorage.app',
  messagingSenderId: '328160076358',
  appId: '1:328160076358:web:fe5ec8e8b07355f1c06047',
};

// Initialize app once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
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

  // Native (iOS/Android): use the RN entry-point for persistence support
  try {
    const {
      initializeAuth: initializeAuthRN,
      getReactNativePersistence,
    } = require('firebase/auth/react-native');

    return initializeAuthRN(app, {
      persistence: getReactNativePersistence(AsyncStorage),
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
