// functions/scripts/fix-leaderboard-contamination.js
//
// One-off remediation for monthly-leaderboard scores that carry data from a
// previous month under the *current* month's key. Root cause: an out-of-band
// bulk repair (`engagementRepair.source = activity_logs_<prevMonth>_bulk`)
// rewrote `monthlyEngagement` with a previous month's totals but stamped it
// with month = current, bypassing the normal archive-on-rollover path. Because
// `score = Math.max(calculated, cloudFloor)` on the client and
// `guardMonthlyEngagementRegression` on the server both refuse to lower a score
// within the same month, the inflated value is "sticky" and never self-corrects.
//
// Classification per current-month user:
//   - FULL  (relabel): no prevMonth archive AND (engagementRepair points at a
//             prior month OR app_open >> daysElapsed with a large score). The
//             whole record is really previous-month data → move it into
//             engagementHistory[prevMonth] and re-stamp monthlyEngagement.month
//             back to prevMonth. Changing the month means
//             guardMonthlyEngagementRegression (same-month only) won't revert
//             it; the user drops out of the current cache and their device
//             rebuilds the true current month on next open.
//   - CLAMP (minor):  has a valid prevMonth archive AND a small, plausible
//             current-month score, but app_open > daysElapsed by a small margin.
//             Clamp app_open to daysElapsed and recompute score. Written with
//             monthlyEngagementGuard.allowCorrection so the server guard lets
//             the same-month decrease through.
//   - OK:             app_open <= daysElapsed and no contamination markers.
//
// Usage (from functions/):
//   node scripts/fix-leaderboard-contamination.js            # dry-run (no writes)
//   node scripts/fix-leaderboard-contamination.js --apply    # perform writes
//
// Credentials: FIREBASE_SERVICE_ACCOUNT env (JSON) if set, else ./serviceAccountKey.json.

const admin = require('firebase-admin');
const { DEFAULT_WEIGHTS, classifyUser } = require('./contamination-classifier');

function loadCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  }
  // eslint-disable-next-line import/no-unresolved, global-require
  return admin.credential.cert(require('../serviceAccountKey.json'));
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: loadCredential() });
}

const db = admin.firestore();

const APPLY = process.argv.includes('--apply');
// CLAMP writes lower the score within the SAME month, so the currently-deployed
// guardMonthlyEngagementRegression would revert them. Only perform them once the
// hardened guard (which honours engagementCorrection) is deployed, gated behind
// an explicit flag. FULL relabels change the month and are always guard-safe.
const APPLY_CLAMP = process.argv.includes('--apply-clamp');

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-v2`;

async function main() {
  const now = new Date();
  const currentMonth = monthKey(now);
  const prevMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const daysElapsed = now.getUTCDate(); // server runs in UTC; current day-of-month

  const cfgSnap = await db.doc('config/rewards-settings').get();
  const rawWeights = (cfgSnap.data() || {}).scoreWeights || {};
  const weights = { ...DEFAULT_WEIGHTS, ...rawWeights };
  // Match the app's normalizeRewardsConfig: a stored khatma weight of 5 (or
  // missing) is treated as the canonical 100 so recomputed scores agree.
  weights.khatma = rawWeights.khatma === undefined || rawWeights.khatma === 5
    ? DEFAULT_WEIGHTS.khatma
    : rawWeights.khatma;

  console.log(`mode=${APPLY ? 'APPLY' : 'DRY-RUN'} currentMonth=${currentMonth} prevMonth=${prevMonth} daysElapsed=${daysElapsed}`);
  console.log('weights=', JSON.stringify(weights), '\n');

  const snap = await db.collection('users')
    .where('monthlyEngagement.month', '==', currentMonth)
    .get();

  const plans = { FULL: [], CLAMP: [], OK: [] };

  snap.forEach((doc) => {
    const x = doc.data();
    const me = x.monthlyEngagement || {};
    const activities = me.activities || {};
    const score = Number(me.score) || 0;
    const hasPrevArchive = !!(x.engagementHistory && x.engagementHistory[prevMonth]);

    const entry = {
      id: doc.id,
      name: (x.displayName || '').trim(),
      score,
      appOpen: Number(activities.app_open) || 0,
      activities,
      hasPrevArchive,
      repairSource: x.engagementRepair && x.engagementRepair.source,
    };

    // Shared, unit-tested classifier (see contamination-classifier.js).
    const result = classifyUser({ activities, score, hasPrevArchive }, { daysElapsed, weights });
    if (result.type === 'FULL') {
      plans.FULL.push(entry);
    } else if (result.type === 'CLAMP') {
      entry.newActivities = result.newActivities;
      entry.newScore = result.newScore;
      plans.CLAMP.push(entry);
    } else {
      plans.OK.push(entry);
    }
  });

  const fmt = (e) => `  ${e.id.slice(0, 16)} | ${e.name.slice(0, 22).padEnd(22)} | score=${e.score} | app_open=${e.appOpen} | prevArchive=${e.hasPrevArchive}${e.repairSource ? ` | repair=${e.repairSource}` : ''}`;

  console.log(`== FULL relabel → ${prevMonth} (${plans.FULL.length}) ==`);
  plans.FULL.forEach((e) => console.log(fmt(e)));
  console.log(`\n== CLAMP app_open→${daysElapsed} (${plans.CLAMP.length}) ==`);
  plans.CLAMP.forEach((e) => console.log(`${fmt(e)}\n      score ${e.score} → ${e.newScore}`));
  console.log(`\n== OK untouched: ${plans.OK.length} users ==\n`);

  if (!APPLY) {
    console.log('DRY-RUN — no writes performed. Re-run with --apply to execute.');
    return;
  }

  let writes = 0;
  for (const e of plans.FULL) {
    const ref = db.doc(`users/${e.id}`);
    const update = {
      [`engagementHistory.${prevMonth}`]: { score: e.score, activities: e.activities },
      monthlyEngagement: { month: prevMonth, score: e.score, activities: e.activities },
      lastFinalizedMonth: {
        month: prevMonth,
        score: e.score,
        activities: e.activities,
        displayName: e.name,
      },
      engagementCorrection: {
        type: 'relabel_mislabeled_month',
        from: currentMonth,
        to: prevMonth,
        correctedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    };
    await ref.update(update);
    writes++;
    console.log(`FULL applied: ${e.id} (${e.name}) → monthlyEngagement.month=${prevMonth}`);
  }

  if (plans.CLAMP.length > 0 && !APPLY_CLAMP) {
    console.log(`\nSkipped ${plans.CLAMP.length} CLAMP write(s): the deployed guard would revert a same-month`);
    console.log('decrease. Deploy the hardened guard, then re-run with --apply --apply-clamp.');
  }
  for (const e of (APPLY_CLAMP ? plans.CLAMP : [])) {
    const ref = db.doc(`users/${e.id}`);
    await ref.update({
      'monthlyEngagement.activities.app_open': daysElapsed,
      'monthlyEngagement.score': e.newScore,
      // allowCorrection lets guardMonthlyEngagementRegression accept this
      // same-month decrease instead of reverting it.
      'monthlyEngagementGuard.allowCorrection': true,
      'monthlyEngagementGuard.correctedAt': admin.firestore.FieldValue.serverTimestamp(),
      engagementCorrection: {
        type: 'clamp_app_open',
        from: currentMonth,
        clampedTo: daysElapsed,
        correctedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
    writes++;
    console.log(`CLAMP applied: ${e.id} (${e.name}) app_open→${daysElapsed} score→${e.newScore}`);
  }

  console.log(`\nDone. ${writes} document(s) updated.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
