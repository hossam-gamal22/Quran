// lib/share-text.ts
// المنسّق المركزي لكل مشاركة نصية في التطبيق.
// كل نص يُشارك أو يُنسخ يمر عبر buildShareText: يُنظّف أي footer/روابط قديمة من ذيله
// ثم يُلصق الـ footer الموحّد (حسب لغة الواجهة) مع رابطَي المتجرين.

import { APP_CONFIG } from '../constants/app';

// أنماط الـ footer/الروابط القديمة — تُطابَق فقط على الأسطر الأخيرة (الذيل)
// حتى لا نمسّ متنًا يذكر اسم التطبيق في وسطه.
const LEGACY_TAIL_PATTERNS: RegExp[] = [
  // التواقيع العربية
  /^📱?\s*(?:من\s+)?تطبيق\s+ر[ُ]?وح\s+المسلم/u,
  /^(?:[—–-]\s*)?ر[ُ]?وح\s+المسلم(?:\s*[—–-]\s*Ruh\s+Al[- ]?Muslim)?/iu,
  // التواقيع الإنجليزية
  /^(?:📱\s*)?(?:from\s+)?(?:app\s+)?rooh\s+al[- ]?muslim(?:\s+app)?/iu,
  /^(?:📱\s*)?ruh\s+al[- ]?muslim/iu,
  // رابط التحميل القديم (📥 حمّل التطبيق: / Download:)
  /^📥?\s*(?:حمّل\s+التطبيق|download)\s*[:：]?/iu,
  // روابط المتجرين المجرّدة
  /play\.google\.com\/store/iu,
  /apps\.apple\.com/iu,
];

// محارف اتجاه/مسافات نزيلها من ذيل المتن
const TRAILING_WS = /[\s‏‎ ]+$/u;

function isLegacyTailLine(line: string): boolean {
  const trimmed = line.trim().replace(/^[‏‎]+|[‏‎]+$/gu, '');
  if (trimmed === '') return true; // سطر فارغ في الذيل يُحذف
  return LEGACY_TAIL_PATTERNS.some((re) => re.test(trimmed));
}

/**
 * يزيل أي footer/روابط قديمة (أو الموحّد نفسه) من ذيل النص فقط.
 * يتوقّف عند أول سطر متن حقيقي — لا يلمس محتوى المستخدم.
 */
export function stripLegacyFooter(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  while (lines.length > 0 && isLegacyTailLine(lines[lines.length - 1])) {
    lines.pop();
  }
  return lines.join('\n').replace(TRAILING_WS, '');
}

/**
 * يبني النص النهائي الموحّد: متن نظيف + سطر فارغ + الـ footer الموحّد.
 * idempotent: تشغيلها على ناتجها يُعطي نفس النتيجة.
 */
export function buildShareText(body: string): string {
  const clean = stripLegacyFooter(body ?? '');
  const footer = APP_CONFIG.getShareFooter();
  return clean ? `${clean}\n\n${footer}` : footer;
}
