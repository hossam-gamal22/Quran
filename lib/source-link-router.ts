// lib/source-link-router.ts
// ============================================================================
// Routes citation URLs from the SourcesList component. When a source links to
// a Qur'anic verse on quran.com we open the verse INSIDE our own Mushaf
// reader so the user stays in the app and gets the correct rendering. All
// other URLs (sunnah.com hadith, tafsir.app, islamqa, fatwa sites) open in
// the external browser via Linking.
// ============================================================================

import { Linking } from 'react-native';
import type { Router } from 'expo-router';

export interface QuranRef {
  surah: number;
  ayah?: number;    // start of range when source cites a range
  ayahEnd?: number; // inclusive end of range, omitted for single-ayah cites
}

const QURAN_HOSTS = new Set([
  'quran.com',
  'www.quran.com',
  'qurango.net',
  'quranenc.com',
]);

/**
 * Parses a Qur'an citation URL into { surah, ayah }. Handles the URL shapes
 * we generate in the bundled story sources:
 *   - https://quran.com/2/30-39           → { surah: 2, ayah: 30 }
 *   - https://quran.com/2/259             → { surah: 2, ayah: 259 }
 *   - https://quran.com/97                → { surah: 97 }
 *   - https://quran.com/en/2/259          → { surah: 2, ayah: 259 } (lang prefix)
 *   - https://quran.com/2:30              → { surah: 2, ayah: 30 } (colon)
 *   - https://quran.com/2?startingVerse=30 → { surah: 2, ayah: 30 }
 * Returns null for tafsir pages, search URLs, or anything we can't parse —
 * those should fall through to external browser.
 */
export function parseQuranUrl(rawUrl: string): QuranRef | null {
  if (!rawUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!QURAN_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  // Strip a leading language prefix segment like "/en" or "/ar" if present so
  // /en/2/259 collapses to /2/259.
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length > 0 && /^[a-z]{2}$/i.test(segments[0])) {
    segments.shift();
  }
  if (segments.length === 0) return null;

  // Reject tafsir, search, video, donate routes — those aren't ayah pages.
  const reserved = new Set(['tafsirs', 'tafsir', 'search', 'video', 'donate', 'about', 'reading', 'mushaf']);
  if (segments.some((seg) => reserved.has(seg.toLowerCase()))) return null;

  // Path forms: [surah], [surah, ayahOrRange], [surah:ayah]
  const first = segments[0];
  let surahStr = first;
  let ayahStr: string | undefined;
  if (first.includes(':')) {
    const [s, a] = first.split(':');
    surahStr = s;
    ayahStr = a;
  } else if (segments[1]) {
    ayahStr = segments[1];
  }

  const surah = Number(surahStr);
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return null;

  // ayah part may be "30" or "30-39" or undefined
  let ayah: number | undefined;
  let ayahEnd: number | undefined;
  if (ayahStr) {
    const parts = ayahStr.split(/[-–—]/);
    const start = Number(parts[0]);
    if (Number.isInteger(start) && start >= 1) ayah = start;
    if (parts[1]) {
      const end = Number(parts[1]);
      if (Number.isInteger(end) && ayah && end >= ayah) ayahEnd = end;
    }
  }
  // ?startingVerse=30 override (single ayah only — quran.com doesn't use a
  // range query parameter; tafsir pages with a range 404 anyway).
  const queryStart = parsed.searchParams.get('startingVerse');
  if (queryStart) {
    const q = Number(queryStart);
    if (Number.isInteger(q) && q >= 1) ayah = q;
  }
  return { surah, ayah, ayahEnd };
}

/**
 * Opens a source URL the right way:
 *   - Qur'an verse citations (single or range)  → focused in-app passage view
 *     (`/quran-passage`), which renders just the cited verses with play /
 *     share / "open in Mushaf" actions. This avoids the iOS Mushaf-page
 *     highlight quirk where `adjustsFontSizeToFit` collapses inline
 *     backgroundColor on nested Texts.
 *   - Whole-surah citations (no ayah) → straight to the Mushaf reader at
 *     page 1 of that surah; there's no specific verse to focus on.
 *   - Everything else (sunnah.com, tafsir.app, islamqa, …) → external
 *     browser via Linking.openURL.
 *
 * Returns true if a handler was invoked.
 */
export function openSourceLink(
  rawUrl: string | undefined,
  router: Router,
  options?: { sourceReference?: string },
): boolean {
  if (!rawUrl) return false;
  const quran = parseQuranUrl(rawUrl);
  if (quran) {
    if (quran.ayah) {
      const params: Record<string, string> = {
        surah: String(quran.surah),
        ayah: String(quran.ayah),
      };
      if (quran.ayahEnd) params.ayahEnd = String(quran.ayahEnd);
      // Pass the source's descriptive label as the passage page title so the
      // user sees the citation context (e.g. "خلق آدم وسجود الملائكة والتوبة")
      // rather than a generic "سورة X — الآيات".
      if (options?.sourceReference) params.title = options.sourceReference;
      router.push({ pathname: '/quran-passage', params } as never);
    } else {
      router.push({ pathname: '/surah/[id]', params: { id: String(quran.surah) } } as never);
    }
    return true;
  }
  Linking.openURL(rawUrl).catch(() => {
    // Silently swallow: the external URL was malformed or no app handled it.
  });
  return true;
}
