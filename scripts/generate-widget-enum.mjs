#!/usr/bin/env node
// scripts/generate-widget-enum.mjs
//
// Mirrors lib/widgets/registry.ts into:
//   - widgets/ios/GeneratedWidgetEnums.swift  (source mirror)
//   - widgets/ios/Resources/widget-registry.json (source mirror)
//   - ios/RoohAlMuslimWidgets/GeneratedWidgetEnums.swift (actual Xcode target)
//   - ios/RoohAlMuslimWidgets/Resources/widget-registry.json (actual Xcode target)
//
// Run as part of `expo prebuild` or before any iOS build:
//   node scripts/generate-widget-enum.mjs
//
// The script intentionally avoids a TS toolchain — it parses the registry's
// public shape via tsx if available, else falls back to a regex extraction so
// CI does not need the full RN module graph.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

const REGISTRY_TS = resolve(REPO_ROOT, 'lib/widgets/registry.ts');
const SWIFT_OUT = resolve(REPO_ROOT, 'widgets/ios/GeneratedWidgetEnums.swift');
const JSON_OUT = resolve(REPO_ROOT, 'widgets/ios/Resources/widget-registry.json');
const IOS_TARGET_SWIFT_OUT = resolve(REPO_ROOT, 'ios/RoohAlMuslimWidgets/GeneratedWidgetEnums.swift');
const IOS_TARGET_JSON_OUT = resolve(REPO_ROOT, 'ios/RoohAlMuslimWidgets/Resources/widget-registry.json');

function ensureDir(p) {
  try { mkdirSync(dirname(p), { recursive: true }); } catch {}
}

/**
 * Pulls the literal-only fields from each entry of WIDGET_REGISTRY. We do not
 * need the React component reference at codegen time; we only need:
 *   id, category, titleAr, titleEn, sizes, platforms, isPremium,
 *   forcedLanguage, deepLink, iosKind, androidProvider, legacyAndroidProvider,
 *   overlay (kind + per-size anchors).
 *
 * Strategy: extract each `{ id: '...', ... }` block from the source via a
 * forgiving regex, evaluate it inside a Function() with `Preview: null` so the
 * `P.XxxPreview` references resolve to undefined, then keep only literal fields.
 */
function extractRegistry() {
  const src = readFileSync(REGISTRY_TS, 'utf8');
  // Match the actual array, not the WIDGET_REGISTRY_VERSION constant.
  const start = src.indexOf('export const WIDGET_REGISTRY:');
  if (start < 0) throw new Error('WIDGET_REGISTRY: not found in registry.ts');
  // Skip past the type annotation `: WidgetDefinition[]` and find the array
  // literal that follows the `=` sign.
  const eq = src.indexOf('=', start);
  if (eq < 0) throw new Error('WIDGET_REGISTRY assignment "=" not found');
  const arrStart = src.indexOf('[', eq);
  // Walk balanced brackets to find the matching close.
  let depth = 0; let end = -1;
  for (let i = arrStart; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) throw new Error('WIDGET_REGISTRY array close not found');
  let block = src.slice(arrStart, end + 1);

  // Erase Preview: P.XxxPreview, references — they aren't needed by Swift.
  block = block.replace(/Preview:\s*P\.\w+,?/g, 'Preview: null,');
  // Erase trailing-comma guards inside object literals (not strictly needed).
  // Evaluate as a JS array literal.
  // eslint-disable-next-line no-new-func
  const fn = new Function(`return ${block};`);
  const arr = fn();
  return arr.map((d) => {
    const out = {
      id: d.id,
      category: d.category,
      titleAr: d.titleAr,
      titleEn: d.titleEn,
      sizes: d.sizes,
      platforms: d.platforms,
      isPremium: !!d.isPremium,
      forcedLanguage: d.forcedLanguage ?? null,
      deepLink: d.deepLink,
      iosKind: d.iosKind ?? d.id,
      androidProvider: d.androidProvider ?? null,
      legacyAndroidProvider: d.legacyAndroidProvider ?? null,
    };
    if (d.overlay) {
      out.overlay = {
        kind: d.overlay.kind,
        anchors: d.overlay.anchors,
      };
    }
    if (Array.isArray(d.premiumSizes) && d.premiumSizes.length) {
      out.premiumSizes = d.premiumSizes;
    }
    return out;
  });
}

