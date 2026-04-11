#!/usr/bin/env node
/**
 * translateAzkar.mjs — Phase 2b: Translate missing languages via Google Translate.
 * 
 * Translates English text to: de, es, tr, ur, hi, bn, ru
 * Also fills in missing fr, id, ms translations for items not matched from datasets.
 * 
 * Uses Google Translate's free web API (no API key needed).
 * Respects rate limits with delays between requests.
 * 
 * Saves progress periodically so it can be resumed if interrupted.
 * 
 * Usage: node scripts/translateAzkar.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AZKAR_PATH = join(__dirname, '..', 'data', 'json', 'azkar.json');
const CATS_PATH = join(__dirname, '..', 'data', 'json', 'categories.json');
const PROGRESS_PATH = join(__dirname, 'output', 'translate_progress.json');

// Languages to translate TO (from English source)
const TARGET_LANGS = ['de', 'es', 'tr', 'ur', 'hi', 'bn', 'ru'];
// Also fill gaps in these languages for unmatched items
const GAP_LANGS = ['fr', 'id', 'ms'];
const ALL_LANGS = [...TARGET_LANGS, ...GAP_LANGS];

// Load data
let azkar = JSON.parse(readFileSync(AZKAR_PATH, 'utf8'));
let categories = JSON.parse(readFileSync(CATS_PATH, 'utf8'));

// Load previous progress if available
let progress = {};
if (existsSync(PROGRESS_PATH)) {
  try {
    progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));
    console.log(`Loaded previous progress: ${Object.keys(progress).length} items cached`);
  } catch (e) {
    progress = {};
  }
}

// Google Translate language codes
const LANG_MAP = {
  de: 'de', es: 'es', tr: 'tr', ur: 'ur',
  hi: 'hi', bn: 'bn', ru: 'ru',
  fr: 'fr', id: 'id', ms: 'ms',
};

/**
 * Translate text using Google Translate's free API.
 * Uses the same endpoint as the web interface.
 */
function translate(text, targetLang, sourceLang = 'en') {
  return new Promise((resolve, reject) => {
    const encodedText = encodeURIComponent(text.substring(0, 5000)); // Limit text length
    const tl = LANG_MAP[targetLang] || targetLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${tl}&dt=t&q=${encodedText}`;
    
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed[0]) {
            const translated = parsed[0].map(s => s[0]).join('');
            resolve(translated);
          } else {
            reject(new Error('Unexpected response format'));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * Post-processing for Islamic text translations.
 * Ensures proper names and terms are preserved.
 */
function postProcess(text, lang) {
  if (!text) return text;
  
  let result = text;
  
  // Common fixes for all languages
  const replacements = {
    // Ensure "Allah" is not translated
    'Dieu': 'Allah', // French sometimes translates Allah as Dieu
    'God': 'Allah',
    'god': 'Allah',
  };
  
  // Language-specific fixes
  if (lang === 'de') {
    result = result.replace(/\bGott\b/g, 'Allah');
  }
  if (lang === 'es') {
    result = result.replace(/\bDios\b/g, 'Allah');
  }
  if (lang === 'ru') {
    result = result.replace(/\bБог\b/g, 'Аллах');
    result = result.replace(/\bбог\b/g, 'Аллах');
  }
  
  return result;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function saveProgress() {
  writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf8');
}

function saveData() {
  writeFileSync(AZKAR_PATH, JSON.stringify(azkar, null, 2), 'utf8');
  writeFileSync(CATS_PATH, JSON.stringify(categories, null, 2), 'utf8');
}

async function translateItems() {
  let translatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  console.log(`\n=== Translating ${azkar.length} items to ${ALL_LANGS.length} languages ===\n`);
  
  for (let i = 0; i < azkar.length; i++) {
    const item = azkar[i];
    const enText = item.translations?.en?.text;
    
    if (!enText) {
      // No English source — try Arabic → English first then translate
      skippedCount++;
      continue;
    }
    
    for (const lang of ALL_LANGS) {
      // Skip if already has translation
      if (item.translations?.[lang]?.text) continue;
      
      // Check progress cache
      const cacheKey = `${item.id}_${lang}`;
      if (progress[cacheKey]) {
        item.translations[lang] = { text: progress[cacheKey], verified: false };
        skippedCount++;
        continue;
      }
      
      try {
        const translated = await translate(enText, lang);
        const processed = postProcess(translated, lang);
        
        item.translations[lang] = { text: processed, verified: false };
        progress[cacheKey] = processed;
        translatedCount++;
        
        // Small delay to avoid rate limiting (100ms between requests)
        await delay(100);
        
      } catch (err) {
        failedCount++;
        if (failedCount % 10 === 0) {
          console.error(`  Failed ${failedCount}: item ${item.id} lang ${lang}: ${err.message}`);
        }
        // Longer delay on failure (might be rate limited)
        await delay(2000);
      }
    }
    
    // Save progress every 20 items
    if ((i + 1) % 20 === 0) {
      saveProgress();
      console.log(`  Progress: ${i + 1}/${azkar.length} items (translated: ${translatedCount}, skipped: ${skippedCount}, failed: ${failedCount})`);
    }
  }
  
  // Save final progress
  saveProgress();
  console.log(`\nItem translations done: translated=${translatedCount}, skipped=${skippedCount}, failed=${failedCount}`);
  
  return { translatedCount, skippedCount, failedCount };
}

async function translateCategories() {
  console.log(`\n=== Translating ${categories.categories.length} categories ===\n`);
  
  let translated = 0;
  
  for (let ci = 0; ci < categories.categories.length; ci++) {
    const cat = categories.categories[ci];
    const enName = cat.name?.en;
    if (!enName) continue;
    
    for (const lang of ALL_LANGS) {
      if (cat.name[lang]) continue; // Already has translation
      
      const cacheKey = `cat_${cat.id}_${lang}`;
      if (progress[cacheKey]) {
        cat.name[lang] = progress[cacheKey];
        continue;
      }
      
      try {
        const result = await translate(enName, lang);
        const processed = postProcess(result, lang);
        cat.name[lang] = processed;
        progress[cacheKey] = processed;
        translated++;
        await delay(100);
      } catch (err) {
        console.error(`  Failed: cat ${cat.id} lang ${lang}: ${err.message}`);
        await delay(2000);
      }
    }
    if ((ci + 1) % 10 === 0) {
      saveProgress();
      console.log(`  Categories: ${ci + 1}/${categories.categories.length} (${translated} new)`);
    }
  }
  
  saveProgress();
  console.log(`Category translations done: ${translated} new translations`);
}

async function main() {
  const startTime = Date.now();
  
  await translateCategories();
  await translateItems();
  
  // Save final data
  saveData();
  
  // Final statistics
  let stats = {};
  for (const lang of ['ar', 'en', ...ALL_LANGS]) {
    let count = 0;
    for (const item of azkar) {
      if (item.translations?.[lang]?.text) count++;
    }
    stats[lang] = count;
  }
  
  console.log('\n=== Final Translation Coverage ===');
  for (const [lang, count] of Object.entries(stats)) {
    const pct = (count / azkar.length * 100).toFixed(1);
    console.log(`  ${lang}: ${count}/${azkar.length} (${pct}%)`);
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCompleted in ${elapsed}s`);
}

main().catch(console.error);
