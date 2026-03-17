#!/usr/bin/env node
/**
 * Bulk RTL Fix Script
 * 
 * This script processes files to:
 * 1. Add `useIsRTL` import if missing but needed
 * 2. Add `const isRTL = useIsRTL();` declaration if missing from component body
 * 3. Find all StyleSheet styles with `flexDirection: 'row'` 
 * 4. Find where those styles are used in JSX and add inline RTL override
 * 5. Find hardcoded `flexDirection: 'row-reverse'` in StyleSheet and make them dynamic
 * 
 * Usage: node scripts/bulk-rtl-fix.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.resolve(__dirname, '..');

// Files to process with their specific needs
const FILES_TO_FIX = [
  // CRITICAL - Shared Components
  {
    file: 'components/ui/GlassCard.tsx',
    rowStyles: ['toggleRow', 'listItem', 'segmentContainer', 'segment'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true, // isRTL already declared in one sub-component, need to check each
  },
  {
    file: 'components/ui/ShareableCard.tsx',
    rowStyles: ['header', 'modeActions', 'colorPicker', 'actions'],
    hardcodedReverse: ['logoWatermarkRow', 'modeButton'],
    hasImport: false,
    hasDeclaration: false,
  },
  {
    file: 'components/ui/DailyHighlights.tsx',
    rowStyles: ['reorderItem', 'reorderButtons'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: false,
  },
  {
    file: 'components/ui/BrandedCapture.tsx',
    rowStyles: [],
    hardcodedReverse: ['headerBrand', 'logoPill'],
    hasImport: true,
    hasDeclaration: false,
  },
  {
    file: 'components/ui/ErrorBoundary.tsx',
    rowStyles: ['errorActions', 'footerActions'],
    hardcodedReverse: [],
    hasImport: false,
    hasDeclaration: false,
  },
  {
    file: 'components/ui/OfflineBanner.tsx',
    rowStyles: ['banner'],
    hardcodedReverse: [],
    hasImport: false,
    hasDeclaration: false,
  },
  {
    file: 'components/quran/AudioPlayerBar.tsx',
    rowStyles: ['topRow', 'controls', 'progressRow', 'miniPill'],
    hardcodedReverse: [],
    hasImport: false,
    hasDeclaration: false,
  },
  {
    file: 'components/ui/GlobalAudioBar.tsx',
    rowStyles: ['topRow', 'controls', 'progressRow', 'miniPill'],
    hardcodedReverse: [],
    hasImport: false,
    hasDeclaration: false,
  },
  // HIGH - App Pages  
  {
    file: 'app/companions.tsx',
    rowStyles: ['detailSectionHeaderRow', 'detailHeader'],
    hardcodedReverse: ['heroContent', 'cardContent'],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/seerah.tsx',
    rowStyles: [],
    hardcodedReverse: ['heroContent', 'sectionHeader'],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/daily-dua.tsx',
    rowStyles: ['header'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/daily-ayah.tsx',
    rowStyles: ['header', 'actionsRow', 'actionBtn', 'styleRow', 'toggleRow'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/hadith-of-day.tsx',
    rowStyles: ['header'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/quote-of-day.tsx',
    rowStyles: ['header', 'actionsRow', 'styleRow', 'toggleRow'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/ayat-universe.tsx',
    rowStyles: ['header', 'themeChip', 'verseCard', 'verseActions', 'actionBtn'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/subscription.tsx',
    rowStyles: ['header'],
    hardcodedReverse: ['featureRow'],
    hasImport: false,
    hasDeclaration: false,
  },
  {
    file: 'app/ruqya.tsx',
    rowStyles: ['headerTop'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/azkar-search.tsx',
    rowStyles: ['headerContent', 'searchContainer'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/story-of-day.tsx',
    rowStyles: ['brandingContainer'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/quran-reminder.tsx',
    rowStyles: ['header'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/hadith-sifat.tsx',
    rowStyles: [],
    hardcodedReverse: ['metaRow', 'hadithActions'],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/(tabs)/index.tsx',
    rowStyles: [],
    hardcodedReverse: ['sectionHeader'],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/seasonal/ramadan.tsx',
    rowStyles: ['header', 'specialDayBanner', 'statsGrid'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/khatma/index.tsx',
    rowStyles: ['header'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
  {
    file: 'app/azkar/[category].tsx',
    rowStyles: ['progressBarContainer'],
    hardcodedReverse: [],
    hasImport: true,
    hasDeclaration: true,
  },
];

let totalFixed = 0;
let totalFiles = 0;

function processFile(config) {
  const filePath = path.join(ROOT, config.file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  SKIP: ${config.file} (file not found)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  let changes = [];

  // Step 1: Add useIsRTL import if needed
  if (!config.hasImport && !content.includes("useIsRTL")) {
    // Find a good place to add the import
    const importLines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].startsWith('import ') || importLines[i].match(/^} from/)) {
        lastImportIdx = i;
      }
      // Stop if we're past imports
      if (i > 0 && !importLines[i].startsWith('import ') && !importLines[i].startsWith('} from') && !importLines[i].trim().startsWith('//') && importLines[i].trim() !== '' && lastImportIdx !== -1 && !importLines[i].match(/^\s/)) {
        break;
      }
    }
    
    if (lastImportIdx !== -1) {
      importLines.splice(lastImportIdx + 1, 0, "import { useIsRTL } from '@/hooks/use-is-rtl';");
      content = importLines.join('\n');
      changes.push('Added useIsRTL import');
    }
  }

  // Step 2: Handle hardcoded row-reverse in StyleSheet - change to 'row' and ensure inline override
  for (const styleName of config.hardcodedReverse) {
    // Find the style in StyleSheet and change 'row-reverse' to 'row'
    const regex = new RegExp(`(${styleName}\\s*:\\s*\\{[^}]*?)flexDirection:\\s*'row-reverse'`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `$1flexDirection: 'row'`);
      changes.push(`Changed ${styleName} from hardcoded row-reverse to row in StyleSheet`);
      
      // Add this style to rowStyles so it gets an inline override
      if (!config.rowStyles.includes(styleName)) {
        config.rowStyles.push(styleName);
      }
    }
  }

  // Step 3: Add inline RTL overrides for styles used in JSX
  for (const styleName of config.rowStyles) {
    // Pattern 1: style={styles.XXX} → style={[styles.XXX, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
    const singleStyleRegex = new RegExp(
      `style=\\{styles\\.${styleName}\\}`,
      'g'
    );
    
    // Pattern 2: style={[styles.XXX, ...]} → add to array
    const arrayStyleRegex = new RegExp(
      `style=\\{\\[styles\\.${styleName}([,\\s])`,
      'g'
    );

    // Pattern 3: style={s.XXX} (shorthand)
    const shortStyleRegex = new RegExp(
      `style=\\{s\\.${styleName}\\}`,
      'g'
    );

    // Check if already overridden (has isRTL in nearby context)
    const alreadyOverriddenRegex = new RegExp(
      `styles\\.${styleName}[^\\n]*isRTL`,
      'g'
    );

    if (alreadyOverriddenRegex.test(content)) {
      continue; // Already has RTL override
    }

    // Reset regex lastIndex
    singleStyleRegex.lastIndex = 0;
    arrayStyleRegex.lastIndex = 0;
    shortStyleRegex.lastIndex = 0;

    const rtlOverride = `{ flexDirection: isRTL ? 'row-reverse' : 'row' }`;

    // Apply Pattern 1
    const p1Count = (content.match(singleStyleRegex) || []).length;
    if (p1Count > 0) {
      content = content.replace(singleStyleRegex, 
        `style={[styles.${styleName}, ${rtlOverride}]}`
      );
      changes.push(`P1: styles.${styleName} → array with RTL (${p1Count}x)`);
    }

    // Apply Pattern 2
    arrayStyleRegex.lastIndex = 0;
    const p2Count = (content.match(arrayStyleRegex) || []).length;
    if (p2Count > 0) {
      content = content.replace(arrayStyleRegex,
        `style={[styles.${styleName}, ${rtlOverride}$1`
      );
      changes.push(`P2: [styles.${styleName}, ...] → added RTL (${p2Count}x)`);
    }

    // Apply Pattern 3
    shortStyleRegex.lastIndex = 0;
    const p3Count = (content.match(shortStyleRegex) || []).length;
    if (p3Count > 0) {
      content = content.replace(shortStyleRegex,
        `style={[s.${styleName}, ${rtlOverride}]}`
      );
      changes.push(`P3: s.${styleName} → array with RTL (${p3Count}x)`);
    }
  }

  if (content !== original) {
    if (DRY_RUN) {
      console.log(`🔍 DRY RUN: ${config.file}`);
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ FIXED: ${config.file}`);
    }
    changes.forEach(c => console.log(`   → ${c}`));
    totalFixed++;
  } else {
    console.log(`⏭️  NO CHANGE: ${config.file}`);
  }
  totalFiles++;
}

console.log('🔧 RTL Bulk Fix Script');
console.log('='.repeat(60));
if (DRY_RUN) console.log('📋 DRY RUN MODE - no files will be modified\n');
else console.log('📝 LIVE MODE - files will be modified\n');

for (const config of FILES_TO_FIX) {
  processFile(config);
}

console.log('\n' + '='.repeat(60));
console.log(`📊 Results: ${totalFixed}/${totalFiles} files ${DRY_RUN ? 'would be ' : ''}modified`);
