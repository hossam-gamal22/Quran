#!/usr/bin/env node
// Script to remove duplicate azkar entries
// Run: node scripts/clean-azkar-duplicates.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'json', 'azkar.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// IDs to remove - verified duplicates
const removeIds = new Set([
  // Same-category skeleton duplicates (empty translations, duplicate of rich entry)
  127,  // morning - "سبحان الله وبحمده" (dup of 125)
  172,  // house - "بسم الله، توكَّلت على الله..." (dup of 167)
  224,  // wakeup - "الحمد لله الذي أحيانًا بعد ما أماتنا..." (dup of 173)
  225,  // wakeup - "الحمد لله الذي ردَّ علي رُوحي..." (dup of 174)
  226,  // protection - "أعوذ بكلمات الله التامات من شر ما خلق" (dup of 177)
  227,  // protection - "أُعيذكما بكلمات الله التامة..." (dup of 178)
  228,  // travel - "الله أكبر... سُبْحَانَ الَّذِي سَخَّرَ لَنَا..." (dup of 179)
  237,  // wudu - "بسم الله" (dup of 206)
  238,  // wudu - "أشهد أنْ لا إله إلا الله..." (dup of 207)
  239,  // nature - "اللهم صيِّبًا نافعًا" (dup of 208)
  240,  // nature - "اللهم أهِلَّه علينا باليُمن..." (dup of 209)
  241,  // fasting - "ذهب الظمأ وابتلَّت العروق..." (dup of 232)
  242,  // fasting - "إني امرؤ صائم" (dup of 233)

  // Quran surah skeleton duplicates in protection (rich versions exist in morning + after_prayer)
  188,  // protection - سورة الناس (rich: 25 morning, 482 after_prayer)
  189,  // protection - سورة الإخلاص (rich: 23 morning, 48 after_prayer)
]);

console.log('Before: totalCount =', data.totalCount, ', actual azkar length =', data.azkar.length);

// Log what we're removing
const toRemove = data.azkar.filter(z => removeIds.has(z.id));
toRemove.forEach(z => {
  console.log('  REMOVING ID', z.id, '| category:', z.category, '| arabic:', z.arabic.substring(0, 60) + '...');
});

if (toRemove.length !== removeIds.size) {
  console.error('WARNING: Expected to remove', removeIds.size, 'but found', toRemove.length);
  const foundIds = new Set(toRemove.map(z => z.id));
  for (const id of removeIds) {
    if (!foundIds.has(id)) console.error('  Missing ID:', id);
  }
}

// Filter out duplicates
data.azkar = data.azkar.filter(z => !removeIds.has(z.id));

// Update totalCount
data.totalCount = data.azkar.length;

console.log('After: totalCount =', data.totalCount, ', actual azkar length =', data.azkar.length);
console.log('Removed', toRemove.length, 'duplicate entries');

// Write back
fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
console.log('Done! File written to', filePath);
