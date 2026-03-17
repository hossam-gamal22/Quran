#!/usr/bin/env node
/**
 * Script to fix flexDirection in array-form style props.
 * Handles: style={[styles.header, { ... }]} patterns
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

const ROW_STYLES_TO_FIX = [
  'header', 'headerTop', 'headerRow', 'headerContent', 'headerRight', 'headerLeft',
  'bottomBar', 'actionButtons', 'actionRow', 'actionsRow', 'actionButtonsRow',
  'listItem', 'listCard', 'listCardLeft', 'listCardInner',
  'searchContainer', 'searchRow', 'searchBar',
  'progressBarContainer', 'progressContainer', 'progressRow',
  'infoRow', 'statsRow', 'detailRow',
  'prayerItem', 'prayerInfo',
  'cardHeader', 'cardFooter', 'footerRow',
  'stepHeader', 'sectionHeader',
  'counterButton', 'counterRow',
  'navRow', 'navigationRow',
  'chipRow', 'filterRow',
  'referenceContainer', 'sourceContainer',
];

let totalModified = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('isRTL')) continue;
  
  // Find StyleSheet.create blocks
  const stylesheetMatch = content.match(/StyleSheet\.create\(\{([\s\S]*?)\}\)/);
  if (!stylesheetMatch) continue;
  
  const styleBlock = stylesheetMatch[1];
  
  const rowStyles = [];
  // Match style definitions that have flexDirection: 'row'
  const styleRegex = /(\w+):\s*\{[^}]*flexDirection:\s*['"]row['"][^}]*\}/g;
  let m;
  while ((m = styleRegex.exec(styleBlock)) !== null) {
    if (ROW_STYLES_TO_FIX.includes(m[1])) {
      rowStyles.push(m[1]);
    }
  }
  // Also check for one-liner style defs
  const oneLineRegex = /(\w+):\s*\{[^}]*flexDirection:\s*['"]row['"][^}]*\}/g;
  
  if (rowStyles.length === 0) continue;
  
  let modified = false;
  
  for (const styleName of rowStyles) {
    // Check if already has isRTL override for this style
    const alreadyFixed = new RegExp(
      `styles\\.${styleName}.*flexDirection.*isRTL`
    );
    if (alreadyFixed.test(content)) continue;
    
    // Pattern: style={[styles.X, { ...anything... }]}
    // The key insight: we need to add flexDirection to the inline override object
    // or add a new one if there's no inline override
    
    // Pattern A: style={[styles.X, { someObj }]}  — need to inject flexDirection
    const arrayPattern = new RegExp(
      `(style=\\{\\[styles\\.${styleName},\\s*\\{)([^\\}]*)(\\}\\])`,
      'g'
    );
    
    if (arrayPattern.test(content)) {
      content = content.replace(arrayPattern, (match, before, middle, after) => {
        // Check if this already has flexDirection
        if (middle.includes('flexDirection')) return match;
        // Add flexDirection at the start of the object
        return `${before} flexDirection: isRTL ? 'row-reverse' : 'row',${middle}${after}`;
      });
      modified = true;
    }
    
    // Pattern B: style={[styles.X, someCondition && styleX, { someObj }...]}
    // Too complex, skip
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalModified++;
    const relPath = path.relative(rootDir, filePath);
    console.log(`✅ ${relPath}: fixed array-form styles for ${rowStyles.join(', ')}`);
  }
}

console.log(`\nDone! Modified ${totalModified} files for array-form style overrides.`);
