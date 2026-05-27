#!/usr/bin/env node
/**
 * Normalize seasonal banner copy in Firestore using the active gcloud account.
 *
 * Usage:
 *   node scripts/normalize-seasonal-banner-copy-gcloud.js
 *   node scripts/normalize-seasonal-banner-copy-gcloud.js --apply
 */

const { execFileSync } = require('node:child_process');

const APPLY = process.argv.includes('--apply');
const PROJECT_ID = 'rooh-almuslim';

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

const SEASON_RANGES = {
  ramadan: { startDate: { month: 9, day: 1 }, endDate: { month: 9, day: 30 }, startDateText: '9-1', endDateText: '9-30' },
  hajj: { startDate: { month: 12, day: 8 }, endDate: { month: 12, day: 13 }, startDateText: '12-8', endDateText: '12-13' },
  dhul_hijjah: { startDate: { month: 12, day: 1 }, endDate: { month: 12, day: 9 }, startDateText: '12-1', endDateText: '12-9' },
  mawlid: { startDate: { month: 3, day: 12 }, endDate: { month: 3, day: 12 }, startDateText: '3-12', endDateText: '3-12' },
  ashura: { startDate: { month: 1, day: 9 }, endDate: { month: 1, day: 10 }, startDateText: '1-9', endDateText: '1-10' },
  eid_fitr: { startDate: { month: 10, day: 1 }, endDate: { month: 10, day: 3 }, startDateText: '10-1', endDateText: '10-3' },
  eid_adha: { startDate: { month: 12, day: 10 }, endDate: { month: 12, day: 13 }, startDateText: '12-10', endDateText: '12-13' },
  muharram: { startDate: { month: 1, day: 1 }, endDate: { month: 1, day: 30 }, startDateText: '1-1', endDateText: '1-30' },
  rajab: { startDate: { month: 7, day: 1 }, endDate: { month: 7, day: 30 }, startDateText: '7-1', endDateText: '7-30' },
  shaban: { startDate: { month: 8, day: 1 }, endDate: { month: 8, day: 30 }, startDateText: '8-1', endDateText: '8-30' },
};

