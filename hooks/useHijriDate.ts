// hooks/useHijriDate.ts
// React hook for per-country Hijri date with 4-layer resolution

import { useState, useEffect, useCallback } from 'react';
import {
  getHijriDate,
  getUserCountry,
  getUserAdjustment,
  setUserAdjustment,
  setUserCountry,
  refreshHijriInBackground,
  type HijriResult,
} from '@/services/hijriCalendarService';
import { gregorianToHijri, HIJRI_MONTHS_AR, HIJRI_MONTHS_EN } from '@/lib/hijri-date';

interface UseHijriDateReturn {
  hijri: HijriResult | null;
  loading: boolean;
  error: string | null;
  countryCode: string;
  userAdjustment: number;
  /** Refresh the Hijri date (re-fetches from all layers) */
  refresh: () => Promise<void>;
  /** Set user's manual ±1 adjustment */
  setAdjustment: (adj: number) => Promise<void>;
  /** Set user's country for Hijri calculation */
  changeCountry: (code: string) => Promise<void>;
  /** Get Hijri date for a specific Gregorian date (for calendar grid) */
  getHijriForDate: (date: Date) => Promise<HijriResult>;
}

export function useHijriDate(initialDate?: Date): UseHijriDateReturn {
  const [hijri, setHijri] = useState<HijriResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('SA');
  const [userAdjustment, setUserAdj] = useState(0);

  const fetchDate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const country = await getUserCountry();
      const adj = await getUserAdjustment();
      setCountryCode(country);
      setUserAdj(adj);

      const result = await getHijriDate(initialDate || new Date(), country);
      setHijri(result);
    } catch (e: any) {
      setError(e?.message || 'Failed to get Hijri date');
      // Fallback to pure calculation
      const date = initialDate || new Date();
      const calc = gregorianToHijri(date);
      setHijri({
        day: calc.day,
        month: calc.month,
        year: calc.year,
        monthLength: calc.month % 2 === 1 ? 30 : 29,
        monthName: HIJRI_MONTHS_EN[calc.month - 1] || '',
        monthNameAr: HIJRI_MONTHS_AR[calc.month - 1] || '',
        source: 'calculation',
        countryCode: 'SA',
        confidence: 'low',
      });
    } finally {
      setLoading(false);
    }
  }, [initialDate]);

  useEffect(() => {
    fetchDate();
    // Background refresh after initial load
    refreshHijriInBackground().catch(() => {});
  }, [fetchDate]);

  const refresh = useCallback(async () => {
    await fetchDate();
  }, [fetchDate]);

  const setAdjustment = useCallback(async (adj: number) => {
    await setUserAdjustment(adj);
    setUserAdj(adj);
    await fetchDate();
  }, [fetchDate]);

  const changeCountry = useCallback(async (code: string) => {
    await setUserCountry(code);
    setCountryCode(code);
    await fetchDate();
  }, [fetchDate]);

  const getHijriForDate = useCallback(async (date: Date): Promise<HijriResult> => {
    try {
      return await getHijriDate(date, countryCode);
    } catch {
      const calc = gregorianToHijri(date);
      return {
        day: calc.day,
        month: calc.month,
        year: calc.year,
        monthLength: calc.month % 2 === 1 ? 30 : 29,
        monthName: HIJRI_MONTHS_EN[calc.month - 1] || '',
        monthNameAr: HIJRI_MONTHS_AR[calc.month - 1] || '',
        source: 'calculation',
        countryCode,
        confidence: 'low',
      };
    }
  }, [countryCode]);

  return {
    hijri,
    loading,
    error,
    countryCode,
    userAdjustment,
    refresh,
    setAdjustment,
    changeCountry,
    getHijriForDate,
  };
}
