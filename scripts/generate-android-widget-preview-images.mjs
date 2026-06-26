#!/usr/bin/env node
// Generate Android launcher widget-picker thumbnails from the real widget
// snapshots produced by the in-app snapshot pump.

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REG_PATH = resolve(ROOT, 'widgets/ios/Resources/widget-registry.json');
// Launcher thumbnails are bitmap snapshots of the in-app gallery tiles. Keep
// them in drawable-nodpi so Android Launcher does not density-scale them before
// fitting them into its widget picker cells.
const OUT_DIR = resolve(ROOT, 'android/app/src/main/res/drawable-nodpi');
// JS-requirable copies of the previews, used by SnapshotWidget as a guaranteed
// fallback image when a widget has no baked PNG on disk yet (fresh add, cleared
// cache, generation failure). Shipped in the JS bundle so they are always present.
const FALLBACK_OUT_DIR = resolve(ROOT, 'assets/images/widgets/fallback');
// Widgets that render LIVE (TextWidget/FlexWidget) in the headless task and never
// fall through to the snapshot-image branch — they need no bundled fallback PNG.
const LIVE_WIDGET_IDS = new Set([
  'azkarMorning', 'azkarEvening', 'dailyDhikr',
  'daySimple', 'dayThuluth', 'dayDigital', 'monthSimple', 'monthThuluth',
]);
const DEFAULT_IN_DIR = resolve(ROOT, 'tmp/widget-previews');
const IN_DIR = process.argv[2] ? resolve(ROOT, process.argv[2]) : DEFAULT_IN_DIR;
const THEME = process.argv[3] ?? 'light';
const SKIP_DYNAMIC_OVERLAY = process.env.ROOH_SKIP_PICKER_DYNAMIC_OVERLAY === '1';

const SIZE_DIMS = {
  small: { width: 155, height: 155 },
  medium: { width: 329, height: 155 },
  large: { width: 329, height: 345 },
};

function previewDrawableName(id, size) {
  return `widget_preview_${id.toLowerCase()}_${size}.png`;
}

function fallbackAssetName(id, size) {
  return `${id}_${size}.png`;
}

function premiumRequired(def, size) {
  if (Array.isArray(def.premiumSizes) && def.premiumSizes.length > 0) {
    return def.premiumSizes.includes(size);
  }
  return !!def.isPremium;
}

function roundedRectAlpha(png, radius) {
  const { width, height, data } = png;
  const r = Math.max(0, radius);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dx = 0;
      let dy = 0;
      if (x < r) dx = r - x;
      else if (x >= width - r) dx = x - (width - r - 1);
      if (y < r) dy = r - y;
      else if (y >= height - r) dy = y - (height - r - 1);
      if (dx > 0 && dy > 0 && Math.sqrt(dx * dx + dy * dy) > r) {
        data[(y * width + x) * 4 + 3] = 0;
      }
    }
  }
}

function setPx(png, x, y, rgba) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  png.data[i] = rgba[0];
  png.data[i + 1] = rgba[1];
  png.data[i + 2] = rgba[2];
  png.data[i + 3] = rgba[3];
}

function fillCircle(png, cx, cy, r, rgba) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPx(png, x, y, rgba);
    }
  }
}

function fillPolygon(png, points, rgba) {
  const minY = Math.floor(Math.min(...points.map((p) => p[1])));
  const maxY = Math.ceil(Math.max(...points.map((p) => p[1])));
  for (let y = minY; y <= maxY; y++) {
    const nodes = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const pi = points[i];
      const pj = points[j];
      if ((pi[1] < y && pj[1] >= y) || (pj[1] < y && pi[1] >= y)) {
        nodes.push(pi[0] + ((y - pi[1]) / (pj[1] - pi[1])) * (pj[0] - pi[0]));
      }
    }
    nodes.sort((a, b) => a - b);
    for (let i = 0; i + 1 < nodes.length; i += 2) {
      for (let x = Math.floor(nodes[i]); x <= Math.ceil(nodes[i + 1]); x++) {
        setPx(png, x, y, rgba);
      }
    }
  }
}

function fillRect(png, x0, y0, w, h, rgba) {
  for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x++) setPx(png, x, y, rgba);
  }
}

