/**
 * Fix pre-existing TS errors in translations.ts
 * 1. Remove duplicate appName/none lines in common blocks
 * 2. Add missing extraTimes/midnight/lastThird/lastThirdMessage to prayer blocks
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'constants', 'translations.ts');
let lines = fs.readFileSync(FILE, 'utf-8').split('\n');

// ============================================================
// Fix 1: Remove duplicate appName and none lines
// ============================================================
let removals = [];
for (let i = 0; i < lines.length - 2; i++) {
  const cur = lines[i].trim();
  const next1 = lines[i + 1].trim();
  const next2 = lines[i + 2].trim();
  
  // Pattern: none: 'X', \n appName: 'Y', \n none: 'Z',
  if (cur.startsWith("none:") && next1.startsWith("appName:") && next2.startsWith("none:")) {
    removals.push(i + 1, i + 2);
    i += 2;
  }
}

removals.sort((a, b) => b - a);
removals.forEach(idx => lines.splice(idx, 1));
console.log(`Removed ${removals.length} duplicate lines`);

// ============================================================
// Fix 2: Add missing prayer keys after witr line
// ============================================================
let added = 0;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes("witr:") && lines[i].includes("'")) {
    let hasExtra = false;
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      if (lines[j].includes('extraTimes:')) { hasExtra = true; break; }
    }
    if (!hasExtra) {
      lines.splice(i + 1, 0, 
        "    extraTimes: 'Extra Times',",
        "    midnight: 'Midnight',",
        "    lastThird: 'Last Third of Night',",
        "    lastThirdMessage: 'You are now in the last third of the night - a time when prayers are answered',"
      );
      added++;
    }
  }
}
console.log(`Added prayer keys to ${added} blocks`);

fs.writeFileSync(FILE, lines.join('\n'));
console.log(`File updated: ${lines.length} lines`);
