// lib/stretch-arabic.ts
// Insert tatweel (kashida) characters into Arabic text to elongate connectable letters.
// Used by widgets to render names like "المغــــــرب" instead of "المغرب".

const TATWEEL = 'ـ';

// Letters that NEVER connect to the following letter (no tatweel after them)
const NON_CONNECTING_AFTER = new Set([
  'ا', 'أ', 'إ', 'آ', 'ٱ',
  'د', 'ذ',
  'ر', 'ز',
  'و', 'ؤ',
  'ء',
  'ة',
  'ى',
]);

// Diacritics / harakat — skip them when deciding insertion points
const DIACRITICS = /[\u064B-\u0652\u0670\u0640]/;

/**
 * Insert `level` tatweel characters between connectable Arabic letters.
 * Skips: non-Arabic chars, last letter, letters that don't connect forward.
 *
 * @example
 *   stretchArabic('المغرب', 5) // → 'المغـــــرب'
 *   stretchArabic('Maghrib', 5) // → 'Maghrib' (non-Arabic untouched)
 */
export function stretchArabic(text: string, level: number = 5): string {
  if (!text || level <= 0) return text;

  const chars = Array.from(text);
  const out: string[] = [];
  const tatweels = TATWEEL.repeat(level);

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    out.push(ch);

    // Skip diacritics — don't break the kashida insertion logic
    if (DIACRITICS.test(ch)) continue;

    // Find the next non-diacritic character
    let nextIdx = i + 1;
    while (nextIdx < chars.length && DIACRITICS.test(chars[nextIdx])) {
      nextIdx++;
    }
    if (nextIdx >= chars.length) continue; // last letter

    // Don't insert after a non-connecting letter
    if (NON_CONNECTING_AFTER.has(ch)) continue;

    // Don't insert before a non-Arabic next char (avoid stretching boundaries)
    const next = chars[nextIdx];
    if (!isArabicLetter(next)) continue;

    out.push(tatweels);
  }

  return out.join('');
}

function isArabicLetter(ch: string): boolean {
  const code = ch.charCodeAt(0);
  // Arabic block: 0x0600–0x06FF, plus presentation forms
  return (
    (code >= 0x0600 && code <= 0x06FF) ||
    (code >= 0xFB50 && code <= 0xFDFF) ||
    (code >= 0xFE70 && code <= 0xFEFF)
  );
}

/**
 * Stretch English text by inserting wide letter-spacing markers.
 * For non-Arabic, the visual stretching is achieved via CSS `letterSpacing`,
 * not by inserting characters — so this helper just returns the text unchanged.
 * (Use `letterSpacing: 4-8` in the Text style for visual elongation.)
 */
export function stretchLatin(text: string): string {
  return text;
}
