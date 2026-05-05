const r = await fetch('https://api.alquran.cloud/v1/edition?format=audio');
const j = await r.json();
const list = j.data
  .filter(e => e.type === 'versebyverse' && !e.identifier.endsWith('-2'))
  .sort((a, b) => a.identifier.localeCompare(b.identifier));
list.forEach(e => console.log(e.identifier.padEnd(34), '|', (e.englishName || '').padEnd(38), '|', e.name));
console.log('Total:', list.length);
