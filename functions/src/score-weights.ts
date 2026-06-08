// functions/src/score-weights.ts
//
// Server-side mirror of the app's scoring rules, kept dependency-free so it can
// be unit-tested and reused by the weights-change recompute trigger. Must stay
// in sync with lib/rewards-manager.ts (DEFAULT_WEIGHTS / calculateMonthlyScore).

export type ScoreWeights = Record<string, number>;

export const DEFAULT_WEIGHTS: ScoreWeights = {
  app_open: 1,
  azkar: 2,
  quran: 3,
  prayer: 5,
  tasbih: 0.5, // every 2 tasbih = 1 point
  khatma: 100,
  fasting: 4,
};

/**
 * Merge stored weights over the defaults, applying the same khatma=5→100
 * normalisation the app uses (normalizeRewardsConfig).
 */
export const normalizeWeights = (raw?: ScoreWeights | null): ScoreWeights => {
  const rawWeights = raw || {};
  const merged: ScoreWeights = { ...DEFAULT_WEIGHTS, ...rawWeights };
  merged.khatma =
    rawWeights.khatma === undefined || rawWeights.khatma === 5
      ? DEFAULT_WEIGHTS.khatma
      : rawWeights.khatma;
  return merged;
};

/**
 * Floor(sum(count × weight)); unknown activity keys default to weight 1.
 * Mirrors calculateMonthlyScore in the app.
 */
export const computeScore = (
  activities: Record<string, unknown> | undefined,
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): number => {
  let score = 0;
  for (const [key, count] of Object.entries(activities || {})) {
    score += (Number(count) || 0) * (weights[key] ?? 1);
  }
  return Math.floor(score);
};
