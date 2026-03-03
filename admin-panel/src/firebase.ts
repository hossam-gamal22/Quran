// admin-panel/src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A",
  authDomain: "rooh-almuslim.firebaseapp.com",
  projectId: "rooh-almuslim",
  storageBucket: "rooh-almuslim.firebasestorage.app",
  messagingSenderId: "328160076358",
  appId: "1:328160076358:web:fe5ec8e8b07355f1c06047"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Analytics (browser only)
export const initAnalytics = async () => {
  try {
    if (await isSupported()) {
      return getAnalytics(app);
    }
  } catch (e) {
    console.log('Analytics not supported');
  }
  return null;
};

// Helper function to check Firebase connection
export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    const { getDocs, collection, limit, query } = await import('firebase/firestore');
    await getDocs(query(collection(db, 'stats'), limit(1)));
    return true;
  } catch (error) {
    console.log('Firebase connection check failed:', error);
    return false;
  }
};

export default app;
