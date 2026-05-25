export type TasbihLike = {
  id: number;
  text: string;
  target: number;
};

export function getPointBearingTasbihAmount({
  amount,
  currentCount,
  target,
  completedToday,
}: {
  amount: number;
  currentCount: number;
  target: number;
  completedToday: boolean;
}): number {
  if (completedToday || amount <= 0) return 0;

  const normalizedTarget = Math.max(1, Math.floor(target || 1));
  const normalizedCount = Math.max(0, Math.floor(currentCount || 0));
  const remainingToday = Math.max(0, normalizedTarget - normalizedCount);

  return Math.min(Math.floor(amount), remainingToday);
}

export function didReachTasbihTarget({
  amount,
  currentCount,
  target,
}: {
  amount: number;
  currentCount: number;
  target: number;
}): boolean {
  if (amount <= 0) return false;
  return Math.max(0, currentCount || 0) + amount >= Math.max(1, target || 1);
}

export function removeLowerTargetDuplicateTasbihat<T extends TasbihLike>(items: T[]): T[] {
  const chosenByText = new Map<string, T>();
  const chosenIndexByText = new Map<string, number>();

  items.forEach((item, index) => {
    const key = item.text.trim();
    if (!key) return;

    const existing = chosenByText.get(key);
    if (!existing) {
      chosenByText.set(key, item);
      chosenIndexByText.set(key, index);
      return;
    }

    if (item.target > existing.target) {
      chosenByText.set(key, item);
    }
  });

  return Array.from(chosenByText.entries())
    .sort((a, b) => (chosenIndexByText.get(a[0]) ?? 0) - (chosenIndexByText.get(b[0]) ?? 0))
    .map(([, item]) => item);
}
