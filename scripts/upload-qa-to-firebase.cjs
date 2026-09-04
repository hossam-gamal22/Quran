#!/usr/bin/env node
/**
 * Uploads the bilingual (ar + en) Q&A content to Firestore at qaContent/main.
 *
 * This is the SAME document the app reads in production and the admin panel
 * (QAManager) edits. It mirrors the local fallback in:
 *   - data/json/qa-data.json            (Arabic question/answer + audioUrl)
 *   - data/json/qa-translations-en.json (English category/question/answer)
 *
 * Regenerate those two files first (after editing answers) with:
 *   python3 scripts/gen-qa-content.py
 *
 * Then run this uploader from the functions/ folder (where firebase-admin lives):
 *   cd functions && node ../scripts/upload-qa-to-firebase.cjs
 *
 * Prerequisites:
 *   - firebase-admin installed (already in functions/)
 *   - Service account key at functions/serviceAccountKey.json
 *     (Firebase Console → Project Settings → Service Accounts → Generate new private key)
 *
 * ⚠️  This REPLACES the categories/questions array in qaContent/main.
 *     Any category or question added only in the admin panel (and not present in the
 *     two JSON files above) will be removed. The existing version number is preserved
 *     and incremented so the app's cache invalidates.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ─── Init Firebase Admin ─────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const serviceAccountPath = path.join(ROOT, 'functions/serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Missing service account key at:', serviceAccountPath);
  console.error('   Download from: Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const dbAdmin = admin.firestore();

// ─── Load source data ────────────────────────────────────────────────────────

const qaData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/json/qa-data.json'), 'utf-8'));
const qaEn = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/json/qa-translations-en.json'), 'utf-8'));

// ─── Build the bilingual document ────────────────────────────────────────────

function buildCategories() {
  const nowIso = new Date().toISOString();
  return qaData.categories.map((cat, idx) => ({
    id: cat.id,
    name: { ar: cat.name, en: qaEn.categories[cat.id] || cat.name },
    icon: cat.image || '',
    order: idx,
    isVisible: true,
    questions: (qaData.items[cat.id] || []).map((item, qIdx) => ({
      id: item.id,
      question: { ar: item.question, en: qaEn.questions[item.id] || item.question },
      answer: { ar: item.answer, en: qaEn.answers[item.id] || item.answer },
      audioUrl: item.audioUrl || '',
      order: qIdx,
      isVisible: true,
      updatedAt: nowIso,
    })),
  }));
}

async function main() {
  const ref = dbAdmin.doc('qaContent/main');
  const snap = await ref.get();
  const prevVersion = snap.exists ? Number((snap.data() || {}).version || 0) : 0;

  const categories = buildCategories();
  const totalQuestions = categories.reduce((s, c) => s + c.questions.length, 0);

  await ref.set({
    categories,
    lastUpdated: new Date().toISOString(),
    version: prevVersion + 1,
  });

  console.log('✅ Uploaded qaContent/main');
  console.log(`   ${categories.length} categories • ${totalQuestions} questions (ar + en)`);
  console.log(`   version ${prevVersion} → ${prevVersion + 1}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Upload failed:', e);
    process.exit(1);
  });
