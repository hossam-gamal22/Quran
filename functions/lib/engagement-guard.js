"use strict";
// functions/src/engagement-guard.ts
//
// Pure decision logic for `guardMonthlyEngagementRegression`, extracted so it
// can be unit-tested without the Firestore trigger plumbing. Keep this module
// dependency-free (no firebase-admin) so the test runner can import it directly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRevertRegression = exports.isIntentionalCorrection = exports.correctedAtMs = void 0;
/**
 * Convert a Firestore Timestamp | epoch-ms | falsy value into milliseconds.
 * Returns 0 for anything we can't read so a missing marker sorts oldest.
 */
const correctedAtMs = (ts) => {
    if (ts && typeof ts.toMillis === 'function') {
        return ts.toMillis();
    }
    if (typeof ts === 'number' && Number.isFinite(ts))
        return ts;
    return 0;
};
exports.correctedAtMs = correctedAtMs;
/**
 * A write is a deliberate correction (not a stale-client regression) when it
 * carries a STRICTLY NEWER `engagementCorrection.correctedAt` than the prior
 * doc. Self-limiting: only the single update that advances the marker is
 * exempt; any later unmarked decrease still trips the guard.
 */
const isIntentionalCorrection = (before, after) => (0, exports.correctedAtMs)(after.engagementCorrection?.correctedAt) >
    (0, exports.correctedAtMs)(before.engagementCorrection?.correctedAt);
exports.isIntentionalCorrection = isIntentionalCorrection;
/**
 * Should the guard revert this update? True only for an unmarked, same-month
 * score DECREASE from a previously-positive score — the signature of an old
 * client recalculating from empty local storage after reinstall.
 */
const shouldRevertRegression = (before, after) => {
    const beforeMonth = String(before.monthlyEngagement?.month || '');
    const afterMonth = String(after.monthlyEngagement?.month || '');
    const beforeScore = Number(before.monthlyEngagement?.score) || 0;
    const afterScore = Number(after.monthlyEngagement?.score) || 0;
    if (!beforeMonth || beforeMonth !== afterMonth)
        return false;
    if (beforeScore <= 0 || afterScore >= beforeScore)
        return false;
    if ((0, exports.isIntentionalCorrection)(before, after))
        return false;
    return true;
};
exports.shouldRevertRegression = shouldRevertRegression;
