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
 * Detect whether the inner content of a parenthesised group is just a
 * repetition counter such as `(ثلاث)`, `(سبع )`, `(٣)`, `(3 times)`,
 * `(ثلاث مرات)`. Counters must be preserved in display.
 */
function isCountOnly(content: string): boolean {
  const stripped = content
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .trim();
  if (!stripped) return false;
  // Numeric (Arabic-Indic / Eastern Arabic / Latin) optionally followed by مرة/مرات/مرتين/times
  if (/^[\u0660-\u0669\u06F0-\u06F9\d]+(\s+(مرة|مرات|مرتين|times?))?\s*$/i.test(stripped)) return true;
  // Word-based count, optionally followed by مرة/مرات/مرتين
  const WORDS = '(?:مرة|مرات|مرتين|ثلاث(?:ة|ا|ًا)?|اثنت?ان|اثنت?ين|أربع(?:ة)?|خمس(?:ة)?|ست(?:ة)?|سبع(?:ة|ًا)?|ثمان(?:ية|يا)?|تسع(?:ة)?|عشر(?:ة|ون|ين|ًا)?|عشرون|عشرين|مائة|مئة|ألف)';
  const re = new RegExp('^' + WORDS + '(\\s+' + WORDS + ')*\\s*$');
  return re.test(stripped);
}

/**
 * Strip display brackets and annotations from azkar text:
 * - (( )) double parentheses (hadith wrappers) → ( )
 * - [[ ]] double square brackets (scholarly annotations) → removed
 * - [ ] single square brackets (inline annotations) → removed
 * - ( ) outer parentheses wrapping the entire text → removed (unless they wrap a counter)
 * - أعوذ بالله من الشيطان الرجيم prefix before Quran verses (﴿)
 * PRESERVES count parentheses such as (ثلاث), (سبع), (ثلاث مرات), (٣).
 */
export function stripAzkarBrackets(text: string | undefined): string {
  if (!text) return '';
  let result = text
    // Step 1: Remove square brackets (single + double), keep inner content
    .replace(/\[\[/g, '')
    .replace(/\]\]/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    // Step 2: Collapse (( → ( and )) → )
    .replace(/\)\)/g, ')')
    .replace(/\(\(/g, '(')
    // Cleanup: orphan dashes, stray spaces around parens, double spaces
    .replace(/^\s*-\s*/, '')
    .replace(/\s*-\s*$/, '')
    .replace(/\s+\)/g, ')')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Strip outer wrapping parentheses only if:
  //   1. The opening ( matches the closing ), AND
  //   2. The wrapped content is NOT a counter we want to preserve.
  if (/^\(/.test(result) && /\)\s*\.?\s*$/.test(result)) {
    let depth = 0;
    let outerWraps = true;
    for (let i = 0; i < result.length; i++) {
      if (result[i] === '(') depth++;
      else if (result[i] === ')') depth--;
      if (depth === 0 && i < result.length - 1) {
        const remaining = result.substring(i + 1).trim();
        if (remaining && remaining !== '.' && remaining !== '،') {
          outerWraps = false;
          break;
        }
      }
    }
    if (outerWraps) {
      const inner = result.replace(/^\(\s*/, '').replace(/\s*\)\s*\.?\s*$/, '').trim();
      if (!isCountOnly(inner)) {
        result = inner;
      }
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
