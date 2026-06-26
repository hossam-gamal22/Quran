#!/usr/bin/env node
// Pull the in-app snapshot pump's output from a connected debug build into
// tmp/widget-previews so generate-android-widget-preview-images.mjs can bake
// launcher-picker thumbnails from the EXACT gallery pixels + anchor manifest.
//
// Workflow (requires a DEBUGGABLE build of com.rooh.almuslim on the device,
// app opened at least once with the widget theme set to "light"):
//   node scripts/pull-android-widget-snapshots.mjs
//   node scripts/generate-android-widget-preview-images.mjs
//
// Pulls two things from the same pump generation:
//   1. files/widgets/<id>_<size>_light_vN.png   → tmp/widget-previews/<id>_<size>_light.png
//   2. AsyncStorage widget_shared_data.snapshotManifest[<id>_<size>_light].anchors
//      → tmp/widget-previews/anchors.json  (keyed `<id>_<size>`)
// The anchors are what SnapshotWidget uses to draw live prayer text on the
// home screen — the picker generator replays them with sample values so the
// picker thumbnail shows the same content the placed widget renders.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'tmp/widget-previews');
const APP_ID = 'com.rooh.almuslim';
const THEME = process.argv[2] ?? 'light';

function adb(args, opts = {}) {
  return execFileSync('adb', args, { maxBuffer: 256 * 1024 * 1024, ...opts });
}

mkdirSync(OUT_DIR, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'widget-pull-'));

// ── 1. PNGs ──────────────────────────────────────────────────────────────────
const tarBytes = adb(['exec-out', 'run-as', APP_ID, 'tar', '-cf', '-', 'files/widgets']);
const tarPath = join(work, 'widgets.tar');
writeFileSync(tarPath, tarBytes);
execFileSync('tar', ['-xf', tarPath, '-C', work]);
const pngDir = join(work, 'files/widgets');
const { readdirSync } = await import('node:fs');
let pngCount = 0;
for (const file of readdirSync(pngDir)) {
  const m = file.match(new RegExp(`^(.+_${THEME})(?:_v\\d+)?\\.png$`));
  if (!m) continue;
  writeFileSync(resolve(OUT_DIR, `${m[1]}.png`), readFileSync(join(pngDir, file)));
  pngCount += 1;
}

// ── 2. Anchor manifest ───────────────────────────────────────────────────────
const dbPath = join(work, 'RKStorage');
writeFileSync(dbPath, adb(['exec-out', 'run-as', APP_ID, 'cat', 'databases/RKStorage']));
const db = new DatabaseSync(dbPath, { readOnly: true });
const row = db.prepare("select value from catalystLocalStorage where key='widget_shared_data'").get();
if (!row) throw new Error('widget_shared_data not found in AsyncStorage — open the app once so the pump runs.');
const manifest = JSON.parse(row.value)?.snapshotManifest ?? {};
const anchorsOut = {};
const themeSuffix = `_${THEME}`;
for (const [routeKey, entry] of Object.entries(manifest)) {
  if (!routeKey.endsWith(themeSuffix)) continue;
  if (!Array.isArray(entry?.anchors) || entry.anchors.length === 0) continue;
  anchorsOut[routeKey.slice(0, -themeSuffix.length)] = {
    language: entry.language ?? null,
    capturedWidth: entry.capturedWidth ?? null,
    capturedHeight: entry.capturedHeight ?? null,
    anchors: entry.anchors,
  };
}
writeFileSync(
  resolve(OUT_DIR, 'anchors.json'),
  `${JSON.stringify(anchorsOut, null, 1)}\n`,
);

rmSync(work, { recursive: true, force: true });
console.log(`Pulled ${pngCount} ${THEME} snapshots + anchors for ${Object.keys(anchorsOut).length} routes into tmp/widget-previews/`);
