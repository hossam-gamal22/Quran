// functions/scripts/apply-tasbih-weight.js
//
// Applies the "every 2 tasbih = 1 point" rule (tasbih weight 0.5) and brings
// existing data in line. Three actions:
//   1. config/rewards-settings: set scoreWeights.tasbih = 0.5, bump
//      scoreWeightsVersion (triggers the in-app "points recalculated" banner),
//      set scoreWeightsUpdatedAt.
//   2. Recompute every current-month user's score with the new weights (floored)
//      and stamp monthlyEngagement.weightsVersion = new version. Where the new
//      score is lower, also write a fresh engagementCorrection.correctedAt so
//      the deployed guardMonthlyEngagementRegression accepts the same-month
//      decrease (otherwise it would revert it).
//   3. Refresh config.history winner scores from each winner's archived
//      engagementHistory[month].score (the true final month total) so the log
//      shows the correct number instead of the stale selection-time snapshot.
//
// Usage (from functions/):
//   node scripts/apply-tasbih-weight.js            # dry-run (no writes)
//   node scripts/apply-tasbih-weight.js --apply    # perform writes
//
// Credentials: FIREBASE_SERVICE_ACCOUNT env (JSON) if set, else ./serviceAccountKey.json.

const admin = require('firebase-admin');
const { DEFAULT_WEIGHTS, calcScore } = require('./contamination-classifier');

function loadCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  }
  // eslint-disable-next-line import/no-unresolved, global-require
  return admin.credential.cert(require('../serviceAccountKey.json'));
}

if (!admin.apps.length) admin.initializeApp({ credential: loadCredential() });
const db = admin.firestore();
const APPLY = process.argv.includes('--apply');

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-v2`;

async function main() {
  const currentMonth = monthKey(new Date());

  const cfgRef = db.doc('config/rewards-settings');
  const cfg = (await cfgRef.get()).data() || {};
  const rawWeights = cfg.scoreWeights || {};
  const newVersion = (Number(cfg.scoreWeightsVersion) || 0) + 1;

  // New weights: keep everything, force tasbih 0.5, keep the khatma=5→100 rule.
  const newWeights = { ...DEFAULT_WEIGHTS, ...rawWeights, tasbih: 0.5 };
  newWeights.khatma = rawWeights.khatma === undefined || rawWeights.khatma === 5
    ? DEFAULT_WEIGHTS.khatma
    : rawWeights.khatma;

  console.log(`mode=${APPLY ? 'APPLY' : 'DRY-RUN'} currentMonth=${currentMonth}`);
  console.log(`scoreWeightsVersion ${cfg.scoreWeightsVersion || 0} → ${newVersion}`);
  console.log('newWeights=', JSON.stringify(newWeights), '\n');

  // ---- 2. Recompute current-month user scores ----
  const snap = await db.collection('users')
    .where('monthlyEngagement.month', '==', currentMonth)
    .get();

  const changes = [];
  snap.forEach((doc) => {
    const x = doc.data();
    const me = x.monthlyEngagement || {};
    const activities = me.activities || {};
    const oldScore = Number(me.score) || 0;
    const newScore = Math.floor(calcScore(activities, newWeights));
    if (newScore !== oldScore || Number(me.weightsVersion) !== newVersion) {
      changes.push({ id: doc.id, name: (x.displayName || '').trim(), oldScore, newScore, tasbih: Number(activities.tasbih) || 0 });
    }
  });

  console.log(`== Recompute (${changes.length} of ${snap.size} users) ==`);
  changes
    .sort((a, b) => b.oldScore - a.oldScore)
    .slice(0, 15)
    .forEach((c) => console.log(`  ${c.id.slice(0, 16)} | ${c.name.slice(0, 20).padEnd(20)} | ${c.oldScore} → ${c.newScore} (tasbih=${c.tasbih})`));
  if (changes.length > 15) console.log(`  …and ${changes.length - 15} more`);

  // ---- 3. Refresh history winner scores from archived month totals ----
  const histEntries = Array.isArray(cfg.history) ? cfg.history : [];
  const winnerIds = new Set();
  histEntries.forEach((h) => (h.winners || []).forEach((w) => w.userId && winnerIds.add(w.userId)));
  const winnerDocs = new Map();
  await Promise.all([...winnerIds].map(async (id) => {
    const d = await db.doc(`users/${id}`).get();
    if (d.exists) winnerDocs.set(id, d.data());
  }));

  const archivedScore = (userData, month) => {
    if (!userData) return undefined;
    const hist = userData.engagementHistory && userData.engagementHistory[month];
    if (hist && typeof hist.score === 'number') return hist.score;
    const lf = userData.lastFinalizedMonth;
    if (lf && lf.month === month && typeof lf.score === 'number') return lf.score;
    return undefined;
  };

  const newHistory = histEntries.map((h) => ({
    ...h,
    winners: (h.winners || []).map((w) => {
      const real = archivedScore(winnerDocs.get(w.userId), h.month);
      return real !== undefined && real !== w.score ? { ...w, score: real } : w;
    }),
  }));

  console.log('\n== History score refresh (auto entries) ==');
  newHistory.filter((h) => h.selectedBy === 'auto').forEach((h) => {
    console.log(`  ${h.month}: ${(h.winners || []).map((w) => `${(w.displayName || w.userId.slice(0, 8))}:${w.score}`).join(', ')}`);
  });

  if (!APPLY) {
    console.log('\nDRY-RUN — no writes performed. Re-run with --apply to execute.');
    return;
  }

  // Write config (weights + version + refreshed history) in one update.
  await cfgRef.update({
    'scoreWeights.tasbih': 0.5,
    scoreWeightsVersion: newVersion,
    scoreWeightsUpdatedAt: new Date().toISOString(),
    history: newHistory,
  });
  console.log('\nconfig updated (weights + version + history).');

  // Recompute user scores.
  let writes = 0;
  for (const c of changes) {
    const update = {
      'monthlyEngagement.score': c.newScore,
      'monthlyEngagement.weightsVersion': newVersion,
    };
    if (c.newScore < c.oldScore) {
      update.engagementCorrection = {
        type: 'weights_recompute',
        weightsVersion: newVersion,
        correctedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    }
    await db.doc(`users/${c.id}`).update(update);
    writes++;
  }
  console.log(`${writes} user score(s) recomputed.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
