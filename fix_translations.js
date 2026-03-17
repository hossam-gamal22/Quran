const fs = require('fs');
const file = 'constants/translations.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Fix TranslationKeys.home missing optionals
code = code.replace(
  /storiesSection: string;\s+prophetsStories: string;\s+hajjUmrahSection: string;\s+quranSurahsSection: string;\s+duasHadithSection: string;\s+tasbihSection: string;\s+knowAllah: string;/g,
  `storiesSection?: string;
    prophetsStories?: string;
    hajjUmrahSection?: string;
    quranSurahsSection?: string;
    duasHadithSection?: string;
    tasbihSection?: string;
    knowAllah?: string;`
);

// 2. Fix TranslationKeys.tasbih resetCounter optional
code = code.replace(
  /targetMode: string;\s+resetCounter: string;/g,
  `targetMode: string;
    resetCounter?: string;`
);

// 3. Extract Arabic khatma from TranslationKeys and delete it
const arabicKhatmaMatch = code.match(/khatmaName: 'اسم الختمة',([\s\S]*?)currentPosition: 'الموقع الحالي:',/);
let arabicKhatmaStrings = '';
if (arabicKhatmaMatch) {
  arabicKhatmaStrings = '    khatmaName: \'اسم الختمة\',' + arabicKhatmaMatch[1] + 'currentPosition: \'الموقع الحالي:\',';
  
  // Delete lines 464-501 (the arabic block injected into TranslationKeys)
  code = code.replace(/    khatmaName: 'اسم الختمة',[\s\S]*?currentPosition: 'الموقع الحالي:',\n/, '');
}

// 4. Replace English lines in ar.khatma with the extracted Arabic lines
if (arabicKhatmaStrings) {
  code = code.replace(/    khatmaName: 'Khatma Name',[\s\S]*?currentPosition: 'Current position:',/, arabicKhatmaStrings);
}

// 5. Remove known rogue duplicates:
// appName and none at the end of common:
code = code.replace(/    appName: '[^']+',\n\s+none: '[^']+',\n\s+appName: '[^']+',\n\s+none: '[^']+',/g, (match) => {
  const lines = match.split('\n');
  return lines[0] + '\n' + lines[1] + '\n';
});

// searchBySurah, searchByJuz, lastPage, bookmark at the end of quran:
code = code.replace(/    searchByJuz: '[^']+',\n\s+lastPage: '[^']+',\n\s+bookmark: '[^']+',\n\s+searchBySurah: '[^']+',\n\s+searchByJuz: '[^']+',\n\s+lastPage: '[^']+',\n\s+bookmark: '[^']+',/g, (match) => {
  const lines = match.split('\n');
  return lines[0] + '\n' + lines[1] + '\n' + lines[2] + '\n' + lines[3] + '\n';
});
// wait, looking at lines 1097: searchBySurah: 'Search by surah name or number',
// BUT what was exactly printed for duplicates?
// Let's use a dynamic duplicate remover for object literals!

const dynamicDuplicateRemover = (source) => {
  let lines = source.split('\n');
  let result = [];
  let currentKeys = new Set();
  let depth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();
    
    // adjust depth
    if (trimmed.includes('{')) depth++;
    if (trimmed.includes('}')) {
      depth--;
      if (depth === 1 || depth === 2) {
        // clear keys when exiting an object
        currentKeys.clear();
      }
    }
    
    // if inside an object, check for duplicate keys
    if (depth > 0 && /^[a-zA-Z0-9_]+\s*:/.test(trimmed)) {
      let keyMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
      if (keyMatch) {
        let key = keyMatch[1];
        if (currentKeys.has(key)) {
          // duplicate found! Skip this line!
          continue;
        } else {
          currentKeys.add(key);
        }
      }
    }
    result.push(line);
  }
  return result.join('\n');
};

code = dynamicDuplicateRemover(code);

fs.writeFileSync(file, code, 'utf8');
console.log('Fixed translations.ts!');
