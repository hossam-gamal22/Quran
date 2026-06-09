import type {
  AyahMemoryState,
  AyahRef,
  MemorizationPlan,
  TodayPlan,
  TodayPlanSnapshot,
} from '@/types/memorization';
import { ayahKey } from '@/types/memorization';
import { enumeratePlanAyahsFull, pickNewFromPlan } from './memorization-helpers';
import { getDueAyahs, todayString } from './memorization-srs';

export function getPlanAyahKeySet(plan: MemorizationPlan): Set<string> {
  return new Set(
    enumeratePlanAyahsFull(plan).map((ayah) =>
      ayahKey(ayah.surahNumber, ayah.ayahNumber),
    ),
  );
}

export function filterStatesForPlan(
  plan: MemorizationPlan,
  states: Record<string, AyahMemoryState>,
): Record<string, AyahMemoryState> {
  const keys = getPlanAyahKeySet(plan);
  const scoped: Record<string, AyahMemoryState> = {};
  for (const key in states) {
    if (keys.has(key)) scoped[key] = states[key];
  }
  return scoped;
}

export const EMPTY_TODAY_PLAN: TodayPlan = {
  date: '',
  newAyahs: [],
  reviewAyahs: [],
  assignedNewCount: 0,
  assignedReviewCount: 0,
  estimatedMinutes: 0,
};

/**
 * Compute the day's assigned ward from the CURRENT states. Called once per
 * (date, plan) and then persisted as a snapshot — NOT recomputed on every mark,
 * so the daily ward stays fixed for the day (target enforced, ring completes).
 */
export function computeAssignedToday(
  plan: MemorizationPlan,
  states: Record<string, AyahMemoryState>,
  today: string = todayString(),
): { assignedNew: AyahRef[]; assignedReview: AyahRef[] } {
  const planStates = filterStatesForPlan(plan, states);
  const assignedReview = getDueAyahs(planStates, today).map((state) => ({
    surahNumber: state.surahNumber,
    ayahNumber: state.ayahNumber,
  }));
  const assignedNew = pickNewFromPlan(plan, planStates, plan.dailyTarget ?? 3);
  return { assignedNew, assignedReview };
}

/**
 * Derive the live TodayPlan (remaining items) from a fixed snapshot + the
 * current states. The remaining lists shrink as ayahs are marked, while the
 * assigned counts (ring denominators) stay stable.
 */
export function deriveTodayPlan(
  snapshot: TodayPlanSnapshot,
  states: Record<string, AyahMemoryState>,
  today: string = todayString(),
): TodayPlan {
  const newAyahs = snapshot.assignedNew.filter((a) => {
    const s = states[ayahKey(a.surahNumber, a.ayahNumber)];
    return !s || s.status === 'new';
  });
  const reviewAyahs = snapshot.assignedReview.filter((a) => {
    const s = states[ayahKey(a.surahNumber, a.ayahNumber)];
    if (!s || s.status === 'new') return false;
    return s.nextReviewDate <= today;
  });
  const work = newAyahs.length * 3 + reviewAyahs.length;
  const estimatedMinutes = work > 0 ? Math.max(1, Math.round(work)) : 0;

  return {
    date: snapshot.date,
    newAyahs,
    reviewAyahs,
    assignedNewCount: snapshot.assignedNew.length,
    assignedReviewCount: snapshot.assignedReview.length,
    estimatedMinutes,
  };
}

/**
 * Back-compat one-shot computation (snapshot + derive) for any non-context
 * caller. Prefer the persisted snapshot path in MemorizationContext.
 */
export function computeTodayPlan(
  activePlan: MemorizationPlan | null,
  states: Record<string, AyahMemoryState>,
  today: string = todayString(),
): TodayPlan {
  if (!activePlan) {
    return { ...EMPTY_TODAY_PLAN, date: today };
  }
  const { assignedNew, assignedReview } = computeAssignedToday(
    activePlan,
    states,
    today,
  );
  return deriveTodayPlan(
    { date: today, planId: activePlan.id, assignedNew, assignedReview },
    states,
    today,
  );
}
