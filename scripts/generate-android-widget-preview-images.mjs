#!/usr/bin/env node
// Generate Android launcher widget-picker thumbnails from the real widget
// snapshots produced by the in-app snapshot pump.

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REG_PATH = resolve(ROOT, 'widgets/ios/Resources/widget-registry.json');
// Launcher thumbnails are bitmap snapshots of the in-app gallery tiles. Keep
// them in drawable-nodpi so Android Launcher does not density-scale them before
// fitting them into its widget picker cells.
const OUT_DIR = resolve(ROOT, 'android/app/src/main/res/drawable-nodpi');
const DEFAULT_IN_DIR = resolve(ROOT, 'tmp/widget-previews');
const IN_DIR = process.argv[2] ? resolve(ROOT, process.argv[2]) : DEFAULT_IN_DIR;
const THEME = process.argv[3] ?? 'light';

const SIZE_DIMS = {
  small: { width: 155, height: 155 },
  medium: { width: 329, height: 155 },
  large: { width: 329, height: 345 },
};

function previewDrawableName(id, size) {
  return `widget_preview_${id.toLowerCase()}_${size}.png`;
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
  const r = Math.max(13, Math.round(14 * scale));
  const cx = png.width - r - Math.round(10 * scale);
  const cy = r + Math.round(10 * scale);
  fillCircle(png, cx, cy, r, [218, 165, 32, 255]);
  const white = [255, 255, 255, 255];
  const w = r * 1.2;
  const h = r * 0.8;
  const left = cx - w / 2;
  const top = cy - h / 2;
  fillPolygon(png, [
    [left, top + h * 0.35],
    [left + w * 0.22, top + h * 0.58],
    [left + w * 0.36, top + h * 0.2],
    [left + w * 0.5, top + h * 0.55],
    [left + w * 0.64, top + h * 0.2],
    [left + w * 0.78, top + h * 0.58],
    [left + w, top + h * 0.35],
    [left + w * 0.86, top + h],
    [left + w * 0.14, top + h],
  ], white);
  fillRect(png, left + w * 0.18, top + h * 1.06, w * 0.64, Math.max(2, scale * 2), white);
}

function fallbackPng(size, premium) {
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
  if (premium) addPremiumBadge(png);
  return png;
}

function loadSnapshot(id, size, premium, outPath) {
  const src = resolve(IN_DIR, `${id}_${size}_${THEME}.png`);
  if (!existsSync(src)) {
    if (existsSync(outPath)) return PNG.sync.read(readFileSync(outPath));
    return fallbackPng(size, premium);
  }
  const png = PNG.sync.read(readFileSync(src));
  if (premium) addPremiumBadge(png);
  return png;
}

mkdirSync(OUT_DIR, { recursive: true });
const registry = JSON.parse(readFileSync(REG_PATH, 'utf8'));
const expectedFiles = new Set();
for (const def of registry) {
  if (!Array.isArray(def.platforms) || !def.platforms.includes('android')) continue;
  for (const size of def.sizes ?? []) {
    if (SIZE_DIMS[size]) expectedFiles.add(previewDrawableName(def.id, size));
  }
}
for (const file of readdirSync(OUT_DIR)) {
  if (/^widget_preview_.*\.png$/.test(file) && !expectedFiles.has(file)) {
    unlinkSync(resolve(OUT_DIR, file));
  }
}
let count = 0;
for (const def of registry) {
  if (!Array.isArray(def.platforms) || !def.platforms.includes('android')) continue;
  for (const size of def.sizes ?? []) {
    if (!SIZE_DIMS[size]) continue;
    const premium = premiumRequired(def, size);
    const out = resolve(OUT_DIR, previewDrawableName(def.id, size));
    const png = loadSnapshot(def.id, size, premium, out);
    writeFileSync(out, PNG.sync.write(png));
    count += 1;
  }
}

console.log(`Generated ${count} Android widget picker thumbnails from ${IN_DIR}`);
