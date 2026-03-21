// scripts/fix-radio-urls.js
// One-time script to fix dead radio stream URLs in Firestore
// and remove stations with permanently broken streams.
// Usage: node scripts/fix-radio-urls.js

const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A",
  authDomain: "rooh-almuslim.firebaseapp.com",
  projectId: "rooh-almuslim",
  storageBucket: "rooh-almuslim.firebasestorage.app",
  messagingSenderId: "328160076358",
  appId: "1:328160076358:web:fe5ec8e8b07355f1c06047"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const COLLECTION = 'admin_radio_stations';

// Map of dead URLs → working replacements
const URL_FIXES = {
  'https://stream.radiojar.com/8s5u5tpdtwzuv': 'https://service.webvideocore.net/CL1olYogIrDWvwqiIKK7eCxOS4PStqG9DuEjAr2ZjZQtvS3d4y9r0cvRhvS17SGN/a_7a4vuubc6mo8.m3u8',
  'https://stream.radiojar.com/0tpy1h0kxtzuv': 'https://backup.qurango.net/radio/abdulrahman_alsudaes',
};

// URLs that are completely dead and should be deactivated
const DEAD_URLS = [
  'https://stream.radiojarvis.com/listen/quran_madinah/stream.mp3',
  'https://radio.islamweb.net/mp3/',
  'https://stream.zeno.fm/0r0xa792kwzuv',
  'https://stream.zeno.fm/f3wvbbqmdg8uv',
  'https://radio.islamweb.net/mp3quran/',
];

async function fixUrls() {
  console.log('🔍 Scanning Firestore radio stations...\n');
  const snapshot = await getDocs(collection(db, COLLECTION));
  
  let fixed = 0;
  let deactivated = 0;
  let ok = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const url = data.streamUrl;
    const name = data.name || docSnap.id;

    // Check if URL needs fixing
    if (URL_FIXES[url]) {
      const newUrl = URL_FIXES[url];
      console.log(`🔧 FIXING: ${name}`);
      console.log(`   Old: ${url}`);
      console.log(`   New: ${newUrl}`);
      await updateDoc(doc(db, COLLECTION, docSnap.id), {
        streamUrl: newUrl,
        updatedAt: new Date().toISOString(),
      });
      fixed++;
      continue;
    }

    // Check if URL is dead — deactivate it
    if (DEAD_URLS.includes(url)) {
      console.log(`❌ DEACTIVATING: ${name} (${url})`);
      await updateDoc(doc(db, COLLECTION, docSnap.id), {
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
      deactivated++;
      continue;
    }

    ok++;
  }

  console.log(`\n✅ Done!`);
  console.log(`   Fixed: ${fixed}`);
  console.log(`   Deactivated: ${deactivated}`);
  console.log(`   Already OK: ${ok}`);
}

fixUrls().catch(console.error);
