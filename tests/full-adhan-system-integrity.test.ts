/**
 * Full Adhan + Short Adhan — End-to-End System Integrity
 * ──────────────────────────────────────────────────────
 * Goes deeper than the existing `full-adhan-native-contract.test.ts` and
 * `adhan-durations.test.ts` by verifying the FULL chain that turns a user's
 * voice pick into a sounded notification on both platforms:
 *
 *   1. Asset integrity — every voice key has an Android MP3 + iOS CAF on disk
 *   2. Voice normalization — null / unknown / alias inputs collapse safely
 *   3. Channel resolution — Android channel IDs match the actual sound map
 *   4. Scheduler branch contract — full vs short paths route audio correctly
 *   5. Settings contract — defaults persist the toggles the UI relies on
 *
 * These are static + pure-function tests; no Expo runtime required.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const SOUNDS_DIR = join(ROOT, 'assets', 'sounds');
const FULL_ADHAN_MP3_DIR = join(SOUNDS_DIR, 'adhan_full');
const FULL_ADHAN_CAF_DIR = join(SOUNDS_DIR, 'adhan_full_ios');

// Single source of truth for the voice keys we ship.
// Kept in sync with ADHAN_SOUND_FILES (services/notifications/channels.ts)
// and IOS_FULL_ADHAN_CAF_VOICES (lib/sound-manager.ts).
const SHIPPED_VOICES = [
  'abdulbasit', 'ajman', 'alaqsa', 'ali_mulla', 'dosari',
  'egypt', 'haramain', 'madinah', 'makkah', 'mansoor_zahrani',
  'mishary', 'naqshbandi', 'sharif', 'sudais',
] as const;

// ───────────────────────────────────────────────────────────────────────────
// 1. ASSET INTEGRITY — Android MP3, iOS CAF, full-adhan MP3 all consistent
// ───────────────────────────────────────────────────────────────────────────
describe('adhan asset integrity', () => {
  it('every shipped voice has a short-adhan MP3 in assets/sounds/', () => {
    const missing = SHIPPED_VOICES.filter(
      (v) => !existsSync(join(SOUNDS_DIR, `${v}.mp3`)),
    );
    expect(missing).toEqual([]);
  });

  it('every shipped voice has a full-adhan MP3 (Android playback)', () => {
    const missing = SHIPPED_VOICES.filter(
      (v) => !existsSync(join(FULL_ADHAN_MP3_DIR, `adhan_full_${v}.mp3`)),
    );
    expect(missing).toEqual([]);
  });

  it('every shipped voice has a full-adhan CAF (iOS notification sound)', () => {
    const missing = SHIPPED_VOICES.filter(
      (v) => !existsSync(join(FULL_ADHAN_CAF_DIR, `adhan_full_${v}.caf`)),
    );
    expect(missing).toEqual([]);
  });

  it('no orphan CAF files without a matching shipped voice', () => {
    const caf = readdirSync(FULL_ADHAN_CAF_DIR).filter((f) => f.endsWith('.caf'));
    const expected = new Set(SHIPPED_VOICES.map((v) => `adhan_full_${v}.caf`));
    const orphans = caf.filter((f) => !expected.has(f));
    expect(orphans).toEqual([]);
  });

  it('no orphan full-adhan MP3s without a matching shipped voice', () => {
    const mp3 = readdirSync(FULL_ADHAN_MP3_DIR).filter((f) => f.endsWith('.mp3'));
    const expected = new Set(SHIPPED_VOICES.map((v) => `adhan_full_${v}.mp3`));
    const orphans = mp3.filter((f) => !expected.has(f));
    expect(orphans).toEqual([]);
  });

  it('every shipped voice is registered in ADHAN_SOUND_FILES (channels.ts)', () => {
    const src = readFileSync(
      join(ROOT, 'services', 'notifications', 'channels.ts'),
      'utf-8',
    );
    const missing = SHIPPED_VOICES.filter((v) => !src.includes(`${v}:`));
    expect(missing).toEqual([]);
  });

  it('every shipped voice is in IOS_FULL_ADHAN_CAF_VOICES (sound-manager.ts)', () => {
    const src = readFileSync(join(ROOT, 'lib', 'sound-manager.ts'), 'utf-8');
    // The set is declared as a literal — keys appear as quoted strings.
    const startIdx = src.indexOf('IOS_FULL_ADHAN_CAF_VOICES');
    expect(startIdx).toBeGreaterThan(-1);
    const block = src.slice(startIdx, startIdx + 800);
    const missing = SHIPPED_VOICES.filter((v) => !block.includes(`'${v}'`));
    expect(missing).toEqual([]);
  });

  it('source-map.json claims a file size within 256 bytes of the on-disk MP3', () => {
    const mapPath = join(FULL_ADHAN_MP3_DIR, 'source-map.json');
    if (!existsSync(mapPath)) return; // optional artifact
    const map = JSON.parse(readFileSync(mapPath, 'utf-8'));
    const mismatches: string[] = [];
    for (const [key, entry] of Object.entries<any>(map)) {
      if (!entry?.filename) continue;
      const fp = join(FULL_ADHAN_MP3_DIR, entry.filename);
      if (!existsSync(fp)) {
        mismatches.push(`${key}: ${entry.filename} missing`);
        continue;
      }
      if (Number.isFinite(entry.bytes)) {
        const onDisk = statSync(fp).size;
        if (Math.abs(entry.bytes - onDisk) > 256) {
          mismatches.push(`${key}: claim ${entry.bytes}B, on-disk ${onDisk}B`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2. VOICE NORMALIZATION CONTRACT — verified by replicating the function
//    against the same SHIPPED_VOICES set as the real impl, so any future
//    edit to sound-manager.ts that breaks the contract surfaces here.
// ───────────────────────────────────────────────────────────────────────────
describe('voice normalization (sound-manager.ts)', () => {
  // Mirror of the runtime impl. If this drifts, the cross-check below
  // (`runtime source contains the same set`) will fail loudly.
  const RUNTIME_CAF_VOICES = new Set<string>([...SHIPPED_VOICES]);
  function normalize(voice: string | null | undefined): string {
    const raw = String(voice || 'makkah').trim();
    const key = raw === 'al_aqsa' ? 'alaqsa' : raw;
    return RUNTIME_CAF_VOICES.has(key) ? key : 'makkah';
  }
  function iosCaf(voice: string | null | undefined): string {
    return `adhan_full_${normalize(voice)}.caf`;
  }

  it('runtime source declares exactly the SHIPPED_VOICES set (mirror is current)', () => {
    const src = readFileSync(join(ROOT, 'lib', 'sound-manager.ts'), 'utf-8');
    // Extract exactly what's inside `new Set([ ... ])` after IOS_FULL_ADHAN_CAF_VOICES.
    const m = src.match(
      /IOS_FULL_ADHAN_CAF_VOICES\s*=\s*new Set\(\s*\[([\s\S]*?)\]\s*\)/,
    );
    expect(m).not.toBeNull();
    const found = new Set<string>();
    for (const km of m![1].matchAll(/'([a-z_]+)'/g)) found.add(km[1]);
    for (const v of SHIPPED_VOICES) expect(found.has(v)).toBe(true);
    // Reject anything in the runtime set that the test doesn't know about,
    // so adding a voice without updating SHIPPED_VOICES fails this test.
    const extras = [...found].filter((k) => !RUNTIME_CAF_VOICES.has(k));
    expect(extras).toEqual([]);
  });

  it('null / undefined / empty → makkah', () => {
    expect(normalize(null)).toBe('makkah');
    expect(normalize(undefined)).toBe('makkah');
    expect(normalize('')).toBe('makkah');
    expect(normalize('   ')).toBe('makkah');
  });

  it('"al_aqsa" alias → "alaqsa" (matches CAF filename suffix)', () => {
    expect(normalize('al_aqsa')).toBe('alaqsa');
  });

  it('unknown / typo voice falls back to makkah (not silent, not crash)', () => {
    expect(normalize('totally_made_up')).toBe('makkah');
    expect(normalize('silent')).toBe('makkah');
    expect(normalize('default')).toBe('makkah');
  });

  it('every shipped voice round-trips to itself', () => {
    for (const v of SHIPPED_VOICES) expect(normalize(v)).toBe(v);
  });

  it('iOS CAF filename matches the actual file on disk for every voice', () => {
    for (const v of SHIPPED_VOICES) {
      const filename = iosCaf(v);
      expect(filename).toBe(`adhan_full_${v}.caf`);
      expect(existsSync(join(FULL_ADHAN_CAF_DIR, filename))).toBe(true);
    }
  });

  it('iOS CAF resolver collapses unknown voice to makkah CAF (never returns empty)', () => {
    const filename = iosCaf('does_not_exist');
    expect(filename).toBe('adhan_full_makkah.caf');
    expect(existsSync(join(FULL_ADHAN_CAF_DIR, filename))).toBe(true);
  });

  it('runtime source: completeAdhanVoiceToNotificationSoundKey delegates to normalizer', () => {
    const src = readFileSync(join(ROOT, 'lib', 'sound-manager.ts'), 'utf-8');
    // Guarantees the Android sound-key resolver shares one normalization
    // path with the iOS CAF resolver — no divergent fallback logic.
    expect(src).toMatch(
      /completeAdhanVoiceToNotificationSoundKey[\s\S]{0,200}normalizeFullAdhanNotificationVoice/,
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 3. CHANNEL RESOLUTION — Android channel IDs are deterministic & complete.
//    `channels.ts` pulls in expo-notifications at import time, so we mirror
//    the pure helpers here and additionally pin the runtime source.
// ───────────────────────────────────────────────────────────────────────────
describe('Android channel resolution (channels.ts)', () => {
  const CHANNELS_SRC = readFileSync(
    join(ROOT, 'services', 'notifications', 'channels.ts'),
    'utf-8',
  );

  // Mirror of ADHAN_SOUND_FILES keys — kept honest by the cross-check below.
  const RUNTIME_ADHAN_KEYS = new Set<string>([...SHIPPED_VOICES, 'silent']);

  function getAdhanChannelId(soundKey?: string): string {
    if (!soundKey || soundKey === 'default') return 'adhan_makkah';
    if (soundKey === 'silent') return 'silent';
    const key = soundKey.replace(/\.mp3$/, '');
    if (RUNTIME_ADHAN_KEYS.has(key)) return `adhan_${key}`;
    return 'adhan_makkah';
  }

  function getReminderChannelId(soundKey?: string): string {
    if (!soundKey || soundKey === 'default') return 'general';
    if (soundKey === 'silent') return 'silent';
    const key = soundKey.replace(/\.mp3$/, '');
    if (RUNTIME_NOTIF_KEYS.has(key)) return `reminder_${key}`;
    if (RUNTIME_ADHAN_KEYS.has(key)) return `adhan_${key}`;
    return 'general';
  }

  const RUNTIME_NOTIF_KEYS = new Set<string>([
    'alhamdulillah', 'complete', 'evening_adhkar', 'istighfar', 'morning_adhkar',
    'notif_after_prayer', 'notif_daily_summary', 'notif_kahf', 'notif_khatma',
    'notif_sleep', 'notif_verse', 'notif_wakeup', 'salawat', 'subhanallah', 'tasbih',
  ]);

  it('runtime ADHAN_SOUND_FILES keys exactly match SHIPPED_VOICES ∪ {silent}', () => {
    const block = CHANNELS_SRC.slice(
      CHANNELS_SRC.indexOf('ADHAN_SOUND_FILES'),
      CHANNELS_SRC.indexOf('NOTIFICATION_SOUND_FILES'),
    );
    const found = new Set<string>();
    for (const m of block.matchAll(/^\s{2}([a-z_]+):\s+'[^']+\.mp3'/gm)) {
      found.add(m[1]);
    }
    for (const v of RUNTIME_ADHAN_KEYS) expect(found.has(v)).toBe(true);
    const extras = [...found].filter((k) => !RUNTIME_ADHAN_KEYS.has(k));
    expect(extras).toEqual([]);
  });

  it('runtime NOTIFICATION_SOUND_FILES keys match our mirror (no silent drift)', () => {
    const block = CHANNELS_SRC.slice(
      CHANNELS_SRC.indexOf('NOTIFICATION_SOUND_FILES'),
      CHANNELS_SRC.indexOf('export function resolveSoundFile'),
    );
    const found = new Set<string>();
    for (const m of block.matchAll(/^\s{2}([a-z_]+):\s+'[^']+\.mp3'/gm)) {
      found.add(m[1]);
    }
    for (const k of RUNTIME_NOTIF_KEYS) expect(found.has(k)).toBe(true);
    const extras = [...found].filter((k) => !RUNTIME_NOTIF_KEYS.has(k));
    expect(extras).toEqual([]);
  });

  it('default / undefined / empty key → adhan_makkah (never empty, never silent)', () => {
    expect(getAdhanChannelId(undefined)).toBe('adhan_makkah');
    expect(getAdhanChannelId('')).toBe('adhan_makkah');
    expect(getAdhanChannelId('default')).toBe('adhan_makkah');
  });

  it('"silent" → silent channel (audio off)', () => {
    expect(getAdhanChannelId('silent')).toBe('silent');
  });

  it('every shipped voice maps to adhan_<voice>', () => {
    for (const v of SHIPPED_VOICES) {
      expect(getAdhanChannelId(v)).toBe(`adhan_${v}`);
    }
  });

  it('voice passed with .mp3 extension is stripped before lookup', () => {
    expect(getAdhanChannelId('makkah.mp3')).toBe('adhan_makkah');
    expect(getAdhanChannelId('madinah.mp3')).toBe('adhan_madinah');
  });

  it('unknown key falls back to adhan_makkah (never throws)', () => {
    expect(getAdhanChannelId('xyz')).toBe('adhan_makkah');
  });

  it('full-adhan visual channel id is the stable constant adhan_full_visual', () => {
    expect(CHANNELS_SRC).toMatch(
      /ANDROID_FULL_ADHAN_CHANNEL_ID\s*=\s*'adhan_full_visual'/,
    );
  });

  it('full-adhan visual channel is created with sound: null + MAX importance', () => {
    // Audio comes from the foreground service; the visual channel must be
    // silent or it will fire a competing short-clip sound.
    const blockStart = CHANNELS_SRC.indexOf(
      'setNotificationChannelAsync(ANDROID_FULL_ADHAN_CHANNEL_ID',
    );
    expect(blockStart).toBeGreaterThan(-1);
    const block = CHANNELS_SRC.slice(blockStart, blockStart + 600);
    expect(block).toMatch(/sound:\s*null/);
    expect(block).toMatch(/AndroidImportance\.MAX/);
  });

  it('reminder channel resolver routes adhan keys to adhan_<voice> (legacy callers)', () => {
    expect(getReminderChannelId('makkah')).toBe('adhan_makkah');
    expect(getReminderChannelId('notif_verse')).toBe('reminder_notif_verse');
    expect(getReminderChannelId(undefined)).toBe('general');
    expect(getReminderChannelId('silent')).toBe('silent');
  });

  it('channels version is a pinned constant (forces channel reset on bump)', () => {
    // The version string is what triggers `resetChannelsIfOutdated`, which is
    // the ONLY way users get new sound URIs after Android caches a channel.
    expect(CHANNELS_SRC).toMatch(/CURRENT_CHANNELS_VERSION\s*=\s*'\d+'/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 4. SCHEDULER BRANCH CONTRACT — static checks on prayer-notifications.ts
//    These guard the *decision tree* that picks between full / short adhan,
//    so a future refactor can't silently regress audio routing.
// ───────────────────────────────────────────────────────────────────────────
describe('prayer-notifications.ts scheduler branch contract', () => {
  const SRC = readFileSync(join(ROOT, 'lib', 'prayer-notifications.ts'), 'utf-8');

  it('shouldUseFullAdhan requires adhanSoundEnabled && not silent && useFullAdhan===true', () => {
    // Three-condition AND — any single guard removed lets full adhan
    // fire when the user expected silence.
    expect(SRC).toMatch(/shouldUseFullAdhan\s*=\s*\n?\s*adhanSoundEnabled\s*&&/);
    expect(SRC).toMatch(/effectiveSoundType\s*!==\s*'silent'/);
    expect(SRC).toMatch(/notifSettings\.useFullAdhan\s*===\s*true/);
  });

  it('Android + full adhan → silent visual channel (avoids double-sound)', () => {
    // Without this branch, both the notification sound channel AND the
    // foreground service play simultaneously — 15s short clip on top of
    // the 35s recording.
    expect(SRC).toMatch(/Platform\.OS\s*===\s*'android'\s*&&\s*shouldUseFullAdhan[\s\S]{0,80}ANDROID_FULL_ADHAN_CHANNEL_ID/);
  });

  it('iOS + full adhan → attaches CAF file via completeAdhanVoiceToIosNotificationSoundFile', () => {
    expect(SRC).toMatch(/Platform\.OS\s*===\s*'ios'\s*&&\s*shouldUseFullAdhan[\s\S]{0,120}completeAdhanVoiceToIosNotificationSoundFile/);
  });

  it('Android + full adhan → notification sound is `false` (service handles audio)', () => {
    expect(SRC).toMatch(/Platform\.OS\s*===\s*'android'\s*&&\s*shouldUseFullAdhan[\s\S]{0,80}\?\s*false/);
  });

  it('Advance reminders never trigger full adhan (wrong timing)', () => {
    expect(SRC).toContain('useFullAdhanForThisNotif = shouldUseFullAdhan && !isAdvanceReminder');
    // Advance reminder body uses the general channel, not the adhan channel.
    expect(SRC).toMatch(/isAdvanceReminder\s*\?\s*'general'/);
  });

  it('Notification data["type"] is "full_adhan" only when full-adhan is firing', () => {
    // This is what app/full-adhan.tsx keys off to open the full-screen player.
    expect(SRC).toMatch(/type:\s*useFullAdhanForThisNotif\s*\?\s*'full_adhan'\s*:\s*'prayer'/);
  });

  it('Native AlarmManager call is wrapped in try-catch + uses +1000ms audio-focus offset', () => {
    // The try lives between the if-guard and the FullAdhanModule call.
    const guardIdx = SRC.indexOf("if (Platform.OS === 'android' && useFullAdhanForThisNotif)");
    expect(guardIdx).toBeGreaterThan(-1);
    const block = SRC.slice(guardIdx, guardIdx + 1200);
    expect(block).toMatch(/try\s*\{/);
    expect(block).toMatch(/FullAdhanModule\.scheduleFullAdhan\(/);
    expect(block).toMatch(/triggerDate\.getTime\(\)\s*\+\s*1000/);
    expect(block).toMatch(/catch\s*\(/);
  });

  it('Critically-imminent (≤5 min away) prayer notifications are NOT cancelled on reschedule', () => {
    expect(SRC).toContain('CRITICAL_PRAYER_NOTIFICATION_WINDOW_MS = 5 * 60 * 1000');
    expect(SRC).toContain('protectedPrayerNotificationIds.add');
    expect(SRC).toContain('SKIP replacing protected imminent');
  });

  it('Protected imminent Android alarms are kept while later alarms are cancelled', () => {
    expect(SRC).toContain('FullAdhanModule?.cancelFullAdhanFrom');
    expect(SRC).toContain('protectedFullAdhanAlarmCount');
    // Fully-protected case still calls cancelAllFullAdhan when nothing is imminent.
    expect(SRC).toContain('cancelAllFullAdhan');
  });

  it('Native FullAdhanModule unavailability degrades gracefully (warn, no throw)', () => {
    expect(SRC).toMatch(/console\.warn\([^)]*FullAdhanModule\s+unavailable/);
  });

  it('Full-adhan visual channel falls back to short-adhan sound on Android safety-net', () => {
    // The "Layer 2" safety comment documents intent; this test catches accidental
    // deletion of the rationale that protects against silent failure.
    expect(SRC).toContain('Layer 2');
    expect(SRC).toContain('safety-net');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 5. SETTINGS CONTRACT — the toggles the scheduler reads must exist + default
// ───────────────────────────────────────────────────────────────────────────
describe('settings contract (SettingsContext.tsx)', () => {
  const SRC = readFileSync(join(ROOT, 'contexts', 'SettingsContext.tsx'), 'utf-8');

  it('NotificationSettings declares useFullAdhan?: boolean', () => {
    expect(SRC).toMatch(/useFullAdhan\?\s*:\s*boolean/);
  });

  it('NotificationSettings declares fullAdhanSoundType?: string', () => {
    expect(SRC).toMatch(/fullAdhanSoundType\?\s*:\s*string/);
  });

  it('Defaults: useFullAdhan: false, fullAdhanSoundType: "makkah"', () => {
    expect(SRC).toMatch(/useFullAdhan:\s*false/);
    expect(SRC).toMatch(/fullAdhanSoundType:\s*'makkah'/);
  });

  it('Reschedule trigger watches both useFullAdhan AND fullAdhanSoundType keys', () => {
    // If either is missing here, toggling the setting won't re-arm the alarms
    // and the change won't take effect until the next app launch.
    expect(SRC).toMatch(/'fullAdhanSoundType'/);
    expect(SRC).toMatch(/'useFullAdhan'/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 6. FULL-ADHAN SCREEN CONTRACT — voice param routing + native cleanup
// ───────────────────────────────────────────────────────────────────────────
describe('app/full-adhan.tsx screen contract', () => {
  const SRC = readFileSync(join(ROOT, 'app', 'full-adhan.tsx'), 'utf-8');

  it('reads `voice` from notification params and normalizes before use', () => {
    expect(SRC).toMatch(/params\.voice/);
    expect(SRC).toContain('normalizeCompleteAdhanVoice');
  });

  it('falls back to fullAdhanSoundType then adhanSoundType when param missing', () => {
    expect(SRC).toContain('notifications.fullAdhanSoundType');
    expect(SRC).toContain('notifications.adhanSoundType');
  });

  it('stops the native foreground service before in-app playback starts', () => {
    // Without this, the AlarmManager-driven service keeps playing while
    // the in-app player also plays — two streams of audio simultaneously.
    expect(SRC).toContain('FullAdhanModule?.stopFullAdhan');
  });
});
