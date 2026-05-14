#!/usr/bin/env node
// scripts/verify-adhan-assets.js
//
// Build-time guard for the Full Adhan Player audio files.
// Run via `pnpm verify:adhan-assets` (also chained from prebuild / CI).
//
// Validates assets/sounds/adhan_complete/ to ensure:
//   1. All 5 non-Fajr voice files exist
//   2. Each duration is 90s-300s (rules out the 35s notification-cap files)
//   3. Each file is a valid MP3 (sniffs ID3 / MPEG sync header)
//   4. Each file size is between 500 KB and 6 MB
//   5. Each SHA256 matches the value documented in SOURCES.md (when present)
//   6. None of the 5 files share a SHA256 with any file in adhan_full/ (catches
//      accidental reuse of the notification-cap recordings)
//   7. No two of the 5 files share an SHA256 (catches a copy-pasted file)
//
// Exits with code 1 on any failure so CI/prebuild blocks the build.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const COMPLETE_DIR = path.join(REPO_ROOT, 'assets/sounds/adhan_complete');
const NOTIF_CAP_DIR = path.join(REPO_ROOT, 'assets/sounds/adhan_full');
const SOURCES_MD = path.join(COMPLETE_DIR, 'SOURCES.md');

const REQUIRED_VOICES = [
  { key: 'makkah',     file: 'adhan_makkah_full.mp3' },
  { key: 'madinah',    file: 'adhan_madinah_full.mp3' },
  { key: 'al_aqsa',    file: 'adhan_al_aqsa_full.mp3' },
  { key: 'mishary',    file: 'adhan_mishary_full.mp3' },
  { key: 'abdulbasit', file: 'adhan_abdulbasit_full.mp3' },
];

const OPTIONAL_VOICES = [
  { key: 'fajr', file: 'adhan_fajr_full.mp3' },
];

const MIN_SIZE = 500 * 1024;          // 500 KB
const MAX_SIZE = 6 * 1024 * 1024;     // 6 MB
const MIN_DURATION_SEC = 90;
const MAX_DURATION_SEC = 300;

const errors = [];
const warnings = [];

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function isMp3(filePath) {
  // Accept any of: ID3 tag header (49 44 33), MPEG sync byte FF Ex (varies),
  // or "ftyp" containers (rare for MP3 but be tolerant).
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(4);
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;        // ID3
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true;                  // MPEG sync
  return false;
}

// Cheap MP3 duration estimate. We avoid pulling a heavy dep.
// Works well enough to distinguish ≥ 90s from 35s clips: parses the first MPEG
// frame to read bitrate, then divides file size by bytes/second.
function estimateDurationSec(filePath) {
  const size = fs.statSync(filePath).size;
  const buf = Buffer.alloc(Math.min(size, 64 * 1024));
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);

  // Skip ID3v2 tag if present
  let offset = 0;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const tagSize = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    offset = 10 + tagSize;
  }

  // Find MPEG sync
  while (offset < buf.length - 4) {
    if (buf[offset] === 0xff && (buf[offset + 1] & 0xe0) === 0xe0) break;
    offset++;
  }
  if (offset >= buf.length - 4) return 0;

  const header2 = buf[offset + 1];
  const header3 = buf[offset + 2];
  const versionBits = (header2 >> 3) & 0x03;
  const layerBits = (header2 >> 1) & 0x03;
  const bitrateIdx = (header3 >> 4) & 0x0f;
  const samplerateIdx = (header3 >> 2) & 0x03;

  // MPEG1 Layer III bitrate table (kbps)
  const bitrateTableV1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
  const bitrateTableV2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
  const sampleRateV1 = [44100, 48000, 32000, 0];
  const sampleRateV2 = [22050, 24000, 16000, 0];

  const isV1 = versionBits === 0x03; // MPEG-1
  if (layerBits !== 0x01) {
    // Not Layer III — fall back to a rough constant-bitrate assumption (128 kbps).
    return Math.round(size / (128_000 / 8));
  }
  const bitrate = (isV1 ? bitrateTableV1L3[bitrateIdx] : bitrateTableV2L3[bitrateIdx]) * 1000;
  const sampleRate = isV1 ? sampleRateV1[samplerateIdx] : sampleRateV2[samplerateIdx];
  if (!bitrate || !sampleRate) {
    return Math.round(size / (128_000 / 8));
  }
  // bytes/second = bitrate / 8. Duration = size / bytes_per_second.
  return Math.round(size / (bitrate / 8));
}

function getDurationSec(filePath) {
  const probe = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    { encoding: 'utf8' },
  );
  if (probe.status === 0) {
    const duration = Number.parseFloat(probe.stdout.trim());
    if (Number.isFinite(duration) && duration > 0) return Math.round(duration);
  }
  return estimateDurationSec(filePath);
}

