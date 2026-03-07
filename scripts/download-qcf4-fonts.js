const fs = require('fs');
const https = require('https');
const path = require('path');

const OUT_DIR = path.join(__dirname, '../assets/fonts/qcf');
const BASE_URL = 'https://cdn.jsdelivr.net/gh/alheekmahlib/quran_library@main/assets/fonts/quran_fonts_qfc4';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function pad3(n) { return String(n).padStart(3, '0'); }

function downloadFont(n, cb) {
  const file = path.join(OUT_DIR, `QCF4_tajweed_${pad3(n)}.ttf.gz`);
  const url = `${BASE_URL}/QCF4_tajweed_${pad3(n)}.ttf.gz`;
  if (fs.existsSync(file.replace('.gz',''))) return cb();
  const fileStream = fs.createWriteStream(file);
  https.get(url, res => {
    if (res.statusCode !== 200) {
      fs.unlinkSync(file);
      return cb(new Error('Failed: ' + url));
    }
    res.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close(() => {
        // Decompress
        const zlib = require('zlib');
        const inp = fs.createReadStream(file);
        const out = fs.createWriteStream(file.replace('.gz',''));
        inp.pipe(zlib.createGunzip()).pipe(out).on('finish', () => {
          fs.unlinkSync(file);
          cb();
        });
      });
    });
  }).on('error', err => {
    fs.unlinkSync(file);
    cb(err);
  });
}

async function main() {
  let i = 1;
  function next() {
    if (i > 604) return console.log('All fonts downloaded!');
    downloadFont(i, err => {
      if (err) console.error('Error downloading page', i, err);
      else console.log('Downloaded page', i);
      i++;
      setTimeout(next, 200); // avoid hammering CDN
    });
  }
  next();
}

main();
