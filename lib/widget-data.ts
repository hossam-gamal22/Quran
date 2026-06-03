// lib/widget-data.ts
// مشاركة البيانات مع الويدجت - روح المسلم

import AsyncStorage from '@react-native-async-storage/async-storage';

import { PrayerTimes, getNextPrayer, getTimeRemaining, formatTime12h, timeStringToDate, getPrayerNameAr, getPrayerNameEn } from './prayer-times';
import { getOfflinePrayerTimesRange } from './prayer-week-cache';
import type { CanonicalPrayerSnapshot } from './canonical-prayer-snapshot';
import { getLocalizedHijriDate, HIJRI_MONTHS_EN } from './hijri-date';
import { getAllAzkar, resolveTranslationValue } from '@/lib/azkar-api';
import type { Language as AzkarLanguage } from '@/lib/azkar-api';
import { stripAzkarBrackets } from '@/lib/basmala-utils';
import { t, getDateLocale, getLanguage, isRTL } from '@/lib/i18n';
import { formatPrayerDurationCompact } from '@/lib/widget-format-duration';
import { getTodayAyah, QuranAyah } from '@/lib/api/quran-cloud-api';
import { detectQuranTitle, splitAzkarChunks, quranTitleToEnglish } from '@/lib/widget-azkar-helpers';

// ========================================
// الثوابت
// ========================================

const WIDGET_DATA_KEY = 'widget_shared_data';
const WIDGET_SETTINGS_KEY = 'widget_settings';

/**
 * Resolve "what UTC instant corresponds to this local hour:minute on this
 * calendar day in this IANA timezone" using Intl.DateTimeFormat as a tz-aware
 * offset lookup. JS's `Date.setHours(...)` interprets the values in the
 * DEVICE's timezone, which silently produces wrong epochs when the device tz
 * differs from the location tz (e.g. user in Cairo viewing San Francisco
 * prayer times). This helper avoids that whole class of bugs.
 *
 * Algorithm: build a candidate UTC date for the target local clock, ask Intl
 * what wall-clock time that UTC instant represents in `timeZone`, then shift
 * by the residual delta. One iteration is sufficient unless the candidate
 * crosses a DST boundary, in which case the second pass corrects for it.
 */
function epochForCalendarDayLocalTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    }).formatToParts(new Date(utc));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const observed = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    const target = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = target - observed;
    if (delta === 0) return utc;
    utc += delta;
  }
  return utc;
}

/**
 * Convenience wrapper: same as `epochForCalendarDayLocalTime` but pulls the
 * calendar day (year/month/day) from a reference Date interpreted in
 * `timeZone`. Used for today's per-prayer epochs when no canonical snapshot
 * epoch is available.
 */
function epochForLocalTime(reference: Date, hour: number, minute: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(reference);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return epochForCalendarDayLocalTime(get('year'), get('month'), get('day'), hour, minute, timeZone);
}

/**
 * مسارات أيقونات الويدجت
 * يتم استبدال هذه بملفات PNG فعلية عند توفرها في assets/images/widgets/
 */
export const WIDGET_ICON_PATHS: Record<string, string> = {
  prayer: 'assets/images/widgets/widget_prayer_times.png',
  ayah: 'assets/images/widgets/widget_verse.png',
  dhikr: 'assets/images/widgets/widget_dhikr.png',
  hijri: 'assets/images/widgets/widget_hijri.png',
};

// ========================================
// الأنواع
// ========================================

export interface WidgetPrayerData {
  nextPrayer: string;
  nextPrayerName: string;
  nextPrayerNameAr: string;
  nextPrayerTime: string;
  /** Absolute local device timestamp for the next prayer. Countdown derives from this. */
  nextPrayerAtEpochMs?: number;
  previousPrayerName?: string;
  previousPrayerNameAr?: string;
  previousPrayerAtEpochMs?: number;
  calculationLocation?: string;
  timezone?: string;
  prayerDataUpdatedAt?: string;
  canonicalSnapshot?: CanonicalPrayerSnapshot;
  latitude?: number;
  longitude?: number;
  calculationMethod?: number;
  madhab?: number;
  source?: string;
  timeRemaining: string;
  timeRemainingMinutes: number;
  timeRemainingLabel: string;
  allPrayers: {
    name: string;
    nameAr: string;
    time: string;
    epochMs?: number;
    isPassed: boolean;
    isNext: boolean;
  }[];
  /** Flat sorted array of epoch timestamps for today + next 6 days.
   *  Used ONLY for countdown / timeline calculations, not for display. */
  allPrayerEpochs?: number[];
  hijriDate: string;
  hijriDay: number;
  hijriMonth: string;
  hijriMonthEn: string;
  hijriYear: number;
  gregorianDate: string;
  location: string;
  lastUpdated: string;
}

export interface WidgetZikrEntry {
  id: string;
  text: string;
  translation?: string;
  count: number;
  timesLabel?: string;
  category: string;
  categoryName?: string;
  benefit?: string;
  /** Source (e.g. "رواه البخاري ٦٤٠٧"). Surfaced under "Daily Dhikr" widget. */
  reference?: string;
  /** True when the text is a Quranic surah recitation instruction — widget
   *  renders the "قراءة سورة" card variant instead of the raw text. */
  isSurahRecitation?: boolean;
}

export interface WidgetAzkarData {
  randomZikr: WidgetZikrEntry;
  /** Pre-cached pool the widget cycles through to avoid feeling static.
   *  TimelineProvider picks by `(minuteOfDay) % rotation.length`. */
  rotation?: WidgetZikrEntry[];
  morningCompleted: boolean;
  eveningCompleted: boolean;
  lastUpdated: string;
}

