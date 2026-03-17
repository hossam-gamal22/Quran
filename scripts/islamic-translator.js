#!/usr/bin/env node

/**
 * Islamic Translation CLI
 * Scans constants/translations.ts for missing translations and auto-fills them.
 *
 * Usage:
 *   pnpm translate           -- find & translate all missing keys
 *   pnpm translate --dry-run -- report missing keys without translating
 *   pnpm translate --lang fr -- only translate missing French keys
 */

const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const TRANSLATIONS_FILE = path.join(__dirname, '..', 'constants', 'translations.ts');
const NEEDS_REVIEW_FILE = path.join(__dirname, '..', 'needs_review.json');

const ALL_LANGS = ['ar', 'en', 'fr', 'de', 'es', 'tr', 'ur', 'id', 'ms', 'hi', 'bn', 'ru'];

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const LIBRE_INSTANCES = [
  'https://libretranslate.com',
  'https://translate.argosopentech.com',
  'https://libretranslate.de',
];
const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://lingva.thedaviddelta.com',
];

const MYMEMORY_LOCALE = {
  ar: 'ar-SA', en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES',
  tr: 'tr-TR', ur: 'ur-PK', id: 'id-ID', ms: 'ms-MY', hi: 'hi-IN',
  bn: 'bn-BD', ru: 'ru-RU',
};

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const langFilter = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;

if (langFilter && !ALL_LANGS.includes(langFilter)) {
  console.error(`❌ Unknown language: ${langFilter}. Available: ${ALL_LANGS.join(', ')}`);
  process.exit(1);
}

// ─── Translation Functions ───────────────────────────────────────────────────

async function tryMyMemory(text, srcLang, tgtLang) {
  try {
    const src = MYMEMORY_LOCALE[srcLang] || srcLang;
    const tgt = MYMEMORY_LOCALE[tgtLang] || tgtLang;
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated || translated === text) return null;
    if (data?.responseStatus === 429) return null;
    return translated.trim();
  } catch {
    return null;
  }
}

