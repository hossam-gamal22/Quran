import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');

describe('full adhan native bridge contract', () => {
  it('the Android full-adhan screen calls the native stop method that exists', () => {
    const screen = readFileSync(join(ROOT, 'app', 'full-adhan.tsx'), 'utf-8');
    const module = readFileSync(
      join(ROOT, 'android', 'app', 'src', 'main', 'java', 'com', 'rooh', 'almuslim', 'adhan', 'FullAdhanModule.kt'),
      'utf-8',
    );

    expect(module).toContain('fun stopFullAdhan(');
    expect(screen).toContain('FullAdhanModule?.stopFullAdhan');
  });

  it('rescheduling preserves existing prayer notifications until replacements are ready', () => {
    const manager = readFileSync(join(ROOT, 'lib', 'notifications-manager.ts'), 'utf-8');

    expect(manager).toContain("id.startsWith('prayer_') || id.startsWith('did_you_pray_')");
    expect(manager).toContain('prayer queue preserved until replacements are ready');
  });

  it('does not nag aggressive-OEM users daily after they dismiss auto-start guidance', () => {
    const recovery = readFileSync(join(ROOT, 'lib', 'permission-recovery.ts'), 'utf-8');
    const banner = readFileSync(join(ROOT, 'components', 'notifications', 'PermissionBanner.tsx'), 'utf-8');

    expect(recovery).toContain('OEM_AUTOSTART_DISMISS_DURATION_MS');
    expect(recovery).toContain("key === 'oemAutoStart'");
    expect(banner).toContain("issue.key === 'oemAutoStart'");
  });

  it('treats restricted iOS background refresh as actionable', () => {
    const recovery = readFileSync(join(ROOT, 'lib', 'permission-recovery.ts'), 'utf-8');

    expect(recovery).toContain("s.backgroundRefresh === 'restricted'");
  });

  it('uses the native exact-alarm check when available', () => {
    const permissions = readFileSync(join(ROOT, 'services', 'notifications', 'permissions.ts'), 'utf-8');

    expect(permissions).toContain('FullAdhan?.canScheduleExactAlarms');
  });

  it('protects critically imminent prayer notifications during reschedule', () => {
    const prayerNotifications = readFileSync(join(ROOT, 'lib', 'prayer-notifications.ts'), 'utf-8');

    expect(prayerNotifications).toContain('CRITICAL_PRAYER_NOTIFICATION_WINDOW_MS');
    expect(prayerNotifications).toContain('MIN_SAFE_PRAYER_RESCHEDULE_LEAD_MS');
    expect(prayerNotifications).toContain('protectedPrayerNotificationIds.add');
    expect(prayerNotifications).toContain('SKIP replacing protected imminent');
  });

  it('can preserve imminent Android full-adhan alarms while clearing later native alarms', () => {
    const module = readFileSync(
      join(ROOT, 'android', 'app', 'src', 'main', 'java', 'com', 'rooh', 'almuslim', 'adhan', 'FullAdhanModule.kt'),
      'utf-8',
    );
    const plugin = readFileSync(join(ROOT, 'plugins', 'with-android-full-adhan.js'), 'utf-8');
    const prayerNotifications = readFileSync(join(ROOT, 'lib', 'prayer-notifications.ts'), 'utf-8');

    expect(module).toContain('fun cancelFullAdhanFrom(');
    expect(plugin).toContain('fun cancelFullAdhanFrom(');
    expect(prayerNotifications).toContain('FullAdhanModule?.cancelFullAdhanFrom');
    expect(prayerNotifications).toContain('protectedFullAdhanAlarmCount');
  });

  // Regression guard: the native full-adhan alarm MUST schedule via setAlarmClock(),
  // matching the patched expo-notifications path (plugins/with-alarm-clock-scheduling.js).
  // If it ever reverts to setExactAndAllowWhileIdle as the primary path, the adhan
  // playback fires up to ~15-30 min late on Doze / OEM devices while the visual
  // notification fires on time — the delayed-and-looks-duplicated adhan bug.
  it('schedules the native full-adhan alarm via setAlarmClock (Doze/OEM-exempt)', () => {
    const native = readFileSync(
      join(ROOT, 'android', 'app', 'src', 'main', 'java', 'com', 'rooh', 'almuslim', 'adhan', 'FullAdhanModule.kt'),
      'utf-8',
    );
    const plugin = readFileSync(join(ROOT, 'plugins', 'with-android-full-adhan.js'), 'utf-8');

    for (const source of [native, plugin]) {
      const schedule = source.slice(source.indexOf('fun scheduleFullAdhan('));
      // setAlarmClock must be the PRIMARY path, before any inexact fallback.
      const alarmClockIdx = schedule.indexOf('setAlarmClock(');
      const inexactIdx = schedule.indexOf('setAndAllowWhileIdle(');
      expect(alarmClockIdx).toBeGreaterThan(-1);
      expect(alarmClockIdx).toBeLessThan(inexactIdx === -1 ? Number.MAX_SAFE_INTEGER : inexactIdx);
    }
  });

  // Regression guard: the playback service must suppress a duplicate ACTION_PLAY
  // (alarm + patched-notification + FCM race) so two MediaPlayers never overlap.
  it('the playback service guards against duplicate ACTION_PLAY (no double audio)', () => {
    const native = readFileSync(
      join(ROOT, 'android', 'app', 'src', 'main', 'java', 'com', 'rooh', 'almuslim', 'adhan', 'AdhanPlaybackService.kt'),
      'utf-8',
    );
    const plugin = readFileSync(join(ROOT, 'plugins', 'with-android-full-adhan.js'), 'utf-8');

    for (const source of [native, plugin]) {
      expect(source).toContain('DUPLICATE_PLAY_WINDOW_MS');
      expect(source).toContain('lastPlayStartElapsedMs');
    }
  });
});
