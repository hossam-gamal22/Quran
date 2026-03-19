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
