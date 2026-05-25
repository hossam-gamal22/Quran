// lib/live-activity-sync.ts
// Auto-start/refresh Live Activity from cached prayer times
// Called from _layout.tsx on app launch and app-state=active

import { Platform } from 'react-native';
import {
  getLiveActivitySettings,
  startLiveActivity,
  updateLiveActivity,
  endLiveActivity,
  LiveActivityData,
} from '@/lib/live-activities';
import { getCachedPrayerTimes, getTodayDateString, formatPrayerTime, getPrayerTranslationKey, type PrayerName } from '@/lib/prayer-times';
import { getOfflinePrayerTimes } from '@/lib/prayer-week-cache';
import { getWidgetSettings } from '@/lib/widget-data';
import { getLanguage, t } from '@/lib/i18n';
import { getLocalizedHijriDate } from '@/lib/hijri-date';

// Track last refresh outcome for UI surfacing
let lastRefreshResult: { ok: boolean; reason?: string; source?: string } = { ok: false, reason: 'never_called' };
export function getLastRefreshResult() { return lastRefreshResult; }

/**
 * Refresh or auto-start the Live Activity using cached prayer data.
 * Safe to call from _layout.tsx — does nothing if disabled or no cached data.
 * Returns true if Live Activity was started/updated successfully.
 */
export async function refreshLiveActivityIfEnabled(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    lastRefreshResult = { ok: false, reason: 'not_ios' };
    return false;
  }

  try {
    const laSettings = await getLiveActivitySettings();
    console.log('📍 LA refresh: settings =', JSON.stringify(laSettings));
    if (!laSettings.enabled) {
      lastRefreshResult = { ok: false, reason: 'disabled_in_settings' };
      return false;
    }

    const today = getTodayDateString();
    let times = await getCachedPrayerTimes(today);
    let source = 'today_cache';
    if (!times) {
      // Fallback chain: week cache → extrapolation → local calculation from stored coords
      try {
        const offline = await getOfflinePrayerTimes(today);
        if (offline?.times) {
          times = offline.times;
          source = offline.source || 'offline';
          console.log(`📍 LA refresh: using offline prayer times (source=${source})`);
        }
      } catch (e) {
        console.warn('📍 LA refresh: offline fallback failed:', e);
      }
    } else {
      console.log('📍 LA refresh: using today cache');
    }
    if (!times) {
      console.log('📍 LA refresh skipped — no prayer times available (cache empty + no stored location)');
      lastRefreshResult = { ok: false, reason: 'no_prayer_times' };
      return false;
    }

    const prayerDefs: { key: string; engKey: string }[] = [
      { key: 'fajr', engKey: 'fajr' },
      { key: 'dhuhr', engKey: 'dhuhr' },
      { key: 'asr', engKey: 'asr' },
      { key: 'maghrib', engKey: 'maghrib' },
      { key: 'isha', engKey: 'isha' },
    ];

    const now = new Date();
    const allPrayers = prayerDefs.map(p => {
      const raw = (times as any)[p.key] as string;
      if (!raw) return null;
      const [h, m] = raw.split(':').map(Number);
      const pTime = new Date();
      pTime.setHours(h, m, 0, 0);
      return {
        name: p.engKey,
        nameAr: t(getPrayerTranslationKey(p.engKey as PrayerName)),
        time: formatPrayerTime(raw, false),
        passed: pTime < now,
      };
    }).filter(Boolean) as { name: string; nameAr: string; time: string; passed: boolean }[];

    if (allPrayers.length === 0) return false;

    // Add sunrise if available
    if (times.sunrise) {
      const [sh, sm] = (times.sunrise as string).split(':').map(Number);
      const sTime = new Date();
      sTime.setHours(sh, sm, 0, 0);
      allPrayers.splice(1, 0, {
        name: 'sunrise',
        nameAr: t('prayer.sunrise'),
        time: formatPrayerTime(times.sunrise, false),
        passed: sTime < now,
      });
    }

    // If all 5 main prayers have passed (after Isha), end the Live Activity
    const mainPrayers = allPrayers.filter(p => p.name !== 'sunrise');
    const allPassed = mainPrayers.length > 0 && mainPrayers.every(p => p.passed);
    if (allPassed) {
      await endLiveActivity();
      if (__DEV__) console.log('📍 Live Activity ended — all prayers passed');
      return false;
    }

    const nextPrayer = allPrayers.find(p => !p.passed && p.name !== 'sunrise') || allPrayers[allPrayers.length - 1];
    const nextKey = nextPrayer.name;
    const raw = (times as any)[nextKey] as string;
    const nextTime = new Date();
    if (raw) {
      const [ph, pm] = raw.split(':').map(Number);
      nextTime.setHours(ph, pm, 0, 0);
    }
    const remainingMinutes = Math.max(0, Math.round((nextTime.getTime() - now.getTime()) / 60000));

    const hijri = getLocalizedHijriDate();
    const hijriStr = hijri ? `${hijri.day} ${hijri.monthName} ${hijri.year}` : '';

    const widgetSettings = await getWidgetSettings();
    void widgetSettings;
    const accentColor = '#0d8e62';
    const colorScheme = 'auto';
    const language = getLanguage();

    const data: LiveActivityData = {
      nextPrayerName: nextPrayer.name,
      nextPrayerNameAr: nextPrayer.nameAr,
      nextPrayerTime: nextPrayer.time,
      timeRemainingMinutes: remainingMinutes,
      allPrayers,
      hijriDate: hijriStr,
      style: laSettings.style,
      accentColor,
      colorScheme,
      language,
    };

    if (times.sunrise) {
      data.sunriseTime = formatPrayerTime(times.sunrise, false);
    }

    // Try update first, fallback to start
    console.log(`📍 LA refresh: calling updateLiveActivity (next=${nextPrayer.nameAr}, in=${remainingMinutes}m)`);
    const updated = await updateLiveActivity(data);
    let started = false;
    if (!updated) {
      console.log('📍 LA refresh: update returned false, calling startLiveActivity');
      started = await startLiveActivity(data);
      console.log(`📍 LA refresh: startLiveActivity returned ${started}`);
    } else {
      console.log('📍 LA refresh: update succeeded');
    }

    const ok = updated || started;
    lastRefreshResult = { ok, reason: ok ? 'success' : 'native_failed', source };
    return ok;
  } catch (e: any) {
    console.log('📍 LA refresh failed with exception:', e);
    lastRefreshResult = { ok: false, reason: `exception: ${e?.message || String(e)}` };
    return false;
  }
}
