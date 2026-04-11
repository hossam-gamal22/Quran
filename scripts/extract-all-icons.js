#!/usr/bin/env node
/**
 * Icon Extraction & Validation Script
 * Extracts all icon names from the codebase and validates them against glyph maps
 */

const fs = require('fs');
const path = require('path');

// Load glyph maps
const materialIcons = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
const ionicons = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const fontAwesome5 = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/FontAwesome5Free.json');

// Directories to scan
const SCAN_DIRS = ['app', 'components', 'lib', 'hooks', 'contexts', 'constants'];
const EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx'];

// Regex patterns to extract icon names
const PATTERNS = {
  MaterialCommunityIcons: [
    /MaterialCommunityIcons[^>]*name=["']([^"']+)["']/g,
    /iconName:\s*["']([^"']+)["']/g,
    /<MaterialCommunityIcons[^>]*name={["']([^"']+)["']}/g,
    /name:\s*["']([^"']+)["']\s*as\s*const/g,
  ],
  Ionicons: [
    /Ionicons[^>]*name=["']([^"']+)["']/g,
    /<Ionicons[^>]*name={["']([^"']+)["']}/g,
  ],
  FontAwesome5: [
    /FontAwesome5[^>]*name=["']([^"']+)["']/g,
    /<FontAwesome5[^>]*name={["']([^"']+)["']}/g,
  ],
};

// Results storage
const results = {
  MaterialCommunityIcons: new Map(), // icon -> [files]
  Ionicons: new Map(),
  FontAwesome5: new Map(),
};

// Validation results
const validation = {
  valid: [],
  invalid: [],
};

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const fullPath = path.join(process.cwd(), dirPath);
  if (!fs.existsSync(fullPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(fullPath);
  
  files.forEach((file) => {
    const filePath = path.join(fullPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        getAllFiles(path.join(dirPath, file), arrayOfFiles);
      }
    } else if (EXTENSIONS.includes(path.extname(file))) {
      arrayOfFiles.push(filePath);
    }
  });
  
  return arrayOfFiles;
}

/**
 * Extract icons from a file
 */
function extractIconsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Check which icon libraries are imported
  const hasMaterial = content.includes('MaterialCommunityIcons');
  const hasIonicons = content.includes('Ionicons');
  const hasFontAwesome = content.includes('FontAwesome5');
  
  // Extract MaterialCommunityIcons
  if (hasMaterial) {
    PATTERNS.MaterialCommunityIcons.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        const iconName = match[1];
        if (!results.MaterialCommunityIcons.has(iconName)) {
          results.MaterialCommunityIcons.set(iconName, []);
        }
        if (!results.MaterialCommunityIcons.get(iconName).includes(relativePath)) {
          results.MaterialCommunityIcons.get(iconName).push(relativePath);
        }
      }
    });
  }
  
  // Extract Ionicons
  if (hasIonicons) {
    PATTERNS.Ionicons.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        const iconName = match[1];
        if (!results.Ionicons.has(iconName)) {
          results.Ionicons.set(iconName, []);
        }
        if (!results.Ionicons.get(iconName).includes(relativePath)) {
          results.Ionicons.get(iconName).push(relativePath);
        }
      }
    });
  }
  
  // Extract FontAwesome5
  if (hasFontAwesome) {
    PATTERNS.FontAwesome5.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(content)) !== null) {
        const iconName = match[1];
        if (!results.FontAwesome5.has(iconName)) {
          results.FontAwesome5.set(iconName, []);
        }
        if (!results.FontAwesome5.get(iconName).includes(relativePath)) {
          results.FontAwesome5.get(iconName).push(relativePath);
        }
      }
    });
  }
}

/**
 * Validate extracted icons against glyph maps
 */
