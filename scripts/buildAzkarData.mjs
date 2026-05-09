#!/usr/bin/env node
/**
 * buildAzkarData.mjs — Phase 2+3: Merge all Hisnul Muslim datasets and produce
 * the final azkar.json and categories.json for the app.
 * 
 * Sources:
 *   1. Alsarmad (Arabic + audio) — PRIMARY, 132 categories, 267 items
 *   2. wafaaelmaandy (English) — 132 categories, 267 items (same order as Alsarmad)
 *   3. AleaToir3 (French + transliteration + references) — 133 categories (original HM order)
 *   4. adiman-dev SQL (Indonesian + Malay) — 132 groups, 221 items (original HM order)
 * 
 * Matching: Alsarmad↔English by index; French & SQL by Arabic text similarity.
 * 
 * Output:
 *   data/json/azkar.json   — flat array of all azkar items
 *   data/json/categories.json — { categories: [...] } with 132 entries
 * 
 * Usage: node scripts/buildAzkarData.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ===================================================
// Load sources
// ===================================================

const alsarmad = JSON.parse(readFileSync(join(__dirname, 'sources/adhkar_alsarmad.json'), 'utf8'));
const enRaw = JSON.parse(readFileSync(join(__dirname, 'sources/husn_en.json'), 'utf8'));
const frRaw = JSON.parse(readFileSync(join(__dirname, 'sources/husn_fr.json'), 'utf8'));
const sqlData = JSON.parse(readFileSync(join(__dirname, 'sources/husn_ms_id_parsed.json'), 'utf8'));

const enCats = enRaw.English || enRaw;

console.log(`Loaded: Alsarmad=${alsarmad.length} cats, English=${enCats.length} cats, French=${frRaw.length} cats, SQL=${sqlData.groups.length} groups/${sqlData.duas.length} items`);

// ===================================================
// Arabic text normalization for matching
// ===================================================

function normalizeArabic(text) {
  if (!text) return '';
  return text
    // Remove tashkeel
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
    // Normalize alef variants
    .replace(/[إأآٱ]/g, 'ا')
    // Normalize hamza
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    // Normalize taa marbuta
    .replace(/ة/g, 'ه')
    // Remove tatweel
    .replace(/ـ/g, '')
    // Remove brackets, parentheses, ornamental chars
    .replace(/[﴿﴾\(\)\[\]{}<>«»""''،؛.:!؟\-–—]/g, '')
    // Remove non-Arabic chars (keep Arabic letters + spaces only)
    .replace(/[^\u0600-\u06FF\s]/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes similarity between two Arabic strings.
 * Returns 0-1 where 1 is exact match.
 */
