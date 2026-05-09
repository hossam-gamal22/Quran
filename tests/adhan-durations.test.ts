/**
 * Adhan duration contract test
 * ────────────────────────────
 * يضمن إن:
 *  - كل ملف من `assets/sounds/adhan_full/*.mp3` ≤ 35.5 ثانية (هدف 35.0)
 *  - كل clip قصير في `assets/sounds/<adhan>.mp3` ≤ 30 ثانية (حد iOS الصارم)
 *  - كل صوت إشعار في `assets/sounds/notif_*.mp3` ≤ 30 ثانية (نفس حد iOS)
 *
 * Apple `UNNotificationSound` يقطع أي صوت أطول من ٣٠ ثانية بصمت ⇒ المستخدم
 * يسمع الـ default alert بدلاً من صوتنا. الفحص هنا يمنع regression صامت.
 *
 * يتطلب `ffprobe` (يأتي مع ffmpeg). لو غير مثبَّت، الـ test يتجاوز نفسه
 * مع تحذير بدلاً من الفشل، حتى لا يكسر CI environments بدون ffmpeg.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const SOUNDS_DIR = join(ROOT, 'assets', 'sounds');
const FULL_ADHAN_DIR = join(SOUNDS_DIR, 'adhan_full');

// Same hard cap Apple uses for UNNotificationSound. Anything > 30s is silently
// replaced with the system default sound on iOS.
const IOS_NOTIFICATION_SOUND_LIMIT_SEC = 30;
// Android plays whatever is in the file via MediaPlayer; we cap at 35.5s to
// catch encoding drift like the 35.117s `adhan_full_makkah.mp3` issue we fixed.
const FULL_ADHAN_HARD_CAP_SEC = 35.5;
const FULL_ADHAN_TARGET_SEC = 35.0;
const FULL_ADHAN_TARGET_TOLERANCE_SEC = 0.2;

function ffprobeAvailable(): boolean {
  try {
    execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getDurationSec(filePath: string): number {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', filePath],
    { encoding: 'utf-8' },
  );
  return parseFloat(out.trim());
}

const HAS_FFPROBE = ffprobeAvailable();

describe.skipIf(!HAS_FFPROBE)('adhan & notification sound durations', () => {
  it('every adhan_full_*.mp3 is at or below the 35.5s hard cap', () => {
    const files = readdirSync(FULL_ADHAN_DIR).filter((f) => f.endsWith('.mp3'));
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const f of files) {
      const d = getDurationSec(join(FULL_ADHAN_DIR, f));
      if (d > FULL_ADHAN_HARD_CAP_SEC) {
        violations.push(`${f}: ${d.toFixed(3)}s > ${FULL_ADHAN_HARD_CAP_SEC}s`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('every adhan_full_*.mp3 is within ±200ms of the 35.0s target', () => {
    const files = readdirSync(FULL_ADHAN_DIR).filter((f) => f.endsWith('.mp3'));
    const drift: string[] = [];
    for (const f of files) {
      const d = getDurationSec(join(FULL_ADHAN_DIR, f));
      if (Math.abs(d - FULL_ADHAN_TARGET_SEC) > FULL_ADHAN_TARGET_TOLERANCE_SEC) {
        drift.push(`${f}: ${d.toFixed(3)}s (target ${FULL_ADHAN_TARGET_SEC}s ±${FULL_ADHAN_TARGET_TOLERANCE_SEC}s)`);
      }
    }
    expect(drift).toEqual([]);
  });

  it('source-map.json claimed sizes match on-disk file sizes', () => {
    const map = JSON.parse(readFileSync(join(FULL_ADHAN_DIR, 'source-map.json'), 'utf-8'));
    const mismatches: string[] = [];
    for (const [key, entry] of Object.entries<any>(map)) {
      const file = join(FULL_ADHAN_DIR, entry.filename);
      if (!existsSync(file)) {
        mismatches.push(`${key}: ${entry.filename} missing on disk`);
        continue;
      }
      const onDisk = require('node:fs').statSync(file).size;
      if (Number.isFinite(entry.bytes) && Math.abs(entry.bytes - onDisk) > 256) {
        mismatches.push(`${key}: source-map says ${entry.bytes}B, on-disk ${onDisk}B`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('every short adhan / notification clip is below the 30s iOS cap', () => {
    const files = readdirSync(SOUNDS_DIR)
      .filter((f) => f.endsWith('.mp3'))
      .filter((f) => f !== 'silent.mp3');
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const f of files) {
      const d = getDurationSec(join(SOUNDS_DIR, f));
      if (d > IOS_NOTIFICATION_SOUND_LIMIT_SEC) {
        violations.push(`${f}: ${d.toFixed(3)}s > ${IOS_NOTIFICATION_SOUND_LIMIT_SEC}s (iOS will play default sound instead)`);
      }
    }
    expect(violations).toEqual([]);
  });
});

if (!HAS_FFPROBE) {
  // Vitest's describe.skipIf already prints "skipped" — extra console hint helps
  // a developer running tests locally understand why these checks didn't run.
  // eslint-disable-next-line no-console
  console.warn('[adhan-durations] ffprobe not found in PATH; skipping duration contract tests. Install ffmpeg to enable.');
}
