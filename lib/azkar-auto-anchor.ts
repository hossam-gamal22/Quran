/**
 * Phase 7: Smart Adhkar Auto-Anchoring
 * ─────────────────────────────────────
 * يربط أوقات تذكيرات الأذكار بأوقات الصلاة الفعلية بدلاً من ساعات ثابتة.
 *
 * الإسناد الشرعي (التوقيت المستحب):
 *  - أذكار الصباح: من الفجر حتى طلوع الشمس (نختار: الفجر + 30د)
 *  - أذكار المساء: من العصر حتى المغرب (نختار: العصر + 15د)
 *  - أذكار النوم: قبل النوم بقليل (نختار: العشاء + 60د، حد أقصى 23:30)
 *  - أذكار الاستيقاظ: بعد الفجر (نختار: شروق + 60د كحد افتراضي)
 *
 * يُفعّل فقط لو `notifSettings.azkarAutoAnchor === true`، وله fallback آمن
 * لو الموقع غير محدد أو الحساب فشل.
 */

import { getPrayerLocation } from '@/lib/storage';
import { calculateLocalPrayerTimes } from '@/lib/country-prayer-defaults';

export type AzkarAnchorCategory = 'morning' | 'evening' | 'sleep' | 'wakeup';

export interface AnchoredTimesResult {
  /** التوقيت المحسوب بصيغة HH:mm (24h) */
  time: string;
  /** المصدر: 'anchor' لو محسوب من الصلاة، 'fallback' لو رجع للقيمة الافتراضية */
  source: 'anchor' | 'fallback';
  /** الصلاة المرجعية (لو anchor) */
  basedOn?: 'fajr' | 'asr' | 'isha' | 'sunrise';
}

/** قواعد الإزاحة بالدقائق من الصلاة المرجعية */
const ANCHOR_RULES: Record<
  AzkarAnchorCategory,
  { basedOn: 'fajr' | 'asr' | 'isha' | 'sunrise'; offsetMinutes: number; safeFallback: string; clampMaxHour?: number }
> = {
  morning: { basedOn: 'fajr',    offsetMinutes: 30, safeFallback: '06:00', clampMaxHour: 10 },
  evening: { basedOn: 'asr',     offsetMinutes: 15, safeFallback: '17:45', clampMaxHour: 19 },
  sleep:   { basedOn: 'isha',    offsetMinutes: 60, safeFallback: '22:00', clampMaxHour: 23 },
  wakeup:  { basedOn: 'sunrise', offsetMinutes: 60, safeFallback: '08:00', clampMaxHour: 11 },
};

function parseHHmm(t: string): { h: number; m: number } | null {
  if (!t || typeof t !== 'string') return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function formatHHmm(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * احسب توقيت الذكر بناءً على وقت الصلاة + offset، مع حد أقصى للساعة.
 */
function applyOffset(baseTime: string, offsetMinutes: number, clampMaxHour?: number): string {
  const parsed = parseHHmm(baseTime);
  if (!parsed) return baseTime;
  let totalMin = parsed.h * 60 + parsed.m + offsetMinutes;
  // wrap to 24h
  totalMin = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  let h = Math.floor(totalMin / 60);
  let m = totalMin % 60;
  if (clampMaxHour !== undefined && h > clampMaxHour) {
    h = clampMaxHour;
    m = 30;
  }
  return formatHHmm(h, m);
}

let _cachedTimes: { date: string; times: ReturnType<typeof calculateLocalPrayerTimes> } | null = null;

async function getTodayPrayerTimes(): Promise<ReturnType<typeof calculateLocalPrayerTimes> | null> {
  const today = new Date().toISOString().slice(0, 10);
  if (_cachedTimes && _cachedTimes.date === today) return _cachedTimes.times;

  try {
    const loc = await getPrayerLocation();
    if (!loc) return null;
    // method 4 = Umm Al-Qura (default safe), school 0 = Shafi
    const times = calculateLocalPrayerTimes(loc.latitude, loc.longitude, new Date(), 4, 0);
    _cachedTimes = { date: today, times };
    return times;
  } catch (e) {
    console.warn('[azkar-anchor] فشل حساب أوقات اليوم:', e);
    return null;
  }
}

/**
 * يحسب الوقت المُرَست للفئة المعطاة. يُرجع null لو لم يكن ممكناً (لا موقع).
 * المستخدم في `notifications-manager` للقرار: استخدم الوقت المُرَست أو احتفظ بقيمة المستخدم.
 */
export async function computeAnchoredAzkarTime(
  category: AzkarAnchorCategory,
): Promise<AnchoredTimesResult> {
  const rule = ANCHOR_RULES[category];
  const times = await getTodayPrayerTimes();

  if (!times) {
    return { time: rule.safeFallback, source: 'fallback' };
  }

  const baseTime = times[rule.basedOn];
  if (!baseTime || !parseHHmm(baseTime)) {
    return { time: rule.safeFallback, source: 'fallback' };
  }

  const computed = applyOffset(baseTime, rule.offsetMinutes, rule.clampMaxHour);
  return { time: computed, source: 'anchor', basedOn: rule.basedOn };
}

/**
 * نقطة الاستدعاء الأساسية من notifications-manager.
 * لو auto-anchor مفعّل: يستبدل الأوقات المُمرَّرة بالمحسوبة.
 * لو معطّل أو فشل: يرجع الأوقات الأصلية كما هي.
 */
export async function maybeAnchorTimes(
  category: AzkarAnchorCategory,
  userTimes: string[],
  autoAnchorEnabled: boolean,
): Promise<string[]> {
  if (!autoAnchorEnabled) return userTimes;
  const result = await computeAnchoredAzkarTime(category);
  if (result.source === 'fallback') return userTimes; // لا تتدخل لو ما عندنا أوقات صلاة
  if (__DEV__) {
    console.log(`🕌 anchor ${category}: ${result.time} (based on ${result.basedOn})`);
  }
  // استخدم وقت واحد محسوب — يلغي multi-times لو auto-anchor مفعّل
  return [result.time];
}
