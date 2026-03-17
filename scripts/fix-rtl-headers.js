#!/usr/bin/env node
/**
 * Script to fix flexDirection inline overrides for headers and key row layouts.
 * 
 * Strategy: Find files where header-related styles have `flexDirection: 'row'` in StyleSheet,
 * and add `{ flexDirection: isRTL ? 'row-reverse' : 'row' }` inline override where those styles are used.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const allFiles = [];

function collectTsx(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      collectTsx(full);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      allFiles.push(full);
    }
  }
}

collectTsx(path.join(rootDir, 'app'));
collectTsx(path.join(rootDir, 'components'));

// These styles commonly need RTL fix - they have flexDirection: 'row' in StyleSheet
const ROW_STYLES_TO_FIX = [
  'header', 'headerTop', 'headerRow', 'headerContent', 'headerRight', 'headerLeft',
  'bottomBar', 'actionButtons', 'actionRow', 'actionsRow', 'actionButtonsRow',
  'listItem', 'listCard', 'listCardLeft', 'listCardInner',
  'searchContainer', 'searchRow', 'searchBar',
  'progressBarContainer', 'progressContainer', 'progressRow',
  'dateRow', 'infoRow', 'statsRow', 'detailRow',
  'prayerItem', 'prayerInfo',
  'cardHeader', 'cardFooter', 'footerRow',
  'stepHeader', 'sectionHeader',
  'counterButton', 'counterRow',
  'navRow', 'navigationRow',
  'tabRow', 'chipRow', 'filterRow',
  'referenceContainer', 'sourceContainer',
  'benefitRow', 'benefitContainer',
];

let totalModified = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if no isRTL available
  if (!content.includes('isRTL')) continue;
  
  let modified = false;
  
  // Find StyleSheet.create blocks and identify which styles have flexDirection: 'row'
  const stylesheetMatch = content.match(/StyleSheet\.create\(\{([\s\S]*?)\}\)/);
  if (!stylesheetMatch) continue;
  
  const styleBlock = stylesheetMatch[1];
  
  // Find all style names that have flexDirection: 'row'
  const rowStyles = [];
  const styleRegex = /(\w+):\s*\{([^}]*flexDirection:\s*['"]row['"][^}]*)\}/g;
  let m;
  while ((m = styleRegex.exec(styleBlock)) !== null) {
    const styleName = m[1];
    // Only fix if not already overridden inline
    if (ROW_STYLES_TO_FIX.includes(styleName)) {
      rowStyles.push(styleName);
    }
  }
  
  if (rowStyles.length === 0) continue;
  
  // Now fix render usages — look for `style={styles.XXXX}` or `style={[styles.XXXX, ...]}`
  for (const styleName of rowStyles) {
    // Pattern 1: style={styles.name}> or style={styles.name} followed by >
    // Replace: style={[styles.name, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
    const pattern1 = new RegExp(
      `style=\\{styles\\.${styleName}\\}`,
      'g'
    );
    
    // Check if already has isRTL override for this style
    const alreadyFixed = new RegExp(
      `styles\\.${styleName}.*flexDirection.*isRTL`,
      'g'
    );
    if (alreadyFixed.test(content)) continue;
    
    // Only replace style={styles.name} (simple form)
    const simplePattern = new RegExp(
      `(style=\\{)styles\\.${styleName}(\\})`,
      'g'
    );
    
    if (simplePattern.test(content)) {
      content = content.replace(simplePattern, 
        `$1[styles.${styleName}, { flexDirection: isRTL ? 'row-reverse' : 'row' }]$2`
      );
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalModified++;
    const relPath = path.relative(rootDir, filePath);
    console.log(`✅ ${relPath}: fixed ${rowStyles.join(', ')}`);
  }
}

console.log(`\nDone! Modified ${totalModified} files for header/row RTL overrides.`);
