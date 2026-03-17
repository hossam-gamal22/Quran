#!/usr/bin/env node
/**
 * Bulk RTL fix script for all app pages
 * 
 * This script:
 * 1. Adds `import { useIsRTL } from '@/hooks/use-is-rtl';` if missing
 * 2. Adds `const isRTL = useIsRTL();` in the component if missing
 * 3. Fixes header `styles.headerTop` / `styles.header` with inline `flexDirection` override
 * 4. Fixes back arrow `name="arrow-left"` to `name={isRTL ? 'arrow-right' : 'arrow-left'}`
 * 5. Fixes `name="chevron-left"` to `name={isRTL ? 'chevron-right' : 'chevron-left'}`  (in non-navigation contexts)
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', 'app');
const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

// Files to process - all app route files
const filesToProcess = [];

function collectFiles(dir, extensions = ['.tsx', '.ts']) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, extensions);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      filesToProcess.push(fullPath);
    }
  }
}

collectFiles(APP_DIR);
collectFiles(COMPONENTS_DIR);

// Skip already-fixed files and layout files
const skipFiles = [
  '_layout.tsx',
  'qibla.tsx', // Compass, no standard layout
];

let totalFixed = 0;
let filesModified = 0;

for (const filePath of filesToProcess) {
  const basename = path.basename(filePath);
  if (skipFiles.includes(basename)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const changes = [];

  // 1. Add useIsRTL import if file has flexDirection but no useIsRTL
  const hasFlexDirection = /flexDirection:\s*['"]row['"]/.test(content) || /flexDirection:\s*['"]row-reverse['"]/.test(content);
  const hasIsRTLImport = content.includes("useIsRTL");
  const hasArrowLeft = content.includes('name="arrow-left"');
  const hasChevronBack = content.includes('name="chevron-back"');
  
  if (!hasFlexDirection && !hasArrowLeft && !hasChevronBack) continue;
  
  // Add import if missing
  if (!hasIsRTLImport) {
    // Find the last import line
    const importRegex = /^import\s+.*?['"].*?['"];?\s*$/gm;
    let lastImportMatch;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportMatch = match;
    }
    
    if (lastImportMatch) {
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, insertPos) + 
        "\nimport { useIsRTL } from '@/hooks/use-is-rtl';" + 
        content.slice(insertPos);
      modified = true;
      changes.push('added useIsRTL import');
    }
  }
  
  // 2. Add `const isRTL = useIsRTL();` if not present
  if (!content.includes('const isRTL') && !content.includes('isRTL =')) {
    // Find the first `useSettings()` or `useColors()` call and add after it
    const hookPatterns = [
      /const\s+\{[^}]*\}\s*=\s*useSettings\(\);/,
      /const\s+\w+\s*=\s*useColors\(\);/,
      /const\s+\{[^}]*\}\s*=\s*useColors\(\);/,
      /const\s+router\s*=\s*useRouter\(\);/,
    ];
    
    for (const pattern of hookPatterns) {
      const hookMatch = pattern.exec(content);
      if (hookMatch) {
        const insertPos = hookMatch.index + hookMatch[0].length;
        content = content.slice(0, insertPos) +
          "\n  const isRTL = useIsRTL();" +
          content.slice(insertPos);
        modified = true;
        changes.push('added const isRTL = useIsRTL()');
        break;
      }
    }
  }
  
  // 3. Fix standalone arrow-left icons (back buttons)
  // Pattern: name="arrow-left" → name={isRTL ? 'arrow-right' : 'arrow-left'}
  if (content.includes('name="arrow-left"')) {
    content = content.replace(
      /name="arrow-left"/g,
      "name={isRTL ? 'arrow-right' : 'arrow-left'}"
    );
    modified = true;
    changes.push('fixed arrow-left icons');
  }

  // 4. Fix standalone chevron-back icons
  if (content.includes('name="chevron-back"')) {
    content = content.replace(
      /name="chevron-back"/g,
      "name={isRTL ? 'chevron-forward' : 'chevron-back'}"
    );
    modified = true;
    changes.push('fixed chevron-back icons');
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
    const relPath = path.relative(path.join(__dirname, '..'), filePath);
    console.log(`✅ ${relPath}: ${changes.join(', ')}`);
  }
}

console.log(`\nDone! Modified ${filesModified} files.`);
