#!/usr/bin/env node
/**
 * Normalize seasonal banner copy in Firestore for both old and new app builds.
 *
 * Old builds read seasonal copy directly from Firestore:
 * - seasonalContent/{doc}.titleAr/contentAr/translations.title_ar/content_ar
 * - appContent/seasonsMetadata.seasons.{season}.greetings
 * - config/app-settings.welcomeBanner when a manual welcome banner is active
 *
 * Usage:
 *   node scripts/normalize-seasonal-banner-copy.js          # dry run
 *   node scripts/normalize-seasonal-banner-copy.js --apply  # write changes
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');

const SEASON_COPY = {
  ramadan: {
    title: 'رمضان المبارك',
    subtitle: 'شهر الصيام والقيام وتلاوة القرآن',
  },
  hajj: {
    title: 'موسم الحج',
    subtitle: 'الركن الخامس من أركان الإسلام',
  },
  dhul_hijjah: {
    title: 'العشر الأوائل من ذي الحجة',
    subtitle: 'أفضل أيام الدنيا — فأكثروا من العمل الصالح',
  },
  mawlid: {
    title: 'ذكرى المولد النبوي',
    subtitle: 'صلوا على النبي ﷺ',
  },
  ashura: {
    title: 'عاشوراء',
    subtitle: 'صيامه يكفر سنة ماضية',
  },
  eid_fitr: {
    title: 'عيد الفطر المبارك',
    subtitle: 'كل عام وأنتم بخير — تقبل الله طاعتكم',
  },
  eid_adha: {
    title: 'عيد الأضحى المبارك',
    subtitle: 'تقبل الله منا ومنكم صالح الأعمال',
  },
  muharram: {
    title: 'شهر محرم',
    subtitle: 'أول شهور السنة الهجرية',
  },
  rajab: {
    title: 'شهر رجب',
    subtitle: 'من الأشهر الحرم — أعظِم فيه الطاعة',
  },
  shaban: {
    title: 'شهر شعبان',
    subtitle: 'اللهم بلِّغنا رمضان',
  },
};

function findCredentialFile() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const candidates = [
    path.join(__dirname, '..', 'credentials', 'firebase-admin.json'),
    ...fs.readdirSync(path.join(__dirname, '..', 'credentials'), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && entry.name.includes('firebase-adminsdk'))
      .map((entry) => path.join(__dirname, '..', 'credentials', entry.name)),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function initFirestore() {
  const credentialPath = findCredentialFile();
  if (!credentialPath) {
    console.error('No Firebase service account found. Set GOOGLE_APPLICATION_CREDENTIALS or add credentials/firebase-admin.json.');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log(`Using credentials: ${credentialPath}`);
  console.log(APPLY ? 'APPLY mode: Firestore will be updated.' : 'DRY RUN: no writes will be made.');
  return admin.firestore();
}

function detectSeasonFromBanner(banner = {}) {
  if (banner.seasonKey && SEASON_COPY[banner.seasonKey]) return banner.seasonKey;
  const text = [
    banner.title,
    banner.subtitle,
    banner.titles?.ar,
    banner.subtitles?.ar,
  ].filter(Boolean).join(' ');

  if (text.includes('عيد الأضحى') || text.includes('أضحى')) return 'eid_adha';
  if (text.includes('عيد الفطر')) return 'eid_fitr';
  if (text.includes('العشر') || text.includes('ذي الحجة') || text.includes('ذو الحجة')) return 'dhul_hijjah';
  if (text.includes('رمضان')) return 'ramadan';
  if (text.includes('موسم الحج')) return 'hajj';
  if (text.includes('المولد')) return 'mawlid';
  if (text.includes('عاشوراء')) return 'ashura';
  if (text.includes('محرم')) return 'muharram';
  if (text.includes('رجب')) return 'rajab';
  if (text.includes('شعبان')) return 'shaban';
  return null;
}

function setIfChanged(patch, pathParts, current, next) {
  if (current === next) return false;
  let target = patch;
  for (let i = 0; i < pathParts.length - 1; i += 1) {
    const key = pathParts[i];
    target[key] = target[key] || {};
    target = target[key];
  }
  target[pathParts[pathParts.length - 1]] = next;
  return true;
}

async function normalizeSeasonalContent(db) {
  const snap = await db.collection('seasonalContent').get();
  let changedDocs = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const copy = SEASON_COPY[data.seasonType];
    if (!copy) continue;

    const patch = {};
    let changed = false;
    changed = setIfChanged(patch, ['titleAr'], data.titleAr, copy.title) || changed;
    changed = setIfChanged(patch, ['contentAr'], data.contentAr, copy.subtitle) || changed;
    changed = setIfChanged(patch, ['translations', 'title_ar'], data.translations?.title_ar, copy.title) || changed;
    changed = setIfChanged(patch, ['translations', 'content_ar'], data.translations?.content_ar, copy.subtitle) || changed;

    if (!changed) continue;
    changedDocs += 1;
    console.log(`seasonalContent/${docSnap.id} (${data.seasonType})`);
    console.log(`  titleAr:   ${data.titleAr || '(empty)'} -> ${copy.title}`);
    console.log(`  contentAr: ${data.contentAr || '(empty)'} -> ${copy.subtitle}`);

    if (APPLY) {
      await docSnap.ref.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
    }
  }

  console.log(`seasonalContent changed docs: ${changedDocs}`);
}

async function normalizeSeasonsMetadata(db) {
  const ref = db.collection('appContent').doc('seasonsMetadata');
  const snap = await ref.get();
  if (!snap.exists) {
    console.log('appContent/seasonsMetadata: missing');
    return;
  }

  const data = snap.data();
  const seasons = data.seasons || {};
  const patch = { seasons: {} };
  let changedCount = 0;

  for (const [season, copy] of Object.entries(SEASON_COPY)) {
    if (!seasons[season]) continue;
    const seasonPatch = {};
    let changed = false;
    changed = setIfChanged(seasonPatch, ['nameAr'], seasons[season].nameAr, copy.title) || changed;
    changed = setIfChanged(seasonPatch, ['description'], seasons[season].description, copy.subtitle) || changed;
    const nextGreetings = [copy.subtitle];
    const currentGreetings = JSON.stringify(seasons[season].greetings || []);
    if (currentGreetings !== JSON.stringify(nextGreetings)) {
      seasonPatch.greetings = nextGreetings;
      changed = true;
    }
    if (!changed) continue;
    patch.seasons[season] = { ...seasons[season], ...seasonPatch };
    changedCount += 1;
    console.log(`appContent/seasonsMetadata.seasons.${season}`);
  }

  if (changedCount > 0 && APPLY) {
    await ref.set({ seasons: { ...seasons, ...patch.seasons }, updatedAt: new Date().toISOString() }, { merge: true });
  }
  console.log(`seasonsMetadata changed seasons: ${changedCount}`);
}

async function normalizeWelcomeBanner(db) {
  const ref = db.collection('config').doc('app-settings');
  const snap = await ref.get();
  if (!snap.exists) {
    console.log('config/app-settings: missing');
    return;
  }

  const data = snap.data();
  const banner = data.welcomeBanner;
  if (!banner) {
    console.log('config/app-settings.welcomeBanner: missing');
    return;
  }

  const season = detectSeasonFromBanner(banner);
  const copy = season ? SEASON_COPY[season] : null;
  if (!copy) {
    console.log('config/app-settings.welcomeBanner: no known season detected');
    return;
  }

  const nextBanner = {
    ...banner,
    seasonKey: season,
    title: copy.title,
    subtitle: copy.subtitle,
    titles: { ...(banner.titles || {}), ar: copy.title },
    subtitles: { ...(banner.subtitles || {}), ar: copy.subtitle },
  };

  if (JSON.stringify(nextBanner) === JSON.stringify(banner)) {
    console.log(`config/app-settings.welcomeBanner (${season}): already normalized`);
    return;
  }

  console.log(`config/app-settings.welcomeBanner (${season})`);
  console.log(`  title:    ${banner.title || '(empty)'} -> ${copy.title}`);
  console.log(`  subtitle: ${banner.subtitle || '(empty)'} -> ${copy.subtitle}`);

  if (APPLY) {
    await ref.set({ welcomeBanner: nextBanner }, { merge: true });
  }
}

async function main() {
  const db = initFirestore();
  await normalizeSeasonalContent(db);
  await normalizeSeasonsMetadata(db);
  await normalizeWelcomeBanner(db);
  console.log(APPLY ? 'Done. Firestore normalized.' : 'Done. Dry run only. Re-run with --apply to write.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
