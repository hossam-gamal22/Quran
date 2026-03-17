// scripts/replace-fonts.js
// Replaces all hardcoded Cairo-* font references with dynamic font functions
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Mapping from Cairo font names to function calls
const FONT_MAP = {
  "'Cairo-Regular'": 'fontRegular()',
  "'Cairo-Medium'": 'fontMedium()',
  "'Cairo-SemiBold'": 'fontSemiBold()',
  "'Cairo-Bold'": 'fontBold()',
  "'Cairo-ExtraLight'": 'fontRegular()',
  "'Cairo-Light'": 'fontRegular()',
  "'Cairo-ExtraBold'": 'fontBold()',
  "'Cairo-Black'": 'fontBold()',
};

const IMPORT_LINE = "import { fontRegular, fontMedium, fontSemiBold, fontBold } from '@/lib/fonts';";

// Files to skip (they load fonts, not use them for styling)
const SKIP_FILES = ['app/_layout.tsx'];

function getAllTsxFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.expo', 'admin-panel', '.git', 'android', 'ios', 'widgets'].includes(entry.name)) continue;
      getAllTsxFiles(fullPath, files);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

let totalReplacements = 0;
let filesModified = 0;

const files = getAllTsxFiles(ROOT);

for (const filePath of files) {
  const relPath = path.relative(ROOT, filePath);
  if (SKIP_FILES.includes(relPath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let replacements = 0;
  
  // Check if file has any Cairo references
  let hasCairo = false;
  for (const [oldFont] of Object.entries(FONT_MAP)) {
    if (content.includes(oldFont)) {
      hasCairo = true;
      break;
    }
  }
  if (!hasCairo) continue;
  
  // Determine which font functions are needed
  const neededFunctions = new Set();
  for (const [oldFont, newFunc] of Object.entries(FONT_MAP)) {
    if (content.includes(oldFont)) {
      const funcName = newFunc.replace('()', '');
      neededFunctions.add(funcName);
    }
  }
  
  // Replace font references
  for (const [oldFont, newFunc] of Object.entries(FONT_MAP)) {
    const regex = new RegExp(oldFont.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, newFunc);
      replacements += matches.length;
      modified = true;
    }
  }
  
  if (!modified) continue;

  // Add import if not already present
  if (!content.includes("from '@/lib/fonts'") && !content.includes('from "@/lib/fonts"')) {
    // Find the right place to add the import
    // Look for the last import line
    const lines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].match(/^} from /)) {
        lastImportIndex = i;
      }
      // Stop at first non-import, non-comment, non-empty line after imports started
      if (lastImportIndex >= 0 && !lines[i].startsWith('import ') && !lines[i].match(/^} from /) && !lines[i].startsWith('//') && !lines[i].startsWith(' *') && !lines[i].startsWith('/*') && lines[i].trim() !== '' && !lines[i].includes(' from ')) {
        break;
      }
    }
    
    // Build specific import with only needed functions
    const funcs = Array.from(neededFunctions).sort();
    const importLine = `import { ${funcs.join(', ')} } from '@/lib/fonts';`;
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importLine);
      content = lines.join('\n');
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  totalReplacements += replacements;
  filesModified++;
  console.log(`  ✅ ${relPath}: ${replacements} replacements`);
}

console.log(`\n✨ Done! ${totalReplacements} replacements across ${filesModified} files.`);
