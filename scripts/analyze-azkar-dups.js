#!/usr/bin/env node
// Analyze remaining duplicates in azkar.json

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'json', 'azkar.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const az = data.azkar;

// Normalize: strip tashkeel, extra spaces, punctuation for comparison
function norm(s) {
  return s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    .replace(/[﴿﴾۝٭*٫٬،؟,.\s\u200c\u200d\u00A0\-۞☆★◆◇○●«»]/g, ' ')
    .replace(/\d/g, '')  // remove verse numbers
    .replace(/\s+/g, ' ')
    .trim();
}

// Group by normalized text
const groups = {};
az.forEach(z => {
  const n = norm(z.arabic);
  if (groups[n] === undefined) groups[n] = [];
  groups[n].push({
    id: z.id,
    cat: z.category,
    sub: z.subcategory || '',
    count: z.count,
    hasRichTranslations: z.translations && typeof z.translations === 'object' && Object.keys(z.translations).length > 2,
    hasAudio: z.audio && z.audio.length > 0,
    hasBenefit: z.benefit && (typeof z.benefit === 'string' ? z.benefit.length > 0 : Object.keys(z.benefit).length > 0),
    arabic: z.arabic.substring(0, 100)
  });
});

// Find duplicates (groups with 2+ entries)
const dups = Object.entries(groups).filter(([k, v]) => v.length > 1);
console.log('Total azkar:', az.length);
console.log('Found', dups.length, 'groups of duplicate/near-duplicate Arabic text:\n');

dups.forEach(([key, entries]) => {
  console.log('--- DUPLICATE GROUP (' + entries.length + ' entries) ---');
  entries.forEach(e => {
    const catLabel = e.cat + (e.sub ? '/' + e.sub : '');
    console.log('  ID:', e.id, '| cat:', catLabel, '| count:', e.count, '| rich:', e.hasRichTranslations, '| audio:', e.hasAudio, '| benefit:', e.hasBenefit);
    console.log('    text:', e.arabic);
  });
  console.log('');
});

// Also check for "near duplicates" using first 40 chars
console.log('\n=== NEAR DUPLICATES (same first 40 normalized chars) ===\n');
const prefixGroups = {};
az.forEach(z => {
  const n = norm(z.arabic).substring(0, 40);
  if (n.length < 10) return; // skip very short
  if (prefixGroups[n] === undefined) prefixGroups[n] = [];
  prefixGroups[n].push({
    id: z.id,
    cat: z.category,
    sub: z.subcategory || '',
    count: z.count,
    hasRichTranslations: z.translations && typeof z.translations === 'object' && Object.keys(z.translations).length > 2,
    arabic: z.arabic.substring(0, 120)
  });
});

const nearDups = Object.entries(prefixGroups).filter(([k, v]) => v.length > 1);
// Only show near-dups that aren't already exact dups
const exactDupIds = new Set();
dups.forEach(([k, v]) => v.forEach(e => exactDupIds.add(e.id)));

nearDups.forEach(([key, entries]) => {
  // Skip if all entries are already in exact dup groups
  const newEntries = entries.filter(e => true); // show all for context
  if (newEntries.length > 1) {
    // Check if this is a new group not already found
    const ids = entries.map(e => e.id).sort().join(',');
    console.log('--- NEAR-DUP GROUP (' + entries.length + ' entries, prefix: "' + key.substring(0, 40) + '...") ---');
    entries.forEach(e => {
      const catLabel = e.cat + (e.sub ? '/' + e.sub : '');
      const marker = exactDupIds.has(e.id) ? ' [ALSO EXACT DUP]' : '';
      console.log('  ID:', e.id, '| cat:', catLabel, '| count:', e.count, '| rich:', e.hasRichTranslations + marker);
      console.log('    text:', e.arabic);
    });
    console.log('');
  }
});
