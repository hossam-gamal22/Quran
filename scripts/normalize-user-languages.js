#!/usr/bin/env node
/**
 * scripts/normalize-user-languages.js
 *
 * One-time migration: normalize `users/{id}.language` to one of the 12
 * supported app languages, so admin notification targeting hits the right
 * audience.
 *
 * Why: until this commit, `registerUser` wrote `locales[0].languageCode` raw
 * from the device into Firestore. That produced values the app never actually
 * shows — e.g. `ars` (Najdi Arabic), `in` (legacy ISO for Indonesian), `zh`
 * (Chinese, not supported), `nl` (Dutch, not supported), and locale variants
 * like `ar-SA`. None of these match the 12-language enum the admin panel
 * filters on.
 *
 * Strategy:
 *   - Strip locale region: `ar-SA` → `ar`
 *   - Legacy / dialect codes → closest supported:
 *       `ars`, `arb` → `ar`
 *       `in`         → `id`
 *       `iw`         → `en`  (Hebrew legacy code, not supported)
 *       `ji`         → `en`  (Yiddish legacy)
 *   - Already-supported codes → unchanged
 *   - Anything else (zh, nl, pt, …) → `'ar'` (app default).
 *     The next app open will overwrite this from the user's actual in-app
 *     language choice via `setLanguage()` → `updateUserLanguage()`.
 *
 * Usage:
 *   node scripts/normalize-user-languages.js          # dry run, prints plan
 *   node scripts/normalize-user-languages.js --apply  # actually writes
 *
 * Requires: credentials/firebase-admin.json (Firebase service account).
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'credentials', 'firebase-admin.json');
const APPLY = process.argv.includes('--apply');

const SUPPORTED = new Set([
  'ar', 'en', 'fr', 'de', 'es', 'tr', 'ur', 'id', 'ms', 'hi', 'bn', 'ru',
]);

const DIRECT_MAP = {
  ars: 'ar',
  arb: 'ar',
  in: 'id',
  iw: 'en',
  ji: 'en',
};

const APP_DEFAULT = 'ar';

function normalize(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return APP_DEFAULT;
  const lower = raw.trim().toLowerCase();
  if (SUPPORTED.has(lower)) return lower;
  if (DIRECT_MAP[lower]) return DIRECT_MAP[lower];
  const prefix = lower.split(/[-_]/)[0];
  if (SUPPORTED.has(prefix)) return prefix;
  if (DIRECT_MAP[prefix]) return DIRECT_MAP[prefix];
  return APP_DEFAULT;
}

function init() {
  // Prefer explicit GOOGLE_APPLICATION_CREDENTIALS, then repo-local file.
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const candidate = envPath && fs.existsSync(envPath)
    ? envPath
    : (fs.existsSync(SERVICE_ACCOUNT_PATH) ? SERVICE_ACCOUNT_PATH : null);
  if (!candidate) {
    console.error('❌ No Firebase service account found.');
    console.error('   Provide one of:');
    console.error('     • credentials/firebase-admin.json   (repo-relative)');
    console.error('     • GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json');
    console.error('   Download from Firebase Console → Settings → Service accounts.');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(candidate, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log(`🔑 Using credentials: ${candidate}`);
  return admin.firestore();
}

async function main() {
  const db = init();
  console.log(APPLY ? '🚀 APPLY mode — writes will be committed' : '🔍 DRY RUN — no writes');
  console.log('');

  const snap = await db.collection('users').get();
  const fromCounts = {};
  const toCounts = {};
  const changes = [];

  snap.forEach((doc) => {
    const data = doc.data();
    const before = data.language;
    const after = normalize(before);
    const fromKey = before == null ? '(empty)' : String(before);
    fromCounts[fromKey] = (fromCounts[fromKey] || 0) + 1;
    if (after !== before) {
      changes.push({ id: doc.id, before: fromKey, after });
      toCounts[after] = (toCounts[after] || 0) + 1;
    }
  });

  console.log(`📊 Scanned ${snap.size} users`);
  console.log('');
  console.log('Current distribution:');
  Object.entries(fromCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([lang, count]) => console.log(`   ${lang.padEnd(12)} ${count}`));
  console.log('');
  console.log(`Plan: update ${changes.length} users`);
  if (changes.length > 0) {
    console.log('Migration map:');
    const pairs = {};
    changes.forEach(({ before, after }) => {
      const key = `${before} → ${after}`;
      pairs[key] = (pairs[key] || 0) + 1;
    });
    Object.entries(pairs)
      .sort((a, b) => b[1] - a[1])
      .forEach(([pair, count]) => console.log(`   ${pair.padEnd(20)} ${count}`));
  }
  console.log('');

  if (!APPLY) {
    console.log('Re-run with --apply to commit changes.');
    return;
  }
  if (changes.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let committed = 0;
  for (let i = 0; i < changes.length; i += 400) {
    const batch = db.batch();
    const slice = changes.slice(i, i + 400);
    slice.forEach(({ id, after }) => {
      batch.update(db.collection('users').doc(id), {
        language: after,
        languageMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    committed += slice.length;
    console.log(`   committed ${committed}/${changes.length}`);
  }
  console.log(`✅ Done. Updated ${committed} users.`);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
