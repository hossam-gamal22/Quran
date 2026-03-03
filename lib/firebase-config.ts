// lib/firebase-config.ts
// إعداد Firebase للتطبيق
// آخر تحديث: 2026-03-04

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// إعدادات Firebase - مشروع روح المسلم
const firebaseConfig = {
  apiKey: "AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A",
  authDomain: "rooh-almuslim.firebaseapp.com",
  projectId: "rooh-almuslim",
  storageBucket: "rooh-almuslim.firebasestorage.app",
  messagingSenderId: "328160076358",
  appId: "1:328160076358:web:fe5ec8e8b07355f1c06047"
};

// تهيئة Firebase (مرة واحدة فقط)
let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized successfully');
} else {
  app = getApps()[0];
  console.log('✅ Firebase already initialized');
}

db = getFirestore(app);
storage = getStorage(app);

export { app, db, storage };
export default app;
