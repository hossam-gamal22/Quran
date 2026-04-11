/**
 * Basmala detection & stripping utilities for azkar items.
 *
 * Only targets the full Quran-style بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
 * that prefixes Quran surahs, NOT partial "بسم الله" duas.
 */

const BASMALA_PREFIXES = [
  'بسم الله الرحمن الرحيم',
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ',
];

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Check whether a text starts with the full Quran Basmala and has more
 * content after it (i.e. it's a surah, not just "بسم الله" in a dua).
 * Returns the text with basmala removed if found, or null.
 */
export function stripBasmalaPrefix(text: string | undefined): { stripped: string; hadBasmala: boolean } {
  if (!text) return { stripped: '', hadBasmala: false };

  const normalized = normalize(text);
  for (const prefix of BASMALA_PREFIXES) {
    const np = normalize(prefix);
    if (normalized.startsWith(np) && normalized.length > np.length + 2) {
      // Remove the basmala prefix and any separator (۝, whitespace)
      let rest = normalized.slice(np.length).replace(/^[\s۝]+/, '').trim();
      // Also try on original (non-normalized) text to preserve formatting
      for (const p of BASMALA_PREFIXES) {
        if (text.trimStart().startsWith(p)) {
          const idx = text.indexOf(p) + p.length;
          rest = text.slice(idx).replace(/^[\s۝]+/, '').trim();
          break;
        }
      }
      return { stripped: rest, hadBasmala: true };
    }
  }
  return { stripped: text, hadBasmala: false };
}

/**
 * Check if text starts with the full Quran Basmala followed by surah content.
 */
export function hasBasmalaPrefix(text: string | undefined): boolean {
  return stripBasmalaPrefix(text).hadBasmala;
}

/**
 * Remove ornamental verse brackets ﴿ ﴾ from Quran text, keeping the verse numbers.
 */
export function stripVerseNumbers(text: string): string {
  return text.replace(/﴿/g, '').replace(/﴾/g, '');
}

/** Remove Arabic tashkeel/diacritics for comparison purposes */
function stripTashkeel(s: string): string {
  return s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/**
 * Strip display brackets and annotations from azkar text:
 * - (( )) double parentheses (hadith wrappers)
 * - [[ ]] double square brackets (scholarly annotations)
 * - [ ] single square brackets (inline annotations)
 * - ( ) single parentheses ONLY when containing count instructions like (ثلاث مرات)
 * - أعوذ بالله من الشيطان الرجيم prefix before Quran verses (﴿)
 * Keeps the inner content for brackets, removes count instructions entirely.
 */
export function stripAzkarBrackets(text: string | undefined): string {
  if (!text) return '';
  let result = text
    // Step 1: Remove square brackets
    .replace(/\[\[/g, '')
    .replace(/\]\]/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    // Step 2: Remove count-only parentheses BEFORE bracket conversion
    // so (instruction (count)) → (instruction ) then )) → ) works correctly
    .replace(/\([^)]{0,30}م[\u064B-\u065F]*ر[\u064B-\u065F]*(?:ا[\u064B-\u065F]*ت[\u064B-\u065F]*|ة[\u064B-\u065F]*)[^)]{0,10}\)/g, '')
    .replace(/\([\s\u064B-\u065F]*(?:ثلاث|ثَلاَثَ|أربع|سبع|عشر|مائة|مِائَة)[^)]{0,30}\)/g, '')
    // Step 3: Convert (( → ( and )) → ) (preserves instruction text in parentheses)
    .replace(/\)\)/g, ')')
    .replace(/\(\(/g, '(')
    // Step 4: Remove trailing count instructions OUTSIDE parens: ". ثلاث مرَّاتٍ والثالثة..."
    .replace(/[.\s]*(?:ثَ?لَ?ا?َ?ثَ?|ث[\u064B-\u065F]*ل[\u064B-\u065F]*ا[\u064B-\u065F]*ث[\u064B-\u065F]*)[\s\u064B-\u065F]*م[\u064B-\u065F]*ر[\u064B-\u065F]*(?:ا[\u064B-\u065F]*ت[\u064B-\u065F]*|ة[\u064B-\u065F]*).*$/g, '')
    // Step 5: Remove standalone ثلاثاً (tanween fatha = "three times") — NOT ثلاثٌ/ثلاث+noun (hadith content)
    .replace(/[،,\s]*ث[\u064B-\u065F]*ل[\u064B-\u065F]*ا[\u064B-\u065F]*ث[\u064B-\u065F]*ا[\u064B-\u065F]*ً[،,\s]*/g, ' ')
    // Clean up: orphan dashes, space before parens, extra whitespace/dots
    .replace(/^\s*-\s*/, '')
    .replace(/\s*-\s*$/, '')
    .replace(/\s+\)/g, ')')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Strip outer wrapping parentheses only if the opening ( matches the closing )
  if (/^\(/.test(result) && /\)\s*\.?\s*$/.test(result)) {
    let depth = 0;
    let outerWraps = true;
    for (let i = 0; i < result.length; i++) {
      if (result[i] === '(') depth++;
      else if (result[i] === ')') depth--;
      // If depth hits 0 before the end, the ( doesn't wrap the whole text
      if (depth === 0 && i < result.length - 1) {
        const remaining = result.substring(i + 1).trim();
        if (remaining && remaining !== '.' && remaining !== '،') {
          outerWraps = false;
          break;
        }
      }
    }
    if (outerWraps) {
      result = result.replace(/^\(\s*/, '').replace(/\s*\)\s*\.?\s*$/, '').trim();
    }
  }

  // Remove أعوذ بالله من الشيطان الرجيم before ﴿ (robust tashkeel-independent)
  const verseStart = result.indexOf('﴿');
  if (verseStart > 0) {
    const before = stripTashkeel(result.substring(0, verseStart)).trim();
    if (before === 'أعوذ بالله من الشيطان الرجيم' || before === 'اعوذ بالله من الشيطان الرجيم') {
      result = result.substring(verseStart);
    }
  }

  return result;
}