function premiumForSize(def, size) {
  if (Array.isArray(def.premiumSizes) && def.premiumSizes.length) {
    return def.premiumSizes.includes(size);
  }
  return !!def.isPremium;
}

/** Strip the " - " separator we use in registry titles so iOS pickers stay tight ("اليوم - ثلث" → "اليوم ثلث"). */
function pickerTitle(def, size) {
  const base = (def.titleAr || def.titleEn || def.id).replace(/\s*-\s*/g, ' ');
  return premiumForSize(def, size) ? `🔒 ${base}` : base;
}

function buildKindEnum(name, size, ios) {
  const variants = ios.filter((d) => Array.isArray(d.sizes) && d.sizes.includes(size));
  const cases = ['placeholder', ...variants.map((d) => d.iosKind.replace(/[^A-Za-z0-9_]/g, '_'))];
  const lines = [];
  lines.push(`/// Picker variants for the ${size} widget. Filtered to widgets whose registry`);
  lines.push('/// `sizes` array contains this size — variants that don\'t ship at this size are');
  lines.push('/// hidden from the iOS configuration picker entirely (no "Missing: …" placeholder).');
  lines.push(`enum ${name}: String, AppEnum {`);
  for (const c of cases) {
    lines.push(`    case ${c}`);
  }
  lines.push('');
  lines.push('    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "الويدجت")');
  lines.push(`    static var caseDisplayRepresentations: [${name}: DisplayRepresentation] = [`);
  lines.push('        .placeholder: "— اختر —",');
  for (const def of variants) {
    const safe = def.iosKind.replace(/[^A-Za-z0-9_]/g, '_');
    const title = pickerTitle(def, size).replace(/"/g, '\\"');
    lines.push(`        .${safe}: "${title}",`);
  }
  lines.push('    ]');
  lines.push('}');
  return lines.join('\n');
}

function buildSwift(registry) {
  const ios = registry.filter((r) => r.platforms.includes('ios'));
  const lines = [];
  lines.push('// AUTO-GENERATED. Do not edit.');
  lines.push('// Source: scripts/generate-widget-enum.mjs (mirrors lib/widgets/registry.ts).');
  lines.push('//');
  lines.push('// This file lists every widget id available to iOS App Intents. The runtime');
  lines.push('// values (titles, anchors, premium flag) are loaded from the bundled');
  lines.push('// widget-registry.json so we never have to recompile Swift to ship a tweak.');
  lines.push('');
  lines.push('import Foundation');
  lines.push('import AppIntents');
  lines.push('');
  lines.push('/// Stable string keys for every iOS-shipped widget. Used as `iosKind` raw');
  lines.push('/// values and as PNG basenames in the App Group container.');
  lines.push('enum GeneratedWidgetID: String, CaseIterable {');
  for (const def of ios) {
    const safe = def.iosKind.replace(/[^A-Za-z0-9_]/g, '_');
    lines.push(`    case ${safe} = "${def.iosKind}"`);
  }
  lines.push('}');
  lines.push('');
  lines.push(buildKindEnum('RoohSmallKind', 'small', ios));
  lines.push('');
  lines.push(buildKindEnum('RoohMediumKind', 'medium', ios));
  lines.push('');
  lines.push(buildKindEnum('RoohLargeKind', 'large', ios));
  lines.push('');
  return lines.join('\n');
}

function main() {
  const registry = extractRegistry();
  const swift = buildSwift(registry);
  ensureDir(SWIFT_OUT);
  ensureDir(JSON_OUT);
  ensureDir(IOS_TARGET_SWIFT_OUT);
  ensureDir(IOS_TARGET_JSON_OUT);
  writeFileSync(SWIFT_OUT, swift);
  writeFileSync(JSON_OUT, JSON.stringify(registry, null, 2));
  writeFileSync(IOS_TARGET_SWIFT_OUT, swift);
  writeFileSync(IOS_TARGET_JSON_OUT, JSON.stringify(registry, null, 2));
  // eslint-disable-next-line no-console
  console.log(`✓ wrote ${SWIFT_OUT}`);
  // eslint-disable-next-line no-console
  console.log(`✓ wrote ${JSON_OUT}`);
  // eslint-disable-next-line no-console
  console.log(`✓ wrote ${IOS_TARGET_SWIFT_OUT}`);
  // eslint-disable-next-line no-console
  console.log(`✓ wrote ${IOS_TARGET_JSON_OUT}`);
}

main();
