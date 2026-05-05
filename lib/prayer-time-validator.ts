/**
 * Phase 1.F — مدقق صحة أوقات الصلاة
 *
 * يفحص الـ timings المُرجعة من API قبل الجدولة. لو رصد خلل (مثل: الفجر بعد
 * الظهر، أو فجوات مستحيلة)، يُعتبر اليوم باطلاً ولا يُجدول.
 *
 * أمثلة على الأخطاء التي يكتشفها:
 *  - Fajr >= Dhuhr (مستحيل في أي مكان)
 *  - Maghrib <= Dhuhr (مستحيل)
 *  - Isha <= Maghrib (مستحيل)
 *  - الفجوة بين العشاء والفجر التالي < 3 ساعات (latitude شاذ)
 *  - أي وقت غير موجود أو NaN
 */

export type PrayerTimings = Record<string, string>; // "HH:mm" 24h

const PRAYER_KEYS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * يحوّل "HH:mm" إلى دقائق منذ منتصف الليل. يُرجع NaN لو الصيغة خاطئة.
 */
function timeToMinutes(t: string | undefined): number {
  if (!t) return NaN;
  // some APIs append timezone like "05:30 (EET)"
  const cleaned = t.split(' ')[0];
  const parts = cleaned.split(':');
  if (parts.length < 2) return NaN;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

/**
 * يفحص timings يوم واحد. يُرجع `{ valid, errors }`.
 */
export function validatePrayerTimings(timings: PrayerTimings): ValidationResult {
  const errors: string[] = [];

  // 1) كل وقت موجود وقابل للقراءة
  const minutes: Record<string, number> = {};
  for (const key of PRAYER_KEYS) {
    const m = timeToMinutes(timings[key]);
    if (isNaN(m)) {
      errors.push(`Missing or invalid time for ${key}: "${timings[key]}"`);
    } else {
      minutes[key] = m;
    }
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 2) ترتيب طبيعي خلال اليوم
  const order = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  for (let i = 1; i < order.length; i++) {
    const prev = order[i - 1];
    const curr = order[i];
    if (minutes[curr] <= minutes[prev]) {
      errors.push(`${curr} (${timings[curr]}) must be after ${prev} (${timings[prev]})`);
    }
  }

  // 3) Sanity ranges (تجنب أخطاء حسابية فادحة)
  if (minutes.Fajr < 60 || minutes.Fajr > 8 * 60) {
    errors.push(`Fajr out of plausible range (01:00-08:00): ${timings.Fajr}`);
  }
  if (minutes.Dhuhr < 10 * 60 || minutes.Dhuhr > 14 * 60) {
    errors.push(`Dhuhr out of plausible range (10:00-14:00): ${timings.Dhuhr}`);
  }
  if (minutes.Maghrib < 15 * 60 || minutes.Maghrib > 22 * 60) {
    errors.push(`Maghrib out of plausible range (15:00-22:00): ${timings.Maghrib}`);
  }
  if (minutes.Isha < 16 * 60 || minutes.Isha > 23 * 60 + 59) {
    errors.push(`Isha out of plausible range (16:00-23:59): ${timings.Isha}`);
  }

  // 4) فرق بين الفجر والظهر >= 3 ساعات (latitude شاذ يكسر الحساب)
  if (minutes.Dhuhr - minutes.Fajr < 3 * 60) {
    errors.push(`Suspicious gap Fajr→Dhuhr < 3h: ${timings.Fajr} → ${timings.Dhuhr}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * يفحص الفجوة بين عشاء يوم وفجر اليوم التالي.
 * يُرجع true لو الفجوة منطقية (>= 3 ساعات).
 */
export function validateNightGap(
  ishaToday: string,
  fajrTomorrow: string
): { valid: boolean; gapMinutes: number } {
  const isha = timeToMinutes(ishaToday);
  const fajr = timeToMinutes(fajrTomorrow);
  if (isNaN(isha) || isNaN(fajr)) return { valid: false, gapMinutes: 0 };
  // الفجر التالي = اليوم التالي → نضيف 24 ساعة
  const gap = fajr + 24 * 60 - isha;
  return { valid: gap >= 3 * 60, gapMinutes: gap };
}
