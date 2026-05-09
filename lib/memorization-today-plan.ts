import type { AyahMemoryState, MemorizationPlan, TodayPlan } from '@/types/memorization';
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

export function computeTodayPlan(
  activePlan: MemorizationPlan | null,
  states: Record<string, AyahMemoryState>,
  today: string = todayString(),
): TodayPlan {
  if (!activePlan) {
    return { date: today, newAyahs: [], reviewAyahs: [], estimatedMinutes: 0 };
  }

  const planStates = filterStatesForPlan(activePlan, states);
  const reviewAyahs = getDueAyahs(planStates, today).map((state) => ({
    surahNumber: state.surahNumber,
    ayahNumber: state.ayahNumber,
  }));
  const newAyahs = pickNewFromPlan(
    activePlan,
    planStates,
    activePlan.dailyTarget ?? 3,
  );
  const estimatedMinutes = Math.max(
    1,
    Math.round(newAyahs.length * 3 + reviewAyahs.length),
  );

  return { date: today, newAyahs, reviewAyahs, estimatedMinutes };
}
