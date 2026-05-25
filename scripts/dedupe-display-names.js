#!/usr/bin/env node
/**
 * scripts/dedupe-display-names.js
 *
 * Two-in-one migration:
 *   1) Backfill `displayNameLower` (normalized, case-insensitive) on every user
 *      that has a `displayName`. Needed so the in-app duplicate-check query
 *      `where('displayNameLower', '==', ...)` can see legacy users.
 *
 *   2) Resolve existing duplicates by deleting the unverified copies, keeping
 *      the user whose prayer location is verified (GPS-confirmed). Rule:
 *        • If exactly one user in the group is verified → delete the rest.
 *        • If multiple verified → leave them all (admin review).
 *        • If none verified → leave them all (admin review).
 *      "Verified" = prayerCountryCode set OR countrySource='gps' OR
 *      locationLatitude/locationLongitude set.
 *
 * Usage:
 *   node scripts/dedupe-display-names.js          # dry run
 *   node scripts/dedupe-display-names.js --apply  # commit changes
 *
 * Requires: credentials/firebase-admin.json or GOOGLE_APPLICATION_CREDENTIALS.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'credentials', 'firebase-admin.json');
const APPLY = process.argv.includes('--apply');

function normalize(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .normalize('NFD')
    .replace(/[̀-ًͯ-ٰٟۖ-ۭ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hasVerifiedLocation(data) {
  if (typeof data.prayerCountryCode === 'string' && data.prayerCountryCode.trim()) return true;
  if (data.countrySource === 'gps') return true;
  if (typeof data.locationLatitude === 'number' || typeof data.locationLongitude === 'number') return true;
  if (data.locationUpdatedAt) return true;
  return false;
}

function init() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const candidate = envPath && fs.existsSync(envPath)
    ? envPath
    : (fs.existsSync(SERVICE_ACCOUNT_PATH) ? SERVICE_ACCOUNT_PATH : null);
  if (!candidate) {
    console.error('❌ No Firebase service account found.');
    console.error('   Provide credentials/firebase-admin.json or GOOGLE_APPLICATION_CREDENTIALS.');
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
  const users = [];
  snap.forEach((doc) => users.push({ id: doc.id, data: doc.data() }));
  console.log(`📊 Scanned ${users.length} users`);

  // ───────── PHASE 1: backfill displayNameLower ─────────
  const backfills = [];
  for (const u of users) {
    if (u.data.placeholder) continue;
    if (!u.data.displayName || typeof u.data.displayName !== 'string') continue;
    const lower = normalize(u.data.displayName);
    if (!lower) continue;
    if (u.data.displayNameLower === lower) continue;
    backfills.push({ id: u.id, lower });
  }
  console.log(`\nPhase 1 — backfill displayNameLower: ${backfills.length} users to update`);

  // ───────── PHASE 2: detect duplicates ─────────
  const groups = new Map();
  for (const u of users) {
    if (u.data.placeholder) continue;
    if (!u.data.displayName) continue;
    const key = normalize(u.data.displayName);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(u);
  }

  const duplicateGroups = [];
  for (const [key, list] of groups.entries()) {
    if (list.length <= 1) continue;
    duplicateGroups.push({ key, list });
  }
  console.log(`\nPhase 2 — duplicate groups: ${duplicateGroups.length}`);

  const toDelete = [];
  const ambiguous = []; // groups we can't auto-resolve
  for (const g of duplicateGroups) {
    const verified = g.list.filter((u) => hasVerifiedLocation(u.data));
    const unverified = g.list.filter((u) => !hasVerifiedLocation(u.data));
    if (verified.length === 1 && unverified.length >= 1) {
      // Delete all unverified, keep the one verified
      unverified.forEach((u) => toDelete.push({ id: u.id, name: u.data.displayName, reason: 'duplicate-of-verified-user', keptId: verified[0].id }));
    } else {
      ambiguous.push({ key: g.key, count: g.list.length, verified: verified.length, unverified: unverified.length, members: g.list.map((u) => ({ id: u.id, name: u.data.displayName, verified: hasVerifiedLocation(u.data) })) });
    }
  }

  console.log(`\n  Auto-resolvable:  ${toDelete.length} users will be deleted`);
  console.log(`  Ambiguous (need manual review): ${ambiguous.length} groups`);

  if (ambiguous.length > 0) {
    console.log('\n  Sample ambiguous groups (top 5):');
    ambiguous.slice(0, 5).forEach((g) => {
      console.log(`    "${g.key}" — total=${g.count}, verified=${g.verified}, unverified=${g.unverified}`);
      g.members.forEach((m) => console.log(`      • ${m.id} "${m.name}" verified=${m.verified}`));
    });
  }

  if (toDelete.length > 0) {
    console.log('\n  Sample auto-deletions (top 5):');
    toDelete.slice(0, 5).forEach((d) => {
      console.log(`    delete ${d.id} "${d.name}" → keep ${d.keptId}`);
    });
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to commit.');
    return;
  }

  // ───────── EXECUTE ─────────
  console.log('\n🚀 Committing...');

  // 1) Backfill
  let backfilled = 0;
  for (let i = 0; i < backfills.length; i += 400) {
    const batch = db.batch();
    const slice = backfills.slice(i, i + 400);
    slice.forEach(({ id, lower }) => {
      batch.update(db.collection('users').doc(id), {
        displayNameLower: lower,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    backfilled += slice.length;
    console.log(`   backfilled ${backfilled}/${backfills.length}`);
  }

  // 2) Delete unverified duplicates (mark as placeholder + mergedInto so the
  //    app on those devices gracefully redirects, then delete the doc itself).
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 400) {
    const batch = db.batch();
    const slice = toDelete.slice(i, i + 400);
    slice.forEach(({ id, keptId }) => {
      const ref = db.collection('users').doc(id);
      // Tombstone so any future app session on this device knows to redirect.
      batch.set(ref, {
        placeholder: true,
        mergedInto: keptId,
        mergedAt: admin.firestore.FieldValue.serverTimestamp(),
        mergeReason: 'duplicate-displayname-cleanup',
        displayName: admin.firestore.FieldValue.delete(),
        displayNameLower: admin.firestore.FieldValue.delete(),
        fcmToken: admin.firestore.FieldValue.delete(),
        pushTokenInvalid: true,
      }, { merge: true });
    });
    await batch.commit();
    deleted += slice.length;
    console.log(`   deleted (tombstoned) ${deleted}/${toDelete.length}`);
  }

  console.log(`\n✅ Done. Backfilled: ${backfilled}, Tombstoned duplicates: ${deleted}, Ambiguous (kept): ${ambiguous.length}`);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
