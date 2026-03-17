// Patch CPAL table in a TTF font buffer (Uint8Array)
// to replace palette colors for dark mode
// Returns a new Uint8Array with the modified font

/**
 * Patch the CPAL table in a TTF font buffer to replace palette colors.
 * @param ttf Uint8Array of decompressed TTF
 * @param palette Array of 16 {r,g,b,a} colors to use as the new palette
 * @returns Uint8Array of patched TTF
 */
export function patchCpalTable(ttf: Uint8Array, palette: Array<{r:number,g:number,b:number,a:number}>): Uint8Array {
  // Find the CPAL table offset
  function readU32(buf: Uint8Array, off: number) {
    return (buf[off]<<24)|(buf[off+1]<<16)|(buf[off+2]<<8)|buf[off+3];
  }
  function readU16(buf: Uint8Array, off: number) {
    return (buf[off]<<8)|buf[off+1];
  }
  function writeU8(buf: Uint8Array, off: number, v: number) {
    buf[off] = v&0xFF;
  }
  // TTF table directory
  const numTables = readU16(ttf, 4);
  let cpalOffset = 0, cpalLength = 0;
  for (let i=0; i<numTables; i++) {
    const entry = 12 + i*16;
    const tag = String.fromCharCode(...ttf.slice(entry, entry+4));
    if (tag === 'CPAL') {
      cpalOffset = readU32(ttf, entry+8);
      cpalLength = readU32(ttf, entry+12);
      break;
    }
  }
  if (!cpalOffset || !cpalLength) throw new Error('CPAL table not found');
  // CPAL header
  const numPaletteEntries = readU16(ttf, cpalOffset+2);
  const numPalettes = readU16(ttf, cpalOffset+4);
  const colorRecordsArrayOffset = readU32(ttf, cpalOffset+8);
  // Patch first palette (index 0)
  for (let i=0; i<Math.min(numPaletteEntries, palette.length); i++) {
    const color = palette[i];
    const base = cpalOffset + colorRecordsArrayOffset + i*4;
    writeU8(ttf, base+0, color.b);
    writeU8(ttf, base+1, color.g);
    writeU8(ttf, base+2, color.r);
    writeU8(ttf, base+3, color.a);
  }
  return ttf;
}

// Patch ALL palettes and ALL entries to a single color,
// but keep entry 0 (typically ornament fill/background) as a contrasting color
// so verse end mark numbers remain visible inside ornaments.
export function patchCpalTableAllPalettes(ttf: Uint8Array, color: {r:number,g:number,b:number,a:number}, contrastColor?: {r:number,g:number,b:number,a:number}): Uint8Array {
  function readU32(buf: Uint8Array, off: number) {
    return (buf[off]<<24)|(buf[off+1]<<16)|(buf[off+2]<<8)|buf[off+3];
  }
  function readU16(buf: Uint8Array, off: number) {
    return (buf[off]<<8)|buf[off+1];
  }
  function writeU8(buf: Uint8Array, off: number, v: number) {
    buf[off] = v&0xFF;
  }
  const numTables = readU16(ttf, 4);
  let cpalOffset = 0, cpalLength = 0;
  for (let i=0; i<numTables; i++) {
    const entry = 12 + i*16;
    const tag = String.fromCharCode(...ttf.slice(entry, entry+4));
    if (tag === 'CPAL') {
      cpalOffset = readU32(ttf, entry+8);
      cpalLength = readU32(ttf, entry+12);
      break;
    }
  }
  if (!cpalOffset || !cpalLength) throw new Error('CPAL table not found');
  const numPaletteEntries = readU16(ttf, cpalOffset+2);
  const numPalettes = readU16(ttf, cpalOffset+4);
  const colorRecordsArrayOffset = readU32(ttf, cpalOffset+8);
  for (let p=0; p<numPalettes; p++) {
    for (let i=0; i<numPaletteEntries; i++) {
      // Use contrast color for entry 0 (ornament fill/background) so verse numbers remain visible
      const c = (i === 0 && contrastColor) ? contrastColor : color;
      const base = cpalOffset + colorRecordsArrayOffset + (p*numPaletteEntries + i)*4;
      writeU8(ttf, base+0, c.b);
      writeU8(ttf, base+1, c.g);
      writeU8(ttf, base+2, c.r);
      writeU8(ttf, base+3, c.a);
    }
  }
  return ttf;
}

// لون موحد للوضع الداكن (أبيض فاتح)
export const DARK_TAJWEED_PALETTE = Array(16).fill({r:243,g:243,b:243,a:255});
export const DARK_UNIFIED_COLOR = {r:243,g:243,b:243,a:255};
// لون موحد للوضع الفاتح (أسود)
export const LIGHT_UNIFIED_COLOR = {r:0, g:0, b:0, a:255};

/**
 * Strip the COLR table from a TTF font by renaming its tag.
 * This forces the renderer to use standard glyf outlines,
 * so the Text component's color prop controls glyph color.
 * Verse end markers, ornaments, and all glyphs become monochrome.
 */
export function stripColrTable(ttf: Uint8Array): Uint8Array {
  function readU16(buf: Uint8Array, off: number) {
    return (buf[off] << 8) | buf[off + 1];
  }
  const numTables = readU16(ttf, 4);
  for (let i = 0; i < numTables; i++) {
    const entry = 12 + i * 16;
    const tag = String.fromCharCode(ttf[entry], ttf[entry + 1], ttf[entry + 2], ttf[entry + 3]);
    if (tag === 'COLR') {
      // Overwrite tag to a non-standard name so renderer ignores it
      ttf[entry]     = 0x58; // 'X'
      ttf[entry + 1] = 0x58;
      ttf[entry + 2] = 0x58;
      ttf[entry + 3] = 0x58;
      break;
    }
  }
  return ttf;
}
