export interface RepeatCountSource {
  count?: number | null;
  arabic?: string | null;
  translations?: Record<string, string | { text?: string | null } | null> | null;
  translation?: Record<string, string | { text?: string | null } | null> | null;
}

export interface RepeatAudioMetadata {
  zikrId?: number;
  baseIndex?: number;
  repeatIndex?: number;
  repeatTotal?: number;
  repeatPartIndex?: number;
  repeatPartTotal?: number;
  countsForRepeat?: boolean;
}

interface ExpandRepeatOptions {
  zikrId: number;
  baseIndex: number;
  repeatCount: number;
}

const MAX_REPEAT_COUNT = 100;
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

const ARABIC_NUMBER_WORDS: Record<string, number> = {
  واحد: 1,
  واحدة: 1,
  اثنان: 2,
  اثنتان: 2,
  اثنين: 2,
  اثنتين: 2,
  مرتين: 2,
  ثلاث: 3,
  ثلاثة: 3,
  ثلاثا: 3,
  اربع: 4,
  اربعة: 4,
  خمس: 5,
  خمسة: 5,
  ست: 6,
  ستة: 6,
  سبع: 7,
  سبعة: 7,
  ثمان: 8,
  ثمانية: 8,
  تسع: 9,
  تسعة: 9,
  عشر: 10,
  عشرة: 10,
  مئة: 100,
  مائة: 100,
};

function normalizeArabicText(value: string): string {
  return value
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '')
    .trim();
}

function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function parseRepeatNumber(value: string): number | null {
  const digitMatch = normalizeDigits(value).match(/(?:^|[^\d])(\d{1,3})(?:[^\d]|$)/);
  if (digitMatch) {
    const parsed = Number(digitMatch[1]);
    return parsed >= 1 && parsed <= MAX_REPEAT_COUNT ? parsed : null;
  }

  const normalized = normalizeArabicText(value);
  const tokens = normalized.split(/[^\p{Letter}]+/u).filter(Boolean);
  for (const token of tokens) {
    const parsed = ARABIC_NUMBER_WORDS[token];
    if (parsed && parsed <= MAX_REPEAT_COUNT) return parsed;
  }

  return null;
}

export function inferTrailingRepeatCount(text?: string | null): number | null {
  if (!text) return null;

  const trimmed = text.trim().replace(/[.،؛:!?؟]+$/u, '').trim();
  const match = trimmed.match(/[\(\[]([^()[\]]{1,80})[\)\]]$/u);
  if (!match) return null;

  const normalized = normalizeArabicText(match[1]).toLowerCase();
  const mentionsRepeat =
    /(?:مرات|مره|مرة|مرتين|times?|recite)/iu.test(normalized);
  if (!mentionsRepeat) return null;

  return parseRepeatNumber(normalized);
}

function translationText(value: string | { text?: string | null } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.text || null;
}

export function getEffectiveZikrRepeatCount(zikr: RepeatCountSource): number {
  const count = Math.trunc(Number(zikr.count ?? 1));
  if (count > 1) return Math.min(count, MAX_REPEAT_COUNT);

  const candidates = [
    zikr.arabic,
    translationText(zikr.translations?.ar),
    translationText(zikr.translation?.ar),
  ];

  for (const candidate of candidates) {
    const inferred = inferTrailingRepeatCount(candidate);
    if (inferred && inferred > 1) return inferred;
  }

  return 1;
}

export function expandAudioTracksForRepeat<T extends { id: string }>(
  parts: T[],
  options: ExpandRepeatOptions,
): Array<T & RepeatAudioMetadata> {
  const repeatTotal = Math.max(1, Math.min(Math.trunc(options.repeatCount), MAX_REPEAT_COUNT));
  const partTotal = Math.max(1, parts.length);

  const expanded: Array<T & RepeatAudioMetadata> = [];
  for (let repeatIndex = 1; repeatIndex <= repeatTotal; repeatIndex += 1) {
    parts.forEach((part, partOffset) => {
      const repeatPartIndex = partOffset + 1;
      expanded.push({
        ...part,
        id: `${part.id}-r${repeatIndex}-p${repeatPartIndex}`,
        zikrId: options.zikrId,
        baseIndex: options.baseIndex,
        repeatIndex,
        repeatTotal,
        repeatPartIndex,
        repeatPartTotal: partTotal,
        countsForRepeat: repeatPartIndex === partTotal,
      });
    });
  }

  return expanded;
}
