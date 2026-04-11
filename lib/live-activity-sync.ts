// lib/live-activity-sync.ts
// Auto-start/refresh Live Activity from cached prayer times
// Called from _layout.tsx on app launch and app-state=active

import { Platform } from 'react-native';
import {
  getLiveActivitySettings,
  startLiveActivity,
  updateLiveActivity,
  LiveActivityData,
} from '@/lib/live-activities';
import { getCachedPrayerTimes, getTodayDateString, formatPrayerTime } from '@/lib/prayer-times';
import { getWidgetSettings } from '@/lib/widget-data';
import { getLanguage, t } from '@/lib/i18n';
import { getLocalizedHijriDate } from '@/lib/hijri-date';

/**
 * Refresh or auto-start the Live Activity using cached prayer data.
 * Safe to call from _layout.tsx — does nothing if disabled or no cached data.
 */
export async function refreshLiveActivityIfEnabled(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const laSettings = await getLiveActivitySettings();
    if (!laSettings.enabled) return;

    const today = getTodayDateString();
    const times = await getCachedPrayerTimes(today);
    if (!times) return; // No cached data yet — prayer.tsx will handle it

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
        nameAr: t(`prayer.${p.engKey}`),
        time: formatPrayerTime(raw, false),
        passed: pTime < now,
      };
    }).filter(Boolean) as { name: string; nameAr: string; time: string; passed: boolean }[];

    if (allPrayers.length === 0) return;

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
    const accentColor = widgetSettings.prayerWidget?.accentColor || '#0d8e62';
    const colorScheme = widgetSettings.prayerWidget?.colorScheme || 'auto';
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
    const updated = await updateLiveActivity(data);
    if (!updated) {
      await startLiveActivity(data);
    }

    if (__DEV__) console.log('📍 Live Activity refreshed from cached data');
  } catch (e) {
    console.log('📍 Live Activity auto-refresh failed:', e);
  }
}