function getAccessToken() {
  return execFileSync('gcloud', ['auth', 'print-access-token'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function fromFirestoreValue(value) {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) {
    const out = {};
    for (const [key, nested] of Object.entries(value.mapValue.fields || {})) {
      out[key] = fromFirestoreValue(nested);
    }
    return out;
  }
  return undefined;
}

function toFirestoreValue(value) {
  if (value === undefined || value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === 'object') {
    const fields = {};
    for (const [key, nested] of Object.entries(value)) {
      if (nested !== undefined) fields[key] = toFirestoreValue(nested);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function fromFirestoreDoc(doc, fallbackId = '') {
  const data = {};
  for (const [key, value] of Object.entries(doc?.fields || {})) {
    data[key] = fromFirestoreValue(value);
  }
  return {
    id: doc?.name?.split('/').pop() || fallbackId,
    data,
    exists: Boolean(doc?.name),
  };
}

function toFirestoreFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) fields[key] = toFirestoreValue(value);
  }
  return fields;
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

function seasonalCopiesEqual(left = {}, right = {}) {
  const keys = Object.keys(SEASON_COPY);
  return keys.every((key) => (
    left[key]?.title === right[key]?.title &&
    left[key]?.subtitle === right[key]?.subtitle
  ));
}

function sameDate(left = {}, right = {}) {
  return Number(left.month) === Number(right.month) && Number(left.day) === Number(right.day);
}

function seasonMetadataMatchesCurrent(seasonData = {}, season, copy) {
  const range = SEASON_RANGES[season];
  const copyMatches = seasonData.nameAr === copy.title
    && seasonData.description === copy.subtitle
    && Array.isArray(seasonData.greetings)
    && seasonData.greetings.length === 1
    && seasonData.greetings[0] === copy.subtitle;

  if (!range) return copyMatches;

  return copyMatches
    && sameDate(seasonData.startDate, range.startDate)
    && sameDate(seasonData.endDate, range.endDate);
}

function makeFirestoreClient(accessToken) {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  return {
    async listCollection(collectionPath) {
      const docs = [];
      let pageToken = '';
      do {
        const url = new URL(`${baseUrl}/${collectionPath}`);
        url.searchParams.set('pageSize', '300');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const res = await fetch(url, { headers });
        if (res.status === 404) return docs;
        if (!res.ok) throw new Error(`Firestore list ${collectionPath} failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
        const body = await res.json();
        docs.push(...(body.documents || []).map((doc) => fromFirestoreDoc(doc)));
        pageToken = body.nextPageToken || '';
      } while (pageToken);
      return docs;
    },

    async getDoc(collectionPath, docId) {
      const res = await fetch(`${baseUrl}/${collectionPath}/${encodeURIComponent(docId)}`, { headers });
      if (res.status === 404) return { id: docId, data: {}, exists: false };
      if (!res.ok) throw new Error(`Firestore get ${collectionPath}/${docId} failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return fromFirestoreDoc(await res.json(), docId);
    },

    async setDoc(collectionPath, docId, data) {
      const res = await fetch(`${baseUrl}/${collectionPath}/${encodeURIComponent(docId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: toFirestoreFields(data) }),
      });
      if (!res.ok) throw new Error(`Firestore write ${collectionPath}/${docId} failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
    },
  };
}

async function normalizeSeasonalContent(db) {
  const docs = await db.listCollection('seasonalContent');
  let changed = 0;

  for (const doc of docs) {
    const copy = SEASON_COPY[doc.data.seasonType];
    if (!copy) continue;
    const range = SEASON_RANGES[doc.data.seasonType];

    const nextData = {
      ...doc.data,
      titleAr: copy.title,
      contentAr: copy.subtitle,
      startDate: range?.startDateText || doc.data.startDate,
      endDate: range?.endDateText || doc.data.endDate,
      translations: {
        ...(doc.data.translations || {}),
        title_ar: copy.title,
        content_ar: copy.subtitle,
      },
      updatedAt: new Date().toISOString(),
    };

    if (JSON.stringify(nextData) === JSON.stringify(doc.data)) continue;
    changed += 1;
    console.log(`seasonalContent/${doc.id}: ${doc.data.seasonType}`);
    if (APPLY) await db.setDoc('seasonalContent', doc.id, nextData);
  }

  console.log(`seasonalContent changed docs: ${changed}`);
}

async function normalizeSeasonalBannerCopyDoc(db) {
  const doc = await db.getDoc('appContent', 'seasonalBannerCopy');
  const nextData = {
    ...(doc.data || {}),
    copies: SEASON_COPY,
    updatedAt: new Date().toISOString(),
  };

  if (doc.exists && seasonalCopiesEqual(doc.data.copies || {}, SEASON_COPY)) {
    console.log('appContent/seasonalBannerCopy: already normalized');
    return;
  }

  console.log('appContent/seasonalBannerCopy');
  if (APPLY) await db.setDoc('appContent', 'seasonalBannerCopy', nextData);
}

async function normalizeSeasonsMetadata(db) {
  const doc = await db.getDoc('appContent', 'seasonsMetadata');
  if (!doc.exists) {
    console.log('appContent/seasonsMetadata: missing');
    return;
  }

  const seasons = doc.data.seasons || {};
  const nextSeasons = { ...seasons };
  let changed = 0;

  for (const [season, copy] of Object.entries(SEASON_COPY)) {
    if (!nextSeasons[season]) continue;
    const range = SEASON_RANGES[season];
    const next = {
      ...nextSeasons[season],
      nameAr: copy.title,
      description: copy.subtitle,
      startDate: range?.startDate || nextSeasons[season].startDate,
      endDate: range?.endDate || nextSeasons[season].endDate,
      greetings: [copy.subtitle],
    };
    if (seasonMetadataMatchesCurrent(nextSeasons[season], season, copy)) continue;
    nextSeasons[season] = next;
    changed += 1;
    console.log(`appContent/seasonsMetadata.seasons.${season}`);
  }

  if (changed > 0 && APPLY) {
    await db.setDoc('appContent', 'seasonsMetadata', {
      ...doc.data,
      seasons: nextSeasons,
      updatedAt: new Date().toISOString(),
    });
  }

  console.log(`seasonsMetadata changed seasons: ${changed}`);
}

async function normalizeWelcomeBanner(db) {
  const doc = await db.getDoc('config', 'app-settings');
  if (!doc.exists || !doc.data.welcomeBanner) {
    console.log('config/app-settings.welcomeBanner: missing');
    return;
  }

  const banner = doc.data.welcomeBanner;
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
  if (APPLY) {
    await db.setDoc('config', 'app-settings', {
      ...doc.data,
      welcomeBanner: nextBanner,
    });
  }
}

async function main() {
  console.log(APPLY ? 'APPLY mode: Firestore will be updated.' : 'DRY RUN: no writes will be made.');
  const db = makeFirestoreClient(getAccessToken());
  await normalizeSeasonalContent(db);
  await normalizeSeasonalBannerCopyDoc(db);
  await normalizeSeasonsMetadata(db);
  await normalizeWelcomeBanner(db);
  console.log(APPLY ? 'Done. Firestore normalized.' : 'Done. Dry run only. Re-run with --apply to write.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
