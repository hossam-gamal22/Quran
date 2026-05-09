// lib/memorization-helpers.ts
// مساعدات تستخدم بيانات Quran المحلية لتوسيع الخطط إلى آيات فعلية.

import localQuranData from '../data/json/quran-uthmani.json';
import type { MemorizationPlan } from '@/types/memorization';
import { getPresetById } from './memorization-presets';
import { formatQuranAyahMarker, isolateDirection } from './rtl-utils';

interface RawSurah {
  number: number;
  name?: string;
  englishName?: string;
  ayahs?: { numberInSurah: number; text: string }[];
}

const QURAN: RawSurah[] = localQuranData as any;

export function getSurahMeta(surahNumber: number): RawSurah | undefined {
  return QURAN.find((s) => s.number === surahNumber);
}

export function getSurahName(surahNumber: number): string {
  return getSurahMeta(surahNumber)?.name ?? `سورة ${surahNumber}`;
}

export function getAyahCount(surahNumber: number): number {
  return getSurahMeta(surahNumber)?.ayahs?.length ?? 0;
}

export function getAyahText(surahNumber: number, ayahNumber: number): string {
  const raw =
    getSurahMeta(surahNumber)?.ayahs?.find((a) => a.numberInSurah === ayahNumber)
      ?.text ?? '';
  // For verse 1 of every surah except Al-Fatiha (1) and At-Tawbah (9):
  // strip the embedded Basmala prefix that appears in the source data.
  // This avoids confusing the hide/test modes which split words.
  if (ayahNumber === 1 && surahNumber !== 1 && surahNumber !== 9) {
    return stripLeadingBasmala(raw);
  }
  return raw;
}

/** يحذف "بسم الله الرحمن الرحيم" من بداية النص بكل أشكال التشكيل والإملاء. */
function stripLeadingBasmala(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4) return text;
  const firstFour = words.slice(0, 4).join(' ');
  const normalized = stripTashkeel(firstFour)
    .replace(/[\u0671\u0670]/g, 'ا') // ٱ → ا
    .replace(/ـ/g, '');
  if (normalized === 'بسم الله الرحمن الرحيم' || normalized === 'بسم الله الرحمان الرحيم') {
    return words.slice(4).join(' ');
  }
  return text;
}

/**
 * كل آيات الخطة بالترتيب (تتعامل مع كل أنواع الخطط).
 */
export function enumeratePlanAyahsFull(
  plan: MemorizationPlan,
): { surahNumber: number; ayahNumber: number }[] {
  const out: { surahNumber: number; ayahNumber: number }[] = [];

  let surahs: number[] = [];
  if (plan.scope === 'preset' && plan.presetId) {
    surahs = getPresetById(plan.presetId)?.surahNumbers ?? [];
  } else if (plan.scope === 'surah' && plan.surahNumbers?.length) {
    surahs = plan.surahNumbers;
  } else if (plan.scope === 'juz' && plan.juzNumbers?.length) {
    // لكل جزء، نضيف كل آياته (juz field من البيانات).
    for (const juz of plan.juzNumbers) {
      for (const s of QURAN) {
        const ayahs = (s.ayahs ?? []).filter((a: any) => a.juz === juz);
        for (const a of ayahs) {
          out.push({ surahNumber: s.number, ayahNumber: a.numberInSurah });
        }
      }
    }
    return out;
  } else if (plan.scope === 'range' && plan.ayahRange) {
    const r = plan.ayahRange;
    for (let a = r.fromAyah; a <= r.toAyah; a += 1) {
      out.push({ surahNumber: r.surahNumber, ayahNumber: a });
    }
    return out;
  }

  for (const sn of surahs) {
    const count = getAyahCount(sn);
    for (let a = 1; a <= count; a += 1) {
      out.push({ surahNumber: sn, ayahNumber: a });
    }
  }
  return out;
}

/**
 * أعطني أول N آيات لم تبدأ بعد (status==='new' أو غير موجودة).
 */
export function pickNewFromPlan(
  plan: MemorizationPlan,
  states: Record<string, { status: string }>,
  count: number,
): { surahNumber: number; ayahNumber: number }[] {
  const all = enumeratePlanAyahsFull(plan);
  const out: { surahNumber: number; ayahNumber: number }[] = [];
  for (const a of all) {
    if (out.length >= count) break;
    const k = `${a.surahNumber}:${a.ayahNumber}`;
    const s = states[k];
    if (!s || s.status === 'new') out.push(a);
  }
  return out;
}

/**
 * إزالة التشكيل (للعرض المبسط في وضع الإخفاء/الاختبار).
 */
export function stripTashkeel(text: string): string {
  // Arabic diacritics range
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/**
 * إزالة علامات التلاوة/الوقف فقط (U+06D6–U+06ED ومثل U+06DF "صفر مستدير")
 * مع الإبقاء على التشكيل الأساسي. يُستخدم للعرض في شاشات الحفظ
 * عندما لا يدعم خط العرض هذه الرموز فيظهر مكانها دائرة منقّطة.
 */
export function stripQuranicMarks(text: string): string {
  return text.replace(/[\u06D6-\u06ED]/g, '');
}

/** يعرض أرقام قسم الحفظ بالصيغة اللاتينية (0-9) حتى داخل الواجهات العربية. */
export function toArabicDigits(value: number | string): string {
  const map: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  };
  return String(value).replace(/[٠-٩]/g, (d) => map[d] ?? d);
}

/** أرقام الآيات تُعرض عربية-هندية داخل علامة الآية لتناسق المصحف. */
export function toArabicIndicDigits(value: number | string): string {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return toArabicDigits(value).replace(/[0-9]/g, (d) => map[Number(d)]);
}

export function formatAyahMarker(ayahNumber: number | string): string {
  return formatQuranAyahMarker(toArabicIndicDigits(ayahNumber));
}

export function formatAyahProgress(current: number | string, total: number | string): string {
  return isolateDirection(`${toArabicDigits(current)} / ${toArabicDigits(total)}`, false);
}

export function formatSurahAyahLabel(surahNumber: number, ayahNumber: number | string): string {
  return `${getSurahName(surahNumber)} ${formatAyahMarker(ayahNumber)}`;
}

export function formatAyahRangeLabel(
  surahNumber: number,
  fromAyah: number | string,
  toAyah: number | string,
): string {
  return `${getSurahName(surahNumber)} - آيات ${toArabicIndicDigits(fromAyah)} إلى ${toArabicIndicDigits(toAyah)}`;
}

/**
 * تقسيم آية إلى مقاطع بصرية على فواصل الكلمات الطبيعية.
 */
export function splitAyahSegments(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 6) return [words.join(' ')];
  // قسّم لمقاطع تقريبية بطول 4-6 كلمات
  const segments: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= 5) {
      segments.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) segments.push(cur.join(' '));
  return segments;
}
