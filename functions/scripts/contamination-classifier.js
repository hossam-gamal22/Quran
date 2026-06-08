// functions/scripts/contamination-classifier.js
//
// Pure classification logic for the leaderboard-contamination remediation,
// extracted from fix-leaderboard-contamination.js so it can be unit-tested
// without Firebase credentials. CommonJS, dependency-free.

const DEFAULT_WEIGHTS = {
  app_open: 1,
  azkar: 2,
  quran: 3,
  prayer: 5,
  tasbih: 1,
  khatma: 100,
  fasting: 4,
};

function calcScore(activities, weights) {
  let score = 0;
  for (const [k, v] of Object.entries(activities || {})) {
    score += (Number(v) || 0) * (weights[k] || 1);
  }
  return score;
}

/**
 * Classify one current-month user record.
 *
 * Reliable contamination signal: `app_open` is hard-capped at 1 point per
 * unique calendar day, so a count greater than `daysElapsed` is physically
 * impossible for current-month-only activity → the record carries prior
 * activity. (The persistent `engagementRepair` marker is NOT reliable; it
 * lingers on docs legitimately rolled into this month.)
 *
 * @param {{ activities?: object, score?: number, hasPrevArchive?: boolean }} rec
 * @param {{ daysElapsed: number, weights?: object }} ctx
 * @returns {{ type: 'FULL'|'CLAMP'|'OK', newActivities?: object, newScore?: number }}
 */
function classifyUser(rec, ctx) {
  const weights = ctx.weights || DEFAULT_WEIGHTS;
  const daysElapsed = ctx.daysElapsed;
  const activities = rec.activities || {};
  const appOpen = Number(activities.app_open) || 0;
  const score = Number(rec.score) || 0;
  const hasPrevArchive = !!rec.hasPrevArchive;

  const appOpenImpossible = appOpen > daysElapsed;

  // FULL contamination: an impossible app_open paired with a large score and
  // no proper archive of the previous month — the whole record is really
  // prior-month data re-stamped to the current month. Clamping app_open alone
  // would leave the rest inflated, so the record must be relabeled to prevMonth.
  const looksFull = !hasPrevArchive && appOpenImpossible && score > 1000;
  if (looksFull) return { type: 'FULL' };

  if (appOpenImpossible) {
    // Minor residual: clamp app_open to elapsed days, recompute score.
    const clamped = { ...activities, app_open: daysElapsed };
    return { type: 'CLAMP', newActivities: clamped, newScore: calcScore(clamped, weights) };
  }

  return { type: 'OK' };
}

module.exports = { DEFAULT_WEIGHTS, calcScore, classifyUser };
