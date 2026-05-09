// lib/memorization-srs.ts
// نظام المراجعة الذكية المبسّط (Spaced Repetition) — فترات ثابتة

import type { AyahMemoryState, AyahStatus, ReviewOutcome } from '@/types/memorization';

// stage 0 → اليوم نفسه؛ ثم 1 يوم، 3، 7، 14، 30
export const SRS_INTERVALS: number[] = [0, 1, 3, 7, 14, 30];
export const MAX_STAGE = SRS_INTERVALS.length - 1;

const toDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (
    Number.isFinite(year) &&
    Number.isFinite(month) &&
    Number.isFinite(day) &&
    year > 0 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
  ) {
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr + 'T00:00:00');
};

export const addDays = (dateStr: string, days: number): string => {
  const d = fromDateString(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
};

export const todayString = (): string => toDateString(new Date());

export interface SrsResult {
  intervalStage: number;
  nextReviewDate: string;
  status: AyahStatus;
  confidenceScore: number;
  repeatCount: number;
  failures: number;
}

/**
 * احسب الحالة التالية لآية بعد محاولة مراجعة.
 * passed يرفع المرحلة بمقدار 1، failed يخفضها 1، partial يثبت المرحلة الحالية.
 */
export function computeNextReview(
  current: Pick<
    AyahMemoryState,
    'intervalStage' | 'repeatCount' | 'confidenceScore' | 'failures' | 'status'
  >,
  outcome: boolean | ReviewOutcome,
  today: string = todayString(),
): SrsResult {
  const result: ReviewOutcome =
    typeof outcome === 'boolean' ? (outcome ? 'passed' : 'failed') : outcome;
  const prevStage = Math.max(0, Math.min(MAX_STAGE, current.intervalStage ?? 0));
  let nextStage = prevStage;
  let nextStatus: AyahStatus = current.status;
  let confidence = current.confidenceScore ?? 0;
  let failures = current.failures ?? 0;

  if (result === 'passed') {
    nextStage = Math.min(MAX_STAGE, prevStage + 1);
    confidence = Math.min(100, confidence + 15);
    if (nextStage >= 4) nextStatus = 'mastered';
    else if (nextStage >= 2) nextStatus = 'memorized';
    else nextStatus = 'learning';
  } else if (result === 'partial') {
    nextStage = prevStage;
    confidence = Math.min(100, confidence + 5);
    if (current.status === 'needs_review') nextStatus = 'needs_review';
    else if (nextStage >= 4) nextStatus = 'mastered';
    else if (nextStage >= 2) nextStatus = 'memorized';
    else nextStatus = 'learning';
  } else {
    // الخطأ يرجع بمرحلة واحدة وليس للصفر مباشرة (مرونة)
    nextStage = Math.max(0, prevStage - 1);
    failures += 1;
    confidence = Math.max(0, confidence - 20);
    nextStatus = 'needs_review';
  }

  const days = SRS_INTERVALS[nextStage] ?? 0;
  const nextReviewDate = addDays(today, days);

  return {
    intervalStage: nextStage,
    nextReviewDate,
    status: nextStatus,
    confidenceScore: confidence,
    repeatCount: (current.repeatCount ?? 0) + 1,
    failures,
  };
}

/**
 * الآيات المستحقة للمراجعة اليوم (nextReviewDate <= today).
 */
export function getDueAyahs(
  states: Record<string, AyahMemoryState>,
  today: string = todayString(),
): AyahMemoryState[] {
  const due: AyahMemoryState[] = [];
  for (const key in states) {
    const s = states[key];
    if (!s) continue;
    if (s.status === 'new') continue;
    if (s.status === 'mastered' && s.nextReviewDate > today) continue;
    if (s.nextReviewDate <= today) due.push(s);
  }
  // أولوية للآيات الأضعف
  due.sort((a, b) => {
    if (a.failures !== b.failures) return b.failures - a.failures;
    return a.nextReviewDate.localeCompare(b.nextReviewDate);
  });
  return due;
}

/**
 * كم آية محفوظة فعلياً (memorized أو mastered).
 */
export function countMemorized(states: Record<string, AyahMemoryState>): number {
  let n = 0;
  for (const k in states) {
    const s = states[k];
    if (s && (s.status === 'memorized' || s.status === 'mastered')) n += 1;
  }
  return n;
}
