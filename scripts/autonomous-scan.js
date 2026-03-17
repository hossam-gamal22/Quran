const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const ARABIC_REGEX = /[\u0600-\u06FF]/;

// 1. Resource Verification
function verifyAssets(dir, baseDir = '') {
  let missing = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.join(baseDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      missing = missing.concat(verifyAssets(fullPath, relPath));
    } else if (file.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      if (!file.includes('_en.')) {
        const ext = path.extname(file);
        const base = path.basename(file, ext);
        const enFile = base + '_en' + ext;
        if (!fs.existsSync(path.join(dir, enFile))) {
          missing.push(relPath);
        }
      }
    }
  }
  return missing;
}

// 2. Logic Simulation & Hardcoded UI Audit
function scanCodebaseForLeaks(dir) {
  let leaks = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('assets')) {
         leaks = leaks.concat(scanCodebaseForLeaks(fullPath));
      }
    } else if (file.match(/\.(tsx|ts|js)$/)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Skip i18n/translations files
      if (file.includes('translations.ts')) continue;
      
      // Basic check for Arabic strings
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) continue;
        
        if (ARABIC_REGEX.test(line)) {
          // It's highly likely to be UI code if it has <Text or title= etc.
          // But even if not, any Arabic string is a potential leak.
          if (line.includes('<Text') || line.includes('title=') || line.includes('label=') || line.includes('placeholder=')) {
            leaks.push({ file: fullPath.replace(projectRoot, ''), line: i + 1, content: line.trim() });
          }
        }
      }
    }
  }
  return leaks;
}

console.log('--- AUTONOMOUS DEEP-SCAN INITIATED ---');

const missingAssets = verifyAssets(path.join(projectRoot, 'assets/images'));
console.log('\n[Resource Verification] Missing _en assets:');
console.log(missingAssets.slice(0, 15).join('\n') + (missingAssets.length > 15 ? '\n...and ' + (missingAssets.length - 15) + ' more' : ''));

const uiLeaks = scanCodebaseForLeaks(path.join(projectRoot, 'app'));
const componentLeaks = scanCodebaseForLeaks(path.join(projectRoot, 'components'));

const allLeaks = [...uiLeaks, ...componentLeaks];

console.log(`\n[UI Metadata Audit] Found ${allLeaks.length} potential hardcoded Arabic strings in UI components.`);
if (allLeaks.length > 0) {
  console.log('Top 10 Leaks:');
  allLeaks.slice(0, 10).forEach(l => console.log(`  ${l.file}:${l.line} -> ${l.content}`));
}

fs.writeFileSync(path.join(projectRoot, 'scan_report.json'), JSON.stringify({ missingAssets, allLeaks }, null, 2));
console.log('\nReport saved to scan_report.json. Ready for Logic Parity checks.');
