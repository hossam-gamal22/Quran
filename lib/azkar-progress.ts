import { getEffectiveZikrRepeatCount, type RepeatCountSource } from '@/lib/azkar-repeat';

export type AzkarProgressId = number | string;

export interface AzkarProgressItem extends RepeatCountSource {
  id: AzkarProgressId;
}

export type AzkarProgressCounts = Record<AzkarProgressId, number>;

function safeCount(value: number | undefined): number {
  const parsed = Math.trunc(Number(value ?? 0));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function getAzkarCompletionRatio(
  items: AzkarProgressItem[],
  counts: AzkarProgressCounts,
): number {
  const totals = items.reduce(
    (acc, item) => {
      const required = Math.max(1, getEffectiveZikrRepeatCount(item));
      const current = Math.min(safeCount(counts[item.id]), required);
      return {
        completed: acc.completed + current,
        required: acc.required + required,
      };
    },
    { completed: 0, required: 0 },
  );

  if (totals.required === 0) return 0;
  return Math.min(1, totals.completed / totals.required);
}

export function getAzkarCompletionPercentage(
  items: AzkarProgressItem[],
  counts: AzkarProgressCounts,
): number {
  const ratio = getAzkarCompletionRatio(items, counts);
  return ratio >= 1 ? 100 : Math.min(99, Math.round(ratio * 100));
}

export function areAzkarCountsCompleted(
  items: AzkarProgressItem[],
  counts: AzkarProgressCounts,
): boolean {
  return items.length > 0 && items.every((item) => {
    const required = Math.max(1, getEffectiveZikrRepeatCount(item));
    return safeCount(counts[item.id]) >= required;
  });
}
