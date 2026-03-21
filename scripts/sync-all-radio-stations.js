// scripts/sync-all-radio-stations.js
// Fetches ALL radio stations from MP3Quran + RadioBrowser APIs,
// merges with curated stations, and writes them to Firestore.
// Usage: node scripts/sync-all-radio-stations.js

const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

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

// ==================== Helpers ====================

function ensureHttps(url) {
  if (!url) return url;
  return url.replace(/^http:\/\//i, 'https://');
}

function inferCategory(name, tags) {
  const combined = `${(name || '').toLowerCase()} ${(tags || '').toLowerCase()}`;
  if (combined.includes('تفسير') || combined.includes('tafsir') || combined.includes('tafseer')) return 'tafsir';
  if (combined.includes('ترجمة') || combined.includes('translation')) return 'translation';
  if (combined.includes('أذكار') || combined.includes('athkar') || combined.includes('adhkar')) return 'adhkar';
  if (combined.includes('سيرة') || combined.includes('seerah')) return 'seerah';
  if (combined.includes('حديث') || combined.includes('hadith') || combined.includes('riyad')) return 'hadith';
  if (combined.includes('رقية') || combined.includes('ruqyah') || combined.includes('roqiah')) return 'ruqyah';
  if (combined.includes('أطفال') || combined.includes('kids') || combined.includes('children')) return 'kids';
  if (combined.includes('قرآن') || combined.includes('quran') || combined.includes('إذاعة')) return 'reciter';
  return 'islamic';
}

function makeDocId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 60);
}

// ==================== Curated Stations ====================

const CURATED_STATIONS = [
  {
    name: 'إذاعة القرآن الكريم من القاهرة',
    nameEn: 'Holy Quran Radio Cairo — FM 98.2',
    nameTranslations: {
      ar: 'إذاعة القرآن الكريم من القاهرة',
      en: 'Holy Quran Radio Cairo — FM 98.2',
    },
    streamUrl: 'https://service.webvideocore.net/CL1olYogIrDWvwqiIKK7eCxOS4PStqG9DuEjAr2ZjZQtvS3d4y9r0cvRhvS17SGN/a_7a4vuubc6mo8.m3u8',
    category: 'quran',
    country: 'EG',
    language: 'ar',
    isFeatured: true,
    order: 1,
    tags: ['quran', 'cairo', 'egypt'],
    source: 'curated',
  },
  {
    name: 'إذاعة القرآن الكريم - السعودية',
    nameEn: 'Saudi Quran Radio',
    nameTranslations: {
      ar: 'إذاعة القرآن الكريم - السعودية',
      en: 'Saudi Quran Radio',
    },
    streamUrl: 'https://backup.qurango.net/radio/abdulrahman_alsudaes',
    category: 'quran',
    country: 'SA',
    language: 'ar',
    isFeatured: true,
    order: 2,
    tags: ['quran', 'saudi'],
    source: 'curated',
  },
  {
    name: 'إذاعة الحرم المكي',
    nameEn: 'Makkah Live',
    nameTranslations: {
      ar: 'إذاعة الحرم المكي',
      en: 'Makkah Live',
    },
    streamUrl: 'https://backup.qurango.net/radio/mix',
    category: 'quran',
    country: 'SA',
    language: 'ar',
    isFeatured: true,
    order: 3,
    tags: ['quran', 'makkah', 'haram'],
    source: 'curated',
  },
];

// ==================== API Fetchers ====================

async function fetchMp3Quran() {
  console.log('📻 Fetching MP3Quran API...');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch('https://www.mp3quran.net/api/v3/radios?language=ar', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn('   MP3Quran API returned', res.status);
      return [];
    }
    const data = await res.json();
    const radios = data.radios || [];
    console.log(`   Found ${radios.length} stations from MP3Quran`);

    return radios.map((r, i) => ({
      name: r.name.trim(),
      nameEn: r.name.trim(),
      nameTranslations: { ar: r.name.trim() },
      streamUrl: ensureHttps(r.url),
      category: inferCategory(r.name, ''),
      country: '',
      language: 'ar',
      isFeatured: false,
      order: 100 + i,
      tags: ['mp3quran'],
      source: 'mp3quran',
    }));
  } catch (err) {
    console.error('   MP3Quran fetch failed:', err.message);
    return [];
  }
}

