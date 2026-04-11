#!/usr/bin/env node
/**
 * scripts/sync-sounds.js
 * سكريبت مزامنة أصوات الإشعارات من Firebase
 * 
 * يقوم هذا السكريبت بـ:
 * 1. تحميل الأصوات المعلقة من Firebase Storage
 * 2. حفظها في مجلد assets/sounds/
 * 3. تحديث ملف app.json بمسارات الأصوات الجديدة
 * 4. تحديث حالة الأصوات في Firestore من 'pending' إلى 'bundled'
 * 
 * استخدم قبل: eas build
 * الأمر: pnpm run sync-sounds
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ==================== Configuration ====================

const SOUNDS_DIR = path.join(__dirname, '..', 'assets', 'sounds');
const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'credentials', 'firebase-admin.json');

const FIRESTORE_CONFIG_DOC = 'appConfig/soundConfig';
const FIRESTORE_UPLOADED_COLLECTION = 'uploadedSounds';

// ==================== Initialize Firebase Admin ====================

let db, storage;

function initializeFirebase() {
  try {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      console.error('❌ ملف بيانات اعتماد Firebase غير موجود:', SERVICE_ACCOUNT_PATH);
      console.log('📝 قم بتحميل ملف service account من Firebase Console');
      console.log('   Settings > Service accounts > Generate new private key');
      process.exit(1);
    }

    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });

    db = admin.firestore();
    storage = admin.storage().bucket();
    
    console.log('✅ تم تهيئة Firebase بنجاح');
  } catch (error) {
    console.error('❌ فشل تهيئة Firebase:', error.message);
    process.exit(1);
  }
}

// ==================== Download File ====================

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

// ==================== Download from Storage ====================

async function downloadFromStorage(storagePath, destPath) {
  try {
    const file = storage.file(storagePath);
    await file.download({ destination: destPath });
    return true;
  } catch (error) {
    console.error(`❌ فشل تحميل ${storagePath}:`, error.message);
    return false;
  }
}

// ==================== Main Sync Function ====================

async function syncSounds() {
  console.log('\n🔄 بدء مزامنة أصوات الإشعارات...\n');

  // Ensure directory exists
  if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true });
    console.log(`📁 تم إنشاء المجلد: ${path.relative(process.cwd(), SOUNDS_DIR)}`);
  }

  // Get pending sounds from Firestore
  const uploadedSnapshot = await db.collection(FIRESTORE_UPLOADED_COLLECTION)
    .where('status', '==', 'pending')
    .get();

  if (uploadedSnapshot.empty) {
    console.log('✨ لا توجد أصوات معلقة للتحميل\n');
    return;
  }

  console.log(`📥 تم العثور على ${uploadedSnapshot.size} صوت معلق\n`);

  const downloadedSounds = [];

  for (const doc of uploadedSnapshot.docs) {
    const sound = { id: doc.id, ...doc.data() };
    // Generate safe filename
    const ext = path.extname(sound.fileName) || '.mp3';
    const safeId = sound.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeId}${ext}`;
    const destPath = path.join(SOUNDS_DIR, fileName);

    console.log(`⬇️  تحميل: ${sound.displayName}`);
    
    // Try storage path first, then URL
    let success = false;
    if (sound.storagePath) {
      success = await downloadFromStorage(sound.storagePath, destPath);
    }
    
    if (!success && sound.downloadUrl) {
      try {
        await downloadFile(sound.downloadUrl, destPath);
        success = true;
      } catch (err) {
        console.error(`   ❌ فشل:`, err.message);
      }
    }

    if (success) {
      console.log(`   ✅ تم: ${fileName}`);
      
      // Update Firestore status
      await doc.ref.update({
        status: 'bundled',
        bundledFileName: fileName,
        bundledAt: new Date().toISOString()
      });

      downloadedSounds.push({
        id: safeId,
        displayName: sound.displayName,
        category: sound.category,
        fileName: fileName,
        assetPath: `./assets/sounds/${fileName}`
      });
    }
  }

  if (downloadedSounds.length === 0) {
    console.log('\n⚠️  لم يتم تحميل أي ملفات\n');
    return;
  }

  // Update app.json
  console.log('\n📝 تحديث app.json...');
  
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  
  // Find expo-notifications plugin
  const plugins = appJson.expo?.plugins || [];
  const notifPluginIndex = plugins.findIndex(p => 
    Array.isArray(p) && p[0] === 'expo-notifications'
  );

  if (notifPluginIndex === -1) {
    console.error('❌ لم يتم العثور على plugin expo-notifications في app.json');
    return;
  }

  const pluginConfig = plugins[notifPluginIndex][1] || {};
  const existingSounds = pluginConfig.sounds || [];

  // Add new sounds (avoid duplicates)
  const existingPaths = new Set(existingSounds);
  let addedCount = 0;

  for (const sound of downloadedSounds) {
    if (!existingPaths.has(sound.assetPath)) {
      existingSounds.push(sound.assetPath);
      existingPaths.add(sound.assetPath);
      addedCount++;
    }
  }

  pluginConfig.sounds = existingSounds;
  plugins[notifPluginIndex][1] = pluginConfig;
  appJson.expo.plugins = plugins;

  // Write updated app.json
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2) + '\n');

  console.log(`✅ تمت إضافة ${addedCount} صوت جديد إلى app.json`);

  // Update soundConfig in Firestore
  console.log('\n📊 تحديث إعدادات الأصوات في Firestore...');
  
  const configRef = db.doc(FIRESTORE_CONFIG_DOC);
  const configSnap = await configRef.get();
  
  if (configSnap.exists) {
    const config = configSnap.data();
    const bundledSounds = config.bundledSounds || [];

    for (const sound of downloadedSounds) {
      // Check if already exists
      const existingIndex = bundledSounds.findIndex(s => s.id === sound.id);
      const newSound = {
        id: sound.id,
        displayName: sound.displayName,
        category: sound.category,
        assetPath: sound.assetPath,
        enabled: true,
        order: bundledSounds.length + 1
      };

      if (existingIndex >= 0) {
        bundledSounds[existingIndex] = { ...bundledSounds[existingIndex], ...newSound };
      } else {
        bundledSounds.push(newSound);
      }
    }

    await configRef.update({
      bundledSounds,
      updatedAt: new Date().toISOString(),
      version: admin.firestore.FieldValue.increment(1)
    });

    console.log('✅ تم تحديث قائمة الأصوات المدمجة');
  }

  console.log('\n✨ اكتملت المزامنة بنجاح!\n');
  console.log('📌 الخطوة التالية: قم ببناء التطبيق باستخدام:');
  console.log('   eas build --platform android');
  console.log('   eas build --platform ios\n');
}

// ==================== Run ====================

initializeFirebase();
syncSounds().catch(err => {
  console.error('\n❌ حدث خطأ:', err);
  process.exit(1);
});
