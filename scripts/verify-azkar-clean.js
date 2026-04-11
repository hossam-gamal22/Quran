/**
 * Quick post-cleanup verification: check for any remaining same-category duplicates
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'json', 'azkar.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

function normalize(text) {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // tashkeel only (not letters)
    .replace(/[.,،؛:\-!؟?(){}[\]"'«»\u060C\u061B\u06D4﴿﴾]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

console.log(`Total entries: ${data.azkar.length}`);
console.log(`totalCount field: ${data.totalCount}`);
console.log('');

// Group by category and find same-category dups
const byCat = {};
data.azkar.forEach(z => {
  const cat = z.category + (z.subcategory ? '/' + z.subcategory : '');
  if (!byCat[cat]) byCat[cat] = [];
  byCat[cat].push(z);
});

let sameCatDups = 0;
for (const [cat, entries] of Object.entries(byCat)) {
  const seen = {};
  for (const z of entries) {
    const norm = normalize(z.arabic).substring(0, 40);
    if (seen[norm]) {
      sameCatDups++;
      console.log(`SAME-CAT DUP in [${cat}]:`);
      console.log(`  ID ${seen[norm].id}: ${seen[norm].arabic.substring(0, 60)}...`);
      console.log(`  ID ${z.id}: ${z.arabic.substring(0, 60)}...`);
    } else {
      seen[norm] = z;
    }
  }
}

if (sameCatDups === 0) {
  console.log('NO same-category duplicates found. Data is clean.');
} else {
  console.log(`\nFound ${sameCatDups} same-category duplicate(s).`);
}

// Check cross-category dups for info
const allNorm = {};
let crossCatDups = 0;
data.azkar.forEach(z => {
  const norm = normalize(z.arabic).substring(0, 40);
  const cat = z.category + (z.subcategory ? '/' + z.subcategory : '');
  if (allNorm[norm] && allNorm[norm].cat !== cat) {
    crossCatDups++;
  }
  if (!allNorm[norm]) allNorm[norm] = { id: z.id, cat };
});
console.log(`\nCross-category near-matches: ${crossCatDups} (kept intentionally — different contexts)`);