function addPremiumBadge(png) {
  const scale = Math.min(png.width, png.height) / 155;
  const r = Math.max(9, Math.round(10 * scale));
  const cx = png.width - r - Math.round(8 * scale);
  const cy = r + Math.round(8 * scale);
  fillCircle(png, cx, cy, r, [218, 165, 32, 255]);
  const white = [255, 255, 255, 255];
  const bodyW = Math.max(8, Math.round(r * 0.95));
  const bodyH = Math.max(6, Math.round(r * 0.72));
  const bodyLeft = cx - bodyW / 2;
  const bodyTop = cy - bodyH * 0.05;
  fillRect(png, bodyLeft, bodyTop, bodyW, bodyH, white);
  const shackleW = Math.max(7, Math.round(r * 0.78));
  const shackleH = Math.max(7, Math.round(r * 0.78));
  const stroke = Math.max(2, Math.round(scale * 2));
  const shackleLeft = cx - shackleW / 2;
  const shackleTop = bodyTop - shackleH * 0.62;
  fillRect(png, shackleLeft, shackleTop + shackleH * 0.5, stroke, shackleH * 0.5, white);
  fillRect(png, shackleLeft + shackleW - stroke, shackleTop + shackleH * 0.5, stroke, shackleH * 0.5, white);
  fillRect(png, shackleLeft + stroke, shackleTop, shackleW - stroke * 2, stroke, white);
}

function fallbackPng(size) {
  const dims = SIZE_DIMS[size];
  const png = new PNG(dims);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const t = y / Math.max(1, png.height - 1);
      png.data[i] = Math.round(50 - t * 16);
      png.data[i + 1] = Math.round(55 - t * 18);
      png.data[i + 2] = Math.round(52 - t * 14);
      png.data[i + 3] = 255;
    }
  }
  roundedRectAlpha(png, size === 'small' ? 28 : 32);
  const fg = [255, 255, 255, 230];
  if (size === 'small') {
    fillRect(png, 35, 56, 85, 13, fg);
    fillRect(png, 49, 82, 58, 9, [190, 190, 190, 220]);
  } else {
    fillRect(png, 42, 55, png.width - 84, 16, fg);
    fillRect(png, 82, 91, png.width - 164, 10, [190, 190, 190, 220]);
  }
  return png;
}

