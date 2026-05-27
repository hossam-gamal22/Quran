// lib/eid-prayer.ts
// نظام موعد صلاة العيد - روح المسلم
// Phase 1: حساب تقريبي من شروق الشمس + اشتراك Firestore لتجاوزات الأدمن
// Phase 2: جلب من مصادر رسمية (AlAdhan) عند طلب التحديث

import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getHijriDate, hijriToGregorian } from '@/lib/hijri-date';
import type { PrayerTimes } from '@/lib/prayer-times';
import { timeStringToDate, getStoredLocation } from '@/lib/prayer-times';

export type EidType = 'fitr' | 'adha';
export type EidConfidence = 'calculated' | 'official';

export interface EidInfo {
  type: EidType;
  /** Gregorian Date object for the day of Eid (midnight local). */
  date: Date;
  /** Estimated or official prayer time in HH:MM 24h format. */
  prayerTime: string;
  daysUntil: number;
  /** True when today is Eid day. */
  isToday: boolean;
  confidence: EidConfidence;
  /** "AlAdhan", "وزارة الأوقاف - مصر", ... */
  source?: string;
  /** ISO timestamp of last update for official sources. */
  lastUpdated?: string;
}

/** How many days before Eid to start showing the card/banner. */
export const EID_LOOKAHEAD_DAYS = 3;
/** Hide the card after this hour on Eid day itself (Eid prayer is well over by then). */
export const EID_DAY_HIDE_AFTER_HOUR = 11;
/**
 * Earliest fiqh-permissible offset from sunrise per Eid type. The Sunnah is to
 * slightly delay Eid al-Fitr (so people can eat / pay Zakat al-Fitr) and to
 * hasten Eid al-Adha (so the udhiyah slaughter can begin sooner). Actual mosque
 * timetables vary widely by country — this is only the calculated fallback,
 * never the authoritative answer.
 */
export const EID_FITR_OFFSET_MIN = 20;
export const EID_ADHA_OFFSET_MIN = 15;

/**
 * @deprecated kept for back-compat with older calls; prefer the type-specific
 *             constants above or use {@link offsetForEidType}.
 */
export const EID_PRAYER_OFFSET_MIN = EID_ADHA_OFFSET_MIN;

export function offsetForEidType(type: EidType): number {
  return type === 'fitr' ? EID_FITR_OFFSET_MIN : EID_ADHA_OFFSET_MIN;
}

// ========================================
// Hijri detection
// ========================================

/**
 * Calculate the next upcoming Eid (Fitr on 1 Shawwal, Adha on 10 Dhul-Hijjah)
 * within the lookahead window. Returns null if neither is close enough.
 */
