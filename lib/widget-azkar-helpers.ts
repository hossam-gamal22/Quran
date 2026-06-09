// lib/widget-azkar-helpers.ts
//
// Quran-content detection + chunk-splitting helpers shared between:
//   - `scripts/generate-bundled-azkar.mjs` (iOS bundle) — uses same logic
//     transcribed in plain JS so the offline bundle matches.
//   - `lib/widget-data.ts` (writes SharedWidgetData) — Android consumes
//     the pre-built pool from shared storage.
//   - `components/widgets/previews/index.tsx` (gallery + Android PNG bake)
//     — renders the same chunk at the same minute as the iOS SwiftUI view.
//
// Keeping all three call sites pointing at this file is what guarantees
// pixel-equivalent output across iOS and Android.

/** Max characters per chunk — sized so 3 lines of Rubik-Regular at the
 *  widget's body font (~18pt) fits without clipping on a medium tile. */
export const AZKAR_CHUNK_MAX_CHARS = 140;

/**
 * Strip tashkeel + normalize alif / ya / ta-marbuta variants so detection
 * regexes don't need to enumerate every diacritic combination. Used ONLY
 * for comparison — never for display text.
 */
function normalizeForDetect(text: string): string {
  return String(text)
    .replace(/[ً-ٰٟۖ-ۭٱ]/g, '')
    .replace(/[إأٱآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect whether the zikr body is pure Quran recitation. Returns a short
 * label ("قراءة آية الكرسي", "قراءة سورة الإخلاص", …) when detected so the
 * widget can render the label instead of the full Quran text — the
 * calligraphy never fits in a 3-line tile.
 *
 * MUST match the Swift-side detection in `scripts/generate-bundled-azkar.mjs`
 * `detectQuranTitle()` — both call sites use the same patterns.
 */
export function detectQuranTitle(rawText: string | null | undefined): string | null {
  if (!rawText) return null;
  const t = normalizeForDetect(rawText);

  const hasIkhlas = /قل هو الله احد/.test(t);
  const hasFalaq = /قل اعوذ برب الفلق/.test(t);
  const hasNas = /قل اعوذ برب الناس/.test(t);
  const hasKursi = /الحي القيوم لا تاخذه سنه ولا نوم/.test(t);
  const hasBaqarahEnd = /امن الرسول بما انزل اليه من ربه/.test(t);
  const hasSajdah = /يقرا الم تنزيل السجده/.test(t);
  const hasMulk = /وتبارك الذي بيده الملك/.test(t);

  if (hasSajdah && hasMulk) return 'قراءة سورتي السجدة والملك';
  if (hasSajdah) return 'قراءة سورة السجدة';
  if (hasMulk) return 'قراءة سورة الملك';
  if (hasKursi) return 'قراءة آية الكرسي';
  if (hasBaqarahEnd) return 'قراءة آخر آيتين من سورة البقرة';

  const surahs: string[] = [];
  if (hasIkhlas) surahs.push('الإخلاص');
  if (hasFalaq) surahs.push('الفلق');
  if (hasNas) surahs.push('الناس');
  if (surahs.length === 3) return 'قراءة سور الإخلاص والفلق والناس';
  if (surahs.length === 2) return `قراءة سورتي ${surahs.join(' و')}`;
  if (surahs.length === 1) return `قراءة سورة ${surahs[0]}`;

  return null;
}

/**
 * Split long Arabic dhikr text into ≤`maxChars` chunks at natural punctuation
 * breakpoints (، .). Falls back to word boundaries for unbroken stretches.
 * Always returns at least one chunk.
 *
 * MUST match `splitIntoChunks()` in `scripts/generate-bundled-azkar.mjs`.
 */
export function splitAzkarChunks(text: string, maxChars: number = AZKAR_CHUNK_MAX_CHARS): string[] {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return [clean];

  const segments = clean.split(/(?<=[،.])\s+/).filter((s) => s.trim().length > 0);
  const chunks: string[] = [];
  let current = '';
  for (const seg of segments) {
    const joined = current ? `${current} ${seg}` : seg;
    if (joined.length <= maxChars) {
      current = joined;
      continue;
    }
    if (current) {
      chunks.push(current);
      current = '';
    }
    if (seg.length <= maxChars) {
      current = seg;
      continue;
    }
    // Single oversized segment — split by word boundary.
    const words = seg.split(/\s+/);
    let acc = '';
    for (const w of words) {
      const candidate = acc ? `${acc} ${w}` : w;
      if (candidate.length <= maxChars) {
        acc = candidate;
      } else {
        if (acc) chunks.push(acc);
        acc = w;
      }
    }
    if (acc) current = acc;
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [clean];
}

/**
 * Public shape a single pooled zikr takes in `SharedWidgetData.azkarPools`.
 * Pre-computed at build time so the Android PNG bake doesn't need to redo
 * the Quran detection or chunk splitting at render time.
 */
export interface WidgetZikrPoolEntry {
  id: number;
  arabic: string;
  count: number;
  reference: string;
  benefit: string;
  /** ≥1 chunk, each ≤AZKAR_CHUNK_MAX_CHARS chars. */
  displayChunks: string[];
  /** Non-null when `arabic` is pure Quran — widget shows "قراءة <title>". */
  quranTitle: string | null;
  /** English translation (source: azkar.json `translations.en.text`).
   *  Rendered as the body when the widget language is English. */
  translation?: string;
  /** English short label for Quran-recitation entries (e.g.
   *  "Recite Ayat al-Kursi"). Mirrors `quranTitle` for the English path. */
  quranTitleEn?: string;
}

export interface WidgetAzkarPools {
  morning: WidgetZikrPoolEntry[];
  evening: WidgetZikrPoolEntry[];
}

/**
 * Pick (zikr, chunkIndex) from `pool` based on `date`'s minute-of-day. Each
 * chunk gets one minute slot, so a zikr with 3 chunks stays visible for
 * 3 minutes before advancing. Mirrors the Swift `BundledAzkar.currentSlot`
 * function exactly — keeps iOS + Android render in lockstep.
 */
export function pickAzkarSlot(
  pool: WidgetZikrPoolEntry[] | undefined,
  date: Date,
): { zikr: WidgetZikrPoolEntry; chunkIndex: number } | null {
  if (!pool || pool.length === 0) return null;
  const total = pool.reduce((sum, z) => sum + Math.max(z.displayChunks.length, 1), 0);
  if (total === 0) return null;
  const minute = date.getHours() * 60 + date.getMinutes();
  let pos = ((minute % total) + total) % total;
  for (const z of pool) {
    const n = Math.max(z.displayChunks.length, 1);
    if (pos < n) return { zikr: z, chunkIndex: pos };
    pos -= n;
  }
  return { zikr: pool[0]!, chunkIndex: 0 };
}

/**
 * Map an Arabic Quran-recitation title to its English equivalent. Kept
 * inline so the JS-generator + bridge + Swift bundle all produce
 * identical labels without needing a separate translation table.
 */
export function quranTitleToEnglish(arTitle: string): string {
  switch (arTitle.replace(/^قراءة\s+/, '').trim()) {
    case 'آية الكرسي': return 'Recite Ayat al-Kursi';
    case 'آخر آيتين من سورة البقرة': return 'Recite the last two ayat of Surah al-Baqarah';
    case 'سورة الإخلاص': return 'Recite Surah al-Ikhlas';
    case 'سورة الفلق': return 'Recite Surah al-Falaq';
    case 'سورة الناس': return 'Recite Surah an-Nas';
    case 'سورة الملك': return 'Recite Surah al-Mulk';
    case 'سورة السجدة': return 'Recite Surah as-Sajdah';
    case 'سورتي السجدة والملك': return 'Recite Surahs as-Sajdah and al-Mulk';
    case 'سور الإخلاص والفلق والناس': return 'Recite Surahs al-Ikhlas, al-Falaq, an-Nas';
    case 'سورتي الإخلاص و الفلق': return 'Recite Surahs al-Ikhlas and al-Falaq';
    case 'سورتي الإخلاص و الناس': return 'Recite Surahs al-Ikhlas and an-Nas';
    case 'سورتي الفلق و الناس': return 'Recite Surahs al-Falaq and an-Nas';
    default: return arTitle;
  }
}

/**
 * Strip parenthetical annotations (count notes, Surah headers, transliteration
 * hints, "(four times)", "(Note: for the evening, one reads…)") that bloat the
 * raw English translations in azkar.json. Widget body has limited space —
 * showing only the essential prose lets the rendered font stay LARGE and
 * readable instead of auto-shrinking down to fit 450 chars of explanation.
 *
 * Rules (applied repeatedly until stable):
 *   - Strip any complete "(…)" chunk at the end of the string.
 *   - If the entire remaining string is wrapped in a single outer "(…)" pair
 *     (balanced), strip those outer parens too.
 *
 * Examples:
 *   "(O Allah, …)(four times)(Note: …)" → "O Allah, …"
 *   "(In the name of Allah, …)" → "In the name of Allah, …"
 *   "Glory be to Allah (×100)" → "Glory be to Allah"
 */
/**
 * Strip ONLY the noise: trailing/inline count mentions, outer paren
 * wrappers, parenthetical recitation hints. NEVER truncates. Use this in
 * the in-app azkar reader for non-Arabic display so the user reads the
 * dhikr without "(× 10)" / "(four times)" duplicating the count badge
 * that's already shown separately in the UI.
 *
 * NOT applied to Arabic — the source Arabic body comes from azkar.json
 * with its own formatting conventions that the in-app screen expects.
 */
export function stripAzkarTranslationNoise(raw: string | undefined | null): string {
  if (!raw) return '';
  let t = String(raw).trim();

  // Strip square-bracket notes ANYWHERE — in this data `[...]` is always an
  // editorial/instructional note (e.g. "[For the evening, the supplication is
  // read as follows:]"), never part of the dhikr. Without this, sentence
  // pagination could surface such a note as a standalone page (an evening
  // instruction leaking into the Morning widget, and vice-versa).
  t = t.replace(/\[[^\]]*\]/g, ' ');

  // Strip parenthetical INSTRUCTIONAL notes anywhere (the dhikr body itself
  // never contains these phrases, so this can't eat real content):
  //   "(Note: …)", "(… read as follows …)", "(… whoever says this …)",
  //   "(… amsa instead of asbaha)".
  t = t.replace(/\([^()]*\b(?:note\s*:|read as follows|whoever says|instead of|amsa|asbaha)\b[^()]*\)/gi, ' ');
  t = t.replace(/\s+/g, ' ').trim();

  // Strip trailing balanced "(…)" chunks (paren walk handles nested parens).
  while (t.endsWith(')')) {
    let depth = 0;
    let start = -1;
    for (let i = t.length - 1; i >= 0; i--) {
      if (t[i] === ')') depth++;
      else if (t[i] === '(') {
        depth -= 1;
        if (depth === 0) { start = i; break; }
      }
    }
    if (start === -1) break;
    const before = t.slice(0, start).trim();
    if (before.length === 0) break;
    t = before;
  }

  // Unwrap outer parens if entire string is one balanced "(…)" pair.
  if (t.startsWith('(') && t.endsWith(')')) {
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '(') depth++;
      else if (t[i] === ')') {
        depth--;
        if (depth === 0 && i < t.length - 1) { balanced = false; break; }
      }
    }
    if (balanced) t = t.slice(1, -1).trim();
  }

  t = t.replace(/\s+/g, ' ').trim();

  // Strip inline count-mention parens: "(four times)", "(× 10)", "(7 times)",
  // "(Recite seven times)", "[ten times or once if lazy]" — count is shown
  // separately as a badge, so re-stating it inline is just noise.
  t = t.replace(/\s*[(\[][^()\[\]]*?(?:\btimes?\b|×\s*\d+|\d+\s*[xX]\s*\d*|\bonce\b)[^()\[\]]*?[)\]]\s*/gi, ' ').trim();
  t = t.replace(/\s+/g, ' ').trim();

  // Drop archaic "O Allah" vocative — modern English reads better as "Allah, …".
  t = t.replace(/\bO\s+Allah\b/g, 'Allah');

  return t;
}

export function cleanEnglishTranslation(raw: string | undefined | null): string {
  if (!raw) return '';
  // Widget-specific: strip notes/count hints, but do not truncate. The
  // renderer owns fitting the complete cleaned phrase.
  return stripAzkarTranslationNoise(raw);
}

// Paginate long English azkar so a page is NEVER a mid-sentence fragment AND
// stays readable. `maxChars` is sized so a page fills the tile at a large font;
// longer azkar split into multiple COMPLETE-sentence pages that cycle by the
// minute (so the user reads the whole dhikr over time, never a tiny wall of
// text and never a mid-word fragment). Kept in sync with the Swift copy in
// widgets/ios/RoohWidgets.swift.
export function splitLongEnglishAzkar(text: string, maxChars: number = 220): string[] {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  // Split into complete sentences (terminator kept with the sentence).
  const sentences = (clean.match(/[^.!?،؛]+[.!?،؛]?/g) ?? [clean])
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return [clean];

  // Pack whole sentences into ≤maxChars pages — never break inside a sentence.
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    const candidate = current ? `${current} ${s}` : s;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
      continue;
    }
    chunks.push(current);
    current = s;
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [clean];
}

