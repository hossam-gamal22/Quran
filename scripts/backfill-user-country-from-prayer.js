// scripts/backfill-user-country-from-prayer.js
// One-time backfill: for users whose `countrySource` is `device_locale` (or empty)
// and who have GPS coordinates stored from prayer times, reverse-geocode to
// determine the real country, then update Firestore so the admin panel matches
// the app's prayer-times location.
//
// SAFETY:
//  - NEVER overwrites users whose `countrySource` is `admin` or `prayer_location`
//    (those are higher-priority sources).
//  - DRY-RUN by default. Pass `--write` to actually update Firestore.
//
// Usage:
//   node scripts/backfill-user-country-from-prayer.js           # dry run
//   node scripts/backfill-user-country-from-prayer.js --write   # apply changes
//
// Requires Nominatim public endpoint (1 req/sec rate limit per their ToS).

const { initializeApp, getApps, getApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyAojqduIulMDaUVTjtrtL2tIE5q_NwOH1A',
  authDomain: 'rooh-almuslim.firebaseapp.com',
  projectId: 'rooh-almuslim',
  storageBucket: 'rooh-almuslim.firebasestorage.app',
  messagingSenderId: '328160076358',
  appId: '1:328160076358:web:fe5ec8e8b07355f1c06047',
};

const WRITE = process.argv.includes('--write');
const RATE_LIMIT_MS = 1100; // Nominatim ToS: max 1 request/sec

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&accept-language=en`,
      { headers: { 'User-Agent': 'RuhAlMuslim-Backfill/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      city:
        data?.address?.city ||
        data?.address?.town ||
        data?.address?.village ||
        data?.address?.state ||
        '',
      countryCode: (data?.address?.country_code || '').toUpperCase(),
    };
  } catch (e) {
    console.warn('  ! reverseGeocode failed:', e.message);
    return null;
  }
}

async function main() {
  console.log(`\n🌍 Country backfill starting (mode: ${WRITE ? 'WRITE' : 'DRY-RUN'})\n`);

  const snap = await getDocs(collection(db, 'users'));
  console.log(`Loaded ${snap.size} user documents.\n`);

  let candidates = 0;
  let skippedAdminOrPrayerLoc = 0;
  let skippedNoCoords = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    const source = data.countrySource || '';

    // Respect higher-priority sources
    if (source === 'admin' || source === 'prayer_location') {
      skippedAdminOrPrayerLoc++;
      continue;
    }

    // Need coordinates to reverse-geocode. Many users only have country (locale)
    // and no coords stored on the user doc — those need the in-app reconciliation
    // path (which runs weekly when GPS permission is granted).
    const lat = typeof data.prayerLatitude === 'number' ? data.prayerLatitude : null;
    const lon = typeof data.prayerLongitude === 'number' ? data.prayerLongitude : null;
    if (lat === null || lon === null) {
      skippedNoCoords++;
      continue;
    }

    candidates++;
    console.log(`→ ${id} (current: ${data.country || 'none'} / ${source || 'none'})`);

    const geo = await reverseGeocode(lat, lon);
    await sleep(RATE_LIMIT_MS); // ToS rate limit

    if (!geo || !geo.countryCode) {
      console.log('  ! no geocode result');
      failed++;
      continue;
    }

    if (geo.countryCode === (data.country || '').toUpperCase() && source === 'prayer_location') {
      console.log(`  = unchanged (${geo.countryCode})`);
      unchanged++;
      continue;
    }

    console.log(`  ✓ ${data.country || 'none'} → ${geo.countryCode} (${geo.city || '-'})`);

    if (WRITE) {
      try {
        await updateDoc(doc(db, 'users', id), {
          country: geo.countryCode,
          countrySource: 'prayer_location',
          prayerCity: geo.city || data.prayerCity || '',
          updatedAt: serverTimestamp(),
          lastLocationUpdate: serverTimestamp(),
        });
        updated++;
      } catch (e) {
        console.warn('  ! write failed:', e.message);
        failed++;
      }
    } else {
      updated++; // count as "would update"
    }
  }

  console.log('\n──────── Summary ────────');
  console.log(`Candidates inspected:        ${candidates}`);
  console.log(`Skipped (admin/prayer_loc):  ${skippedAdminOrPrayerLoc}`);
  console.log(`Skipped (no coords):         ${skippedNoCoords}`);
  console.log(`${WRITE ? 'Updated' : 'Would update'}:               ${updated}`);
  console.log(`Already correct:             ${unchanged}`);
  console.log(`Failed:                      ${failed}`);
  console.log(WRITE ? '\n✅ Done.\n' : '\n💡 Re-run with --write to apply.\n');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
