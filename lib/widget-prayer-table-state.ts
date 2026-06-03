import type { WidgetPrayerData } from './widget-data';

export type PrayerTableKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface ResolvedPrayerTableRow {
  key: PrayerTableKey;
  name: string;
  nameAr: string;
  time: string;
  epochMs?: number;
  isPassed: boolean;
  isNext: boolean;
}

export interface ResolvedPrayerTableState {
  rows: ResolvedPrayerTableRow[];
  nextKey?: PrayerTableKey;
  nextRow?: ResolvedPrayerTableRow;
  nextEpochMs?: number;
  previousKey?: PrayerTableKey;
  previousRow?: ResolvedPrayerTableRow;
  previousEpochMs?: number;
}

const PRAYER_KEYS: PrayerTableKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

const DEFAULT_NAMES: Record<PrayerTableKey, { en: string; ar: string }> = {
  fajr: { en: 'Fajr', ar: 'الفجر' },
  sunrise: { en: 'Sunrise', ar: 'الشروق' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' },
};

const EPOCH_MATCH_TOLERANCE_MS = 90_000;

function finiteEpoch(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function cleanTime(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
}

function fallbackKeyForIndex(index: number): PrayerTableKey {
  return PRAYER_KEYS[index] ?? PRAYER_KEYS[PRAYER_KEYS.length - 1];
}

function epochMatches(a?: number, b?: number): boolean {
  return !!a && !!b && Math.abs(a - b) <= EPOCH_MATCH_TOLERANCE_MS;
}

export function normalizePrayerKey(value: unknown, fallbackIndex?: number): PrayerTableKey | undefined {
  const text = String(value ?? '').trim().toLowerCase();
  if (text) {
    if (text.includes('fajr') || text.includes('subh') || text.includes('الفجر') || text.includes('الصبح')) return 'fajr';
    if (text.includes('sunrise') || text.includes('shurooq') || text.includes('shuruk') || text.includes('الشروق')) return 'sunrise';
    if (text.includes('dhuhr') || text.includes('zuhr') || text.includes('jumu') || text.includes('الظهر') || text.includes('الجمعة')) return 'dhuhr';
    if (text.includes('asr') || text.includes('العصر')) return 'asr';
    if (text.includes('maghrib') || text.includes('المغرب')) return 'maghrib';
    if (text.includes('isha') || text.includes('العشاء')) return 'isha';
  }
  return typeof fallbackIndex === 'number' ? fallbackKeyForIndex(fallbackIndex) : undefined;
}

function buildRows(prayer?: WidgetPrayerData): ResolvedPrayerTableRow[] {
  return (prayer?.allPrayers ?? []).slice(0, 6).map((item, index) => {
    const key = normalizePrayerKey(item.name, index)
      ?? normalizePrayerKey(item.nameAr, index)
      ?? fallbackKeyForIndex(index);
    const defaults = DEFAULT_NAMES[key];
    const epochMs = finiteEpoch(item.epochMs);
    return {
      key,
      name: item.name || defaults.en,
      nameAr: item.nameAr || defaults.ar,
      time: cleanTime(item.time) ?? '--:--',
      epochMs,
      isPassed: !!item.isPassed,
      isNext: false,
    };
  });
}

function firstFutureEpoch(prayer: WidgetPrayerData | undefined, nowMs: number): number | undefined {
  return (prayer?.allPrayerEpochs ?? [])
    .map(finiteEpoch)
    .filter((epoch): epoch is number => !!epoch && epoch > nowMs)
    .sort((a, b) => a - b)[0];
}

function previousFlatEpoch(prayer: WidgetPrayerData | undefined, nowMs: number): number | undefined {
  return (prayer?.allPrayerEpochs ?? [])
    .map(finiteEpoch)
    .filter((epoch): epoch is number => !!epoch && epoch <= nowMs)
    .sort((a, b) => b - a)[0];
}

function latestPastEpoch(nowMs: number, ...values: Array<number | undefined>): number | undefined {
  return values
    .filter((epoch): epoch is number => typeof epoch === 'number' && epoch <= nowMs)
    .sort((a, b) => b - a)[0];
}

function rowForKey(rows: ResolvedPrayerTableRow[], key?: PrayerTableKey) {
  return key ? rows.find((row) => row.key === key) : undefined;
}

function rowForEpoch(rows: ResolvedPrayerTableRow[], epochMs?: number) {
  return rows.find((row) => epochMatches(row.epochMs, epochMs));
}

function nextKeyAfter(key: PrayerTableKey): PrayerTableKey {
  const index = PRAYER_KEYS.indexOf(key);
  return PRAYER_KEYS[(index + 1) % PRAYER_KEYS.length];
}

function previousKeyBefore(key: PrayerTableKey): PrayerTableKey {
  const index = PRAYER_KEYS.indexOf(key);
  return PRAYER_KEYS[(index + PRAYER_KEYS.length - 1) % PRAYER_KEYS.length];
}

export function resolvePrayerTableState(
  prayer: WidgetPrayerData | undefined,
  nowMs: number = Date.now(),
): ResolvedPrayerTableState {
  const rows = buildRows(prayer);
  if (!rows.length) return { rows: [] };

  const futureRow = rows
    .filter((row) => typeof row.epochMs === 'number' && row.epochMs > nowMs)
    .sort((a, b) => (a.epochMs ?? 0) - (b.epochMs ?? 0))[0];
  const nextAtEpoch = finiteEpoch(prayer?.nextPrayerAtEpochMs);
  const usableNextAt = nextAtEpoch && nextAtEpoch > nowMs ? nextAtEpoch : undefined;
  const flatFuture = firstFutureEpoch(prayer, nowMs);
  const explicitNextRow = rows.find((row, index) => !!prayer?.allPrayers?.[index]?.isNext);
  const declaredNextKey = normalizePrayerKey(prayer?.nextPrayer)
    ?? normalizePrayerKey(prayer?.nextPrayerName)
    ?? normalizePrayerKey(prayer?.nextPrayerNameAr);

  let nextRow: ResolvedPrayerTableRow | undefined;
  let nextEpochMs: number | undefined;

  if (futureRow) {
    nextRow = futureRow;
    nextEpochMs = futureRow.epochMs;
  } else if (rowForEpoch(rows, usableNextAt)) {
    nextRow = rowForEpoch(rows, usableNextAt);
    nextEpochMs = usableNextAt;
  } else if (rowForEpoch(rows, flatFuture)) {
    nextRow = rowForEpoch(rows, flatFuture);
    nextEpochMs = flatFuture;
  } else if (explicitNextRow) {
    nextRow = explicitNextRow;
    nextEpochMs = usableNextAt ?? explicitNextRow.epochMs ?? flatFuture;
  } else if (rowForKey(rows, declaredNextKey)) {
    nextRow = rowForKey(rows, declaredNextKey);
    nextEpochMs = usableNextAt ?? nextRow?.epochMs ?? flatFuture;
  } else {
    nextRow = rows[0];
    nextEpochMs = usableNextAt ?? nextRow.epochMs ?? flatFuture;
  }

  const nextKey = nextRow?.key;
  const nextDisplayTime = nextRow && nextKey === declaredNextKey && !epochMatches(nextRow.epochMs, nextEpochMs)
    ? cleanTime(prayer?.nextPrayerTime) ?? nextRow.time
    : nextRow?.time;

  const normalizedRows = rows.map((row) => {
    const isNext = row.key === nextKey;
    return {
      ...row,
      time: isNext ? (cleanTime(nextDisplayTime) ?? cleanTime(prayer?.nextPrayerTime) ?? row.time ?? '--:--') : row.time,
      isNext,
      isPassed: typeof row.epochMs === 'number' ? row.epochMs <= nowMs : row.isPassed,
    };
  });
  nextRow = normalizedRows.find((row) => row.key === nextKey);

  const previousRowByEpoch = normalizedRows
    .filter((row) => typeof row.epochMs === 'number' && row.epochMs <= nowMs && !row.isNext)
    .sort((a, b) => (b.epochMs ?? 0) - (a.epochMs ?? 0))[0];
  const declaredPreviousKey = normalizePrayerKey(prayer?.previousPrayerName)
    ?? normalizePrayerKey(prayer?.previousPrayerNameAr)
    ?? (nextKey ? previousKeyBefore(nextKey) : undefined);
  const previousRow = previousRowByEpoch
    ?? rowForKey(normalizedRows, declaredPreviousKey)
    ?? rowForKey(normalizedRows, nextKey ? previousKeyBefore(nextKey) : undefined);
  const declaredPreviousEpoch = finiteEpoch(prayer?.previousPrayerAtEpochMs);
  const flatPreviousEpoch = previousFlatEpoch(prayer, nowMs);
  const previousEpochMs = latestPastEpoch(nowMs, flatPreviousEpoch, declaredPreviousEpoch, previousRow?.epochMs)
    ?? declaredPreviousEpoch
    ?? previousRow?.epochMs;

  return {
    rows: normalizedRows,
    nextKey,
    nextRow,
    nextEpochMs: nextEpochMs ?? usableNextAt ?? flatFuture,
    previousKey: previousRow?.key,
    previousRow,
    previousEpochMs,
  };
}

export function nextPrayerStaticState(prayer: WidgetPrayerData | undefined, nowMs: number = Date.now()): PrayerTableKey | undefined {
  return resolvePrayerTableState(prayer, nowMs).nextKey;
}

export function followingPrayerKey(key: PrayerTableKey): PrayerTableKey {
  return nextKeyAfter(key);
}