function parseSourcesManifest() {
  if (!fs.existsSync(SOURCES_MD)) return null;
  const content = fs.readFileSync(SOURCES_MD, 'utf8');
  const lines = content.split(/\r?\n/);
  const map = {};
  for (const line of lines) {
    // Match table rows like: | `makkah` | ... | ... | <SHA256> | yes/no |
    const m = line.match(/^\|\s*`?([a-z_]+)`?\s*\|.*?\|\s*([a-f0-9]{64}|TODO)\s*\|\s*(yes|no|TODO)\s*\|/i);
    if (m) {
      map[m[1]] = { sha256: m[2].toLowerCase(), hasFajr: m[3].toLowerCase() };
    }
  }
  return map;
}

function main() {
  // 1. Folder + manifest existence
  if (!fs.existsSync(COMPLETE_DIR)) {
    errors.push(`Missing folder: ${path.relative(REPO_ROOT, COMPLETE_DIR)}`);
  }
  if (!fs.existsSync(SOURCES_MD)) {
    errors.push(`Missing manifest: ${path.relative(REPO_ROOT, SOURCES_MD)}`);
  }

  // 2. Collect SHA256s of the 35s notification-cap files (to detect reuse)
  const notifCapHashes = new Set();
  if (fs.existsSync(NOTIF_CAP_DIR)) {
    for (const f of fs.readdirSync(NOTIF_CAP_DIR)) {
      if (!f.endsWith('.mp3')) continue;
      try {
        notifCapHashes.add(sha256(path.join(NOTIF_CAP_DIR, f)));
      } catch {}
    }
  }

  const manifest = parseSourcesManifest() || {};
  const seenHashes = new Map();

  function validateVoice({ key, file }, required) {
    const filePath = path.join(COMPLETE_DIR, file);
    if (!fs.existsSync(filePath)) {
      if (required) errors.push(`Missing file: ${path.relative(REPO_ROOT, filePath)}`);
      return;
    }

    // Size check
    const size = fs.statSync(filePath).size;
    if (size < MIN_SIZE) {
      errors.push(`${file}: size ${size} bytes is below minimum ${MIN_SIZE} bytes`);
    } else if (size > MAX_SIZE) {
      errors.push(`${file}: size ${size} bytes exceeds maximum ${MAX_SIZE} bytes`);
    }

    // MP3 validity
    try {
      if (!isMp3(filePath)) {
        errors.push(`${file}: does not look like a valid MP3 (bad magic bytes)`);
        return;
      }
    } catch (e) {
      errors.push(`${file}: failed to read file: ${e.message}`);
      return;
    }

    // Duration check — the critical guard against accidentally reusing the 35s files
    const dur = getDurationSec(filePath);
    if (dur < MIN_DURATION_SEC) {
      errors.push(`${file}: estimated duration ${dur}s is below minimum ${MIN_DURATION_SEC}s — this is likely a notification-cap clip, not a complete adhan`);
    } else if (dur > MAX_DURATION_SEC) {
      warnings.push(`${file}: estimated duration ${dur}s exceeds soft max ${MAX_DURATION_SEC}s`);
    }

    // SHA256
    const hash = sha256(filePath);

    // Reuse detection
    if (notifCapHashes.has(hash)) {
      errors.push(`${file}: SHA256 matches a file in assets/sounds/adhan_full/ — you bundled a notification-cap clip as a complete adhan`);
    }
    if (seenHashes.has(hash)) {
      errors.push(`${file}: SHA256 matches ${seenHashes.get(hash)} — duplicate file`);
    } else {
      seenHashes.set(hash, file);
    }

    // Manifest check (only when the manifest has a real hash, not TODO)
    const declared = manifest[key];
    if (!declared) {
      warnings.push(`${key}: no entry in SOURCES.md manifest`);
    } else if (declared.sha256 !== 'todo' && declared.sha256 !== hash) {
      errors.push(`${file}: SHA256 mismatch — file=${hash}, SOURCES.md=${declared.sha256}`);
    }
    if (declared && declared.hasFajr === 'todo') {
      warnings.push(`${key}: SOURCES.md "Contains Fajr phrase" column is still TODO`);
    }
  }

  for (const voice of REQUIRED_VOICES) validateVoice(voice, true);
  for (const voice of OPTIONAL_VOICES) validateVoice(voice, false);

  // Report
  if (warnings.length) {
    console.warn('\n⚠️  Warnings:');
    for (const w of warnings) console.warn('  - ' + w);
  }
  if (errors.length) {
    console.error('\n❌ Adhan asset verification FAILED:');
    for (const e of errors) console.error('  - ' + e);
    console.error('\nFix the issues above before building. See assets/sounds/adhan_complete/SOURCES.md.\n');
    process.exit(1);
  }
  console.log('✅ Adhan asset verification passed.');
}

main();
