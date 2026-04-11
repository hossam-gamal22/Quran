/**
 * Node.js version of COLR table stripper
 * Strips the COLR table from TTF fonts to make them monochrome
 * Used at build time to pre-process QCF fonts for offline bundling
 */

/**
 * Strip the COLR table from a TTF font buffer by renaming its tag.
 * This forces the renderer to use standard glyf outlines,
 * so the Text component's color prop controls glyph color.
 * 
 * @param {Buffer} ttfBuffer - Raw TTF font data
 * @returns {Buffer} - Processed TTF with COLR table stripped
 */
function stripColrTable(ttfBuffer) {
  // Work with a copy to avoid mutating the original
  const ttf = Buffer.from(ttfBuffer);
  
  function readU16(buf, off) {
    return (buf[off] << 8) | buf[off + 1];
  }
  
  const numTables = readU16(ttf, 4);
  
  for (let i = 0; i < numTables; i++) {
    const entry = 12 + i * 16;
    const tag = String.fromCharCode(ttf[entry], ttf[entry + 1], ttf[entry + 2], ttf[entry + 3]);
    
    if (tag === 'COLR') {
      // Overwrite tag to 'XXXX' so renderer ignores it
      ttf[entry]     = 0x58; // 'X'
      ttf[entry + 1] = 0x58;
      ttf[entry + 2] = 0x58;
      ttf[entry + 3] = 0x58;
      console.log(`  → Stripped COLR table`);
      break;
    }
  }
  
  return ttf;
}

module.exports = { stripColrTable };

// CLI usage: node strip-colr-node.js input.ttf output.ttf
if (require.main === module) {
  const fs = require('fs');
  const [,, inputPath, outputPath] = process.argv;
  
  if (!inputPath || !outputPath) {
    console.log('Usage: node strip-colr-node.js <input.ttf> <output.ttf>');
    process.exit(1);
  }
  
  const input = fs.readFileSync(inputPath);
  const output = stripColrTable(input);
  fs.writeFileSync(outputPath, output);
  console.log(`Stripped COLR from ${inputPath} → ${outputPath}`);
}
