#!/usr/bin/env node
/**
 * Force-flush stale `remoteStrings` cache on user devices.
 *
 * Root cause: at some point, `translations/{lang}` docs contained placeholder
 * strings (e.g. `tasbih.virtue10 = "Virtuetasbih default 10"`). The mobile app
 * cached those into AsyncStorage. The Firestore docs were later deleted, but
 * the AsyncStorage cache persisted — so users still see the placeholders.
 *
 * Fix: write a fresh `translations/{lang}` doc with empty strings and a high
 * `version`. The app's background fetch compares `data.version` with the
 * cached version and overwrites cache when the remote is newer. After this
 * sync, `getRemoteTranslation()` returns null for all keys, and `t()` falls
 * through to the bundled translations baked into the app.
 *
 * Safe to run because: a separate scan confirmed there are currently no real
 * overrides stored in `translations/*` — only stale cache lives on devices.
 *
 * Users get the fix on next app launch (background fetch is non-blocking).
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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
const FLUSH_VERSION = 1_000_000;

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  console.log('🔐 Signing in anonymously...');
  await signInAnonymously(auth);

  console.log(`\n🧹 Writing empty cache-flush docs to ${COLLECTION}/{lang}...\n`);

  const now = new Date().toISOString();
  for (const lang of LANGS) {
    await setDoc(doc(db, COLLECTION, lang), {
      strings: {},
      version: FLUSH_VERSION,
      updatedAt: now,
      flushReason: 'placeholder-cleanup-2026-05',
    });
    console.log(`  ${lang}: written (version ${FLUSH_VERSION})`);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ ${LANGS.length} cache-flush docs written.`);
  console.log(`   Users will pick up the fix on next app launch.`);
  console.log(`   The app's background fetch will see version=${FLUSH_VERSION},`);
  console.log(`   overwrite stale cache with {}, and fall back to bundled translations.`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Flush failed:', err.message || err);
  console.error(err);
  process.exit(1);
});
