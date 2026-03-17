#!/usr/bin/env node
/**
 * Fix RTL for files using `s = StyleSheet.create({...})` shorthand.
 * Handles both `style={s.X}` and `style={[s.X, ...]}`
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

const ROW_STYLES = [
  'header', 'headerTop', 'headerRow', 'headerContent', 'headerRight', 'headerLeft',
  'bottomBar', 'actionButtons', 'actionRow', 'actionsRow', 'actionButtonsRow',
  'listItem', 'listCard', 'listCardLeft', 'listCardInner', 'listRow',
  'searchContainer', 'searchRow', 'searchBar',
  'progressBarContainer', 'progressContainer', 'progressRow',
  'infoRow', 'statsRow', 'detailRow', 'dateRow',
  'prayerItem', 'prayerInfo', 'prayerRow',
  'cardHeader', 'cardFooter', 'footerRow',
  'stepHeader', 'sectionHeader',
  'counterButton', 'counterRow',
  'navRow', 'navigationRow',
  'chipRow', 'filterRow',
  'referenceContainer', 'sourceContainer',
  'benefitRow', 'benefitContainer',
  'row', 'topRow', 'bottomRow', 'titleRow',
  'tabBar', 'toolbar', 'tabRow',
  'itemRow', 'nameRow', 'countRow',
];

let totalModified = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('isRTL')) continue;
  
  // Find ALL StyleSheet.create blocks (some files have multiple)
  const hasStyleShorthand = /const\s+s\s*=\s*StyleSheet\.create/.test(content);
  const hasStylesLong = /const\s+styles\s*=\s*StyleSheet\.create/.test(content);
  
  if (!hasStyleShorthand && !hasStylesLong) continue;
  
  // Determine prefix
  const prefixes = [];
  if (hasStyleShorthand) prefixes.push('s');
  if (hasStylesLong) prefixes.push('styles');
  
  // Extract all style blocks
  const allStyleBlocks = [];
  const sRegex = /StyleSheet\.create\(\{([\s\S]*?)\}\)/g;
  let sm;
  while ((sm = sRegex.exec(content)) !== null) {
    allStyleBlocks.push(sm[1]);
  }
  if (allStyleBlocks.length === 0) continue;
  const styleBlock = allStyleBlocks.join('\n');
  
  // Find style names with flexDirection: 'row'
  const rowStyleNames = new Set();
  const styleDefRegex = /(\w+):\s*\{[^}]*flexDirection:\s*['"]row['"][^}]*\}/g;
  let dm;
  while ((dm = styleDefRegex.exec(styleBlock)) !== null) {
    if (ROW_STYLES.includes(dm[1])) {
      rowStyleNames.add(dm[1]);
    }
  }
  
  if (rowStyleNames.size === 0) continue;
  
  let modified = false;
  const fixedStyles = [];
  
  for (const styleName of rowStyleNames) {
    for (const prefix of prefixes) {
      // Skip if already has isRTL override for this style
      const alreadyFixed = new RegExp(
        `${prefix}\\.${styleName}.*flexDirection.*isRTL`
      );
      if (alreadyFixed.test(content)) continue;
      
      // Pattern 1: style={s.name}
      const simpleRe = new RegExp(
        `(style=\\{)${prefix}\\.${styleName}(\\})`,
        'g'
      );
      if (simpleRe.test(content)) {
        content = content.replace(simpleRe,
          `$1[${prefix}.${styleName}, { flexDirection: isRTL ? 'row-reverse' : 'row' }]$2`
        );
        modified = true;
        fixedStyles.push(`${prefix}.${styleName} (simple)`);
      }
      
      // Pattern 2: style={[s.name, { ... }]} — inject flexDirection into existing object
      const arrayObjRe = new RegExp(
        `(style=\\{\\[${prefix}\\.${styleName},\\s*\\{)([^\\}]*)(\\}\\])`,
        'g'
      );
      if (arrayObjRe.test(content)) {
        content = content.replace(arrayObjRe, (match, before, middle, after) => {
          if (middle.includes('flexDirection')) return match;
          return `${before} flexDirection: isRTL ? 'row-reverse' : 'row',${middle}${after}`;
        });
        modified = true;
        fixedStyles.push(`${prefix}.${styleName} (array+obj)`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalModified++;
    const relPath = path.relative(rootDir, filePath);
    console.log(`✅ ${relPath}: ${fixedStyles.join(', ')}`);
  }
}

console.log(`\nDone! Modified ${totalModified} files.`);
