#!/usr/bin/env node
// =============================================================================
// build-app-icons.mjs — App-icon build pipeline.
//
// Reads the editable masters in assets/icon-src/ (see icons.config.mjs) and
// writes the launcher assets under assets/images/icons/. The masters are used
// AS-IS (full bleed) — you author each icon with the background already filled
// and the critical content kept inside the safe circle (see _TEMPLATE.svg).
//
//   pnpm icons:build          # regenerate all icons
//   npx expo prebuild --clean # propagate to iOS DynamicAppIcons + Android mipmaps
//
// Outputs are GENERATED — do not hand-edit assets/images/icons/**. Edit the
// masters in assets/icon-src/ instead.
// =============================================================================

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { CANVAS, ICONS, ANDROID_ADAPTIVE } from '../assets/icon-src/icons.config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'assets/icon-src');
const OUT_DIR = path.join(ROOT, 'assets/images/icons');

const master = (name) => path.join(SRC_DIR, name);
const output = (rel) => path.join(OUT_DIR, rel);

/** Normalise a master to CANVAS x CANVAS (cover) -> sharp pipeline. */
const normalize = (srcFile) => sharp(srcFile).resize(CANVAS, CANVAS, { fit: 'cover' });

async function emit(file, pipeline) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await pipeline.toFile(file);
  const m = await sharp(file).metadata();
  console.log(`  ✓ ${path.relative(ROOT, file)}  ${m.width}x${m.height}  alpha=${m.hasAlpha ? 'yes' : 'no'}`);
}

async function buildFlatIcons() {
  console.log('\n▶ Flat icons (default + seasonal) — full bleed, no alpha:');
  for (const icon of ICONS) {
    for (const rel of icon.flat) {
      // Master used as-is; removeAlpha keeps it store-safe (iOS forbids alpha).
      await emit(output(rel), normalize(master(icon.src)).removeAlpha().png());
    }
  }
}

async function buildAndroidAdaptive() {
  console.log('\n▶ Android adaptive layers (default):');
  const a = ANDROID_ADAPTIVE;
  // Foreground: the filled default master (full bleed). The background layer is
  // declared as a solid colour in app.json (android.adaptiveIcon.backgroundColor
  // = a.backgroundColor) and acts as a fallback behind the foreground.
  await emit(output(a.foreground), normalize(master(a.src)).png());
  // Monochrome silhouette for the Android themed (Material You) icon.
  await emit(output(a.monochrome.out), normalize(master(a.monochrome.src)).png());
}

async function buildDummy() {
  console.log('\n▶ Dummy placeholder (rasterised from _TEMPLATE.svg):');
  let buf;
  try {
    buf = await fs.readFile(master('_TEMPLATE.svg'));
  } catch {
    console.log('  (skipped — _TEMPLATE.svg not found)');
    return;
  }
  await emit(master('_DUMMY.png'), sharp(buf, { density: 144 }).resize(CANVAS, CANVAS).png());
}

(async () => {
  console.log(`Building app icons (canvas ${CANVAS}, full-bleed passthrough)`);
  await buildFlatIcons();
  await buildAndroidAdaptive();
  await buildDummy();
  console.log('\n✅ Done. Next: npx expo prebuild --clean\n');
})().catch((e) => { console.error('\n❌ Icon build failed:', e); process.exit(1); });
