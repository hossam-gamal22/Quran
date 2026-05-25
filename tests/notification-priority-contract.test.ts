import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf-8');
}

function assertAudiblePushDeliveryContract(source: string, label: string): void {
  const matches = [...source.matchAll(/sound:\s*'default'(?:\s+as const)?/g)];
  expect(matches.length, `${label} should define audible push payloads`).toBeGreaterThan(0);

  const violations: string[] = [];
  for (const match of matches) {
    const start = match.index ?? 0;
    const block = source.slice(start, start + 360);
    if (!/priority:\s*'high'(?:\s+as const)?/.test(block)) {
      violations.push(`${label}:${start} missing priority: 'high'`);
    }
    if (!/channelId:\s*'general'/.test(block)) {
      violations.push(`${label}:${start} missing channelId: 'general'`);
    }
    if (!/interruptionLevel:\s*'time-sensitive'/.test(block)) {
      violations.push(`${label}:${start} missing interruptionLevel: 'time-sensitive'`);
    }
  }

  expect(violations).toEqual([]);
}

describe('notification priority and sound contract', () => {
  it('promotes Android reminder/general/custom sound channels to max importance', () => {
    const channels = read('services/notifications/channels.ts');
    const installer = read('lib/notification-sound-installer.ts');

    expect(channels).toContain("const CURRENT_CHANNELS_VERSION = '24'");
    expect(channels).toMatch(/reminder_\$\{key\}[\s\S]*?importance:\s*Notifications\.AndroidImportance\.MAX/);
    expect(channels).toMatch(/setNotificationChannelAsync\('general'[\s\S]*?importance:\s*Notifications\.AndroidImportance\.MAX/);
    expect(installer).toContain('importance: Notifications.AndroidImportance.MAX');
  });

  it('marks admin-panel audible pushes as high priority, general-channel, and time-sensitive', () => {
    assertAudiblePushDeliveryContract(
      read('admin-panel/src/services/pushNotifications.ts'),
      'admin-panel pushNotifications',
    );
  });

  it('marks Cloud Functions audible pushes as high priority, general-channel, and time-sensitive', () => {
    assertAudiblePushDeliveryContract(read('functions/src/index.ts'), 'functions push');
  });

  it('keeps iOS local self-test notification explicitly time-sensitive and sounded', () => {
    const selfTest = read('lib/notification-self-test.ts');
    const permissions = read('services/notifications/permissions.ts');

    expect(selfTest).toContain("id: 'ios_sound_time_sensitive'");
    expect(selfTest).toContain("sound: 'default'");
    expect(selfTest).toContain("interruptionLevel: 'timeSensitive' as const");
    expect(selfTest).toContain('Notifications.AndroidNotificationPriority.MAX');
    expect(permissions).not.toContain('allowCriticalAlerts: true');
  });
});
