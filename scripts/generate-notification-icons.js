#!/usr/bin/env node
/**
 * Generate placeholder notification icon PNGs.
 *
 * Creates 96×96 solid-color circles as transparent PNGs.
 * These are PLACEHOLDERS — replace with proper icons later.
 *
 * Usage: node scripts/generate-notification-icons.js
 * Output: assets/images/notification-icons/notif_icon_*.png
 */

const { writeFileSync, mkdirSync } = require('fs');
const { resolve } = require('path');
const { deflateSync } = require('zlib');

const OUT_DIR = resolve(__dirname, '../assets/images/notification-icons');
mkdirSync(OUT_DIR, { recursive: true });

const SIZE = 96;

// Icon categories with their brand colors (RGBA)
const ICONS = {
  mosque:       [15, 152, 127, 255],  // #0f987f — green (prayer)
  prayer_beads: [76, 175, 80, 255],   // #4CAF50 — light green (salawat/tasbih)
  morning:      [255, 193, 7, 255],   // #FFC107 — amber (morning azkar)
  evening:      [63, 81, 181, 255],   // #3F51B5 — indigo (evening azkar)
  moon:         [69, 90, 100, 255],   // #455A64 — blue-grey (sleep)
  quran:        [121, 85, 72, 255],   // #795548 — brown (quran/kahf)
  reminder:     [0, 150, 136, 255],   // #009688 — teal (general)
};

/**
 * Create a valid minimal PNG with a colored circle on transparent bg.
 */
function createCirclePNG(size, rgba) {
  // Build raw RGBA image data
  const raw = Buffer.alloc(size * size * 4, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2; // small padding

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = (y * size + x) * 4;
      if (dist <= r) {
        // Anti-alias the edge
        const edgeDist = r - dist;
        const alpha = edgeDist < 1 ? Math.round(rgba[3] * edgeDist) : rgba[3];
        raw[offset] = rgba[0];
        raw[offset + 1] = rgba[1];
        raw[offset + 2] = rgba[2];
        raw[offset + 3] = alpha;
      }
      // else stays transparent (0,0,0,0)
    }
  }

  // Build PNG file
  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);   // width
  ihdrData.writeUInt32BE(size, 4);   // height
  ihdrData[8] = 8;                    // bit depth
  ihdrData[9] = 6;                    // color type: RGBA
  ihdrData[10] = 0;                   // compression
  ihdrData[11] = 0;                   // filter
  ihdrData[12] = 0;                   // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk — filter each row with filter type 0 (None)
  const filteredRows = [];
  for (let y = 0; y < size; y++) {
    filteredRows.push(Buffer.from([0])); // filter byte
    filteredRows.push(raw.subarray(y * size * 4, (y + 1) * size * 4));
  }
  const rawImageData = Buffer.concat(filteredRows);
  const compressed = deflateSync(rawImageData);
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuffer, data, crc]);
}

// CRC-32 implementation
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c >>> 0;
}

// Generate icons
for (const [name, rgba] of Object.entries(ICONS)) {
  const png = createCirclePNG(SIZE, rgba);
  const outPath = resolve(OUT_DIR, `notif_icon_${name}.png`);
  writeFileSync(outPath, png);
  console.log(`✅ ${name} → notif_icon_${name}.png (${png.length} bytes)`);
}

console.log(`\n📁 Generated ${Object.keys(ICONS).length} icons in ${OUT_DIR}`);
console.log('⚠️  These are colored circle placeholders — replace with proper icon designs.');
