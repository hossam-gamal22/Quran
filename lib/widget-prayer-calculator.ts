// lib/widget-prayer-calculator.ts
//
// Offline prayer-time computation for the Android widget headless task and
// (potentially) any future surface that needs to compute prayer times in JS
// without calling the AlAdhan API.
//
// Uses the already-installed `adhan` npm package (v4.4.3, batoulapps' official
// JS port — math-identical to adhan-swift, which the iOS widget extension
// vendors). The widget extension on iOS computes natively in Swift; this file
// is the JS counterpart so Android can stay self-sufficient when the user
// hasn't opened the app for weeks.
//
// SINGLE INPUT CONTRACT: the JSON written into the App Group (iOS) and
// AsyncStorage (Android) under the key `widget_prayer_inputs`. iOS reads it
// from UserDefaults via PrayerInputs.swift; Android reads it via
// readPrayerInputs() below. Same shape, same field names.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  PrayerTimes,
  Madhab,
  HighLatitudeRule,
} from 'adhan';
import {
  dateForTimeZoneCalendarDay,
  epochForCalendarDayLocalTime,
  partsInTimeZone,
} from './widget-timezone';

export const PRAYER_INPUTS_KEY = '@widget_prayer_inputs';
export const PRAYER_INPUTS_VERSION = 1 as const;

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerWidgetInputs {
  version: typeof PRAYER_INPUTS_VERSION;
  latitude: number;
  longitude: number;
  timezone: string;                 // IANA, e.g. "Asia/Dubai"
  /** Timezone of the calculation coordinates. Prayer wall-clock values are
   *  extracted here, then composed onto the visible phone timezone above. */
  calculationTimezone?: string;
  calculationMethod: CalculationMethodId;
  madhab: 'shafi' | 'hanafi';
  highLatitudeRule?: HighLatRuleId;
  timeFormat: '12h' | '24h';
  numerals: 'western' | 'arabic';
  adjustments?: Partial<Record<PrayerKey, number>>;
  /** Per-prayer minute correction inferred from the latest API-backed day.
   *  Kept separate from user adjustments so offline widgets preserve both. */
  providerCalibration?: Partial<Record<PrayerKey, number>>;
  writtenAt: string;                // ISO 8601
}

/** AlAdhan numeric method ID, kept identical to the value the app already saves
 *  in `prayer_settings.calculationMethod`. */
export type CalculationMethodId =
  | 0 | 1 | 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14
  | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 99;

export type HighLatRuleId =
  | 'middleOfTheNight'
  | 'seventhOfTheNight'
  | 'twilightAngle';

// ---------------------------------------------------------------------------
// Input persistence
// ---------------------------------------------------------------------------

export async function readPrayerInputs(): Promise<PrayerWidgetInputs | null> {
  try {
    const raw = await AsyncStorage.getItem(PRAYER_INPUTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== PRAYER_INPUTS_VERSION) return null;
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') return null;
    return parsed as PrayerWidgetInputs;
  } catch {
    return null;
  }
}

export async function writePrayerInputsLocal(inputs: PrayerWidgetInputs): Promise<void> {
  await AsyncStorage.setItem(PRAYER_INPUTS_KEY, JSON.stringify(inputs));
}

// ---------------------------------------------------------------------------
// adhan parameter construction
// ---------------------------------------------------------------------------

function paramsForMethod(methodId: CalculationMethodId): CalculationParameters {
  switch (methodId) {
    case 1: return CalculationMethod.Karachi();
    case 2: return CalculationMethod.NorthAmerica();
    case 3: return CalculationMethod.MuslimWorldLeague();
    case 4: return CalculationMethod.UmmAlQura();
    case 5: return CalculationMethod.Egyptian();
    case 7: return CalculationMethod.Tehran();
    case 8: return CalculationMethod.Dubai();
    case 9: return CalculationMethod.Kuwait();
    case 10: return CalculationMethod.Qatar();
    case 11: return CalculationMethod.Singapore();
    case 13: return CalculationMethod.Turkey();
    case 15: return CalculationMethod.MoonsightingCommittee();
    case 16: return CalculationMethod.Dubai();
    // Methods adhan-js doesn't model natively — fall back to MWL.
    // The app already uses these rarely; visual difference is sub-minute for
    // most non-polar lat/lon.
    case 0:
    case 12:
    case 14:
    case 17:
    case 18:
    case 19:
    case 20:
    case 21:
    case 22:
    case 23:
    case 99:
    default: return CalculationMethod.MuslimWorldLeague();
  }
}

