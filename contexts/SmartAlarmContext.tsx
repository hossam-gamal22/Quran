import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getCachedPrayerTimes, getTodayDateString, type PrayerTimes } from '@/lib/prayer-times';
import {
  loadSmartAlarmConfig,
  saveSmartAlarmConfig,
} from '@/lib/smart-alarm/storage';
import {
  cancelAllSmartAlarms,
  computeNextTrigger,
  scheduleSmartAlarms,
} from '@/lib/smart-alarm/scheduler';
import {
  DEFAULT_SMART_ALARM_CONFIG,
  type FajrAlarmConfig,
  type SmartAlarmConfig,
  type SuhoorAlarmConfig,
} from '@/lib/smart-alarm/types';

interface SmartAlarmContextValue {
  config: SmartAlarmConfig;
  isReady: boolean;
  nextFajrAlarm: Date | null;
  nextSuhoorAlarm: Date | null;
  setFajrConfig: (patch: Partial<FajrAlarmConfig>) => Promise<void>;
  setSuhoorConfig: (patch: Partial<SuhoorAlarmConfig>) => Promise<void>;
  /** Re-read prayer times from cache and reschedule based on current config. */
  refreshSchedule: () => Promise<void>;
  /** Disable everything (used by the ring screen on dismiss to clear stale notifs). */
  disableAll: () => Promise<void>;
}

const SmartAlarmContext = createContext<SmartAlarmContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

export function SmartAlarmProvider({ children }: ProviderProps) {
  const [config, setConfig] = useState<SmartAlarmConfig>(DEFAULT_SMART_ALARM_CONFIG);
  const [isReady, setIsReady] = useState(false);
  const [nextFajrAlarm, setNextFajrAlarm] = useState<Date | null>(null);
  const [nextSuhoorAlarm, setNextSuhoorAlarm] = useState<Date | null>(null);
  const rescheduleInFlight = useRef(false);

  const persistAndReschedule = useCallback(async (next: SmartAlarmConfig, prevFajrEnabled?: boolean) => {
    setConfig(next);
    await saveSmartAlarmConfig(next);
    if (rescheduleInFlight.current) return;
    rescheduleInFlight.current = true;
    try {
      const prayerTimes = await getCachedPrayerTimes(getTodayDateString());
      const result = await scheduleSmartAlarms(next, prayerTimes as PrayerTimes | null);
      setNextFajrAlarm(result.fajr.triggerAt);
      setNextSuhoorAlarm(result.suhoor.triggerAt);
      // When the smart Fajr toggle flips, ask the regular prayer scheduler to re-run.
      // It now sees the updated sync flag (isSmartFajrAlarmEnabled) and either
      // suppresses the regular Fajr notification or restores it.
      if (prevFajrEnabled !== undefined && prevFajrEnabled !== next.fajr.enabled) {
        try {
          const { rescheduleAllFromStorage } = await import('@/lib/notifications-manager');
          await rescheduleAllFromStorage();
        } catch (e) {
          if (__DEV__) console.warn('[SmartAlarm] regular-prayer reschedule failed', e);
        }
      }
    } finally {
      rescheduleInFlight.current = false;
    }
  }, []);

  const setFajrConfig = useCallback(
    async (patch: Partial<FajrAlarmConfig>) => {
      const next: SmartAlarmConfig = {
        ...config,
        fajr: { ...config.fajr, ...patch },
      };
      await persistAndReschedule(next, config.fajr.enabled);
    },
    [config, persistAndReschedule],
  );

  const setSuhoorConfig = useCallback(
    async (patch: Partial<SuhoorAlarmConfig>) => {
      const next: SmartAlarmConfig = {
        ...config,
        suhoor: { ...config.suhoor, ...patch },
      };
      await persistAndReschedule(next);
    },
    [config, persistAndReschedule],
  );

  const refreshSchedule = useCallback(async () => {
    if (rescheduleInFlight.current) return;
    rescheduleInFlight.current = true;
    try {
      const prayerTimes = await getCachedPrayerTimes(getTodayDateString());
      const result = await scheduleSmartAlarms(config, prayerTimes as PrayerTimes | null);
      setNextFajrAlarm(result.fajr.triggerAt);
      setNextSuhoorAlarm(result.suhoor.triggerAt);
    } finally {
      rescheduleInFlight.current = false;
    }
  }, [config]);

  const disableAll = useCallback(async () => {
    await cancelAllSmartAlarms();
    setNextFajrAlarm(null);
    setNextSuhoorAlarm(null);
  }, []);

  // Hydrate from storage on mount, then schedule
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadSmartAlarmConfig();
      if (cancelled) return;
      setConfig(loaded);
      setIsReady(true);
      try {
        const prayerTimes = await getCachedPrayerTimes(getTodayDateString());
        if (cancelled) return;
        const result = await scheduleSmartAlarms(loaded, prayerTimes as PrayerTimes | null);
        if (cancelled) return;
        setNextFajrAlarm(result.fajr.triggerAt);
        setNextSuhoorAlarm(result.suhoor.triggerAt);
      } catch (e) {
        if (__DEV__) console.warn('[SmartAlarm] initial schedule failed', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reschedule on app foreground (catches: yesterday's alarm fired, timezone changes, etc.)
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && isReady) {
        refreshSchedule().catch(() => {});
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [isReady, refreshSchedule]);

  // Recompute previewed "next" times once per minute so the card UI doesn't go stale
  useEffect(() => {
    if (!isReady) return;
    const tick = async () => {
      const prayerTimes = await getCachedPrayerTimes(getTodayDateString());
      if (!prayerTimes) return;
      if (config.fajr.enabled) {
        setNextFajrAlarm(
          computeNextTrigger(prayerTimes as PrayerTimes, config.fajr.offsetMinutes),
        );
      }
      // Suhoor's next time comes from the actual scheduling result (which
      // respects selectedDates) — NOT a blind fajr-offset calc. We only keep
      // it fresh here; if no future dates are selected, show nothing.
      if (!config.suhoor.enabled || config.suhoor.selectedDates.length === 0) {
        setNextSuhoorAlarm(null);
      }
    };
    const id = setInterval(() => {
      tick().catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [isReady, config.fajr.enabled, config.fajr.offsetMinutes, config.suhoor.enabled, config.suhoor.offsetMinutes, config.suhoor.selectedDates.length]);

  const value = useMemo<SmartAlarmContextValue>(
    () => ({
      config,
      isReady,
      nextFajrAlarm,
      nextSuhoorAlarm,
      setFajrConfig,
      setSuhoorConfig,
      refreshSchedule,
      disableAll,
    }),
    [config, isReady, nextFajrAlarm, nextSuhoorAlarm, setFajrConfig, setSuhoorConfig, refreshSchedule, disableAll],
  );

  return <SmartAlarmContext.Provider value={value}>{children}</SmartAlarmContext.Provider>;
}

export function useSmartAlarm(): SmartAlarmContextValue {
  const ctx = useContext(SmartAlarmContext);
  if (!ctx) throw new Error('useSmartAlarm must be used within SmartAlarmProvider');
  return ctx;
}
