/**
 * Fix remaining missing keys using better anchors
 * Run with: node scripts/fix-missing-keys2.js
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_FILE = path.join(__dirname, '..', 'constants', 'translations.ts');

let content = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');

// Helper to find end of language block
function findEndOfBlock(content, startIdx) {
  let depth = 0;
  let started = false;
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '{') { depth++; started = true; }
    else if (content[i] === '}') {
      depth--;
      if (started && depth === 0) return i;
    }
  }
  return -1;
}

// Build language block positions
const langNames = ['ar', 'en', 'fr', 'de', 'tr', 'es', 'ur', 'id', 'ms', 'hi', 'bn', 'ru'];
const langStarts = {};
for (const lang of langNames) {
  const idx = content.indexOf(`const ${lang}: TranslationKeys = {`);
  if (idx >= 0) langStarts[lang] = idx;
}

const sortedLangs = Object.entries(langStarts).sort((a, b) => a[1] - b[1]);
const langEnds = {};
for (const [lang, start] of sortedLangs) {
  langEnds[lang] = findEndOfBlock(content, start);
}

// ============================================================
// Fix 1: Add settings keys to blocks missing generalFontSize
// Strategy: Find `worship:` in the block, go backwards to find `},`
// ============================================================
const settingsAdditions = `    generalFontSize: 'General Font Size',
    preview: 'Preview',
    homeLayout: 'Home Page Layout',
    grid: 'Grid',
    list: 'List',
    colorBackgrounds: 'Color Backgrounds',
    photoBackgrounds: 'Photo Backgrounds',
`;

// Process from end to start to maintain positions
const reversedLangs = [...sortedLangs].reverse();

for (const [lang, blockStart] of reversedLangs) {
  const blockEnd = langEnds[lang];
  const block = content.substring(blockStart, blockEnd + 2);
  
  if (block.includes('generalFontSize:')) continue;
  
  // Find settings section end: look for `  },\n  worship:` pattern
  const worshipIdx = block.indexOf('  worship:');
  if (worshipIdx < 0) {
    console.log(`❌ No worship: found in ${lang}`);
    continue;
  }
  
  // Go backwards from worship: to find the closing `},` of settings
  let settingsEndLine = -1;
  const blockLines = block.substring(0, worshipIdx).split('\n');
  for (let i = blockLines.length - 1; i >= 0; i--) {
    if (blockLines[i].trim() === '},') {
      settingsEndLine = i;
      break;
    }
  }
  
  if (settingsEndLine < 0) {
    console.log(`❌ No settings close found for ${lang}`);
    continue;
  }
  
  // Insert before the `},` line
  const beforeSettings = blockLines.slice(0, settingsEndLine).join('\n');
  const afterSettings = blockLines.slice(settingsEndLine).join('\n');
  const newBlockPart = beforeSettings + '\n' + settingsAdditions + afterSettings;
  
  content = content.substring(0, blockStart) + newBlockPart + block.substring(worshipIdx) + content.substring(blockStart + block.length);
  
  // Recalculate block end since we modified content
  langEnds[lang] = findEndOfBlock(content, blockStart);
  // Update subsequent block starts
  const addedLen = settingsAdditions.length + 1; // +1 for newline
  for (const [l, s] of sortedLangs) {
    if (s > blockStart) {
      langStarts[l] = content.indexOf(`const ${l}: TranslationKeys = {`);
      langEnds[l] = findEndOfBlock(content, langStarts[l]);
    }
  }
  
  console.log(`✅ Added settings keys to ${lang}`);
}

// ============================================================
// Fix 2: Add calendar keys to blocks missing monthEvents
// Strategy: Find daysShort line, insert after it
// ============================================================

// Re-read the file since positions changed
content = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');

// Actually, let's just do a simpler approach - find each daysShort line
// and if the next line doesn't contain monthEvents, insert it

const lines = content.split('\n');
const calendarAdd = [
  "    monthEvents: 'Events This Month',",
  "    adjustTitle: 'Adjust Hijri Date',",
  "    adjustHint: 'You can adjust the Hijri date by adding or subtracting days',"
];

// Work backwards to maintain line numbers
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('daysShort:') && lines[i].includes("'")) {
    // Check if monthEvents already follows within next 3 lines
    let hasMonthEvents = false;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      if (lines[j].includes('monthEvents:')) {
        hasMonthEvents = true;
        break;
      }
    }
    if (!hasMonthEvents) {
      lines.splice(i + 1, 0, ...calendarAdd);
      console.log(`✅ Added calendar keys after line ${i + 1}`);
    }
  }
}

content = lines.join('\n');
fs.writeFileSync(TRANSLATIONS_FILE, content, 'utf-8');

// ============================================================
// Fix 3: Add names keys to blocks missing gridView
// ============================================================
content = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');
const lines2 = content.split('\n');

const namesAdd = [
  "    title: 'Names of Allah',",
  "    gridView: 'Grid',",
  "    listView: 'List',",
  "    meaning: 'Meaning',",
  "    explanation: 'Explanation',",
  "    evidence: 'Evidence',",
  "    hadith: 'Hadith',",
  "    whatsapp: 'WhatsApp',",
  "    shareHeader: 'Share Name',",
  "    count99: '99 Names',",
  "    shareAsImage: 'Share as Image',",
  "    shareAsText: 'Share as Text',"
];

for (let i = lines2.length - 1; i >= 0; i--) {
  if (lines2[i].includes('nameCopied:') && lines2[i].includes("'")) {
    // Check if this block already has gridView within 5 lines
    let hasGridView = false;
    for (let j = i + 1; j < Math.min(i + 15, lines2.length); j++) {
      if (lines2[j].includes('gridView:')) {
        hasGridView = true;
        break;
      }
    }
    if (!hasGridView) {
      // Skip ar block (which already has Arabic values)
      const prevLines = lines2.slice(Math.max(0, i - 100), i).join('\n');
      if (prevLines.includes("const ar: TranslationKeys")) {
        // This is ar block, skip - it already has Arabic names
        continue;
      }
      lines2.splice(i + 1, 0, ...namesAdd);
      console.log(`✅ Added names keys after line ${i + 1}`);
    }
  }
}

content = lines2.join('\n');
fs.writeFileSync(TRANSLATIONS_FILE, content, 'utf-8');

// ============================================================
// Final verification
// ============================================================
const final = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');
console.log(`\nFinal Verification:`);
console.log(`  generalFontSize: ${(final.match(/generalFontSize:/g) || []).length} (expected 13)`);
console.log(`  monthEvents: ${(final.match(/monthEvents:/g) || []).length} (expected 13)`);
console.log(`  premiumTitle: ${(final.match(/premiumTitle:/g) || []).length} (expected 13)`);
console.log(`  ayatUniverse: ${(final.match(/ayatUniverse:/g) || []).length} (expected 13)`);
console.log(`  gridView: ${(final.match(/gridView:/g) || []).length} (expected 13)`);
console.log(`  seasonal: ${(final.match(/  seasonal:/g) || []).length} (expected 13)`);
console.log(`  File lines: ${final.split('\n').length}`);