function escapeSvg(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Manifest-anchor overlay ──────────────────────────────────────────────────
// tmp/widget-previews/anchors.json is pulled from the device TOGETHER with the
// snapshot PNGs (scripts/pull-android-widget-snapshots.mjs), so both come from
// the same pump generation. These are the SAME anchors SnapshotWidget.tsx
// replays live on the home screen; drawing sample values at those rects makes
// the picker thumbnail show exactly what a placed widget renders — same chrome
// PNG, same coordinates, same fonts, same active-row highlight.
const MANIFEST_ANCHORS_PATH = resolve(ROOT, 'tmp/widget-previews/anchors.json');
const MANIFEST_ANCHORS = existsSync(MANIFEST_ANCHORS_PATH)
  ? JSON.parse(readFileSync(MANIFEST_ANCHORS_PATH, 'utf8'))
  : {};
// Widgets whose dynamic text exists ONLY as live overlays (blanked in the
// gallery bake). Their picker thumbnail MUST synthesize the overlay — emitting
// the bare chrome PNG reintroduces the "blank prayer preview" bug, so fail loudly.
const PRAYER_PICKER_IDS = new Set(['prayerSingle', 'prayerTable', 'prayerNextPrevious']);

// Wider gap after «س» (U+2002 EN SPACE) — mirrors SIN_MINUTE_GAP in
// lib/widget-format-duration so every surface shows the same gap spacing.
const GAP = ' ';
// Representative sample state, formatted exactly like the live pipeline:
// prayer times use Arabic-Indic digits + ص/م (formatEpochTimeInTimeZone, ar);
// countdowns use western digits + Arabic words (formatPrayerDurationWithPrefix).
const PRAYER_SAMPLE = {
  nextKey: 'fajr',
  rows: {
    fajr: { name: 'الفجر', time: '٤:١٦ ص' },
    sunrise: { name: 'الشروق', time: '٥:٤٧ ص' },
    dhuhr: { name: 'الظهر', time: '١٢:١٧ م' },
    asr: { name: 'العصر', time: '٣:٣٢ م' },
    maghrib: { name: 'المغرب', time: '٦:٤٢ م' },
    isha: { name: 'العشاء', time: '٨:١٩ م' },
  },
  prev: { name: 'العشاء', time: '١٠:٠١ م' },
  until: `بعد 2 س${GAP}27 د`,
  since: 'منذ 40 د',
};

// Mirrors buildPrayerAnchorOverlays in SnapshotWidget.tsx (gallery-fallback
// branch, overlayNames=true): which sample value + color each anchor id gets.
function manifestAnchorTextAndColor(id, size, anchor) {
  const ink = '#403E3A';
  const muted = '#6B6862';
  const aId = anchor.id;
  if (aId === 'currentTime') return null; // dayDigital bakes its digits into the PNG
  if (aId.startsWith('prayerRowTime.') || aId.startsWith('prayerRowName.')) {
    const key = aId.split('.')[1];
    const row = PRAYER_SAMPLE.rows[key];
    if (!row) return null;
    const active = key === PRAYER_SAMPLE.nextKey;
    return { text: aId.startsWith('prayerRowTime.') ? row.time : row.name, color: active ? ink : muted };
  }
  if (aId === 'prayerHeroName' || aId === 'prayerNextName') {
    return { text: PRAYER_SAMPLE.rows[PRAYER_SAMPLE.nextKey].name, color: ink };
  }
  if (aId === 'prayerHeroTime' || aId === 'prayerNextTime') {
    return { text: PRAYER_SAMPLE.rows[PRAYER_SAMPLE.nextKey].time, color: ink };
  }
  if (aId === 'prayerPrevName') return { text: PRAYER_SAMPLE.prev.name, color: ink };
  if (aId === 'prayerPrevTime') return { text: PRAYER_SAMPLE.prev.time, color: ink };
  if (aId === 'prayerHeroCountdown') {
    // Same labelling rules as the live overlay: the large table prefixes the
    // next-prayer label; the 2x2 table crams the string (strip ASCII spaces
    // only, the U+2002 gap survives) so it fits its header slot.
    if (id === 'prayerTable' && size === 'large') return { text: `الصلاة القادمة ${PRAYER_SAMPLE.until}`, color: muted };
    if (id === 'prayerTable' && size === 'small') return { text: PRAYER_SAMPLE.until.replace(/ /g, ''), color: muted };
    return { text: PRAYER_SAMPLE.until, color: muted };
  }
  if (aId === 'prayerUntilCountdown') return { text: PRAYER_SAMPLE.until, color: muted };
  if (aId === 'prayerSinceCountdown') return { text: PRAYER_SAMPLE.since, color: muted };
  return null;
}

// Mirrors anchorLetterSpacing in SnapshotWidget.tsx so glyph advances match
// the live overlay / gallery render.
function manifestLetterSpacing(anchorId) {
  if (anchorId.startsWith('prayerRowTime.')) return -0.3;
  if (anchorId === 'prayerHeroTime' || anchorId === 'prayerNextTime' || anchorId === 'prayerPrevTime') return -1;
  return 0;
}

// alignment is in writing-direction terms (leading/trailing); all pulled
// anchors are Arabic (RTL): leading = right edge, trailing = left edge.
function manifestAnchorPosition(anchor) {
  const side = anchor.alignment === 'leading' ? 'right' : anchor.alignment === 'trailing' ? 'left' : 'center';
  if (side === 'right') return { x: anchor.x + anchor.width, textAnchor: 'start' }; // RTL start = right edge
  if (side === 'left') return { x: anchor.x, textAnchor: 'end' }; // RTL end = left edge
  return { x: anchor.x + anchor.width / 2, textAnchor: 'middle' };
}

function pickerDynamicOverlaySvg(id, size, width, height) {
  if (THEME !== 'light') return null;
  const entry = MANIFEST_ANCHORS[`${id}_${size}`];
  if (!entry?.anchors?.length) {
    if (PRAYER_PICKER_IDS.has(id)) {
      throw new Error(`No pulled anchors for ${id}_${size} — run scripts/pull-android-widget-snapshots.mjs first (its picker preview would render blank).`);
    }
    return null;
  }
  if (entry.language && entry.language !== 'ar') {
    throw new Error(`Anchors for ${id}_${size} were pulled from an ${entry.language} bake — picker assets are Arabic; re-pull with the device language set to ar.`);
  }
  // Snapshots are captured at dp scale (155/329/345) and the thumbnail is
  // resized to the same dims, so these are normally 1; kept for safety.
  const sx = width / (entry.capturedWidth || width);
  const sy = height / (entry.capturedHeight || height);
  const nodes = [];
  // Active-row highlight band, identical to the gallery/live overlay:
  // rgba(0,0,0,0.12) on light, radius 6 (small/medium) or 10 (large).
  if (id === 'prayerTable') {
    const bg = entry.anchors.find((a) => a.id === `prayerRowBg.${PRAYER_SAMPLE.nextKey}`);
    if (bg) {
      nodes.push(`<rect x="${bg.x * sx}" y="${bg.y * sy}" width="${bg.width * sx}" height="${bg.height * sy}" rx="${size === 'large' ? 10 : 6}" fill="#000000" fill-opacity="0.12"/>`);
    }
  }
  for (const anchor of entry.anchors) {
    const resolved = manifestAnchorTextAndColor(id, size, anchor);
    if (!resolved) continue;
    const { x, textAnchor } = manifestAnchorPosition(anchor);
    const y = (anchor.y + anchor.height / 2) * sy;
    const weight = anchor.fontWeight === 'bold' || anchor.fontWeight === 'semibold' ? 700 : anchor.fontWeight === 'medium' ? 500 : 400;
    const ls = manifestLetterSpacing(anchor.id);
    nodes.push(
      `<text x="${x * sx}" y="${y}" text-anchor="${textAnchor}" direction="rtl" dominant-baseline="central" font-family="Rubik, Rubik-Medium, sans-serif" font-size="${anchor.fontSize * sx}" font-weight="${weight}"${ls ? ` letter-spacing="${ls}"` : ''} fill="${resolved.color}">${escapeSvg(resolved.text)}</text>`,
    );
  }
  if (!nodes.length) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${nodes.join('\n  ')}
</svg>`;
}

async function applyPickerDynamicOverlay(png, id, size) {
  if (SKIP_DYNAMIC_OVERLAY) return png;
  const overlay = pickerDynamicOverlaySvg(id, size, png.width, png.height);
  if (!overlay) return png;
  const composited = await sharp(PNG.sync.write(png))
    .composite([{ input: Buffer.from(overlay) }])
    .png()
    .toBuffer();
  return PNG.sync.read(composited);
}

async function loadSnapshot(id, size, premium, outPath) {
  const src = resolve(IN_DIR, `${id}_${size}_${THEME}.png`);
  let png;
  if (!existsSync(src)) {
    png = existsSync(outPath)
      ? PNG.sync.read(readFileSync(outPath))
      : fallbackPng(size);
  } else {
    png = PNG.sync.read(readFileSync(src));
  }
  const dims = SIZE_DIMS[size];
  if (png.width !== dims.width || png.height !== dims.height) {
    const resized = await sharp(PNG.sync.write(png))
      .resize(dims.width, dims.height, { fit: 'fill' })
      .png()
      .toBuffer();
    png = PNG.sync.read(resized);
  }
  png = await applyPickerDynamicOverlay(png, id, size);
  if (premium) addPremiumBadge(png);
  return png;
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(FALLBACK_OUT_DIR, { recursive: true });
const registry = JSON.parse(readFileSync(REG_PATH, 'utf8'));
const expectedFiles = new Set();
const expectedFallbackFiles = new Set();
for (const def of registry) {
  if (!Array.isArray(def.platforms) || !def.platforms.includes('android')) continue;
  for (const size of def.sizes ?? []) {
    if (!SIZE_DIMS[size]) continue;
    expectedFiles.add(previewDrawableName(def.id, size));
    if (!LIVE_WIDGET_IDS.has(def.id)) expectedFallbackFiles.add(fallbackAssetName(def.id, size));
  }
}
for (const file of readdirSync(OUT_DIR)) {
  if (/^widget_preview_.*\.png$/.test(file) && !expectedFiles.has(file)) {
    unlinkSync(resolve(OUT_DIR, file));
  }
}
for (const file of readdirSync(FALLBACK_OUT_DIR)) {
  if (/\.png$/.test(file) && !expectedFallbackFiles.has(file)) {
    unlinkSync(resolve(FALLBACK_OUT_DIR, file));
  }
}
let count = 0;
let fallbackCount = 0;
for (const def of registry) {
  if (!Array.isArray(def.platforms) || !def.platforms.includes('android')) continue;
  for (const size of def.sizes ?? []) {
    if (!SIZE_DIMS[size]) continue;
    const premium = premiumRequired(def, size);
    const out = resolve(OUT_DIR, previewDrawableName(def.id, size));
    const png = await loadSnapshot(def.id, size, premium, out);
    writeFileSync(out, PNG.sync.write(png));
    count += 1;
    // Emit the JS-requirable fallback for snapshot-based widgets. Generated
    // without the premium badge — the snapshot fallback branch is only reached
    // for widgets the user is entitled to (premium widgets render LockedWidget
    // when not entitled), so a lock badge would be wrong there.
    if (!LIVE_WIDGET_IDS.has(def.id)) {
      const fallbackPng = await loadSnapshot(def.id, size, false, out);
      writeFileSync(resolve(FALLBACK_OUT_DIR, fallbackAssetName(def.id, size)), PNG.sync.write(fallbackPng));
      fallbackCount += 1;
    }
  }
}

console.log(`Generated ${count} Android widget picker thumbnails (+${fallbackCount} bundled fallbacks) from ${IN_DIR}`);
