#!/usr/bin/env npx ts-node
/**
 * Upload all azkar_authentic MP3 files to Firebase Storage.
 *
 * Usage (from project root):
 *   cd functions && npx ts-node ../scripts/upload-azkar-to-firebase.ts
 *
 * Prerequisites:
 *   - firebase-admin installed (already in functions/)
 *   - Service account key at functions/serviceAccountKey.json
 *     (download from Firebase Console → Project Settings → Service Accounts)
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ─── Config ──────────────────────────────────────────────────────────────────

const BUCKET_NAME = 'rooh-almuslim.firebasestorage.app';
const STORAGE_PREFIX = 'azkar_audio/';
const LOCAL_DIR = path.resolve(__dirname, '../assets/sounds/azkar_authentic');

// ─── Init Firebase Admin ─────────────────────────────────────────────────────

const serviceAccountPath = path.resolve(__dirname, '../functions/serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Missing service account key at:', serviceAccountPath);
  console.error('   Download from: Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
  storageBucket: BUCKET_NAME,
});

const bucket = admin.storage().bucket();

// ─── Upload ──────────────────────────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(LOCAL_DIR).filter(f => f.endsWith('.mp3')).sort();
  const total = files.length;
  console.log(`📂 Found ${total} MP3 files in ${LOCAL_DIR}`);
  console.log(`📤 Uploading to gs://${BUCKET_NAME}/${STORAGE_PREFIX}...\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const filename of files) {
    const remotePath = `${STORAGE_PREFIX}${filename}`;
    const localPath = path.join(LOCAL_DIR, filename);

    try {
      // Check if already uploaded
      const [exists] = await bucket.file(remotePath).exists();
      if (exists) {
        skipped++;
        process.stdout.write(`⏭️  ${uploaded + skipped + failed}/${total} — ${filename} (already exists)\r`);
        continue;
      }

      await bucket.upload(localPath, {
        destination: remotePath,
        metadata: {
          contentType: 'audio/mpeg',
          cacheControl: 'public, max-age=31536000', // 1 year cache
        },
      });

      uploaded++;
      process.stdout.write(`✅ ${uploaded + skipped + failed}/${total} — ${filename}\r`);
    } catch (err: any) {
      failed++;
      console.error(`\n❌ Failed: ${filename} — ${err.message}`);
    }
  }

  console.log('\n\n═══════════════════════════════════════');
  console.log(`✅ Uploaded: ${uploaded}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`📦 Total:    ${total}`);
  console.log('═══════════════════════════════════════');

  // Make all files publicly readable
  if (uploaded > 0) {
    console.log('\n🔓 Making files publicly accessible...');
    try {
      await bucket.makePublic({ prefix: STORAGE_PREFIX });
      console.log('✅ All azkar audio files are now public.');
    } catch {
      console.log('⚠️  Could not set public access. Files will still work via Firebase Storage download URLs.');
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
