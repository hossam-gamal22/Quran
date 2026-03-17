#!/usr/bin/env node
/**
 * Finds ALL t() keys used in the codebase that are missing from TranslationKeys interface.
 * Outputs a JSON with missing keys grouped by namespace.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TRANSLATIONS_FILE = path.join(ROOT, 'constants', 'translations.ts');

// 1. Read translations.ts and extract interface keys
const content = fs.readFileSync(TRANSLATIONS_FILE, 'utf8');

// Extract the interface block
const interfaceMatch = content.match(/export interface TranslationKeys\s*\{([\s\S]*?)\n\}/);
if (!interfaceMatch) {
  console.error('Could not find TranslationKeys interface');
  process.exit(1);
}

const interfaceBlock = interfaceMatch[1];

// Parse namespaces and their keys from the interface
const existingKeys = new Set();
let currentNamespace = null;

for (const line of interfaceBlock.split('\n')) {
  const trimmed = line.trim();
  
  // New namespace block: "  namespaceName: {"  or "  // comment" 
  const nsMatch = trimmed.match(/^(\w+):\s*\{/);
  if (nsMatch) {
    currentNamespace = nsMatch[1];
    continue;
  }
  
  // End of namespace block
  if (trimmed === '};' || trimmed === '}') {
    currentNamespace = null;
    continue;
  }
  
  // Key inside namespace: "keyName: string;" or "keyName: string[];"
  if (currentNamespace) {
    const keyMatch = trimmed.match(/^(\w+):\s*(string|string\[\])/);
    if (keyMatch) {
      existingKeys.add(`${currentNamespace}.${keyMatch[1]}`);
    }
  }
}

console.log(`Found ${existingKeys.size} keys in TranslationKeys interface`);

// 2. Extract all t() calls from codebase by reading files directly
const glob = (dir, exts) => {
  const results = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.expo') continue;
        walk(full);
      } else if (exts.some(e => entry.name.endsWith(e))) {
        results.push(full);
      }
    }
  };
  walk(dir);
  return results;
};

const allFiles = [
  ...glob(path.join(ROOT, 'app'), ['.tsx', '.ts']),
  ...glob(path.join(ROOT, 'components'), ['.tsx', '.ts']),
  ...glob(path.join(ROOT, 'lib'), ['.tsx', '.ts']),
  ...glob(path.join(ROOT, 'hooks'), ['.tsx', '.ts']),
  ...glob(path.join(ROOT, 'contexts'), ['.tsx', '.ts']),
];

const tCallRegex = /t\(['"]([a-zA-Z]\w*\.\w+)['"]/g;
const nameKeyRegex = /(?:nameKey|titleKey|labelKey|key):\s*['"]([a-zA-Z]\w*\.\w+)['"]/g;

let grepResult = '';
let nameKeyResult = '';

for (const file of allFiles) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = tCallRegex.exec(src)) !== null) grepResult += m[1] + '\n';
  while ((m = nameKeyRegex.exec(src)) !== null) nameKeyResult += m[1] + '\n';
}

const usedKeys = new Set();

for (const line of grepResult.split('\n')) {
  const k = line.trim();
  if (k && k.includes('.')) usedKeys.add(k);
}

for (const line of nameKeyResult.split('\n')) {
  const k = line.trim();
  if (k && k.includes('.')) usedKeys.add(k);
}

console.log(`Found ${usedKeys.size} unique t() keys used in codebase`);

// 3. Find missing keys
const missingKeys = [];
for (const key of usedKeys) {
  if (!existingKeys.has(key)) {
    missingKeys.push(key);
  }
}

// Group by namespace
const missingByNamespace = {};
for (const key of missingKeys.sort()) {
  const [ns, ...rest] = key.split('.');
  const k = rest.join('.');
  if (!missingByNamespace[ns]) missingByNamespace[ns] = [];
  missingByNamespace[ns].push(k);
}

console.log(`\n❌ MISSING KEYS: ${missingKeys.length} total\n`);

for (const [ns, keys] of Object.entries(missingByNamespace)) {
  console.log(`  ${ns} (${keys.length} missing):`);
  for (const k of keys) {
    console.log(`    - ${ns}.${k}`);
  }
  console.log();
}

// Write to JSON for use by fix script
const outputPath = path.join(ROOT, 'scripts', 'missing-keys.json');
fs.writeFileSync(outputPath, JSON.stringify(missingByNamespace, null, 2));
console.log(`\n📄 Written to ${outputPath}`);
