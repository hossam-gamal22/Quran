/**
 * Unified source of truth for prayer calculation parameters.
 *
 * Reads from `app_settings` (primary, written by SettingsContext) with fallback
 * to `@prayer_settings` (legacy). When neither exists, Makkah/Umm Al-Qura is
 * the app-wide approximate fallback so fresh installs never inherit device
 * region as a prayer location.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAKKAH_FALLBACK_DEFAULTS,
} from '@/lib/country-prayer-defaults';

export interface EffectivePrayerCalcSettings {
  calculationMethod: number;
  asrJuristic: 0 | 1;
  adjustments: Record<string, number>;
  source: 'app_settings' | 'prayer_settings' | 'country_default' | 'fallback';
}

/** Returns the effective method/school/adjustments used by display + notifications. */
export async function getEffectivePrayerCalcSettings(): Promise<EffectivePrayerCalcSettings> {
  // 1. Try app_settings (SettingsContext)
  try {
    const raw = await AsyncStorage.getItem('app_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.prayer && typeof parsed.prayer.calculationMethod === 'number') {
        return {
          calculationMethod: parsed.prayer.calculationMethod,
          asrJuristic: (parsed.prayer.asrJuristic === 1 ? 1 : 0) as 0 | 1,
          adjustments: parsed.prayer.adjustments ?? {},
          source: 'app_settings',
        };
      }
    }
  } catch (e) {
    console.warn('[prayer-settings-source] app_settings read failed:', e);
  }

  // 2. Try @prayer_settings (legacy)
  try {
    const raw = await AsyncStorage.getItem('@prayer_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.calculationMethod === 'number') {
        return {
          calculationMethod: parsed.calculationMethod,
          asrJuristic: (parsed.asrJuristic === 1 ? 1 : 0) as 0 | 1,
          adjustments: parsed.adjustments ?? {},
          source: 'prayer_settings',
        };
      }
    }
  } catch (e) {
    console.warn('[prayer-settings-source] @prayer_settings read failed:', e);
  }

  // 3. App-wide fallback: Makkah/Umm Al-Qura
  return {
    calculationMethod: MAKKAH_FALLBACK_DEFAULTS.method,
    asrJuristic: MAKKAH_FALLBACK_DEFAULTS.asrSchool,
    adjustments: {},
    source: 'fallback',
  };
}