async function fetchRadioBrowser() {
  console.log('📻 Fetching RadioBrowser API...');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const [quranRes, islamicRes] = await Promise.all([
      fetch(
        'https://de1.api.radio-browser.info/json/stations/bytag/quran?limit=200&order=votes&reverse=true&hidebroken=true',
        { signal: controller.signal }
      ),
      fetch(
        'https://de1.api.radio-browser.info/json/stations/bytag/islamic?limit=100&order=votes&reverse=true&hidebroken=true',
        { signal: controller.signal }
      ),
    ]);
    clearTimeout(timeout);

    const quranData = quranRes.ok ? await quranRes.json() : [];
    const islamicData = islamicRes.ok ? await islamicRes.json() : [];

    // Deduplicate by stationuuid
    const seen = new Set();
    const all = [...quranData, ...islamicData].filter((s) => {
      if (seen.has(s.stationuuid)) return false;
      seen.add(s.stationuuid);
      return s.lastcheckok === 1; // only working stations
    });

    console.log(`   Found ${all.length} stations from RadioBrowser`);

    return all.map((s, i) => ({
      name: s.name.trim(),
      nameEn: s.name.trim(),
      nameTranslations: { en: s.name.trim() },
      streamUrl: ensureHttps(s.url_resolved || s.url),
      category: inferCategory(s.name, s.tags || ''),
      country: s.countrycode || '',
      language: s.language || '',
      imageUrl: s.favicon || '',
      isFeatured: false,
      order: 500 + i,
      tags: s.tags ? s.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      source: 'radio_browser',
      codec: s.codec || '',
      bitrate: s.bitrate || 0,
      votes: s.votes || 0,
    }));
  } catch (err) {
    console.error('   RadioBrowser fetch failed:', err.message);
    return [];
  }
}

// ==================== Main Sync ====================

async function getExistingStreamUrls() {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const urls = new Set();
  snapshot.docs.forEach((d) => {
    const data = d.data();
    if (data.streamUrl) urls.add(data.streamUrl);
  });
  return urls;
}

function deduplicateByStreamUrl(stations) {
  const seen = new Map();
  for (const s of stations) {
    const key = s.streamUrl
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, s);
    }
  }
  return Array.from(seen.values());
}

async function sync() {
  console.log('🔍 Checking existing stations in Firestore...');
  const existingUrls = await getExistingStreamUrls();
  console.log(`   Found ${existingUrls.size} existing station(s)\n`);

  // Fetch from all sources
  const [mp3quranStations, radioBrowserStations] = await Promise.all([
    fetchMp3Quran(),
    fetchRadioBrowser(),
  ]);

  // Merge: curated first, then mp3quran, then radio_browser
  const allStations = [
    ...CURATED_STATIONS,
    ...mp3quranStations,
    ...radioBrowserStations,
  ];

  // Deduplicate by normalized stream URL
  const unique = deduplicateByStreamUrl(allStations);
  console.log(`\n📊 Total unique stations: ${unique.length}`);
  console.log(`   Curated: ${CURATED_STATIONS.length}`);
  console.log(`   MP3Quran: ${mp3quranStations.length}`);
  console.log(`   RadioBrowser: ${radioBrowserStations.length}\n`);

  let added = 0;
  let skipped = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < unique.length; i++) {
    const station = unique[i];

    // Skip if already in Firestore
    if (existingUrls.has(station.streamUrl)) {
      skipped++;
      continue;
    }

    // Skip empty/invalid URLs
    if (!station.streamUrl || station.streamUrl.length < 10) {
      failed++;
      continue;
    }

    try {
      // Generate a stable document ID
      const id = `${station.source}_${makeDocId(station.nameEn || station.name)}_${i}`;

      const docData = {
        name: station.name,
        nameEn: station.nameEn || station.name,
        nameTranslations: station.nameTranslations || {},
        streamUrl: station.streamUrl,
        category: station.category,
        country: station.country || '',
        language: station.language || 'ar',
        imageUrl: station.imageUrl || '',
        tags: station.tags || [],
        order: station.order,
        isActive: true,
        isHidden: false,
        isFeatured: station.isFeatured || false,
        source: station.source,
        codec: station.codec || '',
        bitrate: station.bitrate || 0,
        votes: station.votes || 0,
        addedBy: 'sync_script',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, COLLECTION, id), docData);
      added++;

      if (added % 20 === 0 || added <= 5) {
        console.log(`✅ Added station ${added}: ${station.name}`);
      }
    } catch (err) {
      console.error(`❌ Failed: ${station.name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 Sync Complete!`);
  console.log(`   Added:   ${added}`);
  console.log(`   Skipped: ${skipped} (already in Firestore)`);
  console.log(`   Failed:  ${failed}`);
  console.log(`   Total:   ${unique.length}`);
  console.log(`${'═'.repeat(50)}`);
  process.exit(0);
}

sync().catch((err) => {
  console.error('Sync script failed:', err);
  process.exit(1);
});
