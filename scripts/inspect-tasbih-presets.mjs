#!/usr/bin/env node
import { initializeApp } from 'firebase/app';
import { getFirestore, getDocs, collection } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY_WEB || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

if (!firebaseApiKey) {
  throw new Error('Missing EXPO_PUBLIC_FIREBASE_API_KEY_WEB or EXPO_PUBLIC_FIREBASE_API_KEY');
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: 'rooh-almuslim.firebaseapp.com',
  projectId: 'rooh-almuslim',
  storageBucket: 'rooh-almuslim.firebasestorage.app',
  messagingSenderId: '328160076358',
  appId: '1:328160076358:web:fe5ec8e8b07355f1c06047',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

await signInAnonymously(auth);
console.log('Signed in:', auth.currentUser?.uid);

const snap = await getDocs(collection(db, 'tasbihPresets'));
console.log(`\nFound ${snap.size} docs in tasbihPresets:\n`);
snap.docs.forEach(d => {
  const data = d.data();
  console.log(`  docId: ${d.id}`);
  console.log(`    id: ${typeof data.id} = ${JSON.stringify(data.id)}`);
  console.log(`    order: ${typeof data.order} = ${JSON.stringify(data.order)}`);
  console.log(`    text: ${JSON.stringify(data.text?.slice(0, 30))}...`);
  console.log(`    virtue: ${JSON.stringify(data.virtue?.slice(0, 50))}`);
  console.log(`    reference: ${JSON.stringify(data.reference)}`);
  console.log('');
});
process.exit(0);