function arabicSimilarity(a, b) {
  const na = normalizeArabic(a);
  const nb = normalizeArabic(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  
  // Check if one contains the other (for title matching)
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  
  // Word overlap for titles
  const wordsA = new Set(na.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

/**
 * For item-level matching, use word-bag overlap to handle different formatting.
 */
function itemSimilarity(a, b) {
  const na = normalizeArabic(a);
  const nb = normalizeArabic(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  
  // Word-bag comparison (words longer than 2 chars to skip particles)
  const wordsA = na.split(' ').filter(w => w.length > 2);
  const wordsB = nb.split(' ').filter(w => w.length > 2);
  
  if (wordsA.length === 0 || wordsB.length === 0) {
    // Fallback for very short texts: compare first 30 chars
    const pa = na.substring(0, 30);
    const pb = nb.substring(0, 30);
    if (pa === pb) return 0.95;
    return 0;
  }
  
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let overlap = 0;
  for (const w of setA) {
    if (setB.has(w)) overlap++;
  }
  
  return overlap / Math.max(setA.size, setB.size);
}

// ===================================================
// Build French lookup by matching Arabic text in dua items
// ===================================================

// French has arabic text in each dua item: dua[].ar
// Build a map: normalizedArabicPrefix → { fr, tic (transliteration), ref }
const frenchItemMap = new Map();
const frenchCatMap = new Map();

for (const cat of frRaw) {
  // Handle dua being either array or single object
  const duaList = Array.isArray(cat.dua) ? cat.dua : (cat.dua ? [cat.dua] : []);
  for (const dua of duaList) {
    if (dua.ar) {
      const key = normalizeArabic(dua.ar).substring(0, 50);
      frenchItemMap.set(key, {
        fr: dua.fr || '',
        tic: dua.tic || '',
        ref: dua.ref || '',
      });
    }
  }
  // Also store category titles: use the Arabic text from first item to match
  if (duaList[0]?.ar) {
    const catKey = normalizeArabic(duaList[0].ar).substring(0, 50);
    frenchCatMap.set(catKey, cat.tt_fr || '');
  }
}

console.log(`French items indexed: ${frenchItemMap.size}, categories: ${frenchCatMap.size}`);

// ===================================================
// Build SQL lookup by Arabic text
// ===================================================

// Group items by group_id
const sqlItemsByGroup = new Map();
for (const dua of sqlData.duas) {
  if (!sqlItemsByGroup.has(dua.group_id)) sqlItemsByGroup.set(dua.group_id, []);
  sqlItemsByGroup.get(dua.group_id).push(dua);
}

// Build SQL item lookup by Arabic prefix
const sqlItemMap = new Map();
for (const dua of sqlData.duas) {
  if (dua.ar_dua) {
    const key = normalizeArabic(dua.ar_dua).substring(0, 50);
    sqlItemMap.set(key, dua);
  }
}

// Match SQL groups to Alsarmad categories by Arabic title similarity
const sqlGroupMatchToAlsarmad = new Map(); // alsarmadCatId → sqlGroup
for (const alCat of alsarmad) {
  let bestMatch = null;
  let bestScore = 0;
  for (const sqlGroup of sqlData.groups) {
    const score = arabicSimilarity(alCat.category, sqlGroup.ar_title);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = sqlGroup;
    }
  }
  if (bestMatch && bestScore >= 0.5) {
    sqlGroupMatchToAlsarmad.set(alCat.id, bestMatch);
  }
}
console.log(`SQL groups matched to Alsarmad: ${sqlGroupMatchToAlsarmad.size}/132`);

// ===================================================
// Match French categories to Alsarmad
// ===================================================

// French is in a different order than Alsarmad. Match by checking
// if the French category's first Arabic dua matches any Alsarmad category's first item.
const frenchCatMatchToAlsarmad = new Map(); // alsarmadCatId → frCat
for (const alCat of alsarmad) {
  if (!alCat.array?.[0]?.text) continue;
  
  let bestMatch = null;
  let bestScore = 0;
  for (const frCat of frRaw) {
    const frDuaList = Array.isArray(frCat.dua) ? frCat.dua : (frCat.dua ? [frCat.dua] : []);
    if (!frDuaList[0]?.ar) continue;
    const score = itemSimilarity(alCat.array[0].text, frDuaList[0].ar);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = frCat;
    }
  }
  if (bestMatch && bestScore >= 0.6) {
    frenchCatMatchToAlsarmad.set(alCat.id, bestMatch);
  }
}
console.log(`French categories matched to Alsarmad: ${frenchCatMatchToAlsarmad.size}/132`);

// ===================================================
// Category icon and color mapping
// ===================================================

const CATEGORY_ICONS = {
  'أذكار الصباح والمساء': { icon: 'weather-sunset-up', color: '#F59E0B' },
  'أذكار النوم': { icon: 'weather-night', color: '#3B82F6' },
  'أذكار الاستيقاظ من النوم': { icon: 'white-balance-sunny', color: '#10B981' },
  'دعاء دخول الخلاء': { icon: 'door', color: '#6B7280' },
  'دعاء الخروج من الخلاء': { icon: 'door-open', color: '#6B7280' },
  'الذكر قبل الوضوء': { icon: 'water', color: '#06B6D4' },
  'الذكر بعد الفراغ من الوضوء': { icon: 'water-check', color: '#14B8A6' },
  'الذكر عند الخروج من المنزل': { icon: 'home-export-outline', color: '#8B5CF6' },
  'الذكر عند دخول المنزل': { icon: 'home-import-outline', color: '#8B5CF6' },
  'دعاء الذهاب إلى المسجد': { icon: 'mosque', color: '#6366F1' },
  'دعاء دخول المسجد': { icon: 'mosque', color: '#6366F1' },
  'دعاء الخروج من المسجد': { icon: 'mosque', color: '#6366F1' },
  'أذكار الأذان': { icon: 'bullhorn', color: '#EC4899' },
  'دعاء الاستفتاح': { icon: 'hand-heart', color: '#F97316' },
  'دعاء الركوع': { icon: 'hand-heart', color: '#F97316' },
  'دعاء الرفع من الركوع': { icon: 'hand-heart', color: '#F97316' },
  'دعاء السجود': { icon: 'hand-heart', color: '#F97316' },
  'دعاء الجلسة بين السجدتين': { icon: 'hand-heart', color: '#F97316' },
  'دعاء سجود التلاوة': { icon: 'hand-heart', color: '#F97316' },
  'التشهد': { icon: 'hand-heart', color: '#F97316' },
  'الصلاة على النبي بعد التشهد': { icon: 'star-crescent', color: '#E91E63' },
  'الدعاء بعد التشهد الأخير قبل السلام': { icon: 'hand-heart', color: '#F97316' },
  'الأذكار بعد السلام من الصلاة': { icon: 'hand-heart', color: '#EC4899' },
  'دعاء صلاة الاستخارة': { icon: 'compass', color: '#14B8A6' },
  'أذكار الطعام': { icon: 'food', color: '#F97316' },
  'دعاء السفر': { icon: 'airplane', color: '#06B6D4' },
  'دعاء لبس الثوب': { icon: 'tshirt-crew', color: '#A855F7' },
  'الاستغفار و التوبة': { icon: 'heart', color: '#8B5CF6' },
  'فضل التسبيح و التحميد، و التهليل، و التكبير': { icon: 'star', color: '#F59E0B' },
  'كيف كان النبي يسبح؟': { icon: 'star-crescent', color: '#E91E63' },
  'من أنواع الخير والآداب الجامعة': { icon: 'book-open-variant', color: '#10B981' },
};

function getCategoryMeta(arabicName) {
  for (const [key, val] of Object.entries(CATEGORY_ICONS)) {
    if (arabicSimilarity(arabicName, key) >= 0.7) return val;
  }
  // Default based on content keywords
  if (arabicName.includes('دعاء')) return { icon: 'hand-heart', color: '#F97316' };
  if (arabicName.includes('أذكار')) return { icon: 'book-open-variant', color: '#10B981' };
  if (arabicName.includes('صلاة') || arabicName.includes('الصلاة')) return { icon: 'hand-heart', color: '#EC4899' };
  if (arabicName.includes('المسجد')) return { icon: 'mosque', color: '#6366F1' };
  if (arabicName.includes('السفر')) return { icon: 'airplane', color: '#06B6D4' };
  if (arabicName.includes('المنزل') || arabicName.includes('البيت')) return { icon: 'home', color: '#8B5CF6' };
  if (arabicName.includes('الطعام') || arabicName.includes('الأكل')) return { icon: 'food', color: '#F97316' };
  if (arabicName.includes('المريض')) return { icon: 'hospital-box', color: '#EF4444' };
  if (arabicName.includes('الميت') || arabicName.includes('الجنازة')) return { icon: 'grave-stone', color: '#6B7280' };
  if (arabicName.includes('الريح') || arabicName.includes('المطر') || arabicName.includes('الرعد')) return { icon: 'weather-lightning-rainy', color: '#84CC16' };
  if (arabicName.includes('النكاح') || arabicName.includes('الزواج')) return { icon: 'ring', color: '#D946EF' };
  if (arabicName.includes('الحج') || arabicName.includes('العمرة')) return { icon: 'kaaba', color: '#DAA520' };
  return { icon: 'book', color: '#6B7280' };
}

// ===================================================
// Morning/Evening classification for category 1 split
// ===================================================

/**
 * Classify items in Alsarmad category 1 (أذكار الصباح والمساء):
 * - SHARED: same text for both morning & evening
 * - BOTH_WITH_VARIANT: main text is morning, has [وإذا أمسى...] evening variant
 * - MORNING_ONLY: text only for morning (e.g., "إذا أصبحَ" count instructions)
 * - EVENING_ONLY: text only for evening (e.g., "إذا أمسى" count instructions)
 */
function classifyMorningEvening(text) {
  if (!text) return 'SHARED';
  const hasEveningBracket = text.includes('وإذا أمسى');
  const hasMorningWord = text.includes('أَصْبَحْ') || text.includes('أصبح');
  const hasEveningWord = text.includes('أمسى') || text.includes('أَمْسَ');
  
  if (hasEveningBracket) return 'BOTH_WITH_VARIANT';
  
  // Evening-only: mentions أمسى without being part of a variant bracket
  // Item 23: "إذا أمسى" instruction without any morning context
  if (hasEveningWord && !hasMorningWord) return 'EVENING_ONLY';
  
  // Morning-only: has أصبح but no evening mention at all
  if (hasMorningWord && !hasEveningWord) return 'MORNING_ONLY';
  
  return 'SHARED';
}

// ===================================================
// Build final data
// ===================================================

const allAzkar = [];
const allCategories = [];
let globalItemId = 1;

for (let catIdx = 0; catIdx < alsarmad.length; catIdx++) {
  const alCat = alsarmad[catIdx];
  const enCat = enCats[catIdx]; // Same index — verified both have 132 in same order
  const sqlGroup = sqlGroupMatchToAlsarmad.get(alCat.id);
  const frCat = frenchCatMatchToAlsarmad.get(alCat.id);
  
  // =============================================================
  // SPECIAL: Split category 1 into morning ("1") and evening ("1b")
  // =============================================================
  if (alCat.id === 1) {
    // --- Morning category ---
    const morningCatNames = {
      ar: 'أذكار الصباح',
      en: 'Morning Remembrance',
    };
    if (frCat) morningCatNames.fr = 'Invocations du matin';
    if (sqlGroup) {
      morningCatNames.id = 'Dzikir Pagi';
      morningCatNames.ms = 'Zikir Pagi';
    }
    allCategories.push({
      id: '1',
      name: morningCatNames,
      icon: 'weather-sunset-up',
      color: '#F59E0B',
      order: 1,
      audioFile: alCat.filename ? `${alCat.filename}.mp3` : null,
    });

    // --- Evening category ---
    const eveningCatNames = {
      ar: 'أذكار المساء',
      en: 'Evening Remembrance',
    };
    if (frCat) eveningCatNames.fr = 'Invocations du soir';
    if (sqlGroup) {
      eveningCatNames.id = 'Dzikir Petang';
      eveningCatNames.ms = 'Zikir Petang';
    }
    allCategories.push({
      id: '1b',
      name: eveningCatNames,
      icon: 'weather-night',
      color: '#6366F1',
      order: 2,
      audioFile: alCat.filename ? `${alCat.filename}.mp3` : null,
    });

    // --- Classify and distribute items ---
    const enItems = enCat?.TEXT || [];
    const sqlItems = sqlGroup ? (sqlItemsByGroup.get(sqlGroup.id) || []) : [];
    const frItems = frCat ? (Array.isArray(frCat.dua) ? frCat.dua : (frCat.dua ? [frCat.dua] : [])) : [];

    for (let itemIdx = 0; itemIdx < alCat.array.length; itemIdx++) {
      const alItem = alCat.array[itemIdx];
      const enItem = enItems[itemIdx];
      const classification = classifyMorningEvening(alItem.text);

      // Helper to build a single item
      const buildItem = (catId) => {
        let frItem = null;
        if (frItems.length > 0) {
          if (frItems[itemIdx]) {
            const score = itemSimilarity(alItem.text, frItems[itemIdx].ar || '');
            if (score >= 0.6) frItem = frItems[itemIdx];
          }
          if (!frItem) {
            let bestScore = 0;
            for (const fi of frItems) {
              const score = itemSimilarity(alItem.text, fi.ar || '');
              if (score > bestScore && score >= 0.6) { bestScore = score; frItem = fi; }
            }
          }
          if (!frItem) {
            const key = normalizeArabic(alItem.text).substring(0, 50);
            const globalFr = frenchItemMap.get(key);
            if (globalFr) frItem = { fr: globalFr.fr, tic: globalFr.tic, ref: globalFr.ref };
          }
        }

        let sqlItem = null;
        if (sqlItems.length > 0) {
          if (sqlItems[itemIdx]) {
            const score = itemSimilarity(alItem.text, sqlItems[itemIdx].ar_dua || '');
            if (score >= 0.5) sqlItem = sqlItems[itemIdx];
          }
          if (!sqlItem) {
            let bestScore = 0;
            for (const si of sqlItems) {
              const score = itemSimilarity(alItem.text, si.ar_dua || '');
              if (score > bestScore && score >= 0.5) { bestScore = score; sqlItem = si; }
            }
          }
          if (!sqlItem) {
            const key = normalizeArabic(alItem.text).substring(0, 50);
            sqlItem = sqlItemMap.get(key) || null;
          }
        }

        const translations = { ar: { text: alItem.text, verified: true } };
        if (enItem?.TRANSLATED_TEXT) translations.en = { text: enItem.TRANSLATED_TEXT, verified: true };
        if (frItem?.fr) translations.fr = { text: frItem.fr, verified: true };
        if (sqlItem?.in_translation) translations.id = { text: sqlItem.in_translation, verified: true };
        if (sqlItem?.ms_translation) translations.ms = { text: sqlItem.ms_translation, verified: true };

        let transliteration = '';
        if (frItem?.tic) transliteration = frItem.tic;
        else if (enItem?.LANGUAGE_ARABIC_TRANSLATED_TEXT) transliteration = enItem.LANGUAGE_ARABIC_TRANSLATED_TEXT;

        let reference = '';
        if (frItem?.ref) reference = frItem.ref;
        else if (sqlItem?.ar_reference) reference = sqlItem.ar_reference;

        const audioFile = alItem.filename ? `${alItem.filename}.mp3` : null;

        return {
          id: globalItemId++,
          category: catId,
          arabic: alItem.text,
          transliteration,
          translations,
          count: alItem.count || 1,
          reference,
          benefit: '',
          audio: audioFile,
        };
      };

      // Add to morning category (skip EVENING_ONLY)
      if (classification !== 'EVENING_ONLY') {
        allAzkar.push(buildItem('1'));
      }

      // Add to evening category (skip MORNING_ONLY)
      if (classification !== 'MORNING_ONLY') {
        allAzkar.push(buildItem('1b'));
      }
    }

    console.log(`  Split category 1: morning=${alCat.array.filter(i => classifyMorningEvening(i.text) !== 'EVENING_ONLY').length} items, evening=${alCat.array.filter(i => classifyMorningEvening(i.text) !== 'MORNING_ONLY').length} items`);
    continue; // Skip the normal processing below
  }

  // --- Normal category processing (non-split) ---
  const catId = String(alCat.id); // Use numeric string as ID
  const catMeta = getCategoryMeta(alCat.category);
  
  // Adjust order: +1 because evening category was inserted at position 2
  const catOrder = catIdx + 2; // +2 because positions 1,2 are taken by morning/evening
  
  const catNames = {
    ar: alCat.category,
    en: enCat?.TITLE || '',
  };
  
  // Add French category name
  if (frCat) {
    catNames.fr = frCat.tt_fr || '';
  }
  
  // Add SQL titles (id, ms)
  if (sqlGroup) {
    catNames.id = sqlGroup.in_title || '';
    catNames.ms = sqlGroup.ms_title || '';
  }
  
  allCategories.push({
    id: catId,
    name: catNames,
    icon: catMeta.icon,
    color: catMeta.color,
    order: catOrder,
    audioFile: alCat.filename ? `${alCat.filename}.mp3` : null,
  });
  
  // --- Build items ---
  const enItems = enCat?.TEXT || [];
  const sqlItems = sqlGroup ? (sqlItemsByGroup.get(sqlGroup.id) || []) : [];
  const frItems = frCat ? (Array.isArray(frCat.dua) ? frCat.dua : (frCat.dua ? [frCat.dua] : [])) : [];
  
  for (let itemIdx = 0; itemIdx < alCat.array.length; itemIdx++) {
    const alItem = alCat.array[itemIdx];
    const enItem = enItems[itemIdx]; // Same order within category
    
    // Match French item by Arabic text similarity
    let frItem = null;
    if (frItems.length > 0) {
      const alKey = normalizeArabic(alItem.text).substring(0, 50);
      // Try direct index first
      if (frItems[itemIdx]) {
        const score = itemSimilarity(alItem.text, frItems[itemIdx].ar || '');
        if (score >= 0.6) frItem = frItems[itemIdx];
      }
      // Fallback: search all French items in this category
      if (!frItem) {
        let bestScore = 0;
        for (const fi of frItems) {
          const score = itemSimilarity(alItem.text, fi.ar || '');
          if (score > bestScore && score >= 0.6) {
            bestScore = score;
            frItem = fi;
          }
        }
      }
      // Last resort: search global French map
      if (!frItem) {
        const key = normalizeArabic(alItem.text).substring(0, 50);
        const globalFr = frenchItemMap.get(key);
        if (globalFr) frItem = { fr: globalFr.fr, tic: globalFr.tic, ref: globalFr.ref };
      }
    }
    
    // Match SQL item by Arabic text similarity
    let sqlItem = null;
    if (sqlItems.length > 0) {
      // Try direct index
      if (sqlItems[itemIdx]) {
        const score = itemSimilarity(alItem.text, sqlItems[itemIdx].ar_dua || '');
        if (score >= 0.5) sqlItem = sqlItems[itemIdx];
      }
      // Fallback: search all SQL items in this group
      if (!sqlItem) {
        let bestScore = 0;
        for (const si of sqlItems) {
          const score = itemSimilarity(alItem.text, si.ar_dua || '');
          if (score > bestScore && score >= 0.5) {
            bestScore = score;
            sqlItem = si;
          }
        }
      }
      // Last resort: global SQL map
      if (!sqlItem) {
        const key = normalizeArabic(alItem.text).substring(0, 50);
        sqlItem = sqlItemMap.get(key) || null;
      }
    }
    
    // Build translations object
    const translations = {
      ar: { text: alItem.text, verified: true },
    };
    
    if (enItem?.TRANSLATED_TEXT) {
      translations.en = { text: enItem.TRANSLATED_TEXT, verified: true };
    }
    
    if (frItem?.fr) {
      translations.fr = { text: frItem.fr, verified: true };
    }
    
    if (sqlItem?.in_translation) {
      translations.id = { text: sqlItem.in_translation, verified: true };
    }
    
    if (sqlItem?.ms_translation) {
      translations.ms = { text: sqlItem.ms_translation, verified: true };
    }
    
    // Build transliteration from French dataset or English dataset
    let transliteration = '';
    if (frItem?.tic) {
      transliteration = frItem.tic;
    } else if (enItem?.LANGUAGE_ARABIC_TRANSLATED_TEXT) {
      transliteration = enItem.LANGUAGE_ARABIC_TRANSLATED_TEXT;
    }
    
    // Build reference from French or English or SQL
    let reference = '';
    if (frItem?.ref) {
      reference = frItem.ref;
    } else if (sqlItem?.ar_reference) {
      reference = sqlItem.ar_reference;
    }
    
    // Audio file reference (local)
    const audioFile = alItem.filename ? `${alItem.filename}.mp3` : null;
    
    allAzkar.push({
      id: globalItemId++,
      category: catId,
      arabic: alItem.text,
      transliteration,
      translations,
      count: alItem.count || 1,
      reference,
      benefit: '',
      audio: audioFile,
    });
  }
}

// ===================================================
// Statistics
// ===================================================

let enMatched = 0, frMatched = 0, idMatched = 0, msMatched = 0;
for (const item of allAzkar) {
  if (item.translations.en) enMatched++;
  if (item.translations.fr) frMatched++;
  if (item.translations.id) idMatched++;
  if (item.translations.ms) msMatched++;
}

console.log('\n=== Build Statistics ===');
console.log(`Categories: ${allCategories.length}`);
console.log(`Items: ${allAzkar.length}`);
console.log(`Translations matched:`);
console.log(`  ar: ${allAzkar.length}/${allAzkar.length} (100%)`);
console.log(`  en: ${enMatched}/${allAzkar.length} (${(enMatched/allAzkar.length*100).toFixed(1)}%)`);
console.log(`  fr: ${frMatched}/${allAzkar.length} (${(frMatched/allAzkar.length*100).toFixed(1)}%)`);
console.log(`  id: ${idMatched}/${allAzkar.length} (${(idMatched/allAzkar.length*100).toFixed(1)}%)`);
console.log(`  ms: ${msMatched}/${allAzkar.length} (${(msMatched/allAzkar.length*100).toFixed(1)}%)`);
console.log(`  de, es, tr, ur, hi, bn, ru: ⬜ pending API translation`);

let withTransliteration = allAzkar.filter(i => i.transliteration).length;
let withReference = allAzkar.filter(i => i.reference).length;
let withAudio = allAzkar.filter(i => i.audio).length;
console.log(`Transliteration: ${withTransliteration}/${allAzkar.length}`);
console.log(`References: ${withReference}/${allAzkar.length}`);
console.log(`Audio files: ${withAudio}/${allAzkar.length}`);

// ===================================================
// Write output files
// ===================================================

const outputDir = join(__dirname, '..', 'data', 'json');

// Write azkar.json
writeFileSync(
  join(outputDir, 'azkar.json'),
  JSON.stringify(allAzkar, null, 2),
  'utf8'
);
console.log(`\nWritten: data/json/azkar.json (${allAzkar.length} items)`);

// Write categories.json
writeFileSync(
  join(outputDir, 'categories.json'),
  JSON.stringify({ categories: allCategories }, null, 2),
  'utf8'
);
console.log(`Written: data/json/categories.json (${allCategories.length} categories)`);

// Also write a diagnostic file for translation gaps
const gaps = {
  missingFrench: allAzkar.filter(i => !i.translations.fr).map(i => ({ id: i.id, cat: i.category, arabic: i.arabic.substring(0, 60) })),
  missingIndonesian: allAzkar.filter(i => !i.translations.id).map(i => ({ id: i.id, cat: i.category, arabic: i.arabic.substring(0, 60) })),
  missingMalay: allAzkar.filter(i => !i.translations.ms).map(i => ({ id: i.id, cat: i.category, arabic: i.arabic.substring(0, 60) })),
  missingTransliteration: allAzkar.filter(i => !i.translations).map(i => ({ id: i.id })),
};

writeFileSync(
  join(__dirname, 'output', 'translation_gaps.json'),
  JSON.stringify(gaps, null, 2),
  'utf8'
);
console.log(`Written: scripts/output/translation_gaps.json`);
