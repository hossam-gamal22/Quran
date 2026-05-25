#!/usr/bin/env node
/**
 * scripts/generate-bundled-azkar.mjs
 *
 * Reads `data/json/azkar.json` (288 azkar with 12-language translations)
 * and emits a slim Swift array into `widgets/ios/BundledAzkar.swift` that
 * the widget extension can bundle (~150-200 KB instead of 1.7 MB).
 *
 * Each entry keeps: id, category, arabic, count, reference (source),
 * benefit (Arabic only). Translations + audio are dropped — widget only
 * renders the Arabic card with Arabic metadata.
 *
 * Additionally emitted (NEW):
 *   - `displayChunks: [String]` — the arabic body pre-split into
 *     ≤140-char chunks so the widget never shows more than ~3 lines at
 *     once. The widget cycles through chunks 1-minute apart so long
 *     azkar (like أمسينا وأمسى الملك لله…) progress across the screen
 *     instead of being clipped.
 *   - `quranTitle: String?` — non-nil when the body is pure Quran
 *     recitation (Ayat al-Kursi, three Quls, آخر آيتين من البقرة, etc.).
 *     The widget then displays "قراءة <title>" with a heavier weight
 *     instead of the full Quran text, so the calligraphy isn't truncated
 *     and the user knows exactly what to recite.
 *
 * Category semantics (verified against app/azkar/[category].tsx):
 *   '1'  → أذكار الصباح (morning)
 *   '1b' → أذكار المساء (evening)
 *   '2'  → أذكار النوم (sleep)
 *   others → after-prayer, after-wudu, food, travel, etc.
 *
 * Subsets exposed:
 *   - `morning`  → ALL of category '1' (23 entries — keeps shared azkar)
 *   - `evening`  → category '1b' MINUS any entry whose text is identical
 *                  to a morning entry → 11 unique أمسينا-only entries
 *   - `daily`    → categories OTHER than '1' / '1b' (~243 entries)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const SRC = path.join(projectRoot, 'data', 'json', 'azkar.json');
const OUT = path.join(projectRoot, 'widgets', 'ios', 'BundledAzkar.swift');

const MORNING_CATEGORY = '1';
const EVENING_CATEGORY = '1b';

/** Max characters per chunk — sized so 3 lines of Rubik-Regular at the
 *  widget's body font (~18pt) fits without clipping on a medium tile. */
const CHUNK_MAX_CHARS = 140;

function escapeSwift(input) {
  if (input == null) return '';
  return String(input)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function resolveBenefit(benefit) {
  if (!benefit) return '';
  if (typeof benefit === 'string') return benefit;
  if (typeof benefit === 'object') {
    return benefit.ar || benefit.en || Object.values(benefit)[0] || '';
  }
  return '';
}

/**
 * azkar.json stores translations as either a plain string or a
 * `{ text, verified }` object. Returns the text string regardless.
 */
function resolveTranslationText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    const first = Object.values(value)[0];
    if (typeof first === 'string') return first;
  }
  return '';
}

/**
 * Arabic Quran-recitation title → English equivalent. Kept in lock-step
 * with `quranTitleToEnglish()` in `lib/widget-azkar-helpers.ts` so the
 * iOS bundle and the Android-side helper produce identical labels.
 */
