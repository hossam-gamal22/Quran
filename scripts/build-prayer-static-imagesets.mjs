#!/usr/bin/env node
// scripts/build-prayer-static-imagesets.mjs
//
// Takes a flat folder of baked prayer-widget PNGs and emits a proper
// Asset Catalog `.imageset` directory tree at widgets/ios/Assets.xcassets/PrayerStatic/.
//
// Expected source filename convention (must match PrayerAssetResolver in
// widgets/ios/PrayerStaticOverlay.swift):
//   <widgetId>_<size>_<theme>_<lang>_<state>.png
//   <widgetId>_<size>_<theme>_<lang>_<prev>_<next>.png     (nextPrevious only)
//
// Examples:
//   prayerSingle_small_dark_ar_fajr.png
//   prayerTable_medium_olive_en_dhuhr.png
//   prayerNextPrevious_medium_slate_ar_isha_fajr.png
//
// Usage:
//   pnpm build-prayer-imagesets <source-dir>
//
// The source-dir is wherever the in-app bake route saved the PNGs (it prints
// the path on completion).  Run AFTER baking; commit the resulting imagesets
// into git so the widget extension picks them up at next prebuild.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const targetDir = path.join(repoRoot, 'widgets', 'ios', 'Assets.xcassets', 'PrayerStatic');

function makeImagesetContents(pngName) {
  return JSON.stringify(
    {
      images: [
        {
          filename: pngName,
          idiom: 'universal',
          scale: '3x',
        },
      ],
      info: { author: 'xcode', version: 1 },
    },
    null,
    2,
  ) + '\n';
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureRootContents() {
  ensureDir(targetDir);
  const rootContents = path.join(targetDir, 'Contents.json');
  if (!fs.existsSync(rootContents)) {
    fs.writeFileSync(rootContents, JSON.stringify({ info: { author: 'xcode', version: 1 } }) + '\n');
  }
}

function main() {
  const srcDir = process.argv[2];
  if (!srcDir) {
    console.error('Usage: pnpm build-prayer-imagesets <source-dir>');
    console.error('       <source-dir> is where the in-app bake saved its PNGs.');
    process.exit(1);
  }
  if (!fs.existsSync(srcDir)) {
    console.error(`Source directory does not exist: ${srcDir}`);
    process.exit(1);
  }

  ensureRootContents();

  const pngs = fs.readdirSync(srcDir).filter((f) => f.endsWith('.png'));
  if (pngs.length === 0) {
    console.error(`No .png files found in ${srcDir}`);
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  for (const pngName of pngs) {
    const base = pngName.replace(/\.png$/, '');
    const imagesetDir = path.join(targetDir, `${base}.imageset`);
    const isNew = !fs.existsSync(imagesetDir);
    ensureDir(imagesetDir);
    fs.copyFileSync(path.join(srcDir, pngName), path.join(imagesetDir, pngName));
    fs.writeFileSync(path.join(imagesetDir, 'Contents.json'), makeImagesetContents(pngName));
    if (isNew) created++;
    else updated++;
  }

  console.log(`Imagesets emitted to: ${targetDir}`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log('');
  console.log('Next: run `pnpm expo prebuild --clean --platform ios` and rebuild.');
}

main();
