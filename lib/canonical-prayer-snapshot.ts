import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  type Location,
  type PrayerName,
  type PrayerSettings,
  type PrayerTimes,
  getNextPrayer,
  getTodayDateString,
  timeStringToDate,
} from '@/lib/prayer-times';

export const CANONICAL_PRAYER_SNAPSHOT_KEY = '@canonical_prayer_snapshot_v1';
export const PRAYER_LOCATION_STABILITY_KM = 5;

const PRAYER_KEYS: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export interface CanonicalPrayerSnapshot {
  date: string;
  timezone: string;
  locationName: string;
  latitude: number;
  longitude: number;
  calculationMethod: number;
  madhab: 0 | 1;
  asrJuristic: 0 | 1;
  highLatitudeRule?: string;
  prayerTimes: PrayerTimes;
  fajrAtEpochMs: number;
  sunriseAtEpochMs: number;
  dhuhrAtEpochMs: number;
  asrAtEpochMs: number;
  maghribAtEpochMs: number;
  ishaAtEpochMs: number;
  nextPrayerName: PrayerName;
  nextPrayerAtEpochMs: number;
  previousPrayerName: PrayerName;
  previousPrayerAtEpochMs: number;
  generatedAtEpochMs: number;
  prayerDataUpdatedAt: string;
  settingsSignature: string;
  locationSignature: string;
  source: 'cached-location' | 'gps' | 'manual' | 'todayCache' | 'weekCache' | 'extrapolated' | 'localCalc' | 'countryFallback' | 'live';
}

function dateStringFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function prayerSettingsSignature(settings: Pick<PrayerSettings, 'calculationMethod' | 'asrJuristic' | 'adjustments'>): string {
  return JSON.stringify({
    method: settings.calculationMethod,
    asr: settings.asrJuristic,
    adjustments: settings.adjustments ?? {},
  });
}

export function prayerLocationSignature(location: Pick<Location, 'latitude' | 'longitude'>): string {
  return `${Number(location.latitude).toFixed(4)},${Number(location.longitude).toFixed(4)}`;
}

export function haversineDistanceKm(a: Pick<Location, 'latitude' | 'longitude'>, b: Pick<Location, 'latitude' | 'longitude'>): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

function epochFor(time: string, baseDate: Date): number {
  return timeStringToDate(time, baseDate).getTime();
}

function previousPrayerFromEpochs(epochs: Array<{ name: PrayerName; epochMs: number }>, nowMs: number) {
  return [...epochs].reverse().find((p) => p.epochMs <= nowMs) ?? epochs[epochs.length - 1];
}

export function buildCanonicalPrayerSnapshot(args: {
  times: PrayerTimes;
  location: Location;
  settings: Pick<PrayerSettings, 'calculationMethod' | 'asrJuristic' | 'adjustments'>;
  source: CanonicalPrayerSnapshot['source'];
  date?: Date;
  locationName?: string;
}): CanonicalPrayerSnapshot {
  const now = args.date ?? new Date();
  const nowMs = now.getTime();
  const date = dateStringFor(now);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locationName = args.locationName ?? [args.location.city, args.location.country].filter(Boolean).join(', ');

  const epochs = PRAYER_KEYS.map((name) => ({
    name,
    epochMs: epochFor(args.times[name], now),
  }));

  const next = getNextPrayer(args.times) ?? { name: 'fajr' as PrayerName, time: args.times.fajr };
  let nextPrayerAtEpochMs = epochFor(next.time, now);
  if (nextPrayerAtEpochMs <= nowMs) {
    nextPrayerAtEpochMs += 24 * 60 * 60 * 1000;
  }

  const previous = previousPrayerFromEpochs(epochs, nowMs);
  const previousPrayerAtEpochMs = previous.epochMs > nowMs
    ? previous.epochMs - 24 * 60 * 60 * 1000
    : previous.epochMs;

  const snapshot: CanonicalPrayerSnapshot = {
    date,
    timezone,
    locationName,
    latitude: args.location.latitude,
    longitude: args.location.longitude,
    calculationMethod: args.settings.calculationMethod,
    madhab: (args.settings.asrJuristic === 1 ? 1 : 0) as 0 | 1,
    asrJuristic: (args.settings.asrJuristic === 1 ? 1 : 0) as 0 | 1,
    prayerTimes: args.times,
    fajrAtEpochMs: epochs.find((p) => p.name === 'fajr')!.epochMs,
    sunriseAtEpochMs: epochs.find((p) => p.name === 'sunrise')!.epochMs,
    dhuhrAtEpochMs: epochs.find((p) => p.name === 'dhuhr')!.epochMs,
    asrAtEpochMs: epochs.find((p) => p.name === 'asr')!.epochMs,
    maghribAtEpochMs: epochs.find((p) => p.name === 'maghrib')!.epochMs,
    ishaAtEpochMs: epochs.find((p) => p.name === 'isha')!.epochMs,
    nextPrayerName: next.name,
    nextPrayerAtEpochMs,
    previousPrayerName: previous.name,
    previousPrayerAtEpochMs,
    generatedAtEpochMs: nowMs,
    prayerDataUpdatedAt: new Date(nowMs).toISOString(),
    settingsSignature: prayerSettingsSignature(args.settings),
    locationSignature: prayerLocationSignature(args.location),
    source: args.source,
  };

  console.log('[PrayerCanonical] app snapshot:', snapshot);
  console.log('[PrayerCanonical] app timezone:', snapshot.timezone);
  console.log('[PrayerCanonical] app nextPrayerAtEpochMs:', snapshot.nextPrayerAtEpochMs);
  console.log('[PrayerCanonical] calculation method:', snapshot.calculationMethod);
  console.log('[PrayerCanonical] location:', snapshot.latitude, snapshot.longitude, snapshot.locationName);
  return snapshot;
}

export async function saveCanonicalPrayerSnapshot(snapshot: CanonicalPrayerSnapshot): Promise<void> {
  await AsyncStorage.setItem(CANONICAL_PRAYER_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export async function loadCanonicalPrayerSnapshot(options: {
  date?: string;
  settings?: Pick<PrayerSettings, 'calculationMethod' | 'asrJuristic' | 'adjustments'>;
  location?: Pick<Location, 'latitude' | 'longitude'> | null;
  maxLocationDriftKm?: number;
  allowAnySameDayLocation?: boolean;
} = {}): Promise<CanonicalPrayerSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(CANONICAL_PRAYER_SNAPSHOT_KEY);
    if (!raw) return null;
    const snapshot = JSON.parse(raw) as CanonicalPrayerSnapshot;
    const expectedDate = options.date ?? getTodayDateString();
    if (snapshot.date !== expectedDate) return null;
    if (options.settings && snapshot.settingsSignature !== prayerSettingsSignature(options.settings)) return null;
    if (options.location && !options.allowAnySameDayLocation) {
      const drift = haversineDistanceKm(snapshot, options.location);
      if (drift > (options.maxLocationDriftKm ?? PRAYER_LOCATION_STABILITY_KM)) return null;
    }
    console.log('[PrayerCanonical] widget loaded snapshot:', snapshot);
    console.log('[PrayerCanonical] widget timezone:', snapshot.timezone);
    console.log('[PrayerCanonical] widget nextPrayerAtEpochMs:', snapshot.nextPrayerAtEpochMs);
    return snapshot;
  } catch (e) {
    console.warn('[PrayerCanonical] failed to load snapshot:', e);
    return null;
  }
}

export function canonicalPrayerTimes(snapshot: CanonicalPrayerSnapshot): PrayerTimes {
  return snapshot.prayerTimes;
}
