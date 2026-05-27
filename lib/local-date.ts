export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function msUntilNextLocalDay(date: Date = new Date(), bufferMs = 1000): number {
  const next = new Date(date);
  next.setHours(24, 0, 0, bufferMs);
  return Math.max(0, next.getTime() - date.getTime());
}