function validateIcons() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 ICON VALIDATION REPORT');
  console.log('='.repeat(60));
  
  // Validate MaterialCommunityIcons
  console.log('\n📦 MaterialCommunityIcons');
  console.log('-'.repeat(40));
  let validCount = 0;
  let invalidCount = 0;
  
  results.MaterialCommunityIcons.forEach((files, iconName) => {
    const isValid = materialIcons[iconName] !== undefined;
    if (isValid) {
      validCount++;
      validation.valid.push({ library: 'MaterialCommunityIcons', name: iconName, files });
    } else {
      invalidCount++;
      validation.invalid.push({ library: 'MaterialCommunityIcons', name: iconName, files });
      console.log(`  ❌ "${iconName}" - NOT FOUND`);
      files.forEach(f => console.log(`     └─ ${f}`));
      
      // Suggest similar icons
      const similar = Object.keys(materialIcons)
        .filter(k => k.includes(iconName.split('-')[0]) || iconName.includes(k.split('-')[0]))
        .slice(0, 5);
      if (similar.length > 0) {
        console.log(`     💡 Similar: ${similar.join(', ')}`);
      }
    }
  });
  console.log(`  ✅ Valid: ${validCount} | ❌ Invalid: ${invalidCount}`);
  
  // Validate Ionicons
  console.log('\n📦 Ionicons');
  console.log('-'.repeat(40));
  validCount = 0;
  invalidCount = 0;
  
  results.Ionicons.forEach((files, iconName) => {
    const isValid = ionicons[iconName] !== undefined;
    if (isValid) {
      validCount++;
      validation.valid.push({ library: 'Ionicons', name: iconName, files });
    } else {
      invalidCount++;
      validation.invalid.push({ library: 'Ionicons', name: iconName, files });
      console.log(`  ❌ "${iconName}" - NOT FOUND`);
      files.forEach(f => console.log(`     └─ ${f}`));
      
      // Suggest similar icons
      const similar = Object.keys(ionicons)
        .filter(k => k.includes(iconName.split('-')[0]))
        .slice(0, 5);
      if (similar.length > 0) {
        console.log(`     💡 Similar: ${similar.join(', ')}`);
      }
    }
  });
  console.log(`  ✅ Valid: ${validCount} | ❌ Invalid: ${invalidCount}`);
  
  // Validate FontAwesome5
  console.log('\n📦 FontAwesome5');
  console.log('-'.repeat(40));
  validCount = 0;
  invalidCount = 0;
  
  results.FontAwesome5.forEach((files, iconName) => {
    const isValid = fontAwesome5[iconName] !== undefined;
    if (isValid) {
      validCount++;
      validation.valid.push({ library: 'FontAwesome5', name: iconName, files });
    } else {
      invalidCount++;
      validation.invalid.push({ library: 'FontAwesome5', name: iconName, files });
      console.log(`  ❌ "${iconName}" - NOT FOUND`);
      files.forEach(f => console.log(`     └─ ${f}`));
    }
  });
  console.log(`  ✅ Valid: ${validCount} | ❌ Invalid: ${invalidCount}`);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Total icons found: ${results.MaterialCommunityIcons.size + results.Ionicons.size + results.FontAwesome5.size}`);
  console.log(`  - MaterialCommunityIcons: ${results.MaterialCommunityIcons.size}`);
  console.log(`  - Ionicons: ${results.Ionicons.size}`);
  console.log(`  - FontAwesome5: ${results.FontAwesome5.size}`);
  console.log(`\n  ✅ Valid icons: ${validation.valid.length}`);
  console.log(`  ❌ Invalid icons: ${validation.invalid.length}`);
  
  if (validation.invalid.length > 0) {
    console.log('\n⚠️  ACTION REQUIRED: Fix the invalid icons listed above');
    process.exitCode = 1;
  } else {
    console.log('\n🎉 All icons are valid!');
  }
  
  // Export results to JSON for further analysis
  const outputPath = path.join(process.cwd(), 'icon-analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    summary: {
      total: results.MaterialCommunityIcons.size + results.Ionicons.size + results.FontAwesome5.size,
      materialCommunityIcons: results.MaterialCommunityIcons.size,
      ionicons: results.Ionicons.size,
      fontAwesome5: results.FontAwesome5.size,
      valid: validation.valid.length,
      invalid: validation.invalid.length,
    },
    icons: {
      MaterialCommunityIcons: Object.fromEntries(results.MaterialCommunityIcons),
      Ionicons: Object.fromEntries(results.Ionicons),
      FontAwesome5: Object.fromEntries(results.FontAwesome5),
    },
    invalid: validation.invalid,
  }, null, 2));
  console.log(`\n📄 Full report saved to: ${outputPath}`);
}

// Main execution
console.log('🔍 Scanning codebase for icons...\n');

SCAN_DIRS.forEach(dir => {
  const files = getAllFiles(dir);
  console.log(`  📁 ${dir}: ${files.length} files`);
  files.forEach(extractIconsFromFile);
});

validateIcons();
