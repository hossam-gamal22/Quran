// lib/profanity-filter.ts
// First-pass moderation for user-generated comments on religious content.
// Designed for false-positives over false-negatives — context here is sensitive
// (stories of Prophets, Companions, Seerah), so we lean strict and let admin
// moderation handle borderline cases. Lists are intentionally short and
// curated; admins can hide/delete anything that slips through.

const AR_BAD_WORDS: string[] = [
  // إساءات/شتائم شائعة
  'كلب', 'كلاب', 'حقير', 'حقيره', 'حقيرة', 'وسخ', 'وسخه', 'وسخة', 'قذر', 'قذره', 'قذرة',
  'احمق', 'أحمق', 'حمار', 'بقره', 'بقرة', 'خنزير', 'خنازير', 'غبي', 'غبيه', 'غبية', 'مغفل',
  'تافه', 'تافهه', 'تافهة', 'لعنه', 'لعنة', 'ملعون', 'ملعونه', 'ملعونة', 'يلعن',
  // إساءات دينية / تكفير / طائفية
  'كافر', 'كفار', 'كافره', 'كافرة', 'مرتد', 'مرتده', 'مرتدة', 'زنديق', 'منافق',
  'رافضي', 'روافض', 'مجوسي', 'ناصبي', 'وهابي', 'وهابيه', 'صوفي خرافي',
  // ألفاظ خادشه
  'زفت', 'خرا', 'تبا',
];

const EN_BAD_WORDS: string[] = [
  // English profanity
  'fuck', 'fucking', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'pussy',
  'cunt', 'slut', 'whore', 'faggot', 'nigger', 'nigga',
  // sectarian / takfir slurs in romanized form
  'kafir', 'murtad', 'rafidi', 'wahabi', 'wahhabi', 'munafiq',
];

const BAD_WORDS = [...AR_BAD_WORDS, ...EN_BAD_WORDS];

// Normalize Arabic for matching: strip diacritics, unify alef/yaa/taa marbuta,
// collapse repeated chars, lowercase. Catches "كــــلب", "كلابب", "Kafir!" etc.
const normalize = (raw: string): string => {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '') // Arabic diacritics
    .replace(/[̀-ͯ]/g, '') // Latin diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/(.)\1{2,}/g, '$1$1') // كــــلب → كلب, sooo → soo
    .replace(/[^a-z0-9؀-ۿ\s]/g, ' ') // strip punctuation/emojis (used as obfuscation)
    .replace(/\s+/g, ' ')
    .trim();
};

const NORMALIZED_LIST = BAD_WORDS.map(normalize).filter(Boolean);

export interface ProfanityCheck {
  clean: boolean;
  matched?: string;
}

export const checkProfanity = (text: string): ProfanityCheck => {
  if (!text) return { clean: true };
  const normalized = normalize(text);
  if (!normalized) return { clean: true };
  const tokens = new Set(normalized.split(' '));
  for (const word of NORMALIZED_LIST) {
    if (!word) continue;
    // word-boundary check via token set OR raw substring for compound forms
    if (tokens.has(word) || normalized.includes(` ${word} `) || normalized.startsWith(`${word} `) || normalized.endsWith(` ${word}`) || normalized === word) {
      return { clean: false, matched: word };
    }
  }
  return { clean: true };
};

export const MAX_COMMENT_LENGTH = 500;
export const MIN_COMMENT_LENGTH = 2;

export interface CommentValidation {
  valid: boolean;
  reason?: 'empty' | 'too_short' | 'too_long' | 'profanity';
}

export const validateCommentText = (text: string): CommentValidation => {
  const trimmed = (text || '').trim();
  if (!trimmed) return { valid: false, reason: 'empty' };
  if (trimmed.length < MIN_COMMENT_LENGTH) return { valid: false, reason: 'too_short' };
  if (trimmed.length > MAX_COMMENT_LENGTH) return { valid: false, reason: 'too_long' };
  if (!checkProfanity(trimmed).clean) return { valid: false, reason: 'profanity' };
  return { valid: true };
};
