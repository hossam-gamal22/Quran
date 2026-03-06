const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'data', 'json');

// Convert ayah_info to page-lines format: { '1': [{ln, lt, c, fw, lw, sn}], ... }
const ayahInfo = JSON.parse(fs.readFileSync('/tmp/qpc_v4_ayah_info.json', 'utf8'));
const pageLines = {};
for (const item of ayahInfo) {
  const pn = item.page_number;
  if (!pageLines[pn]) pageLines[pn] = [];
  pageLines[pn].push({
    ln: item.line_number,
    lt: item.line_type,
    c: item.is_centered ? 1 : 0,
    fw: item.first_word_id || 0,
    lw: item.last_word_id || 0,
    sn: item.surah_number ? Number(item.surah_number) : 0,
  });
}
fs.writeFileSync(path.join(outDir, 'qcf-page-lines.json'), JSON.stringify(pageLines));
console.log('Wrote qcf-page-lines.json with', Object.keys(pageLines).length, 'pages');

// Convert words: { '1': {s, a, w, t}, ... }
const wordsRaw = JSON.parse(fs.readFileSync('/tmp/qpc-v4.json', 'utf8'));
const words = {};
// wordsRaw could be object keyed by id or array
const entries = Array.isArray(wordsRaw) ? wordsRaw : Object.values(wordsRaw);
for (const w of entries) {
  words[String(w.id)] = {
    s: Number(w.surah),
    a: Number(w.ayah),
    w: Number(w.word),
    t: w.text,
  };
}
fs.writeFileSync(path.join(outDir, 'qcf-words.json'), JSON.stringify(words));
console.log('Wrote qcf-words.json with', Object.keys(words).length, 'words');
