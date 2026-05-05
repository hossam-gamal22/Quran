// quick discovery: list all alquran.cloud audio editions
const r = await fetch('https://api.alquran.cloud/v1/edition?format=audio&language=ar');
const j = await r.json();
const list = j.data
  .filter(e => e.type === 'versebyverse' && !e.identifier.endsWith('-2'))
  .sort((a, b) => a.identifier.localeCompare(b.identifier));
for (const e of list) {
  console.log(e.identifier.padEnd(32), '|', (e.englishName || '').padEnd(38), '|', e.name);
}
console.log('\nTotal:', list.length);
