// server/eidPrayerRouter.ts
// تجميع موعد صلاة العيد من مصادر خارجية متعددة + كاش بسيط في الذاكرة.
// Phase 2 backend: client يقدر يستدعيه عبر زر "تحديث من المصادر" كبديل
// للاستدعاء المباشر، عشان نتجنب CORS ونوحّد منطق الدمج في مكان واحد.

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";

type EidType = "fitr" | "adha";

interface AggregatedEid {
  /** Gregorian YYYY-MM-DD for the day of Eid (per AlAdhan Hijri→Gregorian). */
  date: string | null;
  /** Estimated prayer time HH:MM 24h (sunrise + offset). null if unknown. */
  prayerTime: string | null;
  /** Where the data came from, for the UI to display. */
  source: string;
  /** Confidence label: 'official' for authoritative time sources, 'calculated' otherwise. */
  confidence: "official" | "calculated";
  /** Iso timestamp of when this aggregation was produced. */
  fetchedAt: string;
}

// ========================================
// Memory cache (per server instance — fine for low-volume reads)
// ========================================

interface CacheEntry { data: AggregatedEid; expiresAt: number; }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — Eid date is fixed once hilal is announced

function cacheKey(type: EidType, hijriYear: number, lat?: number, lon?: number): string {
  const loc = lat != null && lon != null ? `${lat.toFixed(2)}_${lon.toFixed(2)}` : "default";
  return `${hijriYear}_${type}_${loc}`;
}

// ========================================
// Source 1: AlAdhan Hijri → Gregorian (authoritative for date)
// ========================================

async function fetchAlAdhanDate(type: EidType, hijriYear: number): Promise<string | null> {
  const day = type === "fitr" ? 1 : 10;
  const month = type === "fitr" ? 10 : 12;
  const url = `https://api.aladhan.com/v1/hToG/${day}-${month}-${hijriYear}`;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    const json: any = await res.json();
    if (json?.code !== 200 || !json?.data?.gregorian?.date) return null;
    const [gd, gm, gy] = (json.data.gregorian.date as string).split("-").map(Number);
    if (!gd || !gm || !gy) return null;
    // Return as YYYY-MM-DD
    return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
  } catch {
    return null;
  }
}

// ========================================
// Source 2: AlAdhan timings (sunrise for a given lat/lon and Gregorian date)
// ========================================

async function fetchAlAdhanSunrise(date: string, lat: number, lon: number): Promise<string | null> {
  // date is YYYY-MM-DD; AlAdhan wants DD-MM-YYYY
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  const url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${lat}&longitude=${lon}&method=4`;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    const json: any = await res.json();
    if (json?.code !== 200 || !json?.data?.timings?.Sunrise) return null;
    const cleanSunrise = String(json.data.timings.Sunrise).replace(/\s*\([^)]*\)/g, "").trim();
    return /^\d{2}:\d{2}$/.test(cleanSunrise) ? cleanSunrise : null;
  } catch {
    return null;
  }
}

// ========================================
// Calculate prayer time from sunrise
// ========================================

function applyOffset(sunrise: string, type: EidType): string | null {
  const [h, m] = sunrise.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const offset = type === "fitr" ? 20 : 15;
  let total = h * 60 + m + offset;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

// ========================================
// Aggregator
// ========================================

async function aggregateEidTime(
  type: EidType,
  hijriYear: number,
  lat?: number,
  lon?: number,
): Promise<AggregatedEid> {
  const date = await fetchAlAdhanDate(type, hijriYear);

  let prayerTime: string | null = null;
  let source = "AlAdhan (date only)";

  if (date && lat != null && lon != null) {
    const sunrise = await fetchAlAdhanSunrise(date, lat, lon);
    if (sunrise) {
      prayerTime = applyOffset(sunrise, type);
      source = `AlAdhan (sunrise + ${type === "fitr" ? 20 : 15}m)`;
    }
  }

  return {
    date,
    prayerTime,
    source,
    confidence: "calculated", // Until a verified mosque-time source is added per-country, mark as calculated
    fetchedAt: new Date().toISOString(),
  };
}

// ========================================
// tRPC router
// ========================================

export const eidPrayerRouter = router({
  /**
   * Aggregate Eid date + estimated prayer time from external sources.
   * Cached for 6 hours per (type, hijriYear, lat/lon) tuple.
   */
  aggregate: publicProcedure
    .input(
      z.object({
        type: z.enum(["fitr", "adha"]),
        hijriYear: z.number().int().min(1400).max(1600),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        skipCache: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      const key = cacheKey(input.type, input.hijriYear, input.latitude, input.longitude);
      if (!input.skipCache) {
        const hit = cache.get(key);
        if (hit && hit.expiresAt > Date.now()) {
          return { ...hit.data, cached: true };
        }
      }
      const data = await aggregateEidTime(
        input.type,
        input.hijriYear,
        input.latitude,
        input.longitude,
      );
      cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return { ...data, cached: false };
    }),
});
