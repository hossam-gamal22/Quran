/**
 * Process QCF Fonts — Strip COLR Tables
 * 
 * Processes all bundled QCF fonts to strip COLR tables,
 * converting them from color (tajweed) to monochrome.
 * This allows React Native Text color prop to control glyph color.
 * 
 * Usage: node scripts/process-qcf-fonts.js
 */

const fs = require('fs');
const path = require('path');
const { stripColrTable } = require('./strip-colr-node');

const FONTS_DIR = path.join(__dirname, '../assets/fonts/qcf');
const TOTAL_PAGES = 604;

function pad3(n) {
  return String(n).padStart(3, '0');
}

async function processAllFonts() {
  console.log('🔄 Processing QCF fonts — stripping COLR tables...\n');
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const filename = `QCF4_tajweed_${pad3(page)}.ttf`;
    const filepath = path.join(FONTS_DIR, filename);

    try {
      if (!fs.existsSync(filepath)) {
        console.log(`⚠️  Page ${page}: File not found — ${filename}`);
        skipped++;
        continue;
      }

      const input = fs.readFileSync(filepath);
      const output = stripColrTable(input);
      
      // Write back to same file
      fs.writeFileSync(filepath, output);
      processed++;

      // Progress indicator every 50 pages
      if (page % 50 === 0 || page === TOTAL_PAGES) {
        console.log(`   Processed ${page}/${TOTAL_PAGES} fonts...`);
      }
    } catch (err) {
      console.error(`❌ Page ${page}: Error — ${err.message}`);
      errors++;
    }
  }

  console.log('\n✅ Font processing complete!');
  console.log(`   → Processed: ${processed}`);
  console.log(`   → Skipped: ${skipped}`);
  console.log(`   → Errors: ${errors}`);

  if (errors > 0) {
    process.exit(1);
  }
}

processAllFonts().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
