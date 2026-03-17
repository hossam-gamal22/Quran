const fs = require('fs');
const path = require('path');

const files = [
  'app/(tabs)/azkar.tsx',
  'app/(tabs)/index.tsx',
  'app/(tabs)/quran.tsx',
  'app/(tabs)/settings.tsx',
  'app/(tabs)/wird.tsx',
  'app/ayat-universe.tsx',
  'app/azkar/[category].tsx',
  'app/names.tsx',
  'app/onboarding/language.tsx',
  'app/onboarding/location.tsx',
  'app/onboarding/notifications.tsx',
  'app/quran-bookmarks.tsx',
  'app/ruqya.tsx',
  'app/seasonal/ashura.tsx',
  'app/seasonal/hajj.tsx',
  'app/seasonal/index.tsx',
  'app/seasonal/mawlid.tsx',
  'app/seasonal/ramadan.tsx',
  'app/settings/about.tsx',
  'app/settings/backup.tsx',
  'app/settings/custom-dhikr.tsx',
  'app/settings/display.tsx',
  'app/settings/language.tsx',
  'app/settings/notifications.tsx',
  'app/settings/prayer-adjustments.tsx',
  'app/settings/prayer-calculation.tsx',
  'app/settings/privacy-policy.tsx',
  'app/settings/quran.tsx',
  'app/settings/terms-of-use.tsx',
  'app/settings/translations.tsx',
  'app/settings/worship-tracking.tsx',
  'app/story-of-day.tsx',
  'app/widgets-gallery.tsx',
  'app/worship-tracker/fasting.tsx',
  'app/worship-tracker/index.tsx',
  'app/worship-tracker/prayer.tsx',
  'app/worship-tracker/quran.tsx',
  'components/ui/BackButton.tsx',
];

const rootDir = process.cwd();
let successCount = 0;
let failCount = 0;

for (const relFile of files) {
  const filePath = path.join(rootDir, relFile);
  
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    
    // Step 1: Add useIsRTL import if not present
    if (!content.includes("from '@/hooks/use-is-rtl'")) {
      const hookImportLine = "import { useIsRTL } from '@/hooks/use-is-rtl';";
      
      // Find last import line
      const lines = content.split('\n');
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ') || (lines[i].startsWith('  ') && lastImportIdx === i - 1 && !lines[i].includes('='))) {
          // Continue multi-line import
        }
        if (lines[i].match(/^import\s/)) {
          lastImportIdx = i;
        }
        // Handle multi-line imports - find the closing
        if (lastImportIdx >= 0 && lines[i].includes("from '") && i > lastImportIdx) {
          lastImportIdx = i;
        }
      }
      
      // Find last import more simply
      let insertAfterLine = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/from\s+['"]/) || lines[i].match(/^import\s+/)) {
          insertAfterLine = i;
        }
      }
      
      lines.splice(insertAfterLine + 1, 0, hookImportLine);
      content = lines.join('\n');
    }
    
    // Step 2: Replace `const isRTL = I18nManager.isRTL;` with `const isRTL = useIsRTL();`
    content = content.replace(/const isRTL\s*=\s*I18nManager\.isRTL;?/g, 'const isRTL = useIsRTL();');
    
    // Step 3: For inline usages, we need to ensure isRTL const exists
    if (content.includes('I18nManager.isRTL') && !content.includes('const isRTL')) {
      // Find the component function to insert the hook call
      const patterns = [
        /^(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{)\s*$/m,
        /^(export\s+function\s+\w+\s*\([^)]*\)\s*\{)\s*$/m,
        /^(function\s+\w+\s*\([^)]*\)\s*\{)\s*$/m,
      ];
      
      let added = false;
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          content = content.replace(match[0], match[0] + '\n  const isRTL = useIsRTL();');
          added = true;
          break;
        }
      }
      
      if (!added) {
        // Try another approach - find "return (" and add before it
        // Or just find the first const/let after the function declaration
        const funcMatch = content.match(/(export default function \w+[\s\S]*?\{)\n/);
        if (funcMatch) {
          content = content.replace(funcMatch[0], funcMatch[0] + '  const isRTL = useIsRTL();\n');
          added = true;
        }
      }
      
      if (!added) {
        console.log(`⚠️  WARNING: Could not insert useIsRTL() hook in ${relFile}`);
      }
    }
    
    // Step 4: Replace all remaining I18nManager.isRTL with isRTL
    content = content.replace(/I18nManager\.isRTL/g, 'isRTL');
    
    // Step 5: Clean up I18nManager from imports if no longer used
    const lines = content.split('\n');
    let hasOtherI18nManagerUsage = false;
    let importLineIdx = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('I18nManager') && !line.includes('import') && !line.includes('// ')) {
        hasOtherI18nManagerUsage = true;
      }
      if (line.includes('I18nManager') && line.includes('import') && line.includes('react-native')) {
        importLineIdx = i;
      }
    }
    
    if (!hasOtherI18nManagerUsage && importLineIdx >= 0) {
      let importLine = lines[importLineIdx];
      // Remove I18nManager from the import
      importLine = importLine
        .replace(/\bI18nManager\b\s*,\s*/g, '')
        .replace(/,\s*\bI18nManager\b/g, '')
        .replace(/\{\s*\bI18nManager\b\s*\}/g, '{}');
      
      // If import is now empty like `import {} from 'react-native';` or `import { } from...`, remove line
      if (importLine.match(/import\s*\{\s*\}\s*from/)) {
        lines.splice(importLineIdx, 1);
      } else {
        lines[importLineIdx] = importLine;
      }
      content = lines.join('\n');
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      successCount++;
      console.log('OK ' + relFile);
    } else {
      console.log('SKIP ' + relFile);
    }
  } catch (err) {
    failCount++;
    console.log('ERR ' + relFile + ' - ' + err.message);
  }
}

console.log('\nDone: ' + successCount + ' fixed, ' + failCount + ' failed');