export interface VerseWidgetData {
  arabic: string;
  translation?: string;
  surahName: string;
  surahNameEn: string;
  surahNumber?: number;
  ayahNumber: number;
  numberInSurah: number;
  date: string;
  lastUpdated: string;
}

export interface DhikrWidgetData {
  arabic: string;
  translation?: string;
  count: number;
  timesLabel?: string;
  category: string;
  categoryName: string;
  /** "When said" / virtue (zikr.benefit). */
  benefit?: string;
  /** Source (zikr.reference, e.g. "رواه مسلم ٢٦٩٢"). */
  reference?: string;
  /** True for Quranic surah recitation entries. Widget renders the
   *  "قراءة سورة الإخلاص والمعوذتين" card variant instead of raw text. */
  isSurahRecitation?: boolean;
  date: string;
  lastUpdated: string;
}

export interface PrayerCompletionData {
  date: string;
  prayers: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  };
  lastUpdated: string;
}

/**
 * One anchor record published to native side per dynamic text region inside
 * a captured PNG. Native overlay draws a SwiftUI `Text` at the recorded rect
 * using the recorded font / weight / alignment / direction, so the live
 * value sits exactly where the gallery laid it out. See
 * `components/widgets/previews/anchor-reporter.tsx` for the producer and
 * `widgets/ios/RoohWidgets.swift` for the consumer.
 */
export interface WidgetAnchor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'regular' | 'medium' | 'semibold' | 'bold';
  color: string;
  alignment: 'leading' | 'center' | 'trailing';
  direction: 'ltr' | 'rtl';
  isCountdown?: boolean;
}

export interface WidgetSnapshotManifestEntry {
  /** Route key: `${widgetId}_${size}_${theme}`. */
  routeKey: string;
  /** Versioned/cache-busted PNG basename without `.png`. */
  key: string;
  /** Final platform path when the app can expose it to native/widget JS. */
  path?: string;
  /** Snapshot content/version hash used for logs and cleanup. */
  hash?: string;
  id: string;
  size: 'small' | 'medium' | 'large' | string;
  theme: string;
  updatedAt: string;
  /** Captured-frame dimensions in dp — the (x, y, width, height) inside each
   *  `anchors` entry are relative to this frame. Native side scales by
   *  `widgetFamily.width / capturedWidth`. */
  capturedWidth?: number;
  capturedHeight?: number;
  /** Dynamic text regions the native widget must overlay (countdowns,
   *  prayer times, current time, day numbers, …). */
  anchors?: WidgetAnchor[];
}

export interface WidgetSettings {
  enabled: boolean;
  prayerWidget: {
    enabled: boolean;
    showAllPrayers: boolean;
    showHijriDate: boolean;
    showLocation: boolean;
    showCompletion: boolean;
  };
  azkarWidget: {
    enabled: boolean;
    showTranslation: boolean;
    categories: string[];
  };
  hijriWidget: {
    enabled: boolean;
    showGregorian: boolean;
  };
  verseWidget: {
    enabled: boolean;
    showTranslation: boolean;
  };
  dhikrWidget: {
    enabled: boolean;
    showTranslation: boolean;
    showBenefit: boolean;
  };
}

export interface SharedWidgetData {
  prayer: WidgetPrayerData;
  azkar: WidgetAzkarData;
  verse: VerseWidgetData;
  dhikr: DhikrWidgetData;
  prayerCompletion: PrayerCompletionData;
  settings: WidgetSettings;
  language?: string;
  /** User-selected default Arabic widget font for Date/Prayer variants. Adhkar widgets always use WidgetFont2. */
  widgetFontVariant?: 'widget1' | 'widget2';
  widgetCalendar?: string;
  widgetDayCalendar?: string;
  widgetMonthCalendar?: string;
  widgetNumerals?: string;
  widgetTheme?: string;
  widgetLanguage?: string;
  widgetDateFormat?: string;
  /**
   * User-applied Hijri calendar offset in days (typically -2 … +2) for
   * moon-sighting reconciliation. Widget date views add this to the live
   * timestamp before computing islamicUmmAlQura components — keeps the
   * widget in lock-step with the Hijri calendar shown inside the app.
   */
  hijriOffset?: number;
  /**
   * 365-ayah rolling verse pool the home-screen verse widget cycles
   * through (one per day). On app open, consumed entries are replaced
   * with fresh random ayat so the queue remains a full year long. See
   * `lib/verse-pool.ts` for the source of truth + refresh rules.
   */
  versePool?: {
    entries: Array<{
      arabic: string;
      surahName: string;
      surahNumber: number;
      ayahNumber: number;
      /** English translation (Saheeh International). */
      translation?: string;
      /** Romanized surah name (e.g. "Az-Zukhruf"). */
      englishSurahName?: string;
      /** QCF page number + private glyphs baked into the Verse PNG snapshot. */
      qcfPage?: number;
      qcfGlyphs?: string[];
    }>;
    seedDayOfYear: number;
    seedYear: number;
    generatedAt?: string;
  };
  /**
   * Pre-built morning + evening azkar pools used by the Android-side render
   * pipeline. Each entry carries its Arabic text PLUS the same pre-split
   * `displayChunks` and `quranTitle` that the iOS `BundledAzkar.swift`
   * exposes, so the RN preview (and thus the baked Android PNG) renders the
   * exact same chunk that iOS's SwiftUI view picks at the same minute.
   *
   * Pool composition mirrors the iOS bundle:
   *   - morning = category "1" (23 entries — keeps shared azkar)
   *   - evening = category "1b" MINUS any text identical to morning
   *     (~11 unique أمسينا entries)
   *
   * See `lib/widget-azkar-helpers.ts` for the shared chunk / Quran helpers
   * and `pickAzkarSlot()` for the minute-of-day rotation.
   */
  azkarPools?: import('@/lib/widget-azkar-helpers').WidgetAzkarPools;
  isPremium?: boolean;
  snapshotVersion?: number;
  snapshotUpdatedAt?: string;
  snapshotManifest?: Record<string, WidgetSnapshotManifestEntry>;
  canonicalPrayerSnapshot?: CanonicalPrayerSnapshot;
}

