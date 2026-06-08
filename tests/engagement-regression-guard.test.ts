import { describe, expect, it } from 'vitest';
import {
  shouldRevertRegression,
  isIntentionalCorrection,
  correctedAtMs,
} from '../functions/src/engagement-guard';

const ts = (ms: number) => ({ toMillis: () => ms });
const M = '2026-06-v2';

describe('guardMonthlyEngagementRegression — pure decision', () => {
  it('reverts an unmarked same-month score decrease from a positive score', () => {
    const before = { monthlyEngagement: { month: M, score: 19868 } };
    const after = { monthlyEngagement: { month: M, score: 50 } };
    expect(shouldRevertRegression(before, after)).toBe(true);
  });

  it('does NOT revert when the write carries a newer engagementCorrection.correctedAt', () => {
    const before = { monthlyEngagement: { month: M, score: 19868 } };
    const after = {
      monthlyEngagement: { month: M, score: 50 },
      engagementCorrection: { correctedAt: ts(1_700_000_000_000) },
    };
    expect(isIntentionalCorrection(before, after)).toBe(true);
    expect(shouldRevertRegression(before, after)).toBe(false);
  });

  it('still reverts a LATER unmarked decrease after a correction already landed (self-limiting)', () => {
    // The doc already has a correction marker from a prior write...
    const before = {
      monthlyEngagement: { month: M, score: 70 },
      engagementCorrection: { correctedAt: ts(1_700_000_000_000) },
    };
    // ...a stale client now lowers the score again without advancing the marker.
    const after = {
      monthlyEngagement: { month: M, score: 5 },
      engagementCorrection: { correctedAt: ts(1_700_000_000_000) },
    };
    expect(isIntentionalCorrection(before, after)).toBe(false);
    expect(shouldRevertRegression(before, after)).toBe(true);
  });

  it('allows a correction that advances the marker even when one already exists', () => {
    const before = {
      monthlyEngagement: { month: M, score: 70 },
      engagementCorrection: { correctedAt: ts(1_700_000_000_000) },
    };
    const after = {
      monthlyEngagement: { month: M, score: 40 },
      engagementCorrection: { correctedAt: ts(1_700_000_500_000) },
    };
    expect(shouldRevertRegression(before, after)).toBe(false);
  });

  it('does not revert a score INCREASE', () => {
    const before = { monthlyEngagement: { month: M, score: 100 } };
    const after = { monthlyEngagement: { month: M, score: 250 } };
    expect(shouldRevertRegression(before, after)).toBe(false);
  });

  it('does not revert across a month rollover (different month key)', () => {
    const before = { monthlyEngagement: { month: '2026-05-v2', score: 5000 } };
    const after = { monthlyEngagement: { month: M, score: 10 } };
    expect(shouldRevertRegression(before, after)).toBe(false);
  });

  it('does not revert when the previous score was zero/absent', () => {
    expect(
      shouldRevertRegression(
        { monthlyEngagement: { month: M, score: 0 } },
        { monthlyEngagement: { month: M, score: 0 } },
      ),
    ).toBe(false);
    expect(
      shouldRevertRegression({}, { monthlyEngagement: { month: M, score: 5 } }),
    ).toBe(false);
  });

  it('correctedAtMs reads Timestamp, epoch-number, and falsy forms', () => {
    expect(correctedAtMs(ts(123))).toBe(123);
    expect(correctedAtMs(456)).toBe(456);
    expect(correctedAtMs(undefined)).toBe(0);
    expect(correctedAtMs(null)).toBe(0);
    expect(correctedAtMs('nope' as unknown)).toBe(0);
  });
});
