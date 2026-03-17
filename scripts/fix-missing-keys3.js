/**
 * Simple line-based insertion for missing translation keys
 * Run with: node scripts/fix-missing-keys3.js
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_FILE = path.join(__dirname, '..', 'constants', 'translations.ts');

let lines = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8').split('\n');

// ============================================================
// Fix 1: Add generalFontSize after the last key in settings block
// Strategy: Find "worship: {" lines and insert settings keys before the `},` that precedes them
// ============================================================

const settingsLines = [
  "    generalFontSize: 'General Font Size',",
  "    preview: 'Preview',",
  "    homeLayout: 'Home Page Layout',",
  "    grid: 'Grid',",
  "    list: 'List',",
  "    colorBackgrounds: 'Color Backgrounds',",
  "    photoBackgrounds: 'Photo Backgrounds',"
];

// Work backwards
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].match(/^\s+worship:\s*\{/)) {
    // Check if generalFontSize exists in the 50 lines above
    let hasKey = false;
    for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
      if (lines[j].includes('generalFontSize:')) {
        hasKey = true;
        break;
      }
    }
    if (!hasKey) {
      // Find the `},` line right before `worship: {`
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        if (lines[j].trim() === '},') {
          // Insert before this `},`
          lines.splice(j, 0, ...settingsLines);
          console.log(`✅ Added settings keys before line ${j + 1} (before worship block)`);
          break;
        }
      }
    }
  }
}

// ============================================================
// Fix 2: Add monthEvents after daysShort where missing
// ============================================================

const calendarLines = [
  "    monthEvents: 'Events This Month',",
  "    adjustTitle: 'Adjust Hijri Date',",
  "    adjustHint: 'You can adjust the Hijri date by adding or subtracting days',"
];

for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('daysShort:') && lines[i].includes("'")) {
    let hasMonthEvents = false;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      if (lines[j].includes('monthEvents:')) {
        hasMonthEvents = true;
        break;
      }
    }
    if (!hasMonthEvents) {
      lines.splice(i + 1, 0, ...calendarLines);
      console.log(`✅ Added calendar keys after daysShort at line ${i + 1}`);
    }
  }
}

// ============================================================
// Fix 3: Add names keys after nameCopied where missing gridView
// ============================================================

const namesLines = [
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

for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('nameCopied:') && lines[i].includes("'")) {
    let hasGridView = false;
    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      if (lines[j].includes('gridView:')) {
        hasGridView = true;
        break;
      }
    }
    if (!hasGridView) {
      // Check if this is the ar block (which has Arabic values already)  
      let isAr = false;
      for (let j = i - 1; j >= Math.max(0, i - 2000); j--) {
        if (lines[j].includes('const ar: TranslationKeys')) {
          isAr = true;
          break;
        }
        if (lines[j].match(/const \w+: TranslationKeys/)) {
          break; // found a different lang block
        }
      }
      if (!isAr) {
        lines.splice(i + 1, 0, ...namesLines);
        console.log(`✅ Added names keys after nameCopied at line ${i + 1}`);
      }
    }
  }
}

// Write
fs.writeFileSync(TRANSLATIONS_FILE, lines.join('\n'), 'utf-8');

// Verify
const final = fs.readFileSync(TRANSLATIONS_FILE, 'utf-8');
console.log(`\nFinal Verification:`);
console.log(`  generalFontSize: ${(final.match(/generalFontSize:/g) || []).length} (expected 13)`);
console.log(`  monthEvents: ${(final.match(/monthEvents:/g) || []).length} (expected 13)`);
console.log(`  premiumTitle: ${(final.match(/premiumTitle:/g) || []).length} (expected 13)`);
console.log(`  ayatUniverse: ${(final.match(/ayatUniverse:/g) || []).length} (expected 13)`);
console.log(`  gridView: ${(final.match(/gridView:/g) || []).length} (expected 13)`);
console.log(`  seasonal: ${(final.match(/  seasonal:/g) || []).length} (expected 13)`);
console.log(`  File lines: ${final.split('\n').length}`);
