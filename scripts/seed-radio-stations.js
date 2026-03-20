// scripts/seed-radio-stations.js
// One-time script to seed Firestore with radio stations
// Usage: node scripts/seed-radio-stations.js

const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, serverTimestamp, query, where } = require('firebase/firestore');

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

const stations = [
  // ─── Curated stations (from app's hardcoded CURATED_STATIONS) ───
  {
    name: 'إذاعة القرآن الكريم من القاهرة',
    nameEn: 'Holy Quran Radio Cairo — FM 98.2',
    nameTranslations: {
      ar: 'إذاعة القرآن الكريم من القاهرة',
      en: 'Holy Quran Radio Cairo — FM 98.2',
      fr: 'Radio Sainte Coran du Caire — FM 98.2',
      tr: 'Kahire Kutsal Kuran Radyosu — FM 98.2',
    },
    streamUrl: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
    category: 'quran',
    country: 'EG',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: true,
    order: 1,
    tags: ['quran', 'cairo', 'egypt'],
  },
  {
    name: 'إذاعة القرآن الكريم - السعودية',
    nameEn: 'Saudi Quran Radio',
    nameTranslations: {
      ar: 'إذاعة القرآن الكريم - السعودية',
      en: 'Saudi Quran Radio',
      fr: 'Radio Coran Saoudienne',
      tr: 'Suudi Kuran Radyosu',
    },
    streamUrl: 'https://stream.radiojar.com/0tpy1h0kxtzuv',
    category: 'quran',
    country: 'SA',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: true,
    order: 2,
    tags: ['quran', 'saudi'],
  },
  {
    name: 'إذاعة الحرم المكي',
    nameEn: 'Makkah Live',
    nameTranslations: {
      ar: 'إذاعة الحرم المكي',
      en: 'Makkah Live',
      fr: 'La Mecque en direct',
      tr: 'Mekke Canlı',
    },
    streamUrl: 'https://backup.qurango.net/radio/mix',
    category: 'quran',
    country: 'SA',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: true,
    order: 3,
    tags: ['quran', 'makkah', 'haram'],
  },

  // ─── Additional stations from user request ───
  {
    name: 'إذاعة القرآن الكريم من مكة المكرمة',
    nameEn: 'Holy Quran Radio - Makkah',
    nameTranslations: {
      ar: 'إذاعة القرآن الكريم من مكة المكرمة',
      en: 'Holy Quran Radio - Makkah',
    },
    streamUrl: 'https://Qurango.net/radio/tarateel',
    category: 'quran',
    country: 'SA',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 4,
    tags: ['quran', 'makkah'],
  },
  {
    name: 'إذاعة القرآن الكريم من المدينة المنورة',
    nameEn: 'Holy Quran Radio - Madinah',
    nameTranslations: {
      ar: 'إذاعة القرآن الكريم من المدينة المنورة',
      en: 'Holy Quran Radio - Madinah',
    },
    streamUrl: 'https://stream.radiojarvis.com/listen/quran_madinah/stream.mp3',
    category: 'quran',
    country: 'SA',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 5,
    tags: ['quran', 'madinah'],
  },
  {
    name: 'إذاعة القرآن الكريم المصرية',
    nameEn: 'Egyptian Quran Radio',
    nameTranslations: {
      ar: 'إذاعة القرآن الكريم المصرية',
      en: 'Egyptian Quran Radio',
    },
    streamUrl: 'https://radio.islamweb.net/mp3/',
    category: 'quran',
    country: 'EG',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 6,
    tags: ['quran', 'egypt'],
  },
  {
    name: 'إذاعة القرآن الكريم السعودية',
    nameEn: 'Saudi Quran Radio',
    nameTranslations: {
      ar: 'إذاعة القرآن الكريم السعودية',
      en: 'Saudi Quran Radio',
    },
    streamUrl: 'https://stream.zeno.fm/0r0xa792kwzuv',
    category: 'quran',
    country: 'SA',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 7,
    tags: ['quran', 'saudi'],
  },
  {
    name: 'إذاعة نور القرآن الكريم',
    nameEn: 'Nour Al-Quran Radio',
    nameTranslations: {
      ar: 'إذاعة نور القرآن الكريم',
      en: 'Nour Al-Quran Radio',
    },
    streamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    category: 'quran',
    country: '',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 8,
    tags: ['quran'],
  },
  {
    name: 'راديو إسلام ويب',
    nameEn: 'IslamWeb Radio',
    nameTranslations: {
      ar: 'راديو إسلام ويب',
      en: 'IslamWeb Radio',
    },
    streamUrl: 'https://radio.islamweb.net/mp3quran/',
    category: 'islamic',
    country: 'QA',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 9,
    tags: ['islamic'],
  },
  {
    name: 'إذاعة المسجد الحرام',
    nameEn: 'Al-Masjid Al-Haram Radio',
    nameTranslations: {
      ar: 'إذاعة المسجد الحرام',
      en: 'Al-Masjid Al-Haram Radio',
    },
    streamUrl: 'https://Qurango.net/radio/tarateel',
    category: 'quran',
    country: 'SA',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 10,
    tags: ['quran', 'makkah', 'haram'],
  },
];

async function getExistingStreamUrls() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const urls = new Set();
  snapshot.docs.forEach(d => {
    const data = d.data();
    if (data.streamUrl) urls.add(data.streamUrl);
  });
  return urls;
}

async function seed() {
  console.log('🔍 Checking existing stations in Firestore...');
  const existingUrls = await getExistingStreamUrls();
  console.log(`   Found ${existingUrls.size} existing station(s)\n`);

  let added = 0;
  let skipped = 0;

  for (const station of stations) {
    if (existingUrls.has(station.streamUrl)) {
      console.log(`⏭️  Skipped (already exists): ${station.name}`);
      skipped++;
      continue;
    }

    try {
      const id = station.nameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      const docData = {
        ...station,
        description: '',
        imageUrl: '',
        addedBy: 'seed_script',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, COLLECTION, id), docData);
      console.log(`✅ Added: ${station.name} (${id})`);
      added++;
    } catch (err) {
      console.error(`❌ Failed: ${station.name}`, err.message);
    }
  }

  console.log(`\n📊 Results: ${added} added, ${skipped} skipped, ${stations.length} total`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
