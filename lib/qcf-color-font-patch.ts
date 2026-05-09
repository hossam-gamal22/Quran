/**
 * QCF Color Font Patch — CPAL palette[0] override.
 *
 * The QCF tajweed COLR/CPAL fonts store the base (non-tajweed) glyph color
 * at palette index 0 as opaque black (BGRA = 00 00 00 FF). On a dark
 * background this base layer disappears. React Native Skia exposes no API
 * to override CPAL palette colors at runtime, and `SkText.color` does NOT
 * affect COLR base layers either — so we rewrite the byte directly.
 *
 * This module produces a "dark variant" of the font where palette[0] is
 * white (BGRA = FF FF FF FF). All other palette entries (the actual tajweed
 * accent colors: red / blue / orange / pink / green) are untouched, so the
 * tajweed marks remain vivid against either background.
 *
 * Spec reference:
 *   https://learn.microsoft.com/en-us/typography/opentype/spec/cpal
 */

const CPAL_TAG = 0x4350414c; // 'CPAL' in big-endian uint32

/**
 * Patches a TTF/OTF buffer in-place for dark-mode rendering:
 *   - palette[0]  base glyph color: black → white
 *   - palette[3]  ayah-marker outer ornament: deep red → warm gold
 *   - palette[12] ayah-marker rosette fill: pale mint → fully transparent
 *   - palette[13] ayah-marker inner digit: black → warm gold
 *
 * Net effect on dark backgrounds: the verse markers become a transparent
 * disc framed by a gold ornament with a gold digit inside — no opaque
 * background swatch competing with the page art, and the marker is highly
 * legible against either dark or busy backgrounds.
 *
 * Returns the same buffer (mutated). Returns the buffer untouched if no CPAL
 * table is present or if the layout is unexpected.
 */
export function patchCpalToDark(input: Uint8Array): Uint8Array {
  const buf = input;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  if (buf.byteLength < 12) return buf;
  const numTables = view.getUint16(4, false);
  const TABLE_RECORD_SIZE = 16;
  const recordsStart = 12;
  if (buf.byteLength < recordsStart + numTables * TABLE_RECORD_SIZE) return buf;

  let cpalOffset = -1;
  for (let i = 0; i < numTables; i++) {
    const r = recordsStart + i * TABLE_RECORD_SIZE;
    const tag = view.getUint32(r, false);
    if (tag === CPAL_TAG) {
      cpalOffset = view.getUint32(r + 8, false);
      break;
    }
  }
  if (cpalOffset < 0) return buf;

  if (cpalOffset + 12 > buf.byteLength) return buf;
  const numPaletteEntries = view.getUint16(cpalOffset + 2, false);
  const colorRecordsArrayOffset = view.getUint32(cpalOffset + 8, false);
  const firstColorAbs = cpalOffset + colorRecordsArrayOffset;
  if (firstColorAbs + 4 > buf.byteLength) return buf;

  // Helper: write BGRA at palette index `idx` if it exists.
  const writeColor = (idx: number, b: number, g: number, r: number, a: number) => {
    if (idx >= numPaletteEntries) return;
    const off = firstColorAbs + idx * 4;
    if (off + 4 > buf.byteLength) return;
    buf[off + 0] = b;
    buf[off + 1] = g;
    buf[off + 2] = r;
    buf[off + 3] = a;
  };

  // Warm gold #F5C84B ↔ BGRA = 4B C8 F5 FF
  const GOLD_B = 0x4b;
  const GOLD_G = 0xc8;
  const GOLD_R = 0xf5;

  // Base glyph color → white opaque.
  writeColor(0, 0xff, 0xff, 0xff, 0xff);
  // (palette[3] deep red is shared with Huroof Muqatta'at like الم/حم/طه — leave it alone.)
  // Outer ornament accent petals (pink #FF0080) → gold opaque.
  // (palette[10] teal is shared with tajweed marks — leave it alone.)
  writeColor(11, GOLD_B, GOLD_G, GOLD_R, 0xff);
  // Rosette fill → fully transparent.
  writeColor(12, 0x00, 0x00, 0x00, 0x00);
  // Inner digit → gold opaque.
  writeColor(13, GOLD_B, GOLD_G, GOLD_R, 0xff);

  return buf;
}