export function pickLongEnglishAzkarPage(text: string, pageIndex: number): string {
  const chunks = splitLongEnglishAzkar(text);
  if (chunks.length <= 1) return chunks[0] ?? text;
  const idx = ((pageIndex % chunks.length) + chunks.length) % chunks.length;
  return chunks[idx] ?? text;
}

/**
 * Resolve the body text to display for a zikr slot — language-aware.
 *   Arabic mode: Arabic chunk (or "قراءة <title>" for Quran entries).
 *   English mode: English translation (or "Recite …" for Quran entries).
 * Falls back to Arabic when no English translation exists.
 *
 * Matches the Swift body-text resolution in AzkarQuoteView / DailyDhikrView.
 */
export function resolveAzkarBodyText(
  slot: { zikr: WidgetZikrPoolEntry; chunkIndex: number } | null,
  fallback: string,
  isArabic: boolean = true,
): { text: string; isQuran: boolean } {
  if (!slot) return { text: fallback, isQuran: false };
  // Quran-recitation entries: short title in the active language.
  if (slot.zikr.quranTitle) {
    const arBase = slot.zikr.quranTitle.replace(/^قراءة\s+/, '').trim();
    if (isArabic) {
      return { text: `قراءة ${arBase}`, isQuran: true };
    }
    const en = slot.zikr.quranTitleEn || quranTitleToEnglish(slot.zikr.quranTitle);
    return { text: en, isQuran: true };
  }
  // Regular zikr: Arabic chunk in Arabic mode, full English translation in
  // English mode. Strip parenthetical notes / count hints / transliteration
  // tips from English so the rendered body stays short enough that the font
  // doesn't auto-shrink into illegibility.
  if (!isArabic && slot.zikr.translation && slot.zikr.translation.length > 0) {
    const cleaned = cleanEnglishTranslation(slot.zikr.translation);
    // If the translation was ENTIRELY an editorial/instructional note (so it
    // strips to nothing), DON'T fall back to the raw note — show the Arabic
    // dhikr instead, so an evening instruction never leaks into Morning, etc.
    if (cleaned) {
      return { text: pickLongEnglishAzkarPage(cleaned, slot.chunkIndex), isQuran: false };
    }
  }
  // Arabic: show the FULL dhikr (complete) — NOT a ≤140-char chunk that could
  // end mid-sentence on a comma. The renderer's computed-fill sizing shrinks it
  // to fit, so it always reads as one complete dhikr.
  return { text: slot.zikr.arabic ?? fallback, isQuran: false };
}
