"use strict";
// functions/src/score-weights.ts
//
// Server-side mirror of the app's scoring rules, kept dependency-free so it can
// be unit-tested and reused by the weights-change recompute trigger. Must stay
// in sync with lib/rewards-manager.ts (DEFAULT_WEIGHTS / calculateMonthlyScore).
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeScore = exports.normalizeWeights = exports.DEFAULT_WEIGHTS = void 0;
exports.DEFAULT_WEIGHTS = {
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
const normalizeWeights = (raw) => {
    const rawWeights = raw || {};
    const merged = { ...exports.DEFAULT_WEIGHTS, ...rawWeights };
    merged.khatma =
        rawWeights.khatma === undefined || rawWeights.khatma === 5
            ? exports.DEFAULT_WEIGHTS.khatma
            : rawWeights.khatma;
    return merged;
};
exports.normalizeWeights = normalizeWeights;
/**
 * Floor(sum(count × weight)); unknown activity keys default to weight 1.
 * Mirrors calculateMonthlyScore in the app.
 */
const computeScore = (activities, weights = exports.DEFAULT_WEIGHTS) => {
    let score = 0;
    for (const [key, count] of Object.entries(activities || {})) {
        score += (Number(count) || 0) * (weights[key] ?? 1);
    }
    return Math.floor(score);
};
exports.computeScore = computeScore;
