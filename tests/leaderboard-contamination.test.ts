import { describe, expect, it } from 'vitest';
// CommonJS module shared with the remediation script. Tested directly so the
// classification rules are pinned independent of Firestore credentials.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { classifyUser, calcScore, DEFAULT_WEIGHTS } = require('../functions/scripts/contamination-classifier');

const W = DEFAULT_WEIGHTS;

describe('leaderboard contamination classifier', () => {
  it('flags FULL when app_open is impossible, score is large, and there is no prev-month archive', () => {
    // 198 khatmas-worth of points with app_open=30 on day 8 → carries May data.
    const res = classifyUser(
      { activities: { app_open: 30, tasbih: 5000, khatma: 50 }, score: 19868, hasPrevArchive: false },
      { daysElapsed: 8, weights: W },
    );
    expect(res.type).toBe('FULL');
  });

  it('CLAMPs a small over-count when a valid prev-month archive exists', () => {
    const res = classifyUser(
      { activities: { app_open: 12, prayer: 10, quran: 4 }, score: 74, hasPrevArchive: true },
      { daysElapsed: 8, weights: W },
    );
    expect(res.type).toBe('CLAMP');
    expect(res.newActivities.app_open).toBe(8);
    // score recomputed with clamped app_open: 8*1 + 10*5 + 4*3 = 70
    expect(res.newScore).toBe(8 * W.app_open + 10 * W.prayer + 4 * W.quran);
    expect(res.newScore).toBe(70);
  });

  it('treats a large over-count WITH a prev archive as CLAMP, not FULL (only app_open is inflated)', () => {
    const res = classifyUser(
      { activities: { app_open: 40, prayer: 20 }, score: 2000, hasPrevArchive: true },
      { daysElapsed: 8, weights: W },
    );
    expect(res.type).toBe('CLAMP');
    expect(res.newActivities.app_open).toBe(8);
  });

  it('treats an impossible-but-small score with no archive as CLAMP (guarded by the score>1000 FULL gate)', () => {
    const res = classifyUser(
      { activities: { app_open: 20, tasbih: 100 }, score: 120, hasPrevArchive: false },
      { daysElapsed: 8, weights: W },
    );
    expect(res.type).toBe('CLAMP');
  });

  it('leaves OK records untouched when app_open <= daysElapsed', () => {
    const res = classifyUser(
      { activities: { app_open: 8, prayer: 40, quran: 20 }, score: 260, hasPrevArchive: true },
      { daysElapsed: 8, weights: W },
    );
    expect(res.type).toBe('OK');
    expect(res.newActivities).toBeUndefined();
  });

  it('treats app_open exactly equal to daysElapsed as OK (boundary)', () => {
    const res = classifyUser(
      { activities: { app_open: 8 }, score: 8, hasPrevArchive: false },
      { daysElapsed: 8, weights: W },
    );
    expect(res.type).toBe('OK');
  });

  it('handles missing activities/app_open as OK (zero counts)', () => {
    expect(classifyUser({ score: 0 }, { daysElapsed: 8, weights: W }).type).toBe('OK');
    expect(classifyUser({ activities: {} }, { daysElapsed: 8, weights: W }).type).toBe('OK');
  });

  it('calcScore applies the configured weights and ignores unknown keys with weight 1', () => {
    expect(calcScore({ prayer: 5, quran: 10, khatma: 1 }, W)).toBe(5 * 5 + 10 * 3 + 1 * 100);
    expect(calcScore({ mystery: 3 }, W)).toBe(3); // unknown → weight 1
    expect(calcScore({}, W)).toBe(0);
  });
});
