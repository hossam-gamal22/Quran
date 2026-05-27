#!/usr/bin/env node
/**
 * Clean placeholder translation values from Firestore.
 *
 * Bug: `translations/{lang}` docs contain auto-generated placeholder strings
 *      like "Virtuetasbih default 10" instead of real translations, which
 *      the published app shows to users.
 *
 * Fix: walk `strings` recursively, drop any string value matching the
 *      placeholder regex, write back with bumped version. The mobile app
 *      will pick up the change on next remote-translations fetch (~5 min
 *      cache TTL).
 *
 * Usage: node scripts/clean-placeholder-translations.mjs [--dry-run]
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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

const LANGS = ['ar', 'en', 'fr', 'de', 'es', 'tr', 'ur', 'id', 'ms', 'hi', 'bn', 'ru'];
const COLLECTION = 'translations';
const PLACEHOLDER_RE = /^(virtue|reference|benefit|title|subtitle|label|body)?[a-z]+(?:tasbih|azkar|dua|dhikr|daily|seasonal|prayer|quran|default)\s+default\s+\d+$/;

const dryRun = process.argv.includes('--dry-run');

function isPlaceholder(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase().replace(/[_-]/g, ' ');
  return PLACEHOLDER_RE.test(normalized);
}

function cleanRecursive(input, path = '') {
  const removed = [];
  const cleaned = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    const fullPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string') {
      if (isPlaceholder(value)) {
        removed.push({ path: fullPath, value });
        return;
      }
      cleaned[key] = value;
      return;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = cleanRecursive(value, fullPath);
      removed.push(...nested.removed);
      if (Object.keys(nested.cleaned).length > 0) {
        cleaned[key] = nested.cleaned;
      }
      return;
    }
    cleaned[key] = value;
  });
  return { cleaned, removed };
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  console.log('🔐 Signing in anonymously...');
  await signInAnonymously(auth);
  console.log(`   uid: ${auth.currentUser?.uid}`);

  console.log(`\n🔎 Scanning ${LANGS.length} language docs in '${COLLECTION}/'...\n`);

  let totalRemoved = 0;
  const summary = [];

  for (const lang of LANGS) {
    const ref = doc(db, COLLECTION, lang);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.log(`  ${lang}: (no doc — skip)`);
      continue;
    }
    const data = snap.data();
    const strings = data.strings || {};
    const { cleaned, removed } = cleanRecursive(strings);
    if (removed.length === 0) {
      console.log(`  ${lang}: clean ✅`);
      continue;
    }
    totalRemoved += removed.length;
    summary.push({ lang, removed: removed.length, samples: removed.slice(0, 3) });
    console.log(`  ${lang}: ${removed.length} placeholder(s) found`);
    removed.slice(0, 3).forEach(r => {
      console.log(`     - ${r.path} = "${r.value}"`);
    });
    if (removed.length > 3) console.log(`     ... +${removed.length - 3} more`);

    if (!dryRun) {
      await setDoc(ref, {
        ...data,
        strings: cleaned,
        version: (data.version || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
      console.log(`     → written back (version ${(data.version || 0) + 1})`);
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (totalRemoved === 0) {
    console.log(`✅ Firestore is clean — no placeholder values found.`);
  } else if (dryRun) {
    console.log(`⚠️  Dry run: would have removed ${totalRemoved} placeholder value(s).`);
    console.log(`   Re-run without --dry-run to apply.`);
  } else {
    console.log(`✅ Removed ${totalRemoved} placeholder value(s) across ${summary.length} language(s).`);
    console.log(`   Mobile apps will refresh within ~5 minutes (cache TTL).`);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Cleanup failed:', err.message || err);
  console.error(err);
  process.exit(1);
});
