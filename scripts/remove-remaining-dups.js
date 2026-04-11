/**
 * Remove remaining duplicate azkar entries from azkar.json
 * 
 * Strategy: Keep the RICH version (has translations, audio, benefit).
 *           Remove SKELETON dups in the SAME category.
 *           Remove first-verse-only entries when full surah exists in same category.
 *           Keep cross-category occurrences (each category needs its own entries).
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'json', 'azkar.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// IDs to remove with reasons
const REMOVE_IDS = {
  // === MORNING: skeleton dups of rich morning entries ===
  108: 'morning partial (first ayah only) of full surah Al-Ikhlas (ID 23)',
  109: 'morning partial (first ayah only) of full surah Al-Falaq (ID 24)',
  110: 'morning partial (first ayah only) of full surah An-Nas (ID 25)',
  112: 'morning skeleton dup of sayyid al-istighfar (ID 3)',
  118: 'morning skeleton dup of nima dua (ID 5)',
  121: 'morning skeleton dup of alim al-ghayb dua (ID 9)',
  122: 'morning skeleton dup of ya hayyu ya qayyum (ID 12)',
  123: 'morning skeleton dup of bismillah alladhi la yadurr (ID 10)',
  125: 'morning skeleton dup of subhanallah wa bihamdihi (ID 15)',
  154: 'morning skeleton dup of asiluka ilman nafiaan (ID 18)',

  // === EVENING: skeleton dups of rich evening entries OR within-evening dups ===
  140: 'evening skeleton dup of amsayna wa amsa al-mulk (ID 86, evening rich)',
  142: 'evening skeleton dup of amsaytu ushhiduka (ID 88, evening rich)',
  143: 'evening skeleton dup of bika amsayna (ID 27, evening rich)',
  147: 'evening skeleton dup of ya hayyu ya qayyum (ID 136, same evening skeleton)',
  151: 'evening skeleton dup of subhanallah wa bihamdihi (ID 149, same evening)',
  153: 'evening skeleton dup of audhu bikalimaat (ID 89, evening rich)',

  // === WAKEUP: skeleton dup of rich entry ===
  173: 'wakeup skeleton dup of alhamdu lillah al-ladhi ahyana (ID 31, wakeup rich)',

  // === PRAYER SUPPLICATIONS: exact same-category dup ===
  236: 'prayerSupplications exact dup of subhana rabbiyal aala (ID 194)',
};

const idsToRemove = new Set(Object.keys(REMOVE_IDS).map(Number));

console.log('=== Azkar Duplicate Removal ===');
console.log(`Total entries before: ${data.azkar.length}`);
console.log(`Entries to remove: ${idsToRemove.size}`);
console.log('');

// Verify each ID exists before removal
const existingIds = new Set(data.azkar.map(z => z.id));
const missing = [];
const found = [];

for (const id of idsToRemove) {
  if (!existingIds.has(id)) {
    missing.push(id);
  } else {
    found.push(id);
  }
}

if (missing.length > 0) {
  console.log(`WARNING: ${missing.length} IDs not found: ${missing.join(', ')}`);
}
console.log(`Found ${found.length} entries to remove:`);
found.forEach(id => {
  const entry = data.azkar.find(z => z.id === id);
  const arabicPreview = entry.arabic.substring(0, 50);
  console.log(`  ID ${id} [${entry.category}]: ${arabicPreview}...`);
  console.log(`    Reason: ${REMOVE_IDS[id]}`);
});
console.log('');

// Perform removal
data.azkar = data.azkar.filter(z => !idsToRemove.has(z.id));
data.totalCount = data.azkar.length;
data.lastUpdate = new Date().toISOString().split('T')[0];

console.log(`Total entries after: ${data.azkar.length}`);

// Write back
fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
console.log('File written successfully.');
