const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();

// Find all files that import I18nManager
const files = execSync(
  'grep -rln "I18nManager" --include="*.tsx" --include="*.ts" app/ components/',
  { cwd: rootDir, encoding: 'utf-8' }
).trim().split('\n').filter(f => !f.includes('scripts/'));

let cleaned = 0;

for (const relFile of files) {
  const filePath = path.join(rootDir, relFile);
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Check if I18nManager is used outside of imports
  // First, strip all import blocks to find real usages
  const withoutImports = content.replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  const usedOutsideImport = /\bI18nManager\b/.test(withoutImports.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''));
  
  if (usedOutsideImport) {
    continue; // Skip files that actually use I18nManager
  }
  
  // Remove I18nManager from imports
  // Handle: standalone on a line like "  I18nManager,"
  content = content.replace(/^\s*I18nManager,?\s*\n/gm, '');
  
  // Handle: inline with other imports like "View, I18nManager, Text"
  content = content.replace(/,\s*I18nManager\b/g, '');
  content = content.replace(/\bI18nManager\s*,\s*/g, '');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    cleaned++;
    console.log('CLEANED: ' + relFile);
  }
}

console.log('\nCleaned ' + cleaned + ' files');
