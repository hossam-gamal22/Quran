/**
 * Foreground Adhan Trigger
 *
 * Solves the "app is open, prayer time arrives, no sound plays" bug. iOS and
 * Android both suppress notification sounds while the app is in the foreground,
 * and there was no JS-side fallback. This hook ticks every second, watches for
 * prayer-time crossings, and plays the user's selected adhan via the bundled
 * sound file. Also handles a 60-second catch-up window when the app comes back
 * to the foreground shortly after a missed prayer time.
 *
 * Wired once at the app root so it works regardless of which screen is active.
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '@/contexts/SettingsContext';
import { ADHAN_SOUNDS, playSound } from '@/lib/sound-manager';
import { getPrayerLocation } from '@/lib/storage';
import { getOfflinePrayerTimes } from '@/lib/prayer-week-cache';
import type { PrayerTimes } from '@/lib/prayer-times';

type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const TICK_MS = 1000;
const TOLERANCE_MS = 2000; // ±2s match window
const CATCHUP_WINDOW_MS = 60_000; // 60s after-the-fact catch-up
const FIRED_KEY_PREFIX = '@foreground_adhan_fired_';

export interface ForegroundAdhanEvent {
  prayer: PrayerKey;
  timeStr: string; // "HH:MM"
}

interface UseForegroundAdhanOpts {
  /** Optional callback fired whenever the hook plays an adhan, used by the UI banner. */
  onAdhanFired?: (e: ForegroundAdhanEvent) => void;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function firedStorageKey(prayer: PrayerKey): string {
  return `${FIRED_KEY_PREFIX}${todayKey()}_${prayer}`;
}

function parseTimeToToday(time: string): Date | null {
  if (!time) return null;
  const cleaned = time.replace(/\s*\([^)]*\)\s*/, '').trim();
  const parts = cleaned.split(':').map(Number);
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  const d = new Date();
  d.setHours(parts[0], parts[1], 0, 0);
  return d;
}

export function useForegroundAdhan(opts: UseForegroundAdhanOpts = {}) {
  const { settings } = useSettings();
  const firedRef = useRef<Set<string>>(new Set());
  const prayerTimesRef = useRef<PrayerTimes | null>(null);
  const lastLoadAtRef = useRef<number>(0);

  // Load prayer times (offline-first) and refresh every 30 minutes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const loc = await getPrayerLocation();
        if (!loc && Date.now() - lastLoadAtRef.current < 5 * 60_000) return;
        const result = await getOfflinePrayerTimes();
        if (!cancelled && result.times) {
          prayerTimesRef.current = result.times;
          lastLoadAtRef.current = Date.now();
        }
      } catch (e) {
        console.warn('[foreground-adhan] load failed:', e);
      }
    };
    load();
    const interval = setInterval(load, 30 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    settings.prayer.calculationMethod,
    settings.prayer.asrJuristic,
  ]);

  useEffect(() => {
    const notif = settings.notifications;
    if (!notif?.enabled || !notif?.prayerTimes) return;

    let cancelled = false;

    const tryFire = async (prayer: PrayerKey, timeStr: string) => {
      // Per-prayer toggle check (read from notifSettings; fall back to true).
      const perPrayerEnabled = (notif as any)[prayer];
      if (perPrayerEnabled === false) return;

      const adhanType = (notif.adhanSoundType && notif.adhanSoundType !== 'default')
        ? notif.adhanSoundType
        : 'makkah';
      if (adhanType === 'silent') return;

      const key = firedStorageKey(prayer);
      // In-memory + persisted dedupe (survives reopen on the same day).
      if (firedRef.current.has(key)) return;
      try {
        const persisted = await AsyncStorage.getItem(key);
        if (persisted) {
          firedRef.current.add(key);
          return;
        }
      } catch {}

      firedRef.current.add(key);
      AsyncStorage.setItem(key, '1').catch(() => {});

      const source = ADHAN_SOUNDS[adhanType] ?? ADHAN_SOUNDS.makkah;
      console.log(`🕌 [foreground-adhan] Playing ${adhanType} for ${prayer} @ ${timeStr}`);
      playSound(source).catch((e) => console.warn('[foreground-adhan] playSound failed:', e));
      opts.onAdhanFired?.({ prayer, timeStr });
    };

    const checkOnce = (allowCatchup: boolean) => {
      const times = prayerTimesRef.current;
      if (!times) return;
      const now = Date.now();
      for (const p of PRAYER_KEYS) {
        const t = (times as any)[p] as string | undefined;
        if (!t) continue;
        const target = parseTimeToToday(t);
        if (!target) continue;
        const diff = now - target.getTime();
        // Match window: from -TOLERANCE_MS up to +TOLERANCE_MS (ticker accuracy)
        // Catch-up window: 0 .. CATCHUP_WINDOW_MS after the time, only triggered
        // by AppState change (not the per-second ticker, to avoid duplicates).
        const inLive = diff >= -TOLERANCE_MS && diff <= TOLERANCE_MS;
        const inCatchup = allowCatchup && diff > TOLERANCE_MS && diff <= CATCHUP_WINDOW_MS;
        if (inLive || inCatchup) {
          tryFire(p, t);
        }
      }
    };

    const interval = setInterval(() => {
      if (cancelled) return;
      checkOnce(false);
    }, TICK_MS);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        // On foreground resume: clear in-memory dedupe entries from previous days
        // (the persisted keys are already date-scoped) and run a catch-up sweep.
        const today = todayKey();
        const stale = Array.from(firedRef.current).filter((k) => !k.includes(today));
        for (const k of stale) firedRef.current.delete(k);
        checkOnce(true);
      }
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
    };
  }, [
    settings.notifications,
    opts.onAdhanFired,
  ]);
}