// ========================================
// الإعدادات الافتراضية
// ========================================

export const defaultWidgetSettings: WidgetSettings = {
  enabled: true,
  prayerWidget: {
    enabled: true,
    showAllPrayers: true,
    showHijriDate: true,
    showLocation: true,
    showCompletion: true,
  },
  azkarWidget: {
    enabled: true,
    showTranslation: false,
    categories: ['1', '2', '3'],
  },
  hijriWidget: {
    enabled: true,
    showGregorian: true,
  },
  verseWidget: {
    enabled: true,
    showTranslation: false,
  },
  dhikrWidget: {
    enabled: true,
    showTranslation: false,
    showBenefit: true,
  },
};

// ========================================
// دوال التخزين
// ========================================

/**
 * حفظ إعدادات الويدجت
 */
export const saveWidgetSettings = async (settings: WidgetSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving widget settings:', error);
  }
};

/**
 * جلب إعدادات الويدجت
 */
export const getWidgetSettings = async (): Promise<WidgetSettings> => {
  try {
    const data = await AsyncStorage.getItem(WIDGET_SETTINGS_KEY);
    if (data) {
      return { ...defaultWidgetSettings, ...JSON.parse(data) };
    }
    return defaultWidgetSettings;
  } catch (error) {
    console.error('Error getting widget settings:', error);
    return defaultWidgetSettings;
  }
};

// ========================================
// تحضير بيانات الويدجت
// ========================================

/**
 * تحضير بيانات الصلاة للويدجت
 */
