#!/usr/bin/env node
/**
 * Restore translations from the progress cache after rebuild.
 * Matches items by Arabic text content (since IDs changed after morning/evening split).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AZKAR_PATH = join(__dirname, '..', 'data', 'json', 'azkar.json');
const CATS_PATH = join(__dirname, '..', 'data', 'json', 'categories.json');
const PROGRESS_PATH = join(__dirname, 'output', 'translate_progress.json');
const ALSARMAD_PATH = join(__dirname, 'sources', 'adhkar_alsarmad.json');

const progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));
const azkar = JSON.parse(readFileSync(AZKAR_PATH, 'utf8'));
const categories = JSON.parse(readFileSync(CATS_PATH, 'utf8'));
const alsarmad = JSON.parse(readFileSync(ALSARMAD_PATH, 'utf8'));

const LANGS = ['de', 'es', 'tr', 'ur', 'hi', 'bn', 'ru', 'fr', 'id', 'ms'];

// Build old text → old item ID mapping (sequential through all source categories)
const oldTextToId = new Map();
let oldId = 1;
for (const cat of alsarmad) {
  for (const item of cat.array) {
    const key = (item.text || '').trim().substring(0, 150);
    oldTextToId.set(key, oldId);
    oldId++;
  }
}
console.log(`Old items mapped: ${oldTextToId.size}`);

// Restore item translations by matching Arabic text
let restored = 0;
let missing = 0;

for (const item of azkar) {
  const key = (item.arabic || '').trim().substring(0, 150);
  const matchedOldId = oldTextToId.get(key);
  if (!matchedOldId) continue;

  for (const lang of LANGS) {
    if (item.translations[lang]) continue; // Already has translation
    const cacheKey = `${matchedOldId}_${lang}`;
    if (progress[cacheKey]) {
      item.translations[lang] = { text: progress[cacheKey], verified: false };
      restored++;
    } else {
      missing++;
    }
  }
}

// Restore category translations from cache
const cats = categories.categories;
for (const cat of cats) {
  for (const lang of LANGS) {
    if (cat.name[lang]) continue;
    const cacheKey = `cat_${cat.id}_${lang}`;
    if (progress[cacheKey]) {
      cat.name[lang] = progress[cacheKey];
      restored++;
    }
  }
}

// Evening category "1b" — hardcoded translations since it's new
const eveningNames = {
  de: 'Abenderinnerungen', es: 'Recuerdos de la tarde', tr: 'Akşam Zikirleri',
  ur: 'شام کے اذکار', hi: 'शाम की याद', bn: 'সন্ধ্যার যিকির', ru: 'Вечерние поминания',
  fr: 'Invocations du soir', id: 'Dzikir Petang', ms: 'Zikir Petang',
};
const morningNames = {
  de: 'Morgenerinnerungen', es: 'Recuerdos de la mañana', tr: 'Sabah Zikirleri',
  ur: 'صبح کے اذکار', hi: 'सुबह की याद', bn: 'সকালের যিকির', ru: 'Утренние поминания',
  fr: 'Invocations du matin', id: 'Dzikir Pagi', ms: 'Zikir Pagi',
};

const cat1b = cats.find(c => c.id === '1b');
const cat1 = cats.find(c => c.id === '1');
for (const lang of LANGS) {
  if (cat1b && !cat1b.name[lang] && eveningNames[lang]) {
    cat1b.name[lang] = eveningNames[lang];
    restored++;
  }
  if (cat1 && !cat1.name[lang] && morningNames[lang]) {
    cat1.name[lang] = morningNames[lang];
    restored++;
  }
}

console.log(`Restored ${restored} translations, ${missing} missing from cache`);

// Save
writeFileSync(AZKAR_PATH, JSON.stringify(azkar, null, 2), 'utf8');
writeFileSync(CATS_PATH, JSON.stringify(categories, null, 2), 'utf8');
console.log('Saved azkar.json and categories.json');

// Verification
const LANG_CHECK = ['ar', 'en', 'de', 'es', 'tr', 'ur', 'hi', 'bn', 'ru', 'fr', 'id', 'ms'];
for (const lang of LANG_CHECK) {
  const count = azkar.filter(a => a.translations[lang]).length;
  console.log(`  ${lang}: ${count}/${azkar.length} (${(count / azkar.length * 100).toFixed(1)}%)`);
}

// Check category translations
const catMissing = [];
for (const cat of cats) {
  for (const lang of LANG_CHECK) {
    if (!cat.name[lang]) catMissing.push(`${cat.id}_${lang}`);
  }
}
console.log(`Category translation gaps: ${catMissing.length}`);
if (catMissing.length > 0 && catMissing.length <= 20) {
  console.log('  Missing:', catMissing.join(', '));
}