function quranTitleToEnglish(arTitle) {
  const base = String(arTitle).replace(/^قراءة\s+/, '').trim();
  switch (base) {
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
 * Strip tashkeel and normalize alif variants so detection regexes don't
 * need to enumerate every diacritic combination. Returns the cleaned
 * comparison string — NEVER the user-visible text.
 */
function normalizeForDetect(text) {
  return String(text)
    .replace(/[ً-ْٰۖ-ۭٱ]/g, '') // tashkeel + various marks
    .replace(/[إأٱآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect whether the zikr body is pure Quran recitation and return a short
 * label ("قراءة آية الكرسي", "قراءة سورة الإخلاص", etc.). When detected,
 * the widget displays this label INSTEAD of the full Quran text — so the
 * tile shows a clean, readable instruction instead of clipped calligraphy.
 *
 * Returns null when the body is NOT a Quran-recitation entry.
 */
function detectQuranTitle(rawText) {
  if (!rawText) return null;
  const t = normalizeForDetect(rawText);

  const hasIkhlas = /قل هو الله احد/.test(t);
  const hasFalaq = /قل اعوذ برب الفلق/.test(t);
  const hasNas = /قل اعوذ برب الناس/.test(t);
  const hasKursi = /الحي القيوم لا تاخذه سنه ولا نوم/.test(t);
  const hasBaqarahEnd = /امن الرسول بما انزل اليه من ربه/.test(t);
  const hasSajdah = /يقرا الم تنزيل السجده/.test(t) || /يقرا الم.*تنزيل السجده/.test(t);
  const hasMulk = /وتبارك الذي بيده الملك/.test(t);

  if (hasSajdah && hasMulk) return 'قراءة سورتي السجدة والملك';
  if (hasSajdah) return 'قراءة سورة السجدة';
  if (hasMulk) return 'قراءة سورة الملك';

  if (hasKursi) return 'قراءة آية الكرسي';
  if (hasBaqarahEnd) return 'قراءة آخر آيتين من سورة البقرة';

  const surahs = [];
  if (hasIkhlas) surahs.push('الإخلاص');
  if (hasFalaq) surahs.push('الفلق');
  if (hasNas) surahs.push('الناس');
  if (surahs.length === 3) return 'قراءة سور الإخلاص والفلق والناس';
  if (surahs.length === 2) return `قراءة سورتي ${surahs.join(' و')}`;
  if (surahs.length === 1) return `قراءة سورة ${surahs[0]}`;

  return null;
}

/**
 * Split long azkar text into chunks of ≤ CHUNK_MAX_CHARS, breaking at
 * natural Arabic punctuation (، .) so each chunk reads as a complete
 * clause. Falls back to word-boundary splitting for unbroken stretches.
 * Returns at least one chunk.
 */
function splitIntoChunks(text, maxChars = CHUNK_MAX_CHARS) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return [clean];

  // Split on Arabic comma / period followed by whitespace.
  const segments = clean.split(/(?<=[،.])\s+/).filter((s) => s.trim().length > 0);
  const chunks = [];
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
    } else {
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
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [clean];
}

function main() {
  const raw = fs.readFileSync(SRC, 'utf-8');
  const all = JSON.parse(raw);
  if (!Array.isArray(all)) {
    console.error('[generate-bundled-azkar] azkar.json is not an array');
    process.exit(1);
  }

  const entries = all
    .filter((z) => z && typeof z.arabic === 'string' && z.arabic.trim().length > 0)
    .map((z) => {
      const arabic = String(z.arabic).trim();
      const quranTitle = detectQuranTitle(arabic);
      // When body is pure Quran, the widget shows "قراءة <title>" — a
      // single chunk. When not, split the full body into ≤140-char chunks
      // for sequential display.
      const chunks = quranTitle ? [`قراءة ${quranTitle.replace(/^قراءة\s+/, '')}`] : splitIntoChunks(arabic);
      const translation = resolveTranslationText(z?.translations?.en).trim();
      const quranTitleEn = quranTitle ? quranTitleToEnglish(quranTitle) : '';
      return {
        id: Number(z.id) || 0,
        category: String(z.category ?? ''),
        arabic,
        count: Number(z.count) || 1,
        reference: String(z.reference ?? '').trim(),
        benefit: String(resolveBenefit(z.benefit)).trim(),
        chunks,
        quranTitle,
        translation,
        quranTitleEn,
      };
    });

  const morningTexts = new Set(
    entries.filter((e) => e.category === MORNING_CATEGORY).map((e) => e.arabic),
  );
  const eveningUnique = entries.filter(
    (e) => e.category === EVENING_CATEGORY && !morningTexts.has(e.arabic),
  );

  const morningCount = entries.filter((e) => e.category === MORNING_CATEGORY).length;
  const eveningCount = eveningUnique.length;
  const eveningRaw = entries.filter((e) => e.category === EVENING_CATEGORY).length;
  const dailyCount = entries.filter(
    (e) => e.category !== MORNING_CATEGORY && e.category !== EVENING_CATEGORY,
  ).length;
  const quranCount = entries.filter((e) => e.quranTitle).length;
  const multiChunkCount = entries.filter((e) => e.chunks.length > 1).length;

  const lines = [];
  lines.push('// widgets/ios/BundledAzkar.swift');
  lines.push('//');
  lines.push('// GENERATED FILE — do not edit by hand.');
  lines.push('// Regenerate with: pnpm widgets:generate-azkar');
  lines.push('//');
  lines.push('// Source: data/json/azkar.json');
  lines.push(`// Total bundled: ${entries.length} azkar`);
  lines.push(`//   morning (category "1"):       ${morningCount} entries`);
  lines.push(`//   evening (category "1b"):      ${eveningRaw} entries raw → ${eveningCount} unique (deduped vs morning)`);
  lines.push(`//   daily  (anything but 1 / 1b): ${dailyCount} entries`);
  lines.push(`//   Quran recitation entries:     ${quranCount} (rendered as "قراءة …" instead of full text)`);
  lines.push(`//   Multi-chunk entries:          ${multiChunkCount} (split into ≤${CHUNK_MAX_CHARS}-char pages)`);
  lines.push('//');
  lines.push('// Dedup rule: 11 general azkar (آية الكرسي, يا حي يا قيوم, etc.) appear in');
  lines.push('// both "1" and "1b" in the source. We keep them in morning and drop from');
  lines.push('// evening so the morning + evening widgets NEVER show the same zikr at the');
  lines.push('// same time. Evening therefore renders only أمسينا-specific entries.');
  lines.push('');
  lines.push('import Foundation');
  lines.push('');
  lines.push('struct BundledZikr {');
  lines.push('    let id: Int');
  lines.push('    let category: String');
  lines.push('    let arabic: String');
  lines.push('    /// Body text pre-split into ≤140-char pages. AzkarQuoteView cycles');
  lines.push('    /// through these one minute at a time so a long zikr progresses');
  lines.push('    /// across the widget instead of being clipped at 3 lines.');
  lines.push('    let displayChunks: [String]');
  lines.push('    /// Non-nil for pure Quran recitation entries. Widget shows');
  lines.push('    /// "قراءة <quranTitle>" in heavy Rubik-Bold instead of the full');
  lines.push('    /// Quran text. Calligraphy never fits in a 3-line widget, so we');
  lines.push('    /// substitute a short readable instruction.');
  lines.push('    let quranTitle: String?');
  lines.push('    /// English translation (Saheeh / standard). Rendered as the body');
  lines.push('    /// when the widget language is English; falls back to Arabic when');
  lines.push('    /// missing. Source: azkar.json `translations.en`.');
  lines.push('    let translation: String');
  lines.push('    /// English label for Quran-recitation entries ("Recite Ayat al-Kursi", …).');
  lines.push('    let quranTitleEn: String');
  lines.push('    let count: Int');
  lines.push('    let reference: String');
  lines.push('    let benefit: String');
  lines.push('}');
  lines.push('');
  lines.push('enum BundledAzkar {');
  lines.push('    /// All azkar from data/json/azkar.json (slim — Arabic + Arabic');
  lines.push('    /// metadata + display chunks + Quran title). Order matches source.');
  lines.push('    static let all: [BundledZikr] = [');
  for (const e of entries) {
    const chunkLits = e.chunks.map((c) => `"${escapeSwift(c)}"`).join(', ');
    const qTitle = e.quranTitle ? `"${escapeSwift(e.quranTitle)}"` : 'nil';
    lines.push(
      `        BundledZikr(id: ${e.id}, category: "${escapeSwift(e.category)}", arabic: "${escapeSwift(e.arabic)}", displayChunks: [${chunkLits}], quranTitle: ${qTitle}, translation: "${escapeSwift(e.translation)}", quranTitleEn: "${escapeSwift(e.quranTitleEn)}", count: ${e.count}, reference: "${escapeSwift(e.reference)}", benefit: "${escapeSwift(e.benefit)}"),`,
    );
  }
  lines.push('    ]');
  lines.push('');
  lines.push('    /// Morning azkar (category "1") — full 23-entry set including general');
  lines.push('    /// azkar (Ayat al-Kursi, three Quls, etc.) shared with evening.');
  lines.push('    static let morning: [BundledZikr] = all.filter { $0.category == "1" }');
  lines.push('');
  lines.push('    /// Evening azkar (category "1b") MINUS any entry whose text appears in');
  lines.push('    /// `morning`. Guarantees morning + evening widgets never display the');
  lines.push('    /// same zikr at the same time — evening shows only أمسينا-unique entries.');
  lines.push('    static let evening: [BundledZikr] = {');
  lines.push('        let morningTexts = Set(morning.map { $0.arabic })');
  lines.push('        return all.filter { $0.category == "1b" && !morningTexts.contains($0.arabic) }');
  lines.push('    }()');
  lines.push('');
  lines.push('    /// Daily-dhikr pool: EXCLUDES both morning and evening categories so');
  lines.push('    /// daily dhikr never repeats content the dedicated widgets already show.');
  lines.push('    /// Includes sleep, after-prayer, after-wudu, food, travel — ~243 entries.');
  lines.push('    static let daily: [BundledZikr] = all.filter { z in');
  lines.push('        z.category != "1" && z.category != "1b"');
  lines.push('    }');
  lines.push('');
  lines.push('    /// Today\'s daily dhikr — deterministic by day-of-year so every user sees');
  lines.push('    /// the same zikr on the same day, changing at midnight.');
  lines.push('    static func todaysDhikr(for date: Date = Date()) -> BundledZikr? {');
  lines.push('        guard !daily.isEmpty else { return nil }');
  lines.push('        let cal = Calendar.current');
  lines.push('        let day = cal.ordinality(of: .day, in: .year, for: date) ?? 1');
  lines.push('        let idx = ((day - 1) % daily.count + daily.count) % daily.count');
  lines.push('        return daily[idx]');
  lines.push('    }');
  lines.push('');
  lines.push('    /// Pick today\'s daily dhikr + the chunk to show right now. Cycles');
  lines.push('    /// through the zikr\'s chunks one minute at a time so multi-page');
  lines.push('    /// azkar progress across the widget instead of being clipped.');
  lines.push('    static func todaysDhikrSlot(for date: Date = Date()) -> (zikr: BundledZikr, chunkIndex: Int)? {');
  lines.push('        guard let z = todaysDhikr(for: date) else { return nil }');
  lines.push('        let n = max(z.displayChunks.count, 1)');
  lines.push('        let comps = Calendar.current.dateComponents([.hour, .minute], from: date)');
  lines.push('        let minute = (comps.hour ?? 0) * 60 + (comps.minute ?? 0)');
  lines.push('        let idx = ((minute % n) + n) % n');
  lines.push('        return (z, idx)');
  lines.push('    }');
  lines.push('');
  lines.push('    /// Pick (zikr, chunk) from `pool` based on minute-of-day. Each chunk');
  lines.push('    /// gets one minute slot, so a zikr with 3 chunks stays visible for');
  lines.push('    /// 3 minutes before advancing to the next zikr. The total cycle');
  lines.push('    /// covers `sum(zikr.displayChunks.count)` minutes; minute % total');
  lines.push('    /// keeps the wheel turning even if the user leaves the widget visible.');
  lines.push('    static func currentSlot(for date: Date, in pool: [BundledZikr]) -> (zikr: BundledZikr, chunkIndex: Int)? {');
  lines.push('        guard !pool.isEmpty else { return nil }');
  lines.push('        let total = pool.reduce(0) { $0 + max($1.displayChunks.count, 1) }');
  lines.push('        guard total > 0 else { return nil }');
  lines.push('        let comps = Calendar.current.dateComponents([.hour, .minute], from: date)');
  lines.push('        let minute = (comps.hour ?? 0) * 60 + (comps.minute ?? 0)');
  lines.push('        var pos = ((minute % total) + total) % total');
  lines.push('        for z in pool {');
  lines.push('            let n = max(z.displayChunks.count, 1)');
  lines.push('            if pos < n {');
  lines.push('                return (z, pos)');
  lines.push('            }');
  lines.push('            pos -= n');
  lines.push('        }');
  lines.push('        // Unreachable given the modulo above, but keeps the compiler happy.');
  lines.push('        return (pool[0], 0)');
  lines.push('    }');
  lines.push('}');
  lines.push('');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n'), 'utf-8');

  const outSize = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`[generate-bundled-azkar] wrote ${entries.length} azkar → ${path.relative(projectRoot, OUT)} (${outSize} KB)`);
  console.log(`  morning: ${morningCount}, evening: ${eveningCount} (raw ${eveningRaw} − ${eveningRaw - eveningCount} shared), daily: ${dailyCount}`);
  console.log(`  Quran-recitation: ${quranCount}, multi-chunk: ${multiChunkCount} (max chars/chunk: ${CHUNK_MAX_CHARS})`);
}

main();