export const preparePrayerWidgetData = async (
  prayerTimes: PrayerTimes | null,
  location?: string,
  language: string = 'ar',
  canonicalSnapshot?: CanonicalPrayerSnapshot | null,
): Promise<WidgetPrayerData> => {
  const now = new Date();
  // Resolve TODAY's Hijri date through the same 4-layer service the rest
  // of the app uses (admin Firestore override → AlAdhan API per country
  // → news detection → tabular fallback, plus user's ±N day adjustment).
  // Then map the result onto the legacy `prayer.hijriDay/Month/Year`
  // shape so the standalone HijriDateWidget (which reads those fields
  // directly) sees the admin-resolved value too — fixes the regression
  // where the dedicated Hijri widget kept showing Apple's calc while
  // every other widget reflected the override.
  let hijri: { day: number; month: number; year: number; monthName: string } | null = null;
  try {
    const { getHijriDate } = require('@/services/hijriCalendarService');
    const resolved = await getHijriDate(now);
    if (resolved && typeof resolved.day === 'number') {
      hijri = {
        day: resolved.day,
        month: resolved.month,
        year: resolved.year,
        monthName: resolved.monthNameAr || resolved.monthName,
      };
    }
  } catch {}
  if (!hijri) {
    // Service unavailable → fall back to local tabular calc + manual offset
    // (covers cold-launch path before Firestore loads).
    try {
      const { getHijriOffset } = require('./hijri-date');
      await getHijriOffset();
    } catch {}
    const local = getLocalizedHijriDate(now);
    if (local) {
      hijri = {
        day: local.day,
        month: local.month,
        year: local.year,
        monthName: local.monthName,
      };
    }
  }
  const updatedAt = now.toISOString();
  
  // الصلاة القادمة
  const effectivePrayerTimes = canonicalSnapshot?.prayerTimes ?? prayerTimes;
  const nextPrayerResult = effectivePrayerTimes && !canonicalSnapshot ? getNextPrayer(effectivePrayerTimes) : null;
  const nextPrayerKey = canonicalSnapshot?.nextPrayerName || nextPrayerResult?.name || 'fajr';
  const isTomorrowFajr = nextPrayerKey === 'fajr'
    && !!canonicalSnapshot?.nextPrayerAtEpochMs
    && canonicalSnapshot.nextPrayerAtEpochMs > canonicalSnapshot.ishaAtEpochMs;
  const nextPrayerTime = isTomorrowFajr && effectivePrayerTimes?.tomorrowFajr
    ? effectivePrayerTimes.tomorrowFajr
    : (effectivePrayerTimes?.[nextPrayerKey as keyof PrayerTimes] as string || nextPrayerResult?.time || '--:--');
  const canonicalRemainingSeconds = canonicalSnapshot?.nextPrayerAtEpochMs
    ? Math.max(0, Math.floor((canonicalSnapshot.nextPrayerAtEpochMs - now.getTime()) / 1000))
    : null;
  const timeRemaining = canonicalRemainingSeconds === null && effectivePrayerTimes ? getTimeRemaining(effectivePrayerTimes) : null;
  
  // أسماء الصلوات
  const prayerNames: Record<string, { en: string; ar: string }> = {
    fajr: { en: getPrayerNameEn('fajr', now), ar: getPrayerNameAr('fajr', now) },
    sunrise: { en: getPrayerNameEn('sunrise', now), ar: getPrayerNameAr('sunrise', now) },
    dhuhr: { en: getPrayerNameEn('dhuhr', now), ar: getPrayerNameAr('dhuhr', now) },
    asr: { en: getPrayerNameEn('asr', now), ar: getPrayerNameAr('asr', now) },
    maghrib: { en: getPrayerNameEn('maghrib', now), ar: getPrayerNameAr('maghrib', now) },
    isha: { en: getPrayerNameEn('isha', now), ar: getPrayerNameAr('isha', now) },
  };

  // تحضير قائمة الصلوات
  const prayersList = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const prayerEpochs = new Map<string, number>();
  const allPrayers = prayersList.map(prayer => {
    const time = effectivePrayerTimes?.[prayer as keyof PrayerTimes] as string || '--:--';
    const explicitEpoch = canonicalSnapshot
      ? ({
          fajr: canonicalSnapshot.fajrAtEpochMs,
          sunrise: canonicalSnapshot.sunriseAtEpochMs,
          dhuhr: canonicalSnapshot.dhuhrAtEpochMs,
          asr: canonicalSnapshot.asrAtEpochMs,
          maghrib: canonicalSnapshot.maghribAtEpochMs,
          isha: canonicalSnapshot.ishaAtEpochMs,
        } as Record<string, number>)[prayer]
      : undefined;
    const prayerDate = new Date();
    if (explicitEpoch && Number.isFinite(explicitEpoch)) {
      prayerDate.setTime(explicitEpoch);
    } else {
      // No canonical epoch — parse the HH:MM string in the LOCATION's
      // timezone (not the device's). setHours() implicitly uses the device tz
      // and produces a wrong UTC instant when the device tz differs from the
      // location tz (e.g. user in Cairo viewing SF prayer times).
      const parts = time.split(':').map(Number);
      const hours = parts[0] ?? 0;
      const minutes = parts[1] ?? 0;
      if (!isNaN(hours) && !isNaN(minutes)) {
        const locationTz = canonicalSnapshot?.timezone;
        if (locationTz) {
          prayerDate.setTime(epochForLocalTime(now, hours, minutes, locationTz));
        } else {
          prayerDate.setHours(hours, minutes, 0, 0);
        }
      }
    }
    prayerEpochs.set(prayer, prayerDate.getTime());
    
    return {
      name: prayerNames[prayer]?.en || prayer,
      nameAr: prayerNames[prayer]?.ar || prayer,
      time: formatTime12h(time),
      epochMs: prayerDate.getTime(),
      isPassed: prayerDate < now,
      isNext: prayer === nextPrayerKey,
    };
  });

  // Build a flat epoch list for 8 days (yesterday + today + 6 future).
  // Used ONLY for countdown calculations — never for display.
  // allPrayers stays as today's 6 prayers so table widgets don't duplicate.
  //
  // Yesterday's epochs matter for the home-screen NextPrevious widget when
  // the user is currently BEFORE today's Fajr: in that window, the
  // "previous" prayer is yesterday's Isha, and without it the widget shows
  // "0 ث منذ" (the formatter degrades to a 0/null epoch) instead of the
  // real "منذ X" since-Isha duration.
  const allPrayerEpochs: number[] = allPrayers
    .map((p) => p.epochMs)
    .filter((e): e is number => typeof e === 'number' && e > 0);
  try {
    const locationTz = canonicalSnapshot?.timezone;
    // Yesterday — one day BEFORE today, so the widget can resolve "previous
    // prayer" cross-day-boundary without inventing fake epochs.
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const pastDays = await getOfflinePrayerTimesRange(yesterday, 1);
    for (const { date, times } of pastDays) {
      for (const prayer of prayersList) {
        const time = times[prayer as keyof PrayerTimes] as string | undefined;
        if (!time || time === '--:--') continue;
        const parts = time.split(':').map(Number);
        if (isNaN(parts[0]) || isNaN(parts[1])) continue;
        let epochMs: number;
        if (locationTz) {
          const [yr, mo, da] = date.split('-').map(Number);
          epochMs = epochForCalendarDayLocalTime(yr, mo, da, parts[0], parts[1], locationTz);
        } else {
          const dayDate = new Date(date + 'T00:00:00');
          const prayerDate = new Date(dayDate);
          prayerDate.setHours(parts[0], parts[1], 0, 0);
          epochMs = prayerDate.getTime();
        }
        allPrayerEpochs.push(epochMs);
      }
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const futureDays = await getOfflinePrayerTimesRange(tomorrow, 6);
    for (const { date, times } of futureDays) {
      for (const prayer of prayersList) {
        const time = times[prayer as keyof PrayerTimes] as string | undefined;
        if (!time || time === '--:--') continue;
        const parts = time.split(':').map(Number);
        if (isNaN(parts[0]) || isNaN(parts[1])) continue;
        // Compute the epoch as "this HH:MM on this calendar day in the
        // location's timezone" — NOT in the device's timezone. The future
        // days returned by getOfflinePrayerTimesRange are keyed by location
        // date so we must interpret them in the location's tz to avoid
        // off-by-tz-offset bugs when device ≠ location.
        let epochMs: number;
        if (locationTz) {
          const [year, month, day] = date.split('-').map(Number);
          epochMs = epochForCalendarDayLocalTime(year, month, day, parts[0], parts[1], locationTz);
        } else {
          const dayDate = new Date(date + 'T00:00:00');
          const prayerDate = new Date(dayDate);
          prayerDate.setHours(parts[0], parts[1], 0, 0);
          epochMs = prayerDate.getTime();
        }
        allPrayerEpochs.push(epochMs);
      }
    }
    allPrayerEpochs.sort((a, b) => a - b);
  } catch {
    // Silently fallback — countdown still works with today's epochs only
  }

  let nextPrayerAtEpochMs: number | undefined;
  if (canonicalSnapshot?.nextPrayerAtEpochMs) {
    nextPrayerAtEpochMs = canonicalSnapshot.nextPrayerAtEpochMs;
  } else if (effectivePrayerTimes && nextPrayerResult) {
    const nextDate = timeStringToDate(nextPrayerResult.time, now);
    if (nextDate <= now) nextDate.setDate(nextDate.getDate() + 1);
    nextPrayerAtEpochMs = nextDate.getTime();
  }

  const sortedPrayers = prayersList
    .map((name) => ({ name, at: prayerEpochs.get(name) ?? 0 }))
    .filter((p) => p.at > 0)
    .sort((a, b) => a.at - b.at);
  const previousPrayer = canonicalSnapshot?.previousPrayerName
    ? sortedPrayers.find((p) => p.name === canonicalSnapshot.previousPrayerName)
    : ([...sortedPrayers].reverse().find((p) => p.at <= now.getTime()) ?? sortedPrayers[sortedPrayers.length - 1]);
  const previousPrayerAtEpochMs = canonicalSnapshot?.previousPrayerAtEpochMs
    ?? (previousPrayer
      ? (previousPrayer.at > now.getTime() ? previousPrayer.at - 24 * 60 * 60 * 1000 : previousPrayer.at)
      : undefined);

  return {
    nextPrayer: nextPrayerKey,
    nextPrayerName: prayerNames[nextPrayerKey]?.en || nextPrayerKey,
    nextPrayerNameAr: prayerNames[nextPrayerKey]?.ar || nextPrayerKey,
    nextPrayerTime: effectivePrayerTimes ? formatTime12h(nextPrayerTime) : '--:--',
    nextPrayerAtEpochMs,
    previousPrayerName: previousPrayer ? (prayerNames[previousPrayer.name]?.en || previousPrayer.name) : undefined,
    previousPrayerNameAr: previousPrayer ? (prayerNames[previousPrayer.name]?.ar || previousPrayer.name) : undefined,
    previousPrayerAtEpochMs,
    calculationLocation: canonicalSnapshot?.locationName || location || '',
    timezone: canonicalSnapshot?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    prayerDataUpdatedAt: canonicalSnapshot?.prayerDataUpdatedAt || updatedAt,
    canonicalSnapshot: canonicalSnapshot ?? undefined,
    latitude: canonicalSnapshot?.latitude,
    longitude: canonicalSnapshot?.longitude,
    calculationMethod: canonicalSnapshot?.calculationMethod,
    madhab: canonicalSnapshot?.madhab,
    source: canonicalSnapshot?.source,
    // Compact duration ("1H 52M" / "52M" / "50S" or Arabic equivalents).
    // Replaces the previous HH:MM raw format. Consumers like the Android
    // task handler and any direct `data.prayer.timeRemaining` reader pick
    // up the new shape automatically.
    timeRemaining: canonicalRemainingSeconds !== null
      ? formatPrayerDurationCompact(canonicalRemainingSeconds, isRTL() ? 'ar' : 'en')
      : (timeRemaining
        ? formatPrayerDurationCompact(
            (timeRemaining.hours * 60 + timeRemaining.minutes) * 60,
            isRTL() ? 'ar' : 'en',
          )
        : ''),
    timeRemainingMinutes: canonicalRemainingSeconds !== null
      ? Math.floor(canonicalRemainingSeconds / 60)
      : (timeRemaining
        ? timeRemaining.hours * 60 + timeRemaining.minutes
        : 0),
    timeRemainingLabel: t('prayer.timeRemaining'),
    allPrayers,
    allPrayerEpochs,
    hijriDate: hijri ? `${hijri.day} ${hijri.monthName} ${hijri.year}` : '',
    hijriDay: hijri?.day || 1,
    hijriMonth: hijri?.monthName || '',
    hijriMonthEn: hijri ? (HIJRI_MONTHS_EN[hijri.month - 1] || '') : '',
    hijriYear: hijri?.year || 1446,
    gregorianDate: now.toLocaleDateString(getDateLocale(), { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    }),
    location: canonicalSnapshot?.locationName || location || '',
    lastUpdated: canonicalSnapshot?.prayerDataUpdatedAt || updatedAt,
  };
};

/**
 * تحضير بيانات الأذكار للويدجت
 */
/**
 * Detect a Quranic surah-recitation dhikr — e.g. "اقرأ سورة الإخلاص
 * والمعوذتين". The dataset uses a couple of markers: the text starts with
 * the verb قرأ/اقرأ, or it contains an explicit "سورة …" reference inside
 * square brackets. When true, the widget renders the "قراءة سورة X" card
 * variant with a recitation count (e.g. "3×") instead of trying to fit the
 * full surah text inside the tile.
 */
function detectSurahRecitation(arabic: string): boolean {
  const t = (arabic || '').trim();
  if (!t) return false;
  // Common opening verbs for "recite": اقرأ, قراءة, قرأ
  if (/^(?:اقرأ|قراءة|قرأ|تلاوة)\b/.test(t)) return true;
  // Bracketed surah marker, e.g. "[سورة الإخلاص]"
  if (/\[\s*سورة\s/.test(t)) return true;
  // Explicit phrasing inside the body
  if (/(?:قراءة|تلاوة)\s+سورة/.test(t)) return true;
  return false;
}

function buildZikrEntry(
  zikr: ReturnType<typeof getAllAzkar>[number],
  language: string,
): WidgetZikrEntry {
  const lang = (language || 'ar') as AzkarLanguage;
  const isSurahRecitation = detectSurahRecitation(zikr.arabic);
  const text = language === 'ar'
    ? stripAzkarBrackets(zikr.arabic)
    : (resolveTranslationValue(zikr.translations?.[lang]) || stripAzkarBrackets(zikr.arabic));
  const translation = language !== 'ar'
    ? resolveTranslationValue(zikr.translations?.en)
    : undefined;
  const benefitVal = zikr.benefit;
  const benefit = typeof benefitVal === 'string'
    ? benefitVal
    : (benefitVal as any)?.[lang] || (benefitVal as any)?.['ar'] || undefined;
  return {
    id: String(zikr.id),
    text,
    translation,
    count: zikr.count,
    timesLabel: t('azkar.times'),
    category: zikr.category,
    categoryName: getDhikrCategoryName(zikr.category),
    benefit,
    reference: zikr.reference || undefined,
    isSurahRecitation,
  };
}

/**
 * Build the morning + evening azkar pools published in `SharedWidgetData.azkarPools`.
 *
 * Mirrors the iOS-bundle filter/dedup/chunk logic from
 * `scripts/generate-bundled-azkar.mjs` so the Android PNG bake (rendered
 * from RN previews) shows the same chunk that iOS's SwiftUI widget picks
 * at the same minute:
 *   - morning  → category "1" (23 entries — keeps shared azkar)
 *   - evening  → category "1b" MINUS any text identical to morning
 *                (~11 unique أمسينا entries — guarantees the two widgets
 *                never display the same zikr at the same time)
 *   - chunks   → ≤140-char chunks split at natural punctuation
 *   - quranTitle → "قراءة آية الكرسي" / "قراءة سور الإخلاص والفلق والناس" / …
 *                  for Quran-only entries
 *
 * Total payload: ~18 KB serialized — fits comfortably inside the App
 * Group / AsyncStorage write.
 */
export const prepareAzkarPools = (): import('@/lib/widget-azkar-helpers').WidgetAzkarPools => {
  const all = getAllAzkar();
  const morningRaw = all.filter((z) => z.category === '1');
  const morningTexts = new Set(morningRaw.map((z) => z.arabic));
  const eveningRaw = all.filter((z) => z.category === '1b' && !morningTexts.has(z.arabic));

  const toEntry = (z: ReturnType<typeof getAllAzkar>[number]): import('@/lib/widget-azkar-helpers').WidgetZikrPoolEntry => {
    const arabic = stripAzkarBrackets(z.arabic);
    const quranTitle = detectQuranTitle(arabic);
    const chunks = quranTitle
      ? [quranTitle.startsWith('قراءة') ? quranTitle : `قراءة ${quranTitle}`]
      : splitAzkarChunks(arabic);
    const benefitVal = z.benefit;
    const benefit = typeof benefitVal === 'string'
      ? benefitVal
      : (benefitVal as any)?.ar || '';
    // English translation — azkar.json stores it as `translations.en` which
    // is either a plain string or a { text, verified } object. Use the same
    // resolver the in-app azkar screen uses so widget + screen text match.
    const enRaw = z.translations?.en;
    const translation = resolveTranslationValue(enRaw) || undefined;
    const quranTitleEn = quranTitle ? quranTitleToEnglish(quranTitle) : undefined;
    return {
      id: Number(z.id) || 0,
      arabic,
      count: z.count,
      reference: z.reference || '',
      benefit,
      displayChunks: chunks,
      quranTitle,
      translation,
      quranTitleEn,
    };
  };

  return {
    morning: morningRaw.map(toEntry),
    evening: eveningRaw.map(toEntry),
  };
};

export const prepareAzkarWidgetData = async (
  language: string = 'ar',
  categories: string[] = ['1', '2', '3']
): Promise<WidgetAzkarData> => {
  const allAzkar = getAllAzkar();
  const filteredAzkar = allAzkar.filter(zikr => categories.includes(zikr.category));

  // Build the cycling pool. Cap at 30 entries so the App Group payload
  // stays small (each zikr is ~200 bytes serialized). 30 entries × 1
  // minute per entry = ~30-minute rotation, after which it repeats.
  const POOL_CAP = 30;
  const pool = filteredAzkar.length > POOL_CAP
    ? Array.from({ length: POOL_CAP }, (_, i) =>
        filteredAzkar[Math.floor((i * filteredAzkar.length) / POOL_CAP)])
    : filteredAzkar;
  const rotation: WidgetZikrEntry[] = pool.map(z => buildZikrEntry(z, language));

  // Random "primary" entry for the snapshot/placeholder path.
  const randomIndex = Math.floor(Math.random() * (rotation.length || 1));
  const randomZikr = rotation[randomIndex] ?? rotation[0] ?? buildZikrEntry(filteredAzkar[0] || allAzkar[0], language);

  let morningCompleted = false;
  let eveningCompleted = false;
  try {
    const todayKey = new Date().toISOString().split('T')[0];
    const azkarStatus = await AsyncStorage.getItem(`azkar_status_${todayKey}`);
    if (azkarStatus) {
      const status = JSON.parse(azkarStatus);
      morningCompleted = status.morning || false;
      eveningCompleted = status.evening || false;
    }
  } catch (error) {
    console.error('Error getting azkar status:', error);
  }

  return {
    randomZikr,
    rotation,
    morningCompleted,
    eveningCompleted,
    lastUpdated: new Date().toISOString(),
  };
};

// ========================================
// بيانات آية اليوم للويدجت
// ========================================

/**
 * حساب رقم آية يومي ثابت بناءً على يوم السنة
 */
function getDailyVerseNumber(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return (dayOfYear % 6236) + 1;
}

/**
 * الحصول على ذكر يومي ثابت (مختلف عن ذكر الأذكار العشوائي)
 */
function getDailyDhikrIndex(totalAzkar: number): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  // Offset by 137 to differentiate from verse-of-the-day numbering
  return ((dayOfYear + 137) % totalAzkar);
}

function getDhikrCategoryName(category: string): string {
  const names: Record<string, () => string> = {
    // New numeric IDs
    '1': () => t('azkar.morning'),
    '1b': () => t('azkar.evening'),
    '2': () => t('azkar.sleep'),
    '3': () => t('azkar.wakeup'),
    '27': () => t('prayer.afterPrayer'),
    '26': () => t('azkar.quranDuas'),
    '34': () => t('azkar.sunnahDuas'),
    // Legacy string IDs (backward compat)
    morning: () => t('azkar.morning'),
    evening: () => t('azkar.evening'),
    sleep: () => t('azkar.sleep'),
    wakeup: () => t('azkar.wakeup'),
    after_prayer: () => t('prayer.afterPrayer'),
    quran_duas: () => t('azkar.quranDuas'),
    sunnah_duas: () => t('azkar.sunnahDuas'),
    ruqya: () => t('azkar.ruqya'),
    protection: () => t('azkar.protectionAdhkar'),
    misc: () => t('widget.miscAzkar'),
  };
  return names[category]?.() || category;
}

/**
 * تحضير بيانات آية اليوم للويدجت
 *
 * Fetches the Arabic Uthmani text and an English Sahih translation in parallel
 * so non-Arabic widgets can render an English subtitle (Glassify "Quotes Aayat" style).
 */
export const prepareVerseWidgetData = async (
  _language: string = 'ar',
  options?: { showTranslation?: boolean }
): Promise<VerseWidgetData> => {
  const todayDate = new Date().toISOString().split('T')[0]!;

  // PRIMARY SOURCE: the exact same `resolveDailyVerse()` picker the in-app
  // daily-ayah screen and notifications use. Was previously calling
  // `getTodayAyah()` which hits AlQuran Cloud with a different selection
  // algorithm — that's why the widget and the app showed *different* ayat for
  // the same day even though both claimed to be "verse of the day".
  try {
    // Single source of truth shared with the in-app "Verse of the Day" screen
    // and notifications (override → seasonal → verse-pool → rolling fallback,
    // always with the complete Uthmani text). Keeps every surface in sync.
    const { resolveDailyVerse } = require('@/lib/seasonal-ayah');
    const resolved = await resolveDailyVerse();
    let chosen: { arabic: string; ref: string; trans: string; surah: number; ayah: number } | null =
      resolved?.ayah ?? null;

    if (chosen) {
      if (!chosen.trans && chosen.surah > 0 && chosen.ayah > 0) {
        try {
          const english = require('@/data/json/quran-english.json') as Record<
            string,
            Array<{ id: number; text: string }>
          >;
          chosen.trans = (english[String(chosen.surah)] ?? [])
            .find((item) => item.id === chosen.ayah)?.text
            ?.replace(/\s*﴾[\s\d٠-٩]+﴿\s*$/u, '')
            .trim() || '';
        } catch {}
      }
      const verseData: VerseWidgetData = {
        arabic: chosen.arabic,
        // Always publish English translation — widget decides whether to
        // render it based on the picker language. The `showTranslation`
        // setting must not gate the data payload; gating it leaves the
        // widget silently showing Arabic in English mode.
        translation: chosen.trans || undefined,
        surahName: chosen.ref,           // already Arabic e.g. "البقرة ١٥٢"
        surahNameEn: chosen.ref,         // English ref reuses same string until split
        surahNumber: chosen.surah,
        ayahNumber: chosen.ayah,
        numberInSurah: chosen.ayah,
        date: todayDate,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(`widget_verse_${todayDate}`, JSON.stringify(verseData));
      return verseData;
    }
  } catch (e) {
    if (__DEV__) console.warn('[Widget] DAILY_AYAHS picker failed, falling back to API:', e);
  }

  // FALLBACK: previous AlQuran Cloud API path (only used if the in-app
  // dataset couldn't be loaded — covers extreme edge cases).
  try {
    const cached = await AsyncStorage.getItem(`widget_verse_${todayDate}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('[Widget] Failed to parse cached verse, re-fetching:', e);
  }

  try {
    const ayah = await getTodayAyah();
    if (ayah) {
      let translation: string | undefined;
      if (options?.showTranslation !== false) {
        try {
          const tr = await fetch(`https://api.alquran.cloud/v1/ayah/${ayah.number}/en.sahih`).then(r => r.ok ? r.json() : null);
          const trText: unknown = tr?.data?.text;
          if (typeof trText === 'string' && trText.length > 0) translation = trText;
        } catch {}
      }
      const verseData: VerseWidgetData = {
        arabic: ayah.text,
        translation,
        surahName: ayah.surah.name,
        surahNameEn: ayah.surah.englishName,
        surahNumber: ayah.surah.number,
        ayahNumber: ayah.number,
        numberInSurah: ayah.numberInSurah || ayah.number,
        date: todayDate,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(`widget_verse_${todayDate}`, JSON.stringify(verseData));
      return verseData;
    }
  } catch (error) {
    console.error('Error fetching verse for widget:', error);
  }

  // Fallback: Al-Fatiha first verse
  return {
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    translation: 'In the name of Allah, the Entirely Merciful, the Especially Merciful',
    surahName: 'سورة الفاتحة',
    surahNameEn: 'Al-Fatiha',
    ayahNumber: 1,
    numberInSurah: 1,
    date: todayDate,
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * تحضير بيانات الذكر اليومي للويدجت
 */
export const prepareDhikrWidgetData = async (
  language: string = 'ar',
  options?: { showTranslation?: boolean; showBenefit?: boolean }
): Promise<DhikrWidgetData> => {
  const todayDate = new Date().toISOString().split('T')[0]!;
  // Daily-dhikr pool MIRRORS BundledAzkar.daily on iOS: excludes categories
  // '1' (morning) and '1b' (evening) so the daily-dhikr widget never
  // duplicates content shown by the dedicated morning / evening widgets.
  // Keeps everything else (sleep, after-prayer, after-wudu, food, travel…).
  const dailyAzkar = getAllAzkar().filter((z) => z.category !== '1' && z.category !== '1b');

  if (dailyAzkar.length === 0) {
    return {
      arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ',
      count: 3,
      timesLabel: t('azkar.times'),
      category: 'misc',
      categoryName: t('widget.miscAzkar'),
      date: todayDate,
      lastUpdated: new Date().toISOString(),
    };
  }

  const index = getDailyDhikrIndex(dailyAzkar.length);
  const zikr = dailyAzkar[index]!;

  const lang = language as 'ar' | 'en' | 'ur' | 'id' | 'tr' | 'fr' | 'de' | 'hi' | 'bn' | 'ms' | 'ru' | 'es';
  // ALWAYS publish the ENGLISH translation regardless of:
  //   • the current widget language (the widget picks Arabic vs English at
  //     render time, so the data must always carry English text)
  //   • the `showTranslation` setting (that flag was the in-Arabic-mode
  //     toggle for showing a bilingual layout; it should NOT gate whether
  //     English mode receives content at all — that just leaves the widget
  //     silently showing Arabic in English mode, which is what the user
  //     keeps reporting)
  // The widget itself decides what to render based on the picker language.
  const translation = resolveTranslationValue(zikr.translations?.['en']) || undefined;
  const benefitVal = zikr.benefit;
  const benefit = (options?.showBenefit !== false) ? (typeof benefitVal === 'string'
    ? benefitVal
    : benefitVal?.[lang] || benefitVal?.['ar'] || undefined) : undefined;

  return {
    arabic: stripAzkarBrackets(zikr.arabic),
    translation,
    count: zikr.count,
    timesLabel: t('azkar.times'),
    category: zikr.category,
    categoryName: getDhikrCategoryName(zikr.category),
    benefit,
    // Source + recitation marker so the widget can render attribution
    // ("رواه البخاري…") + switch to the "قراءة سورة …" card variant
    // for Quranic recitation entries without re-fetching from JSON.
    reference: zikr.reference || undefined,
    isSurahRecitation: detectSurahRecitation(zikr.arabic),
    date: todayDate,
    lastUpdated: new Date().toISOString(),
  };
};

// ========================================
// تتبع إكمال الصلوات من الويدجت
// ========================================

const PRAYER_COMPLETION_KEY = 'widget_prayer_completion';

/**
 * جلب حالة إكمال الصلوات لليوم
 */
export const getPrayerCompletion = async (): Promise<PrayerCompletionData> => {
  const todayDate = new Date().toISOString().split('T')[0]!;
  try {
    const data = await AsyncStorage.getItem(PRAYER_COMPLETION_KEY);
    if (data) {
      const parsed: PrayerCompletionData = JSON.parse(data);
      if (parsed.date === todayDate) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error getting prayer completion:', error);
  }

  return {
    date: todayDate,
    prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * حفظ حالة إكمال صلاة
 */
export const setPrayerCompleted = async (
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha',
  completed: boolean
): Promise<void> => {
  try {
    const current = await getPrayerCompletion();
    current.prayers[prayer] = completed;
    current.lastUpdated = new Date().toISOString();
    await AsyncStorage.setItem(PRAYER_COMPLETION_KEY, JSON.stringify(current));
    // Update shared widget data
    await updateSharedData();
  } catch (error) {
    console.error('Error setting prayer completion:', error);
  }
};

// ========================================
// مشاركة البيانات مع الويدجت
// ========================================

/**
 * تحديث البيانات المشتركة
 * يفوض إلى updateWidgetData من widget-data-bridge الذي يكتب إلى التخزين المشترك
 * ويطلب تحديث الويدجت الأصلي
 */
export const updateSharedData = async (
  prayerTimes?: PrayerTimes | null,
  location?: string
): Promise<void> => {
  const { updateWidgetData } = require('./widget-data-bridge');
  await updateWidgetData(prayerTimes, location);
};

/**
 * جلب البيانات المشتركة
 */
export const getSharedData = async (): Promise<SharedWidgetData | null> => {
  try {
    const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error getting shared data:', error);
    return null;
  }
};

// ========================================
// تحديث الويدجت
// ========================================

/**
 * طلب تحديث الويدجت
 * يفوض إلى updateWidgetData من widget-data-bridge الذي يكتب البيانات
 * ويطلب تحديث الويدجت الأصلي على Android و iOS
 */
export const requestWidgetUpdate = async (): Promise<void> => {
  const { updateWidgetData } = require('./widget-data-bridge');
  await updateWidgetData();
};

// ========================================
// دوال مساعدة للويدجت
// ========================================

/**
 * الحصول على لون الخلفية حسب الوقت
 */
export const getWidgetBackgroundColor = (prayer: string): string[] => {
  const colors: Record<string, string[]> = {
    fajr: ['#1a237e', '#283593'],
    sunrise: ['#ff6f00', '#ff8f00'],
    dhuhr: ['#0d8e62', '#1d4a3a'],
    asr: ['#f57c00', '#ef6c00'],
    maghrib: ['#d84315', '#bf360c'],
    isha: ['#1a1a2e', '#16213e'],
  };
  return colors[prayer] || colors.dhuhr;
};

/**
 * الحصول على أيقونة الصلاة
 */
export const getWidgetPrayerIcon = (prayer: string): string => {
  const icons: Record<string, string> = {
    fajr: 'weather.sunrise',
    sunrise: 'sun.max',
    dhuhr: 'sun.max.fill',
    asr: 'sun.haze',
    maghrib: 'weather.sunset',
    isha: 'moon.stars',
  };
  return icons[prayer] || 'clock';
};

// ========================================
// التصدير
// ========================================

export default {
  // الإعدادات
  saveWidgetSettings,
  getWidgetSettings,
  defaultWidgetSettings,
  
  // البيانات
  preparePrayerWidgetData,
  prepareAzkarWidgetData,
  prepareVerseWidgetData,
  prepareDhikrWidgetData,
  updateSharedData,
  getSharedData,
  
  // إكمال الصلوات
  getPrayerCompletion,
  setPrayerCompleted,
  
  // التحديث
  requestWidgetUpdate,
  
  // مساعدة
  getWidgetBackgroundColor,
  getWidgetPrayerIcon,
  WIDGET_ICON_PATHS,
};