function highLatRule(id: HighLatRuleId | undefined): typeof HighLatitudeRule[keyof typeof HighLatitudeRule] | undefined {
  switch (id) {
    case 'middleOfTheNight': return HighLatitudeRule.MiddleOfTheNight;
    case 'seventhOfTheNight': return HighLatitudeRule.SeventhOfTheNight;
    case 'twilightAngle': return HighLatitudeRule.TwilightAngle;
    default: return undefined;
  }
}

function buildParams(inputs: PrayerWidgetInputs): CalculationParameters {
  const params = paramsForMethod(inputs.calculationMethod);
  params.madhab = inputs.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  const rule = highLatRule(inputs.highLatitudeRule);
  if (rule) params.highLatitudeRule = rule;
  if (inputs.adjustments) {
    params.adjustments = {
      ...params.adjustments,
      ...inputs.adjustments,
    };
  }
  if (inputs.providerCalibration) {
    params.adjustments = {
      ...params.adjustments,
      ...Object.fromEntries(
        PRAYER_ORDER.map((key) => [
          key,
          (params.adjustments[key] ?? 0) + (inputs.providerCalibration?.[key] ?? 0),
        ]),
      ),
    };
  }
  return params;
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

export interface DayPrayerTimes {
  date: Date;
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

function normalizePrayerDateForDisplay(
  rawDate: Date,
  referenceDate: Date,
  inputs: PrayerWidgetInputs,
): Date {
  const calculationTimezone = inputs.calculationTimezone || inputs.timezone;
  const clock = partsInTimeZone(rawDate, calculationTimezone);
  const displayDay = partsInTimeZone(referenceDate, inputs.timezone);
  return new Date(epochForCalendarDayLocalTime(
    displayDay.year,
    displayDay.month,
    displayDay.day,
    clock.hour,
    clock.minute,
    inputs.timezone,
  ));
}

function toDayPrayerTimes(pt: PrayerTimes, date: Date, inputs: PrayerWidgetInputs): DayPrayerTimes {
  return {
    date: pt.date,
    fajr: normalizePrayerDateForDisplay(pt.fajr, date, inputs),
    sunrise: normalizePrayerDateForDisplay(pt.sunrise, date, inputs),
    dhuhr: normalizePrayerDateForDisplay(pt.dhuhr, date, inputs),
    asr: normalizePrayerDateForDisplay(pt.asr, date, inputs),
    maghrib: normalizePrayerDateForDisplay(pt.maghrib, date, inputs),
    isha: normalizePrayerDateForDisplay(pt.isha, date, inputs),
  };
}

export function computePrayerTimesForDay(inputs: PrayerWidgetInputs, date: Date): DayPrayerTimes {
  const coords = new Coordinates(inputs.latitude, inputs.longitude);
  const params = buildParams(inputs);
  return toDayPrayerTimes(new PrayerTimes(coords, date, params), date, inputs);
}

export function computePrayerTimesForRange(
  inputs: PrayerWidgetInputs,
  startDate: Date,
  days: number,
): DayPrayerTimes[] {
  const coords = new Coordinates(inputs.latitude, inputs.longitude);
  const params = buildParams(inputs);
  const out: DayPrayerTimes[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    out.push(toDayPrayerTimes(new PrayerTimes(coords, d, params), d, inputs));
  }
  return out;
}

// ---------------------------------------------------------------------------
// State resolution — which prayer is active / next / previous
// ---------------------------------------------------------------------------

export const PRAYER_ORDER: PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface PrayerState {
  active: PrayerKey;     // For widgets that show "active" (current window)
  next: PrayerKey;       // Always the next upcoming
  previous: PrayerKey;   // Always the most recently passed
  nextAt: Date;          // Wall-clock date of `next`
  previousAt: Date;      // Wall-clock date of `previous`
}

/** Resolve prayer state across today + tomorrow boundaries.
 *  Sunrise is treated as a full first-class state per the user's confirmation.
 */
export function resolvePrayerState(
  inputs: PrayerWidgetInputs,
  now: Date,
): PrayerState {
  const todayDate = dateForTimeZoneCalendarDay(now, inputs.timezone, 0);
  const today = computePrayerTimesForDay(inputs, todayDate);
  const tomorrow = computePrayerTimesForDay(inputs, dateForTimeZoneCalendarDay(now, inputs.timezone, 1));
  const yesterday = computePrayerTimesForDay(inputs, dateForTimeZoneCalendarDay(now, inputs.timezone, -1));

  // Build a flat ordered list spanning yesterday→tomorrow with prayer keys
  // attached. This lets us pick the previous-passed and next-upcoming
  // reliably even at midnight / pre-Fajr.
  type Entry = { key: PrayerKey; date: Date };
  const flat: Entry[] = [
    ...PRAYER_ORDER.map<Entry>((k) => ({ key: k, date: yesterday[k] })),
    ...PRAYER_ORDER.map<Entry>((k) => ({ key: k, date: today[k] })),
    ...PRAYER_ORDER.map<Entry>((k) => ({ key: k, date: tomorrow[k] })),
  ];

  let previous: Entry = flat[0];
  let next: Entry = flat[flat.length - 1];
  for (let i = 0; i < flat.length; i++) {
    if (flat[i].date <= now) previous = flat[i];
    else { next = flat[i]; break; }
  }
  return {
    active: previous.key,
    next: next.key,
    previous: previous.key,
    nextAt: next.date,
    previousAt: previous.date,
  };
}

// ---------------------------------------------------------------------------
// Convenience for the Android task handler
// ---------------------------------------------------------------------------

export interface FlatPrayerSnapshot {
  /** ISO date string, "YYYY-MM-DD" of `now`'s local date. */
  date: string;
  /** Seven-day flat list of prayer epochs (ms since 1970) starting at today
   *  fajr through day+6 isha. Used by iOS Swift views that already read a flat
   *  epoch list as well as the Android renderer. */
  allPrayerEpochs: number[];
  active: PrayerKey;
  next: PrayerKey;
  previous: PrayerKey;
  nextAtEpochMs: number;
  previousAtEpochMs: number;
  todayTimes: Record<PrayerKey, number>;
}

export function computeFlatSnapshot(
  inputs: PrayerWidgetInputs,
  now: Date = new Date(),
  days: number = 7,
): FlatPrayerSnapshot {
  const startOfToday = dateForTimeZoneCalendarDay(now, inputs.timezone, 0);
  const range = computePrayerTimesForRange(inputs, startOfToday, days);
  const state = resolvePrayerState(inputs, now);

  const epochs: number[] = [];
  for (const day of range) {
    for (const key of PRAYER_ORDER) {
      epochs.push(day[key].getTime());
    }
  }

  const today = range[0];
  const todayTimes: Record<PrayerKey, number> = {
    fajr: today.fajr.getTime(),
    sunrise: today.sunrise.getTime(),
    dhuhr: today.dhuhr.getTime(),
    asr: today.asr.getTime(),
    maghrib: today.maghrib.getTime(),
    isha: today.isha.getTime(),
  };

  const localNow = partsInTimeZone(now, inputs.timezone);
  const yyyy = localNow.year;
  const mm = String(localNow.month).padStart(2, '0');
  const dd = String(localNow.day).padStart(2, '0');

  return {
    date: `${yyyy}-${mm}-${dd}`,
    allPrayerEpochs: epochs,
    active: state.active,
    next: state.next,
    previous: state.previous,
    nextAtEpochMs: state.nextAt.getTime(),
    previousAtEpochMs: state.previousAt.getTime(),
    todayTimes,
  };
}