async function tryLibreTranslate(text, srcLang, tgtLang) {
  for (const instance of LIBRE_INSTANCES) {
    try {
      const res = await fetch(`${instance}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: srcLang, target: tgtLang, format: 'text' }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.translatedText && data.translatedText !== text) {
        return data.translatedText.trim();
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function tryLingva(text, srcLang, tgtLang) {
  for (const instance of LINGVA_INSTANCES) {
    try {
      const url = `${instance}/api/v1/${srcLang}/${tgtLang}/${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.translation && data.translation !== text) {
        return data.translation.trim();
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function translate(text, srcLang, tgtLang) {
  let result = await tryMyMemory(text, srcLang, tgtLang);
  if (result) return { text: result, source: 'MyMemory' };

  result = await tryLibreTranslate(text, srcLang, tgtLang);
  if (result) return { text: result, source: 'LibreTranslate' };

  result = await tryLingva(text, srcLang, tgtLang);
  if (result) return { text: result, source: 'Lingva' };

  return null;
}

// ─── Parse translations.ts ──────────────────────────────────────────────────

/**
 * Extract flat key→value map from a language block.
 * Uses a simplified approach: reads the raw file between `const XX: TranslationKeys = {`
 * and the matching closing `};`, then extracts dotted paths.
 */
function extractLanguageBlock(fileContent, langCode) {
  const startPattern = new RegExp(`^const ${langCode}: TranslationKeys = \\{`, 'm');
  const startMatch = fileContent.match(startPattern);
  if (!startMatch) return null;

  const startIdx = startMatch.index + startMatch[0].length;
  let depth = 1;
  let idx = startIdx;
  while (depth > 0 && idx < fileContent.length) {
    const ch = fileContent[idx];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    idx++;
  }
  const blockContent = fileContent.slice(startMatch.index, idx);
  return blockContent;
}

function extractValues(blockContent) {
  const values = {};
  const lines = blockContent.split('\n');
  const pathStack = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments, empty, const declarations
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('const ')) continue;

    // Object key opening: `keyName: {`
    const objOpen = trimmed.match(/^(\w+)\s*:\s*\{/);
    if (objOpen) {
      pathStack.push(objOpen[1]);
      continue;
    }

    // Closing brace
    if (trimmed === '},' || trimmed === '}') {
      pathStack.pop();
      continue;
    }

    // String value: `keyName: 'value',` or `keyName: "value",`
    const strMatch = trimmed.match(/^(\w+)\s*:\s*['"`](.*)['"`]\s*,?\s*$/);
    if (strMatch) {
      const fullKey = [...pathStack, strMatch[1]].join('.');
      values[fullKey] = strMatch[2];
      continue;
    }

    // Template literal or multi-word string continuation — skip for now
  }

  return values;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌍 Islamic Translation CLI');
  console.log('─'.repeat(50));

  if (!fs.existsSync(TRANSLATIONS_FILE)) {
    console.error(`❌ File not found: ${TRANSLATIONS_FILE}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(TRANSLATIONS_FILE, 'utf8');

  // Extract Arabic (reference) values
  const arBlock = extractLanguageBlock(fileContent, 'ar');
  if (!arBlock) {
    console.error('❌ Could not find Arabic translation block');
    process.exit(1);
  }
  const arValues = extractValues(arBlock);
  const totalKeys = Object.keys(arValues).length;
  console.log(`📊 Found ${totalKeys} Arabic keys`);

  // Also extract English as secondary source
  const enBlock = extractLanguageBlock(fileContent, 'en');
  const enValues = enBlock ? extractValues(enBlock) : {};

  // Find missing translations per language
  const targetLangs = langFilter ? [langFilter] : ALL_LANGS.filter(l => l !== 'ar');
  const missingByLang = {};
  const needsReview = [];

  for (const lang of targetLangs) {
    const block = extractLanguageBlock(fileContent, lang);
    const values = block ? extractValues(block) : {};
    const missing = [];

    for (const key of Object.keys(arValues)) {
      if (!values[key] || values[key].trim() === '') {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      missingByLang[lang] = missing;
    }
  }

  // Report
  const totalMissing = Object.values(missingByLang).reduce((sum, keys) => sum + keys.length, 0);
  console.log(`\n📋 Missing translations:`);
  for (const [lang, keys] of Object.entries(missingByLang)) {
    console.log(`   ${lang}: ${keys.length} missing`);
  }
  console.log(`   Total: ${totalMissing} missing across ${Object.keys(missingByLang).length} languages\n`);

  if (totalMissing === 0) {
    console.log('✅ All translations are complete!');
    return;
  }

  if (DRY_RUN) {
    console.log('🔍 Dry run — no translations performed.');
    console.log('\nMissing keys:');
    for (const [lang, keys] of Object.entries(missingByLang)) {
      console.log(`\n  ${lang}:`);
      for (const key of keys.slice(0, 20)) {
        console.log(`    - ${key}`);
      }
      if (keys.length > 20) console.log(`    ... and ${keys.length - 20} more`);
    }
    return;
  }

  // Translate missing keys
  console.log('🚀 Starting translation...\n');
  let translated = 0;
  let failed = 0;

  for (const [lang, keys] of Object.entries(missingByLang)) {
    console.log(`\n  🌐 ${lang} (${keys.length} keys):`);

    for (const key of keys) {
      // Use English as source if available, otherwise Arabic
      const sourceText = enValues[key] || arValues[key];
      const sourceLang = enValues[key] ? 'en' : 'ar';

      process.stdout.write(`    ${key}... `);

      const result = await translate(sourceText, sourceLang, lang);

      if (result) {
        process.stdout.write(`✓ [${result.source}]\n`);
        translated++;
        needsReview.push({
          lang,
          key,
          original: sourceText,
          translated: result.text,
          source: result.source,
        });
      } else {
        process.stdout.write(`✗ FAILED\n`);
        failed++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Write needs_review.json
  if (needsReview.length > 0) {
    fs.writeFileSync(NEEDS_REVIEW_FILE, JSON.stringify(needsReview, null, 2), 'utf8');
    console.log(`\n📝 Wrote ${needsReview.length} translations to needs_review.json`);
    console.log(`   Review and manually paste into translations.ts`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Done! Translated: ${translated}, Failed: ${failed}`);
  console.log(`📋 Review: ${NEEDS_REVIEW_FILE}`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
