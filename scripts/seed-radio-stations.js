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
    streamUrl: 'https://service.webvideocore.net/CL1olYogIrDWvwqiIKK7eCxOS4PStqG9DuEjAr2ZjZQtvS3d4y9r0cvRhvS17SGN/a_7a4vuubc6mo8.m3u8',
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
    streamUrl: 'https://backup.qurango.net/radio/abdulrahman_alsudaes',
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
    name: 'إذاعة مشاري العفاسي',
    nameEn: 'Mishary Alafasi Radio',
    nameTranslations: {
      ar: 'إذاعة مشاري العفاسي',
      en: 'Mishary Alafasi Radio',
    },
    streamUrl: 'https://backup.qurango.net/radio/mishary_alafasi',
    category: 'reciter',
    country: 'KW',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 5,
    tags: ['quran', 'reciter', 'alafasi'],
  },
  {
    name: 'إذاعة سعود الشريم',
    nameEn: 'Saud Al-Shuraim Radio',
    nameTranslations: {
      ar: 'إذاعة سعود الشريم',
      en: 'Saud Al-Shuraim Radio',
    },
    streamUrl: 'https://backup.qurango.net/radio/saud_alshuraim',
    category: 'reciter',
    country: 'SA',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 6,
    tags: ['quran', 'reciter', 'shuraim'],
  },
  {
    name: 'إذاعة ماهر المعيقلي',
    nameEn: 'Maher Al-Muaiqly Radio',
    nameTranslations: {
      ar: 'إذاعة ماهر المعيقلي',
      en: 'Maher Al-Muaiqly Radio',
    },
    streamUrl: 'https://backup.qurango.net/radio/maher_almuaiqly',
    category: 'reciter',
    country: 'SA',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 7,
    tags: ['quran', 'reciter', 'muaiqly'],
  },
  {
    name: 'إذاعة عبدالباسط عبدالصمد',
    nameEn: 'Abdulbasit Abdulsamad Radio',
    nameTranslations: {
      ar: 'إذاعة عبدالباسط عبدالصمد',
      en: 'Abdulbasit Abdulsamad Radio',
    },
    streamUrl: 'https://backup.qurango.net/radio/abdulbasit_abdulsamad_mojawwad',
    category: 'reciter',
    country: 'EG',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 8,
    tags: ['quran', 'reciter', 'abdulbasit'],
  },
  {
    name: 'إذاعة محمود خليل الحصري',
    nameEn: 'Mahmoud Khalil Al-Hussary Radio',
    nameTranslations: {
      ar: 'إذاعة محمود خليل الحصري',
      en: 'Mahmoud Khalil Al-Hussary Radio',
    },
    streamUrl: 'https://Qurango.net/radio/mahmoud_khalil_alhussary',
    category: 'reciter',
    country: 'EG',
    language: 'ar',
    isActive: true,
    isHidden: false,
    isFeatured: false,
    order: 9,
    tags: ['quran', 'reciter', 'hussary'],
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
