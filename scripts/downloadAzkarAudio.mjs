#!/usr/bin/env node
/**
 * Downloads all Hisnul Muslim audio files from Alsarmad/Adhkar-json repo.
 * 397 files total: 131 category-level + 267 item-level.
 * 
 * Usage: node scripts/downloadAzkarAudio.mjs
 * 
 * Resumes from where it left off (skips already-downloaded files).
 */

import { readFileSync, existsSync, mkdirSync, createWriteStream } from 'fs';
import { join } from 'path';
import https from 'https';
import http from 'http';

const SOURCE_JSON = join(import.meta.dirname, 'sources', 'adhkar_alsarmad.json');
const OUTPUT_DIR = join(import.meta.dirname, '..', 'assets', 'sounds', 'azkar_authentic');
const BASE_URL = 'https://github.com/rn0x/Adhkar-json/raw/main/audio/';

// Parse source data
const data = JSON.parse(readFileSync(SOURCE_JSON, 'utf8'));
const allFiles = new Set();

data.forEach(cat => {
  if (cat.filename) allFiles.add(cat.filename);
  cat.array.forEach(item => {
    if (item.filename) allFiles.add(item.filename);
  });
});

const fileList = [...allFiles].sort();
console.log(`Total audio files to download: ${fileList.length}`);

// Ensure output directory
mkdirSync(OUTPUT_DIR, { recursive: true });

// Download with redirect following
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      const file = createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', (err) => { reject(err); });
    }).on('error', reject);
  });
}

// Download with concurrency limit
async function downloadAll() {
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const CONCURRENCY = 5;
  
  const queue = [...fileList];
  const active = new Set();
  
  async function processOne(filename) {
    const destPath = join(OUTPUT_DIR, `${filename}.mp3`);
    
    // Skip if already exists and non-empty
    if (existsSync(destPath)) {
      const stat = await import('fs').then(m => m.default.statSync(destPath));
      if (stat.size > 1000) {
        skipped++;
        return;
      }
    }
    
    const url = `${BASE_URL}${filename}.mp3`;
    try {
      await downloadFile(url, destPath);
      downloaded++;
      if (downloaded % 20 === 0) {
        console.log(`  Downloaded ${downloaded}/${fileList.length - skipped} (skipped ${skipped})`);
      }
    } catch (err) {
      failed++;
      console.error(`  FAILED: ${filename} — ${err.message}`);
    }
  }
  
  // Process queue with concurrency
  let i = 0;
  async function next() {
    if (i >= queue.length) return;
    const filename = queue[i++];
    await processOne(filename);
    await next();
  }
  
  const workers = [];
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push(next());
  }
  await Promise.all(workers);
  
  console.log(`\nDone! Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log(`Total files in ${OUTPUT_DIR}: check with 'ls | wc -l'`);
}

downloadAll().catch(console.error);