export function getUpcomingEid(now: Date = new Date()): {
  type: EidType;
  date: Date;
  daysUntil: number;
  isToday: boolean;
} | null {
  const hijri = getHijriDate(now);
  const candidates: Array<{ type: EidType; date: Date }> = [];

  // Eid al-Fitr — 1 Shawwal of current Hijri year, and the next year too
  // (if we're past Shawwal we still want to know about next year's Eid eventually).
  for (const yearDelta of [0, 1]) {
    const year = hijri.year + yearDelta;
    try {
      candidates.push({ type: 'fitr', date: hijriToGregorian(year, 10, 1) });
    } catch { /* invalid date, skip */ }
    try {
      candidates.push({ type: 'adha', date: hijriToGregorian(year, 12, 10) });
    } catch { /* invalid date, skip */ }
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Filter to future or today, pick the closest.
  const future = candidates
    .map(c => {
      const d = new Date(c.date);
      d.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((d.getTime() - startOfToday.getTime()) / 86400000);
      return { ...c, daysUntil };
    })
    .filter(c => c.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (future.length === 0) return null;
  const next = future[0];

  // Only return if within lookahead window
  if (next.daysUntil > EID_LOOKAHEAD_DAYS) return null;

  // On Eid day after the hide-after hour, treat as "passed"
  if (next.daysUntil === 0 && now.getHours() >= EID_DAY_HIDE_AFTER_HOUR) {
    return null;
  }

  return { type: next.type, date: next.date, daysUntil: next.daysUntil, isToday: next.daysUntil === 0 };
}

// ========================================
// Time calculation
// ========================================

/**
 * Estimate the *earliest fiqh-permissible* Eid prayer time = sunrise + offset.
 * The offset varies by Eid type to reflect the Sunnah of delaying Fitr and
 * hastening Adha. This is a fallback only — actual mosque timetables vary.
 *
 * `eidType` is optional for back-compat; when omitted defaults to the Adha
 * offset (the earliest of the two).
 */
export function calculateEidPrayerTime(sunrise: string, eidType?: EidType): string | null {
  if (!sunrise) return null;
  try {
    const sunriseDate = timeStringToDate(sunrise);
    if (isNaN(sunriseDate.getTime())) return null;
    const offset = eidType ? offsetForEidType(eidType) : EID_ADHA_OFFSET_MIN;
    sunriseDate.setMinutes(sunriseDate.getMinutes() + offset);
    const hh = String(sunriseDate.getHours()).padStart(2, '0');
    const mm = String(sunriseDate.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return null;
  }
}

// ========================================
// Firestore: admin overrides
// ========================================

interface FirestoreEidDoc {
  prayerTime?: string;            // HH:MM 24h
  source?: string;                // e.g. "وزارة الأوقاف - مصر"
  lastUpdated?: string;           // ISO timestamp
}

/**
 * Subscribe to admin-curated official Eid prayer time for a given country.
 * Path: appConfig/eidPrayerTimes_{hijriYear}/countries/{countryCode}
 * Listener receives null when no override exists.
 */
export function subscribeToOfficialEidTime(
  country: string | null | undefined,
  eidType: EidType,
  hijriYear: number,
  callback: (data: { prayerTime: string; source: string; lastUpdated: string } | null) => void
): () => void {
  if (!country) {
    callback(null);
    return () => {};
  }
  const normalized = country.toUpperCase().trim();
  const docPath = `appConfig/eidPrayerTimes_${hijriYear}_${eidType}/countries/${normalized}`;
  try {
    return onSnapshot(
      doc(db, docPath as any),
      (snap) => {
        if (!snap.exists()) { callback(null); return; }
        const data = snap.data() as FirestoreEidDoc;
        if (!data.prayerTime) { callback(null); return; }
        callback({
          prayerTime: data.prayerTime,
          source: data.source || 'admin',
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        });
      },
      (err) => {
        if (__DEV__) console.log('[eid-prayer] Firestore listener error:', err?.message || err);
        callback(null);
      }
    );
  } catch (e) {
    if (__DEV__) console.log('[eid-prayer] subscribe failed:', e);
    callback(null);
    return () => {};
  }
}

// ========================================
// Phase 2: fetch from external sources (AlAdhan)
// ========================================

/**
 * Confirm the Gregorian date of the next Eid via AlAdhan's Hijri holidays
 * endpoint. Used to verify our local Hijri calculation isn't off by a day.
 * Returns null on network failure.
 */
export async function fetchOfficialEidDate(
  eidType: EidType,
  hijriYear: number
): Promise<Date | null> {
  // AlAdhan Hijri-to-Gregorian: /v1/hToG/DD-MM-YYYY
  const month = eidType === 'fitr' ? 10 : 12;
  const day = eidType === 'fitr' ? 1 : 10;
  const url = `https://api.aladhan.com/v1/hToG/${day}-${month}-${hijriYear}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const json = await res.json();
    if (json?.code !== 200 || !json.data?.gregorian) return null;
    const g = json.data.gregorian;
    // gregorian.date format: "DD-MM-YYYY"
    const [gd, gm, gy] = (g.date as string).split('-').map(Number);
    if (!gd || !gm || !gy) return null;
    return new Date(gy, gm - 1, gd);
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// ========================================
// High-level: assemble full EidInfo
// ========================================

/**
 * Build EidInfo from local prayer times. Caller is responsible for subscribing
 * to Firestore overrides separately and merging them via `applyOfficialOverride`.
 */
export function buildEidInfo(
  prayerTimes: Pick<PrayerTimes, 'sunrise'> | null,
  now: Date = new Date()
): EidInfo | null {
  const upcoming = getUpcomingEid(now);
  if (!upcoming) return null;

  const sunrise = prayerTimes?.sunrise || '';
  const calculated = calculateEidPrayerTime(sunrise, upcoming.type);
  if (!calculated) {
    // Still show with placeholder if sunrise unavailable
    return {
      type: upcoming.type,
      date: upcoming.date,
      prayerTime: '--:--',
      daysUntil: upcoming.daysUntil,
      isToday: upcoming.isToday,
      confidence: 'calculated',
    };
  }

  return {
    type: upcoming.type,
    date: upcoming.date,
    prayerTime: calculated,
    daysUntil: upcoming.daysUntil,
    isToday: upcoming.isToday,
    confidence: 'calculated',
  };
}

/**
 * Merge a Firestore-supplied official time into existing EidInfo, marking it
 * as 'official' so the UI can show the verified badge.
 */
export function applyOfficialOverride(
  info: EidInfo,
  override: { prayerTime: string; source: string; lastUpdated: string } | null
): EidInfo {
  if (!override) return info;
  return {
    ...info,
    prayerTime: override.prayerTime,
    confidence: 'official',
    source: override.source,
    lastUpdated: override.lastUpdated,
  };
}

/**
 * Convenience: get current Hijri year (used for picking the correct Firestore doc).
 */
export function getCurrentHijriYear(now: Date = new Date()): number {
  return getHijriDate(now).year;
}

/**
 * Get the user's country code from stored prayer location.
 * Returns null if no location is stored or country is missing.
 */
export async function getUserCountryCode(): Promise<string | null> {
  try {
    const loc = await getStoredLocation();
    return loc?.country?.toUpperCase().trim() || null;
  } catch {
    return null;
  }
}

/**
 * One-shot fetch from Firestore for the refresh button (vs. subscribeToOfficialEidTime
 * which is a realtime listener). Returns the same shape so callers can apply it the
 * same way via `applyOfficialOverride`.
 */
export async function fetchOfficialEidTimeOnce(
  country: string | null | undefined,
  eidType: EidType,
  hijriYear: number
): Promise<{ prayerTime: string; source: string; lastUpdated: string } | null> {
  if (!country) return null;
  const normalized = country.toUpperCase().trim();
  const docPath = `appConfig/eidPrayerTimes_${hijriYear}_${eidType}/countries/${normalized}`;
  try {
    const snap = await getDoc(doc(db, docPath as any));
    if (!snap.exists()) return null;
    const data = snap.data() as FirestoreEidDoc;
    if (!data.prayerTime) return null;
    return {
      prayerTime: data.prayerTime,
      source: data.source || 'admin',
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    };
  } catch (e) {
    if (__DEV__) console.log('[eid-prayer] one-shot fetch failed:', e);
    return null;
  }
}

// ========================================
// Phase 2: server-side aggregator (avoids CORS, adds caching)
// ========================================

/**
 * Call the server's `eidPrayer.aggregate` endpoint which fetches AlAdhan
 * Hijri→Gregorian + sunrise + applies the type-specific offset on the server
 * side (cached for 6h). Returns null on network failure.
 *
 * Preferred over `fetchOfficialEidDate` when a backend deployment is available —
 * gives us centralised caching and lets us add more sources later without
 * shipping a new app version.
 */
export async function fetchAggregatedEidTimeFromServer(
  eidType: EidType,
  hijriYear: number,
  location?: { latitude?: number; longitude?: number }
): Promise<{ date: string | null; prayerTime: string | null; source: string; confidence: EidConfidence; fetchedAt: string } | null> {
  try {
    // Lazy import to avoid circular deps at module load
    const { getApiBaseUrl } = await import('@/constants/oauth');
    const base = getApiBaseUrl();
    if (!base) return null;

    const input = {
      json: {
        type: eidType,
        hijriYear,
        ...(location?.latitude != null && location?.longitude != null
          ? { latitude: location.latitude, longitude: location.longitude }
          : {}),
      },
    };
    const url = `${base}/api/trpc/eidPrayer.aggregate?input=${encodeURIComponent(JSON.stringify(input))}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const json = await res.json();
    // tRPC v11 response shape: { result: { data: { json: {...} } } }
    const data = json?.result?.data?.json;
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch (e) {
    if (__DEV__) console.log('[eid-prayer] server aggregate failed:', e);
    return null;
  }
}

/**
 * Format Eid prayer time for display ("06:15 ص" in Arabic, "6:15 AM" in English).
 */
export function formatEidTime(time: string, locale: 'ar' | 'en' = 'ar'): string {
  if (!time || time === '--:--') return '--:--';
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const period = h < 12 ? (locale === 'ar' ? 'ص' : 'AM') : (locale === 'ar' ? 'م' : 'PM');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Get the localized Arabic / English name for an Eid type.
 */
export function getEidName(type: EidType, locale: 'ar' | 'en' = 'ar'): string {
  if (locale === 'ar') return type === 'fitr' ? 'عيد الفطر' : 'عيد الأضحى';
  return type === 'fitr' ? 'Eid al-Fitr' : 'Eid al-Adha';
}
